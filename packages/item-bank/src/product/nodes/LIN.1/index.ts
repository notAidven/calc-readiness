import { type ItemTemplate, type Rng, solutionSetAnswer } from "../../../template";
import type { ProductGoldenFixture } from "../../golden";
import { signed } from "../_shared";

// LIN.1 — solve a*x + b = c -> solution_set {x0} (structural, order-insensitive).
export const lin1_template: ItemTemplate = {
  template_id: "prod.lin-1.l2",
  node_id: "LIN.1",
  difficulty: 2,
  generate(rng: Rng) {
    const a = rng.int(2, 6);
    let x0 = rng.int(-6, 6);
    while (x0 === 0) {
      x0 = rng.int(-6, 6);
    }
    let b = rng.int(-9, 9);
    while (b === 0) {
      b = rng.int(-9, 9);
    }
    const c = a * x0 + b;
    return {
      prompt: `Solve for x: ${a}x ${signed(b)} = ${c}`,
      answer: solutionSetAnswer(`{${x0}}`),
      params: { a, b, c, x0 },
    };
  },
  // Distinct (leading coefficient, solution) so a cell can't twin on b alone.
  varietyKey: (params) => `${params.a}:${params.x0}`,
};

export const lin1_golden: readonly ProductGoldenFixture[] = [
  // LIN.1 — solve a linear equation -> solution_set (structural, order-insensitive).
  {
    item_version_id: "prod.golden.lin-1.solve",
    node_id: "LIN.1",
    prompt: "Solve for x: 2x + 4 = 10",
    answer: solutionSetAnswer("{3}"),
    valid: "{3}",
    alternate_valid: ["3", "{ 3 }"],
    near_miss: [
      // {3, 5}: invented a second root; {-3}: sign slip on the isolated variable.
      { answer: "{3, 5}", reason: "extra_solution" },
      { answer: "{-3}", reason: "value_mismatch" },
    ],
  },
];
