import { ROAD_TILE_MATERIAL_COST } from "@cr/economy";

/**
 * Pure, framework-free ROADS logic for the free-build city (no `three`, no React,
 * no economy client — unit-testable without a GPU or a wallet).
 *
 * Roads are a repeatable GOLD SINK: the player spends gold to lay road tiles onto
 * the SAME placement grid buildings use (`worldLayout`). A ground cell holds EITHER
 * a road OR a building, never both, and a road must sit on buildable ground just
 * like a building. This module owns three things, each a plain function so the
 * spend, the placement legality, and the connection-aware auto-tiling can all be
 * proven without a renderer:
 *   1. PRICE + COST — `roadCost(n) = n × ROAD_TILE_GOLD_COST` (N tiles cost N × price).
 *   2. LEGALITY — a cell is layable iff it is on the island, not under a building,
 *      and not already a road; and the ATOMIC commit plan (all tiles or none).
 *   3. AUTO-TILING — a cell's occupied-neighbour mask → a tile SHAPE + rotation, so
 *      roads visually JOIN (straight / corner / T-junction / crossroads / stub).
 *
 * INV-COS-1: roads are purely cosmetic. Nothing here reads or gates mastery, the
 * lesson, the storm, or building placement in a way that affects learning — a road
 * only ever blocks a CELL, never progress.
 */

import { isCellBuildable } from "./worldLayout";

/**
 * Gold price to lay ONE road tile. Laying N tiles costs N × this.
 *
 * DESIGN NOTE (flagged in the PR): a per-tile price "should" live in the economy's
 * §12 tuning table (`packages/economy/src/constants.ts`) alongside the other
 * magnitudes, so a retune is one edit that applies retroactively. It lives here
 * only because `@cr/economy` is frozen for this lane (the roads spend rides a
 * decorator at the App root rather than a real `@cr/economy.spendGold` primitive —
 * see the PR's flagged design question). First-guess value; expect to retune.
 */
export const ROAD_TILE_GOLD_COST = ROAD_TILE_MATERIAL_COST;

/** A single ground cell a road occupies (grid indices, matching `worldLayout`). */
export interface RoadCell {
  readonly col: number;
  readonly row: number;
}

/** The stable `"col,row"` key a cell is stored under (mirrors `footprintCells`). */
export function roadCellKey(col: number, row: number): string {
  return `${col},${row}`;
}

/** Parse a `"col,row"` key back to a cell (inverse of {@link roadCellKey}). */
export function parseRoadCellKey(key: string): RoadCell {
  const comma = key.indexOf(",");
  return {
    col: Number.parseInt(key.slice(0, comma), 10),
    row: Number.parseInt(key.slice(comma + 1), 10),
  };
}

/** Gold cost to lay `tileCount` tiles: `tileCount × ROAD_TILE_GOLD_COST` (≥ 0). */
export function roadCost(tileCount: number): number {
  return Math.max(0, Math.trunc(tileCount)) * ROAD_TILE_GOLD_COST;
}

/**
 * Gold REFUNDED for removing `tileCount` tiles — deliberately `roadCost` itself, so
 * a removal always hands back EXACTLY what the tiles cost and the two can never
 * drift apart if `ROAD_TILE_GOLD_COST` is retuned. Roads are meant to be risk-free
 * to experiment with: laying and removing the same tile is a no-op on the wallet.
 *
 * This is safe against a buy/sell exploit because the refund is charged against
 * cells that ACTUALLY carry a road (see {@link planRoadRemoval}) — a tile can only
 * be refunded once, and only after it was paid for.
 */
export function roadRefund(tileCount: number): number {
  return roadCost(tileCount);
}

/* -------------------------------------------------------------------------- */
/* Legality + the atomic commit plan                                          */
/* -------------------------------------------------------------------------- */

