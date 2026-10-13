/**
 * Worked-solution figures for the D4 and D5 CHECKS, whose questions no practice template asks.
 *
 * Five of the six are COMPOSITE: one field holding an expression and the values its original
 * denominator forbade, or a hole and two asymptotes. That is not a quirk of how the checks were
 * written, it is why they exist -- `cfuVariants.ts` on RAT.5: *"a cancelled factor and a
 * surviving one look identical in the unfactored expression, so reporting both is what shows the
 * difference was seen."* A figure that closed on the reduced expression alone would therefore be
 * answering a fraction of the question while looking finished, so each of these ends by naming
 * every part, and `excludedRow` is the closing row exactly as it is for the 24 pooled D5 figures.
 *
 * D4's is a reduction column rather than the era's area rectangle. The rectangle is right when
 * the answer is a pair of sides, and this check's answer is not: one of its two brackets is a
 * DIFFERENCE, so a grid would have to print an edge of length `-7` and call it a length. The
 * check is also two moves rather than one (measure out the common factor, then factor what is
 * left), and rows are what show a second move happening to the result of the first.
 *
 * Each figure is built from its own generator's `worked_solution` steps, recomputes what it
 * prints rather than being handed an answer, and defaults every parameter.
 */

import { BRICK, CIVIC, SIGNAL } from "../svgKit";
import {
  DIV_INK,
  ExpressionReductionWorked,
  frac,
  MINUS_INK,
  type ReductionRow,
  spoken,
  TIMES_INK,
  type WorkedSolutionVisual,
} from "../workedKit";
import {
  complexFrac,
  excludedRow,
  linTex,
  monicQuadTex,
  NESTED_ROW_H,
  ratTail,
  scaledQuadTex,
} from "./d5Kit";

/**
 * A linear factor, or a bare `x` when the constant is zero.
 *
 * `linTex(0)` is `x + 0`, which is true and reads as a mistake. Only RAT.5 can draw it, since
 * only its `other` ranges over a window containing zero.
 */
function factorTex(c: number): string {
  return c === 0 ? "x" : linTex(c);
}

/** `3 + 4`, or a bare `3` when there is nothing to add, for a substituted input. */
function sumTex(value: number, addend: number): string {
  return addend === 0 ? `${value}` : `${value} ${ratTail(addend)}`;
}

/* --------------------------------------------------- POL.2: measure out first, then factor */

/**
 * `k x^2 + k(plus - minus) x - k*plus*minus` factored completely.
 *
 * The middle row is the one that makes this a two-move question: the common measure is out
 * front and what remains INSIDE the bracket is a fresh trinomial with smaller numbers, which is
 * the reason for taking it out first rather than a tidiness convention. A learner who hunts for
 * the pair before measuring is searching over `k`-sized products and usually finds nothing.
 */
function measureThenFactorRows(k: number, plus: number, minus: number): ReductionRow[] {
  const middle = plus - minus;
  const product = -plus * minus;
  return [
    { tokens: [{ text: scaledQuadTex(k, middle, product) }] },
    { tokens: [{ text: `${k}(${monicQuadTex(middle, product)})`, color: SIGNAL }] },
    { tokens: [{ text: `${k}(x + ${plus})(x - ${minus})`, color: CIVIC }] },
  ];
}

/* ------------------------------------------- RAT.1: the restriction outlives its factor */

/**
 * A difference of squares over a trinomial sharing one factor, reduced.
 *
 * The closing row is the whole check. `x = a` is forbidden by a factor that is no longer on the
 * page: it cancelled, and nothing in `(x + a)/(x + b)` records that it was ever there. So the
 * exclusions are read off the ORIGINAL bottom, in the row above, while both factors still are.
 */
function reduceExclusionRows(a: number, b: number): ReductionRow[] {
  return [
    { tokens: [{ text: frac(`x^{2} - ${a * a}`, monicQuadTex(b - a, -a * b)) }] },
    {
      tokens: [
        { text: frac(`(x - ${a})(x + ${a})`, `(x - ${a})(x + ${b})`), color: SIGNAL },
      ],
    },
    { tokens: [{ text: frac(`x + ${a}`, `x + ${b}`), color: CIVIC }] },
    excludedRow(a, -b),
  ];
}

