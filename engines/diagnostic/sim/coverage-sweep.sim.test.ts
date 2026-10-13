import {
  ERA_SEQUENCE,
  getProductNodes,
  transitiveDependents,
  transitivePrereqs,
} from "@cr/skill-graph";
import { describe, inject, it } from "vitest";

import { confirmThresholdFor } from "../src/adjudicator";
import {
  DEFAULT_WALK_POLICY,
  probedNodeCount,
  resolveKnowledgeState,
  robustPassNodeIds,
  type WalkPolicy,
} from "../src/walk";
import { placementFor } from "../src/walk-engine";
import { WIDENED_SCOPE } from "./liveScope";
import {
  depthOf,
  dist,
  drawResponses,
  makeProfiles,
  mulberry32,
  type Profile,
  type Responses,
  runWalk,
} from "./students";

/**
 * WHAT IT COSTS TO ASK ABOUT FEWER SKILLS — a measurement tool, NOT a CI test.
 *
 * Sixth sibling of `probe-cost.sim.test.ts`, `policy-sweep.sim.test.ts`,
 * `era-placement.sim.test.ts`, `widened-scope.sim.test.ts` and `tail-policy.sim.test.ts`,
 * sharing their method and their CI exclusion exactly: it lives outside
 * `engines/diagnostic/src/`, so neither the root `vitest.config.ts` nor
 * `vitest.browser.config.ts` collects it, and it is outside the package `tsconfig`
 * (`include: ["src/**\/*"]`) so `tsc --build` never sees it.
 * `engines/diagnostic/sim/vitest.sim.config.ts` is the only way to run it.
 *
 * ## The question
 *
 * The tail knob is spent. `#572` shipped `livePassClosure` from item 20 and took the live
 * instrument to **median 36, p90 47, p99 53, max 58, 0.00% truncated**; its most
 * aggressive setting reaches p90 41 and empties the completion ceremony doing it. The
 * remaining lever is COVERAGE — asking about fewer of the 62 nodes — and the lead is
 * willing to trade placement precision for length, on the reasoning that a learner placed
 * too far forward can go back and play the age properly.
 *
 * So this prices coverage the way `tail-policy.sim.test.ts` priced the tail: as a curve
 * across levels, with the two columns every earlier sweep reports (truth accuracy,
 * already-mastered skills sent back) plus the two this question needs and none of them
 * carry.
 *
 * ### 1. PLACEMENT ERROR, in eras, with a direction
 *
 * "Truth accuracy" is a per-node aggregate and cannot answer "how far out is the
 * learner". The product's answer is `eraPlacementFromSeed`
 * (`apps/web/src/catchup/eraPlacement.ts`): an era fires when EVERY one of its nodes has
 * `placement >= 2`, and the scan STOPS at the first era that does not, because §10.9's
 * prefix property means one founding cannot express a gap. {@link placementIndex} is that
 * scan and nothing else, re-derived here rather than imported for the reason
 * `tail-policy.sim.test.ts` gives — this package is downstream of nothing that holds it.
 *
 * The same function is applied to the learner's GROUND TRUTH to get where they should
 * have landed, so the two sides of the subtraction cannot come from two different
 * definitions of "placed".
 *
 * ### 2. WHAT THE INSTRUMENT GOES SILENT ABOUT, and what the default does with it
 *
 * Reducing coverage does not make the diagnostic wrong. It makes it QUIET, and the
 * silence is resolved by a default. **The default is 0**, and it is worth stating as a
 * mechanism rather than a value:
 *
 *   - `walk-engine.ts`'s `finalize` builds `placement_by_node` by iterating
 *     `resolveKnowledgeState(state)`, which returns `state.scope.map(...)`. A node outside
 *     the scope is therefore ABSENT from the map rather than present with a low value.
 *   - `eraPlacement.ts`'s `passed()` reads `(estimate ?? 0) >= 2`. Absent is 0. 0 is below
 *     the bar.
 *
 * So a skill the instrument does not ask about is treated exactly as a skill the learner
 * failed, and — this is the part that decides the whole question — **the era holding it
 * can never fire.** That module says so in terms: *"an era the instrument cannot see
 * CANNOT fire"*. Coverage is therefore not a symmetric precision knob under the shipped
 * default. It is a cap on how far forward anyone can be placed.
 *
 * ### 3. THE OTHER DEFAULT, priced as a counterfactual on the same walks
 *
 * Because the shipped default is what makes coverage one-directional, the honest way to
 * price the lead's actual ask — shorter, and occasionally too far forward — is to read the
 * SAME runs under the opposite default: a silent node counted as a pass.
 * {@link OPTIMISTIC} does that. It is a post-hoc reading of records this file already
 * produced, not a second simulation and not a policy change: nothing here edits
 * `eraPlacement.ts`'s `?? 0`, and doing so would be an amendment to INV-DIAG-6's
 * fail-closed rule rather than a coverage decision. Reported so the two defaults can be
 * compared on one cohort.
 *
 * ## The cohort is drawn ONCE, over all 62, and every level answers the same draw
 *
 * `students.ts`'s generator consumes `rand()` per node and per new domain IN SCOPE ORDER,
 * so drawing a cohort against each reduced scope would give every level a different
 * cohort and a different noise draw — the comparison would then be across populations
 * rather than across instruments. Here `known` and the response table are drawn against
 * the full live scope, once, and a reduced level runs the same learner over a subset of
 * the same pre-drawn answers. Two consequences, both wanted:
 *
 *   1. The 62-node row is generated exactly as `tail-policy.sim.test.ts` generates its
 *      "live (62)" row, so it reproduces the shipped baseline digit for digit or this
 *      harness is wrong.
 *   2. Ground truth spans all 62 nodes at every level, which is what makes "a skill the
 *      instrument went silent about, that the learner actually holds" countable.
 *
 * ## What it cannot establish
 *
 * Ground truth is synthetic, so every figure is the instrument's self-consistency against
 * a MODEL of a student rather than placement validity against a human — the caveat
 * `Diagnostic_11_Node_Scope_Decision_Evidence.md` §5.1 sets, inherited unchanged. The
 * era-level figures inherit one more on top: eras one to five are each exactly ONE domain
 * and the generator draws one ability cut per domain, so an era-level agreement on those
 * eras is partly the generator agreeing with itself. `era-placement.sim.test.ts` item 6
 * measures that artifact directly and this file does not re-derive it.
 *
 * Nothing here changes a policy, a constant or a scope. Every scope below is composed
 * locally and handed to the shipped engine; `DEFAULT_WALK_POLICY` is read, never spread
 * over, except in the ceiling section, which says so and is a different lever.
 *
 * ## Running it
 *
 *   echo 2000 > engines/diagnostic/sim/sample-size.local
 *   npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
 *     engines/diagnostic/sim/coverage-sweep.sim.test.ts --disableConsoleIntercept
 *
 * `--disableConsoleIntercept` is REQUIRED: under vitest 4 a passing test's `console.log`
 * is swallowed without it, so the harness runs green and prints nothing. Always check the
 * printed `n=` before believing a sample size.
 *
 * Recorded results: `docs/Diagnostic_Coverage_Length_Measurement.md`.
 */

