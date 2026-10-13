import { expressionVariable } from "../../../promptFormat";
import { type ItemTemplate, type Rng, variableRadicalAnswer } from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

/**
 * The exponents the assessment draws. Both parities are served, because the single
 * discrimination RAD.4 exists to measure lives in the parity of what comes OUT:
 *
 *  - even `2k` with `k` ODD  -> `|v^k|` (the magnitude; `v^k` alone is WRONG),
 *  - even `2k` with `k` EVEN -> `v^k` (already non-negative, bars would be noise),
 *  - odd `n`                 -> `v^{(n-1)/2}*sqrt(v)` (no bars: an even root is real
 *    only where its radicand is, which already forces `v >= 0`).
 *
 * 3 is excluded from the odd draws so the key always carries an explicit power in front
 * of the root: `xsqrt(x)` does not parse (mathjs reads a symbol glued to a function name
 * as one symbol) while `x^2sqrt(x)` does, so this keeps the natural juxtaposed typing
 * gradable rather than `unsupported_syntax`. Nothing above `MAX_EXPONENT` (8) is drawn
 * either, so the prompt's own radicand is always parseable and an unsimplified re-type
 * grades `not_simplified` rather than `invalid_input`.
 */
const EXPONENTS: readonly number[] = [2, 4, 5, 6, 7];

// RAD.4 — simplify a root with a VARIABLE radicand, the sqrt(v^2) = |v| discrimination
// included. Graded by the v2 checker's variable-aware radical path, which the item
// reaches by declaring `allowed_symbols`.
export const rad4_template: ItemTemplate = {
  template_id: "prod.rad-4.l2",
  node_id: "RAD.4",
  difficulty: 2,
  generate(rng: Rng) {
    const varIndex = rng.int(0, 2);
    const v = expressionVariable(varIndex);
    const power = rng.pick(EXPONENTS);
    const half = power / 2;
    const outside = (power - 1) / 2;
    const key =
      power % 2 === 0
        ? half % 2 === 1
          ? `abs(${half === 1 ? v : `${v}^${half}`})`
          : `${v}^${half}`
        : `${v}^${outside}*sqrt(${v})`;
    return {
      prompt: `Simplify: sqrt(${v}^${power})`,
      answer: variableRadicalAnswer(key, [v]),
      params: { varIndex, power },
    };
  },
  varietyKey: (params) => `${params.varIndex}:${params.power}`,
};

export const rad4_golden: readonly ProductGoldenFixture[] = [
  // RAD.4 — the headline result: an even root of an even power is a MAGNITUDE.
  // `x` is the misconception this node exists for, and it must grade a VALUE miss.
  {
    item_version_id: "prod.golden.rad-4.magnitude",
    node_id: "RAD.4",
    prompt: "Simplify: sqrt(x^2)",
    answer: variableRadicalAnswer("abs(x)", ["x"]),
    valid: "abs(x)",
    alternate_valid: ["|x|", "abs(-x)"],
    near_miss: [
      // Dropped the absolute value; left the perfect power under the root.
      { answer: "x", reason: "value_mismatch" },
      { answer: "sqrt(x^2)", reason: "not_simplified" },
    ],
  },
  // RAD.4 — an ODD root needs no absolute value, because an odd power keeps the sign.
  // The mirror of the fixture above: here `abs(x)` is the wrong answer.
  {
    item_version_id: "prod.golden.rad-4.odd-root",
    node_id: "RAD.4",
    prompt: "Simplify: cbrt(x^6)",
    answer: variableRadicalAnswer("x^2", ["x"]),
    valid: "x^2",
    alternate_valid: ["abs(x^2)", "abs(x)^2"],
    near_miss: [
      // Left the perfect cube under the root; over-applied the even-root bars to the
      // ODD-root case (a cube root of a cube keeps the sign, so |x| is a value miss).
      { answer: "cbrt(x^6)", reason: "not_simplified" },
      { answer: "abs(x^3)", reason: "value_mismatch" },
    ],
  },
  // RAD.4 — the MIXED radicand of Answer_Equivalence_Spec §4: a constant and a variable
  // power under one root, with no bars (the even root already forces x >= 0).
  {
    item_version_id: "prod.golden.rad-4.mixed",
    node_id: "RAD.4",
    prompt: "Simplify: sqrt(8*x^5)",
    answer: variableRadicalAnswer("2*x^2*sqrt(2*x)", ["x"]),
    valid: "2*x^2*sqrt(2*x)",
    alternate_valid: ["2x^2sqrt(2x)", "2*x^2*sqrt(2)*sqrt(x)"],
    near_miss: [
      // Extracted nothing; extracted the variable but left 4 under the root.
      { answer: "sqrt(8*x^5)", reason: "not_simplified" },
      { answer: "x^2*sqrt(8*x)", reason: "not_simplified" },
    ],
  },
];
