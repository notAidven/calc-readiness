import {
  expressionAnswer,
  type ItemTemplate,
  numericAnswer,
  type Rng,
  standardPolyAnswer,
} from "../../../template";

/**
 * FUN.6 practice templates: the difference quotient. Themed for "The Gearwright's
 * Menagerie"; Atomic Age era.
 *
 * FUN.6 is an ITEM-FAMILY node with a `polynomial` and a `rational` family. The rational
 * family depends on RAT.1-RAT.3 across another domain, so the practice shapes here stay
 * inside the POLYNOMIAL family. **The rational family is UNAUTHORED**, deliberately and not
 * by oversight: every shape below is a polynomial `f`, and a learner served this pool never
 * meets `\dfrac{f(x + h) - f(x)}{h}` for a rational `f`.
 *
 * ## Why no answer here is written in BOTH `x` and `h`
 *
 * The honest general form of this node's answer is two-variable (`2x + h + 5`), and the
 * checker cannot grade one. Measured against mathjs 15.2.0, which is what
 * `symbolicEqual` rationalizes with: `rationalize("(6x + 3h + 5) - (6x + 3h + 5)")` returns
 * the numerator `6 * x + 3 * h + 5 - 3 * h - 6 * x - 5`, NOT `0`, so the exact answer key
 * grades `value_mismatch` against itself. The single-variable case collapses to `0` as
 * expected, which is why every other expression pool in the tree works. So a two-variable
 * key is not merely awkward here, it is ungradable, and D4's POL.1 header records the same
 * finding from the other direction (`x^2 + 6*x*y + 9*y^2` grades `not_simplified`).
 *
 * The shapes below therefore fix the INPUT and keep `h` as the variable: the quotient is
 * formed at a numeric `x`, so the answer is a polynomial in `h` alone. Nothing pedagogical is
 * lost, because both of the node's failure points survive intact: `f(p + h)` still means
 * substitute `(p + h)` for every `x` and still requires `(p + h)^2` to be multiplied out in
 * full, and the `h` underneath still cancels only once every surviving numerator term carries
 * one. The LESSON teaches the general form, where nothing is graded by mathjs.
 *
 * The one exception is L1, whose answer is a plain number: for a line the difference quotient
 * is the slope, and both `x` and `h` vanish from it, so the general form is gradable there and
 * is what the item asks.
 *
 * ## Prompts are neutral, on purpose
 *
 * `d6/theming.ts` carries the Atomic Age telemetry vocabulary and exports no builders, and
 * none of these five shapes word-problems cleanly: a difference quotient of a named reading
 * is FUN.5's average rate of change wearing this node's algebra, and for the linear shape a
 * story would hand the answer over (the quotient IS the rate the story would have to state).
 * Per `practice-templates` a decorative lead-in on an abstract exercise is worse than none,
 * so every prompt here is plain mathematics and the era opener sits in the lesson pack's
 * first paragraph instead. No template reads `ctx.form`, so forms A / B and `practice` are
 * byte-identical.
 *
 * Every key is computed by real arithmetic so `validateTemplates` grades each sampled
 * instance correct, and each template declares a `varietyKey` over its own answer, which the
 * D6 pool ENFORCES (see `d6/practice.ts`), so a cell never freezes two instances that reduce
 * to the same thing.
 */

export const FUN6_NODE = "FUN.6";

/** The task line every quotient shape shares. Kept outside `$...$` so only math is delimited. */
const SIMPLIFY_TASK = " Simplify it completely.";

