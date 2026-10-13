import {
  getNode,
  prereqDepth,
  transitiveDependents,
  transitivePrereqs,
} from "@cr/skill-graph";

import {
  type Adjudication,
  adjudicate,
  confirmThresholdFor,
  DEFAULT_CONFIRM_SCOPE_FRACTION,
  ISOLATED_CONSEQUENCE,
  type NodeConsequence,
} from "./adjudicator";
import type { NodeResolution } from "./coverage";

/**
 * The prerequisite-gated adaptive walk (Contracts Amendment v2 §4) — a pure,
 * serializable, turn-based state machine. It decides which node to probe next and
 * ingests one scored (correct/incorrect) outcome at a time; the engine maps a
 * probe node to a concrete item and re-serves faults.
 *
 * Probe *ordering* is a tunable policy (§4.2) — here a two-stage bisection: a
 * foundation stage over the shared taproot, then a PER-DOMAIN binary search on
 * prerequisite depth. The invariants hold regardless of order:
 *
 * - **Fail-closed (INV-DIAG-6):** a node is `passed` in the resolved state only
 *   with a measured pass whose prereqs are passed, or an inference-licensed pass.
 *   Nodes the instrument ceiling leaves unresolved stay `unknown` and place
 *   not-ready — the ceiling bounds the instrument, it never credits.
 * - **Prune on confirmed fail (INV-DIAG-7):** a failure prunes its whole dependent
 *   subtree, and a failure whose cone is large enough to matter must be confirmed
 *   before it may do so.
 * - **Conservative test-out (INV-DIAG-8):** only a pass that is adequately
 *   confirmed *for its consequence* credits a node's prereq closure.
 * - **Downward-closed resolution:** the final state is closed by construction
 *   (`resolveKnowledgeState` enforces it topologically).
 */

type SelStatus = "unknown" | "passed" | "failed" | "inferred" | "pruned";

export interface ProbeRecord {
  outcomes: boolean[];
  result?: "passed" | "failed";
  /** A clean 2/2 pass. Drives the top city seed; see `placementFor`. */
  robust?: boolean;
  /** This pass licenses crediting the prereq closure (INV-DIAG-8 as amended). */
  infers?: boolean;
}

/** Whether a probe record's pass may credit its prerequisite closure. */
function licensesInference(record: ProbeRecord | undefined): boolean {
  if (record?.result !== "passed") {
    return false;
  }
  // Pre-amendment records carry only `robust`, which implied inference.
  return record.infers ?? record.robust ?? false;
}

/** Serializable walk state (persisted between turns in `AdministrationProgress`). */
export interface WalkState {
  scope: string[];
  entry_tier: number;
  target_tier: number;
  /** The node an item is currently being served for, or null when complete. */
  current: string | null;
  probed: Record<string, ProbeRecord>;
  /**
   * The instrument ceiling stopped this walk before the unknown set was empty.
   * Additive and optional, so persisted pre-amendment states load unchanged.
   *
   * Nothing in resolution reads this: unresolved nodes resolve fail-closed either
   * way. It is recorded because `current === null` otherwise conflates three
   * different endings — the walk resolved everything, the walk ran out of item
   * budget, or the administration was simply never finished — and only the first
   * means the coverage score is a complete picture. A truncated administration is
   * a materially different artifact from a completed one, so the flag is carried
   * on all three surfaces that can say which it is: here (persisted with the
   * walk state between turns), on `CompletedWalkDiagnostic` at finalize, and
   * re-derived from the immutable records by `rebuildWalkState`. It is NOT a
   * column on `assessment_administration` — the immutable record shape stays
   * frozen, and the recompute reconstructs the flag rather than storing it.
   *
   * Exhausting the budget is necessary but not sufficient: a walk that resolved
   * its last unknown node ON its last affordable item finished, it was not
   * truncated, and is not flagged.
   */
  ceiling_reached?: boolean;
}

export interface WalkConfig {
  /** The in-scope node ids the walk covers (e.g. the 62 in-product nodes, or the 6 D1 nodes). */
  scope: readonly string[];
  /**
   * Recorded on the state for provenance. Vestigial for ordering: the frontier
   * policy eases in near the floor (`ENTRY_DEPTH`) regardless of this value.
   */
  entryTier: number;
}

/**
 * The tunable knobs of the ordering + adjudication policy. Production always uses
 * `DEFAULT_WALK_POLICY`; the parameter exists so the probe-cost harness can sweep
 * a knob and so the shipped policy can be A/B'd against its predecessor. It is
 * deliberately NOT part of `WalkState`: the persisted shape is unchanged, and a
 * record recompute reproduces decisions under the shipped policy.
 */
