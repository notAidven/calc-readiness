import type { ExprBuilderSpec, PositivePowerSpec } from "@cr/components";

import { expressionVariable } from "../../../promptFormat";
import {
  type ItemTemplate,
  interactiveAnswer,
  positiveExponentAnswer,
  type Rng,
} from "../../../template";

/**
 * EXP.1 practice templates for the "Boomtown Square" island (exponent rules to
 * positive-exponent form). Five problem shapes across the locked 1xL1 / 2xL2 / 2xL3
 * practice mix, teaching TOWARD the already-frozen EXP.1 product assessment (which this
 * pool never touches). Four shapes are text-graded through the v2 product checker's
 * `positive_exponents` path; the L3 build shape is WIDGET-GRADED through the
 * `expr_builder` interactive module (base + positive exponent).
 *
 * Every key is computed by real arithmetic so `validateTemplates` grades each sampled
 * instance correct, and every exponent is kept within the checker's MAX_EXPONENT (8).
 * Each template declares a `varietyKey` over the SIMPLIFIED answer, and the D2 pool
 * ENFORCES it (see `d2/practice.ts`), so a cell never freezes two instances that reduce
 * to the same thing. A varietyKey therefore has to admit at least as many distinct
 * values as the pool draws per template, which is why the power-of-a-power shape varies
 * its base symbol as well as its product: MAX_EXPONENT leaves only three distinct
 * products on its own.
 *
 * Wording is PLAIN FIRST: every prompt states the mathematics in everyday words and adds
 * flavour only where flavour costs the learner nothing. The 2026-07-26 pass dropped the
 * mining vocabulary (claims, strikes, a played-out claim) that a remedial reader had to
 * decode before reaching the math; the quantities, keys, difficulties, hint structure and
 * worked-solution steps are unchanged.
 */

export const EXP1_NODE = "EXP.1";

