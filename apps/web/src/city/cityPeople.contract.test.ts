import { buildCityViewModel, MAX_RENDERED_CITIZENS } from "@cr/game";
import type { Mastery, StudentNodeState } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { cityCitizenRoster, cityVitality } from "./citizens";
import { MOCK_NODE_STATES } from "./mockCity";
import { TOWN_HALL_ID } from "./townHall";
import { BUILDABLE_RADIUS, defaultPlacements, type PlacedTransform } from "./worldLayout";

/**
 * THE CONTRACT BETWEEN THE TWO CONSUMERS OF THE CITY'S PEOPLE.
 *
 * `cityCitizenRoster` feeds the 3D scene (how many bodies, and what each one is) and
 * `cityVitality` feeds the DOM readout (the headcount and the two capacities). They
 * are separate calls in separate lanes, which is exactly the shape a drifting counter
 * takes: one surface says 22 and the other says 24, and whichever a reviewer happens
 * to be looking at is the one that seems right.
 *
 * It cannot happen here, and this file is the proof rather than the mechanism. The
 * mechanism is that neither number is STORED: both derive from the same
 * `citizenNodes()` list through the same `buildingLedger`, and the population is
 * `citizenPopulation` on both paths. What is asserted below is that the property
 * survives — over a swept population of city states, not over one convenient fixture.
 *
 * ## Why the sweep has a floor under it
 *
 * A `for` loop over an empty list of states passes every assertion in it. The floor is
 * what makes an empty sweep a failure, and it is separate from the assertion so that
 * "the sweep ran" and "the sweep agreed" fail at different lines.
 */

const ALL_NODES = MOCK_NODE_STATES.map((state) => state.node_id);
const ALL_WITH_HALL = defaultPlacements([TOWN_HALL_ID, ...ALL_NODES], [], BUILDABLE_RADIUS);
const TOWN_HALL_PLACEMENT: PlacedTransform | null =
  ALL_WITH_HALL.find((p) => p.nodeId === TOWN_HALL_ID) ?? null;
const ALL_PLACED = ALL_WITH_HALL.filter((p) => p.nodeId !== TOWN_HALL_ID);

interface CityCase {
  readonly label: string;
  readonly placements: readonly PlacedTransform[];
  readonly nodeStates: readonly StudentNodeState[];
}

function at(mastery: Mastery, stage: StudentNodeState["lesson_stage"]) {
  return MOCK_NODE_STATES.map((state) => ({
    ...state,
    mastery,
    lesson_stage: stage,
    completion_status: mastery >= 2 ? "complete" : state.completion_status,
  })) as StudentNodeState[];
}

/**
 * The population is every shape the city can be in that changes a headcount: nothing
 * placed, a partial island, the shipped mock, and all-placed at each mastery rung. The
 * two derivations must agree on all of them, not on the one the HUD happened to be
 * screenshotted in.
 */
const CITY_CASES: readonly CityCase[] = [
  { label: "bare island", placements: [], nodeStates: MOCK_NODE_STATES },
  {
    label: "two buildings placed",
    placements: ALL_PLACED.slice(0, 2),
    nodeStates: MOCK_NODE_STATES,
  },
  {
    label: "the shipped mock city",
    placements: ALL_PLACED,
    nodeStates: MOCK_NODE_STATES,
  },
  {
    label: "all placed, none started",
    placements: ALL_PLACED,
    nodeStates: at(0, "not_started"),
  },
  {
    label: "all placed, all taught but below the bar",
    placements: ALL_PLACED,
    nodeStates: at(1, "done"),
  },
  { label: "all placed, all mastered", placements: ALL_PLACED, nodeStates: at(2, "done") },
  { label: "all placed, all gold", placements: ALL_PLACED, nodeStates: at(3, "done") },
];

/** Below this the sweep is not exercising the city's shapes and says nothing. */
const CITY_CASE_FLOOR = 6;

function surfacesFor(city: CityCase) {
  const viewModel = buildCityViewModel({
    node_states: city.nodeStates,
    neighborhood_state: null,
  });
  return {
    roster: cityCitizenRoster({ viewModel, placements: city.placements }),
    vitality: cityVitality({ viewModel, placements: city.placements }),
    townHall: TOWN_HALL_PLACEMENT,
  };
}

