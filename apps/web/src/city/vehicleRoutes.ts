import { MAX_VEHICLES, VEHICLES_PER_ROAD_TILES } from "@cr/game";

import type { VehicleForm } from "./eraVehicles";
import { parseRoadCellKey, type RoadCell, roadCellKey } from "./roads";
import { cellCenter, GRID_CELL, type GroundPoint } from "./worldLayout";

/**
 * THE ROAD-ONLY WALK: where a vehicle may be, and where it is at time `t`.
 *
 * Pure and framework-free — no `three`, no React, no clock — so every rule in
 * `2026-08-01-era-vehicles-and-city-life.md` §4.4 is checkable without a GPU. The
 * renderer (`three/Vehicles.tsx`) turns a {@link VehiclePose} into a transform and owns
 * nothing about where a vehicle can go.
 *
 * ## THIS IS NOT THE CITIZEN ROUTER, AND THAT IS THE WHOLE REASON THE FILE EXISTS
 *
 * The backlog said carts *"inherit the router from #273"*. §8 item 10 checked that at the
 * branch and it is wrong twice over. `routeBetween` on `evan/city-population-happiness` is
 * a preference-weighted search over the **whole walkable island**, in which a road cell
 * merely costs less than bare ground, and it *"NEVER RETURNS NOTHING … an unreachable
 * destination degrades to the direct line."* **Both properties are right for a citizen and
 * wrong for a vehicle**: a vehicle on bare ground is a cart in a field, and a straight-line
 * degradation is a cart cutting across somebody's plot. (It is also still on an OPEN pull
 * request, so there was nothing to inherit on `integration` either.)
 *
 * So this walks the ROAD SET and only the road set. Every point of every path is on the
 * segment between two adjacent road cell centres, which is what makes *"a vehicle is on a
 * road"* a property of the construction rather than a thing to hope for.
 *
 * ## D-CIT7 IS NOT VIOLATED BY NO ROAD MEANING NO VEHICLE
 *
 * *"Roads amplify, never gate"* is why the citizen router refuses to treat bare ground as
 * impassable: a cosmetic sink must not decide whether the city functions. A vehicle is
 * different in kind — it is not a person who has to get somewhere, it is the visible
 * consequence of a spend — so **zero roads means zero vehicles and no learner is
 * affected**, because nothing a vehicle does is progress (§4.5, INV-COS-1).
 *
 * ## HOW MANY, AND WHY R2 IS THE THIRD TERM
 *
 * §4.5 sizes the count as `min(MAX_VEHICLES, tiles / VEHICLES_PER_ROAD_TILES)`, and §4.4's
 * **R2** forbids two vehicles within 3 cells of each other on a shared route, because *"two
 * carts nose to tail is a queue"* and a queue is the strongest "busy city" signal there is.
 * Those two rules meet here, and R2 wins: **one vehicle per run.** An out-and-back run
 * cannot hold two vehicles at a guaranteed separation at all — they pass each other head-on
 * once per cycle whatever their phase — and the alternative that does work is a convoy
 * moving in lockstep, which is the queue read R2 exists to refuse. So the budget is spent
 * across runs, longest first, and a player who wants more traffic builds more road rather
 * than a longer one.
 *
 * That is an implementation choice inside R2 and not a re-tuning of §4.5: the divisor still
 * decides when the first vehicle arrives (three tiles buys none) and still bounds the total.
 * `vehicleRoutes.test.ts` holds the one-per-run property with a floor under it, so it
 * cannot pass by there being one vehicle in total.
 */

/**
 * A stretch of connected road a vehicle can travel, as an ordered list of cells each
 * four-neighbouring the next. Derived, never authored.
 */
export interface RoadRun {
  /** Stable id: the key of the run's first cell. Two runs cannot share one. */
  readonly id: string;
  readonly cells: readonly RoadCell[];
}

