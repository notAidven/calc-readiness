/**
 * PHOTOGRAPHS OF WHERE A CLASSIFY CHIP'S WORDS ACTUALLY SIT, on the tree as it ships.
 *
 * `classifyChipLabelPlacement.browser.test.tsx` measures the offsets and `styles.css` records why
 * there is no rule fixing them. Neither discharges a SPATIAL claim: per
 * `.cursor/rules/qa-verification.mdc`, where the claim is about where a thing sits or how much room
 * it leaves, the evidence owed is a rendered frame somebody looked at, not a passing measurement. A
 * guard can assert a band, pass, and say nothing about whether the board reads as a board.
 *
 * WHAT THESE FRAMES ARE EVIDENCE OF IS A DEFECT, NOT A FIX. Two candidate fixes were measured and
 * both rejected, so the labels here are 7.40px left of their buttons' middles wherever the mark
 * sits beside them. The frames exist for two reasons: to show that the defect is what it is said to
 * be at a real viewport, and to show that the eight boards the rejected mirror inflated are back to
 * their original heights.
 *
 * Four deliberate choices, all from that rule:
 *
 *  - **1024x580**, a short realistic laptop rather than a comfortable developer viewport, and the
 *    viewport is in every filename, because a frame whose viewport is unstated says nothing about
 *    anybody's screen.
 *  - **Not cropped to the chip.** The subject is the board and the prose round it; a picture of the
 *    button proves nothing about the button, which is the one part nobody doubted.
 *  - **The real lesson column for the five D6 boards.** `ReviewScroll` is the class-for-class copy
 *    of what `WorldScene` + `AdvisorLesson` put round the review surface. Mounted bare the figure's
 *    ancestors are a throwaway `<div>`, the lesson column never binds, and the frame is of a
 *    container nothing ships.
 *  - **One row answered before the shutter**, so both paint states are in the same frame: thirteen
 *    boards hold the mark slot from first paint and eleven only once a row is called.
 *
 * The eight boards below are pinned at the width where the rejected mirror inflated them, which is
 * the only way a frame can show that they are not inflated any more. Those widths are stylesheet
 * caps and phone content boxes rather than containers a learner is handed, so each says so in its
 * own filename.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { allLessons } from "./domains";
import { LessonBody } from "./LessonBody";
import { CITY_PHONE, FIGURE_CONTENT_CAP } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import type { LessonContent } from "./types";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The reviewer's window: short, and the viewport every frame here is named for. */
const VIEWPORT = { width: 1024, height: 580 } as const;

const SHOTS = "apps/web/src/lessons/__screenshots__";

/** D6's five classify-row boards, each shot in its own lesson column. */
const D6_BOARDS: readonly LessonVisualId[] = [
  "function-mapping-classify",
  "inverse-one-to-one-classify",
  "piecewise-piece-classify",
  "domain-restriction-classify",
  "transform-parity-classify",
] as LessonVisualId[];

/**
 * The eight boards the rejected mirror made taller, each at the width where it did so.
 *
 * Taken from the measurement recorded in `styles.css`: the mirror put a second flex line in these
 * buttons, and the frame at the same width is what shows the second line is gone.
 */
const INFLATED_BY_THE_MIRROR: readonly {
  readonly id: LessonVisualId;
  readonly width: number;
  readonly where: string;
  /** What the mirror inflated this board's worst chip to, for the caption beside the frame. */
  readonly was: string;
}[] = [
  {
    id: "geo-paving-classify" as LessonVisualId,
    width: FIGURE_CONTENT_CAP,
    where: `${FIGURE_CONTENT_CAP}px-cap`,
    was: "66.0 -> 110.0px under the mirror",
  },
  {
    id: "perfect-square-sorter" as LessonVisualId,
    width: FIGURE_CONTENT_CAP,
    where: `${FIGURE_CONTENT_CAP}px-cap`,
    was: "70.4 -> 88.8px under the mirror",
  },
  {
    id: "piecewise-piece-classify" as LessonVisualId,
    width: FIGURE_CONTENT_CAP,
    where: `${FIGURE_CONTENT_CAP}px-cap`,
    was: "40.0 -> 67.8px under the mirror",
  },
  {
    id: "log-domain-classify" as LessonVisualId,
    width: FIGURE_CONTENT_CAP,
    where: `${FIGURE_CONTENT_CAP}px-cap`,
    was: "40.0 -> 49.4px under the mirror",
  },
  {
    id: "compound-band-sorter" as LessonVisualId,
    width: CITY_PHONE.inside,
    where: "phone-304.8px",
    was: "70.4 -> 88.8px under the mirror",
  },
  {
    id: "function-mapping-classify" as LessonVisualId,
    width: CITY_PHONE.inside,
    where: "phone-304.8px",
    was: "40.0 -> 67.8px under the mirror",
  },
  {
    id: "exp-decay-classify" as LessonVisualId,
    width: CITY_PHONE.inside,
    where: "phone-304.8px",
    was: "40.0 -> 52.0px under the mirror",
  },
  {
    id: "transform-parity-classify" as LessonVisualId,
    width: CITY_PHONE.inside,
    where: "phone-304.8px",
    was: "40.0 -> 49.4px under the mirror",
  },
];

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

