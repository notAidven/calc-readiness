/**
 * The shared vocabulary of a worked-solution diagram: the number/LaTeX formatters every
 * figure needs, the tiered row-reduction archetype most of them are built from, and the
 * `{ Svg, caption }` shape the registry stores.
 *
 * These lived inside `workedSolutionVisuals.tsx` while D1 was the only bank with figures.
 * They sit here now so a domain can author its worked solutions in its OWN module
 * (`worked/d7LF1.tsx` and friends) and have the registry merely spread them in — four
 * domains' figures no longer have to be written into one 4,000-line file, and neither
 * does an import cycle appear, since a domain module reaches DOWN to this kit rather
 * than back up to the registry.
 *
 * Every string here is one of three kinds, and they must not be mixed up:
 *  - LaTeX, for `SvgMath` / `EqToken.text` / `$...$` inside a caption (`\times`, `\dfrac`);
 *  - spoken English, for `aria-label` and `<title>` ("negative 7", "3 over 4");
 *  - plain text, for the handful of `<text>` labels that are bare integers or words.
 */

import type { JSX } from "react";

import {
  type EqToken,
  EquationRow,
  LINE,
  PEMDAS,
  type PemdasRole,
  SvgMath,
  stackGapMid,
} from "./svgKit";

/* -------------------------------------------------------------------------- */
/* Number and LaTeX formatters                                                 */
/* -------------------------------------------------------------------------- */

/** Format a number without floating-point noise (mirrors the item-bank helper). */
export function numStr(value: number): string {
  return String(Number(value.toFixed(6)));
}

/** A signed *value* with negatives parenthesized, e.g. `(-12)` or `7`. */
export function sp(n: number): string {
  return n < 0 ? `(-${-n})` : `${n}`;
}

/** A signed value read aloud, e.g. `negative 17`, for aria-labels. */
export function spoken(n: number): string {
  return n < 0 ? `negative ${-n}` : `${n}`;
}

