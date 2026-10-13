import { ISLAND_UNLOCK_MASTERY_GATE } from "@cr/game";
import {
  buildEraTimeline,
  type EraId,
  type EraTimelineView as EraSequenceView,
  type EraTimelineEntry,
} from "@cr/skill-graph";
import type { Mastery, StudentNodeState } from "@cr/state-schema";

import { lessonByNode } from "../lessons/domains";

/**
 * **PER-ERA STANDING, MASTERED COUNT AND READINESS** — the ten eras from `@cr/skill-graph`,
 * plus the two facts only the app can answer: how far the learner has got, and how much of
 * each era exists yet.
 *
 * The split is deliberate. `packages/skill-graph` holds the sequence and the copy and
 * knows nothing about a student or an authored lesson; this module supplies both from
 * the app, so the package stays a description of the curriculum rather than of a save
 * file.
 *
 * ## ⚑ THE PANEL THIS FED IS CUT. THE DERIVATION IS KEPT ON PURPOSE.
 *
 * `EraTimeline.tsx` drew this as the ☰ Menu's **Timeline**, and the lead **cut it on
 * 2026-08-04** along with the Album, on the reasoning that the archipelago's overview
 * absorbs it. That reasoning is #568's own, at §8.8, and it is a claim about THIS module:
 * *"`eraTimelineView.ts` already computes per era exactly what the overview needs —
 * standing, mastered count, readiness — so the overview is the timeline drawn as
 * geography and `EraTimeline.tsx` should fold into it."* Its stage 1 reads *"lock state
 * and per-era mastery ... from `eraTimelineView.ts`"* by name.
 *
 * So the cut takes the panel and keeps the read model, and there is nothing provisional
 * about the keeping: **`masteredNodeIdsFrom` has a live production caller that never had
 * anything to do with the panel** — `CitySurface.tsx` hands it to `planCrisisSeed`, which
 * needs the same mastery bar for a completely different reason. Deleting this module would
 * have moved that function somewhere else and changed nothing but its address.
 *
 * `cityEraTimeline` itself is what stage 1 wants and has no caller until it lands;
 * `eraTimelineView.test.ts` drives it and pins its mastered count against
 * `islandUnlockEligibility` era by era.
 */

/**
 * The mastery a node must hold for the era model to count it as MASTERED.
 *
 * Imported from the island-unlock contract rather than copied. The timeline reports full
 * mastery per skill; eligibility separately requires 80% of this count.
 *
 * Note it is NOT `lessonProgress.ts`'s `PRACTICED_MASTERY` of 1. That answers "has this
 * learner practiced this", which is the right question for offering interleaved
 * practice and the wrong one for advancing a chapter.
 */
export const ERA_MASTERED_MASTERY: Mastery = ISLAND_UNLOCK_MASTERY_GATE;

/** The nodes this learner has MASTERED, whatever domain or era they sit in. */
export function masteredNodeIdsFrom(
  nodeStates: readonly { node_id: string; mastery: Mastery }[],
): readonly string[] {
  return nodeStates
    .filter((state) => state.mastery >= ERA_MASTERED_MASTERY)
    .map((state) => state.node_id);
}

/**
 * How much of an era a learner could actually play today.
 *
 * `ready` needs EVERY node of the era to have an authored lesson, because the era's own
 * gate is every skill mastered: an era missing one lesson is an era nobody can finish,
 * and calling it playable would be the more flattering answer rather than the true one.
 */
export type EraBuildState = "ready" | "partly_authored" | "unauthored";

/**
 * A row's `standing` of `complete` means EVERY SKILL MASTERED. That is the independent
 * completion/reward reading, not the 80% next-island eligibility gate.
 */
export interface EraTimelineRow extends EraTimelineEntry {
  /** How many of this era's nodes have an authored lesson in the registry. */
  readonly authoredCount: number;
  readonly buildState: EraBuildState;
}

/**
 * Move the marker onto the era the city is actually STANDING in.
 *
 * `buildEraTimeline` puts "you are here" on the first era not fully mastered, which was the
 * only answer available while there was no era state: the docblock on `EraTimelineRow` above
 * says as much — *"passing the trial is the actual advance (D-ERA5) and the trial has no
 * runner yet"*. There is one now (`eraState.ts`, and the ceremony that sets it), so mastery
 * is no longer the best evidence of which chapter the city is in, and leaving the marker on
 * mastery would put the timeline and the city in visible disagreement the moment somebody
 * advances with a node unmastered — which a dev-driven demo does on purpose.
 *
 * **Only `standing`, `currentEraId` and `currentNumber` move. Every `masteredCount` is left
 * exactly as the package computed it**, because those are facts about the learner and not
 * about the chapter, and the "N of 6 skills mastered" line has to stay true. So an era
 * behind the city reads `complete` in its standing and still reports honestly how much of it
 * was mastered — which is the right pair of statements for an era somebody advanced past
 * without finishing.
 *
 * The package's own derivation is deliberately not changed: `buildEraTimeline` describes the
 * curriculum against a set of mastered nodes and knows nothing about a save file, which is
 * the split `eraTimelineView.ts` exists to keep.
 */
