import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { TrigPhaseDrag } from "./TrigPhaseDrag";

/**
 * Two lags, one gate, and the direction is half of each answer.
 *
 * The board snaps in twelfths of a half turn and the handle carries the second trace, so a
 * lag is placed rather than typed. What makes it an answer rather than a nudge is that the
 * round names a FRACTION OF A CYCLE: the learner converts it to radians first, and the board
 * refuses a correct size placed the wrong way with a message that says which half is wrong.
 */
function handle(host: HTMLElement): SVGCircleElement {
  const found = host.querySelector<SVGCircleElement>('circle[role="slider"]');
  if (!found) {
    throw new Error("no drag handle on the second trace");
  }
  return found;
}

/** The snap the handle reports, which is what a screen reader and a test both read. */
function snaps(host: HTMLElement): number {
  return Number(handle(host).getAttribute("aria-valuenow"));
}

async function nudge(
  host: HTMLElement,
  way: "Earlier" | "Later",
  times: number,
): Promise<void> {
  const target = snaps(host) + (way === "Later" ? times : -times);
  for (let i = 0; i < times; i += 1) {
    findButton(host, way).click();
  }
  await waitFor(
    () => snaps(host) === target,
    `${times} taps of ${way} land on ${target}, so no tap was dropped into a batch`,
  );
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigPhaseDrag converts a fraction of a cycle and gates on both lags", async () => {
  let completed = 0;
  h = mount(<TrigPhaseDrag onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector('circle[role="slider"]') !== null, "it mounts");

  expect(hasText(host, "a quarter of a cycle later")).toBe(true);
  expect(snaps(host), "the second trace starts on top of the first").toBe(0);

  // A quarter of a WHOLE TURN, not a quarter of a half turn: the slip this round catches.
  await nudge(host, "Later", 3);
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Not there yet"), "a quarter of pi is refused");
  expect(completed).toBe(0);

  await nudge(host, "Later", 3);
  await waitFor(
    () => hasMath(host, "\\text{offset } +\\dfrac{\\pi}{2}"),
    "the offset above the plot reads a quarter of a turn",
  );
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "That is the lag"), "a quarter of a turn is accepted");
  expect(completed, "the first of two lags opened the gate").toBe(0);

  findButton(host, "Next link").click();
  await waitFor(
    () => hasText(host, "a sixth of a cycle earlier"),
    "the second round runs the other way",
  );
  expect(snaps(host), "the new round kept the last one's offset").toBe(0);

  // The right size, slid the wrong way. A copy that arrives earlier sits to the LEFT.
  await nudge(host, "Later", 4);
  findButton(host, "Check").click();
  await waitFor(
    () => hasText(host, "The size is right and the direction is not"),
    "the board names which half of the answer is wrong",
  );
  expect(completed).toBe(0);

  await nudge(host, "Earlier", 8);
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "the last lag opens the gate");
  expect(hasText(host, "A phase shift is a distance along the axis, not a height")).toBe(
    true,
  );
  expect(completed, "the gate latches exactly once").toBe(1);
});

test("TrigPhaseDrag moves the handle from the keyboard as well as the pointer", async () => {
  h = mount(<TrigPhaseDrag />);
  const { host } = h;
  await waitFor(() => host.querySelector('circle[role="slider"]') !== null, "it mounts");

  const knob = handle(host);
  knob.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
  );
  await waitFor(() => snaps(host) === 1, "an arrow key moves the handle one snap");
  knob.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }),
  );
  await waitFor(() => snaps(host) === 0, "and back again");
});

test("TrigPhaseDrag offers its reveal only after a real attempt", async () => {
  h = mount(<TrigPhaseDrag />);
  const { host } = h;
  await waitFor(() => host.querySelector('circle[role="slider"]') !== null, "it mounts");

  expect(hasText(host, "Reveal")).toBe(false);

  await nudge(host, "Later", 2);
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Reveal"), "the reveal is offered after an attempt");
});
