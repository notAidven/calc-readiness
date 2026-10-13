import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigReferenceOrder } from "./TrigReferenceOrder";

/**
 * Four steps, one gate, and the chain refuses any order but the dependent one.
 *
 * The first board evaluates the cosine of 210 degrees: quadrant, then the subtraction the
 * quadrant chooses, then the acute value, then the sign. The second test taps the acute value
 * first, which is the commonest wrong route and the one the board exists to refuse.
 */
function tap(host: HTMLElement, spoken: string): void {
  const chip = host.querySelector<HTMLButtonElement>(
    `button[aria-label="Place ${spoken} next"]`,
  );
  if (!chip) {
    throw new Error(`no chip for "${spoken}"`);
  }
  chip.click();
}

function placed(host: HTMLElement): number {
  return host.querySelectorAll('.lesson-order__slot[data-state="placed"]').length;
}

const QUADRANT = "quadrant three, since 210 degrees lies between 180 and 270";
const REFERENCE = "210 degrees minus 180 degrees is 30 degrees";
const ACUTE = "the cosine of 30 degrees is root three over two";
const SIGNED = "the cosine of 210 degrees is negative root three over two";

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigReferenceOrder gates only once the whole chain is built", async () => {
  let completed = 0;
  h = mount(<TrigReferenceOrder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-order__list") !== null,
    "the chain mounts",
  );

  expect(placed(host)).toBe(0);

  tap(host, QUADRANT);
  await waitFor(() => placed(host) === 1, "the quadrant lands first");
  expect(completed, "one step of four is not the chain").toBe(0);

  tap(host, REFERENCE);
  await waitFor(() => placed(host) === 2, "the subtraction lands second");

  tap(host, ACUTE);
  await waitFor(() => placed(host) === 3, "the acute value lands third");
  expect(completed).toBe(0);

  tap(host, SIGNED);
  await waitFor(() => completed === 1, "gates on the signed value");
  expect(placed(host)).toBe(4);
  expect(hasText(host, "Every step placed")).toBe(true);
});

test("TrigReferenceOrder refuses the acute value before the quadrant is settled", async () => {
  let completed = 0;
  h = mount(<TrigReferenceOrder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-order__list") !== null,
    "the chain mounts",
  );

  expect(hasText(host, "Reveal")).toBe(false);

  tap(host, ACUTE);
  await waitFor(() => hasText(host, "Not quite"), "the out-of-order step is refused");
  expect(placed(host), "a refused step does not join the chain").toBe(0);
  expect(completed).toBe(0);
  expect(hasText(host, "Reveal")).toBe(true);

  tap(host, QUADRANT);
  await waitFor(() => placed(host) === 1, "the right step still lands afterwards");
  expect(completed).toBe(0);
});
