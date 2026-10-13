import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { audioPrefs } from "../audio/audioPrefs";
import { installSfxProbe } from "../audio/testSfxProbe";
import { CitySurface } from "./CitySurface";
import { useCrisisCall } from "./crisisCall";
import { MOCK_NODE_STATES } from "./mockCity";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./townHall";
import type { CityLoad } from "./types";
import { resetCityEra } from "./useCityEra";

/**
 * **NO PANEL SPEAKS ANY MORE, AND THE CRISIS STILL ANNOUNCES ITSELF.**
 *
 * *"A game that clicks at every interaction is worse than one that is quiet"* is a refusal
 * rather than a gap, and a refusal that nothing checks is indistinguishable from four
 * sounds somebody forgot. So the chrome is opened here and asserted to make no sound: the
 * era rail, the build categories, the build menu, and How to play.
 *
 * **The Album was the one exception until 2026-08-04**, when the lead cut it. `album-open`
 * was the only sample in the catalogue fired by a panel opening, so it went with the
 * surface (`test/cityEventSfx.test.ts` would have reddened on the orphan otherwise) and the
 * chrome is now silent all the way through.
 *
 * ⚑ **WHICH MAKES THE POSITIVE CONTROL LOAD-BEARING, and it is the crisis call below.**
 * `#207` is a silence assertion in this tree that ran green over 43 cases under a fully
 * muted audio context, and every assertion in the first describe has exactly that shape
 * now that nothing on the chrome is expected to sound. The second describe drives the SAME
 * probe, in the same file, to `["crisis-call.ogg"]` — so a probe that had stopped hearing
 * anything fails there rather than passing everywhere.
 *
 * Driven through the real player. See `audio/testSfxProbe.ts` for why nothing here mocks
 * `playSfx`.
 */

function loadWith(over: Partial<CityLoad> = {}): () => Promise<CityLoad> {
  return () =>
    Promise.resolve({
      node_states: MOCK_NODE_STATES,
      placements: [],
      town_hall: { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM },
      ...over,
    });
}

const probe = installSfxProbe();

afterAll(() => probe.restore());

beforeEach(() => {
  resetCityEra();
  probe.reset();
});

afterEach(resetCityEra);

async function ready(): Promise<HTMLElement> {
  return screen.findByRole("button", { name: "Build" });
}

async function openMenu(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole("button", { name: "Menu" }));
}

describe("the chrome stays silent, which is the refusal", () => {
  it("says nothing when the build menu opens, or when either tablist changes tab", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} loadCity={loadWith()} />);
    await ready();
    probe.reset();

    // The build menu is a control and opens in silence, which is row 20's refusal.
    await user.click(await screen.findByRole("button", { name: "Build" }));
    await screen.findByRole("tabpanel");
    expect(probe.played()).toEqual([]);

    // Both tablists live in here: the era rail and the build categories.
    const lists = screen.getAllByRole("tablist");
    expect(
      lists.map((list) => list.getAttribute("aria-label")).sort(),
      "the two tablists the refusal is about were not on screen to be silent",
    ).toEqual(["Build categories", "Era"]);

    const tabs = screen.getAllByRole("tab");
    // A floor, because "no tab made a sound" holds trivially over no tabs at all — and a
    // tab change is the interaction a learner performs most often.
    expect(tabs.length).toBeGreaterThanOrEqual(4);
    for (const tab of tabs) {
      await user.click(tab);
    }

    expect(
      probe.played(),
      "a tab change tells the ear nothing the eye already has",
    ).toEqual([]);
  }, 60000);

  it("says nothing when the ☰ Menu itself opens, or a panel behind it", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} loadCity={loadWith()} />);
    await ready();
    probe.reset();

    await openMenu(user);
    // Opening the menu is a control, not a place. It says nothing.
    expect(probe.played()).toEqual([]);
    await user.click(screen.getByTestId("lighting-toggle"));
    await user.click(screen.getByTestId("audio-settings-toggle"));
    expect(screen.getByTestId("audio-volume")).toBeInTheDocument();
    expect(
      probe.played(),
      "Environment controls do not add a click track to the city",
    ).toEqual([]);
    // First Escape closes Sound and restores its trigger; the second closes Menu.
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("audio-volume")).toBeNull();
    await user.keyboard("{Escape}");

    // The reference panels the menu opens. Two of the four were the Timeline and the
    // Album until the 2026-08-04 cut; the ones left are asserted by test id rather than
    // counted, and a missing id throws instead of quietly shrinking this to nothing.
    for (const entry of ["menu-how-to-play", "menu-achievements"]) {
      await openMenu(user);
      const item = screen.queryByTestId(entry);
      if (item === null) {
        throw new Error(`the ☰ Menu has no ${entry}, so this sweep measures nothing`);
      }
      await user.click(item);
      await user.keyboard("{Escape}");
    }

    expect(probe.played()).toEqual([]);
  }, 60000);
});

