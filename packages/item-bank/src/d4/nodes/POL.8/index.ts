import {
  type ItemTemplate,
  numericAnswer,
  type Rng,
  standardPolyAnswer,
} from "../../../template";
import { signed, signedTerm } from "../_shared";

/**
 * POL.8 practice templates: polynomial long and synthetic division. Five shapes across the
 * locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  the remainder, found by one substitution rather than by a division;
 *  - L2a the quotient of a quadratic by a linear divisor, which divides exactly;
 *  - L2b the quotient of a cubic by $x - r$, which is where synthetic division earns its keep;
 *  - L3a the remainder of a division whose dividend carries a leading coefficient;
 *  - L3b the quotient of a cubic with a MISSING power, where the empty column decides it.
 *
 * ## Answer path
 *
 * Two shapes answer `numeric`, because a remainder is a quantity, and three answer as an
 * `expression` under `is_standard_polynomial`, because a quotient is a polynomial and the
 * order of its terms is part of the answer.
 *
 * ## Which keys carry a caret, and why it matters
 *
 * The two cubic shapes key a quadratic quotient, so their keys carry a `^` and reach the
 * caret line and the exponent key. The linear quotient in L2a does not, and its field is
 * bare, which is correct: every character of `x + 5` is on a phone keyboard's first layer
 * (R30).
 *
 * ## Why the hints carry no digits
 *
 * `hint_leaks_answer` matches the answer key as a standalone value, and both numeric keys
 * here are small integers. A hint naming any small number would leak on exactly the draws
 * whose remainder is that number.
 */

export const POL8_NODE = "POL.8";

/** A quadratic in standard form, printed for a prompt. */
function quadratic(a: number, b: number, c: number): string {
  return `${a === 1 ? "" : a}x^{2} ${signedTerm(b, "x")} ${signedTerm(c, "")}`;
}

/** A cubic in standard form, printed for a prompt. */
function cubic(b: number, c: number, d: number): string {
  return `x^{3} ${signedTerm(b, "x^{2}")} ${signedTerm(c, "x")} ${signedTerm(d, "")}`;
}

/**
 * L1, the remainder by substitution. The divisor is $x - r$ on every draw, so the theorem
 * applies directly and the division never has to be run.
 */
export const d4_pol8_remainder_l1: ItemTemplate = {
  template_id: "d4.pol8.remainder.l1",
  node_id: POL8_NODE,
  difficulty: 1,
  concept: "remainder-theorem",
  generate(rng: Rng) {
    const r = rng.int(2, 7);
    const b = rng.int(-9, -2);
    const c = rng.int(-12, 12) || 5;
    const remainder = r * r + b * r + c;
    return {
      prompt: `What remainder does $${quadratic(1, b, c)}$ leave when it is divided by $x - ${r}$? Enter one number.`,
      answer: numericAnswer(`${remainder}`),
      params: { r, b, c, remainder },
      hints: [
        "The division statement says the dividend equals the divisor times the quotient plus the remainder, and the divisor vanishes at one particular value of the variable.",
        "Substituting that value into the dividend makes the whole product term disappear and leaves the remainder standing alone, so no division is needed.",
      ],
      worked_solution: [
        `The divisor $x - ${r}$ is zero when $x = ${r}$, so that is the value to substitute.`,
        `Substituting gives $(${r})^{2} ${signed(b)}(${r}) ${signed(c)}$.`,
        `That evaluates to $${r * r} ${signed(b * r)} ${signed(c)}$.`,
        `So the remainder is $${remainder}$, and it would have taken a whole long division to reach it any other way.`,
      ],
    };
  },
  varietyKey: (params) => `${params.r ?? 0}:${params.b ?? 0}`,
};

/**
 * L2a, an exact division of a quadratic. The quotient is linear, so nothing about the answer
 * needs notation the learner cannot type.
 */
