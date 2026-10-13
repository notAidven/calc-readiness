import { afterEach, expect, test } from "vitest";

import { type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { LogCondenseBuilder } from "./LogCondenseBuilder";

/**
 * Two factors, one gate. The wrong attempt is the one the whole slide is about: leaving the
 * coefficient multiplying the variable instead of moving it in as an exponent, which the tray
 * offers as a chip so it can actually be made.
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

function settled(host: HTMLElement): number {
  return host.querySelectorAll(".lesson-equation__slot--done").length;
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("LogCondenseBuilder refuses a coefficient left outside and gates on both factors", async () => {
  let completed = 0;
  h = mount(<LogCondenseBuilder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-equation__slot") !== null,
    "the scaffold mounts",
  );

  expect(hasMath(host, "2 \\log m + \\log n")).toBe(true);
  expect(settled(host)).toBe(0);

  // The coefficient still multiplying the variable: right numbers, wrong move.
  chip(host, "2 m").click();
  await waitFor(() => hasText(host, "Not that one"), "a coefficient outside is refused");
  expect(settled(host)).toBe(0);
  expect(completed).toBe(0);

  chip(host, "m squared").click();
  await waitFor(() => settled(host) === 1, "the first factor settles");
  expect(completed, "one factor alone opened the gate").toBe(0);

  // The first term's exponent transplanted onto the second one is not the answer either.
  chip(host, "n squared").click();
  await waitFor(
    () => hasText(host, "Not that one"),
    "a borrowed exponent is refused on the second factor",
  );
  expect(settled(host)).toBe(1);
  expect(completed).toBe(0);

  chip(host, "n").click();
  await waitFor(() => completed === 1, "both factors together open the gate");
  expect(hasMath(host, "\\log(m^{2} n)")).toBe(true);
  expect(completed, "the gate latches exactly once").toBe(1);
});

test("LogCondenseBuilder offers its reveal only after a real attempt", async () => {
  h = mount(<LogCondenseBuilder />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-equation__slot") !== null,
    "the scaffold mounts",
  );

  expect(hasText(host, "Reveal")).toBe(false);

  chip(host, "2 n").click();
  await waitFor(
    () => hasText(host, "Reveal this factor"),
    "the reveal is offered after an attempt",
  );
});
