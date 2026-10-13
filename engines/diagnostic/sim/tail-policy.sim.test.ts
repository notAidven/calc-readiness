import { ERA_SEQUENCE, getNodesByScope, getProductNodes } from "@cr/skill-graph";
import { describe, inject, it } from "vitest";

import { confirmThresholdFor } from "../src/adjudicator";
import {
  DEFAULT_WALK_POLICY,
  probedNodeCount,
  resolveKnowledgeState,
  robustPassNodeIds,
  STATIC_CONSEQUENCE_WALK_POLICY,
  scopeConsequence,
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
 * WHAT IT COSTS TO CUT THE TAIL — a measurement tool, NOT a CI test.
 *
 * Fifth sibling of `probe-cost.sim.test.ts`, `policy-sweep.sim.test.ts`,
 * `era-placement.sim.test.ts` and `widened-scope.sim.test.ts`, sharing their method and
 * their CI exclusion exactly: it lives outside `engines/diagnostic/src/`, so neither the
 * root `vitest.config.ts` nor `vitest.browser.config.ts` collects it, and it is outside
 * the package `tsconfig` (`include: ["src/**\/*"]`) so `tsc --build` never sees it.
 * `engines/diagnostic/sim/vitest.sim.config.ts` is the only way to run it.
 *
 * ## The question
 *
 * `#89` rebuilt the probe policy to a **38-item median behind a 70-item ceiling** over
 * the 62-node scope, and that median is fine. The TAIL is not: p90 62, p99 pinned to the
 * ceiling, and roughly one learner in seventy truncated before the instrument has
 * finished measuring them. This prices the candidate ways of cutting it, and — because a
 * single number cannot be argued with — reports each candidate as a CURVE against the
 * two things it can cost:
 *
 *   1. **Truth accuracy**, the aggregate.
 *   2. **Already-mastered skills sent back for review**, which is the failure a learner
 *      and a demo audience actually feel. It is tracked separately because the two do
 *      not move together. The shipped trade is recorded in
 *      `docs/superpowers/specs/2026-08-01-diagnostic-placement-accuracy.md` §3.2 as
 *      **95.6% with 2.417 such skills per session** at the 62-node scope, against 0.332
 *      real gaps advanced past — a 7.3:1 fail-closed ratio that the same table shows
 *      collapsing from 39:1 as the scope widens.
 *
 * The two directions of error are reported side by side (`sent-back` against
 * `false-pass`), because INV-DIAG-7 asks the instrument to be biased toward the first,
 * and a policy can buy accuracy by trading the bias away without the aggregate saying so.
 *
 * ## What it cannot establish
 *
 * Ground truth is synthetic. Read `./students.ts` before scoring any new POLICY here:
 * the model draws one ability cut per domain, so same-depth same-domain nodes are
 * near-perfectly correlated and a policy that inferred across SIBLINGS would post a fake
 * win. Every candidate below is DAG-structural — prerequisite closure and dependent cone
 * only — and none of them changes what is inferred except `inferOnMajorityPass`, which
 * still only credits a prerequisite closure.
 *
 * ## Running it
 *
 *   echo 2000 > engines/diagnostic/sim/sample-size.local
 *   npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
 *     engines/diagnostic/sim/tail-policy.sim.test.ts --disableConsoleIntercept
 *
 * `--disableConsoleIntercept` is REQUIRED: under vitest 4 a passing test's `console.log`
 * is swallowed without it, so the harness runs green and prints nothing. Always check the
 * printed `n=` before believing a sample size. A full run at n=6000 is a few minutes.
 */

const PRODUCT_IDS = getProductNodes().map((n) => n.id);
const D1_IDS = getNodesByScope("mvp").map((n) => n.id);

/**
 * Taken over the FULL 62-node in-product scope, never over the scope under test —
 * `accuracy-cohorts.sim.test.ts` records why: it sets the ability range the profiles draw
 * from, so narrowing it shifts the whole cohort and the published figures stop reproducing.
 */
const MAX_DEPTH = Math.max(...PRODUCT_IDS.map(depthOf));
const PROFILES = makeProfiles(MAX_DEPTH);
const N = Number(inject("simN") ?? 500);
const MILD = { slip: 0.1, guess: 0.05 };

/**
 * The scope the instrument would administer once the sixth era is fully authored: today's
 * scope plus the seventh era's nodes. Derived from `ERA_SEQUENCE` rather than written
 * down, so it follows the eras rather than a node count — `diagnostic-scope.ts`'s
 * `placementHorizon` is the live derivation this mirrors, and the harness cannot import it
 * without running the package dependency edge backwards.
 *
 * It is a PROJECTION and is one node wider than the derivation would produce: era
 * membership admits `POL.5`, which has no authored content of any kind and so would not be
 * in `diagnosticServableScope()` to be admitted. The extra node is a leaf and moves
 * nothing, but the count printed below is 41 where the derived scope would be 40, and a
 * reader comparing the two should know which is which.
 */
const ERA7_NODES = ERA_SEQUENCE.slice(0, 7).flatMap((era) => [...era.nodes]);
const NEXT_ERA_SCOPE: readonly string[] = [
  ...WIDENED_SCOPE,
  ...ERA7_NODES.filter((id) => !WIDENED_SCOPE.includes(id)),
];

/**
 * Every candidate is built over the PRE-CUT policy, not over `DEFAULT_WALK_POLICY`.
 *
 * This harness priced the tail cut while the cut was still off, so spreading over
 * the shipped default was the same thing as spreading over the static rules. On
 * 2026-08-04 the recommendation landed and `DEFAULT_WALK_POLICY` moved, and every
 * row below would silently have re-based onto it: "shipped (never)" would have
 * been the recommendation measured against itself, and the baseline anchors would
 * have printed the post-cut distribution beside a label reading "recorded
 * 38 / 62 / 70 / 70". A sweep has to name its own origin.
 */
const over = (o: Partial<WalkPolicy>): WalkPolicy => ({
  ...STATIC_CONSEQUENCE_WALK_POLICY,
  ...o,
});
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

/**
 * THE DIAL. `livePassClosure` with the item count at which it takes effect swept from
 * "never" down to "from the first item". Every setting is a `WalkPolicy` the engine
 * already accepts, so nothing here is a reimplementation of the instrument — the same
 * `startWalk` / `recordScoredOutcome` the product runs, under a different setting.
 */
const DIAL: readonly [string, WalkPolicy][] = [
  ["pre-cut (#89, never)", STATIC_CONSEQUENCE_WALK_POLICY],
  ...([45, 35, 30, 25, 20, 15, 0] as const).map((from): [string, WalkPolicy] => [
    `live PASS from ${from}${from === DEFAULT_WALK_POLICY.liveConsequenceFrom ? " <- SHIPPED" : ""}`,
    over({ livePassClosure: true, liveConsequenceFrom: from }),
  ]),
];

/** The other three levers, each measured on its own so the dial can be read against them. */
const ALTERNATIVES: readonly [string, WalkPolicy][] = [
  ["live FAIL cone", over({ liveFailCone: true })],
  ["confirmBudget=25", over({ confirmBudget: 25 })],
  ["infer on 2-of-3 pass", over({ inferOnMajorityPass: true })],
  ["re-tune fraction 12/62", over({ confirmScopeFraction: 12 / 62 })],
  ["re-tune fraction 8/62", over({ confirmScopeFraction: 8 / 62 })],
];

/** The subset carried across every scope, where the point is neutrality rather than shape. */
const ACROSS_SCOPES: readonly [string, WalkPolicy][] = [
  ["pre-cut (#89)", STATIC_CONSEQUENCE_WALK_POLICY],
  ["SHIPPED (live PASS from 20)", DEFAULT_WALK_POLICY],
  ["live PASS from 0", over({ livePassClosure: true, liveConsequenceFrom: 0 })],
  ["infer on 2-of-3 pass", over({ inferOnMajorityPass: true })],
  ["re-tune fraction 12/62", over({ confirmScopeFraction: 12 / 62 })],
];

interface Outcome {
  items: number[];
  nodes: number[];
  accuracy: number[];
  /** Skills the learner HAS, placed below the test-out bar: sent back to the lesson. */
  sentBack: number[];
  /** Skills the learner does NOT have, placed at or above it: an uncovered gap. */
  falsePass: number[];
  /**
   * Nodes whose measured pass was ROBUST — a clean 2/2 — and which resolution carried
   * through to `passed`. `completion-report.ts` names exactly this list to the learner at
   * the end of the game, so it is not a diagnostic-internal number: a policy that decides
   * more nodes on one item has fewer skills to name, and that shows up nowhere in
   * accuracy.
   */
  named: number[];
  /** Sessions that name at least one skill. A ceremony with none is the failure that shows. */
  namedAnyRate: number;
  /** Students the ceiling actually TRUNCATED (`ceiling_reached`). */
  truncatedRate: number;
  /** Students who merely spent the whole budget; a superset of the above. */
  spentBudgetRate: number;
}

function measure(
  policy: WalkPolicy,
  scope: readonly string[] = PRODUCT_IDS,
  noise = MILD,
  n: number = N * 3,
): Outcome {
  const items: number[] = [];
  const nodes: number[] = [];
  const accuracy: number[] = [];
  const sentBack: number[] = [];
  const falsePass: number[] = [];
  const named: number[] = [];
  let namedAny = 0;
  let truncated = 0;
  let spent = 0;

  for (let i = 0; i < n; i++) {
    // The same seed expression every sibling harness uses, so a cohort measured here is
    // the cohort measured there and every comparison below is paired.
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
    let back = 0;
    let through = 0;
    for (const resolution of resolved) {
      const trulyKnown = known.has(resolution.node_id);
      if ((resolution.status === "passed") === trulyKnown) ok += 1;
      // Both directions read the same number the product acts on: placement >= 2 is the
      // bar `unlockedNodeIdsFromPlacement` keys on, so these are exact complements.
      const placed = placementFor(resolution, run.state.probed[resolution.node_id]) >= 2;
      if (trulyKnown && !placed) back += 1;
      if (!trulyKnown && placed) through += 1;
    }
    accuracy.push(ok / scope.length);
    sentBack.push(back);
    falsePass.push(through);
    // `completion-report.ts` intersects the robust passes with the resolved `passed` set
    // before naming any of them; this counts the same intersection.
    const passedSet = new Set(
      resolved.filter((r) => r.status === "passed").map((r) => r.node_id),
    );
    const namedHere = robustPassNodeIds(run.state).filter((id) => passedSet.has(id));
    named.push(namedHere.length);
    if (namedHere.length > 0) namedAny += 1;
  }

  return {
    items,
    nodes,
    accuracy,
    sentBack,
    falsePass,
    named,
    namedAnyRate: namedAny / n,
    truncatedRate: truncated / n,
    spentBudgetRate: spent / n,
  };
}

function curve(label: string, out: Outcome): string {
  const di = dist(out.items);
  const dn = dist(out.nodes);
  return (
    `${label.padEnd(26)} med=${String(di.med).padStart(3)} p90=${String(di.p90).padStart(3)} ` +
    `p99=${String(di.p99).padStart(3)} max=${String(di.max).padStart(3)} ` +
    `| nodes med=${String(dn.med).padStart(2)} ` +
    `| acc=${(100 * mean(out.accuracy)).toFixed(1)}% ` +
    `sent-back=${mean(out.sentBack).toFixed(2)} ` +
    `false-pass=${mean(out.falsePass).toFixed(2)} ` +
    `named=${mean(out.named).toFixed(2)} (${(100 * out.namedAnyRate).toFixed(0)}% of sessions) ` +
    `ceiling=${(100 * out.truncatedRate).toFixed(2)}%`
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

describe("cutting the diagnostic's tail", () => {
  it("the published baselines, reproduced on this run", () => {
    // The anchors. D1 is recorded at 7/12/15/18 items and the 62-node scope at
    // 38/62/70/70 (`Diagnostic_11_Node_Scope_Measurement.md` §8). If either has moved,
    // this harness has drifted off the record and every figure below means nothing.
    //
    // Measured under the PRE-CUT policy, because that is what those figures were
    // recorded under. Reading them off today's default would compare the tail cut
    // against itself and reproduce nothing.
    console.log(`\n=== BASELINE ANCHORS, PRE-CUT (#89) policy, mild noise, n=${N * 3} ===`);
    for (const [label, scope] of [
      ["D1 (6) — recorded 7 / 12 / 15 / 18", D1_IDS],
      ["full (62) — recorded 38 / 62 / 70 / 70", PRODUCT_IDS],
    ] as const) {
      const out = measure(STATIC_CONSEQUENCE_WALK_POLICY, scope);
      console.log(`\n${label}`);
      console.log(`  ${fmtDist("ITEMS", dist(out.items))}`);
      console.log(`  ${fmtDist("NODES", dist(out.nodes))}`);
      console.log(
        `  truth-accuracy=${(100 * mean(out.accuracy)).toFixed(1)}%` +
          `  sent-back=${mean(out.sentBack).toFixed(2)}` +
          `  spent-budget=${(100 * out.spentBudgetRate).toFixed(2)}%` +
          `  TRUNCATED=${(100 * out.truncatedRate).toFixed(2)}%`,
      );
    }
  });

  it("where the tail comes from: it is the STRONG learner, not the weak one", () => {
    // The finding the candidates are chosen against. §4.2 of the ratified amendment
    // claims the weakest learner exits fastest, and that is true; the corollary nobody
    // wrote down is that the strongest pays the most, because a deep node's prerequisite
    // closure is large, so almost every pass is consequential and buys a confirming item.
    console.log(`\n=== TAIL ANATOMY, 62-node, shipped, mild, n=${N * 3} ===`);

    // What the confirmation rule is quantified over, and the reason a threshold of 12 is a
    // cliff rather than a setting: nothing in the graph has a closure that large, so 12
    // does not tune pass-side confirmation, it switches it off. Printed rather than
    // asserted because this file measures and does not judge.
    const closures = scopeConsequence(PRODUCT_IDS);
    const spread = new Map<string, number>();
    for (const id of PRODUCT_IDS) {
      const size = closures.get(id)?.passClosure ?? 0;
      const bucket = size === 0 ? "0" : size < 7 ? "1-6" : size < 12 ? "7-11" : "12+";
      spread.set(bucket, (spread.get(bucket) ?? 0) + 1);
    }
    console.log(
      `  in-scope prerequisite closure over the 62 nodes: ` +
        [...spread].map(([k, v]) => `${k}=${v}`).join("  ") +
        `  (the shipped threshold is ${confirmThresholdFor(PRODUCT_IDS.length, DEFAULT_WALK_POLICY.confirmScopeFraction)})`,
    );

    const rows: {
      items: number;
      nodes: number;
      known: number;
      twoItem: number;
      lostCascade: number;
    }[] = [];
    for (let i = 0; i < N * 3; i++) {
      const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
      const profile = PROFILES[i % PROFILES.length] as Profile;
      const known = profile.sample(rand, PRODUCT_IDS);
      const responses = drawResponses(known, PRODUCT_IDS, rand, MILD.slip, MILD.guess);
      const run = runWalk(PRODUCT_IDS, responses, STATIC_CONSEQUENCE_WALK_POLICY);
      let twoItem = 0;
      let lostCascade = 0;
      for (const record of Object.values(run.state.probed)) {
        if (record.outcomes.length >= 2) twoItem += 1;
        // A pass that credits nothing: the 2-of-3 case INV-DIAG-8 keeps non-inferring.
        // This is what §4.1's lever would recover, and the column is here so its size can
        // be read against the confirmation column beside it.
        if (record.result === "passed" && record.infers !== true) lostCascade += 1;
      }
      rows.push({
        items: run.items,
        nodes: probedNodeCount(run.state),
        known: known.size / PRODUCT_IDS.length,
        twoItem,
        lostCascade,
      });
    }
    console.log("  how much the learner truly knows  share   items(med/p90/max)  nodes");
    for (const [lo, hi] of [
      [0, 0.2],
      [0.2, 0.4],
      [0.4, 0.6],
      [0.6, 0.8],
      [0.8, 1.01],
    ] as const) {
      const sub = rows.filter((r) => r.known >= lo && r.known < hi);
      if (sub.length === 0) continue;
      const d = dist(sub.map((r) => r.items));
      console.log(
        `  ${`${(100 * lo).toFixed(0)}-${(100 * Math.min(hi, 1)).toFixed(0)}%`.padStart(33)}` +
          ` ${((100 * sub.length) / rows.length).toFixed(1).padStart(5)}%` +
          `   ${String(d.med).padStart(3)} / ${String(d.p90).padStart(3)} / ${String(d.max).padStart(3)}` +
          `      ${mean(sub.map((r) => r.nodes)).toFixed(1)}` +
          `  (${mean(sub.map((r) => r.twoItem)).toFixed(1)} of them cost 2+ items;` +
          ` ${mean(sub.map((r) => r.lostCascade)).toFixed(2)} passes credited nothing)`,
      );
    }
  });

  it("the curve: the dial, at the 62-node scope", () => {
    console.log(`\n=== THE CURVE, 62-node scope, mild noise, n=${N * 3} ===`);
    console.log(
      "sent-back = already-mastered skills told to rebuild;" +
        " false-pass = skills credited that the learner does not hold;" +
        " named = robust (2/2) passes the completion ceremony can name, and the share of" +
        " sessions naming at least one.\n",
    );
    for (const [label, policy] of DIAL) {
      console.log(`  ${curve(label, measure(policy))}`);
    }
    console.log("\n  --- the other levers, for comparison ---");
    for (const [label, policy] of ALTERNATIVES) {
      console.log(`  ${curve(label, measure(policy))}`);
    }
  });

  it("scope neutrality: what each candidate does to the instrument that SHIPS", () => {
    // The discriminator, and the reason the cheapest-looking candidate is not the answer.
    // Every probe-policy change so far has held the live D1 walk bit-identical, and the
    // scope-relative confirmation fraction exists precisely so that it can.
    console.log(`\n=== CANDIDATES ON EVERY SCOPE, mild noise, n=${N * 3} ===`);
    for (const [label, scope] of [
      ["D1 (6) — the walk D1 learners still take", D1_IDS],
      [
        `live (${WIDENED_SCOPE.length}) — what the instrument administers TODAY`,
        WIDENED_SCOPE,
      ],
      [
        `next era (${NEXT_ERA_SCOPE.length}) — projected, once the sixth era is authored`,
        NEXT_ERA_SCOPE,
      ],
      ["full (62) — every in-product node", PRODUCT_IDS],
    ] as const) {
      console.log(`\n--- ${label} ---`);
      for (const [name, policy] of ACROSS_SCOPES) {
        console.log(`  ${curve(name, measure(policy, scope))}`);
      }
    }
  });

  it("the recommendation, across noise levels and as a histogram", () => {
    // `DEFAULT_WALK_POLICY` itself, not a re-spelling of it: the recommendation
    // shipped on 2026-08-04, and a harness that re-derives what it is supposed to
    // be checking would not notice the setting being moved out from under it.
    const recommended = DEFAULT_WALK_POLICY;
    console.log(`\n=== SHIPPED (live PASS closure from 20), 62-node, n=${N * 3} ===`);
    for (const [name, noise] of [
      ["noiseless", { slip: 0, guess: 0 }],
      ["mild (.10/.05)", MILD],
      ["moderate (.15/.10)", { slip: 0.15, guess: 0.1 }],
    ] as const) {
      console.log(
        `  ${name.padEnd(20)} pre-cut ` +
          curve("", measure(STATIC_CONSEQUENCE_WALK_POLICY, PRODUCT_IDS, noise)),
      );
      console.log(
        `  ${name.padEnd(20)} SHIPPED ` +
          curve("", measure(recommended, PRODUCT_IDS, noise)),
      );
    }
    console.log("\n--- item distribution, 62-node, mild ---");
    console.log("  pre-cut:");
    console.log(histogram(measure(STATIC_CONSEQUENCE_WALK_POLICY).items));
    console.log("  SHIPPED:");
    console.log(histogram(measure(recommended).items));
  });

  it("the ceiling cohort: whether anyone is still truncated", () => {
    // #89 learned to read a ceiling on the truncated cohort rather than on the average,
    // because the aggregate averages over a population most of which never reaches it.
    console.log(`\n=== CEILING COHORT, 62-node, mild noise, n=${N * 3} ===`);
    for (const [label, policy] of [
      ["pre-cut (#89)", STATIC_CONSEQUENCE_WALK_POLICY],
      ["SHIPPED", DEFAULT_WALK_POLICY],
    ] as const) {
      let hit = 0;
      let hitAcc = 0;
      let hitSentBack = 0;
      let missAcc = 0;
      let missSentBack = 0;
      for (let i = 0; i < N * 3; i++) {
        const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
        const profile = PROFILES[i % PROFILES.length] as Profile;
        const known = profile.sample(rand, PRODUCT_IDS);
        const responses = drawResponses(known, PRODUCT_IDS, rand, MILD.slip, MILD.guess);
        const run = runWalk(PRODUCT_IDS, responses, policy);
        const resolved = resolveKnowledgeState(run.state);
        let ok = 0;
        let back = 0;
        for (const r of resolved) {
          const trulyKnown = known.has(r.node_id);
          if ((r.status === "passed") === trulyKnown) ok += 1;
          if (trulyKnown && placementFor(r, run.state.probed[r.node_id]) < 2) back += 1;
        }
        const acc = ok / PRODUCT_IDS.length;
        if (run.state.ceiling_reached === true) {
          hit += 1;
          hitAcc += acc;
          hitSentBack += back;
        } else {
          missAcc += acc;
          missSentBack += back;
        }
      }
      const total = N * 3;
      const missed = total - hit;
      console.log(
        `  ${label.padEnd(16)} truncated=${((100 * hit) / total).toFixed(2)}%` +
          `  |  THEM: acc=${hit ? ((100 * hitAcc) / hit).toFixed(1) : "n/a"}%` +
          ` sent-back=${hit ? (hitSentBack / hit).toFixed(1) : "n/a"}` +
          `  |  EVERYONE ELSE: acc=${missed ? ((100 * missAcc) / missed).toFixed(1) : "n/a"}%` +
          ` sent-back=${missed ? (missSentBack / missed).toFixed(2) : "n/a"}`,
      );
    }
  });

  it("the era early-stop lever, bounded rather than built", () => {
    // The second lever on the brief's list, priced without implementing it. The bound is
    // deliberately GENEROUS to the lever: it assumes perfect foreknowledge of the placed
    // era, which no real rule has, so a saving that is unattractive here is unattractive
    // full stop.
    //
    // `eraPlacementFromSeed` (apps/web) reads a placement as an era decision: an era
    // fires when EVERY one of its nodes passed, and the scan stops at the first that does
    // not. The conjunction is three lines and is re-derived here rather than imported,
    // because this package is downstream of nothing that holds it.
    console.log(`\n=== ERA EARLY-STOP BOUND, 62-node, shipped, mild, n=${N * 3} ===`);
    const eraIndexOf = new Map<string, number>();
    ERA_SEQUENCE.forEach((era, index) => {
      for (const nodeId of era.nodes) eraIndexOf.set(nodeId, index);
    });

    let itemsTotal = 0;
    let itemsPastPlacement = 0;
    let testOutsLost = 0;
    let masteredLost = 0;
    for (let i = 0; i < N * 3; i++) {
      const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
      const profile = PROFILES[i % PROFILES.length] as Profile;
      const known = profile.sample(rand, PRODUCT_IDS);
      const responses = drawResponses(known, PRODUCT_IDS, rand, MILD.slip, MILD.guess);
      const run = runWalk(PRODUCT_IDS, responses, STATIC_CONSEQUENCE_WALK_POLICY);
      const resolved = resolveKnowledgeState(run.state);
      const placed = new Map(
        resolved.map((r) => [r.node_id, placementFor(r, run.state.probed[r.node_id]) >= 2]),
      );

      let placedEra = ERA_SEQUENCE.length - 1;
      for (let e = 0; e < ERA_SEQUENCE.length; e++) {
        const era = ERA_SEQUENCE[e];
        if (!era?.nodes.every((nodeId) => placed.get(nodeId) === true)) {
          placedEra = e;
          break;
        }
      }

      itemsTotal += run.items;
      for (const [nodeId, record] of Object.entries(run.state.probed)) {
        if ((eraIndexOf.get(nodeId) ?? 0) > placedEra) {
          itemsPastPlacement += record.outcomes.length;
        }
      }
      for (const [nodeId, isPlaced] of placed) {
        if (isPlaced && (eraIndexOf.get(nodeId) ?? 0) > placedEra) {
          testOutsLost += 1;
          if (known.has(nodeId)) masteredLost += 1;
        }
      }
    }
    const total = N * 3;
    console.log(
      `  items spent on eras BEHIND the placement: ${(itemsPastPlacement / total).toFixed(1)}` +
        ` of ${(itemsTotal / total).toFixed(1)} per session ` +
        `(${((100 * itemsPastPlacement) / itemsTotal).toFixed(1)}%)`,
    );
    console.log(
      `  test-outs those items bought: ${(testOutsLost / total).toFixed(2)} per session,` +
        ` of which ${(masteredLost / total).toFixed(2)} are skills the learner really holds`,
    );
    console.log(
      "  So the lever's own price, per session, is that many mastered skills sent back.",
    );
  });
});
