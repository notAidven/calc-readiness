import { midEraCrisisCall } from "@cr/game";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { completedNodeIdsFrom } from "../lessons/lessonProgress";
import { faceTheWinter } from "../test/faceTheWinter";
import { WINTER_NODE_ORDER, winterEligibleNodes } from "../winter/hardWinterItems";
import { CitySurface } from "./CitySurface";
import { type CityDevSession, createCityDevSession } from "./citySession";
import { CURRENT_ERA_ID } from "./eraDressing";
import { BUILDABLE_RADIUS, findOpenCell, footprintFor, occupiedCells } from "./worldLayout";

/**
 * **THE CRISIS, OPENED FROM A FRESH SESSION — WHICH IS THE STATE A DEMO MACHINE IS IN.**
 *
 * The lead opened the winter on a session at level 1, 0 XP, one building standing, 88 of 88
 * cells held, and got this where the question panel should have been:
 *
 * > **No batch to ask** — "The winter draws from every skill the learner has reached so far,
 * > and this learner has reached none. There is nothing to ask, so there is no encounter to
 * > run yet."
 *
 * ## WHICH OF TWO THINGS IT WAS, MEASURED RATHER THAN GUESSED
 *
 * The reading he offered was that *"the lesson progress isn't loaded in when i go from the
 * menu"* — a wiring bug, `practisedNodeIds` failing to reach `WinterInCity`. That is one of
 * two possible faults and the fix differs, so this file separates them and each half is one
 * test:
 *
 *  - **(a) a wiring bug.** {@link `the winter reads progress that IS there`} plays the SAME
 *    journey through the SAME session API with two skills mastered, and the crisis asks about
 *    exactly those two. So progress does reach the winter, and (a) is not what happened.
 *  - **(b) an empty set, correctly read.** A fresh session genuinely has no scored practice
 *    set, `completedNodeIdsFrom` correctly returns nothing, and the composer correctly refuses
 *    a pool it cannot fill. The message was true. The defect is that a state the game routes
 *    players into on purpose — the ☰ menu's entry is deliberately reachable below the trigger
 *    — rendered the encounter unplayable with no way forward.
 *
 * So this is a fix to (b), and the shape of it is in `hardWinterItems.winterDrawSetFromIds`:
 * the round falls back to era one's AUTHORED nodes rather than to nothing.
 *
 * ## THE HALF THAT MATTERS MORE THAN PLAYABILITY
 *
 * The other way to make a fresh session playable would be to credit the six skills, and that
 * would be the wrong fix in a way that is expensive to undo: this repository protects the
 * mastery signal above almost everything (hints are recorded but not scored, a reveal zeroes a
 * slot). So {@link `the crisis grants no evidence`} plays a whole round from the empty session
 * and reads the session back: the node states are byte-identical, the practised set is still
 * empty, and the crisis's own trigger has not moved. **Draw the questions; do not grant the
 * evidence.**
 *
 * Everything here goes through the doors a player uses — the ☰ menu, the advisor, "Face the
 * winter", the declare panel, the commit button — because the defect was reached that way and
 * a test that mounted the surface directly would have missed the mount that had it.
 */

/** A real session, as `App.tsx` builds it for an unauthenticated dev city. */
function devCity(): CityDevSession {
  return createCityDevSession();
}

function renderCity(session: CityDevSession) {
  return render(
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
    />,
  );
}

/**
 * Walk in the way the lead did: ☰ Menu → Hard Winter → the advisor → "Face the winter".
 *
 * The menu entry raises the BRIEFING and only "Face the winter" starts anything (#319), so
 * both beats are here rather than a jump to the encounter.
 */
async function openTheWinterFromTheMenu(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("button", { name: "Build" });
  await user.click(screen.getByRole("button", { name: "Menu" }));
  const others = screen.getByRole("navigation", { name: "Other places" });
  await user.click(within(others).getByRole("button", { name: /Hard Winter/i }));
  await faceTheWinter(user);
  return await screen.findByTestId("winter-in-city");
}

/**
 * Declare a shield on the island's heart and commit into the questions.
 *
 * **IT WAS THE PULL-BACK UNTIL 2026-08-02**, and the reason it was is worth keeping: the
 * pull-back needed no cell, so this helper was one click and kept the test about the batch rather
 * than about aiming. With that action ruled out, the shortest declaration is a reinforce, which
 * does need a cell — so the heart is picked by its own `data-cell`, which is the same handle
 * `HardWinterSurface.test.tsx` uses and is stable across every layout the encounter deals.
 */