/** `+ 5` / `- 5`: a signed constant, as it follows a term. */
function signed(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/** `+ 5h` / `- h`: a signed term, as it follows another term. A unit coefficient is dropped. */
function signedTerm(coeff: number, body: string): string {
  const mag = Math.abs(coeff);
  const written = mag === 1 ? body : `${mag}${body}`;
  return coeff < 0 ? `- ${written}` : `+ ${written}`;
}

/** `5h` / `h` / `-5h`: the same term at the FRONT of an expression. */
function leadTerm(coeff: number, body: string): string {
  const mag = Math.abs(coeff);
  const written = mag === 1 ? body : `${mag}${body}`;
  return coeff < 0 ? `-${written}` : written;
}

/** `\dfrac{f(a + h) - f(a)}{h}`, the quotient formed at a numeric input. */
function quotientAt(input: number): string {
  return `\\dfrac{f(${input} + h) - f(${input})}{h}`;
}

/** The quotient in its general form, which only L1's answer can be graded in. */
const GENERAL_QUOTIENT = "\\dfrac{f(x + h) - f(x)}{h}";

/**
 * A nonzero integer in `[-max, max]`, drawn without a rejection loop so the draw count is
 * fixed and every template's stream stays deterministic under a guard reroll.
 */
function nonzero(rng: Rng, max: number): number {
  const mag = rng.int(1, max);
  return rng.int(0, 1) === 1 ? -mag : mag;
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

/**
 * The instance the LESSON's own check works, `f(x) = 2x^2 - 3x + 5` at `x = 4`, as
 * `(a, b, c, p)`.
 *
 * L3a's shape is the check's shape, which is deliberate (the re-ask draws the same kind of
 * question), but it means the pool could hand a learner back the exact question they were
 * just walked through. RAT.1's `TAUGHT_TRIPLES` is the same guard for the same reason.
 */
const TAUGHT_BY_THE_CHECK: readonly [number, number, number, number] = [2, -3, 5, 4];

/**
 * L1: the difference quotient of a LINE, `f(x) = mx + b`.
 *
 * The one shape that can be asked in its general form, and the one worth asking there: both
 * `x` and `h` cancel out of it, so the answer is the slope and the learner sees the quotient
 * measure a rate rather than produce another expression. It is also the cleanest possible
 * demonstration that the constant term never survives the subtraction.
 */
export const d6_fun6_linear_l1: ItemTemplate = {
  template_id: "d6.fun6.linear.l1",
  node_id: FUN6_NODE,
  difficulty: 1,
  concept: "difference-quotient-of-a-line",
  generate(rng: Rng) {
    const mag = rng.int(2, 9);
    const m = rng.int(0, 1) === 1 ? -mag : mag;
    const b = nonzero(rng, 9);
    const fTex = `${leadTerm(m, "x")} ${signed(b)}`;
    return {
      prompt: `For $f(x) = ${fTex}$, simplify the difference quotient $${GENERAL_QUOTIENT}$. Enter one number.`,
      answer: numericAnswer(String(m)),
      params: { m, b },
      hints: [
        "Write $f(x + h)$ first: wherever the rule has an $x$, the whole input $x + h$ goes in its place, and the constant term is left alone.",
        "Now subtract $f(x)$ from that. The terms in $x$ are identical in both, and so is the constant, so both cancel and what survives is a single multiple of $h$.",
        "Divide that multiple of $h$ by $h$. The step $h$ is not zero, so it divides out exactly and no $h$ is left in the answer.",
      ],
      worked_solution: [
        `Substitute the whole input: $f(x + h) = ${leadTerm(m, "(x + h)")} ${signed(b)}$.`,
        `Multiply out: $f(x + h) = ${leadTerm(m, "x")} ${signedTerm(m, "h")} ${signed(b)}$.`,
        `Subtract $f(x) = ${fTex}$. The $${leadTerm(m, "x")}$ and the constant appear in both, so both cancel: $f(x + h) - f(x) = ${leadTerm(m, "h")}$.`,
        `Divide by $h$, which is not zero: $\\dfrac{${leadTerm(m, "h")}}{h} = ${m}$.`,
        `The difference quotient is $${m}$, the slope of the line.`,
      ],
    };
  },
  varietyKey: (params) => `${params.m}`,
};

/**
 * L2a: the NUMERATOR only, `f(p + h) - f(p)`, in standard form.
 *
 * The division is deliberately withheld, so the item is exactly the two moves the node's
 * learners actually fail: multiply `(p + h)^2` out in full, and notice that every term
 * without an `h` in it is present in both outputs and therefore disappears. What is left is
 * the factored-in-waiting form the next tier divides.
 *
 * ## Why the prompt PRINTS the quotient it then tells the learner not to divide
 *
 * Withholding the division is the one thing that makes this shape different from its three
 * siblings, and it is also what made the prompt ambiguous. It used to name the target in
 * running prose, *"the numerator of the difference quotient at $x = p$, which is
 * $f(p + h) - f(p)$"*, where the relative clause's nearest antecedent is the QUOTIENT and
 * not its numerator. Read against that antecedent the sentence asserts something false: the
 * difference quotient is `f(p + h) - f(p)` OVER `h`. A learner who does not know the
 * definition reads past it; one who does trips on it, which is the wrong way round for a
 * placement instrument.
 *
 * So the quotient is now written out with {@link quotientAt}, the same `\dfrac` the other
 * four shapes print, and the numerator is asked for against it. That fixes three things at
 * once and softens nothing: the appositive now renames the noun it sits beside, `f(p + h)`
 * is set inside a fraction rather than jammed into a prose clause next to `f(p)`, and the
 * one instruction this shape has that the others do not (stop before dividing) is stated
 * rather than left to be inferred from "numerator". The expansion of `(p + h)^2` and the
 * cancellation are untouched, and the key does not move.
 *
 * ## Lane: this rewrite is a CROSS-LANE edit, made 2026-08-05 on the owner's direction
 *
 * `docs/Content_Authoring_Split.md` §11.1 is the current ruling and it is not in doubt here:
 * *"Anthony has the learning, Gabe has the game"*, so this file is Anthony's. The owner hit
 * the old wording QA-ing the diagnostic, called it confusing, and directed the fix himself
 * rather than routing it: *"just write it yourself."* Recorded where the changed text is
 * rather than left to be discovered, which is the convention `docs/qa-d4-round-1.md` (D3
 * LIN.1, *"in scope by owner override after being reported"*) and this doc's own §11 both
 * follow. Nothing else in the pack was touched, and the four sibling shapes were read
 * against the same objection and left alone: they print the quotient already.
 */
export const d6_fun6_numerator_l2: ItemTemplate = {
  template_id: "d6.fun6.numerator.l2",
  node_id: FUN6_NODE,
  difficulty: 2,
  concept: "expand-and-subtract-the-numerator",
  generate(rng: Rng) {
    let a = 2;
    let b = 1;
    let c = 1;
    let p = 1;
    let k = 0;
    let fp = 0;
    // Reroll while the surviving linear coefficient is zero (which would leave a bare
    // `a h^2` and hide the cancellation) or the starting output is zero (which would make
    // the "the constants are identical, so they cancel" step a claim about nothing).
    do {
      a = rng.int(2, 5);
      b = nonzero(rng, 9);
      c = nonzero(rng, 9);
      p = rng.int(1, 5);
      k = 2 * a * p + b;
      fp = a * p * p + b * p + c;
    } while (k === 0 || fp === 0);
    const fTex = `${a}x^{2} ${signedTerm(b, "x")} ${signed(c)}`;
    const answerTex = `${a}h^{2} ${signedTerm(k, "h")}`;
    return {
      prompt: `For $f(x) = ${fTex}$, the difference quotient at $x = ${p}$ is $${quotientAt(p)}$. Expand and simplify its numerator, $f(${p} + h) - f(${p})$, and stop there: do not divide by $h$. Write the numerator in standard form, the higher power of $h$ first.`,
      answer: standardPolyAnswer(`${a}h^2 ${signedTerm(k, "h")}`, ["h"]),
      params: { a, b, c, p, k, fp },
      hints: [
        "Wherever the rule has an $x$, the whole input goes in its place, brackets included. A squared bracket has to be multiplied out rather than squared term by term.",
        "Multiplying the square out gives three terms and not two, and the middle one is twice the product of the two parts inside the bracket.",
        "Every term with no $h$ in it appears unchanged in both outputs, so the subtraction removes it. Each term you are left with carries an $h$.",
      ],
      worked_solution: [
        `Put the whole input into the rule: $f(${p} + h) = ${a}(${p} + h)^{2} ${signedTerm(b, `(${p} + h)`)} ${signed(c)}$.`,
        `Multiply the square out in full: $(${p} + h)^{2} = ${p * p} + ${2 * p}h + h^{2}$.`,
        `Collect the pieces: $f(${p} + h) = ${answerTex} ${signed(fp)}$.`,
        `The starting output is $f(${p}) = ${fp}$.`,
        `Subtract it. The constant is the same on both sides of the subtraction, so it goes: $f(${p} + h) - f(${p}) = ${answerTex}$.`,
        `The numerator is $${answerTex}$, and every term in it carries a factor of $h$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a}:${params.k}`,
};

/**
 * L2b: the full quotient for `f(x) = ax^2 + c`, formed at a numeric input.
 *
 * No linear term, so the only two things happening are the expansion of the square and the
 * cancellation, and the constant `c` is there to be seen leaving. The answer keeps an `h` in
 * it, which is the whole difference from L1: a curve's quotient still depends on the size of
 * the step.
 */
export const d6_fun6_square_point_l2: ItemTemplate = {
  template_id: "d6.fun6.square-point.l2",
  node_id: FUN6_NODE,
  difficulty: 2,
  concept: "cancel-h-after-expanding",
  generate(rng: Rng) {
    let a = 2;
    let c = 1;
    let p = 1;
    let fp = 0;
    // `fp === 0` would leave nothing for the subtraction to remove, and the worked solution
    // says a constant cancels. `k === a` is the one shape mathjs `simplify` factors (`Nh + N`),
    // which the checker would then read as unsimplified; `k = 2ap` reaches it only at
    // `p = 1/2`, so the guard is written down rather than relied on.
    do {
      a = rng.int(2, 6);
      c = nonzero(rng, 9);
      p = rng.int(1, 6);
      fp = a * p * p + c;
    } while (fp === 0 || 2 * a * p === a);
    const k = 2 * a * p;
    const fTex = `${a}x^{2} ${signed(c)}`;
    const answerTex = `${a}h + ${k}`;
    return {
      prompt: `For $f(x) = ${fTex}$, simplify the difference quotient at $x = ${p}$, $${quotientAt(p)}$.${SIMPLIFY_TASK}`,
      answer: expressionAnswer(`${a}h + ${k}`, ["h"]),
      params: { a, c, p, k, fp },
      hints: [
        "Every $x$ in the rule takes the whole input, so the squared term becomes the square of a bracket and has to be multiplied out in full rather than squared piece by piece.",
        "The plain constant is the same in both outputs, so the subtraction removes it and leaves only terms that carry an $h$.",
        "Factor the $h$ out of every term that is left, and then cancel it against the $h$ underneath.",
      ],
      worked_solution: [
        `Put the whole input into the rule: $f(${p} + h) = ${a}(${p} + h)^{2} ${signed(c)}$.`,
        `Multiply the square out in full: $(${p} + h)^{2} = ${p * p} + ${2 * p}h + h^{2}$, so $f(${p} + h) = ${a}h^{2} + ${k}h ${signed(fp)}$.`,
        `The starting output is $f(${p}) = ${fp}$, the same constant, so subtracting it removes it: $f(${p} + h) - f(${p}) = ${a}h^{2} + ${k}h$.`,
        `Both surviving terms carry an $h$, so factor it out: $${a}h^{2} + ${k}h = h(${answerTex})$.`,
        `Now the $h$ underneath cancels, and it may because $h$ is not zero: $\\dfrac{h(${answerTex})}{h} = ${answerTex}$.`,
        `The difference quotient at $x = ${p}$ is $${answerTex}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a}:${params.k}`,
};

/**
 * L3a: the full quotient for a three-term quadratic, `f(x) = ax^2 + bx + c`, at a numeric
 * input that may be negative.
 *
 * Two different kinds of term cancel here rather than one: the constant, and the part of the
 * linear term that carries no `h`. A negative input also puts the expansion of the square
 * where the sign errors live, since `(-3 + h)^2` has a negative middle term.
 */
export const d6_fun6_point_full_l3: ItemTemplate = {
  template_id: "d6.fun6.point-full.l3",
  node_id: FUN6_NODE,
  difficulty: 3,
  concept: "cancel-h-full-quadratic",
  generate(rng: Rng) {
    let a = 2;
    let b = 1;
    let c = 1;
    let p = 1;
    let k = 0;
    let fp = 0;
    // `k === 0` would drop the constant term out of the answer, `k === a` is the `Nh + N`
    // shape mathjs factors, and `fp === 0` would leave the subtraction nothing to remove.
    // The last clause redraws the question the lesson's own check already works.
    do {
      a = rng.int(2, 6);
      b = nonzero(rng, 9);
      c = nonzero(rng, 9);
      p = nonzero(rng, 4);
      k = 2 * a * p + b;
      fp = a * p * p + b * p + c;
    } while (
      k === 0 ||
      k === a ||
      fp === 0 ||
      (a === TAUGHT_BY_THE_CHECK[0] &&
        b === TAUGHT_BY_THE_CHECK[1] &&
        c === TAUGHT_BY_THE_CHECK[2] &&
        p === TAUGHT_BY_THE_CHECK[3])
    );
    const fTex = `${a}x^{2} ${signedTerm(b, "x")} ${signed(c)}`;
    const answerTex = `${a}h ${signed(k)}`;
    const expandedTex = `${a}h^{2} ${signedTerm(k, "h")}`;
    return {
      prompt: `For $f(x) = ${fTex}$, simplify the difference quotient at $x = ${p}$, $${quotientAt(p)}$.${SIMPLIFY_TASK}`,
      answer: expressionAnswer(`${a}h ${signed(k)}`, ["h"]),
      params: { a, b, c, p, k, fp },
      hints: [
        "Substitute the whole input for every $x$, brackets and all, and multiply the squared bracket out in full: it produces three terms, not two.",
        "Two kinds of term cancel in the subtraction. The constant is identical in both outputs, and so is the part of the linear term that has no $h$ in it. Whatever survives carries an $h$.",
        "Once every remaining term carries an $h$, factor it out and cancel it against the $h$ underneath.",
      ],
      worked_solution: [
        `Put the whole input into the rule: $f(${p} + h) = ${a}(${p} + h)^{2} ${signedTerm(b, `(${p} + h)`)} ${signed(c)}$.`,
        `Multiply the square out in full: $(${p} + h)^{2} = ${p * p} ${signedTerm(2 * p, "h")} + h^{2}$.`,
        `Collect the pieces: $f(${p} + h) = ${expandedTex} ${signed(fp)}$, and the starting output is $f(${p}) = ${fp}$.`,
        `Subtract. Everything with no $h$ in it is the same on both sides, so it goes: $f(${p} + h) - f(${p}) = ${expandedTex}$.`,
        `Factor the $h$ out of what is left: $${expandedTex} = h(${answerTex})$.`,
        `Cancel it against the $h$ underneath, which is allowed because $h$ is not zero: $\\dfrac{h(${answerTex})}{h} = ${answerTex}$.`,
        `The difference quotient at $x = ${p}$ is $${answerTex}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a}:${params.k}`,
};

/**
 * L3b: the same quotient, but the rule arrives FACTORED, `f(x) = (ax + q)(x + r)`.
 *
 * A second multiplication before the first one: the learner either expands `f` into standard
 * form and proceeds, or substitutes into the product and multiplies two brackets in `h`.
 * Both routes work and both are more than L3a asks, which is what makes this the harder of
 * the two L3 shapes rather than the same shape with different numbers.
 */
export const d6_fun6_factored_point_l3: ItemTemplate = {
  template_id: "d6.fun6.factored-point.l3",
  node_id: FUN6_NODE,
  difficulty: 3,
  concept: "difference-quotient-from-a-product",
  generate(rng: Rng) {
    let a = 2;
    let q = 1;
    let r = 1;
    let p = 1;
    let b = 0;
    let k = 0;
    let fp = 0;
    // Same three guards as L3a, plus two of this shape's own. `b === 0` collapses the
    // expanded rule to `ax^2 + c` and hands back L2b's shape. And a shared factor inside the
    // first bracket, `(3x - 3)`, invites a learner to tidy the rule before reading it, which
    // is a different exercise, so the bracket is kept primitive.
    do {
      a = rng.int(2, 4);
      q = nonzero(rng, 8);
      r = nonzero(rng, 8);
      p = rng.int(1, 5);
      b = a * r + q;
      k = 2 * a * p + b;
      fp = (a * p + q) * (p + r);
    } while (b === 0 || k === 0 || k === a || fp === 0 || gcd(a, q) !== 1);
    const c = q * r;
    const factoredTex = `(${leadTerm(a, "x")} ${signed(q)})(x ${signed(r)})`;
    const expandedRuleTex = `${a}x^{2} ${signedTerm(b, "x")} ${signed(c)}`;
    const answerTex = `${a}h ${signed(k)}`;
    const numeratorTex = `${a}h^{2} ${signedTerm(k, "h")}`;
    return {
      prompt: `For $f(x) = ${factoredTex}$, simplify the difference quotient at $x = ${p}$, $${quotientAt(p)}$.${SIMPLIFY_TASK}`,
      answer: expressionAnswer(`${a}h ${signed(k)}`, ["h"]),
      params: { a, q, r, p, b, k, fp },
      hints: [
        "The rule arrives as a product, and the two brackets have to be multiplied together at some point. Either expand the rule into a squared term, a term in $x$ and a constant first, or substitute into the product and multiply out afterwards.",
        "Subtracting the starting output removes every term that has no $h$ in it, which is what leaves an $h$ in each surviving term.",
        "Factor that $h$ out of what is left and cancel it against the $h$ underneath.",
      ],
      worked_solution: [
        `Multiply the rule out first: $f(x) = ${factoredTex} = ${expandedRuleTex}$.`,
        `Put the whole input in: $f(${p} + h) = ${a}(${p} + h)^{2} ${signedTerm(b, `(${p} + h)`)} ${signed(c)}$.`,
        `Multiply the square out in full: $(${p} + h)^{2} = ${p * p} + ${2 * p}h + h^{2}$.`,
        `Collect the pieces: $f(${p} + h) = ${numeratorTex} ${signed(fp)}$, and the starting output is $f(${p}) = ${fp}$.`,
        `Subtract. Everything without an $h$ in it is identical on both sides, so it goes: $f(${p} + h) - f(${p}) = ${numeratorTex}$.`,
        `Factor out the $h$ and cancel it against the $h$ underneath, which $h$ being nonzero allows: $\\dfrac{h(${answerTex})}{h} = ${answerTex}$.`,
        `The difference quotient at $x = ${p}$ is $${answerTex}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a}:${params.k}:${params.p}`,
};

/** Every FUN.6 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const FUN6_TEMPLATES: readonly ItemTemplate[] = [
  d6_fun6_linear_l1,
  d6_fun6_numerator_l2,
  d6_fun6_square_point_l2,
  d6_fun6_point_full_l3,
  d6_fun6_factored_point_l3,
];
