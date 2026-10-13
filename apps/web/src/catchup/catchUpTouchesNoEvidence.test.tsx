import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CitySurface } from "../city/CitySurface";
import { type CityDevSession, createCityDevSession } from "../city/citySession";
import { clearEraId, loadEraId } from "../city/eraState";
import { resetCityEra } from "../city/useCityEra";
import { eraPlacementFromSeed, seedPlacingAtEra } from "./eraPlacement";

/**
 * **THE WALK CHANGES WHERE BUILDINGS STAND AND WHICH AGE THE CITY IS IN. IT CHANGES NOTHING
 * ELSE.**
 *
 * The brief named the reject as the road *"likeliest to interact badly with persistence"*,
 * because it is the one that changes progression state rather than just geometry. This file is
 * that check, and it is deliberately not an argument: it drives the whole walk through the real
 * `CitySurface` against a real `createCityDevSession` and reads the session back.
 *
 * `winterDevSkipGrantsNoEvidence.test.tsx`'s precedent, on #325's: *"a skip that quietly
 * recorded fifteen correct answers would be the first thing in the feature to touch the mastery
 * signal."* The equivalent here would be a catch-up that granted mastery for an age it handed
 * over, and it would be a contract violation rather than a bug: `docs/Contracts.md` §1.1 rules
 * that test-out completes a building at **mastery 0** and that the practice remains the only
 * route to mastery, and §8.2 records two readers having already misread the storm's gate as a
 * defect on exactly this ground.
 *
 * ## THE THREE FIELDS, AND WHY EACH IS CHECKED SEPARATELY
 *
 *  - **`mastery` must not move at all**, on any road. That is INV-DIAG-1's direction and the
 *    one-mastery-writer rule, and it is the field a well-meaning *"the founding felt like it
 *    should count for something"* change would touch first.
 *  - **`placement_estimate` must not move either**, because placement is write-once at
 *    onboarding: `aurora-placement-writer.ts` inserts with `on conflict do nothing` and calls
 *    itself *"immutable thereafter"*. A reject that un-wrote a placement would disagree with
 *    production the moment there is a database behind it.
 *  - **`completion_status` must stay as the placement left it**, which is the reading a reader
 *    is most likely to get wrong in the other direction: *"they rejected the pre-seed, so they
 *    should not have the buildings."* They keep them. The buildings were handed over by the
 *    PLACEMENT rather than by the walk, and §8.2 is explicit that test-out skips the lesson only
 *    — so a learner who stops in age three still owns age one's buildings and still owes the
 *    practice on every one of them.
 */

const SIX_D1: Readonly<Record<string, number>> = seedPlacingAtEra(
  ERA_SEQUENCE[1]?.id as EraId,
);

let session: CityDevSession;

beforeEach(() => {
  localStorage.clear();
  resetCityEra();
  clearEraId();
  session = createCityDevSession();
});

afterEach(() => {
  cleanup();
  resetCityEra();
  clearEraId();
  localStorage.clear();
});

/** The session's node states, keyed, so a before/after comparison is a field comparison. */
async function readStates(): Promise<Map<string, StudentNodeState>> {
  const load = await session.load();
  return new Map(load.node_states.map((state) => [state.node_id, state]));
}

/**
 * Dismiss the diagnostic reward, which now stands in front of the walk.
 *
 * One placement feeds both surfaces since the reward screen and this walk were unified onto a
 * single `pretestPlacement` prop, and `CitySurface` makes the catch-up YIELD to the reward on
 * the same rule the in-play unlock popup already follows — two modals may not stack on first
 * entry. So a learner presses "Start building" and then meets the walk, and a test that wants
 * the walk has to do the same rather than skip a screen the learner cannot.
 */
async function dismissTheReward(): Promise<void> {
  const reward = screen.queryByRole("button", { name: "Start building" });
  if (reward) {
    fireEvent.click(reward);
  }
}

