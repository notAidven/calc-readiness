import {
  expressionAnswer,
  type ItemTemplate,
  multipleChoiceAnswer,
  numericAnswer,
  type Rng,
} from "../../../template";
import { signedTerm } from "../_shared";

/**
 * POL.6 practice templates: end behavior from the degree and the leading coefficient. Five
 * shapes across the locked 1xL1 / 2xL2 / 2xL3 mix, and the ladder is one idea followed to
 * four places rather than four ideas:
 *
 *  - L1  the degree, read off a polynomial already in standard form;
 *  - L2a the leading COEFFICIENT of a polynomial whose terms are out of order, so the term
 *        that decides the ends has to be found before it can be read;
 *  - L2b the leading TERM of a polynomial in factored form, which is the first shape that
 *        cannot be answered by looking, because nothing is expanded;
 *  - L3a the leading term of a PRODUCT of two binomials, where only one of the four products
 *        matters and the other three are the distraction;
 *  - L3b one end of a transformed polynomial, which is the only shape that asks for the
 *        description itself.
 *
 * ## Why the description sits at L1 and L3 and never at L2
 *
 * The obvious question for this node is *"which way does each end go"*, and its answer is one
 * of four two-word phrases. That shape is deliberately kept out of the L2 cell, because
 * **L2 is the tier the diagnostic freezes walk forms from** (`practice-walk.ts` freezes the
 * routing tier only) and a `multiple_choice` key is compared BY BYTES: measured against the
 * real v2 checker, `compareMultipleChoice` is `rawAnswer === answer_key` with no trim and no
 * case folding, so `"down and up "` grades `value_mismatch`. In a lesson that costs a retry
 * and the learner sees why. In a placement it is a wrong answer about a skill the learner
 * has, recorded against them, for a trailing space. So the four L2-and-below shapes that a
 * placement can reach all answer with a number or an expression, where the comparator is
 * symbolic, and L3b's key is one lowercase word rather than a phrase.
 *
 * That is not a retreat from the node's own competence. The leading term IS the whole of end
 * behavior: once it is in hand the description is a four-way lookup, and every wrong
 * description a learner gives comes from having the wrong term. The lesson's own widgets ask
 * for the four-way reading, where a tap cannot be mistyped.
 *
 * ## Answer paths
 *
 * A degree and a leading coefficient are counts and so are `numeric`. A leading term is a
 * monomial and so is an `expression` over `x`; measured against the real checker, `-3x^4`
 * grades itself, `-3*x^4` grades the same, `3x^4` comes back `sign_error`, and the LaTeX
 * spelling `-3x^{4}` is `parse_error`, which is why no prompt here invites braces.
 *
 * ## Why no hint carries a digit or a minus sign
 *
 * `hint_leaks_answer` matches a key as a standalone value, and two shapes here key a small
 * signed integer. A hint reading "check whether the coefficient is negative, as it is when
 * the sign is $-2$" would leak on exactly the draws whose leading coefficient is $-2$ and
 * pass on all the others, which is worse than a constant leak because the sweep that catches
 * it depends on the seed. The hints name the rule in words instead.
 */

export const POL6_NODE = "POL.6";

/** `x^{4}` / `x` / `1`: one power of `x`, printed the way a polynomial prints it. */
function power(exponent: number): string {
  if (exponent === 0) {
    return "";
  }
  return exponent === 1 ? "x" : `x^{${exponent}}`;
}

/** A whole term with its coefficient and its power, signed: `- 3x^{4}`, `+ x`, `- 7`. */
function term(coefficient: number, exponent: number): string {
  return signedTerm(coefficient, power(exponent));
}

/** The same term without a leading sign, for the first term in a written polynomial. */
function leadTerm(coefficient: number, exponent: number): string {
  const body =
    exponent === 0
      ? `${Math.abs(coefficient)}`
      : Math.abs(coefficient) === 1
        ? power(exponent)
        : `${Math.abs(coefficient)}${power(exponent)}`;
  return coefficient < 0 ? `-${body}` : body;
}

/** A monomial as a grader-legal answer key: `-3x^4`, `x^5`, `-x^3`. */
function monomialKey(coefficient: number, exponent: number): string {
  const size = Math.abs(coefficient) === 1 ? "" : `${Math.abs(coefficient)}`;
  const body = exponent === 1 ? `${size}x` : `${size}x^${exponent}`;
  return coefficient < 0 ? `-${body}` : body;
}

