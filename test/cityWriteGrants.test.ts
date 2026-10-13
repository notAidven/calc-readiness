import { readFileSync } from "node:fs";
import { posix } from "node:path";
import {
  ECONOMY_AUTHORITY_STATEMENTS,
  ECONOMY_LEDGER_INSERT,
} from "@cr/diagnostic-api/economy";
import {
  CITY_BOOTSTRAP_STATEMENTS,
  CITY_WRITE_STATEMENTS,
  ISLAND_RESET_STATEMENTS,
} from "@cr/diagnostic-api/writes";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **THE ONE FAILURE MODE NO IN-MEMORY DOUBLE CAN REACH.**
 *
 * `app_service` holds least-privilege, COLUMN-SCOPED grants. A writer that touches a column
 * the migrations never granted works perfectly against every test double in this repo and
 * fails in production, for every learner, with `permission denied for table city_state` —
 * and `0004_civilization_state.sql`'s own header is about exactly this: the reason `mastery`
 * was frozen at 0 forever was a missing `update` grant, not missing code. *"Every table
 * below is granted in the same file that creates it"* is the lesson; this file is what makes
 * it checkable from the writer's side.
 *
 * ## Both sides are derived, and both are floored
 *
 * The grants come from the migration TEXT (there is no other vantage point — a service
 * cannot ask a database that nobody has migrated), and the DML comes from
 * `CITY_WRITE_STATEMENTS`, which is the exact array of strings `saveCityToAurora` executes
 * rather than a transcription of them. Neither is a hand-written list, and each derivation
 * has a floor under it: a regex that has silently stopped matching returns an empty set that
 * every containment check below would pass.
 *
 * ## Why the era enum is here too
 *
 * `city_era` is a Postgres enum and `parseCityWrite` validates against `ERA_SEQUENCE`. If an
 * eleventh era is authored in the skill graph and the enum does not move, the write path
 * accepts an era the database refuses, and the learner's whole city stops saving the moment
 * they advance into it. Set equality in both directions, because either half moving alone is
 * the defect.
 */

const ROOT = resolveRepoRoot();
const MIGRATIONS = [
  "db/migrations/0004_civilization_state.sql",
  "db/migrations/0005_city_damage_mint.sql",
  "db/migrations/0009_intrusion_record_scar.sql",
  "db/migrations/0011_archipelago_islands.sql",
  "db/migrations/0012_economy_authority.sql",
  "db/migrations/0016_island_unlock_authority.sql",
  "db/migrations/0017_interleaved_evidence_constraints.sql",
].map((path) => readFileSync(posix.join(ROOT, path), "utf8"));

/** The migration text with `--` comments stripped, so prose cannot be read as SQL. */
const SCHEMA = MIGRATIONS.map((sql) => sql.replace(/--[^\n]*/g, "")).join("\n");

/** The statements the writer actually runs, as `[name, sql]`. */
const STATEMENTS = [
  ...Object.entries(CITY_BOOTSTRAP_STATEMENTS),
  ...Object.entries(CITY_WRITE_STATEMENTS),
  ...Object.entries(ISLAND_RESET_STATEMENTS),
  ...Object.entries(ECONOMY_AUTHORITY_STATEMENTS),
  ["appendEconomyRows", ECONOMY_LEDGER_INSERT] as const,
];

/** Tables the civilization writer touches, derived from its own statements. */
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

/**
 * Which privileges the writer needs on each table, read off the leading verb of each
 * statement plus whether it carries a `do update`. An `on conflict … do update` needs INSERT
 * *and* UPDATE, which is precisely the pairing a column-scoped grant gets wrong.
 */
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
    if (insert === undefined && update === undefined && remove === undefined) {
      throw new Error(`\`${name}\` names no table to write: ${sql}`);
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
  }
  return needed;
}

/**
 * The columns each statement's `do update` writes — the ones a column-scoped UPDATE grant
 * has to cover. Read off the `set` clause, which is where they are and nowhere else.
 */
