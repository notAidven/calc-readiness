import { execFileSync } from "node:child_process";
import { posix } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const repoRoot = resolveRepoRoot();

function trackedPlagueSources(): string[] {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\0")
    .filter(
      (path) =>
        path.startsWith("apps/web/src/plague/") &&
        /\.(ts|tsx)$/.test(path) &&
        !/\.test\.(ts|tsx)$/.test(path),
    )
    .sort();
}

describe("the Plague directory is only the Care House surface", () => {
  it("contains the complete production source set in both directions", () => {
    const expected = [
      "apps/web/src/plague/PlagueEntryChip.tsx",
      "apps/web/src/plague/PlagueRoute.tsx",
      "apps/web/src/plague/PlagueSurface.tsx",
      "apps/web/src/plague/careHouseScene.ts",
      "apps/web/src/plague/plagueItems.ts",
      "apps/web/src/plague/plaguePersistence.ts",
      "apps/web/src/plague/plagueWorld.ts",
    ];
    const found = trackedPlagueSources();
    expect(found.length).toBeGreaterThanOrEqual(7);
    expect(found).toEqual(expected.sort());
    for (const path of found) {
      expect(posix.basename(path)).not.toMatch(/Board|Marks|Topology|TownList|StatusStrip/);
    }
  });
});