/**
 * The reference population: the live scope, which since `POL.5` was authored is all 62
 * in-product nodes in TEACHING ORDER. Every scope below is a subsequence of it, so every
 * scope is in teaching order too — which matters, because `resolveKnowledgeState` walks
 * `state.scope` and a differently ordered mirror is a slightly different instrument.
 */
const FULL: readonly string[] = WIDENED_SCOPE;
const FULL_SET = new Set(FULL);
const PRODUCT_IDS = getProductNodes().map((n) => n.id);

/**
 * Taken over the FULL 62-node in-product scope, never over the scope under test —
 * `accuracy-cohorts.sim.test.ts` records why: it sets the ability range the profiles draw
 * from, so narrowing it shifts the whole cohort and the published figures stop reproducing.
 */
const MAX_DEPTH = Math.max(...PRODUCT_IDS.map(depthOf));
const PROFILES = makeProfiles(MAX_DEPTH);
const N = Number(inject("simN") ?? 500);
const MILD = { slip: 0.1, guess: 0.05 };

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const pctS = (x: number) => `${(100 * x).toFixed(1)}%`;

// ── The era decision, re-derived ─────────────────────────────────────────────

/** Era membership over the in-product set, in play order. `ERA_SEQUENCE` partitions it. */
const ERAS: readonly { id: string; nodes: readonly string[] }[] = ERA_SEQUENCE.map(
  (era) => ({ id: era.id, nodes: era.nodes }),
);

/** How a node the instrument never asked about is read. `SHIPPED` is `eraPlacement.ts`. */
const SHIPPED = "fail-closed" as const;
const OPTIMISTIC = "fail-open" as const;
type SilentDefault = typeof SHIPPED | typeof OPTIMISTIC;

/**
 * `eraPlacementFromSeed`, as a number: the 1-based position of the FIRST era that does not
 * fire, where an era fires when every one of its nodes reads `>= 2`.
 *
 * Every era firing returns the LAST era's position rather than one past it, which is that
 * function's own `clearedEverything` branch — *"a learner has to stand somewhere"*. The
 * clamp can only ever UNDERSTATE an overplacement, never invent one, and #386 puts the
 * case at 0.2% of generated students.
 *
 * `silentDefault` decides only what an ABSENT node reads as. Under `fail-closed` — what
 * ships — absent is 0 and the era cannot fire. Under `fail-open` absent is a pass, which
 * is the counterfactual §3 of the header describes and which nothing in the product does.
 */
function placementIndex(
  placementByNode: ReadonlyMap<string, number>,
  measured: ReadonlySet<string>,
  silentDefault: SilentDefault,
): number {
  const passes = (nodeId: string): boolean =>
    measured.has(nodeId)
      ? (placementByNode.get(nodeId) ?? 0) >= 2
      : silentDefault === OPTIMISTIC;
  for (let index = 0; index < ERAS.length; index++) {
    const era = ERAS[index] as { nodes: readonly string[] };
    if (!era.nodes.every(passes)) return index + 1;
  }
  return ERAS.length;
}

/** Where a perfect instrument would have placed this learner. Same function, truth input. */
function truthPlacementIndex(known: ReadonlySet<string>): number {
  const perfect = new Map<string, number>();
  for (const id of known) perfect.set(id, 3);
  return placementIndex(perfect, FULL_SET, SHIPPED);
}

// ── The coverage instruments ─────────────────────────────────────────────────

/**
 * Prerequisite closure, the same fixed point `diagnostic-scope.ts`'s `prereqClosed`
 * computes and for the same stated reason: `resolveKnowledgeState` only credits a node
 * whose IN-SCOPE prerequisites passed, so an out-of-scope prerequisite silently drops out
 * of resolution and *"the coverage number keeps its shape and changes its meaning"*.
 *
 * Applied to every level below, so no level is measuring a scope the product would refuse
 * to compose.
 */
