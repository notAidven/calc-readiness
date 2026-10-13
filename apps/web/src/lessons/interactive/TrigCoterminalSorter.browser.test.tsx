import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigCoterminalSorter } from "./TrigCoterminalSorter";

/**
 * Four measures against one parked heading, one call each, and the gate waits for all four.
 *
 * Rows are driven by their accessible names rather than by position, so a reordered board
 * fails by naming the row it could not find instead of silently calling a different one. The
 * first board parks the dish at 40 degrees and asks about 400, 220, -320 and 140.
 */
function call(
  host: HTMLElement,
  heading: number,
  verdict: "Coterminal" | "Not coterminal",
): void {
  const spoken = heading < 0 ? `negative ${-heading} degrees` : `${heading} degrees`;
  const label = `${spoken}: ${verdict}`;
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

test("TrigCoterminalSorter gates only once all four measures are called", async () => {
  let completed = 0;
  h = mount(<TrigCoterminalSorter onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-classify__item") !== null,
    "the board mounts",
  );

  expect(settled(host)).toBe(0);

  // 400 is one whole turn past 40.
  call(host, 400, "Coterminal");
  await waitFor(() => settled(host) === 1, "the whole turn lands");
  expect(completed, "one row of four is not the board").toBe(0);

  // 220 is half a turn away, which is the near miss.
  call(host, 220, "Not coterminal");
  await waitFor(() => settled(host) === 2, "the half turn lands");

  // -320 is one whole turn the other way.
  call(host, -320, "Coterminal");
  await waitFor(() => settled(host) === 3, "the backwards turn lands");
  expect(completed).toBe(0);

  call(host, 140, "Not coterminal");
  await waitFor(() => completed === 1, "gates on the fourth row");
  expect(settled(host)).toBe(4);
});

test("TrigCoterminalSorter locks a wrong call and names the half turn on the row", async () => {
  h = mount(<TrigCoterminalSorter onComplete={() => undefined} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-classify__item") !== null,
    "the board mounts",
  );

  // 220 degrees is exactly half a turn from 40, so the arm lands back on the same line and
  // the dish points the opposite way. A learner who reads "same line" as "same heading"
  // calls it coterminal.
  call(host, 220, "Coterminal");
  await waitFor(() => settled(host) === 1, "the wrong call settles the row anyway");
  expect(
    hasText(host, "differ by half a turn"),
    "the missed row names what the difference actually was",
  ).toBe(true);

  // The row is locked, so the other option is not a second guess.
  const other = host.querySelector<HTMLButtonElement>(
    'button[aria-label^="220 degrees: Not coterminal"]',
  );
  expect(other?.disabled, "a settled row keeps both options, both disabled").toBe(true);
});
