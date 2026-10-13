/**
 * PHOTOGRAPHS of the authored question's reveal, because a figure is a rendered surface and a
 * passing measurement of it is not a picture of it.
 *
 * `cfuAuthoredFigure.test.tsx` reads each figure's math in jsdom and confirms it names the
 * answer. That is a claim about strings. Whether the diagram FITS where the reveal puts it —
 * under a frozen question, above a re-ask control, inside a lesson column on a short laptop —
 * is a claim about a frame, and `.cursor/rules/qa-verification.mdc` is explicit that the second
 * does not follow from the first.
 *
 * Seven packs over eight shots, in two groups, chosen because their answers live in different
 * places and their figures fail in different ways:
 *
 * Authored-question reveals (figure fit and answer placement):
 *  - NUM.S, whose caption states $-8 + 6 = -2$ under a number line;
 *  - LIN.6, whose caption never names the answer at all. The interval $(15, 25)$ is inside the
 *    SVG, via `solved={bandTex(low, high, closed)}`, so this is the shot that shows the
 *    answer-bearing part of the picture is the part that renders;
 *  - POL.4, whose solved line carries $\\dfrac{3}{2}$ and was clipped when the shared
 *    `SolutionLineWorked` viewBox ended at 152 while the bottom `SvgMath` box ran to 163.
 *  - GEO.1, the only figure in the set that draws TWO objects to one scale. At the authored
 *    tenth its model rectangle is twelve user units across, and drawing it larger is not on
 *    offer because its size IS the scale factor. So what the frame has to show is that a
 *    rectangle that small still reads as a rectangle rather than as a stray mark, that the
 *    answer named under it and the word telling you which object it is are both legible, and
 *    that neither runs into the equation column beside them. The first frame taken here said
 *    otherwise: the label was plated over the model and covered it whole;
 *  - GEO.2, whose net is the tallest drawing of the five and whose sixth face is a DASHED EMPTY
 *    outline. That is a claim about what is visible rather than about what is measured: a lid
 *    drawn filled and a lid drawn bare have identical geometry, so only a frame separates them.
 *
 * Composite re-asks (figure height vs re-ask control reachability):
 *  - RAT.5, LF.1, GEO.2 — tall multi-part figures whose re-ask control must stay on screen;
 *  - CG.1, FUN.4, FUN.10, FUN.8 — D6's tallest, and the ones whose composite answer is least
 *    certain to READ. The first three place a coordinate label on a plane sized to the data,
 *    which is the arrangement a fixed offset gets wrong as soon as the point moves, and FUN.8
 *    stacks two display fractions above its closing pair. A measurement of any of those is a
 *    claim about a box; whether the label landed clear of the axis numbers and whether both
 *    halves of the pair are legible under the diagram are claims about a frame.
 *
 * Shot at **1024x580**, a short realistic laptop rather than a comfortable developer viewport,
 * for the reason that rule gives: a `vh`-denominated box measures fine and photographs fine on
 * a tall monitor while being cut off on a real one.
 *
 * Not a visual-regression suite. Nothing compares against a baseline, so there is no snapshot
 * to update; the assertions are that a shot was taken and that what it photographed was the
 * figure rather than an empty card. The PNGs land under `__screenshots__/`, which `.gitignore`
 * already excludes. Regenerate and read them with
 *
 *   npx vitest run --config vitest.browser.config.ts apps/web/src/lessons/cfuAuthoredFigureShots.browser.test.tsx
 *
 * out of `apps/web/src/lessons/__screenshots__/cfu-authored-figure/`.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { LessonCfu } from "./cfu";
import { allLessons } from "./domains";
import { type Harness, mount, waitFor } from "./testHarness";
import type { LessonCfuSpec } from "./types";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** A short laptop: ~507px of usable page height once the browser's own chrome is off it. */
const SHORT_LAPTOP = { width: 1024, height: 580 };

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

function cfuFor(nodeId: string): LessonCfuSpec {
  const lesson = allLessons.find((entry) => entry.node_id === nodeId);
  const cfu = lesson?.cfu;
  if (!cfu) {
    throw new Error(`${nodeId} has no authored check`);
  }
  if (cfu.worked_solution_params === undefined) {
    throw new Error(
      `${nodeId} no longer sets worked_solution_params, so this shot would photograph the step cards`,
    );
  }
  return cfu;
}

/**
 * Walk the real surface to the reveal: a wrong answer, then the offer. The figure only exists
 * as part of that passage, so photographing it any other way would be a picture of a component
 * rather than of what a learner is shown.
 */
