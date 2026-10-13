import {
  type AnswerDefinition,
  scoringError,
  unsupported,
  withVersion,
} from "../checker-core";
import type { AnswerChecker, CheckAnswerInput, CheckAnswerResult } from "../index";
import { getInteractiveModule } from "./registry";

/**
 * The dispatching checker for interactive answer types. It mirrors
 * `createProductAnswerChecker`: keyed by immutable `item_version_id`,
 * version-gated on `equivalence_checker_version`, and never throwing. It routes an
 * item to its {@link InteractiveAnswerModule} by `answer_spec.answer_type` and
 * grades `raw_answer` against the item's private `interactive_spec`.
 *
 * Version 2, aligned with the graph and product comparators so a single
 * `equivalence_checker_version` selects the matching runtime.
 */
export const INTERACTIVE_CHECKER_VERSION = 2;

export interface InteractiveItemVersion {
  item_version_id: string;
  node_id: string;
  answer: AnswerDefinition;
}

export interface InteractiveCheckerOptions {
  checkerVersion?: number;
  itemVersions: readonly InteractiveItemVersion[];
}

export function createInteractiveAnswerChecker({
  checkerVersion = INTERACTIVE_CHECKER_VERSION,
  itemVersions,
}: InteractiveCheckerOptions): AnswerChecker {
  const items = new Map(itemVersions.map((item) => [item.item_version_id, item]));
  return (input: CheckAnswerInput): CheckAnswerResult => {
    if (input.equivalence_checker_version !== checkerVersion) {
      return withVersion(scoringError("checker_version_unsupported"), checkerVersion);
    }
    const item = items.get(input.item_version_id);
    if (!item) {
      return withVersion(scoringError("item_version_not_found"), checkerVersion);
    }
    const def = item.answer;
    const module = getInteractiveModule(def.answer_spec.answer_type);
    if (!module || def.interactive_spec === undefined) {
      return withVersion(unsupported("unsupported_answer_type"), checkerVersion);
    }
    return module.compare(def.interactive_spec, input.raw_answer);
  };
}
