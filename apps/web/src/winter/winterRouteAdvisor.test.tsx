import { midEraCrisisNodeIds } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CitySurface } from "../city/CitySurface";
import {
  crisisBriefingFor,
  forgetCrisisBriefingRead,
  useCrisisCall,
} from "../city/crisisCall";
import { MOCK_NODE_STATES } from "../city/mockCity";
import { resetCityEra, setCityEra } from "../city/useCityEra";
import { faceTheWinter } from "../test/faceTheWinter";
import { canPlayCrisisIn } from "./crisisEra";
import { WINTER_NODE_ORDER } from "./hardWinterItems";
import { WinterRoute } from "./WinterRoute";

/**
 * **THE CRISIS ADVISOR IS REACHABLE ON THE ROUTE THE ENCOUNTER IS ACTUALLY DEMONSTRATED
 * FROM.**
 *
 * The speech bubble and the stepped slides shipped in #322 and were reported missing the same
 * day. Two separate faults put them out of reach, both structural, and either one alone is
 * enough to produce the report — so both are pinned here, because fixing one and calling it
 * done would leave a demo path with no advisor on it.
 *
 *  1. **`?winter` never mounts `CitySurface`.** `App.tsx` returns the winter surface from a
 *     branch several above the one that mounts the city, and the advisor renders from the
 *     city. `WinterRoute` is the entry sequence for that route.
 *  2. **The terms existed for era one alone.** `hasPlayableCrisis` is keyed to the one era
 *     with a crisis of its own, so in every later era `crisis.briefing` was null and the ☰
 *     Menu's Hard Winter entry fell through its `else` straight into mounting the encounter.
 *     A save in era two therefore had no advisor on EITHER route.
 *
 * The borrowed-board era is derived from {@link canPlayCrisisIn}, whose binding half is the
 * winter's item pool rather than the land: all ten land budgets are authored, so a later era
 * has ground and still no question to ask on it.
 *
 * ## What each test would catch
 *
 * Point `WinterRoute` back at a bare `HardWinterSurface` and the first two fail. Narrow
 * `crisisBriefingForCity` back to `crisisBriefingFor` and the third and fourth fail, on the
 * pre-fix tree, which is how they were measured.
 *
 * ## What is deliberately NOT widened
 *
 * The crisis ANNOUNCING itself. That is earned at `ceil(n / 2)` of an era's own nodes
 * (D-CRISIS-9) and an era with no crisis of its own has nothing to earn, so the last test
 * here holds that gate down: the terms are askable everywhere and the notice is not.
 */

/** The era the lead's save is in: a later one, with no winter of its own to walk into. */
function borrowedBoardEra(): EraId {
  const later = ERA_SEQUENCE.find((era) => !canPlayCrisisIn(era.id));
  if (!later) {
    throw new Error(
      "every era has a playable crisis, so the pinned-board case cannot arise",
    );
  }
  return later.id;
}

/** The one era whose crisis is its own. */
function ownBoardEra(): EraId {
  const own = ERA_SEQUENCE.find((era) => canPlayCrisisIn(era.id));
  if (!own) {
    throw new Error("no era has a playable crisis at all");
  }
  return own.id;
}

const allPractised = (): readonly string[] => WINTER_NODE_ORDER;

function loadWith(nodeStates = MOCK_NODE_STATES) {
  return () => Promise.resolve({ node_states: nodeStates, placements: [] });
}

beforeEach(() => {
  resetCityEra();
  forgetCrisisBriefingRead();
});

afterEach(() => {
  resetCityEra();
  forgetCrisisBriefingRead();
});

describe("the ?winter route has the advisor in front of it", () => {
  for (const { label, era } of [
    { label: "the era whose crisis is its own", era: ownBoardEra },
    { label: "a later era, whose board is borrowed", era: borrowedBoardEra },
  ]) {
    it(`greets the player before the board, in ${label}`, async () => {
      setCityEra(era());
      render(<WinterRoute readMasteredNodes={allPractised} />);

      const advisor = await screen.findByTestId("crisis-call-advisor");
      // The dialogue, the hero speech bubble and the paginated walkthrough: the three
      // things #322 added, all three of which were unreachable from this route.
      //
      // NAMED rather than "visible", because the card went on 2026-07-31 and its title
      // ribbon with it: the heading is still a real `<h2>` and still what labels the
      // dialog, and it is now `.visually-hidden`, so `toBeVisible` would be asserting
      // something this file's jsdom render is in no position to see either way.
      expect(
        within(advisor).getByRole("heading", { name: "The Hard Winter" }),
      ).toBeInTheDocument();
      expect(advisor).toHaveAccessibleName("The Hard Winter");
      expect(within(advisor).getByTestId("crisis-call-speech")).toBeVisible();
      expect(within(advisor).getByTestId("crisis-call-lead").textContent).toMatch(
        /worst winter we have ever seen/i,
      );
      // ONE SLIDE, AND THE STEPPER THAT PAGES IT. A card that rendered all four at once
      // would satisfy a bare "the walkthrough is on screen" and not the lead's ask.
      expect(within(advisor).getAllByTestId("crisis-call-slide")).toHaveLength(1);
      expect(within(advisor).getByTestId("crisis-call-slide").textContent).toMatch(
        /Step 1 of \d+/,
      );
      expect(within(advisor).getByTestId("crisis-call-next")).toBeVisible();

      // The advisor is NAMED in every era, so the card is signed by a character rather than
      // reading as a system message on the route where the board is borrowed.
      expect(within(advisor).getByText(/says:$/).textContent).toMatch(/\w+ says:/);
    });
  }

  it("puts the card away on Face the winter, leaving the board it was over", async () => {
    const user = userEvent.setup();
    setCityEra(borrowedBoardEra());
    render(<WinterRoute readMasteredNodes={allPractised} />);

    await screen.findByTestId("crisis-call-advisor");
    await faceTheWinter(user);
    expect(screen.queryByTestId("crisis-call-advisor")).toBeNull();

    // The encounter was mounted underneath all along, so dismissing REVEALS rather than
    // swaps: the declare panel is on screen with nothing further pressed.
    expect(
      screen.getByRole("button", { name: /Commit and face \d+ questions/i }),
    ).toBeVisible();

    // And the dismissal is not one-way, which matters on a route somebody is presenting from.
    await user.click(screen.getByTestId("hw-talk-to-advisor"));
    expect(await screen.findByTestId("crisis-call-advisor")).toBeVisible();
  });
});

