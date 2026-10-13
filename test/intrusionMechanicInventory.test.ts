import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { createRelay } from "@cr/game";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const INVENTORY_DOC = "docs/superpowers/specs/crisis-reference-packs/README.md";
const COVERAGE_SOURCE = "apps/web/src/city/three/crisis/intrusion.ts";
const coverageSource = readFileSync(posix.join(resolveRepoRoot(), COVERAGE_SOURCE), "utf8");

function sourceRows(): readonly string[] {
  const markdown = readFileSync(posix.join(resolveRepoRoot(), INVENTORY_DOC), "utf8");
  return [...markdown.matchAll(/^\|\s*\*\*(M\d+)\*\*\s*\|/gm)].map(
    (match) => match[1] as string,
  );
}

function relationFields(value: object): readonly string[] {
  const forbidden = /(?:building|edge|route|adjacen|network|source_id|target_id|node_id)/i;
  return Object.keys(value).filter((field) => forbidden.test(field));
}

describe("the redesigned Intrusion still answers the complete mechanic inventory", () => {
  it("derives the same 24-row population independently from the spec and shared table", () => {
    const spec = sourceRows();
    expect(spec.length).toBeGreaterThanOrEqual(20);
    expect(new Set(spec).size).toBe(spec.length);
    const coverage = [...coverageSource.matchAll(/^\s{2}(M\d+):/gm)].map(
      (match) => match[1] as string,
    );
    expect(coverage).toHaveLength(spec.length);
    expect([...coverage].sort()).toEqual([...spec].sort());
  });

  it("gives every row a real answer and leaves no open seam", () => {
    const blocks = coverageSource
      .split(/(?=^\s{2}M\d+:)/gm)
      .filter((block) => /^\s{2}M\d+:/.test(block));
    expect(blocks).toHaveLength(sourceRows().length);
    for (const block of blocks) {
      expect(block.length).toBeGreaterThan(80);
      expect(block).not.toContain("openSeam(");
    }
  });

  it("pins the redesigned composition rather than only its size", () => {
    expect(coverageSource).toMatch(/M1:\s*elsewhere\(/);
    expect(coverageSource).toMatch(/M5:\s*ownedByTheCrisis\(/);
    expect(coverageSource).toMatch(/M10:\s*ownedByTheCrisis\(/);
    expect(coverageSource).toMatch(/M15:\s*ownedByTheCrisis\(/);
    expect(coverageSource).toMatch(/M17:\s*sharedSeam\(/);
    expect(coverageSource).toMatch(/M20:\s*elsewhere\(/);
    expect(coverageSource).toMatch(/M24:\s*elsewhere\(/);
  });

  it("declares one ordered city probe and its mounted production layer", () => {
    expect(coverageSource).toContain('read: "probing"');
    expect(coverageSource).toContain('job: "watch-a-probe"');
    expect(coverageSource).toContain('kind: "city-route"');
    expect(coverageSource).toContain('movesWhen: "breached-round"');
    expect(coverageSource).toContain('visits: "real-building"');
    expect(coverageSource).toContain(
      'componentPath: "apps/web/src/city/three/IntrusionCityLayer.tsx"',
    );
  });

  it("keeps graph-relational state unrepresentable, with the detector proved both ways", () => {
    expect(relationFields({ dark: 4, shutters_closed: 0 })).toEqual([]);
    expect(relationFields({ network_edges: [] })).toEqual(["network_edges"]);

    const relay = createRelay();
    expect(relationFields(relay)).toEqual([]);
    expect(Object.keys(relay).sort()).toEqual([
      "armed",
      "copy",
      "copy_spent_in_round",
      "dark",
      "era",
      "evidence_epoch",
      "isolations",
      "outcome",
      "phase",
      "probe_index",
      "round",
      "rounds",
      "shutters_closed",
    ]);
  });
});
