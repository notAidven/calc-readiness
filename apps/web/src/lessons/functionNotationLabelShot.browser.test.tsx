/**
 * A PHOTOGRAPH of `function-notation-label` in the lesson column it ships in.
 *
 * FUN.1 slide 2's figure was NARROWED — its output blank and the `= 11` that gave that blank
 * something to be the output of were both dropped — specifically so it would stop breaking
 * between its two statements and putting its blanks on two lines. `FunctionNotationLabel.tsx`
 * records the arithmetic: 526.7px of content inside a 434px box at the 460px figure content
 * cap.
 *
 * That is a SPATIAL claim, and `.cursor/rules/qa-verification.mdc` is explicit that a passing
 * layout test does not discharge one. `labelFigureWhole` and `widgetDropSlots` both measure
 * this family at `FIGURE_CONTENT_CAP`, which is a stylesheet cap on figure CONTENT and not a
 * container anything ships; green there is a true measurement in a box no learner is given.
 * So this file takes the frame nobody had taken.
 *
 * Three things it does deliberately:
 *
 *  - **The real chain, not the widget.** `ReviewScroll` below is the class-for-class copy of
 *    what `WorldScene` + `AdvisorLesson` put around the review surface, borrowed from
 *    `reviewCardContainment.browser.test.tsx`, which measured that the frame decides the
 *    layout. Mounted bare through `LessonVisual`, the figure's ancestors are a throwaway
 *    `<div>` and the 920px reading column never binds.
 *  - **1024x580**, a short realistic laptop rather than a comfortable developer viewport.
 *  - **Not cropped to the figure.** The subject of the evidence is the surface: a picture of
 *    the element that changed proves nothing about how it sits among the prose around it. The
 *    frame is the whole viewport, captured over CDP and clipped to where vitest put it.
 *
 * ## What the line count beside the picture does and does not catch
 *
 * It is asserted, and it is NOT the guard for the narrowing. Saying so is the point: an
 * assertion that would report green over the defect it appears to be about is worse than no
 * assertion, so what this one covers was measured rather than assumed. Both shapes, at the
 * four columns the app hands this family, on this tree — the shipped three-blank figure, and
 * the four-blank `f(3) = 11 \text{ has}` shape the header says could not be drawn, restored
 * to board one as an injection:
 *
 * | column                            | four blanks | three blanks (shipped) |
 * |-----------------------------------|-------------|------------------------|
 * | 920px `CITY_DESKTOP`              | 1 line      | 1 line                 |
 * | 654px `LESSONS_READING`           | 1 line      | 1 line                 |
 * | 460px `FIGURE_CONTENT_CAP`        | **2 lines** | 1 line                 |
 * | 330.8px `CITY_PHONE`              | 2 lines     | **2 lines**            |
 *
 * So the narrowing is load-bearing at 460px and nowhere else, `labelFigureWhole` and
 * `widgetDropSlots` are the guards that own it there, and this assertion cannot fail on a
 * reversion of it: the injected shape passes here. What it does catch is the figure coming to
 * wrap in the column a learner is really given — a fifth statement, a longer name, a change
 * to the card's width — which nothing else in the tree measures.
 *
 * And the last row is the honest qualification the frame cannot show: on a 390px phone this
 * figure still puts its blanks on two lines, narrowed or not. That is allowed rather than
 * broken — `labelFigureNarrow.browser.test.tsx` holds the real claim for that width, which is
 * that every break lands on a break opportunity an author put there — but "it fits on one
 * line now" is true of the lesson column and false of a phone, and this file is where anyone
 * reading the narrowing's justification will come looking.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { lessonByNode } from "./domains";
import { LessonBody } from "./LessonBody";
import { CITY_DESKTOP, FIGURE_CONTENT_CAP } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import type { LessonContent } from "./types";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The reviewer's window: short, and the viewport this frame is named for. */
const VIEWPORT = { width: 1024, height: 580 } as const;

/** Where the frame lands, beside the other lesson frames. */
const SHOT = "apps/web/src/lessons/__screenshots__/function-notation-label-lesson-column";

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

