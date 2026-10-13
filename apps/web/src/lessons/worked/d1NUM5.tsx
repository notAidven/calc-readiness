/**
 * Worked-solution figure for the D1 NUM.5 extra practice shape `d1.num-5.l3b` (a length
 * paced out in one unit, counted in a piece measured in another, two conversion factors
 * apart).
 *
 * The cell's other shape is the unit rate, whose figure divides to one and scales up. This
 * one is not a rate at all, and what a learner has to see is not an arithmetic order but a
 * BOOKKEEPING one: each factor is written the way round it is so that the unit it is there
 * to shed stands once above a bar and once below, and the answer's unit is the one nothing
 * cancelled. Writing a factor upside down is the whole mistake, and it is invisible in the
 * numbers, which is why the units are carried in the math rather than in a caption.
 *
 * So the chain is drawn twice: once as it is written, and once with the repeated units
 * struck out, which is the only step between them. The value comes last, over what is left
 * after the cancelling, so the surviving numerator and denominator are visibly the ones the
 * struck units did not take with them.
 *
 * Driven only by `template_params`, with a default for every one, and it recomputes the
 * span total and the count the same way `generate()` does rather than being handed the
 * answer.
 */

import { num5ConversionPiece } from "@cr/item-bank";

import { CIVIC, SIGNAL } from "../svgKit";
import {
  ExpressionReductionWorked,
  type ReductionRow,
  type WorkedSolutionVisual,
} from "../workedKit";

/**
 * Resolve a piece index to the SHORT unit words a diagram column labels a factor with.
 *
 * `template_params` carries only numbers, so the scenario reaches the figure as a
 * `pieceIndex` and has to be resolved back. It resolves against the item bank's own
 * `NUM5_CONVERSION_PIECES`, not a copy of it: a local table mirroring that list index for
 * index would read identically on the day it was written and silently disagree the first
 * time somebody reordered or inserted a scenario. The prompt says "coil of cord" where a
 * column says "coil", so this reads the `unit` / `units` fields rather than the prose names.
 */
function conversionUnit(pieceIndex: number): { unit: string; units: string } {
  const { unit, units } = num5ConversionPiece(pieceIndex);
  return { unit, units };
}

/** The chain as written: the paced length, then a factor for each unit being shed. */
function chainLatex(n: number, k: number, j: number, unit: string): string {
  return `${n}\\ \\text{paces} \\times \\dfrac{${k}\\ \\text{spans}}{1\\ \\text{pace}} \\times \\dfrac{1\\ \\text{${unit}}}{${j}\\ \\text{spans}}`;
}

/** The same chain with every unit that stands both above and below a bar struck out. */
function cancelledChainLatex(n: number, k: number, j: number, unit: string): string {
  return `${n}\\ \\cancel{\\text{paces}} \\times \\dfrac{${k}\\ \\cancel{\\text{spans}}}{1\\ \\cancel{\\text{pace}}} \\times \\dfrac{1\\ \\text{${unit}}}{${j}\\ \\cancel{\\text{spans}}}`;
}

/**
 * Four rows: the chain, the rule, the chain with its repeated units gone, and the value
 * over what survived. The middle row names the move rather than performing it, so the two
 * chain rows differ by exactly the thing being taught.
 */
function unitCancelRows(
  n: number,
  k: number,
  j: number,
  unit: string,
  units: string,
): ReductionRow[] {
  return [
    { tokens: [{ text: chainLatex(n, k, j, unit) }] },
    {
      tokens: [{ text: "\\text{a unit above and below cancels}", color: SIGNAL }],
    },
    { tokens: [{ text: cancelledChainLatex(n, k, j, unit) }] },
    {
      tokens: [
        {
          text: `\\dfrac{${n} \\times ${k}}{${j}} = ${(n * k) / j}\\ \\text{${units}}`,
          color: CIVIC,
        },
      ],
    },
  ];
}

export const NUM5_L3B_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d1.num-5.l3b": {
    Svg: ({ n = 18, k = 4, j = 12, pieceIndex = 0 }) => {
      const { unit, units } = conversionUnit(pieceIndex);
      return (
        <ExpressionReductionWorked
          rows={unitCancelRows(n, k, j, unit, units)}
          title="Each factor is written the way round that sheds a unit"
          ariaLabel={`${n} paces, times ${k} spans for every pace, times one ${unit} for every ${j} spans; the paces and the spans cancel and ${(n * k) / j} ${units} are left`}
        />
      );
    },
    caption: ({ n = 18, k = 4, j = 12, pieceIndex = 0 }) => {
      const { units } = conversionUnit(pieceIndex);
      return `Each factor goes in with the unit you want on top and the unit you are shedding underneath, so the paces cancel first and then the spans do, leaving ${units} and nothing else: $${n} \\times ${k} = ${n * k}$ spans, and $${n * k} \\div ${j} = ${(n * k) / j}$ ${units}. Turn either factor over and the units stop cancelling, which is the warning a bare division never gives you.`;
    },
  },
};
