import { type CitizenRoster, type CitizenState, createSeededRng, mixSeed } from "@cr/game";

import { TOWN_HALL_ID } from "../townHall";
import {
  footprintCells,
  footprintFor,
  GRID_CELL,
  type GroundPoint,
  type PlacedTransform,
  rotatedFootprint,
  type Transform,
  transformCenter,
  WALKABLE_RADIUS,
} from "../worldLayout";
import {
  SHELTER_PER_CELL,
  SHELTER_TIER,
  SHELTER_TIERS,
  type ShelterGround,
  type ShelterPlan,
  type ShelterTier,
  shelterPlan,
  shelterTierOf,
  shelterWall,
} from "./citizenShelter";

/**
 * Where each person in the roster stands, and the far end of the beat they walk
 * (pure, framework-free, no `three` — unit-testable without a GPU).
 *
 * THIS MODULE DECIDES GEOMETRY AND NOTHING ELSE. The engine already decided who
 * exists, who lives where, and who goes where by day (D-CIT8); this reads those
 * assignments and turns each one into a doorstep, an apron, or a lawn. It never
 * counts a population, never fills a gap it thinks it sees in the roster, and never
 * invents a seed.
 *
 * THREE PIECES OF ISLAND GEOMETRY IT IS BUILT ON, all measured rather than guessed
 * (citizens design section 9.1):
 *
 *   - **88 buildable cells**, of which **65 stay free** with the island fully built
 *     out — a roomy stage for a crowd of forty-four.
 *   - **The r=22..25 annulus is permanently clear grass.** `BUILDABLE_RADIUS = 22`
 *     bounds everything a player can place and `StarterIsland` rings its decorative
 *     props from 25 outward, so the band between is ground no building and no road can
 *     ever claim. That is what guarantees an overflow band always exists.
 *   - **Road cells are walkable and are NOT avoided.** `isRoadCellLayable` requires a
 *     cell be clear of buildings and of existing road, so a player who paves everything
 *     leaves zero bare cells; a rule that dodged roads would leave a fully-paved island
 *     with nowhere to stand. Roads amplify, never gate (D-CIT7), and standing on one is
 *     the mildest possible form of that.
 *
 * ## A CRISIS BOARD IS THE SAME OPERATION INDOORS (2026-08-02, re-ruled 2026-08-03)
 *
 * Pass `shelter` and every rule above still runs; what changes is what a person is allocated
 * TO. Four things follow, and each is the crisis half of a fair-weather rule rather than a
 * second system:
 *
 *   - **People shelter INSIDE the buildings that survived**, up to
 *     `shelterCapacityOf` each. `citizenShelter.ts` owns the deal — the ruling, the capacity
 *     rule and why a ruin shelters nobody — and this module owns only where the resulting
 *     crowd stands. A person indoors is put in their shelter's DOORWAY: their footing is one of
 *     the building's own footprint cells, which is ground `standableTiers` refuses precisely
 *     because it is inside a building. That is the vocabulary fix as geometry — `sheltering`
 *     claims a person is *"safe indoors, out of the weather"* (`citizens.ts`, the D-CIT6 gate)
 *     and until this change every one of the forty-four was standing on an open tile.
 *   - **Whoever does not fit goes OUT TO THE RING**, and straight there: the overflow is given
 *     the fringe tier alone rather than the cheapest tier with room, because *"out on the ring
 *     in the cold"* is the losing image the ruling asks for and a knot on a spare inland tile
 *     is not. The ring is permanently clear ground the frost can never take, so nobody outdoors
 *     is ever on ice — which is the same claim as before, reached from the other direction.
 *   - **People go HOME, not to work.** The fair-weather order is daytime destination first,
 *     then your own doorstep; sheltering reverses it — a crisis is not a working day, and the
 *     first thing anybody does is get to their own door. Their `day_node_id` is untouched,
 *     because the engine decided it and this module does not overwrite an assignment (D-CIT8).
 *   - **A person whose home the frost has wrecked crowds into a neighbour's.** `shelterPlan`
 *     anchors the search on their own home either way, so as the settlement shrinks the crowd
 *     steps inward with it rather than being scattered to wherever there is room.
 *
 * And the beat collapses. A sheltering citizen's two ends are in the SAME cell — their
 * shelter's threshold cell indoors, or one fringe cell out on the ring — so the walk is a shift
 * of weight against a wall instead of a trip across the settlement. That is the lead's *"they
 * shouldnt be running outside"* stated in geometry, and it is what makes the route claim total:
 * **no citizen's beat ever touches a board cell that is not their own shelter's plot**, so
 * there is no interior for a router to route through and nothing to cross.
 */

