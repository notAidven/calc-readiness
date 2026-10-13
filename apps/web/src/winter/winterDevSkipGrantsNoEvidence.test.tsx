import { HARD_WINTER, midEraCrisisCall } from "@cr/game";
import type { StudentNodeState } from "@cr/state-schema";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { CitySurface } from "../city/CitySurface";
import { type CityDevSession, createCityDevSession } from "../city/citySession";
import { CURRENT_ERA_ID } from "../city/eraDressing";
import {
  BUILDABLE_RADIUS,
  findOpenCell,
  footprintFor,
  occupiedCells,
} from "../city/worldLayout";
import {
  createInMemoryEconomyClient,
  type InMemoryEconomyClient,
} from "../economy/economySession";
import { useEconomy } from "../economy/useEconomy";
import { completedNodeIdsFrom } from "../lessons/lessonProgress";
import { faceTheWinter } from "../test/faceTheWinter";
import { WINTER_NODE_ORDER, winterEligibleNodes } from "./hardWinterItems";

/**
 * **THE DEV SKIP GRANTS NO LEARNING EVIDENCE, AND THIS IS THE MEASUREMENT RATHER THAN THE CLAIM.**
 *
 * The winter serves REAL items from the real bank, graded by the real versioned checker. It writes
 * no mastery, deliberately: `hardWinterItems.ts` explains at length why answering under pressure is
 * not a fair measure of what a learner knows, and does not import the module that could record it.
 * A dev control that resolved a round "as 3 of 3" and quietly wrote fifteen correct answers into the
 * session would be the first thing in the feature to break that, and it would be unpickable
 * afterwards in the way this repository protects hardest against — hints are recorded but
 * deliberately unscored, a reveal zeroes a slot, and graded evidence sits behind a versioned checker
 * and a documented rescore procedure.
 *
 * ## THE SHAPE IS #325'S, DELIBERATELY
 *
 * That pull request made the crisis playable from a fresh session and proved the same property the
 * same way: play a real round through the doors a player uses, then read the session back and
 * compare. `crisisFromAFreshSession.test.tsx` is the precedent and this is the same test for a
 * different mechanism. Everything goes through the ☰ menu, the advisor, "Face the winter", the
 * declare panel and the commit button, because a test that mounted `HardWinterSurface` directly
 * would be measuring a component rather than the product.
 *
 * ## WHY THIS LEARNER HAS PRACTISED, WHERE #325'S HAD NOT
 *
 * A fresh session's evidence is EMPTY, and "empty before, empty after" is the cheapest kind of pass:
 * it holds over a comparison that has stopped comparing anything. So this seeds two real skills
 * through the session's own writes, which puts three things on the board that a cheating skip could
 * plausibly move — real `mastery` values, real `last_practiced_at` stamps, and a NON-EMPTY economy
 * ledger — and the floors below assert each of them is there before the winter is played. #325's
 * fresh-session case is still covered, by #325.
 *
 * ## AND IT PLAYS THE WHOLE WINTER AT THE TOP RUNG
 *
 * Five rounds at `strong`, which is fifteen questions' worth of "3 of 3" and therefore the largest
 * amount of evidence any dishonest implementation could have granted. Both halves of the control are
 * exercised: the per-round row resolves round one, and the run-out plays rounds two to five.
 */

/** A real session, as `App.tsx` builds it for an unauthenticated dev city. */
function devCity(): CityDevSession {
  return createCityDevSession();
}

/**
 * The learner this file plays as: two era-one skills placed and mastered.
 *
 * Two rather than three, because era one's crisis fires at three: this learner is genuinely below
 * the trigger, which is what makes *"the trigger is still un-crossed"* a claim about the skip rather
 * than about a learner who had already crossed it.
 */
const TWO_SKILLS = WINTER_NODE_ORDER.slice(0, 2);

/**
 * The city with a REAL economy behind it, wired through the two seams `App.tsx` uses.
 *
 * The ledger is the point of the wiring. `reconcileProgress` is what derives idempotent earn grants
 * from learning state on every city load, so it is the path by which a mastery write would turn into
 * currency; observing the client it writes to is how "the ledger is untouched" becomes a reading
 * rather than an argument about which callbacks exist.
 */
