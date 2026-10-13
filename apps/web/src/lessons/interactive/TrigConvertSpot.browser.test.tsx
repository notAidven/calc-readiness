import { afterEach, expect, test } from "vitest";

import { type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { TrigConvertSpot } from "./TrigConvertSpot";

/**
 * The mistake is the ORIENTATION of the conversion factor, and the line under it follows from
 * it correctly. That is the point of the board: every digit below the wrong line is right, so
 * flagging the absurd answer is finding the symptom rather than the mistake.
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

test("TrigConvertSpot refuses the line the wrong factor made, and the restated question", async () => {
  let completed = 0;
  h = mount(<TrigConvertSpot onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  // 27000 over pi is about 8600 radians, which is plainly not a heading. It is also the
  // correct product of the two things on the line above it.
  flag(host, "equals 27000 over pi").click();
  await waitFor(
    () => hasText(host, "The multiplication on this line is carried out correctly"),
    "the consequence of the mistake is refused as the mistake",
  );
  expect(completed).toBe(0);

  flag(host, "150 degrees equals how many radians").click();
  await waitFor(
    () => hasText(host, "That is the question copied down"),
    "restating the question is refused with its reason",
  );
  expect(completed).toBe(0);
});

test("TrigConvertSpot gates on the replacement factor, not on finding the line", async () => {
  let completed = 0;
  h = mount(<TrigConvertSpot onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  flag(host, "150 times 180 over pi").click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__step") !== null,
    "finding the line puts the replacement factors on offer",
  );
  expect(completed, "finding the line alone opened the gate").toBe(0);

  // Right way up, wrong agreement: a full turn is 2pi and not pi, so this factor is worth a
  // half and it halves the heading instead of leaving it where it is.
  replaceWith(host, "pi over 360").click();
  await waitFor(
    () => hasText(host, "right way up and built on the wrong agreement"),
    "the half-sized factor is refused",
  );
  expect(completed).toBe(0);

  // The right size with no pi in it at all, which produces a plain fraction rather than a
  // measure in radians.
  replaceWith(host, "1 over 180").click();
  await waitFor(() => hasText(host, "is not decoration"), "dropping the pi is refused");
  expect(completed).toBe(0);

  replaceWith(host, "pi over 180").click();
  await waitFor(() => completed === 1, "the factor the right way up opens the gate");
  expect(
    hasMath(host, "150^{\\circ} \\times \\dfrac{\\pi}{180^{\\circ}} = \\dfrac{5\\pi}{6}"),
    "the conclusion runs the conversion through with the factor the right way up",
  ).toBe(true);
});

test("TrigConvertSpot offers each stage's reveal only after that stage is tried", async () => {
  h = mount(<TrigConvertSpot />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  expect(hasText(host, "Reveal which line is wrong")).toBe(false);

  flag(host, "equals 27000 over pi").click();
  await waitFor(
    () => hasText(host, "Reveal which line is wrong"),
    "stage one offers its reveal after a wrong flag",
  );
  expect(hasText(host, "Reveal what it should say")).toBe(false);
});

test("TrigConvertSpot restarts onto the conversion running the other way", async () => {
  h = mount(<TrigConvertSpot />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  flag(host, "150 times 180 over pi").click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__step") !== null,
    "the replacements are offered",
  );
  replaceWith(host, "pi over 180").click();

  await waitFor(
    () => host.querySelector(".lesson-interactive__reset") !== null,
    "the board offers a restart once it is solved",
  );
  host.querySelector<HTMLButtonElement>(".lesson-interactive__reset")?.click();

  // The second board converts radians back into degrees, so the factor a learner just chose
  // is now the wrong one and "the one with pi on top" stops being a usable rule.
  await waitFor(
    () =>
      host.querySelector(
        'button[aria-label^="Flag the line 7 pi over 6 times pi over 180"]',
      ) !== null,
    "the restart deals the conversion running the other way",
  );
  expect(
    hasText(host, "Reveal which line is wrong"),
    "the restarted board starts clean, with no reveal outstanding",
  ).toBe(false);
});
