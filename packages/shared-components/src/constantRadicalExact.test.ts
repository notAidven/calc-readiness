import { describe, expect, it } from "vitest";

import type { AnswerDefinition } from "./checker-core";
import type { AnswerSpec } from "./index";
import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
  type ProductItemVersion,
} from "./product-answer-checker";

/**
 * A constant radical answer is compared by EXACT arithmetic, so a rational cannot be accepted
 * for an irrational and a surd cannot be accepted for a surd it merely approximates.
 *
 * ## The defect this file was written for (strictness report L6/L7)
 *
 * `compareConstantRadical` evaluated both sides to a JS double and compared at `floatEqual`'s
 * 1e-9. That is not a rounding nicety, it decides verdicts on 152 served items:
 *
 *  - `13860/19601` graded CORRECT against a key of `sqrt(2)/2` on
 *    `d2.rad1.quotient.l2:practice:61090`. `13860/19601` is a RATIONAL number and `√2/2` is
 *    irrational, so the two are unequal by an elementary argument, not by a digit count. They
 *    differ by about 4e-10.
 *  - a rational near-miss was found and accepted on 68 of 68 distinct keys the search could
 *    construct one for, across every key shape the pool contains.
 *  - `floatEqual` goes RELATIVE above 1, so on `d2.rad1.coeff.l3:practice:60008` (key
 *    `9*sqrt(13)` ≈ 32.45) an absolute error of 1e-8 was accepted.
 *  - riding on the same acceptance: an item whose `simplification` is `simplified_radical`
 *    accepted an answer containing NO RADICAL AT ALL, because `radicalFormIssue` only requires
 *    that a radical which is present be simplified.
 *
 * ## Why this is exactness and NOT a "require a radical to be present" rule
 *
 * Requiring a radical would have been the cheap half, and it would have refused 61 served
 * items their own answer. Measured over the served pool: 61 of the 152 items in this cohort
 * have a key with no radical in it — `3/5`, `1/2`, `-24/7`, `20/21` and 44 more distinct
 * values, all `canonical_exact_trig_value`, where the exact value of the angle simply IS a
 * rational. A presence rule is the `RAD.1` shape `submitGuards.ts` warns about: a gate that
 * refuses its own key, on 40% of the cohort.
 *
 * Exactness subsumes it and has no such cohort. A radical-free answer against an irrational
 * key is refused because the two are unequal, and a radical-free answer against a RATIONAL key
 * is accepted because it is right. Nothing has to know whether a radical is "expected".
 *
 * ## What the exact reader must not break, and why each case below is here
 *
 * The reader works in ℚ adjoined the square roots it finds, so equal surds written differently
 * stay equal: `sqrt(18)` IS `3*sqrt(2)` and `sqrt(2)^5` IS `4*sqrt(2)`. Those spellings are
 * refused by the FORM rule instead, and the assertions below check for `not_simplified`
 * specifically rather than for "not correct" — a `value_mismatch` there would mean the reader
 * had started manufacturing false negatives, which is the failure mode a tightening invites and
 * the one a coarse assertion would hide.
 *
 * Where the reader cannot decide a shape exactly it falls back to a float comparison at a
 * tightened tolerance. 1e-12 is not a guess: measured over 626 legitimate alternate spellings
 * of all 116 distinct keys in this cohort, the WORST relative disagreement between two
 * spellings of the same value is 2.093e-16 (`3*sqrt(2)` vs `sqrt(18)`), so 1e-12 keeps four
 * orders of magnitude of headroom over anything double arithmetic actually loses, while the
 * smallest perturbation demonstrated above sits at 2.5e-10.
 */

function radicalSpec(
  simplification: "simplified_radical" | "canonical_exact_trig_value",
): AnswerSpec {
  return {
    answer_type: "numeric",
    equivalence: "exact_value",
    representation: "exact",
    simplification,
    required_form: null,
    required_notation: "none",
    precision: null,
    unit_policy: "none",
  };
}

/**
 * One item per key shape the served cohort actually contains, read off the measurement of all
 * 116 distinct keys: 48 are a plain rational, 41 are `a*sqrt(n)`, 19 are `a*sqrt(n)/b`, and 8
 * are a sum or difference of two surds. Each is named for its shape so a failure says which
 * shape broke.
 */
const KEYS: readonly {
  readonly id: string;
  readonly key: string;
  readonly trig: boolean;
}[] = [
  { id: "shape:rational", key: "3/5", trig: true },
  { id: "shape:rational-negative", key: "-24/7", trig: true },
  { id: "shape:coefficient-surd", key: "9*sqrt(13)", trig: false },
  { id: "shape:surd-over-integer", key: "sqrt(2)/2", trig: false },
  { id: "shape:surd-over-integer-b", key: "sqrt(3)/3", trig: false },
  { id: "shape:two-surd-sum", key: "4*sqrt(6)+3*sqrt(5)", trig: false },
  { id: "shape:surd-difference", key: "(sqrt(6)-sqrt(2))/4", trig: true },
  { id: "shape:bare-surd", key: "3*sqrt(2)", trig: false },
  { id: "shape:rational-key-integer", key: "2", trig: false },
];

const ITEMS: readonly ProductItemVersion[] = KEYS.map(({ id, key, trig }) => ({
  item_version_id: id,
  node_id: trig ? "TRG.2" : "RAD.1",
  answer: {
    answer_key: key,
    answer_spec: radicalSpec(trig ? "canonical_exact_trig_value" : "simplified_radical"),
  } as AnswerDefinition,
}));

const check = createProductAnswerChecker({ itemVersions: ITEMS });

function grade(id: string, rawAnswer: unknown): string {
  const result = check({
    raw_answer: rawAnswer,
    item_version_id: id,
    equivalence_checker_version: PRODUCT_CHECKER_VERSION,
  });
  return `${result.status}/${result.reason_code}`;
}

