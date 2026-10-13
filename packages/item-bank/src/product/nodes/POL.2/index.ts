import { factoredAnswer, type ItemTemplate, type Rng } from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

// POL.2 — factor x^2 + (p+q)x + pq -> (x+p)(x+q) (fully factored over integers).
export const pol2_template: ItemTemplate = {
  template_id: "prod.pol-2.l2",
  node_id: "POL.2",
  difficulty: 2,
  generate(rng: Rng) {
    let p = rng.int(1, 6);
    let q = rng.int(1, 6);
    if (p > q) {
      [p, q] = [q, p];
    }
    return {
      prompt: `Factor completely: x^2 + ${p + q}x + ${p * q}`,
      answer: factoredAnswer(`(x + ${p})*(x + ${q})`, ["x"]),
      params: { p, q },
    };
  },
  varietyKey: (params) => `${params.p}:${params.q}`,
};

export const pol2_golden: readonly ProductGoldenFixture[] = [
  // POL.2 — factor over the integers (irreducible + primitive factors).
  {
    item_version_id: "prod.golden.pol-2.factor",
    node_id: "POL.2",
    prompt: "Factor completely: x^2 + 5x + 6",
    answer: factoredAnswer("(x + 2)*(x + 3)", ["x"]),
    valid: "(x + 2)*(x + 3)",
    alternate_valid: ["(x + 3)*(x + 2)", "(x+2)(x+3)"],
    near_miss: [
      // Did not factor at all; a product that expands to the wrong polynomial.
      { answer: "x^2 + 5*x + 6", reason: "reducible_factor" },
      { answer: "(x + 1)*(x + 3)", reason: "value_mismatch" },
    ],
  },
  // POL.2 (leading-constant variant) — the primitive check on a non-monic factor.
  {
    item_version_id: "prod.golden.pol-2.factor-k",
    node_id: "POL.2",
    prompt: "Factor completely: 2x^2 + 10x + 12",
    answer: factoredAnswer("2*(x + 2)*(x + 3)", ["x"]),
    valid: "2*(x + 2)*(x + 3)",
    alternate_valid: ["2*(x + 3)*(x + 2)", "2(x + 2)(x + 3)"],
    near_miss: [
      // Left the common 2 inside a factor instead of pulling it out front.
      { answer: "(2*x + 4)*(x + 3)", reason: "not_primitive" },
    ],
  },
];
