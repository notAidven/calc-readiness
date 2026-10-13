import { type ItemTemplate, type Rng, rationalAnswer } from "../../../template";

/**
 * RAT.1 practice templates for "Verdigris Hold", the crafting-guild island (simplify
 * rational expressions: factor, cancel, and keep the excluded values). Five problem shapes
 * across the locked 1xL1 / 2xL2 / 2xL3 practice mix, themed as the guild's Reducing Bench,
 * where a value the denominator forbids is a "forbidden dose".
 *
 * The theme is skin only. Every prompt still says "reduce to lowest terms and state every
 * forbidden dose", so a student who ignores the guild entirely still reads factor, cancel,
 * state the restriction. No `answer`, `params`, or grader spec depends on the wording.
 *
 * ## Excluded values come from the ORIGINAL denominator
 *
 * That is the load-bearing skill of this node, so every shape here is built so a factor
 * DISAPPEARS during the reduction while the dose it forbade is still part of the answer.
 * `rationalAnswer` grades the expression AND the exclusion set, and dropping one is wrong
 * even with a perfect expression.
 *
 * ## The one answer form the v2 comparator still cannot read
 *
 * The `rational_answer` path parses with `allowSymbolicDenominator`, so a reduced form that
 * KEEPS a variable denominator grades correctly, which is what the flagship L3b shape below
 * is built on. One narrow form is still rejected as `parse_error`: a parenthesized sum over
 * a plain NUMBER, e.g. `(x + 5)/6`. A bare `x/6` is fine and so is `(x + 5)/(x + 6)`, so the
 * only authoring rule here is that no reduce may land on `(sum)/number`. L1 lands on a
 * monomial over a number and L3a on an expanded linear, both of which are fine.
 *
 * This pool never touches the already-frozen RAT.1 product ASSESSMENT item
 * (`prod.rat-1.l2`, a trinomial over a bare linear factor): different template ids,
 * different shapes, different prompts, and a different pool.
 *
 * Every key is computed by real arithmetic so `validateTemplates` grades each sampled
 * instance correct, and each template declares a `varietyKey` over its simplified answer
 * plus its exclusion set, which the D5 pool ENFORCES (see `d5/practice.ts`), so a cell
 * never freezes two near-twin instances.
 */

export const RAT1_NODE = "RAT.1";

/** The shared task line. Kept outside every `$...$` so only the math is delimited. */
const BENCH_TASK =
  " Reduce it to lowest terms and state every excluded value, the values of $x$ that make the original denominator zero.";

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** A power of x as LaTeX: `x`, `x^{2}`, ... */
function xTex(power: number): string {
  return power === 1 ? "x" : `x^{${power}}`;
}

/** A power of x as an answer key mathjs can parse (no braces): `x`, `x^2`, ... */
function xKey(power: number): string {
  return power === 1 ? "x" : `x^${power}`;
}

/** `+` or `-` for a signed value, as the operator that precedes its magnitude. */
function op(value: number): string {
  return value < 0 ? "-" : "+";
}

/** A linear factor `x + c` / `x - |c|`, whose zero sits at `-c`. */
function linearTex(c: number): string {
  return `x ${op(c)} ${Math.abs(c)}`;
}

/** An expanded monic quadratic `x^2 + sx + p`, with unit and negative coefficients tidy. */
function quadraticTex(sum: number, product: number): string {
  const coeff = Math.abs(sum) === 1 ? "" : `${Math.abs(sum)}`;
  const mid = sum === 0 ? "" : ` ${op(sum)} ${coeff}x`;
  return `x^{2}${mid} ${op(product)} ${Math.abs(product)}`;
}

/** The same quadratic with every coefficient scaled by `c`: `c x^2 + cs x + cp`. */
function scaledQuadraticTex(c: number, sum: number, product: number): string {
  const mid = sum === 0 ? "" : ` ${op(c * sum)} ${Math.abs(c * sum)}x`;
  return `${c}x^{2}${mid} ${op(c * product)} ${Math.abs(c * product)}`;
}

/** An expanded linear answer key mathjs can parse: `3*x + 15` / `3*x - 15`. */
function linearKey(coeff: number, constant: number): string {
  return `${coeff}*x ${op(constant)} ${Math.abs(constant)}`;
}

/**
 * L1, reduce one monomial measure over another: `a x^p / (b x^q)`. The numbers share a
 * common factor and the variable powers subtract, and the only forbidden dose is the one
 * that empties the variable factor downstairs.
 */