async function revealTheAnswer(nodeId: string): Promise<HTMLElement> {
  h = mount(<LessonCfu cfu={cfuFor(nodeId)} nodeId={nodeId} hintTaken />);
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-player__cfu") !== null,
    `${nodeId}: the card mounts`,
  );
  const field = host.querySelector<HTMLInputElement>(".lesson-player__cfu input");
  const check = host.querySelector<HTMLButtonElement>(
    ".lesson-player__cfu button[type='submit']",
  );
  if (!field || !check) {
    throw new Error(`${nodeId}: the card has no answer field`);
  }
  field.value = "zzz";
  field.dispatchEvent(new Event("input", { bubbles: true }));
  check.click();
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal-button") !== null,
    `${nodeId}: the reveal is offered`,
  );
  host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button")?.click();
  await waitFor(
    () => host.querySelector(".worked-solution--figure svg") !== null,
    `${nodeId}: the figure renders`,
  );
  return host;
}

/** The last typeset line in the SVG is the solved form; it must sit inside the viewBox. */
function assertSolvedLineNotClipped(figure: HTMLElement, nodeId: string): void {
  const svg = figure.querySelector("svg");
  if (!svg) {
    throw new Error(`${nodeId}: no SVG in the figure`);
  }
  const viewBox = svg.getAttribute("viewBox");
  if (!viewBox) {
    throw new Error(`${nodeId}: SVG has no viewBox`);
  }
  const viewHeight = Number(viewBox.split(/\s+/)[3]);
  if (!Number.isFinite(viewHeight) || viewHeight <= 0) {
    throw new Error(`${nodeId}: could not read viewBox height from "${viewBox}"`);
  }
  const foreignObjects = svg.querySelectorAll("foreignObject");
  const solvedFo = foreignObjects[foreignObjects.length - 1];
  if (!solvedFo) {
    throw new Error(`${nodeId}: no solved-line foreignObject in the SVG`);
  }
  const y = Number(solvedFo.getAttribute("y"));
  const h = Number(solvedFo.getAttribute("height"));
  if (!Number.isFinite(y) || !Number.isFinite(h)) {
    throw new Error(`${nodeId}: solved-line foreignObject has no y/height`);
  }
  expect(
    y + h,
    `${nodeId}: the solved line foreignObject extends past the SVG viewBox`,
  ).toBeLessThanOrEqual(viewHeight + 0.5);
}

/**
 * The last row's INK sits inside the rendered SVG, which is a different claim from its box.
 *
 * `assertSolvedLineNotClipped` measures the `foreignObject`, and that is right where a figure
 * sizes its boxes to its rows. `SvgMath` does not: its box is `fontSize * 3` and its own
 * comment says it is deliberately roomy, so D9's shared convention of a closing row at
 * `height - 18` puts a 48px box 6px past the viewBox with about 11px of glyph in the middle of
 * it. Asserting the box there would fail every one of those figures, including the pooled
 * shapes that have shipped that way all along, and it would be failing them for having room
 * around their text.
 *
 * So this measures what an SVG actually clips. `overflow: hidden` cuts at the viewBox, and the
 * question is whether any painted glyph reaches it. Read off the rendered geometry rather than
 * the attributes, which is why it is here and not in jsdom.
 */
function assertLastRowInkVisible(figure: HTMLElement, nodeId: string): void {
  const svg = figure.querySelector("svg");
  if (!svg) {
    throw new Error(`${nodeId}: no SVG in the figure`);
  }
  const inks = Array.from(svg.querySelectorAll(".katex"));
  expect(inks.length, `${nodeId}: nothing typeset inside the SVG`).toBeGreaterThan(0);
  const frame = svg.getBoundingClientRect();
  const lowest = inks
    .map((ink) => ink.getBoundingClientRect())
    .reduce((deepest, box) => (box.bottom > deepest.bottom ? box : deepest));
  expect(
    lowest.bottom,
    `${nodeId}: the bottom row's glyphs are cut off by the viewBox`,
  ).toBeLessThanOrEqual(frame.bottom + 0.5);
  // And it is genuinely the closing row being measured rather than a label halfway up: the
  // deepest ink has to sit in the bottom third of the frame.
  expect(
    lowest.top - frame.top,
    `${nodeId}: no typeset row near the bottom of the figure at all`,
  ).toBeGreaterThan((frame.height * 2) / 3);
}

