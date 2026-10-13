/**
 * Worked-solution figures for the D4 POL.8 practice templates (polynomial long and synthetic
 * division).
 *
 * Every shape here is a chain: a substitution that shortcuts a division, or a division that
 * clears one leading term at a time. So all five use the shared reduction column, with the line
 * that changed coloured on the line that produced it. What varies is which line carries the
 * colour, and it is always the step the node's own misconception lands on: the substitution
 * that replaces a division, the subtraction that clears a term, or the empty column that keeps
 * the later ones lined up.
 *
 * Every figure recomputes from its own `template_params`, and each param has a default, so a
 * stale or partial params record degrades to a drawable figure rather than throwing.
 */

import type { JSX } from "react";

import { CIVIC, LABEL, SIGNAL } from "../svgKit";
import {
  ExpressionReductionWorked,
  numStr,
  type ReductionRow,
  type WorkedSolutionVisual,
} from "../workedKit";
import { coeffTex, signedTermTex, signedTex } from "./d4Kit";

export const POL8_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** The remainder theorem: three lines, and the middle one replaces a whole division. */
  "d4.pol8.remainder.l1": {
    Svg: (params): JSX.Element => {
      const r = params.r ?? 3;
      const b = params.b ?? -4;
      const c = params.c ?? 5;
      const remainder = params.remainder ?? r * r + b * r + c;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `(x^{2} ${signedTermTex(b, "x")} ${signedTex(c)}) \\div (x - ${numStr(r)})`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `(${numStr(r)})^{2} ${signedTex(b)}(${numStr(r)}) ${signedTex(c)}`,
              color: SIGNAL,
            },
          ],
        },
        { tokens: [{ text: `= ${numStr(remainder)}`, color: CIVIC }] },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Finding a remainder by substituting x equals ${r}`}
          title="A remainder, reached by one substitution"
        />
      );
    },
    caption: (params) =>
      `The divisor is zero at $x = ${numStr(params.r ?? 3)}$, so in the division statement the whole product term vanishes there and the remainder is left standing alone.`,
  },

  /** An exact division of a quadratic: two steps, each clearing one leading term. */
  "d4.pol8.quotient-linear.l2": {
    Svg: (params): JSX.Element => {
      const d = params.d ?? 2;
      const q = params.q ?? 5;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `(x^{2} + ${coeffTex(d + q)} + ${numStr(d * q)}) \\div (x + ${numStr(d)})`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `x(x + ${numStr(d)}) = x^{2} + ${coeffTex(d)} \\;\\text{ leaves }\\; ${coeffTex(q)} + ${numStr(d * q)}`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `${numStr(q)}(x + ${numStr(d)}) = ${coeffTex(q)} + ${numStr(d * q)} \\;\\text{ leaves }\\; 0`,
              color: SIGNAL,
            },
          ],
        },
        { tokens: [{ text: `x + ${numStr(q)}`, color: CIVIC }] },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Dividing a quadratic by x plus ${d}, one leading term at a time`}
          title="Two steps, two leading terms cleared"
        />
      );
    },
    caption: () =>
      "The quotient is the column of multipliers in the order they were found, and each step kills exactly one leading term, which is why the process always stops.",
  },

  /** A cubic by synthetic division: the row, then what its four numbers are. */
  "d4.pol8.synthetic-cubic.l2": {
    Svg: (params): JSX.Element => {
      const r = params.r ?? 2;
      const m = params.m ?? -2;
      const n = params.n ?? 1;
      const b = params.b ?? m - r;
      const c = params.c ?? n - r * m;
      const d = params.d ?? -r * n;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `(x^{3} ${signedTermTex(b, "x^{2}")} ${signedTermTex(c, "x")} ${signedTex(d)}) \\div (x - ${numStr(r)})`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `${numStr(r)} \\;\\vert\\; 1 \\quad ${numStr(b)} \\quad ${numStr(c)} \\quad ${numStr(d)}`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `1 \\quad ${numStr(m)} \\quad ${numStr(n)} \\quad 0`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [
            { text: `x^{2} ${signedTermTex(m, "x")} ${signedTex(n)}`, color: CIVIC },
          ],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Dividing a cubic by x minus ${r} with a synthetic row`}
          title="A synthetic row, and what its numbers are"
        />
      );
    },
    caption: (params) =>
      `The value outside the row is the one that makes the divisor zero, so $x - ${numStr(params.r ?? 2)}$ puts $${numStr(params.r ?? 2)}$ there. The first three results are the quotient's coefficients and the last is the remainder.`,
  },

  /** A remainder with a leading coefficient: the squaring is done before the coefficient. */
  "d4.pol8.leading-remainder.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const r = params.r ?? 4;
      const b = params.b ?? -5;
      const c = params.c ?? 7;
      const remainder = params.remainder ?? a * r * r + b * r + c;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `(${coeffTex(a, "x^{2}")} ${signedTermTex(b, "x")} ${signedTex(c)}) \\div (x - ${numStr(r)})`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `${numStr(a)}(${numStr(r)})^{2} ${signedTex(b)}(${numStr(r)}) ${signedTex(c)}`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `${numStr(a * r * r)} ${signedTex(b * r)} ${signedTex(c)}`,
              color: LABEL,
            },
          ],
        },
        { tokens: [{ text: `= ${numStr(remainder)}`, color: CIVIC }] },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Finding the remainder of a quadratic with a leading coefficient at x equals ${r}`}
          title="A substitution with a coefficient on the square"
        />
      );
    },
    caption: (params) =>
      `The leading coefficient multiplies the SQUARE, so $${numStr(params.r ?? 4)}$ is squared first and $${numStr(params.a ?? 3)}$ is applied to the result.`,
  },

  /** A missing power: the tinted line is the column being written in. */
  "d4.pol8.missing-power.l3": {
    Svg: (params): JSX.Element => {
      const r = params.r ?? 3;
      const n = params.n ?? 4;
      // The dividend is $(x - r)(x^2 + rx + n) = x^3 + (n - r^2)x - rn$, so the x coefficient
      // is what is LEFT of `n` after `-r` has multiplied the quotient's middle term. This
      // default read `n + r * r` and so stated a dividend the quotient below it does not
      // divide: the same wrong sign the generator carried at `POL.8/index.ts`, mirrored here.
      // It only fires when `c` is absent from `template_params`, but a default a figure can
      // draw from has to be a dividend, not a plausible-looking number.
      const c = params.c ?? n - r * r;
      const d = params.d ?? -r * n;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `(x^{3} ${signedTermTex(c, "x")} ${signedTex(d)}) \\div (x - ${numStr(r)})`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              // `0x^{2}` is written out rather than suppressed: the absent column IS this
              // template's subject, so this one coefficient of zero is the figure's content.
              text: `x^{3} + 0x^{2} ${signedTermTex(c, "x")} ${signedTex(d)}`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `${numStr(r)} \\;\\vert\\; 1 \\quad 0 \\quad ${numStr(c)} \\quad ${numStr(d)}`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [{ text: `x^{2} + ${coeffTex(r)} ${signedTex(n)}`, color: CIVIC }],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Dividing a cubic with no squared term by x minus ${r}`}
          title="An empty column, written in before dividing"
        />
      );
    },
    caption: () =>
      "The tinted line changes the dividend's value by nothing and keeps every later subtraction under the terms it belongs to. Leaving the column out shifts all of them and produces a wrong answer with no step in it that looks wrong.",
  },
};
