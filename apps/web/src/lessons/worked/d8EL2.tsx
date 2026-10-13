/**
 * Worked-solution figures for the D8 EL.2 practice templates (the graph of an exponential,
 * and what a transformation does to it).
 *
 * Two archetypes, chosen per shape rather than uniformly. THREE of the five shapes answer
 * with something that IS a position on the plane (a horizontal line, a crossing height, a
 * moved point), and none of them can be explained without one: "the graph presses toward
 * $y = k$ and never reaches it" is a claim about a picture, and a row of algebra can restate
 * it but cannot show it. So those get `ExpWorkedPlane`, modelled on `worked/d7LF2.tsx`'s
 * `WorkedPlane` and obeying the same plane rules: the plot rect carries `data-plot-frame`,
 * every on-plane label is placed by `labelSpot` inside a `plotLabelFrame` and drawn with
 * `PlotLabel`, and only the ticks that clear the border by `fittingTicks`'s margin carry a
 * number.
 *
 * The two remaining shapes teach an ORDER of moves rather than a position (compose two
 * horizontal shifts; read which single piece of a rule changed), so they get the shared
 * `ExpressionReductionWorked` row stack, one line per move.
 *
 * One deliberate difference from `d7LF2`'s plane. That one uses ONE unit for both axes,
 * because a perpendicular pair has to be drawn square. An exponential has no such property
 * to preserve and a shared unit is actively wrong for it: at the same scale on both axes, a
 * rule reaching a height of two hundred over four units of input is a vertical line. So the
 * axes here scale independently, and the y window is stated by each figure as the list of
 * heights it must SHOW (`include`), with the curves clipped to whatever that window turns out
 * to be. Sizing the window off the curve instead is what squashes the intercept and the
 * asymptote into the same pixel row on a large base.
 *
 * Every figure is driven only by its own template's `template_params`, with a default for
 * each one, and decodes the flags exactly as `generate()` encodes them in
 * `packages/item-bank/src/d8/nodes/EL.2/index.ts`.
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

/** `+` or `-` as the operator that precedes a signed value's magnitude. */
function op(value: number): string {
  return value < 0 ? "-" : "+";
}

/** A constant tail on a rule: ` + 5`, ` - 3`, or nothing when it is zero. */
function tail(k: number): string {
  return k === 0 ? "" : ` ${op(k)} ${Math.abs(k)}`;
}

/** An exponent of the form `x - p`, with `p`'s sign folded into the operator. */
function shiftedExponent(p: number): string {
  return p === 0 ? "x" : `x ${op(-p)} ${Math.abs(p)}`;
}

/** A coordinate pair as LaTeX, with the comma spaced the way KaTeX wants it. */
function pointTex(x: number, y: number): string {
  return `(${numStr(x)},\\, ${numStr(y)})`;
}

/* -------------------------------------------------------------------------- */
/* The coordinate plane                                                        */
/* -------------------------------------------------------------------------- */

const PLOT = { left: 46, right: 396, top: 14, bottom: 214 };
const VIEW_H = 252;
const LABEL_SIZE = 13;
const TICK_SIZE = 11;
/** How finely a curve is sampled across the window. Enough that a steep arm reads smooth. */
const SAMPLES = 160;

interface PlaneCurve {
  /** The rule, in math units. */
  fn: (x: number) => number;
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

interface PlaneRule {
  /** The height of the horizontal line, in math units. */
  y: number;
  /** LaTeX naming it, e.g. `y = 4`. */
  label: string;
}

/** The nice axis step at or above `rough`: a power of ten times 1, 2 or 5. */
function niceStep(rough: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 1)));
  for (const multiple of [1, 2, 5, 10]) {
    const step = magnitude * multiple;
    if (step >= rough) {
      return step;
    }
  }
  return magnitude * 10;
}

