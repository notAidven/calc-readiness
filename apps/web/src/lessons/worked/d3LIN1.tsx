/**
 * Worked-solution figures for the D3 LIN.1 practice templates (solve a one-variable linear
 * equation).
 *
 * Four of the five shapes are genuine reductions: one equation becomes a shorter one, and then a
 * shorter one still, until the variable stands alone. So they use `ExpressionReductionWorked`, the
 * shared column, with the move that produced each line coloured on the line it produced. The
 * colour is on the CHANGE rather than on the whole row, because what a learner is looking for when
 * they open a reveal is which part moved.
 *
 * The word-problem shape gets one extra row above the algebra, holding the equation read out of
 * the words, because that translation is the step the bare shapes never ask for and it is where
 * this shape's difficulty lives.
 *
 * Every figure recomputes from its own `template_params` and never from the answer key, so a
 * figure cannot show a line the arithmetic does not support. Each param has a default, so a stale
 * or partial params record degrades to a drawable figure rather than throwing.
 */

import type { JSX } from "react";

import { CIVIC, LABEL, SIGNAL } from "../svgKit";
import {
  ExpressionReductionWorked,
  numStr,
  type ReductionRow,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";
import { signedTex } from "./d3Kit";

/** The solved line every one of these figures ends on. */
function solvedRow(x0: number): ReductionRow {
  return { tokens: [{ text: `x = ${numStr(x0)}`, color: CIVIC }] };
}

export const LIN1_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** `ax + b = c`: the constant off both sides, then the coefficient divided away. */
  "d3.lin1.two-step.l1": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const b = params.b ?? 8;
      const c = params.c ?? 29;
      const x0 = params.x0 ?? 7;
      const rows: ReductionRow[] = [
        {
          tokens: [{ text: `${numStr(a)}x ${signedTex(b)} = ${numStr(c)}`, color: LABEL }],
        },
        { tokens: [{ text: `${numStr(a)}x = ${numStr(c - b)}`, color: SIGNAL }] },
        solvedRow(x0),
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Solving ${numStr(a)} x ${spoken(b)} equals ${numStr(c)} in two steps`}
          title="A two-step linear equation, reduced one move at a time"
        />
      );
    },
    caption: (params) =>
      `The plain number went on last, so it comes off first. What is left is $${numStr(params.a ?? 3)}$ equal parts against one total, and dividing by the coefficient splits it.`,
  },

  /** The weighing: the equation is read out of the words first, then solved. */
  "d3.lin1.balance-word.l2": {
    Svg: (params): JSX.Element => {
      const count = params.count ?? 3;
      const loose = params.loose ?? 8;
      const crate = params.crate ?? 29;
      const weight = params.weight ?? 7;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `${numStr(count)}x + ${numStr(loose)} = ${numStr(crate)}`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [{ text: `${numStr(count)}x = ${numStr(crate - loose)}`, color: LABEL }],
        },
        solvedRow(weight),
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Reading ${numStr(count)} ingots and a loose ${numStr(loose)} against ${numStr(crate)} as an equation, then solving it`}
          title="A balance read as an equation, then solved"
        />
      );
    },
    caption: (params) =>
      `A level beam says the two pans hold the same amount, which is what turns the weighing into the first line. The loose $${numStr(params.loose ?? 8)}$ comes off both pans before the pile is split.`,
  },

  /** The variable on both sides: gathered first, then the two-step shape. */
  "d3.lin1.both-sides.l2": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 5;
      const b = params.b ?? -3;
      const right = params.right ?? 2;
      const d = params.d ?? 12;
      const x0 = params.x0 ?? 5;
      const gathered = params.gathered ?? a - right;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `${numStr(a)}x ${signedTex(b)} = ${numStr(right)}x ${signedTex(d)}`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            { text: `${numStr(gathered)}x ${signedTex(b)} = ${numStr(d)}`, color: SIGNAL },
          ],
        },
        { tokens: [{ text: `${numStr(gathered)}x = ${numStr(d - b)}`, color: LABEL }] },
        solvedRow(x0),
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Gathering the variable terms of ${numStr(a)} x ${spoken(b)} equals ${numStr(right)} x ${spoken(d)}, then solving`}
          title="An equation with the unknown on both sides, gathered and solved"
        />
      );
    },
    caption: (params) =>
      `Taking $${numStr(params.right ?? 2)}x$ off both sides clears the unknown from one of them, and what is left is the two-step shape again. Nothing could be divided away until then.`,
  },

  /** A bracket to distribute before anything can be collected. */
  "d3.lin1.distribute.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 4;
      const inner = params.inner ?? 5;
      const tail = params.tail ?? -6;
      const c = params.c ?? 30;
      const x0 = params.x0 ?? 4;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `${numStr(a)}(x ${signedTex(inner)}) ${signedTex(tail)} = ${numStr(c)}`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `${numStr(a)}x ${signedTex(a * inner)} ${signedTex(tail)} = ${numStr(c)}`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `${numStr(a)}x ${signedTex(a * inner + tail)} = ${numStr(c)}`,
              color: LABEL,
            },
          ],
        },
        { tokens: [{ text: `${numStr(a)}x = ${numStr(a * x0)}`, color: LABEL }] },
        solvedRow(x0),
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Multiplying out the bracket in ${numStr(a)} times x ${spoken(inner)}, then solving`}
          title="A bracket multiplied out, then the equation solved"
        />
      );
    },
    caption: (params) =>
      `The coefficient has to reach BOTH terms inside the bracket, which is the second line: $${numStr(params.a ?? 4)}$ multiplies the variable and the constant alike. Nothing on that side could be collected while it was still a product.`,
  },

  /** A negative coefficient: the last division turns the sign over. */
  "d3.lin1.negative-coefficient.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 4;
      const b = params.b ?? 18;
      const c = params.c ?? 6;
      const x0 = params.x0 ?? 3;
      const rows: ReductionRow[] = [
        {
          tokens: [{ text: `${numStr(b)} - ${numStr(a)}x = ${numStr(c)}`, color: LABEL }],
        },
        { tokens: [{ text: `-${numStr(a)}x = ${numStr(c - b)}`, color: SIGNAL }] },
        solvedRow(x0),
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Solving ${numStr(b)} minus ${numStr(a)} x equals ${numStr(c)}, where the coefficient is negative`}
          title="An equation whose variable term is subtracted"
        />
      );
    },
    caption: (params) =>
      `The variable term is subtracted, so the number it is subtracted from comes off first and leaves a coefficient of $-${numStr(params.a ?? 4)}$. Dividing by that negative is what decides the sign of the answer.`,
  },
};
