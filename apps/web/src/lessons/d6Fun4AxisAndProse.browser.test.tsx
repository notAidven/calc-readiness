/**
 * FUN.4's graph boards, PHOTOGRAPHED in the lesson column and measured where a picture alone
 * would be ambiguous.
 *
 * Two defects, both SPATIAL, so `.cursor/rules/qa-verification.mdc` says a passing layout
 * assertion does not discharge either one. Each test therefore leaves a frame behind, taken
 * at a short realistic viewport, framed to the whole surface rather than cropped to the thing
 * that changed, and taken BEFORE its assertions so a red run still leaves the picture.
 *
 *  - **The "reading" caption** sat at `x = PLOT.left - 8`, `textAnchor="end"`, which is the
 *    same column the reading ticks are drawn in, six user units above the topmost one. The
 *    cause is not where the caption is: it is that a BOUNDARY tick carried a number. Each of
 *    these boards ends its range on an even reading, so `mapY(readings) === PLOT.top` and the
 *    top number is centred on the plot's border with half its ink in the caption's margin.
 *    `svgKit`'s `interiorTicks` exists for exactly that and says so; the fix is to run the
 *    NUMBERS through it and leave the grid lines alone. Measured on THREE of FUN.4's four
 *    planes, at -11.4px, -11.4px and -7.5px, and fixed on all three.
 *  - **`feature-extremum-spot`'s report lines** are SENTENCES with typeset numbers inside
 *    them, on a class whose other members hold a single expression. `inline-flex` +
 *    `align-items: center` made each run of words and the number separate flex items and
 *    centred their BOXES, which is not a baseline, and `flex-wrap: nowrap` meant the words
 *    after the number could not rejoin the words before it when the line ran out of room. The
 *    fix is a widget-scoped modifier, because the class is shared with the `SpotTheError` kind
 *    and `spotWorkCentered.browser.test.tsx` reports 20 passed over the same change made to
 *    the shared rule: it measures centring, which a stretched block button still satisfies.
 *
 * ## Why the second one is measured on baselines and on reading order
 *
 * A KaTeX box's bottom is its baseline plus the expression's depth, so box alignment and
 * baseline alignment are different claims (see `katexBaseline.ts`). The words are read off a
 * `Range` over the text node, corrected by the font's own descent, measured off a probe in the
 * button's own font rather than assumed from the em.
 *
 * Reading order is the second half, and it is the half a baseline check cannot see: three flex
 * items side by side all sit on one row, so "the number is on the sentence's baseline" can be
 * true of a sentence whose ending has been dealt above its own middle. The claim is that the
 * words AFTER the number start on the last line of the words before it, or below it, and it
 * carries a floor, because a sentence that fits on one line satisfies it for free.
 *
 * ## The number this file could not see
 *
 * Both measurements above are about a BOX, and a number left out of KaTeX has none. Two of
 * these three sentences name two hours, and `ReportLine` used to hold `before` / `value` /
 * `after` — room for exactly one typeset number, with the second written into the `after`
 * prose as a bare digit. `proseReadings` reached for that number with `querySelector`, which
 * stops at the FIRST `[data-latex]` in the button, so it measured the typeset hour, never
 * looked for the second, and reported green either way. That is why the widget's segment list
 * and this file's `numbers` list arrived together: the fix is not believable without a guard
 * that can see the half of the sentence the defect lives in.
 *
 * So there are now three claims per line rather than two. Every number is measured, not the
 * first; at least one line has to carry TWO of them, since a per-line count of one is exactly
 * what the old shape enforced; and the sentence with its KaTeX subtrees deleted must hold no
 * digit at all, which is the only assertion here that a perfectly aligned line can fail.
 *
 * The same claim over the whole tree is `visualsMath.test.tsx`'s "no visual prints a bare
 * digit beside a number it typesets". The count is what made it a tree sweep rather than a D6
 * one: 4 live visuals of 253 mixed the two notations in one sentence, 3 once the report above
 * was fixed, and 2 once `linear-model-claim-spot` was fixed with it. Both survivors are
 * progress counters, excused there by their exact reading.
 *
 * ## The population, and the exception list that used to be here
 *
 * The reported defect is "FUN.4 reading intercepts with axis", which is a statement about a NODE
 * and not about a file, so the population is FUN.4's placed visuals, derived from the lesson
 * pack. All four draw a captioned plane and all four are swept, with a floor under the count.
 *
 * It was briefly narrower. `OUT_OF_LANE` named `lesson-interactive--walkthrough` and
 * `lesson-interactive--table` as boards measured colliding but outside the session's lane,
 * asserted in both directions. It is gone because the debt is paid rather than because the list
 * was wrong, and it earned its keep on the way out: with both boards fixed and both entries
 * still listed, this file failed at *"lesson-interactive--walkthrough no longer collides: delete
 * it from OUT_OF_LANE (colliding now: none)"*. That is what an exemption naming what it excuses
 * buys, and it is why the two boards could not be quietly left out of the sweep instead.
 *
 * Five widgets in `interactive/` draw this same corner caption at `PLOT.left - 8, PLOT.top - 2`;
 * the fifth is `ExpGraphPlay`, on D8, whose window is computed rather than chosen and which
 * already goes through `fittingTicks`. It is outside this node and is not swept here.
 *
 * ## What nothing in the tree measures, and this file does not either
 *
 * `plotLayout.test.tsx` holds the general form of the caption claim ("no axis number is centered
 * on the plot's border") over every live visual, and it has never examined a vertical axis:
 * `borderTicks` skips any tick failing `x > frame.left`, and every y-axis number in this tree is
 * drawn in the left MARGIN, so `x` is always less than `frame.left`. The filter was written to
 * exclude margin CAPTIONS and excludes the entire vertical scale with them. That sweep is 396
 * green assertions over 35 planes, none of which has ever measured a y number.
 *
 * The blast radius of widening it was measured rather than guessed, on a throwaway copy of
 * `borderTicks` with only that one gate swapped for "in the left margin", over the same 35
 * planes: **zero** further planes fail, once the three boards here are fixed. A naive widening
 * that keeps only the margin test and drops `borderTicks`'s y band reports five, all of them the
 * x-axis "0" in the bottom-left corner, which is drawn outside the box by design. The count is
 * not a vacuous zero: with `interiorTicks` taken back out of `GraphFeatureWalkthrough` it reads
 * one, at *feature-trace-walkthrough: "12" centered 0.2 from a horizontal edge*. So the follow-up
 * is a guard change with an empty red list, not a sweep of unfixed boards.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { lessonByNode } from "./domains";
import { katexBaseline } from "./katexBaseline";
import { LessonBody } from "./LessonBody";
import { CITY_PHONE } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import type { LessonContent } from "./types";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The reviewer's window: short, and the viewport the desktop frames are named for. */
const DESKTOP = { width: 1024, height: 580 } as const;