/** One person's ground geometry: where they rest, and where their beat takes them. */
export interface CitizenPlace {
  /** The roster's citizen id, so the render layer never re-derives an ordering. */
  readonly id: string;
  /**
   * Where this person comes to REST — their daytime destination's door, their own
   * doorstep, or their spot on the hub apron. This is also the reduced-motion pose:
   * a citizen who is not walking stands at the END of their walk, never frozen
   * mid-stride at its start.
   */
  readonly point: GroundPoint;
  /**
   * The far end of the beat. On an ordinary day always a different cell from `point`, so
   * every citizen has somewhere to walk from — a crowd of statues is the failure mode that
   * rules out by construction rather than by tuning.
   *
   * ON A CRISIS BOARD IT IS DELIBERATELY THE SAME CELL, and the inversion is the point: a
   * sheltering citizen presses into the wall they are standing against and eases back out
   * again, which is a person shifting their weight rather than a person going somewhere.
   */
  readonly walkTo: GroundPoint;
  /**
   * What this person is DOING where they stand — the roster's own state on an ordinary day,
   * and `sheltering` on a crisis board.
   *
   * It is carried here rather than re-derived in the renderer for the same reason the roster
   * is: there is no second opinion for the crowd's posture and the crowd's position to drift
   * apart on. `Citizens.tsx` reads it to decide the crouch, the shiver and the dwell, so the
   * engine's crisis vocabulary reaches a transform instead of being decoration.
   *
   * **EVERY CITIZEN ON A CRISIS BOARD IS `sheltering`, THE OVERFLOW INCLUDED, and that was
   * decided rather than inherited.** `waiting` is the roster's own word for *"the settlement has
   * no room for you"* and D-CRISIS-28 already assigns it to somebody a crisis displaced, so it
   * was the obvious state for the ring and it was tried and reverted: the crouch, the shiver and
   * the long dwell are all keyed on `sheltering`, and they are exactly what somebody out on the
   * ring most needs. Splitting the state would have taken the cold off the only people who are
   * actually in it. So the state is the ACTION (getting out of the weather) and
   * {@link shelteredIn} is the RESULT.
   */
  readonly state: CitizenState;
  /**
   * **The building this person is INSIDE, by node id — or `null`, which is the score.**
   *
   * `null` on an ordinary day, and `null` during a crisis for somebody with no place indoors,
   * who is out on the permanently-clear ring. Counting the nulls at the last beat is how a
   * final frame is read as a number, and it is what
   * `citizensShelterInside.test.ts` asserts the accuracy bands apart on.
   */
  readonly shelteredIn: string | null;
}

/**
 * How far from the island's centre a citizen may stand: the outer edge of the
 * permanently-clear grass annulus, which is where `StarterIsland` starts its prop
 * ring. Standing is allowed out here even though BUILDING is not, which is the whole
 * point — the overflow band cannot be built over, so the crowd can always spread into
 * it.
 *
 * It IS `worldLayout.WALKABLE_RADIUS`, aliased rather than restated: the placement
 * reachability rule flood-fills the same disc, and two copies of this number would let
 * "where a person can stand" and "where a person can be reached from" drift apart.
 */
export const CITIZEN_STAND_RADIUS = WALKABLE_RADIUS;

/**
 * People per cell. A cell is 4x4 units, so five is a knot of neighbours standing close
 * together rather than a queue.
 *
 * MEASURED, not guessed. The number decides how far a doorstep cluster spreads, and it
 * matters most on a FULLY BUILT island, where the centre is solid buildings and the only
 * free cells are the ring around them. At three per cell the mock city put people 6 to
 * 10 units from the door they belonged to — reading as a scatter across the lawn rather
 * than as a crowd using the buildings. Five pulls the far end of that in, because the
 * daytime ledger puts eight people at a single civic door and eight over five is two
 * cells rather than three.
 */
const STANDING_PER_CELL = 5;

/** How far outside a building's footprint edge its doorstep sits. */
const DOOR_STANDOFF = 1.3;

/**
 * Jitter inside a cell, in units. Strictly under half a cell (2.0) minus a margin, so
 * a jittered point can never leave the cell it was allocated to — which is what makes
 * "allocated a free cell" equal to "not standing inside a building".
 */
const CELL_JITTER = 1.1;

/** Clear of the hub's own 12x8 footprint, so the waiting crowd stands outside it. */
const APRON_INNER_RADIUS = 7.5;
/** Ring growth per person. `sqrt`-spaced, so the crowd spreads outward as it grows. */
const APRON_SPREAD = 2.3;
/** The golden angle, so successive apron points never line up into spokes. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Nearest and furthest an ambler's beat reaches from where they rest.
 *
 * MEASURED CONSEQUENCE, recorded here because it is the answer to "why don't citizens
 * use the roads more" (2026-07-29). A beat this long is **3.36 cells** end to end on the
 * mock city (median 3), so a route has about ONE interior cell — and a road cell one step
 * off the straight line is already more than twice the bare-ground distance, which is the
 * break-even `ROAD_PREFERENCE_WEIGHT = 0.5` can buy. So the router's road preference is
 * close to inert BY CONSTRUCTION at this scale, and no value of that weight changes it:
 * with a single 8-cell street laid, routing with the preference and routing as if roads
 * were ordinary ground give the same 2 of 22 walkers and the same 4.1% of steps on
 * paving. What decides visible road use is how much paving lies NEAR people (with a ring
 * road, 20 of 22 walkers touch it and 17 walk along it), which is the player's decision
 * and not a tuning constant. The full table is in
 * `work-log/evan/2026-07-29-reachability-placement-rule.md`.
 */