export interface WalkPolicy {
  /**
   * Share of the scope a decision must cascade to before it is worth confirming,
   * rather than taken on one item. `0` confirms everything, restoring the
   * pre-amendment 2-of-3; a value above 1 confirms nothing. Relative to scope
   * size so the rule does not degenerate on a small scope — see
   * `DEFAULT_CONFIRM_SCOPE_FRACTION`.
   */
  confirmScopeFraction: number;
  /**
   * A node joins the foundation stage when its in-scope transitive dependents span
   * at least this many distinct domains. `Infinity` disables the stage.
   */
  foundationDomainSpan: number;
  /** Aim the frontier target within one domain at a time, rather than globally. */
  perDomainTarget: boolean;
  /** Instrument ceiling in scorable items. `Infinity` for no ceiling. */
  maxItems: number;
  /**
   * Judge what a PASS would credit against the prerequisites still UNRESOLVED
   * this turn, rather than against the node's whole in-scope closure.
   *
   * `false` is the shipped rule: `consequence` is a pure function of
   * `(node, scope, graph)`, so `rebuildWalkState` can re-bucket the response rows
   * by node and re-adjudicate each in isolation (INV-DIAG-4). That static count
   * is an OVER-estimate of what a decision can still cascade — a pass whose
   * prerequisites the walk has already credited cascades nothing, and buys a
   * confirming item anyway. Held separately from {@link liveFailCone} because the
   * two directions cost different things: relieving the pass side risks crediting
   * a node the learner does not hold, and relieving the fail side risks sending a
   * mastered skill back. See `docs/Diagnostic_Tail_Policy_Measurement.md` §4.
   */
  livePassClosure: boolean;
  /**
   * Judge what a FAILURE would prune against the dependents still UNRESOLVED this
   * turn, rather than against the node's whole in-scope cone. See
   * {@link livePassClosure}; `false` is the shipped rule.
   */
  liveFailCone: boolean;
  /**
   * Scorable items after which {@link livePassClosure} / {@link liveFailCone} take
   * effect. `0` — the default when they are on at all — makes them apply from the
   * first item.
   *
   * It exists because reading the consequence live from the start does more than
   * shorten the tail: the frontier bisection ascends, so by the time a node is
   * probed its prerequisites have usually been credited already, its live closure
   * is near zero, and it decides on one item. Applied throughout, that means
   * almost NO pass is ever a clean 2/2 — which empties `robustPassNodeIds`, and
   * with it the skills `completion-report.ts` names to the learner. Deferring the
   * switch until the walk is already long leaves the typical learner's instrument
   * exactly as it ships and spends the relief only where the length is the
   * complaint. Measured both ways in
   * `docs/Diagnostic_Tail_Policy_Measurement.md` §5.
   */
  liveConsequenceFrom: number;
  /**
   * Scorable items after which no decision is confirmed: every remaining node is
   * taken on one item. `Infinity` never relieves, which is the shipped rule.
   *
   * A walk shorter than this is bit-identical to one run without it, so the knob
   * is a TAIL instrument by construction — it cannot move the median of a cohort
   * whose median walk never reaches it.
   */
  confirmBudget: number;
  /**
   * A 2-of-3 pass licenses crediting its prerequisite closure. `false` is the
   * shipped rule, and INV-DIAG-8 names the borderline pass explicitly, so this is
   * the one knob here that cannot be turned on without re-ratification.
   */
  inferOnMajorityPass: boolean;
}

