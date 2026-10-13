import { afterEach, expect, test } from "vitest";

import { findButton, type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigEvenOddSorter } from "./TrigEvenOddSorter";

/**
 * Four odd and two even, so a learner tapping the same call down the board gets four rows
 * wrong, and the two even ones are cosine and secant while two of the four odd ones are
 * cosecant and cotangent. That split is the reason the board exists, so the tests assert the
 * split itself rather than only that six rows can be answered.
 *
 * Rows are taken by `aria-label`, which is the one channel that survives KaTeX: the call
 * buttons carry the spoken name of the row plus the label, and a settled one appends what
 * the mark means.
 */
const CALLS: readonly [string, string][] = [
  ["sine", "odd"],
  ["cosine", "even"],
  ["tangent", "odd"],
  ["cosecant", "odd"],
  ["secant", "even"],
  ["cotangent", "odd"],
];

function call(host: HTMLElement, row: string, label: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `button[aria-label="${row}: ${label}"]`,
  );
  if (!found) {
    throw new Error(`no open call ${label} on row ${row}`);
  }
  return found;
}

function settled(host: HTMLElement): number {
  return host.querySelectorAll('[data-settled="true"]').length;
}

/**
 * Calls one row and waits for it to settle before returning.
 *
 * The wait is load-bearing rather than tidiness. The board keeps its calls in one state
 * object and each handler merges into the value it closed over, so six clicks fired inside a
 * single synchronous loop all merge into the same empty object and only the last one
 * survives. A test written that way reports a five-row board as unfinished and looks like a
 * gate bug.
 */
async function answerRow(host: HTMLElement, row: string, label: string): Promise<void> {
  const before = settled(host);
  call(host, row, label).click();
  await waitFor(() => settled(host) === before + 1, `${row} settles`);
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigEvenOddSorter gates only once all six functions are called", async () => {
  let completed = 0;
  h = mount(<TrigEvenOddSorter onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-classify") !== null, "the board mounts");

  for (const [row, label] of CALLS.slice(0, 5)) {
    await answerRow(host, row, label);
    expect(completed, "the gate opened with rows still open").toBe(0);
  }

  const [row, label] = CALLS[5] as [string, string];
  call(host, row, label).click();
  await waitFor(() => completed === 1, "the sixth call opens the gate");
  expect(hasText(host, "Two even and four odd")).toBe(true);
  // No reveal on a clean board: nothing was missed, so there is nothing to show working for.
  expect(hasText(host, "Show the working")).toBe(false);
});

test("TrigEvenOddSorter locks a wrong call and says why on the row", async () => {
  let completed = 0;
  h = mount(<TrigEvenOddSorter onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-classify") !== null, "the board mounts");

  // The cosine is one of the two that come back unchanged, and calling it odd is the miss
  // the whole board is built around.
  call(host, "cosine", "odd").click();
  await waitFor(
    () => hasText(host, "leaves the horizontal coordinate alone"),
    "the missed row prints its reason",
  );
  expect(
    host.querySelector('button[aria-label="cosine: odd, your answer, wrong"]'),
  ).not.toBeNull();
  expect(
    host.querySelector(
      'button[aria-label="cosine: even, the right call here, which you did not pick"]',
    ),
    "the correct call is marked without being credited to the learner",
  ).not.toBeNull();

  // Locked: the row's other option is disabled, so the second guess is not on offer.
  const second = host.querySelector<HTMLButtonElement>(
    'button[aria-label="cosine: even, the right call here, which you did not pick"]',
  );
  expect(second?.disabled).toBe(true);

  // The remaining five still answer, and a called board opens even with the miss standing.
  for (const [row, label] of CALLS) {
    if (row !== "cosine") {
      await answerRow(host, row, label);
    }
  }
  await waitFor(() => completed === 1, "every row called opens the gate");
  expect(hasText(host, "The co- at the front of a name does not sort this board")).toBe(
    true,
  );
  expect(hasText(host, "Show the working")).toBe(true);
});

test("TrigEvenOddSorter deals the reversed-heading board on restart", async () => {
  h = mount(<TrigEvenOddSorter />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-classify") !== null, "the board mounts");

  // The secant is even for the same reason the cosine is, and it is the row a learner sorting
  // by the co- in a name gets wrong twice over.
  expect(host.querySelector('button[aria-label="secant: even"]')).not.toBeNull();

  for (const [row, label] of CALLS) {
    await answerRow(host, row, label);
  }
  await waitFor(() => hasText(host, "Two even and four odd"), "the first board finishes");

  findButton(host, "Start over on readings at a reversed heading").click();
  await waitFor(
    () =>
      host.querySelector('button[aria-label="cosine of negative theta: unchanged"]') !==
      null,
    "the second board asks what each reversed reading does",
  );
  expect(host.querySelector('button[aria-label="cosine: even"]')).toBeNull();
});
