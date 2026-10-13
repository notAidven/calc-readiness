/**
 * The reveal passage's tint has to cover the ANSWER, not the line it is written on.
 *
 * QA photographed POL.3's `lost-root-spot`: the passage reads "The answer is
 * $\dfrac{x^{2}}{x} = \dfrac{7x}{x}$", the answer is highlighted in the civic green that
 * marks it off from the reasoning behind it, and the two fractions stand clear of the tint
 * at the top and at the bottom. The numerators are printed on the paper and only the middle
 * band of the expression is marked, so the highlight reads as a stripe through the answer
 * rather than as a box around it.
 *
 * The cause is that `.lesson-interactive__reveal-answer` is an INLINE box. An inline box
 * paints its background over its LINE BOX — font metrics of the passage's own 0.9rem text —
 * and KaTeX draws a `\dfrac` about twice that tall, so the ink escapes a tint that is doing
 * exactly what the box model says. Nothing about the colour or the padding says so: the rule
 * is correct at every declaration and wrong as a whole.
 *
 * Stated here as the geometry a reader sees, and not as "the span is `inline-block`", so the
 * claim survives a different fix: the highlight's box CONTAINS the answer's ink. A guard on
 * the display value would agree with whatever the stylesheet last said.
 *
 * Two claims, because they are two different things:
 *
 *   - the board this was reported on, driven to the reveal the photograph shows;
 *   - a battery of tall shapes through the SHIPPED host and reveal, so the property is held
 *     for the ink a reveal can be handed rather than for one expression. Each shape asserts
 *     it is actually TALL before it asserts containment, because containment over a bare
 *     `x = 7` holds in the broken stylesheet too and would be a green test measuring nothing.
 *
 * Real Chromium and the real stylesheet, imported LAST as `main.tsx` imports it: an inline
 * box's painted background is not a thing jsdom has.
 */

import { afterEach, expect, test } from "vitest";
import { CITY_DESKTOP } from "./readingWidths";
import { InlineMath } from "./svgKit";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual } from "./visuals";
import { WidgetFeedbackHost, WidgetReveal } from "./widgetFeedback";

import "../styles.css";

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** Subpixel slack on a painted box, in px. The defect this was written for is ~9px a side. */
const PAINT_SLACK = 1;

/**
 * How tall a KaTeX box has to be before it counts as TALL, in px.
 *
 * The passage is 0.9rem (14.4px) at line-height 1.55, so a one-line answer's ink is about
 * 15px and its inline background about 17px: containment over one of those is satisfied by
 * the broken stylesheet. A `\dfrac` at this size measures about 35px. 28 is between the two
 * and nowhere near either.
 */
const TALL_INK = 28;

/** The shapes a reveal is really handed, one per way of being taller than its line. */
const TALL_ANSWERS: readonly { name: string; latex: string }[] = [
  { name: "a displayed fraction", latex: "\\dfrac{x^{2}}{x} = \\dfrac{7x}{x}" },
  { name: "a surd", latex: "x = \\sqrt{\\dfrac{5}{2}}" },
  { name: "a fraction raised to a power", latex: "\\left(\\dfrac{14}{2}\\right)^{2}" },
  { name: "a fractional exponent", latex: "x^{\\dfrac{5}{4}}" },
];

function passage(): HTMLElement {
  const found = document.querySelector<HTMLElement>(".lesson-interactive__reveal-answer");
  if (found === null) {
    throw new Error("no reveal passage on screen");
  }
  return found;
}

/**
 * The painted maths inside the highlight, as a box, or null before KaTeX has typeset.
 *
 * Measured on KaTeX's `.base` spans and NOT on the `.katex` root, which is itself an inline
 * box and therefore reports the same line-box height the defect is about: the first run of
 * this file read 17.0px for a `\dfrac` that is 32.5px of ink, and every containment
 * assertion below passed against the broken stylesheet on the strength of it. `.base` is
 * `display: inline-block` in KaTeX's own stylesheet, so its rect is the laid-out expression.
 */
