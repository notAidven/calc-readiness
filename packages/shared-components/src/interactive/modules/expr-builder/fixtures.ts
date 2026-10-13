import type { ExprBuilderPayload, ExprBuilderSpec, RationalPowerSpec } from "./comparator";

/**
 * Cross-runtime fixtures for the `expr_builder` comparator (mirrors the graph +
 * number_line fixtures). Shared by the Node unit suite and the Chromium parity
 * suite so BOTH runtimes are asserted to return identical verdicts
 * (Answer_Equivalence_Spec §13.15).
 */

export interface ExprBuilderGoldenCase {
  name: string;
  spec: ExprBuilderSpec;
  response: ExprBuilderPayload;
  expected_status: "correct" | "incorrect" | "invalid_input" | "scoring_error";
  expected_reason: string;
}

// --- x^3: combine x^5 * x^-2 into positive-exponent form ---
const POWER_SPEC: ExprBuilderSpec = { kind: "positive_power", base: "x", exp: 3 };

// --- y^2: a second base + exponent, to prove base is scored, not assumed ---
const POWER_SPEC_Y: ExprBuilderSpec = { kind: "positive_power", base: "y", exp: 2 };

// --- 5*sqrt(2): simplify sqrt(50) to a coefficient in front of a square root ---
const COEFF_RADICAL_SPEC: ExprBuilderSpec = {
  kind: "coeff_radical",
  coeff: 5,
  radicand: 2,
  index: 2,
};

// --- 2*cbrt(3): a cube-root coefficient form, to prove the index is scored ---
const COEFF_CBRT_SPEC: ExprBuilderSpec = {
  kind: "coeff_radical",
  coeff: 2,
  radicand: 3,
  index: 3,
};

// --- root(x^3, 4): the radical form of x^(3/4) ---
const RADICAL_FORM_SPEC: ExprBuilderSpec = {
  kind: "radical_form",
  base: "x",
  power: 3,
  index: 4,
};

// --- x^(3/4): the rational-exponent form of root(x^3, 4) ---
const RATIONAL_POWER_SPEC: ExprBuilderSpec = {
  kind: "rational_power",
  base: "x",
  num: 3,
  den: 4,
};

// --- x^(1/2): the RAD.3 `1/3 + 1/6` sum, whose honest intermediate is 3/6 ---
const RATIONAL_POWER_HALF_SPEC: RationalPowerSpec = {
  kind: "rational_power",
  base: "x",
  num: 1,
  den: 2,
};

export const EXPR_BUILDER_GOLDEN_CASES: readonly ExprBuilderGoldenCase[] = [
  {
    name: "positive power exact (number exponent)",
    spec: POWER_SPEC,
    response: { kind: "positive_power", base: "x", exp: 3 },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "positive power exact (exponent as numeric string, coerced)",
    spec: POWER_SPEC,
    response: { kind: "positive_power", base: "x", exp: "3" as unknown as number },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "positive power exact (surrounding whitespace on base)",
    spec: POWER_SPEC,
    response: { kind: "positive_power", base: " x ", exp: 3 },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "positive power exact (uppercase base, case-insensitive)",
    spec: POWER_SPEC,
    response: { kind: "positive_power", base: "X", exp: 3 },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "second base grades correct on its own key",
    spec: POWER_SPEC_Y,
    response: { kind: "positive_power", base: "y", exp: 2 },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "second base exact (uppercase, case-insensitive)",
    spec: POWER_SPEC_Y,
    response: { kind: "positive_power", base: "Y", exp: 2 },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "coeff_radical exact (5 sqrt 2)",
    spec: COEFF_RADICAL_SPEC,
    response: { kind: "coeff_radical", coeff: 5, radicand: 2, index: 2 },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "coeff_radical exact (fields as numeric strings, coerced)",
    spec: COEFF_RADICAL_SPEC,
    response: {
      kind: "coeff_radical",
      coeff: "5" as unknown as number,
      radicand: "2" as unknown as number,
      index: "2" as unknown as number,
    },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "coeff_radical exact (cube root, index scored)",
    spec: COEFF_CBRT_SPEC,
    response: { kind: "coeff_radical", coeff: 2, radicand: 3, index: 3 },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "radical_form exact (root x^3 index 4)",
    spec: RADICAL_FORM_SPEC,
    response: { kind: "radical_form", base: "x", exp: 3, index: 4 },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "radical_form exact (whitespace base, string power/index coerced)",
    spec: RADICAL_FORM_SPEC,
    response: {
      kind: "radical_form",
      base: " x ",
      exp: "3" as unknown as number,
      index: "4" as unknown as number,
    },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "radical_form exact (uppercase base with whitespace, case-insensitive)",
    spec: RADICAL_FORM_SPEC,
    response: { kind: "radical_form", base: " X ", exp: 3, index: 4 },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "rational_power exact (x^(3/4))",
    spec: RATIONAL_POWER_SPEC,
    response: { kind: "rational_power", base: "x", num: 3, den: 4 },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "rational_power exact (fields as numeric strings, coerced)",
    spec: RATIONAL_POWER_SPEC,
    response: {
      kind: "rational_power",
      base: "x",
      num: "3" as unknown as number,
      den: "4" as unknown as number,
    },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "rational_power exact (uppercase base, case-insensitive)",
    spec: RATIONAL_POWER_SPEC,
    response: { kind: "rational_power", base: "X", num: 3, den: 4 },
    expected_status: "correct",
    expected_reason: "match",
  },
];

