import { afterEach, expect, test } from "vitest";

import { type Harness, hasText, mount, waitFor } from "../testHarness";
import { TrigGuyWireLabel } from "./TrigGuyWireLabel";

/**
 * Three lengths, three names, one gate. The first board stands at the anchor pad, where the
 * mast is the opposite side, the deck run is the adjacent one and the wire is the hypotenuse.
 *
 * The widget delegates to `kinds/LabelParts`, so what is asserted here is the wiring rather
 * than the kind: that the gate opens once and only on a fully named figure, that a wrong drop
 * is refused and hands the name straight back, and that the reveal is offered only after a
 * real attempt.
 *
 * **The second test is the one that carries this widget's own claim**, which no other board in
 * the tree makes: restarting deals the SAME three lengths from the OTHER corner, so two of the
 * three names change hands. A board that only redrew the numbers would pass every assertion
 * above and leave "opposite" readable as a position in a picture, which is the misconception
 * this slide exists to break.
 *
 * Controls are taken by `aria-label` rather than by text throughout, because KaTeX emits every
 * glyph twice and `textContent` cannot be trusted to say which chip went where.
 */
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

/** The empty slot under each length, named by how a screen reader says the length. */
const SLOTS = {
  mast: "Label for the mast, 12 meters",
  run: "Label for the deck run, 16 meters",
  wire: "Label for the wire, 20 meters",
} as const;

function place(host: HTMLElement, name: string, slot: string): void {
  byLabel(host, name).click();
  byLabel(host, slot).click();
}

/** The restart control, which carries its text rather than an `aria-label`. */
function restart(host: HTMLElement): HTMLButtonElement {
  const button = host.querySelector<HTMLButtonElement>("button.lesson-interactive__reset");
  if (!button) {
    throw new Error("no restart control on the finished figure");
  }
  return button;
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigGuyWireLabel refuses a wrong name and gates on all three, exactly once", async () => {
  let completed = 0;
  h = mount(<TrigGuyWireLabel onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length >= 6, "the figure mounts");

  // The wire is the hypotenuse, and it is the mistake worth making: it is also the side a
  // learner reaches for when asked for the longest one.
  place(host, "hypotenuse", SLOTS.mast);
  await waitFor(() => hasText(host, "Not quite."), "a wrong name is refused");
  expect(completed).toBe(0);
  // Refused, not consumed: the name is back on offer and the slot is still open.
  expect(has(host, "hypotenuse"), "the name comes back to the tray").toBe(true);
  expect(byLabel(host, SLOTS.mast).disabled).toBe(false);

  place(host, "opposite", SLOTS.mast);
  await waitFor(() => !has(host, SLOTS.mast), "a named length settles");
  expect(completed, "one name of three is not the answer").toBe(0);

  place(host, "adjacent", SLOTS.run);
  await waitFor(() => !has(host, SLOTS.run), "the second length settles");
  expect(completed, "two names of three is not the answer either").toBe(0);

  place(host, "hypotenuse", SLOTS.wire);
  await waitFor(() => completed === 1, "the gate opens on a fully named figure");
  await waitFor(() => hasText(host, "Every part named"), "the tray empties");
  expect(completed, "the gate opens exactly once").toBe(1);
});

test("TrigGuyWireLabel deals the other corner on restart, moving two of the three names", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <TrigGuyWireLabel onComplete={() => completed++} onReopen={() => reopened++} />,
  );
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length >= 6, "the figure mounts");

  place(host, "opposite", SLOTS.mast);
  await waitFor(() => !has(host, SLOTS.mast), "the first length settles");
  place(host, "adjacent", SLOTS.run);
  await waitFor(() => !has(host, SLOTS.run), "the second length settles");
  place(host, "hypotenuse", SLOTS.wire);
  await waitFor(() => completed === 1, "the first board closes");

  restart(host).click();
  await waitFor(() => reopened === 1, "the gate closes behind the restart");
  await waitFor(() => has(host, SLOTS.mast), "a fresh figure is dealt");

  // The lengths are the same and the corner is not, so the answer to the mast has moved.
  // Repeating the first board's answer must now be refused.
  place(host, "opposite", SLOTS.mast);
  await waitFor(
    () => hasText(host, "Not quite."),
    "the first board's answer no longer fits the mast",
  );
  expect(completed, "a refused drop cannot re-open the gate").toBe(1);

  place(host, "adjacent", SLOTS.mast);
  await waitFor(() => !has(host, SLOTS.mast), "the mast is the adjacent side from here");

  // The wire is the one name that does not move, which is the other half of the claim.
  place(host, "hypotenuse", SLOTS.wire);
  await waitFor(
    () => !has(host, SLOTS.wire),
    "the wire is the hypotenuse from either corner",
  );
  expect(completed, "the figure is still one name short").toBe(1);

  place(host, "opposite", SLOTS.run);
  await waitFor(() => completed === 2, "the second board gates in its own right");
});

test("TrigGuyWireLabel offers its reveal only after a wrong drop", async () => {
  h = mount(<TrigGuyWireLabel />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length >= 6, "the figure mounts");

  expect(hasText(host, "Reveal"), "no reveal before an attempt").toBe(false);

  place(host, "adjacent", SLOTS.wire);
  await waitFor(
    () => hasText(host, "Reveal this part"),
    "the reveal is offered after a wrong drop",
  );
});