/** What a cell must clear to be layable: nothing standing here, not already a road. */
export interface RoadLayContext {
  /**
   * Cell keys a road may NOT be laid on because something occupies the ground: a placed
   * building, the hub's reserved cells, or ground a crisis SCARRED and nobody has reclaimed.
   *
   * Named for buildings because that is all there was when it shipped, and widened in
   * meaning rather than renamed: it is read from three call sites and the rule is the same
   * in all of them. Scarred ground is in here because a road paved over a scar would hide
   * the damage while charging for the paving, and because reclaiming that cell afterwards
   * would then have to argue with a road.
   */
  readonly buildingCells: ReadonlySet<string>;
  /** Cell keys already carrying a road (re-laying one is a no-op, never charged). */
  readonly roadCells: ReadonlySet<string>;
  /**
   * The disc this island offers, in world units — the SAME number the placement gate uses.
   *
   * It is in the context rather than closed over for the reason every other bounds test now
   * takes it: paving follows the buildings. A road painter pinned to era one's 22 while
   * buildings reach 38 would leave a settlement whose outer ring could never be connected,
   * which is a worse failure than the one it looks like — INV-COS-1 rules that a road blocks a
   * cell and never progress, so the outer buildings would still be reachable on grass and the
   * defect would be purely, silently cosmetic.
   */
  readonly buildableRadius: number;
}

/**
 * True iff a road may be laid on `cell`: it sits on buildable ground (the SAME
 * island bounds buildings respect), is not under a building, and is not already a
 * road. Pure — the surface, the session, and the tests all gate on this one rule.
 */
export function isRoadCellLayable(cell: RoadCell, ctx: RoadLayContext): boolean {
  if (!isCellBuildable(cell.col, cell.row, ctx.buildableRadius)) {
    return false;
  }
  const key = roadCellKey(cell.col, cell.row);
  return !ctx.buildingCells.has(key) && !ctx.roadCells.has(key);
}

/** The outcome of planning a road commit (see {@link planRoadCommit}). */
export type RoadCommitStatus = "committed" | "insufficient_gold" | "empty";

export interface RoadCommitPlan {
  readonly status: RoadCommitStatus;
  /** The de-duplicated, legal cells that WOULD be laid (empty unless affordable). */
  readonly cells: readonly RoadCell[];
  /** Gold the commit costs — `cells.length × ROAD_TILE_GOLD_COST`. */
  readonly cost: number;
}

/**
 * Plan a road commit ATOMICALLY (all tiles or none — never a partial purchase).
 *
 * It first reduces the raw draft to the cells actually layable (de-duplicated, on
 * the island, clear of buildings + existing roads), prices them, then decides:
 *   - `empty` — nothing legal to lay (place nothing, spend nothing).
 *   - `insufficient_gold` — the legal cells cost more than `availableGold`, so the
 *     WHOLE commit is refused (INV: insufficient gold commits NOTHING). `cells` +
 *     `cost` are still reported so the preview can show why it can't commit.
 *   - `committed` — affordable; `cells` is exactly what to lay and `cost` what to
 *     spend, as one all-or-nothing step.
 *
 * `availableGold` is the SERVER-AUTHORITATIVE spendable balance (already net of any
 * prior road spend) — never a client-minted number; the caller reads it from the
 * economy wallet before calling and commits only on a `committed` status.
 */