const AMBLE_MIN_RADIUS = 3;
const AMBLE_MAX_RADIUS = 7;

/**
 * Stream salts, held far apart from the engine's own look stream (`LOOK_SALT = 0x100`
 * plus the citizen index) so no population could ever grow large enough for two
 * streams to collide and make one person's jitter a function of another's look.
 */
const REST_SALT = 0x10000;
const AMBLE_SALT = 0x20000;

/** Cell reach that could ever be within standing range. */
const CELL_REACH = Math.ceil(CITIZEN_STAND_RADIUS / GRID_CELL) + 1;

/** Stable empty, so an island with nothing wrecked keeps one identity across a derivation. */
const EMPTY_RUINS: ReadonlySet<string> = new Set<string>();

/* -------------------------------------------------------------------------- */
/* ⚑ Nobody stands off the settlement, and there used to be a reason to        */
/* -------------------------------------------------------------------------- */

/*
 * **THE SHORELINE EXODUS STOOD HERE AND IS GONE, BY A PRODUCT RULING.**
 *
 * `LEAVING_RADIUS`, `LEAVING_ARC`, `LEAVING_BEARING` and `leavingPlace()` put the people the
 * engine had counted out at `CITIZEN_STAND_RADIUS + 2.4`, spread over a fifth of a turn
 * centred on `VILLAGE_CAMERA.azimuthAngle`, with their walk beat pointing further out: a line
 * of figures near the water on ground no ordinary citizen is ever placed on. Each number was
 * argued and two of them were photographed corrections — the arc had been three times wider,
 * and the bearing had been the far shore where the island's own silhouette hid them.
 *
 * On 2026-08-05 departures were removed as a mechanic entirely (*"maybe just remove the actual
 * consequences just tell them their people are unhappy?"*), so there is no count for this to
 * place and the whole block is deleted rather than left dark behind a `departing ?? 0`.
 *
 * **What that block's own docblock had already conceded is the reason not to mourn it:**
 * *"it does not read at full zoom-out … a citizen is about seven screen pixels tall at the
 * game's default framing on a 580px viewport, and six of them against the island's own
 * scattered props is not something anybody spots."* The panel was carrying the state at a
 * glance the whole time, and the panel is what survives.
 *
 * `departuresOnTheIsland.test.ts` now asserts the other side: every citizen the roster holds
 * stands inside the settlement, whatever the city is short of.
 */

interface Cell {
  readonly col: number;
  readonly row: number;
}

function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

/** World-space centre of a cell. Local to keep this module's arithmetic in one place. */
function centreOf(cell: Cell): GroundPoint {
  return { x: (cell.col + 0.5) * GRID_CELL, z: (cell.row + 0.5) * GRID_CELL };
}

/**
 * Every cell a citizen may stand on, bucketed by how willingly they stand there: inside the
 * standing radius, not under a building or the hub, and — on a crisis board — not frozen.
 * Roads are deliberately absent from `blocked` (see the header).
 *
 * ONE TIER ON AN ORDINARY DAY, so fair weather is the crisis case with the frost taken out
 * rather than a separate path. That is what keeps the shipped behaviour byte-identical: with
 * no board there is a single bucket holding exactly the cells the previous `standableCells`
 * returned, in the same order.
 *
 * The iteration order is fixed (column then row) and the search below takes the first
 * of any tie, so two loads of the same city allocate the same cells in the same order.
 */
function standableTiers(
  blocked: ReadonlySet<string>,
  shelter: ShelterGround | null,
): readonly (readonly Cell[])[] {
  const tiers: Cell[][] = SHELTER_TIERS.map(() => []);
  const fairWeather: Cell[] = [];
  for (let col = -CELL_REACH; col <= CELL_REACH; col += 1) {
    for (let row = -CELL_REACH; row <= CELL_REACH; row += 1) {
      if (blocked.has(cellKey(col, row))) {
        continue;
      }
      const centre = centreOf({ col, row });
      if (Math.hypot(centre.x, centre.z) > CITIZEN_STAND_RADIUS) {
        continue;
      }
      if (!shelter) {
        fairWeather.push({ col, row });
        continue;
      }
      const tier = shelterTierOf(shelter, col, row);
      // `null` is frozen ground and the one refusal that has no fallback tier: a cell the
      // frost holds is not somewhere a person stands less willingly, it is somewhere nobody
      // stands.
      //
      // MEASURED, at the branch tip: replace this refusal with
      // `tiers[tier ?? SHELTER_TIER.interior]` — the one-character version of "the frost is
      // just another kind of ground" — and `citizensInTheWinter.test.ts` reports **6 failed, 8
      // passed**, with 36 of era one's 44 citizens standing on ice at 52 of 88 cells frozen,
      // all 44 of them on a wholly frozen board, and the polyline sweep naming 36 walks that
      // cross it. This line is the whole of the load-bearing claim.
      if (tier !== null) {
        tiers[tier]?.push({ col, row });
      }
    }
  }
  return shelter ? tiers : [fairWeather];
}