/* ------------------------------------- RAT.2: the flip creates a third forbidden value */

/**
 * Divide, then count what the FLIP forbade.
 *
 * Three exclusions, and the third is the point: the divisor's numerator was never underneath
 * anything in the question as written, and it becomes a denominator the moment the fraction is
 * inverted. Row two is where that happens, which is why the flip is its own row and the
 * factoring joins it -- nothing may be cancelled across a division sign, so the row before it
 * has no cancelling to show.
 */
function divideExclusionRows(a: number, b: number, c: number): ReductionRow[] {
  const sorted = [-b, -c, a].sort((left, right) => left - right);
  return [
    {
      tokens: [
        { text: frac(`x^{2} - ${a * a}`, monicQuadTex(b + c, b * c)) },
        DIV_INK,
        { text: frac(`x - ${a}`, `x + ${b}`) },
      ],
    },
    {
      tokens: [
        { text: frac(`(x - ${a})(x + ${a})`, `(x + ${b})(x + ${c})`) },
        TIMES_INK,
        { text: frac(`x + ${b}`, `x - ${a}`), color: SIGNAL },
      ],
    },
    { tokens: [{ text: frac(`x + ${a}`, `x + ${c}`), color: CIVIC }] },
    excludedRow(...sorted),
  ];
}

/* ------------------------------------------ RAT.3: the minus is in front of a bracket */

/**
 * Subtract over the product of two coprime denominators.
 *
 * Rows two and three are deliberately both here. Two puts the second numerator inside a bracket
 * with the minus outside it, three distributes that minus; the mistake this check exists for is
 * subtracting only the first term inside, and a figure that jumped from two to four would have
 * shown the correct result without ever showing the step where it is won or lost.
 */
function subtractLcdRows(
  p: number,
  q: number,
  r: number,
  s: number,
  constant: number,
): ReductionRow[] {
  const common = `(x - ${r})(x + ${s})`;
  return [
    {
      tokens: [{ text: frac(p, `x - ${r}`) }, MINUS_INK, { text: frac(q, `x + ${s}`) }],
    },
    {
      tokens: [{ text: frac(`${p}(x + ${s}) - ${q}(x - ${r})`, common) }],
    },
    {
      tokens: [
        { text: frac(`${p}x + ${p * s} - ${q}x + ${q * r}`, common), color: SIGNAL },
      ],
    },
    { tokens: [{ text: frac(`x + ${constant}`, common), color: CIVIC }] },
    excludedRow(-s, r),
  ];
}

/* ------------------------------------ RAT.4: the exclusion the inner denominator made */

/**
 * Clear a complex fraction, and keep the zero the buried `1/x` forbade.
 *
 * `x = 0` is barred by a denominator inside the numerator, so it survives into the answer's
 * restrictions without ever having been a factor the learner wrote down. Reading the exclusions
 * off row one, before the clearing, is the only place both of them are visible.
 */
function complexClearRows(d: number, n: number): ReductionRow[] {
  return [
    {
      ink: NESTED_ROW_H,
      tokens: [
        {
          text: complexFrac(
            `${frac(1, "x", true)} + ${frac(1, d, true)}`,
            frac(`x + ${d}`, n, true),
          ),
          color: CIVIC,
        },
      ],
    },
    {
      tokens: [
        { text: frac(`${d} + x`, `${d}x`) },
        TIMES_INK,
        { text: frac(n, `x + ${d}`), color: SIGNAL },
      ],
    },
    { tokens: [{ text: frac(n, `${d}x`), color: CIVIC }] },
    excludedRow(-d, 0),
  ];
}

/* --------------------------- RAT.5: a hole, a vertical asymptote and a horizontal one */

