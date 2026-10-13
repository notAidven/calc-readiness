import { createGraphComparator, GRAPH_COMPARATOR_VERSION } from "@cr/components";

import type { GraphAuthoredSlice } from "./graph/slices";
import { toGraphItemVersions } from "./graph/slices";
import type { ItemBankIssue } from "./validate";

/**
 * Validate an authored GRAPH item pack against the geometric comparator (§8). This
 * is the graph analog of `validateWalkPool`: it grades every authored response
 * through the REAL `createGraphComparator` at the graph checker version (2, the
 * same generation as `PRODUCT_CHECKER_CONFIG`), because a graph response is a
 * structured numeric payload the text product checker cannot grade. It returns
 * every issue found (empty = clean), so a bad answer key or a mis-coded near-miss
 * is caught before the slice is trusted. Wired into CI via `graph.test.ts`.
 *
 * Enforces, per authored slice: the `expected` answer key is well-formed (its
 * `valid` response grades `correct`); every `alternate_valid` grades `correct`
 * (guards an over-strict comparator); every `near_miss` grades NOT-correct with
 * EXACTLY its noted reason code (guards an over-lenient comparator and documents
 * the misconception); plus >=2 alternate-valid and >=1 near-miss per slice (the
 * §13.5 / §13.6 golden-coverage rules) and unique ids over the expected node set.
 */
export function validateGraphPool(
  slices: readonly GraphAuthoredSlice[],
  expected: { nodes: readonly string[] },
): ItemBankIssue[] {
  const issues: ItemBankIssue[] = [];
  const comparator = createGraphComparator({ itemVersions: toGraphItemVersions(slices) });
  const grade = (item_version_id: string, response: unknown) =>
    comparator({
      response,
      item_version_id,
      equivalence_checker_version: GRAPH_COMPARATOR_VERSION,
    });

  const seenIds = new Set<string>();
  const seenNodes = new Set<string>();
  for (const slice of slices) {
    if (seenIds.has(slice.item_version_id)) {
      issues.push({
        severity: "error",
        code: "duplicate_item_version_id",
        message: `item_version_id "${slice.item_version_id}" is used more than once`,
      });
    }
    seenIds.add(slice.item_version_id);
    seenNodes.add(slice.node_id);

    if (!slice.prompt.trim()) {
      issues.push({
        severity: "error",
        code: "empty_prompt",
        message: `${slice.item_version_id} has an empty prompt`,
      });
    }

    // Self-consistency: the author's canonical response grades correct.
    const validResult = grade(slice.item_version_id, slice.valid);
    if (validResult.status !== "correct") {
      issues.push({
        severity: "error",
        code: "answer_key_not_correct",
        message: `${slice.item_version_id} valid response does not grade correct (status=${validResult.status}, reason=${validResult.reason_code})`,
      });
    }

    // §13.5 — every graph slice needs >=2 alternate-valid responses.
    if (slice.alternate_valid.length < 2) {
      issues.push({
        severity: "error",
        code: "insufficient_alternate_valid",
        message: `${slice.item_version_id} has ${slice.alternate_valid.length} alternate-valid responses, needs >=2`,
      });
    }
    for (const [index, alternate] of slice.alternate_valid.entries()) {
      const result = grade(slice.item_version_id, alternate);
      if (result.status !== "correct") {
        issues.push({
          severity: "error",
          code: "alternate_valid_not_correct",
          message: `${slice.item_version_id} alternate_valid[${index}] does not grade correct (status=${result.status}, reason=${result.reason_code})`,
        });
      }
    }

    // §13.6 — every graph slice needs >=1 reason-coded near-miss.
    if (slice.near_miss.length < 1) {
      issues.push({
        severity: "error",
        code: "missing_near_miss",
        message: `${slice.item_version_id} has no near-miss responses, needs >=1`,
      });
    }
    for (const [index, miss] of slice.near_miss.entries()) {
      const result = grade(slice.item_version_id, miss.response);
      if (result.status === "correct") {
        issues.push({
          severity: "error",
          code: "near_miss_graded_correct",
          message: `${slice.item_version_id} near_miss[${index}] ("${miss.reason}") graded correct; a near-miss must never pass`,
        });
        continue;
      }
      if (result.reason_code !== miss.reason) {
        issues.push({
          severity: "error",
          code: "near_miss_reason_mismatch",
          message: `${slice.item_version_id} near_miss[${index}] expected reason "${miss.reason}" but got "${result.reason_code}" (status=${result.status})`,
        });
      }
    }
  }

  // Coverage: every expected node has an authored graph slice.
  for (const node of expected.nodes) {
    if (!seenNodes.has(node)) {
      issues.push({
        severity: "error",
        code: "missing_graph_slice",
        message: `no authored graph slice for node ${node}`,
      });
    }
  }

  return issues;
}
