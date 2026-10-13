/**
 * The walkthrough transport controls, across both control layouts the widgets use.
 *
 * Stepping backwards mid-animation fights the timer that is about to step forwards, so the
 * frame controls are held while a walkthrough plays. Pause is what releases them, which
 * makes the lock escapable rather than a wait. `LinearModelWalkthrough` (LF.3) stands for the
 * widgets whose Play button has always toggled to Pause; `RationalAddWalkthrough`
 * (RAT.3) stands for the four that used to disable Play outright and now toggle as well.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LessonVisual, type LessonVisualId } from "./visuals";

// Longer than any widget's frame interval, so one tick always lands a frame.
const FRAME_MS = 1200;

function button(name: string): HTMLButtonElement {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

function tick(): void {
  act(() => {
    vi.advanceTimersByTime(FRAME_MS);
  });
}

describe.each<[string, LessonVisualId]>([
  ["LF.3 (Play/Pause layout)", "linear-model-walkthrough"],
  ["RAT.3 (formerly disable-on-play layout)", "rational-add-walkthrough"],
])("%s", (_label, id) => {
  beforeEach(() => {
    vi.useFakeTimers();
    render(<LessonVisual id={id} />);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("holds Back and Step while playing, and frees them on Pause", () => {
    // Back is disabled at frame zero for its own reason, so step once first: that way a
    // pass cannot come from the widget simply sitting at the start.
    fireEvent.click(button("Step"));
    expect(button("Back")).toBeEnabled();

    fireEvent.click(button("Play"));
    expect(button("Pause"), "Play becomes Pause, not a dead button").toBeEnabled();
    expect(button("Back")).toBeDisabled();
    expect(button("Step")).toBeDisabled();

    // The lock survives the frames going by, then lifts the moment playback is paused.
    tick();
    expect(button("Back")).toBeDisabled();

    fireEvent.click(button("Pause"));
    expect(button("Back")).toBeEnabled();
    expect(button("Step")).toBeEnabled();
  });

  it("frees Back again once the animation reaches the end on its own", () => {
    fireEvent.click(button("Play"));
    expect(button("Back")).toBeDisabled();

    // Run well past the last frame; the widget clears `playing` when it lands there.
    for (let i = 0; i < 12; i++) {
      tick();
    }

    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    expect(button("Back")).toBeEnabled();
  });
});
