import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { islandUnlockTarget } from "@cr/game";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import { describe, expect, it, vi } from "vitest";

// @ts-expect-error The production runner is intentionally plain ESM for direct Node execution.
import * as migrationRunner from "../db/apply.mjs";

const { applyMigrationTransaction, assertNoTransactionControl, splitSqlStatements } =
  migrationRunner;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = join(ROOT, "db", "migrations");
const ISLAND_AUTHORITY = "0016_island_unlock_authority.sql";

interface Execution {
  readonly sql: string;
  readonly parameters: unknown;
  readonly transactionId: string | undefined;
}

function harness(failOn?: (sql: string) => boolean) {
  const commands: string[] = [];
  const executions: Execution[] = [];
  const rds = {
    send: vi.fn(async (command: { constructor: { name: string } }) => {
      commands.push(command.constructor.name);
      if (command.constructor.name === "BeginTransactionCommand") {
        return { transactionId: "tx-one" };
      }
      return {};
    }),
  };
  const exec = vi.fn(
    async (sql: string, parameters: unknown, transactionId: string | undefined) => {
      executions.push({ sql, parameters, transactionId });
      if (failOn?.(sql)) {
        throw new Error("injected statement failure");
      }
      return {};
    },
  );
  return { rds, exec, commands, executions };
}

