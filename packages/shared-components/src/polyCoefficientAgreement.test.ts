import { describe, expect, it } from "vitest";

import { math } from "./checker-core";
import { readPolynomialCoefficients } from "./product-answer-checker";
import { PRODUCT_GOLDEN_CASES, PRODUCT_SPIKE_ITEMS } from "./product-checker-fixtures";

/**
 * The differential guard on the two polynomial readings.
 *
 * `polyCoefficients` now reads a polynomial off the AST and keeps `math.rationalize` only as the
 * fallback for what the AST walk declines. That reordering is only defensible if the two readings
 * agree wherever both can read, so this file measures the agreement instead of asserting it, and
 * reports the three ways they can differ separately:
 *
 *  - **substantive** — both readings answered and the coefficients differ. This must be ZERO;
 *    any member is a verdict this change would move.
 *  - **widening** — the AST walk answered and `rationalize` threw. This is the whole point (F3,
 *    P2-a), so it carries a FLOOR: a reading that answered nothing would agree with everything,
 *    and a floor is what stops the guard passing vacuously.
 *  - **fallback** — `rationalize` answered and the walk declined. Not a defect: those go on
 *    through `rationalize` exactly as before. Reported so the split is visible, and floored at 0
 *    only in the sense that nothing breaks.
 *
 * `docs/Product_Checker_Poly_Coefficient_Cost.md` asks for exactly this shape and names the two
 * conventions the readings must share (a constant reads as `[]`, a cancelling leading term keeps
 * its written degree). Degree 4 is the last degree where the two CAN be compared — `(x + 1)^5`
 * takes `rationalize` 122 seconds — so the generated family stops there, and the degrees above it
 * are asserted by value in `polyCoefficientCliff.test.ts`.
 *
 * The corpus is DERIVED: every fixture key, every fixture raw answer, and a generated family of
 * one-, two-, three- and four-bracket products. It is not a list of strings chosen to agree.
 */

/** The reading as it was before this change, called exactly as `polyCoefficients` called it. */
function rationalizeReading(expression: string): number[] | null {
  try {
    const detailed = math.rationalize(expression, {}, true) as { coefficients: unknown[] };
    return detailed.coefficients.map((coefficient) => Number(coefficient));
  } catch {
    return null;
  }
}

function generatedProducts(): string[] {
  const out: string[] = [];
  for (let a = 1; a <= 3; a += 1) {
    out.push(`${a}*(x - ${a})`, `${a}(x - ${a})`, `(x + ${a})`);
    for (let b = 1; b <= 3; b += 1) {
      out.push(`(x + ${a})*(x + ${b})`, `(x + ${a})(x - ${b})`);
    }
  }
  for (let a = 1; a <= 2; a += 1) {
    out.push(`(x + ${a})*(x + 2)*(x + 3)`, `(x - ${a})(x + 2)(x - 3)`);
    out.push(`-${a}*(x + 1)*(x + 2)*(x + 3)`);
  }
  // Degree 4, the last degree the two readings can be compared at.
  out.push("(x + 1)^2*(x + 2)*(x + 3)", "-2*(x + 5)*(x + 4)^2*(x - 4)");
  return out;
}

const FIXTURE_KEYS = PRODUCT_SPIKE_ITEMS.map((version) => version.answer.answer_key).filter(
  (key): key is string => typeof key === "string",
);

const FIXTURE_RAW_ANSWERS = PRODUCT_GOLDEN_CASES.map(
  (testCase) => testCase.raw_answer,
).filter((raw): raw is string => typeof raw === "string");

/**
 * The spellings `rationalize` is measured to REFUSE, from the cost document's own table plus the
 * six rows the swarm ledger measured through the submit path. They are in the corpus so the
 * widening is counted on the strings the finding was about, not only on whatever the fixtures
 * happen to contain.
 */
const REFUSED_BY_RATIONALIZE: readonly string[] = [
  "-(x + 4)^2",
  "-(x + 4)*(x + 4)",
  "-(x^2 + 3)",
  "(x + 1)/3",
  "(x - 9)/4",
  "(x - 3)/5",
  "-x/2 - 4",
  "(-x - 8)/2",
  "-(x^2 + 16x + 63)",
  "-((x + 9)(x + 5))",
];

