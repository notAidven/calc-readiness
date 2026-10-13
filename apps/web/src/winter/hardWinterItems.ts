import type { WinterBatchCandidate, WinterBatchComposition } from "@cr/game";
import {
  composeHardWinterBatch,
  createSeededRng,
  HARD_WINTER,
  mixSeed,
  winterSkillOrder,
} from "@cr/game";
import { D1_PRACTICE_ITEMS, type FrozenItem } from "@cr/item-bank";
import type { Mastery } from "@cr/state-schema";

import { devSessionStore } from "../devPersistence/devSession";
import { type GradedCrisisAnswer, gradeCrisisAnswer } from "../lessons/crisisAnswer";
import { completedNodeIdsFrom } from "../lessons/lessonProgress";
import {
  checkerVersionForId,
  practiceChecker,
  practiceItemsById,
} from "../lessons/practiceChecker";

/**
 * WHERE THE HARD WINTER'S QUESTIONS COME FROM, AND HOW THEY ARE GRADED.
 *
 * Real items, real checker, no mastery. That combination is the whole point of this
 * module, and each third of it is deliberate:
 *
 *  - **Real items.** The pool is `D1_PRACTICE_ITEMS` — the shipped five-slot practice
 *    pool plus its reveal/retry variants, the same instances a learner meets in a lesson.
 *    Not a fixture, not a subset, and nothing authored here.
 *  - **Real grading.** `practiceChecker` is the ONE global versioned checker the lesson
 *    surfaces install (`lessons/practiceChecker.ts`), routed per item by its own
 *    `equivalence_checker_version`. So `-2.0` passes where `-2` is the key, exactly as it
 *    would in practice, and a learner is never marked wrong for a form the product
 *    accepts.
 *  - **NO MASTERY.** Nothing here builds a `LessonSession`, touches
 *    `@cr/mastery-service`, or calls `submitAssessmentEvidence`. `lessons/practiceSession.ts`
 *    is the module that does all three and it is deliberately not imported. A learner
 *    answering under pressure with a declared action riding on it may underperform
 *    relative to calm practice, and this codebase protects the integrity of the mastery
 *    signal above almost everything, so the winter's verdicts are used to size a bonfire
 *    and then thrown away. Feeding mastery later is a one-line addition; unpicking
 *    evidence that should not have been trusted is not.
 *
 * ## The draw is seeded, never random
 *
 * `winterBatchFor` derives its RNG from the encounter index and the round number through
 * the engine's own `createSeededRng`/`mixSeed`. `composeHardWinterBatch` requires an RNG
 * with no fallback, so there is no unseeded path here at all and — more to the point — no
 * temptation to reach for a timestamp as a seed. Two consequences worth having: the same
 * winter replays identically, so a tuning session can compare two plans over the same
 * questions; and `test/hardWinterClockless.test.ts` can sweep this file for clock tokens
 * and mean it.
 */

/**
 * Every D1 practice instance, as a batch candidate. Registered with the checker at
 * import time (that is `practiceChecker`'s module side effect), so anything drawn from
 * here is gradable.
 */
export const WINTER_ITEM_POOL: readonly WinterBatchCandidate[] = D1_PRACTICE_ITEMS.map(
  (item) => ({
    item_version_id: item.item_version_id,
    node_id: item.node_id,
    prompt: item.prompt,
  }),
);

/**
 * The era-one node order the winter's "how far has this learner got" slider walks.
 *
 * Registry order, taken from the item pool itself rather than written out again, so a
 * node whose items are pulled cannot leave a name behind in a list here. The batch draws
 * CUMULATIVELY from a prefix of this — which is the one thing that lets the same
 * encounter scale from era one's six nodes to era eight's nine without a rule change.
 */
export const WINTER_NODE_ORDER: readonly string[] = (() => {
  const seen: string[] = [];
  for (const item of D1_PRACTICE_ITEMS) {
    if (!seen.includes(item.node_id)) {
      seen.push(item.node_id);
    }
  }
  return seen;
})();

