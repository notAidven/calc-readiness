import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigSolveOrder } from "./TrigSolveOrder";

/**
 * The chain that solves $2\cos x + \sqrt{2} = 0$: isolate, reference angle, quadrants, roster.
 *
 * Chips are driven by their accessible names rather than by position, because the deal is a
 * derangement and a positional test would be asserting the shuffle rather than the ordering.
 */

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

function place(host: HTMLElement, spoken: string): void {
  const label = `Place ${spoken} next`;
  const chip = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!chip) {
    throw new Error(`no chip for "${label}"`);
  }
  chip.click();
}

function placed(host: HTMLElement): number {
  return host.querySelectorAll('[data-state="placed"]').length;
}

test("TrigSolveOrder refuses a step whose prerequisite is not on the board", async () => {
  let completed = 0;
  h = mount(<TrigSolveOrder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-sorter__chip") !== null,
    "the board mounts",
  );

  // Reaching for the circle first is the real error this slide is about: the reference angle
  // cannot be found while the cosine is still multiplied by two.
  place(host, "the reference angle is 45 degrees");
  await waitFor(
    () => hasText(host, "rests on something that is not on the board yet"),
    "the out-of-order tap is refused",
  );
  expect(placed(host), "a refused tap places nothing").toBe(0);
  expect(completed).toBe(0);
});

test("TrigSolveOrder gates on the completed chain", async () => {
  let completed = 0;
  h = mount(<TrigSolveOrder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-sorter__chip") !== null,
    "the board mounts",
  );

  place(host, "cosine x equals negative root 2 over 2");
  await waitFor(() => placed(host) === 1, "the isolation step lands");
  expect(completed, "one rung is not the chain").toBe(0);

  place(host, "the reference angle is 45 degrees");
  await waitFor(() => placed(host) === 2, "the reference angle lands");

  place(host, "180 degrees minus 45 degrees, and 180 degrees plus 45 degrees");
  await waitFor(() => placed(host) === 3, "the quadrant placement lands");
  expect(completed, "the roster has not been claimed yet").toBe(0);

  place(host, "x is in the set 135 degrees and 225 degrees");
  await waitFor(() => completed === 1, "the finished chain opens the gate");
  expect(
    hasText(host, "Isolate, then size, then sign, then window"),
    "the conclusion names the order that was built",
  ).toBe(true);
});