/** Mount the live city with a placement, and wait for the walk to open. */
async function mountWalk(placedEra: EraId): Promise<void> {
  const placement = seedPlacingAtEra(placedEra);
  const unlocked = Object.keys(placement).filter((nodeId) => (placement[nodeId] ?? 0) >= 2);
  session.seedFromPlacement(placement, unlocked);
  render(
    <CitySurface
      enableCanvas={false}
      reducedMotion
      loadCity={session.load}
      onMoveTownHall={session.moveTownHall}
      onPlaceSkill={session.placeSkill}
      onMoveSkill={session.moveSkill}
      onOpenSurface={() => undefined}
      pretestPlacement={placement}
    />,
  );
  await screen.findByRole("button", { name: "Build" });
  await dismissTheReward();
  await screen.findByTestId("catchup-prompt");
}

/** A diagnostic founding is now one explicit reveal rather than a timed multi-stage replay. */
async function playOutTheFounding(): Promise<void> {
  await screen.findByTestId("catchup-founding");
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => {
    expect(screen.queryByTestId("catchup-founding")).toBeNull();
  });
}

/** Take the first age, which D-ERA18 gives the learner to seat, and land on age two's prompt. */
async function takeTheLearnersAge(): Promise<void> {
  fireEvent.click(screen.getByTestId("catchup-choose-keep_going"));
  fireEvent.click(await screen.findByTestId("catchup-placing-done"));
  await playOutTheFounding();
  await screen.findByTestId("catchup-prompt");
}

/** The evidence fields, as one comparable snapshot. */
function evidenceOf(states: Map<string, StudentNodeState>) {
  return [...states.entries()]
    .map(([nodeId, state]) => ({
      nodeId,
      mastery: state.mastery,
      placement_estimate: state.placement_estimate,
      completion_status: state.completion_status,
      lesson_stage: state.lesson_stage,
    }))
    .sort((a, b) => a.nodeId.localeCompare(b.nodeId));
}

