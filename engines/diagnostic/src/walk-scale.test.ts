import { getProductNodes, prereqDepth } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { computeCoverage } from "./coverage";
import {
  currentProbeNode,
  isWalkComplete,
  probedNodeCount,
  recordScoredOutcome,
  resolveKnowledgeState,
  startWalk,
  type WalkGraph,
  type WalkState,
} from "./walk";
import { placementFor } from "./walk-engine";

/**
 * Scale + shape properties of the adaptive frontier bisection (Amendment v2 §4).
 * The engine is graph-agnostic (`WalkGraph`), so we validate the real 62-node
 * product AND synthetic deep/wide DAGs that stand in for a larger future product:
 * - instrument length stays bounded (~25-40) and scales sub-linearly with nodes;
 * - the strongest student is never the longest (test-out) and the weakest exits
 *   fast (pruning) — the mid-ability frontier is the widest, so it probes most;
 * - the resolved state localizes each branch's frontier exactly (correctness).
 */

const PRODUCT_IDS = getProductNodes().map((n) => n.id);

/** Build a `WalkGraph` from an id -> prereqs adjacency map. */
function buildGraph(edges: Record<string, readonly string[]>): {
  graph: WalkGraph;
  ids: string[];
} {
  const ids = Object.keys(edges);
  const depthCache = new Map<string, number>();
  const depth = (id: string): number => {
    const cached = depthCache.get(id);
    if (cached !== undefined) return cached;
    const ps = edges[id] ?? [];
    const d = ps.length === 0 ? 0 : 1 + Math.max(...ps.map(depth));
    depthCache.set(id, d);
    return d;
  };
  const closure = (id: string, adj: (n: string) => readonly string[]): Set<string> => {
    const out = new Set<string>();
    const stack = [...adj(id)];
    while (stack.length) {
      const c = stack.pop();
      if (!c || out.has(c)) continue;
      out.add(c);
      stack.push(...adj(c));
    }
    return out;
  };
  const dependents = new Map<string, string[]>();
  for (const id of ids) {
    for (const p of edges[id] ?? []) {
      const list = dependents.get(p);
      if (list) list.push(id);
      else dependents.set(p, [id]);
    }
  }
  const prereqs = (id: string) => edges[id] ?? [];
  const deps = (id: string) => dependents.get(id) ?? [];
  return {
    ids,
    graph: {
      prereqs,
      depth,
      transitivePrereqs: (id) => closure(id, prereqs),
      transitiveDependents: (id) => closure(id, deps),
      // `coreN` is the shared trunk; `dK_N` belongs to domain chain `dK`. This is
      // the synthetic analogue of the registry's domain field, which the
      // per-domain frontier search bisects within.
      domain: (id) => (id.startsWith("core") ? "core" : (id.split("_")[0] ?? id)),
    },
  };
}

/** `k` domain chains (length `domainLen`) hanging off a shared core chain. */
function coreDomains(core: number, k: number, domainLen: number): Record<string, string[]> {
  const edges: Record<string, string[]> = {};
  for (let d = 0; d < core; d++) edges[`core${d}`] = d === 0 ? [] : [`core${d - 1}`];
  const top = `core${core - 1}`;
  for (let i = 0; i < k; i++) {
    for (let d = 0; d < domainLen; d++) {
      edges[`d${i}_${d}`] = d === 0 ? [top] : [`d${i}_${d - 1}`];
    }
  }
  return edges;
}

function runWalk(
  ids: readonly string[],
  isCorrect: (id: string) => boolean,
  graph?: WalkGraph,
): WalkState {
  let state = startWalk({ scope: ids, entryTier: 2 }, graph);
  let guard = 0;
  while (!isWalkComplete(state)) {
    const node = currentProbeNode(state);
    if (!node) break;
    state = recordScoredOutcome(state, isCorrect(node), graph);
    if (++guard > 100_000) throw new Error("walk did not terminate");
  }
  return state;
}

/** Items a student actually answered — the instrument-length unit that matters. */
function itemCount(state: WalkState): number {
  let items = 0;
  for (const record of Object.values(state.probed)) items += record.outcomes.length;
  return items;
}

/**
 * Nodes probed AND items served for uniform ability cutoffs `pass iff depth < cut`,
 * cut in [0..maxDepth+1].
 *
 * Both units are reported because they are not interchangeable and quoting only
 * nodes is how the pre-amendment budgets came to be read as instrument-length
 * bounds when they were not: at the old 2.34 items/node, a 48-node budget was
 * ~112 items.
 */
