/**
 * FUN.2's SLIDER BOARD DOES NOT SLIDE SIDEWAYS WHEN A PART IS VERDICTED.
 *
 * `domain-range-slider` asks two questions, each in its own `.lesson-interactive__controls` row,
 * and that class is `display: flex; flex-wrap: wrap; justify-content: center`. `WidgetPartVerdict`
 * was appended to the row as an EXTRA FLEX ITEM the moment a part was answered, so the row was
 * re-centred around one more thing than it had held a frame earlier: the three call chips and the
 * typed field slid left, and the learner reading the mark that had just appeared was reading it
 * beside controls that had moved out from under their cursor.
 *
 * ## Two causes with one symptom, and the second is the larger
 *
 * Measured by this file before the fix, at 1024x580, in px of leftward slide:
 *
 * | column                    | wrong call            | right call | wrong entry            |
 * |---------------------------|-----------------------|------------|------------------------|
 * | 920px in-city desktop     | 217.0 / 217.0 / 250.7 | 33.0       | field 223.3, Check 155.9 |
 * | 460px figure content cap  | 33.7 (third call)     | 33.0       | Check onto a new line   |
 * | 330.8px in-city phone     | 33.7 (third call)     | 33.0       | Check 33.7 the other way |
 *
 * The 33px is the verdict: an extra item for a centred row to centre itself around. It is there
 * on a CORRECT call too, at every width, which is how it can be told apart from the rest.
 *
 * The 217px is something else, and nothing in the report or the plan named it. `.lesson-interactive`
 * is a flex column with `align-items: center`, so a `[data-part-row]` left to size itself is as
 * wide as its widest child — and the sentence answering a missed part is far wider than the
 * controls above it. Printing it therefore widened the row and dropped the controls, which sit at
 * its start, a fifth of the board to the left. It shows only where the board is wider than the
 * 460px the controls are capped at, which is the in-city desktop column and nowhere else: a guard
 * measuring at the cap alone would have been green over the larger half of the defect, and that is
 * why this file measures three widths. LIN.5's guard learned the same lesson the same way, having
 * pressed the RIGHT call deliberately so that no note printed.
 *
 * ## The fix this measures, and where the shape comes from
 *
 * `RangeOutputRead.tsx` now reserves the mark a line of its own from first paint, and pins each
 * part row to the board's width so that what is said inside it cannot move it. The reservation is
 * what LIN.5 did for the same defect arriving through a `min-content` subgrid rather than a centred
 * flex row (`work-log/anthony/2026-08-01-lin5-chip-width-stability.md`, and the width-stability
 * claims in `classifyNumericCallOrder.browser.test.tsx`).
 *
 * Nothing in the shared component or the shared stylesheet changed: both fixes are widget-local,
 * so the other nineteen boards that render `WidgetPartVerdict` are untouched by them and are NOT
 * covered by this file. That is a deliberate narrowness and it is worth stating plainly, because
 * scoping a guard to the board a report was filed against is how a defect class outlives the guard
 * written for it (`.cursor/rules/qa-verification.mdc`): every adopter that appends a verdict into a
 * centred controls row can exhibit the 33px, and every adopter whose part row hugs its own note can
 * exhibit the 217px. Widening the population is a job for the phase that fixes them, not a claim
 * this file may make on their behalf.
 *
 * ## What is asserted, and what is deliberately not
 *
 * ACROSS and WIDE on a missed part, and DOWN as well on a correct one. A missed part prints
 * `WidgetPartNote` UNDERNEATH its row, so the board below it legitimately moves down; that is the
 * note doing its job and asserting it away would pin the wrong thing. A correct call prints
 * nothing, so on that board there is no movement anything is entitled to, and the two-axis claim
 * is what the reserved LINE buys over a reserved gap.
 *
 * Both verdicts are driven on the part that can show both, because they are not the same width:
 * "✓ correct" and "✗ not yet" are different strings, so a room reserved for one of them is a room
 * the other can still stretch. The limit part is driven wrong only — answering it correctly takes
 * its own Check off the row, which reflows it for a reason that is not this defect.
 *
 * Every claim here is an ABSENCE, and an absence holds over a board that was never answered, so
 * each one carries the two floors that make it mean something: how many controls were compared,
 * and that the verdict really did arrive.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { lessonByNode } from "./domains";
import { LessonBody } from "./LessonBody";
import { CITY_DESKTOP, CITY_PHONE, FIGURE_CONTENT_CAP } from "./readingWidths";
import { type Harness, mount, setInputValue, waitFor } from "./testHarness";
import type { LessonContent } from "./types";
import { LessonVisual } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The reviewer's window, and the viewport every number and every frame here is named for. */
const VIEWPORT = { width: 1024, height: 580 } as const;

