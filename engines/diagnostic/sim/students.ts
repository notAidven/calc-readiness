import { getNode, prereqDepth } from "@cr/skill-graph";

import {
  currentProbeNode,
  isWalkComplete,
  probedNodeCount,
  recordScoredOutcome,
  startWalk,
  type WalkPolicy,
  type WalkState,
} from "../src/walk";

/**
 * Shared synthetic-student model + walk driver for the measurement harnesses in
 * this directory. Extracted so `policy-sweep.sim.test.ts` does not have to
 * duplicate it.
 *
 * `probe-cost.sim.test.ts` deliberately keeps its OWN copy and does not import
 * this: it is the file that independently reproduces the recorded baseline in
 * `docs/Diagnostic_Probe_Cost_Measurement.md`, and its value comes from being an
 * independent implementation that agrees. Two harnesses that agree are evidence;
 * one harness used twice is not.
 *
 * ── The trap this model sets (read before evaluating any policy) ─────────────
 * Students are generated from a PER-DOMAIN DEPTH CUT, so same-depth nodes in the
 * same domain almost always share a truth value — by construction of the
 * generator, not by anything about the DAG. (`closeDownward` can break the tie
 * through an out-of-domain prerequisite, so the correlation is near-perfect
 * rather than perfect, which makes the artifact harder to spot, not smaller.)
 *
 * A policy that infers across SIBLINGS would therefore post a strong score here
 * and be worthless in reality — it would be measuring the student generator.
 * Inference must stay DAG-structural: prerequisite closure and dependent cone
 * only, never "similar" nodes.
 */

export const depthOf = prereqDepth;
export const domainOf = (id: string): string =>
  getNode(id)?.domain ?? id.split(".")[0] ?? id;

export function mulberry32(seed: number): () => number {
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
export function closeDownward(
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

export interface Profile {
  name: string;
  sample(rand: () => number, scope: readonly string[]): Set<string>;
}

export function makeProfiles(maxDepth: number): Profile[] {
  const cutProfile = (name: string, spread: number): Profile => ({
    name,
    sample(rand, scope) {
      const ability = rand() * (maxDepth + 1);
      const cut = new Map<string, number>();
      const raw = new Set<string>();
      for (const id of scope) {
        const dom = domainOf(id);
        if (!cut.has(dom)) {
          const jitter = spread === 0 ? 0 : (rand() * 2 - 1) * spread;
          cut.set(dom, Math.min(maxDepth + 1, Math.max(0, ability + jitter)));
        }
        if (depthOf(id) < (cut.get(dom) ?? 0)) raw.add(id);
      }
      return closeDownward(raw, scope);
    },
  });

  return [
    cutProfile("homogeneous", 0),
    cutProfile("heterogeneous", 2.5),
    {
      name: "independent-strands",
      sample(rand, scope) {
        const cut = new Map<string, number>();
        const raw = new Set<string>();
        for (const id of scope) {
          const dom = domainOf(id);
          if (!cut.has(dom)) cut.set(dom, rand() * (maxDepth + 1));
          if (depthOf(id) < (cut.get(dom) ?? 0)) raw.add(id);
        }
        return closeDownward(raw, scope);
      },
    },
  ];
}

export type Responses = Map<string, boolean[]>;

/** Pre-draw every (node, attempt) response so a capped run is an exact prefix. */
export function drawResponses(
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

export interface WalkRun {
  state: WalkState;
  items: number;
  nodes: number;
}

/**
 * Drive the REAL engine one scored outcome at a time under `policy`.
 *
 * `openWith` overrides only the FIRST probe, leaving every later selection to the
 * policy. It exists so an opening-probe variant can be measured without adding a
 * knob to the shipped `WalkPolicy` for a change nobody has decided to make: the
 * opening probe is one item, and substituting it is exactly what an "enter at the
 * node with the most graph reach" rule would do on turn one.
 */
export function runWalk(
  scope: readonly string[],
  responses: Responses,
  policy: WalkPolicy,
  openWith?: string,
): WalkRun {
  let state = startWalk({ scope, entryTier: 2 }, undefined, policy);
  if (openWith !== undefined && state.current !== null) {
    state = { ...state, current: openWith };
  }
  let items = 0;
  while (!isWalkComplete(state)) {
    const node = currentProbeNode(state);
    if (!node) break;
    const attempt = state.probed[node]?.outcomes.length ?? 0;
    const correct = responses.get(node)?.[attempt] ?? false;
    state = recordScoredOutcome(state, correct, undefined, policy);
    items += 1;
    if (items > 100_000) throw new Error("walk did not terminate");
  }
  return { state, items, nodes: probedNodeCount(state) };
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function pct(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))] as number;
}

export interface Dist {
  n: number;
  med: number;
  p90: number;
  p99: number;
  max: number;
  mean: number;
}

export function dist(values: readonly number[]): Dist {
  const s = [...values].sort((a, b) => a - b);
  return {
    n: s.length,
    med: pct(s, 50),
    p90: pct(s, 90),
    p99: pct(s, 99),
    max: s[s.length - 1] ?? 0,
    mean: s.reduce((a, b) => a + b, 0) / (s.length || 1),
  };
}

export function fmtDist(label: string, d: Dist): string {
  return (
    `${label.padEnd(22)} n=${String(d.n).padStart(5)}  med=${String(d.med).padStart(3)}  ` +
    `mean=${d.mean.toFixed(1).padStart(5)}  p90=${String(d.p90).padStart(3)}  ` +
    `p99=${String(d.p99).padStart(3)}  max=${String(d.max).padStart(3)}`
  );
}
