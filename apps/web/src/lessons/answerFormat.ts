/**
 * Shared answer-format guards for the learner-facing inputs (CFU + practice).
 *
 * Numeric items are graded by `exact_value` equivalence, which EVALUATES the
 * response — so the raw prompt expression (e.g. "2 + 3 × 4") would score correct.
 * These prompts ask the student to compute, so we require the final answer to be a
 * single evaluated number before grading. Keeping this in one place keeps the CFU
 * and practice guards identical.
 */

import {
  type AnswerSpec,
  type AnswerType,
  canonicalizeRootGlyphInput,
  foldTerminalPeriod,
  isInteractiveAnswerType,
} from "@cr/components";

/**
 * A single evaluated number: integer, decimal, or simple fraction (optional sign).
 *
 * The sign is `[+-]` rather than `-?`, and the plus half is not decoration. This predicate
 * is a PRE-SUBMIT gate on five surfaces: a string it refuses never reaches the grader, so
 * the learner is told their answer was an expression instead of being marked on it. `+71`
 * is a single number by any reading, and it is what a learner writes after a question whose
 * whole content is which SIGN the answer carries — which is FUN.5's third paragraph and
 * FUN.9's parity, both of them D6 nodes that end in one signed number.
 *
 * MEASURED before the change, through `gradeCfuAnswer` on the shipped FUN.7 card:
 * `+71` returned `correct=false` with *"Enter your final answer as a single number (for
 * example, 6), not the expression."*, while the same value typed `71` returned
 * `correct=true`. So the note stated the opposite of what was wrong, and the attempt was
 * neither `incorrect` nor `invalid_input` — the same shape of failure `submitGuards.ts`
 * records for the radical keys, one character smaller.
 *
 * It admits strictly more than it did, so no item that required a literal has stopped
 * requiring one: `requiresNumericLiteral` reads an item's own answer KEY, and no key in the
 * bank is written with a leading plus. `radicalAnswerSubmit.test.tsx` pins that cohort per
 * domain and would fail if one moved.
 *
 * ## The two shapes added after the leading plus, and why each is the same defect
 *
 * The SPACES around a slash were the sharpest instance in the tree, because the disagreement
 * was between this predicate and {@link isReducedFraction} twenty lines below it: that one has
 * always written `\s*\/\s*` and this one wrote `\d+\/\d+`, so a card whose profile tolerates
 * `1 / 3` refused it at the gate in front of that profile. Measured through `gradeCfuAnswer` on
 * all four `reduced_fraction` packs, `1/3` graded correct and `1 / 3` was refused with *"Enter
 * your final answer as a single number (for example, 6), not the expression."* — over an answer
 * that is a single number, on the one node whose whole content is writing one.
 *
 * The TERMINAL PERIOD is deferred to `foldTerminalPeriod`, which is the shared rule the product
 * checker retries with, so the pre-submit gate and the grader behind it cannot come apart about
 * the same punctuation. `5.` is the value 5 by any reading and `5.0` was already accepted here.
 *
 * Both widen it, so the paragraph above still holds: nothing that required a literal has
 * stopped requiring one, and an item whose key now READS as a literal (a spaced fraction, say)
 * is an item whose key is a number, which is the one reading `requiresNumericLiteral` was
 * written to take.
 */
export function isNumericLiteral(value: string): boolean {
  return /^[+-]?(\d+(\.\d+)?|\.\d+|\d+\s*\/\s*\d+)$/.test(foldTerminalPeriod(value));
}

/** Shown when a numeric prompt receives an expression instead of the computed value. */
export const NUMERIC_LITERAL_NOTE =
  "Enter your final answer as a single number (for example, 6), not the expression.";

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * True when the value is a fraction written in lowest terms (matches checker rule).
 *
 * Reads through {@link foldTerminalPeriod} for the same reason {@link isNumericLiteral} does,
 * and the pairing is the point: the lowest-terms gate fires only where the numeric gate has
 * already admitted the string, so a period this one refused and that one admitted would answer
 * REDUCED_FRACTION_NOTE over `1/3.` — a fraction that is in lowest terms.
 */
export function isReducedFraction(value: string): boolean {
  const match = foldTerminalPeriod(value).match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
  if (!match) {
    return false;
  }
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  return denominator > 0 && gcd(numerator, denominator) === 1;
}

/** Shown when a reduced-fraction prompt receives an unreduced equivalent. */
export const REDUCED_FRACTION_NOTE =
  "Write your answer as a fraction in lowest terms (for example, 1/3, not 2/6).";

/**
 * EVERY placeholder below is measured against the field that has to hold it, with headroom,
 * by `answerPlaceholderFit.browser.test.tsx`. Two things follow for anyone editing one.
 *
 * The budget is not the field width. A placeholder has to fit inside `available / 1.2`,
 * because the same string paints up to 18% wider on another operating system: nothing in
 * `styles.css` ships a font, so `--font-body` falls through Nunito to whatever `system-ui`
 * resolves, and these strings were measured at three widths on three machines. Fitting the
 * field on the machine you wrote them on says nothing about the machine that gates them.
 *
 * So the way to shorten one is to cut the CONNECTIVE PROSE and keep the literal example
 * verbatim: the example is the part that teaches the notation, and it is also the part the
 * two tests in `answerFormat.test.ts` pin — one grades it through the real comparator, the
 * other proves it does not answer a served item. Six of these lines lost `, e.g. ` for `: `
 * and nothing else, which is why no literal below moved when the budget arrived.
 */

/** `7/9` rather than `3/4`, which is the served answer to `d1.num-f.l1`. */
export const REDUCED_FRACTION_PLACEHOLDER = "A fraction in lowest terms: 7/9";

/**
 * Shown when an EXP.1 answer is value-correct but still carries a negative exponent.
 *
 * `positive_exponents` is the profile behind every EXP.1 text shape, and it had no branch
 * in {@link missNote}: a learner who did the arithmetic right and wrote `x^-2` got the
 * generic "Not quite. Try again, reveal a hint, or work through it.", which points at the
 * one thing that was NOT wrong. `not_simplified` is exactly the code the checker returns
 * here, so the note can name the fix the way {@link REDUCED_FRACTION_NOTE} does.
 */
export const POSITIVE_EXPONENT_NOTE =
  "The value is right. Rewrite it with no negative exponents: a negative power moves to the bottom of a fraction (for example, 1/x^2, not x^-2).";

/**
 * Shown when a `simplified_radical` answer is refused on its FORM (RAD.1, RAD.2, RAD.4,
 * CG.1's distances, D9's exact side lengths, D10's diagonals).
 *
 * The largest profile in the tree at 97 served items across three domains, and it had no
 * branch in {@link missNote} at all, so every one of those learners got the generic line
 * over an answer whose value was right. The rule is three-part and only one part of it is
 * obvious from the key, which is why the note states all three rather than saying
 * "simplify": everything extractable comes out of the root, what is left under it is
 * minimal, and no root stays in a denominator.
 *
 * Worded without claiming the value is right, unlike {@link POSITIVE_EXPONENT_NOTE}: the
 * profile is declared with `representation: "exact"`, so a rounded decimal arrives here as
 * `wrong_representation`, and over that submission the value is only nearly right.
 */
export const SIMPLIFIED_RADICAL_NOTE =
  "Check the form: take everything that will come out of the root out of it, leave no root in a denominator, and give the exact value rather than a decimal.";

/**
 * Shown when a `canonical_exact_trig_value` answer is refused on its FORM (TRG.2, TRG.3,
 * TRG.4, TRG.6, TRG.9).
 *
 * The second-largest profile at 83 served items, and it had no branch either. It differs
 * from {@link SIMPLIFIED_RADICAL_NOTE} in the one thing an exact special-angle value is
 * ever wrong about, and it is worth naming rather than folding into "simplify": the
 * radicand has to be square-free, so `sqrt(12)/4` is refused where `sqrt(3)/2` is wanted.
 * Told only "Not quite", a learner who had that value exactly right had nothing to work
 * with, since the arithmetic they would go back and redo was the part that was correct.
 */
export const EXACT_TRIG_FORM_NOTE =
  "Check the form: give an exact value rather than a decimal, take every perfect square out from under the root, and leave no root in a denominator.";

/**
 * Placeholder for an EXP.1 answer.
 *
 * The learner has to be told TWO pieces of syntax before the first attempt: `^` writes an
 * exponent, and `/` writes the fraction a negative exponent turns into. Neither appears
 * anywhere on the screen otherwise, so a learner who has the mathematics right can still
 * lose the attempt on notation alone, and that failure is indistinguishable from not
 * knowing the mathematics.
 *
 * Two forms, not one, so it reads as a syntax MENU rather than a hint about this instance
 * (the same reason RAD.4's widget offers `e.g. m^2 or |m|`). The letter is **a** because no
 * EXP.1 item uses it: every served instance declares `n`, `x` or `y`, so neither example can
 * be the answer to the problem on screen whatever its exponent. Moving the EXPONENT out of
 * range instead was tried and does not work — the parser caps an exponent at
 * `MAX_EXPONENT = 8` and the 28 served keys already cover 2 through 8, so every unserved
 * exponent is one the grader REJECTS.
 *
 * The previous wording named `1/x^2` and `x^3/y^4`. Both are served EXP.1 keys, and `1/x^2`
 * is the answer to EXP.1's own check-your-understanding question, so the line gave it away.
 * It also needed 393.8px in a 312.8px field, so it was clipped.
 *
 * `a^3, 1/a^5` rather than `a^3 or 1/a^5`: on the CI runner's font the `or` version needed
 * 304.8px of a 308.8px field, i.e. it was 4.0px from being clipped on a screen nobody had
 * measured it on. A comma reads as a menu the same way the word did.
 */
export const POSITIVE_EXPONENT_PLACEHOLDER = "Positive exponents: a^3, 1/a^5";

/**
 * Placeholder for a radical answer whose shape is a COEFFICIENT TIMES A ROOT. Every lesson
 * widget and KaTeX prompt draws the root as `√`, so a student's first instinct is to type
 * `5√2`. The input boundary now canonicalizes that unambiguous form to `5*sqrt(2)` before
 * grading and recording it, so the placeholder names both spellings up front.
 *
 * It keeps the unqualified name it shipped with, now that {@link RADICAL_QUOTIENT_PLACEHOLDER}
 * and {@link RADICAL_SUM_PLACEHOLDER} stand beside it, because two work-log entries and both
 * `√`-gap sections of `docs/Answer_Equivalence_Spec.md` name this symbol, and the work log is
 * append-only: renaming it would falsify history to tidy a sibling set. So do not read the
 * bare name as "the radical placeholder" — there are three, and {@link radicalShape} is what
 * tells them apart.
 */
export const RADICAL_PLACEHOLDER = "Simplified radical: 5√2 or 5*sqrt(2)";

/**
 * Placeholder for a radical answer that is A ROOT OVER AN INTEGER: RAD.1's
 * `sqrt(a/b²)` simplifications and RAD.2's unit rationalizations, 14 served instances
 * across `d2.rad1.quotient.l2` and `d2.rad2.rationalize-unit.l2`, plus RAD.1's own
 * check-your-understanding (keyed `6*sqrt(2)/5`).
 *
 * All 14 were shown {@link RADICAL_PLACEHOLDER}, which advertises a coefficient times a
 * root — a shape none of them is keyed in. The learner reading it has to conclude either
 * that their `sqrt(7)/2` is wrong or that the field wants something else, and both
 * conclusions cost an attempt that the mathematics did not.
 *
 * `sqrt(6)/5` and not one of the served pairs: the radicand and the denominator are
 * DIFFERENT, so it cannot be read as "the denominator must equal the radicand" (which is
 * true of every `rationalize-unit` key and of no `quotient` one), and no served key is
 * `sqrt(6)/5` — the leak sweep grades it against all 14 and it answers none.
 *
 * The one thing it does not show is the `*` in RAD.1's CFU answer. That CFU's own accepted
 * list carries `6sqrt(2)/5` and `6sqrt2/5` alongside `6*sqrt(2)/5`, so the star is optional
 * exactly where it is unadvertised, and {@link answerKeypad} offers a times key there
 * regardless.
 */
export const RADICAL_QUOTIENT_PLACEHOLDER = "A simplified radical: sqrt(6)/5";

/**
 * Placeholder for a radical answer that is a SUM OF TWO UNLIKE RADICAL TERMS —
 * `d2.rad2.unlike.l2`, 6 served instances, keyed like `4*sqrt(6)+3*sqrt(5)`.
 *
 * This is the shape the single radical line was worst for. "A simplified radical",
 * singular, next to an answer that is two terms tells a learner who has finished the
 * problem that they have not, and the mistake it invites is the exact one the node
 * exists to correct: forcing unlike roots together.
 *
 * It is the one line in this family that could not keep the shared "A simplified radical: "
 * lead-in. With it the string needs 302.7px on the CI runner's DejaVu Sans against a
 * 260.6px budget, so it would be clipped through the second term — and the second term is
 * the entire point. Cutting the connective prose and keeping the literal verbatim brings it
 * to 229.4px, which is the same trade six other placeholders in this module made.
 */
