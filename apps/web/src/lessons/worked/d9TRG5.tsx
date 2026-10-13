/**
 * Worked-solution figures for the D9 TRG.5 practice templates: the amplitude, the period,
 * the midline, the phase shift, and whichever one of the first three the L3 item named.
 *
 * Every entry here draws the TRACE the item is about, because each of these five numbers is
 * a measurement OF a picture and a learner who got one wrong has almost always measured the
 * wrong thing rather than divided wrongly. A column of steps can say "the amplitude is the
 * size of $a$"; only a figure can show the swing it names, against the constant on the end
 * that does not change it.
 *
 * Plane rules (`.cursor/skills/svg/SKILL.md`, "Coordinate planes"): the plot rect carries
 * `data-plot-frame`, every ON-PLANE label goes through `labelSpot` inside a
 * `plotLabelFrame` and is drawn with `PlotLabel`, and no number is printed as a bare
 * `<text>` tick. The vertical scale's values sit in the left MARGIN, outside the frame,
 * because the window is centered on a midline the draw chooses and the axis $y = 0$ is off
 * the picture whenever that midline is far from zero.
 *
 * Each plane draws TWO periods rather than one. One period is enough to measure on and says
 * nothing about the word this node turns on: a trace is *periodic*, and the second copy is
 * the only part of the figure that shows it.
 *
 * Every figure is driven only by its own template's `template_params`, with a default for
 * each, and recomputes what `generate()` computed by the same route.
 */

import type { JSX } from "react";

import {
  CIVIC,
  LABEL,
  type LabelBox,
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
import { gcd, sp, spoken, type WorkedSolutionVisual } from "../workedKit";

/* -------------------------------------------------------------------------- */
/* Shared plane                                                                */
/* -------------------------------------------------------------------------- */

const VIEW_H = 212;
const PLOT = { left: 62, right: 292, top: 24, bottom: 168 } as const;
const FRAME = plotLabelFrame(PLOT, 8);
const LABEL_SIZE = 13;
const MARGIN_SIZE = 12;
const ROW_CX = 368;
const ROW_W = 140;
const ROW_SIZE = 14;

interface PlotWindow {
  t0: number;
  t1: number;
  yMin: number;
  yMax: number;
}

function mapperFor(view: PlotWindow) {
  const mx = (t: number) =>
    PLOT.left + ((t - view.t0) / (view.t1 - view.t0)) * (PLOT.right - PLOT.left);
  const my = (v: number) =>
    PLOT.bottom - ((v - view.yMin) / (view.yMax - view.yMin)) * (PLOT.bottom - PLOT.top);
  return { mx, my };
}

/** The trace itself, sampled finely enough that a short period still reads as a curve. */
function tracePath(
  value: (t: number) => number,
  mx: (t: number) => number,
  my: (v: number) => number,
  view: PlotWindow,
  steps = 240,
): string {
  const parts: string[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = view.t0 + ((view.t1 - view.t0) * index) / steps;
    parts.push(`${index === 0 ? "M" : "L"} ${mx(t).toFixed(2)} ${my(value(t)).toFixed(2)}`);
  }
  return parts.join(" ");
}

function PlaneFrame(): JSX.Element {
  return (
    <rect
      data-plot-frame=""
      x={PLOT.left}
      y={PLOT.top}
      width={PLOT.right - PLOT.left}
      height={PLOT.bottom - PLOT.top}
      fill="var(--paper)"
      stroke={LINE}
      strokeWidth={1}
      rx={6}
    />
  );
}

/** A horizontal reference level drawn all the way across the plot. */
function Level({
  y,
  color,
  dash = "5 4",
  width = 1.2,
}: {
  y: number;
  color: string;
  dash?: string;
  width?: number;
}): JSX.Element {
  return (
    <line
      x1={PLOT.left}
      y1={y}
      x2={PLOT.right}
      y2={y}
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dash}
    />
  );
}

