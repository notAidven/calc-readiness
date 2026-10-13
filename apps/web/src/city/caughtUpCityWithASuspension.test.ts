import {
  buildCityViewModel,
  FOUNDING_POPULATION,
  foldCrisisDamage,
  NO_CRISIS_DAMAGE,
} from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { eraRosterNodeIds } from "../catchup/catchUpWalk";
import { eraPlacementFromSeed, seedPlacingAtEra } from "../catchup/eraPlacement";
import { ringLayout } from "../catchup/ringLayout";
import type { PlacementSeed } from "../diagnostic/placementRosters";
import { civicContributionRowsOf, cityVitality } from "./citizens";
import { createCityDevSession } from "./citySession";
import { clearEraId } from "./eraState";
import { inheritedCivicPlacementIds } from "./inheritedCivics";
import { liveBuildableRadius } from "./liveIsland";
import { standingSuspensions, suspendedCivicIds } from "./suspendedCivic";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./townHall";
import { resetCityEra, setCityEra } from "./useCityEra";
import type { PlacedTransform } from "./worldLayout";

/**
 * **A CAUGHT-UP CITY IS WHERE A SUSPENSION BITES HARDEST, and both halves have to be here
 * for that sentence to be true.**
 *
 * This file exists because two changes landed on the same seam and their conflict was
 * resolved by hand:
 *
 *  - #567 makes the crowd and
 *    the homes read `CitizenBuildingLedger.inherited`, so a caught-up learner arrives
 *    holding their age's population instead of the founding eight.
 *  - #584 makes a shuttered
 *    civic building stop contributing, by zeroing its row in `civicContributionRowsOf`.
 *
 * Neither change touches a file the other touches — measured, the two branches' change sets
 * are disjoint — so a merge that dropped one of them would still compile and would still go
 * green on the other's whole suite. `.cursor/rules/qa-verification.mdc`: *"a resolution that
 * compiles and goes green while silently dropping one side's behaviour is a FAILURE."* This
 * is the one file that cannot pass with either side missing.
 *
 * ## WHY THE COMBINATION IS A REAL STATE AND NOT A CONTRIVANCE
 *
 * The inherited civic buildings are minted through `civicPlacementId` exactly as a bought
 * one is (`inheritedCivics.ts`: *"the inherited city is spelled the same way a played one
 * is"*), so a crisis can name one and `standingSuspensions`' left join finds it. And a
 * caught-up city is the city with the most to lose: it arrives with an age's whole crowd
 * measured against a capacity that a shuttered building has just cut, which is the
 * composition #584's own body predicts — *"a suspension lowers livability, so it can push a
 * city into the under-provisioned warning"*.
 *
 * ## THE THIRD CLAIM IS THE ONE NEITHER SIDE ASSERTS ALONE
 *
 * A suspension shuts a BUILDING. It does not deport anybody, and it must not, because the
 * crowd is `citizenPopulation` over the skill ledger and a civic building has never been a
 * population term (`cityLifeExplainers.ts` says so to the learner). So the headcount is
 * asserted UNCHANGED across the suspension while the capacity moves — which is the only
 * place the two features are measured against each other rather than side by side.
 */

/** Every age a learner can be caught up TO, derived rather than listed. */
const CAUGHT_UP_ERAS: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id).filter(
  (id) => eraPlacementFromSeed(seedPlacingAtEra(id)).skipped.length > 0,
);

/** The age used for the arithmetic below: deep enough to hand several ages over. */
const A_DEEP_PLACEMENT: EraId = "medieval";

beforeEach(() => {
  localStorage.clear();
  resetCityEra();
  clearEraId();
});

afterEach(() => {
  resetCityEra();
  clearEraId();
  localStorage.clear();
});

