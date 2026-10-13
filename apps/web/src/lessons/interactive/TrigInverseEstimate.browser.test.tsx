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
import { TrigInverseEstimate } from "./TrigInverseEstimate";

/**
 * Two rounds, one scale, one gate. The widget delegates to `kinds/EstimateThenCheck`, so what
 * is asserted here is this board's own claim rather than the kind's mechanics.
 *
 * **That claim is the size of the gap.** Eight along for every fifteen across is a ratio of
 * about a half, and a learner who reads a ratio as a share of the quarter turn parks the marker
 * near 48 degrees when the bearing is 28. The first test walks that misconception in and
 * requires the board to refuse it, because a tolerance wide enough to accept it would turn the
 * slide into a slider with a button on it.
 *
 * The offsets are the four pairs `d9.trg7.arctan-round.l3` rejected for sitting too near a
 * two-place rounding boundary, so the practice item and this board partition the pairs rather
 * than competing for them. Nothing here is a bearing the practice set asks for.
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

test("TrigInverseEstimate refuses the ratio read as a share of the quarter turn", async () => {
  let completed = 0;
  h = mount(<TrigInverseEstimate onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive__range") !== null,
    "it mounts",
  );
  expect(hasMath(host, "\\arctan \\dfrac{8}{15}"), "the first pair is dealt").toBe(true);

  // Eight fifteenths of ninety degrees, which is what the ratio looks like and is not the
  // bearing. Twenty degrees out, and the board has to say so.
  commit(host, "48");
  await waitFor(() => hasText(host, "too far right"), "the proportional guess is refused");
  expect(completed).toBe(0);
  expect(hasMath(host, "= 28.072"), "a refused guess does not print the bearing").toBe(
    false,
  );

  commit(host, "28");
  await waitFor(() => hasMath(host, "= 28.072"), "the bearing is drawn beside the marker");
  expect(completed, "one round of two is not the answer").toBe(0);

  findButton(host, "Next: another one to place").click();
  await waitFor(() => hasMath(host, "\\arctan \\dfrac{9}{4}"), "the second pair is dealt");

  // Over the landmark this time, because the along offset is now the larger of the two.
  commit(host, "66");
  await waitFor(() => completed === 1, "the second round opens the gate");
  expect(hasMath(host, "= 66.038")).toBe(true);
  expect(completed, "the gate opens exactly once").toBe(1);
});

test("TrigInverseEstimate deals two different pairs of offsets on restart", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <TrigInverseEstimate onComplete={() => completed++} onReopen={() => reopened++} />,
  );
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive__range") !== null,
    "it mounts",
  );

  commit(host, "28");
  await waitFor(() => hasMath(host, "= 28.072"), "the first round settles");
  findButton(host, "Next: another one to place").click();
  commit(host, "66");
  await waitFor(() => completed === 1, "the first board closes");

  findButton(host, "Start over with two different pairs of offsets").click();
  await waitFor(() => reopened === 1, "the gate closes behind the restart");
  await waitFor(() => hasMath(host, "\\arctan \\dfrac{4}{9}"), "a fresh pair is dealt");
  expect(hasMath(host, "\\arctan \\dfrac{8}{15}"), "not the first board's pair").toBe(
    false,
  );

  // The first board's answer is no longer the bearing, so committing it is refused.
  commit(host, "28");
  await waitFor(
    () => hasText(host, "too far right"),
    "a different pair, a different bearing",
  );
  expect(completed, "a refused guess cannot re-open the gate").toBe(1);

  commit(host, "24");
  await waitFor(
    () => hasMath(host, "= 23.962"),
    "the fresh round settles on its own bearing",
  );
});

test("TrigInverseEstimate offers its reveal only after a committed guess misses", async () => {
  h = mount(<TrigInverseEstimate />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-interactive__range") !== null,
    "it mounts",
  );

  // Dragging alone is not an answer, so nothing is on offer for having moved the marker.
  setInputValue(range(host), "48");
  expect(hasText(host, "Reveal"), "no reveal before a guess is committed").toBe(false);

  findButton(host, "Check this spot").click();
  await waitFor(
    () => hasText(host, "Reveal where it lands"),
    "the reveal is offered after a miss",
  );
});
