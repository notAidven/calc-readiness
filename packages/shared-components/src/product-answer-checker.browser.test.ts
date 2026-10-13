import { describe, expect, it } from "vitest";

import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
} from "./product-answer-checker";
import { PRODUCT_GOLDEN_CASES, PRODUCT_SPIKE_ITEMS } from "./product-checker-fixtures";

const checker = createProductAnswerChecker({ itemVersions: PRODUCT_SPIKE_ITEMS });

describe("product (Phase-2) browser/server parity fixtures", () => {
  it.each(PRODUCT_GOLDEN_CASES)(
    "$name",
    ({ item_version_id, raw_answer, expected_status, expected_reason }) => {
      const result = checker({
        raw_answer,
        item_version_id,
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      });

      expect(result).toMatchObject({
        status: expected_status,
        reason_code: expected_reason,
        client_correct: expected_status === "correct",
        checker_version: PRODUCT_CHECKER_VERSION,
      });
    },
  );
});
