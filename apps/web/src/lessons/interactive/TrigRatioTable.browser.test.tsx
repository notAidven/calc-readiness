import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigRatioTable } from "./TrigRatioTable";

/**
 * The gate is the claim: the table holds two blank ratios and may only let the learner past
 * once BOTH are worked out. One row is not the pattern this slide is making, which is that
 * all three ratios are one move over different pairs of sides.
 *
 * The first board is the 12-16-20 triangle: the sine is given as $\tfrac{12}{20}$, and the
 * cosine and the tangent are $\tfrac{16}{20}$ and $\tfrac{12}{16}$.
 *
 * The second test is the reason this widget's tray is built the way it is. Every distractor on
 * it is the RECIPROCAL of a real answer, so a learner who has the right pair of sides upside
 * down finds their answer waiting for them and is refused, which no tray of unrelated numbers
 * would do.
 *
 * Chips are taken by `aria-label` rather than by text: KaTeX emits every glyph twice, so a
 * rendered $\tfrac{16}{20}$ contains the string `1620` more than once and matching on text
 * proves nothing about which value went where. Progress is read off `data-state` for the same
 * reason.
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

test("TrigRatioTable gates only once both blank ratios are worked out", async () => {
  let completed = 0;
  h = mount(<TrigRatioTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("button.lesson-table__slot") !== null,
    "the table mounts",
  );

  // The sine row is the pattern, and neither of the two blanks is settled.
  expect(settledRows(host)).toBe(1);

  await place(host, "16 over 20");
  await waitFor(() => settledRows(host) === 2, "the cosine takes its value");
  expect(completed, "one ratio is not the table").toBe(0);

  await place(host, "12 over 16");
  await waitFor(() => completed === 1, "gates on the completed table");
  expect(hasText(host, "Table complete")).toBe(true);
  expect(completed, "the gate opens exactly once").toBe(1);
});

test("TrigRatioTable refuses the reciprocal of the ratio it asked for", async () => {
  let completed = 0;
  h = mount(<TrigRatioTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("button.lesson-table__slot") !== null,
    "the table mounts",
  );

  // The right pair of sides, in the wrong order. It is on the tray on purpose: this is the
  // mistake a learner makes while believing they applied the definition.
  await place(host, "20 over 16");
  await waitFor(() => hasText(host, "Not that one"), "the reciprocal is refused");
  expect(settledRows(host)).toBe(1);
  expect(completed).toBe(0);

  // And the sine's own value, copied down from the row above rather than rebuilt from the
  // pair of sides the cosine row names. It reads plausibly and it is a different fraction.
  await place(host, "12 over 20");
  await waitFor(
    () => hasText(host, "Not that one"),
    "the row above's value is refused on this row",
  );
  expect(settledRows(host)).toBe(1);

  await place(host, "16 over 20");
  await waitFor(() => settledRows(host) === 2, "the right value still lands afterwards");
  expect(completed).toBe(0);
});

test("TrigRatioTable offers its reveal only after a wrong value", async () => {
  h = mount(<TrigRatioTable />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("button.lesson-table__slot") !== null,
    "the table mounts",
  );

  expect(hasText(host, "Reveal"), "no reveal before an attempt").toBe(false);

  await place(host, "16 over 12");
  await waitFor(
    () => hasText(host, "Reveal this row"),
    "the reveal is offered after a wrong value",
  );
});
