/**
 * LF.3 worked-solution figures: build a linear model from a description or from data.
 *
 * Three of the five shapes are pure derivations and read best as a row stack, so they
 * reuse `ExpressionReductionWorked`. The two table shapes do not: what a learner needs to
 * see there is WHICH rows the rate came from and that no row sat at `x = 0`, which is a
 * picture of the table, not a stack of equations. Those two share one local figure that
 * draws the table beside the derivation, mirroring the slide-2 widget so the reveal looks
 * like the lesson the learner just did.
 *
 * Every figure is driven only by its template's `template_params`, decoding the direction
 * flag exactly as `generate()` does, and every default is supplied so a missing param can
 * never blank a diagram.
 */

import type { JSX } from "react";

import { BRICK, CIVIC, LABEL, LINE, SIGNAL, SOFT, SvgMath } from "../svgKit";
import {
  ExpressionReductionWorked,
  PLUS_INK,
  type ReductionRow,
  type WorkedSolutionVisual,
} from "../workedKit";

/* -------------------------------------------------------------------------- */
/* Shared formatters                                                           */
/* -------------------------------------------------------------------------- */

/** A signed value with negatives parenthesized, so `38 - (-6)(2)` stays readable. */
function sp(value: number): string {
  return value < 0 ? `(${value})` : `${value}`;
}

/** A coefficient on `x` as LaTeX, e.g. `4x` or `-6x`. */
function rateTermTex(m: number): string {
  return m === 1 ? "x" : m === -1 ? "-x" : `${m}x`;
}

/** A signed value read aloud, e.g. `negative 6`, for the aria-labels. */
function spokenValue(value: number): string {
  return value < 0 ? `negative ${-value}` : `${value}`;
}

/* -------------------------------------------------------------------------- */
/* The table figure the two data shapes share                                  */
/* -------------------------------------------------------------------------- */

interface TableRow {
  x: number;
  y: number;
  /** A row the model PREDICTED rather than one the table supplied. */
  predicted?: boolean;
}

const TABLE_X = 28;
const TABLE_Y = 16;
const TABLE_RIGHT = 218;
const TABLE_BOTTOM = 152;
const DIVIDER_X = 122;
const HEADER_UNDERLINE_Y = 52;
const COL_X_CENTER = 74;
const COL_Y_CENTER = 170;
const HEADER_Y = 34;
const ROW_YS = [76, 104, 132] as const;
const RIGHT_CX = 332;
const RIGHT_W = 208;

/**
 * A three-row table beside the derivation it feeds: the rate from the first two rows, the
 * starting value walked back to `x = 0`, and the finished model. When the third row is a
 * PREDICTION rather than data, it is tinted and the substitution that produced it is
 * spelled out underneath.
 */
