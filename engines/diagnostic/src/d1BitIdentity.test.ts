import { getNodesByScope, getProductNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { confirmThresholdFor } from "./adjudicator";
import {
  currentProbeNode,
  DEFAULT_WALK_POLICY,
  isWalkComplete,
  recordScoredOutcome,
  STATIC_CONSEQUENCE_WALK_POLICY,
  startWalk,
  type WalkPolicy,
  type WalkState,
} from "./walk";

/**
 * THE D1 WALK IS BIT-IDENTICAL ACROSS THE 2026-08-04 TAIL CUT.
 *
 * Every probe-policy change since PR #89 has held the walk a D1 learner takes
 * byte-for-byte unchanged, and each has argued the same way: the confirmation
 * threshold is a share of the scope, it rounds down, and on six nodes
 * `confirmThresholdFor(6, 7/62)` is 0 — so every decision is confirmed whatever
 * the consequence is read as, and a rule that only changes how the consequence is
 * READ cannot reach a walk that never consults it.
 *
 * That argument is correct. It is also exactly the kind of argument an assertion
 * exists so that nobody has to take on trust, and the failure mode it invites is
 * silent: nothing about a D1 walk announces that it has started confirming one
 * item fewer. `docs/Diagnostic_Tail_Policy_Measurement.md` §5.3 states the
 * bit-identity as a claim; this file is the measurement behind it.
 *
 * ## What is compared, and why it is the whole walk rather than a summary
 *
 * Distributional agreement — "median 7, p90 12 both sides" — is what the
 * simulation harness reports, and it is strictly weaker: two policies can produce
 * the same histogram out of different walks. So every student is compared as a
 * whole trace: the ordered probe sequence, the item served at each step, and the
 * final `probed` map with each node's outcomes, result, robustness and inference
 * licence. Two walks agree here only if the learner would have had an identical
 * session, question for question.
 *
 * ## The control
 *
 * `STATIC_CONSEQUENCE_WALK_POLICY` is the frozen pre-cut literal, NOT a spread
 * over `DEFAULT_WALK_POLICY`. A before/after guard whose "before" is today's
 * default has no before in it.
 */

const D1_IDS = getNodesByScope("mvp").map((node) => node.id);
const PRODUCT_IDS = getProductNodes().map((node) => node.id);

/** xorshift, so a cohort is reproducible without depending on the sim harness. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Trace {
  /** The node probed at each step, in order. */
  path: string[];
  /** The (node, attempt) pair each item was served for — the learner's session. */
  served: string[];
  probed: WalkState["probed"];
  items: number;
  ceiling: boolean;
}

/**
 * Drive one walk to completion and record everything the learner would have seen.
 *
 * Answers are drawn ONCE per (node, attempt) and replayed to both policies, so a
 * difference in the trace is a difference in the instrument rather than in the
 * responder. This is the same paired-comparison discipline the sim harness uses.
 */
function trace(
  scope: readonly string[],
  answers: ReadonlyMap<string, boolean>,
  policy: WalkPolicy,
): Trace {
  let state = startWalk({ scope, entryTier: 3 }, undefined, policy);
  const path: string[] = [];
  const served: string[] = [];
  let guard = 0;
  while (!isWalkComplete(state)) {
    const node = currentProbeNode(state);
    if (!node) break;
    const attempt = state.probed[node]?.outcomes.length ?? 0;
    if (path[path.length - 1] !== node) path.push(node);
    served.push(`${node}#${attempt}`);
    state = recordScoredOutcome(
      state,
      answers.get(`${node}#${attempt}`) ?? false,
      undefined,
      policy,
    );
    if (++guard > 10_000) throw new Error("walk did not terminate");
  }
  return {
    path,
    served,
    probed: state.probed,
    items: served.length,
    ceiling: state.ceiling_reached === true,
  };
}

