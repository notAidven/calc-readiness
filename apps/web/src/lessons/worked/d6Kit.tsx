/**
 * The four figures D6's fifty-five practice worked solutions are drawn with, plus the LaTeX
 * builders they share.
 *
 * ## Why a kit rather than fifty-five figures
 *
 * D6 is eleven nodes of five shapes each, and the shapes repeat ACROSS nodes rather than
 * within them: CG.1's midpoint, FUN.4's strip chart, FUN.9's translated point and FUN.10's vee
 * are four different questions about one picture, a plane with marks on it. Grouped by problem
 * SHAPE instead of by node, the domain comes to six archetypes, and only three of them are new
 * here — the other three are `ExpressionReductionWorked` (eighteen algebraic chains), D3's
 * `SolutionLineWorked` (FUN.2's five intervals, which are answers about a SHAPE and so want the
 * figure this tree already draws a shape on) and `D6Chart` below, lifted out of `cfuD6.tsx`
 * where three check figures had been sharing it privately.
 *
 * ## The three that are new, and what each is for
 *
 * - {@link D6BreakLine} — FUN.3. A piecewise value is decided by WHICH stretch owns the input,
 *   and the strictness of the two inequalities is the whole content of three of its five
 *   shapes. A column of algebra cannot show an input sitting exactly on a break with one
 *   stretch's endpoint filled and the other's hollow; a line can, and the filled/hollow
 *   endpoint is the same notation FUN.2's intervals use two files over.
 * - {@link D6Chain} — FUN.7. Composition does not commute, and every one of its five shapes is
 *   built so the other order gives a different answer. Two boxes with the carried value on the
 *   arrow between them says "this one ran first" in a way a stack of rows does not.
 * - {@link D6Ledger} — FUN.1's log count and FUN.8's swap. Both are TABLES in the prompt, and
 *   the reading is a per-row verdict, so the figure is the table with the verdicts in it.
 *
 * ## Where the tick numbers went
 *
 * `D6Chart` used to print its axis numbers INSIDE the plot when the window held no origin
 * (`PLOT.bottom - 9`), which was invisible while no D6 figure was in `plotLayout.test.tsx`'s
 * sweep and is 0.15 user units from failing it: an 11pt number's ink centre landed 12.85 from
 * the bottom edge against a bar of 13.0. Bringing D6 into that sweep is the point of this
 * round, so the numbers now sit in the MARGIN on both axes, connected to the frame by a stub,
 * which is where a framed plot conventionally puts them anyway. That is also why they are
 * exempt from the border-tick rule rather than merely passing it: the rule is scoped to text
 * inside the box, because a plane is free to caption its own margin.
 */

import type { JSX } from "react";

import {
  BRICK,
  CIVIC,
  type LabelBox,
  LABEL,
  labelHalfH,
  labelHalfW,
  labelSpot,
  LINE,
  PlotLabel,
  plotLabelFrame,
  SIGNAL,
  SOFT,
  SvgMath,
} from "../svgKit";

/* --------------------------------------------------------------- shared LaTeX builders */

/** `x - 3` or `x + 3`, so a negative shift never prints as `x - -3`. */
export function shiftedInput(shift: number, variable = "x"): string {
  return shift < 0 ? `${variable} + ${-shift}` : `${variable} - ${shift}`;
}

/** ` + 5` or ` - 5`, for a constant joined onto a term already written. */
export function joinedConstant(value: number): string {
  return value < 0 ? ` - ${-value}` : ` + ${value}`;
}

/** A signed value with negatives parenthesized, so `4 \times (-3)` reads as one product. */
export function sp(value: number): string {
  return value < 0 ? `(-${-value})` : `${value}`;
}

/** A coordinate pair with the comma spaced the way KaTeX wants it. */
export function pointTex(x: number, y: number): string {
  return `(${x},\\, ${y})`;
}

/** `\lvert x - 3 \rvert`, grown so the bars are as tall as whatever sits between them. */
export function barsTex(inside: string): string {
  return `\\left\\lvert ${inside} \\right\\rvert`;
}

/** A coefficient as it is written in front of a term: `1` vanishes and `-1` is a bare minus. */
export function coeffTex(value: number): string {
  if (value === 1) {
    return "";
  }
  return value === -1 ? "-" : `${value}`;
}

