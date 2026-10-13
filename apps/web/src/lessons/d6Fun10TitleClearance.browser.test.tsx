/**
 * FUN.10'S TWO TITLED BOARDS KEEP THEIR EQUATION OFF THE PLOT FRAME.
 *
 * `absvalue-vertex-slider` and `absvalue-walkthrough` each print their rule above the plane, and
 * both printed it hard against the plane's top border. `SvgMath` centres its ink on the `y` it is
 * handed rather than placing a baseline there, so a heading at `y={13}` in 16 reaches about 22,
 * and a frame whose `PLOT.top` was 24 left it roughly two units of air. The bars of
 * `\left\lvert \right\rvert` are drawn taller than a plain glyph, which is what took "close" to
 * "touching" on these two boards and not on the other titled planes in the tree.
 *
 * Fixed by moving BOTH plot edges down ten, to `top: 34, bottom: 212`, then trimming each
 * widget's `VIEW_H` under the new bottom (slider to 226, walkthrough to 240 with its sweep note
 * at 226). The plot's HEIGHT is unchanged; the heading gap is bought by shifting the frame, and
 * the beige band under it is cut by shortening the SVG rather than by growing the widget — which
 * on a short viewport is the scarce thing.
 *
 * ## Why the bars are ratios and not pixel counts
 *
 * The SVG scales with the column it is given, so a gap measured in px at one width is a different
 * number at another and neither is the claim. Title clearance is relative to the heading's OWN
 * rendered height. Bottom gutter is relative to the plot's OWN rendered height. Both ratios sit
 * between the defect and the fix without being tuned to either reading.
 *
 * ## Measured, and the injected reds
 *
 * TITLE — INJECTED RED BY: putting both boards back on `top: 24, bottom: 202`. **6 failed, 1
 * passed** — every clearance case on both boards, at both widths and in the lesson column; the
 * one pass is the placement census. Every case read **0.17** of its own ink height (3.1–3.9px
 * against 17.8–22.9px of ink). Failing at *"the rule is printed hard against the top of the
 * plane"*.
 *
 * BOTTOM — INJECTED RED BY: restoring the slider's `VIEW_H` to 252 (the band left after the
 * title shift). **3 failed, 4 passed** — both slider widths and the lesson-column frame; the
 * walkthrough cases and the placement census stay green. Every failure read **0.22** of the
 * plot height (41.8px under a 186.1px plot at the 920px column). Failing at *"the SVG still
 * carries a tall empty band under the plane: expected 41.817962646484375 to be less than or
 * equal to 33.49618286132812"*.
 *
 * ## The floors
 *
 * A clearance is a subtraction between two boxes, and both of them can go missing in ways that
 * make the subtraction look generous. A heading that never typeset has no ink and reads as
 * infinite clearance; a heading located by position alone could be some other label on the plane.
 * So the ink height is floored above zero and the located label has to be the rule itself. The
 * bottom gutter floors the plot height the same way: a zero-height frame would make any gutter
 * look tight.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { lessonByNode } from "./domains";
import { LessonBody } from "./LessonBody";
import { CITY_DESKTOP, FIGURE_CONTENT_CAP } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import type { LessonContent } from "./types";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The learner's short window, and the viewport every frame here is named for. */
const VIEWPORT = { width: 1024, height: 580 } as const;

const NODE = "FUN.10";

/** The two FUN.10 boards that print a rule above their plane. */
const BOARDS: readonly LessonVisualId[] = [
  "absvalue-vertex-slider",
  "absvalue-walkthrough",
];

/** Where the frame lands, beside the other lesson frames. */
const SHOTS = "apps/web/src/lessons/__screenshots__/d6-fun10-title-clearance";

/**
 * How much of its own rendered height the heading has to clear the frame by.
 *
 * A quarter. The defect left the heading at about a twentieth of its height from the border and
 * the fix puts it above half, so a quarter sits between them with room on both sides and is not
 * a number read off either reading.
 */
const CLEAR_RATIO = 0.25;

/**
 * How much empty SVG under the plot is allowed, as a fraction of the plot's own rendered height.
 *
 * The pre-trim band was forty units under a 178-unit plot (~0.22). The slider trims to fourteen
 * (~0.08); the walkthrough keeps a sweep note under the frame and lands near 0.16. Eighteen
 * hundredths sits between the note board and the leftover band, so it fails the old box and
 * clears both trimmed ones.
 */