function ink(highlight: HTMLElement): DOMRect | null {
  const bases = Array.from(highlight.querySelectorAll<HTMLElement>(".katex .base"));
  if (bases.length === 0) {
    return null;
  }
  const boxes = bases.map((base) => base.getBoundingClientRect());
  const top = Math.min(...boxes.map((b) => b.top));
  const bottom = Math.max(...boxes.map((b) => b.bottom));
  const left = Math.min(...boxes.map((b) => b.left));
  const right = Math.max(...boxes.map((b) => b.right));
  return new DOMRect(left, top, right - left, bottom - top);
}

/**
 * The one assertion, spent on every case: the tint's box contains the answer's ink.
 *
 * Returns the ink's height so the caller can prove the case was a tall one.
 */
function highlightCovers(where: string): number {
  const highlight = passage();
  const glyphs = ink(highlight);
  if (glyphs === null) {
    throw new Error(`${where}: the answer never typeset`);
  }
  const tint = highlight.getBoundingClientRect();

  expect(
    glyphs.top,
    `${where}: the answer stands ${(tint.top - glyphs.top).toFixed(1)}px above the top of its highlight`,
  ).toBeGreaterThanOrEqual(tint.top - PAINT_SLACK);
  expect(
    glyphs.bottom,
    `${where}: the answer hangs ${(glyphs.bottom - tint.bottom).toFixed(1)}px below the bottom of its highlight`,
  ).toBeLessThanOrEqual(tint.bottom + PAINT_SLACK);
  expect(
    glyphs.left,
    `${where}: the answer starts ${(tint.left - glyphs.left).toFixed(1)}px left of its highlight`,
  ).toBeGreaterThanOrEqual(tint.left - PAINT_SLACK);
  expect(
    glyphs.right,
    `${where}: the answer runs ${(glyphs.right - tint.right).toFixed(1)}px past the right of its highlight`,
  ).toBeLessThanOrEqual(tint.right + PAINT_SLACK);

  return glyphs.height;
}

/* ------------------------------------------------- 1. the board it was reported on */

test("lost-root-spot: the reveal tints the whole of the fraction it names", async () => {
  h = mount(<LessonVisual id="lost-root-spot" />);
  const host = h.host;
  host.style.width = `${CITY_DESKTOP.column}px`;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "lost-root-spot mounts",
  );

  // A line that DOES follow, which is what offers the reveal: the widget only lets a
  // learner past the "find it" stage once they have actually tried it.
  const tried = Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find((b) =>
    (b.getAttribute("aria-label") ?? "").startsWith("Flag the line the equation"),
  );
  if (tried === undefined) {
    throw new Error("no line to flag");
  }
  tried.click();

  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal-button") !== null,
    "the reveal is offered",
  );
  host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button")?.click();

  await waitFor(() => ink(passage()) !== null, "the revealed answer typesets");

  const tall = highlightCovers("lost-root-spot");
  // The board is only evidence about THIS defect if the answer it reveals is a tall one.
  expect(
    tall,
    `lost-root-spot's revealed answer is only ${tall.toFixed(1)}px tall, so it is not the case the highlight fails on`,
  ).toBeGreaterThanOrEqual(TALL_INK);
});

/* --------------------------------------------- 2. every shape a reveal can be handed */

/** One reveal, in the shipped host, with the shipped button in front of it. */
function OneReveal({ latex }: { latex: string }) {
  return (
    <WidgetFeedbackHost>
      <div className="lesson-interactive">
        <WidgetReveal
          available
          revealed={false}
          answer={<InlineMath latex={latex} />}
          why={<>The reasoning the passage carries behind the answer.</>}
          onReveal={() => {}}
        />
      </div>
    </WidgetFeedbackHost>
  );
}

test("the highlight covers tall maths of every shape, not just the line it sits on", async () => {
  let measured = 0;
  let shortest = Number.POSITIVE_INFINITY;

  for (const { name, latex } of TALL_ANSWERS) {
    h = mount(<OneReveal latex={latex} />);
    const host = h.host;
    host.style.width = `${CITY_DESKTOP.column}px`;
    await waitFor(
      () => host.querySelector(".lesson-interactive__reveal-button") !== null,
      `${name}: the reveal mounts`,
    );
    host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button")?.click();
    await waitFor(() => ink(passage()) !== null, `${name}: the answer typesets`);

    const tall = highlightCovers(name);
    expect(
      tall,
      `${name} is only ${tall.toFixed(1)}px tall, so this case cannot see the defect`,
    ).toBeGreaterThanOrEqual(TALL_INK);
    shortest = Math.min(shortest, tall);
    measured += 1;

    h.cleanup();
    h = null;
  }

  // A floor, because every assertion above is an inequality inside a loop and all of them
  // hold vacuously over an empty battery.
  expect(measured, "no reveal was measured, so nothing above was asserted").toBe(
    TALL_ANSWERS.length,
  );
  expect(measured, "the battery shrank to a single shape").toBeGreaterThanOrEqual(4);
  expect(
    shortest,
    "the shortest shape in the battery is not tall enough to fail in the broken stylesheet",
  ).toBeGreaterThanOrEqual(TALL_INK);
});

