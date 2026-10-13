/**
 * LF.4 worked-solution figures: solve a 2x2 linear system three ways.
 *
 * Four of the five shapes are runs of a procedure, so they read as `ExpressionReductionWorked`
 * row stacks: the system, then one row per move, then the pair. The classify shape is the
 * graphing question, so it gets a real two-line coordinate figure instead, with the crossing
 * marked when there is one and the coincident line drawn dashed over its twin when there is
 * not, because "no solution" and "infinitely many" are pictures before they are sentences.
 *
 * Every figure is driven only by its template's `template_params` and decodes the `elim`,
 * `kind` and `iso` flags exactly the way `packages/item-bank/src/d7/nodes/LF.4/index.ts`
 * encodes them. Rows that a draw did not need are dropped rather than printed: a coefficient
 * of `1` on the surviving variable needs no divide row, and a back-substitution whose
 * expression is already the value is written once instead of twice.
 */

import type { JSX } from "react";

import {
  CIVIC,
  interiorTicks,
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
  type ReductionRow,
  spoken,
  type WorkedSolutionVisual,
} from "../workedKit";

/* -------------------------------------------------------------------------- */
/* LaTeX helpers (mirrors of the item-bank module's, kept local to this file)  */
/* -------------------------------------------------------------------------- */

/** A variable term with its coefficient folded in: `3x`, `-x`, `x`. */
function vTerm(coeff: number, variable: string): string {
  if (coeff === 1) {
    return variable;
  }
  if (coeff === -1) {
    return `-${variable}`;
  }
  return `${coeff}${variable}`;
}

/** A following signed variable term: `+ 3y`, `- y`. */
function tailTerm(coeff: number, variable: string): string {
  const magnitude = Math.abs(coeff);
  const body = magnitude === 1 ? variable : `${magnitude}${variable}`;
  return `${coeff < 0 ? "-" : "+"} ${body}`;
}

/** A standard-form equation `ax + by = c`. */
function stdTex(a: number, b: number, c: number): string {
  return `${vTerm(a, "x")} ${tailTerm(b, "y")} = ${c}`;
}

/** A leading coefficient on a parenthesized expression: `3(...)`, `(...)`, `-(...)`. */
function scaled(coeff: number, inner: string): string {
  if (coeff === 1) {
    return `(${inner})`;
  }
  if (coeff === -1) {
    return `-(${inner})`;
  }
  return `${coeff}(${inner})`;
}

/** A following signed coefficient on a parenthesized expression: `+ 3(...)`, `- (...)`. */
function tailScaled(coeff: number, inner: string): string {
  const magnitude = Math.abs(coeff);
  const body = magnitude === 1 ? `(${inner})` : `${magnitude}(${inner})`;
  return `${coeff < 0 ? "-" : "+"} ${body}`;
}

/** `constant + coeff * variable`, tidy at the edges: `7 - 2y`, `-2y`, `7`. */
function linRhs(constant: number, coeff: number, variable: string): string {
  if (coeff === 0) {
    return `${constant}`;
  }
  const magnitude = Math.abs(coeff);
  const body = magnitude === 1 ? variable : `${magnitude}${variable}`;
  if (constant === 0) {
    return coeff < 0 ? `-${body}` : body;
  }
  return `${constant} ${coeff < 0 ? "-" : "+"} ${body}`;
}

/** The same right-hand side with the variable replaced by a value: `7 - 2(3)`. */
function linAt(constant: number, coeff: number, value: number): string {
  if (coeff === 0) {
    return `${constant}`;
  }
  const magnitude = Math.abs(coeff);
  const body = magnitude === 1 ? `(${value})` : `${magnitude}(${value})`;
  if (constant === 0) {
    return coeff < 0 ? `-${body}` : body;
  }
  return `${constant} ${coeff < 0 ? "-" : "+"} ${body}`;
}

/** A slope-intercept right-hand side `mx + b`, with a zero intercept dropped. */
function slopeRhs(m: number, b: number): string {
  const head = vTerm(m, "x");
  return b === 0 ? head : `${head} ${b < 0 ? "-" : "+"} ${Math.abs(b)}`;
}

