import {
  createHardWinter,
  type HardWinterState,
  hardWinterIsland,
  hardWinterView,
  winterCellKey,
  winterFrostAfterAdvance,
  winterSpreadSteps,
} from "@cr/game";
import * as THREE from "three";
import { describe, expect, test } from "vitest";

import { CURRENT_ERA_ID } from "../eraDressing";
import { BUILDABLE_RADIUS, cellCenter, GRID_CELL } from "../worldLayout";
import { buildWinterGroundGroup } from "./WinterGround";
import {
  FROST_FRONT_NAME,
  FROST_FRONT_REACH_NAME,
  FROST_FRONT_WALL_NAME,
} from "./winterFrostFront";
import { WINTER_COAST_RADIUS } from "./winterScene";

/**
 * **THE FROST'S OPENING RING STANDS ONE FULL CELL OUTSIDE THE BOARD, AND THE TIMETABLE DID NOT
 * MOVE WITH IT.**
 *
 * The lead, having played it: *"the initial ring is still too close bro; it needs to start one
 * layer out. please actually make sure that gets implemented."*
 *
 * ## THE TWO HALVES, AND THEY FAIL SEPARATELY ON PURPOSE
 *
 * There are two ways to answer that objection and only one of them is allowed. The picture may
 * move; the encounter may not. So this file asserts them apart:
 *
 *  - **the ring moved.** Every piece of geometry the front puts on the board at round one stands
 *    clear of `BUILDABLE_RADIUS`, and the cells carrying a mark are exactly the off-board ring —
 *    a set equality in both directions, so a mark that crept back inside fails and a ring that
 *    quietly grew a second layer fails too;
 *  - **the frost did not.** `frost_next` at round one is still the whole 28-cell shoreline band,
 *    the spread schedule is still 1 / 2 / 3, and the cumulative advance still takes the last of
 *    era one's 88 cells as the THIRD round closes. That last one is the property the lead's own
 *    tuning was shaped around and the one a careless fix here would have spent.
 *
 * A rendered frame is what actually discharges the spatial claim — `frostFront.browser.test.tsx`
 * takes it at 1024x580, and `docs/design-refs/frost-front-one-ring-out/` holds the before/after
 * pair it was judged on. This file is the part that can run in CI on every commit.
 */

const CITY = [
  { node_id: "NUM.S", col: -4, row: -3 },
  { node_id: "NUM.F", col: 2, row: 3 },
  { node_id: "NUM.2", col: 4, row: -1 },
  { node_id: "NUM.3", col: -3, row: 2 },
  { node_id: "NUM.4", col: 1, row: -4 },
  { node_id: "NUM.5", col: -1, row: 0 },
] as const;

const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

function boardCells(): Set<string> {
  return new Set(hardWinterIsland(CURRENT_ERA_ID).cells);
}

/**
 * The ring of island ground immediately outside the board.
 *
 * Derived by walking the board's own cells rather than written down, so an era whose radius
 * moves brings its own ring here with no edit — and floored below, because a derivation that
 * came back empty would satisfy every containment claim in this file.
 */
function offBoardRing(): Set<string> {
  const board = boardCells();
  const ring = new Set<string>();
  for (const key of board) {
    const [col, row] = key.split(",").map(Number) as [number, number];
    for (const [dc, dr] of SIDES) {
      const next = winterCellKey(col + dc, row + dr);
      if (!board.has(next)) {
        ring.add(next);
      }
    }
  }
  return ring;
}

/** Which cells carry a front mark, read off the built geometry rather than off the source. */
function markedCells(group: THREE.Group): Set<string> {
  const cells = new Set<string>();
  const world = new THREE.Vector3();
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    if (object.name !== FROST_FRONT_NAME) {
      return;
    }
    object.getWorldPosition(world);
    cells.add(
      winterCellKey(
        Math.round(world.x / GRID_CELL - 0.5),
        Math.round(world.z / GRID_CELL - 0.5),
      ),
    );
  });
  return cells;
}

/** Every corner of every piece of front geometry with `name`, as a distance from the centre. */
function frontRadii(
  group: THREE.Group,
  name: string,
): { min: number; max: number; pieces: number } {
  const box = new THREE.Box3();
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  let pieces = 0;
  group.updateMatrixWorld(true);
  group.traverse((object) => {
    if (object.name !== name) {
      return;
    }
    pieces += 1;
    box.setFromObject(object);
    for (const x of [box.min.x, box.max.x]) {
      for (const z of [box.min.z, box.max.z]) {
        const r = Math.hypot(x, z);
        min = Math.min(min, r);
        max = Math.max(max, r);
      }
    }
  });
  return { min, max, pieces };
}

function boardOf(state: HardWinterState): THREE.Group {
  return buildWinterGroundGroup(hardWinterView(state).rows, [], { weather: false });
}

function openingWinter(): HardWinterState {
  return createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: CITY.map((b) => ({ ...b })),
  });
}

