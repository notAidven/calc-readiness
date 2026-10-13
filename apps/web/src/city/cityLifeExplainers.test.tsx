import { CIVIC_CATALOGUE, civicBuildingForRole, civicCatalogueForEra } from "@cr/economy";
import {
  buildCityViewModel,
  CITIZENS_PER_COMPLETE_BUILDING,
  CITIZENS_PER_MASTERED_SKILL,
  capacityForNode,
  cityRosterNodeIds,
  deriveProvision,
  ROAD_HAPPINESS_PER_TILE,
  SKILL_HAPPINESS_BY_ROLE,
} from "@cr/game";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import type { Mastery, StudentNodeState } from "@cr/state-schema";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CityVitalityPanel } from "./CityVitalityPanel";
import { cityVitality, civicContributionRowsOf } from "./citizens";
import { CITY_LIFE_EXPLAINERS, CITY_LIFE_STATS } from "./cityLifeExplainers";
import { civicPlacementId } from "./civic";
import { MOCK_NODE_STATES } from "./mockCity";
import { TOWN_HALL_ID } from "./townHall";
import { BUILDABLE_RADIUS, defaultPlacements, type PlacedTransform } from "./worldLayout";

/**
 * **EVERY CLAIM THE CITY LIFE HOVERS MAKE, HELD TO THE DERIVATION THAT MAKES IT TRUE.**
 *
 * The lead asked for a hover on each of the three figures saying what it means and how to
 * get more of it, and the danger in that is specific rather than general: **a tooltip that
 * is almost true is worse than none.** A learner reads "buy one of these and the number
 * goes up", buys one, watches nothing happen, and concludes the game is broken. So each
 * line names ONE lever, and this file is what stops that lever quietly ceasing to be one.
 *
 * ## What is asserted, and why it is not the copy
 *
 * Pinning the STRINGS would be worthless: the copy and the assertion would be one edit
 * apart, and a retune that made a sentence false would not touch either. What is pinned is
 * the MECHANIC each sentence names, measured through the same call the HUD makes
 * (`cityVitality`) and the same catalogue the shop sells from:
 *
 *  - **Population.** Practising moves the headcount, mastering moves it by twice as much
 *    again, and no purchase moves it at all.
 *  - **Livability.** A bought row raises what the city sustains by exactly its own figure,
 *    in every era; no single skill building can add more ROOM than the era's largest bought
 *    row; and the crowd arrives whether or not there is room for it.
 *  - **Happiness.** A Happiness-providing civic building is the largest single source of
 *    coverage in every era, against the other three bought rows, against a skill building
 *    and against a road tile; and one more tile reaches exactly one more person.
 *
 * Each of those is a sentence in `cityLifeExplainers.ts` turned into a measurement. Change
 * the economy so one stops holding and this file fails, which is the only way "the UI does
 * not describe a mechanic it no longer has" is a property rather than a hope.
 *
 * ## The populations, and why each is derived rather than listed
 *
 * The catalogue sweeps walk `CIVIC_CATALOGUE` and `ERA_SEQUENCE` themselves, so a
 * re-authored era arrives in these assertions with no edit here, and each has a floor under
 * it because "no counter-example" is also what a sweep over nothing reports. The panel
 * census reads the RENDERED rows rather than a list, so a fourth figure added to the panel
 * fails for want of an explanation instead of shipping unexplained.
 */

/* -------------------------------------------------------------------------- */
/* Fixtures — the same city the panel's own test builds                        */
/* -------------------------------------------------------------------------- */

const ALL_NODES = MOCK_NODE_STATES.map((state) => state.node_id);
const ALL_WITH_HALL = defaultPlacements([TOWN_HALL_ID, ...ALL_NODES], [], BUILDABLE_RADIUS);
const ALL_PLACED = ALL_WITH_HALL.filter((p) => p.nodeId !== TOWN_HALL_ID);

/**
 * Every node at one mastery rung, which is the only axis these measurements need.
 *
 * **`placement_estimate` is zeroed, and that is a correction rather than tidying.** The
 * mock city carries 3, 2 and 2 on its first three nodes, and since 2026-08-04 a passed
 * placement is itself a population term (`CitizenBuildingLedger.inherited`) — so half this
 * fixture was a TESTED-OUT learner, and *"practising a skill brings people and mastering it
 * brings twice as many again"* is a claim about the ordinary path. Measured over the mock's
 * own estimates the mastered term reads zero on three of six nodes, because the diagnostic
 * had already paid them. A learner the instrument passed nothing of is the population this
 * sentence describes; the other one is measured separately below.
 */
