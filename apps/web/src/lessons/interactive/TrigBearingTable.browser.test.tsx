import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigBearingTable } from "./TrigBearingTable";

/**
 * The gate is the claim: the table holds three blank headings and the widget may only let the
 * learner past once all three are worked out. One row is a fact about one sweep; the column is
 * the convention the slide is about, and a gate that opened on the first row would look
 * identical on screen.
 *
 * Chips are taken by `aria-label` rather than by text, because KaTeX emits every glyph twice,
 * so matching on `240` proves nothing about which value went where. Progress is read off the
 * rows' `data-state` for the same reason.
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

test("TrigBearingTable gates only once every blank heading is worked out", async () => {
  let completed = 0;
  h = mount(<TrigBearingTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("button.lesson-table__slot") !== null,
    "table mounts",
  );

  // The quarter turn is given as the pattern; the other three rows are open.
  expect(settledRows(host)).toBe(1);

  await place(host, "180 degrees");
  await waitFor(() => settledRows(host) === 2, "half a turn lands");
  expect(completed, "one row of three is not the column").toBe(0);

  await place(host, "240 degrees");
  await waitFor(() => settledRows(host) === 3, "two thirds of a turn lands");
  expect(completed, "two rows of three is not the column").toBe(0);

  await place(host, "360 degrees");
  await waitFor(() => completed === 1, "gates on the completed table");
  expect(hasText(host, "standard position")).toBe(true);
});

test("TrigBearingTable refuses a heading the fraction does not produce", async () => {
  let completed = 0;
  h = mount(<TrigBearingTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("button.lesson-table__slot") !== null,
    "table mounts",
  );

  // 120 degrees is a THIRD of a turn, which is the misreading the tray deliberately offers
  // for the two-thirds row further down. The half turn is not it.
  await place(host, "120 degrees");
  await waitFor(() => hasText(host, "Not that one"), "the wrong heading is refused");
  expect(settledRows(host)).toBe(1);
  expect(completed).toBe(0);

  await place(host, "180 degrees");
  await waitFor(() => settledRows(host) === 2, "the right heading still lands afterwards");
  expect(completed).toBe(0);
});
