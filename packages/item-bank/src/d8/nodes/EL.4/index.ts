import {
  type ItemTemplate,
  numericAnswer,
  pointAnswer,
  type Rng,
  setBuilderAnswer,
} from "../../../template";

/**
 * EL.4 practice templates: graph a logarithm and state its domain. Every shape here comes off
 * the same single fact, that a logarithm accepts only a positive argument, and asks for a
 * different consequence of it. Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  the vertical asymptote of a shifted logarithm, as a value;
 *  - L2a the same domain written out in set-builder notation, with a base that changes nothing;
 *  - L2b the x-intercept as an ordered pair, which turns on `\log 1 = 0` rather than on the
 *        domain, and whose argument is reflected on half the draws;
 *  - L3a the domain of a reflected argument carrying a coefficient, so the allowed side flips
 *        AND the boundary has to be divided out;
 *  - L3b the output at a given input, which is the only shape that evaluates the logarithm.
 *
 * ## Seeding
 *
 * Shapes are seeded from Lippman & Rasmussen, *Precalculus: An Investigation of Functions*
 * 2nd ed. (opentextbookstore.com), section 4.5 "Graphs of Logarithmic Functions". Its exercise
 * set 1 to 8 is literally "for each function, find the domain and the vertical asymptote" over
 * shifted and reflected linear arguments, some carrying a coefficient and some an added
 * constant outside the logarithm; its "Graphical Features of the Logarithm" box is where the
 * horizontal intercept at `(1, 0)` and the asymptote at `x = 0` come from; and its worked
 * Example 1 is `f(x) = log(5 - 2x)`, which is exactly the reflected-with-a-coefficient case
 * L3a takes. Evaluation at an exact power of the base is section 4.3's.
 *
 * The seed sets the SHAPES and nothing else. Every number here is re-derived: the extracted PDF
 * text flattens the notation past the point of being readable (exercise 1 comes out as
 * "f x x ( ) = − log 5 ( )", which does not say whether the argument is `x - 5` or `5 - x`, and
 * the worked inequality collapses into "2 5 2 5"), so each shape was worked by hand and then
 * diversified: the shift runs either side of zero, both log tokens appear, the intercept shape
 * reflects half its draws, and L3a admits negative boundaries the seed never shows.
 *
 * ## Answer paths
 *
 * Three graders, each on the one form its answer can take. An asymptote and an output are
 * values, so they are `numericAnswer`, and the prompt asks for the value in as many words: a
 * numeric answer cannot be typed as a log call (measured against the real v2 checker,
 * `log10(1000)` against a key of `3` grades `invalid_input/unsupported_syntax`) and it cannot
 * be typed as `x = 3` either. A domain is `setBuilderAnswer`, because writing the notation IS
 * the skill, and the prompt gives the syntax by example. An intercept is `pointAnswer`.
 *
 * Both set-builder keys are a SINGLE inequality, which is what the comparator can grade: it
 * conjoins single-interval conditions only, so a two-sided or excluded-point domain would come
 * back `wrong_notation` even as the key. Neither shape here needs one.
 *
 * ## Why the numeric shapes' hints carry no digits at all
 *
 * `hint_leaks_answer` matches the answer key as a standalone value, and the keys of L1 and L3b
 * are small integers. A hint reading "compare it with $1$" would therefore leak on exactly the
 * draws whose answer is $1$ and pass on every other, which is worse than a constant leak
 * because whether the sweep catches it depends on the seed. So those two templates' hints are
 * written digit-free. The set-builder and point shapes have string keys no hint can collide
 * with, and their hints are still param-free.
 *
 * Every template declares a `varietyKey` over the numbers that FIX the instance rather than
 * over the answer, because several of these shapes reach the same small boundary by different
 * routes and a cell that froze two of those would be asking one question twice. The pool
 * freezer gives up after 200 misses, so each parameter space below is wide enough for one pool
 * item plus a full six retry variants: L1 has 32 keys, L2a 64, L2b 46, L3a 72, L3b 792.
 */

export const EL4_NODE = "EL.4";

