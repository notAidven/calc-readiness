import { NO_CRISIS_DAMAGE } from "@cr/game";
import type { UUID } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { loadCityFromAurora } from "./reads";
import { createFakeCluster } from "./test/fakeCluster";
import { type CityWrite, parseCityWrite, saveCityToAurora } from "./writes";

const STUDENT: UUID = "00000000-0000-4000-8000-0000000000aa";

const CIVIC = {
  nodeId: "civic:bronze_age_terraced_fields:2",
  col: 4,
  row: -3,
  rot: 1,
} as const;

function body(civic: readonly (typeof CIVIC)[] = [CIVIC]): Record<string, unknown> {
  return {
    placements: [],
    town_hall: null,
    civic,
    roads: [],
    road_gold_spent: 0,
    crisis_damage: NO_CRISIS_DAMAGE,
    era_id: "bronze_age",
    island_era: "bronze_age",
    current_island: "bronze_age",
  };
}

describe("authenticated civic city persistence", () => {
  it("parses, writes, and reads the canonical placement identity byte-for-byte", async () => {
    const parsed = parseCityWrite(body());
    expect(parsed).not.toHaveProperty("error");
    if ("error" in parsed) {
      throw new Error(parsed.error);
    }
    expect((parsed.city as CityWrite & { civic: readonly (typeof CIVIC)[] }).civic).toEqual(
      [CIVIC],
    );

    const cluster = createFakeCluster({
      city_island_state: [
        {
          student_id: STUDENT,
          island_era: "bronze_age",
          road_gold_spent: 0,
          civic_material_spent: 0,
          next_damage_ordinal: 1,
          reset_count: 0,
        },
      ],
    });
    await saveCityToAurora(cluster.db, STUDENT, parsed.city);
    const read = await loadCityFromAurora(cluster.db, STUDENT);

    expect((read as typeof read & { civic: readonly (typeof CIVIC)[] }).civic).toEqual([
      CIVIC,
    ]);
    expect(cluster.tables.city_placement).toContainEqual(
      expect.objectContaining({
        placement_id: CIVIC.nodeId,
        kind: "civic",
        subject_id: "bronze_age_terraced_fields",
        era_built: "bronze_age",
      }),
    );
  });

  it("rejects legacy short ids at the authenticated boundary", () => {
    const legacy = {
      ...CIVIC,
      nodeId: "civic:water_spring:2",
    };
    const parsed = parseCityWrite(body([legacy as typeof CIVIC]));

    expect(parsed).toHaveProperty("error");
    expect("error" in parsed ? parsed.error : "").toMatch(/canonical civic placement/i);
  });

  it("rejects the whole city read when placement id and subject id contradict", async () => {
    const cluster = createFakeCluster({
      city_placement: [
        {
          student_id: STUDENT,
          placement_id: "civic:bronze_age_terraced_fields:2",
          kind: "civic",
          subject_id: "bronze_age_weigh_house",
          grid_col: 4,
          grid_row: -3,
          rot: 1,
          era_built: "bronze_age",
          created_at: 1,
        },
      ],
    });

    await expect(loadCityFromAurora(cluster.db, STUDENT)).rejects.toThrow(
      /civic placement identity/i,
    );
  });
});