async function commitIntoTheQuestions(user: ReturnType<typeof userEvent.setup>) {
  // Awaited, not queried: the winter's surface is behind `lazy`, so the mount is on screen a
  // tick before its declare panel is.
  await user.click(await screen.findByRole("button", { name: /Reinforce a building/i }));
  // WHICHEVER BUILDING IS ON THIS BOARD, found by its own `data-node` rather than by a cell: this
  // helper runs over a FRESH city whose only placement is the pre-seeded hall, and over a practised
  // one, so a pinned coordinate would be pinning one of the two.
  const anyBuilding = document.querySelector<HTMLElement>(".hw-grid [data-node]");
  if (anyBuilding === null) {
    throw new Error("no building is on the grid, so nothing can be reinforced");
  }
  await user.click(anyBuilding);
  await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));
}

describe("the Hard Winter, opened from a session with no practice behind it", () => {
  /**
   * THE STATE THE LEAD WAS IN, established at the session rather than described: a fresh city
   * with the pre-seeded hall standing and no scored practice set anywhere.
   */
  it("is genuinely a learner with nothing practised, and one building standing", async () => {
    const session = devCity();
    const load = await session.load();

    expect(completedNodeIdsFrom(load.node_states)).toEqual([]);
    expect(winterEligibleNodes(load.node_states)).toEqual([]);
    // One building: the pre-seeded hall. This is what makes the board playable at all — an
    // island with nothing on it gets the winter's own refusal, which is a different screen.
    expect(load.town_hall).not.toBeNull();
    expect(load.placements ?? []).toEqual([]);
    // And below the crisis's own trigger, so the menu is the only way in — which is the door
    // he used and the door that is deliberately open this early.
    expect(midEraCrisisCall(CURRENT_ERA_ID, load.node_states).standing).toBe(false);
  });

  /**
   * **THE DEFECT, AS THE SCREEN HE SAW.** Before the fallback this reached "No batch to ask"
   * with no question, no field and nothing to press: the encounter could not be played at all.
   */
  it("asks its questions instead of refusing the round", async () => {
    const user = userEvent.setup();
    renderCity(devCity());
    await openTheWinterFromTheMenu(user);
    await commitIntoTheQuestions(user);

    expect(screen.queryByRole("heading", { name: "No batch to ask" })).toBeNull();
    expect(screen.queryByText(/has reached none/)).toBeNull();

    // A question, and something to answer it with. Both, because the refusal panel rendered a
    // heading too and "a panel is on screen" would have passed over it.
    expect(await screen.findByRole("heading", { name: /^Question 1 of 3$/ })).toBeVisible();
    expect(screen.getByRole("textbox")).toBeVisible();
  });

  /**
   * AND IT SAYS WHERE THEY CAME FROM. The advisor promised questions *"drawn from lessons you
   * have already done"* on the way in, and under the fallback that sentence is not true, so
   * the panel doing the asking has to correct it. Without this the fix would be a silent one.
   */
  it("tells the learner the questions are not from lessons they have done", async () => {
    const user = userEvent.setup();
    renderCity(devCity());
    await openTheWinterFromTheMenu(user);
    await commitIntoTheQuestions(user);
    await screen.findByRole("heading", { name: /^Question 1 of 3$/ });

    const note = document.querySelector(".hw-note--draw");
    expect(
      note,
      "nothing on screen says the questions are from unpractised lessons",
    ).not.toBe(null);
    expect(note?.textContent ?? "").toMatch(/have not finished a practice set/i);
    // And the other half of the sentence, which is the promise that keeps the fallback safe to
    // play: answering is not recorded.
    expect(note?.textContent ?? "").toMatch(
      /Nothing you answer here is written to your progress/i,
    );
  });

  /**
   * **DRAW THE QUESTIONS, DO NOT GRANT THE EVIDENCE.**
   *
   * The cheap fix would have been to write the six skills into the session so the ordinary
   * draw could serve them. Read back through the session's own loader after a whole round has
   * been declared, answered and resolved: nothing moved.
   */
  it("grants no evidence: the session's progress is untouched by playing a round", async () => {
    const user = userEvent.setup();
    const session = devCity();
    const before = (await session.load()).node_states;

    renderCity(session);
    await openTheWinterFromTheMenu(user);
    await commitIntoTheQuestions(user);
    await screen.findByRole("heading", { name: /^Question 1 of 3$/ });

    // Answer all three — wrongly, then it cannot be argued that only a correct answer writes.
    for (let index = 0; index < 3; index += 1) {
      const field = await screen.findByRole("textbox");
      await user.clear(field);
      await user.type(field, "1234567");
      await user.click(screen.getByRole("button", { name: "Check" }));
      await user.click(
        screen.getByRole("button", {
          name: index === 2 ? /See what you earned/i : /Next question/i,
        }),
      );
    }
    // The round really did resolve, so the assertions below are about a round that was played
    // rather than about a panel that never opened.
    expect(
      await screen.findByRole("button", { name: /Let the frost advance/i }),
    ).toBeVisible();

    const after = (await session.load()).node_states;
    expect(after).toEqual(before);
    expect(completedNodeIdsFrom(after)).toEqual([]);
    expect(winterEligibleNodes(after)).toEqual([]);
    // The crisis has not moved its own trigger either, which is the other thing a faked
    // mastery write would have done: the real call still has to be earned.
    expect(midEraCrisisCall(CURRENT_ERA_ID, after).standing).toBe(false);
  });
});

