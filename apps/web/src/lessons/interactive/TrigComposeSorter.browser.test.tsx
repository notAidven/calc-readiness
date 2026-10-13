import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigComposeSorter } from "./TrigComposeSorter";

/**
 * Four compositions, two of each call, one gate. The widget delegates to `kinds/BinaryRowSort`,
 * so what is asserted here is this board's own claim rather than the kind's mechanics.
 *
 * **That claim is the split**, and the second test is where it is measured: a learner running
 * on "a function and its inverse cancel" calls every row the same way and gets exactly half of
 * them wrong. A board that leaned one way would let that learner through, so the two-and-two is
 * asserted by taking the misconception down the whole board and counting the misses rather than
 * by reading the table.
 *
 * Rows are taken by `aria-label`, the one channel that survives KaTeX: each call button carries
 * the spoken composition plus its label, and a settled one appends what its mark means.
 */
const BACK = "hands the heading back";
const OTHER = "gives a different heading";

/** Board one, in board order, with the call each row actually takes. */
const FIRST: readonly [string, string][] = [
  ["arcsine of the sine of 40 degrees", BACK],
  ["arcsine of the sine of 160 degrees", OTHER],
  ["arccosine of the cosine of 100 degrees", BACK],
  ["arccosine of the cosine of negative 40 degrees", OTHER],
];

/** Board two: a different four, and again two each way. */
const SECOND: readonly [string, string][] = [
  ["arctangent of the tangent of 70 degrees", BACK],
  ["arccosine of the cosine of 200 degrees", OTHER],
  ["arcsine of the sine of negative 50 degrees", BACK],
  ["arctangent of the tangent of 160 degrees", OTHER],
];

function call(host: HTMLElement, row: string, label: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `button[aria-label="${row}: ${label}"]`,
  );
  if (!found) {
    throw new Error(`no open call "${label}" on row "${row}"`);
  }
  return found;
}

function settled(host: HTMLElement): number {
  return host.querySelectorAll('[data-settled="true"]').length;
}

function wrongCalls(host: HTMLElement): number {
  return host.querySelectorAll('button[data-mark="chosenWrong"]').length;
}

/**
 * Call every row, waiting for each to settle before the next tap.
 *
 * Written as four taps in one tick both of these tests timed out with the board short of
 * four settled rows, so some of the taps were not landing. The mechanism was not isolated
 * and no rule about React is claimed from it; the settled count is simply observed to move
 * before the next row is called.
 */
async function callAll(
  host: HTMLElement,
  rows: readonly (readonly [string, string])[],
  label?: string,
): Promise<void> {
  let called = host.querySelectorAll('[data-settled="true"]').length;
  for (const [row, own] of rows) {
    call(host, row, label ?? own).click();
    called += 1;
    await waitFor(() => settled(host) === called, `${row} settles`);
  }
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigComposeSorter gates only once all four compositions are called", async () => {
  let completed = 0;
  h = mount(<TrigComposeSorter onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-classify") !== null, "the board mounts");

  let called = 0;
  for (const [row, label] of FIRST.slice(0, 3)) {
    call(host, row, label).click();
    called += 1;
    await waitFor(() => settled(host) === called, `${row} settles`);
    expect(completed, "the gate opened with rows still open").toBe(0);
  }

  const [row, label] = FIRST[3] as [string, string];
  call(host, row, label).click();
  await waitFor(() => completed === 1, "the fourth call opens the gate");
  expect(hasText(host, "An inverse undoes its function only on the stretch")).toBe(true);
  // A clean board has nothing to show working for.
  expect(hasText(host, "Show the working")).toBe(false);
  expect(wrongCalls(host), "no row was missed").toBe(0);
});

test("TrigComposeSorter misses exactly half the board for a learner who thinks they cancel", async () => {
  let completed = 0;
  h = mount(<TrigComposeSorter onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-classify") !== null, "the board mounts");

  // The whole misconception, applied to every row: they cancel, so the heading comes back.
  await callAll(host, FIRST, BACK);
  await waitFor(() => settled(host) === 4, "every row is called");

  expect(wrongCalls(host), "two of the four rows start outside the stretch").toBe(2);
  expect(
    host.querySelector(
      `button[aria-label="arcsine of the sine of 160 degrees: ${BACK}, your answer, wrong"]`,
    ),
    "160 degrees is outside the stretch arcsine answers on",
  ).not.toBeNull();
  expect(
    host.querySelector(
      `button[aria-label="arccosine of the cosine of negative 40 degrees: ${BACK}, your answer, wrong"]`,
    ),
    "a negative heading is outside the stretch arccosine answers on",
  ).not.toBeNull();

  // The row says why on its own, without the reveal being opened.
  expect(hasText(host, "what comes back is 20 degrees instead")).toBe(true);

  // Locked: the call the learner did not take is marked and disabled rather than on offer.
  const standing = host.querySelector<HTMLButtonElement>(
    `button[aria-label="arcsine of the sine of 160 degrees: ${OTHER}, the right call here, which you did not pick"]`,
  );
  expect(standing?.disabled, "a missed row does not take a second guess").toBe(true);

  await waitFor(() => completed === 1, "a fully called board opens even with misses on it");
  expect(hasText(host, "Show the working")).toBe(true);
});

test("TrigComposeSorter deals four different compositions on restart", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <TrigComposeSorter onComplete={() => completed++} onReopen={() => reopened++} />,
  );
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-classify") !== null, "the board mounts");

  await callAll(host, FIRST);
  await waitFor(() => completed === 1, "the first board closes");

  findButton(host, "Start over with four new compositions").click();
  await waitFor(() => reopened === 1, "the gate closes behind the restart");
  await waitFor(
    () => host.querySelector(`button[aria-label="${SECOND[0]?.[0]}: ${BACK}"]`) !== null,
    "the second board is dealt",
  );
  expect(
    host.querySelector(`button[aria-label="${FIRST[0]?.[0]}: ${BACK}"]`),
    "none of the first board's rows is still up",
  ).toBeNull();

  await callAll(host, SECOND);
  await waitFor(() => completed === 2, "the second board gates in its own right");
  expect(wrongCalls(host), "the second board is answerable too").toBe(0);
});
