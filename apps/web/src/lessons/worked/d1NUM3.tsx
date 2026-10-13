/**
 * Worked-solution figures for the D1 NUM.3 practice shapes that live outside
 * `workedSolutionVisuals.tsx`.
 *
 * `d1.num-3.l3b` is the sign-carrying member of the L3 cell: the factor in front of the
 * first pair of parentheses is an OPPOSITE, and that pair holds a difference, so two of
 * the four products come out with a sign the learner did not write down. Its cell-mate
 * `d1.num-3.l3` distributes two positive factors over two sums, where every product is
 * positive and nothing has to be tracked; the whole difficulty here is the tracking.
 *
 * So the figure is a reduction column (`ExpressionReductionWorked`), and it spends a
 * whole row on the four products BEFORE any of them is evaluated. That row is the one a
 * learner who lost a sign needs: `(-a)(-b)` written out is the answer to "why did the
 * subtracted number come back positive", and a column that jumped straight from the
 * source line to `-av + ab + cv + cd` would show the result of that decision without
 * ever showing the decision. The two products carrying the negative factor are tinted so
 * the eye lands on them rather than on the pair that behaves ordinarily.
 *
 * Driven only by `d1.num-3.l3b`'s own `template_params`, with a default for each one, and
 * recomputing the coefficient and the constant the way `generate()` does (including
 * resolving `varIndex` back to its letter) rather than being handed the answer.
 */

import { expressionVariable } from "@cr/item-bank";

import { CIVIC, SIGNAL } from "../svgKit";
import {
  ExpressionReductionWorked,
  PLUS_INK,
  type ReductionRow,
  spoken,
  vt,
  type WorkedSolutionVisual,
} from "../workedKit";

/**
 * `-a(v - b) + c(v + d)`: the source, the four products it stands for, those products
 * evaluated, and the collected result.
 */
function oppositeFactorRows(
  a: number,
  b: number,
  c: number,
  d: number,
  v: string,
): ReductionRow[] {
  return [
    { tokens: [{ text: `-${a}(${v} - ${b}) + ${c}(${v} + ${d})` }] },
    {
      tokens: [
        { text: `(-${a})(${v})`, color: SIGNAL },
        PLUS_INK,
        { text: `(-${a})(-${b})`, color: SIGNAL },
        PLUS_INK,
        { text: `${c}(${v})` },
        PLUS_INK,
        { text: `${c}(${d})` },
      ],
    },
    {
      tokens: [
        { text: vt(-a, v), color: CIVIC },
        PLUS_INK,
        { text: `${a * b}` },
        PLUS_INK,
        { text: vt(c, v), color: CIVIC },
        PLUS_INK,
        { text: `${c * d}` },
      ],
    },
    {
      tokens: [
        { text: vt(c - a, v), color: CIVIC },
        PLUS_INK,
        { text: `${a * b + c * d}` },
      ],
    },
  ];
}

export const NUM3_L3B_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d1.num-3.l3b": {
    Svg: ({ a = 2, b = 2, c = 4, d = 2, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return (
        <ExpressionReductionWorked
          rows={oppositeFactorRows(a, b, c, d, v)}
          title="A negative factor handed to both terms inside a difference"
          ariaLabel={`Negative ${spoken(a)} times ${v} is ${spoken(-a)}${v}, and negative ${spoken(a)} times negative ${spoken(b)} is ${spoken(a * b)}. Distributing the second pair and collecting leaves ${vt(c - a, v)} plus ${spoken(a * b + c * d)}`}
        />
      );
    },
    caption: ({ a = 2, b = 2, c = 4, d = 2, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return `The factor outside the first pair is $(-${a})$, and it reaches **both** terms inside: the $${v}$-term comes out negative, while the subtracted $${b}$ meets a second negative and comes out positive. Distributing the second pair and adding the plain numbers leaves $${vt(c - a, v)} + ${a * b + c * d}$.`;
    },
  },
};
