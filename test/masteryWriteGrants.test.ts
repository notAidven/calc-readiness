import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { MASTERY_WRITE_STATEMENTS } from "@cr/diagnostic-api/mastery";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **THE SAME FAILURE MODE `cityWriteGrants.test.ts` EXISTS FOR, on the one table where it has
 * already happened once.**
 *
 * `app_service` holds least-privilege, COLUMN-SCOPED grants, so a writer that names a column
 * the migrations never granted passes every in-memory double in this repo and fails in
 * production for every learner. That is not hypothetical here. `student_node_state` had
 * `select` plus `insert (student_id, node_id, placement_estimate)` and NO `update` from
 * `0001` until `0004`, and the consequence — quoted from `0004`'s own header — was that
 * *"`mastery` was frozen at 0 forever"*. This lane is the first writer to use that grant, so
 * it is the first one that can get it wrong.
 *
 * ## What this file adds that the city one cannot
 *
 * `cityWriteGrants.test.ts` asserts its `TOUCHED` set is exactly the city and economy tables,
 * which means `student_node_state` appearing there is a FAILURE — correctly, because the city
 * body must not write a learning record. So the learning-record writer needs its own file
 * rather than a row in that one, and the two together say the whole thing: these tables are
 * written here and nowhere else.
 *
 * ## Both sides derived, both floored
 *
 * Grants come from the migration TEXT, because a service cannot ask a database nobody has
 * migrated. The DML comes from {@link MASTERY_WRITE_STATEMENTS}, which is the object the
 * writer executes rather than a transcription of it. Each derivation carries a floor: a regex
 * that has silently stopped matching yields an empty set, and every containment check here
 * would pass over one.
 */

const ROOT = resolveRepoRoot();

/**
 * Every migration that grants or defines something this lane writes. `0001` creates both
 * tables and holds the INSERT grant on `student_node_state`; `0004` holds the column-scoped
 * UPDATE that this writer is the first to use; `0014` adds the evidence columns and the only
 * grant `mastery_evidence` has ever had; `0018` adds the append-only raw-response columns and
 * its first column-scoped INSERT grant.
 */
const MIGRATIONS = [
  "db/migrations/0001_core_contracts.sql",
  "db/migrations/0004_civilization_state.sql",
  "db/migrations/0014_mastery_evidence.sql",
  "db/migrations/0019_mastery_attempt_integrity.sql",
].map((path) => readFileSync(posix.join(ROOT, path), "utf8"));

/** The migration text with `--` comments stripped, so prose cannot be read as SQL. */
const SCHEMA = MIGRATIONS.map((sql) => sql.replace(/--[^\n]*/g, "")).join("\n");

const STATEMENTS = Object.entries(MASTERY_WRITE_STATEMENTS);

function tablesTouched(): Set<string> {
  const tables = new Set<string>();
  for (const [, sql] of STATEMENTS) {
    for (const match of sql.matchAll(
      /(?:insert into|update|delete from)\s+public\.(\w+)/gi,
    )) {
      if (match[1]) {
        tables.add(match[1]);
      }
    }
  }
  return tables;
}

