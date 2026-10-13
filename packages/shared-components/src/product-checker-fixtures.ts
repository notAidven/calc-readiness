import type { AnswerDefinition } from "./checker-core";
import type { AnswerSpec, AnswerStatus } from "./index";
import type { ProductItemVersion } from "./product-answer-checker";

/**
 * Phase-2 capability-spike fixtures (Answer_Equivalence_Spec §9, §13). Each item
 * carries a valid form, at least one alternate-valid form, and at least one
 * near-miss-invalid form, per category. The same suite runs in Node and Chromium
 * (`product-answer-checker.browser.test.ts`) to prove cross-runtime parity.
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

export const PRODUCT_SPIKE_ITEMS: readonly ProductItemVersion[] = [
  // --- radicals (RAD.1) ---
  item("spike:rad-1:sqrt:v2", "RAD.1", {
    answer_key: "2*sqrt(2)",
    answer_spec: spec({
      answer_type: "numeric",
      representation: "exact",
      simplification: "simplified_radical",
    }),
  }),
  item("spike:rad-1:cbrt:v2", "RAD.1", {
    answer_key: "2*cbrt(2)",
    answer_spec: spec({
      answer_type: "numeric",
      representation: "exact",
      simplification: "simplified_radical",
    }),
  }),
  // --- numeric precision (§6) ---
  item("spike:num-prec:dp:v2", "RAD.1", {
    answer_key: "1.41",
    answer_spec: spec({
      representation: "decimal",
      precision: { mode: "decimal_places", value: 2, rounding: "half_up" },
    }),
  }),
  item("spike:num-prec:sig:v2", "RAD.1", {
    answer_key: "12000",
    answer_spec: spec({
      precision: { mode: "sig_figs", value: 2, rounding: "half_up" },
    }),
  }),
  // --- solution_set (LIN.1) ---
  item("spike:lin-1:set:v2", "LIN.1", {
    answer_key: "{-2, 2}",
    answer_spec: spec({ answer_type: "solution_set", equivalence: "structural" }),
  }),
  item("spike:lin-1:noSolution:v2", "LIN.1", {
    answer_key: "{}",
    answer_spec: spec({ answer_type: "solution_set", equivalence: "structural" }),
  }),
  // --- interval (LIN.1 inequalities) ---
  item("spike:lin-1:interval:v2", "LIN.1", {
    answer_key: "(-inf, 3)",
    answer_spec: spec({
      answer_type: "interval",
      required_notation: "interval",
      equivalence: "structural",
    }),
  }),
  item("spike:lin-1:union:v2", "LIN.1", {
    answer_key: "(-inf, -1) U (2, inf)",
    answer_spec: spec({
      answer_type: "interval",
      required_notation: "interval",
      equivalence: "structural",
    }),
  }),
  item("spike:lin-1:closed:v2", "LIN.1", {
    answer_key: "[1, 5]",
    answer_spec: spec({
      answer_type: "interval",
      required_notation: "interval",
      equivalence: "structural",
    }),
  }),
  // --- absolute-value equations (LIN.5) + inequalities (LIN.6) ---
  //
  // Both nodes reuse the ALREADY-CLEARED `solution_set` / `interval` / `set_builder`
  // categories above; the bars live only in the prompt, which the checker never parses.
  // These items exist so the absolute-value false-positive battery below has keys with
  // the shapes those nodes actually produce: a two-element solution set, an empty one,
  // a bounded interval, and a union of two rays.
  item("spike:lin-5:twoBranch:v2", "LIN.5", {
    answer_key: "{-2, 8}",
    answer_spec: spec({ answer_type: "solution_set", equivalence: "structural" }),
  }),
  item("spike:lin-5:noSolution:v2", "LIN.5", {
    answer_key: "{}",
    answer_spec: spec({ answer_type: "solution_set", equivalence: "structural" }),
  }),
  item("spike:lin-6:andInterval:v2", "LIN.6", {
    answer_key: "(-2, 8)",
    answer_spec: spec({
      answer_type: "interval",
      required_notation: "interval",
      equivalence: "structural",
    }),
  }),
  item("spike:lin-6:orUnion:v2", "LIN.6", {
    answer_key: "(-inf, -2) U (8, inf)",
    answer_spec: spec({
      answer_type: "interval",
      required_notation: "interval",
      equivalence: "structural",
    }),
  }),
  item("spike:lin-6:setBuilder:v2", "LIN.6", {
    answer_key: "{x | x < -2 or x > 8}",
    answer_spec: spec({
      answer_type: "interval",
      required_notation: "set_builder",
      equivalence: "structural",
    }),
  }),
  // --- point (CG.1) ---
  item("spike:cg-1:point:v2", "CG.1", {
    answer_key: "(3, -2)",
    answer_spec: spec({ answer_type: "point", equivalence: "structural" }),
  }),
  // --- rational_answer (RAT.1) ---
  item("spike:rat-1:rational:v2", "RAT.1", {
    answer_key: "x + 1",
    excluded_values: ["1"],
    allowed_symbols: ["x"],
    answer_spec: spec({ answer_type: "rational_answer", equivalence: "structural" }),
  }),
  /**
   * A rational answer whose value IS a quotient, the shape RAT.2 and RAT.3 produce. Every
   * `rational_answer` fixture above it reduces to a POLYNOMIAL, so the category was only
   * ever exercised on keys with no denominator at all.
   */
  item("spike:rat-3:rational-fraction:v2", "RAT.3", {
    answer_key: "(2*x + 2)/(x^2 + 2*x)",
    excluded_values: ["0", "-2"],
    allowed_symbols: ["x"],
    answer_spec: spec({ answer_type: "rational_answer", equivalence: "structural" }),
  }),
  // --- factoring (POL.2) ---
  item("spike:pol-2:factor:v2", "POL.2", {
    answer_key: "(x + 2)*(x + 3)",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "structural",
      required_form: "fully_factored_over_integers",
    }),
  }),
  item("spike:pol-2:factorConst:v2", "POL.2", {
    answer_key: "2*(x + 2)*(x + 3)",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "structural",
      required_form: "fully_factored_over_integers",
    }),
  }),
  item("spike:pol-2:repeated:v2", "POL.2", {
    answer_key: "(x + 2)^2",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "structural",
      required_form: "fully_factored_over_integers",
    }),
  }),
  // --- standard polynomial form (POL.1) ---
  item("spike:pol-1:standard:v2", "POL.1", {
    answer_key: "x^2 + 5*x + 6",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      required_form: "is_standard_polynomial",
    }),
  }),
  // --- equation form: slope-intercept (LIN.1) ---
  item("spike:lin-1:slope:v2", "LIN.1", {
    answer_key: "y = 2*x + 1",
    allowed_symbols: ["x", "y"],
    answer_spec: spec({
      answer_type: "equation_form",
      equivalence: "structural",
      required_form: "is_slope_intercept",
    }),
  }),
  item("spike:lin-1:slopeConst:v2", "LIN.1", {
    answer_key: "y = 3",
    allowed_symbols: ["x", "y"],
    answer_spec: spec({
      answer_type: "equation_form",
      equivalence: "structural",
      required_form: "is_slope_intercept",
    }),
  }),
  // --- positive exponents (EXP.1) ---
  item("spike:exp-1:pos:v2", "EXP.1", {
    answer_key: "1/x^3",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      simplification: "positive_exponents",
    }),
  }),
  item("spike:exp-1:2var:v2", "EXP.1", {
    answer_key: "x^2/y^3",
    allowed_symbols: ["x", "y"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      simplification: "positive_exponents",
    }),
  }),
  // --- exact special-angle trig values (TRG.2) ---
  item("spike:trg-2:value:v2", "TRG.2", {
    answer_key: "sqrt(3)/2",
    answer_spec: spec({
      answer_type: "numeric",
      representation: "exact",
      simplification: "canonical_exact_trig_value",
    }),
  }),
  item("spike:trg-2:table:v2", "TRG.2", {
    answer_spec: spec({ answer_type: "multipart", equivalence: "none" }),
    parts: [
      {
        part_id: "sin30",
        answer: {
          answer_key: "1/2",
          answer_spec: spec({
            answer_type: "numeric",
            representation: "exact",
            simplification: "canonical_exact_trig_value",
          }),
        },
      },
      {
        part_id: "cos30",
        answer: {
          answer_key: "sqrt(3)/2",
          answer_spec: spec({
            answer_type: "numeric",
            representation: "exact",
            simplification: "canonical_exact_trig_value",
          }),
        },
      },
      {
        part_id: "tan45",
        answer: {
          answer_key: "1",
          answer_spec: spec({
            answer_type: "numeric",
            representation: "exact",
            simplification: "canonical_exact_trig_value",
          }),
        },
      },
    ],
  }),
  // --- exact radian / pi-multiples (TRG.1) ---
  item("spike:trg-1:radian:v2", "TRG.1", {
    answer_key: "pi/3",
    allowed_symbols: ["pi"],
    answer_spec: spec({ answer_type: "numeric", representation: "exact" }),
  }),
  // --- vertex form (POL.5) — a(x-h)^2 + k ---
  item("spike:pol-5:vertex:v2", "POL.5", {
    answer_key: "2*(x - 1)^2 - 3",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "structural",
      required_form: "is_vertex_form",
    }),
  }),
  item("spike:pol-5:vertexDown:v2", "POL.5", {
    answer_key: "-2*(x + 2)^2 + 5",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "structural",
      required_form: "is_vertex_form",
    }),
  }),
  item("spike:pol-5:vertexMonic:v2", "POL.5", {
    answer_key: "(x - 3)^2",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "structural",
      required_form: "is_vertex_form",
    }),
  }),
  // --- set-builder notation: rational-function domain (RAT.5) ---
  item("spike:rat-5:domain:v2", "RAT.5", {
    answer_key: "{x | x != 2}",
    answer_spec: spec({
      answer_type: "interval",
      equivalence: "structural",
      required_notation: "set_builder",
    }),
  }),
  // --- set-builder notation: graph-feature intervals (FUN.4) ---
  item("spike:fun-4:increasing:v2", "FUN.4", {
    answer_key: "{x | x > 1}",
    answer_spec: spec({
      answer_type: "interval",
      equivalence: "structural",
      required_notation: "set_builder",
    }),
  }),
  item("spike:fun-4:interval:v2", "FUN.4", {
    answer_key: "{x | -2 <= x < 5}",
    answer_spec: spec({
      answer_type: "interval",
      equivalence: "structural",
      required_notation: "set_builder",
    }),
  }),
  // --- standard-form linear equation (LIN.1) — Ax + By = C ---
  item("spike:lin-1:standard:v2", "LIN.1", {
    answer_key: "2*x + 3*y = 6",
    allowed_symbols: ["x", "y"],
    answer_spec: spec({
      answer_type: "equation_form",
      equivalence: "structural",
      required_form: "is_standard_form",
    }),
  }),
  // --- log properties: expand (EL.5) ---
  item("spike:el-5:expand:v2", "EL.5", {
    answer_key: "log(x) + log(y)",
    allowed_symbols: ["x", "y"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      required_form: "is_expanded_log",
    }),
  }),
  // --- log properties: condense (EL.5) ---
  item("spike:el-5:condense:v2", "EL.5", {
    answer_key: "log(x^3 * y)",
    allowed_symbols: ["x", "y"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      required_form: "is_condensed_log",
    }),
  }),
  // --- log properties: `ln` token expand (EL.5) ---
  item("spike:el-5:expandLn:v2", "EL.5", {
    answer_key: "ln(x) + ln(y)",
    allowed_symbols: ["x", "y"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      required_form: "is_expanded_log",
    }),
  }),
  // --- exact solution rosters (EL.6, solving exponential and logarithmic equations) ---
  //
  // `representation: "exact"` is what routes these to the widened roster grammar; the
  // rational rosters above declare `"any"` and keep the arithmetic-only path. The keys
  // are the answers EL.6's own equations produce: an equation quadratic in `e^x` has two
  // logarithmic roots, and one quadratic in an exponential can have a radical pair.
  item("spike:el-6:lnRoster:v2", "EL.6", {
    answer_key: "{ln(2), ln(3)}",
    answer_spec: spec({
      answer_type: "solution_set",
      equivalence: "structural",
      representation: "exact",
    }),
  }),
  item("spike:el-6:sqrtRoster:v2", "EL.6", {
    answer_key: "{sqrt(2), -sqrt(2)}",
    answer_spec: spec({
      answer_type: "solution_set",
      equivalence: "structural",
      representation: "exact",
    }),
  }),
  // A COMMON-log key, so the base distinction is pinned from both sides rather than only
  // by rejecting `log` where `ln` was wanted.
  item("spike:el-6:commonLogRoster:v2", "EL.6", {
    answer_key: "{log(100)}",
    answer_spec: spec({
      answer_type: "solution_set",
      equivalence: "structural",
      representation: "exact",
    }),
  }),
  // --- variable radicands + absolute value (RAD.4) ---
  // The defining item of the node: `sqrt(x^2)` is `|x|`, NOT `x`. Declaring
  // `allowed_symbols` is what routes these to the domain-aware sampler.
  item("spike:rad-4:absSquare:v2", "RAD.4", {
    answer_key: "abs(x)",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      simplification: "simplified_radical",
    }),
  }),
  // An ODD root needs no absolute value: `cbrt(x^3)` really is `x`.
  item("spike:rad-4:cbrtCube:v2", "RAD.4", {
    answer_key: "x",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      simplification: "simplified_radical",
    }),
  }),
  // Extracting a variable power: `sqrt(x^5)` -> `x^2*sqrt(x)`.
  item("spike:rad-4:varPower:v2", "RAD.4", {
    answer_key: "x^2*sqrt(x)",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      simplification: "simplified_radical",
    }),
  }),
  // A MIXED radicand: both the integer and the variable part extract.
  item("spike:rad-4:mixed:v2", "RAD.4", {
    answer_key: "2*x^2*sqrt(2*x)",
    allowed_symbols: ["x"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      simplification: "simplified_radical",
    }),
  }),
  // Two symbols, so `sqrt(x)*sqrt(y)` vs `sqrt(x+y)` is probed off the diagonal.
  item("spike:rad-4:product:v2", "RAD.4", {
    answer_key: "sqrt(x)*sqrt(y)",
    allowed_symbols: ["x", "y"],
    answer_spec: spec({
      answer_type: "expression",
      equivalence: "symbolic",
      simplification: "simplified_radical",
    }),
  }),
  // --- shared arithmetic still works under v2 (superset) ---
  item("spike:num-2:v2", "NUM.2", { answer_key: "14", answer_spec: spec({}) }),
  // --- graph: defers to the separate geometric comparator (§8) ---
  item("spike:graph:v2", "CG.1", {
    answer_spec: spec({ answer_type: "graph", equivalence: "structural" }),
  }),
];

