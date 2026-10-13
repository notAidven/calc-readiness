import {
  getNodesByScope,
  getProductNodes,
  transitiveDependents,
  transitivePrereqs,
} from "@cr/skill-graph";
import { describe, inject, it } from "vitest";

import { computeCoverage } from "../src/coverage";
import {
  currentProbeNode,
  DEFAULT_WALK_POLICY,
  isWalkComplete,
  LEGACY_WALK_POLICY,
  probedNodeCount,
  recordScoredOutcome,
  resolveKnowledgeState,
  startWalk,
  type WalkGraph,
  type WalkPolicy,
} from "../src/walk";
import { placementFor } from "../src/walk-engine";
import {
  depthOf,
  dist,
  domainOf,
  drawResponses,
  fmtDist,
  makeProfiles,
  mulberry32,
  type Profile,
  runWalk,
} from "./students";

/**
 * PROBE-POLICY SWEEP — a permanent measurement tool, NOT a CI test.
 *
 * Companion to `probe-cost.sim.test.ts`, which measures what the walk costs.
 * This one measures what CHANGING it costs, lever by lever, so the probe-policy
 * rebuild is read off evidence rather than argument. It asserts nothing; every
 * result is printed.
 *
 *   1. "control"        — LEGACY_WALK_POLICY must reproduce the recorded
 *                         baseline (82/111/132/145 items, 35/43/49/52 nodes).
 *                         If it does not, the refactor changed behaviour and
 *                         every other number here is meaningless.
 *   2. "lever isolation"— each lever switched on ALONE, against that control.
 *                         This is what decides whether the per-domain frontier
 *                         target actually helps; §13.4 of the measurement note
 *                         records that attribution as a hypothesis, not a fact.
 *   3. "threshold sweep"— confirmThreshold and foundationDomainSpan swept.
 *   4. "shipped"        — the chosen policy: both scopes, items AND nodes.
 *   5. "accuracy"       — truth accuracy vs the 97.8% uncapped ceiling, and the
 *                         cap tradeoff curve with and without the terminal rule.
 *
 * ── How to run it ──────────────────────────────────────────────────────────
 * From the repo root:
 *
 *   npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts \
 *     -t "lever isolation"
 *
 * Sample size per cell is `SIM_N` (default 500 here — this file runs many more
 * cells than probe-cost does). NOTE: an inline `SIM_N=... npx ...` prefix does
 * NOT reach the worker on Windows; use `export SIM_N=...` first, and ALWAYS
 * check the printed `n=` before believing a sample size.
 *
 * The synthetic-student model, and the sibling-inference trap it sets, are
 * documented in `./students.ts`. Read that before trusting any number here.
 */

const PRODUCT_IDS = getProductNodes().map((n) => n.id);
const D1_IDS = getNodesByScope("mvp").map((n) => n.id);
const MAX_DEPTH = Math.max(...PRODUCT_IDS.map(depthOf));
const PROFILES = makeProfiles(MAX_DEPTH);
/**
 * Sample size per profile; each pooled cell is `3 * N` students. Injected from
 * the config rather than read from `process.env`, which does not survive the hop
 * into the test worker on Windows.
 */
const N = Number(inject("simN") ?? 500);

const MILD = { slip: 0.1, guess: 0.05 };

interface Outcome {
  items: number[];
  nodes: number[];
  /** Fraction of in-scope nodes whose `passed`/not-`passed` call matches truth. */
  accuracy: number[];
  /** Fraction of students the instrument ceiling truncated. */
  cappedRate: number;
  /**
   * Fraction whose walk merely SPENT the whole budget. Before 2026-07-26 that was
   * what `ceiling_reached` recorded, so a walk that resolved its last unknown node
   * on its last affordable item was filed as truncated. The gap between this and
   * `cappedRate` is the size of that over-count.
   */
  spentBudgetRate: number;
}

/**
 * Pooled run over all three ability profiles at a fixed noise level. Seeds are a
 * pure function of the iteration index, so every policy sees the SAME students
 * and the same pre-drawn responses — the comparisons below are paired, not two
 * independent samples.
 */