function prereqClosed(ids: readonly string[]): readonly string[] {
  let kept = new Set(ids);
  for (;;) {
    const next = new Set(
      [...kept].filter((id) =>
        [...transitivePrereqs(id)].every((p) => !FULL_SET.has(p) || kept.has(p)),
      ),
    );
    if (next.size === kept.size) return FULL.filter((id) => next.has(id));
    kept = next;
  }
}

/** In-scope dependents of a node — what makes it a leaf, relative to the scope in hand. */
function inScopeDependents(id: string, scope: ReadonlySet<string>): string[] {
  return [...transitiveDependents(id)].filter((d) => scope.has(d));
}

/**
 * INSTRUMENT A — drop whole eras from the deepest end.
 *
 * The shape `placementHorizon` already cuts at, so it is the one reduced scope the product
 * has composed before. It is also the only instrument here that leaves every RETAINED era
 * whole, which — given the default above — is the only way a retained era can still fire.
 */
function eraPrefix(eraCount: number): readonly string[] {
  const keep = new Set(ERAS.slice(0, eraCount).flatMap((e) => e.nodes));
  return prereqClosed(FULL.filter((id) => keep.has(id)));
}

/**
 * INSTRUMENT B — drop leaves.
 *
 * A leaf costs the walk an item and buys no inference for anything else, so it is the
 * cheapest node to lose on a pure information argument. Repeatedly removes the leaf latest
 * in teaching order, recomputing leafness each time, so the set stays prerequisite-closed
 * by construction rather than by a later repair.
 */
function leafPruned(target: number): readonly string[] {
  const scope = new Set(FULL);
  while (scope.size > target) {
    const leaves = FULL.filter(
      (id) => scope.has(id) && inScopeDependents(id, scope).length === 0,
    );
    const victim = leaves[leaves.length - 1];
    if (victim === undefined) break;
    scope.delete(victim);
  }
  return prereqClosed(FULL.filter((id) => scope.has(id)));
}

/**
 * INSTRUMENT C — drop by prerequisite depth, deepest first.
 *
 * The classic "measure the foundations and stop" instrument. Closure-safe for free: a
 * dependent is strictly deeper than its prerequisite, so dropping deepest-first can never
 * strand one. Ties broken by teaching-order position, latest first.
 */
function depthPruned(target: number): readonly string[] {
  const order = [...FULL].sort(
    (a, b) => depthOf(b) - depthOf(a) || FULL.indexOf(b) - FULL.indexOf(a),
  );
  const drop = new Set(order.slice(0, Math.max(0, FULL.length - target)));
  return prereqClosed(FULL.filter((id) => !drop.has(id)));
}

/**
 * INSTRUMENT D — thin every era, spreading the cut across the sequence.
 *
 * The reading of *"decrease the coverage a bit"* that needs no graph theory at all: ask
 * about a sample of each age instead of all of it. It is here because it is the instrument
 * a product conversation reaches for first, and because it is the sharpest demonstration
 * that WHICH nodes are dropped decides the answer — it drops exactly the same COUNT as the
 * other three and is not the same instrument.
 *
 * Implemented so it can actually be composed. The naive version — keep the shallowest
 * `k` of every era, then close — collapses: closure follows prerequisites across era
 * boundaries, so a kept node whose prerequisite was thinned out of a different era drops
 * too, and targeting 53 delivers 12. So this drops only nodes that are currently LEAVES,
 * taking each from whichever era still holds the most, which keeps the set closed at every
 * step and keeps the cut spread rather than concentrated at the end of the sequence.
 */
function eraThinned(target: number): readonly string[] {
  const eraOf = new Map<string, number>();
  ERAS.forEach((era, index) => {
    for (const id of era.nodes) eraOf.set(id, index);
  });
  const scope = new Set(FULL);
  while (scope.size > target) {
    const remaining = new Map<number, number>();
    for (const id of scope) {
      const era = eraOf.get(id) ?? 0;
      remaining.set(era, (remaining.get(era) ?? 0) + 1);
    }
    const leaves = FULL.filter(
      (id) => scope.has(id) && inScopeDependents(id, scope).length === 0,
    );
    // The fullest era first, so the cut spreads instead of eating the tail. Ties to the
    // later teaching position, which is the same tie-break `leafPruned` uses.
    let victim: string | undefined;
    let best = -1;
    for (const id of leaves) {
      const size = remaining.get(eraOf.get(id) ?? 0) ?? 0;
      if (size > best) {
        best = size;
        victim = id;
      }
    }
    if (victim === undefined) break;
    scope.delete(victim);
  }
  return prereqClosed(FULL.filter((id) => scope.has(id)));
}

/**
 * NODES THE INSTRUMENT HAS ALWAYS ADMINISTERED — `diagnostic-scope.ts`'s
 * `ALWAYS_ADMINISTERED`, the twenty the two walk-authored packs can serve (D1's six plus
 * the product spine's fourteen). `administeredScope` admits them **regardless of the
 * placement horizon**, so a horizon the product actually derives is never a clean era
 * prefix.
 *
 * Mirrored rather than imported, for the reason `liveScope.ts` gives: the derivation lives
 * in `@cr/item-bank`, which depends on `@cr/diagnostic`, and importing it from this
 * directory would run that package edge backwards. Recomputed from
 * `D1_WALK_ITEM_PACK` + `PRODUCT_ITEM_PACK` on 2026-08-04 at `258856a1` and identical to
 * the version-3 entry frozen in
 * `services/diagnostic-runtime/src/walkInstrumentScope.test.ts`, which is where the
 * instrument's own record of it lives.
 */
