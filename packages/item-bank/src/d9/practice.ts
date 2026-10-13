import { buildRandomizedSetByShape, drawRetryInstance } from "../practiceSelect";
import { hashItemDefinition, type ItemDifficulty } from "../schema";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "../template";
import { TRG1_NODE, TRG1_TEMPLATES } from "./nodes/TRG.1";
import { TRG2_NODE, TRG2_TEMPLATES } from "./nodes/TRG.2";
import { TRG3_NODE, TRG3_TEMPLATES } from "./nodes/TRG.3";
import { TRG4_NODE, TRG4_TEMPLATES } from "./nodes/TRG.4";
import { TRG5_NODE, TRG5_TEMPLATES } from "./nodes/TRG.5";
import { TRG6_NODE, TRG6_TEMPLATES } from "./nodes/TRG.6";
import { TRG7_EXTRA_TEMPLATES, TRG7_NODE, TRG7_TEMPLATES } from "./nodes/TRG.7";
import { TRG8_EXTRA_TEMPLATES, TRG8_NODE, TRG8_TEMPLATES } from "./nodes/TRG.8";
import { TRG9_NODE, TRG9_TEMPLATES } from "./nodes/TRG.9";

/**
 * The frozen D9 (Trigonometry) practice pool: one five-slot lesson-practice pool per node,
 * mirroring the D1, D2, D5, D7 and D8 pools' shape. Each node composes the locked
 * 1xL1 / 2xL2 / 2xL3 mix, with two distinct problem SHAPES at each of L2 and L3 so a
 * five-slot set reshuffles without repeating.
 *
 * It is a SEPARATE, additive pool: it never touches the already-frozen TRG.2 product
 * ASSESSMENT item, which keeps its own template id, its own multipart angle-to-value shape
 * and its own content. That distinction matters more here than in D8, because the product
 * item is graded by the assessment path and so is allowed answer shapes this pool is not
 * (see the multipart note below).
 *
 * ## What trigonometry could NOT ask, and why
 *
 * The domain plan's checker spike measured the answer grammar rather than inferring it, and
 * two limits shaped every node here.
 *
 * **No symbolic identity shape grades, anywhere.** The expression grammar has no
 * trigonometric functions in it, so a key containing `sin` does not grade even against
 * itself. "Rewrite the tangent using sine and cosine" and "verify this identity" are
 * therefore unauthorable, not merely discouraged. What replaces them throughout TRG.4, TRG.7
 * and TRG.9 is EVALUATION (here are the readings, give the one asked) and NAMING (which
 * family does this rewriting belong to), both of which grade exactly.
 *
 * **A roster or an interval cannot hold a pi.** So the radian/degree split is deliberate and
 * runs the length of the domain: a SINGLE angle is asked in exact radians through
 * `exactRadianAnswer`, and a SET of them is asked in degrees through `solutionSetAnswer`.
 * TRG.6 and TRG.8 both carry a header note saying so, and nothing here should be "made
 * consistent" by moving a roster into radians.
 *
 * **Nothing in this pool is multipart.** `compareMultipart` wants an object keyed by
 * `part_id`, both practice surfaces submit a string, and `apps/web` has no multi-field input
 * at all, so a multipart practice item cannot be answered rather than merely being graded
 * harshly. TRG.3's coordinates slot and TRG.5's features slot each ask for ONE named part
 * for that reason.
 *
 * ## The variety guard is enforced here
 *
 * Every D9 template declares a `varietyKey` over the numbers that fix its instance, and both
 * freezers below honour it. This domain needs it more than most: the special angles are a
 * small lattice, so several shapes reach the same heading by different routes and a
 * content-hash check alone would happily freeze two instances of one question in a cell.
 */

/** D9 practice nodes, in lesson order. */
export const D9_PRACTICE_NODES: readonly string[] = [
  TRG1_NODE,
  TRG2_NODE,
  TRG3_NODE,
  TRG4_NODE,
  TRG5_NODE,
  TRG6_NODE,
  TRG7_NODE,
  TRG8_NODE,
  TRG9_NODE,
];

/**
 * Every D9 practice template, aggregated in stable node order (TRG.1 first). The per-node
 * generators live under `nodes/<NODE>/`; this file only concatenates them, so the frozen
 * pool below is deterministic.
 */
