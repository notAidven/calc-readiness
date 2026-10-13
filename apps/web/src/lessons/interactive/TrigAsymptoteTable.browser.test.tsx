import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigAsymptoteTable } from "./TrigAsymptoteTable";

/**
 * The gate is the claim: the table holds FOUR blank headings and the widget may only let the
 * learner past once every one of them is settled. Two of the four have no value at all, and a
 * gate that opened on the first row would let a learner past having filled in a row where the
 * division worked, which is the half of the table that teaches nothing.
 *
 * Chips are taken by `aria-label` rather than by text: KaTeX emits every glyph twice, so a
 * tray chip rendering `-1` contains the string `1-1` and text matching proves nothing about
 * which value went where. Progress is read off the rows' `data-state` for the same reason.
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

function settledRows(host: HTMLElement): number {
  return host.querySelectorAll('tr[data-state="done"]').length;
}

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

test("TrigAsymptoteTable gates only once every heading is settled", async () => {
  let completed = 0;
  h = mount(<TrigAsymptoteTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("button.lesson-table__slot") !== null,
    "table mounts",
  );

  // The opening heading is worked as the pattern; the four below it are blank.
  expect(settledRows(host)).toBe(1);

  // 45, then 90, then 135, then 270. The two headings whose cosine is zero take the same
  // value, and it is not a number.
  await place(host, "one");
  await waitFor(() => settledRows(host) === 2, "the first division lands");
  await place(host, "undefined");
  await waitFor(() => settledRows(host) === 3, "the first break lands");
  expect(completed, "three rows of five is not the table").toBe(0);

  await place(host, "negative one");
  await waitFor(() => settledRows(host) === 4, "the negative quotient lands");
  expect(completed).toBe(0);

  await place(host, "undefined");
  await waitFor(() => completed === 1, "gates on the completed table");
  expect(hasText(host, "Table complete")).toBe(true);
});

test("TrigAsymptoteTable refuses a value the two readings do not produce", async () => {
  let completed = 0;
  h = mount(<TrigAsymptoteTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("button.lesson-table__slot") !== null,
    "table mounts",
  );

  // Root two is what the two readings at 45 degrees look like rather than what they divide
  // to, which is the mistake the tray deliberately offers. The row stays open.
  await place(host, "root two");
  await waitFor(() => hasText(host, "Not that one"), "the wrong quotient is refused");
  expect(settledRows(host)).toBe(1);
  expect(completed).toBe(0);

  await place(host, "one");
  await waitFor(() => settledRows(host) === 2, "the right quotient still lands afterwards");
  expect(completed).toBe(0);
});
