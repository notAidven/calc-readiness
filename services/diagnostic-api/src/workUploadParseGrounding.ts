import { PRACTICE_AUTHORITY_ITEMS_BY_ID } from "@cr/item-bank";

/**
 * **THE ONE FILE IN THE PARSE LANE LICENSED TO READ THE ITEM BANK.**
 *
 * `test/workUploadParseStaysFeedbackOnly.test.ts` used to forbid the whole lane from naming
 * `@cr/item-bank`, and its comment named this exact use as the thing it was refusing:
 *
 * > *"A subtle route in, and the one most likely to look like a good idea: pulling an item's
 * > canonical `worked_solution` in to check the reading against it. That would be a real
 * > improvement to the READING and it would also put the parse one field away from being a
 * > grader, so it is forbidden here rather than left to judgement. If it is ever wanted, it
 * > is a design change with this test as the place to argue it."*
 *
 * This file is that argument, and the guard now holds it as a named licence that fails in
 * both directions rather than as a blanket ban.
 *
 * ## The argument: reading an item and grading one are different capabilities
 *
 * The invariant is that a reading never becomes evidence about a learner (§1, §3.5, §7 of
 * `docs/Photo_Work_Upload_Scope.md`). What threatens it is the ability to take a learner's
 * answer and return a verdict on it. That capability is a CHECKER, and no checker is reached
 * from here: this module has one export, it takes an item id, and there is no parameter
 * anywhere in it that a learner's work could be passed through.
 *
 * The old ban was a proxy for the real rule, and it was a good proxy while nothing needed
 * the bank. It stopped being the right shape once the coaching layer arrived, because
 * coaching a learner without the canonical solution means coaching them against nothing:
 * `docs/Photo_Work_Upload_AI_Feedback_Eval.md` §3.3 scores feedback 0 when it is *"generic
 * chatbot filler with no item-specific anchor"*, and an anchor is precisely what the bank
 * holds. So the ban narrows to the capability that was always the danger, and gains the rule
 * that expresses it directly: nothing in this lane may import a checker.
 *
 * **Stated plainly, because it would be dishonest to imply otherwise:** `@cr/item-bank`'s own
 * index reaches `@cr/components` transitively, since `practice-authority.ts` builds a checker
 * beside the map this file reads. That is a fact about the bank's module graph and it is
 * already true of `economy.ts` in this same service. The claim here is narrower and it is the
 * one that matters: no checker is imported, constructed or called on this path, and no
 * function exported from this file will accept a learner's answer.
 *
 * ## Grounding is best-effort, and its absence is not a failure
 *
 * `PRACTICE_AUTHORITY_ITEMS_BY_ID` covers the learner-practice population, which is where
 * `surface = 'lesson-practice'` uploads come from. A CFU upload, a post-diagnostic review
 * upload, or a hand-authored golden item may not resolve. When it does not, the parse falls
 * back to exactly the reading it shipped before this file existed: a transcript and a suspect
 * line, with no coaching. Missing grounding must never cost a learner their reading.
 */

/** How much of an item may travel into a prompt. See {@link groundingForItem}. */
const MAX_SOLUTION_STEPS = 12;
const MAX_HINTS = 3;
const MAX_FIELD_LENGTH = 400;

/**
 * What the coaching layer is allowed to know about the problem the photo is of.
 *
 * Four read-only strings and nothing else. There is no item id, no node id, no difficulty and
 * no checker version on this type, because a caller holding one of those is a caller who
 * could look something else up; the point of the narrowing is that what crosses back into
 * `workUploadParse.ts` is reference text, not a handle on the bank.
 */
export interface ItemGrounding {
  /** The question as the learner was asked it. */
  readonly prompt: string;
  /** The item's own progressive hints, which by construction never state the answer. */
  readonly hints: readonly string[];
  /** The canonical solution path, in order. The reference a divergence is measured against. */
  readonly workedSolution: readonly string[];
  /**
   * The keyed answer, when the item has one.
   *
   * Carried for ONE purpose, and it is a negative one: `workUploadParse.ts` refuses to show
   * coaching that contains it. It is not sent as a field, and there is no line in the prompt
   * that labels a value as the answer.
   *
   * **That is emphatically not the same as keeping the answer from the model, and it would
   * be worth nothing to pretend otherwise.** {@link workedSolution} is a correct solution
   * path, so its last line generally IS the answer; and a model that can read a page of
   * algebra can solve the problem on it unaided anyway. Withholding is therefore not the
   * control here — the check on the REPLY is, and it is exact containment rather than a
   * judgement, so it holds whether the model got the value from the reference path, from the
   * photograph, or from doing the arithmetic itself. `workUploadParse.test.ts` proves that
   * by handing the model coaching built out of the key and watching the whole pair be
   * refused.
   *
   * Truncating the path before the answer was tried and rejected: the normalized containment
   * this key is compared under matches `5` inside `15`, so trimming on it removes most of
   * the method along with the answer, and coaching with no method to point at is the generic
   * filler `docs/Photo_Work_Upload_AI_Feedback_Eval.md` §3.3 scores 0.
   */
  readonly answerKey?: string;
}

/** Trim, collapse and cap one authored string. The bank's text is trusted; its length is not. */
function bounded(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_FIELD_LENGTH);
}

function boundedList(values: readonly string[], limit: number): readonly string[] {
  return values
    .filter((value) => typeof value === "string")
    .map(bounded)
    .filter((value) => value !== "")
    .slice(0, limit);
}

/**
 * The canonical solution for one served item, or `undefined` when we do not hold one.
 *
 * The only export, and it takes an item id. That signature is the invariant: there is no
 * argument here a learner's work could arrive through, so no call to this module can be a
 * request to judge anything.
 */
export function groundingForItem(itemVersionId: string): ItemGrounding | undefined {
  const item = PRACTICE_AUTHORITY_ITEMS_BY_ID.get(itemVersionId);
  if (item === undefined) {
    return undefined;
  }
  const workedSolution = boundedList(item.worked_solution, MAX_SOLUTION_STEPS);
  // An item with no solution path grounds nothing. Returning it would hand the model an empty
  // reference and let it invent one, which is worse than the ungrounded reading we already
  // know how to produce.
  if (workedSolution.length === 0) {
    return undefined;
  }
  const answerKey =
    typeof item.answer.answer_key === "string" ? bounded(item.answer.answer_key) : "";
  return {
    prompt: bounded(item.prompt),
    hints: boundedList(item.hints, MAX_HINTS),
    workedSolution,
    ...(answerKey === "" ? {} : { answerKey }),
  };
}