export const d4_pol8_quotient_linear_l2: ItemTemplate = {
  template_id: "d4.pol8.quotient-linear.l2",
  node_id: POL8_NODE,
  difficulty: 2,
  concept: "divide-quadratic",
  generate(rng: Rng) {
    const d = rng.int(2, 9);
    const q = rng.int(2, 9);
    return {
      prompt: `Divide $${quadratic(1, d + q, d * q)}$ by $x + ${d}$. The division comes out exactly; give the quotient.`,
      answer: standardPolyAnswer(`x + ${q}`, ["x"]),
      params: { d, q },
      hints: [
        "Ask what the divisor has to be multiplied by to produce the leading term of the dividend, and that multiplier is the first part of the quotient.",
        "Multiply the whole divisor by it, subtract, and ask the same question of whatever is left over.",
      ],
      worked_solution: [
        `To produce $x^{2}$ from $x$, the divisor is multiplied by $x$, giving $x^{2} + ${d}x$.`,
        `Subtracting that leaves $${q}x + ${d * q}$.`,
        `To produce $${q}x$ from $x$, the divisor is multiplied by $${q}$, giving $${q}x + ${d * q}$.`,
        `Subtracting leaves nothing, so the quotient is $x + ${q}$ with no remainder.`,
      ],
    };
  },
  varietyKey: (params) => `${params.d ?? 0}:${params.q ?? 0}`,
};

/**
 * L2b, a cubic divided by $x - r$. The quotient is a quadratic, so this is where the synthetic
 * layout saves the most writing and where its sign convention has to be right.
 */
export const d4_pol8_synthetic_cubic_l2: ItemTemplate = {
  template_id: "d4.pol8.synthetic-cubic.l2",
  node_id: POL8_NODE,
  difficulty: 2,
  concept: "synthetic-division",
  generate(rng: Rng) {
    const r = rng.int(2, 6);
    // Dividend = (x - r)(x^2 + m x + n), so `m = r` zeroes its squared term and `n = r m`
    // zeroes its x term. Either prints a `+ 0x^{2}` or a `+ 0x` into a cubic that has no
    // missing power, which is L3b's subject and not this one's. Both are excluded at the
    // draw rather than rerolled, so the constraint is visible where it is made.
    const m = rng.pick(
      Array.from({ length: 15 }, (_unused, index) => index - 7).filter(
        (value) => value !== 0 && value !== r,
      ),
    );
    const n = rng.pick(
      Array.from({ length: 19 }, (_unused, index) => index - 9).filter(
        (value) => value !== 0 && value !== r * m,
      ),
    );
    const b = m - r;
    const c = n - r * m;
    const d = -r * n;
    return {
      prompt: `Divide $${cubic(b, c, d)}$ by $x - ${r}$. The division comes out exactly; give the quotient.`,
      // Keyed through `signedTerm`, the same printer the worked solution below uses, because
      // `signed(m)` followed by a bare `x` spelled `x^2 + 1x + 5` on the draws where `m` is one
      // while the step beside it read `x^{2} + x + 5`. The checker grades the two as equal, so
      // nothing was ever marked wrong; the learner was simply shown two spellings of one answer.
      answer: standardPolyAnswer(`x^2 ${signedTerm(m, "x")} ${signed(n)}`, ["x"]),
      params: { r, m, n, b, c, d },
      hints: [
        "The divisor has the shape $x - r$, so the coefficients alone carry the whole division and the value used is the one that makes the divisor zero.",
        "Bring the leading coefficient down, then repeatedly multiply what is at the bottom by that value and add it to the next coefficient along.",
      ],
      worked_solution: [
        `The divisor is zero at $x = ${r}$, so that is the value the synthetic row uses.`,
        `The dividend's coefficients are $1$, $${b}$, $${c}$ and $${d}$.`,
        `Bringing $1$ down and running the multiply-and-add gives $1$, $${m}$, $${n}$, then $0$.`,
        `The first three are the quotient's coefficients and the last is the remainder, so the quotient is $x^{2} ${signedTerm(m, "x")} ${signedTerm(n, "")}$ with nothing left over.`,
      ],
    };
  },
  varietyKey: (params) => `${params.r ?? 0}:${params.m ?? 0}:${params.n ?? 0}`,
};

/**
 * L3a, a remainder with a leading coefficient in the way.
 *
 * The remainder theorem still applies, and the arithmetic under it is harder: the substitution
 * has to square the value and then multiply by the leading coefficient, which is where a step
 * gets skipped.
 */
