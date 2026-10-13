import { NO_CRISIS_DAMAGE } from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACHIEVEMENTS,
  achievementKey,
  hasEarnedAchievement,
  loadEarnedAchievements,
} from "./achievements";
import { CitySurface } from "./CitySurface";
import { MOCK_NODE_STATES } from "./mockCity";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./townHall";
import type { CityLoad } from "./types";
import { resetCityEra, setCityEra } from "./useCityEra";

/**
 * **THE ACHIEVEMENTS AS THEY ARE REACHED: the moment, the list, and the dev hatch.**
 *
 * `achievements.test.ts` holds the table and the reachability of each row, and
 * `achievementsSurface.test.tsx` holds the two components in isolation. This file holds the
 * half only the mounted city can answer:
 *
 *  - the earning pass really runs off the city's own state, so a load that satisfies a row
 *    produces the moment and the stored flag without anybody pressing anything;
 *  - it is idempotent across a remount, which is *"earned once and permanently"* meeting the
 *    thing that would break it;
 *  - the list is findable from the ☰ Menu and does not disturb the other four panels;
 *  - the dev control fires the real path and gets out of the way of the moment.
 */

const DEPLOYED_API = "https://calc-readiness.example/api/diagnostic";

/**
 * A city nobody has learned anything in yet.
 *
 * **`MOCK_NODE_STATES` IS NOT THAT CITY, and finding out was worth the test.** Its `NUM.S`
 * sits at mastery 3, so the `?mock` demo island satisfies the mastery row the instant it
 * loads. That is correct behaviour for a partly-played city and it is the wrong fixture for
 * any assertion about a city that has done NOTHING, which three of the tests below are. So
 * the mastery is stripped rather than the assertions being loosened to match.
 */
const FRESH_NODE_STATES = MOCK_NODE_STATES.map((state) => ({
  ...state,
  mastery: 0 as (typeof MOCK_NODE_STATES)[number]["mastery"],
}));

function loadWith(over: Partial<CityLoad> = {}): () => Promise<CityLoad> {
  return () =>
    Promise.resolve({
      node_states: FRESH_NODE_STATES,
      placements: [],
      town_hall: { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM },
      ...over,
    });
}

function eraIdAt(position: number): EraId {
  const era = ERA_SEQUENCE[position - 1];
  if (!era) {
    throw new Error(`ERA_SEQUENCE has no era ${position}`);
  }
  return era.id;
}

async function ready(): Promise<HTMLElement> {
  return screen.findByRole("button", { name: "Build" });
}

async function openAchievements(
  user: ReturnType<typeof userEvent.setup>,
): Promise<HTMLElement> {
  await user.click(screen.getByRole("button", { name: "Menu" }));
  await user.click(screen.getByTestId("menu-achievements"));
  return screen.findByTestId("achievements-panel");
}

function rowFor(id: string): { readonly earned: string; readonly toEarn: string } {
  const found = ACHIEVEMENTS.find((achievement) => achievement.id === id);
  if (found === undefined) {
    throw new Error(`no achievement declared with id ${id}`);
  }
  return found;
}

beforeEach(() => {
  localStorage.clear();
  resetCityEra();
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
  resetCityEra();
});

