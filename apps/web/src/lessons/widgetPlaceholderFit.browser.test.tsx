/**
 * A placeholder that advertises the accepted notation has to be READABLE to do that job.
 *
 * `root-parity-builder` offers `e.g. m^2 or |m|`, which is the widget teaching its own input
 * syntax: a power, or an absolute value written with bars. QA read it on screen as
 * `e.g. m^2 or |m`, one closing bar short, and the natural conclusion is a truncated string.
 * It is not. The source has both bars, and the comparator accepts `|m^2|`; what was missing
 * was WIDTH. The field was sized at 9rem, the face is monospace at 1rem, and fifteen
 * characters do not fit in the content box that leaves, so Chromium clipped the tail.
 *
 * A learner who copies the clipped form submits an unbalanced `|m` and is rejected with no
 * explanation, which makes this a correctness bug wearing a layout bug's clothes. So the
 * guard measures the advertised text against the box that has to hold it, rather than
 * pinning the width: a later font or padding change that re-breaks it fails here.
 *
 * This needs real Chromium and the real stylesheet. jsdom has no layout, and the app's
 * `font-family` and padding for this field live in `styles.css`, so a bare host would
 * measure a browser default and prove nothing. `styles.css` is imported last for the same
 * reason `lessonVisualSurd.browser.test.tsx` does it.
 */

import { expect, test } from "vitest";

import { mount, waitFor } from "./testHarness";
import { LessonVisual } from "./visuals";

import "../styles.css";

/** The width the browser would paint `text` at, in the font the element actually resolved. */
function paintedWidth(el: HTMLElement, text: string): number {
  const style = getComputedStyle(el);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("no 2d context to measure text with");
  }
  // Built from the resolved longhands rather than `style.font`, which some engines leave
  // empty when the shorthand was never authored.
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return ctx.measureText(text).width;
}

/** The space inside the borders and padding: what the placeholder actually gets. */
function contentWidth(el: HTMLElement): number {
  const style = getComputedStyle(el);
  return (
    el.getBoundingClientRect().width -
    Number.parseFloat(style.paddingLeft) -
    Number.parseFloat(style.paddingRight) -
    Number.parseFloat(style.borderLeftWidth) -
    Number.parseFloat(style.borderRightWidth)
  );
}

test("root-parity-builder: the notation it advertises fits in the box advertising it", async () => {
  const h = mount(<LessonVisual id="root-parity-builder" />);
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-interactive__input") !== null,
    "root-parity-builder mounts its answer field",
  );

  const input = host.querySelector<HTMLInputElement>(".lesson-interactive__input");
  if (!input) {
    throw new Error("the widget has no answer field");
  }

  const advertised = input.placeholder;
  // The string itself, asserted here so a future edit cannot satisfy the fit by deleting the
  // bar QA thought was missing. Both bars are present and both have to stay.
  expect(advertised, "the placeholder no longer advertises a balanced absolute value").toBe(
    "e.g. m^2 or |m|",
  );

  const needed = paintedWidth(input, advertised);
  const available = contentWidth(input);
  expect(
    needed,
    "the placeholder measured as nothing, so the comparison proves nothing",
  ).toBeGreaterThan(0);
  expect(
    available,
    `the field gives ${available.toFixed(1)}px to a placeholder needing ${needed.toFixed(1)}px, so its tail is clipped`,
  ).toBeGreaterThanOrEqual(needed);

  h.cleanup();
});
