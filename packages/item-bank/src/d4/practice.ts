import { buildRandomizedSetByShape, drawRetryInstance } from "../practiceSelect";
import { hashItemDefinition, type ItemDifficulty } from "../schema";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "../template";
import { POL1_NODE, POL1_TEMPLATES } from "./nodes/POL.1";
import { POL2_NODE, POL2_TEMPLATES } from "./nodes/POL.2";
import { POL3_NODE, POL3_TEMPLATES } from "./nodes/POL.3";
import { POL4_NODE, POL4_TEMPLATES } from "./nodes/POL.4";
import { POL5_NODE, POL5_TEMPLATES } from "./nodes/POL.5";
import { POL6_NODE, POL6_TEMPLATES } from "./nodes/POL.6";
import { POL7_NODE, POL7_TEMPLATES } from "./nodes/POL.7";
import { POL8_NODE, POL8_TEMPLATES } from "./nodes/POL.8";

/**
 * The frozen D4 (Polynomials & Quadratics) practice pool: one five-slot lesson-practice pool
 * per node, mirroring the D1, D2, D3, D5, D7 and D8 pools' shape. Each node composes the
 * locked 1xL1 / 2xL2 / 2xL3 mix, with two distinct problem SHAPES at each of L2 and L3 so a
 * five-slot set reshuffles without repeating a question.
 *
 * It is a SEPARATE, additive pool. It never touches the already-frozen POL.1 and POL.2 product
 * ASSESSMENT items (`prod.pol-1.l2`, `prod.pol-2.l2`) or their golden fixtures, which keep
 * their own template ids and their own content.
 *
 * ## Which nodes are here: all eight, across three eras
 *
 * The Polynomials domain holds eight live nodes and this pool now serves ALL of them: POL.1,
 * POL.2, POL.3, POL.4 and POL.8 from the Classical era, POL.6 and POL.7 from Early Modern, and
 * POL.5 from the Industrial era. It is no longer one era's worth of a domain that spans three,
 * and the reason it grew is a placement one rather than a content one: the diagnostic's
 * placement horizon stops at the first era it cannot fully serve (`diagnostic-scope.ts`), and
 * each of these three was the last node with no authored content in an era nobody could
 * therefore be handed. POL.6 and POL.7 took the horizon from the sixth era to the seventh;
 * POL.5 was the seventh era's own remainder and the last such node in the product.
 *
 * A directory named after a DOMAIN holding three eras' worth of nodes is a file-layout fact
 * rather than a design one, and `d4.test.ts` asserts the era spread so it reads as one.
 * Authoring these three outside their nominal owner is covered by
 * `docs/Content_Authoring_Split.md` §11.4, which lets the lead take content work on capacity;
 * §10.4's assignment of POL.6 and POL.7 to Anthony is what that overrides.
 *
 * ## Answer shapes
 *
 * Every shape is text-graded through the v2 product checker, in the type its own question
 * calls for: a polynomial that has been expanded or divided out answers as an `expression`
 * under `is_standard_polynomial`, a factored form answers as an `expression` under
 * `fully_factored_over_integers`, "solve" answers as a `solution_set`, and a remainder, a
 * discriminant or a completing constant answers as a plain `numeric`.
 *
 * Two authoring constraints were MEASURED against the real checker rather than assumed, and
 * both shape what this pool can ask:
 *
 *  - **A two-variable key cannot be graded.** `x^2 + 6xy + 9y^2` is refused `unknown_symbol`
 *    (two adjacent letters read as one symbol) and `x^2 + 6*x*y + 9*y^2` grades
 *    `not_simplified`, because `is_standard_polynomial` orders one variable. POL.1's
 *    multivariable shape therefore asks for the cross term's COEFFICIENT, which is a number.
 *  - **A monomial common factor cannot be typed.** A key of `3*x*(x - 4)` needs its stars, and
 *    a learner writing the natural `3x(x - 4)` is refused `invalid_input / unsupported_syntax`.
 *    POL.2's L1 shape therefore takes a NUMERIC common factor, whose key reads without a star.
 *
 * ## The variety guard is enforced here
 *
 * Every D4 template declares a `varietyKey` over the numbers that fix its instance, and both
 * freezers below honour it. Content-hash distinctness alone would let two instances that
 * reduce to the same question sit in one cell, which matters here because several shapes reach
 * the same root pair from different equations.
 */

/**
 * D4 practice nodes: the Classical era's five, then the two Early Modern graph-reading nodes,
 * then the Industrial era's one.
 *
 * **The order is load-bearing and every new node is APPENDED for that reason.** `buildPool`
 * walks this list on one running seed, so a node inserted among the existing ones would
 * re-freeze every pool slot behind it, and those items are already frozen in the bank.
 * Appended, everything before it keeps its exact seeds and the new node takes the seeds after
 * them. POL.5 goes last for the same reason POL.6 and POL.7 went after POL.8.
 */
export const D4_PRACTICE_NODES: readonly string[] = [
  POL1_NODE,
  POL2_NODE,
  POL3_NODE,
  POL4_NODE,
  POL8_NODE,
  POL6_NODE,
  POL7_NODE,
  POL5_NODE,
];

/**
 * Every D4 practice template, aggregated in stable node order (POL.1 first). The per-node
 * generators live under `nodes/<NODE>/`; this file only concatenates them, so the frozen pool
 * below is deterministic.
 */
export const D4_PRACTICE_TEMPLATES: readonly ItemTemplate[] = [
  ...POL1_TEMPLATES,
  ...POL2_TEMPLATES,
  ...POL3_TEMPLATES,
  ...POL4_TEMPLATES,
  ...POL8_TEMPLATES,
  // Appended after the Classical era's five for the same reason `D4_PRACTICE_NODES` is:
  // `buildVariants` walks this list on one running seed, so anything inserted ahead of a
  // template re-seeds every retry variant behind it.
  ...POL6_TEMPLATES,
  ...POL7_TEMPLATES,
  ...POL5_TEMPLATES,
];

