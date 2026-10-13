import {
  getNode,
  getNodesByScope,
  getProductNodes,
  prereqDepth,
  transitivePrereqs,
} from "@cr/skill-graph";
import { describe, it } from "vitest";

import { confirmThresholdFor } from "../src/adjudicator";
import { computeCoverage } from "../src/coverage";
import {
  currentProbeNode,
  DEFAULT_WALK_POLICY,
  isWalkComplete,
  probedNodeCount,
  recordScoredOutcome,
  resolveKnowledgeState,
  scopeConsequence,
  startWalk,
  type WalkPolicy,
  type WalkState,
} from "../src/walk";
import { placementFor } from "../src/walk-engine";

/**
 * PROBE-COST MEASUREMENT HARNESS — a permanent measurement tool, NOT a CI test.
 *
 * ── What it measures ───────────────────────────────────────────────────────
 * How long the Adaptive-Diagnostic v2 walk actually is, in ITEMS a student
 * answers (not just nodes probed), on the real 62-node product graph. It
 * asserts nothing: every result is printed. Four measurements:
 *
 *   1. "graph facts"          — node counts and the depth histogram.
 *   2. "reproduces the ..."   — replays the two synthetic depth oracles that
 *                               `src/walk-scale.test.ts` pins its budgets to,
 *                               so drift between this harness and that test is
 *                               visible. Also prints the ITEM cost of those
 *                               node-count budgets, which the test never shows.
 *   3. "typical distribution" — nodes/items per ability profile x noise level.
 *   4. "pooled ... + D1"      — full scope vs the D1+D2 candidate vs live D1.
 *   5. "cap tradeoff"         — accuracy lost to a naive hard item cap.
 *   6. "11-node D1+D2 scope"  — the intermediate scope in full: opening probe,
 *                               ceiling, truth accuracy, and what the
 *                               confirm-threshold-of-1 regime costs.
 *
 * Recorded results and their interpretation:
 * `docs/Diagnostic_Probe_Cost_Measurement.md` (62-node scope, measured 2026-07-25)
 * `docs/Diagnostic_11_Node_Scope_Measurement.md` (D1+D2, measured 2026-07-26).
 *
 * ── !! READ THIS BEFORE SCORING A NEW POLICY ON THIS HARNESS !! ────────────
 * The student model can hand you a fake win.
 *
 * Synthetic students are drawn from a PER-DOMAIN DEPTH CUT (`cutProfile` /
 * `independentStrands` below): each domain draws one cutoff, and every node in
 * that domain is known iff its `prereqDepth` falls below it. So same-depth
 * nodes in the SAME DOMAIN share a truth value — before `closeDownward`,
 * always; after it, in all but the case where one of them has an out-of-domain
 * prereq that another domain's cut excluded. Near-perfectly correlated, in
 * other words, by construction of the generator and NOT by anything true of
 * the DAG or of real learners.
 *
 * A policy that infers across SIBLINGS ("she passed one depth-3 node in D4, so
 * credit the other depth-3 nodes in D4") will therefore post an excellent
 * score here and be worthless in production. It is measuring this file, not
 * the instrument. And because the correlation is near-perfect rather than
 * perfect, the score looks plausible rather than obviously broken.
 *
 * Keep inference DAG-STRUCTURAL: prerequisite closure and dependent cone only,
 * never "similar" or "nearby" nodes. If you want to evaluate a sibling-style
 * policy, you must first replace the student model with one whose truth values
 * are not a function of (domain, depth).
 *
 * See `docs/Diagnostic_Probe_Cost_Measurement.md` §13.7.
 *
 * ── Why it is not a normal test ────────────────────────────────────────────
 * A full run is ~100,000 real walks and takes several minutes, so it lives
 * OUTSIDE `engines/diagnostic/src/` and is therefore collected by neither the
 * root `vitest.config.ts` (`engines/**\/src/**\/*.test.ts`) nor
 * `vitest.browser.config.ts`. `npm run test:unit` and CI never see it. It is
 * likewise outside this package's `tsconfig.json` (`include: ["src/**\/*"]`),
 * so it does not affect `tsc --build`.
 *
 * ── How to run it ──────────────────────────────────────────────────────────
 * From the repo root:
 *
 *   npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts
 *
 * THE DEFAULT RUN IS THE RECORDED ONE. At the default `SIM_N = 2000` this is
 * ~102,000 walks (18,000 + 36,000 + 48,000 across the three sampling tests) and
 * reproduces the design note's figures exactly, because the headline "n = 6,000"
 * cells are the pooled and cap tests, which sample `N * 3`. Verified 2026-07-25:
 * pooled/mild gives med=82 p90=111 p99=132 max=145 and D1 gives med=7 p90=12
 * p99=15 max=18. Budget several minutes; the pooled test alone is ~3 min.
 *
 * `SIM_N` overrides the per-cell sample size for a quicker or wider sweep — but
 * verify it actually took effect (the printed `n=` must change). An inline
 * `SIM_N=... npx ...` prefix does not always reach the worker through `npx` on
 * Windows, which silently gives you the default instead.
 *
 * Filter to one measurement with `-t`, e.g. `-t "cap tradeoff"`. Vitest buffers
 * a test's stdout until that test finishes, so redirect to a file for long runs
 * rather than assuming a silent terminal means it has hung.
 *
 * ── Method (see the design note §10) ───────────────────────────────────────
 * Drives the REAL engine (`startWalk` / `recordScoredOutcome` /
 * `resolveKnowledgeState`) over the REAL registry graph — nothing is
 * reimplemented, so the harness cannot drift from shipped behaviour.
 *
 * Synthetic students are per-domain frontier depths forced DOWNWARD-CLOSED over
 * the actual DAG, so every true knowledge state is coherent (a node is known
 * only if all its in-scope prereqs are). That is the property the
 * `walk-scale.test.ts` oracle lacks, and it is why coherent students exceed
 * that test's pinned 48-node figure.
 *
 * The engine has no internal noise model (it consumes one boolean per item), so
 * slip/guess is injected at the responder, with every (node, attempt) response
 * PRE-DRAWN so a capped run is an exact prefix of the uncapped one.
 */

