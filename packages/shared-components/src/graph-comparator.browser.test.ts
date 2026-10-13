import { describe, expect, it } from "vitest";

import { createGraphComparator, GRAPH_COMPARATOR_VERSION } from "./graph-comparator";
import {
  GRAPH_FALSE_POSITIVE_CASES,
  GRAPH_GOLDEN_CASES,
  GRAPH_SPIKE_ITEMS,
} from "./graph-comparator-fixtures";

const comparator = createGraphComparator({ itemVersions: GRAPH_SPIKE_ITEMS });

describe("graph comparator browser/server parity fixtures (Section 13.15)", () => {
  it.each(GRAPH_GOLDEN_CASES)(
    "$name",
    ({ item_version_id, response, expected_status, expected_reason }) => {
      const result = comparator({
        response,
        item_version_id,
        equivalence_checker_version: GRAPH_COMPARATOR_VERSION,
      });

      expect(result).toMatchObject({
        status: expected_status,
        reason_code: expected_reason,
        client_correct: expected_status === "correct",
        checker_version: GRAPH_COMPARATOR_VERSION,
      });
    },
  );

  // The false-positive battery must reject identically in the browser (§13.15): a
  // wrong graph the server rejects must never sneak through as a client-side pass.
  it.each(GRAPH_FALSE_POSITIVE_CASES)(
    "false-positive parity: $name",
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
