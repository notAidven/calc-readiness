import { describe, expect, it } from "vitest";

import { NUMBER_LINE_COMPARATOR_VERSION, scoreNumberLineResponse } from "./comparator";
import { NUMBER_LINE_FALSE_POSITIVE_CASES, NUMBER_LINE_GOLDEN_CASES } from "./fixtures";

/**
 * Chromium parity for the number_line comparator (Answer_Equivalence_Spec §13.15):
 * the SAME golden + false-positive fixtures the Node unit suite runs must produce
 * BYTE-IDENTICAL verdicts in the browser, so a client-side pass can never disagree
 * with the authoritative server-side grade.
 */
describe("number_line comparator browser/server parity", () => {
  it.each([...NUMBER_LINE_GOLDEN_CASES, ...NUMBER_LINE_FALSE_POSITIVE_CASES])(
    "$name",
    ({ spec, response, expected_status, expected_reason }) => {
      expect(scoreNumberLineResponse(spec, response)).toMatchObject({
        status: expected_status,
        reason_code: expected_reason,
        client_correct: expected_status === "correct",
        checker_version: NUMBER_LINE_COMPARATOR_VERSION,
      });
    },
  );
});
