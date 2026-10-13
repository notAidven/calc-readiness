import { getNode, getNodesByScope, getProductNodes, prereqDepth } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { computeCoverage, type NodeResolution } from "./coverage";
import {
  adjudicateRecordedWalk,
  currentProbeNode,
  DEFAULT_WALK_POLICY,
  isWalkComplete,
  probedNodeCount,
  recordScoredOutcome,
  resolveKnowledgeState,
  STATIC_CONSEQUENCE_WALK_POLICY,
  startWalk,
  type WalkPolicy,
  type WalkState,
} from "./walk";

const D1_IDS = getNodesByScope("mvp").map((node) => node.id);
const PRODUCT_IDS = getProductNodes().map((node) => node.id);

/** Drive a whole walk with a per-node correctness oracle; returns the final state. */
function runWalk(
  scope: readonly string[],
  entryTier: number,
  isCorrect: (nodeId: string) => boolean,
): WalkState {
  let state = startWalk({ scope, entryTier });
  let guard = 0;
  while (!isWalkComplete(state)) {
    const node = currentProbeNode(state);
    if (!node) {
      break;
    }
    state = recordScoredOutcome(state, isCorrect(node));
    if (++guard > 10_000) {
      throw new Error("walk did not terminate");
    }
  }
  return state;
}

function statusOf(resolved: readonly NodeResolution[], nodeId: string) {
  return resolved.find((r) => r.node_id === nodeId);
}

/** No passed node may sit above a non-passed prereq (downward closure). */
function assertDownwardClosed(
  resolved: readonly NodeResolution[],
  scope: readonly string[],
) {
  const scopeSet = new Set(scope);
  const byId = new Map(resolved.map((r) => [r.node_id, r]));
  for (const r of resolved) {
    if (r.status !== "passed") {
      continue;
    }
    for (const prereq of getNode(r.node_id)?.prereqs ?? []) {
      if (scopeSet.has(prereq)) {
        expect(byId.get(prereq)?.status).toBe("passed");
      }
    }
  }
}

describe("frontier walk over D1", () => {
  it("aces the diagnostic with test-out: robust passes infer the foundation", () => {
    const state = runWalk(D1_IDS, 2, () => true);
    const resolved = resolveKnowledgeState(state);

    for (const id of D1_IDS) {
      expect(statusOf(resolved, id)?.status).toBe("passed");
    }
    // Coverage is full, and the roots were inferred (never probed) — that's the win.
    expect(computeCoverage(resolved, D1_IDS).coverage).toBeCloseTo(1, 10);
    expect(statusOf(resolved, "NUM.S")?.source).toBe("inferred");
    expect(statusOf(resolved, "NUM.4")?.source).toBe("measured");
    expect(probedNodeCount(state)).toBeLessThan(D1_IDS.length);
    assertDownwardClosed(resolved, D1_IDS);
  });

  it("fails everything fail-closed (no lucky passes)", () => {
    const state = runWalk(D1_IDS, 2, () => false);
    const resolved = resolveKnowledgeState(state);
    expect(computeCoverage(resolved, D1_IDS).coverage).toBe(0);
    for (const r of resolved) {
      expect(r.status).not.toBe("passed");
    }
    assertDownwardClosed(resolved, D1_IDS);
  });

  it("passes the foundation but fails the top node (partial coverage, closed)", () => {
    // Correct on everything except the deepest D1 node (NUM.4, depth 2).
    const state = runWalk(D1_IDS, 2, (id) => id !== "NUM.4");
    const resolved = resolveKnowledgeState(state);

    expect(statusOf(resolved, "NUM.4")?.status).toBe("failed");
    for (const id of ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.5"]) {
      expect(statusOf(resolved, id)?.status).toBe("passed");
    }
    const coverage = computeCoverage(resolved, D1_IDS).coverage;
    expect(coverage).toBeGreaterThan(0);
    expect(coverage).toBeLessThan(1);
    assertDownwardClosed(resolved, D1_IDS);
  });

  it("is deterministic", () => {
    const a = resolveKnowledgeState(runWalk(D1_IDS, 2, (id) => id !== "NUM.4"));
    const b = resolveKnowledgeState(runWalk(D1_IDS, 2, (id) => id !== "NUM.4"));
    expect(a).toEqual(b);
  });
});

