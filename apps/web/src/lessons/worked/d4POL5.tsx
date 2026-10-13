/**
 * Worked-solution figures for POL.5, the Industrial era's polynomial node: a parabola's vertex,
 * its intercepts and its extreme value.
 *
 * Four of the five are `ExpressionReductionWorked`, the shared column, and that is the right
 * archetype rather than a shortcut: each is a CHAIN, where the axis of symmetry is justified by
 * the coefficients and the height is justified by the axis, and a column is what shows a chain.
 * One of the five makes a claim about WHERE things sit rather than about what they equal, and it
 * gets a picture:
 *
 *  - {@link CrossingsFigure} marks the two crossings and the axis of symmetry on an axis,
 *    because the thing the factored shape teaches is that the vertex is HALFWAY BETWEEN two
 *    places, and a row of algebra saying `-1` is a number where a position was meant. It is
 *    drawn for the factored extreme-value shape, whose whole argument is the symmetry, and for
 *    the intercepts shape, where the roster is a set of places.
 *
 * Every figure recomputes what `generate()` computed from `template_params` rather than being
 * told the answer, and every parameter is coalesced, so a check reaching one of these entries
 * with a hand-written parameter set outside its template's own range still draws something true.
 * `content/lessons/d4/POL.5.json` does exactly that: its authored question is a vertex form with
 * an `a` of five, which the practice template never draws.
 */