/**
 * A 390px phone, at the desktop frames' height rather than `PHONE_VIEWPORT`'s 844.
 *
 * The wrap claim is about WIDTH, and 390 is the width `CITY_PHONE` is measured at. The height
 * is held at 580 because vitest scales its tester iframe when the requested viewport does not
 * fit the real window, and a scaled frame is not a frame at the viewport it claims.
 */
const PHONE = { width: 390, height: 580 } as const;

const SHOTS = "apps/web/src/lessons/__screenshots__";

/** Sub-pixel layout, not a budget: the defect this is written for is whole pixels. */
const BASELINE_SLACK = 1;

/**
 * Clear space owed between the axis caption and the nearest tick number, in CSS px.
 *
 * Small on purpose. The defect is an overlap, so anything at or below zero is the bug; four
 * px is "a reader can see these are two separate captions" and nothing more.
 */
const CLEAR = 4;

/** Clear space owed between the "hour" caption and the nearest x-axis number, in px. */
const HOUR_CLEAR = 4;

/**
 * Every plane FUN.4 puts on screen, keyed by the widget modifier a mounted figure carries.
 *
 * Written down as well as derived, because the sweep below is over whatever the lesson pack
 * places and a filter that silently stops matching one of these would shrink the population
 * without failing. Four boards, and the sweep asserts it found exactly these four.
 */
