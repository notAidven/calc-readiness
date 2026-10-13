import { buildRandomizedSetByShape, drawRetryInstance } from "../practiceSelect";
import { hashItemDefinition, type ItemDifficulty } from "../schema";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "../template";
import { GEO1_NODE, GEO1_TEMPLATES } from "./nodes/GEO.1";
import { GEO2_NODE, GEO2_TEMPLATES } from "./nodes/GEO.2";

/**
 * The frozen D10 (Geometry) practice pool: one five-slot lesson-practice pool per node,
 * mirroring the D1, D2, D5, D7 and D8 pools' shape. Each node composes the locked
 * 1xL1 / 2xL2 / 2xL3 mix, with two distinct problem SHAPES at each of L2 and L3 so a
 * five-slot set reshuffles without repeating.
 *
 * ## Which nodes are here
 *
 * GEO.1 and GEO.2 are the domain's whole authored node set, and nothing in
 * `skill_graph.json` declares either as a prereq, so this pool is purely additive.
 *
 * ## The answer shapes, and why each is the one it is
 *
 * Every shape is text-graded through the v2 product checker, and each was graded against
 * that checker before it was authored (`docs/D10_Domain_Plan.md` §"Spike findings"). Three
 * of those findings are load-bearing here:
 *
 *  - **A side length is `numeric` and its unit lives in the PROMPT.** A typed `48 m^2`
 *    grades `invalid_input/unknown_symbol`, as does `35 degrees`, and `35°` is a
 *    `parse_error`. No item asks a unit conversion either, since the checker matches
 *    aliases of one declared unit only.
 *  - **An exact diagonal is `simplified_radical`, written `a*sqrt(b)`.** The `√` glyph is
 *    a parse error, and the unsimplified `sqrt(50)` is rejected `not_simplified`, which is
 *    the simplification GEO.1 teaches. Conversely a plain `numeric` key REFUSES a `sqrt`
 *    call (`unsupported_syntax`), so the whole-number shapes ask for the value instead.
 *  - **An exact-pi volume is an `expression` that declares `pi` in `allowed_symbols`.**
 *    That declaration is the only thing that binds the symbol: `numericAnswer("36*pi")` is
 *    invalid at the KEY (`scoring_error/invalid_answer_key`), and so is the radical
 *    spelling.
 *
 * ## The variety guard is enforced here
 *
 * Every D10 template declares a `varietyKey` over the numbers that fix its instance, and
 * both freezers below honour it: content-hash distinctness alone would let two instances
 * that reduce to the same question sit in one cell. That matters in this domain because a
 * handful of Pythagorean triples carry several shapes, and two cells drawing 3-4-5 in
 * different clothes would be asking one question twice.
 */

/** D10 practice nodes, in lesson order. */
export const D10_PRACTICE_NODES: readonly string[] = [GEO1_NODE, GEO2_NODE];

/**
 * Every D10 practice template, aggregated in stable node order (GEO.1 first). The per-node
 * generators live under `nodes/<NODE>/`; this file only concatenates them, so the frozen
 * pool below is deterministic.
 */
export const D10_PRACTICE_TEMPLATES: readonly ItemTemplate[] = [
  ...GEO1_TEMPLATES,
  ...GEO2_TEMPLATES,
];

/** The D10 practice mix: the same five-slot 1xL1 / 2xL2 / 2xL3 shape as every other pool. */
export const D10_PRACTICE_MIX: readonly { difficulty: ItemDifficulty; count: number }[] = [
  { difficulty: 1, count: 1 },
  { difficulty: 2, count: 2 },
  { difficulty: 3, count: 2 },
];

/** Group the practice templates by (node, difficulty) cell, in stable list order. */
function templatesByCell(): Map<string, ItemTemplate[]> {
  const byCell = new Map<string, ItemTemplate[]>();
  for (const template of D10_PRACTICE_TEMPLATES) {
    const key = `${template.node_id}:L${template.difficulty}`;
    const templates = byCell.get(key) ?? [];
    templates.push(template);
    byCell.set(key, templates);
  }
  return byCell;
}

