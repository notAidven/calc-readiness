import { midEraCrisisCall, midEraCrisisNodeIds } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { materialWord } from "../economy/materialWord";
import { faceTheWinter } from "../test/faceTheWinter";
import { CitySurface } from "./CitySurface";
import { type CityDevSession, createCityDevSession } from "./citySession";
import {
  crisisBriefingFor,
  crisisBriefingForCity,
  forgetCrisisBriefingRead,
  useCrisisCall,
} from "./crisisCall";
import { CURRENT_ERA_ID } from "./eraDressing";
import { BUILDABLE_RADIUS, findOpenCell, footprintFor, occupiedCells } from "./worldLayout";

/**
 * THE ENTRY SEQUENCE, END TO END, THROUGH THE CITY THE PLAYER USES.
 *
 * One press of the dev control, and then nothing that this file does: the trigger, the
 * notice, the announcement and the advisor all have to arrive on their own, out of the
 * node states the seed left behind. That ordering is the assertion. A test that mounted
 * the advisor directly would be green with the trigger deleted, which is the exact defect
 * the architecture of this feature exists to prevent, so the sequence is only ever entered
 * here through the button a reviewer would press.
 *
 * The counter-test at the bottom is the other half: with the era one node short of its
 * trigger, every one of these surfaces must be absent. Without it, "the advisor appears"
 * would be satisfied by an advisor that always appears.
 */

/** A real session, as `App.tsx` builds it for an unauthenticated dev city. */
function devCity(): CityDevSession {
  return createCityDevSession();
}

/**
 * The advisor's walkthrough remembers, in `localStorage`, that it has been read, and opens
 * collapsed for a returning player. Every test here is a first-time player unless it says
 * otherwise, so the flag is cleared between them: without this, the first test to step to
 * the end would collapse the walkthrough for every test after it in the file.
 */
beforeEach(() => {
  forgetCrisisBriefingRead();
});

/** The briefing the card is built from, so the slide count is read rather than typed. */
const BRIEFING = (() => {
  const found = crisisBriefingFor(CURRENT_ERA_ID);
  if (found === null) {
    throw new Error("era one has no crisis briefing, so this whole file proves nothing");
  }
  return found;
})();

/**
 * Read the whole walkthrough, one slide at a time, and return everything it showed.
 *
 * The card shows exactly one section at a time (the lead's ruling on 2026-07-31), so a test
 * that read `advisor.textContent` once would only ever see slide one. Pressing Next is also
 * the only way to prove the other slides are reachable at all.
 */
async function readTheWalkthrough(
  user: ReturnType<typeof userEvent.setup>,
): Promise<string> {
  const seen: string[] = [];
  for (let index = 0; index < BRIEFING.slides.length; index += 1) {
    const slide = await screen.findByTestId("crisis-call-slide");
    expect(slide.textContent ?? "").toContain(
      `Step ${index + 1} of ${BRIEFING.slides.length}`,
    );
    seen.push(slide.textContent ?? "");
    const next = screen.getByTestId("crisis-call-next");
    if ((next as HTMLButtonElement).disabled) {
      expect(index).toBe(BRIEFING.slides.length - 1);
      break;
    }
    await user.click(next);
  }
  expect(seen.length).toBe(BRIEFING.slides.length);
  return seen.join("\n");
}

/**
 * Place and master some nodes THROUGH THE SESSION, on ground it will actually accept.
 *
 * Spots come from `findOpenCell` against the island's own occupancy, hall included, for
 * the reason `crisisSeed.test.ts` records: a refused placement is a silent no-op here and
 * the mastery write behind it is another one, so hand-picked cells would set this file up
 * to prove the opposite of what it says.
 */
async function masterThrough(
  session: CityDevSession,
  nodeIds: readonly string[],
): Promise<void> {
  for (const nodeId of nodeIds) {
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

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("button", { name: "Build" });
  await user.click(screen.getByRole("button", { name: "Menu" }));
}

/**
 * Press the ☰ Menu's Hard Winter entry — the door a person testing the crisis reaches for.
 *
 * Found through the "Other places" nav by its accessible name, because that is all somebody
 * pressing it has: a chip that moved out of the menu, or lost its label, is the same defect
 * as a chip that does nothing.
 */
async function pressTheMenuEntry(user: ReturnType<typeof userEvent.setup>) {
  await openMenu(user);
  const others = screen.getByRole("navigation", { name: "Other places" });
  await user.click(within(others).getByRole("button", { name: /Hard Winter/i }));
}

/**
 * Come back out of the winter, by whichever way out it is offering.
 *
 * A city with something standing on the island gets the running encounter and its "Leave
 * the winter" chip; one with nothing on it gets the refusal and "Back to the island". Both
 * are the same exit, and which one a session lands on is not what these tests are about.
 */
async function leaveTheWinter(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole("button", { name: /Leave the winter|Back to the island/i }),
  );
  await waitFor(() => expect(screen.queryByTestId("winter-in-city")).toBeNull());
}