const ALWAYS_ADMINISTERED: readonly string[] = [
  "CG.1",
  "EL.1",
  "EXP.1",
  "FUN.1",
  "LF.1",
  "LIN.1",
  "NUM.2",
  "NUM.3",
  "NUM.4",
  "NUM.5",
  "NUM.F",
  "NUM.S",
  "POL.1",
  "POL.2",
  "RAD.1",
  "RAD.2",
  "RAD.3",
  "RAD.4",
  "RAT.1",
  "TRG.1",
];

/**
 * INSTRUMENT E — the horizon the product would actually derive.
 *
 * `administeredScope` is *"prerequisite closure, then the placement horizon widened by
 * ALWAYS_ADMINISTERED, then closure again in case the cut broke it"*, and this is that
 * pipeline with the horizon set by hand instead of read off the content. It is the only
 * level here a shipped build could compose, and it is a few nodes wider than the era
 * prefix at the same era — which is what the widening rule is for: *"a widening must not
 * narrow anything"*.
 */
function derivedHorizon(eraCount: number): readonly string[] {
  const keep = new Set([
    ...ERAS.slice(0, eraCount).flatMap((e) => e.nodes),
    ...ALWAYS_ADMINISTERED,
  ]);
  return prereqClosed(FULL.filter((id) => keep.has(id)));
}

/** One level of one instrument. */
interface Level {
  instrument: string;
  label: string;
  scope: readonly string[];
}

/**
 * The level ladder is the ERA-PREFIX node counts — 62 / 53 / 47 / 38 / 32 / 26 / 21 — and
 * the other three instruments are targeted at the same counts, so the four are compared at
 * equal coverage rather than at equal convenience. The brief's *"down to somewhere around
 * 25"* lands on the five-era prefix at 26.
 */
const ERA_PREFIX_LEVELS = [10, 9, 8, 7, 6, 5, 4] as const;
const LADDER: readonly number[] = ERA_PREFIX_LEVELS.map((eras) => eraPrefix(eras).length);

const LEVELS: readonly Level[] = [
  ...ERA_PREFIX_LEVELS.map((eras) => ({
    instrument: "era-tail",
    label: `eras 1-${eras}`,
    scope: eraPrefix(eras),
  })),
  ...LADDER.map((target) => ({
    instrument: "leaves",
    label: `leaves -> ${target}`,
    scope: leafPruned(target),
  })),
  ...LADDER.map((target) => ({
    instrument: "depth",
    label: `depth -> ${target}`,
    scope: depthPruned(target),
  })),
  ...LADDER.map((target) => ({
    instrument: "era-thin",
    label: `era-thin -> ${target}`,
    scope: eraThinned(target),
  })),
  ...ERA_PREFIX_LEVELS.map((eras) => ({
    instrument: "horizon",
    label: `horizon at era ${eras}`,
    scope: derivedHorizon(eras),
  })),
];

// ── Measurement ──────────────────────────────────────────────────────────────

interface Placement {
  /** Per-session placement error in eras: measured minus truth. Positive = OVERplaced. */
  error: number[];
  /** For an overplaced session: era nodes handed over that the learner does not hold. */
  unearnedHandedOver: number[];
  /** For an underplaced session: skills held inside the eras they must now replay. */
  replayedHeld: number[];
}

interface Outcome {
  scopeSize: number;
  items: number[];
  nodes: number[];
  truncatedRate: number;
  /** Truth accuracy over the SCOPE — the denominator every earlier sweep uses. */
  accuracyInScope: number[];
  /** Truth accuracy over all 62, silent nodes taking the shipped default. */
  accuracyWhole: number[];
  /** Already-mastered skills placed below the test-out bar, in scope / over all 62. */
  sentBackInScope: number[];
  sentBackWhole: number[];
  /** Skills the learner does not hold, credited anyway. Cannot happen out of scope. */
  falsePass: number[];
  named: number[];
  namedAnyRate: number;
  /** Placement read both ways: as the product reads it, and under the other default. */
  shipped: Placement;
  optimistic: Placement;
  truthIndex: number[];
  /** In-scope nodes the walk left `unknown` — the ceiling's own silence. */
  unresolvedInScope: number[];
  /** The 62 minus the scope: skills the instrument never asks about. */
  silentNodes: number;
  /** Of those, how many this learner actually holds. */
  silentHeld: number[];
  /** Eras with at least one node out of scope, and the earliest such era (the cap). */
  erasHoled: number;
  eraCap: number;
}

function emptyPlacement(): Placement {
  return { error: [], unearnedHandedOver: [], replayedHeld: [] };
}

function recordPlacement(
  into: Placement,
  placed: number,
  truth: number,
  known: ReadonlySet<string>,
): void {
  into.error.push(placed - truth);
  if (placed > truth) {
    // Handed ages 1..placed-1. What of them did they not actually hold?
    const handed = ERAS.slice(0, placed - 1).flatMap((e) => e.nodes);
    into.unearnedHandedOver.push(handed.filter((id) => !known.has(id)).length);
  }
  if (placed < truth) {
    // Made to play ages placed..truth-1 again. What of them did they already hold?
    const replay = ERAS.slice(placed - 1, truth - 1).flatMap((e) => e.nodes);
    into.replayedHeld.push(replay.filter((id) => known.has(id)).length);
  }
}

