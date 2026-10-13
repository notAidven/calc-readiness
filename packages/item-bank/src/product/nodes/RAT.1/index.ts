import { type ItemTemplate, type Rng, rationalAnswer } from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

// RAT.1 — simplify (x^2+(p+q)x+pq)/(x+q) -> x+p, excluding x = -q (§3 domain-aware).
/**
 * ## What the prompt says about EXCLUDED VALUES, and what it deliberately still does not
 *
 * It used to read *"Simplify and state any excluded values: (x^2 + 7x + 6) / (x + 1)"*, and
 * the owner called it unclear QA-ing the diagnostic. Three separate things were wrong with
 * that line and only two of them are fixed here, on purpose.
 *
 *  1. **The term was never defined.** Every other item in this family glosses it. The three
 *     D5 shapes say *"the values of $x$ that make the original denominator zero"*; this one,
 *     the spine's own, said nothing at all. It is now defined.
 *  2. **The FORM was unstated, and that is not cosmetic.** Graded through the real versioned
 *     checker, `-1` is `correct` but `x = -1`, `x=-1` and `x != -1` are `invalid_input /
 *     unsupported_syntax` and `x != -1` with a real unequal sign is `invalid_input /
 *     parse_error`. `isScorable` (`engines/diagnostic/src/scoring.ts`) admits only `correct`
 *     and `incorrect`, and `walk-engine.ts` sets `nextState = state` on anything else, so the
 *     most natural spelling of an excluded value does not advance the adjudication and the
 *     identical question comes back. The prompt now says "numbers only", which is the one
 *     wording that keeps a learner out of that.
 *  3. **Which expression the exclusions belong to is STILL not said, and that is the item.**
 *     `x = -1` survives the cancellation of `(x + 1)`, and a learner who reduces to `x + 6`
 *     and then reads the exclusions off their own answer finds none. That is precisely the
 *     near-miss this node's golden fixture pins (`missing_exclusion`), so the prompt names
 *     "the expression" without saying which, and knowing which is left as the skill.
 *
 * Point 3 makes this item stricter than its three D5 siblings, which do say "the original".
 * That inconsistency is real and is left standing rather than resolved in passing: it is a
 * question about what RAT.1 measures, which is the pack owner's to answer.
 *
 * The expression is now typeset. `MathText`'s upgrade path fires only on a bare expression or
 * an `Instruction:`-labelled one, and this prompt is neither, so the old wording reached the
 * learner as literal `(x^2 + 7x + 6) / (x + 1)` with a caret and a slash while the seven other
 * rational-answer shapes the instrument serves all drew a stacked fraction. Thirteen other
 * spine prompts are still in that state and are deliberately not touched here: they are a
 * pack-wide question, and this one is fixed because its wording had to be rewritten anyway.
 *
 * ## Lane: a CROSS-LANE edit, made 2026-08-05 on the owner's direction
 *
 * `docs/Content_Authoring_Split.md` §11.1 is the current ruling and is not in doubt:
 * *"Anthony has the learning, Gabe has the game"*. The owner hit this item QA-ing the
 * diagnostic, said *"excluded values needs to be clearer"*, and directed the fix himself
 * rather than routing it. Recorded here rather than left to be discovered, per the convention
 * `docs/qa-d4-round-1.md` and §11 of the split doc both follow. `FUN.6`'s
 * `d6.fun6.numerator.l2` carries the same note from the same pass (#640).
 */
export const rat1_template: ItemTemplate = {
  template_id: "prod.rat-1.l2",
  node_id: "RAT.1",
  difficulty: 2,
  generate(rng: Rng) {
    const p = rng.int(1, 6);
    let q = rng.int(1, 6);
    while (q === p) {
      q = rng.int(1, 6);
    }
    return {
      prompt: `Simplify $\\dfrac{x^{2} + ${p + q}x + ${p * q}}{x + ${q}}$, and state every excluded value: a value $x$ is not allowed to take, because the expression is undefined there. Write the excluded values as numbers only, separated by commas.`,
      answer: rationalAnswer(`x + ${p}`, [`${-q}`], ["x"]),
      params: { p, q },
    };
  },
  varietyKey: (params) => `${params.p}:${params.q}`,
};

export const rat1_golden: readonly ProductGoldenFixture[] = [
  // RAT.1 — simplify a rational expression AND keep the inherited exclusion (§3).
  {
    item_version_id: "prod.golden.rat-1.simplify",
    node_id: "RAT.1",
    // Kept byte-identical to what `generate` emits at p = 3, q = 2, because this fixture is
    // the hand-reviewed prompt<->answer anchor and an anchor showing wording that no longer
    // ships anchors nothing.
    prompt:
      "Simplify $\\dfrac{x^{2} + 5x + 6}{x + 2}$, and state every excluded value: a value $x$ is not allowed to take, because the expression is undefined there. Write the excluded values as numbers only, separated by commas.",
    answer: rationalAnswer("x + 3", ["-2"], ["x"]),
    valid: { expression: "x + 3", excluded_values: ["-2"] },
    alternate_valid: [
      { expression: "3 + x", excluded_values: "-2" },
      { expression: "x + 3", excluded_values: [-2] },
    ],
    near_miss: [
      // Dropped the domain exclusion (§13.9); simplified to the wrong expression.
      { answer: { expression: "x + 3", excluded_values: [] }, reason: "missing_exclusion" },
      {
        answer: { expression: "x + 2", excluded_values: ["-2"] },
        reason: "value_mismatch",
      },
    ],
  },
];
