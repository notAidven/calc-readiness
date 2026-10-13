import { afterEach, expect, test } from "vitest";

import {
  findButton,
  type Harness,
  hasMath,
  hasText,
  mount,
  setInputValue,
  waitFor,
} from "../testHarness";
import { GeoShadowSlider } from "./GeoShadowSlider";

/**
 * Two answers, one gate. The dial has to land on the factor between the two shadows AND the
 * box has to hold the height that factor gives, so a widget gating on either alone would let
 * a learner past on a dial they had swept through its nine positions.
 */
function dial(host: HTMLElement): HTMLInputElement {
  const range = host.querySelector<HTMLInputElement>('input[type="range"]');
  if (!range) {
    throw new Error("no scale dial");
  }
  return range;
}

function entry(host: HTMLElement): HTMLInputElement {
  const box = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (!box) {
    throw new Error("no height box");
  }
  return box;
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("GeoShadowSlider gates on the scale factor and the height together", async () => {
  let completed = 0;
  h = mount(<GeoShadowSlider onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelector('input[type="range"]') !== null, "dial mounts");

  // The first board is a staff of 2 meters with a shadow of 3 against a tower shadow of 21,
  // so the factor is 7 and the height is 14. The tower stays an unknown until both land.
  expect(hasMath(host, "?")).toBe(true);

  // The right height behind a dial still on its opening position is not the answer.
  setInputValue(entry(host), "14");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Divide the tower"), "the wrong factor is refused");
  expect(dial(host).disabled, "a refused pair leaves the dial live").toBe(false);
  expect(completed).toBe(0);

  // The right dial behind a height reached by adding rather than scaling is not it either.
  setInputValue(dial(host), "7");
  await waitFor(
    () => !hasText(host, "Divide the tower"),
    "moving the dial clears the nudge",
  );
  setInputValue(entry(host), "20");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Divide the tower"), "the wrong height is refused");
  expect(completed).toBe(0);

  setInputValue(entry(host), "14");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "gates on the factor and the height together");
  expect(hasText(host, "Start over with a different pair of shadows")).toBe(true);
});

test("GeoShadowSlider offers its reveal only after a real attempt", async () => {
  h = mount(<GeoShadowSlider />);
  const { host } = h;
  await waitFor(() => host.querySelector('input[type="range"]') !== null, "dial mounts");

  expect(hasText(host, "Reveal")).toBe(false);

  setInputValue(entry(host), "9");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Reveal"), "the reveal is offered after an attempt");
});
