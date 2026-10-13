/**
 * The live preview's two readings, and the line it refuses to cross.
 *
 * `previewOf` is presentation, so what has to be pinned is not "is this the prettiest
 * LaTeX" but three properties a learner would be hurt by losing:
 *
 *  1. a fraction is STACKED (`\dfrac`), which is the entire reason the preview exists;
 *  2. the spoken reading is authored English, not the typeset markup read aloud;
 *  3. it draws nothing at all for notation the CHECKER cannot read, because a beautiful
 *     radical over a `√` the grader scores as unanswered teaches the wrong notation with
 *     more confidence than a bare field ever could.
 */

import { describe, expect, it } from "vitest";

import { previewOf } from "./mathPreviewParser";

const latex = (value: string): string | undefined => previewOf(value)?.latex;
const spoken = (value: string): string | undefined => previewOf(value)?.spoken;

describe("what the learner sees", () => {
  it("stacks a fraction, which a plain field cannot", () => {
    expect(latex("1/2")).toBe("\\dfrac{1}{2}");
    // The reported screenshot's answer, at the shape the EXP.1 CFU asks for.
    expect(latex("1/x^2")).toBe("\\dfrac{1}{x^{2}}");
    expect(latex("x^3/y^4")).toBe("\\dfrac{x^{3}}{y^{4}}");
  });

  it("raises an exponent rather than printing a caret", () => {
    expect(latex("x^2")).toBe("x^{2}");
    // `^` is right-associative and a minus after it belongs to the exponent, so the
    // wrong-form answer EXP.1 exists to catch still draws as one power.
    expect(latex("x^-2")).toBe("x^{-2}");
  });

  it("draws a radical as a radical", () => {
    expect(latex("sqrt(2)")).toBe("\\sqrt{2}");
    expect(latex("cbrt(8)")).toBe("\\sqrt[3]{8}");
    expect(latex("nthRoot(16, 4)")).toBe("\\sqrt[4]{16}");
    // The served RAD.1 shape: a coefficient against a root reads as juxtaposition.
    expect(latex("4*sqrt(2)")).toBe("4\\,\\sqrt{2}");
  });

  it("keeps a visible dot between two numbers, which juxtaposition would merge", () => {
    // `2\,3` paints as twenty-three. This is the one product that must not close up.
    expect(latex("2*3")).toBe("2 \\cdot 3");
  });

  it("draws both spellings of absolute value the checker accepts", () => {
    expect(latex("abs(x^5)")).toBe("\\left|x^{5}\\right|");
    expect(latex("|x^5|")).toBe("\\left|x^{5}\\right|");
  });

  it("parenthesises only where the reading would change", () => {
    // A stacked fraction already groups its parts, so `1/(x^2)` needs no bracket.
    expect(latex("1/(x^2)")).toBe("\\dfrac{1}{\\left(x^{2}\\right)}");
    expect(latex("2*(x + 1)")).toBe("2\\,\\left(x + 1\\right)");
    expect(latex("x + 1")).toBe("x + 1");
  });
});

describe("what the learner hears", () => {
  /**
   * The same pinning `ExprBuilderInput.browser.test.tsx` applies to the widget: the live
   * region has to carry the form in WORDS, because typeset math markup reads badly aloud.
   */
  it("reads a fraction and a power as English", () => {
    expect(spoken("1/x^2")).toBe("1 over x to the 2");
    expect(spoken("x^3/y^4")).toBe("x to the 3 over y to the 4");
  });

  it("names each root and the bars", () => {
    expect(spoken("4*sqrt(2)")).toBe("4 times the square root of 2");
    expect(spoken("cbrt(8)")).toBe("the cube root of 8");
    expect(spoken("nthRoot(16, 4)")).toBe("the root of 16, index 4");
    expect(spoken("abs(x^5)")).toBe("the absolute value of x to the 5");
  });

  it("speaks a sign and a bracketed group rather than dropping them", () => {
    expect(spoken("-3")).toBe("negative 3");
    expect(spoken("1/(x + 2)")).toBe("1 over the quantity x plus 2");
    expect(spoken("x - 1")).toBe("x minus 1");
  });
});

/**
 * THE THREE NOTATION GRAMMARS, which returned `null` at `da781d1f` — measured, one call each,
 * before any of this was written. A field whose graded skill IS the form was the field with no
 * reading of its form, because the expression grammar refuses any string with a token left
 * over and every one of these leaves one.
 */
