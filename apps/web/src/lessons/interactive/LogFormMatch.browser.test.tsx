import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { LogFormMatch } from "./LogFormMatch";

/**
 * The board's distractors are each other, and two of its pairs are a base-and-exponent SWAP
 * apart: $2^{7} = 128$ against $7^{2} = 49$. So "the same two numbers in some order" is a
 * reading the board can refuse, which is the point of matching these rather than asking about
 * them one at a time.
 *
 * That swap pair used to be $2^{5} = 32$ against $5^{2} = 25$, and it moved because the first
 * of the two was the slide's own worked example written out in both forms.
 */
function pickUp(host: HTMLElement, spoken: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `button[aria-label="Pick up ${spoken}"]`,
  );
  if (!found) {
    throw new Error(`no unjoined left item: ${spoken}`);
  }
  return found;
}

function joinTo(host: HTMLElement, spoken: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `button[aria-label="Join what you are holding to ${spoken}"]`,
  );
  if (!found) {
    throw new Error(`no unjoined right item: ${spoken}`);
  }
  return found;
}

/** The four correspondences on the first board, left spoken form against right. */
const PAIRS: readonly [string, string][] = [
  ["2 to the 7 equals 128", "log base 2 of 128 equals 7"],
  ["7 squared equals 49", "log base 7 of 49 equals 2"],
  ["3 to the 4 equals 81", "log base 3 of 81 equals 4"],
  ["4 cubed equals 64", "log base 4 of 64 equals 3"],
];

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("LogFormMatch refuses the base-and-exponent swap", async () => {
  let completed = 0;
  h = mount(<LogFormMatch onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board mounts",
  );

  // 2 and 7 in the other order. Both statements exist on the board, so the swap has a
  // plausible partner waiting for it rather than an empty slot.
  pickUp(host, "2 to the 7 equals 128").click();
  joinTo(host, "log base 7 of 49 equals 2").click();
  await waitFor(
    () => hasText(host, "is not log base 7 of 49 equals 2"),
    "the swapped join is refused and named",
  );
  expect(completed).toBe(0);

  // And the pair it belongs to is still open, so the refusal cost the learner nothing but
  // the join.
  pickUp(host, "2 to the 7 equals 128").click();
  joinTo(host, "log base 2 of 128 equals 7").click();
  await waitFor(
    () =>
      host.querySelector(
        'button[aria-label="2 to the 7 equals 128 is joined to log base 2 of 128 equals 7"]',
      ) !== null,
    "the right join lands",
  );
  expect(completed, "one joined pair opened the gate").toBe(0);
});

test("LogFormMatch gates only when every form is joined", async () => {
  let completed = 0;
  h = mount(<LogFormMatch onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board mounts",
  );

  for (const [left, right] of PAIRS.slice(0, 3)) {
    pickUp(host, left).click();
    joinTo(host, right).click();
    await waitFor(
      () =>
        host.querySelector(`button[aria-label="${left} is joined to ${right}"]`) !== null,
      `${left} joins`,
    );
    expect(completed, "the gate opened with pairs still open").toBe(0);
  }

  const [left, right] = PAIRS[3] as [string, string];
  pickUp(host, left).click();
  joinTo(host, right).click();
  await waitFor(() => completed === 1, "the last pair opens the gate");
  expect(hasText(host, "one statement written two ways")).toBe(true);
});

test("LogFormMatch offers its reveal only after a wrong join", async () => {
  h = mount(<LogFormMatch />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board mounts",
  );

  expect(hasText(host, "Reveal this pair")).toBe(false);

  pickUp(host, "2 to the 7 equals 128").click();
  joinTo(host, "log base 7 of 49 equals 2").click();
  await waitFor(
    () => hasText(host, "Reveal this pair"),
    "the reveal is offered after a miss",
  );
});