const CORPUS: readonly string[] = [
  ...new Set([
    ...FIXTURE_KEYS,
    ...FIXTURE_RAW_ANSWERS,
    ...generatedProducts(),
    ...REFUSED_BY_RATIONALIZE,
  ]),
];

interface Comparison {
  readonly expression: string;
  readonly reader: number[] | null;
  readonly rationalize: number[] | null;
}

function sameNumbers(a: number[], b: number[]): boolean {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    if (Math.abs((a[i] ?? 0) - (b[i] ?? 0)) > 1e-9) {
      return false;
    }
  }
  return true;
}

const COMPARISONS: readonly Comparison[] = CORPUS.map((expression) => ({
  expression,
  reader: readPolynomialCoefficients(expression),
  rationalize: rationalizeReading(expression),
}));

const substantive = COMPARISONS.filter(
  (row) => row.reader && row.rationalize && !sameNumbers(row.reader, row.rationalize),
);
const widening = COMPARISONS.filter((row) => row.reader && !row.rationalize);
const fallback = COMPARISONS.filter((row) => !row.reader && row.rationalize);
const agreed = COMPARISONS.filter(
  (row) => row.reader && row.rationalize && sameNumbers(row.reader, row.rationalize),
);

describe("the AST reading and rationalize agree wherever both can read", () => {
  it("the corpus is big enough, and derived", () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(60);
    expect(FIXTURE_KEYS.length).toBeGreaterThanOrEqual(20);
    expect(FIXTURE_RAW_ANSWERS.length).toBeGreaterThanOrEqual(60);
  });

  it("no expression is read differently by the two readings", () => {
    expect(
      substantive.map(
        (row) =>
          `${row.expression}: reader [${row.reader}] vs rationalize [${row.rationalize}]`,
      ),
    ).toEqual([]);
    // A reading that answers nothing agrees with everything, so the agreement needs a floor
    // under how much was actually compared.
    expect(
      agreed.length,
      "the two readings barely overlap on this corpus",
    ).toBeGreaterThanOrEqual(40);
  }, 120000);

  it("the AST reading answers polynomials rationalize throws on", () => {
    const widened = new Set(widening.map((row) => row.expression));
    for (const expression of REFUSED_BY_RATIONALIZE) {
      expect(widened.has(expression), `${expression} is no longer a widening`).toBe(true);
    }
    expect(widening.length).toBeGreaterThanOrEqual(REFUSED_BY_RATIONALIZE.length);
  }, 120000);

  it("both conventions rationalize uses are honoured", () => {
    // A constant reads as no coefficients at all, and a cancelling leading term keeps the
    // written degree. These are the two places the readings could have drifted apart silently,
    // and both are `rationalize`'s conventions rather than the nicer ones.
    expect(readPolynomialCoefficients("5")).toEqual([]);
    expect(rationalizeReading("5")).toEqual([]);
    expect(readPolynomialCoefficients("x - x")).toEqual([0, 0]);
    expect(rationalizeReading("x - x")).toEqual([0, 0]);
    expect(readPolynomialCoefficients("x^2 - x^2")).toEqual([0, 0, 0]);
    expect(rationalizeReading("x^2 - x^2")).toEqual([0, 0, 0]);
  });

  it("declines what it cannot read exactly, rather than guessing", () => {
    // Each of these must fall through, or the reader would be answering questions it has no
    // business answering: a symbolic denominator, a second variable, a radical, a call.
    for (const expression of ["1/(x + 1)", "x*y + 1", "sqrt(x)", "log(x)", "x^(1/2)"]) {
      expect(readPolynomialCoefficients(expression), expression).toBeNull();
    }
    // And a rounded decimal is NOT the rational it approximates: the reading is exact, so
    // `0.333333333` must not read as 1/3. (`x/3` is [0, 1/3].)
    const third = readPolynomialCoefficients("x/3");
    const rounded = readPolynomialCoefficients("0.333333333x");
    expect(third?.[1]).toBeCloseTo(1 / 3, 12);
    expect(rounded?.[1]).not.toBe(third?.[1]);
  });

  it("reports the split", () => {
    // Not an assertion so much as the measurement this file exists to publish; the counts are
    // in the failure message of the assertions above when they move.
    expect({
      corpus: CORPUS.length,
      agreed: agreed.length,
      substantive_disagreements: substantive.length,
      widening: widening.length,
      fallback: fallback.length,
    }).toMatchObject({ substantive_disagreements: 0 });
  }, 120000);
});
