import { describe, expect, it } from "vitest";

import { canonicalizeRootGlyphInput } from "./root-glyph-input";

describe("canonicalizeRootGlyphInput", () => {
  it.each([
    ["√2", "sqrt(2)"],
    ["5√2", "5*sqrt(2)"],
    ["5*√ 2", "5*sqrt(2)"],
    ["√2/2 + √3/3", "sqrt(2)/2 + sqrt(3)/3"],
    ["√(2*x)", "sqrt(2*x)"],
    ["2√(x + 1)", "2*sqrt(x + 1)"],
    ["√(2 + √3)", "sqrt(2 + sqrt(3))"],
    ["√(2)x", "sqrt(2)*x"],
  ])("turns %s into the checker spelling", (typed, canonical) => {
    expect(canonicalizeRootGlyphInput(typed)).toBe(canonical);
  });

  it.each(["√2x", "√2(x + 1)", "√x", "√", "√()", "√(2 + 3"])(
    "refuses the ambiguous or incomplete spelling %s",
    (typed) => {
      expect(canonicalizeRootGlyphInput(typed)).toBe(typed);
    },
  );

  it("is the identity for existing checker syntax", () => {
    expect(canonicalizeRootGlyphInput("5*sqrt(2)")).toBe("5*sqrt(2)");
  });
});
