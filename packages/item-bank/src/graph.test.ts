import { createGraphComparator, GRAPH_COMPARATOR_VERSION } from "@cr/components";
import { describe, expect, it } from "vitest";

import { GRAPH_ITEM_SLICES, GRAPH_SLICE_NODES, toGraphItemVersions } from "./graph";
import { validateGraphPool } from "./graph-validate";

const comparator = createGraphComparator({
  itemVersions: toGraphItemVersions(GRAPH_ITEM_SLICES),
});

function grade(
  itemVersionId: string,
  response: unknown,
): { status: string; reason: string } {
  const result = comparator({
    response,
    item_version_id: itemVersionId,
    equivalence_checker_version: GRAPH_COMPARATOR_VERSION,
  });
  return { status: result.status, reason: result.reason_code };
}

describe("authored graph item slices (v2 geometric comparator, Node)", () => {
  it("validateGraphPool reports no issues over the four wave-2 nodes", () => {
    expect(validateGraphPool(GRAPH_ITEM_SLICES, { nodes: GRAPH_SLICE_NODES })).toEqual([]);
  });

  it("covers exactly POL.5, FUN.4, FUN.9, RAT.5", () => {
    expect(new Set(GRAPH_ITEM_SLICES.map((slice) => slice.node_id))).toEqual(
      new Set(GRAPH_SLICE_NODES),
    );
    expect(new Set(GRAPH_SLICE_NODES)).toEqual(
      new Set(["POL.5", "FUN.4", "FUN.9", "RAT.5"]),
    );
  });

  it("has unique slice ids", () => {
    const ids = GRAPH_ITEM_SLICES.map((slice) => slice.item_version_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("§13.5/§13.6 — every slice has >=2 alternate-valid and >=1 near-miss", () => {
    for (const slice of GRAPH_ITEM_SLICES) {
      expect(slice.alternate_valid.length, slice.item_version_id).toBeGreaterThanOrEqual(2);
      expect(slice.near_miss.length, slice.item_version_id).toBeGreaterThanOrEqual(1);
    }
  });

  for (const slice of GRAPH_ITEM_SLICES) {
    describe(`${slice.item_version_id} — "${slice.prompt.slice(0, 48)}..."`, () => {
      it("grades the valid response and every alternate-valid response correct", () => {
        expect(grade(slice.item_version_id, slice.valid).status).toBe("correct");
        for (const [index, alternate] of slice.alternate_valid.entries()) {
          expect(
            grade(slice.item_version_id, alternate).status,
            `alternate_valid[${index}]`,
          ).toBe("correct");
        }
      });

      it("grades every near-miss not-correct with its noted reason code", () => {
        for (const [index, miss] of slice.near_miss.entries()) {
          const graded = grade(slice.item_version_id, miss.response);
          expect(graded.status, `near_miss[${index}]`).not.toBe("correct");
          expect(graded.reason, `near_miss[${index}]`).toBe(miss.reason);
        }
      });
    });
  }
});
