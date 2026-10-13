/**
 * Worked-solution figure for the D1 NUM.4 practice shape that lives outside
 * `workedSolutionVisuals.tsx`.
 *
 * `d1.num-4.l3b` is the member of the L3 cell that puts a squared pile beside a linear
 * pile, so the thing it grades is the SORT rather than the arithmetic: its cell-mate
 * `d1.num-4.l3` makes every variable term a like term, and a learner who sweeps all of
 * them into one pile still lands on that key. Here sweeping is the mistake, so the figure
 * has to make the two piles visible before it collapses either of them.
 *
 * `ExpressionReductionWorked` carries it, and the column earns a row that a three-row
 * version would skip: the terms are re-grouped into a parenthesized pile per variable part
 * BEFORE any coefficient is added. Jumping from the distributed line to the result would
 * show which terms combined only by showing what they combined INTO, which is the reading
 * a learner who merged the wrong pair has no way to check. The squared terms are tinted
 * one colour and the linear terms another and the tints hold across all four rows, so each
 * pile can be followed down the column rather than re-read at every line.
 *
 * The template's `kind` decides WHICH pile cancels (`0` keeps the squared pile, `1` keeps
 * the linear one), so the figure branches on it too, and the surviving pile carries its
 * own tint into the result row. That tint is the whole point of drawing both branches
 * rather than one: a figure that always ended green would teach the pattern the varying
 * branch exists to break.
 *
 * Driven only by that template's own `template_params`, with a default for each one, and
 * recomputing the collected coefficient and the distributed constant the way `generate()`
 * does (`varIndex` resolved back to its letter, `kind` choosing the surviving pile, `order`
 * deciding where the parenthesized group sits) rather than being handed the answer.
 */

import { expressionVariable } from "@cr/item-bank";

import { CIVIC, SIGNAL } from "../svgKit";
import {
  ExpressionReductionWorked,
  MINUS_INK,
  PLUS_INK,
  type ReductionRow,
  spoken,
  vt,
  type WorkedSolutionVisual,
} from "../workedKit";

/** Everything both branches need, recomputed from the params the template recorded. */
function readParams(
  kind: number,
  a: number,
  b: number,
  p: number,
  m: number,
  k: number,
  v: string,
) {
  const squaredSurvives = kind !== 1;
  const squaredFirst = `${vt(a, v)}^{2}`;
  return {
    squaredSurvives,
    group: `${m}(${v} + ${k})`,
    constant: `${m * k}`,
    fromGroup: vt(m, v),
    squaredFirst,
    squaredSecond: squaredSurvives ? `${vt(b, v)}^{2}` : squaredFirst,
    standalone: squaredSurvives ? vt(m, v) : vt(p, v),
    collected: squaredSurvives ? a + b : m + p,
  };
}

/**
 * The source, the parentheses cleared, the terms gathered into one pile per variable part,
 * and the result. The squared pile is `CIVIC` throughout and the linear pile `SIGNAL`, so
 * the grouping row is a re-reading of the row above it rather than a new set of terms.
 */
