import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { PLAGUE_GRAPH } from "@cr/game";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const repoRoot = resolveRepoRoot();

function sources(): string[] {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\0")
    .filter(
      (path) =>
        /\.(ts|tsx)$/.test(path) &&
        !/\.test\.(ts|tsx)$/.test(path) &&
        !path.includes("/output/"),
    );
}

function code(path: string): string {
  return readFileSync(posix.join(repoRoot, path), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function outbreakSources(): string[] {
  return sources()
    .filter((path) =>
      /\b(PlagueState|plagueRouteViews|PlagueNodeView|PlagueWorld)\b/.test(code(path)),
    )
    .sort();
}

const EXPECTED_RUNTIME = [
  "apps/web/src/city/three/PlagueInCity.tsx",
  "apps/web/src/plague/PlagueSurface.tsx",
  "apps/web/src/plague/careHouseScene.ts",
  "apps/web/src/plague/plaguePersistence.ts",
  "apps/web/src/plague/plagueWorld.ts",
  "engines/game/src/plague-mechanics.ts",
  "engines/game/src/plague.ts",
  "services/diagnostic-api/src/plagueState.ts",
] as const;

const RETIRED_COUNTER_MODEL = [
  /\bstarting_patients\b/,
  /\bstarting_supplies\b/,
  /\bpatient_treated\b/,
  /\bsupply_prepared\b/,
] as const;

const CLOCK = [
  /\bsetInterval\b/,
  /\bsetTimeout\b/,
  /\bDate\.now\b/,
  /\bnew Date\b/,
  /\bperformance\.now\b/,
  /\brequestAnimationFrame\b/,
  /\bMath\.random\b/,
] as const;

describe("the Plague is a bounded route crisis on the live city", () => {
  it("derives and names the complete runtime population", () => {
    const population = outbreakSources();
    expect(population.length).toBeGreaterThanOrEqual(EXPECTED_RUNTIME.length);
    for (const path of EXPECTED_RUNTIME) {
      expect(population, path).toContain(path);
    }
  });

  it("owns exactly five places and five authored routes", () => {
    expect(PLAGUE_GRAPH.nodes).toHaveLength(5);
    expect(PLAGUE_GRAPH.routes).toHaveLength(5);
    expect(new Set(PLAGUE_GRAPH.nodes.map((node) => node.id)).size).toBe(5);
    expect(new Set(PLAGUE_GRAPH.routes.map((route) => route.id)).size).toBe(5);
    const nodeIds = new Set(PLAGUE_GRAPH.nodes.map((node) => node.id));
    for (const route of PLAGUE_GRAPH.routes) {
      expect(nodeIds, route.id).toContain(route.from);
      expect(nodeIds, route.id).toContain(route.to);
      expect(route.from, route.id).not.toBe(route.to);
    }
  });

  it("contains none of the detached patient-and-supply counter model", () => {
    const violations: string[] = [];
    for (const path of outbreakSources()) {
      const source = code(path);
      for (const token of RETIRED_COUNTER_MODEL) {
        if (token.test(source)) {
          violations.push(`${path}: ${token.source}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("has no elapsed-time or unseeded transition in any state-owning source", () => {
    const violations: string[] = [];
    for (const path of outbreakSources()) {
      const source = code(path);
      for (const token of CLOCK) {
        if (token.test(source)) {
          violations.push(`${path}: ${token.source}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("proves both absence detectors fail on their own defects", () => {
    for (const [token, sample] of [
      [RETIRED_COUNTER_MODEL[0], "const starting_patients = 2;"],
      [RETIRED_COUNTER_MODEL[1], "const starting_supplies = 2;"],
      [CLOCK[0], "setInterval(turn, 1000);"],
      [CLOCK[1], "setTimeout(turn, 1000);"],
      [CLOCK[2], "const seed = Date.now();"],
      [CLOCK[3], "const stamp = new Date();"],
      [CLOCK[4], "const start = performance.now();"],
      [CLOCK[5], "requestAnimationFrame(turn);"],
      [CLOCK[6], "const roll = Math.random();"],
    ] as const) {
      expect(token.test(sample), `${token.source} did not catch ${sample}`).toBe(true);
    }
  });
});