describe("the ☰ Menu raises the advisor in an era whose board is borrowed", () => {
  it("opens the card rather than falling through into the encounter", async () => {
    const user = userEvent.setup();
    setCityEra(borrowedBoardEra());
    // THE PREMISE, stated rather than assumed: this era has no crisis of its own, so the
    // era-keyed briefing really is null here and the `else` branch really was reachable.
    expect(crisisBriefingFor(borrowedBoardEra())).toBeNull();

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={loadWith()}
        onOpenSurface={() => undefined}
      />,
    );
    await screen.findByRole("button", { name: "Build" });
    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(await screen.findByRole("button", { name: /Hard Winter/i }));

    // The advisor, not the board. Before the fix this test found `winter-in-city` mounted
    // with no advisor anywhere on screen.
    const advisor = await screen.findByTestId("crisis-call-advisor");
    expect(advisor).toHaveAccessibleName("The Hard Winter");
    expect(screen.queryByTestId("winter-in-city")).toBeNull();

    // ...and it is still the way in, so raising the card did not cost the entry.
    await faceTheWinter(user);
    expect(await screen.findByTestId("winter-in-city")).toBeVisible();
  });

  /**
   * THE GATE THE WIDENING WAS NOT ALLOWED TO MOVE (D-CRISIS-9), DRIVEN ACROSS THE TRIGGER.
   *
   * **A fresh mount cannot test this and the first version of it tried to.** `useCrisisCall`
   * seeds a baseline on its first read with real node states and only fires on the
   * TRANSITION, so a city that mounts already past the trigger is silent whatever the gate
   * says. Asserting "no notice on screen" after one render therefore passed with the gate
   * widened, which is a test that measured nothing — confirmed by injection before it was
   * rewritten. So the crossing is driven here the way `crisisEntrySequence.test.tsx` drives
   * it: seed with nothing mastered, then re-render with the era's own nodes mastered.
   *
   * Era one is the control. It has to CROSS, or "era two stayed quiet" is satisfied by a
   * hook that never speaks in any era.
   */
  it("still refuses to announce itself in an era with no crisis of its own", async () => {
    /**
     * ENOUGH OF **THIS** ERA'S OWN NODES TO CROSS ITS OWN TRIGGER.
     *
     * `midEraCrisisCall` counts an era's own nodes and ignores every other era's, in as many
     * words, so handing era two a set of era-one ids is a crossing that never happens. That
     * is precisely how the first version of this test came to measure nothing: it stayed
     * quiet in era two because the trigger was never reached, not because the gate held.
     */
    const mastered = (eraId: EraId) =>
      midEraCrisisNodeIds(eraId).map((nodeId) => ({
        node_id: nodeId,
        mastery: 2 as const,
      }));

    function Probe({
      eraId,
      nodeStates,
    }: {
      readonly eraId: EraId;
      readonly nodeStates: readonly { node_id: string; mastery: 2 }[];
    }) {
      const crisis = useCrisisCall({
        eraId,
        nodeStates,
        deferred: false,
        onAnnounce: () => undefined,
      });
      return <output data-testid="probe">{String(crisis.standing)}</output>;
    }

    // THE CONTROL: era one crosses and the call stands, so the crossing this test drives is
    // a real one and the era-two half below is a refusal rather than a no-op.
    const own = render(<Probe eraId={ownBoardEra()} nodeStates={[]} />);
    expect(screen.getByTestId("probe").textContent).toBe("false");
    own.rerender(<Probe eraId={ownBoardEra()} nodeStates={mastered(ownBoardEra())} />);
    await waitFor(() => {
      expect(screen.getByTestId("probe").textContent).toBe("true");
    });
    own.unmount();

    // AND THE ERA WHOSE BOARD IS BORROWED: the same crossing, and it stays quiet. The terms
    // are readable there (the tests above), and that must not have bought an announcement.
    const borrowed = render(<Probe eraId={borrowedBoardEra()} nodeStates={[]} />);
    expect(screen.getByTestId("probe").textContent).toBe("false");
    borrowed.rerender(
      <Probe eraId={borrowedBoardEra()} nodeStates={mastered(borrowedBoardEra())} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("probe").textContent).toBe("false");
    });
    expect(screen.getByTestId("probe").textContent).toBe("false");
  });
});
