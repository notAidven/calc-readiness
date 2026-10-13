import { type CitizenNodeInput, deriveCitizenRoster, FOUNDING_POPULATION } from "@cr/game";
import { describe, expect, it } from "vitest";

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
  transformCenter,
} from "../worldLayout";
import { CITIZEN_STAND_RADIUS, citizenPlaces } from "./citizenPlaces";

/**
 * Ground places for the crowd (Task 4.1 of the citizens implementation plan).
 *
 * THE COUNT FLOOR IS LOAD-BEARING IN EVERY CASE HERE. "Every place is on the grass"
 * and "no place is inside a building" both hold trivially over an empty crowd, so
 * each geometric assertion is paired with a floor on how many places it ran over —
 * and the floors are derived from the engine's own roster rather than written down,
 * so a retune moves them and a derivation that returns nothing fails.
 */

const SEED = 0x5eed;
const HUB = TOWN_HALL_CENTER_TRANSFORM;
const HUB_CENTRE = transformCenter(HUB, footprintFor(TOWN_HALL_ID));

/** The Dwellings (`NUM.2`), the island's only residence, placed east of the hub. */
const DWELLINGS: PlacedTransform = { nodeId: "NUM.2", col: 3, row: 0, rot: 0 };
/** The Workshop (`NUM.3`), a school: it houses nobody and sits well clear of the hub. */
const WORKSHOP: PlacedTransform = { nodeId: "NUM.3", col: -5, row: 4, rot: 0 };

function node(over: Partial<CitizenNodeInput> & { node_id: string }): CitizenNodeInput {
  return {
    citizen_role: "civic",
    placed: true,
    mastery: 2,
    lesson_stage: "done",
    placement_estimate: 0,
    ...over,
  };
}

function roster(nodes: readonly CitizenNodeInput[]) {
  return deriveCitizenRoster({ nodes, seed: SEED });
}

function placesFor(
  nodes: readonly CitizenNodeInput[],
  placements: readonly PlacedTransform[],
) {
  const crowd = roster(nodes);
  return {
    crowd,
    places: citizenPlaces({ roster: crowd, placements, hub: HUB, seed: SEED }),
  };
}

/** The six era-one skill nodes, and the two that are not `civic`. */
const ALL_SKILLS = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.5", "NUM.4"] as const;

function roleFor(nodeId: string): CitizenNodeInput["citizen_role"] {
  if (nodeId === "NUM.2") {
    return "residence";
  }
  return nodeId === "NUM.3" ? "school" : "civic";
}

/** The `"col,row"` cell a ground point falls in. */
function cellKeyOf(point: GroundPoint): string {
  return `${Math.floor(point.x / GRID_CELL)},${Math.floor(point.z / GRID_CELL)}`;
}

/**
 * How many CELLS a ground point stands from a building, in Chebyshev steps over the
 * grid: 0 would be on its footprint (which nothing may be), 1 is touching it.
 */
function cellsFromBuilding(point: GroundPoint, building: PlacedTransform): number {
  const col = Math.floor(point.x / GRID_CELL);
  const row = Math.floor(point.z / GRID_CELL);
  let best = Number.POSITIVE_INFINITY;
  for (const key of footprintCells(building, footprintFor(building.nodeId))) {
    const [bCol, bRow] = key.split(",").map(Number);
    best = Math.min(
      best,
      Math.max(Math.abs((bCol ?? 0) - col), Math.abs((bRow ?? 0) - row)),
    );
  }
  return best;
}

/** Every cell key a building or the hub stands on — where nobody may stand. */
function blockedCells(placements: readonly PlacedTransform[]): Set<string> {
  const blocked = new Set<string>();
  for (const placed of [...placements, { ...HUB, nodeId: TOWN_HALL_ID }]) {
    for (const key of footprintCells(placed, footprintFor(placed.nodeId))) {
      blocked.add(key);
    }
  }
  return blocked;
}

