import { type EraId, getEraOfNode } from "@cr/skill-graph";

/** Permanent visual era for a skill building, derived rather than persisted. */
export function skillBuildingHomeEra(nodeId: string): EraId | null {
  return getEraOfNode(nodeId)?.id ?? null;
}
