import { buildRandomizedSetByShape, drawRetryInstance } from "../practiceSelect";
import { hashItemDefinition, type ItemDifficulty } from "../schema";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "../template";
import { LF1_NODE, LF1_TEMPLATES } from "./nodes/LF.1";
import { LF2_NODE, LF2_TEMPLATES } from "./nodes/LF.2";
import { LF3_NODE, LF3_TEMPLATES } from "./nodes/LF.3";
import { LF4_NODE, LF4_TEMPLATES } from "./nodes/LF.4";

/**
 * The frozen D7 (Linear Functions) practice pool: one five-slot lesson-practice pool per
 * node, mirroring the D1, D2 and D5 pools' shape. Each node composes the locked
 * 1xL1 / 2xL2 / 2xL3 mix, with two distinct problem SHAPES at each of L2 and L3 so a
 * five-slot set reshuffles without repeating.
 *
 * It is a SEPARATE, additive pool: it never touches the already-frozen LF.1 product
 * ASSESSMENT item (`prod.lf-1.l2`), which keeps its own template id and content.
 *
 * Every shape is text-graded through the v2 product checker, and the four nodes answer in
 * the types their questions actually call for rather than in one house form. A slope or a
 * prediction is `numeric`; a line or a model is asked for as the RIGHT-HAND SIDE of
 * `y = ...` and graded as an `expression`, because general two-sided equation equivalence
 * is not a cleared checker category; a system's solution is a `point`; and the classify
 * families (increasing/decreasing/constant, parallel/perpendicular/neither, one/no/many
 * solutions) are `multiple_choice` typed as a word.
 *
 * ## The variety guard is enforced here
 *
 * Every D7 template declares a `varietyKey` over its answer, and both freezers below
 * honour it: content-hash distinctness alone would let two instances that reduce to the
 * same thing sit in one cell. A template's key therefore has to admit at least as many
 * distinct values as the pool draws from it.
 */

/** D7 practice nodes, in lesson order: slope, write/graph, model, systems. */
export const D7_PRACTICE_NODES: readonly string[] = [
  LF1_NODE,
  LF2_NODE,
  LF3_NODE,
  LF4_NODE,
];

/**
 * Every D7 practice template, aggregated in stable node order (LF.1 first). The per-node
 * generators live under `nodes/<NODE>/`; this file only concatenates them, so the frozen
 * pool below is deterministic.
 */
export const D7_PRACTICE_TEMPLATES: readonly ItemTemplate[] = [
  ...LF1_TEMPLATES,
  ...LF2_TEMPLATES,
  ...LF3_TEMPLATES,
  ...LF4_TEMPLATES,
];

/** The D7 practice mix: the same five-slot 1xL1 / 2xL2 / 2xL3 shape as D1, D2 and D5. */
export const D7_PRACTICE_MIX: readonly { difficulty: ItemDifficulty; count: number }[] = [
  { difficulty: 1, count: 1 },
  { difficulty: 2, count: 2 },
  { difficulty: 3, count: 2 },
];

/** Group the practice templates by (node, difficulty) cell, in stable list order. */
function templatesByCell(): Map<string, ItemTemplate[]> {
  const byCell = new Map<string, ItemTemplate[]>();
  for (const template of D7_PRACTICE_TEMPLATES) {
    const key = `${template.node_id}:L${template.difficulty}`;
    const templates = byCell.get(key) ?? [];
    templates.push(template);
    byCell.set(key, templates);
  }
  return byCell;
}

// Seed bases disjoint from D1 (1000/2000/5000/7000/10000/20000), the interactive demo pool
// (42000/43000), D2 (60000/61000) and D5 (70000/71000) so no frozen id or content collides
// across pools.
const PRACTICE_SEED_BASE = 80_000;
const VARIANT_SEED_BASE = 81_000;

/** Retry/replacement variants per (node, difficulty) cell: the reveal-to-retry draw pool. */
export const D7_PRACTICE_RETRY_VARIANTS_PER_CELL = 6;

/**
 * Freeze the canonical five-slot practice pool for every D7 node: the locked mix per node,
 * each cell drawn round-robin across its problem SHAPES from a single continuous seed. A
 * distinctness guard bumps the seed until each item's content is unique in the pool AND
 * against `avoidHashes`, and until its `varietyKey` is unused in THIS cell, so a cell never
 * freezes two items that reduce to the same answer.
 */
