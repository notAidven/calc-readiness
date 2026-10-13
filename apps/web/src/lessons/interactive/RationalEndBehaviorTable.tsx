/**
 * RAT.5 interactive (slide 3): fill in the end-behavior rule table.
 *
 * The slide's own prose is a three-row rule: a smaller numerator degree settles at $y = 0$,
 * equal degrees settle on the ratio of the leading coefficients, a larger numerator degree
 * has no horizontal asymptote at all. A table is the shape that argument already has, and it
 * is the shape that keeps the worked rows on screen beside the row being written, so the
 * learner reads the rule off the pattern instead of being told it and then agreeing.
 *
 * Two rows are given and three are blank, and the two equal-degree rows are what make the
 * table worth filling: the ratio has to be built from the leading coefficients rather than
 * copied, and the reversed ratio is on offer as a chip.
 *
 * The third column is headed with the TERM and the prompt keeps the plain-language gloss. A
 * heading is announced as the name of what the column holds, so a verb phrase there would
 * teach "settles at" as the name of the thing this slide exists to name; the prompt is prose
 * and can afford to say what the term means.
 */

import { InlineMath } from "../svgKit";
import { type LessonWidgetProps, useWidgetVariants } from "../widgetMechanics";
import { FillTable, type TableRow } from "./kinds/FillTable";

interface Board {
  rows: readonly TableRow[];
  options: readonly { id: string; latex: string; spoken: string }[];
  /** The equal-degree row the learner has to build the ratio for, for the conclusion. */
  ratio: string;
}

/**
 * Neither board's equal-degree row is the CFU's $y = 3$; on board 0 that value is a chip and
 * nothing more. The reversed ratio is always on offer, because reaching for
 * $\frac{\text{bottom}}{\text{top}}$ is the mistake this table exists to catch.
 */