function measureOnce(
  scope: readonly string[],
  policy: WalkPolicy = DEFAULT_WALK_POLICY,
  n: number = N * 3,
  noise = MILD,
): Outcome {
  const scopeSet = new Set(scope);
  const silent = FULL.filter((id) => !scopeSet.has(id));
  const holedIndex = ERAS.findIndex((era) => !era.nodes.every((id) => scopeSet.has(id)));
  const holed = ERAS.filter((era) => !era.nodes.every((id) => scopeSet.has(id)));

  const out: Outcome = {
    scopeSize: scope.length,
    items: [],
    nodes: [],
    truncatedRate: 0,
    accuracyInScope: [],
    accuracyWhole: [],
    sentBackInScope: [],
    sentBackWhole: [],
    falsePass: [],
    named: [],
    namedAnyRate: 0,
    shipped: emptyPlacement(),
    optimistic: emptyPlacement(),
    truthIndex: [],
    unresolvedInScope: [],
    silentNodes: silent.length,
    silentHeld: [],
    erasHoled: holed.length,
    eraCap: holedIndex === -1 ? ERAS.length : holedIndex + 1,
  };

  let truncated = 0;
  let namedAny = 0;

  for (let i = 0; i < n; i++) {
    // The same seed expression every sibling harness uses, so a cohort measured here is
    // the cohort measured there and every comparison is paired — across levels of this
    // sweep, and against `tail-policy.sim.test.ts`'s live row.
    const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
    const profile = PROFILES[i % PROFILES.length] as Profile;
    const known = profile.sample(rand, FULL);
    const responses: Responses = drawResponses(known, FULL, rand, noise.slip, noise.guess);

    const run = runWalk(scope, responses, policy);
    out.items.push(run.items);
    out.nodes.push(probedNodeCount(run.state));
    if (run.state.ceiling_reached === true) truncated += 1;

    const resolved = resolveKnowledgeState(run.state);
    const placement = new Map<string, number>();
    let ok = 0;
    let back = 0;
    let through = 0;
    let unresolved = 0;
    for (const resolution of resolved) {
      const trulyKnown = known.has(resolution.node_id);
      if ((resolution.status === "passed") === trulyKnown) ok += 1;
      if (resolution.status === "unknown") unresolved += 1;
      const seed = placementFor(resolution, run.state.probed[resolution.node_id]);
      placement.set(resolution.node_id, seed);
      // Both directions read the number the product acts on: `>= 2` is the bar
      // `unlockedNodeIdsFromPlacement` and `eraFires` key on, so these are exact
      // complements.
      if (trulyKnown && seed < 2) back += 1;
      if (!trulyKnown && seed >= 2) through += 1;
    }

    // The whole-product view. A silent node is absent from `placement`, which the product
    // reads as 0: correct exactly when the learner does not hold it, and sent back when
    // they do.
    const silentlyHeld = silent.filter((id) => known.has(id)).length;
    out.accuracyInScope.push(ok / scope.length);
    out.accuracyWhole.push((ok + (silent.length - silentlyHeld)) / FULL.length);
    out.sentBackInScope.push(back);
    out.sentBackWhole.push(back + silentlyHeld);
    out.falsePass.push(through);
    out.silentHeld.push(silentlyHeld);
    out.unresolvedInScope.push(unresolved);

    const passedSet = new Set(
      resolved.filter((r) => r.status === "passed").map((r) => r.node_id),
    );
    const namedHere = robustPassNodeIds(run.state).filter((id) => passedSet.has(id));
    out.named.push(namedHere.length);
    if (namedHere.length > 0) namedAny += 1;

    const truth = truthPlacementIndex(known);
    out.truthIndex.push(truth);
    recordPlacement(
      out.shipped,
      placementIndex(placement, scopeSet, SHIPPED),
      truth,
      known,
    );
    recordPlacement(
      out.optimistic,
      placementIndex(placement, scopeSet, OPTIMISTIC),
      truth,
      known,
    );
  }

  out.truncatedRate = truncated / n;
  out.namedAnyRate = namedAny / n;
  return out;
}

/**
 * Memoized by scope identity: four instruments over seven levels is 28 cohorts of 6,000
 * walks, and three report sections read the same 28. Recomputing per section would triple
 * a four-minute run for nothing.
 */
const CACHE = new Map<readonly string[], Outcome>();
function measure(scope: readonly string[]): Outcome {
  const hit = CACHE.get(scope);
  if (hit) return hit;
  const out = measureOnce(scope);
  CACHE.set(scope, out);
  return out;
}

function row(label: string, out: Outcome): string {
  const di = dist(out.items);
  return (
    `${label.padEnd(17)} ${String(out.scopeSize).padStart(2)}n  ` +
    `med=${String(di.med).padStart(3)} p90=${String(di.p90).padStart(3)} ` +
    `p99=${String(di.p99).padStart(3)} max=${String(di.max).padStart(3)} ` +
    `trunc=${(100 * out.truncatedRate).toFixed(2).padStart(5)}%  ` +
    `| acc(scope)=${(100 * mean(out.accuracyInScope)).toFixed(1)}% ` +
    `acc(62)=${(100 * mean(out.accuracyWhole)).toFixed(1)}% ` +
    `| back(scope)=${mean(out.sentBackInScope).toFixed(2)} ` +
    `back(62)=${mean(out.sentBackWhole).toFixed(2)} ` +
    `fwd=${mean(out.falsePass).toFixed(2)} ` +
    `| named=${mean(out.named).toFixed(2)} (${(100 * out.namedAnyRate).toFixed(0)}%)`
  );
}

