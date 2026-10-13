import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { OruMood } from "../../lessons/OruAdvisorCharacter";
import { DemoReel } from "./DemoReel";
import { DEMO_BEATS, DEMO_MOOD, DEMO_NARRATION, type DemoBeat } from "./useDemoScript";

/** Longer than the longest beat, so one advance always steps exactly one beat. */
const PAST_A_BEAT = 6500;

/**
 * The pose the reel wants at each beat, written out here rather than read from
 * `DEMO_MOOD`, so this is an independent statement of intent and not a restatement of
 * the table. `unlock` is the one that moved: it was CityGuide's `cheer`, and Oru has no
 * celebration pose, so it points at the newly unlocked building instead.
 */
const EXPECTED_POSE: Record<DemoBeat, OruMood> = {
  place: "talk",
  learn: "talk",
  build: "talk",
  unlock: "point",
};

describe("DemoReel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the video-player chrome: title, caption, progress bar, Play + Skip", () => {
    render(<DemoReel enableCanvas={false} reducedMotion={false} onDone={vi.fn()} />);

    const reel = screen.getByTestId("demo-reel");
    expect(reel).toHaveAttribute("role", "dialog");
    expect(
      screen.getByRole("heading", { name: /how your city grows/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("demo-reel-line")).toHaveTextContent(DEMO_NARRATION.place);
    expect(screen.getByTestId("demo-reel-progress")).toBeInTheDocument();
    // Auto-playing → the toggle offers Pause; Skip is present too.
    expect(screen.getByTestId("demo-reel-play")).toHaveAccessibleName(/pause/i);
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
  });

  it("lands focus on Skip and hands off (onDone) when skipped", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<DemoReel enableCanvas={false} reducedMotion={false} onDone={onDone} />);

    const skip = screen.getByRole("button", { name: "Skip" });
    expect(skip).toHaveFocus();
    await user.click(skip);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("steps the beats place → learn → build → unlock with captions + progress, then hands off", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<DemoReel enableCanvas={false} reducedMotion={false} onDone={onDone} />);

    const line = () => screen.getByTestId("demo-reel-line");
    const screenEl = () => screen.getByTestId("demo-reel-screen");
    const progress = () => screen.getByTestId("demo-reel-progress-fill");

    expect(line()).toHaveTextContent(DEMO_NARRATION.place);
    expect(screenEl()).toHaveAttribute("data-beat", "place");
    expect(progress()).toHaveAttribute("data-value", "1");

    act(() => vi.advanceTimersByTime(PAST_A_BEAT));
    expect(line()).toHaveTextContent(DEMO_NARRATION.learn);
    expect(screenEl()).toHaveAttribute("data-beat", "learn");
    expect(progress()).toHaveAttribute("data-value", "2");
    // Learn beat opens the faux lesson card.
    expect(screen.getByText(/short mini-lesson/i)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(PAST_A_BEAT));
    expect(line()).toHaveTextContent(DEMO_NARRATION.build);
    expect(screenEl()).toHaveAttribute("data-beat", "build");
    expect(progress()).toHaveAttribute("data-value", "3");

    act(() => vi.advanceTimersByTime(PAST_A_BEAT));
    expect(line()).toHaveTextContent(DEMO_NARRATION.unlock);
    expect(screenEl()).toHaveAttribute("data-beat", "unlock");
    expect(progress()).toHaveAttribute("data-value", "4");
    // Unlock beat: the reward flash chip + a mastery star.
    expect(screen.getByText(/new building unlocked/i)).toBeInTheDocument();
    expect(screen.getByTestId("demo-reel-star")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();

    // Past the last beat → the reel hands off exactly once.
    act(() => vi.advanceTimersByTime(PAST_A_BEAT));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("Play/Pause holds the beat while paused, then resumes", () => {
    vi.useFakeTimers();
    render(<DemoReel enableCanvas={false} reducedMotion={false} onDone={vi.fn()} />);

    const play = screen.getByTestId("demo-reel-play");
    const screenEl = () => screen.getByTestId("demo-reel-screen");
    expect(play).toHaveAccessibleName(/pause/i);

    // Pause → time no longer advances the reel; the toggle now offers Play.
    fireEvent.click(play);
    expect(play).toHaveAccessibleName(/play/i);
    act(() => vi.advanceTimersByTime(30000));
    expect(screenEl()).toHaveAttribute("data-beat", "place");

    // Resume → the reel advances again.
    fireEvent.click(play);
    expect(play).toHaveAccessibleName(/pause/i);
    act(() => vi.advanceTimersByTime(PAST_A_BEAT));
    expect(screenEl()).toHaveAttribute("data-beat", "learn");
  });

  it("narrates with Oru, and every beat gets a pose Oru can actually strike", () => {
    vi.useFakeTimers();
    const { container } = render(
      <DemoReel enableCanvas={false} reducedMotion={false} onDone={vi.fn()} />,
    );

    // A floor, so the loop below cannot pass by iterating over nothing.
    expect(DEMO_BEATS.length).toBe(4);

    for (const beat of DEMO_BEATS) {
      expect(screen.getByTestId("demo-reel-screen")).toHaveAttribute("data-beat", beat);
      const oru = container.querySelector(".oru-advisor");
      expect(oru, `Oru at the ${beat} beat`).not.toBeNull();
      expect(container.querySelector(".city-guide")).toBeNull();
      expect(oru?.getAttribute("data-mood"), `pose at the ${beat} beat`).toBe(
        EXPECTED_POSE[beat],
      );
      act(() => vi.advanceTimersByTime(PAST_A_BEAT));
    }
  });

  it("keeps CityGuide's retired poses out of the reel's table entirely", () => {
    // `cheer` and `wave` are the two poses that did not survive the era-one advisor, and
    // the type alone would not catch a widened `OruMood` later reintroducing them.
    expect(Object.values(DEMO_MOOD)).not.toContain("cheer");
    expect(Object.values(DEMO_MOOD)).not.toContain("wave");
    expect(DEMO_MOOD).toEqual(EXPECTED_POSE);
  });

  it("under reduced motion, plays with captions but no ghost cursor", () => {
    vi.useFakeTimers();
    render(<DemoReel enableCanvas={false} reducedMotion onDone={vi.fn()} />);

    expect(screen.getByTestId("demo-reel-line")).toHaveTextContent(DEMO_NARRATION.place);
    expect(screen.queryByTestId("demo-reel-cursor")).toBeNull();

    // The beats still step on the timer as static frames.
    act(() => vi.advanceTimersByTime(PAST_A_BEAT));
    expect(screen.getByTestId("demo-reel-line")).toHaveTextContent(DEMO_NARRATION.learn);
  });
});
