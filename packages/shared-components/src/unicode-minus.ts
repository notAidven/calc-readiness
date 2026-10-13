/**
 * The MINUS SIGN a learner reads, folded onto the hyphen a keyboard types.
 *
 * Every prompt, chip and reveal in the app is typeset with KaTeX, and KaTeX paints both a
 * binary and a unary minus as U+2212 MINUS SIGN rather than as U+002D HYPHEN-MINUS. A learner
 * who copies a coefficient off the rendered question therefore submits a character mathjs
 * cannot lex: `math.parse("\u221213")` throws, so every text comparator in the product checker
 * returns `invalid_input`, which §12 scores as UNANSWERED. The learner is told to check the
 * format of an answer that is right.
 *
 * ## Why this is a shared module rather than another local replace
 *
 * Because it already was one, twenty-one times. Twenty-one widgets under
 * `apps/web/src/lessons/interactive/` each carry their own `.replace(/\u2212/g, "-")` before
 * they compare anything, which is the evidence that the glyph genuinely reaches typed input —
 * each of those lines was written after somebody met it. What none of them could do is cover
 * the two CENTRAL graders, the product checker here and the CFU card in `apps/web`, which is
 * where every surface that is not one of those twenty-one is graded.
 *
 * ## Why only this one glyph
 *
 * The fold is the narrowest thing that answers the defect, and deliberately so: U+2212 is the
 * character the renderer PUTS on the screen for the operator the answer grammar already has.
 * `\times` and `\cdot` paint glyphs too, but no comparator has an operator waiting for them and
 * no widget has needed one, so admitting them would be widening the grammar on a guess rather
 * than closing a gap between what is shown and what is read. The precedent in
 * `product-answer-checker.ts` is the same shape: the set-builder parser folds `\u2264`, `\u2265`
 * and `\u2260` onto `<=`, `>=` and `!=`, and stops there.
 *
 * ## Why it cannot move a verdict that is already correct
 *
 * Every comparator except `multiple_choice` sends the answer through mathjs, which cannot read
 * U+2212, so no answer carrying the glyph grades correct today and the fold can only ever turn
 * a refusal into a verdict. `multiple_choice` is the exception because it decides by string
 * identity, and there the fold is safe exactly while no answer KEY carries the glyph — which is
 * measured, over every practice item and every CFU check block in the tree, by
 * `apps/web/src/lessons/unicodeMinusGrading.test.ts` rather than assumed here.
 */

const RENDERED_MINUS = /\u2212/g;

/** Fold every rendered minus in one string onto the ASCII hyphen the grammar reads. */
export function foldRenderedMinus(text: string): string {
  return text.replace(RENDERED_MINUS, "-");
}

/**
 * The maximum nesting the fold walks into a raw answer.
 *
 * A raw answer is `unknown` all the way from the request body, so the walk needs a bound that
 * does not depend on the payload being well shaped. Four is past every shape a comparator reads:
 * a `multipart` answer is one level of parts, and a `rational_answer` is a record holding a
 * string and a list.
 */
const MAX_ANSWER_DEPTH = 4;

/**
 * Fold the rendered minus everywhere in one submitted answer, whatever shape it has.
 *
 * A raw answer is a bare string for most categories, a record keyed by `part_id` for a
 * multipart one, a `{ expression, excluded_values }` record for a rational answer, and a widget
 * payload for an interactive one, so the fold walks the structure rather than assuming a string.
 * Values it does not understand — numbers, booleans, anything past {@link MAX_ANSWER_DEPTH} —
 * come back identical.
 */
export function foldRenderedMinusInAnswer(rawAnswer: unknown, depth = 0): unknown {
  if (typeof rawAnswer === "string") {
    return foldRenderedMinus(rawAnswer);
  }
  if (depth >= MAX_ANSWER_DEPTH) {
    return rawAnswer;
  }
  if (Array.isArray(rawAnswer)) {
    return rawAnswer.map((entry) => foldRenderedMinusInAnswer(entry, depth + 1));
  }
  if (rawAnswer !== null && typeof rawAnswer === "object") {
    return Object.fromEntries(
      Object.entries(rawAnswer).map(([key, value]) => [
        key,
        foldRenderedMinusInAnswer(value, depth + 1),
      ]),
    );
  }
  return rawAnswer;
}
