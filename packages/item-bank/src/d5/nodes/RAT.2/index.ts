import { type ItemTemplate, type Rng, rationalAnswer } from "../../../template";

/**
 * RAT.2 practice templates for "Verdigris Hold", the crafting-guild island (multiply and
 * divide rational expressions). Five problem shapes across the locked 1xL1 / 2xL2 / 2xL3
 * practice mix, themed as the guild's Scaling Table, where a batch is sized up by a
 * multiplication and split into vials or billets by a division.
 *
 * The theme is skin only. Every prompt still says "write the result in lowest terms and
 * state every forbidden measure", so a student who ignores the guild entirely still reads
 * factor, cancel, state the restriction. No `answer`, `params`, or grader spec depends on
 * the wording.
 *
 * ## Excluded values are inherited, and division adds one more source
 *
 * Multiplication inherits its exclusions from the ORIGINAL denominators, before anything
 * cancels. Division inherits those AND the zeros of the divisor's NUMERATOR, because
 * flipping the divisor sends its top underneath. Both divide shapes below are built so
 * neither forbidden measure is visible in the final expression, which is exactly the
 * near-miss `rationalAnswer` grades for: the expression alone is only half the answer.
 *
 * ## Why every answer is a polynomial
 *
 * A grader limit, not authoring taste. The v2 product checker judges a `rational_answer` by
 * rationalizing the difference between the submitted expression and the key, and its
 * exact-arithmetic mathjs instance THROWS inside `rationalize` when a compound numerator
 * sits over a plain number: `(x + 4)/3` raises "Invalid + placing", while `3*x/4` and
 * `(x + 7)/(x + 4)` are both fine. A student's typed expression runs that same path, so a
 * shape whose reduced form is a binomial over a number would reject the correct answer with
 * `parse_error`. Every shape below therefore cancels its denominator away entirely, leaving
 * a polynomial or a single monomial, which is safe on either side of that limit.
 *
 * Every key is computed by real arithmetic so `validateTemplates` grades each sampled
 * instance correct, and each template declares a `varietyKey` over its simplified answer,
 * which the D5 pool ENFORCES (see `d5/practice.ts`), so a cell never freezes two near-twin
 * instances.
 */

export const RAT2_NODE = "RAT.2";

/**
 * The shared task line. Kept outside every `$...$` so only the math is delimited, and
 * worded to cover both operations: a division forbids the divisor's numerator zeros too.
 */
const TABLE_TASK =
  " Write the result in lowest terms and state every excluded value, the values of $x$ that would divide by zero anywhere in the original.";

/** `+` or `-` for a signed value, as the operator that precedes its magnitude. */
function op(value: number): string {
  return value < 0 ? "-" : "+";
}

/** A linear factor `x + c` / `x - |c|`, whose zero sits at `-c`. */
function linear(c: number): string {
  return `x ${op(c)} ${Math.abs(c)}`;
}

/** A linear factor with a plain number multiplied through: `cx + ck` / `cx - c|k|`. */
function scaledLinear(c: number, k: number): string {
  return `${c}x ${op(k)} ${Math.abs(c * k)}`;
}

/** An expanded monic quadratic `x^2 + sx + p`, with unit and negative coefficients tidy. */
function quadratic(sum: number, product: number): string {
  const coeff = Math.abs(sum) === 1 ? "" : `${Math.abs(sum)}`;
  return `x^{2} ${op(sum)} ${coeff}x ${op(product)} ${Math.abs(product)}`;
}

/** A nonzero offset in [-max, -1] union [1, max], for a linear factor's constant. */
function offset(rng: Rng, max: number): number {
  const magnitude = rng.int(1, max);
  return rng.int(0, 1) === 1 ? -magnitude : magnitude;
}

/**
 * L1, the measure-conversion charm: multiply two monomial measures,
 * `(a x^2 / b) * (bc / x)`. One plain number and one factor of the variable cancel, and
 * the only forbidden measure is the dose that empties the bottom of the charm.
 */
