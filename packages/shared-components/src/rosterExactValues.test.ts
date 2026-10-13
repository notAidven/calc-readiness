// The repo ships no `@types/node`, by the decision recorded at the head of
// `packages/item-bank/src/d6.test.ts`, which makes the same source-reading check. `packages/
// economy` takes the other route open to it and excludes its fs-reading tests from tsc in its
// own `tsconfig.json`; shared-components' has no such exclusion and a test file is not the
// place to add one. The call runs under vitest's node runtime.
// @ts-expect-error - no @types/node in this tree
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { AnswerDefinition } from "./checker-core";
import type { AnswerSpec } from "./index";
import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
  type ProductItemVersion,
} from "./product-answer-checker";

/**
 * A SET OF NUMBERS a learner wrote is graded exactly, so a value that is not a root cannot be
 * mistaken for one and a wrong extra claim cannot be deduped away.
 *
 * ## The defect this file was written for (strictness report L3/L4/L5)
 *
 * `toValueSet` collapsed each member to a JS double and compared with `floatEqual`'s 1e-9, in
 * two places at once — the DEDUPE that builds the set, and the MEMBERSHIP test that compares
 * the two sets. Both are reachable from the full submit path on a served item, and the second
 * consequence is worse than the first:
 *
 *  - `{-9, 7.0000000001}` graded CORRECT on `d3.lin5.shift.l1:practice:110015`, whose key is
 *    `{-9, 7}`. `7.0000000001` does not satisfy the item's equation.
 *  - `{-9, 7, 7.0000000001}` graded CORRECT on the same item. The learner asserted a THIRD
 *    solution to a two-solution equation, and the dedupe erased the claim before the
 *    comparison could grade it, so `extra_solution` never fired. A wrong answer was not
 *    merely accepted, it was deleted.
 *  - the exclusions half of a `rational_answer` collapsed the same way:
 *    `["-1", "-7.0000000001"]` graded CORRECT on `d5.rat2.vial.l2:practice:70007`, and
 *    `-7.0000000001` is not a pole of anything.
 *
 * Measured through `submitThroughPracticeSurface` over the served pool at the anchor SHA:
 * 229 of 240 solution-set items accepted a nudged non-root member, 229 of 240 accepted the
 * correct roster plus a spurious near-member, and 126 of 126 rational items with a nonzero
 * exclusion accepted a nudged non-pole. The other 11 rosters are ones where the nudge could
 * not be CONSTRUCTED (an all-zero or non-numeric roster), not ones that resisted it.
 *
 * ## Why exactness costs no legitimate spelling
 *
 * `checker-core` configures mathjs `number: "Fraction"`, so a rational member is already read
 * EXACTLY on the way in: `2/5`, `0.4` and `4/10` are one and the same `Fraction`. The old code
 * evaluated to that exact value and then threw the exactness away at `Number(...)`. Carrying
 * the `Fraction` through costs nothing and is asserted below on all three spellings.
 *
 * ## The one behaviour that does change, recorded on purpose
 *
 * A member written as a TEN-PLACE decimal approximation of a non-terminating rational — `1/3`
 * as `0.3333333333` — used to land inside 1e-9 and grade correct. It is now a miss. That is
 * the same wrongness as `7.0000000001` and there is no line between them, and the surface was
 * already incoherent about it: `0.333` and `0.333333` were ALREADY refused on those same
 * items, so the old rule accepted a rounded decimal only at exactly the precision no learner
 * writes. Five served items have a non-terminating key and are the whole population of the
 * change (`{-9, 1/3}`, `{-4, 2/3}`, `{8/3}`, `{12/7}`, `{60/17}`); the fifth case below pins
 * both directions of it so a later widening cannot happen silently.
 *
 * ## The exact-roster branch is a SECOND path and keeps its tolerance
 *
 * EL.6 rosters (`representation: "exact"`) hold members like `ln(3)`, which has no rational
 * value at all, so that branch must compare floats — `ln(9)/2` and `ln(3)` are the same number
 * and agree only to the last bit or two of a double. The case below asserts that spelling is
 * accepted, which is the reason the branch exists; and it asserts `{log(3), log(5)}` is still
 * refused against `{ln(3), ln(5)}`, which is the EL.6 protection `EXACT_ROSTER_SCOPE` exists
 * for and which the pool's own `spike:el-6:*Roster:v2` golden cases pin from both sides.
 */

