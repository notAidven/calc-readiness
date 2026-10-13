import {
  ERA_SEQUENCE,
  type EraId,
  getNode,
  getProductNodes,
  prereqDepth,
} from "@cr/skill-graph";
import { describe, it } from "vitest";

import { confirmThresholdFor } from "../src/adjudicator";
import {
  currentProbeNode,
  DEFAULT_WALK_POLICY,
  isWalkComplete,
  recordScoredOutcome,
  resolveKnowledgeState,
  startWalk,
  type WalkPolicy,
  type WalkState,
} from "../src/walk";

/**
 * ERA-LEVEL PLACEMENT ACCURACY — a measurement tool, NOT a CI test.
 *
 * Third sibling of `probe-cost.sim.test.ts` and `accuracy-cohorts.sim.test.ts`, sharing
 * their method and their CI exclusion exactly: it lives outside `engines/diagnostic/src/`
 * so neither the root `vitest.config.ts` nor `vitest.browser.config.ts` collects it, and it
 * is outside the package `tsconfig` (`include: ["src/**\/*"]`) so `tsc --build` never sees
 * it. `engines/diagnostic/sim/vitest.sim.config.ts` is the only way to run it.
 *
 * ## Why it exists
 *
 * `docs/superpowers/specs/2026-08-01-test-out-placement-experience.md` §5 offers five
 * options for what a tested-out learner does, and **every one of them assumes the
 * instrument can decide an ERA**. The published figure is 96.0% **per node**
 * (`docs/Diagnostic_11_Node_Scope_Measurement.md` §4), and per-node accuracy is not the
 * claim: testing out of a five- or six-node era requires being right about **every node in
 * it**, and a fail-open at era level hands a learner an era they needed.
 *
 * So this measures the era-level decision directly rather than deriving it:
 *
 *   1. The published 11-node aggregate, reproduced, so everything below is anchored.
 *   2. Per era, the 2x2 of `fires` (all era nodes resolved `passed`) against
 *      `trulyKnown` (all era nodes in the student's ground truth).
 *   3. **The conditional the options actually need**: P(not truly known | fires). That is
 *      the rate at which the instrument hands over an era the learner needed.
 *   4. Cumulative across eras one to four, the record's worked case.
 *   5. The independence comparison. The product of an era's per-node accuracies is what
 *      era accuracy WOULD be if node errors were independent. Printed beside the measured
 *      figure and labelled as a computation, never as a measurement.
 *   6. **The generator-artifact control, which is the point of the whole file.** The
 *      student model draws ONE ability cut PER DOMAIN (`students.ts` lines 24-35: *"same
 *      depth nodes in the same domain almost always share a truth value, by construction
 *      of the generator, not by anything about the DAG"*). **Eras one to five are each
 *      exactly one domain**, so on those eras the generator's correlation boundary IS the
 *      era boundary, and a good era-level number there is partly the generator. Eras six
 *      to eight span two to four domains, where the generator does NOT correlate across
 *      the era. The single-domain / multi-domain gap under one generator is therefore a
 *      measured lower bound on how much of the good number is an artifact.
 *      Also split by profile, since `homogeneous` (no jitter) is maximal correlation and
 *      `independent-strands` is independent per-domain cuts.
 *
 * ## What it cannot establish, stated here so a reader cannot take the number for more
 *
 * Ground truth is synthetic, so every figure below is the instrument's self-consistency
 * against a MODEL of a student, never placement validity against a human. That caveat is
 * `Diagnostic_11_Node_Scope_Decision_Evidence.md` §5.1's and it is inherited unchanged.
 * The era-level figures inherit it and one more on top, item 6 above.
 *
 * ## Running it
 *
 *   echo 2000 > engines/diagnostic/sim/sample-size.local
 *   npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
 *     engines/diagnostic/sim/era-placement.sim.test.ts --disableConsoleIntercept
 *
 * `--disableConsoleIntercept` is REQUIRED: under vitest 4 a passing test's `console.log`
 * is swallowed without it, so the harness runs green and prints nothing. Always check the
 * printed `n=` before believing a sample size.
 *
 * Recorded results:
 * `docs/superpowers/specs/2026-08-01-diagnostic-placement-accuracy.md`.
 */