/**
 * THE (a) HALF: progress that IS there reaches the winter.
 *
 * Written to fail if the wiring from the session through `CitySurface`'s `practicedNodeIds`
 * into `WinterInCity` ever breaks — which is the fault the lead's reading proposed and which
 * this test is the evidence against. It has to be the same journey as the tests above, or the
 * two halves would not be comparable.
 */
describe("the Hard Winter reads progress that IS there", () => {
  it("asks about exactly the practised skills and nothing else", async () => {
    const user = userEvent.setup();
    const session = devCity();
    // Two skills, placed and mastered through the session's own writes rather than a
    // hand-built snapshot: a refused placement is a silent no-op and the mastery write behind
    // it another, so the read-back below is what makes the setup real. Spots come from
    // `findOpenCell` against the island's own occupancy, hall included, for that reason.
    const practised = WINTER_NODE_ORDER.slice(0, 2);
    for (const nodeId of practised) {
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
    }
    expect(completedNodeIdsFrom((await session.load()).node_states)).toEqual([
      ...practised,
    ]);

    renderCity(session);
    await openTheWinterFromTheMenu(user);
    await commitIntoTheQuestions(user);
    await screen.findByRole("heading", { name: /^Question 1 of 3$/ });

    // No fallback: the draw is the learner's own set, so the correction note must be absent.
    // This is the assertion that tells the two states apart — a fallback that fired for
    // everybody would make the fix above indistinguishable from ignoring progress entirely.
    expect(
      document.querySelector(".hw-note--draw"),
      "the fallback fired for a learner who has practised",
    ).toBeNull();

    // And what it is asking about is one of the two, checked through the dev read-out because
    // that is where the surface states its eligible set. Hidden in-city by CSS, present in the
    // DOM, and jsdom has no cascade — which is exactly what makes it readable here.
    const reading = document.querySelector(".hw-panel--dev .hw-dev__reading")?.textContent;
    expect(reading ?? "").toContain(practised.join(", "));
    expect(reading ?? "").toContain("real practised set");
    for (const nodeId of WINTER_NODE_ORDER.slice(2)) {
      expect(
        reading ?? "",
        `${nodeId} is eligible without having been practised`,
      ).not.toContain(nodeId);
    }
  });
});

/**
 * The leave path from the fresh session, kept because the refusal used to be the only thing
 * on screen and "there is a way out" was true of it too. A crisis that can be entered and not
 * left is the same class of blocker as one that cannot be played.
 */
describe("the way out survives the fallback", () => {
  it("leaves the winter and puts the island back", async () => {
    const user = userEvent.setup();
    renderCity(devCity());
    await openTheWinterFromTheMenu(user);
    await commitIntoTheQuestions(user);
    await screen.findByRole("heading", { name: /^Question 1 of 3$/ });

    await user.click(screen.getByRole("button", { name: /Leave the winter/i }));
    await waitFor(() => {
      expect(screen.queryByTestId("winter-in-city")).toBeNull();
    });
  });
});
