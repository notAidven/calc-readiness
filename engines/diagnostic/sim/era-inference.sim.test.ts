import {
  ERA_SEQUENCE,
  getProductNodes,
  transitiveDependents,
  transitivePrereqs,
} from "@cr/skill-graph";
import { describe, expect, inject, it } from "vitest";

import { confirmThresholdFor } from "../src/adjudicator";
import {
  currentProbeNode,
  DEFAULT_WALK_POLICY,
  isWalkComplete,
  type ProbeRecord,
  probedNodeCount,
  recordScoredOutcome,
  resolveKnowledgeState,
  robustPassNodeIds,
  startWalk,
  type WalkPolicy,
  type WalkState,
} from "../src/walk";
import { placementFor } from "../src/walk-engine";
import { WIDENED_SCOPE } from "./liveScope";
import {
  closeDownward,
  depthOf,
  dist,
  domainOf,
  drawResponses,
  makeProfiles,
  mulberry32,
  type Profile,
  type Responses,
  runWalk,
} from "./students";

/**
 * INFERRING ERA ONE INSTEAD OF ASKING ABOUT IT — a measurement tool, NOT a CI test.
 *
 * Seventh sibling of `probe-cost.sim.test.ts`, `policy-sweep.sim.test.ts`,
 * `era-placement.sim.test.ts`, `widened-scope.sim.test.ts`, `tail-policy.sim.test.ts` and
 * `accuracy-cohorts.sim.test.ts`, sharing their method and their CI exclusion exactly: it
 * lives outside `engines/diagnostic/src/`, so neither the root `vitest.config.ts` nor
 * `vitest.browser.config.ts` collects it, and it is outside the package `tsconfig`
 * (`include: ["src/**\/*"]`) so `tsc --build` never sees it.
 * `engines/diagnostic/sim/vitest.sim.config.ts` is the only way to run it.
 *
 * ## The question
 *
 * The product lead: *"one thing to explore is being more willing to infer on lower level
 * eras, especially era 1. can definitely save questions there because the vast vast
 * majority of students won't struggle with this, and if they can do later nodes they can
 * do era 1 nodes with no difficulty. and if they can't do those nodes, then we'll
 * determine that very quickly when we propagate back down. explore loosening thoroughness
 * at the lower level and how that impacts accuracy while keeping in mind the distribution
 * of learners (e.g. weight synthetic students very very heavily towards having era 1
 * knowledge)."*
 *
 * Three claims, priced separately because they fail independently:
 *
 *   1. **Almost nobody struggles with era one** — a claim about the population, which is a
 *      claim about `students.ts` and about nothing in the diagnostic. §1 and §2.
 *   2. **Competence at a deep node implies competence at its prerequisites** — a claim
 *      about the graph. §7 asks it per era-one node, because the graph does not answer it
 *      uniformly: `NUM.F` gates 52 of the 62 and `NUM.5` gates 5.
 *   3. **A wrong inference is caught quickly when the walk propagates back down** — the
 *      claim that makes the idea safe. §6, and it is the crux.
 *
 * ## Why the prior comes first, and why it is a finding rather than a preamble
 *
 * Every accuracy figure this repository records about the diagnostic was measured against
 * the cohort `makeProfiles` generates, and that generator draws
 * `ability = rand() * (maxDepth + 1)` — **uniform**. §1 measures what that implies about
 * era one rather than asserting it. A uniform ability prior is the right default for a
 * sweep whose question is "which policy is better", because it is the comparison that
 * assumes least. It is the wrong prior for a question whose whole content is *how many
 * learners are below a specific bar*, which is this question.
 *
 * So §2 constructs priors that carry the lead's stated belief, as **three separate
 * one-change steps** so a reader can attribute any movement to the step that caused it,
 * and §3 re-runs the shipped instrument under all of them. Nothing already published is
 * quoted rather than re-measured, and the shipped prior's row is reproduced first.
 *
 * ## What it cannot establish
 *
 * Ground truth is synthetic, so every figure is the instrument's self-consistency against
 * a MODEL of a learner rather than placement validity against a human — the caveat
 * `Diagnostic_11_Node_Scope_Decision_Evidence.md` §5.1 sets, inherited unchanged and made
 * sharper here: the priors below are this document's construction, and the answer is only
 * as good as they are. They are written as one function with named constants so that
 * disagreeing with them is a one-line edit rather than an argument.
 *
 * `Diagnostic_Probe_Cost_Measurement.md` §13.7's warning applies unchanged: the student
 * model makes same-depth same-domain nodes near-perfectly correlated, so a policy that
 * infers across SIBLINGS posts a fake win. Everything measured here is either DAG-
 * structural (prerequisite closure) or an outright assumption named as such, and the
 * assumption arms are scored against ground truth over all 62 nodes, so a sibling
 * correlation cannot hide inside them.
 *
 * Nothing here changes a policy, a constant or a scope. `DEFAULT_WALK_POLICY` is read and
 * never spread over. Every instrument below is a SCOPE composed locally and handed to the
 * shipped engine, plus an explicitly-recorded assumption applied to the placement map.
 *
 * ## Running it
 *
 *   echo 2000 > engines/diagnostic/sim/sample-size.local
 *   npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
 *     engines/diagnostic/sim/era-inference.sim.test.ts --disableConsoleIntercept
 *
 * `--disableConsoleIntercept` is REQUIRED: under vitest 4 a passing test's `console.log`
 * is swallowed without it, so the harness runs green and prints nothing. Always check the
 * printed `n=` before believing a sample size.
 *
 * Recorded results: `docs/Diagnostic_Era_One_Inference_Measurement.md`.
 */

// ── The population under test ────────────────────────────────────────────────

/** The live scope: since `POL.5` was authored, all 62 in-product nodes in teaching order. */
const FULL: readonly string[] = WIDENED_SCOPE;
const FULL_SET = new Set(FULL);
const PRODUCT_IDS = getProductNodes().map((n) => n.id);

/**
 * Taken over the FULL 62-node in-product scope, never over the scope under test —
 * `accuracy-cohorts.sim.test.ts` records why: it sets the ability range the profiles draw
 * from, so narrowing it shifts the whole cohort and the published figures stop reproducing.
 */
const MAX_DEPTH = Math.max(...PRODUCT_IDS.map(depthOf));
const SHIPPED_PROFILES = makeProfiles(MAX_DEPTH);
const N = Number(inject("simN") ?? 500);
const MILD = { slip: 0.1, guess: 0.05 };

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const pctS = (x: number) => `${(100 * x).toFixed(1)}%`;

const ERAS: readonly { id: string; nodes: readonly string[] }[] = ERA_SEQUENCE.map(
  (era) => ({ id: era.id, nodes: era.nodes }),
);
const ERA_ONE: readonly string[] = ERAS[0]?.nodes ?? [];
/** Era one is exactly one domain, which is what makes it ONE draw in the generator (§1). */
const ERA_ONE_DOMAIN = domainOf(ERA_ONE[0] as string);
/** The deepest node in era one — the bar an ability cut must clear to hold the whole era. */
const ERA_ONE_MAX_DEPTH = Math.max(...ERA_ONE.map(depthOf));

const inScopePrereqs = (id: string) =>
  [...transitivePrereqs(id)].filter((p) => FULL_SET.has(p));
const inScopeDependents = (id: string) =>
  [...transitiveDependents(id)].filter((d) => FULL_SET.has(d));

// ── §2. The priors, constructed ──────────────────────────────────────────────

/**
 * A ground-truth generator. Two streams: `rand` is the stream every sibling harness
 * consumes, drawn in exactly the order `makeProfiles` draws it so a learner's response
 * table stays paired across priors; `overlay` is this file's own stream, so a prior that
 * needs an extra draw does not shift the shared one.
 */
interface Prior {
  name: string;
  note: string;
  sample(rand: () => number, overlay: () => number, index: number): Set<string>;
}

/**
 * How the ability scalar is shaped. `uniform` is what ships. `triangular` is the mean of
 * two uniforms — symmetric, unimodal, same support — and is the minimum change that stops
 * the extremes being as common as the middle. The second draw comes off the OVERLAY
 * stream so both shapes consume exactly one `rand()` and the response tables stay paired.
 */
type AbilityShape = "uniform" | "triangular";

/**
 * THE ERA-ONE FLOOR — the lead's *"weight synthetic students very very heavily towards
 * having era 1 knowledge"*, as one number.
 *
 * With this probability the learner's era-one domain cut is raised above era one's deepest
 * node, so they hold all six. The rest of the generator is untouched, and the floor is
 * applied to the CUT rather than to the known-set, which matters: raising the cut restores
 * the downstream nodes that a missing `NUM.4` had pruned out of `closeDownward`, and
 * adding the six nodes after the fact would not. A learner who can factor polynomials but
 * cannot count is not made coherent by handing them counting afterwards; they were never
 * drawn.
 *
 * It is the FORCED share, not the resulting one: the underlying draw already clears era one
 * three times in four, so a floor of 0.95 produces a cohort 98.6% of which holds all six.
 * §2.2 prints both columns at eight settings so the knob cannot be mistaken for the answer.
 *
 * 0.95 is the headline setting and it is a CHOICE, not a measurement. §2.2 sweeps it from
 * the shipped prior's emergent rate to 1.00 so the reader can see the whole curve and pick
 * their own; every figure that depends on it says which setting it was taken at.
 */
