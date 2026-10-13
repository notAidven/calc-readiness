import {
  SUCCESSION,
  type SuccessionBatchComposition,
  type SuccessionQuestionCandidate,
  successionBatchFor,
  successionWindow,
} from "@cr/game";
import {
  D2_PRACTICE_ITEMS,
  D3_PRACTICE_ITEMS,
  D4_PRACTICE_ITEMS,
  type FrozenItem,
} from "@cr/item-bank";
import type { Mastery } from "@cr/state-schema";

import { devSessionStore } from "../devPersistence/devSession";
import { type GradedCrisisAnswer, gradeCrisisAnswer } from "../lessons/crisisAnswer";
import { completedNodeIdsFrom } from "../lessons/lessonProgress";
import { practiceItemsById } from "../lessons/practiceChecker";

/**
 * **WHERE THE SUCCESSION'S QUESTIONS COME FROM, AND HOW THEY ARE GRADED.**
 *
 * Real items, real checker, no mastery — the same three-part rule `hardWinterItems.ts` states
 * for era one, and the third part is the one worth restating: **nothing here builds a
 * `LessonSession`, touches `@cr/mastery-service` or submits evidence.** A learner answering
 * with a district's allegiance riding on the result may underperform relative to calm practice,
 * so the crisis's verdicts size a bank of counters and are then thrown away. Feeding mastery
 * later is a one-line addition; unpicking evidence that should not have been trusted is not.
 *
 * ## THE POOL IS THREE ERAS WIDE, AND ERA FOUR IS THE FIRST CRISIS THAT COULD BE
 *
 * D-CRISIS-14's window is *"the current era plus the previous two"*, weighted 40/35/25 and
 * sampled bucket-first. `hard-winter-pool.test.ts` records that era one's crisis does not
 * implement the buckets because era one has no era behind it, and names the condition that
 * would make them owed: **a second era with a question pool.** Era four's window is three eras
 * that all have one — its own five POL nodes, era three's five LIN nodes, era two's one EXP and
 * four RAD nodes — so the composer in `succession-questions.ts` is the first in the ten that
 * has anything to weigh, and this module's whole job is to hand it the items.
 *
 * **The window itself is derived in the engine and never here.** `successionBatchFor` reads
 * `ERA_SEQUENCE`, apportions the batch across the buckets and draws; this supplies the pool and
 * the learner's progress and nothing else.
 *
 * ## EVERY ITEM IN THE POOL IS ALREADY GRADABLE, WHICH HAD TO BE CHECKED RATHER THAN ASSUMED
 *
 * `succession-questions.ts` flags exactly this as the thing era four is the first crisis to
 * meet: *"a caller owes a pool of questions its own answer surface can take"*, because the
 * window reaches back into era two, which holds widget-scored items with no typed answer key.
 * It is satisfied structurally rather than by filtering: all three pools are registered with
 * the ONE versioned checker in `lessons/practiceChecker.ts` — D2, D3 and D4 all route to the
 * product checker, which dispatches interactive answer types to their widget modules — and the
 * surface renders `PracticeAnswer`, which is the same control a lesson uses and which picks its
 * own input from the item's answer spec. So a widget item draws a widget and grades through it.
 *
 * `successionQuestionPool.test.ts` measures that per node rather than trusting this paragraph.
 *
 * ## THE DRAW IS SEEDED, NEVER RANDOM
 *
 * `successionBatchFor` derives its stream from `(encounter, cycle)` through the engine's own
 * seeded RNG and refuses an unseeded path outright, which is why `test/successionPropagation
 * .test.ts` can sweep this file for a clock read and mean it. Two consequences: the same
 * encounter replays identically, so a tuning pass can compare two plans over the same
 * questions; and cycle five can be recomputed without replaying the four before it.
 */

/**
 * **THE WINDOW'S ITEMS: era two's, era three's and era four's practice pools.**
 *
 * Registered with the checker at import time (that is `practiceChecker`'s module side effect),
 * so anything drawn from here is gradable. Concatenated in era order, oldest first, which is
 * the order `successionWindow` walks backward from era four.
 */
export const SUCCESSION_ITEM_POOL: readonly SuccessionQuestionCandidate[] = [
  ...D2_PRACTICE_ITEMS,
  ...D3_PRACTICE_ITEMS,
  ...D4_PRACTICE_ITEMS,
].map((item) => ({
  item_version_id: item.item_version_id,
  node_id: item.node_id,
  prompt: item.prompt,
}));

/**
 * Every node the window's pools can actually serve, in the pool's own order.
 *
 * Taken from the items rather than written out again, so a node whose items are pulled cannot
 * leave a name behind in a list here.
 */