/* ------------------------------------------------------------------------ the D6 plane */

const PLOT = { left: 52, right: 396, top: 14, bottom: 186 };
/**
 * How much wider the plot box is than it is tall.
 *
 * Exported for the callers that pass `square`, because there the box's shape is theirs to
 * match: `square` makes the drawn unit the SMALLER of the two scales, so a window whose own
 * ratio is not this one is drawn at the scale of its tighter axis and leaves the surplus on
 * the other axis as blank paper inside the frame.
 */
export const PLOT_ASPECT = (PLOT.right - PLOT.left) / (PLOT.bottom - PLOT.top);
/** Where the first line of math under the plot is centred, and the pitch between lines. */
const FOOT_TOP = 232;
const FOOT_PITCH = 34;
const LABEL_SIZE = 14;
const TICK_SIZE = 11;
/** How far below the frame an x-axis number's baseline sits, and how far left a y one's edge. */
const X_TICK_DROP = 17;
const Y_TICK_INSET = 9;

export interface ChartPath {
  /** The polyline's corners, in math units. */
  points: readonly (readonly [number, number])[];
  color: string;
  dashed?: boolean;
}

export interface ChartDot {
  x: number;
  y: number;
  color: string;
  /** A ring rather than a disc, for a point the figure names but does not claim. */
  hollow?: boolean;
}

export interface ChartLabel {
  x: number;
  y: number;
  latex: string;
  color: string;
  /** Which way the label prefers to sit from its point. */
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
}

/** An arrow from one plotted point to another: where a transformation sent something. */
export interface ChartArrow {
  from: readonly [number, number];
  to: readonly [number, number];
  color: string;
  dashed?: boolean;
}

/** A stretch of the horizontal axis, drawn as a bar just above the plot floor. */
export interface ChartSpan {
  from: number;
  to: number;
  color: string;
}

/**
 * A plane sized to the data it is handed, with the answer typeset underneath it.
 *
 * The window is passed in rather than derived, because the figures that share this want
 * different margins around different things: a right triangle wants its legs square to each
 * other, and a strip chart wants its hours spread across the width whatever its readings do.
 * So `square` is an option, and it is on for exactly the figures whose shape is a claim.
 *
 * Labels go through `labelSpot` against the plot frame, each one avoiding the boxes already
 * placed, because these figures are re-rendered for every draw and a fixed offset puts a
 * coordinate pair on top of the last one as soon as the point moves.
 */
