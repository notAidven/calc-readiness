import {
  type ItemTemplate,
  numericAnswer,
  type Rng,
  standardPolyAnswer,
} from "../../../template";
import { coeff, signed, signedTerm } from "../_shared";

/**
 * POL.1 practice templates: add, subtract and multiply polynomials. Five shapes across the
 * locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  add two polynomials, which is collecting like terms and nothing else;
 *  - L2a subtract one from another, where the minus has to reach every term;
 *  - L2b expand a product of two monic binomials, the area model the lesson draws;
 *  - L3a expand a product where BOTH sides carry a coefficient, so four products differ;
 *  - L3b a two-variable product, answered by one coefficient rather than by the polynomial.
 *
 * ## Answer path, and the one shape that cannot answer with a polynomial
 *
 * Four shapes answer as an `expression` under `is_standard_polynomial`, which is the form
 * the node teaches: descending powers, each power once, nothing left as a product. The v2
 * checker grades that directly and rejects an unexpanded copy of the prompt as
 * `not_simplified`, which is the right verdict for an "expand" instruction.
 *
 * **L3b is keyed `numeric`, and that is a measured limitation rather than a preference.**
 * The node's title includes multivariable products, and a two-variable key cannot be graded:
 * measured against the real v2 checker, `x^2 + 6xy + 9y^2` is refused `unknown_symbol`
 * because two adjacent letters read as one symbol, and the starred spelling
 * `x^2 + 6*x*y + 9*y^2` grades `not_simplified` because `is_standard_polynomial` orders a
 * single variable. So the multivariable case is asked for as the coefficient of one term,
 * which is a number: the expansion is the method and the coefficient is the report.
 *
 * ## Why the hints carry no bare digits where the key is a number
 *
 * `hint_leaks_answer` matches an answer key as a standalone value, and L3b's key is a small
 * integer. A hint naming a coefficient would leak on exactly the draws whose answer is that
 * coefficient, which is worse than a constant leak because whether the sweep catches it
 * depends on the seed.
 */

export const POL1_NODE = "POL.1";

/** Print a quadratic in standard form from its three coefficients. */
function quadratic(a: number, b: number, c: number): string {
  return `${a === 1 ? "" : a}x^{2} ${signedTerm(b, "x")} ${signedTerm(c, "")}`;
}

/** The same, as a grader-legal answer key (no braces, no spacing that matters). */
function quadraticKey(a: number, b: number, c: number): string {
  return `${a === 1 ? "" : a}x^2 ${signed(b)}x ${signed(c)}`;
}

/**
 * L1, adding two amounts. Every term of the answer is a sum of two coefficients, so the only
 * thing being measured is whether like terms are matched up correctly.
 */
