import { describe, expect, it } from "vitest";

import type { AnswerSpec, AnswerStatus } from "./index";
import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
} from "./product-answer-checker";
import { PRODUCT_SPIKE_ITEMS } from "./product-checker-fixtures";

/**
 * The ADDITIVITY proof for the 2026-07-25 variable-radical wave
 * (Answer_Equivalence_Spec §13.13).
 *
 * The wave lets `abs`, pipe notation and free variables into the radical
 * category. None of that may disturb the CONSTANT-radicand grading that every
 * frozen item and every golden fixture depends on, so the whole wave sits behind
 * a single gate: the ITEM must declare `allowed_symbols`. `radicalAnswer()` and
 * `exactTrigValueAnswer()` — which author every radical and exact-trig item in
 * the bank — emit a `numeric` answer with none, so no existing item can reach any
 * of the new code.
 *
 * The table below is not hand-written. It was produced by grading this corpus
 * with the checker as it stands on `origin/integration` and diffing: 147/147
 * gradings and 111/111 pre-existing golden cases came back byte-identical. Pinning
 * it here turns that one-off differential into a standing regression guard, so a
 * later edit that leaks the variable path into constant grading fails loudly.
 */
type PinnedVerdict = readonly [
  item: string,
  answer: string,
  status: AnswerStatus,
  reason: string,
];

