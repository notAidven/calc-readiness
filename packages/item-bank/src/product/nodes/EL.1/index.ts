import { type ItemTemplate, precisionAnswer, type Rng } from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

// EL.1 — compound interest, round to the cent -> numeric with declared precision.
export const el1_template: ItemTemplate = {
  template_id: "prod.el-1.l2",
  node_id: "EL.1",
  difficulty: 2,
  generate(rng: Rng) {
    const principal = 100 * rng.int(10, 50);
    const rate = rng.int(3, 8);
    const years = rng.int(2, 4);
    // Author precomputes the key decimal (rounded to the cent, half-up).
    const balance = principal * (1 + rate / 100) ** years;
    return {
      prompt: `You invest $${principal} at ${rate}% annual interest compounded annually for ${years} years. What is the balance, rounded to the nearest cent (in dollars)?`,
      answer: precisionAnswer(
        balance.toFixed(2),
        { mode: "decimal_places", value: 2, rounding: "half_up" },
        "decimal",
      ),
      params: { principal, rate, years },
    };
  },
  varietyKey: (params) => `${params.principal}:${params.rate}:${params.years}`,
};

export const el1_golden: readonly ProductGoldenFixture[] = [
  // EL.1 — compound interest, round to the cent -> numeric with declared precision.
  {
    item_version_id: "prod.golden.el-1.interest",
    node_id: "EL.1",
    prompt:
      "You invest $1000 at 5% annual interest compounded annually for 2 years. What is the balance, rounded to the nearest cent (in dollars)?",
    answer: precisionAnswer(
      "1102.50",
      { mode: "decimal_places", value: 2, rounding: "half_up" },
      "decimal",
    ),
    valid: "1102.50",
    alternate_valid: ["1102.5", "1102.499"],
    near_miss: [
      // Off at the second decimal place; a fraction when a decimal was required.
      { answer: "1102.4", reason: "value_mismatch" },
      { answer: "2205/2", reason: "wrong_representation" },
    ],
  },
];
