import { type ItemTemplate, pointAnswer, type Rng, radicalAnswer } from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

// CG.1 — midpoint of two points -> ordered pair (structural).
export const cg1_template: ItemTemplate = {
  template_id: "prod.cg-1.l2",
  node_id: "CG.1",
  difficulty: 2,
  generate(rng: Rng) {
    const mx = rng.int(-6, 6);
    const my = rng.int(-6, 6);
    const dx = rng.int(1, 5);
    const dy = rng.int(1, 5);
    return {
      prompt: `Find the midpoint of (${mx - dx}, ${my - dy}) and (${mx + dx}, ${my + dy}).`,
      answer: pointAnswer(`(${mx}, ${my})`),
      params: { mx, my, dx, dy },
    };
  },
  // Distinct midpoints per cell (the answer is the structural fingerprint).
  varietyKey: (params) => `${params.mx}:${params.my}`,
};

export const cg1_golden: readonly ProductGoldenFixture[] = [
  // CG.1 — midpoint of a segment -> ordered pair.
  {
    item_version_id: "prod.golden.cg-1.midpoint",
    node_id: "CG.1",
    prompt: "Find the midpoint of (1, -5) and (5, 1).",
    answer: pointAnswer("(3, -2)"),
    valid: "(3, -2)",
    alternate_valid: ["(3,-2)", "( 3 , -2 )"],
    near_miss: [
      // Reversed the coordinates; wrong y (averaged x with the wrong sign).
      { answer: "(-2, 3)", reason: "coordinates_swapped" },
      { answer: "(3, 2)", reason: "value_mismatch" },
    ],
  },
  // CG.1 (distance sub-family) -> exact simplified radical.
  {
    item_version_id: "prod.golden.cg-1.distance",
    node_id: "CG.1",
    prompt:
      "Find the distance between (0, 0) and (2, 3). Give an exact, simplified answer.",
    answer: radicalAnswer("sqrt(13)"),
    valid: "sqrt(13)",
    alternate_valid: ["nthRoot(13, 2)", "sqrt( 13 )"],
    near_miss: [
      // A decimal approximation when an exact radical was required; wrong radicand.
      { answer: "3.61", reason: "wrong_representation" },
      { answer: "sqrt(11)", reason: "value_mismatch" },
    ],
  },
];
