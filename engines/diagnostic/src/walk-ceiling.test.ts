import { describe, expect, it } from "vitest";

import { computeCoverage } from "./coverage";
import {
  currentProbeNode,
  DEFAULT_WALK_POLICY,
  isWalkComplete,
  recordScoredOutcome,
  resolveKnowledgeState,
  servedItemCount,
  startWalk,
  type WalkGraph,
  type WalkState,
} from "./walk";
import { placementFor } from "./walk-engine";

/**
 * The 70-item instrument ceiling (`DEFAULT_WALK_POLICY.maxItems`), which until now
 * was exercised only by `sim/policy-sweep.sim.test.ts` — a measurement harness the
 * root vitest config cannot collect (`**\/src\/**\/*.test.ts`). Nothing in CI
 * touched it, including the subtlest branch in `walk.ts`: the mid-node truncation
 * that leaves a node in `probed` with recorded outcomes and no `result`.
 *
 * The ceiling is unreachable on the live D1 scope, whose hard bound is 18 items,
 * so these run on synthetic scopes wide enough to exceed 70 — the engine takes an
 * injected `WalkGraph` precisely so it can be driven off the registry.
 *
 * Every case runs the SHIPPED `DEFAULT_WALK_POLICY`. The scopes are constructed so
 * the 70 falls where each branch needs it, rather than shrinking the ceiling to
 * meet the test.
 */

const CEILING = DEFAULT_WALK_POLICY.maxItems;

/**
 * A graph of isolated nodes plus one chain, in two domains.
 *
 * - `F.i` — `fillers` isolated nodes. Zero consequence either way, so each is
 *   decided on ONE item and resolves nothing but itself: a precise, predictable
 *   way to spend budget.
 * - `C.i` — a chain of `chain` nodes. `C.0` has a dependent cone of `chain - 1`,
 *   which is what makes a miss on it cost a confirming item.
 *
 * The per-domain stage takes the domain with the most unknown nodes and breaks
 * ties on domain id, and `"C" < "F"`, so the walk drains `F` down to parity and
 * then switches to `C`. Choosing `fillers - chain` therefore places the first `C`
 * probe at a known item number.
 */
function twoDomainGraph(
  fillers: number,
  chain: number,
): { graph: WalkGraph; ids: string[] } {
  const edges = new Map<string, string[]>();
  for (let i = 0; i < fillers; i++) {
    edges.set(`F.${i}`, []);
  }
  for (let i = 0; i < chain; i++) {
    edges.set(`C.${i}`, i === 0 ? [] : [`C.${i - 1}`]);
  }
  const ids = [...edges.keys()];

  const prereqs = (id: string): readonly string[] => edges.get(id) ?? [];
  const dependents = new Map<string, string[]>();
  for (const id of ids) {
    for (const p of prereqs(id)) {
      const list = dependents.get(p);
      if (list) list.push(id);
      else dependents.set(p, [id]);
    }
  }
  const closure = (id: string, adj: (n: string) => readonly string[]): Set<string> => {
    const out = new Set<string>();
    const stack = [...adj(id)];
    while (stack.length) {
      const next = stack.pop();
      if (!next || out.has(next)) continue;
      out.add(next);
      stack.push(...adj(next));
    }
    return out;
  };

  return {
    ids,
    graph: {
      prereqs,
      // Fillers are all roots (depth 0); `C.i` sits at depth `i`.
      depth: (id) => (id.startsWith("C") ? Number(id.split(".")[1] ?? 0) : 0),
      transitivePrereqs: (id) => closure(id, prereqs),
      transitiveDependents: (id) => closure(id, (n) => dependents.get(n) ?? []),
      domain: (id) => id.split(".")[0] ?? id,
    },
  };
}

/**
 * Alternating correctness over the fillers. Both a measured pass and a measured
 * fail at depth 0 puts the frontier bisection's deepest-pass and shallowest-fail
 * at the same depth, so the target the chain is entered at is its midpoint, 0 —
 * which is how these tests aim the ceiling at `C.0` rather than at whatever depth
 * an all-correct or all-incorrect filler run would imply.
 */
const alternatingFillers = (id: string): boolean =>
  id.startsWith("F") && Number(id.split(".")[1] ?? 0) % 2 === 0;

/** Drive the real engine to completion under the shipped policy. */
function runWalk(
  ids: readonly string[],
  graph: WalkGraph,
  isCorrect: (nodeId: string) => boolean,
): WalkState {
  let state = startWalk({ scope: ids, entryTier: 2 }, graph, DEFAULT_WALK_POLICY);
  let guard = 0;
  while (!isWalkComplete(state)) {
    const node = currentProbeNode(state);
    if (!node) break;
    state = recordScoredOutcome(state, isCorrect(node), graph, DEFAULT_WALK_POLICY);
    if (++guard > 10_000) throw new Error("walk did not terminate");
  }
  return state;
}

/** In-scope nodes the walk never decided — the fail-closed population. */
function undecided(state: WalkState): string[] {
  return state.scope.filter((id) => state.probed[id]?.result === undefined);
}

