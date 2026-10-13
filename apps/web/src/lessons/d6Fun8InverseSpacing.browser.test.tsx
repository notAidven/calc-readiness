/**
 * FUN.8's NUMERATOR SPACES ITS OPERATOR LIKE AN OPERATOR.
 *
 * `inverse-build` writes `x = \dfrac{\square + 6}{2}` with the blank as a real `<input>`, so the
 * `+ 6` beside it is a separate KaTeX expression that begins with the operator. KaTeX discards the
 * literal space in `"+ 6"` and then reads an operator with nothing to its left as a SIGN rather
 * than a sum, which is the correct reading of `+6` and the wrong one here: the term typeset as the
 * number "+6", with no space at all, and the `+` hugged the digit hard enough to read as one glyph.
 *
 * Fixed in the LaTeX, with the leading `{}` that gives the operator a left operand, so KaTeX
 * classes it `mbin` and puts its own medium space back on both sides. Not with a JSX gap or a CSS
 * margin: the space wanted is KaTeX's operator spacing at whatever size the row is set in, and a
 * hand-picked pixel gap is a second opinion about it that stops agreeing the moment the row is
 * resized. See `.cursor/skills/lesson-katex/SKILL.md`.
 *
 * ## The reference, and why the claim is a comparison rather than a threshold
 *
 * A "big enough" gap is a number somebody chose. The row directly below the numerator already
 * carries the same operator between the same two operands, in the same font at the same size,
 * where it has always been binary because a `y` sits in front of it: `x = y + 6`. So the claim is
 * that the numerator's gap MATCHES that one, which needs no threshold, and the floor under it is
 * that the reference gap is not itself zero — otherwise two tight terms would agree perfectly and
 * this file would pass over the defect it exists for.
 *
 * Measured at `c6830be5` with the `{}` removed: the numerator's operator was `mord` with a gap of
 * **0.0px** against the reference's 3.7px, at both widths and on both branches. With the `{}` the
 * two agree to 0.0px.
 *
 * ## Both branches
 *
 * Board one adds and board two subtracts, and a leading `-` is read as a sign for exactly the same
 * reason a leading `+` is. Board two is reached by solving board one, because the widget deals its
 * rules in order and offers no way to pick one.
 *
 * `equationRowFit.browser.test.tsx` names `./interactive/InverseBuild.tsx` as one of fourteen
 * widgets excused from the `.lesson-equation__aside` wrap, on the ground that its rows carry a
 * board-level Check and verdict no part, so they can never hold four children. Nothing here
 * touches that: this is a change to the LaTeX inside one row's body, the row still holds three
 * cells, and that file's census reads sources for `WidgetPartVerdict` rather than for anything
 * spacing-related. It is re-run beside this file all the same, because the numerator is a cell in
 * a row it measures.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { lessonByNode } from "./domains";
import { LessonBody } from "./LessonBody";
import { CITY_DESKTOP, FIGURE_CONTENT_CAP } from "./readingWidths";
import { type Harness, mount, setInputValue, waitFor } from "./testHarness";
import type { LessonContent } from "./types";
import { LessonVisual } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The reviewer's window, and the viewport every number and every frame here is named for. */
const VIEWPORT = { width: 1024, height: 580 } as const;

const BOARD = "inverse-build";

/** Where the frame lands, beside the other lesson frames. */
const SHOTS = "apps/web/src/lessons/__screenshots__/d6-fun8-inverse-spacing";

/** Sub-pixel slack, in px, for comparing two gaps set by the same font at the same size. */
const SLACK = 0.5;

/**
 * How much space KaTeX's medium spacing is worth here, as a floor under the comparison.
 *
 * `\thickmuskip` either side of a binary operator is 0.2222em, and `.lesson-equation__body` is
 * 1.05rem, so the reference gap is about 3.7px. 1.5px is well under that and well over the 0.0px
 * the defect produced, so it is a floor that a real space clears and a missing one cannot.
 */
