import { solutionSetAnswer } from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

/**
 * LIN.5 — solve absolute-value equations. Golden anchors ONLY: this node has no walk
 * template, because the frozen pre/post walk serves the 12-node foundational spine and
 * LIN.5 is a post-MVP `target` node. These fixtures exist to prove the node's items are
 * gradable by the CLEARED checker categories, which is what un-gates its authoring
 * (`Content_Authoring_Split.md` §4.4).
 *
 * The answer shape is a `solution_set`, cleared since checker version 2 — NOT the
 * `equation_form` shape that `Answer_Equivalence_Spec.md` §10's deferred "arbitrary
 * equation equivalence" describes. `|x - 3| = 5` has TWO solutions, so the natural thing
 * to ask for is the set of them, exactly as LIN.5's own prereq LIN.1 already asks for a
 * one-element set (`prod.lin-1.l2`). The bars live in the PROMPT, and a prompt is KaTeX
 * text the checker never parses, so the `abs` grammar limitation that keeps FUN.10 gated
 * does not reach this node.
 *
 * The near-misses are chosen to be the misconceptions LIN.5 exists to measure, and the
 * first one is the whole node: solving only `x - 3 = 5` and never `x - 3 = -5` is the
 * defining error, and it has to read `incomplete_solution_set` rather than a value miss,
 * because the value the student found was right as far as it went.
 */
export const lin5_golden: readonly ProductGoldenFixture[] = [
  // The two-branch case: dropping the negative branch is the defining LIN.5 error.
  {
    item_version_id: "prod.golden.lin-5.two-branch",
    node_id: "LIN.5",
    prompt: "Solve for x: |x - 3| = 5",
    answer: solutionSetAnswer("{-2, 8}"),
    valid: "{-2, 8}",
    alternate_valid: ["{8, -2}", "-2, 8"],
    near_miss: [
      // Solved only the positive branch; negated both roots instead of the inner
      // expression; sign slip that keeps 8 but loses the branch that produces -2.
      { answer: "{8}", reason: "incomplete_solution_set" },
      { answer: "{-8, 2}", reason: "value_mismatch" },
      { answer: "{2, 8}", reason: "value_mismatch" },
      { answer: "{-2, 8, 3}", reason: "extra_solution" },
    ],
  },
  // A coefficient inside the bars, so the branch has to be divided through, not just
  // sign-flipped. `{4}` is again the dropped branch; `{-4, 3}` is the classic error of
  // negating the SOLUTIONS rather than the right-hand side before solving.
  {
    item_version_id: "prod.golden.lin-5.coefficient",
    node_id: "LIN.5",
    prompt: "Solve for x: |2x - 1| = 7",
    answer: solutionSetAnswer("{-3, 4}"),
    valid: "{-3, 4}",
    alternate_valid: ["{4, -3}", "{ -3 , 4 }"],
    near_miss: [
      { answer: "{4}", reason: "incomplete_solution_set" },
      { answer: "{-4, 3}", reason: "value_mismatch" },
      { answer: "{3, 4}", reason: "value_mismatch" },
    ],
  },
  // The DEGENERATE single-solution case: a right-hand side of 0 collapses the two
  // branches into one, so the student who has learned "always two answers" as a rule
  // rather than as a consequence invents a second root. The key is also fractional,
  // which pins that the set comparator evaluates exact rationals.
  {
    item_version_id: "prod.golden.lin-5.single-root",
    node_id: "LIN.5",
    prompt: "Solve for x: |2x + 1| = 0",
    answer: solutionSetAnswer("{-1/2}"),
    valid: "{-1/2}",
    alternate_valid: ["-1/2", "{-0.5}"],
    near_miss: [
      // Manufactured the mirror root; dropped the sign; solved 2x + 1 = 1.
      { answer: "{-1/2, 1/2}", reason: "extra_solution" },
      { answer: "{1/2}", reason: "value_mismatch" },
      { answer: "{0}", reason: "value_mismatch" },
    ],
  },
  // NO SOLUTION: an absolute value is never negative, so this has an empty solution set.
  // This is the shape that has no interval spelling (see `intervalAnswer`'s note), so it
  // is asked as a solution set, and the comparator accepts the words a student writes.
  {
    item_version_id: "prod.golden.lin-5.no-solution",
    node_id: "LIN.5",
    prompt: "Solve for x: |x + 4| = -2",
    answer: solutionSetAnswer("{}"),
    valid: "{}",
    alternate_valid: ["no solution", "none"],
    near_miss: [
      // Ignored the sign of the right-hand side and solved it anyway; read the
      // absolute value as "make it positive" and returned the boundary.
      { answer: "{-6, -2}", reason: "extra_solution" },
      { answer: "{-2}", reason: "extra_solution" },
    ],
  },
];
