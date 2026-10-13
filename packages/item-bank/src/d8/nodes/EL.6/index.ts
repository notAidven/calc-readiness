import {
  exactSolutionSetAnswer,
  type ItemTemplate,
  numericAnswer,
  precisionAnswer,
  type Rng,
  solutionSetAnswer,
} from "../../../template";
import { latexVarTerm } from "../../../promptFormat";

/**
 * EL.6 practice templates: solving exponential and logarithmic equations. Five shapes across
 * the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  match the bases, so the exponents can be equated and no logarithm is needed;
 *  - L2a a single logarithm, converted to exponential form;
 *  - L2b take the logarithm of both sides when the bases cannot be matched, as a rounded
 *        decimal;
 *  - L3a condense two logarithms, solve, and REJECT the root the domain forbids;
 *  - L3b an equation quadratic in an exponential, whose roots are logarithms.
 *
 * ## Answer path: why this node is gradable at all
 *
 * §10 of `Answer_Equivalence_Spec.md` listed EL.6 under deferred *arbitrary equation
 * equivalence* until 2026-07-30. Read against the checker, that category is reached when a
 * learner submits AN EQUATION. Solving one submits its ROOTS, so every shape here answers in
 * a category that was already cleared: `numeric`, `numeric` with a declared `precision`, or
 * `solution_set`.
 *
 * L3b is the exception, and the reason the checker changed. Its roots are $\ln 2$ and
 * $\ln 3$, and a roster member could only ever parse as a rational, so the answer key was
 * not statable. `exactSolutionSetAnswer` declares `representation: "exact"`, which admits
 * `log`, `ln` and `sqrt` of a constant into a member.
 *
 * Three measured consequences shape the prompts below, none of them assumed:
 *
 *  - **A logarithm needs its parentheses.** `ln(2)` parses; `ln 2` grades `unknown_symbol`,
 *    because a bare token reads as a symbol multiplied by 2. L3b's prompt therefore states
 *    the typing convention, and its own math is written in that shape.
 *  - **`log` is base 10 here and `ln` is base $e$.** Unlike EL.5's identity grading, where
 *    both tokens are interchangeable because the identities hold in every base, these are
 *    different NUMBERS. `{log(2), log(3)}` against L3b's key is rejected `value_mismatch`,
 *    so the prompt names the logarithm it wants.
 *  - **A rounded root is `wrong_representation`, not a near-match.** L3b asks for exact
 *    values and says so; L2b, which genuinely wants a decimal, is a `precisionAnswer`
 *    instead, whose precision is a FLOOR (a 3 dp key accepts `1.861` and `1.8614` and
 *    rejects `1.86`).
 *
 * ## Why the draws are filtered lists rather than rejection loops
 *
 * Every shape draws one entry from a pre-built list, so `generate()` stays a single `pick`
 * and an instance is fixed by one draw. The filters encode what each shape needs to stay
 * the question it claims to be: a power that really is a power of the base, a value clear of
 * a rounding boundary, and an extraneous root that the domain really does forbid.
 */

export const EL6_NODE = "EL.6";

/* --------------------------------------------------------------- L1: matching bases */

/**
 * The (base, exponent) pairs whose power is small enough to be RECOGNIZED as that power.
 * `2^7 = 128` is a number a learner can place on the ladder; `2^12` is one they reach for a
 * calculator over, which turns a rewriting question into an arithmetic one.
 */
const SAME_BASE_POWERS: readonly (readonly [number, number])[] = [
  [2, 3],
  [2, 4],
  [2, 5],
  [2, 6],
  [2, 7],
  [3, 2],
  [3, 3],
  [3, 4],
  [4, 2],
  [4, 3],
  [5, 2],
  [5, 3],
];

/** The shifts the exponent may carry. Both signs, so the solving step is not always a
 * subtraction, and never zero, which would leave nothing to undo. */
const SAME_BASE_SHIFTS: readonly number[] = [-3, -2, -1, 1, 2, 3];

/** (base, exponent, shift) draws where the solution is a positive whole number. */
function buildSameBaseDraws(): readonly (readonly [number, number, number])[] {
  const draws: (readonly [number, number, number])[] = [];
  for (const [base, exponent] of SAME_BASE_POWERS) {
    for (const shift of SAME_BASE_SHIFTS) {
      if (exponent - shift >= 1) {
        draws.push([base, exponent, shift]);
      }
    }
  }
  return draws;
}

