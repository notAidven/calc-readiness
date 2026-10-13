/**
 * FUN.5's average-rate board keeps its "input" caption off its rule, and both inside the frame.
 *
 * The reported defect (item 37): the caption was centred under the plot at `BOTTOM + 34`, which
 * is y 210, and the rule's `SvgMath` was centred on 208. Two things on the same centre line, one
 * painted through the other. The rule's box overflowed too: `SvgMath`'s default height is
 * `fontSize * 3`, so a 16-unit expression got a 48-unit box running to 232 in a viewBox 226 tall,
 * and an SVG clips at its own frame.
 *
 * ## What is asserted, and why it is two different claims
 *
 * **Nothing is painted over anything.** The caption's box and the rule's ink may not intersect.
 * Stated as a rectangle overlap rather than as a vertical gap, because the fix moved the caption
 * SIDEWAYS, to the end of the axis it names, where "output" has always sat: the two share a band
 * now and are clear of each other across, which a gap-in-y assertion would call a failure and a
 * learner would call correct.
 *
 * **Nothing the figure paints leaves the frame it declares.** Every glyph the board draws, in
 * both the state it opens in and the state the walk lands in, measured against whatever viewBox
 * the source declares rather than against a pinned 226 — a pinned number is the number that was
 * wrong. `completeSquareDragViewBox.browser.test.tsx` is the precedent and the fuller version of
 * this claim.
 *
 * Ink, not boxes, with ONE named exception. `SvgMath` hands every label a deliberately roomy
 * transparent box (140 user units wide for a plot label, three line-heights tall) because a
 * tight box would need a measurement pass, so a blanket assertion over `foreignObject` boxes
 * would be a claim about every diagram in the tree and would fail on labels nobody has ever seen
 * clipped. The rule's box is asserted anyway, on its own, because it is the box this widget now
 * sizes for itself and it is half of what was reported.
 *
 * ## And a frame, because this is a spatial claim
 *
 * `.cursor/rules/qa-verification.mdc`: a passing layout test does not discharge a spatial claim,
 * so the board is also photographed at 1024x580 in the lesson card FUN.5 ships in, framed to the
 * surface rather than cropped to the figure.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { lessonByNode } from "./domains";
import { LessonBody } from "./LessonBody";
import { findButton, type Harness, mount, waitFor } from "./testHarness";
import type { LessonContent } from "./types";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The reviewer's window: short, and the viewport every frame here is named for. */
const VIEWPORT = { width: 1024, height: 580 } as const;

/** How far past an edge counts as a clip rather than as rounding, in SVG user units. */
const TOL = 0.5;

/** The `<title>` the board announces itself by, which is how its figure is found. */
const TITLE = "Average rate of change of a function given by a rule";

/** `useWidgetVariants` opens on index 0, so this is the rule on the board. */
const RULE = "f(x) = x^{2} + 2";

/** The axis caption that was being painted over. */
const CAPTION = "input";

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