const ERA_ONE_FLOOR = 0.95;

/**
 * THE ISOLATED-GAP RATE — the only prior in which the lead's second claim can FAIL.
 *
 * Under `closeDownward` a learner holds a node only if they hold every in-scope
 * prerequisite, so "competence at a deep node implies competence at its prerequisites" is
 * true BY CONSTRUCTION and an instrument that infers downward cannot be wrong except
 * through noise. That makes the coherent priors unable to price the risk they are being
 * asked about.
 *
 * So the third prior drops each era-one node independently with this probability, AFTER
 * closure and WITHOUT re-closing — the learner who can solve a linear equation and has
 * genuinely forgotten percents. It is applied to era one only, because era one is the
 * subject; a whole-graph incoherence model would change every published figure for reasons
 * unrelated to this question.
 *
 * 0.03 per node is a choice. It puts ~17% of otherwise-competent learners one era-one
 * skill short, which is the order of magnitude a placement instrument exists to catch. §2.2
 * reports what the truth set looks like at it, and §5/§6 report the answer's sensitivity
 * by carrying the coherent prior beside it in every table.
 */
const ISOLATED_GAP_RATE = 0.03;

/**
 * The shipped generator, re-implemented so the floor can be applied to the CUT rather than
 * to the result — and pinned against `makeProfiles` at zero floor in §2.1, because a
 * re-implementation that has drifted would move every figure below for a reason that has
 * nothing to do with the question.
 *
 * The `rand()` consumption order is `makeProfiles`'s exactly: one draw for ability, then
 * one jitter draw per new domain in scope order. The floor consumes nothing from `rand`.
 */
function cutSample(
  rand: () => number,
  overlay: () => number,
  spread: number,
  perDomainAbility: boolean,
  shape: AbilityShape,
  floorProbability: number,
): Set<string> {
  const shapeDraw = (u: number) => (shape === "uniform" ? u : (u + overlay()) / 2);
  const ability = perDomainAbility ? 0 : shapeDraw(rand()) * (MAX_DEPTH + 1);
  const floored = overlay() < floorProbability;
  const cut = new Map<string, number>();
  const raw = new Set<string>();
  for (const id of FULL) {
    const dom = domainOf(id);
    if (!cut.has(dom)) {
      // Drawn whether or not the floor overrides it, so the shared stream stays aligned.
      const drawn = perDomainAbility
        ? shapeDraw(rand()) * (MAX_DEPTH + 1)
        : Math.min(
            MAX_DEPTH + 1,
            Math.max(0, ability + (spread === 0 ? 0 : (rand() * 2 - 1) * spread)),
          );
      const floor = floored && dom === ERA_ONE_DOMAIN ? ERA_ONE_MAX_DEPTH + 1 : 0;
      cut.set(dom, Math.max(drawn, floor));
    }
    if (depthOf(id) < (cut.get(dom) ?? 0)) raw.add(id);
  }
  return closeDownward(raw, FULL);
}

/** Punch independent holes in era one, after closure and without re-closing. */
function withIsolatedGaps(
  known: Set<string>,
  overlay: () => number,
  rate: number,
): Set<string> {
  if (rate <= 0) return known;
  const out = new Set(known);
  for (const id of ERA_ONE) {
    if (out.has(id) && overlay() < rate) out.delete(id);
  }
  return out;
}

function makePrior(
  name: string,
  note: string,
  shape: AbilityShape,
  floorProbability: number,
  gapRate: number,
): Prior {
  const shapes: readonly { spread: number; perDomain: boolean }[] = [
    { spread: 0, perDomain: false },
    { spread: 2.5, perDomain: false },
    { spread: 0, perDomain: true },
  ];
  return {
    name,
    note,
    sample(rand, overlay, index) {
      const s = shapes[index % shapes.length] as { spread: number; perDomain: boolean };
      const known = cutSample(
        rand,
        overlay,
        s.spread,
        s.perDomain,
        shape,
        floorProbability,
      );
      return withIsolatedGaps(known, overlay, gapRate);
    },
  };
}

/** P0 — what ships, and what every published figure was measured against. */
const P0: Prior = {
  name: "P0 shipped",
  note: "uniform ability, no floor: `makeProfiles` exactly",
  sample(rand, _overlay, index) {
    return (SHIPPED_PROFILES[index % SHIPPED_PROFILES.length] as Profile).sample(
      rand,
      FULL,
    );
  },
};

/** P1 — ONE change from P0: the era-one floor. Isolates the lead's ask by itself. */
const P1 = makePrior(
  "P1 floor",
  `uniform ability + era-one floor ${ERA_ONE_FLOOR}`,
  "uniform",
  ERA_ONE_FLOOR,
  0,
);

/** P2 — one change from P1: an ability distribution with a middle. */
const P2 = makePrior(
  "P2 realistic",
  `triangular ability + era-one floor ${ERA_ONE_FLOOR}`,
  "triangular",
  ERA_ONE_FLOOR,
  0,
);

/** P3 — one change from P2: era one can fail the graph's implication. THE RISK PRIOR. */
const P3 = makePrior(
  "P3 gaps",
  `P2 + independent era-one gaps at ${ISOLATED_GAP_RATE}/node`,
  "triangular",
  ERA_ONE_FLOOR,
  ISOLATED_GAP_RATE,
);

const PRIORS: readonly Prior[] = [P0, P1, P2, P3];
/** The three the sweep is carried across: what ships, the realistic one, and the risky one. */
const SWEEP_PRIORS: readonly Prior[] = [P0, P2, P3];

/** The two streams for learner `i`. The first is every sibling harness's seed expression. */
function streams(i: number): { rand: () => number; overlay: () => number } {
  return {
    rand: mulberry32(0x85ebca6b ^ (i * 2246822519)),
    overlay: mulberry32(0x9e3779b9 ^ (i * 2654435761)),
  };
}

// ── The era decision, re-derived (identical to `coverage-sweep.sim.test.ts`) ──

/**
 * `eraPlacementFromSeed` as a number: the 1-based position of the FIRST era that does not
 * fire, where an era fires when every one of its nodes reads `>= 2`. Every era firing
 * returns the LAST era's position, which is that function's own `clearedEverything`
 * branch — *"a learner has to stand somewhere"*.
 *
 * `known` here is a placement map that ALREADY carries every assumption the instrument
 * made, so an assumed node is present at 2 rather than absent. That is the whole
 * difference between this lever and the coverage lever #606 priced: a node the instrument
 * stops ASKING about is absent and reads 0, and the era holding it can never fire; a node
 * the instrument ASSUMES is present at 2 and its era fires. Same silence, opposite sign.
 */
function placementIndex(placementByNode: ReadonlyMap<string, number>): number {
  const passes = (nodeId: string) => (placementByNode.get(nodeId) ?? 0) >= 2;
  for (let index = 0; index < ERAS.length; index++) {
    const era = ERAS[index] as { nodes: readonly string[] };
    if (!era.nodes.every(passes)) return index + 1;
  }
  return ERAS.length;
}

/** Where a perfect instrument would place this learner. Same function, truth input. */
function truthPlacementIndex(known: ReadonlySet<string>): number {
  const perfect = new Map<string, number>();
  for (const id of known) perfect.set(id, 3);
  return placementIndex(perfect);
}

// ── A traced driver over the shipped engine ──────────────────────────────────

interface TracedStep {
  node: string;
  correct: boolean;
  /** The decision this item produced for the node, or undefined if another item follows. */
  decided?: "passed" | "failed";
}

interface TracedRun {
  state: WalkState;
  items: number;
  trace: TracedStep[];
}

/**
 * `students.ts`'s `runWalk`, with the per-item trace kept.
 *
 * The trace is what §6 needs and the shared driver does not carry: "how many items until
 * the instrument could have noticed" is a question about item POSITIONS, and an item count
 * plus a final state cannot answer it. It drives the same three exported engine functions
 * in the same order, and §6.0 asserts it agrees with `runWalk` item for item on a sample
 * rather than leaving that to inspection — a second driver that had drifted would make
 * every latency below a measurement of the drift.
 */