export function planRoadCommit(params: {
  readonly draft: readonly RoadCell[];
  readonly buildingCells: ReadonlySet<string>;
  readonly roadCells: ReadonlySet<string>;
  readonly availableGold: number;
  /** The disc this island offers — the same number the placement gate uses. */
  readonly buildableRadius: number;
}): RoadCommitPlan {
  const { draft, buildingCells, roadCells, availableGold, buildableRadius } = params;
  const seen = new Set<string>();
  const legal: RoadCell[] = [];
  for (const cell of draft) {
    const key = roadCellKey(cell.col, cell.row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (isRoadCellLayable(cell, { buildingCells, roadCells, buildableRadius })) {
      legal.push({ col: cell.col, row: cell.row });
    }
  }
  const cost = roadCost(legal.length);
  if (legal.length === 0) {
    return { status: "empty", cells: [], cost: 0 };
  }
  if (availableGold < cost) {
    return { status: "insufficient_gold", cells: legal, cost };
  }
  return { status: "committed", cells: legal, cost };
}

/** The outcome of planning a road removal (see {@link planRoadRemoval}). */
export type RoadRemovalStatus = "removed" | "empty";

export interface RoadRemovalPlan {
  readonly status: RoadRemovalStatus;
  /** The de-duplicated cells that ACTUALLY carry a road and will be freed. */
  readonly cells: readonly RoadCell[];
  /** Gold handed back — `cells.length × ROAD_TILE_GOLD_COST` (a FULL refund). */
  readonly refund: number;
  /**
   * The surviving road tiles whose connection SHAPE changes because a neighbour
   * went away, so a caller re-tiling incrementally knows exactly what to redraw
   * (a straight becomes a stub, a crossroads becomes a T, and so on). Derived, not
   * authoritative: the renderer recomputes every mask from the post-removal set.
   */
  readonly retile: readonly RoadCell[];
}

/**
 * Plan the removal of `cells` from the road layout `roadCells`.
 *
 * Only cells that ACTUALLY carry a road survive the reduction, which is the single
 * rule that makes removal safe:
 *   - Nothing but a road can be removed — a building, the Town Hall, or bare
 *     terrain simply is not in `roadCells`, so it is never freed and never paid.
 *   - A DOUBLE removal of the same tile (a duplicate in the list, or a second
 *     click after the first already committed) refunds NOTHING the second time,
 *     because the tile is no longer in the set. Gold can't be minted by clicking
 *     faster.
 * The refund is the full {@link roadRefund} of what survives, so the wallet lands
 * exactly where it was before those tiles were laid.
 */
export function planRoadRemoval(params: {
  readonly cells: readonly RoadCell[];
  readonly roadCells: ReadonlySet<string>;
}): RoadRemovalPlan {
  const { cells, roadCells } = params;
  const seen = new Set<string>();
  const removable: RoadCell[] = [];
  for (const cell of cells) {
    const key = roadCellKey(cell.col, cell.row);
    if (seen.has(key) || !roadCells.has(key)) {
      continue;
    }
    seen.add(key);
    removable.push({ col: cell.col, row: cell.row });
  }
  if (removable.length === 0) {
    return { status: "empty", cells: [], refund: 0, retile: [] };
  }
  const remaining = new Set(roadCells);
  for (const key of seen) {
    remaining.delete(key);
  }
  return {
    status: "removed",
    cells: removable,
    refund: roadRefund(removable.length),
    retile: roadRetileTargets(removable, remaining),
  };
}

/**
 * The surviving road tiles orthogonally adjacent to any removed cell — exactly the
 * tiles whose neighbour mask (and therefore {@link roadTileShape}) changed. Ordered
 * and de-duplicated so the list is stable to assert on.
 */
export function roadRetileTargets(
  removed: readonly RoadCell[],
  remainingRoadCells: ReadonlySet<string>,
): RoadCell[] {
  const seen = new Set<string>();
  const targets: RoadCell[] = [];
  for (const cell of removed) {
    const neighbors: RoadCell[] = [
      { col: cell.col, row: cell.row - 1 },
      { col: cell.col + 1, row: cell.row },
      { col: cell.col, row: cell.row + 1 },
      { col: cell.col - 1, row: cell.row },
    ];
    for (const neighbor of neighbors) {
      const key = roadCellKey(neighbor.col, neighbor.row);
      if (!seen.has(key) && remainingRoadCells.has(key)) {
        seen.add(key);
        targets.push(neighbor);
      }
    }
  }
  return targets;
}

/* -------------------------------------------------------------------------- */
/* Connection-aware auto-tiling (neighbour mask → tile shape)                 */
/* -------------------------------------------------------------------------- */

/**
 * Which of a cell's four orthogonal neighbours also carry a road. `n`/`s` step the
 * ROW (−/+), `e`/`w` step the COLUMN (+/−) — i.e. the cardinal directions on the
 * ground plane. This is the sole input to the auto-tiler, so a tile's shape is a
 * pure function of its occupied neighbourhood.
 */
export interface NeighborMask {
  readonly n: boolean;
  readonly e: boolean;
  readonly s: boolean;
  readonly w: boolean;
}

/**
 * The connection-aware tile shapes, chosen from the occupied-neighbour count:
 *   - `stub`     — 0 neighbours (a lone road patch).
 *   - `end`      — 1 neighbour  (a dead-end cap opening toward it).
 *   - `straight` — 2 opposite   (a through segment).
 *   - `corner`   — 2 adjacent   (an L bend).
 *   - `tee`      — 3 neighbours  (a T-junction).
 *   - `cross`    — 4 neighbours  (a crossroads).
 * A `rotationQuarters` (0..3 quarter-turns, clockwise) orients the base shape onto
 * the actual neighbourhood; `stub` and `cross` are rotationally symmetric (0).
 */
export type RoadShape = "stub" | "end" | "straight" | "corner" | "tee" | "cross";

export interface RoadTile {
  readonly shape: RoadShape;
  /** Clockwise quarter-turns applied to the base shape (0..3). */
  readonly rotationQuarters: number;
}

type Dir = "n" | "e" | "s" | "w";

/** One clockwise quarter-turn on the ground plane: n → e → s → w → n. */
const ROTATE_CW: Readonly<Record<Dir, Dir>> = { n: "e", e: "s", s: "w", w: "n" };

function rotateDirCW(dir: Dir, quarters: number): Dir {
  let out = dir;
  const k = ((quarters % 4) + 4) % 4;
  for (let i = 0; i < k; i += 1) {
    out = ROTATE_CW[out];
  }
  return out;
}

function maskToSet(mask: NeighborMask): Set<Dir> {
  const set = new Set<Dir>();
  if (mask.n) set.add("n");
  if (mask.e) set.add("e");
  if (mask.s) set.add("s");
  if (mask.w) set.add("w");
  return set;
}

function rotateSetCW(set: ReadonlySet<Dir>, quarters: number): Set<Dir> {
  const out = new Set<Dir>();
  for (const dir of set) {
    out.add(rotateDirCW(dir, quarters));
  }
  return out;
}

function sameDirs(a: ReadonlySet<Dir>, b: ReadonlySet<Dir>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const dir of a) {
    if (!b.has(dir)) {
      return false;
    }
  }
  return true;
}