describe("instrument ceiling — the budget check stops selection", () => {
  // `${CEILING} + 30` isolated nodes, each decided on one item, so the walk wants
  // one probe per node and can afford only `CEILING` of them.
  const { graph, ids } = twoDomainGraph(CEILING + 30, 0);

  it("stops at exactly the ceiling with nodes still unknown", () => {
    const state = runWalk(ids, graph, alternatingFillers);

    expect(servedItemCount(state)).toBe(CEILING);
    expect(currentProbeNode(state)).toBeNull();
    expect(state.ceiling_reached).toBe(true);
    // The guard fired with work left to do — that is what makes it a ceiling and
    // not just the end of the walk.
    expect(undecided(state).length).toBe(30);
  });

  it("credits nothing it did not probe (INV-DIAG-6 holds at the ceiling)", () => {
    const state = runWalk(ids, graph, alternatingFillers);
    const resolved = resolveKnowledgeState(state, graph);
    const byId = new Map(resolved.map((r) => [r.node_id, r]));

    for (const id of undecided(state)) {
      const resolution = byId.get(id);
      expect(resolution?.status, id).toBe("unknown");
      expect(placementFor(resolution as never, state.probed[id]), id).toBe(0);
    }
    // Nothing outside `probed` contributes to the reported number either.
    const credited = resolved.filter((r) => r.status === "passed").map((r) => r.node_id);
    for (const id of credited) {
      expect(state.probed[id]?.result, id).toBe("passed");
    }
  });
});

describe("instrument ceiling — mid-node truncation", () => {
  /**
   * The subtlest branch in `walk.ts`: the budget runs out between a node's first
   * item and the confirming item its consequence requires, so the walk stops with
   * that node in `probed`, holding recorded outcomes and NO `result`.
   *
   * Sized so the first `C` probe is item `CEILING`: the walk spends
   * `fillers - chain` items draining `F` to parity, then switches to `C` on the
   * tie-break. `C.0`'s dependent cone (13) clears the scope's confirm threshold
   * (`floor(7/62 x 97) = 10`), so a miss on it cannot be taken on one item — and
   * there is no budget left to confirm it.
   */
  const CHAIN = 14;
  const { graph, ids } = twoDomainGraph(CEILING - 1 + CHAIN, CHAIN);
  // Fillers alternate (aiming the chain entry at `C.0`); the chain probe misses.
  const state = runWalk(ids, graph, alternatingFillers);

  it("leaves the node probed, with outcomes and no result", () => {
    expect(servedItemCount(state)).toBe(CEILING);
    expect(state.ceiling_reached).toBe(true);
    expect(currentProbeNode(state)).toBeNull();

    const truncated = state.probed["C.0"];
    expect(truncated).toBeDefined();
    expect(truncated?.outcomes).toEqual([false]);
    expect(truncated?.result).toBeUndefined();
    expect(truncated?.robust).toBeUndefined();
    expect(truncated?.infers).toBeUndefined();
  });

  it("resolves the half-probed node `unknown`, never `failed`", () => {
    const resolved = resolveKnowledgeState(state, graph);
    const c0 = resolved.find((r) => r.node_id === "C.0");

    // The recorded miss is real evidence, but not CONFIRMED evidence, so it must
    // not become a failure: a failure would prune the 13 nodes above it
    // (INV-DIAG-7), on one item the walk itself refused to decide on.
    expect(c0?.status).toBe("unknown");
    for (let i = 1; i < CHAIN; i++) {
      expect(resolved.find((r) => r.node_id === `C.${i}`)?.status, `C.${i}`).toBe(
        "unknown",
      );
    }
  });

  it("places the half-probed node at seed 0, not the partial-credit 1", () => {
    const resolved = resolveKnowledgeState(state, graph);
    const c0 = resolved.find((r) => r.node_id === "C.0");

    // `placementFor` hands out seed 1 for a fail with >= 1 correct attempt. An
    // unresolved node has no such standing whatever it answered, and this node
    // answered incorrectly anyway: not-ready, no credit from the ceiling.
    expect(placementFor(c0 as never, state.probed["C.0"])).toBe(0);
    expect(placementFor(c0 as never, { outcomes: [true] })).toBe(0);
  });

  it("keeps the truncated node out of the coverage numerator", () => {
    const resolved = resolveKnowledgeState(state, graph);
    const coverage = computeCoverage(resolved, ids);
    const passed = new Set(
      resolved.filter((r) => r.status === "passed").map((r) => r.node_id),
    );

    for (const id of undecided(state)) {
      expect(passed.has(id), id).toBe(false);
    }
    // The fillers that WERE probed are all correct, so coverage is positive but
    // strictly bounded away from complete — the truncation is visible in the score.
    expect(coverage.coverage).toBeGreaterThan(0);
    expect(coverage.coverage).toBeLessThan(1);
  });
});

describe("instrument ceiling — exhausting the budget is not always truncation", () => {
  it("does not flag a walk that resolved its last node on its last item", () => {
    // Exactly `CEILING` isolated nodes: one item each, so the unknown set empties
    // on the same item that spends the budget. `selectNextProbe` returns null for
    // both reasons at once, and only one of them is a ceiling.
    const { graph, ids } = twoDomainGraph(CEILING, 0);
    const state = runWalk(ids, graph, () => true);

    expect(servedItemCount(state)).toBe(CEILING);
    expect(undecided(state)).toEqual([]);
    expect(state.ceiling_reached).not.toBe(true);
    expect(computeCoverage(resolveKnowledgeState(state, graph), ids).coverage).toBe(1);
  });

  it("flags the same walk one node wider, where the budget genuinely bites", () => {
    const { graph, ids } = twoDomainGraph(CEILING + 1, 0);
    const state = runWalk(ids, graph, () => true);

    expect(servedItemCount(state)).toBe(CEILING);
    expect(undecided(state).length).toBe(1);
    expect(state.ceiling_reached).toBe(true);
  });

  it("never flags a walk that finished inside its budget", () => {
    const { graph, ids } = twoDomainGraph(CEILING - 10, 0);
    const state = runWalk(ids, graph, () => true);

    expect(servedItemCount(state)).toBeLessThan(CEILING);
    expect(state.ceiling_reached).not.toBe(true);
  });
});
