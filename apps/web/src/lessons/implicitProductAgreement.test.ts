import {
  D1_PRACTICE_ITEMS,
  D2_PRACTICE_ITEMS,
  D3_PRACTICE_ITEMS,
  D4_PRACTICE_ITEMS,
  D5_PRACTICE_ITEMS,
  D6_PRACTICE_ITEMS,
  D7_PRACTICE_ITEMS,
  D8_PRACTICE_ITEMS,
  D9_PRACTICE_ITEMS,
  D10_PRACTICE_ITEMS,
  type FrozenItem,
  INTERACTIVE_PRACTICE_ITEMS,
} from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import { answerNotation } from "./answerFormat";
import { previewOf } from "./mathPreviewParser";
import { checkerVersionForItem, practiceChecker } from "./practiceChecker";

/**
 * THE FIELD, THE KEYPAD, THE PREVIEW AND THE CHECKER SPEAK ONE GRAMMAR, and the reading of a
 * juxtaposed product is where they were about to come apart.
 *
 * `.cursor/skills/lesson-katex/SKILL.md` states the arrangement: the keypad splices literal
 * ASCII, the field carries it unconverted, the preview reads it one-directionally through
 * KaTeX, and the checker grades the same string. Nothing converts anything, so the four agree
 * only as long as they READ alike — and teaching the checker a reading the preview does not
 * have is a new defect rather than a fix.
 *
 * Before this change the preview drew `x(x + 2)` as `\operatorname{x}\left(x + 2\right)` and
 * spoke it as *"x of x plus 2"*, which agreed with the checker exactly: both read a call. Now
 * the checker reads a product, so the preview has to as well, or a learner about to be marked
 * CORRECT is shown a function application of a variable to an argument.
 *
 * The direction that matters is one-way and this file asserts it that way round: **anything
 * the checker accepts, the preview must draw** (and draw as a product). The converse is not
 * claimed and `mathPreviewParser.ts` says why — the preview cannot see an item's
 * `allowed_symbols`, so it is slightly more permissive, exactly as it is already more
 * permissive about `x^9`, which draws and then fails `MAX_EXPONENT`.
 */

const SERVED_ITEMS: readonly FrozenItem[] = [
  ...D1_PRACTICE_ITEMS,
  ...D2_PRACTICE_ITEMS,
  ...D3_PRACTICE_ITEMS,
  ...D4_PRACTICE_ITEMS,
  ...D5_PRACTICE_ITEMS,
  ...D6_PRACTICE_ITEMS,
  ...D7_PRACTICE_ITEMS,
  ...D8_PRACTICE_ITEMS,
  ...D9_PRACTICE_ITEMS,
  ...D10_PRACTICE_ITEMS,
  ...INTERACTIVE_PRACTICE_ITEMS,
];

function rawAnswerFor(item: FrozenItem, expression: string): unknown {
  if (item.answer.answer_spec.answer_type !== "rational_answer") {
    return expression;
  }
  const excluded = (item.answer as { excluded_values?: readonly string[] }).excluded_values;
  return { expression, excluded_values: (excluded ?? []).join(", ") };
}

function verdict(item: FrozenItem, expression: string): string {
  const result = practiceChecker({
    raw_answer: rawAnswerFor(item, expression),
    item_version_id: item.item_version_id,
    equivalence_checker_version: checkerVersionForItem(item),
  });
  return `${result.status}/${result.reason_code}`;
}

/**
 * The cohort the change exists for, derived from the notation dispatch rather than listed, and
 * the starless spelling of each one's key — which is now a CORRECT answer and so is exactly
 * the string the preview owes a drawing of.
 */
const STARLESS_ANSWERS: readonly { item: FrozenItem; submitted: string }[] =
  SERVED_ITEMS.filter(
    (item) =>
      answerNotation(
        item.answer.answer_spec,
        item.answer.allowed_symbols,
        item.answer.answer_key,
      ) === "rational_quotient_product",
  ).map((item) => ({
    item,
    submitted: String(item.answer.answer_key).replaceAll("*", ""),
  }));

describe("the preview reads a juxtaposed product the way the checker does", () => {
  it("has a population, and every member of it is an answer the checker accepts", () => {
    expect(
      STARLESS_ANSWERS.length,
      "no served item keys a juxtaposed product, so this file is about nothing",
    ).toBe(14);
    for (const { item, submitted } of STARLESS_ANSWERS) {
      expect(verdict(item, submitted), `${item.item_version_id}: ${submitted}`).toBe(
        "correct/match",
      );
    }
  });

  /**
   * THE AGREEMENT, over the whole cohort: the preview draws every one of these, and draws the
   * juxtaposition as a MULTIPLICATION rather than as a function application.
   *
   * `\operatorname{` is the tell. It is how `mathPreviewParser` draws a call it has no
   * notation for, so its presence over an answer keyed `(11*x + 8)/(x*(x + 2))` means the
   * preview is reading `x(` as a function named `x` while the grader reads a product.
   */
  it.each(STARLESS_ANSWERS.map(({ item, submitted }) => [item.item_version_id, submitted]))(
    "draws %s's answer %s as a product",
    (_id, submitted: string) => {
      const preview = previewOf(submitted);
      expect(preview, `the preview refuses to draw ${submitted}`).not.toBeNull();
      expect(
        preview?.latex,
        `${submitted} draws as a function call, so the preview disagrees with the grader that just marked it correct`,
      ).not.toContain("\\operatorname{");
      // Drawn as a fraction with a product in the denominator: the reading the grader has.
      expect(preview?.latex).toContain("\\dfrac{");
      expect(
        preview?.spoken,
        `${submitted} is spoken as a function application`,
      ).not.toMatch(/\bx of\b/);
      expect(preview?.spoken).toContain("times");
    },
  );

  /**
   * The six names the grammar CAN call still draw as calls, which is the other direction of
   * the same agreement. `log` and `ln` are the load-bearing pair: they get no special
   * notation, so before this change they took the same "unknown name" branch that `x` did,
   * and a rule keyed on "has notation" rather than on "is a function" would have started
   * drawing EL.5's `log(m*a*q)` as `log` times `(m*a*q)`.
   */
  it.each([
    ["sqrt(2)", "\\sqrt{"],
    ["cbrt(8)", "\\sqrt["],
    ["nthRoot(8, 3)", "\\sqrt["],
    ["abs(x)", "\\left|"],
    ["log(m*a*q)", "\\operatorname{log}"],
    ["ln(2)", "\\operatorname{ln}"],
  ])("still draws %s as a function, not a product", (submitted: string, marker: string) => {
    const preview = previewOf(submitted);
    expect(preview, `the preview refuses to draw ${submitted}`).not.toBeNull();
    expect(preview?.latex, `${submitted} lost its notation`).toContain(marker);
  });

  /**
   * And the shapes the checker refuses. The preview is allowed to be more permissive, so these
   * only have to DRAW; what they must not do is draw as something the checker would read
   * differently if it read them at all. `xy` is the one that matters: the preview draws it as
   * the single symbol `\mathrm{xy}`, which is exactly what mathjs lexes and exactly what the
   * checker then refuses as `unknown_symbol`. A preview that drew `x\,y` there would be
   * advertising a reading no layer has.
   */
  it("draws a run of letters as one symbol, as the lexer reads it", () => {
    expect(previewOf("xy")?.latex).toBe("\\mathrm{xy}");
    expect(previewOf("3xx/2")?.latex).toContain("\\mathrm{xx}");
    expect(previewOf("log(maq)")?.latex).toContain("\\mathrm{maq}");
  });
});