/** The same right-hand side with `x` replaced by a value: `2(-3) + 5`. */
function slopeAt(m: number, b: number, x: number): string {
  const magnitude = Math.abs(m);
  const body = magnitude === 1 ? `(${x})` : `${magnitude}(${x})`;
  const head = m < 0 ? `-${body}` : body;
  return b === 0 ? head : `${head} ${b < 0 ? "-" : "+"} ${Math.abs(b)}`;
}

/**
 * `v = expr = value`, collapsed to `v = value` when the expression IS already the value.
 * A back-substitution into `y = x` prints `y = (5) = 5` otherwise, which claims a step the
 * draw never needed.
 */
function resolved(variable: string, expr: string, value: number): string {
  return expr === `${value}` || expr === `(${value})`
    ? `${variable} = ${value}`
    : `${variable} = ${expr} = ${value}`;
}

/** The pair as the closing row of a stack. */
function pairRow(x0: number, y0: number): ReductionRow {
  return { tokens: [{ text: `(${x0},\\, ${y0})`, color: CIVIC }] };
}

/* -------------------------------------------------------------------------- */
/* Row builders                                                                */
/* -------------------------------------------------------------------------- */

/** L1: one equation already reads `y = mx + b`, so substitute and back-substitute. */
function substitutionRows(
  x0: number,
  y0: number,
  m: number,
  b: number,
  a: number,
  c: number,
  d: number,
): ReductionRow[] {
  const slope = slopeRhs(m, b);
  const coeff = a + c * m;
  const total = d - c * b;
  const rows: ReductionRow[] = [
    { tokens: [{ text: `y = ${slope}`, color: CIVIC }] },
    { tokens: [{ text: stdTex(a, c, d), color: CIVIC }] },
    { tokens: [{ text: `${vTerm(a, "x")} ${tailScaled(c, slope)} = ${d}` }] },
    { tokens: [{ text: `${vTerm(coeff, "x")} = ${total}` }] },
  ];
  if (coeff !== 1) {
    rows.push({ tokens: [{ text: `x = ${x0}`, color: SIGNAL }] });
  }
  rows.push({
    tokens: [{ text: resolved("y", slopeAt(m, b, x0), y0), color: SIGNAL }],
  });
  rows.push(pairRow(x0, y0));
  return rows;
}

/** L2a: one variable's coefficients are already opposites, so adding removes it. */
function oppositeRows(
  elim: number,
  x0: number,
  y0: number,
  a1: number,
  b1: number,
  a2: number,
  b2: number,
  c1: number,
  c2: number,
): ReductionRow[] {
  const survivor = elim === 0 ? "x" : "y";
  const coeff = elim === 0 ? a1 + a2 : b1 + b2;
  const total = c1 + c2;
  const value = elim === 0 ? x0 : y0;
  const rows: ReductionRow[] = [
    { tokens: [{ text: stdTex(a1, b1, c1), color: CIVIC }] },
    { tokens: [{ text: stdTex(a2, b2, c2), color: CIVIC }] },
    { tokens: [{ text: `${vTerm(coeff, survivor)} = ${total}`, color: SIGNAL }] },
  ];
  if (coeff !== 1) {
    rows.push({ tokens: [{ text: `${survivor} = ${value}`, color: SIGNAL }] });
  }
  rows.push({
    tokens: [
      {
        text:
          elim === 0
            ? `${scaled(a1, `${x0}`)} ${tailTerm(b1, "y")} = ${c1}`
            : `${vTerm(a1, "x")} ${tailScaled(b1, `${y0}`)} = ${c1}`,
      },
    ],
  });
  rows.push(pairRow(x0, y0));
  return rows;
}

/**
 * L3a: scale BOTH equations until one variable's terms are opposites, then add.
 *
 * `keepX` says which variable survives the addition. Practice always scales the `x` terms into
 * opposites, so it passes nothing and keeps `y`; LF.4's CHECK cancels the `y` terms instead,
 * which its hint names in advance ("the $y$ terms are $3y$ and $-2y$"), so a figure that
 * cancelled `x` there would be answering the question by a route the learner was told to take
 * a different way. Both are the same procedure with the multipliers read off the other column.
 */
