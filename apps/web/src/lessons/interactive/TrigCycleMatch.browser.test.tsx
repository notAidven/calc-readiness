import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigCycleMatch } from "./TrigCycleMatch";

/**
 * The gate is the claim: four pairs, and the widget may only let the learner past once every
 * one of them is joined. Two of the four carry a coefficient inside and two do not, so a gate
 * that opened early could open on a board holding only the two plain functions, which is the
 * half that does not exercise the division.
 *
 * The second test is the misconception, and it is the reason the board is a matching rather
 * than four separate questions: joining tangent to a whole turn is not merely wrong, it is
 * secant's answer, so the wrong join has to be REFUSED rather than absorbed.
 *
 * Buttons are taken by their exact `aria-label`, because "pi" is a prefix of "pi over two"
 * and "tangent of theta" sits beside "tangent of two theta".
 *
 * Every tap is settled before the next one. Two taps fired in the same task are one React
 * batch over one stale state closure, so the second silently replaces the first and the board
 * stalls a pair short; the sibling sorter tests settle between taps for the same reason.
 */
function labelled(host: HTMLElement, spoken: string): HTMLButtonElement {
  const match = Array.from(host.querySelectorAll("button")).find(
    (button) => button.getAttribute("aria-label") === spoken,
  );
  if (!match) {
    throw new Error(`no button labelled ${spoken}`);
  }
  return match;
}

/** Both columns settle, so a joined pair counts two. */
function joined(host: HTMLElement): number {
  return host.querySelectorAll('.lesson-match__item[data-state="joined"]').length;
}

async function pickUp(host: HTMLElement, left: string): Promise<void> {
  labelled(host, `Pick up ${left}`).click();
  await waitFor(
    () => labelled(host, `Pick up ${left}`).getAttribute("aria-pressed") === "true",
    `${left} is in hand`,
  );
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigCycleMatch gates only once all four periods are joined", async () => {
  let completed = 0;
  h = mount(<TrigCycleMatch onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board draws",
  );

  await pickUp(host, "tangent of theta");
  labelled(host, "Join what you are holding to pi").click();
  await waitFor(() => joined(host) === 2, "the half turn lands");
  expect(completed, "one pair is not the board").toBe(0);

  await pickUp(host, "secant of theta");
  labelled(host, "Join what you are holding to two pi").click();
  await waitFor(() => joined(host) === 4, "the whole turn lands");
  expect(completed).toBe(0);

  await pickUp(host, "tangent of two theta");
  labelled(host, "Join what you are holding to pi over two").click();
  await waitFor(() => joined(host) === 6, "the squeezed tangent lands");
  expect(completed, "three pairs is not the board either").toBe(0);

  await pickUp(host, "cosecant of three theta");
  labelled(host, "Join what you are holding to two pi over three").click();
  await waitFor(() => completed === 1, "gates on the completed board");
});

test("TrigCycleMatch refuses a period that belongs to another function", async () => {
  let completed = 0;
  h = mount(<TrigCycleMatch onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-match__grid") !== null,
    "the board draws",
  );

  // A whole turn is the answer a learner reaches for because it is the one they remember,
  // and on this board it is secant's rather than tangent's.
  await pickUp(host, "tangent of theta");
  labelled(host, "Join what you are holding to two pi").click();
  await waitFor(() => hasText(host, "Not quite"), "the wrong join is refused");
  expect(joined(host), "nothing settles on a refusal").toBe(0);
  expect(completed).toBe(0);

  await pickUp(host, "tangent of theta");
  labelled(host, "Join what you are holding to pi").click();
  await waitFor(() => joined(host) === 2, "the right join still lands afterwards");
  expect(completed).toBe(0);
});