const CONSTANT_RADICAND_BASELINE: readonly PinnedVerdict[] = [
  // --- RAD.1, key `2*sqrt(2)` (numeric, exact, simplified_radical) ---
  ["spike:rad-1:sqrt:v2", "2*sqrt(2)", "correct", "match"],
  ["spike:rad-1:sqrt:v2", "sqrt(2)*2", "correct", "match"],
  ["spike:rad-1:sqrt:v2", "2 * sqrt( 2 )", "correct", "match"],
  ["spike:rad-1:sqrt:v2", "sqrt(2)+sqrt(2)", "correct", "match"],
  ["spike:rad-1:sqrt:v2", "2*sqrt(2)*1", "correct", "match"],
  ["spike:rad-1:sqrt:v2", "+2*sqrt(2)", "correct", "match"],
  ["spike:rad-1:sqrt:v2", "2*nthRoot(2,2)", "correct", "match"],
  ["spike:rad-1:sqrt:v2", "sqrt(8)", "incorrect", "not_simplified"],
  ["spike:rad-1:sqrt:v2", "sqrt(4)*sqrt(2)", "incorrect", "not_simplified"],
  ["spike:rad-1:sqrt:v2", "nthRoot(8,2)", "incorrect", "not_simplified"],
  ["spike:rad-1:sqrt:v2", "4/sqrt(2)", "incorrect", "not_simplified"],
  ["spike:rad-1:sqrt:v2", "2.83", "incorrect", "wrong_representation"],
  ["spike:rad-1:sqrt:v2", "2^1.5", "incorrect", "wrong_representation"],
  ["spike:rad-1:sqrt:v2", "2*sqrt(2)%", "incorrect", "wrong_representation"],
  ["spike:rad-1:sqrt:v2", "2*sqrt(2) meters", "incorrect", "wrong_representation"],
  ["spike:rad-1:sqrt:v2", "3*sqrt(2)", "incorrect", "value_mismatch"],
  ["spike:rad-1:sqrt:v2", "cbrt(8)", "incorrect", "value_mismatch"],
  ["spike:rad-1:sqrt:v2", "1/sqrt(2)", "incorrect", "value_mismatch"],
  ["spike:rad-1:sqrt:v2", "sqrt(0)", "incorrect", "value_mismatch"],
  ["spike:rad-1:sqrt:v2", "sqrt(2)^2", "incorrect", "value_mismatch"],
  ["spike:rad-1:sqrt:v2", "sqrt(sqrt(16))", "incorrect", "value_mismatch"],
  ["spike:rad-1:sqrt:v2", "-2*sqrt(2)", "incorrect", "sign_error"],
  ["spike:rad-1:sqrt:v2", "8^(1/2)", "invalid_input", "unsupported_exponent"],
  ["spike:rad-1:sqrt:v2", "sqrt(-4)", "invalid_input", "non_numeric_answer"],
  ["spike:rad-1:sqrt:v2", "1/0", "invalid_input", "non_numeric_answer"],
  ["spike:rad-1:sqrt:v2", "", "invalid_input", "empty_answer"],
  ["spike:rad-1:sqrt:v2", "   ", "invalid_input", "empty_answer"],
  ["spike:rad-1:sqrt:v2", "abc", "invalid_input", "unknown_symbol"],
  ["spike:rad-1:sqrt:v2", "x", "invalid_input", "unknown_symbol"],
  ["spike:rad-1:sqrt:v2", "sqrt(x)", "invalid_input", "unknown_symbol"],
  ["spike:rad-1:sqrt:v2", "sqrt(", "invalid_input", "parse_error"],
  ["spike:rad-1:sqrt:v2", "((((((((((", "invalid_input", "parse_error"],
  ["spike:rad-1:sqrt:v2", "9999999999999999999999", "invalid_input", "number_too_large"],
  // The absolute-value inputs the wave adds: on an item that declares no
  // `allowed_symbols` they must STILL be refused exactly as they were.
  ["spike:rad-1:sqrt:v2", "abs(9)", "invalid_input", "unsupported_syntax"],
  ["spike:rad-1:sqrt:v2", "abs(-9)", "invalid_input", "unsupported_syntax"],
  ["spike:rad-1:sqrt:v2", "|9|", "invalid_input", "parse_error"],
  ["spike:rad-1:sqrt:v2", "|x|", "invalid_input", "parse_error"],
  // --- RAD.1, key `2*cbrt(2)` (the cube-root item) ---
  ["spike:rad-1:cbrt:v2", "2*cbrt(2)", "correct", "match"],
  ["spike:rad-1:cbrt:v2", "cbrt(16)", "incorrect", "not_simplified"],
  ["spike:rad-1:cbrt:v2", "2*sqrt(2)", "incorrect", "value_mismatch"],
  ["spike:rad-1:cbrt:v2", "cbrt(8)", "incorrect", "value_mismatch"],
  ["spike:rad-1:cbrt:v2", "2.83", "incorrect", "wrong_representation"],
  ["spike:rad-1:cbrt:v2", "abs(9)", "invalid_input", "unsupported_syntax"],
  ["spike:rad-1:cbrt:v2", "|9|", "invalid_input", "parse_error"],
  // --- TRG.2, key `sqrt(3)/2` (canonical_exact_trig_value) ---
  ["spike:trg-2:value:v2", "sqrt(3)/2", "correct", "match"],
  ["spike:trg-2:value:v2", "nthRoot(3,2)/2", "correct", "match"],
  ["spike:trg-2:value:v2", "sqrt(12)/4", "incorrect", "not_simplified"],
  ["spike:trg-2:value:v2", "sqrt(3)/4", "incorrect", "value_mismatch"],
  ["spike:trg-2:value:v2", "1/2", "incorrect", "value_mismatch"],
  ["spike:trg-2:value:v2", "2.83", "incorrect", "wrong_representation"],
  ["spike:trg-2:value:v2", "abs(9)", "invalid_input", "unsupported_syntax"],
  ["spike:trg-2:value:v2", "abs(-9)", "invalid_input", "unsupported_syntax"],
  ["spike:trg-2:value:v2", "|9|", "invalid_input", "parse_error"],
  ["spike:trg-2:value:v2", "|x|", "invalid_input", "parse_error"],
];

const checker = createProductAnswerChecker({ itemVersions: PRODUCT_SPIKE_ITEMS });

const grade = (item_version_id: string, raw_answer: unknown) =>
  checker({
    raw_answer,
    item_version_id,
    equivalence_checker_version: PRODUCT_CHECKER_VERSION,
  });

describe("constant radicands grade exactly as they did before the variable wave", () => {
  it.each(CONSTANT_RADICAND_BASELINE)(
    "%s <= %j stays %s/%s",
    (item_version_id, raw_answer, status, reason) => {
      expect(grade(item_version_id, raw_answer)).toMatchObject({
        status,
        reason_code: reason,
        client_correct: status === "correct",
        checker_version: PRODUCT_CHECKER_VERSION,
      });
    },
  );
});

