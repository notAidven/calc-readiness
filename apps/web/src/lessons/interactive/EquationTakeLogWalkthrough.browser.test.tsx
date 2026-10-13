import { afterEach, expect, test } from "vitest";

import {
  findButton,
  type Harness,
  hasMath,
  hasText,
  mount,
  setInputValue,
  waitFor,
} from "../testHarness";
import { WidgetFeedbackHost } from "../widgetFeedback";
import type { LessonWidgetProps } from "../widgetMechanics";
import { EquationTakeLogWalkthrough } from "./EquationTakeLogWalkthrough";

/**
 * The animation lays the algebra out on the equation itself and then stops one division
 * short, so reaching the last line must produce nothing on its own: the gate is spent on the
 * value the learner works out, and an under-rounded entry is refused because the stated
 * precision is a floor rather than a format.
 *
 * Each refusal gets its OWN board. The wrong-answer copy is one string, so a second Check on
 * a board already showing it would be satisfied by the first attempt's feedback and would
 * prove nothing about the second.
 */

let boards: Harness[] = [];

afterEach(() => {
  for (const board of boards) {
    board.cleanup();
  }
  boards = [];
});

/** A bare board, as the review page renders it. */
function deal(props: LessonWidgetProps = {}): HTMLElement {
  const harness = mount(<EquationTakeLogWalkthrough {...props} />);
  boards.push(harness);
  return harness.host;
}

/** And one inside the shared feedback host, which is where the badge and the reveal live. */
function dealInHost(props: LessonWidgetProps = {}): HTMLElement {
  const harness = mount(
    <WidgetFeedbackHost>
      <EquationTakeLogWalkthrough {...props} />
    </WidgetFeedbackHost>,
  );
  boards.push(harness);
  return harness.host;
}

function entry(host: HTMLElement): HTMLInputElement {
  const box = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (!box) {
    throw new Error("nothing is being asked");
  }
  return box;
}

function state(host: HTMLElement): string | null {
  return (
    host.querySelector(".lesson-interactive__status")?.getAttribute("data-state") ?? null
  );
}

async function layItOut(host: HTMLElement): Promise<void> {
  await waitFor(() => Boolean(findButton(host, "Step")), "the walkthrough mounts");
  for (let taps = 0; taps < 4; taps += 1) {
    findButton(host, "Step").click();
  }
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "the equation is laid out",
  );
}

test("EquationTakeLogWalkthrough lays the algebra out in order and stops before the value", async () => {
  let completed = 0;
  const host = deal({ onComplete: () => completed++ });
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the walkthrough mounts",
  );

  // The equation is on the board from the start; nothing has been done to it yet.
  expect(hasMath(host, "5^{x} = 40")).toBe(true);
  expect(hasMath(host, "\\log\\left(5^{x}\\right) = \\log 40")).toBe(false);
  expect(host.querySelector("input.lesson-interactive__input")).toBe(null);

  findButton(host, "Step").click();
  await waitFor(
    () => hasMath(host, "\\log\\left(5^{x}\\right) = \\log 40"),
    "a logarithm is taken of both sides",
  );
  expect(hasMath(host, "x \\log 5 = \\log 40"), "the exponent came down early").toBe(false);
  expect(host.querySelector("input.lesson-interactive__input")).toBe(null);

  findButton(host, "Step").click();
  await waitFor(
    () => hasMath(host, "x \\log 5 = \\log 40"),
    "the exponent comes down in front as a coefficient",
  );
  expect(hasMath(host, "x = \\dfrac{\\log 40}{\\log 5}"), "the division came early").toBe(
    false,
  );
  expect(host.querySelector("input.lesson-interactive__input")).toBe(null);

  findButton(host, "Step").click();
  await waitFor(
    () => hasMath(host, "x = \\dfrac{\\log 40}{\\log 5}"),
    "dividing isolates the unknown",
  );
  expect(
    host.querySelector("input.lesson-interactive__input"),
    "the value was asked for before the board was laid out",
  ).toBe(null);

  findButton(host, "Step").click();
  await waitFor(
    () => hasMath(host, "\\log 40 \\approx 1.6021"),
    "the two readings are printed to four places",
  );
  expect(hasMath(host, "\\dfrac{1.6021}{0.6990}")).toBe(true);
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "the value is asked for once the board is laid out",
  );

  // Every line is on the board and nothing has been answered, so the gate is still shut.
  expect(completed, "stepping to the end opened the gate").toBe(0);
  expect(state(host)).toBe("prompt");
});

test("EquationTakeLogWalkthrough plays itself out and still asks for the value", async () => {
  let completed = 0;
  const playing: boolean[] = [];
  const host = deal({
    onComplete: () => completed++,
    onPlayingChange: (live) => playing.push(live),
  });
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the walkthrough mounts",
  );

  findButton(host, "Play").click();
  await waitFor(() => playing.includes(true), "the player is told an animation is live");
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "playing lays the whole board out",
    20000,
  );
  await waitFor(
    () => playing[playing.length - 1] === false,
    "the player is told the animation stopped",
  );
  expect(completed, "playing to the end opened the gate").toBe(0);
}, 30000);