/**
 * The three tallest figures this adds, framed to show what sits BELOW them.
 *
 * These answer two or three things at once, so their diagrams carry an extra closing row each,
 * and the thing worth looking at is not the diagram: it is the re-ask control underneath it.
 * `.cursor/rules/qa-verification.mdc` is the reason these are separate shots — a claim about
 * what is visible AROUND an element cannot be photographed by cropping to the element, and a
 * figure that measures correctly can still push the control that continues the lesson off a
 * 580px-tall laptop.
 *
 * So the frame is scrolled to the control rather than to the figure, and the assertion is that
 * the control's box lands inside the viewport with the figure's bottom edge above it.
 */
test.each([
  ["RAT.5", "three parts: a hole and two asymptotes"],
  ["LF.1", "two parts: a slope and the direction it implies"],
  ["GEO.2", "a solid, drawn as an opened-out net"],
  ["CG.1", "two parts: a midpoint on the plane and the length of the segment"],
  ["FUN.4", "two parts: the falling stretch and the shift's highest reading"],
  ["FUN.8", "two parts: the inverse rule and one value read off it"],
  ["FUN.10", "two parts: the corner of a vee and the word for the turn"],
])(
  "%s: the composite reveal leaves its re-ask reachable at 1024x580 (%s)",
  async (nodeId) => {
    const host = await revealTheAnswer(nodeId);
    await document.fonts.ready;
    await new Promise<void>((resolve) => setTimeout(resolve, 420));

    const figure = host.querySelector<HTMLElement>(".worked-solution--figure");
    const reAsk = host.querySelector<HTMLElement>(".lesson-interactive__reask-button");
    if (!figure || !reAsk) {
      throw new Error(
        `${nodeId}: the reveal has no ${figure ? "re-ask control" : "figure"}`,
      );
    }

    reAsk.scrollIntoView({ block: "end" });
    await new Promise<void>((resolve) => setTimeout(resolve, 120));

    const control = reAsk.getBoundingClientRect();
    expect(control.top, `${nodeId}: the re-ask control is above the frame`).toBeGreaterThan(
      0,
    );
    // A pixel of slack, because `block: "end"` lands the control flush with the bottom edge and
    // a fractional line height puts its box a fraction of a pixel past it (580.14 against 580).
    // That is the scroll being exact, not the control being cut off.
    expect(
      control.bottom,
      `${nodeId}: the re-ask control is below the fold on a 580px laptop`,
    ).toBeLessThanOrEqual(window.innerHeight + 1);
    // And the figure is genuinely above it rather than overlapping it, which is the other way a
    // tall diagram makes the control unusable while measuring fine.
    expect(
      figure.getBoundingClientRect().bottom,
      `${nodeId}: the figure overlaps its re-ask control`,
    ).toBeLessThanOrEqual(control.top);

    // No `element`, so the shot is the whole test frame rather than a crop of the diagram. That
    // is the point: a picture of the element that changed proves nothing about what sits around
    // it. What the frame does NOT carry is the fold — vitest photographs the frame's full content
    // (858px for RAT.5 at a 580px viewport, and `clip` does not narrow it), so "the control is
    // still on screen" is the assertion above and the picture is what says the surface under it
    // is legible and unoccluded.
    if (CAPTURE_EVIDENCE) {
      const path = await page.screenshot({
        path: `__screenshots__/cfu-authored-figure/${nodeId}-reask.png`,
      });
      expect(path, `${nodeId}: no screenshot was written`).toBeTruthy();
    }
  },
);

