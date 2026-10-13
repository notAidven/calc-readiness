import { afterEach, expect, test } from "vitest";

import { type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { TrigSixTable } from "./TrigSixTable";

/**
 * Four blanks, and the gate is the claim: the slide says six functions come out of two
 * readings, and one filled row is not six functions. A gate that opened on the tangent
 * would look identical on screen.
 *
 * Chips are taken by `aria-label` rather than by text, because KaTeX emits every glyph
 * twice and a `\dfrac` renders no slash to search for. Progress is read off the rows'
 * `data-state` for the same reason.
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

test("TrigSixTable gates only once all four derived functions are worked out", async () => {
  let completed = 0;
  h = mount(<TrigSixTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("button.lesson-table__slot") !== null,
    "the table mounts",
  );

  // The two measured readings are the pattern; the four below them are blank.
  expect(settledRows(host)).toBe(2);

  // Sine 3/5 and cosine 4/5, so tangent 3/4, cosecant 5/3, secant 5/4, cotangent 4/3.
  await place(host, "3 over 4");
  await waitFor(() => settledRows(host) === 3, "the tangent lands");
  await place(host, "5 over 3");
  await waitFor(() => settledRows(host) === 4, "the cosecant lands");
  await place(host, "5 over 4");
  await waitFor(() => settledRows(host) === 5, "the secant lands");
  expect(completed, "three of four rows do not finish the table").toBe(0);

  await place(host, "4 over 3");
  await waitFor(() => completed === 1, "the completed table opens the gate");
  expect(hasText(host, "Table complete")).toBe(true);
  expect(hasText(host, "two independent numbers")).toBe(true);
});

test("TrigSixTable refuses a reading copied straight down", async () => {
  let completed = 0;
  h = mount(<TrigSixTable onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("button.lesson-table__slot") !== null,
    "the table mounts",
  );

  // 3/5 is the sine itself, sitting in the tray precisely so that copying it is possible.
  await place(host, "3 over 5");
  await waitFor(() => hasText(host, "Not that one"), "the copied reading is refused");
  expect(settledRows(host)).toBe(2);
  expect(completed).toBe(0);

  // 4/3 is the cotangent, which is the tangent upside down: right value, wrong row.
  await place(host, "4 over 3");
  await waitFor(
    () => hasText(host, "Not that one"),
    "the tangent's reciprocal is refused in the tangent's row",
  );
  expect(settledRows(host)).toBe(2);

  await place(host, "3 over 4");
  await waitFor(() => settledRows(host) === 3, "the tangent still lands afterwards");
  expect(completed).toBe(0);
});

test("TrigSixTable offers its reveal only after a wrong value, and deals a new heading", async () => {
  h = mount(<TrigSixTable />);
  const { host } = h;
  await waitFor(
    () => host.querySelector("button.lesson-table__slot") !== null,
    "the table mounts",
  );

  expect(hasText(host, "Reveal this row")).toBe(false);
  await place(host, "3 over 5");
  await waitFor(
    () => hasText(host, "Reveal this row"),
    "the reveal is offered after a miss",
  );

  for (const value of ["3 over 4", "5 over 3", "5 over 4", "4 over 3"]) {
    await place(host, value);
  }
  await waitFor(() => hasText(host, "Table complete"), "the first heading finishes");

  const reset = Array.from(host.querySelectorAll("button")).find((button) =>
    (button.textContent ?? "").includes("Start over at a different heading"),
  );
  if (!reset) {
    throw new Error("no restart control on the finished table");
  }
  reset.click();
  await waitFor(
    () => hasMath(host, "\\dfrac{12}{13}"),
    "the second heading is a different pair of readings",
  );
});