test("EquationTakeLogWalkthrough refuses a wrong or under-rounded value and takes the exact one", async () => {
  // Dividing the two readings the other way round is the first thing to get wrong.
  const flipped = deal();
  await layItOut(flipped);
  setInputValue(entry(flipped), "0.436");
  findButton(flipped, "Check").click();
  await waitFor(() => state(flipped) === "wrong", "the flipped quotient is refused");
  expect(
    hasText(flipped, "Divide 1.6021 by 0.6990"),
    "the refusal did not name the division to do",
  ).toBe(true);

  // Rounding the readings before dividing lands on 2.29, and precision is a floor.
  const under = deal();
  await layItOut(under);
  setInputValue(entry(under), "2.29");
  findButton(under, "Check").click();
  await waitFor(() => state(under) === "wrong", "an under-rounded value is refused");
  expect(hasText(under, "round only the answer, to three decimal places")).toBe(true);

  // The value asked for, to the place asked for.
  let completed = 0;
  const exact = deal({ onComplete: () => completed++ });
  await layItOut(exact);
  setInputValue(entry(exact), "2.292");
  findButton(exact, "Check").click();
  await waitFor(() => state(exact) === "solved", "the rounded value is taken");
  expect(hasMath(exact, "x \\approx 2.292")).toBe(true);
  expect(completed).toBe(1);

  // And a learner who carried more digits than were asked for is right too.
  let carried = 0;
  const more = deal({ onComplete: () => carried++ });
  await layItOut(more);
  setInputValue(entry(more), "2.29202967");
  findButton(more, "Check").click();
  await waitFor(() => state(more) === "solved", "extra digits are accepted");
  expect(carried).toBe(1);
});

test("EquationTakeLogWalkthrough pops the badge on the learner's own value and latches once", async () => {
  let completed = 0;
  const host = dealInHost({ onComplete: () => completed++ });
  await layItOut(host);

  setInputValue(entry(host), "2.292");
  findButton(host, "Check").click();
  await waitFor(
    () => host.querySelector(".lesson-feedback-badge") !== null,
    "the correct value pops the success badge",
  );
  expect(completed).toBe(1);

  // Nothing left to answer, so nothing left to latch: the field and Check are gone and the
  // only control on the board deals a new one.
  expect(host.querySelector("input.lesson-interactive__input")).toBe(null);
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(completed, "the gate latched more than once").toBe(1);
});

test("EquationTakeLogWalkthrough offers its reveal only after a real attempt, and it never counts", async () => {
  let completed = 0;
  const host = dealInHost({ onComplete: () => completed++ });
  await layItOut(host);
  expect(hasText(host, "Reveal"), "the reveal was offered before an attempt").toBe(false);

  setInputValue(entry(host), "2.29");
  findButton(host, "Check").click();
  await waitFor(
    () => hasText(host, "Reveal the value"),
    "the reveal is offered after an attempt",
  );

  findButton(host, "Reveal the value").click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal") !== null,
    "the reveal teaches the step",
  );
  const stated = host.querySelector(".lesson-interactive__reveal-answer [data-latex]");
  expect(stated?.getAttribute("data-latex"), "the passage did not state the answer").toBe(
    "2.292",
  );
  expect(
    host.querySelector(".lesson-feedback-badge"),
    "a revealed answer popped the success badge",
  ).toBeNull();
  expect(completed, "a revealed answer opened the gate").toBe(0);

  // The reveal taken on a REDRAWN instance is the one that runs the widget's own
  // fill-in-and-unlock, so it is the only one that can reach the success branch. It opens
  // the gate, by the shared rule, and it still must not be mistaken for an answer.
  findButton(host, "Try again with different numbers").click();
  await waitFor(() => hasMath(host, "3^{x} = 20"), "the re-ask deals a different equation");
  await layItOut(host);
  setInputValue(entry(host), "2.72");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Reveal the value"), "the reveal is offered again");

  findButton(host, "Reveal the value").click();
  await waitFor(() => completed === 1, "the second reveal lets the learner past");
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(
    host.querySelector(".lesson-feedback-badge"),
    "the reveal that opens the gate was celebrated as the learner's own work",
  ).toBeNull();
});

test("EquationTakeLogWalkthrough deals a different equation on a restart and shuts the gate again", async () => {
  let completed = 0;
  let reopened = 0;
  const host = deal({ onComplete: () => completed++, onReopen: () => reopened++ });
  await layItOut(host);
  setInputValue(entry(host), "2.292");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "the first equation is answered");

  findButton(host, "Start over on a different equation").click();
  await waitFor(() => hasMath(host, "3^{x} = 20"), "a different equation is dealt");
  expect(hasMath(host, "5^{x} = 40"), "the same equation came back").toBe(false);
  expect(reopened, "the gate stayed open across the restart").toBe(1);
  expect(
    host.querySelector("input.lesson-interactive__input"),
    "the new equation arrived already laid out",
  ).toBe(null);

  // The new instance gates on its own value, worked from its own readings.
  await layItOut(host);
  expect(hasMath(host, "\\dfrac{1.3010}{0.4771}")).toBe(true);
  setInputValue(entry(host), "2.727");
  findButton(host, "Check").click();
  await waitFor(() => completed === 2, "the second equation gates on its own value");
});

test("EquationTakeLogWalkthrough typesets its math and names every value in words", async () => {
  const host = deal();
  await layItOut(host);

  const diagram = host.querySelector("svg[role='img']");
  expect(diagram?.getAttribute("aria-label")).toContain("5 to the x equals 40");
  expect(diagram?.getAttribute("aria-label")).toContain("about 1.6021");
  expect(entry(host).getAttribute("aria-label")).toBe(
    "The value of x in 5 to the x equals 40, to three decimal places",
  );

  // The board's math is KaTeX rather than SVG text, so no `<text>` node carries an
  // expression: the plain nodes left are the step counter and the between-powers aside.
  const plain = Array.from(host.querySelectorAll("svg text")).map(
    (node) => node.textContent,
  );
  expect(plain.every((line) => !/[=^]/.test(line ?? ""))).toBe(true);
  expect(host.querySelectorAll(".katex").length).toBeGreaterThan(4);
});
