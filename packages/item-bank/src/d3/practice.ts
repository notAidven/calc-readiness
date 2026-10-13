import { buildRandomizedSetByShape, drawRetryInstance } from "../practiceSelect";
import { hashItemDefinition, type ItemDifficulty } from "../schema";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "../template";
import { LIN1_NODE, LIN1_TEMPLATES } from "./nodes/LIN.1";
import { LIN3_NODE, LIN3_TEMPLATES } from "./nodes/LIN.3";
import { LIN4_NODE, LIN4_TEMPLATES } from "./nodes/LIN.4";
import { LIN5_NODE, LIN5_TEMPLATES } from "./nodes/LIN.5";
import { LIN6_NODE, LIN6_TEMPLATES } from "./nodes/LIN.6";

/**
 * The frozen D3 (Linear Equations, Inequalities & Absolute Value) practice pool: one five-slot
 * lesson-practice pool per node, mirroring the D1, D2, D5, D7 and D8 pools' shape. Each node
 * composes the locked 1xL1 / 2xL2 / 2xL3 mix, with two distinct problem SHAPES at each of L2 and
 * L3 so a five-slot set reshuffles without repeating a question.
 *
 * It is a SEPARATE, additive pool. It never touches the already-frozen LIN.1 product ASSESSMENT
 * item (`prod.lin-1.l2`), which keeps its own template id and its own content, nor the LIN.5 and
 * LIN.6 golden anchors (`prod.golden.lin-5.*`, `prod.golden.lin-6.*`), which are checker fixtures
 * and are never served.
 *
 * ## Which nodes are here, and which is deliberately absent
 *
 * The domain's live node set is LIN.1, LIN.3, LIN.4, LIN.5 and LIN.6, read from
 * `packages/skill-graph/src/skill_graph.json`. **LIN.2 is absent because it is RETIRED**: the
 * registry records `status: "retired"`, `product_scope: "excluded"` and the note "rational
 * equations moved to RAT.6", so the skill it used to name is authored in D5 and the id is
 * permanently dead. Its absence is asserted in `d3.test.ts` so it stays a recorded decision
 * rather than something that looks like an oversight.
 *
 * ## Answer shapes, and the one node whose skill this pool measures indirectly
 *
 * Every shape is text-graded through the v2 product checker, in the type its own question calls
 * for: a weight or a count is `numeric`, "solve for x" answers as a `solution_set`, a solved
 * inequality answers as an `interval`, and one LIN.6 shape answers in `set_builder` because
 * writing that form is itself its graded skill.
 *
 * **LIN.3 is the exception and it is a measured limitation, not a choice.** The natural answer to
 * "rearrange this rule" is the rearranged rule, and the v2 checker cannot grade a multi-variable
 * expression at all: its comparator reads the numerator of a `math.rationalize` difference, which
 * does not cancel over several names, so such a key fails against ITSELF as `value_mismatch`. A
 * name in a denominator is refused earlier as `unsupported_symbolic_denominator`. So LIN.3's five
 * shapes state the rule, give every quantity but one, and ask for the missing one as a number:
 * the rearrangement is the method and the number is the report. `nodes/LIN.3/index.ts` records the
 * full measurement and the two other routes that were tried.
 *
 * ## The variety guard is enforced here
 *
 * Every D3 template declares a `varietyKey` over the numbers that fix its instance, and both
 * freezers below honour it. Content-hash distinctness alone would let two instances that reduce to
 * the same question sit in one cell, which matters in this domain because several shapes reach the
 * same bounded interval from different rules.
 */

/** D3 practice nodes, in lesson order. LIN.2 is retired and is not one of them. */
export const D3_PRACTICE_NODES: readonly string[] = [
  LIN1_NODE,
  LIN3_NODE,
  LIN4_NODE,
  LIN5_NODE,
  LIN6_NODE,
];

/**
 * Every D3 practice template, aggregated in stable node order (LIN.1 first). The per-node
 * generators live under `nodes/<NODE>/`; this file only concatenates them, so the frozen pool
 * below is deterministic.
 */
export const D3_PRACTICE_TEMPLATES: readonly ItemTemplate[] = [
  ...LIN1_TEMPLATES,
  ...LIN3_TEMPLATES,
  ...LIN4_TEMPLATES,
  ...LIN5_TEMPLATES,
  ...LIN6_TEMPLATES,
];

/** The D3 practice mix: the same five-slot 1xL1 / 2xL2 / 2xL3 shape as every other pool. */
export const D3_PRACTICE_MIX: readonly { difficulty: ItemDifficulty; count: number }[] = [
  { difficulty: 1, count: 1 },
  { difficulty: 2, count: 2 },
  { difficulty: 3, count: 2 },
];

/** Group the practice templates by (node, difficulty) cell, in stable list order. */
function templatesByCell(): Map<string, ItemTemplate[]> {
  const byCell = new Map<string, ItemTemplate[]>();
  for (const template of D3_PRACTICE_TEMPLATES) {
    const key = `${template.node_id}:L${template.difficulty}`;
    const templates = byCell.get(key) ?? [];
    templates.push(template);
    byCell.set(key, templates);
  }
  return byCell;
}