export function D6Chart({
  xMin,
  xMax,
  yMin,
  yMax,
  square = false,
  grid = false,
  paths,
  dots = [],
  labels = [],
  arrows = [],
  spans = [],
  xTicks = [],
  yTicks = [],
  footers,
  title,
  ariaLabel,
}: {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  square?: boolean;
  /**
   * Faint unit gridlines. On for the figures whose ARGUMENT is the grid — a leg counted off in
   * squares, a midpoint read as a step — and off elsewhere, because a grid behind a chart whose
   * axes are hours and readings is fifty lines that mean nothing.
   */
  grid?: boolean;
  paths: readonly ChartPath[];
  dots?: readonly ChartDot[];
  labels?: readonly ChartLabel[];
  arrows?: readonly ChartArrow[];
  spans?: readonly ChartSpan[];
  xTicks?: readonly number[];
  yTicks?: readonly number[];
  /** Typeset lines under the plot; the last one is the answer and is drawn in `CIVIC`. */
  footers: readonly string[];
  title: string;
  ariaLabel: string;
}): JSX.Element {
  const plotW = PLOT.right - PLOT.left;
  const plotH = PLOT.bottom - PLOT.top;
  const rawX = plotW / Math.max(xMax - xMin, 1e-6);
  const rawY = plotH / Math.max(yMax - yMin, 1e-6);
  const unitX = square ? Math.min(rawX, rawY) : rawX;
  const unitY = square ? Math.min(rawX, rawY) : rawY;
  const midX = (xMin + xMax) / 2;
  const midY = (yMin + yMax) / 2;
  const mapX = (x: number): number => (PLOT.left + PLOT.right) / 2 + (x - midX) * unitX;
  const mapY = (y: number): number => (PLOT.top + PLOT.bottom) / 2 - (y - midY) * unitY;
  /*
   * An axis is drawn only where the window HOLDS the origin. Clamping it to the plot's edge
   * instead is how a border line comes to read as an axis it is not: FUN.10's vee is windowed
   * around its own corner, so a `y = 0` pinned to the floor claimed the arms came down to zero
   * when the draw put them at 4.
   *
   * A zero that lands ON the edge of its own accord is the same misreading from the other side,
   * so it is dropped as well. A window sized to the box rather than to the data can put the
   * origin just inside a frame it has no business decorating — CG.1's distance draws do it, and
   * the result was a heavy unlabelled line a finger's width from the border, indistinguishable
   * from a doubled frame. The clearance is enough to clear the frame's own corner radius and
   * tick stubs and still read as a line of its own.
   */
  const AXIS_EDGE_CLEARANCE = 20;
  const showHAxis =
    yMin < 0 &&
    yMax > 0 &&
    mapY(0) - PLOT.top >= AXIS_EDGE_CLEARANCE &&
    PLOT.bottom - mapY(0) >= AXIS_EDGE_CLEARANCE;
  const showVAxis =
    xMin < 0 &&
    xMax > 0 &&
    mapX(0) - PLOT.left >= AXIS_EDGE_CLEARANCE &&
    PLOT.right - mapX(0) >= AXIS_EDGE_CLEARANCE;
  const hAxisY = showHAxis ? mapY(0) : PLOT.bottom;
  const vAxisX = showVAxis ? mapX(0) : PLOT.left;

  /**
   * Ticks whose numbers fit where they are put, nearest-first, each clearing the ones already
   * kept. Two ticks a learner cannot read apart are worse than one tick, and a window sized to
   * the data can put any two of them anywhere.
   */
  const spacedTicks = (
    ticks: readonly number[],
    place: (tick: number) => number,
    half: (tick: number) => number,
    lo: number,
    hi: number,
  ): number[] => {
    const kept: number[] = [];
    for (const tick of [...new Set(ticks)].filter((tick) => Number.isFinite(tick))) {
      const at = place(tick);
      const reach = half(tick);
      if (at - reach < lo || at + reach > hi) {
        continue;
      }
      if (kept.some((other) => Math.abs(place(other) - at) < half(other) + reach + 3)) {
        continue;
      }
      kept.push(tick);
    }
    return kept;
  };

  const xTickHalf = (tick: number): number => labelHalfW(String(tick), TICK_SIZE);
  const drawnXTicks = spacedTicks(xTicks, mapX, xTickHalf, 2, 438);
  const drawnYTicks = spacedTicks(
    yTicks,
    mapY,
    () => labelHalfH(TICK_SIZE),
    2,
    PLOT.bottom,
  );

  /**
   * The unit lines, at a step coarse enough that they stay countable. A grid is only worth
   * drawing while a learner can count it, so the step grows until no more than about twenty
   * lines fall across the plot in either direction; past that the squares are thinner than the
   * strokes bounding them and the picture is worse for having them.
   */
  const gridStep = (span: number): number => {
    for (const step of [1, 2, 5, 10, 20, 50, 100]) {
      if (span / step <= 20) {
        return step;
      }
    }
    return Math.ceil(span / 20);
  };
  /*
   * One step for both axes when the units are square, because there the grid's whole job is to
   * be COUNTABLE squares: a step chosen per axis makes the cells 2-by-1 as soon as the two
   * windows straddle a threshold, and a figure arguing "count the leg off the grid" is then
   * counting rectangles. The longer span picks it, so neither axis exceeds the line budget.
   */
  const squareStep = gridStep(Math.max(xMax - xMin, yMax - yMin));
  const gridLines = (lo: number, hi: number): number[] => {
    if (!grid) {
      return [];
    }
    const step = square ? squareStep : gridStep(hi - lo);
    const lines: number[] = [];
    for (let at = Math.ceil(lo / step) * step; at <= hi; at += step) {
      lines.push(at);
    }
    return lines;
  };
  const xGrid = gridLines(xMin, xMax);
  const yGrid = gridLines(yMin, yMax);

  const frame = plotLabelFrame(PLOT, 8);
  const placed: { label: ChartLabel; box: LabelBox }[] = [];
  for (const label of labels) {
    placed.push({
      label,
      box: labelSpot({
        x: mapX(label.x),
        y: mapY(label.y),
        frame,
        dx: label.dx,
        dy: label.dy,
        halfW: labelHalfW(label.latex, LABEL_SIZE),
        halfH: labelHalfH(LABEL_SIZE),
        gap: 10,
        avoid: placed.map((entry) => entry.box),
      }),
    });
  }

  const height = FOOT_TOP + (footers.length - 1) * FOOT_PITCH + 30;

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
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
      {xGrid.map((at) => (
        <line
          key={`gx${at}`}
          x1={mapX(at)}
          y1={PLOT.top}
          x2={mapX(at)}
          y2={PLOT.bottom}
          stroke={LINE}
          strokeWidth={0.5}
          opacity={0.45}
        />
      ))}
      {yGrid.map((at) => (
        <line
          key={`gy${at}`}
          x1={PLOT.left}
          y1={mapY(at)}
          x2={PLOT.right}
          y2={mapY(at)}
          stroke={LINE}
          strokeWidth={0.5}
          opacity={0.45}
        />
      ))}
      {showHAxis && (
        <line
          x1={PLOT.left}
          y1={hAxisY}
          x2={PLOT.right}
          y2={hAxisY}
          stroke={SOFT}
          strokeWidth={1.25}
        />
      )}
      {showVAxis && (
        <line
          x1={vAxisX}
          y1={PLOT.top}
          x2={vAxisX}
          y2={PLOT.bottom}
          stroke={SOFT}
          strokeWidth={1.25}
        />
      )}

      {/* The numbers live outside the frame, joined to it by a stub, and the mark itself sits
          on the axis where there is one. */}
      {drawnXTicks.map((tick) => (
        <g key={`tx${tick}`}>
          <line
            x1={mapX(tick)}
            y1={PLOT.bottom}
            x2={mapX(tick)}
            y2={PLOT.bottom + 5}
            stroke={LINE}
            strokeWidth={1.2}
          />
          {showHAxis && (
            <line
              x1={mapX(tick)}
              y1={hAxisY - 4}
              x2={mapX(tick)}
              y2={hAxisY + 4}
              stroke={LINE}
              strokeWidth={1.2}
            />
          )}
          <text
            x={mapX(tick)}
            y={PLOT.bottom + X_TICK_DROP}
            textAnchor="middle"
            fontSize={TICK_SIZE}
            fill={SOFT}
          >
            {tick}
          </text>
        </g>
      ))}
      {drawnYTicks.map((tick) => (
        <g key={`ty${tick}`}>
          <line
            x1={PLOT.left - 5}
            y1={mapY(tick)}
            x2={PLOT.left}
            y2={mapY(tick)}
            stroke={LINE}
            strokeWidth={1.2}
          />
          {showVAxis && (
            <line
              x1={vAxisX - 4}
              y1={mapY(tick)}
              x2={vAxisX + 4}
              y2={mapY(tick)}
              stroke={LINE}
              strokeWidth={1.2}
            />
          )}
          <text
            x={PLOT.left - Y_TICK_INSET}
            y={mapY(tick) + 4}
            textAnchor="end"
            fontSize={TICK_SIZE}
            fill={SOFT}
          >
            {tick}
          </text>
        </g>
      ))}

      {spans.map((span) => (
        <g key={`span${span.from}:${span.to}:${span.color}`}>
          <line
            x1={mapX(span.from)}
            y1={PLOT.bottom - 8}
            x2={mapX(span.to)}
            y2={PLOT.bottom - 8}
            stroke={span.color}
            strokeWidth={5}
            strokeLinecap="butt"
          />
          {[span.from, span.to].map((end) => (
            <circle
              key={`cap${end}`}
              cx={mapX(end)}
              cy={PLOT.bottom - 8}
              r={4}
              fill="var(--paper)"
              stroke={span.color}
              strokeWidth={2}
            />
          ))}
        </g>
      ))}

      {paths.map((path) => (
        <polyline
          key={`${path.color}:${path.points.map(([x, y]) => `${x},${y}`).join(" ")}`}
          points={path.points.map(([x, y]) => `${mapX(x)},${mapY(y)}`).join(" ")}
          fill="none"
          stroke={path.color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={path.dashed ? "6 5" : undefined}
        />
      ))}

      {arrows.map((arrow) => {
        const x1 = mapX(arrow.from[0]);
        const y1 = mapY(arrow.from[1]);
        const x2 = mapX(arrow.to[0]);
        const y2 = mapY(arrow.to[1]);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        // Stopped short of the target so the head does not bury the dot it points at.
        const stopX = x2 - Math.cos(angle) * 8;
        const stopY = y2 - Math.sin(angle) * 8;
        const wing = (turn: number): string =>
          `${stopX - Math.cos(angle + turn) * 9},${stopY - Math.sin(angle + turn) * 9}`;
        return (
          <g key={`arrow${arrow.from.join(",")}:${arrow.to.join(",")}`}>
            <line
              x1={x1}
              y1={y1}
              x2={stopX}
              y2={stopY}
              stroke={arrow.color}
              strokeWidth={2}
              strokeDasharray={arrow.dashed ? "5 4" : undefined}
            />
            <polygon
              points={`${stopX},${stopY} ${wing(0.4)} ${wing(-0.4)}`}
              fill={arrow.color}
            />
          </g>
        );
      })}

      {dots.map((dot) => (
        <circle
          key={`${dot.x}:${dot.y}:${dot.color}:${dot.hollow ? "o" : "f"}`}
          cx={mapX(dot.x)}
          cy={mapY(dot.y)}
          r={5}
          fill={dot.hollow ? "var(--paper)" : dot.color}
          stroke={dot.hollow ? dot.color : "var(--paper)"}
          strokeWidth={dot.hollow ? 2.2 : 1.5}
        />
      ))}

      {placed.map(({ label, box }) => (
        <PlotLabel
          key={`${label.latex}:${label.x}:${label.y}`}
          box={box}
          latex={label.latex}
          fontSize={LABEL_SIZE}
          color={label.color}
          w={150}
        />
      ))}

      {footers.map((footer, index) => (
        <SvgMath
          key={footer}
          latex={footer}
          x={220}
          y={FOOT_TOP + index * FOOT_PITCH}
          fontSize={index === footers.length - 1 ? 18 : 16}
          color={index === footers.length - 1 ? CIVIC : LABEL}
          w={424}
        />
      ))}
    </svg>
  );
}

