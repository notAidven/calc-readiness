import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";
import type { CityLoad } from "./types";

/**
 * **THE CITY IS A DOCUMENT BEFORE IT IS A GAME, AND IT HAD NONE OF A DOCUMENT'S FURNITURE.**
 *
 * Measured on the ordinary learner mount at `b7bdc6d2`, at all seven windows this branch tests:
 * `main` landmarks = 0, `h1` count = 0, links = none. So a screen-reader learner arriving in
 * their city had no landmark to jump to, no heading to say where they were, and a keyboard
 * learner had to tab the whole HUD to reach the map.
 *
 * ## Why the h1 is visually hidden and that is not a cop-out
 *
 * The city's name is *drawn*, in a 3D scene that is `aria-hidden` by construction (D-ERA9 /
 * D-CIT13: the canvas carries no meaning, the DOM does). There is no visible text that is the
 * page's title and inventing one would put a banner over an island for no reader's benefit. What
 * the heading owes is that it names the same island the surface is standing on, so it is derived
 * from the standing era rather than written out.
 *
 * ## Why the skip link points at the map and not at the HUD
 *
 * The map is the thing a learner came for and the thing furthest down the tab order — the HUD's
 * chips, the City Life panel and the Menu all sit ahead of it. The link is the first focusable
 * element in the surface, which is the only position that makes it a skip rather than a stop.
 */

function emptyLoad(): Promise<CityLoad> {
  return createCityDevSession().load();
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

async function mountCity(): Promise<void> {
  render(
    <div className="city-shell">
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo={false}
        loadCity={emptyLoad}
        reducedMotion
      />
    </div>,
  );
  await waitFor(() => expect(screen.queryByTestId("city-loading")).toBeNull());
  await screen.findByRole("button", { name: "Build" });
}

describe("the city carries the landmark, heading and skip link a document owes", () => {
  it("exposes exactly one main landmark holding the map", async () => {
    await mountCity();

    const landmarks = document.querySelectorAll("main");
    expect(
      landmarks.length,
      `the city drew ${landmarks.length} main landmarks; a learner needs exactly one to jump to`,
    ).toBe(1);
    const main = landmarks[0] as HTMLElement;
    expect(main.id, "the main landmark has no id, so nothing can link to it").not.toBe("");
    expect(
      main.querySelector('[data-testid="city-viewport"]'),
      "the main landmark does not contain the map, so skipping to it skips past the city",
    ).not.toBeNull();
  });

  it("names the island in one h1, at the top level and nowhere else", async () => {
    await mountCity();

    const headings = [...document.querySelectorAll<HTMLElement>("h1")];
    expect(headings.length, `the city drew ${headings.length} level-one headings`).toBe(1);
    const heading = headings[0] as HTMLElement;
    // The canvas is aria-hidden, so the heading is the only thing that can say where this is.
    expect((heading.textContent ?? "").trim().length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { level: 1 }),
      "the heading is not exposed as a heading",
    ).toBe(heading);
    // No level is skipped between it and the panels' own headings.
    const levels = [
      ...document.querySelectorAll<HTMLElement>(
        ".city-surface h1, .city-surface h2, .city-surface h3",
      ),
    ].map((node) => Number(node.tagName.slice(1)));
    expect(levels[0], "the first heading in the city is not the h1").toBe(1);
    expect(
      levels.filter((level, index) => index > 0 && level - (levels[index - 1] ?? 1) > 1),
      "the city skips a heading level",
    ).toEqual([]);
  });

  it("puts a skip link first in the tab order and lands focus in the map", async () => {
    await mountCity();
    const user = userEvent.setup();

    const surface = document.querySelector<HTMLElement>(".city-surface");
    if (surface === null) {
      throw new Error("the city surface did not mount");
    }
    const focusable = [
      ...surface.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ];
    expect(focusable.length).toBeGreaterThan(3);
    const first = focusable[0] as HTMLElement;
    expect(
      first.tagName.toLowerCase(),
      `the first stop in the city's tab order is ${first.tagName.toLowerCase()} "${(first.textContent ?? "").trim()}", not a skip link`,
    ).toBe("a");

    const link = first as HTMLAnchorElement;
    const target = document.querySelector<HTMLElement>(link.getAttribute("href") as string);
    expect(
      target,
      `the skip link points at ${link.getAttribute("href")}, which is absent`,
    ).not.toBeNull();
    expect((target as HTMLElement).tagName.toLowerCase()).toBe("main");

    await user.tab();
    expect(link, "the first Tab does not reach the skip link").toHaveFocus();
    await user.click(link);
    const viewport = document.querySelector<HTMLElement>('[data-testid="city-viewport"]');
    expect(viewport, "the city drew no map to skip to").not.toBeNull();
    expect(
      document.activeElement,
      "following the skip link left focus outside the map",
    ).toBe(viewport);
  });
});
