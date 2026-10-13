import { civicCatalogueForEra } from "@cr/economy";
import {
  CRISIS_MASTERY_GATE,
  cityRosterNodeIds,
  midEraCrisisNodeIds,
  SUCCESSION_ERA,
} from "@cr/game";
import { getEraNodes } from "@cr/skill-graph";
import type { StudentNodeState, UUID } from "@cr/state-schema";
import type { CityDevSeed } from "../city/citySession";
import { civicPlacementId } from "../city/civic";
import { eraBuildableDiscRadius } from "../city/islandLand";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import { defaultPlacements, type PlacedTransform } from "../city/worldLayout";

/**
 * A fixed evidence timestamp for the disposable QA learner.
 *
 * The route is deterministic and writes only to its tab-scoped namespace, so there is no value
 * in making refreshes differ by wall-clock time. Non-null is the product fact that matters:
 * every node counted by the crisis trigger has actually reached practice.
 */
const PRACTICED_AT = "2026-08-10T00:00:00.000Z";
const QA_STUDENT_ID = "succession-qa" as UUID;

function nodeState(nodeId: string, practiced: boolean): StudentNodeState {
  return {
    student_id: QA_STUDENT_ID,
    node_id: nodeId,
    placement_estimate: practiced ? 3 : 0,
    mastery: practiced ? CRISIS_MASTERY_GATE : 0,
    mastery_updated_at: practiced ? PRACTICED_AT : null,
    completion_status: practiced ? "complete" : "in_progress",
    lesson_stage: practiced ? "done" : "not_started",
    last_practiced_at: practiced ? PRACTICED_AT : null,
  };
}

/**
 * The real learner-city state behind `/demo?succession`.
 *
 * This is a seed, not a second crisis launcher. The city still derives the standing mid-era
 * call from node state, the advisor still owns the handoff, and `SuccessionInCity` still binds
 * the engine to the placements supplied by the live city.
 *
 * - `cityRosterNodeIds` supplies the complete cumulative roster a Classical city offers.
 * - Every earlier-era node and exactly the Classical trigger prefix are practiced/mastered.
 * - Every roster member is placed on Classical authored land with the real Hall.
 * - One of each Classical civic row is placed, so the live battle includes suspendable wards.
 */
export function createSuccessionQaCitySeed(): CityDevSeed {
  const roster = [...cityRosterNodeIds(SUCCESSION_ERA)];
  const currentEra = new Set(getEraNodes(SUCCESSION_ERA));
  const trigger = new Set(midEraCrisisNodeIds(SUCCESSION_ERA));
  const nodeStates = roster.map((nodeId) =>
    nodeState(nodeId, !currentEra.has(nodeId) || trigger.has(nodeId)),
  );

  const townHall: PlacedTransform = {
    nodeId: TOWN_HALL_ID,
    ...TOWN_HALL_CENTER_TRANSFORM,
  };
  const civicIds = civicCatalogueForEra(SUCCESSION_ERA).map((row, index) =>
    civicPlacementId(row.id, index),
  );
  const civicSet = new Set(civicIds);
  const layout = defaultPlacements(
    [...roster, ...civicIds],
    [townHall],
    eraBuildableDiscRadius(SUCCESSION_ERA),
  );
  if (layout.length !== roster.length + civicIds.length) {
    throw new Error(
      "The Succession QA roster no longer fits the authored Classical island.",
    );
  }

  return {
    nodeStates,
    placements: layout.filter((placement) => !civicSet.has(placement.nodeId)),
    townHall,
    civic: layout.filter((placement) => civicSet.has(placement.nodeId)),
  };
}
