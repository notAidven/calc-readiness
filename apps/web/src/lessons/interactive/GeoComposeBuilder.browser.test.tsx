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
import { GeoComposeBuilder } from "./GeoComposeBuilder";

/**
 * The first plan is $10$ by $8$ with a $4$ by $3$ corner missing, cut into a $10$ by $5$
 * rectangle and a $6$ by $3$ one, so the board's three answers are $50$, $18$ and $68$. The
 * test types all three, because a board that opened its gate on the total alone would let a
 * learner past without ever decomposing anything.
 */
const LOWER = "the area of the lower rectangle, in square meters";
const UPPER = "the area of the upper rectangle, in square meters";
const WHOLE = "the area of the whole plan, in square meters";

function field(host: HTMLElement, aria: string): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>(`input[aria-label="${aria}"]`);
  if (!input) {
    throw new Error(`no blank labelled "${aria}"`);
  }
  return input;
}

/** Type into one blank and wait for the controlled value to come back. */
async function type(host: HTMLElement, aria: string, value: string): Promise<void> {
  setInputValue(field(host, aria), value);
  await waitFor(() => field(host, aria).value === value, `"${aria}" holds ${value}`);
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("GeoComposeBuilder gates on all three blanks, exactly once", async () => {
  let completed = 0;
  h = mount(<GeoComposeBuilder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("input").length === 3, "three blanks mount");

  // Every side the two pieces are measured by is dimensioned on the drawing.
  expect(hasMath(host, "10"), "the bottom side is labelled").toBe(true);
  expect(hasMath(host, "5"), "the right side is labelled").toBe(true);
  expect(hasMath(host, "6"), "the top side is labelled").toBe(true);

  await type(host, LOWER, "50");
  await type(host, UPPER, "18");
  findButton(host, "Check").click();
  await waitFor(
    () => host.querySelectorAll("input").length === 1,
    "both piece blanks settle and only the total is left",
  );
  expect(completed, "two pieces without the total do not finish the board").toBe(0);

  await type(host, WHOLE, "68");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "the gate opens once the plan is totalled");
  expect(hasText(host, "The plan covers")).toBe(true);
  expect(hasMath(host, "68"), "the total is reported").toBe(true);
  expect(completed, "the gate opens exactly once").toBe(1);
});

test("GeoComposeBuilder holds the gate shut on a wrong piece and offers the working", async () => {
  let completed = 0;
  h = mount(<GeoComposeBuilder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("input").length === 3, "three blanks mount");

  expect(hasText(host, "Reveal"), "no reveal before an attempt").toBe(false);

  // The whole rectangle rather than the piece the cut actually makes.
  await type(host, LOWER, "80");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Not yet"), "the wrong piece is named as wrong");
  expect(completed, "a wrong piece keeps the gate shut").toBe(0);
  expect(hasText(host, "Reveal this piece"), "the working is offered").toBe(true);
  expect(field(host, LOWER).value, "the blank stays the learner's to correct").toBe("80");
});

test("GeoComposeBuilder deals the other route on restart", async () => {
  h = mount(<GeoComposeBuilder />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("input").length === 3, "three blanks mount");

  await type(host, LOWER, "50");
  await type(host, UPPER, "18");
  await type(host, WHOLE, "68");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "The plan covers"), "the first plan finishes");

  findButton(host, "Start over on a different plan").click();
  await waitFor(
    () => hasText(host, "taken out"),
    "the second plan is read as a rectangle with a corner removed",
  );
  expect(
    host.querySelector(`input[aria-label="${LOWER}"]`),
    "the added-pieces blanks are gone with the route",
  ).toBeNull();
  expect(hasMath(host, "12"), "the second plan is a different figure").toBe(true);
});