/**
 * Draw one round's batch from the nodes the learner has reached. Deterministic in
 * `(encounter, round)`, so round three of encounter two always asks the same three
 * questions and a retune can be compared against the same play.
 *
 * ## The skill order is the encounter's, not the round's
 *
 * `winterSkillOrder` is D-CRISIS-15's no-repeat bag: every eligible skill is asked once
 * before any is asked twice, ACROSS the encounter rather than within a round. It is seeded
 * on the encounter alone, which is the whole point — a per-round seed cannot express a rule
 * about the sequence of rounds — while the item drawn inside each skill stays seeded per
 * round, so two rounds that ask the same skill still ask different questions.
 *
 * Passing it is what makes the rule bite rather than what makes the draw work: the
 * composer shuffles the node order on its own when no order is given, so a caller that
 * forgot this would lose the coverage guarantee and still reach every eligible node.
 */
export function winterBatchFor(input: {
  readonly masteredNodeIds: readonly string[];
  readonly encounter: number;
  readonly round: number;
}): WinterBatchComposition {
  return composeHardWinterBatch(input.masteredNodeIds, WINTER_ITEM_POOL, {
    rng: createSeededRng(mixSeed(input.encounter * 1000 + input.round, 0x5eed)),
    skill_order: winterSkillOrder({
      eligible: input.masteredNodeIds,
      encounterSeed: mixSeed(input.encounter, 0x5eed),
      round: input.round,
    }),
  });
}

/**
 * WHICH SKILLS THIS LEARNER HAS ACTUALLY DONE, as the crisis's eligible set.
 *
 * Two rules meet here and both are somebody else's:
 *
 *  - **what "done" means** is `lessonProgress.completedNodeIdsFrom` — `mastery >= 1`, one
 *    finished practice set — which is the module the repository keeps precisely so no
 *    surface invents its own answer. It is the same rule the endless drill pools on;
 *  - **which nodes are in the window** is D-CRISIS-14's era-one exception: 100% of era
 *    one's own mastered nodes. `WINTER_NODE_ORDER` is that era's authored set taken from
 *    the item pool, so intersecting the two is the whole of the ruling for the only era a
 *    crisis can be built in.
 *
 * The intersection is not defensive tidiness. A learner who has practised a node the winter
 * has no items for would otherwise be counted as eligible, and the composer would refuse
 * the round for a pool it was never going to be able to serve.
 *
 * Order is `WINTER_NODE_ORDER`'s, so the eligible set is stable under whatever order the
 * caller's progress happens to arrive in.
 */
export function winterEligibleNodes(
  nodeStates: readonly { node_id: string; mastery: Mastery }[],
): readonly string[] {
  return winterEligibleNodesFromIds(completedNodeIdsFrom(nodeStates));
}

/**
 * The same narrowing, for a caller that has already applied the `mastery >= 1` rule.
 *
 * The in-city mount is that caller: `CitySurface` computes `practicedNodeIds` through
 * `completedNodeIdsFrom` for the interleaved drill and hands the result over, so applying
 * the rule twice would be two chances to apply it differently.
 */
export function winterEligibleNodesFromIds(
  practisedNodeIds: readonly string[],
): readonly string[] {
  const practised = new Set(practisedNodeIds);
  return WINTER_NODE_ORDER.filter((nodeId) => practised.has(nodeId));
}

/** Where a round's questions are coming from, which is not always the practised set. */
export type WinterDrawSource = "practised" | "era";

export interface WinterDrawSet {
  /** The nodes the batch will draw from, in {@link WINTER_NODE_ORDER}'s order. */
  readonly nodeIds: readonly string[];
  readonly source: WinterDrawSource;
}

/** How many of the pool's items a given eligible set can actually serve. */
function poolDepth(nodeIds: readonly string[]): number {
  const eligible = new Set(nodeIds);
  return WINTER_ITEM_POOL.filter((candidate) => eligible.has(candidate.node_id)).length;
}

