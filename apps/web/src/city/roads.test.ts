import { describe, expect, it } from "vitest";
import {
  isRoadCellLayable,
  type NeighborMask,
  planRoadCommit,
  planRoadRemoval,
  ROAD_TILE_GOLD_COST,
  type RoadCell,
  type RoadShape,
  roadCellKey,
  roadCost,
  roadNeighborMask,
  roadRefund,
  roadTileArms,
  roadTileShape,
} from "./roads";
import { BUILDABLE_RADIUS } from "./worldLayout";

/** The `"col,row"` key set for a road layout. */
function keysOf(cells: readonly RoadCell[]): Set<string> {
  return new Set(cells.map((c) => roadCellKey(c.col, c.row)));
}

/** Enumerate all 16 neighbour masks (n,e,s,w each on/off). */
function allMasks(): NeighborMask[] {
  const masks: NeighborMask[] = [];
  for (let bits = 0; bits < 16; bits += 1) {
    masks.push({
      n: Boolean(bits & 1),
      e: Boolean(bits & 2),
      s: Boolean(bits & 4),
      w: Boolean(bits & 8),
    });
  }
  return masks;
}

describe("roads — cost scales with tile count", () => {
  it("prices N tiles at N × the per-tile constant", () => {
    expect(roadCost(0)).toBe(0);
    expect(roadCost(1)).toBe(ROAD_TILE_GOLD_COST);
    expect(roadCost(4)).toBe(4 * ROAD_TILE_GOLD_COST);
    expect(roadCost(10)).toBe(10 * ROAD_TILE_GOLD_COST);
  });

  it("never prices a negative or fractional count", () => {
    expect(roadCost(-3)).toBe(0);
    expect(roadCost(2.9)).toBe(2 * ROAD_TILE_GOLD_COST);
  });

  it("scales linearly through the commit plan", () => {
    const draft = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ];
    const plan = planRoadCommit({
      draft,
      buildingCells: new Set(),
      roadCells: new Set(),
      availableGold: 1000,

      buildableRadius: BUILDABLE_RADIUS,
    });
    expect(plan.status).toBe("committed");
    expect(plan.cost).toBe(3 * ROAD_TILE_GOLD_COST);
    expect(plan.cells).toHaveLength(3);
  });
});

describe("roads — atomic commit (insufficient gold commits nothing)", () => {
  const draft = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 2, row: 0 },
    { col: 3, row: 0 },
  ];

  it("refuses the WHOLE commit when gold is short — never a partial purchase", () => {
    const cost = 4 * ROAD_TILE_GOLD_COST;
    const plan = planRoadCommit({
      draft,
      buildingCells: new Set(),
      roadCells: new Set(),
      availableGold: cost - 1,

      buildableRadius: BUILDABLE_RADIUS,
    });
    expect(plan.status).toBe("insufficient_gold");
    expect(plan.cost).toBe(cost);
    // The plan still reports the cells/cost so the preview can explain the refusal,
    // but the caller commits nothing on this status.
    expect(plan.cells).toHaveLength(4);
  });

  it("commits when gold exactly covers the cost", () => {
    const plan = planRoadCommit({
      draft,
      buildingCells: new Set(),
      roadCells: new Set(),
      availableGold: 4 * ROAD_TILE_GOLD_COST,

      buildableRadius: BUILDABLE_RADIUS,
    });
    expect(plan.status).toBe("committed");
  });

  it("reports empty when nothing is legal to lay", () => {
    const plan = planRoadCommit({
      draft: [{ col: 0, row: 0 }],
      buildingCells: new Set([roadCellKey(0, 0)]),
      roadCells: new Set(),
      availableGold: 1000,

      buildableRadius: BUILDABLE_RADIUS,
    });
    expect(plan.status).toBe("empty");
    expect(plan.cells).toHaveLength(0);
    expect(plan.cost).toBe(0);
  });

  it("de-duplicates and drops illegal cells before pricing", () => {
    const plan = planRoadCommit({
      // (0,0) twice; (1,0) is under a building; (99,0) is off the island.
      draft: [
        { col: 0, row: 0 },
        { col: 0, row: 0 },
        { col: 1, row: 0 },
        { col: 99, row: 0 },
      ],
      buildingCells: new Set([roadCellKey(1, 0)]),
      roadCells: new Set(),
      availableGold: 1000,

      buildableRadius: BUILDABLE_RADIUS,
    });
    expect(plan.status).toBe("committed");
    expect(plan.cells).toEqual([{ col: 0, row: 0 }]);
    expect(plan.cost).toBe(ROAD_TILE_GOLD_COST);
  });
});

