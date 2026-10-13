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
import { ExpFactorSlider } from "./ExpFactorSlider";

/**
 * Two answers, one gate. The dial has to land on the factor the readings share AND the box
 * has to hold what that factor predicts next, so a widget that gated on either one alone
 * would let a learner past on a dial they had swept through five positions.
 */
function dial(host: HTMLElement): HTMLInputElement {
  const range = host.querySelector<HTMLInputElement>('input[type="range"]');
  if (!range) {
    throw new Error("no factor dial");
  }
  return range;
}

function entry(host: HTMLElement): HTMLInputElement {
  const box = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (!box) {
    throw new Error("no reading box");
  }
  return box;
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("ExpFactorSlider gates on the shared factor and the reading it predicts", async () => {
  let completed = 0;
  h = mount(<ExpFactorSlider onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector('input[type="range"]') !== null, "dial mounts");

  // The first board reads 5, 20, 80, so the factor is 4 and the next reading is 320. Until
  // the learner produces both, the unknown slot and the arcs stay question marks.
  expect(hasMath(host, "\\times \\; ?")).toBe(true);

  // The right reading behind a dial still on its opening position is not the answer.
  setInputValue(entry(host), "320");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Divide each reading"), "the wrong factor is refused");
  expect(dial(host).disabled, "a refused pair leaves the dial live").toBe(false);
  expect(completed).toBe(0);

  // The right dial behind a reading that is one more addition rather than one more
  // multiplication is not the answer either. Moving the dial clears the nudge first, so the
  // second refusal is its own and not the first one still on screen.
  setInputValue(dial(host), "4");
  await waitFor(
    () => !hasText(host, "Divide each reading"),
    "moving the dial clears the nudge",
  );
  setInputValue(entry(host), "140");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Divide each reading"), "the wrong reading is refused");
  expect(dial(host).disabled).toBe(false);
  expect(completed).toBe(0);

  setInputValue(entry(host), "320");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "gates on the factor and the reading together");
  expect(hasMath(host, "\\times 4")).toBe(true);
  expect(hasMath(host, "320")).toBe(true);
});

test("ExpFactorSlider offers its reveal only after a real attempt", async () => {
  h = mount(<ExpFactorSlider />);
  const { host } = h;
  await waitFor(() => host.querySelector('input[type="range"]') !== null, "dial mounts");

  expect(hasText(host, "Reveal")).toBe(false);

  setInputValue(entry(host), "100");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Reveal"), "the reveal is offered after an attempt");
});
