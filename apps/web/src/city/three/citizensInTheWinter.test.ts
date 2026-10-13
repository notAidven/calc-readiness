import {
  type CitizenNodeInput,
  createHardWinter,
  deriveCitizenRoster,
  type HardWinterState,
  hardWinterReducer,
  hardWinterView,
  MAX_RENDERED_CITIZENS,
  type WinterAction,
} from "@cr/game";
import { describe, expect, it } from "vitest";

import { CURRENT_ERA_ID } from "../eraDressing";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../townHall";
import {
  BUILDABLE_RADIUS,
  defaultPlacements,
  footprintCells,
  footprintFor,
  GRID_CELL,
  type GroundPoint,
  ISLAND_GRASS_RADIUS,
  type PlacedTransform,
} from "../worldLayout";
import { buildCitizenRig, poseCitizens } from "./Citizens";
import { type CitizenPlace, citizenPlaces } from "./citizenPlaces";
import {
  type ShelterGround,
  shelterCapacityOf,
  shelterGround,
  shelterTierOf,
} from "./citizenShelter";

/**
 * **THE CITY'S PEOPLE DURING THE HARD WINTER.**
 *
 * The team lead, 2026-08-02: *"during the winter crisis - the citizens should stay within
 * where the frost is; they shouldnt be running outside, they should be within the
 * bounds/hiding/looking scared"*. And the ruling that reshaped it on 2026-08-03: *"people
 * shelter INSIDE the buildings that survived"* — see `citizenShelter.ts` for that one in full,
 * and `citizensShelterInside.test.ts` for the claims it added. This file holds what it CHANGED.
 *
 * Every board here is a REAL PLAYED WINTER — `createHardWinter`, then rounds through
 * `hardWinterReducer`, then `hardWinterView` — rather than a set of cells this file made up. So
 * the frost the crowd is dodging is the frost the reducer actually advances, at the schedule the
 * tuning actually ships, and a retune of `HARD_WINTER.spread` moves these tests with it instead
 * of leaving them measuring a board nobody plays.
 *
 * ## THE CLAIM MOVED, AND IT MOVED OUTWARD RATHER THAN LOOSER
 *
 * It used to be *"no citizen stands on frozen ground"*, over every citizen. That is now the
 * wrong shape in one specific way: a person INDOORS is standing on their shelter's own footprint
 * cell, which is a board cell the frost may well have taken — ground under a floor. Asserting
 * the old sentence over them would forbid the whole feature.
 *
 * So the claim is now {@link exposedToFrost}, it is stronger than the sentence it replaces, and
 * it is total over the roster because every citizen is in exactly one of its two halves:
 *
 *  - **outdoors, and OFF THE BOARD.** Not merely off frozen ground: on the permanently-clear
 *    annulus the winter board does not cover, which the frost can never take at any tuning. The
 *    old claim allowed an unfrozen board cell and this one does not.
 *  - **indoors, and inside a building that is STANDING.** Both ends of the beat within that
 *    building's own footprint cells, and the building absent from the ruin set — so "nobody
 *    shelters in a wreck" is part of the same sweep rather than a separate promise.
 *
 * ## AND IT IS SHOWN TO HAVE TEETH IN-BAND, BOTH HALVES SEPARATELY
 *
 * An assertion that a set is empty is the classic shape of a guard that measures nothing. So the
 * check is a FUNCTION returning complaints, run over the real places (expected empty) and then
 * over the same places with one citizen moved (expected to name exactly them). Both halves get
 * their own injection, because a check that had lost one of them would still pass the other's.
 */

const SEED = 0x5eed;
const HUB = TOWN_HALL_CENTER_TRANSFORM;
const HUB_PLACEMENT: PlacedTransform = { ...HUB, nodeId: TOWN_HALL_ID };

/** The six era-one skill nodes, in registry order. */
const SKILL_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.5", "NUM.4"] as const;

const ROLES: Readonly<Record<string, CitizenNodeInput["citizen_role"]>> = {
  "NUM.2": "residence",
  "NUM.3": "school",
};

function masteredNode(nodeId: string): CitizenNodeInput {
  return {
    node_id: nodeId,
    citizen_role: ROLES[nodeId] ?? "civic",
    placed: true,
    mastery: 2,
    lesson_stage: "done",
    placement_estimate: 0,
  };
}

/** The island the whole file is played on: every skill built, mastered, and placed for real. */
const CITY = defaultPlacements([...SKILL_NODES], [HUB_PLACEMENT], BUILDABLE_RADIUS);
const ROSTER = deriveCitizenRoster({ nodes: SKILL_NODES.map(masteredNode), seed: SEED });

/**
 * **THE ACCEPTED GAP** (see `citizenShelter.ts`'s note on `SHELTER_PER_PLOT_CELL`, and
 * `citizensShelterInside.test.ts`'s `LIVE_SHELTER_SHORTFALL`): the founding-population
 * rebalance left this island's flawless shelter capacity short of its own settled population,
 * so a fixed handful are on the ring even with every building standing. Derived from the same
 * settlement this file plays on, not pinned, so a retune of either side updates every case here
 * with it.
 */