/** A vertical marker at one value of $x$, from the top of the plot to the bottom. */
function Marker({ x, color }: { x: number; color: string }): JSX.Element {
  return (
    <line
      x1={x}
      y1={PLOT.top + 4}
      x2={x}
      y2={PLOT.bottom - 4}
      stroke={color}
      strokeWidth={1.2}
      strokeDasharray="4 4"
    />
  );
}

/** A measured span with a head at each end, so the figure names a distance and not a point. */
function Span({
  from,
  to,
  along,
  vertical = false,
  color,
}: {
  from: number;
  to: number;
  /** The fixed coordinate: the $y$ of a horizontal span, the $x$ of a vertical one. */
  along: number;
  vertical?: boolean;
  color: string;
}): JSX.Element {
  const head = (at: number, toward: number) => {
    const dir = Math.sign(toward - at) || 1;
    return vertical
      ? `M ${along} ${at} L ${along - 4} ${at + dir * 7} L ${along + 4} ${at + dir * 7} Z`
      : `M ${at} ${along} L ${at + dir * 7} ${along - 4} L ${at + dir * 7} ${along + 4} Z`;
  };
  return (
    <g>
      <line
        x1={vertical ? along : from}
        y1={vertical ? from : along}
        x2={vertical ? along : to}
        y2={vertical ? to : along}
        stroke={color}
        strokeWidth={1.6}
      />
      <path d={head(from, to)} fill={color} />
      <path d={head(to, from)} fill={color} />
    </g>
  );
}

/** One value written in the left margin, level with the line it names. */
function MarginValue({
  latex,
  y,
  color,
}: {
  latex: string;
  y: number;
  color: string;
}): JSX.Element {
  return <SvgMath latex={latex} x={30} y={y} fontSize={MARGIN_SIZE} color={color} w={56} />;
}

/**
 * Where each statement of the right-hand column sits, and what identifies it.
 *
 * Keyed by POSITION rather than by content, because two rows of one worked solution may
 * legitimately carry the same LaTeX (a value restated to close the argument) and a content
 * key would collapse them into one. The tuple is authored per figure and is never reordered
 * or spliced, which is the condition a positional key needs; it is computed here rather than
 * inside the JSX so the key is a value the row carries rather than an index read at render.
 */
function placedRows(
  rows: readonly string[],
): readonly { key: string; latex: string; y: number; last: boolean }[] {
  return rows.map((latex, index) => ({
    key: `row-${index}`,
    latex,
    y: 54 + index * 38,
    last: index === rows.length - 1,
  }));
}

/** The right-hand column: one short statement per row, the last one in the answer color. */
function Rows({ rows }: { rows: readonly string[] }): JSX.Element {
  return (
    <g>
      {placedRows(rows).map((row) => (
        <SvgMath
          key={row.key}
          latex={row.latex}
          x={ROW_CX}
          y={row.y}
          fontSize={ROW_SIZE}
          color={row.last ? CIVIC : LABEL}
          w={ROW_W}
        />
      ))}
    </g>
  );
}

/**
 * One on-plane label, placed by `labelSpot` inside the plot rather than at a fixed offset.
 *
 * The height allowance doubles for a stacked fraction, because `labelHalfH` measures one
 * line and every period and phase shift on these planes is a `\dfrac` two lines deep. A
 * label sized as one line clears the border on the estimate and overhangs it in the render.
 */
function place(
  x: number,
  y: number,
  latex: string,
  dx: -1 | 0 | 1,
  dy: -1 | 0 | 1,
  avoid: readonly LabelBox[] = [],
): LabelBox {
  return labelSpot({
    x,
    y,
    frame: FRAME,
    dx,
    dy,
    halfW: labelHalfW(latex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE) * (latex.includes("frac") ? 2 : 1),
    gap: 10,
    avoid: [...avoid],
  });
}

/* -------------------------------------------------------------------------- */
/* Shared arithmetic, recomputed by the same route `generate()` took            */
/* -------------------------------------------------------------------------- */

const TAU = Math.PI * 2;

function trig(fn: number, t: number): number {
  return fn === 1 ? Math.cos(t) : Math.sin(t);
}

