import { describe, expect, it } from "vitest";

import type { AnswerDefinition } from "./checker-core";
import { SAMPLE_TOLERANCE } from "./domain-sampling";
import type { AnswerSpec } from "./index";
import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
  type ProductItemVersion,
} from "./product-answer-checker";

/**
 * `SAMPLE_TOLERANCE` is set from a MEASUREMENT of what double arithmetic loses, not from a
 * round number.
 *
 * ## The defect this file was written for (strictness report L10)
 *
 * The RAD.4 sampler compared 23 probe points at 1e-9, and that window is wide enough to accept
 * expressions that are not the key anywhere:
 *
 *     d2.rad4.extract.l2:practice:60021, key "y^3*sqrt(y)"
 *     "y^3*sqrt(y)*(1+1/100000000000)"                        -> ACCEPTED
 *     "y^3*sqrt(y)+(y-1)*(y-2)*(y-3)/10000000000000"          -> ACCEPTED
 *
 * The first differs from the key at every real `y > 0`; the second adds a cubic that is nonzero
 * at all 23 probes and grows without bound. Both were accepted on 28 of 28 served items,
 * because their relative deviation at each probe is ~1e-11 to 1e-13 — inside 1e-9.
 *
 * ## The measurement behind 1e-12
 *
 * The old tolerance was justified, correctly, by a real requirement: `sqrt(y^7)` and
 * `y^3*sqrt(y)` are the same function and agree only to the last bits of a double, so a
 * comparison that demanded equality would refuse a right answer. The question is only how much
 * room that needs. Measured over all 28 keys served in this cohort, at the 23 real probe points,
 * across 117 legitimate alternate spellings: the worst relative disagreement between two
 * spellings of the same function is **2.408e-16** (`y^3*sqrt(y)` against `sqrt(y^6)*sqrt(y)`).
 * 1e-12 keeps four orders of magnitude above that, and the demonstrated constructions sit at
 * 1e-11.
 *
 * ## What this does NOT do, recorded so nobody reads it as more than it is
 *
 * Tightening a tolerance narrows an attack, it does not close one. The perturbation size is the
 * attacker's choice, so `(key)*(1+1/10000000000000)` — 1e-13 — still passes, and so does the
 * SECOND construction the report demonstrated, whose cubic over 1e13 deviates by only ~1.4e-14
 * relative. **One of the two demonstrated constructions is refused by this change and one is
 * not**, and the last test below pins both rather than leaving the difference to be
 * rediscovered. Only an exact comparison of variable radicals would make this comparator sound,
 * which is a larger change than a constant and is not attempted here. Note also that the
 * fixed 23-point SET remains fixed: the
 * vanishing-product attack that defeats the exponent battery needs 206 characters against a
 * 128-character input cap, so it is unreachable today and the cap is what makes it so.
 */

function radicalSpec(): AnswerSpec {
  return {
    answer_type: "numeric",
    equivalence: "exact_value",
    representation: "exact",
    simplification: "simplified_radical",
    required_form: null,
    required_notation: "none",
    precision: null,
    unit_policy: "none",
  };
}

/** Read off the served RAD.4 cohort: an extracted power, a coefficient shape, and an abs shape. */
const ITEMS: readonly ProductItemVersion[] = [
  {
    item_version_id: "rad4:extract",
    node_id: "RAD.4",
    answer: {
      answer_key: "y^3*sqrt(y)",
      allowed_symbols: ["y"],
      answer_spec: radicalSpec(),
    } as AnswerDefinition,
  },
  {
    item_version_id: "rad4:coefficient",
    node_id: "RAD.4",
    answer: {
      answer_key: "3*t^2*sqrt(3*t)",
      allowed_symbols: ["t"],
      answer_spec: radicalSpec(),
    } as AnswerDefinition,
  },
  {
    item_version_id: "rad4:magnitude",
    node_id: "RAD.4",
    answer: {
      answer_key: "abs(n^3)",
      allowed_symbols: ["n"],
      answer_spec: radicalSpec(),
    } as AnswerDefinition,
  },
];

const check = createProductAnswerChecker({ itemVersions: ITEMS });

function grade(id: string, rawAnswer: unknown): string {
  const result = check({
    raw_answer: rawAnswer,
    item_version_id: id,
    equivalence_checker_version: PRODUCT_CHECKER_VERSION,
  });
  return `${result.status}/${result.reason_code}`;
}

