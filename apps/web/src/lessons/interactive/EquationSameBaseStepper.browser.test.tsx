/**
 * EL.6 slide 0, driven in real Chromium.
 *
 * Two answers, one gate, and the second is the one the slide is about: rewriting the right
 * side onto the base is recognition, and reading the exponent equation off the match is the
 * method. So the claims here are about what the board refuses and what it withholds, not
 * about how it is wired. The solve stage must not exist before the rewrite lands, the exponent
 * on the right must not pass as `x`, and a reveal spent on the rewrite must leave the solve
 * stage for the learner.
 *
 * Nothing is asserted on `textContent` where math is involved: every value on this board is
 * typeset, and KaTeX's MathML emits each glyph twice. The assertions go through `hasMath`,
 * which reads the LaTeX the node was drawn from, or through the accessible names, which spell
 * the values out in words.
 */

import { afterEach, beforeEach, expect, test } from "vitest";

import { setLessonSoundMuted } from "../lessonSound";
import {
  type AudioProbe,
  findButton,
  type Harness,
  hasMath,
  hasText,
  installCountingAudio,
  mount,
  setInputValue,
  waitFor,
} from "../testHarness";
import { WidgetFeedbackHost } from "../widgetFeedback";
import { EquationSameBaseStepper } from "./EquationSameBaseStepper";

let h: Harness | null = null;
let audio: AudioProbe | null = null;

beforeEach(() => {
  audio = installCountingAudio();
  setLessonSoundMuted(false);
});

afterEach(() => {
  h?.cleanup();
  h = null;
  audio?.restore();
  audio = null;
  setLessonSoundMuted(true);
  setLessonSoundMuted(false);
});

/**
 * The widget under the feedback host `LessonVisual` mounts around every lesson visual.
 *
 * It is not optional scaffolding here: the success badge and the reveal's hand-back control
 * both live on the host, so a bare mount could not observe either of the things this file is
 * about.
 */
function board(handlers: { onComplete?: () => void; onReopen?: () => void } = {}): Harness {
  return mount(
    <WidgetFeedbackHost>
      <EquationSameBaseStepper {...handlers} />
    </WidgetFeedbackHost>,
  );
}

function rows(host: HTMLElement): HTMLElement[] {
  return Array.from(host.querySelectorAll<HTMLElement>(".lesson-equation__row"));
}

function stageRow(host: HTMLElement, at: number): HTMLElement {
  const row = rows(host)[at];
  if (row === undefined) {
    throw new Error(`no stage row at ${at}`);
  }
  return row;
}

function stageState(host: HTMLElement, at: number): string | null {
  return stageRow(host, at).getAttribute("data-state");
}

/** The one blank currently open. Only the stage being asked holds an input at all. */
function openSlot(host: HTMLElement): HTMLInputElement {
  const found = host.querySelectorAll<HTMLInputElement>("input.lesson-equation__slot");
  if (found.length !== 1) {
    throw new Error(`expected exactly one open blank, found ${found.length}`);
  }
  return found[0] as HTMLInputElement;
}

/** Type into whichever blank is open and submit it. */
function answer(host: HTMLElement, value: string): void {
  setInputValue(openSlot(host), value);
  findButton(host, "Check").click();
}

function revealButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button");
}

function resumeButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__resume-button");
}

function passage(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>(".lesson-interactive__reveal");
}

