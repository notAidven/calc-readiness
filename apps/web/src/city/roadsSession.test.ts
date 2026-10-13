import { describe, expect, it } from "vitest";

import { createCityDevSession } from "./citySession";
import { ROAD_TILE_GOLD_COST } from "./roads";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./townHall";
import {
  BUILDABLE_RADIUS,
  footprintCells,
  isPlacementValid,
  occupiedCells,
} from "./worldLayout";

/** A generous authoritative balance so gold is never the limiting factor. */
const RICH = 100_000;

/**
 * Road cells used by these tests, deliberately clear of the PRE-SEEDED Town Hall hub.
 * The hall is a 3×2 footprint seeded at the island centre (`TOWN_HALL_CENTER_TRANSFORM`),
 * so it reserves cells around the origin; roads live a few rows out (still well inside
 * the buildable disc) so the hall never confounds the road math.
 */
const R0 = { col: 0, row: 3 };
const R1 = { col: 1, row: 3 };
const R2 = { col: 2, row: 3 };

describe("citySession — laying roads (atomic gold sink)", () => {
  it("scales the spend with the number of tiles laid", async () => {
    const session = createCityDevSession();
    const result = await session.layRoads([R0, R1, R2], RICH);
    expect(result.status).toBe("committed");
    expect(result.laidCount).toBe(3);
    expect(result.cost).toBe(3 * ROAD_TILE_GOLD_COST);
    expect(session.roadGoldSpent()).toBe(3 * ROAD_TILE_GOLD_COST);
    expect((await session.load()).roads).toHaveLength(3);
  });

  it("insufficient gold commits NOTHING — no tiles, no spend", async () => {
    const session = createCityDevSession();
    const cost = 3 * ROAD_TILE_GOLD_COST;
    const result = await session.layRoads([R0, R1, R2], cost - 1);
    expect(result.status).toBe("insufficient_gold");
    expect(result.laidCount).toBe(0);
    expect(session.roadGoldSpent()).toBe(0);
    expect((await session.load()).roads).toHaveLength(0);
  });

  it("a road cell blocks a building placement (and a building blocks a road)", async () => {
    const session = createCityDevSession();
    await session.layRoads([R0], RICH);

    // A building whose footprint covers the road cell can no longer be placed there:
    // the surface unions road cells into the occupancy the placement gates on.
    const load = await session.load();
    const buildingCells = occupiedCells(load.placements ?? []);
    const roadKeys = new Set((load.roads ?? []).map((c) => `${c.col},${c.row}`));
    const occupied = new Set([...buildingCells, ...roadKeys]);
    expect(
      isPlacementValid({ ...R0, rot: 0 }, { w: 1, d: 1 }, occupied, BUILDABLE_RADIUS),
    ).toBe(false);

    // And a placed building blocks a road on its footprint. Place a skill at a
    // buildable, hall-clear spot, then try to pave one of its cells → refused.
    const nodeId = (load.node_states[0] as { node_id: string }).node_id;
    const site = { col: -3, row: 2, rot: 0 };
    await session.placeSkill(nodeId, site);
    const placed = (await session.load()).placements ?? [];
    expect(placed.some((p) => p.nodeId === nodeId)).toBe(true);
    const [buildingCellKey] = footprintCells(site, { w: 1, d: 1 });
    const [bc, br] = (buildingCellKey ?? "-3,2").split(",").map(Number);
    const blocked = await session.layRoads(
      [{ col: bc as number, row: br as number }],
      RICH,
    );
    expect(blocked.status).toBe("empty");
    expect(blocked.laidCount).toBe(0);
  });

  it("removal frees the cell and refunds exactly what the tile cost", async () => {
    const session = createCityDevSession();
    await session.layRoads([R0], RICH);
    expect(session.roadGoldSpent()).toBe(ROAD_TILE_GOLD_COST);

    const removed = await session.removeRoads([R0]);
    expect(removed).toEqual({ removedCount: 1, refund: ROAD_TILE_GOLD_COST });
    expect((await session.load()).roads).toHaveLength(0);
    // Full refund: the net road spend is back to zero, so laying then removing the
    // same tile leaves the wallet exactly where it started.
    expect(session.roadGoldSpent()).toBe(0);

    // The freed cell is layable again (a fresh charge).
    const relaid = await session.layRoads([R0], RICH);
    expect(relaid.status).toBe("committed");
    expect(session.roadGoldSpent()).toBe(ROAD_TILE_GOLD_COST);
  });

  it("refunds a bulk removal per tile, at the same rate as the lay", async () => {
    const session = createCityDevSession();
    await session.layRoads([R0, R1, R2], RICH);
    expect(session.roadGoldSpent()).toBe(3 * ROAD_TILE_GOLD_COST);

    const removed = await session.removeRoads([R0, R1]);
    expect(removed).toEqual({ removedCount: 2, refund: 2 * ROAD_TILE_GOLD_COST });
    expect(session.roadGoldSpent()).toBe(ROAD_TILE_GOLD_COST);
    expect((await session.load()).roads).toEqual([R2]);
  });

  it("never double-refunds a tile removed twice (or listed twice)", async () => {
    const session = createCityDevSession();
    await session.layRoads([R0], RICH);

    const first = await session.removeRoads([R0, R0]);
    expect(first).toEqual({ removedCount: 1, refund: ROAD_TILE_GOLD_COST });
    expect(session.roadGoldSpent()).toBe(0);

    // A repeat click on a tile that is already gone credits nothing.
    const second = await session.removeRoads([R0]);
    expect(second).toEqual({ removedCount: 0, refund: 0 });
    expect(session.roadGoldSpent()).toBe(0);
  });

  it("refunds nothing for a cell that never carried a road", async () => {
    const session = createCityDevSession();
    await session.layRoads([R0], RICH);
    // R1 is bare ground; removing it frees nothing and pays nothing, so gold can
    // never be minted by "removing" something that was never bought.
    const result = await session.removeRoads([R1]);
    expect(result).toEqual({ removedCount: 0, refund: 0 });
    expect(session.roadGoldSpent()).toBe(ROAD_TILE_GOLD_COST);
    expect((await session.load()).roads).toEqual([R0]);
  });

  it("re-laying an existing road cell is a no-op (never double-charges)", async () => {
    const session = createCityDevSession();
    await session.layRoads([R0], RICH);
    const again = await session.layRoads([R0], RICH);
    expect(again.status).toBe("empty");
    expect(session.roadGoldSpent()).toBe(ROAD_TILE_GOLD_COST);
  });
});

