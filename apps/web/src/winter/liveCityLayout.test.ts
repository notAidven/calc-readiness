import { hardWinterIsland, winterCellKey, winterLayouts } from "@cr/game";
import { describe, expect, it } from "vitest";

import type { CityDevSnapshot } from "../city/citySession";
import { CURRENT_ERA_ID } from "../city/eraDressing";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../city/townHall";
import {
  BUILDABLE_RADIUS,
  defaultPlacements,
  type PlacedTransform,
} from "../city/worldLayout";
import { liveCityLayoutFrom } from "./liveCityLayout";

/**
 * READING THE PLAYER'S OWN CITY AS A WINTER BOARD.
 *
 * The authored layouts measure a tuning number across a range of cities. This reads the
 * one city that actually exists, so the number can be JUDGED rather than measured — and
 * the two claims that has to satisfy are that the board really is his layout, and that
 * playing a crisis over it cannot touch it.
 */

const D1 = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"] as const;

function snapshot(overrides: Partial<CityDevSnapshot> = {}): CityDevSnapshot {
  return {
    node_states: [],
    neighborhood_states: [],
    placements: [],
    roads: [],
    road_gold_spent: 0,
    town_hall: null,
    ...overrides,
  };
}

function at(nodeId: string, col: number, row: number): PlacedTransform {
  return { nodeId, col, row, rot: 0 };
}