export const d4_pol1_combine_l1: ItemTemplate = {
  template_id: "d4.pol1.combine.l1",
  node_id: POL1_NODE,
  difficulty: 1,
  concept: "add-polynomials",
  generate(rng: Rng) {
    const a1 = rng.int(1, 6);
    const b1 = rng.int(1, 9);
    const c1 = rng.int(1, 12);
    const a2 = rng.int(1, 6);
    const b2 = rng.int(1, 9);
    const c2 = rng.int(1, 12);
    return {
      prompt: `Two orders for the same court read $${quadratic(a1, b1, c1)}$ and $${quadratic(a2, b2, c2)}$ square paces. Write the total in standard form.`,
      answer: standardPolyAnswer(quadraticKey(a1 + a2, b1 + b2, c1 + c2), ["x"]),
      params: { a1, b1, c1, a2, b2, c2 },
      hints: [
        "Two terms combine only when their variable part is identical, so the squared terms go with the squared terms and never with the strips.",
        "Nothing turns one kind of term into another, so the total carries all three kinds and only the coefficients are added.",
      ],
      worked_solution: [
        `The squared terms are like terms: $${coeff(a1, "x^{2}")} + ${coeff(a2, "x^{2}")} = ${coeff(a1 + a2, "x^{2}")}$.`,
        `The terms in $x$ are like terms too: $${coeff(b1, "x")} + ${coeff(b2, "x")} = ${coeff(b1 + b2, "x")}$.`,
        `The plain numbers add on their own: $${c1} + ${c2} = ${c1 + c2}$.`,
        `Written in standard form the total is $${quadratic(a1 + a2, b1 + b2, c1 + c2)}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${(params.a1 ?? 0) + (params.a2 ?? 0)}:${(params.b1 ?? 0) + (params.b2 ?? 0)}`,
};

/**
 * L2a, subtracting one amount from another. The withdrawn amount carries a NEGATIVE middle
 * term on every draw, because the sign that turns over is the term a learner leaves alone.
 */
export const d4_pol1_subtract_l2: ItemTemplate = {
  template_id: "d4.pol1.subtract.l2",
  node_id: POL1_NODE,
  difficulty: 2,
  concept: "subtract-polynomials",
  generate(rng: Rng) {
    const a1 = rng.int(4, 9);
    const b1 = rng.int(1, 8);
    const c1 = rng.int(-9, -1);
    const a2 = rng.int(1, 3);
    // Negative, so subtracting it ADDS, which is the step that goes missing.
    const b2 = -rng.int(2, 7);
    const c2 = rng.int(1, 8);
    return {
      prompt: `A revised contract takes $${quadratic(a2, b2, c2)}$ square paces back off an order of $${quadratic(a1, b1, c1)}$. Write the difference in standard form.`,
      answer: standardPolyAnswer(quadraticKey(a1 - a2, b1 - b2, c1 - c2), ["x"]),
      params: { a1, b1, c1, a2, b2, c2 },
      hints: [
        "What is being taken away is the whole amount rather than its first piece, so the minus in front of the bracket reaches every term inside it.",
        "One of the terms being withdrawn is itself negative. Taking away a deduction leaves more behind than there was, so watch the sign on that term in particular.",
      ],
      worked_solution: [
        `Turning over every sign inside the bracket gives $${quadratic(a1, b1, c1)} - ${coeff(a2, "x^{2}")} ${signedTerm(-b2, "x")} ${signedTerm(-c2, "")}$.`,
        `The squared terms give $${coeff(a1, "x^{2}")} - ${coeff(a2, "x^{2}")} = ${coeff(a1 - a2, "x^{2}")}$.`,
        `The terms in $x$ give $${coeff(b1, "x")} + ${coeff(Math.abs(b2), "x")} = ${coeff(b1 - b2, "x")}$, because the withdrawn term was negative.`,
        `The plain numbers give $${c1} - ${c2} = ${c1 - c2}$, so the difference is $${quadratic(a1 - a2, b1 - b2, c1 - c2)}$.`,
      ],
    };
  },
  varietyKey: (params) => `${(params.a1 ?? 0) - (params.a2 ?? 0)}:${params.b2 ?? 0}`,
};

/**
 * L2b, a product of two monic binomials. Four rectangles, two of which collect, which is the
 * area model the lesson draws.
 */
export const d4_pol1_binomial_l2: ItemTemplate = {
  template_id: "d4.pol1.binomial.l2",
  node_id: POL1_NODE,
  difficulty: 2,
  concept: "expand-binomials",
  generate(rng: Rng) {
    const p = rng.int(2, 9);
    const q = rng.int(2, 9);
    return {
      prompt: `A paved court measures $x + ${p}$ paces along one side and $x + ${q}$ along the other. Write its area as a polynomial in standard form.`,
      answer: standardPolyAnswer(quadraticKey(1, p + q, p * q), ["x"]),
      params: { p, q },
      hints: [
        "Every part of one side meets every part of the other exactly once, so there are four rectangles to write down before anything is collected.",
        "Two of those four rectangles are counted in $x$, so they are like terms and their coefficients add into a single middle term.",
      ],
      worked_solution: [
        `The four rectangles measure $x$ by $x$, $x$ by $${q}$, $${p}$ by $x$, and $${p}$ by $${q}$.`,
        `Their areas are $x^{2}$, $${q}x$, $${p}x$ and $${p * q}$.`,
        `The two strips are like terms, so $${q}x + ${p}x = ${p + q}x$.`,
        `In standard form the court comes to $${quadratic(1, p + q, p * q)}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${Math.min(params.p ?? 0, params.q ?? 0)}:${Math.max(params.p ?? 0, params.q ?? 0)}`,
};

/**
 * L3a, a product with a coefficient on both sides. All four rectangles now differ, and the
 * two middle ones no longer look interchangeable, which is where an outer-inner slip shows.
 */
export const d4_pol1_leading_l3: ItemTemplate = {
  template_id: "d4.pol1.leading.l3",
  node_id: POL1_NODE,
  difficulty: 3,
  concept: "expand-with-coefficients",
  generate(rng: Rng) {
    const a = rng.int(2, 5);
    const b = rng.int(1, 9);
    const c = rng.int(2, 4);
    const d = rng.int(1, 9);
    return {
      prompt: `A stone yard is set out $${a}x + ${b}$ paces one way and $${c}x + ${d}$ the other. Write its area as a polynomial in standard form.`,
      answer: standardPolyAnswer(quadraticKey(a * c, a * d + b * c, b * d), ["x"]),
      params: { a, b, c, d },
      hints: [
        "The same four products appear as before, and none of them is optional: each part of one side meets each part of the other.",
        "The two middle products are no longer equal to each other, so both have to be computed before they are added.",
      ],
      worked_solution: [
        `The squared term comes from the two $x$ pieces: $${a}x \\times ${c}x = ${a * c}x^{2}$.`,
        `The two middle products are $${a}x \\times ${d} = ${a * d}x$ and $${b} \\times ${c}x = ${b * c}x$.`,
        `Those are like terms, so together they give $${a * d + b * c}x$.`,
        `The plain numbers give $${b} \\times ${d} = ${b * d}$, so the area is $${quadratic(a * c, a * d + b * c, b * d)}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${(params.a ?? 0) * (params.c ?? 0)}:${(params.b ?? 0) * (params.d ?? 0)}`,
};

/**
 * L3b, a two-variable product answered by ONE coefficient.
 *
 * The two-variable expansion cannot be graded as an expression (see the module note), so the
 * question asks for the part of it that carries the whole method: the cross term, which is
 * the only one that needs both products and an addition.
 */
export const d4_pol1_two_variable_l3: ItemTemplate = {
  template_id: "d4.pol1.two-variable.l3",
  node_id: POL1_NODE,
  difficulty: 3,
  concept: "expand-two-variable",
  generate(rng: Rng) {
    const a = rng.int(2, 6);
    const b = rng.int(1, 7);
    const c = rng.int(2, 6);
    const d = rng.int(1, 7);
    return {
      // Through `coeff` rather than interpolated, because `b` and `d` are drawn from a range
      // that includes 1 and the raw form printed `4x + 1y` on the draws that took it — against
      // a figure that reads `4x + y`, so the learner met two spellings of one quantity while
      // being asked which pieces the two sides carry.
      prompt: `A yard measures $${coeff(a, "x")} + ${coeff(b, "y")}$ paces one way and $${coeff(c, "x")} + ${coeff(d, "y")}$ the other, where $x$ and $y$ are two different stone lengths. Expanding the product gives a term in $xy$. What is its coefficient? Enter one number.`,
      answer: numericAnswer(`${a * d + b * c}`),
      params: { a, b, c, d },
      hints: [
        "A term in $xy$ can only come from an $x$ piece on one side meeting a $y$ piece on the other, and that happens in two of the four products.",
        "Both of those products are counted in $xy$, so they are like terms and their coefficients add rather than multiply.",
      ],
      worked_solution: [
        `The four products are $${coeff(a, "x")} \\times ${coeff(c, "x")}$, $${coeff(a, "x")} \\times ${coeff(d, "y")}$, $${coeff(b, "y")} \\times ${coeff(c, "x")}$ and $${coeff(b, "y")} \\times ${coeff(d, "y")}$.`,
        `Only the middle two carry both variables: $${coeff(a * d, "xy")}$ and $${coeff(b * c, "xy")}$.`,
        `They are like terms, so they add: $${a * d} + ${b * c} = ${a * d + b * c}$.`,
        `The whole expansion is $${coeff(a * c, "x^{2}")} + ${coeff(a * d + b * c, "xy")} + ${coeff(b * d, "y^{2}")}$, and the middle coefficient is what was asked for.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${(params.a ?? 0) * (params.d ?? 0)}:${(params.b ?? 0) * (params.c ?? 0)}`,
};

/** POL.1's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const POL1_TEMPLATES: readonly ItemTemplate[] = [
  d4_pol1_combine_l1,
  d4_pol1_subtract_l2,
  d4_pol1_binomial_l2,
  d4_pol1_leading_l3,
  d4_pol1_two_variable_l3,
];