describe("the tolerance is tight enough to refuse the demonstrated constructions", () => {
  it("is 1e-12, the measured value", () => {
    // Pinned so the constant cannot drift back without the measurement being redone.
    expect(SAMPLE_TOLERANCE).toBe(1e-12);
  });

  it("refuses a key scaled by 1 + 1e-11, on every shape in the cohort", () => {
    for (const { item_version_id: id, answer } of ITEMS) {
      const attack = `(${String(answer.answer_key)})*(1+1/100000000000)`;
      expect(attack.length).toBeLessThanOrEqual(128);
      expect(grade(id, attack), attack).toBe("incorrect/value_mismatch");
    }
    expect(ITEMS.length).toBeGreaterThanOrEqual(3);
  });

  it("refuses a key plus a cubic that is nonzero at every probe", () => {
    // The additive family, at a divisor whose deviation the new tolerance can see: the cubic
    // reaches ~1.9e-8 in absolute terms over the probe range, or ~1.4e-11 relative.
    expect(grade("rad4:extract", "y^3*sqrt(y)+(y-1)*(y-2)*(y-3)/10000000000")).toBe(
      "incorrect/value_mismatch",
    );
  });
});

describe("every legitimate spelling still has the room it needs", () => {
  it("accepts the key and its exactly-equivalent rewrites", () => {
    expect(grade("rad4:extract", "y^3*sqrt(y)")).toBe("correct/match");
    expect(grade("rad4:extract", "(y^3*sqrt(y))")).toBe("correct/match");
    expect(grade("rad4:extract", "y*y^2*sqrt(y)")).toBe("correct/match");
    expect(grade("rad4:extract", "sqrt(y)*y^3")).toBe("correct/match");
    expect(grade("rad4:coefficient", "3*t^2*sqrt(3*t)")).toBe("correct/match");
    expect(grade("rad4:coefficient", "sqrt(3*t)*3*t^2")).toBe("correct/match");
    expect(grade("rad4:magnitude", "abs(n^3)")).toBe("correct/match");
    expect(grade("rad4:magnitude", "|n^3|")).toBe("correct/match");
  });

  it("refuses the unsimplified radical for its FORM, which proves the value read survived", () => {
    // `sqrt(y^7)` IS `y^3*sqrt(y)` and they agree only to ~2.4e-16, which is the entire reason
    // a tolerance exists here. If 1e-12 were too tight these would come back
    // `value_mismatch`, and the tightening would be refusing correct answers while the
    // refusal-side tests above still went green.
    expect(grade("rad4:extract", "sqrt(y^7)")).toBe("incorrect/not_simplified");
    expect(grade("rad4:extract", "sqrt(y^6)*sqrt(y)")).toBe("incorrect/not_simplified");
    expect(grade("rad4:coefficient", "sqrt(27*t^5)")).toBe("incorrect/not_simplified");
  });

  it("still separates the functions the straddle-zero battery exists to separate", () => {
    // `n^3` is not `|n^3|`, and a positive-only battery would have called them equal.
    expect(grade("rad4:magnitude", "n^3")).toBe("incorrect/value_mismatch");
    expect(grade("rad4:extract", "y^3*sqrt(y)*2")).toBe("incorrect/value_mismatch");
  });
});

describe("what a tightened tolerance still cannot do", () => {
  it("accepts a perturbation below the tolerance, including one the report demonstrated", () => {
    // NOT an endorsement: a record of the residual, so that "L10 is fixed" cannot be read off
    // the passing tests above. Narrowing the window moves the attack, it does not remove it;
    // the perturbation size is the attacker's to choose. Making these lines fail requires an
    // exact comparison of variable radicals, and whoever writes one should delete this test
    // rather than widen anything.
    expect(grade("rad4:extract", "(y^3*sqrt(y))*(1+1/10000000000000)")).toBe(
      "correct/match",
    );
    // The SECOND of the two constructions the strictness report demonstrated is in this class
    // and not in the refused one: its cubic is divided by 1e13, which puts its deviation at
    // ~1.4e-14 relative — under 1e-12 and only two orders above the 2.4e-16 floor legitimate
    // spellings need, so no tolerance can separate the two. Reported as still-accepted rather
    // than quietly left out of the refusal list above.
    expect(grade("rad4:extract", "y^3*sqrt(y)+(y-1)*(y-2)*(y-3)/10000000000000")).toBe(
      "correct/match",
    );
  });
});