const PRODUCT_IDS = getProductNodes().map((n) => n.id);
const D1_IDS = getNodesByScope("mvp").map((n) => n.id);

/**
 * The D1 + D2 intermediate scope — the candidate first widening of the live
 * instrument past D1. DERIVED, not hardcoded: every in-product node of the two
 * domains, which is the 6 D1 (mvp) nodes plus the 5 D2 (target) nodes
 * NUM.S/NUM.F/NUM.2/NUM.3/NUM.4/NUM.5 + EXP.1/RAD.1/RAD.2/RAD.3/RAD.4.
 *
 * It is the smallest widening that is PREREQUISITE-CLOSED — no in-scope node has
 * a transitive prerequisite outside the set — which matters because a walk whose
 * scope is not closed cannot resolve downward-closed (`resolveKnowledgeState`
 * only ever credits a node whose in-scope prereqs passed, so an out-of-scope
 * prereq silently drops out of the resolution rather than being measured). The
 * 11-node measurement below re-derives and prints that closure check rather than
 * assuming it.
 *
 * The 62-node full scope is NOT a viable next step for a different reason:
 * `createItemPackWalkSource` throws for a node with no authored items
 * (`packages/item-bank/src/bank.ts`), and most of the 62 have none.
 */
const D1_D2_IDS = getProductNodes()
  .filter((n) => n.domain === "D1" || n.domain === "D2")
  .map((n) => n.id);

const N = Number(process.env.SIM_N ?? 2000);

const domainOf = (id: string): string => getNode(id)?.domain ?? id.split(".")[0] ?? id;
const depthOf = prereqDepth;
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

function inScopePrereqs(id: string, scopeSet: ReadonlySet<string>): string[] {
  return (getNode(id)?.prereqs ?? []).filter((p) => scopeSet.has(p));
}

/** Make a candidate known-set coherent: a node is known only if all in-scope prereqs are. */
function closeDownward(
  candidate: ReadonlySet<string>,
  scope: readonly string[],
): Set<string> {
  const scopeSet = new Set(scope);
  const order = [...scope].sort((a, b) => depthOf(a) - depthOf(b) || a.localeCompare(b));
  const known = new Set<string>();
  for (const id of order) {
    if (!candidate.has(id)) continue;
    if (inScopePrereqs(id, scopeSet).every((p) => known.has(p))) known.add(id);
  }
  return known;
}

