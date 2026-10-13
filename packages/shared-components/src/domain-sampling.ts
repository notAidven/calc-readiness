import {
  floatEqual,
  type InternalResult,
  invalid,
  numMath,
  type ParseOptions,
  parseSafeExpression,
  scoringError,
} from "./checker-core";

/**
 * DOMAIN-AWARE multi-point numeric sampling: are two expressions in one or more
 * free variables the SAME real-valued function?
 *
 * Radicals are not rational functions, so mathjs `rationalize` cannot decide
 * `sqrt(x^5)` vs `x^2*sqrt(x)`; and a single `evaluate()` with no scope simply
 * throws on any free variable. Equality is therefore judged by evaluating both
 * sides at a fixed battery of probe points and requiring agreement.
 *
 * ## Why the sampler MUST be domain-aware (the correctness requirement)
 *
 * If the probe points were POSITIVE-only, then `sqrt(x^2)`, `abs(x)` and plain
 * `x` would agree at every point, and `x` would be graded CORRECT for a key of
 * `sqrt(x^2)` — destroying the exact distinction (`sqrt(x^2) = |x|`, not `x`)
 * that variable-radicand items exist to teach. So the battery straddles zero.
 *
 * The other half of domain-awareness is the converse: an even root of a negative
 * radicand is NOT real, so `sqrt(x^5)` is only defined for x >= 0 and must not be
 * compared where it is undefined. Rather than assume a domain, we READ it off the
 * expression: a probe point is in the legal domain of an expression exactly when
 * evaluating there yields a finite real JS number. (The float mathjs instance
 * returns a `Complex` for `sqrt(-4)` and `Infinity` for `1/0`; both are rejected
 * by that test, so the domain falls out of the evaluation itself.) A point where
 * BOTH sides are undefined is skipped as a shared domain exclusion; a point where
 * exactly ONE is defined is a real difference between the functions.
 *
 * ## Determinism
 *
 * The probe points are a fixed, hard-coded table and the per-symbol offsets are
 * fixed strides — there is no RNG anywhere, so a given (submitted, key) pair
 * grades identically on every call and in every runtime (Node and Chromium).
 *
 * ## Fail-closed
 *
 * Every evaluation is wrapped: a throw, a non-numeric (complex) result, a NaN or
 * an infinity is treated as "undefined here", never as agreement. If the key is
 * defined at NO probe point it is a bad key (`invalid_answer_key`); if the two
 * sides share fewer than {@link MIN_SHARED_POINTS} points we refuse to ACCEPT on
 * that thin evidence and fail closed. No exception escapes this module.
 */

/**
 * The probe battery: 23 points (a PRIME count, so the per-symbol strides below
 * cycle through every offset), all non-integer, all nonzero, none equal to +-1.
 *
 * Coverage is deliberate:
 * - BOTH SIGNS, so `x`, `abs(x)` and `sqrt(x^2)` are separated (see above).
 * - Magnitudes on BOTH SIDES OF 1 in each sign, because powers and radicals order
 *   differently across 1 (for 0<x<1, `sqrt(x) > x^2`; for x>1, `sqrt(x) < x^2`) —
 *   a positive battery drawn only from (1, inf) would let some near-misses hide.
 * - Non-integer and never +-1 or 0, so `x`, `x^2`, `x^k` and `sqrt(x)` never
 *   coincide accidentally and no negative exponent divides by zero.
 */
export const REAL_SAMPLE_POINTS: readonly number[] = [
  // (0, 1)
  0.13, 0.29, 0.41, 0.57, 0.73, 0.91,
  // (1, inf)
  1.19, 1.43, 1.77, 2.31, 3.13, 4.27, 5.39, 6.71, 7.83,
  // (-1, 0)
  -0.17, -0.37, -0.61, -0.89,
  // (-inf, -1)
  -1.23, -2.41, -3.67, -5.71,
];

/**
 * Strides used to de-correlate the symbols of a MULTIVARIATE expression: symbol i
 * reads the table at `(sample + i * stride) mod 23`. Two sweeps with different
 * strides are run when there is more than one symbol, so a pair such as
 * `sqrt(x)*sqrt(y)` vs `sqrt(x+y)` is probed at 46 distinct (x, y) tuples rather
 * than at a single diagonal. A single symbol needs only one sweep: a second
 * stride would just re-visit the same 23 values in a different order.
 */
const SYMBOL_STRIDES: readonly number[] = [7, 11];

/**
 * Agreement tolerance, passed to the shared {@link floatEqual} (absolute below 1,
 * relative above).
 *
 * **The number is a measurement, and the measurement is what makes it defensible.** Over all 28
 * keys served in the RAD.4 cohort, at the 23 probe points above, across 117 legitimate alternate
 * spellings of those keys, the WORST relative disagreement between two spellings of the same
 * function is 2.408e-16 — `y^3*sqrt(y)` against `sqrt(y^6)*sqrt(y)`, which is the pair this
 * tolerance exists for. 1e-12 keeps four orders of magnitude above that, so it still produces no
 * false negative, and it is three orders tighter than the 1e-9 it replaces.
 *
 * That change is not cosmetic: at 1e-9, `y^3*sqrt(y)*(1+1/100000000000)` and
 * `y^3*sqrt(y)+(y-1)*(y-2)*(y-3)/10000000000000` were both ACCEPTED on 28 of 28 served items,
 * and neither is the key at any real point (strictness report L10). Their deviation is ~1e-11,
 * which 1e-12 refuses.
 *
 * **It narrows the attack rather than closing it, and that limit belongs here rather than in a
 * report nobody reads next to the constant.** The perturbation size is the attacker's to choose,
 * so a scaling by `1 + 1e-13` still passes; `sampleToleranceHeadroom.test.ts` pins that residual
 * deliberately. Closing it needs an exact comparison of variable radicals, not a smaller number
 * here — and a smaller number is exactly what a future reader will reach for, which is why the
 * headroom above is written down as a measured figure they would have to re-measure.
 */