/**
 * The gate itself, tested directly. These assertions are what make the additivity
 * claim structural rather than a statement about the corpus above: the ONLY thing
 * that admits `abs`, pipes, a symbolic denominator or the sampler is the item
 * declaring `allowed_symbols`, and nothing a student types can change that.
 */
describe("the additivity gate is a property of the ITEM, not of the submission", () => {
  const radicalSpec: AnswerSpec = {
    answer_type: "numeric",
    equivalence: "exact_value",
    representation: "exact",
    simplification: "simplified_radical",
    required_form: null,
    required_notation: "none",
    precision: null,
    unit_policy: "none",
  };

  const gated = createProductAnswerChecker({
    itemVersions: [
      // Identical items, differing ONLY in whether allowed_symbols is declared.
      {
        item_version_id: "closed",
        node_id: "RAD.1",
        answer: { answer_key: "2*sqrt(2)", answer_spec: radicalSpec },
      },
      {
        item_version_id: "open",
        node_id: "RAD.4",
        answer: {
          answer_key: "2*sqrt(2)",
          allowed_symbols: ["x"],
          answer_spec: radicalSpec,
        },
      },
    ],
  });

  const check = (item_version_id: string, raw_answer: unknown) =>
    gated({ raw_answer, item_version_id, equivalence_checker_version: 2 });

  it("keeps abs() outside the grammar when the item declares no symbols", () => {
    expect(check("closed", "abs(-2)*sqrt(2)")).toMatchObject({
      status: "invalid_input",
      reason_code: "unsupported_syntax",
    });
    expect(check("open", "abs(-2)*sqrt(2)")).toMatchObject({ status: "correct" });
  });

  it("does not run the pipe rewriter when the item declares no symbols", () => {
    expect(check("closed", "|2|*sqrt(2)")).toMatchObject({
      status: "invalid_input",
      reason_code: "parse_error",
    });
    expect(check("open", "|2|*sqrt(2)")).toMatchObject({ status: "correct" });
  });

  it("keeps the symbolic-denominator ban when the item declares no symbols", () => {
    // `allowSymbolicDenominator` is reached only on the widened path, so the
    // closed item still refuses a variable denominator on the pre-existing rule.
    expect(check("closed", "sqrt(x)/x")).toMatchObject({
      status: "invalid_input",
      reason_code: "unsupported_symbolic_denominator",
    });
  });

  it("never lets a free variable be graded on a symbol-free item", () => {
    for (const answer of ["x", "sqrt(x)", "abs(x)", "x^2*sqrt(x)"]) {
      const result = check("closed", answer);
      expect(result.status, answer).toBe("invalid_input");
      expect(result.client_correct, answer).toBe(false);
    }
  });
});

/**
 * The ADDITIVITY proof for the 2026-07-30 exact-roster wave (EL.6).
 *
 * The wave lets `log`, `ln` and `sqrt` into a `solution_set` member, and it sits behind
 * one gate: the ITEM declaring `representation: "exact"`. `solutionSetAnswer()` — which
 * authors every solution-set item in the bank — emits `representation: "any"`, so no
 * existing item can reach the widened grammar.
 *
 * The table below was measured, not written: the same corpus was graded by the checker as
 * it stands on `origin/integration` (`f35c744`) and by this branch, and all 45 verdicts
 * came back identical. Pinning it turns that differential into a standing guard, so a
 * later edit that leaks the symbolic path into rational rosters fails loudly.
 */
