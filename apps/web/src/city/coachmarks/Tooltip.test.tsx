import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Tooltip } from "./Tooltip";

/**
 * **DISMISSING A HINT RETURNS FOCUS TO WHATEVER HELD IT BEFORE THE HINT MOUNTED.**
 *
 * A pointer click on "Got it" / "Skip tips" focuses that button first (a native
 * `mousedown` effect, unconditional), and removing a focused element from the DOM resets
 * focus to `<body>`. Left alone, that is exactly how a learner mid keyboard interaction
 * (road draft, building placement, anything else a hint might appear over) loses whatever
 * had focus the instant they dismiss the hint — even when the hint's own mount-time
 * "land on the dismiss" effect declined to steal anything, because the LOSS happens on the
 * way out, not on the way in. `CitySurface.tsx`'s `startRoadMode` + `coachActive`'s
 * `!roadDraft` are the other half of this repro (`../roadDraftCoachmarkFocus.test.tsx`);
 * this file proves the general mechanism in isolation, for every anchor a hint can land on.
 */
function renderTooltip(onDismiss = vi.fn(), onSkipAll = vi.fn()) {
  const anchor = document.createElement("div");
  document.body.appendChild(anchor);
  render(
    <Tooltip
      id="roads"
      text="Roads are a tab inside Build."
      anchor="build"
      anchorEl={anchor}
      reducedMotion
      onDismiss={onDismiss}
      onSkipAll={onSkipAll}
    />,
  );
  return { anchor, onDismiss, onSkipAll };
}

describe("Tooltip — dismissal hands focus back rather than dropping it", () => {
  it("does not steal focus on mount from a control the learner is deliberately on", () => {
    const stood = document.createElement("button");
    stood.textContent = "stand-in for the city viewport";
    document.body.appendChild(stood);
    stood.focus();
    expect(document.activeElement).toBe(stood);

    renderTooltip();

    // The hint's own mount effect: focus is parked nowhere it should not be.
    expect(document.activeElement).toBe(stood);
  });

  it("restores focus to that control once Got it is clicked", async () => {
    const user = userEvent.setup();
    const stood = document.createElement("button");
    stood.textContent = "stand-in for the city viewport";
    document.body.appendChild(stood);
    stood.focus();

    const { onDismiss } = renderTooltip();
    expect(document.activeElement).toBe(stood);

    await user.click(screen.getByRole("button", { name: "Got it" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    // Not <body> — clicking "Got it" would otherwise have left it there once the hint
    // (in the real controller) unmounts on dismiss.
    expect(document.activeElement).toBe(stood);
  });

  it("restores focus to that control on Escape as well as on a click", async () => {
    const user = userEvent.setup();
    const stood = document.createElement("button");
    stood.textContent = "stand-in for the city viewport";
    document.body.appendChild(stood);
    stood.focus();

    const { onDismiss } = renderTooltip();
    // Escape only reaches the hint's own handler while focus is inside it — the same
    // precondition a real learner meets by tabbing to (or being landed on) one of its
    // buttons before pressing it.
    screen.getByRole("button", { name: "Got it" }).focus();
    await user.keyboard("{Escape}");

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(stood);
  });

  it("restores focus on Skip tips too, not only on the primary dismiss", async () => {
    const user = userEvent.setup();
    const stood = document.createElement("button");
    stood.textContent = "stand-in for the city viewport";
    document.body.appendChild(stood);
    stood.focus();

    const { onSkipAll } = renderTooltip();

    await user.click(screen.getByRole("button", { name: "Skip tips" }));

    expect(onSkipAll).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(stood);
  });

  it("does not throw when focus was parked (body) before mount and stays dismissable", async () => {
    const user = userEvent.setup();
    (document.activeElement as HTMLElement | null)?.blur?.();
    expect(
      document.activeElement === document.body || document.activeElement === null,
    ).toBe(true);

    const { onDismiss } = renderTooltip();
    // Parked focus IS the case the mount effect lands the dismiss for.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Got it" }));

    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
