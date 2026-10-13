import {
  type ItemTemplate,
  multipleChoiceAnswer,
  numericAnswer,
  pointAnswer,
  type Rng,
} from "../../../template";

/**
 * LF.4 practice templates: solve a 2x2 linear system three ways (graphing, substitution,
 * elimination). Five problem shapes across the locked 1xL1 / 2xL2 / 2xL3 practice mix, with
 * two genuinely different shapes at each of L2 and L3 so a five-slot set that round-robins
 * a cell never serves the same problem twice.
 *
 * ## Every system is built BACKWARDS from its solution
 *
 * A 2x2 system with randomly drawn coefficients almost always intersects at a fraction, and
 * a fractional lattice point is not a harder version of this skill, it is a different one
 * (LIN.1 arithmetic) wearing this skill's clothes. So each shape draws the intersection
 * `(x0, y0)` FIRST, draws integer coefficients second, and computes the two constants from
 * them. The answer is then a clean lattice point by construction, and each template's
 * degeneracy guard (`a + cm != 0`, `a1 + a2 != 0`, `b2 - a2 p != 0`, ...) is exactly the
 * condition that the drawn coefficients still describe two DISTINCT crossing lines.
 *
 * ## Answer types (chosen per shape, not per house style)
 *
 *  - **A solved system** is a `pointAnswer`, the ordered pair, typed `(x, y)`. Three of the
 *    five shapes answer this way, and the prompt states the format.
 *  - **The classify shape** is a `multipleChoiceAnswer` over the three words a system can
 *    come back with. That comparator is an exact string match, so the prompt spells the
 *    three legal phrases out in lower case rather than leaving the learner to guess a
 *    synonym.
 *  - **The isolate-and-substitute shape** is a `numericAnswer` for ONE coordinate, and it
 *    asks for the coordinate of the variable that was isolated, which is the one that only
 *    falls out of the back-substitution. Asking for the other one would let a learner stop
 *    half way.
 *
 * No shape asks the learner to type a whole equation or a whole system: `equation_form` is
 * a narrower checker category than a two-equation answer needs, and general two-sided
 * equation equivalence is not a cleared path.
 *
 * ## Seeding
 *
 * Shapes are seeded from the systems chapter of the open-textbook algebra ladder (a system
 * given with one equation already solved for a variable, then a system needing one
 * isolation, then standard-form pairs needing one or both equations scaled, plus the
 * classify exercise that names the parallel and coincident cases). Extracted PDF text
 * flattens braced systems into a single run, so every shape here was re-derived by hand and
 * every key recomputed by real arithmetic rather than transcribed, and the numbers are
 * re-drawn per instance rather than following the source's ladder.
 *
 * Every template declares a `varietyKey` over its answer, which the D7 pool ENFORCES (see
 * `d7/practice.ts`), so a cell never freezes two near-twin instances.
 */

export const LF4_NODE = "LF.4";

/** The shared task line for the shapes whose answer is the pair itself. */
const PAIR_TASK = " Give the solution as an ordered pair, typed like `(7, -8)`.";

/* -------------------------------------------------------------------------- */
/* LaTeX helpers                                                               */
/* -------------------------------------------------------------------------- */

/** A variable term with its coefficient folded in: `3x`, `-x`, `x`. */
function vTerm(coeff: number, variable: string): string {
  if (coeff === 1) {
    return variable;
  }
  if (coeff === -1) {
    return `-${variable}`;
  }
  return `${coeff}${variable}`;
}

/** A following signed variable term: `+ 3y`, `- y`. */
function tailTerm(coeff: number, variable: string): string {
  const magnitude = Math.abs(coeff);
  const body = magnitude === 1 ? variable : `${magnitude}${variable}`;
  return `${coeff < 0 ? "-" : "+"} ${body}`;
}

/** A standard-form equation `ax + by = c`. */
function stdTex(a: number, b: number, c: number): string {
  return `${vTerm(a, "x")} ${tailTerm(b, "y")} = ${c}`;
}

