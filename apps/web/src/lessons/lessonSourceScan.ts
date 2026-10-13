/**
 * Shared machinery for the guards that read LESSON SOURCE rather than a rendered DOM.
 *
 * Test-only, and a sibling of `testHarness.ts` and `kindFamily.ts` for the same reason those
 * are: a source guard lives beside the sources it reads. Nothing in the app imports this.
 *
 * It holds `stripComments` because two guards need it and neither owns it —
 * `widgetProseEmDash.test.ts` (no em dash reaches a learner) and
 * `widgetProseArithmetic.test.ts` (no arithmetic is stated in bare prose). Both are sweeps
 * over raw source that must not fire on JSDoc, and a stripper copied into each would be two
 * strippers a year from now, one of them subtly worse. The em-dash guard owns its FIXTURE
 * TESTS for this function; they exercise it in both directions and are the reason it can be
 * trusted here.
 */

/**
 * Blank out comments, keeping every other character so line and column numbers survive for
 * the failure message.
 *
 * String and template literals are tracked, not skipped: a `//` inside a URL or a `/*`
 * inside a prose string must not open a comment, or the rest of the file would strip away
 * and a sweep would stop reading it.
 *
 * A quote is only a string delimiter when it does not directly follow an identifier
 * character, which is what keeps an apostrophe in JSX TEXT from opening one. `Finish a
 * lesson's practice set` is prose, not a string, and treating its apostrophe as an opener
 * made the scan run on to the next quote in the file and copy a JSDoc block through
 * unstripped. No valid `'` or `"` literal is preceded by an identifier character; a
 * backtick is (a tagged template), so backticks are not gated. Regex literals are NOT
 * tracked, which is the one known limitation; a `/` there is only a hazard if it is
 * followed by `*`, and no lesson source has one.
 */
export function stripComments(source: string): string {
  const IDENTIFIER_CHAR = /[A-Za-z0-9_$]/;
  let out = "";
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === "//") {
      while (i < source.length && source[i] !== "\n") {
        out += source[i] === "\n" ? "\n" : " ";
        i += 1;
      }
      continue;
    }
    if (two === "/*") {
      while (i < source.length && source.slice(i, i + 2) !== "*/") {
        out += source[i] === "\n" ? "\n" : " ";
        i += 1;
      }
      out += "  ";
      i += 2;
      continue;
    }
    const ch = source[i] as string;
    const opensString =
      ch === "`" ||
      ((ch === '"' || ch === "'") && !IDENTIFIER_CHAR.test(source[i - 1] ?? " "));
    if (opensString) {
      const quote = ch;
      out += ch;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          out += source.slice(i, i + 2);
          i += 2;
          continue;
        }
        out += source[i];
        if (source[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}
