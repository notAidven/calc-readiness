import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { ECONOMY_AUTHORITY_STATEMENTS } from "@cr/diagnostic-api/economy";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const ROOT = resolveRepoRoot();
const SCHEMA = [
  "db/migrations/0004_civilization_state.sql",
  "db/migrations/0011_archipelago_islands.sql",
  "db/migrations/0012_economy_authority.sql",
  "db/migrations/0016_island_unlock_authority.sql",
  "db/migrations/0017_interleaved_evidence_constraints.sql",
]
  .map((path) => readFileSync(posix.join(ROOT, path), "utf8"))
  .join("\n")
  .replace(/--[^\n]*/g, "");

function requiredPrivilege(sql: string): {
  table: string;
  privilege: "insert" | "update" | "delete";
} {
  const insert = /insert into\s+public\.(\w+)/i.exec(sql)?.[1];
  if (insert) {
    return { table: insert, privilege: "insert" };
  }
  const remove = /delete from\s+public\.(\w+)/i.exec(sql)?.[1];
  if (remove) {
    return { table: remove, privilege: "delete" };
  }
  const update = /update\s+public\.(\w+)/i.exec(sql)?.[1];
  if (update) {
    return { table: update, privilege: "update" };
  }
  throw new Error(`authority statement names no mutation: ${sql}`);
}

function granted(table: string, privilege: string): boolean {
  return [
    ...SCHEMA.matchAll(/grant\s+([\s\S]*?)\s+on\s+public\.(\w+)\s+to\s+app_service/gi),
  ]
    .filter((match) => match[2] === table)
    .some((match) =>
      (match[1] ?? "")
        .split(/,(?![^(]*\))/)
        .some((entry) => entry.trim().toLowerCase().startsWith(privilege)),
    );
}

describe("the economy authority only issues granted mutations", () => {
  it("covers the full non-empty authority statement population", () => {
    const statements = Object.entries(ECONOMY_AUTHORITY_STATEMENTS);
    expect(statements).toHaveLength(9);
    const composition: [string, ReturnType<typeof requiredPrivilege>][] = statements.map(
      ([name, sql]) => [name, requiredPrivilege(sql)],
    );
    expect(composition).toEqual([
      ["foundIsland", { table: "city_island_state", privilege: "insert" }],
      [
        "recordInterleavedClear",
        { table: "interleaved_practice_clear", privilege: "insert" },
      ],
      [
        "createIslandExamSession",
        { table: "island_unlock_exam_session", privilege: "insert" },
      ],
      [
        "recordIslandExamResponse",
        { table: "island_unlock_exam_response", privilege: "insert" },
      ],
      [
        "updateIslandExamSession",
        { table: "island_unlock_exam_session", privilege: "update" },
      ],
      [
        "recordIslandUnlockAuthority",
        { table: "island_unlock_authority", privilege: "insert" },
      ],
      ["foundTownHall", { table: "city_placement", privilege: "insert" }],
      ["landIsland", { table: "city_state", privilege: "update" }],
      ["clearRepairedDamage", { table: "city_crisis_damage", privilege: "delete" }],
    ]);
    for (const [name, requirement] of composition) {
      expect(
        granted(requirement.table, requirement.privilege),
        `${name} needs ${requirement.privilege} on public.${requirement.table}`,
      ).toBe(true);
    }
  });

  it("keeps durable interleaved evidence append-only in both directions", () => {
    expect(granted("interleaved_practice_clear", "select")).toBe(true);
    expect(granted("interleaved_practice_clear", "insert")).toBe(true);
    expect(granted("interleaved_practice_clear", "update")).toBe(false);
    expect(granted("interleaved_practice_clear", "delete")).toBe(false);
  });

  it("keeps durable island-unlock authority append-only in both directions", () => {
    expect(granted("island_unlock_authority", "select")).toBe(true);
    expect(granted("island_unlock_authority", "insert")).toBe(true);
    expect(granted("island_unlock_authority", "update")).toBe(false);
    expect(granted("island_unlock_authority", "delete")).toBe(false);
    expect(granted("island_unlock_exam_response", "select")).toBe(true);
    expect(granted("island_unlock_exam_response", "insert")).toBe(true);
    expect(granted("island_unlock_exam_response", "update")).toBe(false);
    expect(granted("island_unlock_exam_response", "delete")).toBe(false);
  });
});
