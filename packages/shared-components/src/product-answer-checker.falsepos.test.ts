import { describe, expect, it } from "vitest";

import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
} from "./product-answer-checker";
import {
  ABSOLUTE_VALUE_FALSE_POSITIVE_CASES,
  EXACT_ROSTER_FALSE_POSITIVE_CASES,
  PRODUCT_SPIKE_ITEMS,
  VARIABLE_RADICAL_FALSE_POSITIVE_CASES,
} from "./product-checker-fixtures";

/**
 * The VARIABLE-RADICAL false-positive battery (Answer_Equivalence_Spec §4, §13.6),
 * the text-checker counterpart of `graph-comparator.falsepos.test.ts`.
 *
 * Every other equality decision in this checker is a PROOF: exact rational
 * arithmetic, `rationalize`, or a structural AST predicate. Variable radicands are
 * the one category decided by EVIDENCE — agreement at a finite battery of probe
 * points — so they are the one category where a wrong answer can slip through by
 * coinciding with the key everywhere we happened to look. This suite is the guard
 * against that: plausible student near-misses that must all be rejected.
 */
const checker = createProductAnswerChecker({ itemVersions: PRODUCT_SPIKE_ITEMS });

describe("variable-radical false-positive battery: wrong answers are rejected", () => {
  it("has broad coverage (sign, exponent, coefficient, index, abs, domain, pipes)", () => {
    // A tripwire so the battery cannot be silently gutted to a handful of cases.
    expect(VARIABLE_RADICAL_FALSE_POSITIVE_CASES.length).toBeGreaterThanOrEqual(17);
  });

  it("never grades a wrong variable expression correct", () => {
    for (const testCase of VARIABLE_RADICAL_FALSE_POSITIVE_CASES) {
      const result = checker({
        raw_answer: testCase.raw_answer,
        item_version_id: testCase.item_version_id,
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      });
      expect(result.status, testCase.name).not.toBe("correct");
      expect(result.client_correct, testCase.name).toBe(false);
    }
  });

  it.each(VARIABLE_RADICAL_FALSE_POSITIVE_CASES)(
    "rejects with the correct reason: $name",
    ({ item_version_id, raw_answer, expected_status, expected_reason }) => {
      const result = checker({
        raw_answer,
        item_version_id,
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      });
      expect(result).toMatchObject({
        status: expected_status,
        reason_code: expected_reason,
        client_correct: false,
        checker_version: PRODUCT_CHECKER_VERSION,
      });
    },
  );
});

/**
 * The ABSOLUTE-VALUE ANSWER-SHAPE battery (LIN.5 / LIN.6). Unlike the variable-radical
 * suite above it does not guard a sampling decision — these categories compare exact
 * rationals and exact endpoints — so it guards the other way a wrong answer gets
 * accepted: the two shapes the nodes exist to distinguish are immediate neighbours,
 * reached by identical arithmetic. Each case submits one neighbour against the other's
 * key. See the fixture list's own note for why this battery is voluntary under §13.16.
 */