const FUN4_PLANES: readonly string[] = [
  "lesson-interactive--classify",
  "lesson-interactive--spot",
  "lesson-interactive--walkthrough",
  "lesson-interactive--table",
];

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
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
 * Copied from `functionNotationLabelShot.browser.test.tsx`, which copied it from
 * `reviewCardContainment.browser.test.tsx`: mounted bare through `LessonVisual`, a widget's
 * ancestors are a throwaway `<div>` and the shipped reading column never binds.
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
 * lands somewhere else on the real screen.
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
async function shoot(
  name: string,
  viewport: { width: number; height: number },
): Promise<void> {
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a ${viewport.width}x${viewport.height} screen`,
  ).toBeCloseTo(1, 1);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, viewport.width),
      height: Math.min(box.height, viewport.height),
      scale: 1,
    },
  });
  const path = `${SHOTS}/${name}-${viewport.width}x${viewport.height}.png`;
  expect(shot.data, `no screenshot data for ${path}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(path, shot.data, { encoding: "base64" });
  }
}

/** FUN.4's review scroll, mounted at `viewport` with every figure up and its math typeset. */
async function fun4(viewport: { width: number; height: number }): Promise<HTMLElement> {
  await page.viewport(viewport.width, viewport.height);
  const content = lessonByNode["FUN.4"];
  if (content === undefined) {
    throw new Error("FUN.4 has no authored lesson, so there is nothing to photograph");
  }
  const placed = content.visuals?.map((v) => v.id) ?? [];
  expect(placed, "FUN.4 no longer places the interval board").toContain(
    "feature-interval-classify",
  );
  expect(placed, "FUN.4 no longer places the extremum report").toContain(
    "feature-extremum-spot",
  );

  h = mount(<ReviewScroll content={content} />);
  const host = h.host;
  await waitFor(
    () => host.querySelectorAll("figure.lesson-visual").length === placed.length,
    `FUN.4: all ${placed.length} figures mount in the review scroll`,
  );
  await document.fonts.ready;
  // `.coc-card`'s pop-in animates `transform: scale`, and a transformed box both measures and
  // photographs in the wrong place.
  const card = host.querySelector<HTMLElement>(".coc-card");
  if (card !== null) {
    card.style.animation = "none";
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 420));
  // `data-latex` is on the element from first render, so nothing spatial may be read before
  // the typesetter has actually given the expression a box.
  await waitFor(
    () => host.querySelectorAll(".katex").length > 4,
    "FUN.4: KaTeX typesets the boards",
  );
  return host;
}

/** The one element `selector` is meant to identify, with the count asserted rather than assumed. */
function only(host: HTMLElement, selector: string, what: string): HTMLElement {
  const found = Array.from(host.querySelectorAll<HTMLElement>(selector));
  expect(
    found.length,
    `${what}: expected exactly one ${selector} in FUN.4's scroll, found ${found.length}`,
  ).toBe(1);
  return found[0] as HTMLElement;
}

/** Clear space between two boxes: positive is a gap, negative is an overlap. */
function clearance(a: DOMRect, b: DOMRect): number {
  return Math.max(
    Math.max(a.left - b.right, b.left - a.right),
    Math.max(a.top - b.bottom, b.top - a.bottom),
  );
}