describe("frontier walk over the full 62-node graph", () => {
  it("aces to full coverage", () => {
    const state = runWalk(PRODUCT_IDS, 3, () => true);
    const resolved = resolveKnowledgeState(state);
    expect(computeCoverage(resolved).coverage).toBeCloseTo(1, 10);
    assertDownwardClosed(resolved, PRODUCT_IDS);
  });

  it("prunes the entire upper graph when the arithmetic floor breaks (short + gap-covering)", () => {
    // A student who can do nothing at depth >= 3: every domain-entry node fails,
    // so D2-D9 is pruned (never administered) and only the D1 floor is explored.
    const state = runWalk(PRODUCT_IDS, 3, (id) => prereqDepth(id) < 3);
    const resolved = resolveKnowledgeState(state);

    // Nothing at depth >= 3 (all of D2-D9's real content) is credited as passed.
    for (const r of resolved) {
      if (prereqDepth(r.node_id) >= 3) {
        expect(r.status).not.toBe("passed");
      }
    }
    // The upper graph was pruned, not exhaustively tested: far fewer probes than nodes.
    expect(probedNodeCount(state)).toBeLessThan(PRODUCT_IDS.length / 2);
    // Coverage is bounded to the shallow floor.
    expect(computeCoverage(resolved).coverage).toBeLessThan(0.35);
    assertDownwardClosed(resolved, PRODUCT_IDS);
  });

  it("reports a positive coverage gain pre -> post", () => {
    const pre = resolveKnowledgeState(runWalk(PRODUCT_IDS, 3, (id) => prereqDepth(id) < 2));
    const post = resolveKnowledgeState(
      runWalk(PRODUCT_IDS, 3, (id) => prereqDepth(id) < 5),
    );
    expect(computeCoverage(post).coverage).toBeGreaterThan(computeCoverage(pre).coverage);
  });
});

/**
 * INV-DIAG-4 for the rules that read more than one node's own outcomes.
 *
 * A static consequence lets a record be re-decided node by node in any order. The
 * candidate policies measured in `docs/Diagnostic_Tail_Policy_Measurement.md` do
 * not: what a pass can still credit depends on what the walk had already credited
 * when it reached that node. `adjudicateRecordedWalk` is what keeps such a rule
 * reproducible, by folding along the recorded `routing_path` — which is an
 * immutable record and already an input to `rebuildWalkState` — instead of
 * replaying probe selection.
 *
 * These tests are the evidence that the fold reproduces, and that it is
 * load-bearing rather than decorative.
 */