describe("the ring moved", () => {
  test("round one's wall stands clear of the board, and the rime only reaches over it", () => {
    const group = boardOf(openingWinter());
    const wall = frontRadii(group, FROST_FRONT_WALL_NAME);
    const reach = frontRadii(group, FROST_FRONT_REACH_NAME);

    // Floors first: a board with no front on it would clear every distance claim below.
    expect(wall.pieces, "no shove ice on the opening board at all").toBeGreaterThan(100);
    expect(reach.pieces, "no rime on the opening board at all").toBeGreaterThan(60);

    // THE WALL IS THE CLAIM. It is the mark that says how far the frost has got, and at round
    // one it stands on the ice outside the settlement's own ground — measured as a radius from
    // the island's centre, less one cell, because the board's outer boundary is a DIGITISED
    // circle: where its perimeter steps, a ring cell's own side edge runs flush against the
    // board's, and a wall plate turning that corner is the ring closing rather than a mark
    // creeping back inside. What the ring may never do is stand on the board, and the set
    // equality in the next test is what says so exactly.
    expect(
      wall.min,
      `the shove ice reaches in to ${wall.min.toFixed(1)}, a whole cell inside the board's own ${BUILDABLE_RADIUS}`,
    ).toBeGreaterThan(BUILDABLE_RADIUS - GRID_CELL / 2);
    // ...and it has not been pushed off the island into the sea, which is the other way to be
    // one ring out and the only one that would look worse than being too close.
    expect(
      wall.max,
      `the shove ice reaches out to ${wall.max.toFixed(1)}, past the drawn coast at ${WINTER_COAST_RADIUS}`,
    ).toBeLessThan(WINTER_COAST_RADIUS);

    // THE RIME IS ALLOWED OVER THE LINE and is meant to be — it is the mark that says which way
    // the frost is going, so it reaches from the wall toward the settlement. What it may not do
    // is become a band lying ON the board again, which is the state this whole change undid: a
    // shard is `GRID_CELL * REACH_SPAN` long, so anything more than that past the boundary means
    // the rime is being drawn from a base inside it.
    expect(
      reach.min,
      `the rime lies ${(BUILDABLE_RADIUS - reach.min).toFixed(1)} inside the board, which is a band and not a reach`,
    ).toBeGreaterThan(BUILDABLE_RADIUS - GRID_CELL);
  });

  test("the cells it stands on are exactly the ring outside the board", () => {
    const ring = offBoardRing();
    // The derivation is real: era one's board is a 88-cell disc, so its outside ring cannot be
    // a handful of cells. Without this a filter that came back empty would pass the equality.
    expect(ring.size, "the derived off-board ring is too small to be one").toBeGreaterThan(
      24,
    );

    const marked = markedCells(boardOf(openingWinter()));
    expect(marked.size, "no marks on the opening board").toBeGreaterThan(0);
    // Both directions. A mark inside the board fails the first, and a ring that stopped covering
    // the board's whole perimeter fails the second.
    expect(
      [...marked].filter((key) => !ring.has(key)).sort(),
      "front marks that are not on the ring outside the board",
    ).toEqual([]);
    for (const key of marked) {
      const board = boardCells();
      expect(board.has(key), `${key} carries a mark and is on the board`).toBe(false);
    }
    const [minR, maxR] = [...marked].reduce(
      ([lo, hi], key) => {
        const [col, row] = key.split(",").map(Number) as [number, number];
        const { x, z } = cellCenter(col, row);
        const r = Math.hypot(x, z);
        return [Math.min(lo, r), Math.max(hi, r)];
      },
      [Number.POSITIVE_INFINITY, 0],
    );
    expect(
      minR,
      `the innermost marked cell sits at ${minR.toFixed(1)}, not outside the board`,
    ).toBeGreaterThan(BUILDABLE_RADIUS - GRID_CELL);
    expect(maxR).toBeLessThan(WINTER_COAST_RADIUS);
  });

  test("the ring is one step outside the ground the round takes, and clear of every building", () => {
    const opening = openingWinter();
    const view = hardWinterView(opening);
    const takes = new Set(
      view.rows
        .flat()
        .filter((cell) => cell.frost_next)
        .map((cell) => winterCellKey(cell.col, cell.row)),
    );
    const marked = markedCells(boardOf(opening));
    expect(takes.size).toBe(28);
    expect(marked.size).toBeGreaterThan(24);

    // DISJOINT, which is the whole of the fix: the mark used to be drawn ON the ground the round
    // takes, so this set was equal to that one and this line was the failure.
    expect(
      [...marked].filter((key) => takes.has(key)).sort(),
      "the front still stands on the ground the round takes",
    ).toEqual([]);
    // ...and exactly ONE step out rather than adrift: every cell the round takes has a mark
    // beside it, so the ring is a boundary around the advance and not a ring somewhere else.
    for (const key of takes) {
      const [col, row] = key.split(",").map(Number) as [number, number];
      const beside = SIDES.some(([dc, dr]) =>
        marked.has(winterCellKey(col + dc, row + dr)),
      );
      expect(beside, `${key} is taken this round with no mark beside it`).toBe(true);
    }

    // And the number the lead is actually looking at: how much clear ground stands between the
    // ice and his buildings. It was NOUGHT on this board — `NUM.2` is a depth-0 cell, so the
    // opening front was drawn standing on it.
    for (const building of CITY) {
      const gap = Math.min(
        ...[...marked].map((key) => {
          const [col, row] = key.split(",").map(Number) as [number, number];
          return Math.abs(col - building.col) + Math.abs(row - building.row);
        }),
      );
      expect(gap, `the front stands on or beside ${building.node_id}`).toBeGreaterThan(0);
    }
  });

  test("it is a closed ring rather than an arc, and it reaches every heading", () => {
    const marked = [...markedCells(boardOf(openingWinter()))].map((key) => {
      const [col, row] = key.split(",").map(Number) as [number, number];
      return cellCenter(col, row);
    });
    expect(marked.length).toBeGreaterThan(24);
    // Eight sectors, each of them occupied: a front that had collapsed to one side would leave
    // sectors empty, and a front that had lost its corners would leave the diagonals empty.
    const sectors = new Set(
      marked.map((p) =>
        Math.floor(((Math.atan2(p.z, p.x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)),
      ),
    );
    expect([...sectors].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  /**
   * **THE MID-ENCOUNTER CLAIM, AND HALF OF IT IS OVERTURNED (2026-08-04).**
   *
   * This test was *"the band keeps its width and sits one ring out"* and asserted the marked
   * cells were rim depths `{0, 1}` — two concentric rings — because the slide deliberately kept
   * the band as many rings wide as the round had steps. The lead has now ruled that width off
   * for the fifth time (*"there shouldnt be two concentric rings once the frost moves"*), so the
   * band is one ring at every round and this expectation is the one that has to move.
   *
   * **The other half is untouched and is why the test stays here rather than being deleted.**
   * *Which* ring the band sits on is this file's own subject — the lead's earlier *"it needs to
   * start one layer out"* — and narrowing a band is a change that could easily land it back on
   * the ground the round takes. So the ring is still identified, still one step outside the
   * advance, and it is now pinned as a single rim depth in both directions: a band that grew
   * back to two fails, and a band that slid onto the wrong ring fails. `frostFrontOneRing.test.ts`
   * carries the width claim over every round of a played winter and the reasoning behind
   * dropping it; this is the instance at the round the old assertion was written for.
   */
  test("mid-encounter the band is ONE ring, and it is the one outside the advance", () => {
    const island = hardWinterIsland(CURRENT_ERA_ID);
    const rim = (key: string): number => island.rim_depth.get(key) as number;
    const opening = openingWinter();
    const afterRoundOne: HardWinterState = {
      ...opening,
      round: 2,
      frozen: island.cells.filter((key) => rim(key) === 0),
    };
    const view = hardWinterView(afterRoundOne);
    const takes = view.rows
      .flat()
      .filter((cell) => cell.frost_next)
      .map((cell) => winterCellKey(cell.col, cell.row));
    // The round takes two rings, which is what makes this the case worth measuring: a one-ring
    // round could not tell "slid out by one" from "narrowed to one", and it could not tell a
    // one-ring band from a band as wide as the advance either.
    expect(new Set(takes.map(rim))).toEqual(new Set([1, 2]));

    const marked = markedCells(buildWinterGroundGroup(view.rows, [], { weather: false }));
    expect(
      new Set([...marked].map(rim)),
      "the band is not the single ring immediately outside the ground the round takes",
    ).toEqual(new Set([0]));
    // ...and it is the WHOLE of that ring, so "one ring" cannot be satisfied by a fragment of
    // one. Derived from the island rather than pinned, so an era whose shoreline is a different
    // size brings its own count.
    expect(marked.size).toBe(island.cells.filter((key) => rim(key) === 0).length);
  });
});

describe("the frost did not", () => {
  test("round one still takes the whole 28-cell shoreline band", () => {
    const view = hardWinterView(openingWinter());
    const land = view.rows.flat().filter((cell) => cell.land);
    expect(land).toHaveLength(88);
    expect(land.filter((cell) => cell.frozen)).toHaveLength(0);
    const next = land.filter((cell) => cell.frost_next);
    expect(next).toHaveLength(28);
    for (const cell of next) {
      expect(cell.rim_depth, `(${cell.col},${cell.row}) is not on the shore`).toBe(0);
    }
  });

  test("the frost still reaches the last cell as the LAST round closes", () => {
    const island = hardWinterIsland(CURRENT_ERA_ID);
    const none = new Set<string>();
    let frozen = new Set<string>();
    const reach: number[] = [];
    for (let round = 1; round <= 3; round += 1) {
      frozen = winterFrostAfterAdvance(island, frozen, none, winterSpreadSteps(round));
      reach.push(frozen.size);
    }
    expect(winterSpreadSteps(1)).toBe(1);
    expect(winterSpreadSteps(2)).toBe(2);
    expect(winterSpreadSteps(3)).toBe(3);
    // Not merely "it gets there": it must still get there on the LAST beat and not before, which
    // is the property the three-round tuning was shaped around and the one a fix that pushed the
    // frost's own start outward would have spent.
    expect(reach, "the frost no longer arrives on the last round").toEqual([28, 72, 88]);
    expect(reach[1]).toBeLessThan(island.cells.length);
  });
});