export const d4_pol8_leading_remainder_l3: ItemTemplate = {
  template_id: "d4.pol8.leading-remainder.l3",
  node_id: POL8_NODE,
  difficulty: 3,
  concept: "remainder-with-leading-coefficient",
  generate(rng: Rng) {
    const a = rng.int(2, 5);
    const r = rng.int(2, 6);
    const b = rng.int(-9, -2);
    const c = rng.int(-14, 14) || 7;
    const remainder = a * r * r + b * r + c;
    return {
      prompt: `What remainder does $${quadratic(a, b, c)}$ leave when it is divided by $x - ${r}$? Enter one number.`,
      answer: numericAnswer(`${remainder}`),
      params: { a, r, b, c, remainder },
      hints: [
        "The divisor is zero at one value of the variable, and substituting that value into the dividend leaves the remainder on its own.",
        "The leading coefficient multiplies the SQUARE, so the squaring is done first and the coefficient applied to the result, not the other way round.",
      ],
      worked_solution: [
        `The divisor $x - ${r}$ is zero at $x = ${r}$.`,
        `Substituting gives $${a}(${r})^{2} ${signed(b)}(${r}) ${signed(c)}$.`,
        `The squared term is $${a} \\times ${r * r} = ${a * r * r}$, and the middle term is $${b * r}$.`,
        `Adding all three parts gives $${remainder}$, which is the remainder.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.r ?? 0}:${params.b ?? 0}`,
};

/**
 * L3b, a cubic with the squared term absent.
 *
 * The dividend has to be written with an explicit zero coefficient before the division runs,
 * or every later subtraction lines up under the wrong power. This is the one shape whose
 * failure mode leaves no step that looks wrong.
 */
export const d4_pol8_missing_power_l3: ItemTemplate = {
  template_id: "d4.pol8.missing-power.l3",
  node_id: POL8_NODE,
  difficulty: 3,
  concept: "divide-with-missing-power",
  generate(rng: Rng) {
    const r = rng.int(2, 6);
    // Dividend = (x - r)(x^2 + r x + n) = x^3 + (n - r^2)x - r n. The squared term cancels
    // because the quotient's middle coefficient is `r` itself, and the x term is what is
    // LEFT of `n` after `-r` has multiplied that middle coefficient. Writing `n + r^2` here
    // instead states a dividend the stated quotient does not divide, and the prompt's own
    // "comes out exactly" is then false as well.
    //
    // Two values of `n` are excluded at the draw rather than rerolled, so the constraint is
    // visible where it is made: `0` would leave the quotient's constant off, and `r^2` would
    // zero the dividend's own x term, printing `+ 0x` in a prompt whose whole subject is a
    // power written in as a zero.
    const n = rng.pick(
      Array.from({ length: 19 }, (_unused, index) => index - 9).filter(
        (value) => value !== 0 && value !== r * r,
      ),
    );
    const c = n - r * r;
    const d = -r * n;
    return {
      prompt: `Divide $x^{3} ${signedTerm(c, "x")} ${signedTerm(d, "")}$ by $x - ${r}$. The division comes out exactly; give the quotient.`,
      answer: standardPolyAnswer(`x^2 + ${r}x ${signed(n)}`, ["x"]),
      params: { r, n, c, d },
      hints: [
        "One power is missing from the dividend, and the division needs a column for every power, so write it in with a coefficient of zero before starting.",
        "That column changes the value of the dividend by nothing and keeps every later subtraction under the terms it belongs to.",
      ],
      worked_solution: [
        `Written out in full the dividend is $x^{3} + 0x^{2} ${signedTerm(c, "x")} ${signedTerm(d, "")}$.`,
        `The divisor is zero at $x = ${r}$, so the synthetic row runs on $1$, $0$, $${c}$, $${d}$.`,
        `Multiplying and adding down the row gives $1$, $${r}$, $${n}$, then $0$.`,
        `So the quotient is $x^{2} + ${r}x ${signedTerm(n, "")}$ with nothing left over, and leaving the empty column out would have shifted every one of those numbers.`,
      ],
    };
  },
  varietyKey: (params) => `${params.r ?? 0}:${params.n ?? 0}`,
};

/** POL.8's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const POL8_TEMPLATES: readonly ItemTemplate[] = [
  d4_pol8_remainder_l1,
  d4_pol8_quotient_linear_l2,
  d4_pol8_synthetic_cubic_l2,
  d4_pol8_leading_remainder_l3,
  d4_pol8_missing_power_l3,
];
