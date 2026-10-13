import {
  ERA_SEQUENCE,
  getProductNodes,
  teachingOrder,
  transitivePrereqs,
} from "@cr/skill-graph";

import {
  isDiagnosticServableShape,
  type UnservableShapeReason,
  unservableShapeReason,
} from "./answer-shape";
import { D1_PRACTICE_NODES, D1_WALK_ITEM_PACK } from "./d1";
import { D2_PRACTICE_NODES } from "./d2";
import { D3_PRACTICE_NODES } from "./d3";
import { D4_PRACTICE_NODES } from "./d4";
import { D5_PRACTICE_NODES } from "./d5";
import { D6_PRACTICE_NODES } from "./d6";
import { D7_PRACTICE_NODES } from "./d7";
import { D8_PRACTICE_NODES } from "./d8";
import { D9_PRACTICE_NODES } from "./d9";
import { D10_PRACTICE_NODES } from "./d10";
import { PRACTICE_WALK_ITEM_PACK } from "./practice-walk";
import { PRODUCT_ITEM_PACK } from "./product";
import { hashItemDefinition, type ItemPackEntry } from "./schema";
import type { FrozenItem } from "./template";

/**
 * WHICH NODES THE DIAGNOSTIC IS ALLOWED TO PLACE A LEARNER INTO — derived from the
 * authored content, never written down.
 *
 * The live walk composed `getNodesByScope("mvp")`, which is the six D1 nodes, and
 * every consumer inherited that. Content is now authored across all ten domains, so
 * the scope is a question about the CONTENT rather than about a `product_scope` flag:
 * a node the diagnostic probes needs items it can serve and grade, and a node it
 * PLACES needs somewhere to place the learner. So the population is derived from four
 * facts about each node, all read from source:
 *
 *  1. **It is in product.** `getProductNodes()` — `mvp` ∪ `target`. A retired or cut
 *     node is not a destination.
 *  2. **The walk can serve it.** ≥ {@link DIAGNOSTIC_WALK_ITEMS_PER_FORM} items with
 *     DISTINCT content in *each* form, because the 2-of-3 adjudication serves up to
 *     three items for one node and never repeats a probe, and Form B (post) must not
 *     reuse Form A (pre). A node with fewer makes `createItemPackWalkSource` throw
 *     mid-administration.
 *  3. **The diagnostic's answer input can express its answer.** See
 *     {@link isDiagnosticServableShape}. This is the one criterion that is about the
 *     UI rather than the bank, and it is enforced by FILTERING THE PACK rather than by
 *     subtracting from the scope, so an unservable shape cannot be served even if some
 *     future caller composes its own scope.
 *  4. **There is content behind a placement.** Every node here has a practice pool, so
 *     a learner placed at 0/1 can be taught and can practise. `<D>_PRACTICE_NODES` is
 *     the item bank's own record of that; the LESSON-PACK half of the same fact lives
 *     under `content/lessons/` and is asserted where it is readable — see
 *     `apps/web/src/diagnostic/diagnosticScope.reachability.test.ts`.
 *
 * Nothing here is a list of node ids. Author walk items for a node that already has a
 * practice pool and the diagnostic picks it up with no code change; take the items away
 * and it drops out the same way.
 *
 * ## What this scope is NOT, and what it now is
 *
 * It is **every in-product node that has any authored content at all**: 59 of the 62. The
 * shortfall used to be 42 nodes short of ASSESSMENT items while having lessons; those 39 of
 * them that ship lesson-practice templates now have walk forms frozen from exactly those
 * templates (`practice-walk.ts`), so the gap closed without anybody authoring a question.
 *
 * What is left is `POL.5`, `POL.6` and `POL.7` — the three in-product nodes with **no
 * authored content of any kind**: no lesson pack, no practice pool, no templates, nothing to
 * freeze. `diagnosticScopeCensus()` reports that per node so the gap stays countable, and
 * the guard names all three rather than letting them sit in a silent remainder.
 *
 * It also does not touch `product_scope` in the registry. Flipping five nodes there was
 * measured at 240 failing tests across 47 files
 * (`docs/Diagnostic_11_Node_Scope_Decision_Evidence.md` §4.4), almost none of it the
 * diagnostic: the scope the instrument administers and the scope the city builds are two
 * questions, and only the first is this module's.
 */

