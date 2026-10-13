import { ERA_SEQUENCE, type EraId, getEraOrThrow } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";

import type { CityDevSeed } from "../city/citySession";
import { eraIslandBuildableRadius } from "../city/islandLand";
import type { RoadCell } from "../city/roads";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import {
  defaultPlacements,
  footprintCells,
  footprintFor,
  isCellBuildable,
  type PlacedTransform,
} from "../city/worldLayout";

export const SHOWCASE_FOCUS_NODE = "LIN.1";
const STUDENT_ID = "showcase-v1";
const PRACTICED_AT = "2026-08-09T12:00:00.000Z";
const BRONZE_ERA: EraId = "bronze_age";
const BRONZE_NODES = getEraOrThrow(BRONZE_ERA).nodes;

export type ShowcaseCityScenarioId =
  | "bronze-city"
  | "progress-foundation"
  | "progress-construction"
  | "progress-mastered"
  | "economy-city";

export interface ShowcaseCitySeed extends CityDevSeed {
  readonly nodeStates: readonly StudentNodeState[];
  readonly placements: readonly PlacedTransform[];
  readonly townHall: PlacedTransform;
}

export interface ShowcaseCityFixture {
  readonly eraId: EraId;
  readonly focusNodeId: string | null;
  readonly seed: ShowcaseCitySeed;
}

function nodeState(nodeId: string, over: Partial<StudentNodeState> = {}): StudentNodeState {
  return {
    student_id: STUDENT_ID,
    node_id: nodeId,
    placement_estimate: 0,
    mastery: 0,
    mastery_updated_at: null,
    completion_status: "locked",
    lesson_stage: "not_started",
    last_practiced_at: null,
    ...over,
  };
}

function mastered(nodeId: string): StudentNodeState {
  return nodeState(nodeId, {
    placement_estimate: 2,
    mastery: 2,
    mastery_updated_at: PRACTICED_AT,
    completion_status: "complete",
    lesson_stage: "done",
    last_practiced_at: PRACTICED_AT,
  });
}

function erasBefore(eraId: EraId): readonly string[] {
  const at = ERA_SEQUENCE.findIndex((era) => era.id === eraId);
  return ERA_SEQUENCE.slice(0, Math.max(0, at)).flatMap((era) => era.nodes);
}

function hall(): PlacedTransform {
  return { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };
}

function placementsFor(
  eraId: EraId,
  nodeIds: readonly string[],
): readonly PlacedTransform[] {
  return defaultPlacements(nodeIds, [hall()], eraIslandBuildableRadius(eraId));
}

function bronzeStates(
  focus?: "foundation" | "construction" | "mastered",
): readonly StudentNodeState[] {
  const own = BRONZE_NODES.map((nodeId, index) => {
    if (nodeId === SHOWCASE_FOCUS_NODE && focus === "construction") {
      return nodeState(nodeId, {
        placement_estimate: 1,
        completion_status: "in_progress",
        lesson_stage: "practice",
      });
    }
    if (nodeId === SHOWCASE_FOCUS_NODE && focus === "mastered") {
      return mastered(nodeId);
    }
    if (focus !== undefined) {
      return nodeState(nodeId, {
        placement_estimate: nodeId === SHOWCASE_FOCUS_NODE ? 1 : 0,
      });
    }
    switch (index) {
      case 0:
        return nodeState(nodeId, { placement_estimate: 1 });
      case 1:
        return mastered(nodeId);
      case 2:
        return nodeState(nodeId, {
          placement_estimate: 2,
          mastery: 1,
          mastery_updated_at: PRACTICED_AT,
          completion_status: "in_progress",
          lesson_stage: "done",
          last_practiced_at: PRACTICED_AT,
        });
      case 3:
        return nodeState(nodeId, {
          placement_estimate: 1,
          completion_status: "in_progress",
          lesson_stage: "practice",
          last_practiced_at: PRACTICED_AT,
        });
      default:
        return nodeState(nodeId, {
          placement_estimate: 1,
          completion_status: "in_progress",
          lesson_stage: "teaching",
        });
    }
  });
  return [...erasBefore(BRONZE_ERA).map(mastered), ...own];
}

/** Pick valid, unoccupied road cells deterministically from the era-one disc. */
function economyRoads(placements: readonly PlacedTransform[]): readonly RoadCell[] {
  const blocked = new Set<string>();
  for (const placed of [hall(), ...placements]) {
    for (const cell of footprintCells(placed, footprintFor(placed.nodeId))) {
      blocked.add(cell);
    }
  }
  const roads: RoadCell[] = [];
  const radius = eraIslandBuildableRadius("prehistoric");
  for (let row = -7; row <= 7 && roads.length < 12; row += 1) {
    for (let col = -7; col <= 7 && roads.length < 12; col += 1) {
      if (isCellBuildable(col, row, radius) && !blocked.has(`${col},${row}`)) {
        roads.push({ col, row });
      }
    }
  }
  return roads;
}

/**
 * Rebuild one disposable city from authored data on every call. No storage is read, and every
 * array/object is fresh so navigation Back/Forward cannot retain a mutation from another beat.
 */
export function buildShowcaseCityFixture(
  scenarioId: ShowcaseCityScenarioId,
): ShowcaseCityFixture {
  if (scenarioId === "economy-city") {
    const nodes = getEraOrThrow("prehistoric").nodes;
    const placements = placementsFor("prehistoric", nodes);
    return {
      eraId: "prehistoric",
      focusNodeId: "NUM.S",
      seed: {
        nodeStates: nodes.map(mastered),
        placements,
        townHall: hall(),
        roads: economyRoads(placements),
      },
    };
  }

  const focus =
    scenarioId === "progress-foundation"
      ? "foundation"
      : scenarioId === "progress-construction"
        ? "construction"
        : scenarioId === "progress-mastered"
          ? "mastered"
          : undefined;
  return {
    eraId: BRONZE_ERA,
    focusNodeId: SHOWCASE_FOCUS_NODE,
    seed: {
      nodeStates: bronzeStates(focus),
      placements: placementsFor(BRONZE_ERA, BRONZE_NODES),
      townHall: hall(),
    },
  };
}
