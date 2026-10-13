import { buildRandomizedSetByShape, drawRetryInstance } from "../practiceSelect";
import { hashItemDefinition, type ItemDifficulty } from "../schema";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "../template";
import { EL1_NODE, EL1_TEMPLATES } from "./nodes/EL.1";
import { EL2_NODE, EL2_TEMPLATES } from "./nodes/EL.2";
import { EL3_EXTRA_TEMPLATES, EL3_NODE, EL3_TEMPLATES } from "./nodes/EL.3";
import { EL4_NODE, EL4_TEMPLATES } from "./nodes/EL.4";
import { EL5_NODE, EL5_TEMPLATES } from "./nodes/EL.5";
import { EL6_NODE, EL6_TEMPLATES } from "./nodes/EL.6";

/**
 * The frozen D8 (Exponential & Logarithmic) practice pool: one five-slot lesson-practice
 * pool per node, mirroring the D1, D2, D5 and D7 pools' shape. Each node composes the
 * locked 1xL1 / 2xL2 / 2xL3 mix, with two distinct problem SHAPES at each of L2 and L3 so a
 * five-slot set reshuffles without repeating.
 *
 * It is a SEPARATE, additive pool: it never touches the already-frozen EL.1 product
 * ASSESSMENT item (`prod.el-1.l2`), which keeps its own template id, its own annual
 * compounding shape and its own content.
 *
 * ## Which nodes are here
 *
 * All six: EL.1 to EL.6. EL.6 (solve exponential and logarithmic equations) was absent until
 * 2026-07-30, when §10's deferral was read against the checker rather than taken on trust.
 * *Arbitrary equation equivalence* is reached when a learner submits AN EQUATION; solving one
 * submits its ROOTS, which are `numeric`, `numeric` with a declared `precision`, or a
 * `solution_set`, all long cleared. One shape did need new capability, and got it: an
 * equation quadratic in $e^x$ has logarithmic roots, so a roster member may now be a `log`,
 * `ln` or `sqrt` of a constant when the item declares `representation: "exact"`.
 *
 * Every shape is text-graded through the v2 product checker. The nodes answer in the types
 * their questions actually call for: a count, a remaining amount, an exponent or a base is
 * `numeric`; a rounded continuous-growth balance is `numeric` with a declared `precision`,
 * because the checker has no `e` binding and so cannot grade an exact `e` expression; a
 * direction is `multiple_choice` typed as a word; and a set of surviving roots is a
 * `solution_set`.
 *
 * ## The variety guard is enforced here
 *
 * Every D8 template declares a `varietyKey` over the numbers that fix its instance, and both
 * freezers below honour it: content-hash distinctness alone would let two instances that
 * reduce to the same question sit in one cell, which matters more in this domain than most,
 * because several shapes reach the same small exponent by different routes.
 */

/** D8 practice nodes, in lesson order. */
export const D8_PRACTICE_NODES: readonly string[] = [
  EL1_NODE,
  EL2_NODE,
  EL3_NODE,
  EL4_NODE,
  EL5_NODE,
  EL6_NODE,
];

/**
 * Every D8 practice template, aggregated in stable node order (EL.1 first). The per-node
 * generators live under `nodes/<NODE>/`; this file only concatenates them, so the frozen
 * pool below is deterministic.
 */
/**
 * Extra problem SHAPES that share an existing (node, difficulty) cell, listed before the
 * aggregate so they can be appended after every locked-mix template rather than filed with
 * their node.
 *
 * The position in the aggregate is load-bearing rather than tidy. `buildPool` fills a
 * two-slot cell round-robin from the cell's first two templates and `buildVariants` walks
 * the whole list on one running seed, so a shape inserted next to its siblings would
 * re-freeze the second pool slot of its own cell and every retry variant behind it in the
 * list. Appended last it adds instances and moves none. See `D1_EXTRA_PRACTICE_TEMPLATES`,
 * which is the same arrangement for the same reason.
 */
export const D8_EXTRA_PRACTICE_TEMPLATES: readonly ItemTemplate[] = [
  ...EL3_EXTRA_TEMPLATES,
];

export const D8_PRACTICE_TEMPLATES: readonly ItemTemplate[] = [
  ...EL1_TEMPLATES,
  ...EL2_TEMPLATES,
  ...EL3_TEMPLATES,
  ...EL4_TEMPLATES,
  ...EL5_TEMPLATES,
  ...EL6_TEMPLATES,
  ...D8_EXTRA_PRACTICE_TEMPLATES,
];

/** The D8 practice mix: the same five-slot 1xL1 / 2xL2 / 2xL3 shape as every other pool. */
export const D8_PRACTICE_MIX: readonly { difficulty: ItemDifficulty; count: number }[] = [
  { difficulty: 1, count: 1 },
  { difficulty: 2, count: 2 },
  { difficulty: 3, count: 2 },
];