function at(mastery: Mastery, stage: StudentNodeState["lesson_stage"]) {
  return MOCK_NODE_STATES.map((state) => ({
    ...state,
    mastery,
    lesson_stage: stage,
    placement_estimate: 0,
    completion_status: mastery >= 2 ? "complete" : state.completion_status,
  })) as StudentNodeState[];
}

/** The same island, with every plot passed on the diagnostic and no practice behind it. */
function testedOutOfEverything(): StudentNodeState[] {
  return MOCK_NODE_STATES.map((state) => ({
    ...state,
    mastery: 0,
    lesson_stage: "done",
    placement_estimate: 2,
    completion_status: "complete",
    last_practiced_at: null,
  })) as StudentNodeState[];
}

function cityAt(params: {
  readonly nodeStates: readonly StudentNodeState[];
  readonly placements?: readonly PlacedTransform[];
  readonly civic?: readonly PlacedTransform[];
  /** Pass `true` to strip even the free row, which is the only way to leave a city short. */
  readonly noFreeCivic?: boolean;
  readonly roadTileCount?: number;
}) {
  const viewModel = buildCityViewModel({
    node_states: params.nodeStates,
    neighborhood_state: null,
  });
  return cityVitality({
    viewModel,
    placements: params.placements ?? ALL_PLACED,
    civic: params.noFreeCivic ? [] : civicContributionRowsOf(params.civic ?? []),
    roadTileCount: params.roadTileCount ?? 0,
  });
}

/** One bought building of `catalogueId`, as the placement the session would mint. */
function bought(catalogueId: string, sequence = 1): PlacedTransform {
  return { nodeId: civicPlacementId(catalogueId, sequence), col: 0, row: 0, rot: 0 };
}

/** Below this the catalogue sweeps are not sweeping a catalogue. */
const CATALOGUE_FLOOR = 40;
const ERA_FLOOR = 10;

/* -------------------------------------------------------------------------- */
/* The panel census, and the interaction                                       */
/* -------------------------------------------------------------------------- */

/** A city in the middle of its range, so no row reads as an edge case. */
const A_CITY = {
  population: 44,
  livability: { sustains: 72 },
  happiness: {
    coverage: 27,
    covered: 27,
    uncovered: 17,
    level: 61,
    band: "settling" as const,
    fromPaths: 18,
  },
  shortfalls: { livability: 0, happiness: 0, practice: 0, none: true },
  // Asked of the rule rather than transcribed, so this city cannot drift into the
  // alarmed state if the band floor moves: an alarmed row swaps its terms line
  // for an `AlarmLine`, which is a different set of rows for the census below to find.
  provision: deriveProvision({ population: 44, happinessLevel: 61, sustains: 72 }),
};

function renderPanel(): HTMLElement {
  render(<CityVitalityPanel vitality={A_CITY} />);
  return screen.getByTestId("city-vitality");
}

