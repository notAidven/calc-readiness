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
import { LogBaseChangeWalkthrough } from "./LogBaseChangeWalkthrough";

/**
 * The animation lays the computation out and then stops one division short, so stepping to
 * the end must produce nothing on its own: the gate is spent on the value the learner
 * computes, and an under-rounded entry is refused because the stated precision is a floor.
 */
function entry(host: HTMLElement): HTMLInputElement {
  const box = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (!box) {
    throw new Error("nothing is being asked");
  }
  return box;
}

async function layItOut(host: HTMLElement): Promise<void> {
  for (let taps = 0; taps < 4; taps += 1) {
    findButton(host, "Step").click();
  }
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    "the computation is laid out",
  );
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("LogBaseChangeWalkthrough stops before the value and gates on the learner's own", async () => {
  let completed = 0;
  h = mount(<LogBaseChangeWalkthrough onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the walkthrough mounts",
  );

  expect(hasMath(host, "\\log_{5} 20 = \\;?")).toBe(true);
  expect(host.querySelector("input.lesson-interactive__input")).toBe(null);

  await layItOut(host);
  // Every line is on the board and nothing has been answered, so the gate is still shut.
  expect(hasMath(host, "\\log_{b} N = \\dfrac{\\log N}{\\log b}")).toBe(true);
  expect(hasMath(host, "\\dfrac{1.3010}{0.6990}")).toBe(true);
  expect(completed, "playing to the end opened the gate").toBe(0);

  // Rounding early lands on 1.86, and precision is a floor rather than a format.
  setInputValue(entry(host), "1.86");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Not that one"), "an under-rounded value is refused");
  expect(completed).toBe(0);

  // The two readings divided the other way round is the other thing to get wrong.
  setInputValue(entry(host), "0.537");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Not that one"), "the flipped quotient is refused");
  expect(completed).toBe(0);

  setInputValue(entry(host), "1.861");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "the rounded value opens the gate");
  expect(hasMath(host, "\\log_{5} 20 \\approx 1.861")).toBe(true);
  expect(completed, "the gate latches exactly once").toBe(1);
});

test("LogBaseChangeWalkthrough offers its reveal only after a real attempt", async () => {
  h = mount(<LogBaseChangeWalkthrough />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the walkthrough mounts",
  );

  await layItOut(host);
  expect(hasText(host, "Reveal")).toBe(false);

  setInputValue(entry(host), "1.86");
  findButton(host, "Check").click();
  await waitFor(
    () => hasText(host, "Reveal the value"),
    "the reveal is offered after an attempt",
  );
});