/**
 * **HOW MUCH FURTHER SOMEBODY WILL WALK TO GET OFF GROUND THE FROST TAKES TONIGHT, IN UNITS.**
 *
 * **NOTHING REACHES THIS SINCE THE 2026-08-03 RULING, and it is kept as the record of a
 * measurement rather than as live tuning.** The crowd is no longer allocated board ground at
 * all: the sheltered are indoors and the overflow is given the fringe alone, so every call into
 * `cheapestFreeCell` now arrives with a single tier and {@link TIER_PENALTY} is never added. The
 * photograph below is why the tiers were a preference and not a rank, which is still the right
 * answer if board ground is ever handed to a crowd again — and the failure mode it names (a
 * shelter's plot photographed EMPTY while its crowd migrated somewhere safer) is structurally
 * impossible now, because a person's place is their building rather than a cell near it.
 *
 * A cell and a half. That is the number, and it exists because BOTH extremes were photographed
 * and both are wrong:
 *
 *   - **At zero** — the exposed band costs nothing extra — a person stands wherever is nearest,
 *     which means standing among the shove ice `winterFrostFront.ts` builds on exactly those
 *     cells. A 1.3u figure inside a run of 0.72u plates reads as debris.
 *   - **At infinity** — a strict tier order, which is what the first version shipped — the
 *     preference outranks the wall. Measured at 1024x580 on era one's board with the frost on
 *     the shoreline: the Dwellings hold 26 of the island's 44 homes, the free ground against
 *     them was one band shallower than the ground at the centre, and **their plot photographed
 *     empty** while the whole crowd had migrated inland. An empty plot is the "people vanished"
 *     read with a weather excuse, and it is worse than anything the alternative costs.
 *
 * So it is a PREFERENCE measured in ground rather than a rank: people will cross a cell or two
 * for better footing and will not cross the settlement for it.
 */
const EXPOSED_STEP_UNITS = 6;

/**
 * What standing OFF the board costs, in the same units.
 *
 * Derived rather than picked: four times the standing radius is wider than the island, so no
 * cell on the board can ever lose to a cell off it however far away it is. That makes the
 * fringe unreachable while ANY legal board cell has room, which is the whole of its "last
 * resort" status — stated as arithmetic instead of as a comment.
 */
const FRINGE_PENALTY_UNITS = CITIZEN_STAND_RADIUS * 4;

const TIER_PENALTY: Readonly<Record<ShelterTier, number>> = {
  [SHELTER_TIER.interior]: 0,
  [SHELTER_TIER.exposed]: EXPOSED_STEP_UNITS,
  [SHELTER_TIER.fringe]: FRINGE_PENALTY_UNITS,
};

/**
 * The cheapest cell for `anchor` that still has room, skipping `exclude`, where cheapness is
 * distance plus the tier's own penalty in the same units.
 *
 * Linear over ~110 cells, which is nothing at the once-per-city cadence this runs at, and it
 * avoids a sort so the tie-break is simply "the first in the fixed order". Real distance rather
 * than squared, because the penalty is a distance and adding one to the other has to mean
 * something.
 */
function cheapestFreeCell(
  anchor: GroundPoint,
  tiers: readonly (readonly Cell[])[],
  taken: ReadonlyMap<string, number>,
  perCell: number,
  exclude: string | null,
): Cell | null {
  let best: Cell | null = null;
  let bestCost = Number.POSITIVE_INFINITY;
  for (let tier = 0; tier < tiers.length; tier += 1) {
    // One tier means fair weather, where there is no penalty to add and no tier to name.
    const penalty = tiers.length === 1 ? 0 : (TIER_PENALTY[tier as ShelterTier] ?? 0);
    for (const cell of tiers[tier] ?? []) {
      const key = cellKey(cell.col, cell.row);
      if (key === exclude || (taken.get(key) ?? 0) >= perCell) {
        continue;
      }
      const centre = centreOf(cell);
      const cost = Math.hypot(centre.x - anchor.x, centre.z - anchor.z) + penalty;
      if (cost < bestCost) {
        bestCost = cost;
        best = cell;
      }
    }
  }
  return best;
}

/**
 * The cell one person is allocated: the cheapest with room, and when the whole island is full,
 * the cheapest at all.
 *
 * The unbounded second pass is what makes an answer TOTAL. A player who abandons enough ground
 * can fill every cell of every tier, and a knot of ten where eight was the target is a tighter
 * huddle and nothing worse — where a `null` here would put a person at an unchecked point,
 * which is what the old `clampToIsland` fallback did and is the one path that could still land
 * somebody on ice.
 */
function nearestStandingCell(
  anchor: GroundPoint,
  tiers: readonly (readonly Cell[])[],
  taken: ReadonlyMap<string, number>,
  perCell: number,
  exclude: string | null,
): Cell | null {
  return (
    cheapestFreeCell(anchor, tiers, taken, perCell, exclude) ??
    cheapestFreeCell(anchor, tiers, taken, Number.POSITIVE_INFINITY, exclude)
  );
}

/** Pull a point back inside the standing radius. The never-strand fallback. */
function clampToIsland(point: GroundPoint): GroundPoint {
  const distance = Math.hypot(point.x, point.z);
  if (distance <= CITIZEN_STAND_RADIUS || distance === 0) {
    return point;
  }
  const scale = CITIZEN_STAND_RADIUS / distance;
  return { x: point.x * scale, z: point.z * scale };
}