describe("the Data API migration transaction boundary", () => {
  it("gives the island authority the next collision-free ordinal and no nested controls", () => {
    const files = readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql"));
    expect(files).toContain(ISLAND_AUTHORITY);
    expect(files).not.toContain("0014_island_unlock_authority.sql");

    // Historical migrations through 0011 predate the ordinal rule and include named parallel
    // lanes. Every migration from the transaction-owning economy lane onward is unique.
    const currentOrdinals = files
      .map((name) => ({ name, ordinal: Number.parseInt(name.slice(0, 4), 10) }))
      .filter(({ ordinal }) => ordinal >= 12);
    expect(currentOrdinals.length).toBeGreaterThanOrEqual(5);
    expect(new Set(currentOrdinals.map(({ ordinal }) => ordinal)).size).toBe(
      currentOrdinals.length,
    );

    const statements = splitSqlStatements(
      readFileSync(join(MIGRATIONS, ISLAND_AUTHORITY), "utf8"),
    );
    expect(statements.length).toBeGreaterThanOrEqual(10);
    expect(() => assertNoTransactionControl(statements, ISLAND_AUTHORITY)).not.toThrow();

    const sql = readFileSync(join(MIGRATIONS, ISLAND_AUTHORITY), "utf8");
    for (const [index, era] of ERA_SEQUENCE.entries()) {
      expect(sql, `${era.id} target`).toContain(
        `when '${era.id}' then ${islandUnlockTarget(era.nodes.length)}`,
      );
      const next = ERA_SEQUENCE[index + 1];
      expect(sql, `${era.id} adjacency`).toContain(
        next
          ? `when '${era.id}' then '${next.id}'::public.city_era`
          : `when '${era.id}' then null`,
      );
    }
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    expect(sql).toContain("authority_kind = 'exam'");
    expect(sql).toContain("authority_kind = 'diagnostic'");
    expect(sql).toContain("outcome in ('answer', 'skip')");
  });

  it("sends every DDL, grant, and tracking write through one runner transaction", async () => {
    const statements = splitSqlStatements(
      readFileSync(join(MIGRATIONS, ISLAND_AUTHORITY), "utf8"),
    );
    const run = harness();

    await applyMigrationTransaction({
      rds: run.rds,
      base: { resourceArn: "cluster", secretArn: "secret", database: "db" },
      exec: run.exec,
      filename: ISLAND_AUTHORITY,
      statements,
    });

    expect(run.commands).toEqual(["BeginTransactionCommand", "CommitTransactionCommand"]);
    expect(run.executions).toHaveLength(statements.length + 1);
    expect(run.executions.every(({ transactionId }) => transactionId === "tx-one")).toBe(
      true,
    );
    expect(run.executions.slice(0, -1).map(({ sql }) => sql)).toEqual(statements);
    expect(run.executions.at(-1)?.sql).toContain("schema_migrations");
  });

  it("rolls back the one runner transaction on an injected statement failure", async () => {
    const statements = [
      "create table first(id integer)",
      "grant select on first to app_service",
    ];
    const run = harness((sql) => sql.startsWith("grant "));

    await expect(
      applyMigrationTransaction({
        rds: run.rds,
        base: { resourceArn: "cluster", secretArn: "secret", database: "db" },
        exec: run.exec,
        filename: "0016_injected.sql",
        statements,
      }),
    ).rejects.toThrow("migration 0016_injected.sql failed");

    expect(run.commands).toEqual(["BeginTransactionCommand", "RollbackTransactionCommand"]);
    expect(run.executions).toHaveLength(2);
    expect(run.executions.every(({ transactionId }) => transactionId === "tx-one")).toBe(
      true,
    );
    expect(run.executions.some(({ sql }) => sql.includes("schema_migrations"))).toBe(false);
  });

  it("rejects nested BEGIN or COMMIT before opening a Data API transaction", async () => {
    const run = harness();
    await expect(
      applyMigrationTransaction({
        rds: run.rds,
        base: { resourceArn: "cluster", secretArn: "secret", database: "db" },
        exec: run.exec,
        filename: "0016_bad.sql",
        statements: ["begin", "create table bad(id integer)", "commit"],
      }),
    ).rejects.toThrow("nested transaction control");
    expect(run.commands).toEqual([]);
    expect(run.executions).toEqual([]);
  });

  it("rejects comment-prefixed and variant transaction controls without false positives", () => {
    const reproduced = splitSqlStatements(`
      -- open
      BEGIN;
      create table bad(id integer);
      -- close
      COMMIT;
    `);
    expect(() => assertNoTransactionControl(reproduced, "commented.sql")).toThrow(
      "nested transaction control",
    );

    const variants = [
      "/* open */ START TRANSACTION",
      " \n -- open\n BeGiN WORK",
      "/* close */ COMMIT TRANSACTION",
      "/* close */ ROLLBACK WORK",
      "-- close\nEND TRANSACTION",
      "/* close */ ABORT",
    ];
    for (const statement of variants) {
      expect(
        () => assertNoTransactionControl([statement], "variant.sql"),
        statement,
      ).toThrow("nested transaction control");
    }

    const controls = [
      "select '-- BEGIN; COMMIT' as prose",
      "select '/* ROLLBACK */' as prose",
      "do $body$ begin perform 'COMMIT'; end $body$",
      "/* BEGIN; nested prose only */ select 1",
      "-- COMMIT is documentation\nselect 1",
    ];
    for (const statement of controls) {
      expect(
        () => assertNoTransactionControl([statement], "false-positive.sql"),
        statement,
      ).not.toThrow();
    }
  });

  it("rejects transaction token sequences separated by PostgreSQL comments", () => {
    const starts = [
      "START/*block*/TRANSACTION",
      "START /*block*/ TRANSACTION",
      "START -- line\nTRANSACTION",
    ];
    const analogous = [
      "BEGIN/*block*/WORK",
      "BEGIN -- line\nTRANSACTION",
      "COMMIT/*block*/WORK",
      "COMMIT -- line\nTRANSACTION",
      "END/* outer /* nested */ block */TRANSACTION",
      "ROLLBACK/*block*/WORK",
      "ROLLBACK -- line\nTRANSACTION",
      "ABORT/* trailing comment */",
    ];
    expect(starts).toHaveLength(3);
    expect(analogous.length).toBeGreaterThanOrEqual(8);
    for (const statement of [...starts, ...analogous]) {
      expect(
        () => assertNoTransactionControl([statement], "inter-token-comment.sql"),
        statement,
      ).toThrow("nested transaction control");
    }
  });

  it("does not classify transaction words inside PostgreSQL quoted or procedural regions", () => {
    const controls = [
      "select 'START/*block*/TRANSACTION' as text",
      String.raw`select E'START -- line\nTRANSACTION' as escaped`,
      'select "START TRANSACTION" from "COMMIT WORK"',
      'select "START;COMMIT" from "ROLLBACK;WORK"',
      "select $$BEGIN; COMMIT; ROLLBACK;$$ as body",
      "select $tag$START/*block*/TRANSACTION$tag$ as body",
      "do $body$ begin perform 'COMMIT WORK'; end $body$",
      "/* START TRANSACTION */ select 1 -- COMMIT",
      "-- ROLLBACK WORK\nselect 1",
    ];
    expect(controls.length).toBeGreaterThanOrEqual(8);
    for (const statement of controls) {
      const statements = splitSqlStatements(`${statement}\n; select 1;`);
      expect(statements.length, statement).toBe(2);
      expect(
        () => assertNoTransactionControl(statements, "quoted-control.sql"),
        statement,
      ).not.toThrow();
    }
  });
});