/**
 * All three features of one rational function, from one factoring.
 *
 * The closing row prints the three answers side by side in the three colours the rows above
 * used for them, because they are one typed answer and the check is whether all three were
 * found. The substitution row before it is what makes the hole a POINT rather than an input: the
 * height comes from the reduced function, which is the only expression that has a value there.
 */
function holeAsymptoteRows(
  lead: number,
  hole: number,
  other: number,
  vertical: number,
  height: number,
): ReductionRow[] {
  const b = lead * (other - hole);
  const c = lead * -hole * other;
  const top = `${lead}x^{2} ${b < 0 ? "-" : "+"} ${Math.abs(b)}x ${c < 0 ? "-" : "+"} ${Math.abs(c)}`;
  const reduced = frac(`${lead}(${factorTex(other)})`, factorTex(-vertical));
  return [
    { tokens: [{ text: frac(top, monicQuadTex(-(hole + vertical), hole * vertical)) }] },
    {
      tokens: [
        {
          text: frac(
            `${lead}(x - ${hole})(${factorTex(other)})`,
            `(x - ${hole})(${factorTex(-vertical)})`,
          ),
          color: SIGNAL,
        },
      ],
    },
    { tokens: [{ text: reduced }] },
    {
      tokens: [
        {
          text: `${frac(`${lead}(${sumTex(hole, other)})`, sumTex(hole, -vertical))} = ${height}`,
          color: CIVIC,
        },
      ],
    },
    {
      tokens: [
        { text: `(${hole}, ${height})`, color: CIVIC },
        { text: ";" },
        { text: `x = ${vertical}`, color: BRICK },
        { text: ";" },
        { text: `y = ${lead}`, color: SIGNAL },
      ],
    },
  ];
}