/** A leading coefficient on a parenthesized expression: `3(...)`, `(...)`, `-(...)`. */
function scaled(coeff: number, inner: string): string {
  if (coeff === 1) {
    return `(${inner})`;
  }
  if (coeff === -1) {
    return `-(${inner})`;
  }
  return `${coeff}(${inner})`;
}

/** A following signed coefficient on a parenthesized expression: `+ 3(...)`, `- (...)`. */
function tailScaled(coeff: number, inner: string): string {
  const magnitude = Math.abs(coeff);
  const body = magnitude === 1 ? `(${inner})` : `${magnitude}(${inner})`;
  return `${coeff < 0 ? "-" : "+"} ${body}`;
}

/** `constant + coeff * variable`, tidy at the edges: `7 - 2y`, `-2y`, `7`. */
function linRhs(constant: number, coeff: number, variable: string): string {
  if (coeff === 0) {
    return `${constant}`;
  }
  const magnitude = Math.abs(coeff);
  const body = magnitude === 1 ? variable : `${magnitude}${variable}`;
  if (constant === 0) {
    return coeff < 0 ? `-${body}` : body;
  }
  return `${constant} ${coeff < 0 ? "-" : "+"} ${body}`;
}

/** The same right-hand side with the variable replaced by a value: `7 - 2(3)`. */
function linAt(constant: number, coeff: number, value: number): string {
  if (coeff === 0) {
    return `${constant}`;
  }
  const magnitude = Math.abs(coeff);
  const body = magnitude === 1 ? `(${value})` : `${magnitude}(${value})`;
  if (constant === 0) {
    return coeff < 0 ? `-${body}` : body;
  }
  return `${constant} ${coeff < 0 ? "-" : "+"} ${body}`;
}

/** A slope-intercept right-hand side `mx + b`, with a zero intercept dropped. */
function slopeRhs(m: number, b: number): string {
  const head = vTerm(m, "x");
  return b === 0 ? head : `${head} ${b < 0 ? "-" : "+"} ${Math.abs(b)}`;
}

/** The same right-hand side with `x` replaced by a value: `2(-3) + 5`. */
function slopeAt(m: number, b: number, x: number): string {
  const magnitude = Math.abs(m);
  const body = magnitude === 1 ? `(${x})` : `${magnitude}(${x})`;
  const head = m < 0 ? `-${body}` : body;
  return b === 0 ? head : `${head} ${b < 0 ? "-" : "+"} ${Math.abs(b)}`;
}

/** A nonzero magnitude in `[1, max]`, signed by a fresh coin flip. */
function nonZero(rng: Rng, max: number): number {
  const magnitude = rng.int(1, max);
  return rng.int(0, 1) === 1 ? -magnitude : magnitude;
}

/** Drop the steps a draw did not need (a `cond ? "" : step` entry). */
function steps(list: readonly string[]): string[] {
  return list.filter((step) => step.length > 0);
}

/* -------------------------------------------------------------------------- */
/* L1: substitute an already-isolated variable                                 */
/* -------------------------------------------------------------------------- */

/**
 * L1, the cheapest substitution there is: one equation ALREADY reads `y = mx + b`, so the
 * only decisions are where the expression goes and what to do with the parentheses. The
 * intersection is drawn first and `b` and `d` are computed from it, and the guard
 * `a + cm != 0` is what keeps the substituted equation from collapsing to a contradiction
 * (parallel lines) instead of a single `x`.
 */
