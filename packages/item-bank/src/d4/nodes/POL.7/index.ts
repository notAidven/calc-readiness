import {
  factoredAnswer,
  type ItemTemplate,
  numericAnswer,
  type Rng,
  solutionSetAnswer,
} from "../../../template";
import { isAdvertisedSolution, signedTerm, solutionKey, termSum } from "../_shared";

/**
 * POL.7 practice templates: reading a polynomial's graph off its factors. Five shapes across
 * the locked 1xL1 / 2xL2 / 2xL3 mix, and between them they run the factored form in both
 * directions:
 *
 *  - L1  the real zeros of a polynomial already in factored form;
 *  - L2a the MULTIPLICITY of one named zero, which is what decides whether the graph crosses
 *        the axis there or turns back off it;
 *  - L2b the greatest number of turning points the graph can have, which cannot be answered
 *        without first getting the degree out of the factors;
 *  - L3a the real zeros of a polynomial that arrives EXPANDED, so it has to be factored
 *        before anything can be read;
 *  - L3b the polynomial itself, built from a described graph, which is the only shape that
 *        runs the reading backwards.
 *
 * ## Answer paths, and the one key shape that is unauthorable
 *
 * A roster of zeros is a `solution_set`, a multiplicity and a count of turning points are
 * `numeric`, and a built polynomial is an `expression` under `fully_factored_over_integers`.
 *
 * **No factored KEY here has a bare variable factor, and that is a measured limit rather than
 * a stylistic choice.** Against the real v2 checker, `factoredAnswer("x(x - 4)^3")` refuses
 * its own key: the unstarred spelling is `invalid_input / unsupported_syntax` and the starred
 * `x*(x-4)^3` is `scoring_error / invalid_answer_key`, which is the checker calling the item
 * unauthorable rather than the learner wrong. The same monomial-times-bracket limit is
 * recorded on POL.2's L1 shape in `d4/practice.ts`. So {@link d4_pol7_build_from_graph_l3}
 * never places a zero at the origin, while `(x + 1)(x - 2)^2(x - 3)` and
 * `-2(x - 1)(x + 5)` both grade themselves, with or without stars and in any factor order.
 * L3a's zeros DO include the origin, because there the origin is a member of a roster rather
 * than a factor in a key, and `{0, ...}` grades.
 *
 * ## Why no hint here carries a digit
 *
 * Two shapes key a small integer (a multiplicity is one, two or three; a turning-point count
 * runs from two upward) and one keys a roster whose members are small. `hint_leaks_answer`
 * matches a key as a standalone value, so a hint naming any of those numbers would leak on
 * exactly the draws that used it. Every hint states the rule in words.
 */

export const POL7_NODE = "POL.7";

/** `(x - 3)` / `(x + 2)`: the factor a root `r` contributes, with the sign it really has. */
function factor(root: number): string {
  return `(x ${root < 0 ? `+ ${-root}` : `- ${root}`})`;
}

/** The same factor raised to its multiplicity, or bare when the multiplicity is one. */
function factorPower(root: number, multiplicity: number): string {
  return multiplicity === 1 ? factor(root) : `${factor(root)}^{${multiplicity}}`;
}

/** A factored key: no braces, and the exponent spelled with `^` the way a learner types it. */
function factorPowerKey(root: number, multiplicity: number): string {
  return multiplicity === 1 ? factor(root) : `${factor(root)}^${multiplicity}`;
}

/** `crosses straight through` / `turns back off`: what a multiplicity's parity does at a zero. */
function crossingWord(multiplicity: number): string {
  return multiplicity % 2 === 1 ? "crosses straight through" : "turns back off";
}

/**
 * A roster TYPESET, with its braces escaped so KaTeX draws them.
 *
 * {@link solutionKey} builds the grader-legal key, whose braces are plain characters; dropped
 * into `$...$` unescaped they are LaTeX grouping and vanish, so a step reads `-5, 2` where it
 * meant to read a set. POL.3 escapes them the same way.
 */
function rosterTex(...values: readonly number[]): string {
  return `\\{${[...values].sort((a, b) => a - b).join(", ")}\\}`;
}

/**
 * Roots drawn so no two coincide and none is zero, which keeps every factored form genuinely
 * distinct and keeps a bare variable factor out of every key (see the file docblock).
 */
const ROOT_POOL: readonly number[] = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];

/** Draw `count` distinct roots from {@link ROOT_POOL}, ascending. */
function drawRoots(rng: Rng, count: number): number[] {
  const pool = [...ROOT_POOL];
  const roots: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const pick = rng.int(0, pool.length - 1);
    roots.push(...pool.splice(pick, 1));
  }
  return roots.sort((a, b) => a - b);
}

