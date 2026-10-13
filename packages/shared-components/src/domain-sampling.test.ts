import { describe, expect, it } from "vitest";

import { numMath } from "./checker-core";
import {
  MIN_SHARED_POINTS,
  REAL_SAMPLE_POINTS,
  SAMPLE_TOLERANCE,
  sameFunctionOverRealDomain,
} from "./domain-sampling";

/**
 * Design invariants of the domain-aware sampler (Answer_Equivalence_Spec §4, §9).
 * These are not behavior tests of the checker (those live in the golden and
 * false-positive suites) — they pin the PROPERTIES the sampler's correctness
 * argument depends on, so a later edit that quietly drops one fails here with a
 * message that says which guarantee was lost.
 */

const RADICAL_GRAMMAR = {
  allowedFunctions: new Set(["sqrt", "nthRoot", "cbrt", "abs"]),
  allowSymbolicDenominator: true,
} as const;

const compare = (submitted: string, key: string, symbols: readonly string[] = ["x"]) =>
  sameFunctionOverRealDomain(submitted, key, symbols, RADICAL_GRAMMAR);

describe("probe battery composition", () => {
  it("straddles zero: without negative probes abs(x) and x are indistinguishable", () => {
    expect(REAL_SAMPLE_POINTS.some((point) => point < 0)).toBe(true);
  });

  it("covers both sides of 1 in each sign (radicals and powers order differently)", () => {
    expect(REAL_SAMPLE_POINTS.some((p) => p > 0 && p < 1)).toBe(true);
    expect(REAL_SAMPLE_POINTS.some((p) => p > 1)).toBe(true);
    expect(REAL_SAMPLE_POINTS.some((p) => p > -1 && p < 0)).toBe(true);
    expect(REAL_SAMPLE_POINTS.some((p) => p < -1)).toBe(true);
  });

  it("avoids 0 and +-1, where distinct powers coincide", () => {
    for (const point of REAL_SAMPLE_POINTS) {
      expect(Math.abs(point)).not.toBe(0);
      expect(Math.abs(point)).not.toBe(1);
    }
  });

  it("has enough points to satisfy the shared-domain minimum on a half-line", () => {
    expect(REAL_SAMPLE_POINTS.filter((p) => p > 0).length).toBeGreaterThan(
      MIN_SHARED_POINTS,
    );
  });
});

/**
 * The counterfactual that justifies the whole design. On the POSITIVE half of the
 * battery `x`, `abs(x)` and `sqrt(x^2)` are the same function to the last bit; a
 * positive-only sampler would therefore grade `x` CORRECT against a key of
 * `sqrt(x^2)` and silently destroy the distinction RAD.4 exists to teach. The
 * negative probes are what break the tie.
 */
describe("why positive-only sampling would be wrong", () => {
  const at = (expression: string, x: number): number =>
    numMath.parse(expression).evaluate({ x }) as number;

  it("x, abs(x) and sqrt(x^2) agree at EVERY positive probe point", () => {
    for (const point of REAL_SAMPLE_POINTS.filter((p) => p > 0)) {
      expect(Math.abs(at("x", point) - at("abs(x)", point))).toBeLessThan(SAMPLE_TOLERANCE);
      expect(Math.abs(at("x", point) - at("sqrt(x^2)", point))).toBeLessThan(
        SAMPLE_TOLERANCE,
      );
    }
  });

  it("and disagree at every negative probe point, which is what rejects x", () => {
    for (const point of REAL_SAMPLE_POINTS.filter((p) => p < 0)) {
      expect(at("x", point)).not.toBeCloseTo(at("abs(x)", point));
    }
    expect(compare("x", "sqrt(x^2)").matches).toBe(false);
    expect(compare("abs(x)", "sqrt(x^2)").matches).toBe(true);
  });
});

describe("legal-domain restriction is READ from the expression, not assumed", () => {
  it("compares an even root only where its radicand is nonnegative", () => {
    // sqrt(x^5) is real only for x >= 0; x^2*sqrt(x) is the same function there.
    expect(compare("sqrt(x^5)", "x^2*sqrt(x)").matches).toBe(true);
  });

  it("treats a wider domain as a genuine difference, not a coincidence", () => {
    // x^3 is defined for negative x where sqrt(x^5) is not: different functions.
    expect(compare("x^3", "sqrt(x^5)").matches).toBe(false);
  });

  it("does not need an even root to be nonnegative when the index is ODD", () => {
    expect(compare("cbrt(x^3)", "x").matches).toBe(true);
    expect(compare("abs(x)", "cbrt(x^3)").matches).toBe(false);
  });

  it("de-correlates multiple symbols instead of probing the diagonal", () => {
    // On the diagonal x = y, sqrt(x)*sqrt(y) = |x| = sqrt(x*y) would agree.
    expect(compare("sqrt(x)*sqrt(y)", "sqrt(x*y)", ["x", "y"]).matches).toBe(false);
    expect(compare("sqrt(y)*sqrt(x)", "sqrt(x)*sqrt(y)", ["x", "y"]).matches).toBe(true);
  });
});

describe("determinism", () => {
  it("returns an identical verdict on repeated calls (no RNG anywhere)", () => {
    const once = compare("sqrt(x^5)", "x^2*sqrt(x)");
    for (let repeat = 0; repeat < 25; repeat += 1) {
      expect(compare("sqrt(x^5)", "x^2*sqrt(x)")).toEqual(once);
    }
  });

  it("is insensitive to call ORDER (no state carried between comparisons)", () => {
    const first = compare("abs(x)", "sqrt(x^2)");
    compare("x", "sqrt(x^2)");
    compare("nonsense((", "sqrt(x^2)");
    expect(compare("abs(x)", "sqrt(x^2)")).toEqual(first);
  });
});

describe("fails CLOSED, never throws", () => {
  it("reports a malformed submission as a parse error, not a match", () => {
    expect(compare("sqrt(", "abs(x)").result?.status).toBe("invalid_input");
  });

  it("reports a malformed key as a scoring error, not a match", () => {
    expect(compare("abs(x)", "sqrt(").result?.status).toBe("scoring_error");
  });

  it("rejects a key that is real-defined NOWHERE on the battery", () => {
    const outcome = compare("abs(x)", "sqrt(-1-x^2)");
    expect(outcome.matches).toBeUndefined();
    expect(outcome.result?.status).toBe("scoring_error");
    expect(outcome.result?.reason_code).toBe("invalid_answer_key");
  });

  it("refuses to ACCEPT on too little shared domain rather than guessing", () => {
    // Both sides are real only on the sliver the battery barely reaches.
    const outcome = compare("sqrt(-1-x^2)", "sqrt(-1-x^2)");
    expect(outcome.matches).not.toBe(true);
  });

  it("never lets an exception escape, whatever it is handed", () => {
    const hostile = ["", " ", "((((", "x^^2", "sqrt(x))", "|", "\\", "1/0", "x!"];
    for (const expression of hostile) {
      expect(() => compare(expression, "abs(x)")).not.toThrow();
      expect(compare(expression, "abs(x)").matches).not.toBe(true);
    }
  });

  it("rejects a symbol the item never declared", () => {
    expect(compare("abs(z)", "abs(x)").matches).not.toBe(true);
  });
});
