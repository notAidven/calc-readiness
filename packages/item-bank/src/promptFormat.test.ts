import { describe, expect, it } from "vitest";

import {
  additiveInversePrompt,
  evaluateMath,
  expandMath,
  FRACTION_LOWEST_TERMS_SUFFIX,
  latexAbs,
  latexDollar,
  latexDollarInt,
  latexFrac,
  latexFracDivGroupAdd,
  latexFracOp,
  latexNum,
  percentOf,
  reciprocalFracPrompt,
  simplifyMath,
  UNIT_RATE_OBJECTS,
  unitRatePrompt,
} from "./promptFormat";

/**
 * Counts the `$` that remark-math would treat as math delimiters, i.e. every `$` not
 * preceded by a markdown escape. An odd count means some span never closes and the
 * rest of the prompt renders as run-on math.
 */
function delimiterCount(markdown: string): number {
  return markdown.replace(/\\\$/g, "").split("$").length - 1;
}

describe("promptFormat", () => {
  it("formats numbers and fractions for KaTeX", () => {
    expect(latexNum(3)).toBe("$3$");
    expect(latexNum(-4)).toBe("$(-4)$");
    expect(latexFrac(1, 3)).toBe("$\\dfrac{1}{3}$");
    expect(latexFracOp(1, 3, "+", 1, 6)).toBe("$\\dfrac{1}{3} + \\dfrac{1}{6}$");
    expect(latexFracOp(2, 5, "-", 1, 5)).toBe("$\\dfrac{2}{5} - \\dfrac{1}{5}$");
    expect(latexFracDivGroupAdd(1, 2, 3, 4, 1, 3)).toBe(
      "$\\left(\\dfrac{1}{2} \\div \\dfrac{3}{4}\\right) + \\dfrac{1}{3}$",
    );
  });

  it("builds evaluate/expand/simplify prompts", () => {
    expect(evaluateMath("2 + 3 \\times 4")).toBe("Evaluate $2 + 3 \\times 4$.");
    expect(expandMath("4(x + 6)")).toBe("Expand: $4(x + 6)$.");
    expect(simplifyMath("5x + 3x - 2")).toBe("Simplify: $5x + 3x - 2$.");
    expect(percentOf(25, 80)).toBe("What is $25\\%$ of $80$?");
  });

  it("builds absolute-value fragments and inverse-recall prompts", () => {
    // latexAbs returns a bare fragment (no $) so it can be composed.
    expect(latexAbs("-6")).toBe("\\left|-6\\right|");
    expect(evaluateMath(`${latexAbs("-6")} + ${latexAbs("4")}`)).toBe(
      "Evaluate $\\left|-6\\right| + \\left|4\\right|$.",
    );
    expect(additiveInversePrompt(-7)).toBe("What is the additive inverse of $(-7)$?");
    expect(additiveInversePrompt(5)).toBe("What is the additive inverse of $5$?");
    expect(reciprocalFracPrompt(3, 5)).toBe("What is the reciprocal of $\\dfrac{3}{5}$?");
  });

  it("keeps fraction suffix outside math delimiters", () => {
    expect(FRACTION_LOWEST_TERMS_SUFFIX.startsWith(" Write")).toBe(true);
    expect(FRACTION_LOWEST_TERMS_SUFFIX.includes("$")).toBe(false);
  });

  it("keeps the currency sign outside the math span", () => {
    // The sign is a markdown-escaped \$; only the digits are wrapped in math.
    expect(latexDollar(4.5)).toBe("\\$$4.50$");
    expect(latexDollarInt(45)).toBe("\\$$45$");
  });

  it("leaves money prompts with balanced math delimiters", () => {
    // A dropped `$` in the helper's template literal still typechecks and still looks
    // plausible in isolation, but leaves a lone opener that swallows the following
    // sentence into a math span. Parity is what catches it.
    for (const amount of [0, 2, 45, 320]) {
      expect(delimiterCount(latexDollarInt(amount)) % 2).toBe(0);
      expect(delimiterCount(latexDollar(amount)) % 2).toBe(0);
    }
    const prompt = `A print shop charges a setup fee of ${latexDollarInt(45)}, plus ${latexDollarInt(2)} for each poster. Let $x$ be the number of posters.`;
    expect(delimiterCount(prompt) % 2).toBe(0);
  });

  it("builds unit-rate prompts with the selected object and dollar currency", () => {
    // Default (index 0) is pens; a non-zero index uses a different object noun.
    expect(unitRatePrompt(3, 4.5, 5)).toBe(
      "If $3$ pens cost \\$$4.50$, how much do $5$ pens cost (in dollars)?",
    );
    const notebooks = UNIT_RATE_OBJECTS.findIndex((o) => o.plural === "notebooks");
    expect(unitRatePrompt(3, 4.5, 5, notebooks)).toContain("notebooks");
    // Currency stays in dollars regardless of object.
    expect(unitRatePrompt(3, 4.5, 5, notebooks)).toContain("\\$$4.50$");
  });
});
