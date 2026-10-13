/**
 * D5's shared row vocabulary: the LaTeX builders every rational-expression figure writes its
 * rows out of, and the closing excluded-values row all of them end on.
 *
 * These were private to `workedSolutionVisuals.tsx`, which was fine while D5's figures were the
 * only ones that needed them. RAT.1 through RAT.5 also each have a CHECK whose question the
 * practice pool does not ask, and those checks answer with an expression AND its exclusions
 * exactly as the practice items do -- so their figures need this same vocabulary, and a
 * `worked/` module cannot import from the registry without making a cycle out of the layering
 * `workedKit`'s header sets out. Lifted here rather than copied, so the two sets of figures
 * cannot drift into spelling one domain's answers two ways.
 *
 * `d3Kit` and `d4Kit` are the same idea for their own domains.
 */

import { BRICK } from "../svgKit";
import type { ReductionRow } from "../workedKit";

/** A variable term, `3x` or a bare `x`. */
export function ratTerm(coeff: number): string {
  return coeff === 1 ? "x" : `${coeff}x`;
}

/** A trailing signed constant, `+ 7` or `- 7`. */
export function ratTail(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/** `+` or `-` for a signed value, as the operator that precedes its magnitude. */
export function signOp(value: number): string {
  return value < 0 ? "-" : "+";
}

/** A linear factor `x + c` / `x - |c|`, whose zero sits at `-c`. */
export function linTex(c: number): string {
  return `x ${signOp(c)} ${Math.abs(c)}`;
}

/** An expanded monic quadratic `x^2 + sx + p`. */
export function monicQuadTex(sum: number, product: number): string {
  const coeff = Math.abs(sum) === 1 ? "" : `${Math.abs(sum)}`;
  const mid = sum === 0 ? "" : ` ${signOp(sum)} ${coeff}x`;
  return `x^{2}${mid} ${signOp(product)} ${Math.abs(product)}`;
}

/** The same quadratic with every coefficient scaled by `c`. */
export function scaledQuadTex(c: number, sum: number, product: number): string {
  const mid = sum === 0 ? "" : ` ${signOp(c * sum)} ${Math.abs(c * sum)}x`;
  return `${c}x^{2}${mid} ${signOp(c * product)} ${Math.abs(c * product)}`;
}

/**
 * A complex fraction. The outer bar stays a `\dfrac` so it reads as the division it is,
 * while the inner measures typeset as `\tfrac`, which keeps the whole stack near the height
 * of one ordinary display fraction instead of three stacked ones.
 */
export function complexFrac(top: string, bottom: string): string {
  return `\\dfrac{${top}}{${bottom}}`;
}

/** Ink height of a row holding a complex fraction, at the reduction diagram's font size. */
export const NESTED_ROW_H = 76;

/**
 * The closing row of every D5 figure: the values the ORIGINAL denominator forbade, kept
 * after the cancel so the diagram cannot imply the restriction left with the factor. The
 * exclusions are half of a `rational_answer`, so they must never look decorative.
 */
export function excludedRow(...values: readonly number[]): ReductionRow {
  return {
    tokens: [{ text: values.map((v) => `x \\neq ${v}`).join(", \\;\\; "), color: BRICK }],
  };
}