describe("CitySurface: earning one", () => {
  /**
   * THE ERA ROW, off the city's own era store, with nothing pressed.
   *
   * The era is the cheapest of the four to put a mounted city into, and it is the one whose
   * signal is furthest from the achievements module: `setCityEra` is the store the advance
   * ceremony writes, so this is the earning pass reading real game state rather than a prop.
   */
  it("announces the moment and records it when the city already satisfies a row", async () => {
    setCityEra(eraIdAt(2));
    render(<CitySurface enableCanvas={false} reducedMotion loadCity={loadWith()} />);
    await ready();

    const note = await screen.findByTestId("city-achievement");
    expect(note.textContent).toContain(rowFor("first-age").earned);
    // AND IT IS RECORDED, which is the difference between a moment and a memory.
    await waitFor(() => expect(hasEarnedAchievement("first-age")).toBe(true));

    // The rows the city has not satisfied are NOT recorded, so the write above is about the
    // era rather than about mounting the surface.
    expect(hasEarnedAchievement("crisis-behind-you")).toBe(false);
    expect(hasEarnedAchievement("learning-through-ruin")).toBe(false);
  });

  it("does not announce it again on a remount", async () => {
    setCityEra(eraIdAt(2));
    const first = render(
      <CitySurface enableCanvas={false} reducedMotion loadCity={loadWith()} />,
    );
    await ready();
    await screen.findByTestId("city-achievement");
    await waitFor(() => expect(hasEarnedAchievement("first-age")).toBe(true));
    first.unmount();

    // The same city, opened again. The flag is in storage, so the pass has nothing new.
    render(<CitySurface enableCanvas={false} reducedMotion loadCity={loadWith()} />);
    await ready();
    // Given time for the effect to have run: a `queryBy` immediately after mount would pass
    // for a note that was about to appear.
    await waitFor(() => expect(loadEarnedAchievements().has("first-age")).toBe(true));
    expect(
      screen.queryByTestId("city-achievement"),
      "the moment fired a second time for something already earned",
    ).toBeNull();
  });

  /**
   * TWO ROWS ON ONE TICK. A city standing in its second age that has also carried a crisis
   * home satisfies two, and only one card may be on the island: two celebrations over one
   * moment is a pile rather than a beat. The quiet one still has to be RECORDED, or the list
   * would be missing something the player did.
   */
  it("shows one card for a batch and records the rest silently", async () => {
    setCityEra(eraIdAt(2));
    render(
      <CitySurface
        enableCanvas={false}
        reducedMotion
        loadCity={loadWith({
          crisis_damage: {
            ...NO_CRISIS_DAMAGE,
            next_damage_id: NO_CRISIS_DAMAGE.next_damage_id + 1,
          },
        })}
      />,
    );
    await ready();

    await screen.findByTestId("city-achievement");
    expect(
      screen.getAllByTestId("city-achievement").length,
      "two cards are on the island at once",
    ).toBe(1);
    await waitFor(() => {
      expect(loadEarnedAchievements()).toEqual(new Set(["crisis-behind-you", "first-age"]));
    });
  });

  it("leaves a brand new city with no moment and nothing recorded", async () => {
    render(<CitySurface enableCanvas={false} reducedMotion loadCity={loadWith()} />);
    await ready();
    // Waited on something the load definitely produces, so this is not a race with an
    // effect that had not run.
    await waitFor(() => expect(screen.getByRole("button", { name: "Menu" })).toBeVisible());
    expect(screen.queryByTestId("city-achievement")).toBeNull();
    expect(loadEarnedAchievements().size).toBe(0);
  });

  /**
   * AND THE MOCK ISLAND, unmodified, DOES earn one.
   *
   * The pair with the test above is the point: *"nothing is recorded"* would pass for an
   * earning pass that had been disconnected, and this is what rules that out — the same
   * mount, the same absence of any press, and the shipped demo city's own mastery-3 node
   * producing the mastery row.
   */
  it("earns the mastery row on the demo island the ?mock hatch loads", async () => {
    render(
      <CitySurface
        enableCanvas={false}
        reducedMotion
        loadCity={loadWith({ node_states: MOCK_NODE_STATES })}
      />,
    );
    await ready();
    const note = await screen.findByTestId("city-achievement");
    expect(note.textContent).toContain(rowFor("first-mastery").earned);
    await waitFor(() =>
      expect(loadEarnedAchievements()).toEqual(new Set(["first-mastery"])),
    );
  });
});

describe("CitySurface: the list", () => {
  it("opens from the ☰ Menu, beside the other reference panels, and closes back to it", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} reducedMotion loadCity={loadWith()} />);
    await ready();

    await user.click(screen.getByRole("button", { name: "Menu" }));
    // It is a sibling of the reference rows, not a replacement for any of them. It read
    // `menu-timeline` and `menu-album` too until the 2026-08-04 cut took both; How to play
    // is what is left, and it is still worth asserting, because "the panel opens" would
    // pass just as well over a menu this had quietly become the only entry in.
    for (const testId of ["menu-how-to-play"]) {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    }
    await user.click(screen.getByTestId("menu-achievements"));

    const card = await screen.findByTestId("achievements-panel");
    expect(card.getAttribute("aria-modal")).toBe("true");
    // Every row is on it, and a new city's rows are all invitations.
    for (const achievement of ACHIEVEMENTS) {
      expect(card.textContent).toContain(achievement.toEarn);
    }

    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByTestId("achievements-panel")).toBeNull());
    // Focus is back on the button the card was opened from, as the other panels do.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Menu" }));
  });

  it("shows a mix once the city has earned one", async () => {
    setCityEra(eraIdAt(2));
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} reducedMotion loadCity={loadWith()} />);
    await ready();
    await screen.findByTestId("city-achievement");

    const card = await openAchievements(user);
    const earned = card.querySelector<HTMLElement>('[data-achievement="first-age"]');
    expect(earned?.dataset.earned).toBe("true");
    expect(earned?.textContent).toContain(rowFor("first-age").earned);

    const unearned = card.querySelector<HTMLElement>(
      '[data-achievement="learning-through-ruin"]',
    );
    expect(unearned?.dataset.earned).toBe("false");
    expect(unearned?.textContent).toContain(rowFor("learning-through-ruin").toEarn);
  });
});

