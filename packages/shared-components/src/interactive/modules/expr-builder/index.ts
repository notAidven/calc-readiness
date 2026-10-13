import { scoringError, withVersion } from "../../../checker-core";
import type { InteractiveAnswerModule } from "../../types";
import {
  canonicalExprBuilderPayload,
  EXPR_BUILDER_COMPARATOR_VERSION,
  type ExprBuilderPayload,
  type ExprBuilderSpec,
  type ExprBuilderWorkspace,
  scoreExprBuilderResponse,
  toExprBuilderWorkspace,
  validateExprBuilderSpec,
} from "./comparator";
import { ExprBuilderInput } from "./ExprBuilderInput";

/**
 * The `expr_builder` answer type assembled as an {@link InteractiveAnswerModule}, the
 * third module after `graph` and `number_line`. `toWorkspace` strips the answer
 * key to a layout + slots; `compare` delegates to the pure
 * {@link scoreExprBuilderResponse} and fails closed if it ever throws (the contract
 * requires `compare` never throw); and `Input` is the controlled
 * {@link ExprBuilderInput} widget. `comparator_version` aligns with
 * `INTERACTIVE_CHECKER_VERSION` (both 2), matching the graph + number_line modules.
 */
export const exprBuilderInteractiveModule: InteractiveAnswerModule<
  ExprBuilderSpec,
  ExprBuilderWorkspace,
  ExprBuilderPayload
> = {
  answer_type: "expr_builder",
  comparator_version: EXPR_BUILDER_COMPARATOR_VERSION,
  toWorkspace(spec) {
    return toExprBuilderWorkspace(spec);
  },
  compare(spec, payload) {
    try {
      return scoreExprBuilderResponse(spec, payload);
    } catch {
      return withVersion(
        scoringError("expr_builder_scoring_error"),
        EXPR_BUILDER_COMPARATOR_VERSION,
      );
    }
  },
  validateSpec(spec) {
    const issue = validateExprBuilderSpec(spec);
    return issue ? withVersion(issue, EXPR_BUILDER_COMPARATOR_VERSION) : undefined;
  },
  canonicalPayload(spec) {
    return canonicalExprBuilderPayload(spec);
  },
  Input: ExprBuilderInput,
};