/** `2\pi / b` in lowest terms, as LaTeX. */
function periodTex(b: number): string {
  const factor = gcd(2, b);
  const top = 2 / factor;
  const bottom = b / factor;
  const head = top === 1 ? "\\pi" : `${top}\\pi`;
  return bottom === 1 ? head : `\\dfrac{${head}}{${bottom}}`;
}

/** A signed multiple of pi in lowest terms, as LaTeX. */
function radianTex(num: number, den: number): string {
  const factor = gcd(num, den);
  const top = num / factor;
  const bottom = den / factor;
  const sign = top < 0 ? "-" : "";
  const size = Math.abs(top);
  const head = size === 1 ? "\\pi" : `${size}\\pi`;
  return bottom === 1 ? `${sign}${head}` : `${sign}\\dfrac{${head}}{${bottom}}`;
}

/** The same, without its sign, for use after an operator that already carries one. */
function radianMagTex(num: number, den: number): string {
  return radianTex(Math.abs(num), den);
}

/**
 * The first maximum of $a\,f(bx)$ strictly inside two periods.
 *
 * A cosine peaks at $x = 0$, which is on the plot's own border, and a negative coefficient
 * moves every peak to where the bare function troughs. Both cases are handled here so the
 * amplitude arrow is drawn against a real high point rather than a nominal one.
 */
function firstPeak(fn: number, negative: boolean, period: number): number {
  if (fn === 1) {
    return negative ? period / 2 : period;
  }
  return negative ? (period * 3) / 4 : period / 4;
}

/* -------------------------------------------------------------------------- */
/* The amplitude figure                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The trace, the level it swings about, and the arrow measuring how far it reaches from there.
 *
 * `extreme` is what TRG.5's CHECK asks for and its pool does not: the highest or lowest value
 * the trace ever reaches, which is that arrow's far END rather than its length. Supplied, the
 * arrow is drawn to whichever extreme was asked for, that extreme's level is inked as the
 * answer instead of dashed away with its twin, and the rows close on the addition. Left off,
 * the amplitude item renders exactly as it did.
 */