/** Privileges each statement needs, read off its leading verb plus any `do update`. */
function privilegesNeeded(): Map<string, Set<string>> {
  const needed = new Map<string, Set<string>>();
  const add = (table: string, privilege: string) => {
    const set = needed.get(table) ?? new Set<string>();
    set.add(privilege);
    needed.set(table, set);
  };
  for (const [name, sql] of STATEMENTS) {
    const insert = /insert into\s+public\.(\w+)/i.exec(sql)?.[1];
    const update = /^\s*update\s+public\.(\w+)/i.exec(sql)?.[1];
    const remove = /delete from\s+public\.(\w+)/i.exec(sql)?.[1];
    const select = /^\s*select\b/i.test(sql.trim());
    if (insert === undefined && update === undefined && remove === undefined && !select) {
      throw new Error(`\`${name}\` names no table to read or write: ${sql}`);
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
    const read = /from\s+public\.(\w+)/i.exec(sql)?.[1];
    if (select && read !== undefined) {
      add(read, "select");
    }
  }
  return needed;
}

/** Columns each statement writes, from a `set` clause or a `do update set` clause. */
function updateColumnsWritten(): Map<string, Set<string>> {
  const written = new Map<string, Set<string>>();
  for (const [, sql] of STATEMENTS) {
    const insertedTable = /insert into\s+public\.(\w+)/i.exec(sql)?.[1];
    const updatedTable = /^\s*update\s+public\.(\w+)/i.exec(sql)?.[1];
    const table = updatedTable ?? insertedTable;
    const setClause =
      /do update\s+set\s+([\s\S]+)$/i.exec(sql)?.[1] ??
      /^\s*update\s+public\.\w+\s+set\s+([\s\S]+?)\s+where\b/i.exec(sql)?.[1];
    if (table === undefined || setClause === undefined) {
      continue;
    }
    const columns = written.get(table) ?? new Set<string>();
    for (const match of setClause.matchAll(/(?:^|,)\s*(\w+)\s*=/g)) {
      if (match[1]) {
        columns.add(match[1]);
      }
    }
    written.set(table, columns);
  }
  return written;
}

/** Columns each `insert` names, from its parenthesised target list. */
function insertColumnsWritten(): Map<string, Set<string>> {
  const written = new Map<string, Set<string>>();
  for (const [name, sql] of STATEMENTS) {
    const insert = /insert into\s+public\.(\w+)\s*\(([^)]*)\)/i.exec(sql);
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

/** `table -> privilege -> columns`, an empty column set meaning table-wide. */
function grants(): Map<string, Map<string, Set<string>>> {
  const parsed = new Map<string, Map<string, Set<string>>>();
  // `[^;]*?` and not `[\s\S]*?`, which is the shape `cityWriteGrants.test.ts` uses. That
  // one cannot span a statement because its migrations contain no near-miss grant; `0001`
  // does — `grant usage on schema public to app_service;` — and a privilege list allowed to
  // cross the `;` swallows it plus the following `grant`, yielding a list that parses to no
  // privilege at all. The visible symptom was this file reporting that nothing grants
  // `select` on a table `0001` plainly grants it on.
  const pattern = /grant\s+([^;]*?)\s+on\s+public\.(\w+)\s+to\s+app_service\s*;/gi;
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

const GRANTS = grants();
const TOUCHED = tablesTouched();
const NEEDED = privilegesNeeded();
const UPDATED = updateColumnsWritten();
const INSERTED = insertColumnsWritten();

describe("the mastery writer only touches what the migrations granted", () => {
  it("derives a real population from both sides", () => {
    // Floors under every derivation, because each check below is a containment and
    // containment holds trivially over an empty set.
    expect(STATEMENTS.length).toBeGreaterThanOrEqual(6);
    expect(TOUCHED).toEqual(
      new Set(["student_node_state", "mastery_evidence", "raw_response_log"]),
    );
    expect(GRANTS.has("student_node_state")).toBe(true);
    expect(GRANTS.has("mastery_evidence")).toBe(true);
    expect(GRANTS.has("raw_response_log")).toBe(true);
    // The column-scoped UPDATE on `student_node_state` is the whole reason this file
    // exists, so the derivation has to have found the `set` clauses rather than none.
    expect([...UPDATED.keys()].sort()).toEqual(["student_node_state"]);
    expect([...INSERTED.keys()].sort()).toEqual([
      "mastery_evidence",
      "raw_response_log",
      "student_node_state",
    ]);
  });

  it("holds a granted privilege for every read and write it issues", () => {
    for (const [table, privileges] of NEEDED) {
      const held = GRANTS.get(table);
      expect(held, `nothing grants app_service anything on public.${table}`).toBeDefined();
      for (const privilege of privileges) {
        expect(
          held?.has(privilege),
          `public.${table} needs ${privilege} and no migration grants it`,
        ).toBe(true);
      }
    }
  });

  it("writes no column outside the column-scoped UPDATE grant", () => {
    for (const [table, columns] of UPDATED) {
      const granted = GRANTS.get(table)?.get("update");
      expect(granted, `public.${table} is updated with no update grant`).toBeDefined();
      if (granted === undefined || granted.size === 0) {
        // Table-wide update: nothing to check per column. Stated rather than assumed, so
        // that narrowing a grant later turns this into a real check instead of a skip.
        continue;
      }
      for (const column of columns) {
        expect(
          granted.has(column),
          `public.${table}.${column} is written by the mastery lane and is not in its ` +
            `column-scoped update grant (${[...granted].sort().join(", ")})`,
        ).toBe(true);
      }
    }
  });

  it("names no column outside the column-scoped INSERT grant", () => {
    for (const [table, columns] of INSERTED) {
      const granted = GRANTS.get(table)?.get("insert");
      expect(granted, `public.${table} is inserted with no insert grant`).toBeDefined();
      if (granted === undefined || granted.size === 0) {
        continue;
      }
      for (const column of columns) {
        expect(
          granted.has(column),
          `public.${table}.${column} is inserted by the mastery lane and is not in its ` +
            `column-scoped insert grant (${[...granted].sort().join(", ")})`,
        ).toBe(true);
      }
    }
  });

  it("never writes completion_status, which Postgres would refuse", () => {
    // A rule the grant check above CANNOT state, and the one most likely to be got wrong:
    // `completion_status` is `generated always as … stored` over `mastery`, so it is absent
    // from the update grant for a reason that is not least-privilege. Writing it is not a
    // permission error but a hard `cannot insert into column` from Postgres — and the
    // mastery service hands the store a `completion_status` on every call, so naming it is
    // the natural mistake. It belongs on `mastery_evidence`, where it is a fact about a
    // verdict rather than a column the database maintains.
    const columns = UPDATED.get("student_node_state") ?? new Set<string>();
    expect(columns.size).toBeGreaterThan(0);
    expect([...columns]).not.toContain("completion_status");
    const inserted = INSERTED.get("student_node_state") ?? new Set<string>();
    expect(inserted.size).toBeGreaterThan(0);
    expect([...inserted]).not.toContain("completion_status");
    // And it IS recorded on the evidence row, so the exclusion above is a decision about
    // where the value lives rather than the value being dropped.
    expect([...(INSERTED.get("mastery_evidence") ?? [])]).toContain("completion_status");
  });

  it("keeps both learning-record writes monotonic in SQL", () => {
    // The service already keeps a running max, so these clauses are a second opinion. They
    // are here because they are the one the DATABASE enforces, whichever caller arrives: a
    // mastery that can go down, or a revisited lesson that drags a built skill back to
    // Construction, are the two regressions a learner would actually feel.
    expect(MASTERY_WRITE_STATEMENTS.finalizePractice).toMatch(
      /mastery\s*=\s*greatest\s*\(\s*mastery\s*,\s*:mastery\s*\)/i,
    );
    expect(MASTERY_WRITE_STATEMENTS.writeStage).toMatch(/lesson_stage\s*<\s*:stage/i);
  });

  it("locks the node and finalizes practice timestamps and stage in one statement", () => {
    expect(MASTERY_WRITE_STATEMENTS.readMastery).toMatch(/for\s+update/i);
    expect(MASTERY_WRITE_STATEMENTS.finalizePractice).toMatch(
      /mastery_updated_at[\s\S]*lesson_stage[\s\S]*last_practiced_at/i,
    );
    expect(MASTERY_WRITE_STATEMENTS.finalizePractice).toMatch(/lesson_stage\s*=\s*'done'/i);
  });
});
