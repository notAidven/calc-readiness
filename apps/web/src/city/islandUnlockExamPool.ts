import type { FrozenItem } from "@cr/item-bank";
import { type EraId, getEraOrThrow } from "@cr/skill-graph";

import { interleavedPoolItems } from "../lessons/interleavedPool";

export type IslandUnlockExamPool =
  | {
      readonly status: "ready";
      readonly era: EraId;
      readonly items: readonly FrozenItem[];
      readonly skillIds: readonly string[];
    }
  | {
      readonly status: "unavailable";
      readonly era: EraId;
      readonly items: readonly FrozenItem[];
      readonly skillIds: readonly string[];
      readonly missingSkillIds: readonly string[];
      readonly message: string;
    };

/**
 * Build the complete current-island question pool, refusing when even one skill cannot
 * be served. Implemented after the behavior-first population tests establish its boundary.
 */
export function islandUnlockExamPool(
  eraId: EraId,
  source?: readonly FrozenItem[],
): IslandUnlockExamPool {
  const era = getEraOrThrow(eraId);
  const nodes = new Set(era.nodes);
  const items = (source ?? interleavedPoolItems(eraId, "all")).filter((item) =>
    nodes.has(item.node_id),
  );
  const represented = new Set(items.map((item) => item.node_id));
  const skillIds = era.nodes.filter((nodeId) => represented.has(nodeId));
  const missingSkillIds = era.nodes.filter((nodeId) => !represented.has(nodeId));
  if (missingSkillIds.length > 0) {
    return {
      status: "unavailable",
      era: eraId,
      items,
      skillIds,
      missingSkillIds,
      message: `The ${era.name} unlock exam is unavailable because these island skills have no questions: ${missingSkillIds.join(
        ", ",
      )}. Your progress is unchanged.`,
    };
  }
  return { status: "ready", era: eraId, items, skillIds };
}
