import { afterEach, expect, test } from "vitest";

import { type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { TrigSumTable } from "./TrigSumTable";

/**
 * Two blanks, one gate, and the given row is not one of them.
 *
 * The cosine board gives the product of the two cosines and asks for the product of the two sines,
 * then for what the formula makes of the pair. The second test is the reason both wrong spellings
 * of the answer are on the tray: writing $\dfrac{\sqrt{6} + \sqrt{2}}{4}$ is reading the sign off
 * the ANGLES, and writing $\dfrac{\sqrt{2} - \sqrt{6}}{4}$ is subtracting in the order the rows
 * happen to be listed in. Both have to be refused, or the last blank is a coin flip between two
 * chips that differ by one character.
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

test("TrigSumTable gates only once the products and their combination are placed", async () => {
  let completed = 0;
  h = mount(<TrigSumTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("table.lesson-table") !== null,
    "the table mounts",
  );

  // The given row counts as done from the start; the two blanks do not.
  expect(done(host)).toBe(1);
  expect(
    hasMath(host, "\\sin 45^{\\circ}\\sin 30^{\\circ}"),
    "the second product is asked",
  ).toBe(true);

  place(host, "root 2 over 4");
  await waitFor(() => done(host) === 2, "the product of the two sines lands");
  expect(completed, "one blank of two is not the table").toBe(0);

  place(host, "root 6 minus root 2, over 4");
  await waitFor(() => completed === 1, "gates on the combined value");
  expect(done(host)).toBe(3);
  expect(hasText(host, "Table complete")).toBe(true);
});

test("TrigSumTable refuses the sign read off the angles and the subtraction reversed", async () => {
  let completed = 0;
  h = mount(<TrigSumTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("table.lesson-table") !== null,
    "the table mounts",
  );

  place(host, "root 2 over 4");
  await waitFor(() => done(host) === 2, "the product row lands first");

  // A plus between the angles is a MINUS between the products, so this is the trap the whole
  // board is about.
  place(host, "root 6 plus root 2, over 4");
  await waitFor(() => hasText(host, "Not that one"), "the added form is refused");
  expect(done(host), "a refused value does not fill the row").toBe(2);
  expect(completed).toBe(0);

  // Subtracting in the order the rows are listed rather than the order the formula gives.
  place(host, "root 2 minus root 6, over 4");
  await waitFor(() => hasText(host, "Not that one"), "the reversed subtraction is refused");
  expect(done(host)).toBe(2);
  expect(completed).toBe(0);

  place(host, "root 6 minus root 2, over 4");
  await waitFor(() => completed === 1, "the right value still lands afterwards");
});

test("TrigSumTable deals a different combined angle on restart", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(<TrigSumTable onComplete={() => completed++} onReopen={() => reopened++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("table.lesson-table") !== null,
    "the table mounts",
  );

  place(host, "root 2 over 4");
  await waitFor(() => done(host) === 2, "the product row lands");
  place(host, "root 6 minus root 2, over 4");
  await waitFor(() => completed === 1, "the cosine board closes");

  const restart = host.querySelector<HTMLButtonElement>("button.lesson-interactive__reset");
  if (!restart) {
    throw new Error("no restart on the finished table");
  }
  restart.click();
  await waitFor(() => reopened === 1, "the gate closes behind the restart");
  await waitFor(
    () => hasMath(host, "\\cos 30^{\\circ}\\sin 60^{\\circ}"),
    "the sine formula is dealt instead",
  );
  expect(
    hasMath(host, "\\sin 45^{\\circ}\\sin 30^{\\circ}"),
    "not the cosine board's products",
  ).toBe(false);
  expect(done(host), "the fresh board opens with its own given row alone").toBe(1);

  place(host, "three quarters");
  await waitFor(() => done(host) === 2, "a root times itself leaves no radical");
  place(host, "one");
  await waitFor(
    () => completed === 2,
    "the sine board gates on the value it can already check",
  );
});
