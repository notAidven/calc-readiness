import { scoringError, withVersion } from "../../../checker-core";
import type { InteractiveAnswerModule } from "../../types";
import {
  canonicalNumberLinePayload,
  NUMBER_LINE_COMPARATOR_VERSION,
  type NumberLineExpected,
  type NumberLinePayload,
  type NumberLineWorkspace,
  scoreNumberLineResponse,
  toNumberLineWorkspace,
  validateNumberLineExpected,
} from "./comparator";
import { NumberLineInput } from "./NumberLineInput";

/**
 * The `number_line` answer type assembled as an {@link InteractiveAnswerModule} —
 * the second module after `graph`, and the reference for a comparator-authored (not
 * adapter-wrapped) interactive type. `toWorkspace` strips the answer key to counts +
 * axis config; `compare` delegates to the pure {@link scoreNumberLineResponse} and
 * fails closed if it ever throws (the contract requires `compare` never throw); and
 * `Input` is the controlled {@link NumberLineInput} widget.
 */
export const numberLineInteractiveModule: InteractiveAnswerModule<
  NumberLineExpected,
  NumberLineWorkspace,
  NumberLinePayload
> = {
  answer_type: "number_line",
  comparator_version: NUMBER_LINE_COMPARATOR_VERSION,
  toWorkspace(spec) {
    return toNumberLineWorkspace(spec);
  },
  compare(spec, payload) {
    try {
      return scoreNumberLineResponse(spec, payload);
    } catch {
      return withVersion(
        scoringError("number_line_scoring_error"),
        NUMBER_LINE_COMPARATOR_VERSION,
      );
    }
  },
  validateSpec(spec) {
    const issue = validateNumberLineExpected(spec);
    return issue ? withVersion(issue, NUMBER_LINE_COMPARATOR_VERSION) : undefined;
  },
  canonicalPayload(spec) {
    return canonicalNumberLinePayload(spec);
  },
  Input: NumberLineInput,
};