const BOARDS: readonly Board[] = [
  {
    ratio: "\\tfrac{5}{2}",
    rows: [
      {
        id: "b0-lower",
        fixed: ["\\dfrac{4x + 6}{x^{2} + 2}", "1 < 2"],
        value: "y = 0",
        blank: false,
        spoken: "4x plus 6 over x squared plus 2, degree 1 under degree 2",
      },
      {
        id: "b0-equal-given",
        fixed: ["\\dfrac{6x + 4}{3x - 6}", "1 = 1"],
        value: "y = 2",
        blank: false,
        spoken: "6x plus 4 over 3x minus 6, degree 1 equal to degree 1",
      },
      {
        id: "b0-higher",
        fixed: ["\\dfrac{x^{2} + 2}{x + 1}", "2 > 1"],
        value: "\\text{none}",
        blank: true,
        spoken: "x squared plus 2 over x plus 1, degree 2 over degree 1",
        why: (
          <>
            With the larger degree on top, the numerator grows faster than the denominator
            can divide it down, so the outputs keep growing instead of levelling off. There
            is no value they approach, so this row has no horizontal asymptote at all.
          </>
        ),
      },
      {
        id: "b0-equal-blank",
        fixed: ["\\dfrac{5x^{2} - 1}{2x^{2} + x}", "2 = 2"],
        value: "y = \\tfrac{5}{2}",
        blank: true,
        spoken: "5x squared minus 1 over 2x squared plus x, degree 2 equal to degree 2",
        why: (
          <>
            Equal degrees, so the row follows the one already filled in above it: the level
            is the ratio of the LEADING coefficients, top over bottom. Here that is{" "}
            <InlineMath latex="\tfrac{5}{2}" />. Far out, the <InlineMath latex="-1" /> and
            the <InlineMath latex="x" /> are swamped by the squared terms, and{" "}
            <InlineMath latex="\tfrac{5x^{2}}{2x^{2}}" /> is what is left.
          </>
        ),
      },
      {
        id: "b0-lower-blank",
        fixed: ["\\dfrac{3x + 7}{x^{3} - 4}", "1 < 3"],
        value: "y = 0",
        blank: true,
        spoken: "3x plus 7 over x cubed minus 4, degree 1 under degree 3",
        why: (
          <>
            The denominator has the larger degree, so it outgrows the numerator and the
            fraction is divided down towards nothing. How far apart the degrees are does not
            change the answer: any smaller degree on top settles at{" "}
            <InlineMath latex="y = 0" />, exactly as the first row does.
          </>
        ),
      },
    ],
    options: [
      { id: "zero", latex: "y = 0", spoken: "y equals 0" },
      { id: "five-halves", latex: "y = \\tfrac{5}{2}", spoken: "y equals five halves" },
      { id: "none", latex: "\\text{none}", spoken: "no horizontal asymptote" },
      { id: "two-fifths", latex: "y = \\tfrac{2}{5}", spoken: "y equals two fifths" },
      { id: "five", latex: "y = 5", spoken: "y equals 5" },
      { id: "three", latex: "y = 3", spoken: "y equals 3" },
    ],
  },
  {
    ratio: "\\tfrac{3}{4}",
    rows: [
      {
        id: "b1-lower",
        fixed: ["\\dfrac{2x - 1}{x^{2} + 5}", "1 < 2"],
        value: "y = 0",
        blank: false,
        spoken: "2x minus 1 over x squared plus 5, degree 1 under degree 2",
      },
      {
        id: "b1-equal-given",
        fixed: ["\\dfrac{8x + 3}{2x - 7}", "1 = 1"],
        value: "y = 4",
        blank: false,
        spoken: "8x plus 3 over 2x minus 7, degree 1 equal to degree 1",
      },
      {
        id: "b1-equal-blank",
        fixed: ["\\dfrac{3x^{2} + x}{4x^{2} - 1}", "2 = 2"],
        value: "y = \\tfrac{3}{4}",
        blank: true,
        spoken: "3x squared plus x over 4x squared minus 1, degree 2 equal to degree 2",
        why: (
          <>
            Equal degrees, so the row follows the one already filled in above it: the level
            is the ratio of the LEADING coefficients, top over bottom, which here is{" "}
            <InlineMath latex="\tfrac{3}{4}" />. It does not reduce to a whole number the
            way <InlineMath latex="\tfrac{8}{2}" /> did, and it does not need to.
          </>
        ),
      },
      {
        id: "b1-higher",
        fixed: ["\\dfrac{x^{3} + x}{x^{2} - 9}", "3 > 2"],
        value: "\\text{none}",
        blank: true,
        spoken: "x cubed plus x over x squared minus 9, degree 3 over degree 2",
        why: (
          <>
            The larger degree is on top, so the numerator grows faster than the denominator
            can divide it down and the outputs never level off. No value is approached, so
            there is no horizontal asymptote.
          </>
        ),
      },
      {
        id: "b1-lower-blank",
        fixed: ["\\dfrac{5x + 2}{x^{2} - x}", "1 < 2"],
        value: "y = 0",
        blank: true,
        spoken: "5x plus 2 over x squared minus x, degree 1 under degree 2",
        why: (
          <>
            The denominator has the larger degree again, so it outgrows the numerator and
            the fraction is divided down towards nothing, exactly as the first row is. The
            leading coefficients play no part when the degrees differ.
          </>
        ),
      },
    ],
    options: [
      { id: "zero", latex: "y = 0", spoken: "y equals 0" },
      {
        id: "three-quarters",
        latex: "y = \\tfrac{3}{4}",
        spoken: "y equals three quarters",
      },
      { id: "none", latex: "\\text{none}", spoken: "no horizontal asymptote" },
      { id: "four-thirds", latex: "y = \\tfrac{4}{3}", spoken: "y equals four thirds" },
      { id: "three", latex: "y = 3", spoken: "y equals 3" },
      { id: "four", latex: "y = 4", spoken: "y equals 4" },
    ],
  },
];

export function RationalEndBehaviorTable(props: LessonWidgetProps) {
  const variant = useWidgetVariants(BOARDS.length, props);
  const board = BOARDS[variant.index] ?? (BOARDS[0] as Board);

  return (
    <FillTable
      key={variant.nonce}
      headings={["function", "top vs bottom degrees", "horizontal asymptote"]}
      rows={board.rows}
      options={board.options}
      objective="Goal: fill in the missing levels until the finished table shows which feature of a rational function decides where it settles far out along the x-axis."
      prompt="Fill in the level each function settles at far out along the x-axis, one row at a time."
      conclusion={
        <>
          Only the degrees decide which of the three rules applies. A smaller degree on top
          settles at <InlineMath latex="y = 0" />, equal degrees settle on the ratio of the
          leading coefficients such as <InlineMath latex={board.ratio} />, and a larger
          degree on top settles nowhere at all.
        </>
      }
      ariaLabel="A table of rational functions, the degrees of their numerator and denominator, and the horizontal asymptote each one approaches"
      onSolved={variant.latch}
      onRestart={variant.restart}
      restartLabel="Start over with a different table"
    />
  );
}
