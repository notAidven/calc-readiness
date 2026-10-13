import { getNodesByScope, getProductNodes } from "@cr/skill-graph";
import { describe, inject, it } from "vitest";

import {
  DEFAULT_WALK_POLICY,
  probedNodeCount,
  resolveKnowledgeState,
  type WalkPolicy,
} from "../src/walk";
import { placementFor } from "../src/walk-engine";
import { WIDENED_SCOPE } from "./liveScope";
import {
  depthOf,
  dist,
  drawResponses,
  fmtDist,
  makeProfiles,
  mulberry32,
  type Profile,
  runWalk,
} from "./students";

/**
 * WHAT THE WIDENED DIAGNOSTIC ACTUALLY COSTS — a measurement tool, NOT a CI test.
 *
 * Fourth sibling of `probe-cost.sim.test.ts`, `policy-sweep.sim.test.ts` and
 * `era-placement.sim.test.ts`, sharing their method and their CI exclusion exactly: it
 * lives outside `engines/diagnostic/src/`, so neither the root `vitest.config.ts` nor
 * `vitest.browser.config.ts` collects it, and it is outside the package `tsconfig`
 * (`include: ["src/**\/*"]`) so `tsc --build` never sees it.
 * `engines/diagnostic/sim/vitest.sim.config.ts` is the only way to run it.
 *
 * ## Why it exists
 *
 * `#89` measured the shipped policy at a **38-item median behind a 70-item ceiling** over
 * the 62-node scope, and `Diagnostic_11_Node_Scope_Measurement.md` §4 measured **12** over
 * an 11-node candidate. The instrument the diagnostic administers has been neither for as
 * long as this file has existed: it was the content-derived scope, cut at the placement
 * horizon, at twenty nodes and then thirty-four and then forty. §7 of that note is explicit
 * that the two measured scopes must NOT be interpolated between — linear interpolation
 * understated the 11-node figure by 18%, because the marginal node's cost depends on where
 * it sits in the DAG and integer moves in `confirmThreshold` are step changes. So the
 * widened figure is measured rather than derived, and this file is where.
 *
 * **It is the 62-node scope NOW, which is the one thing this file did not expect.** Authoring
 * `POL.5` made every era fully servable, so the horizon cuts nothing and the derived scope and
 * the in-product set coincide. The two rows below are therefore the same SET measured twice,
 * and they are still worth keeping apart: the anchor walks `PRODUCT_IDS` in registry order and
 * the scope under test walks teaching order, which is a real difference to the walk (see the
 * note on {@link WIDENED_SCOPE}) and shows up as a few hundredths of a percent at the ceiling.
 * When an eleventh era is authored they will come apart again.
 *
 * It reports, per noise level:
 *
 *   1. Items answered and nodes probed — median, mean, p90, p99, max.
 *   2. **The rate at which the ceiling binds**, split the way `#89` learned to split it:
 *      how many students SPEND the whole 70-item budget, and how many are actually
 *      TRUNCATED by it (a walk that resolved its last unknown node on its last affordable
 *      item finished; it was not truncated).
 *   3. A histogram, because "median 38" and "median 38 with a second mode at the ceiling"
 *      are different instruments and the median cannot tell them apart.
 *   4. Truth accuracy, and how many already-mastered nodes a student is told to rebuild.
 *   5. The published D1 and 62-node baselines, reproduced on the same run, so a figure
 *      that has moved for a reason other than the scope change is visible immediately.
 *
 * ## The scope is written down in `./liveScope.ts`, and a CI guard checks it
 *
 * The derivation lives in `@cr/item-bank`, which depends on `@cr/diagnostic` — importing
 * it here would run that edge backwards, which is why `Diagnostic_11_Node_Scope_Measurement.md`
 * §9's cross-package probes were never landed in this directory either. So the ids are
 * mirrored in `./liveScope.ts`, and `test/diagnosticSimScopeMirror.test.ts` reads that
 * file and fails if the list and the live derivation come apart. A measurement reported
 * against a stale scope is worse than no measurement.
 *
 * ## What it cannot establish
 *
 * Ground truth is synthetic, so every figure is the instrument's self-consistency against
 * a MODEL of a student rather than placement validity against a human. And read
 * `./students.ts` before scoring any new POLICY on it: the model draws one ability cut per
 * domain, so same-depth same-domain nodes are near-perfectly correlated and a policy that
 * inferred across siblings would post a fake win. Nothing here changes the policy; it
 * measures the shipped one over a new scope.
 *
 * ## Running it
 *
 *   echo 2000 > engines/diagnostic/sim/sample-size.local
 *   npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
 *     engines/diagnostic/sim/widened-scope.sim.test.ts --disableConsoleIntercept
 *
 * `--disableConsoleIntercept` is REQUIRED: under vitest 4 a passing test's `console.log`
 * is swallowed without it, so the harness runs green and prints nothing. Always check the
 * printed `n=` before believing a sample size.
 */

