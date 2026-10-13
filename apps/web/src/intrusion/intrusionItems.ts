import {
  RELAY,
  RELAY_ERA,
  type IntrusionBatchComposition,
  type IntrusionQuestionCandidate,
  intrusionBatchFor,
  intrusionWindow,
} from "@cr/game";
import {
  D6_PRACTICE_ITEMS,
  D7_PRACTICE_ITEMS,
  D8_PRACTICE_ITEMS,
  type FrozenItem,
} from "@cr/item-bank";
import { getEra } from "@cr/skill-graph";

import { devSessionStore } from "../devPersistence/devSession";
import { type GradedCrisisAnswer, gradeCrisisAnswer } from "../lessons/crisisAnswer";
import { completedNodeIdsFrom } from "../lessons/lessonProgress";
import { practiceItemsById } from "../lessons/practiceChecker";

/**
 * WHERE THE INTRUSION'S QUESTIONS COME FROM, AND HOW THEY ARE GRADED.
 *
 * Real items, real checker, no mastery — `hardWinterItems.ts` argues all three at length and
 * this file makes the same three choices for the same reasons. The one worth restating is the
 * third: **nothing here builds a `LessonSession`, touches `@cr/mastery-service`, or calls
 * `submitAssessmentEvidence`.** A learner answering under pressure with a diagnostic riding on
 * it may underperform relative to calm practice, so the crisis's verdicts size a reading and
 * are then thrown away.
 *
 * ## THE POOL IS THREE DOMAINS BECAUSE THE WINDOW IS THREE ERAS, AND THE TWO ARE NUMBERED
 * ## DIFFERENTLY
 *
 * `intrusion-questions.ts` rules era nine's question window as **the current era plus two
 * behind it** — eras 9, 8 and 7 — and the item bank is keyed by DOMAIN rather than by era, so
 * the mapping is not the identity and getting it wrong would be silent. Measured at this tip:
 *
 *  - era 9 `information_age` holds `EL.1` to `EL.6`, and those are **`D8_PRACTICE_ITEMS`**;
 *  - era 8 `atomic_age` holds `FUN.4` to `FUN.10` and `LF.1` to `LF.4`, which are
 *    **`D6_PRACTICE_ITEMS`** and **`D7_PRACTICE_ITEMS`** between them;
 *  - era 7 `industrial` holds `FUN.1`, `FUN.2`, `FUN.3`, `FUN.7`, `FUN.8` and `POL.5`, and
 *    `D6_PRACTICE_ITEMS` serves the five `FUN` nodes. `POL.5` has no items in this pool.
 *
 * **The shortfall is deliberately not padded.** `intrusionServableWindow` drops a bucket the
 * pool cannot serve rather than allocating it a share and letting the fallback order fill it,
 * because a silently wrong mix is the defect D-CRISIS-14 exists for. So a learner who has
 * finished only `POL.5` in era seven meets a two-bucket window, and the realised shares are the
 * ruled shares over the buckets that exist.
 *
 * {@link INTRUSION_WINDOW_NODES} derives that whole story from the era registry rather than
 * restating it, and `intrusionItems.test.ts` asserts the pool covers it with `POL.5` named as
 * the one exception, in both directions.
 *
 * ## THE DRAW IS SEEDED, NEVER RANDOM
 *
 * `intrusionBatchFor` derives its RNG from the encounter index and the check number through the
 * engine's own `createSeededRng`/`mixSeed`, and requires one with no fallback — so there is no
 * unseeded path here and no temptation to reach for a timestamp as a seed.
 * `test/intrusionPropagation.test.ts` sweeps this file for a clock read and can mean it.
 */

/**
 * Every item the three domains can serve, as a batch candidate.
 *
 * Registered with the checker at import time, which is `practiceChecker`'s module side effect,
 * so anything drawn from here is gradable.
 */
export const INTRUSION_ITEM_POOL: readonly IntrusionQuestionCandidate[] = [
  ...D8_PRACTICE_ITEMS,
  ...D7_PRACTICE_ITEMS,
  ...D6_PRACTICE_ITEMS,
].map((item) => ({
  item_version_id: item.item_version_id,
  node_id: item.node_id,
  prompt: item.prompt,
}));

/**
 * **THE WINDOW'S NODES, DERIVED FROM THE ERA REGISTRY AND NOT WRITTEN DOWN.**
 *
 * `intrusionWindow` computes the buckets with an empty progress set, which gives the eras the
 * window reaches without narrowing them; the nodes come off `getEra`. That is the same
 * derivation D-CRISIS-9 asks for on the trigger: an era that gains or loses a node moves its
 * own crisis and no table needs editing.
 *
 * In era order, oldest bucket last, which is the order the composer's fallback walks.
 */
