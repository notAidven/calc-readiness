/**
 * Formatting helpers shared by the per-node D1 template files (`nodes/<NODE>/`).
 *
 * These were previously duplicated inline in `templates.ts` and `practice.ts`;
 * hoisting them here lets each node's templates live in its own file while every
 * node renders numbers/terms/signs identically (so the frozen item content is
 * byte-for-byte unchanged by the per-node split).
 */

/** Format a JS number without floating-point noise. */
export function numStr(value: number): string {
  return String(Number(value.toFixed(6)));
}

/** A variable term for an inner math expression, e.g. `2y` or `y` (coeff 1). */
export function varTerm(coeff: number, variable: string): string {
  return coeff === 1 ? variable : `${coeff}${variable}`;
}

/** A signed integer for an inner math expression: negatives are parenthesized. */
export function signedOperand(magnitude: number, negative: boolean): string {
  return negative ? `(${-magnitude})` : `${magnitude}`;
}
