import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdvisorLesson } from "./AdvisorLesson";
import { d1LessonByNode } from "./d1";
import type { LessonContent } from "./types";

// A real authored D1 lesson (has a mini-lesson, a CFU, and a 5-item practice set).
const NUM3 = d1LessonByNode["NUM.3"];
if (!NUM3) {
  throw new Error("expected an authored NUM.3 lesson");
}

// A minimal lesson that starts straight at the CFU (no mini-lesson paragraphs) with
// a simple exact-match answer, so a test can pass the CFU deterministically and
// reach the terminal "Finish lesson" action without navigating teaching + gates.
const CFU_ONLY_LESSON: LessonContent = {
  node_id: "NUM.3",
  title: "CFU-only test lesson",
  mini_lesson: [],
  cfu: { prompt: "What is 2 + 2?", accepted: ["4"], hint: "Add them." },
};

describe("AdvisorLesson — lesson/practice split (Foundation → Construction break)", () => {
  it("resumeAtPractice starts directly in the practice set (skips teaching)", () => {
    render(<AdvisorLesson content={NUM3} resumeAtPractice onComplete={vi.fn()} />);
    // Straight into the graded practice set — no teaching "Next" control.
    expect(screen.getByText(/Problem 1 of/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("resumeAtInfinite starts directly in the endless infinite-practice drill", () => {
    render(<AdvisorLesson content={NUM3} resumeAtInfinite onComplete={vi.fn()} />);
    // Straight into Anthony's infinite drill (its streak counter is the tell), not
    // teaching, the graded set, or the revisit menu.
    expect(screen.getByText("streak")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to options" })).toBeInTheDocument();
    expect(screen.queryByText(/Problem 1 of/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("finishing the lesson (CFU passed) signals Construction and ends the lesson — no inline practice", async () => {
    const user = userEvent.setup();
    const onEnterPractice = vi.fn();
    const onFinishLesson = vi.fn();
    render(
      <AdvisorLesson
        content={CFU_ONLY_LESSON}
        onEnterPractice={onEnterPractice}
        onFinishLesson={onFinishLesson}
        onComplete={vi.fn()}
      />,
    );

    // Pass the check-your-understanding question.
    await user.type(screen.getByRole("textbox"), "4");
    await user.click(screen.getByRole("button", { name: "Check" }));

    // The terminal action is "Finish lesson", NOT "Start practice".
    expect(screen.queryByRole("button", { name: /start practice/i })).toBeNull();
    const finish = await screen.findAllByRole("button", { name: "Finish lesson" });
    const firstFinish = finish[0];
    if (!firstFinish) {
      throw new Error("expected a Finish lesson button after passing the CFU");
    }
    await user.click(firstFinish);

    // It fires BOTH the Construction transition and the end-of-lesson hand-off, and
    // does NOT drop into the practice set inline (that's a separate, later step).
    expect(onEnterPractice).toHaveBeenCalledTimes(1);
    expect(onFinishLesson).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Problem 1 of/i)).toBeNull();
  });

  /**
   * EXACTLY ONE, not the CFU card's own copy shadowing the sticky `AdvisorControls` row's.
   * Two identically-named accessible controls is a defect even when only one paints on top:
   * a screen reader or keyboard user tabs to (or `getByRole`s) both, and the in-content one
   * sits inside the scrolling well the sticky row exists to be pinned OVER — see
   * `AdvisorControls`'s own doc comment on why it is pinned at all. `cfuFinishLessonNotCovered.
   * browser.test.tsx` proves the spatial half (the sticky row painting over the well at both
   * ruled viewports); this proves the accessible-tree half, in every environment this suite
   * runs in.
   */
  it("renders exactly one accessible Finish lesson control once the check is passed", async () => {
    const user = userEvent.setup();
    render(
      <AdvisorLesson
        content={CFU_ONLY_LESSON}
        onComplete={vi.fn()}
        onFinishLesson={vi.fn()}
      />,
    );

    await user.type(screen.getByRole("textbox"), "4");
    await user.click(screen.getByRole("button", { name: "Check" }));

    const finish = screen.getAllByRole("button", { name: "Finish lesson" });
    expect(
      finish.length,
      `expected exactly one accessible "Finish lesson" control, found ${finish.length}`,
    ).toBe(1);
    // And it is the sticky row's, not a copy inside the CFU card's own section.
    expect(finish[0]?.closest(".advisor-npc__controls")).not.toBeNull();
  });

  it("the revisit menu's Practice set runs practice inline (no re-signalled construction)", async () => {
    const user = userEvent.setup();
    const onEnterPractice = vi.fn();
    // hasCompletedPractice opens the revisit MENU (the building is already built), so
    // "Practice set" is an explicit choice to practice again — run inline, and DON'T
    // re-fire the Construction signal (that belongs to the first-time Finish step).
    render(
      <AdvisorLesson
        content={NUM3}
        hasCompletedPractice
        onEnterPractice={onEnterPractice}
        onComplete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Practice set/i }));

    expect(screen.getByText(/Problem 1 of/i)).toBeInTheDocument();
    expect(onEnterPractice).not.toHaveBeenCalled();
  });
});

/**
 * The gate the check IS: "Finish lesson" is the only way to Construction, and it is on offer
 * only once `cfuPassedOnce` latches. That used to have exactly one key, a correct answer, and
 * a learner without one was stuck on the lesson indefinitely. It now has a second, and this
 * pins how much it costs: the FIRST reveal buys nothing, and the second is reachable only by
 * going back to the question in between.
 *
 * Driven through the real advisor rather than the card, because the gate is the advisor's
 * state: the card only reports. The freeze and the focus behaviour these clicks pass through
 * are `inert` and real focus, which jsdom does not implement, and are proved in
 * `cfuRevealReAsk.browser.test.tsx` in Chromium instead.
 */
function finishButtons(): HTMLElement[] {
  return screen.queryAllByRole("button", { name: "Finish lesson" });
}

function npcLine(): string {
  return document.querySelector(".advisor-npc__bubble")?.textContent ?? "";
}

/**
 * The hint is the advisor's, not the card's: the NPC speaks it and the card is only TOLD
 * it was spent. So every walk to a reveal starts by spending it, and this is the only
 * place that costs, because it is the seam. The gate itself is proved in
 * `cfuHintGate.browser.test.tsx`, which passes the flag straight to the card; nothing
 * there would notice `hintTaken={hintShown}` being dropped from this file's component.
 */
async function spendTheHint(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole("button", { name: "Show hint" }));
}

describe("AdvisorLesson — the check's reveal is the only other way past the gate", () => {
  it("withholds Finish lesson until the check is passed", () => {
    render(<AdvisorLesson content={CFU_ONLY_LESSON} onComplete={vi.fn()} />);
    expect(finishButtons()).toHaveLength(0);
  });

  /**
   * What connects the two halves. A learner who has not asked for help is not stuck yet,
   * and the answer is the last thing to put in front of them, so the wrong attempt alone
   * buys nothing until the hint has been read and has failed to land.
   */
  it("holds the reveal back until the advisor's hint has actually been spent", async () => {
    const user = userEvent.setup();
    render(<AdvisorLesson content={CFU_ONLY_LESSON} onComplete={vi.fn()} />);

    await user.type(screen.getByRole("textbox"), "9");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(
      screen.queryByRole("button", { name: /Reveal answer/ }),
      "a wrong answer alone is not enough to be shown the answer",
    ).toBeNull();

    await spendTheHint(user);

    expect(
      screen.getByRole("button", { name: /Reveal answer/ }),
      "the hint is spent and the attempt was already made, so it is on offer",
    ).toBeInTheDocument();
  });

  it("a first reveal teaches and does NOT put Finish lesson on offer", async () => {
    const user = userEvent.setup();
    render(<AdvisorLesson content={CFU_ONLY_LESSON} onComplete={vi.fn()} />);

    await spendTheHint(user);
    await user.type(screen.getByRole("textbox"), "9");
    await user.click(screen.getByRole("button", { name: "Check" }));
    await user.click(screen.getByRole("button", { name: /Reveal answer/ }));

    expect(screen.getByText("Answer revealed.")).toBeInTheDocument();
    expect(finishButtons()).toHaveLength(0);
    // The re-ask is owed, and it is the only live control the learner has.
    expect(
      screen.getByRole("button", { name: "Try the question again" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reveal answer/ })).toBeNull();
  });

  it("a second reveal, taken on the re-asked question, opens the gate without congratulating them", async () => {
    const user = userEvent.setup();
    render(<AdvisorLesson content={CFU_ONLY_LESSON} onComplete={vi.fn()} />);

    await spendTheHint(user);
    await user.type(screen.getByRole("textbox"), "9");
    await user.click(screen.getByRole("button", { name: "Check" }));
    await user.click(screen.getByRole("button", { name: /Reveal answer/ }));
    await user.click(screen.getByRole("button", { name: "Try the question again" }));

    // Still stuck on the question as re-asked, and the reveal has to be earned again on it.
    expect(screen.queryByRole("button", { name: /Reveal answer/ })).toBeNull();
    await user.type(screen.getByRole("textbox"), "9");
    await user.click(screen.getByRole("button", { name: "Check" }));
    await user.click(screen.getByRole("button", { name: /Reveal answer/ }));

    expect(finishButtons().length).toBeGreaterThan(0);
    // What the advisor says about it. Praising someone who revealed twice for getting it
    // right teaches them that the praise means nothing.
    expect(npcLine()).toContain("You've seen the answer and the reasoning behind it");
    expect(npcLine()).not.toContain("That's exactly right");
  });

  it("a correct answer still opens the gate, and is still congratulated", async () => {
    const user = userEvent.setup();
    render(<AdvisorLesson content={CFU_ONLY_LESSON} onComplete={vi.fn()} />);

    await user.type(screen.getByRole("textbox"), "4");
    await user.click(screen.getByRole("button", { name: "Check" }));

    expect(finishButtons().length).toBeGreaterThan(0);
    expect(npcLine()).toContain("That's exactly right");
    expect(npcLine()).not.toContain("You've seen the answer");
  });

  /**
   * The check re-asks with the SAME question, so the answer typed after a reveal may be the
   * string the passage printed rather than anything the learner worked out. The advisor is
   * the loudest thing on the surface and it was saying "you applied what we just covered"
   * over exactly that. Same rule as the case above it, one step later in the walk.
   */
  it("an answer typed after the reveal opens the gate without being called applied work", async () => {
    const user = userEvent.setup();
    render(<AdvisorLesson content={CFU_ONLY_LESSON} onComplete={vi.fn()} />);

    await spendTheHint(user);
    await user.type(screen.getByRole("textbox"), "9");
    await user.click(screen.getByRole("button", { name: "Check" }));
    await user.click(screen.getByRole("button", { name: /Reveal answer/ }));
    await user.click(screen.getByRole("button", { name: "Try the question again" }));

    // The answer is now off the screen and the learner writes it back.
    await user.type(screen.getByRole("textbox"), "4");
    await user.click(screen.getByRole("button", { name: "Check" }));

    // It still opens the gate: a second reveal would have opened it anyway, and trapping
    // them is the defect the whole mechanic exists to prevent.
    expect(finishButtons().length).toBeGreaterThan(0);
    expect(npcLine()).toContain("isn't the same as working it out cold");
    expect(npcLine()).not.toContain("That's exactly right");
    expect(npcLine()).not.toContain("you applied what we just covered");
  });
});

// A walkthrough visual sits on the MIDDLE paragraph, so "Previous" exists while it plays
// and there is still a page after it to advance to. It does not gate, so "Next" stays
// available and the test isolates the Previous lock.
const WALKTHROUGH_LESSON: LessonContent = {
  node_id: "NUM.3",
  title: "Animation lock test lesson",
  mini_lesson: [
    "First page.",
    "Second page, with a number-line walkthrough.",
    "Third page.",
  ],
  visuals: [{ after: 1, id: "signed-addition-walkthrough" }],
  cfu: { prompt: "What is 2 + 2?", accepted: ["4"], hint: "Add them." },
};

/**
 * Click "Next" until the walkthrough's Play control is on screen.
 *
 * A slide is walked in SECTIONS now (`teachingSections.ts`) and only the last of them
 * renders the visuals, so the widget is several clicks in rather than one. Driven by what
 * is on screen rather than by a count, so a slide that grows a worked example does not
 * silently leave this test measuring the wrong page.
 */
function advanceToThePlayControl(): void {
  for (let step = 0; step < 8; step += 1) {
    if (screen.queryByRole("button", { name: "Play" }) !== null) {
      return;
    }
    const next = screen.queryByRole("button", { name: "Next" });
    if (next === null) {
      throw new Error("the advisor offers no Next and no Play");
    }
    fireEvent.click(next);
  }
  throw new Error("the advisor never reached the walkthrough");
}

describe("AdvisorLesson — dev skip to CFU (in-city footer)", () => {
  it("offers skip while teaching and withdraws it once on the CFU", () => {
    const onDevSkipOfferChange = vi.fn();
    render(
      <AdvisorLesson
        content={NUM3}
        devControlsEnabled
        onDevSkipOfferChange={onDevSkipOfferChange}
        onComplete={vi.fn()}
      />,
    );

    expect(onDevSkipOfferChange).toHaveBeenCalled();
    const teachingOffer = onDevSkipOfferChange.mock.calls.at(-1)?.[0];
    expect(teachingOffer?.canSkip, "skip should be offered during teaching").toBe(true);

    act(() => {
      teachingOffer?.skipToCfu();
    });

    expect(onDevSkipOfferChange.mock.calls.at(-1)?.[0]).toBeNull();
    expect(
      screen.getByRole("textbox"),
      "skip lands on the CFU answer field",
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show hint" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("never offers skip when dev controls are off", () => {
    const onDevSkipOfferChange = vi.fn();
    render(
      <AdvisorLesson
        content={NUM3}
        onDevSkipOfferChange={onDevSkipOfferChange}
        onComplete={vi.fn()}
      />,
    );

    expect(onDevSkipOfferChange).not.toHaveBeenCalled();
  });
});

describe("AdvisorLesson — Previous is held back while a walkthrough auto-plays", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("disables Previous on Play and re-enables it once the animation finishes", () => {
    vi.useFakeTimers();
    render(<AdvisorLesson content={WALKTHROUGH_LESSON} onComplete={vi.fn()} />);

    // Reach the section that carries the walkthrough. fireEvent rather than
    // userEvent because the whole case runs on fake timers.
    advanceToThePlayControl();
    const previous = screen.getByRole("button", { name: "Previous" });
    expect(previous).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(previous).toBeDisabled();

    // The walkthrough re-arms its timer after each step, so time has to be advanced
    // step by step rather than in one jump. Eight steps cover the plot plus seven hops.
    for (let i = 0; i < 8; i++) {
      act(() => {
        vi.advanceTimersByTime(650);
      });
    }

    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    expect(previous).toBeEnabled();
  });

  it("clears the lock when the learner leaves the page mid-animation", () => {
    vi.useFakeTimers();
    render(<AdvisorLesson content={WALKTHROUGH_LESSON} onComplete={vi.fn()} />);

    advanceToThePlayControl();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => {
      vi.advanceTimersByTime(650);
    });

    // Advancing unmounts the still-playing widget; the lock must not outlive it, or
    // Previous would stay dead for the rest of the lesson.
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));

    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  });
});
