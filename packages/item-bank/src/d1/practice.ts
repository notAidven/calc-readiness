import type { D1NodeId } from "@cr/components";

import { hashItemDefinition, type ItemDifficulty } from "../schema";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "../template";
import { num2_l1, num2_l2b, num2_l3b } from "./nodes/NUM.2";
import { num3_l1b, num3_l2b, num3_l2c, num3_l3, num3_l3b } from "./nodes/NUM.3";
import { num4_l1, num4_l2b, num4_l3b } from "./nodes/NUM.4";
import { num5_l1, num5_l2b, num5_l3b } from "./nodes/NUM.5";
import { numF_l2b, numF_l3, numF_l3b } from "./nodes/NUM.F";
import { numS_l1b, numS_l2b, numS_l2c, numS_l3, numS_l3b } from "./nodes/NUM.S";
import { D1_TEMPLATES } from "./templates";

/**
 * Practice-only templates that fill the difficulty tiers the diagnostic spec does
 * NOT serve, so every masterable node has a full L1/L2/L3 ramp for lesson practice
 * (the diagnostic serves L1 only on the roots and L3 only on the higher-tier nodes;
 * see `templates.ts`). These are never frozen into the assessment forms A/B — only
 * into the practice pool below. The per-cell generators live under `nodes/<NODE>/`;
 * this file AGGREGATES them (order preserved so the frozen practice pool below is
 * byte-identical).
 */
export const D1_PRACTICE_ONLY_TEMPLATES: readonly ItemTemplate[] = [
  num2_l1,
  num4_l1,
  num5_l1,
  numS_l3,
  numF_l3,
  num3_l3,
];

/**
 * New problem shapes that share a cell with an existing template. These share a
 * (node, difficulty) cell with a diagnostic/practice-only template, so
 * `buildD1PracticePool` distributes a 2-instance slot round-robin across both
 * shapes — a lesson set then surfaces two different-looking problems for that tier.
 * The per-cell generators live under `nodes/<NODE>/`; distributed round-robin by
 * `buildD1PracticePool`.
 */
export const D1_EXTRA_PRACTICE_TEMPLATES: readonly ItemTemplate[] = [
  numS_l1b,
  numS_l2b,
  numS_l2c,
  numF_l2b,
  num2_l3b,
  num3_l1b,
  num3_l2b,
  num3_l2c,
  num4_l2b,
  num5_l2b,
  // The six shapes that closed the last single-shape two-slot cells, one per node.
  // Until these landed, every node had one L2 or L3 cell holding a single shape, so
  // all six of a learner's FIRST practice sets showed one problem shape twice with
  // only the numbers swapped. Appended after the ten above so each keeps slot 0 of
  // its cell and only the second slot's content moves.
  num2_l2b,
  numS_l3b,
  numF_l3b,
  num3_l3b,
  num4_l3b,
  num5_l3b,
];

/**
 * The full template pool used for lesson practice: the diagnostic templates, the
 * practice-only fillers that complete each L1/L2/L3 ramp, and the extra alternate
 * shapes. Every cell the mix gives TWO slots (L2 and L3 on all six nodes) now holds
 * at least two shapes, so no practice set can serve one shape twice; the one-slot L1
 * cells may hold a single shape. `d1.test.ts` is where that is asserted over the grid.
 */
export const D1_PRACTICE_TEMPLATES: readonly ItemTemplate[] = [
  ...D1_TEMPLATES,
  ...D1_PRACTICE_ONLY_TEMPLATES,
  ...D1_EXTRA_PRACTICE_TEMPLATES,
];

/** D1 masterable nodes, in city/lesson order. */
export const D1_PRACTICE_NODES: readonly D1NodeId[] = [
  "NUM.S",
  "NUM.F",
  "NUM.2",
  "NUM.3",
  "NUM.4",
  "NUM.5",
];

/**
 * The locked per-node practice mix (content/items/d1/README): a five-slot set of
 * 1×L1, 2×L2, 2×L3 — matching `PRACTICE_SET_SIZE` and giving each lesson an
 * easy→hard ramp.
 */
