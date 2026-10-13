import type { LessonStage, Mastery, PlacementEstimate } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  buildingLedger,
  type CitizenNodeInput,
  citizenPopulation,
  daytimeCapacity,
  residenceCapacity,
} from "./citizens-population";
import {
  CITIZENS_PER_COMPLETE_BUILDING,
  CITIZENS_PER_MASTERED_SKILL,
  FOUNDING_POPULATION,
  populationGainMultiplierForNode,
  TESTED_OUT_PLACEMENT,
} from "./citizens-tuning";
import type { CitizenRoleId } from "./descriptors";

/** The six D1 nodes with the roles the descriptor resolves for them (Task 1.0). */
const D1: readonly { node_id: string; citizen_role: CitizenRoleId }[] = [
  { node_id: "NUM.S", citizen_role: "civic" },
  { node_id: "NUM.F", citizen_role: "civic" },
  { node_id: "NUM.2", citizen_role: "residence" },
  { node_id: "NUM.3", citizen_role: "school" },
  { node_id: "NUM.4", citizen_role: "civic" },
  { node_id: "NUM.5", citizen_role: "civic" },
];

/** `noUncheckedIndexedAccess` is on: an out-of-range index must fail loudly. */
function d1(index: number): { node_id: string; citizen_role: CitizenRoleId } {
  const node = D1[index];
  if (!node) {
    throw new Error(`no D1 node at index ${index}`);
  }
  return node;
}

/**
 * A node in a given standing. `placed` defaults with the stage, never silently.
 *
 * **`placement_estimate` is an axis here and it did not used to be.** Every fixture in this
 * file defaulted to 0, and four of the tests below called the resulting `lesson_stage:
 * "done"` at mastery 0 a TEST-OUT. It is not one: the diagnostic writes a passed placement
 * alongside that pre-build, and since 2026-08-04 the passed placement is what the population
 * reads (`CitizenBuildingLedger.inherited`). Done-at-zero on a placement the learner FAILED
 * is attendance, which the product cannot currently produce and which the 2026-07-30 ruling
 * is actually about, so both shapes are exercised below rather than one standing in for the
 * other.
 */
function node(
  index: number,
  over: {
    placed?: boolean;
    mastery?: Mastery;
    lesson_stage?: LessonStage;
    placement_estimate?: PlacementEstimate;
  } = {},
): CitizenNodeInput {
  return {
    ...d1(index),
    placed: over.placed ?? false,
    mastery: over.mastery ?? 0,
    lesson_stage: over.lesson_stage ?? "not_started",
    placement_estimate: over.placement_estimate ?? 0,
  };
}

/** Every D1 node, placed, at one mastery — the "all six" states 8.1 tabulates. */
function island(over: {
  placed?: boolean;
  mastery?: Mastery;
  lesson_stage?: LessonStage;
  placement_estimate?: PlacementEstimate;
}): CitizenNodeInput[] {
  return D1.map((_, index) => node(index, over));
}

/** The shape the diagnostic's hand-off writes: finished, unpractised, placement passed. */
const HANDED_OVER = {
  placed: true,
  lesson_stage: "done",
  placement_estimate: TESTED_OUT_PLACEMENT,
} as const;

