import { NO_CRISIS_DAMAGE } from "@cr/game";
import { describe, expect, it } from "vitest";

import { MOCK_CITY_LOAD } from "./city/mockCity";
import {
  CRISIS_CAPABILITY_ENABLED_VALUE,
  resolveCrisisCapability,
  withoutCrisisState,
} from "./crisisCapability";

describe("the canonical crisis capability", () => {
  it("fails closed for ordinary production and accepts only the documented release value", () => {
    const ordinary = (value?: string) =>
      resolveCrisisCapability({
        runtimeMode: "account",
        explicitReviewRoute: true,
        env: { DEV: false, VITE_CRISIS_CAPABILITY: value },
      });

    expect(ordinary()).toEqual({ enabled: false, source: "disabled" });
    expect(ordinary("true")).toEqual({ enabled: false, source: "disabled" });
    expect(ordinary("ENABLED")).toEqual({ enabled: false, source: "disabled" });
    expect(ordinary(CRISIS_CAPABILITY_ENABLED_VALUE)).toEqual({
      enabled: true,
      source: "ordinary-release",
    });
  });

  it("keeps only an explicit local review route opted in", () => {
    expect(
      resolveCrisisCapability({
        runtimeMode: "local",
        explicitReviewRoute: false,
        env: { DEV: true },
      }),
    ).toEqual({ enabled: false, source: "disabled" });
    expect(
      resolveCrisisCapability({
        runtimeMode: "local",
        explicitReviewRoute: true,
        env: { DEV: true },
      }),
    ).toEqual({ enabled: true, source: "explicit-review" });
  });

  it("leaves the exact demo capability enabled without the ordinary release value", () => {
    expect(
      resolveCrisisCapability({
        runtimeMode: "demo",
        explicitReviewRoute: false,
        env: { DEV: false },
      }),
    ).toEqual({ enabled: true, source: "demo" });
    expect(
      resolveCrisisCapability({
        runtimeMode: "demo",
        explicitReviewRoute: true,
        env: { DEV: false, VITE_CRISIS_CAPABILITY: "" },
      }),
    ).toEqual({ enabled: true, source: "demo" });
  });

  it("quarantines every island's damage without changing learning or layout", () => {
    const damaged = {
      ...MOCK_CITY_LOAD,
      crisis_damage: {
        next_damage_id: 2,
        ruined_buildings: [{ node_id: "NUM.2", damage_id: "d1" }],
        ruined_cells: [],
        suspended_civic: [],
        overwritten_records: [],
      },
      islands: [
        {
          era_id: "prehistoric" as const,
          placements: MOCK_CITY_LOAD.placements ?? [],
          roads: [],
          road_gold_spent: 0,
          town_hall: MOCK_CITY_LOAD.town_hall ?? null,
          civic: [],
          civic_material_spent: 0,
          crisis_damage: {
            next_damage_id: 2,
            ruined_buildings: [{ node_id: "NUM.2", damage_id: "d1" }],
            ruined_cells: [],
            suspended_civic: [],
            overwritten_records: [],
          },
        },
      ],
    };

    const projected = withoutCrisisState(damaged);
    expect(projected.crisis_damage).toEqual(NO_CRISIS_DAMAGE);
    expect(projected.islands?.[0]?.crisis_damage).toEqual(NO_CRISIS_DAMAGE);
    expect(projected.node_states).toBe(damaged.node_states);
    expect(projected.placements).toBe(damaged.placements);
    expect(damaged.crisis_damage.next_damage_id).toBe(2);
  });
});
