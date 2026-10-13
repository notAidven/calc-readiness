import { createGraphComparator, GRAPH_COMPARATOR_VERSION } from "@cr/components";
import { describe, expect, it } from "vitest";

import { GRAPH_ITEM_SLICES, toGraphItemVersions } from "./graph";

/**
 * Node <-> Chromium parity for the authored graph slices (Answer_Equivalence_Spec
 * §13.7 / §13.15): the client and the authoritative server must return identical
 * verdicts for every authored valid / alternate-valid / near-miss response.
 */
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

describe("authored graph slices browser/server parity", () => {
  for (const slice of GRAPH_ITEM_SLICES) {
    it(`${slice.item_version_id} grades valid + alternates correct`, () => {
      expect(grade(slice.item_version_id, slice.valid).status).toBe("correct");
      for (const alternate of slice.alternate_valid) {
        expect(grade(slice.item_version_id, alternate).status).toBe("correct");
      }
    });

    it(`${slice.item_version_id} rejects every near-miss with its reason`, () => {
      for (const miss of slice.near_miss) {
        const graded = grade(slice.item_version_id, miss.response);
        expect(graded.status).not.toBe("correct");
        expect(graded.reason).toBe(miss.reason);
      }
    });
  }
});
