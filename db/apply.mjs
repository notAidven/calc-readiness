// @ts-nocheck
/**
 * Aurora migration runner over the RDS Data API — no VPC, no psql, no direct
 * socket. Applies the ordered SQL files in db/migrations/ that have not been
 * recorded in a `schema_migrations` tracking table, each file in one transaction.
 *
 * Because the Data API executes ONE statement per call, each file is split into
 * statements (respecting comments, single-quoted strings, and dollar-quoted
 * bodies) and replayed inside a Data API transaction for all-or-nothing per file.
 *
 * Before the ordered files run, the least-privilege `app_service` role is
 * bootstrapped (created if missing, password synced from its Secrets Manager
 * secret) so the `grant ... to app_service` statements in 0001 resolve. The
 * runner itself connects with the admin (master) secret.
 *
 * Env:
 *   DB_CLUSTER_ARN            Aurora cluster ARN (resourceArn)
 *   DB_NAME                   database name
 *   DB_ADMIN_SECRET_ARN       master credentials secret (runs the DDL)
 *   DB_APP_SERVICE_SECRET_ARN app_service credentials secret (password synced onto the role)
 *
 * Usage:
 *   node db/apply.mjs --dry-run  # local parse/transaction-control validation; no AWS calls
 *   node db/apply.mjs            # apply pending files
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  BeginTransactionCommand,
  CommitTransactionCommand,
  ExecuteStatementCommand,
  RDSDataClient,
  RollbackTransactionCommand,
} from "@aws-sdk/client-rds-data";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "migrations");
const APP_SERVICE_ROLE = "app_service";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/**
 * Split a SQL script into individual statements on top-level `;`, skipping
 * terminators inside line/nested-block comments, ordinary/escape strings, quoted identifiers,
 * and dollar-quoted bodies (`$tag$ ... $tag$`).
 */
export function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let index = 0;
  const length = sql.length;

  while (index < length) {
    const ch = sql[index];
    const next = sql[index + 1];

    if (ch === "-" && next === "-") {
      while (index < length && sql[index] !== "\n") {
        current += sql[index];
        index += 1;
      }
      continue;
    }

    if (ch === "/" && next === "*") {
      current += "/*";
      index += 2;
      let depth = 1;
      while (index < length && depth > 0) {
        if (sql[index] === "/" && sql[index + 1] === "*") {
          current += "/*";
          index += 2;
          depth += 1;
        } else if (sql[index] === "*" && sql[index + 1] === "/") {
          current += "*/";
          index += 2;
          depth -= 1;
        } else {
          current += sql[index];
          index += 1;
        }
      }
      continue;
    }

    if (ch === "'") {
      const prefix = sql[index - 1];
      const beforePrefix = sql[index - 2];
      const escapeBackslash =
        (prefix === "e" || prefix === "E") && !/[A-Za-z0-9_$]/.test(beforePrefix ?? "");
      current += ch;
      index += 1;
      while (index < length) {
        current += sql[index];
        if (escapeBackslash && sql[index] === "\\") {
          if (index + 1 < length) {
            current += sql[index + 1];
          }
          index += 2;
          continue;
        }
        if (sql[index] === "'") {
          if (sql[index + 1] === "'") {
            current += "'";
            index += 2;
            continue;
          }
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    if (ch === '"') {
      current += ch;
      index += 1;
      while (index < length) {
        current += sql[index];
        if (sql[index] === '"' && sql[index + 1] === '"') {
          current += '"';
          index += 2;
        } else if (sql[index] === '"') {
          index += 1;
          break;
        } else {
          index += 1;
        }
      }
      continue;
    }

    if (ch === "$") {
      const tag = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(index))?.[0];
      if (tag) {
        const end = sql.indexOf(tag, index + tag.length);
        const stop = end === -1 ? length : end + tag.length;
        current += sql.slice(index, stop);
        index = stop;
        continue;
      }
    }

    if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = "";
      index += 1;
      continue;
    }

    current += ch;
    index += 1;
  }

  const tail = current.trim();
  if (tail) {
    statements.push(tail);
  }
  return statements;
}

/**
 * Remove only comments before a statement's first token. Quoted strings and dollar-quoted
 * function bodies are left untouched because they are not leading comments.
 */