function updateColumnsWritten(): Map<string, Set<string>> {
  const written = new Map<string, Set<string>>();
  for (const [, sql] of STATEMENTS) {
    const insertedTable = /insert into\s+public\.(\w+)/i.exec(sql)?.[1];
    const updatedTable = /^\s*update\s+public\.(\w+)/i.exec(sql)?.[1];
    const table = insertedTable ?? updatedTable;
    const setClause =
      /do update\s+set\s+([\s\S]+)$/i.exec(sql)?.[1] ??
      /^\s*update\s+public\.\w+\s+set\s+([\s\S]+?)\s+where\b/i.exec(sql)?.[1];
    if (table === undefined || setClause === undefined) {
      continue;
    }
    const columns = written.get(table) ?? new Set<string>();
    // `col = <expr>` at the start of the clause or after a top-level comma. The expressions
    // here contain `(`, `.` and commas inside `greatest(a, b)`, so match the assignment
    // TARGETS rather than trying to split the clause.
    for (const match of setClause.matchAll(/(?:^|,)\s*(\w+)\s*=/g)) {
      if (match[1]) {
        columns.add(match[1]);
      }
    }
    written.set(table, columns);
  }
  return written;
}

/**
 * The columns each `insert` names — read off the parenthesised target list.
 *
 * Checked even though every INSERT grant here is table-wide today, because "table-wide" is a
 * fact about `0004` and not a property of the grant system: `grant insert (a, b) on t` is legal
 * Postgres, and narrowing one would break the writer in production while every test in this
 * repo stayed green. The assertion below therefore requires the grant to be table-wide OR to
 * cover the columns, and states which of the two it currently is.
 */
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

/**
 * Every `grant <privileges> [(columns)] on public.<table> to app_service` in the schema, as
 * `table -> privilege -> columns` (an empty column set meaning table-wide).
 */
