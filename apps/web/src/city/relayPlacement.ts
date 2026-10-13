import type { CrisisDamage, CrisisOverwrittenRecord } from "@cr/game";

import type { PlacedTransform } from "./worldLayout";
import { parseCivicPlacementId } from "./civic";

const PREFERRED_RELAY = "information_age_food_warehouse";

/**
 * Pick the real era-nine civic mass that can carry the 6.8-unit record panel.
 *
 * The Distribution Center wins when present; another Information Age placement is eligible
 * only at 2×2 or wider. A 1×1 frontage is deliberately refused rather than mounting an
 * unreadable nine-cell panel on it.
 */
export function relayPlacement(
  placements: readonly PlacedTransform[],
): PlacedTransform | null {
  const eligible = placements.filter((placement) => {
    const row = parseCivicPlacementId(placement.nodeId)?.row;
    return (
      row?.era === "information_age" && row.footprint.width >= 2 && row.footprint.depth >= 2
    );
  });
  return (
    eligible.find(
      (placement) => parseCivicPlacementId(placement.nodeId)?.row.id === PREFERRED_RELAY,
    ) ??
    eligible[0] ??
    null
  );
}

/** Left-join durable scars to civic placements the city actually holds. */
export function standingRecordScars(
  damage: CrisisDamage,
  placements: readonly PlacedTransform[],
): readonly CrisisOverwrittenRecord[] {
  const standing = new Set(placements.map((placement) => placement.nodeId));
  return (damage.overwritten_records ?? []).filter((record) =>
    standing.has(record.placement_id),
  );
}
