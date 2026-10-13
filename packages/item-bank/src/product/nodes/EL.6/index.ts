import {
  exactSolutionSetAnswer,
  numericAnswer,
  precisionAnswer,
  solutionSetAnswer,
} from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

/**
 * EL.6 — solve exponential and logarithmic equations. Golden anchors ONLY, on the same
 * footing as LIN.5 and LIN.6: the node has no walk template, because the frozen pre/post
 * walk serves the 12-node foundational spine, and these fixtures exist to prove the node's
 * items are gradable by the checker, which is what un-gates its authoring
 * (`Content_Authoring_Split.md` §4.4).
 *
 * `Answer_Equivalence_Spec.md` §10 listed this node under deferred *arbitrary equation
 * equivalence* until 2026-07-30. The fixtures below are what that reading was corrected
 * against: four of the five shapes answer in categories cleared since checker version 2,
 * because SOLVING an equation submits its roots rather than an equivalent equation. The
 * fifth needed real capability and got it.
 *
 * The last fixture is that fifth shape, and the reason `representation: "exact"` now widens a
 * roster member's grammar. Its near-misses are the three confusions the widening makes
 * possible, each landing on a reason code that distinguishes it:
 *
 *  - the COMMON logarithm where the natural one was solved for is a `value_mismatch`, because
 *    a roster is specific numbers and $\log 2 \ne \ln 2$ (unlike EL.5's identities, which
 *    hold in every base and so grade the two tokens alike);
 *  - a rounded root is `wrong_representation` rather than a value miss, because the learner
 *    did solve it and reported it in a form the item did not ask for;
 *  - stopping at the substitution's own values, before undoing it, is a `value_mismatch`.
 */
export const el6_golden: readonly ProductGoldenFixture[] = [
  // Matching the bases, which needs no logarithm at all. The near-misses are the two ways
  // the rewriting goes wrong: reading the power off as the answer without undoing the shift,
  // and solving the shift in the wrong direction.
  {
    item_version_id: "prod.golden.el-6.same-base",
    node_id: "EL.6",
    prompt: "Solve for x: 2^(x + 1) = 32",
    answer: numericAnswer("4"),
    valid: "4",
    alternate_valid: ["4.0", "8/2"],
    near_miss: [
      { answer: "5", reason: "value_mismatch" },
      { answer: "6", reason: "value_mismatch" },
      { answer: "16", reason: "value_mismatch" },
    ],
  },
  // A single logarithm, converted to exponential form. `12` is the classic slip of
  // multiplying the base by the exponent instead of raising it.
  {
    item_version_id: "prod.golden.el-6.log-single",
    node_id: "EL.6",
    prompt: "Solve for x: log_3(x) = 4",
    answer: numericAnswer("81"),
    valid: "81",
    alternate_valid: ["81.0", "3^4"],
    near_miss: [
      { answer: "12", reason: "value_mismatch" },
      { answer: "64", reason: "value_mismatch" },
      { answer: "1.262", reason: "value_mismatch" },
    ],
  },
  // Taking the logarithm of both sides, where the bases cannot be matched. The precision is
  // a FLOOR, so extra digits pass and a value short of the third decimal place does not.
  {
    item_version_id: "prod.golden.el-6.take-log",
    node_id: "EL.6",
    prompt: "Solve for x: 5^x = 40, rounded to three decimal places",
    answer: precisionAnswer("2.292", {
      mode: "decimal_places",
      value: 3,
      rounding: "half_up",
    }),
    valid: "2.292",
    alternate_valid: ["2.2920", "2.29203"],
    near_miss: [
      // Inverted the quotient of logarithms; divided the numbers instead of their
      // logarithms; rounded to two places where three were asked for. The middle one is
      // written `8.000` rather than `8` because the item declares a decimal
      // representation, and a bare integer is caught as the wrong FORM before its value is
      // ever compared, which would hide the arithmetic mistake behind a formatting one.
      { answer: "0.436", reason: "value_mismatch" },
      { answer: "8.000", reason: "value_mismatch" },
      { answer: "2.29", reason: "value_mismatch" },
    ],
  },
  // The EXTRANEOUS root, which is the node's domain lesson. Keeping the negative root is the
  // defining error, and it reads `extra_solution` rather than a value miss because the
  // solving was right as far as it went: what was missed was the domain check.
  {
    item_version_id: "prod.golden.el-6.extraneous",
    node_id: "EL.6",
    prompt: "Solve for x: log(x) + log(x - 3) = 1",
    answer: solutionSetAnswer("{5}"),
    valid: "{5}",
    alternate_valid: ["5", "{5.0}"],
    near_miss: [
      { answer: "{-2, 5}", reason: "extra_solution" },
      { answer: "{-2}", reason: "value_mismatch" },
      { answer: "no solution", reason: "incomplete_solution_set" },
      // Added the arguments instead of multiplying them, then solved 2x - 3 = 10.
      { answer: "{13/2}", reason: "value_mismatch" },
    ],
  },
  // Quadratic in an exponential: the shape the exact-roster capability exists for.
  {
    item_version_id: "prod.golden.el-6.exp-quadratic",
    node_id: "EL.6",
    prompt: "Solve for x: e^(2x) - 5e^x + 6 = 0, giving exact values",
    answer: exactSolutionSetAnswer("{ln(2), ln(3)}"),
    valid: "{ln(2), ln(3)}",
    alternate_valid: ["{ln(3), ln(2)}", "{  ln(2) , ln(3)  }"],
    near_miss: [
      { answer: "{log(2), log(3)}", reason: "value_mismatch" },
      { answer: "{0.693, 1.099}", reason: "wrong_representation" },
      { answer: "{2, 3}", reason: "value_mismatch" },
      { answer: "{ln(2)}", reason: "incomplete_solution_set" },
      { answer: "{ln(6)}", reason: "value_mismatch" },
    ],
  },
];
