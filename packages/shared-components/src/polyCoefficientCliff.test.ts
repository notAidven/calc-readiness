import { describe, expect, it } from "vitest";

import type { AnswerDefinition } from "./checker-core";
import type { AnswerSpec } from "./index";
import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
  readPolynomialCoefficients,
  type ProductItemVersion,
} from "./product-answer-checker";

/**
 * The degrees `rationalize` could not read at all, asserted by VALUE.
 *
 * `docs/Product_Checker_Poly_Coefficient_Cost.md` measured `rationalize` on `(x + 1)^5` at
 * **122,347ms** and `(x + 1)^6` unfinished after a further 58 seconds, with
 * `(x+1)(x+2)(x+3)(x+4)(x+5)` unfinished after 270s. `MAX_EXPONENT` is 8, so a learner could type
 * any of them into a factoring or standard-form question and hold their own tab for two minutes.
 * Measured again for this change, out of process because a call that never returns cannot be
 * timed from inside the process it is wedging: `(x + 1)^5` 121,993ms, `(x + 1)^6` and
 * `(x + 1)^8` still running when killed at 315s and 313s. The reader answers all three in under
 * a millisecond, and the full grade path in 1-4ms.
 *
 * Above degree 4 there is nothing to compare the reading TO — that is the point of the change —
 * so these are pinned as values, from Pascal's triangle, which is the cost document's own advice.
 *
 * **A note on how this file fails.** If the ordering is ever reverted so `rationalize` reads
 * first, the value assertions below still fail fast (they call the reader directly), but the
 * full-grade assertions would HANG rather than fail, because vitest cannot time out a
 * synchronous call. A worker wedged on this file is therefore the same signal as a red one, and
 * that is a property of the defect and not of the test.
 */

function spec(overrides: Partial<AnswerSpec>): AnswerSpec {
  return {
    answer_type: "expression",
    equivalence: "structural",
    representation: "any",
    simplification: "none",
    required_form: null,
    required_notation: "none",
    precision: null,
    unit_policy: "none",
    ...overrides,
  };
}

const items: readonly ProductItemVersion[] = [
  {
    item_version_id: "cliff:factored:v2",
    node_id: "POL.2",
    answer: {
      answer_key: "(x + 2)*(x + 3)",
      allowed_symbols: ["x"],
      answer_spec: spec({ required_form: "fully_factored_over_integers" }),
    } satisfies AnswerDefinition,
  },
  {
    item_version_id: "cliff:standard:v2",
    node_id: "POL.1",
    answer: {
      answer_key: "x^2 + 5*x + 6",
      allowed_symbols: ["x"],
      answer_spec: spec({
        equivalence: "symbolic",
        required_form: "is_standard_polynomial",
      }),
    } satisfies AnswerDefinition,
  },
  {
    item_version_id: "cliff:symbolic:v2",
    node_id: "POL.1",
    answer: {
      answer_key: "x^2 + 16x + 63",
      allowed_symbols: ["x"],
      answer_spec: spec({ equivalence: "symbolic" }),
    } satisfies AnswerDefinition,
  },
];

const checker = createProductAnswerChecker({ itemVersions: items });

/** Binomial expansions of `(x + 1)^n`, the shapes the cost document measured. */
const PASCAL: readonly { readonly expression: string; readonly coefficients: number[] }[] =
  [
    { expression: "(x + 1)^5", coefficients: [1, 5, 10, 10, 5, 1] },
    { expression: "(x + 1)^6", coefficients: [1, 6, 15, 20, 15, 6, 1] },
    { expression: "(x + 1)^8", coefficients: [1, 8, 28, 56, 70, 56, 28, 8, 1] },
  ];

describe("the degrees rationalize could not read", () => {
  it.each(PASCAL)(
    "$expression reads as its binomial expansion",
    ({ expression, coefficients }) => {
      expect(readPolynomialCoefficients(expression)).toEqual(coefficients);
    },
  );

  it("a five-bracket product reads too", () => {
    // Unfinished after 270s through `rationalize`.
    expect(readPolynomialCoefficients("(x+1)*(x+2)*(x+3)*(x+4)*(x+5)")).toEqual([
      120, 274, 225, 85, 15, 1,
    ]);
  });

  it.each(
    items.flatMap((item) =>
      PASCAL.map((shape) => ({
        item_version_id: item.item_version_id,
        expression: shape.expression,
      })),
    ),
  )("$item_version_id grades $expression promptly", ({ item_version_id, expression }) => {
    const started = Date.now();
    const result = checker({
      raw_answer: expression,
      item_version_id,
      equivalence_checker_version: PRODUCT_CHECKER_VERSION,
    });
    const elapsed = Date.now() - started;
    // A scored miss, not a refusal: the value is wrong on every one of these items, and that is
    // the verdict a learner is owed.
    expect(result, `${expression} -> ${result.status}/${result.reason_code}`).toMatchObject(
      {
        status: "incorrect",
        client_correct: false,
      },
    );
    // Two seconds for what measures at 1-4ms: the assertion is "the cliff is gone", not "this
    // runner is this fast".
    expect(elapsed, `${item_version_id} :: ${expression} took ${elapsed}ms`).toBeLessThan(
      2000,
    );
  });
});