/** How close a plane's axis caption comes to any of the numbers on that same axis. */
function captionGap(
  board: HTMLElement,
): { said: string; gap: number; nearest: string } | null {
  const svg = board.querySelector("svg");
  const frame = svg?.querySelector("[data-plot-frame]") ?? null;
  if (svg === null || frame === null) {
    return null;
  }
  const texts = Array.from(svg.querySelectorAll("text"));
  const plot = frame.getBoundingClientRect();
  // The caption for the OUTPUT axis: the one word drawn left of the plot and above it.
  const caption =
    texts.find((t) => {
      const box = t.getBoundingClientRect();
      const said = (t.textContent ?? "").trim();
      return said !== "" && !/^\d+$/.test(said) && box.bottom <= plot.top + 2;
    }) ?? null;
  if (caption === null) {
    return null;
  }
  const ticks = texts.filter((t) => {
    const said = (t.textContent ?? "").trim();
    return /^\d+$/.test(said) && t.getBoundingClientRect().right <= plot.left + 2;
  });
  if (ticks.length < 2) {
    return null;
  }
  const capBox = caption.getBoundingClientRect();
  const worst = ticks
    .map((t) => ({
      nearest: (t.textContent ?? "").trim(),
      gap: clearance(capBox, t.getBoundingClientRect()),
    }))
    .reduce((low, next) => (next.gap < low.gap ? next : low));
  return { said: (caption.textContent ?? "").trim(), ...worst };
}

/** How close the x-axis caption "hour" comes to the numbered x-axis ticks. */
function hourGap(
  board: HTMLElement,
): { said: string; gap: number; nearest: string } | null {
  const svg = board.querySelector("svg");
  const frame = svg?.querySelector("[data-plot-frame]") ?? null;
  if (svg === null || frame === null) {
    return null;
  }
  const texts = Array.from(svg.querySelectorAll("text"));
  const plot = frame.getBoundingClientRect();
  const caption =
    texts.find((t) => {
      const said = (t.textContent ?? "").trim().toLowerCase();
      return said === "hour";
    }) ?? null;
  if (caption === null) {
    return null;
  }
  const ticks = texts.filter((t) => {
    const said = (t.textContent ?? "").trim();
    if (!/^\d+$/.test(said)) {
      return false;
    }
    const box = t.getBoundingClientRect();
    const centerX = (box.left + box.right) / 2;
    return (
      centerX >= plot.left - 1 && centerX <= plot.right + 1 && box.top >= plot.bottom - 2
    );
  });
  if (ticks.length < 2) {
    return null;
  }
  const capBox = caption.getBoundingClientRect();
  const worst = ticks
    .map((t) => ({
      nearest: (t.textContent ?? "").trim(),
      gap: clearance(capBox, t.getBoundingClientRect()),
    }))
    .reduce((low, next) => (next.gap < low.gap ? next : low));
  return { said: (caption.textContent ?? "").trim(), ...worst };
}

/**
 * The font's descent, in px, measured in the element's own font.
 *
 * An empty inline-block's baseline is its bottom margin edge, so the seat's bottom IS the line
 * box's baseline and the word's box bottom is that baseline plus the descent. Absolutely
 * positioned, so it is not a flex item and perturbs nothing while it is up.
 */
function fontDescent(host: HTMLElement): number {
  const probe = document.createElement("span");
  probe.style.cssText =
    "position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap";
  const word = document.createElement("span");
  word.textContent = "Hxgy";
  const seat = document.createElement("span");
  seat.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
  probe.append(word, seat);
  host.append(probe);
  const descent = word.getBoundingClientRect().bottom - seat.getBoundingClientRect().bottom;
  probe.remove();
  return descent;
}

/** One rect per line box this run of words occupies. */
function lineRects(node: Text): DOMRect[] {
  const range = document.createRange();
  range.selectNodeContents(node);
  return Array.from(range.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
}

/** The nearest run of real words on either side of the typeset number. */
function wordsAround(
  button: HTMLElement,
  math: HTMLElement,
): { before: Text | null; after: Text | null } {
  const kids = Array.from(button.childNodes);
  const at = kids.indexOf(math);
  const run = (from: number, step: number): Text | null => {
    for (let i = from; i >= 0 && i < kids.length; i += step) {
      const node = kids[i] as ChildNode;
      if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "") {
        return node as Text;
      }
    }
    return null;
  };
  return { before: run(at - 1, -1), after: run(at + 1, 1) };
}