describe("absolute-value answer-shape false-positive battery (LIN.5 / LIN.6)", () => {
  it("covers both nodes, both inequality directions, and both notations", () => {
    // A tripwire so the battery cannot be silently gutted to a handful of cases.
    expect(ABSOLUTE_VALUE_FALSE_POSITIVE_CASES.length).toBeGreaterThanOrEqual(25);
    const items = new Set(
      ABSOLUTE_VALUE_FALSE_POSITIVE_CASES.map((testCase) => testCase.item_version_id),
    );
    for (const item of [
      "spike:lin-5:twoBranch:v2",
      "spike:lin-5:noSolution:v2",
      "spike:lin-6:andInterval:v2",
      "spike:lin-6:orUnion:v2",
      "spike:lin-6:setBuilder:v2",
    ]) {
      expect(items.has(item), item).toBe(true);
    }
  });

  it("never grades a neighbouring absolute-value shape correct", () => {
    for (const testCase of ABSOLUTE_VALUE_FALSE_POSITIVE_CASES) {
      const result = checker({
        raw_answer: testCase.raw_answer,
        item_version_id: testCase.item_version_id,
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      });
      expect(result.status, testCase.name).not.toBe("correct");
      expect(result.client_correct, testCase.name).toBe(false);
    }
  });

  it.each(ABSOLUTE_VALUE_FALSE_POSITIVE_CASES)(
    "rejects with the correct reason: $name",
    ({ item_version_id, raw_answer, expected_status, expected_reason }) => {
      const result = checker({
        raw_answer,
        item_version_id,
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      });
      expect(result).toMatchObject({
        status: expected_status,
        reason_code: expected_reason,
        client_correct: false,
        checker_version: PRODUCT_CHECKER_VERSION,
      });
    },
  );

  /**
   * The partial-credit distinction, asserted as a property rather than case by case: a
   * student who solved one branch of an absolute-value equation gets
   * `incomplete_solution_set`, and one who solved it and mis-bracketed the interval gets
   * `wrong_bound_inclusivity`. Both are "right work, short of the answer", and an item's
   * `misconception_tags.by_reason_code` can only separate them from a genuine solving
   * error if the codes stay distinct.
   */
  it("separates a partial solve from a wrong solve, and a form slip from either", () => {
    const grade = (item_version_id: string, raw_answer: string) =>
      checker({
        raw_answer,
        item_version_id,
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      }).reason_code;

    expect(grade("spike:lin-5:twoBranch:v2", "{8}")).toBe("incomplete_solution_set");
    expect(grade("spike:lin-5:twoBranch:v2", "{-8, 2}")).toBe("value_mismatch");
    expect(grade("spike:lin-6:andInterval:v2", "[-2, 8]")).toBe("wrong_bound_inclusivity");
    expect(grade("spike:lin-6:andInterval:v2", "(-8, 2)")).toBe("value_mismatch");
  });
});

/**
 * The INTERVAL-BRACKET widening of the battery above.
 *
 * That battery reported 76 passed while `[6, 20]` graded CORRECT for the set `{6, 20}`, because
 * its LIN.5 cases covered the ROUND-bracket spelling of the shape swap and not the square one:
 * `parseValueList` stripped `[` and `]` exactly as it stripped `{` and `}`, so an interval and a
 * roster over the same two numbers became the same list. LIN.4 is the node immediately before
 * LIN.5 and its slide 2 exists to teach that `[a, b]` is every number between `a` and `b`, so the
 * accepted spelling was precisely the confusion the previous lesson is there to prevent.
 *
 * DERIVED rather than listed, over every `solution_set` item in the fixture set whose key holds
 * two or more values, because the parser is shared and the population is the SPEC rather than the
 * one node a review happened to measure. The spellings are built FROM each item's own key, so a
 * new `solution_set` fixture joins the sweep without an edit here.
 *
 * Two exclusions, both deliberate. A ONE-value key is out: `[3]` is not interval notation, so
 * refusing it would be a different claim from this one. And the round-bracket spelling the
 * battery already covered is kept IN, as the control that the two brackets are measured side by
 * side — a fix that refuses `[a, b]` while starting to accept `(a, b)` fails here.
 */
const rosterMembers = (key: string): readonly string[] =>
  key
    .trim()
    .replace(/^\{/, "")
    .replace(/\}$/, "")
    .split(",")
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0);

const MULTI_VALUE_SOLUTION_SETS = PRODUCT_SPIKE_ITEMS.filter(
  (version) =>
    version.answer.answer_spec.answer_type === "solution_set" &&
    rosterMembers(version.answer.answer_key ?? "").length > 1,
);

const INTERVAL_SPELLINGS: readonly {
  readonly name: string;
  readonly spell: (members: readonly string[]) => string;
}[] = [
  { name: "closed interval, spaced", spell: (m) => `[${m.join(", ")}]` },
  { name: "closed interval, tight", spell: (m) => `[${m.join(",")}]` },
  {
    // An interval whose ends are in the wrong order denotes nothing at all.
    name: "closed interval, ends reversed",
    spell: (m) => `[${[...m].reverse().join(", ")}]`,
  },
  { name: "half-open interval", spell: (m) => `[${m.join(", ")})` },
  { name: "open interval, spaced", spell: (m) => `(${m.join(", ")})` },
];

const INTERVAL_SPELLING_CASES = MULTI_VALUE_SOLUTION_SETS.flatMap((version) =>
  INTERVAL_SPELLINGS.map((spelling) => ({
    name: `${version.item_version_id} :: ${spelling.name}`,
    item_version_id: version.item_version_id,
    raw_answer: spelling.spell(rosterMembers(version.answer.answer_key ?? "")),
  })),
);

