/**
 * Worked-solution figure for the D1 NUM.2 extra practice shape `d1.num-2.l2b` (a
 * divide-then-multiply chain wrapped by one additive term).
 *
 * The cell's other shape is answered by "multiply before you add", and a figure that
 * showed one multiply-divide row would say exactly that again. What decides the value
 * here is that the tier holds TWO operations and they are taken in the order written, so
 * the reduction spends two consecutive rows inside that tier, each with its own chip, and
 * both chips are the multiply-divide colour. Two rows the same colour is the claim: they
 * are not two tiers, they are one tier taken twice, left to right.
 *
 * The additive term is carried down untouched through both of those rows rather than
 * being folded away early, because the mistake worth showing is reaching for it (or for
 * the multiplication) before the chain is a single number.
 *
 * Driven only by `template_params`, with a default for every one, and it recomputes the
 * quotient and the chain's value the same way `generate()` does rather than being handed
 * the answer.
 */

import type { EqToken } from "../svgKit";
import {
  CHIP,
  ExpressionReductionWorked,
  MINUS,
  PLUS,
  type ReductionRow,
  TIMES,
  type WorkedSolutionVisual,
} from "../workedKit";

/** The division, in its tier's colour. `workedKit` ships only the untinted `DIV_INK`. */
const DIV: EqToken = { text: "\\div", role: "muldiv" };

/** The chip for the row that resolves the division: same tier, same colour as `\times`. */
const DIVIDE_CHIP = { role: "muldiv", latex: "\\div" } as const;

/**
 * `a \div b \times c +/- d`, or `d + a \div b \times c` when the lone term leads.
 *
 * Four rows: the expression as written, the chain after dividing, the chain after
 * multiplying, and the value. The first two carry a multiply-divide chip each.
 */
function divideThenMultiplyRows(
  a: number,
  b: number,
  c: number,
  d: number,
  op: number,
  order: number,
): ReductionRow[] {
  const quotient = a / b;
  const chainValue = quotient * c;
  const value = op === 1 ? chainValue - d : chainValue + d;
  const sign = op === 1 ? MINUS : PLUS;
  const term: EqToken = { text: `${d}`, role: "addsub" };

  const withTerm = (chain: EqToken[]): EqToken[] =>
    order === 1 ? [term, PLUS, ...chain] : [...chain, sign, term];

  return [
    {
      chip: DIVIDE_CHIP,
      tokens: withTerm([
        { text: `${a}`, role: "muldiv" },
        DIV,
        { text: `${b}`, role: "muldiv" },
        TIMES,
        { text: `${c}`, role: "muldiv" },
      ]),
    },
    {
      chip: CHIP.times,
      tokens: withTerm([
        { text: `${quotient}`, role: "muldiv" },
        TIMES,
        { text: `${c}`, role: "muldiv" },
      ]),
    },
    {
      // `op` is 0 whenever the lone term leads, so this reads the drawn sign directly.
      chip: op === 1 ? CHIP.minus : CHIP.plus,
      tokens: withTerm([{ text: `${chainValue}`, role: "addsub" }]),
    },
    { tokens: [{ text: `${value}` }] },
  ];
}

export const NUM2_L2B_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d1.num-2.l2b": {
    Svg: ({ a = 8, b = 2, c = 3, d = 5, op = 0, order = 0 }) => {
      const quotient = a / b;
      const closing = op === 1 ? "subtract" : "add";
      return (
        <ExpressionReductionWorked
          rows={divideThenMultiplyRows(a, b, c, d, op, order)}
          title="One tier taken twice, left to right, before the last term"
          ariaLabel={`Divide ${a} by ${b} to get ${quotient}, multiply that by ${c}, and only then ${closing} ${d}`}
        />
      );
    },
    caption: ({ a = 8, b = 2, c = 3, d = 5, op = 0, order = 0 }) => {
      const quotient = a / b;
      const chainValue = quotient * c;
      const value = op === 1 ? chainValue - d : chainValue + d;
      const closing =
        order === 1
          ? `$${d} + ${chainValue} = ${value}$`
          : op === 1
            ? `$${chainValue} - ${d} = ${value}$`
            : `$${chainValue} + ${d} = ${value}$`;
      return `Division and multiplication are one tier, not two, so the whole chain is taken left to right before anything else happens: $${a} \\div ${b} = ${quotient}$, then $${quotient} \\times ${c} = ${chainValue}$. Multiplying first would have paired $${b}$ with $${c}$ instead. Only once the chain is a single number does the last term join in: ${closing}.`;
    },
  },
};