/* -------------------------------------------------------------------------- */
/* The surface                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The chain `WorldScene` + `AdvisorLesson` put around the review scroll, class for class.
 * Copied from `functionNotationLabelShot.browser.test.tsx`; see its header for why a figure
 * mounted bare is a figure in a container nobody ships.
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

interface Board {
  card: HTMLElement;
  figure: HTMLElement;
  svg: SVGSVGElement;
}

async function board(): Promise<Board> {
  const content = lessonByNode["FUN.5"];
  if (content === undefined) {
    throw new Error("FUN.5 has no authored lesson, so there is no board to measure");
  }
  expect(
    content.visuals?.map((v) => v.id),
    "FUN.5 no longer places rate-walkthrough, so this file is about something else",
  ).toContain("rate-walkthrough");

  h = mount(<ReviewScroll content={content} />);
  const host = h.host;
  const expected = content.visuals?.length ?? 0;
  await waitFor(
    () => host.querySelectorAll("figure.lesson-visual").length === expected,
    `FUN.5: all ${expected} figures mount in the review scroll`,
  );
  await waitFor(
    () =>
      Array.from(host.querySelectorAll("[data-latex]")).every(
        (node) => node.querySelector(".katex") !== null,
      ),
    "FUN.5's figures typeset their maths",
  );
  await document.fonts.ready;

  const card = host.querySelector<HTMLElement>(".coc-card");
  if (card === null) {
    throw new Error("the review card never mounted");
  }
  // `.coc-card`'s pop-in animates `transform: scale`, and a transformed box both measures and
  // photographs in the wrong place.
  card.style.animation = "none";
  await new Promise<void>((resolve) => setTimeout(resolve, 420));

  const title = Array.from(host.querySelectorAll("svg > title")).find(
    (node) => (node.textContent ?? "").trim() === TITLE,
  );
  const svg = (title?.parentElement as unknown as SVGSVGElement | undefined) ?? null;
  if (svg === null) {
    throw new Error(`no figure on FUN.5's review scroll announces itself as "${TITLE}"`);
  }
  const figure = svg.closest("figure.lesson-visual");
  if (figure === null) {
    throw new Error("the average-rate board is not inside a lesson figure");
  }
  return { card, figure: figure as HTMLElement, svg };
}

/** The walk run out to its end, which is where the legs and their labels are drawn. */
async function walk(figure: HTMLElement): Promise<void> {
  for (let i = 0; i < 3; i += 1) {
    findButton(figure, "Step").click();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  await waitFor(
    () => figure.querySelector("input.lesson-interactive__input") !== null,
    "the walk lands and the board asks for the change in the output",
  );
  await waitFor(
    () =>
      Array.from(figure.querySelectorAll("[data-latex]")).every(
        (node) => node.querySelector(".katex") !== null,
      ),
    "the leg labels typeset",
  );
}

/* -------------------------------------------------------------------------- */
/* Measuring                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * `getBBox` back as a real `DOMRect`.
 *
 * It returns an `SVGRect`, which carries `x`, `y`, `width` and `height` and none of the edge
 * accessors, so reading `.left` off one straight gives `undefined` and every comparison below
 * comes out `NaN` — which `toBeLessThanOrEqual` reports as a failure, so it fails loudly rather
 * than passing, but it is measuring nothing at all.
 */
function rect(box: { x: number; y: number; width: number; height: number }): DOMRect {
  return new DOMRect(box.x, box.y, box.width, box.height);
}

function rootInverse(svg: SVGSVGElement): DOMMatrix {
  const ctm = svg.getScreenCTM();
  if (ctm === null) {
    throw new Error("the figure is not laid out, so nothing can be measured against it");
  }
  return ctm.inverse();
}

function through(to: DOMMatrix, box: DOMRect): DOMRect {
  const corners = [
    new DOMPoint(box.left, box.top),
    new DOMPoint(box.right, box.top),
    new DOMPoint(box.left, box.bottom),
    new DOMPoint(box.right, box.bottom),
  ].map((point) => point.matrixTransform(to));
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return new DOMRect(left, top, Math.max(...xs) - left, Math.max(...ys) - top);
}

/** The frame the figure declares for itself, in its own user units. */
function declaredViewBox(svg: SVGSVGElement): DOMRect {
  const declared = svg.getAttribute("viewBox") ?? "";
  const parts = declared
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(`the figure declares no usable viewBox: "${declared}"`);
  }
  const [minX, minY, width, height] = parts as [number, number, number, number];
  return new DOMRect(minX, minY, width, height);
}

/** One typeset label's INK: the `.katex` box across, the `.strut` down, in user units. */
function mathInk(svg: SVGSVGElement, host: Element): DOMRect | null {
  const katex = host.querySelector<HTMLElement>(".katex");
  const strut = katex?.querySelector<HTMLElement>(".strut");
  if (!katex || !strut) {
    return null;
  }
  const across = katex.getBoundingClientRect();
  const down = strut.getBoundingClientRect();
  if (across.width < 0.5 || down.height < 0.5) {
    return null;
  }
  return through(
    rootInverse(svg),
    new DOMRect(across.left, down.top, across.width, down.height),
  );
}

function labelInk(svg: SVGSVGElement, latex: string): DOMRect {
  const host = svg.querySelector(`[data-latex="${latex}"]`);
  if (host === null) {
    throw new Error(`the figure draws no label $${latex}$`);
  }
  const box = mathInk(svg, host);
  if (box === null) {
    throw new Error(`$${latex}$ was never typeset, so it has no ink to measure`);
  }
  return box;
}

