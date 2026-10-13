import { eraCostMultiplier, materialForEra } from "@cr/economy";
import {
  buildCityViewModel,
  CITIZENS_PER_COMPLETE_BUILDING,
  CITIZENS_PER_MASTERED_SKILL,
  FOUNDING_POPULATION,
} from "@cr/game";
import { ERA_SEQUENCE, type EraId, getEraOfNode, getEraOrThrow } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { presenterFixtureFor } from "../demo/presenterFixtures";
import { civicContributionRowsOf, cityVitality } from "./citizens";
import { eraCivicPlacementIds } from "./inheritedCivics";
import type { PlacedTransform } from "./worldLayout";

const PRACTICED_AT = "2026-08-12T00:00:00.000Z";
const MASTERED_BUILDING_GAIN = CITIZENS_PER_COMPLETE_BUILDING + CITIZENS_PER_MASTERED_SKILL;

function mastered(nodeId: string): StudentNodeState {
  return {
    student_id: "era-vitality-regression",
    node_id: nodeId,
    placement_estimate: 0,
    mastery: 2,
    mastery_updated_at: PRACTICED_AT,
    completion_status: "complete",
    lesson_stage: "done",
    last_practiced_at: PRACTICED_AT,
  };
}

function foundation(nodeId: string): StudentNodeState {
  return {
    student_id: "era-vitality-regression",
    node_id: nodeId,
    placement_estimate: 0,
    mastery: 0,
    mastery_updated_at: null,
    completion_status: "locked",
    lesson_stage: "not_started",
    last_practiced_at: null,
  };
}

function placed(nodeId: string, index: number): PlacedTransform {
  return { nodeId, col: index * 3, row: 0, rot: 0 };
}

function vitalityFor(
  eraId: EraId,
  nodeStates: readonly StudentNodeState[],
  placements: readonly PlacedTransform[],
  civic: readonly PlacedTransform[] = [],
) {
  return cityVitality({
    viewModel: buildCityViewModel({
      node_states: nodeStates,
      neighborhood_state: null,
      era_id: eraId,
    }),
    placements,
    civic: civicContributionRowsOf(civic),
  });
}

function ordinaryCompletedEra(eraId: EraId) {
  const era = getEraOrThrow(eraId);
  const placements = era.nodes.map(placed);
  const civic = eraCivicPlacementIds(eraId).map(placed);
  return vitalityFor(eraId, era.nodes.map(mastered), placements, civic);
}

function presenterPreparedEra(eraId: EraId) {
  const fixture = presenterFixtureFor({
    enabled: true,
    legacy: false,
    preset: "progress-mastered",
    surface: "city",
    eraId,
  });
  return {
    fixture,
    vitality: vitalityFor(
      eraId,
      fixture.city.seed.nodeStates,
      fixture.city.seed.placements,
      fixture.city.seed.civic ?? [],
    ),
  };
}

/**
 * The population is the canonical era registry crossed with both production-shaped ways a
 * prepared island is assembled: an ordinary learner's completed current-era buildings and
 * the Presenter fixture. Nothing is filtered by the implementation under test.
 */
const ERA_CASES = ERA_SEQUENCE.map((era) => ({
  era,
  material: materialForEra(era.id),
  civicIds: eraCivicPlacementIds(era.id),
}));

/**
 * A real product exception, named rather than filtered out: the Renaissance catalogue is
 * canonical economy data, but its four GLBs have not landed, so the production fixture correctly
 * fails closed to no civic placements. Exact set equality below makes the exception fail both
 * when another era loses its fixture and when Renaissance gains one.
 */
const ERAS_WITHOUT_PREPARED_CIVICS: readonly EraId[] = ["renaissance"];

