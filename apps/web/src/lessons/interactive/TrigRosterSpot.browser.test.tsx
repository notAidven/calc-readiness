import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigRosterSpot } from "./TrigRosterSpot";

/**
 * The incomplete roster, met already made.
 *
 * The board's first three lines are all true, which is the whole difficulty: the flagged line
 * is the one that answers with a single heading after the line above named two quadrants. The
 * second stage then asks for the roster that should have been written.
 */

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

function tap(host: HTMLElement, spoken: string): void {
  const button = Array.from(host.querySelectorAll("button")).find((b) =>
    (b.getAttribute("aria-label") ?? "").includes(spoken),
  );
  if (!button) {
    throw new Error(`no control whose name contains "${spoken}"`);
  }
  button.click();
}

test("TrigRosterSpot does not accept a true line as the one that fails", async () => {
  let completed = 0;
  h = mount(<TrigRosterSpot onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector("button") !== null, "the board mounts");

  tap(host, "the size is root 2 over 2, so the reference angle is 45 degrees");
  await waitFor(
    () => hasText(host, "45 degrees is the right one"),
    "a correct line explains why it is fine rather than being marked wrong",
  );
  expect(completed).toBe(0);
});

test("TrigRosterSpot gates on the correction, not on finding the line", async () => {
  let completed = 0;
  h = mount(<TrigRosterSpot onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector("button") !== null, "the board mounts");

  tap(host, "x equals 225 degrees");
  await waitFor(
    () => hasText(host, "stopped once it had found an answer"),
    "the flagged line is diagnosed as incomplete rather than incorrect",
  );
  expect(completed, "finding the line is only the first of two answers").toBe(0);

  tap(host, "x is in the set 225 degrees and 315 degrees");
  await waitFor(() => completed === 1, "the correction opens the gate");
  expect(
    hasText(host, "whenever the reasoning offers two places"),
    "the conclusion names the habit rather than the numbers",
  ).toBe(true);
});

test("TrigRosterSpot names the wrong-quadrant correction for what it is", async () => {
  h = mount(<TrigRosterSpot onComplete={() => undefined} />);
  const { host } = h;
  await waitFor(() => host.querySelector("button") !== null, "the board mounts");

  tap(host, "x equals 225 degrees");
  await waitFor(
    () => hasText(host, "stopped once it had found an answer"),
    "stage two opens",
  );

  // The right COUNT in the wrong quadrant is the other failure the checker separates, and the
  // board has to distinguish it from having stopped early.
  tap(host, "x is in the set 225 degrees and 135 degrees");
  await waitFor(
    () => hasText(host, "is in the second quadrant, where a sine is"),
    "the miss is answered by naming the quadrant rather than the count",
  );
  // A missed correction is answered, not ended: the right replacement is still on offer.
  tap(host, "x is in the set 225 degrees and 315 degrees");
  await waitFor(
    () => hasText(host, "The line should read"),
    "the board settles on the correct replacement",
  );
  expect(
    findButton(host, "Try another piece of work").disabled,
    "the solved board offers a live restart",
  ).toBe(false);
});

/** True when some button under `host` has `spoken` inside its accessible name. */
function named(host: HTMLElement, spoken: string): boolean {
  return Array.from(host.querySelectorAll("button")).some((b) =>
    (b.getAttribute("aria-label") ?? "").includes(spoken),
  );
}

test("TrigRosterSpot's mirrored roster is answered with the right reading negated", async () => {
  h = mount(<TrigRosterSpot onComplete={() => undefined} />);
  const { host } = h;
  await waitFor(() => host.querySelector("button") !== null, "the first board mounts");

  // The mirrored roster is the second board's miss, so the first board has to be finished
  // before the sentence under test is reachable at all.
  tap(host, "x equals 225 degrees");
  await waitFor(
    () => hasText(host, "stopped once it had found an answer"),
    "stage two opens",
  );
  tap(host, "x is in the set 225 degrees and 315 degrees");
  await waitFor(() => hasText(host, "The line should read"), "the first board settles");
  findButton(host, "Try another piece of work").click();
  await waitFor(() => named(host, "x equals 150 degrees"), "the cosine board deals");

  tap(host, "x equals 150 degrees");
  await waitFor(
    () => hasText(host, "only one of them reaches the answer"),
    "stage two opens on the cosine board",
  );

  // 330 degrees is 30 degrees mirrored across the HORIZONTAL axis, and that reflection
  // negates the vertical coordinate: the sine flips and the cosine is left alone. Telling a
  // learner it is the sine that survives teaches the negation backwards at the one moment
  // they are being corrected.
  tap(host, "x is in the set 150 degrees and 330 degrees");
  await waitFor(
    () => hasText(host, "in the fourth quadrant, where a cosine is"),
    "the mirrored roster is answered",
  );
  expect(
    hasText(host, "the reflection that leaves a SINE alone"),
    "the sentence sent to fix the error does not transpose the two readings",
  ).toBe(false);
  expect(
    hasText(host, "leaves a COSINE exactly where it was"),
    "the miss names the reading the reflection preserves",
  ).toBe(true);
});