/** Canonical order, so every derivation below is deterministic without a seed. */
function canonical(a: RoadCell, b: RoadCell): number {
  return a.col === b.col ? a.row - b.row : a.col - b.col;
}

/** The four-neighbour order `roadNeighborMask` walks: north, east, south, west. */
const STEPS: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** Distinct cells, canonically ordered. The road set may hand us duplicates. */
function distinctCells(cells: readonly RoadCell[]): RoadCell[] {
  const byKey = new Map<string, RoadCell>();
  for (const cell of cells) {
    byKey.set(roadCellKey(cell.col, cell.row), { col: cell.col, row: cell.row });
  }
  return [...byKey.values()].sort(canonical);
}

/**
 * Breadth-first over the road set from `start`, returning the cell reached LAST (the
 * farthest, canonically tie-broken) and the parent map that reconstructs the path to it.
 */
function farthestFrom(
  start: RoadCell,
  present: ReadonlySet<string>,
): { far: RoadCell; parent: Map<string, string> } {
  const startKey = roadCellKey(start.col, start.row);
  const parent = new Map<string, string>();
  const seen = new Set<string>([startKey]);
  let frontier: RoadCell[] = [start];
  let far = start;
  while (frontier.length > 0) {
    const next: RoadCell[] = [];
    // Canonical order inside the frontier, so the tie-break between two equally far
    // cells is the cell order and not the insertion order.
    for (const cell of [...frontier].sort(canonical)) {
      for (const [dc, dr] of STEPS) {
        const col = cell.col + dc;
        const row = cell.row + dr;
        const key = roadCellKey(col, row);
        if (!present.has(key) || seen.has(key)) {
          continue;
        }
        seen.add(key);
        parent.set(key, roadCellKey(cell.col, cell.row));
        next.push({ col, row });
      }
    }
    if (next.length > 0) {
      far = [...next].sort(canonical)[0] as RoadCell;
    }
    frontier = next;
  }
  return { far, parent };
}

/** The cells of one connected component, canonically ordered. */
function componentOf(start: RoadCell, present: ReadonlySet<string>): RoadCell[] {
  const found: RoadCell[] = [];
  const seen = new Set<string>([roadCellKey(start.col, start.row)]);
  const queue: RoadCell[] = [start];
  while (queue.length > 0) {
    const cell = queue.shift() as RoadCell;
    found.push(cell);
    for (const [dc, dr] of STEPS) {
      const col = cell.col + dc;
      const row = cell.row + dr;
      const key = roadCellKey(col, row);
      if (present.has(key) && !seen.has(key)) {
        seen.add(key);
        queue.push({ col, row });
      }
    }
  }
  return found.sort(canonical);
}

/**
 * THE RUNS the network offers, longest first.
 *
 * One run per connected component: the component's own longest walk, found by the
 * two-pass breadth-first search a tree's diameter is standard to take — farthest cell from
 * an arbitrary start, then farthest cell from THAT. On a network with a loop in it the walk
 * is a long path through the loop rather than provably the longest, which costs a vehicle
 * nothing: any walk over road cells is a road-only walk, which is the only property that
 * has to hold. Arms off the chosen walk simply carry no traffic.
 *
 * A one-cell component yields a run of one cell and zero length. It is kept in the result,
 * because it IS a run, and refused a vehicle by {@link planVehicles}: a vehicle with
 * nowhere to travel would have to stand still, and R1 forbids a vehicle that stops.
 */