export const SUCCESSION_NODE_ORDER: readonly string[] = (() => {
  const seen: string[] = [];
  for (const candidate of SUCCESSION_ITEM_POOL) {
    if (!seen.includes(candidate.node_id)) {
      seen.push(candidate.node_id);
    }
  }
  return seen;
})();

/**
 * The nodes era four's window reaches at all, whatever this learner has finished.
 *
 * Derived by asking the engine for the window with everything mastered, which is the honest way
 * to get "what could this crisis ever ask about": a list written here would be a second copy of
 * `ERA_SEQUENCE`'s three eras and would go stale the day the reach is retuned.
 */
export const SUCCESSION_WINDOW_NODES: readonly string[] = successionWindow({
  mastered: SUCCESSION_NODE_ORDER,
}).flatMap((bucket) => bucket.node_ids);

/** How many items the pool can serve for a given eligible set. */
function poolDepth(nodeIds: readonly string[]): number {
  const eligible = new Set(nodeIds);
  return SUCCESSION_ITEM_POOL.filter((candidate) => eligible.has(candidate.node_id)).length;
}

/** Where a cycle's questions are coming from, which is not always the practised set. */
export type SuccessionDrawSource = "practised" | "window";

export interface SuccessionDrawSet {
  /** The nodes the batch draws from, in {@link SUCCESSION_NODE_ORDER}'s order. */
  readonly nodeIds: readonly string[];
  readonly source: SuccessionDrawSource;
}

/**
 * **WHAT A CYCLE ASKS ABOUT WHEN THE PRACTISED SET CANNOT FILL A BATCH: the whole window,
 * rather than nothing at all.**
 *
 * Era one's surface ships the same fallback and the reasoning carries across unchanged. A
 * learner who has finished no practice set has an empty eligible set, `composeSuccessionBatch`
 * refuses at `nothing_mastered`, and the encounter renders a refusal with no way forward — and
 * that refusal is right about the pool and wrong about the product, because the dev route and
 * the entry chip are deliberately reachable below the trigger and a fresh install is exactly
 * the state a demo machine is in.
 *
 * **It draws the questions and it does not grant the evidence**, which is the whole design of
 * the fallback: nothing here writes a `node_state`. Crediting ten skills so a crisis could ask
 * about them would corrupt the signal this repository protects hardest.
 *
 * The threshold is the POOL's depth rather than a node count, because a whole batch can come
 * from one node — so one practised lesson keeps drawing from that lesson, and only a set the
 * pool genuinely cannot serve falls back.
 */
export function successionDrawSetFromIds(
  practisedNodeIds: readonly string[],
): SuccessionDrawSet {
  const practised = new Set(practisedNodeIds);
  const eligible = SUCCESSION_NODE_ORDER.filter((nodeId) => practised.has(nodeId));
  return poolDepth(eligible) >= SUCCESSION.cycle.batch_size
    ? { nodeIds: eligible, source: "practised" }
    : { nodeIds: SUCCESSION_WINDOW_NODES, source: "window" };
}

/** The same narrowing from raw progress, applying `lessonProgress`'s own "done" rule. */
export function successionDrawSet(
  nodeStates: readonly { node_id: string; mastery: Mastery }[],
): SuccessionDrawSet {
  return successionDrawSetFromIds(completedNodeIdsFrom(nodeStates));
}

/**
 * The draw set read from the saved dev session — the ONE place this crisis touches progress
 * storage, and it reads and never writes.
 *
 * Synchronous, which is a property of the store rather than a convenience taken here, so the
 * surface needs no loading state and no effect.
 */
export function loadSuccessionDrawSet(): SuccessionDrawSet {
  return successionDrawSet(devSessionStore.load()?.node_states ?? []);
}

/**
 * Draw one cycle's batch. Deterministic in `(encounter, cycle)`.
 *
 * Named for the CYCLE rather than re-exporting the engine's `successionBatchFor` under its own
 * name, because the two take different things: the engine's takes a pool and this one knows
 * which pool era four's window is served from.
 */
export function successionCycleBatch(input: {
  readonly nodeIds: readonly string[];
  readonly encounter: number;
  readonly cycle: number;
}): SuccessionBatchComposition {
  return successionBatchFor({
    mastered: input.nodeIds,
    pool: SUCCESSION_ITEM_POOL,
    encounter: input.encounter,
    cycle: input.cycle,
  });
}

/** The frozen item behind a drawn prompt — the answer control needs its answer spec. */
export function successionFrozenItem(itemVersionId: string): FrozenItem | undefined {
  return practiceItemsById.get(itemVersionId);
}

/**
 * Grade one answer through the authoritative checker. The verdict is the same one a lesson
 * would record; the difference is that nothing records it.
 */
export function gradeSuccessionAnswer(
  itemVersionId: string,
  rawAnswer: string | Record<string, unknown>,
): GradedCrisisAnswer {
  return gradeCrisisAnswer(itemVersionId, rawAnswer);
}