// ── True-ability profiles ────────────────────────────────────────────────────
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

/** Strand-independent: each domain's frontier drawn independently (strong/weak mix). */
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

// ── The real walk, driven one scored outcome at a time ───────────────────────
type Responses = Map<string, boolean[]>;

/** Pre-draw every (node, attempt) response so a capped run is an exact prefix. */
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
  itemCap = Number.POSITIVE_INFINITY,
  policy: WalkPolicy = DEFAULT_WALK_POLICY,
): { state: WalkState; items: number; capped: boolean } {
  let state = startWalk({ scope, entryTier: 2 }, undefined, policy);
  let items = 0;
  while (!isWalkComplete(state)) {
    const node = currentProbeNode(state);
    if (!node) break;
    if (items >= itemCap) return { state, items, capped: true };
    const attempt = state.probed[node]?.outcomes.length ?? 0;
    const correct = responses.get(node)?.[attempt] ?? false;
    state = recordScoredOutcome(state, correct, undefined, policy);
    items += 1;
    if (items > 100_000) throw new Error("walk did not terminate");
  }
  return { state, items, capped: false };
}

// ── Stats ────────────────────────────────────────────────────────────────────
function pct(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))] as number;
}

function describeDist(label: string, values: number[]): string {
  const s = [...values].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return (
    `${label.padEnd(34)} n=${s.length}  min=${s[0]}  med=${pct(s, 50)}  ` +
    `mean=${mean.toFixed(1)}  p90=${pct(s, 90)}  p99=${pct(s, 99)}  max=${s[s.length - 1]}`
  );
}

function histogram(values: number[], bucket: number): string {
  const buckets = new Map<number, number>();
  for (const v of values) {
    const b = Math.floor(v / bucket) * bucket;
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([b, c]) => `${b}-${b + bucket - 1}:${((100 * c) / values.length).toFixed(1)}%`)
    .join("  ");
}

const NOISE = [
  { name: "noiseless", slip: 0, guess: 0 },
  { name: "mild(slip.10/guess.05)", slip: 0.1, guess: 0.05 },
  { name: "moderate(slip.15/guess.10)", slip: 0.15, guess: 0.1 },
];