describe("CitySurface: the dev hatch", () => {
  it("never reaches the card a real learner is served", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} reducedMotion loadCity={loadWith()} />);
    await ready();

    const card = await openAchievements(user);
    expect(card.querySelector('[data-testid="ach-dev"]')).toBeNull();
    expect(screen.queryByText(/Dev only/i)).toBeNull();
    // The card really rendered, so the absence is an absence.
    expect(card.textContent).toContain(ACHIEVEMENTS[0]?.toEarn);
  });

  it("fires the real path, closes the card, and shows the moment over the island", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} reducedMotion loadCity={loadWith()} />);
    await ready();

    await openAchievements(user);
    await user.click(screen.getByTestId("ach-dev-fire-learning-through-ruin"));

    // THE CARD GETS OUT OF THE WAY, which is the whole reason the host owns the close: the
    // moment renders over the island and the card is a modal on top of it.
    await waitFor(() => expect(screen.queryByTestId("achievements-panel")).toBeNull());
    const note = await screen.findByTestId("city-achievement");
    expect(note.textContent).toContain(rowFor("learning-through-ruin").earned);
    // The REAL key, so what a reviewer photographs is the shipped record.
    expect(localStorage.getItem(achievementKey("learning-through-ruin"))).toBe("true");

    // And it survives being read back, which the list then shows as earned.
    const reopened = await openAchievements(user);
    expect(
      reopened.querySelector<HTMLElement>('[data-achievement="learning-through-ruin"]')
        ?.dataset.earned,
    ).toBe("true");
  });

  /**
   * **FORGETTING RESTORES WHAT THE CITY CAN STILL DERIVE, AND ONLY UN-EARNS THE REST.**
   *
   * Worth pinning because it is the one behaviour of this control that surprises: the
   * earning pass is a read over live state, so a row the city genuinely satisfies is earned
   * again on the very next tick and its moment plays a second time. That is a record layer
   * behaving correctly rather than a reset that failed, and it is exactly what a reviewer
   * wants from the button — the moment, again, on demand. A row the city does NOT satisfy
   * stays forgotten, which is what makes the reset a reset.
   */
  it("forgets every one without closing the card, and re-derives what is still true", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    setCityEra(eraIdAt(2));
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} reducedMotion loadCity={loadWith()} />);
    await ready();
    // The era row arrives off the city's own state; this one is fired, so the city has no
    // way to derive it back.
    await screen.findByTestId("city-achievement");
    await openAchievements(user);
    await user.click(screen.getByTestId("ach-dev-fire-learning-through-ruin"));
    await waitFor(() => expect(screen.queryByTestId("achievements-panel")).toBeNull());

    const card = await openAchievements(user);
    for (const id of ["first-age", "learning-through-ruin"]) {
      expect(
        card.querySelector<HTMLElement>(`[data-achievement="${id}"]`)?.dataset.earned,
        id,
      ).toBe("true");
    }

    await user.click(screen.getByTestId("ach-dev-forget"));
    // Still open, because what the press exists to show is this list going back.
    expect(screen.getByTestId("achievements-panel")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen
          .getByTestId("achievements-panel")
          .querySelector<HTMLElement>('[data-achievement="learning-through-ruin"]')?.dataset
          .earned,
      ).toBe("false"),
    );
    expect(localStorage.getItem(achievementKey("learning-through-ruin"))).toBeNull();
    // And the era row comes straight back, because the city is still standing in its second
    // age and the record is a read.
    await waitFor(() =>
      expect(localStorage.getItem(achievementKey("first-age"))).toBe("true"),
    );
  });
});
