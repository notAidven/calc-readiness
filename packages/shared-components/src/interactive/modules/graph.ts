import { createElement, type ReactElement } from "react";

import { scoringError, withVersion } from "../../checker-core";
import {
  GRAPH_COMPARATOR_VERSION,
  type GraphComparator,
  type GraphExpected,
  type GraphResponsePayload,
  scoreGraphResponse,
  validateExpected,
} from "../../graph-comparator";
import { GraphInput } from "../../graph-input";
import { type GraphWorkspace, toGraphWorkspace } from "../../graph-workspace";
import type { CheckAnswerResult } from "../../index";
import type { InteractiveAnswerModule, InteractiveInputProps } from "../types";

/**
 * The `graph` answer type recast as the FIRST {@link InteractiveAnswerModule}. It
 * is a thin ADAPTER: `toWorkspace`/`compare`/`validateSpec` delegate verbatim to
 * the existing `toGraphWorkspace`, `scoreGraphResponse`, and `validateExpected`,
 * and `Input` wraps the existing `GraphInput`. There is intentionally NO new graph
 * behavior here — a graph item grades byte-for-byte identically through this module
 * as it does through `createGraphComparator` directly.
 */

/**
 * Wrap the existing self-checking {@link GraphInput} in the uniform interactive
 * props. The graph widget manages its own draft state and reports through
 * `onChecked` (it does not use the controlled `value`/`onChange` seam), so those
 * props are accepted for contract uniformity and ignored here.
 */
function GraphModuleInput(
  props: InteractiveInputProps<GraphWorkspace, GraphResponsePayload>,
): ReactElement {
  const { comparator, onChecked } = props;
  return createElement(GraphInput, {
    itemVersionId: props.itemVersionId,
    checkerVersion: GRAPH_COMPARATOR_VERSION,
    comparator: comparator as unknown as GraphComparator,
    workspace: props.workspace,
    label: props.label,
    labelledBy: props.labelledBy,
    disabled: props.disabled,
    feedbackMode: props.feedbackMode,
    onChecked: onChecked
      ? (submission) => onChecked({ value: submission.response, result: submission.result })
      : undefined,
  });
}

export const graphInteractiveModule: InteractiveAnswerModule<
  GraphExpected,
  GraphWorkspace,
  GraphResponsePayload
> = {
  answer_type: "graph",
  comparator_version: GRAPH_COMPARATOR_VERSION,
  toWorkspace(spec) {
    return toGraphWorkspace(spec);
  },
  compare(spec, payload): CheckAnswerResult {
    // Delegate verbatim; guard so a malformed spec fails closed rather than throws
    // (the contract requires `compare` never throw). Valid specs are unaffected.
    try {
      return scoreGraphResponse(spec, payload);
    } catch {
      return withVersion(scoringError("graph_scoring_error"), GRAPH_COMPARATOR_VERSION);
    }
  },
  validateSpec(spec) {
    const issue = validateExpected(spec);
    return issue ? withVersion(issue, GRAPH_COMPARATOR_VERSION) : undefined;
  },
  Input: GraphModuleInput,
};