export const INTRUSION_WINDOW_NODES: readonly string[] = intrusionWindow({
  mastered: [],
}).flatMap((bucket) => getEra(bucket.era)?.nodes ?? []);

/** The window's nodes the pool can actually serve, which is the honest fallback set. */
export const INTRUSION_SERVED_NODES: readonly string[] = (() => {
  const served = new Set(INTRUSION_ITEM_POOL.map((candidate) => candidate.node_id));
  return INTRUSION_WINDOW_NODES.filter((nodeId) => served.has(nodeId));
})();

/** How many of the pool's items a given eligible set can serve. */
function poolDepth(nodeIds: readonly string[]): number {
  const eligible = new Set(nodeIds);
  return INTRUSION_ITEM_POOL.filter((candidate) => eligible.has(candidate.node_id)).length;
}

/** Where a check's questions are coming from, which is not always the practised set. */
export type IntrusionDrawSource = "practised" | "window";

export interface IntrusionDrawSet {
  readonly nodeIds: readonly string[];
  readonly source: IntrusionDrawSource;
}

/**
 * **WHAT A CHECK ASKS ABOUT WHEN THE PRACTISED SET CANNOT FILL ONE.**
 *
 * `winterDrawSetFromIds`'s rule, and its reasoning transfers exactly: a learner who has
 * finished no practice set gets a refusal that is right about the pool and wrong about the
 * product, and a dev entry is a state somebody is routed into on purpose. So a set the pool
 * cannot serve falls back to the window's own nodes.
 *
 * **It draws the questions and it does not grant the evidence.** Nothing here writes a node
 * state, and the module that could is not imported. The surface says which set it drew from,
 * because a promise that the questions come from finished lessons is not true under the
 * fallback.
 *
 * The threshold is the pool's DEPTH rather than a node count, because a whole check can come
 * from a single node: one finished lesson keeps drawing from that lesson, and only a genuinely
 * unservable set falls back.
 */
export function intrusionDrawSetFromIds(
  practisedNodeIds: readonly string[],
): IntrusionDrawSet {
  const practised = new Set(practisedNodeIds);
  const inWindow = INTRUSION_SERVED_NODES.filter((nodeId) => practised.has(nodeId));
  return poolDepth(inWindow) >= RELAY.questions_per_round
    ? { nodeIds: inWindow, source: "practised" }
    : { nodeIds: INTRUSION_SERVED_NODES, source: "window" };
}

/**
 * The same set read from the saved dev session — the ONE place the crisis touches progress
 * storage, and it reads and never writes.
 *
 * Synchronous, which is a property of the store rather than a convenience: `devSessionStore
 * .load()` parses the saved blob and hands it back, so the surface needs no loading state and
 * no effect to show a board.
 */
export function loadIntrusionDrawSet(): IntrusionDrawSet {
  return intrusionDrawSetFromIds(
    completedNodeIdsFrom(devSessionStore.load()?.node_states ?? []),
  );
}

/**
 * Draw one check's questions. Deterministic in `(encounter, check)`, so the third check of the
 * second encounter always asks the same three questions and a retune can be compared against
 * the same play.
 *
 * `check` is `state.checks_run + 1` and the engine's own docblock says why it is passed rather
 * than read off the state: `checks_run` counts what has been PAID FOR, and a caller composing
 * the questions for a check nobody has paid for yet has to say so.
 */
export function intrusionBatchForCheck(input: {
  readonly drawFrom: readonly string[];
  readonly encounter: number;
  readonly check: number;
}): IntrusionBatchComposition {
  return intrusionBatchFor({
    era: RELAY_ERA,
    mastered: input.drawFrom,
    pool: INTRUSION_ITEM_POOL,
    encounter: input.encounter,
    check: input.check,
  });
}

/** The frozen item behind a drawn prompt — the answer control needs its answer spec. */
export function intrusionFrozenItem(itemVersionId: string): FrozenItem | undefined {
  return practiceItemsById.get(itemVersionId);
}

/**
 * Grade one answer through the authoritative checker. The verdict is the same one a lesson
 * would record; the difference is that nothing records it.
 */
export function gradeIntrusionAnswer(
  itemVersionId: string,
  rawAnswer: string | Record<string, unknown>,
): GradedCrisisAnswer {
  return gradeCrisisAnswer(itemVersionId, rawAnswer);
}
