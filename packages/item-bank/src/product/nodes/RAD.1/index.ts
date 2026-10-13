import { type ItemTemplate, type Rng, radicalAnswer } from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

/** Radicands m that are square-free, so sqrt(k^2 * m) simplifies to exactly k*sqrt(m). */
const SQUARE_FREE: readonly number[] = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15];

// RAD.1 — simplify sqrt(k^2 * m), m square-free -> k*sqrt(m) (simplified radical).
export const rad1_template: ItemTemplate = {
  template_id: "prod.rad-1.l2",
  node_id: "RAD.1",
  difficulty: 2,
  generate(rng: Rng) {
    const k = rng.int(2, 5);
    const m = rng.pick(SQUARE_FREE);
    return {
      prompt: `Simplify: sqrt(${k * k * m})`,
      answer: radicalAnswer(`${k}*sqrt(${m})`),
      params: { k, m },
    };
  },
  varietyKey: (params) => `${params.k}:${params.m}`,
};

export const rad1_golden: readonly ProductGoldenFixture[] = [
  // RAD.1 — simplify a radical -> exact simplified radical.
  {
    item_version_id: "prod.golden.rad-1.simplify",
    node_id: "RAD.1",
    prompt: "Simplify: sqrt(8)",
    answer: radicalAnswer("2*sqrt(2)"),
    valid: "2*sqrt(2)",
    alternate_valid: ["sqrt(2)*2", "2sqrt(2)"],
    near_miss: [
      // Left a perfect-square factor under the root; a decimal approximation.
      { answer: "sqrt(8)", reason: "not_simplified" },
      { answer: "2.83", reason: "wrong_representation" },
    ],
  },
];
