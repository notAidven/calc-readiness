import { afterEach, expect, test } from "vitest";

import { type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { LogProductTable } from "./LogProductTable";

/**
 * Two blanks, one gate. The sum of the two readings and the logarithm of the product are
 * worked out by different routes and land on the same number, so a board that gated on the
 * first of them would let a learner past before the coincidence had been written down twice.
 */
function chip(host: HTMLElement, spoken: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `.lesson-sorter__chip[aria-label="${spoken}"]`,
  );
  if (!found) {
    throw new Error(`no chip for ${spoken}`);
  }
  return found;
}

function openSlot(host: HTMLElement): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(".lesson-table__slot");
  if (!found) {
    throw new Error("no open blank");
  }
  return found;
}

/** Tap a value and then tap the blank waiting for it, the way a learner does. */
function place(host: HTMLElement, spoken: string): void {
  chip(host, spoken).click();
  openSlot(host).click();
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("LogProductTable refuses the log of the sum and gates on both blanks together", async () => {
  let completed = 0;
  h = mount(<LogProductTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-table") !== null, "the table mounts");

  // The two readings are given, and the two blanks are not.
  expect(hasMath(host, "0.602")).toBe(true);
  expect(hasMath(host, "1.398")).toBe(true);

  // log(4 + 25) is the classic misread, and the tray offers it so it can be made.
  place(host, "1.462");
  await waitFor(() => hasText(host, "Not that one"), "the log of the sum is refused");
  expect(completed).toBe(0);

  place(host, "2");
  await waitFor(
    () => !hasText(host, "Not that one"),
    "the sum of the two readings is accepted",
  );
  expect(completed, "one blank alone opened the gate").toBe(0);

  // The second blank is answered off the powers of ten, and 100 is the argument, not its log.
  place(host, "100");
  await waitFor(() => hasText(host, "Not that one"), "the argument is refused as its log");
  expect(completed).toBe(0);

  place(host, "2");
  await waitFor(() => completed === 1, "both blanks together open the gate");
  expect(hasMath(host, "\\log(xy) = \\log x + \\log y")).toBe(true);
  expect(completed, "the gate latches exactly once").toBe(1);
});

test("LogProductTable offers its reveal only after a real attempt", async () => {
  h = mount(<LogProductTable />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-table") !== null, "the table mounts");

  expect(hasText(host, "Reveal")).toBe(false);

  place(host, "0.796");
  await waitFor(() => hasText(host, "Reveal"), "the reveal is offered after an attempt");
});