function scaleRows(
  x0: number,
  y0: number,
  a1: number,
  b1: number,
  a2: number,
  b2: number,
  c1: number,
  c2: number,
  m1: number,
  m2: number,
  keepX = false,
): ReductionRow[] {
  const survivor = keepX ? "x" : "y";
  const coeff = keepX ? m1 * a1 + m2 * a2 : m1 * b1 + m2 * b2;
  const total = m1 * c1 + m2 * c2;
  const value = keepX ? x0 : y0;
  const rows: ReductionRow[] = [
    { tokens: [{ text: stdTex(a1, b1, c1), color: CIVIC }] },
    { tokens: [{ text: stdTex(a2, b2, c2), color: CIVIC }] },
    { tokens: [{ text: stdTex(m1 * a1, m1 * b1, m1 * c1) }] },
    { tokens: [{ text: stdTex(m2 * a2, m2 * b2, m2 * c2) }] },
    { tokens: [{ text: `${vTerm(coeff, survivor)} = ${total}`, color: SIGNAL }] },
  ];
  if (coeff !== 1) {
    rows.push({ tokens: [{ text: `${survivor} = ${value}`, color: SIGNAL }] });
  }
  rows.push({
    tokens: [
      {
        text: keepX
          ? `${scaled(a1, `${x0}`)} ${tailTerm(b1, "y")} = ${c1}`
          : `${vTerm(a1, "x")} ${tailScaled(b1, `${y0}`)} = ${c1}`,
      },
    ],
  });
  rows.push(pairRow(x0, y0));
  return rows;
}

/** L3b: isolate the coefficient-1 variable, substitute, then come back for it. */
function isolateRows(
  iso: number,
  p: number,
  a2: number,
  b2: number,
  c1: number,
  c2: number,
  x0: number,
  y0: number,
): ReductionRow[] {
  const isoVar = iso === 0 ? "x" : "y";
  const otherVar = iso === 0 ? "y" : "x";
  const isoValue = iso === 0 ? x0 : y0;
  const otherValue = iso === 0 ? y0 : x0;
  const isolated = linRhs(c1, -p, otherVar);
  const coeff = iso === 0 ? b2 - a2 * p : a2 - b2 * p;
  const total = c2 - (iso === 0 ? a2 : b2) * c1;
  const rows: ReductionRow[] = [
    {
      tokens: [{ text: iso === 0 ? stdTex(1, p, c1) : stdTex(p, 1, c1), color: CIVIC }],
    },
    { tokens: [{ text: stdTex(a2, b2, c2), color: CIVIC }] },
    { tokens: [{ text: `${isoVar} = ${isolated}` }] },
    {
      tokens: [
        {
          text:
            iso === 0
              ? `${scaled(a2, isolated)} ${tailTerm(b2, "y")} = ${c2}`
              : `${vTerm(a2, "x")} ${tailScaled(b2, isolated)} = ${c2}`,
        },
      ],
    },
    { tokens: [{ text: `${vTerm(coeff, otherVar)} = ${total}` }] },
  ];
  if (coeff !== 1) {
    rows.push({ tokens: [{ text: `${otherVar} = ${otherValue}` }] });
  }
  rows.push({
    tokens: [
      {
        text: resolved(isoVar, linAt(c1, -p, otherValue), isoValue),
        color: SIGNAL,
      },
    ],
  });
  return rows;
}

/* -------------------------------------------------------------------------- */
/* The classify figure: two lines on a plane                                   */
/* -------------------------------------------------------------------------- */

const GX_MIN = -6;
const GX_MAX = 6;
const GY_MIN = -6;
const GY_MAX = 6;
const GLEFT = 40;
const GRIGHT = 424;
const GTOP = 12;
const GBOTTOM = 196;
const GRID = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
/** `±6` is the plot's border, and a number centered on the border is half outside it. */
const GTICKS = interiorTicks([-6, -4, -2, 2, 4, 6], GX_MIN, GX_MAX);
const GLABEL_SIZE = 14;
const GTICK_SIZE = 10;

function gx(x: number): number {
  return GLEFT + ((x - GX_MIN) / (GX_MAX - GX_MIN)) * (GRIGHT - GLEFT);
}

function gy(y: number): number {
  return GBOTTOM - ((y - GY_MIN) / (GY_MAX - GY_MIN)) * (GBOTTOM - GTOP);
}

