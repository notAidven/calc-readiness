import { buildRandomizedSetByShape, drawRetryInstance } from "../practiceSelect";
import { hashItemDefinition, type ItemDifficulty } from "../schema";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "../template";
import { RAT1_NODE, RAT1_TEMPLATES } from "./nodes/RAT.1";
import { RAT2_NODE, RAT2_TEMPLATES } from "./nodes/RAT.2";
import { RAT3_NODE, RAT3_TEMPLATES } from "./nodes/RAT.3";
import { RAT4_NODE, RAT4_TEMPLATES } from "./nodes/RAT.4";
import { RAT5_NODE, RAT5_TEMPLATES } from "./nodes/RAT.5";
import { RAT6_NODE, RAT6_TEMPLATES } from "./nodes/RAT.6";

/**
 * The frozen D5 ("Verdigris Hold", the crafting-guild island) practice pool: one five-slot
 * lesson-practice pool per node, mirroring the D1 and D2 pools' shape. Each node composes
 * the locked 1xL1 / 2xL2 / 2xL3 mix, with two distinct problem SHAPES at each of L2 and L3
 * so a five-slot set reshuffles without repeating.
 *
 * It is a SEPARATE, additive pool: it never touches the already-frozen RAT.1 product
 * ASSESSMENT item (`prod.rat-1.l2`), which keeps a different form, different template ids
 * and distinct content.
 *
 * Every shape is text-graded through the v2 product checker. RAT.1 to RAT.4 take the
 * `rational_answer` path, which compares the expression on its valid domain AND the
 * excluded-value set: those exclusions are inherited from the ORIGINAL denominator, so
 * cancelling a factor never silently drops the value it forbade. The two analysis nodes
 * answer differently, because what they ask for is not an expression: RAT.5 gives a domain
 * in set-builder notation, an asymptote value, or a hole as a point, and RAT.6 gives the
 * solution set left standing after the extraneous roots are thrown out.
 *
 * ## The variety guard is enforced here
 *
 * Every D5 template declares a `varietyKey` over its simplified answer, and both freezers
 * below honour it: content-hash distinctness alone would let two instances that reduce to
 * the same thing sit in one cell. A template's key therefore has to admit at least as many
 * distinct values as the pool draws from it.
 */

/** D5 practice nodes, in lesson order: simplify, scale, blend, nest, read, prove. */
export const D5_PRACTICE_NODES: readonly string[] = [
  RAT1_NODE,
  RAT2_NODE,
  RAT3_NODE,
  RAT4_NODE,
  RAT5_NODE,
  RAT6_NODE,
];

/**
 * Every D5 practice template, aggregated in stable node order (RAT.1 first). The per-node
 * generators live under `nodes/<NODE>/`; this file only concatenates them, so the frozen
 * pool below is deterministic.
 */
export const D5_PRACTICE_TEMPLATES: readonly ItemTemplate[] = [
  ...RAT1_TEMPLATES,
  ...RAT2_TEMPLATES,
  ...RAT3_TEMPLATES,
  ...RAT4_TEMPLATES,
  ...RAT5_TEMPLATES,
  ...RAT6_TEMPLATES,
];

/** The D5 practice mix: the same five-slot 1xL1 / 2xL2 / 2xL3 shape as D1 and D2. */
export const D5_PRACTICE_MIX: readonly { difficulty: ItemDifficulty; count: number }[] = [
  { difficulty: 1, count: 1 },
  { difficulty: 2, count: 2 },
  { difficulty: 3, count: 2 },
];

/** Group the practice templates by (node, difficulty) cell, in stable list order. */
function templatesByCell(): Map<string, ItemTemplate[]> {
  const byCell = new Map<string, ItemTemplate[]>();
  for (const template of D5_PRACTICE_TEMPLATES) {
    const key = `${template.node_id}:L${template.difficulty}`;
    const templates = byCell.get(key) ?? [];
    templates.push(template);
    byCell.set(key, templates);
  }
  return byCell;
}