/**
 * Extra problem SHAPES that share an existing (node, difficulty) cell, listed before the
 * aggregate so they can be appended after every locked-mix template.
 *
 * The position in the aggregate is load-bearing rather than tidy, exactly as it is for
 * `D8_EXTRA_PRACTICE_TEMPLATES`. `buildPool` fills a two-slot cell round-robin from the cell's
 * first two templates and `buildVariants` walks the whole list on one running seed, so a shape
 * filed next to its siblings would take a pool slot off one of them and re-seed every retry
 * variant behind it in the list. Appended last it adds instances and moves none.
 *
 * Both nodes here were EXCLUDED from the diagnostic for a spent parameter space: all four of
 * their locked-mix L2 templates measure zero fresh draws, because a reference angle has to be
 * one of three for the checker to grade the roster and the practice pool plus its retry variants
 * had taken every combination. Neither node's fix could be more items from the same template, so
 * these four are the variation `practice-walk.ts`'s ledger was asking for.
 */
export const D9_EXTRA_PRACTICE_TEMPLATES: readonly ItemTemplate[] = [
  ...TRG7_EXTRA_TEMPLATES,
  ...TRG8_EXTRA_TEMPLATES,
];

export const D9_PRACTICE_TEMPLATES: readonly ItemTemplate[] = [
  ...TRG1_TEMPLATES,
  ...TRG2_TEMPLATES,
  ...TRG3_TEMPLATES,
  ...TRG4_TEMPLATES,
  ...TRG5_TEMPLATES,
  ...TRG6_TEMPLATES,
  ...TRG7_TEMPLATES,
  ...TRG8_TEMPLATES,
  ...TRG9_TEMPLATES,
  ...D9_EXTRA_PRACTICE_TEMPLATES,
];

/** The D9 practice mix: the same five-slot 1xL1 / 2xL2 / 2xL3 shape as every other pool. */
export const D9_PRACTICE_MIX: readonly { difficulty: ItemDifficulty; count: number }[] = [
  { difficulty: 1, count: 1 },
  { difficulty: 2, count: 2 },
  { difficulty: 3, count: 2 },
];

/** Group the practice templates by (node, difficulty) cell, in stable list order. */
function templatesByCell(): Map<string, ItemTemplate[]> {
  const byCell = new Map<string, ItemTemplate[]>();
  for (const template of D9_PRACTICE_TEMPLATES) {
    const key = `${template.node_id}:L${template.difficulty}`;
    const templates = byCell.get(key) ?? [];
    templates.push(template);
    byCell.set(key, templates);
  }
  return byCell;
}

// Seed bases disjoint from D1 (1000/2000/5000/7000/10000/20000), the interactive demo pool
// (42000/43000), D2 (60000/61000), D5 (70000/71000), D7 (80000/81000), D8 (90000/91000), the
// product pool (100000/200000), D3 (110000/111000), D4 (120000/121000) and D10
// (130000/131000), so no frozen id or content collides across pools.
const PRACTICE_SEED_BASE = 140_000;
const VARIANT_SEED_BASE = 141_000;

/** Retry/replacement variants per (node, difficulty) cell: the reveal-to-retry draw pool. */
export const D9_PRACTICE_RETRY_VARIANTS_PER_CELL = 6;

/**
 * Freeze the canonical five-slot practice pool for every D9 node: the locked mix per node,
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
  for (const node of D9_PRACTICE_NODES) {
    for (const { difficulty, count } of D9_PRACTICE_MIX) {
      const templates = byCell.get(`${node}:L${difficulty}`);
      if (!templates?.length) {
        throw new Error(`no D9 practice template for ${node} L${difficulty}`);
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
 * How many answer-repeating candidates a slot will pass over before it settles for one.
 *
 * A SOFT budget, and the softness is the whole design. Requiring distinct answers outright
 * would make a cell's variant count collapse onto its answer count, which would merge two
 * quantities `d9.test.ts` keeps deliberately apart: `THIN_CELLS` counts distinct QUESTIONS a
 * generator can build and `THIN_ANSWER_CELLS` counts distinct ANSWERS those questions carry.
 * A three-answer shape like `formula-name.l2` would drop from six variants to three and stop
 * offering fresh questions at all. So a slot tries hard for a new answer and then takes what
 * it can get, which leaves genuinely thin cells exactly as thin as they were.
 *
 * Sized against the worst rich case rather than picked round: `d9.trg5.amplitude.l1` holds 8
 * answers and needs a sixth, so a draw finds one with probability of roughly a quarter and
 * sixty tries miss with probability under one in a million.
 */