describe("City Life scales with the era economy", () => {
  it("covers every canonical era with real material, civic, learner, and Presenter fixtures", () => {
    const canonicalIds = ERA_SEQUENCE.map((era) => era.id);
    const caseIds = ERA_CASES.map(({ era }) => era.id);

    expect(
      ERA_CASES.length,
      "the all-era City Life population is empty or truncated",
    ).toBeGreaterThanOrEqual(10);
    expect(
      new Set(caseIds).size,
      "an era appears more than once in the City Life population",
    ).toBe(ERA_CASES.length);
    expect(caseIds, "the City Life population is not the canonical era registry").toEqual(
      canonicalIds,
    );
    expect(
      ERA_CASES.map(({ material }) => material?.id),
      "a canonical era has no material identity to scale against",
    ).not.toContain(undefined);
    expect(
      new Set(ERA_CASES.map(({ material }) => material?.id)).size,
      "two eras share a material identity, so the economy composition is not one-per-era",
    ).toBe(ERA_CASES.length);

    const withoutPreparedCivics = ERA_CASES.filter(
      ({ civicIds }) => civicIds.length === 0,
    ).map(({ era }) => era.id);
    expect(
      withoutPreparedCivics,
      "the named no-civic exception no longer matches the production fixture composition",
    ).toEqual(ERAS_WITHOUT_PREPARED_CIVICS);
    expect(
      ERA_CASES.filter(({ civicIds }) => civicIds.length > 0).length,
      "the prepared-civic fixture population is empty or truncated",
    ).toBeGreaterThanOrEqual(9);

    for (const { era, civicIds } of ERA_CASES) {
      expect(
        era.nodes.length,
        `${era.id} has no real skill population`,
      ).toBeGreaterThanOrEqual(5);
      expect(
        civicIds.length === 0 || civicIds.length >= 6,
        `${era.id} has a partial civic fixture`,
      ).toBe(true);
      expect(
        ordinaryCompletedEra(era.id).population,
        `${era.id} learner fixture is empty`,
      ).toBeGreaterThan(FOUNDING_POPULATION);
      expect(
        presenterPreparedEra(era.id).vitality.population,
        `${era.id} Presenter fixture is empty`,
      ).toBeGreaterThan(FOUNDING_POPULATION);
    }
  });

  it("scales an ordinary learner's mastery population gain by the material ladder", () => {
    for (const { era } of ERA_CASES) {
      const nodeId = era.nodes[0] as string;
      const placement = [placed(nodeId, 0)];
      const before = vitalityFor(era.id, [foundation(nodeId)], placement);
      const after = vitalityFor(era.id, [mastered(nodeId)], placement);

      expect(
        after.population - before.population,
        `${era.id} mastery population gain`,
      ).toBe(MASTERED_BUILDING_GAIN * eraCostMultiplier(era.id));
    }
  });

  it("makes ordinary completed-era Population and displayed Happiness rise monotonically", () => {
    let previousPopulation = 0;
    for (const { era, civicIds } of ERA_CASES) {
      const vitality = ordinaryCompletedEra(era.id);
      const expected =
        FOUNDING_POPULATION +
        era.nodes.length * MASTERED_BUILDING_GAIN * eraCostMultiplier(era.id);

      expect(vitality.population, `${era.id} ordinary completed population`).toBe(expected);
      expect(vitality.population, `${era.id} did not exceed the prior era`).toBeGreaterThan(
        previousPopulation,
      );
      expect(
        vitality.happiness.covered,
        `${era.id} Happiness exceeds Population`,
      ).toBeLessThanOrEqual(vitality.population);
      if (civicIds.length > 0) {
        expect(
          vitality.happiness.coverage,
          `${era.id} prepared civic capacity`,
        ).toBeGreaterThanOrEqual(vitality.population);
        expect(vitality.happiness.covered, `${era.id} displayed Happiness`).toBe(
          vitality.population,
        );
      }
      previousPopulation = vitality.population;
    }
  });

  it("scales the separate Presenter fixture without making Happiness exceed Population", () => {
    let previousPopulation = 0;
    for (const { era, civicIds } of ERA_CASES) {
      const prepared = presenterPreparedEra(era.id);
      const { fixture, vitality } = prepared;
      const stateByNode = new Map(
        fixture.city.seed.nodeStates.map((state) => [state.node_id, state]),
      );
      const completedPlacements = fixture.city.seed.placements.filter(
        (placement) => (stateByNode.get(placement.nodeId)?.mastery ?? 0) >= 2,
      );
      expect(
        completedPlacements.length,
        `${era.id} Presenter has no completed building population`,
      ).toBeGreaterThanOrEqual(3);
      const expected = completedPlacements.reduce((population, placement) => {
        const builtEra = getEraOfNode(placement.nodeId);
        if (builtEra === undefined) {
          throw new Error(
            `${era.id} Presenter placed unregistered skill "${placement.nodeId}"`,
          );
        }
        return population + MASTERED_BUILDING_GAIN * eraCostMultiplier(builtEra.id);
      }, FOUNDING_POPULATION);

      expect(vitality.population, `${era.id} Presenter population`).toBe(expected);
      expect(
        vitality.population,
        `${era.id} Presenter did not exceed the prior era`,
      ).toBeGreaterThan(previousPopulation);
      expect(
        vitality.happiness.covered,
        `${era.id} Presenter Happiness exceeds Population`,
      ).toBeLessThanOrEqual(vitality.population);
      if (civicIds.length > 0) {
        // Presenter cities reproduce approved visual references, including partially served
        // populations. They must report that shortfall honestly instead of clamping it away.
        expect(
          vitality.happiness.coverage,
          `${era.id} Presenter has no civic happiness capacity`,
        ).toBeGreaterThan(0);
      }
      previousPopulation = vitality.population;
    }
  });
});
