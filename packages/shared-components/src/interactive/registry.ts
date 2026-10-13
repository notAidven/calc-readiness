import type { AnswerType } from "../index";
import { exprBuilderInteractiveModule } from "./modules/expr-builder";
import { graphInteractiveModule } from "./modules/graph";
import { numberLineInteractiveModule } from "./modules/number-line";
import type { InteractiveAnswerModule } from "./types";

/**
 * The registry of interactive answer types. Each entry recasts a scored answer type
 * as an {@link InteractiveAnswerModule}. `graph` was the first instance; `number_line`
 * is the second; `expr_builder` is the third. Text answer types
 * (numeric/expression/...) are NOT interactive and are absent here.
 */
export const INTERACTIVE_ANSWER_TYPES: Readonly<
  Partial<Record<AnswerType, InteractiveAnswerModule>>
> = {
  graph: graphInteractiveModule as unknown as InteractiveAnswerModule,
  number_line: numberLineInteractiveModule as unknown as InteractiveAnswerModule,
  expr_builder: exprBuilderInteractiveModule as unknown as InteractiveAnswerModule,
};

/** The interactive module for an answer type, or `undefined` if it is not interactive. */
export function getInteractiveModule(
  answerType: AnswerType,
): InteractiveAnswerModule | undefined {
  return INTERACTIVE_ANSWER_TYPES[answerType];
}

/** Whether an answer type is graded through the interactive module path. */
export function isInteractiveAnswerType(answerType: AnswerType): boolean {
  return getInteractiveModule(answerType) !== undefined;
}

/**
 * The canonical correct payload for an interactive item's spec, or `undefined` when
 * the answer type is not interactive or its module does not project one. The item
 * bank's authoring validation grades this through the interactive checker so a newly
 * authored interactive pool is self-consistent (its own key grades correct).
 */
export function canonicalInteractivePayload(
  answerType: AnswerType,
  spec: unknown,
): unknown {
  const module = getInteractiveModule(answerType);
  return module?.canonicalPayload?.(spec);
}
