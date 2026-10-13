import { NO_CRISIS_DAMAGE } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { TOWN_HALL_ID } from "../city/townHall";
import {
  archipelagoFrom,
  BARE_LAYOUT,
  BAY_ERAS,
  foundedEras,
  foundIsland,
  foundingLayout,
  type IslandLayout,
  isFounded,
  layoutFromLoad,
  layoutOf,
  materialSpentOn,
  roadMaterialSpentOn,
  standOn,
  totalRoadMaterialSpent,
  withLayout,
} from "./islandState";

/**
 * **DOES A CIVILIZATION SPREAD OVER TEN PLACES ACTUALLY KEEP THEM APART?**
 *
 * The claim this file exists for is ISOLATION, and it is the claim the whole archipelago
 * rests on: a building placed on era one's island is on era one's island, the stone spent
 * there came out of era one's stockpile, and neither fact moves when the learner sails.
 *
 * Every isolation assertion below is written so it FAILS over the shipped single-island
 * model. That is not a figure of speech: the shipped model is one flat `CityLoad` with one
 * `placements` array and one `civic_material_spent`, so *"the same cell holds two different
 * buildings"* is a type error there and *"one island's spend is 40 and the other's is 0"* is
 * one number read twice. The injections at the bottom of each block name what each assertion
 * catches.
 *
 * Era ids come off `ERA_SEQUENCE` positions rather than being written down, per INV-ERA-5.
 */

const ERA_ONE = (ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number]).id;
const ERA_TWO = (ERA_SEQUENCE[1] as (typeof ERA_SEQUENCE)[number]).id;
const ERA_THREE = (ERA_SEQUENCE[2] as (typeof ERA_SEQUENCE)[number]).id;

/** A layout with one building on a named cell, so two islands can be asked about one cell. */
function layoutWith(nodeId: string, col: number, row: number): IslandLayout {
  return {
    ...foundingLayout(),
    placements: [{ nodeId, col, row, rot: 0 }],
  };
}

describe("the bay has a place for every authored era", () => {
  it("names them off ERA_SEQUENCE rather than from a written-down list", () => {
    expect(BAY_ERAS).toEqual(ERA_SEQUENCE.map((era) => era.id));
    // A floor, so a sequence that emptied could not satisfy the equality above vacuously.
    expect(BAY_ERAS.length).toBeGreaterThanOrEqual(10);
  });
});

describe("a founded island", () => {
  it("arrives with its hall standing and nothing else, which is §8.4", () => {
    const layout = foundingLayout();
    expect(layout.town_hall?.nodeId).toBe(TOWN_HALL_ID);
    expect(layout.placements).toEqual([]);
    expect(layout.civic).toEqual([]);
    expect(layout.roads).toEqual([]);
    expect(layout.civic_material_spent).toBe(0);
    expect(layout.road_gold_spent).toBe(0);
    expect(layout.crisis_damage).toEqual(NO_CRISIS_DAMAGE);
  });

  it("is distinguishable from an island that does not exist", () => {
    // The difference an `isFounded` derived from "has anything on it" would lose: a bare
    // island is a real place with a hall, and an unfounded era is not a place at all.
    const state = archipelagoFrom(ERA_ONE, BARE_LAYOUT);
    expect(isFounded(state, ERA_ONE)).toBe(true);
    expect(isFounded(state, ERA_TWO)).toBe(false);
    expect(layoutOf(state, ERA_TWO)).toBeNull();
  });
});

describe("islands are kept in sequence order however they are founded", () => {
  it("sorts a later founding back into its own place", () => {
    const state = foundIsland(
      foundIsland(archipelagoFrom(ERA_ONE, foundingLayout()), ERA_THREE),
      ERA_TWO,
    );
    expect(foundedEras(state)).toEqual([ERA_ONE, ERA_TWO, ERA_THREE]);
  });
});

