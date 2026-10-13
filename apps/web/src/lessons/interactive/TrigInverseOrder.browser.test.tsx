import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigInverseOrder } from "./TrigInverseOrder";

/**
 * Four lines, one chain, one gate. The widget delegates to `kinds/OrderSteps`, so what is
 * asserted here is this board's own claim rather than the kind's mechanics.
 *
 * **That claim is the first test.** Writing $\theta = \arcsin(\ldots)$ is a TRUE line from the
 * moment the board opens, and it is not yet a legal move: until the sweep has been cut down,
 * the reading names infinitely many headings and the inverse has no single one to hand back.
 * A board that accepted the inverse straight after the reading would still gate on four taps
 * and would teach the opposite of the slide, so the refusal is the assertion.
 *
 * Chips are taken by `aria-label`, which is the only channel that survives KaTeX: it emits
 * every glyph twice and `textContent` cannot say which line a chip is.
 */
const SINE = {
  reading: "Place sine theta equals root 2 over 2 next",
  restrict:
    "Place sine is cut down to the headings from a quarter turn below zero to a quarter turn above it next",
  invert: "Place theta equals arcsine of root 2 over 2 next",
  value: "Place theta equals 45 degrees next",
} as const;

const TANGENT = {
  reading: "Place tangent theta equals root 3 over 3 next",
  restrict:
    "Place tangent is cut down to the headings strictly between a quarter turn below zero and a quarter turn above it next",
  invert: "Place theta equals arctangent of root 3 over 3 next",
  value: "Place theta equals 30 degrees next",
} as const;

function chip(host: HTMLElement, label: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!found) {
    throw new Error(`no chip labelled "${label}"`);
  }
  return found;
}

function has(host: HTMLElement, label: string): boolean {
  return host.querySelector(`button[aria-label="${label}"]`) !== null;
}

function placed(host: HTMLElement): number {
  return host.querySelectorAll('.lesson-order__slot[data-state="placed"]').length;
}

/**
 * Lay a whole chain down, one rung at a time, waiting for each rung before the next tap.
 *
 * Written as four taps in one tick this test timed out waiting for the board to close, so
 * some of them were not landing. The mechanism was not isolated, and it is enough that each
 * step of a chain is observed to arrive before the step that depends on it is sent.
 */
async function build(host: HTMLElement, labels: readonly string[]): Promise<void> {
  let rungs = 0;
  for (const label of labels) {
    chip(host, label).click();
    rungs += 1;
    await waitFor(() => placed(host) === rungs, `rung ${rungs} is placed`);
  }
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigInverseOrder refuses the inverse until the range has been restricted", async () => {
  let completed = 0;
  h = mount(<TrigInverseOrder onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-order__list") !== null,
    "the board mounts",
  );

  // The line every learner reaches for, and the one the slide exists to refuse.
  chip(host, SINE.invert).click();
  await waitFor(() => hasText(host, "Not quite."), "the inverse cannot open the argument");
  expect(placed(host), "a refused tap places nothing").toBe(0);
  expect(completed).toBe(0);

  chip(host, SINE.reading).click();
  await waitFor(() => placed(host) === 1, "the reading opens the argument");

  // Still refused with the reading down: it is the restriction the inverse waits on, not
  // the reading.
  chip(host, SINE.invert).click();
  await waitFor(() => hasText(host, "Not quite."), "the inverse still cannot come second");
  expect(placed(host), "one line placed, and the inverse is not the next").toBe(1);

  chip(host, SINE.restrict).click();
  await waitFor(() => placed(host) === 2, "the restriction is what comes second");
  expect(completed, "the gate is not open on a half-built chain").toBe(0);

  chip(host, SINE.invert).click();
  await waitFor(() => placed(host) === 3, "the inverse is legal once the stretch is fixed");
  expect(completed).toBe(0);

  chip(host, SINE.value).click();
  await waitFor(() => completed === 1, "the last line opens the gate");
  await waitFor(() => hasText(host, "Every step placed"), "the tray empties");
  expect(completed, "the gate opens exactly once").toBe(1);
});

test("TrigInverseOrder deals the tangent board, cut to the open stretch, on restart", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <TrigInverseOrder onComplete={() => completed++} onReopen={() => reopened++} />,
  );
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-order__list") !== null,
    "the board mounts",
  );

  await build(host, [SINE.reading, SINE.restrict, SINE.invert, SINE.value]);
  await waitFor(() => completed === 1, "the sine board closes");

  const reset = host.querySelector<HTMLButtonElement>("button.lesson-interactive__reset");
  if (!reset) {
    throw new Error("no restart control on the finished chain");
  }
  reset.click();
  await waitFor(() => reopened === 1, "the gate closes behind the restart");

  // A different function, so the shape of the first board cannot be copied: this one is cut
  // to the stretch that EXCLUDES both ends, which the sine board never mentions.
  await waitFor(() => has(host, TANGENT.reading), "the tangent board is dealt");
  expect(has(host, SINE.reading), "the sine board is gone").toBe(false);
  expect(has(host, TANGENT.restrict), "its restriction is the open stretch").toBe(true);

  await build(host, [TANGENT.reading, TANGENT.restrict, TANGENT.invert, TANGENT.value]);
  await waitFor(() => completed === 2, "the second board gates in its own right");
});

test("TrigInverseOrder offers its reveal only after a wrong tap", async () => {
  h = mount(<TrigInverseOrder />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-order__list") !== null,
    "the board mounts",
  );

  expect(hasText(host, "Reveal"), "no reveal before an attempt").toBe(false);

  chip(host, SINE.value).click();
  await waitFor(
    () => hasText(host, "Reveal the next step"),
    "the reveal is offered after a wrong tap",
  );
});