const LIVE_SHELTER_SHORTFALL = Math.max(
  0,
  ROSTER.population -
    [...CITY, HUB_PLACEMENT].reduce((total, placed) => total + shelterCapacityOf(placed.nodeId), 0),
);

/** `STANDING_PER_CELL` in `citizenPlaces.ts`. Not exported; restated so the floor names it. */
const STANDING_PER_CELL_ON_AN_ORDINARY_DAY = 5;

/**
 * A city built OUT toward one shore, with the Dwellings at rim depth 0.
 *
 * `defaultPlacements` fills from the centre, so on the live layout every building is two bands
 * deep or more and the frost reaches none of them until late. Re-anchoring is only observable
 * on a building the frost actually arrives at, so it gets a board of its own.
 */
const RIM_DWELLINGS: PlacedTransform = { nodeId: "NUM.2", col: 3, row: 0, rot: 0 };
const RIM_CITY: readonly PlacedTransform[] = [
  RIM_DWELLINGS,
  { nodeId: "NUM.S", col: -1, row: 1, rot: 0 },
  { nodeId: "NUM.F", col: -1, row: -2, rot: 0 },
  { nodeId: "NUM.3", col: -3, row: -1, rot: 0 },
  { nodeId: "NUM.5", col: -3, row: 2, rot: 0 },
  { nodeId: "NUM.4", col: 1, row: -3, rot: 0 },
];

function playRound(winter: HardWinterState, action: WinterAction): HardWinterState {
  let next = hardWinterReducer(winter, { type: "declare", action });
  next = hardWinterReducer(next, { type: "resolve", correct: 2, asked: 3 });
  return hardWinterReducer(next, { type: "end_round" });
}

/**
 * The board after `rounds` closed rounds of a winter in which the frost was never opposed.
 *
 * The action each round is `reinforce`, which is the only one of the three that leaves the
 * FROST alone: a fire wards ground (so the frost's reach would be the fire's rather than the
 * schedule's) and a pull-back abandons a whole rim band. Reinforcing hardens one building and
 * changes nothing about which cells freeze, so these boards are the tuning's own timetable.
 * The ward gets its own case below, where it is the subject rather than a confound.
 */
function untouchedBoard(rounds: number): { state: HardWinterState; ground: ShelterGround } {
  let winter = createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: CITY.map((p) => ({ node_id: p.nodeId, col: p.col, row: p.row })),
  });
  for (let round = 0; round < rounds; round += 1) {
    winter = playRound(winter, { kind: "reinforce", node_id: "NUM.5" });
  }
  const ground = shelterGround(hardWinterView(winter).rows);
  if (!ground) {
    throw new Error("hardWinterView produced no rows, so there is no board to shelter on");
  }
  return { state: winter, ground };
}

function placesOn(ground: ShelterGround | null): readonly CitizenPlace[] {
  return citizenPlaces({
    roster: ROSTER,
    placements: CITY,
    hub: HUB,
    seed: SEED,
    shelter: ground,
  });
}

function rigOn(ground: ShelterGround | null) {
  const places = placesOn(ground);
  return {
    places,
    rig: buildCitizenRig({
      roster: ROSTER,
      places,
      placements: [...CITY, HUB_PLACEMENT],
      shelter: ground,
    }),
  };
}

/** The `"col,row"` cell a ground point falls in — the same key the winter board uses. */
function cellKeyOf(point: GroundPoint): string {
  return `${Math.floor(point.x / GRID_CELL)},${Math.floor(point.z / GRID_CELL)}`;
}

function centreOfKey(key: string): GroundPoint {
  const [col, row] = key.split(",");
  return { x: (Number(col) + 0.5) * GRID_CELL, z: (Number(row) + 0.5) * GRID_CELL };
}

/* -------------------------------------------------------------------------- */
/* The claim                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Every citizen standing somewhere the frost can reach, named. **THE claim, as a function so it
 * can be shown to have teeth.**
 *
 * Both ends of the beat, because a citizen who rests somewhere safe and shifts onto ice has
 * still been drawn standing on ice for half of every cycle.
 *
 * `standing` is the buildings the winter has NOT wrecked, keyed by node id. It is passed rather
 * than derived so this function can be pointed at a board and a ruin set that disagree, which is
 * how the "nobody shelters in a wreck" half is injected.
 */
