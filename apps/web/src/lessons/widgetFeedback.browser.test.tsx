/**
 * The two shared answer mechanics, driven through a real widget in real Chromium.
 *
 * Both are mounted by `LessonVisual`, so every test here renders the widget the way the
 * lesson does rather than bare: that is the only way to prove the mechanics are actually
 * uniform instead of wired into one widget by hand.
 *
 * The audio assertions run against a fake `AudioContext` installed on `window` before the
 * first tone. `lessonSound` keys its cached context to the constructor it came from, so
 * swapping the constructor gets a fresh fake rather than a stale real one, and every tone
 * is counted by how many oscillators it built.
 */

import { afterEach, beforeEach, expect, test } from "vitest";
import { setLessonSoundMuted } from "./lessonSound";
import {
  findButton,
  type Harness,
  hasMath,
  hasText,
  inputs,
  mount,
  setInputValue,
  waitFor,
} from "./testHarness";
import { LessonVisual } from "./visuals";

/** Oscillators built since the last reset: one tone is two of them. */
let oscillators = 0;
let realAudioContext: unknown;

class CountingAudioContext {
  state = "running";
  currentTime = 0;
  destination = {};
  resume() {
    return Promise.resolve();
  }
  createOscillator() {
    oscillators += 1;
    return {
      type: "sine",
      frequency: { value: 0 },
      connect: (node: unknown) => node,
      start: () => {},
      stop: () => {},
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: (node: unknown) => node,
    };
  }
}

let h: Harness | null = null;

beforeEach(() => {
  const scope = window as unknown as { AudioContext?: unknown };
  realAudioContext = scope.AudioContext;
  scope.AudioContext = CountingAudioContext;
  oscillators = 0;
  setLessonSoundMuted(false);
});

afterEach(() => {
  h?.cleanup();
  h = null;
  (window as unknown as { AudioContext?: unknown }).AudioContext = realAudioContext;
  setLessonSoundMuted(false);
});

/** Answer round 1 of the exponent-laws builder: x^3 * x^4, so the combined exponent is 7. */
function answerFirstRound(host: HTMLElement, value: string): void {
  const [box] = inputs(host);
  setInputValue(box as HTMLInputElement, value);
  findButton(host, "Check").click();
}

test("a correct answer pops the badge, announces it, and plays the chime", async () => {
  h = mount(<LessonVisual id="exponent-laws-builder" />);
  const { host } = h;
  await waitFor(() => inputs(host).length > 0, "the widget mounts");

  expect(host.querySelector(".lesson-feedback-badge")).toBeNull();

  answerFirstRound(host, "7");

  await waitFor(
    () => host.querySelector(".lesson-feedback-badge") !== null,
    "the success badge appears",
  );
  const live = host.querySelector('[role="status"]');
  expect(live?.textContent).toBe("Correct.");
  // One tone is a two-note pair, so a single correct answer builds two oscillators.
  expect(oscillators).toBe(2);
});

