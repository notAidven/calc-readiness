/**
 * FUN.1's machine keeps its rule on the machine's centre line, in BOTH of the states it has.
 *
 * The reported defect (item 35): the rule box spans y 38-126, so its centre is 82, and the rule
 * was drawn at 70. It read high because a second `SvgMath` row was pinned at 104 for the
 * substituted rule and rendered `\;` until there was one, so the resting board held one
 * expression above centre with a reserved blank row under it.
 *
 * ## Why "centred" is not the whole claim
 *
 * Centring the rule at rest is easy on its own and it is the wrong fix on its own: the obvious
 * version keeps the two-row block and moves the rule up when the working arrives, and a rule
 * that jumps as the answer lands reads as the board redrawing itself. The rule is the one string
 * that is true before and after the learner acts. So this file makes two claims that a fix has
 * to satisfy TOGETHER, and the second is the load-bearing one:
 *
 *  1. at rest, the rule's ink is centred on its own box, and nothing else is drawn in that box;
 *  2. once the working appears, the rule's ink is in exactly the same place, to a tenth of a
 *     user unit.
 *
 * Claim 1 alone passes over a rule that jumps; claim 2 alone passes over the original defect,
 * which never moved anything.
 *
 * ## What is measured, and in what units
 *
 * Everything is carried into the figure's own user space, because that is where the source
 * authored it and it is the frame the claim is about: the SVG scales to the column it is given,
 * so a reading in CSS pixels would change with the container while the layout did not.
 *
 * A KaTeX label's box is its ink and not its `foreignObject`: `SvgMath` gives every label a
 * deliberately roomy transparent box with `overflow: visible`, so the box says nothing about
 * where the glyphs are. The ink is the `.katex` element across and the `.strut` down, exactly
 * as `completeSquareDragViewBox.browser.test.tsx` and `workedFigureLabels.browser.test.tsx`
 * measure it.
 *
 * ## And a frame, because this is a spatial claim
 *
 * `.cursor/rules/qa-verification.mdc`: a passing layout test does not discharge a spatial claim
 * and neither does reading the computed box, so both states are photographed at 1024x580 in the
 * lesson card FUN.1 really ships in, framed to the surface rather than cropped to the machine.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { lessonByNode } from "./domains";
import { LessonBody } from "./LessonBody";
import { findButton, type Harness, mount, setInputValue, waitFor } from "./testHarness";
import type { LessonContent } from "./types";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** The reviewer's window: short, and the viewport every frame here is named for. */
const VIEWPORT = { width: 1024, height: 580 } as const;

/** How far off counts as a drift rather than as rounding, in SVG user units. */
const TOL = 0.5;

/**
 * The board `useWidgetVariants` opens on is index 0: `f(x) = 3x + 2`, first setting 4.
 *
 * Its two readings, in the order the widget asks for them. The second setting is negative, and
 * once both are in the machine settles back to showing the first one with its working.
 */
const FIRST_READING = "14";
const SECOND_READING = "-4";
/** The working the settled board writes under the rule. */
const WORKING = "3(4) + 2";

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
 *
 * Copied from `functionNotationLabelShot.browser.test.tsx`, which copied it from
 * `reviewCardContainment.browser.test.tsx`: mounted bare, a figure's ancestors are a throwaway
 * `<div>` and the reading column never binds, so the frame would be of a container nobody ships.
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
  /** The whole lesson card, which is what a frame is of. */
  card: HTMLElement;
  /** The machine's own figure inside it. */
  figure: HTMLElement;
  svg: SVGSVGElement;
}

async function board(): Promise<Board> {
  const content = lessonByNode["FUN.1"];
  if (content === undefined) {
    throw new Error("FUN.1 has no authored lesson, so there is no machine to measure");
  }
  expect(
    content.visuals?.map((v) => v.id),
    "FUN.1 no longer places function-machine-solver, so this file is about something else",
  ).toContain("function-machine-solver");

  h = mount(<ReviewScroll content={content} />);
  const host = h.host;
  const expected = content.visuals?.length ?? 0;
  await waitFor(
    () => host.querySelectorAll("figure.lesson-visual").length === expected,
    `FUN.1: all ${expected} figures mount in the review scroll`,
  );
  // Every box below is one KaTeX laid out, and `useKatex` typesets in an effect AFTER the host
  // exists: "nothing is still waiting", not "some maths has appeared".
  await waitFor(
    () =>
      Array.from(host.querySelectorAll("[data-latex]")).every(
        (node) => node.querySelector(".katex") !== null,
      ),
    "FUN.1's figures typeset their maths",
  );
  await document.fonts.ready;

  // `.coc-card`'s pop-in animates `transform: scale`, and a transformed box both measures and
  // photographs in the wrong place.
  const card = host.querySelector<HTMLElement>(".coc-card");
  if (card === null) {
    throw new Error("the review card never mounted");
  }
  card.style.animation = "none";
  await new Promise<void>((resolve) => setTimeout(resolve, 420));

  const frame = host.querySelector<SVGRectElement>("[data-rule-frame]");
  const svg = frame?.ownerSVGElement ?? null;
  if (frame === null || svg === null) {
    throw new Error("no machine on FUN.1's review scroll carries a rule frame to measure");
  }
  const figure = svg.closest("figure.lesson-visual");
  if (figure === null) {
    throw new Error("the machine is not inside a lesson figure");
  }
  return { card, figure: figure as HTMLElement, svg };
}

