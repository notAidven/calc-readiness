import { type ItemTemplate, positiveExponentAnswer, type Rng } from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

// EXP.1 — simplify x^a * x^-b to positive-exponent form (§4 positive_exponents).
export const exp1_template: ItemTemplate = {
  template_id: "prod.exp-1.l2",
  node_id: "EXP.1",
  difficulty: 2,
  generate(rng: Rng) {
    let a = rng.int(1, 7);
    let b = rng.int(1, 7);
    // A genuine net exponent of magnitude >= 2 (avoid x^1 / 1/x^1 / x^0).
    while (Math.abs(a - b) < 2) {
      a = rng.int(1, 7);
      b = rng.int(1, 7);
    }
    const net = a - b;
    // Positive-exponent canonical form: x^net when net>0, else 1/x^|net|.
    const key = net > 0 ? `x^${net}` : `1/x^${-net}`;
    return {
      prompt: `Simplify and write with positive exponents: x^${a} * x^-${b}`,
      answer: positiveExponentAnswer(key, ["x"]),
      params: { a, b, net },
    };
  },
  // Distinct net exponent = distinct simplified answer (not just a surface swap).
  varietyKey: (params) => `${params.net}`,
};

export const exp1_golden: readonly ProductGoldenFixture[] = [
  // EXP.1 — simplify to positive-exponent form (§4 positive_exponents).
  {
    item_version_id: "prod.golden.exp-1.simplify",
    node_id: "EXP.1",
    prompt: "Simplify and write with positive exponents: x^2 * x^-5",
    answer: positiveExponentAnswer("1/x^3", ["x"]),
    valid: "1/x^3",
    alternate_valid: ["1/(x^3)", "1/(x*x*x)"],
    near_miss: [
      // Correct value but still a negative exponent (form miss); wrong exponent sign.
      { answer: "x^-3", reason: "not_simplified" },
      { answer: "x^3", reason: "value_mismatch" },
    ],
  },
  // EXP.1 (two-variable sub-family) — a mixed quotient to positive-exponent form.
  {
    item_version_id: "prod.golden.exp-1.two-var",
    node_id: "EXP.1",
    prompt: "Simplify and write with positive exponents: x^3 * y^-2",
    answer: positiveExponentAnswer("x^3/y^2", ["x", "y"]),
    valid: "x^3/y^2",
    alternate_valid: ["x^3/(y^2)", "x^3/(y*y)"],
    near_miss: [
      // Left the negative exponent in place; wrong denominator power.
      { answer: "x^3*y^-2", reason: "not_simplified" },
      { answer: "x^3/y^3", reason: "value_mismatch" },
    ],
  },
];
