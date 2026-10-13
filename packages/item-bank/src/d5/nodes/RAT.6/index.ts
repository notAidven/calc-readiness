import { type ItemTemplate, type Rng, solutionSetAnswer } from "../../../template";

/**
 * RAT.6 practice templates for "Verdigris Hold, the Crafting Guild" (solve rational
 * equations at the Proving Cauldron, and reject the roots the craft forbids). Five problem
 * shapes across the locked 1xL1 / 2xL2 / 2xL3 practice mix, with two genuinely different
 * shapes at each of L2 and L3 so a five-slot set reshuffles without repeating a shape.
 *
 * Every answer is a `solution_set`, graded order-insensitively, and a lone root may be
 * typed bare. That answer type is the whole point of the node: multiplying both sides by
 * the common measure is a legal move that can INVENT a root, so the grader has to reject a
 * submission that lists one. Both L3 shapes clear to a quadratic whose factors include a
 * denominator, so one candidate lands exactly on an excluded value; a learner who solves
 * the algebra correctly but skips the check lists it and is told `extra_solution`.
 *
 * The excluded values come from the ORIGINAL denominators, exactly the list RAT.1 taught
 * the learner to read off a bottom, so every worked solution names that list BEFORE it
 * clears anything, whether or not this instance turns out to have a cursed root.
 *
 * Each template declares a shape-prefixed `varietyKey` over its answer, so one cell (which
 * holds two shapes) never freezes two instances that reduce to the same thing.
 */

export const RAT6_NODE = "RAT.6";

/**
 * How every prompt names the expected form. A solution set is unusual enough that the
 * learner should not have to guess the punctuation, and the grader already accepts a lone
 * root typed on its own.
 */
const ANSWER_TAIL =
  "List every solution in the solution set, as a set like {-2, 7}. A single solution may be typed on its own.";

/** A variable term in LaTeX: `3x`, or a bare `x` when the coefficient is 1. */
function vt(coeff: number): string {
  return coeff === 1 ? "x" : `${coeff}x`;
}

/** A signed variable term as a trailing operator plus magnitude, e.g. `+ 3x` or `- x`. */
function signedVt(coeff: number): string {
  return coeff < 0 ? `- ${vt(-coeff)}` : `+ ${vt(coeff)}`;
}

/** A whole-number coefficient in front of a bracket, dropped when it is 1. */
function bracketCoeff(coeff: number): string {
  return coeff === 1 ? "" : `${coeff}`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/**
 * L1: one fraction, one measure. `a/(x - p) = b` clears in a single multiplication and
 * leaves a linear equation, so the only new move is reading the forbidden dose off the
 * denominator first. `a = b * r` with `r >= 1` keeps the root a whole number strictly
 * greater than the forbidden dose, so this shape never produces a cursed root.
 */
export const d5_rat6_clear_l1: ItemTemplate = {
  template_id: "d5.rat6.clear.l1",
  node_id: RAT6_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const b = rng.int(2, 7);
    const r = rng.int(1, 9);
    const p = rng.int(1, 9);
    const a = b * r;
    const root = p + r;
    return {
      prompt: `Solve $\\dfrac{${a}}{x - ${p}} = ${b}$. ${ANSWER_TAIL}`,
      answer: solutionSetAnswer(`{${root}}`),
      params: { a, b, p, r, root },
      hints: [
        "Before you touch the algebra, read the excluded value off the denominator: the value of $x$ that would make it zero.",
        "Multiply both sides by that denominator. Clearing denominators leaves an ordinary linear equation.",
        "Solve the linear equation, then check each candidate against the excluded value before you list it.",
      ],
      worked_solution: [
        `The denominator $x - ${p}$ is zero at $x = ${p}$, so $x = ${p}$ is excluded. Note it before anything is cleared.`,
        `Multiply both sides by $x - ${p}$: $${a} = ${b}(x - ${p})$.`,
        `Divide both sides by $${b}$: $x - ${p} = ${r}$.`,
        `Add $${p}$ to both sides: $x = ${root}$.`,
        `Check the candidate against the excluded value: $${root}$ is not $${p}$, so it is valid.`,
        `The solution set is $\\{${root}\\}$.`,
      ],
    };
  },
  varietyKey: (params) => `clear:${params.b}:${params.p}:${params.root}`,
};

/**
 * L2a: the combined craft rate, `1/a + 1/b = 1/t`. Three denominators, only one of which
 * carries the unknown, and the answer is usually a fraction (the grader takes `18/5` and
 * `3.6` alike). The together-time is a positive fraction, so it can never hit the one
 * forbidden value `t = 0`.
 */
