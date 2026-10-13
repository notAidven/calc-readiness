import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { GeoCordTable } from "./GeoCordTable";

/**
 * The gate is the claim: the table holds two blank settings and the widget may only let the
 * learner past once BOTH are worked out, because the converse is a comparison and one row is
 * not a comparison. A gate that opened on the first blank would look identical on screen.
 *
 * Chips are taken by `aria-label` rather than by text: KaTeX emits every glyph twice, so
 * `100` rendered into the tray contains the string `010` and text matching proves nothing
 * about which value went where. Progress is read off the rows' `data-state` for the same
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

test("GeoCordTable gates only once both blank settings are worked out", async () => {
  let completed = 0;
  h = mount(<GeoCordTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("button.lesson-table__slot") !== null,
    "table mounts",
  );

  // The opening setting, 4, 9, 11, is the pattern; neither of the two blanks is settled.
  expect(settledRows(host)).toBe(1);

  // 7, 8, 9 gives 49 + 64 = 113, which misses 81. Then 6, 8, 10 gives 36 + 64 = 100, which
  // is exactly 10 squared, so that setting is the square one.
  await place(host, "113");
  await waitFor(() => settledRows(host) === 2, "the first blank took its value");
  expect(completed, "one blank is not the table").toBe(0);

  await place(host, "100");
  await waitFor(() => completed === 1, "gates on the completed table");
  expect(hasText(host, "Table complete")).toBe(true);
});

test("GeoCordTable refuses a total the setting does not produce", async () => {
  let completed = 0;
  h = mount(<GeoCordTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("button.lesson-table__slot") !== null,
    "table mounts",
  );

  // 145 is 8 squared plus 9 squared: the two LONGEST sides added, which is the mistake the
  // tray deliberately offers. The row stays open and the gate stays shut.
  await place(host, "145");
  await waitFor(() => hasText(host, "Not that one"), "the wrong total is refused");
  expect(settledRows(host)).toBe(1);
  expect(completed).toBe(0);

  await place(host, "113");
  await waitFor(() => settledRows(host) === 2, "the right total still lands afterwards");
  expect(completed).toBe(0);
});
