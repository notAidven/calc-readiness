import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigIdentitySpot } from "./TrigIdentitySpot";

/**
 * Finding the line is not the answer here, replacing it is, and the two are separately
 * assertable: the gate has to stay shut on a board where the learner has flagged the right
 * line and then reached for the wrong replacement. The replacement that matters is
 * $\pm\dfrac{4}{5}$, which is what a learner writes when they know a root has two candidates
 * and have not registered that the quadrant already picked one.
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

const BAD_LINE = "cosine equals four fifths";

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigIdentitySpot gates on the replacement, not on finding the line", async () => {
  let completed = 0;
  h = mount(<TrigIdentitySpot onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  // The line before the flaw is where the square is still a square, and it does follow.
  flag(
    host,
    "cosine squared equals one minus nine twenty-fifths, which is sixteen twenty-fifths",
  ).click();
  await waitFor(
    () => hasText(host, "still about the SQUARE of the cosine"),
    "a sound line is defended rather than just refused",
  );
  expect(completed).toBe(0);

  flag(host, BAD_LINE).click();
  await waitFor(
    () =>
      host.querySelector(
        'button[aria-label="Replace it with cosine equals negative four fifths"]',
      ) !== null,
    "finding the line puts the replacements on offer",
  );
  expect(completed, "finding the line is only half the answer").toBe(0);

  replaceWith(host, "cosine equals negative four fifths").click();
  await waitFor(() => completed === 1, "the replacement opens the gate");
  expect(hasText(host, "the identity says how big, and the quadrant says which way")).toBe(
    true,
  );
});

test("TrigIdentitySpot refuses both candidates, because the quadrant already chose", async () => {
  let completed = 0;
  h = mount(<TrigIdentitySpot onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  flag(host, BAD_LINE).click();
  await waitFor(
    () =>
      host.querySelector(
        'button[aria-label="Replace it with cosine equals plus or minus four fifths"]',
      ) !== null,
    "the replacements are on offer",
  );

  replaceWith(host, "cosine equals plus or minus four fifths").click();
  await waitFor(
    () => hasText(host, "The quadrant is information"),
    "carrying both candidates forward is refused",
  );
  expect(completed, "an unfinished answer opened the gate").toBe(0);

  // And the square copied down with the root not taken is refused too, on its own grounds.
  replaceWith(host, "cosine equals sixteen twenty-fifths").click();
  await waitFor(
    () => hasText(host, "the root has simply not been taken"),
    "the unrooted square is refused",
  );
  expect(completed).toBe(0);

  replaceWith(host, "cosine equals negative four fifths").click();
  await waitFor(() => completed === 1, "the right replacement still opens the gate");
});

test("TrigIdentitySpot offers a reveal after a miss and deals different work on restart", async () => {
  h = mount(<TrigIdentitySpot />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-spot__work") !== null, "the work mounts");

  expect(hasText(host, "Reveal which line is wrong")).toBe(false);
  flag(host, "sine squared plus cosine squared equals one").click();
  await waitFor(
    () => hasText(host, "Reveal which line is wrong"),
    "the reveal is offered after a wrong line is flagged",
  );

  flag(host, BAD_LINE).click();
  await waitFor(
    () =>
      host.querySelector(
        'button[aria-label="Replace it with cosine equals negative four fifths"]',
      ) !== null,
    "the replacements are on offer",
  );
  replaceWith(host, "cosine equals negative four fifths").click();
  await waitFor(() => hasText(host, "The line should read"), "the first board finishes");

  findButton(host, "Try another piece of work").click();
  await waitFor(
    () =>
      host.querySelector(
        'button[aria-label="Flag the line cotangent equals one over tangent"]',
      ) !== null,
    "the second board is a different piece of work",
  );
  expect(host.querySelector(`button[aria-label="Flag the line ${BAD_LINE}"]`)).toBeNull();
});
