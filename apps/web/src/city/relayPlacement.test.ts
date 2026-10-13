import { NO_CRISIS_DAMAGE } from "@cr/game";
import { describe, expect, it } from "vitest";

import { civicPlacementId } from "./civic";
import { relayPlacement, standingRecordScars } from "./relayPlacement";

describe("the real-city Civic Archive Relay placement", () => {
  const distribution = {
    nodeId: civicPlacementId("information_age_food_warehouse", 1),
    col: 0,
    row: 0,
    rot: 0,
  };
  const condominium = {
    nodeId: civicPlacementId("information_age_residential_tower", 2),
    col: 3,
    row: 0,
    rot: 0,
  };

  it("chooses the approved 2x2 Distribution Center and refuses a 1x1 frontage", () => {
    expect(relayPlacement([condominium])).toBeNull();
    expect(relayPlacement([condominium, distribution])).toBe(distribution);
  });

  it("left-joins scars so a missing placement shows and prices nothing", () => {
    const damage = {
      ...NO_CRISIS_DAMAGE,
      next_damage_id: 2,
      overwritten_records: [
        {
          placement_id: distribution.nodeId,
          damage_id: "d1",
          bands_dark: 4,
          verification_attempted: false,
        },
      ],
    };
    expect(standingRecordScars(damage, [])).toEqual([]);
    expect(standingRecordScars(damage, [distribution])).toEqual(damage.overwritten_records);
  });
});
