import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../App";
import { CitySurface } from "../city/CitySurface";
import { MOCK_NODE_STATES } from "../city/mockCity";
import type { CityLoad } from "../city/types";
import { ARCHIPELAGO_QUERY_PARAM, isArchipelagoEnabled } from "./archipelagoFlag";

/**
 * **WHAT A LEARNER SEES WITH THE FLAG OFF: nothing, and this is what says so.**
 *
 * There is a product demo on Friday. `docs/Demo_Era_Progression_Runbook.md` is *"measured on
 * a real `npm run dev`"* and opens on `http://localhost:5173/?reset`, which means **both of
 * this repo's existing dev gates are TRUE on the demo path** — `import.meta.env.DEV` under
 * `vite dev`, and `isDevPersistenceEnabled()` with no diagnostic endpoint set. A new menu row
 * behind either of them would be on stage.
 *
 * So the gate needs a third condition that is only ever satisfied because somebody typed it,
 * and this file measures the three states that matter:
 *
 *  1. **A learner's build.** `DEV` is the literal `false` after `vite build`, so the branch
 *     is dead code whatever is on the address bar.
 *  2. **The demo's own URL.** `?reset` on a dev server does not carry `?bay`, so the row is
 *     absent and the panel is unmountable.
 *  3. **A developer who asks.** `?bay` on a dev server opens it, which is the answer that has
 *     to be reachable or the gate is untested in the direction that matters.
 *
 * The menu assertion is the one that is about the demo rather than about a predicate: it
 * mounts the real `CitySurface` and reads the real ☰ Menu, so "no learner sees this" is a
 * measurement of the surface rather than a promise in a docblock.
 */

const REAL_SEARCH = window.location.search;
const REAL_PATH = window.location.pathname;

function setSearch(search: string): void {
  window.history.replaceState({}, "", `${window.location.pathname}${search}`);
}

beforeEach(() => {
  setSearch("");
});

afterEach(() => {
  vi.unstubAllEnvs();
  window.history.replaceState({}, "", `${REAL_PATH}${REAL_SEARCH}`);
});

describe("the gate", () => {
  it("is shut in a built bundle, whatever is on the address bar", () => {
    for (const search of ["", "?bay", "?reset&bay", `?${ARCHIPELAGO_QUERY_PARAM}=1`]) {
      expect(isArchipelagoEnabled({ DEV: false }, search)).toBe(false);
    }
  });

  it("opens in an explicit production demo without relying on a query parameter", () => {
    expect(isArchipelagoEnabled({ DEV: false, VITE_DEMO_MODE: "true" }, "", "/demo")).toBe(
      true,
    );
    expect(isArchipelagoEnabled({ DEV: false, VITE_DEMO_MODE: "true" }, "", "/")).toBe(
      false,
    );
    expect(isArchipelagoEnabled({ DEV: false, VITE_DEMO_MODE: "false" }, "?bay")).toBe(
      false,
    );
  });

  it("is shut on the demo's own address, on a dev server", () => {
    // The runbook's URL, plus the neighbours a presenter might have on it.
    for (const search of ["", "?reset", "?mock", "?mock&mastered", "?era=neolithic"]) {
      expect(isArchipelagoEnabled({ DEV: true }, search)).toBe(false);
    }
  });

  it("opens for a developer who asks for it, in both of the parameter's forms", () => {
    expect(isArchipelagoEnabled({ DEV: true }, "?bay")).toBe(true);
    expect(isArchipelagoEnabled({ DEV: true }, "?reset&bay")).toBe(true);
    expect(isArchipelagoEnabled({ DEV: true }, "?bay=1")).toBe(true);
  });

  it("is shut where there is no address bar at all", () => {
    expect(isArchipelagoEnabled({ DEV: true }, undefined)).toBe(false);
  });
});

describe("the city a learner is given", () => {
  /**
   * The surface with nothing on the address bar, which is what the suite's own environment
   * gives it — and, for the branch that matters most, what a built bundle gives it too.
   * `CitySurface.timeline.test.tsx`'s own harness, so the menu is opened the way a learner
   * opens it rather than through a test id the ☰ button does not carry.
   */
  function mountCity() {
    const loadCity = (): Promise<CityLoad> =>
      Promise.resolve({ node_states: MOCK_NODE_STATES, placements: [] });
    return render(<CitySurface enableCanvas={false} loadCity={loadCity} />);
  }

  it("has no bay row in the ☰ Menu", async () => {
    const user = userEvent.setup();
    mountCity();
    await screen.findByRole("button", { name: "Build" });
    await user.click(screen.getByRole("button", { name: "Menu" }));

    // The rows that DO ship, so a failure to open the menu at all cannot pass this.
    //
    // ⚑ These were `menu-timeline` and `menu-album` when this guard was written on #575's
    // branch, and BOTH were deleted from the menu by the 2026-08-04 ruling before that branch
    // could land — the one whose reason `CitySurface.tsx` records beside the Achievements row:
    // *"the archipelago's overview screen answers 'where is this going' off the same inputs
    // the Timeline read, and its revisitable island answers 'what did I build' by being the
    // place rather than a picture of it."* Left pointing at them the guard did not go quiet,
    // it went RED, which is the good failure mode and is how it was caught. Repointed at the
    // two rows the menu actually has, so the floor under the null check is a live one.
    expect(screen.getByTestId("menu-how-to-play")).toBeTruthy();
    expect(screen.getByTestId("menu-achievements")).toBeTruthy();
    expect(screen.queryByTestId("menu-bay")).toBeNull();
  });

  it("mounts no overview and no island card", async () => {
    mountCity();
    await screen.findByRole("button", { name: "Build" });
    expect(screen.queryByTestId("archipelago-overview")).toBeNull();
    expect(screen.queryByTestId("archipelago-bay")).toBeNull();
    expect(screen.queryByTestId("island-card")).toBeNull();
  });

  /**
   * **THE OTHER DIRECTION, which is what stops the assertions above from holding vacuously.**
   * A row that had simply never been wired would satisfy all of them, so the flag's true
   * answer is driven through the real surface: with `?bay` on the address bar the row appears
   * and opens the real overview.
   *
   * `import.meta.env.DEV` is true under Vitest, which is why the gate deliberately does NOT
   * exclude `MODE === "test"` the way `isDevServerResetEnabled` does — see `archipelagoFlag.ts`.
   */
  it("opens the bay when a developer puts ?bay on the address bar", async () => {
    setSearch(`?${ARCHIPELAGO_QUERY_PARAM}`);
    const user = userEvent.setup();
    mountCity();
    await screen.findByRole("button", { name: "Build" });
    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByTestId("menu-bay"));

    // The overview imports the complete 3D island renderer; give constrained local shards
    // enough time to settle that real boundary instead of depending on the 1s DOM default.
    const overview = await screen.findByTestId(
      "archipelago-overview",
      {},
      { timeout: 20_000 },
    );
    expect(overview.getAttribute("role")).toBe("dialog");
    expect(screen.getByTestId("archipelago-hero-renderer")).toBeTruthy();
  });

  it("keeps the capability-qualified bay available in frontend-only demo mode", async () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");
    vi.stubEnv("VITE_ARCHIPELAGO_MODE", "bay");
    window.history.replaceState(null, "", "/demo");
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Start at Era 1" }));
    await user.click(await screen.findByRole("button", { name: "Menu" }));
    expect(await screen.findByTestId("menu-bay", {}, { timeout: 20_000 })).toBeTruthy();
  });
});