function CityWithEconomy({
  session,
  economy,
}: {
  readonly session: CityDevSession;
  readonly economy: InMemoryEconomyClient;
}) {
  const wallet = useEconomy(economy);
  return (
    <CitySurface
      enableCanvas={false}
      reducedMotion
      loadCity={session.load}
      onMoveTownHall={session.moveTownHall}
      onPlaceSkill={session.placeSkill}
      onMoveSkill={session.moveSkill}
      onDevAdvanceMastery={session.advanceMasteryDev}
      onDevLessonTaught={session.markLessonTaught}
      onDevSetStage={session.setStageDev}
      onOpenSurface={() => undefined}
      onCityLoad={wallet.reconcileProgress}
      onInterleavedClear={wallet.reportInterleavedClear}
    />
  );
}

/**
 * Place and master `count` skills through the session's own writes.
 *
 * Through the writes rather than as a hand-built snapshot, because a refused placement is a silent
 * no-op and the mastery write behind it is another: the read-back the caller does is what makes the
 * setup real. Spots come from `findOpenCell` against the island's own occupancy, hall included.
 */
async function practise(
  session: CityDevSession,
  nodes: readonly string[],
): Promise<readonly string[]> {
  for (const nodeId of nodes) {
    const load = await session.load();
    const occupants = [...(load.placements ?? [])];
    if (load.town_hall) {
      occupants.push(load.town_hall);
    }
    const spot = findOpenCell(
      footprintFor(nodeId),
      occupiedCells(occupants),
      BUILDABLE_RADIUS,
    );
    if (!spot) {
      throw new Error(`no open ground for ${nodeId}`);
    }
    await session.placeSkill(nodeId, spot);
    await session.advanceMasteryDev(nodeId, 2);
    // Read back, because both writes above are silent no-ops on refusal — `advanceMasteryDev`
    // does nothing at all for an unplaced node, which is how a setup can look complete and
    // establish nothing. Measured: the positive control at the foot of this file was written
    // without the placement and did not move the session by a single field.
    const states = (await session.load()).node_states;
    const written = states.find((state) => state.node_id === nodeId);
    if (!written || written.mastery < 1 || written.last_practiced_at === null) {
      throw new Error(
        `${nodeId} was not actually practised: the setup established nothing`,
      );
    }
  }
  return nodes;
}

/** Walk in the way a player does: ☰ Menu, Hard Winter, the advisor, "Face the winter". */
async function openTheWinterFromTheMenu(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("button", { name: "Build" });
  await user.click(screen.getByRole("button", { name: "Menu" }));
  const others = screen.getByRole("navigation", { name: "Other places" });
  await user.click(within(others).getByRole("button", { name: /Hard Winter/i }));
  await faceTheWinter(user);
  return await screen.findByTestId("winter-in-city");
}

/**
 * Declare a fire on the island's heart, and commit into the questions.
 *
 * A FIRE rather than #325's pull-back, and the difference matters for the run-out: the pull-back's
 * ring is always the next band inward, so repeating it walks out of legal moves before the winter
 * is over, and this test needs all five rounds played. A fire on the same cell stays legal forever.
 *
 * The cell is clicked on the real 2D board. In-city the board is normally the city's own canvas, and
 * `enableCanvas={false}` is what puts the grid back — `WinterInCity` passes `renderBoard` only when
 * the canvas is live, which is the same fail-closed path a browser without WebGL takes.
 */
async function declareAFireAndCommit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /Light a fire/i }));
  const heart = document.querySelector<HTMLButtonElement>('[data-cell="0,0"]');
  if (!heart) {
    throw new Error("the winter board has no cell at the island's centre to light");
  }
  await user.click(heart);
  await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));
  await screen.findByRole("heading", { name: /^Question 1 of 3$/ });
}

/** Everything about a node that a granted answer would have moved. */
function evidenceOf(states: readonly StudentNodeState[]) {
  return states.map((state) => ({
    node_id: state.node_id,
    mastery: state.mastery,
    mastery_updated_at: state.mastery_updated_at,
    last_practiced_at: state.last_practiced_at,
    completion_status: state.completion_status,
    lesson_stage: state.lesson_stage,
  }));
}