export function roadRuns(cells: readonly RoadCell[]): readonly RoadRun[] {
  const all = distinctCells(cells);
  const present = new Set(all.map((cell) => roadCellKey(cell.col, cell.row)));
  const claimed = new Set<string>();
  const runs: RoadRun[] = [];
  for (const cell of all) {
    const key = roadCellKey(cell.col, cell.row);
    if (claimed.has(key)) {
      continue;
    }
    const component = componentOf(cell, present);
    for (const member of component) {
      claimed.add(roadCellKey(member.col, member.row));
    }
    const inComponent = new Set(
      component.map((member) => roadCellKey(member.col, member.row)),
    );
    const first = component[0] as RoadCell;
    const { far } = farthestFrom(first, inComponent);
    const { far: end, parent } = farthestFrom(far, inComponent);
    // Walk the parent chain back from the far end, then reverse: the path runs from
    // `far` to `end`.
    const path: RoadCell[] = [];
    let cursor: string | undefined = roadCellKey(end.col, end.row);
    while (cursor !== undefined) {
      path.push(parseRoadCellKey(cursor));
      cursor = parent.get(cursor);
    }
    path.reverse();
    runs.push({ id: roadCellKey(path[0]?.col ?? 0, path[0]?.row ?? 0), cells: path });
  }
  // Longest first, so the budget goes to the runs with the most road in them; the id
  // breaks the tie, so two runs of equal length are ordered by position and not by which
  // cell the sweep happened to reach first.
  return runs.sort((a, b) =>
    b.cells.length === a.cells.length
      ? a.id.localeCompare(b.id)
      : b.cells.length - a.cells.length,
  );
}

/**
 * HOW MANY VEHICLES `tileCount` tiles of road buy, before R2 gets a say.
 *
 * `min(MAX_VEHICLES, floor(tiles / VEHICLES_PER_ROAD_TILES))`, §4.5. Both constants are in
 * `engines/game/src/citizens-tuning.ts` under D-CIT14 (all tuning in one table), and until
 * this file existed they were consumed by nothing in either tree.
 */
export function vehicleBudget(tileCount: number): number {
  const tiles = Math.max(0, Math.trunc(tileCount));
  return Math.min(MAX_VEHICLES, Math.floor(tiles / VEHICLES_PER_ROAD_TILES));
}

/** The minimum separation R2 requires between two vehicles on a shared route: 3 cells. */
export const MIN_VEHICLE_SEPARATION = 3 * GRID_CELL;

/**
 * One vehicle, its route, and everything the renderer needs to pose it. Derived from the
 * road set and the era: **no clock, no mastery, no lesson state, no session time** (R4,
 * `INV-ERA-3`), and no randomness.
 */
export interface VehiclePlan {
  /** Stable across rebuilds for as long as the run is: the run's id plus the form. */
  readonly id: string;
  readonly runId: string;
  readonly form: VehicleForm;
  /** The road cells it travels, in travel order. */
  readonly cells: readonly RoadCell[];
  /** Those cells' centres, which is the polyline it rides. */
  readonly path: readonly GroundPoint[];
  /** Arc length of `path`, world units. Always `>= GRID_CELL`. */
  readonly length: number;
  /**
   * A constant offset into the out-and-back cycle, derived from the run's id so it is
   * stable and seedless. Two vehicles on two different runs therefore do not set off in
   * lockstep, which is the only thing this is for.
   */
  readonly phaseSeconds: number;
}

/** A deterministic 0..1 from a run id — no `Math.random`, so a rebuild does not reshuffle. */
function phaseFraction(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash % 1000) / 1000;
}

function pathOf(cells: readonly RoadCell[]): GroundPoint[] {
  return cells.map((cell) => cellCenter(cell.col, cell.row));
}

function arcLength(path: readonly GroundPoint[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1] as GroundPoint;
    const b = path[i] as GroundPoint;
    total += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return total;
}

/**
 * THE PLAN: which vehicles exist, and on which stretch of road.
 *
 * `form` is `null` for the nine eras with no authored vehicle, and the answer there is an
 * empty list — see `eraVehicles.ts` for why that is the right fallback rather than a
 * borrowed form.
 *
 * The budget is spent one vehicle per run, longest run first, so R2 holds by construction
 * (see the header). Runs too short to travel are skipped rather than given a stationary
 * vehicle.
 */