describe("roads — a road cell blocks a building and vice versa", () => {
  it("a building cell is not layable as a road", () => {
    expect(
      isRoadCellLayable(
        { col: 0, row: 0 },
        {
          buildingCells: new Set([roadCellKey(0, 0)]),
          roadCells: new Set(),
          buildableRadius: BUILDABLE_RADIUS,
        },
      ),
    ).toBe(false);
  });

  it("an existing road cell is not re-layable (no double charge)", () => {
    expect(
      isRoadCellLayable(
        { col: 0, row: 0 },
        {
          buildingCells: new Set(),
          roadCells: new Set([roadCellKey(0, 0)]),
          buildableRadius: BUILDABLE_RADIUS,
        },
      ),
    ).toBe(false);
  });

  it("an off-island cell is not layable (roads respect building bounds)", () => {
    expect(
      isRoadCellLayable(
        { col: 999, row: 999 },
        {
          buildingCells: new Set(),
          roadCells: new Set(),
          buildableRadius: BUILDABLE_RADIUS,
        },
      ),
    ).toBe(false);
  });

  it("a clear, in-bounds cell is layable", () => {
    expect(
      isRoadCellLayable(
        { col: 0, row: 0 },
        {
          buildingCells: new Set(),
          roadCells: new Set(),
          buildableRadius: BUILDABLE_RADIUS,
        },
      ),
    ).toBe(true);
  });
});

describe("roads — removal refunds exactly what the tiles cost", () => {
  it("refunds the FULL per-tile price, derived from the same constant as the cost", () => {
    for (const count of [0, 1, 3, 7]) {
      expect(roadRefund(count)).toBe(roadCost(count));
    }
    expect(roadRefund(1)).toBe(ROAD_TILE_GOLD_COST);
  });

  it("frees the picked cell and hands back its price", () => {
    const roads = keysOf([
      { col: 0, row: 0 },
      { col: 1, row: 0 },
    ]);
    const plan = planRoadRemoval({ cells: [{ col: 0, row: 0 }], roadCells: roads });
    expect(plan.status).toBe("removed");
    expect(plan.cells).toEqual([{ col: 0, row: 0 }]);
    expect(plan.refund).toBe(ROAD_TILE_GOLD_COST);
  });

  it("refunds nothing for a cell that is not a road (building, hub or bare ground)", () => {
    const plan = planRoadRemoval({
      cells: [{ col: 4, row: 4 }],
      roadCells: keysOf([{ col: 0, row: 0 }]),
    });
    expect(plan.status).toBe("empty");
    expect(plan.cells).toHaveLength(0);
    expect(plan.refund).toBe(0);
  });

  it("never double-refunds a tile listed (or clicked) twice", () => {
    const roads = keysOf([{ col: 0, row: 0 }]);
    const twiceAtOnce = planRoadRemoval({
      cells: [
        { col: 0, row: 0 },
        { col: 0, row: 0 },
      ],
      roadCells: roads,
    });
    expect(twiceAtOnce.cells).toHaveLength(1);
    expect(twiceAtOnce.refund).toBe(ROAD_TILE_GOLD_COST);

    // A second removal against the POST-removal layout pays nothing at all.
    const after = new Set(roads);
    for (const cell of twiceAtOnce.cells) {
      after.delete(roadCellKey(cell.col, cell.row));
    }
    const again = planRoadRemoval({ cells: [{ col: 0, row: 0 }], roadCells: after });
    expect(again.status).toBe("empty");
    expect(again.refund).toBe(0);
  });

  it("prices a bulk removal at the same per-tile rate as one-at-a-time", () => {
    const cells = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ];
    const bulk = planRoadRemoval({ cells, roadCells: keysOf(cells) });
    expect(bulk.refund).toBe(3 * ROAD_TILE_GOLD_COST);
    expect(bulk.refund).toBe(3 * roadRefund(1));
  });

  it("frees the cell for building or paving again", () => {
    const before = keysOf([{ col: 0, row: 0 }]);
    expect(
      isRoadCellLayable(
        { col: 0, row: 0 },
        { buildingCells: new Set(), roadCells: before, buildableRadius: BUILDABLE_RADIUS },
      ),
    ).toBe(false);

    const plan = planRoadRemoval({ cells: [{ col: 0, row: 0 }], roadCells: before });
    const after = new Set(before);
    for (const cell of plan.cells) {
      after.delete(roadCellKey(cell.col, cell.row));
    }
    expect(
      isRoadCellLayable(
        { col: 0, row: 0 },
        { buildingCells: new Set(), roadCells: after, buildableRadius: BUILDABLE_RADIUS },
      ),
    ).toBe(true);
  });
});