function spec(overrides: Partial<AnswerSpec>): AnswerSpec {
  return {
    answer_type: "numeric",
    equivalence: "exact_value",
    representation: "any",
    simplification: "none",
    required_form: null,
    required_notation: "none",
    precision: null,
    unit_policy: "none",
    ...overrides,
  };
}

/**
 * The specs are read off the served instances named in the report, not invented:
 * `d3.lin5.shift.l1:practice:110015`, `d4.pol4.formula.l3:practice:121120`,
 * `d5.rat2.vial.l2:practice:70007` and `d8.el6.exp-quadratic.l3:practice:90029`.
 */
const ROSTER_SPEC = spec({
  answer_type: "solution_set",
  equivalence: "structural",
  representation: "any",
});
const EXACT_ROSTER_SPEC = spec({
  answer_type: "solution_set",
  equivalence: "structural",
  representation: "exact",
});
const RATIONAL_SPEC = spec({
  answer_type: "rational_answer",
  equivalence: "structural",
  representation: "any",
});

const ITEMS: readonly ProductItemVersion[] = [
  {
    item_version_id: "roster:two-root",
    node_id: "LIN.5",
    answer: { answer_key: "{-9, 7}", answer_spec: ROSTER_SPEC } as AnswerDefinition,
  },
  {
    item_version_id: "roster:fifths",
    node_id: "POL.4",
    answer: { answer_key: "{2/5}", answer_spec: ROSTER_SPEC } as AnswerDefinition,
  },
  {
    item_version_id: "roster:thirds",
    node_id: "POL.4",
    answer: { answer_key: "{-9, 1/3}", answer_spec: ROSTER_SPEC } as AnswerDefinition,
  },
  {
    item_version_id: "roster:exact-logs",
    node_id: "EL.6",
    answer: {
      answer_key: "{ln(3), ln(5)}",
      answer_spec: EXACT_ROSTER_SPEC,
    } as AnswerDefinition,
  },
  {
    item_version_id: "rational:two-poles",
    node_id: "RAT.2",
    answer: {
      answer_key: "x + 7",
      allowed_symbols: ["x"],
      excluded_values: ["-1", "-7"],
      answer_spec: RATIONAL_SPEC,
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

const exclusions = (values: readonly string[]): unknown => ({
  expression: "x + 7",
  excluded_values: values,
});

describe("a roster member is compared exactly, not within 1e-9", () => {
  it("refuses a member that is not a root, nudged 1e-10 off one", () => {
    expect(grade("roster:two-root", "{-9, 7.0000000001}")).toBe("incorrect/value_mismatch");
  });

  it("grades a spurious extra near-member instead of deduping it away", () => {
    // The dedupe is the half that erased the claim: this must reach `extra_solution`, not
    // merely be "not correct".
    expect(grade("roster:two-root", "{-9, 7, 7.0000000001}")).toBe(
      "incorrect/extra_solution",
    );
  });

  it("still accepts the key, in any member order and on all three separators", () => {
    expect(grade("roster:two-root", "{-9, 7}")).toBe("correct/match");
    expect(grade("roster:two-root", "{7, -9}")).toBe("correct/match");
    expect(grade("roster:two-root", "{7; -9}")).toBe("correct/match");
    expect(grade("roster:two-root", "{7 and -9}")).toBe("correct/match");
    expect(grade("roster:two-root", "-9, 7")).toBe("correct/match");
  });

  it("still accepts every exact spelling of the same rational value", () => {
    // The whole argument for exactness costing nothing: mathjs is configured `number:
    // "Fraction"`, so these are one value and not three.
    expect(grade("roster:fifths", "{2/5}")).toBe("correct/match");
    expect(grade("roster:fifths", "{0.4}")).toBe("correct/match");
    expect(grade("roster:fifths", "{4/10}")).toBe("correct/match");
    expect(grade("roster:fifths", "{0.40}")).toBe("correct/match");
    expect(grade("roster:fifths", "{40/100}")).toBe("correct/match");
    expect(grade("roster:fifths", "{0.41}")).toBe("incorrect/value_mismatch");
  });

  it("refuses a truncated decimal for a non-terminating root at EVERY precision", () => {
    // Both directions of the one behaviour change. `0.333` was refused before this change
    // and still is; `0.3333333333` was ACCEPTED before it and is the reason the change is
    // not behaviour-preserving. Recorded here so a later widening has to edit this line.
    expect(grade("roster:thirds", "{-9, 1/3}")).toBe("correct/match");
    expect(grade("roster:thirds", "{-9, 0.333}")).toBe("incorrect/value_mismatch");
    expect(grade("roster:thirds", "{-9, 0.333333}")).toBe("incorrect/value_mismatch");
    expect(grade("roster:thirds", "{-9, 0.3333333333}")).toBe("incorrect/value_mismatch");
  });
});

describe("an excluded-value list is compared exactly too", () => {
  it("refuses a nudged non-pole in place of a real one", () => {
    expect(grade("rational:two-poles", exclusions(["-1", "-7.0000000001"]))).toBe(
      "incorrect/missing_exclusion",
    );
  });

  it("grades a spurious extra exclusion instead of deduping it away", () => {
    expect(grade("rational:two-poles", exclusions(["-1", "-7", "-7.0000000001"]))).toBe(
      "incorrect/extra_exclusion",
    );
  });

  it("still accepts the item's own exclusions, reordered and respelled", () => {
    expect(grade("rational:two-poles", exclusions(["-1", "-7"]))).toBe("correct/match");
    expect(grade("rational:two-poles", exclusions(["-7", "-1"]))).toBe("correct/match");
    expect(grade("rational:two-poles", exclusions(["-1.0", "-14/2"]))).toBe(
      "correct/match",
    );
    expect(grade("rational:two-poles", exclusions(["-1"]))).toBe(
      "incorrect/missing_exclusion",
    );
  });
});

describe("the exact-roster branch is a second path and keeps a tolerance", () => {
  it("accepts a member whose spelling agrees only to double precision", () => {
    // `ln(9)/2` IS `ln(3)`, and the two differ in the last bits of a double. An exact
    // comparison would refuse it, which is why this branch must not be folded into the
    // rational one.
    expect(grade("roster:exact-logs", "{ln(3), ln(5)}")).toBe("correct/match");
    expect(grade("roster:exact-logs", "{ln(9)/2, ln(5)}")).toBe("correct/match");
    expect(grade("roster:exact-logs", "{ln(5), ln(3)}")).toBe("correct/match");
  });

  it("still refuses a common log where a natural log is the answer", () => {
    // The EL.6 protection `EXACT_ROSTER_SCOPE` exists for; it must survive this change.
    expect(grade("roster:exact-logs", "{log(3), log(5)}")).toBe("incorrect/value_mismatch");
  });
});

/**
 * The population, derived from the source rather than written down here.
 *
 * `toValueSet` is the shared reader, and a caller that reads a value set without going
 * through it would be outside anything above. So the guard is: read the checker's own source,
 * find every function that calls `toValueSet`, and require the set to be exactly the two this
 * file covers. A third caller — a future `compareRoster` — fails here rather than shipping
 * uncovered, and a caller that stops calling it fails too, so the list cannot sit here
 * describing something that has moved.
 */
describe("every reader of a value set is covered above", () => {
  const COVERED_CALLERS: readonly string[] = [
    "compareSolutionSet",
    "compareRationalAnswer",
  ];

  it("is exactly the two comparators this file grades", () => {
    const source = readFileSync(
      new URL("./product-answer-checker.ts", import.meta.url),
      "utf8",
    );
    const lines = source.split("\n");
    const callers = new Set<string>();
    let current: string | null = null;
    for (const line of lines) {
      const declaration = line.match(/^function ([A-Za-z0-9_]+)\(/);
      if (declaration?.[1]) {
        current = declaration[1];
      }
      if (/\btoValueSet\(/.test(line) && current && current !== "toValueSet") {
        callers.add(current);
      }
    }
    expect([...callers].sort()).toEqual([...COVERED_CALLERS].sort());
    // A floor under the derivation: containment over an empty set is free, and a regex that
    // silently stops matching would otherwise read as "nothing to cover".
    expect(callers.size).toBeGreaterThanOrEqual(2);
  });

  it("finds no surviving floatEqual comparison on the rational roster path", () => {
    // The dedupe and the membership test were TWO sites, and fixing one reads as fixing
    // both. This asserts the rational path's equality is the exact one by name.
    const source = readFileSync(
      new URL("./product-answer-checker.ts", import.meta.url),
      "utf8",
    );
    const body = source.slice(
      source.indexOf("function toValueSet("),
      source.indexOf("function compareSolutionSet("),
    );
    expect(body).not.toBe("");
    expect(body).not.toMatch(/floatEqual\(/);
  });
});