test("revealing teaches the step, holds the numbers still, and does not chime", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <LessonVisual
      id="exponent-laws-builder"
      onComplete={() => completed++}
      onReopen={() => reopened++}
    />,
  );
  const { host } = h;
  await waitFor(() => inputs(host).length > 0, "the widget mounts");

  // The reveal is not on offer until the learner has actually tried the step.
  expect(host.querySelector(".lesson-interactive__reveal-button")).toBeNull();
  expect(hasMath(host, "x^{3} \\cdot x^{4}")).toBe(true);

  answerFirstRound(host, "12");
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal-button") !== null,
    "the reveal is offered after a real attempt",
  );
  expect(oscillators).toBe(0);

  findButton(host, "Reveal answer").click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal") !== null,
    "the reveal passage opens",
  );

  const panel = host.querySelector(".lesson-interactive__reveal") as HTMLElement;
  // It has to TEACH: the answer alone is a failed reveal, so the reasoning must be there.
  expect(hasText(panel, "Answer revealed.")).toBe(true);
  expect(hasText(panel, "same base")).toBe(true);
  expect(panel.textContent?.length ?? 0).toBeGreaterThan(80);
  // The answer is still STATED, and has to be: the blank being filled in below is a purely
  // visual signal, so this sentence is all a learner not perceiving it has.
  expect(hasText(panel, "The answer is")).toBe(true);
  // And the passage no longer ends by narrating the button directly beneath it.
  expect(hasText(panel, "Ready for one like it?")).toBe(false);

  // NO CHIME, and no success badge: nothing was answered.
  //
  // This read "silent" until the reveal got a sound of its own — a soft plucked SAMPLE,
  // deliberately not a buzzer, because a reveal is the learner asking to be taught. The
  // assertion is unchanged and still worth having, because it is about the SYNTHESIZED
  // channel: the check mark is two oscillators and it must not fire here, whatever else
  // does. `revealNoteSfx.test.ts` is where the note itself is counted, and it reads both
  // channels for exactly this reason.
  expect(oscillators).toBe(0);
  expect(host.querySelector(".lesson-feedback-badge")).toBeNull();

  // The numbers do NOT move. The problem the passage is explaining is the problem still on
  // screen, which is the whole point: the two used to disagree the moment the reveal landed.
  expect(hasMath(host, "x^{3} \\cdot x^{4}")).toBe(true);
  expect(hasMath(host, "x^{6} \\cdot x^{2}")).toBe(false);
  expect(completed).toBe(0);
  expect(reopened).toBe(0);

  // Nothing was pulled out from under the learner, so what is announced is the control that
  // KEEPS the question rather than the one that replaces it. This widget has rounds after this
  // one, so its reveal hands the board back, and the announcement is the hand-back's; the
  // assertion is on that control by name, plus the control existing to be chosen, because an
  // announcement naming a button the board does not offer is worse than no announcement.
  // "The question stays as it is until you choose …" is what this read before the widget said
  // what was left of its round. That announcement is not orphaned: it is still what a surface
  // with nothing outstanding makes, and `cfuRevealReAsk.browser.test.tsx` asserts it verbatim
  // on the end-of-lesson check, which holds exactly one answer.
  const live = host.querySelector(".lesson-feedback-announce");
  expect(live?.textContent).toContain("Keep going on this question");
  expect(
    host.querySelector(".lesson-interactive__resume-button")?.textContent,
    "the announcement names a control the board does not offer",
  ).toBe("Keep going on this question");
  // Focus lands on the teaching rather than on an answer box.
  expect(document.activeElement).toBe(panel);

  // The re-ask control is NOT an Enter target, and it matters more now that the blank below
  // is filled in: a focused button is an implicit Enter target, and the answer box has its own
  // Enter handler, so a learner who submitted their last wrong answer with Enter would deal
  // themselves a new question instead of reading the explanation they asked for.
  const reAsk = host.querySelector(
    ".lesson-interactive__reask-button",
  ) as HTMLButtonElement;
  expect(document.activeElement).not.toBe(reAsk);
  panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  await new Promise<void>((resolve) => setTimeout(resolve, 60));
  expect(hasMath(host, "x^{3} \\cdot x^{4}"), "Enter dealt a new instance").toBe(true);
  expect(host.querySelector(".lesson-interactive__reveal")).not.toBeNull();

  // Only then, and only on the click, does the fresh instance arrive.
  findButton(host, "Try again with different numbers").click();
  await waitFor(() => hasMath(host, "x^{6} \\cdot x^{2}"), "a fresh instance is dealt");
  expect(hasMath(host, "x^{3} \\cdot x^{4}")).toBe(false);
  // The explanation of the problem that has just been replaced goes with it.
  expect(host.querySelector(".lesson-interactive__reveal")).toBeNull();
  expect(completed).toBe(0);
  expect(reopened).toBe(0);
  // Focus follows the redraw now that there has been one.
  expect(document.activeElement).toBe(inputs(host)[0]);
});

/**
 * The QA defect this control exists to fix, stated as an assertion on the OPERANDS.
 *
 * The old reveal redrew the widget in the same handler that raised the passage, so the
 * learner got a correct explanation of the problem they had just left sitting above a
 * different problem. What makes it worth its own test is how nearly it hid: the operands
 * are what disagree, and the old second board opened on $5$ and $2$ against a first board
 * of $3$ and $4$, so both rounds totalled $7$ and any assertion on the SUM passed happily
 * against the bug. The pools no longer collide, and this checks the operands regardless.
 */