/**
 * Parallel items a served (form, node) cell must hold. The walk adjudicates a node
 * with an adaptive 2-of-3 and never re-serves a probe item, so three is the floor
 * (Adaptive-Diagnostic amendment §8; mirrors `PRODUCT_WALK_ITEMS_PER_CELL`).
 */
export const DIAGNOSTIC_WALK_ITEMS_PER_FORM = 3;

/** Every node the item bank ships a lesson-practice pool for, across all ten domains. */
export const PRACTICE_POOL_NODES: readonly string[] = [
  ...D1_PRACTICE_NODES,
  ...D2_PRACTICE_NODES,
  ...D3_PRACTICE_NODES,
  ...D4_PRACTICE_NODES,
  ...D5_PRACTICE_NODES,
  ...D6_PRACTICE_NODES,
  ...D7_PRACTICE_NODES,
  ...D8_PRACTICE_NODES,
  ...D9_PRACTICE_NODES,
  ...D10_PRACTICE_NODES,
];

/**
 * The answer-shape filter lives in `answer-shape.ts`, a leaf both this module and
 * `practice-walk.ts` can read without a cycle. Re-exported here because it was declared
 * here, and every existing import names this module.
 */
export {
  isDiagnosticServableShape,
  type UnservableShapeReason,
  unservableShapeReason,
} from "./answer-shape";

/**
 * Every authored assessment item across the walk packs — the union BEFORE the shape
 * filter, so a census can name what was dropped and why.
 *
 * Three packs now. `PRACTICE_WALK_ITEM_PACK` is the forms frozen from the lesson-practice
 * templates of every node the first two could not serve, and it is appended rather than
 * merged into them so nothing already frozen moves.
 */
const ALL_WALK_ITEMS: readonly FrozenItem[] = [
  ...D1_WALK_ITEM_PACK,
  ...PRODUCT_ITEM_PACK,
  ...PRACTICE_WALK_ITEM_PACK,
];

/**
 * The item pool the diagnostic composes: every authored walk item whose answer shape
 * its answer row can submit. Both walk composition points
 * (`apps/web/src/diagnostic/browserRuntime.ts`, `aurora-server.ts`) pass this to
 * `createItemPackWalkSource` AND to the checker, so the bank serves exactly the pool the
 * checker grades.
 *
 * `D1_WALK_ITEM_PACK` is a subset of it and is unchanged, so the D1 path composed
 * against that pack keeps serving byte-identical items.
 *
 * Typed as `FrozenItem` rather than `ItemPackEntry` because the ANSWER SPEC travels with
 * it: `apps/web`'s diagnostic answer row dispatches which control a probe gets off
 * `answer.answer_spec`, exactly as lesson practice does, and that needs the whole authored
 * item rather than the serving metadata.
 */
export const DIAGNOSTIC_WALK_ITEM_PACK: readonly FrozenItem[] = ALL_WALK_ITEMS.filter(
  isDiagnosticServableShape,
);

/** The authored walk items the shape filter drops, with the reason. For the census + guards. */
export const DIAGNOSTIC_UNSERVABLE_ITEMS: readonly {
  entry: FrozenItem;
  reason: UnservableShapeReason;
}[] = ALL_WALK_ITEMS.flatMap((entry) => {
  const reason = unservableShapeReason(entry);
  return reason === null ? [] : [{ entry, reason }];
});

/** Distinct content hashes per `${form}:${node_id}` cell in a pack. */
function distinctByCell(pack: readonly ItemPackEntry[]): Map<string, Set<string>> {
  const cells = new Map<string, Set<string>>();
  for (const entry of pack) {
    if (entry.form === "practice") {
      continue;
    }
    const key = `${entry.form}:${entry.node_id}`;
    const hashes = cells.get(key) ?? new Set<string>();
    hashes.add(hashItemDefinition(entry));
    cells.set(key, hashes);
  }
  return cells;
}