/**
 * WHAT THE ROUND WILL ASK ABOUT WHEN THE PRACTISED SET CANNOT FILL A BATCH: era one's own
 * authored nodes, rather than nothing at all.
 *
 * A learner who has finished no practice set has an empty eligible set, `composeHardWinterBatch`
 * refuses at `available: 0`, and the encounter renders *"No batch to ask"* with no way forward —
 * measured from a fresh session in `crisisFromAFreshSession.test.tsx`. That refusal is right
 * about the pool and wrong about the product: the ☰ menu's entry is deliberately reachable below
 * the trigger (`crisisCall.ts`'s `requestBriefing`), so an empty practised set is a state the
 * game routes players into on purpose, and a fresh install is exactly the state a demo machine
 * is in.
 *
 * ## WHAT THIS DOES NOT DO
 *
 * It draws the questions. It does not grant the evidence, and the distinction is the whole
 * design of the fallback: nothing here writes a `node_state`, calls `advanceMasteryDev`, or
 * touches `@cr/mastery-service` — the module that would is deliberately not imported, exactly as
 * this file's header describes for the ordinary path. Crediting six skills so a crisis could ask
 * about them would corrupt the signal this repository protects hardest, and it would be
 * unpickable afterwards in a way a wider question draw never is.
 *
 * ## THE SOURCE COMES BACK WITH THE SET
 *
 * The entry advisor promises questions *"drawn from lessons you have already done"*, and under
 * the fallback that sentence is not true, so the surface has to be able to say so. Returning the
 * provenance beside the ids is what lets one expression decide the draw and the disclosure
 * together; a boolean recomputed at the render site would be a second chance to disagree.
 *
 * The threshold is the pool's own depth rather than a node count, because `batch_size` items can
 * come from a single node (`crisisQuestionPool.test.ts` pins that) — so "one practised lesson"
 * keeps drawing from that one lesson, and only a set the pool genuinely cannot serve falls back.
 */
export function winterDrawSetFromIds(practisedNodeIds: readonly string[]): WinterDrawSet {
  const practised = winterEligibleNodesFromIds(practisedNodeIds);
  return poolDepth(practised) >= HARD_WINTER.batch_size
    ? { nodeIds: practised, source: "practised" }
    : { nodeIds: WINTER_NODE_ORDER, source: "era" };
}

/**
 * The same set, read from the saved dev session — the ONE place in the winter that touches
 * progress storage, mirroring `loadLiveCityLayout` for the board.
 *
 * SYNCHRONOUS, and that is a property of the store rather than a convenience taken here:
 * `devSessionStore.load()` parses the saved blob and returns it, which is how `DevLessons`
 * reads the same set (`completedNodeIdsFrom(devSessionStore.load()?.node_states ?? [])`).
 * There is no promise to await, so the crisis surface needs no loading state and no effect.
 * It reads and never writes; the winter has no path to progress at all.
 */
export function loadWinterEligibleNodes(): readonly string[] {
  return winterEligibleNodes(devSessionStore.load()?.node_states ?? []);
}

/** The frozen item behind a drawn prompt — the answer control needs its answer spec. */
export function winterFrozenItem(itemVersionId: string): FrozenItem | undefined {
  return practiceItemsById.get(itemVersionId);
}

/**
 * Grade one answer through the authoritative checker. The verdict is the same one a
 * lesson would record; the difference is that nothing records it.
 *
 * `correct: null` means the reader could not READ the answer, so there is no verdict to
 * bank and the question stays live. All four crisis surfaces share one implementation now
 * (`../lessons/crisisAnswer.ts`), because four copies of `.client_correct` are what let
 * `invalid_input` be banked as a wrong answer on all four.
 *
 * A widget payload is passed through as-is, exactly as `LessonPractice` does: the
 * checker's `raw_answer` takes a string or a structured payload and dispatches on the
 * item's answer type.
 */
export function gradeWinterAnswer(
  itemVersionId: string,
  rawAnswer: string | Record<string, unknown>,
): GradedCrisisAnswer {
  return gradeCrisisAnswer(itemVersionId, rawAnswer);
}