/* --------------------------------------------------------------------- the vee, twice */

/**
 * The parent absolute-value graph `a|x - h| + k`, as a three-point polyline reaching `span`
 * either side of its corner. Exported because FUN.10's five figures and FUN.8's twin-input
 * figure all need the same two arms and none of them should re-derive them.
 */
export function veeArms(
  a: number,
  h: number,
  k: number,
  span: number,
): readonly (readonly [number, number])[] {
  return [
    [h - span, a * span + k],
    [h, k],
    [h + span, a * span + k],
  ];
}

/** A parabola `(x - h)^2 + k` sampled across `span` either side of its own vertex. */
export function parabolaArc(
  h: number,
  k: number,
  span: number,
): readonly (readonly [number, number])[] {
  const steps = 24;
  return Array.from({ length: steps + 1 }, (_unused, index) => {
    const x = h - span + (2 * span * index) / steps;
    return [x, (x - h) * (x - h) + k] as const;
  });
}

/* --------------------------------------------------------------- the piecewise break line */

const BREAK = { left: 46, right: 400, axis: 74 };
const LEGEND_TOP = 128;
const LEGEND_PITCH = 28;

/** One stretch of the input line, with the formula that owns it. */
export interface BreakStretch {
  /** The finite lower bound, or `null` for a stretch running off to the left. */
  from: number | null;
  to: number | null;
  fromClosed?: boolean;
  toClosed?: boolean;
  /** The condition and formula, as one LaTeX line for the legend. */
  legend: string;
  /** True for the stretch that claims the input the question asks about. */
  owner?: boolean;
}