/** One node's content standing, as the scope derivation reads it. */
export interface DiagnosticNodeCensus {
  node_id: string;
  domain: string;
  /** Distinct servable item content in Form A (pre). */
  form_a_items: number;
  /** Distinct servable item content in Form B (post). */
  form_b_items: number;
  /** Authored items dropped by the shape filter, by reason. */
  unservable: Partial<Record<UnservableShapeReason, number>>;
  has_practice_pool: boolean;
  /**
   * True iff the CONTENT criteria hold: a practice pool to place into, and
   * {@link DIAGNOSTIC_WALK_ITEMS_PER_FORM} servable items in each form. A node can be
   * servable and still not administered — see {@link in_scope}.
   */
  servable: boolean;
  /**
   * True iff the node is in the scope the instrument ADMINISTERS. Narrower than
   * {@link servable} by two further filters, both of which are about the SET rather than
   * about this node: prerequisite closure (`prereqPrunedNodes`) and the placement horizon
   * (`placementHorizon`). Kept as its own field so "we can serve it" and "we ask it" are
   * different readings and the difference is countable.
   */
  in_scope: boolean;
}

/**
 * Per-node content standing over every in-product node — the census the scope is
 * derived from. Reported rather than merely computed, because "the diagnostic covers N
 * of 62" is the number the widening is judged on and it should be readable off the
 * source rather than reconstructed by hand.
 */
export function diagnosticScopeCensus(
  pack: readonly ItemPackEntry[] = ALL_WALK_ITEMS,
): readonly DiagnosticNodeCensus[] {
  const servableCells = distinctByCell(pack.filter(isDiagnosticServableShape));
  const practice = new Set(PRACTICE_POOL_NODES);
  const dropped = new Map<string, Partial<Record<UnservableShapeReason, number>>>();
  for (const entry of pack) {
    const reason = unservableShapeReason(entry);
    if (reason === null) {
      continue;
    }
    const byReason = dropped.get(entry.node_id) ?? {};
    byReason[reason] = (byReason[reason] ?? 0) + 1;
    dropped.set(entry.node_id, byReason);
  }

  const rows = getProductNodes().map((node) => {
    const formA = servableCells.get(`A:${node.id}`)?.size ?? 0;
    const formB = servableCells.get(`B:${node.id}`)?.size ?? 0;
    const hasPractice = practice.has(node.id);
    return {
      node_id: node.id,
      domain: node.domain,
      form_a_items: formA,
      form_b_items: formB,
      unservable: dropped.get(node.id) ?? {},
      has_practice_pool: hasPractice,
      servable:
        hasPractice &&
        formA >= DIAGNOSTIC_WALK_ITEMS_PER_FORM &&
        formB >= DIAGNOSTIC_WALK_ITEMS_PER_FORM,
      in_scope: false,
    };
  });
  // `in_scope` is the whole derivation's answer, so it runs the ONE pipeline below rather
  // than a second copy of it: two copies of "closed, then cut at the horizon" is how the
  // census and the scope would come to disagree about which nodes are asked.
  const administered = new Set(
    administeredScope(rows.filter((row) => row.servable).map((row) => row.node_id)),
  );
  return rows.map((row) => ({ ...row, in_scope: administered.has(row.node_id) }));
}

/**
 * Drop every node whose transitive prerequisites are not all present, repeatedly, until
 * nothing more drops.
 *
 * **Prerequisite closure is a REQUIREMENT of the scope and not a lucky property of it.**
 * `resolveKnowledgeState` only ever credits a node whose *in-scope* prerequisites passed, so
 * an out-of-scope prerequisite silently drops out of resolution: the coverage number keeps its
 * shape and changes its meaning. Until the widening this set happened to be closed and a guard
 * watched it; the moment a node was excluded for an exhausted parameter space
 * (`practice-walk.ts`) that stopped being true — `EL.3` cannot be served, and `EL.4` and
 * `EL.5` name it as a prerequisite — so closure is now enforced here rather than hoped for.
 *
 * Iterative because a drop can cascade: nothing in the graph today needs a second round, and
 * a fixed point costs one extra pass over 62 nodes.
 */
function prereqClosed(nodeIds: readonly string[]): readonly string[] {
  let kept = new Set(nodeIds);
  for (;;) {
    const next = new Set(
      [...kept].filter((nodeId) =>
        [...transitivePrereqs(nodeId)].every((prereq) => kept.has(prereq)),
      ),
    );
    if (next.size === kept.size) {
      return [...next];
    }
    kept = next;
  }
}

