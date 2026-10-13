import { describe, expect, it } from "vitest";
import { eraCityLayout } from "./islandLand";
import {
  BUILDABLE_RADIUS,
  cellCenter,
  DEFAULT_FOOTPRINT,
  defaultPlacements,
  FOOTPRINT_FILL,
  type Footprint,
  findOpenCell,
  footprintCells,
  footprintFitScale,
  footprintFor,
  GRID_CELL,
  isCellBuildable,
  isFootprintInBounds,
  isPlacementValid,
  MAX_BUILD_HEIGHT,
  occupiedCells,
  type PlacedTransform,
  rotatedFootprint,
  rotationYFor,
  snapToCell,
  transformCenter,
} from "./worldLayout";

const D1_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"];

/**
 * The confirmed per-building footprint table (cells, w × d, pre-rotation).
 *
 * This is the INV-ERA-1 / D-ERA10 pin: footprints are invariant across all ten eras,
 * so a building's shape may never change again once era one ships. Changing a row here
 * is therefore a design decision, not a tune. Two were changed on 2026-07-28 because
 * that window was closing, and **one of the two was reverted the same day**: `NUM.2`
 * 2×1 → 2×2 stands (confirmed by render measurements), while `NUM.5` 2×2 → 1×1 → 2×2
 * was reverted once the renders showed a smaller plot spends height and buys no
 * slenderness — see the mechanic block above `NODE_FOOTPRINTS`. The hub's own 3×2 is
 * pinned separately, against `TOWN_HALL_FOOTPRINT`, in `townHall.test.ts`.
 */
const EXPECTED_FOOTPRINTS: Readonly<Record<string, Footprint>> = {
  "NUM.S": { w: 2, d: 2 }, // Deco Tower
  "NUM.5": { w: 2, d: 2 }, // Tower (1×1 was tried and reverted)
  "NUM.2": { w: 2, d: 2 }, // Brownstones / housing (near-square plan)
  "NUM.3": { w: 1, d: 1 }, // School
  "NUM.4": { w: 1, d: 2 }, // Park (long lawn, laid front-to-back along Z)
  "NUM.F": { w: 2, d: 1 }, // Glass Slab (wide block, laid the long way)
};

describe("cell grid geometry", () => {
  it("centers a cell in world space on the grid", () => {
    expect(cellCenter(0, 0)).toEqual({ x: GRID_CELL / 2, z: GRID_CELL / 2 });
    expect(cellCenter(-1, 2)).toEqual({ x: -GRID_CELL / 2, z: 2.5 * GRID_CELL });
  });

  it("rotates a footprint by swapping width/depth on odd quarter-turns", () => {
    const fp = { w: 3, d: 2 };
    expect(rotatedFootprint(fp, 0)).toEqual({ w: 3, d: 2 });
    expect(rotatedFootprint(fp, 1)).toEqual({ w: 2, d: 3 });
    expect(rotatedFootprint(fp, 2)).toEqual({ w: 3, d: 2 });
    expect(rotatedFootprint(fp, 3)).toEqual({ w: 2, d: 3 });
  });

  it("maps quarter-turns to radians", () => {
    expect(rotationYFor(0)).toBeCloseTo(0);
    expect(rotationYFor(1)).toBeCloseTo(Math.PI / 2);
    expect(rotationYFor(3)).toBeCloseTo((3 * Math.PI) / 2);
    expect(rotationYFor(4)).toBeCloseTo(0);
  });

  it("lists every cell a footprint covers, respecting rotation", () => {
    const fp = { w: 2, d: 1 };
    expect(footprintCells({ col: 0, row: 0, rot: 0 }, fp).sort()).toEqual(["0,0", "1,0"]);
    // rot 1 swaps to 1×2 → a vertical pair.
    expect(footprintCells({ col: 0, row: 0, rot: 1 }, fp).sort()).toEqual(["0,0", "0,1"]);
  });
});