/** The stretches reordered so an owner's endpoints paint over a neighbour's at a shared break. */
function ownerLast(stretches: readonly BreakStretch[]): readonly BreakStretch[] {
  return [
    ...stretches.filter((piece) => piece.owner !== true),
    ...stretches.filter((piece) => piece.owner === true),
  ];
}

/** One input the question asks about, marked on the line. */
export interface BreakInput {
  at: number;
  latex: string;
}

/**
 * The input line of a piecewise rule: every stretch drawn, the one that OWNS the asked input
 * inked apart, and the endpoints filled or hollow as the two inequalities actually are.
 *
 * The window is derived from the breaks and the marked inputs rather than passed in, so a
 * figure can never be drawn on a scale that clips the input it is about.
 *
 * The formulas sit in a legend UNDER the line rather than over their own stretches, which is
 * the one arrangement that cannot collide: a three-piece rule's middle stretch can be two
 * units wide on a twenty-unit scale, and two formulas centred on neighbouring stretches would
 * be printed through each other on exactly those draws.
 */
export function D6BreakLine({
  stretches,
  inputs,
  footers,
  title,
  ariaLabel,
}: {
  stretches: readonly BreakStretch[];
  inputs: readonly BreakInput[];
  footers: readonly string[];
  title: string;
  ariaLabel: string;
}): JSX.Element {
  const finite = [
    ...stretches.flatMap((piece) => [piece.from, piece.to]),
    ...inputs.map((input) => input.at),
  ].filter((value): value is number => value !== null && Number.isFinite(value));
  const lo = finite.length > 0 ? Math.min(...finite) : -1;
  const hi = finite.length > 0 ? Math.max(...finite) : 1;
  /*
   * Padding proportional to the content, with a one-unit floor for the draw whose finite
   * points all sit on one coordinate.
   *
   * The floor used to be TWO units, and on this node the narrow rule is the common case rather
   * than the exceptional one: `three-piece-eval` puts its two breaks as little as two apart and
   * `boundary-eval` puts every finite point on the same coordinate, so a fixed two-unit margin
   * at each end spent two thirds of a 354px line on runway and left the breaks the figure is
   * about crowded into the middle third. A proportional pad hands that back while still
   * leaving the unterminated stretches somewhere to run off into: at no content width does the
   * runway fall below about a ninth of the line at each end, and it is a quarter on the
   * narrowest rules. Reducing it also SPREADS the tick numbers, which are unspaced here, since
   * fewer window units over the same 354px is more pixels per unit.
   */
  const pad = Math.max(1, Math.round((hi - lo) * 0.2));
  const min = Math.floor(lo) - pad;
  const max = Math.ceil(hi) + pad;
  const x = (value: number): number =>
    BREAK.left + ((value - min) / (max - min)) * (BREAK.right - BREAK.left);

  const ticks = [...new Set([min, ...finite, max])];
  const legendBottom = LEGEND_TOP + (stretches.length - 1) * LEGEND_PITCH;
  const footTop = legendBottom + 34;
  const height = footTop + (footers.length - 1) * 32 + 26;

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      {stretches.map((piece) => {
        const color = piece.owner === true ? CIVIC : SOFT;
        const startX = piece.from === null ? BREAK.left : x(piece.from);
        const endX = piece.to === null ? BREAK.right : x(piece.to);
        return (
          <g key={`piece${piece.from}-${piece.to}`}>
            <rect
              x={startX}
              y={BREAK.axis - 8}
              width={Math.max(endX - startX, 1)}
              height={16}
              fill={color}
              fillOpacity={piece.owner === true ? 0.2 : 0.1}
            />
            <line
              x1={startX}
              y1={BREAK.axis}
              x2={endX}
              y2={BREAK.axis}
              stroke={color}
              strokeWidth={piece.owner === true ? 3.5 : 2}
            />
          </g>
        );
      })}

      <line
        x1={BREAK.left}
        y1={BREAK.axis}
        x2={BREAK.right}
        y2={BREAK.axis}
        stroke={LINE}
        strokeWidth={1.5}
      />

      {ticks.map((value) => (
        <g key={`tick${value}`}>
          <line
            x1={x(value)}
            y1={BREAK.axis - 5}
            x2={x(value)}
            y2={BREAK.axis + 5}
            stroke={LINE}
            strokeWidth={1.2}
          />
          <text
            x={x(value)}
            y={BREAK.axis + 24}
            textAnchor="middle"
            fontSize={11}
            fill={SOFT}
          >
            {value}
          </text>
        </g>
      ))}

      {/* Filled for an endpoint the stretch takes in, hollow for one it leaves out. Never a
          hue difference: the two ends of one stretch can disagree, and hue is the owner's.

          Neighbouring stretches SHARE a break, and their two dots land on one coordinate
          disagreeing about it, so whichever paints last is the one a learner reads. The owner
          paints last, because the caption argues from the owner's own two ends and a figure
          that covered its hollow one would be contradicting the prose beside it. */}
      {ownerLast(stretches).flatMap((piece) =>
        [
          piece.from === null
            ? null
            : { at: piece.from, closed: piece.fromClosed === true },
          piece.to === null ? null : { at: piece.to, closed: piece.toClosed === true },
        ]
          .filter((end): end is { at: number; closed: boolean } => end !== null)
          .map((end) => (
            <circle
              key={`end${piece.from}-${piece.to}-${end.at}-${end.closed ? "c" : "o"}`}
              cx={x(end.at)}
              cy={BREAK.axis}
              r={5.5}
              fill={end.closed ? (piece.owner === true ? CIVIC : SOFT) : "var(--paper)"}
              stroke={piece.owner === true ? CIVIC : SOFT}
              strokeWidth={2.2}
            />
          )),
      )}

      {inputs.map((input, index) => (
        <g key={`input${input.at}`}>
          <line
            x1={x(input.at)}
            y1={BREAK.axis - 12}
            x2={x(input.at)}
            y2={index % 2 === 0 ? 40 : 20}
            stroke={BRICK}
            strokeWidth={1.2}
            strokeDasharray="4 3"
          />
          <SvgMath
            latex={input.latex}
            x={x(input.at)}
            y={index % 2 === 0 ? 28 : 14}
            fontSize={15}
            color={BRICK}
            w={120}
            plate="card"
          />
        </g>
      ))}

      {stretches.map((piece, index) => {
        const color = piece.owner === true ? CIVIC : SOFT;
        return (
          <g key={`legend${piece.legend}`}>
            <line
              x1={54}
              y1={LEGEND_TOP + index * LEGEND_PITCH}
              x2={80}
              y2={LEGEND_TOP + index * LEGEND_PITCH}
              stroke={color}
              strokeWidth={piece.owner === true ? 3.5 : 2}
            />
            <SvgMath
              latex={piece.legend}
              x={92}
              y={LEGEND_TOP + index * LEGEND_PITCH}
              anchor="start"
              fontSize={15}
              color={piece.owner === true ? LABEL : SOFT}
              w={330}
            />
          </g>
        );
      })}

      {footers.map((footer, index) => (
        <SvgMath
          key={footer}
          latex={footer}
          x={220}
          y={footTop + index * 32}
          fontSize={index === footers.length - 1 ? 18 : 16}
          color={index === footers.length - 1 ? CIVIC : LABEL}
          w={424}
        />
      ))}
    </svg>
  );
}

