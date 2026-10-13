/**
 * Worked-solution figures for the D8 EL.5 practice templates (the logarithm properties, run
 * forwards to expand and backwards to condense, plus change of base).
 *
 * Four of the five shapes are rule-by-rule reductions, and the thing a learner has to see in
 * each of them is WHICH RULE moved the line, so `ExpressionReductionWorked` carries them and
 * every middle row names its rule beside what the rule produced. The order is the content of
 * two of those four, so the quotient and power steps are separate rows even though a
 * confident reader would collapse them: a single row would hide the very sequencing the item
 * grades.
 *
 * Change of base gets the one figure that is not a column, because its work is not a chain of
 * rewrites but a single substitution into a fraction, and the two readings that go into that
 * fraction have to be visibly the numerator and the denominator rather than a pair of numbers
 * in a list. Reading the division upside down is the mistake, so the picture is the fraction.
 *
 * Every figure is driven only by its own template's `template_params`, with a default for
 * each one, and recomputes what `generate()` computed rather than being handed the answer.
 */

import { el5Symbol as symbolAt } from "@cr/item-bank";
import type { JSX } from "react";

import { CIVIC, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import {
  ExpressionReductionWorked,
  numStr,
  type ReductionRow,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";

/* -------------------------------------------------------------------------- */
/* Row builders for the four rule-by-rule shapes                               */
/* -------------------------------------------------------------------------- */

/** Expanding a plain product: one rule, named, and what it produces. */
function productRows(s1: string, s2: string): ReductionRow[] {
  return [
    { tokens: [{ text: `\\log(${s1}${s2})` }] },
    {
      tokens: [
        { text: `\\text{product rule:}\\; \\log(AB) = \\log A + \\log B`, color: SIGNAL },
      ],
    },
    { tokens: [{ text: `\\log(${s1}) + \\log(${s2})`, color: CIVIC }] },
  ];
}

/**
 * Expanding a product one of whose factors is a power. Two middle rows rather than one,
 * because the split is what CREATES the term the power rule then acts on.
 */
function powerRows(s1: string, s2: string, n: number): ReductionRow[] {
  return [
    { tokens: [{ text: `\\log(${s1}^{${n}}${s2})` }] },
    {
      tokens: [
        {
          text: `\\text{product rule}\\;\\Rightarrow\\; \\log(${s1}^{${n}}) + \\log(${s2})`,
          color: SIGNAL,
        },
      ],
    },
    {
      tokens: [
        {
          text: `\\text{power rule}\\;\\Rightarrow\\; ${n}\\log(${s1}) + \\log(${s2})`,
          color: CIVIC,
        },
      ],
    },
  ];
}

/** The product rule read backwards, over however many terms the draw dealt. */
function condenseRows(symbols: readonly string[]): ReductionRow[] {
  const sum = symbols.map((s) => `\\log(${s})`).join(" + ");
  const generic =
    symbols.length === 3
      ? `\\text{run backwards:}\\; \\log A + \\log B + \\log C = \\log(ABC)`
      : `\\text{run backwards:}\\; \\log A + \\log B = \\log(AB)`;
  return [
    { tokens: [{ text: sum }] },
    { tokens: [{ text: generic, color: SIGNAL }] },
    { tokens: [{ text: `\\log(${symbols.join("")})`, color: CIVIC }] },
  ];
}

/**
 * Expanding a quotient that holds a power. The quotient row comes first on both branches,
 * which is the whole point of the shape, and on the denominator branch the coefficient stays
 * behind the minus sign where the rule put it.
 */
function quotientRows(
  s1: string,
  s2: string,
  n: number,
  onDenominator: boolean,
): ReductionRow[] {
  const source = onDenominator
    ? `\\log \\dfrac{${s1}}{${s2}^{${n}}}`
    : `\\log \\dfrac{${s1}^{${n}}}{${s2}}`;
  const split = onDenominator
    ? `\\log(${s1}) - \\log(${s2}^{${n}})`
    : `\\log(${s1}^{${n}}) - \\log(${s2})`;
  const finished = onDenominator
    ? `\\log(${s1}) - ${n}\\log(${s2})`
    : `${n}\\log(${s1}) - \\log(${s2})`;
  return [
    { tokens: [{ text: source }] },
    {
      tokens: [{ text: `\\text{quotient rule}\\;\\Rightarrow\\; ${split}`, color: SIGNAL }],
    },
    {
      tokens: [{ text: `\\text{power rule}\\;\\Rightarrow\\; ${finished}`, color: CIVIC }],
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Change of base: the substitution, drawn as the fraction it makes            */
/* -------------------------------------------------------------------------- */

/**
 * The rule, the substitution into it, and the value it comes to.
 *
 * The two readings are drawn as a stacked fraction rather than listed, because the one thing
 * that goes wrong here is dividing them the other way round, and a list of two numbers gives
 * a learner nothing to check that against.
 */
function BaseSwapFraction({
  base,
  argument,
  logArgument,
  logBase,
  rounded,
}: {
  base: number;
  argument: number;
  logArgument: string;
  logBase: string;
  rounded: string;
}): JSX.Element {
  return (
    <svg
      viewBox="0 0 440 268"
      role="img"
      aria-label={`Log base ${spoken(base)} of ${spoken(argument)} rewritten as ${logArgument} divided by ${logBase}, which is about ${rounded}`}
    >
      <title>A logarithm moved onto a base a calculator carries</title>

      <SvgMath
        latex={`\\log_{${base}} ${argument} = \\;?`}
        x={220}
        y={26}
        fontSize={18}
        color={LABEL}
        w={430}
      />
      <line x1={30} y1={44} x2={410} y2={44} stroke={LINE} strokeWidth={1} />

      <SvgMath
        latex="\log_{b} N = \dfrac{\log N}{\log b}"
        x={220}
        y={84}
        fontSize={16}
        color={SIGNAL}
        w={430}
      />

      <text x={220} y={118} textAnchor="middle" fontSize={11} fill={SOFT}>
        the argument on top, the base underneath
      </text>

      <SvgMath
        latex={`\\log_{${base}} ${argument} = \\dfrac{\\log ${argument}}{\\log ${base}} = \\dfrac{${logArgument}}{${logBase}}`}
        x={220}
        y={168}
        fontSize={16}
        color={LABEL}
        w={430}
      />

      <line x1={30} y1={210} x2={410} y2={210} stroke={LINE} strokeWidth={1} />

      <SvgMath
        latex={`\\log_{${base}} ${argument} \\approx ${rounded}`}
        x={220}
        y={240}
        fontSize={18}
        color={CIVIC}
        w={430}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const EL5_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d8.el5.expand-product.l1": {
    Svg: ({ i = 0, j = 1 }) => (
      <ExpressionReductionWorked
        rows={productRows(symbolAt(i), symbolAt(j))}
        title="A logarithm of a product, split into a sum"
        ariaLabel={`Log of ${symbolAt(i)} times ${symbolAt(j)} becomes log ${symbolAt(i)} plus log ${symbolAt(j)}`}
      />
    ),
    caption: ({ i = 0, j = 1 }) =>
      `A logarithm is an exponent, and multiplying powers of one base adds their exponents, so a logarithm of a product is the sum of the two logarithms: $\\log(${symbolAt(i)}${symbolAt(j)}) = \\log(${symbolAt(i)}) + \\log(${symbolAt(j)})$.`,
  },

  "d8.el5.expand-power.l2": {
    Svg: ({ i = 0, j = 1, n = 2 }) => (
      <ExpressionReductionWorked
        rows={powerRows(symbolAt(i), symbolAt(j), n)}
        title="Split the product first, then bring the exponent down"
        ariaLabel={`Log of ${symbolAt(i)} to the ${spoken(n)} times ${symbolAt(j)} splits into two logarithms, and the exponent then comes out in front of the first one`}
      />
    ),
    caption: ({ i = 0, j = 1, n = 2 }) =>
      `The product rule splits the logarithm in two, and only then is there a $\\log(${symbolAt(i)}^{${n}})$ for the power rule to act on. Bringing that exponent out in front leaves $${n}\\log(${symbolAt(i)}) + \\log(${symbolAt(j)})$, with nothing left inside to expand.`,
  },

  "d8.el5.condense-sum.l2": {
    Svg: ({ kind = 0, i = 0, j = 1, k = 2 }) => {
      const symbols =
        kind === 1 ? [symbolAt(i), symbolAt(j), symbolAt(k)] : [symbolAt(i), symbolAt(j)];
      return (
        <ExpressionReductionWorked
          rows={condenseRows(symbols)}
          title="A sum of logarithms gathered into one"
          ariaLabel={`Adding the logarithms of ${symbols.join(", ")} gives one logarithm of their product`}
        />
      );
    },
    caption: ({ kind = 0, i = 0, j = 1, k = 2 }) => {
      const symbols =
        kind === 1 ? [symbolAt(i), symbolAt(j), symbolAt(k)] : [symbolAt(i), symbolAt(j)];
      // Both spellings, because they are not interchangeable to the grader. The typeset form
      // juxtaposes the symbols and is conventionally correct; the checker reads two adjacent
      // LETTERS as one symbol, so a learner who copied `log(xq)` off this figure graded
      // `invalid_input / unknown_symbol` and was scored UNANSWERED under §12.
      //
      // The code span is load-bearing and not decoration. A caption is rendered as MARKDOWN
      // (`LessonProse`), so a bare `log(m*a*q)` has its middle symbol read as emphasis and
      // reaches the learner as `log(maq)` — the very spelling this line exists to replace,
      // silently, while the source looks right. Backticks make the stars literal. Measured
      // by dropping them: the caption renders "typed log(maq)" on the three-term draw and
      // "typed log(x*y)" on the two-term one, because a lone star is not a pair, so the
      // shape that hides the defect is exactly the one a reader is least likely to open.
      //
      // The string is duplicated from the template's own last step rather than shared with
      // it: `el5CondensedTyped` is not on `@cr/item-bank`'s public surface, and the two are
      // held together by `d8EL5.test.tsx` instead, which grades the RENDERED caption against
      // every served item's real answer key.
      return `Every term is already a bare logarithm, so nothing has to move inside first. Adding logarithms multiplies their arguments, and the whole sum gathers into $\\log(${symbols.join("")})$, typed \`log(${symbols.join("*")})\`.`;
    },
  },

  "d8.el5.expand-quotient.l3": {
    Svg: ({ kind = 0, i = 0, j = 1, n = 2 }) => (
      <ExpressionReductionWorked
        rows={quotientRows(symbolAt(i), symbolAt(j), n, kind === 1)}
        title="The outermost operation comes apart first"
        ariaLabel={
          kind === 1
            ? `The quotient splits into log ${symbolAt(i)} minus log of ${symbolAt(j)} to the ${spoken(n)}, and the exponent then comes down in front of the subtracted term`
            : `The quotient splits into log of ${symbolAt(i)} to the ${spoken(n)} minus log ${symbolAt(j)}, and the exponent then comes down in front of the first term`
        }
      />
    ),
    caption: ({ kind = 0, i = 0, j = 1, n = 2 }) =>
      kind === 1
        ? `The division is the outermost operation, so the quotient rule goes first and the whole of $\\log(${symbolAt(j)}^{${n}})$ is what comes off. The exponent then belongs to the SUBTRACTED term alone, which is why the answer is $\\log(${symbolAt(i)}) - ${n}\\log(${symbolAt(j)})$ and not $${n}$ times the whole difference.`
        : `The division is the outermost operation, so the quotient rule goes first, and only that split produces a $\\log(${symbolAt(i)}^{${n}})$ for the power rule to act on. Bringing the exponent down then leaves $${n}\\log(${symbolAt(i)}) - \\log(${symbolAt(j)})$.`,
  },

  "d8.el5.change-base-value.l3": {
    Svg: ({ b = 5, n = 20 }) => (
      <BaseSwapFraction
        base={b}
        argument={n}
        logArgument={Math.log10(n).toFixed(6)}
        logBase={Math.log10(b).toFixed(6)}
        rounded={(Math.log(n) / Math.log(b)).toFixed(3)}
      />
    ),
    caption: ({ b = 5, n = 20 }) =>
      `A calculator has no base $${numStr(b)}$ key, so change of base moves the question onto one it does have: the argument goes on top and the base underneath. Dividing the two readings gives $${(Math.log(n) / Math.log(b)).toFixed(3)}$ to three decimal places.`,
  },
};