/**
 * The shipped policy, every value chosen by sweeping it on
 * `engines/diagnostic/sim/policy-sweep.sim.test.ts`.
 *
 * `foundationDomainSpan` is deliberately DISABLED. A dedicated foundation stage
 * over the shared taproot was expected to be necessary — the graph is not
 * independent chains, and `NUM.4` alone gates 49 in-scope nodes across 9 domains.
 * Measured, it is dominated at every span tried: it spends items on roots that
 * ordinary test-out inference credits for free, costing ~2 items and ~1 point of
 * accuracy versus leaving it off. The knob is kept so the result stays falsifiable
 * — and it was re-measured on 2026-07-26, which reproduced the result. That
 * re-measurement also recorded what disabling the stage costs that the aggregate
 * hides: at full scope the OPENING probe lands on an isolated node. See §8 of
 * `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md`; D1 is unaffected.
 *
 * `maxItems` is a backstop for the tail, not the mechanism that produces the
 * typical length: the median sits at 38 and the ceiling genuinely truncates 1.5%
 * of students (1.7% spend the whole budget, but some of those resolve their last
 * node on the last item and are not truncated — see `ceiling_reached`). Nodes it
 * leaves unresolved resolve fail-closed, unchanged — see `resolveKnowledgeState`.
 *
 * 70 rather than 60 because fail-closed truncation is only harmless in the
 * aggregate. Measured, a 60-item ceiling truncates 15.2% of students, and that
 * cohort scores 87.8% against 96.1% for everyone else while being told to
 * rebuild 7.5 skills it had actually mastered. 70 cuts the truncated cohort to
 * 1.7% and RAISES aggregate accuracy to 95.6%, at the cost of ten items on a
 * tail almost nobody reaches: median, p90 and p99 are unchanged for everyone who
 * does not hit it.
 *
 * `livePassClosure` / `liveConsequenceFrom` are the 2026-08-04 tail cut, at the
 * setting `docs/Diagnostic_Tail_Policy_Measurement.md` §5.3 recommends and under
 * the precondition its §5.4 attaches — not before the scope passes the sixth era,
 * which authoring `POL.5` did. Past the twentieth item a pass is judged against
 * the prerequisites still UNRESOLVED rather than against its whole static
 * closure, so a pass that can no longer cascade stops buying a confirming item.
 * Measured at the 62-node scope, n = 6,000, mild noise: p90 62 → 48, p99 70 → 54,
 * ceiling truncation 1.47% → 0.00%, truth accuracy 95.6% → 95.6%, and
 * already-mastered-skills-sent-back 2.42 → 2.30. The D1 walk is bit-identical,
 * by construction rather than by luck: `confirmThresholdFor(6, 7/62)` is 0 and a
 * threshold of 0 confirms every decision whatever the consequence is read as
 * (`d1BitIdentity.test.ts` measures it rather than trusting the argument).
 *
 * Twenty rather than zero because the switch costs something no accuracy number
 * can see. Read live from the first item it empties the completion ceremony —
 * the frontier ascends, so a node's live closure is near zero by the time it is
 * probed, it decides on one item, and a one-item pass is never `robust`. At 0
 * that is 0.00 named skills in 0% of sessions; at 20 the share of sessions
 * naming at least one skill does not move (59% → 58%). See §5.1.
 */
export const DEFAULT_WALK_POLICY: WalkPolicy = {
  confirmScopeFraction: DEFAULT_CONFIRM_SCOPE_FRACTION,
  foundationDomainSpan: Number.POSITIVE_INFINITY,
  perDomainTarget: true,
  maxItems: 70,
  livePassClosure: true,
  liveFailCone: false,
  liveConsequenceFrom: 20,
  confirmBudget: Number.POSITIVE_INFINITY,
  inferOnMajorityPass: false,
};

/**
 * The policy `scoring_model_version` **2** was administered under — the #89 rules
 * with all three tail knobs off — frozen as a literal so it stays readable after
 * `DEFAULT_WALK_POLICY` moves.
 *
 * It is not a historical curio. Two things need it, and both break silently
 * without it:
 *
 * 1. **Recompute.** `RESOLUTION_RULES_BY_VERSION` registers version 2's
 *    adjudication rules from these values, so a record stamped 2 re-decides
 *    under the rules it was scored with (INV-DIAG-4) rather than under today's.
 * 2. **Every before/after comparison.** A guard or a harness that reaches for
 *    `DEFAULT_WALK_POLICY` as its "unchanged" control stops having a control the
 *    moment the default moves — the D1 bit-identity check and the tail-policy
 *    harness's baseline anchors both did, and both now read this instead.
 */
export const STATIC_CONSEQUENCE_WALK_POLICY: WalkPolicy = {
  confirmScopeFraction: DEFAULT_CONFIRM_SCOPE_FRACTION,
  foundationDomainSpan: Number.POSITIVE_INFINITY,
  perDomainTarget: true,
  maxItems: 70,
  livePassClosure: false,
  liveFailCone: false,
  liveConsequenceFrom: 0,
  confirmBudget: Number.POSITIVE_INFINITY,
  inferOnMajorityPass: false,
};

/** The pre-amendment policy, kept so its cost can be re-measured on demand. */
export const LEGACY_WALK_POLICY: WalkPolicy = {
  confirmScopeFraction: 0,
  foundationDomainSpan: Number.POSITIVE_INFINITY,
  perDomainTarget: false,
  maxItems: Number.POSITIVE_INFINITY,
  livePassClosure: false,
  liveFailCone: false,
  liveConsequenceFrom: 0,
  confirmBudget: Number.POSITIVE_INFINITY,
  inferOnMajorityPass: false,
};

/**
 * The DAG primitives the walk reads, injected so the pure engine can be exercised
 * on synthetic graphs (deep/wide scale tests). Production always uses the frozen
 * skill-graph registry via `registryGraph`; callers never pass a graph.
 */
export interface WalkGraph {
  prereqs(id: string): readonly string[];
  depth(id: string): number;
  transitivePrereqs(id: string): Iterable<string>;
  transitiveDependents(id: string): Iterable<string>;
  /** The node's domain — the unit the per-domain frontier search bisects within. */
  domain(id: string): string;
}