export const RADICAL_SUM_PLACEHOLDER = "Simplified: sqrt(3)+2*sqrt(7)";

/**
 * Placeholder for a radical whose radicand carries a LETTER (RAD.4). Simplifying an
 * even root of an even power produces an absolute value, and the checker reads bars
 * only as `abs(...)` or NON-NESTED `|...|` pipes — there is no glyph handling at all,
 * so a student who has correctly worked out the magnitude must still be told how to
 * type it BEFORE the attempt, not after it is marked wrong.
 *
 * Both bar spellings are shown, and shortened to FIT: the previous wording needed 471.9px
 * in a 312.8px field, so a third of it — including the `|x|` it exists to teach — was
 * clipped on both the RAD.4 practice field and the RAD.4 CFU. That is the same defect
 * PR #164 fixed inside the `root-parity-builder` widget; the shared placeholder behind the
 * answer surfaces was never measured. The bar example is `abs(x^5)` rather than `abs(x)`
 * because `abs(x)` is itself a served RAD.4 answer key.
 *
 * This is the one line where the budget cost the `e.g.`, not a connective: all three
 * examples have to stay, and no wording that keeps `e.g.` also keeps them (the shortest that
 * does, `e.g. 2*sqrt(2*x), abs(x^5), |x^5|`, still needs 262.9px against a 257.3px budget).
 * A comma-separated list of three DIFFERENT forms cannot be read as one required answer,
 * which is the only work `e.g.` was doing here — and dropping a bar spelling to keep it
 * would have thrown away the thing PR #164 established the two-option placeholder is for.
 */
export const VARIABLE_RADICAL_PLACEHOLDER = "2*x*sqrt(2*x), abs(x^5), |x^5|";

/**
 * Placeholder for an interval answer (LIN.6 absolute-value inequalities, FUN.4 feature
 * intervals). Three input limits were MEASURED when the category was cleared and none of
 * them was surfaced to the learner, who saw only "Your answer":
 *
 *  1. infinity is written `inf` (or `infinity`, or `∞`). `oo` is NOT a token and grades
 *     `invalid_input / parse_error`.
 *  2. a union has to be WHITESPACE-delimited: `(-inf, 3) U (5, inf)` grades, and the same
 *     string closed up as `(-inf, 3)U(5, inf)` is a parse error.
 *  3. the bracket carries the inclusivity, so it has to be chosen deliberately: a correct
 *     set with the wrong bracket is `wrong_bound_inclusivity` (see
 *     {@link BOUND_INCLUSIVITY_NOTE}).
 *
 * ONE union carries all three, in less than three quarters of the field: `-inf`/`inf` name
 * the token and its sign, the spaces around `U` are the delimiter, and `(`…`]` shows the two
 * brackets being chosen per END rather than per interval. It carries a fourth limit the
 * earlier wording did not — `parseIntervals` rejects a CLOSED bound on an infinity, so
 * `[-inf, 5]` is `wrong_notation` — and `(-inf` is the only place a learner can read that.
 *
 * DROPPED, and both deliberate. `infinity` and `∞` are accepted spellings but redundant once
 * `inf` is shown. The empty set is an AUTHORING rule, not an input rule: it has no interval
 * spelling at all, so a no-solution inequality is asked as `solutionSetAnswer("{}")` (see
 * LIN.5's own no-solution fixture) and this field is never the one a learner needs it in.
 *
 * **The line is LIVE, and used not to be.** It was documented here as reaching no served item
 * at all — true when written, because the only interval instances in the bank were
 * `d5.rat5.domain.l1`, which declares `required_notation: "set_builder"` and takes the branch
 * above. D3 arrived with 20-plus plain intervals and D3 was missing from the sweeps that would
 * have said so, which is how a paragraph asserting nobody reaches it survived alongside
 * `answerFormat.test.ts`'s own census of the cohort. Two CFUs reach it now too (LIN.4 and
 * LIN.6), through the shape rules in {@link cfuNotation}, where they used to meet the bare
 * "Your answer". Both places are named cohorts in tests rather than described here, so this
 * comment cannot go stale the same way twice: the practice census is in `answerFormat.test.ts`
 * and the CFU one is in its "shows %s to exactly the CFUs whose answer is one".
 *
 * It owes no KEY. Every character of `(-inf, 5] U (7, inf)` is on the keyboard, and writing the
 * form is the graded skill — a correct set with the wrong bracket is marked wrong for the
 * bracket — so a key that typed the brackets would type the part being measured.
 *
 * The previous wording paired a bounded interval with a union and needed 310.0px in a 308.8px
 * field on the CI runner's font — clipped exactly where `(5, inf)` would have been.
 *
 * **The upper bound is 5 rather than 2 because 2 became an ANSWER.** `d6.fun10.range.l3` keys
 * `(-inf, 2]`, so the example was scoring a served item outright — the same defect that
 * `POSITIVE_EXPONENT` and `VARIABLE_RADICAL` shipped, caught here by the leak sweep in
 * `answerFormat.test.ts` the moment D6 joined `SERVED_ITEMS`. Neither bound is arbitrary now:
 * measured over all 128 served interval keys at this tip, `(-inf, 5]`, `(7, inf)` and the union
 * of the two answer nothing, so changing either number owes that measurement again.
 *
 * **Moving it is not a one-file edit, and a test now says so.** The item-bank generators have
 * to keep their keys off whatever this line advertises, and they cannot import it, so
 * `packages/item-bank/src/d6/nodes/FUN.2/index.ts` carries D6's copy as
 * `INTERVAL_PLACEHOLDER_TEXT` and derives its forbidden forms from that copy.
 * `packages/item-bank/src/d6.test.ts` reads THIS line off disk and fails when the two part
 * company. The 2-to-5 move is why: it landed here and never reached the generators, which went
 * on shifting draws off a number nothing advertises. D3's `d3/nodes/_shared.ts` still holds an
 * untethered copy reading 2.
 */
export const INTERVAL_PLACEHOLDER = "Interval, e.g. (-inf, 5] U (7, inf)";

/**
 * Placeholder for a numeric answer whose `representation` is `fraction` (LF.1 slope) but
 * whose simplification is NOT `reduced_fraction` — an unreduced equivalent passes, so
 * {@link REDUCED_FRACTION_PLACEHOLDER} would overstate the rule. What the grader is strict
 * about is the REPRESENTATION: a decimal equal to the key grades `wrong_representation`, so
 * a learner who writes `-0.5` for `-1/2` is marked wrong for a choice nothing warned them
 * about. `9/13` is not a served key in either the fraction or the reduced-fraction pool.
 */
export const FRACTION_PLACEHOLDER = "A fraction, not a decimal: 9/13";

/**
 * Placeholder for an answer that is WRITTEN with a fraction bar somewhere in it, without the
 * whole answer being a fraction and without the bar being the graded skill.
 *
 * It exists because the three fraction lines above all make a claim this cohort cannot
 * support. {@link REDUCED_FRACTION_PLACEHOLDER} demands lowest terms;
 * {@link FRACTION_PLACEHOLDER} says a decimal will not do, and on `d2.rad3.negeval.l3` a
 * decimal often WILL (`0.25` grades `correct/match` against the key `1/4`, though `0.111…`
 * does not against `1/9`, so neither "a fraction is required" nor "a decimal is fine" is
 * true of the cohort); and neither can be shown at all to an answer whose fraction is only
 * one PART of it — RAT.1's check is keyed `(x + 8)/(x + 5), x = 8, x = -5` and LF.1's is
 * `-1/2, decreasing`.
 *
 * So the line promises nothing about the FORM of the answer and names only the one thing a
 * learner cannot guess: that `/` is how a bar is typed. That is the whole reason the cohort
 * needs guidance — `1/32` is unwritable without it — and it is all this cohort's graders
 * agree on. RAD.3's graded skill is turning a negative or rational exponent into a value and
 * RAT.6's is discarding the extraneous root; in both the bar is incidental to the skill,
 * which is why the key it needs is not the key that types the answer.
 *
 * `3/8` is not a served key in any pool this line is shown to, and the leak sweep in
 * `answerFormat.test.ts` grades it against every one of them.
 */
export const FRACTION_BAR_PLACEHOLDER = "Use / for a fraction: 3/8";

/**
 * Placeholder for an exact radian answer — every `exactRadianAnswer` key in D9, keyed like
 * `pi/6`, `11pi/6` and `21pi`.
 *
 * These reached a learner as a bare "Your answer" with no keypad and no preview until the
 * `exact_radian` tag landed, because the only fraction rule that could have claimed them
 * tests `isPlainFractionAnswerText`, which is digits over digits and so does not recognise a
 * pi in the numerator. On TRG.1 alone that was 76 distinct keys.
 *
 * It names the SPELLING first and the bar second, in that order, because they are not
 * equally guessable and not equally universal. That `pi` is typed as two letters is the
 * thing no learner can derive — the prompt and the figure both draw the symbol — while the
 * bar is only present in some of these answers: `21pi` is a served key with no `/` in it.
 * This line used to be the ONLY thing making a radian answer writable, because the row beside it
 * offered the bar and no pi key; it now names what the pi key also inserts, which is the ordinary
 * arrangement everywhere else in this module rather than a special case.
 *
 * `3pi/7` is deliberately not a special angle, and the sevenths are where the first choice of
 * example was wrong. It was `2pi/7`, argued from the exact values: those live on halves,
 * thirds, quarters, sixths and twelfths of a turn, so a seventh could not be a served key. That
 * is true of the exact-VALUE pools and false of this one, because a radian answer is also
 * produced by converting degrees and by dividing a turn by a coefficient, neither of which
 * cares what a special angle is. `d9.trg5.period-radian.l2` serves the period `2pi/7` outright,
 * so the line was printing the answer to an item it is shown on. The example is now graded
 * against all 66 radian instances by the leak sweep in `answerFormat.test.ts`, which is what
 * says a seventh is safe rather than the reasoning above.
 *
 * The prose is two words shorter than it reads naturally, and the two words are the cost of
 * fitting: at «Spell pi, and / for a fraction» this needed 268.8px of a 257.3px budget on the
 * CI runner's font, measured by `answerPlaceholderFit.browser.test.tsx`. What came out is the
 * `and`, because the example is the half doing the teaching — a learner who reads nothing but
 * `3pi/7` has both facts — so the sentence loses its conjunction rather than the worked form
 * losing its bar.
 */
export const EXACT_RADIAN_PLACEHOLDER = "Spell pi, / for a fraction: 3pi/7";

/**
 * Placeholder for an exact trigonometric value — every `exactTrigValueAnswer` key, keyed like
 * `1/2`, `sqrt(3)/2` and `(sqrt(6)+sqrt(2))/4`.
 *
 * Same hole as the radian line above and a different cause. The spec carries
 * `simplification: "canonical_exact_trig_value"`, which is not the `simplified_radical` the
 * radical branch tests for, and `representation: "exact"` is not the `"fraction"` the next
 * rule tests for, so a radical value fell through every branch to `none`.
 *
 * The EXAMPLE carries both characters, and it has to, because one generator produces answers
 * needing each: the draws of `d9.trg3.exact-value-circle.l3` are `1/2` and `sqrt(3)/2`, so a
 * line showing only a root would be a false claim on half of them and one showing only a bar
 * on the other half. `sqrt(5)/4` is a root over an integer and so shows both at once.
 *
 * The prose used to name them as well — «Exact value, sqrt() for a root» — and that needed
 * 306.4px of a 257.3px budget on the CI runner's font, the widest overrun of any placeholder
 * in this module (`answerPlaceholderFit.browser.test.tsx`). Naming a character the example
 * already prints is the duplication that could go, so this is the colon-then-example shape six
 * other lines here use, and it keeps `sqrt(` and `/` where a learner can copy them.
 *
 * `sqrt(5)/4` answers none of the 32 instances this line is shown to. A fifth is not a value on
 * the unit circle, and the leak sweep in `answerFormat.test.ts` grades the form against every
 * one of them rather than resting on that.
 */
export const EXACT_TRIG_VALUE_PLACEHOLDER = "Exact value: sqrt(5)/4";

/**
 * Placeholder for an answer that is WRITTEN with a caret somewhere in it, where
 * {@link POSITIVE_EXPONENT_PLACEHOLDER} would be a false claim.
 *
 * NUM.4's check is keyed `x^2 + 5x`, and {@link isPositiveExponentAnswerText} deliberately
 * refuses it: that predicate is whole-string because the line it feeds asserts a
 * SIMPLIFICATION PROFILE — "positive exponents", i.e. every power written with no negative
 * exponent left — and NUM.4 has no such profile to assert. Its answer is a sum, and the only
 * thing a learner cannot guess about typing it is the caret.
 *
 * So this line names the caret and nothing else, and its example is a SUM rather than a bare
 * power, so it cannot be read as "the answer must be a single term".
 *
 * The letter is `a` for the same measured reason {@link POSITIVE_EXPONENT_PLACEHOLDER} uses
 * it: no served item or authored check declares it, so neither part of the example can be
 * the answer on screen.
 */