const SAME_BASE_DRAWS = buildSameBaseDraws();

/**
 * L1, the one-property shape: if both sides are powers of ONE base, the exponents must be
 * equal, and the equation collapses to a linear one. No logarithm appears, which is the
 * point of asking it first.
 */
export const d8_el6_same_base_l1: ItemTemplate = {
  template_id: "d8.el6.same-base.l1",
  node_id: EL6_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const [base, exponent, shift] = rng.pick(SAME_BASE_DRAWS);
    const power = base ** exponent;
    const solution = exponent - shift;
    const shown = shift > 0 ? `x + ${shift}` : `x - ${Math.abs(shift)}`;
    return {
      prompt: `Solve $${base}^{${shown}} = ${power}$ for $x$. Enter one number.`,
      answer: numericAnswer(String(solution)),
      params: { base, exponent, shift },
      // No hint here contains a digit, so none can collide with the numeric key on the
      // draws where the solution happens to equal the base or the exponent.
      hints: [
        "The right side is written as a whole number, but it is also a power of the base already sitting on the left. Rewrite it that way, so that both sides of the equation are powers of the same base.",
        "Once one base sits on both sides, the two exponents have to be equal, because a growing power hits each value exactly once. Set the exponents equal and solve the linear equation that is left.",
      ],
      worked_solution: [
        `Both sides can be written as powers of $${base}$: the right side is $${power} = ${base}^{${exponent}}$.`,
        `That makes the equation $${base}^{${shown}} = ${base}^{${exponent}}$, with one base on both sides.`,
        `A power of $${base}$ takes each value exactly once, so the exponents must match: $${shown} = ${exponent}$.`,
        `Solving that gives $x = ${solution}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.base ?? 0}:${params.exponent ?? 0}:${params.shift ?? 0}`,
};

/* ------------------------------------------------- L2a: a single logarithm, converted */

/** (base, exponent) pairs for a logarithmic equation, kept inside four figures. */
const LOG_SINGLE_POWERS: readonly (readonly [number, number])[] = [
  [2, 3],
  [2, 4],
  [2, 5],
  [2, 6],
  [3, 2],
  [3, 3],
  [3, 4],
  [4, 2],
  [4, 3],
  [5, 2],
  [5, 3],
  [6, 2],
  [7, 2],
];

/**
 * L2a, the definition of a logarithm used as a tool: $\log_b x = k$ says nothing more than
 * $b^k = x$, and converting is the whole solving step.
 *
 * Half the draws shift the argument, so the conversion is followed by one linear step. That
 * also stops the shape from being answerable by pattern alone, since a shifted draw's answer
 * is not the power itself.
 */
export const d8_el6_log_single_l2: ItemTemplate = {
  template_id: "d8.el6.log-single.l2",
  node_id: EL6_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const [base, exponent] = rng.pick(LOG_SINGLE_POWERS);
    const kind = rng.int(0, 1);
    // Drawn on both branches so the draw sequence does not depend on `kind`, then discarded
    // on the unshifted branch so its variety key cannot vary on a number it never used.
    const drawn = rng.int(1, 9);
    const shift = kind === 1 ? drawn : 0;
    const power = base ** exponent;
    const solution = power - shift;
    const argument = kind === 1 ? `x + ${shift}` : "x";
    return {
      prompt: `Solve $\\log_{${base}}(${argument}) = ${exponent}$ for $x$. Enter one number.`,
      answer: numericAnswer(String(solution)),
      params: { base, exponent, kind, shift },
      // Digit-free for the same reason as the L1 shape above: on a shifted draw the
      // solution can land on the base or on the exponent.
      hints: [
        'A logarithm answers the question "what exponent turns the base into this argument". So the equation is already telling you an exponent, and it can be rewritten with no logarithm in it at all.',
        "Convert to exponential form: the base raised to the number on the right equals the argument. Work out that power, then undo whatever is left around $x$.",
      ],
      worked_solution:
        kind === 1
          ? [
              `The logarithm says which exponent on $${base}$ produces the argument, so the equation converts to exponential form: $${base}^{${exponent}} = ${argument}$.`,
              `The left side is $${base}^{${exponent}} = ${power}$, which gives $${power} = x + ${shift}$.`,
              `Subtracting $${shift}$ from both sides gives $x = ${solution}$.`,
              `Checking, $x + ${shift} = ${power}$ is positive, so the argument is inside the logarithm's domain and the solution stands.`,
            ]
          : [
              `The logarithm says which exponent on $${base}$ produces the argument, so the equation converts to exponential form: $${base}^{${exponent}} = x$.`,
              `Working out the left side gives $x = ${power}$.`,
              `Checking, $${power}$ is positive, so it is inside the logarithm's domain and the solution stands.`,
            ],
    };
  },
  varietyKey: (params) =>
    `${params.base ?? 0}:${params.exponent ?? 0}:${params.kind ?? 0}:${params.shift ?? 0}`,
};

/* ------------------------------------------- L2b: taking the logarithm of both sides */

/** Bases whose powers do not land on the round numbers below, so a logarithm is needed. */
const TAKE_LOG_BASES: readonly number[] = [2, 3, 5, 7];

/** Targets a learner reads at a glance, none of them a power of any base above. */
const TAKE_LOG_TARGETS: readonly number[] = [
  12, 15, 18, 20, 24, 30, 35, 40, 45, 50, 60, 70, 75, 90, 100, 120, 150, 200, 250, 300,
];

/** How far the exact value must sit from a rounding boundary in the third decimal place. */
const ROUNDING_MARGIN = 0.08;

/**
 * The (base, target) draws for the take-the-logarithm shape.
 *
 * Three exclusions, each one protecting the question the shape is asking. An exact power of
 * the base is solvable by matching bases, which is the L1 shape and not this one. A value
 * within {@link ROUNDING_MARGIN} of a boundary in the third decimal place turns the item into
 * an argument about the fourth digit, which is the hazard EL.5's spike recorded for
 * `precisionAnswer`. And a value outside a sensible band is either barely past one or big
 * enough to read as arithmetic practice.
 */
function buildTakeLogDraws(): readonly (readonly [number, number])[] {
  const draws: (readonly [number, number])[] = [];
  for (const base of TAKE_LOG_BASES) {
    for (const target of TAKE_LOG_TARGETS) {
      const value = Math.log(target) / Math.log(base);
      const nearest = Math.round(value);
      if (Math.abs(base ** nearest - target) < 1e-9) {
        continue;
      }
      if (value < 1.5 || value > 6) {
        continue;
      }
      const scaled = value * 1000;
      if (Math.abs(scaled - Math.floor(scaled) - 0.5) < ROUNDING_MARGIN) {
        continue;
      }
      draws.push([base, target]);
    }
  }
  return draws;
}

const TAKE_LOG_DRAWS = buildTakeLogDraws();

/**
 * L2b, the shape that needs a logarithm: the target is not a power of the base, so matching
 * bases is not available and the exponent has to be brought down.
 *
 * No hint here contains a digit, so none can collide with the numeric key on draws where the
 * key happens to be short.
 */
export const d8_el6_take_log_l2: ItemTemplate = {
  template_id: "d8.el6.take-log.l2",
  node_id: EL6_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const [base, target] = rng.pick(TAKE_LOG_DRAWS);
    const value = Math.log(target) / Math.log(base);
    const logTarget = Math.log10(target).toFixed(6);
    const logBase = Math.log10(base).toFixed(6);
    return {
      prompt: `Solve $${base}^{x} = ${target}$ for $x$. Round your answer to three decimal places, and enter one number.`,
      answer: precisionAnswer(value.toFixed(3), {
        mode: "decimal_places",
        value: 3,
        rounding: "half_up",
      }),
      params: { base, target },
      hints: [
        `The right side is not a power of the base, so there is no way to match the two sides and read the exponent off. Something has to be applied to BOTH sides to reach the exponent.`,
        `Take a logarithm of both sides. The power rule then brings the exponent down in front as a multiplier, which leaves a one step equation to divide out.`,
      ],
      worked_solution: [
        `The right side is not a power of $${base}$, so the exponents cannot be matched and a logarithm has to be taken of both sides.`,
        `Taking $\\log$ of each side gives $\\log(${base}^{x}) = \\log ${target}$, and the power rule brings the exponent down: $x \\log ${base} = \\log ${target}$.`,
        `Dividing isolates the exponent: $x = \\dfrac{\\log ${target}}{\\log ${base}}$.`,
        `Reading both logarithms gives $\\dfrac{${logTarget}}{${logBase}} \\approx ${value.toFixed(6)}$, which is $${value.toFixed(3)}$ to three decimal places.`,
      ],
    };
  },
  varietyKey: (params) => `${params.base ?? 0}:${params.target ?? 0}`,
};

