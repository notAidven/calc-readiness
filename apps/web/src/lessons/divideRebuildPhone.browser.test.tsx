/**
 * POL.8's rebuilt statement, measured at the width a PHONE gives it.
 *
 * ## Why a second file rather than another test beside the first
 *
 * `widgetDropSlots.browser.test.tsx` holds the claim this one extends: every non-typed
 * equation slot draws its own term inside its own border, and POL.8's statement stays
 * legible through all four of its states. It measures at `FIGURE_CONTENT_CAP`, which
 * `readingWidths.ts` is explicit about — 460px is a cap the stylesheet puts on figure
 * CONTENT and it is not a container anything ships. The widths a learner is really handed
 * are 894px in the city on a desktop and 304.8px on a 390px phone, and the fix that made
 * those slots grow to their content was only ever measured at the first of those and at the
 * 460px spot check.
 *
 * That is the same gap `labelFigureNarrow.browser.test.tsx` was written to close for the
 * labelling family, and it closed it in a separate file for the same reason this one is
 * separate: a phone measurement has to move the VIEWPORT, because `@media (max-width: 720px)`
 * is what drops the body padding that `CITY_PHONE` is computed from. A `page.viewport` call
 * persists for the rest of the file it runs in, so putting it beside the 460px measurements
 * would silently re-measure them at 390px too.
 *
 * ## What is claimed, and why the phone is the interesting width
 *
 * POL.8 is the board where a fixed-width slot was reported painting its contents over the
 * operators beside it, and the statement row is already close to its column at 894px. Narrow
 * it to 304.8px and there are two ways it can fail that the wider measurements cannot see:
 * the row can overflow its card horizontally, or it can wrap and print a wrapped line over
 * the one above it.
 *
 * Neither happens, and the reason is worth recording rather than discovering again: the row
 * WRAPS, at an authored `flex-wrap`, so `x^2 + 9x + 22 = [divisor] \times [quotient]` takes
 * the first line and `+ [remainder]` the second. Measured here, all four states, so a change
 * that turns that wrap into an overflow fails.
 *
 * Four claims, because they fail differently and three of them can hold while a reader sees
 * a defect:
 *
 *   1. the width really is the phone's, asserted first — without it every number below is a
 *      measurement at Playwright's 1280px default and the file proves nothing;
 *   2. each slot holds its own term inside its own border, which is the reported defect;
 *   3. nothing on the statement line is printed over anything else on it, which containment
 *      does not imply, since the `\times` and the `+` are in nobody's slot;
 *   4. nothing is painted outside the figure, and the row does not scroll — the two shapes
 *      an overflow takes.
 *
 * Every one of those is an inequality inside a loop, so each carries a floor.
 */

import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { CITY_PHONE, PHONE_VIEWPORT } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual } from "./visuals";

import "../styles.css";

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** Subpixel slack on a KaTeX box, in px, as everywhere else in this family. */
const BAND_SLACK = 2;

/** The first variant's answers, in the order the positions open. `useWidgetVariants` starts at 0. */
const ANSWERS = ["x plus 3", "x plus 6", "the remainder 4"] as const;

/**
 * What is drawn inside a slot, as one box, or null when the slot is empty.
 *
 * KaTeX's `.base` rather than its `.katex` root, which is an inline box and reports the
 * line's height instead of the expression's. An unfilled position holds a bare text node —
 * the word naming it — which has no element to measure, hence the range.
 */
function contentsOf(slot: HTMLElement): DOMRect | null {
  const bases = Array.from(slot.querySelectorAll<HTMLElement>(".katex .base"));
  const painted: DOMRect[] =
    bases.length > 0
      ? bases.map((base) => base.getBoundingClientRect())
      : Array.from(slot.children).map((child) => child.getBoundingClientRect());
  if (painted.length === 0) {
    const span = document.createRange();
    span.selectNodeContents(slot);
    painted.push(span.getBoundingClientRect());
  }
  const left = Math.min(...painted.map((b) => b.left));
  const right = Math.max(...painted.map((b) => b.right));
  const top = Math.min(...painted.map((b) => b.top));
  const bottom = Math.max(...painted.map((b) => b.bottom));
  return right - left < 1 ? null : new DOMRect(left, top, right - left, bottom - top);
}

/** How much two boxes share, in px, counting only pairs that share a line. */
function overlapOf(a: DOMRect, b: DOMRect): number {
  const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (down <= 0) {
    return 0;
  }
  return Math.min(a.right, b.right) - Math.max(a.left, b.left);
}

