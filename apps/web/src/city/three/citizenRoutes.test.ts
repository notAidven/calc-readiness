import { describe, expect, it } from "vitest";

import { roadCellKey } from "../roads";
import { routeBetween } from "./citizenRoutes";

/**
 * The walk's router (Task 5.1 of the citizens implementation plan).
 *
 * `roads.ts` opens with INV-COS-1 — *"roads are purely cosmetic... a road only ever
 * blocks a CELL, never progress"*. Citizens are the feature most likely to become the
 * exception that quietly gives a road mechanical weight, so the first assertion here is
 * that a route exists with no roads at all, and the second is that a road is only ever
 * CHEAPER. Both floors are on the route's own length, because "every cell of the route
 * is paved" is satisfied by a route of no cells.
 */

const NO_ROADS: ReadonlySet<string> = new Set();
const NOTHING_BLOCKED: ReadonlySet<string> = new Set();

function roads(cells: readonly (readonly [number, number])[]): ReadonlySet<string> {
  return new Set(cells.map(([col, row]) => roadCellKey(col, row)));
}

describe("routeBetween — roads amplify, never gate (D-CIT7)", () => {
  it("finds a route with NO roads at all", () => {
    const route = routeBetween({
      from: { col: 0, row: 0 },
      to: { col: 4, row: 0 },
      roadCells: NO_ROADS,
      blockedCells: NOTHING_BLOCKED,
    });
    // Four cells apart, so a real path is five cells. A router that required a road
    // would have had to give up here.
    expect(route).toHaveLength(5);
    expect(route[0]).toEqual({ col: 0, row: 0 });
    expect(route[route.length - 1]).toEqual({ col: 4, row: 0 });
  });

  it("takes a LONGER paved detour over a shorter bare straight line", () => {
    // Traffic must VISIBLY follow the paths, or the gold spent on roads buys nothing.
    //
    // The detour has to be LONGER than the direct route for this to test anything. The
    // first version of this test paved the straight line itself, so the route was the
    // shortest path whether or not roads were weighted at all — and dropping the
    // weighting entirely left it green. Here the bare line is four steps (cost 4) and the
    // paved dogleg is six (cost 6 x 0.5 = 3), so only a router that actually discounts a
    // road takes it.
    const paved = roads([
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [4, 0],
    ]);
    const route = routeBetween({
      from: { col: 0, row: 0 },
      to: { col: 4, row: 0 },
      roadCells: paved,
      blockedCells: NOTHING_BLOCKED,
    });
    // Longer than the five-cell straight line it declined to walk.
    expect(route.length).toBeGreaterThan(5);
    // Every cell after the start is paved. The start is bare ground, which is the other
    // half of the invariant: a citizen steps onto a road, never requires one.
    expect(paved.has(roadCellKey(0, 0))).toBe(false);
    for (const cell of route.slice(1)) {
      expect(paved.has(roadCellKey(cell.col, cell.row)), `${cell.col},${cell.row}`).toBe(
        true,
      );
    }
  });

  it("walks bare ground when the road does not go where the citizen is going", () => {
    const paved = roads([[0, 3]]);
    const route = routeBetween({
      from: { col: 0, row: 0 },
      to: { col: 3, row: 0 },
      roadCells: paved,
      blockedCells: NOTHING_BLOCKED,
    });
    expect(route).toHaveLength(4);
    expect(route[route.length - 1]).toEqual({ col: 3, row: 0 });
  });

  it("never routes through a building", () => {
    const blocked = new Set([roadCellKey(1, 0), roadCellKey(1, 1), roadCellKey(1, -1)]);
    const route = routeBetween({
      from: { col: 0, row: 0 },
      to: { col: 2, row: 0 },
      roadCells: NO_ROADS,
      blockedCells: blocked,
    });
    // A detour round a three-cell wall, so the route is longer than the straight line
    // it could not take. The floor is what makes the loop below meaningful.
    expect(route.length).toBeGreaterThan(3);
    expect(route[route.length - 1]).toEqual({ col: 2, row: 0 });
    for (const cell of route) {
      expect(blocked.has(roadCellKey(cell.col, cell.row)), `${cell.col},${cell.row}`).toBe(
        false,
      );
    }
  });

  it("returns a single-cell route for identical endpoints", () => {
    const route = routeBetween({
      from: { col: 2, row: 2 },
      to: { col: 2, row: 2 },
      roadCells: NO_ROADS,
      blockedCells: NOTHING_BLOCKED,
    });
    expect(route).toEqual([{ col: 2, row: 2 }]);
  });

  it("never strands a citizen: a walled-off target still yields a route", () => {
    // Section 7: nothing is ever lost and nobody is ever punished. A destination
    // enclosed by buildings must degrade to a direct line, not to a null the caller
    // has to handle by deleting a person.
    const walled = new Set([
      roadCellKey(1, 0),
      roadCellKey(1, 1),
      roadCellKey(1, -1),
      roadCellKey(2, 1),
      roadCellKey(2, -1),
      roadCellKey(3, 0),
      roadCellKey(3, 1),
      roadCellKey(3, -1),
    ]);
    const route = routeBetween({
      from: { col: 0, row: 0 },
      to: { col: 2, row: 0 },
      roadCells: NO_ROADS,
      blockedCells: walled,
    });
    expect(route.length).toBeGreaterThan(0);
    expect(route[route.length - 1]).toEqual({ col: 2, row: 0 });
  });

  it("keeps a route on the island rather than walking out to sea", () => {
    // The far shore is not walkable ground. A router with no bound would happily route
    // a citizen across the lagoon, which is the most visible possible geography bug.
    const route = routeBetween({
      from: { col: 0, row: 0 },
      to: { col: 40, row: 40 },
      roadCells: NO_ROADS,
      blockedCells: NOTHING_BLOCKED,
    });
    // Unreachable, so it degrades to the direct line rather than a wander overseas.
    expect(route).toEqual([
      { col: 0, row: 0 },
      { col: 40, row: 40 },
    ]);
  });

  it("is deterministic, including tie-breaks", () => {
    const args = {
      from: { col: -3, row: -3 },
      to: { col: 3, row: 3 },
      roadCells: NO_ROADS,
      blockedCells: NOTHING_BLOCKED,
    };
    const first = routeBetween(args);
    expect(first.length).toBeGreaterThan(6);
    expect(routeBetween(args)).toEqual(first);
  });
});