describe("interval notation", () => {
  it("draws the brackets the learner chose, per end", () => {
    expect(latex("(3, 8)")).toBe("\\left(3, 8\\right)");
    expect(latex("[3, 8]")).toBe("\\left[3, 8\\right]");
    expect(latex("[3, 8)")).toBe("\\left[3, 8\\right)");
    expect(latex("(3, 8]")).toBe("\\left(3, 8\\right]");
  });

  it("draws every infinity spelling the checker reads, and no others", () => {
    expect(latex("(-inf, 5]")).toBe("\\left(-\\infty, 5\\right]");
    expect(latex("(-infinity, 5]")).toBe("\\left(-\\infty, 5\\right]");
    expect(latex("(-∞, 5]")).toBe("\\left(-\\infty, 5\\right]");
    expect(latex("(7, inf)")).toBe("\\left(7, \\infty\\right)");
    expect(latex("(7, +inf)")).toBe("\\left(7, \\infty\\right)");
    // `oo` is not in `INFINITY_TOKENS`, so `(7, oo)` grades `invalid_input` — and a preview
    // that drew it as infinity would be the app teaching the notation that fails. It draws
    // as the two-letter symbol mathjs lexes, which is what the grader sees.
    expect(latex("(7, oo)")).toBe("\\left(7, \\mathrm{oo}\\right)");
    // And `inf` outside an endpoint is still a symbol, because the checker reads it nowhere
    // else either.
    expect(latex("inf")).toBe("\\mathrm{inf}");
  });

  it("names the inclusivity in words, which is the graded skill", () => {
    expect(spoken("(3, 8)")).toBe("the open interval from 3 to 8");
    expect(spoken("[3, 8]")).toBe("the closed interval from 3 to 8");
    expect(spoken("[3, 8)")).toBe("the interval from 3 to 8, including 3");
    expect(spoken("(-inf, 5]")).toBe(
      "the interval from negative infinity to 5, including 5",
    );
  });

  it("reads a union, spelled with a letter, a word or the glyph", () => {
    const union = "\\left(-\\infty, 19\\right] \\cup \\left[29, \\infty\\right)";
    expect(latex("(-inf, 19] U [29, inf)")).toBe(union);
    expect(latex("(-inf, 19] or [29, inf)")).toBe(union);
    // The tight form a learner copying LIN.4's own pack writes, which `parseIntervals`
    // normalises for the same reason.
    expect(latex("(-inf, 19]∪[29, inf)")).toBe(union);
    expect(spoken("(-inf, 19] U [29, inf)")).toBe(
      "the interval from negative infinity to 19, including 19, or the interval from 29 to infinity, including 29",
    );
  });

  it("leaves an ordinary bracketed factor alone, which has no comma in it", () => {
    // The discriminator: one depth-zero comma inside the brackets. Without it these would
    // have been claimed as malformed intervals and refused, losing a reading they had.
    expect(latex("(x + 1)")).toBe("\\left(x + 1\\right)");
    expect(latex("2*(x + 1)")).toBe("2\\,\\left(x + 1\\right)");
    expect(latex("nthRoot(16, 4)")).toBe("\\sqrt[4]{16}");
    // Two commas is not an interval either, and half-drawing it would be worse than nothing.
    expect(previewOf("(1, 2, 3)")).toBeNull();
  });
});

describe("a roster of solutions", () => {
  it("reads all three separators the packs spell and the grader accepts", () => {
    expect(latex("39, 51")).toBe("39, 51");
    expect(latex("39; 51")).toBe("39, 51");
    expect(latex("39 and 51")).toBe("39, 51");
    expect(spoken("39; 51")).toBe("39 and 51");
  });

  it("stacks a fraction inside a roster, which is the whole point of drawing one", () => {
    expect(latex("{-4, 2/5}")).toBe("\\left\\{-4, \\dfrac{2}{5}\\right\\}");
    expect(spoken("{-4, 2/5}")).toBe("the set negative 4 and 2 over 5");
  });

  it("draws braces only when the learner typed them", () => {
    expect(latex("{39}")).toBe("\\left\\{39\\right\\}");
    expect(latex("13")).toBe("13");
  });

  it("draws the empty set as a symbol rather than as two upright words", () => {
    expect(latex("no solution")).toBe("\\varnothing");
    expect(latex("none")).toBe("\\varnothing");
    expect(latex("{}")).toBe("\\varnothing");
    expect(spoken("∅")).toBe("the empty set");
  });

  it("refuses a member it cannot read, rather than drawing the ones it can", () => {
    expect(previewOf("39, √51")).toBeNull();
    expect(previewOf("{39, x)}")).toBeNull();
  });

  it("waits for the second root rather than blanking, because typing is left to right", () => {
    expect(latex("39,")).toBe("39");
  });
});