/** Both readings in, so the machine has settled and written its working under the rule. */
async function solve(figure: HTMLElement): Promise<void> {
  const input = figure.querySelector<HTMLInputElement>("input.lesson-interactive__input");
  if (input === null) {
    throw new Error("the machine offers no reading to type into");
  }
  setInputValue(input, FIRST_READING);
  findButton(figure, "Check").click();
  await waitFor(
    () => figure.querySelector('[data-latex="f(-2) ="]') !== null,
    "the machine moves on to its negative setting",
  );
  setInputValue(input, SECOND_READING);
  findButton(figure, "Check").click();
  await waitFor(
    () => figure.querySelector(`[data-latex="${WORKING}"]`) !== null,
    "the settled machine writes the substituted rule under its rule",
  );
  await waitFor(
    () =>
      Array.from(figure.querySelectorAll("[data-latex]")).every(
        (node) => node.querySelector(".katex") !== null,
      ),
    "the working typesets",
  );
}

/* -------------------------------------------------------------------------- */
/* Measuring                                                                  */
/* -------------------------------------------------------------------------- */

function rootInverse(svg: SVGSVGElement): DOMMatrix {
  const ctm = svg.getScreenCTM();
  if (ctm === null) {
    throw new Error("the figure is not laid out, so nothing can be measured against it");
  }
  return ctm.inverse();
}

/** A screen rectangle carried into the figure's own user space. */
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

/**
 * One label's INK in user units: the `.katex` box across, the `.strut` down.
 *
 * Throws rather than falling back, so a selector that stopped matching is a failure and not a
 * rectangle of zeroes quietly satisfying every comparison below.
 */
function ink(svg: SVGSVGElement, latex: string): DOMRect {
  const host = svg.querySelector(`[data-latex="${latex}"]`);
  if (host === null) {
    throw new Error(`the figure draws no label $${latex}$`);
  }
  const katex = host.querySelector<HTMLElement>(".katex");
  const strut = katex?.querySelector<HTMLElement>(".strut");
  if (!katex || !strut) {
    throw new Error(`$${latex}$ was never typeset, so it has no ink to measure`);
  }
  const across = katex.getBoundingClientRect();
  const down = strut.getBoundingClientRect();
  if (across.width < 0.5 || down.height < 0.5) {
    throw new Error(`$${latex}$ typeset to nothing (${across.width}x${down.height})`);
  }
  return through(
    rootInverse(svg),
    new DOMRect(across.left, down.top, across.width, down.height),
  );
}

/**
 * `getBBox` back as a real `DOMRect`.
 *
 * It returns an `SVGRect`, which carries `x`, `y`, `width` and `height` and none of the edge
 * accessors, so reading `.top` off one straight gives `undefined` and every comparison against
 * it comes out `NaN`.
 */
function rect(box: { x: number; y: number; width: number; height: number }): DOMRect {
  return new DOMRect(box.x, box.y, box.width, box.height);
}

/** The rule's box, in the units the source authored it in. */
function ruleFrame(svg: SVGSVGElement): DOMRect {
  const found = svg.querySelector<SVGRectElement>("[data-rule-frame]");
  if (found === null) {
    throw new Error("the machine draws no rule frame");
  }
  return rect(found.getBBox());
}

/** Every math box overlapping the rule's frame, by the LaTeX it was set from. */
function labelsInFrame(svg: SVGSVGElement): string[] {
  const frame = ruleFrame(svg);
  const found: string[] = [];
  for (const host of Array.from(svg.querySelectorAll("foreignObject[data-latex]"))) {
    const latex = host.getAttribute("data-latex") ?? "";
    const box = rect((host as SVGGraphicsElement).getBBox());
    const overlaps =
      box.x < frame.x + frame.width &&
      box.x + box.width > frame.x &&
      box.y < frame.y + frame.height &&
      box.y + box.height > frame.y;
    if (overlaps) {
      found.push(latex);
    }
  }
  return found;
}

