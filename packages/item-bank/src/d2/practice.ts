import { buildRandomizedSetByShape, drawRetryInstance } from "../practiceSelect";
import { hashItemDefinition, type ItemDifficulty } from "../schema";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "../template";
import { EXP1_NODE, EXP1_TEMPLATES } from "./nodes/EXP.1";
import { RAD1_NODE, RAD1_TEMPLATES } from "./nodes/RAD.1";
import { RAD2_NODE, RAD2_TEMPLATES } from "./nodes/RAD.2";
import { RAD3_NODE, RAD3_TEMPLATES } from "./nodes/RAD.3";
import { RAD4_NODE, RAD4_TEMPLATES } from "./nodes/RAD.4";

/**
 * The frozen D2 ("Boomtown Square") practice pool: one five-slot lesson-practice pool
 * per node, mirroring the D1 pool's shape. Each node composes the locked 1xL1 / 2xL2 /
 * 2xL3 mix, with at least two distinct problem SHAPES at each of L2 and L3 so a five-slot
 * set reshuffles without repeating. It is a SEPARATE, additive pool: it never touches the
 * already-frozen product ASSESSMENT items (a different `form`, different template ids,
 * and distinct content).
 *
 * Most shapes are text-graded through the v2 product checker (`positive_exponents` for
 * EXP.1, `simplified_radical` for RAD.1/RAD.2, exact-value numeric for RAD.3); the
 * build/convert shapes are widget-graded through the `expr_builder` module. The v2 product
 * checker grades BOTH (its dispatch routes interactive answer types to their module), so
 * the whole pool validates under one config.
 *
 * ## The variety guard is enforced here
 *
 * Every D2 template declares a `varietyKey` over its SIMPLIFIED answer, and both freezers
 * below honour it: content-hash distinctness alone lets two instances that reduce to the
 * same thing sit in one cell (`d2.rad2.build.l3` drawing 2 + 5 and then 3 + 4 is two
 * hashes and one answer). `freezeDeepParallelForms` applies the same rule to the
 * assessment forms; this pool used to declare the key and ignore it, so the node headers
 * that claim it prevents near-twins were describing something that never ran. A template's
 * key therefore has to admit at least as many distinct values as the pool draws from it,
 * which is why two EXP.1 shapes vary their base symbol and RAD.3's sum-case list is
 * eleven long.
 */

/**
 * D2 practice nodes, in island/lesson order (EXP.1 first, then the RAD spine). RAD.4 is
 * APPENDED, never inserted: `buildPool` walks this list with one continuous seed, so a new
 * node at the END leaves every earlier node's frozen instance byte-identical.
 */
export const D2_PRACTICE_NODES: readonly string[] = [
  EXP1_NODE,
  RAD1_NODE,
  RAD2_NODE,
  RAD3_NODE,
  RAD4_NODE,
];

/**
 * Every D2 practice template, aggregated in stable node order (EXP.1 first). The
 * per-node generators live under `nodes/<NODE>/`; this file only concatenates them,
 * so the frozen pool below is deterministic and EXP.1 stays byte-identical.
 */
export const D2_PRACTICE_TEMPLATES: readonly ItemTemplate[] = [
  ...EXP1_TEMPLATES,
  ...RAD1_TEMPLATES,
  ...RAD2_TEMPLATES,
  ...RAD3_TEMPLATES,
  ...RAD4_TEMPLATES,
];

/** The D2 practice mix: the same five-slot 1xL1 / 2xL2 / 2xL3 shape as D1. */
export const D2_PRACTICE_MIX: readonly { difficulty: ItemDifficulty; count: number }[] = [
  { difficulty: 1, count: 1 },
  { difficulty: 2, count: 2 },
  { difficulty: 3, count: 2 },
];

/** Group the practice templates by (node, difficulty) cell, in stable list order. */
function templatesByCell(): Map<string, ItemTemplate[]> {
  const byCell = new Map<string, ItemTemplate[]>();
  for (const template of D2_PRACTICE_TEMPLATES) {
    const key = `${template.node_id}:L${template.difficulty}`;
    const templates = byCell.get(key) ?? [];
    templates.push(template);
    byCell.set(key, templates);
  }
  return byCell;
}

// Seed bases disjoint from D1 (1000/2000/5000/7000/10000/20000) and the interactive
// demo pool (42000/43000) so no frozen id or content collides across pools.
const PRACTICE_SEED_BASE = 60_000;
const VARIANT_SEED_BASE = 61_000;

/** Retry/replacement variants per (node, difficulty) cell: the reveal-to-retry draw pool. */
export const D2_PRACTICE_RETRY_VARIANTS_PER_CELL = 6;

