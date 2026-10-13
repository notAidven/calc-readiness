import { DIAGNOSTIC_MASTERY_PLACEMENT_GATE } from "@cr/game";
import type { PlacementEstimate } from "@cr/state-schema";

/** The pretest's per-node placement seeds, handed to the city on completion. */
export type PlacementSeed = Readonly<Record<string, PlacementEstimate>>;

/**
 * A diagnostic PASS under the test-out model: placement >= 2 (measured non-robust
 * = 2, measured robust = 3, or graph-inferred = 2). Placement 0/1 still needs the
 * lesson before it counts as mastered.
 */
export const UNLOCK_PLACEMENT_THRESHOLD = DIAGNOSTIC_MASTERY_PLACEMENT_GATE;

/**
 * WHAT A COMPLETED PRETEST ADMINISTERED, AND WHICH OF IT PASSED — read off one object,
 * so a surface reporting "you tested out of N of M" cannot take N and M from two
 * different sets.
 *
 * That is not a hypothetical. The city's reward screen took its numerator from the
 * tested-out list and its denominator from `D1_NODE_IDS` (`getNodesByScope("mvp")`, era
 * one's six buildings). While the diagnostic administered exactly those six the two
 * agreed by coincidence and the seam was invisible; the moment the instrument widened to
 * `DIAGNOSTIC_WALK_SCOPE`'s twenty nodes it read **"You tested out of 2 of 6 skills!"** to
 * a learner who had tested out of 4 of 20 — wrong on BOTH halves, because a tested-out
 * node outside era one was silently filtered out of the numerator as well.
 *
 * `assessed` is every node the administration placed, in the order the placement records
 * them, which is the walk scope's own TEACHING order (prerequisites first) — the walk
 * places its whole scope, not only the nodes it probed, so this is the roster that was
 * actually administered rather than the subset that happened to be asked.
 */
export interface PretestRosters {
  /** Every node the administration placed — the roster the learner was measured over. */
  readonly assessed: readonly string[];
  /** Those of them that passed (placement >= {@link UNLOCK_PLACEMENT_THRESHOLD}). */
  readonly testedOut: readonly string[];
}

/**
 * Split one placement into the roster it was taken over and the part of it that passed.
 *
 * Both halves come from a single `Object.entries` pass, which is the whole point: the two
 * numbers on the reward screen's headline are `testedOut.length` and `assessed.length`,
 * and there is no second source available for either of them.
 */
export function pretestRostersFromPlacement(placement: PlacementSeed): PretestRosters {
  const entries = Object.entries(placement);
  return {
    assessed: entries.map(([nodeId]) => nodeId),
    testedOut: entries
      .filter(([, level]) => level >= UNLOCK_PLACEMENT_THRESHOLD)
      .map(([nodeId]) => nodeId),
  };
}

/**
 * The node ids a completed pretest UNLOCKS — every skill whose placement passed
 * (>= 2). Under test-out these buildings drop into the city already built; 0/1
 * nodes still start from the lesson.
 */
export function unlockedNodeIdsFromPlacement(placement: PlacementSeed): string[] {
  return [...pretestRostersFromPlacement(placement).testedOut];
}
