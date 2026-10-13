/**
 * LF.2 worked-solution figures: write and graph line equations, parallel and perpendicular.
 *
 * Two archetypes, chosen per shape rather than uniformly. The three shapes whose answer IS
 * a position on the plane (build a line from `m` and `b`, a parallel line through a point,
 * a pair judged by their slopes) get a small coordinate plane, because the relationship
 * they teach is visible there and nowhere else: a parallel pair never converges, a
 * perpendicular pair crosses square, and the flipped-fraction pair visibly does neither.
 * The two rearrangement shapes (point-slope, and a perpendicular off a standard-form line)
 * get an `ExpressionReductionWorked` row stack, since what they teach is the order of the
 * algebra, one line per move.
 *
 * Every figure is driven only by its template's `template_params`, with a default for each,
 * and decodes the sign and kind flags exactly as `generate()` does in
 * `packages/item-bank/src/d7/nodes/LF.2/index.ts`.
 */

import type { JSX } from "react";

import {
  BRICK,
  CIVIC,
  fittingTicks,
  LABEL,
  type LabelBox,
  LINE,
  labelHalfH,
  labelHalfW,
  labelSpot,
  PlotLabel,
  plotLabelFrame,
  SOFT,
  SvgMath,
} from "../svgKit";
import {
  ExpressionReductionWorked,
  type ReductionRow,
  sp,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";

/* -------------------------------------------------------------------------- */
/* LaTeX helpers (mirrors of the item-bank formatters)                         */
/* -------------------------------------------------------------------------- */

/** `+` or `-` for a signed value, as the operator that precedes its magnitude. */
function op(value: number): string {
  return value < 0 ? "-" : "+";
}

/** The slope term as LaTeX: `3x`, `-x`, `x`. */
function slopeTermTex(m: number): string {
  if (m === 1) {
    return "x";
  }
  if (m === -1) {
    return "-x";
  }
  return `${m}x`;
}

/** A whole linear expression: `-3x + 5`, `x - 7`, `4x`. */
function lineTex(m: number, b: number): string {
  const term = slopeTermTex(m);
  return b === 0 ? term : `${term} ${op(b)} ${Math.abs(b)}`;
}

/** A slope as LaTeX, stacked when it is a genuine fraction. */
function slopeTex(num: number, den: number): string {
  return den === 1 ? `${num}` : `${num < 0 ? "-" : ""}\\dfrac{${Math.abs(num)}}{${den}}`;
}

/** A coordinate pair with the comma spaced the way KaTeX wants it. */
function pointTex(x: number, y: number): string {
  return `(${x},\\, ${y})`;
}

/* -------------------------------------------------------------------------- */
/* The coordinate plane                                                        */
/* -------------------------------------------------------------------------- */

const PLOT = { left: 44, right: 396, top: 14, bottom: 226 };
const VIEW_H = 268;
const LABEL_SIZE = 14;
const TICK_SIZE = 11;

interface PlaneLine {
  /** Slope and intercept in math units. */
  m: number;
  b: number;
  color: string;
  dashed?: boolean;
}

interface PlanePoint {
  x: number;
  y: number;
  color: string;
  /** LaTeX drawn beside the dot; omitted for an unlabelled guide point. */
  label?: string;
}

/** The first grid pitch (in math units) whose squares are still legible. */
function gridStep(unit: number): number {
  return [1, 2, 5, 10].find((candidate) => candidate * unit >= 14) ?? 20;
}

/** Multiples of `step` inside `[-half, half]`, zero excluded (the axis draws that). */
function ticksTo(half: number, step: number): number[] {
  const out: number[] = [];
  for (let value = step; value <= half; value += step) {
    out.push(value, -value);
  }
  return out.sort((a, b) => a - b);
}

/**
 * The ticks that can carry a NUMBER, measured against the plot rather than the range: this
 * plane zooms to fit its data, so the outermost tick lands wherever that zoom puts it, and
 * a number centred there can be hard against the border or half outside it.
 */
function numberedTicks(
  half: number,
  step: number,
  place: (tick: number) => number,
  extent: (tick: number) => number,
  start: number,
  end: number,
): readonly number[] {
  return fittingTicks({ ticks: ticksTo(half, step), place, half: extent, start, end });
}

/** Whether two label boxes share any space at all. */
function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return Math.abs(a.x - b.x) < a.halfW + b.halfW && Math.abs(a.y - b.y) < a.halfH + b.halfH;
}