const SPACE_FLOOR = 1.5;

/** What KaTeX may render an operator as. `-` becomes U+2212 in the typeset output. */
const OPERATORS = new Set(["+", "-", "\u2212"]);

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

/** One typeset operator, as KaTeX classed it and as it sits against the term after it. */
interface Operator {
  /** The LaTeX the expression was built from, for a failure that names what it read. */
  readonly latex: string;
  /** KaTeX's own class on the operator: `mbin` for a sum, `mord` for a sign. */
  readonly klass: string;
  /** The operator glyph, so a failure says which branch it was on. */
  readonly glyph: string;
  /** Px between the operator's ink and the ink of the term after it. */
  readonly gap: number;
}

/**
 * The operator inside one typeset expression, and the space after it.
 *
 * Read off the leaf spans of `.katex-html` rather than off the LaTeX, because the LaTeX is what
 * changed and the claim is about what Chromium drew. MathML is skipped deliberately: KaTeX's
 * `htmlAndMathml` output emits every glyph twice, and the MathML copy has no layout to measure.
 */
function operatorIn(span: HTMLElement): Operator {
  const latex = span.getAttribute("data-latex") ?? "?";
  const html = span.querySelector<HTMLElement>(".katex-html");
  if (html === null) {
    throw new Error(`"${latex}" never typeset, so there is no spacing to measure`);
  }
  const leaves = all<HTMLElement>(html, "span").filter(
    (node) => node.children.length === 0 && (node.textContent ?? "").trim() !== "",
  );
  const at = leaves.findIndex((node) => OPERATORS.has((node.textContent ?? "").trim()));
  const operator = leaves[at];
  const after = leaves[at + 1];
  if (operator === undefined || after === undefined) {
    throw new Error(
      `"${latex}" typeset as ${leaves.map((n) => `"${(n.textContent ?? "").trim()}"`).join("")}, which has no operator followed by a term`,
    );
  }
  return {
    latex,
    klass: operator.className,
    glyph: (operator.textContent ?? "").trim(),
    gap: after.getBoundingClientRect().left - operator.getBoundingClientRect().right,
  };
}

/**
 * The `+ 6` in the numerator of the swap row: the term the report is about.
 *
 * Located by the fraction it sits in rather than by its LaTeX, so a reversion of the fix fails at
 * the assertions below instead of throwing here on a locator that could not find the new spelling.
 */
function numeratorTerm(widget: HTMLElement): HTMLElement {
  const numerator = widget.querySelector<HTMLElement>(
    ".lesson-equation__frac .lesson-equation__part",
  );
  if (numerator === null) {
    throw new Error(`${BOARD} draws no fraction, so there is no numerator to read`);
  }
  const term = numerator.querySelector<HTMLElement>("[data-latex]");
  if (term === null) {
    throw new Error(`${BOARD}'s numerator holds no typeset term beside its blank`);
  }
  return term;
}

/**
 * The same operator on the row below, where it has always been binary: `x = y + 6`.
 *
 * The second `.lesson-equation__row` is the "clear the bar" stage, which is drawn from first paint
 * whether or not it is the open one, so no board has to be walked to reach the reference.
 */
function referenceTerm(widget: HTMLElement): HTMLElement {
  const row = all<HTMLElement>(widget, ".lesson-equation__row")[1];
  if (row === undefined) {
    throw new Error(`${BOARD} drew fewer than two rows, so there is no reference operator`);
  }
  const term = row.querySelector<HTMLElement>("[data-latex]");
  if (term === null) {
    throw new Error(`${BOARD}'s second row holds no typeset expression`);
  }
  return term;
}

/**
 * The mount HOST, not the widget element.
 *
 * Taking the rule after this one remounts the body under a fresh React key, so a handle on
 * `.lesson-interactive` is detached from the document the moment the board is restarted and every
 * reading taken through it goes on describing the board that has gone. Every helper here queries
 * from the host for that reason.
 */