function measure(
  policy: WalkPolicy,
  scope: readonly string[] = PRODUCT_IDS,
  n: number = N * 3,
  noise = MILD,
  openWith?: string,
): Outcome {
  const items: number[] = [];
  const nodes: number[] = [];
  const accuracy: number[] = [];
  let capped = 0;
  let spent = 0;

  for (let i = 0; i < n; i++) {
    const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
    const profile = PROFILES[i % PROFILES.length] as Profile;
    const known = profile.sample(rand, scope);
    const responses = drawResponses(known, scope, rand, noise.slip, noise.guess);

    const run = runWalk(scope, responses, policy, openWith);
    items.push(run.items);
    nodes.push(run.nodes);
    if (run.state.ceiling_reached === true) capped += 1;
    if (run.items >= policy.maxItems) spent += 1;

    const resolved = resolveKnowledgeState(run.state);
    let ok = 0;
    for (const r of resolved) {
      if ((r.status === "passed") === known.has(r.node_id)) ok += 1;
    }
    accuracy.push(ok / scope.length);
  }

  return {
    items,
    nodes,
    accuracy,
    cappedRate: capped / n,
    spentBudgetRate: spent / n,
  };
}

const meanOf = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);

function report(label: string, out: Outcome): void {
  console.log(`\n${label}`);
  console.log("  " + fmtDist("ITEMS", dist(out.items)));
  console.log("  " + fmtDist("NODES", dist(out.nodes)));
  console.log(
    `  items/node=${(meanOf(out.items) / meanOf(out.nodes)).toFixed(2)}` +
      `  truth-accuracy=${(100 * meanOf(out.accuracy)).toFixed(1)}%` +
      `  hit-ceiling=${(100 * out.cappedRate).toFixed(1)}%`,
  );
}

/** One-line form for sweeps, where the shape matters less than the trend. */
function line(label: string, out: Outcome): string {
  const di = dist(out.items);
  const dn = dist(out.nodes);
  return (
    `${label.padEnd(30)} items med=${String(di.med).padStart(3)} p90=${String(di.p90).padStart(3)} ` +
    `p99=${String(di.p99).padStart(3)} max=${String(di.max).padStart(3)} | ` +
    `nodes med=${String(dn.med).padStart(2)} p90=${String(dn.p90).padStart(2)} | ` +
    `acc=${(100 * meanOf(out.accuracy)).toFixed(1)}%`
  );
}

const withPolicy = (base: WalkPolicy, over: Partial<WalkPolicy>): WalkPolicy => ({
  ...base,
  ...over,
});

// ── Synthetic DAGs, mirroring walk-scale.test.ts so its budgets can be re-derived ──

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

function runSyntheticWalk(
  ids: readonly string[],
  responses: Map<string, boolean[]>,
  graph: WalkGraph,
): { nodes: number; items: number } {
  let state = startWalk({ scope: ids, entryTier: 2 }, graph, DEFAULT_WALK_POLICY);
  let items = 0;
  while (!isWalkComplete(state)) {
    const node = currentProbeNode(state);
    if (!node) break;
    const attempt = state.probed[node]?.outcomes.length ?? 0;
    state = recordScoredOutcome(
      state,
      responses.get(node)?.[attempt] ?? false,
      graph,
      DEFAULT_WALK_POLICY,
    );
    items += 1;
    if (items > 100_000) throw new Error("walk did not terminate");
  }
  return { nodes: probedNodeCount(state), items };
}

