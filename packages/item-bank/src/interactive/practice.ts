import { drawRetryInstance } from "../practiceSelect";
import { hashItemDefinition, type ItemDifficulty } from "../schema";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "../template";
import {
  INTERACTIVE_DEMO_NODE,
  INTERACTIVE_TEMPLATES,
  nl_closed_interval_l2,
  nl_half_open_l3,
  nl_point_l1,
  nl_right_open_l3,
  nl_two_points_l2,
} from "./templates";

/**
 * The frozen `number_line` practice pool — the interactive analogue of the D1
 * practice pool, kept deliberately small (it is infrastructure proof, not shipped
 * content). It lives under the synthetic {@link INTERACTIVE_DEMO_NODE} and is NEVER
 * mixed into a real D1 node's practice. The five-slot composition mirrors the locked
 * lesson mix (1×L1 / 2×L2 / 2×L3), with two distinct problem SHAPES at each of L2 and
 * L3, so a five-slot set reshuffles without repeating.
 */

/** The interactive practice mix — same five-slot 1×L1 / 2×L2 / 2×L3 shape as D1. */
export const INTERACTIVE_PRACTICE_MIX: readonly {
  difficulty: ItemDifficulty;
  count: number;
}[] = [
  { difficulty: 1, count: 1 },
  { difficulty: 2, count: 2 },
  { difficulty: 3, count: 2 },
];

/** Each (difficulty) cell's problem shapes, in stable order for round-robin freezing. */
const CELL_TEMPLATES: Readonly<Record<number, readonly ItemTemplate[]>> = {
  1: [nl_point_l1],
  2: [nl_closed_interval_l2, nl_two_points_l2],
  3: [nl_half_open_l3, nl_right_open_l3],
};

const PRACTICE_SEED_BASE = 42_000;
const VARIANT_SEED_BASE = 43_000;

/** Retry/replacement variants per (difficulty) cell — the reveal→retry draw pool. */
export const INTERACTIVE_RETRY_VARIANTS_PER_CELL = 6;

function buildPool(avoidHashes: Iterable<string> = []): FrozenItem[] {
  const used = new Set<string>(avoidHashes);
  const pool: FrozenItem[] = [];
  let seed = PRACTICE_SEED_BASE;
  for (const { difficulty, count } of INTERACTIVE_PRACTICE_MIX) {
    const templates = CELL_TEMPLATES[difficulty];
    if (!templates?.length) {
      throw new Error(`no interactive practice template for L${difficulty}`);
    }
    for (let index = 0; index < count; index += 1) {
      const template = templates[index % templates.length] as ItemTemplate;
      let candidate = generateFromTemplate(template, "practice", seed);
      for (
        let attempt = 0;
        attempt < 200 && used.has(hashItemDefinition(candidate));
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
  return pool;
}

function buildVariants(perCell: number, avoidHashes: Iterable<string> = []): FrozenItem[] {
  const used = new Set<string>(avoidHashes);
  const variants: FrozenItem[] = [];
  let seed = VARIANT_SEED_BASE;
  for (const template of INTERACTIVE_TEMPLATES) {
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

/** The canonical five-slot interactive practice pool. */
export const INTERACTIVE_PRACTICE_POOL: readonly FrozenItem[] = buildPool();

/** Retry/replacement variants, distinct from the canonical pool. */
export const INTERACTIVE_PRACTICE_VARIANTS: readonly FrozenItem[] = buildVariants(
  INTERACTIVE_RETRY_VARIANTS_PER_CELL,
  INTERACTIVE_PRACTICE_POOL.map(hashItemDefinition),
);

/**
 * Every registrable interactive practice instance (canonical pool + retry variants).
 * Register these with the interactive checker so any drawn instance is gradable.
 */
export const INTERACTIVE_PRACTICE_ITEMS: readonly FrozenItem[] = [
  ...INTERACTIVE_PRACTICE_POOL,
  ...INTERACTIVE_PRACTICE_VARIANTS,
];

/** Fisher-Yates shuffle into a new array using the supplied RNG. */
function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

/**
 * Build a randomized five-slot interactive practice set: the locked 1×L1 / 2×L2 /
 * 2×L3 mix in easy→hard order, each slot drawn at random from all registered
 * instances for its difficulty so the opening problems vary run to run. Picks within
 * a difficulty are distinct. Every returned item is a member of
 * {@link INTERACTIVE_PRACTICE_ITEMS} (so already registered + gradable).
 */
export function buildRandomizedInteractivePracticeSet(
  rng: () => number = Math.random,
): FrozenItem[] {
  const set: FrozenItem[] = [];
  for (const { difficulty, count } of INTERACTIVE_PRACTICE_MIX) {
    const candidates = INTERACTIVE_PRACTICE_ITEMS.filter(
      (item) => item.difficulty === difficulty,
    );
    if (candidates.length < count) {
      throw new Error(
        `not enough interactive practice instances for L${difficulty}: need ${count}, have ${candidates.length}`,
      );
    }
    set.push(...shuffle(candidates, rng).slice(0, count));
  }
  return set;
}

/**
 * Draw a fresh interactive practice instance for a difficulty, distinct from every
 * id in `avoid` (the reveal→retry one-liner). Searches the full registrable set
 * (`INTERACTIVE_PRACTICE_ITEMS` = pool ∪ variants). Prefers an unused instance of the
 * same shape (`templateId`) when given, and within each tier one whose ANSWER the
 * reveal has not just shown. Returns `undefined` if the difficulty is exhausted.
 *
 * This pool has no node dimension — every instance sits under
 * {@link INTERACTIVE_DEMO_NODE}, which is why passing that node to the shared
 * {@link drawRetryInstance} selects the same candidates the difficulty filter did.
 * A widget item carries no `answer_key`, so the shared helper compares the
 * `interactive_spec` instead; two number-line specs that differ only in key order
 * still count as the same answer.
 */
export function drawInteractivePracticeInstance(
  difficulty: ItemDifficulty,
  opts: { avoid?: Iterable<string>; templateId?: string } = {},
): FrozenItem | undefined {
  return drawRetryInstance(
    INTERACTIVE_PRACTICE_ITEMS,
    { nodeId: INTERACTIVE_DEMO_NODE, difficulty },
    opts,
  );
}

/** The interactive demo node id (re-exported for callers building a session). */
export { INTERACTIVE_DEMO_NODE };
