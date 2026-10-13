/**
 * Reading a rendered figure's ANSWER back out of it, shared by the guards that ask whether a
 * worked-solution diagram says what the question it sits under was asking.
 *
 * ONE normalizer, deliberately. Two files now make that claim about different populations --
 * `cfuAuthoredFigure.test.tsx` about the 39 authored CHECK questions, `cfuFigureCoverage.test.ts`
 * about the re-asks drawn from the bespoke `cfu.*` templates -- and a second copy of this
 * grammar is a second set of answers about which spellings count as equal. The subtleties are
 * all of that kind: `\dfrac{3}{2}` against a typed `3/2`, a caption's U+2212 against a hyphen,
 * `\{-7, 5\}` against `{-7, 5}`, and `5` that must not be found inside `25`.
 *
 * `assertedStrings` is where the reading is deliberately narrow, and the reason is recorded in
 * `cfuAuthoredFigure.test.tsx`: a figure has to be found SAYING its answer, and the bare
 * `<svg text>` a number line labels its ticks with says nothing, since `-2` is printed on that
 * scale whatever the params were.
 */

/**
 * LaTeX and typed-answer spellings, flattened onto one grammar so a figure's `\dfrac{3}{2}`
 * and an accepted `3/2` compare equal.
 *
 * The named replacements run before the sweep that drops unrecognised `\command`s, because
 * that sweep would otherwise erase `\infty` along with `\rightarrow` and turn `(-\infty, 4]`
 * into `(,4]`.
 */
export function flatten(value: string): string {
  return (
    value
      // Before the fraction rule, and that order is the point: `\sqrt{2}` inside a numerator
      // is a nested brace, so `\dfrac{3\sqrt{2}}{3}` matched nothing, lost both commands to the
      // sweep below and arrived as `323` -- a string in which no bounded `3` can be found.
      // Spelled as the answer box spells it, the same figure reads `3sqrt(2)/3`.
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, "sqrt($1)")
      .replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1/$2")
      .replace(/\\infty|\u221e|infinity/g, "inf")
      // The union join, which a figure typesets and an answer box is typed with as a letter.
      // Without this the command fell to the unrecognised-command sweep below, so
      // `(-\infty, 15) \cup (25, \infty)` read back as `(-inf,15)(25,inf)` -- a string the typed
      // `(-inf, 15) U (25, inf)` cannot be found in. It went unnoticed while no check had a
      // union answer; LIN.6's re-ask is the first.
      .replace(/\\cup\b|\u222a/g, "U")
      .replace(/\\lvert|\\rvert|\\left\||\\right\|/g, "|")
      .replace(/\\times|\\cdot/g, "*")
      .replace(/\\le\b/g, "<=")
      .replace(/\\ge\b/g, ">=")
      .replace(/\\neq?\b|\u2260/g, "!=")
      .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
      // KaTeX spacing macros: `\;` and friends are whitespace with a backslash on it.
      .replace(/\\[;,:!\s]/g, "")
      .replace(/\\[a-zA-Z]+/g, "")
      // A caption is read back after KaTeX has typeset it, so its minus signs arrive as
      // U+2212 while the answer a learner types is a hyphen.
      .replace(/\u2212/g, "-")
      // `^{2}` and `^2` are the same power, and `{-7, 5}` and `\{-7, 5\}` the same set. The
      // brace's own backslash goes WITH it: stripping the brace alone left `\{x \mid x < 9\}`
      // as `\xx<9\`, and the orphan `\` sat between the two halves of EL.4's answer, so an
      // accepted spelling that really was printed could not be found.
      .replace(/\\?[{}$]/g, "")
      .replace(/\s+/g, "")
      .toLowerCase()
  );
}

/**
 * The strings in which a figure ASSERTS something: its typeset math and its caption.
 *
 * Bare `<svg text>` is deliberately excluded, and not as a simplification. A number line
 * labels every tick it draws, so `-2` is printed on `d1.num-s.l1`'s scale whatever the params
 * say, and this check read those labels at first: it passed unchanged with `a: 9`, over a
 * figure whose own caption said $-9 + 6 = -3$. The figure has to be found SAYING the answer,
 * which is what the KaTeX nodes and the caption carry; `visualsMath.test.tsx` records the same
 * division from the other side, allowing bare integers in `<text>` because ticks are all that
 * is there.
 */
export function assertedStrings(container: HTMLElement): string[] {
  const latex = Array.from(container.querySelectorAll("[data-latex]")).map(
    (node) => node.getAttribute("data-latex") ?? "",
  );
  const caption = Array.from(container.querySelectorAll("figcaption")).map(
    (node) => node.textContent ?? "",
  );
  return [...latex, ...caption].filter((value) => value.trim().length > 0);
}

