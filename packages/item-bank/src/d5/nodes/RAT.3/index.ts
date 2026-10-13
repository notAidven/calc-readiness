import { type ItemTemplate, type Rng, rationalAnswer } from "../../../template";

/**
 * RAT.3 practice templates for "Verdigris Hold, the Crafting Guild" (add and subtract
 * rational expressions at the Blending Vat: two ladles pour differently-measured shares
 * into one vat, and skimming a share back off is subtraction). Five problem shapes across
 * the locked 1xL1 / 2xL2 / 2xL3 practice mix, with two genuinely different shapes at each
 * of L2 and L3 so a five-slot set reshuffles without repeating a shape.
 *
 * Every answer is a `rational_answer`: the combined single fraction PLUS the excluded
 * values, which are the zeros of the ORIGINAL denominators, not of the combined one. That
 * domain tracking is the load-bearing half of the skill, so the skin never hides it (the
 * "forbidden measure" wording always names the value and where it came from).
 *
 * Both operations are covered: `samedenom.l1` draws either one, `unlike.l2` and
 * `factorlcd.l3` add, and `numerator.l2` and `subtract.l3` subtract. `numerator.l2` is the
 * shape that forces the classic RAT.3 error into the open, because the subtracted
 * numerator has TWO terms and the minus has to reach both of them.
 *
 * Every key is computed by real arithmetic, and each shape's parameters are drawn so the
 * combined numerator can never share a factor with the combined denominator, so a
 * "simplify further" step is never silently required. Each template declares a
 * `varietyKey` over the combined answer so a cell never freezes two near-twins.
 */

export const RAT3_NODE = "RAT.3";

/** A variable term in LaTeX: `3x`, or a bare `x` when the coefficient is 1. */
function vt(coeff: number): string {
  return coeff === 1 ? "x" : `${coeff}x`;
}

/** The same term for a math.js answer key, where multiplication is explicit. */
function keyTerm(coeff: number): string {
  return coeff === 1 ? "x" : `${coeff}*x`;
}

/** A trailing signed constant in LaTeX, e.g. `+ 7` or `- 7`. */
function tail(value: number): string {
  return value < 0 ? `- ${-value}` : `+ ${value}`;
}

/**
 * L1: both shares are already measured against the same cask, so the common measure is
 * given and only the numerators combine. Draws addition or subtraction (`op`), and for a
 * subtraction the larger share is drawn first so what is left stays positive.
 */