/** The board this file is about. */
const BOARD = "domain-range-slider";

/** Where the frames land, beside the other lesson frames. */
const SHOTS = "apps/web/src/lessons/__screenshots__/d6-fun2-range-controls";

/** Sub-pixel slack, in px. The defect is measured in tens of px, so nothing real hides under 1. */
const SLACK = 1;

/**
 * The three columns a learner is really given, by the width of the box the figure fills.
 *
 * The cap is a stylesheet cap on figure CONTENT and not a container anything ships, so it is here
 * as a mid-range spot check between the desktop column and the phone rather than as the width the
 * claim is about — see `readingWidths.ts`. The three behave differently under this defect: at 920
 * the three long chips share one line and all of them slide, at 460 and 330 they wrap onto lines
 * of their own and only some of them do.
 */
const WIDTHS: readonly (readonly [string, number])[] = [
  [CITY_DESKTOP.where, CITY_DESKTOP.column],
  [`the ${FIGURE_CONTENT_CAP}px figure content cap`, FIGURE_CONTENT_CAP],
  [CITY_PHONE.where, CITY_PHONE.column],
];

/** The three calls the way part offers, and which of them is right on the opening board. */
const RIGHT_CALL = "Upward from a lowest reading";
const WRONG_CALL = "Downward from a highest reading";

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

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Where one control sits, which is the whole of the claim. */
interface Place {
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

/**
 * Every control on the board, keyed by the part it belongs to and its place in that part.
 *
 * Keyed rather than indexed flat, so a reading survives a control appearing or disappearing
 * somewhere else on the board and a failure names the thing that moved.
 */
function places(widget: HTMLElement): Map<string, Place> {
  const out = new Map<string, Place>();
  for (const part of ["way", "limit"] as const) {
    const row = widget.querySelector<HTMLElement>(`[data-part-row="${part}"]`);
    if (row === null) {
      continue;
    }
    const groups: readonly (readonly [string, string])[] = [
      ["chip", ".lesson-interactive__chip"],
      ["field", "input"],
      ["check", ".lesson-interactive__check"],
    ];
    for (const [what, selector] of groups) {
      all<HTMLElement>(row, selector).forEach((control, at) => {
        const box = control.getBoundingClientRect();
        out.set(`${part} ${what} ${at + 1}`, {
          left: box.left,
          top: box.top,
          width: box.width,
        });
      });
    }
  }
  return out;
}

/**
 * Which controls are not where they were, and by how much.
 *
 * `down` is opt-in because a MISSED part prints its sentence between the two parts, so the board
 * below it legitimately moves down; on a part answered correctly nothing is printed and the claim
 * is the stronger one, that nothing moved in either axis.
 */
function drift(
  before: Map<string, Place>,
  after: Map<string, Place>,
  { down }: { down: boolean },
): string[] {
  return [...before.entries()].flatMap(([where, was]) => {
    const now = after.get(where);
    if (now === undefined) {
      return [];
    }
    const across = now.left - was.left;
    const wider = now.width - was.width;
    const fell = down ? now.top - was.top : 0;
    if (Math.abs(across) <= SLACK && Math.abs(wider) <= SLACK && Math.abs(fell) <= SLACK) {
      return [];
    }
    const said = `${where} was at x=${was.left.toFixed(1)} and is at x=${now.left.toFixed(1)} (${across > 0 ? "+" : ""}${across.toFixed(1)}px across, ${wider > 0 ? "+" : ""}${wider.toFixed(1)}px wide`;
    return [
      down ? `${said}, ${fell > 0 ? "+" : ""}${fell.toFixed(1)}px down)` : `${said})`,
    ];
  });
}

/** How many of the controls read before a press were still there to compare afterwards. */
function compared(before: Map<string, Place>, after: Map<string, Place>): number {
  return [...before.keys()].filter((where) => after.has(where)).length;
}

async function boardAt(width: number): Promise<HTMLElement> {
  h = mount(<LessonVisual id={BOARD} />);
  const host = h.host;
  host.style.width = `${width}px`;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    `${BOARD} mounts at ${width}px`,
  );
  // KaTeX's own faces are not requested until something is typeset, and every box reads narrow
  // until they arrive: a narrow reading is the dangerous direction for a claim about a row that
  // re-centres on its contents.
  await document.fonts.ready;
  await pause(60);
  return host.querySelector(".lesson-interactive") as HTMLElement;
}