export function stripLeadingSqlComments(sql) {
  let index = 0;
  while (index < sql.length) {
    while (/\s/.test(sql[index] ?? "")) {
      index += 1;
    }
    if (sql[index] === "-" && sql[index + 1] === "-") {
      index += 2;
      while (index < sql.length && sql[index] !== "\n") {
        index += 1;
      }
      continue;
    }
    if (sql[index] === "/" && sql[index + 1] === "*") {
      index += 2;
      let depth = 1;
      while (index < sql.length && depth > 0) {
        if (sql[index] === "/" && sql[index + 1] === "*") {
          depth += 1;
          index += 2;
        } else if (sql[index] === "*" && sql[index + 1] === "/") {
          depth -= 1;
          index += 2;
        } else {
          index += 1;
        }
      }
      continue;
    }
    break;
  }
  return sql.slice(index).trimStart();
}

/**
 * Tokenize SQL outside PostgreSQL comments and quoted regions. Comments are lexical whitespace,
 * including nested block comments, so `START/*…*\/TRANSACTION` yields the same two tokens as
 * `START TRANSACTION`. Strings, quoted identifiers and dollar bodies yield one opaque token.
 */
export function sqlTokensOutsideQuotedRegions(sql) {
  const tokens = [];
  let index = 0;
  const length = sql.length;

  const consumeSingleQuote = (start, escapeBackslash) => {
    let cursor = start + 1;
    while (cursor < length) {
      if (escapeBackslash && sql[cursor] === "\\") {
        cursor += 2;
        continue;
      }
      if (sql[cursor] === "'") {
        if (sql[cursor + 1] === "'") {
          cursor += 2;
          continue;
        }
        return cursor + 1;
      }
      cursor += 1;
    }
    return length;
  };

  while (index < length) {
    const ch = sql[index];
    const next = sql[index + 1];
    if (/\s/.test(ch ?? "")) {
      index += 1;
      continue;
    }
    if (ch === "-" && next === "-") {
      index += 2;
      while (index < length && sql[index] !== "\n") {
        index += 1;
      }
      continue;
    }
    if (ch === "/" && next === "*") {
      index += 2;
      let depth = 1;
      while (index < length && depth > 0) {
        if (sql[index] === "/" && sql[index + 1] === "*") {
          depth += 1;
          index += 2;
        } else if (sql[index] === "*" && sql[index + 1] === "/") {
          depth -= 1;
          index += 2;
        } else {
          index += 1;
        }
      }
      continue;
    }
    if ((ch === "e" || ch === "E") && next === "'") {
      tokens.push("<quoted>");
      index = consumeSingleQuote(index + 1, true);
      continue;
    }
    if (ch === "'") {
      tokens.push("<quoted>");
      index = consumeSingleQuote(index, false);
      continue;
    }
    if (ch === '"') {
      tokens.push("<identifier>");
      index += 1;
      while (index < length) {
        if (sql[index] === '"' && sql[index + 1] === '"') {
          index += 2;
        } else if (sql[index] === '"') {
          index += 1;
          break;
        } else {
          index += 1;
        }
      }
      continue;
    }
    if (ch === "$") {
      const tag = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(index))?.[0];
      if (tag) {
        tokens.push("<dollar-quoted>");
        const end = sql.indexOf(tag, index + tag.length);
        index = end === -1 ? length : end + tag.length;
        continue;
      }
    }
    if (/[A-Za-z_]/.test(ch ?? "")) {
      const start = index;
      index += 1;
      while (index < length && /[A-Za-z0-9_$]/.test(sql[index] ?? "")) {
        index += 1;
      }
      tokens.push(sql.slice(start, index).toUpperCase());
      continue;
    }
    tokens.push(ch ?? "");
    index += 1;
  }
  return tokens;
}

function isTransactionControl(tokens) {
  const first = tokens[0];
  const second = tokens[1];
  if (first === "START") {
    return second === "TRANSACTION";
  }
  return ["BEGIN", "COMMIT", "END", "ROLLBACK", "ABORT"].includes(first);
}

/** Migration files never own transactions; the Data API runner owns exactly one per file. */
export function assertNoTransactionControl(statements, filename) {
  const nested = statements.find((statement) =>
    isTransactionControl(sqlTokensOutsideQuotedRegions(statement)),
  );
  if (nested) {
    throw new Error(
      `migration ${filename} contains nested transaction control: ${nested.split(/\s+/)[0]}`,
    );
  }
}