/**
 * A doorstep on a building's apron: just outside its footprint, on the bearing `angle`.
 *
 * THE BEARING IS PER CITIZEN, and that is the point. An earlier version put every
 * doorstep on the building's own front face (local +Z), which is the intuitive rule and
 * the wrong one here: the settlement's centre is densely built, so a fixed front
 * frequently faces straight into a neighbour's footprint — and then the nearest ground a
 * person could actually stand on was several cells away, which drew the crowd as a
 * scatter across the lawn instead of as people using the buildings. Measured on the mock
 * city, the Store's own residents stood 6 to 7 units from it.
 *
 * Spreading the bearing lets each person seek the side of their building that is
 * genuinely open, so a cluster forms wherever there is room and stays tight against the
 * wall. It also stops a deterministic tie-break piling every crowd in the city onto the
 * same compass side of every building.
 */
export function buildingApronPoint(placed: PlacedTransform, angle: number): GroundPoint {
  const footprint = footprintFor(placed.nodeId);
  const centre = transformCenter(placed, footprint);
  const { w, d } = rotatedFootprint(footprint, placed.rot);
  // The larger axis, so the bearing clears the footprint on every side of a wide plot.
  const reach = (Math.max(w, d) * GRID_CELL) / 2 + DOOR_STANDOFF;
  return {
    x: centre.x + Math.cos(angle) * reach,
    z: centre.z + Math.sin(angle) * reach,
  };
}

/** One spot on the ring of ground around the hub, spreading outward with the crowd. */
function apronPoint(centre: GroundPoint, index: number): GroundPoint {
  const angle = index * GOLDEN_ANGLE;
  const radius = APRON_INNER_RADIUS + Math.sqrt(index) * APRON_SPREAD;
  return {
    x: centre.x + Math.cos(angle) * radius,
    z: centre.z + Math.sin(angle) * radius,
  };
}

/**
 * Where the `index`-th waiting person gathers: the apron outside the Civic Center.
 * This is the cold open — people wandering out of the hub with nowhere to be — and it
 * is deliberately the CENTRE of the settlement rather than its edge, because a crowd
 * at the middle reads as waiting for the town and a crowd at the shore reads as
 * leaving it.
 */
export function hubApronPoint(hub: Transform, index: number): GroundPoint {
  return apronPoint(transformCenter(hub, footprintFor(TOWN_HALL_ID)), index);
}

/* -------------------------------------------------------------------------- */
/* Sheltering: the doorway, its threshold, and how far a huddle shifts         */
/* -------------------------------------------------------------------------- */

/**
 * **HOW FAR OVER THE THRESHOLD A SHELTERING CITIZEN STANDS, IN UNITS — the number that decides
 * whether "indoors" is a claim about the geometry or a claim about the picture.**
 *
 * A plot boundary is where outside becomes inside on this island: `standableTiers` blocks every
 * footprint cell, and its own note says why — *"allocated a free cell equals not standing inside
 * a building"*. So a figure whose footing is a footprint cell is indoors by the same rule that
 * kept the fair-weather crowd out of the walls, and this is how far past that line they stand.
 *
 * **A THIRD OF A UNIT, AND BOTH DIRECTIONS FROM IT ARE WRONG FOR NAMED REASONS.**
 *
 *  - **Deeper is invisible.** `FOOTPRINT_FILL` is 0.95, so a contain-fit mesh leaves 0.2u of its
 *    plot free on the binding axis and nothing beyond that. At the shipped ~49 degree tilt the
 *    camera looks DOWN onto a roof, so a 1.3u figure a unit inside the plot of a 2.6u dwelling is
 *    behind the wall and under the roof. A frame with nobody visible reflects nothing.
 *  - **Shallower is the old defect.** Outside the boundary is the open ground the crowd used to
 *    stand on, which is exactly what the vocabulary mismatch was about.
 *
 * At 0.33 a `TUNIC_BASE_RADIUS` body (0.28) spans 0.05u to 0.61u inside the plot against a mesh
 * face at 0.2u, so the figure STRADDLES the wall: it is inside the plot, most of its width is
 * behind the wall plane, and the outboard part of it is in the doorway where the camera can see
 * it. That is the deepest position that is both indoors and photographable, which is what makes
 * it a boundary rather than a compromise.
 */
const SHELTER_DOORWAY_DEPTH = 0.33;

/**
 * How much of a wall's half-length a crowd may not use, in units, so nobody rounds a corner.
 *
 * A cell is 4 units and the smallest plot era one authors is 1x1, whose faces are one cell
 * long — so this has to be under 2 or the Workshop's doorway would be a single point. At 0.7 a
 * 1x1 leaves 1.3u each way, which holds its two places without either of them standing on the
 * corner; a 2x2 leaves 3.3u each way for its eight.
 */
const SHELTER_WALL_MARGIN = 0.7;

/**
 * Jitter ALONG the wall, in units, so a doorway crowd is a knot and not a rank.
 *
 * Tangential only, and deliberately: {@link SHELTER_DOORWAY_DEPTH} is a claim about where the
 * threshold is, so jittering across it would make some of the crowd indoors and some of it out
 * by a coin toss. Everybody stands at the same depth and they vary along the wall, which is what
 * people crowded under an eave actually look like.
 */