export const EXPR_BUILDER_FALSE_POSITIVE_CASES: readonly ExprBuilderGoldenCase[] = [
  // ---- positive_power ----
  {
    name: "wrong exponent (added wrong / off by one)",
    spec: POWER_SPEC,
    response: { kind: "positive_power", base: "x", exp: 7 },
    expected_status: "incorrect",
    expected_reason: "exponent_mismatch",
  },
  {
    name: "left the exponent negative (form miss the widget must reject)",
    spec: POWER_SPEC,
    response: { kind: "positive_power", base: "x", exp: -3 },
    expected_status: "incorrect",
    expected_reason: "exponent_mismatch",
  },
  {
    name: "wrong base symbol",
    spec: POWER_SPEC,
    response: { kind: "positive_power", base: "y", exp: 3 },
    expected_status: "incorrect",
    expected_reason: "base_mismatch",
  },
  {
    name: "wrong base symbol in the other case (case-folding does not merge letters)",
    spec: POWER_SPEC,
    response: { kind: "positive_power", base: "Y", exp: 3 },
    expected_status: "incorrect",
    expected_reason: "base_mismatch",
  },
  {
    name: "base not filled",
    spec: POWER_SPEC,
    response: { kind: "positive_power", exp: 3 },
    expected_status: "incorrect",
    expected_reason: "base_missing",
  },
  {
    name: "exponent not filled",
    spec: POWER_SPEC,
    response: { kind: "positive_power", base: "x" },
    expected_status: "incorrect",
    expected_reason: "exponent_missing",
  },
  {
    name: "exponent is not an integer value",
    spec: POWER_SPEC,
    response: { kind: "positive_power", base: "x", exp: Number.NaN },
    expected_status: "invalid_input",
    expected_reason: "invalid_exponent",
  },
  {
    name: "base is the wrong type",
    spec: POWER_SPEC,
    response: { kind: "positive_power", base: 5 as unknown as string, exp: 3 },
    expected_status: "invalid_input",
    expected_reason: "invalid_base",
  },
  {
    name: "malformed payload (array, not object)",
    spec: POWER_SPEC,
    response: [] as unknown as ExprBuilderPayload,
    expected_status: "invalid_input",
    expected_reason: "invalid_expr_builder_response",
  },
  // ---- coeff_radical ----
  {
    name: "coeff_radical wrong coefficient (did not pull the whole square out)",
    spec: COEFF_RADICAL_SPEC,
    response: { kind: "coeff_radical", coeff: 1, radicand: 2, index: 2 },
    expected_status: "incorrect",
    expected_reason: "coefficient_mismatch",
  },
  {
    name: "coeff_radical wrong radicand (left a perfect-square factor under the root)",
    spec: COEFF_RADICAL_SPEC,
    response: { kind: "coeff_radical", coeff: 5, radicand: 8, index: 2 },
    expected_status: "incorrect",
    expected_reason: "radicand_mismatch",
  },
  {
    name: "coeff_radical wrong index (square root vs cube root)",
    spec: COEFF_RADICAL_SPEC,
    response: { kind: "coeff_radical", coeff: 5, radicand: 2, index: 3 },
    expected_status: "incorrect",
    expected_reason: "index_mismatch",
  },
  {
    name: "coeff_radical missing coefficient",
    spec: COEFF_RADICAL_SPEC,
    response: { kind: "coeff_radical", radicand: 2, index: 2 },
    expected_status: "incorrect",
    expected_reason: "coefficient_missing",
  },
  {
    name: "coeff_radical missing radicand",
    spec: COEFF_RADICAL_SPEC,
    response: { kind: "coeff_radical", coeff: 5, index: 2 },
    expected_status: "incorrect",
    expected_reason: "radicand_missing",
  },
  {
    name: "coeff_radical missing index",
    spec: COEFF_RADICAL_SPEC,
    response: { kind: "coeff_radical", coeff: 5, radicand: 2 },
    expected_status: "incorrect",
    expected_reason: "index_missing",
  },
  {
    name: "coeff_radical non-integer radicand",
    spec: COEFF_RADICAL_SPEC,
    response: { kind: "coeff_radical", coeff: 5, radicand: 2.5, index: 2 },
    expected_status: "invalid_input",
    expected_reason: "invalid_radicand",
  },
  // ---- radical_form ----
  {
    name: "radical_form wrong power (mixed up which is exponent)",
    spec: RADICAL_FORM_SPEC,
    response: { kind: "radical_form", base: "x", exp: 4, index: 3 },
    expected_status: "incorrect",
    expected_reason: "power_mismatch",
  },
  {
    name: "radical_form wrong index",
    spec: RADICAL_FORM_SPEC,
    response: { kind: "radical_form", base: "x", exp: 3, index: 3 },
    expected_status: "incorrect",
    expected_reason: "index_mismatch",
  },
  {
    name: "radical_form wrong base",
    spec: RADICAL_FORM_SPEC,
    response: { kind: "radical_form", base: "y", exp: 3, index: 4 },
    expected_status: "incorrect",
    expected_reason: "base_mismatch",
  },
  {
    name: "radical_form missing power",
    spec: RADICAL_FORM_SPEC,
    response: { kind: "radical_form", base: "x", index: 4 },
    expected_status: "incorrect",
    expected_reason: "power_missing",
  },
  {
    name: "radical_form missing index",
    spec: RADICAL_FORM_SPEC,
    response: { kind: "radical_form", base: "x", exp: 3 },
    expected_status: "incorrect",
    expected_reason: "index_missing",
  },
  // ---- rational_power ----
  {
    name: "rational_power swapped numerator and denominator",
    spec: RATIONAL_POWER_SPEC,
    response: { kind: "rational_power", base: "x", num: 4, den: 3 },
    expected_status: "incorrect",
    expected_reason: "numerator_mismatch",
  },
  {
    name: "rational_power wrong denominator",
    spec: RATIONAL_POWER_SPEC,
    response: { kind: "rational_power", base: "x", num: 3, den: 2 },
    expected_status: "incorrect",
    expected_reason: "denominator_mismatch",
  },
  {
    name: "rational_power wrong base",
    spec: RATIONAL_POWER_SPEC,
    response: { kind: "rational_power", base: "y", num: 3, den: 4 },
    expected_status: "incorrect",
    expected_reason: "base_mismatch",
  },
  {
    name: "rational_power missing numerator",
    spec: RATIONAL_POWER_SPEC,
    response: { kind: "rational_power", base: "x", den: 4 },
    expected_status: "incorrect",
    expected_reason: "numerator_missing",
  },
  {
    name: "rational_power missing denominator",
    spec: RATIONAL_POWER_SPEC,
    response: { kind: "rational_power", base: "x", num: 3 },
    expected_status: "incorrect",
    expected_reason: "denominator_missing",
  },
  {
    // RIGHT VALUE, wrong form: the honest 1/3 + 1/6 = 3/6 intermediate. Still
    // incorrect, but reason-coded so the learner is told to reduce, not that the
    // numerator is wrong.
    name: "rational_power unreduced equivalent exponent (3/6 for a 1/2 key)",
    spec: RATIONAL_POWER_HALF_SPEC,
    response: { kind: "rational_power", base: "x", num: 3, den: 6 },
    expected_status: "incorrect",
    expected_reason: "exponent_not_reduced",
  },
  {
    name: "rational_power unreduced equivalent exponent (6/8 for a 3/4 key)",
    spec: RATIONAL_POWER_SPEC,
    response: { kind: "rational_power", base: "x", num: 6, den: 8 },
    expected_status: "incorrect",
    expected_reason: "exponent_not_reduced",
  },
  {
    // A genuinely wrong fraction is NOT an unreduced equivalent, so it keeps the
    // plain field-mismatch code.
    name: "rational_power wrong (not merely unreduced) fraction keeps numerator_mismatch",
    spec: RATIONAL_POWER_HALF_SPEC,
    response: { kind: "rational_power", base: "x", num: 2, den: 6 },
    expected_status: "incorrect",
    expected_reason: "numerator_mismatch",
  },
];