describe("citizen population and capacity (D-CIT2, D-CIT10, D-CIT11, D-CIT15)", () => {
  it("opens a bare island on a crowd with nowhere to go (the cold open)", () => {
    // The single most easily lost beat: a derivation that starts at zero loses the
    // whole cold open, and the crowd that gives the middle its pull.
    const ledger = buildingLedger(island({}));
    expect(citizenPopulation(ledger)).toBe(FOUNDING_POPULATION);
    expect(citizenPopulation(ledger)).toBe(12);
    expect(residenceCapacity(ledger)).toBe(0);
  });

  it("requires a building to be PLACED, not merely complete in state (D-CIT10)", () => {
    /*
      `seedFromPlacement` clears `placements`, so a full test-out has six nodes complete in
      state and ZERO buildings standing. Counting state alone would put 44 people on a bare
      island, in homes that do not exist.

      **BOTH PLACEMENTS, since 2026-08-04.** This swept only `placement_estimate: 0`, and
      `placed` now guards a THIRD term — measured: dropping the `placed` conjunct from
      `buildingLedger` left this test green, because at a failed placement neither surviving
      term fires either way. The unplaced hand-off is the case the sentence above is actually
      describing, and it was the one this did not reach.
    */
    for (const placement_estimate of [0, TESTED_OUT_PLACEMENT] as const) {
      const completeButUnplaced = island({
        placed: false,
        lesson_stage: "done",
        placement_estimate,
      });
      const ledger = buildingLedger(completeButUnplaced);
      expect(citizenPopulation(ledger), `placement ${placement_estimate}`).toBe(
        FOUNDING_POPULATION,
      );
      expect(residenceCapacity(ledger), `placement ${placement_estimate}`).toBe(0);
      for (const entry of ledger) {
        expect(entry.complete, entry.node_id).toBe(false);
        expect(entry.mastered, entry.node_id).toBe(false);
        expect(entry.inherited, entry.node_id).toBe(false);
      }
    }
    // THE FLOOR: the same six nodes PLACED at the pass bar really are a different city, so
    // "the founding crowd either way" is a fact about being unplaced.
    expect(citizenPopulation(buildingLedger(island(HANDED_OVER)))).toBeGreaterThan(
      FOUNDING_POPULATION,
    );
  });

  it("houses NOBODY on ATTENDANCE alone (the half of 2026-07-30 that stands)", () => {
    // **THE SURVIVING HALF OF THE 2026-07-30 RULING**, and this is the fixture it is
    // actually about: `lesson_stage: "done"` on a placement the learner did NOT pass. The
    // first term used to fire on that, which is a term paid for turning up. It brings
    // nobody, and it brings no homes either, so the island can never hold a crowd the
    // economy would refuse to pay for.
    const attended = buildingLedger([
      node(0, { placed: true, lesson_stage: "done", placement_estimate: 1 }),
    ]);
    expect(citizenPopulation(attended)).toBe(FOUNDING_POPULATION);
    expect(attended[0]?.complete).toBe(false);
    expect(attended[0]?.mastered).toBe(false);
    expect(attended[0]?.inherited).toBe(false);
    expect(residenceCapacity(attended)).toBe(0);

    // NOTHING IS TAKEN AWAY — one scored set brings the build term.
    const practised = buildingLedger([
      node(0, { placed: true, mastery: 1, lesson_stage: "done" }),
    ]);
    expect(citizenPopulation(practised)).toBe(
      FOUNDING_POPULATION + CITIZENS_PER_COMPLETE_BUILDING,
    );
    expect(residenceCapacity(practised)).toBe(2);
  });

  it("houses the age's crowd in a building the DIAGNOSTIC handed over (2026-08-04)", () => {
    /*
      **THE TEST-OUT CLAUSE, RESTORED AND LARGER**, on the lead's *"population should be
      proportional to era always"*. The distinguishing signal is the passed placement, which
      is the one of test-out's three writes that attendance cannot forge, and the figure is
      the MASTERED one because that is what a played-through learner at this age has.

      Note what is NOT granted beside it: `complete` and `mastered` are still false, because
      both mean the learner scored a set and this learner has not.
    */
    const handedOver = buildingLedger([node(0, HANDED_OVER)]);
    expect(handedOver[0]?.inherited).toBe(true);
    expect(handedOver[0]?.complete).toBe(false);
    expect(handedOver[0]?.mastered).toBe(false);
    expect(citizenPopulation(handedOver)).toBe(
      FOUNDING_POPULATION + CITIZENS_PER_COMPLETE_BUILDING + CITIZENS_PER_MASTERED_SKILL,
    );
    // The same crowd a mastered building holds, which is the whole of "proportional to era".
    const mastered = buildingLedger([
      node(0, { placed: true, mastery: 2, lesson_stage: "done" }),
    ]);
    expect(citizenPopulation(handedOver)).toBe(citizenPopulation(mastered));
    // And the homes with them, from the SAME set (D-CIT10), so the crowd is not assigned
    // to houses that do not exist.
    expect(residenceCapacity(handedOver)).toBe(residenceCapacity(mastered));
    expect(residenceCapacity(handedOver)).toBeGreaterThan(0);
  });

  it("never takes people back off a handed-over building for practising it", () => {
    /*
      MONOTONICITY, AT THE SEAM THE NEW TERM CREATES (D-CIT6).

      This is why the signal is the PLACEMENT and not the absence of practice. A rule keyed
      on `tested_out` or on `mastery < PRACTICED_MASTERY` switches off the moment the learner
      scores a set, and the node would fall from the mastered figure to the built one: four
      people taken away for doing the work. `placement_estimate` is immutable after
      onboarding, so it cannot.
    */
    let previous = 0;
    for (const mastery of [0, 1, 2, 3] as const) {
      const ledger = buildingLedger([node(0, { ...HANDED_OVER, mastery })]);
      const people = citizenPopulation(ledger);
      expect(people, `handed over, at mastery ${mastery}`).toBeGreaterThanOrEqual(previous);
      expect(residenceCapacity(ledger), `homes at mastery ${mastery}`).toBe(
        residenceCapacity(buildingLedger([node(0, HANDED_OVER)])),
      );
      previous = people;
    }
    // The floor: the walk really moved off the founding crowd, so "never falls" is not a
    // constant sequence of eights.
    expect(previous).toBeGreaterThan(FOUNDING_POPULATION);
  });

  it("counts a below-bar finished building too (mastery 1, lesson_stage done)", () => {
    // **THE HALF OF GROUNDED CORRECTION 2 THAT SURVIVES.** The build beat fires when the
    // building finishes, and on the ordinary path a finished practice set writes mastery
    // and `lesson_stage: "done"` together — so a below-bar finish is mastery 1 and still
    // brings its people. `masteryLabel` even has copy for it. This is what stops the
    // ruling above from being a strictly mastery-2 dial, which WOULD have broken the
    // beat.
    const one = buildingLedger([
      node(2, { placed: true, mastery: 1, lesson_stage: "done" }),
    ]);
    expect(one[0]?.complete).toBe(true);
    expect(one[0]?.mastered).toBe(false);
    expect(residenceCapacity(one)).toBe(10);
  });

  it("tabulates the three states 8.1 names", () => {
    expect(citizenPopulation(buildingLedger(island({})))).toBe(12);
    // All six finished below the bar, none mastered: a working town, half-settled. The
    // fixture carries `mastery: 1` because that is what finishing a set writes; at
    // mastery 0 the same `lesson_stage` is a test-out pre-build and houses nobody.
    const finished = buildingLedger(
      island({ placed: true, mastery: 1, lesson_stage: "done" }),
    );
    expect(citizenPopulation(finished)).toBe(24);
    expect(residenceCapacity(finished)).toBe(16);
    // All six mastered: a throng, fully settled.
    const mastered = buildingLedger(
      island({ placed: true, mastery: 2, lesson_stage: "done" }),
    );
    expect(citizenPopulation(mastered)).toBe(48);
    expect(residenceCapacity(mastered)).toBe(48);
    expect(daytimeCapacity(mastered)).toBe(44);
    // And the tested-out island, which is the row 8.1 did not have: six placed
    // pre-builds on six passed placements. Since 2026-08-04 it lands exactly where the
    // mastered island does, which is the ruling read as arithmetic.
    const testedOut = buildingLedger(island(HANDED_OVER));
    expect(citizenPopulation(testedOut)).toBe(48);
    expect(residenceCapacity(testedOut)).toBe(48);
    // The ATTENDED island, which is the row that still reads the founding crowd: the same
    // six finished buildings on placements the learner did not pass.
    const attended = buildingLedger(
      island({ placed: true, lesson_stage: "done", placement_estimate: 1 }),
    );
    expect(citizenPopulation(attended)).toBe(FOUNDING_POPULATION);
    expect(residenceCapacity(attended)).toBe(0);
  });

  it("pays the gold margin nothing (D-CIT11)", () => {
    // Gold is a non-gating margin; paying it would make the crowd a scoreboard again,
    // and would make the settled ending require 5-of-5 on every set.
    const at2 = buildingLedger(island({ placed: true, mastery: 2, lesson_stage: "done" }));
    const at3 = buildingLedger(island({ placed: true, mastery: 3, lesson_stage: "done" }));
    expect(citizenPopulation(at3)).toBe(citizenPopulation(at2));
    expect(residenceCapacity(at3)).toBe(residenceCapacity(at2));
    expect(daytimeCapacity(at3)).toBe(daytimeCapacity(at2));
  });

  it("makes mastering a node bring more people than finishing it, for every node", () => {
    for (let index = 0; index < D1.length; index += 1) {
      const finished = buildingLedger([
        node(index, { placed: true, mastery: 1, lesson_stage: "done" }),
      ]);
      const mastered = buildingLedger([
        node(index, { placed: true, mastery: 2, lesson_stage: "done" }),
      ]);
      expect(citizenPopulation(mastered), d1(index).node_id).toBeGreaterThan(
        citizenPopulation(finished),
      );
      // And the step below it: a scored set beats a building that was only ATTENDED.
      const attended = buildingLedger([
        node(index, { placed: true, lesson_stage: "done", placement_estimate: 1 }),
      ]);
      expect(citizenPopulation(finished), d1(index).node_id).toBeGreaterThan(
        citizenPopulation(attended),
      );
      // A HANDED-OVER building is the exception and it is deliberate: the diagnostic's
      // verdict is worth the mastered figure, so this one node does not order below a
      // scored set. Asserted rather than left to be discovered by whoever reads the loop.
      const handedOver = buildingLedger([node(index, HANDED_OVER)]);
      expect(citizenPopulation(handedOver), d1(index).node_id).toBe(
        citizenPopulation(mastered),
      );
    }
  });

  it("gives the daytime ledger the hub's staff and no mastery term (8.3)", () => {
    const bare = buildingLedger(island({}));
    // Even a bare island has the hub, so the day is never empty.
    expect(daytimeCapacity(bare)).toBe(4);
    const finished = buildingLedger(
      island({ placed: true, mastery: 1, lesson_stage: "done" }),
    );
    const mastered = buildingLedger(
      island({ placed: true, mastery: 2, lesson_stage: "done" }),
    );
    expect(daytimeCapacity(finished)).toBe(daytimeCapacity(mastered));
    // A floor with a shape, so the equality above cannot be satisfied by two bare
    // islands: the daytime ledger really does hold the six buildings' seats.
    expect(daytimeCapacity(finished)).toBeGreaterThan(daytimeCapacity(bare));
  });

  it("treats an unauthored island as the founding crowd, and does not throw (D-CIT12)", () => {
    // D2-D10 are `architected` with zero plots: no roles, no capacity, nothing to
    // divide by. The hub stands and the founding crowd waits.
    const ledger = buildingLedger([]);
    expect(ledger).toEqual([]);
    expect(citizenPopulation(ledger)).toBe(FOUNDING_POPULATION);
    expect(residenceCapacity(ledger)).toBe(0);
    expect(daytimeCapacity(ledger)).toBe(4);
  });

  it("gives an unknown art mass a civic role and no homes", () => {
    const ledger = buildingLedger([
      {
        node_id: "EXP.1",
        citizen_role: "civic",
        placed: true,
        mastery: 2,
        lesson_stage: "done",
        placement_estimate: 0,
      },
    ]);
    expect(ledger[0]?.role).toBe("civic");
    expect(ledger[0]?.residence_capacity).toBe(0);
    // It still brings people at its own era's scale: a mass with no homes is not a mass
    // with no citizens, and missing citizen-capacity authoring cannot flatten an era-two gain.
    expect(citizenPopulation(ledger)).toBe(
      FOUNDING_POPULATION +
        (CITIZENS_PER_COMPLETE_BUILDING + CITIZENS_PER_MASTERED_SKILL) *
          populationGainMultiplierForNode("EXP.1"),
    );
  });

  it("never completes a node whose content is still in authoring", () => {
    const ledger = buildingLedger([
      { ...node(2, { placed: true, lesson_stage: "done" }), authoring_complete: false },
    ]);
    expect(ledger[0]?.complete).toBe(false);
    expect(citizenPopulation(ledger)).toBe(FOUNDING_POPULATION);
  });
});
