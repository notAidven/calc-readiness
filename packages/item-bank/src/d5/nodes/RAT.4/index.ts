import { type ItemTemplate, type Rng, rationalAnswer } from "../../../template";

/**
 * RAT.4 practice templates for "Verdigris Hold", the crafting-guild island (simplify
 * complex / nested rational expressions). Five problem shapes across the locked
 * 1xL1 / 2xL2 / 2xL3 practice mix, themed as the guild's Master-Recipe Board, where a
 * reagent that is itself a mixture makes the recipe hold a recipe.
 *
 * The theme is skin only. Every prompt still says "clear the inner measures, write it as a
 * single fraction in lowest terms, and state every forbidden measure", so a student who
 * ignores the guild entirely still reads combine, flip, cancel, state the restrictions. No
 * `answer`, `params`, or grader spec depends on the wording.
 *
 * ## Both standard routes reach the same place
 *
 * A complex fraction can be cleared either by combining the top and the bottom into single
 * fractions and then multiplying by the reciprocal, or by multiplying top and bottom by the
 * LCD of the inner fractions. The shapes below are drawn so both routes are practical:
 * `stack.l1`, `divisor-top.l2`, `nested-sum.l3` and `mixture-divisor.l3` read most naturally
 * as combine-then-flip, and `clear.l2` is the shape the LCD route was invented for. The
 * worked solutions take whichever route is shorter for that shape.
 *
 * ## Excluded values, the beat this node owns
 *
 * A complex fraction forbids MORE measures than its simplified form shows. Every shape here
 * inherits:
 *
 *  - the zeros of every denominator that appears anywhere in the original, INCLUDING the
 *    inner ones (`stack.l1` and every shape below);
 *  - the zeros of whatever ends up as the divisor, because dividing by a recipe that is
 *    itself zero is forbidden. That is the divisor's inner NUMERATOR when the bottom is a
 *    single fraction (`divisor-top.l2`), and the zero of the whole bottom MIXTURE when the
 *    bottom is a sum (`clear.l2`, `mixture-divisor.l3`).
 *
 * A plain number on the divisor's top adds nothing, since a number is never zero, and the
 * worked solutions for `stack.l1` and `nested-sum.l3` say so rather than leaving the rule
 * looking like it fires everywhere.
 *
 * ## The one answer form the v2 comparator still cannot read
 *
 * The `rational_answer` path parses with `allowSymbolicDenominator`, so a simplified form
 * that KEEPS a variable denominator grades correctly. One narrow form is still rejected as
 * `parse_error`: a parenthesized sum over a plain NUMBER, e.g. `(x + 5)/6`, which the
 * exact-arithmetic mathjs instance throws on inside `rationalize` (see the header of
 * `d5/nodes/RAT.1/index.ts`). Every shape below is drawn so its answer keeps a symbolic
 * denominator, so none of them can land on that form.
 *
 * Every key is computed by real arithmetic so `validateTemplates` grades each sampled
 * instance correct, and each template declares a `varietyKey` over its simplified answer
 * plus its exclusion set, which the D5 pool ENFORCES (see `d5/practice.ts`), so a cell never
 * freezes two near-twin instances.
 */

export const RAT4_NODE = "RAT.4";

/** The shared task line. Kept outside every `$...$` so only the math is delimited. */
const BOARD_TASK =
  " Clear the inner denominators, write the expression as a single fraction in lowest terms, and state every excluded value, the values of $x$ that would divide by zero anywhere in the original.";

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** A variable term in LaTeX: `3x`, or a bare `x` when the coefficient is 1. */
function vt(coeff: number): string {
  return coeff === 1 ? "x" : `${coeff}x`;
}

/** The same term for a math.js answer key, where multiplication is explicit. */
function keyTerm(coeff: number): string {
  return coeff === 1 ? "x" : `${coeff}*x`;
}

/**
 * L1: the plainest complex fraction, one single measure stacked over another,
 * `(a/x) / (b/(x + c))`. Nothing has to be combined first, so the whole task is reading the
 * long bar as a division and flipping. The two forbidden measures come from the two inner
 * bottoms, and `-c` ends up UPSTAIRS in the answer, so it is already unreadable from the
 * simplified form. `gcd(a, b) = 1` keeps the numbers from needing a second reduction.
 */