const ANSWER_REPEAT_BUDGET = 60;

/**
 * How much evidence of QUESTION exhaustion switches the answer budget off for a template.
 *
 * Passing over a candidate costs a seed, and the walk never goes back for it, so in a cell
 * with barely enough questions to fill itself the skipped candidate can be one of the ones it
 * needed. That is not hypothetical: charging answer retries at every cell cost
 * `d9.trg2.special-exact.l2` its sixth variant and `d9.trg7.range-interval.l2` its fifth,
 * both cells with single-digit question spaces, in exchange for answer variety neither of them
 * has to give — `range-interval` holds three answers however many questions it builds.
 *
 * So the budget is spent only where questions are plentiful, and a cell reveals which kind it
 * is by how often it collides: a rich shape almost never does, and an exhausted one does
 * immediately. Counted cumulatively across the template rather than per slot, because it is a
 * standing fact about the shape's space rather than about one draw.
 */
const CONTENT_HEADROOM_MISSES = 12;

/**
 * Pre-generate up to `perCell` distinct number-swapped variants per template: the
 * reveal-to-retry replacement pool. Deterministic; each variant is distinct in content from
 * the others and from `avoidHashes`, distinct in `varietyKey` from the other variants of ITS
 * template, and — as far as its answer space allows — distinct in ANSWER from them too.
 *
 * The miss budget earns its keep in this domain. Several cells are genuinely small — only
 * three sines are exact and positive, and only two radicals are reachable from the sum and
 * difference formulas — so a template can exhaust its distinct instances before `perCell`
 * is met. That is a thin cell rather than a bug, and the loop leaves it thin instead of
 * spinning; the count assertions in `d9.test.ts` are what report how thin.
 *
 * ## Why the answer is checked separately from the variety key
 *
 * This function used to dedupe on content and `varietyKey` alone, while its own docstring
 * claimed the result was that "a retry never hands back the same answer in new clothes". Those
 * are different claims, and the gap between them is not small: `d9.trg5.amplitude.l1` reaches
 * 1940 distinct variety keys over 8 distinct answers, so six draws that are pairwise distinct
 * as QUESTIONS are close to even money to repeat an ANSWER, and which way it fell was decided
 * by wherever the running seed happened to be when the walk reached TRG.5.
 *
 * It fell the lucky way for as long as nobody edited a template ahead of it in the walk. The
 * tier rebalance in TRG.4 reshaped a list two nodes earlier, the seed arrived somewhere else,
 * and the cell came out with 5 answers over its 6 variants — failing a `d9.test.ts` assertion
 * that had been passing on the arrangement of the stream rather than on anything this function
 * guaranteed. Read that as the assertion doing its job late rather than as the rebalance
 * breaking TRG.5: the shortfall was always reachable, and TRG.5's answer ceiling is 8 either
 * way, which is why it is fixed here rather than declared as a thin cell it is not.
 */