/**
 * Seed the crisis and clear the moment that legitimately lands in front of it.
 *
 * Mastering the era's third skill unlocks later buildings, so `BuildingUnlockedPopup`
 * opens on the same tick. The crisis is held behind it on purpose (D-CRISIS-10: never an
 * interruption), which means every test below has to walk through the same door a learner
 * would. The wait is asserted rather than merely tolerated in
 * "holds the call behind the moment that got there first".
 */
async function seedAndClearUnlock(user: ReturnType<typeof userEvent.setup>) {
  await openMenu(user);
  await user.click(screen.getByTestId("dev-seed-crisis"));
  const unlocked = await waitFor(() => {
    const popup = document.querySelector<HTMLElement>(".building-unlocked");
    if (!popup) {
      throw new Error("the unlock popup never opened");
    }
    return popup;
  });
  await user.click(within(unlocked).getByRole("button", { name: "Close" }));
}

describe("the mid-era crisis entry sequence", () => {
  it("seeds the city, and then the game itself calls the crisis", async () => {
    const user = userEvent.setup();
    const session = devCity();
    renderCity(session);

    // NOTHING before the trigger. An empty island is not in crisis, and a notice on a
    // city with no buildings would mean the sequence fires on mount rather than on state.
    await screen.findByRole("button", { name: "Build" });
    expect(screen.queryByTestId("crisis-call-notice")).toBeNull();
    expect(screen.queryByTestId("crisis-call-advisor")).toBeNull();

    await openMenu(user);
    const seed = screen.getByTestId("dev-seed-crisis");
    // The control says what it will do before it does it, in the numbers the trigger
    // derives. Era one's three, read off the era rather than written here.
    const expected = midEraCrisisNodeIds(CURRENT_ERA_ID);
    expect(seed.closest("div")?.textContent ?? "").toContain(
      `first ${expected.length} skills`,
    );
    await user.click(seed);
    // The unlock moment gets there first and the crisis waits behind it, which is the
    // deferral D-CRISIS-10 asks for, exercised rather than described.
    const unlocked = await waitFor(() => {
      const popup = document.querySelector<HTMLElement>(".building-unlocked");
      if (!popup) {
        throw new Error("the unlock popup never opened");
      }
      return popup;
    });
    expect(screen.queryByTestId("crisis-call-advisor")).toBeNull();
    await user.click(within(unlocked).getByRole("button", { name: "Close" }));

    // THE SEED'S WHOLE JOB, checked at the session and not at the screen: the city is now
    // in the state a learner would be in, and the engine agrees the call stands.
    await waitFor(async () => {
      const load = await session.load();
      expect(midEraCrisisCall(CURRENT_ERA_ID, load.node_states).standing).toBe(true);
    });
    const load = await session.load();
    for (const nodeId of expected) {
      expect(
        load.placements?.some((p) => p.nodeId === nodeId),
        nodeId,
      ).toBe(true);
    }
    // ...and no further. The era's remaining nodes are untouched, so this is the midpoint
    // and not a finished era.
    const call = midEraCrisisCall(CURRENT_ERA_ID, load.node_states);
    expect(call.mastered).toBe(call.trigger);
    expect(call.mastered).toBeLessThan(call.era_nodes);

    // THE PRODUCTION PATH, arriving by itself. The advisor is up with the terms on it.
    const advisor = await screen.findByTestId("crisis-call-advisor");
    expect(advisor).toHaveAttribute("role", "dialog");
    expect(advisor).toHaveAttribute("aria-modal", "true");
    // The title ribbon went with the card; the NAME did not. See `CrisisCallAdvisor`.
    expect(advisor).toHaveAccessibleName("The Hard Winter");
    expect(
      within(advisor).getByRole("heading", { name: "The Hard Winter" }),
    ).toBeInTheDocument();

    // The announcement went to the assertive region, so a screen reader is told too.
    await waitFor(() => {
      expect(screen.getByTestId("city-live-assertive").textContent ?? "").toContain(
        "The Hard Winter has reached the island",
      );
    });
    expect(screen.getByTestId("city-live-assertive").textContent ?? "").toContain(
      `${call.mastered} of ${call.era_nodes} skills in this age`,
    );
  });

  it("opens on the advisor speaking, with the rules behind a stepped walkthrough", async () => {
    const user = userEvent.setup();
    renderCity(devCity());
    await seedAndClearUnlock(user);

    const advisor = await screen.findByTestId("crisis-call-advisor");
    // THE HOOK, IN A BUBBLE, and Oru is the one who is talking: it says so in words rather
    // than only in a drawing.
    const bubble = advisor.querySelector(".crisis-call-speech__bubble");
    expect(bubble?.textContent ?? "").toMatch(/Oru says:/);
    expect(bubble?.textContent ?? "").toMatch(/the worst winter we have ever seen/i);
    expect(bubble?.textContent ?? "").toMatch(/protect our people/i);
    // ...and he SHOUTS it, which is the register the lead asked for on 2026-07-31 and
    // which a content sweep had previously taken off this exact line.
    expect(screen.getByTestId("crisis-call-lead").textContent ?? "").toMatch(/^Sire! /);

    // AND THE SHOUT CARRIES THE HOOK ALONE. A rule in it would be the old wall of text
    // starting to grow back in the one place it must not.
    //
    // Scoped to the spoken line rather than to the bubble, because the bubble now holds
    // the walkthrough as well: when the card was dropped on 2026-07-31 the slides moved
    // inside it, so the same assertion written over the bubble would be asserting that
    // the walkthrough is not there. The claim was always about what the ADVISOR SAYS.
    const spoken = screen.getByTestId("crisis-call-lead").textContent ?? "";
    expect(spoken).not.toMatch(/light a fire/i);
    expect(spoken).not.toMatch(/frost comes in from the edge/i);

    // ONE SECTION AT A TIME, and the union of them is the whole briefing. The mechanics the
    // lead asked to be conveyed, each checked as a phrase a learner would read rather than
    // as a class name.
    const text = await readTheWalkthrough(user);
    expect(text).toMatch(/frost comes in from the edge/i);
    expect(text).toMatch(/reaches further inward at the end of every round/i);
    expect(text).toMatch(/questions drawn from lessons you have already done/i);
    expect(text).toMatch(/how well you answer decides how strong that action is/i);
    expect(text).toMatch(/light a fire/i);
    expect(text).toMatch(/reinforce a building/i);
    // THE PULL-BACK'S TWO PHRASES ARE NOW ABSENCES. They read `/pull everyone in off the outer
    // ring/i` and `/that ground is given up/i`; the lead ruled the action out on 2026-08-02, so a
    // walkthrough offering it would be describing a board that has two choices on it.
    expect(text).not.toMatch(/pull everyone in/i);
    expect(text).not.toMatch(/ground is given up/i);
    // AND THE DAMAGE LINE IS THE OPPOSITE CLAIM. It read `/takes damage before it is ruined/i`,
    // which is false at `HARD_WINTER.damage.ruin_at: 1`, and the price it names is a REBUILD in the
    // era's own material rather than a repair in "material".
    expect(text).toMatch(/destroys a building the moment it reaches one/i);
    expect(text).not.toMatch(/takes damage before/i);
    expect(text).toMatch(
      new RegExp(`rebuilding costs ${materialWord(CURRENT_ERA_ID)}`, "i"),
    );
    // Clockless, and said out loud, because a learner who thinks a crisis is timed plays
    // a different game from the one that was built.
    expect(text).toMatch(/nothing runs on a timer/i);
  });

  it("does not walk a returning player through the slides again", async () => {
    // The demo case, and the reason this is a remembered flag rather than a skip button:
    // somebody who opens this card ten times in an afternoon must not be handed four steps
    // on every entry. The way BACK to them is one click, which is the other half of it.
    const user = userEvent.setup();
    renderCity(devCity());
    await seedAndClearUnlock(user);
    await screen.findByTestId("crisis-call-advisor");
    await readTheWalkthrough(user);

    // Leave and come back through the notice, the way a player would.
    await user.click(screen.getByTestId("crisis-call-later"));
    await screen.findByTestId("crisis-call-notice");
    await user.click(screen.getByTestId("crisis-call-explain"));

    const advisor = await screen.findByTestId("crisis-call-advisor");
    // The advisor still speaks; the slides do not re-impose themselves.
    expect(advisor.textContent ?? "").toMatch(/the worst winter we have ever seen/i);
    expect(screen.queryByTestId("crisis-call-slide")).toBeNull();
    const toggle = screen.getByTestId("crisis-call-walkthrough-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    // ...and "Face the winter" never needed them either way.
    await user.click(toggle);
    expect(await screen.findByTestId("crisis-call-slide")).toBeVisible();
    await faceTheWinter(user);
    expect(await screen.findByTestId("winter-in-city")).toBeVisible();
  });

  it("waits when the call is declined, and the notice keeps the way in", async () => {
    const user = userEvent.setup();
    renderCity(devCity());
    await seedAndClearUnlock(user);
    await screen.findByTestId("crisis-call-advisor");

    // D-CRISIS-10: the crisis announces itself and the player chooses when to answer.
    await user.click(screen.getByTestId("crisis-call-later"));
    expect(screen.queryByTestId("crisis-call-advisor")).toBeNull();
    const notice = await screen.findByTestId("crisis-call-notice");
    expect(notice).toHaveAttribute("role", "status");
    expect(notice.textContent ?? "").toMatch(/is waiting/i);

    // ...and the way back is on the notice, not only in a menu.
    await user.click(screen.getByTestId("crisis-call-explain"));
    expect(await screen.findByTestId("crisis-call-advisor")).toBeVisible();
  });

  it("hands off to the same crisis the menu opens, and stands down once it is running", async () => {
    const user = userEvent.setup();
    renderCity(devCity());
    await seedAndClearUnlock(user);
    await screen.findByTestId("crisis-call-advisor");

    await faceTheWinter(user);
    expect(await screen.findByTestId("winter-in-city")).toBeVisible();
    // Both entry surfaces are gone while the winter has the island: the crisis is not
    // still being announced to somebody who is playing it.
    expect(screen.queryByTestId("crisis-call-advisor")).toBeNull();
    expect(screen.queryByTestId("crisis-call-notice")).toBeNull();
  });

  it("does not fire one node short of the trigger", async () => {
    const user = userEvent.setup();
    const session = devCity();
    // One below `ceil(n / 2)`, derived rather than typed, so an era resized tomorrow still
    // seeds this test one short instead of silently seeding it past the line.
    const short = midEraCrisisNodeIds(CURRENT_ERA_ID).slice(0, -1);
    expect(short.length).toBeGreaterThanOrEqual(1);
    await masterThrough(session, short);
    expect(
      midEraCrisisCall(CURRENT_ERA_ID, (await session.load()).node_states).standing,
    ).toBe(false);

    renderCity(session);
    await screen.findByRole("button", { name: "Build" });
    // Give the surface a beat to settle, so this is "it did not fire" and not "it has not
    // fired yet".
    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("crisis-call-advisor")).toBeNull();
    expect(screen.queryByTestId("crisis-call-notice")).toBeNull();
    expect(screen.getByTestId("city-live-assertive").textContent ?? "").not.toMatch(
      /Hard Winter/,
    );
  });

  it("re-arms when the city advances an era, instead of carrying the last one's call", async () => {
    // Each era has its own crisis and its own trigger, so a learner who advances must not
    // carry "already called" forward. Read at the hook, because era two announces no crisis
    // of its own and the defect is therefore invisible on screen: the hook would go on
    // reporting a standing call for an era that never made one.
    const states = midEraCrisisNodeIds(CURRENT_ERA_ID).map((nodeId) => ({
      node_id: nodeId,
      mastery: 2 as const,
    }));

    function Probe({ eraId, nodeStates }: { eraId: EraId; nodeStates: typeof states }) {
      const crisis = useCrisisCall({
        eraId,
        nodeStates,
        deferred: false,
        onAnnounce: () => undefined,
      });
      return (
        <output data-testid="probe">{`${crisis.standing}:${crisis.briefingOpen}`}</output>
      );
    }

    // Seed the baseline with nothing mastered, then cross, exactly as the city does.
    const view = render(<Probe eraId={CURRENT_ERA_ID} nodeStates={[]} />);
    expect(screen.getByTestId("probe").textContent).toBe("false:false");
    view.rerender(<Probe eraId={CURRENT_ERA_ID} nodeStates={states} />);
    await waitFor(() => {
      expect(screen.getByTestId("probe").textContent).toBe("true:true");
    });

    const nextEra = ERA_SEQUENCE[1]?.id;
    expect(nextEra).toBeDefined();
    view.rerender(<Probe eraId={nextEra as EraId} nodeStates={states} />);
    // BOTH FLAGS BACK DOWN. Without the reset they stay true, which is the hook holding an
    // open advisor over a call the new era never made.
    expect(screen.getByTestId("probe").textContent).toBe("false:false");

    /*
     * THE THIRD FIELD USED TO BE `crisis.briefing === null`, ASSERTED TRUE HERE, AND THAT
     * CLAIM HAS BEEN SPLIT IN TWO RATHER THAN DROPPED.
     *
     * It conflated two questions that the missing-advisor report turned out to separate:
     * whether era two's crisis ANNOUNCES itself, which it does not, and whether there are
     * terms to read in era two at all, which there now are. `resolveCrisisEra` gives every
     * era a board (D-ERA25 pins it to era one's), so a learner in era two has a winter to
     * walk into and used to have no advisor in front of it on either route.
     *
     * Both halves are asserted, because widening the terms was only safe if it left the
     * trigger alone. It is not folded back into the probe: with terms in every era the old
     * field would now read the same in both, so it would be a constant dressed as a
     * discriminator.
     */
    expect(crisisBriefingFor(nextEra as EraId)).toBeNull();
    expect(crisisBriefingForCity(nextEra as EraId)).not.toBeNull();
  });

  it("does not fire for a city that was ALREADY past the trigger when it loaded", async () => {
    // The `prevMasteryRef` discipline: a popup for something that happened three sessions
    // ago is a false event. The standing way in for that learner is the menu entry, which
    // is asserted present so this is "the sequence is quiet" and not "the crisis is lost".
    const session = devCity();
    await masterThrough(session, midEraCrisisNodeIds(CURRENT_ERA_ID));
    expect(
      midEraCrisisCall(CURRENT_ERA_ID, (await session.load()).node_states).standing,
    ).toBe(true);

    const user = userEvent.setup();
    renderCity(session);
    await screen.findByRole("button", { name: "Build" });
    expect(screen.queryByTestId("crisis-call-advisor")).toBeNull();
    expect(screen.queryByTestId("crisis-call-notice")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Menu" }));
    const others = screen.getByRole("navigation", { name: "Other places" });
    expect(within(others).getByRole("button", { name: /Hard Winter/i })).toBeVisible();
  });
});

/**
 * THE ☰ MENU'S ENTRY IS THE SAME RITUAL, REACHED A SECOND WAY.
 *
 * It used to call `setWinterInCity` itself, which made it a second door into the encounter
 * with the advisor missing from behind it. The lead launched the winter from the menu, saw
 * no advisor, and asked whether there was supposed to be one; there was, and he had walked
 * past it. "Face the winter" is now the only thing that starts anything.
 *
 * The delicate half is that the menu has to keep working BELOW the trigger, because that is
 * what makes it useful for testing. `midEraCrisisCall` sets `standing` at `ceil(n / 2)` of
 * the era's nodes, but `crisisBriefingFor` reads the era and nothing else, so terms exist
 * from the era's first minute. The two reasons a briefing can be open are therefore split:
 * the crisis announcing itself stays earned, and the player asking never was. Each of those
 * is one test below, and the third is the invariant that split puts at risk.
 */
describe("the ☰ Menu entry goes through the crisis call", () => {
  it("raises the advisor instead of dropping the player into the encounter", async () => {
    const user = userEvent.setup();
    renderCity(devCity());
    await seedAndClearUnlock(user);
    // Decline first, so the card on screen afterwards is one the MENU raised rather than
    // the one the call already had up.
    await screen.findByTestId("crisis-call-advisor");
    await user.click(screen.getByTestId("crisis-call-later"));
    await screen.findByTestId("crisis-call-notice");

    await pressTheMenuEntry(user);

    // The terms, not the board. This is the whole defect: the menu entry used to mount the
    // encounter, so a person who came in this way never met the advisor at all.
    expect(await screen.findByTestId("crisis-call-advisor")).toBeVisible();
    expect(screen.queryByTestId("winter-in-city")).toBeNull();

    // ...and it is the real advisor, with the terms on it rather than an empty shell.
    const advisor = screen.getByTestId("crisis-call-advisor");
    expect(advisor).toHaveAccessibleName("The Hard Winter");
    expect(advisor.textContent ?? "").toMatch(/nothing runs on a timer/i);

    // One way in, and it is the button on the card.
    await faceTheWinter(user);
    expect(await screen.findByTestId("winter-in-city")).toBeVisible();
  });

  it("raises it below the trigger too, where no call is standing", async () => {
    const user = userEvent.setup();
    const session = devCity();
    // Read at the engine, not on screen: "no notice is showing" is also true of a crisis
    // that is standing and deferred, and this test is about the other thing.
    expect(
      midEraCrisisCall(CURRENT_ERA_ID, (await session.load()).node_states).standing,
    ).toBe(false);
    renderCity(session);

    await pressTheMenuEntry(user);
    expect(await screen.findByTestId("crisis-call-advisor")).toBeVisible();
    expect(screen.queryByTestId("winter-in-city")).toBeNull();

    // And it starts from the same button, so the menu below the trigger is the full ritual
    // rather than a card with nothing behind it.
    await faceTheWinter(user);
    expect(await screen.findByTestId("winter-in-city")).toBeVisible();
  });

  it("never puts up the standing notice for a crisis that has not called", async () => {
    const user = userEvent.setup();
    renderCity(devCity());

    // THE INVARIANT MOST AT RISK. The notice is the crisis announcing itself, which
    // D-CRISIS-9 says is earned; the advisor now also answers the player asking, which is
    // not. Gating the notice on "a briefing exists" instead of on `standing` would pass
    // every assertion in the two tests above and put an unearned crisis on the HUD.
    await pressTheMenuEntry(user);
    await screen.findByTestId("crisis-call-advisor");
    expect(screen.queryByTestId("crisis-call-notice")).toBeNull();

    // Dismissing is where it would show up: the notice is what STAYS when the advisor is
    // sent away, so a crisis that never called must leave nothing behind.
    await user.click(screen.getByTestId("crisis-call-later"));
    expect(screen.queryByTestId("crisis-call-advisor")).toBeNull();
    expect(screen.queryByTestId("crisis-call-notice")).toBeNull();
    // Nor was anything announced. The assertive region is what a screen reader hears, and
    // an unearned crisis must not have been spoken to one either.
    expect(screen.getByTestId("city-live-assertive").textContent ?? "").not.toMatch(
      /Hard Winter/,
    );
  });

  it("does not mark an uncalled crisis answered, so the real call still arrives", async () => {
    const user = userEvent.setup();
    const session = devCity();
    renderCity(session);

    // Below the trigger, through the menu, all the way into the winter and back out.
    await pressTheMenuEntry(user);
    await screen.findByTestId("crisis-call-advisor");
    await faceTheWinter(user);
    await screen.findByTestId("winter-in-city");
    await leaveTheWinter(user);

    // `answerCall` latches "answered", and the latch is what stops the notice for the rest
    // of the mount. Setting it from a briefing the player raised themselves would mark a
    // call answered that was never made, and the announcement earned later would never
    // arrive. So earn it now: the crisis has to call anyway.
    await seedAndClearUnlock(user);
    expect(await screen.findByTestId("crisis-call-advisor")).toBeVisible();
    await waitFor(() => {
      expect(screen.getByTestId("city-live-assertive").textContent ?? "").toContain(
        "The Hard Winter has reached the island",
      );
    });
  });

  it("still records a call that WAS standing, so the notice does not come back", async () => {
    const user = userEvent.setup();
    renderCity(devCity());
    await seedAndClearUnlock(user);
    await screen.findByTestId("crisis-call-advisor");
    await user.click(screen.getByTestId("crisis-call-later"));
    await screen.findByTestId("crisis-call-notice");

    // The other direction of the same guard. A fix that simply stopped latching would
    // satisfy the test above and leave the crisis calling a learner who has already been
    // through it, so the standing case has to keep recording that it was answered.
    await pressTheMenuEntry(user);
    await faceTheWinter(user);
    await screen.findByTestId("winter-in-city");
    await leaveTheWinter(user);

    expect(screen.queryByTestId("crisis-call-notice")).toBeNull();
    expect(screen.queryByTestId("crisis-call-advisor")).toBeNull();
  });
});
