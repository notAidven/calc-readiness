/**
 * Worked-solution figures for the D1 NUM.S practice templates that live outside the
 * registry's original inline block.
 *
 * `d1.num-s.l3b` is the node's signed DIVISION shape, and the two things that go wrong in
 * it are sequencing and sign, so the figure is a `ExpressionReductionWorked` column with a
 * tier chip on every row that still has work in it. Multiplication and division share a
 * tier, which is exactly the fact the shape trades on, so the product and the quotient get
 * a row each rather than being collapsed: a single "multiply and divide" row would hide
 * the left-to-right ordering the item is grading. The divide row carries its own `\div`
 * chip, because `CHIP` ships only a `\times` for that tier and a multiply sign over a
 * division step would misname the move.
 *
 * Every row is recomputed from the instance's `template_params` the same way `generate()`
 * computes them, so the figure is never handed the answer.
 */

import type { JSX } from "react";

import type { PemdasRole } from "../svgKit";
import {
  CHIP,
  ExpressionReductionWorked,
  MINUS,
  PLUS,
  type ReductionRow,
  sp,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";

/** The divide step's tier chip: `CHIP` carries only a `\times` for the multiply/divide tier. */
const DIVIDE_CHIP: { role: PemdasRole; latex: string } = {
  role: "muldiv",
  latex: "\\div",
};

/** The signed operands and the two intermediate values, recomputed from the params. */
interface QuotientChain {
  opA: number;
  opB: number;
  opC: number;
  opD: number;
  product: number;
  quotient: number;
  value: number;
}

/** Everything the figure and its caption both read off the params. */
function quotientChain(
  a: number,
  b: number,
  c: number,
  d: number,
  sa: number,
  sb: number,
  sc: number,
  sd: number,
  op: number,
): QuotientChain {
  const opA = sa === 1 ? -a : a;
  const opB = sb === 1 ? -b : b;
  const opC = sc === 1 ? -c : c;
  const opD = sd === 1 ? -d : d;
  const product = opA * opB;
  const quotient = product / opC;
  return {
    opA,
    opB,
    opC,
    opD,
    product,
    quotient,
    value: op === 1 ? quotient - opD : quotient + opD,
  };
}

/** `(±a) × (±b) ÷ (±c) ± (±d)`: multiply, divide, then combine the trailing term. */
function signedQuotientRows(
  a: number,
  b: number,
  c: number,
  d: number,
  sa: number,
  sb: number,
  sc: number,
  sd: number,
  op: number,
): ReductionRow[] {
  const { opA, opB, opC, opD, product, quotient, value } = quotientChain(
    a,
    b,
    c,
    d,
    sa,
    sb,
    sc,
    sd,
    op,
  );
  const tail = op === 1 ? MINUS : PLUS;
  const tailToken = { text: sp(opD), role: "addsub" as const };
  const opSym = op === 1 ? "-" : "+";
  return [
    {
      chip: CHIP.times,
      tokens: [
        {
          text: `${sp(opA)} \\times ${sp(opB)} \\div ${sp(opC)}`,
          role: "muldiv",
        },
        tail,
        tailToken,
      ],
    },
    {
      chip: DIVIDE_CHIP,
      tokens: [
        { text: `${sp(product)} \\div ${sp(opC)}`, role: "muldiv" },
        tail,
        tailToken,
      ],
    },
    {
      chip: op === 1 ? CHIP.minus : CHIP.plus,
      tokens: [{ text: `${sp(quotient)} ${opSym} ${sp(opD)}`, role: "addsub" }],
    },
    { tokens: [{ text: `${value}` }] },
  ];
}

function SignedQuotientWorked({
  a,
  b,
  c,
  d,
  sa,
  sb,
  sc,
  sd,
  op,
}: {
  a: number;
  b: number;
  c: number;
  d: number;
  sa: number;
  sb: number;
  sc: number;
  sd: number;
  op: number;
}): JSX.Element {
  const { opA, opB, opC, opD } = quotientChain(a, b, c, d, sa, sb, sc, sd, op);
  return (
    <ExpressionReductionWorked
      rows={signedQuotientRows(a, b, c, d, sa, sb, sc, sd, op)}
      title="Signed multiplication and division worked step by step"
      ariaLabel={`Multiply ${spoken(opA)} by ${spoken(opB)}, divide that by ${spoken(opC)}, then ${op === 1 ? "subtract" : "add"} ${spoken(opD)}`}
    />
  );
}

export const NUMS_L3B_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d1.num-s.l3b": {
    Svg: ({ a = 0, b = 0, c = 1, d = 0, sa = 0, sb = 0, sc = 0, sd = 0, op = 0 }) => (
      <SignedQuotientWorked
        a={a}
        b={b}
        c={c}
        d={d}
        sa={sa}
        sb={sb}
        sc={sc}
        sd={sd}
        op={op}
      />
    ),
    caption: ({ a = 0, b = 0, c = 1, d = 0, sa = 0, sb = 0, sc = 0, sd = 0, op = 0 }) => {
      const { value } = quotientChain(a, b, c, d, sa, sb, sc, sd, op);
      return `Multiplying and dividing rank together, so the chain runs left to right and each step takes its sign from its own two numbers. ${op === 1 ? "Subtracting" : "Adding"} the last term leaves $${value}$.`;
    },
  },
};