const PRODUCT_IDS = getProductNodes().map((n) => n.id);
const PRODUCT_SET = new Set(PRODUCT_IDS);

const N = Number(process.env.SIM_N ?? 500);

const depthOf = prereqDepth;
const domainOf = (id: string): string => getNode(id)?.domain ?? id.split(".")[0] ?? id;
/**
 * Taken over the FULL 62-node in-product scope, never over the scope under test.
 * `accuracy-cohorts.sim.test.ts` lines 67-70 record why: it sets the ability range the
 * profiles draw from, so narrowing it shifts the whole cohort and the published 96.0%
 * stops reproducing (measured there at 97.4%).
 */
const MAX_DEPTH = Math.max(...PRODUCT_IDS.map(depthOf));

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function closeDownward(
  candidate: ReadonlySet<string>,
  scope: readonly string[],
): Set<string> {
  const scopeSet = new Set(scope);
  const order = [...scope].sort((a, b) => depthOf(a) - depthOf(b) || a.localeCompare(b));
  const known = new Set<string>();
  for (const id of order) {
    if (!candidate.has(id)) continue;
    const prereqs = (getNode(id)?.prereqs ?? []).filter((p) => scopeSet.has(p));
    if (prereqs.every((p) => known.has(p))) known.add(id);
  }
  return known;
}

interface Profile {
  name: string;
  sample(rand: () => number, scope: readonly string[]): Set<string>;
}

function cutProfile(name: string, spread: number): Profile {
  return {
    name,
    sample(rand, scope) {
      const ability = rand() * (MAX_DEPTH + 1);
      const cut = new Map<string, number>();
      const raw = new Set<string>();
      for (const id of scope) {
        const dom = domainOf(id);
        if (!cut.has(dom)) {
          const jitter = spread === 0 ? 0 : (rand() * 2 - 1) * spread;
          cut.set(dom, Math.min(MAX_DEPTH + 1, Math.max(0, ability + jitter)));
        }
        if (depthOf(id) < (cut.get(dom) ?? 0)) raw.add(id);
      }
      return closeDownward(raw, scope);
    },
  };
}

const independentStrands: Profile = {
  name: "independent-strands",
  sample(rand, scope) {
    const cut = new Map<string, number>();
    const raw = new Set<string>();
    for (const id of scope) {
      const dom = domainOf(id);
      if (!cut.has(dom)) cut.set(dom, rand() * (MAX_DEPTH + 1));
      if (depthOf(id) < (cut.get(dom) ?? 0)) raw.add(id);
    }
    return closeDownward(raw, scope);
  },
};

const PROFILES: readonly Profile[] = [
  cutProfile("homogeneous", 0),
  cutProfile("heterogeneous", 2.5),
  independentStrands,
];

type Responses = Map<string, boolean[]>;

function drawResponses(
  known: ReadonlySet<string>,
  scope: readonly string[],
  rand: () => number,
  slip: number,
  guess: number,
): Responses {
  const table: Responses = new Map();
  for (const id of scope) {
    const k = known.has(id);
    const row: boolean[] = [];
    for (let a = 0; a < 6; a++) row.push(k ? rand() >= slip : rand() < guess);
    table.set(id, row);
  }
  return table;
}

function runWalk(
  scope: readonly string[],
  responses: Responses,
  policy: WalkPolicy,
): { state: WalkState; items: number } {
  let state = startWalk({ scope, entryTier: 2 }, undefined, policy);
  let items = 0;
  while (!isWalkComplete(state)) {
    const node = currentProbeNode(state);
    if (!node) break;
    const attempt = state.probed[node]?.outcomes.length ?? 0;
    state = recordScoredOutcome(
      state,
      responses.get(node)?.[attempt] ?? false,
      undefined,
      policy,
    );
    items += 1;
    if (items > 100_000) throw new Error("walk did not terminate");
  }
  return { state, items };
}

