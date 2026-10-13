import { afterEach, expect, test } from "vitest";

import { type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { TrigPeriodTable } from "./TrigPeriodTable";

/**
 * Three blanks, one gate. The two mistakes the tray exists to allow are both made here
 * before the right value is placed: multiplying the turn by the coefficient rather than
 * dividing by it, and dividing a turn that has lost its $2$. Neither is caught by re-reading
 * the rule, because both feel like the rule was applied.
 */
function chip(host: HTMLElement, spoken: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `.lesson-sorter__chip[aria-label="${spoken}"]`,
  );
  if (!found) {
    throw new Error(`no chip for ${spoken}`);
  }
  return found;
}

function openSlot(host: HTMLElement): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(".lesson-table__slot");
  if (!found) {
    throw new Error("no open blank");
  }
  return found;
}

/** Tap a value and then tap the blank waiting for it, the way a learner does. */
function place(host: HTMLElement, spoken: string): void {
  chip(host, spoken).click();
  openSlot(host).click();
}

/**
 * How many rows the table counts as settled: the worked row plus every blank filled so far.
 *
 * A second wrong placement leaves the same refusal on screen as the first one, so asserting
 * the words alone would pass without the table having refused anything. This counts what
 * actually moved.
 */
function settledRows(host: HTMLElement): number {
  return host.querySelectorAll('tr[data-state="done"]').length;
}

/**
 * Place a value that belongs, and wait for the table to move on to the next blank.
 *
 * The wait is not politeness. Two placements fired back to back land in one React batch,
 * and the second one reads the table as it was before the first, so it answers a row that
 * has already moved on.
 */
async function fill(host: HTMLElement, spoken: string): Promise<void> {
  const before = settledRows(host);
  place(host, spoken);
  await waitFor(
    () => settledRows(host) === before + 1,
    `the row taking ${spoken} settles before the next one is answered`,
  );
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigPeriodTable refuses both period mistakes and gates on the whole table", async () => {
  let completed = 0;
  h = mount(<TrigPeriodTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-table") !== null, "the table mounts");

  // The worked row is given, and the three rows that follow it are not.
  expect(hasMath(host, "y = \\sin(x)")).toBe(true);
  expect(hasMath(host, "6x = 2\\pi")).toBe(true);

  // Multiplying the turn by the coefficient instead of dividing by it: the mistake a
  // learner makes when "a bigger coefficient" is read as "a bigger cycle".
  place(host, "4 pi");
  await waitFor(() => hasText(host, "Not that one"), "the multiplied period is refused");
  expect(completed).toBe(0);

  await fill(host, "pi");
  expect(hasText(host, "Not that one"), "the refusal outlived the right answer").toBe(
    false,
  );
  expect(completed, "one blank alone opened the gate").toBe(0);

  const beforeRow2 = settledRows(host);
  place(host, "6 pi");
  await waitFor(() => hasText(host, "Not that one"), "the second multiplied period fails");
  // The row below's answer, which is also what dropping the 2 from this row produces. It is
  // on the tray as a real value and is still wrong here.
  place(host, "pi over 3");
  expect(settledRows(host), "a wrong value settled the row anyway").toBe(beforeRow2);
  await fill(host, "2 pi over 3");
  expect(hasText(host, "Not that one"), "the refusal outlived the right answer").toBe(
    false,
  );
  expect(completed).toBe(0);

  // The turn with its 2 dropped, which lands on a value that looks like a period.
  place(host, "pi over 6");
  await waitFor(() => hasText(host, "Not that one"), "the halved turn is refused");
  expect(completed).toBe(0);

  await fill(host, "pi over 3");
  await waitFor(() => completed === 1, "the last blank opens the gate");
  expect(hasText(host, "A bigger coefficient gives a SHORTER cycle")).toBe(true);
  expect(completed, "the gate latches exactly once").toBe(1);
});

test("TrigPeriodTable deals the key-headings board on a restart", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(<TrigPeriodTable onComplete={() => completed++} onReopen={() => reopened++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-table") !== null, "the table mounts");

  await fill(host, "pi");
  await fill(host, "2 pi over 3");
  await fill(host, "pi over 3");
  await waitFor(() => completed === 1, "the periods board is finished");

  const restart = host.querySelector<HTMLButtonElement>(".lesson-interactive__reset");
  if (!restart) {
    throw new Error("no restart control on the finished table");
  }
  restart.click();
  await waitFor(() => reopened === 1, "the restart closes the gate again");
  await waitFor(
    () => hasMath(host, "\\dfrac{3}{4} \\times \\dfrac{\\pi}{2}"),
    "the second board asks for the headings inside one cycle, not another set of periods",
  );
  expect(completed, "the restart did not re-latch the gate").toBe(1);
});

test("TrigPeriodTable offers its reveal only after a real attempt", async () => {
  h = mount(<TrigPeriodTable />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-table") !== null, "the table mounts");

  expect(hasText(host, "Reveal")).toBe(false);

  place(host, "4 pi");
  await waitFor(() => hasText(host, "Reveal"), "the reveal is offered after an attempt");
});