function grants(): Map<string, Map<string, Set<string>>> {
  const parsed = new Map<string, Map<string, Set<string>>>();
  const pattern = /grant\s+([\s\S]*?)\s+on\s+public\.(\w+)\s+to\s+app_service\s*;/gi;
  for (const match of SCHEMA.matchAll(pattern)) {
    const [, privilegeList, table] = match;
    if (privilegeList === undefined || table === undefined) {
      continue;
    }
    const byPrivilege = parsed.get(table) ?? new Map<string, Set<string>>();
    // `select, insert` and `update (a, b, c)` in one clause: split on commas that are NOT
    // inside a parenthesised column list.
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

describe("the city writer only touches what the migrations granted", () => {
  it("derives a real population from both sides", () => {
    // Floors, because every check below is a containment and containment holds trivially
    // over an empty set. City, founding, evidence, repair and ledger writes all participate.
    expect(STATEMENTS.length).toBeGreaterThanOrEqual(15);
    expect(TOUCHED).toEqual(
      new Set([
        "city_placement",
        "city_road",
        "city_state",
        "city_island_state",
        "city_crisis_damage",
        "interleaved_practice_clear",
        "island_unlock_authority",
        "island_unlock_exam_response",
        "island_unlock_exam_session",
        "resource_grant_ledger",
      ]),
    );
    expect(GRANTS.size).toBeGreaterThanOrEqual(8);
    expect(NEEDED.size).toBe(TOUCHED.size);
    // The column-scoped UPDATE grants are the whole reason this file exists, so the
    // derivation must actually have found `do update` clauses rather than none.
    expect([...UPDATED.keys()].sort()).toEqual([
      "city_crisis_damage",
      "city_island_state",
      "city_placement",
      "city_state",
      "island_unlock_exam_session",
    ]);
  });

  it("holds a granted privilege for every write it issues", () => {
    for (const [table, privileges] of NEEDED) {
      const granted = GRANTS.get(table);
      expect(granted, `no grant at all on public.${table}`).toBeDefined();
      for (const privilege of privileges) {
        expect(
          granted?.has(privilege),
          `the writer issues ${privilege} on public.${table}, which app_service is not ` +
            "granted — that is a `permission denied` in production and a green suite here",
        ).toBe(true);
      }
    }
  });

  it("writes only columns inside each column-scoped update grant", () => {
    for (const [table, columns] of UPDATED) {
      const granted = GRANTS.get(table)?.get("update");
      expect(granted, `no update grant on public.${table}`).toBeDefined();
      // A table-wide update grant (no column list) would make this vacuous, so require the
      // scoping to be there: these tables are granted column by column on purpose.
      expect(
        granted?.size,
        `update on public.${table} is not column-scoped`,
      ).toBeGreaterThan(0);
      for (const column of columns) {
        expect(
          granted?.has(column),
          `the writer's \`do update\` sets public.${table}.${column}, which is outside ` +
            `the granted column list (${[...(granted ?? [])].join(", ")})`,
        ).toBe(true);
      }
    }
  });

  it("writes only columns inside each insert grant", () => {
    expect([...INSERTED.keys()].sort()).toEqual([
      "city_crisis_damage",
      "city_island_state",
      "city_placement",
      "city_road",
      "city_state",
      "interleaved_practice_clear",
      "island_unlock_authority",
      "island_unlock_exam_response",
      "island_unlock_exam_session",
      "resource_grant_ledger",
    ]);
    for (const [table, columns] of INSERTED) {
      const granted = GRANTS.get(table)?.get("insert");
      expect(granted, `no insert grant on public.${table}`).toBeDefined();
      // An empty column set is a TABLE-WIDE grant, which covers every column including ones a
      // later migration adds. That is the state today and it is asserted rather than assumed,
      // so narrowing one of these grants fails here instead of in production.
      expect(
        granted?.size,
        `insert on public.${table} has become column-scoped; the writer's columns now have ` +
          "to be checked against it rather than assumed covered",
      ).toBe(0);
      for (const column of columns) {
        expect(
          granted?.size === 0 || granted?.has(column),
          `the writer inserts public.${table}.${column}, which is outside the granted list`,
        ).toBe(true);
      }
    }
  });

  it("grants UPDATE on the damage mint, which 0004 alone does not", () => {
    // The one column added after `0004`, and the specific thing a reviewer asked to see: the
    // live cluster's column-level UPDATE grant on `city_state` is exactly
    // (era_id, road_gold_spent, updated_at), so `0005` has to add its own or the upsert's
    // `do update` is `permission denied` for every returning learner. `0004`'s table-wide
    // `grant select, insert` already covers the column on INSERT and on the `greatest(…)` read.
    const cityState = GRANTS.get("city_state");
    expect(cityState?.get("update")).toContain("next_damage_ordinal");
    expect(
      cityState?.get("select")?.size,
      "select on city_state must stay table-wide",
    ).toBe(0);
    expect(
      cityState?.get("insert")?.size,
      "insert on city_state must stay table-wide",
    ).toBe(0);
    // And it is genuinely needed: the writer's `do update` really does set it.
    expect(UPDATED.get("city_state")).toContain("next_damage_ordinal");
  });

  it("keeps `era_built`, `kind` and `subject_id` out of every update", () => {
    // WHAT A PLACEMENT IS, as opposed to where it stands. `0004` scopes the grant to the
    // transform so no writer can rewrite the first three, and the reason is `era_built`:
    // it records the era a building was RAISED in, so a save that re-stamped it would
    // rewrite history every time the learner moved a wall.
    const placement = UPDATED.get("city_placement") ?? new Set<string>();
    expect(placement).toEqual(new Set(["grid_col", "grid_row", "rot"]));
  });

  it("never grants itself update or delete on the ledger", () => {
    // INV-COS-4/5: append-only. Not a claim about this writer (it does not touch the
    // ledger at all) but about the schema it will be written against, because the moment
    // Wave 2 G lands, whoever writes it will read the grants and not this comment.
    const ledger = GRANTS.get("resource_grant_ledger");
    expect(ledger, "no grant on resource_grant_ledger").toBeDefined();
    expect([...(ledger?.keys() ?? [])].sort()).toEqual(["insert", "select"]);
  });
});

describe("the city_era enum is the authored sequence", () => {
  it("matches ERA_SEQUENCE in both directions", () => {
    const body = /create type public\.city_era as enum \(([\s\S]*?)\)\s*;/i.exec(
      SCHEMA,
    )?.[1];
    expect(body, "no `create type public.city_era` in the migrations").toBeDefined();
    const enumMembers = new Set(
      [...(body ?? "").matchAll(/'([^']+)'/g)].map((match) => match[1]),
    );
    const authored = new Set(ERA_SEQUENCE.map((era) => era.id));

    // A floor, then equality. `toEqual` over two sets already fails in both directions:
    // an era authored and not enumerated (the write path accepts what the database
    // refuses, so the learner's city stops saving), and an enum member no longer authored.
    expect(authored.size).toBeGreaterThanOrEqual(10);
    expect(enumMembers).toEqual(authored);
  });
});
