import { GOLD_MASTERY } from "@cr/mastery-service";
import { ERA_SEQUENCE, type EraId, getEraOrThrow } from "@cr/skill-graph";

import type { ArchipelagoSession } from "../archipelago/archipelagoSession";
import { type RoadCell, roadCellKey } from "../city/roads";
import type { PlacedTransform } from "../city/worldLayout";
import {
  presenterFocusNodeId,
  presenterIsland,
  presenterUnbuiltNodeId,
} from "./presenterFixtures";

export interface PresenterEraBuildPlan {
  readonly eraId: EraId;
  /** Retained, placed lesson-shortcut focus in the same gold state as every seeded skill. */
  readonly focusNodeId: string;
  /** The current-era skill deliberately left unplaced and untouched for the live loop. */
  readonly unbuiltNodeId: string;
  readonly completedNodeIds: readonly string[];
  readonly skillPlacements: readonly PlacedTransform[];
  readonly civicPlacements: readonly PlacedTransform[];
  readonly roadCells: readonly RoadCell[];
}

export interface PresenterEraBuildResult {
  readonly eraId: EraId;
  readonly skillCount: number;
  readonly civicCount: number;
  readonly roadCount: number;
}

export function presenterEraBuildPlan(eraId: EraId): PresenterEraBuildPlan {
  const era = getEraOrThrow(eraId);
  const focusNodeId = presenterFocusNodeId(eraId);
  const unbuiltNodeId = presenterUnbuiltNodeId(eraId);
  const globalTargets = new Set(
    ERA_SEQUENCE.map((candidate) => presenterUnbuiltNodeId(candidate.id)),
  );
  const completedNodeIds = ERA_SEQUENCE.flatMap((candidate) =>
    candidate.nodes.filter((nodeId) => !globalTargets.has(nodeId)),
  );
  const island = presenterIsland(eraId);
  const ownPlaced = island.layout.placements.filter((placement) =>
    era.nodes.includes(placement.nodeId),
  );
  if (ownPlaced.length !== era.nodes.length - 1) {
    throw new Error(`Presenter could not seat the complete ${era.name} fixture.`);
  }
  return {
    eraId,
    focusNodeId,
    unbuiltNodeId,
    completedNodeIds,
    skillPlacements: island.layout.placements,
    civicPlacements: island.layout.civic,
    roadCells: island.layout.roads,
  };
}

export async function buildPresenterEra(
  session: ArchipelagoSession,
  eraId: EraId,
): Promise<PresenterEraBuildResult> {
  const plan = presenterEraBuildPlan(eraId);
  await session.completeEraForPresenter(plan);
  const built = await session.load();
  const placements = new Set((built.placements ?? []).map((placement) => placement.nodeId));
  const civic = new Set((built.civic ?? []).map((placement) => placement.nodeId));
  const unbuiltState = built.node_states.find(
    (candidate) => candidate.node_id === plan.unbuiltNodeId,
  );
  if (
    placements.has(plan.unbuiltNodeId) ||
    !unbuiltState ||
    unbuiltState.mastery !== 0 ||
    unbuiltState.lesson_stage !== "not_started" ||
    unbuiltState.completion_status !== "locked"
  ) {
    throw new Error(
      `Presenter failed to keep target "${plan.unbuiltNodeId}" unbuilt and available.`,
    );
  }
  for (const placement of plan.skillPlacements) {
    const state = built.node_states.find(
      (candidate) => candidate.node_id === placement.nodeId,
    );
    if (!placements.has(placement.nodeId) || !state) {
      throw new Error(`Presenter failed to place skill "${placement.nodeId}".`);
    }
    if (
      state.mastery !== GOLD_MASTERY ||
      state.lesson_stage !== "done" ||
      state.completion_status !== "complete"
    ) {
      throw new Error(`Presenter failed to ready skill "${placement.nodeId}".`);
    }
  }
  for (const placement of plan.civicPlacements) {
    if (!civic.has(placement.nodeId)) {
      throw new Error(`Presenter failed to build civic "${placement.nodeId}".`);
    }
  }
  const builtRoads = new Set(
    (built.roads ?? []).map((cell) => roadCellKey(cell.col, cell.row)),
  );
  if (
    builtRoads.size !== plan.roadCells.length ||
    plan.roadCells.some((cell) => !builtRoads.has(roadCellKey(cell.col, cell.row)))
  ) {
    throw new Error(`Presenter failed to restore the ${eraId} road network.`);
  }
  return {
    eraId,
    skillCount: getEraOrThrow(eraId).nodes.length,
    civicCount: plan.civicPlacements.length,
    roadCount: plan.roadCells.length,
  };
}