/* ----------------------------------------------------------------- the composition chain */

/** One machine in a chain: what it is, and what it does to whatever reaches it. */
export interface ChainStage {
  /** A word or two naming the stage, e.g. `\text{acts first}`. */
  heading: string;
  /** The work this stage does, as one LaTeX line. */
  body: string;
  /** What it hands on, printed on the arrow leaving it. Omitted on the last stage. */
  out?: string;
}

/**
 * Two machines coupled in series, with the value carried between them written on the arrow.
 *
 * Composition does not commute, and FUN.7's whole pool is built so that running the two the
 * other way round gives a different answer. A reduction column can state that in a first row
 * and then look exactly like every other column in the tree; two boxes in a line, the inner
 * one inked `SIGNAL` and the outer `CIVIC`, put the ORDER in the geometry, which is the thing
 * a learner who read the notation backwards got wrong.
 */
export function D6Chain({
  input,
  stages,
  answer,
  title,
  ariaLabel,
}: {
  /** The input as it arrives, e.g. `x = 5` or `x`. */
  input: string;
  stages: readonly ChainStage[];
  answer: string;
  title: string;
  ariaLabel: string;
}): JSX.Element {
  const BOX_H = 58;
  const GAP = 26;
  const top = 48;
  const boxTop = (index: number): number => top + index * (BOX_H + GAP);
  const lastBottom = boxTop(stages.length - 1) + BOX_H;
  const answerY = lastBottom + 30;
  const height = answerY + 26;
  const colors = [SIGNAL, CIVIC];

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <SvgMath latex={input} x={220} y={18} fontSize={17} color={LABEL} w={424} />

      {stages.map((stage, index) => {
        const color = colors[Math.min(index, colors.length - 1)] as string;
        const y = boxTop(index);
        return (
          <g key={stage.body}>
            <line
              x1={220}
              y1={y - GAP + 4}
              x2={220}
              y2={y - 4}
              stroke={LINE}
              strokeWidth={1.4}
            />
            <polygon points={`220,${y} 215,${y - 8} 225,${y - 8}`} fill={LINE} />
            {stage.out !== undefined && (
              <SvgMath
                latex={stage.out}
                x={238}
                y={y + BOX_H + GAP / 2}
                anchor="start"
                fontSize={14}
                color={color}
                w={190}
              />
            )}
            <rect
              x={44}
              y={y}
              width={352}
              height={BOX_H}
              rx={10}
              fill="var(--paper)"
              stroke={color}
              strokeWidth={1.6}
            />
            <SvgMath
              latex={stage.heading}
              x={220}
              y={y + 16}
              fontSize={12}
              color={color}
              w={340}
            />
            <SvgMath
              latex={stage.body}
              x={220}
              y={y + 38}
              fontSize={17}
              color={LABEL}
              w={340}
            />
          </g>
        );
      })}

      <SvgMath latex={answer} x={220} y={answerY} fontSize={18} color={CIVIC} w={424} />
    </svg>
  );
}

