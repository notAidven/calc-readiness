/**
 * Worked-solution figures for the D4 POL.2 practice templates (factor a polynomial completely).
 *
 * Factoring is the area model read the other way round, so the two shapes whose answer IS a
 * rectangle are drawn as one: the learner is handed the total and the figure gives back the
 * sides, with the cells filled in so the arithmetic can be checked against them. The other
 * three are chains rather than pictures, so they use the shared reduction column.
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
import { AreaGridWorked, coeffTex, quadraticTex } from "./d4Kit";

export const POL2_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** The numeric common measure, as a two-line reduction. */
  "d4.pol2.gcf.l1": {
    Svg: (params): JSX.Element => {
      const k = params.k ?? 4;
      const m = params.m ?? 3;
      const n = params.n ?? 5;
      const rows: ReductionRow[] = [
        { tokens: [{ text: `${coeffTex(k * m)} + ${numStr(k * n)}`, color: LABEL }] },
        {
          tokens: [
            {
              text: `${numStr(k)} \\cdot ${coeffTex(m)} + ${numStr(k)} \\cdot ${numStr(n)}`,
              color: SIGNAL,
            },
          ],
        },
        { tokens: [{ text: `${numStr(k)}(${coeffTex(m)} + ${numStr(n)})`, color: CIVIC }] },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Taking ${k} out of ${k * m} x plus ${k * n}`}
          title="The common measure, taken out first"
        />
      );
    },
    caption: (params) =>
      `Inside the bracket $${numStr(params.m ?? 3)}$ and $${numStr(params.n ?? 5)}$ share nothing further, which is the check that says the measure taken out was the GREATEST one rather than merely a common one.`,
  },

  /** A monic trinomial, drawn as the rectangle its two sides make. */
  "d4.pol2.trinomial.l2": {
    Svg: (params): JSX.Element => {
      const p = params.p ?? 3;
      const q = params.q ?? 4;
      return (
        <AreaGridWorked
          statement={quadraticTex(1, p + q, p * q)}
          leftEdge="x"
          rightEdge={`${p}`}
          topEdge="x"
          bottomEdge={`${q}`}
          cells={["x^{2}", coeffTex(q), coeffTex(p), `${p * q}`]}
          result={`(x + ${p})(x + ${q})`}
          ariaLabel={`The area x squared plus ${p + q} x plus ${p * q}, laid out as a rectangle`}
          title="An area handed back as a pair of sides"
        />
      );
    },
    caption: (params) =>
      `The two numbers multiply to the corner cell $${(params.p ?? 3) * (params.q ?? 4)}$ and add to the two tinted strips $${(params.p ?? 3) + (params.q ?? 4)}$, which is the pair of conditions the search runs on.`,
  },

  /** A difference of two squares: the middle line is the cancellation. */
  "d4.pol2.difference.l2": {
    Svg: (params): JSX.Element => {
      const scaled = (params.scaled ?? 0) === 1;
      const root = params.root ?? 1;
      const inner = params.inner ?? 6;
      const leftTex = scaled ? coeffTex(root * root, "x^{2}") : "x^{2}";
      const aTex = scaled ? coeffTex(root) : "x";
      // Bracketed only where the base is a product, so the middle row of the unscaled shape is
      // `x^{2} - 4^{2}`: one character away from the row above it, which is the whole reading
      // this row is here to offer. `(x)^{2}` puts a bracket round nothing and reads as an
      // expression that has not finished being simplified.
      const squaredTex = scaled ? `(${aTex})^{2}` : "x^{2}";
      const rows: ReductionRow[] = [
        { tokens: [{ text: `${leftTex} - ${numStr(inner * inner)}`, color: LABEL }] },
        {
          tokens: [{ text: `${squaredTex} - ${numStr(inner)}^{2}`, color: SIGNAL }],
        },
        {
          tokens: [
            {
              text: `(${aTex} + ${numStr(inner)})(${aTex} - ${numStr(inner)})`,
              color: CIVIC,
            },
          ],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel="One square subtracted from another, factored into a sum times a difference"
          title="A difference of two squares"
        />
      );
    },
    caption: () =>
      "Multiplying the two brackets back out produces two cross terms that cancel exactly, which is why the middle term is missing from the amount they came from.",
  },

  /** A leading coefficient: the middle line is the outer and inner products. */
  "d4.pol2.leading.l3": {
    Svg: (params): JSX.Element => {
      const m = params.m ?? 2;
      const p = params.p ?? 3;
      const q = params.q ?? 4;
      return (
        <AreaGridWorked
          statement={quadraticTex(m, m * q + p, p * q)}
          leftEdge={coeffTex(m)}
          rightEdge={`${p}`}
          topEdge="x"
          bottomEdge={`${q}`}
          cells={[coeffTex(m, "x^{2}"), coeffTex(m * q), coeffTex(p), `${p * q}`]}
          result={`(${coeffTex(m)} + ${p})(x + ${q})`}
          ariaLabel={`The area ${m} x squared plus ${m * q + p} x plus ${p * q}, laid out as a rectangle`}
          title="Two lists meeting at the middle term"
        />
      );
    },
    caption: (params) =>
      `The bracket coefficients have to multiply to the corner $${params.m ?? 2}$ and the constants to the corner $${(params.p ?? 3) * (params.q ?? 4)}$, and the two tinted strips are what decides between the candidates: $${(params.m ?? 2) * (params.q ?? 4)} + ${params.p ?? 3}$.`,
  },

  /** Grouping: the middle line is the one that looks like no progress. */
  "d4.pol2.grouping.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 5;
      const b = params.b ?? 3;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `x^{3} + ${coeffTex(a, "x^{2}")} + ${coeffTex(b)} + ${numStr(a * b)}`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `(x^{3} + ${coeffTex(a, "x^{2}")}) + (${coeffTex(b)} + ${numStr(a * b)})`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `x^{2}(x + ${numStr(a)}) + ${numStr(b)}(x + ${numStr(a)})`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [{ text: `(x + ${numStr(a)})(x^{2} + ${numStr(b)})`, color: CIVIC }],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Factoring x cubed plus ${a} x squared plus ${b} x plus ${a * b} by grouping`}
          title="Four terms, paired and then taken apart"
        />
      );
    },
    caption: (params) =>
      `The tinted line is longer than the one above it and is still a sum, which is why it reads as no progress. What it has done is MAKE a common factor exist: both halves now carry $(x + ${numStr(params.a ?? 5)})$.`,
  },
};