/**
 * A small coordinate plane sized to the data it must hold. The window is symmetric about
 * the origin and uses ONE unit for both axes, so a perpendicular pair is drawn square and a
 * slope of 1 really does rise at 45 degrees; a figure whose intercept is far from the
 * origin simply zooms out rather than stretching one axis.
 */
function WorkedPlane({
  lines,
  points,
  equation,
  title,
  ariaLabel,
  stepRise,
}: {
  lines: readonly PlaneLine[];
  points?: readonly PlanePoint[];
  /** The LaTeX summary printed under the plot. */
  equation: string;
  title: string;
  ariaLabel: string;
  /** Draw the run-1 / rise-`stepRise` staircase from the first line's intercept. */
  stepRise?: number;
}): JSX.Element {
  const marks = points ?? [];
  const first = lines[0];
  // The staircase's top corner is part of the drawing, so it has to be part of the window.
  const stepTop = stepRise !== undefined && first ? [Math.abs(first.b + stepRise)] : [];
  const xSpan = Math.max(3, ...marks.map((point) => Math.abs(point.x)));
  const ySpan = Math.max(
    3,
    ...marks.map((point) => Math.abs(point.y)),
    ...lines.map((line) => Math.abs(line.b)),
    ...stepTop,
  );
  const xHalf = Math.ceil(xSpan) + 1;
  const yHalf = Math.ceil(ySpan) + 1;
  const plotW = PLOT.right - PLOT.left;
  const plotH = PLOT.bottom - PLOT.top;
  const unit = Math.min(plotW / (2 * xHalf), plotH / (2 * yHalf));
  const originX = (PLOT.left + PLOT.right) / 2;
  const originY = (PLOT.top + PLOT.bottom) / 2;
  const mapX = (x: number): number => originX + x * unit;
  const mapY = (y: number): number => originY - y * unit;
  // What the box can actually show, which is wider than the data on one axis.
  const xView = plotW / (2 * unit);
  const yView = plotH / (2 * unit);
  const step = gridStep(unit);
  // A zoomed-out window can hold more grid lines than it can hold NUMBERS, so the labels
  // thin out to every other line once they would start touching.
  const labelStep = xView / step > 12 ? step * 2 : step;
  const numberedX = numberedTicks(
    xView,
    labelStep,
    mapX,
    (tick) => labelHalfW(String(tick), TICK_SIZE),
    PLOT.left,
    PLOT.right,
  );
  const xTickBox = (tick: number): LabelBox => ({
    x: mapX(tick),
    y: originY + 11,
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  });
  const yTickBox = (tick: number): LabelBox => ({
    x: originX - 8 - labelHalfW(String(tick), TICK_SIZE),
    y: mapY(tick),
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  });
  const xTickBoxes = numberedX.map(xTickBox);
  /*
   * The two number sets share one corner, and nothing used to keep them off each other.
   *
   * This window is symmetric about the origin, so both axes run through the MIDDLE of the box:
   * the x numbers sit in a row 15 units below the horizontal axis and the y numbers in a column
   * 8 units left of the vertical one, and those two bands cross just below and left of the
   * origin. Whenever the zoom puts a unit at about 11 units — which it does on eight of this
   * node's swept draws — the y number for -1 lands on the x number for -1 and the two are
   * painted through each other. The `-1` on `parallel-point.l2` is the intercept the learner
   * has just solved for, so the illegible one is the answer.
   *
   * Thinned the way `fittingTicks` thins an edge tick, and on the same principle: a tick that
   * cannot carry a legible number does not get one. The Y column gives way rather than the X
   * row, because the row is a contiguous run a reader scans as a sequence while the column
   * already breaks at the axis. Measured against the ESTIMATED boxes, which run a little wider
   * than the ink they stand for, so this drops a label slightly before the glyphs actually
   * touch rather than slightly after.
   */
  const numberedY = numberedTicks(
    yView,
    labelStep,
    mapY,
    () => labelHalfH(TICK_SIZE),
    PLOT.top,
    PLOT.bottom,
  ).filter((tick) => !xTickBoxes.some((box) => boxesOverlap(yTickBox(tick), box)));

  /** The two visible endpoints of `y = mx + b`, in screen units. */
  const clip = (m: number, b: number): [number, number, number, number] | null => {
    const found: { x: number; y: number }[] = [];
    const add = (x: number, y: number) => {
      if (x < -xView - 1e-6 || x > xView + 1e-6 || y < -yView - 1e-6 || y > yView + 1e-6) {
        return;
      }
      if (found.some((p) => Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6)) {
        return;
      }
      found.push({ x, y });
    };
    add(-xView, -m * xView + b);
    add(xView, m * xView + b);
    if (m !== 0) {
      add((-yView - b) / m, -yView);
      add((yView - b) / m, yView);
    }
    const [start, end] = found;
    if (!start || !end) {
      return null;
    }
    return [mapX(start.x), mapY(start.y), mapX(end.x), mapY(end.y)];
  };

  const staircase =
    stepRise !== undefined && first
      ? { x0: 0, y0: first.b, x1: 1, y1: first.b + stepRise }
      : null;

  /*
   * A marked point's label is placed against the plot rather than nudged off the dot. The
   * window here is sized to the data, so where a point sits in the box changes from figure
   * to figure, and the fixed step this replaced had to be clamped to stay inside — which
   * parked the label on the axis numbers whenever the clamp bit.
   */
  const labelFrame = plotLabelFrame(PLOT, 8);
  const tickBoxes: LabelBox[] = [...numberedY.map(yTickBox), ...xTickBoxes];
  const placedLabels: { point: (typeof marks)[number]; box: LabelBox }[] = [];
  for (const point of marks.filter((mark) => mark.label !== undefined)) {
    placedLabels.push({
      point,
      box: labelSpot({
        x: mapX(point.x),
        y: mapY(point.y),
        frame: labelFrame,
        dx: 1,
        dy: -1,
        halfW: labelHalfW(point.label ?? "", LABEL_SIZE),
        halfH: labelHalfH(LABEL_SIZE),
        gap: 10,
        avoid: [...tickBoxes, ...placedLabels.map((entry) => entry.box)],
      }),
    });
  }

  return (
    <svg viewBox={`0 0 440 ${VIEW_H}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <rect
        data-plot-frame=""
        x={PLOT.left}
        y={PLOT.top}
        width={plotW}
        height={plotH}
        fill="var(--paper)"
        stroke={LINE}
        strokeWidth={1}
        rx={6}
      />
      {ticksTo(xView, step).map((tick) => (
        <line
          key={`gx${tick}`}
          x1={mapX(tick)}
          y1={PLOT.top}
          x2={mapX(tick)}
          y2={PLOT.bottom}
          stroke={LINE}
          strokeWidth={0.5}
          strokeOpacity={0.55}
        />
      ))}
      {ticksTo(yView, step).map((tick) => (
        <line
          key={`gy${tick}`}
          x1={PLOT.left}
          y1={mapY(tick)}
          x2={PLOT.right}
          y2={mapY(tick)}
          stroke={LINE}
          strokeWidth={0.5}
          strokeOpacity={0.55}
        />
      ))}
      <line
        x1={PLOT.left}
        y1={originY}
        x2={PLOT.right}
        y2={originY}
        stroke={SOFT}
        strokeWidth={1.25}
      />
      <line
        x1={originX}
        y1={PLOT.top}
        x2={originX}
        y2={PLOT.bottom}
        stroke={SOFT}
        strokeWidth={1.25}
      />

      {staircase && (
        <g>
          <line
            x1={mapX(staircase.x0)}
            y1={mapY(staircase.y0)}
            x2={mapX(staircase.x1)}
            y2={mapY(staircase.y0)}
            stroke={SOFT}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <line
            x1={mapX(staircase.x1)}
            y1={mapY(staircase.y0)}
            x2={mapX(staircase.x1)}
            y2={mapY(staircase.y1)}
            stroke={SOFT}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        </g>
      )}

      {lines.map((line) => {
        const segment = clip(line.m, line.b);
        if (!segment) {
          return null;
        }
        return (
          <line
            key={`${line.m}:${line.b}`}
            x1={segment[0]}
            y1={segment[1]}
            x2={segment[2]}
            y2={segment[3]}
            stroke={line.color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={line.dashed ? "7 5" : undefined}
          />
        );
      })}

      {numberedX.map((tick) => (
        <text
          key={`tx${tick}`}
          x={mapX(tick)}
          y={originY + 15}
          textAnchor="middle"
          fontSize={11}
          fill={SOFT}
          stroke="var(--paper)"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {tick}
        </text>
      ))}
      {numberedY.map((tick) => (
        <text
          key={`ty${tick}`}
          x={originX - 8}
          y={mapY(tick) + 4}
          textAnchor="end"
          fontSize={11}
          fill={SOFT}
          stroke="var(--paper)"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {tick}
        </text>
      ))}

      {marks.map((point, index) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: two marks may share a coordinate
          key={`p${index}:${point.x}:${point.y}`}
          cx={mapX(point.x)}
          cy={mapY(point.y)}
          r={4.5}
          fill={point.color}
        />
      ))}
      {placedLabels.map(({ point, box }, index) => (
        <PlotLabel
          // biome-ignore lint/suspicious/noArrayIndexKey: two labels may share a coordinate
          key={`l${index}:${point.x}:${point.y}`}
          box={box}
          latex={point.label ?? ""}
          fontSize={LABEL_SIZE}
          color={point.color}
        />
      ))}

      <SvgMath latex={equation} x={220} y={250} fontSize={18} color={LABEL} w={420} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Row stacks (the two rearrangement shapes)                                   */
/* -------------------------------------------------------------------------- */

/** One row of a rearrangement, its whole equation in a single token. */
function row(latex: string, color?: string): ReductionRow {
  return { tokens: [{ text: latex, ...(color === undefined ? {} : { color }) }] };
}

/** `y - y_1 = m(x - x_1)`: distribute, move the constant, combine. */
function pointSlopeRows(m: number, x1: number, y1: number, c: number): ReductionRow[] {
  const shifted = -m * x1;
  const right = `${slopeTermTex(m)} ${op(shifted)} ${Math.abs(shifted)}`;
  const left = `y ${op(-y1)} ${Math.abs(y1)}`;
  return [
    row(`${left} = ${m}(x ${op(-x1)} ${Math.abs(x1)})`, CIVIC),
    row(`${left} = ${right}`),
    row(`y = ${right} ${op(y1)} ${Math.abs(y1)}`),
    row(`y = ${lineTex(m, c)}`, CIVIC),
  ];
}

/**
 * `x + ny = k` and a point: solve for the slope, flip it, then pin the intercept.
 *
 * `solved` prints the given line the way the prompt handed it over instead of in standard
 * form. Practice always opens in standard form and passes nothing, so it reads as before;
 * LF.2's CHECK is given its line already solved for `y`, and a figure whose first row was a
 * rearrangement of that would be opening on an equation the question never wrote. Both forms
 * come out of the same params: `y = -(sa/n)x + given/n`.
 */
function perpendicularRows(
  sa: number,
  n: number,
  given: number,
  x1: number,
  y1: number,
  m: number,
  c: number,
  solved = false,
): ReductionRow[] {
  const slopeNum = n < 0 ? sa : -sa;
  const givenSlope = slopeTex(slopeNum, Math.abs(n));
  const givenTex = solved
    ? `y = ${givenSlope}x ${op(given / n)} ${Math.abs(given / n)}`
    : `${sa === 1 ? "" : "-"}x ${op(n)} ${Math.abs(n)}y = ${given}`;
  return [
    row(givenTex, CIVIC),
    row(`m_{1} = ${givenSlope}`),
    row(`m_{2} = -\\dfrac{1}{m_{1}} = ${m}`, BRICK),
    row(`b = ${y1} - ${sp(m)} \\times ${sp(x1)} = ${c}`),
    row(`y = ${lineTex(m, c)}`, CIVIC),
  ];
}

/* -------------------------------------------------------------------------- */
/* The classify pair, decoded exactly as `generate()` encodes it               */
/* -------------------------------------------------------------------------- */

interface ClassifyParts {
  slopeA: number;
  slopeB: number;
  interceptA: number;
  interceptB: number;
  slopeATex: string;
  slopeBTex: string;
  word: string;
}

function classifyParts(
  kind: number,
  p: number,
  q: number,
  sneg: number,
  b1: number,
  e: number,
): ClassifyParts {
  const s = sneg === 1 ? -1 : 1;
  const n2 = kind === 0 ? s * p : kind === 1 ? -s * q : s * q;
  const d2 = kind === 0 ? q : p;
  return {
    slopeA: (s * p) / q,
    slopeB: n2 / d2,
    interceptA: b1,
    interceptB: e,
    slopeATex: slopeTex(s * p, q),
    slopeBTex: slopeTex(n2, d2),
    word: kind === 0 ? "parallel" : kind === 1 ? "perpendicular" : "neither",
  };
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const LF2_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d7.lf2.slope-intercept.l1": {
    Svg: ({ m = 1, b = 0 }) => (
      <WorkedPlane
        lines={[{ m, b, color: CIVIC }]}
        points={[{ x: 0, y: b, color: CIVIC, label: pointTex(0, b) }]}
        stepRise={m}
        equation={`y = ${lineTex(m, b)}`}
        title="A line built from its slope and its intercept"
        ariaLabel={`A line of slope ${spoken(m)} crossing the vertical axis at ${spoken(b)}`}
      />
    ),
    caption: ({ m = 1, b = 0 }) =>
      `The slope $${m}$ is the coefficient of $x$ and the intercept $(0, ${b})$ supplies the constant, so the line is $y = ${lineTex(m, b)}$. The dashed staircase is one step of the slope.`,
  },

  "d7.lf2.parallel-point.l2": {
    Svg: ({ m = 1, b0 = 0, x1 = 0, y1 = 0, c = 0 }) => (
      <WorkedPlane
        lines={[
          { m, b: c, color: CIVIC },
          { m, b: b0, color: SOFT, dashed: true },
        ]}
        points={[{ x: x1, y: y1, color: BRICK, label: pointTex(x1, y1) }]}
        equation={`y = ${lineTex(m, c)}`}
        title="A parallel line pinned by one point"
        ariaLabel={`Two lines of slope ${spoken(m)}, the solid one passing through ${spoken(x1)} comma ${spoken(y1)}`}
      />
    ),
    caption: ({ m = 1, b0 = 0, x1 = 0, y1 = 0, c = 0 }) =>
      `Parallel keeps the slope $${m}$, so only the intercept is unknown. The dashed line is the given $y = ${lineTex(m, b0)}$, and substituting $(${x1}, ${y1})$ pins the solid one at $b = ${c}$.`,
  },

  "d7.lf2.pair-classify.l2": {
    Svg: ({ kind = 0, p = 1, q = 1, sneg = 0, b1 = 0, e = 0 }) => {
      const parts = classifyParts(kind, p, q, sneg, b1, e);
      return (
        <WorkedPlane
          lines={[
            { m: parts.slopeA, b: parts.interceptA, color: CIVIC },
            { m: parts.slopeB, b: parts.interceptB, color: BRICK },
          ]}
          equation={`m_{1} = ${parts.slopeATex}, \\;\\; m_{2} = ${parts.slopeBTex}`}
          title="Two lines compared by their slopes"
          ariaLabel={
            kind === 2
              ? "Two lines drawn together, which are neither parallel nor perpendicular"
              : `Two lines drawn together, which are ${parts.word}`
          }
        />
      );
    },
    caption: ({ kind = 0, p = 1, q = 1, sneg = 0, b1 = 0, e = 0 }) => {
      const parts = classifyParts(kind, p, q, sneg, b1, e);
      if (kind === 0) {
        return `Both slopes are $${parts.slopeATex}$ and the intercepts differ, so the lines never meet: they are parallel.`;
      }
      if (kind === 1) {
        return `The slopes $${parts.slopeATex}$ and $${parts.slopeBTex}$ multiply to $-1$, so the lines cross at a right angle: they are perpendicular.`;
      }
      return `The second slope is the first one flipped but never negated, so $${parts.slopeATex}$ and $${parts.slopeBTex}$ multiply to $1$ rather than $-1$, and the lines are neither parallel nor perpendicular.`;
    },
  },

  "d7.lf2.point-slope.l3": {
    Svg: ({ m = 1, x1 = 0, y1 = 0, c = 0 }) => (
      <ExpressionReductionWorked
        rows={pointSlopeRows(m, x1, y1, c)}
        title="Point-slope form rearranged into slope-intercept form"
        ariaLabel={`Distributing ${spoken(m)} and moving the constant turns the point-slope equation into y equals ${spoken(m)} x plus ${spoken(c)}`}
      />
    ),
    caption: ({ m = 1, x1 = 0, y1 = 0, c = 0 }) =>
      `Distributing the slope across $(x ${op(-x1)} ${Math.abs(x1)})$ and then moving $${Math.abs(y1)}$ across the equals sign leaves $y = ${lineTex(m, c)}$. The slope never changed; only the constant did.`,
  },

  "d7.lf2.perpendicular-standard.l3": {
    Svg: ({ sa = 1, n = 2, given = 0, x1 = 0, y1 = 0, m = 1, c = 0, solved = 0 }) => (
      <ExpressionReductionWorked
        rows={perpendicularRows(sa, n, given, x1, y1, m, c, solved === 1)}
        title={
          solved === 1
            ? "A perpendicular line through a given point"
            : "A perpendicular line off a standard-form equation"
        }
        ariaLabel={`${solved === 1 ? "Reading the first slope off the given line" : "Solving for y gives the first slope"}, its negative reciprocal is ${spoken(m)}, and the point fixes the intercept at ${spoken(c)}`}
      />
    ),
    caption: ({ sa = 1, n = 2, m = 1, x1 = 0, y1 = 0, c = 0, solved = 0 }) => {
      const slopeNum = n < 0 ? sa : -sa;
      const read =
        solved === 1
          ? `The given line already reads $y = mx + b$, so its slope is the number multiplying $x$: $${slopeTex(slopeNum, Math.abs(n))}$`
          : `Solved for $y$, the given line has slope $${slopeTex(slopeNum, Math.abs(n))}$`;
      return `${read}. Its negative reciprocal is $${m}$ -- the fraction turns over AND the sign changes, since flipping alone would leave the new line running the same way as the old one. Substituting $(${x1}, ${y1})$ then fixes the intercept at $${c}$.`;
    },
  },
};