export function planVehicles(
  cells: readonly RoadCell[],
  form: VehicleForm | null,
): readonly VehiclePlan[] {
  if (form === null) {
    return [];
  }
  const distinct = distinctCells(cells);
  const budget = vehicleBudget(distinct.length);
  if (budget === 0) {
    return [];
  }
  const plans: VehiclePlan[] = [];
  for (const run of roadRuns(distinct)) {
    if (plans.length >= budget) {
      break;
    }
    if (run.cells.length < 2) {
      continue;
    }
    const path = pathOf(run.cells);
    const length = arcLength(path);
    plans.push({
      id: `${form.kind}:${run.id}`,
      runId: run.id,
      form,
      cells: run.cells,
      path,
      length,
      phaseSeconds: (phaseFraction(run.id) * 2 * length) / form.speedUnitsPerSec,
    });
  }
  return plans;
}

/** Where a vehicle is, and which way it faces. Local forward is `+Z`, as the gulls' is. */
export interface VehiclePose {
  readonly x: number;
  readonly z: number;
  /** Yaw, radians, `atan2(dx, dz)` of the direction of travel. */
  readonly headingY: number;
  /** Distance travelled along the run, `0..length`. Exposed so a test can measure speed. */
  readonly distance: number;
}

/**
 * POSE ONE VEHICLE AT TIME `t`, in the shape `poseBird` already uses: a pure function of
 * the plan and one number, with no velocity variable, no easing curve and no state machine
 * anywhere — which is R1 (*"constant velocity, no vehicle accelerates, brakes, stops, waits
 * or queues"*) made checkable by reading the function.
 *
 * The run is travelled out and back. **The turn at each end is a heading change and not a
 * stop**: `distance` is a fold of one linear term in `t`, so speed is `|d(distance)/dt| =
 * speedUnitsPerSec` everywhere except the two instants the sign flips, and
 * `vehicleRoutes.test.ts` measures that rather than asserting it. A dead end is where a cart
 * turns round; there is nowhere else for it to go, and vanishing at the end of the road
 * would be worse than turning.
 */
export function vehiclePose(plan: VehiclePlan, seconds: number): VehiclePose {
  const cycle = 2 * plan.length;
  const travelled = (seconds + plan.phaseSeconds) * plan.form.speedUnitsPerSec;
  const wrapped = ((travelled % cycle) + cycle) % cycle;
  const outbound = wrapped <= plan.length;
  const distance = outbound ? wrapped : cycle - wrapped;

  // Walk the polyline to the point `distance` along it.
  let remaining = distance;
  let index = 0;
  while (index < plan.path.length - 2) {
    const a = plan.path[index] as GroundPoint;
    const b = plan.path[index + 1] as GroundPoint;
    const segment = Math.hypot(b.x - a.x, b.z - a.z);
    if (remaining <= segment) {
      break;
    }
    remaining -= segment;
    index += 1;
  }
  const from = plan.path[index] as GroundPoint;
  const to = plan.path[index + 1] as GroundPoint;
  const segment = Math.hypot(to.x - from.x, to.z - from.z);
  const fraction = segment === 0 ? 0 : Math.min(1, Math.max(0, remaining / segment));
  const dx = (to.x - from.x) * (outbound ? 1 : -1);
  const dz = (to.z - from.z) * (outbound ? 1 : -1);
  return {
    x: from.x + (to.x - from.x) * fraction,
    z: from.z + (to.z - from.z) * fraction,
    headingY: Math.atan2(dx, dz),
    distance,
  };
}

/**
 * The grid cell a pose stands over. `cellCenter` puts cell `(col, row)` at
 * `((col + 0.5) · GRID_CELL, (row + 0.5) · GRID_CELL)`, so the cell is the floor of the
 * world position over the cell size — the inverse, and the way *"it is on a road"* is
 * measured rather than argued.
 */
export function cellUnder(pose: VehiclePose): RoadCell {
  return {
    col: Math.floor(pose.x / GRID_CELL),
    row: Math.floor(pose.z / GRID_CELL),
  };
}