/**
 * A signed number as a factor: `(-3)` where it is negative and `4` where it is not.
 *
 * A bare minus sign directly after `\\times` reads as an operator rather than as part of the
 * number it belongs to, which is why `lesson-katex` asks for a negative in parentheses.
 */
function paren(value: number): string {
  return value < 0 ? `\\left(${value}\\right)` : `${value}`;
}

/** Greatest common divisor of two magnitudes, for the coprimality guards below. */
function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/**
 * The `(inner x - shift)` factors whose two numbers share no factor, so the bracket is
 * already as simple as it goes. Nine pairs.
 */
const COPRIME_LINEAR_FACTORS: readonly { inner: number; shift: number }[] = [
  2, 3, 5,
].flatMap((inner) =>
  [1, 2, 3, 4]
    .filter((shift) => gcd(inner, shift) === 1)
    .map((shift) => ({ inner, shift })),
);

/**
 * The `(a x^n + c)` binomials whose coefficient and constant share no factor. Same reason as
 * {@link COPRIME_LINEAR_FACTORS}: `2x^{3} + 16` is `2(x^{3} + 8)` and invites a learner to
 * simplify a bracket the question only wants the leading term of.
 */
const COPRIME_BINOMIALS: readonly { coefficient: number; constant: number }[] = [
  -6, -5, -3, -2, 2, 3, 4, 5,
].flatMap((coefficient) =>
  [-9, -4, 3, 4, 7, 8, 9, 11]
    .filter((constant) => gcd(coefficient, constant) === 1)
    .map((constant) => ({ coefficient, constant })),
);

/** Write a polynomial from `[coefficient, exponent]` pairs in the order given. */
function polynomial(terms: readonly (readonly [number, number])[]): string {
  const [first, ...rest] = terms;
  if (!first) {
    return "0";
  }
  return [
    leadTerm(first[0], first[1]),
    ...rest.map(([coefficient, exponent]) => term(coefficient, exponent)),
  ].join(" ");
}

/**
 * L1, the degree read off standard form.
 *
 * Nothing is hidden: the highest power is written first, so the only thing being asked is
 * whether the learner knows that the DEGREE is the exponent on that term rather than the
 * number of terms or the largest coefficient, which are the two things a learner meeting the
 * word for the first time reaches for.
 */
