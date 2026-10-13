import { ERA_SEQUENCE, type EraId, eraNumber } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  type CatchUpChoice,
  type CatchUpEvent,
  type CatchUpState,
  catchUpBuildMode,
  catchUpEra,
  catchUpPosition,
  catchUpReducer,
  eraRosterNodeIds,
  forfeitedEras,
  isCatchUpDone,
  landingEra,
  startCatchUp,
  startCatchUpAt,
} from "./catchUpWalk";
import { eraPlacementFromSeed, seedPlacingAtEra } from "./eraPlacement";

/**
 * THE WALK'S TWO SAFETY PROPERTIES, GUARDED RATHER THAN ARGUED.
 *
 * §10.9 and §10.14 both rest on two claims about the choice, and both are the sort of claim
 * `.cursor/rules/qa-verification.mdc` says to inject against rather than to reason about:
 *
 *  1. **It cannot fail open.** No sequence of choices produces a landing age LATER than the
 *     one the diagnostic cleared. The only move on offer is toward more teaching.
 *  2. **The skipped set is a prefix.** Stopping ends the walk, so nothing downstream ever
 *     has to represent a gap in the middle.
 *
 * Both are swept over every era and over every stopping point, with a floor, because a
 * sweep whose population could be empty proves nothing. The exhaustive walk in the last
 * describe is what gives (1) its teeth: it enumerates the whole reachable state space at a
 * four-age plan rather than spot-checking a path through it.
 */

const CHOICES: readonly CatchUpChoice[] = ["stop_here", "keep_going"];

/**
 * Drive a whole age with one choice, returning the state the next prompt opens on.
 *
 * `placed` is sent unconditionally on the accept road because D-ERA18 decides who seats the
 * age and this helper does not: the first age stops in `placing` and every later one goes
 * straight to `founding`, where the reducer's own rule makes the extra event inert.
 */
function walkOneAge(state: CatchUpState, choice: CatchUpChoice): CatchUpState {
  let next = catchUpReducer(state, { type: "choose", choice });
  if (choice === "stop_here") {
    return next;
  }
  next = catchUpReducer(next, { type: "placed" });
  return catchUpReducer(next, { type: "founded" });
}

const placementAt = (era: EraId) => eraPlacementFromSeed(seedPlacingAtEra(era));

describe("the walk opens on the placement it was handed", () => {
  it("walks every handed age, in play order, at every authored placement", () => {
    // POPULATION: every era as the placed age, derived from ERA_SEQUENCE. FLOOR: ten.
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    for (const era of ERA_SEQUENCE) {
      const state = startCatchUp(placementAt(era.id));
      expect(state.plan).toEqual(
        ERA_SEQUENCE.slice(0, eraNumber(era.id) - 1).map((e) => e.id),
      );
      expect(state.placedEra).toBe(era.id);
    }
  });

  it("opens ARRIVED when nothing was handed over, so the surface needs no second predicate", () => {
    const state = startCatchUp(placementAt(ERA_SEQUENCE[0]?.id as EraId));
    expect(state.phase).toBe("arrived");
    expect(isCatchUpDone(state)).toBe(true);
    expect(catchUpEra(state)).toBeNull();
    expect(catchUpPosition(state)).toBeNull();
    expect(landingEra(state)).toBe(ERA_SEQUENCE[0]?.id);
  });

  it("counts the ordinal from one, which is what stops four prompts reading as a nag", () => {
    const state = startCatchUp(placementAt(ERA_SEQUENCE[4]?.id as EraId));
    expect(catchUpPosition(state)).toEqual({ position: 1, total: 4 });
    const later = walkOneAge(walkOneAge(state, "keep_going"), "keep_going");
    expect(catchUpPosition(later)).toEqual({ position: 3, total: 4 });
  });
});

describe("two roads, and D-ERA18 decides who seats the age rather than the learner", () => {
  it("stops for the learner at the FIRST age and never after it, at every placement", () => {
    // THE POPULATION IS EVERY HANDED AGE AT EVERY PLACEMENT, derived, with a floor: the
    // claim is about a rule over positions ("age one by hand, later ages the city"), and
    // a spot check at one placement is a claim about one position.
    let ages = 0;
    for (const era of ERA_SEQUENCE) {
      const opened = startCatchUp(placementAt(era.id));
      let state = opened;
      for (let at = 0; at < opened.plan.length; at += 1) {
        const chosen = catchUpReducer(state, { type: "choose", choice: "keep_going" });
        expect(catchUpBuildMode(at)).toBe(at === 0 ? "learner_places" : "city_places");
        expect(chosen.mode).toBe(catchUpBuildMode(at));
        expect(chosen.phase).toBe(at === 0 ? "placing" : "founding");
        if (at === 0) {
          expect(catchUpReducer(chosen, { type: "placed" }).phase).toBe("founding");
        }
        state = walkOneAge(state, "keep_going");
        ages += 1;
      }
    }
    expect(ages).toBeGreaterThanOrEqual(45);
  });

  it("every accepted age is founded, so the ceremony plays once per handed age", () => {
    let state = startCatchUp(placementAt(ERA_SEQUENCE[4]?.id as EraId));
    const total = state.plan.length;
    for (let index = 0; index < total; index += 1) {
      state = walkOneAge(state, "keep_going");
    }
    expect(state.founded).toEqual(state.plan);
    expect(state.founded).toHaveLength(total);
    expect(state.phase).toBe("arrived");
  });

  it("an event that does not belong to the phase in hand is INERT", () => {
    const state = startCatchUp(placementAt(ERA_SEQUENCE[3]?.id as EraId));
    // A `founded` while choosing would advance the walk past an age nobody decided about.
    for (const event of [{ type: "founded" }, { type: "placed" }] as CatchUpEvent[]) {
      expect(catchUpReducer(state, event)).toBe(state);
    }
    const stopped = walkOneAge(state, "stop_here");
    for (const choice of CHOICES) {
      expect(catchUpReducer(stopped, { type: "choose", choice })).toBe(stopped);
    }
  });
});

