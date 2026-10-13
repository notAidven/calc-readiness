import { practicePlaceholder } from "./answerFormat";
import { checkerVersionForId, practiceChecker, practiceItemsById } from "./practiceChecker";
import { unreadableAnswer } from "./unreadableAnswer";

/**
 * GRADING ONE CRISIS ANSWER, for all four crisis surfaces at once.
 *
 * The Hard Winter, the plague, the succession and the intrusion each had their own
 * `gradeXAnswer` — four byte-identical copies of the same four lines, each returning
 * `practiceChecker(...).client_correct`. Collapsing the verdict to a boolean is what made
 * `invalid_input` indistinguishable from a wrong answer on all four, and each surface then
 * BANKED that boolean into its round's verdict list, so an answer the reader could not read cost
 * the player the crisis consequence.
 *
 * Four copies of a mechanic is also precisely how the population of a fix gets scoped too
 * narrowly (`.cursor/rules/qa-verification.mdc`), so the four copies are now one function. A
 * fifth crisis gets the behaviour by calling this rather than by remembering to.
 *
 * ## `correct: null` is the whole of the fix at the seam
 *
 * Every one of these surfaces already holds its verdict as `boolean | null`, where `null` means
 * "not answered yet" — the field is live, the Check button is there, nothing is banked. That is
 * exactly the state an unreadable answer should leave the question in, so returning `null` here
 * puts each surface in the right state without touching its reducer, its consequence model or
 * its banked-verdict list. What the surface has to add is the NOTE, so the press is not silent.
 *
 * A widget payload passes through as-is, exactly as `LessonPractice` does: the checker's
 * `raw_answer` takes a string or a structured payload and dispatches on the item's answer type.
 */
export interface GradedCrisisAnswer {
  /**
   * `true`/`false` when the checker graded it, and `null` when it could not READ it — in which
   * case nothing may be banked, because there is no verdict to bank.
   */
  correct: boolean | null;
  /** What to tell the learner, when the answer could not be read. */
  unreadable: string | null;
}

export function gradeCrisisAnswer(
  itemVersionId: string,
  rawAnswer: string | Record<string, unknown>,
): GradedCrisisAnswer {
  const result = practiceChecker({
    raw_answer: rawAnswer,
    item_version_id: itemVersionId,
    equivalence_checker_version: checkerVersionForId(itemVersionId),
  });
  const item = practiceItemsById.get(itemVersionId);
  const unreadable = unreadableAnswer(result, rawAnswer, {
    allowedSymbols: item?.answer.allowed_symbols,
    notationLine: item
      ? practicePlaceholder(
          item.answer.answer_spec,
          item.answer.allowed_symbols,
          item.answer.answer_key,
        )
      : undefined,
  });
  return unreadable
    ? { correct: null, unreadable: unreadable.message }
    : { correct: result.client_correct, unreadable: null };
}