function exposedToFrost(
  places: readonly CitizenPlace[],
  ground: ShelterGround,
  standing: ReadonlyMap<string, PlacedTransform>,
): readonly string[] {
  const complaints: string[] = [];
  for (const place of places) {
    for (const [what, point] of [
      ["rests", place.point],
      ["shifts", place.walkTo],
    ] as const) {
      const key = cellKeyOf(point);
      if (place.shelteredIn === null) {
        // OUTDOORS. The ring, which the board does not cover, so no advance can ever reach it.
        if (ground.land.has(key)) {
          complaints.push(`${place.id} ${what} outdoors on board cell ${key}`);
        }
        continue;
      }
      // INDOORS. Inside a building that is still up, and inside its own walls.
      const placed = standing.get(place.shelteredIn);
      if (!placed) {
        complaints.push(
          `${place.id} ${what} inside ${place.shelteredIn}, which is not standing`,
        );
        continue;
      }
      if (!footprintCells(placed, footprintFor(placed.nodeId)).includes(key)) {
        complaints.push(
          `${place.id} ${what} at ${key}, outside ${place.shelteredIn}'s walls`,
        );
      }
    }
  }
  return complaints;
}

/** The city's buildings that the winter has not wrecked, hall included, keyed by node id. */
function standingIn(
  buildings: readonly PlacedTransform[],
  ruined: ReadonlySet<string> = new Set<string>(),
): ReadonlyMap<string, PlacedTransform> {
  return new Map(
    buildings.filter((placed) => !ruined.has(placed.nodeId)).map((p) => [p.nodeId, p]),
  );
}

/**
 * Every citizen standing on FROZEN ground, named — the original sentence, kept and re-scoped to
 * the people it is still about.
 *
 * It is implied by {@link exposedToFrost}: the ring is not board land, so it cannot be frozen.
 * Kept anyway because it is the lead's own instruction stated literally, and because the two
 * fail differently — this one names ice, that one names the board.
 */
function standingOnFrost(
  places: readonly CitizenPlace[],
  ground: ShelterGround,
): readonly string[] {
  const complaints: string[] = [];
  for (const place of places) {
    if (place.shelteredIn !== null) {
      continue;
    }
    for (const [what, point] of [
      ["rests", place.point],
      ["shifts", place.walkTo],
    ] as const) {
      const key = cellKeyOf(point);
      if (ground.frozen.has(key)) {
        complaints.push(`${place.id} ${what} on frozen ${key}`);
      }
    }
  }
  return complaints;
}

/**
 * Every cell a walk's polyline passes through, sampled densely.
 *
 * **SAMPLED RATHER THAN REASONED ABOUT, and that is the point of doing it this way.** The
 * source argues that a route between adjacent cell centres cannot enter a third cell, which is
 * true and is exactly the kind of argument that stops being true after somebody adds a
 * diagonal step or a smoothing pass. A fifth of a unit over a 4-unit cell cannot skip one, so
 * this measures the polyline the renderer actually walks instead of trusting the geometry.
 */
function cellsAlong(path: readonly GroundPoint[]): ReadonlySet<string> {
  const cells = new Set<string>();
  const step = 0.2;
  for (let index = 1; index < path.length; index += 1) {
    const a = path[index - 1] as GroundPoint;
    const b = path[index] as GroundPoint;
    const span = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(span / step));
    for (let sample = 0; sample <= steps; sample += 1) {
      const t = sample / steps;
      cells.add(cellKeyOf({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }));
    }
  }
  return cells;
}

/**
 * Every walk that crosses ground the frost can reach, named — the pathing half of the same
 * claim, and scoped the same way.
 *
 * A sheltered citizen's route may cross their own building's footprint cells and nothing else,
 * frozen or not: that is a floor under a roof. An overflow citizen's may not touch board land at
 * all. So this takes the places beside the rig, to know which of the two each walk is.
 */
function pathingOverFrost(
  rig: ReturnType<typeof buildCitizenRig>,
  places: readonly CitizenPlace[],
  ground: ShelterGround,
  standing: ReadonlyMap<string, PlacedTransform>,
): readonly string[] {
  const byId = new Map(places.map((place) => [place.id, place]));
  const complaints: string[] = [];
  for (let index = 0; index < rig.walks.length; index += 1) {
    const walk = rig.walks[index];
    const id = rig.drawn[index];
    if (!walk || !id) {
      continue;
    }
    const place = byId.get(id);
    const inside = place?.shelteredIn ?? null;
    const own = inside ? standing.get(inside) : undefined;
    const walls = own ? new Set(footprintCells(own, footprintFor(own.nodeId))) : null;
    for (const key of cellsAlong(walk.path)) {
      if (walls) {
        if (!walls.has(key)) {
          complaints.push(`${id} walks out of ${inside} onto ${key}`);
        }
        continue;
      }
      if (ground.land.has(key)) {
        complaints.push(`${id} walks over board cell ${key}`);
      }
    }
  }
  return complaints;
}

/* -------------------------------------------------------------------------- */

