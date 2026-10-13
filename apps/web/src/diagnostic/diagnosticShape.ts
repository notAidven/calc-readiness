/**
 * **HOW BIG THE DIAGNOSTIC IS, in the two figures a learner is owed before they agree to sit
 * it.**
 *
 * This module holds nothing but those two numbers, and it exists because two surfaces now
 * quote them: the diagnostic's own intro card (`DiagnosticRunner.tsx`) and the first-run start
 * choice (`TitleScreen.tsx`), which asks a learner to choose between the diagnostic and Era 1
 * before the diagnostic bundle has been loaded. They were `DiagnosticRunner.tsx`'s module
 * constants until that second reader arrived; importing them from there would have pulled the
 * whole KaTeX/canvas diagnostic runtime into the title screen, which is `React.lazy`-d away
 * from it on purpose.
 *
 * ## THE ITEM COUNT AND THE TIME ESTIMATE ARE DIFFERENT KINDS OF PROMISE
 *
 * `docs/Diagnostic_Coverage_Length_Measurement.md` reports the shipped policy over the 62-node
 * scope, pooled over three ability profiles with mild noise, n = 6,000:
 *
 * ```
 * items answered  med 36  p90 47  p99 53  max 58   0.00% truncated
 * ```
 *
 * The adaptive item count remains the rounded simulation median. The learner-facing duration
 * is a broader planning estimate because reading, entering open responses, and accessibility
 * needs are not a fixed seconds-per-item clock. It deliberately says "about" and gives a range:
 * the walk adapts, is untimed, and does not promise a fixed exam length.
 *
 * `diagnosticIntroPromise.test.ts` holds them against the scope they describe, so a scope that
 * grows past what the item figure can honestly cover fails rather than quietly
 * under-promising. It also holds the duration wording to an estimate wherever it is quoted.
 */

/** Roughly how many questions the adaptive walk asks. See this file's header. */
export const TYPICAL_QUESTIONS = 35;

/** Learner planning estimate, not a guarantee or a fixed adaptive-walk length. */
export const DIAGNOSTIC_DURATION_ESTIMATE = "about 15-20 minutes";
