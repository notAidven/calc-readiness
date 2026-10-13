import {
  type ItemTemplate,
  numericAnswer,
  type Rng,
  solutionSetAnswer,
} from "../../../template";
import { inLowestTerms, isAdvertisedSolution, signedTerm, solutionKey } from "../_shared";

/**
 * POL.4 practice templates: completing the square, and the quadratic formula. Five shapes
 * across the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  the constant that completes a square, which is the halving on its own;
 *  - L2a the discriminant, read off an equation with signs in it;
 *  - L2b the number a completed square leaves on the right, which is where the "both sides"
 *        step is dropped;
 *  - L3a solve by completing the square, end to end;
 *  - L3b solve with the quadratic formula, on an equation whose roots are not both whole.
 *
 * ## Answer path
 *
 * Three shapes answer `numeric` and two answer as a `solution_set`, and the split is the
 * prompt's. "What number completes the square" asks for a quantity; "solve" asks which values
 * satisfy the equation, and the roster of them is a set.
 *
 * **L3b keys a fraction inside the roster on purpose.** A quadratic whose leading coefficient
 * is not one has a rational root more often than a whole one, and a pool that avoided them
 * would teach that the formula only ever produces integers. The bar in the key is what routes
 * that cohort to the `solution_set_fraction` line and its fraction key, so the learner is
 * told how to type a bar before the attempt rather than after it is marked wrong (R30).
 *
 * ## Why the hints carry no digits
 *
 * `hint_leaks_answer` matches the answer key as a standalone value. Three of these keys are
 * small integers, so a hint that named any small number would leak on exactly the draws whose
 * answer is that number.
 */

export const POL4_NODE = "POL.4";

/** Nudge a root pair off the roster the answer field advertises. */
function unadvertised(low: number, high: number): readonly [number, number] {
  return isAdvertisedSolution(low, high) ? [low, high + 1] : [low, high];
}

/**
 * L1, the constant that completes a square. Half the draws carry a NEGATIVE middle term,
 * which is the case where the constant is misremembered as negative.
 */
export const d4_pol4_complete_l1: ItemTemplate = {
  template_id: "d4.pol4.complete.l1",
  node_id: POL4_NODE,
  difficulty: 1,
  concept: "complete-the-square-constant",
  generate(rng: Rng) {
    const half = rng.int(2, 11);
    const negative = rng.int(0, 1) === 1;
    const middle = negative ? -2 * half : 2 * half;
    return {
      prompt: `What number has to be added to $x^{2} ${signedTerm(middle, "x")}$ to make it a perfect square? Enter one number.`,
      answer: numericAnswer(`${half * half}`),
      params: { half, middle },
      hints: [
        "The two strips along the edges of the square are the same width, and together they supply the middle term, so each is half of it.",
        "The corner they leave open is that width both ways, and squaring removes any sign the middle term had.",
      ],
      worked_solution: [
        `Half of the middle coefficient $${middle}$ is $${middle / 2}$.`,
        `Squaring that gives $(${middle / 2})^{2} = ${half * half}$.`,
        `So $x^{2} ${signedTerm(middle, "x")} + ${half * half}$ is a perfect square, namely $(x ${signedTerm(middle / 2, "")})^{2}$.`,
        `The constant is positive whatever the sign of the middle term, because squaring removes the sign.`,
      ],
    };
  },
  // The sign of the middle term is half the variety here, so it is read with the coalesce
  // BRACKETED: `params.middle ?? 0 < 0` parses as `params.middle ?? (0 < 0)`, which is the
  // draw's own value and never the comparison it was written to make.
  varietyKey: (params) => `${params.half ?? 0}:${(params.middle ?? 0) < 0 ? 1 : 0}`,
};

/**
 * L2a, the discriminant. Every draw carries at least one negative coefficient, because a
 * substitution with no signs in it cannot show the error this shape is about.
 */
