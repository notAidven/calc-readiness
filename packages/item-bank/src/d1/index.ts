import type { D1NodeId } from "@cr/components";

import { buildRandomizedSetByShape, drawRetryInstance } from "../practiceSelect";
import { hashItemDefinition, type ItemDifficulty } from "../schema";
import { type FrozenItem, freezeDeepParallelForms, freezeParallelForms } from "../template";
import {
  buildD1PracticePool,
  buildD1PracticeVariants,
  D1_PRACTICE_MIX,
  D1_PRACTICE_RETRY_VARIANTS_PER_CELL,
} from "./practice";
import { D1_TEMPLATES } from "./templates";
import { D1_WALK_TEMPLATES } from "./walk-templates";

export { D1_GOLDEN_FIXTURES, type GoldenFixture } from "./golden";
// `d1.num-5.l3b` carries only a numeric `pieceIndex`, so its worked-solution figure has to
// resolve the scenario words itself. Exported so the web side reads THIS list rather than
// keeping a copy that can drift out of index order with it.
export {
  type ConversionPiece,
  NUM5_CONVERSION_PIECES,
  num5ConversionPiece,
} from "./nodes/NUM.5";
export {
  buildD1PracticePool,
  buildD1PracticeVariants,
  D1_PRACTICE_MIX,
  D1_PRACTICE_NODES,
  D1_PRACTICE_ONLY_TEMPLATES,
  D1_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D1_PRACTICE_TEMPLATES,
} from "./practice";
export { D1_TEMPLATES } from "./templates";
export { D1_WALK_TEMPLATES } from "./walk-templates";

/**
 * Fixed seed bases for the two parallel assessment forms. Freezing is
 * deterministic, so these forms are stable immutable item versions; the
 * immutability guard test pins their content hashes so a template edit can't
 * silently change a published form.
 */
const FORM_A_SEED_BASE = 1000;
const FORM_B_SEED_BASE = 2000;

const { formA, formB } = freezeParallelForms(
  D1_TEMPLATES,
  FORM_A_SEED_BASE,
  FORM_B_SEED_BASE,
);

/** Frozen Form A (pre pool) — one instance per template. */
export const D1_FORM_A: readonly FrozenItem[] = formA;
/** Frozen Form B (post pool) — structurally matched, guaranteed distinct from A. */
export const D1_FORM_B: readonly FrozenItem[] = formB;

/** All frozen D1 assessment item versions. */
export const D1_ITEM_PACK: readonly FrozenItem[] = [...D1_FORM_A, ...D1_FORM_B];

/**
 * Frozen D1 lesson practice pool — a 1×L1/2×L2/2×L3 five-slot set per node (30
 * items). Never served by the diagnostic (`createItemBank` skips `practice`); the
 * freeze avoids every assessment item's content hash, so no item is shared between
 * a practice and an assessment pool.
 */
export const D1_PRACTICE_POOL: readonly FrozenItem[] = buildD1PracticePool(
  D1_ITEM_PACK.map(hashItemDefinition),
);

/**
 * Retry/replacement variant pool — up to `D1_PRACTICE_RETRY_VARIANTS_PER_CELL`
 * distinct number-swapped instances per cell, all distinct from the assessment
 * forms AND the canonical practice pool. Combined with the canonical pool into
 * `D1_PRACTICE_ITEMS`, which `drawD1PracticeInstance` serves on a reveal→retry.
 */
export const D1_PRACTICE_VARIANTS: readonly FrozenItem[] = buildD1PracticeVariants(
  D1_PRACTICE_RETRY_VARIANTS_PER_CELL,
  [...D1_ITEM_PACK, ...D1_PRACTICE_POOL].map(hashItemDefinition),
);

/**
 * The full registrable practice set: the canonical five-slot pool + all retry
 * variants. Register this with the answer checker once at startup —
 * `configureAnswerChecker(createD1AnswerChecker({ itemVersions: toD1ItemVersions(D1_PRACTICE_ITEMS) }))`
 * (alongside `D1_ITEM_PACK`) — so every practice instance a lesson can show, initial
 * or drawn on retry, is gradable.
 */
export const D1_PRACTICE_ITEMS: readonly FrozenItem[] = [
  ...D1_PRACTICE_POOL,
  ...D1_PRACTICE_VARIANTS,
];

/** The canonical five-slot practice set (1×L1/2×L2/2×L3) for a node. */
export function getD1PracticeSet(nodeId: D1NodeId): FrozenItem[] {
  return D1_PRACTICE_POOL.filter((item) => item.node_id === nodeId);
}

/**
 * Build a randomized five-slot practice set for a node. Same locked mix
 * (`D1_PRACTICE_MIX`: 1×L1/2×L2/2×L3) and easy→hard slot order as `getD1PracticeSet`,
 * but each slot's instance is drawn at random from ALL registered instances for its
 * `(node, difficulty)` cell — the canonical pool AND the retry variants — so the set
 * varies run to run instead of always serving the same five. Every returned item is a
 * member of `D1_PRACTICE_ITEMS`, so it is already registered with the checker and
 * gradable. Pass a seeded `rng` for deterministic output (defaults to `Math.random`).
 *
 * Picks within a cell are distinct AND spread across the cell's problem SHAPES before
 * repeating one (`drawSpreadByShape`), so a two-slot cell holding two shapes serves both
 * rather than the same shape twice with different numbers. This changes only which
 * registered instance lands in a slot; no frozen item, id or content hash moves.
 */