export const d5_rat3_samedenom_l1: ItemTemplate = {
  template_id: "d5.rat3.samedenom.l1",
  node_id: RAT3_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const c = rng.int(1, 9);
    const op = rng.int(0, 1); // 0 = pour both in (add), 1 = skim one off (subtract)
    let a = rng.int(2, 11);
    let b = rng.int(2, 11);
    while (b === a) {
      b = rng.int(2, 11);
    }
    if (op === 1 && a < b) {
      [a, b] = [b, a];
    }
    const total = op === 1 ? a - b : a + b;
    // The subtract draw reads "Subtract A from B", so the fraction printed FIRST is the one
    // being taken away. Naming the move rather than a position keeps the hint true either
    // way round, and the wording is a shape word rather than an instance value.
    const combine =
      op === 1
        ? "the numerator of the fraction you are subtracting comes off the other one"
        : "add the two numerators";
    const prompt =
      op === 1
        ? `Subtract $\\dfrac{${b}}{x + ${c}}$ from $\\dfrac{${a}}{x + ${c}}$ and write the result as a single fraction. State the excluded value.`
        : `Add $\\dfrac{${a}}{x + ${c}} + \\dfrac{${b}}{x + ${c}}$ and write the result as a single fraction. State the excluded value.`;
    return {
      prompt,
      answer: rationalAnswer(`${total}/(x + ${c})`, [`${-c}`], ["x"]),
      params: { a, b, c, op, total },
      hints: [
        "Both expressions already share the same denominator, so the LCD is already in place.",
        `Keep that denominator exactly as it is and work only on the numerators: ${combine}.`,
        "The excluded value comes from the original denominator: find the value of $x$ that would make it zero.",
      ],
      worked_solution: [
        `Both expressions already sit over $x + ${c}$, so no LCD change is needed.`,
        op === 1
          ? `Subtract the numerators: $${a} - ${b} = ${total}$.`
          : `Add the numerators: $${a} + ${b} = ${total}$.`,
        `Combined: $\\dfrac{${total}}{x + ${c}}$.`,
        `The original denominator $x + ${c}$ is zero at $x = -${c}$, so $x \\neq -${c}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.op}:${params.total}:${params.c}`,
};

/**
 * L2a: same denominator, but BOTH numerators have two terms and the second one is
 * subtracted, so the minus has to be distributed across the whole bracket. Drawn with
 * `a > d` and `e > b`, so the combined numerator leads positive and its constant is
 * negative: a learner who forgets to distribute lands on `+ (e - b)` and is visibly wrong.
 */
export const d5_rat3_numerator_l2: ItemTemplate = {
  template_id: "d5.rat3.numerator.l2",
  node_id: RAT3_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const c = rng.int(1, 8);
    const a = rng.int(4, 9);
    const d = rng.int(1, a - 1);
    const e = rng.int(3, 9);
    const b = rng.int(1, e - 1);
    const lead = a - d; // >= 1
    const drop = e - b; // >= 1, so the combined constant is negative
    return {
      prompt: `Subtract $\\dfrac{${vt(d)} + ${e}}{x + ${c}}$ from $\\dfrac{${vt(a)} + ${b}}{x + ${c}}$ and write the result as a single fraction. State the excluded value.`,
      answer: rationalAnswer(`(${keyTerm(lead)} - ${drop})/(x + ${c})`, [`${-c}`], ["x"]),
      params: { a, b, c, d, e, lead, drop },
      hints: [
        "The two expressions already share the same denominator, so no LCD change is needed here.",
        "You are subtracting the whole second numerator, not just its first term, so wrap it in brackets before the minus goes in.",
        "Let the minus reach every term inside the brackets, then collect the $x$ terms and the plain numbers separately.",
      ],
      worked_solution: [
        `Same denominator, so combine over $x + ${c}$: $\\dfrac{(${vt(a)} + ${b}) - (${vt(d)} + ${e})}{x + ${c}}$.`,
        `Let the minus reach both terms in the bracket: $${vt(a)} + ${b} - ${vt(d)} - ${e}$.`,
        `Collect like terms: $${vt(a)} - ${vt(d)} = ${vt(lead)}$ and $${b} - ${e} = -${drop}$.`,
        `Combined: $\\dfrac{${vt(lead)} - ${drop}}{x + ${c}}$.`,
        `The original denominator $x + ${c}$ is zero at $x = -${c}$, so $x \\neq -${c}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.lead}:${params.drop}:${params.c}`,
};

/**
 * L2b: two casks measured differently, one over a bare `x` and one over a binomial, added.
 * The common measure is the product because the denominators share no factor. The combined
 * numerator `(a + b)x + ap` can never vanish at `0` or at `-p`, so it never cancels.
 */
export const d5_rat3_unlike_l2: ItemTemplate = {
  template_id: "d5.rat3.unlike.l2",
  node_id: RAT3_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const a = rng.int(2, 7);
    const b = rng.int(2, 7);
    const p = rng.int(1, 6);
    const lead = a + b;
    const constant = a * p;
    return {
      prompt: `Add $\\dfrac{${a}}{x} + \\dfrac{${b}}{x + ${p}}$ and write the result as a single fraction. State both excluded values.`,
      answer: rationalAnswer(
        `(${keyTerm(lead)} + ${constant})/(x*(x + ${p}))`,
        ["0", `${-p}`],
        ["x"],
      ),
      params: { a, b, p, lead, constant },
      hints: [
        "The denominators are different, so find the LCD first. These denominators share no factor, so the LCD is simply their product.",
        "Rewrite each expression over the LCD by multiplying its numerator by whatever its own denominator was missing.",
        "Add the numerators over the LCD and collect the $x$ terms. Each original denominator excludes one value, so name both.",
      ],
      worked_solution: [
        `The denominators share no factor, so the LCD is $x(x + ${p})$.`,
        `Rewrite both expressions: $\\dfrac{${a}}{x} = \\dfrac{${a}(x + ${p})}{x(x + ${p})}$ and $\\dfrac{${b}}{x + ${p}} = \\dfrac{${b}x}{x(x + ${p})}$.`,
        `Add the numerators: $${a}(x + ${p}) + ${b}x = ${vt(a)} + ${constant} + ${vt(b)} = ${vt(lead)} + ${constant}$.`,
        `Combined: $\\dfrac{${vt(lead)} + ${constant}}{x(x + ${p})}$.`,
        `The original denominators $x$ and $x + ${p}$ are zero at $x = 0$ and $x = -${p}$, so $x \\neq 0$ and $x \\neq -${p}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.lead}:${params.constant}:${params.p}`,
};

/**
 * L3a: two DISTINCT binomial denominators, subtracted. Both shares have to be re-expressed
 * and then the minus has to be distributed across the two-term product `b(x + p)`, which is
 * the same trap as L2a with an extra re-measuring step in front of it. `p !== q` keeps the
 * combined numerator from ever cancelling with either factor, and `aq != bp` keeps its
 * constant from vanishing.
 */
export const d5_rat3_subtract_l3: ItemTemplate = {
  template_id: "d5.rat3.subtract.l3",
  node_id: RAT3_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const a = rng.int(3, 9);
    const b = rng.int(2, a - 1);
    const p = rng.int(1, 7);
    let q = rng.int(1, 7);
    while (q === p || a * q - b * p === 0) {
      q = rng.int(1, 7);
    }
    const lead = a - b; // >= 1
    const constant = a * q - b * p; // nonzero, either sign
    return {
      prompt: `Compute $\\dfrac{${a}}{x + ${p}} - \\dfrac{${b}}{x + ${q}}$ and write the result as a single fraction. State both excluded values.`,
      answer: rationalAnswer(
        `(${keyTerm(lead)} ${constant < 0 ? "-" : "+"} ${Math.abs(constant)})/((x + ${p})*(x + ${q}))`,
        [`${-p}`, `${-q}`],
        ["x"],
      ),
      params: { a, b, p, q, lead, constant },
      hints: [
        "The denominators are different, so find the LCD first. They share no factor, so the LCD is the product of the two denominators.",
        "Rewrite each expression over the LCD, then put the second numerator in brackets before you subtract it.",
        "Let the minus reach both terms of the bracketed numerator, then collect the $x$ terms and the plain numbers. Each original denominator excludes one value.",
      ],
      worked_solution: [
        `The denominators share no factor, so the LCD is $(x + ${p})(x + ${q})$.`,
        `Rewrite both expressions: $\\dfrac{${a}}{x + ${p}} = \\dfrac{${a}(x + ${q})}{(x + ${p})(x + ${q})}$ and $\\dfrac{${b}}{x + ${q}} = \\dfrac{${b}(x + ${p})}{(x + ${p})(x + ${q})}$.`,
        `Subtract the whole second numerator: $${a}(x + ${q}) - ${b}(x + ${p}) = ${vt(a)} + ${a * q} - ${vt(b)} - ${b * p}$.`,
        `Collect like terms: $${vt(a)} - ${vt(b)} = ${vt(lead)}$ and $${a * q} - ${b * p} = ${constant}$.`,
        `Combined: $\\dfrac{${vt(lead)} ${tail(constant)}}{(x + ${p})(x + ${q})}$.`,
        `The original denominators are zero at $x = -${p}$ and $x = -${q}$, so $x \\neq -${p}$ and $x \\neq -${q}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.lead}:${params.constant}:${params.p}:${params.q}`,
};

/**
 * L3b: the denominators OVERLAP, and the overlap is hidden until the second one is
 * factored (`x^2 + px = x(x + p)`). The common measure is therefore the factored
 * denominator itself, not the product of the two, and only the first scoop is re-expressed.
 * The excluded values still come from the original denominators, which is why `x = 0` has
 * to be named even though the combined denominator makes that obvious only once factored.
 */
export const d5_rat3_factorlcd_l3: ItemTemplate = {
  template_id: "d5.rat3.factorlcd.l3",
  node_id: RAT3_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const a = rng.int(2, 8);
    const b = rng.int(2, 9);
    const p = rng.int(2, 7);
    const constant = a * p + b;
    return {
      prompt: `Add $\\dfrac{${a}}{x} + \\dfrac{${b}}{x^2 + ${p}x}$ and write the result as a single fraction. State both excluded values.`,
      answer: rationalAnswer(
        `(${keyTerm(a)} + ${constant})/(x*(x + ${p}))`,
        ["0", `${-p}`],
        ["x"],
      ),
      params: { a, b, p, constant },
      hints: [
        "The second denominator is not yet in its simplest parts. Factor out what both of its terms share.",
        "Once it is factored you can see the two denominators overlap, so the LCD is smaller than their product: it is the factored denominator itself.",
        "Only the first expression needs rewriting. Multiply its numerator by the missing factor, add, then read one excluded value off each original denominator.",
      ],
      worked_solution: [
        `Factor the second denominator: $x^2 + ${p}x = x(x + ${p})$.`,
        `Both denominators divide $x(x + ${p})$, so that is the LCD, not the product of the two.`,
        `Rewrite the first expression: $\\dfrac{${a}}{x} = \\dfrac{${a}(x + ${p})}{x(x + ${p})}$. The second expression already sits over that denominator.`,
        `Add the numerators: $${a}(x + ${p}) + ${b} = ${vt(a)} + ${a * p} + ${b} = ${vt(a)} + ${constant}$.`,
        `Combined: $\\dfrac{${vt(a)} + ${constant}}{x(x + ${p})}$.`,
        `The original denominators $x$ and $x(x + ${p})$ are zero at $x = 0$ and $x = -${p}$, so $x \\neq 0$ and $x \\neq -${p}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a}:${params.constant}:${params.p}`,
};

/** Every RAT.3 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const RAT3_TEMPLATES: readonly ItemTemplate[] = [
  d5_rat3_samedenom_l1,
  d5_rat3_numerator_l2,
  d5_rat3_unlike_l2,
  d5_rat3_subtract_l3,
  d5_rat3_factorlcd_l3,
];
