import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * INV-COS-1 — the ONE-WAY invariant (resource spec §5.1, §11.1). Nothing economic
 * may gate learning, so no learning-path module may import `@cr/economy`. The
 * economy READS progression to decide grants; the code edge points progression →
 * economy, never the reverse.
 *
 * This is the "cheap dependency check" the plan (P7) makes a real test: it scans
 * the learning-path source trees and asserts none of them import `@cr/economy`.
 * The economy is consumed only by the app/adapter layer (`apps/web`), which is not
 * a learning-path module.
 */

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Source roots that MUST NOT depend on the economy (the learning path). */
const LEARNING_PATH_ROOTS = [
  "packages/shared-mastery-service/src",
  "engines/diagnostic/src",
  "engines/lesson/src",
  "engines/game/src", // holds isNeighborhoodReady + the storm/checkpoint gates
  "packages/skill-graph/src",
  "packages/item-bank/src",
];

const ECONOMY_IMPORT = /@cr\/economy/;

function collectTsFiles(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // a root that does not exist is skipped (asserted below in aggregate)
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out = out.concat(collectTsFiles(full));
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("INV-COS-1 — economy is never imported by a learning-path module", () => {
  it("no learning-path source references @cr/economy", () => {
    let scanned = 0;
    const offenders: string[] = [];
    for (const root of LEARNING_PATH_ROOTS) {
      const files = collectTsFiles(join(REPO_ROOT, root));
      scanned += files.length;
      for (const file of files) {
        if (ECONOMY_IMPORT.test(readFileSync(file, "utf8"))) {
          offenders.push(file.replace(`${REPO_ROOT}/`, ""));
        }
      }
    }
    // Guard against the check silently scanning nothing (a path typo).
    expect(scanned).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});
