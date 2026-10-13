import { getNode, getProductNodes, prereqDepth } from "@cr/skill-graph";
import { describe, it } from "vitest";

import { confirmThresholdFor } from "../src/adjudicator";
import {
  currentProbeNode,
  DEFAULT_WALK_POLICY,
  isWalkComplete,
  recordScoredOutcome,
  resolveKnowledgeState,
  scopeConsequence,
  startWalk,
  type WalkPolicy,
  type WalkState,
} from "../src/walk";

/**
 * TRUTH-ACCURACY COHORT DECOMPOSITION — a measurement tool, NOT a CI test.
 *
 * Sibling of `probe-cost.sim.test.ts`, sharing its method exactly (§9 of
 * `docs/Diagnostic_11_Node_Scope_Measurement.md`) and excluded from CI the same way: it
 * lives outside `engines/diagnostic/src/`, so neither the root `vitest.config.ts` nor
 * `vitest.browser.config.ts` collects it, and it is outside the package `tsconfig`
 * (`include: ["src/**\/*"]`) so `tsc --build` never sees it.
 *
 * ── Why it exists ──────────────────────────────────────────────────────────
 * `Diagnostic_11_Node_Scope_Measurement.md` §10 leaves open "whether 96.0% truth accuracy
 * is acceptable, or whether the confirm fraction should be pinned to 0 for this scope",
 * and §6.2 prices that as a flat "1.8 items for 1.5 accuracy points". A single aggregate
 * pair cannot support that decision, for the reason
 * `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` §6 set out when the same question
 * came up for the 70-item ceiling: "A ceiling's cost never shows up in the aggregate,
 * because the aggregate averages over a population most of which never reaches it."
 * The 70-item work found that raising the ceiling left the still-truncated cohort
 * marginally WORSE off (87.8% -> 85.8%) while shrinking it from 15.2% to 1.7%, so the
 * aggregate improved for a reason that is not "everyone does better". This harness applies
 * that cohort method to the confirm-threshold question instead.
 *
 * ── What it measures ───────────────────────────────────────────────────────
 *   1. The published aggregate, reproduced, so the decomposition is anchored.
 *   2. The cohort split: students the threshold-1 regime touches at all, against
 *      those it cannot. The untouched cohort's delta is asserted to be exactly 0 —
 *      it must be, since both policies take the identical path for them, so a
 *      non-zero value means the cohort definition has missed the mechanism.
 *   3. Accuracy graded by exposure (number of single-item decisions).
 *   4. The DIRECTION of each error, which an accuracy figure cannot show: a mastered
 *      skill sent back for review is a different cost from a real gap advanced past.
 *      Mirrors the "mastered nodes told to rebuild" column of the §6 ceiling tables.
 *   5. The two halves priced separately — a one-item PASS and a one-item FAIL are
 *      permitted on disjoint node sets (§6.1), and they turn out to have very
 *      different exchange rates.
 *   6. Per-node attribution, reconciled arithmetically against the headline so the
 *      attribution is measured rather than argued.
 *
 * Recorded results: `docs/Diagnostic_11_Node_Scope_Decision_Evidence.md` §5.
 *
 * ── Running it ─────────────────────────────────────────────────────────────
 *   echo 2000 > engines/diagnostic/sim/sample-size.local
 *   npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
 *     engines/diagnostic/sim/accuracy-cohorts.sim.test.ts --disableConsoleIntercept
 *
 * `--disableConsoleIntercept` is REQUIRED: under vitest 4 a passing test's `console.log`
 * is swallowed without it, so the harness runs green and prints nothing. Always check the
 * printed `n=` before believing a sample size.
 */

// Derived exactly as `probe-cost.sim.test.ts` derives them. MAX_DEPTH is taken over the
// FULL 62-node in-product scope, not over the 11: it sets the ability range the profiles
// draw from, so narrowing it to the scope under test shifts the whole cohort and the
// published figures do not reproduce (measured: 97.4% rather than 96.0%).
const PRODUCT_IDS = getProductNodes().map((n) => n.id);
const D1_D2_IDS = getProductNodes()
  .filter((n) => n.domain === "D1" || n.domain === "D2")
  .map((n) => n.id);

