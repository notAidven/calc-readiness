import { afterEach, expect, test } from "vitest";

import { type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { TrigCofunctionSpot } from "./TrigCofunctionSpot";

/**
 * The misconception is the ANGLE, not the ratio. Every line of reasoning on the first board is
 * correct right down to the conclusion, and the conclusion swaps the sine for a cosine while
 * leaving $18^{\circ}$ where it stood. That is the reading a correct statement of the rule
 * does not disturb, which is why this content is a spot-the-error rather than a sentence.
 *
 * Two things are asserted beyond the wiring, and both are about what the board REFUSES:
 *
 *  - finding the wrong line is not the gate. The replacement is, and the first test proves the
 *    gate stays shut in between;
 *  - the near-miss replacements are refused with their own reasons. Moving the angle without
 *    the ratio and moving the ratio without the angle are the two half-learned versions of the
 *    rule, and a board that accepted either would be teaching one of them.
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

test("TrigCofunctionSpot refuses the correct lines that lead up to the mistake", async () => {
  let completed = 0;
  h = mount(<TrigCofunctionSpot onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  // "A sine reads as a cosine" is true, and it is the line the mistake is built on, so it is
  // the line a learner is likeliest to flag. The refusal has to say why it holds.
  flag(host, "so a sine reads as a cosine").click();
  await waitFor(
    () => hasText(host, "swapping opposite with adjacent"),
    "the true line the mistake leans on is refused with its reason",
  );
  expect(completed).toBe(0);

  flag(host, "the two acute angles are complementary").click();
  await waitFor(
    () => hasText(host, "the right angle takes 90 degrees"),
    "the opening line is refused with its reason",
  );
  expect(completed).toBe(0);
});

test("TrigCofunctionSpot gates on the replacement, not on finding the line", async () => {
  let completed = 0;
  h = mount(<TrigCofunctionSpot onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  flag(host, "sine of 18 degrees equals cosine of 18 degrees").click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__step") !== null,
    "finding the line puts the replacements on offer",
  );
  expect(completed, "finding the line alone opened the gate").toBe(0);

  // The angle moved and the ratio did not: the mirror image of the mistake on the board, and
  // the one a learner reaches for once they know the angle has to change.
  replaceWith(host, "sine of 18 degrees equals sine of 72 degrees").click();
  await waitFor(
    () => hasText(host, "Both change together or neither does"),
    "moving the angle without the ratio is refused",
  );
  expect(completed).toBe(0);

  // And the same false claim with the two sides of the equation exchanged.
  replaceWith(host, "cosine of 18 degrees equals sine of 18 degrees").click();
  await waitFor(
    () => hasText(host, "the same claim with the two sides of the equation exchanged"),
    "the mistake written backwards is refused",
  );
  expect(completed).toBe(0);

  replaceWith(host, "sine of 18 degrees equals cosine of 72 degrees").click();
  await waitFor(() => completed === 1, "the complement opens the gate");
  expect(hasMath(host, "\\sin 18^{\\circ} = \\cos 72^{\\circ}")).toBe(true);
  expect(completed, "the gate opens exactly once").toBe(1);
});

test("TrigCofunctionSpot deals the supplement mistake on restart", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <TrigCofunctionSpot onComplete={() => completed++} onReopen={() => reopened++} />,
  );
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  flag(host, "sine of 18 degrees equals cosine of 18 degrees").click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__step") !== null,
    "the replacements come up",
  );
  replaceWith(host, "sine of 18 degrees equals cosine of 72 degrees").click();
  await waitFor(() => completed === 1, "the first board closes");

  const reset = host.querySelector<HTMLButtonElement>("button.lesson-interactive__reset");
  if (!reset) {
    throw new Error("no restart control on the finished work");
  }
  reset.click();
  await waitFor(() => reopened === 1, "the gate closes behind the restart");

  // A different piece of work with a different mistake in it: the second board subtracts from
  // a straight angle instead of a right one, so a learner who memorised "the answer is the
  // last line" is given nothing.
  await waitFor(
    () => host.querySelector('button[aria-label*="180 degrees minus 37"]') !== null,
    "the second board is the supplement mistake",
  );
  expect(
    host.querySelector('button[aria-label*="sine of 18 degrees"]'),
    "none of the first board's lines survives",
  ).toBeNull();

  // The final line follows correctly FROM the mistake, so it is not where the work first
  // fails, and flagging it has to be refused.
  flag(host, "cosine of 37 degrees equals sine of 143 degrees").click();
  await waitFor(
    () => hasText(host, "which is why it is not where the work first goes wrong"),
    "the consequence of the mistake is refused as the mistake",
  );
  expect(completed, "the second board has its own gate").toBe(1);
});

test("TrigCofunctionSpot offers each stage's reveal only after that stage is tried", async () => {
  h = mount(<TrigCofunctionSpot />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  expect(hasText(host, "Reveal which line is wrong")).toBe(false);

  flag(host, "so a sine reads as a cosine").click();
  await waitFor(
    () => hasText(host, "Reveal which line is wrong"),
    "stage one offers its reveal after a wrong flag",
  );
  // Stage two has not been reached, so its reveal is not on offer beside it.
  expect(hasText(host, "Reveal what it should say")).toBe(false);
});