describe("nobody is left where the frost can reach them, at every round of a real winter", () => {
  it("holds on the untouched board, and names the citizen when one is shoved onto ice", () => {
    // THE FLOOR FIRST, because "nobody is exposed" is satisfied by an empty crowd and by a
    // board with no frost on it. Both counts have to be real for the emptiness below to mean
    // anything, and they are read off the engine rather than written down.
    const { ground } = untouchedBoard(2);
    expect(ROSTER.population).toBe(48);
    expect(ground.frozen.size).toBeGreaterThanOrEqual(28);
    expect(ground.land.size).toBe(88);

    const places = placesOn(ground);
    const standing = standingIn([...CITY, HUB_PLACEMENT]);
    expect(places).toHaveLength(ROSTER.population);
    expect(exposedToFrost(places, ground, standing)).toEqual([]);
    expect(standingOnFrost(places, ground)).toEqual([]);

    // TEETH, HALF ONE: a citizen put OUTDOORS on a cell the frost holds. `shelteredIn: null` is
    // what makes them outdoors, which is the same field the geometry sets, so this is the shape
    // the defect would really take — an overflow citizen given board ground instead of the ring.
    const frozenCell = [...ground.frozen].sort()[0] as string;
    const strayed = places.map((place, index) =>
      index === 0 ? { ...place, shelteredIn: null, point: centreOfKey(frozenCell) } : place,
    );
    const onIce = exposedToFrost(strayed, ground, standing);
    expect(onIce.length).toBeGreaterThan(0);
    expect(onIce[0]).toContain(places[0]?.id);
    expect(onIce[0]).toContain(frozenCell);
    expect(standingOnFrost(strayed, ground)[0]).toContain(frozenCell);

    // TEETH, HALF TWO: the same crowd read against a ruin set that has taken their shelter. This
    // is the half a re-scoped `exposedToFrost` could have lost silently, because half one passes
    // whether or not the indoors branch does anything at all.
    const sheltered = places.find((place) => place.shelteredIn !== null);
    expect(sheltered, "nobody was indoors, so half two would be vacuous").toBeDefined();
    const wrecked = exposedToFrost(
      places,
      ground,
      standingIn([...CITY, HUB_PLACEMENT], new Set([sheltered?.shelteredIn as string])),
    );
    expect(wrecked.length).toBeGreaterThan(0);
    expect(wrecked.join(" ")).toContain("which is not standing");
  });

  it("holds at EVERY round, so the safe region follows the advance rather than a snapshot", () => {
    // The frost advances at the end of every round, so a rule computed once — at the opening
    // board, or at the first render — would be correct on round one and wrong afterwards. This
    // is the same claim re-asked at each board the reducer produces.
    const standing = standingIn([...CITY, HUB_PLACEMENT]);
    let deepest = 0;
    for (let rounds = 0; rounds <= 3; rounds += 1) {
      const { ground } = untouchedBoard(rounds);
      deepest = Math.max(deepest, ground.frozen.size);
      const places = placesOn(ground);
      expect(places, `round ${rounds}`).toHaveLength(ROSTER.population);
      expect(exposedToFrost(places, ground, standing), `round ${rounds}`).toEqual([]);
    }
    // The floor on the sweep: the frost has to have actually taken most of the island somewhere
    // in that range, or every board above was an easy one.
    expect(deepest).toBeGreaterThanOrEqual(72);
  });

  it("shelters the crowd INDOORS even when the frost has taken the WHOLE island", () => {
    // **THE CASE THE 2026-08-03 RULING EXISTS FOR, and the one that used to read the other way.**
    // Every tuning this encounter has shipped reaches the island's heart on the last beat, so the
    // last round closes with all 88 cells frozen. The old rule needed standable ground, found
    // none, and put the whole population on the ring — at every accuracy, which is why the
    // crisis's last and most memorable image was the one thing that did not vary with how well it
    // was played.
    //
    // With the buildings standing, a wholly frozen board now shelters everybody its buildings can
    // hold, indoors, with the ice under the floors.
    let wholly: ShelterGround | null = null;
    for (let rounds = 3; rounds <= 6 && wholly === null; rounds += 1) {
      const { ground } = untouchedBoard(rounds);
      if (ground.frozen.size === ground.land.size) {
        wholly = ground;
      }
    }
    expect(wholly, "no schedule in range froze the whole island").not.toBeNull();
    const ground = wholly as ShelterGround;
    expect(ground.frozen.size).toBe(88);

    const standing = standingIn([...CITY, HUB_PLACEMENT]);
    const places = placesOn(ground);
    expect(places).toHaveLength(ROSTER.population);
    expect(exposedToFrost(places, ground, standing)).toEqual([]);

    // The settlement's capacity is `LIVE_SHELTER_SHORTFALL` short of the population, so with
    // nothing wrecked exactly that many are still on the ring — read as a comparison against the
    // capacity rather than as a digit, so a retune of `SHELTER_PER_PLOT_CELL` moves it too.
    const places_ = [...standing.keys()].reduce(
      (total, nodeId) => total + shelterCapacityOf(nodeId),
      0,
    );
    expect(places_).toBe(ROSTER.population - LIVE_SHELTER_SHORTFALL);
    expect(places.filter((place) => place.shelteredIn === null)).toHaveLength(
      LIVE_SHELTER_SHORTFALL,
    );

    // ...and the SAME wholly frozen board with nothing left standing puts every one of them out
    // on the ring, still on the island's own grass. `ISLAND_GRASS_RADIUS` rather than
    // `WALKABLE_RADIUS` is the right bound and the same one `citizenPlaces.test.ts` uses: the
    // radius bounds the CELL CENTRE, and the jitter inside a cell can put a person a unit past it.
    const lost = citizenPlaces({
      roster: ROSTER,
      placements: CITY,
      hub: HUB,
      seed: SEED,
      shelter: ground,
      ruinedNodeIds: new Set([...CITY.map((p) => p.nodeId), TOWN_HALL_ID]),
    });
    expect(lost).toHaveLength(ROSTER.population);
    expect(exposedToFrost(lost, ground, standingIn([]))).toEqual([]);
    for (const place of lost) {
      const key = cellKeyOf(place.point);
      expect(place.shelteredIn, `${place.id} sheltered in a ruin`).toBeNull();
      expect(ground.land.has(key), `${place.id} at ${key}`).toBe(false);
      expect(
        Math.hypot(place.point.x, place.point.z),
        `${place.id} walked off the island`,
      ).toBeLessThan(ISLAND_GRASS_RADIUS);
    }
  });

  it("leaves ground a FIRE is holding available, because a ward is not frozen", () => {
    // A warded cell BLOCKS the advance, so it never enters `frozen` — which means every fire a
    // player lights is an unfrozen island inside the frost, and the crowd may shelter on it with
    // no special case anywhere in this feature. Pinned from the CROWD's side rather than left as
    // a fact about the reducer, because a `shelterGround` that folded ward into frost would take
    // the player's own bonfires off the list of places their people can stand.
    let winter = createHardWinter({
      era: CURRENT_ERA_ID,
      buildings: CITY.map((p) => ({ node_id: p.nodeId, col: p.col, row: p.row })),
    });
    winter = hardWinterReducer(winter, {
      type: "declare",
      action: { kind: "fire", col: 3, row: 3 },
    });
    winter = hardWinterReducer(winter, { type: "resolve", correct: 3, asked: 3 });
    const view = hardWinterView(winter);
    const ground = shelterGround(view.rows) as ShelterGround;
    const warded = new Set<string>();
    for (const line of view.rows) {
      for (const cell of line) {
        if (cell.land && cell.warded) {
          warded.add(`${cell.col},${cell.row}`);
        }
      }
    }
    // The floor: a fire that warded nothing would make everything below vacuous.
    expect(warded.size).toBeGreaterThanOrEqual(8);
    expect(winter.fires).toHaveLength(1);
    for (const key of warded) {
      const [col, row] = key.split(",");
      expect(ground.frozen.has(key), `warded ${key} counted as frozen`).toBe(false);
      // And it is not merely absent from `frozen`: the tier a citizen is allocated by has to
      // admit it, which is the thing the allocation actually reads.
      expect(
        shelterTierOf(ground, Number(col), Number(row)),
        `nobody may stand on warded ${key}`,
      ).not.toBeNull();
    }
    expect(
      exposedToFrost(placesOn(ground), ground, standingIn([...CITY, HUB_PLACEMENT])),
    ).toEqual([]);
  });
});

