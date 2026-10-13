/**
 * Worked-solution figure for the D1 NUM.F extra practice shape `(a/b + c/d) × e/f`.
 *
 * The item's whole content is ORDER: the parentheses hold an addition, so the common
 * denominator has to be found and the two fractions collapsed into one before the third
 * fraction multiplies anything. A learner who multiplies through the parentheses first is
 * not making an arithmetic slip, they are reading the grouping wrong, so the figure is a
 * column of rows carrying the tier chip that moved each one: two parenthesis rows, then
 * the multiplication. That is `ExpressionReductionWorked`'s exact job, and it already
 * measures a display fraction's height, so nothing here hand-rolls a layout.
 *
 * The reduce-the-sum row is CONDITIONAL. Most draws combine straight into lowest terms,
 * and a row printed unconditionally would claim a reduction that did not happen (and, on
 * those draws, print the same fraction twice). It appears only when reducing changes the
 * sum, which mirrors the item's own `worked_solution` step array.
 *
 * Everything is recomputed from `template_params` exactly the way `generate()` computes
 * it, gcd reductions included, with a default for every param; the figure is never handed
 * the answer.
 */

import { CIVIC } from "../svgKit";
import {
  CHIP,
  ExpressionReductionWorked,
  frac,
  fracSpoken,
  fracTex,
  type ReductionRow,
  reduce,
  reduceTail,
  type WorkedSolutionVisual,
} from "../workedKit";

/**
 * `(a/b + c/d) × e/f`: the sum rewritten over the common denominator, combined, reduced
 * when reducing changes it, and only then multiplied straight across.
 */
function addGroupThenMultiplyRows(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
): ReductionRow[] {
  const common = b * d;
  const leftNum = a * d;
  const rightNum = c * b;
  const rawSumN = leftNum + rightNum;
  const sum = reduce(rawSumN, common);
  const outside = frac(e, f);
  const rows: ReductionRow[] = [
    {
      chip: CHIP.paren,
      tokens: [{ text: `\\left(${frac(a, b)} + ${frac(c, d)}\\right) \\times ${outside}` }],
    },
    {
      chip: CHIP.paren,
      tokens: [
        {
          text: `\\left(${frac(leftNum, common)} + ${frac(rightNum, common)}\\right) \\times ${outside}`,
        },
      ],
    },
    {
      chip: CHIP.times,
      tokens: [{ text: `${frac(rawSumN, common)} \\times ${outside}` }],
    },
  ];
  if (sum.d !== common) {
    rows.push({
      chip: CHIP.times,
      tokens: [{ text: `${fracTex(rawSumN, common)} \\times ${outside}` }],
    });
  }
  rows.push({
    tokens: [
      {
        text: `${frac(`${sum.n} \\times ${e}`, `${sum.d} \\times ${f}`)} = ${reduceTail(sum.n * e, sum.d * f)}`,
        color: CIVIC,
      },
    ],
  });
  return rows;
}

export const NUMF_L3B_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d1.num-f.l3b": {
    Svg: ({ a = 1, b = 2, c = 1, d = 3, e = 1, f = 2 }) => {
      const sum = reduce(a * d + c * b, b * d);
      return (
        <ExpressionReductionWorked
          rows={addGroupThenMultiplyRows(a, b, c, d, e, f)}
          title="A grouped sum of fractions, then a multiplication"
          ariaLabel={`Add ${fracSpoken(a, b)} and ${fracSpoken(c, d)} over the common denominator ${b * d}, then multiply that sum by ${fracSpoken(e, f)} to get ${fracSpoken(sum.n * e, sum.d * f)}`}
        />
      );
    },
    caption: ({ a = 1, b = 2, c = 1, d = 3, e = 1, f = 2 }) => {
      const sum = reduce(a * d + c * b, b * d);
      return `The parentheses go first, so the two fractions are added over the common denominator $${b * d}$ while the outside factor waits. Multiplying that one fraction straight across then gives $${reduceTail(sum.n * e, sum.d * f, true)}$.`;
    },
  },
};
