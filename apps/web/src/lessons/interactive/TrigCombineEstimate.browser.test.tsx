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
import { TrigCombineEstimate } from "./TrigCombineEstimate";

/**
 * Two rounds, one scale, one gate. The widget delegates to `kinds/EstimateThenCheck`, so what is
 * asserted here is this board's own claim rather than the kind's mechanics.
 *
 * **That claim is that adding the readings is refused.** The dashed landmark sits exactly where a
 * learner who adds $\cos 45^{\circ}$ and $\cos 30^{\circ}$ parks the marker, and the first test
 * commits that spot and requires the board to say so. A tolerance loose enough to accept it would
 * make the slide a slider with a button on it, and the misconception it exists to break is the
 * only thing on the board a learner arrives holding.
 *
 * The second test is about the restart, and it is stronger than "something changed": the fresh
 * board's first round is $\cos 90^{\circ}$, so the previous board's answer is not merely stale but
 * a different number, and committing it has to be refused.
 */
function range(host: HTMLElement): HTMLInputElement {
  const el = host.querySelector<HTMLInputElement>("input.lesson-interactive__range");
  if (!el) {
    throw new Error("no scale on the board");
  }
  return el;
}

/** Park the marker and commit it. */
function commit(host: HTMLElement, at: string): void {
  setInputValue(range(host), at);
  findButton(host, "Check this spot").click();
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigCombineEstimate refuses the two readings added together", async () => {
  let completed = 0;
  h = mount(<TrigCombineEstimate onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive__range") !== null,
    "it mounts",
  );
  expect(hasMath(host, "\\cos 75^{\\circ}"), "the first reading is dealt").toBe(true);
  expect(hasMath(host, "1.573"), "the landmark is where adding them lands").toBe(true);

  // The sum of the two separate cosines, which is what the instinct produces and is not a
  // reading any angle has.
  commit(host, "1.57");
  await waitFor(() => hasText(host, "too far right"), "adding the readings is refused");
  expect(completed).toBe(0);
  expect(hasMath(host, "= 0.259"), "a refused guess does not print the value").toBe(false);

  commit(host, "0.26");
  await waitFor(
    () => hasMath(host, "= 0.259"),
    "the true reading is drawn beside the marker",
  );
  expect(completed, "one round of two is not the board").toBe(0);

  findButton(host, "Next: another one to place").click();
  await waitFor(() => hasMath(host, "\\sin 75^{\\circ}"), "the second reading is dealt");

  // The same slip on the sine, where the sum is closer and still impossible.
  commit(host, "1.21");
  await waitFor(() => hasText(host, "too far right"), "the sine sum is refused too");
  expect(completed).toBe(0);

  commit(host, "0.97");
  await waitFor(() => completed === 1, "the second round opens the gate");
  expect(hasMath(host, "= 0.966")).toBe(true);
  expect(completed, "the gate opens exactly once").toBe(1);
});

test("TrigCombineEstimate deals a different pair of rotations on restart", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <TrigCombineEstimate onComplete={() => completed++} onReopen={() => reopened++} />,
  );
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive__range") !== null,
    "it mounts",
  );

  commit(host, "0.26");
  await waitFor(() => hasMath(host, "= 0.259"), "the first round settles");
  findButton(host, "Next: another one to place").click();
  commit(host, "0.97");
  await waitFor(() => completed === 1, "the first board closes");

  findButton(host, "Start over with a different pair of rotations").click();
  await waitFor(() => reopened === 1, "the gate closes behind the restart");
  await waitFor(
    () => hasMath(host, "\\cos 90^{\\circ}"),
    "a different combined heading is dealt",
  );
  expect(hasMath(host, "\\cos 75^{\\circ}"), "not the first board's heading").toBe(false);

  // The previous board's answer is a real reading of a different angle, so it is refused here.
  commit(host, "0.26");
  await waitFor(
    () => hasText(host, "too far right"),
    "a different rotation, a different reading",
  );
  expect(completed, "a refused guess cannot re-open the gate").toBe(1);

  commit(host, "0.00");
  await waitFor(
    // Two decimals, not three: the kind states a true value at the precision the scale steps
    // in unless the value needs more, and a quarter turn's cosine is exactly zero.
    () => hasMath(host, "\\text{to 2 dp} = 0.00"),
    "the quarter turn settles on its own reading",
  );
});

test("TrigCombineEstimate offers its reveal only after a committed guess misses", async () => {
  h = mount(<TrigCombineEstimate />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive__range") !== null,
    "it mounts",
  );

  // Dragging alone is not an answer, so nothing is on offer for having moved the marker.
  setInputValue(range(host), "1.57");
  expect(hasText(host, "Reveal"), "no reveal before a guess is committed").toBe(false);

  findButton(host, "Check this spot").click();
  await waitFor(
    () => hasText(host, "Reveal where it lands"),
    "the reveal is offered after a miss",
  );
});