/* --------------------------------------------- 3. and the answers that are not maths */

/**
 * The other half of making the tint an atomic box: it must still WRAP like a sentence.
 *
 * `WidgetReveal` is not a D4 component and it is not a maths component. Ninety-odd widgets
 * hand it an answer and not all of those answers are an expression: `LabelParts` reveals
 * `the ${part.name}`, `LikeTermsClassify` reveals "Like terms", the four classify boards
 * reveal the calls a learner missed, and `cfu.tsx` reveals whatever an authored item put in
 * `answerKey`. An inline box wrapped those mid-phrase because that is what inline boxes do;
 * an `inline-block` is ATOMIC, and an atomic box wider than the column does not wrap, it
 * hangs out of the passage.
 *
 * So the fix for the tall maths carries a second declaration, `max-width: 100%`, and this
 * is what holds the passage to it.
 *
 * What that declaration is worth was measured rather than assumed, because deleting it on
 * its own changes nothing: shrink-to-fit already caps an `inline-block` at the width it is
 * offered, so this test stays green over a stylesheet without it and would have been an
 * assertion about nothing if it had been left there. The edit it actually catches is the
 * obvious next one — size the box to its ink — and `width: max-content` paints this answer
 * 105.0px past the right of its passage with `max-width` gone and inside it with
 * `max-width` present. That pair is the reason both lines are in the stylesheet.
 */
const LONG_PROSE =
  "the third bin, the one holding every radical whose radicand is already square-free once the perfect squares have been taken out from under the sign";

function ProseReveal({ answer }: { answer: string }) {
  return (
    <WidgetFeedbackHost>
      <div className="lesson-interactive">
        <WidgetReveal
          available
          revealed={false}
          answer={answer}
          why={<>The reasoning the passage carries behind the answer.</>}
          onReveal={() => {}}
        />
      </div>
    </WidgetFeedbackHost>
  );
}

test("a revealed answer that is prose still wraps inside the passage", async () => {
  h = mount(<ProseReveal answer={LONG_PROSE} />);
  const host = h.host;
  host.style.width = `${CITY_DESKTOP.column}px`;
  await waitFor(
    () => host.querySelector(".lesson-interactive__reveal-button") !== null,
    "the reveal mounts",
  );
  host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button")?.click();
  await waitFor(
    () => document.querySelector(".lesson-interactive__reveal-answer") !== null,
    "the answer appears",
  );

  const highlight = passage();
  const tint = highlight.getBoundingClientRect();
  const around = highlight.closest<HTMLElement>(".lesson-interactive__reveal");
  if (around === null) {
    throw new Error("the highlight is not inside a reveal passage");
  }
  const box = around.getBoundingClientRect();

  expect(
    tint.right,
    `the revealed answer is painted ${(tint.right - box.right).toFixed(1)}px past the right of the passage that introduces it`,
  ).toBeLessThanOrEqual(box.right + PAINT_SLACK);
  expect(
    tint.left,
    `the revealed answer starts ${(box.left - tint.left).toFixed(1)}px left of the passage`,
  ).toBeGreaterThanOrEqual(box.left - PAINT_SLACK);

  // A floor under both, because a highlight that rendered nothing sits inside everything.
  // Stated as "this case really is wider than one line", which is the only thing that
  // makes it evidence about wrapping at all.
  expect(
    tint.height,
    `the prose answer laid out on a single ${tint.height.toFixed(1)}px line, so it never had to wrap`,
  ).toBeGreaterThan(TALL_INK);
  expect(
    (highlight.textContent ?? "").trim().length,
    "the highlight is empty, so nothing was measured",
  ).toBeGreaterThanOrEqual(LONG_PROSE.length);
});