describe("probe-policy sweep", () => {
  it("control: the legacy policy still reproduces the recorded baseline", () => {
    console.log(`\n===== CONTROL (legacy policy, mild noise, n=${N * 3}) =====`);
    console.log(
      "Recorded baseline: items 82/111/132/145, nodes 35/43/49/52 (med/p90/p99/max).",
    );
    report("LEGACY_WALK_POLICY, 62-node scope", measure(LEGACY_WALK_POLICY));
    report("LEGACY_WALK_POLICY, D1 scope", measure(LEGACY_WALK_POLICY, D1_IDS));
  });

  it("lever isolation: which change actually buys the reduction", () => {
    console.log(`\n===== LEVER ISOLATION (from legacy, mild noise, n=${N * 3}) =====`);
    console.log("Each row switches ONE thing on relative to the legacy control.\n");

    const cases: [string, Partial<WalkPolicy>][] = [
      ["legacy (control)", {}],
      ["+ per-domain target only", { perDomainTarget: true }],
      ["+ foundation stage only (>=5)", { foundationDomainSpan: 5 }],
      ["+ both ordering levers", { perDomainTarget: true, foundationDomainSpan: 5 }],
      ["+ consequence-scaled confirm", { confirmScopeFraction: 3 / 62 }],
      [
        "+ ordering AND confirm",
        { perDomainTarget: true, foundationDomainSpan: 5, confirmScopeFraction: 3 / 62 },
      ],
    ];
    for (const [label, over] of cases) {
      console.log("  " + line(label, measure(withPolicy(LEGACY_WALK_POLICY, over))));
    }
  });

  it("threshold sweep: confirmation and foundation span", () => {
    console.log(`\n===== THRESHOLD SWEEPS (mild noise, n=${N * 3}) =====`);
    const uncapped = withPolicy(DEFAULT_WALK_POLICY, {
      maxItems: Number.POSITIVE_INFINITY,
    });

    // Quoted as the absolute threshold the fraction produces on the 62-node scope.
    console.log("\nconfirm threshold, as absolute nodes at 62-node scope (no ceiling):");
    for (const t of [3, 5, 6, 7, 8, 9, 10, 12, 999]) {
      console.log(
        "  " +
          line(
            `  threshold=${t}`,
            measure(withPolicy(uncapped, { confirmScopeFraction: t / 62 })),
          ),
      );
    }

    console.log("\nfoundationDomainSpan (shipped threshold, per-domain on, no ceiling):");
    for (const s of [2, 4, 5, 6, 8, Number.POSITIVE_INFINITY]) {
      console.log(
        "  " +
          line(`  span>=${s}`, measure(withPolicy(uncapped, { foundationDomainSpan: s }))),
      );
    }
  });

  it("shipped policy: both scopes, items and nodes", () => {
    console.log(`\n===== SHIPPED POLICY vs LEGACY (mild noise, n=${N * 3}) =====`);
    console.log(`policy = ${JSON.stringify(DEFAULT_WALK_POLICY)}`);
    for (const [label, scope] of [
      ["62-node full scope", PRODUCT_IDS],
      ["D1-only (live scope)", D1_IDS],
    ] as const) {
      report(`[${label}] BEFORE (legacy)`, measure(LEGACY_WALK_POLICY, scope));
      report(`[${label}] AFTER (shipped)`, measure(DEFAULT_WALK_POLICY, scope));
    }

    console.log("\n--- noise sensitivity of the shipped policy (62-node) ---");
    for (const noise of [
      { name: "noiseless", slip: 0, guess: 0 },
      { name: "mild(.10/.05)", slip: 0.1, guess: 0.05 },
      { name: "moderate(.15/.10)", slip: 0.15, guess: 0.1 },
    ]) {
      console.log(
        "  " + line(noise.name, measure(DEFAULT_WALK_POLICY, PRODUCT_IDS, N * 3, noise)),
      );
    }

    console.log("\n--- per-profile cost under the shipped policy (62-node) ---");
    for (const profile of PROFILES) {
      const items: number[] = [];
      const nodes: number[] = [];
      for (let i = 0; i < N * 3; i++) {
        const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
        const known = profile.sample(rand, PRODUCT_IDS);
        const responses = drawResponses(known, PRODUCT_IDS, rand, MILD.slip, MILD.guess);
        const run = runWalk(PRODUCT_IDS, responses, DEFAULT_WALK_POLICY);
        items.push(run.items);
        nodes.push(run.nodes);
      }
      const di = dist(items);
      const dn = dist(nodes);
      console.log(
        `  ${profile.name.padEnd(22)} items med=${di.med} p90=${di.p90} max=${di.max} | nodes med=${dn.med}`,
      );
    }
  });

  it("budget re-derivation for walk-scale.test.ts", () => {
    console.log("\n===== RE-DERIVED WORST CASES for walk-scale.test.ts =====");
    console.log("Exhaustive over each test's own oracle — a true worst case for that");
    console.log("sweep, not a sample. Pin the test to exactly these, never above.\n");

    // The 62-node product, oracle 1: uniform global depth cutoff.
    let maxNodes = 0;
    let maxItems = 0;
    let strong = 0;
    let weak = 0;
    for (let cut = 0; cut <= MAX_DEPTH + 1; cut++) {
      const known = new Set(PRODUCT_IDS.filter((id) => depthOf(id) < cut));
      const responses = drawResponses(known, PRODUCT_IDS, mulberry32(1), 0, 0);
      const run = runWalk(PRODUCT_IDS, responses, DEFAULT_WALK_POLICY);
      maxNodes = Math.max(maxNodes, run.nodes);
      maxItems = Math.max(maxItems, run.items);
      if (cut === MAX_DEPTH + 1) strong = run.nodes;
      if (cut === 0) weak = run.nodes;
    }
    console.log(
      `product / uniform-cut sweep : maxNodes=${maxNodes} maxItems=${maxItems} ` +
        `strong=${strong} weak=${weak}`,
    );

    // The 62-node product, oracle 2: the exact 50-seed per-domain cutoff sweep
    // the current 48-node budget is pinned to.
    let seedNodes = 0;
    let seedItems = 0;
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
      const responses = drawResponses(known, PRODUCT_IDS, mulberry32(2), 0, 0);
      const run = runWalk(PRODUCT_IDS, responses, DEFAULT_WALK_POLICY);
      seedNodes = Math.max(seedNodes, run.nodes);
      seedItems = Math.max(seedItems, run.items);
    }
    console.log(
      `product / 50-seed sweep     : maxNodes=${seedNodes} maxItems=${seedItems}` +
        "   (was pinned at 48 nodes / 132 items)",
    );

    // The synthetic deep/wide DAGs.
    for (const [name, edges] of [
      ["core3 x 8 x len5 (43)", coreDomains(3, 8, 5)],
      ["core4 x 12 x len7 (88)", coreDomains(4, 12, 7)],
      ["core2 x 4 x len14 (58)", coreDomains(2, 4, 14)],
    ] as const) {
      const { graph, ids } = buildGraph(edges);
      const depthMax = Math.max(...ids.map(graph.depth));
      let n = 0;
      let it2 = 0;
      let strongN = 0;
      let weakN = 0;
      for (let cut = 0; cut <= depthMax + 1; cut++) {
        const known = new Set(ids.filter((id) => graph.depth(id) < cut));
        const responses = new Map(
          ids.map((id) => [id, [0, 1, 2, 3, 4, 5].map(() => known.has(id))]),
        );
        const run = runSyntheticWalk(ids, responses, graph);
        n = Math.max(n, run.nodes);
        it2 = Math.max(it2, run.items);
        if (cut === depthMax + 1) strongN = run.nodes;
        if (cut === 0) weakN = run.nodes;
      }
      console.log(
        `${name.padEnd(28)}: maxNodes=${n} maxItems=${it2} strong=${strongN} weak=${weakN}`,
      );
    }
  });

  it("ceiling cohort: what the students who hit the ceiling actually experience", () => {
    console.log(`\n===== CEILING-HITTING COHORT (mild noise, n=${N * 3}) =====`);
    console.log("The aggregate hides this slice. Fail-closed resolution tells a");
    console.log("truncated student to rebuild skills they demonstrated or hold.\n");

    for (const cap of [50, 55, 60, 70, 80]) {
      const policy = withPolicy(DEFAULT_WALK_POLICY, { maxItems: cap });
      let hit = 0;
      let hitAccSum = 0;
      let missAccSum = 0;
      let unknownSum = 0;
      // Nodes the student actually knows but is told to rebuild (not `passed`).
      let falseRebuildHit = 0;
      let falseRebuildMiss = 0;
      // Of those, the ones that are purely an artifact of stopping: left
      // `unknown` rather than measured-failed or pruned behind a real failure.
      let rebuildFromUnknown = 0;

      for (let i = 0; i < N * 3; i++) {
        const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
        const profile = PROFILES[i % PROFILES.length] as Profile;
        const known = profile.sample(rand, PRODUCT_IDS);
        const responses = drawResponses(known, PRODUCT_IDS, rand, MILD.slip, MILD.guess);

        const run = runWalk(PRODUCT_IDS, responses, policy);
        const resolved = resolveKnowledgeState(run.state);
        const capped = run.state.ceiling_reached === true;

        let ok = 0;
        let unknown = 0;
        let falseRebuild = 0;
        for (const r of resolved) {
          const isKnown = known.has(r.node_id);
          if ((r.status === "passed") === isKnown) ok += 1;
          if (r.status === "unknown") unknown += 1;
          if (isKnown && r.status !== "passed") {
            falseRebuild += 1;
            if (capped && r.status === "unknown") rebuildFromUnknown += 1;
          }
        }
        const acc = ok / PRODUCT_IDS.length;
        if (capped) {
          hit += 1;
          hitAccSum += acc;
          unknownSum += unknown;
          falseRebuildHit += falseRebuild;
        } else {
          missAccSum += acc;
          falseRebuildMiss += falseRebuild;
        }
      }

      const n = N * 3;
      const missed = n - hit;
      console.log(
        `ceiling=${String(cap).padStart(3)}  hit=${((100 * hit) / n).toFixed(1)}%` +
          `  |  HIT: acc=${hit ? ((100 * hitAccSum) / hit).toFixed(1) : "n/a"}%` +
          ` unknown-nodes=${hit ? (unknownSum / hit).toFixed(1) : "n/a"}` +
          ` told-to-rebuild-but-knew=${hit ? (falseRebuildHit / hit).toFixed(1) : "n/a"}` +
          ` (of which from truncation=${hit ? (rebuildFromUnknown / hit).toFixed(1) : "n/a"})` +
          `  |  NOT HIT: acc=${missed ? ((100 * missAccSum) / missed).toFixed(1) : "n/a"}%` +
          ` told-to-rebuild-but-knew=${missed ? (falseRebuildMiss / missed).toFixed(1) : "n/a"}`,
      );
    }
  });

  it("opening probe: what the first item is, and what changing it costs", () => {
    console.log(`\n===== OPENING PROBE (mild noise, n=${N * 3}) =====`);
    console.log("v2 §4.2 step 1 promises the opening probe 'eases in near the");
    console.log("foundations'. At full scope the per-domain stage picks the domain");
    console.log("with the most unknown nodes and, with no evidence anywhere, aims at");
    console.log("ENTRY_DEPTH=1 within it. Whether that lands somewhere informative is");
    console.log("not something the policy ever asks. This measures the alternatives.\n");

    /**
     * The node a "prefer graph reach" opening rule would choose: most in-scope
     * transitive prereqs + dependents, ties to the shallower node then id — the
     * same span metric `nearestToTarget` already uses as a tie-break, applied
     * with every node still unknown.
     */
    const reachFirst = (scope: readonly string[]): string => {
      const scopeSet = new Set(scope);
      const inScope = (ids: Iterable<string>) => {
        let n = 0;
        for (const id of ids) if (scopeSet.has(id)) n += 1;
        return n;
      };
      let best = scope[0] as string;
      let bestSpan = -1;
      for (const id of scope) {
        const span = inScope(transitivePrereqs(id)) + inScope(transitiveDependents(id));
        if (
          span > bestSpan ||
          (span === bestSpan &&
            (depthOf(id) < depthOf(best) || (depthOf(id) === depthOf(best) && id < best)))
        ) {
          best = id;
          bestSpan = span;
        }
      }
      return best;
    };

    const describeNode = (id: string, scope: readonly string[]): string => {
      const scopeSet = new Set(scope);
      const inScope = (ids: Iterable<string>) => {
        let n = 0;
        for (const id2 of ids) if (scopeSet.has(id2)) n += 1;
        return n;
      };
      return (
        `${id} (${domainOf(id)}, depth ${depthOf(id)}, ` +
        `prereqs ${inScope(transitivePrereqs(id))}, ` +
        `dependents ${inScope(transitiveDependents(id))})`
      );
    };

    const openingNode = (policy: WalkPolicy, scope: readonly string[]): string =>
      startWalk({ scope, entryTier: 2 }, undefined, policy).current ?? "(none)";

    console.log(
      `reach-first candidate, 62-node: ${describeNode(reachFirst(PRODUCT_IDS), PRODUCT_IDS)}`,
    );
    console.log(
      `reach-first candidate, D1     : ${describeNode(reachFirst(D1_IDS), D1_IDS)}\n`,
    );

    const cases: [string, WalkPolicy, string | undefined][] = [
      ["as-is (shipped)", DEFAULT_WALK_POLICY, undefined],
      [
        "foundation span>=4",
        withPolicy(DEFAULT_WALK_POLICY, { foundationDomainSpan: 4 }),
        undefined,
      ],
      [
        "foundation span>=5",
        withPolicy(DEFAULT_WALK_POLICY, { foundationDomainSpan: 5 }),
        undefined,
      ],
      [
        "foundation span>=6",
        withPolicy(DEFAULT_WALK_POLICY, { foundationDomainSpan: 6 }),
        undefined,
      ],
      [
        "foundation span>=9",
        withPolicy(DEFAULT_WALK_POLICY, { foundationDomainSpan: 9 }),
        undefined,
      ],
      ["reach-first opening", DEFAULT_WALK_POLICY, reachFirst(PRODUCT_IDS)],
    ];

    for (const [label, scope] of [
      ["62-node full scope", PRODUCT_IDS],
      ["D1-only (live scope)", D1_IDS],
    ] as const) {
      console.log(`\n--- ${label} ---`);
      for (const [name, policy, openWith] of cases) {
        const forced = openWith === undefined ? undefined : reachFirst(scope);
        const opens = forced ?? openingNode(policy, scope);
        const out = measure(policy, scope, N * 3, MILD, forced);
        console.log(
          `  ${line(name, out)} | truncated=${(100 * out.cappedRate).toFixed(1)}%` +
            ` (spent-budget=${(100 * out.spentBudgetRate).toFixed(1)}%)` +
            ` | opens on ${describeNode(opens, scope)}`,
        );
      }
    }
  });

  it("accuracy: tradeoff curve against the uncapped ceiling", () => {
    console.log(`\n===== ACCURACY / TRADEOFF (mild noise, n=${N * 3}) =====`);
    console.log("Recorded uncapped ceiling under the legacy policy: 97.8%.\n");

    const uncappedLegacy = measure(
      withPolicy(LEGACY_WALK_POLICY, { maxItems: Number.POSITIVE_INFINITY }),
    );
    console.log("  " + line("legacy, no ceiling", uncappedLegacy));

    console.log("\nShipped policy (fail-closed at the ceiling) with the ceiling swept:");
    for (const cap of [30, 35, 40, 45, 50, 55, 60, 70, 80, Number.POSITIVE_INFINITY]) {
      console.log(
        "  " +
          line(
            `  ceiling=${cap}`,
            measure(withPolicy(DEFAULT_WALK_POLICY, { maxItems: cap })),
          ),
      );
    }

    console.log("\nShipped-policy placement agreement vs the legacy uncapped run:");
    let agree = 0;
    let covErr = 0;
    let readyBoth = 0;
    let n = 0;
    for (let i = 0; i < N * 3; i++) {
      const rand = mulberry32(0x85ebca6b ^ (i * 2246822519));
      const profile = PROFILES[i % PROFILES.length] as Profile;
      const known = profile.sample(rand, PRODUCT_IDS);
      const responses = drawResponses(known, PRODUCT_IDS, rand, MILD.slip, MILD.guess);

      const legacy = runWalk(PRODUCT_IDS, responses, LEGACY_WALK_POLICY);
      const legacyResolved = resolveKnowledgeState(legacy.state);
      const legacyReady = new Map(
        legacyResolved.map((r) => [
          r.node_id,
          placementFor(r, legacy.state.probed[r.node_id]) >= 2,
        ]),
      );
      const legacyCov = computeCoverage(legacyResolved, PRODUCT_IDS).coverage;

      const shipped = runWalk(PRODUCT_IDS, responses, DEFAULT_WALK_POLICY);
      const shippedResolved = resolveKnowledgeState(shipped.state);
      const shippedCov = computeCoverage(shippedResolved, PRODUCT_IDS).coverage;

      for (const r of shippedResolved) {
        const ready = placementFor(r, shipped.state.probed[r.node_id]) >= 2;
        if (ready === legacyReady.get(r.node_id)) agree += 1;
        if (ready && known.has(r.node_id)) readyBoth += 1;
        n += 1;
      }
      covErr += Math.abs(shippedCov - legacyCov);
    }
    console.log(
      `  ready-agree-vs-legacy=${((100 * agree) / n).toFixed(1)}%` +
        `  mean|Δcoverage|=${(covErr / (N * 3)).toFixed(3)}` +
        `  correctly-ready=${((100 * readyBoth) / n).toFixed(1)}%`,
    );
  });
});
