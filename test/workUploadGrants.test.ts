import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { ECONOMY_AUTHORITY_STATEMENTS } from "@cr/diagnostic-api/economy";
import { MASTERY_WRITE_STATEMENTS } from "@cr/diagnostic-api/mastery";
import { PLAGUE_STATE_STATEMENTS } from "@cr/diagnostic-api/plagueState";
import { WORK_UPLOAD_STATEMENTS } from "@cr/diagnostic-api/workUpload";
import { WORK_UPLOAD_PARSE_STATEMENTS } from "@cr/diagnostic-api/workUploadParse";
import {
  CITY_BOOTSTRAP_STATEMENTS,
  CITY_WRITE_STATEMENTS,
  ISLAND_RESET_STATEMENTS,
} from "@cr/diagnostic-api/writes";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **THE WORK-UPLOAD DML AGAINST THE GRANTS `0009` ACTUALLY ISSUES** — the same
 * production-only failure `test/cityWriteGrants.test.ts` exists for, for the second writer
 * in this service.
 *
 * `app_service` holds least-privilege grants. A statement touching a table or privilege the
 * migrations never granted works perfectly against every double in this repo and fails in
 * production, for every learner, with `permission denied`. Nothing in a test run executes as
 * that role, so this file stands in for it: both sides are derived, the grants from the
 * migration TEXT and the DML from `WORK_UPLOAD_STATEMENTS`, which is the exact object the
 * service executes rather than a transcription of it.
 *
 * ## The census is the part worth reading
 *
 * `cityWriteGrants.test.ts` guards `CITY_WRITE_STATEMENTS`. Scoped to that one export it was
 * correct and would have stayed green over any number of NEW writers, because its population
 * is an implementation (the city writer) rather than a behaviour (SQL this service issues as
 * `app_service`). This work-upload writer is exactly the kind of thing that would have slipped
 * past it.
 *
 * So the population here is not "the statements I remembered to check": it is derived from the
 * service's own sources — every `export const *_STATEMENTS` in
 * `services/diagnostic-api/src/**` — and asserted for SET EQUALITY against the two groups the
 * two grant guards cover. Add a third writer and this fails by name until it is guarded, which
 * is the only version of this file that keeps meaning something after the next feature lands.
 */

const ROOT = resolveRepoRoot();
const SERVICE_SRC = posix.join(ROOT, "services", "diagnostic-api", "src");

/** The migration text with `--` comments stripped, so prose cannot be read as SQL. */
const SCHEMA = readFileSync(
  posix.join(ROOT, "db", "migrations", "0009_work_upload.sql"),
  "utf8",
).replace(/--[^\n]*/g, "");

const STATEMENTS = Object.entries(WORK_UPLOAD_STATEMENTS);