/** The production graph — the immutable skill-graph registry. */
const registryGraph: WalkGraph = {
  prereqs: (id) => getNode(id)?.prereqs ?? [],
  depth: prereqDepth,
  transitivePrereqs,
  transitiveDependents,
  domain: (id) => getNode(id)?.domain ?? id,
};

/**
 * Gentle-entry target: with no evidence anywhere, aim the first probe at a shallow
 * tier. It aims at a DEPTH, not at a useful node — the domain is chosen first, by
 * unknown count, so on a wide scope this can open on a node with no graph reach at
 * all (`FUN.6` at 62 nodes). Measured and left as-is; see §8 of
 * `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md`.
 */
const ENTRY_DEPTH = 1;

/**
 * Scope-derived facts the policy reads every turn. Memoized per (graph, scope)
 * because they are static for the whole walk and the harness runs ~100k of them.
 */
interface ScopeFacts {
  consequence: Map<string, NodeConsequence>;
  /** Distinct domains among each node's in-scope transitive dependents. */
  dependentDomainSpan: Map<string, number>;
  byDomain: Map<string, string[]>;
  maxDepth: number;
}

const scopeFactsCache = new WeakMap<WalkGraph, Map<string, ScopeFacts>>();

function scopeFacts(scope: readonly string[], graph: WalkGraph): ScopeFacts {
  let perGraph = scopeFactsCache.get(graph);
  if (!perGraph) {
    perGraph = new Map();
    scopeFactsCache.set(graph, perGraph);
  }
  const key = `${scope.length}\u0000${scope.join("\u0000")}`;
  const cached = perGraph.get(key);
  if (cached) {
    return cached;
  }

  const scopeSet = new Set(scope);
  const consequence = new Map<string, NodeConsequence>();
  const dependentDomainSpan = new Map<string, number>();
  const byDomain = new Map<string, string[]>();
  let maxDepth = 0;

  for (const id of scope) {
    let passClosure = 0;
    for (const prereq of graph.transitivePrereqs(id)) {
      if (scopeSet.has(prereq)) {
        passClosure += 1;
      }
    }
    let failCone = 0;
    const domains = new Set<string>();
    for (const dependent of graph.transitiveDependents(id)) {
      if (scopeSet.has(dependent)) {
        failCone += 1;
        domains.add(graph.domain(dependent));
      }
    }
    consequence.set(id, { passClosure, failCone });
    dependentDomainSpan.set(id, domains.size);

    const domain = graph.domain(id);
    const list = byDomain.get(domain);
    if (list) {
      list.push(id);
    } else {
      byDomain.set(domain, [id]);
    }
    maxDepth = Math.max(maxDepth, graph.depth(id));
  }

  const facts: ScopeFacts = { consequence, dependentDomainSpan, byDomain, maxDepth };
  perGraph.set(key, facts);
  return facts;
}

/**
 * The static consequence of deciding each in-scope node — what a pass would credit
 * and what a failure would prune. Exported so the record recompute can adjudicate
 * from the same numbers the live engine used (INV-DIAG-4).
 */
export function scopeConsequence(
  scope: readonly string[],
  graph: WalkGraph = registryGraph,
): ReadonlyMap<string, NodeConsequence> {
  return scopeFacts(scope, graph).consequence;
}

/** Count how many of `ids` are still unknown (unresolved) this turn. */
function countUnknown(ids: Iterable<string>, unknown: ReadonlySet<string>): number {
  let count = 0;
  for (const id of ids) {
    if (unknown.has(id)) {
      count += 1;
    }
  }
  return count;
}

/**
 * Whether any in-scope node is still `unknown` — i.e. whether stopping here would
 * leave the picture incomplete. This is the half of "truncated" that exhausting
 * the item budget does not establish on its own.
 */
function hasUnresolved(state: WalkState, graph: WalkGraph): boolean {
  const sel = deriveSelStatus(state.probed, state.scope, graph);
  for (const id of state.scope) {
    if (sel.get(id) === "unknown") {
      return true;
    }
  }
  return false;
}

/** Total scorable items served so far — the instrument-length signal for the ceiling. */
export function servedItemCount(state: WalkState): number {
  let count = 0;
  for (const record of Object.values(state.probed)) {
    count += record.outcomes.length;
  }
  return count;
}

/**
 * Derive each node's selection status from the measured results: base
 * (passed/failed/unknown), then credit inference-licensed prereq closures as
 * `inferred`, then prune failed nodes' dependents (fail-closed wins). Pure over
 * `probed`.
 */