/**
 * L1, the real zeros of a factored polynomial.
 *
 * The whole of it is that a product is zero exactly when one of its factors is, so each
 * bracket is read on its own and set to zero. Two traps are live on every draw and both are
 * sign traps: the factor `(x + 3)` is zero at a NEGATIVE value, and a repeated factor
 * contributes the same zero however many times it appears, so a roster with a member written
 * twice is one member too long.
 */
export const d4_pol7_zeros_from_factored_l1: ItemTemplate = {
  template_id: "d4.pol7.zeros-from-factored.l1",
  node_id: POL7_NODE,
  difficulty: 1,
  concept: "zeros-of-a-factored-polynomial",
  generate(rng: Rng) {
    let roots = drawRoots(rng, 2);
    // No roster here may spell a placeholder the answer field advertises (R30).
    if (isAdvertisedSolution(...roots)) {
      roots = [roots[0] ?? 1, (roots[1] ?? 2) + 1];
    }
    const [first, second] = roots as [number, number];
    const multiplicity = rng.int(2, 3);
    const outer = rng.pick([1, 2, 3]);
    const written = `${outer === 1 ? "" : outer}${factor(first)}${factorPower(second, multiplicity)}`;
    return {
      prompt: `Give every real zero of $f(x) = ${written}$. List the numbers only, separated by commas.`,
      answer: solutionSetAnswer(solutionKey(first, second)),
      params: { first, second, multiplicity, outer },
      hints: [
        "A product is zero exactly when one of the things being multiplied is zero, so each bracket can be set to zero on its own and the constant in front cannot be zero at all.",
        "Solve each bracket separately, and watch the sign: a bracket adding a number is zero at the negative of it. A bracket that appears more than once still contributes one zero, since it is the same value of $x$ each time.",
      ],
      worked_solution: [
        `Set each bracket to zero in turn. The first gives $x ${first < 0 ? `+ ${-first}` : `- ${first}`} = 0$, so $x = ${first}$.`,
        `The repeated bracket gives $x ${second < 0 ? `+ ${-second}` : `- ${second}`} = 0$, so $x = ${second}$, and it contributes that one value however many times it appears.`,
        `The constant $${outer}$ in front is never zero, so it adds nothing to the list.`,
        `So the real zeros are $${rosterTex(first, second)}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.first ?? 0}:${params.second ?? 0}:${params.multiplicity ?? 0}`,
};

/**
 * L2a, the multiplicity of one named zero.
 *
 * Multiplicity is the number this node is really about, because it is what separates two
 * graphs with identical zeros: at an odd multiplicity the graph crosses the axis and at an
 * even one it comes back off the side it arrived on. The zero the question names is drawn
 * from all three factors, including the ones whose multiplicity is one, so the answer cannot
 * be guessed from the fact that the question was asked at all.
 */
export const d4_pol7_multiplicity_at_zero_l2: ItemTemplate = {
  template_id: "d4.pol7.multiplicity-at-zero.l2",
  node_id: POL7_NODE,
  difficulty: 2,
  concept: "multiplicity-of-a-named-zero",
  generate(rng: Rng) {
    const roots = drawRoots(rng, 3) as [number, number, number];
    const multiplicities = [rng.int(1, 3), rng.int(1, 3), rng.int(1, 3)] as [
      number,
      number,
      number,
    ];
    const asked = rng.int(0, 2);
    const root = roots[asked] as number;
    const multiplicity = multiplicities[asked] as number;
    const written = roots
      .map((r, index) => factorPower(r, multiplicities[index] as number))
      .join("");
    return {
      prompt: `The polynomial $f(x) = ${written}$ has a zero at $x = ${root}$. What is the multiplicity of that zero? Enter one number.`,
      answer: numericAnswer(`${multiplicity}`),
      params: {
        r0: roots[0],
        r1: roots[1],
        r2: roots[2],
        m0: multiplicities[0],
        m1: multiplicities[1],
        m2: multiplicities[2],
        asked,
      },
      hints: [
        "The multiplicity of a zero is how many times its own factor appears in the product, which is the exponent written on that factor. A factor with no exponent written on it appears once.",
        "So find which bracket is zero at the value named, being careful with the sign, and then read the exponent on that bracket rather than on any other. The exponents on the other factors say nothing about this zero.",
      ],
      worked_solution: [
        `The bracket that is zero at $x = ${root}$ is $${factor(root)}$.`,
        `In this product that bracket is written as $${factorPower(root, multiplicity)}$, so it appears ${multiplicity === 1 ? "once" : `$${multiplicity}$ times`}.`,
        `That count is the multiplicity, and being ${multiplicity % 2 === 1 ? "odd" : "even"} it also says the graph ${crossingWord(multiplicity)} the axis there.`,
        `So the multiplicity is $${multiplicity}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.r0 ?? 0}:${params.r1 ?? 0}:${params.r2 ?? 0}:${params.m0 ?? 0}:${params.m1 ?? 0}:${params.m2 ?? 0}:${params.asked ?? 0}`,
};

/**
 * L2b, the greatest number of turning points the graph can have.
 *
 * The bound is one less than the degree, and the reason this is not a recall question is that
 * the degree is not written anywhere: it is the sum of the exponents on the factors, so a
 * learner who counts the brackets instead of adding their exponents gets a smaller number,
 * and one who forgets to subtract gets the degree itself. Both of those are the answer to a
 * question that was not asked, which is why the prompt says "greatest" rather than "how
 * many": the actual count can be lower, and only the ceiling is decided by the degree.
 */
export const d4_pol7_turning_points_l2: ItemTemplate = {
  template_id: "d4.pol7.turning-points-max.l2",
  node_id: POL7_NODE,
  difficulty: 2,
  concept: "turning-point-bound-from-degree",
  generate(rng: Rng) {
    const roots = drawRoots(rng, 2) as [number, number];
    const first = rng.int(2, 4);
    const second = rng.int(1, 3);
    const degree = first + second;
    const outer = rng.pick([-3, -2, 2, 3]);
    const written = `${outer === -1 ? "-" : outer}${factorPower(roots[0], first)}${factorPower(roots[1], second)}`;
    return {
      prompt: `At most how many turning points can the graph of $f(x) = ${written}$ have? Enter one number.`,
      answer: numericAnswer(`${degree - 1}`),
      params: { r0: roots[0], r1: roots[1], first, second, degree, outer },
      hints: [
        "A polynomial graph can change direction at most one time fewer than its degree, so the degree is the number to get hold of first and the count of brackets is not it.",
        "The degree of a product is the sum of the degrees of its factors, and a factor carrying an exponent contributes its own degree that many times over. Once the degree is in hand, take one away from it.",
      ],
      worked_solution: [
        `The exponents on the factors are $${first}$ and $${second}$, and the degree of the product is their sum: $${first} + ${second} = ${degree}$.`,
        `The constant $${outer}$ in front changes no exponent, so it does not affect the degree.`,
        `A polynomial graph turns at most one time fewer than its degree.`,
        `So the graph has at most $${degree - 1}$ turning points.`,
      ],
    };
  },
  varietyKey: (params) => `${params.first ?? 0}:${params.second ?? 0}:${params.outer ?? 0}`,
};

/**
 * L3a, the real zeros of a polynomial that arrives EXPANDED.
 *
 * Every draw is $ax^{3} + bx^{2} + cx$, which is $x$ times a quadratic that splits over the
 * integers, so the zeros are the origin plus the quadratic's two roots. Taking the common
 * factor out first is the step the shape exists for: a learner who reaches for the quadratic
 * formula on a cubic has nowhere to put the third root, and one who divides the whole line by
 * $x$ loses it silently, which is the commonest way a root disappears.
 *
 * The roster is a `solution_set` rather than a factored key, so the origin can be in it: see
 * the file docblock on the monomial-times-bracket limit.
 */
export const d4_pol7_zeros_from_expanded_l3: ItemTemplate = {
  template_id: "d4.pol7.zeros-from-expanded.l3",
  node_id: POL7_NODE,
  difficulty: 3,
  concept: "factor-out-then-find-every-zero",
  generate(rng: Rng) {
    // The quadratic is `(x - p)(x - q)`, so `b = -(p + q)` and `c = p*q`.
    let roots = drawRoots(rng, 2) as [number, number];
    if (isAdvertisedSolution(0, ...roots)) {
      roots = [roots[0], roots[1] + 1];
    }
    const [p, q] = roots;
    const b = -(p + q);
    const c = p * q;
    // `b` is zero whenever the two roots are negatives of one another, and that pair is wanted:
    // it is the one draw where the quadratic left behind is a difference of two squares, which
    // is the shape a learner is most likely to reach for the formula on. `termSum` drops the
    // empty term rather than printing `+ 0x^{2}`, so the pair costs nothing to keep.
    const written = termSum("x^{3}", signedTerm(b, "x^{2}"), signedTerm(c, "x"));
    return {
      prompt: `Give every real zero of $f(x) = ${written}$. List the numbers only, separated by commas.`,
      answer: solutionSetAnswer(solutionKey(0, p, q)),
      params: { p, q, b, c },
      hints: [
        "Nothing can be read off this while it is written as a sum, so it has to be factored first. Every term carries at least one factor of the variable, so start by taking that out in front.",
        "What is left inside the bracket is a quadratic, and it splits into two brackets of its own. Then set each of the three factors to zero in turn, and keep the one the common factor gave you: dividing it away rather than solving it is how a zero goes missing.",
      ],
      worked_solution: [
        `Every term carries a factor of $x$, so take it out: $${written} = x\\left(${termSum("x^{2}", signedTerm(b, "x"), signedTerm(c, ""))}\\right)$.`,
        // The two numbers named are the bracket CONSTANTS, which is what the splitting move
        // searches for, and not the roots. They are the negatives of the roots, so quoting the
        // roots here would give a correct product and the wrong sum.
        `The quadratic inside splits into $${factor(p)}${factor(q)}$, because $${-p}$ and $${-q}$ multiply to $${c}$ and add to $${b}$.`,
        `Set each factor to zero: the factor of $x$ gives $x = 0$, and the two brackets give $x = ${p}$ and $x = ${q}$.`,
        `So the real zeros are $${rosterTex(0, p, q)}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.p ?? 0}:${params.q ?? 0}`,
};

/**
 * L3b, the polynomial built from a described graph.
 *
 * The reading run backwards, and it is the shape that shows whether the learner holds the
 * correspondence or only one direction of it. Three things have to be turned into notation at
 * once: a zero becomes a bracket with the OPPOSITE sign, the way the graph behaves at that
 * zero becomes an exponent, and the leading coefficient becomes the constant out front. The
 * description names one zero the graph turns back off, so exactly one exponent is even and a
 * learner who writes every factor once produces a polynomial of the wrong degree.
 *
 * No zero is placed at the origin, because a key of `x(x - r)` is refused by the checker: see
 * the file docblock.
 */
export const d4_pol7_build_from_graph_l3: ItemTemplate = {
  template_id: "d4.pol7.build-from-graph.l3",
  node_id: POL7_NODE,
  difficulty: 3,
  concept: "build-a-polynomial-from-its-graph",
  generate(rng: Rng) {
    const roots = drawRoots(rng, 3) as [number, number, number];
    const touched = rng.int(0, 2);
    const lead = rng.pick([-3, -2, 2, 3]);
    const factors = roots.map((root, index) =>
      factorPower(root, index === touched ? 2 : 1),
    );
    const keyFactors = roots.map((root, index) =>
      factorPowerKey(root, index === touched ? 2 : 1),
    );
    const touchedRoot = roots[touched] as number;
    const crossed = roots.filter((_, index) => index !== touched);
    return {
      prompt: `A polynomial has leading coefficient $${lead}$ and exactly three real zeros, at $x = ${roots[0]}$, $x = ${roots[1]}$ and $x = ${roots[2]}$. Its graph turns back off the axis at $x = ${touchedRoot}$ and passes straight through the other two. Write the polynomial of least degree that does this, in factored form, using ^ for a repeated factor.`,
      answer: factoredAnswer(`${lead}${keyFactors.join("")}`, ["x"]),
      params: {
        r0: roots[0],
        r1: roots[1],
        r2: roots[2],
        touched,
        lead,
      },
      hints: [
        "Each zero becomes a bracket that is zero at that value, which means the bracket carries the opposite sign to the zero itself. The leading coefficient becomes a constant multiplying all of them.",
        "The behavior at a zero fixes its exponent: passing straight through needs an odd number of copies of that factor and turning back off needs an even number. Least degree means taking the smallest count of each kind that works.",
      ],
      worked_solution: [
        `Each zero contributes a bracket with the opposite sign: $${roots.map((r) => factor(r)).join("")}$.`,
        `The graph turns back off the axis at $x = ${touchedRoot}$, so that factor needs an even number of copies, and the smallest even number is two.`,
        `It passes straight through at $x = ${crossed[0]}$ and $x = ${crossed[1]}$, so one copy of each of those is enough.`,
        `Putting the leading coefficient in front gives $${lead}${factors.join("")}$, typed as ${lead}${keyFactors.join("")}.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.r0 ?? 0}:${params.r1 ?? 0}:${params.r2 ?? 0}:${params.touched ?? 0}:${params.lead ?? 0}`,
};

/** POL.7's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const POL7_TEMPLATES: readonly ItemTemplate[] = [
  d4_pol7_zeros_from_factored_l1,
  d4_pol7_multiplicity_at_zero_l2,
  d4_pol7_turning_points_l2,
  d4_pol7_zeros_from_expanded_l3,
  d4_pol7_build_from_graph_l3,
];
