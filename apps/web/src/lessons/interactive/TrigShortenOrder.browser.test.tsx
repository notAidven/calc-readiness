import { afterEach, expect, test } from "vitest";

import { type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { TrigShortenOrder } from "./TrigShortenOrder";

/**
 * The chain that shortens $\sin 5t\cos 3t - \cos 5t\sin 3t$: count the angles, match the pattern,
 * write the argument, then do the arithmetic inside it.
 *
 * The first test walks in the tap this slide is about. Reaching for the collapsed function is not
 * laziness, it is the move a learner makes when they have recognized the shape and skipped the
 * sign, and the chain has to refuse it while the pattern is not on the board.
 *
 * Chips are driven by their accessible names rather than by position, because the deal is a
 * derangement and a positional test would be asserting the shuffle rather than the ordering.
 */

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

function place(host: HTMLElement, spoken: string): void {
  const label = `Place ${spoken} next`;
  const chip = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!chip) {
    throw new Error(`no chip for "${label}"`);
  }
  chip.click();
}

function placed(host: HTMLElement): number {
  return host.querySelectorAll('[data-state="placed"]').length;
}

test("TrigShortenOrder refuses the collapsed function before the pattern is named", async () => {
  let completed = 0;
  h = mount(<TrigShortenOrder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-sorter__chip") !== null,
    "the board mounts",
  );

  place(host, "sine 2 t");
  await waitFor(
    () => hasText(host, "rests on something that is not on the board yet"),
    "the out-of-order tap is refused",
  );
  expect(placed(host), "a refused tap places nothing").toBe(0);
  expect(completed).toBe(0);
});

test("TrigShortenOrder gates on the completed chain", async () => {
  let completed = 0;
  h = mount(<TrigShortenOrder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-sorter__chip") !== null,
    "the board mounts",
  );

  place(
    host,
    "two different angles appear, 5 t and 3 t, so a combining identity applies rather than a doubling one",
  );
  await waitFor(() => placed(host) === 1, "counting the angles lands first");
  expect(completed, "one rung is not the chain").toBe(0);

  place(host, "sine A cosine B minus cosine A sine B");
  await waitFor(() => placed(host) === 2, "the pattern lands second");

  place(host, "sine of 5 t minus 3 t");
  await waitFor(() => placed(host) === 3, "the argument lands third");
  expect(completed, "the arithmetic inside the argument has not been done yet").toBe(0);
  // Asserted on the chip's MATH and not only on its accessible name: an argument whose sign was
  // taken off the angles rather than off the pattern reads identically to a screen reader, and
  // the sign is the one thing this board is about. Injecting `\sin(5t + 3t)` behind the same
  // spoken label passed every other assertion in this file.
  expect(hasMath(host, "\\sin(5t - 3t)"), "the angles are subtracted inside the sine").toBe(
    true,
  );
  expect(hasMath(host, "\\sin(5t + 3t)"), "and not added").toBe(false);

  place(host, "sine 2 t");
  await waitFor(() => completed === 1, "the finished chain opens the gate");
  expect(hasMath(host, "\\sin 2t"), "the chain arrives at one sine of one angle").toBe(
    true,
  );
  expect(
    hasText(host, "Count, match, substitute, simplify"),
    "the conclusion names the order that was built",
  ).toBe(true);
});

test("TrigShortenOrder deals the other family on restart", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <TrigShortenOrder onComplete={() => completed++} onReopen={() => reopened++} />,
  );
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-sorter__chip") !== null,
    "the board mounts",
  );

  place(
    host,
    "two different angles appear, 5 t and 3 t, so a combining identity applies rather than a doubling one",
  );
  await waitFor(() => placed(host) === 1, "the count lands");
  place(host, "sine A cosine B minus cosine A sine B");
  await waitFor(() => placed(host) === 2, "the pattern lands");
  place(host, "sine of 5 t minus 3 t");
  await waitFor(() => placed(host) === 3, "the argument lands");
  place(host, "sine 2 t");
  await waitFor(() => completed === 1, "the sine board closes");

  const restart = host.querySelector<HTMLButtonElement>("button.lesson-interactive__reset");
  if (!restart) {
    throw new Error("no restart on the finished chain");
  }
  restart.click();
  await waitFor(() => reopened === 1, "the gate closes behind the restart");
  // The cosine family, where a plus between the products means the angles are subtracted.
  await waitFor(
    () => hasMath(host, "\\cos A\\cos B + \\sin A\\sin B"),
    "a fresh board is dealt",
  );
  expect(
    hasMath(host, "\\sin A\\cos B - \\cos A\\sin B"),
    "not the sine pattern again",
  ).toBe(false);
  expect(placed(host), "the fresh chain starts empty").toBe(0);
});