export const d5_rat6_rate_l2: ItemTemplate = {
  template_id: "d5.rat6.rate.l2",
  node_id: RAT6_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const a = rng.int(3, 9);
    let b = rng.int(4, 12);
    while (b === a) {
      b = rng.int(4, 12);
    }
    const num = a * b;
    const den = a + b;
    const g = gcd(num, den);
    const rn = num / g;
    const rd = den / g;
    const answerTex = rd === 1 ? `${rn}` : `\\dfrac{${rn}}{${rd}}`;
    return {
      prompt: `One pipe fills a tank in $${a}$ hours and another fills it in $${b}$ hours. Working together they finish in $t$ hours, so $\\dfrac{1}{${a}} + \\dfrac{1}{${b}} = \\dfrac{1}{t}$. Solve for $t$. ${ANSWER_TAIL}`,
      answer: solutionSetAnswer(rd === 1 ? `{${rn}}` : `{${rn}/${rd}}`),
      params: { a, b, num, den, rn, rd },
      hints: [
        "Each pipe's rate is the fraction of the tank it fills in one hour, and the two rates add to the combined rate.",
        "Clear all three denominators at once by multiplying every term by the LCD that contains both numbers and the unknown.",
        "With the fractions gone, collect the terms carrying the unknown, divide, and leave the result as a fraction in lowest terms if it does not come out whole.",
      ],
      worked_solution: [
        `The only denominator carrying the unknown is $t$, so $t = 0$ is excluded. Note it before anything is cleared.`,
        `Multiply every term by the LCD $${num}t$: $${b}t + ${a}t = ${num}$.`,
        `Collect the $t$ terms: $${den}t = ${num}$.`,
        g > 1
          ? `Divide both sides by $${den}$: $t = \\dfrac{${num}}{${den}} = ${answerTex}$.`
          : `Divide both sides by $${den}$: $t = ${answerTex}$.`,
        `Check the candidate against the excluded value: it is a positive number, not $0$, so it is valid.`,
        `The solution set is $\\{${answerTex}\\}$ hours.`,
      ],
    };
  },
  varietyKey: ({ a = 0, b = 0 }) => `rate:${Math.min(a, b)}:${Math.max(a, b)}`,
};

/**
 * L2b: the spec's mixture-to-target framing. `(s + d)/(t + d) = n/m` clears by cross
 * multiplication and leaves a linear equation in the added drams. Every target ratio has
 * `m - n = 1`, so the unknown's coefficient collapses to one and the dose stays a whole
 * number. The dose is drawn positive, so it never lands on the forbidden `d = -t`.
 */
export const d5_rat6_alloy_l2: ItemTemplate = {
  template_id: "d5.rat6.alloy.l2",
  node_id: RAT6_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    // Target purities one part shy of whole, so `m - n = 1` and the dose stays integral.
    const [n, m] = rng.pick([
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ] as const);
    const t = rng.int(10, 30);
    // Keep the dose in [2, 25]: any `s` in this window leaves `d = n*t - m*s` in range,
    // and `s < n*t/m < t`, so the bar always starts below the target purity.
    const lowS = Math.max(1, Math.ceil((n * t - 25) / m));
    const highS = Math.max(lowS, Math.floor((n * t - 2) / m));
    const s = rng.int(lowS, highS);
    const add = n * t - m * s;
    return {
      prompt: `A $${t}$-gram alloy is $${s}$ grams silver. Adding $d$ grams of pure silver makes the silver fraction $\\dfrac{${s} + d}{${t} + d}$ equal to $\\dfrac{${n}}{${m}}$. Solve $\\dfrac{${s} + d}{${t} + d} = \\dfrac{${n}}{${m}}$ for $d$. ${ANSWER_TAIL}`,
      answer: solutionSetAnswer(`{${add}}`),
      params: { n, m, s, t, add },
      hints: [
        "A proportion clears in one move: multiply both sides by each denominator, which is the same as cross multiplying.",
        "Expand both sides, then gather every term carrying the unknown on one side and the plain numbers on the other.",
        "Once the unknown stands alone, read it off, then check it against the value the original denominator excludes before you list it.",
      ],
      worked_solution: [
        `The denominator $${t} + d$ is zero at $d = -${t}$, so $d = -${t}$ is excluded. Note it before anything is cleared.`,
        `Clear denominators by cross multiplying: $${m}(${s} + d) = ${n}(${t} + d)$.`,
        `Expand each side: $${m * s} + ${m}d = ${n * t} + ${n}d$.`,
        `Gather the $d$ terms on the left and the plain numbers on the right: $${m}d - ${n}d = ${n * t} - ${m * s}$.`,
        `Since $${m} - ${n} = 1$, the left side is just $d$, so $d = ${add}$.`,
        `Check the candidate against the excluded value: $${add}$ is not $-${t}$, so it is valid.`,
        `The solution set is $\\{${add}\\}$ grams of pure silver.`,
      ],
    };
  },
  varietyKey: (params) => `alloy:${params.n}:${params.s}:${params.t}:${params.add}`,
};

/**
 * L3a: the cursed root, in its plainest form. Both sides sit over the SAME measure
 * `x + p`, so clearing it is one multiplication, but the equation that survives is a
 * quadratic that factors as `(x + p)(x - r)`. One factor IS the denominator, so `-p` is a
 * candidate the algebra invented and the craft forbids; only `r` goes in the list.
 *
 * A learner who factors correctly and skips the check submits both roots and is graded
 * `extra_solution`, which is exactly the miss this node exists to catch.
 */