test("EquationSameBaseStepper refuses a wrong exponent and keeps the solve stage shut", async () => {
  let completed = 0;
  h = board({
    onComplete: () => {
      completed += 1;
    },
  });
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the board mounts",
  );

  expect(rows(host), "the board is not the two stages this test drives").toHaveLength(2);
  expect(stageState(host, 0)).toBe("open");
  expect(stageState(host, 1)).toBe("locked");
  // The linear equation does not exist until the rewrite does, so there is nothing in the
  // locked stage to tab to, click, or type into.
  expect(
    stageRow(host, 1).querySelectorAll("input, button, select, textarea, [tabindex]"),
    "the solve stage offered something to answer before the rewrite was done",
  ).toHaveLength(0);

  // A real exponent of the base, and not this one, so the refusal has to say what is wrong
  // with it rather than only that it is wrong.
  answer(host, "6");
  await waitFor(
    () => hasText(host, "how many factors that took"),
    "the wrong exponent is refused",
  );
  expect(hasMath(host, "2^{6}"), "the refusal never says what the wrong count builds").toBe(
    true,
  );
  expect(stageState(host, 1), "a wrong exponent opened the solve stage").toBe("locked");
  expect(stageRow(host, 1).querySelectorAll("input, button")).toHaveLength(0);
  expect(completed).toBe(0);

  // And the answer the misconception offers: the number itself, put upstairs.
  answer(host, "32");
  await waitFor(
    () => hasText(host, "That is the number itself"),
    "the target is refused as its own exponent",
  );
  expect(completed).toBe(0);

  answer(host, "5");
  await waitFor(() => stageState(host, 1) === "open", "the solve stage opens");
  expect(stageState(host, 0)).toBe("done");
  // The exponent equation is a consequence of the match, so it arrives with it and not before.
  expect(hasMath(host, "x + 1 = 5"), "the match forced no exponent equation").toBe(true);
  expect(completed, "the rewrite alone opened the gate").toBe(0);
});

test("EquationSameBaseStepper confirms each stage and opens the gate exactly once", async () => {
  let completed = 0;
  h = board({
    onComplete: () => {
      completed += 1;
    },
  });
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the board mounts",
  );
  expect(audio?.oscillators(), "something was confirmed before anything was answered").toBe(
    0,
  );

  answer(host, "5");
  await waitFor(
    () => host.querySelector(".lesson-feedback-badge") !== null,
    "the rewrite pops a badge",
  );
  expect(audio?.oscillators(), "the rewrite was not confirmed in its own right").toBe(2);
  expect(completed, "the rewrite alone opened the gate").toBe(0);

  // The exponent on the right answers the stage just finished, not this one. Every board
  // carries a shift so that reading it off is always wrong here.
  answer(host, "5");
  await waitFor(
    () => hasText(host, "That is the exponent on the right"),
    "the right exponent is refused as the value of x",
  );
  expect(audio?.oscillators(), "a wrong answer was confirmed").toBe(2);
  expect(completed).toBe(0);

  answer(host, "4");
  await waitFor(() => completed === 1, "both answers together open the gate");
  await waitFor(
    () => audio?.oscillators() === 4,
    "the solve stage was folded into the gate rather than confirmed on its own",
  );

  // Latched once, and it stays latched once while the finished board sits there.
  await new Promise<void>((resolve) => setTimeout(resolve, 80));
  expect(completed, "the gate was opened more than once").toBe(1);

  expect(hasMath(host, "x = 4"), "the finished board never says what x came out at").toBe(
    true,
  );
  expect(
    host.querySelector(".lesson-interactive__status")?.getAttribute("data-state"),
  ).toBe("solved");
});

test("EquationSameBaseStepper hands the board back while the solve stage is outstanding", async () => {
  let completed = 0;
  h = board({
    onComplete: () => {
      completed += 1;
    },
  });
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the board mounts",
  );

  // The reveal unblocks a stuck learner; it is not a first-click way round the teaching.
  expect(revealButton(host), "the reveal was offered before anything was tried").toBeNull();

  answer(host, "6");
  await waitFor(
    () => revealButton(host) !== null,
    "a wrong attempt puts the reveal on offer",
  );
  // The label names WHICH answer is coming, because "Reveal answer" is ambiguous on a board
  // that asks two different questions off one equation.
  expect(revealButton(host)?.textContent).toContain("Reveal the exponent");

  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the reveal teaches");
  expect(hasText(passage(host) as HTMLElement, "Answer revealed.")).toBe(true);

  // THE CLAIM. The solve stage is still outstanding, so the instance comes back rather than
  // being spent on the one part that was explained.
  expect(
    resumeButton(host),
    "a reveal on the rewrite threw away the solve stage with it",
  ).not.toBeNull();
  expect((resumeButton(host) as HTMLButtonElement).textContent).toBe(
    "Keep going on this question",
  );

  (resumeButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) === null, "the teaching is dismissed");
  expect(completed, "taking the board back opened the gate").toBe(0);
  // Being told an answer is not producing it: the rewrite is still open, and the blank holds
  // the learner's own attempt rather than the answer the passage named.
  expect(stageState(host, 0)).toBe("open");
  expect(openSlot(host).value, "the revealed answer outlived the passage").toBe("6");

  // Produce it, then miss the LAST outstanding answer. Nothing is left to keep going on, so
  // the flag has to be false here: handing this board back would hand the gate back with it.
  answer(host, "5");
  await waitFor(() => stageState(host, 1) === "open", "the solve stage opens");
  answer(host, "9");
  await waitFor(() => revealButton(host) !== null, "the solve stage offers its own reveal");
  expect(revealButton(host)?.textContent).toContain("Reveal the value of x");

  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the second reveal teaches");
  expect(
    resumeButton(host),
    "the last outstanding answer was handed back with the gate on it",
  ).toBeNull();
  expect(findButton(host, "Try again with different numbers")).not.toBeNull();
  expect(completed, "the reveal opened the gate before any redraw").toBe(0);
});