describe("a rational is never accepted for an irrational", () => {
  it("refuses the demonstrated rational approximation of sqrt(2)/2", () => {
    expect(grade("shape:surd-over-integer", "13860/19601")).toBe(
      "incorrect/value_mismatch",
    );
  });

  it("refuses a rational near-miss on a plain rational key too", () => {
    // The rational-key half of the cohort has the same hole for a different reason: two
    // DIFFERENT rationals inside 1e-9 of each other compared equal.
    expect(grade("shape:rational", "599999999/1000000000")).toBe(
      "incorrect/value_mismatch",
    );
  });

  it("refuses a surd perturbed inside the old 1e-9 window, on every key shape", () => {
    // A relative perturbation of 1e-10: inside the old window on every shape, and spelled
    // without a decimal point so the exact-representation gate is not what refuses it.
    const perturbed: string[] = [];
    for (const { id, key } of KEYS) {
      const verdict = grade(id, `(${key})*(1+1/10000000000)`);
      perturbed.push(`${key} -> ${verdict}`);
      expect(verdict, `key ${key}`).toBe("incorrect/value_mismatch");
    }
    // A floor under the shape battery, so a shrinking list cannot pass by being empty.
    expect(perturbed.length).toBeGreaterThanOrEqual(9);
  });

  it("refuses a rational the TIGHTENED tolerance would still admit", () => {
    // The case that separates the two halves of this fix. Tightening 1e-9 to 1e-12 refuses
    // every construction the strictness report demonstrated, so with the tolerance alone the
    // rest of this file goes green and the exact reader carries nothing — measured, by
    // disabling `exactSurdValue` in `compareConstantRadical` and watching all ten pass.
    //
    // `1136689/1607521` is the next continued-fraction convergent but four of `1/sqrt(2)`. It
    // sits 1.368e-13 from the key, INSIDE a 1e-12 window and 15 characters long, so no
    // tolerance a legitimate spelling survives can refuse it: the worst disagreement between
    // two spellings of one value in this cohort is 2.093e-16, and a window below that is not
    // available. Only the exact reading refuses it, and it refuses it for the reason that is
    // actually true — a rational is not an irrational, at any distance.
    expect(grade("shape:surd-over-integer", "1136689/1607521")).toBe(
      "incorrect/value_mismatch",
    );
  });

  it("refuses the 1e-8 absolute error the relative branch used to admit", () => {
    expect(grade("shape:coefficient-surd", "9*sqrt(13)+1/100000000")).toBe(
      "incorrect/value_mismatch",
    );
    expect(grade("shape:two-surd-sum", "4*sqrt(6)+3*sqrt(5)+1/100000000")).toBe(
      "incorrect/value_mismatch",
    );
  });
});

describe("every legitimate spelling of the right value is still read as equal", () => {
  it("accepts the item's own key on every shape", () => {
    for (const { id, key } of KEYS) {
      expect(grade(id, key), `key ${key}`).toBe("correct/match");
    }
  });

  it("accepts a reordered coefficient and a leading plus", () => {
    expect(grade("shape:coefficient-surd", "sqrt(13)*9")).toBe("correct/match");
    expect(grade("shape:coefficient-surd", "+9*sqrt(13)")).toBe("correct/match");
    expect(grade("shape:two-surd-sum", "3*sqrt(5)+4*sqrt(6)")).toBe("correct/match");
    expect(grade("shape:surd-over-integer", "(1/2)*sqrt(2)")).toBe("correct/match");
  });

  it("accepts a product of radicals that folds to the key", () => {
    // `sqrt(2)*sqrt(2)*sqrt(2)*3/2` IS `3*sqrt(2)`: the reader has to normalize √2·√2 to 2
    // rather than give up, and has to divide by a rational afterwards.
    expect(grade("shape:bare-surd", "sqrt(2)*sqrt(2)*sqrt(2)*3/2")).toBe("correct/match");
    // Division BY a surd is the other direction of the same requirement. `6/sqrt(2)` IS
    // `3*sqrt(2)`, and the pre-existing form rule refuses it for the unrationalized
    // denominator — `not_simplified` here is the proof the reader read the two as EQUAL,
    // because a reader that had failed to rationalize would say `value_mismatch` instead.
    expect(grade("shape:bare-surd", "6/sqrt(2)")).toBe("incorrect/not_simplified");
  });

  it("refuses an equal-but-unsimplified spelling for its FORM, not its value", () => {
    // The distinction that matters: these are the SAME NUMBER as the key. If exactness had
    // broken the value reading they would come back `value_mismatch`, and the tightening
    // would be refusing correct answers while this file still went green on the line above.
    expect(grade("shape:bare-surd", "sqrt(18)")).toBe("incorrect/not_simplified");
    expect(grade("shape:surd-over-integer-b", "1/sqrt(3)")).toBe(
      "incorrect/not_simplified",
    );
    expect(grade("shape:surd-over-integer", "1/sqrt(2)")).toBe("incorrect/not_simplified");
    expect(grade("shape:rational-key-integer", "sqrt(4)")).toBe("incorrect/not_simplified");
  });

  it("still reports a sign error as a sign error", () => {
    expect(grade("shape:coefficient-surd", "-9*sqrt(13)")).toBe("incorrect/sign_error");
    expect(grade("shape:rational", "-3/5")).toBe("incorrect/sign_error");
  });

  it("still refuses a decimal approximation as a representation miss", () => {
    // `representation: "exact"` owns this refusal and must keep owning it: a learner who
    // types the decimal should be told about the notation, not about the value.
    expect(grade("shape:surd-over-integer", "0.7071067812")).toBe(
      "incorrect/wrong_representation",
    );
  });
});
