import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigRangeLabel } from "./TrigRangeLabel";

/**
 * Three stretches, three names, one gate. The widget delegates to `kinds/LabelParts`, so what
 * is asserted here is this board's own claim rather than the kind's mechanics.
 *
 * **That claim is the brackets.** Two of the three stretches cover the SAME headings and part
 * company only at their two ends, so the first test drops the arctangent on the closed stretch:
 * a learner holding "a quarter turn either side of zero" as one fact gets exactly that wrong,
 * and the practice item grading an interval on this node reports a wrong bracket under its own
 * failure code. A board that accepted it would gate on three drops and teach nothing.
 *
 * The second test carries the other claim: restarting asks the same three stretches from the
 * OTHER side, naming the forward function that was cut down to each rather than the inverse
 * that answers on it. The two are one fact, and a learner shown only the first reads the second
 * as a second thing to memorize.
 *
 * Controls are taken by `aria-label` throughout, because KaTeX emits every glyph twice and
 * `textContent` cannot say which name went where.
 */
const SLOTS = {
  sine: "Label for the closed stretch from negative 90 degrees to 90 degrees",
  cosine: "Label for the closed stretch from 0 degrees to 180 degrees",
  tangent: "Label for the open stretch between negative 90 degrees and 90 degrees",
} as const;

function byLabel(host: HTMLElement, label: string): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!button) {
    throw new Error(`no control labelled "${label}"`);
  }
  return button;
}

function has(host: HTMLElement, label: string): boolean {
  return host.querySelector(`button[aria-label="${label}"]`) !== null;
}

/**
 * Pick a name up, then drop it, waiting for the pickup to register in between.
 *
 * The wait is not decoration. Written as two taps in one tick this file timed out on the
 * restart test, at the point where three names had been placed and the gate had not opened,
 * so some of the taps were not landing. Waiting on `aria-pressed` before the drop made it
 * deterministic. The mechanism was not isolated (two sibling boards drive the same kind
 * without waiting and pass), so what is claimed here is the measurement rather than a rule
 * about React.
 */
async function place(host: HTMLElement, name: string, slot: string): Promise<void> {
  byLabel(host, name).click();
  await waitFor(
    () => byLabel(host, name).getAttribute("aria-pressed") === "true",
    `${name} is picked up`,
  );
  byLabel(host, slot).click();
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigRangeLabel refuses an inverse on the stretch with the wrong brackets", async () => {
  let completed = 0;
  h = mount(<TrigRangeLabel onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-label__figure") !== null, "it mounts");

  // Same headings, different ends. Tangent has no value at either end, so its stretch is the
  // open one and this drop is the misconception the board is built around.
  await place(host, "arctangent", SLOTS.sine);
  await waitFor(() => hasText(host, "Not quite."), "the closed stretch refuses arctangent");
  expect(completed).toBe(0);
  // Refused, not consumed: the name is back on offer and the slot is still open.
  expect(has(host, "arctangent"), "the name comes back to the tray").toBe(true);
  expect(byLabel(host, SLOTS.sine).disabled).toBe(false);

  await place(host, "arcsine", SLOTS.sine);
  await waitFor(() => !has(host, SLOTS.sine), "the closed stretch takes arcsine");
  expect(completed, "one name of three is not the answer").toBe(0);

  await place(host, "arccosine", SLOTS.cosine);
  await waitFor(() => !has(host, SLOTS.cosine), "the half turn takes arccosine");
  expect(completed, "two names of three is not the answer either").toBe(0);

  await place(host, "arctangent", SLOTS.tangent);
  await waitFor(() => completed === 1, "the gate opens on a fully named figure");
  await waitFor(() => hasText(host, "Every part named"), "the tray empties");
  expect(completed, "the gate opens exactly once").toBe(1);
});

test("TrigRangeLabel asks the same three stretches from the other side on restart", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(<TrigRangeLabel onComplete={() => completed++} onReopen={() => reopened++} />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-label__figure") !== null, "it mounts");

  await place(host, "arcsine", SLOTS.sine);
  await waitFor(() => !has(host, SLOTS.sine), "the first name settles");
  await place(host, "arccosine", SLOTS.cosine);
  await waitFor(() => !has(host, SLOTS.cosine), "the second name settles");
  await place(host, "arctangent", SLOTS.tangent);
  await waitFor(() => completed === 1, "the first board closes");

  const reset = host.querySelector<HTMLButtonElement>("button.lesson-interactive__reset");
  if (!reset) {
    throw new Error("no restart control on the finished figure");
  }
  reset.click();
  await waitFor(() => reopened === 1, "the gate closes behind the restart");
  await waitFor(() => has(host, SLOTS.sine), "a fresh figure is dealt");

  // The stretches have not moved and the question has: the names on offer are now the
  // functions that were CUT DOWN to them, so the first board's answers are not on the tray.
  expect(has(host, "sine"), "the forward functions are on offer").toBe(true);
  expect(has(host, "arcsine"), "the inverses are not").toBe(false);

  await place(host, "tangent", SLOTS.sine);
  await waitFor(
    () => hasText(host, "Not quite."),
    "the brackets still decide, from this side too",
  );
  expect(completed, "a refused drop cannot re-open the gate").toBe(1);

  await place(host, "sine", SLOTS.sine);
  await waitFor(() => !has(host, SLOTS.sine), "the sine stretch is named from this side");
  await place(host, "cosine", SLOTS.cosine);
  await waitFor(() => !has(host, SLOTS.cosine), "two of three are named");
  expect(completed, "the figure is still one name short").toBe(1);

  await place(host, "tangent", SLOTS.tangent);
  await waitFor(() => completed === 2, "the second board gates in its own right");
});

test("TrigRangeLabel offers its reveal only after a wrong drop", async () => {
  h = mount(<TrigRangeLabel />);
  const { host } = h;
  await waitFor(() => host.querySelector(".lesson-label__figure") !== null, "it mounts");

  expect(hasText(host, "Reveal"), "no reveal before an attempt").toBe(false);

  await place(host, "arccosine", SLOTS.tangent);
  await waitFor(
    () => hasText(host, "Reveal this part"),
    "the reveal is offered after a wrong drop",
  );
});