export function AmplitudeWorked({
  a,
  b,
  d,
  fn,
  extreme,
}: {
  a: number;
  b: number;
  d: number;
  fn: number;
  extreme?: "max" | "min";
}): JSX.Element {
  const size = Math.abs(a);
  const period = TAU / b;
  const pad = Math.max(1, size * 0.4);
  const view: PlotWindow = {
    t0: 0,
    t1: period * 2,
    yMin: d - size - pad,
    yMax: d + size + pad,
  };
  const { mx, my } = mapperFor(view);
  const wantsMin = extreme === "min";
  const reached = wantsMin ? d - size : d + size;
  // A trough is where the trace peaks once the coefficient's sign is flipped, so the same
  // helper places both and the arrow always lands on a real turning point of THIS trace.
  const peak = firstPeak(fn, wantsMin ? a >= 0 : a < 0, period);
  const swingTex = `${size}`;
  const swing = place(mx(peak), (my(d) + my(reached)) / 2, swingTex, 1, 0);
  const reachedInk = extreme === undefined ? SOFT : CIVIC;

  return (
    <svg
      viewBox={`0 0 440 ${VIEW_H}`}
      role="img"
      aria-label={
        extreme === undefined
          ? `A trace swinging ${size} above and ${size} below the level ${spoken(d)}, so its amplitude is ${size}`
          : `A trace swinging ${size} either side of the level ${spoken(d)}, with its ${wantsMin ? "lowest" : "highest"} value of ${spoken(reached)} marked`
      }
    >
      <title>
        {extreme === undefined
          ? "How far the trace reaches from the level it sits about"
          : "The level the trace sits about, and the far end of its swing"}
      </title>

      <PlaneFrame />
      <Level y={my(d)} color={SIGNAL} />
      <Level
        y={my(reached)}
        color={reachedInk}
        dash={extreme === undefined ? "3 5" : "5 4"}
        width={extreme === undefined ? 1 : 1.6}
      />
      <Level y={my(wantsMin ? d + size : d - size)} color={SOFT} dash="3 5" width={1} />

      <path
        d={tracePath((t) => a * trig(fn, b * t) + d, mx, my, view)}
        fill="none"
        stroke={LABEL}
        strokeWidth={1.8}
      />

      <Span from={my(d)} to={my(reached)} along={mx(peak)} vertical color={CIVIC} />
      <PlotLabel box={swing} latex={swingTex} fontSize={LABEL_SIZE} color={CIVIC} />

      <MarginValue
        latex={extreme === undefined ? `${d + size}` : `y = ${d + size}`}
        y={my(d + size)}
        color={wantsMin === false && extreme !== undefined ? CIVIC : SOFT}
      />
      <MarginValue latex={`y = ${d}`} y={my(d)} color={SIGNAL} />
      <MarginValue
        latex={extreme === undefined ? `${d - size}` : `y = ${d - size}`}
        y={my(d - size)}
        color={wantsMin ? CIVIC : SOFT}
      />

      <Rows
        rows={
          extreme === undefined
            ? [`a = ${a}`, `d = ${d}`, `\\text{amplitude} = ${size}`]
            : [
                `d = ${d}`,
                `\\text{amplitude} = ${size}`,
                `${d} ${wantsMin ? "-" : "+"} ${size} = ${reached}`,
              ]
        }
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The period figure                                                           */
/* -------------------------------------------------------------------------- */

function PeriodWorked({ a, b, fn }: { a: number; b: number; fn: number }): JSX.Element {
  const period = TAU / b;
  const view: PlotWindow = {
    t0: -period * 0.16,
    t1: period * 2.16,
    yMin: -a * 1.45,
    yMax: a * 1.45,
  };
  const { mx, my } = mapperFor(view);
  const tex = periodTex(b);
  const along = PLOT.bottom - 26;
  const box = place((mx(0) + mx(period)) / 2, along, tex, 0, -1);

  return (
    <svg
      viewBox={`0 0 440 ${VIEW_H}`}
      role="img"
      aria-label={`One cycle of the trace closing after the inside has covered a whole turn, with a second cycle following it`}
    >
      <title>Where one cycle closes, and the next one starts</title>

      <PlaneFrame />
      <Level y={my(0)} color={SOFT} dash="none" width={1} />

      <path
        d={tracePath((t) => a * trig(fn, b * t), mx, my, view)}
        fill="none"
        stroke={LABEL}
        strokeWidth={1.8}
      />

      <Marker x={mx(0)} color={CIVIC} />
      <Marker x={mx(period)} color={CIVIC} />
      <Span from={mx(0)} to={mx(period)} along={along} color={CIVIC} />
      <PlotLabel box={box} latex={tex} fontSize={LABEL_SIZE} color={CIVIC} />

      <Rows
        rows={[`${b}x = 2\\pi`, `x = \\dfrac{2\\pi}{${b}}`, `\\text{period} = ${tex}`]}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The midline figure                                                          */
/* -------------------------------------------------------------------------- */

function MidlineWorked({
  high,
  low,
  midline,
  amplitude,
}: {
  high: number;
  low: number;
  midline: number;
  amplitude: number;
}): JSX.Element {
  const pad = Math.max(1, amplitude * 0.45);
  const view: PlotWindow = {
    t0: 0,
    t1: TAU * 2,
    yMin: low - pad,
    yMax: high + pad,
  };
  const { mx, my } = mapperFor(view);
  const tex = `y = ${midline}`;
  const box = place(mx(TAU * 1.5), my(midline), tex, 0, -1);

  return (
    <svg
      viewBox={`0 0 440 ${VIEW_H}`}
      role="img"
      aria-label={`A trace running between a highest reading of ${spoken(high)} and a lowest of ${spoken(low)}, sitting about the level ${spoken(midline)}`}
    >
      <title>The level halfway between the highest and the lowest reading</title>

      <PlaneFrame />
      <Level y={my(high)} color={SOFT} dash="3 5" width={1} />
      <Level y={my(low)} color={SOFT} dash="3 5" width={1} />
      <Level y={my(midline)} color={CIVIC} />

      <path
        d={tracePath((t) => amplitude * Math.sin(t) + midline, mx, my, view)}
        fill="none"
        stroke={LABEL}
        strokeWidth={1.8}
      />

      <Span
        from={my(high)}
        to={my(midline)}
        along={mx(TAU * 0.25)}
        vertical
        color={SIGNAL}
      />
      <Span
        from={my(midline)}
        to={my(low)}
        along={mx(TAU * 0.75)}
        vertical
        color={SIGNAL}
      />

      <PlotLabel box={box} latex={tex} fontSize={LABEL_SIZE} color={CIVIC} />

      <MarginValue latex={`${high}`} y={my(high)} color={SOFT} />
      <MarginValue latex={`${midline}`} y={my(midline)} color={CIVIC} />
      <MarginValue latex={`${low}`} y={my(low)} color={SOFT} />

      <Rows
        rows={[
          `${high} + ${sp(low)} = ${high + low}`,
          `${high + low} \\div 2 = ${midline}`,
          `\\text{midline: } y = ${midline}`,
        ]}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The phase-shift figure                                                      */
/* -------------------------------------------------------------------------- */

function PhaseWorked({
  a,
  b,
  num,
  den,
  fn,
}: {
  a: number;
  b: number;
  num: number;
  den: number;
  fn: number;
}): JSX.Element {
  const period = TAU / b;
  const shift = (Math.PI * num) / den;
  const view: PlotWindow = {
    t0: Math.min(0, shift) - period * 0.2,
    t1: Math.max(0, shift) + period * 1.6,
    yMin: -a * 1.5,
    yMax: a * 1.5,
  };
  const { mx, my } = mapperFor(view);
  const tex = radianTex(num, den);
  const along = PLOT.top + 24;
  const box = place((mx(0) + mx(shift)) / 2, along, tex, 0, 1);

  return (
    <svg
      viewBox={`0 0 440 ${VIEW_H}`}
      role="img"
      aria-label={`The same trace drawn twice, the second slid ${num > 0 ? "right" : "left"} of the first`}
    >
      <title>The unshifted trace, and the same trace slid along</title>

      <PlaneFrame />
      <Level y={my(0)} color={SOFT} dash="none" width={1} />

      <path
        d={tracePath((t) => a * trig(fn, b * t), mx, my, view)}
        fill="none"
        stroke={SOFT}
        strokeWidth={1.5}
        strokeDasharray="6 4"
      />
      <path
        d={tracePath((t) => a * trig(fn, b * (t - shift)), mx, my, view)}
        fill="none"
        stroke={CIVIC}
        strokeWidth={1.8}
      />

      <Marker x={mx(0)} color={SOFT} />
      <Marker x={mx(shift)} color={CIVIC} />
      <Span from={mx(0)} to={mx(shift)} along={along} color={CIVIC} />
      <PlotLabel box={box} latex={tex} fontSize={LABEL_SIZE} color={CIVIC} />

      <Rows
        rows={[
          `${b}\\left(x ${num > 0 ? "-" : "+"} ${radianMagTex(num, den)}\\right)`,
          `\\text{slid ${num > 0 ? "right" : "left"}}`,
          `\\text{shift} = ${tex}`,
        ]}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* One reading of the trace, out of the three                                  */
/* -------------------------------------------------------------------------- */

/**
 * The one reading the item asked for, measured on the trace.
 *
 * The template used to ask for all three at once and this figure used to answer all three at
 * once. It asks for one now, named by `feature`, so exactly one measurement is drawn and
 * exactly one thing on the picture carries the answer color. Drawing the other two would
 * answer questions this draw did not put, and on a reveal it would hand over the answers the
 * cell still has to ask.
 *
 * The three readings are the highest value, the lowest value and the distance between them,
 * which is what the cell asks since the amplitude and the midline were readable straight off
 * the printed rule. That changes what the picture has to show. **The measurement now starts at
 * the level and ends at a value on the vertical axis**, because the answer is a POSITION rather
 * than a length: the span is the working, and the answer is the horizontal line it arrives at,
 * which is why that line carries the answer color and the span does not. The one exception is
 * the third reading, where the answer really is a length, and there the span is the answer.
 *
 * The window is anchored at the slide rather than at zero, so the two cycles it frames are
 * the two the rule's own bracket starts, and the measurement is taken on the shifted trace
 * the learner was actually shown.
 */
function FeaturesWorked({
  a,
  b,
  d,
  fn,
  feature,
  cn,
  cd,
}: {
  a: number;
  b: number;
  d: number;
  fn: number;
  feature: number;
  cn: number;
  cd: number;
}): JSX.Element {
  const size = Math.abs(a);
  const high = d + size;
  const low = d - size;
  const period = TAU / b;
  const shift = (Math.PI * cn) / cd;
  const pad = Math.max(1, size * 0.5);
  const view: PlotWindow = {
    t0: shift,
    t1: shift + period * 2,
    yMin: low - pad,
    yMax: high + pad,
  };
  const { mx, my } = mapperFor(view);
  const peak = shift + firstPeak(fn, a < 0, period);
  const trough = peak + period / 2;
  // Each span is struck at the turning point it belongs to, so the reading it measures is taken
  // where the trace actually gets there rather than at an arbitrary column.
  const spanAt = feature === 1 ? mx(trough) : mx(peak);
  const spanFrom = feature === 0 ? my(d) : feature === 1 ? my(d) : my(low);
  const spanTo = feature === 0 ? my(high) : feature === 1 ? my(low) : my(high);
  const spanTex = feature === 2 ? `${2 * size}` : `${size}`;
  const spanColor = feature === 2 ? CIVIC : SIGNAL;
  const spanLabel = place(spanAt, (spanFrom + spanTo) / 2, spanTex, 1, 0);

  const rows =
    feature === 0
      ? [`d = ${d}`, `\\left|a\\right| = ${size}`, `\\text{highest} = ${high}`]
      : feature === 1
        ? [`d = ${d}`, `\\left|a\\right| = ${size}`, `\\text{lowest} = ${low}`]
        : [
            `\\left|a\\right| = ${size}`,
            `2 \\times ${size}`,
            `\\text{lowest to highest} = ${2 * size}`,
          ];

  const ariaLabel =
    feature === 0
      ? `A trace sitting about the level ${spoken(d)} and swinging ${size} either side of it, with the swing up to its highest value of ${spoken(high)} measured`
      : feature === 1
        ? `A trace sitting about the level ${spoken(d)} and swinging ${size} either side of it, with the swing down to its lowest value of ${spoken(low)} measured`
        : `A trace between its lowest value of ${spoken(low)} and its highest of ${spoken(high)}, with the whole distance between them measured as ${spoken(2 * size)}`;

  const title =
    feature === 0
      ? "The level, one swing up, and the value it arrives at"
      : feature === 1
        ? "The level, one swing down, and the value it arrives at"
        : "From the lowest value to the highest, in one measurement";

  return (
    <svg viewBox={`0 0 440 ${VIEW_H}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <PlaneFrame />
      <Level y={my(d)} color={SIGNAL} width={1.2} />
      <Level
        y={my(high)}
        color={feature === 1 ? SOFT : CIVIC}
        dash={feature === 1 ? "3 5" : "none"}
        width={feature === 1 ? 1 : 1.8}
      />
      <Level
        y={my(low)}
        color={feature === 0 ? SOFT : CIVIC}
        dash={feature === 0 ? "3 5" : "none"}
        width={feature === 0 ? 1 : 1.8}
      />

      <path
        d={tracePath((t) => a * trig(fn, b * (t - shift)) + d, mx, my, view)}
        fill="none"
        stroke={LABEL}
        strokeWidth={1.8}
      />

      <Span from={spanFrom} to={spanTo} along={spanAt} vertical color={spanColor} />
      <PlotLabel box={spanLabel} latex={spanTex} fontSize={LABEL_SIZE} color={spanColor} />

      <MarginValue latex={`${high}`} y={my(high)} color={feature === 1 ? SOFT : CIVIC} />
      <MarginValue latex={`y = ${d}`} y={my(d)} color={SIGNAL} />
      <MarginValue latex={`${low}`} y={my(low)} color={feature === 0 ? SOFT : CIVIC} />

      <Rows rows={rows} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const TRG5_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d9.trg5.amplitude.l1": {
    Svg: ({ a = 3, b = 2, d = 1, fn = 0 }) => <AmplitudeWorked a={a} b={b} d={d} fn={fn} />,
    caption: ({ a = 3, d = 1 }) =>
      `The coefficient in front is $${a}$, and the amplitude is its size, so the trace reaches $${Math.abs(a)}$ above the level $y = ${d}$ and $${Math.abs(a)}$ below it. The coefficient inside sets how often that swing repeats and the constant on the end sets the level, so neither of them changes the reach.`,
  },

  "d9.trg5.period-radian.l2": {
    Svg: ({ a = 3, b = 4, fn = 0 }) => <PeriodWorked a={a} b={b} fn={fn} />,
    caption: ({ b = 4 }) =>
      `One cycle closes as soon as the inside has covered a whole turn, and the inside is $${b}x$, so the cycle ends where $${b}x = 2\\pi$. That puts the period at $${periodTex(b)}$, and the second cycle drawn beside it is the same shape again.`,
  },

  "d9.trg5.midline.l2": {
    Svg: ({ high = 7, low = 1, midline = 4, amplitude = 3 }) => (
      <MidlineWorked high={high} low={low} midline={midline} amplitude={amplitude} />
    ),
    caption: ({ high = 7, low = 1, midline = 4, amplitude = 3 }) =>
      `The trace runs the same distance above the midline as below it, so the midline is halfway between the two readings: $${high} + ${sp(low)} = ${high + low}$, and $${high + low} \\div 2 = ${midline}$. The two arrows are both $${amplitude}$ long, which is what "halfway" means here.`,
  },

  "d9.trg5.phase-shift.l3": {
    Svg: ({ a = 2, b = 2, num = 1, den = 4, fn = 0 }) => (
      <PhaseWorked a={a} b={b} num={num} den={den} fn={fn} />
    ),
    caption: ({ b = 2, num = 1, den = 4 }) =>
      `Written with $${b}$ outside the bracket, the inside reads $${b}\\left(x ${num > 0 ? "-" : "+"} ${radianMagTex(num, den)}\\right)$. A constant taken away inside the bracket slides the trace right and one added slides it left, so the solid trace sits $${radianMagTex(num, den)}$ to the ${num > 0 ? "right" : "left"} of the dashed one it was slid from, and the phase shift is $${radianTex(num, den)}$.`,
  },

  "d9.trg5.features.l3": {
    Svg: ({ a = 3, b = 4, d = 2, fn = 0, feature = 0, cn = 1, cd = 6 }) => (
      <FeaturesWorked a={a} b={b} d={d} fn={fn} feature={feature} cn={cn} cd={cd} />
    ),
    caption: ({ a = 3, d = 2, feature = 0 }) => {
      const size = Math.abs(a);
      const slide =
        "The coefficient inside the bracket and the constant taken away from $x$ set how often the pattern repeats and how far along it starts, so neither one moves a value up or down.";
      if (feature === 1) {
        return `The constant on the end puts the level at $y = ${d}$, and the size of the coefficient in front says the trace swings $${size}$ either side of that level. One swing down from the level is the lowest it goes: $${d} - ${size} = ${d - size}$. ${slide}`;
      }
      if (feature === 2) {
        return `The trace swings $${size}$ above the level and $${size}$ below it, so getting from its lowest value to its highest is one swing up and then another: $2 \\times ${size} = ${2 * size}$. The level itself never enters it, since the two ends move together when the level moves. ${slide}`;
      }
      return `The constant on the end puts the level at $y = ${d}$, and the size of the coefficient in front says the trace swings $${size}$ either side of that level. One swing up from the level is the highest it goes: $${d} + ${size} = ${d + size}$. ${slide}`;
    },
  },
};