describe("probe-cost measurement", () => {
  it("graph facts", () => {
    console.log("\n===== GRAPH =====");
    console.log(
      `in-product nodes: ${PRODUCT_IDS.length}   D1(mvp) nodes: ${D1_IDS.length}`,
    );
    console.log(`max prereqDepth: ${MAX_DEPTH}`);
    const byDepth = new Map<number, number>();
    for (const id of PRODUCT_IDS)
      byDepth.set(depthOf(id), (byDepth.get(depthOf(id)) ?? 0) + 1);
    console.log(
      "nodes by depth: " +
        [...byDepth.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([d, c]) => `${d}:${c}`)
          .join(" "),
    );
  });

  it("reproduces the walk-scale.test.ts oracles on 62 nodes", () => {
    console.log("\n===== EXISTING TEST ORACLES (62-node graph) =====");
    // Oracle A: uniform global depth cutoff (test 1 / countsByCut).
    const counts: number[] = [];
    for (let cut = 0; cut <= MAX_DEPTH + 1; cut++) {
      const known = new Set(PRODUCT_IDS.filter((id) => depthOf(id) < cut));
      const resp = drawResponses(known, PRODUCT_IDS, mulberry32(1), 0, 0);
      const { state, items } = runWalk(PRODUCT_IDS, resp);
      counts.push(probedNodeCount(state));
      console.log(`  uniform cut=${cut}: nodes=${probedNodeCount(state)} items=${items}`);
    }
    console.log(
      `  -> max nodes over uniform cuts = ${Math.max(...counts)} (test 1 pins <= 40)`,
    );

    // Oracle B: the exact 50-seed per-domain cutoff sweep the 48 is pinned to.
    let worstNodes = 0;
    let worstItems = 0;
    for (let s = 1; s <= 50; s++) {
      let seed = s * 2654435761;
      const rand = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      const cut = new Map<string, number>();
      for (const id of PRODUCT_IDS) {
        const dom = id.split(".")[0] ?? id;
        if (!cut.has(dom)) cut.set(dom, Math.floor(rand() * 9));
      }
      const known = new Set(
        PRODUCT_IDS.filter((id) => depthOf(id) < (cut.get(id.split(".")[0] ?? id) ?? 0)),
      );
      const resp = drawResponses(known, PRODUCT_IDS, mulberry32(2), 0, 0);
      const { state, items } = runWalk(PRODUCT_IDS, resp);
      worstNodes = Math.max(worstNodes, probedNodeCount(state));
      worstItems = Math.max(worstItems, items);
    }
    console.log(
      `  -> 50-seed per-domain sweep worst: nodes=${worstNodes} (test pins <= 48), items=${worstItems}`,
    );
  });

  it("typical distribution on the 62-node graph", () => {
    console.log(`\n===== 62-NODE DISTRIBUTION (N=${N} per cell) =====`);
    const profiles: Profile[] = [
      cutProfile("homogeneous(spread=0)", 0),
      cutProfile("heterogeneous(spread=2.5)", 2.5),
      independentStrands,
    ];
    for (const noise of NOISE) {
      for (const profile of profiles) {
        const nodes: number[] = [];
        const items: number[] = [];
        const accs: number[] = [];
        for (let i = 0; i < N; i++) {
          const rand = mulberry32(0x9e3779b9 ^ (i * 2654435761));
          const known = profile.sample(rand, PRODUCT_IDS);
          const resp = drawResponses(known, PRODUCT_IDS, rand, noise.slip, noise.guess);
          const { state, items: it } = runWalk(PRODUCT_IDS, resp);
          nodes.push(probedNodeCount(state));
          items.push(it);
          const resolved = resolveKnowledgeState(state);
          let ok = 0;
          for (const r of resolved) {
            if ((r.status === "passed") === known.has(r.node_id)) ok += 1;
          }
          accs.push(ok / PRODUCT_IDS.length);
        }
        const meanAcc = accs.reduce((a, b) => a + b, 0) / accs.length;
        console.log(`\n[${noise.name}] ${profile.name}`);
        console.log("  " + describeDist("NODES probed", nodes));
        console.log("  " + describeDist("ITEMS served", items));
        console.log(`  mean known/not-known accuracy: ${(100 * meanAcc).toFixed(1)}%`);
        console.log("  items hist: " + histogram(items, 20));
      }
    }
  });

  it("pooled 62-node distribution + D1 comparison", () => {
    console.log(`\n===== POOLED (all 3 profiles, mild noise) vs D1+D2 vs D1 =====`);
    const profiles: Profile[] = [
      cutProfile("homogeneous", 0),
      cutProfile("heterogeneous", 2.5),
      independentStrands,
    ];
    for (const [label, scope] of [
      ["62-node full scope", PRODUCT_IDS],
      ["D1+D2 (11-node candidate)", D1_D2_IDS],
      ["D1-only (live scope)", D1_IDS],
    ] as const) {
      for (const noise of NOISE) {
        const nodes: number[] = [];
        const items: number[] = [];
        for (let i = 0; i < N * 3; i++) {
          const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
          const profile = profiles[i % profiles.length] as Profile;
          const known = profile.sample(rand, scope);
          const resp = drawResponses(known, scope, rand, noise.slip, noise.guess);
          const { state, items: it } = runWalk(scope, resp);
          nodes.push(probedNodeCount(state));
          items.push(it);
        }
        console.log(`\n[${label}] [${noise.name}]`);
        console.log("  " + describeDist("NODES probed", nodes));
        console.log("  " + describeDist("ITEMS served", items));
        console.log("  items hist: " + histogram(items, label.startsWith("D1") ? 3 : 20));
      }
    }
  });

  it("cap tradeoff on the 62-node graph", () => {
    console.log(`\n===== CAP TRADEOFF (mild noise, pooled profiles, N=${N * 3}) =====`);
    const caps = [20, 25, 30, 40, 50, 60, 80];
    const profiles: Profile[] = [
      cutProfile("homogeneous", 0),
      cutProfile("heterogeneous", 2.5),
      independentStrands,
    ];
    const acc: Record<string, number[]> = { uncapped: [] };
    const ready: Record<string, number[]> = {};
    const covErr: Record<string, number[]> = {};
    const hitRate: Record<string, number> = {};
    for (const c of caps) {
      acc[String(c)] = [];
      ready[String(c)] = [];
      covErr[String(c)] = [];
      hitRate[String(c)] = 0;
    }

    const total = N * 3;
    for (let i = 0; i < total; i++) {
      const rand = mulberry32(0xc2b2ae35 ^ (i * 3266489917));
      const profile = profiles[i % profiles.length] as Profile;
      const known = profile.sample(rand, PRODUCT_IDS);
      const resp = drawResponses(known, PRODUCT_IDS, rand, 0.1, 0.05);

      const full = runWalk(PRODUCT_IDS, resp);
      const fullResolved = resolveKnowledgeState(full.state);
      const fullCov = computeCoverage(fullResolved, PRODUCT_IDS).coverage;
      const fullReady = new Map<string, boolean>();
      let fullOk = 0;
      for (const r of fullResolved) {
        fullReady.set(r.node_id, placementFor(r, full.state.probed[r.node_id]) >= 2);
        if ((r.status === "passed") === known.has(r.node_id)) fullOk += 1;
      }
      acc.uncapped?.push(fullOk / PRODUCT_IDS.length);

      for (const c of caps) {
        const cut = runWalk(PRODUCT_IDS, resp, c);
        if (cut.capped) hitRate[String(c)] = (hitRate[String(c)] ?? 0) + 1;
        const res = resolveKnowledgeState(cut.state);
        let ok = 0;
        let agree = 0;
        for (const r of res) {
          if ((r.status === "passed") === known.has(r.node_id)) ok += 1;
          const isReady = placementFor(r, cut.state.probed[r.node_id]) >= 2;
          if (isReady === fullReady.get(r.node_id)) agree += 1;
        }
        acc[String(c)]?.push(ok / PRODUCT_IDS.length);
        ready[String(c)]?.push(agree / PRODUCT_IDS.length);
        covErr[String(c)]?.push(
          Math.abs(computeCoverage(res, PRODUCT_IDS).coverage - fullCov),
        );
      }
    }

    const avg = (xs?: number[]) =>
      xs && xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    console.log(
      `  uncapped  : truth-accuracy=${(100 * avg(acc.uncapped)).toFixed(1)}%  (ceiling)`,
    );
    for (const c of caps) {
      console.log(
        `  cap=${String(c).padStart(3)} items: truth-accuracy=${(100 * avg(acc[String(c)])).toFixed(1)}%` +
          `  ready-agree-vs-uncapped=${(100 * avg(ready[String(c)])).toFixed(1)}%` +
          `  mean|Δcoverage|=${avg(covErr[String(c)]).toFixed(3)}` +
          `  students-hitting-cap=${((100 * (hitRate[String(c)] ?? 0)) / total).toFixed(1)}%`,
      );
    }
  });

  /**
   * The 11-node D1+D2 scope in full — the measurement that decides whether the
   * live instrument can widen past D1.
   *
   * The reason it needs its own test rather than one more row in the pooled
   * comparison is `confirmThresholdFor(11, 7/62) = 1`, versus 0 at D1. At a
   * threshold of 0 every decision is confirmed (the ratified 2-of-3) and the
   * `itemCount === 1` branch of `adjudicate` is unreachable; at 1 it goes live
   * for the first time on a shipped scope. That is a REGIME change layered on
   * top of a scope change, so the two are separated here: the same cohort is run
   * twice, once under the shipped policy and once with `confirmScopeFraction`
   * pinned to 0, and the difference between those two runs is what the new
   * regime costs on its own.
   */
  it("11-node D1+D2 scope: opening probe, ceiling, and the threshold-1 regime", () => {
    console.log(`\n===== 11-NODE D1+D2 SCOPE (pooled, mild noise, n=${N * 3}) =====`);
    console.log(`scope (${D1_D2_IDS.length}): ${D1_D2_IDS.join(", ")}`);

    // 1. Prerequisite closure — the property the scope is chosen for.
    const scopeSet = new Set(D1_D2_IDS);
    const escaping: string[] = [];
    for (const id of D1_D2_IDS) {
      for (const prereq of transitivePrereqs(id)) {
        if (!scopeSet.has(prereq)) escaping.push(`${id}->${prereq}`);
      }
    }
    console.log(
      escaping.length === 0
        ? "prerequisite-closed: yes (no in-scope node depends on an out-of-scope node)"
        : `prerequisite-closed: NO — ${escaping.join(" ")}`,
    );

    // 2. The opening probe, which is scope-sensitive: `nearestToTarget` breaks
    //    depth ties on how many IN-SCOPE unknowns a node reaches, so widening the
    //    scope can move the very first question a learner sees.
    console.log("\n--- OPENING PROBE (first question served, by scope) ---");
    for (const [label, scope] of [
      ["D1 (6, live)", D1_IDS],
      ["D1+D2 (11)", D1_D2_IDS],
      ["full (62)", PRODUCT_IDS],
    ] as const) {
      const opening = startWalk({ scope, entryTier: 2 }).current;
      const consequence = scopeConsequence(scope).get(opening ?? "");
      console.log(
        `  ${label.padEnd(14)} -> ${String(opening).padEnd(7)} ` +
          `depth=${depthOf(opening ?? "")} domain=${domainOf(opening ?? "")} ` +
          `passClosure=${consequence?.passClosure ?? 0} failCone=${consequence?.failCone ?? 0}`,
      );
    }

    // 3. Which nodes the threshold-1 regime can actually decide on one item, and
    //    what such a decision would cascade. A one-item PASS credits the node's
    //    in-scope prerequisite closure, so the size of that closure is exactly
    //    what the threshold is protecting.
    const threshold = confirmThresholdFor(
      D1_D2_IDS.length,
      DEFAULT_WALK_POLICY.confirmScopeFraction,
    );
    const consequence = scopeConsequence(D1_D2_IDS);
    console.log(
      `\n--- CONSEQUENCE TABLE (confirmThreshold=${threshold}; ` +
        `D1=${confirmThresholdFor(D1_IDS.length, DEFAULT_WALK_POLICY.confirmScopeFraction)}, ` +
        `62=${confirmThresholdFor(PRODUCT_IDS.length, DEFAULT_WALK_POLICY.confirmScopeFraction)}) ---`,
    );
    for (const id of [...D1_D2_IDS].sort(
      (a, b) => depthOf(a) - depthOf(b) || a.localeCompare(b),
    )) {
      const c = consequence.get(id);
      const passOnOne = (c?.passClosure ?? 0) < threshold;
      const failOnOne = (c?.failCone ?? 0) < threshold;
      console.log(
        `  ${id.padEnd(7)} depth=${depthOf(id)} passClosure=${String(c?.passClosure ?? 0).padStart(2)} ` +
          `failCone=${String(c?.failCone ?? 0).padStart(2)}  ` +
          `one-item pass=${passOnOne ? "YES" : "no "}  one-item fail=${failOnOne ? "YES" : "no "}`,
      );
    }

    // 4. The paired A/B. Seeds are a pure function of the iteration index, so the
    //    two policies see the SAME students and the SAME pre-drawn responses.
    const profiles: Profile[] = [
      cutProfile("homogeneous", 0),
      cutProfile("heterogeneous", 2.5),
      independentStrands,
    ];
    const pinnedToZero: WalkPolicy = {
      ...DEFAULT_WALK_POLICY,
      confirmScopeFraction: 0,
    };

    interface Run {
      items: number[];
      nodes: number[];
      accs: number[];
      ceilingHits: number;
      /** Nodes decided on a single scorable item, per session. */
      oneItem: number[];
      oneItemPasses: number[];
      oneItemFails: number[];
      /** Nodes credited `inferred` solely by a single-item pass, per session. */
      creditedByOneItemPass: number[];
    }
    const blank = (): Run => ({
      items: [],
      nodes: [],
      accs: [],
      ceilingHits: 0,
      oneItem: [],
      oneItemPasses: [],
      oneItemFails: [],
      creditedByOneItemPass: [],
    });
    const shipped = blank();
    const pinned = blank();

    const total = N * 3;
    for (let i = 0; i < total; i++) {
      const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
      const profile = profiles[i % profiles.length] as Profile;
      const known = profile.sample(rand, D1_D2_IDS);
      const responses = drawResponses(known, D1_D2_IDS, rand, 0.1, 0.05);

      for (const [policy, out] of [
        [DEFAULT_WALK_POLICY, shipped],
        [pinnedToZero, pinned],
      ] as const) {
        const run = runWalk(D1_D2_IDS, responses, Number.POSITIVE_INFINITY, policy);
        out.items.push(run.items);
        out.nodes.push(probedNodeCount(run.state));
        if (run.state.ceiling_reached === true) out.ceilingHits += 1;

        const resolved = resolveKnowledgeState(run.state);
        let ok = 0;
        for (const r of resolved) {
          if ((r.status === "passed") === known.has(r.node_id)) ok += 1;
        }
        out.accs.push(ok / D1_D2_IDS.length);

        // Single-item decisions, and what they cascaded. A node credited by a
        // single-item pass is one that the walk never measured and that ONLY a
        // one-item pass licensed — the risk the threshold exists to bound.
        let one = 0;
        let onePass = 0;
        let oneFail = 0;
        const creditedByOne = new Set<string>();
        const creditedByConfirmed = new Set<string>();
        for (const record of Object.values(run.state.probed)) {
          if (record.outcomes.length !== 1 || record.result === undefined) continue;
          one += 1;
          if (record.result === "passed") onePass += 1;
          else oneFail += 1;
        }
        for (const [id, record] of Object.entries(run.state.probed)) {
          if (record.result !== "passed" || record.infers !== true) continue;
          const target = record.outcomes.length === 1 ? creditedByOne : creditedByConfirmed;
          for (const prereq of transitivePrereqs(id)) {
            if (scopeSet.has(prereq) && run.state.probed[prereq] === undefined) {
              target.add(prereq);
            }
          }
        }
        for (const id of creditedByConfirmed) creditedByOne.delete(id);
        out.oneItem.push(one);
        out.oneItemPasses.push(onePass);
        out.oneItemFails.push(oneFail);
        out.creditedByOneItemPass.push(creditedByOne.size);
      }
    }

    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const report = (label: string, run: Run) => {
      console.log(`\n[${label}]`);
      console.log("  " + describeDist("NODES probed", run.nodes));
      console.log("  " + describeDist("ITEMS served", run.items));
      console.log(
        `  truth accuracy: ${(100 * mean(run.accs)).toFixed(1)}%   ` +
          `hit the ${DEFAULT_WALK_POLICY.maxItems}-item ceiling: ` +
          `${((100 * run.ceilingHits) / total).toFixed(1)}%`,
      );
      console.log("  items hist: " + histogram(run.items, 3));
      console.log(
        `  single-item decisions: ${mean(run.oneItem).toFixed(2)} nodes/session ` +
          `(${((100 * mean(run.oneItem)) / mean(run.nodes)).toFixed(1)}% of probed nodes) ` +
          `= ${mean(run.oneItemPasses).toFixed(2)} passes + ${mean(run.oneItemFails).toFixed(2)} fails`,
      );
      console.log(
        `  prereqs credited by a single-item pass alone: ` +
          `${mean(run.creditedByOneItemPass).toFixed(3)} nodes/session`,
      );
    };

    console.log(
      `\n--- THE ISOLATION: same cohort, threshold ${threshold} vs threshold 0 ---`,
    );
    report(`shipped policy (confirmThreshold=${threshold})`, shipped);
    report("threshold pinned to 0 (ratified 2-of-3 everywhere)", pinned);

    const medianItems = (run: Run) => {
      const sorted = [...run.items].sort((a, b) => a - b);
      return pct(sorted, 50);
    };
    console.log(
      `\n  DELTA (shipped - pinned): ` +
        `items median ${medianItems(shipped)} vs ${medianItems(pinned)}   ` +
        `mean items ${mean(shipped.items).toFixed(2)} vs ${mean(pinned.items).toFixed(2)} ` +
        `(${(mean(shipped.items) - mean(pinned.items)).toFixed(2)})   ` +
        `truth accuracy ${(100 * mean(shipped.accs)).toFixed(1)}% vs ` +
        `${(100 * mean(pinned.accs)).toFixed(1)}% ` +
        `(${(100 * (mean(shipped.accs) - mean(pinned.accs))).toFixed(2)} pts)`,
    );
  });
});
