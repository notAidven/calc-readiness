/**
 * An expression a learner reads has to be WHOLE.
 *
 * Two widgets hollowed part of an expression out with `\phantom` so it appeared only above the
 * slot naming it, and in both the hollow collapsed into a different, well-formed, FALSE
 * statement:
 *
 *   - RAD.3, `x^{\frac{\phantom{5}}{\phantom{4}}}` kept the fraction BAR and dropped both
 *     operands, so in superscript position it drew a short horizontal rule: the learner read
 *     $x^{-}$, a negative exponent, which is the thing EXP.1 teaches immediately before it.
 *   - RAD.3, `\sqrt[\phantom{4}]{x}` dropped the index, and a radical with no index is a
 *     SQUARE root, whose index is 2. The figure said "$\sqrt{x}$ has 4" beside its own `why`
 *     text explaining that a square root has index 2.
 *   - RAD.1, `\sqrt{\phantom{00}}` dropped the radicand, and the real radicand `49` was drawn
 *     as the NEXT term in the row. Left to right that is a root sign with nothing under its bar
 *     beside a number, which is not $\sqrt{49}$ and reads as a product.
 *
 * None of it is visible to a unit test: `\phantom` renders its content in `transparent` (KaTeX
 * `Options.getColor`), so the DOM, the text content and the MathML all still carry the digits.
 * Only the paint is missing, which is why this file needs real Chromium.
 *
 * ## Where the hollow-radicand line is drawn, and why it moved
 *
 * This rule first covered a phantom INDEX and a phantom numerator or denominator only, and
 * excluded a hollow radicand on the grounds that an empty radical reads as an unfinished
 * symbol rather than as some other complete expression. RAD.1 is the counterexample: the
 * reasoning was stated about the SYMBOL when the falseness lives in the LAYOUT. A lone
 * `\sqrt{\phantom{}}` really does read as an unfinished symbol; the same glyph with the
 * radicand drawn beside it reads as a product.
 *
 * So the exclusion is narrowed rather than dropped, and it now turns on whether the radicand
 * COULD have been set under the bar. Where it is typeset math, it could, and drawing it outside
 * is the defect. Where it is a form control the learner types into, it could not — an `<input>`
 * cannot live under a surd — and the hollow radical is the only way to write the field label at
 * all. `combine-radicals-builder` is that case and passes on those grounds, not by being named.
 *
 * ## The three claims
 *
 * SHAPE is structural and swept over EVERY visual any lesson places, not just the labelling
 * figures, because the defect is a way of writing LaTeX rather than a property of one widget.
 *
 * PAINT is geometric and swept over every labelling figure: "the latex is right" is not
 * evidence that a learner can see it. It measures at `FIGURE_CONTENT_CAP`, which is a
 * mid-range spot check and not a container a learner sees — `readingWidths.ts` names those,
 * and `labelFigureNarrow.browser.test.tsx` measures the narrow end. Its one-line claim
 * holds at THIS width; two of the three figures cannot hold one line on a phone, and there
 * the claim is that no statement's terms are split.
 *
 * INSTANCE names the two expressions the two fixes were about, so a regression that keeps the
 * phantoms out but loses the expression still fails.
 *
 * Every population is derived at runtime from the lessons and the DOM, never listed, so a
 * fourth labelling widget and a newly registered domain are both swept the day they land. Every
 * assertion here is an ABSENCE, and an absence holds trivially over an empty sweep, so each
 * sweep carries a floor.
 */

import { afterEach, expect, test } from "vitest";

import { allLessons } from "./domains";
import { katexBaseline, readingLine } from "./katexBaseline";
import { FIGURE_CONTENT_CAP } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** Every visual id any lesson places, across every registered domain. */
function liveVisualIds(): LessonVisualId[] {
  return Array.from(
    new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
  ) as LessonVisualId[];
}

