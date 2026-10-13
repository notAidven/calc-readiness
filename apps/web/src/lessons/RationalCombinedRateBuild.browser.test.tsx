/**
 * The RAT.6 combined-rate widget in a real browser.
 *
 * The registry sweep in `visuals.browser.test.tsx` only ever sees this widget's FIRST
 * frame, where the bar, the rate equation and the cleared line have not been drawn yet.
 * These cases walk all three beats, so every row that appears later is laid out and
 * measured too, and they pin the three corrections the widget exists to deliver: times do
 * not add, a time is not a rate, and a rate is not a time.
 */

import { afterEach, expect, test } from "vitest";

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

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * A control by its `aria-label`. The rate chips hold nothing but KaTeX, whose MathML
 * duplicates every glyph, so their `textContent` is unusable as a selector.
 */
function findAria(root: ParentNode, label: string): HTMLButtonElement {
  const match = root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!match) {
    throw new Error(`no control labelled: ${label}`);
  }
  return match;
}

/** Every KaTeX node in the figure occupies real space inside its `foreignObject`. */
function expectLaidOut(host: HTMLElement, label: string): void {
  const boxes = Array.from(host.querySelectorAll("svg foreignObject"));
  expect(boxes.length, `${label}: the figure has math`).toBeGreaterThan(0);
  for (const box of boxes) {
    const katex = box.querySelector<HTMLElement>(".katex");
    if (!katex) {
      throw new Error(`${label}: a foreignObject rendered no KaTeX`);
    }
    const rect = katex.getBoundingClientRect();
    expect(rect.width, `${label}: math has width`).toBeGreaterThan(0);
    expect(rect.height, `${label}: math has height`).toBeGreaterThan(0);
  }
}

/** Walk one round from the bound through the solve, typing `typed` as the together time. */
async function solveRound(host: HTMLElement, a: number, b: number, typed: string) {
  const fast = Math.min(a, b);
  findAria(host, `less than ${fast} hours`).click();
  await waitFor(() => hasMath(host, `t < ${fast}`), `the bound posts for ${a} and ${b}`);

  findAria(host, `place 1 over ${a}`).click();
  findAria(host, `place 1 over ${b}`).click();
  await waitFor(() => inputs(host).length === 1, `the solve field opens for ${a} and ${b}`);

  setInputValue(inputs(host)[0] as HTMLInputElement, typed);
  findButton(host, "Check").click();
}

test("the widget rejects the times-added answer before any algebra runs", async () => {
  let completed = 0;
  h = mount(
    <LessonVisual id="rational-combined-rate-build" onComplete={() => completed++} />,
  );
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length > 0, "widget mounts");

  const slower = findAria(host, "more than 12 hours");
  slower.click();
  await waitFor(
    () => hasText(host, "cannot make the job take longer"),
    "adding the two times is refused",
  );
  expect(slower.disabled, "the wrong chip locks itself").toBe(true);

  findAria(host, "between 6 and 12 hours").click();
  await waitFor(
    () => hasText(host, "helping the whole time"),
    "the average is refused too",
  );
  expect(completed, "neither miss gates the lesson").toBe(0);
});

test("the widget builds the rate equation, then solves it and gates", async () => {
  let completed = 0;
  h = mount(
    <LessonVisual id="rational-combined-rate-build" onComplete={() => completed++} />,
  );
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length > 0, "widget mounts");

  findAria(host, "less than 6 hours").click();
  await waitFor(() => hasMath(host, "t < 6"), "the bound posts to the figure");

  // A raw solo time is the confusion this beat exists to catch.
  const rawTime = findAria(host, "place 6");
  rawTime.click();
  await waitFor(
    () => hasText(host, "is a time, not a rate"),
    "a time cannot fill a rate slot",
  );
  expect(rawTime.disabled, "the wrong chip locks itself").toBe(true);

  findAria(host, "place 1 over 18").click();
  await waitFor(
    () => hasText(host, "over the two times added"),
    "one over the summed times is refused",
  );

  findAria(host, "place 1 over 6").click();
  findAria(host, "place 1 over 12").click();
  await waitFor(() => hasMath(host, "2t + t = 12"), "clearing the LCD posts to the figure");
  expect(completed, "building the equation is not yet the answer").toBe(0);

  // The combined rate is the other half of the same confusion, in the other direction.
  const field = inputs(host)[0] as HTMLInputElement;
  setInputValue(field, "1/4");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Flip that fraction over"), "a rate is not a time");
  expect(completed).toBe(0);

  setInputValue(field, "4");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "gates once the together time is right");
  expect(hasMath(host, "t = 4"), "the answer posts to the figure").toBe(true);
  expectLaidOut(host, "round one solved");
});

test("try another rotates to a round whose together time is a fraction", async () => {
  let completed = 0;
  h = mount(
    <LessonVisual id="rational-combined-rate-build" onComplete={() => completed++} />,
  );
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length > 0, "widget mounts");

  await solveRound(host, 6, 12, "4");
  await waitFor(() => completed === 1, "round one gates");

  findButton(host, "Try another").click();
  await waitFor(() => hasMath(host, "\\text{A alone: } 3"), "round two mounts");

  // 1/3 + 1/5 = 8/15, so the together time is 15/8: the shape practice actually serves.
  await solveRound(host, 3, 5, "15/8");
  await waitFor(() => hasMath(host, "t = \\dfrac{15}{8}"), "the fraction is accepted");
  expect(completed, "the gate fires once, not once per round").toBe(1);
  expectLaidOut(host, "round two solved");
});
