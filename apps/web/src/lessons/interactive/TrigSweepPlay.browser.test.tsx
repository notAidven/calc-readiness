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
} from "../testHarness";
import { TrigSweepPlay } from "./TrigSweepPlay";

/**
 * The bespoke sweep board: one full turn, then BOTH headings at the marked strength.
 *
 * The first board is $\cos x = \tfrac{1}{2}$, whose two headings are 60 and 300 degrees. The
 * tests below are about the three properties the brief pins on this widget: the animation
 * stops before the answer, the gate needs both headings rather than one, and a restart deals
 * a different board.
 */

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

/** Walk the dish round to the end of its turn with the keyboard-safe Step control. */
async function sweep(host: HTMLElement): Promise<void> {
  for (let i = 0; i < 12; i += 1) {
    findButton(host, "Step").click();
  }
  await waitFor(() => inputs(host).length === 1, "the entry appears once the turn closes");
}

/**
 * A KaTeX node typeset from EXACTLY this LaTeX.
 *
 * `hasMath` is a substring test, and the heading readout printed while the dish travels ends
 * the turn reading `x = 360^{\circ}`, which contains `60^{\circ}`. So the assertion that a
 * heading has been MARKED has to be an exact one, or it passes on the transport label.
 */
function marked(host: HTMLElement, latex: string): boolean {
  return Array.from(host.querySelectorAll("[data-latex]")).some(
    (node) => node.getAttribute("data-latex") === latex,
  );
}

function answer(host: HTMLElement, value: string): void {
  const field = inputs(host)[0];
  if (!field) {
    throw new Error("no entry field on the board");
  }
  setInputValue(field, value);
  findButton(host, "Check").click();
}

test("TrigSweepPlay produces nothing until the turn is swept and both headings are given", async () => {
  let completed = 0;
  h = mount(<TrigSweepPlay onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector("svg") !== null, "the board mounts");

  // The animation is transport. Nothing on the board names a heading at the marked value,
  // and no entry is even offered, so pressing the controls alone cannot open the gate.
  expect(inputs(host).length, "no answer is asked for mid-sweep").toBe(0);
  expect(
    marked(host, "60^{\\circ}"),
    "a heading is not on the board before it is given",
  ).toBe(false);

  await sweep(host);
  expect(completed, "sweeping alone is not an answer").toBe(0);
  expect(marked(host, "60^{\\circ}"), "the closed turn still names no heading").toBe(false);

  answer(host, "60");
  await waitFor(() => marked(host, "60^{\\circ}"), "the first heading lands on the circle");
  expect(completed, "one heading of two does not open the gate").toBe(0);

  answer(host, "300");
  await waitFor(() => completed === 1, "the gate opens on the second heading");
});

test("TrigSweepPlay tells a learner who gives the far heading first that it is the other one", async () => {
  h = mount(<TrigSweepPlay onComplete={() => undefined} />);
  const { host } = h;
  await waitFor(() => host.querySelector("svg") !== null, "the board mounts");
  await sweep(host);

  answer(host, "300");
  await waitFor(
    () => hasText(host, "the sweep reaches the other one first"),
    "the board says which crossing this box wants",
  );

  // A heading nowhere near the mark is refused on its own terms, naming the value typed.
  answer(host, "200");
  await waitFor(
    () => hasText(host, "At 200 degrees the needle is not level with the mark"),
    "an off-mark heading is answered with the reading rather than with a shrug",
  );
});

test("TrigSweepPlay deals a different board on restart", async () => {
  h = mount(<TrigSweepPlay onComplete={() => undefined} onReopen={() => undefined} />);
  const { host } = h;
  await waitFor(() => hasMath(host, "\\cos x"), "the first board is the cosine one");
  await sweep(host);
  answer(host, "60");
  answer(host, "300");

  await waitFor(
    () => host.textContent?.includes("Start over with a different sweep") ?? false,
    "the solved board offers a restart",
  );
  findButton(host, "Start over with a different sweep").click();

  // The second board is the negative sine, so a learner cannot carry the first answer over.
  await waitFor(() => hasMath(host, "\\sin x"), "restart deals the sine board");
  expect(inputs(host).length, "the new board starts before its sweep").toBe(0);
});
