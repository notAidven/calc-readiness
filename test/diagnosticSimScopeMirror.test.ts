import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";

import { DIAGNOSTIC_WALK_SCOPE } from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **THE MEASUREMENT HARNESSES MEASURE THE SCOPE THAT SHIPS.**
 *
 * `engines/diagnostic/sim/widened-scope.sim.test.ts` produces the item distribution the
 * widened diagnostic is judged on — median, p90, worst case, and how often the 70-item
 * ceiling binds — and `tail-policy.sim.test.ts` prices every candidate probe policy
 * against that same instrument. Neither can import the derivation those figures are
 * about: the scope is derived in `@cr/item-bank`, `@cr/item-bank` depends on
 * `@cr/diagnostic`, and an import from that engine's own directory would run the edge
 * backwards. (That is the same reason `Diagnostic_11_Node_Scope_Measurement.md` §9's
 * cross-package probes were never landed there.) So `sim/liveScope.ts` writes the node ids
 * down for both of them, and this reads them back.
 *
 * The failure it prevents is specifically a QUOTABLE one. A harness measuring a stale
 * scope does not go red; it prints a plausible distribution which then gets written into a
 * PR description, a doc, and a decision. Nothing downstream of that number can tell it was
 * taken over a different instrument.
 *
 * It lives in `test/` because the subject is a file on disk rather than a package's
 * behaviour, and because this project is the one whose tsconfig declares `types: ["node"]`
 * — every other project deliberately excludes its source-reading sweeps from `tsc` so that
 * `node:fs` cannot typecheck inside a package whose contract is zero I/O.
 */

const repoRoot = resolveRepoRoot();
const SIM_DIR = "engines/diagnostic/sim";
const MIRROR = `${SIM_DIR}/liveScope.ts`;

/**
 * **The population is the DIRECTORY, not a list somebody remembered to extend.**
 *
 * It used to be a written-down pair of harnesses, which is a population defined by which
 * files happened to exist when the guard was written. The defect it exists to prevent —
 * a harness reporting a plausible distribution taken over a stale scope — is a property
 * of what a harness DOES, and a harness added tomorrow that writes its own copy of the 62
 * ids does exactly that while sitting outside a hand-maintained list. So every sim
 * harness is in the population, and the ones that legitimately owe nothing are named
 * below with their reason.
 */
function simHarnesses(): string[] {
  return readdirSync(posix.join(repoRoot, SIM_DIR))
    .filter((name) => name.endsWith(".sim.test.ts"))
    .sort()
    .map((name) => `${SIM_DIR}/${name}`);
}

/**
 * Harnesses that owe the mirror nothing, each with the reason it does not.
 *
 * Every one derives its scope from `getProductNodes()` — the registry itself — so there is
 * no transcription for the live derivation to come apart from. That is a different claim
 * from "it does not report on 62 nodes", and it is the one that matters: a harness reading
 * the registry cannot go stale, whatever it measures.
 *
 * Asserted in BOTH directions below, so the list can neither outlive the files it names
 * nor go on excusing a harness that has started transcribing ids after all.
 */
const DERIVES_FROM_THE_REGISTRY: Readonly<Record<string, string>> = {
  [`${SIM_DIR}/accuracy-cohorts.sim.test.ts`]: "scopes off getProductNodes()",
  [`${SIM_DIR}/checker-blocker.sim.test.ts`]: "scopes off getProductNodes()",
  [`${SIM_DIR}/era-placement.sim.test.ts`]: "scopes off getProductNodes()",
  [`${SIM_DIR}/policy-sweep.sim.test.ts`]: "scopes off getProductNodes()",
  // `students.ts` records why this one is deliberately its own implementation: it is the
  // independent reproduction of the recorded baseline, and two harnesses that agree are
  // evidence where one used twice is not. It still derives its scope from the registry.
  [`${SIM_DIR}/probe-cost.sim.test.ts`]:
    "independent reproduction; scopes off getProductNodes()",
};

function sourceOf(path: string): string {
  return readFileSync(posix.join(repoRoot, path), "utf8");
}

/** The ids the mirror declares, in declaration order. */
function mirroredScope(source: string): string[] {
  const block = /export const WIDENED_SCOPE: readonly string\[\] = \[([\s\S]*?)\];/.exec(
    source,
  );
  if (!block) {
    throw new Error(
      `${MIRROR} no longer declares WIDENED_SCOPE as a literal array. This guard reads it ` +
        `from source; teach it the new shape rather than deleting it.`,
    );
  }
  return Array.from(block[1]?.matchAll(/"([^"]+)"/g) ?? [], (match) => match[1] as string);
}

