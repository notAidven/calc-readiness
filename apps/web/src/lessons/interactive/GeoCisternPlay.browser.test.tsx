import { afterEach, expect, test } from "vitest";

import {
  findButton,
  type Harness,
  hasMath,
  hasText,
  mount,
  setInputValue,
  waitFor,
} from "../testHarness";
import { GeoCisternPlay } from "./GeoCisternPlay";

/**
 * The first cistern is $10$ by $4$ and $3$ deep, so its two answers are $40$ and $120$, and
 * the second is a round well of radius $3$ answered in multiples of $\pi$. The board asks for
 * the base before the volume both times, which is the claim the slide makes: the round one
 * needs a different cross section and no new rule.
 */
const FLOOR = "the area of the floor, in square meters";
const VOLUME = "the volume of the cistern, in cubic meters";
const ROUND_FLOOR = "how many pi square meters the round floor covers";
const ROUND_VOLUME = "how many pi cubic meters the well holds";

function field(host: HTMLElement, aria: string): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>(`input[aria-label="${aria}"]`);
  if (!input) {
    throw new Error(`no blank labelled "${aria}"`);
  }
  return input;
}

async function answer(host: HTMLElement, aria: string, value: string): Promise<void> {
  await waitFor(() => host.querySelector(`input[aria-label="${aria}"]`) !== null, aria);
  setInputValue(field(host, aria), value);
  await waitFor(() => field(host, aria).value === value, `"${aria}" holds ${value}`);
  findButton(host, "Check").click();
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("GeoCisternPlay gates on the base and then the volume, exactly once", async () => {
  let completed = 0;
  h = mount(<GeoCisternPlay onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(`input[aria-label="${FLOOR}"]`) !== null,
    "mounts",
  );

  expect(hasMath(host, "10 \\times 4"), "the floor is dimensioned on the equation").toBe(
    true,
  );

  await answer(host, FLOOR, "40");
  await waitFor(
    () => host.querySelector(`input[aria-label="${VOLUME}"]`) !== null,
    "the volume row opens once the base lands",
  );
  expect(completed, "the base alone does not finish the board").toBe(0);
  expect(hasMath(host, "40 \\times 3"), "the stack is written out from the base").toBe(
    true,
  );

  await answer(host, VOLUME, "120");
  await waitFor(() => completed === 1, "the gate opens on the volume");
  expect(hasText(host, "The cistern holds")).toBe(true);
  expect(hasMath(host, "120"), "the volume is reported").toBe(true);
  expect(completed, "the gate opens exactly once").toBe(1);

  // Predict, then verify: one meter of depth adds one whole base area.
  findButton(host, "One meter").click();
  await waitFor(
    () => hasMath(host, "40 \\times 1 = 40"),
    "the running total counts the first meter of depth",
  );
});

test("GeoCisternPlay holds the gate shut on the volume typed as the base", async () => {
  let completed = 0;
  h = mount(<GeoCisternPlay onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(`input[aria-label="${FLOOR}"]`) !== null,
    "mounts",
  );

  expect(hasText(host, "Reveal"), "no reveal before an attempt").toBe(false);

  // The classic slip: the whole capacity offered where the cross section was asked for.
  await answer(host, FLOOR, "120");
  await waitFor(() => hasText(host, "Not that"), "the miss is named");
  expect(completed, "a wrong base keeps the gate shut").toBe(0);
  expect(hasText(host, "Reveal the base"), "the working is offered").toBe(true);
  expect(
    host.querySelector(`input[aria-label="${VOLUME}"]`),
    "the volume row stays shut until the base lands",
  ).toBeNull();
});

test("GeoCisternPlay deals the round cistern on restart", async () => {
  h = mount(<GeoCisternPlay />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(`input[aria-label="${FLOOR}"]`) !== null,
    "mounts",
  );

  await answer(host, FLOOR, "40");
  await answer(host, VOLUME, "120");
  await waitFor(() => hasText(host, "The cistern holds"), "the first cistern finishes");

  findButton(host, "Start over on a different cistern").click();
  await waitFor(
    () => host.querySelector(`input[aria-label="${ROUND_FLOOR}"]`) !== null,
    "the round well is dealt",
  );
  expect(hasMath(host, "\\pi \\times 3^{2}"), "the round base is set up exactly").toBe(
    true,
  );
  expect(
    host.querySelector(`input[aria-label="${FLOOR}"]`),
    "the rectangular board is gone",
  ).toBeNull();
});

/**
 * The round board prints its $\pi$ beside the blank, so the blank takes a coefficient. The
 * item this board prepares, `d10.geo2.cylinder-volume-exact.l3`, grades a typed `588*pi`
 * instead, and a learner who arrives at the widget already knowing that types `9*pi` into a
 * box that cannot take it. Both places the board can speak to that learner are asserted
 * here, because neither is reachable without driving the widget: the guidance after the
 * miss, and the finished board naming the written form of the answer it just accepted.
 */
test("GeoCisternPlay sends the learner to the item's pi spelling, not away from it", async () => {
  h = mount(<GeoCisternPlay />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(`input[aria-label="${FLOOR}"]`) !== null,
    "mounts",
  );
  await answer(host, FLOOR, "40");
  await answer(host, VOLUME, "120");
  await waitFor(() => hasText(host, "The cistern holds"), "the first cistern finishes");
  findButton(host, "Start over on a different cistern").click();
  await waitFor(
    () => host.querySelector(`input[aria-label="${ROUND_FLOOR}"]`) !== null,
    "the round well is dealt",
  );

  await answer(host, ROUND_FLOOR, "9*pi");
  await waitFor(
    () => hasText(host, "there you type the whole answer yourself, written as 3*pi"),
    "the box explains its own printed pi and names the spelling practice grades",
  );
  expect(
    hasText(host, "leave the pi itself to the label"),
    "and does not teach the printed pi as the way an exact answer is entered",
  ).toBe(false);

  await answer(host, ROUND_FLOOR, "9");
  await answer(host, ROUND_VOLUME, "54");
  await waitFor(
    () => hasText(host, "that same answer is typed 54*pi"),
    "the finished board hands over the written form even to a learner who never missed",
  );
});
