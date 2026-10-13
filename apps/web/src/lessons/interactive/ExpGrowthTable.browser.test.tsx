import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { ExpGrowthTable } from "./ExpGrowthTable";

/**
 * The gate is the claim worth a test here: the table's four blanks are two rows of a rule
 * that adds and two rows of a rule that multiplies, and the widget may only let the learner
 * past once all four are filled from the tray. A gate that opened on the first blank would
 * look identical on screen.
 *
 * Chips are taken by their `aria-label` rather than their text, because KaTeX emits every
 * glyph twice and `12` rendered as `1212` contains the string `21`. Progress is read off the
 * rows' `data-state` for the same reason: every answer is also on a tray chip, so the value
 * appearing SOMEWHERE in the widget's LaTeX proves nothing about the table.
 */
function chip(host: HTMLElement, spoken: string): HTMLButtonElement {
  const match = Array.from(host.querySelectorAll("button")).find(
    (button) => button.getAttribute("aria-label") === spoken,
  );
  if (!match) {
    throw new Error(`no tray chip labelled ${spoken}`);
  }
  return match;
}

function slot(host: HTMLElement): HTMLButtonElement {
  const open = host.querySelector<HTMLButtonElement>("button.lesson-table__slot");
  if (!open) {
    throw new Error("no open slot");
  }
  return open;
}

/** How many rows are settled: the four given ones, plus every blank filled so far. */
function settledRows(host: HTMLElement): number {
  return host.querySelectorAll('tr[data-state="done"]').length;
}

/** Hold a value, then drop it in whichever row is open. */
async function place(host: HTMLElement, spoken: string): Promise<void> {
  chip(host, spoken).click();
  await waitFor(
    () => chip(host, spoken).getAttribute("aria-pressed") === "true",
    `held ${spoken}`,
  );
  slot(host).click();
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("ExpGrowthTable gates only once all four blanks are filled", async () => {
  let completed = 0;
  h = mount(<ExpGrowthTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("button.lesson-table__slot") !== null,
    "table mounts",
  );

  // The four worked rows are the pattern, and none of the four blanks is settled yet.
  expect(settledRows(host)).toBe(4);

  // The first board's blanks, top to bottom: the adding rule reaches 15 then 21, and the
  // multiplying rule reaches 27 then 81 from the same starting amount.
  await place(host, "15");
  await waitFor(() => settledRows(host) === 5, "the first blank took its value");
  expect(completed, "one blank is not the table").toBe(0);

  await place(host, "21");
  await waitFor(() => settledRows(host) === 6, "the adding rule is finished");
  await place(host, "27");
  await waitFor(() => settledRows(host) === 7, "the multiplying rule's first blank landed");
  expect(completed, "three of four blanks still hold the gate").toBe(0);

  await place(host, "81");
  await waitFor(() => completed === 1, "gates on the completed table");
  expect(hasText(host, "Table complete")).toBe(true);
});

test("ExpGrowthTable refuses a value the rule does not produce", async () => {
  let completed = 0;
  h = mount(<ExpGrowthTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("button.lesson-table__slot") !== null,
    "table mounts",
  );

  // 12 is what a learner reaches by adding the increase to the step number rather than to
  // the amount in the row above, so it is refused and the row stays open.
  await place(host, "12");
  await waitFor(() => hasText(host, "Not that one"), "the wrong value is refused");
  expect(settledRows(host)).toBe(4);
  expect(completed).toBe(0);

  await place(host, "15");
  await waitFor(() => settledRows(host) === 5, "the right value still lands afterwards");
  expect(completed).toBe(0);
});
