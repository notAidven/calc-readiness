import { factoredAnswer, type ItemTemplate, type Rng } from "../../../template";
import { coeff, signedTerm } from "../_shared";

/**
 * POL.2 practice templates: factor a polynomial completely. Five shapes across the locked
 * 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  a numeric greatest common factor taken out of a binomial;
 *  - L2a a monic trinomial, the pair that multiplies to the constant and adds to the middle;
 *  - L2b a difference of two squares, the shape the dissection slide argues for;
 *  - L3a a trinomial with a leading coefficient, so the pair search runs over more cases;
 *  - L3b four terms with nothing common to all of them, factored by grouping.
 *
 * ## Answer path, and why no key carries a star
 *
 * Every shape answers as an `expression` under `fully_factored_over_integers`, which is the
 * form the node teaches: the v2 checker rejects an unfactored copy of the prompt as
 * `reducible_factor` and a factor still carrying a common divisor as `not_primitive`.
 *
 * **No key here spells a product with `*`, and that is deliberate rather than tidy.** A
 * monomial greatest common factor carrying a variable can only be keyed `3*x*(x - 4)`, and
 * measured against the real v2 checker a learner who writes the natural `3x(x - 4)` is
 * refused `invalid_input / unsupported_syntax`, which the equivalence spec scores as
 * unanswered. So the L1 shape takes a NUMERIC common factor, whose key `4(x + 3)` reads
 * without a star and accepts the starred spelling as well. Every other key is a product of
 * brackets, and `)(` juxtaposition is supported.
 *
 * ## Two keys the placeholder rules out
 *
 * Nothing here is keyed as a solution set or a fraction, so the rosters and bars other pools
 * have to dodge cannot arise. What these keys DO carry is a caret, on the grouping shape and
 * on nothing else, which is why that shape is the only one in this node that earns an
 * exponent key under its answer field.
 */

export const POL2_NODE = "POL.2";

/** A monic trinomial in standard form, from its two roots' negatives. */
function trinomial(p: number, q: number): string {
  return `x^{2} ${signedTerm(p + q, "x")} ${signedTerm(p * q, "")}`;
}

/**
 * L1, a numeric common measure. The inner binomial is drawn so that its two coefficients
 * share nothing, or the answer would not be fully factored.
 */
export const d4_pol2_gcf_l1: ItemTemplate = {
  template_id: "d4.pol2.gcf.l1",
  node_id: POL2_NODE,
  difficulty: 1,
  concept: "greatest-common-factor",
  generate(rng: Rng) {
    const k = rng.pick([2, 3, 4, 5, 6, 7]);
    // Coprime and both above one, so `k` really is the GREATEST common factor.
    const [m, n] = rng.pick([
      [2, 3],
      [3, 4],
      [3, 5],
      [4, 5],
      [5, 6],
      [5, 7],
      [7, 9],
    ]) as readonly [number, number];
    return {
      prompt: `Factor completely: $${k * m}x + ${k * n}$.`,
      answer: factoredAnswer(`${k}(${m}x + ${n})`, ["x"]),
      params: { k, m, n },
      hints: [
        "Both terms are divisible by the same number, and the answer wants the largest one rather than any one that works.",
        "Once the common measure is outside the bracket, check what is left inside: the two numbers there must share nothing further.",
      ],
      worked_solution: [
        `The two coefficients are $${k * m}$ and $${k * n}$, whose greatest common divisor is $${k}$.`,
        `Taking $${k}$ out of each term leaves $${m}x$ and $${n}$ inside the bracket.`,
        `So the factored form is $${k}(${m}x + ${n})$.`,
        `Inside the bracket $${m}$ and $${n}$ share nothing further, which is the check that says the common measure taken out was the greatest one.`,
      ],
    };
  },
  varietyKey: (params) => `${params.k ?? 0}:${params.m ?? 0}`,
};

/**
 * L2a, a monic trinomial. Both roots are positive so the pair search is the whole of the
 * work, and the constant is never prime, so more than one pair has to be tested.
 */
