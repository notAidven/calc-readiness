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
import { TrigAmplitudeSlider } from "./TrigAmplitudeSlider";

/**
 * Two rounds, one gate, and a grid whose heights stay unmarked while a round is open.
 *
 * That last part is the property worth a test of its own. With the vertical axis numbered,
 * the board is a matter of dragging until a peak touches a line and the halving this slide
 * is about never happens; the trace still responds to both dials, so the learner can see
 * what each one does, but there is nothing on the grid to measure it against.
 */
function dials(host: HTMLElement): HTMLInputElement[] {
  return Array.from(host.querySelectorAll<HTMLInputElement>('input[type="range"]'));
}

function set(host: HTMLElement, level: number, strength: number): void {
  const [levelDial, strengthDial] = dials(host);
  if (!levelDial || !strengthDial) {
    throw new Error("the board is missing one of its two dials");
  }
  setInputValue(levelDial, String(level));
  setInputValue(strengthDial, String(strength));
}

/** Numbers printed on the vertical axis. Empty while a round is open, by design. */
function axisNumbers(host: HTMLElement): string[] {
  return Array.from(host.querySelectorAll("svg text")).map((node) =>
    (node.textContent ?? "").trim(),
  );
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigAmplitudeSlider keeps its heights unmarked until a round is settled", async () => {
  h = mount(<TrigAmplitudeSlider />);
  const { host } = h;
  await waitFor(() => dials(host).length === 2, "both dials mount");

  // The readings are stated, and the grid they would be measured against is not numbered.
  expect(hasMath(host, "\\text{high } 9")).toBe(true);
  expect(axisNumbers(host), "the axis is numbered while the round is open").toEqual([]);

  set(host, 5, 4);
  expect(
    axisNumbers(host),
    "moving the dials onto the answer numbered the axis before it was checked",
  ).toEqual([]);

  findButton(host, "Check").click();
  await waitFor(
    () => axisNumbers(host).length > 0,
    "the axis is numbered once the round is settled",
  );
});

test("TrigAmplitudeSlider judges the pair together and gates on both readings", async () => {
  let completed = 0;
  h = mount(<TrigAmplitudeSlider onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => dials(host).length === 2, "both dials mount");

  // The right strength behind the wrong level is not a partly-right signal, it is a
  // different one, so the pair is refused.
  set(host, 4, 4);
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Not those settings"), "the wrong level is refused");
  expect(completed).toBe(0);

  set(host, 5, 4);
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Matched"), "the halved sum and difference are taken");
  expect(completed, "the first of two rounds opened the gate").toBe(0);

  findButton(host, "Next reading").click();
  await waitFor(
    () => hasMath(host, "\\text{low } -2"),
    "the second round asks a different pair of readings",
  );
  expect(axisNumbers(host), "the new round kept the last one's numbers").toEqual([]);

  // The second round puts the low reading below the axis, so the halved sum is a
  // subtraction rather than the addition that settled the first one.
  set(host, 1, 3);
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "the last round opens the gate");
  expect(hasText(host, "halved difference is its amplitude")).toBe(true);
  expect(completed, "the gate latches exactly once").toBe(1);
});

test("TrigAmplitudeSlider offers its reveal only after a real attempt", async () => {
  h = mount(<TrigAmplitudeSlider />);
  const { host } = h;
  await waitFor(() => dials(host).length === 2, "both dials mount");

  expect(hasText(host, "Reveal")).toBe(false);

  set(host, 3, 3);
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Reveal"), "the reveal is offered after an attempt");
});