export const EXPONENT_NOTATION_PLACEHOLDER = "Use ^ for a power: a^2 + 3a";

/**
 * Placeholder for a solution set one of whose roots is a FRACTION — `d5.rat6.rate.l2`, 6 of
 * the 98 served solution sets, keyed `{8/3}`, `{12/7}`, `{60/17}`, `{15/4}`, `{21/10}`,
 * `{18/5}`.
 *
 * {@link SOLUTION_SET_PLACEHOLDER} shows two integers because that is what every other
 * served roster holds, and it is also the line whose reasoning `keypadForNotation` leans on
 * to give a solution set no keys at all: a roster is "typed with characters a phone keyboard
 * already shows". A bar inside the roster breaks that premise, so this cohort is told apart
 * from it and gets the one key the premise no longer covers.
 *
 * `7/8` on its own AND a two-element roster, because the comparator accepts a lone root bare
 * (`8/3` grades `correct/match` against the key `{8/3}`) and the line has to keep saying so
 * while it grows the bar. Neither form answers a served item: the leak sweep grades both
 * against all 6.
 */
export const SOLUTION_SET_FRACTION_PLACEHOLDER = "Every solution: 7/8 or {2/3, 5}";

/**
 * Placeholder for an answer whose `*` is load-bearing notation — `d8.el5.condense-sum.l2`,
 * 7 served instances keyed `log(m*a*q)`, `log(v*b)`, `log(q*m)`.
 *
 * Juxtaposition is read almost everywhere else: `3x` parses, `6abs(x^3)` parses, and 26
 * templates' answer keys carry a star the grader does not need (see `STAR_IS_OPTIONAL` in
 * `answerKeypad.test.ts`, which re-grades every one of them starless). Two adjacent LETTERS
 * are the exception, because `maq` reads as one symbol: `log(maq)` grades
 * `invalid_input / unknown_symbol`, which §12 of the equivalence spec scores as UNANSWERED,
 * so the learner loses the attempt and is told only that the format could not be read.
 *
 * The line therefore states the narrow rule rather than "write products with a star", which
 * would be false of the 26 templates above. `log(a*b)` is not a served key.
 */
export const IMPLICIT_PRODUCT_PLACEHOLDER = "Use * between letters: log(a*b)";

/**
 * Placeholder for a CFU whose `check` grades a single numeric value. Named here rather than
 * left as a literal inside the CFU card so all three answer surfaces draw every placeholder
 * from this one module.
 *
 * It stays CFU-ONLY on purpose. The CFU rejects an expression before grading
 * ({@link isNumericLiteral} + {@link NUMERIC_LITERAL_NOTE}), so "a single number" states
 * that surface's actual requirement; practice EVALUATES the response instead, so `2+3*4-8`
 * grades correct there and some served keys are fractions (`4/3`). Advertising "a single
 * number" on practice would push a learner with a `4/3` answer toward a rounded decimal that
 * does NOT grade.
 */
export const NUMERIC_LITERAL_PLACEHOLDER = "A single number, e.g. 7";

/**
 * Placeholder for an answer written in terms of pi — `d10.geo2.cylinder-volume-exact.l3`, 7
 * served instances keyed `588*pi`, `704*pi`, `18*pi` and so on.
 *
 * It is the R30 shape at its sharpest, because the character the learner cannot guess is not
 * a character at all. A bar, a caret and a star are all marks a learner can SEE they need
 * once they have the answer; pi is a GLYPH in the prompt (`$\pi$`, typeset) whose ASCII
 * spelling has no visual cue anywhere on the card, and the glyph itself is not in the
 * checker's alphabet: `π` grades `invalid_input / unknown_symbol`, which §12 of the
 * equivalence spec scores as UNANSWERED. So a learner who has done the geometry perfectly and
 * types what they are looking at loses the attempt and is told only that the format could not
 * be read. That is the same argument {@link RADICAL_PLACEHOLDER} makes for `sqrt(` over `√`,
 * one symbol further along.
 *
 * The coefficient is `13`, and the number matters because the first choice of `7` was a leak.
 * The argument for `7` was that the template draws a radius in 2..9 and a depth in 2..12 and
 * keys `r^2 * h`, so the smallest coefficient it can produce is `4 * 2 = 8`. That is true of
 * THIS template and it is not the whole population the form is graded against: D9 keys an arc
 * length as a bare multiple of pi, `d9.trg1.arc-length.l3` serves `7pi`, and the star is not
 * what tells them apart — `7*pi` and `7pi` grade identically, so the line was printing a served
 * answer one character away from its own spelling. `13` survives both tests: `r^2 * h = 13` has
 * no solution with `r >= 2`, so it is unservable on this template by construction, and it
 * grades nothing across all 73 pi-carrying served items, which is what the leak sweep in
 * `answerFormat.test.ts` checks rather than the reasoning above. Measured at the same time:
 * `6*pi`, `9*pi`, `11*pi`, `18*pi` and `32*pi` all leak, so a small coefficient is not safe by
 * being small.
 *
 * The star is shown because the prompt and the GEO.2 widget both spell the form that way
 * (`for example 3*pi`), so the line agrees with the two other places the learner is told what
 * to type. It is not a claim that the star is REQUIRED: `588pi` grades `correct/match`, which
 * is why this template stays on `STAR_IS_OPTIONAL` in `answerKeypad.test.ts` and why the row
 * under the field offers pi and no times key.
 */
export const PI_EXPRESSION_PLACEHOLDER = "In terms of pi: 13*pi";

/**
 * Placeholder for an answer written in terms of pi that is ALSO a fraction — TRG.1's and
 * TRG.6's CFUs, keyed `pi/4` and `pi/6`.
 *
 * A separate line from {@link PI_EXPRESSION_PLACEHOLDER} because that one's example carries no
 * bar, and a learner reading `13*pi` over a field that wants `pi/4` has been told the wrong
 * shape. It is also separate from {@link EXACT_RADIAN_PLACEHOLDER}, which teaches the same two
 * characters to the D9 practice cohort: that line opens «Spell pi» because there is no pi key
 * beside it and the sentence is the only place the spelling appears, while this tag's row
 * offers pi and the bar both, so the example can do the teaching on its own.
 *
 * `4pi/11` shows a coefficient, the spelling and the bar in one form, and grades nothing: an
 * eleventh is not a served denominator anywhere in the bank, measured against all 73
 * pi-carrying served items and against both CFUs this line is shown on.
 */
export const PI_FRACTION_PLACEHOLDER = "In terms of pi: 4pi/11";

export const GENERIC_PLACEHOLDER = "Your answer";

/**
 * True when an authored answer is written as a radical. Lets a CFU that grades by
 * exact accepted-list match (no `check`, so no simplification profile to read) still
 * advertise the right notation.
 */
export function isRadicalAnswerText(value: string): boolean {
  return /(√|sqrt|cbrt)/i.test(value);
}

/**
 * The set-builder separator, which is a bar and is not an absolute-value bar.
 *
 * The pattern is the bar that FOLLOWS a `{` with no other bar or brace between them —
 * `{x |`, `{n |` — and it is deliberately the separator alone rather than the whole braced
 * group. Removing the group would take a genuine pair of bars inside a set-builder condition
 * with it (`{x | |x| < 9}` is a set of values of an absolute value), and that answer wants the
 * bars named. Removing the one separator leaves every other bar in the string to be judged on
 * its own.
 */