/* ------------------------------------------------------- L3a: the extraneous root */

/**
 * The (base, exponent, kept root, rejected root) draws for the extraneous-root shape.
 *
 * The equation is $\log_b x + \log_b(x - c) = k$. Condensing gives $x(x - c) = b^k$, a
 * quadratic whose two roots are `kept` and `-rejected`, with `c = kept - rejected`. The
 * negative one is not a solution of the ORIGINAL equation, because a logarithm of a negative
 * number is undefined, and noticing that is the whole skill.
 *
 * `c` is capped so the equation reads cleanly, and both roots are required distinct from the
 * shift so no draw collapses into a simpler question.
 */
function buildExtraneousDraws(): readonly (readonly [number, number, number, number])[] {
  const draws: (readonly [number, number, number, number])[] = [];
  for (const base of [10, 2, 3]) {
    for (let exponent = 1; exponent <= 6; exponent += 1) {
      const power = base ** exponent;
      if (power > 100) {
        continue;
      }
      for (let rejected = 1; rejected * rejected < power; rejected += 1) {
        if (power % rejected !== 0) {
          continue;
        }
        const kept = power / rejected;
        const shift = kept - rejected;
        if (shift < 1 || shift > 15) {
          continue;
        }
        draws.push([base, exponent, kept, rejected]);
      }
    }
  }
  return draws;
}

