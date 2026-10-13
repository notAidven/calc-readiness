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
import { PercentSlider } from "./PercentSlider";

/** The widget's repeated phrase, as the LaTeX it hands KaTeX. */
const PERCENT_OF_60 = (pct: number) => `${pct}\\% \\text{ of } 60`;

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

function rangeInput(host: HTMLElement): HTMLInputElement {
  const el = host.querySelector<HTMLInputElement>("#num5-percent");
  if (!el) {
    throw new Error("range input not found");
  }
  return el;
}

function amountInput(host: HTMLElement): HTMLInputElement {
  const el = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (!el) {
    throw new Error("amount input not found");
  }
  return el;
}

test("PercentSlider hides the amount until a guess is committed (not brute-forceable)", async () => {
  let completed = 0;
  h = mount(<PercentSlider onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector("#num5-percent") !== null, "slider mounts");

  // Dragging alone never reveals the amount: the readout stays "?".
  setInputValue(rangeInput(host), "25");
  await waitFor(() => hasMath(host, PERCENT_OF_60(25)), "percent updates");
  expect(hasMath(host, "?"), "amount hidden until committed").toBe(true);
  expect(completed).toBe(0);
});

test("PercentSlider gates only on the correct typed amount at the target percent", async () => {
  let completed = 0;
  h = mount(<PercentSlider onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector("#num5-percent") !== null, "slider mounts");

  setInputValue(rangeInput(host), "25");

  // A wrong amount does not gate.
  setInputValue(amountInput(host), "20");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Not quite"), "wrong guess nudged");
  expect(completed).toBe(0);

  // The correct amount gates and reveals the confirmation.
  setInputValue(amountInput(host), "15");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Exactly."), "correct guess solves");
  expect(hasMath(host, PERCENT_OF_60(25))).toBe(true);
  expect(completed).toBe(1);
});

test("PercentSlider rejects the right amount typed at the wrong percent", async () => {
  let completed = 0;
  h = mount(<PercentSlider onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector("#num5-percent") !== null, "slider mounts");

  setInputValue(rangeInput(host), "50");
  setInputValue(amountInput(host), "15");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "That's the amount at"), "wrong percent nudged");
  expect(hasMath(host, "50\\%")).toBe(true);
  expect(completed).toBe(0);
});
