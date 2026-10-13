import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigWindowSorter } from "./TrigWindowSorter";

/**
 * Filtering a general solution down to the window.
 *
 * The first board is $\tan x = 1$, whose general solution is $45^{\circ} + 180^{\circ}n$, and
 * its four candidates are 405, 45, negative 135 and 225 degrees. Rows are driven by their
 * accessible names, so a reordered board fails by naming the row it could not find.
 */

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

function call(
  host: HTMLElement,
  spoken: string,
  verdict: "Inside the window" | "Outside the window",
) {
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

test("TrigWindowSorter gates only once all four candidates are called", async () => {
  let completed = 0;
  h = mount(<TrigWindowSorter onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-classify__item") !== null,
    "the board mounts",
  );

  call(host, "405 degrees", "Outside the window");
  await waitFor(() => settled(host) === 1, "a heading past a full turn is dropped");
  expect(completed, "one row of four is not the board").toBe(0);

  call(host, "45 degrees", "Inside the window");
  await waitFor(() => settled(host) === 2, "the n equals zero heading stays");

  call(host, "negative 135 degrees", "Outside the window");
  await waitFor(() => settled(host) === 3, "a clockwise heading is dropped");
  expect(completed).toBe(0);

  call(host, "225 degrees", "Inside the window");
  await waitFor(() => completed === 1, "gates on the fourth row");
  expect(settled(host)).toBe(4);
});

test("TrigWindowSorter locks a wrong call and says which bound decided it", async () => {
  h = mount(<TrigWindowSorter onComplete={() => undefined} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-classify__item") !== null,
    "the board mounts",
  );

  // 405 degrees really is a solution, which is exactly why it tempts a learner who is
  // checking the equation rather than the window.
  call(host, "405 degrees", "Inside the window");
  await waitFor(() => settled(host) === 1, "the wrong call settles the row anyway");
  expect(
    hasText(host, "past the top of the window"),
    "the missed row names the bound rather than the equation",
  ).toBe(true);

  const other = host.querySelector<HTMLButtonElement>(
    'button[aria-label^="405 degrees: Outside the window"]',
  );
  expect(other?.disabled, "a settled row keeps both options, both disabled").toBe(true);
});

test("TrigWindowSorter keeps the two bounds apart on its second board", async () => {
  h = mount(<TrigWindowSorter onComplete={() => undefined} onReopen={() => undefined} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-classify__item") !== null,
    "the board mounts",
  );

  call(host, "405 degrees", "Outside the window");
  await waitFor(() => settled(host) === 1, "the first row settles");
  call(host, "45 degrees", "Inside the window");
  await waitFor(() => settled(host) === 2, "the second row settles");
  call(host, "negative 135 degrees", "Outside the window");
  await waitFor(() => settled(host) === 3, "the third row settles");
  call(host, "225 degrees", "Inside the window");
  await waitFor(() => settled(host) === 4, "the first board completes");

  const restart = host.querySelector<HTMLButtonElement>(".lesson-interactive__reset");
  restart?.click();

  // The sine board is the one that puts the closed bound and the open bound side by side:
  // zero stays and a full turn goes, under numbers that look interchangeable.
  await waitFor(
    () => host.querySelector('button[aria-label^="0 degrees: Inside the window"]') !== null,
    "the restart deals the general solution with zero in it",
  );
  call(host, "360 degrees", "Inside the window");
  await waitFor(
    () => hasText(host, "The upper bound is strict"),
    "a full turn is refused by the bound rather than by the equation",
  );
  call(host, "0 degrees", "Inside the window");
  await waitFor(() => settled(host) === 2, "the lower bound admits its own start");
  expect(
    hasText(host, "The upper bound is strict"),
    "both bounds are on the board at once, said differently",
  ).toBe(true);
});
