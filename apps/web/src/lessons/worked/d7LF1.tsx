/**
 * Worked-solution figures for the D7 LF.1 practice templates (slope as a constant rate of
 * change, and the sign of that rate as the line's behavior).
 *
 * Four of the five shapes reduce to a short stack of rows, which is exactly what
 * `ExpressionReductionWorked` draws: name the two changes, then divide. The classify shape
 * is the odd one out, because its answer is a WORD rather than a value, so it gets a small
 * coordinate figure that shows the two points, the rise-and-run triangle between them, and
 * the direction the segment travels.
 *
 * Every figure is driven only by its own template's `template_params`, with a default for
 * each one, and decodes the same flags `generate()` encoded (`up`, `kind`, `order`). Rows
 * that could print the same value on both sides of an equals sign go through `reduceTail`,
 * which appends the reduced form only when reducing changes something.
 */

import type { JSX } from "react";

import {
  BRICK,
  CIVIC,
  LABEL,
  LINE,
  labelHalfH,
  labelHalfW,
  labelSpot,
  PlotLabel,
  plotLabelFrame,
  SIGNAL,
  SOFT,
  SvgMath,
} from "../svgKit";
import {
  ExpressionReductionWorked,
  frac,
  fracTex,
  type ReductionRow,
  reduceTail,
  sp,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";

/* -------------------------------------------------------------------------- */
/* Row builders                                                                */
/* -------------------------------------------------------------------------- */

/** An ordered pair, spaced the way the lesson diagrams space one. */
function point(x: number, y: number): string {
  return `(${x},\\, ${y})`;
}

/** L1: four points on one row, then the two steps, then the ratio. */
function tableRateRows(x0: number, y0: number, step: number, m: number): ReductionRow[] {
  const pairs = [0, 1, 2, 3]
    .map((index) => point(x0 + index * step, y0 + index * step * m))
    .join(" \\;\\; ");
  const dy = step * m;
  return [
    { tokens: [{ text: pairs, color: SOFT }] },
    { tokens: [{ text: `\\Delta x = ${step}`, color: CIVIC }] },
    { tokens: [{ text: `\\Delta y = ${dy}`, color: BRICK }] },
    { tokens: [{ text: `m = ${reduceTail(dy, step)}` }] },
  ];
}

/** L2a: the run, the rise, the definition, the value. */
function riseRunRows(run: number, rise: number): ReductionRow[] {
  return [
    { tokens: [{ text: `\\text{run} = ${run}`, color: CIVIC }] },
    { tokens: [{ text: `\\text{rise} = ${rise}`, color: BRICK }] },
    { tokens: [{ text: `m = ${frac("\\text{rise}", "\\text{run}")}` }] },
    { tokens: [{ text: `m = ${reduceTail(rise, run)}` }] },
  ];
}

/** L3a: the formula, the substitution in matching order, the reduced value. */
function twoPointRows(x1: number, y1: number, dx: number, dy: number): ReductionRow[] {
  return [
    { tokens: [{ text: `m = ${frac("y_2 - y_1", "x_2 - x_1")}`, color: SOFT }] },
    {
      tokens: [
        {
          text: `m = ${frac(`${y1 + dy} - ${sp(y1)}`, `${x1 + dx} - ${sp(x1)}`)}`,
          color: CIVIC,
        },
      ],
    },
    { tokens: [{ text: `m = ${reduceTail(dy, dx)}` }] },
  ];
}

/** L3b: the change in time, the change in the quantity, the rate. */
function rateContextRows(
  symbol: string,
  t1: number,
  t2: number,
  v1: number,
  v2: number,
): ReductionRow[] {
  const dt = t2 - t1;
  const dv = v2 - v1;
  return [
    { tokens: [{ text: `\\Delta t = ${t2} - ${sp(t1)} = ${dt}`, color: CIVIC }] },
    {
      tokens: [{ text: `\\Delta ${symbol} = ${v2} - ${sp(v1)} = ${dv}`, color: BRICK }],
    },
    { tokens: [{ text: `m = ${reduceTail(dv, dt === 0 ? 1 : dt)}` }] },
  ];
}

/* -------------------------------------------------------------------------- */
/* L2b: the classify figure                                                    */
/* -------------------------------------------------------------------------- */

const FRAME = { left: 60, right: 380, top: 24, bottom: 172 };
const LABEL_SIZE = 13;

/**
 * Two points, the segment between them, and the rise-and-run triangle that decides the
 * sign. The scale is the SAME on both axes (the smaller of the two fits), so a gentle
 * slope still looks gentle: the figure would otherwise argue against the very reading it
 * is illustrating.
 */
export function DirectionFigure({
  x1,
  y1,
  x2,
  y2,
  verdict,
  answer,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  verdict: string;
  /**
   * A closing line naming the whole answer, for LF.1's CHECK, which asks for the slope AND the
   * word in one field. Omitted by the practice shape, whose question is the word alone, so
   * without it the figure is exactly what it was: the rise-and-run footer and nothing under it.
   */
  answer?: string;
}): JSX.Element {
  const xMin = Math.min(x1, x2) - 1;
  const xMax = Math.max(x1, x2) + 1;
  const yMin = Math.min(y1, y2) - 1;
  const yMax = Math.max(y1, y2) + 1;
  const scale = Math.min(
    (FRAME.right - FRAME.left) / (xMax - xMin),
    (FRAME.bottom - FRAME.top) / (yMax - yMin),
  );
  const midX = (xMin + xMax) / 2;
  const midY = (yMin + yMax) / 2;
  const cx = (FRAME.left + FRAME.right) / 2;
  const cy = (FRAME.top + FRAME.bottom) / 2;
  const px = (x: number): number => cx + (x - midX) * scale;
  const py = (y: number): number => cy - (y - midY) * scale;
  const rise = y2 - y1;
  const run = x2 - x1;

  /*
   * The two coordinate labels are placed rather than nudged: this window is sized to the
   * pair it is given, so a point can end up anywhere in the box, and the fixed step below
   * or above the dot took the label outside the frame for a point near an edge.
   *
   * Each takes the side of the segment away from the other, and the second clears the first
   * so a short segment cannot stack them.
   */
  const labelFrame = plotLabelFrame(FRAME, 8);
  const firstTex = point(x1, y1);
  const secondTex = point(x2, y2);
  const firstBox = labelSpot({
    x: px(x1),
    y: py(y1),
    frame: labelFrame,
    dx: run > 0 ? -1 : 1,
    dy: rise >= 0 ? 1 : -1,
    halfW: labelHalfW(firstTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
  });
  const secondBox = labelSpot({
    x: px(x2),
    y: py(y2),
    frame: labelFrame,
    dx: run > 0 ? 1 : -1,
    dy: rise >= 0 ? -1 : 1,
    halfW: labelHalfW(secondTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 10,
    avoid: [firstBox],
  });

  return (
    <svg
      viewBox={`0 0 440 ${answer === undefined ? 232 : 262}`}
      role="img"
      aria-label={`A segment from ${spoken(x1)}, ${spoken(y1)} to ${spoken(x2)}, ${spoken(y2)}, with a rise of ${spoken(rise)} over a run of ${spoken(run)}, so the line is ${verdict}`}
    >
      <title>Two points and the direction of the line through them</title>

      <rect
        data-plot-frame=""
        x={FRAME.left}
        y={FRAME.top}
        width={FRAME.right - FRAME.left}
        height={FRAME.bottom - FRAME.top}
        fill="var(--paper)"
        stroke={LINE}
        strokeWidth={1}
        rx={6}
      />

      <line
        x1={px(x1)}
        y1={py(y1)}
        x2={px(x2)}
        y2={py(y1)}
        stroke={SIGNAL}
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      {rise !== 0 && (
        <line
          x1={px(x2)}
          y1={py(y1)}
          x2={px(x2)}
          y2={py(y2)}
          stroke={BRICK}
          strokeWidth={2}
          strokeDasharray="5 4"
        />
      )}
      <line
        x1={px(x1)}
        y1={py(y1)}
        x2={px(x2)}
        y2={py(y2)}
        stroke={CIVIC}
        strokeWidth={2.5}
      />
      <circle cx={px(x1)} cy={py(y1)} r={5} fill={LABEL} />
      <circle cx={px(x2)} cy={py(y2)} r={5} fill={LABEL} />

      <PlotLabel box={firstBox} latex={firstTex} fontSize={LABEL_SIZE} color={LABEL} />
      <PlotLabel box={secondBox} latex={secondTex} fontSize={LABEL_SIZE} color={LABEL} />
      <SvgMath
        latex={`\\text{rise} = ${rise}, \\;\\; \\text{run} = ${run}`}
        x={220}
        y={206}
        fontSize={17}
        color={SOFT}
        w={400}
      />
      {answer !== undefined && (
        <SvgMath latex={answer} x={220} y={238} fontSize={17} color={CIVIC} w={400} />
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const LF1_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d7.lf1.table-rate.l1": {
    Svg: ({ x0 = 0, y0 = 0, step = 1, m = 1 }) => (
      <ExpressionReductionWorked
        rows={tableRateRows(x0, y0, step, m)}
        title="Read a constant rate off a table"
        ariaLabel={`Every step of ${step} in x changes y by ${spoken(step * m)}, so the slope is ${spoken(m)}`}
      />
    ),
    caption: ({ step = 1, m = 1 }) =>
      `Each step of $${step}$ in $x$ changes $y$ by $${step * m}$, the same every time, so the line has one slope: $m = ${m}$.`,
  },

  "d7.lf1.rise-run.l2": {
    Svg: ({ run = 1, riseMag = 0, up = 0 }) => {
      const rise = up === 1 ? riseMag : -riseMag;
      return (
        <ExpressionReductionWorked
          rows={riseRunRows(run, rise)}
          title="Slope from a rise and a run"
          ariaLabel={`A run of ${spoken(run)} with a rise of ${spoken(rise)} gives a slope of ${fracTex(rise, run)}`}
        />
      );
    },
    caption: ({ run = 1, riseMag = 0, up = 0 }) => {
      const rise = up === 1 ? riseMag : -riseMag;
      return `Rise over run: $m = ${fracTex(rise, run, true)}$, so the line ${up === 1 ? "rises" : "falls"} from left to right.`;
    },
  },

  "d7.lf1.direction.l2": {
    Svg: ({ x1 = 0, y1 = 0, dx = 1, dy = 0 }) => (
      <DirectionFigure
        x1={x1}
        y1={y1}
        x2={x1 + dx}
        y2={y1 + dy}
        verdict={dy === 0 ? "constant" : dy > 0 ? "increasing" : "decreasing"}
      />
    ),
    caption: ({ dy = 0 }) =>
      dy === 0
        ? "The two points sit at the same height, so the rise is $0$ and the slope is $0$: the line is constant."
        : dy > 0
          ? `Reading left to right, $y$ climbs by $${dy}$, so the slope is positive and the line is increasing.`
          : `Reading left to right, $y$ drops by $${-dy}$, so the slope is negative and the line is decreasing.`,
  },

  "d7.lf1.two-point.l3": {
    Svg: ({ x1 = 0, y1 = 0, dx = 1, dy = 0 }) => (
      <ExpressionReductionWorked
        rows={twoPointRows(x1, y1, dx, dy)}
        title="Slope from two points"
        ariaLabel={`Subtracting in the same order gives ${spoken(dy)} over ${spoken(dx)}, which is ${fracTex(dy, dx)}`}
      />
    ),
    caption: ({ dx = 1, dy = 0 }) =>
      `Both differences run from the left point to the right point, giving $m = ${fracTex(dy, dx, true)}$, so the line ${dy > 0 ? "rises" : "falls"}.`,
  },

  "d7.lf1.rate-context.l3": {
    Svg: ({ kind = 0, t1 = 0, t2 = 1, v1 = 0, v2 = 0 }) => (
      <ExpressionReductionWorked
        rows={rateContextRows(kind === 0 ? "d" : "w", t1, t2, v1, v2)}
        title="A constant rate of change from two readings"
        ariaLabel={`A change of ${spoken(v2 - v1)} over ${spoken(t2 - t1)} gives a rate of ${spoken(t2 === t1 ? 0 : (v2 - v1) / (t2 - t1))}`}
      />
    ),
    caption: ({ kind = 0, t1 = 0, t2 = 1, v1 = 0, v2 = 0, rate = 0 }) =>
      `The ${kind === 0 ? "distance" : "amount of water"} changes by $${v2 - v1}$ ${kind === 0 ? "miles" : "gallons"} over $${t2 - t1}$ ${kind === 0 ? "hours" : "minutes"}, so the constant rate is $${rate}$ ${kind === 0 ? "miles per hour" : "gallons per minute"}.`,
  },
};