function deriveSelStatus(
  probed: Record<string, ProbeRecord>,
  scope: readonly string[],
  graph: WalkGraph,
): Map<string, SelStatus> {
  const scopeSet = new Set(scope);
  const sel = new Map<string, SelStatus>();
  for (const id of scope) {
    const result = probed[id]?.result;
    sel.set(
      id,
      result === "failed" ? "failed" : result === "passed" ? "passed" : "unknown",
    );
  }
  for (const id of scope) {
    if (licensesInference(probed[id])) {
      for (const prereq of graph.transitivePrereqs(id)) {
        if (scopeSet.has(prereq) && sel.get(prereq) === "unknown") {
          sel.set(prereq, "inferred");
        }
      }
    }
  }
  for (const id of scope) {
    if (probed[id]?.result === "failed") {
      for (const dependent of graph.transitiveDependents(id)) {
        const status = scopeSet.has(dependent) ? sel.get(dependent) : undefined;
        if (status === "unknown" || status === "inferred") {
          sel.set(dependent, "pruned");
        }
      }
    }
  }
  return sel;
}

/**
 * What deciding `nodeId` can STILL cascade, given everything the walk has already
 * resolved: in-scope transitive prerequisites that are still `unknown` (what a
 * pass would newly credit) and in-scope transitive dependents that are still
 * `unknown` (what a confirmed failure would newly prune).
 *
 * The same two quantities `scopeFacts` counts statically, minus the part of the
 * cascade that has already happened. Nodes already `inferred` or `pruned` are not
 * unknown, so they are not counted: crediting a credited prerequisite and pruning
 * a pruned dependent are both no-ops, and INV-DIAG-7/8 exist to protect a cascade
 * rather than a count. The live count is therefore always <= the static one,
 * which is what makes the switch provably additive over stored records — see
 * `docs/Diagnostic_Tail_Policy_Measurement.md` §6.
 *
 * Each direction is taken live only when its own knob asks for it, so the two
 * halves of the trade can be priced apart.
 */
function liveConsequenceOf(
  nodeId: string,
  state: WalkState,
  graph: WalkGraph,
  policy: WalkPolicy,
  fallback: NodeConsequence,
): NodeConsequence {
  const sel = deriveSelStatus(state.probed, state.scope, graph);
  const scopeSet = new Set(state.scope);
  const unresolved = (ids: Iterable<string>): number => {
    let count = 0;
    for (const id of ids) {
      if (scopeSet.has(id) && sel.get(id) === "unknown") {
        count += 1;
      }
    }
    return count;
  };
  return {
    passClosure: policy.livePassClosure
      ? unresolved(graph.transitivePrereqs(nodeId))
      : fallback.passClosure,
    failCone: policy.liveFailCone
      ? unresolved(graph.transitiveDependents(nodeId))
      : fallback.failCone,
  };
}

/**
 * The depth to aim the next probe at: a binary search for the student's frontier,
 * run over `members` only. `dp` is the deepest node in `members` with a *measured*
 * pass, `df` the shallowest with a measured fail; the frontier lies between them,
 * so we target their midpoint — which jumps UP after passes (toward the leaves,
 * where a pass tests out a long prereq chain) and DOWN after fails (toward the
 * roots, where a fail prunes a large cone).
 *
 * Restricting `members` to one domain is the whole point of the two-stage policy:
 * a global scan mixes evidence across unrelated strands and aims at a midpoint
 * that describes no domain in particular. A domain with no evidence of its own
 * falls back to the global frontier, which is what the foundation stage
 * established; with no evidence anywhere the caller eases in at `ENTRY_DEPTH`.
 */
function frontierTarget(
  state: WalkState,
  graph: WalkGraph,
  members: ReadonlySet<string>,
  memberMaxDepth: number,
  fallbackToGlobal: boolean,
): number {
  const scan = (ids: Iterable<string>): { dp: number; df: number } => {
    let dp = -1;
    let df = Number.POSITIVE_INFINITY;
    for (const id of ids) {
      const result = state.probed[id]?.result;
      if (result === "passed") {
        dp = Math.max(dp, graph.depth(id));
      } else if (result === "failed") {
        df = Math.min(df, graph.depth(id));
      }
    }
    return { dp, df };
  };

  let { dp, df } = scan(members);
  if (dp < 0 && !Number.isFinite(df) && fallbackToGlobal) {
    ({ dp, df } = scan(state.scope));
  }
  if (dp < 0 && !Number.isFinite(df)) return ENTRY_DEPTH;
  if (dp < 0) return Math.max(0, Math.floor(df / 2));
  if (!Number.isFinite(df)) {
    return Math.min(memberMaxDepth, Math.ceil((dp + memberMaxDepth) / 2));
  }
  return Math.round((dp + df) / 2);
}