/** Labels belong inside the plot, off its border by enough not to read as touching it. */
const GFRAME = plotLabelFrame(
  { left: GLEFT, right: GRIGHT, top: GTOP, bottom: GBOTTOM },
  6,
);

/** The axis numbers, as obstacles: they are drawn inside the plot, against the axes. */
const GTICK_BOXES: readonly LabelBox[] = [
  ...GTICKS.map((tick) => ({
    x: gx(0) - 7 - labelHalfW(String(tick), GTICK_SIZE),
    y: gy(tick),
    halfW: labelHalfW(String(tick), GTICK_SIZE),
    halfH: labelHalfH(GTICK_SIZE),
  })),
  ...GTICKS.map((tick) => ({
    x: gx(tick),
    y: gy(0) + 10,
    halfW: labelHalfW(String(tick), GTICK_SIZE),
    halfH: labelHalfH(GTICK_SIZE),
  })),
];

/** The visible segment of `ax + by = c`, as its two crossings of the window border. */
function clip(
  a: number,
  b: number,
  c: number,
): { x1: number; y1: number; x2: number; y2: number } | null {
  const points: { x: number; y: number }[] = [];
  const push = (x: number, y: number) => {
    if (x < GX_MIN - 1e-6 || x > GX_MAX + 1e-6 || y < GY_MIN - 1e-6 || y > GY_MAX + 1e-6) {
      return;
    }
    if (points.some((p) => Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6)) {
      return;
    }
    points.push({ x, y });
  };
  if (b !== 0) {
    push(GX_MIN, (c - a * GX_MIN) / b);
    push(GX_MAX, (c - a * GX_MAX) / b);
  }
  if (a !== 0) {
    push((c - b * GY_MIN) / a, GY_MIN);
    push((c - b * GY_MAX) / a, GY_MAX);
  }
  const first = points[0];
  const second = points[1];
  return first && second ? { x1: first.x, y1: first.y, x2: second.x, y2: second.y } : null;
}