async function boardAt(width: number): Promise<HTMLElement> {
  h = mount(<LessonVisual id={BOARD} />);
  const host = h.host;
  host.style.width = `${width}px`;
  await waitFor(
    () => host.querySelector(".lesson-equation__frac") !== null,
    `${BOARD} mounts at ${width}px`,
  );
  // Until KaTeX's own faces arrive every box reads about 10% narrow, and a spacing claim measured
  // in the fallback font is a claim about the wrong font.
  await document.fonts.ready;
  await waitFor(
    () => numeratorTerm(host).querySelector(".katex-html") !== null,
    `${BOARD}'s numerator typesets`,
  );
  await pause(60);
  return host;
}

/** The blank on whichever row is open, and the button that submits it. */
function openSlot(root: HTMLElement): HTMLInputElement {
  const slot = root.querySelector<HTMLInputElement>("input.lesson-equation__slot");
  if (slot === null) {
    throw new Error(`${BOARD} has no open blank to answer`);
  }
  return slot;
}

async function answer(root: HTMLElement, value: string): Promise<void> {
  setInputValue(openSlot(root), value);
  const check = root.querySelector<HTMLButtonElement>(".lesson-interactive__check");
  if (check === null) {
    throw new Error(`${BOARD} offers no Check for the open row`);
  }
  check.click();
  await pause(40);
}

/**
 * Solve board one and take the next rule, which is the one that SUBTRACTS.
 *
 * Board one is `f(x) = (x + 6) / 2`: swap for `y`, clear a denominator of 2, and the inverse's
 * constant term is `-6`.
 */
async function nextRule(host: HTMLElement): Promise<void> {
  await answer(host, "y");
  await answer(host, "2");
  await answer(host, "-6");
  await waitFor(
    () => host.querySelector(".lesson-interactive__reset") !== null,
    `${BOARD}: board one never finished, so the subtracting rule was never dealt`,
  );
  host.querySelector<HTMLButtonElement>(".lesson-interactive__reset")?.click();
  await waitFor(
    () => (numeratorTerm(host).getAttribute("data-latex") ?? "").includes("8"),
    `${BOARD}: the second rule never arrived`,
  );
  await document.fonts.ready;
  await pause(60);
}

/** Both widths a lesson figure's equation grid can be given; it is capped at 460px inside both. */
const WIDTHS: readonly (readonly [string, number])[] = [
  [CITY_DESKTOP.where, CITY_DESKTOP.column],
  [`the ${FIGURE_CONTENT_CAP}px figure content cap`, FIGURE_CONTENT_CAP],
];

function expectBinaryLike(numerator: Operator, reference: Operator, where: string): void {
  const reading = `${where}: numerator "${numerator.latex}" drew "${numerator.glyph}" as ${numerator.klass} with ${numerator.gap.toFixed(1)}px after it; reference "${reference.latex}" drew ${reference.klass} with ${reference.gap.toFixed(1)}px`;
  console.log(reading);

  // KaTeX's own reading of the term, which is the cause rather than the symptom.
  expect(
    numerator.klass,
    `${reading} — the numerator's operator is not a binary operator, so KaTeX read it as a sign on the digit`,
  ).toContain("mbin");

  // THE FLOOR, first: two tight terms agree with each other perfectly, so the comparison below
  // means nothing unless the thing being compared against is a real space.
  expect(
    reference.gap,
    `${reading} — the reference operator has no space after it either, so this comparison would pass over the defect`,
  ).toBeGreaterThan(SPACE_FLOOR);
  expect(
    numerator.gap,
    `${reading} — the numerator's operator still hugs the digit`,
  ).toBeGreaterThan(SPACE_FLOOR);

  // And the same space as the row below, so nothing here is a hand-picked pixel gap.
  expect(
    Math.abs(numerator.gap - reference.gap),
    `${reading} — the numerator's operator is not spaced like the same operator on the row below`,
  ).toBeLessThanOrEqual(SLACK);
}