export const d5_rat2_charm_l1: ItemTemplate = {
  template_id: "d5.rat2.charm.l1",
  node_id: RAT2_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const a = rng.int(2, 6);
    const b = rng.int(2, 9);
    const c = rng.int(2, 5);
    const ratio = b * c;
    const across = a * b * c;
    const scaled = a * c;
    return {
      prompt: `Multiply and simplify: $\\dfrac{${a}x^{2}}{${b}} \\times \\dfrac{${ratio}}{x}$.${TABLE_TASK}`,
      answer: rationalAnswer(`${scaled}*x`, ["0"], ["x"]),
      params: { a, b, c, ratio, across, scaled },
      hints: [
        "Multiply rational expressions by putting all numerators over all denominators.",
        "Find the plain number that sits in a numerator and in a denominator, and divide it out.",
        "Subtract the powers of the variable, then read the excluded value off the original denominator, which is never allowed to reach zero.",
      ],
      worked_solution: [
        `The denominator is $x$, which is zero at $x = 0$, so $x = 0$ is excluded.`,
        `Multiply straight across: $\\dfrac{${a}x^{2}}{${b}} \\times \\dfrac{${ratio}}{x} = \\dfrac{${across}x^{2}}{${b}x}$.`,
        `Divide out the common factor $${b}$ and one factor of $x$: $\\dfrac{${across}x^{2}}{${b}x} = ${scaled}x$.`,
        `Result: $${scaled}x$, with $x \\ne 0$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.scaled}:${params.b}`,
};

/**
 * L2a, scale a batch: `((cx + cp)/(x + q)) * ((x + q)/c)`. Two cancels, and neither is
 * visible until the first top is written as a product: the plain number comes out in front,
 * then the shared binomial goes. The dose that binomial forbade survives into the answer
 * even though the factor itself is gone.
 */
export const d5_rat2_scale_l2: ItemTemplate = {
  template_id: "d5.rat2.scale.l2",
  node_id: RAT2_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const p = offset(rng, 9);
    let q = offset(rng, 9);
    while (q === p) {
      q = offset(rng, 9);
    }
    const c = rng.int(2, 9);
    const kept = linear(p);
    const shared = linear(q);
    const top = scaledLinear(c, p);
    return {
      prompt: `Multiply and simplify: $\\dfrac{${top}}{${shared}} \\times \\dfrac{${shared}}{${c}}$.${TABLE_TASK}`,
      answer: rationalAnswer(kept, [`${-q}`], ["x"]),
      params: { p, q, c, root: -q },
      hints: [
        "Nothing cancels while a numerator is still a sum, so pull out the number both of its terms share.",
        "Multiplying rational expressions works like multiplying fractions: every numerator goes over every denominator, so a binomial in a numerator can cancel one in a denominator.",
        "Take the excluded values from the denominators you started with, not from the answer, so the factor you canceled still rules a value out.",
      ],
      worked_solution: [
        `The denominators you start with are $${shared}$ and the plain number $${c}$, so $x = ${-q}$ is excluded.`,
        `Factor the number out of the first numerator: $${top} = ${c}(${kept})$.`,
        `Multiply straight across: $\\dfrac{${c}(${kept})}{${shared}} \\times \\dfrac{${shared}}{${c}} = \\dfrac{${c}(${kept})(${shared})}{${c}(${shared})}$.`,
        `Divide out $${c}$ and $${shared}$, leaving $${kept}$.`,
        `Result: $${kept}$, with $x \\ne ${-q}$. The factor canceled, but the excluded value remains.`,
      ],
    };
  },
  varietyKey: (params) => `${params.p}:${params.c}`,
};

/**
 * L2b, split one brew into vials: `((x + p)/c) / ((x + p)/(cx + cq))`. Flipping the divisor
 * turns its bottom into a top that still has to be factored, and BOTH forbidden measures
 * come from the divisor: its bottom, and its top, which flipping sends underneath. Neither
 * is visible in the answer.
 */
export const d5_rat2_vial_l2: ItemTemplate = {
  template_id: "d5.rat2.vial.l2",
  node_id: RAT2_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const p = offset(rng, 9);
    let q = offset(rng, 9);
    while (q === p) {
      q = offset(rng, 9);
    }
    const c = rng.int(2, 9);
    const shared = linear(p);
    const kept = linear(q);
    const vial = scaledLinear(c, q);
    return {
      prompt: `Divide and simplify: $\\dfrac{${shared}}{${c}} \\div \\dfrac{${shared}}{${vial}}$.${TABLE_TASK}`,
      answer: rationalAnswer(kept, [`${-p}`, `${-q}`], ["x"]),
      params: { p, q, c },
      hints: [
        "Dividing by a rational expression is the same as multiplying by its reciprocal, so flip the second expression over first.",
        "The denominator that just came up in the numerator is still a sum: pull out the number its terms share so a binomial can cancel.",
        "Flipping sends the divisor's numerator underneath, so its zero is excluded too, alongside every original denominator's zero.",
      ],
      worked_solution: [
        `Dividing means multiplying by the reciprocal: $\\dfrac{${shared}}{${c}} \\div \\dfrac{${shared}}{${vial}} = \\dfrac{${shared}}{${c}} \\times \\dfrac{${vial}}{${shared}}$.`,
        `Factor the number out of the flipped numerator: $${vial} = ${c}(${kept})$.`,
        `Divide out $${c}$ and $${shared}$: $\\dfrac{(${shared})\\,${c}(${kept})}{${c}(${shared})} = ${kept}$.`,
        `The divisor's denominator $${vial}$ excludes $x = ${-q}$, and its numerator $${shared}$ excludes $x = ${-p}$, because flipping put that numerator underneath.`,
        `Result: $${kept}$, with $x \\ne ${-p}$ and $x \\ne ${-q}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.q}:${params.c}`,
};

/**
 * L3a, scale an alloy from a dagger to a greatsword: a trinomial over one of its factors,
 * times a difference of squares over one of ITS factors. Two factorings before anything
 * cancels, and both original bottoms vanish from the answer while their forbidden
 * measures stay.
 */
export const d5_rat2_alloy_l3: ItemTemplate = {
  template_id: "d5.rat2.alloy.l3",
  node_id: RAT2_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const p = offset(rng, 8);
    let q = offset(rng, 8);
    // p === q squares the trinomial and p + q === 0 kills its middle term, so redraw until
    // the top is a genuine trinomial with two different roots.
    while (q === p || q === -p) {
      q = offset(rng, 8);
    }
    let r = rng.int(2, 9);
    // r === p would make both bottoms forbid the same measure, collapsing the exclusion set.
    while (r === p) {
      r = rng.int(2, 9);
    }
    const sum = p + q;
    const product = p * q;
    const square = r * r;
    const top = quadratic(sum, product);
    const shared = linear(p);
    const kept = linear(q);
    return {
      prompt: `Multiply and simplify: $\\dfrac{${top}}{${shared}} \\times \\dfrac{x^{2} - ${square}}{x + ${r}}$.${TABLE_TASK}`,
      answer: rationalAnswer(`(${kept})*(x - ${r})`, [`${-p}`, `${-r}`], ["x"]),
      params: { p, q, r, sum, product, square },
      hints: [
        "Nothing cancels while a numerator is still a sum, so factor every numerator before you cancel anything.",
        "One numerator is a trinomial that splits into two binomials, and the other is a difference of two squares.",
        "Divide out each factor that appears above and below, multiply what survives, and take the excluded values from the two original denominators.",
      ],
      worked_solution: [
        `Factor the first numerator: $${top} = (${shared})(${kept})$.`,
        `Factor the second numerator, a difference of squares: $x^{2} - ${square} = (x - ${r})(x + ${r})$.`,
        `The product is now $\\dfrac{(${shared})(${kept})}{${shared}} \\times \\dfrac{(x - ${r})(x + ${r})}{x + ${r}}$.`,
        `Divide out $${shared}$ and $x + ${r}$, leaving $(${kept})(x - ${r})$.`,
        `The original denominators were $${shared}$ and $x + ${r}$, so $x = ${-p}$ and $x = ${-r}$ are excluded.`,
        `Result: $(${kept})(x - ${r})$, with $x \\ne ${-p}$ and $x \\ne ${-r}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.q}:${params.r}`,
};

/**
 * L3b, divide one bar into equal billets: a trinomial over a plain number, divided by a
 * binomial over a scaled binomial. Flip, factor both tops, cancel the number and the shared
 * binomial. Both forbidden measures come from the divisor (its bottom, and its top once
 * flipping sends that top underneath), so a student who reads only the answer reports
 * neither.
 */
export const d5_rat2_billet_l3: ItemTemplate = {
  template_id: "d5.rat2.billet.l3",
  node_id: RAT2_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const a = offset(rng, 8);
    let b = offset(rng, 8);
    while (b === a || b === -a) {
      b = offset(rng, 8);
    }
    let d = offset(rng, 8);
    // d === a would collapse the two exclusions into one; d === b would square the answer.
    while (d === a || d === b) {
      d = offset(rng, 8);
    }
    const c = rng.int(2, 9);
    const sum = a + b;
    const product = a * b;
    const top = quadratic(sum, product);
    const shared = linear(a);
    const kept = linear(b);
    const flipped = linear(d);
    const billet = scaledLinear(c, d);
    return {
      prompt: `Divide and simplify: $\\dfrac{${top}}{${c}} \\div \\dfrac{${shared}}{${billet}}$.${TABLE_TASK}`,
      answer: rationalAnswer(`(${kept})*(${flipped})`, [`${-a}`, `${-d}`], ["x"]),
      params: { a, b, d, c, sum, product },
      hints: [
        "Flip the divisor and turn the division into a multiplication before you factor anything.",
        "Factor both numerators: one is a trinomial that splits into two binomials, and the other shares a plain number you can pull out in front.",
        "Cancel the shared binomial and the shared number, then collect the excluded values from the divisor's denominator and from its numerator, which flipping sent underneath.",
      ],
      worked_solution: [
        `Dividing means multiplying by the reciprocal: $\\dfrac{${top}}{${c}} \\div \\dfrac{${shared}}{${billet}} = \\dfrac{${top}}{${c}} \\times \\dfrac{${billet}}{${shared}}$.`,
        `Factor the trinomial: $${top} = (${shared})(${kept})$.`,
        `Factor the number out of the flipped numerator: $${billet} = ${c}(${flipped})$.`,
        `Divide out $${c}$ and $${shared}$: $\\dfrac{(${shared})(${kept})\\,${c}(${flipped})}{${c}(${shared})} = (${kept})(${flipped})$.`,
        `Neither excluded value survives into the answer: the divisor's denominator $${billet}$ excludes $x = ${-d}$, and its numerator $${shared}$ excludes $x = ${-a}$ because flipping put it underneath.`,
        `Result: $(${kept})(${flipped})$, with $x \\ne ${-a}$ and $x \\ne ${-d}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.b}:${params.d}:${params.c}`,
};

/** Every RAT.2 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const RAT2_TEMPLATES: readonly ItemTemplate[] = [
  d5_rat2_charm_l1,
  d5_rat2_scale_l2,
  d5_rat2_vial_l2,
  d5_rat2_alloy_l3,
  d5_rat2_billet_l3,
];
