import { describe, expect, it } from "vitest";

import {
  createGraphComparator,
  GRAPH_COMPARATOR_VERSION,
  scoreGraphResponse,
} from "./graph-comparator";
import { GRAPH_GOLDEN_CASES, GRAPH_SPIKE_ITEMS } from "./graph-comparator-fixtures";

const comparator = createGraphComparator({ itemVersions: GRAPH_SPIKE_ITEMS });

describe("Section 8 geometric graph comparator (spike)", () => {
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

  it("shares the product (v2) generation", () => {
    expect(GRAPH_COMPARATOR_VERSION).toBe(2);
  });

  it("fails closed on a checker-version mismatch", () => {
    expect(
      comparator({
        response: { points: [{ x: 1, y: -4 }] },
        item_version_id: "graph:pol-5:parabola:v2",
        equivalence_checker_version: 1,
      }),
    ).toMatchObject({
      status: "scoring_error",
      reason_code: "checker_version_unsupported",
      client_correct: false,
      checker_version: GRAPH_COMPARATOR_VERSION,
    });
  });

  it("fails closed when the immutable item version is missing", () => {
    expect(
      comparator({
        response: {},
        item_version_id: "graph:missing:v2",
        equivalence_checker_version: GRAPH_COMPARATOR_VERSION,
      }),
    ).toMatchObject({
      status: "scoring_error",
      reason_code: "item_version_not_found",
      client_correct: false,
    });
  });

  it("returns a per-feature breakdown for authoring diagnostics", () => {
    const parabola = GRAPH_SPIKE_ITEMS.find(
      (item) => item.item_version_id === "graph:pol-5:parabola:v2",
    );
    if (!parabola) {
      throw new Error("fixture missing");
    }
    const result = scoreGraphResponse(parabola.expected, {
      samples: [],
      points: [{ x: 1, y: -4 }],
    });
    expect(result.feature_results).toBeDefined();
    expect(result.feature_results?.some((entry) => entry.label === "vertex")).toBe(true);
  });

  it("never throws on adversarial responses (fails closed, never correct)", () => {
    for (const response of [null, undefined, [], 42, "x", { samples: 5 }, () => 1]) {
      for (const item of GRAPH_SPIKE_ITEMS) {
        const run = () =>
          comparator({
            response,
            item_version_id: item.item_version_id,
            equivalence_checker_version: GRAPH_COMPARATOR_VERSION,
          });
        expect(run).not.toThrow();
        expect(run().status).not.toBe("correct");
      }
    }
  });
});
