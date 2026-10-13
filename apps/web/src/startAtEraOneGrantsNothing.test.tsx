import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

/**
 * **STARTING AT ERA 1 IS AN ENTRY, NOT AN AWARD.**
 *
 * The start choice offers Era 1 so a demo can be in the city in one press. That convenience
 * is only honest while the press grants nothing: a learner who skipped the diagnostic has had
 * NOTHING measured about them, so a city that opened with skills marked mastered, buildings
 * standing, or later content unlocked would be recording a placement nobody sat.
 *
 * ## WHAT THE DEFECT WOULD LOOK LIKE, and therefore what is read
 *
 * The diagnostic's hand-off is `session.seedFromPlacement(placement, unlocked)`: it writes
 * mastery and completion onto node states and PRE-BUILDS the passed ones. So a regression that
 * ran that path (or seeded the mock city) on the Era 1 press shows up in two places at once,
 * and both are asserted:
 *
 *  - the island has something standing on it, which the headless island stand-in reports per
 *    plot as anything other than `empty`;
 *  - the Build menu marks a card `Built`, which is the state a card is in only when its
 *    building is already on the island.
 *
 * Each has a floor under it, because "no plot is occupied" and "no card is built" are both
 * satisfied by a city that rendered nothing at all.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

vi.mock("./diagnostic/DiagnosticSurface", () => ({
  DiagnosticSurface: () => <div data-testid="diagnostic-stub" />,
}));

describe("entering at Era 1", () => {
  it("puts nothing on the island and marks nothing built", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Start at Era 1" }));
    await screen.findByRole("button", { name: "Build" });

    // The tour opens over a first-run city; leaving it is one press, and the city under it
    // is the subject here.
    await user.click(await screen.findByTestId("onboarding-advisor-skip"));

    const plots = Array.from(document.querySelectorAll<HTMLElement>(".city-backdrop-plot"));
    expect(
      plots.length,
      "the island drew no plots, so the occupancy assertion below measures nothing",
    ).toBeGreaterThan(0);
    const occupied = plots
      .filter((plot) => plot.dataset.state !== "empty")
      .map((plot) => `${plot.textContent?.trim()}: ${plot.dataset.state}`);
    expect(
      occupied,
      "Era 1 entry put buildings on the island before the learner placed one",
    ).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Build" }));
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(".build-card[data-node-id]"),
    );
    expect(
      cards.length,
      "the Build menu offered no buildings, so the built assertion below measures nothing",
    ).toBeGreaterThan(0);
    const built = cards
      .filter((card) => card.dataset.built === "true")
      .map((card) => card.dataset.nodeId ?? "unnamed");
    expect(
      built,
      "Era 1 entry marked skills as already built without the learner demonstrating anything",
    ).toEqual([]);

    // ...and no test-out celebration, which is the surface that would be announcing it.
    expect(screen.queryByText(/you.{0,3}ve unlocked/i)).toBeNull();
  });
});
