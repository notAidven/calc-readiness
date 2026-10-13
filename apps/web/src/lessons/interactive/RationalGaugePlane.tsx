/**
 * The shared drawing kit behind the RAT.5 ranging-chart widgets (Early Modern Cannon Tower
 * yard). It is NOT a registered lesson visual: it is the hand-rolled coordinate plane the four
 * `Rational*` RAT.5 widgets plot their curves on, kept in one place so every chart
 * in the lesson shares one math-to-screen map, one dashed-asymptote style, and one open
 * circle for a hole.
 *
 * There is no charting dependency here and there is not going to be one, because a
 * rational curve needs exactly the two things a chart library makes awkward:
 *
 *  - **Each branch is sampled on its own side of a pole.** A sample whose value leaves the
 *    visible window ends the current subpath, so the two branches around a vertical
 *    asymptote are separate `<path>` elements and the curve never draws the false vertical
 *    line that joining them would produce. That line is not cosmetic: it reads as "the
 *    chart passes through the forbidden reading", which is the opposite of the lesson.
 *  - **A removable discontinuity is drawn, not omitted.** A hole is one open circle in the
 *    paper color on top of an otherwise continuous branch.
 *
 * Every math label goes through `SvgMath`; the only plain `<text>` here is a bare integer
 * axis tick, where KaTeX would buy nothing and cost one `foreignObject` each.
 */