export const d4_pol2_trinomial_l2: ItemTemplate = {
  template_id: "d4.pol2.trinomial.l2",
  node_id: POL2_NODE,
  difficulty: 2,
  concept: "factor-trinomial",
  generate(rng: Rng) {
    const p = rng.int(2, 9);
    const q = rng.int(2, 9);
    return {
      prompt: `A court of $${trinomial(p, q)}$ square paces is to be set out as one rectangle. Factor it completely to find its two sides.`,
      answer: factoredAnswer(`(x + ${p})(x + ${q})`, ["x"]),
      params: { p, q },
      hints: [
        "The two numbers in the brackets multiply to the constant term and add to the middle coefficient, so list the pairs that satisfy the first condition and test them against the second.",
        "Both conditions have to hold at once. A pair that multiplies correctly and adds to the wrong total is not a near miss; it is a different rectangle.",
      ],
      worked_solution: [
        `Multiplying $(x + p)(x + q)$ out gives $x^{2} + (p + q)x + pq$, so the pair multiplies to $${p * q}$ and adds to $${p + q}$.`,
        `Among the pairs multiplying to $${p * q}$, the one that adds to $${p + q}$ is $${p}$ with $${q}$.`,
        `So the sides are $x + ${p}$ and $x + ${q}$.`,
        `Multiplying them back out returns $${trinomial(p, q)}$, which is the check.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${Math.min(params.p ?? 0, params.q ?? 0)}:${Math.max(params.p ?? 0, params.q ?? 0)}`,
};

/**
 * L2b, a difference of two squares. Drawn with a coefficient on the squared term half the
 * time, so the shape has to be recognized rather than pattern-matched on a bare $x^{2}$.
 */
export const d4_pol2_difference_l2: ItemTemplate = {
  template_id: "d4.pol2.difference.l2",
  node_id: POL2_NODE,
  difficulty: 2,
  concept: "difference-of-squares",
  generate(rng: Rng) {
    const scaled = rng.int(0, 1) === 1;
    // On the scaled draws the two roots must share no factor, or each bracket carries a
    // common divisor and the answer grades `not_primitive`: `(4x + 6)(4x - 6)` is
    // `4(2x + 3)(2x - 3)`, which is a factoring that has not finished. Drawn as a coprime
    // pair rather than rerolled, so the constraint is visible at the draw.
    const [root, inner] = scaled
      ? (rng.pick([
          [2, 3],
          [2, 5],
          [2, 7],
          [2, 9],
          [3, 2],
          [3, 4],
          [3, 5],
          [3, 7],
          [3, 8],
          [4, 3],
          [4, 5],
          [4, 7],
          [4, 9],
          [5, 2],
          [5, 3],
          [5, 4],
          [5, 6],
          [5, 7],
          [5, 8],
          [5, 9],
          [6, 5],
          [6, 7],
        ]) as readonly [number, number])
      : ([1, rng.int(2, 9)] as readonly [number, number]);
    const left = scaled ? `${root * root}x^{2}` : "x^{2}";
    const key = scaled
      ? `(${root}x + ${inner})(${root}x - ${inner})`
      : `(x + ${inner})(x - ${inner})`;
    return {
      prompt: `Factor completely: $${left} - ${inner * inner}$.`,
      answer: factoredAnswer(key, ["x"]),
      params: { root, inner, scaled: scaled ? 1 : 0 },
      hints: [
        "Both parts of this are squares and one is being subtracted from the other, which is a shape with a factoring of its own.",
        "The two brackets hold the same two quantities, with a plus in one and a minus in the other, so the cross terms cancel when they are multiplied back out.",
      ],
      worked_solution: [
        scaled
          ? `$${root * root}x^{2}$ is $(${root}x)^{2}$ and $${inner * inner}$ is $${inner}^{2}$, so this is one square subtracted from another.`
          : `$${inner * inner}$ is $${inner}^{2}$, so this is one square subtracted from another.`,
        `A difference of two squares factors as $a^{2} - b^{2} = (a + b)(a - b)$.`,
        `Here that gives $${key}$.`,
        `Multiplying back out, the two cross terms cancel and only the two squares survive, which is why the middle term is absent.`,
      ],
    };
  },
  varietyKey: (params) => `${params.scaled ?? 0}:${params.inner ?? 0}`,
};

/**
 * L3a, a trinomial with a leading coefficient. The bracket coefficients multiply to the
 * leading coefficient and the constants to the constant term, so the pair search runs over
 * two lists at once.
 */
export const d4_pol2_leading_l3: ItemTemplate = {
  template_id: "d4.pol2.leading.l3",
  node_id: POL2_NODE,
  difficulty: 3,
  concept: "factor-with-leading-coefficient",
  generate(rng: Rng) {
    // `(mx + p)(x + q)`. `m` and `p` must share no factor, or the first bracket carries a
    // common divisor and the whole answer grades `not_primitive`: `(2x + 6)` is `2(x + 3)`,
    // which is a factoring that has not finished. Drawn as a coprime pair rather than
    // rerolled, so the constraint is visible at the draw.
    const [m, p] = rng.pick([
      [2, 1],
      [2, 3],
      [2, 5],
      [3, 1],
      [3, 2],
      [3, 4],
      [3, 5],
      [4, 1],
      [4, 3],
      [4, 5],
      [5, 2],
      [5, 3],
    ]) as readonly [number, number];
    const q = rng.int(1, 6);
    const a = m;
    const b = m * q + p;
    const c = p * q;
    return {
      prompt: `Factor completely: $${a}x^{2} ${signedTerm(b, "x")} ${signedTerm(c, "")}$.`,
      answer: factoredAnswer(`(${m}x + ${p})(x + ${q})`, ["x"]),
      params: { m, p, q },
      hints: [
        "The two bracket coefficients multiply to the leading coefficient and the two constants multiply to the constant term, so there are two lists to run rather than one.",
        "Each candidate pairing has to be checked against the MIDDLE coefficient, which is where the two lists meet: it is the outer product plus the inner one.",
      ],
      worked_solution: [
        `The leading coefficient $${a}$ has to come from the two bracket coefficients, and the constant $${c}$ from the two constants.`,
        `Trying $${coeff(m, "x")}$ with $x$ and $${p}$ with $${q}$ gives an outer product of $${coeff(m * q, "x")}$ and an inner product of $${coeff(p, "x")}$.`,
        `Those add to $${b}x$, which is the middle term, so the pairing is right.`,
        `The factored form is $(${m}x + ${p})(x + ${q})$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.m ?? 0}:${params.p ?? 0}:${params.q ?? 0}`,
};

/**
 * L3b, four terms factored by grouping. This is the only shape in the node whose key carries
 * a caret, because the second bracket is a sum of a square and a constant.
 */
export const d4_pol2_grouping_l3: ItemTemplate = {
  template_id: "d4.pol2.grouping.l3",
  node_id: POL2_NODE,
  difficulty: 3,
  concept: "factor-by-grouping",
  generate(rng: Rng) {
    const a = rng.int(2, 9);
    // Not a perfect square and not sharing a factor with `a`, so the second bracket is
    // irreducible over the integers and the whole thing is fully factored.
    const b = rng.pick([2, 3, 5, 6, 7, 10, 11, 13]);
    return {
      prompt: `Factor completely: $x^{3} + ${a}x^{2} + ${b}x + ${a * b}$.`,
      answer: factoredAnswer(`(x + ${a})(x^2 + ${b})`, ["x"]),
      params: { a, b },
      hints: [
        "No single number or power divides all four terms, so look at the first two and the last two separately and take a common factor out of each.",
        "If the two brackets that produces come out identical, that bracket is a common factor of the whole expression and can be taken out in turn.",
      ],
      worked_solution: [
        `Group the terms in pairs: $(x^{3} + ${a}x^{2}) + (${b}x + ${a * b})$.`,
        `Take $x^{2}$ out of the first pair and $${b}$ out of the second: $x^{2}(x + ${a}) + ${b}(x + ${a})$.`,
        `Both halves now carry $(x + ${a})$, so it is a common factor of the whole expression.`,
        `Taking it out leaves $(x + ${a})(x^{2} + ${b})$, and $x^{2} + ${b}$ does not factor further over the whole numbers.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.b ?? 0}`,
};

/** POL.2's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const POL2_TEMPLATES: readonly ItemTemplate[] = [
  d4_pol2_gcf_l1,
  d4_pol2_trinomial_l2,
  d4_pol2_difference_l2,
  d4_pol2_leading_l3,
  d4_pol2_grouping_l3,
];