function withLiveEra(
  view: EraSequenceView,
  liveEraId: EraId,
): Omit<EraSequenceView, "entries"> & { entries: readonly EraTimelineEntry[] } {
  const liveIndex = view.entries.findIndex((entry) => entry.era.id === liveEraId);
  if (liveIndex === -1) {
    return view;
  }

  return {
    ...view,
    currentEraId: liveEraId,
    currentNumber: liveIndex + 1,
    entries: view.entries.map((entry, index) => ({
      ...entry,
      standing:
        index < liveIndex
          ? "complete"
          : index === liveIndex
            ? "current"
            : ("ahead" as const),
    })),
    // `allComplete` stays the package's: it means every node of every era is mastered, which
    // is a claim about the learner. Standing in era ten is not the same as having finished
    // it, and conflating them would make the timeline's closing line arrive nine eras early.
  };
}

export interface CityEraTimeline extends Omit<EraSequenceView, "entries"> {
  readonly rows: readonly EraTimelineRow[];
  /**
   * How many eras a learner could play end to end. Well under half at the time of
   * writing, which is why anything drawing this should be designed around the number
   * being small rather than around it being large.
   */
  readonly readyCount: number;
}

/**
 * Which of an era's nodes have a lesson, read from the all-domains registry rather than
 * from a list kept here.
 *
 * That matters more than it looks. Most of the sequence is unwritten and the rest is
 * landing lesson by lesson; a hand-kept "which eras are done" table would be correct
 * for about a week and would then start lying in the direction that flatters us.
 * Reading `lessonByNode` means an era stops saying "still being built" on the day its
 * last lesson lands, with nothing for anyone to remember. Run
 * `eraTimelineView.test.ts` for where the counts stand at any given tip.
 */
function authoredCountFor(nodeIds: readonly string[]): number {
  return nodeIds.filter((nodeId) => lessonByNode[nodeId] !== undefined).length;
}

/**
 * Classify one era from two counts.
 *
 * **IT TAKES THE COUNTS RATHER THAN READING THEM, and D6 is why that is now the only way
 * to reach one of the three answers.** The Industrial era is the last one holding none of
 * its packs, and D6 (Functions, #422) writes five of its six. On the tree that PR and
 * `integration` make together, no era has zero, so `unauthored` stops being reachable
 * through the shipped sequence: a test that hunts the sequence for an era in that state
 * finds none, and every claim it could then make about one holds vacuously.
 *
 * The state is not gone from the product. It is the one every era in the sequence started
 * in, and it is where the next era anybody adds will start. Handed two counts, the branch
 * stays drivable from a test instead of rotting behind content with a passing suite beside
 * it — which is what keeps it available to whatever draws readiness next.
 *
 * This is `landBudgetRadius`'s shape in `packages/skill-graph/src/eras.ts`, adopted here
 * for the same reason it was adopted there.
 */
export function eraBuildStateFor(authored: number, total: number): EraBuildState {
  if (authored >= total) {
    return "ready";
  }
  return authored === 0 ? "unauthored" : "partly_authored";
}

/**
 * The whole timeline for a set of node states — the shape the cut `EraTimeline.tsx` used
 * to render, and the shape #568's overview screen is specified to read.
 *
 * Takes the raw states rather than pre-filtered ids so that the mastery bar is applied
 * in exactly one place; a caller hands over `CityLoad.node_states`.
 *
 * `liveEraId` is the era the city is standing in (`eraState.ts`). Omit it and the marker
 * falls back to the package's mastery derivation, which is what every caller did before era
 * state existed and is still the right answer for a caller that has no city to ask.
 */
export function cityEraTimeline(
  nodeStates: readonly StudentNodeState[],
  liveEraId?: EraId,
): CityEraTimeline {
  const derived = buildEraTimeline(masteredNodeIdsFrom(nodeStates));
  const sequence = liveEraId === undefined ? derived : withLiveEra(derived, liveEraId);

  const rows = sequence.entries.map((entry): EraTimelineRow => {
    const authoredCount = authoredCountFor(entry.era.nodes);
    return {
      ...entry,
      authoredCount,
      buildState: eraBuildStateFor(authoredCount, entry.nodeCount),
    };
  });

  return {
    currentEraId: sequence.currentEraId,
    currentNumber: sequence.currentNumber,
    masteredTotal: sequence.masteredTotal,
    allComplete: sequence.allComplete,
    rows,
    readyCount: rows.filter((row) => row.buildState === "ready").length,
  };
}
