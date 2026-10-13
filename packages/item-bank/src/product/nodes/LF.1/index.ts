import {
  type ItemTemplate,
  multipleChoiceAnswer,
  type Rng,
  reducedFraction,
  representedNumericAnswer,
} from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

// LF.1 — slope through two points -> numeric FRACTION, unsimplified accepted.
export const lf1_template: ItemTemplate = {
  template_id: "prod.lf-1.l2",
  node_id: "LF.1",
  difficulty: 2,
  generate(rng: Rng) {
    const x1 = rng.int(-4, 4);
    const y1 = rng.int(-4, 4);
    const dx = rng.int(2, 5);
    // A genuine fraction slope: dx must NOT divide dy (else the reduced slope is
    // an integer and "fraction" representation is trivial).
    let dy = rng.int(-9, 9);
    while (dy === 0 || dy % dx === 0) {
      dy = rng.int(-9, 9);
    }
    return {
      prompt: `Find the slope of the line through (${x1}, ${y1}) and (${x1 + dx}, ${y1 + dy}). Give your answer as a fraction.`,
      answer: representedNumericAnswer(reducedFraction(dy, dx), "fraction", "none"),
      params: { x1, y1, dx, dy },
    };
  },
  // Distinct slope values per cell.
  varietyKey: (params) => reducedFraction(params.dy ?? 0, params.dx ?? 1),
};

export const lf1_golden: readonly ProductGoldenFixture[] = [
  // LF.1 — slope through two points -> numeric FRACTION (unsimplified accepted).
  {
    item_version_id: "prod.golden.lf-1.slope",
    node_id: "LF.1",
    prompt:
      "Find the slope of the line through (2, 1) and (4, 4). Give your answer as a fraction.",
    answer: representedNumericAnswer("3/2", "fraction", "none"),
    valid: "3/2",
    alternate_valid: ["6/4", "9/6"],
    near_miss: [
      // A decimal when a fraction was required; the reciprocal (rise/run flipped).
      { answer: "1.5", reason: "wrong_representation" },
      { answer: "2/3", reason: "value_mismatch" },
    ],
  },
  // LF.1 (classify sub-family) -> multiple choice.
  {
    item_version_id: "prod.golden.lf-1.classify",
    node_id: "LF.1",
    prompt: "Is the line through (2, 1) and (4, 4) increasing, decreasing, or constant?",
    answer: multipleChoiceAnswer("increasing"),
    valid: "increasing",
    alternate_valid: [],
    near_miss: [{ answer: "decreasing", reason: "value_mismatch" }],
  },
];