function LinearTableWorked({
  rows,
  m,
  b,
  title,
  ariaLabel,
}: {
  rows: readonly TableRow[];
  m: number;
  b: number;
  title: string;
  ariaLabel: string;
}): JSX.Element {
  const first = rows[0] ?? { x: 0, y: b };
  const second = rows[1] ?? { x: 1, y: m + b };
  const predicted = rows.find((row) => row.predicted);
  const height = predicted ? 206 : 178;

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>

      <rect
        x={TABLE_X}
        y={TABLE_Y}
        width={TABLE_RIGHT - TABLE_X}
        height={TABLE_BOTTOM - TABLE_Y}
        rx={8}
        fill="none"
        stroke={LINE}
        strokeWidth={1.5}
      />
      <line
        x1={TABLE_X}
        y1={HEADER_UNDERLINE_Y}
        x2={TABLE_RIGHT}
        y2={HEADER_UNDERLINE_Y}
        stroke={LINE}
        strokeWidth={1.5}
      />
      <line
        x1={DIVIDER_X}
        y1={TABLE_Y}
        x2={DIVIDER_X}
        y2={TABLE_BOTTOM}
        stroke={LINE}
        strokeWidth={1}
      />
      <SvgMath latex="x" x={COL_X_CENTER} y={HEADER_Y} fontSize={15} color={SOFT} w={80} />
      <SvgMath latex="y" x={COL_Y_CENTER} y={HEADER_Y} fontSize={15} color={SOFT} w={80} />

      {rows.slice(0, 3).map((row, index) => {
        const rowY = ROW_YS[index] ?? 0;
        const tint = row.predicted ? CIVIC : LABEL;
        return (
          <g key={`${row.x}:${row.y}`}>
            <SvgMath
              latex={`${row.x}`}
              x={COL_X_CENTER}
              y={rowY}
              fontSize={17}
              color={tint}
              w={80}
            />
            <SvgMath
              latex={`${row.y}`}
              x={COL_Y_CENTER}
              y={rowY}
              fontSize={17}
              color={tint}
              w={80}
            />
          </g>
        );
      })}

      <SvgMath
        latex={`m = \\dfrac{${second.y} - ${first.y}}{${second.x} - ${first.x}} = ${m}`}
        x={RIGHT_CX}
        y={44}
        fontSize={15}
        color={SIGNAL}
        w={RIGHT_W}
      />
      <SvgMath
        latex={`b = ${first.y} - ${sp(m)}(${first.x}) = ${b}`}
        x={RIGHT_CX}
        y={94}
        fontSize={15}
        color={BRICK}
        w={RIGHT_W}
      />
      <SvgMath
        latex={`y = ${rateTermTex(m)} + ${b}`}
        x={RIGHT_CX}
        y={136}
        fontSize={18}
        color={CIVIC}
        w={RIGHT_W}
      />

      {predicted && (
        <>
          <SvgMath
            latex={`y = ${sp(m)}(${predicted.x}) + ${b} = ${predicted.y}`}
            x={220}
            y={176}
            fontSize={16}
            color={CIVIC}
            w={430}
          />
          <text x={220} y={198} textAnchor="middle" fontSize={11} fill={SOFT}>
            the tinted row is predicted by the model, not measured
          </text>
        </>
      )}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Row builders for the three derivation shapes                                */
/* -------------------------------------------------------------------------- */

/** L1: name the two numbers the sentence gave, then slot them into `mx + b`. */
function describeModelRows(m: number, b: number): ReductionRow[] {
  return [
    {
      tokens: [{ text: "\\text{rate}" }, { text: "=" }, { text: `${m}`, color: SIGNAL }],
    },
    {
      tokens: [{ text: "\\text{start}" }, { text: "=" }, { text: `${b}`, color: BRICK }],
    },
    {
      tokens: [
        { text: "y" },
        { text: "=" },
        { text: rateTermTex(m), color: SIGNAL },
        PLUS_INK,
        { text: `${b}`, color: BRICK },
      ],
    },
  ];
}

/** L2b: build the model, substitute the requested input, evaluate. */
function predictRows(m: number, b: number, xq: number, total: number): ReductionRow[] {
  return [
    {
      tokens: [
        { text: "y" },
        { text: "=" },
        { text: rateTermTex(m), color: SIGNAL },
        PLUS_INK,
        { text: `${b}`, color: BRICK },
      ],
    },
    {
      tokens: [
        { text: "y" },
        { text: "=" },
        { text: `${m} \\times ${xq}`, color: SIGNAL },
        PLUS_INK,
        { text: `${b}`, color: BRICK },
      ],
    },
    {
      tokens: [
        { text: "y" },
        { text: "=" },
        { text: `${m * xq}`, color: SIGNAL },
        PLUS_INK,
        { text: `${b}`, color: BRICK },
      ],
    },
    { tokens: [{ text: "y" }, { text: "=" }, { text: `${total}`, color: CIVIC }] },
  ];
}

/** L3b: the given point is not the intercept, so solve the model for the intercept. */
function pointRateRows(m: number, xp: number, b: number): ReductionRow[] {
  const yp = m * xp + b;
  return [
    {
      tokens: [
        { text: "y" },
        { text: "=" },
        { text: rateTermTex(m), color: SIGNAL },
        PLUS_INK,
        { text: "b" },
      ],
    },
    {
      tokens: [
        { text: `${yp}` },
        { text: "=" },
        { text: `${sp(m)} \\times ${xp}`, color: SIGNAL },
        PLUS_INK,
        { text: "b" },
      ],
    },
    {
      tokens: [
        { text: `${yp}` },
        { text: "=" },
        { text: `${m * xp}`, color: SIGNAL },
        PLUS_INK,
        { text: "b" },
      ],
    },
    {
      tokens: [
        { text: "b" },
        { text: "=" },
        { text: `${yp} - ${sp(m * xp)}` },
        { text: "=" },
        { text: `${b}`, color: BRICK },
      ],
    },
    {
      tokens: [
        { text: "y" },
        { text: "=" },
        { text: rateTermTex(m), color: SIGNAL },
        PLUS_INK,
        { text: `${b}`, color: BRICK },
      ],
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* The registry slice                                                          */
/* -------------------------------------------------------------------------- */

export const LF3_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "d7.lf3.describe-model.l1": {
    Svg: ({ m = 1, b = 0 }) => (
      <ExpressionReductionWorked
        rows={describeModelRows(m, b)}
        title="Read the rate and the starting value out of a description"
        ariaLabel={`The rate is ${spokenValue(m)} and the starting value is ${spokenValue(b)}, so y equals ${spokenValue(m)}x plus ${spokenValue(b)}`}
      />
    ),
    caption: ({ m = 1, b = 0 }) =>
      `The sentence states both numbers: the rate $${m}$ multiplies the input and the starting value $${b}$ is added on, so the right-hand side is $${m}x + ${b}$.`,
  },

  "d7.lf3.table-model.l2": {
    Svg: ({ m = 1, b = 0, x1 = 1, step = 1 }) => {
      const xs = [x1, x1 + step, x1 + 2 * step];
      return (
        <LinearTableWorked
          rows={xs.map((x) => ({ x, y: m * x + b }))}
          m={m}
          b={b}
          title="Find the rate between two rows, then walk back to the starting value"
          ariaLabel={`The rate between the first two rows is ${spokenValue(m)}, and walking back to x equals 0 gives a starting value of ${spokenValue(b)}, so y equals ${spokenValue(m)}x plus ${spokenValue(b)}`}
        />
      );
    },
    caption: ({ m = 1, b = 0 }) =>
      `Two rows give the rate $${m}$, and walking one row back to $x = 0$ gives the starting value $${b}$, so the right-hand side is $${m}x + ${b}$.`,
  },

  "d7.lf3.predict.l2": {
    Svg: ({ m = 1, b = 0, xq = 0, total = 0 }) => (
      <ExpressionReductionWorked
        rows={predictRows(m, b, xq, total)}
        title="Build the model from a description, then predict with it"
        ariaLabel={`The model y equals ${spokenValue(m)}x plus ${spokenValue(b)}, evaluated at ${spokenValue(xq)}, gives ${spokenValue(total)}`}
      />
    ),
    caption: ({ m = 1, b = 0, xq = 0, total = 0 }) =>
      `The description gives the model $y = ${m}x + ${b}$, and substituting $x = ${xq}$ predicts $${total}$.`,
  },

  "d7.lf3.table-predict.l3": {
    Svg: ({ mag = 1, dir = 0, x1 = 1, step = 1, xq = 0, b = 0, total = 0 }) => {
      const m = dir === 1 ? -mag : mag;
      const xs = [x1, x1 + step];
      return (
        <LinearTableWorked
          rows={[
            ...xs.map((x) => ({ x, y: m * x + b })),
            { x: xq, y: total, predicted: true },
          ]}
          m={m}
          b={b}
          title="Build the model from two rows, then predict past the table"
          ariaLabel={`The two rows give a rate of ${spokenValue(m)} and a starting value of ${spokenValue(b)}, and the model predicts ${spokenValue(total)} at ${spokenValue(xq)}`}
        />
      );
    },
    caption: ({ mag = 1, dir = 0, b = 0, xq = 0, total = 0 }) => {
      const m = dir === 1 ? -mag : mag;
      return `The two rows give the rate $${m}$${
        dir === 1 ? ", negative because the output falls as the input grows" : ""
      }, and the starting value is $${b}$, so the model predicts $${total}$ at $x = ${xq}$, past the last row of the table.`;
    },
  },

  "d7.lf3.point-rate-model.l3": {
    Svg: ({ m = 1, xp = 0, b = 0 }) => (
      <ExpressionReductionWorked
        rows={pointRateRows(m, xp, b)}
        title="Recover the starting value from a point that is not the intercept"
        ariaLabel={`Substituting the given point into y equals ${spokenValue(m)}x plus b leaves a starting value of ${spokenValue(b)}, so y equals ${spokenValue(m)}x plus ${spokenValue(b)}`}
      />
    ),
    caption: ({ m = 1, xp = 0, b = 0 }) =>
      `The given output sits at $x = ${xp}$, not at $x = 0$, so it is not the starting value. Solving $${m * xp + b} = ${sp(m)} \\times ${xp} + b$ leaves $b = ${b}$, and the right-hand side is $${rateTermTex(m)} + ${b}$.`,
  },
};