/**
 * True when `needle` sits in `haystack` as a NUMBER IN ITS OWN RIGHT, so `5` is not found
 * inside `25`, `-4` is not found inside `-42`, and `5` is not found inside `\dfrac{50}{5}`.
 *
 * ## What "the figure names the answer" was taken to mean, and what it means now
 *
 * It used to mean any digit run anywhere, bounded only by other digits. That is too weak, and
 * the measurement is in D10 round 1 (X-6 there, X-5 in the ledger): move GEO.1's
 * `worked_solution_params` scale from a tenth to a fifth and its figure closes on
 * `\dfrac{50}{5} = 10`, a diagram answering 10 over a question whose key is 5 — and the guard
 * reported 3 passed, because the CFU's `5` was found in the DENOMINATOR, where `{` and `}`
 * bound it and neither is a digit.
 *
 * The other extreme, "the answer must sit in a distinguished closing row", is not available:
 * the 47 figures under this fixture close in half a dozen different arrangements, some on a
 * caption sentence and some on a row with no relation in it at all, and pinning one shape
 * would be repinning the figures rather than reading them.
 *
 * So the rule is the middle one, and it is about the needle rather than about the figure's
 * layout: **the digits have to be a whole number, not part of one.** A number is built out of
 * smaller numbers by exactly two operators — the fraction bar and the exponent marker — and an
 * operand of either is not a value the figure states. `50/5` states one number and it is 10;
 * `30^2` states one and it is 900. So `/` and `^` bound a match the way a digit does.
 *
 * Everything else adjacent is deliberately NOT a boundary. `-` belongs to the value it signs,
 * and a letter does not bound one either: `x = -7 \text{ or } x = 5` flattens to `x=-7orx=5`,
 * where the `o` of "or" sits against the `7`, and a boundary class holding letters rejected
 * that — which would have made two thirds of the loose list unsatisfiable for a reason that
 * has nothing to do with the answer being wrong.
 *
 * ## `answer`, for the callers that hand this one PART of a compound answer at a time
 *
 * A composite answer's parts print on different rows, so `cfuFigureCoverage` falls back to
 * asking after each part of `6\sqrt{6}/3` separately — and the `3` of that answer is a
 * denominator, which is exactly the position the paragraph above rejects. It is the right
 * position for it: the figure is stating the answer's own divisor.
 *
 * So the operand rule is not "never beside a bar", it is **an operand position states the
 * value only where the ANSWER puts it in that same position.** Pass the whole answer as
 * `answer` and `/3` is allowed for `6\sqrt{6}/3` and refused for a scalar `5`, which is the
 * GEO.1 case. It defaults to the needle, so a caller matching a whole answer gets the strict
 * reading without asking for it.
 */
export function namesToken(haystack: string, needle: string, answer = needle): boolean {
  const digit = /[0-9]/;
  /** The two operators that make the digits beside them a PART of a number rather than one. */
  const binds = /[/^]/;
  const guardLeft = digit.test(needle[0] ?? "");
  const guardRight = digit.test(needle[needle.length - 1] ?? "");
  /** An operand of `bar` is the needle's own place when the answer reads the same way there. */
  const answersOwn = (bar: string, side: "left" | "right") =>
    answer.includes(side === "left" ? `${bar}${needle}` : `${needle}${bar}`);
  /**
   * A `.` bounds a number only when it is a DECIMAL POINT, which means a digit on its far side.
   * Reading every period as one is how `-1` came to be "never named" by a caption that ends
   * *"gathering them gives $-4 + 3 = -1$."* — the full stop closing the sentence sat where a
   * decimal fraction would have been.
   */
  const decimalRight = (at: number) =>
    haystack[at] === "." && digit.test(haystack[at + 1] ?? "");
  const decimalLeft = (at: number) =>
    haystack[at] === "." && digit.test(haystack[at - 1] ?? "");
  for (
    let at = haystack.indexOf(needle);
    at !== -1;
    at = haystack.indexOf(needle, at + 1)
  ) {
    const beforeAt = at - 1;
    const afterAt = at + needle.length;
    const before = haystack[beforeAt];
    const after = haystack[afterAt];
    const runsLeft =
      guardLeft &&
      before !== undefined &&
      (digit.test(before) ||
        (binds.test(before) && !answersOwn(before, "left")) ||
        decimalLeft(beforeAt));
    const runsRight =
      guardRight &&
      after !== undefined &&
      (digit.test(after) ||
        (binds.test(after) && !answersOwn(after, "right")) ||
        decimalRight(afterAt));
    if (!runsLeft && !runsRight) {
      return true;
    }
  }
  return false;
}

/** The signed numbers and fractions an answer is made of: `{-7, 5}` gives `-7` and `5`. */
export function valuesIn(answer: string): string[] {
  return answer.match(/-?\d+(?:\/\d+)?(?:\.\d+)?/g) ?? [];
}

/**
 * Every relation flattened to one symbol, so `x \neq 8` and a typed `x = 8` compare equal.
 *
 * The RELATION is deliberately thrown away and only the pairing kept. A figure states an
 * excluded value as `x \neq 8` while the answer box wants it typed after the expression as
 * `x = 8`; both say the number 8 belongs to x, which is the claim being looked for, and no
 * figure in this tree states an exclusion as an equality or the reverse.
 *
 * Takes an ALREADY FLATTENED string. Relaxing before flattening leaves the answer's spaces in
 * (`x ~ 1`), which no pattern below matches, and a claim list that silently came back empty was
 * how the composite check first reported green over a figure with a third of its answer deleted.
 */
export function relaxRelations(value: string): string {
  return value.replace(/!=|<=|>=|=|<|>/g, "~");
}

/**
 * The `variable = value` claims an answer makes, relation-relaxed: `(3, 5); x = 1; y = 3`
 * gives `x~1` and `y~3`.
 *
 * This is what a COMPOSITE answer needs beyond its values, and the difference is not
 * cosmetic. Every value of a composite answer already appears in the working above the closing
 * row -- the asymptote's `1` is in the factor `(x - 1)` that produced it -- so deleting the
 * whole `x = 1` from RAT.5's figure left a diagram answering two thirds of its question, over
 * which a check on values reported green. Measured at the injection: values-only passed 62 of
 * 62, and the claim check fails at the row that stopped being printed.
 */
export function claimsIn(answer: string): string[] {
  return relaxRelations(flatten(answer)).match(/[a-z]~-?\d+(?:\/\d+)?(?:\.\d+)?/g) ?? [];
}