describe("citizenPlaces — a ground place for every person in the roster", () => {
  it("gives every citizen exactly one place, in roster order", () => {
    const { crowd, places } = placesFor([], []);
    // The floor: a bare island is the FOUNDING crowd, never nobody. An implementation
    // that returned an empty array would satisfy "one place each" vacuously.
    expect(crowd.population).toBe(FOUNDING_POPULATION);
    expect(places).toHaveLength(crowd.population);
    expect(places.map((place) => place.id)).toEqual(crowd.citizens.map((c) => c.id));
  });

  it("keeps every place on the island's grass, at a fully built and mastered city", () => {
    const nodes = [
      node({ node_id: "NUM.2", citizen_role: "residence" }),
      node({ node_id: "NUM.3", citizen_role: "school" }),
    ];
    const { crowd, places } = placesFor(nodes, [DWELLINGS, WORKSHOP]);
    // The floor, derived: two mastered buildings on top of the founding crowd.
    expect(crowd.population).toBeGreaterThanOrEqual(FOUNDING_POPULATION + 2);
    expect(places).toHaveLength(crowd.population);
    for (const place of places) {
      for (const point of [place.point, place.walkTo]) {
        expect(Math.hypot(point.x, point.z), place.id).toBeLessThan(ISLAND_GRASS_RADIUS);
      }
    }
  });

  it("never stands a citizen inside a building's or the hub's footprint", () => {
    const nodes = [node({ node_id: "NUM.2", citizen_role: "residence" })];
    const placements = [DWELLINGS, WORKSHOP];
    const { crowd, places } = placesFor(nodes, placements);
    const blocked = blockedCells(placements);
    // The floor: the assertion below is a `false` check over a set, which an empty
    // crowd passes. Both counts have to be real for it to mean anything.
    expect(blocked.size).toBeGreaterThanOrEqual(4 + 1 + 6);
    expect(places.length).toBeGreaterThanOrEqual(FOUNDING_POPULATION);
    expect(places).toHaveLength(crowd.population);
    for (const place of places) {
      for (const point of [place.point, place.walkTo]) {
        const cell = `${Math.floor(point.x / GRID_CELL)},${Math.floor(point.z / GRID_CELL)}`;
        expect(blocked.has(cell), `${place.id} at ${cell}`).toBe(false);
      }
    }
  });

  it("gathers the waiting crowd around the Civic Center", () => {
    // The cold open: eight people outside the hub with nowhere to be. They must read
    // as a group at the centre of the settlement, not as a scatter over the island.
    const { crowd, places } = placesFor([], []);
    expect(crowd.waiting).toHaveLength(FOUNDING_POPULATION);
    expect(places.length).toBeGreaterThanOrEqual(FOUNDING_POPULATION);
    for (const place of places) {
      expect(
        Math.hypot(place.point.x - HUB_CENTRE.x, place.point.z - HUB_CENTRE.z),
        place.id,
      ).toBeLessThan(BUILDABLE_RADIUS);
    }
  });

  it("stands a resident on ground TOUCHING their own home", () => {
    // The strongest form of "at their doorstep" the cell grid can express: the citizen's
    // cell is orthogonally or diagonally adjacent to one of the building's own cells.
    // A distance threshold was the first version of this and it was too weak — 10 units
    // is two and a half cells, which on a dense island is somebody else's front yard.
    const nodes = [node({ node_id: "NUM.2", citizen_role: "residence", mastery: 1 })];
    const { crowd, places } = placesFor(nodes, [DWELLINGS]);
    const housed = crowd.citizens.filter((c) => c.home_node_id === "NUM.2");
    // The floor: a Dwellings practised once houses ten, so this runs over ten people.
    // MASTERY 1 AND NOT 0 SINCE 2026-07-30: `GROUNDED CORRECTION 2` was OVERRULED on
    // `integration`, and a placed-but-unscored building now houses NOBODY
    // (`residenceCapacity` is 0 until a set is scored). At mastery 0 this case ran over
    // an empty crowd and every geometric assertion below held trivially — which is the
    // failure this floor exists to catch, and it caught it: `expected 0 to be greater
    // than or equal to 10`.
    expect(housed.length).toBeGreaterThanOrEqual(10);
    for (const citizen of housed) {
      const place = places.find((entry) => entry.id === citizen.id);
      expect(place, citizen.id).toBeDefined();
      expect(
        cellsFromBuilding(place?.point ?? { x: 0, z: 0 }, DWELLINGS),
        `${citizen.id} is not standing against their own home`,
      ).toBe(1);
    }
  });

  it("keeps most of a FULLY BUILT city's crowd against the building they belong to", () => {
    // The dense case, which is the one that actually bites: with six buildings and the
    // hub packed into the middle of the island, the free ground is the ring around them,
    // so a rule that put everybody on one fixed face of their building had them standing
    // out on the lawn. A few people genuinely get crowded out to a second ring, so this
    // is a PROPORTION with a floor rather than a universal.
    const placements = defaultPlacements(
      [...ALL_SKILLS],
      [{ ...HUB, nodeId: TOWN_HALL_ID }],
      BUILDABLE_RADIUS,
    );
    const nodes = ALL_SKILLS.map((id) => node({ node_id: id, citizen_role: roleFor(id) }));
    const { crowd, places } = placesFor(nodes, placements);
    expect(crowd.population).toBe(48);
    const byId = new Map(places.map((place) => [place.id, place]));
    const placedNodes = new Set(placements.map((p) => p.nodeId));
    let belonging = 0;
    let touching = 0;
    for (const citizen of crowd.citizens) {
      const belongsTo = citizen.day_node_id ?? citizen.home_node_id;
      if (!belongsTo || !placedNodes.has(belongsTo)) {
        continue;
      }
      const building = placements.find((p) => p.nodeId === belongsTo);
      const place = byId.get(citizen.id);
      if (!building || !place) {
        continue;
      }
      belonging += 1;
      if (cellsFromBuilding(place.point, building) <= 1) {
        touching += 1;
      }
    }
    // The floor on the population the ratio is taken over, without which "80% of them"
    // could be four people out of five.
    expect(belonging).toBeGreaterThanOrEqual(30);
    expect(touching / belonging).toBeGreaterThan(0.75);
  });

  it("gives a commuter a walk that starts somewhere other than where it ends", () => {
    // "Children start making the trip — a route appears where none existed." A place
    // whose two ends coincide is a citizen standing still, which is the defect.
    const nodes = [
      node({ node_id: "NUM.2", citizen_role: "residence" }),
      node({ node_id: "NUM.3", citizen_role: "school" }),
    ];
    const { crowd, places } = placesFor(nodes, [DWELLINGS, WORKSHOP]);
    const commuters = crowd.citizens.filter(
      (c) => c.home_node_id !== null && c.day_node_id !== null,
    );
    expect(commuters.length).toBeGreaterThanOrEqual(8);
    for (const citizen of commuters) {
      const place = places.find((entry) => entry.id === citizen.id);
      const span = Math.hypot(
        (place?.walkTo.x ?? 0) - (place?.point.x ?? 0),
        (place?.walkTo.z ?? 0) - (place?.point.z ?? 0),
      );
      expect(span, citizen.id).toBeGreaterThan(0);
    }
  });

  it("gives every citizen a walk of at least a whole cell, so nobody is a statue", () => {
    // A NONZERO span was the first version of this and it was too weak: two ends jittered
    // inside the SAME cell are a few units apart, which passes "greater than zero" while
    // drawing a person shuffling on the spot. The claim that actually matters is that the
    // two ends are different CELLS, which puts a floor of one cell pitch under the beat
    // and cannot be satisfied by jitter.
    const { crowd, places } = placesFor([], []);
    expect(places.length).toBeGreaterThanOrEqual(FOUNDING_POPULATION);
    expect(places).toHaveLength(crowd.population);
    for (const place of places) {
      expect(cellKeyOf(place.walkTo), `${place.id} paces inside one cell`).not.toBe(
        cellKeyOf(place.point),
      );
    }
  });

  it("is deterministic for the same seed and city", () => {
    const args = {
      roster: roster([node({ node_id: "NUM.2", citizen_role: "residence" })]),
      placements: [DWELLINGS],
      hub: HUB,
      seed: SEED,
    };
    expect(args.roster.population).toBeGreaterThanOrEqual(FOUNDING_POPULATION);
    expect(citizenPlaces(args)).toEqual(citizenPlaces(args));
  });

  it("does not move a citizen when more people arrive after them", () => {
    // A place is drawn from a per-index sub-seed and allocated in index order, so
    // person 3 stands where person 3 stood whether the island holds eight or fourteen.
    // A single shared RNG stream, or an allocator that re-sorted the crowd, would
    // re-place everybody every time somebody arrived.
    const small = placesFor([], [WORKSHOP]);
    const big = placesFor([node({ node_id: "NUM.3", citizen_role: "school" })], [WORKSHOP]);
    expect(small.crowd.population).toBe(FOUNDING_POPULATION);
    expect(big.crowd.population).toBeGreaterThan(small.crowd.population);
    // The school houses nobody, so the founding eight are still waiting in both.
    expect(big.crowd.waiting.length).toBeGreaterThan(small.crowd.waiting.length);
    expect(big.places.slice(0, FOUNDING_POPULATION)).toEqual(
      small.places.slice(0, FOUNDING_POPULATION),
    );
  });

  it("carries the ROSTER's own state through, and never invents one in fair weather", () => {
    // `CitizenPlace.state` is what the renderer keys the crisis posture off, so it has to agree
    // with the engine on an ordinary day rather than being a second opinion about what people
    // are doing. Every state here is one the roster emitted; `sheltering` is the render layer's
    // and appears only with a board (`citizensInTheWinter.test.ts`).
    const nodes = [
      node({ node_id: "NUM.2", citizen_role: "residence" }),
      node({ node_id: "NUM.3", citizen_role: "school" }),
    ];
    const { crowd, places } = placesFor(nodes, [DWELLINGS, WORKSHOP]);
    expect(places).toHaveLength(crowd.population);
    const byId = new Map(crowd.citizens.map((citizen) => [citizen.id, citizen.state]));
    // The floor: more than one state has to be in play, or "matches the roster" is one value
    // compared with itself.
    expect(new Set(byId.values()).size).toBeGreaterThan(1);
    for (const place of places) {
      expect(place.state, place.id).toBe(byId.get(place.id));
      expect(place.state, place.id).not.toBe("sheltering");
    }
  });

  it("stands the overflow on grass that no building or road can ever claim", () => {
    // The r=22..25 annulus is permanently clear (`ISLAND_GRASS_RADIUS = 30` against
    // `BUILDABLE_RADIUS = 22`, with the decorative props ringed from 25 outward), which
    // is what guarantees a crowd always has somewhere to stand.
    expect(CITIZEN_STAND_RADIUS).toBeGreaterThan(BUILDABLE_RADIUS);
    expect(CITIZEN_STAND_RADIUS).toBeLessThanOrEqual(BUILDABLE_RADIUS + 3);
  });
});