/** The placement-error distribution, as counts rather than a mean. */
function errorSpread(place: Placement): string {
  const total = place.error.length;
  const buckets = new Map<number, number>();
  for (const e of place.error) buckets.set(e, (buckets.get(e) ?? 0) + 1);
  const at = (k: number) => (buckets.get(k) ?? 0) / total;
  const over = (min: number) => place.error.filter((e) => e >= min).length / total;
  const under = (min: number) => place.error.filter((e) => e <= -min).length / total;
  const keys = [...buckets.keys()].sort((a, b) => a - b);
  return (
    `exact=${pctS(at(0)).padStart(6)}  ` +
    `OVER >=1=${pctS(over(1)).padStart(5)} >=2=${pctS(over(2)).padStart(5)} ` +
    `>=3=${pctS(over(3)).padStart(5)}  ` +
    `UNDER >=1=${pctS(under(1)).padStart(5)} >=2=${pctS(under(2)).padStart(5)} ` +
    `>=3=${pctS(under(3)).padStart(5)}\n` +
    `${" ".repeat(26)}spread ` +
    keys.map((k) => `${k > 0 ? "+" : ""}${k}:${pctS(at(k))}`).join(" ")
  );
}

function consequence(place: Placement): string {
  return (
    `mean|err|=${mean(place.error.map(Math.abs)).toFixed(2)}  ` +
    `overplaced sessions=${place.unearnedHandedOver.length} ` +
    `(${mean(place.unearnedHandedOver).toFixed(2)} unheld skills handed over each)  ` +
    `underplaced sessions=${place.replayedHeld.length} ` +
    `(${mean(place.replayedHeld).toFixed(2)} already-held skills replayed each)`
  );
}