/** The unknown node in `candidates` nearest `target` depth, with the §4.2 tie-breaks. */
function nearestToTarget(
  candidates: Iterable<string>,
  unknown: ReadonlySet<string>,
  target: number,
  graph: WalkGraph,
): string | null {
  let best: string | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  let bestSpan = -1;
  let bestDepth = Number.POSITIVE_INFINITY;
  for (const id of candidates) {
    const depth = graph.depth(id);
    const dist = Math.abs(depth - target);
    const span =
      countUnknown(graph.transitivePrereqs(id), unknown) +
      countUnknown(graph.transitiveDependents(id), unknown);
    if (
      best === null ||
      dist < bestDist ||
      (dist === bestDist && span > bestSpan) ||
      (dist === bestDist && span === bestSpan && depth < bestDepth) ||
      (dist === bestDist && span === bestSpan && depth === bestDepth && id < best)
    ) {
      best = id;
      bestDist = dist;
      bestSpan = span;
      bestDepth = depth;
    }
  }
  return best;
}

/**
 * Pick the next probe (Amendment v2 §4.2 ordering policy, two-stage form).
 *
 * 1. **Foundation stage.** While any shared-taproot node is unknown, probe there
 *    first — bisected within the taproot set. The graph is not independent chains
 *    (`NUM.4` alone is a prerequisite of 49 in-scope nodes across 9 domains), so
 *    per-domain probes are uninterpretable until the shared roots are settled.
 * 2. **Per-domain stage.** Otherwise take the domain with the most unknown nodes
 *    left (ties by domain id, for determinism) and bisect that domain's own
 *    frontier.
 *
 * Returns null when the unknown set is empty or the instrument ceiling is reached.
 */
function selectNextProbe(
  state: WalkState,
  graph: WalkGraph,
  policy: WalkPolicy,
): string | null {
  if (servedItemCount(state) >= policy.maxItems) {
    return null;
  }

  const sel = deriveSelStatus(state.probed, state.scope, graph);
  const unknown = new Set<string>();
  for (const id of state.scope) {
    if (sel.get(id) === "unknown") {
      unknown.add(id);
    }
  }
  if (unknown.size === 0) {
    return null;
  }

  const facts = scopeFacts(state.scope, graph);

  const foundation = new Set<string>();
  if (Number.isFinite(policy.foundationDomainSpan)) {
    for (const id of unknown) {
      if ((facts.dependentDomainSpan.get(id) ?? 0) >= policy.foundationDomainSpan) {
        foundation.add(id);
      }
    }
  }

  if (foundation.size > 0) {
    const memberMaxDepth = Math.max(...[...foundation].map((id) => graph.depth(id)));
    const target = frontierTarget(state, graph, foundation, memberMaxDepth, true);
    return nearestToTarget(foundation, unknown, target, graph);
  }

  if (!policy.perDomainTarget) {
    const all = new Set(state.scope);
    const target = frontierTarget(state, graph, all, facts.maxDepth, false);
    return nearestToTarget(unknown, unknown, target, graph);
  }

  // Widest remaining uncertainty first; ties by domain id so the trace is stable.
  const unknownByDomain = new Map<string, string[]>();
  for (const id of unknown) {
    const domain = graph.domain(id);
    const list = unknownByDomain.get(domain);
    if (list) {
      list.push(id);
    } else {
      unknownByDomain.set(domain, [id]);
    }
  }
  let chosenDomain: string | null = null;
  let chosenCount = -1;
  for (const [domain, ids] of unknownByDomain) {
    if (
      ids.length > chosenCount ||
      (ids.length === chosenCount && domain < (chosenDomain ?? ""))
    ) {
      chosenDomain = domain;
      chosenCount = ids.length;
    }
  }
  if (chosenDomain === null) {
    return null;
  }

  const domainIds = facts.byDomain.get(chosenDomain) ?? [];
  const members = new Set(domainIds);
  const memberMaxDepth = domainIds.length
    ? Math.max(...domainIds.map((id) => graph.depth(id)))
    : facts.maxDepth;
  const target = frontierTarget(state, graph, members, memberMaxDepth, true);
  return nearestToTarget(unknownByDomain.get(chosenDomain) ?? [], unknown, target, graph);
}

/** Open a walk and select the first probe (or null for an empty scope). */
export function startWalk(
  config: WalkConfig,
  graph: WalkGraph = registryGraph,
  policy: WalkPolicy = DEFAULT_WALK_POLICY,
): WalkState {
  const scope = [...config.scope];
  const seed: WalkState = {
    scope,
    entry_tier: config.entryTier,
    // Vestigial since the ordering policy became frontier bisection; kept for the
    // persisted WalkState shape (no migration).
    target_tier: 0,
    current: null,
    probed: {},
  };
  return { ...seed, current: selectNextProbe(seed, graph, policy) };
}

/** The node an item should be served for now, or null when the walk is complete. */
export function currentProbeNode(state: WalkState): string | null {
  return state.current;
}