/** The part row named `part`, or a red that says so rather than a null dereference. */
function partRow(widget: HTMLElement, part: "way" | "limit"): HTMLElement {
  const row = widget.querySelector<HTMLElement>(`[data-part-row="${part}"]`);
  if (row === null) {
    throw new Error(`${BOARD} draws no "${part}" part row, so there is nothing to measure`);
  }
  return row;
}

/** What the verdict on one part is saying, or null where the part carries no mark. */
function verdictState(widget: HTMLElement, part: "way" | "limit"): string | null {
  const mark = partRow(widget, part).querySelector<HTMLElement>("[data-verdict]");
  return mark === null ? null : (mark.getAttribute("data-verdict") ?? "");
}

/** Tap one of the way part's calls, by the words on it. */
function call(widget: HTMLElement, label: string): void {
  const chip = all<HTMLButtonElement>(
    partRow(widget, "way"),
    ".lesson-interactive__chip",
  ).find((option) => (option.textContent ?? "").includes(label));
  if (chip === undefined) {
    throw new Error(`the way part offers no call reading "${label}"`);
  }
  chip.click();
}

/**
 * The floor under every absence below: the board really was in the state the report was about.
 *
 * Both halves, because they fail in different directions. A board nobody answered has nothing
 * that could have moved, and a board whose controls were never found has nothing that was
 * measured. Five is the opening board's own count: three calls, one typed field, one Check.
 */
function expectMeasuredSomething(
  widget: HTMLElement,
  part: "way" | "limit",
  want: string,
  before: Map<string, Place>,
  after: Map<string, Place>,
): void {
  expect(
    verdictState(widget, part),
    `${BOARD}: the ${part} part carries no ${want} verdict, so this measured an unanswered board`,
  ).toBe(want);
  expect(
    before.size,
    `${BOARD}: the board drew too few controls to measure`,
  ).toBeGreaterThanOrEqual(5);
  expect(
    compared(before, after),
    `${BOARD}: the controls read before the press were gone afterwards, so nothing was compared`,
  ).toBeGreaterThanOrEqual(5);
}

test.each(WIDTHS)(
  `${BOARD}: a WRONG call on the way part leaves every control where it was, at %s`,
  async (where, width) => {
    const widget = await boardAt(width);

    expect(
      all(widget, "[data-verdict]").length,
      `${BOARD}: a mark was on the board before anything was answered`,
    ).toBe(0);
    const before = places(widget);

    call(widget, WRONG_CALL);
    await waitFor(
      () => verdictState(widget, "way") !== null,
      `${BOARD}: the way part was never verdicted`,
    );
    await document.fonts.ready;
    await pause(60);
    const after = places(widget);

    const moved = drift(before, after, { down: false });
    console.log(
      `${BOARD} wrong call, ${where} (${width}px column) at ${VIEWPORT.width}x${VIEWPORT.height}: ${moved.length === 0 ? "nothing moved across" : moved.join("; ")}`,
    );
    expect(
      moved.join("; "),
      `at ${width}px the way part's verdict re-centred the row it landed in`,
    ).toBe("");

    // And the note really did print, which is the vertical growth these frames show and this
    // claim deliberately does not assert away.
    expect(
      partRow(widget, "way").querySelector(".lesson-interactive__row-note"),
      `${BOARD}: a missed call printed no note, so the state measured is not the reported one`,
    ).not.toBeNull();
    expectMeasuredSomething(widget, "way", "wrong", before, after);
  },
  60_000,
);

