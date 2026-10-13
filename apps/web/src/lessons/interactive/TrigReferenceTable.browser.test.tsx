import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigReferenceTable } from "./TrigReferenceTable";

/**
 * Two blanks, one gate, and the given row is not one of them.
 *
 * The first board gives 150 degrees against its reference angle of 30, then asks for 210
 * degrees (Quadrant III, also 30) and 300 degrees (Quadrant IV, 60). The two together are
 * what the table is for: the same acute angle turning up from a different quadrant, and a
 * different one turning up from the quadrant next door.
 */
function pick(host: HTMLElement, spoken: string): void {
  const chip = host.querySelector<HTMLButtonElement>(`button[aria-label="${spoken}"]`);
  if (!chip) {
    throw new Error(`no tray chip for "${spoken}"`);
  }
  chip.click();
}

function dropOnOpenRow(host: HTMLElement): void {
  const slot = host.querySelector<HTMLButtonElement>("button.lesson-table__slot");
  if (!slot) {
    throw new Error("no open slot");
  }
  slot.click();
}

function place(host: HTMLElement, spoken: string): void {
  pick(host, spoken);
  dropOnOpenRow(host);
}

function done(host: HTMLElement): number {
  return host.querySelectorAll('tr[data-state="done"]').length;
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigReferenceTable gates only once both reference angles are placed", async () => {
  let completed = 0;
  h = mount(<TrigReferenceTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("table.lesson-table") !== null,
    "the table mounts",
  );

  // The given row counts as done from the start; the two blanks do not.
  expect(done(host)).toBe(1);

  place(host, "30 degrees");
  await waitFor(() => done(host) === 2, "the Quadrant III row lands");
  expect(completed, "one blank of two is not the table").toBe(0);

  place(host, "60 degrees");
  await waitFor(() => completed === 1, "gates on the second blank");
  expect(done(host)).toBe(3);
  expect(hasText(host, "Table complete")).toBe(true);
});

test("TrigReferenceTable refuses the subtraction run the wrong way", async () => {
  let completed = 0;
  h = mount(<TrigReferenceTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("table.lesson-table") !== null,
    "the table mounts",
  );

  // 360 - 210 is 150: the Quadrant IV move applied to a Quadrant III heading, which is the
  // slip the board's distractors exist for.
  place(host, "150 degrees");
  await waitFor(() => hasText(host, "Not that one"), "the wrong value is refused");
  expect(done(host), "a refused value does not fill the row").toBe(1);
  expect(completed).toBe(0);

  place(host, "30 degrees");
  await waitFor(() => done(host) === 2, "the right value still lands afterwards");
  expect(completed).toBe(0);
});