describe("an interval is not a solution set, whichever bracket it is written in", () => {
  it(`sweeps ${INTERVAL_SPELLING_CASES.length} interval spellings over ${MULTI_VALUE_SOLUTION_SETS.length} multi-value solution-set items`, () => {
    // The floor, with the count in the title above: an emptied population is the quietest
    // possible green, because `it.each` over nothing emits no tests at all.
    expect(
      MULTI_VALUE_SOLUTION_SETS.length,
      "no multi-value solution-set fixture is left to sweep",
    ).toBeGreaterThanOrEqual(4);
    expect(INTERVAL_SPELLING_CASES.length).toBe(
      MULTI_VALUE_SOLUTION_SETS.length * INTERVAL_SPELLINGS.length,
    );
    // A floor constrains size and not shape, so the shape is asserted beside it: the claim is
    // about the SPEC, and a population that had narrowed back to the one node the defect was
    // reported on would still clear the count.
    expect(
      new Set(MULTI_VALUE_SOLUTION_SETS.map((version) => version.node_id)).size,
      "the sweep has narrowed to one node's items",
    ).toBeGreaterThanOrEqual(3);
  });

  it.each(INTERVAL_SPELLING_CASES)("rejects $name", ({ item_version_id, raw_answer }) => {
    const result = checker({
      raw_answer,
      item_version_id,
      equivalence_checker_version: PRODUCT_CHECKER_VERSION,
    });
    expect(result.status, raw_answer).not.toBe("correct");
    expect(result.client_correct, raw_answer).toBe(false);
  });
});

/**
 * The EXACT-ROSTER battery (EL.6). See the fixture list's note for what it guards: a
 * widened grammar that lets two different numbers be spelled confusably.
 */
describe("exact-roster false-positive battery (EL.6)", () => {
  it("covers both log bases, rounding, and the unfinished substitution", () => {
    // A tripwire so the battery cannot be silently gutted to a handful of cases.
    expect(EXACT_ROSTER_FALSE_POSITIVE_CASES.length).toBeGreaterThanOrEqual(13);
    const items = new Set(
      EXACT_ROSTER_FALSE_POSITIVE_CASES.map((testCase) => testCase.item_version_id),
    );
    // All three EL.6 keys are exercised, so the battery cannot narrow to one shape.
    for (const item of [
      "spike:el-6:lnRoster:v2",
      "spike:el-6:commonLogRoster:v2",
      "spike:el-6:sqrtRoster:v2",
    ]) {
      expect(items.has(item), item).toBe(true);
    }
  });

  it("never grades a confusable spelling of a different number correct", () => {
    for (const testCase of EXACT_ROSTER_FALSE_POSITIVE_CASES) {
      const result = checker({
        raw_answer: testCase.raw_answer,
        item_version_id: testCase.item_version_id,
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      });
      expect(result.status, testCase.name).not.toBe("correct");
      expect(result.client_correct, testCase.name).toBe(false);
    }
  });

  it.each(EXACT_ROSTER_FALSE_POSITIVE_CASES)(
    "rejects with the correct reason: $name",
    ({ item_version_id, raw_answer, expected_status, expected_reason }) => {
      const result = checker({
        raw_answer,
        item_version_id,
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      });
      expect(result).toMatchObject({
        status: expected_status,
        reason_code: expected_reason,
        client_correct: false,
        checker_version: PRODUCT_CHECKER_VERSION,
      });
    },
  );

  /**
   * The distinction the reason codes buy an item author: a learner who rounded did the
   * solving and reported it wrongly, and a learner who took the wrong base did not solve
   * it. Collapsing both to `value_mismatch` would make the two indistinguishable to
   * `misconception_tags.by_reason_code`.
   */
  it("separates a rounded exact root from a wrong-base one", () => {
    const grade = (raw_answer: string) =>
      checker({
        raw_answer,
        item_version_id: "spike:el-6:lnRoster:v2",
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      }).reason_code;

    expect(grade("{0.693, 1.099}")).toBe("wrong_representation");
    expect(grade("{log(2), log(3)}")).toBe("value_mismatch");
    expect(grade("{ln(2)}")).toBe("incomplete_solution_set");
  });
});
