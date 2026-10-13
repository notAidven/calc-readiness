import {
  type ItemTemplate,
  multipleChoiceAnswer,
  numericAnswer,
  type Rng,
} from "../../../template";
import type { ProductGoldenFixture } from "../../golden";
import { numStr, signed } from "../_shared";

// FUN.1 — evaluate f(x) = a*x + b at x = k -> numeric exact value.
export const fun1_template: ItemTemplate = {
  template_id: "prod.fun-1.l2",
  node_id: "FUN.1",
  difficulty: 2,
  generate(rng: Rng) {
    const a = rng.int(2, 5);
    let b = rng.int(-6, 6);
    while (b === 0) {
      b = rng.int(-6, 6);
    }
    const k = rng.int(2, 6);
    return {
      prompt: `If f(x) = ${a}x ${signed(b)}, find f(${k}).`,
      answer: numericAnswer(numStr(a * k + b)),
      params: { a, b, k },
    };
  },
  // Distinct functions per cell, not just distinct evaluation points.
  varietyKey: (params) => `${params.a}:${params.b}`,
};

export const fun1_golden: readonly ProductGoldenFixture[] = [
  // FUN.1 — evaluate a function -> numeric exact value.
  {
    item_version_id: "prod.golden.fun-1.evaluate",
    node_id: "FUN.1",
    prompt: "If f(x) = 2x + 1, find f(3).",
    answer: numericAnswer("7"),
    valid: "7",
    alternate_valid: [7, "7.0"],
    near_miss: [
      // Off by the constant term; sign slip on the whole value.
      { answer: "6", reason: "value_mismatch" },
      { answer: "-7", reason: "sign_error" },
    ],
  },
  // FUN.1 (is-it-a-function sub-family) -> multiple choice.
  {
    item_version_id: "prod.golden.fun-1.is-function",
    node_id: "FUN.1",
    prompt:
      "Does the relation {(1, 2), (1, 5), (3, 4)} define y as a function of x? Answer yes or no.",
    answer: multipleChoiceAnswer("no"),
    valid: "no",
    // A single-select choice has no alternate correct spelling (exact-match key).
    alternate_valid: [],
    near_miss: [{ answer: "yes", reason: "value_mismatch" }],
  },
];