describe("skipping the winter's questions grants no learning evidence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("leaves node states, mastery, last_practiced_at and the ledger exactly as they were", async () => {
    const user = userEvent.setup();
    const session = devCity();
    const economy = createInMemoryEconomyClient();
    const practised = await practise(session, TWO_SKILLS);

    render(<CityWithEconomy session={session} economy={economy} />);
    await openTheWinterFromTheMenu(user);
    await declareAFireAndCommit(user);

    /*
     * THE FLOORS, before anything is skipped. Each one is a thing this test would otherwise be
     * able to pass over: an empty node list, an unstamped practice date, or an empty ledger all
     * make "unchanged" true for free.
     */
    const beforeStates = (await session.load()).node_states;
    expect(completedNodeIdsFrom(beforeStates)).toEqual([...practised]);
    expect(winterEligibleNodes(beforeStates)).toEqual([...practised]);
    const stamped = beforeStates.filter((state) => state.last_practiced_at !== null);
    expect(stamped.length, "no node carries a practice stamp to preserve").toBe(
      practised.length,
    );
    expect(
      beforeStates.filter((state) => state.mastery > 0).length,
      "no node carries mastery to preserve",
    ).toBe(practised.length);
    // The economy has really derived its grants from that progress, so the ledger comparison
    // below is over rows rather than over nothing.
    await waitFor(() => {
      expect(
        economy.snapshot().entries.length,
        "the economy recorded nothing for two mastered skills, so the ledger claim is vacuous",
      ).toBeGreaterThan(0);
    });
    const beforeLedger = economy.snapshot();
    const beforeEvidence = evidenceOf(beforeStates);
    // And the crisis's own trigger is still un-crossed, which is the other thing a faked mastery
    // write would move: the real call has to be earned.
    expect(midEraCrisisCall(CURRENT_ERA_ID, beforeStates).standing).toBe(false);

    /* ---------------------------------------------- the skip, at the top rung, for a whole winter */

    // Round one through the per-round row. `strong` is 3 of 3, so nothing weaker is being tested.
    await user.click(screen.getByTestId("hw-dev-skip-resolve-strong"));
    expect(
      await screen.findByRole("button", { name: /Let the frost advance/i }),
      "the round did not resolve, so nothing below is about a round that was played",
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Let the frost advance/i }));

    // Rounds two to five through the run-out, repeating the same fire.
    await user.click(await screen.findByTestId("hw-dev-skip-runout-strong"));
    // THE WINTER REALLY ENDED. Without this the read-back below could be describing a winter that
    // never got past its first round.
    expect(await screen.findByTestId("hw-conclusion")).toBeVisible();

    /* ------------------------------------------------------------------------ the read-back */

    const afterStates = (await session.load()).node_states;

    expect(evidenceOf(afterStates)).toEqual(beforeEvidence);
    expect(afterStates).toEqual(beforeStates);
    // Named individually as well as compared wholesale, so a failure says WHICH promise broke
    // rather than printing two node-state arrays side by side.
    for (const [index, after] of afterStates.entries()) {
      const before = beforeStates[index] as StudentNodeState;
      expect(after.mastery, `${after.node_id} mastery moved`).toBe(before.mastery);
      expect(after.last_practiced_at, `${after.node_id} last_practiced_at moved`).toEqual(
        before.last_practiced_at,
      );
      expect(after.mastery_updated_at, `${after.node_id} mastery_updated_at moved`).toEqual(
        before.mastery_updated_at,
      );
    }
    expect(completedNodeIdsFrom(afterStates)).toEqual([...practised]);
    expect(winterEligibleNodes(afterStates)).toEqual([...practised]);
    expect(midEraCrisisCall(CURRENT_ERA_ID, afterStates).standing).toBe(false);

    // AND THE LEDGER. Five rounds at the top rung paid nothing: not a lesson-complete row, not a
    // star, not an interleaved clear.
    expect(economy.snapshot().entries).toEqual(beforeLedger.entries);
    expect(economy.snapshot()).toEqual(beforeLedger);

    /*
     * THE POSITIVE CONTROL, and it is the reason the comparisons above mean anything.
     *
     * Every assertion in this test passes by finding nothing changed, which is also exactly how
     * they would read if the two read-backs had quietly stopped observing the thing they name — a
     * session whose loader returned a cached snapshot, or a `snapshot()` that had become a frozen
     * copy. So the same two readings are taken across a write that IS real, through the same
     * loader and the same client, and each one has to move.
     *
     * This lives in the test rather than in a one-off injection because an injection proves the
     * teeth once, on the day it is run, and a control proves them on every run afterwards.
     */
    await practise(
      session,
      WINTER_NODE_ORDER.slice(practised.length, practised.length + 1),
    );
    expect(
      evidenceOf((await session.load()).node_states),
      "a real mastery write is invisible to this read-back, so its green above proves nothing",
    ).not.toEqual(beforeEvidence);

    await economy.reportInterleavedClear({ sessionId: "no-evidence-positive-control" });
    expect(
      economy.snapshot().entries,
      "a real grant is invisible to this ledger read, so its green above proves nothing",
    ).not.toEqual(beforeLedger.entries);
  });

  /**
   * THE SAME PROPERTY OVER THE ROUND-BY-ROUND CONTROL AT EVERY RUNG, because the test above
   * exercises `strong` and a write could be conditional on the tier. Four rounds, four tiers, one
   * session, read back once at the end.
   *
   * `none` is in the sweep on purpose: it is the rung whose fire never catches, and an
   * implementation that "only writes when something was earned" would pass a sweep that skipped it.
   */
  it("records nothing at any rung of the ladder", async () => {
    const user = userEvent.setup();
    const session = devCity();
    const economy = createInMemoryEconomyClient();
    await practise(session, TWO_SKILLS);

    render(<CityWithEconomy session={session} economy={economy} />);
    await openTheWinterFromTheMenu(user);

    const beforeStates = (await session.load()).node_states;
    await waitFor(() => {
      expect(economy.snapshot().entries.length).toBeGreaterThan(0);
    });
    const beforeLedger = economy.snapshot();

    /*
     * **THE LADDER IS CLIPPED TO THE WINTER, and it is derived rather than shortened by hand.**
     *
     * It walked all four rungs, which needed a winter longer than four rounds. At
     * `HARD_WINTER.rounds: 3` the fourth round does not exist, so the sweep is the first `rounds -
     * 1` rungs and the read-out below is still a ROUND rather than the conclusion card — which is
     * the coupling the assertion after the loop exists to pin, and the reason this is clipped from
     * the constant instead of being written as three.
     *
     * What is lost is the `strong` rung, and it is lost rather than substituted: the claim is that
     * NO rung of the skip ladder writes evidence, and the rung the clip drops is covered by the
     * per-rung sweep earlier in this file, which does not have to play a whole winter to reach it.
     */
    const LADDER = ["none", "weak", "steady", "strong"] as const;
    const rungs = LADDER.slice(0, HARD_WINTER.rounds - 1);
    expect(rungs.length, "no rung fits inside the winter").toBeGreaterThanOrEqual(1);
    for (const rung of rungs) {
      await declareAFireAndCommit(user);
      await user.click(await screen.findByTestId(`hw-dev-skip-resolve-${rung}`));
      await user.click(
        await screen.findByRole("button", { name: /Let the frost advance/i }),
      );
    }
    /*
     * Four rounds are behind us, so the fifth is the round on screen: the sweep really ran.
     *
     * The coupling is pinned rather than left implicit, because for one day on 2026-08-01 the
     * winter WAS four rounds long and this read-out said *"Winter is over"* instead. A ladder as
     * long as the winter would make the assertion below measure the conclusion card rather than
     * a round, so the inequality is what says which one is on screen.
     */
    expect(
      rungs.length,
      "the ladder is as long as the winter, so the read-out below is the conclusion",
    ).toBeLessThan(HARD_WINTER.rounds);
    expect(
      document.querySelector(".winter-in-city .hw-round")?.textContent ?? "",
    ).toContain(`Round ${rungs.length + 1}`);

    const afterStates = (await session.load()).node_states;
    expect(evidenceOf(afterStates)).toEqual(evidenceOf(beforeStates));
    expect(afterStates).toEqual(beforeStates);
    expect(economy.snapshot()).toEqual(beforeLedger);
  });
});
