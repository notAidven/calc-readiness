import {
  PLAGUE,
  type PlagueBatchComposition,
  type PlagueQuestionCandidate,
  plagueBatchFor,
  plagueWindow,
} from "@cr/game";
import type { FrozenItem } from "@cr/item-bank";
import { type EraId, getEraOrThrow } from "@cr/skill-graph";
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
 * **WHERE THE PLAGUE'S QUESTIONS COME FROM, AND HOW THEY ARE GRADED.**
 *
 * Real items, the real checker, no mastery — the same three properties `hardWinterItems.ts`
 * argues at length, and the third for the same reason: a learner answering under pressure with a
 * closure riding on the score may underperform against calm practice, so era six's verdicts size
 * a barrier stone and are then thrown away. Nothing here builds a `LessonSession`, touches
 * `@cr/mastery-service` or calls `submitAssessmentEvidence`, and the module that would is
 * deliberately not imported.
 *
 * ## ERA SIX'S WINDOW IS THE ONE THING THAT IS GENUINELY DIFFERENT
 *
 * Era one's crisis draws from era one, so its pool is one domain. D-CRISIS-14 gives era six the
 * current era plus the two behind it at 40 / 35 / 25 — renaissance, medieval and classical — and
 * `plague-questions.ts` does the whole apportionment. So the pool here spans FOUR authored
 * domains rather than one, and the eras are derived from the engine's own window rather than
 * written down: `plagueWindow` with an empty mastered set reports which eras the window reaches
 * and what each is worth, which is the only fact this module needs from it.
 *
 * **Two of era six's own six nodes have no items at this tip.** `POL.6` and `POL.7` are
 * graph-reading lessons and the bank authors nothing for either, so era six contributes four
 * nodes to its own 40 percent share. That is a content gap rather than a bug here, it is
 * measured in `plagueItems.test.ts` rather than asserted, and `composePlagueBatch` already drops
 * a node the pool cannot serve — so the batch reallocates instead of refusing.
 *
 * ## The draw is seeded, never random
 *
 * `plagueBatchFor` derives its stream from the encounter and the cycle through the engine's own
 * `createSeededRng`, and `composePlagueBatch` requires a stream with no fallback. There is no
 * unseeded path and — more to the point — no temptation to reach for a timestamp as a seed, which
 * is what lets `test/plagueTopology.test.ts` sweep this file for a clock read and mean it.
 */

/**
 * The eras D-CRISIS-14's window reaches for era six, current era first.
 *
 * Derived from the engine rather than restated: an empty mastered set gives every bucket an
 * empty node list and leaves the eras and the shares intact, which is exactly the half this
 * module needs. A retune of `PLAGUE.window.eras_back` moves this with no edit here.
 */
export const PLAGUE_WINDOW_ERAS: readonly EraId[] = plagueWindow({ mastered: [] }).map(
  (bucket) => bucket.era,
);

/**
 * Every node the window can offer, current era first, in each era's own authored order.
 *
 * This is the order the dev panel's chips walk and the order an eligible set is reported in, so
 * a set is stable under whatever order the caller's progress happens to arrive in.
 */
export const PLAGUE_NODE_ORDER: readonly string[] = PLAGUE_WINDOW_ERAS.flatMap(
  (era) => getEraOrThrow(era).nodes,
);

/** Which era of the window a node belongs to, for the read-out that reports the realised mix. */
const ERA_OF_NODE: ReadonlyMap<string, EraId> = new Map(
  PLAGUE_WINDOW_ERAS.flatMap((era) =>
    getEraOrThrow(era).nodes.map((nodeId) => [nodeId, era] as const),
  ),
);

export function plagueEraOfNode(nodeId: string): EraId | undefined {
  return ERA_OF_NODE.get(nodeId);
}

/**
 * Every gradable practice instance inside era six's window, as a batch candidate.
 *
 * `practiceItemsById` is the lesson surfaces' own registry of served instances — the D1 pool
 * plus every product-checker pool — and it is registered with the versioned checker at import
 * time, so anything drawn from here is gradable by the same runtime a lesson would use. Filtered
 * to the window because a candidate outside it is one `composePlagueBatch` would drop anyway,
 * and a pool the size of the whole bank makes the dev read-out unreadable.
 */
export const PLAGUE_ITEM_POOL: readonly PlagueQuestionCandidate[] = [
  ...practiceItemsById.values(),
]
  .filter((item) => ERA_OF_NODE.has(item.node_id))
  .map((item) => ({
    item_version_id: item.item_version_id,
    node_id: item.node_id,
    prompt: item.prompt,
  }));

/** The window nodes the pool can actually serve, in {@link PLAGUE_NODE_ORDER}'s order. */
export const PLAGUE_SERVED_NODES: readonly string[] = PLAGUE_NODE_ORDER.filter((nodeId) =>
  PLAGUE_ITEM_POOL.some((candidate) => candidate.node_id === nodeId),
);

