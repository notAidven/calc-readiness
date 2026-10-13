import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const MIGRATION = posix.join(
  resolveRepoRoot(),
  "db/migrations/0006_civic_placement_ids.sql",
);

function migrationSource(): string {
  expect(
    existsSync(MIGRATION),
    "a structured civic id cannot pass 0004's colon-free constraint without a migration",
  ).toBe(true);
  return existsSync(MIGRATION) ? readFileSync(MIGRATION, "utf8") : "";
}

describe("structured civic placement ids stay narrow at the database boundary", () => {
  it("widens placement ids only for well-formed civic rows", () => {
    const sql = migrationSource();

    expect(sql).toMatch(/drop constraint city_placement_id_is_event_id_safe/i);
    expect(sql).toMatch(/kind\s*=\s*'civic'/i);
    expect(sql).toMatch(/placement_id\s*~\s*'\^civic:/i);
    expect(sql).toMatch(/kind\s+in\s*\('skill',\s*'town_hall'\)/i);
    expect(sql).toMatch(/position\(':' in placement_id\)\s*=\s*0/i);
  });

  it("widens crisis subjects only for civic suspension rows", () => {
    const sql = migrationSource();

    expect(sql).toMatch(/drop constraint city_crisis_damage_subject_is_event_id_safe/i);
    expect(sql).toMatch(/subject_kind\s*=\s*'civic'/i);
    expect(sql).toMatch(/subject\s*~\s*'\^civic:/i);
    expect(sql).toMatch(/subject_kind\s+in\s*\('building',\s*'ground'\)/i);
    expect(sql).toMatch(/position\(':' in subject\)\s*=\s*0/i);
  });
});