test("EquationSameBaseStepper deals a different base on start over, and shuts the gate again", async () => {
  let completed = 0;
  let reopened = 0;
  h = board({
    onComplete: () => {
      completed += 1;
    },
    onReopen: () => {
      reopened += 1;
    },
  });
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the board mounts",
  );
  expect(
    hasMath(host, "2^{x + 1}"),
    "the opening board is not the one this test drives",
  ).toBe(true);

  answer(host, "5");
  await waitFor(() => stageState(host, 1) === "open", "the solve stage opens");
  answer(host, "4");
  await waitFor(() => completed === 1, "the first board finishes");

  findButton(host, "Start over on a different base").click();
  await waitFor(
    () => hasMath(host, "3^{x - 1}"),
    "start over dealt the same numbers back, so the answer is already known",
  );
  expect(hasMath(host, "2^{x + 1}"), "the answered board is still on screen").toBe(false);
  expect(reopened, "start over left the gate latched open").toBe(1);

  // A fresh instance owes both answers again, and offers no way past until it has them.
  expect(stageState(host, 0)).toBe("open");
  expect(stageState(host, 1)).toBe("locked");
  expect(
    host.querySelector(".lesson-interactive__reset"),
    "the finished board's reset survived into the fresh one",
  ).toBeNull();

  answer(host, "4");
  await waitFor(() => stageState(host, 1) === "open", "the new rewrite lands");
  answer(host, "5");
  await waitFor(
    () => completed === 2,
    "the second board never opened the gate on its own answers",
  );
});

/**
 * Both equations are separately placed `foreignObject` labels, so KaTeX's metrics are what
 * decide whether each reads as one line and whether the two hang on one column. Measured on the
 * `.katex` spans and not on the boxes, which are deliberately roomy and do overlap by design.
 *
 * Scoped by row, because the two rows typeset the SAME left side and the same relation: an
 * unscoped `querySelector` would answer with the dealt row for every query and quietly stop
 * measuring the row whose name is in the assertion.
 */
function ink(host: HTMLElement, row: "dealt" | "rewritten", latex: string): DOMRect {
  const node = host.querySelector<HTMLElement>(
    `[data-row="${row}"] [data-latex="${latex}"] .katex`,
  );
  if (node === null) {
    throw new Error(`nothing typeset for ${latex} in the ${row} row`);
  }
  return node.getBoundingClientRect();
}

function centre(box: DOMRect): number {
  return box.left + box.width / 2;
}