describe("stopping is a stopping point: the prefix property and the forfeit", () => {
  it("lands the learner in the age they stopped in, at every stopping point", () => {
    // POPULATION: every (placed age, stopping point) pair the sequence admits, derived.
    // FLOOR: the pairs are counted, so an empty sweep fails rather than passing silently.
    let pairs = 0;
    for (const era of ERA_SEQUENCE) {
      const opened = startCatchUp(placementAt(era.id));
      for (let stopAt = 0; stopAt < opened.plan.length; stopAt += 1) {
        let state = opened;
        for (let index = 0; index < stopAt; index += 1) {
          state = walkOneAge(state, "keep_going");
        }
        const stopped = walkOneAge(state, "stop_here");
        expect(stopped.phase).toBe("stopped");
        expect(stopped.stoppedAt).toBe(opened.plan[stopAt]);
        expect(landingEra(stopped)).toBe(opened.plan[stopAt]);
        // THE FORFEIT: the ages after this one are no longer handed over.
        expect(forfeitedEras(state)).toEqual(opened.plan.slice(stopAt + 1));
        // And they were never founded, which is the half a copy string cannot prove.
        expect(stopped.founded).toEqual(opened.plan.slice(0, stopAt));
        pairs += 1;
      }
    }
    expect(pairs).toBeGreaterThanOrEqual(45);
  });

  it("leaves NO forfeit line to show at the last handed age", () => {
    let state = startCatchUp(placementAt(ERA_SEQUENCE[2]?.id as EraId));
    state = walkOneAge(state, "keep_going");
    expect(catchUpPosition(state)).toEqual({ position: 2, total: 2 });
    expect(forfeitedEras(state)).toEqual([]);
  });
});

describe("the choice CANNOT FAIL OPEN, enumerated rather than argued", () => {
  it("no sequence of choices lands the learner later than the diagnostic cleared", () => {
    // §10.9's second property. Enumerated over the WHOLE reachable state space at a
    // four-age plan, because "there is no move that lengthens the prefix" is a claim about
    // every path and not about one. Two roads rather than three makes the space smaller and
    // the claim identical, and the floor below is what fails if the recursion stops early.
    const placed = ERA_SEQUENCE[4]?.id as EraId;
    const opened = startCatchUp(placementAt(placed));
    const placedNumber = eraNumber(placed);

    let paths = 0;
    const explore = (state: CatchUpState): void => {
      if (isCatchUpDone(state)) {
        paths += 1;
        // The landing age is at or BEFORE the age the instrument cleared, always.
        expect(eraNumber(landingEra(state))).toBeLessThanOrEqual(placedNumber);
        // And the ages actually handed over are a prefix of the plan, always.
        expect(state.founded).toEqual(opened.plan.slice(0, state.founded.length));
        return;
      }
      for (const choice of CHOICES) {
        explore(walkOneAge(state, choice));
      }
    };
    explore(opened);

    // FLOOR under the enumeration: at a four-age plan every path either stops at one of the
    // four ages or keeps going through all of them, so there are exactly five terminals and
    // the floor is what fails if the recursion ever stops exploring.
    expect(paths).toBe(opened.plan.length + 1);
    expect(paths).toBeGreaterThanOrEqual(5);
  });

  it("the only landing ages reachable are the plan's ages and the placed age", () => {
    const placed = ERA_SEQUENCE[5]?.id as EraId;
    const opened = startCatchUp(placementAt(placed));
    const reachable = new Set<EraId>();
    const explore = (state: CatchUpState): void => {
      if (isCatchUpDone(state)) {
        reachable.add(landingEra(state));
        return;
      }
      for (const choice of CHOICES) {
        explore(walkOneAge(state, choice));
      }
    };
    explore(opened);
    // COMPOSITION, which is the claim: exactly the plan plus the placed age, nothing else.
    expect([...reachable].sort()).toEqual([...opened.plan, placed].sort());
  });
});

describe("startCatchUpAt walks the reducer, so a dev jump cannot invent a state", () => {
  it("agrees with the reducer at every position, at every authored placement", () => {
    let checks = 0;
    for (const era of ERA_SEQUENCE) {
      const placement = placementAt(era.id);
      const opened = startCatchUp(placement);
      for (let at = 0; at <= opened.plan.length; at += 1) {
        let driven = opened;
        for (let index = 0; index < at; index += 1) {
          driven = walkOneAge(driven, "keep_going");
        }
        expect(startCatchUpAt(placement, at)).toEqual(driven);
        checks += 1;
      }
    }
    expect(checks).toBeGreaterThanOrEqual(55);
  });

  it("clamps an out-of-range jump rather than producing a state off the end", () => {
    const placement = placementAt(ERA_SEQUENCE[2]?.id as EraId);
    const end = startCatchUpAt(placement, 99);
    expect(end.phase).toBe("arrived");
    expect(end.at).toBe(end.plan.length);
    expect(startCatchUpAt(placement, -5)).toEqual(startCatchUp(placement));
  });
});

describe("the roster is read off the era, never off the placement", () => {
  it("hands over every node of the age, swept over the sequence", () => {
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    for (const era of ERA_SEQUENCE) {
      // A node the era gained after the placement was written still gets a building. The
      // era is the authority on its own roster; the placement is only evidence.
      expect(eraRosterNodeIds(era.id)).toEqual(era.nodes);
      expect(eraRosterNodeIds(era.id).length).toBeGreaterThanOrEqual(3);
    }
  });
});
