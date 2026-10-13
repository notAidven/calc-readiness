import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { TrigReciprocalMatch } from "./TrigReciprocalMatch";

/**
 * The board's whole argument is that the co- in a name does not decide the pairing, so the
 * two joins it has to refuse are the two the spelling suggests: the secant taken to be one
 * over the SINE, and the sine taken to be one over ITSELF. Both wrong partners are on the
 * board, which is what makes the refusal worth anything.
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
  ["sine", "one over cosecant"],
  ["secant", "one over cosine"],
  ["cotangent", "one over tangent"],
  ["cosecant", "one over sine"],
];

async function join(host: HTMLElement, left: string, right: string): Promise<void> {
  pickUp(host, left).click();
  joinTo(host, right).click();
  await waitFor(
    () => host.querySelector(`button[aria-label="${left} is joined to ${right}"]`) !== null,
    `${left} joins ${right}`,
  );
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigReciprocalMatch refuses the pairing the spelling suggests", async () => {
  let completed = 0;
  h = mount(<TrigReciprocalMatch onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board mounts",
  );

  // The secant belongs to the cosine, and "one over sine" is on the board as somebody
  // else's answer, so the slip has a real partner to land on.
  pickUp(host, "secant").click();
  joinTo(host, "one over sine").click();
  await waitFor(
    () => hasText(host, "secant is not one over sine"),
    "the co- pairing is refused and named",
  );
  expect(completed).toBe(0);

  // And a function is not its own reciprocal, which the board can also say no to.
  pickUp(host, "sine").click();
  joinTo(host, "one over sine").click();
  await waitFor(
    () => hasText(host, "sine is not one over sine"),
    "a function joined to its own reciprocal is refused",
  );

  // Neither refusal cost the learner the pair: it is still open and still takes the join.
  await join(host, "secant", "one over cosine");
  expect(completed, "one joined pair opened the gate").toBe(0);
});

test("TrigReciprocalMatch gates only when every pair is joined", async () => {
  let completed = 0;
  h = mount(<TrigReciprocalMatch onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board mounts",
  );

  for (const [left, right] of PAIRS.slice(0, 3)) {
    await join(host, left, right);
    expect(completed, "the gate opened with pairs still open").toBe(0);
  }

  const [left, right] = PAIRS[3] as [string, string];
  await join(host, left, right);
  await waitFor(() => completed === 1, "the last pair opens the gate");
  expect(hasText(host, "The co- at the front of a name")).toBe(true);
});

test("TrigReciprocalMatch offers a reveal after a miss and deals readings on restart", async () => {
  h = mount(<TrigReciprocalMatch />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board mounts",
  );

  expect(hasText(host, "Reveal this pair")).toBe(false);
  pickUp(host, "secant").click();
  joinTo(host, "one over sine").click();
  await waitFor(
    () => hasText(host, "Reveal this pair"),
    "the reveal is offered after a miss",
  );

  for (const [left, right] of PAIRS) {
    if (host.querySelector(`button[aria-label="Pick up ${left}"]`) !== null) {
      await join(host, left, right);
    }
  }
  await waitFor(
    () => hasText(host, "Sine goes with cosecant"),
    "the symbolic board finishes",
  );

  findButton(host, "Start over on a board of readings").click();
  await waitFor(
    () => hasMath(host, "\\dfrac{13}{5}"),
    "the second board carries readings rather than bare names",
  );
});