/**
 * A caught-up city, assembled through the real readers on both sides.
 *
 * The node states come off a real `seedFromPlacement` rather than being written here, so the
 * `placement_estimate` that `inherited` keys on is the shipped hand-off's. The civic loadout
 * comes off `inheritedCivicPlacementIds`, and its seats off `ringLayout` at the era's own
 * disc — the same pair `catchup/civicSeats.ts` uses — so the placement ids a crisis can name
 * are the ids the walk really writes.
 */
async function caughtUpCity(placedEra: EraId): Promise<{
  readonly placement: PlacementSeed;
  readonly skills: readonly PlacedTransform[];
  readonly civic: readonly PlacedTransform[];
  readonly nodeStates: Awaited<ReturnType<typeof loadNodeStates>>;
}> {
  const placement = seedPlacingAtEra(placedEra);
  const handed = eraPlacementFromSeed(placement).skipped;
  setCityEra(placedEra);
  const hall: PlacedTransform = { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };
  const radius = liveBuildableRadius();
  const skills = ringLayout({
    nodeIds: handed.flatMap((eraId) => [...eraRosterNodeIds(eraId)]),
    reserved: [hall],
    buildableRadius: radius,
  });
  const civic = ringLayout({
    nodeIds: [...inheritedCivicPlacementIds(handed)],
    reserved: [hall, ...skills.placed],
    buildableRadius: radius,
  });
  return {
    placement,
    skills: skills.placed,
    civic: civic.placed,
    nodeStates: await loadNodeStates(placement),
  };
}

async function loadNodeStates(placement: PlacementSeed) {
  const session = createCityDevSession();
  session.seedFromPlacement(
    placement,
    Object.keys(placement).filter((nodeId) => (placement[nodeId] ?? 0) >= 2),
  );
  return (await session.load()).node_states;
}

/** The panel's arithmetic, through both readers, with a set of suspensions applied. */
function readingOf(
  city: Awaited<ReturnType<typeof caughtUpCity>>,
  placedEra: EraId,
  suspended: ReadonlySet<string>,
) {
  return cityVitality({
    viewModel: buildCityViewModel({
      node_states: city.nodeStates,
      neighborhood_state: null,
      era_id: placedEra,
    }),
    placements: city.skills,
    civic: civicContributionRowsOf(city.civic, suspended),
  });
}