test("the explanation works with the operands of the problem still on screen", async () => {
  h = mount(<LessonVisual id="exponent-laws-builder" />);
  const { host } = h;
  await waitFor(() => inputs(host).length > 0, "the widget mounts");

  answerFirstRound(host, "12");
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal-button") !== null,
    "the reveal is offered",
  );
  findButton(host, "Reveal answer").click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal") !== null,
    "the reveal passage opens",
  );

  const passage = host.querySelector(".lesson-interactive__reveal") as HTMLElement;
  const board = host.querySelector(".lesson-interactive") as HTMLElement;

  // Board one is x^3 * x^4, so the reasoning has to be adding 3 and 4.
  expect(hasMath(board, "x^{3} \\cdot x^{4}")).toBe(true);
  expect(hasMath(passage, "3 + 4")).toBe(true);
  // And neither of them may have moved on to the operands of the next board.
  expect(hasMath(board, "x^{6} \\cdot x^{2}")).toBe(false);
  expect(hasMath(passage, "6 + 2")).toBe(false);

  // Taking the re-ask moves BOTH, together: the new problem arrives and the explanation of
  // the old one leaves with it, so the two are never on screen disagreeing. Queried off the
  // host rather than off `board`, which the remount has detached.
  findButton(host, "Try again with different numbers").click();
  await waitFor(() => hasMath(host, "x^{6} \\cdot x^{2}"), "the next board is dealt");
  expect(host.querySelector(".lesson-interactive__reveal")).toBeNull();
});

/**
 * The positive branch used to print `3 + (4) = 7`. The brackets are for `2 + (-6) = -4`,
 * where they hold the sign apart from the plus; applied unconditionally they were a
 * template seam showing through. Both branches are checked, because a fix that dropped
 * the brackets altogether would pass a test that only looked at the positive one.
 */
test("the worked line brackets a negative second exponent and only a negative one", async () => {
  h = mount(<LessonVisual id="exponent-laws-builder" />);
  const { host } = h;
  await waitFor(() => inputs(host).length > 0, "the widget mounts");

  answerFirstRound(host, "7");
  await waitFor(
    () => Boolean(findButton(host, "Next: a negative exponent")),
    "round one is closed out",
  );
  const board = host.querySelector(".lesson-interactive") as HTMLElement;
  expect(hasMath(board, "3 + 4 = 7")).toBe(true);
  expect(hasMath(board, "3 + (4)")).toBe(false);

  findButton(host, "Next: a negative exponent").click();
  await waitFor(() => inputs(host).length > 0, "round two is ready");
  setInputValue(inputs(host)[0] as HTMLInputElement, "-4");
  findButton(host, "Check").click();
  await waitFor(
    () => Boolean(findButton(host, "Next: a division")),
    "round two is closed out",
  );
  expect(hasMath(board, "2 + (-6) = -4")).toBe(true);
});

test("finishing the fresh instance is what opens the gate", async () => {
  let completed = 0;
  h = mount(<LessonVisual id="exponent-laws-builder" onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => inputs(host).length > 0, "the widget mounts");

  answerFirstRound(host, "12");
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal-button") !== null,
    "the reveal is offered",
  );
  findButton(host, "Reveal answer").click();
  await waitFor(
    () => Boolean(findButton(host, "Try again with different numbers")),
    "the re-ask is offered",
  );
  findButton(host, "Try again with different numbers").click();
  await waitFor(() => hasMath(host, "x^{6} \\cdot x^{2}"), "a fresh instance is dealt");

  // Second board: x^6 * x^2, then x^4 * x^-9, then x^8 / x^3.
  const round = async (value: string, next?: string) => {
    setInputValue(inputs(host)[0] as HTMLInputElement, value);
    findButton(host, "Check").click();
    if (next) {
      await waitFor(() => Boolean(findButton(host, next)), `round advanced past ${value}`);
      findButton(host, next).click();
      await waitFor(() => inputs(host).length > 0, "next round ready");
    }
  };
  await round("8", "Next: a negative exponent");
  await round("-5", "Next: a division");
  await round("5");

  await waitFor(() => completed === 1, "the gate opens on the answered instance");
  // Answering it is what earns the success state that revealing never does.
  expect(oscillators).toBeGreaterThan(0);
});