/**
 * THE CRISIS CALL, driven through the hook that decides when it lands.
 *
 * The component is not the event: the advisor card can also be raised from the ☰ Menu at
 * any time, by a player who went looking for the terms below the trigger, and that is not
 * the crisis arriving. So the bell rides the same once-per-era latch as the spoken
 * announcement, and this drives the hook to prove it.
 */
describe("the crisis call arriving", () => {
  const eraId = "prehistoric" as const;

  /** Node states below and then above D-CRISIS-9's `ceil(n / 2)` trigger. */
  function states(mastered: number) {
    return MOCK_NODE_STATES.map((state, index) => ({
      ...state,
      mastery: (index < mastered ? 2 : 0) as 0 | 2,
    }));
  }

  it("strikes the bell once, on the crossing, and never on the first read", () => {
    const { rerender } = renderHook(
      ({ mastered }: { mastered: number | null }) =>
        useCrisisCall({
          eraId,
          nodeStates: mastered === null ? null : states(mastered),
          deferred: false,
          onAnnounce: () => undefined,
        }),
      { initialProps: { mastered: 0 as number | null } },
    );

    // The first read with real node states SEEDS the baseline rather than firing: a city
    // that loads already past the trigger has not just crossed it.
    expect(probe.played()).toEqual([]);

    rerender({ mastered: MOCK_NODE_STATES.length });

    expect(probe.played()).toEqual(["crisis-call.ogg"]);

    // A further render past the same trigger is the same standing call, not a second one.
    rerender({ mastered: MOCK_NODE_STATES.length });
    expect(probe.countOf("crisis-call.ogg")).toBe(1);
  });

  it("stays silent while muted", () => {
    audioPrefs.setMuted(true);
    const { rerender } = renderHook(
      ({ mastered }: { mastered: number }) =>
        useCrisisCall({
          eraId,
          nodeStates: states(mastered),
          deferred: false,
          onAnnounce: () => undefined,
        }),
      { initialProps: { mastered: 0 } },
    );

    rerender({ mastered: MOCK_NODE_STATES.length });

    expect(probe.played()).toEqual([]);
  });

  it("holds the bell back while the learner is busy, exactly as it holds the announcement", () => {
    const { rerender } = renderHook(
      ({ mastered, deferred }: { mastered: number; deferred: boolean }) =>
        useCrisisCall({
          eraId,
          nodeStates: states(mastered),
          deferred,
          onAnnounce: () => undefined,
        }),
      { initialProps: { mastered: 0, deferred: true } },
    );

    // The crossing happens while a lesson is up. D-CRISIS-10: the crisis waits.
    rerender({ mastered: MOCK_NODE_STATES.length, deferred: true });
    expect(probe.played()).toEqual([]);

    rerender({ mastered: MOCK_NODE_STATES.length, deferred: false });
    expect(probe.played()).toEqual(["crisis-call.ogg"]);
  });
});
