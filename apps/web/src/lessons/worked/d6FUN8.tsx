/**
 * Worked-solution figures for D6's FUN.8 practice templates: inverse functions.
 *
 * Three figures, three shapes, and the split follows what each question is actually about.
 *
 * The L1 swap is a LEDGER, because the prompt is a table and the inverse is that table read right
 * to left. Drawing it as algebra would invent a rule the learner was never given; drawing the
 * table with the pair the answer comes from picked out shows the swap as the one move it is.
 *
 * The three algebraic shapes are reduction columns, since swapping and solving IS a chain of moves
 * on an equation, and the column is what this tree draws that with.
 *
 * The last shape is a PLANE, and it has to be. Its question is why a rule has no inverse, and the
 * answer is that two different inputs reach the same output — a fact about the SHAPE of the graph.
 * A parabola with a horizontal line cutting it twice says that in one picture; a column of algebra
 * can only assert it.
 */

import type { JSX } from "react";

import { BRICK, CIVIC, LABEL, SIGNAL, SOFT } from "../svgKit";
import {
  ExpressionReductionWorked,
  type ReductionRow,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";
import { D6Chart, D6Ledger, type LedgerRow, parabolaArc, pointTex } from "./d6Kit";

/** `+` or `-`, as FUN.8's own generator picks an operator for a signed constant. */
function op(value: number): string {
  return value < 0 ? "-" : "+";
}

/** `4x - 7`, with a zero constant left off entirely. */
function lineTex(m: number, b: number): string {
  return b === 0 ? `${m}x` : `${m}x ${op(b)} ${Math.abs(b)}`;
}

export const FUN8_PRACTICE_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** The works ledger, read backwards from the reading to the setting that produced it. */
  "d6.fun8.table-swap.l1": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const b = params.b ?? 4;
      const start = params.start ?? 2;
      const step = params.step ?? 3;
      const target = params.target ?? 2;
      const settings = [0, 1, 2, 3].map((index) => start + index * step);
      const readings = settings.map((setting) => a * setting + b);
      const setting = settings[target] ?? start;
      const reading = readings[target] ?? a * start + b;
      const rows: LedgerRow[] = settings.map((value, index) => ({
        cells: [`${value}`, `${readings[index]}`],
        tone: index === target ? "pick" : undefined,
      }));
      return (
        <D6Ledger
          columns={["\\text{setting}", "\\text{reading it returns}"]}
          rows={rows}
          footers={[`f(${setting}) = ${reading}`, `f^{-1}(${reading}) = ${setting}`]}
          title="The ledger of settings and readings, with the row the reading names picked out"
          ariaLabel={`A ledger in which the setting ${spoken(setting)} returns ${spoken(reading)}, so the inverse of ${spoken(reading)} is ${spoken(setting)}`}
        />
      );
    },
    caption: (params) => {
      const a = params.a ?? 3;
      const b = params.b ?? 4;
      const start = params.start ?? 2;
      const step = params.step ?? 3;
      const target = params.target ?? 2;
      const setting = start + target * step;
      const reading = a * setting + b;
      return `An inverse asks the table's question backwards: not "what does setting $${setting}$ return" but "which setting returned $${reading}$". So the reading is looked up in the RIGHT column and the answer read off the left. Reporting $${reading}$ itself, or the reading in the row you happened to start at, are the two ways this goes wrong.`;
    },
  },

  /** The rule set equal to the gauge reading and unwound, which is the inverse at one value. */
  "d6.fun8.inverse-value.l2": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 4;
      const b = params.b ?? -5;
      const input = params.input ?? 3;
      const output = params.output ?? a * input + b;
      const rows: ReductionRow[] = [
        { tokens: [{ text: `f(x) = ${lineTex(a, b)}`, color: LABEL }] },
        { tokens: [{ text: `${lineTex(a, b)} = ${output}`, color: SIGNAL }] },
        { tokens: [{ text: `${a}x = ${output - b}`, color: SIGNAL }] },
        { tokens: [{ text: `f^{-1}(${output}) = ${input}`, color: CIVIC }] },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Solving ${spoken(a)} x ${b < 0 ? "minus" : "plus"} ${spoken(Math.abs(b))} equals ${spoken(output)}, so the inverse of ${spoken(output)} is ${spoken(input)}`}
          title="One reading run backwards through the rule"
        />
      );
    },
    caption: (params) => {
      const b = params.b ?? -5;
      const output = params.output ?? 7;
      return `$f^{-1}(${output})$ does not ask for a rule; it asks which INPUT produces $${output}$. So the whole job is solving one equation, undoing the moves in reverse order: the ${b < 0 ? `$-${Math.abs(b)}$ that went on last comes off first` : `$+${b}$ that went on last comes off first`}, and only then is the coefficient divided away.`;
    },
  },

  /** A grouped rule, swapped and solved by clearing the denominator first. */
  "d6.fun8.swap-solve-group.l2": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const c = params.c ?? 5;
      const inside = params.inside ?? 1;
      const sign = inside === 1 ? "+" : "-";
      const constant = inside === 1 ? -c : c;
      const rows: ReductionRow[] = [
        { tokens: [{ text: `y = \\dfrac{x ${sign} ${c}}{${a}}`, color: LABEL }] },
        { tokens: [{ text: `x = \\dfrac{y ${sign} ${c}}{${a}}`, color: SIGNAL }] },
        { tokens: [{ text: `${a}x = y ${sign} ${c}`, color: SIGNAL }] },
        {
          tokens: [
            {
              text: `f^{-1}(x) = ${a}x ${constant < 0 ? "-" : "+"} ${Math.abs(constant)}`,
              color: CIVIC,
            },
          ],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Swapping the letters and solving gives the inverse ${spoken(a)} x ${constant < 0 ? "minus" : "plus"} ${spoken(Math.abs(constant))}`}
          title="A grouped rule inverted by swapping the letters, then solving"
        />
      );
    },
    caption: (params) => {
      const a = params.a ?? 3;
      const c = params.c ?? 5;
      const inside = params.inside ?? 1;
      return `Swapping $x$ and $y$ is the whole idea of an inverse, and everything after it is ordinary solving. Multiplying by $${a}$ clears the denominator in one move, and the $${c}$ then crosses over, ${inside === 1 ? "changing from a plus to a minus" : "changing from a minus to a plus"}. Keeping its old sign is the near miss.`;
    },
  },

  /** A rule with the constant outside the fraction, so the multiplication distributes. */
  "d6.fun8.swap-solve-divide.l3": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 3;
      const b = params.b ?? 4;
      const outside = params.outside ?? 1;
      const sign = outside === 1 ? "+" : "-";
      const undone = outside === 1 ? "-" : "+";
      const constant = outside === 1 ? -a * b : a * b;
      const rows: ReductionRow[] = [
        { tokens: [{ text: `y = \\dfrac{x}{${a}} ${sign} ${b}`, color: LABEL }] },
        { tokens: [{ text: `x = \\dfrac{y}{${a}} ${sign} ${b}`, color: SIGNAL }] },
        { tokens: [{ text: `x ${undone} ${b} = \\dfrac{y}{${a}}`, color: SIGNAL }] },
        { tokens: [{ text: `y = ${a}(x ${undone} ${b})`, color: BRICK }] },
        {
          tokens: [
            {
              text: `f^{-1}(x) = ${a}x ${constant < 0 ? "-" : "+"} ${Math.abs(constant)}`,
              color: CIVIC,
            },
          ],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Swapping the letters, moving the constant and multiplying by ${spoken(a)} gives the inverse ${spoken(a)} x ${constant < 0 ? "minus" : "plus"} ${spoken(Math.abs(constant))}`}
          title="A rule with the constant outside the fraction, inverted in two moves"
        />
      );
    },
    caption: (params) => {
      const a = params.a ?? 3;
      const b = params.b ?? 4;
      return `The constant is OUTSIDE the fraction here, so it comes off before the $${a}$ goes on, and the $${a}$ then multiplies both terms in the bracket: $${a} \\times ${b} = ${a * b}$. Multiplying only the $x$ and leaving the $${b}$ alone is the slip this shape is built to catch, and it is the difference between $${a * b}$ and $${b}$ in the answer.`;
    },
  },

  /** The parabola, with one height cutting it twice, which is why there is no inverse. */
  "d6.fun8.not-one-to-one.l3": {
    Svg: (params): JSX.Element => {
      const h = params.h ?? 3;
      const gap = params.gap ?? 4;
      const side = params.side ?? 1;
      const k = params.k ?? 2;
      const given = side === 1 ? h + gap : h - gap;
      const twin = side === 1 ? h - gap : h + gap;
      const output = gap * gap + k;
      const span = gap * 1.25;
      const armTop = span * span + k;
      const pad = Math.max(2, (armTop - k) * 0.16);
      return (
        <D6Chart
          xMin={h - span - 1}
          xMax={h + span + 1}
          yMin={k - pad}
          yMax={armTop + pad}
          paths={[
            { points: parabolaArc(h, k, span), color: SIGNAL },
            // Only as wide as the arc, so it reads as the height the two settings share and
            // not as a rule across the window.
            {
              points: [
                [h - span, output],
                [h + span, output],
              ],
              color: SOFT,
              dashed: true,
            },
            {
              points: [
                [h, k],
                [h, output],
              ],
              color: SOFT,
              dashed: true,
            },
          ]}
          dots={[
            { x: h, y: k, color: LABEL, hollow: true },
            { x: given, y: output, color: SOFT },
            { x: twin, y: output, color: CIVIC },
          ]}
          labels={[
            {
              x: given,
              y: output,
              latex: pointTex(given, output),
              color: SOFT,
              dx: given > twin ? 1 : -1,
              dy: -1,
            },
            {
              x: twin,
              y: output,
              latex: pointTex(twin, output),
              color: CIVIC,
              dx: twin > given ? 1 : -1,
              dy: -1,
            },
          ]}
          xTicks={[twin, h, given]}
          yTicks={[output]}
          footers={[`${gap} \\text{ either side of } x = ${h}`, `${twin}`]}
          title="A parabola cut twice at one height, which is why the rule cannot be run backwards"
          ariaLabel={`A parabola whose axis is at ${spoken(h)}, cut at the height ${spoken(output)} by the settings ${spoken(given)} and ${spoken(twin)}`}
        />
      );
    },
    caption: (params) => {
      const h = params.h ?? 3;
      const gap = params.gap ?? 4;
      const output = gap * gap + (params.k ?? 2);
      return `The dashed rule is drawn at $${output}$ and crosses the curve TWICE, which is the whole reason this machine cannot be run backwards: handed $${output}$, an inverse would have no way to choose between the two settings. The bracket is zero at $x = ${h}$, and squaring treats a step of $${gap}$ to the left exactly like a step of $${gap}$ to the right.`;
    },
  },
};
