import type { CheckAnswerResult } from "@cr/components";

import { GENERIC_PLACEHOLDER } from "./answerFormat";

/**
 * WHAT EVERY ANSWER SURFACE SAYS WHEN THE READER COULD NOT READ THE ANSWER, in one place.
 *
 * ## The defect this exists for, and why it could not be fixed per surface
 *
 * Ten surfaces in this app take free-text mathematics from a learner and grade it through a
 * versioned checker. Every one of them read `client_correct` off the result and dropped the
 * `status`, so `invalid_input` — the reader saying it could not read the characters at all — was
 * indistinguishable from a wrong answer. What each surface then did with that boolean differed,
 * and the differences are the severity:
 *
 *  - the diagnostic re-served the same node while its own question counter advanced;
 *  - `LessonPractice` said "Check the answer format so it can be read", painted as a MISS;
 *  - the check-your-understanding card said *"Not quite"*, which is a false statement about an
 *    answer nobody graded;
 *  - `InfiniteDrill` broke the learner's streak AND revealed the answer;
 *  - the era ceremony dispatched `missed`, costing a ceremony check, four lines under a comment
 *    reading *"A malformed submission is NOT a miss ... it cannot cost a check the learner did
 *    not actually get wrong"*;
 *  - the four crisis surfaces banked it as a wrong answer, with the crisis consequence.
 *
 * Scoping a fix to where the diagnostic implements its input would have left nine of those
 * standing, which is the failure `.cursor/rules/qa-verification.mdc` names: a population scoped
 * to an abstraction rather than to the behaviour. Exhibiting the behaviour is what makes a
 * surface a member, and `answerUnreadableEverywhere.test.tsx` derives the population from the
 * one thing every member does — read `client_correct`.
 *
 * ## The rule that keeps this from leaking correctness
 *
 * **The message may talk about the CHARACTERS the learner typed. It may never talk about the
 * mathematics they meant.**
 *
 * That is what makes every line below safe to say on an instrument with no correctness feedback.
 * "Type a square root as `sqrt(...)`" is true of the field whatever the right answer is; it is a
 * fact about the grammar, and the same sentence is owed to a learner whose answer was right and
 * mis-spelled as to one whose answer was wrong. Anything that reasoned about what the expression
 * MEANS — "you want an expression in x", "that is not a number" — would narrow the answer space,
 * so it is not here, and where a reason code tempts one the line falls back to teaching the
 * grammar instead ({@link ANSWER_GRAMMAR}).
 *
 * The gate is the checker's own `status` and nothing else: `invalid_input` only, never
 * `client_correct`, never a comparison against the answer key. `isScorable`
 * (`engines/diagnostic/src/scoring.ts`) and `isResolvingStatus` (`engines/lesson/src/index.ts`)
 * both admit exactly `correct` and `incorrect`, so a message fires precisely when the response
 * would not have counted — a fact independent of whether the answer was right.
 *
 * `unsupported_expression` and `scoring_error` are deliberately NOT here. Both are application
 * faults (`Assessment_Scoring_Spec` §6) rather than unreadable input, and no rewriting gets a
 * learner past one, so a surface that refused them would strand its learner.
 *
 * ## The order the advice is chosen in, and why
 *
 * 1. **A glyph the grammar has no reading for** ({@link GLYPH_FIXES}). Most specific and
 *    completely safe: a substitution of one character for its ASCII spelling.
 * 2. **A reason code with a mechanical instruction** ({@link REASON_FIXES}) — length, an
 *    exponent outside the grammar, a two-field payload with a half missing.
 * 3. **The item's own notation line, verbatim**, which is the string its field already shows as
 *    a placeholder. It is the one dispatch every surface reads (`answerFormat.ts`) and every one
 *    of those strings is graded against every item it is shown to by the leak sweep in
 *    `answerFormat.test.ts`, so re-using it inherits that vetting rather than inventing a
 *    second wording that would need it again. This is also what a placeholder cannot do on its
 *    own: it is gone the moment the learner types, which is exactly when they need it.
 * 4. **The grammar**, when the item has no notation line of its own.
 */