function buildVariants(perCell: number, avoidHashes: Iterable<string> = []): FrozenItem[] {
  const used = new Set<string>(avoidHashes);
  const variants: FrozenItem[] = [];
  let seed = VARIANT_SEED_BASE;
  for (const template of D9_PRACTICE_TEMPLATES) {
    const templateVariety = new Set<string>();
    const templateAnswers = new Set<string>();
    let made = 0;
    let misses = 0;
    // Counted per slot and reset on every placement, so each variant gets a full budget
    // rather than the whole cell sharing one.
    let answerRepeats = 0;
    // Cumulative across the template and never reset: the standing signal of how much room
    // this shape's question space still has.
    let contentMisses = 0;
    while (made < perCell && misses < 200) {
      const candidate = generateFromTemplate(template, "practice", seed);
      seed += 1;
      const hash = hashItemDefinition(candidate);
      const variety = template.varietyKey?.(candidate.template_params);
      if (used.has(hash) || (variety !== undefined && templateVariety.has(variety))) {
        misses += 1;
        contentMisses += 1;
        continue;
      }
      // Keyed by the item where no answer key exists, so a spec-only answer counts as its own
      // rather than colliding every such candidate with every other under one shared `""`.
      const answer = candidate.answer.answer_key ?? `spec:${hash}`;
      if (
        templateAnswers.has(answer) &&
        contentMisses < CONTENT_HEADROOM_MISSES &&
        answerRepeats < ANSWER_REPEAT_BUDGET
      ) {
        // Deliberately NOT counted against `misses`. That budget measures whether a generator
        // has run out of distinct QUESTIONS, and passing over a repeated answer is not evidence
        // that it has. Charging both to one counter cost `d9.trg2.special-exact.l2` its sixth
        // variant: a nearly exhausted cell spent the hard budget on answer retries and stopped
        // before finding content it could still have built. Termination does not depend on this
        // counter anyway — `answerRepeats` is bounded, and once it is spent the next
        // content-distinct candidate is taken whatever its answer.
        answerRepeats += 1;
        continue;
      }
      used.add(hash);
      if (variety !== undefined) {
        templateVariety.add(variety);
      }
      templateAnswers.add(answer);
      variants.push(candidate);
      made += 1;
      misses = 0;
      answerRepeats = 0;
    }
  }
  return variants;
}

/** The canonical five-slot-per-node D9 practice pool. */
export const D9_PRACTICE_POOL: readonly FrozenItem[] = buildPool();

/** Retry/replacement variants, distinct from the canonical pool. */
export const D9_PRACTICE_VARIANTS: readonly FrozenItem[] = buildVariants(
  D9_PRACTICE_RETRY_VARIANTS_PER_CELL,
  D9_PRACTICE_POOL.map(hashItemDefinition),
);

/**
 * Every registrable D9 practice instance (canonical pool + retry variants). Register these
 * with the checker so any drawn instance is gradable.
 */
export const D9_PRACTICE_ITEMS: readonly FrozenItem[] = [
  ...D9_PRACTICE_POOL,
  ...D9_PRACTICE_VARIANTS,
];

/**
 * Build a randomized five-slot practice set for a D9 node: the locked 1xL1 / 2xL2 / 2xL3
 * mix in easy-to-hard order, each slot drawn from all registered instances for its
 * (node, difficulty) so the opening problems vary run to run. Picks within a difficulty are
 * distinct AND spread across the cell's problem SHAPES before repeating one. Every returned
 * item is a member of {@link D9_PRACTICE_ITEMS} (so already registered and gradable).
 */
export function buildRandomizedD9PracticeSet(
  nodeId: string = TRG1_NODE,
  rng: () => number = Math.random,
): FrozenItem[] {
  return buildRandomizedSetByShape(
    D9_PRACTICE_ITEMS,
    nodeId,
    D9_PRACTICE_MIX,
    rng,
    (difficulty, need, have) =>
      `not enough D9 practice instances for ${nodeId} L${difficulty}: need ${need}, have ${have}`,
  );
}

/** The canonical five-slot practice set (1xL1/2xL2/2xL3) for a D9 node. */
export function getD9PracticeSet(nodeId: string = TRG1_NODE): FrozenItem[] {
  return D9_PRACTICE_POOL.filter((item) => item.node_id === nodeId);
}

/**
 * Draw a fresh D9 practice instance for a (node, difficulty) cell, distinct from every id
 * in `avoid` (the reveal to retry one-liner). Searches the full registrable set
 * (`D9_PRACTICE_ITEMS` = pool ∪ variants). Prefers an unused instance of the same shape
 * (`templateId`) when given, and within that shape one whose ANSWER has not just been
 * revealed. Returns `undefined` if the cell is exhausted.
 *
 * The answer preference is {@link drawRetryInstance} and it is why this is no longer a
 * `find` over ids alone: several trigonometric cells hold more instances than answers, so
 * avoiding by id let a retry serve back the answer the reveal had shown. It is a preference
 * rather than a constraint, so the thin cells below still fill their retries.
 */
export function drawD9PracticeInstance(
  nodeId: string,
  difficulty: ItemDifficulty,
  opts: { avoid?: Iterable<string>; templateId?: string } = {},
): FrozenItem | undefined {
  return drawRetryInstance(D9_PRACTICE_ITEMS, { nodeId, difficulty }, opts);
}
