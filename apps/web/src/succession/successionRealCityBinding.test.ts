import {
  createSuccession,
  successionDistrictsForRoster,
  SUCCESSION_LIVE_CITY_BOARD,
  SUCCESSION_MAX_CITY_WARDS,
  successionReducer,
} from "@cr/game";
import { describe, expect, it } from "vitest";

import { createCityDevSession } from "../city/citySession";
import { successionAftermathBoard } from "../city/three/SuccessionInCity";
import { TOWN_HALL_ID } from "../city/townHall";
import { successionCityRoster } from "./successionCity";
import { createLocalSuccessionSession } from "./successionSession";

const ACTUAL_PLACEMENTS = [
  { nodeId: "POL.1", col: -4, row: -3, rot: 0 },
  { nodeId: "POL.2", col: 3, row: -3, rot: 1 },
  { nodeId: "POL.3", col: -3, row: 3, rot: 2 },
] as const;

describe("Succession launched for a real city session", () => {
  it("bounds a large city without inventing or duplicating a placement", () => {
    const roster = Array.from({ length: SUCCESSION_MAX_CITY_WARDS + 4 }, (_, index) => ({
      placement_id: `placed-${String(index).padStart(2, "0")}`,
      label: `Building ${index}`,
      suspendable: false,
    }));
    const districts = successionDistrictsForRoster(roster);
    expect(districts).toHaveLength(SUCCESSION_MAX_CITY_WARDS);
    expect(new Set(districts.map((district) => district.civic.placement_id)).size).toBe(
      SUCCESSION_MAX_CITY_WARDS,
    );
    expect(
      districts.every((district) =>
        roster.some((member) => member.placement_id === district.civic.placement_id),
      ),
    ).toBe(true);
  });

  it("binds every crisis ward to a stable placement that actually stands in that city", async () => {
    const city = createCityDevSession(undefined, { placements: ACTUAL_PLACEMENTS });
    const loaded = await city.load();
    const actual = new Set([
      ...(loaded.placements ?? []).map((placement) => placement.nodeId),
      loaded.town_hall?.nodeId ?? TOWN_HALL_ID,
    ]);
    expect(actual.size).toBeGreaterThanOrEqual(4);
    const roster = successionCityRoster({
      placements: loaded.placements ?? [],
      townHall: loaded.town_hall ?? null,
      civic: loaded.civic ?? [],
    });

    const succession = createLocalSuccessionSession({ storage: null });
    const started = await succession.command({
      type: "start",
      binding: "city",
      districts: roster.districts,
    });
    const bound = new Set(
      started.battle?.state.districts.map((district) => district.civic.placement_id) ?? [],
    );

    expect(
      bound,
      "the crisis still opens on authored stand-ins instead of the city session's placements",
    ).toEqual(actual);
  });

  it("reloads the same real placement roster from local battle persistence", async () => {
    const city = createCityDevSession(undefined, { placements: ACTUAL_PLACEMENTS });
    const loaded = await city.load();
    const roster = successionCityRoster({
      placements: loaded.placements ?? [],
      townHall: loaded.town_hall ?? null,
      civic: loaded.civic ?? [],
    });
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const first = createLocalSuccessionSession({ storage });
    await first.command({
      type: "start",
      binding: "city",
      districts: roster.districts,
    });

    const reloaded = await createLocalSuccessionSession({ storage }).load();
    expect(reloaded.battle?.state.board).toBe(SUCCESSION_LIVE_CITY_BOARD);
    expect(
      reloaded.battle?.state.districts.map((district) => district.civic.placement_id),
    ).toEqual(roster.districts.map((district) => district.civic.placement_id));
  });

  it("round-trips the bound roster and rebuilds its settled markers after reload", async () => {
    const city = createCityDevSession(undefined, { placements: ACTUAL_PLACEMENTS });
    const loaded = await city.load();
    const roster = successionCityRoster({
      placements: loaded.placements ?? [],
      townHall: loaded.town_hall ?? null,
      civic: loaded.civic ?? [],
    });
    let state = createSuccession({
      boardId: SUCCESSION_LIVE_CITY_BOARD,
      districts: roster.districts,
    });
    while (state.phase !== "settled") {
      if (state.phase === "ready") {
        state = successionReducer(state, { type: "start_batch" });
      } else if (state.phase === "answering") {
        state = successionReducer(state, {
          type: "resolve_batch",
          correct: 0,
          asked: 3,
        });
      } else {
        state = successionReducer(state, { type: "finish_response" });
      }
    }

    const aftermath = successionAftermathBoard(state, roster);
    expect(aftermath).not.toBeNull();
    expect(aftermath?.boundPlacementIds).toEqual(
      new Set(roster.bindings.map((binding) => binding.placement.nodeId)),
    );
    const marked = new Set<string>();
    aftermath?.layer.traverse((object) => {
      if (typeof object.userData.placementId === "string") {
        marked.add(object.userData.placementId);
      }
    });
    expect(marked).toEqual(aftermath?.boundPlacementIds);
  });
});
