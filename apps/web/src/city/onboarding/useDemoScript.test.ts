import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEMO_BEATS,
  hasSeenOnboardingDemo,
  markOnboardingDemoSeen,
  ONBOARDING_DEMO_SEEN_KEY,
  useDemoScript,
} from "./useDemoScript";

/** Longer than the longest beat, so one advance always completes exactly one beat. */
const PAST_A_BEAT = 6500;

describe("useDemoScript", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("advances through every beat in order, then calls onDone once", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDemoScript({ active: true, onDone }));

    expect(result.current.beat).toBe("place");
    expect(result.current.index).toBe(0);
    expect(result.current.total).toBe(DEMO_BEATS.length);

    for (let i = 1; i < DEMO_BEATS.length; i += 1) {
      act(() => {
        vi.advanceTimersByTime(PAST_A_BEAT);
      });
      expect(result.current.beat).toBe(DEMO_BEATS[i]);
    }
    expect(onDone).not.toHaveBeenCalled();

    // Past the last beat → the reel finishes exactly once.
    act(() => {
      vi.advanceTimersByTime(PAST_A_BEAT);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("skip cancels the timers and calls onDone exactly once", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDemoScript({ active: true, onDone }));

    act(() => {
      result.current.skip();
    });
    expect(onDone).toHaveBeenCalledTimes(1);

    // No further ticks fire after a skip.
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("is inert while inactive (no timers, never finishes)", () => {
    const onDone = vi.fn();
    renderHook(() => useDemoScript({ active: false, onDone }));
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(onDone).not.toHaveBeenCalled();
  });

  it("holds the current beat while paused, then continues on resume", () => {
    const onDone = vi.fn();
    const { result, rerender } = renderHook(
      ({ paused }: { paused: boolean }) => useDemoScript({ active: true, paused, onDone }),
      { initialProps: { paused: false } },
    );

    // Pause on the first beat: time no longer advances the reel.
    rerender({ paused: true });
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(result.current.beat).toBe("place");
    expect(onDone).not.toHaveBeenCalled();

    // Resume: the beat plays out and the reel advances again.
    rerender({ paused: false });
    act(() => {
      vi.advanceTimersByTime(PAST_A_BEAT);
    });
    expect(result.current.beat).toBe("learn");
  });

  it("remembers the seen flag across reads", () => {
    expect(hasSeenOnboardingDemo()).toBe(false);
    markOnboardingDemoSeen();
    expect(localStorage.getItem(ONBOARDING_DEMO_SEEN_KEY)).toBe("true");
    expect(hasSeenOnboardingDemo()).toBe(true);
  });
});