export function isWalkComplete(state: WalkState): boolean {
  return state.current === null;
}

/**
 * The adjudication for `nodeId`'s outcomes so far, given the walk as it stood
 * BEFORE the last of those outcomes was appended.
 *
 * Extracted so the live engine and the record recompute share one implementation
 * rather than two that agree. Every input it reads is recoverable from the
 * immutable records — the scope, the node's own outcomes, and (only when a live
 * knob is on) the resolution the earlier entries of `routing_path` produced — so
 * `rebuildWalkState` can reproduce the same decision without replaying probe
 * SELECTION. That is what keeps INV-DIAG-4 true under the live rules.
 */
function adjudicateProbe(
  before: WalkState,
  nodeId: string,
  outcomes: readonly boolean[],
  graph: WalkGraph,
  policy: WalkPolicy,
): Adjudication {
  const served = servedItemCount(before);
  const staticConsequence =
    scopeFacts(before.scope, graph).consequence.get(nodeId) ?? ISOLATED_CONSEQUENCE;
  const goLive =
    (policy.livePassClosure || policy.liveFailCone) && served >= policy.liveConsequenceFrom;
  const consequence = goLive
    ? liveConsequenceOf(nodeId, before, graph, policy, staticConsequence)
    : staticConsequence;
  // Past the confirm budget nothing is worth a second item: an infinite threshold
  // is unreachable by any cascade, so every remaining node decides on one.
  const threshold =
    served >= policy.confirmBudget
      ? Number.POSITIVE_INFINITY
      : confirmThresholdFor(before.scope.length, policy.confirmScopeFraction);
  return adjudicate(outcomes, consequence, threshold, policy.inferOnMajorityPass);
}

/**
 * Re-decide every node of a RECORDED walk from its own scorable outcomes, folding
 * along the recorded probe order (`routing_path`).
 *
 * The fold exists because a live consequence, a confirm budget or any other rule
 * that reads more than one node's own outcomes cannot be reproduced by
 * re-adjudicating each node in isolation. It is still not a replay: probe
 * SELECTION is never reconstructed, only the resolution the recorded order had
 * already reached. Under the shipped (static, unrelieved) rules the fold is
 * exactly equivalent to adjudicating each node's outcomes on their own, which
 * `coverage-measurement.test.ts` pins.
 *
 * Outcomes past the item that decides a node are ignored, exactly as the live
 * engine never serves them.
 */
export function adjudicateRecordedWalk(
  scope: readonly string[],
  routingPath: readonly string[],
  outcomesByNode: ReadonlyMap<string, readonly boolean[]>,
  policy: WalkPolicy = DEFAULT_WALK_POLICY,
  graph: WalkGraph = registryGraph,
): Record<string, ProbeRecord> {
  const frozenScope = [...scope];
  let probed: Record<string, ProbeRecord> = {};
  for (const nodeId of routingPath) {
    const recorded = outcomesByNode.get(nodeId) ?? [];
    probed = { ...probed, [nodeId]: { outcomes: [] } };
    for (let i = 0; i < recorded.length; i++) {
      const before: WalkState = {
        scope: frozenScope,
        entry_tier: 0,
        target_tier: 0,
        current: nodeId,
        probed: { ...probed, [nodeId]: { outcomes: recorded.slice(0, i) } },
      };
      const outcomes = recorded.slice(0, i + 1);
      const decision = adjudicateProbe(before, nodeId, outcomes, graph, policy);
      probed = {
        ...probed,
        [nodeId]: decision.done
          ? {
              outcomes,
              result: decision.result,
              robust: decision.robust,
              infers: decision.infers,
            }
          : { outcomes },
      };
      if (decision.done) {
        break;
      }
    }
  }
  return probed;
}

/**
 * Ingest one scored outcome for the current probe node. Appends it, adjudicates
 * against the node's consequence, and — when the node is decided — records the
 * result and selects the next probe. Faults are NOT outcomes: the engine
 * re-serves the same node instead of calling this.
 */