test.each(WIDTHS)(
  `${BOARD}: a RIGHT call on the way part leaves every control where it was, at %s`,
  async (where, width) => {
    const widget = await boardAt(width);
    const before = places(widget);

    call(widget, RIGHT_CALL);
    await waitFor(
      () => verdictState(widget, "way") !== null,
      `${BOARD}: the way part was never verdicted`,
    );
    await document.fonts.ready;
    await pause(60);
    const after = places(widget);

    const moved = drift(before, after, { down: true });
    console.log(
      `${BOARD} right call, ${where} (${width}px column) at ${VIEWPORT.width}x${VIEWPORT.height}: ${moved.length === 0 ? "nothing moved in either axis" : moved.join("; ")}`,
    );
    // The stronger of the two claims, and the one the reserved line buys: a correct call prints no
    // sentence, so there is nothing on this board that is entitled to move at all.
    expect(
      moved.join("; "),
      `at ${width}px the "correct" mark moved the board it landed on: it is a different width from "not yet", and a line reserved in one axis only still grows in the other`,
    ).toBe("");
    expect(
      partRow(widget, "way").querySelector(".lesson-interactive__row-note"),
      `${BOARD}: a correct call printed a note, so the two-axis claim above is measuring the wrong state`,
    ).toBeNull();
    expectMeasuredSomething(widget, "way", "right", before, after);
  },
  60_000,
);

test.each(WIDTHS)(
  `${BOARD}: a WRONG entry on the limit part leaves its field and Check where they were, at %s`,
  async (where, width) => {
    const widget = await boardAt(width);
    const before = places(widget);

    const field = all<HTMLInputElement>(partRow(widget, "limit"), "input")[0];
    if (field === undefined) {
      throw new Error(`${BOARD} draws no typed field on its limit part`);
    }
    // 0 is the miss the board is built around: the square's own floor, with the constant sitting
    // on top of it left out. It keeps the part open, so its Check stays on the row.
    setInputValue(field, "0");
    const check = partRow(widget, "limit").querySelector<HTMLButtonElement>(
      ".lesson-interactive__check",
    );
    if (check === null) {
      throw new Error(`${BOARD} draws no Check on its limit part`);
    }
    check.click();
    await waitFor(
      () => verdictState(widget, "limit") !== null,
      `${BOARD}: the limit part was never verdicted`,
    );
    await document.fonts.ready;
    await pause(60);
    const after = places(widget);

    const moved = drift(before, after, { down: false });
    console.log(
      `${BOARD} wrong limit, ${where} (${width}px column) at ${VIEWPORT.width}x${VIEWPORT.height}: ${moved.length === 0 ? "nothing moved across" : moved.join("; ")}`,
    );
    expect(
      moved.join("; "),
      `at ${width}px the limit part's verdict re-centred the field and the Check beside it`,
    ).toBe("");
    expect(
      partRow(widget, "limit").querySelector(".lesson-interactive__check"),
      `${BOARD}: the missed limit part lost its Check, so the row reflowed for a reason this claim is not about`,
    ).not.toBeNull();
    expectMeasuredSomething(widget, "limit", "wrong", before, after);
  },
  60_000,
);

/* ------------------------------------------------------------------------- the frames */

/**
 * The chain `WorldScene` + `AdvisorLesson` put around the review scroll, class for class.
 *
 * Copied from `functionNotationLabelShot.browser.test.tsx`, which took it from
 * `reviewCardContainment.browser.test.tsx`. Mounted bare through `LessonVisual` the figure's
 * ancestor is a throwaway `<div>` and the reading column a learner is really given never binds,
 * so a frame taken that way is a picture of a container nobody ships.
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
 * somewhere else on the real screen. Copied from `balanceCrateCentred.browser.test.tsx`, which
 * measured that failure.
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

/** The slider board inside the shipped review scroll, ready to be photographed. */
async function boardInLessonColumn(): Promise<{
  widget: HTMLElement;
  columnWidth: number;
}> {
  const content = lessonByNode["FUN.2"];
  if (content === undefined) {
    throw new Error("FUN.2 has no authored lesson, so there is nothing to photograph");
  }
  expect(
    content.visuals?.map((v) => v.id),
    `FUN.2 no longer places ${BOARD}, so these frames would be of something else`,
  ).toContain(BOARD);

  h = mount(<ReviewScroll content={content} />);
  const host = h.host;
  await waitFor(
    () => host.querySelector('[data-part-row="way"]') !== null,
    `FUN.2: ${BOARD} mounts in the review scroll`,
  );
  await document.fonts.ready;
  // `.coc-card`'s pop-in animates `transform: scale`, and a transformed box both measures and
  // photographs in the wrong place.
  const card = host.querySelector<HTMLElement>(".coc-card");
  if (card !== null) {
    card.style.animation = "none";
  }
  await pause(420);

  // The slider board, found by the mechanic rather than by its position in the slide list: it is
  // the only one of FUN.2's four visuals with a part named "way".
  const widget = host
    .querySelector('[data-part-row="way"]')
    ?.closest<HTMLElement>(".lesson-interactive");
  if (!widget) {
    throw new Error(`FUN.2's review scroll drew no ${BOARD} to photograph`);
  }
  const columnWidth = (
    widget.closest("figure.lesson-visual") as HTMLElement
  ).getBoundingClientRect().width;
  expect(
    columnWidth,
    "this board is not in the in-city lesson column, so the frames are of the wrong container",
  ).toBeGreaterThan(FIGURE_CONTENT_CAP * 1.75);
  return { widget, columnWidth };
}