const N = Number(process.env.SIM_N ?? 500);

const depthOf = prereqDepth;
const domainOf = (id: string): string => getNode(id)?.domain ?? id.split(".")[0] ?? id;
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

type Profile = {
  name: string;
  sample(rand: () => number, scope: readonly string[]): Set<string>;
};

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

/** Pre-draw every (node, attempt) response so the two policies are a PAIRED comparison. */
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

/** One student under one policy. */
interface Outcome {
  items: number;
  correctNodes: number;
  /** Truly known, resolved not-passed: a mastered skill the learner is sent back to. */
  falseNegatives: number;
  /** Truly unknown, resolved passed: a real gap the learner is advanced past. */
  falsePositives: number;
  oneItemPasses: number;
  oneItemFails: number;
  oneItemWrong: number;
  /** Per-node correctness, for the attribution table. */
  nodeOk: Map<string, boolean>;
  nodeOneItem: Set<string>;
  nodeOneItemWrong: Set<string>;
}

function evaluate(
  state: WalkState,
  items: number,
  known: ReadonlySet<string>,
  scope: readonly string[],
): Outcome {
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

  let oneItemPasses = 0;
  let oneItemFails = 0;
  let oneItemWrong = 0;
  const nodeOneItem = new Set<string>();
  const nodeOneItemWrong = new Set<string>();
  for (const [id, record] of Object.entries(state.probed)) {
    if (record.outcomes.length !== 1 || record.result === undefined) continue;
    nodeOneItem.add(id);
    if (record.result === "passed") oneItemPasses += 1;
    else oneItemFails += 1;
    if ((record.result === "passed") !== known.has(id)) {
      oneItemWrong += 1;
      nodeOneItemWrong.add(id);
    }
  }

  return {
    items,
    correctNodes,
    falseNegatives,
    falsePositives,
    oneItemPasses,
    oneItemFails,
    oneItemWrong,
    nodeOk,
    nodeOneItem,
    nodeOneItemWrong,
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

describe("truth-accuracy cohorts", () => {
  it("decomposes the 11-node scope's truth accuracy by cohort", () => {
    const scope = D1_D2_IDS;
    const threshold = confirmThresholdFor(
      scope.length,
      DEFAULT_WALK_POLICY.confirmScopeFraction,
    );
    const pinnedToZero: WalkPolicy = { ...DEFAULT_WALK_POLICY, confirmScopeFraction: 0 };
    const consequence = scopeConsequence(scope);
    const total = N * 3;
    const accuracyOf = (rows: readonly Outcome[]) =>
      mean(rows.map((r) => r.correctNodes / scope.length));

    console.log(
      `\n===== TRUTH-ACCURACY COHORTS, ${scope.length}-NODE SCOPE ` +
        `(pooled, mild noise, n=${total}) =====`,
    );
    console.log(`scope: ${scope.join(", ")}`);
    console.log(`confirmThreshold = ${threshold} at this scope`);

    const shipped: Outcome[] = [];
    const pinned: Outcome[] = [];
    for (let i = 0; i < total; i++) {
      const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
      const profile = PROFILES[i % PROFILES.length] as Profile;
      const known = profile.sample(rand, scope);
      const responses = drawResponses(known, scope, rand, 0.1, 0.05);
      const a = runWalk(scope, responses, DEFAULT_WALK_POLICY);
      shipped.push(evaluate(a.state, a.items, known, scope));
      const b = runWalk(scope, responses, pinnedToZero);
      pinned.push(evaluate(b.state, b.items, known, scope));
    }

    // 1. The aggregate, so the decomposition below is anchored to a known figure.
    console.log("\n--- 1. AGGREGATE (anchors the decomposition) ---");
    for (const [label, rows] of [
      [`shipped (confirmThreshold=${threshold})`, shipped],
      ["threshold pinned to 0", pinned],
    ] as const) {
      console.log(
        `  ${label.padEnd(38)} items med=${median(rows.map((r) => r.items))} ` +
          `mean=${mean(rows.map((r) => r.items)).toFixed(2)}   ` +
          `truth accuracy=${(100 * accuracyOf(rows)).toFixed(1)}%   ` +
          `single-item decisions=${mean(rows.map((r) => r.oneItemPasses + r.oneItemFails)).toFixed(2)}/session`,
      );
    }

    // 2. The cohort split. The untouched cohort MUST show a zero delta.
    const touched = shipped
      .map((r, i) => (r.oneItemPasses + r.oneItemFails > 0 ? i : -1))
      .filter((i) => i >= 0);
    const untouched = shipped
      .map((r, i) => (r.oneItemPasses + r.oneItemFails === 0 ? i : -1))
      .filter((i) => i >= 0);

    console.log("\n--- 2. COHORT SPLIT (who the regime touches at all) ---");
    for (const [label, idx] of [
      ["touched (>=1 single-item decision)", touched],
      ["untouched (2-of-3 everywhere anyway)", untouched],
    ] as const) {
      const s = idx.map((i) => shipped[i] as Outcome);
      const p = idx.map((i) => pinned[i] as Outcome);
      console.log(
        `  ${label.padEnd(38)} ${((100 * idx.length) / total).toFixed(1)}% of all   ` +
          `accuracy shipped=${(100 * accuracyOf(s)).toFixed(1)}% ` +
          `pinned=${(100 * accuracyOf(p)).toFixed(1)}% ` +
          `delta=${(100 * (accuracyOf(s) - accuracyOf(p))).toFixed(2)}pts   ` +
          `items med ${median(s.map((r) => r.items))} vs ${median(p.map((r) => r.items))}`,
      );
    }
    const untouchedDelta =
      100 *
      (accuracyOf(untouched.map((i) => shipped[i] as Outcome)) -
        accuracyOf(untouched.map((i) => pinned[i] as Outcome)));
    console.log(
      `  CONSISTENCY FLOOR: untouched delta = ${untouchedDelta.toFixed(4)}pts (must be 0; ` +
        `both policies take the identical path). cohorts ${touched.length}+${untouched.length}=${touched.length + untouched.length} of ${total}.`,
    );

    // 3. Graded by exposure.
    console.log("\n--- 3. BY EXPOSURE (number of single-item decisions) ---");
    const maxExposure = Math.max(...shipped.map((r) => r.oneItemPasses + r.oneItemFails));
    for (let k = 0; k <= maxExposure; k++) {
      const idx = shipped
        .map((r, i) => (r.oneItemPasses + r.oneItemFails === k ? i : -1))
        .filter((i) => i >= 0);
      if (idx.length === 0) continue;
      const s = idx.map((i) => shipped[i] as Outcome);
      const p = idx.map((i) => pinned[i] as Outcome);
      console.log(
        `  ${String(k).padStart(2)} decisions: ${((100 * idx.length) / total).toFixed(1).padStart(5)}% of all   ` +
          `shipped=${(100 * accuracyOf(s)).toFixed(1)}% pinned=${(100 * accuracyOf(p)).toFixed(1)}% ` +
          `delta=${(100 * (accuracyOf(s) - accuracyOf(p))).toFixed(2)}pts`,
      );
    }

    // 4. The direction of the error — what an accuracy figure cannot show.
    console.log("\n--- 4. DIRECTION OF ERROR (mean per session) ---");
    console.log(
      "  falseNegative = mastered skill sent back for review; falsePositive = real gap advanced past.",
    );
    for (const [label, rows] of [
      [`all students, shipped`, shipped],
      [`all students, pinned`, pinned],
      [`touched cohort, shipped`, touched.map((i) => shipped[i] as Outcome)],
      [`touched cohort, pinned`, touched.map((i) => pinned[i] as Outcome)],
    ] as const) {
      console.log(
        `  ${label.padEnd(26)} mastered-sent-back=${mean(rows.map((r) => r.falseNegatives)).toFixed(3)}   ` +
          `gaps-advanced-past=${mean(rows.map((r) => r.falsePositives)).toFixed(3)}`,
      );
    }
    const decisions = mean(shipped.map((r) => r.oneItemPasses + r.oneItemFails));
    const wrong = mean(shipped.map((r) => r.oneItemWrong));
    console.log(
      `  single-item decisions ${decisions.toFixed(2)}/session, of which ${wrong.toFixed(3)} wrong ` +
        `= ${(100 * (wrong / decisions)).toFixed(1)}% per-decision error rate`,
    );

    // 5. The two halves priced separately.
    console.log("\n--- 5. THE TWO HALVES PRICED SEPARATELY ---");
    console.log(
      `  session split: ${mean(shipped.map((r) => r.oneItemPasses)).toFixed(3)} passes + ` +
        `${mean(shipped.map((r) => r.oneItemFails)).toFixed(3)} fails`,
    );
    for (const [label, wantPass, wantFail] of [
      ["exactly 1 one-item PASS, 0 fails", 1, 0],
      ["exactly 1 one-item FAIL, 0 passes", 0, 1],
    ] as const) {
      const idx = shipped
        .map((r, i) =>
          r.oneItemPasses === wantPass && r.oneItemFails === wantFail ? i : -1,
        )
        .filter((i) => i >= 0);
      if (idx.length === 0) {
        console.log(`  ${label.padEnd(34)} n=0`);
        continue;
      }
      const s = idx.map((i) => shipped[i] as Outcome);
      const p = idx.map((i) => pinned[i] as Outcome);
      console.log(
        `  ${label.padEnd(34)} n=${String(idx.length).padStart(4)}   ` +
          `items saved=${(mean(p.map((r) => r.items)) - mean(s.map((r) => r.items))).toFixed(2)}   ` +
          `accuracy ${(100 * accuracyOf(s)).toFixed(1)}% vs ${(100 * accuracyOf(p)).toFixed(1)}% ` +
          `= ${(100 * (accuracyOf(s) - accuracyOf(p))).toFixed(2)}pts`,
      );
    }

    // 6. Per-node attribution, reconciled against the headline.
    console.log("\n--- 6. PER-NODE ATTRIBUTION ---");
    let deltaFailNodes = 0;
    let deltaOther = 0;
    for (const id of [...scope].sort(
      (a, b) => depthOf(a) - depthOf(b) || a.localeCompare(b),
    )) {
      const okS = shipped.filter((r) => r.nodeOk.get(id) === true).length;
      const okP = pinned.filter((r) => r.nodeOk.get(id) === true).length;
      const one = shipped.filter((r) => r.nodeOneItem.has(id)).length;
      const bad = shipped.filter((r) => r.nodeOneItemWrong.has(id)).length;
      const accS = (100 * okS) / total;
      const accP = (100 * okP) / total;
      const delta = accS - accP;
      const canOneItemFail = (consequence.get(id)?.failCone ?? 0) < threshold;
      if (canOneItemFail) deltaFailNodes += delta;
      else deltaOther += delta;
      console.log(
        `  ${id.padEnd(6)} depth=${depthOf(id)} ` +
          `oneItem=${(one / total).toFixed(3)}/session wrong=${(bad / total).toFixed(3)}   ` +
          `accuracy ${accS.toFixed(1)}% vs ${accP.toFixed(1)}% = ${delta.toFixed(2)}pts` +
          `${canOneItemFail ? "   <- can take a ONE-ITEM FAIL" : ""}`,
      );
    }
    const headline = 100 * (accuracyOf(shipped) - accuracyOf(pinned));
    const summed = (deltaFailNodes + deltaOther) / scope.length;
    console.log(
      `\n  RECONCILIATION: one-item-FAIL nodes ${deltaFailNodes.toFixed(2)} node-pts, ` +
        `all others ${deltaOther.toFixed(2)} node-pts; ` +
        `total/${scope.length} = ${summed.toFixed(3)}pts vs headline ${headline.toFixed(3)}pts ` +
        `(residual ${Math.abs(summed - headline).toFixed(4)}).`,
    );
    console.log(
      `  Share of the accuracy cost on the one-item-FAIL nodes: ` +
        `${((100 * deltaFailNodes) / (deltaFailNodes + deltaOther)).toFixed(1)}%`,
    );
  });
});