export const CFU_D4_D5_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "cfu.pol2.measure-then-factor": {
    Svg: ({ k = 3, plus = 4, minus = 7 }) => (
      <ExpressionReductionWorked
        rows={measureThenFactorRows(k, plus, minus)}
        title="The common measure comes out before the pair is hunted for"
        ariaLabel={`Taking ${k} out leaves a trinomial whose two numbers are ${plus} and negative ${minus}, so the complete factoring is ${k} times x plus ${plus} times x minus ${minus}`}
      />
    ),
    caption: ({ k = 3, plus = 4, minus = 7 }) =>
      // The half-factored form is built by `monicQuadTex`, the same builder the figure's own
      // middle row uses, so the caption cannot quote a form the row above it does not show.
      // Spelled out by hand this printed `2(x^{2} + 1x - 12)` against a row reading
      // `2(x^{2} + x - 12)`, which asks the learner to decide which of the two is the tree's.
      `Taking $${k}$ out first is what makes the search possible: inside the bracket the two numbers have to multiply to $${-plus * minus}$ and add to $${plus - minus}$, and a negative product means they carry opposite signs. Stopping at $${k}(${monicQuadTex(plus - minus, -plus * minus)})$ would leave it factored, but not completely.`,
  },

  "cfu.rat1.reduce-exclusions": {
    Svg: ({ a = 5, b = 3 }) => (
      <ExpressionReductionWorked
        rows={reduceExclusionRows(a, b)}
        title="A cancelled factor keeps its restriction"
        ariaLabel={`Both parts factor and x minus ${a} cancels, leaving x plus ${a} over x plus ${b}, with x not equal to ${a} or ${spoken(-b)}`}
      />
    ),
    caption: ({ a = 5, b = 3 }) =>
      `The shared $(x - ${a})$ divides out, which is why the answer is $${frac(`x + ${a}`, `x + ${b}`, true)}$ -- and why $x \\neq ${a}$ has to be carried forward by hand. Nothing in the reduced fraction records that the factor was ever there, so the exclusions are read off the ORIGINAL bottom while both of its factors still are.`,
  },

  "cfu.rat2.divide-exclusions": {
    Svg: ({ a = 5, b = 3, c = 7 }) => (
      <ExpressionReductionWorked
        rows={divideExclusionRows(a, b, c)}
        title="Flipping the divisor creates a third restriction"
        ariaLabel={`Flip the divisor and factor, cancel x minus ${a} and x plus ${b}, leaving x plus ${a} over x plus ${c}, with x not equal to ${spoken(-b)}, ${spoken(-c)} or ${a}`}
      />
    ),
    caption: ({ a = 5, b = 3, c = 7 }) =>
      `Dividing is multiplying by the reciprocal, and inverting the divisor is what puts $(x - ${a})$ underneath a bar for the first time: $x \\neq ${a}$ is forbidden by the flip, not by anything visible in the question as written. The other two, $x \\neq ${-b}$ and $x \\neq ${-c}$, come from the first denominator.`,
  },

  "cfu.rat3.subtract-lcd": {
    Svg: ({ p = 5, q = 4, r = 4, s = 3, constant = 31 }) => (
      <ExpressionReductionWorked
        rows={subtractLcdRows(p, q, r, s, constant)}
        title="The minus is in front of a bracket, so it reaches both terms"
        ariaLabel={`Over the common denominator the top becomes ${p} x plus ${p * s} minus ${q} x plus ${q * r}, which collects to x plus ${constant}, with x not equal to ${spoken(-s)} or ${r}`}
      />
    ),
    caption: ({ p = 5, q = 4, r = 4, s = 3, constant = 31 }) =>
      `The two bottoms share no factor, so the common denominator is simply their product. The step that decides this one is the minus: it stands in front of the whole of $${q}(x - ${r})$, so it reaches the $-${q * r}$ inside as well, and $+${q * r}$ is what lands on the top. Subtracting only the first term would give $x ${ratTail(p * s - q * r)}$ instead of $x + ${constant}$.`,
  },

  "cfu.rat4.complex-clear": {
    Svg: ({ d = 4, n = 3 }) => (
      <ExpressionReductionWorked
        rows={complexClearRows(d, n)}
        title="An inner denominator forbids a value the answer never shows"
        ariaLabel={`The top becomes ${d} plus x over ${d} x, the main bar flips the divisor, and cancelling x plus ${d} leaves ${n} over ${d} x, with x not equal to ${spoken(-d)} or 0`}
      />
    ),
    caption: ({ d = 4, n = 3 }) =>
      `The main bar is a division, so the top is made into one fraction and the bottom is flipped. Both restrictions are read off the original: $x \\neq 0$ comes from the $${frac(1, "x", true)}$ buried in the numerator, and $x \\neq ${-d}$ from the value that would empty the divisor. Neither is visible in $${frac(n, `${d}x`, true)}$, which is exactly why they have to be collected first.`,
  },

  "cfu.rat5.hole-asymptotes": {
    // The defaults are a DRAWABLE set, not four plausible numbers: `height` has to come out
    // whole and the three roots have to be distinct, so an arbitrary quadruple usually names a
    // function this check would never serve.
    Svg: ({ lead = 2, hole = 3, other = 3, vertical = 1, height = 6 }) => (
      <ExpressionReductionWorked
        rows={holeAsymptoteRows(lead, hole, other, vertical, height)}
        title="One factoring, three features"
        ariaLabel={`x minus ${hole} cancels, so there is a hole at ${hole}, ${spoken(height)}; the surviving factor gives a vertical asymptote at x equals ${spoken(vertical)}; and matching degrees give a horizontal asymptote at y equals ${lead}`}
      />
    ),
    caption: ({ lead = 2, hole = 3, other = 3, vertical = 1, height = 6 }) =>
      `All three come out of the same factoring, and telling them apart is the question: $(x - ${hole})$ **cancels**, so it punctures the graph at $x = ${hole}$ rather than sending it to infinity, and the puncture's height is the REDUCED function's value there, $${height}$. $(${factorTex(-vertical)})$ survives underneath, so that one is a genuine vertical asymptote at $x = ${vertical}$. The degrees match, so the graph levels off at the ratio of the leading coefficients, $y = ${lead}$.`,
  },
};