/** The base (rotation 0) connected-set each shape draws before any quarter-turn. */
const BASE_ARMS: Readonly<Record<RoadShape, ReadonlySet<Dir>>> = {
  stub: new Set<Dir>(),
  end: new Set<Dir>(["e"]),
  straight: new Set<Dir>(["e", "w"]),
  corner: new Set<Dir>(["n", "e"]),
  tee: new Set<Dir>(["n", "e", "s"]),
  cross: new Set<Dir>(["n", "e", "s", "w"]),
};

/**
 * Classify a neighbour mask into a tile SHAPE + rotation (the auto-tiler's core).
 * Pure and total over all 16 masks; the renderer draws an arm toward each occupied
 * neighbour so tiles always physically join, and this shape drives which base art
 * to use. Round-trips with {@link roadTileArms} (shape → mask) by construction.
 */
export function roadTileShape(mask: NeighborMask): RoadTile {
  const set = maskToSet(mask);
  const count = set.size;
  let shape: RoadShape;
  if (count === 0) {
    shape = "stub";
  } else if (count === 1) {
    shape = "end";
  } else if (count === 4) {
    shape = "cross";
  } else if (count === 3) {
    shape = "tee";
  } else {
    const opposite = (set.has("n") && set.has("s")) || (set.has("e") && set.has("w"));
    shape = opposite ? "straight" : "corner";
  }
  for (let k = 0; k < 4; k += 1) {
    if (sameDirs(rotateSetCW(BASE_ARMS[shape], k), set)) {
      return { shape, rotationQuarters: k };
    }
  }
  // Unreachable for the six shapes above; stub/cross are symmetric so k=0 holds.
  return { shape, rotationQuarters: 0 };
}

/**
 * The occupied-neighbour mask a tile ACTUALLY connects, reconstructed from its
 * shape + rotation. `roadTileArms(roadTileShape(mask))` === `mask` for every mask
 * (the auto-tiler is a faithful, invertible classification) — this is what the
 * renderer uses to place road arms, so what is drawn always matches the geometry.
 */
export function roadTileArms(tile: RoadTile): NeighborMask {
  const set = rotateSetCW(BASE_ARMS[tile.shape], tile.rotationQuarters);
  return { n: set.has("n"), e: set.has("e"), s: set.has("s"), w: set.has("w") };
}

/** The occupied-neighbour mask of cell `(col,row)` given the set of road keys. */
export function roadNeighborMask(
  col: number,
  row: number,
  roadCells: ReadonlySet<string>,
): NeighborMask {
  return {
    n: roadCells.has(roadCellKey(col, row - 1)),
    e: roadCells.has(roadCellKey(col + 1, row)),
    s: roadCells.has(roadCellKey(col, row + 1)),
    w: roadCells.has(roadCellKey(col - 1, row)),
  };
}