/** One era's decision for one student. */
interface EraOutcome {
  /** Every node of the era resolved `passed`: the instrument would hand this era over. */
  fires: boolean;
  /** Every node of the era is in the student's ground truth. */
  trulyKnown: boolean;
  /** Era nodes truly known but not resolved passed: the safe error. */
  fnNodes: number;
  /** Era nodes resolved passed but not truly known: the dangerous error. */
  fpNodes: number;
}

interface StudentRow {
  items: number;
  ceiling: boolean;
  profile: string;
  /** Nodes the walk resolved `passed`, and nodes the student truly knows. */
  passedNodes: Set<string>;
  knownNodes: Set<string>;
  /** Per-node correctness over the scope, for the independence computation. */
  nodeOk: Map<string, boolean>;
  correctNodes: number;
  falseNegatives: number;
  falsePositives: number;
  byEra: Map<EraId, EraOutcome>;
}

function evaluate(
  state: WalkState,
  items: number,
  known: ReadonlySet<string>,
  scope: readonly string[],
  erasInScope: readonly { id: EraId; nodes: readonly string[] }[],
  profile: string,
): StudentRow {
  const statusOf = new Map(
    resolveKnowledgeState(state).map((r) => [r.node_id, r.status] as const),
  );
  const nodeOk = new Map<string, boolean>();
  let correctNodes = 0;
  let falseNegatives = 0;
  let falsePositives = 0;
  for (const id of scope) {
    const passed = statusOf.get(id) === "passed";
    const truth = known.has(id);
    nodeOk.set(id, passed === truth);
    if (passed === truth) correctNodes += 1;
    else if (truth) falseNegatives += 1;
    else falsePositives += 1;
  }

  const byEra = new Map<EraId, EraOutcome>();
  for (const era of erasInScope) {
    let fires = true;
    let trulyKnown = true;
    let fnNodes = 0;
    let fpNodes = 0;
    for (const id of era.nodes) {
      const passed = statusOf.get(id) === "passed";
      const truth = known.has(id);
      if (!passed) fires = false;
      if (!truth) trulyKnown = false;
      if (truth && !passed) fnNodes += 1;
      if (!truth && passed) fpNodes += 1;
    }
    byEra.set(era.id, { fires, trulyKnown, fnNodes, fpNodes });
  }

  return {
    items,
    ceiling: state.ceiling_reached === true,
    profile,
    passedNodes: new Set(scope.filter((id) => statusOf.get(id) === "passed")),
    knownNodes: new Set(scope.filter((id) => known.has(id))),
    nodeOk,
    correctNodes,
    falseNegatives,
    falsePositives,
    byEra,
  };
}

const mean = (xs: readonly number[]) =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0
    ? 0
    : (s[Math.min(s.length - 1, Math.ceil(0.5 * s.length) - 1)] as number);
};
const pctS = (x: number) => `${(100 * x).toFixed(1)}%`;
const era_known = (outs: readonly EraOutcome[]) =>
  mean(outs.map((o) => (o.trulyKnown ? 1 : 0)));

/** Eras whose every node is in `scope`, in play order. A partial era is skipped. */
function erasWithin(scope: readonly string[]) {
  const set = new Set(scope);
  return ERA_SEQUENCE.filter((e) => e.nodes.every((n) => set.has(n))).map((e) => ({
    id: e.id,
    nodes: e.nodes.filter((n) => PRODUCT_SET.has(n)),
    domains: [...new Set(e.nodes.map(domainOf))].sort(),
  }));
}

