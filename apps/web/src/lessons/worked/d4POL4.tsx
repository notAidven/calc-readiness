/**
 * Worked-solution figures for the D4 POL.4 practice templates (completing the square, and the
 * quadratic formula).
 *
 * Three shapes ask for one number and their difficulty is the CHAIN that produces it, so those
 * use the shared reduction column with the line that moved coloured. The two that solve answer
 * with a set, and the count of solutions is the thing this node is about, so those draw the
 * roots on a line.
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
import { SolutionLineWorked } from "./d3Kit";
import { coeffTex, signedTermTex, signedTex } from "./d4Kit";

export const POL4_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** Halve, then square. Two moves, two lines. */
  "d4.pol4.complete.l1": {
    Svg: (params): JSX.Element => {
      const middle = params.middle ?? 6;
      const half = middle / 2;
      const rows: ReductionRow[] = [
        { tokens: [{ text: `x^{2} ${signedTermTex(middle, "x")}`, color: LABEL }] },
        {
          tokens: [
            // `\left`, and the size is the whole of the reported defect. A fixed size was
            // shipped here twice and was too short both times, so the numbers are written
            // down: PAINTED INK, in this figure's own user units, at `middle = 14` in
            // Chromium (a 440-unit viewBox drawn 460px wide, scale 1.045).
            //
            //   \dfrac{14}{2}   37.0   (KaTeX's own reserved height+depth: 36.1)
            //   (               18.2   0.49x the fraction
            //   \bigl   size1   22.0   0.60x   <- what shipped, and the "still too short"
            //   \Bigl   size2   31.6   0.85x   still short of its own contents
            //   \biggl  size3   41.1   1.11x
            //   \left   size3   41.1   1.11x   <- content plus TeX's delimiterShortfall
            //   \Biggl  size4   52.6   1.42x   collides with the down-arrow above
            //
            // So `\left(` picks the smallest canned size that actually clears the fraction,
            // which is what it is for. Do not swap it for a fixed size: `\dfrac{n}{2}` is
            // two lines at every draw, but the size that holds two lines is a fact about the
            // font and the font size rather than about the content, and neither of the two
            // guesses made here was right.
            //
            // A NOTE ON MEASURING THIS, because both wrong answers came from the same place.
            // `.mfrac`'s own `getBoundingClientRect` is 21.0 units for EVERY candidate above:
            // it is an inline span, so its border box is the font's ascent-plus-descent and
            // not the fraction, and a ratio taken against it is a real delimiter over a
            // constant. Same trap on the `<text>` down-arrow, whose em box stands about 4
            // units clear of the glyph at either end. Measured as ink, the `^{2}` here runs
            // 62.2..70.8 against an arrow ending at 58.0 and a row band of 60..112: inside
            // its own row, and 4.2 units clear of the arrow. `bracketSizing.browser.test.tsx`
            // takes these readings and fails if this delimiter stops clearing its fraction.
            {
              text: `\\left(\\dfrac{${numStr(middle)}}{2}\\right)^{2} = (${numStr(half)})^{2}`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `x^{2} ${signedTermTex(middle, "x")} + ${numStr(half * half)} = (x ${signedTex(half)})^{2}`,
              color: CIVIC,
            },
          ],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Completing the square on x squared ${middle < 0 ? "minus" : "plus"} ${Math.abs(middle)} x`}
          title="Halve the middle, then square it"
        />
      );
    },
    caption: (params) =>
      `The strips along the two edges are each half the middle coefficient, so the corner they leave open is that half squared. It is positive whatever the sign of $${numStr(params.middle ?? 6)}$, because squaring removes the sign.`,
  },

  /** The discriminant, in the order the substitution is made. */
  "d4.pol4.discriminant.l2": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 2;
      const b = params.b ?? -7;
      const c = params.c ?? 3;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `${coeffTex(a, "x^{2}")} ${signedTermTex(b, "x")} ${signedTex(c)} = 0`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `(${numStr(b)})^{2} - 4(${numStr(a)})(${numStr(c)})`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [
            {
              text: `${numStr(b * b)} - (${numStr(4 * a * c)}) = ${numStr(b * b - 4 * a * c)}`,
              color: CIVIC,
            },
          ],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel="Reading three coefficients off an equation and computing the discriminant"
          title="The discriminant, read with its signs"
        />
      );
    },
    caption: (params) => {
      const value = (params.b ?? -7) ** 2 - 4 * (params.a ?? 2) * (params.c ?? 3);
      return `A ${value > 0 ? "positive" : value === 0 ? "zero" : "negative"} discriminant means ${value > 0 ? "two different real solutions" : value === 0 ? "one real solution, the two having coincided" : "no real solution at all"}, and it is read before any solving is attempted.`;
    },
  },

  /** The right-hand side: the line that shows the constant reaching BOTH sides. */
  "d4.pol4.right-side.l2": {
    Svg: (params): JSX.Element => {
      const half = params.half ?? 3;
      const constant = params.constant ?? -7;
      const right = params.right ?? half * half - constant;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: `x^{2} + ${coeffTex(2 * half)} ${signedTex(constant)} = 0`,
              color: LABEL,
            },
          ],
        },
        {
          tokens: [
            { text: `x^{2} + ${coeffTex(2 * half)} = ${numStr(-constant)}`, color: LABEL },
          ],
        },
        {
          tokens: [
            {
              text: `x^{2} + ${coeffTex(2 * half)} + ${numStr(half * half)} = ${numStr(-constant)} + ${numStr(half * half)}`,
              color: SIGNAL,
            },
          ],
        },
        {
          tokens: [{ text: `(x + ${numStr(half)})^{2} = ${numStr(right)}`, color: CIVIC }],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel="Completing the square with the constant added to both sides"
          title="The completing constant, added to both sides"
        />
      );
    },
    caption: (params) =>
      `The tinted line is the step that gets dropped: $${numStr((params.half ?? 3) ** 2)}$ goes onto the LEFT to make the square and onto the right to keep the equation true.`,
  },

  /** Solving by completing the square: the pair of roots, drawn. */
  "d4.pol4.complete-solve.l3": {
    Svg: (params): JSX.Element => {
      const half = params.half ?? 3;
      const root = params.root ?? 4;
      const low = params.low ?? -half - root;
      const high = params.high ?? -half + root;
      const constant = params.constant ?? half * half - root * root;
      return (
        <SolutionLineWorked
          statement={`x^{2} + ${coeffTex(2 * half)} ${signedTex(constant)} = 0`}
          // The completed square AND the set, because this slot is the figure's answer line:
          // it is drawn in `CIVIC` under the number line and its three sibling draws of
          // `SolutionLineWorked` all put the solution set there. The prompt asks for every
          // solution, so closing on `(x + 5)^{2} = 16` alone answers a question nobody asked
          // in the place the answer goes. The completed square stays in front of it because
          // it is the step the template is named for and nothing else in the figure shows it.
          solved={`(x + ${numStr(half)})^{2} = ${numStr(root * root)} \\;\\Rightarrow\\; \\{${numStr(low)}, ${numStr(high)}\\}`}
          points={[{ at: low }, { at: high }]}
          ariaLabel={`The two solutions of a quadratic solved by completing the square, at ${low} and ${high}`}
          title="A completed square, rooted both ways"
        />
      );
    },
    caption: (params) =>
      `The two marks sit one root either side of $-${numStr(params.half ?? 3)}$, which is where the bracket's constant puts the center. Nothing here needed the quadratic to split into two brackets.`,
  },

  /** The formula, where one root is a fraction and the line shows it is still a value. */
  "d4.pol4.formula.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 2;
      const p = params.p ?? 3;
      const q = params.q ?? 4;
      const b = params.b ?? a * q - p;
      const c = params.c ?? -p * q;
      return (
        <SolutionLineWorked
          statement={`${coeffTex(a, "x^{2}")} ${signedTermTex(b, "x")} ${signedTex(c)} = 0`}
          solved={`x = \\dfrac{${numStr(p)}}{${numStr(a)}} \\;\\text{ or }\\; x = -${numStr(q)}`}
          points={[
            { at: -q, label: `-${numStr(q)}` },
            // The fractional root is named by its fraction and not by the decimal the tick
            // under it carries, so it is LaTeX. `\tfrac` rather than `\dfrac`: this label sits
            // 17 units over a number line and a display fraction would stand into the
            // statement above it.
            {
              at: p / a,
              label: p % a === 0 ? numStr(p / a) : `\\tfrac{${numStr(p)}}{${numStr(a)}}`,
            },
          ]}
          ariaLabel={`The two solutions of a quadratic solved by the formula, at minus ${q} and ${p} over ${a}`}
          title="A formula solution, one root of which is a fraction"
        />
      );
    },
    caption: (params) =>
      `The whole numerator is divided by $${numStr(2 * (params.a ?? 2))}$, so a root that does not come out whole is the ordinary case rather than a sign of a mistake.`,
  },
};
