/**
 * The pre-submit format guards the two practice surfaces share, keyed off the ITEM.
 *
 * `LessonPractice` and `InfiniteDrill` both refuse a few shapes before calling the
 * grader, so a learner who pasted the prompt back gets told to compute it rather than
 * scored on an expression the exact-value path would have evaluated for them. Deciding
 * that from `answer_spec.answer_type` alone does not work, because `numeric` is not one
 * kind of answer: `numericAnswer()` means a plain number, and `radicalAnswer()`,
 * `exactTrigValueAnswer()` and `exactRadianAnswer()` all declare `numeric` too while
 * keying `sqrt(7)/2`, `sqrt(2)/2` and `pi/3`.
 *
 * That is how RAD.1 practice came to refuse its own answer key. The guard shipped for
 * D1's order-of-operations prompts, where every `numeric` key really is a number; the D2
 * radical pools arrived three days later and inherited a gate demanding a single number
 * on items whose prompts ask for a radical. Nothing graded wrong, because nothing was
 * graded at all — the surface returned before `submitAnswer`, so the attempt was neither
 * `incorrect` nor `invalid_input` and `Answer_Equivalence_Spec` §12 never saw it.
 */

import type { FrozenItem } from "@cr/item-bank";

import { isNumericLiteral } from "./answerFormat";

/**
 * The ASCII function-call spelling of a square root: how a prompt TELLS a learner what to type.
 *
 * Rendered mathematics in this bank is LaTeX — `$\sqrt{36}$` — so the ASCII spelling appears in
 * a prompt only as notation guidance. That is measured rather than assumed: of the 41 served
 * prompts carrying it, all 41 declare `representation: "exact"`, and
 * `submitGuardExactValue.test.ts` fails if an item whose answer is a computed number ever
 * acquires one.
 */
const INSTRUCTS_ASCII_SQRT = /sqrt\s*\(/;

/**
 * True when the item's own prompt invites an answer written as a radical.
 *
 * Both conjuncts are load-bearing, and each is injected against in
 * `submitGuardExactValue.test.ts` rather than argued for here:
 *
 *  - **the prompt instructs `sqrt(...)`.** Without it the gate stands down on the 56 armed
 *    TRG.2 / TRG.4 / TRG.9 items whose prompts say "Enter it as a fraction" and whose answer
 *    space holds no radical at all — swept over 40 fresh draws of every one of the bank's 159
 *    numeric practice templates, exactly two produce both a numeric-literal key and a radical
 *    key, and both instruct `sqrt(...)` on 100% of their arming draws. So the prompt is not a
 *    proxy for the answer space; on this bank it is an exact reading of it.
 *  - **the item declares an exact answer.** Without it a prompt that merely PRINTS a root and
 *    asks for its value would disarm the gate: `d2.rad1.eval.l1` reads "each side is
 *    $\sqrt{36}$ meters. Work out that length." and keys `6`, where a root is the paste and not
 *    the answer. Those 26 items declare `representation: "any"`, which is the distinction the
 *    prompt alone cannot draw.
 */
export function invitesRadicalNotation(item: FrozenItem): boolean {
  return (
    item.answer.answer_spec.representation === "exact" &&
    INSTRUCTS_ASCII_SQRT.test(item.prompt)
  );
}

/**
 * True when this item's answer must be typed as a single evaluated number.
 *
 * The item's OWN answer key is the FLOOR, and it is the only reading that cannot go stale: a
 * guard that admits nothing its item accepts makes that item unanswerable, so an item whose key
 * the guard itself would refuse can never have been asking for a number. That is the RAD.1
 * reading and it stays exactly as it was — nothing whose key is not a plain number arms.
 *
 * It is not sufficient on its own, because a key is a fact about the DRAW and this gate needs to
 * know what the ITEM ASKS FOR. `d9.trg3.exact-value-circle.l3` tells the learner to "Write any
 * square root as `sqrt(...)`" and keys `-1/2` on the 37% of its draws whose exact value is a
 * plain fraction, so the gate armed and refused the notation the prompt had just instructed —
 * discarding the archetypal unit-circle miss (right magnitude, wrong reference angle) instead of
 * scoring it. That is RAD.1 inverted: there the guard refused the item's own key, here the key
 * is fine and the instructed notation is not. Five served instances over two templates were in
 * that state; {@link invitesRadicalNotation} is what stands the gate down on them, and only on
 * them.
 */
export function requiresNumericLiteral(item: FrozenItem | undefined): boolean {
  if (item?.answer.answer_spec.answer_type !== "numeric") {
    return false;
  }
  const key = item.answer.answer_key;
  if (typeof key !== "string" || !isNumericLiteral(key)) {
    return false;
  }
  return !invitesRadicalNotation(item);
}