const MAX_BOTTOM_RATIO = 0.18;

/** The bars every FUN.10 rule is written with, which is how the heading is told from other ink. */
const RULE_MARK = "lvert";

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
});

afterAll(async () => {
  if (restore !== null) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One heading, as it was drawn, and the space it left above the plane. */
interface Clearance {
  /** The LaTeX the heading was built from, so a failure names what it read. */
  readonly latex: string;
  /** Px of rendered ink, top to bottom. The floor under the gap. */
  readonly inkHeight: number;
  /** Px between the bottom of that ink and the plot's top border. Negative if they overlap. */
  readonly gap: number;
}

/**
 * The rule printed above a board's plane, and its distance from the border.
 *
 * Both boxes are read with `getBoundingClientRect`, so this is what Chromium drew rather than
 * what the SVG units predict: the point of the exercise is that `labelHalfH`'s estimate of a
 * line of math is not what KaTeX does with a pair of tall bars.
 */
function clearanceIn(root: ParentNode, board: string): Clearance {
  const svg = Array.from(root.querySelectorAll("svg")).find(
    (node) => node.querySelector("[data-plot-frame]") !== null,
  );
  if (svg === undefined) {
    throw new Error(`${board} drew no plane tagged data-plot-frame, so there is no border`);
  }
  const frame = svg.querySelector("[data-plot-frame]");
  if (frame === null) {
    throw new Error(`${board}'s plane lost its data-plot-frame rect`);
  }
  const heading = Array.from(svg.querySelectorAll("foreignObject[data-latex]")).find(
    (node) => (node.getAttribute("data-latex") ?? "").includes(RULE_MARK),
  );
  if (heading === undefined) {
    throw new Error(
      `${board} prints no rule containing "${RULE_MARK}", so the heading could not be told from the plane's other labels`,
    );
  }
  const ink = heading.querySelector(".katex");
  if (ink === null) {
    throw new Error(
      `${board}'s rule "${heading.getAttribute("data-latex")}" never typeset, so it has no ink to measure`,
    );
  }
  const inkBox = ink.getBoundingClientRect();
  const frameBox = frame.getBoundingClientRect();
  return {
    latex: heading.getAttribute("data-latex") ?? "?",
    inkHeight: inkBox.height,
    gap: frameBox.top - inkBox.bottom,
  };
}

/** Mount one board on its own at `width` and wait for its plane and its rule to be drawn. */
async function boardAt(board: LessonVisualId, width: number): Promise<HTMLElement> {
  h = mount(<LessonVisual id={board} />);
  const host = h.host;
  host.style.width = `${width}px`;
  await waitFor(
    () => host.querySelector("[data-plot-frame]") !== null,
    `${board} mounts a plane at ${width}px`,
  );
  // Until KaTeX's own faces arrive the bars are drawn in a fallback the heading is not set in,
  // and a clearance measured against the wrong glyphs is a claim about the wrong picture.
  await document.fonts.ready;
  await waitFor(
    () => host.querySelector("foreignObject[data-latex] .katex") !== null,
    `${board}'s rule typesets`,
  );
  await pause(60);
  return host;
}

function expectClear(clearance: Clearance, board: string, where: string): void {
  const reading = `${board} at ${where}: rule "${clearance.latex}" drew ${clearance.inkHeight.toFixed(1)}px of ink and left ${clearance.gap.toFixed(1)}px above the plot border (${(clearance.gap / clearance.inkHeight).toFixed(2)} of its own height)`;
  console.log(reading);

  // THE FLOORS, first. A heading that did not typeset has no ink, and no ink clears everything.
  expect(
    clearance.inkHeight,
    `${reading} — the rule has no rendered height, so the gap below is measured off nothing`,
  ).toBeGreaterThan(0);
  expect(
    clearance.latex,
    `${reading} — the measured label is not an absolute-value rule, so this is some other ink on the plane`,
  ).toContain(RULE_MARK);

  expect(
    clearance.gap,
    `${reading} — the rule is printed hard against the top of the plane`,
  ).toBeGreaterThanOrEqual(clearance.inkHeight * CLEAR_RATIO);
}

/** Empty SVG under the plot frame, as Chromium drew it. */
interface BottomGutter {
  /** Px of plot height, top border to bottom border. */
  readonly plotHeight: number;
  /** Px between the plot's bottom border and the SVG's bottom edge. */
  readonly gutter: number;
}

/**
 * How much of the SVG sits under the plane with nothing in it.
 *
 * The beige band in the screenshot was this number: the viewBox outran the plot after the
 * heading shift, and the HTML label below the figure sat under empty paper.
 */
function bottomGutterIn(root: ParentNode, board: string): BottomGutter {
  const svg = Array.from(root.querySelectorAll("svg")).find(
    (node) => node.querySelector("[data-plot-frame]") !== null,
  );
  if (svg === undefined) {
    throw new Error(`${board} drew no plane tagged data-plot-frame, so there is no gutter`);
  }
  const frame = svg.querySelector("[data-plot-frame]");
  if (frame === null) {
    throw new Error(`${board}'s plane lost its data-plot-frame rect`);
  }
  const svgBox = svg.getBoundingClientRect();
  const frameBox = frame.getBoundingClientRect();
  return {
    plotHeight: frameBox.height,
    gutter: svgBox.bottom - frameBox.bottom,
  };
}

function expectTightBottom(gutter: BottomGutter, board: string, where: string): void {
  const ratio = gutter.gutter / gutter.plotHeight;
  const reading = `${board} at ${where}: plot ${gutter.plotHeight.toFixed(1)}px tall, ${gutter.gutter.toFixed(1)}px of empty SVG under it (${ratio.toFixed(2)} of the plot height)`;
  console.log(reading);

  expect(
    gutter.plotHeight,
    `${reading} — the plot has no rendered height, so the gutter below is measured off nothing`,
  ).toBeGreaterThan(0);
  expect(
    gutter.gutter,
    `${reading} — the SVG still carries a tall empty band under the plane`,
  ).toBeLessThanOrEqual(gutter.plotHeight * MAX_BOTTOM_RATIO);
}

/** Both widths a lesson figure is given; the figure's own content is capped at 460 inside both. */
const WIDTHS: readonly (readonly [string, number])[] = [
  [CITY_DESKTOP.where, CITY_DESKTOP.column],
  [`the ${FIGURE_CONTENT_CAP}px figure content cap`, FIGURE_CONTENT_CAP],
];

const CASES = BOARDS.flatMap((board) =>
  WIDTHS.map(([where, width]) => [board, where, width] as const),
);

test.each(CASES)(
  "%s keeps its rule clear of the plot border, at %s",
  async (board, where, width) => {
    const host = await boardAt(board, width);
    const whereNamed = `${where} (${width}px column), viewport ${VIEWPORT.width}x${VIEWPORT.height}`;
    expectClear(clearanceIn(host, board), board, whereNamed);
    expectTightBottom(bottomGutterIn(host, board), board, whereNamed);
  },
  60_000,
);

/**
 * The sweep is over both titled boards and not one of them twice.
 *
 * `BOARDS` is a written-down list, so the thing worth asserting is that each entry is a board
 * FUN.10 actually places and that they are distinct: a copy-paste that named the slider twice
 * would leave the walkthrough unmeasured with every case above still green.
 */
test(`${NODE} places both boards this file measures`, () => {
  const content = lessonByNode[NODE];
  if (content === undefined) {
    throw new Error(`${NODE} has no authored lesson, so it places no boards`);
  }
  const placed = (content.visuals ?? []).map((visual) => visual.id);
  expect(new Set(BOARDS).size, "the same board is named twice").toBe(BOARDS.length);
  for (const board of BOARDS) {
    expect(placed, `${NODE} no longer places ${board}`).toContain(board);
  }
});

/* ------------------------------------------------------------------------- the frame */

/**
 * The chain `WorldScene` + `AdvisorLesson` put around the review scroll, class for class.
 *
 * Copied from `d6Fun8InverseSpacing.browser.test.tsx`. Mounted bare through `LessonVisual` the
 * figure's ancestor is a throwaway `<div>` and the reading column a learner is really given never
 * binds, so a frame taken that way is a picture of a container nobody ships. `--paper` and
 * `--paper-deep`, which are the tokens this figure paints its plane and its label plates with,
 * are declared at `:root` rather than on `.city-shell`, so they resolve in this chain.
 */
function ReviewScroll({ content }: { content: LessonContent }) {
  return (
    <div className="world-scene coc-popup world-scene--large">
      <div className="world-scene-frame coc-card">
        <button type="button" className="coc-card__close" aria-label="Close" />
        <header className="world-scene-head coc-card__banner">
          <span className="micro-label">{content.node_id} - dev</span>
          <h2>{content.title}</h2>
        </header>
        <div className="world-scene-body coc-card__body">
          <div className="advisor-lesson advisor-lesson--review">
            <button
              type="button"
              className="advisor-npc__action advisor-npc__action--prev advisor-lesson__back"
            >
              Back to options
            </button>
            <LessonBody content={content} />
          </div>
        </div>
        <footer className="world-scene-actions coc-card__actions">
          <button type="button" className="city-action">
            Back to lessons
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Where this test's viewport sits inside the real browser window.
 *
 * Vitest runs the test in an iframe on a tester page and SCALES that iframe when the requested
 * viewport does not match the window, so a clip written in the requested viewport's pixels lands
 * somewhere else on the real screen. Copied from `d6Fun8InverseSpacing.browser.test.tsx`.
 */
function testViewportBox(): {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
} {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const box = frameElement.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
    scale: box.height / window.innerHeight,
  };
}

/** One frame of the whole viewport, captured over CDP and clipped to where that viewport is. */
async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a ${VIEWPORT.width}x${VIEWPORT.height} screen`,
  ).toBeCloseTo(1, 1);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, VIEWPORT.width),
      height: Math.min(box.height, VIEWPORT.height),
      scale: 1,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`${SHOTS}-${name}.png`, shot.data, { encoding: "base64" });
  }
}

/**
 * THE PICTURE, in the column a learner is really given.
 *
 * A gap in px is a claim about geometry; whether the rule reads as sitting ON the plane is a
 * claim about a rendered frame. Framed to the whole viewport rather than cropped to the heading,
 * because what is in question is the space BETWEEN two things and a crop to either one of them
 * shows the part nobody doubted.
 */
test.each(BOARDS)(
  `%s: a frame of the rule above the plane in ${NODE}'s lesson column at 1024x580`,
  async (board) => {
    const content = lessonByNode[NODE];
    if (content === undefined) {
      throw new Error(`${NODE} has no authored lesson, so there is nothing to photograph`);
    }

    h = mount(<ReviewScroll content={content} />);
    const host = h.host;
    await waitFor(
      () => host.querySelectorAll("[data-plot-frame]").length >= BOARDS.length,
      `${NODE}: its planes mount in the review scroll`,
    );
    await document.fonts.ready;
    const card = host.querySelector<HTMLElement>(".coc-card");
    if (card !== null) {
      card.style.animation = "none";
    }
    await pause(420);

    const figures = Array.from(host.querySelectorAll<HTMLElement>("figure.lesson-visual"));
    const figure = figures.find(
      (node) => node.querySelector("[data-plot-frame]") !== null && matches(node, board),
    );
    if (figure === undefined) {
      throw new Error(`${NODE}'s review scroll drew no ${board} to photograph`);
    }
    const columnWidth = figure.getBoundingClientRect().width;
    expect(
      columnWidth,
      "this board is not in the in-city lesson column, so the frame is of the wrong container",
    ).toBeGreaterThan(FIGURE_CONTENT_CAP * 1.75);

    // The PLANE, not the whole figure: a board's controls make the figure taller than the scroll
    // window, so centring the figure puts the heading under the banner and crops the very gap
    // this frame is of.
    (figure.querySelector("svg") ?? figure).scrollIntoView({ block: "center" });
    await pause(200);
    // Taken BEFORE the assertion, so a red run still leaves the picture the numbers describe.
    await shoot(`${board}-${VIEWPORT.width}x${VIEWPORT.height}`);

    const whereNamed = `${NODE}'s ${columnWidth.toFixed(1)}px lesson column at ${VIEWPORT.width}x${VIEWPORT.height}`;
    expectClear(clearanceIn(figure, board), board, whereNamed);
    expectTightBottom(bottomGutterIn(figure, board), board, whereNamed);
  },
  60_000,
);

/**
 * Which figure is which board, by a control only that board draws.
 *
 * The lesson places four visuals and the figures carry no id, so the two planes have to be told
 * apart by their contents: the slider owns `#fun10-corner`, and the walkthrough is the other
 * `--walkthrough` interactive with a plane.
 */
function matches(figure: HTMLElement, board: string): boolean {
  if (board === "absvalue-vertex-slider") {
    return figure.querySelector("#fun10-corner") !== null;
  }
  return figure.querySelector(".lesson-interactive--walkthrough") !== null;
}