describe("nobody WALKS anywhere the frost can reach either", () => {
  it("keeps every sampled point of every beat where it belongs, and catches a beat that is not", () => {
    const { ground } = untouchedBoard(2);
    const { rig, places } = rigOn(ground);
    const standing = standingIn([...CITY, HUB_PLACEMENT]);
    // Floors: a real crowd, real frost, and beats with real length. A rig of zero-length walks
    // would satisfy the polyline check without proving anything about routing.
    expect(rig.walks).toHaveLength(Math.min(ROSTER.population, MAX_RENDERED_CITIZENS));
    expect(ground.frozen.size).toBeGreaterThanOrEqual(28);
    expect(rig.walks.filter((walk) => walk.length > 0).length).toBe(rig.walks.length);
    expect(pathingOverFrost(rig, places, ground, standing)).toEqual([]);

    // TEETH: hand the same rig a beat that leaves the building and the polyline check has to
    // find it. Built through the real `buildCitizenRig`, so what is measured is the route the
    // renderer would actually walk rather than a hand-drawn line.
    const frozenCell = [...ground.frozen].sort()[0] as string;
    const wandered = places.map((place, index) =>
      index === 0 ? { ...place, walkTo: centreOfKey(frozenCell) } : place,
    );
    const strayed = buildCitizenRig({
      roster: ROSTER,
      places: wandered,
      placements: [...CITY, HUB_PLACEMENT],
      shelter: ground,
    });
    expect(pathingOverFrost(strayed, wandered, ground, standing).length).toBeGreaterThan(0);
  });

  it("collapses a sheltering beat into ONE cell, which is what makes the walk claim total", () => {
    // A beat with no interior cannot cross anything, whatever the router does with the ground
    // in between. Asserted as a property of every citizen rather than of the crowd on average,
    // because one person crossing the island is the whole defect.
    //
    // It holds on both sides of the ruling's split, by different arithmetic and to the same
    // conclusion: indoors, `SHELTER_DOORWAY_DEPTH` plus `SHELTER_SHIFT` is 1.18 of a 4-unit
    // threshold cell; on the ring, `CELL_JITTER` plus the shift is 1.95 of a half-width of 2.
    const { ground } = untouchedBoard(1);
    const places = placesOn(ground);
    expect(places).toHaveLength(ROSTER.population);
    for (const place of places) {
      expect(place.state, place.id).toBe("sheltering");
      expect(cellKeyOf(place.walkTo), `${place.id} left their shelter cell`).toBe(
        cellKeyOf(place.point),
      );
    }
    // ...and it is not a statue: the two ends are genuinely different points.
    for (const place of places) {
      const shift = Math.hypot(
        place.walkTo.x - place.point.x,
        place.walkTo.z - place.point.z,
      );
      expect(shift, `${place.id} has no beat at all`).toBeGreaterThan(0);
    }
  });

  it("still crosses the settlement on an ordinary day, so the collapse is the CRISIS's", () => {
    // The mirror of the case above, and the reason it is here: an implementation that
    // collapsed every beat everywhere would pass every frost assertion in this file while
    // quietly killing the fair-weather city. `citizenPlaces.test.ts` owns the whole-cell
    // floor; this is the one line that pins the DIFFERENCE to the board being a crisis.
    const fair = placesOn(null);
    const crossing = fair.filter(
      (place) => cellKeyOf(place.walkTo) !== cellKeyOf(place.point),
    ).length;
    expect(crossing).toBe(fair.length);
    expect(fair.every((place) => place.state !== "sheltering")).toBe(true);
  });
});