export const SAMPLE_TOLERANCE = 1e-12;

/**
 * Minimum number of probe points at which BOTH sides are defined before an
 * "equivalent" verdict may be returned. A rejection needs no minimum (a single
 * disagreement is decisive); only acceptance is gated, so a near-empty legal
 * domain can never be mistaken for agreement.
 */
export const MIN_SHARED_POINTS = 3;

export interface DomainSampleOutcome {
  /** The two expressions agreed at every shared-domain probe point. */
  matches?: boolean;
  /** The submitted expression is the exact NEGATION of the key (sign error). */
  opposite?: boolean;
  /** Set instead of a verdict when the comparison itself could not be trusted. */
  result?: InternalResult;
}

interface CompiledExpression {
  /** The finite real value at `scope`, or `undefined` when out of the domain. */
  at(scope: Record<string, number>): number | undefined;
}

/** Compile once, evaluate at many points; never throws. */
function compileForSampling(expression: string): CompiledExpression | undefined {
  try {
    const compiled = numMath.parse(expression).compile();
    return {
      at(scope) {
        try {
          const value = compiled.evaluate(scope) as unknown;
          return typeof value === "number" && Number.isFinite(value) ? value : undefined;
        } catch {
          return undefined;
        }
      },
    };
  } catch {
    return undefined;
  }
}

/** The deterministic sequence of scopes the battery evaluates at. */
function* sampleScopes(
  symbols: readonly string[],
): Generator<Record<string, number>, void, undefined> {
  const size = REAL_SAMPLE_POINTS.length;
  const strides = symbols.length > 1 ? SYMBOL_STRIDES : SYMBOL_STRIDES.slice(0, 1);
  for (const stride of strides) {
    for (let sample = 0; sample < size; sample += 1) {
      const scope: Record<string, number> = {};
      symbols.forEach((symbol, index) => {
        scope[symbol] = REAL_SAMPLE_POINTS[(sample + index * stride) % size] as number;
      });
      yield scope;
    }
  }
}

/**
 * Are `submitted` and `key` the same real function of `symbols`? Both are first
 * re-validated against the declared grammar (`extra`), so nothing outside the
 * item's grammar is ever evaluated.
 */
export function sameFunctionOverRealDomain(
  submitted: string,
  key: string,
  symbols: readonly string[],
  extra: Omit<ParseOptions, "allowedSymbols"> = {},
): DomainSampleOutcome {
  const submittedSafe = parseSafeExpression(submitted, symbols, extra);
  if (submittedSafe.result || !submittedSafe.node) {
    return { result: submittedSafe.result ?? invalid("parse_error") };
  }
  const keySafe = parseSafeExpression(key, symbols, extra);
  if (keySafe.result || !keySafe.node) {
    return { result: scoringError("invalid_answer_key") };
  }
  const keyCompiled = compileForSampling(key);
  if (!keyCompiled) {
    return { result: scoringError("invalid_answer_key") };
  }
  const submittedCompiled = compileForSampling(submitted);
  if (!submittedCompiled) {
    return { result: invalid("parse_error") };
  }

  let sharedPoints = 0;
  let keyDefinedAnywhere = false;
  let matches = true;
  let opposite = true;
  for (const scope of sampleScopes(symbols)) {
    const submittedValue = submittedCompiled.at(scope);
    const keyValue = keyCompiled.at(scope);
    if (keyValue !== undefined) {
      keyDefinedAnywhere = true;
    }
    if (submittedValue === undefined && keyValue === undefined) {
      continue; // shared domain exclusion: not a distinguishing point.
    }
    if (submittedValue === undefined || keyValue === undefined) {
      // Defined on one side only: the two are different FUNCTIONS, not just
      // different values (this is what separates `sqrt(x)*sqrt(x)` from `x`).
      matches = false;
      opposite = false;
      continue;
    }
    sharedPoints += 1;
    if (!floatEqual(submittedValue, keyValue, SAMPLE_TOLERANCE)) {
      matches = false;
    }
    if (!floatEqual(submittedValue, -keyValue, SAMPLE_TOLERANCE)) {
      opposite = false;
    }
  }

  if (!keyDefinedAnywhere) {
    return { result: scoringError("invalid_answer_key") };
  }
  if ((matches || opposite) && sharedPoints < MIN_SHARED_POINTS) {
    // Too little overlap to justify accepting; fail closed rather than guess.
    return { result: invalid("insufficient_domain_samples") };
  }
  return { matches, opposite };
}