describe("island-local coordinates", () => {
  /**
   * **THE PROPERTY THAT MAKES A COORDINATE LOCAL: two islands, one cell, two buildings.**
   *
   * Injection that fails this: partition the state by anything other than the island — key
   * `placements` on the node id alone, say — and the second write overwrites the first, so
   * one of the two reads comes back with the other island's building.
   */
  it("lets two islands hold different buildings on the very same cell", () => {
    const cell = { col: 0, row: 0 };
    let state = archipelagoFrom(ERA_ONE, layoutWith("NUM.1", cell.col, cell.row));
    state = foundIsland(state, ERA_TWO, layoutWith("NUM.2", cell.col, cell.row));

    const one = layoutOf(state, ERA_ONE);
    const two = layoutOf(state, ERA_TWO);
    expect(one?.placements).toEqual([{ nodeId: "NUM.1", col: 0, row: 0, rot: 0 }]);
    expect(two?.placements).toEqual([{ nodeId: "NUM.2", col: 0, row: 0, rot: 0 }]);
    // ...and neither island can see the other's building at all.
    expect(one?.placements.some((p) => p.nodeId === "NUM.2")).toBe(false);
    expect(two?.placements.some((p) => p.nodeId === "NUM.1")).toBe(false);
  });

  it("leaves every other island untouched when one island is written", () => {
    let state = archipelagoFrom(ERA_ONE, layoutWith("NUM.1", 3, 4));
    state = foundIsland(state, ERA_TWO);
    state = foundIsland(state, ERA_THREE);
    const before = layoutOf(state, ERA_ONE);

    state = withLayout(state, ERA_TWO, layoutWith("NUM.2", -5, 2));

    expect(layoutOf(state, ERA_ONE)).toEqual(before);
    expect(layoutOf(state, ERA_THREE)?.placements).toEqual([]);
  });

  it("refuses a layout write to an era with no island, rather than creating one", () => {
    const state = archipelagoFrom(ERA_ONE, foundingLayout());
    const after = withLayout(state, ERA_TWO, layoutWith("NUM.2", 0, 0));
    expect(isFounded(after, ERA_TWO)).toBe(false);
    expect(after).toEqual(state);
  });
});

describe("the wallets", () => {
  /**
   * **SPENDING ON ONE ISLAND DOES NOT MOVE ANOTHER ISLAND'S MATERIAL.**
   *
   * The single-island model has ONE `civic_material_spent`, so this assertion is not merely
   * false there — the second number does not exist. Injection that fails it here: read the
   * spend off the standing island instead of off the island asked about, and era two reports
   * era one's 120.
   */
  it("keeps each island's material spend to that island", () => {
    let state = archipelagoFrom(ERA_ONE, {
      ...foundingLayout(),
      civic_material_spent: 120,
    });
    state = foundIsland(state, ERA_TWO);

    expect(materialSpentOn(state, ERA_ONE)).toBe(120);
    expect(materialSpentOn(state, ERA_TWO)).toBe(0);

    // Now spend on era two, and era one must not move.
    state = withLayout(state, ERA_TWO, {
      ...(layoutOf(state, ERA_TWO) as IslandLayout),
      civic_material_spent: 40,
    });
    expect(materialSpentOn(state, ERA_ONE)).toBe(120);
    expect(materialSpentOn(state, ERA_TWO)).toBe(40);
  });

  it("reports nothing spent on an island that does not exist", () => {
    expect(materialSpentOn(archipelagoFrom(ERA_ONE, foundingLayout()), ERA_TWO)).toBe(0);
  });

  /**
   * **THE ROAD SPEND IS THE SECOND SINK ON THE SAME ERA-DENOMINATED STOCKPILE**, since the
   * gold-drop priced a road tile in the era's material (`roadsEconomy.ts`). So it is read per
   * island for the same reason the civic spend is, and the bay-wide sum is available and is
   * NOT what a wallet nets.
   *
   * Injection that fails the first pair: read the standing island's figure for both, and era
   * one's roads charge era two's grain the moment the learner sails.
   */
  it("keeps each island's road spend to that island, and can still total the bay", () => {
    let state = archipelagoFrom(ERA_ONE, { ...foundingLayout(), road_gold_spent: 75 });
    state = foundIsland(state, ERA_TWO, { ...foundingLayout(), road_gold_spent: 30 });

    expect(roadMaterialSpentOn(state, ERA_ONE)).toBe(75);
    expect(roadMaterialSpentOn(state, ERA_TWO)).toBe(30);
    expect(roadMaterialSpentOn(standOn(state, ERA_TWO), ERA_ONE)).toBe(75);

    expect(totalRoadMaterialSpent(state)).toBe(105);
    expect(totalRoadMaterialSpent(standOn(state, ERA_TWO))).toBe(105);
  });
});