function countsByCut(
  ids: readonly string[],
  depthOf: (id: string) => number,
  graph?: WalkGraph,
): { nodes: number[]; items: number[] } {
  const maxDepth = Math.max(...ids.map(depthOf));
  const nodes: number[] = [];
  const items: number[] = [];
  for (let cut = 0; cut <= maxDepth + 1; cut++) {
    const state = runWalk(ids, (id) => depthOf(id) < cut, graph);
    nodes.push(probedNodeCount(state));
    items.push(itemCount(state));
  }
  return { nodes, items };
}

describe("adaptive frontier walk — shape on the real 62-node product", () => {
  it("stays bounded, strong is never the longest, weak exits fast", () => {
    const { nodes, items } = countsByCut(PRODUCT_IDS, prereqDepth);
    const max = Math.max(...nodes);
    const strong = nodes[nodes.length - 1]; // aces everything
    const weak = nodes[0]; // fails everything

    // Re-derived exhaustively over this test's own oracle under the amended
    // probe policy (see `sim/policy-sweep.sim.test.ts`, "budget re-derivation").
    // Items are pinned for the first time, because nodes alone were being read
    // as an instrument-length bound and are not one.
    //
    // 40 -> 41 nodes and 60 -> 62 items when the instrument ceiling moved from
    // 60 to 70. The old figures were not this sweep's true cost: its worst case
    // was being CLIPPED by the ceiling at exactly 60 items. These are the real
    // numbers, and the 62-item worst case is now genuinely under the ceiling
    // rather than pressed against it.
    expect(max).toBeLessThanOrEqual(41);
    expect(Math.max(...items)).toBeLessThanOrEqual(62);
    expect(strong).toBeLessThan(max); // test-out: acing is not the longest path
    expect(weak).toBeLessThanOrEqual(15); // pruning: the floor collapses fast
    // The widest frontier (mid ability) is the longest, not either extreme.
    const argmax = nodes.indexOf(max);
    expect(argmax).toBeGreaterThan(0);
    expect(argmax).toBeLessThan(nodes.length - 1);
  });

  it("coverage is monotonic in ability (0 when nothing known, 1 when all known)", () => {
    let prev = -1;
    const maxDepth = Math.max(...PRODUCT_IDS.map(prereqDepth));
    for (let cut = 0; cut <= maxDepth + 1; cut++) {
      const resolved = resolveKnowledgeState(
        runWalk(PRODUCT_IDS, (id) => prereqDepth(id) < cut),
      );
      const cov = computeCoverage(resolved).coverage;
      expect(cov).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = cov;
    }
    expect(
      computeCoverage(resolveKnowledgeState(runWalk(PRODUCT_IDS, () => false))).coverage,
    ).toBe(0);
    expect(
      computeCoverage(resolveKnowledgeState(runWalk(PRODUCT_IDS, () => true))).coverage,
    ).toBeCloseTo(1, 10);
  });

  it("mixed per-domain frontiers stay within budget across many seeds", () => {
    const domainOf = (id: string) => id.split(".")[0] ?? id;
    let worst = 0;
    let worstItems = 0;
    for (let s = 1; s <= 50; s++) {
      let seed = s * 2654435761;
      const rand = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      const cut = new Map<string, number>();
      for (const id of PRODUCT_IDS) {
        const dom = domainOf(id);
        if (!cut.has(dom)) cut.set(dom, Math.floor(rand() * 9));
      }
      const state = runWalk(
        PRODUCT_IDS,
        (id) => prereqDepth(id) < (cut.get(domainOf(id)) ?? 0),
      );
      worst = Math.max(worst, probedNodeCount(state));
      worstItems = Math.max(worstItems, itemCount(state));
    }
    // Budget re-tuned 40 -> 47 by the 2026-07-24 coverage expansion (61 nodes),
    // then 47 -> 48 when the 2026-07-25 D2 QA pass appended RAD.4 (62 nodes).
    //
    // Re-derived 48 -> 38 for the amended probe policy. This is a TIGHTENING,
    // not a re-tune: the per-domain frontier target resolves this sweep in ten
    // fewer probes. Items are pinned alongside for the first time, and are the
    // number that actually bounds the student's experience — the same sweep cost
    // 132 items under the old policy and costs 56 now. Both figures are the
    // exact measured worst case over these 50 seeds (see
    // `sim/policy-sweep.sim.test.ts`, "budget re-derivation"), not padded.
    expect(worst).toBeLessThanOrEqual(38);
    expect(worstItems).toBeLessThanOrEqual(56);
  });

  it("is deterministic: identical inputs yield an identical probe trace", () => {
    const oracle = (id: string) => prereqDepth(id) < 4;
    const a = runWalk(PRODUCT_IDS, oracle);
    const b = runWalk(PRODUCT_IDS, oracle);
    expect(Object.keys(a.probed)).toEqual(Object.keys(b.probed));
  });
});