/**
 * The log token a `tok` flag selects, so a shape is not always read in one of them.
 *
 * The token is display only. `log` and `ln` are interchangeable to the checker (measured: an
 * `ln` key accepts a `log` answer), so nothing here may hinge on which one a learner reads, and
 * nothing does: every answer below is a value, a set or a pair rather than a logarithm.
 */
function logToken(tok: number): string {
  return tok === 1 ? "\\ln" : "\\log";
}

/** `x - 3` or `x + 4`: the argument of a plain horizontal shift. */
function shiftArg(h: number): string {
  return h < 0 ? `x + ${-h}` : `x - ${h}`;
}

/** `7 - x` or `-x - 4`: the same boundary with the variable reflected. */
function flipArg(h: number): string {
  return h < 0 ? `-x - ${-h}` : `${h} - x`;
}

/** `6 - 3x` or `-2x - 6`: a reflected argument carrying a coefficient. */
function coefficientArg(k: number, m: number): string {
  const kx = k === 1 ? "x" : `${k}x`;
  const c = k * m;
  return c > 0 ? `${c} - ${kx}` : `-${kx} - ${-c}`;
}

/** A signed shift, spoken as the operator that precedes its magnitude: `+ 3`, `- 3`. */
function signedTail(value: number): string {
  return `${value < 0 ? "-" : "+"} ${Math.abs(value)}`;
}

/** `$b^{1} = b$, ...` up to `b^k`: the ladder climbed to find an exponent. */
function powerLadder(b: number, k: number): string {
  return Array.from({ length: k }, (_unused, index) => index + 1)
    .map((exponent) => `$${b}^{${exponent}} = ${b ** exponent}$`)
    .join(", ");
}

/** The shifts a boundary is drawn from: either side of zero, never zero itself. */
const SHIFTS: readonly number[] = [-8, -7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8];

/**
 * L1, the vertical asymptote of a shifted logarithm. The tier is the whole of the node's
 * central fact and nothing else: require the argument to be positive, and the value the
 * inequality turns on is where the asymptote stands.
 *
 * The prompt asks for the VALUE rather than for the line, because the answer is numeric and a
 * learner who wrote `x = 3` into a numeric field would be failed for answering correctly.
 */