describe("fine per-cell snapping (standard CoC footprint placement)", () => {
  it("snaps a world point to the nearest whole CELL, seating the footprint under it", () => {
    const fp = { w: 1, d: 1 };
    // A 1×1 at a cell center anchors on that cell's min-corner.
    expect(snapToCell(GRID_CELL / 2, GRID_CELL / 2, fp, 0)).toEqual({ col: 0, row: 0 });
    expect(snapToCell(2.5 * GRID_CELL, 3.5 * GRID_CELL, fp, 0)).toEqual({ col: 2, row: 3 });
  });

  it("restores the fine grid: min-corner lands on ANY whole cell (odd allowed, no coarse tile)", () => {
    const fp = { w: 1, d: 1 };
    const cols = new Set<number>();
    for (let k = 0; k <= 6; k += 1) {
      // Point at the center of cell k → min-corner k (a 1-cell step, incl. odds).
      cols.add(snapToCell((k + 0.5) * GRID_CELL, GRID_CELL / 2, fp, 0).col);
    }
    expect([...cols].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("round-trips a 2×2 footprint min-corner within half a cell of the point", () => {
    const fp = { w: 2, d: 2 };
    const snapped = snapToCell(9, -3, fp, 0);
    expect(Number.isInteger(snapped.col)).toBe(true);
    expect(Number.isInteger(snapped.row)).toBe(true);
    // A 2×2 whose center lands on a grid line simply straddles it (no tile centering).
    const center = transformCenter({ ...snapped, rot: 0 }, fp);
    expect(Math.abs(center.x - 9)).toBeLessThanOrEqual(GRID_CELL / 2 + 1e-9);
    expect(Math.abs(center.z + 3)).toBeLessThanOrEqual(GRID_CELL / 2 + 1e-9);
  });

  it("accounts for rotation when snapping a non-square footprint", () => {
    const fp = { w: 1, d: 2 };
    // rot 1 swaps to 2 wide × 1 deep, so the min-corner offset changes accordingly.
    const flat = snapToCell(0, 0, fp, 0);
    const turned = snapToCell(0, 0, fp, 1);
    expect(flat).not.toEqual(turned);
  });
});

describe("buildable bounds + occupancy", () => {
  it("makes the whole disc buildable with no interior exclusions", () => {
    expect(isCellBuildable(0, 0, BUILDABLE_RADIUS)).toBe(true);
    // Far outside the buildable radius → not buildable.
    const far = Math.ceil(BUILDABLE_RADIUS / GRID_CELL) + 2;
    expect(isCellBuildable(far, far, BUILDABLE_RADIUS)).toBe(false);
    // The old back-left hill area is now clean, fully-buildable flat.
    expect(isCellBuildable(-2, -4, BUILDABLE_RADIUS)).toBe(true);
  });

  it("requires a whole footprint to be in bounds", () => {
    expect(
      isFootprintInBounds({ col: 0, row: 0, rot: 0 }, { w: 2, d: 2 }, BUILDABLE_RADIUS),
    ).toBe(true);
    // A wide footprint straddling the edge is rejected.
    const edge = Math.ceil(BUILDABLE_RADIUS / GRID_CELL);
    expect(
      isFootprintInBounds({ col: edge, row: 0, rot: 0 }, { w: 3, d: 3 }, BUILDABLE_RADIUS),
    ).toBe(false);
  });

  it("computes occupied cells from a placed 2×2 building", () => {
    const placed: PlacedTransform[] = [{ nodeId: "NUM.S", col: 0, row: 0, rot: 0 }];
    const occupied = occupiedCells(placed);
    // The Deco Tower is a 2×2 → four cells.
    expect(occupied.size).toBe(4);
    expect(occupied.has("0,0")).toBe(true);
    expect(occupied.has("1,1")).toBe(true);
  });

  it("computes occupied cells from a placed non-square (2×1) building", () => {
    const occupied = occupiedCells([{ nodeId: "NUM.F", col: 0, row: 0, rot: 0 }]);
    // The Glass Slab is a 2×1 wide block → two cells side by side (along X).
    expect(occupied.size).toBe(2);
    expect([...occupied].sort()).toEqual(["0,0", "1,0"]);
  });

  it("computes occupied cells from a placed single-cell (1×1) building", () => {
    const occupied = occupiedCells([{ nodeId: "NUM.3", col: 0, row: 0, rot: 0 }]);
    // The School is a 1×1 → exactly its own cell, at every rotation.
    expect([...occupied]).toEqual(["0,0"]);
  });

  it("marks a placement invalid when it overlaps an occupied cell", () => {
    const occupied = occupiedCells([{ nodeId: "NUM.S", col: 0, row: 0, rot: 0 }]);
    const fp = footprintFor("NUM.5"); // Tower, 2×2
    // Overlapping the Deco Tower's 2×2 block (cols 0–1 / rows 0–1) is invalid.
    expect(
      isPlacementValid({ col: 0, row: 0, rot: 0 }, fp, occupied, BUILDABLE_RADIUS),
    ).toBe(false);
    expect(
      isPlacementValid({ col: 1, row: 1, rot: 0 }, fp, occupied, BUILDABLE_RADIUS),
    ).toBe(false);
    // A clear, in-bounds 2×2 spot to the west is valid.
    expect(
      isPlacementValid({ col: -2, row: 0, rot: 0 }, fp, occupied, BUILDABLE_RADIUS),
    ).toBe(true);
  });
});

describe("ignore-self occupancy (relocating a placed building)", () => {
  it("excludes the moved building's own footprint so it can shift by one cell or return home", () => {
    const placed: PlacedTransform[] = [
      { nodeId: "NUM.S", col: 0, row: 0, rot: 0 }, // 2×2 Deco Tower being moved
      { nodeId: "NUM.3", col: 4, row: 0, rot: 0 }, // 1×1 School, a bystander
    ];
    const fp = footprintFor("NUM.S");

    // Counting EVERY building, the tower collides with its own footprint — its
    // current spot AND a one-cell nudge both read blocked (the trap this guards).
    const naive = occupiedCells(placed);
    expect(isPlacementValid({ col: 0, row: 0, rot: 0 }, fp, naive, BUILDABLE_RADIUS)).toBe(
      false,
    );
    expect(isPlacementValid({ col: 1, row: 0, rot: 0 }, fp, naive, BUILDABLE_RADIUS)).toBe(
      false,
    );

    // Ignoring the tower itself, it can move one cell over AND drop back home.
    const ignoring = occupiedCells(placed, "NUM.S");
    expect(
      isPlacementValid({ col: 1, row: 0, rot: 0 }, fp, ignoring, BUILDABLE_RADIUS),
    ).toBe(true);
    expect(
      isPlacementValid({ col: 0, row: 0, rot: 0 }, fp, ignoring, BUILDABLE_RADIUS),
    ).toBe(true);
  });

  it("still blocks a move that overlaps a DIFFERENT building", () => {
    const placed: PlacedTransform[] = [
      { nodeId: "NUM.S", col: 0, row: 0, rot: 0 }, // moving 2×2
      { nodeId: "NUM.5", col: 2, row: 0, rot: 0 }, // 2×2 neighbour just to the east
    ];
    const fp = footprintFor("NUM.S");
    const ignoring = occupiedCells(placed, "NUM.S");
    // Sliding onto (or into) the neighbour's cells is still rejected...
    expect(
      isPlacementValid({ col: 2, row: 0, rot: 0 }, fp, ignoring, BUILDABLE_RADIUS),
    ).toBe(false);
    expect(
      isPlacementValid({ col: 1, row: 0, rot: 0 }, fp, ignoring, BUILDABLE_RADIUS),
    ).toBe(false);
    // ...but open ground to the west is fine.
    expect(
      isPlacementValid({ col: -2, row: 0, rot: 0 }, fp, ignoring, BUILDABLE_RADIUS),
    ).toBe(true);
  });

  it("still blocks a move that leaves the buildable disc", () => {
    const placed: PlacedTransform[] = [{ nodeId: "NUM.S", col: 0, row: 0, rot: 0 }];
    const fp = footprintFor("NUM.S");
    const ignoring = occupiedCells(placed, "NUM.S");
    const edge = Math.ceil(BUILDABLE_RADIUS / GRID_CELL);
    // Off the island stays invalid even though self is ignored.
    expect(
      isPlacementValid({ col: edge, row: edge, rot: 0 }, fp, ignoring, BUILDABLE_RADIUS),
    ).toBe(false);
    expect(
      isPlacementValid({ col: 999, row: 0, rot: 0 }, fp, ignoring, BUILDABLE_RADIUS),
    ).toBe(false);
  });

  it("respects rotation of a non-square footprint while ignoring self", () => {
    // Park (NUM.4) is 1×2; it is being moved next to a 1×1 School at (1,0).
    const placed: PlacedTransform[] = [
      { nodeId: "NUM.4", col: 0, row: 0, rot: 0 }, // 1×2 park (cells 0,0 & 0,1)
      { nodeId: "NUM.3", col: 1, row: 0, rot: 0 }, // 1×1 school at (1,0)
    ];
    const fp = footprintFor("NUM.4"); // { w: 1, d: 2 }
    const ignoring = occupiedCells(placed, "NUM.4");
    // Its home spot is valid again once its own footprint is ignored.
    expect(
      isPlacementValid({ col: 0, row: 0, rot: 0 }, fp, ignoring, BUILDABLE_RADIUS),
    ).toBe(true);
    // Rotated to 2×1 at the origin it spans (0,0)+(1,0) and hits the school.
    expect(
      isPlacementValid({ col: 0, row: 0, rot: 1 }, fp, ignoring, BUILDABLE_RADIUS),
    ).toBe(false);
    // Rotated 2×1 one row south is clear.
    expect(
      isPlacementValid({ col: 0, row: 1, rot: 1 }, fp, ignoring, BUILDABLE_RADIUS),
    ).toBe(true);
  });

  it("treats an unplaced / unknown ignore id as a no-op (counts everything)", () => {
    const placed: PlacedTransform[] = [{ nodeId: "NUM.S", col: 0, row: 0, rot: 0 }];
    expect([...occupiedCells(placed, "NOT.HERE")].sort()).toEqual(
      [...occupiedCells(placed)].sort(),
    );
  });
});

describe("open-cell search + default layout", () => {
  it("finds an open, in-bounds cell for a footprint", () => {
    const spot = findOpenCell(footprintFor("NUM.2"), new Set(), BUILDABLE_RADIUS);
    expect(spot).not.toBeNull();
    if (spot) {
      expect(
        isPlacementValid(spot, footprintFor("NUM.2"), new Set(), BUILDABLE_RADIUS),
      ).toBe(true);
    }
  });

  it("never reuses an occupied cell", () => {
    const occupied = occupiedCells([{ nodeId: "NUM.S", col: 0, row: 0, rot: 0 }]);
    const spot = findOpenCell(footprintFor("NUM.5"), occupied, BUILDABLE_RADIUS);
    expect(spot).not.toBeNull();
    if (spot) {
      for (const key of footprintCells(spot, footprintFor("NUM.5"))) {
        expect(occupied.has(key)).toBe(false);
      }
    }
  });

  it("lays out all six D1 buildings without overlap or out-of-bounds", () => {
    const placed = defaultPlacements(D1_NODES, [], BUILDABLE_RADIUS);
    expect(placed).toHaveLength(6);
    const seen = new Set<string>();
    for (const p of placed) {
      const fp = footprintFor(p.nodeId);
      expect(isFootprintInBounds(p, fp, BUILDABLE_RADIUS)).toBe(true);
      for (const key of footprintCells(p, fp)) {
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });
});

describe("per-building footprints + fill-to-footprint scale", () => {
  it("gives every D1 building its confirmed per-node footprint", () => {
    for (const [node, fp] of Object.entries(EXPECTED_FOOTPRINTS)) {
      expect(footprintFor(node)).toEqual(fp);
    }
    // Footprints genuinely differ (not the old uniform 2×2).
    const shapes = new Set(
      D1_NODES.map((n) => `${footprintFor(n).w}x${footprintFor(n).d}`),
    );
    expect(shapes.size).toBeGreaterThan(1);
    expect(shapes.has("2x2")).toBe(true); // Deco Tower + Brownstones + Tower
    expect(shapes.has("1x2")).toBe(true); // Park (long lawn along Z)
    expect(shapes.has("2x1")).toBe(true); // the wide Glass Slab, laid the long way
    expect(shapes.has("1x1")).toBe(true); // School
  });

  it("keeps every footprint well within the buildable disc", () => {
    for (const node of D1_NODES) {
      const fp = footprintFor(node);
      expect(Math.max(fp.w, fp.d) * GRID_CELL).toBeLessThan(BUILDABLE_RADIUS);
    }
  });

  it("falls back to the default footprint for an unmapped node", () => {
    expect(footprintFor("does-not-exist")).toEqual(DEFAULT_FOOTPRINT);
  });

  it("rotates a non-square footprint (2×1 → 1×2) for occupancy and collision", () => {
    const fp = footprintFor("NUM.F"); // { w: 2, d: 1 }
    expect(fp).toEqual({ w: 2, d: 1 });
    // Occupancy swaps orientation on an odd quarter-turn.
    expect(footprintCells({ col: 0, row: 0, rot: 0 }, fp).sort()).toEqual(["0,0", "1,0"]);
    expect(footprintCells({ col: 0, row: 0, rot: 1 }, fp).sort()).toEqual(["0,0", "0,1"]);
    // A 1×1 neighbor at (0,1): the 2×1 fits at rot 0 but its 1×2 rotation collides.
    const occupied = occupiedCells([{ nodeId: "NUM.3", col: 0, row: 1, rot: 0 }]);
    expect(
      isPlacementValid({ col: 0, row: 0, rot: 0 }, fp, occupied, BUILDABLE_RADIUS),
    ).toBe(true);
    expect(
      isPlacementValid({ col: 0, row: 0, rot: 1 }, fp, occupied, BUILDABLE_RADIUS),
    ).toBe(false);
  });

  it("scales a mesh to FILL its own footprint — no overhang, holds when rotated", () => {
    // Representative native GROUND boxes (X×Z) per building + its footprint: the
    // slender 2×2 Tower, the wide 2×1 Glass Slab (long axis along X, filling both tiles
    // across), the near-square Brownstone row on its 2×2, the 1×1 School. The boxes are
    // the shipped Gridwork measurements; the era-one re-dress changes the art, not the
    // fit math this exercises.
    const cases: { size: [number, number]; node: string }[] = [
      { size: [15, 15], node: "NUM.5" }, // 2×2 (square plan, tall)
      { size: [26, 10.6], node: "NUM.F" }, // 2×1 (wide block, X-long)
      { size: [28.81, 12.42], node: "NUM.2" }, // 2×2 (near-square row + yard)
      { size: [24.1, 18.05], node: "NUM.3" }, // 1×1
    ];
    for (const { size, node } of cases) {
      const [x, z] = size;
      const fp = footprintFor(node);
      const s = footprintFitScale(x, z, fp);
      expect(s).toBeGreaterThan(0);
      // No overhang: the scaled box fits inside the footprint's cell span.
      expect(x * s).toBeLessThanOrEqual(fp.w * GRID_CELL + 1e-9);
      expect(z * s).toBeLessThanOrEqual(fp.d * GRID_CELL + 1e-9);
      // The building FILLS its footprint: the binding ground axis reaches the fill target.
      const fillMax = Math.max((x * s) / (fp.w * GRID_CELL), (z * s) / (fp.d * GRID_CELL));
      expect(fillMax).toBeCloseTo(FOOTPRINT_FILL, 5);
      // The same scale still fits inside the rotated (90°) footprint block.
      const r = rotatedFootprint(fp, 1);
      expect(z * s).toBeLessThanOrEqual(r.w * GRID_CELL + 1e-9);
      expect(x * s).toBeLessThanOrEqual(r.d * GRID_CELL + 1e-9);
    }
  });

  it("scales LINEARLY with plot span, so a smaller plot spends height and buys no slenderness", () => {
    // The mechanic the reverted `NUM.5` 1×1 experiment got wrong (2026-07-28), pinned
    // here because a docblock alone did not stop it. `footprintFitScale` returns ONE
    // uniform scale, applied by `prepareModel` with `setScalar`, so a building's
    // rendered HEIGHT is set by its PLOT and its width:height is invariant under the
    // fit. Halving the plot therefore halves the rendered height and buys no proportion.
    const [nx, nz] = [8, 8]; // the Lookout's measured native ground box
    expect(
      footprintFitScale(nx, nz, { w: 2, d: 2 }) / footprintFitScale(nx, nz, { w: 1, d: 1 }),
    ).toBeCloseTo(2, 10);

    // And on a SHARED plot the taller building is simply the more SLENDER model — the
    // rendered height ratio is the INVERSE ratio of their native width:height. Measured:
    // Lookout 8 × 10.283 (0.778) against Roundhouse 19.5 × 12.37 (1.576) → 2.03×.
    const fp: Footprint = { w: 2, d: 2 };
    const lookout = { ground: 8, height: 10.283 };
    const round = { ground: 19.5, height: 12.37 };
    const tallLookout =
      lookout.height * footprintFitScale(lookout.ground, lookout.ground, fp);
    const tallRound = round.height * footprintFitScale(round.ground, round.ground, fp);
    expect(tallLookout / tallRound).toBeCloseTo(2.03, 2);
    // The height CAP is not what shapes any of this — neither is close to it.
    expect(Math.max(tallLookout, tallRound)).toBeLessThan(MAX_BUILD_HEIGHT);
  });

  it("lays the wide 2×1 building (NUM.F) so its long axis FILLS the 2-tile width", () => {
    // Real built ground box (X×Z), measured from the Gridwork GLB — the Glass Slab is
    // authored WIDE along X, so its 2-tile axis is the width. This guards the fix:
    // a wide model must span its 2×1 plot the long way, not be crushed thin.
    // `NUM.2` was here too until its plot became a square 2×2 (2026-07-28), which is
    // the opposite case: a near-square model no longer has a long axis to lay.
    const wide: { node: string; size: [number, number] }[] = [
      { node: "NUM.F", size: [26.0, 10.6] }, // Glass Slab
    ];
    // A floor under the loop below: if the city ever has no 2×1 left, the loop would
    // pass by iterating nothing. `NUM.F` is the only 2×1 there is, and this says so.
    expect(
      D1_NODES.filter((n) => footprintFor(n).w === 2 && footprintFor(n).d === 1),
    ).toEqual(wide.map((w) => w.node));
    for (const { node, size } of wide) {
      const fp = footprintFor(node);
      // The 2-tile span runs along the WIDTH (X) axis — the model's long axis.
      expect(fp).toEqual({ w: 2, d: 1 });
      const [x, z] = size;
      const s = footprintFitScale(x, z, fp);
      // The wide (X) axis binds, so it reaches the fill target across BOTH tiles.
      expect((x * s) / (fp.w * GRID_CELL)).toBeCloseTo(FOOTPRINT_FILL, 5);
      // Depth stays inside its single tile (a slim yard front/back, no overhang).
      expect(z * s).toBeLessThanOrEqual(fp.d * GRID_CELL + 1e-9);
      expect((z * s) / (fp.d * GRID_CELL)).toBeLessThan(FOOTPRINT_FILL);
    }
  });
});

describe("computeCityLayout", () => {
  it("produces a fixed starter-island framing big enough to build on", () => {
    const layout = eraCityLayout("prehistoric");
    expect(layout.center).toEqual({ x: 0, z: 0 });
    expect(layout.islandRadius).toBeGreaterThan(layout.buildableRadius);
    expect(layout.seaRadius).toBeGreaterThan(layout.islandRadius);
    expect(layout.cameraDistance).toBeGreaterThan(layout.islandRadius);
    expect(layout.gridCell).toBe(GRID_CELL);
  });
});