describe("the population is unchanged: people shelter, they do not vanish", () => {
  it("draws the same number of people on every board a winter can produce", () => {
    // The ruling this is held to is the ceremony's, in as many words: a crowd gathering is
    // "the same people standing somewhere else" (`ceremonyCrowd.ts`, D-ET8 §19.1). A crisis is
    // the same operation with a worse reason, so the count may not move — and the count is read
    // off the engine at each board rather than compared to a literal, so a retune moves it too.
    const drawnPerBoard = new Set<number>();
    const placedPerBoard = new Set<number>();
    for (let rounds = 0; rounds <= 4; rounds += 1) {
      const { ground } = untouchedBoard(rounds);
      const { rig, places } = rigOn(ground);
      placedPerBoard.add(places.length);
      drawnPerBoard.add(rig.drawn.length);
      expect(
        places.map((place) => place.id),
        `round ${rounds}`,
      ).toEqual(ROSTER.citizens.map((citizen) => citizen.id));
    }
    // Five boards, one answer: the roster's own length, and the drawn prefix at the cap.
    expect(placedPerBoard).toEqual(new Set([ROSTER.population]));
    expect(drawnPerBoard).toEqual(
      new Set([Math.min(ROSTER.population, MAX_RENDERED_CITIZENS)]),
    );
    // And the same answer fair weather gives, so the crisis is not a quieter city.
    const fair = rigOn(null);
    expect(fair.places).toHaveLength(ROSTER.population);
    expect(fair.rig.drawn.length).toBe(drawnPerBoard.values().next().value);
  });

  it("leaves the roster itself untouched — nothing here is an input to a count", () => {
    // The strongest form available: the roster is derived once at the top of this file and
    // every board above reads the same object. A staging that filtered or padded would have to
    // return a different length, which the case above catches; this catches a staging that
    // MUTATED what it was handed.
    const { ground } = untouchedBoard(3);
    const before = JSON.stringify(ROSTER);
    placesOn(ground);
    rigOn(ground);
    expect(JSON.stringify(ROSTER)).toBe(before);
    expect(ROSTER.population).toBe(48);
    expect(ROSTER.housed + ROSTER.waiting.length).toBe(ROSTER.population);
  });
});