/** Nodes a pack can serve: ≥ {@link DIAGNOSTIC_WALK_ITEMS_PER_FORM} servable items per form. */
function servableNodes(pack: readonly ItemPackEntry[]): ReadonlySet<string> {
  const cells = distinctByCell(pack.filter(isDiagnosticServableShape));
  const served = new Set<string>();
  for (const entry of pack) {
    const a = cells.get(`A:${entry.node_id}`)?.size ?? 0;
    const b = cells.get(`B:${entry.node_id}`)?.size ?? 0;
    if (a >= DIAGNOSTIC_WALK_ITEMS_PER_FORM && b >= DIAGNOSTIC_WALK_ITEMS_PER_FORM) {
      served.add(entry.node_id);
    }
  }
  return served;
}

/**
 * NODES THE INSTRUMENT HAS ALWAYS ADMINISTERED — those the two packs authored FOR the walk
 * can serve: D1's six and the product spine's fourteen.
 *
 * They are admitted regardless of the placement horizon, and that is the rule that keeps the
 * instrument monotonic. Two reasons, and the second is the one that matters:
 *
 *  - **Baselines exist against them.** Every administration in the database was taken at
 *    `blueprint_version` 3 over exactly this set plus D1's. Dropping a node from the
 *    instrument re-denominates those baselines in the direction D-END4 forbids, and the
 *    comparability gate cannot see a scope change.
 *  - **A widening must not narrow anything.** The horizon is a cut on nodes whose placement
 *    cannot be reached, and applied alone it would have taken `FUN.1`, `LF.1`, `EL.1` and
 *    `TRG.1` back out — four domains' worth of coverage #492 had just added, in a change
 *    whose whole point is to add more. Measured, the horizon alone is 7 domains against
 *    #492's 9.
 */
const ALWAYS_ADMINISTERED: ReadonlySet<string> = servableNodes([
  ...D1_WALK_ITEM_PACK,
  ...PRODUCT_ITEM_PACK,
]);

/**
 * THE WHOLE DERIVATION, over a set of content-servable node ids.
 *
 * One place, because every reader of the scope has to agree about which nodes are asked:
 * prerequisite closure, then the placement horizon widened by
 * {@link ALWAYS_ADMINISTERED}, then closure again in case the cut broke it, in teaching
 * order.
 */
function administeredScope(servableIds: readonly string[]): readonly string[] {
  const closed = teachingOrder(prereqClosed(servableIds));
  const withinHorizon = new Set(placementHorizon(closed));
  const admitted = closed.filter(
    (nodeId) => withinHorizon.has(nodeId) || ALWAYS_ADMINISTERED.has(nodeId),
  );
  return teachingOrder(prereqClosed(admitted));
}

/**
 * EVERY NODE THE BANK CAN SERVE, prerequisite-closed, in TEACHING ORDER.
 *
 * Order is not cosmetic: the walk's `scope` array order is what `resolveKnowledgeState`
 * and `robustPassNodeIds` walk, so a results list built from either reads
 * foundations-first rather than in whatever order the adaptive selector happened to
 * visit. It does not affect probe SELECTION, which bisects on prerequisite depth.
 *
 * This is the CONTENT answer. What the instrument administers is
 * {@link diagnosticWalkScope}, which is this set cut at the placement horizon.
 */
export function diagnosticServableScope(
  pack: readonly ItemPackEntry[] = ALL_WALK_ITEMS,
): readonly string[] {
  const servable = diagnosticScopeCensus(pack)
    .filter((row) => row.servable)
    .map((row) => row.node_id);
  return teachingOrder(prereqClosed(servable));
}

