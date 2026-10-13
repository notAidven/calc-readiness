import { MASTERY_BAR } from "@cr/mastery-service";
import { ERA_SEQUENCE, type EraId, getEraNodes } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";

/**
 * Pure island-unlock exam contract. Eligibility is a reading of the current island's
 * `ERA_SEQUENCE` nodes; the exam score is deliberately separate from mastery evidence.
 */

export const ISLAND_UNLOCK_MASTERY_RATIO = 0.8;
export const ISLAND_UNLOCK_MASTERY_GATE = MASTERY_BAR;
export const ISLAND_UNLOCK_POINTS_PER_SKILL = 2;
/** The diagnostic's canonical per-node mastery boundary: placement 2 or 3 is a pass. */
export const DIAGNOSTIC_MASTERY_PLACEMENT_GATE = 2;

export interface IslandUnlockEligibility {
  readonly era: EraId;
  readonly mastered: number;
  readonly total: number;
  readonly required: number;
  readonly eligible: boolean;
}

export interface IslandUnlockExamState {
  readonly era: EraId;
  readonly score: number;
  readonly target: number;
  readonly last_delta: 1 | -1 | null;
  readonly passed: boolean;
}

export type IslandUnlockExamEvent =
  | { readonly type: "correct" }
  | { readonly type: "wrong" }
  | { readonly type: "skip" };

function positiveSkillCount(skillCount: number): number {
  if (!Number.isInteger(skillCount) || skillCount <= 0) {
    throw new Error("An island unlock exam needs a positive integer skill count.");
  }
  return skillCount;
}

export function islandUnlockMasteryRequirement(skillCount: number): number {
  return Math.ceil(positiveSkillCount(skillCount) * ISLAND_UNLOCK_MASTERY_RATIO);
}

export function islandUnlockEligibility(
  eraId: EraId,
  states: readonly StudentNodeState[],
): IslandUnlockEligibility {
  const nodes = getEraNodes(eraId);
  const masteryByNode = new Map(states.map((state) => [state.node_id, state.mastery]));
  const mastered = nodes.filter(
    (nodeId) => (masteryByNode.get(nodeId) ?? 0) >= ISLAND_UNLOCK_MASTERY_GATE,
  ).length;
  const required = islandUnlockMasteryRequirement(nodes.length);
  return {
    era: eraId,
    mastered,
    total: nodes.length,
    required,
    eligible: mastered >= required,
  };
}

export function islandUnlockTarget(skillCount: number): number {
  return positiveSkillCount(skillCount) * ISLAND_UNLOCK_POINTS_PER_SKILL;
}

export interface DiagnosticPlacementState {
  readonly node_id: string;
  readonly placement_estimate: number;
}

function diagnosticPlacementByNode(
  states: readonly DiagnosticPlacementState[],
): ReadonlyMap<string, number> {
  return new Map(states.map((state) => [state.node_id, state.placement_estimate]));
}

function eraMasteredFromPlacement(
  eraId: EraId,
  placementByNode: ReadonlyMap<string, number>,
): boolean {
  return getEraNodes(eraId).every(
    (nodeId) => (placementByNode.get(nodeId) ?? 0) >= DIAGNOSTIC_MASTERY_PLACEMENT_GATE,
  );
}

/** Whether every authored node in one era passed the diagnostic. Missing rows fail closed. */
export function diagnosticEraIsMastered(
  eraId: EraId,
  states: readonly DiagnosticPlacementState[],
): boolean {
  return eraMasteredFromPlacement(eraId, diagnosticPlacementByNode(states));
}

export interface DiagnosticEraPlacement {
  /** Mastered eras before the working destination. Always a contiguous prefix. */
  readonly masteredPrefix: readonly EraId[];
  /** Mastered prefix plus the first unmastered working destination, inclusively. */
  readonly unlockedPrefix: readonly EraId[];
  /** The first unmastered era, or era ten when every era is mastered. */
  readonly destinationEra: EraId;
  readonly allMastered: boolean;
}

/**
 * Read authoritative diagnostic evidence as one contiguous island placement.
 *
 * Unlocking is inclusive through the first unmastered era. Later non-monotonic evidence is
 * ignored after that first gap; if no gap exists, all authored eras are unlocked.
 */
export function diagnosticEraPlacement(
  states: readonly { readonly node_id: string; readonly placement_estimate: number }[],
): DiagnosticEraPlacement {
  const placementByNode = diagnosticPlacementByNode(states);
  const masteredPrefix: EraId[] = [];
  for (const era of ERA_SEQUENCE) {
    const mastered = eraMasteredFromPlacement(era.id, placementByNode);
    if (!mastered) {
      return {
        masteredPrefix,
        unlockedPrefix: [...masteredPrefix, era.id],
        destinationEra: era.id,
        allMastered: false,
      };
    }
    masteredPrefix.push(era.id);
  }
  const destinationEra = masteredPrefix.at(-1);
  if (destinationEra === undefined) {
    throw new Error("ERA_SEQUENCE is empty, so no diagnostic destination exists.");
  }
  return {
    masteredPrefix: masteredPrefix.slice(0, -1),
    unlockedPrefix: masteredPrefix,
    destinationEra,
    allMastered: true,
  };
}

/** The exact island prefix opened by authoritative diagnostic placement. */
export function diagnosticUnlockedEraPrefix(
  states: readonly DiagnosticPlacementState[],
): readonly EraId[] {
  return diagnosticEraPlacement(states).unlockedPrefix;
}

export function initialIslandUnlockExamState(eraId: EraId): IslandUnlockExamState {
  return {
    era: eraId,
    score: 0,
    target: islandUnlockTarget(getEraNodes(eraId).length),
    last_delta: null,
    passed: false,
  };
}

export function islandUnlockExamReducer(
  state: IslandUnlockExamState,
  event: IslandUnlockExamEvent,
): IslandUnlockExamState {
  if (state.passed) {
    return state;
  }
  if (event.type === "correct") {
    const score = Math.min(state.target, state.score + 1);
    return {
      ...state,
      score,
      last_delta: 1,
      passed: score >= state.target,
    };
  }
  return {
    ...state,
    score: Math.max(0, state.score - 1),
    last_delta: -1,
  };
}
