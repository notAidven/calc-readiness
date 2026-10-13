/**
 * Worked-solution figures for the D4 POL.1 practice templates (add, subtract and multiply
 * polynomials).
 *
 * The two arithmetic shapes are genuine reductions: two amounts become one, term by term, so
 * they use `ExpressionReductionWorked` with the line that changed coloured on the line that
 * produced it. The three product shapes are drawn as an AREA GRID instead, because what a
 * learner loses on a product is the COUNT of pieces rather than any arithmetic inside them, and
 * a column of algebra cannot show a piece going missing.
 *
 * Every figure recomputes from its own `template_params` and never from the answer key, so a
 * figure cannot show a line the arithmetic does not support. Each param has a default, so a
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
import { AreaGridWorked, coeffTex, quadraticTex, signedTermTex } from "./d4Kit";

export const POL1_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** Adding two amounts: three collections, one line each. */
  "d4.pol1.combine.l1": {
    Svg: (params): JSX.Element => {
      const a1 = params.a1 ?? 3;
      const b1 = params.b1 ?? 5;
      const c1 = params.c1 ?? 8;
      const a2 = params.a2 ?? 2;
      const b2 = params.b2 ?? 4;
      const c2 = params.c2 ?? 9;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `(${quadraticTex(a1, b1, c1)}) + (${quadraticTex(a2, b2, c2)})`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `(${numStr(a1)} + ${numStr(a2)})x^{2} + (${numStr(b1)} + ${numStr(b2)})x + (${numStr(c1)} + ${numStr(c2)})`,
              color: SIGNAL,
            },
          ],
        },
        { tokens: [{ text: quadraticTex(a1 + a2, b1 + b2, c1 + c2), color: CIVIC }] },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Adding two polynomials by collecting each kind of term`}
          title="Two orders totalled, one kind of term at a time"
        />
      );
    },
    caption: () =>
      "Two terms combine only when their variable part is identical, so the three kinds are collected separately and the total keeps all three.",
  },

  /** Subtracting: the middle line is the signs turned over, which is where it goes wrong. */
  "d4.pol1.subtract.l2": {
    Svg: (params): JSX.Element => {
      const a1 = params.a1 ?? 5;
      const b1 = params.b1 ?? 2;
      const c1 = params.c1 ?? -1;
      const a2 = params.a2 ?? 2;
      const b2 = params.b2 ?? -6;
      const c2 = params.c2 ?? 4;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `(${quadraticTex(a1, b1, c1)}) - (${quadraticTex(a2, b2, c2)})`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `${quadraticTex(a1, b1, c1)} - ${coeffTex(a2, "x^{2}")} ${signedTermTex(-b2, "x")} ${signedTermTex(-c2, "")}`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [{ text: quadraticTex(a1 - a2, b1 - b2, c1 - c2), color: CIVIC }],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel="Subtracting one polynomial from another, with every sign inside the bracket turned over"
          title="A withdrawal, with the minus reaching every term"
        />
      );
    },
    caption: (params) =>
      `The middle line is the whole of it: the minus reaches every term inside the bracket, so the $${numStr(params.b2 ?? -6)}x$ becomes $+${Math.abs(params.b2 ?? -6)}x$ and taking away a deduction leaves more behind.`,
  },

  /** A product of two monic binomials, drawn as the four rectangles it is. */
  "d4.pol1.binomial.l2": {
    Svg: (params): JSX.Element => {
      const p = params.p ?? 3;
      const q = params.q ?? 5;
      return (
        <AreaGridWorked
          statement={`(x + ${p})(x + ${q})`}
          leftEdge="x"
          rightEdge={`${p}`}
          topEdge="x"
          bottomEdge={`${q}`}
          cells={["x^{2}", coeffTex(q), coeffTex(p), `${p * q}`]}
          result={quadraticTex(1, p + q, p * q)}
          ariaLabel={`A court x plus ${p} by x plus ${q}, divided into four rectangles`}
          title="Four rectangles, two of which collect"
        />
      );
    },
    caption: (params) =>
      `The two tinted pieces are both counted in $x$, so they are like terms and collect into $${(params.p ?? 3) + (params.q ?? 5)}x$. That is why four rectangles produce three terms.`,
  },

  /** The same grid with a coefficient on both sides, so no two pieces are alike. */
  "d4.pol1.leading.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const b = params.b ?? 2;
      const c = params.c ?? 2;
      const d = params.d ?? 5;
      return (
        <AreaGridWorked
          statement={`(${coeffTex(a)} + ${b})(${coeffTex(c)} + ${d})`}
          leftEdge={coeffTex(a)}
          rightEdge={`${b}`}
          topEdge={coeffTex(c)}
          bottomEdge={`${d}`}
          cells={[coeffTex(a * c, "x^{2}"), coeffTex(a * d), coeffTex(b * c), `${b * d}`]}
          result={quadraticTex(a * c, a * d + b * c, b * d)}
          ariaLabel={`A yard ${a} x plus ${b} by ${c} x plus ${d}, divided into four rectangles`}
          title="Four rectangles, none of them alike"
        />
      );
    },
    caption: (params) =>
      `The two tinted pieces are no longer equal, so both have to be computed before they add: $${(params.a ?? 3) * (params.d ?? 5)} + ${(params.b ?? 2) * (params.c ?? 2)}$.`,
  },

  /** The two-variable grid, where only the tinted pair carries both variables. */
  "d4.pol1.two-variable.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 2;
      const b = params.b ?? 3;
      const c = params.c ?? 4;
      const d = params.d ?? 5;
      return (
        <AreaGridWorked
          statement={`(${coeffTex(a)} + ${coeffTex(b, "y")})(${coeffTex(c)} + ${coeffTex(d, "y")})`}
          leftEdge={coeffTex(a)}
          rightEdge={coeffTex(b, "y")}
          topEdge={coeffTex(c)}
          bottomEdge={coeffTex(d, "y")}
          cells={[
            coeffTex(a * c, "x^{2}"),
            coeffTex(a * d, "xy"),
            coeffTex(b * c, "xy"),
            coeffTex(b * d, "y^{2}"),
          ]}
          result={coeffTex(a * d + b * c, "xy")}
          ariaLabel={`A yard ${a} x plus ${b} y by ${c} x plus ${d} y, divided into four rectangles`}
          title="Only two of the four carry both variables"
        />
      );
    },
    caption: (params) =>
      `A term in $xy$ needs an $x$ piece on one side meeting a $y$ piece on the other, which happens in exactly the two tinted cells: $${(params.a ?? 2) * (params.d ?? 5)} + ${(params.b ?? 3) * (params.c ?? 4)}$.`,
  },
};