const SET_BUILDER_SEPARATOR = /(\{[^{}|]*)\|/g;

/**
 * True when an authored answer carries an absolute value, in any of the spellings a
 * pack's accepted-list uses (`abs(...)`, pipes, or the KaTeX bar macros). Same job as
 * {@link isRadicalAnswerText}: let an accepted-list CFU advertise its notation.
 *
 * **A bare `|` is not enough, and reading it as enough cost EL.4 the notation its own slide
 * defines last.** `cfuNotation` applies this with `.some` over the whole accepted list, so a
 * predicate that fires on any bar at all lets ONE spelling retag an entire question: adding
 * `{x | x < 9}` to EL.4's list advertised `2*x*sqrt(2*x), abs(x^5), |x^5|` over a
 * sqrt-and-bars keypad on a domain-and-asymptote question, so the pack could not accept
 * set-builder notation while this predicate could not tell the two bars apart. Round one filed
 * that as the blocker on P1-2 and left the notation unaccepted rather than ship the worse
 * defect.
 *
 * What separates them is what the bar is DOING. An absolute value brackets an expression, so
 * its bar arrives as one of a pair or as a named macro; the set-builder bar is a separator
 * between a variable and a condition, and it arrives alone inside braces. So the named
 * spellings answer first, and the bar test then runs over the string with the set-builder
 * separator removed — which leaves `|x^5|` and `abs(x^5)` exactly as they were.
 */
export function isAbsoluteValueAnswerText(value: string): boolean {
  if (/(abs\(|\\lvert|\\rvert)/i.test(value)) {
    return true;
  }
  return value.replace(SET_BUILDER_SEPARATOR, "$1").includes("|");
}

/**
 * True when an authored answer is written purely as a POWER, or as a quotient of powers:
 * `x^2`, `1/x^2`, `x^3/y^4`. Same job as {@link isRadicalAnswerText} — let a CFU that grades
 * by exact accepted-list match advertise its notation — for the shape EXP.1 answers take.
 *
 * The test is deliberately whole-string. A sum (`x^2 + 5x`, NUM.4), a coordinate pair or an
 * exclusion list (`(x+14)/(x^2+3x-4); x = -4, 1`, RAT.3) all carry a `^` too, and none of
 * them wants exponent guidance; the character class excludes every separator they use, so
 * they cannot reach it. Roots and bars are excluded explicitly, because `6*abs(x^3)` (RAD.4)
 * is a power answer whose notation problem is the BARS, not the caret.
 *
 * A negative exponent excludes itself: `-` is not in the class, so the predicate fires only
 * on answers already written with positive exponents, which is exactly what
 * {@link POSITIVE_EXPONENT_PLACEHOLDER} claims the item wants.
 *
 * **A BARE MONOMIAL STAYS IN, and it was measured rather than assumed.**
 * {@link EXPONENT_NOTATION_PLACEHOLDER} records that NUM.4's `x^2 + 5x` is refused because the
 * line this feeds asserts a simplification profile and a sum has none, and the same reasoning
 * reads plausibly onto a single term: `20x^3` is not the simplification of anything either. It
 * does not carry across. Of the 34 served items that DECLARE `simplification:
 * "positive_exponents"`, 20 key a bare monomial with no bar in it — `x^2`, `n^8`, `y^6` — because
 * a single positive power is what `x^5 * x^-3` and `(x^2)^3` simplify TO. A monomial is the
 * profile's ordinary output, so refusing one would take the bar key and the negative-exponent
 * line away from the cohort the line exists for. `answerFormat.test.ts` holds that cohort to
 * this predicate item by item.
 *
 * What a monomial cannot do is TELL YOU which it is: `20x^3` as an EXP.1 answer asserts the
 * profile and `20x^3` as POL.6's leading term does not, and the difference is in the question
 * rather than in the string. Where a CFU carries a `check`, the spec answers first and this
 * predicate is never reached — which is why POL.6's two draws agree on `exponent_notation`
 * (`answerKeypad.test.ts` asserts that agreement, and that no unlisted node contradicts itself).
 */
export function isPositiveExponentAnswerText(value: string): boolean {
  const compact = value
    .replace(/\s+/g, "")
    .replace(/\\[dt]?frac/g, "")
    .replace(/[{}()]/g, "");
  if (!/(\^|\*\*)/.test(compact)) {
    return false;
  }
  return /^[0-9a-z^*/]+$/.test(compact) && !/(sqrt|cbrt|abs)/.test(compact);
}

/**
 * True when an answer is a plain fraction of two integers: `1/32`, `4/3`, `-7/3`.
 *
 * Whole-string, because the claim it supports is about the WHOLE answer being one value. It
 * is what tells `d2.rad3.negeval.l3`'s key `1/32` apart from `d5.rat1.monomial.l1`'s
 * `6*x/5`, which also carries a bar and is not a value at all.
 */
export function isPlainFractionAnswerText(value: string | undefined): boolean {
  return /^-?\d+\s*\/\s*-?\d+$/.test((value ?? "").trim());
}

/**
 * True when an answer key spells a product with a `*` its own grader cannot read WITHOUT.
 *
 * A star is optional almost everywhere: `5*n` grades as `5n`, `(x + 4)*(x - 5)` grades as
 * `(x + 4)(x - 5)`, and `STAR_IS_OPTIONAL` in `answerKeypad.test.ts` re-grades 26 templates
 * starless through the real checker to prove it. The exception is a star whose LEFT side is a
 * letter, and it is an exception for two different parse reasons that this one shape covers:
 *
 *  - letter against letter — `log(m*a*q)` as `log(maq)` is `invalid_input / unknown_symbol`,
 *    because three adjacent letters read as one symbol;
 *  - letter against an opening bracket — `x*(x + 6)` as `x(x + 6)` is
 *    `invalid_input / unsupported_syntax`, while `)(` juxtaposition IS supported, which is
 *    why `(x + 4)(x - 5)` is fine and this one is not.
 *
 * Those are exactly the three templates the sweep reports and `STAR_IS_OPTIONAL` refuses to
 * hold: `d8.el5.condense-sum.l2`, `d5.rat3.factorlcd.l3` and `d5.rat3.unlike.l2`. So this
 * predicate is not a guess about the grammar — it is the measured complement of that list,
 * and the sweep goes red the day the two stop agreeing.
 */
export function hasLoadBearingStar(value: string | undefined): boolean {
  return /[a-z]\s*\*\s*[a-z(]/i.test(value ?? "");
}

/**
 * True when an answer is written in terms of pi, read as a WHOLE NAME rather than a substring.
 *
 * The boundaries are what make it a name: `pi` is the checker's own token for the constant, and
 * a substring test would claim any answer that happened to contain those two letters in a
 * longer symbol. Digits count as boundaries on purpose — `2pi` is the juxtaposed spelling the
 * grader reads — and so does the star, so `588*pi` and `588pi` are both recognized as the same
 * answer written two ways.
 *
 * It is the one predicate in this module that reads a NAME instead of a character, and that is
 * the whole reason the cohort needs it: see {@link PI_EXPRESSION_PLACEHOLDER}.
 */
export function isPiAnswerText(value: string | undefined): boolean {
  return /(^|[^a-z])pi([^a-z]|$)/i.test(value ?? "");
}

/**
 * True when an authored CFU answer is written with a fraction bar, in a shape none of the
 * three fraction lines above can claim. See {@link FRACTION_BAR_PLACEHOLDER}.
 *
 * The root and bar exclusions are what keep RAD.1's `6*sqrt(2)/5` on the radical line, whose
 * notation problem is the root and not the bar, and they are stated here as well as ordered
 * in {@link cfuNotation} so the predicate means the same thing read on its own.
 */
export function isFractionBarAnswerText(value: string): boolean {
  return (
    value.includes("/") &&
    !isPositiveExponentAnswerText(value) &&
    !isRadicalAnswerText(value) &&
    !isAbsoluteValueAnswerText(value)
  );
}

/**
 * True when an authored CFU answer carries a caret that {@link isPositiveExponentAnswerText}
 * refuses. See {@link EXPONENT_NOTATION_PLACEHOLDER}: the caret still has to be typed, and
 * the simplification claim the other line makes is not available.
 */
export function isExponentNotationAnswerText(value: string): boolean {
  return (
    /(\^|\*\*)/.test(value) &&
    !isPositiveExponentAnswerText(value) &&
    !isRadicalAnswerText(value) &&
    !isAbsoluteValueAnswerText(value)
  );
}

/**
 * True when an authored answer is a bare coordinate pair of numbers: `(2, -3)`, `(15, 25)`.
 *
 * On its own it cannot tell a POINT from an INTERVAL, and that is not a shortcoming to be
 * patched — the two notations are byte-identical in this shape. LF.4's solution `(2, -3)` and
 * LIN.6's solution `(15, 25)` are the same string with different numbers, so which one a pack
 * means has to come from the pack. {@link namesCoordinatesAnswerText} is where that is read.
 */
export function isCoordinatePairAnswerText(value: string): boolean {
  return /^\(\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*\)$/.test(value.trim());
}

/**
 * True when an accepted spelling names the two numbers as the coordinates `x` and `y` —
 * `x = 2, y = -3`.
 *
 * This is the pack SAYING its pair is a point, and it is what disambiguates the shape
 * {@link isCoordinatePairAnswerText} matches. It is not an invented convention: `pointForms`
 * in `cfuAcceptedForms.ts` generates this spelling for every point it spells, and LF.4's
 * authored list carries it, so every point CFU in the tree — authored or drawn — has it.
 * `cfuNotation`'s census in `answerKeypad.test.ts` names the cohorts on both sides, so a pack
 * that lands in the wrong one shows up as a change to a named list.
 */
export function namesCoordinatesAnswerText(value: string): boolean {
  return /x\s*=\s*-?[\d.]/i.test(value) && /y\s*=\s*-?[\d.]/i.test(value);
}

/**
 * True when an authored answer is interval notation: a bracketed pair, or a union of them.
 *
 * Whole-string, so RAT.1's `(x + 8)/(x + 5), x = 8, x = -5` and RAT.5's
 * `(4, 5); x = 1; y = 3` — both of which OPEN with a bracket — cannot reach it.
 */
export function isIntervalAnswerText(value: string): boolean {
  return /^[([][^[\]()]*,[^[\]()]*[)\]](\s+U\s+[([][^[\]()]*,[^[\]()]*[)\]])*$/.test(
    value.trim(),
  );
}

/**
 * True when an accepted spelling is a braced roster of values — LIN.5 accepts `{39, 51}`
 * beside its canonical `39, 51`.
 *
 * Read across the whole accepted list rather than off `accepted[0]`, because the braces are
 * exactly the spelling a pack lists SECOND: the canonical form of a two-root answer is the
 * bare `39, 51` the prompt asks for, and the roster is the alternative that makes it a set.
 */
export function isSolutionRosterAnswerText(value: string): boolean {
  return /^\{\s*-?[\d.]+(\/-?[\d.]+)?(\s*,\s*-?[\d.]+(\/-?[\d.]+)?)*\s*\}$/.test(
    value.trim(),
  );
}

/**
 * How a form-dependent CFU answer is compared against its accepted list: trim,
 * lowercase, strip all whitespace. Shared with the tests so a content pack can be
 * checked against the SAME matching the learner hits.
 */
export function normalizeAcceptedAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * A leading plus dropped off a number, so `+3` and `3` are one spelling and not two.
 *
 * RAT.6 is the measured case and it is the worst shape a refusal can have: the pack has no
 * `check` block, so its accepted list IS the grader and there is no comparator behind it to
 * fall through to. `3` graded correct, `+3` graded incorrect, and because the list is the whole
 * decision the refusal carried `note: null` — the learner met the card's generic miss line over
 * a right answer, with nothing naming what to change. Practice accepts a leading plus on 589 of
 * 589 items swept, so this was also the CFU disagreeing with its own pool.
 *
 * `isNumericLiteral` was widened to `[+-]?` for exactly this reading, but an exact-match pack
 * never reaches a gate, which is why the fold has to happen where the list is compared.
 *
 * Narrow on purpose. The plus is dropped only in front of a DIGIT or a decimal point, so it is
 * a sign on a number rather than any leading plus: it does not touch `+x`, and it is applied to
 * the accepted forms as well as to the typed answer, so a pack that lists `+3x` (as `linearForms`
 * spells one) still accepts what it advertises.
 */
export function dropLeadingPlus(value: string): string {
  return value.replace(/^\+(?=[\d.])/, "");
}

/**
 * Which of the three shapes a constant-radicand answer is WRITTEN in, read off the answer
 * key itself.
 *
 * `simplification: "simplified_radical"` is a label, not a shape: the served pool keys it as
 * a coefficient times a root (35 instances), a root over an integer (14) and a sum of two
 * unlike radical terms (6). One example cannot advertise three shapes, and the one that was
 * there advertised the first — so 20 of the 55 items shown it were keyed in a shape it
 * contradicted.
 *
 * Reading the item's OWN key is PR #209's reading, applied a layer up. That PR fixed a
 * submit gate which inferred "the answer is a plain number" from `answer_type: "numeric"`,
 * true for the D1 items it was written for and false for the radical pools that adopted the
 * same type three days later; it stopped inferring from the type and asked the key. A
 * `simplification` profile is the same kind of over-broad label, and the key is the same
 * answer to it.
 *
 * The order is `+` before `/`, and a key carrying BOTH is a shape nothing serves today. It
 * would classify as a sum and be advertised a line with no `/` in it, which is why
 * `answerFormat.test.ts` asserts notation COVERAGE per item as well as shape equality: a
 * future `sqrt(3)/3 + sqrt(2)/2` key reddens that assertion rather than quietly taking the
 * closest of three lines. `-` is not read at all, because a difference of radical terms is
 * still two terms and the sum line already shows two.
 */
export type RadicalShape = "product" | "quotient" | "sum";

export function radicalShape(answerKey: string | undefined): RadicalShape {
  const compact = (answerKey ?? "").replace(/\s+/g, "");
  if (compact.includes("+")) {
    return "sum";
  }
  if (compact.includes("/")) {
    return "quotient";
  }
  return "product";
}

/**
 * The parts of an item's answer spec that decide how its answer must be WRITTEN. Taking
 * the spec rather than the simplification profile alone lets the notation-carrying types
 * (set-builder domains, points, solution sets) speak for themselves.
 */
export type AnswerFormatSpec = Partial<
  Pick<
    AnswerSpec,
    "answer_type" | "simplification" | "required_notation" | "representation"
  >
>;

/**
 * How an item's answer has to be WRITTEN — the one dispatch behind both the placeholder
 * that names the notation and the keypad that types it.
 *
 * It is one function rather than two tables on purpose. "Which notation does this item
 * want" is a single question, and answering it in two places is the shape that lets a
 * keypad offer a root key on an item whose placeholder says "one of the options above".
 * Everything downstream of this is a `switch` with no conditions of its own, so the two
 * consumers cannot drift: {@link practicePlaceholder} maps each tag to a line of text and
 * {@link answerKeypad} maps the same tag to a row of keys.
 *
 * The order below is load-bearing and unchanged. Notation beats simplification (a
 * set-builder domain is graded on its form and its profile is always `none`), `interval`
 * comes after the `set_builder` sub-case it contains, and `reduced_fraction` comes before
 * the plain `fraction` representation because it is the stricter rule over the same thing.
 *
 * `allowedSymbols` is the item's own declaration that its answer contains letters, which is
 * also what routes it to the checker's variable-aware radical path. A radical over a
 * variable radicand can need absolute-value bars; a constant-radicand one never does.
 *
 * `answerKey` is read for ONE decision: which of the three constant-radicand shapes an item
 * is keyed in (see {@link radicalShape}). It is what splits the old `constant_radical` tag
 * into three, and the split is deliberately confined to the PLACEHOLDER: all three map to
 * the same row of keys in {@link keypadForNotation}, because the root, the star and the
 * fraction slash were graded against all 55 of those items before the shapes were told
 * apart, and all three are legal on every one of them.
 * So the invariant above survives literally — the two switches stay condition-free, and
 * nothing about which keys an item offers moved.
 *
 * It is optional for the same reason `allowedSymbols` is: the CFU card has no frozen item to
 * read one off, and a caller that omits it gets the product line. Both omissions are guarded
 * the same way too — by `answerSyntaxGuidance.test.tsx` asserting the placeholder on the
 * RENDERED field of all three answer surfaces, because a dispatch nothing passes an argument
 * to is not a fix.
 */
export type AnswerNotation =
  | "set_builder"
  | "interval"
  | "point"
  | "solution_set"
  | "solution_set_fraction"
  | "multiple_choice"
  | "reduced_fraction"
  | "positive_exponents"
  | "variable_radical"
  | "constant_radical_product"
  | "constant_radical_quotient"
  | "constant_radical_sum"
  | "fraction"
  | "fraction_bar"
  | "exact_radian"
  | "exact_trig_value"
  | "exponent_notation"
  | "implicit_product"
  | "pi_expression"
  | "pi_expression_fraction"
  | "rational_expression"
  | "rational_quotient"
  | "rational_quotient_power"
  | "rational_quotient_product"
  | "none";

export function answerNotation(
  spec: AnswerFormatSpec | undefined,
  allowedSymbols?: readonly string[],
  answerKey?: string,
): AnswerNotation {
  if (spec?.required_notation === "set_builder") {
    return "set_builder";
  }
  // Checked after set_builder, which is the notation-carrying SUB-case of this type.
  if (spec?.answer_type === "interval") {
    return "interval";
  }
  if (spec?.answer_type === "point") {
    return "point";
  }
  if (spec?.answer_type === "solution_set") {
    // The roster brackets are on every keyboard; a root written as a fraction is not.
    return (answerKey ?? "").includes("/") ? "solution_set_fraction" : "solution_set";
  }
  if (spec?.answer_type === "multiple_choice") {
    return "multiple_choice";
  }
  // The two-field D5 surface, split by what its own expression key is written in.
  if (spec?.answer_type === "rational_answer") {
    return rationalNotation(answerKey);
  }
  if (spec?.simplification === "reduced_fraction") {
    return "reduced_fraction";
  }
  if (spec?.simplification === "positive_exponents") {
    return "positive_exponents";
  }
  if (spec?.simplification === "simplified_radical") {
    return allowedSymbols && allowedSymbols.length > 0
      ? "variable_radical"
      : constantRadicalNotation(answerKey);
  }
  // Last, because `reduced_fraction` above is the stricter rule over the same representation.
  if (spec?.representation === "fraction") {
    return "fraction";
  }
  // The two trigonometric shapes. Both are `numeric` with `representation: "exact"` and
  // neither is claimed by any rule above, so both fell through to `none` until these landed,
  // handing a learner a bare field over `11pi/6` and `sqrt(3)/2`.
  //
  // The trig-value rule reads the KEY as well as the profile, following this file's rule that
  // a line advertises the shape its own item is keyed in. One generator does both: the draws
  // of `d9.trg3.exact-value-circle.l3` are `1/2` and `sqrt(3)/2`, and a per-item dispatch
  // sends the first to `fraction_bar` below and only the second here. The alternative, tagging
  // the whole profile, would offer a square-root key over an answer like TRG.4's `4/3` whose
  // values come off Pythagorean triples and are never radicals.
  //
  // It still has to sit ABOVE `fraction_bar`, because a radical key over an integer
  // denominator would otherwise be claimed there and lose its root key.
  if (
    spec?.simplification === "canonical_exact_trig_value" &&
    (answerKey ?? "").includes("sqrt(")
  ) {
    return "exact_trig_value";
  }
  // Read off `allowed_symbols` rather than the key, because `21pi` is a valid radian answer
  // with no bar in it: the thing a learner cannot guess here is that pi is SPELLED, and only
  // some of these answers are also fractions. Above `fraction_bar` for the same reason as
  // above — `pi/4` would otherwise be read as a plain bar and lose the spelling guidance.
  if (spec?.answer_type === "numeric" && (allowedSymbols ?? []).includes("pi")) {
    return "exact_radian";
  }
  // Below here the SPEC has said nothing about notation, so the only thing left to read is
  // the key. Both cases are a notation an item's own answer needs and its spec cannot name.
  if (spec?.answer_type === "numeric" && isPlainFractionAnswerText(answerKey)) {
    return "fraction_bar";
  }
  if (spec?.answer_type === "expression" && hasLoadBearingStar(answerKey)) {
    return "implicit_product";
  }
  // A caret in an expression key, where no simplification profile named one. D4's polynomial
  // answers are the cohort: `is_standard_polynomial` and `fully_factored_over_integers` are
  // FORM requirements and say nothing about notation, so `x^2 + 13x + 6` and `(x + 7)^2`
  // reached a bare "Your answer" over an answer whose one unguessable character is the caret.
  // D1's `d1.num-4.l3b` joins that cohort keying `6*x^2 + 16`, whose star is not load-bearing.
  //
  // It sits AFTER the star rule rather than before it, so nothing already tagged
  // `implicit_product` moves. A key carrying BOTH a load-bearing star and a caret would take
  // the star's row and be short an exponent key, which no served item is: the positive half of
  // the sweep in `answerKeypad.test.ts` reports that shape by name rather than passing over it,
  // so it fails loudly rather than shipping half a row.
  if (spec?.answer_type === "expression" && /(\^|\*\*)/.test(answerKey ?? "")) {
    return "exponent_notation";
  }
  // An answer written in terms of pi. LAST of the key-reading rules, and last for a reason
  // that is about blast radius rather than about pi: everything above it already has a tag, so
  // the only items this rule can move are the ones that reach here tagged `none` — which makes
  // "no item loses a key row or a placeholder it already had" true by CONSTRUCTION rather than
  // by census. `answerNotation` is read by every served pool and by every authored CFU, so a
  // rule that could reorder existing cohorts would have to be argued item by item across 1,436
  // served items; this one cannot.
  //
  // It reads the KEY and deliberately does NOT gate on `answer_type`, unlike the two rules
  // above it. Those name a character that only an expression can carry; needing to know that
  // the glyph π is typed `pi` is a fact about the ANSWER, not about how the item declares
  // itself, and gating on the type is the same over-broad-label mistake PR #209 fixed and that
  // {@link radicalShape} documents. The five `answer_type` branches at the top of this function
  // all return before here anyway, so the only type this widens to is a plain `numeric` key
  // written in pi — which would need the spelling for exactly the same reason.
  //
  // A key carrying pi AND a caret or a load-bearing star takes the earlier tag and is short a
  // pi key. No served key does, and the day one arrives it FAILS rather than shipping half a
  // row, because `pi` is in `NOTATION_KEY_FOR` in `answerKeypad.test.ts` and that sweep requires
  // a key per notation the item's own key uses. That is the same way the star-and-caret
  // collision is handled above.
  //
  // A key carrying pi AND A BAR is the one such collision that DID arrive, and it arrived by
  // the route that comment did not anticipate: not as a practice key, but on TRG.1's and TRG.6's
  // CFUs, keyed `pi/4` and `pi/6`. They reach here because the radian rule above tests
  // `answer_type === "numeric"` and a CFU `check` declares `expression`, and before this rule
  // existed they fell past `answerNotation` entirely into `cfuNotation`'s `fraction_bar` and
  // were given the bar key that way. So the pi rule as first written did not leave them short of
  // a key they never had — it TOOK one, which is the regression this split repairs.
  //
  // Split on the key rather than reordered, for the same reason `solution_set` splits: the two
  // shapes need different rows and different lines, and which one an item is, is a fact about
  // its own key. Reordering was the alternative and is worse in both directions — promoting pi
  // over the radian rule strips the bar key from all 66 D9 practice items, and widening the
  // radian rule to accept `expression` swallows D10's `588*pi` and takes away its pi key.
  if (isPiAnswerText(answerKey)) {
    return (answerKey ?? "").includes("/") ? "pi_expression_fraction" : "pi_expression";
  }
  return "none";
}

/**
 * Which notation a D5 rational answer's EXPRESSION half is written in.
 *
 * The `rational_answer` type says the answer comes in two halves and says nothing at all
 * about how either is written, so the split is the key's: 84 of the 140 served items are
 * keyed as a quotient and 56 as a polynomial, and only the first group needs a bar. The
 * caret and the star are read on top of that for the two smaller cohorts that need one, in
 * that order because a key carrying both is a power first (`3*x^2/2`'s star is a
 * coefficient, which grades fine without it).
 *
 * The bar in the key decides the line as well as the row: the three quotient tags show
 * {@link RATIONAL_EXPRESSION_PLACEHOLDER} and `rational_expression` shows
 * {@link RATIONAL_POLYNOMIAL_PLACEHOLDER}. The three quotient tags differ from each other only
 * in the row of keys.
 */
function rationalNotation(answerKey: string | undefined): AnswerNotation {
  const key = answerKey ?? "";
  if (!key.includes("/")) {
    return "rational_expression";
  }
  if (/(\^|\*\*)/.test(key)) {
    return "rational_quotient_power";
  }
  if (hasLoadBearingStar(key)) {
    return "rational_quotient_product";
  }
  return "rational_quotient";
}

/** The constant-radicand tag for a key, which is the only place a key's SHAPE is read. */
function constantRadicalNotation(answerKey: string | undefined): AnswerNotation {
  switch (radicalShape(answerKey)) {
    case "sum":
      return "constant_radical_sum";
    case "quotient":
      return "constant_radical_quotient";
    case "product":
      return "constant_radical_product";
  }
}

/**
 * The input placeholder for a practice item, so format expectations are visible before the
 * first attempt rather than after it.
 */
export function practicePlaceholder(
  spec: AnswerFormatSpec | undefined,
  allowedSymbols?: readonly string[],
  answerKey?: string,
): string {
  return placeholderForNotation(answerNotation(spec, allowedSymbols, answerKey));
}

/** The one tag-to-line table. Both answer surfaces read it, neither of them adds to it. */
function placeholderForNotation(notation: AnswerNotation): string {
  switch (notation) {
    case "set_builder":
      return SET_BUILDER_PLACEHOLDER;
    case "interval":
      return INTERVAL_PLACEHOLDER;
    case "point":
      return POINT_PLACEHOLDER;
    case "solution_set":
      return SOLUTION_SET_PLACEHOLDER;
    case "multiple_choice":
      return MULTIPLE_CHOICE_PLACEHOLDER;
    case "reduced_fraction":
      return REDUCED_FRACTION_PLACEHOLDER;
    case "positive_exponents":
      return POSITIVE_EXPONENT_PLACEHOLDER;
    case "variable_radical":
      return VARIABLE_RADICAL_PLACEHOLDER;
    case "constant_radical_product":
      return RADICAL_PLACEHOLDER;
    case "constant_radical_quotient":
      return RADICAL_QUOTIENT_PLACEHOLDER;
    case "constant_radical_sum":
      return RADICAL_SUM_PLACEHOLDER;
    case "fraction":
      return FRACTION_PLACEHOLDER;
    case "fraction_bar":
      return FRACTION_BAR_PLACEHOLDER;
    case "exact_radian":
      return EXACT_RADIAN_PLACEHOLDER;
    case "exact_trig_value":
      return EXACT_TRIG_VALUE_PLACEHOLDER;
    case "exponent_notation":
      return EXPONENT_NOTATION_PLACEHOLDER;
    case "solution_set_fraction":
      return SOLUTION_SET_FRACTION_PLACEHOLDER;
    case "implicit_product":
      return IMPLICIT_PRODUCT_PLACEHOLDER;
    case "pi_expression":
      return PI_EXPRESSION_PLACEHOLDER;
    case "pi_expression_fraction":
      return PI_FRACTION_PLACEHOLDER;
    // The D5 expression tags split the way their own keys do: the three quotient tags name a
    // bar and the polynomial one must not. They still share one KEY ROW question, which is the
    // half `answerKeypad` answers, and the three quotient tags differ only there.
    case "rational_expression":
      return RATIONAL_POLYNOMIAL_PLACEHOLDER;
    case "rational_quotient":
    case "rational_quotient_power":
    case "rational_quotient_product":
      return RATIONAL_EXPRESSION_PLACEHOLDER;
    case "none":
      return GENERIC_PLACEHOLDER;
  }
}

/**
 * ONE NOTATION AN ITEM'S ANSWER NEEDS: its spelling in the checker's grammar, and its name
 * in words.
 *
 * It used to be a KEY, on a tappable `Insert notation` strip that spliced `insert` at the
 * caret. The strip is gone at the product lead's instruction, and it could go because of
 * the property `insert` states: every one of these is plain ASCII from the grammar the
 * checker already reads, so the strip could only ever type a string a keyboard could
 * produce. `loadBearingNotation.browser.test.tsx` re-measures that over every served item rather
 * than resting on this sentence, and `answerKeypad.test.ts` still grades each of these
 * spellings against every item that declares it.
 *
 * What the row is FOR now is the decision it always made underneath the buttons: whether
 * this item's answer carries notation a learner has to be told about. That is what
 * {@link MathAnswerColumn} reads, and what puts the item's notation line under the field.
 */
export interface MathKey {
  /** Stable identity, and the hook the sweeps derive their populations by. */
  id: string;
  /**
   * The notation's ONE name, in words, for anything that has to say it rather than draw
   * it. A screen reader announcing a bare slash describes the character and not the job.
   */
  label: string;
  /** How the notation is spelled for the grader. Grader-legal ASCII, nothing else. */
  insert: string;
}

const EXPONENT_KEY: MathKey = {
  id: "exponent",
  label: "insert an exponent",
  insert: "^",
};

const FRACTION_KEY: MathKey = {
  id: "fraction",
  label: "insert a fraction",
  insert: "/",
};

const SQRT_KEY: MathKey = {
  id: "sqrt",
  label: "insert a square root",
  insert: "sqrt()",
};

/**
 * `abs(...)` rather than a pair of pipes. Both spellings grade — the checker reads
 * non-nested `|...|` through `rewritePipeAbsolute`, and 28 served RAD.4 instances accept
 * either — but the pipe path is the one with the documented nesting hazard, and the
 * parenthesised call cannot be mis-paired. So it is the spelling the field advertises.
 */
const ABS_KEY: MathKey = {
  id: "abs",
  label: "insert absolute value bars",
  insert: "abs()",
};

const TIMES_KEY: MathKey = {
  id: "times",
  label: "insert a multiplication sign",
  insert: "*",
};

/**
 * The one entry that is a SPELLING rather than a character.
 *
 * Every other one here is notation a learner has to find on the keyboard. `p` and `i` are on
 * every keyboard there is, and that is not the gap: the gap is that the prompt draws `$\pi$`
 * and the checker reads `pi`, and nothing between them says so. Typing the glyph the prompt
 * shows grades `invalid_input / unknown_symbol`.
 */
const PI_KEY: MathKey = {
  id: "pi",
  label: "insert pi",
  insert: "pi",
};

/**
 * The notation an item's answer field has to name, or none — and so, whether the field
 * gets a {@link MathAnswerColumn} at all.
 *
 * Two rules decide what is here, and both are narrower than "what would be convenient".
 *
 * **Only notation the item's own grader accepts.** Every spelling below was graded against
 * every served instance that would be offered it — 512 (item, notation) pairs over the 268
 * items that get a row, across the six registered domain pools and the interactive one,
 * none of them `invalid_input`. The glyph a learner most wants is the one that is
 * missing: `√` is not in the text checker's grammar at all, so `√2` grades
 * `invalid_input / parse_error`, and advertising `√` would be worse than advertising
 * nothing, because the learner would write it, lose the attempt to a code that scores as
 * unanswered, and be told only "Check the format so the expression can be read." That is
 * the same policy `RADICAL_PLACEHOLDER` already enforces by naming `sqrt(` and never the
 * glyph.
 *
 * **Only notation that is not itself the graded skill.** This is why the seven remaining
 * tags get nothing. A `multiple_choice` answer is the word `decreasing` and has no
 * notation to type. A `point`, a `solution_set`, a plain `numeric` answer and a D5
 * expression keyed as a polynomial (`x + 10`, `(x + 4)*(x - 5)`) are typed with
 * characters a phone keyboard already shows. And a `set_builder` domain is the one
 * case where guidance WOULD help and still must not exist: writing `{x | x != 9}` IS
 * what RAT.5 measures (`SET_BUILDER_NOTATION_NOTE` marks a correct set wrong for being
 * written any other way), so naming the form gives away most of the answer — which
 * is why an `interval` gets nothing either, its brackets being exactly what a correct set
 * written with the wrong ones is marked wrong for (see {@link INTERVAL_PLACEHOLDER}).
 *
 * **A `*` is where the second rule now bites, and which side a template falls on is
 * measured rather than argued.** A star in an answer key is usually a spelling and not
 * notation, because juxtaposition is read almost everywhere: `5*n` grades as `5n` and
 * `(x + 4)*(x - 5)` grades as `(x + 4)(x - 5)`. On 26 templates it is cosmetic in exactly
 * that way, and naming a star there would advertise a character the learner never has to
 * produce. On three it IS the answer — `x*(x + 6)` written `x(x + 6)` grades
 * `invalid_input / unsupported_syntax`, and `log(m*a*q)` written `log(maq)` grades
 * `invalid_input / unknown_symbol` — and §12 of the equivalence spec scores both codes as
 * UNANSWERED, so a learner who omits the star loses the attempt to notation nothing on
 * screen named. Nothing above is a reading of the grammar: `STAR_IS_OPTIONAL` in
 * `answerKeypad.test.ts` re-grades every served instance of every star-carrying template
 * with the star REMOVED, through the same versioned checker the surface grades with, and
 * requires `correct`. The three it cannot hold are the three offered a times key, and a
 * template whose grader stops reading juxtaposition falls out of that list the day it
 * does.
 *
 * The `rational_answer` two-field branch used to stand here as the largest cohort this
 * dispatch deliberately left out, and it is not left out now: its expression half carries
 * the notation note and the live preview, and the four `rational_*` cases in the table
 * below split its 140 served items by what their own key is written in — 84 keyed as a
 * quotient take a bar, 56 keyed as polynomials take nothing, their stars being cosmetic in
 * exactly the way above and their keys carrying no bar to write.
 * `docs/Native_Math_Input_Scope.md` §3.3 is the argument for deferring that work and
 * §3.3.1 records what shipped against it, down to the one piece genuinely still deferred:
 * the general per-field `answerFields(item)` seam, which §3.3 called the prerequisite and
 * which was not on the path at all. This dispatch still answers per ITEM, and the surface
 * composes with it by wrapping ONE of its two inputs.
 */
export function answerKeypad(
  spec: AnswerFormatSpec | undefined,
  allowedSymbols?: readonly string[],
  answerKey?: string,
): readonly MathKey[] {
  return keypadForNotation(answerNotation(spec, allowedSymbols, answerKey));
}

/** The one tag-to-keys table, read by the practice surfaces and by the CFU card alike. */
function keypadForNotation(notation: AnswerNotation): readonly MathKey[] {
  switch (notation) {
    // EXP.1: every key is a power, and a negative exponent has to move under a bar.
    case "positive_exponents":
      return [EXPONENT_KEY, FRACTION_KEY];
    // RAD.4: `2*x*sqrt(2*x)`, `abs(x^5)`, `3*t^2*sqrt(3*t)`. All four appear in served keys.
    case "variable_radical":
      return [SQRT_KEY, ABS_KEY, EXPONENT_KEY, TIMES_KEY];
    // RAD.1 / RAD.2: `4*sqrt(2)`, `sqrt(3)/3` and `4*sqrt(6)+3*sqrt(5)`. ONE row for all
    // three shapes, on purpose: every key here was graded against all 55 of those items
    // before the shapes were told apart, so narrowing the row per shape would take keys
    // away from items whose notation needs have not changed. No bars either way: `abs(3)`
    // over a constant is outside the grammar those items are parsed with and grades
    // `unsupported_syntax`.
    case "constant_radical_product":
    case "constant_radical_quotient":
    case "constant_radical_sum":
      return [SQRT_KEY, TIMES_KEY, FRACTION_KEY];
    // One bar, for every tag whose answer is written with one and whose writing is not the
    // graded skill: a fraction representation, a lowest-terms value, a value that happens to
    // be a fraction, a solution set holding one, and the D5 expression half.
    case "reduced_fraction":
    case "fraction":
    case "fraction_bar":
    case "solution_set_fraction":
    case "rational_quotient":
      return [FRACTION_KEY];
    // An exact radian is a bar and a SPELLED constant, so it is offered both. This row used to
    // be the bar alone, on the reasoning that there was no pi key to offer and the placeholder
    // would carry the spelling. There was a pi key — `pi_expression` shipped one for D10's
    // `588*pi` in the same tree — and these 66 items went without it only because D9 was outside
    // `answerKeypad.test.ts`'s population, so the sweep that requires a key per notation an
    // item's own key uses never ran over a radian key. Two answers needing the identical
    // character cannot be given it in one pool and denied it in the other.
    case "exact_radian":
      return [PI_KEY, FRACTION_KEY];
    // Trigonometry's exact values are a root over an integer, or a plain fraction where the
    // root cancels, so both keys are owed across one generator's draws.
    case "exact_trig_value":
      return [SQRT_KEY, FRACTION_KEY];
    // `d5.rat1.monomial.l1` keys `3*x^2/2`: the caret is as unguessable as the bar.
    case "rational_quotient_power":
      return [EXPONENT_KEY, FRACTION_KEY];
    // `d5.rat3.factorlcd.l3` / `d5.rat3.unlike.l2` key a denominator like `(x*(x + 6))`, where
    // the star cannot be dropped (see {@link hasLoadBearingStar}).
    case "rational_quotient_product":
      return [FRACTION_KEY, TIMES_KEY];
    // NUM.4's `x^2 + 5x`: a caret inside a sum, with no simplification profile to name.
    case "exponent_notation":
      return [EXPONENT_KEY];
    // `d8.el5.condense-sum.l2`'s `log(m*a*q)`, where `log(maq)` is `unknown_symbol`.
    case "implicit_product":
      return [TIMES_KEY];
    // `d10.geo2.cylinder-volume-exact.l3`'s `588*pi`. ONE key, and the absence of a times key
    // beside it is the measured half: `588pi` grades `correct/match` with the star removed on
    // all seven served instances, so a times key would advertise a character the learner never
    // has to produce — the same rule that keeps 27 other starred templates keyless, and the
    // reason this template stays on `STAR_IS_OPTIONAL` after this tag exists.
    case "pi_expression":
      return [PI_KEY];
    // TRG.1's and TRG.6's CFUs, keyed `pi/4` and `pi/6`. Both keys, because both characters are
    // unguessable on this shape and for different reasons: the spelling for the reason above,
    // and the bar because a radian answer is a fraction the learner has to write rather than
    // reduce. `answerKeypad.test.ts` reports a row short of either by name.
    case "pi_expression_fraction":
      return [PI_KEY, FRACTION_KEY];
    case "set_builder":
    case "interval":
    case "point":
    case "solution_set":
    case "multiple_choice":
    // A D5 expression keyed as a polynomial — `x + 10`, `(x + 4)*(x - 5)`. The 56 items in
    // this half need no notation they cannot type: the star is a coefficient's and grades
    // away, and there is no bar to write.
    case "rational_expression":
    case "none":
      return NO_KEYS;
  }
}

/** Shared empty row, so "this item wants no keypad" is one identity everywhere. */
const NO_KEYS: readonly MathKey[] = [];

/**
 * Whether an item's answer field draws the live math PREVIEW under it.
 *
 * **This is a different question from the keypad's, and it used not to be asked at all.**
 * `MathAnswerColumn` rendered both aids or neither, on `keys.length`, so the two answers were
 * one — and the tags that get no keys are precisely the tags whose graded skill IS the
 * notation. A learner writing `(-inf, 5]`, whose whole difficulty is which bracket goes where,
 * had no reading of what they had written, while a learner writing `1/2` did. The keypad's
 * rule is *"is this notation the graded skill"* (a key that types the form types the answer);
 * the preview's rule is the opposite — reading the form back is most valuable exactly where
 * writing it is the skill, because the reading is what says the brackets mean what the learner
 * thinks.
 *
 * So this is a second table over the same tags, exhaustive so the compiler names any new one,
 * and what it asks of each tag is only this: **can `previewOf` READ what a learner types into
 * this field.** A gate opened past the parser is worse than no gate, because the box appears
 * and stays empty — which is what simply deleting the `keys.length` check would have shipped
 * for all five keyless notation tags.
 *
 * The three `false` rows are the whole of the caution:
 *
 *  - `multiple_choice` — the answer is the word `decreasing`, and there is no reading of a
 *    word as mathematics that is not a lie. `previewOf` would draw `\mathrm{decreasing}`.
 *  - `none` — the fall-through tag, reached when the spec has said NOTHING about notation. A
 *    form-dependent CFU with no `check` lands here whatever its answer is, so this cohort
 *    contains words too and cannot be told apart from the inside.
 *  - `set_builder` and `point` — `previewOf` cannot read either. Set-builder needs a grammar
 *    for `|`, `!=` and a bound variable that it deliberately does not have, and a coordinate
 *    pair is byte-identical to an open interval, so the parser reads `(6, -7)` as an interval
 *    and would SPEAK it as one. Both are recorded as not done rather than half-opened.
 */
export function previewsNotation(notation: CfuNotation): boolean {
  switch (notation) {
    // The notation-carrying tags this exists for: the form is the skill, so the reading of
    // the form is the aid. `previewOf` reads interval brackets, unions, and a roster joined
    // by any of the three separators the packs spell.
    case "interval":
    case "solution_set":
    case "solution_set_fraction":
    // Every tag that already had a preview because it already had a key row. Unchanged, and
    // listed rather than defaulted so that "which fields preview" is readable in one place.
    case "reduced_fraction":
    case "positive_exponents":
    case "variable_radical":
    case "constant_radical_product":
    case "constant_radical_quotient":
    case "constant_radical_sum":
    case "fraction":
    case "fraction_bar":
    case "exact_radian":
    case "exact_trig_value":
    case "exponent_notation":
    case "implicit_product":
    case "pi_expression":
    case "pi_expression_fraction":
    case "rational_quotient":
    case "rational_quotient_power":
    case "rational_quotient_product":
    // A D5 expression keyed as a polynomial (`x + 10`, `(x + 4)*(x - 5)`) and a CFU that
    // wants a single evaluated number. Neither needs a KEY — every character is on the
    // keyboard — and both are read by the expression grammar exactly as they stand, so the
    // one reason they had no preview was that they shared the keypad's gate.
    case "rational_expression":
    case "numeric_literal":
      return true;
    case "set_builder":
    case "point":
    case "multiple_choice":
    case "none":
      return false;
  }
}

/** Whether a practice item's answer field draws the preview. Same dispatch as its keypad. */
export function answerPreview(
  spec: AnswerFormatSpec | undefined,
  allowedSymbols?: readonly string[],
  answerKey?: string,
): boolean {
  return previewsNotation(answerNotation(spec, allowedSymbols, answerKey));
}

/**
 * How a CFU answer has to be written. Same job as {@link answerNotation} and the same one
 * dispatch behind both consumers, for the surface whose grading is different.
 *
 * A CFU with a `check` carries a real answer spec, so it reads EXACTLY as practice would
 * for that spec. A form-dependent CFU has no spec at all (grading is an exact match
 * against `accepted`), so its notation is inferred from the answers the author accepts.
 *
 * `numeric_literal` is the one tag that exists only here, because the requirement it names
 * is only true here: the CFU rejects an expression before grading ({@link isNumericLiteral}
 * plus {@link NUMERIC_LITERAL_NOTE}), while practice EVALUATES the response, so `2+3*4-8`
 * grades correct there.
 *
 * `accepted[0]` stands in for the answer key, on both paths. It is the pack's canonical
 * spelling by convention — `WidgetReveal` prints it as the answer the learner is then asked
 * to produce — and for all eight spec-carrying CFUs it is byte-identical to `check.answer_key`,
 * which `answerFormat.test.ts` pins so the convention cannot quietly lapse. That is what lets
 * RAD.1's check, keyed `6*sqrt(2)/5`, read as the quotient it is rather than as the
 * coefficient-times-a-root its accepted list is not.
 */
export type CfuNotation = AnswerNotation | "numeric_literal";

/**
 * A CFU's check block, as this module reads it: an answer spec plus the symbols the pack
 * declares its answer may contain.
 *
 * The symbols are here rather than left out because `answerNotation` splits one tag on them,
 * and RAD.4 is the pack that split falls on. `simplification: "simplified_radical"` routes to
 * `variable_radical` when the item declares a symbol and to the three constant-radicand tags
 * when it does not, which is the same gate the CHECKER uses to decide whether bars are even
 * possible (`compareRadical`'s `symbols.length > 0`). Passing `undefined` here, as this
 * function did while no check could declare a symbol, tagged RAD.4's `6*abs(x^3)` as a
 * constant product the moment it gained a check — advertising "A simplified radical:
 * 5*sqrt(2)" over an answer that needs bars, and taking away the `abs()` key that types them.
 */
export type CfuFormatSpec = AnswerFormatSpec & {
  readonly allowed_symbols?: readonly string[];
};

export function cfuNotation(
  check: CfuFormatSpec | undefined,
  accepted: readonly string[],
): CfuNotation {
  const fromSpec = answerNotation(check, check?.allowed_symbols, accepted[0]);
  if (fromSpec !== "none") {
    return fromSpec;
  }
  // Absolute value is checked first: an answer carrying bars needs the notation for the
  // bars named even when it also carries a root or a power.
  if (accepted.some(isAbsoluteValueAnswerText)) {
    return "variable_radical";
  }
  if (accepted.some(isRadicalAnswerText)) {
    return constantRadicalNotation(accepted[0]);
  }
  if (accepted.some(isPositiveExponentAnswerText)) {
    return "positive_exponents";
  }
  // The three keyless FORM tags, below the notation cases above because each of them claims
  // the answer is a bracketed pair or a roster and NOTHING else, which is false of every
  // answer that reached this far. `interval` before `point`, and a point recognized only when
  // the pack names its two numbers as coordinates: the two notations are byte-identical in
  // this shape, so the pack has to say. See {@link namesCoordinatesAnswerText}.
  //
  // The two SHAPE predicates read the canonical spelling and the two PACK-SAYS-SO predicates
  // read the whole list, and the split is the fix for a defect that reached three nodes.
  // "The answer is a bracketed pair" is a claim about the answer the learner is asked to
  // produce, so an alternative spelling must not be able to make it: `solutionSetForms` spells
  // a roster as `{-4, 2/5}` AND as `[-4, 2/5]`, the square-bracket form satisfies
  // {@link isIntervalAnswerText}, and under `.some` that alternative retagged the whole answer
  // as an interval. POL.4's re-ask then showed "Interval, e.g. (-inf, 2] U (7, inf)" with no
  // keypad over an answer of `-4, 2/5`, while its own authored question showed the fraction
  // line and the slash key — so the guidance did not go missing, it reversed. POL.3 and LIN.5
  // were misdirected the same way.
  //
  // `namesCoordinatesAnswerText` and {@link isSolutionRosterAnswerText} keep their `.some`,
  // because each is the pack ASSERTING something about an answer whose canonical spelling
  // cannot carry it: a point is told from an interval only by a `x = 2, y = -3` spelling
  // listed second, and a roster's braces are likewise the alternative to a bare `39, 51`.
  // This is the same rule the two character-level tests below already follow, and for the
  // same reason.
  const canonical = accepted[0] ?? "";
  if (isCoordinatePairAnswerText(canonical)) {
    return accepted.some(namesCoordinatesAnswerText) ? "point" : "interval";
  }
  // Split by whether the answer holds a fraction, which is the split `answerNotation` already
  // makes one branch above for a spec-carrying item: "the roster brackets are on every
  // keyboard; a root written as a fraction is not". The shape rule here did not, and POL.4's
  // re-ask is why it has to. Its canonical answer is `-4, 2/5`, and `solutionSetForms` spells
  // the second root as the decimal `0.4` as well as the fraction, so `{-4, 0.4}` satisfies
  // {@link isSolutionRosterAnswerText} and the roster rule fires on a list whose canonical
  // member is not a plain-number roster at all. Tagged flatly `solution_set` the field then
  // offered NO keys over an answer that cannot be written without a slash.
  //
  // Read off the canonical spelling for the same reason as the coordinate-pair rule above: the
  // decimal is an alternative nobody is asked to produce, and what the field has to name is the
  // notation of the answer the learner IS asked to produce.
  //
  // The ROSTER is read before the interval, because braces are the unambiguous half of the pair.
  // `{5, 11}` is a set and can be nothing else, whereas `[5, 11]` is the closed interval LIN.4's
  // second slide teaches. `solutionSetForms` USED to spell every roster it generates with a
  // bracketed alternative beside the braced one, so reading the interval first flipped every
  // DRAWN two-value re-ask onto the interval line: LIN.5's `|x - 8| = 3` advertised
  // `Interval, e.g. (-inf, 2] U (7, inf)` for an answer that is two numbers, on the one surface a
  // learner reaches only after already missing once. The authored question was unaffected, which
  // is how it survived a pass over the packs.
  //
  // That generated alternative is gone (a bracketed roster is a MIS-spelling, not a synonym: the
  // checker now reads `[5, 11]` as the interval it looks like), so no served instance offers the
  // shape this ordering was written against. The ordering stays anyway, because it is the rule
  // that makes the removal safe to have made rather than a second thing depending on it, and
  // because a pack may still author a bracketed form by hand. `cfuRosterBracketing.test.ts` is
  // what asserts no instance does.
  if (accepted.some(isSolutionRosterAnswerText)) {
    return isFractionBarAnswerText(canonical) ? "solution_set_fraction" : "solution_set";
  }
  // Below the roster by the ordering above, and reading the CANONICAL spelling by the rule the
  // shape predicates follow. The two answer to the same defect from opposite ends and the merge
  // keeps both: the ordering settles a braced roster before its bracketed look-alike is ever
  // considered, and the canonical reading means a bracketed spelling listed as an ALTERNATIVE
  // cannot claim an answer nobody is asked to write that way. Either alone would have fixed
  // POL.4 and LIN.5; the second is what still holds if a pack hand-authors the bracketed form
  // that `cfuRosterBracketing.test.ts` currently finds nowhere.
  if (isIntervalAnswerText(canonical)) {
    return "interval";
  }
  // Last of the shape rules, because both are only "there is a character here you have to
  // type" and every rule above is a stronger statement about the same string.
  //
  // These two read the CANONICAL spelling rather than the whole list, and RAT.3 is why: its
  // accepted list carries `(x+14)/(x^2+3x-4)` as an alternative, while its prompt asks for a
  // FACTORED denominator, so an `.some` here names the caret of a spelling the item is asking
  // the learner not to write and hides the bar of the one it is asking for. Where two rules
  // are both about one character, the character in the answer the learner is being asked to
  // produce wins.
  if (isExponentNotationAnswerText(accepted[0] ?? "")) {
    return "exponent_notation";
  }
  if (isFractionBarAnswerText(accepted[0] ?? "")) {
    return "fraction_bar";
  }
  if (check?.answer_type === "numeric") {
    return "numeric_literal";
  }
  return "none";
}

/**
 * The input placeholder for a CFU answer field. The ONE entry point the check-your
 * understanding card uses, so the guidance a learner meets there cannot drift from the
 * guidance the two practice surfaces give for the same node — PR-era QA recorded exactly
 * that divergence ("CFU vs practice accept different input languages") as a finding, and
 * EXP.1 was living proof: `practicePlaceholder` had named its notation since the
 * `positive_exponents` branch landed, while the CFU card, keying off its own separate
 * ladder, still showed the bare "Your answer".
 */
export function cfuPlaceholder(
  check: CfuFormatSpec | undefined,
  accepted: readonly string[],
): string {
  const notation = cfuNotation(check, accepted);
  return notation === "numeric_literal"
    ? NUMERIC_LITERAL_PLACEHOLDER
    : placeholderForNotation(notation);
}

/**
 * The keys a CFU answer field offers, or none.
 *
 * This is the surface the reported screenshot was taken on, and the one where the keypad
 * has the most to say: EXP.1's check asks for `1/x^2` and its accepted list is the whole
 * grader, so a learner who does not know that `^` writes an exponent cannot get past it
 * however well they understand exponents.
 *
 * The acceptance rule is the same as practice's and its evidence is different, because
 * the grader is different: a form-dependent CFU is an exact match against a hand-authored
 * list, so what has to be true is that the pack's own canonical accepted answer can be
 * TYPED from these keys plus the letters and digits a keyboard already has.
 * `answerKeypad.test.ts` checks that over every content pack.
 *
 * `numeric_literal` gets nothing, and that is the interesting case rather than an
 * oversight: a bare `a/b` does satisfy {@link isNumericLiteral}, so a fraction key would
 * type something the gate admits — but the field says "A single number, e.g. 7", and a key
 * that contradicts the line above it is the drift this one dispatch exists to prevent.
 */
export function cfuKeypad(
  check: CfuFormatSpec | undefined,
  accepted: readonly string[],
): readonly MathKey[] {
  const notation = cfuNotation(check, accepted);
  return notation === "numeric_literal" ? NO_KEYS : keypadForNotation(notation);
}

/**
 * Whether a CFU answer field draws the preview. The `numeric_literal` special case above has
 * no counterpart here, and that difference is the point: the reason that tag gets no KEY is
 * that a fraction key would contradict the line over the field, which is an argument about
 * what a key advertises. A preview advertises nothing — it reads back what is already typed —
 * so "A single number, e.g. 7" and a preview of the number are in no tension at all.
 */
export function cfuPreview(
  check: AnswerFormatSpec | undefined,
  accepted: readonly string[],
): boolean {
  return previewsNotation(cfuNotation(check, accepted));
}

/** Shown when an expand-only prompt receives an answer with the constants still separate. */
export const COMBINE_CONSTANTS_NOTE =
  "Add the plain numbers together into one constant. You can leave the variable terms uncombined.";

/**
 * Shown when an `expr_builder` rational power is built with the right exponent VALUE
 * but not in lowest terms (e.g. 3/6 for a key of 1/2). Keyed off the comparator's own
 * `exponent_not_reduced` code rather than an `answer_spec.simplification` profile,
 * because a widget answer carries no text simplification profile.
 */
export const EXPONENT_LOWEST_TERMS_NOTE =
  "The value is right. Reduce the exponent to lowest terms (for example, 1/2, not 3/6).";

/**
 * Shown when a rational answer's EXPRESSION is right but an exclusion is missing. The
 * expression is only half of a `rational_answer` key: the values the ORIGINAL denominator
 * forbids survive the cancelling, so a student who reduces correctly and lists nothing is
 * told which half is short rather than that the whole answer is wrong.
 */
export const MISSING_EXCLUSION_NOTE =
  "The expression is right. One excluded value is missing: read them off the ORIGINAL denominator, before you cancelled.";

/** Shown when a rational answer lists an excluded value the original denominator allows. */
export const EXTRA_EXCLUSION_NOTE =
  "The expression is right, but one listed value is not excluded. Only the zeros of the ORIGINAL denominator are.";

/**
 * Shown when a set-builder domain is written in some other notation. The comparator reads
 * the SET correctly and still marks it wrong, because writing the form is the skill, so the
 * note has to say that rather than leave the student hunting for a wrong value.
 */
export const SET_BUILDER_NOTATION_NOTE =
  "That set looks right, but this asks for set-builder notation. Write it like {x | x != 2}.";

/** Shown when a coordinate answer is not written as a pair. */
export const POINT_NOTATION_NOTE =
  "Give the point as a coordinate pair in parentheses, like (3, 5).";

/** Shown when a point has the right two numbers in the wrong order. */
export const COORDINATES_SWAPPED_NOTE =
  "Those are the right two numbers in the wrong order. The x-value comes first.";

/**
 * Shown when an interval (or a set-builder condition) has the right ENDPOINTS and the wrong
 * inclusivity. `wrong_bound_inclusivity` is the one interval verdict that says the solving
 * was right, so the generic "Not quite" points at the only part that was not wrong, and it
 * discards precisely the distinction the false-positive battery behind this category was
 * built to preserve: a strict bound and a weak one are DIFFERENT sets, and the comparator is
 * careful to report them separately rather than as a plain value miss.
 */
export const BOUND_INCLUSIVITY_NOTE =
  "The endpoints are right; which ones are included is not. A square bracket includes that endpoint, a round one leaves it out.";

/**
 * Shown when a solution set carries a value that does not survive the check. For RAT.6
 * this is almost always the extraneous root, so the note points at the original
 * denominators rather than at the algebra, which was probably fine.
 */
export const EXTRA_SOLUTION_NOTE =
  "One of those values does not hold up. Test each candidate in the ORIGINAL equation: a value its denominator forbids has to be thrown out.";

/** Shown when a solution set is right as far as it goes but misses a root. */
export const INCOMPLETE_SOLUTION_SET_NOTE =
  "What you listed checks out, but it is not the whole set. Every candidate that survives the check belongs in the answer.";

/**
 * Placeholder for the expression half of a rational answer whose own key carries a bar: 84 of
 * the 140 served, the three `rational_quotient*` tags.
 */
export const RATIONAL_EXPRESSION_PLACEHOLDER = "Simplified, e.g. (x+3)/(x+2)";

/**
 * Placeholder for the expression half whose key reduces to a POLYNOMIAL: the
 * `rational_expression` tag, 70 items over nine templates (56 lesson-practice items across
 * eight, plus the diagnostic's `prod.rat-1.l2`), keyed as a monomial (`5*x`), a binomial
 * (`x + 10`, `5*x - 35`) or a product of two binomials (`(x + 4)*(x - 5)`).
 *
 * Both halves of this field used to show {@link RATIONAL_EXPRESSION_PLACEHOLDER}, which names
 * a bar these answers must not contain, the one thing a learner here most needs not to be
 * told, because the work is noticing the quotient cancels.
 *
 * ## Why the line names TWO shapes (2026-08-05)
 *
 * It used to name one, `(x+1)*(x+8)`, on the reasoning that a product is the shape the two
 * hardest templates in the cohort key. That reasoning is quoted rather than deleted because
 * it was right about those two and wrong about the other seven: on a binomial-keyed item the
 * example demonstrates the WRONG OUTPUT SHAPE. The owner hit it on `prod.rat-1.l2`, where
 * `(x^2 + 7x + 6)/(x + 1)` reduces to `x + 6` and the greyed line under the field advertises
 * a product.
 *
 * One example cannot be right for this cohort, and that is measured rather than argued: the
 * 70 items carry 48 distinct keys, 14 of them products of two binomials and the rest
 * monomials or binomials. So the line shows one of each and asserts neither is yours.
 *
 * **Neither example answers anything it is shown on.** Graded through the versioned checker
 * against all 70, `7*x` and `(x+2)*(x-9)` are each `incorrect / value_mismatch` on every one
 * and parse on every one, against a control where all 70 own keys grade `correct`. That is
 * the per-form sweep in `answerFormat.test.ts`, and it is why the shorter `x + 6` is
 * unusable: it grades CORRECT on 3 of the 70.
 *
 * **It fits, and "fits" means in DEJAVU SANS.** `answerPlaceholderFit.browser.test.tsx` is the
 * guard, and its header is explicit that a placeholder's width is a property of the string AND
 * the machine. This line was first written as `Simplified, e.g. 7*x or (x+2)*(x-9)`, measured
 * at 243.1px against a 260.6px budget on a dev box, and CI refused it at 270.4px against
 * 257.3px: `system-ui` resolves to Noto Sans here and DejaVu Sans on ubuntu-latest, and the
 * field itself narrows from 312.8px to 308.8px as the Check button beside it grows. Forcing
 * `"DejaVu Sans"` onto the card reproduces the runner's numbers exactly, which is how the
 * shorter line below was chosen rather than guessed: **235.4px against the 257.3px budget**,
 * where the old one sat at 223.8px. Shorten the placeholder, never the headroom.
 *
 * A CROSS-LANE edit, 2026-08-05, on the owner's direction: `Content_Authoring_Split.md` §11.1
 * puts this file in Anthony's lane. It reaches all 70 items rather than the one reported.
 */
export const RATIONAL_POLYNOMIAL_PLACEHOLDER = "Simplified: 7*x or (x+2)*(x-9)";

/**
 * Placeholder for the exclusion half. The comparator evaluates each listed value as a
 * number, so `x != -2` does not parse; the placeholder advertises the notation that works.
 */
export const RATIONAL_EXCLUSIONS_PLACEHOLDER = "Numbers only, e.g. -2, 3";

/**
 * Placeholder for a set-builder domain (RAT.5). Writing the FORM is the skill there, so an
 * equivalent interval answer is graded a miss; the placeholder shows the shape up front.
 *
 * The excluded value is `9` rather than `2`, which is the served answer to `d5.rat5.domain.l1`
 * — one in seven set-builder items, so the old line handed that learner the whole answer.
 */
export const SET_BUILDER_PLACEHOLDER = "Set-builder, e.g. {x | x != 9}";

/**
 * Placeholder for a coordinate answer: a hole, or an intercept given as a pair. The pair is
 * `(6, -7)` rather than `(3, 5)`, the served answer to `d7.lf4.substitution.l1`, and it shows
 * a negative coordinate while it is there.
 */
export const POINT_PLACEHOLDER = "A point, e.g. (6, -7)";

/**
 * Placeholder for a solution set. A lone root may be typed bare, so say so.
 *
 * `13` rather than `4`: two served RAT.6 items have the key `{4}`, and a bare `4` grades
 * correct against it, so the old line answered them. Every served solution set is a
 * singleton, so the two-element example cannot answer one either.
 *
 * What it does NOT say is how to write an EMPTY solution set, which the comparator accepts as
 * `{}`, `none`, `∅`, `empty` or the words "no solution". No served item has an empty key —
 * LIN.5's no-solution fixture is a golden anchor, not a practice item — so nothing is broken
 * today, but the first served no-solution item will need this line to grow a second form.
 */
export const SOLUTION_SET_PLACEHOLDER = "Every solution: 13 or {-1, 4}";

/**
 * Placeholder for a choose-one answer (D7's classify families: increasing / decreasing /
 * constant, parallel / perpendicular / neither). The choices live in the prompt and the
 * input is a plain text field, so the placeholder's job is to say that one of the offered
 * options is wanted, not a paraphrase of one.
 *
 * "options … above" rather than the previous "words listed in the question", which was both
 * the widest string in this module — 311.0px in a 308.8px field on the CI runner's font, so
 * it was clipped — and inaccurate: three of the nine served keys are two-word phrases
 * (`infinitely many`, `one solution`, `no solution`), and a learner told to type a WORD has
 * been told the wrong thing. "Above" is where the choices are on all three answer surfaces:
 * every one of them renders the prompt before the answer row.
 *
 * It names no option, which is why it is the one placeholder with nothing in the leak table:
 * any example it could give would BE the answer to some served item.
 */
export const MULTIPLE_CHOICE_PLACEHOLDER = "One of the options above";

/**
 * How a TEXT answer is normalized on its way to the checker.
 *
 * `multiple_choice` is graded by an exact `===` against the authored key, so a learner who
 * picks the right option and capitalizes it is marked wrong. That is not hypothetical: the
 * option is typed into a plain text field, and a mobile keyboard capitalizes the first
 * letter of one by default. Casing is never the skill a choose-one item measures, so it is
 * folded here. Interior spacing is COLLAPSED rather than stripped, because two D7 keys
 * ("one solution", "infinitely many") contain a space and stripping would never match.
 *
 * Every other answer type keeps case and spacing, then canonicalizes only unambiguous uses of
 * the square-root glyph at the input boundary. `√2` becomes `sqrt(2)` while `√2x` stays as typed
 * and fails closed because its scope is ambiguous.
 */
export function normalizeTextSubmission(
  value: string,
  answerType: AnswerFormatSpec["answer_type"],
): string {
  const trimmed = value.trim();
  return answerType === "multiple_choice"
    ? trimmed.toLowerCase().replace(/\s+/g, " ")
    : canonicalizeRootGlyphInput(trimmed);
}

export const GENERIC_MISS_NOTE = "Not quite. Try again, reveal a hint, or work through it.";

/**
 * The retry line for the 28 packs with no `check` block, whose accepted list IS the grader.
 *
 * Every refusal on those packs returned `note: null`, so the card fell back to
 * {@link GENERIC_MISS_NOTE} and the learner was told nothing about the one thing that is
 * actually different about them: they are graded on how the answer is WRITTEN and not only on
 * what it comes to. A checked pack has a reason code and so gets a note naming the profile that
 * refused it; these had no reason code and so got the generic line over every miss.
 *
 * Worded to claim nothing about the value, unlike {@link POSITIVE_EXPONENT_NOTE}. There is no
 * comparator on these packs, so nobody knows whether the value was right, and a line saying it
 * was would be a guess printed as a fact.
 */
export const EXACT_FORM_NOTE =
  "Not quite. This one is graded on how the answer is written as well as on its value, so check yours against the form the answer field asks for.";

/**
 * {@link EXACT_FORM_NOTE}, or `null` where the field names no form for it to point at.
 *
 * The gate is not caution, it is the note being true or not. `cfuNotation` returns `"none"` for
 * a pack whose accepted list carries no notation the field can advertise, and there the
 * placeholder reads "Your answer" — so "the form the answer field asks for" would be pointing
 * the learner at nothing. Those packs keep the generic line, which at least names the reveal.
 */
export function exactMatchFormNote(accepted: readonly string[]): string | null {
  return cfuNotation(undefined, accepted) === "none" ? null : EXACT_FORM_NOTE;
}

/**
 * The retry line for a wrong answer. A form miss (the value is right but written in
 * a shape the item's simplification profile rejects) names the fix, so the student
 * is not left guessing why an equivalent-looking answer was marked wrong.
 */
export function missNote(spec: AnswerFormatSpec | undefined, reasonCode: string): string {
  // The expr_builder widget names this form miss directly; it has no text profile.
  if (reasonCode === "exponent_not_reduced") {
    return EXPONENT_LOWEST_TERMS_NOTE;
  }
  // A rational answer is graded on two halves, so name the half that missed.
  if (reasonCode === "missing_exclusion") {
    return MISSING_EXCLUSION_NOTE;
  }
  if (reasonCode === "extra_exclusion") {
    return EXTRA_EXCLUSION_NOTE;
  }
  // A solution set is graded as a set, so say which way it is off.
  if (reasonCode === "extra_solution") {
    return EXTRA_SOLUTION_NOTE;
  }
  if (reasonCode === "incomplete_solution_set") {
    return INCOMPLETE_SOLUTION_SET_NOTE;
  }
  if (reasonCode === "coordinates_swapped") {
    return COORDINATES_SWAPPED_NOTE;
  }
  // An interval / set-builder answer whose endpoints are right and whose brackets are not.
  if (reasonCode === "wrong_bound_inclusivity") {
    return BOUND_INCLUSIVITY_NOTE;
  }
  // `wrong_notation` means the value may be right and the WRITING is not, so it can only
  // be answered by knowing which notation this item wanted.
  if (reasonCode === "wrong_notation") {
    if (spec?.required_notation === "set_builder") {
      return SET_BUILDER_NOTATION_NOTE;
    }
    if (spec?.answer_type === "point") {
      return POINT_NOTATION_NOTE;
    }
    return GENERIC_MISS_NOTE;
  }
  const formMiss = reasonCode === "not_simplified" || reasonCode === "wrong_representation";
  if (!formMiss) {
    return GENERIC_MISS_NOTE;
  }
  if (spec?.simplification === "reduced_fraction") {
    return REDUCED_FRACTION_NOTE;
  }
  if (spec?.simplification === "positive_exponents") {
    return POSITIVE_EXPONENT_NOTE;
  }
  if (spec?.simplification === "combined_constants") {
    return COMBINE_CONSTANTS_NOTE;
  }
  if (spec?.simplification === "simplified_radical") {
    return SIMPLIFIED_RADICAL_NOTE;
  }
  if (spec?.simplification === "canonical_exact_trig_value") {
    return EXACT_TRIG_FORM_NOTE;
  }
  return GENERIC_MISS_NOTE;
}

/**
 * Turn a checker `answer_key` into inline KaTeX markdown for a reveal line.
 * Fractions become stacked frac; expression keys drop digit-*letter (3*x -> 3x)
 * and map remaining `*` to `\times`.
 */
export function answerKeyMarkdown(answerKey: string): string {
  const trimmed = answerKey.trim();
  if (!trimmed) {
    return "";
  }
  const frac = /^(-?\d+)\s*\/\s*(-?\d+)$/.exec(trimmed);
  if (frac?.[1] !== undefined && frac[2] !== undefined) {
    return `$\\frac{${frac[1]}}{${frac[2]}}$`;
  }
  const latex = trimmed
    .replace(/(\d)\s*\*\s*([a-zA-Z])/g, "$1$2")
    .replace(/\*/g, " \\times ");
  return `$${latex}$`;
}

/**
 * The line that states the answer beside a revealed worked solution. A text item shows
 * its inline answer key; an interactive item has no text key (the answer lives in its
 * private `interactive_spec`), so it points at the worked solution below instead of
 * printing "The answer was ." with an empty key.
 *
 * Shared rather than per-surface: the endless drill reveals after a miss or a skip and the
 * Hard Winter reveals after every answer, and the two must not drift into two different
 * ways of saying the same fact.
 */
export function revealedAnswerLine(item: {
  readonly answer: {
    readonly answer_spec: { readonly answer_type: AnswerType };
    readonly answer_key?: string | null;
  };
}): string {
  if (isInteractiveAnswerType(item.answer.answer_spec.answer_type)) {
    return "Here's the worked solution.";
  }
  return `The answer was ${answerKeyMarkdown(item.answer.answer_key ?? "")}.`;
}