test.each([
  ["NUM.S", "the caption states the answer", false],
  ["LIN.6", "the answer is in the SVG, not the caption", false],
  ["POL.4", "the solved line carries a fraction that must not clip", true],
  ["GEO.1", "two rectangles to one scale, the answer on the smaller", true],
  ["GEO.2", "a net whose sixth face is drawn bare rather than omitted", false],
] as const)(
  "%s: the authored reveal photographs at 1024x580 (%s)",
  async (nodeId, _note, checkClip) => {
    const host = await revealTheAnswer(nodeId);
    await document.fonts.ready;
    // The passage opens with a transition; a moving box photographs in the wrong place.
    await new Promise<void>((resolve) => setTimeout(resolve, 420));

    const figure = host.querySelector<HTMLElement>(".worked-solution--figure");
    if (!figure) {
      throw new Error(`${nodeId}: no figure to photograph`);
    }
    // What the shot has to contain: the diagram itself, typeset rather than raw, and the answer
    // the whole feature exists to show. A blank figure photographs perfectly.
    //
    // Counted by `role="img"`, which every diagram in `worked/` sets and nothing else in the
    // subtree does. A bare `svg` count is not the same population: KaTeX draws a radical sign
    // as its own inline `<svg>`, so a figure closing on `d = \sqrt{2500} = 50` reports two
    // SVGs in one diagram. That count was measuring "how many SVG elements did KaTeX happen
    // to emit" wherever any figure typeset a root, which is not the claim. No figure in this
    // list typesets a root today -- the drawing that did was the D10 QA lane's own GEO.1,
    // which #357's shipped instead -- so the strict selector is kept for the next one rather
    // than for a failure currently in the tree.
    expect(
      figure.querySelectorAll('svg[role="img"]').length,
      `${nodeId}: the figure holds something other than exactly one diagram`,
    ).toBe(1);
    expect(
      figure.querySelectorAll(".katex").length,
      `${nodeId}: the figure's math never typeset`,
    ).toBeGreaterThan(0);
    const box = figure.getBoundingClientRect();
    expect(box.width, `${nodeId}: the figure has no width`).toBeGreaterThan(100);
    expect(box.height, `${nodeId}: the figure has no height`).toBeGreaterThan(80);
    if (checkClip) {
      assertSolvedLineNotClipped(figure, nodeId);
    }

    // Scrolled into frame first: the card is taller than 580px, so a page-level shot of an
    // unscrolled document is a picture of the question with the figure below the fold.
    figure.scrollIntoView({ block: "center" });
    await new Promise<void>((resolve) => setTimeout(resolve, 120));
    if (CAPTURE_EVIDENCE) {
      const path = await page.screenshot({
        path: `__screenshots__/cfu-authored-figure/${nodeId}.png`,
      });
      expect(path, `${nodeId}: no screenshot was written`).toBeTruthy();
    }
  },
);

/**
 * All nine of D9's, because nine figures arrived at once and none of them had ever been looked
 * at on a real screen.
 *
 * Every one reuses a component the practice pool already draws with, which is an argument that
 * they lay out correctly and not evidence of it: three of them are being asked for a row the
 * pooled shape never renders, and a viewBox that grew by one row is exactly the change that
 * measures fine and photographs clipped. So the two whose viewBox grew to hold a closing row
 * are checked against what the viewBox actually cuts, which is their bottom row's glyphs.
 *
 * The circles are the other reason. `d9TRG1.tsx`'s `circleLayout` places labels around a rim
 * and D9 cost ten collisions once already, and `workedFigureLabels.browser.test.tsx` sweeps
 * `LIVE_PRACTICE_ITEMS` — which is the practice pools, and holds no `cfu.*` template at all.
 * These figures are outside that sweep, so the frame is the evidence there is.
 */
test.each([
  ["TRG.1", "coterminal loops, then the unit change", false],
  ["TRG.2", "the wire triangle, with the answered side inked", false],
  ["TRG.3", "a dashed drop onto the axis the reading is measured on", false],
  ["TRG.4", "a fourth row the pooled shape never draws, under a taller viewBox", true],
  ["TRG.5", "the midline, and the far end of the swing rather than its length", false],
  ["TRG.6", "the first break, beside the period it is half of", false],
  ["TRG.7", "two headings sharing a reading, one of them inside the band", false],
  ["TRG.8", "a closing row under the roster, under a taller viewBox", true],
  ["TRG.9", "the doubling, over the leg the chosen identity never reads", false],
] as const)(
  "%s: the authored reveal photographs at 1024x580 (%s)",
  async (nodeId, _note, checkClip) => {
    const host = await revealTheAnswer(nodeId);
    await document.fonts.ready;
    await new Promise<void>((resolve) => setTimeout(resolve, 420));

    const figure = host.querySelector<HTMLElement>(".worked-solution--figure");
    if (!figure) {
      throw new Error(`${nodeId}: no figure to photograph`);
    }
    expect(figure.querySelectorAll("svg").length, `${nodeId}: no SVG in the figure`).toBe(
      1,
    );
    expect(
      figure.querySelectorAll(".katex").length,
      `${nodeId}: the figure's math never typeset`,
    ).toBeGreaterThan(0);
    const box = figure.getBoundingClientRect();
    expect(box.width, `${nodeId}: the figure has no width`).toBeGreaterThan(100);
    expect(box.height, `${nodeId}: the figure has no height`).toBeGreaterThan(80);
    if (checkClip) {
      assertLastRowInkVisible(figure, nodeId);
    }

    figure.scrollIntoView({ block: "center" });
    await new Promise<void>((resolve) => setTimeout(resolve, 120));
    if (CAPTURE_EVIDENCE) {
      const path = await page.screenshot({
        path: `__screenshots__/cfu-authored-figure/${nodeId}.png`,
      });
      expect(path, `${nodeId}: no screenshot was written`).toBeTruthy();
    }
  },
);
