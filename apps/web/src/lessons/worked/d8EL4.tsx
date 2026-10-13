/**
 * Worked-solution figures for the D8 EL.4 practice templates (graph a logarithm, state its
 * domain).
 *
 * Four of the five shapes are about the GRAPH, and they get a coordinate plane, because the
 * thing each one asks for is a feature of the picture: the wall the curve runs down beside, the
 * inputs it exists over, the point where it crosses. A row stack could print the algebra but not
 * the fact that all three of those are the same boundary seen three ways, which is the whole of
 * what the node teaches. `LogPlane` draws them all, with the boundary, the allowed side and the
 * curve driven by the same three numbers the prompt was built from.
 *
 * The fifth shape evaluates the logarithm rather than reading its graph, so it is
 * `ExpressionReductionWorked`, the shared column: what it teaches is the ORDER of three moves,
 * one line each.
 *
 * Every figure is driven only by its own template's `template_params`, with a default for each
 * one it reads, and it RECOMPUTES what `generate()` computed rather than being handed the
 * answer: the boundary, the intercept and the exponent are all derived here, so a figure cannot
 * disagree with the arithmetic of the prompt above it.
 *
 * Plane rules (`svg` skill): the plot rect carries `data-plot-frame`, every on-plane label goes
 * through `labelSpot` + `PlotLabel` against a `plotLabelFrame`, and only the ticks that clear
 * the border by `fittingTicks`' margin carry a number. The vertical scale's numbers sit in the
 * left MARGIN rather than on the plane, because the window is centred on the boundary and the
 * vertical axis is off the picture whenever that boundary is far from the origin.
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
  SIGNAL,
  SOFT,
  SvgMath,
} from "../svgKit";
import {
  ExpressionReductionWorked,
  numStr,
  type ReductionRow,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";

/* -------------------------------------------------------------------------- */
/* LaTeX helpers (mirrors of the item-bank formatters)                         */
/* -------------------------------------------------------------------------- */

/** `x - 3` or `x + 4`: the argument of a plain horizontal shift. */
function shiftArg(h: number): string {
  return h < 0 ? `x + ${-h}` : `x - ${h}`;
}

/** `7 - x` or `-x - 4`: the same boundary with the variable reflected. */
function flipArg(h: number): string {
  return h < 0 ? `-x - ${-h}` : `${h} - x`;
}

/** `6 - 3x` or `-2x - 6`: a reflected argument carrying a coefficient. */
export function coefficientArg(k: number, m: number): string {
  const kx = k === 1 ? "x" : `${k}x`;
  const c = k * m;
  return c > 0 ? `${c} - ${kx}` : `-${kx} - ${-c}`;
}

/** A signed shift as the operator that precedes its magnitude: `+ 3`, `- 3`. */
function signedTail(value: number): string {
  return `${value < 0 ? "-" : "+"} ${Math.abs(value)}`;
}

/** The log token a `tok` flag selects, exactly as `generate()` selects it. */
function logToken(tok: number): string {
  return tok === 1 ? "\\ln" : "\\log";
}

/** The base a `tok` flag implies, for drawing the curve's steepness. */
function tokenBase(tok: number): number {
  return tok === 1 ? Math.E : 10;
}

/** A coordinate pair with the comma spaced the way KaTeX wants it. */
function pointTex(x: number, y: number): string {
  return `(${x},\\, ${y})`;
}

/** The domain in set-builder notation, as the answer key spells it. */
export function domainTex(m: number, dir: number): string {
  return `\\{x \\mid x ${dir > 0 ? ">" : "<"} ${m}\\}`;
}

/* -------------------------------------------------------------------------- */
/* The coordinate plane                                                        */
/* -------------------------------------------------------------------------- */

const PLOT = { left: 52, right: 396, top: 14, bottom: 214 };
const VIEW_H = 256;
/** How far either side of the boundary the window reaches, in math units. */
const X_REACH = 6;
const Y_HALF = 4.5;
const TICK_SIZE = 11;
const LABEL_SIZE = 13;

/**
 * A logarithm's graph, centred on the boundary of its domain.
 *
 * The window follows the boundary rather than the origin, which is what lets one figure serve a
 * shift of `-8` and a shift of `8`: what a learner has to see is the curve against its own wall,
 * and a window fixed on the origin would push one of those off the picture entirely.
 *
 * `dir` is the side the domain lies on, and it is also the sign inside the argument: the curve is
 * `y = log_base(dir * k * (x - m))`, so a reflected argument comes out as the mirror image
 * without a second code path.
 */