/**
 * Apply one already-split migration through the same commands production uses.
 * Exported so the runner's transaction boundary can be tested with the actual statement list.
 */
export async function applyMigrationTransaction({ rds, base, exec, filename, statements }) {
  assertNoTransactionControl(statements, filename);
  const { transactionId } = await rds.send(new BeginTransactionCommand(base));
  try {
    for (const statement of statements) {
      await exec(statement, undefined, transactionId);
    }
    await exec(
      "insert into public.schema_migrations (filename) values (:filename)",
      [{ name: "filename", value: { stringValue: filename } }],
      transactionId,
    );
    await rds.send(new CommitTransactionCommand({ ...base, transactionId }));
  } catch (error) {
    await rds
      .send(new RollbackTransactionCommand({ ...base, transactionId }))
      .catch(() => {});
    throw new Error(`migration ${filename} failed: ${error.message}`, { cause: error });
  }
}

async function main() {
  if (process.argv.includes("--dry-run")) {
    const files = (await readdir(MIGRATIONS_DIR))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (const filename of files) {
      const statements = splitSqlStatements(
        await readFile(join(MIGRATIONS_DIR, filename), "utf8"),
      );
      assertNoTransactionControl(statements, filename);
      console.log(`plan   ${filename} (${statements.length} statements)`);
    }
    console.log(
      `dry run — validated ${files.length} migration file(s); sent no AWS requests`,
    );
    return;
  }
  const resourceArn = requireEnv("DB_CLUSTER_ARN");
  const database = requireEnv("DB_NAME");
  const secretArn = requireEnv("DB_ADMIN_SECRET_ARN");
  const appServiceSecretArn = requireEnv("DB_APP_SERVICE_SECRET_ARN");

  const rds = new RDSDataClient({});
  const base = { resourceArn, secretArn, database };

  const exec = (sql, parameters, transactionId) =>
    rds.send(
      new ExecuteStatementCommand({
        ...base,
        sql,
        ...(parameters ? { parameters } : {}),
        ...(transactionId ? { transactionId } : {}),
        formatRecordsAs: "JSON",
      }),
    );

  // 1. Bootstrap the least-privilege runtime role (idempotent; password synced).
  const secrets = new SecretsManagerClient({});
  const appSecret = await secrets.send(
    new GetSecretValueCommand({ SecretId: appServiceSecretArn }),
  );
  const { password } = JSON.parse(appSecret.SecretString ?? "{}");
  if (!password) {
    throw new Error("app_service secret has no password");
  }
  const escapedPassword = String(password).replace(/'/g, "''");
  await exec(
    `do $do$ begin
       if not exists (select 1 from pg_roles where rolname = '${APP_SERVICE_ROLE}') then
         create role ${APP_SERVICE_ROLE} login;
       end if;
     end $do$;`,
  );
  await exec(`alter role ${APP_SERVICE_ROLE} with login password '${escapedPassword}'`);
  console.log(`bootstrapped role ${APP_SERVICE_ROLE}`);

  // 2. Tracking table + already-applied set.
  await exec(
    `create table if not exists public.schema_migrations (
       filename text primary key,
       applied_at timestamptz not null default now()
     )`,
  );
  const appliedResult = await exec("select filename from public.schema_migrations");
  const applied = new Set(
    JSON.parse(appliedResult.formattedRecords ?? "[]").map((row) => row.filename),
  );

  // 3. Apply pending files in lexical order, one transaction per file.
  const files = (await readdir(MIGRATIONS_DIR))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  let appliedCount = 0;
  for (const filename of files) {
    if (applied.has(filename)) {
      console.log(`skip   ${filename} (already applied)`);
      continue;
    }
    const sql = await readFile(join(MIGRATIONS_DIR, filename), "utf8");
    const statements = splitSqlStatements(sql);
    await applyMigrationTransaction({ rds, base, exec, filename, statements });
    console.log(`apply  ${filename} (${statements.length} statements)`);
    appliedCount += 1;
  }

  console.log(
    appliedCount === 0
      ? "up to date — no pending migrations"
      : `done — applied ${appliedCount} migration(s)`,
  );
}

// Run only when invoked directly (`node db/apply.mjs`), so tests can import the
// pure helpers above without triggering a deploy-time migration.
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