/** How many of the pool's items a given eligible set can serve. */
function poolDepth(nodeIds: readonly string[]): number {
  const eligible = new Set(nodeIds);
  return PLAGUE_ITEM_POOL.filter((candidate) => eligible.has(candidate.node_id)).length;
}

/** Where a cycle's questions are coming from, which is not always the practised set. */
export type PlagueDrawSource = "practised" | "window";

export interface PlagueDrawSet {
  /** The nodes the batch will draw from, in {@link PLAGUE_NODE_ORDER}'s order. */
  readonly nodeIds: readonly string[];
  readonly source: PlagueDrawSource;
}

/**
 * WHICH SKILLS THIS LEARNER HAS DONE, narrowed to era six's window.
 *
 * What *"done"* means is `lessonProgress.completedNodeIdsFrom` — one finished practice set —
 * which is the module the repository keeps so no surface invents its own answer. The narrowing
 * is not defensive tidiness: a learner who practised a node era six's window does not reach
 * would otherwise be counted as eligible and the composer would refuse a cycle for a pool it was
 * never going to serve.
 */
export function plagueEligibleNodesFromIds(
  practisedNodeIds: readonly string[],
): readonly string[] {
  const practised = new Set(practisedNodeIds);
  return PLAGUE_NODE_ORDER.filter((nodeId) => practised.has(nodeId));
}

export function plagueEligibleNodes(
  nodeStates: readonly { node_id: string; mastery: Mastery }[],
): readonly string[] {
  return plagueEligibleNodesFromIds(completedNodeIdsFrom(nodeStates));
}

/**
 * WHAT A CYCLE ASKS ABOUT WHEN THE PRACTISED SET CANNOT FILL A BATCH: era six's whole window,
 * rather than nothing at all.
 *
 * The same fallback `winterDrawSetFromIds` makes and for the same reason: the dev entry is
 * reachable below the trigger on purpose, so an empty practised set is a state the game routes a
 * reviewer into, and a fresh install is exactly the state a demo machine is in. It draws the
 * questions and **it grants no evidence** — nothing here writes a node state or touches the
 * mastery service.
 *
 * The threshold is the POOL's depth rather than a node count, because a whole batch can come from
 * one node: so one practised lesson keeps drawing from that lesson, and only a set the pool
 * genuinely cannot serve falls back. The source comes back beside the ids because the surface owes
 * the player a sentence about it, and one expression deciding the draw and the disclosure together
 * is what stops the two disagreeing.
 */
export function plagueDrawSetFromIds(practisedNodeIds: readonly string[]): PlagueDrawSet {
  const practised = plagueEligibleNodesFromIds(practisedNodeIds);
  return poolDepth(practised) >= PLAGUE.cycle.batch_size
    ? { nodeIds: practised, source: "practised" }
    : { nodeIds: PLAGUE_SERVED_NODES, source: "window" };
}

/**
 * The same set read from the saved dev session — the one place era six's surface touches
 * progress storage.
 *
 * Synchronous, which is a property of the store rather than a convenience: `devSessionStore
 * .load()` parses the saved blob and hands it back, so the surface needs no loading state and no
 * effect. It reads and never writes; era six has no path to progress at all.
 */
export function loadPlagueEligibleNodes(): readonly string[] {
  return plagueEligibleNodes(devSessionStore.load()?.node_states ?? []);
}

/**
 * Draw one cycle's batch. Deterministic in `(encounter, cycle)`, so cycle three of encounter two
 * always asks the same three questions and a retune can be compared against the same play.
 */
export function plagueBatchForCycle(input: {
  readonly masteredNodeIds: readonly string[];
  readonly encounter: number;
  readonly cycle: number;
}): PlagueBatchComposition {
  return plagueBatchFor({
    mastered: input.masteredNodeIds,
    pool: PLAGUE_ITEM_POOL,
    encounter: input.encounter,
    cycle: input.cycle,
  });
}

/** The frozen item behind a drawn prompt — the answer control needs its answer spec. */
export function plagueFrozenItem(itemVersionId: string): FrozenItem | undefined {
  return practiceItemsById.get(itemVersionId);
}

/**
 * Grade one answer through the authoritative checker. The verdict is the one a lesson would
 * record; the difference is that nothing records it.
 *
 * `correct: null` means the reader could not READ the answer, so there is no verdict to
 * bank and the question stays live. All four crisis surfaces share one implementation now
 * (`../lessons/crisisAnswer.ts`), because four copies of `.client_correct` are what let
 * `invalid_input` be banked as a wrong answer on all four.
 *
 * A widget payload passes through as-is, exactly as `LessonPractice` does: the checker's
 * `raw_answer` takes a string or a structured payload and dispatches on the item's answer type.
 */
export function gradePlagueAnswer(
  itemVersionId: string,
  rawAnswer: string | Record<string, unknown>,
): GradedCrisisAnswer {
  return gradeCrisisAnswer(itemVersionId, rawAnswer);
}