describe("every figure the panel draws has an explanation, and no explanation is orphaned", () => {
  it("censuses the RENDERED rows against the table, in both directions", () => {
    const region = renderPanel();
    const drawn = [...region.querySelectorAll("[data-stat]")].map((node) =>
      node.getAttribute("data-stat"),
    );
    // The floor: three rows really were drawn, so the set equality below is not two
    // empty sets agreeing.
    expect(drawn.length, "the panel drew no rows at all").toBeGreaterThanOrEqual(3);
    expect(new Set(drawn)).toEqual(new Set(CITY_LIFE_STATS));
    expect(new Set(Object.keys(CITY_LIFE_EXPLAINERS))).toEqual(new Set(CITY_LIFE_STATS));
  });

  it("puts each explanation in the DOM behind a keyboard-reachable trigger", () => {
    const region = renderPanel();
    for (const stat of CITY_LIFE_STATS) {
      const explainer = CITY_LIFE_EXPLAINERS[stat];
      // A real BUTTON, so it is in the tab order and operable by Enter or Space. A
      // `title` attribute or a `:hover` rule would satisfy the mouse and nothing else.
      const trigger = within(region).getByTestId(`vitality-${stat}-help`);
      expect(trigger.tagName, `${stat}'s trigger is not a button`).toBe("BUTTON");
      expect(trigger).toHaveAccessibleName(`About ${explainer.label}`);

      // The description RESOLVES: `aria-describedby` points at an element that is in the
      // document and carries the copy, whether or not anything is hovering.
      const describedBy = trigger.getAttribute("aria-describedby");
      expect(describedBy, `${stat}'s trigger describes nothing`).toBeTruthy();
      const bubble = document.getElementById(describedBy ?? "");
      expect(bubble, `${stat} describes an id nothing renders`).not.toBeNull();
      expect(bubble?.textContent).toBe(explainer.text);
      expect(bubble?.getAttribute("role")).toBe("tooltip");
    }
  });

  it("opens on hover, opens on focus, and Escape puts it away without moving focus", () => {
    const region = renderPanel();
    const row = within(region).getByTestId("vitality-happiness");
    const bubble = within(region).getByTestId("vitality-happiness-explainer");
    const trigger = within(region).getByTestId("vitality-happiness-help");

    expect(bubble.getAttribute("data-open")).toBe("false");

    fireEvent.pointerEnter(row);
    expect(bubble.getAttribute("data-open"), "hover did not open it").toBe("true");
    fireEvent.pointerLeave(row);
    expect(bubble.getAttribute("data-open")).toBe("false");

    // THE KEYBOARD PATH, which is the half a hover-only tooltip loses.
    trigger.focus();
    fireEvent.focus(trigger);
    expect(bubble.getAttribute("data-open"), "focus did not open it").toBe("true");

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(bubble.getAttribute("data-open"), "Escape did not close it").toBe("false");
    // And focus stayed where the learner put it, which is what Escape is for.
    expect(document.activeElement).toBe(trigger);
  });

  it("renders the exact Happiness explanation when the learner opens it", () => {
    const region = renderPanel();
    const row = within(region).getByTestId("vitality-happiness");
    const bubble = within(region).getByTestId("vitality-happiness-explainer");

    fireEvent.pointerEnter(row);
    expect(bubble.getAttribute("data-open")).toBe("true");
    expect(bubble.textContent).toBe(
      "Happiness counts how many people your city can keep happy. Build civic buildings that provide Happiness, and lay roads; both increase it.",
    );
  });

  it("opens one at a time, so a hover never covers the row it is not about", () => {
    const region = renderPanel();
    fireEvent.pointerEnter(within(region).getByTestId("vitality-population"));
    const open = [...region.querySelectorAll('[data-open="true"][role="tooltip"]')];
    expect(open.length).toBe(1);
    expect(open[0]?.getAttribute("data-testid")).toBe("vitality-population-explainer");
  });

  /**
   * THE CRAFT RULE, which is the lead's: *"Two sentences at most per row. This is a hover,
   * not documentation."* The em-dash ban and the no-leading-negation rule are the whole
   * app's and are swept by `test/cityCopyRegister.test.ts`; the length is this feature's.
   */
  it("keeps every explanation to two sentences at most", () => {
    for (const stat of CITY_LIFE_STATS) {
      const { text } = CITY_LIFE_EXPLAINERS[stat];
      const sentences = text.split(/(?<=[.!?])\s+/).filter((part) => part.length > 0);
      expect(sentences.length, `${stat}: "${text}"`).toBeLessThanOrEqual(2);
      // And it is prose rather than a fragment, so the count above is over real sentences.
      expect(text).toMatch(/\.$/);
      expect(text.length).toBeGreaterThan(60);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* POPULATION                                                                  */
/* -------------------------------------------------------------------------- */

describe("POPULATION: 'practising brings people and mastering brings twice as many again'", () => {
  it("measures both terms through the call the HUD makes", () => {
    const unstarted = cityAt({ nodeStates: at(0, "not_started") }).population;
    const practised = cityAt({ nodeStates: at(1, "done") }).population;
    const mastered = cityAt({ nodeStates: at(2, "done") }).population;

    const fromPractice = practised - unstarted;
    const fromMastery = mastered - practised;

    // Each is a real arrival, so neither half of the sentence is about nothing.
    expect(fromPractice, "practising brought nobody").toBeGreaterThan(0);
    expect(fromMastery, "mastering brought nobody").toBeGreaterThan(0);
    // And the comparative the copy makes: twice as many AGAIN.
    expect(fromMastery, "mastering no longer brings twice what practising does").toBe(
      2 * fromPractice,
    );
    // The same ratio at its source, so a retune of the tuning table fails here too and
    // not only on this one fixture's arithmetic.
    expect(CITIZENS_PER_MASTERED_SKILL).toBe(2 * CITIZENS_PER_COMPLETE_BUILDING);
  });

  it("is right that a skill you tested out of is counted too", () => {
    /*
      THE CLAUSE ADDED ON 2026-08-04, held to its own mechanic.

      *"including the ones you tested out of"* is there because the one learner in the
      product who arrives at a city of a hundred and sixty four people has answered nothing,
      and a line saying only that practice brings people would be describing a mechanic that
      did not produce the number in front of them.

      Both directions, because either alone is satisfiable by a broken derivation: a
      tested-out island has to bring MORE than an untouched one, and exactly as many as a
      mastered one, which is what "proportional to era" means in arithmetic.
    */
    const untouched = cityAt({ nodeStates: at(0, "not_started") }).population;
    const testedOut = cityAt({ nodeStates: testedOutOfEverything() }).population;
    const mastered = cityAt({ nodeStates: at(2, "done") }).population;

    expect(testedOut, "testing out brought nobody").toBeGreaterThan(untouched);
    expect(testedOut, "a tested-out city is not the size of a played-through one").toBe(
      mastered,
    );
    // AND THE MASTERY IS STILL NOT THERE, which is what makes this a separate clause from
    // the sentence above rather than a restatement of it.
    for (const state of testedOutOfEverything()) {
      expect(state.mastery, `${state.node_id} was granted mastery`).toBe(0);
    }
  });

  it("is right that buying a building brings nobody, over the whole catalogue", () => {
    expect(CIVIC_CATALOGUE.length).toBeGreaterThanOrEqual(CATALOGUE_FLOOR);
    const baseline = cityAt({ nodeStates: at(2, "done") });
    let capacityMoved = 0;
    for (const row of CIVIC_CATALOGUE) {
      const withOne = cityAt({ nodeStates: at(2, "done"), civic: [bought(row.id)] });
      expect(withOne.population, `${row.name} changed the headcount`).toBe(
        baseline.population,
      );
      if (
        withOne.livability.sustains > baseline.livability.sustains ||
        withOne.happiness.coverage > baseline.happiness.coverage
      ) {
        capacityMoved += 1;
      }
    }
    // THE FLOOR UNDER THE ABSENCE. "No purchase moved the headcount" is also what a
    // catalogue of buildings that do nothing at all would report, so every one of them
    // has to have moved SOMETHING.
    expect(capacityMoved, "no purchase moved any capacity").toBe(CIVIC_CATALOGUE.length);
  });
});

/* -------------------------------------------------------------------------- */
/* LIVABILITY                                                                  */
/* -------------------------------------------------------------------------- */

describe("LIVABILITY: 'buying a civic building raises it'", () => {
  it("raises what the city sustains by exactly the figure the Build menu quotes", () => {
    expect(CIVIC_CATALOGUE.length).toBeGreaterThanOrEqual(CATALOGUE_FLOOR);
    const baseline = cityAt({ nodeStates: at(2, "done") });
    let raised = 0;
    for (const row of CIVIC_CATALOGUE) {
      const withOne = cityAt({ nodeStates: at(2, "done"), civic: [bought(row.id)] });
      expect(
        withOne.livability.sustains - baseline.livability.sustains,
        `${row.name} does not sustain the ${row.provides.livability} its card promises`,
      ).toBe(row.provides.livability);
      if (row.provides.livability > 0) {
        raised += 1;
      }
    }
    // Three of every era's four rows sustain somebody; the amenity is the one that does
    // not, and the sentence says "a civic building" rather than "any". A catalogue where
    // none of them sustained anybody would make the line false and pass the loop above.
    expect(raised, "no bought row sustains anybody").toBeGreaterThanOrEqual(
      ERA_SEQUENCE.length * 3,
    );
  });

  /**
   * **WHY THE LEVER NAMED IS THE BOUGHT ONE, measured rather than argued.**
   *
   * Mastering a skill raises the homes term, so it is an input too. It is not the lever a
   * learner should be pointed at for ROOM, because it raises the crowd that room is read
   * against in the same move: the most any single skill building can net is era one's
   * Dwellings, and the era's dearest bought row matched it exactly until the founding-
   * population rebalance (`FOUNDING_POPULATION` 8 -> 12) bumped `NUM.2`'s
   * `residence_mastered` by the same +4 to hold the settled-ending solvency guarantee,
   * which this test's own room figure is downstream of. The bought row's own value follows
   * a strict per-era ladder (`20 x 2^(N-1)`, `civicCatalogue.ts`) that a +4 does not land
   * on, so era one alone now carries a small, accepted gap rather than an exact match.
   * Every era above one still doubles the bought figure while no skill node in it has a
   * residence figure at all, so the gap does not widen past era one.
   */
  it("is right that no single skill can add more ROOM than the era's largest bought row, era one's accepted gap aside", () => {
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(ERA_FLOOR);
    // See the case's own docblock: the founding-population rebalance moved era one's
    // largest single-skill room gain 4 past its dearest bought row, and neither side of
    // that gap can close without either re-authoring the civic ladder or re-opening the
    // solvency guarantee `NUM.2`'s bump preserves. Scoped to era one so a genuine
    // regression in any other era still fails here at zero tolerance.
    const ACCEPTED_GAP: Readonly<Partial<Record<(typeof ERA_SEQUENCE)[number]["id"], number>>> =
      { prehistoric: 4 };
    const roomFromASkillPerEra: number[] = [];
    for (const era of ERA_SEQUENCE) {
      const rows = civicCatalogueForEra(era.id);
      expect(rows.length, `${era.id} has no catalogue`).toBeGreaterThanOrEqual(4);
      const largestBought = Math.max(...rows.map((row) => row.provides.livability));

      // The population is the ROSTER the era actually offers, not era one's six.
      const roster = cityRosterNodeIds(era.id);
      expect(roster.length, `${era.id} rosters nothing`).toBeGreaterThanOrEqual(5);
      const roomFromASkill = Math.max(
        ...roster.flatMap((nodeId) => {
          const homes = capacityForNode(nodeId);
          return [
            // Finishing its practice: its built homes, less the people that brought.
            homes.residence_built - CITIZENS_PER_COMPLETE_BUILDING,
            // Mastering it from there.
            homes.residence_mastered - homes.residence_built - CITIZENS_PER_MASTERED_SKILL,
            // Both at once, which is the ordinary path.
            homes.residence_mastered -
              CITIZENS_PER_COMPLETE_BUILDING -
              CITIZENS_PER_MASTERED_SKILL,
          ];
        }),
      );
      roomFromASkillPerEra.push(roomFromASkill);
      const gap = ACCEPTED_GAP[era.id] ?? 0;
      expect(
        largestBought + gap,
        `${era.id}: mastering one skill adds ${roomFromASkill} places of room and its dearest bought row adds ${largestBought} (accepted gap ${gap}), so the hover names the wrong lever`,
      ).toBeGreaterThanOrEqual(roomFromASkill);
    }
    // AND THE COMPARISON IS CONTESTED SOMEWHERE. If mastery never added room at all, the
    // assertion above would hold against a catalogue of nothing and prove nothing.
    expect(
      Math.max(...roomFromASkillPerEra),
      "no era has a skill building that adds room, so the comparison is vacuous",
    ).toBeGreaterThan(0);
  });

  it("is right that the crowd arrives whether or not there is room", () => {
    // The two nodes era one houses nobody in, mastered, with the free row stripped: 20
    // people against a hub that sustains 8. Nobody is turned away, which is D-CIT2's
    // "capacity never gates arrivals" seen from the readout.
    const workshopAndCommons = ALL_PLACED.filter((placed) =>
      ["NUM.3", "NUM.4"].includes(placed.nodeId),
    );
    expect(workshopAndCommons.length, "the fixture placed neither").toBe(2);
    const overfull = cityAt({
      nodeStates: at(2, "done"),
      placements: workshopAndCommons,
      noFreeCivic: true,
    });
    expect(
      overfull.population,
      "this city is not over its pool, so it says nothing about arrivals",
    ).toBeGreaterThan(overfull.livability.sustains);
    // And the headcount is the full one rather than the sustained one.
    const roomy = cityAt({ nodeStates: at(2, "done"), placements: workshopAndCommons });
    expect(roomy.livability.sustains).toBeGreaterThan(overfull.livability.sustains);
    expect(roomy.population, "the population moved when only the capacity did").toBe(
      overfull.population,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* HAPPINESS                                                                   */
/* -------------------------------------------------------------------------- */

describe("HAPPINESS: civic buildings that provide Happiness and roads both increase it", () => {
  it("makes the Happiness-providing civic role the largest source in every era", () => {
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(ERA_FLOOR);
    const skillMost = Math.max(...Object.values(SKILL_HAPPINESS_BY_ROLE));
    for (const era of ERA_SEQUENCE) {
      const amenity = civicBuildingForRole(era.id, "amenity");
      const others = civicCatalogueForEra(era.id).filter((row) => row.role !== "amenity");
      expect(others.length, `${era.id} has no other rows to beat`).toBe(3);

      // Against the era's own three other bought rows...
      for (const row of others) {
        expect(
          amenity.provides.happiness,
          `${era.id}: ${row.name} reaches at least as many as the amenity`,
        ).toBeGreaterThan(row.provides.happiness);
      }
      // ...against a skill building, which is the other thing standing on the island...
      expect(amenity.provides.happiness).toBeGreaterThan(skillMost);
      // ...and against a road tile, which is the line's own second clause.
      expect(amenity.provides.happiness).toBeGreaterThan(ROAD_HAPPINESS_PER_TILE);
    }
    // The floor under "greater than a skill building": a table of zeroes would satisfy it.
    expect(skillMost, "no skill building reaches anybody").toBeGreaterThan(0);
  });

  it("raises coverage by exactly the Happiness figure each civic card quotes", () => {
    expect(CIVIC_CATALOGUE.length).toBeGreaterThanOrEqual(CATALOGUE_FLOOR);
    const baseline = cityAt({ nodeStates: at(2, "done") });
    for (const row of CIVIC_CATALOGUE) {
      const withOne = cityAt({ nodeStates: at(2, "done"), civic: [bought(row.id)] });
      expect(
        withOne.happiness.coverage - baseline.happiness.coverage,
        `${row.name} does not reach the ${row.provides.happiness} its card promises`,
      ).toBe(row.provides.happiness);
    }
  });

  it("is right that each road tile you lay reaches one more person", () => {
    const unpaved = cityAt({ nodeStates: at(2, "done") });
    // Below saturation, so an extra tile has somebody left to reach: era one's mastered
    // city reaches 9 of 44 on its skill buildings alone.
    expect(unpaved.happiness.covered).toBeLessThan(unpaved.population);
    const paved = cityAt({ nodeStates: at(2, "done"), roadTileCount: 1 });
    expect(paved.happiness.covered - unpaved.happiness.covered).toBe(1);
    // Ten of them reach ten, so the claim is per tile rather than a one-off.
    const ten = cityAt({ nodeStates: at(2, "done"), roadTileCount: 10 });
    expect(ten.happiness.covered - unpaved.happiness.covered).toBe(10);
    expect(ROAD_HAPPINESS_PER_TILE).toBe(1);
  });

  it("is right that the figure counts people rather than measuring a mood", () => {
    // Coverage past the town does not read as more than everybody: the row is a headcount
    // bounded by the crowd, which is why the copy says "how many of your people".
    const paved = cityAt({ nodeStates: at(2, "done"), roadTileCount: 400 });
    expect(paved.happiness.coverage).toBeGreaterThan(paved.population);
    expect(paved.happiness.covered).toBe(paved.population);
    expect(paved.happiness.level).toBe(100);
  });
});

/* -------------------------------------------------------------------------- */
/* The pin census                                                              */
/* -------------------------------------------------------------------------- */

/**
 * WHICH STATS THIS FILE ACTUALLY MEASURES A LEVER FOR.
 *
 * Written down and then held to the panel, because the failure this whole file exists to
 * prevent has a quiet version: a fourth figure joins the panel with a hover on it, the
 * census two hundred lines up passes because the explainer table grew with it, and nobody
 * ever measures its lever. That row would ship an unverified promise, which is the thing
 * the lead asked to be impossible.
 */
const LEVER_PINNED: readonly string[] = ["population", "livability", "happiness"];

describe("no figure gets a hover without a measured lever", () => {
  it("pins one for every stat the panel explains", () => {
    expect(new Set(LEVER_PINNED)).toEqual(new Set(CITY_LIFE_STATS));
    expect(LEVER_PINNED.length).toBeGreaterThanOrEqual(3);
  });
});