/* ------------------------------------------------------------------------- the ledger */

/** One row of a ledger: two cells, and what the reading makes of it. */
export interface LedgerRow {
  cells: readonly [string, string];
  /** `pick` for the row the answer comes from, `bad` for one the reading rules out. */
  tone?: "pick" | "bad";
}

/**
 * A two-column ledger with a verdict on its rows.
 *
 * FUN.1's log count and FUN.8's swap both arrive as a TABLE in the prompt and are answered by
 * a per-row reading, so the figure is the table with the reading in it. Anything else — a
 * column of algebra, a line — is a picture of a different question.
 */
export function D6Ledger({
  columns,
  rows,
  footers,
  title,
  ariaLabel,
}: {
  columns: readonly [string, string];
  rows: readonly LedgerRow[];
  footers: readonly string[];
  title: string;
  ariaLabel: string;
}): JSX.Element {
  const LEFT = 52;
  const RIGHT = 388;
  const MID = 196;
  const ROW_H = 32;
  const headY = 22;
  const firstRow = 54;
  const rowY = (index: number): number => firstRow + index * ROW_H;
  const tableBottom = rowY(rows.length - 1) + ROW_H / 2;
  const footTop = tableBottom + 32;
  const height = footTop + (footers.length - 1) * 32 + 26;

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <SvgMath
        latex={columns[0]}
        x={(LEFT + MID) / 2}
        y={headY}
        fontSize={13}
        color={SOFT}
        w={150}
      />
      <SvgMath
        latex={columns[1]}
        x={(MID + RIGHT) / 2}
        y={headY}
        fontSize={13}
        color={SOFT}
        w={200}
      />
      <line
        x1={LEFT}
        y1={headY + 16}
        x2={RIGHT}
        y2={headY + 16}
        stroke={LINE}
        strokeWidth={1.2}
      />

      {rows.map((row, index) => {
        const tint = row.tone === "pick" ? CIVIC : row.tone === "bad" ? BRICK : undefined;
        return (
          <g key={row.cells.join("|")}>
            {tint !== undefined && (
              <rect
                x={LEFT}
                y={rowY(index) - ROW_H / 2 + 2}
                width={RIGHT - LEFT}
                height={ROW_H - 4}
                rx={6}
                fill={tint}
                fillOpacity={0.14}
              />
            )}
            <SvgMath
              latex={row.cells[0]}
              x={(LEFT + MID) / 2}
              y={rowY(index)}
              fontSize={16}
              color={tint ?? LABEL}
              w={150}
            />
            <SvgMath
              latex={row.cells[1]}
              x={(MID + RIGHT) / 2}
              y={rowY(index)}
              fontSize={15}
              color={tint ?? LABEL}
              w={200}
            />
          </g>
        );
      })}

      {footers.map((footer, index) => (
        <SvgMath
          key={footer}
          latex={footer}
          x={220}
          y={footTop + index * 32}
          fontSize={index === footers.length - 1 ? 18 : 16}
          color={index === footers.length - 1 ? CIVIC : LABEL}
          w={424}
        />
      ))}
    </svg>
  );
}
