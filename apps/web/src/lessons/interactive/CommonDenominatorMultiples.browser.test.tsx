import { afterEach, expect, test } from "vitest";

import {
  findButton,
  type Harness,
  hasMath,
  hasText,
  inputs,
  mount,
  setInputValue,
  waitFor,
} from "../testHarness";
import { CommonDenominatorMultiples } from "./CommonDenominatorMultiples";

/** The revealed sum, as the LaTeX the widget hands KaTeX. */
const SEVEN_TWELFTHS = "\\dfrac{7}{12}";

/**
 * A multiple chip, by its `aria-label`. The chip's label is KaTeX, and `useKatex` typesets
 * into the span from a `useEffect`, so the button exists with its attributes one commit
 * before it has any `textContent`. A `findButton` here matched on `textContent` and so
 * depended on that effect having flushed: it passes on its own and failed the full browser
 * suite with "button not found: 24", where the only precondition waited on was that SOME
 * button existed. `aria-label` is written during render, so this cannot race.
 */
function chip(root: ParentNode, value: number): HTMLButtonElement {
  const match = root.querySelector<HTMLButtonElement>(
    `button.lesson-interactive__chip[aria-label="${value}"]`,
  );
  if (!match) {
    throw new Error(`chip not found: ${value}`);
  }
  return match;
}

let h: Harness | null = null;
afterEach(() => {
  h?.cleanup();
  h = null;
});

test("CommonDenominatorMultiples requires typing the rewrite (no auto-reveal) before gating", async () => {
  let completed = 0;
  h = mount(<CommonDenominatorMultiples onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length > 0, "chips mount");

  // No rewrite inputs and no sum before the LCD is chosen.
  expect(inputs(host).length).toBe(0);
  expect(hasMath(host, SEVEN_TWELFTHS)).toBe(false);

  // Tapping the LCD does NOT auto-reveal the sum; it asks for the rewrite instead.
  chip(host, 12).click();
  await waitFor(() => inputs(host).length === 2, "rewrite inputs appear");
  expect(completed).toBe(0);
  expect(hasMath(host, SEVEN_TWELFTHS)).toBe(false);

  // Typing the correct numerators (4/12 and 3/12) reveals the sum and gates.
  const [aIn, bIn] = inputs(host);
  if (!aIn || !bIn) {
    throw new Error("expected two rewrite inputs");
  }
  setInputValue(aIn, "4");
  setInputValue(bIn, "3");
  findButton(host, "Check").click();
  await waitFor(() => completed === 1, "gates after the rewrite is typed");
  expect(hasMath(host, SEVEN_TWELFTHS)).toBe(true);
});

test("CommonDenominatorMultiples nudges a wrong rewrite and a non-least multiple", async () => {
  let completed = 0;
  h = mount(<CommonDenominatorMultiples onComplete={() => completed++} />);
  const { host } = h;
  await waitFor(() => host.querySelectorAll("button").length > 0, "chips mount");

  // 24 is a common multiple but not the least.
  chip(host, 24).click();
  await waitFor(() => hasText(host, "smaller shared multiple"), "non-least nudged");
  expect(inputs(host).length).toBe(0);

  // Pick the LCD, then type a wrong numerator.
  chip(host, 12).click();
  await waitFor(() => inputs(host).length === 2, "rewrite inputs appear");
  const [aIn, bIn] = inputs(host);
  if (!aIn || !bIn) {
    throw new Error("expected two rewrite inputs");
  }
  // Both numerators wrong, so nothing has landed and the nudge names both rewrites.
  setInputValue(aIn, "5");
  setInputValue(bIn, "9");
  findButton(host, "Check").click();
  await waitFor(() => hasText(host, "Rewrite each fraction over"), "wrong rewrite nudged");
  expect(completed).toBe(0);

  /*
   * One right and one wrong. This case used to reach the nudge above, which is what made it
   * worth splitting: the two numerators are independent rewrites, so the one that landed is
   * kept and settled rather than handed back to be retyped, and the nudge names only the
   * rewrite still open. `widgetPartialCredit.browser.test.tsx` holds the same property across
   * every board of this shape; this asserts it on the board's own copy.
   */
  setInputValue(aIn, "4");
  findButton(host, "Check").click();
  await waitFor(() => aIn.disabled, "the correct numerator settles instead of reopening");
  expect(hasText(host, "That numerator is right")).toBe(true);
  expect(bIn.disabled, "the numerator still wrong stays open").toBe(false);
  expect(completed).toBe(0);
});