describe("the live city becomes a winter board", () => {
  /**
   * The conversion is a RENAME, not a projection: both sides derive the same 88 cells from
   * the same authored radius at the same grid size, so a placement's cell means the same
   * thing on both boards. If that ever stopped being true this is where it would show.
   */
  it("puts every building on the cell the city has it on", () => {
    const placements = [at("NUM.S", 0, 0), at("NUM.F", 2, 2), at("NUM.5", 4, 0)];
    const result = liveCityLayoutFrom(snapshot({ placements }));
    if (result.status !== "ready") {
      throw new Error(result.message);
    }

    expect(result.layout.id).toBe("live");
    expect(result.layout.buildings).toEqual([
      { node_id: "NUM.S", col: 0, row: 0 },
      { node_id: "NUM.F", col: 2, row: 2 },
      { node_id: "NUM.5", col: 4, row: 0 },
    ]);
    // And the rotation is dropped rather than carried, because the winter models a
    // building as the one cell it is anchored on and has no notion of facing.
    expect(Object.keys(result.layout.buildings[0] as object).sort()).toEqual([
      "col",
      "node_id",
      "row",
    ]);
  });

  it("brings the hall along, and names it as the hub rather than as its id", () => {
    const result = liveCityLayoutFrom(
      snapshot({
        placements: [at("NUM.S", 0, 2)],
        town_hall: { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM },
      }),
    );
    if (result.status !== "ready") {
      throw new Error(result.message);
    }

    expect(result.layout.includes_hall).toBe(true);
    expect(result.layout.buildings).toHaveLength(2);
    // The hall leads, because it is the island's centre and reads first on the board.
    expect(result.layout.buildings[0]?.node_id).toBe(TOWN_HALL_ID);
  });

  /**
   * A saved blob is user data from a browser this code has never met. Refusing the whole
   * board because one entry is odd would be a worse answer than playing the rest of the
   * city, and handing either case to `createHardWinter` would throw.
   */
  it("drops what the island cannot hold rather than refusing the whole city", () => {
    const result = liveCityLayoutFrom(
      snapshot({
        placements: [
          at("NUM.S", 0, 0),
          at("NUM.F", 99, 99), // out at sea
          at("NUM.2", -40, 0), // and further out
          at("NUM.3", 0, 0), // stacked on the Assembly Hall's cell
        ],
      }),
    );
    if (result.status !== "ready") {
      throw new Error(result.message);
    }

    expect(result.layout.buildings).toEqual([{ node_id: "NUM.S", col: 0, row: 0 }]);
    // And what survives really is a board the engine will accept.
    const island = hardWinterIsland(CURRENT_ERA_ID);
    for (const b of result.layout.buildings) {
      expect(island.rim_depth.has(winterCellKey(b.col, b.row))).toBe(true);
    }
  });

  it("refuses, in words, when there is nothing to fall on", () => {
    const none = liveCityLayoutFrom(null);
    expect(none.status).toBe("unavailable");
    if (none.status !== "unavailable") {
      throw new Error("expected a refusal");
    }
    expect(none.reason).toBe("no_saved_city");
    expect(none.message).toMatch(/Build something on the island first/);
    expect(none.message).toMatch(/no saved city yet/);

    const empty = liveCityLayoutFrom(snapshot());
    if (empty.status !== "unavailable") {
      throw new Error("expected a refusal");
    }
    expect(empty.reason).toBe("nothing_built");
    // The reason a zero-building winter is refused rather than served, in the refusal.
    expect(empty.message).toMatch(/ends flawless/);

    // A city whose every placement is off the island is the same case as an empty one.
    const allAtSea = liveCityLayoutFrom(
      snapshot({ placements: [at("NUM.S", 99, 99), at("NUM.F", 98, 98)] }),
    );
    expect(allAtSea.status).toBe("unavailable");
  });

  /**
   * The blurb is the one thing on screen that tells somebody how their city compares to
   * the boards the number was tuned against, so it has to be about rim bands — which is
   * what decides whether a winter is tense — rather than about how many buildings there are.
   */
  it("describes the city by the thing that makes a winter hard", () => {
    const compact = liveCityLayoutFrom(
      snapshot({ placements: [at("NUM.S", 0, 0), at("NUM.F", -1, 0)] }),
    );
    if (compact.status !== "ready") {
      throw new Error("expected a board");
    }
    expect(compact.layout.bands).toBeLessThanOrEqual(2);
    expect(compact.layout.blurb).toMatch(/makes a winter easy/);
    expect(compact.layout.blurb).toMatch(/Nothing stands on the shoreline/);

    const spread = liveCityLayoutFrom(
      snapshot({
        placements: [
          at("NUM.5", 4, 0), // depth 0
          at("NUM.4", -4, -3), // depth 1
          at("NUM.F", 2, 2), // depth 2
          at("NUM.S", 0, 0), // depth 4
        ],
      }),
    );
    if (spread.status !== "ready") {
      throw new Error("expected a board");
    }
    expect(spread.layout.bands).toBeGreaterThanOrEqual(4);
    expect(spread.layout.blurb).toMatch(/the frost arrives in stages/);
    expect(spread.layout.blurb).toMatch(/1 building stands on the shoreline/);
  });

  /**
   * THE FINDING, PINNED SO IT CANNOT QUIETLY STOP BEING TRUE.
   *
   * Only six of the graph's nodes have a building model today, all of them era one, so a
   * city built entirely from the menu's own defaults is six skills plus the hall — and
   * `defaultPlacements` puts them all within two cells of the centre. Measured here rather
   * than asserted from the shape of the code: the live board comes out at THREE rim bands
   * against `packed`'s two and `spread`'s four, with nothing at all on the shoreline.
   *
   * That is the whole reason the ground price exists. On a board with an empty rim, pulling
   * back used to cost nothing, and the layout the game actually ships is that board. If
   * this ever reports four bands, the city surface has started spreading buildings out and
   * the winter's difficulty assumptions want re-reading.
   */
  it("reproduces the compact board when the city is built from the menu's defaults", () => {
    const hall: PlacedTransform = { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };
    const placements = defaultPlacements([...D1], [hall], BUILDABLE_RADIUS);
    const result = liveCityLayoutFrom(snapshot({ placements, town_hall: hall }));
    if (result.status !== "ready") {
      throw new Error(result.message);
    }

    const island = hardWinterIsland(CURRENT_ERA_ID);
    const depths = result.layout.buildings
      .map((b) => island.rim_depth.get(winterCellKey(b.col, b.row)) as number)
      .sort();

    expect(result.layout.buildings).toHaveLength(7);
    expect(result.layout.includes_hall).toBe(true);
    // Nothing on the shoreline, which is exactly the case that made abandoning free.
    expect(depths.filter((d) => d === 0)).toEqual([]);
    expect(Math.min(...depths)).toBeGreaterThanOrEqual(2);

    // And it sits with `packed` rather than with the spread boards.
    const bandsOf = (id: string): number => {
      const layout = winterLayouts().find((l) => l.id === id);
      if (!layout) {
        throw new Error(`no ${id} layout`);
      }
      return new Set(
        layout.buildings.map((b) => island.rim_depth.get(winterCellKey(b.col, b.row))),
      ).size;
    };
    expect(bandsOf("packed")).toBe(2);
    expect(bandsOf("spread")).toBe(4);
    expect(result.layout.bands).toBeLessThan(bandsOf("spread"));
    expect(result.layout.blurb).toMatch(/Nothing stands on the shoreline/);
  });
});
