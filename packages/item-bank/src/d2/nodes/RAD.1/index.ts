import type { CoeffRadicalSpec, ExprBuilderSpec } from "@cr/components";

import {
  type ItemTemplate,
  interactiveAnswer,
  numericAnswer,
  type Rng,
  radicalAnswer,
} from "../../../template";

/**
 * RAD.1 practice templates for the "Boomtown Square" island (evaluate and simplify square
 * roots: getting a length back out of a root). Five problem shapes across the locked
 * 1xL1 / 2xL2 / 2xL3 practice mix, teaching TOWARD the already-frozen RAD.1 product
 * assessment (which this pool never touches: different prompts, ids, and content). Four
 * shapes are text-graded through the v2 product checker's `simplified_radical` path; the
 * L3 build shape is WIDGET-GRADED through the `expr_builder` module's `coeff_radical`
 * shape (a coefficient in front of a root).
 *
 * Every key is computed by real arithmetic so `validateTemplates` grades each sampled
 * instance correct, and every radicand is kept square-free so a simplified radical stays
 * simplified. Each template declares a `varietyKey` over the simplified answer, and the
 * D2 pool ENFORCES it (see `d2/practice.ts`), so a cell never freezes two near-twin
 * instances.
 *
 * Wording is PLAIN FIRST: the math leads and the flavour is an everyday noun (a staked
 * lot, a board, a beam) that needs no decoding. The 2026-07-26 pass dropped the mining
 * vocabulary (cross-sections, shafts, support timbers); a later pass the same day spread
 * the nouns out, because "beam" had been carrying nearly every concrete object in three
 * packs at once. The quantities, keys, difficulties, hint structure and worked-solution
 * steps are unchanged throughout.
 */

export const RAD1_NODE = "RAD.1";

/** Square-free radicands m: sqrt(k^2 * m) simplifies to exactly k*sqrt(m). */
const SQUARE_FREE: readonly number[] = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15];

/** L1, evaluate a perfect square root to a whole number (the side of a square). */
export const d2_rad1_eval_l1: ItemTemplate = {
  template_id: "d2.rad1.eval.l1",
  node_id: RAD1_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const k = rng.int(3, 12);
    const area = k * k;
    return {
      prompt: `A staked lot covers $${area}$ square meters, so each side is $\\sqrt{${area}}$ meters. Work out that length.`,
      answer: numericAnswer(`${k}`),
      params: { k, area },
      hints: [
        "A square root asks: what number times itself gives the number inside?",
        "Look for the number that times itself gives the area.",
      ],
      worked_solution: [
        `You want the number that times itself gives $${area}$.`,
        `$${k} \\times ${k} = ${area}$, so $\\sqrt{${area}} = ${k}$.`,
        `Each side is $${k}$ meters.`,
      ],
    };
  },
  varietyKey: (params) => `${params.k}`,
};