describe("the renderer and the HUD read one population", () => {
  it("sweeps enough distinct city shapes to mean something (the floor)", () => {
    expect(CITY_CASES.length).toBeGreaterThanOrEqual(CITY_CASE_FLOOR);
  });

  it("agrees on the headcount in every one of them", () => {
    expect(CITY_CASES.length).toBeGreaterThanOrEqual(CITY_CASE_FLOOR);
    for (const city of CITY_CASES) {
      const { roster, vitality } = surfacesFor(city);
      expect(vitality.population, city.label).toBe(roster.population);
    }
  });

  it("actually varies across the sweep, so the agreement is not agreement on a constant", () => {
    // Seven cases that all produced 8 people would satisfy the assertion above while
    // proving nothing about a city that grows. The counts have to move.
    const counts = new Set(CITY_CASES.map((city) => surfacesFor(city).roster.population));
    expect(counts.size).toBeGreaterThanOrEqual(3);
  });
});

describe("population is a headcount and capacity is not — do not draw a capacity", () => {
  it("finds a city where the two genuinely differ, so the distinction is load-bearing", () => {
    const differing = CITY_CASES.filter((city) => {
      const { roster, vitality } = surfacesFor(city);
      return (
        roster.population !== roster.residence_capacity ||
        roster.population !== vitality.livability.sustains
      );
    });
    // If population and capacity happened to coincide everywhere, a renderer could
    // draw either and nobody would notice until they stopped coinciding.
    expect(differing.length).toBeGreaterThanOrEqual(3);
  });

  it("splits the population into housed and waiting, and nobody falls between", () => {
    expect(CITY_CASES.length).toBeGreaterThanOrEqual(CITY_CASE_FLOOR);
    for (const city of CITY_CASES) {
      const { roster } = surfacesFor(city);
      expect(roster.housed + roster.waiting.length, city.label).toBe(roster.population);
      expect(roster.citizens.length, city.label).toBe(roster.population);
    }
  });

  it("keeps the roster UNCAPPED — the render cap is the scene's, not the model's", () => {
    // D-CIT9: `MAX_RENDERED_CITIZENS` caps rendering only. If the derivation ever
    // clamps, the DOM readout starts lying about a city it can no longer count.
    const { roster, vitality } = surfacesFor({
      label: "all mastered",
      placements: ALL_PLACED,
      nodeStates: at(2, "done"),
    });
    expect(roster.citizens.length).toBe(roster.population);
    expect(vitality.population).toBe(roster.population);
    expect(MAX_RENDERED_CITIZENS).toBeGreaterThan(0);
  });
});

describe("what the renderer needs about each building", () => {
  it("keys every building by node_id and carries its role (D-CIT17)", () => {
    const { roster } = surfacesFor({
      label: "the shipped mock city",
      placements: ALL_PLACED,
      nodeStates: MOCK_NODE_STATES,
    });
    // A floor: an empty `buildings` array would satisfy every `for` below.
    expect(roster.buildings.length).toBeGreaterThanOrEqual(ALL_PLACED.length);
    const roles = new Set<string>();
    for (const building of roster.buildings) {
      expect(building.node_id, "every entry is keyed by node id").toBeTruthy();
      expect(
        ["residence", "school", "civic"],
        `${building.node_id} has a resolved role`,
      ).toContain(building.role);
      roles.add(building.role);
    }
    // D1 authors one residence, one school and four civic. A single-role island would
    // pass the containment check above while telling the renderer nothing.
    expect(roles.size).toBeGreaterThanOrEqual(3);
  });

  it("assigns every housed citizen a home that is one of those buildings", () => {
    const { roster } = surfacesFor({
      label: "all mastered",
      placements: ALL_PLACED,
      nodeStates: at(2, "done"),
    });
    const known = new Set(roster.buildings.map((building) => building.node_id));
    const housed = roster.citizens.filter((citizen) => citizen.home_node_id !== null);
    expect(housed.length).toBeGreaterThan(0);
    for (const citizen of housed) {
      expect(known, citizen.id).toContain(citizen.home_node_id);
    }
  });

  it("is deterministic without the caller supplying a seed", () => {
    // The renderer must not mint one (D-CIT8), so the default has to be stable.
    const city: CityCase = {
      label: "the shipped mock city",
      placements: ALL_PLACED,
      nodeStates: MOCK_NODE_STATES,
    };
    expect(surfacesFor(city).roster).toEqual(surfacesFor(city).roster);
  });
});