describe("roads — removing a tile re-tiles its surviving neighbours", () => {
  /** The layout after removing `cells` from `roads`, as a key set. */
  function without(roads: readonly RoadCell[], removed: readonly RoadCell[]): Set<string> {
    const after = keysOf(roads);
    for (const cell of removed) {
      after.delete(roadCellKey(cell.col, cell.row));
    }
    return after;
  }

  it("turns a crossroads into a T when one arm is lifted", () => {
    // A plus centred on (0,0): removing the north arm leaves a T opening E/S/W.
    const plus = [
      { col: 0, row: 0 },
      { col: 0, row: -1 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: -1, row: 0 },
    ];
    expect(roadTileShape(roadNeighborMask(0, 0, keysOf(plus))).shape).toBe("cross");

    const removed = [{ col: 0, row: -1 }];
    const plan = planRoadRemoval({ cells: removed, roadCells: keysOf(plus) });
    expect(plan.retile).toContainEqual({ col: 0, row: 0 });
    expect(roadTileShape(roadNeighborMask(0, 0, without(plus, removed))).shape).toBe("tee");
  });

  it("turns a straight run's survivors into a dead-end and a stub", () => {
    // A 1×3 run; lifting the middle tile leaves two lone stubs, and lifting an END
    // tile leaves the middle a dead-end.
    const run = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ];
    expect(roadTileShape(roadNeighborMask(1, 0, keysOf(run))).shape).toBe("straight");

    const middleGone = without(run, [{ col: 1, row: 0 }]);
    expect(roadTileShape(roadNeighborMask(0, 0, middleGone)).shape).toBe("stub");
    expect(roadTileShape(roadNeighborMask(2, 0, middleGone)).shape).toBe("stub");

    const endGone = without(run, [{ col: 2, row: 0 }]);
    expect(roadTileShape(roadNeighborMask(1, 0, endGone)).shape).toBe("end");
  });

  it("lists exactly the surviving orthogonal neighbours as re-tile targets", () => {
    const roads = [
      { col: 0, row: 0 },
      { col: 1, row: 0 }, // east neighbour — survives
      { col: 0, row: 1 }, // south neighbour — survives
      { col: 5, row: 5 }, // unrelated — untouched
    ];
    const plan = planRoadRemoval({ cells: [{ col: 0, row: 0 }], roadCells: keysOf(roads) });
    expect(plan.retile).toEqual([
      { col: 1, row: 0 },
      { col: 0, row: 1 },
    ]);
  });

  it("never lists a co-removed tile as a re-tile target", () => {
    const run = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ];
    const plan = planRoadRemoval({
      cells: [
        { col: 0, row: 0 },
        { col: 1, row: 0 },
      ],
      roadCells: keysOf(run),
    });
    expect(plan.retile).toEqual([{ col: 2, row: 0 }]);
  });
});

describe("roads — auto-tiling (neighbour mask → tile shape) as a pure function", () => {
  it("classifies the canonical neighbourhoods", () => {
    const shapeOf = (mask: NeighborMask): RoadShape => roadTileShape(mask).shape;
    expect(shapeOf({ n: false, e: false, s: false, w: false })).toBe("stub");
    expect(shapeOf({ n: true, e: false, s: false, w: false })).toBe("end");
    expect(shapeOf({ n: true, e: false, s: true, w: false })).toBe("straight");
    expect(shapeOf({ n: false, e: true, s: false, w: true })).toBe("straight");
    expect(shapeOf({ n: true, e: true, s: false, w: false })).toBe("corner");
    expect(shapeOf({ n: true, e: true, s: true, w: false })).toBe("tee");
    expect(shapeOf({ n: true, e: true, s: true, w: true })).toBe("cross");
  });

  it("orients a straight the two ways and a corner the four ways", () => {
    // Straight: horizontal is the base (rot 0), vertical is a quarter-turn.
    expect(roadTileShape({ n: false, e: true, s: false, w: true }).rotationQuarters).toBe(
      0,
    );
    expect(roadTileShape({ n: true, e: false, s: true, w: false }).rotationQuarters).toBe(
      1,
    );
    // Corner has a distinct rotation per adjacent pair.
    const cornerRots = new Set(
      [
        { n: true, e: true, s: false, w: false },
        { n: false, e: true, s: true, w: false },
        { n: false, e: false, s: true, w: true },
        { n: true, e: false, s: false, w: true },
      ].map((mask) => roadTileShape(mask).rotationQuarters),
    );
    expect(cornerRots).toEqual(new Set([0, 1, 2, 3]));
  });

  it("is a faithful classification: arms(shape(mask)) === mask for all 16 masks", () => {
    for (const mask of allMasks()) {
      expect(roadTileArms(roadTileShape(mask))).toEqual(mask);
    }
  });

  it("reads a neighbour mask from the surrounding road set", () => {
    const roads = new Set([
      roadCellKey(5, 5),
      roadCellKey(5, 4), // north
      roadCellKey(6, 5), // east
    ]);
    expect(roadNeighborMask(5, 5, roads)).toEqual({
      n: true,
      e: true,
      s: false,
      w: false,
    });
    // The tile at (5,5) with a N + E neighbour is a corner.
    expect(roadTileShape(roadNeighborMask(5, 5, roads)).shape).toBe("corner");
  });
});