/** L2a, simplify sqrt(k^2 * m) to k*sqrt(m), m square-free. */
export const d2_rad1_simplify_l2: ItemTemplate = {
  template_id: "d2.rad1.simplify.l2",
  node_id: RAD1_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const k = rng.int(2, 5);
    const m = rng.pick(SQUARE_FREE);
    const radicand = k * k * m;
    return {
      prompt: `A board is $\\sqrt{${radicand}}$ meters long. Write that length as a simplified radical.`,
      answer: radicalAnswer(`${k}*sqrt(${m})`),
      params: { k, m, radicand },
      hints: [
        "Split the number under the root into a perfect square times whatever is left.",
        "The square root of the perfect square comes out in front of the root.",
      ],
      worked_solution: [
        `Take out a perfect square: $${radicand} = ${k * k} \\times ${m}$.`,
        `$\\sqrt{${k * k}} = ${k}$ comes out front, leaving $\\sqrt{${m}}$ inside.`,
        `Simplified: $${k}\\sqrt{${m}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.k}:${params.m}`,
};

/** L2b, quotient rule: sqrt(m / c^2) = sqrt(m) / c. */
export const d2_rad1_quotient_l2: ItemTemplate = {
  template_id: "d2.rad1.quotient.l2",
  node_id: RAD1_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const m = rng.pick(SQUARE_FREE);
    const c = rng.int(2, 4);
    const denom = c * c;
    return {
      prompt: `Simplify $\\sqrt{\\dfrac{${m}}{${denom}}}$. Write it as a simplified radical.`,
      answer: radicalAnswer(`sqrt(${m})/${c}`),
      params: { m, c, denom },
      hints: [
        "The square root of a fraction is the root of the top over the root of the bottom.",
        "Split it that way and then check each half against the perfect squares you know, the bottom included.",
      ],
      worked_solution: [
        `Split the root over the fraction: $\\sqrt{\\dfrac{${m}}{${denom}}} = \\dfrac{\\sqrt{${m}}}{\\sqrt{${denom}}}$.`,
        `$\\sqrt{${denom}} = ${c}$, and $${m}$ has no perfect square inside it, so the top stays under the root.`,
        `Simplified: $\\dfrac{\\sqrt{${m}}}{${c}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.m}:${params.c}`,
};

/** L3a, pull the perfect square out from under a coefficient: c*sqrt(k^2*m) = (c*k)*sqrt(m). */
export const d2_rad1_coeff_l3: ItemTemplate = {
  template_id: "d2.rad1.coeff.l3",
  node_id: RAD1_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const c = rng.int(2, 4);
    const k = rng.int(2, 3);
    const m = rng.pick(SQUARE_FREE);
    const radicand = k * k * m;
    const coeff = c * k;
    return {
      prompt: `A board is $${c}\\sqrt{${radicand}}$ meters long. Write that length as a simplified radical.`,
      answer: radicalAnswer(`${coeff}*sqrt(${m})`),
      params: { c, k, m, radicand, coeff },
      hints: [
        "Simplify the root first: pull the perfect square out from under it.",
        "Then multiply the number that came out by the number already in front.",
      ],
      worked_solution: [
        `Simplify the root: $\\sqrt{${radicand}} = ${k}\\sqrt{${m}}$.`,
        `Multiply the two numbers in front: $${c} \\times ${k} = ${coeff}$.`,
        `Simplified: $${coeff}\\sqrt{${m}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.coeff}:${params.m}`,
};

/** Prime multipliers for the L3 product shape: j prime keeps j*m square-free. */
const PRODUCT_MULTIPLIERS: readonly number[] = [2, 3, 5, 7];

/**
 * L3b, WIDGET-GRADED build: multiply TWO roots, then simplify the result and assemble
 * it as a coefficient times a square root, scored by the `expr_builder` module's
 * `coeff_radical` shape.
 *
 * The product step is what makes this an L3. The shape it replaced was `sqrt(k^2 m)`
 * built rather than typed, which is mathematically the same problem as the L2
 * `d2.rad1.simplify.l2` slot directly above it: only the input modality differed, so the
 * L3 half of a set was easier than its L2 half. Multiplying under one root first
 * (sqrt(a)*sqrt(b) = sqrt(ab), the rule slide 2 states) adds a genuine step, and both
 * displayed roots stay square-free because j is prime and does not divide m.
 */
export const d2_rad1_build_l3: ItemTemplate = {
  template_id: "d2.rad1.build.l3",
  node_id: RAD1_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const j = rng.pick(PRODUCT_MULTIPLIERS);
    let m = rng.pick(SQUARE_FREE);
    while (m === j || m % j === 0) {
      m = rng.pick(SQUARE_FREE);
    }
    const first = j * m;
    const radicand = j * j * m; // the value under one root after multiplying
    const spec: CoeffRadicalSpec = {
      kind: "coeff_radical",
      coeff: j,
      radicand: m,
      index: 2,
    };
    return {
      prompt: `Two beams measure $\\sqrt{${first}}$ m and $\\sqrt{${j}}$ m. Multiply them and simplify: build $\\sqrt{${first}} \\cdot \\sqrt{${j}}$ as a coefficient times a square root (root index 2).`,
      answer: interactiveAnswer("expr_builder", spec satisfies ExprBuilderSpec),
      params: { j, m, first, radicand, k: j },
      hints: [
        "Two roots multiplied become one root over the two numbers multiplied together.",
        "Once it is a single root, split that number into a perfect square times whatever is left.",
        "The root of the perfect square is the coefficient, what is left is the radicand, and a square root has index 2.",
      ],
      worked_solution: [
        `Multiply under one root: $\\sqrt{${first}} \\cdot \\sqrt{${j}} = \\sqrt{${first} \\times ${j}} = \\sqrt{${radicand}}$.`,
        `Take out a perfect square: $${radicand} = ${j * j} \\times ${m}$.`,
        `$\\sqrt{${j * j}} = ${j}$ is the coefficient and $${m}$ is the radicand, with root index 2.`,
        `Build $${j}\\sqrt{${m}}$: coefficient $${j}$, radicand $${m}$, index $2$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.j}:${params.m}`,
};

/** Every RAD.1 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const RAD1_TEMPLATES: readonly ItemTemplate[] = [
  d2_rad1_eval_l1,
  d2_rad1_simplify_l2,
  d2_rad1_quotient_l2,
  d2_rad1_coeff_l3,
  d2_rad1_build_l3,
];
