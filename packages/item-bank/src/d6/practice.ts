import { buildRandomizedSetByShape, drawRetryInstance } from "../practiceSelect";
import { hashItemDefinition, type ItemDifficulty } from "../schema";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "../template";
import { CG1_NODE, CG1_TEMPLATES } from "./nodes/CG.1";
import { FUN1_NODE, FUN1_TEMPLATES } from "./nodes/FUN.1";
import { FUN2_NODE, FUN2_TEMPLATES } from "./nodes/FUN.2";
import { FUN3_NODE, FUN3_TEMPLATES } from "./nodes/FUN.3";
import { FUN4_NODE, FUN4_TEMPLATES } from "./nodes/FUN.4";
import { FUN5_NODE, FUN5_TEMPLATES } from "./nodes/FUN.5";
import { FUN6_NODE, FUN6_TEMPLATES } from "./nodes/FUN.6";
import { FUN7_NODE, FUN7_TEMPLATES } from "./nodes/FUN.7";
import { FUN8_NODE, FUN8_TEMPLATES } from "./nodes/FUN.8";
import { FUN9_NODE, FUN9_TEMPLATES } from "./nodes/FUN.9";
import { FUN10_NODE, FUN10_TEMPLATES } from "./nodes/FUN.10";

/**
 * The frozen D6 ("The Gearwright's Menagerie", the automata-workshop island) practice pool:
 * one five-slot lesson-practice pool per node, mirroring the D5 and D7 pools' shape. Each
 * node composes the locked 1xL1 / 2xL2 / 2xL3 mix, with two distinct problem SHAPES at each
 * of L2 and L3 so a five-slot set reshuffles without repeating.
 *
 * It is a SEPARATE, additive pool: it never touches the already-frozen CG.1 and FUN.1
 * product ASSESSMENT items under `product/nodes/`, which keep different template ids and
 * distinct problems, nor the FUN.4 / FUN.9 DIAGNOSTIC slices in `graph/slices.ts`.
 *
 * ## A node with no templates yet is SKIPPED, not fatal
 *
 * This is the one place D6 departs from `d5/practice.ts`, and it is deliberate. All 11 node
 * slots are declared below from the day the domain is scaffolded, so 11 authoring agents can
 * fill in their own `nodes/<NODE>/index.ts` without any of them editing this file. D5's
 * `buildPool` THROWS on a `(node, difficulty)` cell with no template, which at import time
 * would take down every consumer of `@cr/item-bank` for as long as one slot stayed empty.
 *
 * So the pool is built over the nodes that actually have templates. The throw is kept for a
 * node that has SOME templates but is missing a difficulty cell, because that is an
 * authoring error rather than an unstarted node. What stops an unstarted node reaching a
 * learner is `lessonDomains.reachability.test.ts`: the moment `content/lessons/d6/<NODE>.json`
 * exists, that node must build a full gradable set or the suite fails.
 */

/**
 * D6 practice nodes, in PREREQ order: the plane first, then the function-machine chain
 * (notation, domain/range, composition, rate of change, piecewise, inverse), then the
 * graph-reading nodes that need the plane, and the item-family node last.
 */
export const D6_PRACTICE_NODES: readonly string[] = [
  CG1_NODE,
  FUN1_NODE,
  FUN2_NODE,
  FUN7_NODE,
  FUN5_NODE,
  FUN3_NODE,
  FUN8_NODE,
  FUN4_NODE,
  FUN9_NODE,
  FUN10_NODE,
  FUN6_NODE,
];

/**
 * Every D6 practice template, aggregated in stable node order (CG.1 first). The per-node
 * generators live under `nodes/<NODE>/`; this file only concatenates them, so the frozen
 * pool below is deterministic.
 */
export const D6_PRACTICE_TEMPLATES: readonly ItemTemplate[] = [
  ...CG1_TEMPLATES,
  ...FUN1_TEMPLATES,
  ...FUN2_TEMPLATES,
  ...FUN7_TEMPLATES,
  ...FUN5_TEMPLATES,
  ...FUN3_TEMPLATES,
  ...FUN8_TEMPLATES,
  ...FUN4_TEMPLATES,
  ...FUN9_TEMPLATES,
  ...FUN10_TEMPLATES,
  ...FUN6_TEMPLATES,
];

/** The D6 practice mix: the same five-slot 1xL1 / 2xL2 / 2xL3 shape as D5 and D7. */
export const D6_PRACTICE_MIX: readonly { difficulty: ItemDifficulty; count: number }[] = [
  { difficulty: 1, count: 1 },
  { difficulty: 2, count: 2 },
  { difficulty: 3, count: 2 },
];

/** Group the practice templates by (node, difficulty) cell, in stable list order. */
function templatesByCell(): Map<string, ItemTemplate[]> {
  const byCell = new Map<string, ItemTemplate[]>();
  for (const template of D6_PRACTICE_TEMPLATES) {
    const key = `${template.node_id}:L${template.difficulty}`;
    const templates = byCell.get(key) ?? [];
    templates.push(template);
    byCell.set(key, templates);
  }
  return byCell;
}