describe("what it costs to ask about fewer skills", () => {
  it("the shipped baseline, reproduced before anything is swept", () => {
    // The anchor. `docs/Diagnostic_Tail_Cut_Landed.md` §2.1 records the LIVE instrument at
    // median 36, p90 47, p99 53, max 58, 0.00% truncated, 95.6% accuracy, 2.34 mastered
    // skills sent back, 0.40 gaps through, 2.36 named in 58% of sessions. If this row has
    // moved, this harness has drifted off the record and every figure below means nothing.
    console.log(
      `\n=== BASELINE: the live 62-node instrument, SHIPPED policy, n=${N * 3} ===`,
    );
    console.log(
      `  policy: livePassClosure=${DEFAULT_WALK_POLICY.livePassClosure}` +
        ` liveConsequenceFrom=${DEFAULT_WALK_POLICY.liveConsequenceFrom}` +
        ` maxItems=${DEFAULT_WALK_POLICY.maxItems}` +
        ` confirmScopeFraction=${DEFAULT_WALK_POLICY.confirmScopeFraction}`,
    );
    console.log("  recorded: 36 / 47 / 53 / 58, 0.00% truncated, 95.6%, 2.34 sent back");
    console.log(`  ${row("live (62)", measure(FULL))}`);
  });

  it("the base rates the whole table is read against", () => {
    // Where the generated cohort actually belongs, before any instrument sees them. Every
    // claim below about what a placement cap costs is a claim about THIS histogram, and it
    // is a property of `students.ts` rather than of the diagnostic.
    const out = measure(FULL);
    const counts = new Map<number, number>();
    for (const t of out.truthIndex) counts.set(t, (counts.get(t) ?? 0) + 1);
    console.log(`\n=== TRUTH PLACEMENT, the generated cohort, n=${N * 3} ===`);
    console.log("  the era a PERFECT instrument would place them into:");
    for (let e = 1; e <= ERAS.length; e++) {
      const c = counts.get(e) ?? 0;
      const era = ERAS[e - 1] as { id: string };
      console.log(
        `    era ${String(e).padStart(2)} ${era.id.padEnd(16)} ` +
          `${pctS(c / out.truthIndex.length).padStart(6)}  ` +
          `${"#".repeat(Math.round((100 * c) / out.truthIndex.length))}`,
      );
    }
    const past = (k: number) =>
      out.truthIndex.filter((t) => t > k).length / out.truthIndex.length;
    console.log(
      "  share belonging PAST era k: " +
        [4, 5, 6, 7, 8, 9].map((k) => `k=${k}: ${pctS(past(k))}`).join("  "),
    );
  });

  it("what each instrument actually drops", () => {
    console.log("\n=== THE FIVE INSTRUMENTS, composed ===");
    console.log(
      "  era-tail keeps whole eras; leaves, depth and era-thin are targeted at the SAME node\n" +
        "  counts, so those four are compared at equal coverage. horizon is era-tail run\n" +
        "  through `administeredScope`'s own pipeline, so it re-admits ALWAYS_ADMINISTERED and\n" +
        "  lands a few nodes wider — it is the only ladder a shipped build could compose.\n" +
        "  Every scope is prerequisite-closed.\n",
    );
    for (const level of LEVELS) {
      const scopeSet = new Set(level.scope);
      const holed = ERAS.filter((e) => !e.nodes.every((id) => scopeSet.has(id)));
      const capIndex = ERAS.findIndex((e) => !e.nodes.every((id) => scopeSet.has(id)));
      const dropped = FULL.filter((id) => !scopeSet.has(id));
      console.log(
        `  ${level.instrument.padEnd(9)} ${level.label.padEnd(17)} ` +
          `${String(level.scope.length).padStart(2)} nodes  ` +
          `whole eras=${String(ERAS.length - holed.length).padStart(2)}  ` +
          `first holed era=${String(capIndex === -1 ? ERAS.length : capIndex + 1).padStart(2)}  ` +
          // The confirmation threshold is a SHARE of the scope, so it falls as the scope
          // narrows and more decisions get confirmed on two items rather than one. It is
          // why a smaller instrument does not shrink in proportion to its node count, and
          // why the completion ceremony gets MORE to name rather than less.
          `confirmThreshold=${confirmThresholdFor(level.scope.length, DEFAULT_WALK_POLICY.confirmScopeFraction)}  ` +
          `dropped: ${dropped.slice(0, 6).join(",")}${dropped.length > 6 ? `,+${dropped.length - 6}` : ""}`,
      );
    }

    // Two of the brief's three named instruments turn out to be one instrument on this
    // graph. Printed as an equality check rather than left for a reader to notice from
    // identical rows, because "these two agree" and "these two are the same set" are
    // different claims and only the second explains the agreement.
    console.log("\n  do `leaves` and `depth` select the same nodes?");
    for (const target of LADDER) {
      const a = leafPruned(target);
      const b = depthPruned(target);
      const same = a.length === b.length && a.every((id, i) => id === b[i]);
      const differ = [
        ...a.filter((id) => !b.includes(id)).map((id) => `-${id}`),
        ...b.filter((id) => !a.includes(id)).map((id) => `+${id}`),
      ];
      console.log(
        `    target ${String(target).padStart(2)}: ${same ? "IDENTICAL" : `differ by ${differ.length}: ${differ.join(" ")}`}`,
      );
    }
  });

  it("the sweep: length, accuracy, and what is sent back", () => {
    console.log(`\n=== THE COVERAGE SWEEP, SHIPPED policy, mild noise, n=${N * 3} ===`);
    console.log(
      "  acc(scope)/back(scope) use the measured scope as the denominator, which is what\n" +
        "  every earlier sweep reports. acc(62)/back(62) use all 62, with a silent node\n" +
        "  taking the placement default (0), which is what the learner actually gets.\n" +
        "  fwd = skills credited that the learner does not hold.",
    );
    let last = "";
    for (const level of LEVELS) {
      if (level.instrument !== last) {
        console.log(`\n  --- ${level.instrument} ---`);
        last = level.instrument;
      }
      console.log(`  ${row(level.label, measure(level.scope))}`);
    }
  });

  it("placement error, in eras, with a direction", () => {
    console.log(`\n=== PLACEMENT ERROR, SHIPPED policy, mild noise, n=${N * 3} ===`);
    console.log(
      "  measured era minus true era. POSITIVE = overplaced (the error the archipelago\n" +
        "  cheapens). NEGATIVE = underplaced (replays content they already had).",
    );
    let last = "";
    for (const level of LEVELS) {
      if (level.instrument !== last) {
        console.log(`\n  --- ${level.instrument} ---`);
        last = level.instrument;
      }
      const out = measure(level.scope);
      console.log(
        `  ${level.label.padEnd(17)} ${String(out.scopeSize).padStart(2)}n  ` +
          errorSpread(out.shipped),
      );
      console.log(`  ${" ".repeat(23)}${consequence(out.shipped)}`);
    }
  });

  it("the other default: the same walks, read fail-open", () => {
    // The counterfactual the lead's ask actually names. Nothing in the product does this;
    // `eraPlacement.ts` reads an absent node as 0 and INV-DIAG-6 is the rule behind it.
    // Priced here so "shorter, and sometimes too far forward" can be compared against
    // "shorter, and always too far back" on one cohort rather than argued about.
    console.log(
      `\n=== COUNTERFACTUAL: a silent node read as a PASS, n=${N * 3} ===\n` +
        "  NOT what ships. A post-hoc reading of the same walks under the opposite default,\n" +
        "  which would be an amendment to INV-DIAG-6 rather than a coverage change.",
    );
    let last = "";
    for (const level of LEVELS) {
      if (level.instrument !== last) {
        console.log(`\n  --- ${level.instrument} ---`);
        last = level.instrument;
      }
      const out = measure(level.scope);
      console.log(
        `  ${level.label.padEnd(17)} ${String(out.scopeSize).padStart(2)}n  ` +
          errorSpread(out.optimistic),
      );
      console.log(`  ${" ".repeat(23)}${consequence(out.optimistic)}`);
    }
  });

  it("what the instrument goes silent about, and what the default does with it", () => {
    console.log(`\n=== SILENCE, n=${N * 3} ===`);
    console.log(
      "  silent = in-product nodes the instrument never asks about. The default for one is\n" +
        "  ABSENT from placement_by_node, which eraPlacement.ts reads as 0 — below the pass\n" +
        "  bar — so the era holding it can never fire. held-and-silent is how many of them\n" +
        "  this learner actually has: skills sent back with no question asked.\n" +
        "  unresolved-in-scope is the OTHER silence: in-scope nodes left `unknown`.",
    );
    let last = "";
    for (const level of LEVELS) {
      if (level.instrument !== last) {
        console.log(`\n  --- ${level.instrument} ---`);
        last = level.instrument;
      }
      const out = measure(level.scope);
      console.log(
        `  ${level.label.padEnd(17)} ${String(out.scopeSize).padStart(2)}n  ` +
          `silent=${String(out.silentNodes).padStart(2)}  ` +
          `held-and-silent=${mean(out.silentHeld).toFixed(2)}/session  ` +
          `unresolved-in-scope=${mean(out.unresolvedInScope).toFixed(2)}  ` +
          `| eras that can never fire=${String(out.erasHoled).padStart(2)}  ` +
          `hard placement cap=era ${out.eraCap}`,
      );
    }
  });

  it("the shape of the instrument at the levels worth arguing about", () => {
    // A median describes almost nobody when the distribution is flat — the finding #572
    // recorded about the pre-cut instrument — so the candidate levels get a histogram
    // rather than four percentiles.
    console.log(`\n=== ITEM DISTRIBUTION, buckets of three, n=${N * 3} ===`);
    for (const [label, scope] of [
      ["live (62)", FULL],
      ["horizon at era 7", derivedHorizon(7)],
      ["horizon at era 6", derivedHorizon(6)],
      ["horizon at era 5", derivedHorizon(5)],
    ] as const) {
      const items = measure(scope).items;
      const buckets = new Map<number, number>();
      for (const value of items) {
        const bucket = Math.floor(value / 3);
        buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
      }
      const di = dist(items);
      console.log(
        `\n  ${label} — med=${di.med} mean=${di.mean.toFixed(1)} p90=${di.p90} max=${di.max}` +
          ` (at 20s/item: ${((20 * di.med) / 60).toFixed(1)} min median,` +
          ` ${((20 * di.p90) / 60).toFixed(1)} min p90)`,
      );
      for (const [bucket, count] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
        const lo = bucket * 3;
        const share = (100 * count) / items.length;
        console.log(
          `    ${String(lo).padStart(3)}-${String(lo + 2).padEnd(3)} ${share.toFixed(1).padStart(5)}%  ${"#".repeat(Math.round(share))}`,
        );
      }
    }
  });

  it("the ceiling is a DIFFERENT lever, priced on the cohort it creates", () => {
    // Not coverage. Capping `maxItems` shortens the instrument by cutting walks off
    // mid-measurement, and `#572` measured what that does to the cohort it truncates:
    // scored 84.6% and told to rebuild 9.5 skills they already held. Read on the truncated
    // cohort rather than on the average, which is what #89 learned to do.
    //
    // This is the one place the file spreads over `DEFAULT_WALK_POLICY`, because the
    // ceiling IS the knob under test here. Coverage is held at the full 62 throughout, so
    // the two levers cannot be confused for one another in the output.
    console.log(`\n=== THE CEILING LEVER, full 62-node coverage, n=${N * 3} ===`);
    console.log(
      "  read on the TRUNCATED cohort, never on the average — the aggregate averages over\n" +
        "  a population most of which never reaches the ceiling.",
    );
    const n = N * 3;
    for (const maxItems of [70, 50, 45, 40, 35, 30]) {
      const policy: WalkPolicy = { ...DEFAULT_WALK_POLICY, maxItems };
      const items: number[] = [];
      let hit = 0;
      let hitAcc = 0;
      let hitBack = 0;
      let missAcc = 0;
      let missBack = 0;
      let placedShort = 0;
      for (let i = 0; i < n; i++) {
        const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
        const profile = PROFILES[i % PROFILES.length] as Profile;
        const known = profile.sample(rand, FULL);
        const responses = drawResponses(known, FULL, rand, MILD.slip, MILD.guess);
        const run = runWalk(FULL, responses, policy);
        items.push(run.items);
        const resolved = resolveKnowledgeState(run.state);
        const placement = new Map<string, number>();
        let ok = 0;
        let back = 0;
        for (const r of resolved) {
          const trulyKnown = known.has(r.node_id);
          if ((r.status === "passed") === trulyKnown) ok += 1;
          const seed = placementFor(r, run.state.probed[r.node_id]);
          placement.set(r.node_id, seed);
          if (trulyKnown && seed < 2) back += 1;
        }
        const acc = ok / FULL.length;
        if (run.state.ceiling_reached === true) {
          hit += 1;
          hitAcc += acc;
          hitBack += back;
        } else {
          missAcc += acc;
          missBack += back;
        }
        if (placementIndex(placement, FULL_SET, SHIPPED) < truthPlacementIndex(known)) {
          placedShort += 1;
        }
      }
      const di = dist(items);
      const missed = n - hit;
      console.log(
        `  maxItems=${String(maxItems).padStart(2)}  ` +
          `med=${String(di.med).padStart(3)} p90=${String(di.p90).padStart(3)} ` +
          `p99=${String(di.p99).padStart(3)} max=${String(di.max).padStart(3)}  ` +
          `TRUNCATED=${((100 * hit) / n).toFixed(2).padStart(5)}%  ` +
          `| THEM: acc=${hit ? ((100 * hitAcc) / hit).toFixed(1) : "n/a"}% ` +
          `sent-back=${hit ? (hitBack / hit).toFixed(1) : "n/a"}  ` +
          `| EVERYONE ELSE: acc=${missed ? ((100 * missAcc) / missed).toFixed(1) : "n/a"}% ` +
          `sent-back=${missed ? (missBack / missed).toFixed(2) : "n/a"}  ` +
          `| underplaced=${((100 * placedShort) / n).toFixed(1)}%`,
      );
    }
  });
});