/** One typeset number, measured against the words on either side of it. */
interface NumberReading {
  /** The LaTeX this number was typeset from, so a log line says WHICH number it is about. */
  latex: string;
  /** How far the number's baseline sits below the baseline of the words before it. */
  offset: number;
  /** How far the words after the number start below the last line of the words before it. */
  order: number;
}

interface LineReading {
  said: string;
  /** The whole sentence as rendered, for the claims that are about the words. */
  text: string;
  /**
   * The same sentence with every KaTeX subtree taken out, which is where a bare digit hides.
   *
   * A number left in the prose is invisible to every measurement above it: there is no box to
   * read a baseline off, and `textContent` cannot tell a typeset 6 from a written one because
   * both are just a "6" in the string. So the untypeset half of the line is read separately,
   * and it is the only claim here that a well-aligned line can still fail.
   */
  prose: string;
  /** Every typeset number in the line, in order. */
  numbers: NumberReading[];
  lines: number;
}

/**
 * How many line boxes a sentence occupies, counted over its runs of WORDS.
 *
 * Every run shares the button's font and line-height, so their rect tops land on one value per
 * line box; a KaTeX box is a different height and would count a line twice, so the numbers are
 * left out of the count. This replaces `head.length + tail.length - 1`, which counted the two
 * runs flanking ONE number and so shrank as soon as a line carried more than one.
 */
function lineCount(button: HTMLElement): number {
  const tops = new Set<number>();
  for (const kid of Array.from(button.childNodes)) {
    if (kid.nodeType !== Node.TEXT_NODE) {
      continue;
    }
    for (const rect of lineRects(kid as Text)) {
      tops.add(Math.round(rect.top));
    }
  }
  return tops.size;
}