/**
 * THE PLACEMENT HORIZON: every era up to and including the first the instrument cannot
 * fully serve.
 *
 * **Measuring past it cannot change the answer.** `eraPlacementFromSeed`
 * (`apps/web/src/catchup/eraPlacement.ts`) reads a placement as an era decision, an era
 * fires only when EVERY one of its nodes passed, and the scan **stops at the first era that
 * does not fire** — §10.9's prefix property, because one founding cannot express a gap. An
 * era the instrument cannot fully serve can never fire, so every era behind it is
 * unreachable as a placement however well it is measured.
 *
 * Today the first such era is the seventh, `industrial`: `POL.5` has no authored content at
 * all. So eras eight through ten contribute nothing to where a learner is placed, and the
 * questions they cost are questions asked for nothing.
 *
 * **It widened by itself, exactly as designed.** The sixth era was the boundary until `POL.6`
 * and `POL.7` were authored; nothing here was edited when they landed, and the horizon moved
 * on its own, because nothing here is a node count or an era literal.
 *
 * **And the questions behind the boundary cost a great deal.** Re-measured over 6,000
 * synthetic students at the shipped policy and mild noise
 * (`engines/diagnostic/sim/widened-scope.sim.test.ts`, `n=2000` per profile):
 *
 * | horizon | nodes | items med | p90 | p99 | max | truncated |
 * |---|--:|--:|--:|--:|--:|--:|
 * | eras 1-6 (before `POL.6`/`POL.7`) | 34 | 33 | 41 | 47 | 53 | **0.00%** |
 * | **eras 1-7 (this)** | **40** | **37** | **51** | **60** | **69** | **0.00%** |
 * | every servable node | 59 | 38 | 62 | 70 | 70 | 1.47% |
 *
 * Read the last row as what the horizon is still buying: at every servable node the 70-item
 * ceiling binds for **1.47%** of learners and p99 is AT it, which means the instrument stops
 * asking before it has finished measuring. Inside the horizon it binds for nobody.
 *
 * **The cut is no longer free, and this is where that is written down.** p90 is 51 against the
 * lead's *"a diagnostic that asks fifty questions is not demoable however wide it is"*, so one
 * learner in ten is now just over that bar where at 34 nodes they were nine questions under
 * it. Nothing here decides what to do about it: the horizon is derived, so the only levers are
 * the policy and the scope, and both are somebody's decision rather than a derivation's.
 */
export function placementHorizon(scope: readonly string[]): readonly string[] {
  const inScope = new Set(scope);
  const admitted = new Set<string>();
  for (const era of ERA_SEQUENCE) {
    for (const nodeId of era.nodes) {
      if (inScope.has(nodeId)) {
        admitted.add(nodeId);
      }
    }
    // The first era that cannot fire is INCLUDED — a learner is placed INTO it, and its
    // servable nodes are what tell them which of its skills they already have — and the
    // scan stops there.
    if (!era.nodes.every((nodeId) => inScope.has(nodeId))) {
      break;
    }
  }
  return scope.filter((nodeId) => admitted.has(nodeId));
}

/** The node ids the diagnostic ADMINISTERS — {@link administeredScope} over the pack. */
export function diagnosticWalkScope(
  pack: readonly ItemPackEntry[] = ALL_WALK_ITEMS,
): readonly string[] {
  return administeredScope(
    diagnosticScopeCensus(pack)
      .filter((row) => row.servable)
      .map((row) => row.node_id),
  );
}

/**
 * Nodes a pack can serve that the scope drops anyway, because a prerequisite cannot be
 * served. Reported rather than merely subtracted: "the instrument covers N of 62" is the
 * number this work is judged on, and a node lost to a prerequisite's authoring gap is a
 * different fact from a node lost to its own.
 */
export function prereqPrunedNodes(
  pack: readonly ItemPackEntry[] = ALL_WALK_ITEMS,
): readonly { node_id: string; missing_prereq: string }[] {
  const servable = new Set(
    diagnosticScopeCensus(pack)
      .filter((row) => row.servable)
      .map((row) => row.node_id),
  );
  const closed = new Set(prereqClosed([...servable]));
  return [...servable]
    .filter((nodeId) => !closed.has(nodeId))
    .flatMap((nodeId) =>
      [...transitivePrereqs(nodeId)]
        .filter((prereq) => !closed.has(prereq))
        .map((prereq) => ({ node_id: nodeId, missing_prereq: prereq })),
    );
}

/**
 * THE WIDENED SCOPE THE LIVE DIAGNOSTIC ADMINISTERS. Derived, not authored.
 */
export const DIAGNOSTIC_WALK_SCOPE: readonly string[] = diagnosticWalkScope();

/** In-scope nodes whose transitive prerequisites are NOT all in scope. Empty = closed. */
export function prereqClosureGaps(
  scope: readonly string[] = DIAGNOSTIC_WALK_SCOPE,
): readonly { node_id: string; missing_prereq: string }[] {
  const inScope = new Set(scope);
  const gaps: { node_id: string; missing_prereq: string }[] = [];
  for (const node of scope) {
    for (const prereq of transitivePrereqs(node)) {
      if (!inScope.has(prereq)) {
        gaps.push({ node_id: node, missing_prereq: prereq });
      }
    }
  }
  return gaps;
}
