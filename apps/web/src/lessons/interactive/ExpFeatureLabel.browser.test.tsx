import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { ExpFeatureLabel } from "./ExpFeatureLabel";

/**
 * Three readings, three names, one gate. The first rule is `y = 2 * 3^x + 5`, whose readings are
 * the line `y = 5`, the point `(0, 7)` and the base `3`, and the names are the terms a question
 * about any one of them would use.
 *
 * The widget delegates to `kinds/LabelParts`, so what is asserted here is the wiring rather than
 * the kind: that the gate opens once when every reading is named, that a wrong drop is refused
 * and hands the name back, and that the reveal appears only after a real attempt. The names are
 * dealt in a derangement by the kind, so the board cannot be finished left to right.
 */
function byLabel(host: HTMLElement, label: string): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!button) {
    throw new Error(`no control labelled "${label}"`);
  }
  return button;
}

/** The empty slot under each reading, named by how a screen reader says the reading. */
const SLOTS = {
  asymptote: "Label for the line y equals 5",
  intercept: "Label for the point 0 comma 7",
  factor: "Label for the 3 being raised to the power",
} as const;

function place(host: HTMLElement, name: string, slot: string): void {
  byLabel(host, name).click();
  byLabel(host, slot).click();
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("ExpFeatureLabel refuses a wrong name and gates on all three, exactly once", async () => {
  let completed = 0;
  h = mount(<ExpFeatureLabel onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length >= 6, "the figure mounts");

  // The base is the growth factor, not the asymptote, and the asymptote's slot says so.
  place(host, "growth factor", SLOTS.asymptote);
  await waitFor(() => hasText(host, "Not quite."), "a wrong name is refused");
  expect(completed).toBe(0);
  // Refused, not consumed: the name is back on offer and the slot is still empty.
  expect(byLabel(host, "growth factor")).toBeTruthy();
  expect(byLabel(host, SLOTS.asymptote).disabled).toBe(false);

  place(host, "horizontal asymptote", SLOTS.asymptote);
  await waitFor(
    () => host.querySelector(`button[aria-label="${SLOTS.asymptote}"]`) === null,
    "a named reading settles",
  );
  expect(completed, "one name of three is not the answer").toBe(0);

  place(host, "y-intercept", SLOTS.intercept);
  await waitFor(
    () => host.querySelector(`button[aria-label="${SLOTS.intercept}"]`) === null,
    "the second reading settles",
  );
  expect(completed).toBe(0);

  place(host, "growth factor", SLOTS.factor);
  await waitFor(() => completed === 1, "the gate opens on a fully named figure");
  await waitFor(() => hasText(host, "Every part named"), "the tray empties");
  expect(completed, "the gate opens exactly once").toBe(1);
});

test("ExpFeatureLabel offers its reveal only after a wrong drop", async () => {
  h = mount(<ExpFeatureLabel />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length >= 6, "the figure mounts");

  expect(hasText(host, "Reveal"), "no reveal before an attempt").toBe(false);

  place(host, "y-intercept", SLOTS.factor);
  await waitFor(
    () => hasText(host, "Reveal this part"),
    "the reveal is offered after a wrong drop",
  );
});
