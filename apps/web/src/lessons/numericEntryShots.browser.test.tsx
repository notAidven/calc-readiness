/**
 * PHOTOGRAPHS of the two answer boxes the report was about, because the report was about
 * how they LOOK.
 *
 * The sweep's own guards assert the attribute. This file is the corroboration
 * `.cursor/rules/qa-verification.mdc` asks for, which an attribute cannot supply: Chromium's
 * spin buttons are painted by the browser off `type="number"`, so whether they are gone is
 * a question about a rendered frame and not about a string in the source.
 *
 * Three things decide whether these frames are worth anything, and all three are the
 * rule's:
 *
 *  1. **The learner's mount, not `?dev`.** `openLearnerLessonAtGatedBoard` opens
 *     `d1LessonHost` at `size="large"` and walks the advisor forward with the learner's own
 *     "Next", so the card carries the cap a learner gets rather than the
 *     `.world-scene--full .coc-card { max-height: none }` the dev frame lifts. The host is
 *     `.city-shell`, which is where the panel tokens are DECLARED; a bare host paints every
 *     panel transparent and photographs a defect that does not exist.
 *  2. **1024x580**, a short realistic laptop, named in every filename.
 *  3. **Focused.** Chromium paints the spin buttons on hover and focus, so an unfocused
 *     frame of a number input can look exactly like a text one. Each box is focused, and
 *     has a digit typed into it, before the shutter.
 *
 * Two frames per board: the whole viewport, because a crop to the box proves nothing about
 * the surface around it, and a crop to the field row, because at 1024x580 a 16px-wide
 * spinner is four pixels of a full-page PNG. The pair is the evidence, not either one. A
 * third board is photographed with the attribute injected back in; see the last test for
 * why a picture of an absence needs it.
 *
 * Not a visual-regression suite: nothing compares against a baseline. The assertions are
 * that the frame caught a focused, typed-in box on the right board. The PNGs land under
 * `__screenshots__/`, which `.gitignore` excludes. Regenerate them with
 *
 *   npx vitest run --config vitest.browser.config.ts apps/web/src/lessons/numericEntryShots.browser.test.tsx
 *
 * out of `apps/web/src/lessons/__screenshots__/numeric-entry/`.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import {
  advanceButton,
  openLearnerLessonAtGatedBoard,
  settle,
  SHORT_LAPTOP,
} from "./shellFit";
import { type Harness, setInputValue, waitFor } from "./testHarness";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(SHORT_LAPTOP.width, SHORT_LAPTOP.height);
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** Click a control by its accessible name, loudly rather than silently missing it. */
function clickByLabel(host: HTMLElement, label: string, where: string): void {
  const control = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (control === null) {
    throw new Error(`${where}: no control labelled "${label}"`);
  }
  control.click();
}

/**
 * Walk the advisor forward, with the learner's own "Next", until `ready` holds.
 *
 * A slide is not a paragraph: a gated board sits `after` a paragraph, so reaching the next
 * board takes as many clicks as there are paragraphs in between and the number is the
 * pack's business, not this file's. The loop stops on the BOARD rather than on a count.
 */
async function walkUntil(
  host: HTMLElement,
  ready: () => boolean,
  where: string,
): Promise<void> {
  for (let step = 0; step < 40; step += 1) {
    if (ready()) {
      return;
    }
    await waitFor(
      () => ready() || advanceButton(host) !== null,
      `${where}: the gate opens`,
      8000,
    );
    if (ready()) {
      return;
    }
    advanceButton(host)?.click();
    await settle(120);
  }
  throw new Error(`${where}: 40 clicks of "Next" and the board never arrived`);
}

/**
 * Put the box in the state the report photographed it in: a digit in it and the caret in
 * it. The digit is deliberately not checked against anything — pressing Check would settle
 * the board and take the box away.
 */
async function focusedWithADigit(
  host: HTMLElement,
  where: string,
): Promise<HTMLInputElement> {
  await waitFor(
    () => host.querySelector("input.lesson-interactive__input") !== null,
    `${where}: the answer box mounts`,
    8000,
  );
  const box = host.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (box === null) {
    throw new Error(`${where}: no answer box`);
  }
  box.scrollIntoView({ block: "center" });
  setInputValue(box, "3");
  box.focus();
  await document.fonts.ready;
  await settle(200);
  expect(document.activeElement, `${where}: the box did not take focus`).toBe(box);
  return box;
}

/** What every frame below has to have caught, whatever else is in it. */
function assertPhotographable(where: string, host: HTMLElement, box: HTMLInputElement) {
  expect(host.className, `${where}: not mounted inside .city-shell`).toContain(
    "city-shell",
  );
  expect(host.querySelector(".coc-card"), `${where}: no learner card`).not.toBeNull();
  expect(
    host.querySelector(".world-scene--full"),
    `${where}: this is the dev frame, whose card cap is lifted`,
  ).toBeNull();
  expect(window.innerWidth, `${where}: viewport width`).toBe(SHORT_LAPTOP.width);
  expect(window.innerHeight, `${where}: viewport height`).toBe(SHORT_LAPTOP.height);
  const rect = box.getBoundingClientRect();
  expect(rect.width, `${where}: the box has no width to photograph`).toBeGreaterThan(20);
  expect(rect.top, `${where}: the box is above the frame`).toBeGreaterThan(0);
  expect(rect.bottom, `${where}: the box is below the frame`).toBeLessThan(
    SHORT_LAPTOP.height,
  );
}

