import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { ECONOMY_AUTHORITY_STATEMENTS } from "@cr/diagnostic-api/economy";
import { CITY_WRITE_STATEMENTS, ISLAND_RESET_STATEMENTS } from "@cr/diagnostic-api/writes";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const ROOT = resolveRepoRoot();
const MIGRATION = posix.join(ROOT, "db/migrations/0011_archipelago_islands.sql");
const READS = posix.join(ROOT, "services/diagnostic-api/src/reads.ts");
const WRITES = posix.join(ROOT, "services/diagnostic-api/src/writes.ts");

function source(path: string): string {
  expect(existsSync(path), `${path} must exist`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("the server stores an archipelago instead of one flat city", () => {
  it("partitions every place-owned row and migrates legacy rows to Era 1", () => {
    const sql = source(MIGRATION);
    const placeTables = ["city_placement", "city_road", "city_crisis_damage"];
    expect(placeTables).toHaveLength(3);

    for (const table of placeTables) {
      expect(sql, `${table} needs an island key`).toMatch(
        new RegExp(`alter table public\\.${table}[\\s\\S]*island_era`, "i"),
      );
      expect(sql, `${table} legacy rows need an explicit Era 1 migration`).toMatch(
        new RegExp(
          `update public\\.${table}[\\s\\S]*island_era\\s*=\\s*'prehistoric'`,
          "i",
        ),
      );
    }

    expect(sql).toMatch(/create table public\.city_island_state/i);
    expect(sql).toMatch(/primary key\s*\(student_id,\s*island_era\)/i);
    expect(sql).toMatch(/civic_material_spent/i);
    expect(sql).toMatch(/road_gold_spent/i);
    expect(sql).toMatch(/next_damage_ordinal/i);
    expect(sql).toMatch(/current_island/i);
  });

  it("scopes every mutable island collection by student and island", () => {
    const implementation = `${source(READS)}\n${source(WRITES)}`;
    for (const table of ["city_placement", "city_road", "city_crisis_damage"]) {
      const references = implementation
        .split("\n")
        .filter((line) => line.includes(`public.${table}`));
      expect(references.length, `${table} must be read and written`).toBeGreaterThanOrEqual(
        2,
      );
    }
    expect(implementation).toContain("island_era");
    expect(implementation).toContain("current_island");
    expect(implementation).toContain("city_island_state");
  });

  it("binds an island on every SQL statement that can mutate place-owned rows", () => {
    const statements = [
      ...Object.entries(CITY_WRITE_STATEMENTS),
      ...Object.entries(ISLAND_RESET_STATEMENTS),
      ...Object.entries(ECONOMY_AUTHORITY_STATEMENTS),
    ].filter(([, sql]) =>
      ["city_placement", "city_road", "city_crisis_damage"].some((table) =>
        sql.includes(`public.${table}`),
      ),
    );
    expect(statements.length).toBeGreaterThanOrEqual(9);
    for (const [name, sql] of statements) {
      expect(sql, `${name} does not name the island-owned column`).toContain("island_era");
      expect(sql, `${name} does not bind the island being changed`).toContain(":island");
    }
  });

  it("keeps the wallet append-only and era-partitioned", () => {
    const migration = source(MIGRATION);
    const original = source(posix.join(ROOT, "db/migrations/0004_civilization_state.sql"));
    expect(original).toMatch(
      /resource_grant_ledger[\s\S]*era_id public\.city_era not null/i,
    );
    expect(original).toMatch(
      /grant select, insert on public\.resource_grant_ledger to app_service/i,
    );
    expect(original).not.toMatch(
      /grant (?:update|delete)[^;]*resource_grant_ledger to app_service/i,
    );
    expect(migration).not.toMatch(
      /grant (?:update|delete)[^;]*resource_grant_ledger to app_service/i,
    );
  });
});
