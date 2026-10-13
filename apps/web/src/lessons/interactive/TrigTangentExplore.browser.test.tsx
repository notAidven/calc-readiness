import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, mount, setInputValue, waitFor } from "../testHarness";
import { TrigTangentExplore } from "./TrigTangentExplore";

/**
 * Two claims, and the first is the one worth a test at all: **the stepper alone opens
 * nothing**. It walks the beam from upright to eighty-eight degrees and the readout is in
 * mast-heights rather than in meters, so a learner who presses it to the end has read
 * $\tan 88^{\circ}$ and has answered none of the three questions. A widget that latched on
 * the last notch would look identical on screen and would gate on nothing.
 *
 * The second is that each part is judged on its own, so a wrong answer to the first part
 * leaves the board where it was rather than costing the whole instance.
 *
 * Progress is read off `data-part-slot`'s state rather than off the text, because KaTeX emits
 * every glyph twice and a board showing `12` contains the string `1212`.
 */
function solved(host: HTMLElement): number {
  return host.querySelectorAll('[data-part-slot][data-state="solved"]').length;
}

function field(host: HTMLElement): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (!input) {
    throw new Error("no answer field");
  }
  return input;
}

async function answer(host: HTMLElement, value: string): Promise<void> {
  setInputValue(field(host), value);
  findButton(host, "Check").click();
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigTangentExplore opens nothing on the stepper alone", async () => {
  let completed = 0;
  h = mount(<TrigTangentExplore onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector("svg") !== null, "the yard draws");

  const swing = findButton(host, "Swing further");
  for (let press = 0; press < 8; press += 1) {
    if (!swing.disabled) {
      swing.click();
    }
  }
  await waitFor(() => findButton(host, "Swing further").disabled, "the stepper runs out");

  expect(solved(host), "stepping is not answering").toBe(0);
  expect(completed, "the gate stays shut on the stepper alone").toBe(0);
});

test("TrigTangentExplore gates only once all three headings are typed", async () => {
  let completed = 0;
  h = mount(<TrigTangentExplore onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector("svg") !== null, "the yard draws");

  // The first board hangs its dish 12 meters up, so a 45 degree swing lands one mast-height
  // out, which is 12 meters. The reading on the board is 1.00, never 12.
  await answer(host, "12");
  await waitFor(() => solved(host) === 1, "the reach converts through the height");
  expect(completed).toBe(0);

  await answer(host, "90");
  await waitFor(() => solved(host) === 2, "the quarter turn is the break");
  expect(completed).toBe(0);

  await answer(host, "270");
  await waitFor(() => completed === 1, "gates on the third heading");
});

test("TrigTangentExplore refuses a wrong reach and keeps the part open", async () => {
  let completed = 0;
  h = mount(<TrigTangentExplore onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector("svg") !== null, "the yard draws");

  // 1 is the readout in mast-heights, which is the value a learner reads off instead of
  // converting it. The part stays open and the gate stays shut.
  await answer(host, "1");
  await waitFor(
    () => host.querySelector('.lesson-interactive__status[data-state="wrong"]') !== null,
    "the unconverted reading is refused",
  );
  expect(solved(host)).toBe(0);
  expect(completed).toBe(0);

  await answer(host, "12");
  await waitFor(() => solved(host) === 1, "the converted distance still lands afterwards");
  expect(completed).toBe(0);
});