describe("citySession — roads and the Town Hall hub are mutually exclusive", () => {
  it("refuses to lay a road on the pre-seeded Town Hall's reserved cells", async () => {
    const session = createCityDevSession();
    const hall = (await session.load()).town_hall;
    expect(hall).not.toBeNull();
    // Every cell the 3×2 hub occupies must reject a road (never gates a cell it needs).
    const hallCells = footprintCells(hall as { col: number; row: number; rot: number }, {
      w: 3,
      d: 2,
    }).map((key) => {
      const [c, r] = key.split(",").map(Number);
      return { col: c as number, row: r as number };
    });
    const result = await session.layRoads(hallCells, RICH);
    expect(result.status).toBe("empty");
    expect(result.laidCount).toBe(0);
    expect((await session.load()).roads).toHaveLength(0);
  });

  it("refuses to move the Town Hall onto a road tile", async () => {
    const session = createCityDevSession();
    // Pave a cell the hall could otherwise be moved onto.
    await session.layRoads([R0], RICH);
    const before = (await session.load()).town_hall;

    // Aim the 3×2 hall so its footprint would cover the road cell R0 — refused, so the
    // hall stays exactly where it was and the road survives.
    await session.moveTownHall({ col: R0.col, row: R0.row, rot: 0 });
    const after = await session.load();
    expect(after.town_hall).toEqual(before);
    expect(after.roads).toHaveLength(1);

    // Sanity: the same target IS reachable once the road is removed (proving the road,
    // not the bounds, was the blocker).
    await session.removeRoads([R0]);
    await session.moveTownHall({ col: R0.col, row: R0.row, rot: 0 });
    const moved = await session.load();
    expect(moved.town_hall).toEqual({
      nodeId: TOWN_HALL_ID,
      col: R0.col,
      row: R0.row,
      rot: 0,
    });
    expect(moved.town_hall).not.toEqual(before);
  });
});

describe("citySession — the hub is seeded and reset predictably", () => {
  it("pre-seeds the Town Hall at the island centre", async () => {
    const session = createCityDevSession();
    expect((await session.load()).town_hall).toEqual({
      nodeId: TOWN_HALL_ID,
      ...TOWN_HALL_CENTER_TRANSFORM,
    });
  });
});