export const d5_rat6_cursed_l3: ItemTemplate = {
  template_id: "d5.rat6.cursed.l3",
  node_id: RAT6_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const p = rng.int(2, 9);
    let r = rng.int(1, 9);
    while (r === p) {
      r = rng.int(1, 9);
    }
    const mid = p - r; // nonzero, either sign
    const c = p * r;
    const top = `x^{2} ${signedVt(mid)}`;
    return {
      prompt: `Solve $\\dfrac{${top}}{x + ${p}} = \\dfrac{${c}}{x + ${p}}$. ${ANSWER_TAIL}`,
      answer: solutionSetAnswer(`{${r}}`),
      params: { p, r, mid, c },
      hints: [
        "Read the excluded value off the denominator before you clear it. Both sides share that denominator, so there is only one to find.",
        "Both sides sit over the same denominator, so multiplying by it leaves a quadratic. Bring every term to one side so the equation reads as something equal to zero.",
        "Factor to get both candidates, then check each one against the excluded value. A candidate that matches it is an extraneous solution and does not belong in your list.",
      ],
      worked_solution: [
        `Both sides sit over $x + ${p}$, which is zero at $x = -${p}$, so $x = -${p}$ is excluded. Note it before anything is cleared.`,
        `Multiply both sides by $x + ${p}$: $${top} = ${c}$.`,
        `Bring every term to one side: $${top} - ${c} = 0$.`,
        `Factor: $(x + ${p})(x - ${r}) = 0$, so the candidates are $x = -${p}$ and $x = ${r}$.`,
        `Check each candidate against the excluded value. $x = -${p}$ is exactly the value the denominator excludes, so it is an extraneous solution and is rejected.`,
        `$x = ${r}$ is not excluded, so it is valid.`,
        `The solution set is $\\{${r}\\}$. The other candidate was invented by multiplying through by $x + ${p}$, so listing it would be wrong.`,
      ],
    };
  },
  varietyKey: (params) => `cursed:${params.p}:${params.r}`,
};

/**
 * L3b: the same cursed root, now behind a real common measure. Three fractions over TWO
 * different denominators (`x` and `x + p`, with their product on the right), so the
 * forbidden list has two entries and the learner has to build the measure before clearing.
 * With `a = p - r` and `b = p^2` the cleared quadratic factors as `(x + p)(x - r)` again,
 * so `-p` is once more a root the algebra allows and the craft forbids.
 */
export const d5_rat6_forge_l3: ItemTemplate = {
  template_id: "d5.rat6.forge.l3",
  node_id: RAT6_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const p = rng.int(3, 9);
    const r = rng.int(1, p - 1);
    const a = p - r; // >= 1
    const b = p * p;
    return {
      prompt: `Solve $\\dfrac{x}{x + ${p}} + \\dfrac{${a}}{x} = \\dfrac{${b}}{x(x + ${p})}$. ${ANSWER_TAIL}`,
      answer: solutionSetAnswer(`{${r}}`),
      params: { p, r, a, b },
      hints: [
        "There are two different denominators here, and the one on the right is their product. Read every excluded value off the original denominators before you clear anything.",
        "Multiply every term by the LCD. The first fraction leaves an $x$ times an $x$, so what survives is a quadratic, not a linear equation.",
        "Bring it to zero and factor, then check each candidate against the excluded values. One factor matches a denominator, which is exactly how an extraneous solution gets invented.",
      ],
      worked_solution: [
        `The original denominators are $x$ and $x + ${p}$, so $x = 0$ and $x = -${p}$ are excluded. Note both before anything is cleared.`,
        `The LCD is $x(x + ${p})$. Multiply every term by it: $x \\cdot x + ${bracketCoeff(a)}(x + ${p}) = ${b}$.`,
        `Expand the left side: $x^{2} + ${vt(a)} + ${a * p} = ${b}$.`,
        `Bring every term to one side: $x^{2} + ${vt(a)} - ${r * p} = 0$.`,
        `Factor: $(x + ${p})(x - ${r}) = 0$, so the candidates are $x = -${p}$ and $x = ${r}$.`,
        `Check each candidate against the excluded values. $x = -${p}$ is excluded, so that root is extraneous and is rejected.`,
        `$x = ${r}$ is neither $0$ nor $-${p}$, so it is valid.`,
        `The solution set is $\\{${r}\\}$.`,
      ],
    };
  },
  varietyKey: (params) => `forge:${params.p}:${params.r}`,
};

/** Every RAT.6 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const RAT6_TEMPLATES: readonly ItemTemplate[] = [
  d5_rat6_clear_l1,
  d5_rat6_rate_l2,
  d5_rat6_alloy_l2,
  d5_rat6_cursed_l3,
  d5_rat6_forge_l3,
];