/**
 * The readings that go beside the pictures.
 *
 * A frame is the one form of evidence a reader cannot check by squinting: "that looks centred" is
 * worth about four pixels, which is most of this defect. So every frame's chips are measured as
 * they are shot and written to a sidecar under the same name.
 */
const READINGS: string[] = [];

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
});

afterAll(async () => {
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `${SHOTS}/classify-chip-placement-${VIEWPORT.width}x${VIEWPORT.height}-readings.txt`,
      [
        `Where the words sit inside their own button, at ${VIEWPORT.width}x${VIEWPORT.height}.`,
        "",
        "dx: positive is LEFT of the button's middle. This is a RECORDED, UNFIXED DEFECT: 7.40px while",
        "    the mark's slot is empty and 7.88px once a glyph lands in it, wherever the mark sits beside",
        "    the label. Where the mark took its own flex line the label is centred (0.00px) instead.",
        "dy: positive is ABOVE the middle. 0.00px where the mark is beside the label; 9.20px and up",
        "    where the mark took its own line, because half a line of mark hangs below the words.",
        "h:  the button's height, which is the number the rejected mirror inflated.",
        "",
        "The five D6 boards are shot in their own lesson column, the width a learner is given. The",
        "eight boards the mirror inflated are pinned at the width where it inflated them, which is a",
        "stylesheet cap or a phone content box and not a container anything ships.",
        "",
        ...READINGS,
      ].join("\n"),
    );
  }
  if (restore !== null) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * The chain `WorldScene` + `AdvisorLesson` put round the review scroll, class for class.
 *
 * The banner and the action tray are here because they are what makes `.coc-card__body`'s
 * `flex: 1 1 auto` bind: without them the heights above the figure resolve differently from the
 * shipped page.
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
 * somewhere else on the real screen.
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

/** The lesson that places `id`, so the frame is of the surface a learner is really given. */
function lessonPlacing(id: LessonVisualId): LessonContent {
  const found = allLessons.find((lesson) =>
    (lesson.visuals ?? []).some((visual) => visual.id === id),
  );
  if (found === undefined) {
    throw new Error(`no lesson places ${id}, so there is nothing to photograph`);
  }
  return found;
}

/** Answer the board's first row, leaving the rest untouched so both states are in one frame. */
async function answerFirstRow(board: HTMLElement): Promise<boolean> {
  const open = Array.from(
    board.querySelectorAll<HTMLButtonElement>(".lesson-interactive__chip:not(:disabled)"),
  );
  const first = open[0];
  if (first === undefined) {
    return false;
  }
  first.click();
  await waitFor(
    () => board.querySelector(".lesson-classify__mark:not(:empty)") !== null,
    "the first row settles and marks an option",
    1500,
  ).catch(() => {});
  await new Promise<void>((resolve) => setTimeout(resolve, 160));
  return true;
}

