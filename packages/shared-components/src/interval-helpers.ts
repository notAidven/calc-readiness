import { correct, floatEqual, type InternalResult, incorrect } from "./checker-core";

/**
 * Shared interval primitives (Answer_Equivalence_Spec §2). Lifted verbatim from
 * `product-answer-checker.ts` so BOTH the text interval / set-builder paths AND the
 * `number_line` interactive comparator score interval endpoints + inclusivity with
 * ONE deterministic helper. Moving these out of the product checker must not change
 * how it grades: the logic here is byte-for-byte the code the product checker used,
 * and the product checker now imports it.
 */

/** A half-open/closed interval with parsed bounds (±Infinity allowed on open ends). */
export interface Interval {
  lo: number;
  loClosed: boolean;
  hi: number;
  hiClosed: boolean;
}

/** Endpoint equality that handles ±Infinity (floatEqual yields NaN on infinities). */
export function endpointEqual(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return a === b;
  }
  return floatEqual(a, b);
}

/** Compare two SORTED interval lists (shared by interval + set_builder + number_line paths). */
export function compareIntervalLists(
  submitted: readonly Interval[],
  expected: readonly Interval[],
): InternalResult {
  if (submitted.length !== expected.length) {
    return incorrect("value_mismatch");
  }
  for (let i = 0; i < expected.length; i += 1) {
    const a = submitted[i];
    const b = expected[i];
    if (!a || !b) {
      return incorrect("value_mismatch");
    }
    if (!endpointEqual(a.lo, b.lo) || !endpointEqual(a.hi, b.hi)) {
      return incorrect("value_mismatch");
    }
    if (a.loClosed !== b.loClosed || a.hiClosed !== b.hiClosed) {
      return incorrect("wrong_bound_inclusivity");
    }
  }
  return correct();
}