test("a second reveal lets the learner past rather than sending them round again", async () => {
  let completed = 0;
  h = mount(<LessonVisual id="exponent-laws-builder" onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => inputs(host).length > 0, "the widget mounts");

  answerFirstRound(host, "12");
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal-button") !== null,
    "the reveal is offered",
  );
  findButton(host, "Reveal answer").click();

  // While the re-ask is owed, the reveal stands down. Left on offer it would be the SECOND
  // reveal, which opens the gate, and it would open it against the instance the passage is
  // still explaining: the learner would leave without ever meeting the new question.
  await waitFor(
    () => Boolean(findButton(host, "Try again with different numbers")),
    "the re-ask is offered",
  );
  expect(host.querySelector(".lesson-interactive__reveal-button")).toBeNull();
  expect(completed).toBe(0);
  // Asserted here as well as in the test above, because the rest of this one reads the
  // same either way: without it the whole flow passes against a reveal that auto-advances.
  expect(hasMath(host, "x^{3} \\cdot x^{4}")).toBe(true);

  findButton(host, "Try again with different numbers").click();
  await waitFor(() => hasMath(host, "x^{6} \\cdot x^{2}"), "a fresh instance is dealt");

  // Still cannot do it. The second reveal has to let them through: a learner who is sent
  // round a second time is trapped on the slide.
  answerFirstRound(host, "12");
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal-button") !== null,
    "the reveal is offered on the fresh instance too",
  );
  findButton(host, "Reveal answer").click();

  await waitFor(() => completed === 1, "the second reveal opens the gate");
  // Still not an answer, so still no badge and still no tone.
  expect(oscillators).toBe(0);
  expect(host.querySelector(".lesson-feedback-badge")).toBeNull();
  const panel = host.querySelector(".lesson-interactive__reveal") as HTMLElement;
  expect(hasText(panel, "Answer revealed.")).toBe(true);
  expect(hasText(panel, "The answer is")).toBe(true);
  expect(hasText(panel, "Ready for one like it?")).toBe(false);
  // The gate is open, so nothing is owed and no re-ask control is left on screen.
  expect(host.querySelector(".lesson-interactive__reask-button")).toBeNull();
});

test("the mute preference silences the chime and survives a remount", async () => {
  const first = mount(<LessonVisual id="exponent-laws-builder" />);
  h = first;
  await waitFor(() => inputs(first.host).length > 0, "the widget mounts");
  setLessonSoundMuted(true);

  answerFirstRound(first.host, "7");
  await waitFor(
    () => first.host.querySelector(".lesson-feedback-badge") !== null,
    "the badge still confirms the answer",
  );
  // Muting takes the sound, never the confirmation.
  expect(oscillators).toBe(0);
  first.cleanup();

  // The preference is stored, not held in the component, so a fresh mount inherits it.
  const second = mount(<LessonVisual id="exponent-laws-builder" />);
  h = second;
  await waitFor(() => inputs(second.host).length > 0, "the widget remounts");
  answerFirstRound(second.host, "7");
  await waitFor(
    () => second.host.querySelector(".lesson-feedback-badge") !== null,
    "the badge confirms again",
  );
  expect(oscillators).toBe(0);
});

test("a failed tone never breaks the interaction", async () => {
  (window as unknown as { AudioContext?: unknown }).AudioContext = class {
    constructor() {
      throw new Error("no audio device");
    }
  };
  h = mount(<LessonVisual id="exponent-laws-builder" />);
  const { host } = h;
  await waitFor(() => inputs(host).length > 0, "the widget mounts");

  answerFirstRound(host, "7");
  await waitFor(
    () => host.querySelector(".lesson-feedback-badge") !== null,
    "the answer still resolves with no audio available",
  );
});
