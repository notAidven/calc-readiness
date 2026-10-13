import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { WORK_UPLOAD_PARSE_STATEMENTS } from "@cr/diagnostic-api/workUploadParse";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **THE PARSE LEDGER'S DML AGAINST THE GRANTS `0010` ACTUALLY ISSUES** — the third writer in
 * this service, and the same production-only failure `cityWriteGrants` and
 * `workUploadGrants` exist for.
 *
 * `app_service` holds least-privilege grants. A statement touching a table or privilege the
 * migrations never granted works perfectly against every double in this repo and fails in
 * production, for every learner, with `permission denied`. Nothing in a test run executes as
 * that role, so this file stands in for it: both sides are derived, the grants from the
 * migration TEXT and the DML from `WORK_UPLOAD_PARSE_STATEMENTS`, which is the exact object
 * the service executes rather than a transcription of it.
 *
 * `test/workUploadGrants.test.ts`'s census is what made this file exist rather than merely
 * be a good idea: it derives every `export const *_STATEMENTS` in the service and asserts
 * SET EQUALITY against the groups the grant guards cover, so adding the parse writer failed
 * there by name until this was written. That is the census working, and it is worth saying
 * because the alternative — a third writer nobody guarded — is exactly what the census was
 * built after.
 *
 * ## The interesting absence here is DELETE, not UPDATE
 *
 * `0009` withheld UPDATE and this table withholds both. Deletion is a §6 REQUIREMENT and it
 * still happens: `work_upload_parse` cascades from `work_upload`, and PostgreSQL runs a
 * foreign key's referential action as the referencing table's OWNER rather than as the
 * deleting role. So `delete from work_upload` as `app_service` takes the reading with the
 * photograph while `app_service` cannot delete from this table directly.
 *
 * That is a claim about PostgreSQL, and getting it wrong would be a §6 deletion that
 * silently leaves the reading behind — so it was MEASURED before it was relied on. Applied
 * `0009` + `0010` to PostgreSQL 18.3 (PGlite 0.5.4) and ran as a role holding exactly these
 * grants: deleting the upload took the parse row with it (1 → 0), and a direct delete failed
 * with `permission denied for table work_upload_parse`. Both halves, because the first
 * without the second does not distinguish a working cascade from an over-broad grant. The
 * migration's header records the same run.
 */

const ROOT = resolveRepoRoot();

/** One migration's text with `--` comments stripped, so prose cannot be read as SQL. */
function migration(name: string): string {
  return readFileSync(posix.join(ROOT, "db", "migrations", name), "utf8").replace(
    /--[^\n]*/g,
    "",
  );
}

/**
 * `0010`, which CREATES the table. The cascade and ownership assertions below are about this
 * file specifically, so they read it specifically.
 */
const SCHEMA = migration("0010_work_upload_parse.sql");

/**
 * Every migration that touches the table, derived from the directory.
 *
 * The column census under "writes only columns inside the insert grant" has to be the whole
 * table, not the table as `0010` left it. It was the second of the two files reading `0010`
 * alone, and it is the one that noticed: adding `explanation` to the insert failed here with
 * *"which 0010 does not create"* while the column sat in `0011` all along.
 */
