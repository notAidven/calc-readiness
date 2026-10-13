import { afterEach, expect, test } from "vitest";

import { type Harness, hasMath, hasText, mount, waitFor } from "../testHarness";
import { TrigFeatureLabel } from "./TrigFeatureLabel";

/**
 * Three names, three readings, one gate. The reading that matters most is the period: it is
 * the only one of the three whose value appears nowhere in the rule, so a board that could be
 * finished by matching positions would never ask for it.
 */
function chip(host: HTMLElement, name: string): HTMLButtonElement {
  const found = host.querySelector<HTMLButtonElement>(
    `.lesson-sorter__chip[aria-label="${name}"]`,
  );
  if (!found) {
    throw new Error(`no chip named ${name}`);
  }
  return found;
}

function slots(host: HTMLElement): HTMLButtonElement[] {
  return Array.from(host.querySelectorAll<HTMLButtonElement>(".lesson-label__slot"));
}

/** Drop a name on the slot in position `index`, left to right across the figure. */
function drop(host: HTMLElement, name: string, index: number): void {
  chip(host, name).click();
  const slot = slots(host)[index];
  if (!slot) {
    throw new Error(`no slot at position ${index}`);
  }
  slot.click();
}

function namedCount(host: HTMLElement): number {
  return host.querySelectorAll('.lesson-label__slot[data-named="yes"]').length;
}

/**
 * Name a part correctly, and wait for the figure to record it.
 *
 * Two drops fired back to back land in one React batch, and the figure's `named` map is
 * rebuilt from the value the handler closed over, so the second drop would write over the
 * first and the board would go on showing an empty slot the learner had already answered.
 */
async function name(host: HTMLElement, label: string, index: number): Promise<void> {
  const before = namedCount(host);
  drop(host, label, index);
  await waitFor(
    () => namedCount(host) === before + 1,
    `the figure records "${label}" before the next name is dropped`,
  );
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("TrigFeatureLabel holds the period, which is nowhere in the rule, and gates on all three", async () => {
  let completed = 0;
  h = mount(<TrigFeatureLabel onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-label__figure") !== null,
    "the figure mounts",
  );

  // The first board is y = 5 sin(4x) + 2, so its period is a value the rule never prints.
  expect(hasMath(host, "5\\sin\\left(4x\\right) + 2")).toBe(true);
  expect(hasMath(host, "\\dfrac{\\pi}{2}")).toBe(true);
  expect(hasMath(host, "y = 2")).toBe(true);

  // The coefficient beside x is not the period, and the level is not the amplitude: naming
  // the halved turn "midline" is the confusion the board exists to break.
  drop(host, "midline", 1);
  await waitFor(() => hasText(host, "Not quite"), "the wrong name is refused");
  expect(completed).toBe(0);

  await name(host, "amplitude", 0);
  await name(host, "period", 1);
  expect(completed, "two of three names opened the gate").toBe(0);

  await name(host, "midline", 2);
  await waitFor(() => completed === 1, "the last name opens the gate");
  expect(hasText(host, "The period is not")).toBe(true);
  expect(completed, "the gate latches exactly once").toBe(1);
});

test("TrigFeatureLabel deals a shifted cosine, with a fourth reading, on a restart", async () => {
  let completed = 0;
  let reopened = 0;
  h = mount(
    <TrigFeatureLabel onComplete={() => completed++} onReopen={() => reopened++} />,
  );
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-label__figure") !== null,
    "the figure mounts",
  );
  expect(slots(host).length, "the sine board names three readings").toBe(3);

  await name(host, "amplitude", 0);
  await name(host, "period", 1);
  await name(host, "midline", 2);
  await waitFor(() => completed === 1, "the sine board is finished");

  const restart = host.querySelector<HTMLButtonElement>(".lesson-interactive__reset");
  if (!restart) {
    throw new Error("no restart control on the finished figure");
  }
  restart.click();
  await waitFor(() => reopened === 1, "the restart closes the gate again");
  await waitFor(
    () => slots(host).length === 4,
    "the second board adds the lag as a fourth reading",
  );
  expect(hasMath(host, "4\\cos"), "the second board is a cosine, not the same sine").toBe(
    true,
  );
  expect(completed, "the restart did not re-latch the gate").toBe(1);
});

test("TrigFeatureLabel offers its reveal only after a real attempt", async () => {
  h = mount(<TrigFeatureLabel />);
  const { host } = h;
  await waitFor(
    () => host.querySelector(".lesson-label__figure") !== null,
    "the figure mounts",
  );

  expect(hasText(host, "Reveal")).toBe(false);

  drop(host, "period", 0);
  await waitFor(() => hasText(host, "Reveal"), "the reveal is offered after an attempt");
});