// Seed bases disjoint from D1 (1000/2000/5000/7000/10000/20000), the interactive demo pool
// (42000/43000) and D2 (60000/61000) so no frozen id or content collides across pools.
const PRACTICE_SEED_BASE = 70_000;
const VARIANT_SEED_BASE = 71_000;

/** Retry/replacement variants per (node, difficulty) cell: the reveal-to-retry draw pool. */
export const D5_PRACTICE_RETRY_VARIANTS_PER_CELL = 6;

/**
 * Freeze the canonical five-slot practice pool for every D5 node: the locked mix per node,
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
  for (const node of D5_PRACTICE_NODES) {
    for (const { difficulty, count } of D5_PRACTICE_MIX) {
      const templates = byCell.get(`${node}:L${difficulty}`);
      if (!templates?.length) {
        throw new Error(`no D5 practice template for ${node} L${difficulty}`);
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
  for (const template of D5_PRACTICE_TEMPLATES) {
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

/** The canonical five-slot-per-node D5 practice pool (RAT.1, RAT.2, RAT.3). */
export const D5_PRACTICE_POOL: readonly FrozenItem[] = buildPool();

/** Retry/replacement variants, distinct from the canonical pool. */
export const D5_PRACTICE_VARIANTS: readonly FrozenItem[] = buildVariants(
  D5_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D5_PRACTICE_POOL.map(hashItemDefinition),
);

/**
 * Every registrable D5 practice instance (canonical pool + retry variants). Register these
 * with the checker so any drawn instance is gradable.
 */
export const D5_PRACTICE_ITEMS: readonly FrozenItem[] = [
  ...D5_PRACTICE_POOL,
  ...D5_PRACTICE_VARIANTS,
];

/**
 * Build a randomized five-slot practice set for a D5 node: the locked 1xL1 / 2xL2 / 2xL3
 * mix in easy-to-hard order, each slot drawn from all registered instances for its
 * (node, difficulty) so the opening problems vary run to run. Picks within a difficulty are
 * distinct AND spread across the cell's problem SHAPES before repeating one. Every returned
 * item is a member of {@link D5_PRACTICE_ITEMS} (so already registered and gradable).
 */
export function buildRandomizedD5PracticeSet(
  nodeId: string = RAT1_NODE,
  rng: () => number = Math.random,
): FrozenItem[] {
  return buildRandomizedSetByShape(
    D5_PRACTICE_ITEMS,
    nodeId,
    D5_PRACTICE_MIX,
    rng,
    (difficulty, need, have) =>
      `not enough D5 practice instances for ${nodeId} L${difficulty}: need ${need}, have ${have}`,
  );
}

/** The canonical five-slot practice set (1xL1/2xL2/2xL3) for a D5 node. */
export function getD5PracticeSet(nodeId: string = RAT1_NODE): FrozenItem[] {
  return D5_PRACTICE_POOL.filter((item) => item.node_id === nodeId);
}

/**
 * Draw a fresh D5 practice instance for a (node, difficulty) cell, distinct from every id
 * in `avoid` (the reveal to retry one-liner). Searches the full registrable set
 * (`D5_PRACTICE_ITEMS` = pool ∪ variants). Prefers an unused instance of the same shape
 * (`templateId`) when given, and within that shape one whose ANSWER the reveal has NOT
 * just shown, so a retry cannot hand back the value the learner was given. Returns `undefined`
 * if the cell is exhausted.
 *
 * The answer preference is {@link drawRetryInstance}, shared with every domain. It is a
 * preference and never a constraint, so a cell whose answers are genuinely exhausted still
 * fills its retry rather than hiding the button.
 */
export function drawD5PracticeInstance(
  nodeId: string,
  difficulty: ItemDifficulty,
  opts: { avoid?: Iterable<string>; templateId?: string } = {},
): FrozenItem | undefined {
  return drawRetryInstance(D5_PRACTICE_ITEMS, { nodeId, difficulty }, opts);
}