function measure(label: string, scope: readonly string[]) {
  const eras = erasWithin(scope);
  const threshold = confirmThresholdFor(
    scope.length,
    DEFAULT_WALK_POLICY.confirmScopeFraction,
  );
  const total = N * PROFILES.length;

  console.log(`\n${"=".repeat(78)}`);
  console.log(
    `SCOPE: ${label} — ${scope.length} nodes, ${eras.length} whole eras, ` +
      `confirmThreshold=${threshold}, ceiling=${DEFAULT_WALK_POLICY.maxItems}, n=${total}`,
  );
  console.log("=".repeat(78));

  const rows: StudentRow[] = [];
  for (let i = 0; i < total; i++) {
    const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
    const profile = PROFILES[i % PROFILES.length] as Profile;
    const known = profile.sample(rand, scope);
    const responses = drawResponses(known, scope, rand, 0.1, 0.05);
    const run = runWalk(scope, responses, DEFAULT_WALK_POLICY);
    rows.push(evaluate(run.state, run.items, known, scope, eras, profile.name));
  }

  // --- 1. The per-node anchor -------------------------------------------------
  const perNode = mean(rows.map((r) => r.correctNodes / scope.length));
  console.log(
    `\n[1] PER-NODE ANCHOR   truth accuracy=${pctS(perNode)}   ` +
      `items med=${median(rows.map((r) => r.items))} mean=${mean(rows.map((r) => r.items)).toFixed(2)}   ` +
      `ceiling hit=${pctS(mean(rows.map((r) => (r.ceiling ? 1 : 0))))}`,
  );
  console.log(
    `    direction per session: mastered-sent-back=${mean(rows.map((r) => r.falseNegatives)).toFixed(3)}  ` +
      `gaps-advanced-past=${mean(rows.map((r) => r.falsePositives)).toFixed(3)}  ` +
      `ratio=${(mean(rows.map((r) => r.falseNegatives)) / Math.max(1e-9, mean(rows.map((r) => r.falsePositives)))).toFixed(1)}:1 fail-closed`,
  );

  // --- 2. The era decision, reported as SENSITIVITY and PRECISION ------------
  //
  // NOT as a raw "era-correct" rate. That rate is base-rate dominated and would be
  // actively misleading: only 7.0% of generated students know the Medieval era, so a
  // rule that never fires at all scores 93% on it. The two numbers that carry meaning
  // are conditionals, and they answer the two different questions the options ask:
  //   sensitivity P(fires | truly known)  -- of the learners who have earned the skip,
  //                                          how many get it. 1 - this is FAIL-CLOSED.
  //   precision   P(truly known | fires)  -- of the eras handed over, how many were
  //                                          earned. 1 - this is FAIL-OPEN, the unsafe
  //                                          direction, and it is THE safety number.
  // Denominators are printed beside every conditional so a reader can see when a
  // percentage is resting on a handful of students.
  console.log(
    `\n[2] THE ERA DECISION. fires = every era node resolved 'passed'.\n` +
      `    FAIL-OPEN = fires but not truly known (unsafe). FAIL-CLOSED = truly known but does not fire (safe).`,
  );
  console.log(
    `    ${"era".padEnd(17)} ${"dom".padEnd(12)} n  ` +
      `P(known)  P(fires)   sens[n]        prec[n]        fail-open  allNodesOk  indep-pred`,
  );
  for (const era of eras) {
    const outs = rows.map((r) => r.byEra.get(era.id) as EraOutcome);
    const nKnown = outs.filter((o) => o.trulyKnown).length;
    const nFires = outs.filter((o) => o.fires).length;
    const nBoth = outs.filter((o) => o.fires && o.trulyKnown).length;
    const sens = nKnown === 0 ? 0 : nBoth / nKnown;
    const prec = nFires === 0 ? 0 : nBoth / nFires;
    const failOpen = mean(outs.map((o) => (o.fires && !o.trulyKnown ? 1 : 0)));
    // MEASURED: every node of the era classified correctly. This is the event the
    // independence prediction beside it predicts, so the two are like for like.
    const allOk = mean(
      rows.map((r) => (era.nodes.every((id) => r.nodeOk.get(id)) ? 1 : 0)),
    );
    // COMPUTED, not measured: the product of this era's own per-node accuracies, which
    // is what allNodesOk WOULD be if node errors were independent.
    const indep = era.nodes.reduce(
      (acc, id) => acc * mean(rows.map((r) => (r.nodeOk.get(id) ? 1 : 0))),
      1,
    );
    console.log(
      `    ${era.id.padEnd(17)} ${era.domains.join("/").padEnd(12)} ${String(era.nodes.length).padStart(2)}  ` +
        `${pctS(era_known(outs)).padStart(7)}  ${pctS(nFires / rows.length).padStart(7)}  ` +
        `${(pctS(sens) + `[${nKnown}]`).padStart(13)}  ${(pctS(prec) + `[${nFires}]`).padStart(13)}  ` +
        `${pctS(failOpen).padStart(9)}  ${pctS(allOk).padStart(10)}  ${pctS(indep).padStart(10)}`,
    );
  }

  // --- 3. Cumulative ----------------------------------------------------------
  if (eras.length >= 2) {
    console.log(
      `\n[3] CUMULATIVE over the first k eras. The record's worked case is k=4.\n` +
        `    precision here is P(all k truly known | all k fire): of the learners handed k\n` +
        `    eras in a row, the share who had earned every one of them.`,
    );
    console.log(
      `    ${"k".padEnd(3)} ${"P(all fire)".padStart(11)} ${"P(all known)".padStart(12)} ` +
        `${"sens[n]".padStart(14)} ${"prec[n]".padStart(14)} ${"fail-open".padStart(10)} ` +
        `${"allNodesOk".padStart(11)} ${"indep-pred".padStart(11)}`,
    );
    for (let k = 1; k <= eras.length; k++) {
      const slice = eras.slice(0, k);
      const fireRow = (r: StudentRow) =>
        slice.every((e) => (r.byEra.get(e.id) as EraOutcome).fires);
      const knownRow = (r: StudentRow) =>
        slice.every((e) => (r.byEra.get(e.id) as EraOutcome).trulyKnown);
      const nFire = rows.filter(fireRow).length;
      const nKnown = rows.filter(knownRow).length;
      const nBoth = rows.filter((r) => fireRow(r) && knownRow(r)).length;
      const sens = nKnown === 0 ? 0 : nBoth / nKnown;
      const prec = nFire === 0 ? 0 : nBoth / nFire;
      const failOpen = mean(rows.map((r) => (fireRow(r) && !knownRow(r) ? 1 : 0)));
      const nodes = slice.flatMap((e) => e.nodes);
      const allOk = mean(rows.map((r) => (nodes.every((id) => r.nodeOk.get(id)) ? 1 : 0)));
      const indep = nodes.reduce(
        (acc, id) => acc * mean(rows.map((r) => (r.nodeOk.get(id) ? 1 : 0))),
        1,
      );
      console.log(
        `    ${String(k).padEnd(3)} ${pctS(nFire / rows.length).padStart(11)} ${pctS(nKnown / rows.length).padStart(12)} ` +
          `${(pctS(sens) + `[${nKnown}]`).padStart(14)} ${(pctS(prec) + `[${nFire}]`).padStart(14)} ` +
          `${pctS(failOpen).padStart(10)} ${pctS(allOk).padStart(11)} ${pctS(indep).padStart(11)}`,
      );
    }
  }

  // --- 3b. PARTIAL credit, which the all-or-nothing view understates ----------
  //
  // "Handed the era" is all-or-nothing, but the ruled gate is PER NODE: a learner with
  // five of six nodes passed keeps five buildings free and owes practice on one. So the
  // conjunction above is the right measure of "skips the era" and the wrong measure of
  // "how much work does test-out actually save". Both are reported.
  console.log(
    `\n[3b] PARTIAL CREDIT. Mean share of an era's nodes resolved 'passed', which is the\n` +
      `     share of that era's lessons a per-node test-out gate would skip.`,
  );
  console.log(
    `     ${"era".padEnd(17)} n  all-students  given-truly-known[n]  ` +
      `share of KNOWN nodes passed`,
  );
  for (const era of eras) {
    const outs = rows.map((r) => r.byEra.get(era.id) as EraOutcome);
    const passedShare = rows.map(
      (r) =>
        era.nodes.filter((id) => (r.passedNodes as Set<string>).has(id)).length /
        era.nodes.length,
    );
    const knownIdx = outs.map((o, i) => (o.trulyKnown ? i : -1)).filter((i) => i >= 0);
    // Of the era nodes this student actually knows, how many did the walk pass?
    const recallShare = rows
      .map((r) => {
        const known = era.nodes.filter((id) => (r.knownNodes as Set<string>).has(id));
        if (known.length === 0) return null;
        return (
          known.filter((id) => (r.passedNodes as Set<string>).has(id)).length / known.length
        );
      })
      .filter((x): x is number => x !== null);
    console.log(
      `     ${era.id.padEnd(17)} ${String(era.nodes.length).padStart(2)}  ` +
        `${pctS(mean(passedShare)).padStart(12)}  ` +
        `${(pctS(mean(knownIdx.map((i) => passedShare[i] as number))) + `[${knownIdx.length}]`).padStart(20)}  ` +
        `${pctS(mean(recallShare)).padStart(26)}`,
    );
  }

  // --- 3c. IS IT WORTH BUILDING? Two different ledgers, and they disagree ------
  //
  // The safety numbers above say the era gate does not hurt. They say nothing about
  // whether it helps, and the benefit depends entirely on WHICH gate is priced.
  //
  //   ALL-OR-NOTHING: an era that fires skips all of its practice, one that does not
  //   fire skips none. This is the right price for an option that hands over whole eras
  //   on the diagnostic's word (Option B).
  //
  //   PER-NODE RESIDUAL: the ruled test-out gate is per node, so a learner with five of
  //   six nodes passed practises ONE node (5 items, `Mastery_Scoring_Spec` §3) and the
  //   era's conjunction is then satisfied by mastery rather than by placement. This is
  //   the right price for Option C, whose gate reads `mastery >= 2 OR placement >= 2`
  //   PER NODE, and it is a completely different number from the first.
  {
    const scopeNodes = eras.reduce((a, e) => a + e.nodes.length, 0);
    const allOrNothing = rows.map(
      (r) =>
        eras
          .filter((e) => (r.byEra.get(e.id) as EraOutcome).fires)
          .reduce((a, e) => a + e.nodes.length, 0) / Math.max(1, scopeNodes),
    );
    const residualNodes = rows.map(
      (r) =>
        eras.flatMap((e) => e.nodes).filter((id) => !(r.passedNodes as Set<string>).has(id))
          .length,
    );
    const eligible = rows
      .map((r, i) =>
        eras.every((e) => (r.byEra.get(e.id) as EraOutcome).trulyKnown) ? i : -1,
      )
      .filter((i) => i >= 0);
    const PRACTICE_ITEMS_PER_NODE = 5;
    const baseline = scopeNodes * PRACTICE_ITEMS_PER_NODE;
    console.log(
      `\n[3c] IS IT WORTH BUILDING? Priced two ways, because the two gates differ.\n` +
        `     scope baseline under Option A = ${scopeNodes} nodes x ${PRACTICE_ITEMS_PER_NODE} items = ${baseline} practice items.`,
    );
    console.log(
      `     ALL-OR-NOTHING (whole eras handed over): share of practice removed` +
        `   all=${pctS(mean(allOrNothing))}` +
        `   eligible=${pctS(mean(eligible.map((i) => allOrNothing[i] as number)))}[${eligible.length}]`,
    );
    const resAll = mean(residualNodes);
    const resElig = mean(eligible.map((i) => residualNodes[i] as number));
    console.log(
      `     PER-NODE RESIDUAL (Option C's actual gate): nodes still owing practice` +
        `   all=${resAll.toFixed(2)} nodes = ${(resAll * PRACTICE_ITEMS_PER_NODE).toFixed(1)} items` +
        `   eligible=${resElig.toFixed(2)} nodes = ${(resElig * PRACTICE_ITEMS_PER_NODE).toFixed(1)} items ` +
        `(${pctS(1 - (resElig * PRACTICE_ITEMS_PER_NODE) / baseline)} of the baseline removed)`,
    );
  }

  // --- 4. The generator-artifact control -------------------------------------
  //
  // Compared on allNodesOk against its own independence prediction, NOT on a raw
  // era-correct rate: the multi-domain eras sit later in the sequence where almost
  // nobody knows them, so any unconditional rate compares base rates rather than
  // instruments. The LIFT over independence is what isolates the correlation.
  const single = eras.filter((e) => e.domains.length === 1);
  const multi = eras.filter((e) => e.domains.length > 1);
  if (single.length > 0 && multi.length > 0) {
    console.log(
      `\n[4] GENERATOR-ARTIFACT CONTROL. The model draws ONE ability cut PER DOMAIN, so a\n` +
        `    single-domain era sits entirely inside one correlated block and a multi-domain\n` +
        `    era does not. Same instrument, same generator, same noise. Read the LIFT column:\n` +
        `    it is how far the era beats what independent node errors would predict.`,
    );
    for (const [label, group] of [
      ["single-domain eras", single],
      ["multi-domain eras", multi],
    ] as const) {
      const allOk = mean(
        group.flatMap((e) =>
          rows.map((r) => (e.nodes.every((id) => r.nodeOk.get(id)) ? 1 : 0)),
        ),
      );
      const indep = mean(
        group.map((e) =>
          e.nodes.reduce(
            (acc, id) => acc * mean(rows.map((r) => (r.nodeOk.get(id) ? 1 : 0))),
            1,
          ),
        ),
      );
      const size = mean(group.map((e) => e.nodes.length));
      console.log(
        `    ${label.padEnd(20)} eras=${String(group.length).padStart(2)}  mean size=${size.toFixed(1)}  ` +
          `measured allNodesOk=${pctS(allOk)}  independence-prediction=${pctS(indep)}  ` +
          `LIFT=${(100 * (allOk - indep)).toFixed(1)}pts`,
      );
    }
  }

  // --- 5. By profile ----------------------------------------------------------
  console.log(`\n[5] BY PROFILE (correlation structure of the generated student)`);
  for (const p of PROFILES) {
    const sub = rows.filter((r) => r.profile === p.name);
    if (sub.length === 0) continue;
    const perNodeP = mean(sub.map((r) => r.correctNodes / scope.length));
    const pairs = eras.flatMap((e) => sub.map((r) => r.byEra.get(e.id) as EraOutcome));
    const nKnown = pairs.filter((o) => o.trulyKnown).length;
    const nFires = pairs.filter((o) => o.fires).length;
    const nBoth = pairs.filter((o) => o.fires && o.trulyKnown).length;
    console.log(
      `    ${p.name.padEnd(21)} n=${String(sub.length).padStart(5)}  per-node=${pctS(perNodeP)}  ` +
        `era-sens=${(pctS(nKnown === 0 ? 0 : nBoth / nKnown) + `[${nKnown}]`).padStart(13)}  ` +
        `era-prec=${(pctS(nFires === 0 ? 0 : nBoth / nFires) + `[${nFires}]`).padStart(13)}  ` +
        `fail-open=${pctS(mean(pairs.map((o) => (o.fires && !o.trulyKnown ? 1 : 0))))}`,
    );
  }
}

describe("era-level placement accuracy", () => {
  it("measures whether the instrument can decide an ERA, not just a node", () => {
    const d1d2 = getProductNodes()
      .filter((n) => n.domain === "D1" || n.domain === "D2")
      .map((n) => n.id);
    // Eras one to four, the worked case in the placement-experience record.
    const erasOneToFour = ERA_SEQUENCE.slice(0, 4).flatMap((e) => e.nodes);

    measure("D1+D2 (eras one and two) — the PUBLISHED anchor scope", d1d2);
    measure("eras one to four", erasOneToFour);
    measure("full in-product graph", PRODUCT_IDS);
  });
});