/** Every `export const <NAME>_STATEMENTS` in the service's own sources, tests excluded. */
function exportedStatementGroups(): string[] {
  const found: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = posix.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.name.endsWith(".ts") || entry.name.includes(".test.")) {
        continue;
      }
      for (const match of readFileSync(path, "utf8").matchAll(
        /export const (\w*_STATEMENTS)\b/g,
      )) {
        if (match[1]) {
          found.push(match[1]);
        }
      }
    }
  };
  walk(SERVICE_SRC);
  return found.sort();
}

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
    if (insert === undefined && remove === undefined && select === undefined) {
      throw new Error(`\`${name}\` names no table at all: ${sql}`);
    }
    if (insert !== undefined) {
      add(insert, "insert");
      // `on conflict … do update` would need UPDATE too, which this table is not granted.
      if (/on conflict[\s\S]*do update/i.test(sql)) {
        add(insert, "update");
      }
    }
    if (remove !== undefined) {
      add(remove, "delete");
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

const GRANTS = grants();
const NEEDED = privilegesNeeded();
const INSERTED = insertColumns();

describe("the work-upload writer only touches what 0009 granted", () => {
  it("derives a real population from both sides", () => {
    // Floors, because every check below is a containment and containment holds trivially
    // over an empty set: a regex that stopped matching would make all of this a statement
    // about nothing.
    expect(STATEMENTS.length).toBeGreaterThanOrEqual(5);
    expect([...NEEDED.keys()]).toEqual(["work_upload"]);
    expect(GRANTS.size).toBeGreaterThanOrEqual(1);
    expect([...(NEEDED.get("work_upload") ?? [])].sort()).toEqual([
      "delete",
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

  it("never asks for UPDATE, which 0009 deliberately does not grant", () => {
    // The absence is the design: an upload is append-only plus deletion (§6), so nothing may
    // re-point a stored row at another object. Both halves are asserted, because a granted
    // update with no statement to use it is as wrong as the reverse.
    expect(GRANTS.get("work_upload")?.has("update")).toBe(false);
    expect(NEEDED.get("work_upload")?.has("update")).toBe(false);
  });

  it("writes only columns inside the insert grant", () => {
    expect([...INSERTED.keys()]).toEqual(["work_upload"]);
    const granted = GRANTS.get("work_upload")?.get("insert");
    // An empty column set is a TABLE-WIDE grant. That is the state today and it is asserted
    // rather than assumed, so narrowing the grant later fails here instead of in production.
    expect(granted?.size, "insert on work_upload has become column-scoped").toBe(0);
    // And the columns really are the table's: a typo would be `column … does not exist`.
    const declared = new Set(
      [...SCHEMA.matchAll(/^\s{2}(\w+)\s+(?:uuid|text|integer|timestamptz)/gm)].map(
        (match) => match[1],
      ),
    );
    expect(declared.size).toBeGreaterThanOrEqual(11);
    for (const column of INSERTED.get("work_upload") ?? []) {
      expect(
        declared,
        `the insert names public.work_upload.${column}, which 0009 does not create`,
      ).toContain(column);
    }
  });

  it("stores the verified sub and the student-scoped key, which the table also checks", () => {
    // The DB-level half of the ownership rule. It exists so a future writer cannot record a
    // row pointing at another learner's object; asserted here so nobody removes it as
    // redundant while the route it backs up is the only thing enforcing it.
    expect(SCHEMA).toMatch(/constraint work_upload_key_is_student_scoped/);
    expect(SCHEMA).toMatch(
      /object_key like 'work-uploads\/' \|\| student_id::text \|\| '\/%'/,
    );
  });
});

describe("every writer in this service is covered by a grant guard", () => {
  /**
   * The two statement groups the two grant guards check, and the reason each is named here
   * rather than counted: a floor would be satisfied by any two, including two copies of the
   * same one.
   */
  const GUARDED: ReadonlyMap<string, string> = new Map([
    ["CITY_BOOTSTRAP_STATEMENTS", "test/cityWriteGrants.test.ts"],
    ["CITY_WRITE_STATEMENTS", "test/cityWriteGrants.test.ts"],
    ["PLAGUE_STATE_STATEMENTS", "test/plagueStateGrants.test.ts"],
    ["ISLAND_RESET_STATEMENTS", "test/cityWriteGrants.test.ts"],
    ["ECONOMY_AUTHORITY_STATEMENTS", "test/economyAuthorityGrants.test.ts"],
    ["WORK_UPLOAD_STATEMENTS", "test/workUploadGrants.test.ts (this file)"],
    // The census working as designed: the v2 parse writer failed this equality by name on
    // the commit that added it, and stayed failing until it had a guard of its own.
    ["WORK_UPLOAD_PARSE_STATEMENTS", "test/workUploadParseGrants.test.ts"],
    // And again, for the mastery/lesson-stage writer. Worth recording that it caught the
    // same omission a second time, on a commit whose author HAD written the grant guard and
    // simply never enrolled it here: the guard existing is not what this equality checks, and
    // an unenrolled guard is indistinguishable from an unguarded writer until it runs.
    ["MASTERY_WRITE_STATEMENTS", "test/masteryWriteGrants.test.ts"],
  ]);

  it("finds the same statement groups in the sources that the guards cover", () => {
    const exported = exportedStatementGroups();
    // A floor first: a walk that found nothing would make the equality below vacuous.
    expect(exported.length).toBeGreaterThanOrEqual(2);
    // SET EQUALITY, in both directions. A third writer added to this service fails here by
    // name until a guard covers it; a guarded group that no longer exists fails too, so this
    // list cannot sit here describing something that has been deleted.
    expect(new Set(exported)).toEqual(new Set(GUARDED.keys()));
  });

  it("holds each guarded group to a real, non-empty statement object", () => {
    // The other way a census goes wrong: the names line up and one of them is empty, so its
    // guard is checking nothing at all.
    expect(Object.keys(CITY_BOOTSTRAP_STATEMENTS).length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(CITY_WRITE_STATEMENTS).length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(ISLAND_RESET_STATEMENTS).length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(ECONOMY_AUTHORITY_STATEMENTS).length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(WORK_UPLOAD_STATEMENTS).length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(WORK_UPLOAD_PARSE_STATEMENTS).length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(PLAGUE_STATE_STATEMENTS).length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(MASTERY_WRITE_STATEMENTS).length).toBeGreaterThanOrEqual(6);
    for (const sql of [
      ...Object.values(CITY_BOOTSTRAP_STATEMENTS),
      ...Object.values(CITY_WRITE_STATEMENTS),
      ...Object.values(ISLAND_RESET_STATEMENTS),
      ...Object.values(ECONOMY_AUTHORITY_STATEMENTS),
      ...Object.values(WORK_UPLOAD_STATEMENTS),
      ...Object.values(WORK_UPLOAD_PARSE_STATEMENTS),
      ...Object.values(PLAGUE_STATE_STATEMENTS),
      ...Object.values(MASTERY_WRITE_STATEMENTS),
    ]) {
      expect(sql).toMatch(/public\.\w+/);
    }
  });
});
