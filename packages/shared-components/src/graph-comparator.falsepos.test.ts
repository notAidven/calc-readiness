import { describe, expect, it } from "vitest";

import { createGraphComparator, GRAPH_COMPARATOR_VERSION } from "./graph-comparator";
import { GRAPH_FALSE_POSITIVE_CASES, GRAPH_SPIKE_ITEMS } from "./graph-comparator-fixtures";

/**
 * The FALSE-POSITIVE tolerance battery (Answer_Equivalence_Spec §8, §13.15). This
 * is the dedicated guard that the geometric comparator does NOT accept a wrong
 * graph: every case feeds a slightly-off curve, a wrong/missing feature, a wrong
 * region, or a just-past-tolerance near-miss and asserts the comparator rejects it
 * with the correct reason code. A single silent `correct` here is a graph
 * false-positive — exactly the risk Section 8 flags for geometric scoring.
 */
const comparator = createGraphComparator({ itemVersions: GRAPH_SPIKE_ITEMS });

describe("graph comparator false-positive battery (Section 8): wrong graphs are rejected", () => {
  it("has broad coverage (curve, feature, scalar, region, near-miss, adversarial)", () => {
    // A tripwire so the battery cannot be silently gutted to a handful of cases.
    expect(GRAPH_FALSE_POSITIVE_CASES.length).toBeGreaterThanOrEqual(15);
  });

  it("never grades a wrong graph correct", () => {
    for (const testCase of GRAPH_FALSE_POSITIVE_CASES) {
      const result = comparator({
        response: testCase.response,
        item_version_id: testCase.item_version_id,
        equivalence_checker_version: GRAPH_COMPARATOR_VERSION,
      });
      expect(result.status, testCase.name).not.toBe("correct");
      expect(result.client_correct, testCase.name).toBe(false);
    }
  });

  it.each(GRAPH_FALSE_POSITIVE_CASES)(
    "rejects with the correct reason: $name",
    ({ item_version_id, response, expected_status, expected_reason }) => {
      const result = comparator({
        response,
        item_version_id,
        equivalence_checker_version: GRAPH_COMPARATOR_VERSION,
      });
      expect(result).toMatchObject({
        status: expected_status,
        reason_code: expected_reason,
        client_correct: false,
        checker_version: GRAPH_COMPARATOR_VERSION,
      });
    },
  );
});