function round(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

function say(name: string, box: DOMRect): string {
  return `${name} ${round(box.top)}..${round(box.bottom)} (centre ${round(box.top + box.height / 2)})`;
}

/** The rule this board is drawn from. Read off the board rather than assumed. */
const RULE = "f(x) = 3x + 2";

/* -------------------------------------------------------------------------- */
/* The claims                                                                 */
/* -------------------------------------------------------------------------- */

test("function-machine-solver: the rule is centred in its box, alone, before the learner acts", async () => {
  const { svg } = await board();
  const frame = ruleFrame(svg);
  const rule = ink(svg, RULE);

  const centre = frame.y + frame.height / 2;
  const reading = `${say("the rule's ink is", rule)} in a box ${round(frame.y)}..${round(frame.y + frame.height)} (centre ${round(centre)})`;
  console.log(`at rest: ${reading}`);

  // A floor first: an untypeset label has no height and would sit dead on any centre.
  expect(rule.height, "the rule typeset to no height at all").toBeGreaterThan(8);
  expect(
    Math.abs(rule.y + rule.height / 2 - centre),
    `${reading}: the rule is not on its box's centre line`,
  ).toBeLessThanOrEqual(1.5);

  // AND the box holds nothing else. This is the half that catches the original defect's cause
  // rather than its symptom: a reserved blank row for the substitution is a label in this box.
  expect(
    labelsInFrame(svg),
    "the resting rule box holds something besides the rule, which is what pushed it up",
  ).toEqual([RULE]);
});

test("function-machine-solver: the rule does not move when the working appears", async () => {
  const { figure, svg } = await board();
  const before = ink(svg, RULE);
  const frame = ruleFrame(svg);

  await solve(figure);

  const after = ink(svg, RULE);
  const working = ink(svg, WORKING);
  console.log(
    `before: ${say("rule", before)}; after: ${say("rule", after)}; ${say("working", working)}`,
  );

  expect(
    Math.abs(after.y - before.y),
    `the rule moved from ${say("", before)} to ${say("", after)} when the working appeared`,
  ).toBeLessThanOrEqual(0.1);
  expect(
    Math.abs(after.x - before.x),
    "the rule moved sideways when the working appeared",
  ).toBeLessThanOrEqual(0.1);

  // The working landed under the rule rather than through it, and inside the machine.
  expect(
    working.top - after.bottom,
    `${say("the working", working)} is not clear of ${say("the rule", after)}`,
  ).toBeGreaterThan(TOL);
  expect(
    frame.y + frame.height - working.bottom,
    `${say("the working", working)} runs out of the bottom of the rule box`,
  ).toBeGreaterThan(TOL);
});

/**
 * THE FRAMES the two claims above owe, at the viewport they are named for.
 *
 * A passing measurement is a claim about boxes; "does the rule sit in the middle of the box, and
 * does it stay put" is a claim about a picture, so two are taken and looked at. Framed to the
 * whole lesson card rather than cropped to the machine: the machine is the part nobody doubted.
 */
test("function-machine-solver: frames of both states at the named viewport", async () => {
  const { card, figure } = await board();
  figure.scrollIntoView({ block: "center" });
  await new Promise<void>((resolve) => setTimeout(resolve, 120));

  const size = card.getBoundingClientRect();
  console.log(
    `card ${round(size.width)}x${round(size.height)} in a ${VIEWPORT.width}x${VIEWPORT.height} viewport`,
  );

  if (CAPTURE_EVIDENCE) {
    const rest = await page.screenshot({
      element: card,
      path: `__screenshots__/function-machine-solver/rule-at-rest-${VIEWPORT.width}x${VIEWPORT.height}.png`,
    });
    expect(rest, "no frame was written for the resting board").toBeTruthy();
    console.log(`at rest: ${String(rest)}`);
  }

  await solve(figure);
  figure.scrollIntoView({ block: "center" });
  await new Promise<void>((resolve) => setTimeout(resolve, 120));

  if (CAPTURE_EVIDENCE) {
    const shown = await page.screenshot({
      element: card,
      path: `__screenshots__/function-machine-solver/rule-with-working-${VIEWPORT.width}x${VIEWPORT.height}.png`,
    });
    expect(shown, "no frame was written for the settled board").toBeTruthy();
    console.log(`with the working: ${String(shown)}`);
  }
});