export const D1_PRACTICE_MIX: readonly { difficulty: ItemDifficulty; count: number }[] = [
  { difficulty: 1, count: 1 },
  { difficulty: 2, count: 2 },
  { difficulty: 3, count: 2 },
];

const PRACTICE_SEED_BASE = 5000;

/**
 * Freeze the D1 practice pool deterministically: for each node, `D1_PRACTICE_MIX`
 * instances per difficulty from the matching template, tagged `form: "practice"`.
 * A distinctness guard bumps the seed until each item's content is unique both
 * within the pool AND against `avoidHashes` (the frozen assessment items), so no
 * authored item is ever shared between a practice and an assessment pool.
 */
export function buildD1PracticePool(avoidHashes: Iterable<string> = []): FrozenItem[] {
  // A cell may now hold more than one problem SHAPE (template). Collect them in
  // stable list order so the round-robin distribution below is deterministic.
  const byCell = new Map<string, ItemTemplate[]>();
  for (const template of D1_PRACTICE_TEMPLATES) {
    const key = `${template.node_id}:L${template.difficulty}`;
    const templates = byCell.get(key) ?? [];
    templates.push(template);
    byCell.set(key, templates);
  }

  const used = new Set<string>(avoidHashes);
  const pool: FrozenItem[] = [];
  let seed = PRACTICE_SEED_BASE;

  for (const node of D1_PRACTICE_NODES) {
    for (const { difficulty, count } of D1_PRACTICE_MIX) {
      const templates = byCell.get(`${node}:L${difficulty}`);
      if (!templates?.length) {
        throw new Error(`no practice template for ${node} L${difficulty}`);
      }
      for (let index = 0; index < count; index += 1) {
        // Round-robin across the cell's shapes, so a 2-slot cell with 2 shapes
        // serves one of each (and a 1-shape cell behaves exactly as before).
        const template = templates[index % templates.length] as ItemTemplate;
        let candidate = generateFromTemplate(template, "practice", seed);
        for (
          let attempt = 0;
          attempt < 100 && used.has(hashItemDefinition(candidate));
          attempt += 1
        ) {
          seed += 1;
          candidate = generateFromTemplate(template, "practice", seed);
        }
        used.add(hashItemDefinition(candidate));
        pool.push(candidate);
        seed += 1;
      }
    }
  }

  return pool;
}

/**
 * How many distinct number-swapped variants to pre-generate per (node, difficulty)
 * cell for reveal→retry replacements. It is bounded on purpose: the global answer
 * checker is configured once with a fixed item set (`configureAnswerChecker`), so
 * every instance a lesson can show must be registered up front — retries draw from
 * this pre-built, registered set rather than generating unregistered items on the
 * fly. Cells with a tiny parameter space (e.g. NUM.F L1 = `1/d + 1/d`) yield fewer.
 */
export const D1_PRACTICE_RETRY_VARIANTS_PER_CELL = 6;

const VARIANT_SEED_BASE = 7000;

/**
 * Pre-generate up to `perCell` distinct number-swapped variants for every cell in
 * the full practice grid — the retry/replacement pool. Deterministic; each variant
 * is distinct from the others and from `avoidHashes` (pass the assessment + canonical
 * practice-pool hashes so a retry never duplicates an already-served item). Register
 * the result with the checker (`toD1ItemVersions` → `createD1AnswerChecker`) so any
 * drawn instance is gradable. A cell stops early once its parameter space is
 * exhausted, so small cells simply yield fewer than `perCell`.
 */
export function buildD1PracticeVariants(
  perCell = D1_PRACTICE_RETRY_VARIANTS_PER_CELL,
  avoidHashes: Iterable<string> = [],
): FrozenItem[] {
  const used = new Set<string>(avoidHashes);
  const variants: FrozenItem[] = [];
  let seed = VARIANT_SEED_BASE;

  for (const template of D1_PRACTICE_TEMPLATES) {
    let made = 0;
    let misses = 0;
    while (made < perCell && misses < 200) {
      const candidate = generateFromTemplate(template, "practice", seed);
      seed += 1;
      const hash = hashItemDefinition(candidate);
      if (used.has(hash)) {
        misses += 1;
        continue;
      }
      used.add(hash);
      variants.push(candidate);
      made += 1;
      misses = 0;
    }
  }

  return variants;
}
