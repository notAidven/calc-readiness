import { describe, expect, it } from "vitest";

import type { AnswerDefinition } from "./checker-core";
import type { AnswerSpec } from "./index";
import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
  type ProductItemVersion,
} from "./product-answer-checker";

/**
 * A polynomial written over a constant denominator is a POLYNOMIAL, and a wrong one has to be
 * scored as a miss rather than discarded as unreadable.
 *
 * ## The defect this file was written for (swarm ledger F3, census P2-a)
 *
 * `math.rationalize` on this mathjs instance throws on expressions it should read:
 * `Invalid - placing` on `(x - 9)/4`, `Invalid + placing` on `(x + 1)/3`, `Invalid ^ placing`
 * on `-(x^2 + 16x + 63)`. Every one of those is a valid single-variable polynomial. Two
 * comparators read a polynomial through `rationalize` and each turns the throw into
 * `invalid_input / parse_error`:
 *
 *  - `symbolicEqual`, which rationalizes the DIFFERENCE `(submitted) - (key)` — the path every
 *    `expression` item with `equivalence: "symbolic"` takes, and the one the six measured F3
 *    rows go through (`d6.fun8.swap-solve-*`, `d7.lf2.parallel-point.l2`, all
 *    `simplification: combined_polynomial`, all `required_form: null`);
 *  - `polyCoefficients`, read by `compareFactored` and `compareStandardPolynomial`.
 *
 * `invalid_input` is not a miss. The lesson engine declines to score it, so no attempt is
 * recorded and no misconception is logged: measured through the full submit path, a learner
 * who writes the inverse-operation miss as `x/4 - 9` is scored `incorrect / value_mismatch`
 * and a learner who writes the identical misconception as `(x - 9)/4` has their answer thrown
 * away. Where they put the division bar decides whether their mistake exists.
 *
 * ## What this file asserts, and why each case is here
 *
 * The population is the four spellings that separate the two readings — a constant
 * denominator over a sum, a constant denominator over a difference, a leading unary minus over
 * a parenthesised sum, and a leading unary minus over a parenthesised product — crossed with
 * the three comparators that read a polynomial. Each is asserted to reach a SCORED verdict
 * (`correct` or `incorrect`), never `invalid_input`.
 *
 * The timing case is the other half of the same change: `rationalize`'s cost is
 * super-exponential in the degree of a written product (`(x + 1)^5` measured at 122 SECONDS,
 * `(x + 1)^6` unfinished after a further minute — `docs/Product_Checker_Poly_Coefficient_Cost.md`),
 * and `MAX_EXPONENT` is 8, so every one of those is inside the grammar the answer field
 * advertises. A learner can freeze their own tab by typing a legal answer. The bound here is
 * deliberately loose (2 seconds for what should be microseconds), because the assertion is
 * "the cliff is gone", not "the AST walk is exactly this fast on this runner".
 */

function spec(overrides: Partial<AnswerSpec>): AnswerSpec {
  return {
    answer_type: "numeric",
    equivalence: "exact_value",
    representation: "any",
    simplification: "none",
    required_form: null,
    required_notation: "none",
    precision: null,
    unit_policy: "none",
    ...overrides,
  };
}

const item = (
  item_version_id: string,
  node_id: string,
  answer: AnswerDefinition,
): ProductItemVersion => ({ item_version_id, node_id, answer });

/**
 * The three comparators, each keyed the way a served item keys it.
 *
 * `poly:symbolic:*` mirrors the F3 cohort exactly (`equivalence: "symbolic"`,
 * `simplification: "combined_polynomial"`, no `required_form`): those are the specs read off
 * `d6.fun8.swap-solve-divide.l3:practice:141210`, `d6.fun8.swap-solve-group.l2:practice:140032`
 * and `d7.lf2.parallel-point.l2:practice:80006` in the frozen bank.
 */
const ITEMS: readonly ProductItemVersion[] = [
  item("poly:symbolic:divide:v2", "FUN.8", {
    answer_key: "4x - 36",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      simplification: "combined_polynomial",
    }),
  }),
  item("poly:symbolic:group:v2", "FUN.8", {
    answer_key: "5x + 3",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      simplification: "combined_polynomial",
    }),
  }),
  item("poly:symbolic:parallel:v2", "LF.2", {
    answer_key: "2*x + 1",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      simplification: "combined_polynomial",
    }),
  }),
  // The P2-a shape: a quadratic key, whose `sign_flip` mutation is `-(key)`.
  //
  // `simplification: "none"` and not `combined_polynomial`, deliberately: `combined_polynomial`
  // reads `x^2` and `16x` as like terms (`hasUncombinedLikeTerms` compares by SYMBOL, not by
  // power), so an item pairing a quadratic key with that profile would refuse its own key. No
  // served item pairs them — every `combined_polynomial` key in the bank is linear, and the
  // census's key self-check is empty — so that is an observation about the profile and not a
  // live defect, but it must not be built into a fixture, or this file would measure it instead
  // of the sign flip.
  item("poly:symbolic:quadratic:v2", "POL.1", {
    answer_key: "x^2 + 16x + 63",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      simplification: "none",
    }),
  }),
  item("poly:standard:v2", "POL.1", {
    answer_key: "x^2 + 5*x + 6",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      required_form: "is_standard_polynomial",
    }),
  }),
  item("poly:factored:v2", "POL.2", {
    answer_key: "(x + 2)*(x + 3)",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "structural",
      required_form: "fully_factored_over_integers",
    }),
  }),
  item("poly:factored:deep:v2", "POL.7", {
    answer_key: "-2*(x + 1)^2*(x - 3)*(x - 5)",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "structural",
      required_form: "fully_factored_over_integers",
    }),
  }),
];

