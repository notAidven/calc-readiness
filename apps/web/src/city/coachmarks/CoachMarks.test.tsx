import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RefObject } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_ERA_ID } from "../eraState";
import { CoachMarks } from "./CoachMarks";
import { clearCoachAnchors, setCoachAnchor } from "./coachAnchorRegistry";
import {
  COACH_MARKS,
  COACH_SKIP_ALL_KEY,
  type CoachAnchor,
  type CoachState,
  coachMarkKey,
} from "./coachMarksCore";

/** Anchor refs backed by (detached) elements; `callout` is optional/absent. */
function makeAnchors(
  withCallout = false,
): Partial<Record<CoachAnchor, RefObject<HTMLElement | null>>> {
  return {
    build: { current: document.createElement("button") },
    buildings: { current: document.createElement("button") },
    viewport: { current: document.createElement("div") },
    callout: { current: withCallout ? document.createElement("div") : null },
  };
}

function state(over: Partial<CoachState> = {}): CoachState {
  return {
    placedCount: 0,
    anyLessonStarted: false,
    anyInConstruction: false,
    anyComplete: false,
    allComplete: false,
    anyTestedOut: false,
    gold: 0,
    roadTileCount: 0,
    interleavedEligible: false,
    musicOn: false,
    ...over,
  };
}