async function mountVisual(id: LessonVisualId): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  host.style.width = `${FIGURE_CONTENT_CAP}px`;
  // `figure.lesson-visual` rather than `.lesson-interactive`, because most visuals are static
  // diagrams: waiting on the widget container would time out on every one of them.
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, `${id} mounts`);
  // And then for KaTeX, which `useKatex` typesets in an effect AFTER that container exists.
  // Every measurement here is of rendered maths, so mounting is not far enough: the race is
  // one the machine wins alone and loses under a full suite, and losing it makes a guard
  // report on layout it never saw.
  //
  // Stated as "nothing is still waiting to typeset" rather than "some maths has appeared",
  // because two visuals have none to typeset at all — `pemdas-mnemonic-explore` is six
  // English initials and `exp-graph-play` opens on bare axes — and the second form hangs on
  // both. This one is satisfied immediately by a figure with no `[data-latex]` in it, and is
  // also the stronger wait for the figures that do: it holds out for the LAST span rather
  // than the first.
  await waitFor(
    () =>
      Array.from(host.querySelectorAll("[data-latex]")).every(
        (node) => node.querySelector(".katex") !== null,
      ),
    `${id} typesets its maths`,
  );
  return host;
}

function mathNodes(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-latex]"));
}

function latexOf(node: HTMLElement): string {
  return node.getAttribute("data-latex") ?? "";
}

/**
 * The hollows that leave a DIFFERENT valid expression behind, as the LaTeX an author writes.
 *
 * Stated on the source rather than on the paint because the paint is what is missing: there
 * is no glyph to find and measure, only one that should have been there.
 */