export function buildRandomizedD1PracticeSet(
  nodeId: D1NodeId,
  rng: () => number = Math.random,
): FrozenItem[] {
  return buildRandomizedSetByShape(
    D1_PRACTICE_ITEMS,
    nodeId,
    D1_PRACTICE_MIX,
    rng,
    (difficulty, need, have) =>
      `not enough practice instances for ${nodeId} L${difficulty}: need ${need}, have ${have}`,
  );
}

// ── v2 prerequisite-gated walk assessment pool (Amendment v2 §4/§8) ──────────────
//
// The v1 MST above serves ONE item per (node, difficulty) cell — enough for a clean
// 2/2 robust pass but not the walk's asymmetric-confirm THIRD item. The walk decides
// each node with an adaptive 2-of-3 (adjudicator, `MAX_PROBE_ITEMS = 3`), so a served
// cell needs ≥3 parallel items that never repeat. This deeper pool supplies exactly
// that, so the real bank can drive a confirmed failure / non-robust pass — the last
// content gate before flipping the default `scoring_model_version` to v2.
//
// The walk is difficulty-agnostic (its `WalkItemSource` takes no difficulty; placement
// is a fixed status→seed map), so it probes every node at the ROUTING difficulty L2 —
// the one level every D1 node authors — three parallel instances per form. It is a
// separate, additive pool: building it does not touch the v1 forms or the practice pool.
//
// Provenance (the v1 forms are NO LONGER "byte-identical/untouched"): the v1 D1 forms
// and their pinned content hashes were REBASELINED by PR #17 — a cross-lane change to
// the shared `combined_polynomial` grader (`checker-core.ts`) plus NUM.F
// `reducedFractionAnswer` — and ratified by the owner (Gabe) on 2026-07-23 under the
// cross-lane change policy (OWNERS.md; docs/Answer_Equivalence_Spec.md). The re-pinned
// `template.test.ts.snap` hashes are correct as ratified; do not revert them.
//
// The walk draws from its OWN tightened L2 generators (`D1_WALK_TEMPLATES`,
// `./walk-templates.ts`) rather than the shared `D1_TEMPLATES`, so the walk items can be
// hardened (commutativity-deduped, no-50% percents with a reverse form) without this
// file editing a published v1 item.
// `createItemPackWalkSource` (`@cr/item-bank`) serves it to the engine.

/** Parallel items the walk needs per served (node) cell for the 2-of-3 rule. */
export const D1_WALK_ITEMS_PER_CELL = 3;

// Seed bases disjoint from the v1 forms (1000/2000), practice (5000), and variants
// (7000) so no frozen id or content collides across pools.
const WALK_FORM_A_SEED_BASE = 10_000;
const WALK_FORM_B_SEED_BASE = 20_000;

const walkForms = freezeDeepParallelForms(D1_WALK_TEMPLATES, {
  instancesPerCell: D1_WALK_ITEMS_PER_CELL,
  seedBaseA: WALK_FORM_A_SEED_BASE,
  seedBaseB: WALK_FORM_B_SEED_BASE,
  // Never reuse a v1-assessment or practice item's content (schema invariant).
  avoidHashes: [...D1_ITEM_PACK, ...D1_PRACTICE_ITEMS].map(hashItemDefinition),
});

/** Frozen v2 walk Form A (pre pool) — `D1_WALK_ITEMS_PER_CELL` L2 items per node. */
export const D1_WALK_FORM_A: readonly FrozenItem[] = walkForms.formA;
/** Frozen v2 walk Form B (post pool) — matched depth, guaranteed distinct from A. */
export const D1_WALK_FORM_B: readonly FrozenItem[] = walkForms.formB;

/** All frozen v2 walk assessment item versions (both forms). */
export const D1_WALK_ITEM_PACK: readonly FrozenItem[] = [
  ...D1_WALK_FORM_A,
  ...D1_WALK_FORM_B,
];

/**
 * Draw a fresh number-swapped practice instance for a (node, difficulty) cell,
 * distinct from every id in `avoid` (the instance ids already shown this lesson) —
 * the reveal→retry one-liner. Searches the full registrable set (`D1_PRACTICE_ITEMS`
 * = pool ∪ variants) so an unused canonical-pool sibling is eligible, not only the
 * pre-built variant list. When `templateId` is given (a cell can now hold more than
 * one shape), it prefers an unused instance of that same shape so a retry looks like
 * the problem the student just saw, falling back to any in-cell instance. Within each
 * of those tiers it prefers an instance whose ANSWER the reveal has not just shown, so
 * a retry cannot hand back the number the learner was given. Returns the next unused
 * instance, or `undefined` if the cell is exhausted (rare; only after many retries on
 * one slot, or on a tiny cell like NUM.F L1). The result is already registered with the
 * checker.
 *
 * The answer preference is {@link drawRetryInstance}, shared with every other domain.
 * It is a preference and never a constraint, so a cell whose answers are exhausted
 * still fills its retry.
 */
export function drawD1PracticeInstance(
  nodeId: D1NodeId,
  difficulty: ItemDifficulty,
  opts: { avoid?: Iterable<string>; templateId?: string } = {},
): FrozenItem | undefined {
  return drawRetryInstance(D1_PRACTICE_ITEMS, { nodeId, difficulty }, opts);
}