/**
 * Exported because the LESSON's check re-asks this shape and must not re-derive it.
 *
 * `cfu.el6.solve-extraneous` in `apps/web/src/lessons/cfuVariants.ts` asks the same equation for
 * one number rather than for a set, so it needs these draws and none of this item's wording. A
 * second enumeration over there would be a second set of bounds to keep in step with these.
 */
export const EL6_EXTRANEOUS_DRAWS = buildExtraneousDraws();

/**
 * L3a, the domain lesson. Condensing turns the equation into a quadratic with two roots, and
 * one of them makes a logarithm's argument negative, so the solution SET has a single member.
 *
 * The answer is a `solution_set` rather than a `numeric` on purpose: the skill is deciding
 * how many solutions survive, and a numeric field would ask for one number before the learner
 * had decided that. A learner who keeps both roots is graded `extra_solution`, which names
 * their mistake instead of calling the whole attempt wrong.
 */
export const d8_el6_extraneous_l3: ItemTemplate = {
  template_id: "d8.el6.extraneous.l3",
  node_id: EL6_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const [base, exponent, kept, rejected] = rng.pick(EL6_EXTRANEOUS_DRAWS);
    const power = base ** exponent;
    const shift = kept - rejected;
    // Base 10 is written bare, as every textbook writes the common logarithm.
    const log = base === 10 ? "\\log" : `\\log_{${base}}`;
    return {
      // The format example is drawn from OUTSIDE this shape's parameter space on purpose.
      // `kept` reaches 4, so the old example `{4} or {4, 9}` was the complete key on two of
      // the fifteen draws: a learner who copied it was marked correct without doing the
      // mathematics, and one who did the mathematics distrusted a right answer that looked
      // like boilerplate. `d8el6.test.ts` enumerates the whole space and holds the property.
      prompt: `Solve $${log} x + ${log}(x - ${shift}) = ${exponent}$. Give the solution set, listing every solution that works in braces, such as {7} or {7, 12}.`,
      answer: solutionSetAnswer(`{${kept}}`),
      params: { base, exponent, kept, rejected },
      hints: [
        `Two logarithms of the same base are added, so the product rule read backwards gathers them into one logarithm before anything can be solved.`,
        `With a single logarithm on the left, convert to exponential form. That leaves a quadratic equation, which you can expand and factor.`,
        `A quadratic gives two roots, but the ORIGINAL equation only accepts a number that leaves every logarithm's argument positive. Test both roots in the original equation before you write the set.`,
      ],
      worked_solution: [
        `Both terms are logarithms of base $${base === 10 ? "10" : base}$ added together, so the product rule gathers them: $${log}\\left(x(x - ${shift})\\right) = ${exponent}$.`,
        `Converting to exponential form gives $x(x - ${shift}) = ${base}^{${exponent}} = ${power}$.`,
        `Expanding and collecting gives the quadratic $x^2 - ${latexVarTerm(shift)} - ${power} = 0$, which factors as $(x - ${kept})(x + ${rejected}) = 0$.`,
        `So the quadratic's roots are $x = ${kept}$ and $x = -${rejected}$.`,
        `Testing $x = -${rejected}$ in the original equation asks for $${log}(-${rejected})$, and a logarithm of a negative number is undefined, so that root is extraneous and is thrown out.`,
        `Testing $x = ${kept}$ leaves both arguments positive, $${kept}$ and $${rejected}$, so the solution set is $\\{${kept}\\}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.base ?? 0}:${params.exponent ?? 0}:${params.kept ?? 0}:${params.rejected ?? 0}`,
};

/* ----------------------------------------------- L3b: quadratic in an exponential */

/**
 * The root pairs for the quadratic-in-an-exponential shape. Both members are at least 2, so
 * neither root is $\ln 1 = 0$, which would hide the substitution behind a zero.
 */
function buildExpQuadraticDraws(): readonly (readonly [number, number])[] {
  const draws: (readonly [number, number])[] = [];
  for (let first = 2; first <= 7; first += 1) {
    for (let second = first + 1; second <= 8; second += 1) {
      draws.push([first, second]);
    }
  }
  return draws;
}

/**
 * Exported so a sweep can enumerate the WHOLE space rather than sample it. The space is 21
 * pairs, small enough that "no draw leaks its own key into its prompt" is provable by
 * enumeration instead of by a sampling rate.
 */
export const EXP_QUADRATIC_DRAWS = buildExpQuadraticDraws();

/**
 * L3b, the shape this node's checker work exists for. Substituting $u = e^x$ turns the
 * equation into an ordinary quadratic, and undoing the substitution turns each root into a
 * logarithm, so the answer is a roster of exact logarithms.
 *
 * The prompt states three things the grader is strict about, all measured rather than
 * assumed: the values must be exact rather than rounded, the natural logarithm is the one
 * being asked for, and a logarithm has to be typed with parentheses.
 */
export const d8_el6_exp_quadratic_l3: ItemTemplate = {
  template_id: "d8.el6.exp-quadratic.l3",
  node_id: EL6_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const [first, second] = rng.pick(EXP_QUADRATIC_DRAWS);
    const sum = first + second;
    const product = first * second;
    return {
      // Both example values sit outside the draw range (2 to 8), so the example can never be
      // the key. It was `{ln(5), ln(7)}`, which is exactly the key on the (5, 7) draw, one of
      // the twenty-one. `d8el6.test.ts` enumerates the whole space and holds the property.
      prompt: `Solve $e^{2x} - ${sum}e^{x} + ${product} = 0$. Give the solution set with both values exact, using the natural logarithm and typing it with parentheses, as in {ln(11), ln(13)}.`,
      answer: exactSolutionSetAnswer(`{ln(${first}), ln(${second})}`),
      params: { first, second },
      hints: [
        `Notice that $e^{2x}$ is the square of $e^{x}$. That makes the equation a quadratic in disguise, in the single quantity $e^{x}$.`,
        `Let $u$ stand for $e^{x}$ and rewrite the equation in $u$. It factors, so solve it for $u$ first.`,
        `Each value of $u$ is a value of $e^{x}$, not of $x$. Undo the exponential on each one to finish, and remember an exponential is always positive, so check whether both values of $u$ survive.`,
      ],
      worked_solution: [
        `Since $e^{2x} = (e^{x})^2$, the equation is a quadratic in $e^{x}$. Let $u = e^{x}$, giving $u^2 - ${sum}u + ${product} = 0$.`,
        `That factors as $(u - ${first})(u - ${second}) = 0$, so $u = ${first}$ or $u = ${second}$.`,
        `Both values are positive, and an exponential is always positive, so neither one is thrown out here.`,
        `Undoing the substitution puts back $e^{x} = ${first}$ and $e^{x} = ${second}$.`,
        `Taking the natural logarithm of each gives $x = \\ln(${first})$ and $x = \\ln(${second})$, so the solution set is $\\{\\ln(${first}), \\ln(${second})\\}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.first ?? 0}:${params.second ?? 0}`,
};

/** EL.6's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const EL6_TEMPLATES: readonly ItemTemplate[] = [
  d8_el6_same_base_l1,
  d8_el6_log_single_l2,
  d8_el6_take_log_l2,
  d8_el6_extraneous_l3,
  d8_el6_exp_quadratic_l3,
];