const HOLLOWED_OPERAND: readonly [RegExp, string][] = [
  [
    /\\sqrt\[[^\]]*\\phantom/,
    "a radical whose index is a phantom renders as a square root",
  ],
  [/\\[dt]?frac\{\s*\\phantom/, "a phantom numerator leaves the fraction bar on its own"],
  [/\}\{\s*\\phantom/, "a phantom denominator leaves the fraction bar on its own"],
];

/** A radical whose whole radicand is a phantom, so its bar covers nothing. */
const HOLLOW_RADICAND = /\\sqrt\{\s*\\phantom/;

/**
 * True when this math node is the label of a field the learner types into.
 *
 * That is the one place a hollow radicand is honest: the radicand is an `<input>`, which
 * cannot be typeset under a surd, so `\sqrt{\phantom{0}}` beside the box is the only way to
 * write "root of" at all. Two levels is the field wrapper and the field — deliberately local,
 * because a form control anywhere on the board would excuse a hollow radical anywhere else.
 */
function labelsATypedField(node: HTMLElement): boolean {
  let scope: HTMLElement | null = node.parentElement;
  for (let level = 0; level < 2 && scope !== null; level += 1) {
    if (scope.querySelector("input, select, textarea") !== null) {
      return true;
    }
    scope = scope.parentElement;
  }
  return false;
}

test("no visual hollows out an operand and leaves its operator standing", async () => {
  let visuals = 0;
  let inspected = 0;

  for (const id of liveVisualIds()) {
    const host = await mountVisual(id);
    visuals += 1;

    for (const node of mathNodes(host)) {
      const latex = latexOf(node);
      inspected += 1;

      for (const [pattern, why] of HOLLOWED_OPERAND) {
        expect(pattern.test(latex), `${id}: "${latex}" — ${why}`).toBe(false);
      }

      if (HOLLOW_RADICAND.test(latex)) {
        expect(
          labelsATypedField(node),
          `${id}: "${latex}" hides its radicand, and no field beside it supplies one, so the radicand is typeset math drawn outside the bar it belongs under`,
        ).toBe(true);
      }
    }

    h?.cleanup();
    h = null;
  }

  // Floors, not counts. Every assertion above is an absence, so a sweep that mounted nothing —
  // or mounted visuals that typeset nothing — would pass while proving the opposite.
  expect(visuals, "no lesson places any visual at all").toBeGreaterThanOrEqual(46);
  expect(inspected, "the visuals typeset no math to inspect").toBeGreaterThanOrEqual(300);
});

test("every glyph in every labelling figure is painted, on one line, inside the card", async () => {
  const figures: LessonVisualId[] = [];
  let glyphs = 0;
  let leads = 0;
  let baselinesRead = 0;

  for (const id of liveVisualIds()) {
    const host = await mountVisual(id);
    const figure = host.querySelector<HTMLElement>(".lesson-label__figure");
    if (figure === null) {
      h?.cleanup();
      h = null;
      continue;
    }
    figures.push(id);

    // THE DEFECT, on the paint. `\phantom` renders in `transparent`, so a hollowed expression
    // is a fully populated DOM subtree with nothing drawn in it.
    for (const math of mathNodes(figure)) {
      for (const span of Array.from(math.querySelectorAll<HTMLElement>("span"))) {
        if ((span.textContent ?? "").trim() === "") {
          continue;
        }
        glyphs += 1;
        expect(
          getComputedStyle(span).color,
          `${id}: in "${latexOf(math)}", a glyph reading "${span.textContent}" is drawn invisible`,
        ).not.toBe("rgba(0, 0, 0, 0)");
      }
    }

    // An expression that wraps ARBITRARILY is an expression that reads wrong.
    // (`widgetDropSlots` owns the same measurement as a LAYOUT convention; here it is part
    // of the reading claim, because both figures now carry a lead that spends width the old
    // ones did not.) At this width no figure needs to reflow at all, so one row of slots is
    // the right claim to make here; narrower, two of them must, and it is not.
    const tops = Array.from(
      figure.querySelectorAll<HTMLElement>(".lesson-label__slot"),
    ).map((slot) => slot.getBoundingClientRect().top);
    expect(tops.length, `${id}: the figure has no slots`).toBeGreaterThan(1);
    expect(
      Math.max(...tops) - Math.min(...tops),
      `${id}: the figure wrapped onto a second line at ${FIGURE_CONTENT_CAP}px`,
    ).toBeLessThanOrEqual(2);

    // And the figure's own maths sits ON the row of blanks, which is the line the statement
    // is read along: "$\sqrt{49} = 7$ has ___, ___, ___". `widgetDropSlots` owns this as a
    // per-statement layout claim over the labelling family; here it is part of the READING
    // claim, and made over the derived population above, which is every visual any lesson
    // places rather than one kind's family. A lead centred on the whole part beside it — the
    // rule this replaced — was drawn 15-23px off that line, straddling the boundary between
    // the blanks and the terms captioning them.
    const blanksTop = Math.min(...tops);
    const blanksBottom = Math.max(
      ...Array.from(figure.querySelectorAll<HTMLElement>(".lesson-label__slot")).map(
        (slot) => slot.getBoundingClientRect().bottom,
      ),
    );
    const blanksCentre = (blanksTop + blanksBottom) / 2;
    for (const lead of Array.from(
      figure.querySelectorAll<HTMLElement>(".lesson-label__lead"),
    )) {
      // ON THE BASELINE. This compared the painted box's CENTRE with the band's, on the
      // reasoning that the box is the ink and the ink is what a reader sees — and the box is
      // the ink, but its centre is not where the ink is read. A KaTeX box runs from its
      // baseline less the expression's height to its baseline plus its depth, and RAD.3's
      // `x^{\dfrac{5}{4}} \;\text{has}` is nearly all height with no depth: the box centre
      // sat 0.0px off the band while the maths was read 15.8px below it. `widgetDropSlots`
      // owns the same claim per statement over the kind's family; here it is over every
      // visual any lesson places.
      const said = (lead.textContent ?? "").trim().slice(0, 24);
      const seat = katexBaseline(lead);
      expect(seat, `${id}: the lead "${said}" has no readable baseline`).not.toBeNull();
      const off = (seat?.baseline ?? Number.NaN) - readingLine(lead, blanksCentre);
      leads += 1;
      expect(
        Math.abs(off),
        `${id}: the lead "${said}" is read ${off.toFixed(1)}px off the line its blanks are on`,
      ).toBeLessThanOrEqual(2);
    }

    // Sharing a band is not the same as sitting on one line, and the second is what a reader
    // sees. `flex-end` aligns boxes, a KaTeX box's bottom is its baseline plus its depth, and
    // depth swings with the content, so flush boxes are staggered baselines: EL.2's `y = 5`
    // sat 2.0px off the two terms beside it while every claim above was green.
    // `widgetDropSlots` owns this per statement over the kind's family; here it is part of the
    // reading claim over every visual any lesson places.
    for (const statement of Array.from(
      figure.querySelectorAll<HTMLElement>(".lesson-label__statement"),
    )) {
      // A raised exponent belongs above this line; `widgetDropSlots` proves it still is.
      const baselines = Array.from(
        statement.querySelectorAll<HTMLElement>(
          '.lesson-label__part[data-raised="no"] .lesson-label__glyph',
        ),
      ).flatMap((el) => {
        const at = katexBaseline(el);
        return at === null ? [] : [at.baseline];
      });
      // One term compares nothing, and `fraction-exponent-label`'s second reading names
      // exactly one part. Skipped, and counted in the floor below.
      if (baselines.length < 2) {
        continue;
      }
      baselinesRead += baselines.length;
      const spread = Math.max(...baselines) - Math.min(...baselines);
      expect(
        spread,
        `${id}: the terms in one statement sit on baselines ${spread.toFixed(1)}px apart, so the row they caption is out of line with itself`,
      ).toBeLessThanOrEqual(1);
    }

    const bounds = figure.getBoundingClientRect();
    for (const math of mathNodes(figure)) {
      const box = math.getBoundingClientRect();
      expect(box.width, `${id}: "${latexOf(math)}" has no box`).toBeGreaterThan(0);
      expect(
        box.left,
        `${id}: "${latexOf(math)}" hangs off the left of the figure`,
      ).toBeGreaterThanOrEqual(bounds.left - 1);
      expect(
        box.right,
        `${id}: "${latexOf(math)}" hangs off the right of the figure`,
      ).toBeLessThanOrEqual(bounds.right + 1);
    }

    h?.cleanup();
    h = null;
  }

  expect(figures.length, "no lesson places a labelling figure").toBeGreaterThanOrEqual(3);
  expect(glyphs, "the labelling figures drew no glyphs to measure").toBeGreaterThanOrEqual(
    9,
  );
  // The lead claim holds vacuously over a figure with no leads in it.
  expect(
    leads,
    "no lead was measured, so the band claim held vacuously",
  ).toBeGreaterThanOrEqual(6);
  // And a statement holding one term compares nothing, so the shared-line claim needs a
  // floor counting the baselines it actually put side by side.
  expect(
    baselinesRead,
    "too few baselines were read for the shared-line claim to have compared anything",
  ).toBeGreaterThanOrEqual(8);
});

/**
 * The two expressions the two fixes were about, stated as shapes rather than as one variant's
 * numbers, so each holds across that widget's whole variant table.
 *
 * A regression that keeps the phantoms out and still loses the expression — a figure that
 * dropped its lead, say — passes both sweeps above and fails here.
 */
const WHOLE_EXPRESSIONS: readonly [LessonVisualId, RegExp, string][] = [
  [
    "fraction-exponent-label",
    /x\^\{\\dfrac\{\d+\}\{\d+\}\}/,
    "the whole fraction exponent, both numbers inside it",
  ],
  ["fraction-exponent-label", /\\sqrt\[\d+\]/, "a radical carrying a visible index"],
  [
    "radical-parts-label",
    /\\sqrt\{\d+\} = \d+/,
    "the whole radical with its radicand under the bar",
  ],
  ["radical-parts-label", /\\surd/, "the radical sign quoted as a character of its own"],
];

test.each(WHOLE_EXPRESSIONS)("%s draws %s", async (id, pattern, _what) => {
  const host = await mountVisual(id);
  const figure = host.querySelector<HTMLElement>(".lesson-label__figure");
  if (figure === null) {
    throw new Error(`${id} draws no labelling figure`);
  }
  const latex = mathNodes(figure).map(latexOf);
  expect(latex.length, `${id}: the figure typeset nothing`).toBeGreaterThan(1);
  expect(
    latex.some((source) => pattern.test(source)),
    `${id}: no ${_what} — the figure holds ${latex.join(" | ")}`,
  ).toBe(true);
});