/** Every multiple of `step` inside `[min, max]`, zero included (the axis is drawn separately). */
function ticksBetween(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  const first = Math.ceil(min / step) * step;
  for (let value = first; value <= max + 1e-9; value += step) {
    const rounded = Math.round(value / step) * step;
    if (rounded !== 0) {
      out.push(rounded);
    }
  }
  return out;
}

/**
 * A small coordinate plane whose axes scale independently, sized to the heights the figure
 * says it must show.
 *
 * `include` is the contract that keeps an exponential legible: the caller lists the y values
 * whose relationship is the teaching (the asymptote, the crossing height, the moved point),
 * the window is padded around those, and the curves are CLIPPED to it rather than allowed to
 * set it. A curve reaching a height of two hundred does not then flatten the four units the
 * figure is actually about.
 */
export function ExpWorkedPlane({
  curves,
  points,
  rule,
  include,
  xMin,
  xMax,
  equation,
  title,
  ariaLabel,
}: {
  curves: readonly PlaneCurve[];
  points?: readonly PlanePoint[];
  rule?: PlaneRule;
  include: readonly number[];
  xMin: number;
  xMax: number;
  /** The LaTeX summary printed under the plot. */
  equation: string;
  title: string;
  ariaLabel: string;
}): JSX.Element {
  const marks = points ?? [];
  const heights = [...include, ...marks.map((point) => point.y)];
  if (rule) {
    heights.push(rule.y);
  }
  const lowest = Math.min(...heights);
  const highest = Math.max(...heights);
  const pad = Math.max((highest - lowest) * 0.22, 1);
  const yMin = lowest - pad;
  const yMax = highest + pad;

  const plotW = PLOT.right - PLOT.left;
  const plotH = PLOT.bottom - PLOT.top;
  const mapX = (x: number): number => PLOT.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const mapY = (y: number): number => PLOT.bottom - ((y - yMin) / (yMax - yMin)) * plotH;

  const yStep = niceStep((yMax - yMin) / 5);
  const xStep = niceStep((xMax - xMin) / 6);
  const xTicks = ticksBetween(xMin, xMax, xStep);
  const yTicks = ticksBetween(yMin, yMax, yStep);
  const numberedX = fittingTicks({
    ticks: xTicks,
    place: mapX,
    half: (tick) => labelHalfW(String(tick), TICK_SIZE),
    start: PLOT.left,
    end: PLOT.right,
  });
  const numberedY = fittingTicks({
    ticks: yTicks,
    place: mapY,
    half: () => labelHalfH(TICK_SIZE),
    start: PLOT.top,
    end: PLOT.bottom,
  });

  const axisX = yMin < 0 && yMax > 0 ? mapY(0) : null;
  const axisY = xMin < 0 && xMax > 0 ? mapX(0) : null;
  /** Where the y-axis numbers hang: off the vertical axis when there is one, else the frame. */
  const numberColumn = axisY ?? PLOT.left + 6;

  /** One curve as a list of unbroken runs, cut wherever it leaves the window. */
  const runs = (curve: PlaneCurve): string[] => {
    const out: string[] = [];
    let current: string[] = [];
    for (let index = 0; index <= SAMPLES; index += 1) {
      const x = xMin + ((xMax - xMin) * index) / SAMPLES;
      const y = curve.fn(x);
      if (Number.isFinite(y) && y >= yMin && y <= yMax) {
        current.push(`${mapX(x).toFixed(2)},${mapY(y).toFixed(2)}`);
      } else if (current.length > 1) {
        out.push(current.join(" "));
        current = [];
      } else {
        current = [];
      }
    }
    if (current.length > 1) {
      out.push(current.join(" "));
    }
    return out;
  };

  /*
   * Labels are placed against the plot rather than nudged off the thing they name. The window
   * here is sized to the params, so where a point sits in the box changes from draw to draw,
   * and a fixed offset walks off the grid the first time a point lands near an edge.
   */
  const labelFrame = plotLabelFrame(PLOT, 8);
  const tickBoxes: LabelBox[] = [
    ...numberedY.map((tick) => ({
      x: numberColumn - 8 - labelHalfW(String(tick), TICK_SIZE),
      y: mapY(tick),
      halfW: labelHalfW(String(tick), TICK_SIZE),
      halfH: labelHalfH(TICK_SIZE),
    })),
    ...numberedX.map((tick) => ({
      x: mapX(tick),
      y: (axisX ?? PLOT.bottom) + 11,
      halfW: labelHalfW(String(tick), TICK_SIZE),
      halfH: labelHalfH(TICK_SIZE),
    })),
  ];
  const placed: LabelBox[] = [];
  const ruleBox = rule
    ? labelSpot({
        x: mapX(xMin + (xMax - xMin) * 0.26),
        y: mapY(rule.y),
        frame: labelFrame,
        dx: 0,
        dy: -1,
        halfW: labelHalfW(rule.label, LABEL_SIZE),
        halfH: labelHalfH(LABEL_SIZE),
        gap: 9,
        avoid: tickBoxes,
      })
    : null;
  if (ruleBox) {
    placed.push(ruleBox);
  }
  const pointLabels: { point: PlanePoint; box: LabelBox }[] = [];
  for (const point of marks.filter((mark) => mark.label !== undefined)) {
    const box = labelSpot({
      x: mapX(point.x),
      y: mapY(point.y),
      frame: labelFrame,
      dx: 1,
      dy: -1,
      halfW: labelHalfW(point.label ?? "", LABEL_SIZE),
      halfH: labelHalfH(LABEL_SIZE),
      gap: 10,
      avoid: [...tickBoxes, ...placed],
    });
    placed.push(box);
    pointLabels.push({ point, box });
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
      {xTicks.map((tick) => (
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
      {yTicks.map((tick) => (
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
      {axisX !== null && (
        <line
          x1={PLOT.left}
          y1={axisX}
          x2={PLOT.right}
          y2={axisX}
          stroke={SOFT}
          strokeWidth={1.25}
        />
      )}
      {axisY !== null && (
        <line
          x1={axisY}
          y1={PLOT.top}
          x2={axisY}
          y2={PLOT.bottom}
          stroke={SOFT}
          strokeWidth={1.25}
        />
      )}

      {rule && (
        <line
          x1={PLOT.left}
          y1={mapY(rule.y)}
          x2={PLOT.right}
          y2={mapY(rule.y)}
          stroke={SIGNAL}
          strokeWidth={1.6}
          strokeDasharray="7 5"
        />
      )}

      {curves.map((curve, index) =>
        runs(curve).map((run, part) => (
          <polyline
            // biome-ignore lint/suspicious/noArrayIndexKey: curves are static per figure
            key={`c${index}-${part}`}
            points={run}
            fill="none"
            stroke={curve.color}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeDasharray={curve.dashed ? "7 5" : undefined}
          />
        )),
      )}

      {numberedX.map((tick) => (
        <text
          key={`tx${tick}`}
          x={mapX(tick)}
          y={(axisX ?? PLOT.bottom) + 15}
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
          x={numberColumn - 8}
          y={mapY(tick) + 4}
          textAnchor="end"
          fontSize={TICK_SIZE}
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
      {ruleBox && rule && (
        <PlotLabel box={ruleBox} latex={rule.label} fontSize={LABEL_SIZE} color={SIGNAL} />
      )}
      {pointLabels.map(({ point, box }, index) => (
        <PlotLabel
          // biome-ignore lint/suspicious/noArrayIndexKey: two labels may share a coordinate
          key={`l${index}:${point.x}:${point.y}`}
          box={box}
          latex={point.label ?? ""}
          fontSize={LABEL_SIZE}
          color={point.color}
        />
      ))}

      <SvgMath latex={equation} x={220} y={236} fontSize={17} color={LABEL} w={420} />
    </svg>
  );
}

/** The x window a base needs so one step of growth fills the box rather than overflowing it. */
function windowTop(b: number): number {
  return b === 2 ? 2 : 1;
}

/* -------------------------------------------------------------------------- */
/* Row stacks (compose two shifts; read which piece changed)                   */
/* -------------------------------------------------------------------------- */

/** One row of a derivation, its whole expression in a single token. */
function row(latex: string, color?: string): ReductionRow {
  return { tokens: [{ text: latex, ...(color === undefined ? {} : { color }) }] };
}

/** The two horizontal shifts, applied one at a time and then collected. */
function composeShiftRows(a: number, b: number, p: number, d: number): ReductionRow[] {
  const c = p + d;
  return [
    row(`y = ${a} \\cdot ${b}^{${shiftedExponent(p)}}`, CIVIC),
    row(`x \\;\\mapsto\\; x ${op(-d)} ${Math.abs(d)}`, SIGNAL),
    row(`y = ${a} \\cdot ${b}^{(x ${op(-d)} ${Math.abs(d)}) ${op(-p)} ${Math.abs(p)}}`),
    row(`${-d} ${op(-p)} ${Math.abs(p)} = ${-c}`),
    row(`E = ${shiftedExponent(c)}`, CIVIC),
  ];
}

/** How each transformation names itself inside a KaTeX row. */
const TRANSFORM_ROW: readonly string[] = [
  "\\text{shift up}",
  "\\text{shift down}",
  "\\text{shift left}",
  "\\text{shift right}",
  "\\text{reflect over the } x\\text{-axis}",
  "\\text{reflect over the } y\\text{-axis}",
];

/** The transformed rule for each `kind`, decoded exactly as `generate()` encodes it. */
function transformedTex(kind: number, a: number, b: number, c: number): string {
  const rules = [
    `${a} \\cdot ${b}^{x} + ${c}`,
    `${a} \\cdot ${b}^{x} - ${c}`,
    `${a} \\cdot ${b}^{x + ${c}}`,
    `${a} \\cdot ${b}^{x - ${c}}`,
    `-${a} \\cdot ${b}^{x}`,
    `${a} \\cdot ${b}^{-x}`,
  ];
  return rules[kind] ?? (rules[0] as string);
}

/** Which PART of the rule moved, named between the two rules rather than after them. */
const CHANGED_PIECE: readonly string[] = [
  "\\text{the constant at the end}",
  "\\text{the constant at the end}",
  "\\text{a constant in the exponent}",
  "\\text{a constant in the exponent}",
  "\\text{a minus sign in front}",
  "\\text{a minus sign on the exponent}",
];

function whichTransformRows(kind: number, a: number, b: number, c: number): ReductionRow[] {
  return [
    row(`f(x) = ${a} \\cdot ${b}^{x}`),
    row(`g(x) = ${transformedTex(kind, a, b, c)}`, SIGNAL),
    row(CHANGED_PIECE[kind] ?? (CHANGED_PIECE[0] as string), BRICK),
    row(TRANSFORM_ROW[kind] ?? (TRANSFORM_ROW[0] as string), CIVIC),
  ];
}

/* -------------------------------------------------------------------------- */
/* The anchor point's image, decoded as `generate()` encodes it                 */
/* -------------------------------------------------------------------------- */

/** The transformed curve for each anchor `kind`, so the moved point sits on something. */
function anchorCurve(
  kind: number,
  b: number,
  k: number,
  dx: number,
  mirrorShift: number,
  stretch: number,
): (x: number) => number {
  if (kind === 1) {
    return (x) => b ** (x - dx);
  }
  if (kind === 2) {
    return (x) => -(b ** x) + mirrorShift;
  }
  if (kind === 3) {
    return (x) => stretch * b ** x;
  }
  return (x) => b ** x + k;
}

/** How each anchor move reads in the caption, in the same words the prompt used. */
function anchorMoveWords(
  kind: number,
  k: number,
  h: number,
  rightward: number,
  mirrorShift: number,
  stretch: number,
): string {
  if (kind === 1) {
    return `shifting it $${h}$ units to the ${rightward === 1 ? "right" : "left"}`;
  }
  if (kind === 2) {
    return `reflecting it over the $x$-axis and then shifting $${Math.abs(mirrorShift)}$ units ${mirrorShift > 0 ? "up" : "down"}`;
  }
  if (kind === 3) {
    return `stretching it vertically by a factor of $${stretch}$`;
  }
  return `shifting it $${Math.abs(k)}$ units ${k > 0 ? "up" : "down"}`;
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const EL2_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d8.el2.asymptote.l1": {
    Svg: ({ a = 2, b = 2, k = 1 }) => {
      const top = windowTop(b);
      return (
        <ExpWorkedPlane
          curves={[{ fn: (x) => a * b ** x + k, color: CIVIC }]}
          rule={{ y: k, label: `y = ${numStr(k)}` }}
          include={[k, a + k, a * b ** top + k]}
          xMin={-2}
          xMax={top + 0.4}
          equation={`y = ${a} \\cdot ${b}^{x}${tail(k)} \\quad\\Rightarrow\\quad y = ${numStr(k)}`}
          title="An exponential curve pressing toward its horizontal asymptote"
          ariaLabel={`The curve ${spoken(a)} times ${spoken(b)} to the x, plus ${spoken(k)}, flattening toward the dashed line y equals ${spoken(k)}`}
        />
      );
    },
    caption: ({ a = 2, b = 2, k = 1 }) =>
      `Running left, the exponent goes far negative and $${b}^{x}$ shrinks toward $0$ without reaching it, so the whole term $${a} \\cdot ${b}^{x}$ does too. What is left holding the graph up is the constant, which is why the dashed asymptote sits at $y = ${numStr(k)}$ and the coefficient $${a}$ never enters the answer.`,
  },

  "d8.el2.intercept.l2": {
    Svg: ({ a = 2, b = 2, k = 1, negated = 0, intercept = 3 }) => {
      const coefficient = negated === 1 ? -a : a;
      const top = windowTop(b);
      return (
        <ExpWorkedPlane
          curves={[{ fn: (x) => coefficient * b ** x + k, color: CIVIC }]}
          rule={{ y: k, label: `y = ${numStr(k)}` }}
          points={[{ x: 0, y: intercept, color: BRICK, label: pointTex(0, intercept) }]}
          include={[k, intercept, coefficient * b ** top + k]}
          xMin={-2}
          xMax={top + 0.4}
          equation={`x = 0 \\;\\Rightarrow\\; y = ${numStr(coefficient)}${tail(k)} = ${numStr(intercept)}`}
          title="Where an exponential curve crosses the vertical axis"
          ariaLabel={`The curve crossing the vertical axis at a height of ${spoken(intercept)}, above the dashed line y equals ${spoken(k)}`}
        />
      );
    },
    caption: ({ a = 2, b = 2, k = 1, negated = 0, intercept = 3 }) => {
      const coefficient = negated === 1 ? -a : a;
      return `The vertical axis is where $x = 0$, and $${b}^{0}$ is $1$ whatever the base, so the power collapses and the coefficient $${numStr(coefficient)}$ is all that survives of that term. Adding the constant gives the crossing height $${numStr(intercept)}$, which is $${Math.abs(coefficient)}$ ${coefficient < 0 ? "below" : "above"} the asymptote at $y = ${numStr(k)}$.`;
    },
  },

  "d8.el2.anchor-point.l2": {
    Svg: ({
      kind = 0,
      b = 2,
      k = 3,
      h = 2,
      rightward = 1,
      stretch = 3,
      mirrorShift = 3,
      ax = 0,
      ay = 4,
    }) => {
      const dx = rightward === 1 ? h : -h;
      const moved = anchorCurve(kind, b, k, dx, mirrorShift, stretch);
      return (
        <ExpWorkedPlane
          curves={[
            { fn: (x) => b ** x, color: SOFT, dashed: true },
            { fn: moved, color: CIVIC },
          ]}
          points={[
            { x: 0, y: 1, color: SOFT, label: pointTex(0, 1) },
            { x: ax, y: ay, color: BRICK, label: pointTex(ax, ay) },
          ]}
          include={[0, 1, ay, moved(0)]}
          xMin={Math.min(-1.6, ax - 1.6)}
          xMax={Math.max(1.6, ax + 1.6)}
          equation={`${pointTex(0, 1)} \\;\\longmapsto\\; ${pointTex(ax, ay)}`}
          title="One point on the curve carried through a transformation"
          ariaLabel={`The point 0 comma 1 on the dashed original curve, and its image at ${spoken(ax)} comma ${spoken(ay)} on the transformed curve`}
        />
      );
    },
    caption: ({
      kind = 0,
      b = 2,
      k = 3,
      h = 2,
      rightward = 1,
      stretch = 3,
      mirrorShift = 3,
      ax = 0,
      ay = 4,
    }) =>
      `$(0, 1)$ sits on every $y = b^{x}$, because $${b}^{0} = 1$ whatever the base, which is what makes it the point worth carrying through a move. ${anchorMoveWords(kind, k, h, rightward, mirrorShift, stretch).replace(/^([a-z])/, (m) => m.toUpperCase())} sends it to $${pointTex(ax, ay)}$: the dashed curve is where it started and the solid one is where it landed.`,
  },

  "d8.el2.transform-rhs.l3": {
    Svg: ({ a = 2, b = 2, p = 1, d = 2 }) => (
      <ExpressionReductionWorked
        rows={composeShiftRows(a, b, p, d)}
        title="Two horizontal shifts collected into one exponent"
        ariaLabel={`Replacing x by x minus ${spoken(d)} in an exponent that already reads x minus ${spoken(p)}, and collecting the two constants into ${spoken(-(p + d))}`}
      />
    ),
    caption: ({ a = 2, b = 2, p = 1, d = 2 }) =>
      `A horizontal shift replaces the input, so moving $${Math.abs(d)}$ to the ${d > 0 ? "right" : "left"} means writing $x ${op(-d)} ${Math.abs(d)}$ wherever $x$ stood. The exponent already carried a shift of its own, so the two constants collect into one and the finished exponent is $${shiftedExponent(p + d)}$. The coefficient $${a}$ and the base $${b}$ are untouched throughout, because a sideways move never reaches them.`,
  },

  "d8.el2.which-transform.l3": {
    Svg: ({ kind = 0, a = 2, b = 2, c = 3 }) => (
      <ExpressionReductionWorked
        rows={whichTransformRows(kind, a, b, c)}
        title="Two rules compared piece by piece"
        ariaLabel={`Comparing ${spoken(a)} times ${spoken(b)} to the x with its transformed version to find the single piece that changed`}
      />
    ),
    caption: ({ kind = 0, c = 3 }) => {
      if (kind < 2) {
        return `Only the constant standing at the very END differs, and a constant there is added to every output alike, so the whole graph ${kind === 0 ? "rises" : "drops"} by $${c}$ and nothing about its shape changes.`;
      }
      if (kind < 4) {
        return `The constant lives INSIDE the exponent, so it changes the input rather than the output and carries the graph sideways. The direction is the opposite of the sign written there, which is why $${c}$ ${kind === 2 ? "added moves it toward the negative side" : "subtracted moves it toward the positive side"}.`;
      }
      if (kind === 4) {
        return `A minus sign in FRONT of the whole expression turns every output into its opposite, so each point keeps its input and swaps its height. That mirrors the graph over the horizontal axis, and the asymptote does not move.`;
      }
      return `The minus sign is attached to the exponent's variable, so the value at $x$ is the old value at $-x$ and the two sides of the graph trade places. That mirrors it over the vertical axis, which is what turns growth into decay.`;
    },
  },
};