const SHELTER_ALONG_JITTER = 0.55;

/**
 * How far a sheltering citizen shifts between the two ends of their beat, in units.
 *
 * **BOUNDED SO THE BEAT CANNOT LEAVE ITS CELL, and the arithmetic is the whole reason for the
 * number.** Out on the ring the old sum still holds: `CELL_JITTER` is 1.1, a cell's half-width
 * is 2.0, and 1.1 + 0.85 = 1.95, so a point jittered to the corner of its allowance and shifted
 * the full distance is still in its own cell. Indoors the shift is INWARD from the threshold,
 * so a point at 0.33 reaches at most 1.18 of the threshold cell's 4 units.
 *
 * That is what makes the route claim structural rather than statistical: both ends of a huddle
 * are in one cell, so there is no interior for a router to route through and nothing to cross.
 */
const SHELTER_SHIFT = 0.85;

/**
 * Where the `index`-th of a shelter's `crowd` people stands: along the lee wall, a third of a
 * unit over the threshold.
 *
 * Spread EVENLY across the usable face rather than jittered into it, so a shelter that is full
 * looks full and one holding two people looks like two people. `slide` is the seeded tangential
 * wobble; it is the caller's RNG so the whole crowd draws from one stream in roster order.
 */
function doorwayPoint(
  wall: ReturnType<typeof shelterWall>,
  index: number,
  crowd: number,
  slide: number,
): GroundPoint {
  const usable = Math.max(0, wall.half - SHELTER_WALL_MARGIN);
  // -1..1 across the face, and dead centre for a crowd of one.
  const spread = crowd > 1 ? (index / (crowd - 1)) * 2 - 1 : 0;
  const along = Math.max(
    -usable,
    Math.min(usable, spread * usable + (slide - 0.5) * 2 * SHELTER_ALONG_JITTER),
  );
  return {
    x: wall.at.x + wall.along.x * along + wall.inward.x * SHELTER_DOORWAY_DEPTH,
    z: wall.at.z + wall.along.z * along + wall.inward.z * SHELTER_DOORWAY_DEPTH,
  };
}

/**
 * WHICH SIDE OF A BUILDING ITS CROWD HUDDLES ON: the one with the building between them and
 * the nearest frost.
 *
 * A bearing FROM the nearest cold cell TO the building's centre, so the wall is on the frost's
 * side of the person. Two consequences worth stating, because both are the read:
 *
 *   - at round one nothing is frozen and the coming advance is a ring on the shoreline, so
 *     every knot in the settlement forms on the INWARD face of its building — the whole crowd
 *     turns its back on the shore at once, which is the frame that says something is wrong
 *     before any ice has landed;
 *   - as the front closes in, each building's lee side swings round to face it, so the knots
 *     move round the walls as the frost moves. Nothing schedules that; it falls out of reading
 *     the nearest cold cell every time the board changes.
 *
 * `frostNext` is read as well as `frozen` for exactly the round-one case above. With neither —
 * a board with no cold ground anywhere, which the reducer does not produce but a hand-built
 * test board can — it falls back to the bearing toward the island's centre, because inward is
 * where shelter is on this island whatever the weather.
 */
function leeBearing(centre: GroundPoint, shelter: ShelterGround): number {
  let nearest: GroundPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const cold of [shelter.frozen, shelter.frostNext]) {
    for (const key of cold) {
      const [col, row] = key.split(",");
      const at = centreOf({ col: Number(col), row: Number(row) });
      const distance = (at.x - centre.x) ** 2 + (at.z - centre.z) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = at;
      }
    }
  }
  if (!nearest) {
    return Math.atan2(-centre.z, -centre.x);
  }
  return Math.atan2(centre.z - nearest.z, centre.x - nearest.x);
}

/** Nobody in and nobody out, for the fair-weather path. */
const NO_ONE_SHELTERING: ShelterPlan = {
  indoors: new Map(),
  crowdByNode: new Map(),
  outside: [],
  places: 0,
};