/**
 * The chain `WorldScene` + `AdvisorLesson` put around the review scroll, class for class.
 *
 * Copied from `reviewCardContainment.browser.test.tsx`. The banner and the action tray are
 * here because they are what makes `.coc-card__body`'s `flex: 1 1 auto` bind: without them
 * the heights above the figure resolve differently from the shipped page.
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
 * viewport does not match the window, so a clip written in the requested viewport's pixels
 * lands somewhere else on the real screen. Copied from `balanceCrateCentred.browser.test.tsx`,
 * which measured that failure.
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
async function shoot(path: string): Promise<void> {
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
  expect(shot.data, `no screenshot data for ${path}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(path, shot.data, { encoding: "base64" });
  }
}

function slots(figure: HTMLElement): HTMLElement[] {
  return Array.from(figure.querySelectorAll<HTMLElement>(".lesson-label__slot"));
}

/** How many lines the figure's blanks are spread over: the whole of the narrowing claim. */
function slotLines(figure: HTMLElement): number {
  return new Set(slots(figure).map((s) => Math.round(s.getBoundingClientRect().top))).size;
}

test("function-notation-label sits on one line in FUN.1's lesson column at 1024x580", async () => {
  const content = lessonByNode["FUN.1"];
  if (content === undefined) {
    throw new Error("FUN.1 has no authored lesson, so there is nothing to photograph");
  }
  const expected = content.visuals?.length ?? 0;
  expect(
    content.visuals?.map((v) => v.id),
    "FUN.1 no longer places function-notation-label, so this frame is of something else",
  ).toContain("function-notation-label");

  h = mount(<ReviewScroll content={content} />);
  const host = h.host;
  await waitFor(
    () => host.querySelectorAll("figure.lesson-visual").length === expected,
    `FUN.1: all ${expected} figures mount in the review scroll`,
  );
  await document.fonts.ready;
  // `.coc-card`'s pop-in animates `transform: scale`, and a transformed box both measures and
  // photographs in the wrong place.
  const card = host.querySelector<HTMLElement>(".coc-card");
  if (card !== null) {
    card.style.animation = "none";
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 420));

  // The labelling figure, found by the mechanic rather than by position in the slide list.
  // FUN.1's other three visuals are a machine, a slider and a classifier, so this is one.
  const figures = Array.from(host.querySelectorAll<HTMLElement>(".lesson-label__figure"));
  expect(
    figures.length,
    "FUN.1's review scroll draws no single labelling figure to photograph",
  ).toBe(1);
  const figure = figures[0] as HTMLElement;

  // The column really is the one a learner is given, and not a throwaway div: the whole
  // reason to mount the shipped chain.
  //
  // Bounded rather than pinned, because `CITY_DESKTOP.column` is 920 MEASURED AT 1440 and the
  // card is `min(1100px, 92vw)`: at 1024 the 92vw arm binds and the column comes out 890.1px,
  // a shade narrower and therefore a shade harsher. What has to hold is that this is the
  // shipped column and not the 460px content cap the existing sweeps measure at.
  const column = figure.closest("figure.lesson-visual") as HTMLElement;
  const columnWidth = column.getBoundingClientRect().width;
  expect(
    columnWidth,
    "this figure is not in the in-city lesson column, so the frame is of the wrong container",
  ).toBeGreaterThan(FIGURE_CONTENT_CAP * 1.75);
  expect(
    columnWidth,
    "this column is wider than the widest one the app hands a lesson figure",
  ).toBeLessThanOrEqual(CITY_DESKTOP.column + 1);

  // Floors under a line count: an empty figure and an untypeset one both occupy one line.
  expect(slots(figure).length, "the figure drew no blanks to name").toBe(3);
  expect(
    figure.querySelectorAll(".katex").length,
    "the figure's math never typeset, so its width is the fallback font's",
  ).toBeGreaterThan(0);

  const lines = slotLines(figure);
  const lead = figure.querySelector("[data-latex]")?.getAttribute("data-latex") ?? "?";
  const reading = `board "${lead}": ${slots(figure).length} blanks on ${lines} line(s), in a ${columnWidth.toFixed(1)}px column at ${VIEWPORT.width}x${VIEWPORT.height}`;
  console.log(reading);

  figure.scrollIntoView({ block: "center" });
  await new Promise<void>((resolve) => setTimeout(resolve, 120));
  // Taken BEFORE the assertion, so a red run still leaves the picture that shows what the
  // number is describing.
  await shoot(`${SHOT}-${VIEWPORT.width}x${VIEWPORT.height}.png`);

  expect(
    lines,
    `${reading}: this figure has come to wrap in the column a learner is really given`,
  ).toBe(1);
});