const RATIONAL_ROSTER_BASELINE: readonly PinnedVerdict[] = [
  // --- LIN.1, key `{-2, 2}` (solution_set, representation "any") ---
  ["spike:lin-1:set:v2", "{-2, 2}", "correct", "match"],
  ["spike:lin-1:set:v2", "{2, -2}", "correct", "match"],
  // Re-pinned, deliberately, and it is the one row of this table that has moved. The
  // differential above measured the checker as it stood, and as it stood a CLOSED INTERVAL was
  // graded correct for a two-element set, so the baseline recorded the defect rather than the
  // intent. `parseValueList` no longer strips interval brackets, so this row now reads exactly
  // as the round-bracket row eleven lines down always did.
  ["spike:lin-1:set:v2", "[-2, 2]", "invalid_input", "parse_error"],
  ["spike:lin-1:set:v2", "[2, -2]", "invalid_input", "parse_error"],
  ["spike:lin-1:set:v2", "{ -2 , 2 }", "correct", "match"],
  ["spike:lin-1:set:v2", "-2, 2", "correct", "match"],
  ["spike:lin-1:set:v2", "{-2, 2, 2}", "correct", "match"],
  ["spike:lin-1:set:v2", "{-2.0, 2.0}", "correct", "match"],
  ["spike:lin-1:set:v2", "{-4/2, 4/2}", "correct", "match"],
  ["spike:lin-1:set:v2", "{2}", "incorrect", "incomplete_solution_set"],
  ["spike:lin-1:set:v2", "{-2}", "incorrect", "incomplete_solution_set"],
  ["spike:lin-1:set:v2", "{-2, 2, 0}", "incorrect", "extra_solution"],
  ["spike:lin-1:set:v2", "{-1, 1}", "incorrect", "value_mismatch"],
  ["spike:lin-1:set:v2", "{-2, 3}", "incorrect", "value_mismatch"],
  ["spike:lin-1:set:v2", "no solution", "incorrect", "incomplete_solution_set"],
  ["spike:lin-1:set:v2", "", "invalid_input", "empty_answer"],
  ["spike:lin-1:set:v2", "   ", "invalid_input", "empty_answer"],
  ["spike:lin-1:set:v2", "{x}", "invalid_input", "unknown_symbol"],
  ["spike:lin-1:set:v2", "(-2, 2)", "invalid_input", "parse_error"],
  // The tokens the wave admits ELSEWHERE must stay refused here, because this item
  // declares no exact representation. These four rows are the gate.
  ["spike:lin-1:set:v2", "{ln(2), ln(3)}", "invalid_input", "unsupported_syntax"],
  ["spike:lin-1:set:v2", "{log(2)}", "invalid_input", "unsupported_syntax"],
  ["spike:lin-1:set:v2", "{sqrt(4), -sqrt(4)}", "invalid_input", "unsupported_syntax"],
  ["spike:lin-1:set:v2", "{-2, sqrt(4)}", "invalid_input", "unsupported_syntax"],
  // --- LIN.1, key `{}` (the empty roster) ---
  ["spike:lin-1:noSolution:v2", "{}", "correct", "match"],
  ["spike:lin-1:noSolution:v2", "no solution", "correct", "match"],
  ["spike:lin-1:noSolution:v2", "none", "correct", "match"],
  ["spike:lin-1:noSolution:v2", "∅", "correct", "match"],
  ["spike:lin-1:noSolution:v2", "empty", "correct", "match"],
  ["spike:lin-1:noSolution:v2", "{0}", "incorrect", "extra_solution"],
  ["spike:lin-1:noSolution:v2", "{-2, 2}", "incorrect", "extra_solution"],
  ["spike:lin-1:noSolution:v2", "{ln(2)}", "invalid_input", "unsupported_syntax"],
  // --- LIN.5, key `{-2, 8}` (an absolute-value equation's two branches) ---
  ["spike:lin-5:twoBranch:v2", "{-2, 8}", "correct", "match"],
  ["spike:lin-5:twoBranch:v2", "{8, -2}", "correct", "match"],
  ["spike:lin-5:twoBranch:v2", "{8}", "incorrect", "incomplete_solution_set"],
  ["spike:lin-5:twoBranch:v2", "{-2}", "incorrect", "incomplete_solution_set"],
  ["spike:lin-5:twoBranch:v2", "{-8, 2}", "incorrect", "value_mismatch"],
  ["spike:lin-5:twoBranch:v2", "{-2, 8, 0}", "incorrect", "extra_solution"],
  ["spike:lin-5:twoBranch:v2", "no solution", "incorrect", "incomplete_solution_set"],
  ["spike:lin-5:twoBranch:v2", "(-2, 8)", "invalid_input", "parse_error"],
  // Both brackets, side by side, on the node the shape swap is about: an interval is not a
  // solution set whichever one it is written in, and the reversed ends are not one either.
  ["spike:lin-5:twoBranch:v2", "[-2, 8]", "invalid_input", "parse_error"],
  ["spike:lin-5:twoBranch:v2", "[8, -2]", "invalid_input", "parse_error"],
  ["spike:lin-5:twoBranch:v2", "{ln(2), ln(3)}", "invalid_input", "unsupported_syntax"],
  ["spike:lin-5:twoBranch:v2", "{sqrt(4)}", "invalid_input", "unsupported_syntax"],
  // --- LIN.5, key `{}` (an absolute value is never negative) ---
  ["spike:lin-5:noSolution:v2", "no solution", "correct", "match"],
  ["spike:lin-5:noSolution:v2", "{}", "correct", "match"],
  ["spike:lin-5:noSolution:v2", "{-2}", "incorrect", "extra_solution"],
  ["spike:lin-5:noSolution:v2", "{-6, -2}", "incorrect", "extra_solution"],
  ["spike:lin-5:noSolution:v2", "{log(1)}", "invalid_input", "unsupported_syntax"],
];