describe("a caught-up city keeps its crowd and loses a shuttered building's capacity", () => {
  it("has an inherited crowd for a suspension to be measured against", async () => {
    // #567's HALF, standing alone. A city assembled from a hand-off the learner has answered
    // nothing of holds its age's population, so the figures below are not the founding eight
    // and the drop measured in the next test is a drop from a real city.
    const city = await caughtUpCity(A_DEEP_PLACEMENT);
    const reading = readingOf(city, A_DEEP_PLACEMENT, suspendedCivicIds(NO_CRISIS_DAMAGE));
    expect(
      reading.population,
      `a caught-up city stands in a crowd of ${reading.population}, which is the founding crowd`,
    ).toBeGreaterThan(FOUNDING_POPULATION * 10);
    // FLOORS: a real city, and its own homes are part of what sustains it.
    expect(city.civic.length).toBeGreaterThan(20);
    expect(city.skills.length).toBeGreaterThan(10);
    expect(reading.livability.sustains).toBeGreaterThanOrEqual(reading.population);
  }, 30_000);

  it("withholds exactly the shuttered building's two capacities, and deports nobody", async () => {
    /*
      THE COMPOSITION, AS THREE EQUALITIES OVER ONE CITY.

      The suspension is folded through the real `foldCrisisDamage` over a real inherited
      placement id, and the withheld figures are read off `standingSuspensions` rather than
      transcribed — so this holds whatever the catalogue is re-priced to, and it fails if the
      left join stops resolving the id.
    */
    const city = await caughtUpCity(A_DEEP_PLACEMENT);
    const before = readingOf(city, A_DEEP_PLACEMENT, suspendedCivicIds(NO_CRISIS_DAMAGE));

    // The one building the crisis shuts: the first inherited civic that provides BOTH
    // capacities, so a suppression wired to livability alone cannot pass this.
    const rows = standingSuspensions(
      foldCrisisDamage(NO_CRISIS_DAMAGE, {
        buildings: [],
        cells: [],
        suspended_civic: city.civic.map((placed) => placed.nodeId),
      }),
      city.civic,
      A_DEEP_PLACEMENT,
    );
    const shut = rows.find((row) => row.livability > 0 && row.happiness > 0);
    expect(shut, "no inherited civic building provides both capacities").toBeDefined();
    const target = shut as NonNullable<typeof shut>;

    const damage = foldCrisisDamage(NO_CRISIS_DAMAGE, {
      buildings: [],
      cells: [],
      suspended_civic: [target.placementId],
    });
    const suspended = suspendedCivicIds(damage);
    expect(suspended.size, "the fold recorded no suspension").toBe(1);
    const after = readingOf(city, A_DEEP_PLACEMENT, suspended);

    // #584's HALF: both dials fall, by exactly what that building provides.
    expect(
      after.livability.sustains,
      `${target.name}'s ${target.livability} livability is still being counted for a ` +
        `building the crisis shut`,
    ).toBe(before.livability.sustains - target.livability);
    expect(
      after.happiness.coverage,
      `${target.name}'s ${target.happiness} happiness is still being counted`,
    ).toBe(before.happiness.coverage - target.happiness);

    // AND THE CROWD DOES NOT MOVE. This is the claim neither change asserts alone: a
    // suspension shuts a building, and a civic building has never been a population term.
    expect(
      after.population,
      "shuttering a civic building took people out of the city",
    ).toBe(before.population);

    // FLOORS: both withheld figures are really non-zero, so neither equality above is two
    // identical numbers agreeing, and the crowd held constant is a real crowd.
    expect(target.livability).toBeGreaterThan(0);
    expect(target.happiness).toBeGreaterThan(0);
    expect(after.population).toBeGreaterThan(FOUNDING_POPULATION * 10);
  }, 30_000);

  it("holds at every age a learner can be caught up to, and there are at least eight", async () => {
    /*
      THE POPULATION, SWEPT. The two tests above are arithmetic at one placement; this is the
      claim over the whole set of them, because "a caught-up city" is not one city — the
      crowd, the loadout and the disc all move with the age.

      Asserted as inequalities rather than figures, so a retune of either side moves both.
    */
    expect(
      CAUGHT_UP_ERAS.length,
      "the swept population is too small",
    ).toBeGreaterThanOrEqual(8);
    let measured = 0;
    for (const placedEra of ["bronze_age", "medieval"] as const) {
      expect(CAUGHT_UP_ERAS).toContain(placedEra);
      const city = await caughtUpCity(placedEra);
      const clear = readingOf(city, placedEra, suspendedCivicIds(NO_CRISIS_DAMAGE));
      const all = suspendedCivicIds(
        foldCrisisDamage(NO_CRISIS_DAMAGE, {
          buildings: [],
          cells: [],
          suspended_civic: city.civic.map((placed) => placed.nodeId),
        }),
      );
      const shut = readingOf(city, placedEra, all);

      // Every inherited civic building shut at once: the capacity falls to the phantom
      // free Smokehouse's alone, and the crowd is untouched.
      expect(shut.livability.sustains, `${placedEra} livability`).toBeLessThan(
        clear.livability.sustains,
      );
      expect(shut.happiness.coverage, `${placedEra} happiness`).toBeLessThan(
        clear.happiness.coverage,
      );
      expect(shut.population, `${placedEra} crowd`).toBe(clear.population);
      expect(clear.population, `${placedEra} arrived empty`).toBeGreaterThan(
        FOUNDING_POPULATION,
      );
      measured += 1;
    }
    // FLOOR under the loop, so a `continue` that skipped every age cannot report green.
    expect(measured).toBe(2);
  }, 60_000);
});