/**
 * A RAT answer is one field holding an expression and then the values it excludes, written
 * `x = -5`. All eight rendered RAT asks are spelled that way, so without a reading for `=`
 * every one of them drew the empty box the preview gate exists to prevent — measured, as the
 * eight failures of `answerFormat.test.ts`'s implication sweep.
 *
 * The leading `(` is what makes this more than an extra node kind. `(x+14)/((x-1)(x+4)); x =
 * -4, 1` opens with a bracket and holds exactly one depth-zero comma, which is the shape of
 * an interval, so the interval reading claimed it and REFUSED it as an interval whose lower
 * end is unbalanced — a refusal the roster reading never got to see past.
 */
describe("a rational answer and the values it excludes", () => {
  it("reads the expression and its exclusions as one list", () => {
    expect(latex("(x + 8)/(x + 5), x = 8, x = -5")).toBe(
      "\\dfrac{\\left(x + 8\\right)}{\\left(x + 5\\right)}, x = 8, x = -5",
    );
    expect(spoken("5/(4x); x = -4, 0")).toBe(
      "5 over the quantity 4 times x, x equals negative 4 and 0",
    );
  });

  it("is not fooled into reading the leading bracket as an interval", () => {
    // One depth-zero comma and an opening `(`: the interval shape, and not an interval.
    expect(latex("(x+14)/((x-1)(x+4)); x = -4, 1")).toBe(
      "\\dfrac{\\left(x + 14\\right)}{\\left(\\left(x - 1\\right)\\,\\left(x + 4\\right)\\right)}, x = -4, 1",
    );
    // And a real interval that happens to sit beside one is still read as an interval.
    expect(latex("(-2, 8]")).toBe("\\left(-2, 8\\right]");
  });

  it("refuses the relations that belong to a condition, not to an exclusion", () => {
    // `!=` is the set-builder vocabulary this parser does not read, and reading it as an
    // equation would invert the answer. Both the braced and the listed spellings refuse.
    expect(previewOf("{x | x != 9}")).toBeNull();
    expect(previewOf("1/x, x != 0")).toBeNull();
    // Two `=` in one member is a chain this owes nobody a reading of, so it refuses rather
    // than picking a side.
    expect(previewOf("1, x = 1 = 2")).toBeNull();
  });
});

describe("what it refuses", () => {
  /**
   * The load-bearing case. `√` is not in the text checker's grammar: `√2` grades
   * `invalid_input / parse_error`, which §12 of the equivalence spec treats as
   * unanswered, and the learner is told only "Check the format so the expression can be
   * read." A preview that drew a radical over it would be the app agreeing with them.
   */
  it("says nothing about notation the checker cannot read", () => {
    expect(previewOf("√2")).toBeNull();
    expect(previewOf("5√2")).toBeNull();
    expect(previewOf("\\frac{1}{2}")).toBeNull();
    expect(previewOf("1/x^{2}")).toBeNull();
    expect(previewOf("{x | x != 9}")).toBeNull();
  });

  it("says nothing when there is nothing typed", () => {
    expect(previewOf("")).toBeNull();
    expect(previewOf("   ")).toBeNull();
  });

  it("says nothing rather than half a reading", () => {
    // Trailing tokens the grammar cannot place: drawing the part it understood would
    // show the learner an expression they did not write. This is the SAME rule that
    // refuses `√` above, which is why there is only one of it — see `mathPreviewParser.ts`
    // on the allowlist that used to cover for it.
    expect(previewOf("x)")).toBeNull();
    expect(previewOf("1 2")).toBeNull();
  });

  /**
   * The other half of the refusal, and the reason it is stated rather than left implied:
   * a drawn preview is NOT a promise that the answer parses. `MAX_EXPONENT` is 8, so the
   * checker refuses `x^9` while the preview draws it. The preview says how the input
   * READS; only Check says whether it is right.
   */
  it("does not claim to be a verdict", () => {
    expect(latex("x^9")).toBe("x^{9}");
  });
});

describe("what it tolerates, because typing is left to right", () => {
  it("draws an empty box for the part not typed yet", () => {
    expect(latex("1/")).toBe("\\dfrac{1}{\\square}");
    expect(latex("x^")).toBe("x^{\\square}");
    expect(spoken("1/")).toBe("1 over blank");
  });

  it("closes a bracket the learner has not reached yet", () => {
    expect(latex("sqrt(")).toBe("\\sqrt{\\square}");
    expect(latex("sqrt(2")).toBe("\\sqrt{2}");
    expect(latex("2*(x + 1")).toBe("2\\,\\left(x + 1\\right)");
  });

  it("reads juxtaposition as multiplication, the way the parser behind the checker does", () => {
    // A served D7 key is literally `2x + 45`, with no star in it.
    expect(latex("2x + 45")).toBe("2\\,x + 45");
  });
});