/** A plain SVG caption, by what it says. */
function captionBox(svg: SVGSVGElement, said: string): DOMRect {
  const found = Array.from(svg.querySelectorAll<SVGTextElement>("text")).filter(
    (node) => (node.textContent ?? "").trim() === said,
  );
  if (found.length !== 1) {
    throw new Error(`the figure draws ${found.length} captions saying "${said}", not one`);
  }
  return rect((found[0] as SVGTextElement).getBBox());
}

/** What kind of thing was measured, so a floor can say the population is not one-sided. */
type Kind = "shape" | "caption" | "math";

interface Drawn {
  readonly what: string;
  readonly kind: Kind;
  readonly box: DOMRect;
}

function round(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

function frame(box: DOMRect): string {
  return `(${round(box.left)}, ${round(box.top)}) to (${round(box.right)}, ${round(box.bottom)})`;
}

/** Everything the figure PAINTS, in the root's user units. */
function paintedIn(svg: SVGSVGElement): Drawn[] {
  const drawn: Drawn[] = [];

  for (const el of Array.from(
    svg.querySelectorAll<SVGGraphicsElement>("rect, line, path, circle, polyline, polygon"),
  )) {
    if (el.closest("foreignObject") !== null) {
      continue;
    }
    const box = rect(el.getBBox());
    if (box.width <= 0 && box.height <= 0) {
      continue;
    }
    drawn.push({
      what: `the <${el.tagName.toLowerCase()}> ${frame(box)}`,
      kind: "shape",
      box,
    });
  }

  for (const el of Array.from(svg.querySelectorAll<SVGTextElement>("text"))) {
    const said = (el.textContent ?? "").trim();
    if (said === "") {
      continue;
    }
    drawn.push({ what: `the caption "${said}"`, kind: "caption", box: rect(el.getBBox()) });
  }

  for (const host of Array.from(svg.querySelectorAll("[data-latex]"))) {
    const box = mathInk(svg, host);
    if (box === null) {
      continue;
    }
    drawn.push({
      what: `the label $${host.getAttribute("data-latex") ?? ""}$`,
      kind: "math",
      box,
    });
  }

  return drawn;
}

function outside(bounds: DOMRect, drawn: readonly Drawn[]): string[] {
  const found: string[] = [];
  for (const item of drawn) {
    const past: string[] = [];
    for (const [edge, over] of [
      ["left", bounds.left - item.box.left],
      ["top", bounds.top - item.box.top],
      ["right", item.box.right - bounds.right],
      ["bottom", item.box.bottom - bounds.bottom],
    ] as const) {
      if (over > TOL) {
        past.push(`${over.toFixed(1)} user units past the ${edge} edge`);
      }
    }
    if (past.length > 0) {
      found.push(`${item.what} is ${past.join(" and ")}`);
    }
  }
  return found;
}

function overlap(a: DOMRect, b: DOMRect): { x: number; y: number } {
  return {
    x: Math.min(a.right, b.right) - Math.max(a.left, b.left),
    y: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  };
}

/* -------------------------------------------------------------------------- */
/* The claims                                                                 */
/* -------------------------------------------------------------------------- */

test('rate-walkthrough: the "input" caption is not painted over the rule', async () => {
  const { figure, svg } = await board();

  for (const state of ["at rest", "the walk landed"] as const) {
    if (state === "the walk landed") {
      await walk(figure);
    }
    const caption = captionBox(svg, CAPTION);
    const rule = labelInk(svg, RULE);

    // Floors, because two boxes of nothing never overlap.
    expect(caption.width, `${state}: the "${CAPTION}" caption has no box`).toBeGreaterThan(
      4,
    );
    expect(rule.height, `${state}: the rule typeset to no height`).toBeGreaterThan(8);

    const shared = overlap(caption, rule);
    expect(
      Math.min(shared.x, shared.y),
      `${state}: "${CAPTION}" at ${frame(caption)} and the rule at ${frame(rule)} share ${round(shared.x)}x${round(shared.y)} user units, so one is painted over the other`,
    ).toBeLessThanOrEqual(0);
  }
});

test("rate-walkthrough: nothing it paints falls outside the viewBox it declares", async () => {
  const { figure, svg } = await board();
  const bounds = declaredViewBox(svg);
  const clipped: string[] = [];
  const counted: { state: string; kinds: Record<Kind, number> }[] = [];

  for (const state of ["at rest", "the walk landed"] as const) {
    if (state === "the walk landed") {
      await walk(figure);
    }
    const drawn = paintedIn(svg);
    clipped.push(
      ...outside(bounds, drawn).map(
        (line) => `${state}: ${line} of a ${bounds.width}x${bounds.height} viewBox`,
      ),
    );
    counted.push({
      state,
      kinds: {
        shape: drawn.filter((item) => item.kind === "shape").length,
        caption: drawn.filter((item) => item.kind === "caption").length,
        math: drawn.filter((item) => item.kind === "math").length,
      },
    });
  }

  expect(
    clipped.join("; "),
    "the board paints these outside its own frame, so the root SVG clips them",
  ).toBe("");

  // FLOORS UNDER AN ABSENCE. "Nothing was outside" is satisfied perfectly by a run that
  // measured nothing, so the population is asserted per state and by composition: a run whose
  // KaTeX lookups all came back null would clear a bare total while measuring no maths at all.
  expect(counted.length, "neither state was reached").toBe(2);
  for (const state of counted) {
    expect(
      state.kinds.shape,
      `${state.state}: the plot, the grid and the curve were not measured`,
    ).toBeGreaterThanOrEqual(8);
    expect(
      state.kinds.caption,
      `${state.state}: the tick numbers and the axis captions were not measured`,
    ).toBeGreaterThanOrEqual(7);
    expect(
      state.kinds.math,
      `${state.state}: the typeset labels were not measured`,
    ).toBeGreaterThanOrEqual(1);
  }
  // And the landed state really does draw more than the resting one, or the second pass was
  // the first pass over again and the leg labels were never measured.
  const [rest, landed] = counted as [(typeof counted)[0], (typeof counted)[0]];
  expect(
    landed.kinds.math,
    "the walk landed without drawing the endpoint and leg labels",
  ).toBeGreaterThan(rest.kinds.math);
});

/**
 * The rule's own `foreignObject`, named on its own.
 *
 * A blanket assertion over every math box would fail on plot labels for a box `SvgMath` gives
 * them on purpose, so this is the one box the widget sizes for itself, and it is the half of the
 * report that a measurement of ink cannot see: before the fix the box ran six units past the
 * frame while the glyphs inside it did not.
 */
test("rate-walkthrough: the rule's box is inside the frame, not just its glyphs", async () => {
  const { svg } = await board();
  const bounds = declaredViewBox(svg);
  const host = svg.querySelector<SVGGraphicsElement>(`foreignObject[data-latex="${RULE}"]`);
  if (host === null) {
    throw new Error(`the board draws no rule box for $${RULE}$`);
  }
  const box = rect(host.getBBox());
  expect(box.height, "the rule's box has no height").toBeGreaterThan(8);
  expect(
    outside(bounds, [{ what: "the rule's box", kind: "math", box }]).join("; "),
    `the rule's box ${frame(box)} does not fit a ${bounds.width}x${bounds.height} viewBox`,
  ).toBe("");
});

/**
 * THE FRAME the claims above owe, at the viewport it is named for.
 *
 * Framed to the whole lesson card rather than cropped to the board: the caption and the rule are
 * the parts nobody doubted, and what has to be visible is that they are two separate readings on
 * a surface rather than one smudge.
 */
test("rate-walkthrough: a frame of the board at the named viewport", async () => {
  const { card, figure } = await board();
  await walk(figure);
  figure.scrollIntoView({ block: "center" });
  await new Promise<void>((resolve) => setTimeout(resolve, 120));

  if (CAPTURE_EVIDENCE) {
    const written = await page.screenshot({
      element: card,
      path: `__screenshots__/rate-walkthrough/caption-and-rule-${VIEWPORT.width}x${VIEWPORT.height}.png`,
    });
    expect(written, "no frame was written for the board").toBeTruthy();
  }
});
