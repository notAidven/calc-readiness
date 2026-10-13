import { describe, expect, it } from "vitest";

import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
} from "./product-answer-checker";
import { PRODUCT_SPIKE_ITEMS } from "./product-checker-fixtures";

/**
 * Parser-fuzz + property battery (Answer_Equivalence_Spec §13.8, §13.10). The
 * checker must fail closed on adversarial input (never throw, never a silent
 * `correct`) and its structural verdicts must be invariant to the orderings the
 * math they encode is invariant to (factor permutation, set/union order).
 */
const checker = createProductAnswerChecker({ itemVersions: PRODUCT_SPIKE_ITEMS });

const FUZZ_ITEM_IDS: readonly string[] = PRODUCT_SPIKE_ITEMS.map(
  (item) => item.item_version_id,
);

const VALID_STATUSES: ReadonlySet<string> = new Set([
  "correct",
  "incorrect",
  "invalid_input",
  "unsupported_expression",
  "scoring_error",
]);

/** §13.10 adversarial inputs, plus over-length / dangling-token variants. */
const ADVERSARIAL_INPUTS: readonly { label: string; raw: string }[] = [
  { label: "unbalanced open paren", raw: "(" },
  { label: "reversed parens", raw: ")(" },
  { label: "double slash", raw: "1//2" },
  { label: "dangling exponent", raw: "x^" },
  { label: "empty string", raw: "" },
  { label: "symbol soup", raw: "@@@" },
  { label: "division by zero", raw: "1/0" },
  { label: "dangling function", raw: "sqrt(" },
  { label: "unbalanced bracket", raw: "[1, 2" },
  { label: "leading operator", raw: "* 3" },
  { label: "200-char digit run", raw: "9".repeat(200) },
  { label: "overlong expression", raw: "9 + ".repeat(60) },
  // New v2 grammar (EXP.1 negative exponents, TRG.1 pi): must still fail closed.
  { label: "out-of-bounds negative exponent", raw: "x^-100" },
  { label: "in-bounds negative exponent", raw: "x^-2" },
  { label: "bare pi constant", raw: "pi" },
  { label: "dangling pi product", raw: "pi *" },
];

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) {
    return [items.slice()];
  }
  const out: T[][] = [];
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const perm of permutations(rest)) {
      out.push([item, ...perm]);
    }
  });
  return out;
}

describe("product checker parser fuzz (§13.10): garbage is unanswered, never wrong", () => {
  it.each(ADVERSARIAL_INPUTS)(
    "treats $label as unanswered across every product category (no throw, never correct)",
    ({ raw }) => {
      for (const item_version_id of FUZZ_ITEM_IDS) {
        const run = () =>
          checker({
            raw_answer: raw,
            item_version_id,
            equivalence_checker_version: PRODUCT_CHECKER_VERSION,
          });
        expect(run, `${item_version_id} must not throw`).not.toThrow();
        const result = run();
        expect(
          VALID_STATUSES.has(result.status),
          `${item_version_id} returned an unknown status ${result.status}`,
        ).toBe(true);
        expect(
          result.status,
          `${item_version_id} must not accept ${JSON.stringify(raw)}`,
        ).not.toBe("correct");
        expect(result.client_correct).toBe(false);
        expect(result.checker_version).toBe(PRODUCT_CHECKER_VERSION);
      }
    },
  );

  it("also fails closed on non-string/adversarial raw types", () => {
    for (const raw_answer of [null, undefined, [], {}, Number.NaN, () => 1]) {
      const run = () =>
        checker({
          raw_answer,
          item_version_id: "spike:num-2:v2",
          equivalence_checker_version: PRODUCT_CHECKER_VERSION,
        });
      expect(run).not.toThrow();
      const result = run();
      expect(result.status).not.toBe("correct");
      expect(result.client_correct).toBe(false);
    }
  });
});

describe("product checker structural properties (§13.8)", () => {
  const FACTOR_CASES = [
    { item_version_id: "spike:pol-2:factor:v2", factors: ["(x + 2)", "(x + 3)"] },
    {
      item_version_id: "spike:pol-2:factorConst:v2",
      factors: ["2", "(x + 2)", "(x + 3)"],
    },
  ];

  it.each(FACTOR_CASES)(
    "factoring is invariant to factor permutation ($item_version_id)",
    ({ item_version_id, factors }) => {
      const verdicts = permutations(factors).map((order) =>
        checker({
          raw_answer: order.join("*"),
          item_version_id,
          equivalence_checker_version: PRODUCT_CHECKER_VERSION,
        }),
      );
      expect(verdicts.length).toBeGreaterThan(1);
      for (const verdict of verdicts) {
        expect(verdict).toMatchObject({ status: "correct", reason_code: "match" });
      }
      // Every ordering yields the identical verdict: no order dependence.
      const [first] = verdicts;
      for (const verdict of verdicts) {
        expect(verdict.status).toBe(first?.status);
        expect(verdict.reason_code).toBe(first?.reason_code);
      }
    },
  );

  it("solution_set is order-insensitive (roster + bare-list forms agree)", () => {
    const forms = [
      ...permutations(["-2", "2"]).map((order) => `{${order.join(", ")}}`),
      ...permutations(["-2", "2"]).map((order) => order.join(", ")),
    ];
    for (const raw_answer of forms) {
      expect(
        checker({
          raw_answer,
          item_version_id: "spike:lin-1:set:v2",
          equivalence_checker_version: PRODUCT_CHECKER_VERSION,
        }),
        `roster ${raw_answer}`,
      ).toMatchObject({ status: "correct", reason_code: "match" });
    }
  });

  it("interval union is order-insensitive", () => {
    for (const order of permutations(["(-inf, -1)", "(2, inf)"])) {
      expect(
        checker({
          raw_answer: order.join(" U "),
          item_version_id: "spike:lin-1:union:v2",
          equivalence_checker_version: PRODUCT_CHECKER_VERSION,
        }),
        `union ${order.join(" U ")}`,
      ).toMatchObject({ status: "correct", reason_code: "match" });
    }
  });
});