export const d4_pol6_degree_standard_l1: ItemTemplate = {
  template_id: "d4.pol6.degree-standard.l1",
  node_id: POL6_NODE,
  difficulty: 1,
  concept: "degree-of-a-polynomial",
  generate(rng: Rng) {
    const degree = rng.int(3, 7);
    const lead = rng.pick([2, 3, 4, 5, 6, 8]);
    const middle = rng.int(2, 9);
    const middleExponent = rng.int(1, degree - 2);
    const constant = rng.int(2, 12);
    return {
      prompt: `What is the degree of $f(x) = ${polynomial([
        [lead, degree],
        [-middle, middleExponent],
        [constant, 0],
      ])}$? Enter one number.`,
      answer: numericAnswer(`${degree}`),
      params: { degree, lead, middle, middleExponent, constant },
      hints: [
        "The degree of a polynomial is the largest exponent on the variable anywhere in it, and it has nothing to do with how many terms there are or how large the coefficients are.",
        "Standard form is written with the powers descending, so when a polynomial is already written that way the largest exponent belongs to the very first term.",
      ],
      worked_solution: [
        `The powers present are $${degree}$, $${middleExponent}$ and $0$, since a constant term carries no variable.`,
        `The degree is the largest of those.`,
        `So the degree is $${degree}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.degree ?? 0}:${params.lead ?? 0}`,
};

/**
 * L2a, the leading coefficient of a polynomial whose terms are OUT of order.
 *
 * The step up is entirely about the word "leading". A learner who has only met standard form
 * reads the leading coefficient as "the first number", and out of order that is a different
 * number, so this is the shape that separates knowing the definition from having memorised a
 * position on the page. The sign is drawn both ways because the sign is the half of the
 * answer that decides the right-hand end.
 *
 * The highest power is never written first, which is what makes every draw a real reordering
 * rather than only most of them.
 */
export const d4_pol6_leading_coefficient_l2: ItemTemplate = {
  template_id: "d4.pol6.leading-coefficient-jumbled.l2",
  node_id: POL6_NODE,
  difficulty: 2,
  concept: "leading-coefficient-out-of-order",
  generate(rng: Rng) {
    const degree = rng.int(3, 6);
    const size = rng.int(2, 7);
    const negative = rng.int(0, 1) === 1;
    const lead = negative ? -size : size;
    const constant = rng.pick([3, 5, 6, 7, 9, 10, 11, 14]);
    const middle = rng.int(2, 8);
    const middleExponent = rng.int(1, degree - 2);
    // Two orders, and the leading term is last in one and second in the other. It is never
    // first, so no draw can be answered by reading the opening coefficient.
    const order = rng.int(0, 1);
    const leadPair: readonly [number, number] = [lead, degree];
    const middlePair: readonly [number, number] = [middle, middleExponent];
    const constantPair: readonly [number, number] = [constant, 0];
    const written =
      order === 0
        ? [constantPair, middlePair, leadPair]
        : [middlePair, leadPair, constantPair];
    return {
      prompt: `What is the leading coefficient of $f(x) = ${polynomial(written)}$? Enter one number, with its sign.`,
      answer: numericAnswer(`${lead}`),
      params: { degree, lead, constant, middle, middleExponent, order },
      hints: [
        "The leading coefficient is the coefficient on the term of highest degree, and that is a fact about the powers rather than about the order the terms happen to be written in.",
        "So sort the terms by their exponent first, largest power to smallest, and then read the coefficient off the term that came out in front. Its sign travels with it, because that sign is half of what the coefficient tells you.",
      ],
      worked_solution: [
        `Put the terms in order of descending power: $${polynomial([leadPair, middlePair, constantPair])}$.`,
        `The term of highest degree is $${leadTerm(lead, degree)}$.`,
        `Its coefficient is what the question asks for, sign included.`,
        `So the leading coefficient is $${lead}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.degree ?? 0}:${params.lead ?? 0}:${params.order ?? 0}`,
};

/**
 * L2b, the leading term of a polynomial in FACTORED form.
 *
 * This is the first shape that cannot be answered by looking at the page, and the whole
 * point of it is that expanding is unnecessary: the degree is the sum of the exponents on
 * the factors and the leading coefficient is the product of the factors' own leading
 * coefficients. One factor carries a coefficient of its own, so that product is a real
 * multiplication rather than a copy of the constant out front.
 */
export const d4_pol6_leading_term_factored_l2: ItemTemplate = {
  template_id: "d4.pol6.leading-term-factored.l2",
  node_id: POL6_NODE,
  difficulty: 2,
  concept: "leading-term-from-factored-form",
  generate(rng: Rng) {
    const outer = rng.pick([-4, -3, -2, 2, 3, 4]);
    // Drawn as a coprime pair so the linear factor never carries a common factor of its own.
    // `(2x - 4)` is `2(x - 2)`, which is not wrong and is not the form a factored polynomial
    // is written in, and a learner who spots it is being invited to tidy up work the question
    // did not ask for.
    const { inner, shift } = rng.pick(COPRIME_LINEAR_FACTORS);
    const root = rng.pick([-3, -2, 2, 3, 5]);
    const multiplicity = rng.int(2, 3);
    const degree = 1 + multiplicity;
    const lead = outer * inner;
    const rootTerm = root < 0 ? `+ ${-root}` : `- ${root}`;
    const factored = `${outer === -1 ? "-" : outer}(${inner}x ${shift < 0 ? "+" : "-"} ${Math.abs(shift)})(x ${rootTerm})^{${multiplicity}}`;
    return {
      prompt: `Give the leading term of $f(x) = ${factored}$. Write it as a coefficient times a power of $x$, using ^ for the power, for example 5x^9.`,
      answer: expressionAnswer(monomialKey(lead, degree), ["x"]),
      params: { outer, inner, shift, root, multiplicity, degree, lead },
      hints: [
        "Nothing has to be multiplied out. Each factor has its own leading term, and the leading term of the whole product is what those leading terms make when they are multiplied together.",
        "So take the degree first: a power of a factor contributes its exponent that many times over, so the degrees of the factors add. Then take the coefficient, which is the product of the factors' leading coefficients and the number standing outside them.",
      ],
      worked_solution: [
        `Each factor contributes its own leading term. The linear factor contributes $${inner}x$, and the repeated factor contributes $x$ raised to its exponent, which is $${power(multiplicity)}$.`,
        `The degrees add: $1 + ${multiplicity} = ${degree}$.`,
        `The coefficients multiply: $${paren(outer)} \\times ${inner} = ${lead}$.`,
        `So the leading term is $${leadTerm(lead, degree)}$, typed as ${monomialKey(lead, degree)}.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.outer ?? 0}:${params.inner ?? 0}:${params.multiplicity ?? 0}`,
};

/**
 * L3a, the leading term of a product of two binomials written in mixed order.
 *
 * Four products come out of two binomials and exactly one of them matters, which is what
 * makes this the hardest of the five: the other three are on the page, they are easy to
 * compute, and computing them is wasted work that also invites the learner to add something
 * to the answer. The second factor is written with its constant FIRST, so its own leading
 * term is not the term nearest the bracket, and a learner reading positions rather than
 * powers takes the constant for it.
 */
export const d4_pol6_product_leading_term_l3: ItemTemplate = {
  template_id: "d4.pol6.product-leading-term.l3",
  node_id: POL6_NODE,
  difficulty: 3,
  concept: "leading-term-of-a-product",
  generate(rng: Rng) {
    // The left bracket leads with a positive coefficient so the sign of the answer comes from
    // the right one alone, which is the bracket a learner is most likely to misread.
    const left = rng.pick(COPRIME_BINOMIALS.filter((pair) => pair.coefficient > 0));
    const right = rng.pick(COPRIME_BINOMIALS.filter((pair) => pair.constant > 0));
    const aCoefficient = left.coefficient;
    const aConstant = left.constant;
    const bCoefficient = right.coefficient;
    const bConstant = right.constant;
    const aExponent = rng.int(2, 4);
    const bExponent = rng.int(2, 4);
    const degree = aExponent + bExponent;
    const lead = aCoefficient * bCoefficient;
    const leftWritten = polynomial([
      [aCoefficient, aExponent],
      [aConstant, 0],
    ]);
    // The right factor leads with its CONSTANT, so its highest power is written last.
    const rightWritten = polynomial([
      [bConstant, 0],
      [bCoefficient, bExponent],
    ]);
    return {
      prompt: `Give the leading term of $f(x) = \\left(${leftWritten}\\right)\\left(${rightWritten}\\right)$. Write it as a coefficient times a power of $x$, using ^ for the power, for example 5x^9.`,
      answer: expressionAnswer(monomialKey(lead, degree), ["x"]),
      params: {
        aCoefficient,
        aExponent,
        aConstant,
        bCoefficient,
        bExponent,
        bConstant,
        degree,
        lead,
      },
      hints: [
        "Multiplying the brackets out would produce four terms, and only one of them can be the leading term: the one made from the two highest powers. The other three all have smaller degree, so they cannot reach it and do not need computing.",
        "Find each bracket's own term of highest degree first, which means reading the powers rather than the positions, since a bracket may be written with its constant in front. Then multiply just those two: the exponents add and the coefficients multiply.",
      ],
      worked_solution: [
        `Take each bracket's highest power. On the left that is $${leadTerm(aCoefficient, aExponent)}$, and on the right it is $${leadTerm(bCoefficient, bExponent)}$, which is written last rather than first.`,
        `Multiply only those two. The exponents add: $${aExponent} + ${bExponent} = ${degree}$.`,
        `The coefficients multiply: $${aCoefficient} \\times ${paren(bCoefficient)} = ${lead}$.`,
        `So the leading term is $${leadTerm(lead, degree)}$, typed as ${monomialKey(lead, degree)}.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.aCoefficient ?? 0}:${params.aExponent ?? 0}:${params.bCoefficient ?? 0}:${params.bExponent ?? 0}`,
};

/** How a transformation is applied, and what it does to a named end. */
const TRANSFORMS = [
  {
    /** `g(x) = -f(x)`: every value changes sign, so both ends turn over. */
    written: "-f(x)",
    word: "reflected in the horizontal axis",
  },
  {
    /** `g(x) = f(-x)`: every input changes sign, so the two ends swap places. */
    written: "f(-x)",
    word: "reflected in the vertical axis",
  },
] as const;

/**
 * L3b, one end of a transformed polynomial, and the only shape here that asks for the
 * description itself.
 *
 * Two competences are being used at once, which is what makes it L3: the end behavior of the
 * original has to be settled from its leading term, and then the transformation has to be
 * applied to the correct end. The two transformations fail in opposite ways, so neither can
 * be answered by a rule of thumb about the other. Negating the whole function turns both
 * ends over and leaves them where they are; negating the input leaves each end pointing the
 * way it did and swaps which end it is, so on an EVEN degree it changes nothing at all and
 * on an odd degree it changes both.
 *
 * The key is one lowercase word, which is a deliberate limit: see the file docblock on
 * `compareMultipleChoice`.
 */
export const d4_pol6_ends_after_transform_l3: ItemTemplate = {
  template_id: "d4.pol6.ends-after-transform.l3",
  node_id: POL6_NODE,
  difficulty: 3,
  concept: "end-behavior-under-a-reflection",
  generate(rng: Rng) {
    const degree = rng.int(3, 6);
    const size = rng.int(2, 5);
    const negative = rng.int(0, 1) === 1;
    const lead = negative ? -size : size;
    const constant = rng.pick([3, 5, 7, 8, 11]);
    const transform = rng.int(0, 1);
    const side = rng.int(0, 1);
    const spec = TRANSFORMS[transform] ?? TRANSFORMS[0];
    const even = degree % 2 === 0;

    // The original's end, as a direction. On the right an even or odd degree both follow the
    // sign of the leading coefficient; on the left an odd degree flips it and an even one
    // does not.
    const originalRight = lead > 0;
    const originalLeft = even ? lead > 0 : !(lead > 0);
    // `-f(x)` turns the asked end over. `f(-x)` reads the OTHER end of the original.
    const asked = side === 1 ? originalRight : originalLeft;
    const other = side === 1 ? originalLeft : originalRight;
    const up = transform === 0 ? !asked : other;
    const sideWord = side === 1 ? "right" : "left";
    const originalWord = asked ? "up" : "down";

    return {
      prompt: `Let $f(x) = ${polynomial([
        [lead, degree],
        [constant, 0],
      ])}$ and let $g(x) = ${spec.written}$. Does the graph of $g$ go up or down at its ${sideWord} end? Answer with the single word up or down, typed in lowercase.`,
      answer: multipleChoiceAnswer(up ? "up" : "down"),
      params: { degree, lead, constant, transform, side },
      hints: [
        "Settle the original first. Its leading term decides both of its ends: the sign of the leading coefficient gives the right end directly, and the degree decides whether the left end matches it or opposes it, matching when the degree is even.",
        "Then read what the transformation does. Putting a minus sign in front of the whole function turns every value over, so each end keeps its place and reverses its direction. Putting the minus sign on the input instead reverses which side of the graph you are looking at, so each end keeps its direction and changes places.",
      ],
      worked_solution: [
        `The leading term of $f$ is $${leadTerm(lead, degree)}$. Its coefficient is ${lead > 0 ? "positive" : "negative"} and its degree is ${even ? "even" : "odd"}, so the ends of $f$ go ${originalLeft ? "up" : "down"} on the left and ${originalRight ? "up" : "down"} on the right.`,
        `The graph of $g$ is the graph of $f$ ${spec.word}.`,
        transform === 0
          ? `That leaves every end where it is and turns its direction over, so the ${sideWord} end of $g$ points the opposite way to the ${sideWord} end of $f$, which went ${originalWord}.`
          : `That swaps the two ends over without turning either one, so the ${sideWord} end of $g$ points the way the ${side === 1 ? "left" : "right"} end of $f$ did, which went ${other ? "up" : "down"}.`,
        `So the ${sideWord} end of $g$ goes ${up ? "up" : "down"}.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.degree ?? 0}:${params.lead ?? 0}:${params.transform ?? 0}:${params.side ?? 0}`,
};

/** POL.6's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const POL6_TEMPLATES: readonly ItemTemplate[] = [
  d4_pol6_degree_standard_l1,
  d4_pol6_leading_coefficient_l2,
  d4_pol6_leading_term_factored_l2,
  d4_pol6_product_leading_term_l3,
  d4_pol6_ends_after_transform_l3,
];
