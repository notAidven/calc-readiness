import type { D1AnswerDefinition, D1ItemVersion } from "./d1-answer-checker";
import type { AnswerSpec, AnswerStatus } from "./index";

function answerSpec(overrides: Partial<AnswerSpec>): AnswerSpec {
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

const numeric = (
  answerKey: string,
  overrides: Partial<AnswerSpec> = {},
): D1AnswerDefinition => ({
  answer_key: answerKey,
  answer_spec: answerSpec(overrides),
});

export const D1_SPIKE_ITEMS: readonly D1ItemVersion[] = [
  {
    item_version_id: "spike:num-s:signed:v1",
    node_id: "NUM.S",
    answer: numeric("-8"),
  },
  {
    item_version_id: "spike:num-f:reduced:v1",
    node_id: "NUM.F",
    answer: numeric("3/4", {
      representation: "fraction",
      simplification: "reduced_fraction",
    }),
  },
  {
    item_version_id: "spike:num-2:precedence:v1",
    node_id: "NUM.2",
    answer: numeric("14"),
  },
  {
    item_version_id: "spike:num-3:distributive:v1",
    node_id: "NUM.3",
    answer: {
      answer_key: "3*x + 6",
      answer_spec: answerSpec({
        answer_type: "expression",
        equivalence: "symbolic",
      }),
      allowed_symbols: ["x"],
    },
  },
  {
    item_version_id: "spike:num-3:distributive-combined:v1",
    node_id: "NUM.3",
    answer: {
      answer_key: "4*x + 24",
      answer_spec: answerSpec({
        answer_type: "expression",
        equivalence: "symbolic",
        simplification: "combined_polynomial",
      }),
      allowed_symbols: ["x"],
    },
  },
  {
    // NUM.3 L3 practice: expand two products, combine the constants. Collecting the
    // like terms is NUM.4 material, so `2x + 4x + 14` must grade correct too.
    item_version_id: "spike:num-3:expand-only:v1",
    node_id: "NUM.3",
    answer: {
      answer_key: "6*x + 14",
      answer_spec: answerSpec({
        answer_type: "expression",
        equivalence: "symbolic",
        simplification: "combined_constants",
      }),
      allowed_symbols: ["x"],
    },
  },
  {
    // Same profile with a NEGATIVE constant: `flattenAddSub` returns signed terms,
    // so `6x - 4` holds ONE plain number, not two.
    item_version_id: "spike:num-3:expand-only-negative:v1",
    node_id: "NUM.3",
    answer: {
      answer_key: "6*x - 4",
      answer_spec: answerSpec({
        answer_type: "expression",
        equivalence: "symbolic",
        simplification: "combined_constants",
      }),
      allowed_symbols: ["x"],
    },
  },
  {
    item_version_id: "spike:num-4:combine:v1",
    node_id: "NUM.4",
    answer: {
      answer_key: "5*x - 2",
      answer_spec: answerSpec({
        answer_type: "expression",
        equivalence: "symbolic",
        simplification: "combined_polynomial",
      }),
      allowed_symbols: ["x"],
    },
  },
  {
    // Same profile with a NEGATIVE LEADING COEFFICIENT. `-2x` parses as
    // `(-2) * x`, so the simplification pass sees a product whose left operand is
    // an OperatorNode with `op === "-"`. Only the operand count separates that
    // unary minus from the binary sum in a genuinely unexpanded `-2 * (x - 5/2)`.
    // Every other `combined_polynomial` fixture has a positive leading
    // coefficient, which is why this shape went unexercised; D7's linear models
    // hit it on any line with a negative slope.
    item_version_id: "spike:num-4:combine-negative:v1",
    node_id: "NUM.4",
    answer: {
      answer_key: "-2*x + 5",
      answer_spec: answerSpec({
        answer_type: "expression",
        equivalence: "symbolic",
        simplification: "combined_polynomial",
      }),
      allowed_symbols: ["x"],
    },
  },
  {
    item_version_id: "spike:num-5:percent:v1",
    node_id: "NUM.5",
    answer: numeric("25%", {
      representation: "percent",
    }),
  },
  {
    item_version_id: "spike:num-5:unit:v1",
    node_id: "NUM.5",
    answer: {
      ...numeric("12 ft", {
        unit_policy: "required_exact_unit",
      }),
      accepted_units: ["ft", "foot", "feet"],
    },
  },
  {
    item_version_id: "spike:num-s:mcq:v1",
    node_id: "NUM.S",
    answer: {
      answer_key: "option-b",
      answer_spec: answerSpec({
        answer_type: "multiple_choice",
        equivalence: "none",
      }),
    },
  },
  {
    item_version_id: "spike:num-5:multipart:v1",
    node_id: "NUM.5",
    answer: {
      answer_spec: answerSpec({
        answer_type: "multipart",
        equivalence: "none",
      }),
      parts: [
        {
          part_id: "ratio",
          answer: numeric("2/3", {
            representation: "fraction",
            simplification: "reduced_fraction",
          }),
        },
        {
          part_id: "percent",
          answer: numeric("40%", {
            representation: "percent",
          }),
        },
      ],
    },
  },
];

export interface D1GoldenCase {
  name: string;
  item_version_id: string;
  raw_answer: unknown;
  expected_status: AnswerStatus;
  expected_reason: string;
}

export const D1_GOLDEN_CASES: readonly D1GoldenCase[] = [
  {
    name: "signed integer exact match",
    item_version_id: "spike:num-s:signed:v1",
    raw_answer: "-8",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "signed arithmetic alternate valid form",
    item_version_id: "spike:num-s:signed:v1",
    raw_answer: "-4 * 2",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "signed arithmetic catches sign error",
    item_version_id: "spike:num-s:signed:v1",
    raw_answer: "8",
    expected_status: "incorrect",
    expected_reason: "sign_error",
  },
  {
    name: "fraction accepts reduced form",
    item_version_id: "spike:num-f:reduced:v1",
    raw_answer: "3/4",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "fraction rejects equivalent decimal representation",
    item_version_id: "spike:num-f:reduced:v1",
    raw_answer: "0.75",
    expected_status: "incorrect",
    expected_reason: "wrong_representation",
  },
  {
    name: "fraction rejects unreduced equivalent",
    item_version_id: "spike:num-f:reduced:v1",
    raw_answer: "6/8",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "order of operations exact result",
    item_version_id: "spike:num-2:precedence:v1",
    raw_answer: "14",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "order of operations near miss",
    item_version_id: "spike:num-2:precedence:v1",
    raw_answer: "20",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "field-property expression expands equivalently",
    item_version_id: "spike:num-3:distributive:v1",
    raw_answer: "3 * (x + 2)",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "field-property expression accepts reordered terms",
    item_version_id: "spike:num-3:distributive:v1",
    raw_answer: "6 + 3x",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "field-property expression catches value mismatch",
    item_version_id: "spike:num-3:distributive:v1",
    raw_answer: "3x + 2",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    name: "distributive practice accepts canonical expanded form",
    item_version_id: "spike:num-3:distributive-combined:v1",
    raw_answer: "4x + 24",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "distributive practice accepts flipped constant and variable terms",
    item_version_id: "spike:num-3:distributive-combined:v1",
    raw_answer: "24 + 4x",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "distributive practice rejects unexpanded product",
    item_version_id: "spike:num-3:distributive-combined:v1",
    raw_answer: "4(x + 6)",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "expand-only accepts the fully combined form",
    item_version_id: "spike:num-3:expand-only:v1",
    raw_answer: "6x + 14",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "expand-only accepts uncombined variable terms",
    item_version_id: "spike:num-3:expand-only:v1",
    raw_answer: "2x + 4x + 14",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "expand-only rejects uncombined constants",
    item_version_id: "spike:num-3:expand-only:v1",
    raw_answer: "2x + 6 + 4x + 8",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "expand-only rejects a trailing loose constant",
    item_version_id: "spike:num-3:expand-only:v1",
    raw_answer: "4x + 2x + 6 + 8",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "expand-only rejects an unexpanded product",
    item_version_id: "spike:num-3:expand-only:v1",
    raw_answer: "2(x + 3) + 4(x + 2)",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "expand-only catches a value mismatch",
    item_version_id: "spike:num-3:expand-only:v1",
    raw_answer: "2x + 4x + 12",
    expected_status: "incorrect",
    expected_reason: "value_mismatch",
  },
  {
    // A `+ 0` tail is a second plain-number term, so it is still uncombined.
    name: "expand-only rejects a trailing + 0",
    item_version_id: "spike:num-3:expand-only:v1",
    raw_answer: "6x + 14 + 0",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    // KNOWN INHERITED LENIENCY (pinned, not endorsed): a constant left as an
    // unevaluated PRODUCT is one symbol-free term, so it passes the
    // "two or more plain numbers" test. `combined_polynomial` has the identical
    // hole, so this is not a regression the new profile introduced. Pinned here so
    // any future narrowing of the rule is a deliberate, visible fixture change.
    name: "expand-only accepts an unevaluated constant product (known leniency)",
    item_version_id: "spike:num-3:expand-only:v1",
    raw_answer: "6x + 7*2",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "expand-only accepts a negative combined constant",
    item_version_id: "spike:num-3:expand-only-negative:v1",
    raw_answer: "6x - 4",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "expand-only accepts uncombined variable terms with a negative constant",
    item_version_id: "spike:num-3:expand-only-negative:v1",
    raw_answer: "2x + 4x - 4",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "expand-only rejects split signed constants",
    item_version_id: "spike:num-3:expand-only-negative:v1",
    raw_answer: "2x - 6 + 4x + 2",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "combined expression accepts final form",
    item_version_id: "spike:num-4:combine:v1",
    raw_answer: "5x - 2",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "combined expression accepts flipped constant and variable terms",
    item_version_id: "spike:num-4:combine:v1",
    raw_answer: "-2 + 5x",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "combined expression rejects uncombined like terms",
    item_version_id: "spike:num-4:combine:v1",
    raw_answer: "2x + 3x - 2",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "combined expression rejects unexpanded product",
    item_version_id: "spike:num-4:combine:v1",
    raw_answer: "5 * (x - 2/5)",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "combined expression accepts a negative leading coefficient",
    item_version_id: "spike:num-4:combine-negative:v1",
    raw_answer: "-2x + 5",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "combined expression accepts a negative leading coefficient written trailing",
    item_version_id: "spike:num-4:combine-negative:v1",
    raw_answer: "5 - 2x",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    // The operand-count guard must not blind the predicate: a negative outer
    // factor on a real parenthesized sum is still unexpanded.
    name: "combined expression still rejects a product with a negative outer factor",
    item_version_id: "spike:num-4:combine-negative:v1",
    raw_answer: "-2 * (x - 5/2)",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "combined expression still rejects uncombined like terms with a negative lead",
    item_version_id: "spike:num-4:combine-negative:v1",
    raw_answer: "-3x + x + 5",
    expected_status: "incorrect",
    expected_reason: "not_simplified",
  },
  {
    name: "percent requires percent representation",
    item_version_id: "spike:num-5:percent:v1",
    raw_answer: "25%",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "percent rejects equivalent decimal representation",
    item_version_id: "spike:num-5:percent:v1",
    raw_answer: "0.25",
    expected_status: "incorrect",
    expected_reason: "wrong_representation",
  },
  {
    name: "unit accepts authored alias",
    item_version_id: "spike:num-5:unit:v1",
    raw_answer: "12 feet",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "unit rejects conversion and wrong unit",
    item_version_id: "spike:num-5:unit:v1",
    raw_answer: "144 in",
    expected_status: "incorrect",
    expected_reason: "wrong_unit",
  },
  {
    name: "multiple choice compares immutable option id",
    item_version_id: "spike:num-s:mcq:v1",
    raw_answer: "option-b",
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "multipart accepts all correct parts",
    item_version_id: "spike:num-5:multipart:v1",
    raw_answer: { ratio: "2/3", percent: "40%" },
    expected_status: "correct",
    expected_reason: "match",
  },
  {
    name: "multipart reports the first failing part",
    item_version_id: "spike:num-5:multipart:v1",
    raw_answer: { ratio: "2/3", percent: "0.4" },
    expected_status: "incorrect",
    expected_reason: "percent:wrong_representation",
  },
  {
    name: "malformed input remains unanswered instead of wrong",
    item_version_id: "spike:num-2:precedence:v1",
    raw_answer: "(",
    expected_status: "invalid_input",
    expected_reason: "parse_error",
  },
];