/** What a slot is holding, named for a failure message. */
function heldBy(slot: HTMLElement): string {
  return (slot.getAttribute("aria-label") ?? slot.textContent ?? "").trim();
}

/** A figure's CONTENT box: its rect less its own padding and border. */
function insideOf(figure: HTMLElement): number {
  const style = getComputedStyle(figure);
  const off = (["Left", "Right"] as const).reduce(
    (total, side) =>
      total +
      Number.parseFloat(style[`padding${side}` as const]) +
      Number.parseFloat(style[`border${side}Width` as const]),
    0,
  );
  return figure.getBoundingClientRect().width - off;
}

/** Everything painted on the statement line, slot ink and the operators binding it together. */
function statementInk(row: HTMLElement): { what: string; box: DOMRect }[] {
  const painted: { what: string; box: DOMRect }[] = [];
  for (const slot of Array.from(
    row.querySelectorAll<HTMLElement>(".lesson-equation__slot"),
  )) {
    const held = contentsOf(slot);
    if (held !== null) {
      painted.push({ what: `the ${heldBy(slot)}`, box: held });
    }
  }
  for (const math of Array.from(row.querySelectorAll<HTMLElement>("[data-latex]"))) {
    if (math.closest(".lesson-equation__slot") !== null) {
      continue;
    }
    for (const base of Array.from(math.querySelectorAll<HTMLElement>(".katex .base"))) {
      const box = base.getBoundingClientRect();
      if (box.width >= 0.5) {
        painted.push({
          what: `the "${(math.textContent ?? "").trim().slice(0, 12)}"`,
          box,
        });
      }
    }
  }
  return painted.sort((a, b) => a.box.left - b.box.left);
}

