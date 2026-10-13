import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isSuccessionEntry,
  SuccessionEntryChip,
  successionCityHref,
  successionHref,
} from "./SuccessionEntryChip";
import { SuccessionSurface } from "./SuccessionSurface";
import { successionBriefing } from "./successionBriefing";
import { successionScenario } from "./successionScenarios";

afterEach(cleanup);

describe("the production civil-war surface", () => {
  it("opens with one threat, short rules, and no forbidden learner vocabulary", async () => {
    render(
      <SuccessionSurface
        enableCanvas={false}
        initial={successionScenario("announcement").build()}
      />,
    );
    await screen.findByTestId("sx-ready");

    expect(screen.getByTestId("sx-threat").textContent).toContain(
      "After the next three-question batch",
    );
    expect(screen.getByTestId("sx-threat").textContent).toContain("the rival will claim");
    expect(screen.getByTestId("sx-answer-batch").textContent).toBe("Answer 3 questions");
    expect(document.body.textContent?.toLowerCase()).not.toContain("plinth");
    expect(document.body.textContent?.toLowerCase()).not.toContain("cycle turns");
  });

  it("presents exactly two meaningful actions, then an inert proposal and a committed result", async () => {
    render(
      <SuccessionSurface
        enableCanvas={false}
        initial={successionScenario("correct-consequence").build()}
      />,
    );
    const actions = await screen.findByTestId("sx-actions");
    expect(actions.getAttribute("data-choice")).toBe("true");
    expect(screen.getAllByTestId(/^sx-action-/)).toHaveLength(2);

    const target = screen.getByTestId("sx-threat").getAttribute("data-district");
    expect(target).toBeTruthy();
    expect(screen.getByTestId(`sx-district-${target}`).getAttribute("data-control")).toBe(
      "undecided",
    );

    fireEvent.click(screen.getByTestId("sx-action-rally"));
    await screen.findByTestId("sx-proposal");
    expect(screen.getByTestId("sx-proposal")).toHaveTextContent("Rally");
    expect(screen.getByTestId("sx-proposal")).toHaveTextContent(
      "Raise your standing statue",
    );
    expect(screen.getByTestId(`sx-district-${target}`).getAttribute("data-control")).toBe(
      "undecided",
    );

    fireEvent.click(screen.getByTestId("sx-commit-action"));
    await waitFor(() =>
      expect(screen.getByTestId(`sx-district-${target}`).getAttribute("data-control")).toBe(
        "player",
      ),
    );
    expect(
      screen.queryByTestId("sx-actions"),
      "the same answer batch still offers a second civic action",
    ).toBeNull();
    const beat = await screen.findByTestId("sx-city-beat");
    expect(beat).toHaveAttribute("role", "status");
    expect(beat).toHaveAttribute("data-kind", "rally");
    expect(beat).toHaveTextContent("Your assembly");
  });

  it("does not dress one legal response as a choice", async () => {
    render(
      <SuccessionSurface
        enableCanvas={false}
        initial={successionScenario("incorrect-consequence").build()}
      />,
    );
    await screen.findByTestId("sx-response");
    expect(screen.queryByTestId("sx-actions")).toBeNull();
    expect(screen.getByTestId("sx-no-response")).toHaveTextContent(
      "Your 0 influence stays banked. Responses cost at least 1 influence.",
    );
    expect(screen.getByTestId("sx-finish-response")).toBeVisible();
  });

  it("keeps the old-ruler proclamation in one Oru lead only", () => {
    const briefing = successionBriefing();
    const allCopy = [
      briefing.lead,
      briefing.closing,
      ...briefing.slides.flatMap((slide) => slide.terms.map((term) => term.text)),
    ].join(" ");
    expect(allCopy.match(/old ruler/gi)).toHaveLength(1);
    expect(briefing.slides).toHaveLength(2);
    expect(briefing.slides.flatMap((slide) => slide.terms)).toHaveLength(2);
  });
});

/**
 * Every non-test source in the web app, as text, for the reachability sweep below.
 *
 * `import.meta.glob` with `?raw` rather than `node:fs`, which is the house style for a source
 * read in this lane and not a preference: the web project has no node types, so a
 * `readFileSync` version does not typecheck.
 */
const WEB_SOURCES = import.meta.glob(["../**/*.{ts,tsx}", "!../**/*.test.{ts,tsx}"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("the Succession is additive, and stays off every other route", () => {
  it("routes the canonical parameter into the live city and keeps the forum dev-only", () => {
    const registry = WEB_SOURCES["../crisisPreviewRoutes.ts"];
    expect(registry, "the sweep did not reach the route registry").toBeTruthy();
    expect(registry).toMatch(/param:\s*SUCCESSION_PARAM,[\s\S]*?destination:\s*"city"/);
    expect(registry).not.toContain("SuccessionRoute");

    const app = WEB_SOURCES["../App.tsx"] ?? "";
    expect(app).toContain("requestedCrisisPreview(window.location.search)");
    expect(app).toContain("isSuccessionRouteRequest(requestedCrisis");
    expect(app).not.toContain(
      'const successionRequested = requestedPreview?.destination === "city"',
    );
    expect(app).toContain(
      "autoOpenSuccession={crisisCapability.enabled && successionRequested}",
    );
    expect(app).toContain(
      "const requestedPreview = crisisCapability.enabled ? requestedCrisis : null",
    );
    expect(app).toContain('has("succession-fixture")');

    const fixture =
      Object.entries(WEB_SOURCES).find(([path]) =>
        path.endsWith("/SuccessionFixtureRoute.tsx"),
      )?.[1] ?? "";
    expect(fixture).toContain("Authored forum fixture");
    expect(fixture).toContain("isDevPersistenceEnabled");
  });

  it("hides its own door on a build a learner can reach", () => {
    // The chip is the only thing that links to the parameter, and it renders nothing at all
    // when the browser talks to the account service — the product's own definition of a real
    // learner. So on the deployed build there is no door, not merely a door nobody presses.
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "https://accounts.example.test");
    const { container } = render(<SuccessionEntryChip />);
    expect(container.querySelector('[data-testid="sx-entry-chip"]')).toBeNull();
    vi.unstubAllEnvs();
  });
});

describe("the entry chip's route", () => {
  it("asks for exactly this crisis and drops any other entry parameter", () => {
    expect(isSuccessionEntry("?succession")).toBe(true);
    expect(isSuccessionEntry("?winter")).toBe(false);
    // Two crises cannot be asked for at once: whichever branch `App` checked first would win,
    // and it would look like the chip opening the wrong one.
    const href = successionHref("https://example.test/?winter&dev");
    expect(isSuccessionEntry(new URL(href).search)).toBe(true);
    expect(new URL(href).searchParams.has("winter")).toBe(false);
    expect(new URL(href).searchParams.has("dev")).toBe(true);
  });

  it("returns to the same city without keeping the crisis route", () => {
    const href = successionCityHref("https://example.test/?mock&succession&era=4");
    const returned = new URL(href);
    expect(returned.searchParams.has("succession")).toBe(false);
    expect(returned.searchParams.has("mock")).toBe(true);
    expect(returned.searchParams.get("era")).toBe("4");
  });
});
