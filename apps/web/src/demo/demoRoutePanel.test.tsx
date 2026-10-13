import { ERA_SEQUENCE, eraNumber } from "@cr/skill-graph";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isServerBacked } from "../api";
import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import { DemoRoutePanel } from "./DemoRoutePanel";
import { DEMO_CRISES, requestedEra } from "./demoRoutes";

/**
 * **THE DEMO CONSOLE: THE GATE WORKS, EVERY ROW IS AN ADDRESS, AND NOTHING IS WRITTEN.**
 *
 * *"It is behind a gate"* and *"the gate works"* are two claims, and this file is the second.
 * Every mounted assertion drives the REAL ENVIRONMENT — `vi.stubEnv` on
 * `VITE_DIAGNOSTIC_API_URL`, the read Vite inlines at build time — because there is no other
 * way in: the component takes no props at all and reads the gate at render.
 * `test/demoRoutePanelStaysDev.test.ts` is the sweep that keeps it propless.
 *
 * The behaviours worth testing here rather than in `demoRoutes.test.ts` are the ones that are
 * only true of the RENDERED panel: that ten eras and four crises are actually on screen, that
 * each one's `href` is the address its pure builder produced, and that a press of every single
 * one of them leaves `localStorage` byte-identical — which is the property the ceremony skip
 * holds and which a console that seeded a session to reach an era would quietly break.
 */

/** What `docs/Deployment.md` bakes into the shipped SPA. */
const DEPLOYED_API = "https://calc-readiness.example/api/diagnostic";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.unstubAllEnvs();
  window.history.replaceState(null, "", "/");
});

describe("the gate this console hangs on", () => {
  /**
   * THE PREMISE, measured rather than assumed. Without it, "the console is absent" and "the
   * environment stub did nothing" are indistinguishable.
   */
  it("is off on a deployed build and on in a local one", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    expect(isServerBacked(true)).toBe(true);
    expect(isDevPersistenceEnabled()).toBe(false);

    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    expect(isServerBacked(true)).toBe(false);
    expect(isDevPersistenceEnabled()).toBe(true);
  });

  /**
   * BOTH DIRECTIONS, and the pair is the point. "Absent when the endpoint is configured" passes
   * trivially for a component that was deleted, never mounted or renamed; "present when it is
   * not" is what rules all three out.
   */
  it("is absent with an API endpoint configured, and present without one", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    const deployed = render(<DemoRoutePanel />);
    expect(
      deployed.queryByTestId("demo-route-panel"),
      "the demo console is on the build a real learner is served",
    ).toBeNull();
    deployed.unmount();

    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    const local = render(<DemoRoutePanel />);
    expect(
      local.queryByTestId("demo-route-panel"),
      "the console is missing from a local build, so the case above proves nothing",
    ).not.toBeNull();
  });

  it("leaves Presenter mode to the real city Menu in an explicit frontend-only demo", () => {
    vi.stubEnv("VITE_DEMO_MODE", "true");
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    window.history.replaceState(null, "", "/demo");
    render(<DemoRoutePanel />);

    expect(screen.queryByTestId("demo-route-panel")).toBeNull();
    expect(screen.queryByRole("link", { name: /Presenter/i })).toBeNull();
    expect(screen.queryByText(/Dev only/i)).toBeNull();
    expect(screen.queryByTestId("demo-route-crisis-winter")).toBeNull();
    expect(screen.queryByRole("button", { name: "Explore features" })).toBeNull();
    expect(screen.queryByText(/Play the beats/i)).toBeNull();
  });

  /** Every handle it could be found by, because a control renamed out of one is still shipped. */
  it("leaves no trace of itself on a deployed build", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    render(<DemoRoutePanel />);
    expect(screen.queryByText(/Demo route/i)).toBeNull();
    expect(screen.queryByText(/Dev only/i)).toBeNull();
    expect(document.querySelector("[data-testid^='demo-route-']")).toBeNull();
  });
});