const checker = createProductAnswerChecker({ itemVersions: ITEMS });

function grade(item_version_id: string, raw_answer: unknown) {
  return checker({
    raw_answer,
    item_version_id,
    equivalence_checker_version: PRODUCT_CHECKER_VERSION,
  });
}

/**
 * The six rows measured through the full submit path on served items, restated against the
 * comparator they reach. `x/4 - 9` is the control: `rationalize` reads it, so it was already
 * scored, and it must stay scored.
 */
const F3_ROWS: readonly {
  readonly item: string;
  readonly submitted: string;
  readonly expected: "correct" | "incorrect";
}[] = [
  { item: "poly:symbolic:divide:v2", submitted: "x/4 - 9", expected: "incorrect" },
  { item: "poly:symbolic:divide:v2", submitted: "(x - 9)/4", expected: "incorrect" },
  { item: "poly:symbolic:divide:v2", submitted: "(x + 1)/3", expected: "incorrect" },
  { item: "poly:symbolic:group:v2", submitted: "(x - 3)/5", expected: "incorrect" },
  { item: "poly:symbolic:parallel:v2", submitted: "-x/2 - 4", expected: "incorrect" },
  { item: "poly:symbolic:parallel:v2", submitted: "(-x - 8)/2", expected: "incorrect" },
  // The same shapes written so they are RIGHT: a widening that only ever scores a miss would
  // be a rule about wrong answers, and this one is a rule about reading polynomials.
  { item: "poly:symbolic:divide:v2", submitted: "(8x - 72)/2", expected: "correct" },
  { item: "poly:symbolic:group:v2", submitted: "(15x + 9)/3", expected: "correct" },
  { item: "poly:symbolic:parallel:v2", submitted: "-(-2*x - 1)", expected: "correct" },
];

describe("a polynomial over a constant is scored, not discarded (F3)", () => {
  it.each(F3_ROWS)(
    "$item :: $submitted is $expected",
    ({ item: id, submitted, expected }) => {
      const result = grade(id, submitted);
      expect(result.status, `${submitted} -> ${result.status}/${result.reason_code}`).toBe(
        expected,
      );
    },
  );

  it("every F3 row reaches a scored verdict, never invalid_input", () => {
    expect(F3_ROWS.length).toBeGreaterThanOrEqual(9);
    const unscored = F3_ROWS.filter(
      (row) => grade(row.item, row.submitted).status === "invalid_input",
    );
    expect(unscored.map((row) => row.submitted)).toEqual([]);
  });
});

/**
 * P2-a: a learner who parenthesises and negates. 19 census instances, all `sign_flip`
 * mutations of an item's own key, all `parse_error` before this change. The verdict owed is
 * `incorrect / sign_error` where the comparator has a sign path, and a scored miss otherwise.
 */
const NEGATED_SPELLINGS: readonly {
  readonly submitted: string;
  readonly reason: string;
}[] = [
  // The key negated, so the comparator's own sign path is what should answer.
  { submitted: "-(x^2 + 16x + 63)", reason: "sign_error" },
  { submitted: "-(x^2 + 16*x + 63)", reason: "sign_error" },
  { submitted: "-((x + 9)(x + 7))", reason: "sign_error" },
  // The census's other literal string. `(x + 9)(x + 5)` is x^2 + 14x + 45, so negated it is
  // not the key's value either way and `value_mismatch` is the right answer — the finding is
  // that it was `parse_error`, not that it was the wrong reason code.
  { submitted: "-((x + 9)(x + 5))", reason: "value_mismatch" },
];

describe("a negated juxtaposed polynomial is scored, not discarded (P2-a)", () => {
  it.each(NEGATED_SPELLINGS)(
    "$submitted is a scored miss ($reason)",
    ({ submitted, reason }) => {
      const result = grade("poly:symbolic:quadratic:v2", submitted);
      expect(result.status, `${submitted} -> ${result.status}/${result.reason_code}`).toBe(
        "incorrect",
      );
      expect(result.reason_code, submitted).toBe(reason);
    },
  );

  it("the un-negated spelling of each is still correct", () => {
    for (const submitted of ["x^2 + 16x + 63", "(x + 9)(x + 7)", "x^2 + 16*x + 63"]) {
      expect(grade("poly:symbolic:quadratic:v2", submitted).status, submitted).toBe(
        "correct",
      );
    }
  });
});

describe("the same widening reaches the two polynomial-coefficient comparators", () => {
  it.each([
    // is_standard_polynomial: right value, written over a constant, so NOT standard form.
    { item: "poly:standard:v2", submitted: "(2*x^2 + 10*x + 12)/2", expected: "incorrect" },
    { item: "poly:standard:v2", submitted: "-(-x^2 - 5*x - 6)", expected: "incorrect" },
    // fully_factored_over_integers: a leading minus over a bracket, which rationalize refuses.
    { item: "poly:factored:v2", submitted: "-(-x - 2)*(x + 3)", expected: "correct" },
    { item: "poly:factored:v2", submitted: "(2*x + 4)*(x + 3)/2", expected: "incorrect" },
  ])("$item :: $submitted is $expected", ({ item: id, submitted, expected }) => {
    const result = grade(id, submitted);
    expect(result.status, `${submitted} -> ${result.status}/${result.reason_code}`).toBe(
      expected,
    );
  });
});

/**
 * The cost cliff lives in `polyCoefficientCliff.test.ts` rather than here, because before this
 * change it does not FAIL — it hangs. `rationalize("(x + 1)^6")` is synchronous and did not
 * come back after 58 seconds, and vitest cannot time out a synchronous call, so the red state
 * of that assertion is a wedged worker rather than a report. It is measured out of process.
 */