/** Group the practice templates by (node, difficulty) cell, in stable list order. */
function templatesByCell(): Map<string, ItemTemplate[]> {
  const byCell = new Map<string, ItemTemplate[]>();
  for (const template of D8_PRACTICE_TEMPLATES) {
    const key = `${template.node_id}:L${template.difficulty}`;
    const templates = byCell.get(key) ?? [];
    templates.push(template);
    byCell.set(key, templates);
  }
  return byCell;
}

// Seed bases disjoint from D1 (1000/2000/5000/7000/10000/20000), the interactive demo pool
// (42000/43000), D2 (60000/61000), D5 (70000/71000) and D7 (80000/81000) so no frozen id or
// content collides across pools.
const PRACTICE_SEED_BASE = 90_000;
const VARIANT_SEED_BASE = 91_000;

/** Retry/replacement variants per (node, difficulty) cell: the reveal-to-retry draw pool. */
export const D8_PRACTICE_RETRY_VARIANTS_PER_CELL = 6;

/**
 * Freeze the canonical five-slot practice pool for every D8 node: the locked mix per node,
 * each cell drawn round-robin across its problem SHAPES from a single continuous seed. A
 * distinctness guard bumps the seed until each item's content is unique in the pool AND
 * against `avoidHashes`, and until its `varietyKey` is unused in THIS cell, so a cell never
 * freezes two items that reduce to the same question.
 */
function buildPool(avoidHashes: Iterable<string> = []): FrozenItem[] {
  const byCell = templatesByCell();
  const used = new Set<string>(avoidHashes);
  const pool: FrozenItem[] = [];
  let seed = PRACTICE_SEED_BASE;
  for (const node of D8_PRACTICE_NODES) {
    for (const { difficulty, count } of D8_PRACTICE_MIX) {
      const templates = byCell.get(`${node}:L${difficulty}`);
      if (!templates?.length) {
        throw new Error(`no D8 practice template for ${node} L${difficulty}`);
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
  for (const template of D8_PRACTICE_TEMPLATES) {
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

/** The canonical five-slot-per-node D8 practice pool. */
export const D8_PRACTICE_POOL: readonly FrozenItem[] = buildPool();

/** Retry/replacement variants, distinct from the canonical pool. */
export const D8_PRACTICE_VARIANTS: readonly FrozenItem[] = buildVariants(
  D8_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D8_PRACTICE_POOL.map(hashItemDefinition),
);

/**
 * Every registrable D8 practice instance (canonical pool + retry variants). Register these
 * with the checker so any drawn instance is gradable.
 */
export const D8_PRACTICE_ITEMS: readonly FrozenItem[] = [
  ...D8_PRACTICE_POOL,
  ...D8_PRACTICE_VARIANTS,
];

/**
 * Build a randomized five-slot practice set for a D8 node: the locked 1xL1 / 2xL2 / 2xL3
 * mix in easy-to-hard order, each slot drawn from all registered instances for its
 * (node, difficulty) so the opening problems vary run to run. Picks within a difficulty are
 * distinct AND spread across the cell's problem SHAPES before repeating one. Every returned
 * item is a member of {@link D8_PRACTICE_ITEMS} (so already registered and gradable).
 */
export function buildRandomizedD8PracticeSet(
  nodeId: string = EL1_NODE,
  rng: () => number = Math.random,
): FrozenItem[] {
  return buildRandomizedSetByShape(
    D8_PRACTICE_ITEMS,
    nodeId,
    D8_PRACTICE_MIX,
    rng,
    (difficulty, need, have) =>
      `not enough D8 practice instances for ${nodeId} L${difficulty}: need ${need}, have ${have}`,
  );
}

/** The canonical five-slot practice set (1xL1/2xL2/2xL3) for a D8 node. */
export function getD8PracticeSet(nodeId: string = EL1_NODE): FrozenItem[] {
  return D8_PRACTICE_POOL.filter((item) => item.node_id === nodeId);
}

/**
 * Draw a fresh D8 practice instance for a (node, difficulty) cell, distinct from every id
 * in `avoid` (the reveal to retry one-liner). Searches the full registrable set
 * (`D8_PRACTICE_ITEMS` = pool ∪ variants). Prefers an unused instance of the same shape
 * (`templateId`) when given, and within that shape one whose ANSWER the reveal has NOT
 * just shown, so a retry cannot hand back the value the learner was given. Returns `undefined`
 * if the cell is exhausted.
 *
 * The answer preference is {@link drawRetryInstance}, shared with every domain. It is a
 * preference and never a constraint, so a cell whose answers are genuinely exhausted still
 * fills its retry rather than hiding the button.
 */
export function drawD8PracticeInstance(
  nodeId: string,
  difficulty: ItemDifficulty,
  opts: { avoid?: Iterable<string>; templateId?: string } = {},
): FrozenItem | undefined {
  return drawRetryInstance(D8_PRACTICE_ITEMS, { nodeId, difficulty }, opts);
}
