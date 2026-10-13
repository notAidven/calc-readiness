import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { LogDomainClassify } from "./LogDomainClassify";

/**
 * The first board calls four common logarithms. Two things are pinned: the gate opens once and
 * only on a CLEAN board, and a wrong call locks its row rather than handing the learner the
 * other options back, which is what keeps a three-way question a question.
 *
 * Options are found by POSITION rather than by accessible name, because a settled option
 * renames itself to carry its verdict ("log of 1000: Above zero, your answer, correct"). A
 * name-based lookup therefore stops finding the very button whose state is under test, which
 * reads as a timeout instead of as a failed assertion.
 */
const ROWS = ["log of 1000", "log of 0.01", "log of 0", "log of negative 5"] as const;
const CALLS = ["Above zero", "Below zero", "No value"] as const;

/** The four right calls of board one, as `CALLS` indices, in the order the rows are drawn. */
const RIGHT: readonly number[] = [0, 1, 2, 2];

function option(host: HTMLElement, row: number, at: number): HTMLButtonElement {
  const rows = host.querySelectorAll(".lesson-classify__item");
  const item = rows[row];
  if (!item) {
    throw new Error(`no row ${row} of ${rows.length}`);
  }
  const found = item.querySelectorAll("button")[at];
  if (!found) {
    throw new Error(`no option ${CALLS[at]} on ${ROWS[row]}`);
  }
  return found;
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("LogDomainClassify gates once, and only when every row is called correctly", async () => {
  let completed = 0;
  h = mount(<LogDomainClassify onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelectorAll(".lesson-classify__item").length === ROWS.length,
    "the board mounts",
  );

  for (const [row, at] of RIGHT.entries()) {
    option(host, row, at).click();
    await waitFor(() => option(host, row, at).disabled, `${ROWS[row]} settles`);
    if (row < RIGHT.length - 1) {
      // Every row before the last leaves the board unfinished, so the gate stays shut.
      expect(completed, `${ROWS[row]} opened the gate early`).toBe(0);
    }
  }

  await waitFor(() => completed === 1, "a clean board opens the gate");
  expect(hasText(host, "Every call landed")).toBe(true);
  // Every option on every row is settled, so nothing is left that could latch again.
  for (const row of ROWS.keys()) {
    for (const at of CALLS.keys()) {
      expect(option(host, row, at).disabled, `${ROWS[row]} / ${CALLS[at]}`).toBe(true);
    }
  }
  expect(completed).toBe(1);
});

test("LogDomainClassify locks a wrong call and never opens the gate on that board", async () => {
  let completed = 0;
  h = mount(<LogDomainClassify onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelectorAll(".lesson-classify__item").length === ROWS.length,
    "the board mounts",
  );

  // An input between 0 and 1 gives a NEGATIVE value, so "Above zero" is the miss the second
  // row is built against.
  option(host, 1, 0).click();
  await waitFor(
    () => hasText(host, "The input lies between 0 and 1"),
    "the miss is explained under its own row",
  );
  // R25: both other options stay on screen, disabled and marked, so the comparison survives.
  expect(option(host, 1, 1).disabled).toBe(true);
  expect(option(host, 1, 2).disabled).toBe(true);
  // The wrong call cannot be taken back: clicking the right one now changes nothing.
  option(host, 1, 1).click();

  option(host, 0, 0).click();
  option(host, 2, 2).click();
  option(host, 3, 2).click();
  await waitFor(
    () => hasText(host, "a call that did not hold"),
    "a finished board with a miss reports the miss",
  );
  expect(completed).toBe(0);
});