/**
 * THE SAME ROW, PHOTOGRAPHED BEFORE AND AFTER A WRONG ANSWER.
 *
 * A spatial claim owes a frame somebody looked at, and "nothing moved" owes TWO of them: one
 * picture of a settled board says only that the board looks reasonable. Both are the whole
 * viewport rather than a crop of the row, because the subject of the evidence is the surface the
 * row sits on — a crop to the controls would show the one part of the picture nobody doubted.
 *
 * Both parts are photographed, because the report named both: "the chips AND the text input".
 */
test(`${BOARD}: frames of the calls before and after a wrong call, at 1024x580`, async () => {
  const { widget, columnWidth } = await boardInLessonColumn();

  widget.scrollIntoView({ block: "center" });
  await pause(160);
  const before = places(widget);
  await shoot("calls-before-wrong-call-1024x580");

  call(widget, WRONG_CALL);
  await waitFor(
    () => verdictState(widget, "way") !== null,
    `${BOARD}: the way part was never verdicted`,
  );
  await document.fonts.ready;
  await pause(160);
  const after = places(widget);
  // Taken BEFORE the assertion, so a red run still leaves the picture the numbers describe.
  await shoot("calls-after-wrong-call-1024x580");

  const moved = drift(before, after, { down: false });
  console.log(
    `${BOARD} calls in FUN.2's ${columnWidth.toFixed(1)}px lesson column at ${VIEWPORT.width}x${VIEWPORT.height}: ${moved.length === 0 ? "nothing moved across" : moved.join("; ")}`,
  );
  expect(
    moved.join("; "),
    `in the column a learner is really given, the verdict re-centred the row it landed in`,
  ).toBe("");
  expectMeasuredSomething(widget, "way", "wrong", before, after);
}, 60_000);

test(`${BOARD}: frames of the typed field before and after a wrong entry, at 1024x580`, async () => {
  const { widget, columnWidth } = await boardInLessonColumn();

  const limit = partRow(widget, "limit");
  limit.scrollIntoView({ block: "center" });
  await pause(160);
  const before = places(widget);
  await shoot("field-before-wrong-entry-1024x580");

  const field = all<HTMLInputElement>(limit, "input")[0];
  if (field === undefined) {
    throw new Error(`${BOARD} draws no typed field on its limit part`);
  }
  setInputValue(field, "0");
  const check = limit.querySelector<HTMLButtonElement>(".lesson-interactive__check");
  if (check === null) {
    throw new Error(`${BOARD} draws no Check on its limit part`);
  }
  check.click();
  await waitFor(
    () => verdictState(widget, "limit") !== null,
    `${BOARD}: the limit part was never verdicted`,
  );
  await document.fonts.ready;
  await pause(160);
  const after = places(widget);
  await shoot("field-after-wrong-entry-1024x580");

  const moved = drift(before, after, { down: false });
  console.log(
    `${BOARD} field in FUN.2's ${columnWidth.toFixed(1)}px lesson column at ${VIEWPORT.width}x${VIEWPORT.height}: ${moved.length === 0 ? "nothing moved across" : moved.join("; ")}`,
  );
  expect(
    moved.join("; "),
    `in the column a learner is really given, the verdict re-centred the field and the Check beside it`,
  ).toBe("");
  expectMeasuredSomething(widget, "limit", "wrong", before, after);
}, 60_000);