export const d5_rat1_monomial_l1: ItemTemplate = {
  template_id: "d5.rat1.monomial.l1",
  node_id: RAT1_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const g = rng.int(2, 6);
    const an = rng.int(1, 6);
    let bn = rng.int(2, 6);
    while (gcd(an, bn) !== 1) {
      bn = rng.int(2, 6);
    }
    const a = g * an;
    const b = g * bn;
    const q = rng.int(1, 2);
    const k = rng.int(1, 2);
    const p = q + k;
    const numeratorKey = an === 1 ? xKey(k) : `${an}*${xKey(k)}`;
    const answerTex = `\\dfrac{${an === 1 ? "" : an}${xTex(k)}}{${bn}}`;
    return {
      prompt: `Simplify $\\dfrac{${a}${xTex(p)}}{${b}${xTex(q)}}$.${BENCH_TASK}`,
      answer: rationalAnswer(`${numeratorKey}/${bn}`, ["0"], ["x"]),
      params: { a, b, p, q, an, bn, k, g },
      hints: [
        "Split the expression into its numerical coefficient and its variable part, and simplify each on its own.",
        "Divide the top and bottom numbers by their greatest common factor, then subtract the exponents on the shared variable.",
        "Read the excluded value off the original denominator first: the variable factor there is not allowed to reach zero.",
      ],
      worked_solution: [
        `The denominator is $${b}${xTex(q)}$, which is zero when $x = 0$, so $x = 0$ is excluded.`,
        `Divide out the common factor of the numbers: $\\dfrac{${a}}{${b}} = \\dfrac{${an}}{${bn}}$.`,
        `Subtract the exponents on $x$: $${xTex(p)} \\div ${xTex(q)} = ${xTex(k)}$.`,
        `Reduced: $${answerTex}$, with $x \\ne 0$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.an}:${params.bn}:${params.k}`,
};

/**
 * L2a, pull a common monomial factor out of the top so the bottom cancels whole:
 * `(c x^2 + c a x) / (x + a)`. Nothing cancels until the sum upstairs is written as a
 * product, which is the misconception the slide-1 widget also targets.
 */
export const d5_rat1_factor_out_l2: ItemTemplate = {
  template_id: "d5.rat1.factor-out.l2",
  node_id: RAT1_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const c = rng.int(2, 9);
    const mag = rng.int(2, 9);
    const neg = rng.int(0, 1);
    const a = neg === 1 ? -mag : mag;
    const root = -a;
    const bottom = linearTex(a);
    const top = `${c}x^{2} ${op(a)} ${c * mag}x`;
    return {
      prompt: `Simplify $\\dfrac{${top}}{${bottom}}$.${BENCH_TASK}`,
      answer: rationalAnswer(`${c}*x`, [`${root}`], ["x"]),
      params: { c, mag, neg, root },
      hints: [
        "Nothing cancels while the numerator is still a sum, so factor the numerator first.",
        "Pull the greatest common factor out of both numerator terms, and the denominator will appear as one of the factors.",
        "Cancel the matching factor, then look back at the original denominator for the excluded value it defines.",
      ],
      worked_solution: [
        `The denominator is $${bottom}$, which is zero at $x = ${root}$, so $x = ${root}$ is excluded.`,
        `Factor the numerator: $${top} = ${c}x(${bottom})$.`,
        `Cancel the shared factor: $\\dfrac{${c}x(${bottom})}{${bottom}} = ${c}x$.`,
        `Reduced: $${c}x$, with $x \\ne ${root}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.c}:${params.root}`,
};

/**
 * L2b, a difference of squares over one of its own factors: `(x^2 - a^2) / (x -/+ a)`.
 * The cancelled factor is the ONLY source of the exclusion, so an answer that reports the
 * expression without it is exactly the near-miss `rationalAnswer` is built to catch.
 */
export const d5_rat1_difference_l2: ItemTemplate = {
  template_id: "d5.rat1.difference.l2",
  node_id: RAT1_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const a = rng.int(2, 12);
    const flip = rng.int(0, 1);
    // flip = 0 cancels (x - a) and forbids a; flip = 1 cancels (x + a) and forbids -a.
    const bottom = flip === 1 ? `x + ${a}` : `x - ${a}`;
    const root = flip === 1 ? -a : a;
    const answerTex = flip === 1 ? `x - ${a}` : `x + ${a}`;
    return {
      prompt: `Simplify $\\dfrac{x^{2} - ${a * a}}{${bottom}}$.${BENCH_TASK}`,
      answer: rationalAnswer(answerTex, [`${root}`], ["x"]),
      params: { a, flip, root },
      hints: [
        "The numerator is a difference of two perfect squares, so it factors into a sum times a difference, and one of those two matches the denominator exactly.",
        "Cancel the shared factor, then keep the excluded value from the original denominator, even though that factor is gone.",
      ],
      worked_solution: [
        `The denominator is $${bottom}$, which is zero at $x = ${root}$, so $x = ${root}$ is excluded.`,
        `The numerator is a difference of squares: $x^{2} - ${a * a} = (x - ${a})(x + ${a})$.`,
        `Cancel $(${bottom})$: $\\dfrac{(x - ${a})(x + ${a})}{${bottom}} = ${answerTex}$.`,
        `Reduced: $${answerTex}$, with $x \\ne ${root}$. The factor canceled, but the excluded value it defined remains.`,
      ],
    };
  },
  varietyKey: (params) => `${params.flip}:${params.a}`,
};

/**
 * L3a, a SCALED trinomial over a linear factor: `(c x^2 + c(a+b)x + c a b) / (x + a)`.
 * Two factorings stacked, the common number first and the trinomial second, which is the
 * L2a common-factor move and a two-binomial split in one problem.
 */
export const d5_rat1_scaled_l3: ItemTemplate = {
  template_id: "d5.rat1.scaled.l3",
  node_id: RAT1_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const amag = rng.int(2, 8);
    const aneg = rng.int(0, 1);
    const a = aneg === 1 ? -amag : amag;
    // |b| = |a| would either square the top or kill its middle term, so redraw the
    // magnitude until the trinomial genuinely carries two different roots.
    let bmag = rng.int(1, 8);
    while (bmag === amag) {
      bmag = rng.int(1, 8);
    }
    const bneg = rng.int(0, 1);
    const b = bneg === 1 ? -bmag : bmag;
    const c = rng.int(2, 5);
    const top = scaledQuadraticTex(c, a + b, a * b);
    const inner = quadraticTex(a + b, a * b);
    const bottom = linearTex(a);
    const keptTex = linearTex(b);
    const answerTex = `${c}x ${op(c * b)} ${Math.abs(c * b)}`;
    return {
      prompt: `Simplify $\\dfrac{${top}}{${bottom}}$.${BENCH_TASK}`,
      answer: rationalAnswer(linearKey(c, c * b), [`${-a}`], ["x"]),
      params: { amag, aneg, bmag, bneg, c, root: -a },
      hints: [
        "Every term in the numerator shares a plain number. Pull it out in front before you factor anything else.",
        "What remains in the numerator is a monic trinomial: find the two numbers that multiply to its constant term and add to its middle coefficient.",
        "One of those binomials is the denominator. Cancel it, keep the number you pulled out in front, and take the excluded value from the original denominator.",
      ],
      worked_solution: [
        `The denominator is $${bottom}$, which is zero at $x = ${-a}$, so $x = ${-a}$ is excluded.`,
        `Every numerator term shares $${c}$: $${top} = ${c}(${inner})$.`,
        `Factor what is left: $${inner} = (${bottom})(${keptTex})$.`,
        `Cancel $(${bottom})$: $\\dfrac{${c}(${bottom})(${keptTex})}{${bottom}} = ${c}(${keptTex})$.`,
        `Reduced: $${answerTex}$, with $x \\ne ${-a}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.c}:${params.bneg}:${params.bmag}:${params.root}`,
};

/**
 * The `(s, n, d)` root triples the LESSON already works, so practice never hands back an
 * instance the learner just watched. In order: the two boards of `rational-exclusion-classify`,
 * the two boards of `rational-simplify-order`, and the CFU.
 */
const TAUGHT_TRIPLES: readonly (readonly [number, number, number])[] = [
  [2, -3, -2],
  [3, 2, -3],
  [4, 5, -3],
  [5, 2, -3],
  [-8, 8, 5],
];

/**
 * L3b, the node's flagship shape: a quadratic over a quadratic sharing EXACTLY ONE factor,
 * `((x+s)(x+n)) / ((x+s)(x+d))`, presented expanded. The cancel is PARTIAL, so the reduced
 * form is still a ratio with a variable denominator, which is the answer RAT.1 exists to
 * produce (and the spec's own worked example, `(x^2-9)/(x^2-x-6) -> (x+3)/(x+2)`).
 *
 * It is also the sharpest possible demonstration of the node's point, because its two
 * forbidden doses arrive by DIFFERENT routes: `-d` is still visible in the reduced bottom,
 * while `-s` left with the cancelled factor and is recoverable only from the original. A
 * student who reads the answer instead of the question reports exactly one of the two.
 */
export const d5_rat1_partial_cancel_l3: ItemTemplate = {
  template_id: "d5.rat1.partial-cancel.l3",
  node_id: RAT1_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    let smag = 0;
    let sneg = 0;
    let nmag = 0;
    let nneg = 0;
    let dmag = 0;
    let dneg = 0;
    let s = 0;
    let n = 0;
    let d = 0;
    // Redraw until the three roots are pairwise distinct, so exactly one factor is shared
    // (a partial cancel), the reduced ratio does not collapse to 1, and the two forbidden
    // doses are two different values. Taught instances are redrawn as well.
    do {
      smag = rng.int(1, 8);
      sneg = rng.int(0, 1);
      nmag = rng.int(1, 8);
      nneg = rng.int(0, 1);
      dmag = rng.int(1, 8);
      dneg = rng.int(0, 1);
      s = sneg === 1 ? -smag : smag;
      n = nneg === 1 ? -nmag : nmag;
      d = dneg === 1 ? -dmag : dmag;
    } while (
      s === n ||
      s === d ||
      n === d ||
      TAUGHT_TRIPLES.some(([ts, tn, td]) => ts === s && tn === n && td === d)
    );
    const top = quadraticTex(s + n, s * n);
    const bottom = quadraticTex(s + d, s * d);
    const shared = linearTex(s);
    const keptTop = linearTex(n);
    const keptBottom = linearTex(d);
    // A zero middle coefficient makes that part a difference of squares, not a trinomial,
    // so the step names the factoring the draw actually needs.
    const topKind = s + n === 0 ? "a difference of squares" : "a trinomial";
    const bottomKind = s + d === 0 ? "a difference of squares" : "a trinomial";
    return {
      prompt: `Simplify $\\dfrac{${top}}{${bottom}}$.${BENCH_TASK}`,
      answer: rationalAnswer(`(${keptTop})/(${keptBottom})`, [`${-s}`, `${-d}`], ["x"]),
      params: { smag, sneg, nmag, nneg, dmag, dneg },
      hints: [
        "Neither part cancels while it is a sum, so factor the numerator and the denominator into two binomials each.",
        "Compare the four factors. Exactly one of them appears in both numerator and denominator, and it is the only one that can cancel.",
        "Cancel just that shared factor. The denominator still has a factor left, so the answer is still a ratio, and both zeros of the original denominator remain excluded.",
      ],
      worked_solution: [
        `Factor the numerator, ${topKind}: $${top} = (${shared})(${keptTop})$.`,
        `Factor the denominator, ${bottomKind}: $${bottom} = (${shared})(${keptBottom})$.`,
        `Read the excluded values off that denominator before anything cancels: it is zero at $x = ${-s}$ and at $x = ${-d}$, so both are excluded.`,
        `Only $(${shared})$ is shared, so only it cancels: $\\dfrac{(${shared})(${keptTop})}{(${shared})(${keptBottom})} = \\dfrac{${keptTop}}{${keptBottom}}$.`,
        `Reduced: $\\dfrac{${keptTop}}{${keptBottom}}$, with $x \\ne ${-s}$ and $x \\ne ${-d}$. The value $x = ${-s}$ left no trace in the reduced expression and is excluded all the same.`,
      ],
    };
  },
  varietyKey: (params) => {
    const s = params.sneg === 1 ? -(params.smag ?? 0) : (params.smag ?? 0);
    const n = params.nneg === 1 ? -(params.nmag ?? 0) : (params.nmag ?? 0);
    const d = params.dneg === 1 ? -(params.dmag ?? 0) : (params.dmag ?? 0);
    return `${n}:${d}:${-s}`;
  },
};

/** Every RAT.1 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const RAT1_TEMPLATES: readonly ItemTemplate[] = [
  d5_rat1_monomial_l1,
  d5_rat1_factor_out_l2,
  d5_rat1_difference_l2,
  d5_rat1_scaled_l3,
  d5_rat1_partial_cancel_l3,
];