export function citizenPlaces(params: {
  readonly roster: CitizenRoster;
  readonly placements: readonly PlacedTransform[];
  readonly hub: Transform | null;
  readonly seed: number;
  /**
   * The winter board's ground, from `shelterGround(winterRows)`, or `null`/absent on an
   * ordinary day.
   *
   * Absent leaves every place byte-for-byte as it was, which is what keeps this additive for
   * every existing caller — and the fair-weather path is the crisis path with one tier and no
   * refusals rather than a branch around it.
   */
  readonly shelter?: ShelterGround | null;
  /**
   * **Node ids the crisis has WRECKED, so nobody shelters in one.** Absent or empty means
   * every building on the island is standing, which is every ordinary day and the opening
   * board of every winter.
   *
   * Read from the city's own `ruinedNodeIds` rather than re-derived, for the reason the frost
   * is read off the projected rows: there is one answer to *"what is left standing"* and the
   * crowd must not hold a second opinion about it. The two arrive on ONE published board
   * (`WinterInCity`'s bridge builds `rows` and `ruinedNodeIds` in the same object), which is
   * what makes "nobody is ever inside a ruin" structural: there is no render between the
   * round that wrecks a building and the staging that reads it.
   */
  readonly ruinedNodeIds?: ReadonlySet<string>;
}): readonly CitizenPlace[] {
  const { roster, placements, hub, seed } = params;
  const shelter = params.shelter ?? null;
  const ruined = params.ruinedNodeIds ?? EMPTY_RUINS;

  const placedByNode = new Map(placements.map((placed) => [placed.nodeId, placed]));
  const blocked = new Set<string>();
  for (const placed of placements) {
    for (const key of footprintCells(placed, footprintFor(placed.nodeId))) {
      blocked.add(key);
    }
  }
  const hubPlacement: PlacedTransform | null = hub
    ? { ...hub, nodeId: TOWN_HALL_ID }
    : null;
  if (hubPlacement) {
    for (const key of footprintCells(hubPlacement, footprintFor(TOWN_HALL_ID))) {
      blocked.add(key);
    }
  }

  const tiers = standableTiers(blocked, shelter);
  const perCell = shelter ? SHELTER_PER_CELL : STANDING_PER_CELL;
  const hubCentre = hub ? transformCenter(hub, footprintFor(TOWN_HALL_ID)) : { x: 0, z: 0 };

  /**
   * WHERE THE OVERFLOW GOES: the fringe alone, and nothing on the board.
   *
   * Sliced at the tier constant rather than at a literal, so the order `SHELTER_TIERS`
   * declares is what decides which ground this is. Handing the overflow the full tier list
   * would put them on whatever unfrozen inland cell was going, which is a quieter picture and
   * the wrong one — the ruling asks for people out on the ring in the cold, and it is the
   * ring that makes losing legible.
   */
  const ringOnly = tiers.slice(SHELTER_TIER.fringe);

  // WHO IS INSIDE WHAT. Decided once per board, before any geometry: the buildings still
  // standing (the hall included), dealt the roster up to each one's capacity, and whoever is
  // left over is on the ring. See `citizenShelter.ts` for the ruling and the capacity rule.
  const standing = shelter
    ? [...placements, ...(hubPlacement ? [hubPlacement] : [])].filter(
        (placed) => !ruined.has(placed.nodeId),
      )
    : [];
  const plan = shelter ? shelterPlan({ roster, standing }) : NO_ONE_SHELTERING;

  // Which wall each shelter's crowd forms against, and each person's slot along it. Both are
  // per BOARD rather than per citizen, so a wall is decided once and the whole crowd at one
  // building agrees about where the frost is coming from.
  const standingByNode = new Map(standing.map((placed) => [placed.nodeId, placed]));
  const wallByNode = new Map<string, ReturnType<typeof shelterWall>>();
  const slotByCitizen = new Map<string, { index: number; crowd: number }>();
  if (shelter) {
    for (const [nodeId, crowd] of plan.crowdByNode) {
      const placed = standingByNode.get(nodeId);
      if (!placed) {
        continue;
      }
      const centre = transformCenter(placed, footprintFor(nodeId));
      wallByNode.set(nodeId, shelterWall(placed, leeBearing(centre, shelter)));
      for (let at = 0; at < crowd.length; at += 1) {
        slotByCitizen.set(crowd[at] as string, { index: at, crowd: crowd.length });
      }
    }
  }

  const taken = new Map<string, number>();
  const claim = (cell: Cell): void => {
    const key = cellKey(cell.col, cell.row);
    taken.set(key, (taken.get(key) ?? 0) + 1);
  };

  const places: CitizenPlace[] = [];
  // The apron ring is dealt out in roster order, so the eighth person to arrive takes
  // the eighth ring position and the first seven do not shuffle to make room.
  let waitingRank = 0;

  for (let index = 0; index < roster.citizens.length; index += 1) {
    const citizen = roster.citizens[index];
    if (!citizen) {
      continue;
    }

    const home = citizen.home_node_id
      ? (placedByNode.get(citizen.home_node_id) ?? null)
      : null;
    const day = citizen.day_node_id
      ? (placedByNode.get(citizen.day_node_id) ?? null)
      : null;

    const restRng = createSeededRng(mixSeed(seed, REST_SALT + index));
    const ambleRng = createSeededRng(mixSeed(seed, AMBLE_SALT + index));

    // INDOORS. Their footing is one of their shelter's own footprint cells, a third of a unit
    // over the threshold on the lee wall — see `SHELTER_DOORWAY_DEPTH` for why that depth and
    // not a deeper one. No cell is allocated and no tier is consulted, which is the point: a
    // person indoors is not standing on the board's ground, so the frost under the floor is
    // not their problem and the wholly frozen last round does not move them.
    const insideOf = shelter ? (plan.indoors.get(citizen.id) ?? null) : null;
    const wall = insideOf ? wallByNode.get(insideOf) : undefined;
    if (shelter && insideOf && wall) {
      const slot = slotByCitizen.get(citizen.id) ?? { index: 0, crowd: 1 };
      const point = doorwayPoint(wall, slot.index, slot.crowd, restRng());
      // A SHELTERING CITIZEN GOES NOWHERE: they press further into the doorway and ease back
      // out. Inward, so both ends are over the same threshold and inside the same cell —
      // 0.33 + 0.85 is 1.18 of a 4-unit cell — which is what makes "the beat never touches
      // board ground the frost can take" a fact about the arithmetic rather than about a seed.
      const shift = SHELTER_SHIFT * (0.55 + 0.45 * ambleRng());
      places.push({
        id: citizen.id,
        point,
        walkTo: {
          x: point.x + wall.inward.x * shift,
          z: point.z + wall.inward.z * shift,
        },
        state: "sheltering",
        shelteredIn: insideOf,
      });
      continue;
    }

    // WHERE THEY COME TO REST. On an ordinary day, in the order the design puts it: a daytime
    // destination if the engine gave them one, otherwise their own doorstep, otherwise the
    // apron with everybody else who has nowhere to be.
    //
    // On a crisis board, this is the OVERFLOW: nothing standing had room for them, so they are
    // out on the ring. Anchored on their own home even so — the nearest fringe cell to the
    // house they were turned away from — so the crowd out at the waterline keeps the shape the
    // settlement had rather than piling at one compass point of it.
    let restAnchor: GroundPoint;
    let state: CitizenState = citizen.state;
    if (shelter) {
      state = "sheltering";
      const own = home ?? hubPlacement;
      restAnchor = own
        ? transformCenter(own, footprintFor(own.nodeId))
        : apronPoint(hubCentre, waitingRank++);
    } else {
      const restBearing = restRng() * Math.PI * 2;
      restAnchor = day
        ? buildingApronPoint(day, restBearing)
        : home
          ? buildingApronPoint(home, restBearing)
          : apronPoint(hubCentre, waitingRank++);
    }
    const restCell = nearestStandingCell(
      restAnchor,
      shelter ? ringOnly : tiers,
      taken,
      perCell,
      null,
    );
    if (restCell) {
      claim(restCell);
    }
    const restCentre = restCell ? centreOf(restCell) : clampToIsland(restAnchor);
    const point: GroundPoint = {
      x: restCentre.x + (restRng() - 0.5) * 2 * CELL_JITTER,
      z: restCentre.z + (restRng() - 0.5) * 2 * CELL_JITTER,
    };

    // THE OTHER END OF THE BEAT. A citizen with both a home and a daytime destination walks
    // the trip between them, which is the design's own build beat: "children start making the
    // trip — a route appears where none existed". Everybody else ambles a few cells, so the
    // settlement is never a diorama of standing figures.
    let walkTo: GroundPoint;
    if (shelter) {
      // Toward the middle of their own fringe cell, so the two ends of the beat are in one
      // cell out on the permanently-clear ring. Somebody who happens to be standing dead
      // centre shifts on a seeded bearing instead, so nobody is a statue even here.
      const reach = Math.hypot(restCentre.x - point.x, restCentre.z - point.z);
      const spin = ambleRng() * Math.PI * 2;
      const dirX = reach > 1e-6 ? (restCentre.x - point.x) / reach : Math.cos(spin);
      const dirZ = reach > 1e-6 ? (restCentre.z - point.z) / reach : Math.sin(spin);
      // GATED ON A CELL HAVING BEEN ALLOCATED, which is what makes "both ends are in one
      // cell" provable rather than probable. With a cell, `restCentre` is that cell's centre
      // and the shift moves toward it, so `walkTo` is nearer the centre than `point` was and
      // therefore in the same cell. Without one — no standable cell anywhere on the island,
      // which the fringe rules out and `citizenPlaces.test.ts` floors — the beat is zero
      // length, so the two ends are the same point and there is still nothing to cross.
      const shift = restCell ? SHELTER_SHIFT * (0.55 + 0.45 * ambleRng()) : 0;
      walkTo = { x: point.x + dirX * shift, z: point.z + dirZ * shift };
    } else {
      const commutesFrom =
        day && home && home.nodeId !== day.nodeId
          ? buildingApronPoint(home, ambleRng() * Math.PI * 2)
          : null;
      const walkAnchor =
        commutesFrom ??
        (() => {
          const angle = ambleRng() * Math.PI * 2;
          const radius =
            AMBLE_MIN_RADIUS + ambleRng() * (AMBLE_MAX_RADIUS - AMBLE_MIN_RADIUS);
          return {
            x: point.x + Math.cos(angle) * radius,
            z: point.z + Math.sin(angle) * radius,
          };
        })();

      const walkCell = nearestStandingCell(
        walkAnchor,
        tiers,
        taken,
        perCell,
        restCell ? cellKey(restCell.col, restCell.row) : null,
      );
      if (walkCell) {
        claim(walkCell);
      }
      const walkCentre = walkCell ? centreOf(walkCell) : clampToIsland(walkAnchor);
      walkTo = {
        x: walkCentre.x + (ambleRng() - 0.5) * 2 * CELL_JITTER,
        z: walkCentre.z + (ambleRng() - 0.5) * 2 * CELL_JITTER,
      };
    }

    places.push({ id: citizen.id, point, walkTo, state, shelteredIn: null });
  }

  return places;
}
