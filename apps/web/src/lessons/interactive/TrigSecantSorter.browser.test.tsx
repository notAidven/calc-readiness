import { afterEach, expect, test } from "vitest";

import { type Harness, mount, waitFor } from "../testHarness";
import { TrigSecantSorter } from "./TrigSecantSorter";

/**
 * Two claims.
 *
 * The gate turns on every row being CALLED rather than on every row being called correctly,
 * which is the shared kind's rule, so the second test misses a row deliberately and still
 * expects to be let past once the board is finished. A gate that demanded a clean board would
 * send a learner back through the three rows they already knew.
 *
 * The row that matters most is the one whose cosine is NEGATIVE: secant reports there
 * perfectly well, and a widget that quietly graded "awkward heading" as "no value" would look
 * right on the two rows either side of it. The first test therefore calls that row explicitly
 * and reads the mark back off the button.
 *
 * Options are taken by `aria-label`, which carries the row and the call together, because the
 * two words appear under every row on the board.
 */
function option(host: HTMLElement, spoken: string): HTMLButtonElement {
  const match = Array.from(host.querySelectorAll("button")).find((button) =>
    (button.getAttribute("aria-label") ?? "").startsWith(spoken),
  );
  if (!match) {
    throw new Error(`no option labelled ${spoken}`);
  }
  return match;
}

function settled(host: HTMLElement): number {
  return host.querySelectorAll('[data-settled="true"]').length;
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigSecantSorter gates on a board where every heading has been called", async () => {
  let completed = 0;
  h = mount(<TrigSecantSorter onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-classify") !== null, "the board draws");

  // The first board is 330, 90, 180, 270. The cosine at 180 is negative and secant is
  // perfectly happy there, which is the row the misconception loses.
  option(host, "secant of 330 degrees: defined").click();
  await waitFor(() => settled(host) === 1, "the first row settles");
  expect(completed, "one row is not the board").toBe(0);

  option(host, "secant of 90 degrees: undefined").click();
  await waitFor(() => settled(host) === 2, "the zero cosine settles");

  option(host, "secant of 180 degrees: defined").click();
  await waitFor(() => settled(host) === 3, "the negative cosine is still a value");

  option(host, "secant of 270 degrees: undefined").click();
  await waitFor(() => completed === 1, "gates on the finished board");
});

test("TrigSecantSorter locks a row on its first call and still finishes the board", async () => {
  let completed = 0;
  h = mount(<TrigSecantSorter onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-classify") !== null, "the board draws");

  // Calling 180 as having no value is the misconception, and the row locks on it: the other
  // button is disabled rather than offered as a second guess.
  option(host, "secant of 180 degrees: undefined").click();
  await waitFor(() => settled(host) === 1, "the miss settles the row");
  expect(option(host, "secant of 180 degrees: defined").disabled).toBe(true);
  expect(completed).toBe(0);

  option(host, "secant of 330 degrees: defined").click();
  await waitFor(() => settled(host) === 2, "the second row settles");

  option(host, "secant of 90 degrees: undefined").click();
  await waitFor(() => settled(host) === 3, "the third row settles");

  option(host, "secant of 270 degrees: undefined").click();
  await waitFor(() => completed === 1, "a called board opens even with a miss on it");
});
