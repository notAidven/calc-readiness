import { intervalAnswer, setBuilderAnswer } from "../../../template";
import type { ProductGoldenFixture } from "../../golden";

/**
 * LIN.6 — solve absolute-value inequalities. Golden anchors ONLY, for the same reason as
 * LIN.5: a post-MVP `target` node has no frozen walk template, and these fixtures exist
 * to prove the node is gradable by CLEARED categories.
 *
 * The answer shape is an `interval` — a single interval for a `<` prompt and a UNION of
 * two rays for a `>` prompt — which the checker has graded since version 2 and which
 * LIN.6's own prereq LIN.4 already relies on (§4.4 un-gated LIN.4 on exactly this
 * ground). None of this is the deferred "general symbolic inequalities" category: the
 * checker is never asked to SOLVE `|x - 3| > 5`, only to compare the student's interval
 * against the authored one, and the bars appear solely in the KaTeX prompt.
 *
 * The two fixtures that matter most are the `<` / `>` pair, because the single
 * discrimination LIN.6 exists to teach is which one becomes an AND (one interval) and
 * which becomes an OR (a union). Each is authored as the other's near-miss, so a checker
 * change that started conflating them fails here in both directions.
 */
export const lin6_golden: readonly ProductGoldenFixture[] = [
  // `<` — the AND case: a single bounded interval.
  {
    item_version_id: "prod.golden.lin-6.and-interval",
    node_id: "LIN.6",
    prompt: "Solve for x and give the solution in interval notation: |x - 3| < 5",
    answer: intervalAnswer("(-2, 8)"),
    valid: "(-2, 8)",
    alternate_valid: ["(-2,8)", "(-6/3, 8)"],
    near_miss: [
      // Treated a strict inequality as inclusive; read `<` as an OR and produced the
      // union that belongs to `>`; solved the bars away as `x - 3` and `3 - x` without
      // re-centering; dropped the negative branch's shift.
      { answer: "[-2, 8]", reason: "wrong_bound_inclusivity" },
      { answer: "(-inf, -2) U (8, inf)", reason: "value_mismatch" },
      { answer: "(-8, 2)", reason: "value_mismatch" },
      { answer: "(2, 8)", reason: "value_mismatch" },
    ],
  },
  // `>` — the OR case: a union of two rays. This is the fixture that proves the union
  // shape is a first-class key and not something an author has to work around.
  {
    item_version_id: "prod.golden.lin-6.or-union",
    node_id: "LIN.6",
    prompt: "Solve for x and give the solution in interval notation: |x - 3| > 5",
    answer: intervalAnswer("(-inf, -2) U (8, inf)"),
    valid: "(-inf, -2) U (8, inf)",
    alternate_valid: [
      "(8, inf) U (-inf, -2)",
      "(-inf, -2) or (8, inf)",
      "(-infinity, -2) U (8, infinity)",
    ],
    near_miss: [
      // The defining LIN.6 error: kept the AND and returned the bounded interval that
      // belongs to `<`. Then: solved only one branch; made a strict bound inclusive;
      // pointed both rays inward, which covers the whole line instead of its ends.
      { answer: "(-2, 8)", reason: "value_mismatch" },
      { answer: "(8, inf)", reason: "value_mismatch" },
      { answer: "(-inf, -2] U [8, inf)", reason: "wrong_bound_inclusivity" },
      { answer: "(-inf, 8) U (-2, inf)", reason: "value_mismatch" },
    ],
  },
  // `<=` — the inclusive AND case, so the bracket itself is the graded distinction.
  {
    item_version_id: "prod.golden.lin-6.closed-interval",
    node_id: "LIN.6",
    prompt: "Solve for x and give the solution in interval notation: |2x - 4| <= 6",
    answer: intervalAnswer("[-1, 5]"),
    valid: "[-1, 5]",
    alternate_valid: ["[-1,5]", "[-2/2, 5]"],
    near_miss: [
      // Solved correctly and wrote the wrong bracket, one end or both; forgot to divide
      // the coefficient through, so the bounds are the un-halved 6 either side of 4.
      { answer: "(-1, 5)", reason: "wrong_bound_inclusivity" },
      { answer: "[-1, 5)", reason: "wrong_bound_inclusivity" },
      { answer: "[-2, 10]", reason: "value_mismatch" },
    ],
  },
  // The same OR solution asked for in SET-BUILDER notation, which is the other cleared
  // spelling (v0.12, `required_notation: "set_builder"`). Included because LIN.6 sits
  // downstream of LIN.4, whose lesson introduces both notations, so an author may want
  // either — and because it pins that writing the FORM is graded: a correct interval
  // answer here is `wrong_notation`, not a wrong set.
  {
    item_version_id: "prod.golden.lin-6.set-builder",
    node_id: "LIN.6",
    prompt: "Solve for x and give the solution in set-builder notation: |x - 3| > 5",
    answer: setBuilderAnswer("{x | x < -2 or x > 8}"),
    valid: "{x | x < -2 or x > 8}",
    alternate_valid: ["{x | x > 8 or x < -2}", "{x : x < -2 or x > 8}"],
    near_miss: [
      // Right set, wrong notation (the skill is the writing); the AND/OR confusion
      // again, this time inside set-builder braces.
      { answer: "(-inf, -2) U (8, inf)", reason: "wrong_notation" },
      { answer: "{x | -2 < x < 8}", reason: "value_mismatch" },
    ],
  },
];
