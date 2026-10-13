import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { TrigRadianMatch } from "./TrigRadianMatch";

/**
 * The board's distractors are each other, and the one this drives is the reading that makes a
 * radian measure look like a size: $30^{\circ}$ against $\dfrac{\pi}{4}$, which is reached by
 * taking the smaller number underneath for the smaller heading when the chip $30^{\circ}$
 * belongs to is $\dfrac{\pi}{6}$. Both chips are on the board, so the misreading has a partner
 * waiting for it rather than an empty slot, which is the whole reason these are matched rather
 * than asked one at a time.
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

/** Like `pickUp`, but reports absence instead of throwing, for waiting on a fresh deal. */
function pickUpOrNull(host: HTMLElement, spoken: string): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(`button[aria-label="Pick up ${spoken}"]`);
}

/** The four correspondences on the first board, left spoken form against right. */
const PAIRS: readonly [string, string][] = [
  ["30 degrees", "pi over 6"],
  ["45 degrees", "pi over 4"],
  ["90 degrees", "pi over 2"],
  ["120 degrees", "2 pi over 3"],
];

/** The second board's four, which share no heading with the first. */
const SECOND_BOARD: readonly [string, string][] = [
  ["60 degrees", "pi over 3"],
  ["135 degrees", "3 pi over 4"],
  ["180 degrees", "pi"],
  ["270 degrees", "3 pi over 2"],
];

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigRadianMatch refuses the join that reads the bar as a size", async () => {
  let completed = 0;
  h = mount(<TrigRadianMatch onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board mounts",
  );

  pickUp(host, "30 degrees").click();
  joinTo(host, "pi over 4").click();
  await waitFor(
    () => hasText(host, "is not pi over 4"),
    "the misread join is refused and named",
  );
  expect(completed).toBe(0);

  // And the pair it belongs to is still open, so the refusal cost the learner the join only.
  pickUp(host, "30 degrees").click();
  joinTo(host, "pi over 6").click();
  await waitFor(
    () =>
      host.querySelector('button[aria-label="30 degrees is joined to pi over 6"]') !== null,
    "the right join lands",
  );
  expect(completed, "one joined pair opened the gate").toBe(0);
});

test("TrigRadianMatch gates only when every heading is joined", async () => {
  let completed = 0;
  h = mount(<TrigRadianMatch onComplete={() => completed++} />);
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

  // The closing sentence has to survive every pair the board can serve, and this board serves
  // one that breaks any rule keyed on the denominator alone: 90 degrees is pi over 2 and 120
  // degrees is 2 pi over 3, so the chip with the BIGGER number underneath is the BIGGER sweep.
  expect(
    hasText(host, "It is the VALUE of the whole measure that ranks the sweeps"),
    "the closing rule is about the value of the measure",
  ).toBe(true);
  expect(
    hasText(host, "number underneath is a SMALLER sweep"),
    "the board does not state a rule its own pairs disprove",
  ).toBe(false);
  expect(
    hasMath(host, "\\dfrac{2\\pi}{3} > \\dfrac{\\pi}{2}"),
    "the counterexample pair is named rather than left to be noticed",
  ).toBe(true);

  // Both boards, because "survives every pair the board can serve" is a claim about the
  // population and the second board's headings are disjoint from the first's. Its own
  // counterexample is pi over 3 against 3 pi over 4.
  findButton(host, "Start over with four new headings").click();
  await waitFor(
    () => pickUpOrNull(host, "60 degrees") !== null,
    "the second board of headings deals",
  );
  for (const [left, right] of SECOND_BOARD) {
    pickUp(host, left).click();
    joinTo(host, right).click();
    await waitFor(
      () =>
        host.querySelector(`button[aria-label="${left} is joined to ${right}"]`) !== null,
      `${left} joins on the second board`,
    );
  }
  await waitFor(() => completed === 2, "the second board opens the gate too");
  expect(
    hasText(host, "It is the VALUE of the whole measure that ranks the sweeps"),
    "the closing rule is the same on the second board",
  ).toBe(true);
  expect(
    hasMath(host, "\\dfrac{3\\pi}{4} > \\dfrac{\\pi}{3}"),
    "the second board names its own counterexample rather than the first board's",
  ).toBe(true);
});

test("TrigRadianMatch offers its reveal only after a wrong join", async () => {
  h = mount(<TrigRadianMatch />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board mounts",
  );

  expect(hasText(host, "Reveal this pair")).toBe(false);

  pickUp(host, "30 degrees").click();
  joinTo(host, "pi over 4").click();
  await waitFor(
    () => hasText(host, "Reveal this pair"),
    "the reveal is offered after a miss",
  );
});