test("EquationSameBaseStepper typesets the rewritten equation as one unbroken line", async () => {
  h = board();
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the board mounts",
  );

  // Every value on the board is drawn by KaTeX, so the words are what a test and a screen
  // reader both have to go on.
  expect(openSlot(host).getAttribute("aria-label")).toBe(
    "the exponent that writes 32 on the base 2",
  );
  expect(
    host.querySelector(".lesson-interactive svg")?.getAttribute("aria-label"),
  ).toContain("2 to the x plus 1 equals 32");
  expect(
    host.querySelector("[data-exponent-tie]"),
    "the exponents were tied before the bases matched",
  ).toBeNull();

  answer(host, "5");
  await waitFor(
    () => host.querySelector("[data-exponent-tie]") !== null,
    "the match draws no tie between the exponents",
  );
  // The tie is a standing mark on the equation rather than a verdict on the learner, so it may
  // not borrow the correctness palette.
  const tie = host.querySelector("[data-exponent-tie]") as SVGPathElement;
  expect(tie.getAttribute("stroke"), "a standing mark took the correctness palette").toBe(
    "var(--signal-deep)",
  );

  await waitFor(
    () => host.querySelector('[data-latex="2^{5}"] .katex') !== null,
    "KaTeX draws the rewritten side",
  );
  const left = ink(host, "rewritten", "2^{x + 1}");
  const equals = ink(host, "rewritten", "=");
  const right = ink(host, "rewritten", "2^{5}");
  // A floor under each, because two zero-width boxes never overlap and would pass the reading
  // test below while painting nothing at all.
  expect(left.width, "the left side was typeset with no ink").toBeGreaterThan(0);
  expect(equals.width, "the equals sign was typeset with no ink").toBeGreaterThan(0);
  expect(right.width, "the right side was typeset with no ink").toBeGreaterThan(0);
  expect(left.right, "the left side runs into the equals sign").toBeLessThanOrEqual(
    equals.left,
  );
  expect(equals.right, "the equals sign runs into the right side").toBeLessThanOrEqual(
    right.left,
  );
});

/**
 * The two equations are a before and an after of ONE equation, so they have to read as a pair.
 *
 * That is a claim about two rows together, which is why it is measured here rather than left to
 * the reading test above: each row can be internally unbroken while the pair is out of true. The
 * defect this was written for is what block-centring costs. The dealt row was one centred label
 * and the rewritten row was three pieces pinned to a column, and because a left side of
 * `2^{x + 1}` is wider than a right side of `32`, centring the first put its relation about
 * thirteen device pixels right of the second's and dragged the left side the two rows SHARE off
 * by about sixteen. Both rows carry the identical left side, so nothing here needs KaTeX's
 * metrics: hang both on one column and the shared side lands on itself.
 *
 * The arrow and the tie are measured in the same test because they are the same claim about the
 * same axis. Both stood on the centre line, in overlapping bands, so the arrowhead landed on the
 * dashed arc.
 */
test("EquationSameBaseStepper hangs both equations on one column, clear of the arrow", async () => {
  h = board();
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the board mounts",
  );

  answer(host, "5");
  await waitFor(
    () => host.querySelector('[data-row="rewritten"] [data-latex="2^{5}"] .katex') !== null,
    "KaTeX draws the rewritten side",
  );

  const dealtEquals = ink(host, "dealt", "=");
  const rewrittenEquals = ink(host, "rewritten", "=");
  // The floor: two zero-width boxes share every column there is.
  expect(dealtEquals.width, "the dealt relation was typeset with no ink").toBeGreaterThan(
    0,
  );
  expect(rewrittenEquals.width, "the rewritten relation has no ink").toBeGreaterThan(0);
  expect(
    Math.abs(centre(dealtEquals) - centre(rewrittenEquals)),
    "the two equations' relations sit in different columns, so the pair reads as two separate lines",
  ).toBeLessThan(1);

  const dealtLeft = ink(host, "dealt", "2^{x + 1}");
  const rewrittenLeft = ink(host, "rewritten", "2^{x + 1}");
  expect(dealtLeft.width, "the dealt left side was typeset with no ink").toBeGreaterThan(0);
  expect(
    Math.abs(dealtLeft.right - rewrittenLeft.right),
    "the left side is the same expression in both rows and does not land in the same place",
  ).toBeLessThan(1);

  const tie = (
    host.querySelector("[data-exponent-tie]") as SVGPathElement
  ).getBoundingClientRect();
  const head = (
    host.querySelector("[data-rewrite-arrowhead]") as SVGPathElement
  ).getBoundingClientRect();
  expect(head.height, "the arrowhead was drawn with no extent").toBeGreaterThan(0);
  expect(tie.height, "the tie was drawn with no extent").toBeGreaterThan(0);
  expect(
    tie.top,
    "the arrowhead reaches into the tie's band, so the two marks cross",
  ).toBeGreaterThan(head.bottom);
  expect(
    Math.abs(centre(tie) - centre(rewrittenEquals)),
    "the tie is not centred on the column the equations hang on",
  ).toBeLessThan(2);
});