describe("what is on it", () => {
  /**
   * **ERA FOUR BY NAME.** The lead asked for era four's Succession forum, so the two rows that
   * answer him are asserted as instances and not as members of a swept class.
   */
  it("offers era four and the Succession, each pointing at the address App answers", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    render(<DemoRoutePanel />);

    const four = screen.getByTestId("demo-route-era-classical");
    expect(eraNumber("classical")).toBe(4);
    expect(four).toHaveTextContent("4");
    expect(requestedEra(new URL(four.getAttribute("href") ?? "").search)).toBe("classical");

    const succession = screen.getByTestId("demo-route-crisis-succession");
    expect(succession).toHaveTextContent("The Succession");
    expect(succession).toHaveTextContent("era 4");
    expect(
      new URL(succession.getAttribute("href") ?? "").searchParams.has("succession"),
    ).toBe(true);
  });

  /** Every era and every crisis, derived so a new one joins the console by existing. */
  it("puts every era and every crisis on screen", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    render(<DemoRoutePanel />);
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    for (const era of ERA_SEQUENCE) {
      const rung = screen.getByTestId(`demo-route-era-${era.id}`);
      expect(rung.getAttribute("aria-label")).toContain(era.name);
      expect(requestedEra(new URL(rung.getAttribute("href") ?? "").search)).toBe(era.id);
    }
    expect(DEMO_CRISES.length).toBeGreaterThanOrEqual(4);
    for (const crisis of DEMO_CRISES) {
      const row = screen.getByTestId(`demo-route-crisis-${crisis.param}`);
      expect(row).toHaveTextContent(crisis.label);
      expect(new URL(row.getAttribute("href") ?? "").searchParams.has(crisis.param)).toBe(
        true,
      );
    }
  });

  it("names only the release presenter controls", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    render(<DemoRoutePanel />);
    const note = screen.getByTestId("demo-route-note");
    expect(note).toHaveTextContent(
      "unlock and build era, lesson, practice, AI work, reset",
    );
    expect(note).not.toHaveTextContent("Advance age");
    expect(note).not.toHaveTextContent("Complete age");
    expect(note).not.toHaveTextContent("Play the beats");
  });

  /** The era the address bar is already asking for is marked, so a press reads back. */
  it("marks the era the address bar has queued, and only that one", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    window.history.replaceState(null, "", "/?era=classical");
    render(<DemoRoutePanel />);
    const queued = ERA_SEQUENCE.filter(
      (era) =>
        screen.getByTestId(`demo-route-era-${era.id}`).getAttribute("data-queued") ===
        "true",
    );
    expect(queued.map((era) => era.id)).toEqual(["classical"]);
    expect(screen.getByText(/Queued: era 4/)).toBeInTheDocument();
  });

  /** Folded away to a chip, so the title card can be photographed without it. */
  it("folds to its header and comes back", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    render(<DemoRoutePanel />);
    expect(screen.getByTestId("demo-route-era-classical")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("demo-route-fold"));
    expect(screen.queryByTestId("demo-route-era-classical")).toBeNull();
    expect(screen.getByTestId("demo-route-panel")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("demo-route-fold"));
    expect(screen.getByTestId("demo-route-era-classical")).toBeInTheDocument();
  });
});

describe("what it does NOT do", () => {
  /**
   * **IT WRITES NOTHING, AND THE WHOLE STORE IS THE SUBJECT.** This is the property
   * the presenter skip holds and the one a console could most easily break: reaching era four by
   * seeding a session would put mastery on the model that no learner earned. Every rung is an
   * `href`, so a press navigates and stores nothing.
   *
   * Every key is read back rather than the ones this feature might use, on
   * `winterDevSkipGrantsNoEvidence`'s precedent: a control that wrote mastery, a session or a
   * streak under some other key would pass a check scoped to the key somebody remembered.
   */
  it("leaves the whole of localStorage byte-identical across a press of every rung", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    localStorage.setItem("cr.unrelated", "kept");
    const before = JSON.stringify({ ...localStorage });

    render(<DemoRoutePanel />);
    // The press is real and reaches the element; only jsdom's own navigation is stopped, at the
    // document in the BUBBLE phase — so every handler this component attached has already run by
    // the time the default is prevented, and there are none. What is being measured is that a
    // press writes nothing.
    const stopNavigation = (event: Event) => event.preventDefault();
    document.addEventListener("click", stopNavigation);
    try {
      for (const era of ERA_SEQUENCE) {
        fireEvent.click(screen.getByTestId(`demo-route-era-${era.id}`));
      }
      for (const crisis of DEMO_CRISES) {
        fireEvent.click(screen.getByTestId(`demo-route-crisis-${crisis.param}`));
      }
      fireEvent.click(screen.getByTestId("demo-route-fold"));
    } finally {
      document.removeEventListener("click", stopNavigation);
    }

    expect(JSON.parse(JSON.stringify({ ...localStorage }))).toEqual(JSON.parse(before));
  });

  /**
   * **NO STYLESHEET, AND THE REASON IS AN ARTEFACT RATHER THAN TIDINESS.** `DevEraSkip.tsx` and
   * `CatchUpDevSkip.tsx` both record it: Vite emits an imported stylesheet as an asset whether
   * or not the importing module survives tree-shaking, so a dev-only `.css` ships to production
   * even when its component does not.
   */
  it("imports no stylesheet, so nothing of it can reach a production build's CSS", () => {
    const sources = import.meta.glob("./*.{ts,tsx}", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;
    const panel = sources["./DemoRoutePanel.tsx"];
    expect(panel, "DemoRoutePanel.tsx was not found by the glob").toBeTruthy();
    expect(panel).not.toMatch(/import\s+["'][^"']+\.css["']/);
    expect(panel).not.toMatch(/from\s+["'][^"']+\.css["']/);
  });
});