describe("the widened-scope harness and the shipped instrument", () => {
  it("reads a real list, so the equality below is not over two empty arrays", () => {
    // A containment or equality assertion holds trivially over nothing, so the floor comes
    // first: a regex that silently stopped matching is the way this guard would go quiet.
    const mirrored = mirroredScope(sourceOf(MIRROR));
    expect(mirrored.length, `${MIRROR} declared no node ids`).toBeGreaterThanOrEqual(20);
    expect(
      DIAGNOSTIC_WALK_SCOPE.length,
      "the live scope resolved to nothing",
    ).toBeGreaterThanOrEqual(20);
  });

  it("mirrors the live scope exactly, in the same order", () => {
    // Order and not just membership: `resolveKnowledgeState` walks `state.scope` in the
    // order it is given, so a mirror in a different order measures a slightly different
    // thing and would be reported as if it had not.
    expect(
      mirroredScope(sourceOf(MIRROR)),
      `${MIRROR} declares a different node set than the diagnostic administers, so the ` +
        `item distributions reported off it do not describe the shipped instrument`,
    ).toEqual([...DIAGNOSTIC_WALK_SCOPE]);
  });

  it("every harness that reports on the live scope reads THIS mirror", () => {
    // The mirror is only worth guarding if the figures come off it. A harness that
    // reverted to its own copy of the ids would leave this file correct and the quoted
    // number wrong, which is the whole failure mode above.
    const harnesses = simHarnesses();
    const mirrored = harnesses.filter((h) => !(h in DERIVES_FROM_THE_REGISTRY));
    // Two floors, because a derived population can be derived wrong and a containment
    // check holds over nothing: the directory has to hold harnesses, and the exemption
    // list must not have swallowed them.
    expect(harnesses.length, "no sim harnesses found at all").toBeGreaterThanOrEqual(7);
    expect(
      mirrored.length,
      "every sim harness is exempt, so this sweep asserts nothing",
    ).toBeGreaterThanOrEqual(3);

    for (const harness of mirrored) {
      const source = sourceOf(harness);
      expect(source, `${harness} does not import the mirror`).toContain(
        'from "./liveScope"',
      );
      expect(source, `${harness} declares its own copy of the scope`).not.toMatch(
        /const WIDENED_SCOPE: readonly string\[\] = \[/,
      );
    }
  });

  it("the exemptions still describe files that still qualify for them", () => {
    // The direction that stops an exemption becoming permanent by neglect. An entry whose
    // file was renamed would sit here forever excusing nothing; an entry that has started
    // reading the mirror is no longer an exception and belongs in the swept set, where the
    // assertion above can bite it.
    const harnesses = new Set(simHarnesses());
    const exempt = Object.keys(DERIVES_FROM_THE_REGISTRY);
    expect(exempt.length, "the exemption list is empty").toBeGreaterThanOrEqual(1);
    for (const harness of exempt) {
      expect(harnesses.has(harness), `${harness} is exempted but no longer exists`).toBe(
        true,
      );
      const source = sourceOf(harness);
      expect(
        source,
        `${harness} is exempted as deriving its scope from the registry, but no longer ` +
          `calls getProductNodes()`,
      ).toContain("getProductNodes(");
      expect(
        source,
        `${harness} now imports the mirror, so it is not an exception — remove it from ` +
          `DERIVES_FROM_THE_REGISTRY and let the sweep cover it`,
      ).not.toContain('from "./liveScope"');
    }
  });

  it("is still excluded from CI collection, so it cannot be run by accident", () => {
    // The harnesses run ~100k walks each. Their exclusion is by PLACEMENT — outside
    // `engines/diagnostic/src/` — rather than by an ignore rule, which is easy to undo by
    // moving the file. Asserted here so the move is caught with the reason attached.
    for (const harness of [MIRROR, ...simHarnesses()]) {
      expect(harness.startsWith("engines/diagnostic/sim/"), harness).toBe(true);
    }
    const rootConfig = readFileSync(posix.join(repoRoot, "vitest.config.ts"), "utf8");
    expect(rootConfig).toContain('"engines/**/src/**/*.test.ts"');
    expect(rootConfig).not.toContain("engines/**/sim/");
  });
});
