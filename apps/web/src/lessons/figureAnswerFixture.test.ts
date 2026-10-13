/**
 * `namesToken` decides what "the figure names the answer" MEANS, for every containment
 * assertion in `cfuAuthoredFigure.test.tsx`, `cfuFigureCoverage.test.tsx` and
 * `cfuAnswerShape.test.tsx`. Those three read it over rendered figures, so what they can show
 * is that the predicate agrees with 47 figures that are already right; none of them can show
 * where it stops agreeing, because a boundary is only visible from a case on the wrong side of
 * it.
 *
 * This file is that case, written from the instance that forced the rule. D10 round 1 moved
 * GEO.1's `worked_solution_params` scale from a tenth to a fifth, which makes its figure close
 * on `\dfrac{50}{5} = 10` — a diagram answering 10 over a question keyed 5 — and the guard
 * reported 3 passed, because the CFU's `5` was found in the DENOMINATOR, where `{` and `}` had
 * bounded it and neither is a digit.
 *
 * ## Both directions, because the predicate is wrong if it goes either way
 *
 * A boundary class that only ever rejects is trivially achievable and would make two thirds of
 * `FIGURE_NAMES_EACH_VALUE` unsatisfiable, so every rejection below sits beside the acceptance
 * it must not take with it: the operand cases fail, and the letter-adjacency, sign, decimal and
 * sentence-end cases that the fixture's own comments record still pass. Deleting either half of
 * `binds` in `namesToken` fails a case here by name.
 */

import { describe, expect, it } from "vitest";

import { flatten, namesToken } from "./figureAnswerFixture";

/** Each case, with the reading that makes it the answer it is. */
const REJECTED: readonly { haystack: string; needle: string; why: string }[] = [
  {
    haystack: "50/5=10",
    needle: "5",
    why: "the 5 is the DENOMINATOR of a fraction the figure states the value of, and that value is 10",
  },
  {
    haystack: "everylengthonitis1/5ofthelengthitcorrespondsto",
    needle: "5",
    why: "a caption's fraction reads back with no braces at all, so nothing but the bar bounds the 5",
  },
  {
    haystack: "50/10=5",
    needle: "10",
    why: "the 10 is the divisor, and a figure dividing BY 10 has not stated the number 10 as an answer",
  },
  {
    haystack: "30^2+40^2=2500",
    needle: "2",
    why: "the 2 is an exponent, so the number the figure states there is 900 and not 2",
  },
  { haystack: "25", needle: "5", why: "the digit rule this file inherits: 5 is not 25" },
  { haystack: "-42", needle: "-4", why: "the same rule on a signed value" },
  {
    haystack: "0.56",
    needle: "0.5",
    why: "a decimal point does not end a number when a digit follows it",
  },
];

const ACCEPTED: readonly { haystack: string; needle: string; why: string }[] = [
  {
    haystack: "50/10=5",
    needle: "5",
    why: "the figure's own closing value, which is the case the whole guard exists to find",
  },
  {
    haystack: "x=-7orx=5",
    needle: "-7",
    why: "a letter never bounds a match: the o of 'or' sits against the 7, and two thirds of the loose list read like this",
  },
  { haystack: "x=-7orx=5", needle: "5", why: "the second root of the same set" },
  {
    haystack: "gatheringthemgives-4+3=-1.",
    needle: "-1",
    why: "a full stop closing a sentence is not a decimal point",
  },
  {
    haystack: "themodel'sdiagonalis5meters",
    needle: "5",
    why: "a value stated in prose, which is how several figcaptions close",
  },
  {
    haystack: "d=sqrt(50)",
    needle: "50",
    why: "a bracket is not a binder, so a radicand is still a number the figure states",
  },
  { haystack: "s=92", needle: "92", why: "the ordinary closing row" },
];

describe("namesToken finds a number the figure states, not a part of one", () => {
  it("has both populations, so neither list below can be empty", () => {
    // Containment over an empty table is the quietest green there is: `it.each` of nothing
    // emits no tests at all and the file still reports passing.
    expect(REJECTED.length, "the rejection cases went missing").toBeGreaterThanOrEqual(7);
    expect(ACCEPTED.length, "the acceptance cases went missing").toBeGreaterThanOrEqual(7);
  });

  it.each(REJECTED)(
    "does not read $needle out of $haystack",
    ({ haystack, needle, why }) => {
      expect(namesToken(haystack, needle), why).toBe(false);
    },
  );

  it.each(ACCEPTED)("reads $needle out of $haystack", ({ haystack, needle, why }) => {
    expect(namesToken(haystack, needle), why).toBe(true);
  });

  /**
   * The third argument, which is what keeps the operand rule from refusing the answers that
   * genuinely ARE fractions. `cfuFigureCoverage` asks after one part of a composite answer at a
   * time, so it hands `3` of `6\sqrt{6}/3` to a figure that can only show it as a denominator.
   * The licence has to be narrow or it is the original hole again under another name, so it is
   * granted per position: the same `3`, beside the same bar, is refused for a scalar answer.
   */
  it("lets a part sit where its own answer puts it, and nowhere else", () => {
    expect(
      namesToken("6sqrt(6)/3", "3", "6*sqrt(6)/3"),
      "the answer's own divisor, refused, would make every fractional answer unsatisfiable",
    ).toBe(true);
    expect(
      namesToken("50/5=10", "5", "5"),
      "a scalar answer gets no licence: this is the GEO.1 figure answering 10 over a key of 5",
    ).toBe(false);
    expect(
      namesToken("216/9", "9", "6*sqrt(6)/3"),
      "and the licence is per position, so a divisor the answer does not have stays refused",
    ).toBe(false);
    expect(
      namesToken("6sqrt(6)/3", "3"),
      "omitting the answer reads the needle as the whole of it, which is the strict rule",
    ).toBe(false);
  });

  /**
   * The defect end to end, over the string GEO.1's figure really produces rather than over a
   * hand-typed approximation of it: a rejection case above is only about `namesToken`, and this
   * says the LaTeX the figure carries flattens into something the predicate then rejects.
   */
  it("rejects the wrong-scale GEO.1 row as it is actually typeset", () => {
    const wrongScale = flatten("\\dfrac{50}{5} = 10");
    expect(wrongScale, "flatten stopped producing the string this case is about").toBe(
      "50/5=10",
    );
    expect(
      namesToken(wrongScale, "5"),
      "a figure answering 10 satisfies a question keyed 5, which is D10 round 1's X-5",
    ).toBe(false);
    expect(
      namesToken(flatten("\\dfrac{50}{10} = 5"), "5"),
      "and the RIGHT scale still names its answer, so the tightening did not simply reject everything",
    ).toBe(true);
  });
});