describe("it reads as sheltering: knots at the doorways, and the open ground empty", () => {
  it("packs the crowd into KNOTS: a fraction of the cells, at several times the density", () => {
    // The strongest channel a figure a dozen screen pixels tall has is WHERE IT IS, so this is
    // the assertion that actually stands behind "a player glancing at the island can tell
    // something is wrong": the same forty-four people, in a fraction of the cells, and the
    // ground between the buildings emptied out.
    //
    // Measured on era one's fully built and mastered island at 28 of 88 cells frozen: 44 people
    // over **18 cells at 5 deep** on an ordinary day, and over the DOORWAY cells of seven
    // buildings while sheltering. Both figures are asserted as COMPARISONS rather than as digits,
    // so a retune of the capacity rule or of the island's layout moves them together.
    const { ground } = untouchedBoard(1);
    const busiest = (places: readonly CitizenPlace[]) => {
      const perCell = new Map<string, number>();
      for (const place of places) {
        const key = cellKeyOf(place.point);
        perCell.set(key, (perCell.get(key) ?? 0) + 1);
      }
      return { cells: perCell.size, deepest: Math.max(...perCell.values()) };
    };
    const fair = busiest(placesOn(null));
    const sheltering = busiest(placesOn(ground));
    // The floor: an ordinary day has to actually spread the crowd out, or "fewer cells" below
    // is a comparison against a crowd that was already in one place.
    expect(fair.cells).toBeGreaterThanOrEqual(12);
    expect(fair.deepest).toBeLessThanOrEqual(STANDING_PER_CELL_ON_AN_ORDINARY_DAY);
    expect(sheltering.cells).toBeLessThan(fair.cells * 0.8);
    expect(sheltering.deepest).toBeGreaterThan(fair.deepest);
  });

  it("empties the OPEN ground the ordinary crowd was standing on, which is the read", () => {
    // **HOW BIG THE DEFECT WAS, measured as the counterfactual, and re-scoped to the claim that
    // replaced it.** The fair-weather arrangement is derived over the SAME board, so this is the
    // number of citizens who were out on ground the frost had taken or was about to and are now
    // indoors. A guard that only said "nobody is exposed" would be silent about whether anybody
    // ever had been.
    const standing = standingIn([...CITY, HUB_PLACEMENT]);
    for (const rounds of [1, 2, 3]) {
      const { ground } = untouchedBoard(rounds);
      const wouldHaveBeen = new Set(
        standingOnFrost(
          placesOn(null).map((place) => ({ ...place, shelteredIn: null })),
          ground,
        ).map((line) => line.split(" ")[0]),
      );
      const places = placesOn(ground);
      expect(exposedToFrost(places, ground, standing), `round ${rounds}`).toEqual([]);
      // Re-measured after the founding-population rebalance changed the fair-weather crowd's own
      // density (`STANDING_PER_CELL`), which moves how many distinct citizens round 1's frost
      // reaches even though the frost schedule itself did not change.
      expect(wouldHaveBeen.size, `round ${rounds}`).toBeGreaterThanOrEqual(3);
      // And the open ground between the buildings really is emptied: every one of the roster is
      // either indoors or off the board, so no cell of unfrozen board land outside a footprint
      // has anybody on it.
      const walls = new Set(
        [...standing.values()].flatMap((placed) =>
          footprintCells(placed, footprintFor(placed.nodeId)),
        ),
      );
      const outInTheOpen = places.filter((place) => {
        const key = cellKeyOf(place.point);
        return ground.land.has(key) && !walls.has(key);
      });
      expect(
        outInTheOpen.map((p) => p.id),
        `round ${rounds}`,
      ).toEqual([]);
    }
  });

  it("leaves a building the round it is WRECKED, and not one round before", () => {
    // **THE ORDERING QUESTION, ANSWERED AS A MEASUREMENT: what happens to the people inside a
    // building the frost takes.** This is a learning game for teenagers and nothing here may read
    // as a roof coming down on anybody, so the ordering was checked rather than assumed.
    //
    // The answer is that the crowd is a pure function of the PUBLISHED board, and the reducer
    // marks a ruin inside the same `end_round` that advances the frost — so the ruin and the
    // re-staging are one state change with no render between them. A building is a shelter with
    // people in it, or a wreck with nobody in it, and never both. What it is NOT is a building
    // people desert early: they stay until the round it falls, which is what makes the loss
    // legible instead of pre-emptive.
    //
    // Measured on a city built out to one shore, so the frost really does reach a building —
    // `defaultPlacements` fills from the centre and nothing there falls until late.
    let winter = createHardWinter({
      era: CURRENT_ERA_ID,
      buildings: RIM_CITY.map((p) => ({ node_id: p.nodeId, col: p.col, row: p.row })),
    });
    const dwellingsRing = new Set(footprintCells(RIM_DWELLINGS, footprintFor("NUM.2")));
    const inTheDwellings: number[] = [];
    const dwellingsStanding: boolean[] = [];
    for (let round = 0; round <= 5; round += 1) {
      const ground = shelterGround(hardWinterView(winter).rows);
      if (!ground) {
        break;
      }
      const ruined = new Set(
        winter.buildings.filter((b) => b.state === "ruin").map((b) => b.node_id),
      );
      const places = citizenPlaces({
        roster: ROSTER,
        placements: RIM_CITY,
        hub: HUB,
        seed: SEED,
        shelter: ground,
        ruinedNodeIds: ruined,
      });
      expect(places, `round ${round}`).toHaveLength(ROSTER.population);
      expect(
        exposedToFrost(places, ground, standingIn([...RIM_CITY, HUB_PLACEMENT], ruined)),
        `round ${round}`,
      ).toEqual([]);
      // Nobody, on any board, is inside something the winter has wrecked.
      for (const place of places) {
        expect(
          place.shelteredIn === null || !ruined.has(place.shelteredIn),
          `${place.id} is inside the ruined ${place.shelteredIn}`,
        ).toBe(true);
      }
      inTheDwellings.push(
        places.filter((p) => dwellingsRing.has(cellKeyOf(p.point))).length,
      );
      dwellingsStanding.push(!ruined.has("NUM.2"));
      winter = playRound(winter, { kind: "reinforce", node_id: "NUM.5" });
    }
    // The floor: most of the island lives at the Dwellings, and at the opening board a real
    // crowd of them is inside it. Without this, "nobody is there later" would be satisfied by
    // nobody having been there at all.
    expect(inTheDwellings[0]).toBeGreaterThanOrEqual(shelterCapacityOf("NUM.2"));
    // The frost genuinely took it: standing at first, a wreck by the end.
    const fell = dwellingsStanding.findIndex((up) => !up);
    expect(fell, "the frost never wrecked the Dwellings on this board").toBeGreaterThan(0);
    // And that is the round its crowd leaves — not before, and not after.
    expect(inTheDwellings[fell - 1], "they left before it fell").toBeGreaterThan(0);
    expect(inTheDwellings[fell], "they stayed inside a wreck").toBe(0);
  });

  it("crouches, hunches, and holds the posed crouch under reduced motion", () => {
    // The other two channels a small figure has. Read out of the instance matrix, so what is
    // asserted is the transform the GPU is handed rather than the constant it came from.
    const { ground } = untouchedBoard(1);
    const sheltering = rigOn(ground).rig;
    const fair = rigOn(null).rig;
    expect(sheltering.bodies.count).toBe(fair.bodies.count);
    expect(sheltering.bodies.count).toBeGreaterThanOrEqual(44);

    // Under the preference the per-frame pose never runs, so this is the frame a learner with
    // `prefers-reduced-motion` set actually sees. It has to already be crouched.
    poseCitizens(sheltering, 0, true);
    poseCitizens(fair, 0, true);
    let shorter = 0;
    let leaning = 0;
    for (let index = 0; index < sheltering.bodies.count; index += 1) {
      const crisis = basisOf(sheltering.bodies, index);
      const ordinary = basisOf(fair.bodies, index);
      // Column 1 of the matrix is the transformed local +Y axis, scaled: its length is the
      // citizen's height scale and its tilt off vertical is the hunch.
      if (crisis.height < ordinary.height - 1e-6) {
        shorter += 1;
      }
      if (crisis.tilt > 0.1) {
        leaning += 1;
      }
    }
    expect(shorter).toBe(sheltering.bodies.count);
    expect(leaning).toBe(sheltering.bodies.count);

    // And it is a POSE, not a freeze: the preference holds the same frame at any clock.
    const held = Array.from(sheltering.bodies.instanceMatrix.array);
    poseCitizens(sheltering, 31.5, true);
    expect(Array.from(sheltering.bodies.instanceMatrix.array)).toEqual(held);
  });

  it("shivers where it stands, which the walk roll deliberately does not", () => {
    // The inversion `SHIVER_HZ` records: the walk roll is suppressed at rest because a crowd
    // swaying in place reads as a fidget, and the shiver runs at rest because a crowd
    // trembling on a freezing board reads as cold. Sampled inside the dwell, where a
    // fair-weather crowd is provably still.
    const { ground } = untouchedBoard(1);
    const sheltering = rigOn(ground).rig;
    expect(sheltering.bodies.count).toBeGreaterThanOrEqual(44);
    poseCitizens(sheltering, 0.02, false);
    const first = Array.from(
      { length: sheltering.bodies.count },
      (_, i) => basisOf(sheltering.bodies, i).tilt,
    );
    poseCitizens(sheltering, 0.13, false);
    let trembling = 0;
    for (let index = 0; index < sheltering.bodies.count; index += 1) {
      if (Math.abs(basisOf(sheltering.bodies, index).tilt - (first[index] ?? 0)) > 1e-4) {
        trembling += 1;
      }
    }
    // Most of the crowd, not all: somebody caught mid-shift has the same tilt at two instants
    // of a sine. A majority is what distinguishes a shiver from nothing moving.
    expect(trembling).toBeGreaterThan(sheltering.bodies.count / 2);
  });
});

/**
 * The height scale and the tilt off vertical of one instance, read out of the flat 16-float
 * matrix buffer. Column 1 (elements 4..6) is the transformed local +Y axis.
 */
function basisOf(
  mesh: { instanceMatrix: { array: ArrayLike<number> } },
  index: number,
): { height: number; tilt: number } {
  const at = index * 16;
  const x = mesh.instanceMatrix.array[at + 4] ?? 0;
  const y = mesh.instanceMatrix.array[at + 5] ?? 0;
  const z = mesh.instanceMatrix.array[at + 6] ?? 0;
  const height = Math.hypot(x, y, z);
  return { height, tilt: height > 0 ? Math.acos(Math.min(1, Math.abs(y) / height)) : 0 };
}