// Seed bases disjoint from D1 (1000/2000/5000/7000/10000/20000), the interactive demo pool
// (42000/43000), D2 (60000/61000), D5 (70000/71000), D7 (80000/81000), D8 (90000/91000) and the
// PRODUCT walk (100000/200000), so no frozen id or content collides across pools.
const PRACTICE_SEED_BASE = 110_000;
const VARIANT_SEED_BASE = 111_000;

/** Retry/replacement variants per (node, difficulty) cell: the reveal-to-retry draw pool. */
export const D3_PRACTICE_RETRY_VARIANTS_PER_CELL = 6;

/**
 * Freeze the canonical five-slot practice pool for every D3 node: the locked mix per node, each
 * cell drawn round-robin across its problem SHAPES from a single continuous seed. A distinctness
 * guard bumps the seed until each item's content is unique in the pool AND against `avoidHashes`,
 * and until its `varietyKey` is unused in THIS cell, so a cell never freezes two items that reduce
 * to the same question.
 */
function buildPool(avoidHashes: Iterable<string> = []): FrozenItem[] {
  const byCell = templatesByCell();
  const used = new Set<string>(avoidHashes);
  const pool: FrozenItem[] = [];
  let seed = PRACTICE_SEED_BASE;
  for (const node of D3_PRACTICE_NODES) {
    for (const { difficulty, count } of D3_PRACTICE_MIX) {
      const templates = byCell.get(`${node}:L${difficulty}`);
      if (!templates?.length) {
        throw new Error(`no D3 practice template for ${node} L${difficulty}`);
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
 * Pre-generate up to `perCell` distinct number-swapped variants per template: the reveal-to-retry
 * replacement pool. Deterministic; each variant is distinct in content from the others and from
 * `avoidHashes`, and distinct in `varietyKey` from the other variants of ITS template, so a retry
 * never hands back the same answer in new clothes.
 */
function buildVariants(perCell: number, avoidHashes: Iterable<string> = []): FrozenItem[] {
  const used = new Set<string>(avoidHashes);
  const variants: FrozenItem[] = [];
  let seed = VARIANT_SEED_BASE;
  for (const template of D3_PRACTICE_TEMPLATES) {
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

/** The canonical five-slot-per-node D3 practice pool. */
export const D3_PRACTICE_POOL: readonly FrozenItem[] = buildPool();

/** Retry/replacement variants, distinct from the canonical pool. */
export const D3_PRACTICE_VARIANTS: readonly FrozenItem[] = buildVariants(
  D3_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D3_PRACTICE_POOL.map(hashItemDefinition),
);

/**
 * Every registrable D3 practice instance (canonical pool + retry variants). Register these with
 * the checker so any drawn instance is gradable.
 */
export const D3_PRACTICE_ITEMS: readonly FrozenItem[] = [
  ...D3_PRACTICE_POOL,
  ...D3_PRACTICE_VARIANTS,
];

/**
 * Build a randomized five-slot practice set for a D3 node: the locked 1xL1 / 2xL2 / 2xL3 mix in
 * easy-to-hard order, each slot drawn from all registered instances for its (node, difficulty) so
 * the opening problems vary run to run. Picks within a difficulty are distinct AND spread across
 * the cell's problem SHAPES before repeating one. Every returned item is a member of
 * {@link D3_PRACTICE_ITEMS} (so already registered and gradable).
 */
export function buildRandomizedD3PracticeSet(
  nodeId: string = LIN1_NODE,
  rng: () => number = Math.random,
): FrozenItem[] {
  return buildRandomizedSetByShape(
    D3_PRACTICE_ITEMS,
    nodeId,
    D3_PRACTICE_MIX,
    rng,
    (difficulty, need, have) =>
      `not enough D3 practice instances for ${nodeId} L${difficulty}: need ${need}, have ${have}`,
  );
}

/** The canonical five-slot practice set (1xL1/2xL2/2xL3) for a D3 node. */
export function getD3PracticeSet(nodeId: string = LIN1_NODE): FrozenItem[] {
  return D3_PRACTICE_POOL.filter((item) => item.node_id === nodeId);
}

/**
 * Draw a fresh D3 practice instance for a (node, difficulty) cell, distinct from every id in
 * `avoid` (the reveal to retry one-liner). Searches the full registrable set
 * (`D3_PRACTICE_ITEMS` = pool + variants). Prefers an unused instance of the same shape
 * (`templateId`) when given, and within that shape one whose ANSWER the reveal has NOT
 * just shown, so a retry cannot hand back the value the learner was given. Returns `undefined`
 * if the cell is exhausted.
 *
 * The answer preference is {@link drawRetryInstance}, shared with every domain. It is a
 * preference and never a constraint, so a cell whose answers are genuinely exhausted still
 * fills its retry rather than hiding the button.
 */
export function drawD3PracticeInstance(
  nodeId: string,
  difficulty: ItemDifficulty,
  opts: { avoid?: Iterable<string>; templateId?: string } = {},
): FrozenItem | undefined {
  return drawRetryInstance(D3_PRACTICE_ITEMS, { nodeId, difficulty }, opts);
}