function sortByVariablePartRows(
  kind: number,
  a: number,
  b: number,
  p: number,
  m: number,
  k: number,
  v: string,
  order: number,
): ReductionRow[] {
  const {
    squaredSurvives,
    group,
    constant,
    fromGroup,
    squaredFirst,
    squaredSecond,
    standalone,
    collected,
  } = readParams(kind, a, b, p, m, k, v);
  // The subtracted pile is the one that cancels, on either branch.
  const squaredJoin = squaredSurvives ? PLUS_INK : MINUS_INK;
  const standaloneJoin = squaredSurvives ? MINUS_INK : PLUS_INK;
  const squaredSign = squaredSurvives ? "+" : "-";
  const standaloneSign = squaredSurvives ? "-" : "+";

  const source: ReductionRow = {
    tokens:
      order === 1
        ? [
            { text: group },
            PLUS_INK,
            { text: squaredFirst, color: CIVIC },
            standaloneJoin,
            { text: standalone, color: SIGNAL },
            squaredJoin,
            { text: squaredSecond, color: CIVIC },
          ]
        : [
            { text: squaredFirst, color: CIVIC },
            PLUS_INK,
            { text: group },
            standaloneJoin,
            { text: standalone, color: SIGNAL },
            squaredJoin,
            { text: squaredSecond, color: CIVIC },
          ],
  };

  const distributed: ReductionRow = {
    tokens:
      order === 1
        ? [
            { text: fromGroup, color: SIGNAL },
            PLUS_INK,
            { text: constant },
            PLUS_INK,
            { text: squaredFirst, color: CIVIC },
            standaloneJoin,
            { text: standalone, color: SIGNAL },
            squaredJoin,
            { text: squaredSecond, color: CIVIC },
          ]
        : [
            { text: squaredFirst, color: CIVIC },
            PLUS_INK,
            { text: fromGroup, color: SIGNAL },
            PLUS_INK,
            { text: constant },
            standaloneJoin,
            { text: standalone, color: SIGNAL },
            squaredJoin,
            { text: squaredSecond, color: CIVIC },
          ],
  };

  return [
    source,
    distributed,
    {
      tokens: [
        { text: `(${squaredFirst} ${squaredSign} ${squaredSecond})`, color: CIVIC },
        PLUS_INK,
        { text: `(${fromGroup} ${standaloneSign} ${standalone})`, color: SIGNAL },
        PLUS_INK,
        { text: constant },
      ],
    },
    {
      tokens: [
        squaredSurvives
          ? { text: `${vt(collected, v)}^{2}`, color: CIVIC }
          : { text: vt(collected, v), color: SIGNAL },
        PLUS_INK,
        { text: constant },
      ],
    },
  ];
}

export const NUM4_L3B_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d1.num-4.l3b": {
    Svg: ({ kind = 0, a = 1, b = 1, p = 0, m = 2, k = 2, varIndex = 0, order = 0 }) => {
      const v = expressionVariable(varIndex);
      const { squaredSurvives, collected } = readParams(kind, a, b, p, m, k, v);
      return (
        <ExpressionReductionWorked
          rows={sortByVariablePartRows(kind, a, b, p, m, k, v, order)}
          title="Two piles of like terms, sorted by variable part"
          ariaLabel={
            squaredSurvives
              ? `Clearing the parentheses leaves two ${v} squared terms and two ${v} terms. The squared coefficients ${spoken(a)} and ${spoken(b)} add to ${spoken(collected)}, the ${v} terms add to zero, and the distributed constant ${spoken(m * k)} stays on its own`
              : `Clearing the parentheses leaves two ${v} squared terms and two ${v} terms. The ${v} coefficients ${spoken(m)} and ${spoken(p)} add to ${spoken(collected)}, the ${v} squared terms add to zero, and the distributed constant ${spoken(m * k)} stays on its own`
          }
        />
      );
    },
    caption: ({ kind = 0, a = 1, b = 1, p = 0, m = 2, k = 2, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      const { squaredSurvives, collected } = readParams(kind, a, b, p, m, k, v);
      const opening = `Sorting is what decides this one. Once the parentheses are cleared there are two piles: the terms carrying $${v}^{2}$ and the terms carrying $${v}$. A coefficient may only be added to another coefficient **in its own pile**, and which pile is left standing is not the same from one problem to the next, so the piles have to be read rather than guessed.`;
      return squaredSurvives
        ? `${opening} Here the $${v}$-terms settle against each other and leave nothing behind, and the $${v}^{2}$-terms collect into $${vt(collected, v)}^{2}$ beside the constant $${m * k}$.`
        : `${opening} Here the $${v}^{2}$-terms settle against each other and leave nothing behind, and the $${v}$-terms collect into $${vt(collected, v)}$ beside the constant $${m * k}$.`;
    },
  },
};
