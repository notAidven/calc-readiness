import { ROAD_PREFERENCE_WEIGHT } from "@cr/game";

import { roadCellKey } from "../roads";
import { GRID_CELL } from "../worldLayout";
import { CITIZEN_STAND_RADIUS } from "./citizenPlaces";

/**
 * The route a citizen walks between two cells (pure, framework-free, no `three`).
 *
 * A uniform-cost search over the four-connected cell grid. It is a plain Dijkstra
 * rather than an A*: the walkable island is about 110 cells, so an exhaustive search
 * is already cheap and a heuristic would only add a way to get the answer wrong.
 *
 * ROADS ARE CHEAPER, NEVER REQUIRED (D-CIT7, INV-COS-1). Stepping onto a road cell
 * costs `ROAD_PREFERENCE_WEIGHT` and stepping onto bare ground costs 1, which is the
 * whole of the road mechanic: traffic visibly follows the paths, and a citizen with no
 * road anywhere near them still gets where they are going. A router that treated bare
 * ground as impassable would hand a cosmetic gold sink power over whether the city
 * functions.
 *
 * IT NEVER RETURNS NOTHING. An unreachable destination degrades to the direct line
 * `[from, to]`. A null would force the caller to invent a policy for a stranded person,
 * and every available policy — delete them, freeze them, teleport them — is a
 * punishment the design forbids (section 7).
 *
 * ROADS ARE NOT AN ENGINE INPUT (D-CIT18). This lives in the web lane precisely so the
 * engine's roster can stay deep-equal with and without a road network by construction.
 * The router changes the ROUTE between two fixed points and nothing else: not who
 * exists, not who lives where, not how many are waiting.
 */

export interface RouteCell {
  readonly col: number;
  readonly row: number;
}

/** Cell reach the search will consider, matching the standing bound. */
const CELL_REACH = Math.ceil(CITIZEN_STAND_RADIUS / GRID_CELL) + 1;

/**
 * The four orthogonal neighbours in a FIXED order — north, east, south, west, the same
 * order `roadNeighborMask` and `roadRetileTargets` walk. A fixed order plus a strict
 * `<` comparison on cost is what makes two loads route identically; iterating a `Set`
 * of neighbours would leave the tie-break to insertion order and quietly de-stabilise
 * every route on the island.
 */
const NEIGHBOUR_STEPS: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** Cell centre distance from the island's origin, for the walkable bound. */
function centreDistance(col: number, row: number): number {
  return Math.hypot((col + 0.5) * GRID_CELL, (row + 0.5) * GRID_CELL);
}

export function routeBetween(params: {
  readonly from: RouteCell;
  readonly to: RouteCell;
  readonly roadCells: ReadonlySet<string>;
  readonly blockedCells: ReadonlySet<string>;
}): readonly RouteCell[] {
  const { from, to, roadCells, blockedCells } = params;

  const fromKey = roadCellKey(from.col, from.row);
  const toKey = roadCellKey(to.col, to.row);
  if (fromKey === toKey) {
    return [{ col: from.col, row: from.row }];
  }

  /**
   * Both endpoints are exempt from `blockedCells`. A citizen has to be able to reach a
   * doorstep, and a place that has become blocked since it was allocated must degrade
   * to a walk rather than to an exception.
   */
  const walkable = (col: number, row: number): boolean => {
    const key = roadCellKey(col, row);
    if (key === fromKey || key === toKey) {
      return true;
    }
    if (blockedCells.has(key)) {
      return false;
    }
    return centreDistance(col, row) <= CITIZEN_STAND_RADIUS;
  };

  if (!walkable(from.col, from.row) || !walkable(to.col, to.row)) {
    return [from, to];
  }

  const cost = new Map<string, number>([[fromKey, 0]]);
  const cameFrom = new Map<string, string>();
  const cellAt = new Map<string, RouteCell>([[fromKey, from]]);
  const settled = new Set<string>();

  // O(n^2) selection over ~110 cells. A heap would be faster and would also be the
  // place a tie-break could go unstable; the linear scan takes the first minimum in
  // insertion order, which is deterministic for free.
  for (;;) {
    let currentKey: string | null = null;
    let currentCost = Number.POSITIVE_INFINITY;
    for (const [key, keyCost] of cost) {
      if (!settled.has(key) && keyCost < currentCost) {
        currentCost = keyCost;
        currentKey = key;
      }
    }
    if (currentKey === null) {
      break;
    }
    if (currentKey === toKey) {
      break;
    }
    settled.add(currentKey);

    const current = cellAt.get(currentKey);
    if (!current) {
      continue;
    }
    for (const [dCol, dRow] of NEIGHBOUR_STEPS) {
      const col = current.col + dCol;
      const row = current.row + dRow;
      if (Math.abs(col) > CELL_REACH || Math.abs(row) > CELL_REACH) {
        continue;
      }
      if (!walkable(col, row)) {
        continue;
      }
      const key = roadCellKey(col, row);
      if (settled.has(key)) {
        continue;
      }
      // A road cell costs half a bare one. That is the entire road mechanic.
      const step = roadCells.has(key) ? ROAD_PREFERENCE_WEIGHT : 1;
      const next = currentCost + step;
      if (next < (cost.get(key) ?? Number.POSITIVE_INFINITY)) {
        cost.set(key, next);
        cameFrom.set(key, currentKey);
        cellAt.set(key, { col, row });
      }
    }
  }

  if (!cost.has(toKey)) {
    // Enclosed, off the island, or otherwise unreachable: a direct line, never a null.
    return [from, to];
  }

  const reversed: RouteCell[] = [];
  let cursor: string | undefined = toKey;
  while (cursor !== undefined) {
    const cell = cellAt.get(cursor);
    if (cell) {
      reversed.push(cell);
    }
    if (cursor === fromKey) {
      break;
    }
    cursor = cameFrom.get(cursor);
  }
  return reversed.reverse();
}