/** L1, product rule: two powers of one base, combined to a single positive exponent. */
export const d2_exp_product_l1: ItemTemplate = {
  template_id: "d2.exp.product.l1",
  node_id: EXP1_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const a = rng.int(1, 4);
    const b = rng.int(1, 4);
    const sum = a + b;
    return {
      prompt: `Multiply $x^{${a}} \\cdot x^{${b}}$. Write the answer as a single power of $x$.`,
      answer: positiveExponentAnswer(`x^${sum}`, ["x"]),
      params: { a, b, sum },
      hints: [
        "Multiplying two powers of the same base keeps the base and combines the exponents.",
        "Add the two exponents to get a single exponent for $x$.",
      ],
      worked_solution: [
        "The base $x$ is the same in both factors, so keep $x$ and add the exponents.",
        `$${a} + ${b} = ${sum}$.`,
        `Answer: $x^{${sum}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.sum}`,
};

/** L2a, net exponent: a positive and a negative like-base power, to positive form. */
export const d2_exp_net_l2: ItemTemplate = {
  template_id: "d2.exp.net.l2",
  node_id: EXP1_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    let a = rng.int(1, 7);
    let b = rng.int(1, 7);
    // A genuine net exponent of magnitude >= 2 (avoid x^1 / 1/x^1 / x^0).
    while (Math.abs(a - b) < 2) {
      a = rng.int(1, 7);
      b = rng.int(1, 7);
    }
    const net = a - b;
    const key = net > 0 ? `x^${net}` : `1/x^${-net}`;
    return {
      prompt: `Simplify $x^{${a}} \\cdot x^{-${b}}$. Write the answer with positive exponents only.`,
      answer: positiveExponentAnswer(key, ["x"]),
      params: { a, b, net },
      hints: [
        "Same base, so add the exponents, but notice that one of them is negative.",
        "If the total comes out negative, move the power to the bottom of a fraction so the exponent reads positive.",
      ],
      worked_solution: [
        `Add the exponents: $${a} + (-${b}) = ${net}$.`,
        net > 0
          ? `A positive total stays on top: $x^{${net}}$.`
          : `A negative total moves to the bottom: $\\frac{1}{x^{${-net}}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.net}`,
};

/**
 * L2b, power of a power: multiply the exponents. MAX_EXPONENT (8) leaves only three
 * distinct products for `(v^a)^b` with a, b >= 2, so the base symbol varies too: the
 * variety guard needs more distinct keys than a cell draws, and which letter carries the
 * power is exactly the kind of surface change that keeps two slots from feeling like one
 * problem twice.
 */
export const d2_exp_power_l2: ItemTemplate = {
  template_id: "d2.exp.power.l2",
  node_id: EXP1_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const varIndex = rng.int(0, 2);
    const symbol = expressionVariable(varIndex);
    const a = rng.int(2, 4);
    const bMax = Math.floor(8 / a); // keep the product within MAX_EXPONENT (8)
    const b = rng.int(2, Math.max(2, bMax));
    const prod = a * b;
    return {
      prompt: `Simplify $(${symbol}^{${a}})^{${b}}$. Write the answer as a single power of $${symbol}$.`,
      answer: positiveExponentAnswer(`${symbol}^${prod}`, [symbol]),
      params: { a, b, prod, varIndex },
      hints: [
        "A power raised to another power multiplies the two exponents.",
        "Multiply the inside exponent by the outside one.",
      ],
      worked_solution: [
        `A power of a power multiplies the exponents: $${a} \\times ${b} = ${prod}$.`,
        `Answer: $${symbol}^{${prod}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.varIndex}:${params.prod}`,
};

/** L3a, two letters: one positive power, one negative power, to a fraction. */
export const d2_exp_twovar_l3: ItemTemplate = {
  template_id: "d2.exp.twovar.l3",
  node_id: EXP1_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const a = rng.int(2, 5);
    const b = rng.int(2, 5);
    return {
      prompt: `Simplify $x^{${a}} \\cdot y^{-${b}}$. Write the answer with positive exponents only.`,
      answer: positiveExponentAnswer(`x^${a}/y^${b}`, ["x", "y"]),
      params: { a, b },
      hints: [
        "No exponent rule reaches across two different bases, so there is nothing here to combine.",
        "That leaves each variable to be judged on its own exponent: read the sign of each one and decide where that factor belongs.",
      ],
      worked_solution: [
        `$x^{${a}}$ already has a positive exponent, so it stays on top.`,
        `$y^{-${b}}$ moves to the bottom as $y^{${b}}$.`,
        `Answer: $\\frac{x^{${a}}}{y^{${b}}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a}-${params.b}`,
};

/**
 * L3b, WIDGET-GRADED build: THREE factors on one base, assembled as a base raised to a
 * single positive exponent and scored by the `expr_builder` interactive module.
 *
 * The third factor is what makes this an L3. The shape it replaced was `v^a * v^-b` with
 * the net forced into [2, 7], which is the L2 `d2.exp.net.l2` slot directly above it with
 * its reciprocal branch removed: L2 draws |a - b| >= 2 in EITHER direction, so L2 could
 * land on 1/x^k and L3 never could, and only the input modality told them apart. RAD.1's
 * own L3 build carries the same note about the same defect; EXP.1 was never brought up to
 * it. Here the running total goes NEGATIVE after two factors (a - b <= -2) and the third
 * factor brings it back, so the learner has to carry a negative partial through rather
 * than adding up-only, and the answer is still a positive power the builder can hold.
 *
 * Every displayed exponent stays within the checker's MAX_EXPONENT (8). The base symbol
 * varies for the same reason the power-of-a-power shape's does: the net alone admits only
 * five distinct answers, and a cell draws six variants.
 */
export const d2_exp_build_l3: ItemTemplate = {
  template_id: "d2.exp.build.l3",
  node_id: EXP1_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const varIndex = rng.int(0, 2);
    const symbol = expressionVariable(varIndex);
    const a = rng.int(1, 4);
    // `drop` is how far below zero the first two factors take the total (at least 2, so
    // the negative partial is genuine and not an off-by-one).
    const drop = rng.int(2, Math.min(6, 8 - a));
    const b = a + drop;
    // net = c - drop, in [2, 8 - drop]: a positive power, with c itself within 8.
    const c = rng.int(drop + 2, 8);
    const net = c - drop;
    const spec: PositivePowerSpec = { kind: "positive_power", base: symbol, exp: net };
    return {
      prompt: `Simplify $${symbol}^{${a}} \\cdot ${symbol}^{-${b}} \\cdot ${symbol}^{${c}}$. Build the answer as a base raised to a single positive exponent.`,
      answer: interactiveAnswer("expr_builder", spec satisfies ExprBuilderSpec),
      params: { a, b, c, net, drop, varIndex },
      hints: [
        "The base is the same in all three factors, so all three exponents add into one total.",
        "Add them one at a time and keep the running total signed. A partial total on the way through is allowed to be negative; it is the total at the end that has to be read.",
        `Put $${symbol}$ in the base slot and the total you worked out in the exponent slot.`,
      ],
      worked_solution: [
        `One base, three factors, so add all three exponents: $${a} + (-${b}) + ${c}$.`,
        `The first two give $${a} + (-${b}) = -${drop}$, a negative running total.`,
        `The last one brings it back up: $-${drop} + ${c} = ${net}$.`,
        `Enter base $${symbol}$ and exponent $${net}$ to build $${symbol}^{${net}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.varIndex}:${params.net}`,
};

/**
 * The net exponents the quotient shape draws, one per retry variant. A zero is the
 * reason the shape exists; the negatives keep the reciprocal step live at L2, and
 * |net| >= 2 keeps a bare `v` or `1/v` (both trivial) off the answer list.
 */
const QUOTIENT_NETS: readonly number[] = [0, -4, -3, -2, 2, 3];

/**
 * L2c, the QUOTIENT rule, and the only graded surface in EXP.1 that reaches `x^0 = 1`.
 *
 * Slide 0 teaches `x^a / x^b = x^(a-b)` and slide 2 teaches `x^0 = 1`. Both are drilled
 * in a gated widget and NEITHER was graded anywhere: no CFU and none of the five practice
 * shapes divided two powers, and `d2.exp.net.l2` deliberately excludes a net of 0 to keep
 * its own answers non-trivial. So a learner could finish EXP.1 having been taught two
 * rules that were never asked back.
 *
 * This is the THIRD shape in the L2 cell. `buildPool` takes a cell's shapes round-robin
 * and L2 has two slots, so this one never enters the canonical five; it is served from
 * the randomized set through its retry variants, exactly as `d2.rad2.unlike.l2` is. That
 * also keeps every frozen pool item byte-identical.
 *
 * {@link QUOTIENT_NETS} holds exactly `D2_PRACTICE_RETRY_VARIANTS_PER_CELL` values and
 * the `varietyKey` IS the net, so the six variants a cell draws are the six nets: a zero
 * exponent is served by construction rather than by seed luck, and the existing
 * "no silent shortfall" guard fails if that ever stops being true.
 */
export const d2_exp_quotient_l2: ItemTemplate = {
  template_id: "d2.exp.quotient.l2",
  node_id: EXP1_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const varIndex = rng.int(0, 2);
    const symbol = expressionVariable(varIndex);
    const net = rng.pick(QUOTIENT_NETS);
    // Keep both displayed exponents in [2, 8]: within the checker's MAX_EXPONENT, and
    // never printing `v^{1}`, which no lesson writes.
    const b = rng.int(Math.max(4, 2 - net), Math.min(6, 8 - net));
    const a = b + net;
    const key = net === 0 ? "1" : net > 0 ? `${symbol}^${net}` : `1/${symbol}^${-net}`;
    return {
      prompt: `Simplify $\\dfrac{${symbol}^{${a}}}{${symbol}^{${b}}}$. Write the answer with positive exponents only.`,
      answer: positiveExponentAnswer(key, [symbol]),
      params: { a, b, net, varIndex },
      // Not branched on `net`, deliberately. Each branch read innocently on its own, but
      // WHICH one was served was itself the tell: only the zero case sent the learner to
      // look up the zero-exponent rule, so being sent there announced the answer before
      // they had subtracted anything. A hint selected by the answer leaks the answer.
      hints: [
        "Dividing two powers of the same base subtracts the exponents, top minus bottom.",
        "Subtract, then read the total you get. A total above zero, a total below it and a total of exactly zero are each written a different way, so settle which one you have before writing anything down.",
      ],
      worked_solution: [
        `Same base, so subtract the exponents: $${a} - ${b} = ${net}$.`,
        net === 0
          ? `Any base to the power $0$ is $1$, so $${symbol}^{0} = 1$.`
          : net > 0
            ? `A positive exponent stays on top: $${symbol}^{${net}}$.`
            : `A negative exponent moves to the bottom: $\\frac{1}{${symbol}^{${-net}}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.net}`,
};

/**
 * Every EXP.1 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b, then
 * the APPENDED L2c). The quotient shape is appended rather than inserted next to its
 * difficulty siblings so `buildPool`'s round-robin still takes L2a and L2b for the two
 * frozen L2 slots and every canonical pool item stays byte-identical.
 */
export const EXP1_TEMPLATES: readonly ItemTemplate[] = [
  d2_exp_product_l1,
  d2_exp_net_l2,
  d2_exp_power_l2,
  d2_exp_twovar_l3,
  d2_exp_build_l3,
  d2_exp_quotient_l2,
];