/** The lead sentence, identical on every surface: what happened, and what it cost. */
export const UNREADABLE_LEAD = "We couldn't read that, so nothing was counted.";

/** The fallback advice, for an item whose own field advertises nothing in particular. */
export const ANSWER_GRAMMAR =
  "Type it in plain text: * for multiply, / for a fraction, ^ for a power, sqrt() for a root.";

/**
 * Glyphs the checker's grammar cannot read, each with its ASCII spelling.
 *
 * Every one is a character a learner reasonably reaches for because the PROMPT is typeset: the
 * question draws a real radical sign and a real pi, and nothing between the drawing and the
 * parser says how to type them. `parseSafeExpression` returns `invalid_input` on all of them.
 *
 * Purely lexical, and that is the whole safety argument: each entry answers "what is this
 * character called in ASCII", which is true of the field regardless of the answer.
 */
const GLYPH_FIXES: readonly { readonly test: RegExp; readonly fix: string }[] = [
  {
    test: /[√∛]/,
    fix: "Type a root as sqrt(...) or cbrt(...), for example sqrt(12).",
  },
  { test: /π/, fix: "Spell pi with the letters p and i, for example 3*pi." },
  { test: /[×·⋅✕]/, fix: "Use * for multiplication, for example 3*x." },
  { test: /[÷]/, fix: "Use / for division, for example 3/4." },
  { test: /\\/, fix: "Type it in plain text rather than LaTeX: no backslashes." },
  {
    test: /[⁰¹²³⁴⁵⁶⁷⁸⁹]/,
    fix: "Use ^ for a power, for example x^2 rather than a raised digit.",
  },
  { test: /[{}]/, fix: "Use ( and ) for grouping, for example 2*(x + 1)." },
];

/**
 * Reason codes whose fix is mechanical: about the SHAPE of what arrived rather than about what
 * it meant. Anything that would need to reason about the mathematics is deliberately absent and
 * falls through to the item's own notation line.
 *
 * The number in the `unsupported_exponent` line is `MAX_EXPONENT`, and it is the one line here
 * that can go FALSE without anybody touching this file: it is a claim about the parser's
 * grammar, so it rots the moment the cap moves. It said 8 while the cap was 8 and had to be
 * rewritten with it when the cap went to 16. `exponentCap.test.ts` reads the cap off the real
 * comparator by scanning, rather than importing the constant, and fails whichever way the two
 * come apart — so a learner is never told a bound the grader does not apply, in either
 * direction.
 */
const REASON_FIXES: Readonly<Record<string, string>> = {
  empty_answer: "Type your answer in the box first.",
  input_too_long: "That is longer than we can read. Write it more simply and try again.",
  expression_too_complex:
    "That is more complicated than we can read. Write it more simply and try again.",
  number_too_large: "That number is longer than we can read. Round it or write it shorter.",
  unsupported_exponent:
    "Write a power with ^ and a whole number up to 16, for example x^3.",
  unsupported_syntax: "Write products with * and powers with ^, for example 2*x^3.",
  invalid_rational_answer:
    "Fill in both boxes: the simplified expression, and the values it excludes.",
  wrong_input_type: "Type your answer in the box first.",
};

/**
 * Two or more letters run together, which mathjs lexes as ONE symbol: `log(maq)` is a symbol
 * named `maq` and not a product of three. It is the one `unknown_symbol` cause with a safe fix,
 * because the correction is about the spacing of characters rather than about the value.
 *
 * The letter run has to be longer than every symbol the item declares, or a legitimate
 * multi-character variable would be told to split itself up.
 */