export function LogPlane({
  base,
  m,
  dir,
  k = 1,
  equation,
  title,
  ariaLabel,
  intercept,
}: {
  base: number;
  /** The boundary: the asymptote stands at `x = m` and the domain starts there. */
  m: number;
  /** `1` when the domain runs right of the boundary, `-1` when it runs left. */
  dir: 1 | -1;
  /** The coefficient on the variable inside the argument. */
  k?: number;
  /** The LaTeX summary printed under the plot. */
  equation: string;
  title: string;
  ariaLabel: string;
  /** Marked and labelled when this shape is about the x-intercept. */
  intercept?: number;
}): JSX.Element {
  const xMin = m - X_REACH;
  const xMax = m + X_REACH;
  const mapX = (x: number): number =>
    PLOT.left + ((x - xMin) / (xMax - xMin)) * (PLOT.right - PLOT.left);
  const mapY = (y: number): number =>
    PLOT.top + ((Y_HALF - y) / (2 * Y_HALF)) * (PLOT.bottom - PLOT.top);

  const gridX: number[] = [];
  for (let value = Math.ceil(xMin) + 1; value <= Math.floor(xMax) - 1; value += 1) {
    gridX.push(value);
  }
  const gridY = [-4, -3, -2, -1, 1, 2, 3, 4];
  const numberedX = fittingTicks({
    ticks: gridX,
    place: mapX,
    half: (tick) => labelHalfW(String(tick), TICK_SIZE),
    start: PLOT.left,
    end: PLOT.right,
  });
  /** The vertical scale, numbered in the margin, so a distant boundary costs it nothing. */
  const numberedY = [-4, -2, 0, 2, 4];

  /** The curve, sampled over the allowed side and clipped to the window. */
  const path = (() => {
    const points: string[] = [];
    const steps = 400;
    const far = dir > 0 ? xMax : xMin;
    for (let step = 1; step <= steps; step += 1) {
      const x = m + ((far - m) * step) / steps;
      const inside = dir * k * (x - m);
      const y = Math.log(inside) / Math.log(base);
      if (!Number.isFinite(y) || y < -Y_HALF || y > Y_HALF) {
        continue;
      }
      points.push(`${mapX(x).toFixed(2)} ${mapY(y).toFixed(2)}`);
    }
    return points.length > 1 ? `M ${points.join(" L ")}` : "";
  })();

  /** The axis numbers inside the plot, as obstacles a placed label has to clear. */
  const tickBoxes: LabelBox[] = numberedX.map((tick) => ({
    x: mapX(tick),
    y: mapY(0) + 11,
    halfW: labelHalfW(String(tick), TICK_SIZE),
    halfH: labelHalfH(TICK_SIZE),
  }));

  const frame = plotLabelFrame(PLOT, 8);
  const asymptoteTex = `x = ${m}`;
  const asymptoteLabel = labelSpot({
    x: mapX(m),
    y: PLOT.top + 20,
    frame,
    dx: dir,
    dy: 0,
    halfW: labelHalfW(asymptoteTex, LABEL_SIZE),
    halfH: labelHalfH(LABEL_SIZE),
    gap: 8,
    avoid: tickBoxes,
  });
  const interceptTex = intercept === undefined ? "" : pointTex(intercept, 0);
  const interceptLabel =
    intercept === undefined
      ? null
      : labelSpot({
          x: mapX(intercept),
          y: mapY(0),
          frame,
          dx: dir,
          dy: -1,
          halfW: labelHalfW(interceptTex, LABEL_SIZE),
          halfH: labelHalfH(LABEL_SIZE),
          gap: 10,
          avoid: [...tickBoxes, asymptoteLabel],
        });

  return (
    <svg viewBox={`0 0 440 ${VIEW_H}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

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

      {/* The inputs the logarithm accepts, which is the domain the shape is about. */}
      <rect
        x={dir > 0 ? mapX(m) : PLOT.left + 1}
        y={PLOT.top + 1}
        width={dir > 0 ? PLOT.right - mapX(m) - 1 : mapX(m) - PLOT.left - 1}
        height={PLOT.bottom - PLOT.top - 2}
        fill={CIVIC}
        fillOpacity={0.09}
      />

      {gridX.map((tick) => (
        <line
          key={`gx${tick}`}
          x1={mapX(tick)}
          y1={PLOT.top}
          x2={mapX(tick)}
          y2={PLOT.bottom}
          stroke={LINE}
          strokeWidth={0.5}
          strokeOpacity={0.5}
        />
      ))}
      {gridY.map((tick) => (
        <line
          key={`gy${tick}`}
          x1={PLOT.left}
          y1={mapY(tick)}
          x2={PLOT.right}
          y2={mapY(tick)}
          stroke={LINE}
          strokeWidth={0.5}
          strokeOpacity={0.5}
        />
      ))}

      <line
        x1={PLOT.left}
        y1={mapY(0)}
        x2={PLOT.right}
        y2={mapY(0)}
        stroke={SOFT}
        strokeWidth={1.25}
      />
      {xMin < 0 && xMax > 0 && (
        <line
          x1={mapX(0)}
          y1={PLOT.top}
          x2={mapX(0)}
          y2={PLOT.bottom}
          stroke={SOFT}
          strokeWidth={1.25}
        />
      )}

      {path !== "" && <path d={path} fill="none" stroke={CIVIC} strokeWidth={2.4} />}

      {/* The asymptote, dashed because the curve never reaches it. */}
      <line
        x1={mapX(m)}
        y1={PLOT.top + 1}
        x2={mapX(m)}
        y2={PLOT.bottom - 1}
        stroke={BRICK}
        strokeWidth={2}
        strokeDasharray="6 4"
      />

      {intercept !== undefined && (
        <circle cx={mapX(intercept)} cy={mapY(0)} r={4.5} fill={SIGNAL} />
      )}

      {numberedX.map((tick) => (
        <text
          key={`tx${tick}`}
          x={mapX(tick)}
          y={mapY(0) + 15}
          textAnchor="middle"
          fontSize={TICK_SIZE}
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
          x={PLOT.left - 8}
          y={mapY(tick) + 4}
          textAnchor="end"
          fontSize={TICK_SIZE}
          fill={SOFT}
        >
          {tick}
        </text>
      ))}

      <PlotLabel
        box={asymptoteLabel}
        latex={asymptoteTex}
        fontSize={LABEL_SIZE}
        color={BRICK}
      />
      {interceptLabel !== null && (
        <PlotLabel
          box={interceptLabel}
          latex={interceptTex}
          fontSize={LABEL_SIZE}
          color={SIGNAL}
        />
      )}

      <SvgMath latex={equation} x={220} y={238} fontSize={17} color={LABEL} w={420} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Row stack (the shape that evaluates rather than reads a graph)              */
/* -------------------------------------------------------------------------- */

/**
 * Substitute, read the exponent off the base, then combine the outside constant. Three moves in
 * that order, which is what makes the shape an L3: any other order gets a different number.
 */
function evaluateRows(b: number, k: number, h: number, d: number): ReductionRow[] {
  const power = b ** k;
  const x0 = h + power;
  return [
    { tokens: [{ text: `y = \\log_{${b}}(${shiftArg(h)}) ${signedTail(d)}` }] },
    { tokens: [{ text: `${x0} ${signedTail(-h)} = ${power}`, color: SIGNAL }] },
    { tokens: [{ text: `y = \\log_{${b}} ${power} ${signedTail(d)}` }] },
    { tokens: [{ text: `\\log_{${b}} ${power} = ${k}`, color: SIGNAL }] },
    { tokens: [{ text: `y = ${k} ${signedTail(d)} = ${k + d}`, color: CIVIC }] },
  ];
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const EL4_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d8.el4.asymptote.l1": {
    Svg: ({ h = 3, tok = 0 }) => (
      <LogPlane
        base={tokenBase(tok)}
        m={h}
        dir={1}
        equation={`y = ${logToken(tok)}(${shiftArg(h)}), \\quad x = ${h}`}
        title="A shifted logarithm and the vertical asymptote its domain begins at"
        ariaLabel={`A logarithm shifted so that its vertical asymptote stands at x equals ${spoken(h)}, with the shaded inputs to the right of it`}
      />
    ),
    caption: ({ h = 3 }) =>
      `The argument $${shiftArg(h)}$ has to be positive, which is $x > ${h}$, so the shaded inputs are the domain. The dashed line $x = ${h}$ is where that domain begins, and the curve plunges beside it without ever reaching it.`,
  },

  "d8.el4.domain.l2": {
    Svg: ({ h = 3, b = 2 }) => (
      <LogPlane
        base={b}
        m={h}
        dir={1}
        equation={`y = \\log_{${b}}(${shiftArg(h)}), \\quad ${domainTex(h, 1)}`}
        title="The inputs a shifted logarithm accepts, shaded on the plane"
        ariaLabel={`A logarithm of base ${spoken(b)} whose shaded domain is every input greater than ${spoken(h)}`}
      />
    ),
    caption: ({ h = 3, b = 2 }) =>
      `Every logarithm accepts exactly the positive arguments, whatever its base, so the base $${b}$ leaves the condition $${shiftArg(h)} > 0$ untouched. That solves to $x > ${h}$, written $${domainTex(h, 1)}$.`,
  },

  "d8.el4.x-intercept.l2": {
    Svg: ({ flip = 0, h = 3, tok = 0 }) => {
      const dir = flip === 1 ? -1 : 1;
      const xi = flip === 1 ? h - 1 : h + 1;
      const arg = flip === 1 ? flipArg(h) : shiftArg(h);
      return (
        <LogPlane
          base={tokenBase(tok)}
          m={h}
          dir={dir}
          intercept={xi}
          equation={`y = ${logToken(tok)}(${arg}), \\quad ${pointTex(xi, 0)}`}
          title="Where a shifted logarithm crosses the horizontal axis"
          ariaLabel={`A logarithm crossing the horizontal axis at ${spoken(xi)} comma 0, one unit from its asymptote at x equals ${spoken(h)}`}
        />
      );
    },
    caption: ({ flip = 0, h = 3 }) => {
      const xi = flip === 1 ? h - 1 : h + 1;
      const arg = flip === 1 ? flipArg(h) : shiftArg(h);
      return `A logarithm is zero exactly where its argument is $1$, so the crossing is at $${arg} = 1$, which is $x = ${xi}$. It sits one unit from the asymptote on the side the domain runs, which is why the marked point is $${pointTex(xi, 0)}$.`;
    },
  },

  "d8.el4.domain-shift.l3": {
    Svg: ({ k = 1, m = 3, tok = 0 }) => (
      <LogPlane
        base={tokenBase(tok)}
        m={m}
        dir={-1}
        k={k}
        equation={`y = ${logToken(tok)}(${coefficientArg(k, m)}), \\quad ${domainTex(m, -1)}`}
        title="A reflected logarithm, whose domain runs left of the boundary"
        ariaLabel={`A logarithm reflected so that its shaded domain is every input less than ${spoken(m)}, with the asymptote at x equals ${spoken(m)}`}
      />
    ),
    caption: ({ k = 1, m = 3 }) =>
      k === 1
        ? `The variable carries a minus sign, so requiring $${coefficientArg(k, m)} > 0$ leaves $x$ BELOW the boundary rather than above it: the shaded inputs run left of $x = ${m}$, and the domain is $${domainTex(m, -1)}$.`
        : `Requiring $${coefficientArg(k, m)} > 0$ gives $${k * m} > ${k}x$, and dividing by the positive $${k}$ leaves $x < ${m}$. The minus sign in front of the variable is what put the shaded inputs to the LEFT of the asymptote, so the domain is $${domainTex(m, -1)}$.`,
  },

  "d8.el4.evaluate-point.l3": {
    Svg: ({ b = 2, k = 2, h = 3, d = 1 }) => (
      <ExpressionReductionWorked
        rows={evaluateRows(b, k, h, d)}
        title="A shifted logarithm evaluated at one input"
        ariaLabel={`Substituting into the argument gives ${spoken(b ** k)}, whose logarithm base ${spoken(b)} is ${spoken(k)}, and combining the outside constant gives ${spoken(k + d)}`}
      />
    ),
    caption: ({ b = 2, k = 2, d = 1 }) =>
      `Three moves, and the order is what matters: substituting turns the argument into $${numStr(b ** k)}$, the logarithm hands back the exponent that reaches it from base $${b}$, and only then is the constant outside the logarithm combined, leaving $y = ${numStr(k + d)}$.`,
  },
};