function runWalkTraced(
  scope: readonly string[],
  responses: Responses,
  policy: WalkPolicy,
  attemptOffset: ReadonlyMap<string, number> = new Map(),
): TracedRun {
  let state = startWalk({ scope, entryTier: 2 }, undefined, policy);
  let items = 0;
  const trace: TracedStep[] = [];
  while (!isWalkComplete(state)) {
    const node = currentProbeNode(state);
    if (!node) break;
    const attempt =
      (state.probed[node]?.outcomes.length ?? 0) + (attemptOffset.get(node) ?? 0);
    const correct = responses.get(node)?.[attempt] ?? false;
    state = recordScoredOutcome(state, correct, undefined, policy);
    items += 1;
    trace.push({ node, correct, decided: state.probed[node]?.result });
    if (items > 100_000) throw new Error("walk did not terminate");
  }
  return { state, items, trace };
}

// ── The instruments ──────────────────────────────────────────────────────────

/**
 * ANCHORS — the fewest era-one nodes whose in-era prerequisite closures cover the era.
 *
 * `NUM.4` (evaluate and simplify algebraic expressions) has `NUM.S`, `NUM.F`, `NUM.2` and
 * `NUM.3` as its transitive prerequisites, so one measured inference-licensed pass at
 * `NUM.4` credits five of era one's six nodes through machinery that already ships
 * (`licensesInference` + `deriveSelStatus`). `NUM.5` (ratios, rates, proportions,
 * percents) is not below `NUM.4` and is not below anything else in the era, so it is the
 * one era-one node no other era-one pass can reach.
 *
 * That is why the anchor ladder is `6 -> 2 -> 1 -> 0` and not an arbitrary thinning: 2 is
 * the smallest set that dominates the era, 1 is that set minus the near-isolated node, and
 * 0 is the unconditional assumption.
 */
const ANCHOR_LADDER: readonly { label: string; anchors: readonly string[] }[] = [
  { label: "ask all 6", anchors: ERA_ONE },
  { label: "anchor NUM.4+NUM.5", anchors: ["NUM.4", "NUM.5"] },
  { label: "anchor NUM.4", anchors: ["NUM.4"] },
  { label: "assume outright", anchors: [] },
];

/** An instrument: which nodes are asked, and which are assumed passed without asking. */
interface Instrument {
  label: string;
  /** The walk scope handed to the shipped engine. */
  scope: readonly string[];
  /** Nodes credited at placement 2 without being asked. */
  assumed: readonly string[];
  /**
   * When set, the assumption holds only if every anchor was measured `passed`. An anchor
   * that failed withdraws it, and the assumed nodes fall back to whatever the instrument
   * can say about them — which, since they were never asked, is nothing.
   */
  conditionalOn: readonly string[];
}

/** Eras 1..k, minus the anchors kept in scope, assumed; everything else asked. */
function assumeEras(
  eraCount: number,
  anchors: readonly string[],
  conditional: boolean,
): Instrument {
  const candidates = ERAS.slice(0, eraCount).flatMap((e) => e.nodes);
  const anchorSet = new Set(anchors);
  const assumed = candidates.filter((id) => !anchorSet.has(id));
  const assumedSet = new Set(assumed);
  return {
    label:
      `assume eras 1-${eraCount}` +
      (anchors.length ? ` after ${anchors.join("+")}` : " outright") +
      (conditional && anchors.length ? " [conditional]" : ""),
    scope: FULL.filter((id) => !assumedSet.has(id)),
    assumed,
    conditionalOn: conditional ? anchors : [],
  };
}

/** The shipped instrument: everything asked, nothing assumed. */
const SHIPPED_INSTRUMENT: Instrument = {
  label: "shipped (62)",
  scope: FULL,
  assumed: [],
  conditionalOn: [],
};

/**
 * The coverage lever, for the comparison the brief asks for. Whole eras dropped from the
 * deep end, prerequisite-closed, with `ALWAYS_ADMINISTERED` re-admitted — `#606`'s
 * `derivedHorizon`, which is the only reduced ladder a shipped build could compose.
 * Dropped nodes are NOT assumed: they are absent, which is exactly the asymmetry.
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

function prereqClosed(ids: readonly string[]): readonly string[] {
  let kept = new Set(ids);
  for (;;) {
    const next = new Set(
      [...kept].filter((id) => inScopePrereqs(id).every((p) => kept.has(p))),
    );
    if (next.size === kept.size) return FULL.filter((id) => next.has(id));
    kept = next;
  }
}

function coverageHorizon(eraCount: number): Instrument {
  const keep = new Set([
    ...ERAS.slice(0, eraCount).flatMap((e) => e.nodes),
    ...ALWAYS_ADMINISTERED,
  ]);
  return {
    label: `coverage: horizon at era ${eraCount}`,
    scope: prereqClosed(FULL.filter((id) => keep.has(id))),
    assumed: [],
    conditionalOn: [],
  };
}

// ── Measurement ──────────────────────────────────────────────────────────────

interface Placement {
  error: number[];
  unearnedHandedOver: number[];
  replayedHeld: number[];
}

interface Cell {
  instrument: string;
  prior: string;
  scopeSize: number;
  assumedCount: number;
  items: number[];
  nodesProbed: number[];
  truncatedRate: number;
  /** Truth accuracy over the ASKED scope — the denominator every earlier sweep uses. */
  accuracyInScope: number[];
  /** Truth accuracy over all 62, an assumed node scored against what the learner holds. */
  accuracyWhole: number[];
  sentBackWhole: number[];
  /** Skills credited that the learner does not hold, over all 62. */
  falsePassWhole: number[];
  /** Of those, the ones credited by ASSUMPTION rather than by a measured or inferred pass. */
  wronglyAssumed: number[];
  /** Sessions in which at least one assumed node was not held. */
  wrongAssumptionRate: number;
  named: number[];
  namedAnyRate: number;
  placement: Placement;
  truthIndex: number[];
  /** Era-one nodes probed / items spent on era one / confirmation items spent on era one. */
  eraOneProbed: number[];
  eraOneItems: number[];
  eraOneConfirmItems: number[];
  /**
   * Two closed READINGS of a possibly-incoherent truth, because `resolveKnowledgeState` is
   * downward-closed by construction and cannot represent a learner who holds `LF.1` and
   * not `NUM.5`. Neither is the optimum — that is a minimum-cost closure problem — so they
   * are reported as what they are: the two obvious repairs, drop the dependents or credit
   * the missing prerequisite. The best achievable accuracy lies between the larger of them
   * and 100%, and the gap from 100% is the part of P3 no instrument obeying the DAG can win.
   */
  closedDownAccuracy: number[];
  closedUpAccuracy: number[];
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
    const handed = ERAS.slice(0, placed - 1).flatMap((e) => e.nodes);
    into.unearnedHandedOver.push(handed.filter((id) => !known.has(id)).length);
  }
  if (placed < truth) {
    const replay = ERAS.slice(placed - 1, truth - 1).flatMap((e) => e.nodes);
    into.replayedHeld.push(replay.filter((id) => known.has(id)).length);
  }
}

const ERA_ONE_SET = new Set(ERA_ONE);