/** The chip's words, with the verdict glyph taken out, so a label reads as a learner sees it. */
function chipLabel(chip: HTMLElement): string {
  const clone = chip.cloneNode(true) as HTMLElement;
  for (const mark of Array.from(clone.querySelectorAll(".lesson-classify__mark"))) {
    mark.remove();
  }
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Measure every chip in the frame the same way the guard does, and record it in the sidecar.
 *
 * The mark is excluded by node, because it is the thing whose presence moves the label: a box drawn
 * round the words AND the glyph is centred by construction and reports zero however far off the
 * words are. Returns the number of chips measured, so a frame of a board that drew none cannot pass
 * as evidence.
 */
function record(board: HTMLElement, heading: string): number {
  const out: string[] = [];
  for (const chip of Array.from(
    board.querySelectorAll<HTMLElement>(".lesson-interactive__chip"),
  )) {
    const mark = chip.querySelector<HTMLElement>(".lesson-classify__mark");
    if (mark === null) {
      continue;
    }
    const rects: DOMRect[] = [];
    for (const node of Array.from(chip.childNodes)) {
      if (node instanceof HTMLElement && node.classList.contains("lesson-classify__mark")) {
        continue;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        if ((node.textContent ?? "").trim() === "") {
          continue;
        }
        const range = document.createRange();
        range.selectNode(node);
        rects.push(...Array.from(range.getClientRects()).filter((r) => r.width > 0));
      } else if (node instanceof HTMLElement) {
        const box = node.getBoundingClientRect();
        if (box.width > 0) {
          rects.push(box);
        }
      }
    }
    if (rects.length === 0) {
      continue;
    }
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const box = chip.getBoundingClientRect();
    const markBox = mark.getBoundingClientRect();
    const markMiddle = markBox.top + markBox.height / 2;
    const beside = markMiddle >= top && markMiddle <= bottom;
    const glyph = (mark.textContent ?? "").trim();
    out.push(
      `  dx ${(box.left + box.width / 2 - (left + right) / 2).toFixed(2).padStart(6)}  dy ${(box.top + box.height / 2 - (top + bottom) / 2).toFixed(2).padStart(6)}  h ${box.height.toFixed(1).padStart(5)}  ${beside ? "mark beside " : "mark own line"}  ${glyph === "" ? "unmarked" : `marked ${glyph}`}  "${chipLabel(chip)}"`,
    );
  }
  READINGS.push(heading, ...out, "");
  return out.length;
}

test.each(D6_BOARDS)(
  "%s: where its chip labels sit in its own D6 lesson column at 1024x580",
  async (id) => {
    const content = lessonPlacing(id);
    const expected = content.visuals?.length ?? 0;

    h = mount(<ReviewScroll content={content} />);
    const host = h.host;
    await waitFor(
      () => host.querySelectorAll("figure.lesson-visual").length === expected,
      `${content.node_id}: all ${expected} figures mount in the review scroll`,
    );
    await document.fonts.ready;
    // `.coc-card`'s pop-in animates `transform: scale`, and a transformed box both measures and
    // photographs in the wrong place.
    const card = host.querySelector<HTMLElement>(".coc-card");
    if (card !== null) {
      card.style.animation = "none";
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 420));

    const boards = Array.from(host.querySelectorAll<HTMLElement>(".lesson-classify"));
    expect(
      boards.length,
      `${id}: ${content.node_id}'s review scroll draws no classify board to photograph`,
    ).toBeGreaterThan(0);
    const board = boards[0] as HTMLElement;

    expect(await answerFirstRow(board), `${id}: the board offered nothing to answer`).toBe(
      true,
    );

    board.scrollIntoView({ block: "center" });
    await new Promise<void>((resolve) => setTimeout(resolve, 160));
    const column = board.closest(".lesson-visual__figure") ?? board;
    expect(
      record(
        board,
        `${id} — ${content.node_id}'s own lesson column, ${column.getBoundingClientRect().width.toFixed(1)}px of figure content, row 1 answered:`,
      ),
      `${id}: the frame caught no chip holding a mark slot, so it is evidence about nothing`,
    ).toBeGreaterThan(0);
    await shoot(
      `${SHOTS}/classify-chip-placement-${id}-${VIEWPORT.width}x${VIEWPORT.height}.png`,
    );
  },
  60_000,
);

test.each(INFLATED_BY_THE_MIRROR)(
  "$id is back to its own height at the $where it was inflated at, 1024x580",
  async ({ id, width, where, was }) => {
    h = mount(<LessonVisual id={id} />);
    const host = h.host;
    host.style.width = `${width}px`;
    host.style.margin = "24px auto";
    await waitFor(
      () => host.querySelector("figure.lesson-visual") !== null,
      `${id} mounts`,
    );
    await document.fonts.ready;

    const board = host.querySelector<HTMLElement>(".lesson-classify");
    expect(board, `${id}: no classify board mounted to photograph`).not.toBeNull();
    const shown = board as HTMLElement;
    expect(await answerFirstRow(shown), `${id}: the board offered nothing to answer`).toBe(
      true,
    );

    shown.scrollIntoView({ block: "center" });
    await new Promise<void>((resolve) => setTimeout(resolve, 160));
    expect(
      record(
        shown,
        `${id} — pinned at the ${where}, row 1 answered. Worst chip was ${was}:`,
      ),
      `${id}: the frame caught no chip holding a mark slot, so it is evidence about nothing`,
    ).toBeGreaterThan(0);
    await shoot(
      `${SHOTS}/classify-chip-placement-${id}-at-${where}-${VIEWPORT.width}x${VIEWPORT.height}.png`,
    );
  },
  60_000,
);