const PRODUCT_IDS = getProductNodes().map((n) => n.id);
const D1_IDS = getNodesByScope("mvp").map((n) => n.id);

/**
 * Taken over the FULL 62-node in-product scope, never over the scope under test.
 * `accuracy-cohorts.sim.test.ts` records why: it sets the ability range the profiles draw
 * from, so narrowing it shifts the whole cohort and the published figures stop reproducing.
 */
const MAX_DEPTH = Math.max(...PRODUCT_IDS.map(depthOf));
const PROFILES = makeProfiles(MAX_DEPTH);

const N = Number(inject("simN") ?? 500);

const NOISE = {
  noiseless: { slip: 0, guess: 0 },
  mild: { slip: 0.1, guess: 0.05 },
  moderate: { slip: 0.15, guess: 0.1 },
} as const;

interface Outcome {
  items: number[];
  nodes: number[];
  accuracy: number[];
  /** Already-mastered nodes placed below the test-out threshold, i.e. told to rebuild. */
  rebuildsOwed: number[];
  /** Students the ceiling actually TRUNCATED (`ceiling_reached`). */
  truncatedRate: number;
  /** Students who merely spent the whole budget; a superset of the above. */
  spentBudgetRate: number;
}

const meanOf = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

function measure(
  scope: readonly string[],
  noise: { slip: number; guess: number },
  policy: WalkPolicy = DEFAULT_WALK_POLICY,
  n: number = N * 3,
): Outcome {
  const items: number[] = [];
  const nodes: number[] = [];
  const accuracy: number[] = [];
  const rebuildsOwed: number[] = [];
  let truncated = 0;
  let spent = 0;

  for (let i = 0; i < n; i++) {
    // The same seed expression the sibling harnesses use, so a cohort measured here is
    // the cohort measured there and cross-file comparisons are paired.
    const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
    const profile = PROFILES[i % PROFILES.length] as Profile;
    const known = profile.sample(rand, scope);
    const responses = drawResponses(known, scope, rand, noise.slip, noise.guess);

    const run = runWalk(scope, responses, policy);
    items.push(run.items);
    nodes.push(probedNodeCount(run.state));
    if (run.state.ceiling_reached === true) truncated += 1;
    if (run.items >= policy.maxItems) spent += 1;

    const resolved = resolveKnowledgeState(run.state);
    let ok = 0;
    let rebuilds = 0;
    for (const resolution of resolved) {
      const trulyKnown = known.has(resolution.node_id);
      if ((resolution.status === "passed") === trulyKnown) ok += 1;
      // The unit a learner feels: a skill they had, sent back to the lesson. Placement
      // >= 2 is the test-out threshold `unlockedNodeIdsFromPlacement` keys on.
      if (
        trulyKnown &&
        placementFor(resolution, run.state.probed[resolution.node_id]) < 2
      ) {
        rebuilds += 1;
      }
    }
    accuracy.push(ok / scope.length);
    rebuildsOwed.push(rebuilds);
  }

  return {
    items,
    nodes,
    accuracy,
    rebuildsOwed,
    truncatedRate: truncated / n,
    spentBudgetRate: spent / n,
  };
}