function lettersRunTogether(typed: string, allowedSymbols: readonly string[]): boolean {
  const longest = allowedSymbols.reduce((max, symbol) => Math.max(max, symbol.length), 1);
  const runs = typed.match(/[A-Za-z]{2,}/g) ?? [];
  return runs.some((run) => run.length > longest && !FUNCTION_NAMES.has(run.toLowerCase()));
}

/** Every name the grammar can read as a function call, so a call is never mistaken for a run. */
const FUNCTION_NAMES: ReadonlySet<string> = new Set([
  "abs",
  "cbrt",
  "ln",
  "log",
  "nthroot",
  "sqrt",
]);

export interface UnreadableAnswer {
  /** The checker's own reason code, for a surface that wants to log or branch on it. */
  reasonCode: string;
  /** What happened. Identical everywhere, so the learner learns it once. */
  lead: string;
  /** What to do about it. Never a statement about the mathematics. */
  fix: string;
  /** The two together, for a surface with one line to render. */
  message: string;
}

/**
 * Was this answer unreadable, and if so what should the learner be told?
 *
 * `null` for every verdict the instrument can score, which is the no-leak property in the
 * signature: a `correct` and an `incorrect` are the same answer here, so no surface can
 * accidentally say something on one and not the other.
 *
 * @param result the verdict from the surface's own versioned checker
 * @param typed what the learner typed, read ONLY for the glyph substitutions above
 * @param options.allowedSymbols the item's declared symbols, for the letters-run-together fix
 * @param options.notationLine the item's own placeholder, its vetted notation advice
 */
export function unreadableAnswer(
  result: Pick<CheckAnswerResult, "status" | "reason_code"> | null | undefined,
  typed: unknown,
  options: {
    allowedSymbols?: readonly string[];
    notationLine?: string;
  } = {},
): UnreadableAnswer | null {
  if (!result || result.status !== "invalid_input") {
    return null;
  }
  const text = typeof typed === "string" ? typed : readTextOf(typed);
  const fix = fixFor(result.reason_code, text, options);
  return {
    reasonCode: result.reason_code,
    lead: UNREADABLE_LEAD,
    fix,
    message: `${UNREADABLE_LEAD} ${fix}`,
  };
}

/**
 * The text inside a structured payload, so the two-field `rational_answer` gets glyph advice
 * on what was actually typed. A widget payload has no text and contributes none.
 */
function readTextOf(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const record = payload as Record<string, unknown>;
  return [record.expression, record.excluded_values]
    .filter((part): part is string => typeof part === "string")
    .join(" ");
}

function fixFor(
  reasonCode: string,
  typed: string,
  options: { allowedSymbols?: readonly string[]; notationLine?: string },
): string {
  for (const glyph of GLYPH_FIXES) {
    if (glyph.test.test(typed)) {
      return glyph.fix;
    }
  }
  const byReason = REASON_FIXES[reasonCode];
  if (byReason !== undefined) {
    return byReason;
  }
  if (
    reasonCode === "unknown_symbol" &&
    lettersRunTogether(typed, options.allowedSymbols ?? [])
  ) {
    return "Put * between letters that are multiplied, for example a*b.";
  }
  const line = options.notationLine?.trim();
  if (line && line !== GENERIC_PLACEHOLDER) {
    /*
     * VERBATIM, with no lead-in of its own. Most of these lines are already imperative
     * sentences — "Use ^ for a power: a^2 + 3a", "Use * between letters: log(a*b)", "Spell pi,
     * / for a fraction: 3pi/7" — so a prefix produced "Write it like this: Use ^ for a power:
     * a^2 + 3a", which has two colons in it and reads worse than the line alone. The frame in
     * `unreadableAnswerShots.browser.test.tsx` is what showed that; it read fine in the unit test.
     *
     * No trailing period either: every one of these lines ends in an EXAMPLE, and a full stop
     * after `3a` is a character a learner might reasonably type.
     */
    return line;
  }
  return ANSWER_GRAMMAR;
}
