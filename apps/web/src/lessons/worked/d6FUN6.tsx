/**
 * Worked-solution figures for D6's FUN.6 practice templates: the difference quotient.
 *
 * All five are reduction columns, and this is the one node in D6 where that is the whole answer
 * rather than a compromise. The difference quotient IS an algebraic chain: expand, subtract, watch
 * the constant cancel, divide the surviving `h` out. There is nothing spatial in it — no position
 * is read, no interval is named, no order is chosen — and the one thing a learner has to see is
 * WHICH terms disappeared between two lines, which is exactly what a column of rows shows.
 *
 * Every column prints the expanded `f(p + h)` as its own row before the subtraction, because that
 * is where the cancellation becomes visible: `a h^2 + k h + f(p)` against `f(p)` leaves the two
 * terms in `h` and nothing else, and a learner who cannot see the `f(p)` on both lines has to take
 * the cancellation on trust.
 */

import type { JSX } from "react";

import { BRICK, CIVIC, LABEL, SIGNAL } from "../svgKit";
import {
  ExpressionReductionWorked,
  type ReductionRow,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";

/** `+ 5` / `- 5`: a signed constant, as it follows a term. */
function signed(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/** `+ 3h` / `- h`: a signed term with its coefficient, the `1` dropped. */
function signedTerm(coeff: number, body: string): string {
  const mag = Math.abs(coeff);
  const written = mag === 1 ? body : `${mag}${body}`;
  return coeff < 0 ? `- ${written}` : `+ ${written}`;
}

/** The same term standing first in an expression, where a `+` is not written. */
function leadTerm(coeff: number, body: string): string {
  const mag = Math.abs(coeff);
  const written = mag === 1 ? body : `${mag}${body}`;
  return coeff < 0 ? `-${written}` : written;
}

/** The quotient row every column but the numerator-only shape closes on. */
function quotientRow(numerator: string, simplified: string): ReductionRow {
  return { tokens: [{ text: `\\dfrac{${numerator}}{h} = ${simplified}`, color: CIVIC }] };
}

export const FUN6_PRACTICE_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** A line, where the quotient is the slope and every `x` cancels. */
  "d6.fun6.linear.l1": {
    Svg: (params): JSX.Element => {
      const m = params.m ?? 4;
      const b = params.b ?? -3;
      const rows: ReductionRow[] = [
        { tokens: [{ text: `f(x) = ${leadTerm(m, "x")} ${signed(b)}`, color: LABEL }] },
        {
          tokens: [
            {
              text: `f(x + h) = ${leadTerm(m, "x")} ${signedTerm(m, "h")} ${signed(b)}`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [{ text: `f(x + h) - f(x) = ${leadTerm(m, "h")}`, color: BRICK }],
        },
        quotientRow(leadTerm(m, "h"), `${m}`),
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`The difference quotient of a line of slope ${spoken(m)}, which simplifies to ${spoken(m)}`}
          title="A line's difference quotient, where everything but the slope cancels"
        />
      );
    },
    caption: (params) => {
      const m = params.m ?? 4;
      const b = params.b ?? -3;
      return `Both the $x$ term and the constant $${Math.abs(b)}$ appear in $f(x + h)$ and in $f(x)$, so both are gone after the subtraction. What survives is $${leadTerm(m, "h")}$, and dividing by $h$ leaves $${m}$, with no $x$ and no $h$ in it at all. A line's average rate is the same over every stretch, which is what that means.`;
    },
  },

  /** The numerator only, expanded and collected, with no division at the end. */
  "d6.fun6.numerator.l2": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const b = params.b ?? -5;
      const c = params.c ?? 4;
      const p = params.p ?? 2;
      const k = params.k ?? 2 * a * p + b;
      const fp = params.fp ?? a * p * p + b * p + c;
      const rows: ReductionRow[] = [
        {
          tokens: [
            { text: `f(x) = ${a}x^{2} ${signedTerm(b, "x")} ${signed(c)}`, color: LABEL },
          ],
        },
        {
          tokens: [
            {
              text: `f(${p} + h) = ${a}(${p} + h)^{2} ${signedTerm(b, `(${p} + h)`)} ${signed(c)}`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `f(${p} + h) = ${a}h^{2} ${signedTerm(k, "h")} ${signed(fp)}`,
              color: SIGNAL,
            },
          ],
        },
        { tokens: [{ text: `f(${p}) = ${fp}`, color: BRICK }] },
        {
          tokens: [
            {
              text: `f(${p} + h) - f(${p}) = ${a}h^{2} ${signedTerm(k, "h")}`,
              color: CIVIC,
            },
          ],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`The numerator of the difference quotient at ${spoken(p)}, which collects to ${spoken(a)} h squared plus ${spoken(k)} h`}
          title="The numerator alone: expanded, collected, and the constant cancelled"
        />
      );
    },
    caption: (params) => {
      const fp = params.fp ?? 4;
      return `Once $f(${params.p ?? 2} + h)$ is collected, the number $${fp}$ standing at its end is $f(${params.p ?? 2})$ itself, so subtracting $f(${params.p ?? 2})$ removes it exactly. Only terms carrying an $h$ can survive that, which is why the answer has no constant. Standard form means the higher power first.`;
    },
  },

  /** A square with no middle term, where one `h` divides out of both surviving terms. */
  "d6.fun6.square-point.l2": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const c = params.c ?? -4;
      const p = params.p ?? 2;
      const k = params.k ?? 2 * a * p;
      const fp = params.fp ?? a * p * p + c;
      const numerator = `${a}h^{2} + ${k}h`;
      const rows: ReductionRow[] = [
        { tokens: [{ text: `f(x) = ${a}x^{2} ${signed(c)}`, color: LABEL }] },
        {
          tokens: [
            {
              text: `f(${p} + h) = ${a}h^{2} + ${k}h ${signed(fp)}`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [{ text: `f(${p} + h) - f(${p}) = ${numerator}`, color: BRICK }],
        },
        quotientRow(numerator, `${a}h + ${k}`),
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`The difference quotient at ${spoken(p)} simplifying to ${spoken(a)} h plus ${spoken(k)}`}
          title="A squared rule's quotient, with one h divided out of both terms"
        />
      );
    },
    caption: (params) => {
      const a = params.a ?? 3;
      const k = params.k ?? 12;
      return `Both surviving terms carry an $h$, so dividing by $h$ takes ONE off each of them: $${a}h^{2}$ becomes $${a}h$ and $${k}h$ becomes $${k}$. Cancelling it out of only the first term is the near miss here. The answer still has an $h$ in it, which is the difference between this and the linear shape.`;
    },
  },

  /** The full quadratic, where the middle coefficient joins the surviving `h` term. */
  "d6.fun6.point-full.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const b = params.b ?? -5;
      const c = params.c ?? 4;
      const p = params.p ?? 2;
      const k = params.k ?? 2 * a * p + b;
      const fp = params.fp ?? a * p * p + b * p + c;
      const numerator = `${a}h^{2} ${signedTerm(k, "h")}`;
      const rows: ReductionRow[] = [
        {
          tokens: [
            { text: `f(x) = ${a}x^{2} ${signedTerm(b, "x")} ${signed(c)}`, color: LABEL },
          ],
        },
        {
          tokens: [
            {
              text: `f(${p} + h) = ${a}h^{2} ${signedTerm(k, "h")} ${signed(fp)}`,
              color: SIGNAL,
            },
          ],
        },
        { tokens: [{ text: `f(${p} + h) - f(${p}) = ${numerator}`, color: BRICK }] },
        quotientRow(numerator, `${a}h ${signed(k)}`),
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`The difference quotient of a full quadratic at ${spoken(p)}, simplifying to ${spoken(a)} h ${k < 0 ? "minus" : "plus"} ${spoken(Math.abs(k))}`}
          title="A full quadratic's quotient at a point"
        />
      );
    },
    caption: (params) => {
      const a = params.a ?? 3;
      const b = params.b ?? -5;
      const p = params.p ?? 2;
      const k = params.k ?? 2 * a * p + b;
      return `The coefficient of $h$ is $2 \\times ${a} \\times ${p} ${signed(b)} = ${k}$: the square contributes $${2 * a * p}$ and the middle term of the rule contributes its own $${b}$. Missing that second contribution is the usual slip, and it changes only the constant in the answer, which is why it is worth checking against the rule rather than against the shape.`;
    },
  },

  /** A rule handed over factored, which has to be multiplied out before anything else. */
  "d6.fun6.factored-point.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 2;
      const q = params.q ?? 3;
      const r = params.r ?? -4;
      const p = params.p ?? 2;
      const b = params.b ?? a * r + q;
      const k = params.k ?? 2 * a * p + b;
      const numerator = `${a}h^{2} ${signedTerm(k, "h")}`;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `f(x) = (${leadTerm(a, "x")} ${signed(q)})(x ${signed(r)})`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `f(x) = ${a}x^{2} ${signedTerm(b, "x")} ${signed(q * r)}`,
              color: SIGNAL,
            },
          ],
        },
        { tokens: [{ text: `f(${p} + h) - f(${p}) = ${numerator}`, color: BRICK }] },
        quotientRow(numerator, `${a}h ${signed(k)}`),
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`A factored rule multiplied out and then differenced at ${spoken(p)}, simplifying to ${spoken(a)} h ${k < 0 ? "minus" : "plus"} ${spoken(Math.abs(k))}`}
          title="A factored rule expanded first, then differenced at a point"
        />
      );
    },
    caption: (params) => {
      const a = params.a ?? 2;
      const b = params.b ?? 1;
      return `The brackets have to come apart first: the middle coefficient of the expanded rule is $${b}$, and it is that number, not anything visible in the factors, that ends up in the answer. Substituting $${params.p ?? 2} + h$ into the FACTORED form works too, but then two brackets have to be multiplied with an $h$ in each, and the leading coefficient $${a}$ is easy to lose.`;
    },
  },
};