test("divide-rebuild-builder: at a phone's width the statement fits, wraps, and never overprints", async () => {
  await page.viewport(PHONE_VIEWPORT.width, PHONE_VIEWPORT.height);
  h = mount(<LessonVisual id="divide-rebuild-builder" />);
  const host = h.host;
  host.style.width = `${CITY_PHONE.column}px`;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "POL.8 mounts at phone width",
  );
  // COLD FONTS READ NARROW, and every number here is a width: KaTeX typesets in its own
  // webfonts and the first mount on a fresh page gets fallback metrics.
  await document.fonts.ready;

  const figure = host.querySelector(".lesson-interactive") as HTMLElement;
  const card = host.querySelector("figure.lesson-visual") as HTMLElement | null;
  const row = figure.querySelector<HTMLElement>(".lesson-interactive__controls");
  if (row === null) {
    throw new Error("POL.8 draws no statement row");
  }

  // 1. THE PRECONDITION. Without this every measurement below could be taken at
  //    Playwright's 1280px default, where nothing has ever been reported.
  expect(
    insideOf(card ?? figure),
    "POL.8 was not measured at the width a phone gives it",
  ).toBeCloseTo(CITY_PHONE.inside, 0);

  let contained = 0;
  let filled = 0;
  let compared = 0;
  let lines = 0;
  let worst = { pair: "nothing", by: Number.NEGATIVE_INFINITY };
  let tightest = { where: "nothing", by: Number.POSITIVE_INFINITY };

  for (let placed = 0; placed <= ANSWERS.length; placed += 1) {
    if (placed > 0) {
      const answer = ANSWERS[placed - 1] as string;
      const chip = Array.from(figure.querySelectorAll<HTMLButtonElement>("button")).find(
        (b) => b.getAttribute("aria-label") === answer,
      );
      if (chip === undefined) {
        throw new Error(`no control labelled "${answer}"`);
      }
      chip.click();
      await waitFor(
        () =>
          figure.querySelectorAll('.lesson-equation__slot[data-state="done"]').length ===
          placed,
        `POL.8: "${answer}" settles into position ${placed}`,
      );
      await waitFor(
        () =>
          Array.from(
            figure.querySelectorAll(
              '.lesson-equation__slot[data-state="done"] [data-latex]',
            ),
          ).every((node) => node.querySelector(".katex") !== null),
        `POL.8: the term placed in position ${placed} typesets`,
      );
    }
    const where = `${placed} of 3 placed, at ${CITY_PHONE.inside}px`;

    // 2. EACH POSITION HOLDS WHAT IS WRITTEN IN IT. The reported defect, at the width it
    //    was never measured at: a `3.1rem` box around the word `remainder` paints it
    //    outside its own border rather than clipping it.
    for (const slot of Array.from(
      figure.querySelectorAll<HTMLElement>(".lesson-equation__slot"),
    )) {
      const held = contentsOf(slot);
      if (held === null) {
        continue;
      }
      const box = slot.getBoundingClientRect();
      const said = heldBy(slot);
      expect
        .soft(
          held.left,
          `${where}: "${said}" is drawn ${(box.left - held.left).toFixed(1)}px out of the left of its slot`,
        )
        .toBeGreaterThanOrEqual(box.left - BAND_SLACK);
      expect
        .soft(
          held.right,
          `${where}: "${said}" is drawn ${(held.right - box.right).toFixed(1)}px out of the right of its slot`,
        )
        .toBeLessThanOrEqual(box.right + BAND_SLACK);
      contained += 1;
      if (slot.getAttribute("data-state") === "done") {
        filled += 1;
      }
    }

    // 3. AND NOTHING ON THE LINE IS PRINTED OVER ANYTHING ELSE ON IT. At this width the row
    //    wraps, so this is also what says a wrapped line does not land on the line above it.
    const painted = statementInk(row);
    for (let i = 0; i < painted.length; i += 1) {
      for (let j = i + 1; j < painted.length; j += 1) {
        const left = painted[i] as { what: string; box: DOMRect };
        const right = painted[j] as { what: string; box: DOMRect };
        const over = overlapOf(left.box, right.box);
        if (over > worst.by) {
          worst = { pair: `${left.what} and ${right.what} at ${where}`, by: over };
        }
        expect
          .soft(
            over,
            `${where}: ${left.what} is printed ${over.toFixed(1)}px over ${right.what}`,
          )
          .toBeLessThanOrEqual(BAND_SLACK);
        compared += 1;
      }
    }

    // 4. AND THE STATEMENT IS INSIDE THE CARD. Two shapes, because the row can fail either
    //    way: ink painted past the figure's edge, or a row wide enough to scroll. The second
    //    is what a `nowrap` row would do here instead of wrapping.
    const bounds = (card ?? figure).getBoundingClientRect();
    for (const thing of painted) {
      expect
        .soft(
          thing.box.left,
          `${where}: ${thing.what} hangs ${(bounds.left - thing.box.left).toFixed(1)}px off the left of the card`,
        )
        .toBeGreaterThanOrEqual(bounds.left - BAND_SLACK);
      expect
        .soft(
          thing.box.right,
          `${where}: ${thing.what} hangs ${(thing.box.right - bounds.right).toFixed(1)}px off the right of the card`,
        )
        .toBeLessThanOrEqual(bounds.right + BAND_SLACK);
      const clearance = bounds.right - thing.box.right;
      if (clearance < tightest.by) {
        tightest = { where: `${thing.what} at ${where}`, by: clearance };
      }
    }
    expect
      .soft(
        row.scrollWidth,
        `${where}: the statement row scrolls, so it stopped wrapping and overflowed instead`,
      )
      .toBeLessThanOrEqual(row.clientWidth + 1);

    // The wrap itself, counted rather than asserted: the distinct lines the row's ink sits
    // on. Recorded so the floor below can say the board was really driven through its states.
    lines = new Set(painted.map((thing) => Math.round(thing.box.top))).size;
  }

  // FLOORS. Every assertion above is an inequality inside a loop and all of them hold over a
  // board that never rendered. Four, because they fail differently: a driver that stopped
  // placing chips clears the first while the filled states go unvisited, and a row whose
  // maths stopped matching `[data-latex]` clears the containment claims while comparing
  // nothing to the operators the overflow actually lands on.
  expect(contained, "no slot held anything in any state").toBeGreaterThanOrEqual(12);
  expect(
    filled,
    "no position was ever driven to a placed term, so no filled LaTeX was measured at this width",
  ).toBeGreaterThanOrEqual(6);
  expect(
    compared,
    "nothing on the statement line was compared with anything else on it",
  ).toBeGreaterThanOrEqual(40);
  expect(lines, "the statement row drew no ink to measure").toBeGreaterThanOrEqual(1);
  expect(worst.by, `the closest pair on the line was ${worst.pair}`).toBeLessThanOrEqual(
    BAND_SLACK,
  );
  expect(
    tightest.by,
    `the least room left at the card's right edge was ${tightest.where}`,
  ).toBeGreaterThanOrEqual(-BAND_SLACK);
});