function report(label: string, out: Outcome): void {
  console.log(`\n${label}`);
  console.log("  " + fmtDist("ITEMS", dist(out.items)));
  console.log("  " + fmtDist("NODES", dist(out.nodes)));
  console.log(
    `  truth-accuracy=${(100 * meanOf(out.accuracy)).toFixed(1)}%` +
      `  mastered-told-to-rebuild=${meanOf(out.rebuildsOwed).toFixed(2)}` +
      `  spent-budget=${(100 * out.spentBudgetRate).toFixed(2)}%` +
      `  TRUNCATED=${(100 * out.truncatedRate).toFixed(2)}%`,
  );
}

/** Buckets of three items, so a second mode at the ceiling is visible. */
function histogram(items: readonly number[]): string {
  const width = 3;
  const buckets = new Map<number, number>();
  for (const value of items) {
    const bucket = Math.floor(value / width);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, count]) => {
      const lo = bucket * width;
      const share = (100 * count) / items.length;
      return `    ${String(lo).padStart(3)}-${String(lo + width - 1).padEnd(3)} ${share.toFixed(1).padStart(5)}%  ${"#".repeat(Math.round(share))}`;
    })
    .join("\n");
}

describe("the widened diagnostic scope, measured", () => {
  it("prints the mirrored scope, so a stale mirror is visible in the output", () => {
    console.log(
      `\nSCOPE UNDER TEST: ${WIDENED_SCOPE.length} nodes over ` +
        `${new Set(WIDENED_SCOPE.map((id) => id.split(".")[0])).size} node families\n  ` +
        WIDENED_SCOPE.join(" "),
    );
    console.log(
      `  of ${PRODUCT_IDS.length} in-product nodes; D1 is ${D1_IDS.length} of them`,
    );
    // Not `JSON.stringify`: `foundationDomainSpan` is `Infinity` (the stage is disabled)
    // and JSON prints that as `null`, which reads as "unset" rather than "off".
    console.log(
      `  policy: maxItems=${DEFAULT_WALK_POLICY.maxItems}` +
        ` confirmScopeFraction=${DEFAULT_WALK_POLICY.confirmScopeFraction}` +
        ` perDomainTarget=${DEFAULT_WALK_POLICY.perDomainTarget}` +
        ` foundationDomainSpan=${DEFAULT_WALK_POLICY.foundationDomainSpan}`,
    );
  });

  it("items and nodes across noise levels", () => {
    console.log(`\n=== WIDENED SCOPE (${WIDENED_SCOPE.length} nodes), n=${N * 3} ===`);
    for (const [name, noise] of Object.entries(NOISE)) {
      report(`widened / ${name}`, measure(WIDENED_SCOPE, noise));
    }
  });

  it("the item histogram at mild noise", () => {
    const out = measure(WIDENED_SCOPE, NOISE.mild);
    console.log(`\n=== ITEM DISTRIBUTION, widened scope, mild noise, n=${N * 3} ===`);
    console.log(histogram(out.items));
    const ceiling = DEFAULT_WALK_POLICY.maxItems;
    const atCeiling = out.items.filter((value) => value >= ceiling).length;
    console.log(
      `  ceiling=${ceiling}: ${atCeiling} of ${out.items.length} students reach it ` +
        `(${((100 * atCeiling) / out.items.length).toFixed(2)}%), ` +
        `${(100 * out.truncatedRate).toFixed(2)}% are truncated by it`,
    );
    console.log(`  worst case observed: ${dist(out.items).max} items`);
  });

  it("the published baselines, reproduced on this run", () => {
    // Anchors. D1 is recorded at 7/12/15/18 items and the 62-node scope at 38/62/70/70
    // (`Diagnostic_11_Node_Scope_Measurement.md` §8). A figure that has moved here has
    // moved for a reason other than the scope change, and every number above is suspect
    // until that is explained.
    console.log(`\n=== BASELINE ANCHORS, mild noise, n=${N * 3} ===`);
    report("D1 (6 nodes) — recorded 7 / 12 / 15 / 18", measure(D1_IDS, NOISE.mild));
    report(
      "full (62 nodes) — recorded 38 / 62 / 70 / 70",
      measure(PRODUCT_IDS, NOISE.mild),
    );
  });
});