export function recordScoredOutcome(
  state: WalkState,
  correct: boolean,
  graph: WalkGraph = registryGraph,
  policy: WalkPolicy = DEFAULT_WALK_POLICY,
): WalkState {
  const current = state.current;
  if (!current) {
    return state;
  }
  const record = state.probed[current] ?? { outcomes: [] };
  const outcomes = [...record.outcomes, correct];
  const decision = adjudicateProbe(state, current, outcomes, graph, policy);

  if (!decision.done) {
    const pending: WalkState = {
      ...state,
      probed: { ...state.probed, [current]: { outcomes } },
    };
    // The ceiling can land mid-node; stop rather than serve a confirm we cannot
    // afford. This is always a truncation: the node is undecided, so it is still
    // `unknown` and the picture is incomplete by construction.
    if (servedItemCount(pending) >= policy.maxItems) {
      return { ...pending, current: null, ceiling_reached: true };
    }
    return pending;
  }

  const probed = {
    ...state.probed,
    [current]: {
      outcomes,
      result: decision.result,
      robust: decision.robust,
      infers: decision.infers,
    },
  };
  const advanced: WalkState = { ...state, probed, current: null };
  const next = selectNextProbe(advanced, graph, policy);
  // `selectNextProbe` returns null for two different reasons — nothing left to
  // ask, or nothing left to spend — and only the second is truncation. A walk
  // that emptied its unknown set ON its last affordable item completed, so the
  // unresolved check is what separates them (it runs at most once per walk).
  if (
    next === null &&
    servedItemCount(advanced) >= policy.maxItems &&
    hasUnresolved(advanced, graph)
  ) {
    return { ...advanced, ceiling_reached: true };
  }
  return { ...advanced, current: next };
}

/**
 * Collapse the walk into a downward-closed resolved knowledge state (the coverage
 * input). Topological (shallow → deep): a node is `passed` iff it has a measured
 * or inferred pass AND all in-scope prereqs are `passed`; a measured fail is
 * `failed`; anything blocked by a failed/pruned prereq is `pruned`.
 *
 * **Fail-closed at the ceiling (INV-DIAG-6, unchanged).** A node the instrument
 * ceiling left unresolved stays `unknown` and is placed not-ready. A terminal
 * rule crediting such nodes upward from a verified prerequisite foundation was
 * proposed, measured and **declined** (2026-07-25). At the shipped 70-item
 * ceiling it is worth 0.0 accuracy points: raising the ceiling repairs the same
 * truncation damage without touching a ratified invariant. See §5 of
 * `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` — it is worth 8.2 points
 * at a 30-item ceiling, so the analysis is kept for whoever wants a materially
 * shorter instrument.
 */
export function resolveKnowledgeState(
  state: WalkState,
  graph: WalkGraph = registryGraph,
): NodeResolution[] {
  const scopeSet = new Set(state.scope);
  const inferred = new Set<string>();
  for (const id of state.scope) {
    if (licensesInference(state.probed[id])) {
      for (const prereq of graph.transitivePrereqs(id)) {
        if (scopeSet.has(prereq)) {
          inferred.add(prereq);
        }
      }
    }
  }

  const order = [...state.scope].sort(
    (a, b) => graph.depth(a) - graph.depth(b) || a.localeCompare(b),
  );
  const resolved = new Map<string, NodeResolution>();
  for (const id of order) {
    const record = state.probed[id];
    const prereqsInScope = graph.prereqs(id).filter((p) => scopeSet.has(p));

    if (record?.result === "failed") {
      resolved.set(id, { node_id: id, status: "failed" });
      continue;
    }

    const hasPass = record?.result === "passed" || inferred.has(id);
    const allPrereqsPassed = prereqsInScope.every(
      (p) => resolved.get(p)?.status === "passed",
    );
    if (hasPass && allPrereqsPassed) {
      resolved.set(id, {
        node_id: id,
        status: "passed",
        source: record?.result === "passed" ? "measured" : "inferred",
      });
      continue;
    }

    const blocked = prereqsInScope.some((p) => {
      const status = resolved.get(p)?.status;
      return status === "failed" || status === "pruned";
    });
    if (blocked || hasPass) {
      resolved.set(id, { node_id: id, status: "pruned" });
      continue;
    }
    resolved.set(id, { node_id: id, status: "unknown" });
  }

  return state.scope.map((id) => resolved.get(id) as NodeResolution);
}

/** Count of nodes actually served an item — the instrument-length signal for tests/telemetry. */
export function probedNodeCount(state: WalkState): number {
  return Object.keys(state.probed).length;
}

/**
 * In-scope nodes the walk decided with a ROBUST measured pass — a clean 2/2, the
 * same bar that already gates the top city seed (`placementFor`) and downward
 * inference (`licensesInference`).
 *
 * Robustness is decided by `adjudicate` and then only ever lives here, on the
 * probe record: `resolveKnowledgeState` collapses a pass to `measured`/`inferred`
 * and drops how confidently it was decided. A consumer that wants to NAME a skill
 * to a learner rather than count it in an aggregate needs the two-item bar, so it
 * needs this rather than the resolved state.
 *
 * Walks the SCOPE rather than `state.probed`, so the order is the instrument's own
 * and not the order the adaptive selector happened to visit nodes in — two
 * administrations with the same outcomes then produce the same list.
 */
export function robustPassNodeIds(state: WalkState): string[] {
  return state.scope.filter((nodeId) => {
    const record = state.probed[nodeId];
    return record?.result === "passed" && record.robust === true;
  });
}