export const d7_lf4_substitution_l1: ItemTemplate = {
  template_id: "d7.lf4.substitution.l1",
  node_id: LF4_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    let x0 = 0;
    let y0 = 0;
    let m = 0;
    let a = 0;
    let c = 0;
    do {
      x0 = rng.int(-5, 5);
      y0 = rng.int(-5, 5);
      m = rng.pick([-3, -2, -1, 1, 2, 3]);
      a = rng.pick([-3, -2, -1, 1, 2, 3]);
      c = rng.pick([-3, -2, -1, 1, 2, 3]);
    } while (a + c * m === 0 || (x0 === 0 && y0 === 0));
    const b = y0 - m * x0;
    const d = a * x0 + c * y0;
    const k = a + c * m;
    const rhs = d - c * b;
    const slope = slopeRhs(m, b);
    return {
      prompt: `Solve the system $y = ${slope}$ and $${stdTex(a, c, d)}$.${PAIR_TASK}`,
      answer: pointAnswer(`(${x0}, ${y0})`),
      params: { x0, y0, m, b, a, c, d },
      hints: [
        "The first equation already tells you what $y$ equals, so you can put that expression into the second equation wherever $y$ appears.",
        "After the swap the second equation holds only $x$. Distribute, gather the $x$ terms on one side and the plain numbers on the other, then divide if the coefficient of $x$ is not already $1$.",
        "Once you have $x$, put it back into the first equation to get $y$, and write the pair with the $x$-value first.",
      ],
      worked_solution: steps([
        `The first equation is already solved for $y$, so replace $y$ in the second: $${vTerm(a, "x")} ${tailScaled(c, slope)} = ${d}$.`,
        `Distribute and collect the $x$ terms: $${vTerm(k, "x")} = ${rhs}$.`,
        k === 1 ? "" : `Divide both sides by $${k}$: $x = ${x0}$.`,
        `Back-substitute into the first equation: $y = ${slopeAt(m, b, x0)}$, so $y = ${y0}$.`,
        `The solution is $(${x0},\\, ${y0})$.`,
      ]),
    };
  },
  varietyKey: (params) => `${params.x0}:${params.y0}`,
};

/* -------------------------------------------------------------------------- */
/* L2a: elimination with coefficients that are already opposites               */
/* -------------------------------------------------------------------------- */

/**
 * L2a, elimination with no scaling: one variable's two coefficients are drawn as exact
 * opposites, so adding the equations removes it immediately. `elim` picks WHICH variable
 * that is, so a learner cannot settle into always cancelling `y`, and the guard on the
 * other pair's sum keeps both variables from vanishing at once.
 */
export const d7_lf4_elimination_l2: ItemTemplate = {
  template_id: "d7.lf4.elimination.l2",
  node_id: LF4_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    let elim = 0;
    let x0 = 0;
    let y0 = 0;
    let a1 = 0;
    let b1 = 0;
    let a2 = 0;
    let b2 = 0;
    do {
      elim = rng.int(0, 1);
      x0 = rng.int(-5, 5);
      y0 = rng.int(-5, 5);
      a1 = nonZero(rng, 5);
      b1 = nonZero(rng, 5);
      if (elim === 0) {
        a2 = nonZero(rng, 5);
        b2 = -b1;
      } else {
        a2 = -a1;
        b2 = nonZero(rng, 5);
      }
    } while ((x0 === 0 && y0 === 0) || (elim === 0 ? a1 + a2 === 0 : b1 + b2 === 0));
    const c1 = a1 * x0 + b1 * y0;
    const c2 = a2 * x0 + b2 * y0;
    const survivor = elim === 0 ? "x" : "y";
    const coeff = elim === 0 ? a1 + a2 : b1 + b2;
    const total = c1 + c2;
    const value = elim === 0 ? x0 : y0;
    return {
      prompt: `Solve the system $${stdTex(a1, b1, c1)}$ and $${stdTex(a2, b2, c2)}$.${PAIR_TASK}`,
      answer: pointAnswer(`(${x0}, ${y0})`),
      params: { elim, x0, y0, a1, b1, a2, b2, c1, c2 },
      hints: [
        "Line the two equations up and compare the coefficients of $x$, then the coefficients of $y$. One of those two pairs already adds to zero.",
        "Add the equations term by term. The pair that adds to zero disappears, which leaves a single equation in one variable.",
        "Solve that equation, then put the value back into either original equation to get the other coordinate.",
      ],
      worked_solution: steps([
        `The $${elim === 0 ? "y" : "x"}$ coefficients are $${elim === 0 ? b1 : a1}$ and $${elim === 0 ? b2 : a2}$, which are opposites, so adding the equations removes that variable.`,
        `Add the two equations: $${vTerm(coeff, survivor)} = ${total}$.`,
        coeff === 1 ? "" : `Divide both sides by $${coeff}$: $${survivor} = ${value}$.`,
        elim === 0
          ? `Back-substitute $x = ${x0}$ into the first equation: $${scaled(a1, `${x0}`)} ${tailTerm(b1, "y")} = ${c1}$, so $y = ${y0}$.`
          : `Back-substitute $y = ${y0}$ into the first equation: $${vTerm(a1, "x")} ${tailScaled(b1, `${y0}`)} = ${c1}$, so $x = ${x0}$.`,
        `The solution is $(${x0},\\, ${y0})$.`,
      ]),
    };
  },
  varietyKey: (params) => `${params.x0}:${params.y0}`,
};