describe("every road leaves the evidence byte-identical", () => {
  it("the city places a later age: buildings move, evidence does not", async () => {
    await mountWalk(ERA_SEQUENCE[2]?.id as EraId);
    const before = evidenceOf(await readStates());

    // Age one is the learner's by D-ERA18 and it seats nothing on its own, which is asserted
    // in the test below. Age two is the first the city lays out.
    await takeTheLearnersAge();
    fireEvent.click(screen.getByTestId("catchup-choose-keep_going"));
    await screen.findByTestId("catchup-founding");
    // The layout write really happened, so the comparison below is over a city that changed.
    await waitFor(async () => {
      const load = await session.load();
      expect(load.placements ?? []).not.toHaveLength(0);
    });

    expect(evidenceOf(await readStates())).toEqual(before);
  });

  it("the first age is the learner's: nothing at all moves until they act", async () => {
    await mountWalk(ERA_SEQUENCE[2]?.id as EraId);
    const before = evidenceOf(await readStates());

    fireEvent.click(screen.getByTestId("catchup-choose-keep_going"));
    await screen.findByTestId("catchup-placing");
    fireEvent.click(screen.getByTestId("catchup-placing-done"));
    await screen.findByTestId("catchup-founding");

    expect(evidenceOf(await readStates())).toEqual(before);
    // And this age really did seat nothing, which is what D-ERA18 gives it to the learner
    // for: a regression that auto-placed here would take the agency the ruling protects.
    expect((await session.load()).placements ?? []).toEqual([]);
  });

  it("STOP HERE: the age moves to where they stopped, and the evidence does not move", async () => {
    // THE FLAGGED RISK, through the real surface. A learner the diagnostic cleared for the
    // MEDIEVAL era stops at the first prompt, so the city has to stand in the age they stopped
    // in rather than the age they were cleared for — which is §10.9's *"its as if they were
    // placed into 3"* at the earliest possible stopping point.
    //
    // Stopped at the FIRST age deliberately, and it is a scope note rather than a shortcut: a
    // stop at a later age needs a founding to run out, which is 45 seconds of wall clock the
    // shipped surface offers no seam to shorten. `catchUpFlow.test.tsx` drives every stopping
    // point of every placement with the clock in hand; what only this file can check is the
    // WRITE, and one stop is enough to check a write.
    await mountWalk(ERA_SEQUENCE[4]?.id as EraId);
    const before = evidenceOf(await readStates());
    expect(loadEraId()).toBe(ERA_SEQUENCE[0]?.id);

    fireEvent.click(screen.getByTestId("catchup-choose-stop_here"));
    await screen.findByTestId("catchup-stopped");

    // THE ONE THING THAT CHANGED, and it changed to the age they stopped in.
    await waitFor(() => {
      expect(loadEraId()).toBe(ERA_SEQUENCE[0]?.id);
    });
    expect(loadEraId()).not.toBe(ERA_SEQUENCE[4]?.id);
    // AND NOTHING ELSE. No mastery granted, no placement rewritten, no completion taken back.
    expect(evidenceOf(await readStates())).toEqual(before);
  });

  it("does NOT jump the city to the age the diagnostic cleared when the walk is stopped", async () => {
    // The previous test's `not.toBe` is weak on its own, because era one is also the default:
    // a walk that wrote nothing at all would pass it. This is the other direction — the walk
    // DOES write, and it writes the placed age when the learner takes every road to the end.
    //
    // Driven at a one-age placement, which is the only shape whose whole walk fits inside a
    // test without a clock seam: one prompt, one founding, and the landing.
    await mountWalk(ERA_SEQUENCE[1]?.id as EraId);
    expect(loadEraId()).toBe(ERA_SEQUENCE[0]?.id);
    fireEvent.click(screen.getByTestId("catchup-choose-keep_going"));
    fireEvent.click(await screen.findByTestId("catchup-placing-done"));
    await screen.findByTestId("catchup-founding");
    // The founding is running, so the landing has NOT happened: an implementation that wrote
    // the era on the choice rather than at the end would fail here.
    expect(loadEraId()).toBe(ERA_SEQUENCE[0]?.id);
  });

  it("keeps the handed-over buildings COMPLETE after a reject, which is §8.2's model", async () => {
    // The reading a reader is most likely to get wrong in the other direction. The placement
    // handed these buildings over at mastery 0; the walk decides where they stand, not whether
    // they exist.
    await mountWalk(ERA_SEQUENCE[2]?.id as EraId);
    fireEvent.click(screen.getByTestId("catchup-choose-stop_here"));
    await screen.findByTestId("catchup-stopped");

    const states = await readStates();
    let complete = 0;
    for (const nodeId of Object.keys(SIX_D1)) {
      const state = states.get(nodeId);
      expect(state, `${nodeId} is missing from the session`).toBeDefined();
      expect(state?.mastery, `${nodeId} was granted mastery`).toBe(0);
      expect(state?.placement_estimate).toBe(2);
      if (state?.completion_status === "complete") {
        complete += 1;
      }
    }
    // FLOOR: the loop actually inspected the handed-over set rather than an empty one, so
    // "every one is at mastery 0" is not vacuously true.
    expect(complete).toBe(Object.keys(SIX_D1).length);
    expect(complete).toBeGreaterThanOrEqual(6);
  });
});

describe("the walk does not disturb a city it was never handed", () => {
  it("leaves the era where it found it when nothing was handed over", async () => {
    // At today's D1-only diagnostic scope this is almost every learner. A walk that wrote an
    // era on a placement that handed nothing over would move a city that had earned nothing.
    const placement = seedPlacingAtEra(ERA_SEQUENCE[0]?.id as EraId);
    expect(eraPlacementFromSeed(placement).skipped).toEqual([]);
    render(
      <CitySurface
        enableCanvas={false}
        reducedMotion
        loadCity={session.load}
        onMoveTownHall={session.moveTownHall}
        onPlaceSkill={session.placeSkill}
        onOpenSurface={() => undefined}
        pretestPlacement={placement}
      />,
    );
    await screen.findByRole("button", { name: "Build" });
    expect(screen.queryByTestId("catchup-prompt")).toBeNull();
    expect(loadEraId()).toBe(ERA_SEQUENCE[0]?.id);
  });
});
