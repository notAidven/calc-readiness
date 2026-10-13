import { describe, expect, it } from "vitest";

import { MAX_INPUT_LENGTH } from "./checker-core";
import { rewritePipeAbsolute } from "./pipe-notation";

/**
 * The `|expr|` -> `abs(expr)` preprocessor (Answer_Equivalence_Spec §11 parsing
 * canon). The documented limitation is that only NON-NESTED pipe runs are
 * accepted: pipes have no distinct open/close glyph, so `|a|b|c|` genuinely has
 * two readings and the rewriter refuses rather than picking one.
 */
describe("no-op guarantee (why this cannot move an existing verdict)", () => {
  it("returns a pipe-free expression BYTE-identical", () => {
    const untouched = [
      "2*sqrt(2)",
      "sqrt(3)/2",
      "x^2*sqrt(x)",
      "-4/3",
      "abs(x)",
      "",
      "   ",
    ];
    for (const expression of untouched) {
      expect(rewritePipeAbsolute(expression)).toEqual({ expression });
    }
  });
});

describe("accepted (unambiguous) pipe shapes", () => {
  it.each([
    ["|x|", "abs(x)"],
    ["|-x|", "abs(-x)"],
    ["|x - 3|", "abs(x - 3)"],
    ["2|x|", "2abs(x)"],
    ["|x| + |y|", "abs(x) + abs(y)"],
    ["|x|*|y|", "abs(x)*abs(y)"],
    ["sqrt(|x|)", "sqrt(abs(x))"],
    ["|x|/2", "abs(x)/2"],
    ["3*|x| - 1", "3*abs(x) - 1"],
    // A SINGLE pair admits only one pairing, so trailing implicit multiplication
    // is not ambiguous: mathjs reads `abs(x)2` as `abs(x) * 2`.
    ["|x|2", "abs(x)2"],
  ])("rewrites %s to %s", (input, expected) => {
    expect(rewritePipeAbsolute(input)).toEqual({ expression: expected });
  });
});

describe("ambiguous or malformed pipe runs fail CLOSED", () => {
  it.each([
    ["|x", "unbalanced_pipes"],
    ["x|", "unbalanced_pipes"],
    ["|a|b|", "unbalanced_pipes"],
    ["|x|y|z|", "ambiguous_pipe_notation"],
    ["|a|b|c|", "ambiguous_pipe_notation"],
    ["|x||y|", "ambiguous_pipe_notation"],
    ["|x + |y||", "ambiguous_pipe_notation"],
    ["||", "ambiguous_pipe_notation"],
    ["|x|2|y|", "ambiguous_pipe_notation"],
  ])("rejects %s as %s", (input, reason) => {
    const rewritten = rewritePipeAbsolute(input);
    expect(rewritten.expression).toBeUndefined();
    expect(rewritten.reason).toBe(reason);
  });

  it("re-applies the input bound, since abs(...) is longer than |...|", () => {
    const long = `|${"x+".repeat(MAX_INPUT_LENGTH / 2)}x|`;
    expect(rewritePipeAbsolute(long).reason).toBe("input_too_long");
  });

  it("never throws, whatever it is handed", () => {
    for (const input of ["|".repeat(64), "|||", "|)|", "|,|", "\\|x\\|"]) {
      expect(() => rewritePipeAbsolute(input)).not.toThrow();
    }
  });
});