/** The D4 practice mix: the same five-slot 1xL1 / 2xL2 / 2xL3 shape as every other pool. */
export const D4_PRACTICE_MIX: readonly { difficulty: ItemDifficulty; count: number }[] = [
  { difficulty: 1, count: 1 },
  { difficulty: 2, count: 2 },
  { difficulty: 3, count: 2 },
];

/** Group the practice templates by (node, difficulty) cell, in stable list order. */
function templatesByCell(): Map<string, ItemTemplate[]> {
  const byCell = new Map<string, ItemTemplate[]>();
  for (const template of D4_PRACTICE_TEMPLATES) {
    const key = `${template.node_id}:L${template.difficulty}`;
    const templates = byCell.get(key) ?? [];
    templates.push(template);
    byCell.set(key, templates);
  }
  return byCell;
}

// Seed bases disjoint from D1 (1000/2000/5000/7000/10000/20000), the interactive demo pool
// (42000/43000), D2 (60000/61000), D5 (70000/71000), D7 (80000/81000), D8 (90000/91000), D3
// (110000/111000) and the PRODUCT walk (100000/200000), so no frozen id or content collides
// across pools.
const PRACTICE_SEED_BASE = 120_000;
const VARIANT_SEED_BASE = 121_000;

/** Retry/replacement variants per (node, difficulty) cell: the reveal-to-retry draw pool. */
export const D4_PRACTICE_RETRY_VARIANTS_PER_CELL = 6;

/**
 * Freeze the canonical five-slot practice pool for every D4 node: the locked mix per node, each
 * cell drawn round-robin across its problem SHAPES from a single continuous seed. A distinctness
 * guard bumps the seed until each item's content is unique in the pool AND against `avoidHashes`,
 * and until its `varietyKey` is unused in THIS cell, so a cell never freezes two items that
 * reduce to the same question.
 */
function buildPool(avoidHashes: Iterable<string> = []): FrozenItem[] {
  const byCell = templatesByCell();
  const used = new Set<string>(avoidHashes);
  const pool: FrozenItem[] = [];
  let seed = PRACTICE_SEED_BASE;
  for (const node of D4_PRACTICE_NODES) {
    for (const { difficulty, count } of D4_PRACTICE_MIX) {
      const templates = byCell.get(`${node}:L${difficulty}`);
      if (!templates?.length) {
        throw new Error(`no D4 practice template for ${node} L${difficulty}`);
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
  for (const template of D4_PRACTICE_TEMPLATES) {
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

/** The canonical five-slot-per-node D4 practice pool. */
export const D4_PRACTICE_POOL: readonly FrozenItem[] = buildPool();

/** Retry/replacement variants, distinct from the canonical pool. */
export const D4_PRACTICE_VARIANTS: readonly FrozenItem[] = buildVariants(
  D4_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D4_PRACTICE_POOL.map(hashItemDefinition),
);

/**
 * Every registrable D4 practice instance (canonical pool + retry variants). Register these with
 * the checker so any drawn instance is gradable.
 */
export const D4_PRACTICE_ITEMS: readonly FrozenItem[] = [
  ...D4_PRACTICE_POOL,
  ...D4_PRACTICE_VARIANTS,
];

/**
 * Build a randomized five-slot practice set for a D4 node: the locked 1xL1 / 2xL2 / 2xL3 mix in
 * easy-to-hard order, each slot drawn from all registered instances for its (node, difficulty) so
 * the opening problems vary run to run. Picks within a difficulty are distinct AND spread across
 * the cell's problem SHAPES before repeating one. Every returned item is a member of
 * {@link D4_PRACTICE_ITEMS} (so already registered and gradable).
 */
export function buildRandomizedD4PracticeSet(
  nodeId: string = POL1_NODE,
  rng: () => number = Math.random,
): FrozenItem[] {
  return buildRandomizedSetByShape(
    D4_PRACTICE_ITEMS,
    nodeId,
    D4_PRACTICE_MIX,
    rng,
    (difficulty, need, have) =>
      `not enough D4 practice instances for ${nodeId} L${difficulty}: need ${need}, have ${have}`,
  );
}

/** The canonical five-slot practice set (1xL1/2xL2/2xL3) for a D4 node. */
export function getD4PracticeSet(nodeId: string = POL1_NODE): FrozenItem[] {
  return D4_PRACTICE_POOL.filter((item) => item.node_id === nodeId);
}

/**
 * Draw a fresh D4 practice instance for a (node, difficulty) cell, distinct from every id in
 * `avoid` (the reveal to retry one-liner). Searches the full registrable set
 * (`D4_PRACTICE_ITEMS` = pool + variants). Prefers an unused instance of the same shape
 * (`templateId`) when given, and within that shape one whose ANSWER the reveal has NOT
 * just shown, so a retry cannot hand back the value the learner was given. Returns `undefined`
 * if the cell is exhausted.
 *
 * The answer preference is {@link drawRetryInstance}, shared with every domain. It is a
 * preference and never a constraint, so a cell whose answers are genuinely exhausted still
 * fills its retry rather than hiding the button.
 */
export function drawD4PracticeInstance(
  nodeId: string,
  difficulty: ItemDifficulty,
  opts: { avoid?: Iterable<string>; templateId?: string } = {},
): FrozenItem | undefined {
  return drawRetryInstance(D4_PRACTICE_ITEMS, { nodeId, difficulty }, opts);
}