import { CIVIC, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import {
  ExpressionReductionWorked,
  numStr,
  type ReductionRow,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";

/* -------------------------------------------------------------------------- */
/* Shared LaTeX helpers                                                        */
/* -------------------------------------------------------------------------- */

/** A negative value in parentheses, so a bare minus never reads as the operator before it. */
function factorTex(value: number): string {
  return value < 0 ? `\\left(${value}\\right)` : `${value}`;
}

/** `+ 7` / `- 7`: a constant written as the operation that adds it. */
function trailingConstant(value: number): string {
  return `${value < 0 ? "-" : "+"} ${Math.abs(value)}`;
}

/** `- 3` / `+ 3`: subtracting a value, written so a negative reads as an addition. */
function takeAway(value: number): string {
  return value < 0 ? `+ ${-value}` : `- ${value}`;
}

/** `(x - 3)` / `(x + 2)`: the bracket that vanishes at `zero`. */
function bracket(zero: number): string {
  return `\\left(x ${takeAway(zero)}\\right)`;
}

/** `2 \times ` / `\left(-1\right) \times ` / nothing: a leading factor about to multiply. */
function timesFront(value: number): string {
  return value === 1 ? "" : `${factorTex(value)} \\times `;
}

/** `ax^{2} + bx + c`, with a coefficient of one on the square left unwritten. */
function standardTex(a: number, b: number, c: number): string {
  const lead = a === 1 ? "x^{2}" : a === -1 ? "-x^{2}" : `${a}x^{2}`;
  const middle =
    b === 0 ? "" : ` ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "x" : `${Math.abs(b)}x`}`;
  const tail = c === 0 ? "" : ` ${trailingConstant(c)}`;
  return `${lead}${middle}${tail}`;
}

/** `minimum` / `maximum`: which extreme a parabola's turning point carries. */
function extremeWord(a: number): string {
  return a > 0 ? "minimum" : "maximum";
}

/* -------------------------------------------------------------------------- */
/* The two crossings and the line halfway between them                         */
/* -------------------------------------------------------------------------- */

/**
 * Two crossings marked on a horizontal axis, with the axis of symmetry drawn between them.
 *
 * Only the crossings, the midpoint and a shallow arc are drawn, and the vertical scale is
 * deliberately not to any measure: this figure's claim is about POSITIONS along one axis, and
 * a curve drawn to scale would invite the height to be read off it, which is the reading the
 * arithmetic beside it exists to supply. The arc is there so the three marks read as belonging
 * to one parabola rather than as three unrelated points on a line.
 *
 * `opensUp` turns the arc over so the picture agrees with the sign of the leading coefficient,
 * because a downward parabola whose arc bulges upward is a figure contradicting its own caption.
 */
function CrossingsFigure({
  low,
  high,
  opensUp,
  ariaLabel,
  title,
}: {
  low: number;
  high: number;
  opensUp: boolean;
  ariaLabel: string;
  title: string;
}) {
  const midpoint = (low + high) / 2;
  // The window is the two crossings plus a margin of a quarter of their separation on each
  // side, so a wide pair and a narrow one are drawn at the same visual size.
  const span = Math.max(high - low, 1);
  const margin = span / 4;
  const left = low - margin;
  const right = high + margin;
  const mapX = (value: number) => 30 + ((value - left) / (right - left)) * 300;
  const axisY = 96;
  const apexY = opensUp ? 138 : 54;
  const path = `M ${mapX(low)} ${axisY} Q ${mapX(midpoint)} ${axisY + (apexY - axisY) * 2} ${mapX(high)} ${axisY}`;

  return (
    <svg
      viewBox="0 0 360 200"
      role="img"
      aria-label={ariaLabel}
      style={{ width: "100%", height: "auto" }}
    >
      <title>{title}</title>
      <line
        x1={20}
        y1={axisY}
        x2={340}
        y2={axisY}
        stroke={LINE}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path d={path} fill="none" stroke={SOFT} strokeWidth={2} strokeLinecap="round" />
      {/* The axis of symmetry, dashed because it is a construction line rather than the curve. */}
      <line
        x1={mapX(midpoint)}
        y1={30}
        x2={mapX(midpoint)}
        y2={152}
        stroke={SIGNAL}
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
      {[low, high].map((value) => (
        <circle key={value} cx={mapX(value)} cy={axisY} r={4.5} fill={LABEL} />
      ))}
      <circle cx={mapX(midpoint)} cy={apexY} r={4.5} fill={CIVIC} />
      <SvgMath
        x={mapX(low)}
        y={axisY + 34}
        latex={`x = ${numStr(low)}`}
        anchor="middle"
        color={LABEL}
      />
      <SvgMath
        x={mapX(high)}
        y={axisY + 34}
        latex={`x = ${numStr(high)}`}
        anchor="middle"
        color={LABEL}
      />
      <SvgMath
        x={mapX(midpoint)}
        y={opensUp ? 18 : 166}
        latex={`x = ${numStr(midpoint)}`}
        anchor="middle"
        color={SIGNAL}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Row builders for the four reduction columns                                 */
/* -------------------------------------------------------------------------- */

/** The axis of symmetry, from the two coefficients that decide it. */
function axisRows(a: number, b: number, h: number): ReductionRow[] {
  return [
    { tokens: [{ text: `${standardTex(a, b, 0)} \\;\\cdots`, color: LABEL }] },
    {
      tokens: [{ text: `x = -\\dfrac{${b}}{2 \\times ${factorTex(a)}}`, color: SIGNAL }],
    },
    { tokens: [{ text: `x = -\\dfrac{${b}}{${2 * a}}`, color: SIGNAL }] },
    { tokens: [{ text: `x = ${numStr(h)}`, color: CIVIC }] },
  ];
}

/** The axis, then the substitution that turns it into a height. */
function extremeRows(a: number, b: number, c: number, h: number): ReductionRow[] {
  const squared = a * h * h;
  const linear = b * h;
  return [
    { tokens: [{ text: `x = -\\dfrac{${b}}{${2 * a}} = ${numStr(h)}`, color: LABEL }] },
    {
      tokens: [
        {
          text: `f\\left(${numStr(h)}\\right) = ${a} \\times ${factorTex(h)}^{2} ${trailingConstant(b)} \\times ${factorTex(h)} ${trailingConstant(c)}`,
          color: SIGNAL,
        },
      ],
    },
    {
      tokens: [
        {
          text: `= ${squared} ${trailingConstant(linear)} ${trailingConstant(c)}`,
          color: SIGNAL,
        },
      ],
    },
    {
      tokens: [
        {
          text: `\\text{${extremeWord(a)}} = ${numStr(squared + linear + c)}`,
          color: CIVIC,
        },
      ],
    },
  ];
}

/** Vertex form evaluated at zero, from the inside out. */
function yInterceptRows(a: number, h: number, k: number): ReductionRow[] {
  const inside = -h;
  const scaled = a * inside * inside;
  return [
    {
      tokens: [
        {
          text: `f(0) = ${timesFront(a)}\\left(0 ${takeAway(h)}\\right)^{2} ${trailingConstant(k)}`,
          color: LABEL,
        },
      ],
    },
    {
      tokens: [
        {
          text: `= ${timesFront(a)}${factorTex(inside)}^{2} ${trailingConstant(k)}`,
          color: SIGNAL,
        },
      ],
    },
    { tokens: [{ text: `= ${scaled} ${trailingConstant(k)}`, color: SIGNAL }] },
    { tokens: [{ text: `y = ${numStr(scaled + k)}`, color: CIVIC }] },
  ];
}

/** The factoring that turns an expanded trinomial into two places on the axis. */
function interceptRows(low: number, high: number): ReductionRow[] {
  const b = -(low + high);
  const c = low * high;
  return [
    { tokens: [{ text: `${standardTex(1, b, c)} = 0`, color: LABEL }] },
    {
      tokens: [
        {
          text: `\\text{product } ${c},\\; \\text{sum } ${b}`,
          color: SIGNAL,
        },
      ],
    },
    { tokens: [{ text: `${bracket(low)}${bracket(high)} = 0`, color: SIGNAL }] },
    {
      tokens: [
        { text: `x = ${numStr(low)} \\text{ or } x = ${numStr(high)}`, color: CIVIC },
      ],
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Registry entries                                                            */
/* -------------------------------------------------------------------------- */

export const POL5_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d4.pol5.vertex-x-standard.l1": {
    Svg: ({ a = 2, b = -8, h = 2 }) => (
      <ExpressionReductionWorked
        rows={axisRows(a, b, h)}
        title="Two coefficients place the vertex"
        ariaLabel={`Taking ${spoken(b)} over twice ${spoken(a)} and changing the sign gives x equals ${spoken(h)}`}
      />
    ),
    caption: ({ a = 2, b = -8 }) =>
      `Two details carry the whole formula and each is its own mistake: the denominator is $2a$ rather than $a$, so it is $${2 * a}$ here, and the sign is flipped AFTER the division. The constant term never enters it, because sliding a parabola up or down moves the vertex without moving the line it sits on.`,
  },

  "d4.pol5.extreme-value-standard.l2": {
    Svg: ({ a = 2, b = -8, c = 5, h = 2 }) => (
      <ExpressionReductionWorked
        rows={extremeRows(a, b, c, h)}
        title="The axis first, then the height there"
        ariaLabel={`At x equals ${spoken(h)} the rule works out to ${spoken(a * h * h + b * h + c)}, which is the ${extremeWord(a)}`}
      />
    ),
    caption: ({ a = 2, h = 2 }) =>
      `The first row is a POSITION along the bottom of the page and the last is a HEIGHT, and stopping at the first is how a question about a ${extremeWord(a)} gets answered with $${h}$. The sign of the squared term's coefficient is what decides whether that height is called a minimum or a maximum, and it is the only thing that does.`,
  },

  "d4.pol5.y-intercept-vertex-form.l2": {
    Svg: ({ a = 2, h = 3, k = 5 }) => (
      <ExpressionReductionWorked
        rows={yInterceptRows(a, h, k)}
        title="Evaluated at an input of zero"
        ariaLabel={`Putting zero in gives ${spoken(a * h * h + k)}, which is where the graph crosses the vertical axis`}
      />
    ),
    caption: ({ a = 2, h = 3, k = 5 }) =>
      `A graph meets the $y$-axis where the INPUT is zero, so this is one substitution and not an equation to solve. The number outside the bracket is $${k}$, which is the height of the VERTEX at $x = ${h}$ and a different point on the curve; the crossing is $${a * h * h + k}$.`,
  },

  "d4.pol5.x-intercepts-expanded.l3": {
    Svg: ({ first = -2, second = 3 }) => {
      const low = Math.min(first, second);
      const high = Math.max(first, second);
      return (
        <ExpressionReductionWorked
          rows={interceptRows(low, high)}
          title="Factor it, then read one crossing off each bracket"
          ariaLabel={`The trinomial factors into two brackets, giving crossings at ${spoken(low)} and ${spoken(high)}`}
        />
      );
    },
    caption: ({ first = -2, second = 3 }) =>
      `A graph meets the $x$-axis where the OUTPUT is zero, and a product is zero exactly when one of its brackets is. So each bracket gives one crossing on its own, and the sign flips on the way out: the bracket $${bracket(Math.min(first, second))}$ is zero at $${Math.min(first, second)}$.`,
  },

  "d4.pol5.extreme-from-factored.l3": {
    Svg: ({ a = 1, low = -1, high = 3 }) => (
      <CrossingsFigure
        low={low}
        high={high}
        opensUp={a > 0}
        title="The vertex sits halfway between the two crossings"
        ariaLabel={`The graph crosses at ${spoken(low)} and ${spoken(high)}, and its turning point sits midway between them at ${spoken((low + high) / 2)}`}
      />
    ),
    caption: ({ a = 1, low = -1, high = 3 }) => {
      const midpoint = (low + high) / 2;
      const value = a * (midpoint - low) * (midpoint - high);
      return `Nothing is multiplied out. The two brackets already show where the curve crosses, symmetry puts the turning point exactly midway between them at $x = ${midpoint}$, and the rule evaluated there gives $${value}$, which is the ${extremeWord(a)}.`;
    },
  },
};
