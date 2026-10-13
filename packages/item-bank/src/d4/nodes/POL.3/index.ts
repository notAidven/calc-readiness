import { type ItemTemplate, type Rng, solutionSetAnswer } from "../../../template";
import { isAdvertisedSolution, signedTerm, solutionKey } from "../_shared";

/**
 * POL.3 practice templates: solve a quadratic by factoring and by the square-root property.
 * Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  a bare square, where the whole question is whether both signs survive;
 *  - L2a a shifted square, where the root is taken and then undone by a shift;
 *  - L2b a trinomial already gathered at zero, solved by factoring;
 *  - L3a an area stated in words, so the gathering has to be done before anything else;
 *  - L3b an equation with the variable on both sides, where dividing through loses a root.
 *
 * ## Answer path
 *
 * Every shape answers as a `solution_set`, because "solve" asks which values satisfy the
 * equation and the roster of them is a set. The category has been cleared since checker
 * version 2, and a learner who writes a lone root bare is graded correct against a
 * one-element key, so the set shape costs nothing.
 *
 * ## The two rosters no key may be
 *
 * `SOLUTION_SET_PLACEHOLDER` reads "Every solution: 13 or {-1, 4}", and R30's leak check
 * GRADES both strings against every served solution-set item rather than string-matching
 * them. So no key here may be `{13}` or `{-1, 4}`, and `isAdvertisedSolution` is applied at
 * the draw rather than hoped for: the natural ranges of three of these shapes reach the
 * second roster.
 *
 * ## Why the hints carry no digits
 *
 * `hint_leaks_answer` matches the answer key as a standalone value, and these keys are short
 * rosters of small integers whose braces are stripped before the comparison. A hint naming a
 * small number would leak on exactly the draws whose root is that number.
 */

export const POL3_NODE = "POL.3";

/** Nudge a root pair off the advertised roster, keeping both roots whole. */
function unadvertised(low: number, high: number): readonly [number, number] {
  return isAdvertisedSolution(low, high) ? [low, high + 1] : [low, high];
}

/**
 * L1, a bare square. The square-root property and nothing else, so the only way to be wrong
 * is to report one solution where there are two.
 */
export const d4_pol3_square_root_l1: ItemTemplate = {
  template_id: "d4.pol3.square-root.l1",
  node_id: POL3_NODE,
  difficulty: 1,
  concept: "square-root-property",
  generate(rng: Rng) {
    const side = rng.int(4, 15);
    return {
      prompt: `A square court is ordered to cover exactly $${side * side}$ square paces, so its side $x$ satisfies $x^{2} = ${side * side}$. Solve the equation and give every solution.`,
      answer: solutionSetAnswer(solutionKey(-side, side)),
      params: { side },
      hints: [
        "Undoing a square means taking a square root of both sides, and the equation is being asked for every value that satisfies it.",
        "A negative multiplied by itself is positive, so the positive root is not the only value whose square lands on this number.",
      ],
      worked_solution: [
        `Taking the square root of both sides undoes the square on the left.`,
        `The positive root is $${side}$, because $${side} \\times ${side} = ${side * side}$.`,
        `The negative root is $-${side}$, because $(-${side}) \\times (-${side}) = ${side * side}$ as well.`,
        `So the solution set is $\\{-${side}, ${side}\\}$, and only the positive one could measure a court.`,
      ],
    };
  },
  varietyKey: (params) => `${params.side ?? 0}`,
};

/**
 * L2a, a shifted square. The root is taken first and the shift is undone afterwards, which
 * is the order a learner reverses.
 */