const ALL_SCHEMA = readdirSync(posix.join(ROOT, "db", "migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map(migration)
  .filter((sql) => sql.includes("work_upload_parse"));

const STATEMENTS = Object.entries(WORK_UPLOAD_PARSE_STATEMENTS);

/** `table -> privilege -> columns` (empty column set = table-wide) for `app_service`. */
function grants(): Map<string, Map<string, Set<string>>> {
  const parsed = new Map<string, Map<string, Set<string>>>();
  const pattern = /grant\s+([\s\S]*?)\s+on\s+public\.(\w+)\s+to\s+app_service\s*;/gi;
  for (const match of SCHEMA.matchAll(pattern)) {
    const [, privilegeList, table] = match;
    if (privilegeList === undefined || table === undefined) {
      continue;
    }
    const byPrivilege = parsed.get(table) ?? new Map<string, Set<string>>();
    for (const part of privilegeList.split(/,(?![^(]*\))/)) {
      const entry = /^\s*(\w+)\s*(?:\(([^)]*)\))?\s*$/.exec(part);
      const privilege = entry?.[1]?.toLowerCase();
      if (privilege === undefined) {
        continue;
      }
      const columns = byPrivilege.get(privilege) ?? new Set<string>();
      for (const column of entry?.[2]?.split(",") ?? []) {
        columns.add(column.trim());
      }
      byPrivilege.set(privilege, columns);
    }
    parsed.set(table, byPrivilege);
  }
  return parsed;
}

/** Which privilege each statement needs on which table, off its leading verb. */
function privilegesNeeded(): Map<string, Set<string>> {
  const needed = new Map<string, Set<string>>();
  const add = (table: string, privilege: string) => {
    const set = needed.get(table) ?? new Set<string>();
    set.add(privilege);
    needed.set(table, set);
  };
  for (const [name, sql] of STATEMENTS) {
    const insert = /insert into\s+public\.(\w+)/i.exec(sql)?.[1];
    const remove = /delete from\s+public\.(\w+)/i.exec(sql)?.[1];
    const select = /\bfrom\s+public\.(\w+)/i.exec(sql)?.[1];
    const update = /^\s*update\s+public\.(\w+)/i.exec(sql)?.[1];
    if (
      insert === undefined &&
      remove === undefined &&
      select === undefined &&
      update === undefined
    ) {
      throw new Error(`\`${name}\` names no table at all: ${sql}`);
    }
    if (insert !== undefined) {
      add(insert, "insert");
      if (/on conflict[\s\S]*do update/i.test(sql)) {
        add(insert, "update");
      }
    }
    if (remove !== undefined) {
      add(remove, "delete");
    }
    if (update !== undefined) {
      add(update, "update");
    }
    if (select !== undefined && /^\s*select\b/i.test(sql)) {
      add(select, "select");
    }
  }
  return needed;
}

/** The columns each insert names, off its parenthesised target list. */
function insertColumns(): Map<string, Set<string>> {
  const written = new Map<string, Set<string>>();
  for (const [name, sql] of STATEMENTS) {
    const insert = /insert into\s+public\.(\w+)\s*\(([\s\S]*?)\)/i.exec(sql);
    const table = insert?.[1];
    if (table === undefined) {
      continue;
    }
    const list = insert?.[2];
    if (list === undefined || list.trim() === "") {
      throw new Error(`\`${name}\` inserts without naming its columns: ${sql}`);
    }
    const columns = written.get(table) ?? new Set<string>();
    for (const column of list.split(",")) {
      columns.add(column.trim());
    }
    written.set(table, columns);
  }
  return written;
}

const GRANTS = grants();
const NEEDED = privilegesNeeded();
const INSERTED = insertColumns();

describe("the parse writer only touches what 0010 granted", () => {
  it("derives a real population from both sides", () => {
    // Floors, because every check below is a containment and containment holds trivially
    // over an empty set: a regex that stopped matching would make all of this a statement
    // about nothing.
    expect(STATEMENTS.length).toBeGreaterThanOrEqual(4);
    expect([...NEEDED.keys()]).toEqual(["work_upload_parse"]);
    expect(GRANTS.size).toBeGreaterThanOrEqual(1);
    expect([...(NEEDED.get("work_upload_parse") ?? [])].sort()).toEqual([
      "insert",
      "select",
    ]);
  });

  it("holds a granted privilege for every statement it issues", () => {
    for (const [table, privileges] of NEEDED) {
      const granted = GRANTS.get(table);
      expect(granted, `no grant at all on public.${table}`).toBeDefined();
      for (const privilege of privileges) {
        expect(
          granted?.has(privilege),
          `the service issues ${privilege} on public.${table}, which app_service is not ` +
            "granted — that is a `permission denied` in production and a green suite here",
        ).toBe(true);
      }
    }
  });

  it("asks for neither UPDATE nor DELETE, which 0010 deliberately does not grant", () => {
    // Both absences, in both directions. A granted privilege with no statement to use it is
    // as wrong as the reverse: it would be a widened blast radius nobody had a reason for.
    for (const privilege of ["update", "delete"]) {
      expect(
        GRANTS.get("work_upload_parse")?.has(privilege),
        `0010 grants ${privilege} on work_upload_parse and nothing uses it`,
      ).toBe(false);
      expect(
        NEEDED.get("work_upload_parse")?.has(privilege),
        `the service issues ${privilege} on work_upload_parse without a grant`,
      ).toBe(false);
    }
  });

  it("deletes a reading by cascade, which is why no delete grant is needed", () => {
    // The §6 deletion right still reaches the reading. Asserted on the SCHEMA rather than
    // taken on trust, because "no delete grant" and "no deletion" are one missing clause
    // apart, and the difference is invisible from every double in this repo.
    expect(SCHEMA).toMatch(
      /references\s+public\.work_upload\s*\(\s*upload_id\s*\)\s*on delete cascade/,
    );
    expect(SCHEMA).toMatch(
      /references\s+public\.work_upload\s*\(\s*upload_id,\s*student_id\s*\)\s*\n?\s*on delete cascade/,
    );
    // And the owning student on a reading is the upload's owner, in the DATA. The route
    // establishes it with a `sub`-scoped lookup; this is the copy that holds when a future
    // writer forgets to.
    expect(SCHEMA).toMatch(/constraint work_upload_parse_belongs_to_its_uploads_owner/);
  });

  it("writes only columns inside the insert grant", () => {
    expect([...INSERTED.keys()]).toEqual(["work_upload_parse"]);
    const granted = GRANTS.get("work_upload_parse")?.get("insert");
    // An empty column set is a TABLE-WIDE grant. That is the state today and it is asserted
    // rather than assumed, so narrowing the grant later fails here instead of in production.
    expect(granted?.size, "insert on work_upload_parse has become column-scoped").toBe(0);
    // And the columns really are the table's: a typo would be `column … does not exist`.
    // Read across every migration that touches the table rather than out of `0010` alone,
    // because a column added by a later one is just as much the table's.
    const types = "uuid|text|integer|real|jsonb|timestamptz";
    const declared = new Set<string>();
    for (const sql of ALL_SCHEMA) {
      for (const match of sql.matchAll(new RegExp(`^\\s{2}(\\w+)\\s+(?:${types})`, "gm"))) {
        declared.add(match[1] ?? "");
      }
      for (const match of sql.matchAll(
        new RegExp(`add column(?:\\s+if not exists)?\\s+(\\w+)\\s+(?:${types})`, "gi"),
      )) {
        declared.add(match[1] ?? "");
      }
    }
    expect(ALL_SCHEMA.length).toBeGreaterThanOrEqual(2);
    expect(declared.size).toBeGreaterThanOrEqual(14);
    for (const column of INSERTED.get("work_upload_parse") ?? []) {
      expect(
        declared,
        `the insert names public.work_upload_parse.${column}, which no migration creates`,
      ).toContain(column);
    }
  });

  it("keeps the spend columns the cap is computed from, and constrains them", () => {
    // The ledger's second job. A cap summed over a column that could go negative, or that
    // the insert stopped naming, would be a cap that quietly stopped being one.
    for (const column of ["input_tokens", "output_tokens", "cost_micro_usd"]) {
      expect(INSERTED.get("work_upload_parse")).toContain(column);
    }
    expect(SCHEMA).toMatch(/constraint work_upload_parse_spend_is_not_negative/);
    // And the statement that reads them back is the one the route enforces the cap with.
    expect(WORK_UPLOAD_PARSE_STATEMENTS.sumRecentSpend).toContain("sum(cost_micro_usd)");
  });
});