function SystemGraph({
  kind,
  a1,
  b1,
  c1,
  a2,
  b2,
  c2,
  x0,
  y0,
}: {
  kind: number;
  a1: number;
  b1: number;
  c1: number;
  a2: number;
  b2: number;
  c2: number;
  x0: number;
  y0: number;
}): JSX.Element {
  const first = clip(a1, b1, c1);
  const second = clip(a2, b2, c2);
  const aria =
    kind === 0
      ? `Two lines crossing at ${spoken(x0)}, ${spoken(y0)}, so the system has one solution`
      : kind === 1
        ? "Two parallel lines that never cross, so the system has no solution"
        : "Two equations drawing the same line, so every point on it solves the system";
  const meetTex = `(${x0},\\, ${y0})`;
  const meetLabel = labelSpot({
    x: gx(x0),
    y: gy(y0),
    frame: GFRAME,
    dx: 1,
    dy: -1,
    halfW: labelHalfW(meetTex, GLABEL_SIZE),
    halfH: labelHalfH(GLABEL_SIZE),
    gap: 10,
    avoid: GTICK_BOXES,
  });

  return (
    <svg viewBox="0 0 440 246" role="img" aria-label={aria}>
      <title>How many points the two lines share</title>

      <rect
        data-plot-frame=""
        x={GLEFT}
        y={GTOP}
        width={GRIGHT - GLEFT}
        height={GBOTTOM - GTOP}
        rx={6}
        fill="var(--paper)"
        stroke={LINE}
        strokeWidth={1}
      />
      {GRID.map((value) => (
        <line
          key={`v${value}`}
          x1={gx(value)}
          y1={GTOP}
          x2={gx(value)}
          y2={GBOTTOM}
          stroke={LINE}
          strokeWidth={0.75}
          opacity={0.5}
        />
      ))}
      {GRID.map((value) => (
        <line
          key={`h${value}`}
          x1={GLEFT}
          y1={gy(value)}
          x2={GRIGHT}
          y2={gy(value)}
          stroke={LINE}
          strokeWidth={0.75}
          opacity={0.5}
        />
      ))}
      <line x1={GLEFT} y1={gy(0)} x2={GRIGHT} y2={gy(0)} stroke={SOFT} strokeWidth={1.4} />
      <line x1={gx(0)} y1={GTOP} x2={gx(0)} y2={GBOTTOM} stroke={SOFT} strokeWidth={1.4} />

      {first && (
        <line
          x1={gx(first.x1)}
          y1={gy(first.y1)}
          x2={gx(first.x2)}
          y2={gy(first.y2)}
          stroke={CIVIC}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      )}
      {second && (
        <line
          x1={gx(second.x1)}
          y1={gy(second.y1)}
          x2={gx(second.x2)}
          y2={gy(second.y2)}
          stroke={SIGNAL}
          strokeWidth={2.2}
          strokeDasharray={kind === 2 ? "7 6" : undefined}
          strokeLinecap="round"
        />
      )}
      {kind === 0 && <circle cx={gx(x0)} cy={gy(y0)} r={5.5} fill={LABEL} />}
      {kind === 0 && (
        <PlotLabel box={meetLabel} latex={meetTex} fontSize={GLABEL_SIZE} color={LABEL} />
      )}

      {GTICKS.map((tick) => (
        <text
          key={`tx${tick}`}
          x={gx(tick)}
          y={gy(0) + 14}
          textAnchor="middle"
          fontSize={10}
          fill={SOFT}
          stroke="var(--paper)"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {tick}
        </text>
      ))}
      {GTICKS.map((tick) => (
        <text
          key={`ty${tick}`}
          x={gx(0) - 7}
          y={gy(tick) + 3.5}
          textAnchor="end"
          fontSize={10}
          fill={SOFT}
          stroke="var(--paper)"
          strokeWidth={3}
          paintOrder="stroke"
        >
          {tick}
        </text>
      ))}

      <SvgMath
        latex={stdTex(a1, b1, c1)}
        x={126}
        y={224}
        fontSize={16}
        color={CIVIC}
        w={190}
      />
      <SvgMath
        latex={stdTex(a2, b2, c2)}
        x={316}
        y={224}
        fontSize={16}
        color={SIGNAL}
        w={190}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* The registry slice                                                          */
/* -------------------------------------------------------------------------- */

export const LF4_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d7.lf4.substitution.l1": {
    Svg: ({ x0 = 0, y0 = 0, m = 1, b = 0, a = 1, c = 1, d = 0 }) => (
      <ExpressionReductionWorked
        rows={substitutionRows(x0, y0, m, b, a, c, d)}
        title="Substitute an already-isolated variable"
        ariaLabel={`Replacing y by its expression leaves one equation in x, and the solution is ${spoken(x0)}, ${spoken(y0)}`}
      />
    ),
    caption: ({ x0 = 0, y0 = 0 }) =>
      `The first equation already gives $y$, so substituting it leaves only $x$ in the second. Solving that and back-substituting gives $(${x0},\\, ${y0})$.`,
  },

  "d7.lf4.elimination.l2": {
    Svg: ({ elim = 0, x0 = 0, y0 = 0, a1 = 1, b1 = 1, a2 = 1, b2 = 1, c1 = 0, c2 = 0 }) => (
      <ExpressionReductionWorked
        rows={oppositeRows(elim, x0, y0, a1, b1, a2, b2, c1, c2)}
        title="Add two equations whose coefficients are already opposites"
        ariaLabel={`Adding removes ${elim === 0 ? "y" : "x"}, and the solution is ${spoken(x0)}, ${spoken(y0)}`}
      />
    ),
    caption: ({
      elim = 0,
      x0 = 0,
      y0 = 0,
      a1 = 1,
      b1 = 1,
      a2 = 1,
      b2 = 1,
      c1 = 0,
      c2 = 0,
    }) => {
      const survivor = elim === 0 ? "x" : "y";
      const coeff = elim === 0 ? a1 + a2 : b1 + b2;
      return `The $${elim === 0 ? "y" : "x"}$ coefficients are already opposites, so adding the equations removes that variable and leaves $${vTerm(coeff, survivor)} = ${c1 + c2}$. Back-substituting gives $(${x0},\\, ${y0})$.`;
    },
  },

  "d7.lf4.classify.l2": {
    Svg: ({ kind = 0, a1 = 1, b1 = 1, c1 = 0, a2 = 1, b2 = 1, c2 = 0, x0 = 0, y0 = 0 }) => (
      <SystemGraph
        kind={kind}
        a1={a1}
        b1={b1}
        c1={c1}
        a2={a2}
        b2={b2}
        c2={c2}
        x0={x0}
        y0={y0}
      />
    ),
    caption: ({ kind = 0, k = 2, c1 = 0, c2 = 0, x0 = 0, y0 = 0 }) => {
      if (kind === 0) {
        return `The two lines have different slopes, so they cross exactly once, at $(${x0},\\, ${y0})$: one solution.`;
      }
      if (kind === 1) {
        return `Multiplying the first equation by $${k}$ matches the second on the left but gives $${k * c1}$ on the right, not $${c2}$, so the lines are parallel and never meet: no solution.`;
      }
      return `The second equation is exactly $${k}$ times the first, both sides included, so the two draw the same line and every point on it works: infinitely many solutions.`;
    },
  },

  "d7.lf4.elimination.l3": {
    Svg: ({
      x0 = 0,
      y0 = 0,
      a1 = 1,
      b1 = 1,
      a2 = 1,
      b2 = 1,
      c1 = 0,
      c2 = 0,
      m1 = 1,
      m2 = 1,
      keepX = 0,
    }) => (
      <ExpressionReductionWorked
        rows={scaleRows(x0, y0, a1, b1, a2, b2, c1, c2, m1, m2, keepX === 1)}
        title="Scale both equations until a variable cancels"
        ariaLabel={`Scaling by ${spoken(m1)} and ${spoken(m2)} makes the ${keepX === 1 ? "y" : "x"} terms opposites, and the solution is ${spoken(x0)}, ${spoken(y0)}`}
      />
    ),
    caption: ({
      x0 = 0,
      y0 = 0,
      a1 = 1,
      b1 = 1,
      a2 = 1,
      b2 = 1,
      c1 = 0,
      c2 = 0,
      m1 = 1,
      m2 = 1,
      keepX = 0,
    }) => {
      const survivor = keepX === 1 ? "x" : "y";
      const coeff = keepX === 1 ? m1 * a1 + m2 * a2 : m1 * b1 + m2 * b2;
      return `Multiply the first equation by $${m1}$ and the second by $${m2}$ so the $${keepX === 1 ? "y" : "x"}$ terms are opposites. Adding leaves $${vTerm(coeff, survivor)} = ${m1 * c1 + m2 * c2}$, and back-substituting gives $(${x0},\\, ${y0})$.`;
    },
  },

  "d7.lf4.isolate.l3": {
    Svg: ({ iso = 0, p = 1, a2 = 1, b2 = 1, c1 = 0, c2 = 0, x0 = 0, y0 = 0 }) => (
      <ExpressionReductionWorked
        rows={isolateRows(iso, p, a2, b2, c1, c2, x0, y0)}
        title="Isolate, substitute, then come back for the isolated variable"
        ariaLabel={`Isolating ${iso === 0 ? "x" : "y"} and substituting gives the pair ${spoken(x0)}, ${spoken(y0)}`}
      />
    ),
    caption: ({ iso = 0, p = 1, a2 = 1, b2 = 1, c1 = 0, c2 = 0, x0 = 0, y0 = 0 }) => {
      const isoVar = iso === 0 ? "x" : "y";
      const otherVar = iso === 0 ? "y" : "x";
      const isoValue = iso === 0 ? x0 : y0;
      const otherValue = iso === 0 ? y0 : x0;
      const coeff = iso === 0 ? b2 - a2 * p : a2 - b2 * p;
      const total = c2 - (iso === 0 ? a2 : b2) * c1;
      return coeff === 1
        ? `Isolating $${isoVar}$ in the first equation and substituting leaves $${otherVar} = ${total}$, and back-substituting gives $${isoVar} = ${isoValue}$.`
        : `Isolating $${isoVar}$ in the first equation and substituting leaves $${vTerm(coeff, otherVar)} = ${total}$, so $${otherVar} = ${otherValue}$ and $${isoVar} = ${isoValue}$.`;
    },
  },
};