describe("sailing", () => {
  it("moves the learner to a founded island", () => {
    let state = archipelagoFrom(ERA_ONE, foundingLayout());
    state = foundIsland(state, ERA_TWO);
    expect(standOn(state, ERA_TWO).standing).toBe(ERA_TWO);
  });

  it("refuses an island that has not been founded", () => {
    const state = archipelagoFrom(ERA_ONE, foundingLayout());
    expect(standOn(state, ERA_TWO)).toBe(state);
    expect(standOn(state, ERA_TWO).standing).toBe(ERA_ONE);
  });

  it("leaves the standing island in the founded set at every step of a full run", () => {
    // The invariant, swept over the whole sequence rather than spot-checked: a standing era
    // with no island is a city with no ground under it.
    let state = archipelagoFrom(ERA_ONE, foundingLayout());
    for (const eraId of BAY_ERAS.slice(1)) {
      state = standOn(foundIsland(state, eraId), eraId);
      expect(isFounded(state, state.standing)).toBe(true);
      expect(state.standing).toBe(eraId);
    }
    expect(foundedEras(state)).toEqual(BAY_ERAS);
  });
});

describe("founding an island that already exists", () => {
  /**
   * **IT IS A NO-OP, and that is the re-enterable ceremony's safety.**
   *
   * `CitySurface`'s ☰ Menu → Advance the age is deliberately ungated, so a learner standing
   * in era two can run the ceremony again. Injection that fails this: found unconditionally,
   * and the second run replaces era two's city with a bare island and a hall.
   */
  it("keeps whatever is already standing there", () => {
    let state = archipelagoFrom(ERA_ONE, foundingLayout());
    state = foundIsland(state, ERA_TWO, layoutWith("NUM.2", 2, 2));
    state = foundIsland(state, ERA_TWO);
    expect(layoutOf(state, ERA_TWO)?.placements).toEqual([
      { nodeId: "NUM.2", col: 2, row: 2, rot: 0 },
    ]);
    expect(foundedEras(state)).toEqual([ERA_ONE, ERA_TWO]);
  });
});

describe("reading a layout off a CityLoad", () => {
  it("takes the ground and leaves the learner behind", () => {
    const layout = layoutFromLoad({
      node_states: [],
      placements: [{ nodeId: "NUM.1", col: 1, row: 1, rot: 0 }],
      roads: [{ col: 2, row: 2 }],
      road_gold_spent: 12,
      town_hall: { nodeId: TOWN_HALL_ID, col: 0, row: 0, rot: 0 },
      civic: [{ nodeId: "civic:campfire:0", col: 3, row: 3, rot: 0 }],
      civic_material_spent: 60,
    });
    expect(layout.placements).toHaveLength(1);
    expect(layout.roads).toHaveLength(1);
    expect(layout.road_gold_spent).toBe(12);
    expect(layout.civic).toHaveLength(1);
    expect(layout.civic_material_spent).toBe(60);
    // Nothing about the learner came across: the type has no field for it, and this is that
    // fact asserted rather than left to the compiler, so a widening is caught here too.
    expect(Object.keys(layout).sort()).toEqual(
      [
        "civic",
        "civic_material_spent",
        "crisis_damage",
        "placements",
        "road_gold_spent",
        "roads",
        "town_hall",
      ].sort(),
    );
  });

  it("degrades a load with nothing on it to a bare island", () => {
    const layout = layoutFromLoad({ node_states: [] });
    expect(layout).toEqual(BARE_LAYOUT);
  });
});

/**
 * A compile-time reminder that every era in the sequence is a legal island id. If an era ever
 * stopped being one, this stops typechecking rather than failing at runtime in a surface.
 */
const _everyEraIsAnIsland: readonly EraId[] = BAY_ERAS;
void _everyEraIsAnIsland;
