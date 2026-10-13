import { CRISIS_MASTERY_GATE, relayEntry } from "@cr/game";
import { getEraOrThrow } from "@cr/skill-graph";
import type { StudentNodeState, UUID } from "@cr/state-schema";

import type { CityDevSeed } from "../city/citySession";
import { civicPlacementId } from "../city/civic";
import { TOWN_HALL_ID } from "../city/townHall";

const PREVIEW_STUDENT = "demo-student" as UUID;
const INFORMATION_NODES = getEraOrThrow("information_age").nodes;
const TRIGGER_NODES = new Set(relayEntry().node_ids);

function nodeState(nodeId: string): StudentNodeState {
  const ready = TRIGGER_NODES.has(nodeId);
  return {
    student_id: PREVIEW_STUDENT,
    node_id: nodeId,
    placement_estimate: ready ? 3 : 0,
    mastery: ready ? CRISIS_MASTERY_GATE : 0,
    mastery_updated_at: null,
    completion_status: ready ? "complete" : "in_progress",
    lesson_stage: ready ? "done" : "not_started",
    last_practiced_at: ready ? "2026-08-10T00:00:00.000Z" : null,
  };
}

/**
 * The disposable city behind canonical `?intrusion`.
 *
 * Every coordinate is a legitimate CitySurface placement already exercised by the production
 * frame suite. The seed contains the real midpoint mastery gate, the Town Hall, and the one civic
 * placement the live crisis requires. It grants no result from the crisis and writes nowhere.
 */
export const INTRUSION_PREVIEW_CITY: CityDevSeed = {
  nodeStates: INFORMATION_NODES.map(nodeState),
  placements: [
    { nodeId: INFORMATION_NODES[0] as string, col: -5, row: -4, rot: 0 },
    { nodeId: INFORMATION_NODES[1] as string, col: -1, row: -5, rot: 0 },
    { nodeId: INFORMATION_NODES[2] as string, col: 4, row: -4, rot: 0 },
    { nodeId: INFORMATION_NODES[3] as string, col: -5, row: 2, rot: 0 },
    { nodeId: INFORMATION_NODES[4] as string, col: 0, row: 4, rot: 0 },
    { nodeId: INFORMATION_NODES[5] as string, col: 5, row: 2, rot: 0 },
  ],
  townHall: { nodeId: TOWN_HALL_ID, col: 3, row: 0, rot: 0 },
  civic: [
    {
      nodeId: civicPlacementId("information_age_food_warehouse", 1),
      col: -1,
      row: 0,
      rot: 0,
    },
  ],
};