describe("a recorded walk re-decides to the same state (INV-DIAG-4)", () => {
  /** Deterministic slips/guesses, so nodes are decided on one, two and three items. */
  function noisyOracle(known: (id: string) => boolean) {
    return (state: WalkState, nodeId: string): boolean => {
      const attempt = state.probed[nodeId]?.outcomes.length ?? 0;
      let hash = 0x9e3779b1 ^ attempt;
      for (const ch of nodeId) {
        hash = (Math.imul(hash ^ ch.charCodeAt(0), 0x85ebca6b) >>> 0) % 0xffffffff;
      }
      return known(nodeId) === (hash % 11 !== 0);
    };
  }

  /** Drive a walk under `policy` and hand back what a finalized record would hold. */
  function record(policy: WalkPolicy, known: (id: string) => boolean) {
    const oracle = noisyOracle(known);
    let state = startWalk({ scope: PRODUCT_IDS, entryTier: 3 }, undefined, policy);
    let guard = 0;
    while (!isWalkComplete(state)) {
      const node = currentProbeNode(state);
      if (!node) {
        break;
      }
      state = recordScoredOutcome(state, oracle(state, node), undefined, policy);
      if (++guard > 10_000) {
        throw new Error("walk did not terminate");
      }
    }
    const routingPath = Object.keys(state.probed);
    const outcomesByNode = new Map(
      routingPath.map((id) => [id, [...(state.probed[id]?.outcomes ?? [])]]),
    );
    return { state, routingPath, outcomesByNode };
  }

  /**
   * A live reading from the FIRST item, and the static rules it is contrasted
   * with, both written against the frozen literal rather than spread over
   * `DEFAULT_WALK_POLICY`.
   *
   * That spread is how this test quietly stopped being a differential when the
   * tail cut landed: the shipped policy now reads the consequence live itself, so
   * `{ ...DEFAULT_WALK_POLICY, livePassClosure: true }` and `DEFAULT_WALK_POLICY`
   * became the same object and the control below could no longer disagree with
   * anything. A differential has to name both of its sides.
   */
  const LIVE_PASS: WalkPolicy = {
    ...STATIC_CONSEQUENCE_WALK_POLICY,
    livePassClosure: true,
    liveConsequenceFrom: 0,
  };
  const midStudent = (id: string) => prereqDepth(id) < 4;
  /** The cohort a live consequence actually bites on — see the note's §3. */
  const strongStudent = () => true;

  it("reproduces the shipped policy exactly", () => {
    const { state, routingPath, outcomesByNode } = record(DEFAULT_WALK_POLICY, midStudent);
    expect(routingPath.length).toBeGreaterThan(10);
    expect(
      adjudicateRecordedWalk(PRODUCT_IDS, routingPath, outcomesByNode, DEFAULT_WALK_POLICY),
    ).toEqual(state.probed);
  });

  it("reproduces a live-consequence walk exactly, which the shipped rules cannot", () => {
    const { state, routingPath, outcomesByNode } = record(LIVE_PASS, strongStudent);
    expect(
      adjudicateRecordedWalk(PRODUCT_IDS, routingPath, outcomesByNode, LIVE_PASS),
    ).toEqual(state.probed);

    // The control, and the reason the fold has to carry the rules rather than
    // assume today's: re-decide the SAME record under the static rules and it
    // comes out different, because nodes the live rule took on one item are
    // exactly the ones the static rule would have confirmed.
    const underStatic = adjudicateRecordedWalk(
      PRODUCT_IDS,
      routingPath,
      outcomesByNode,
      STATIC_CONSEQUENCE_WALK_POLICY,
    );
    expect(underStatic).not.toEqual(state.probed);
    // A floor under that inequality, so it cannot be satisfied by one stray node:
    // count the nodes the two rule sets record differently at all — how many
    // items each consumes, what it decides, and whether the pass may cascade.
    const disagreements = routingPath.filter(
      (id) => JSON.stringify(underStatic[id]) !== JSON.stringify(state.probed[id]),
    );
    expect(disagreements.length).toBeGreaterThanOrEqual(10);
  });

  it("reproduces a confirm-budget walk, whose rule depends on the ORDER of the record", () => {
    const budgeted: WalkPolicy = { ...STATIC_CONSEQUENCE_WALK_POLICY, confirmBudget: 20 };
    const { state, routingPath, outcomesByNode } = record(budgeted, midStudent);
    expect(
      adjudicateRecordedWalk(PRODUCT_IDS, routingPath, outcomesByNode, budgeted),
    ).toEqual(state.probed);
    // Load-bearing: the same rows re-decided in the wrong order relieve
    // confirmation on the wrong nodes.
    expect(
      adjudicateRecordedWalk(
        PRODUCT_IDS,
        [...routingPath].reverse(),
        outcomesByNode,
        budgeted,
      ),
    ).not.toEqual(state.probed);
  });
});