function measureCell(
  instrument: Instrument,
  prior: Prior,
  n: number = N * 3,
  policy: WalkPolicy = DEFAULT_WALK_POLICY,
): Cell {
  const scopeSet = new Set(instrument.scope);
  const assumedSet = new Set(instrument.assumed);
  const cell: Cell = {
    instrument: instrument.label,
    prior: prior.name,
    scopeSize: instrument.scope.length,
    assumedCount: instrument.assumed.length,
    items: [],
    nodesProbed: [],
    truncatedRate: 0,
    accuracyInScope: [],
    accuracyWhole: [],
    sentBackWhole: [],
    falsePassWhole: [],
    wronglyAssumed: [],
    wrongAssumptionRate: 0,
    named: [],
    namedAnyRate: 0,
    placement: emptyPlacement(),
    truthIndex: [],
    eraOneProbed: [],
    eraOneItems: [],
    eraOneConfirmItems: [],
    closedDownAccuracy: [],
    closedUpAccuracy: [],
  };
  let truncated = 0;
  let namedAny = 0;
  let wrongAssumption = 0;

  for (let i = 0; i < n; i++) {
    const { rand, overlay } = streams(i);
    const known = prior.sample(rand, overlay, i);
    const responses = drawResponses(known, FULL, rand, MILD.slip, MILD.guess);

    const run = runWalk(instrument.scope, responses, policy);
    cell.items.push(run.items);
    cell.nodesProbed.push(probedNodeCount(run.state));
    if (run.state.ceiling_reached === true) truncated += 1;

    const resolved = resolveKnowledgeState(run.state);
    const placement = new Map<string, number>();
    const status = new Map<string, string>();
    let okInScope = 0;
    for (const resolution of resolved) {
      const seed = placementFor(resolution, run.state.probed[resolution.node_id]);
      placement.set(resolution.node_id, seed);
      status.set(resolution.node_id, resolution.status);
      if ((resolution.status === "passed") === known.has(resolution.node_id)) {
        okInScope += 1;
      }
    }

    // The assumption, withdrawn when an anchor did not RESOLVE passed. Resolved rather
    // than probed: an anchor is very often credited by inference from a deeper pass and
    // never served an item at all (§4), so a rule keyed on the probe record would withdraw
    // the assumption from most of the learners it was designed for.
    const granted =
      instrument.conditionalOn.length === 0 ||
      instrument.conditionalOn.every((id) => status.get(id) === "passed");
    if (granted) {
      for (const id of instrument.assumed) placement.set(id, 2);
    }

    let okWhole = 0;
    let back = 0;
    let through = 0;
    let wronglyAssumedHere = 0;
    for (const id of FULL) {
      const seed = placement.get(id) ?? 0;
      const credited = seed >= 2;
      const holds = known.has(id);
      if (credited === holds) okWhole += 1;
      if (holds && !credited) back += 1;
      if (!holds && credited) {
        through += 1;
        if (assumedSet.has(id) && granted) wronglyAssumedHere += 1;
      }
    }
    cell.accuracyInScope.push(okInScope / (instrument.scope.length || 1));
    cell.accuracyWhole.push(okWhole / FULL.length);
    cell.sentBackWhole.push(back);
    cell.falsePassWhole.push(through);
    cell.wronglyAssumed.push(wronglyAssumedHere);
    if (instrument.assumed.some((id) => !known.has(id))) wrongAssumption += 1;

    const passedSet = new Set(
      resolved.filter((r) => r.status === "passed").map((r) => r.node_id),
    );
    const namedHere = robustPassNodeIds(run.state).filter((id) => passedSet.has(id));
    cell.named.push(namedHere.length);
    if (namedHere.length > 0) namedAny += 1;

    let probedEraOne = 0;
    let itemsEraOne = 0;
    let confirmEraOne = 0;
    for (const [id, record] of Object.entries(run.state.probed)) {
      if (!ERA_ONE_SET.has(id)) continue;
      probedEraOne += 1;
      itemsEraOne += (record as ProbeRecord).outcomes.length;
      confirmEraOne += Math.max(0, (record as ProbeRecord).outcomes.length - 1);
    }
    cell.eraOneProbed.push(probedEraOne);
    cell.eraOneItems.push(itemsEraOne);
    cell.eraOneConfirmItems.push(confirmEraOne);

    const down = closeDownward(known, FULL);
    const up = new Set(known);
    for (const id of known) for (const p of inScopePrereqs(id)) up.add(p);
    let downOk = 0;
    let upOk = 0;
    for (const id of FULL) {
      if (down.has(id) === known.has(id)) downOk += 1;
      if (up.has(id) === known.has(id)) upOk += 1;
    }
    cell.closedDownAccuracy.push(downOk / FULL.length);
    cell.closedUpAccuracy.push(upOk / FULL.length);

    const truth = truthPlacementIndex(known);
    cell.truthIndex.push(truth);
    recordPlacement(cell.placement, placementIndex(placement), truth, known);
  }

  cell.truncatedRate = truncated / n;
  cell.namedAnyRate = namedAny / n;
  cell.wrongAssumptionRate = wrongAssumption / n;
  void scopeSet;
  return cell;
}