/* -------------------------------------------------------------------------- */
/* L2b: classify one / none / infinitely many                                  */
/* -------------------------------------------------------------------------- */

/**
 * L2b, the graphing question asked without a graph: does this system cross once, never, or
 * everywhere? The three branches are built so the degenerate cases are exact multiples,
 * `kind = 1` matching the first equation's left side but missing its right side by `k*e`,
 * and `kind = 2` matching both. `k` is never `1`, so the multiple is always something the
 * learner has to notice rather than read.
 */
export const d7_lf4_classify_l2: ItemTemplate = {
  template_id: "d7.lf4.classify.l2",
  node_id: LF4_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const kind = rng.int(0, 2);
    let a1 = 0;
    let b1 = 0;
    let x0 = 0;
    let y0 = 0;
    let k = 0;
    let e = 0;
    let a2 = 0;
    let b2 = 0;
    do {
      a1 = nonZero(rng, 3);
      b1 = nonZero(rng, 3);
      x0 = rng.int(-3, 3);
      y0 = rng.int(-3, 3);
      k = rng.pick([-3, -2, 2, 3]);
      e = rng.pick([-4, -3, -2, 2, 3, 4]);
      a2 = nonZero(rng, 4);
      b2 = nonZero(rng, 4);
    } while (a1 * b2 - a2 * b1 === 0);
    const c1 = a1 * x0 + b1 * y0;
    if (kind !== 0) {
      a2 = k * a1;
      b2 = k * b1;
    }
    const c2 = kind === 0 ? a2 * x0 + b2 * y0 : kind === 1 ? k * (c1 + e) : k * c1;
    const det = a1 * b2 - a2 * b1;
    const answerKey =
      kind === 0 ? "one solution" : kind === 1 ? "no solution" : "infinitely many";
    const verdict =
      kind === 0
        ? "one solution"
        : kind === 1
          ? "no solution"
          : "infinitely many solutions";
    return {
      prompt: `Decide how many solutions the system $${stdTex(a1, b1, c1)}$ and $${stdTex(a2, b2, c2)}$ has. Answer with exactly one of \`one solution\`, \`no solution\`, or \`infinitely many\`, in lower case.`,
      answer: multipleChoiceAnswer(answerKey),
      params: { kind, a1, b1, c1, a2, b2, c2, k, e, x0, y0 },
      hints: [
        "Put both equations in the same form and read each line's slope, or compare the two pairs of coefficients directly.",
        "Different slopes tilt the lines toward each other, so they cross at exactly one point. If the slopes match instead, scale one equation until its left side matches the other's: agreeing right sides mean the two draw the same line and every point on it works, and disagreeing ones mean nothing can satisfy both.",
      ],
      worked_solution: steps([
        `Cross-multiply the coefficients: $(${a1})(${b2}) - (${a2})(${b1}) = ${det}$.`,
        kind === 0
          ? "That is not zero, so the two lines have different slopes and cross at exactly one point."
          : "That is zero, so the two lines have the same slope, which makes them either parallel or identical.",
        kind === 0
          ? ""
          : `Multiply the first equation by $${k}$: $${stdTex(k * a1, k * b1, k * c1)}$.`,
        kind === 1
          ? `The left side now matches the second equation, but the right side there is $${c2}$, not $${k * c1}$, so no pair of numbers can satisfy both.`
          : kind === 2
            ? "That is exactly the second equation, so both equations describe the same line and every point on it works."
            : "",
        `The system has ${verdict}.`,
      ]),
    };
  },
  varietyKey: (params) =>
    `${params.kind}:${params.a1}:${params.b1}:${params.a2}:${params.b2}`,
};