import { BRICK, CIVIC, interiorTicks, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";

export interface GaugePlane {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** Math x to screen x. */
  mapX(x: number): number;
  /** Math y to screen y (screen y grows downward, so this flips). */
  mapY(y: number): number;
}

/** Build the linear math-to-screen map for one plot box. */
export function createGaugePlane({
  xMin,
  xMax,
  yMin,
  yMax,
  left = 40,
  right = 424,
  top = 14,
  bottom = 178,
}: {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}): GaugePlane {
  return {
    xMin,
    xMax,
    yMin,
    yMax,
    left,
    right,
    top,
    bottom,
    mapX: (x) => left + ((x - xMin) / (xMax - xMin)) * (right - left),
    mapY: (y) => bottom - ((y - yMin) / (yMax - yMin)) * (bottom - top),
  };
}

/**
 * Sample `f` across the plane and return one path per continuous visible branch. A sample
 * that is undefined, infinite, or outside the window closes the current branch, which is
 * what keeps the two sides of a vertical asymptote from being stitched together.
 */
export function gaugeCurvePaths(
  plane: GaugePlane,
  f: (x: number) => number,
  poles: readonly number[] = [],
  samples = 360,
): string[] {
  const paths: string[] = [];
  const step = (plane.xMax - plane.xMin) / samples;
  let current = "";
  const close = () => {
    // A single sampled point draws nothing, so only keep a branch with real length.
    if (current.includes("L")) {
      paths.push(current.trim());
    }
    current = "";
  };
  for (let index = 0; index <= samples; index += 1) {
    const x = plane.xMin + index * step;
    const onPole = poles.some((pole) => Math.abs(x - pole) < step / 2);
    const y = onPole ? Number.NaN : f(x);
    if (!Number.isFinite(y) || y < plane.yMin || y > plane.yMax) {
      close();
      continue;
    }
    const command = current.length === 0 ? "M" : "L";
    current += `${command}${plane.mapX(x).toFixed(2)} ${plane.mapY(y).toFixed(2)} `;
  }
  close();
  return paths;
}

/**
 * The plot frame: the box, the two axes, the tick MARKS and the two variable labels. The
 * tick NUMBERS are not here, because SVG paints in document order and a rational curve
 * dives straight down the axis it is asymptotic to: a branch drawn after the axes covers
 * the very tick a learner is reading the pole's height against. They live in
 * `GaugeTickLabels`, which every gauge renders after its curve.
 */
export function GaugeAxes({
  plane,
  xTicks = [],
  yTicks = [],
  yLatex = "y",
}: {
  plane: GaugePlane;
  xTicks?: readonly number[];
  yTicks?: readonly number[];
  /** LaTeX for the vertical axis label; the gauge reads potency, so often `P(x)`. */
  yLatex?: string;
}) {
  const axisY = plane.mapY(0);
  const axisX = plane.mapX(0);
  return (
    <g>
      <rect
        data-plot-frame=""
        x={plane.left}
        y={plane.top}
        width={plane.right - plane.left}
        height={plane.bottom - plane.top}
        fill="var(--paper)"
        stroke={LINE}
        strokeWidth={1}
        rx={6}
      />
      <line
        x1={plane.left}
        y1={axisY}
        x2={plane.right}
        y2={axisY}
        stroke={SOFT}
        strokeWidth={1.25}
      />
      <line
        x1={axisX}
        y1={plane.top}
        x2={axisX}
        y2={plane.bottom}
        stroke={SOFT}
        strokeWidth={1.25}
      />
      {xTicks.map((tick) => (
        <line
          key={`x${tick}`}
          x1={plane.mapX(tick)}
          y1={axisY - 4}
          x2={plane.mapX(tick)}
          y2={axisY + 4}
          stroke={SOFT}
          strokeWidth={1}
        />
      ))}
      {yTicks.map((tick) => (
        <line
          key={`y${tick}`}
          x1={axisX - 4}
          y1={plane.mapY(tick)}
          x2={axisX + 4}
          y2={plane.mapY(tick)}
          stroke={SOFT}
          strokeWidth={1}
        />
      ))}
      {/* Both axis names are drawn ON the plane, over the grid and whatever the widget has
          revealed, so both carry a plate. `"plot"` and not the default card colour, because
          the rect above fills the plane with `var(--paper)` and a plate only disappears into
          the surface it is the colour of. */}
      <SvgMath
        latex="x"
        x={plane.right - 6}
        y={axisY - 13}
        anchor="end"
        fontSize={13}
        color={SOFT}
        w={40}
        plate="plot"
      />
      <SvgMath
        latex={yLatex}
        x={plane.left + 8}
        y={plane.top + 12}
        anchor="start"
        fontSize={13}
        color={SOFT}
        w={90}
        plate="plot"
      />
    </g>
  );
}

/**
 * The numeric tick labels, rendered LAST by each gauge so nothing drawn on the plane can
 * hide one. Each carries a paper-colored halo, because sitting on top now means sitting on
 * top of the axis line and of any dashed asymptote the widget has revealed.
 *
 * A tick on the end of the range keeps its MARK and loses its number: the mark is a stroke
 * along the border, but the number is centered on it and would be drawn half outside.
 */
export function GaugeTickLabels({
  plane,
  xTicks = [],
  yTicks = [],
}: {
  plane: GaugePlane;
  xTicks?: readonly number[];
  yTicks?: readonly number[];
}) {
  const axisY = plane.mapY(0);
  const axisX = plane.mapX(0);
  const numberedX = interiorTicks(xTicks, plane.xMin, plane.xMax);
  const numberedY = interiorTicks(yTicks, plane.yMin, plane.yMax);
  const halo = {
    fontSize: 11,
    fill: SOFT,
    stroke: "var(--paper)",
    strokeWidth: 3,
    paintOrder: "stroke" as const,
  };
  return (
    <g>
      {numberedX.map((tick) => (
        <text
          key={`x${tick}`}
          x={plane.mapX(tick)}
          y={axisY + 17}
          textAnchor="middle"
          {...halo}
        >
          {tick}
        </text>
      ))}
      {numberedY.map((tick) => (
        <text
          key={`y${tick}`}
          x={axisX - 9}
          y={plane.mapY(tick) + 4}
          textAnchor="end"
          {...halo}
        >
          {tick}
        </text>
      ))}
    </g>
  );
}

/** One curve, drawn as one `<path>` per visible branch. */
export function GaugeCurve({
  plane,
  f,
  poles = [],
  color = CIVIC,
  strokeWidth = 2.25,
}: {
  plane: GaugePlane;
  f: (x: number) => number;
  poles?: readonly number[];
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <g>
      {gaugeCurvePaths(plane, f, poles).map((d) => (
        <path
          key={d.slice(0, 24)}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

/** A dashed vertical asymptote: the input where the ranging chart runs off the page. */
export function GaugeVerticalAsymptote({
  plane,
  x,
  color = BRICK,
}: {
  plane: GaugePlane;
  x: number;
  color?: string;
}) {
  return (
    <line
      x1={plane.mapX(x)}
      y1={plane.top + 2}
      x2={plane.mapX(x)}
      y2={plane.bottom - 2}
      stroke={color}
      strokeWidth={1.75}
      strokeDasharray="6 5"
    />
  );
}

/** A dashed end-behavior asymptote: the level the reading settles onto. */
export function GaugeHorizontalAsymptote({
  plane,
  y,
  color = SIGNAL,
}: {
  plane: GaugePlane;
  y: number;
  color?: string;
}) {
  return (
    <line
      x1={plane.left + 2}
      y1={plane.mapY(y)}
      x2={plane.right - 2}
      y2={plane.mapY(y)}
      stroke={color}
      strokeWidth={1.75}
      strokeDasharray="6 5"
    />
  );
}

/** A hole: one open circle in the paper color, sitting on an otherwise whole branch. */
export function GaugeHole({
  plane,
  x,
  y,
  color = SIGNAL,
}: {
  plane: GaugePlane;
  x: number;
  y: number;
  color?: string;
}) {
  return (
    <circle
      cx={plane.mapX(x)}
      cy={plane.mapY(y)}
      r={5}
      fill="var(--paper)"
      stroke={color}
      strokeWidth={2.25}
    />
  );
}

/** A filled reading on the curve (an intercept, or the dial's current dose). */
export function GaugePoint({
  plane,
  x,
  y,
  color = LABEL,
  r = 4.5,
}: {
  plane: GaugePlane;
  x: number;
  y: number;
  color?: string;
  r?: number;
}) {
  return <circle cx={plane.mapX(x)} cy={plane.mapY(y)} r={r} fill={color} />;
}