/** Every (node, attempt) answer a walk over `scope` could ask for, drawn up front. */
function drawAnswers(
  scope: readonly string[],
  rand: () => number,
  known: ReadonlySet<string>,
  slip = 0.1,
  guess = 0.05,
): Map<string, boolean> {
  const answers = new Map<string, boolean>();
  for (const nodeId of scope) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const holds = known.has(nodeId);
      const roll = rand();
      answers.set(`${nodeId}#${attempt}`, holds ? roll >= slip : roll < guess);
    }
  }
  return answers;
}

/** A downward-closed ability draw: a learner holds a node only if it is shallow enough. */
function drawCohort(scope: readonly string[], size: number) {
  const cohort: { answers: Map<string, boolean>; known: Set<string> }[] = [];
  for (let i = 0; i < size; i++) {
    const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
    const cut = rand();
    const known = new Set(scope.filter((_, index) => index / scope.length < cut));
    cohort.push({ answers: drawAnswers(scope, rand, known), known });
  }
  return cohort;
}

describe("the D1 walk is bit-identical across the tail cut", () => {
  it("the mechanism: D1's confirmation threshold is 0, so nothing consults a consequence", () => {
    // Stated as the boundary rather than the single value, so a scope change that
    // takes D1 past it is a visible failure rather than a silent one.
    expect(
      confirmThresholdFor(D1_IDS.length, DEFAULT_WALK_POLICY.confirmScopeFraction),
    ).toBe(0);
    expect(D1_IDS.length).toBeLessThan(9);
    expect(confirmThresholdFor(9, DEFAULT_WALK_POLICY.confirmScopeFraction)).toBe(1);
    // ...and the two policies differ only in how a consequence is READ, which is
    // what makes a threshold of 0 sufficient. If a future change moves anything
    // else, the argument above stops covering it and this fails.
    const differing = (Object.keys(DEFAULT_WALK_POLICY) as (keyof WalkPolicy)[]).filter(
      (key) => DEFAULT_WALK_POLICY[key] !== STATIC_CONSEQUENCE_WALK_POLICY[key],
    );
    expect([...differing].sort()).toEqual(["liveConsequenceFrom", "livePassClosure"]);
  });

  it("every D1 learner takes the identical walk, item for item", () => {
    const cohort = drawCohort(D1_IDS, 400);
    let compared = 0;
    for (const { answers } of cohort) {
      const before = trace(D1_IDS, answers, STATIC_CONSEQUENCE_WALK_POLICY);
      const after = trace(D1_IDS, answers, DEFAULT_WALK_POLICY);
      expect(after.served).toEqual(before.served);
      expect(after.path).toEqual(before.path);
      expect(after.probed).toEqual(before.probed);
      expect(after.items).toBe(before.items);
      expect(after.ceiling).toBe(before.ceiling);
      compared += 1;
    }
    // A floor, so an empty or degenerate cohort cannot satisfy the loop above by
    // never entering it — and a second one on the walks themselves, since a
    // cohort of six-item no-ops would compare equal for the wrong reason.
    expect(compared).toBe(400);
    const lengths = cohort.map(
      ({ answers }) => trace(D1_IDS, answers, DEFAULT_WALK_POLICY).items,
    );
    expect(Math.max(...lengths)).toBeGreaterThanOrEqual(12);
    expect(new Set(lengths).size).toBeGreaterThanOrEqual(5);
  });

  it("the same comparison at 62 nodes DIFFERS, so the check above can fail", () => {
    // The control for the control. A bit-identity assertion is only worth reading
    // if the same comparison, run where the rules genuinely differ, comes apart —
    // otherwise `trace` could be returning something insensitive to the policy and
    // D1 would pass for a reason that has nothing to do with the threshold.
    const cohort = drawCohort(PRODUCT_IDS, 40);
    const differing = cohort.filter(({ answers }) => {
      const before = trace(PRODUCT_IDS, answers, STATIC_CONSEQUENCE_WALK_POLICY);
      const after = trace(PRODUCT_IDS, answers, DEFAULT_WALK_POLICY);
      return after.served.join() !== before.served.join();
    });
    expect(differing.length).toBeGreaterThanOrEqual(10);
  });
});