/**
 * The declared nodes that have at least one template, in declaration order. An unstarted
 * node contributes nothing to the pool instead of throwing (see the header).
 */
function authoredNodes(): readonly string[] {
  const started = new Set(D6_PRACTICE_TEMPLATES.map((template) => template.node_id));
  return D6_PRACTICE_NODES.filter((node) => started.has(node));
}

/** Nodes whose practice pool is authored and therefore servable today. */
export const D6_AUTHORED_PRACTICE_NODES: readonly string[] = authoredNodes();

// Seed bases disjoint from every other pool (D1 1000/2000/5000/7000/10000/20000, the
// interactive demo pool 42000/43000, D2 60000/61000, D5 70000/71000, D7 80000/81000,
// D8 90000/91000, the product forms 100000/200000, D3 110000/111000, D4 120000/121000 and
// D10 130000/131000) so no frozen id or content collides across pools.
const PRACTICE_SEED_BASE = 140_000;
const VARIANT_SEED_BASE = 141_000;

/** Retry/replacement variants per (node, difficulty) cell: the reveal-to-retry draw pool. */
export const D6_PRACTICE_RETRY_VARIANTS_PER_CELL = 6;

/**
 * Freeze the canonical five-slot practice pool for every AUTHORED D6 node: the locked mix
 * per node, each cell drawn round-robin across its problem SHAPES from a single continuous
 * seed. A distinctness guard bumps the seed until each item's content is unique in the pool
 * AND against `avoidHashes`, and until its `varietyKey` is unused in THIS cell, so a cell
 * never freezes two items that reduce to the same answer.
 */
function buildPool(avoidHashes: Iterable<string> = []): FrozenItem[] {
  const byCell = templatesByCell();
  const used = new Set<string>(avoidHashes);
  const pool: FrozenItem[] = [];
  let seed = PRACTICE_SEED_BASE;
  for (const node of D6_AUTHORED_PRACTICE_NODES) {
    for (const { difficulty, count } of D6_PRACTICE_MIX) {
      const templates = byCell.get(`${node}:L${difficulty}`);
      if (!templates?.length) {
        throw new Error(`no D6 practice template for ${node} L${difficulty}`);
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
  for (const template of D6_PRACTICE_TEMPLATES) {
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

/** The canonical five-slot-per-node D6 practice pool. */
export const D6_PRACTICE_POOL: readonly FrozenItem[] = buildPool();

/** Retry/replacement variants, distinct from the canonical pool. */
export const D6_PRACTICE_VARIANTS: readonly FrozenItem[] = buildVariants(
  D6_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D6_PRACTICE_POOL.map(hashItemDefinition),
);

/**
 * Every registrable D6 practice instance (canonical pool + retry variants). Register these
 * with the checker so any drawn instance is gradable.
 */
export const D6_PRACTICE_ITEMS: readonly FrozenItem[] = [
  ...D6_PRACTICE_POOL,
  ...D6_PRACTICE_VARIANTS,
];

/**
 * Build a randomized five-slot practice set for a D6 node: the locked 1xL1 / 2xL2 / 2xL3
 * mix in easy-to-hard order, each slot drawn from all registered instances for its
 * (node, difficulty) so the opening problems vary run to run. Picks within a difficulty are
 * distinct AND spread across the cell's problem SHAPES before repeating one. Every returned
 * item is a member of {@link D6_PRACTICE_ITEMS} (so already registered and gradable).
 */
export function buildRandomizedD6PracticeSet(
  nodeId: string = CG1_NODE,
  rng: () => number = Math.random,
): FrozenItem[] {
  return buildRandomizedSetByShape(
    D6_PRACTICE_ITEMS,
    nodeId,
    D6_PRACTICE_MIX,
    rng,
    (difficulty, need, have) =>
      `not enough D6 practice instances for ${nodeId} L${difficulty}: need ${need}, have ${have}`,
  );
}

/** The canonical five-slot practice set (1xL1/2xL2/2xL3) for a D6 node. */
export function getD6PracticeSet(nodeId: string = CG1_NODE): FrozenItem[] {
  return D6_PRACTICE_POOL.filter((item) => item.node_id === nodeId);
}

/**
 * Draw a fresh D6 practice instance for a (node, difficulty) cell, distinct from every id
 * in `avoid` (the reveal to retry one-liner). Searches the full registrable set
 * (`D6_PRACTICE_ITEMS` = pool ∪ variants). Prefers an unused instance of the same shape
 * (`templateId`) when given, and within that shape one whose ANSWER the reveal has NOT
 * just shown, so a retry cannot hand back the value the learner was given. Returns `undefined`
 * if the cell is exhausted.
 *
 * The answer preference is {@link drawRetryInstance}, shared with every domain. It is a
 * preference and never a constraint, so a cell whose answers are genuinely exhausted still
 * fills its retry rather than hiding the button.
 */
export function drawD6PracticeInstance(
  nodeId: string,
  difficulty: ItemDifficulty,
  opts: { avoid?: Iterable<string>; templateId?: string } = {},
): FrozenItem | undefined {
  return drawRetryInstance(D6_PRACTICE_ITEMS, { nodeId, difficulty }, opts);
}
