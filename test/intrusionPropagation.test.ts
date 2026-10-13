import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const root = resolveRepoRoot();

function trackedSources(): readonly string[] {
  return execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter((path) => /\.(?:ts|tsx)$/.test(path) && !path.includes(".test."));
}

/** Strip prose and literals: this guard is about representable code, not refusals in comments. */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ")
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, '""');
}

const RELATION =
  /\b(?:adjacen\w*|neighbou?r\w*|network\w*|edge_?layer|endpoint\w*|source_id|target_id|building_id|route_id|from_id|to_id)\b/i;
const CLOCK =
  /\b(?:Date\.now|performance\.now|setTimeout|setInterval|requestAnimationFrame|Math\.random)\b/;

function violations(source: string, pattern: RegExp): readonly string[] {
  return codeOnly(source)
    .split("\n")
    .map((line, index) => ({ line, index: index + 1 }))
    .filter(({ line }) => pattern.test(line))
    .map(({ line, index }) => `${index}: ${line.trim()}`);
}

describe("the redesigned Intrusion represents one relay and no relation", () => {
  const tracked = trackedSources();
  const relaySources = tracked.filter((path) =>
    /(?:^|\/)relay[^/]*\.(?:ts|tsx)$/i.test(path),
  );
  const behaviorSources = tracked.filter((path) => {
    if (relaySources.includes(path)) {
      return true;
    }
    const source = readFileSync(posix.join(root, path), "utf8");
    return /\b(?:RELAY|RelayState|RelayRenderState|CrisisOverwrittenRecord|INTRUSION_PROPAGATION|RELAY_GEOMETRY)\b/.test(
      source,
    );
  });
  const relationSources = behaviorSources.filter(
    (path) =>
      relaySources.includes(path) ||
      /(?:intrusion-questions|intrusionItems|crisis\/intrusion|intrusionMetrics|RecordVerification)\.(?:ts|tsx)$/.test(
        path,
      ),
  );
  const mechanicSources = [
    "engines/game/src/relay.ts",
    "engines/game/src/relay-tuning.ts",
    "engines/game/src/intrusion-questions.ts",
  ];

  it("derives a non-empty population from the current tree and pins its composition", () => {
    expect(tracked.length).toBeGreaterThan(400);
    expect(relaySources.length, relaySources.join(", ")).toBeGreaterThanOrEqual(8);
    expect(behaviorSources.length, behaviorSources.join(", ")).toBeGreaterThanOrEqual(15);
    expect(relationSources.length, relationSources.join(", ")).toBeGreaterThanOrEqual(12);
    for (const required of [
      "engines/game/src/relay.ts",
      "engines/game/src/relay-tuning.ts",
      "apps/web/src/relay/RelaySurface.tsx",
      "apps/web/src/city/three/RelayFixture.tsx",
      "apps/web/src/city/relayPlacement.ts",
    ]) {
      expect(relaySources, required).toContain(required);
    }
  });

  it("finds no network, adjacency, endpoint, hidden source, or second target in relay code", () => {
    const found: string[] = [];
    for (const path of relationSources) {
      for (const violation of violations(
        readFileSync(posix.join(root, path), "utf8"),
        RELATION,
      )) {
        found.push(`${path}:${violation}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("keeps the pure mechanic clockless and deterministic", () => {
    const found: string[] = [];
    for (const path of mechanicSources) {
      const source = readFileSync(posix.join(root, path), "utf8");
      for (const violation of violations(source, CLOCK)) {
        found.push(`${path}:${violation}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("proves both detectors discriminate the defect from permitted state", () => {
    expect(violations("const state = { dark: 4, shutters_closed: 2 };", RELATION)).toEqual(
      [],
    );
    expect(
      violations("const state = { network_edges: [], source_id: 'x' };", RELATION),
    ).toHaveLength(1);
    expect(violations("const now = Date.now();", CLOCK)).toHaveLength(1);
    expect(violations("const round = state.round + 1;", CLOCK)).toEqual([]);
  });
});
