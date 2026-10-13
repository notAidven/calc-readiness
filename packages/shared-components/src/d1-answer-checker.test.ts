import { describe, expect, it } from "vitest";

import { createD1AnswerChecker, D1_CHECKER_VERSION } from "./d1-answer-checker";
import { D1_GOLDEN_CASES, D1_SPIKE_ITEMS } from "./d1-checker-fixtures";

const checker = createD1AnswerChecker({
  itemVersions: D1_SPIKE_ITEMS,
});

describe("D1 answer checker", () => {
  it.each(D1_GOLDEN_CASES)(
    "$name",
    ({ item_version_id, raw_answer, expected_status, expected_reason }) => {
      const result = checker({
        raw_answer,
        item_version_id,
        equivalence_checker_version: D1_CHECKER_VERSION,
      });

      expect(result).toMatchObject({
        status: expected_status,
        reason_code: expected_reason,
        client_correct: expected_status === "correct",
        checker_version: D1_CHECKER_VERSION,
      });
    },
  );

  it("covers all six D1 MVP nodes", () => {
    expect(new Set(D1_SPIKE_ITEMS.map((item) => item.node_id))).toEqual(
      new Set(["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"]),
    );
  });

  it("fails closed for a checker-version mismatch", () => {
    expect(
      checker({
        raw_answer: "-8",
        item_version_id: "spike:num-s:signed:v1",
        equivalence_checker_version: 2,
      }),
    ).toMatchObject({
      status: "scoring_error",
      reason_code: "checker_version_unsupported",
      client_correct: false,
      checker_version: D1_CHECKER_VERSION,
    });
  });

  it("fails closed when the immutable item version is missing", () => {
    expect(
      checker({
        raw_answer: "1",
        item_version_id: "missing:v1",
        equivalence_checker_version: D1_CHECKER_VERSION,
      }),
    ).toMatchObject({
      status: "scoring_error",
      reason_code: "item_version_not_found",
      client_correct: false,
    });
  });

  it("rejects unsafe or out-of-scope syntax as invalid student input", () => {
    expect(
      checker({
        raw_answer: "sqrt(196)",
        item_version_id: "spike:num-2:precedence:v1",
        equivalence_checker_version: D1_CHECKER_VERSION,
      }),
    ).toMatchObject({
      status: "invalid_input",
      reason_code: "unsupported_syntax",
    });

    expect(
      checker({
        raw_answer: "2^1000",
        item_version_id: "spike:num-2:precedence:v1",
        equivalence_checker_version: D1_CHECKER_VERSION,
      }),
    ).toMatchObject({
      status: "invalid_input",
      reason_code: "unsupported_exponent",
    });

    expect(
      checker({
        raw_answer: "1/x",
        item_version_id: "spike:num-3:distributive:v1",
        equivalence_checker_version: D1_CHECKER_VERSION,
      }),
    ).toMatchObject({
      status: "invalid_input",
      reason_code: "unsupported_symbolic_denominator",
    });

    expect(
      checker({
        raw_answer: "999999999999999999999",
        item_version_id: "spike:num-2:precedence:v1",
        equivalence_checker_version: D1_CHECKER_VERSION,
      }),
    ).toMatchObject({
      status: "invalid_input",
      reason_code: "number_too_large",
    });
  });
});
