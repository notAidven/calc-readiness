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
import { GeoDiagonalStepper } from "./GeoDiagonalStepper";

/**
 * Two claims worth a test. The stepper must stop at the ROOT and never write the value under
 * it, or "Next step" pressed to the end is the answer printed for free; and the gate must
 * open on the typed length rather than on the last step being reached.
 */
function entry(host: HTMLElement): HTMLInputElement {
  const box = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (!box) {
    throw new Error("no answer box");
  }
  return box;
}

/** How many lines of working the stepper has written so far. */
function stage(host: HTMLElement): string {
  return host.querySelector("[data-stage]")?.getAttribute("data-stage") ?? "gone";
}

/**
 * Walk the working out to its last line, which is where the question starts. The third click
 * takes the stepper button off the board and puts the answer box up in its place, so that
 * step is waited on by the box rather than by a stage count that no longer exists.
 */
async function stepToEnd(host: HTMLElement): Promise<void> {
  findButton(host, "Next step").click();
  await waitFor(() => stage(host) === "1", "the squares are written");
  findButton(host, "Next step").click();
  await waitFor(() => stage(host) === "2", "the squares are combined");
  findButton(host, "Next step").click();
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "the box opens",
  );
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("GeoDiagonalStepper stops at the root and gates on the length typed for it", async () => {
  let completed = 0;
  h = mount(<GeoDiagonalStepper onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => hasText(host, "Next step"), "the stepper mounts");

  // Nothing to answer with before the working is laid out.
  expect(host.querySelector("input.lesson-interactive__input")).toBe(null);

  await stepToEnd(host);

  // The first board is 9 and 12, so the last line is the square root of 225 and the answer
  // it stands for is 15. The board shows the root and withholds the value.
  expect(hasMath(host, "\\sqrt{225}")).toBe(true);
  expect(completed, "reaching the last line is not answering it").toBe(0);

  // 225 is the total UNDER the root, which is the commonest wrong answer here.
  setInputValue(entry(host), "225");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "square root"), "the unrooted total is refused");
  expect(completed).toBe(0);

  setInputValue(entry(host), "15");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "gates on the length the root stands for");
  expect(hasText(host, "Start over with a different figure")).toBe(true);
});

test("GeoDiagonalStepper offers its reveal only after a real attempt", async () => {
  h = mount(<GeoDiagonalStepper />);
  const { host } = h;
  await waitFor(() => hasText(host, "Next step"), "the stepper mounts");

  await stepToEnd(host);
  expect(hasText(host, "Reveal")).toBe(false);

  setInputValue(entry(host), "21");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Reveal"), "the reveal is offered after an attempt");
});