describe("adaptive frontier walk — scale on synthetic deep/wide DAGs", () => {
  /**
   * Budgets re-derived exhaustively under the amended probe policy (see
   * `sim/policy-sweep.sim.test.ts`, "budget re-derivation"). Each is the exact
   * measured worst case over that shape's cutoff sweep, not a padded bound.
   *
   * NODE budgets rise on these shapes (43-node: 28 -> 29, 88-node: 40 -> 47)
   * while ITEM budgets are well under what the old node counts implied. That is
   * the amended policy behaving as designed rather than a regression: these
   * synthetic shapes are pure independent chains, so per-domain bisection walks
   * into more of them, but each node now costs about one item instead of 2.34.
   * The 88-node shape at 47 nodes / 57 items would have cost ~94 items at the
   * old multiplier. Pinning both units is the point.
   */
  const shapes: {
    name: string;
    edges: Record<string, string[]>;
    nodeBudget: number;
    itemBudget: number;
  }[] = [
    {
      name: "core3 x 8 domains x len5 (43)",
      edges: coreDomains(3, 8, 5),
      nodeBudget: 29,
      itemBudget: 44,
    },
    {
      name: "core4 x 12 domains x len7 (88)",
      edges: coreDomains(4, 12, 7),
      nodeBudget: 47,
      itemBudget: 57,
    },
    {
      name: "core2 x 4 domains x len14 (58, deep)",
      edges: coreDomains(2, 4, 14),
      nodeBudget: 19,
      itemBudget: 43,
    },
  ];

  for (const shape of shapes) {
    it(`bounded + strong-not-longest: ${shape.name}`, () => {
      const { graph, ids } = buildGraph(shape.edges);
      const { nodes, items } = countsByCut(ids, graph.depth, graph);
      const max = Math.max(...nodes);
      const strong = nodes[nodes.length - 1] ?? 0;
      const weak = nodes[0] ?? 0;

      expect(max).toBeLessThanOrEqual(shape.nodeBudget); // sub-linear in node count
      expect(Math.max(...items)).toBeLessThanOrEqual(shape.itemBudget);
      expect(strong).toBeLessThan(max); // test-out keeps the strongest short
      expect(weak).toBeLessThanOrEqual(strong); // pruning keeps the weakest shortest
    });
  }

  it("localizes each branch's frontier exactly (per-domain correctness)", () => {
    const { graph, ids } = buildGraph(coreDomains(3, 6, 6));
    // Downward-closed oracle: core fully known; each domain has its own frontier.
    const domainCut = [0, 2, 4, 6, 3, 5];
    const known = (id: string): boolean => {
      if (id.startsWith("core")) return true;
      const parts = id.slice(1).split("_").map(Number);
      const d = parts[0] ?? 0;
      const k = parts[1] ?? 0;
      return k < (domainCut[d] ?? 0);
    };
    const state = runWalk(ids, known, graph);
    const resolved = resolveKnowledgeState(state, graph);

    for (const r of resolved) {
      // A node is resolved as passed IFF the student actually knows it.
      expect(r.status === "passed").toBe(known(r.node_id));

      // ...and the 0-3 city seed (walk-engine.placementFor) separates known from
      // not-ready: credited nodes seed >= 2 (measured-robust 3 / otherwise 2),
      // not-ready nodes seed <= 1 (partial fail 1 / hard fail or prune 0).
      const seed = placementFor(r, state.probed[r.node_id]);
      if (known(r.node_id)) {
        expect(seed).toBeGreaterThanOrEqual(2);
        // A measured pass no longer implies seed 3 even under a perfect oracle.
        // Seed 3 requires `robust`, which is still exactly a clean 2/2, and the
        // amended policy stops buying a second item for a pass whose closure is
        // too small to cascade — such a node passes on one item and seeds 2.
        // The unlock boundary is unaffected: test-out keys on seed >= 2, which
        // still holds for every known node.
        const record = state.probed[r.node_id];
        if (r.status === "passed" && r.source === "measured") {
          expect(seed).toBe(record?.robust ? 3 : 2);
        }
      } else {
        expect(seed).toBeLessThanOrEqual(1);
      }
    }
  });
});
