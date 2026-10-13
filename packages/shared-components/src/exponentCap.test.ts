import { describe, expect, it } from "vitest";

import type { AnswerDefinition } from "./checker-core";
import { MAX_EXPONENT } from "./checker-core";
import type { AnswerSpec } from "./index";
import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
  readPolynomialCoefficients,
  type ProductItemVersion,
} from "./product-answer-checker";

/**
 * WHAT BOUNDS {@link MAX_EXPONENT} FROM ABOVE, which is the hazard in raising it.
 *
 * The cap was 8, and the archetypal slip on a key of `y^8` — multiplying the exponents where
 * you should add — is `y^16`, so the mistake the item exists to catch was outside the grammar
 * and came back `invalid_input`, which nothing scores. That defect and its population are
 * measured on the learner's own submit path in `apps/web/src/lessons/exponentCap.test.ts`; this
 * file is the other side of the same decision, and it is why the cap is 16 and not 32.
 *
 * The grammar admits NESTING, so a cap of `c` admits `((x + 1)^c)^c`, of degree `c * c`. Degree
 * is what decides which polynomial reading grades it:
 *
 *  - `readExactPolynomial` in `product-answer-checker.ts` runs first and refuses anything past
 *    its own `MAX_READ_DEGREE` (256);
 *  - what it refuses falls through to `math.rationalize`, whose cost is super-exponential in
 *    the degree of a written product — `(x + 1)^5` measured at 122 SECONDS and `(x + 1)^6`
 *    unfinished (`docs/Product_Checker_Poly_Coefficient_Cost.md`).
 *
 * So `MAX_EXPONENT * MAX_EXPONENT <= MAX_READ_DEGREE` is the whole safety argument, and 16 is
 * the largest cap that satisfies it: 16 * 16 is 256 exactly, and a cap of 17 would put a
 * two-level nest at degree 289, over the reader's ceiling and into the cliff. That is asserted
 * BY BEHAVIOUR below rather than by comparing two constants, because `MAX_READ_DEGREE` is
 * private to the reader and the property that matters is the timing, not the arithmetic.
 *
 * Deeper nesting still reaches the fallback — `(((x + 1)^8)^8)^8` is degree 512 — and that was
 * already true at a cap of 8: measured on this tree at `b88bb0c7` + the exact reader, the reader
 * declines it in 93ms and the grade call had not returned when it was killed at 147s. Raising
 * the cap to 16 does not make the fallback newly reachable; it moves which degree lands there
 * (4096 instead of 512, both already unusable). Closing that is `MAX_READ_DEGREE`'s owner's to
 * do, and it is recorded as a carry rather than fixed here.
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
    item_version_id: "cap:standard:v2",
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
    item_version_id: "cap:power:v2",
    node_id: "EXP.1",
    answer: {
      answer_key: `x^${MAX_EXPONENT}`,
      allowed_symbols: ["x"],
      answer_spec: spec({ equivalence: "symbolic" }),
    } satisfies AnswerDefinition,
  },
];

const checker = createProductAnswerChecker({ itemVersions: items });

function grade(itemVersionId: string, rawAnswer: string) {
  return checker({
    raw_answer: rawAnswer,
    item_version_id: itemVersionId,
    equivalence_checker_version: PRODUCT_CHECKER_VERSION,
  });
}

describe("the boundary the cap draws", () => {
  it("reads an exponent at the cap, and refuses the one above it", () => {
    expect(grade("cap:power:v2", `x^${MAX_EXPONENT}`)).toMatchObject({
      status: "correct",
      client_correct: true,
    });
    // The cap still EXISTS: raising it is not the same as removing it, and an unbounded
    // exponent is what `MAX_AST_NODES` and this check together keep out of the readers.
    expect(grade("cap:power:v2", `x^${MAX_EXPONENT + 1}`)).toMatchObject({
      status: "invalid_input",
      reason_code: "unsupported_exponent",
    });
  });

  it("scores the doubling slip on a key at the cap's half", () => {
    // The shape the whole change is for, at this package's level: `x^8` doubled is `x^16`, and
    // it has to come back as a MISS rather than as something nothing scores.
    const half = MAX_EXPONENT / 2;
    expect(Number.isInteger(half), `${MAX_EXPONENT} is not twice a whole exponent`).toBe(
      true,
    );
    expect(grade("cap:power:v2", `x^${MAX_EXPONENT}`)).toMatchObject({ status: "correct" });
    expect(grade("cap:power:v2", `x^${half}`)).toMatchObject({
      status: "incorrect",
      client_correct: false,
    });
  });
});

describe("a two-level nest at the cap stays inside the exact reader", () => {
  /**
   * The guard that stops the cap being raised past the reader's ceiling.
   *
   * The reader assertion comes FIRST deliberately. If the cap ever exceeds the reader's
   * ceiling, `readPolynomialCoefficients` returns `null` and this fails on that line in
   * milliseconds; letting the grade call go first would instead wedge the worker on
   * `rationalize`, which vitest cannot time out because the call is synchronous.
   */
  it("reads it exactly, and grades it promptly", () => {
    const nested = `((x + 1)^${MAX_EXPONENT})^${MAX_EXPONENT}`;
    const readStarted = Date.now();
    const coefficients = readPolynomialCoefficients(nested);
    const readElapsed = Date.now() - readStarted;
    expect(
      coefficients,
      `${nested} is degree ${MAX_EXPONENT * MAX_EXPONENT}, past the exact reader's ceiling: ` +
        "the cap is too high and rationalize will be asked for this",
    ).not.toBeNull();
    expect(coefficients).toHaveLength(MAX_EXPONENT * MAX_EXPONENT + 1);
    // A binomial expansion, so both ends are 1 and the second coefficient is the degree.
    expect(coefficients?.[0]).toBe(1);
    expect(coefficients?.[1]).toBe(MAX_EXPONENT * MAX_EXPONENT);
    expect(coefficients?.[MAX_EXPONENT * MAX_EXPONENT]).toBe(1);
    expect(readElapsed, `the reader took ${readElapsed}ms on ${nested}`).toBeLessThan(2000);

    const gradeStarted = Date.now();
    const result = grade("cap:standard:v2", nested);
    const gradeElapsed = Date.now() - gradeStarted;
    expect(result, `${nested} -> ${result.status}/${result.reason_code}`).toMatchObject({
      status: "incorrect",
      client_correct: false,
    });
    // Two seconds for what measures in single-digit milliseconds: the assertion is "the cliff
    // is not reachable at this cap", not "this runner is this fast".
    expect(gradeElapsed, `${nested} took ${gradeElapsed}ms to grade`).toBeLessThan(2000);
  });
});
