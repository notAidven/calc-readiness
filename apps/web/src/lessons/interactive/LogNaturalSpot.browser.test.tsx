import { afterEach, expect, test } from "vitest";

import { type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { LogNaturalSpot } from "./LogNaturalSpot";

/**
 * The misconception is the sign, not the arithmetic: an argument below $1$ needs a NEGATIVE
 * exponent, and the reciprocal notation hides that. The wrong line is the one that turns
 * $\tfrac{1}{1000}$ into $10^{3}$, and the line under it follows from it correctly, which is
 * why the work reads as reasonable right up to the answer.
 */
function flag(host: HTMLElement, spoken: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `button[aria-label="Flag the line ${spoken}"]`,
  );
  if (!found) {
    throw new Error(`no flaggable line: ${spoken}`);
  }
  return found;
}

function replaceWith(host: HTMLElement, spoken: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `button[aria-label="Replace it with ${spoken}"]`,
  );
  if (!found) {
    throw new Error(`no replacement on offer: ${spoken}`);
  }
  return found;
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("LogNaturalSpot refuses the line that follows from the mistake", async () => {
  let completed = 0;
  h = mount(<LogNaturalSpot onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  // The last line IS wrong as an answer, and it is not where the work first goes wrong: it
  // follows correctly from the line above it. A learner who flags it has found the symptom.
  flag(host, "log of 0.001 equals 3").click();
  await waitFor(
    () => hasText(host, "which is why it is not where the work first goes wrong"),
    "the consequence of the mistake is refused as the mistake",
  );
  expect(completed).toBe(0);

  // The base line is fine too, and the refusal says why rather than only saying no.
  flag(host, "log of 0.001 has base 10").click();
  await waitFor(
    () => hasText(host, "a log written with no base underneath is the common logarithm"),
    "a correct line is refused with its reason",
  );
  expect(completed).toBe(0);
});

test("LogNaturalSpot gates on the replacement, not on finding the line", async () => {
  let completed = 0;
  h = mount(<LogNaturalSpot onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  flag(host, "one over 1000 equals 10 to the 3").click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__step") !== null,
    "finding the line puts the replacements on offer",
  );
  expect(completed, "finding the line alone opened the gate").toBe(0);

  // A fractional exponent is a root rather than a reciprocal: the other way of mishandling
  // the same $\tfrac{1}{1000}$.
  replaceWith(host, "one over 1000 equals 10 to the one third").click();
  await waitFor(
    () => hasText(host, "A fractional exponent is a ROOT"),
    "a root is refused",
  );
  expect(completed).toBe(0);

  // And a minus in front of the whole power flips the sign of the value instead of shrinking
  // it, which is the misconception the negative exponent is most often confused with.
  replaceWith(host, "one over 1000 equals negative 10 to the 3").click();
  await waitFor(
    () => hasText(host, "The minus sign belongs on the exponent"),
    "a negative number is refused",
  );
  expect(completed).toBe(0);

  replaceWith(host, "one over 1000 equals 10 to the negative 3").click();
  await waitFor(() => completed === 1, "the negative exponent opens the gate");
  expect(hasMath(host, "\\log 0.001 = -3")).toBe(true);
});

test("LogNaturalSpot offers each stage's reveal only after that stage is tried", async () => {
  h = mount(<LogNaturalSpot />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  expect(hasText(host, "Reveal which line is wrong")).toBe(false);

  flag(host, "log of 0.001 equals 3").click();
  await waitFor(
    () => hasText(host, "Reveal which line is wrong"),
    "stage one offers its reveal after a wrong flag",
  );
  // Stage two has not been reached, so its reveal is not on offer with it.
  expect(hasText(host, "Reveal what it should say")).toBe(false);
});