/* -------------------------------------------------------------------------- */
/* L3a: elimination that needs BOTH equations scaled                           */
/* -------------------------------------------------------------------------- */

/**
 * Coprime `|x|` coefficient magnitudes, so the two multipliers are the other equation's
 * magnitude and BOTH are at least `2`. That is deliberate: a shared factor would let one
 * multiplier come out as `1`, and a "multiply this equation by 1" row is a step the draw
 * did not need.
 */
const COPRIME_PAIRS: readonly (readonly [number, number])[] = [
  [2, 3],
  [3, 2],
  [2, 5],
  [5, 2],
  [3, 4],
  [4, 3],
  [3, 5],
  [5, 3],
  [4, 5],
  [5, 4],
];

/**
 * L3a, the flagship elimination: nothing cancels as written, so BOTH equations have to be
 * scaled. The `y` coefficients are additionally forced apart (`b1 != b2` and `b1 != -b2`),
 * because a learner who spots an already-opposite pair there would never meet the scaling
 * this shape exists to drill.
 */
export const d7_lf4_elimination_l3: ItemTemplate = {
  template_id: "d7.lf4.elimination.l3",
  node_id: LF4_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    let x0 = 0;
    let y0 = 0;
    let a1 = 0;
    let a2 = 0;
    let b1 = 0;
    let b2 = 0;
    let m1 = 0;
    let m2 = 0;
    let coeff = 0;
    do {
      x0 = rng.int(-5, 5);
      y0 = rng.int(-5, 5);
      const [p, q] = rng.pick(COPRIME_PAIRS);
      a1 = rng.int(0, 1) === 1 ? -p : p;
      a2 = rng.int(0, 1) === 1 ? -q : q;
      b1 = nonZero(rng, 5);
      b2 = nonZero(rng, 5);
      m1 = Math.abs(a2);
      m2 = a2 > 0 ? -a1 : a1;
      coeff = m1 * b1 + m2 * b2;
    } while (coeff === 0 || b1 === b2 || b1 === -b2 || (x0 === 0 && y0 === 0));
    const c1 = a1 * x0 + b1 * y0;
    const c2 = a2 * x0 + b2 * y0;
    const total = m1 * c1 + m2 * c2;
    return {
      prompt: `Solve the system $${stdTex(a1, b1, c1)}$ and $${stdTex(a2, b2, c2)}$.${PAIR_TASK}`,
      answer: pointAnswer(`(${x0}, ${y0})`),
      params: { x0, y0, a1, b1, a2, b2, c1, c2, m1, m2 },
      hints: [
        "Neither variable's coefficients are opposites yet, so one or both equations have to be scaled before anything can cancel.",
        "Pick the variable you want gone and look at its two coefficients. Multiplying each equation by the other one's coefficient makes the two match in size, and a sign flip on one of them makes them opposites.",
        "Add the scaled equations, solve the single-variable equation that survives, then back-substitute into either original equation.",
      ],
      worked_solution: steps([
        `The $x$ coefficients are $${a1}$ and $${a2}$, neither equal nor opposite, so both equations have to be scaled.`,
        `Multiply the first equation by $${m1}$: $${stdTex(m1 * a1, m1 * b1, m1 * c1)}$.`,
        `Multiply the second equation by $${m2}$: $${stdTex(m2 * a2, m2 * b2, m2 * c2)}$.`,
        `The $x$ terms are now opposites, so adding gives $${vTerm(coeff, "y")} = ${total}$.`,
        coeff === 1 ? "" : `Divide both sides by $${coeff}$: $y = ${y0}$.`,
        `Back-substitute $y = ${y0}$ into the first equation: $${vTerm(a1, "x")} ${tailScaled(b1, `${y0}`)} = ${c1}$, so $x = ${x0}$.`,
        `The solution is $(${x0},\\, ${y0})$.`,
      ]),
    };
  },
  varietyKey: (params) => `${params.x0}:${params.y0}`,
};