export const d4_pol3_shifted_square_l2: ItemTemplate = {
  template_id: "d4.pol3.shifted-square.l2",
  node_id: POL3_NODE,
  difficulty: 2,
  concept: "shifted-square-root",
  generate(rng: Rng) {
    const shift = rng.int(2, 9);
    const root = rng.int(2, 8);
    const [low, high] = unadvertised(shift - root, shift + root);
    return {
      prompt: `Solve for $x$: $(x - ${shift})^{2} = ${root * root}$. Give every solution.`,
      answer: solutionSetAnswer(solutionKey(low, high)),
      params: { shift, root, low, high },
      hints: [
        "The bracket is what is squared, so taking a square root tells you what the BRACKET equals rather than what the variable equals.",
        "Both signs survive the root, so there are two statements about the bracket, and the shift is undone on each of them separately.",
      ],
      worked_solution: [
        `Rooting both sides gives $x - ${shift} = ${high - shift}$ or $x - ${shift} = ${low - shift}$.`,
        `Adding $${shift}$ to the first gives $x = ${high}$.`,
        `Adding $${shift}$ to the second gives $x = ${low}$.`,
        `So the solution set is $\\{${low}, ${high}\\}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.shift ?? 0}:${params.root ?? 0}`,
};

/**
 * L2b, a trinomial already gathered at zero. One root is negative on every draw, so the sign
 * reading in the split is live.
 */
export const d4_pol3_factor_l2: ItemTemplate = {
  template_id: "d4.pol3.factor.l2",
  node_id: POL3_NODE,
  difficulty: 2,
  concept: "solve-by-factoring",
  generate(rng: Rng) {
    const positive = rng.int(2, 9);
    // Equal magnitudes would put the roots at $\pm k$, which zeroes the middle coefficient and
    // prints `$x^{2} + 0x - k^{2} = 0$` -- a difference of two squares dressed as a trinomial,
    // asked under a hint that tells the learner to look for two numbers adding to zero. That is
    // POL.2's L2c shape, not this one's, so the magnitude is drawn from the range with the
    // partner removed rather than rerolled.
    const negative = -rng.pick(
      Array.from({ length: 8 }, (_unused, index) => index + 2).filter(
        (value) => value !== positive,
      ),
    );
    const [low, high] = unadvertised(negative, positive);
    const b = -(low + high);
    const c = low * high;
    return {
      prompt: `Solve for $x$: $x^{2} ${signedTerm(b, "x")} ${signedTerm(c, "")} = 0$. Give every solution.`,
      answer: solutionSetAnswer(solutionKey(low, high)),
      params: { low, high, b, c },
      hints: [
        "The equation is already gathered at zero, so the next move is to write the left-hand side as a product of two brackets.",
        "A product is zero exactly when one of its factors is, so each bracket gives a one-step equation of its own, and both of them count.",
      ],
      worked_solution: [
        `The two numbers in the brackets multiply to $${c}$ and add to $${b}$.`,
        `That gives $(x ${signedTerm(-low, "")})(x ${signedTerm(-high, "")}) = 0$.`,
        `A product is zero exactly when a factor is, so $x = ${low}$ or $x = ${high}$.`,
        `Substituting either value back into the original equation returns zero, which is the check.`,
      ],
    };
  },
  varietyKey: (params) => `${params.low ?? 0}:${params.high ?? 0}`,
};

/**
 * L3a, an area stated in words. Nothing can be split until the whole thing is gathered at
 * zero, and the negative root has to be reported even though it cannot be a length.
 */
export const d4_pol3_area_l3: ItemTemplate = {
  template_id: "d4.pol3.area.l3",
  node_id: POL3_NODE,
  difficulty: 3,
  concept: "gather-then-factor",
  generate(rng: Rng) {
    const gap = rng.int(2, 9);
    const root = rng.int(2, 9);
    const [low, high] = unadvertised(-(root + gap), root);
    const area = high * (high + gap);
    return {
      prompt: `A stretch of paving runs $x$ paces along and $x + ${gap}$ paces across, and it covers $${area}$ square paces. Solve the equation this gives and list every solution, not only the one that measures ground.`,
      answer: solutionSetAnswer(solutionKey(low, high)),
      params: { gap, root, low, high, area },
      hints: [
        "The area is a product of the two sides, and a product equal to something other than zero splits into no conditions at all.",
        "Multiply the sides out, move everything onto one side so the other reads zero, and only then look for the two brackets.",
      ],
      worked_solution: [
        `The area gives $x(x + ${gap}) = ${area}$, which multiplies out to $x^{2} + ${gap}x = ${area}$.`,
        `Gathering everything on the left gives $x^{2} + ${gap}x - ${area} = 0$.`,
        `That factors as $(x ${signedTerm(-low, "")})(x ${signedTerm(-high, "")}) = 0$, so $x = ${low}$ or $x = ${high}$.`,
        `Both values solve the equation and only $${high}$ measures a stretch of ground, which is a reading made after the algebra rather than during it.`,
      ],
    };
  },
  varietyKey: (params) => `${params.gap ?? 0}:${params.high ?? 0}`,
};

/**
 * L3b, the variable on both sides with a common factor of `x`.
 *
 * Dividing through by `x` leaves a correct-looking answer, so this shape is where the second
 * root is lost. Every draw has zero as a solution, which is exactly the value the division
 * would discard.
 */
export const d4_pol3_lost_root_l3: ItemTemplate = {
  template_id: "d4.pol3.lost-root.l3",
  node_id: POL3_NODE,
  difficulty: 3,
  concept: "keep-every-root",
  generate(rng: Rng) {
    const a = rng.int(2, 5);
    const k = rng.int(3, 14);
    return {
      prompt: `Solve for $x$: $${a}x^{2} = ${a * k}x$. Give every solution.`,
      answer: solutionSetAnswer(solutionKey(0, k)),
      params: { a, k },
      hints: [
        "Both sides carry the variable, and the tempting first move here throws a solution away rather than finding one.",
        "Gather everything onto one side instead, then take the common factor out. Each factor that can be made zero contributes a solution.",
      ],
      worked_solution: [
        `Gathering on the left gives $${a}x^{2} - ${a * k}x = 0$.`,
        `Both terms share $${a}x$, so taking it out gives $${a}x(x - ${k}) = 0$.`,
        `A product is zero exactly when a factor is, so $x = 0$ or $x = ${k}$.`,
        `Dividing the original equation through by $x$ would have assumed $x$ was not zero and lost the first of those two.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.k ?? 0}`,
};

/** POL.3's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const POL3_TEMPLATES: readonly ItemTemplate[] = [
  d4_pol3_square_root_l1,
  d4_pol3_shifted_square_l2,
  d4_pol3_factor_l2,
  d4_pol3_area_l3,
  d4_pol3_lost_root_l3,
];
