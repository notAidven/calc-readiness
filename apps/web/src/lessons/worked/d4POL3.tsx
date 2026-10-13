/**
 * Worked-solution figures for the D4 POL.3 practice templates (solve a quadratic by factoring
 * and by the square-root property).
 *
 * Every shape on this node answers with a SET, and the thing a learner gets wrong is the size
 * of it: one solution reported where there are two, or a solution divided away. A column of
 * algebra states the answer and a line SHOWS how many of them there are, so these reuse D3's
 * `SolutionLineWorked` with the roots drawn as marked points.
 *
 * The two shapes whose difficulty is the ROUTE rather than the count keep the reduction column
 * instead, because what they have to show is which line rests on which.
 */

import type { JSX } from "react";

import { CIVIC, LABEL, SIGNAL } from "../svgKit";
import {
  ExpressionReductionWorked,
  numStr,
  type ReductionRow,
  type WorkedSolutionVisual,
} from "../workedKit";
import { SolutionLineWorked } from "./d3Kit";
import { coeffTex, signedTermTex, signedTex } from "./d4Kit";

export const POL3_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** A bare square: two points, symmetric about zero, which is the whole content. */
  "d4.pol3.square-root.l1": {
    Svg: (params): JSX.Element => {
      const side = params.side ?? 13;
      return (
        <SolutionLineWorked
          statement={`x^{2} = ${numStr(side * side)}`}
          solved={`\\{-${side}, ${side}\\}`}
          points={[{ at: -side }, { at: side }]}
          ariaLabel={`The two solutions of x squared equals ${side * side}, at minus ${side} and ${side}`}
          title="A square rooted, with both signs kept"
        />
      );
    },
    caption: (params) =>
      `Both marks are solutions and only the positive one could measure a court. Dropping the negative is the commonest way to lose half an answer, because $(-${numStr(params.side ?? 13)})$ multiplied by itself lands on the same number.`,
  },

  /** A shifted square: the same pair, no longer centred on zero. */
  "d4.pol3.shifted-square.l2": {
    Svg: (params): JSX.Element => {
      const shift = params.shift ?? 4;
      const root = params.root ?? 3;
      const low = params.low ?? shift - root;
      const high = params.high ?? shift + root;
      return (
        <SolutionLineWorked
          statement={`(x - ${numStr(shift)})^{2} = ${numStr(root * root)}`}
          solved={`\\{${numStr(low)}, ${numStr(high)}\\}`}
          points={[{ at: low }, { at: high }]}
          ariaLabel={`The two solutions of a shifted square, at ${low} and ${high}`}
          title="A shifted square, rooted and then undone"
        />
      );
    },
    caption: (params) =>
      `Rooting says what the BRACKET equals, not what $x$ equals, so the two marks sit one root either side of $${numStr(params.shift ?? 4)}$ rather than either side of zero.`,
  },

  /** A trinomial at zero: the chain from product to conditions is what has to show. */
  "d4.pol3.factor.l2": {
    Svg: (params): JSX.Element => {
      const low = params.low ?? -3;
      const high = params.high ?? 5;
      const b = params.b ?? -(low + high);
      const c = params.c ?? low * high;
      const rows: ReductionRow[] = [
        {
          tokens: [
            { text: `x^{2} ${signedTermTex(b, "x")} ${signedTex(c)} = 0`, color: LABEL },
          ],
        },
        {
          tokens: [
            {
              text: `(x ${signedTex(-low)})(x ${signedTex(-high)}) = 0`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `x = ${numStr(low)} \\;\\text{ or }\\; x = ${numStr(high)}`,
              color: CIVIC,
            },
          ],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel="A quadratic at zero, factored and split into two conditions"
          title="A product of zero, split into its conditions"
        />
      );
    },
    caption: () =>
      "The middle line is what makes the split available: a product is zero exactly when one of its factors is, and that reading is worth nothing against any other number.",
  },

  /** An area in words: the gathering is the step, so the column shows it. */
  "d4.pol3.area.l3": {
    Svg: (params): JSX.Element => {
      const gap = params.gap ?? 3;
      const area = params.area ?? 54;
      const low = params.low ?? -9;
      const high = params.high ?? 6;
      const rows: ReductionRow[] = [
        { tokens: [{ text: `x(x + ${numStr(gap)}) = ${numStr(area)}`, color: LABEL }] },
        {
          tokens: [
            { text: `x^{2} + ${coeffTex(gap)} - ${numStr(area)} = 0`, color: SIGNAL },
          ],
        },
        {
          tokens: [
            {
              text: `(x ${signedTex(-low)})(x ${signedTex(-high)}) = 0`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `x = ${numStr(low)} \\;\\text{ or }\\; x = ${numStr(high)}`,
              color: CIVIC,
            },
          ],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`An area of ${area} square paces gathered at zero and solved`}
          title="An order gathered at zero before anything else"
        />
      );
    },
    caption: (params) =>
      `Both values solve the equation and only $${numStr(params.high ?? 6)}$ measures ground, which is a reading made after the algebra rather than during it.`,
  },

  /** The lost root: zero is one of the marks, and it is the one a division discards. */
  "d4.pol3.lost-root.l3": {
    Svg: (params): JSX.Element => {
      const k = params.k ?? 5;
      const a = params.a ?? 1;
      return (
        <SolutionLineWorked
          statement={`${coeffTex(a, "x^{2}")} = ${coeffTex(a * k)}`}
          solved={`\\{0, ${numStr(k)}\\}`}
          points={[{ at: 0 }, { at: k }]}
          ariaLabel={`The two solutions of a quadratic with the variable on both sides, at zero and ${k}`}
          title="Two solutions, one of which a division would discard"
        />
      );
    },
    caption: () =>
      "Dividing both sides through by the variable assumes it is not zero, and zero is one of the two marks. Gathering at zero and factoring instead keeps both.",
  },
};