describe("rational rosters grade exactly as they did before the exact-roster wave", () => {
  it.each(RATIONAL_ROSTER_BASELINE)(
    "%s <= %j stays %s/%s",
    (item_version_id, raw_answer, status, reason) => {
      expect(grade(item_version_id, raw_answer)).toMatchObject({
        status,
        reason_code: reason,
        client_correct: status === "correct",
        checker_version: PRODUCT_CHECKER_VERSION,
      });
    },
  );

  /**
   * A floor under the table, because a containment-style pin is satisfied trivially by an
   * empty one. The four rows that carry the whole additivity claim are the symbolic
   * submissions against non-exact keys, so those are counted separately from the rest:
   * a table trimmed to only its happy path would still clear a single total.
   */
  it("keeps enough rows, including the symbolic-refusal rows that ARE the claim", () => {
    expect(RATIONAL_ROSTER_BASELINE.length).toBeGreaterThanOrEqual(45);
    const symbolic = RATIONAL_ROSTER_BASELINE.filter(([, answer]) =>
      /\b(ln|log|sqrt)\(/.test(answer),
    );
    expect(symbolic.length).toBeGreaterThanOrEqual(8);
    for (const [item, answer, status] of symbolic) {
      expect(status, `${item} <= ${answer}`).toBe("invalid_input");
    }
  });
});

/**
 * The gate itself, tested structurally rather than through the corpus: the ONLY thing
 * that admits a logarithm into a roster is the item's own `representation`, and nothing
 * a learner types can flip it.
 */
describe("the exact-roster gate is a property of the ITEM, not of the submission", () => {
  const rosterSpec = (representation: AnswerSpec["representation"]): AnswerSpec => ({
    answer_type: "solution_set",
    equivalence: "structural",
    representation,
    simplification: "none",
    required_form: null,
    required_notation: "none",
    precision: null,
    unit_policy: "none",
  });

  const gated = createProductAnswerChecker({
    itemVersions: [
      // Identical keys, differing ONLY in the declared representation.
      {
        item_version_id: "roster-any",
        node_id: "LIN.1",
        answer: { answer_key: "{ln(2)}", answer_spec: rosterSpec("any") },
      },
      {
        item_version_id: "roster-exact",
        node_id: "EL.6",
        answer: { answer_key: "{ln(2)}", answer_spec: rosterSpec("exact") },
      },
    ],
  });

  const check = (item_version_id: string, raw_answer: unknown) =>
    gated({ raw_answer, item_version_id, equivalence_checker_version: 2 });

  it("keeps logarithms outside the roster grammar on a representation-any item", () => {
    expect(check("roster-any", "{ln(2)}")).toMatchObject({
      status: "invalid_input",
      reason_code: "unsupported_syntax",
    });
    expect(check("roster-exact", "{ln(2)}")).toMatchObject({ status: "correct" });
  });

  it("cannot even state a symbolic key on a representation-any item", () => {
    // The KEY is refused too, so an author cannot reach the widened grammar by writing
    // the answer symbolically and leaving the representation at its default.
    expect(check("roster-any", "{0.693}")).toMatchObject({
      status: "scoring_error",
      reason_code: "invalid_answer_key",
    });
  });

  it("holds the rational path open on the exact item, so the gate only ADDS", () => {
    const exactRational = createProductAnswerChecker({
      itemVersions: [
        {
          item_version_id: "exact-rational",
          node_id: "EL.6",
          answer: { answer_key: "{3}", answer_spec: rosterSpec("exact") },
        },
      ],
    });
    const graded = exactRational({
      raw_answer: "{3}",
      item_version_id: "exact-rational",
      equivalence_checker_version: 2,
    });
    expect(graded).toMatchObject({ status: "correct", reason_code: "match" });
  });
});

/**
 * THE SEPARATOR WIDENING: the three interchangeable ways of joining a roster's members.
 *
 * `solutionSetForms` has spelled every roster it generates with `", "`, `"; "` AND `" and "`
 * since it was written (`apps/web/src/lessons/cfuAcceptedForms.ts`), and the authored packs
 * list all three, so a learner reading LIN.5's own accepted list and typing `39; 51` was
 * being told by the content that the spelling is right and by the grader that it is wrong:
 * `parseValueList` split on the comma alone, so the whole string became ONE unparseable
 * member and the verdict was `invalid_input / parse_error`.
 *
 * Nothing asserted that rejection, which is why these cases are written against the reported
 * strings rather than against the shape. The four rows this block must not disturb are the
 * INTERVAL-versus-ROSTER pins above (`[-2, 2]`, `[2, -2]`, `[-2, 8]`, `[8, -2]`) and their
 * round-bracket siblings, because the one wrong way to fix this is a flat
 * `.split(/[,;]| and /)`: it would cut `[6, 20]` and `(6, 20)` into two members again for a
 * different reason and say nothing about whether the depth rule holds.
 */
describe("a roster's members may be joined by a comma, a semicolon or the word and", () => {
  const rosterSpec = (): AnswerSpec => ({
    answer_type: "solution_set",
    equivalence: "structural",
    representation: "any",
    simplification: "none",
    required_form: null,
    required_notation: "none",
    precision: null,
    unit_policy: "none",
  });

  /** LIN.5's own two-root answer, which is the instance the report named. */
  const lin5 = createProductAnswerChecker({
    itemVersions: [
      {
        item_version_id: "lin-5-two-root",
        node_id: "LIN.5",
        answer: { answer_key: "{39, 51}", answer_spec: rosterSpec() },
      },
    ],
  });

  const gradeLin5 = (raw_answer: string) =>
    lin5({
      raw_answer,
      item_version_id: "lin-5-two-root",
      equivalence_checker_version: PRODUCT_CHECKER_VERSION,
    });

  it.each([
    "39, 51",
    "39; 51",
    "39 and 51",
    "51, 39",
    "51; 39",
    "51 and 39",
    "{39; 51}",
    "{39 and 51}",
    "39;51",
  ])("grades %j correct against the key {39, 51}", (raw_answer) => {
    expect(gradeLin5(raw_answer)).toMatchObject({
      status: "correct",
      reason_code: "match",
      client_correct: true,
    });
  });

  /**
   * The same claim over the whole SPEC rather than over the one node the report named,
   * derived from the fixture corpus so a new multi-value roster joins the sweep without an
   * edit here. Each key is re-spelled with each separator FROM the key's own members, and
   * every spelling has to reach the verdict the comma spelling reaches.
   */
  const ROSTER_MEMBERS = (key: string): readonly string[] =>
    key
      .trim()
      .replace(/^\{/, "")
      .replace(/\}$/, "")
      .split(",")
      .map((piece) => piece.trim())
      .filter((piece) => piece.length > 0);

  const MULTI_VALUE_ROSTERS = PRODUCT_SPIKE_ITEMS.filter(
    (version) =>
      version.answer.answer_spec.answer_type === "solution_set" &&
      ROSTER_MEMBERS(version.answer.answer_key ?? "").length > 1,
  );

  const SEPARATOR_CASES = MULTI_VALUE_ROSTERS.flatMap((version) =>
    ["; ", " and ", ";", ","].map((separator) => ({
      item_version_id: version.item_version_id,
      raw_answer: ROSTER_MEMBERS(version.answer.answer_key ?? "").join(separator),
    })),
  );

  it(`sweeps ${SEPARATOR_CASES.length} spellings over ${MULTI_VALUE_ROSTERS.length} multi-value rosters`, () => {
    // The floor, because `it.each` over an emptied population emits no tests at all.
    expect(
      MULTI_VALUE_ROSTERS.length,
      "no multi-value solution-set fixture is left to sweep",
    ).toBeGreaterThanOrEqual(4);
    // A floor constrains size and not shape: the claim is about the parser, so the sweep
    // must not have narrowed to the one node the defect was reported on.
    expect(
      new Set(MULTI_VALUE_ROSTERS.map((version) => version.node_id)).size,
      "the sweep has narrowed to one node's items",
    ).toBeGreaterThanOrEqual(2);
  });

  it.each(SEPARATOR_CASES)(
    "$item_version_id <= $raw_answer grades correct",
    ({ item_version_id, raw_answer }) => {
      expect(grade(item_version_id, raw_answer)).toMatchObject({
        status: "correct",
        reason_code: "match",
      });
    },
  );

  /**
   * THE COUNTER-CLAIM, stated in the same block as the widening so the two are read
   * together: a bracketed pair is an INTERVAL and is still not a roster, whichever bracket
   * it wears and whichever separator is inside it. A flat split passes the block above and
   * fails here.
   */
  it.each([
    "[39, 51]",
    "[39; 51]",
    "[39 and 51]",
    "(39, 51)",
    "(39; 51)",
    "[51, 39]",
    "(-inf, 51]",
  ])("refuses %j, which is not a roster", (raw_answer) => {
    const result = gradeLin5(raw_answer);
    expect(result.status, raw_answer).not.toBe("correct");
    expect(result.client_correct, raw_answer).toBe(false);
  });

  /**
   * The third caller. `compareRationalAnswer` reads the exclusion half through the same
   * splitter, so the widening reaches it for free — and the field it belongs to advertises
   * `Numbers only, e.g. -2, 3`, which is a comma-spelled list a learner may well semicolon.
   */
  it.each(["0, -2", "0; -2", "0 and -2", "-2 and 0"])(
    "reads the exclusion list %j",
    (excluded_values) => {
      expect(
        checker({
          raw_answer: { expression: "(2*x + 2)/(x^2 + 2*x)", excluded_values },
          item_version_id: "spike:rat-3:rational-fraction:v2",
          equivalence_checker_version: PRODUCT_CHECKER_VERSION,
        }),
      ).toMatchObject({ status: "correct", reason_code: "match" });
    },
  );
});

/**
 * The CENSUS over this file's own corpus: exactly the EL.6 spike items declare an exact
 * roster. Asserted in both directions, so it fails whether a non-EL.6 item acquires the
 * declaration or an EL.6 one loses it. (The same census over the real item bank belongs
 * to the bank and lives in `packages/item-bank/src/d8.test.ts`, which can see it.)
 */
describe("only EL.6 declares an exact solution set", () => {
  it("names the exact-roster items, and nothing else is one", () => {
    const exactRosters = PRODUCT_SPIKE_ITEMS.filter(
      (version) =>
        version.answer.answer_spec.answer_type === "solution_set" &&
        version.answer.answer_spec.representation === "exact",
    );
    expect(exactRosters.map((version) => version.item_version_id).sort()).toEqual([
      "spike:el-6:commonLogRoster:v2",
      "spike:el-6:lnRoster:v2",
      "spike:el-6:sqrtRoster:v2",
    ]);
    for (const version of exactRosters) {
      expect(version.node_id, version.item_version_id).toBe("EL.6");
    }
    // A floor with a shape: there ARE other solution-set items, and they are all "any".
    const otherRosters = PRODUCT_SPIKE_ITEMS.filter(
      (version) =>
        version.answer.answer_spec.answer_type === "solution_set" &&
        version.answer.answer_spec.representation !== "exact",
    );
    expect(otherRosters.length).toBeGreaterThanOrEqual(4);
    for (const version of otherRosters) {
      expect(version.answer.answer_spec.representation, version.item_version_id).toBe(
        "any",
      );
    }
  });
});
