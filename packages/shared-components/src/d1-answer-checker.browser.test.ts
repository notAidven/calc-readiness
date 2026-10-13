import { describe, expect, it } from "vitest";

import { createD1AnswerChecker, D1_CHECKER_VERSION } from "./d1-answer-checker";
import { D1_GOLDEN_CASES, D1_SPIKE_ITEMS } from "./d1-checker-fixtures";

const checker = createD1AnswerChecker({
  itemVersions: D1_SPIKE_ITEMS,
});

describe("D1 browser/server parity fixtures", () => {
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
});