const CACHE = new Map<string, Cell>();
function measure(instrument: Instrument, prior: Prior): Cell {
  const key = `${prior.name}\u0000${instrument.label}\u0000${instrument.scope.join(",")}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const cell = measureCell(instrument, prior);
  CACHE.set(key, cell);
  return cell;
}

function lengthRow(label: string, cell: Cell): string {
  const di = dist(cell.items);
  return (
    `${label.padEnd(30)} ${String(cell.scopeSize).padStart(2)}ask ` +
    `${String(cell.assumedCount).padStart(2)}asm  ` +
    `med=${String(di.med).padStart(3)} p90=${String(di.p90).padStart(3)} ` +
    `p99=${String(di.p99).padStart(3)} max=${String(di.max).padStart(3)} ` +
    `trunc=${(100 * cell.truncatedRate).toFixed(2).padStart(5)}%  ` +
    `| acc(ask)=${(100 * mean(cell.accuracyInScope)).toFixed(1)}% ` +
    `acc(62)=${(100 * mean(cell.accuracyWhole)).toFixed(1)}%  ` +
    `| back=${mean(cell.sentBackWhole).toFixed(2)} ` +
    `fwd=${mean(cell.falsePassWhole).toFixed(2)} ` +
    `wrongly-assumed=${mean(cell.wronglyAssumed).toFixed(2)}  ` +
    `| named=${mean(cell.named).toFixed(2)} (${(100 * cell.namedAnyRate).toFixed(0)}%)`
  );
}

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
    `OVER >=1=${pctS(over(1)).padStart(6)} >=2=${pctS(over(2)).padStart(5)} ` +
    `>=3=${pctS(over(3)).padStart(5)}  ` +
    `UNDER >=1=${pctS(under(1)).padStart(6)} >=2=${pctS(under(2)).padStart(5)} ` +
    `>=3=${pctS(under(3)).padStart(5)}\n` +
    `${" ".repeat(34)}spread ` +
    keys.map((k) => `${k > 0 ? "+" : ""}${k}:${pctS(at(k))}`).join(" ")
  );
}

// ── §6. Recovery ─────────────────────────────────────────────────────────────

/**
 * When a propagate-back-down rule fires. `kind` decides which failures count, `k` how many
 * are needed, and `Infinity` is the control: never recover, which is the instrument §5
 * measures.
 */
interface Trigger {
  label: string;
  kind: "any" | "floor" | "roots";
  k: number;
}

const TRIGGERS: readonly Trigger[] = [
  { label: "never", kind: "any", k: Number.POSITIVE_INFINITY },
  { label: "ANY(1)", kind: "any", k: 1 },
  { label: "ANY(3)", kind: "any", k: 3 },
  { label: "ANY(6)", kind: "any", k: 6 },
  { label: "FLOOR(1)", kind: "floor", k: 1 },
  { label: "FLOOR(2)", kind: "floor", k: 2 },
  { label: "ROOTS(1)", kind: "roots", k: 1 },
  { label: "ROOTS(2)", kind: "roots", k: 2 },
  { label: "ROOTS(3)", kind: "roots", k: 3 },
];

interface Recovery {
  wrongShare: number;
  wrongCount: number;
  detectedGivenWrong: number;
  falseTriggerRate: number;
  latency: { med: number; p90: number; max: number };
  wrongBefore: { med: number; p90: number };
  total: { med: number; p90: number; p99: number };
  recoveryItems: number;
  /** The recovery walk's own length when it runs. Era one alone is the D1 walk. */
  recoveryWalk: { med: number; mean: number };
  triggeredShare: number;
  accuracy: number;
  placement: Placement;
  missedShare: number;
  missedCount: number;
  missedHandedOver: number;
  missedErrorMean: number;
}

/** The two node sets the triggers read, derived once per instrument. */
interface TriggerSets {
  /** In-scope nodes with at least one assumed prerequisite. Nearly all of them. */
  dependsOnAssumed: ReadonlySet<string>;
  /**
   * In-scope nodes with NO in-scope prerequisites left and at least one assumed one — the
   * floor of the reduced instrument. A failure here is the sharpest signal available: the
   * learner failed the shallowest thing the walk can offer, and every explanation the
   * instrument could still ask about has been removed. On this graph that set is exactly
   * the eight nodes sitting directly on `NUM.4`.
   */
  floor: ReadonlySet<string>;
}

function triggerSets(instrument: Instrument): TriggerSets {
  const scopeSet = new Set(instrument.scope);
  const assumedSet = new Set(instrument.assumed);
  const dependsOnAssumed = new Set<string>();
  const floor = new Set<string>();
  for (const id of instrument.scope) {
    const prereqs = inScopePrereqs(id);
    if (!prereqs.some((p) => assumedSet.has(p))) continue;
    dependsOnAssumed.add(id);
    if (!prereqs.some((p) => scopeSet.has(p))) floor.add(id);
  }
  return { dependsOnAssumed, floor };
}

/**
 * The item index at which `trigger` fires over a traced phase-one walk, or null.
 *
 * `roots` is the sharpest rule this file could construct without an engine change, and it
 * exists because `any` and `floor` both fire on learners the assumption suited: a learner
 * who genuinely belongs in era three fails `CG.1`, `FUN.1` and `TRG.1` for reasons that
 * have nothing to do with era one. `roots` additionally requires that NO floor node has
 * passed — a learner who cleared `EXP.1` has demonstrated `NUM.4` and every era-one node
 * under it, so their later failures cannot be about era one.
 */
function triggerIndex(run: TracedRun, trigger: Trigger, sets: TriggerSets): number | null {
  if (!Number.isFinite(trigger.k)) return null;
  const population = trigger.kind === "any" ? sets.dependsOnAssumed : sets.floor;
  let hits = 0;
  let floorPasses = 0;
  for (let i = 0; i < run.trace.length; i++) {
    const step = run.trace[i] as TracedStep;
    if (step.decided === "passed") {
      if (sets.floor.has(step.node)) floorPasses += 1;
      continue;
    }
    if (step.decided !== "failed") continue;
    if (!population.has(step.node)) continue;
    hits += 1;
    if (hits >= trigger.k && (trigger.kind !== "roots" || floorPasses === 0)) {
      return i + 1;
    }
  }
  return null;
}

function measureRecovery(
  instrument: Instrument,
  prior: Prior,
  trigger: Trigger,
  sets: TriggerSets,
  n: number = N * 3,
): Recovery {
  const policy = DEFAULT_WALK_POLICY;
  const assumedSet = new Set(instrument.assumed);
  const eraOneScope = FULL.filter((id) => assumedSet.has(id));
  const latency: number[] = [];
  const wrongBefore: number[] = [];
  const totals: number[] = [];
  const recoveryWalkLengths: number[] = [];
  let recoveryItems = 0;
  let accuracy = 0;
  let wrong = 0;
  let detected = 0;
  let falseTrigger = 0;
  let correct = 0;
  let missed = 0;
  let missedHanded = 0;
  let missedError = 0;
  const placement = emptyPlacement();

  for (let i = 0; i < n; i++) {
    const { rand, overlay } = streams(i);
    const known = prior.sample(rand, overlay, i);
    const responses = drawResponses(known, FULL, rand, MILD.slip, MILD.guess);

    const phase1 = runWalkTraced(instrument.scope, responses, policy);
    const assumptionWrong = instrument.assumed.some((id) => !known.has(id));
    const fireAt = triggerIndex(phase1, trigger, sets);

    let items = phase1.items;
    let probed: Record<string, ProbeRecord> = { ...phase1.state.probed };
    if (fireAt !== null) {
      const phase2 = runWalkTraced(eraOneScope, responses, policy);
      items += phase2.items;
      recoveryItems += phase2.items;
      recoveryWalkLengths.push(phase2.items);
      probed = { ...probed, ...phase2.state.probed };
    }
    totals.push(items);

    if (assumptionWrong) {
      wrong += 1;
      if (fireAt !== null) {
        detected += 1;
        latency.push(fireAt);
        wrongBefore.push(
          phase1.trace.slice(0, fireAt).filter((step) => !step.correct).length,
        );
      }
    } else {
      correct += 1;
      if (fireAt !== null) falseTrigger += 1;
    }

    // Re-resolve the MERGED record over all 62 through the shipped resolver, so a restored
    // era-one failure prunes its cone exactly as it would in a completed walk.
    const merged: WalkState = {
      scope: [...FULL],
      entry_tier: 2,
      target_tier: 0,
      current: null,
      probed,
    };
    const resolved = resolveKnowledgeState(merged);
    const place = new Map<string, number>();
    for (const resolution of resolved) {
      place.set(resolution.node_id, placementFor(resolution, probed[resolution.node_id]));
    }
    // Nodes never asked and never recovered keep the assumption.
    if (fireAt === null) for (const id of instrument.assumed) place.set(id, 2);

    let ok = 0;
    for (const id of FULL) if ((place.get(id) ?? 0) >= 2 === known.has(id)) ok += 1;
    accuracy += ok / FULL.length;

    const truth = truthPlacementIndex(known);
    const placed = placementIndex(place);
    recordPlacement(placement, placed, truth, known);
    if (assumptionWrong && fireAt === null) {
      missed += 1;
      missedHanded += instrument.assumed.filter((id) => !known.has(id)).length;
      missedError += placed - truth;
    }
  }

  const sortedLatency = [...latency].sort((a, b) => a - b);
  const sortedWrong = [...wrongBefore].sort((a, b) => a - b);
  const pick = (xs: readonly number[], p: number) =>
    xs.length === 0
      ? 0
      : (xs[
          Math.min(xs.length - 1, Math.max(0, Math.ceil((p / 100) * xs.length) - 1))
        ] as number);
  const dTotal = dist(totals);
  const dRecovery = dist(recoveryWalkLengths);
  return {
    wrongShare: wrong / n,
    wrongCount: wrong,
    detectedGivenWrong: wrong === 0 ? 0 : detected / wrong,
    falseTriggerRate: correct === 0 ? 0 : falseTrigger / correct,
    latency: {
      med: pick(sortedLatency, 50),
      p90: pick(sortedLatency, 90),
      max: sortedLatency[sortedLatency.length - 1] ?? 0,
    },
    wrongBefore: { med: pick(sortedWrong, 50), p90: pick(sortedWrong, 90) },
    total: { med: dTotal.med, p90: dTotal.p90, p99: dTotal.p99 },
    recoveryItems: recoveryItems / n,
    recoveryWalk: {
      med: recoveryWalkLengths.length === 0 ? 0 : dRecovery.med,
      mean: recoveryWalkLengths.length === 0 ? 0 : dRecovery.mean,
    },
    triggeredShare: recoveryWalkLengths.length / n,
    accuracy: accuracy / n,
    placement,
    missedShare: missed / n,
    missedCount: missed,
    missedHandedOver: missed === 0 ? 0 : missedHanded / missed,
    missedErrorMean: missed === 0 ? 0 : missedError / missed,
  };
}

// ── §7. Per era-one node ─────────────────────────────────────────────────────

interface PerNode {
  heldRate: number;
  probedRate: number;
  inferredRate: number;
  wrongRate: number;
  wrongCount: number;
  contradictedGivenWrong: number;
  /** The same signal on learners who DO hold the node — the false-positive rate. */
  contradictedGivenHeld: number;
  latency: { med: number };
}

function measurePerNode(
  instrument: Instrument,
  prior: Prior,
  n: number = N * 3,
): Map<string, PerNode> {
  const policy = DEFAULT_WALK_POLICY;
  const dependents = new Map<string, Set<string>>(
    ERA_ONE.map((id) => [id, new Set(inScopeDependents(id))]),
  );
  const held = new Map<string, number>();
  const probed = new Map<string, number>();
  const inferred = new Map<string, number>();
  const wrong = new Map<string, number>();
  const contradicted = new Map<string, number>();
  const heldContradicted = new Map<string, number>();
  const latencies = new Map<string, number[]>();
  for (const id of ERA_ONE) {
    held.set(id, 0);
    probed.set(id, 0);
    inferred.set(id, 0);
    wrong.set(id, 0);
    contradicted.set(id, 0);
    heldContradicted.set(id, 0);
    latencies.set(id, []);
  }

  for (let i = 0; i < n; i++) {
    const { rand, overlay } = streams(i);
    const known = prior.sample(rand, overlay, i);
    const responses = drawResponses(known, FULL, rand, MILD.slip, MILD.guess);

    // What the SHIPPED instrument does with each era-one node: probed, or credited free.
    const shipped = runWalk(FULL, responses, policy);
    const shippedResolved = resolveKnowledgeState(shipped.state);
    for (const resolution of shippedResolved) {
      if (!ERA_ONE_SET.has(resolution.node_id)) continue;
      if (shipped.state.probed[resolution.node_id]) {
        probed.set(resolution.node_id, (probed.get(resolution.node_id) ?? 0) + 1);
      } else if (resolution.status === "passed") {
        inferred.set(resolution.node_id, (inferred.get(resolution.node_id) ?? 0) + 1);
      }
    }

    // What evidence the ASSUME instrument produces about each era-one node it got wrong.
    const run = runWalkTraced(instrument.scope, responses, policy);
    for (const id of ERA_ONE) {
      const cone = dependents.get(id) as Set<string>;
      const at = run.trace.findIndex(
        (step) => step.decided === "failed" && cone.has(step.node),
      );
      if (known.has(id)) {
        held.set(id, (held.get(id) ?? 0) + 1);
        if (at >= 0) heldContradicted.set(id, (heldContradicted.get(id) ?? 0) + 1);
        continue;
      }
      wrong.set(id, (wrong.get(id) ?? 0) + 1);
      if (at >= 0) {
        contradicted.set(id, (contradicted.get(id) ?? 0) + 1);
        (latencies.get(id) as number[]).push(at + 1);
      }
    }
  }

  const out = new Map<string, PerNode>();
  for (const id of ERA_ONE) {
    const w = wrong.get(id) ?? 0;
    const h = held.get(id) ?? 0;
    const l = [...(latencies.get(id) as number[])].sort((a, b) => a - b);
    out.set(id, {
      heldRate: h / n,
      probedRate: (probed.get(id) ?? 0) / n,
      inferredRate: (inferred.get(id) ?? 0) / n,
      wrongRate: w / n,
      wrongCount: w,
      contradictedGivenWrong: w === 0 ? 0 : (contradicted.get(id) ?? 0) / w,
      contradictedGivenHeld: h === 0 ? 0 : (heldContradicted.get(id) ?? 0) / h,
      latency: { med: l.length === 0 ? 0 : (l[Math.floor(l.length / 2)] as number) },
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("inferring era one instead of asking about it", () => {
  it("§1 THE PRIOR THE SIMULATION ASSUMES TODAY", () => {
    const n = N * 3;
    console.log(`\n=== §1 THE PRIOR THE SIM USES TODAY, n=${n} ===`);
    console.log(
      "  `makeProfiles` draws `ability = rand() * (maxDepth + 1)` — UNIFORM over the depth\n" +
        `  range [0, ${MAX_DEPTH + 1}). Era one is exactly one domain (${ERA_ONE_DOMAIN}), so a learner's\n` +
        "  whole era-one competence is ONE draw against a threshold, not six.",
    );
    const counts = new Map<number, number>();
    const perNode = new Map<string, number>();
    let all = 0;
    let deepAndShort = 0;
    let deep = 0;
    for (let i = 0; i < n; i++) {
      const { rand, overlay } = streams(i);
      const known = P0.sample(rand, overlay, i);
      const held = ERA_ONE.filter((id) => known.has(id));
      counts.set(held.length, (counts.get(held.length) ?? 0) + 1);
      for (const id of held) perNode.set(id, (perNode.get(id) ?? 0) + 1);
      if (held.length === ERA_ONE.length) all += 1;
      // "deep" measured on the graph rather than on era membership: four late eras hold a
      // depth-0 node with no prerequisites at all (POL.3, FUN.6, EL.6, TRG.3, TRG.8), so
      // "holds something in a late era" is satisfied by almost everyone and means nothing.
      const isDeep = [...known].some((id) => depthOf(id) >= 4);
      if (isDeep) {
        deep += 1;
        if (held.length < ERA_ONE.length) deepAndShort += 1;
      }
    }
    console.log(`\n  P(holds ALL of era one)      = ${pctS(all / n)}`);
    console.log(
      `  the uniform prediction        = ${pctS((MAX_DEPTH + 1 - ERA_ONE_MAX_DEPTH) / (MAX_DEPTH + 1))} ` +
        `— P(cut > ${ERA_ONE_MAX_DEPTH}) for a cut uniform on [0, ${MAX_DEPTH + 1})`,
    );
    for (const id of ERA_ONE) {
      console.log(
        `    P(holds ${id.padEnd(6)}) = ${pctS((perNode.get(id) ?? 0) / n).padStart(6)}  ` +
          `depth=${depthOf(id)} gates ${String(inScopeDependents(id).length).padStart(2)} of 62`,
      );
    }
    console.log(
      "\n  era-one nodes held, as a histogram — note the GAPS, which are the tell that this\n" +
        "  is a threshold on one draw rather than six skills:",
    );
    for (let k = 0; k <= ERA_ONE.length; k++) {
      const c = counts.get(k) ?? 0;
      console.log(
        `    ${k} of 6: ${pctS(c / n).padStart(6)}  ${"#".repeat(Math.round((100 * c) / n))}`,
      );
    }
    console.log(
      `\n  learners with any depth>=4 skill: ${pctS(deep / n)}\n` +
        `  of ALL learners, hold a depth>=4 skill AND are short of era one: ${pctS(deepAndShort / n)}\n` +
        "  (that last figure is 0.0% only because `closeDownward` forbids it — see §2.)",
    );
  });

  it("§2.1 the local generator reproduces `makeProfiles` exactly at zero floor", () => {
    // The floor has to be applied to the ability CUT, which means re-implementing the
    // generator, which means the re-implementation is now load-bearing for every figure
    // below. Pinned rather than asserted in a comment: at zero floor and uniform shape the
    // two generators must produce the same known-set for the same seed, learner for
    // learner, or every prior below is measuring a rewrite rather than a reweighting.
    const control = makePrior("control", "", "uniform", 0, 0);
    let compared = 0;
    for (let i = 0; i < 1200; i++) {
      const a = P0.sample(streams(i).rand, streams(i).overlay, i);
      const b = control.sample(streams(i).rand, streams(i).overlay, i);
      expect([...a].sort(), `learner ${i} differs between the two generators`).toEqual(
        [...b].sort(),
      );
      compared += 1;
    }
    expect(compared, "compared no learners").toBeGreaterThanOrEqual(1000);
    console.log(
      `\n=== §2.1 GENERATOR CONTROL: ${compared} learners, ` +
        "local generator at floor 0 == `makeProfiles`, node for node ===",
    );
  });

  it("§2.2 the priors this document constructs", () => {
    const n = N * 3;
    console.log(`\n=== §2.2 THE PRIORS, n=${n} ===`);
    console.log(
      "  each is ONE change from the row above it, so any movement below can be attributed.\n" +
        "  incoherent = learners whose truth set is NOT downward-closed over the DAG, i.e.\n" +
        "  learners for whom 'competence at a deep node implies competence at its\n" +
        "  prerequisites' is FALSE. Under P0/P1/P2 that is 0.0% by construction, which is\n" +
        "  why they cannot price the risk of inferring and P3 exists.\n" +
        "  closed-down / closed-up = the two obvious downward-closed READINGS of an\n" +
        "  incoherent truth (drop the dependents, or credit the missing prerequisite).\n" +
        "  Neither is the optimum; the best achievable sits between the larger and 100%.",
    );
    for (const prior of PRIORS) {
      let all = 0;
      let incoherent = 0;
      let down = 0;
      let up = 0;
      const truthIdx: number[] = [];
      const shortBy: number[] = [];
      for (let i = 0; i < n; i++) {
        const { rand, overlay } = streams(i);
        const known = prior.sample(rand, overlay, i);
        const held = ERA_ONE.filter((id) => known.has(id)).length;
        if (held === ERA_ONE.length) all += 1;
        else shortBy.push(ERA_ONE.length - held);
        const closedDown = closeDownward(known, FULL);
        const closedUp = new Set(known);
        for (const id of known) for (const p of inScopePrereqs(id)) closedUp.add(p);
        if (!FULL.every((id) => closedDown.has(id) === known.has(id))) incoherent += 1;
        down +=
          FULL.filter((id) => closedDown.has(id) === known.has(id)).length / FULL.length;
        up += FULL.filter((id) => closedUp.has(id) === known.has(id)).length / FULL.length;
        truthIdx.push(truthPlacementIndex(known));
      }
      console.log(
        `\n  ${prior.name.padEnd(14)} ${prior.note}\n` +
          `    P(holds all of era one) = ${pctS(all / n).padStart(6)}   ` +
          `incoherent = ${pctS(incoherent / n).padStart(6)}   ` +
          `closed-down = ${pctS(down / n)}  closed-up = ${pctS(up / n)}\n` +
          `    of the learners short of era one, mean nodes missing = ${mean(shortBy).toFixed(2)}`,
      );
      const counts = new Map<number, number>();
      for (const t of truthIdx) counts.set(t, (counts.get(t) ?? 0) + 1);
      console.log(
        "    truth placement: " +
          [...counts.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([k, v]) => `era${k}:${pctS(v / n)}`)
            .join(" "),
      );
    }

    console.log(
      "\n  --- the floor swept, uniform ability (P1's family), so the reader can pick ---",
    );
    for (const p of [0, 0.5, 0.75, 0.85, 0.9, 0.95, 0.98, 1]) {
      const prior = makePrior(`floor ${p}`, "", "uniform", p, 0);
      let all = 0;
      for (let i = 0; i < n; i++) {
        const { rand, overlay } = streams(i);
        const known = prior.sample(rand, overlay, i);
        if (ERA_ONE.every((id) => known.has(id))) all += 1;
      }
      console.log(
        `    forced floor=${p.toFixed(2)} -> P(holds all of era one)=${pctS(all / n).padStart(6)}`,
      );
    }

    console.log(
      "\n  --- the isolated-gap rate swept, on P2's ability shape and floor ---\n" +
        "  the rate is per NODE; six nodes, so the share of learners with a hole is much\n" +
        "  larger than the rate. This is the knob §6's crux number is most sensitive to.",
    );
    for (const g of [0, 0.01, 0.02, 0.03, 0.05, 0.08]) {
      const prior = makePrior(`gap ${g}`, "", "triangular", ERA_ONE_FLOOR, g);
      let all = 0;
      let incoherent = 0;
      for (let i = 0; i < n; i++) {
        const { rand, overlay } = streams(i);
        const known = prior.sample(rand, overlay, i);
        if (ERA_ONE.every((id) => known.has(id))) all += 1;
        const closedDown = closeDownward(known, FULL);
        if (!FULL.every((id) => closedDown.has(id) === known.has(id))) incoherent += 1;
      }
      console.log(
        `    gap=${g.toFixed(2)}/node -> P(holds all of era one)=${pctS(all / n).padStart(6)}  ` +
          `incoherent=${pctS(incoherent / n).padStart(6)}`,
      );
    }
  });

  it("§3 THE SHIPPED BASELINE, under every prior", () => {
    console.log(`\n=== §3 THE SHIPPED INSTRUMENT, DEFAULT_WALK_POLICY, n=${N * 3} ===`);
    // The P0 row is the anchor. `docs/Diagnostic_Tail_Cut_Landed.md` §2.1 records the live
    // instrument at 36 / 47 / 53 / 58, 0.00% truncated, 95.6% accuracy, 2.34 sent back,
    // 0.40 through, 2.36 named in 58% of sessions, and #606 reproduces the same row on a
    // separately written harness. If it has moved, nothing below is worth reading. The
    // figures are printed rather than the document's name, which is what keeps this file
    // out of `test/ciScopeFilter.test.ts`'s "could be opening that markdown" population.
    console.log(
      "  the P0 row is the anchor. The landed tail-cut record §2.1 and #606 both give\n" +
        "  36 / 47 / 53 / 58, 0.00% truncated, 95.6% accuracy, 2.34 sent back, 0.40 through,\n" +
        "  2.36 named in 58% of sessions. If it has moved, nothing below is worth reading.",
    );
    console.log(
      `  policy: livePassClosure=${DEFAULT_WALK_POLICY.livePassClosure}` +
        ` liveConsequenceFrom=${DEFAULT_WALK_POLICY.liveConsequenceFrom}` +
        ` maxItems=${DEFAULT_WALK_POLICY.maxItems}` +
        ` confirmThreshold=${confirmThresholdFor(62, DEFAULT_WALK_POLICY.confirmScopeFraction)}`,
    );
    for (const prior of PRIORS) {
      const cell = measure(SHIPPED_INSTRUMENT, prior);
      console.log(`  ${lengthRow(prior.name, cell)}`);
      console.log(`  ${" ".repeat(4)}${errorSpread(cell.placement)}`);
    }
  });

  it("§4 THE PRIZE: what era one actually costs the shipped instrument", () => {
    console.log(`\n=== §4 WHAT ERA ONE COSTS TODAY, n=${N * 3} ===`);
    console.log(
      "  the ceiling on anything this idea can save. An era-one node the walk never probes\n" +
        "  is already free — `licensesInference` credits a passed node's whole in-scope\n" +
        "  prerequisite closure, and every era-one node except NUM.5 sits under NUM.4.",
    );
    for (const prior of PRIORS) {
      const cell = measure(SHIPPED_INSTRUMENT, prior);
      const di = dist(cell.items);
      console.log(
        `  ${prior.name.padEnd(14)} total items med=${di.med} mean=${di.mean.toFixed(1)}  ` +
          `| era-one nodes probed=${mean(cell.eraOneProbed).toFixed(2)} of 6  ` +
          `era-one items=${mean(cell.eraOneItems).toFixed(2)}  ` +
          `of which confirmations=${mean(cell.eraOneConfirmItems).toFixed(2)}  ` +
          `(${pctS(mean(cell.eraOneItems) / di.mean)} of the walk)`,
      );
    }

    console.log(
      "\n  --- why the PASS side has nothing left to relax: the threshold is 7 ---\n" +
        "  a one-item decision is taken when the decision's reach is BELOW the threshold.\n" +
        "  reach is passClosure for a pass and failCone for a miss, so the two sides of the\n" +
        "  same node can sit on opposite sides of the bar.",
    );
    const threshold = confirmThresholdFor(62, DEFAULT_WALK_POLICY.confirmScopeFraction);
    for (const era of ERAS) {
      const rows = era.nodes.map((id) => ({
        id,
        pc: inScopePrereqs(id).length,
        fc: inScopeDependents(id).length,
      }));
      const onePass = rows.filter((r) => r.pc < threshold).length;
      const oneFail = rows.filter((r) => r.fc < threshold).length;
      console.log(
        `    ${era.id.padEnd(16)} ${String(era.nodes.length).padStart(2)} nodes  ` +
          `pass decides on 1 item: ${String(onePass).padStart(2)}/${era.nodes.length}  ` +
          `fail decides on 1 item: ${String(oneFail).padStart(2)}/${era.nodes.length}`,
      );
    }
    console.log("\n  era one, node by node:");
    for (const id of ERA_ONE) {
      const pc = inScopePrereqs(id).length;
      const fc = inScopeDependents(id).length;
      console.log(
        `    ${id.padEnd(6)} passClosure=${String(pc).padStart(2)} (${pc < threshold ? "PASS COSTS 1 ITEM" : "pass buys a confirm"})  ` +
          `failCone=${String(fc).padStart(2)} (${fc < threshold ? "fail costs 1 item" : "MISS BUYS A CONFIRM"})`,
      );
    }
  });

  it("§5 THE SWEEP: inferring downward, from asking all six to asking none", () => {
    console.log(`\n=== §5 THE ASYMMETRY SWEPT, n=${N * 3} ===`);
    console.log(
      "  ask = nodes the walk may probe. asm = nodes credited at placement 2 without being\n" +
        "  asked. wrongly-assumed = of those, the ones the learner does not hold.\n" +
        "  The coverage rows are #606's lever on the same cohort, for contrast: a DROPPED\n" +
        "  node is absent and reads 0, an ASSUMED node is present at 2.",
    );
    for (const prior of SWEEP_PRIORS) {
      console.log(`\n  --- ${prior.name}: ${prior.note} ---`);
      const instruments: Instrument[] = [
        SHIPPED_INSTRUMENT,
        ...ANCHOR_LADDER.slice(1).map((a) => assumeEras(1, a.anchors, false)),
        ...ANCHOR_LADDER.slice(1, 3).map((a) => assumeEras(1, a.anchors, true)),
        assumeEras(2, [], false),
        assumeEras(3, [], false),
        assumeEras(2, ["NUM.4", "EXP.1", "RAD.1"], true),
        coverageHorizon(7),
        coverageHorizon(6),
      ];
      for (const instrument of instruments) {
        console.log(`  ${lengthRow(instrument.label, measure(instrument, prior))}`);
      }
    }
  });

  it("§5.2 placement error, as a directional distribution", () => {
    console.log(`\n=== §5.2 PLACEMENT ERROR IN ERAS, n=${N * 3} ===`);
    console.log(
      "  measured era minus true era. POSITIVE = overplaced (handed ages they cannot do).\n" +
        "  NEGATIVE = underplaced (made to replay ages they already had).",
    );
    for (const prior of SWEEP_PRIORS) {
      console.log(`\n  --- ${prior.name} ---`);
      const instruments: Instrument[] = [
        SHIPPED_INSTRUMENT,
        ...ANCHOR_LADDER.slice(1).map((a) => assumeEras(1, a.anchors, false)),
        assumeEras(1, ["NUM.4"], true),
        assumeEras(2, [], false),
        assumeEras(3, [], false),
        coverageHorizon(6),
      ];
      for (const instrument of instruments) {
        const cell = measure(instrument, prior);
        console.log(
          `  ${instrument.label.padEnd(32)} ${errorSpread(cell.placement)}\n` +
            `  ${" ".repeat(32)}mean|err|=${mean(cell.placement.error.map(Math.abs)).toFixed(2)}  ` +
            `overplaced sessions=${cell.placement.unearnedHandedOver.length} ` +
            `(${mean(cell.placement.unearnedHandedOver).toFixed(2)} unheld skills handed over each)  ` +
            `sessions with a wrong assumption=${pctS(cell.wrongAssumptionRate)}`,
        );
      }
    }
  });

  it("§6.0 the traced driver agrees with the shared one, item for item", () => {
    // §6's whole content is item POSITIONS, which `students.ts`'s driver does not carry, so
    // this file drives the engine itself. A second driver that had drifted would turn every
    // latency below into a measurement of the drift, so the agreement is asserted rather
    // than inspected — on both instruments §6 uses, and on a cohort large enough that a
    // one-in-a-thousand divergence would show.
    const assumeAll = assumeEras(1, [], false);
    let compared = 0;
    for (const scope of [FULL, assumeAll.scope]) {
      for (let i = 0; i < 400; i++) {
        const { rand, overlay } = streams(i);
        const known = P3.sample(rand, overlay, i);
        const responses = drawResponses(known, FULL, rand, MILD.slip, MILD.guess);
        const shared = runWalk(scope, responses, DEFAULT_WALK_POLICY);
        const traced = runWalkTraced(scope, responses, DEFAULT_WALK_POLICY);
        expect(traced.items, `learner ${i}: item count differs`).toBe(shared.items);
        expect(traced.trace.length, `learner ${i}: trace is not the item stream`).toBe(
          shared.items,
        );
        expect(traced.state.probed, `learner ${i}: probed map differs`).toEqual(
          shared.state.probed,
        );
        compared += 1;
      }
    }
    expect(compared, "compared no walks").toBeGreaterThanOrEqual(800);
    console.log(
      `\n=== §6.0 DRIVER CONTROL: ${compared} walks over two scopes, ` +
        "traced driver == `runWalk` on items, trace length and the probed map ===",
    );
  });

  it("§6 THE CRUX: does a wrong assumption get caught, and how fast", () => {
    console.log(`\n=== §6 RECOVERY, assume era one outright, n=${N * 3} ===`);
    console.log(
      "  The lead's third claim: *if they can't do those nodes, we'll determine that very\n" +
        "  quickly when we propagate back down.* Nothing in the shipped engine does this, so\n" +
        "  the rule is modelled here and swept. Two triggers:\n" +
        "    ANY(k)   — k distinct measured failures at nodes that depend on the assumed set.\n" +
        "               Nearly every in-scope node does, so this is the crude reading.\n" +
        "    FLOOR(k) — k distinct measured failures at nodes whose in-scope prerequisites\n" +
        "               ALL passed. A failure the instrument cannot explain from anything it\n" +
        "               asked, which is the only kind that points AT the assumption.\n" +
        "  Recovery walks era one as a suffix and re-resolves the merged record through the\n" +
        "  shipped `resolveKnowledgeState`, so a restored era-one failure prunes its cone.\n" +
        "  Suffix rather than interrupt: an interrupt needs `selectNextProbe`, which is not\n" +
        "  exported. The suffix OVER-states both the exposure and the total items, and the\n" +
        "  item index of the trigger is printed beside it as the other bound.",
    );
    const assumeAll = assumeEras(1, [], false);
    const sets = triggerSets(assumeAll);
    console.log(
      `\n  of the ${assumeAll.scope.length} nodes still asked, ` +
        `${sets.dependsOnAssumed.size} depend on at least one assumed node — which is why\n` +
        `  ANY(1) fires on almost anyone who fails anything. The FLOOR set is ` +
        `${sets.floor.size} nodes: ${[...sets.floor].join(", ")}.`,
    );

    for (const prior of SWEEP_PRIORS) {
      console.log(`\n  --- ${prior.name}: ${prior.note} ---`);
      const shippedCell = measure(SHIPPED_INSTRUMENT, prior);
      const shippedMedian = dist(shippedCell.items).med;
      for (const trigger of TRIGGERS) {
        const r = measureRecovery(assumeAll, prior, trigger, sets);
        console.log(
          `  ${trigger.label.padEnd(10)} ` +
            `WRONG ASSUMPTION (${pctS(r.wrongShare)}, n=${r.wrongCount}): ` +
            `caught=${pctS(r.detectedGivenWrong).padStart(6)}  ` +
            `items until the trigger med=${r.latency.med} p90=${r.latency.p90} max=${r.latency.max}  ` +
            `| wrong answers before it med=${r.wrongBefore.med} p90=${r.wrongBefore.p90}`,
        );
        console.log(
          `  ${" ".repeat(10)} CORRECT ASSUMPTION: false trigger=${pctS(r.falseTriggerRate).padStart(6)}  ` +
            `| fires on ${pctS(r.triggeredShare)} of ALL sessions, ` +
            `and the re-walk costs med=${r.recoveryWalk.med} mean=${r.recoveryWalk.mean.toFixed(1)} items when it does`,
        );
        console.log(
          `  ${" ".repeat(10)} ALL: items med=${r.total.med} p90=${r.total.p90} p99=${r.total.p99} ` +
            `(shipped med ${shippedMedian})  recovery=${r.recoveryItems.toFixed(2)} items/session  ` +
            `acc(62)=${pctS(r.accuracy)}`,
        );
        console.log(`  ${" ".repeat(10)} AFTER RECOVERY: ${errorSpread(r.placement)}`);
        console.log(
          `  ${" ".repeat(10)} NEVER CAUGHT and wrong: ${pctS(r.missedShare)} of all sessions ` +
            `(n=${r.missedCount}), handed ${r.missedHandedOver.toFixed(2)} era-one skills they ` +
            `do not hold, placement error mean=${r.missedErrorMean.toFixed(2)} eras`,
        );
      }
    }
  });

  it("§6.2 the same length without any assumption, and where the items come from", () => {
    // Two controls the sweep needs and cannot supply from inside itself.
    //
    // The first is the tail knob at its most aggressive setting. This is the one place the
    // file spreads over `DEFAULT_WALK_POLICY`, because the point is precisely that the
    // length assuming era one buys is available from a field that already exists — read at
    // full 62-node coverage, so nothing is confounded with a scope change.
    //
    // The second is the decomposition. §4 measured era one's own items at under one under a
    // realistic prior, and §5 measures the assumption saving at four. The gap is not era
    // one's questions: removing era one from the SCOPE collapses the static pass-closure of
    // every node above it (`LIN.1` goes from 5 in-scope prerequisites to 0), so those nodes
    // stop buying a confirming item. That is the same quantity `livePassClosure` already
    // discounts — hence the first control.
    console.log(`\n=== §6.2 CONTROLS, n=${N * 3} ===`);
    const fromFirstItem: WalkPolicy = { ...DEFAULT_WALK_POLICY, liveConsequenceFrom: 0 };
    const assumeAll = assumeEras(1, [], false);
    for (const prior of SWEEP_PRIORS) {
      const shipped = measure(SHIPPED_INSTRUMENT, prior);
      const assumed = measure(assumeAll, prior);
      const knob = measureCell(SHIPPED_INSTRUMENT, prior, N * 3, fromFirstItem);
      console.log(`\n  --- ${prior.name} ---`);
      console.log(`  ${lengthRow("shipped (62)", shipped)}`);
      console.log(`  ${lengthRow("assume era one outright", assumed)}`);
      console.log(`  ${lengthRow("62 nodes, liveFrom=0", knob)}`);
      const shippedItems = dist(shipped.items);
      const assumedItems = dist(assumed.items);
      console.log(
        `  decomposition: the assumption saves ` +
          `${(shippedItems.mean - assumedItems.mean).toFixed(2)} items on average, of which\n` +
          `                 ${mean(shipped.eraOneItems).toFixed(2)} are era one's own questions and ` +
          `${(shippedItems.mean - assumedItems.mean - mean(shipped.eraOneItems)).toFixed(2)} are ` +
          `confirmations elsewhere\n                 that stop being bought once era one leaves the scope.`,
      );
    }
    console.log(
      "\n  --- how many era-2+ nodes lose their pass-side confirmation when era one goes ---",
    );
    const threshold = confirmThresholdFor(62, DEFAULT_WALK_POLICY.confirmScopeFraction);
    const reduced = confirmThresholdFor(
      assumeAll.scope.length,
      DEFAULT_WALK_POLICY.confirmScopeFraction,
    );
    const scopeSet = new Set(assumeAll.scope);
    const flipped = assumeAll.scope.filter((id) => {
      const before = inScopePrereqs(id).length;
      const after = inScopePrereqs(id).filter((p) => scopeSet.has(p)).length;
      return before >= threshold && after < reduced;
    });
    console.log(
      `  threshold falls ${threshold} -> ${reduced} (it is a share of the scope), and ` +
        `${flipped.length} of the ${assumeAll.scope.length}\n  remaining nodes cross from ` +
        `"a pass buys a confirming item" to "a pass costs one item":\n  ${flipped.join(", ")}`,
    );
  });

  it("§7 which era-one skills are safely inferable, and which are not", () => {
    console.log(`\n=== §7 ERA ONE, NODE BY NODE, n=${N * 3} ===`);
    console.log(
      "  gates = in-scope transitive dependents. free-evidence = the share of shipped\n" +
        "  sessions in which the node was credited WITHOUT being probed (an inference-\n" +
        "  licensed deeper pass credited it). contradicted = of the sessions where the node\n" +
        "  is assumed and the learner does not hold it, the share in which the walk failed\n" +
        "  at least one node that DEPENDS on it — the only evidence a propagate-back-down\n" +
        "  rule could ever act on. `when HELD` is the same signal on learners who DO hold\n" +
        "  the node: a rule whose two rates are equal is not detecting anything, it is\n" +
        "  re-asking everybody, and the gap between them is all the evidence there is.",
    );
    const assumeAll = assumeEras(1, [], false);
    for (const prior of SWEEP_PRIORS) {
      console.log(`\n  --- ${prior.name} ---`);
      const stats = measurePerNode(assumeAll, prior);
      for (const id of ERA_ONE) {
        const s = stats.get(id) as PerNode;
        console.log(
          `    ${id.padEnd(6)} gates=${String(inScopeDependents(id).length).padStart(2)}  ` +
            `P(held)=${pctS(s.heldRate).padStart(6)}  ` +
            `free-evidence=${pctS(s.inferredRate).padStart(6)}  ` +
            `probed today=${pctS(s.probedRate).padStart(6)}  ` +
            `| assumed WRONG in ${pctS(s.wrongRate).padStart(6)} (n=${String(s.wrongCount).padStart(4)}), ` +
            `contradicted when WRONG=${s.wrongCount > 0 ? pctS(s.contradictedGivenWrong).padStart(6) : "   n/a"} ` +
            `when HELD=${pctS(s.contradictedGivenHeld).padStart(6)}  ` +
            `(first contradicting item med=${s.wrongCount > 0 ? s.latency.med : "n/a"})`,
        );
      }
    }
  });
});