test.each(WIDTHS)(
  `${BOARD}: the ADDING rule's numerator spaces its operator like the row below, at %s`,
  async (where, width) => {
    const board = await boardAt(width);
    expectBinaryLike(
      operatorIn(numeratorTerm(board)),
      operatorIn(referenceTerm(board)),
      `${where} (${width}px column) at ${VIEWPORT.width}x${VIEWPORT.height}`,
    );
  },
  60_000,
);

test.each(WIDTHS)(
  `${BOARD}: the SUBTRACTING rule's numerator spaces its operator like the row below, at %s`,
  async (where, width) => {
    const board = await boardAt(width);
    await nextRule(board);

    const numerator = operatorIn(numeratorTerm(board));
    // The precondition: this is the other branch, not the first board measured twice.
    expect(
      numerator.glyph,
      `${BOARD}: the second board still draws a plus, so the minus branch was never reached`,
    ).not.toBe("+");
    expectBinaryLike(
      numerator,
      operatorIn(referenceTerm(board)),
      `${where} (${width}px column) at ${VIEWPORT.width}x${VIEWPORT.height}, subtracting rule`,
    );
  },
  60_000,
);

/* ------------------------------------------------------------------------- the frame */

/**
 * The chain `WorldScene` + `AdvisorLesson` put around the review scroll, class for class.
 *
 * Copied from `functionNotationLabelShot.browser.test.tsx`. Mounted bare through `LessonVisual`
 * the figure's ancestor is a throwaway `<div>` and the reading column a learner is really given
 * never binds, so a frame taken that way is a picture of a container nobody ships.
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

/**
 * THE PICTURE, in the column a learner is really given.
 *
 * A gap of 3.7px is a claim about CSS; whether the `+` reads as an operator rather than as part of
 * the digit is a claim about a rendered frame. Framed to the whole viewport rather than cropped to
 * the fraction, because the numerator has to be read against the row below it — which is where the
 * same operator, correctly spaced, has always been.
 */
test(`${BOARD}: a frame of the swap row in FUN.8's lesson column at 1024x580`, async () => {
  const content = lessonByNode["FUN.8"];
  if (content === undefined) {
    throw new Error("FUN.8 has no authored lesson, so there is nothing to photograph");
  }
  expect(
    content.visuals?.map((v) => v.id),
    `FUN.8 no longer places ${BOARD}, so this frame would be of something else`,
  ).toContain(BOARD);

  h = mount(<ReviewScroll content={content} />);
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-equation__frac") !== null,
    `FUN.8: ${BOARD} mounts in the review scroll`,
  );
  await document.fonts.ready;
  const card = host.querySelector<HTMLElement>(".coc-card");
  if (card !== null) {
    card.style.animation = "none";
  }
  await pause(420);

  const widget = host
    .querySelector(".lesson-equation__frac")
    ?.closest<HTMLElement>(".lesson-interactive");
  if (!widget) {
    throw new Error(`FUN.8's review scroll drew no ${BOARD} to photograph`);
  }
  const columnWidth = (
    widget.closest("figure.lesson-visual") as HTMLElement
  ).getBoundingClientRect().width;
  expect(
    columnWidth,
    "this board is not in the in-city lesson column, so the frame is of the wrong container",
  ).toBeGreaterThan(FIGURE_CONTENT_CAP * 1.75);

  widget.querySelector(".lesson-equation")?.scrollIntoView({ block: "center" });
  await pause(160);
  // Taken BEFORE the assertion, so a red run still leaves the picture the numbers describe.
  await shoot(`swap-row-${VIEWPORT.width}x${VIEWPORT.height}`);

  expectBinaryLike(
    operatorIn(numeratorTerm(widget)),
    operatorIn(referenceTerm(widget)),
    `FUN.8's ${columnWidth.toFixed(1)}px lesson column at ${VIEWPORT.width}x${VIEWPORT.height}`,
  );
}, 60_000);
