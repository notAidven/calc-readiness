import { readFileSync } from "node:fs";
import { posix } from "node:path";
import * as game from "@cr/game";
import { PLAGUE_MECHANICS } from "@cr/game";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const repoRoot = resolveRepoRoot();

function inventoryRows(): { readonly id: string; readonly mechanic: string }[] {
  const markdown = readFileSync(
    posix.join(repoRoot, "docs/superpowers/specs/crisis-reference-packs/README.md"),
    "utf8",
  );
  return [...markdown.matchAll(/^\|\s*\*\*(M\d+)\*\*\s*\|\s*(.+?)\s*\|/gm)].map(
    (match) => ({
      id: match[1] as string,
      mechanic: (match[2] as string).replace(/\*\*/g, "").trim(),
    }),
  );
}

describe("the Care House answers the complete crisis mechanic inventory", () => {
  it("covers the source table in both directions", () => {
    const source = inventoryRows();
    expect(source.length).toBeGreaterThanOrEqual(20);
    expect(new Set(source.map((row) => row.id)).size).toBe(source.length);
    expect(PLAGUE_MECHANICS.map((row) => row.id).sort()).toEqual(
      source.map((row) => row.id).sort(),
    );
    for (const row of source) {
      expect(PLAGUE_MECHANICS.find((entry) => entry.id === row.id)?.mechanic).toBe(
        row.mechanic,
      );
    }
  });

  it("gives every row a substantive, internally consistent answer", () => {
    for (const row of PLAGUE_MECHANICS) {
      expect(row.instance.length, row.id).toBeGreaterThan(120);
      if (row.answer === "no_analogue") {
        expect(row.instance, row.id).toMatch(/because/i);
        expect(row.engine_symbols, row.id).toEqual([]);
        expect(row.next, row.id).toBeNull();
      }
      if (row.answer === "deferred") {
        expect(row.next, row.id).not.toBeNull();
      }
    }
  });

  it("points every built row at real engine exports", () => {
    const exported = new Set(Object.keys(game));
    let checked = 0;
    for (const row of PLAGUE_MECHANICS.filter((entry) => entry.answer === "built")) {
      expect(
        row.engine_symbols.length,
        `${row.id} names no implementation`,
      ).toBeGreaterThan(0);
      for (const symbol of row.engine_symbols) {
        expect(exported, `${row.id}: ${symbol}`).toContain(symbol);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(12);
  });

  it("names the replacement's load-bearing composition", () => {
    const answer = (id: string) => PLAGUE_MECHANICS.find((row) => row.id === id)?.answer;
    expect(answer("M8")).toBe("built");
    expect(answer("M9")).toBe("built");
    expect(answer("M10")).toBe("built");
    expect(answer("M11")).toBe("built");
    expect(answer("M14")).toBe("built");
    expect(answer("M17")).toBe("no_analogue");
    expect(answer("M18")).toBe("no_analogue");
    expect(answer("M20")).toBe("no_analogue");
    expect(answer("M22")).toBe("built");
    expect(answer("M24")).toBe("built");
  });
});