/** A variable term, e.g. `2y` or `y` (coefficient 1). */
export function vt(coeff: number, variable: string): string {
  return coeff === 1 ? variable : `${coeff}${variable}`;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** Reduce a fraction to lowest terms. */
export function reduce(n: number, d: number): { n: number; d: number } {
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

/**
 * A fraction. `\dfrac` is the full stacked form the diagrams want; pass `inline` for
 * the `\tfrac` that belongs in a caption sentence, where a display fraction would
 * shove the surrounding line apart.
 */
export function frac(n: number | string, d: number | string, inline = false): string {
  return `\\${inline ? "t" : "d"}frac{${n}}{${d}}`;
}

/** A reduced fraction, or a bare whole number when the denominator reduces to 1. */
export function fracTex(n: number, d: number, inline = false): string {
  const r = reduce(n, d);
  return r.d === 1 ? `${r.n}` : frac(r.n, r.d, inline);
}

/**
 * `n/d`, followed by `= <reduced>` ONLY when reducing actually changes it. Every
 * generator here can land on an already-reduced result, and writing the tail
 * unconditionally makes the diagram claim a step that did not happen ("3/5 = 3/5").
 */
export function reduceTail(n: number, d: number, inline = false): string {
  const raw = frac(n, d, inline);
  return reduce(n, d).d === d ? raw : `${raw} = ${fracTex(n, d, inline)}`;
}

/** A reduced fraction read aloud, e.g. `7 over 12`, for aria-labels. */
export function fracSpoken(n: number, d: number): string {
  const r = reduce(n, d);
  return r.d === 1 ? `${r.n}` : `${r.n} over ${r.d}`;
}

/* -------------------------------------------------------------------------- */
/* Tiered row reduction (the arithmetic + algebra families)                    */
/* -------------------------------------------------------------------------- */

export interface ReductionRow {
  /** Optional tier chip shown to the left (PEMDAS families). */
  chip?: { role: PemdasRole; latex: string };
  /**
   * Ink height override, for a row whose math is taller than one display fraction. A
   * complex fraction (RAT.4) stacks a `\dfrac` over a `\dfrac`, so it is roughly twice
   * the height the measured constants below assume. Left unset everywhere else, so the
   * measured heights still drive every other diagram unchanged.
   */
  ink?: number;
  tokens: EqToken[];
}

/** The tier chips, each in its tier color. `(\;)` is an empty pair of parentheses. */
export const CHIP = {
  paren: { role: "paren", latex: "(\\;)" },
  exp: { role: "exp", latex: "x^{n}" },
  times: { role: "muldiv", latex: "\\times" },
  plus: { role: "addsub", latex: "+" },
  minus: { role: "addsub", latex: "-" },
} as const satisfies Record<string, { role: PemdasRole; latex: string }>;

/**
 * Operators are always their own token: KaTeX drops the spacing around a binary operator
 * that sits at the edge of an expression, so gluing one onto an operand (`3x +`) renders
 * `3x+` and pushes `EquationRow`'s gap to the wrong side.
 */
export const PLUS: EqToken = { text: "+", role: "addsub" };
export const MINUS: EqToken = { text: "-", role: "addsub" };
export const TIMES: EqToken = { text: "\\times", role: "muldiv" };
/** The same operators in default ink, for the algebra rows that carry no tier color. */
export const PLUS_INK: EqToken = { text: "+" };
export const MINUS_INK: EqToken = { text: "-" };
export const TIMES_INK: EqToken = { text: "\\times" };
export const DIV_INK: EqToken = { text: "\\div" };

/**
 * How tall a row's typeset math actually is at `fontSize` 18, measured in Chromium: a
 * one-line row is 28 and a display fraction is 49. A `\tfrac` is only 27, so it takes the
 * one-line slot. Rows used to sit on a fixed 40 pitch, which a `\dfrac` overflows on both
 * sides — consecutive fraction rows collided and the down-arrow landed inside their ink.
 *
 * Exported alongside `ROW_GAP` because `worked/d3LIN3.tsx` stacks its own rows on the same
 * pattern and needs the same two numbers. Two copies of a measured constant drift, and a copy
 * that drifts is the row height one figure family reserves being silently unlike the other's.
 */
export const PLAIN_ROW_H = 28;
export const DISPLAY_FRACTION_ROW_H = 52;
/**
 * Clear space between two rows' ink. Holds the down-arrow, and keeps one-line rows on their
 * historical 40 pitch.
 *
 * Exported because `workedFigureLabels.browser.test.tsx` excuses the down-arrow from its
 * label-overlap claim on the grounds that the arrow lives in THIS gap, and pins the reach that
 * excuse buys against this number rather than against one somebody measured once.
 */
export const ROW_GAP = 12;

function rowInkHeight(row: ReductionRow): number {
  if (row.ink !== undefined) {
    return row.ink;
  }
  return row.tokens.some((token) => token.text.includes("dfrac"))
    ? DISPLAY_FRACTION_ROW_H
    : PLAIN_ROW_H;
}

/**
 * A vertical reduction: one row per step, an optional colored tier chip on the
 * left, down-arrows between rows, and the final value on the last row. Mirrors the
 * row-per-tier layout the PEMDAS mini-lesson solver walks the learner through.
 */
export function ExpressionReductionWorked({
  rows,
  ariaLabel,
  title,
  cx = 220,
}: {
  rows: ReductionRow[];
  ariaLabel: string;
  title: string;
  cx?: number;
}): JSX.Element {
  const topInk = 20;
  const bottomPad = 32;
  const fontSize = 18;
  const chipX = 40;
  const chipW = 44;
  const chipH = 28;

  // Stack the rows on their own ink heights rather than a fixed pitch: each center sits a
  // half-row plus one gap below the previous one, and the arrow hangs in the gap between
  // the two rows' ink. An all-one-line diagram reproduces the old geometry exactly (first
  // center 34, pitch 40, arrow on the mean), so nothing outside the fraction rows shifts.
  let above: { center: number; ink: number } | undefined;
  const placed = rows.map((row) => {
    const ink = rowInkHeight(row);
    const center = above
      ? above.center + above.ink / 2 + ROW_GAP + ink / 2
      : topInk + ink / 2;
    const arrowY = above ? stackGapMid(above.center + above.ink / 2, center - ink / 2) : 0;
    above = { center, ink };
    return { row, center, ink, arrowY };
  });
  const last = placed.at(-1);
  const height = last ? last.center + last.ink / 2 + bottomPad : topInk + bottomPad;

  return (
    <svg viewBox={`0 0 440 ${height}`} role="img" aria-label={ariaLabel}>
      <title>{title}</title>
      {placed.map(({ row, center: rowY, arrowY }, index) => {
        // Centered on the row: EquationRow centers its math on `rowY` rather than
        // sitting a baseline there, so the chip needs no ascent nudge.
        const chipY = rowY - chipH / 2;
        const color = row.chip ? PEMDAS[row.chip.role] : undefined;
        const key = `${index}:${row.tokens.map((t) => t.text).join("|")}`;
        return (
          <g key={key}>
            {row.chip && color && (
              <g>
                <rect
                  x={chipX}
                  y={chipY}
                  width={chipW}
                  height={chipH}
                  rx={7}
                  fill={color}
                  fillOpacity={0.16}
                  stroke={color}
                  strokeWidth={1.5}
                />
                <SvgMath
                  latex={row.chip.latex}
                  x={chipX + chipW / 2}
                  y={chipY + chipH / 2}
                  fontSize={15}
                  color={color}
                  w={chipW * 2}
                />
              </g>
            )}
            {index > 0 && (
              <text
                x={cx}
                y={arrowY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fill={LINE}
              >
                &#8595;
              </text>
            )}
            <EquationRow cx={cx} y={rowY} fontSize={fontSize} tokens={row.tokens} />
          </g>
        );
      })}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Registry entry shape                                                        */
/* -------------------------------------------------------------------------- */

export interface WorkedSolutionVisual {
  Svg: (params: Record<string, number>) => JSX.Element;
  /** Markdown, with any math in `$...$` — it renders through `LessonProse`. */
  caption: (params: Record<string, number>) => string;
}