export const d4_pol4_discriminant_l2: ItemTemplate = {
  template_id: "d4.pol4.discriminant.l2",
  node_id: POL4_NODE,
  difficulty: 2,
  concept: "discriminant",
  generate(rng: Rng) {
    const a = rng.int(1, 4);
    const b = -rng.int(2, 11);
    const c = rng.pick([-6, -4, -3, -2, 2, 3, 4, 5, 6]);
    return {
      prompt: `Find the discriminant $b^{2} - 4ac$ of $${a === 1 ? "" : a}x^{2} ${signedTerm(b, "x")} ${signedTerm(c, "")} = 0$. Enter one number.`,
      answer: numericAnswer(`${b * b - 4 * a * c}`),
      params: { a, b, c },
      hints: [
        "Read the three coefficients off the equation with the signs they carry, rather than with the signs they are printed with.",
        "Squaring the middle coefficient makes it positive whatever its sign, and the last term is subtracted, so a negative constant term turns that subtraction into an addition.",
      ],
      worked_solution: [
        `The coefficients are $a = ${a}$, $b = ${b}$ and $c = ${c}$, each with its own sign.`,
        `Squaring the middle one gives $(${b})^{2} = ${b * b}$.`,
        `The other part is $4ac = 4 \\times ${a} \\times ${c} = ${4 * a * c}$.`,
        `Subtracting gives $${b * b} - (${4 * a * c}) = ${b * b - 4 * a * c}$, so the equation has ${b * b - 4 * a * c > 0 ? "two real solutions" : b * b - 4 * a * c === 0 ? "one real solution" : "no real solution"}.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.b ?? 0}:${params.c ?? 0}`,
};

/**
 * L2b, the number a completed square leaves on the right.
 *
 * This is the step that is dropped: the constant that completes the square has to be added to
 * BOTH sides, and the original constant moves across as well, so two separate things reach the
 * right-hand side.
 */
export const d4_pol4_right_side_l2: ItemTemplate = {
  template_id: "d4.pol4.right-side.l2",
  node_id: POL4_NODE,
  difficulty: 2,
  concept: "complete-the-square-both-sides",
  generate(rng: Rng) {
    const half = rng.int(2, 9);
    const constant = -rng.int(2, 15);
    const right = half * half - constant;
    return {
      prompt: `Completing the square turns $x^{2} + ${2 * half}x ${signedTerm(constant, "")} = 0$ into $(x + ${half})^{2} = k$. What is $k$? Enter one number.`,
      answer: numericAnswer(`${right}`),
      params: { half, constant, right },
      hints: [
        "Two separate things reach the right-hand side: the original constant, moved across, and the constant that completes the square, added to both sides.",
        "Adding the completing constant to one side only would change the equation, so whatever goes onto the left goes onto the right as well.",
      ],
      worked_solution: [
        `Moving the constant across gives $x^{2} + ${2 * half}x = ${-constant}$.`,
        `Half the middle coefficient is $${half}$, and its square is $${half * half}$.`,
        `Adding $${half * half}$ to both sides makes the left a perfect square and takes the right to $${-constant} + ${half * half}$.`,
        `So $k = ${right}$, and the equation reads $(x + ${half})^{2} = ${right}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.half ?? 0}:${params.constant ?? 0}`,
};

/**
 * L3a, solving by completing the square end to end. The right-hand side is always a perfect
 * square, so the roots stay whole and the shape measures the method rather than the surd.
 */
export const d4_pol4_complete_solve_l3: ItemTemplate = {
  template_id: "d4.pol4.complete-solve.l3",
  node_id: POL4_NODE,
  difficulty: 3,
  concept: "solve-by-completing-the-square",
  generate(rng: Rng) {
    const half = rng.int(2, 9);
    // `root === half` makes the constant zero, and the shape then stops being the one the
    // template teaches: the prompt prints `$x^{2} + 2hx + 0 = 0$`, the first worked step
    // ("Moving the constant across") moves nothing, and the equation factors on sight as
    // $x(x + 2h) = 0$, so completing the square is a method the learner is asked to use on the
    // one draw that does not need it. Drawn from the range with `half` removed.
    const root = rng.pick(
      Array.from({ length: 8 }, (_unused, index) => index + 2).filter(
        (value) => value !== half,
      ),
    );
    const [low, high] = unadvertised(-half - root, -half + root);
    const constant = half * half - root * root;
    return {
      prompt: `Solve $x^{2} + ${2 * half}x ${signedTerm(constant, "")} = 0$ by completing the square, and give every solution.`,
      answer: solutionSetAnswer(solutionKey(low, high)),
      params: { half, root, low, high, constant },
      hints: [
        "Move the constant across first, then add the number that completes the square to both sides so the left becomes a bracket squared.",
        "Rooting both sides keeps both signs, so there are two statements about the bracket, and the constant inside it is undone on each of them.",
      ],
      worked_solution: [
        `Moving the constant across gives $x^{2} + ${2 * half}x = ${-constant}$.`,
        `Adding $${half * half}$ to both sides gives $(x + ${half})^{2} = ${root * root}$.`,
        `Rooting both sides keeps both signs: $x + ${half} = ${root}$ or $x + ${half} = -${root}$.`,
        `Subtracting $${half}$ from each gives $x = ${-half + root}$ or $x = ${-half - root}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.half ?? 0}:${params.root ?? 0}`,
};

/**
 * L3b, the quadratic formula on an equation whose leading coefficient is not one.
 *
 * One root is a genuine fraction on every draw, which is the case the formula exists for and
 * the case a factoring-only diet never produces.
 */
export const d4_pol4_formula_l3: ItemTemplate = {
  template_id: "d4.pol4.formula.l3",
  node_id: POL4_NODE,
  difficulty: 3,
  concept: "quadratic-formula",
  generate(rng: Rng) {
    // `(a x - p)(x + q) = 0`, so the roots are `p/a` and `-q`, and `p/a` must be in lowest
    // terms. `p % a !== 0` is NOT that test, only the test that the root is not a whole
    // number: at `a = 4` it admits `p = 2` and `p = 6`, and the key is then the literal
    // string `{-q, 2/4}`, which is what the reveal prints and what the checker compares
    // against. Two of the 175 served items carried an unreduced root under the old filter.
    const a = rng.pick([2, 3, 4, 5]);
    const p = rng.pick([1, 2, 3, 4, 5, 6, 7].filter((value) => inLowestTerms(value, a)));
    const q = rng.int(1, 9);
    const b = a * q - p;
    const c = -p * q;
    return {
      prompt: `Solve $${a}x^{2} ${signedTerm(b, "x")} ${signedTerm(c, "")} = 0$ with the quadratic formula, and give every solution.`,
      answer: solutionSetAnswer(`{-${q}, ${p}/${a}}`),
      params: { a, p, q, b, c },
      hints: [
        "Read the three coefficients off with their signs before substituting anything, and check the equation is already gathered at zero.",
        "The quantity under the root decides how many solutions there are, and the whole numerator is divided by the bottom, so one solution here does not come out whole.",
      ],
      worked_solution: [
        `The coefficients are $a = ${a}$, $b = ${b}$ and $c = ${c}$.`,
        // Bracketed where `b` is negative, because `$-3^{2}$` is $-3$ by the precedence rule
        // this very line is teaching: `b = a * q - p` goes negative on about one draw in
        // eleven, and the step then printed an equation false as written.
        `The discriminant is $${b < 0 ? `(${b})` : b}^{2} - 4 \\times ${a} \\times (${c}) = ${b * b - 4 * a * c}$, whose square root is $${Math.sqrt(b * b - 4 * a * c)}$.`,
        `So $x = \\dfrac{${-b} \\pm ${Math.sqrt(b * b - 4 * a * c)}}{${2 * a}}$.`,
        `The plus branch gives $x = \\dfrac{${p}}{${a}}$ and the minus branch gives $x = -${q}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.p ?? 0}:${params.q ?? 0}`,
};

/** POL.4's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const POL4_TEMPLATES: readonly ItemTemplate[] = [
  d4_pol4_complete_l1,
  d4_pol4_discriminant_l2,
  d4_pol4_right_side_l2,
  d4_pol4_complete_solve_l3,
  d4_pol4_formula_l3,
];