export interface ProductGoldenCase {
  name: string;
  item_version_id: string;
  raw_answer: unknown;
  expected_status: AnswerStatus;
  expected_reason: string;
}

export const PRODUCT_GOLDEN_CASES: readonly ProductGoldenCase[] = [
  // radicals
  {
    name: "radical accepts simplified form",
    item_version_id: "spike:rad-1:sqrt:v2",
    raw_answer: "2*sqrt(2)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "radical accepts reordered factor",
    item_version_id: "spike:rad-1:sqrt:v2",
    raw_answer: "sqrt(2)*2",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "radical rejects unsimplified perfect-square factor",
    item_version_id: "spike:rad-1:sqrt:v2",
    raw_answer: "sqrt(8)",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "radical rejects decimal approximation (exact required)",
    item_version_id: "spike:rad-1:sqrt:v2",
    raw_answer: "2.83",
    expected_status: "incorrect",
    expected_reason: "wrong_representation",
  },
  {
    name: "radical catches value mismatch",
    item_version_id: "spike:rad-1:sqrt:v2",
    raw_answer: "3*sqrt(2)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "cube root accepts simplified form",
    item_version_id: "spike:rad-1:cbrt:v2",
    raw_answer: "2*cbrt(2)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "cube root rejects unsimplified perfect-cube factor",
    item_version_id: "spike:rad-1:cbrt:v2",
    raw_answer: "cbrt(16)",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  // precision
  {
    name: "precision accepts value at declared decimal places",
    item_version_id: "spike:num-prec:dp:v2",
    raw_answer: "1.41",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "precision accepts an over-precise value that rounds to the key",
    item_version_id: "spike:num-prec:dp:v2",
    raw_answer: "1.41421",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "precision rejects a value off at the declared precision",
    item_version_id: "spike:num-prec:dp:v2",
    raw_answer: "1.4",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "precision rejects a fraction when decimal representation required",
    item_version_id: "spike:num-prec:dp:v2",
    raw_answer: "141/100",
    expected_status: "incorrect",
    expected_reason: "wrong_representation",
  },
  {
    name: "sig-figs rounds to the declared figures",
    item_version_id: "spike:num-prec:sig:v2",
    raw_answer: "12345",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "sig-figs catches a value off at the declared figures",
    item_version_id: "spike:num-prec:sig:v2",
    raw_answer: "13000",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  // solution_set
  {
    name: "solution set accepts the roster",
    item_version_id: "spike:lin-1:set:v2",
    raw_answer: "{-2, 2}",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "solution set is order-insensitive",
    item_version_id: "spike:lin-1:set:v2",
    raw_answer: "{2, -2}",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "solution set accepts a bare comma list",
    item_version_id: "spike:lin-1:set:v2",
    raw_answer: "-2, 2",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "solution set flags a missing solution",
    item_version_id: "spike:lin-1:set:v2",
    raw_answer: "{2}",
    expected_status: "incorrect",
    expected_reason: "incomplete_solution_set",
  },
  {
    name: "solution set flags an extra solution",
    item_version_id: "spike:lin-1:set:v2",
    raw_answer: "{-2, 2, 0}",
    expected_status: "incorrect",
    expected_reason: "extra_solution",
  },
  {
    name: "solution set catches the wrong values",
    item_version_id: "spike:lin-1:set:v2",
    raw_answer: "{-1, 1}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "empty solution set accepts a no-solution phrase",
    item_version_id: "spike:lin-1:noSolution:v2",
    raw_answer: "no solution",
    expected_status: "correct",
    expected_reason: "match",
  },
  // interval
  {
    name: "interval accepts the ray",
    item_version_id: "spike:lin-1:interval:v2",
    raw_answer: "(-inf, 3)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "interval accepts the spelled-out infinity",
    item_version_id: "spike:lin-1:interval:v2",
    raw_answer: "(-infinity, 3)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "interval catches wrong inclusivity",
    item_version_id: "spike:lin-1:interval:v2",
    raw_answer: "(-inf, 3]",
    expected_status: "incorrect",
    expected_reason: "wrong_bound_inclusivity",
  },
  {
    name: "interval catches the wrong bound",
    item_version_id: "spike:lin-1:interval:v2",
    raw_answer: "(-inf, 5)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "interval union is order-insensitive",
    item_version_id: "spike:lin-1:union:v2",
    raw_answer: "(2, inf) U (-inf, -1)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "closed interval accepts inclusive bounds",
    item_version_id: "spike:lin-1:closed:v2",
    raw_answer: "[1, 5]",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "closed interval rejects open bounds",
    item_version_id: "spike:lin-1:closed:v2",
    raw_answer: "(1, 5)",
    expected_status: "incorrect",
    expected_reason: "wrong_bound_inclusivity",
  },
  // point
  {
    name: "point accepts the ordered pair",
    item_version_id: "spike:cg-1:point:v2",
    raw_answer: "(3, -2)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "point tolerates spacing",
    item_version_id: "spike:cg-1:point:v2",
    raw_answer: "(3,-2)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "point flags swapped coordinates",
    item_version_id: "spike:cg-1:point:v2",
    raw_answer: "(-2, 3)",
    expected_status: "incorrect",
    expected_reason: "coordinates_swapped",
  },
  {
    name: "point catches a wrong coordinate",
    item_version_id: "spike:cg-1:point:v2",
    raw_answer: "(3, 2)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  // rational_answer
  {
    name: "rational answer accepts expression + exclusion",
    item_version_id: "spike:rat-1:rational:v2",
    raw_answer: { expression: "x + 1", excluded_values: ["1"] },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "rational answer accepts reordered expression + string exclusion",
    item_version_id: "spike:rat-1:rational:v2",
    raw_answer: { expression: "1 + x", excluded_values: "1" },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "rational answer flags a dropped exclusion",
    item_version_id: "spike:rat-1:rational:v2",
    raw_answer: { expression: "x + 1", excluded_values: [] },
    expected_status: "incorrect",
    expected_reason: "missing_exclusion",
  },
  {
    name: "rational answer flags an extra exclusion",
    item_version_id: "spike:rat-1:rational:v2",
    raw_answer: { expression: "x + 1", excluded_values: ["1", "2"] },
    expected_status: "incorrect",
    expected_reason: "extra_exclusion",
  },
  {
    name: "rational answer catches a wrong expression",
    item_version_id: "spike:rat-1:rational:v2",
    raw_answer: { expression: "x - 1", excluded_values: ["1"] },
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  /**
   * A key that is itself a fraction. Both of these used to fail: the parse grammar
   * rejected any variable denominator as `unsupported_symbolic_denominator` before
   * comparing, and the zero test read the PRINTED rationalized difference, which for
   * fractions is `0 / (x^4 + ...)` rather than `0`.
   */
  {
    name: "rational answer accepts a fraction key",
    item_version_id: "spike:rat-3:rational-fraction:v2",
    raw_answer: { expression: "(2*x + 2)/(x^2 + 2*x)", excluded_values: ["0", "-2"] },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "rational answer accepts an equivalent factored denominator",
    item_version_id: "spike:rat-3:rational-fraction:v2",
    raw_answer: { expression: "(2*x + 2)/(x*(x + 2))", excluded_values: ["-2", "0"] },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "rational answer still catches a wrong fraction",
    item_version_id: "spike:rat-3:rational-fraction:v2",
    raw_answer: { expression: "(2*x + 1)/(x^2 + 2*x)", excluded_values: ["0", "-2"] },
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "rational answer flags a dropped exclusion on a fraction key",
    item_version_id: "spike:rat-3:rational-fraction:v2",
    raw_answer: { expression: "(2*x + 2)/(x^2 + 2*x)", excluded_values: ["0"] },
    expected_status: "incorrect",
    expected_reason: "missing_exclusion",
  },
  // factoring
  {
    name: "factoring accepts the fully factored form",
    item_version_id: "spike:pol-2:factor:v2",
    raw_answer: "(x + 2)*(x + 3)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "factoring is order-insensitive",
    item_version_id: "spike:pol-2:factor:v2",
    raw_answer: "(x + 3)*(x + 2)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "factoring rejects the unfactored polynomial",
    item_version_id: "spike:pol-2:factor:v2",
    raw_answer: "x^2 + 5*x + 6",
    expected_status: "incorrect",
    expected_reason: "reducible_factor",
  },
  {
    name: "factoring catches a product that expands wrong",
    item_version_id: "spike:pol-2:factor:v2",
    raw_answer: "(x + 1)*(x + 3)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "factoring accepts a combined leading constant",
    item_version_id: "spike:pol-2:factorConst:v2",
    raw_answer: "2*(x + 2)*(x + 3)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "factoring rejects a non-primitive factor",
    item_version_id: "spike:pol-2:factorConst:v2",
    raw_answer: "(2*x + 4)*(x + 3)",
    expected_status: "incorrect",
    expected_reason: "not_primitive",
  },
  {
    name: "factoring accepts a repeated factor as a power",
    item_version_id: "spike:pol-2:repeated:v2",
    raw_answer: "(x + 2)^2",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "factoring accepts a repeated factor written out",
    item_version_id: "spike:pol-2:repeated:v2",
    raw_answer: "(x + 2)*(x + 2)",
    expected_status: "correct",
    expected_reason: "match",
  },
  // standard polynomial
  {
    name: "standard form accepts the combined descending polynomial",
    item_version_id: "spike:pol-1:standard:v2",
    raw_answer: "x^2 + 5*x + 6",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "standard form rejects an unexpanded product",
    item_version_id: "spike:pol-1:standard:v2",
    raw_answer: "(x + 2)*(x + 3)",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "standard form rejects ascending degree order",
    item_version_id: "spike:pol-1:standard:v2",
    raw_answer: "6 + 5*x + x^2",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "standard form rejects uncombined like terms",
    item_version_id: "spike:pol-1:standard:v2",
    raw_answer: "x^2 + 2*x + 3*x + 6",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  // equation form
  {
    name: "slope-intercept accepts the target line",
    item_version_id: "spike:lin-1:slope:v2",
    raw_answer: "y = 2*x + 1",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "slope-intercept accepts implicit multiplication + reordering",
    item_version_id: "spike:lin-1:slope:v2",
    raw_answer: "y = 1 + 2x",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "slope-intercept requires y isolated on the left",
    item_version_id: "spike:lin-1:slope:v2",
    raw_answer: "2*x - y = -1",
    expected_status: "incorrect",
    expected_reason: "wrong_form",
  },
  {
    name: "slope-intercept catches the wrong slope",
    item_version_id: "spike:lin-1:slope:v2",
    raw_answer: "y = 3*x + 1",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "slope-intercept rejects an unsimplified zero coefficient",
    item_version_id: "spike:lin-1:slopeConst:v2",
    raw_answer: "y = 0*x + 3",
    expected_status: "incorrect",
    expected_reason: "wrong_form",
  },
  {
    name: "slope-intercept accepts the simplified constant line",
    item_version_id: "spike:lin-1:slopeConst:v2",
    raw_answer: "y = 3",
    expected_status: "correct",
    expected_reason: "match",
  },
  // positive exponents (EXP.1)
  {
    name: "positive exponents accepts the simplified form",
    item_version_id: "spike:exp-1:pos:v2",
    raw_answer: "1/x^3",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "positive exponents accepts a factored-out denominator",
    item_version_id: "spike:exp-1:pos:v2",
    raw_answer: "1/(x*x*x)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "positive exponents rejects a negative exponent (correct value, wrong form)",
    item_version_id: "spike:exp-1:pos:v2",
    raw_answer: "x^-3",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "positive exponents catches a value mismatch",
    item_version_id: "spike:exp-1:pos:v2",
    raw_answer: "x^3",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "positive exponents (two vars) accepts the simplified quotient",
    item_version_id: "spike:exp-1:2var:v2",
    raw_answer: "x^2/y^3",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "positive exponents (two vars) rejects a negative exponent",
    item_version_id: "spike:exp-1:2var:v2",
    raw_answer: "x^2*y^-3",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "positive exponents (two vars) catches a value mismatch",
    item_version_id: "spike:exp-1:2var:v2",
    raw_answer: "x^2/y^2",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  // exact special-angle trig values (TRG.2)
  {
    name: "exact trig value accepts the simplified radical",
    item_version_id: "spike:trg-2:value:v2",
    raw_answer: "sqrt(3)/2",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "exact trig value accepts an equivalent nth-root form",
    item_version_id: "spike:trg-2:value:v2",
    raw_answer: "nthRoot(3, 2)/2",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "exact trig value rejects a decimal approximation",
    item_version_id: "spike:trg-2:value:v2",
    raw_answer: "0.87",
    expected_status: "incorrect",
    expected_reason: "wrong_representation",
  },
  {
    name: "exact trig value rejects an unsimplified radical",
    item_version_id: "spike:trg-2:value:v2",
    raw_answer: "sqrt(12)/4",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "exact trig value catches a value mismatch",
    item_version_id: "spike:trg-2:value:v2",
    raw_answer: "sqrt(3)/4",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "exact trig table accepts all exact values",
    item_version_id: "spike:trg-2:table:v2",
    raw_answer: { sin30: "1/2", cos30: "sqrt(3)/2", tan45: "1" },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "exact trig table rejects a decimal part (part-prefixed reason)",
    item_version_id: "spike:trg-2:table:v2",
    raw_answer: { sin30: "0.5", cos30: "sqrt(3)/2", tan45: "1" },
    expected_status: "incorrect",
    expected_reason: "sin30:wrong_representation",
  },
  {
    name: "exact trig table catches a wrong part value (part-prefixed reason)",
    item_version_id: "spike:trg-2:table:v2",
    raw_answer: { sin30: "1/2", cos30: "sqrt(3)/2", tan45: "2" },
    expected_status: "incorrect",
    expected_reason: "tan45:value_mismatch",
  },
  // exact radian / pi-multiples (TRG.1)
  {
    name: "exact radian accepts the pi multiple",
    item_version_id: "spike:trg-1:radian:v2",
    raw_answer: "pi/3",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "exact radian accepts an unreduced pi multiple",
    item_version_id: "spike:trg-1:radian:v2",
    raw_answer: "2*pi/6",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "exact radian rejects a decimal approximation",
    item_version_id: "spike:trg-1:radian:v2",
    raw_answer: "1.05",
    expected_status: "incorrect",
    expected_reason: "wrong_representation",
  },
  {
    name: "exact radian catches degrees given instead of radians",
    item_version_id: "spike:trg-1:radian:v2",
    raw_answer: "60",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "exact radian catches a wrong multiple",
    item_version_id: "spike:trg-1:radian:v2",
    raw_answer: "pi/6",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  // vertex form (POL.5)
  {
    name: "vertex form accepts the a(x-h)^2+k form",
    item_version_id: "spike:pol-5:vertex:v2",
    raw_answer: "2*(x - 1)^2 - 3",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "vertex form accepts the constant term written first",
    item_version_id: "spike:pol-5:vertex:v2",
    raw_answer: "-3 + 2*(x - 1)^2",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "vertex form rejects the expanded standard form (value-equal, wrong form)",
    item_version_id: "spike:pol-5:vertex:v2",
    raw_answer: "2*x^2 - 4*x - 1",
    expected_status: "incorrect",
    expected_reason: "not_vertex_form",
  },
  {
    name: "vertex form catches a wrong vertex (value mismatch)",
    item_version_id: "spike:pol-5:vertex:v2",
    raw_answer: "2*(x - 1)^2 + 3",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "downward vertex form accepts a bare leading minus (rationalize would throw)",
    item_version_id: "spike:pol-5:vertexDown:v2",
    raw_answer: "5 - 2*(x + 2)^2",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "downward vertex form rejects the expanded standard form",
    item_version_id: "spike:pol-5:vertexDown:v2",
    raw_answer: "-2*x^2 - 8*x - 3",
    expected_status: "incorrect",
    expected_reason: "not_vertex_form",
  },
  {
    name: "monic vertex form accepts (x-h)^2",
    item_version_id: "spike:pol-5:vertexMonic:v2",
    raw_answer: "(x - 3)^2",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "monic vertex form rejects the expanded trinomial",
    item_version_id: "spike:pol-5:vertexMonic:v2",
    raw_answer: "x^2 - 6*x + 9",
    expected_status: "incorrect",
    expected_reason: "not_vertex_form",
  },
  // set-builder domain (RAT.5)
  {
    name: "set-builder accepts the excluded-value domain",
    item_version_id: "spike:rat-5:domain:v2",
    raw_answer: "{x | x != 2}",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "set-builder accepts the unicode not-equal glyph and colon",
    item_version_id: "spike:rat-5:domain:v2",
    raw_answer: "{ x : x ≠ 2 }",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "set-builder rejects interval notation when set-builder is required",
    item_version_id: "spike:rat-5:domain:v2",
    raw_answer: "(-inf, 2) U (2, inf)",
    expected_status: "incorrect",
    expected_reason: "wrong_notation",
  },
  {
    name: "set-builder catches the wrong excluded value",
    item_version_id: "spike:rat-5:domain:v2",
    raw_answer: "{x | x != 3}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  // set-builder feature intervals (FUN.4)
  {
    name: "set-builder accepts the increasing ray",
    item_version_id: "spike:fun-4:increasing:v2",
    raw_answer: "{x | x > 1}",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "set-builder accepts the variable on the right",
    item_version_id: "spike:fun-4:increasing:v2",
    raw_answer: "{x | 1 < x}",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "set-builder flags wrong inclusivity on the ray",
    item_version_id: "spike:fun-4:increasing:v2",
    raw_answer: "{x | x >= 1}",
    expected_status: "incorrect",
    expected_reason: "wrong_bound_inclusivity",
  },
  {
    name: "set-builder catches the wrong endpoint",
    item_version_id: "spike:fun-4:increasing:v2",
    raw_answer: "{x | x > 2}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "set-builder accepts the double-bounded interval",
    item_version_id: "spike:fun-4:interval:v2",
    raw_answer: "{x | -2 <= x < 5}",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "set-builder accepts unicode <= in the double bound",
    item_version_id: "spike:fun-4:interval:v2",
    raw_answer: "{x | -2 ≤ x < 5}",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "set-builder flags wrong inclusivity in the double bound",
    item_version_id: "spike:fun-4:interval:v2",
    raw_answer: "{x | -2 < x < 5}",
    expected_status: "incorrect",
    expected_reason: "wrong_bound_inclusivity",
  },
  // standard-form linear equation (LIN.1)
  {
    name: "standard form accepts Ax + By = C",
    item_version_id: "spike:lin-1:standard:v2",
    raw_answer: "2*x + 3*y = 6",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "standard form accepts implicit multiplication",
    item_version_id: "spike:lin-1:standard:v2",
    raw_answer: "2x + 3y = 6",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "standard form rejects slope-intercept form (variable on the right)",
    item_version_id: "spike:lin-1:standard:v2",
    raw_answer: "y = -2/3*x + 2",
    expected_status: "incorrect",
    expected_reason: "wrong_form",
  },
  {
    name: "standard form rejects a negative leading coefficient",
    item_version_id: "spike:lin-1:standard:v2",
    raw_answer: "-2*x - 3*y = -6",
    expected_status: "incorrect",
    expected_reason: "wrong_form",
  },
  {
    name: "standard form rejects a non-primitive (scaled) equation",
    item_version_id: "spike:lin-1:standard:v2",
    raw_answer: "4*x + 6*y = 12",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "standard form catches a parallel (different) line",
    item_version_id: "spike:lin-1:standard:v2",
    raw_answer: "2*x + 3*y = 12",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  // log properties: expand (EL.5)
  {
    name: "log expand accepts the product rule",
    item_version_id: "spike:el-5:expand:v2",
    raw_answer: "log(x) + log(y)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "log expand is order-insensitive",
    item_version_id: "spike:el-5:expand:v2",
    raw_answer: "log(y) + log(x)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "log expand rejects the still-condensed form (value-equal, wrong form)",
    item_version_id: "spike:el-5:expand:v2",
    raw_answer: "log(x*y)",
    expected_status: "incorrect",
    expected_reason: "not_expanded",
  },
  {
    name: "log expand catches a value mismatch (quotient not product)",
    item_version_id: "spike:el-5:expand:v2",
    raw_answer: "log(x) - log(y)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  // log properties: condense (EL.5)
  {
    name: "log condense accepts the single combined logarithm",
    item_version_id: "spike:el-5:condense:v2",
    raw_answer: "log(x^3 * y)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "log condense accepts a reordered argument",
    item_version_id: "spike:el-5:condense:v2",
    raw_answer: "log(y * x^3)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "log condense rejects the expanded form (value-equal, wrong form)",
    item_version_id: "spike:el-5:condense:v2",
    raw_answer: "3*log(x) + log(y)",
    expected_status: "incorrect",
    expected_reason: "not_condensed",
  },
  {
    name: "log condense catches a value mismatch",
    item_version_id: "spike:el-5:condense:v2",
    raw_answer: "log(x^2 * y)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "log expand accepts the ln token",
    item_version_id: "spike:el-5:expandLn:v2",
    raw_answer: "ln(x) + ln(y)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "log expand (ln) rejects the condensed form",
    item_version_id: "spike:el-5:expandLn:v2",
    raw_answer: "ln(x*y)",
    expected_status: "incorrect",
    expected_reason: "not_expanded",
  },
  // exact solution rosters (EL.6)
  {
    name: "exact roster accepts two logarithmic roots",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{ln(2), ln(3)}",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "exact roster is order-insensitive",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{ln(3), ln(2)}",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    // Was pinned CORRECT, which is the same claim as the LIN.5 shape swap and wrong for the
    // same reason: `[ln(2), ln(3)]` is the closed interval between those two numbers, not the
    // pair of them. The tolerance was a side effect of the roster parser stripping `[` and `]`
    // alongside the braces, and no placeholder in the tree ever advertised it — EL.6's reads
    // `Every solution: 13 or {-1, 4}`. A roster is bare or braced on every node.
    name: "exact roster refuses an interval bracket, as every roster does",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "[ln(2), ln(3)]",
    expected_status: "invalid_input",
    expected_reason: "parse_error",
  },
  {
    name: "exact roster tolerates padding around its members",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{  ln(2) ,  ln(3)  }",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "exact roster flags one root of two as incomplete",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{ln(2)}",
    expected_status: "incorrect",
    expected_reason: "incomplete_solution_set",
  },
  {
    name: "exact roster flags an invented third root",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{ln(2), ln(3), ln(4)}",
    expected_status: "incorrect",
    expected_reason: "extra_solution",
  },
  {
    name: "exact roster calls a rounded root a REPRESENTATION miss, not a value miss",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{0.693, 1.099}",
    expected_status: "incorrect",
    expected_reason: "wrong_representation",
  },
  {
    name: "exact roster rejects the common log where the natural log was solved for",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{log(2), log(3)}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "exact roster rejects stopping at the substitution's values",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{2, 3}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "exact roster admits a radical pair, in either order",
    item_version_id: "spike:el-6:sqrtRoster:v2",
    raw_answer: "{-sqrt(2), sqrt(2)}",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "exact roster flags dropping the negative radical root",
    item_version_id: "spike:el-6:sqrtRoster:v2",
    raw_answer: "{sqrt(2)}",
    expected_status: "incorrect",
    expected_reason: "incomplete_solution_set",
  },
  {
    name: "exact roster accepts an evaluated common log written as its integer",
    item_version_id: "spike:el-6:commonLogRoster:v2",
    raw_answer: "{2}",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "exact roster rejects the natural log where the common log was asked",
    item_version_id: "spike:el-6:commonLogRoster:v2",
    raw_answer: "{ln(100)}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "exact roster fails CLOSED on a free variable rather than guessing",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{x}",
    expected_status: "invalid_input",
    expected_reason: "unknown_symbol",
  },
  // variable radicands + absolute value (RAD.4)
  {
    name: "variable radical accepts abs(x) for sqrt(x^2)",
    item_version_id: "spike:rad-4:absSquare:v2",
    raw_answer: "abs(x)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "variable radical accepts pipe notation |x|",
    item_version_id: "spike:rad-4:absSquare:v2",
    raw_answer: "|x|",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "variable radical REJECTS plain x for an even-root key (the whole point)",
    item_version_id: "spike:rad-4:absSquare:v2",
    raw_answer: "x",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "variable radical grades sqrt(x^2) as unsimplified, not correct",
    item_version_id: "spike:rad-4:absSquare:v2",
    raw_answer: "sqrt(x^2)",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "odd root needs no absolute value: x is accepted for cbrt(x^3)",
    item_version_id: "spike:rad-4:cbrtCube:v2",
    raw_answer: "x",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "odd root REJECTS abs(x): cbrt(x^3) is x, not |x|",
    item_version_id: "spike:rad-4:cbrtCube:v2",
    raw_answer: "abs(x)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "variable radical accepts the extracted power form",
    item_version_id: "spike:rad-4:varPower:v2",
    raw_answer: "x^2*sqrt(x)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "variable radical rejects the unextracted sqrt(x^5) as unsimplified",
    item_version_id: "spike:rad-4:varPower:v2",
    raw_answer: "sqrt(x^5)",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "variable radical catches the off-by-one exponent x^3",
    item_version_id: "spike:rad-4:varPower:v2",
    raw_answer: "x^3",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "mixed radicand accepts the fully extracted form",
    item_version_id: "spike:rad-4:mixed:v2",
    raw_answer: "2*x^2*sqrt(2*x)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "mixed radicand rejects the unextracted sqrt(8*x^5)",
    item_version_id: "spike:rad-4:mixed:v2",
    raw_answer: "sqrt(8*x^5)",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "two-symbol radical is order-insensitive",
    item_version_id: "spike:rad-4:product:v2",
    raw_answer: "sqrt(y)*sqrt(x)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "two-symbol radical rejects sqrt(x+y) (a different function)",
    item_version_id: "spike:rad-4:product:v2",
    raw_answer: "sqrt(x+y)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  // superset: shared arithmetic still graded
  {
    name: "v2 still grades plain arithmetic",
    item_version_id: "spike:num-2:v2",
    raw_answer: "14",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "graph answers defer to the geometric comparator (not text-scored)",
    item_version_id: "spike:graph:v2",
    raw_answer: "{}",
    expected_status: "unsupported_expression",
    expected_reason: "graph_uses_geometric_comparator",
  },
];

/**
 * The VARIABLE-RADICAL false-positive battery (Answer_Equivalence_Spec §4, §13.6),
 * modelled on the graph comparator's tolerance battery. Numeric sampling is the
 * one part of the checker that decides equality by EVIDENCE rather than by proof,
 * so it is the one part that can silently accept a wrong answer. Every case here
 * is a plausible near-miss a real student would write — a sign error, an
 * off-by-one exponent, a wrong coefficient, a wrong index, a dropped factor, a
 * missing or spurious absolute value, or a distributed-over-the-wrong-operation
 * radical — and every one of them must be REJECTED.
 *
 * A single silent `correct` in this list means the probe battery is too weak.
 */
export const VARIABLE_RADICAL_FALSE_POSITIVE_CASES: readonly ProductGoldenCase[] = [
  // --- key `abs(x)`: the missing / wrong absolute value ---
  {
    name: "x is not abs(x) (the defining RAD.4 error)",
    item_version_id: "spike:rad-4:absSquare:v2",
    raw_answer: "x",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "-x is not abs(x)",
    item_version_id: "spike:rad-4:absSquare:v2",
    raw_answer: "-x",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "-abs(x) is a sign error, not a match",
    item_version_id: "spike:rad-4:absSquare:v2",
    raw_answer: "-abs(x)",
    expected_status: "incorrect",
    expected_reason: "sign_error",
  },
  {
    name: "abs(x) + 1 is off by a constant",
    item_version_id: "spike:rad-4:absSquare:v2",
    raw_answer: "abs(x) + 1",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "2*abs(x) has the wrong coefficient",
    item_version_id: "spike:rad-4:absSquare:v2",
    raw_answer: "2*abs(x)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "abs(x^2) is not abs(x)",
    item_version_id: "spike:rad-4:absSquare:v2",
    raw_answer: "abs(x^2)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "sqrt(x) is not abs(x) (undefined where abs(x) is defined)",
    item_version_id: "spike:rad-4:absSquare:v2",
    raw_answer: "sqrt(x)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  // --- key `x` (odd root): a spurious absolute value ---
  {
    name: "abs(x) is NOT cbrt(x^3) (an absolute value where none belongs)",
    item_version_id: "spike:rad-4:cbrtCube:v2",
    raw_answer: "abs(x)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "cbrt(x) is not x",
    item_version_id: "spike:rad-4:cbrtCube:v2",
    raw_answer: "cbrt(x)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  // --- key `x^2*sqrt(x)`: exponent / index / coefficient near-misses ---
  {
    name: "x^3 is the off-by-one-half exponent error",
    item_version_id: "spike:rad-4:varPower:v2",
    raw_answer: "x^3",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "x*sqrt(x) extracted one power too few",
    item_version_id: "spike:rad-4:varPower:v2",
    raw_answer: "x*sqrt(x)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "x^2*sqrt(x^2) left the wrong radicand behind",
    item_version_id: "spike:rad-4:varPower:v2",
    raw_answer: "x^2*sqrt(x^2)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "2*x^2*sqrt(x) invented a coefficient",
    item_version_id: "spike:rad-4:varPower:v2",
    raw_answer: "2*x^2*sqrt(x)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "x^2*cbrt(x) used the wrong index",
    item_version_id: "spike:rad-4:varPower:v2",
    raw_answer: "x^2*cbrt(x)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "-x^2*sqrt(x) is a sign error",
    item_version_id: "spike:rad-4:varPower:v2",
    raw_answer: "-x^2*sqrt(x)",
    expected_status: "incorrect",
    expected_reason: "sign_error",
  },
  {
    name: "x^2 + sqrt(x) added where it should have multiplied",
    item_version_id: "spike:rad-4:varPower:v2",
    raw_answer: "x^2 + sqrt(x)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  // --- key `2*x^2*sqrt(2*x)`: the MIXED radicand near-misses ---
  {
    name: "2*x^2*sqrt(x) dropped the 2 still inside the radical",
    item_version_id: "spike:rad-4:mixed:v2",
    raw_answer: "2*x^2*sqrt(x)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "4*x^2*sqrt(2*x) squared the extracted coefficient",
    item_version_id: "spike:rad-4:mixed:v2",
    raw_answer: "4*x^2*sqrt(2*x)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "2*x^3*sqrt(2*x) extracted one power too many",
    item_version_id: "spike:rad-4:mixed:v2",
    raw_answer: "2*x^3*sqrt(2*x)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  // --- key `sqrt(x)*sqrt(y)`: distributing a radical over the wrong operation ---
  {
    name: "sqrt(x+y) is not sqrt(x)*sqrt(y) (the classic radical-of-a-sum error)",
    item_version_id: "spike:rad-4:product:v2",
    raw_answer: "sqrt(x+y)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "sqrt(x)+sqrt(y) added where it should have multiplied",
    item_version_id: "spike:rad-4:product:v2",
    raw_answer: "sqrt(x)+sqrt(y)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "sqrt(x*y) has a strictly LARGER real domain, so it is a different function",
    item_version_id: "spike:rad-4:product:v2",
    raw_answer: "sqrt(x*y)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  // --- pipe notation: ambiguous readings are refused, never guessed ---
  {
    name: "|a|b| is unbalanced, not silently re-paired",
    item_version_id: "spike:rad-4:absSquare:v2",
    raw_answer: "|a|b|",
    expected_status: "invalid_input",
    expected_reason: "unbalanced_pipes",
  },
  {
    name: "|x||y| is ambiguous (implicit multiplication between two pairs)",
    item_version_id: "spike:rad-4:product:v2",
    raw_answer: "|x||y|",
    expected_status: "invalid_input",
    expected_reason: "ambiguous_pipe_notation",
  },
  {
    name: "|x|y|z| is ambiguous (nested vs sequential cannot be decided)",
    item_version_id: "spike:rad-4:product:v2",
    raw_answer: "|x|y|z|",
    expected_status: "invalid_input",
    expected_reason: "ambiguous_pipe_notation",
  },
  {
    name: "an empty pipe pair is rejected",
    item_version_id: "spike:rad-4:absSquare:v2",
    raw_answer: "||",
    expected_status: "invalid_input",
    expected_reason: "ambiguous_pipe_notation",
  },
  {
    name: "a nested pipe intent |x + |y|| is refused rather than guessed",
    item_version_id: "spike:rad-4:product:v2",
    raw_answer: "|x + |y||",
    expected_status: "invalid_input",
    expected_reason: "ambiguous_pipe_notation",
  },
];

/**
 * The ABSOLUTE-VALUE ANSWER-SHAPE false-positive battery (LIN.5 / LIN.6).
 *
 * §13.16 only OBLIGES a battery where equality is decided by sampling, and these two
 * nodes are not that: a `solution_set` is compared as an exact rational roster and an
 * `interval` as exact endpoints plus inclusivity flags, both proofs rather than
 * evidence. This battery is therefore voluntary, and it guards a different risk than
 * the variable-radical one above. The danger for an absolute-value item is not that a
 * probe battery is too thin; it is that the two shapes the node exists to distinguish
 * are NEIGHBOURS. `|x-3| < 5` and `|x-3| > 5` are solved by identical arithmetic and
 * differ only in whether the result is one interval or the union of its complement's
 * two rays, and an absolute-value EQUATION differs from a linear one only by having a
 * second branch. So every case below is one of those neighbours, submitted against the
 * other's key, plus the partial-credit shapes (one branch solved, one ray dropped) that
 * must read as INCOMPLETE rather than as correct.
 *
 * Two properties are asserted, not just "not correct": the AND/OR confusion must be a
 * value miss, and a right set with the wrong brackets must be an inclusivity miss, so
 * the item's misconception tags can tell a form slip from a solving error.
 */
export const ABSOLUTE_VALUE_FALSE_POSITIVE_CASES: readonly ProductGoldenCase[] = [
  // --- LIN.5, key `{-2, 8}`: the second branch is the whole skill ---
  {
    name: "only the positive branch is INCOMPLETE, never correct",
    item_version_id: "spike:lin-5:twoBranch:v2",
    raw_answer: "{8}",
    expected_status: "incorrect",
    expected_reason: "incomplete_solution_set",
  },
  {
    name: "only the negative branch is INCOMPLETE, never correct",
    item_version_id: "spike:lin-5:twoBranch:v2",
    raw_answer: "{-2}",
    expected_status: "incorrect",
    expected_reason: "incomplete_solution_set",
  },
  {
    name: "negating both roots instead of the inner expression is a value miss",
    item_version_id: "spike:lin-5:twoBranch:v2",
    raw_answer: "{-8, 2}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "the right count of roots with one wrong sign is a value miss",
    item_version_id: "spike:lin-5:twoBranch:v2",
    raw_answer: "{2, 8}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "adding the right-hand side as a third root is an extra solution",
    item_version_id: "spike:lin-5:twoBranch:v2",
    raw_answer: "{-2, 8, 5}",
    expected_status: "incorrect",
    expected_reason: "extra_solution",
  },
  {
    name: "the boundary of the bars is not a solution set",
    item_version_id: "spike:lin-5:twoBranch:v2",
    raw_answer: "{3}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "an empty set is not a two-root solution set",
    item_version_id: "spike:lin-5:twoBranch:v2",
    raw_answer: "no solution",
    expected_status: "incorrect",
    expected_reason: "incomplete_solution_set",
  },
  {
    name: "an INTERVAL is not a solution set (the LIN.5 / LIN.6 shape swap)",
    item_version_id: "spike:lin-5:twoBranch:v2",
    raw_answer: "(-2, 8)",
    expected_status: "invalid_input",
    expected_reason: "parse_error",
  },
  // --- LIN.5, key `{}`: an absolute value is never negative ---
  {
    name: "solving an impossible equation anyway is an extra solution",
    item_version_id: "spike:lin-5:noSolution:v2",
    raw_answer: "{-6, -2}",
    expected_status: "incorrect",
    expected_reason: "extra_solution",
  },
  {
    name: "reading |x| = -c as |x| = c is an extra solution",
    item_version_id: "spike:lin-5:noSolution:v2",
    raw_answer: "{-2}",
    expected_status: "incorrect",
    expected_reason: "extra_solution",
  },
  {
    name: "zero is not a member of the empty set",
    item_version_id: "spike:lin-5:noSolution:v2",
    raw_answer: "{0}",
    expected_status: "incorrect",
    expected_reason: "extra_solution",
  },
  // --- LIN.6, key `(-2, 8)`: the AND case ---
  {
    name: "the OR union is not the AND interval (the defining LIN.6 confusion)",
    item_version_id: "spike:lin-6:andInterval:v2",
    raw_answer: "(-inf, -2) U (8, inf)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "a strict bound written inclusive is an inclusivity miss, not a value miss",
    item_version_id: "spike:lin-6:andInterval:v2",
    raw_answer: "[-2, 8]",
    expected_status: "incorrect",
    expected_reason: "wrong_bound_inclusivity",
  },
  {
    name: "one end inclusive is still an inclusivity miss",
    item_version_id: "spike:lin-6:andInterval:v2",
    raw_answer: "(-2, 8]",
    expected_status: "incorrect",
    expected_reason: "wrong_bound_inclusivity",
  },
  {
    name: "mirroring the interval about zero is a value miss",
    item_version_id: "spike:lin-6:andInterval:v2",
    raw_answer: "(-8, 2)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "forgetting to shift the lower branch is a value miss",
    item_version_id: "spike:lin-6:andInterval:v2",
    raw_answer: "(2, 8)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "the whole line is not a bounded interval",
    item_version_id: "spike:lin-6:andInterval:v2",
    raw_answer: "(-inf, inf)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "a SOLUTION SET is not an interval (the shape swap, other direction)",
    item_version_id: "spike:lin-6:andInterval:v2",
    raw_answer: "{-2, 8}",
    expected_status: "invalid_input",
    expected_reason: "wrong_notation",
  },
  // --- LIN.6, key `(-inf, -2) U (8, inf)`: the OR case ---
  {
    name: "the AND interval is not the OR union (the defining LIN.6 confusion)",
    item_version_id: "spike:lin-6:orUnion:v2",
    raw_answer: "(-2, 8)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "solving only the upper branch drops a ray",
    item_version_id: "spike:lin-6:orUnion:v2",
    raw_answer: "(8, inf)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "solving only the lower branch drops a ray",
    item_version_id: "spike:lin-6:orUnion:v2",
    raw_answer: "(-inf, -2)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "rays pointed inward cover the line instead of its ends",
    item_version_id: "spike:lin-6:orUnion:v2",
    raw_answer: "(-inf, 8) U (-2, inf)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "strict ray bounds written inclusive are an inclusivity miss",
    item_version_id: "spike:lin-6:orUnion:v2",
    raw_answer: "(-inf, -2] U [8, inf)",
    expected_status: "incorrect",
    expected_reason: "wrong_bound_inclusivity",
  },
  {
    name: "swapping the two ray endpoints is a value miss",
    item_version_id: "spike:lin-6:orUnion:v2",
    raw_answer: "(-inf, -8) U (2, inf)",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "a closed bound ON an infinity is refused, never coerced to the open form",
    item_version_id: "spike:lin-6:orUnion:v2",
    raw_answer: "[-inf, -2] U [8, inf]",
    expected_status: "invalid_input",
    expected_reason: "wrong_notation",
  },
  // --- LIN.6, key `{x | x < -2 or x > 8}`: the notation IS the skill ---
  {
    name: "an equivalent interval union is a NOTATION miss, not correct",
    item_version_id: "spike:lin-6:setBuilder:v2",
    raw_answer: "(-inf, -2) U (8, inf)",
    expected_status: "incorrect",
    expected_reason: "wrong_notation",
  },
  {
    name: "the AND/OR confusion inside set-builder braces is a value miss",
    item_version_id: "spike:lin-6:setBuilder:v2",
    raw_answer: "{x | -2 < x < 8}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "an and-joined condition that cannot hold is not the or-joined set",
    item_version_id: "spike:lin-6:setBuilder:v2",
    raw_answer: "{x | x < -2 and x > 8}",
    expected_status: "incorrect",
    expected_reason: "wrong_notation",
  },
];

/**
 * The EXACT-ROSTER false-positive battery (EL.6).
 *
 * Like the absolute-value battery above, this is voluntary under §13.16: an exact roster
 * is compared as exact values, not by sampling. It guards the specific way this category
 * could accept a wrong answer, which is that the widened grammar makes two DIFFERENT
 * numbers spellable in confusable ways:
 *
 *  - `log 2` and `ln 2` differ only by a token, and grading them alike is a live risk
 *    because the checker's OTHER logarithm path (`LOG_SCOPE`, EL.5) binds them alike on
 *    purpose. Both directions are here: `log` where `ln` was solved for, and `ln` where
 *    `log` was.
 *  - A decimal approximation is arithmetically almost the root, and the whole point of
 *    an exact answer is that "almost" is not the skill.
 *  - The intermediate value from the substitution (`u = 2`, `u = 3`) is one step short of
 *    the root (`x = ln 2`), which is the node's characteristic unfinished answer.
 *
 * Every case is a near-miss on an EL.6 key, and the suite asserts none of them is ever
 * graded correct before checking each one's reason code.
 */
export const EXACT_ROSTER_FALSE_POSITIVE_CASES: readonly ProductGoldenCase[] = [
  // --- key `{ln(2), ln(3)}`: the base of the logarithm is the answer's content ---
  {
    name: "the common log of both roots is not the natural log of both",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{log(2), log(3)}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "mixing the two bases across the roster is not correct either",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{ln(2), log(3)}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "a rounded pair is a representation miss, never a match",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{0.693, 1.099}",
    expected_status: "incorrect",
    expected_reason: "wrong_representation",
  },
  {
    name: "more digits do not turn an approximation into an exact root",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{0.6931471805599453, 1.0986122886681098}",
    expected_status: "incorrect",
    expected_reason: "wrong_representation",
  },
  {
    name: "the substitution's values are one step short of the roots",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{2, 3}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "exponentiating instead of taking the log misses both roots",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{ln(6)}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "the product of the roots is not the roster",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "{ln(2)*ln(3)}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "an empty set is not a two-root roster",
    item_version_id: "spike:el-6:lnRoster:v2",
    raw_answer: "no solution",
    expected_status: "incorrect",
    expected_reason: "incomplete_solution_set",
  },
  // --- key `{log(100)}`: the same confusion, from the other side ---
  {
    name: "the natural log is not the common log the item asked for",
    item_version_id: "spike:el-6:commonLogRoster:v2",
    raw_answer: "{ln(100)}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "the argument is not the logarithm",
    item_version_id: "spike:el-6:commonLogRoster:v2",
    raw_answer: "{100}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  // --- key `{sqrt(2), -sqrt(2)}`: the second branch, and the radicand ---
  {
    name: "the positive branch alone is incomplete",
    item_version_id: "spike:el-6:sqrtRoster:v2",
    raw_answer: "{sqrt(2)}",
    expected_status: "incorrect",
    expected_reason: "incomplete_solution_set",
  },
  {
    name: "the radicand is not the root",
    item_version_id: "spike:el-6:sqrtRoster:v2",
    raw_answer: "{2, -2}",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "a rounded radical pair is a representation miss",
    item_version_id: "spike:el-6:sqrtRoster:v2",
    raw_answer: "{1.414, -1.414}",
    expected_status: "incorrect",
    expected_reason: "wrong_representation",
  },
];
