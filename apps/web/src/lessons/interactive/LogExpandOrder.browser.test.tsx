import { afterEach, expect, test } from "vitest";

import { type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { LogExpandOrder } from "./LogExpandOrder";

/**
 * The point of the board is that the power rule cannot go first, so the test spends its
 * wrong attempt on exactly that: tapping the power line before the quotient has been split
 * has to be refused, and the gate has to stay shut until the whole chain is built.
 */
function chip(host: HTMLElement, spoken: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `.lesson-sorter__chip[aria-label="Place ${spoken} next"]`,
  );
  if (!found) {
    throw new Error(`no chip for ${spoken}`);
  }
  return found;
}

/** How many rungs of the chain are built. */
function placed(host: HTMLElement): number {
  return host.querySelectorAll('.lesson-order__slot[data-state="placed"]').length;
}

const ORDER = [
  "the division is the outermost operation inside the logarithm",
  "log of x cubed over y equals log of x cubed minus log y",
  "log of x cubed equals 3 log x",
  "log of x cubed over y equals 3 log x minus log y",
];

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("LogExpandOrder refuses the power rule first and gates on the finished chain", async () => {
  let completed = 0;
  h = mount(<LogExpandOrder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-order__list") !== null,
    "the board mounts",
  );

  // True on its own, and still not placeable: there is no log of a power in the expression
  // until the quotient has been split.
  chip(host, ORDER[2] as string).click();
  await waitFor(() => hasText(host, "Not quite"), "the power rule is refused first");
  expect(completed).toBe(0);

  chip(host, ORDER[0] as string).click();
  await waitFor(() => placed(host) === 1, "reading the outermost operation is accepted");
  expect(hasText(host, "Not quite")).toBe(false);
  expect(completed).toBe(0);

  chip(host, ORDER[1] as string).click();
  await waitFor(() => placed(host) === 2, "the quotient split lands second");

  chip(host, ORDER[2] as string).click();
  await waitFor(() => placed(host) === 3, "the power rule lands third");
  expect(completed, "an unfinished chain opened the gate").toBe(0);

  chip(host, ORDER[3] as string).click();
  await waitFor(() => completed === 1, "the finished chain opens the gate");
  expect(hasMath(host, "3 \\log x - \\log y")).toBe(true);
  expect(completed, "the gate latches exactly once").toBe(1);
});

test("LogExpandOrder offers its reveal only after a real attempt", async () => {
  h = mount(<LogExpandOrder />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-order__list") !== null,
    "the board mounts",
  );

  expect(hasText(host, "Reveal")).toBe(false);

  chip(host, ORDER[3] as string).click();
  await waitFor(() => hasText(host, "Reveal"), "the reveal is offered after an attempt");
});
