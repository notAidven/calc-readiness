import { describe, expect, it } from "vitest";

import { createVersionedAnswerChecker } from "./answer-checker-registry";
import { createD1AnswerChecker, D1_CHECKER_VERSION } from "./d1-answer-checker";
import { D1_SPIKE_ITEMS } from "./d1-checker-fixtures";
import type { CheckAnswerInput } from "./index";
import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
} from "./product-answer-checker";
import { PRODUCT_SPIKE_ITEMS } from "./product-checker-fixtures";

/**
 * Cross-version isolation (Answer_Equivalence_Spec §13.13): a checker-version
 * bump must never silently rescore a historical response. One configured
 * checker grades a mixed bank of locked D1 (v1) items and Phase-2 product (v2)
 * items by routing each request to the checker for its declared
 * `equivalence_checker_version`. An unknown version fails closed.
 */
const checker = createVersionedAnswerChecker(
  new Map([
    [D1_CHECKER_VERSION, createD1AnswerChecker({ itemVersions: D1_SPIKE_ITEMS })],
    [
      PRODUCT_CHECKER_VERSION,
      createProductAnswerChecker({ itemVersions: PRODUCT_SPIKE_ITEMS }),
    ],
  ]),
);

describe("versioned answer checker (cross-version isolation, §13.13)", () => {
  it("routes a v1 item to the locked D1 checker (returns checker_version 1)", () => {
    expect(
      checker({
        raw_answer: "-8",
        item_version_id: "spike:num-s:signed:v1",
        equivalence_checker_version: 1,
      }),
    ).toMatchObject({
      status: "correct",
      reason_code: "match",
      client_correct: true,
      checker_version: 1,
    });
  });

  it("routes a v2 item to the product checker (returns checker_version 2)", () => {
    expect(
      checker({
        raw_answer: "2*sqrt(2)",
        item_version_id: "spike:rad-1:sqrt:v2",
        equivalence_checker_version: 2,
      }),
    ).toMatchObject({
      status: "correct",
      reason_code: "match",
      client_correct: true,
      checker_version: 2,
    });
  });

  it("fails closed on an unknown checker version", () => {
    expect(
      checker({
        raw_answer: "2*sqrt(2)",
        item_version_id: "spike:rad-1:sqrt:v2",
        equivalence_checker_version: 3,
      }),
    ).toMatchObject({
      status: "scoring_error",
      reason_code: "checker_version_unsupported",
      client_correct: false,
      checker_version: 3,
    });
  });

  it("never rescores a historical v1 response under v2", () => {
    const historical: CheckAnswerInput = {
      raw_answer: "-8",
      item_version_id: "spike:num-s:signed:v1",
      equivalence_checker_version: 1,
    };
    // Recorded under v1, it is graded by the D1 checker.
    expect(checker(historical).checker_version).toBe(1);
    // Requesting the SAME response under v2 routes to the product checker,
    // which does not know a v1 item and fails closed rather than re-grading it.
    const rescored = checker({ ...historical, equivalence_checker_version: 2 });
    expect(rescored).toMatchObject({
      status: "scoring_error",
      reason_code: "item_version_not_found",
      client_correct: false,
      checker_version: 2,
    });
  });

  it("never rescores a historical v2 response under v1", () => {
    const historical: CheckAnswerInput = {
      raw_answer: "2*sqrt(2)",
      item_version_id: "spike:rad-1:sqrt:v2",
      equivalence_checker_version: 2,
    };
    expect(checker(historical).checker_version).toBe(2);
    const rescored = checker({ ...historical, equivalence_checker_version: 1 });
    expect(rescored).toMatchObject({
      status: "scoring_error",
      reason_code: "item_version_not_found",
      client_correct: false,
      checker_version: 1,
    });
  });

  it("grades a mixed v1/v2 bank, each item under exactly its declared version", () => {
    expect(
      checker({
        raw_answer: "3/4",
        item_version_id: "spike:num-f:reduced:v1",
        equivalence_checker_version: 1,
      }),
    ).toMatchObject({ status: "correct", checker_version: 1 });
    expect(
      checker({
        raw_answer: "{-2, 2}",
        item_version_id: "spike:lin-1:set:v2",
        equivalence_checker_version: 2,
      }),
    ).toMatchObject({ status: "correct", checker_version: 2 });
  });
});