function buildPool(avoidHashes: Iterable<string> = []): FrozenItem[] {
  const byCell = templatesByCell();
  const used = new Set<string>(avoidHashes);
  const pool: FrozenItem[] = [];
  let seed = PRACTICE_SEED_BASE;
  for (const node of D7_PRACTICE_NODES) {
    for (const { difficulty, count } of D7_PRACTICE_MIX) {
      const templates = byCell.get(`${node}:L${difficulty}`);
      if (!templates?.length) {
        throw new Error(`no D7 practice template for ${node} L${difficulty}`);
      }
      const cellVariety = new Set<string>();
      for (let index = 0; index < count; index += 1) {
        const template = templates[index % templates.length] as ItemTemplate;
        const collides = (item: FrozenItem): boolean => {
          if (used.has(hashItemDefinition(item))) {
            return true;
          }
          const variety = template.varietyKey?.(item.template_params);
          return variety !== undefined && cellVariety.has(variety);
        };
        let candidate = generateFromTemplate(template, "practice", seed);
        for (let attempt = 0; attempt < 200 && collides(candidate); attempt += 1) {
          seed += 1;
          candidate = generateFromTemplate(template, "practice", seed);
        }
        used.add(hashItemDefinition(candidate));
        const variety = template.varietyKey?.(candidate.template_params);
        if (variety !== undefined) {
          cellVariety.add(variety);
        }
        pool.push(candidate);
        seed += 1;
      }
    }
  }
  return pool;
}

/**
 * Pre-generate up to `perCell` distinct number-swapped variants per template: the
 * reveal-to-retry replacement pool. Deterministic; each variant is distinct in content from
 * the others and from `avoidHashes`, and distinct in `varietyKey` from the other variants
 * of ITS template, so a retry never hands back the same answer in new clothes.
 */
function buildVariants(perCell: number, avoidHashes: Iterable<string> = []): FrozenItem[] {
  const used = new Set<string>(avoidHashes);
  const variants: FrozenItem[] = [];
  let seed = VARIANT_SEED_BASE;
  for (const template of D7_PRACTICE_TEMPLATES) {
    const templateVariety = new Set<string>();
    let made = 0;
    let misses = 0;
    while (made < perCell && misses < 200) {
      const candidate = generateFromTemplate(template, "practice", seed);
      seed += 1;
      const hash = hashItemDefinition(candidate);
      const variety = template.varietyKey?.(candidate.template_params);
      if (used.has(hash) || (variety !== undefined && templateVariety.has(variety))) {
        misses += 1;
        continue;
      }
      used.add(hash);
      if (variety !== undefined) {
        templateVariety.add(variety);
      }
      variants.push(candidate);
      made += 1;
      misses = 0;
    }
  }
  return variants;
}

/** The canonical five-slot-per-node D7 practice pool (LF.1 to LF.4). */
export const D7_PRACTICE_POOL: readonly FrozenItem[] = buildPool();

/** Retry/replacement variants, distinct from the canonical pool. */
export const D7_PRACTICE_VARIANTS: readonly FrozenItem[] = buildVariants(
  D7_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D7_PRACTICE_POOL.map(hashItemDefinition),
);

/**
 * Every registrable D7 practice instance (canonical pool + retry variants). Register these
 * with the checker so any drawn instance is gradable.
 */
export const D7_PRACTICE_ITEMS: readonly FrozenItem[] = [
  ...D7_PRACTICE_POOL,
  ...D7_PRACTICE_VARIANTS,
];

/**
 * Build a randomized five-slot practice set for a D7 node: the locked 1xL1 / 2xL2 / 2xL3
 * mix in easy-to-hard order, each slot drawn from all registered instances for its
 * (node, difficulty) so the opening problems vary run to run. Picks within a difficulty are
 * distinct AND spread across the cell's problem SHAPES before repeating one. Every returned
 * item is a member of {@link D7_PRACTICE_ITEMS} (so already registered and gradable).
 */
export function buildRandomizedD7PracticeSet(
  nodeId: string = LF1_NODE,
  rng: () => number = Math.random,
): FrozenItem[] {
  return buildRandomizedSetByShape(
    D7_PRACTICE_ITEMS,
    nodeId,
    D7_PRACTICE_MIX,
    rng,
    (difficulty, need, have) =>
      `not enough D7 practice instances for ${nodeId} L${difficulty}: need ${need}, have ${have}`,
  );
}

/** The canonical five-slot practice set (1xL1/2xL2/2xL3) for a D7 node. */
export function getD7PracticeSet(nodeId: string = LF1_NODE): FrozenItem[] {
  return D7_PRACTICE_POOL.filter((item) => item.node_id === nodeId);
}

/**
 * Draw a fresh D7 practice instance for a (node, difficulty) cell, distinct from every id
 * in `avoid` (the reveal to retry one-liner). Searches the full registrable set
 * (`D7_PRACTICE_ITEMS` = pool ∪ variants). Prefers an unused instance of the same shape
 * (`templateId`) when given, and within that shape one whose ANSWER the reveal has NOT
 * just shown, so a retry cannot hand back the value the learner was given. Returns `undefined`
 * if the cell is exhausted.
 *
 * The answer preference is {@link drawRetryInstance}, shared with every domain. It is a
 * preference and never a constraint, so a cell whose answers are genuinely exhausted still
 * fills its retry rather than hiding the button.
 */
export function drawD7PracticeInstance(
  nodeId: string,
  difficulty: ItemDifficulty,
  opts: { avoid?: Iterable<string>; templateId?: string } = {},
): FrozenItem | undefined {
  return drawRetryInstance(D7_PRACTICE_ITEMS, { nodeId, difficulty }, opts);
}