/* -------------------------------------------------------------------------- */
/* L3b: isolate a coefficient-1 variable, substitute, and report it            */
/* -------------------------------------------------------------------------- */

/**
 * L3b, substitution with the isolation still to do: exactly one variable in the first
 * equation carries a coefficient of `1`, and `iso` decides whether that is `x` or `y`. The
 * question then asks for THAT variable's value, which is the one the substitution finds
 * LAST, so a learner who stops at the first coordinate has not answered. The coefficient
 * multiplying the substituted expression is forced past `1` in magnitude, so the
 * distribution is always real work.
 */
export const d7_lf4_isolate_l3: ItemTemplate = {
  template_id: "d7.lf4.isolate.l3",
  node_id: LF4_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    let iso = 0;
    let x0 = 0;
    let y0 = 0;
    let p = 0;
    let a2 = 0;
    let b2 = 0;
    let coeff = 0;
    do {
      iso = rng.int(0, 1);
      x0 = rng.int(-6, 6);
      y0 = rng.int(-6, 6);
      p = nonZero(rng, 5);
      a2 = nonZero(rng, 5);
      b2 = nonZero(rng, 6);
      coeff = iso === 0 ? b2 - a2 * p : a2 - b2 * p;
    } while (coeff === 0 || Math.abs(iso === 0 ? a2 : b2) < 2 || (x0 === 0 && y0 === 0));
    const c1 = iso === 0 ? x0 + p * y0 : p * x0 + y0;
    const c2 = a2 * x0 + b2 * y0;
    const isoVar = iso === 0 ? "x" : "y";
    const otherVar = iso === 0 ? "y" : "x";
    const isoValue = iso === 0 ? x0 : y0;
    const otherValue = iso === 0 ? y0 : x0;
    const firstTex = iso === 0 ? stdTex(1, p, c1) : stdTex(p, 1, c1);
    const isolated = linRhs(c1, -p, otherVar);
    const substituted =
      iso === 0
        ? `${scaled(a2, isolated)} ${tailTerm(b2, "y")} = ${c2}`
        : `${vTerm(a2, "x")} ${tailScaled(b2, isolated)} = ${c2}`;
    const total = c2 - (iso === 0 ? a2 : b2) * c1;
    return {
      prompt: `Solve the system $${firstTex}$ and $${stdTex(a2, b2, c2)}$, then give the value of $${isoVar}$ in the solution. Enter one number.`,
      answer: numericAnswer(`${isoValue}`),
      params: { iso, p, a2, b2, c1, c2, x0, y0 },
      hints: [
        "In the first equation one variable has a coefficient of just one, which makes it the cheapest thing in the system to isolate. Start there.",
        "Put that expression into the other equation in place of the variable it stands for, and distribute the coefficient across both of its terms.",
        "Solving the substituted equation hands back the other coordinate first. Feed that value into the isolated expression to reach the one the question asks for.",
      ],
      worked_solution: steps([
        `In the first equation $${isoVar}$ has coefficient $1$, so isolate it: $${isoVar} = ${isolated}$.`,
        `Substitute that into the second equation: $${substituted}$.`,
        `Distribute and collect the $${otherVar}$ terms: $${vTerm(coeff, otherVar)} = ${total}$.`,
        coeff === 1
          ? ""
          : `Divide both sides by $${coeff}$: $${otherVar} = ${otherValue}$.`,
        `Back-substitute into $${isoVar} = ${isolated}$: $${isoVar} = ${linAt(c1, -p, otherValue)}$.`,
        `The pair is $(${x0},\\, ${y0})$, so the requested value is $${isoVar} = ${isoValue}$.`,
      ]),
    };
  },
  varietyKey: (params) => `${params.iso}:${params.x0}:${params.y0}`,
};

/** Every LF.4 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const LF4_TEMPLATES: readonly ItemTemplate[] = [
  d7_lf4_substitution_l1,
  d7_lf4_elimination_l2,
  d7_lf4_classify_l2,
  d7_lf4_elimination_l3,
  d7_lf4_isolate_l3,
];
