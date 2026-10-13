import { type ItemTemplate, numericAnswer, type Rng } from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

/**
 * Perfect-power bases whose rational power is a whole number: base = root^den, so
 * base^(num/den) = root^num. The exponent num/den is in lowest terms with num !== den
 * (a genuine fractional exponent), and the values stay small and readable.
 */
const EVAL_CASES: readonly {
  base: number;
  num: number;
  den: number;
  value: number;
}[] = [
  { base: 8, num: 2, den: 3, value: 4 },
  { base: 8, num: 4, den: 3, value: 16 },
  { base: 27, num: 2, den: 3, value: 9 },
  { base: 16, num: 3, den: 4, value: 8 },
  { base: 32, num: 2, den: 5, value: 4 },
  { base: 32, num: 3, den: 5, value: 8 },
  { base: 4, num: 3, den: 2, value: 8 },
  { base: 9, num: 3, den: 2, value: 27 },
  { base: 64, num: 2, den: 3, value: 16 },
  { base: 25, num: 3, den: 2, value: 125 },
];

/**
 * RAD.3 — rational-exponent evaluation: evaluate b^(p/q) to a whole number. Radical
 * <-> rational-exponent FORM conversion has NO text-checker predicate (a
 * value-equivalence check would accept either form), so the product ASSESSMENT
 * grades the one RAD.3 skill the text checker can adjudicate: numeric evaluation of
 * a rational power, via the exact-value numeric path. Form conversion is graded by
 * construction through the `expr_builder` widget in the lesson + practice. Difficulty
 * 2, one L2 template per spine node; the variety key is the (base, num, den) triple.
 */
export const rad3_template: ItemTemplate = {
  template_id: "prod.rad-3.l2",
  node_id: "RAD.3",
  difficulty: 2,
  generate(rng: Rng) {
    const { base, num, den, value } = rng.pick(EVAL_CASES);
    return {
      prompt: `Evaluate: ${base}^(${num}/${den})`,
      answer: numericAnswer(`${value}`),
      params: { base, num, den, value },
    };
  },
  varietyKey: (params) => `${params.base}:${params.num}:${params.den}`,
};

export const rad3_golden: readonly ProductGoldenFixture[] = [
  // RAD.3 — evaluate a positive rational power to a whole number.
  {
    item_version_id: "prod.golden.rad-3.evaluate",
    node_id: "RAD.3",
    prompt: "Evaluate: 8^(2/3)",
    answer: numericAnswer("4"),
    valid: "4",
    alternate_valid: ["4.0", "2^2"],
    near_miss: [
      // Multiplied base by the exponent; took only the cube root and forgot the power.
      { answer: "16", reason: "value_mismatch" },
      { answer: "2", reason: "value_mismatch" },
    ],
  },
  // RAD.3 — a NEGATIVE rational power evaluates to a unit fraction (reciprocal).
  {
    item_version_id: "prod.golden.rad-3.negative",
    node_id: "RAD.3",
    prompt: "Evaluate: 27^(-2/3)",
    answer: numericAnswer("1/9"),
    valid: "1/9",
    alternate_valid: ["2/18", "3/27"],
    near_miss: [
      // Dropped the negative sign (gave the reciprocal's inverse); wrong root.
      { answer: "9", reason: "value_mismatch" },
      { answer: "1/3", reason: "value_mismatch" },
    ],
  },
];
