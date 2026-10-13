import { type ItemTemplate, type Rng, standardPolyAnswer } from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

// POL.1 — expand (x+p)(x+q) -> standard polynomial x^2 + (p+q)x + pq.
export const pol1_template: ItemTemplate = {
  template_id: "prod.pol-1.l2",
  node_id: "POL.1",
  difficulty: 2,
  generate(rng: Rng) {
    let p = rng.int(1, 7);
    let q = rng.int(1, 7);
    if (p > q) {
      [p, q] = [q, p];
    }
    return {
      prompt: `Expand and write in standard form: (x + ${p})(x + ${q})`,
      answer: standardPolyAnswer(`x^2 + ${p + q}*x + ${p * q}`, ["x"]),
      params: { p, q },
    };
  },
  // Same unordered root pair is the same polynomial; distinct pairs per cell.
  varietyKey: (params) => `${params.p}:${params.q}`,
};

export const pol1_golden: readonly ProductGoldenFixture[] = [
  // POL.1 — expand to standard form (like terms combined, strictly descending).
  {
    item_version_id: "prod.golden.pol-1.expand",
    node_id: "POL.1",
    prompt: "Expand and write in standard form: (x + 2)(x + 3)",
    answer: standardPolyAnswer("x^2 + 5*x + 6", ["x"]),
    valid: "x^2 + 5*x + 6",
    alternate_valid: ["x^2 + 5x + 6", "x^2+5x+6"],
    near_miss: [
      // Left unexpanded; ascending order; uncombined middle terms; wrong coefficient.
      { answer: "(x + 2)*(x + 3)", reason: "not_simplified" },
      { answer: "6 + 5*x + x^2", reason: "not_simplified" },
      { answer: "x^2 + 2*x + 3*x + 6", reason: "not_simplified" },
      { answer: "x^2 + 6*x + 6", reason: "value_mismatch" },
    ],
  },
];