export const d8_el4_asymptote_l1: ItemTemplate = {
  template_id: "d8.el4.asymptote.l1",
  node_id: EL4_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const h = rng.pick(SHIFTS);
    const tok = rng.int(0, 1);
    const token = logToken(tok);
    const arg = shiftArg(h);
    return {
      prompt: `The graph of $y = ${token}(${arg})$ has one vertical asymptote. Give the $x$-value it stands at. Enter one number.`,
      answer: numericAnswer(`${h}`),
      params: { h, tok },
      hints: [
        "A logarithm accepts only an argument above zero, so begin with the expression inside the logarithm and require it to be positive.",
        "Solve that requirement for $x$. The vertical asymptote stands on the boundary the solved inequality turns on, so the value you solve for is the value being asked for.",
      ],
      worked_solution: [
        `A logarithm accepts only a positive argument, so this function needs $${arg} > 0$.`,
        `Solving that for $x$ gives $x > ${h}$.`,
        `The domain therefore begins at the boundary $x = ${h}$, and the vertical asymptote stands on that same boundary.`,
        `So the asymptote's $x$-value is $${h}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.h ?? 0}:${params.tok ?? 0}`,
};

/**
 * L2a, the same domain written down. Two things make this a step up on L1: the answer has to be
 * expressed in set-builder notation, and a base is written under the logarithm which has no
 * bearing at all on the domain. A learner who thinks the base changes what is allowed has
 * somewhere to go wrong here and nowhere on L1.
 */
export const d8_el4_domain_l2: ItemTemplate = {
  template_id: "d8.el4.domain.l2",
  node_id: EL4_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const h = rng.pick(SHIFTS);
    const b = rng.pick([2, 3, 4, 5]);
    const arg = shiftArg(h);
    return {
      prompt: `Give the domain of $y = \\log_{${b}}(${arg})$ in set-builder form. Type it like this example: \`{x | x > 12}\`.`,
      answer: setBuilderAnswer(`{x | x > ${h}}`),
      params: { h, b },
      hints: [
        "A logarithm hands back an exponent, and no exponent takes a positive base to zero or below, so the expression inside the logarithm has to be strictly greater than zero.",
        "Solve that inequality for $x$. The base written under the logarithm takes no part in it, because every logarithm accepts exactly the positive arguments.",
        "Write the result with the set-builder braces: the variable, then a vertical bar, then the inequality the solving produced.",
      ],
      worked_solution: [
        `The argument of a logarithm has to be positive, so $${arg} > 0$.`,
        `The base $${b}$ plays no part in that condition: every logarithm, whatever its base, accepts exactly the positive arguments.`,
        `Solving for $x$ gives $x > ${h}$.`,
        `In set-builder notation the domain is $\\{x \\mid x > ${h}\\}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.h ?? 0}:${params.b ?? 0}`,
};

/**
 * L2b, the x-intercept as an ordered pair. This is the one shape that does NOT turn on the
 * domain: it turns on `\log 1 = 0`, so the argument is set to one rather than above zero, and a
 * learner who has only learned "make the inside positive" cannot reach it by that route.
 *
 * Half the draws reflect the argument, which moves the intercept to the other side of the
 * boundary. Both hints and both worked solutions are written to cover the reflected draw and
 * the plain one identically, so which branch arrives says nothing about the answer.
 */
export const d8_el4_x_intercept_l2: ItemTemplate = {
  template_id: "d8.el4.x-intercept.l2",
  node_id: EL4_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const flip = rng.int(0, 1);
    // A reflected argument is drawn from the positive shifts only, so it reads `7 - x` rather
    // than the same statement spelled `-x - 7`.
    const h = flip === 1 ? rng.int(2, 8) : rng.pick(SHIFTS);
    const tok = rng.int(0, 1);
    const token = logToken(tok);
    const arg = flip === 1 ? flipArg(h) : shiftArg(h);
    const xi = flip === 1 ? h - 1 : h + 1;
    return {
      prompt: `Give the $x$-intercept of $y = ${token}(${arg})$ as an ordered pair, written like this example: \`(12, 0)\`.`,
      answer: pointAnswer(`(${xi}, 0)`),
      params: { flip, h, tok, xi },
      hints: [
        "An $x$-intercept is a point whose output is zero, so set the whole right-hand side equal to zero rather than looking at the domain.",
        "A logarithm is zero exactly when its argument is one, because any base raised to the zero power gives one. So set the expression inside the logarithm equal to one and solve for $x$.",
        "Report it as an ordered pair, and remember which coordinate an $x$-intercept has to have zero in.",
      ],
      worked_solution: [
        `An $x$-intercept is a point whose output is zero, so solve $${token}(${arg}) = 0$.`,
        `A logarithm is zero exactly when its argument is $1$, because any base raised to the zero power gives $1$.`,
        `So the argument has to equal one: $${arg} = 1$, which gives $x = ${xi}$.`,
        `The $x$-intercept is the point $(${xi},\\, 0)$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.flip ?? 0}:${params.h ?? 0}:${params.tok ?? 0}`,
};

/**
 * L3a, the domain when the argument is reflected AND scaled. Two steps rather than one: the
 * minus sign in front of the variable puts the allowed inputs on the other side of the
 * boundary, and the coefficient has to be divided out before the boundary is a number.
 *
 * The coefficient is `1` on a third of the draws, which is why the dividing step is authored
 * conditionally: written unconditionally it would print "divide both sides by 1" and claim work
 * the params never asked for.
 */
export const d8_el4_domain_shift_l3: ItemTemplate = {
  template_id: "d8.el4.domain-shift.l3",
  node_id: EL4_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const k = rng.pick([1, 2, 3]);
    const m = rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
    const tok = rng.int(0, 1);
    const token = logToken(tok);
    const c = k * m;
    const arg = coefficientArg(k, m);
    const kx = k === 1 ? "x" : `${k}x`;
    return {
      prompt: `Give the domain of $y = ${token}(${arg})$ in set-builder form. Type it like this example: \`{x | x > 12}\`.`,
      answer: setBuilderAnswer(`{x | x < ${m}}`),
      params: { k, m, c, tok },
      hints: [
        "The argument still has to be greater than zero, so write the expression inside the logarithm and put it above zero before anything else.",
        "Now isolate $x$. The variable carries a negative coefficient here, so add that term to both sides rather than dividing by a negative, which leaves $x$ on the right of the inequality. Swapping an inequality's two sides turns its symbol around, so read the finished line back with $x$ on the left before you write anything down.",
        "Write the result in the set-builder braces: the variable, a vertical bar, then the inequality you finished with.",
      ],
      worked_solution: [
        `The argument of a logarithm has to be positive, so $${arg} > 0$.`,
        `Add $${kx}$ to both sides, which leaves $${c} > ${kx}$.`,
        ...(k === 1
          ? []
          : [`Divide both sides by the positive number $${k}$, which leaves $${m} > x$.`]),
        `Read with $x$ on the left, that is $x < ${m}$, so the domain is $\\{x \\mid x < ${m}\\}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.k ?? 0}:${params.m ?? 0}:${params.tok ?? 0}`,
};

/**
 * L3b, the output at a given input. The only shape that evaluates the logarithm, and it is L3
 * because three things have to happen in order: substitute into the argument, read the exponent
 * off the base's powers, and then combine the constant sitting outside the logarithm.
 *
 * The outside constant is never zero, so the third hint holds on every draw. The input is
 * always chosen so the argument lands exactly on a power of the base, because anything else
 * would need a calculator and a stated rounding, which is a different shape.
 */
export const d8_el4_evaluate_point_l3: ItemTemplate = {
  template_id: "d8.el4.evaluate-point.l3",
  node_id: EL4_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    // Base and exponent are drawn together, so the argument stays a number a learner can climb
    // to rather than one that needs a calculator.
    const pair = rng.pick([
      [2, 2],
      [2, 3],
      [2, 4],
      [2, 5],
      [3, 2],
      [3, 3],
      [3, 4],
      [5, 2],
      [5, 3],
      [10, 2],
      [10, 3],
    ]);
    const b = pair[0] as number;
    const k = pair[1] as number;
    const h = rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
    const d = rng.pick([-3, -2, -1, 1, 2, 3]);
    const power = b ** k;
    const x0 = h + power;
    const arg = shiftArg(h);
    const total = k + d;
    return {
      prompt: `For $y = \\log_{${b}}(${arg}) ${signedTail(d)}$, what is $y$ when $x = ${x0}$? Enter one number.`,
      answer: numericAnswer(`${total}`),
      params: { b, k, h, d, x0, power },
      hints: [
        "Substitute the given input into the expression inside the logarithm first, and simplify it to a single number.",
        "Then ask which exponent turns the base into that number, because handing back an exponent is all a logarithm does.",
        "The constant outside the logarithm is combined after the logarithm has been evaluated, never before.",
      ],
      worked_solution: [
        `Substitute the input into the argument: $${x0} ${signedTail(-h)} = ${power}$.`,
        `So the value wanted is $\\log_{${b}} ${power} ${signedTail(d)}$.`,
        `Climbing the powers of $${b}$: ${powerLadder(b, k)}, so $\\log_{${b}} ${power} = ${k}$.`,
        `Now combine the constant outside the logarithm: $${k} ${signedTail(d)} = ${total}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.b ?? 0}:${params.k ?? 0}:${params.h ?? 0}:${params.d ?? 0}`,
};

/** EL.4's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const EL4_TEMPLATES: readonly ItemTemplate[] = [
  d8_el4_asymptote_l1,
  d8_el4_domain_l2,
  d8_el4_x_intercept_l2,
  d8_el4_domain_shift_l3,
  d8_el4_evaluate_point_l3,
];