export const d5_rat4_stack_l1: ItemTemplate = {
  template_id: "d5.rat4.stack.l1",
  node_id: RAT4_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const c = rng.int(1, 8);
    const a = rng.int(2, 9);
    let b = rng.int(2, 9);
    while (gcd(a, b) !== 1) {
      b = rng.int(2, 9);
    }
    return {
      prompt: `Simplify the complex fraction $\\dfrac{\\dfrac{${a}}{x}}{\\dfrac{${b}}{x + ${c}}}$.${BOARD_TASK}`,
      answer: rationalAnswer(`${a}*(x + ${c})/(${b}*x)`, ["0", `${-c}`], ["x"]),
      params: { a, b, c },
      hints: [
        "The long middle bar is a division sign: the whole numerator is being divided by the whole denominator.",
        "Dividing by a fraction means multiplying by its reciprocal, so turn the bottom fraction over and multiply across.",
        "Both inner denominators appear in the original, so read one excluded value off each before you multiply anything.",
      ],
      worked_solution: [
        `The long bar divides the top fraction by the bottom one: $\\dfrac{${a}}{x} \\div \\dfrac{${b}}{x + ${c}}$.`,
        `Read the excluded values off the inner denominators first: $x$ is zero at $x = 0$, and $x + ${c}$ is zero at $x = -${c}$.`,
        `Dividing means multiplying by the reciprocal, so flip the bottom fraction: $\\dfrac{${a}}{x} \\times \\dfrac{x + ${c}}{${b}}$.`,
        `The divisor carries the plain number $${b}$ in its numerator, and a number is never zero, so it excludes nothing more.`,
        `Multiply across: $\\dfrac{${a}(x + ${c})}{${b}x}$, with $x \\neq 0$ and $x \\neq -${c}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a}:${params.b}:${params.c}`,
};

/**
 * L2a, the divisor's own numerator: `((x + p)/x) / ((x + p)/(x + q))`. The shared `(x + p)`
 * cancels, so the simplified ratio shows only `-q` in its bottom, while `-p` is forbidden
 * because dividing by the bottom recipe requires that recipe to be nonzero. Three
 * exclusions, and the one a student is most likely to miss is the one that cancelled.
 */
export const d5_rat4_divisor_top_l2: ItemTemplate = {
  template_id: "d5.rat4.divisor-top.l2",
  node_id: RAT4_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const p = rng.int(1, 9);
    let q = rng.int(1, 9);
    while (q === p) {
      q = rng.int(1, 9);
    }
    return {
      prompt: `Simplify $\\dfrac{\\dfrac{x + ${p}}{x}}{\\dfrac{x + ${p}}{x + ${q}}}$.${BOARD_TASK}`,
      answer: rationalAnswer(`(x + ${q})/x`, ["0", `${-p}`, `${-q}`], ["x"]),
      params: { p, q },
      hints: [
        "The long middle bar divides the top fraction by the bottom fraction, so flip the bottom one and multiply.",
        "Once it is flipped, one factor appears both in the numerator and in the denominator, so it cancels.",
        "Three values are excluded here. Each inner denominator gives one, and the expression you are dividing by may never be zero itself, which gives the third.",
      ],
      worked_solution: [
        `The long bar divides: $\\dfrac{x + ${p}}{x} \\div \\dfrac{x + ${p}}{x + ${q}}$.`,
        `Read the excluded values off the original. The inner denominators $x$ and $x + ${q}$ give $x = 0$ and $x = -${q}$.`,
        `The divisor is $\\dfrac{x + ${p}}{x + ${q}}$, which is itself zero at $x = -${p}$, and you may not divide by zero, so $x = -${p}$ is excluded too.`,
        `Flip the divisor and multiply: $\\dfrac{x + ${p}}{x} \\times \\dfrac{x + ${q}}{x + ${p}}$.`,
        `Cancel the $(x + ${p})$ that now sits above and below the line.`,
        `Simplified: $\\dfrac{x + ${q}}{x}$, with $x \\neq 0$, $x \\neq -${p}$ and $x \\neq -${q}$. The value $x = -${p}$ left with the cancelled factor and is excluded all the same.`,
      ],
    };
  },
  varietyKey: (params) => `${params.p}:${params.q}`,
};

/**
 * L2b, the shape the LCD route exists for: `(1 + a/x) / (1 - b/x)`. Every inner fraction is
 * measured over `x`, so multiplying the whole top and the whole bottom by `x` clears them in
 * one move, and the `1` has to be multiplied too, which is the classic slip. The second
 * forbidden measure is the zero of the bottom MIXTURE, which is visible in the simplified
 * bottom, so this is the shape where the rule is easiest to see before it has to be trusted.
 */
export const d5_rat4_clear_l2: ItemTemplate = {
  template_id: "d5.rat4.clear.l2",
  node_id: RAT4_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const a = rng.int(1, 9);
    const b = rng.int(1, 9);
    return {
      prompt: `Simplify $\\dfrac{1 + \\dfrac{${a}}{x}}{1 - \\dfrac{${b}}{x}}$.${BOARD_TASK}`,
      answer: rationalAnswer(`(x + ${a})/(x - ${b})`, ["0", `${b}`], ["x"]),
      params: { a, b },
      hints: [
        "Every inner fraction here is over $x$, so a single multiplier clears them all at once.",
        "Multiply the whole numerator and the whole denominator by $x$, and let it reach the $1$ as well as the fraction beside it.",
        "Two values are excluded: the inner denominator may not be zero, and the whole denominator may not be zero either. Set that denominator equal to zero to find the second one.",
      ],
      worked_solution: [
        `Both inner fractions are over $x$, so $x$ is the LCD. Multiply the whole numerator and the whole denominator by $x$.`,
        `Numerator: $x\\left(1 + \\dfrac{${a}}{x}\\right) = x + ${a}$.`,
        `Denominator: $x\\left(1 - \\dfrac{${b}}{x}\\right) = x - ${b}$.`,
        `Cleared: $\\dfrac{x + ${a}}{x - ${b}}$.`,
        `The inner denominator $x$ excludes $x = 0$, and the denominator $1 - \\dfrac{${b}}{x}$ is itself zero at $x = ${b}$, so that value is excluded too. Answer with $x \\neq 0$ and $x \\neq ${b}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a}:${params.b}`,
};

/**
 * L3a, a mixture on top over a single measure underneath:
 * `(a/x + b/(x + p)) / (c/(x + p))`. The top has to be combined over `x(x + p)` first, which
 * is the whole RAT.3 skill, and only then is the long bar an ordinary division. The `(x + p)`
 * cancels, so `-p` is unreadable from the answer, and `c` on the divisor's top is a plain
 * number, so this shape's exclusion set stays at two.
 */
export const d5_rat4_nested_sum_l3: ItemTemplate = {
  template_id: "d5.rat4.nested-sum.l3",
  node_id: RAT4_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const a = rng.int(1, 7);
    const b = rng.int(1, 7);
    const p = rng.int(1, 7);
    const lead = a + b; // >= 2
    const constant = a * p; // >= 1, so the numerator never carries a factor of x
    // Keep the answer in lowest terms: the numerator's content must not share a factor
    // with the plain number that ends up underneath.
    let c = rng.int(2, 7);
    while (gcd(gcd(lead, constant), c) !== 1) {
      c = rng.int(2, 7);
    }
    return {
      prompt: `Simplify $\\dfrac{\\dfrac{${a}}{x} + \\dfrac{${b}}{x + ${p}}}{\\dfrac{${c}}{x + ${p}}}$.${BOARD_TASK}`,
      answer: rationalAnswer(
        `(${keyTerm(lead)} + ${constant})/(${c}*x)`,
        ["0", `${-p}`],
        ["x"],
      ),
      params: { a, b, c, p, lead, constant },
      hints: [
        "Deal with the numerator first: two fractions with different inner denominators must become one fraction before the long bar can be read as a division.",
        "Those inner denominators share no factor, so their LCD is simply their product. Combine the numerator over it.",
        "Now flip the bottom fraction and multiply. Both inner denominators stay excluded, including the one that cancels on the way.",
      ],
      worked_solution: [
        `Combine the numerator over one denominator. The inner denominators $x$ and $x + ${p}$ share no factor, so the LCD is $x(x + ${p})$.`,
        `Numerator: $\\dfrac{${a}}{x} + \\dfrac{${b}}{x + ${p}} = \\dfrac{${a}(x + ${p}) + ${vt(b)}}{x(x + ${p})} = \\dfrac{${vt(lead)} + ${constant}}{x(x + ${p})}$.`,
        `The long bar divides that by $\\dfrac{${c}}{x + ${p}}$, so flip and multiply: $\\dfrac{${vt(lead)} + ${constant}}{x(x + ${p})} \\times \\dfrac{x + ${p}}{${c}}$.`,
        `Cancel the $(x + ${p})$ that sits above and below: $\\dfrac{${vt(lead)} + ${constant}}{${c}x}$.`,
        `Both inner denominators are excluded, so $x \\neq 0$ and $x \\neq -${p}$. The divisor's numerator is the plain number $${c}$, which is never zero, so it adds nothing.`,
      ],
    };
  },
  varietyKey: (params) => `${params.lead}:${params.constant}:${params.c}`,
};

/**
 * L3b, the node's flagship shape: the MIXTURE is underneath,
 * `(a/x) / (1/x + 1/(x + p))`. Combining the bottom gives `(2x + p) / (x(x + p))`, and the
 * value that empties that mixture is a THIRD forbidden measure which appears nowhere among
 * the inner bottoms and nowhere in the simplified answer either. `p` is drawn even so that
 * measure is a whole number, and `a` is drawn odd so the answer cannot be reduced further
 * against the `2` that the combined bottom brings with it.
 */
export const d5_rat4_mixture_divisor_l3: ItemTemplate = {
  template_id: "d5.rat4.mixture-divisor.l3",
  node_id: RAT4_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const m = rng.int(1, 7);
    const p = 2 * m;
    const a = 2 * rng.int(0, 4) + 1; // 1, 3, 5, 7 or 9
    const topTex = a === 1 ? `x + ${p}` : `${a}(x + ${p})`;
    const answerKey = a === 1 ? `(x + ${p})/(2*x + ${p})` : `${a}*(x + ${p})/(2*x + ${p})`;
    return {
      prompt: `Simplify $\\dfrac{\\dfrac{${a}}{x}}{\\dfrac{1}{x} + \\dfrac{1}{x + ${p}}}$.${BOARD_TASK}`,
      answer: rationalAnswer(answerKey, ["0", `${-p}`, `${-m}`], ["x"]),
      params: { a, p, m },
      hints: [
        "The denominator is a sum of two fractions, so combine it into one fraction before you touch the long bar.",
        "Once the denominator is a single fraction, the long bar is an ordinary division: flip it and multiply.",
        "Three values are excluded here. Two come from the inner denominators, and the third is the value that makes the denominator you are dividing by equal to zero.",
      ],
      worked_solution: [
        `The denominator is itself a sum, so combine it over the LCD $x(x + ${p})$: $\\dfrac{1}{x} + \\dfrac{1}{x + ${p}} = \\dfrac{2x + ${p}}{x(x + ${p})}$.`,
        `The inner denominators exclude $x = 0$ and $x = -${p}$.`,
        `Flip that sum and multiply: $\\dfrac{${a}}{x} \\times \\dfrac{x(x + ${p})}{2x + ${p}}$.`,
        `Cancel the $x$ that now sits above and below: $\\dfrac{${topTex}}{2x + ${p}}$.`,
        `You divided by the sum, and $2x + ${p}$ is zero at $x = -${m}$, so that value is excluded as well. Answer with $x \\neq 0$, $x \\neq -${p}$ and $x \\neq -${m}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a}:${params.p}`,
};

/** Every RAT.4 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const RAT4_TEMPLATES: readonly ItemTemplate[] = [
  d5_rat4_stack_l1,
  d5_rat4_divisor_top_l2,
  d5_rat4_clear_l2,
  d5_rat4_nested_sum_l3,
  d5_rat4_mixture_divisor_l3,
];