/** A line's words with the maths removed, so a digit surviving here is one KaTeX never saw. */
function proseOutsideMath(button: HTMLElement): string {
  const copy = button.cloneNode(true) as HTMLElement;
  for (const math of Array.from(copy.querySelectorAll("[data-latex]"))) {
    math.remove();
  }
  return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Every report line on the extremum board, read as a sentence rather than as a box.
 *
 * EVERY number in the line, not the first. This used to be a `querySelector`, which stops at
 * the first `[data-latex]` in the button — and these sentences name two hours. So the file was
 * green whether or not the second number was typeset at all: the first was measured, the
 * second was in the prose where nothing looked, and the reported defect could not fail here.
 * The `numbers` list and the `prose` string are the two halves of that hole.
 */
function proseReadings(board: HTMLElement): LineReading[] {
  const buttons = Array.from(
    board.querySelectorAll<HTMLElement>(".lesson-spot__line-button"),
  );
  return buttons.map((button) => {
    const descent = fontDescent(button);
    const maths = Array.from(button.querySelectorAll<HTMLElement>("[data-latex]")).filter(
      (math) => math.parentElement === button,
    );
    const numbers = maths.flatMap((math) => {
      const seat = katexBaseline(math);
      const { before, after } = wordsAround(button, math);
      if (seat === null || before === null || after === null) {
        return [];
      }
      const head = lineRects(before);
      const tail = lineRects(after);
      if (head.length === 0 || tail.length === 0) {
        return [];
      }
      const headLast = head[head.length - 1] as DOMRect;
      const tailFirst = tail[0] as DOMRect;
      return [
        {
          latex: math.getAttribute("data-latex") ?? "",
          offset: seat.baseline - (headLast.bottom - descent),
          order: tailFirst.top - headLast.top,
        },
      ];
    });
    const text = (button.textContent ?? "").replace(/\s+/g, " ").trim();
    return {
      said: text.slice(0, 46),
      text,
      prose: proseOutsideMath(button),
      numbers,
      lines: lineCount(button),
    };
  });
}

/**
 * The claims every report line owes, at whatever width it was mounted at.
 *
 * Shared by the desktop test and the phone one because they are the same claims about the same
 * three sentences; only the wrap floor differs, and that stays with its own test.
 */
function expectLinesRead(readings: LineReading[], where: string): void {
  // A census rather than a floor: the report is three lines, and a fourth arriving is a reason
  // to re-read this file rather than something it should quietly sweep.
  expect(readings.length, `${where}: the report is not the three lines this measures`).toBe(
    3,
  );

  // The COMPOSITION, asserted before the count, because a count constrains size and not shape.
  // This is the sentence the round is about: it names two hours, and one typeset hour beside
  // one written one is exactly what the retired `before`/`value`/`after` shape enforced. Found
  // by its own words rather than by position, so a reordered report still measures this line.
  const twoHours = readings.filter((line) => /from hour\b.*\bto hour/.test(line.prose));
  expect(
    twoHours.length,
    `${where}: no report line names two hours, so the sentence this file was extended for is gone`,
  ).toBe(1);
  expect(
    twoHours[0]?.numbers.length,
    `${where}: the two-hour sentence typesets ${twoHours[0]?.numbers.length ?? 0} number(s), so one of its hours reaches the page as prose`,
  ).toBe(2);

  // And a floor on the numbers, so a line that stops typesetting one at all fails here rather
  // than reporting a clean sweep over fewer measurements than the report is written with.
  expect(
    readings.flatMap((line) => line.numbers).length,
    `${where}: fewer typeset numbers than the report is written with`,
  ).toBeGreaterThanOrEqual(4);

  for (const line of readings) {
    // The claim the whole extension is for: a number left out of KaTeX. Read off the sentence
    // with its maths deleted, so a digit here is one that reached the page as prose.
    expect(
      line.prose,
      `"${line.said}": the digit in "${line.prose}" is printed as prose, beside numbers this same sentence typesets`,
    ).not.toMatch(/\d/);
    for (const number of line.numbers) {
      expect(
        Math.abs(number.offset),
        `"${line.said}": the number ${number.latex} sits ${number.offset.toFixed(1)}px off the baseline of the words beside it`,
      ).toBeLessThanOrEqual(BASELINE_SLACK);
      expect(
        number.order,
        `"${line.said}": the words after ${number.latex} start ${(-number.order).toFixed(1)}px ABOVE the last line of the words before it`,
      ).toBeGreaterThanOrEqual(-BASELINE_SLACK);
    }
  }
}

/** Every measurement of one board, logged before anything is asserted about it. */
function logReadings(readings: LineReading[], width: number): void {
  for (const line of readings) {
    const numbers = line.numbers
      .map(
        (number) =>
          `${number.latex} ${number.offset.toFixed(1)}px off the words' baseline, ending ${number.order.toFixed(1)}px below the words before it`,
      )
      .join("; ");
    console.log(
      `feature-extremum-spot @${width}: "${line.said}" over ${line.lines} line(s), prose left "${line.prose}", numbers: ${numbers}`,
    );
  }
}

test("FUN.4's interval board keeps its 'reading' caption clear of the reading ticks", async () => {
  const host = await fun4(DESKTOP);
  const board = only(host, ".lesson-interactive--classify", "the interval board");

  board.scrollIntoView({ block: "center" });
  await new Promise<void>((resolve) => setTimeout(resolve, 120));

  const reading = captionGap(board);
  expect(reading, "the interval board draws no axis caption to measure").not.toBeNull();
  const said = `"${reading?.said}" comes within ${reading?.gap.toFixed(1)}px of the tick "${reading?.nearest}", at ${DESKTOP.width}x${DESKTOP.height}`;
  console.log(`feature-interval-classify: ${said}`);

  await shoot("d6-fun4-interval-classify-axis", DESKTOP);

  expect(
    reading?.gap ?? Number.NaN,
    `feature-interval-classify: ${said}, so the axis caption is printed into its own scale`,
  ).toBeGreaterThanOrEqual(CLEAR);
});

test("FUN.4's other two planes keep their captions clear of the reading ticks", async () => {
  const host = await fun4(DESKTOP);
  // The same defect on the same node: the trace walkthrough and the feature table both number
  // their top reading, and both measured -11.4px before the numbers went through
  // `interiorTicks`. Framed and asserted here rather than left to the sweep below, because a
  // spatial claim owes a picture per board and not one picture for the node.
  const boards = [
    { kind: "lesson-interactive--walkthrough", shot: "d6-fun4-trace-walkthrough-axis" },
    { kind: "lesson-interactive--table", shot: "d6-fun4-feature-table-axis" },
  ] as const;

  const readings: { kind: string; said: string; gap: number }[] = [];
  // Both frames are taken before either assertion, so a red run leaves the picture for BOTH.
  for (const { kind, shot } of boards) {
    const board = only(host, `.${kind}`, kind);
    // The PLOT is centred, not the board. The table board is tall enough that centring the
    // whole of it scrolls the "reading" caption off the top of a 580px window, and a frame that
    // does not contain the caption says nothing about what the caption is printed over.
    (board.querySelector("svg") ?? board).scrollIntoView({ block: "center" });
    await new Promise<void>((resolve) => setTimeout(resolve, 120));
    const reading = captionGap(board);
    expect(reading, `${kind} draws no axis caption to measure`).not.toBeNull();
    const said = `"${reading?.said}" comes within ${reading?.gap.toFixed(1)}px of the tick "${reading?.nearest}", at ${DESKTOP.width}x${DESKTOP.height}`;
    console.log(`${kind}: ${said}`);
    readings.push({ kind, said, gap: reading?.gap ?? Number.NaN });
    await shoot(shot, DESKTOP);
  }

  expect(readings.length, "neither of the other two planes was found").toBe(boards.length);
  for (const reading of readings) {
    expect(
      reading.gap,
      `${reading.kind}: ${reading.said}, so the axis caption is printed into its own scale`,
    ).toBeGreaterThanOrEqual(CLEAR);
  }
});

test("FUN.4's extremum report reads its number on the sentence's own line at 1024x580", async () => {
  const host = await fun4(DESKTOP);
  const board = only(host, ".lesson-interactive--spot", "the extremum report");
  const work = only(host, ".lesson-spot__work", "the report list");

  // The REPORT is the subject, so it is what the frame is centred on: centring the whole board
  // puts its chart in the middle and the wrapped line off the bottom of a 580px screen.
  work.scrollIntoView({ block: "center" });
  await new Promise<void>((resolve) => setTimeout(resolve, 120));

  // The list is the one the desktop column gives it, and not a phone's: the wrap below is a
  // claim about a width, so the width has to be the one being claimed.
  const listWidth = work.getBoundingClientRect().width;
  expect(
    listWidth,
    `the report list is ${listWidth.toFixed(1)}px wide, which is not the desktop column's`,
  ).toBeGreaterThanOrEqual(400);

  const readings = proseReadings(board);
  logReadings(readings, DESKTOP.width);

  await shoot("d6-fun4-extremum-spot-prose", DESKTOP);

  expectLinesRead(readings, `@${DESKTOP.width}`);
  for (const line of readings) {
    // The spacing round the number is the same defect seen from the other side. The old
    // `inline-flex` dropped the whitespace runs either side of the maths, so putting them back
    // meant a line ending on its number got a space in front of its full stop: "is 6 ."
    // Punctuation is safe to read off `textContent` even though KaTeX's MathML duplicates every
    // digit, since the duplication is inside the number and this is about what follows it.
    expect(
      line.text,
      `"${line.said}": a space is printed before this sentence's punctuation`,
    ).not.toMatch(/\s[.,]/);
  }
  // A sentence on one line satisfies the reading-order claim for free, so at least one of
  // these three has to have wrapped for that assertion to have measured anything.
  expect(
    readings.filter((line) => line.lines > 1).length,
    "no report line wrapped, so the reading-order claim above is vacuous here",
  ).toBeGreaterThanOrEqual(1);
});

test("FUN.4's extremum report wraps as one sentence on a 390px phone", async () => {
  const host = await fun4(PHONE);
  const board = only(host, ".lesson-interactive--spot", "the extremum report");
  const work = only(host, ".lesson-spot__work", "the report list");

  work.scrollIntoView({ block: "center" });
  await new Promise<void>((resolve) => setTimeout(resolve, 120));

  const listWidth = work.getBoundingClientRect().width;
  expect(
    listWidth,
    `the report list is ${listWidth.toFixed(1)}px wide, which is wider than a 390px phone gives it`,
  ).toBeLessThanOrEqual(CITY_PHONE.inside + 1);
  expect(listWidth, "the report list has no width to wrap in").toBeGreaterThan(200);

  const readings = proseReadings(board);
  logReadings(readings, PHONE.width);

  await shoot("d6-fun4-extremum-spot-prose", PHONE);

  expectLinesRead(readings, `@${PHONE.width}`);
  // The immersive phone frame widened this well from 305px to 340px, so one of the three now
  // runs past the line rather than two. Keep a floor under the wrapped state: with none, the
  // reading-order assertion above would be green without exercising its multi-line case.
  expect(
    readings.filter((line) => line.lines > 1).length,
    "no report line wrapped on a phone, so the multi-line reading-order claim is vacuous",
  ).toBeGreaterThanOrEqual(1);
});

/** The widget modifier a mounted board carries, which is the only identity a figure has. */
function kindOf(board: HTMLElement): string {
  return (
    Array.from(board.classList).find((name) => name.startsWith("lesson-interactive--")) ??
    "lesson-interactive--unknown"
  );
}

test("no FUN.4 plane prints its axis captions into their own tick rows", async () => {
  const host = await fun4(DESKTOP);
  const planes = Array.from(
    host.querySelectorAll<HTMLElement>(".lesson-interactive"),
  ).flatMap((board) => {
    const gap = captionGap(board);
    const hour = hourGap(board);
    return gap === null || hour === null
      ? []
      : [
          {
            kind: kindOf(board),
            ...gap,
            hourGap: hour.gap,
            hourNearest: hour.nearest,
          },
        ];
  });
  // A floor, because the claim below is over this list and it holds trivially over an empty
  // one. All four of FUN.4's visuals draw a captioned plane, and no board is excused.
  expect(
    planes.length,
    "FUN.4's scroll drew no captioned plane at all, so this sweep measured nothing",
  ).toBeGreaterThanOrEqual(FUN4_PLANES.length);
  for (const plane of planes) {
    console.log(
      `FUN.4 ${plane.kind}: "${plane.said}" is ${plane.gap.toFixed(1)}px from the y-tick "${plane.nearest}"; "hour" is ${plane.hourGap.toFixed(1)}px from x-tick "${plane.hourNearest}"`,
    );
  }

  // A census, not a count: the floor above constrains how many planes were measured and says
  // nothing about WHICH, so a plane that drops out of the population while another arrives
  // clears it. Equality fails whichever way the sweep and `FUN4_PLANES` come apart, which is
  // what the retired `OUT_OF_LANE` list used to buy for its two entries.
  expect(
    planes.map((plane) => plane.kind).sort(),
    "the swept planes are not the four FUN.4 places, so this sweep is measuring a different population than it claims",
  ).toEqual([...FUN4_PLANES].sort());

  const colliding = planes.filter((plane) => plane.gap < CLEAR).map((plane) => plane.kind);
  const said = colliding.length === 0 ? "none" : colliding.join(", ");
  expect(
    colliding,
    `a FUN.4 plane is printing its axis caption into its own scale (colliding: ${said})`,
  ).toEqual([]);

  const hourColliding = planes
    .filter((plane) => plane.hourGap < HOUR_CLEAR)
    .map((plane) => plane.kind);
  const hourSaid = hourColliding.length === 0 ? "none" : hourColliding.join(", ");
  expect(
    hourColliding,
    `a FUN.4 plane is printing the "hour" caption into the x-axis tick row (colliding: ${hourSaid})`,
  ).toEqual([]);
});
