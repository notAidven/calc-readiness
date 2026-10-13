/**
 * Worked-solution figures for D6's FUN.5 practice templates: average rate of change.
 *
 * Three shapes are reduction columns and two are charts, and the split is not arbitrary. Where
 * the two readings are HANDED to the learner in the prompt, the work is a single quotient and a
 * column says it in three rows. Where the readings have to be PICKED out of a trace, choosing
 * the right pair is the difficulty, and a column of arithmetic on the correct pair skips exactly
 * the step that was hard: it shows a learner who took hour 4 instead of hour 6 a sum they never
 * wrote. So the two chart shapes get charts, with the window inked apart from the rest of the run.
 *
 * The two charts derive every reading from `params` the way the bank does: the rates and the gaps
 * are recorded, the trace is lifted until its lowest mark is positive, and the readings fall out.
 * Nothing is read off the answer key.
 */

import type { JSX } from "react";

import { BRICK, CIVIC, LABEL, SIGNAL, SOFT } from "../svgKit";
import {
  ExpressionReductionWorked,
  type ReductionRow,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";
import { D6Chart, joinedConstant, sp } from "./d6Kit";

/** The heading row both quotient columns open on, so the shape is named before it is used. */
const RATE_RULE: ReductionRow = {
  tokens: [
    {
      text: "\\text{average rate} = \\dfrac{\\text{change in reading}}{\\text{change in input}}",
      color: LABEL,
    },
  ],
};

/** A quadratic's value, as FUN.5's own generator computes it. */
function quadraticAt(a: number, b: number, c: number, x: number): number {
  return a * x * x + b * x + c;
}

export const FUN5_PRACTICE_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  /** Two readings handed over, so the whole of the work is one quotient. */
  "d6.fun5.two-readings.l1": {
    Svg: (params): JSX.Element => {
      const t1 = params.t1 ?? 2;
      const t2 = params.t2 ?? 6;
      const v1 = params.v1 ?? 5;
      const v2 = params.v2 ?? 17;
      const span = params.span ?? t2 - t1;
      const change = v2 - v1;
      const rate = params.rate ?? change / Math.max(span, 1);
      const rows: ReductionRow[] = [
        RATE_RULE,
        {
          tokens: [
            { text: `\\dfrac{${v2} - ${sp(v1)}}{${t2} - ${sp(t1)}}`, color: SIGNAL },
          ],
        },
        { tokens: [{ text: `\\dfrac{${change}}{${span}} = ${rate}`, color: CIVIC }] },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`A change of ${spoken(change)} over ${spoken(span)} hours, which is ${spoken(rate)} per hour`}
          title="Two readings, one quotient"
        />
      );
    },
    caption: (params) => {
      const rate = params.rate ?? 3;
      return `The order matters and it has to be the SAME order on both lines: the later reading minus the earlier one, over the later input minus the earlier one. Reversing one of the two and not the other flips the sign. ${rate < 0 ? "A negative rate is a falling trace, not a mistake" : "A positive rate is a climbing trace"}.`;
    },
  },

  /** No readings given at all, so the rule supplies both ends before the quotient. */
  "d6.fun5.function-rule.l2": {
    Svg: (params): JSX.Element => {
      const a = params.a ?? 1;
      const b = params.b ?? -6;
      const c = params.c ?? 4;
      const p = params.p ?? 1;
      const q = params.q ?? 4;
      const left = quadraticAt(a, b, c, p);
      const right = quadraticAt(a, b, c, q);
      const rate = params.rate ?? a * (p + q) + b;
      const lead = a === 1 ? "x^{2}" : `${a}x^{2}`;
      const mid = b === 0 ? "" : b === -1 ? " - x" : ` - ${-b}x`;
      const tail = c < 0 ? ` - ${-c}` : ` + ${c}`;
      const rows: ReductionRow[] = [
        { tokens: [{ text: `f(x) = ${lead}${mid}${tail}`, color: LABEL }] },
        { tokens: [{ text: `f(${p}) = ${left}`, color: SIGNAL }] },
        { tokens: [{ text: `f(${q}) = ${right}`, color: SIGNAL }] },
        {
          tokens: [
            {
              text: `\\dfrac{${right} - ${sp(left)}}{${q} - ${sp(p)}} = ${rate}`,
              color: CIVIC,
            },
          ],
        },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`Evaluating the rule at ${spoken(p)} for ${spoken(left)} and at ${spoken(q)} for ${spoken(right)}, an average rate of ${spoken(rate)}`}
          title="Both ends produced from the rule, then one quotient over them"
        />
      );
    },
    caption: () =>
      "An average rate over a stretch needs two OUTPUTS, and a rule gives neither of them for free, so both have to be evaluated first. The rate is not the slope of anything on the graph between them: it is the slope of the straight line joining the two ends, whatever the curve does in between.",
  },

  /** Four marks and one named window, with the pair the question asks about inked apart. */
  "d6.fun5.chart-window.l2": {
    Svg: (params): JSX.Element => {
      const t0 = params.t0 ?? 1;
      const gaps = [params.g1 ?? 3, params.g2 ?? 2, params.g3 ?? 4];
      const rates = [
        (params.n1 ?? 0) === 1 ? -(params.m1 ?? 3) : (params.m1 ?? 3),
        (params.n2 ?? 1) === 1 ? -(params.m2 ?? 2) : (params.m2 ?? 2),
        (params.n3 ?? 0) === 1 ? -(params.m3 ?? 4) : (params.m3 ?? 4),
      ];
      const which = params.which ?? 1;
      const lift = params.lift ?? 0;
      const hours = [0, 1, 2, 3].map(
        (at) => t0 + gaps.slice(0, at).reduce((sum, gap) => sum + gap, 0),
      );
      const steps = rates.map((rate, at) => rate * (gaps[at] as number));
      const relative = [0, 1, 2, 3].map((at) =>
        steps.slice(0, at).reduce((sum, value) => sum + value, 0),
      );
      const base = 2 - Math.min(...relative) + lift;
      const readings = relative.map((value) => base + value);
      const fromHour = hours[which] as number;
      const toHour = hours[which + 1] as number;
      const fromReading = readings[which] as number;
      const toReading = readings[which + 1] as number;
      const change = toReading - fromReading;
      const gap = gaps[which] as number;
      const rate = params.rate ?? change / Math.max(gap, 1);
      const marks = hours.map(
        (hour, at) => [hour, readings[at] as number] as readonly [number, number],
      );
      return (
        <D6Chart
          xMin={-(hours[3] as number) * 0.1}
          xMax={(hours[3] as number) * 1.08}
          yMin={-Math.max(...readings) * 0.14}
          yMax={Math.max(...readings) * 1.2}
          paths={marks.slice(0, -1).map((mark, index) => ({
            points: [mark, marks[index + 1] as readonly [number, number]],
            color: index === which ? CIVIC : SOFT,
          }))}
          spans={[{ from: fromHour, to: toHour, color: CIVIC }]}
          dots={[
            { x: fromHour, y: fromReading, color: CIVIC },
            { x: toHour, y: toReading, color: CIVIC },
          ]}
          labels={[
            {
              x: fromHour,
              y: fromReading,
              latex: `${fromReading}`,
              color: CIVIC,
              dx: -1,
              dy: -1,
            },
            { x: toHour, y: toReading, latex: `${toReading}`, color: CIVIC, dx: 1, dy: -1 },
          ]}
          xTicks={[fromHour, toHour]}
          footers={[
            `\\dfrac{${toReading} - ${sp(fromReading)}}{${toHour} - ${sp(fromHour)}} = \\dfrac{${change}}{${gap}}`,
            `${rate}`,
          ]}
          title="A recorder's marks, with the named window and its two readings inked apart"
          ariaLabel={`The window from hour ${spoken(fromHour)} to hour ${spoken(toHour)}, where the reading goes from ${spoken(fromReading)} to ${spoken(toReading)}, an average rate of ${spoken(rate)} per hour`}
        />
      );
    },
    caption: () =>
      "Only two of the four marks are in the question, and picking them is the work: the window's own two hours, and the readings against exactly those hours. What the trace does on either side of the window changes nothing, which is why the rest of the run is left grey.",
  },

  /** Two windows, each with its own rate, and the difference the question actually wants. */
  "d6.fun5.two-windows.l3": {
    Svg: (params): JSX.Element => {
      const t0 = params.t0 ?? 1;
      const g1 = params.g1 ?? 3;
      const g2 = params.g2 ?? 4;
      const first = params.first ?? 5;
      const second = params.second ?? -2;
      const lift = params.lift ?? 0;
      const h0 = t0;
      const h1 = t0 + g1;
      const h2 = t0 + g1 + g2;
      const d1 = first * g1;
      const d2 = second * g2;
      const base = 2 - Math.min(0, d1, d1 + d2) + lift;
      const r0 = base;
      const r1 = base + d1;
      const r2 = base + d1 + d2;
      const answer = params.answer ?? first - second;
      const top = Math.max(r0, r1, r2);
      return (
        <D6Chart
          xMin={-h2 * 0.1}
          xMax={h2 * 1.08}
          yMin={-top * 0.14}
          yMax={top * 1.2}
          paths={[
            {
              points: [
                [h0, r0],
                [h1, r1],
              ],
              color: SIGNAL,
            },
            {
              points: [
                [h1, r1],
                [h2, r2],
              ],
              color: BRICK,
            },
          ]}
          spans={[
            { from: h0, to: h1, color: SIGNAL },
            { from: h1, to: h2, color: BRICK },
          ]}
          dots={[
            { x: h0, y: r0, color: SIGNAL },
            { x: h1, y: r1, color: LABEL },
            { x: h2, y: r2, color: BRICK },
          ]}
          labels={[
            {
              x: (h0 + h1) / 2,
              y: (r0 + r1) / 2,
              latex: `${first}`,
              color: SIGNAL,
              dx: 0,
              dy: first > 0 ? 1 : -1,
            },
            {
              x: (h1 + h2) / 2,
              y: (r1 + r2) / 2,
              latex: `${second}`,
              color: BRICK,
              dx: 0,
              dy: second > 0 ? 1 : -1,
            },
          ]}
          xTicks={[h0, h1, h2]}
          footers={[`${first} - ${sp(second)}`, `${answer}`]}
          title="Two windows of one run, each with its own average rate, and the difference between them"
          ariaLabel={`A first window rating ${spoken(first)} per hour and a second rating ${spoken(second)} per hour, whose difference is ${spoken(answer)}`}
        />
      );
    },
    caption: (params) => {
      const second = params.second ?? -2;
      return `Each window gets its own quotient over its OWN pair of hours, and the two windows share the middle mark. The subtraction is then first minus second, in that order.${second < 0 ? " Taking away a negative rate ADDS, which is where this shape catches people." : ""}`;
    },
  },

  /** The rate given and a reading wanted, so the quotient is run backwards. */
  "d6.fun5.missing-reading.l3": {
    Svg: (params): JSX.Element => {
      const t1 = params.t1 ?? 2;
      const t2 = params.t2 ?? 6;
      const span = params.span ?? t2 - t1;
      const v1 = params.v1 ?? 5;
      const rate = params.rate ?? 3;
      const change = rate * span;
      const v2 = params.v2 ?? v1 + change;
      const rows: ReductionRow[] = [
        {
          tokens: [
            {
              text: "\\text{change} = \\text{average rate} \\times \\text{hours}",
              color: LABEL,
            },
          ],
        },
        { tokens: [{ text: `${sp(rate)} \\times ${span} = ${change}`, color: SIGNAL }] },
        { tokens: [{ text: `${v1}${joinedConstant(change)} = ${v2}`, color: CIVIC }] },
      ];
      return (
        <ExpressionReductionWorked
          rows={rows}
          ariaLabel={`A rate of ${spoken(rate)} over ${spoken(span)} hours is a change of ${spoken(change)}, which takes ${spoken(v1)} to ${spoken(v2)}`}
          title="A rate and a starting reading, run forward to the reading at the far end"
        />
      );
    },
    caption: (params) => {
      const span = params.span ?? 4;
      const rate = params.rate ?? 3;
      return `The quotient is being read backwards: a rate multiplied by the number of hours gives the CHANGE, and the change is then added onto the reading it started from. The hours are $${span}$, which is the gap between the two hours and not either of them.${rate < 0 ? " A negative rate means the change subtracts." : ""}`;
    },
  },
};