describe("CoachMarks controller", () => {
  beforeEach(() => {
    localStorage.clear();
    clearCoachAnchors();
  });

  it("shows the state-triggered hint anchored to the right element", () => {
    const { rerender } = render(
      <CoachMarks
        active
        eraId={DEFAULT_ERA_ID}
        reducedMotion={false}
        state={state()}
        anchors={makeAnchors()}
      />,
    );

    // Empty island → 'place', anchored to the Build button.
    const place = screen.getByTestId("coach-mark-place");
    expect(place).toHaveTextContent(/drag a building/i);
    expect(place).toHaveAttribute("data-anchor", "build");

    // Placed, no lesson yet → 'learn', anchored to the viewport (the map).
    rerender(
      <CoachMarks
        eraId={DEFAULT_ERA_ID}
        active
        reducedMotion={false}
        state={state({ placedCount: 1 })}
        anchors={makeAnchors()}
      />,
    );
    const learn = screen.getByTestId("coach-mark-learn");
    expect(learn).toHaveAttribute("data-anchor", "viewport");
  });

  it("falls back to the viewport anchor when the callout isn't open", () => {
    const constructing = state({
      placedCount: 1,
      anyLessonStarted: true,
      anyInConstruction: true,
    });

    const { rerender } = render(
      <CoachMarks
        eraId={DEFAULT_ERA_ID}
        active
        reducedMotion={false}
        state={constructing}
        anchors={makeAnchors(false)}
      />,
    );
    // No callout mounted → 'build' falls back to the viewport.
    expect(screen.getByTestId("coach-mark-build")).toHaveAttribute(
      "data-anchor",
      "viewport",
    );

    // Callout open → 'build' prefers the callout anchor.
    rerender(
      <CoachMarks
        eraId={DEFAULT_ERA_ID}
        active
        reducedMotion={false}
        state={constructing}
        anchors={makeAnchors(true)}
      />,
    );
    expect(screen.getByTestId("coach-mark-build")).toHaveAttribute(
      "data-anchor",
      "callout",
    );
  });

  it("shows nothing while inactive (during the reel / an overlay)", () => {
    render(
      <CoachMarks
        eraId={DEFAULT_ERA_ID}
        active={false}
        reducedMotion={false}
        state={state()}
        anchors={makeAnchors()}
      />,
    );
    expect(screen.queryByTestId("coach-mark-place")).toBeNull();
  });

  it("dismisses a hint (Got it), remembers it, and never re-shows it", async () => {
    const user = userEvent.setup();
    const anchors = makeAnchors();
    const { rerender } = render(
      <CoachMarks
        active
        eraId={DEFAULT_ERA_ID}
        reducedMotion={false}
        state={state()}
        anchors={anchors}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(localStorage.getItem(coachMarkKey("place"))).toBe("true");
    expect(screen.queryByTestId("coach-mark-place")).toBeNull();

    // Same state again → the dismissed hint stays gone.
    rerender(
      <CoachMarks
        active
        eraId={DEFAULT_ERA_ID}
        reducedMotion={false}
        state={state()}
        anchors={anchors}
      />,
    );
    expect(screen.queryByTestId("coach-mark-place")).toBeNull();
  });

  it("remembers a hint once the learner advances past it (state progression)", () => {
    const anchors = makeAnchors();
    const { rerender } = render(
      <CoachMarks
        active
        eraId={DEFAULT_ERA_ID}
        reducedMotion={false}
        state={state()}
        anchors={anchors}
      />,
    );
    expect(screen.getByTestId("coach-mark-place")).toBeInTheDocument();

    // Learner places a building → 'learn' takes over and 'place' is remembered.
    rerender(
      <CoachMarks
        eraId={DEFAULT_ERA_ID}
        active
        reducedMotion={false}
        state={state({ placedCount: 1 })}
        anchors={anchors}
      />,
    );
    expect(screen.getByTestId("coach-mark-learn")).toBeInTheDocument();
    expect(localStorage.getItem(coachMarkKey("place"))).toBe("true");

    // Even if the empty-island state returns, 'place' never nags again.
    rerender(
      <CoachMarks
        active
        eraId={DEFAULT_ERA_ID}
        reducedMotion={false}
        state={state()}
        anchors={anchors}
      />,
    );
    expect(screen.queryByTestId("coach-mark-place")).toBeNull();
  });

  it("does not show a hint already seen in a previous session", () => {
    localStorage.setItem(coachMarkKey("place"), "true");
    render(
      <CoachMarks
        active
        eraId={DEFAULT_ERA_ID}
        reducedMotion={false}
        state={state()}
        anchors={makeAnchors()}
      />,
    );
    expect(screen.queryByTestId("coach-mark-place")).toBeNull();
  });

  it("passes the reduced-motion hook to the tooltip", () => {
    render(
      <CoachMarks
        active
        eraId={DEFAULT_ERA_ID}
        reducedMotion
        state={state()}
        anchors={makeAnchors()}
      />,
    );
    expect(screen.getByTestId("coach-mark-place")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );
  });

  it("'Skip tips' retires every hint at once, and remembers it", async () => {
    const user = userEvent.setup();
    const anchors = makeAnchors();
    const { rerender } = render(
      <CoachMarks
        active
        eraId={DEFAULT_ERA_ID}
        reducedMotion={false}
        state={state()}
        anchors={anchors}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Skip tips" }));

    expect(localStorage.getItem(COACH_SKIP_ALL_KEY)).toBe("true");
    expect(screen.queryByTestId("coach-mark-place")).toBeNull();
    // Not just this hint: a state that would have triggered a LATER hint shows nothing.
    rerender(
      <CoachMarks
        eraId={DEFAULT_ERA_ID}
        active
        reducedMotion={false}
        state={state({ placedCount: 2, roadTileCount: 3 })}
        anchors={anchors}
      />,
    );
    for (const mark of COACH_MARKS) {
      expect(screen.queryByTestId(`coach-mark-${mark.id}`)).toBeNull();
    }
  });

  it("keeps 'Got it' ahead of 'Skip tips' in the tab order, and focuses it", async () => {
    render(
      <CoachMarks
        active
        eraId={DEFAULT_ERA_ID}
        reducedMotion={false}
        state={state()}
        anchors={makeAnchors()}
      />,
    );
    const dismiss = screen.getByRole("button", { name: "Got it" });
    const skip = screen.getByRole("button", { name: "Skip tips" });
    expect(dismiss).toHaveFocus();
    // Turning the tutorial off must never be what a learner reaches first.
    expect(dismiss.compareDocumentPosition(skip)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("does not yank focus off a control the learner is already on", () => {
    // A hint is a NON-modal popover, so it takes focus only when focus is parked. A
    // learner who has just been returned to (say) the ☰ Menu button by closing a dialog
    // must not have it stolen by a hint that became current in the same commit.
    const elsewhere = document.createElement("button");
    document.body.append(elsewhere);
    elsewhere.focus();

    render(
      <CoachMarks
        active
        eraId={DEFAULT_ERA_ID}
        reducedMotion={false}
        state={state()}
        anchors={makeAnchors()}
      />,
    );

    expect(elsewhere).toHaveFocus();
    // Still shown, still one Tab away — it declined focus, it did not decline to appear.
    expect(screen.getByTestId("coach-mark-place")).toBeInTheDocument();
    elsewhere.remove();
  });

  it("resolves an anchor a sibling HUD control registered (not passed as a ref)", () => {
    // The Sound chip lives in `AudioSettings`, which `App` mounts outside CitySurface,
    // so the only way this hint can point at it is through the registry.
    const soundChip = document.createElement("button");
    setCoachAnchor("sound", soundChip);

    render(
      <CoachMarks
        eraId={DEFAULT_ERA_ID}
        active
        reducedMotion={false}
        state={state({ placedCount: 1, musicOn: true })}
        anchors={makeAnchors()}
      />,
    );
    expect(screen.getByTestId("coach-mark-sound")).toHaveAttribute("data-anchor", "sound");
  });

  it("re-renders when a registry anchor mounts after the hint is already up", () => {
    // The economy HUD renders nothing until a wallet loads, so it can register after the
    // city has, and the registry has to WAKE the controller when it finally does —
    // otherwise the hint would stay parked off-screen for its whole life.
    //
    // **THE OBSERVABLE MOVED WITH THE SHOP.** This used to render with the Shop chip
    // absent, watch the hint fall back to `economy`, then register the chip and assert
    // `data-anchor` flipped to `shop`. The chip is sunset and the economy hint has one
    // anchor, so the name cannot change — the POSITION is what the wake-up was ever
    // really about, and `Tooltip` parks an unresolved hint at `left: -9999px` until a
    // layout effect measures its anchor.
    render(
      <CoachMarks
        eraId={DEFAULT_ERA_ID}
        active
        reducedMotion={false}
        state={state({ placedCount: 1, anyLessonStarted: true, gold: 15 })}
        anchors={makeAnchors()}
      />,
    );
    const hint = screen.getByTestId("coach-mark-economy");
    expect(hint).toHaveAttribute("data-anchor", "economy");
    // Nothing registered yet, so it is parked rather than placed.
    expect(hint.style.left).toBe("-9999px");

    const stat = document.createElement("div");
    document.body.appendChild(stat);
    act(() => {
      setCoachAnchor("economy", stat);
    });
    // The controller re-rendered off the registry alone — no prop changed — and the
    // hint is now positioned against the element that arrived late.
    expect(screen.getByTestId("coach-mark-economy").style.left).not.toBe("-9999px");
    stat.remove();
  });
});