// Seed bases disjoint from every other pool, each read off the tree rather than assumed:
// D1 (1000/2000/5000/7000/10000/20000), the interactive demo pool (42000/43000), D2
// (60000/61000), D5 (70000/71000), D7 (80000/81000), D8 (90000/91000), the product forms
// (100000/200000), D3 (110000/111000) and D4 (120000/121000). 130000 is the next pair
// free, so no frozen id or content can collide across pools.
const PRACTICE_SEED_BASE = 130_000;
const VARIANT_SEED_BASE = 131_000;

/** Retry/replacement variants per (node, difficulty) cell: the reveal-to-retry draw pool. */
export const D10_PRACTICE_RETRY_VARIANTS_PER_CELL = 6;

/**
 * Freeze the canonical five-slot practice pool for every D10 node: the locked mix per node,
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
  for (const node of D10_PRACTICE_NODES) {
    for (const { difficulty, count } of D10_PRACTICE_MIX) {
      const templates = byCell.get(`${node}:L${difficulty}`);
      if (!templates?.length) {
        throw new Error(`no D10 practice template for ${node} L${difficulty}`);
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
  for (const template of D10_PRACTICE_TEMPLATES) {
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

/** The canonical five-slot-per-node D10 practice pool. */
export const D10_PRACTICE_POOL: readonly FrozenItem[] = buildPool();

/** Retry/replacement variants, distinct from the canonical pool. */
export const D10_PRACTICE_VARIANTS: readonly FrozenItem[] = buildVariants(
  D10_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D10_PRACTICE_POOL.map(hashItemDefinition),
);

/**
 * Every registrable D10 practice instance (canonical pool + retry variants). Register these
 * with the checker so any drawn instance is gradable.
 */
export const D10_PRACTICE_ITEMS: readonly FrozenItem[] = [
  ...D10_PRACTICE_POOL,
  ...D10_PRACTICE_VARIANTS,
];

/**
 * Build a randomized five-slot practice set for a D10 node: the locked 1xL1 / 2xL2 / 2xL3
 * mix in easy-to-hard order, each slot drawn from all registered instances for its
 * (node, difficulty) so the opening problems vary run to run. Picks within a difficulty are
 * distinct AND spread across the cell's problem SHAPES before repeating one. Every returned
 * item is a member of {@link D10_PRACTICE_ITEMS} (so already registered and gradable).
 */
export function buildRandomizedD10PracticeSet(
  nodeId: string = GEO1_NODE,
  rng: () => number = Math.random,
): FrozenItem[] {
  return buildRandomizedSetByShape(
    D10_PRACTICE_ITEMS,
    nodeId,
    D10_PRACTICE_MIX,
    rng,
    (difficulty, need, have) =>
      `not enough D10 practice instances for ${nodeId} L${difficulty}: need ${need}, have ${have}`,
  );
}

/** The canonical five-slot practice set (1xL1/2xL2/2xL3) for a D10 node. */
export function getD10PracticeSet(nodeId: string = GEO1_NODE): FrozenItem[] {
  return D10_PRACTICE_POOL.filter((item) => item.node_id === nodeId);
}

/**
 * Draw a fresh D10 practice instance for a (node, difficulty) cell, distinct from every id
 * in `avoid` (the reveal to retry one-liner). Searches the full registrable set
 * (`D10_PRACTICE_ITEMS` = pool ∪ variants). Prefers an unused instance of the same shape
 * (`templateId`) when given, and within that shape one whose ANSWER the reveal has NOT
 * just shown, so a retry cannot hand back the value the learner was given. Returns `undefined`
 * if the cell is exhausted.
 *
 * The answer preference is {@link drawRetryInstance}, shared with every domain. It is a
 * preference and never a constraint, so a cell whose answers are genuinely exhausted still
 * fills its retry rather than hiding the button.
 */
export function drawD10PracticeInstance(
  nodeId: string,
  difficulty: ItemDifficulty,
  opts: { avoid?: Iterable<string>; templateId?: string } = {},
): FrozenItem | undefined {
  return drawRetryInstance(D10_PRACTICE_ITEMS, { nodeId, difficulty }, opts);
}