/**
 * Freeze the canonical five-slot practice pool for every D2 node: the locked mix per
 * node, each cell drawn round-robin across its problem SHAPES from a single continuous
 * seed. A distinctness guard bumps the seed until each item's content is unique in the
 * pool AND against `avoidHashes`, and until its `varietyKey` is unused in THIS cell, so a
 * cell never freezes two items that reduce to the same answer.
 */
function buildPool(avoidHashes: Iterable<string> = []): FrozenItem[] {
  const byCell = templatesByCell();
  const used = new Set<string>(avoidHashes);
  const pool: FrozenItem[] = [];
  let seed = PRACTICE_SEED_BASE;
  for (const node of D2_PRACTICE_NODES) {
    for (const { difficulty, count } of D2_PRACTICE_MIX) {
      const templates = byCell.get(`${node}:L${difficulty}`);
      if (!templates?.length) {
        throw new Error(`no D2 practice template for ${node} L${difficulty}`);
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
 * reveal-to-retry replacement pool. Deterministic; each variant is distinct in content
 * from the others and from `avoidHashes`, and distinct in `varietyKey` from the other
 * variants of ITS template, so a retry never hands back the same answer in new clothes.
 */
function buildVariants(perCell: number, avoidHashes: Iterable<string> = []): FrozenItem[] {
  const used = new Set<string>(avoidHashes);
  const variants: FrozenItem[] = [];
  let seed = VARIANT_SEED_BASE;
  for (const template of D2_PRACTICE_TEMPLATES) {
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

/** The canonical five-slot-per-node D2 practice pool (EXP.1, RAD.1, RAD.2, RAD.3). */
export const D2_PRACTICE_POOL: readonly FrozenItem[] = buildPool();

/** Retry/replacement variants, distinct from the canonical pool. */
export const D2_PRACTICE_VARIANTS: readonly FrozenItem[] = buildVariants(
  D2_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D2_PRACTICE_POOL.map(hashItemDefinition),
);

/**
 * Every registrable D2 practice instance (canonical pool + retry variants). Register
 * these with the checker so any drawn instance is gradable.
 */
export const D2_PRACTICE_ITEMS: readonly FrozenItem[] = [
  ...D2_PRACTICE_POOL,
  ...D2_PRACTICE_VARIANTS,
];

/**
 * Build a randomized five-slot practice set for a D2 node: the locked 1xL1 / 2xL2 / 2xL3
 * mix in easy-to-hard order, each slot drawn from all registered instances for its
 * (node, difficulty) so the opening problems vary run to run. Picks within a difficulty
 * are distinct AND spread across the cell's problem SHAPES before repeating one, so a
 * two-slot cell holding two shapes serves both instead of the same shape twice with
 * different numbers. Every returned item is a member of {@link D2_PRACTICE_ITEMS} (so
 * already registered and gradable).
 */
export function buildRandomizedD2PracticeSet(
  nodeId: string = EXP1_NODE,
  rng: () => number = Math.random,
): FrozenItem[] {
  return buildRandomizedSetByShape(
    D2_PRACTICE_ITEMS,
    nodeId,
    D2_PRACTICE_MIX,
    rng,
    (difficulty, need, have) =>
      `not enough D2 practice instances for ${nodeId} L${difficulty}: need ${need}, have ${have}`,
  );
}

/** The canonical five-slot practice set (1×L1/2×L2/2×L3) for a D2 node. */
export function getD2PracticeSet(nodeId: string = EXP1_NODE): FrozenItem[] {
  return D2_PRACTICE_POOL.filter((item) => item.node_id === nodeId);
}

/**
 * Draw a fresh D2 practice instance for a (node, difficulty) cell, distinct from every
 * id in `avoid` (the reveal→retry one-liner). Searches the full registrable set
 * (`D2_PRACTICE_ITEMS` = pool ∪ variants). Prefers an unused instance of the same shape
 * (`templateId`) when given, and within that shape one whose ANSWER the reveal has NOT
 * just shown, so a retry cannot hand back the value the learner was given. Returns `undefined`
 * if the cell is exhausted.
 *
 * The answer preference is {@link drawRetryInstance}, shared with every domain. It is a
 * preference and never a constraint, so a cell whose answers are genuinely exhausted still
 * fills its retry rather than hiding the button.
 */
export function drawD2PracticeInstance(
  nodeId: string,
  difficulty: ItemDifficulty,
  opts: { avoid?: Iterable<string>; templateId?: string } = {},
): FrozenItem | undefined {
  return drawRetryInstance(D2_PRACTICE_ITEMS, { nodeId, difficulty }, opts);
}
