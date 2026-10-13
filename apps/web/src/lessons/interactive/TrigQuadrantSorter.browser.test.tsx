import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigQuadrantSorter } from "./TrigQuadrantSorter";

/**
 * Four headings, one call each, and the gate waits for all four.
 *
 * Rows are driven by their accessible names rather than by position, so a reordered board
 * fails by naming the row it could not find instead of silently calling a different one. The
 * first board asks about cosine at 160, 340, 250 and 55 degrees, which is one heading per
 * quadrant.
 */
function call(host: HTMLElement, heading: number, verdict: "Positive" | "Negative"): void {
  const label = `cosine of ${heading} degrees: ${verdict}`;
  const button = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!button) {
    throw new Error(`no option button for "${label}"`);
  }
  button.click();
}

function settled(host: HTMLElement): number {
  return host.querySelectorAll('[data-settled="true"]').length;
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigQuadrantSorter gates only once all four headings are called", async () => {
  let completed = 0;
  h = mount(<TrigQuadrantSorter onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-classify__item") !== null,
    "the board mounts",
  );

  expect(settled(host)).toBe(0);

  call(host, 160, "Negative");
  await waitFor(() => settled(host) === 1, "Quadrant II lands");
  expect(completed, "one row of four is not the board").toBe(0);

  call(host, 340, "Positive");
  await waitFor(() => settled(host) === 2, "Quadrant IV lands");

  call(host, 250, "Negative");
  await waitFor(() => settled(host) === 3, "Quadrant III lands");
  expect(completed).toBe(0);

  call(host, 55, "Positive");
  await waitFor(() => completed === 1, "gates on the fourth row");
  expect(settled(host)).toBe(4);
});

test("TrigQuadrantSorter locks a wrong call and says why on the row", async () => {
  h = mount(<TrigQuadrantSorter onComplete={() => undefined} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-classify__item") !== null,
    "the board mounts",
  );

  // 340 degrees lands in Quadrant IV, where the point sits left of nothing: a learner who
  // reads "below the axis" as "negative in both coordinates" calls the cosine negative here.
  call(host, 340, "Negative");
  await waitFor(() => settled(host) === 1, "the wrong call settles the row anyway");
  expect(
    hasText(host, "The terminal side lands in Quadrant IV"),
    "the missed row states the quadrant that decided it",
  ).toBe(true);

  // The row is locked, so the other option is not a second guess.
  const other = host.querySelector<HTMLButtonElement>(
    'button[aria-label^="cosine of 340 degrees: Positive"]',
  );
  expect(other?.disabled, "a settled row keeps both options, both disabled").toBe(true);
});