/** The pair of frames: the surface, and the field row legible. */
async function photograph(slug: string, box: HTMLInputElement): Promise<void> {
  const row = box.closest<HTMLElement>(".lesson-interactive__field") ?? box;
  if (CAPTURE_EVIDENCE) {
    expect(
      await page.screenshot({ path: `__screenshots__/numeric-entry/${slug}-1024x580.png` }),
      `${slug}: no viewport frame was written`,
    ).toBeTruthy();
  }
  if (CAPTURE_EVIDENCE) {
    expect(
      await page.screenshot({
        element: row,
        path: `__screenshots__/numeric-entry/${slug}-field-1024x580.png`,
      }),
      `${slug}: no field frame was written`,
    ).toBeTruthy();
  }
}

test("RAD.3's answer box photographs focused at 1024x580 on the learner's mount", async () => {
  // RAD.3's first gated slide IS the board with the numeric box: `rational-exponent-play`,
  // one of the three RAD.3 widgets that carried `type="number"` before the sweep.
  h = await openLearnerLessonAtGatedBoard("RAD.3");
  const host = h.host;
  const where = "RAD.3 rational-exponent-play";

  const box = await focusedWithADigit(host, where);
  expect(box.type, `${where}: still a number input`).toBe("text");
  expect(box.getAttribute("step"), `${where}: still carries a step`).toBeNull();
  expect(box.inputMode, `${where}: no numeric keypad`).toBe("numeric");
  assertPhotographable(where, host, box);

  await photograph("rad3-rational-exponent-play", box);
});

test("NUM.F's common-denominator box photographs focused at 1024x580 on the learner's mount", async () => {
  // The board is NUM.F's THIRD gated slide, so the two before it are answered the way a
  // learner answers them rather than skipped: this is the walk, not a jump.
  h = await openLearnerLessonAtGatedBoard("NUM.F");
  const host = h.host;
  const where = "NUM.F common-denominator-multiples";

  // Slide 0, `fraction-parts-explore`: the denominator first, because it refuses the other
  // order — and with a render between the two, because the widget reads the step it is
  // refusing on out of the state the first click has not committed yet.
  clickByLabel(host, "the bottom number of the fraction", "NUM.F slide 0");
  await settle(80);
  clickByLabel(host, "the top number of the fraction", "NUM.F slide 0");

  // Slide 1, `equivalent-fraction-play`: any of the three operations gates it.
  await walkUntil(
    host,
    () => host.querySelector(".lesson-interactive--equivalent") !== null,
    "NUM.F slide 1",
  );
  clickByLabel(host, "divide 4", "NUM.F slide 1");

  // Slide 2: the board deals one of two sums, so the least common denominator is READ off
  // the two ladders rather than written down here.
  await walkUntil(
    host,
    () => host.querySelectorAll(".lesson-interactive--multiples button").length > 4,
    "NUM.F slide 2",
  );
  const rows = Array.from(
    host.querySelectorAll<HTMLElement>(
      ".lesson-interactive--multiples .lesson-interactive__controls",
    ),
  ).map((row) =>
    Array.from(row.querySelectorAll<HTMLButtonElement>("button.lesson-interactive__chip"))
      .map((b) => Number(b.getAttribute("aria-label")))
      .filter((n) => Number.isFinite(n)),
  );
  expect(rows.length, `${where}: expected two multiples ladders`).toBe(2);
  const [first, second] = rows as [number[], number[]];
  const shared = first.filter((n) => second.includes(n)).sort((a, b) => a - b);
  expect(shared.length, `${where}: the ladders share no value`).toBeGreaterThan(0);
  const lcd = shared[0] as number;
  clickByLabel(host, String(lcd), where);
  await settle(80);

  const box = await focusedWithADigit(host, where);
  expect(box.type, `${where}: not a text input`).toBe("text");
  expect(box.getAttribute("step"), `${where}: carries a step`).toBeNull();
  expect(box.inputMode, `${where}: no numeric keypad`).toBe("numeric");
  assertPhotographable(where, host, box);

  await photograph("numf-common-denominator", box);
});

/**
 * THE CONTROL FRAME, because a photograph of an absence is worth nothing until the camera
 * has been shown catching the thing that is absent.
 *
 * Both frames above show a plain rounded box with no spinner, and they would look exactly
 * the same if the shutter were firing before the paint, if the box were never focused, or
 * if the crop were off the field. So the same board is photographed once more with
 * `type="number"` put back on the element — on the DOM node, not in the source, so nothing
 * another lane is reading changes.
 *
 * There is no assertion to make about the arrows themselves: Chromium paints them into the
 * input's shadow tree as `::-webkit-inner-spin-button`, which no query in the page can
 * reach. That is the whole reason this is a frame and not a test. What this one asserts is
 * that the injection took and that the same shutter, the same focus and the same crop were
 * used; whether the arrows are there is what a reader of the PNG answers.
 */
test("the same box DOES draw arrows when the attribute goes back, so the frames above are readable", async () => {
  h = await openLearnerLessonAtGatedBoard("RAD.3");
  const host = h.host;
  const where = "RAD.3 with type=number injected";

  const box = await focusedWithADigit(host, where);
  box.setAttribute("type", "number");
  box.focus();
  await settle(200);
  expect(box.type, `${where}: the injection did not take`).toBe("number");
  expect(document.activeElement, `${where}: the box did not keep focus`).toBe(box);
  assertPhotographable(where, host, box);

  await photograph("rad3-control-type-number", box);
});
