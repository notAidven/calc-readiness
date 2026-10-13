import type { CoeffRadicalSpec, ExprBuilderSpec } from "@cr/components";

import {
  type ItemTemplate,
  interactiveAnswer,
  type Rng,
  radicalAnswer,
} from "../../../template";

/**
 * RAD.2 practice templates for the "Boomtown Square" island (add root terms; clear a root
 * off the bottom of a fraction). Six problem shapes across the locked 1xL1 / 2xL2 / 2xL3
 * practice mix, teaching TOWARD the RAD.2 product assessment. Five shapes are text-graded
 * through the v2 product checker's `simplified_radical` path (combine like radicals,
 * simplify-then-combine, simplify-but-do-NOT-combine, and two rationalize shapes); the L3
 * build shape is WIDGET-GRADED through the `expr_builder` module's `coeff_radical` shape.
 *
 * The L2 cell holds THREE shapes rather than two, because the node's central misconception
 * (sqrt(2) + sqrt(3) is not sqrt(5)) had no practice representation at all: every combine
 * shape built both terms on the same square-free part, so "do these combine?" was never a
 * live question, even though the frozen RAD.2 assessment grades an unlike pair. The
 * randomized set draws one instance per shape before a second from any (see
 * `d2/practice.ts`), so all three L2 shapes reach a learner.
 *
 * Every key is computed by real arithmetic so `validateTemplates` grades each sampled
 * instance correct: like radicals share a square-free root so the sum combines exactly,
 * unlike ones stay as a two-term simplified sum, and every rationalized denominator clears
 * to a whole number. Each template declares a `varietyKey` over the simplified answer, and
 * the D2 pool ENFORCES it, so a cell never freezes two near-twin instances.
 *
 * Wording is PLAIN FIRST: the math leads and the only flavour is an everyday noun. The
 * 2026-07-26 pass dropped the mining vocabulary (support timbers, assays, ore grades); a
 * later pass the same day gave the three two-length COMBINE shapes a fence rail instead of
 * a beam, since rails come in matched runs and that is the like-radical idea itself. The
 * three-term build keeps its beams. The quantities, keys, difficulties, hint structure and
 * worked-solution steps are unchanged throughout.
 */

export const RAD2_NODE = "RAD.2";

/** Square-free radicands m: no perfect-square factor, so k*sqrt(m) stays simplified. */
const SQUARE_FREE: readonly number[] = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15];

/** L1, combine two already-simplified like radicals: a*sqrt(m) + b*sqrt(m). */
export const d2_rad2_combine_like_l1: ItemTemplate = {
  template_id: "d2.rad2.combine-like.l1",
  node_id: RAD2_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const a = rng.int(2, 6);
    const b = rng.int(2, 6);
    const m = rng.pick(SQUARE_FREE);
    const sum = a + b;
    return {
      prompt: `Two fence rails are $${a}\\sqrt{${m}}$ m and $${b}\\sqrt{${m}}$ m long. Add them and write the total as a simplified radical.`,
      answer: radicalAnswer(`${sum}*sqrt(${m})`),
      params: { a, b, m, sum },
      hints: [
        "Both terms hold the same square root, so they are like radicals and they add.",
        "Add the numbers in front and keep the same root.",
      ],
      worked_solution: [
        `The roots match, so add the numbers in front: $${a} + ${b} = ${sum}$.`,
        `The shared root $\\sqrt{${m}}$ stays as it is.`,
        `Total: $${sum}\\sqrt{${m}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.sum}:${params.m}`,
};

/** L2a, simplify each radical, then combine: sqrt(p^2 m) + sqrt(q^2 m) = (p+q)*sqrt(m). */
export const d2_rad2_simplify_combine_l2: ItemTemplate = {
  template_id: "d2.rad2.simplify-combine.l2",
  node_id: RAD2_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const m = rng.pick(SQUARE_FREE);
    const p = rng.int(2, 4);
    let q = rng.int(2, 4);
    // Keep the two terms genuinely different before simplifying.
    while (p === q) {
      q = rng.int(2, 4);
    }
    const first = p * p * m;
    const second = q * q * m;
    const sum = p + q;
    return {
      prompt: `Two fence rails are $\\sqrt{${first}}$ m and $\\sqrt{${second}}$ m long. Add them and write the total as a simplified radical.`,
      answer: radicalAnswer(`${sum}*sqrt(${m})`),
      params: { m, p, q, first, second, sum },
      hints: [
        "Simplify each root first: pull the perfect square out from under it.",
        "Then compare what is left inside the two roots. Terms combine only where those agree, so that comparison is the step that decides whether this is one term or two.",
      ],
      worked_solution: [
        `Simplify each: $\\sqrt{${first}} = ${p}\\sqrt{${m}}$ and $\\sqrt{${second}} = ${q}\\sqrt{${m}}$.`,
        `The roots match now, so add: $${p} + ${q} = ${sum}$.`,
        `Total: $${sum}\\sqrt{${m}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.sum}:${params.m}`,
};

/**
 * L2c, simplify each radical and find they do NOT combine: sqrt(p^2 a) + sqrt(q^2 b)
 * with a != b stays a two-term sum. This is the shape the frozen RAD.2 assessment
 * grades (`prod.golden.rad-2.unlike`) and the one the rest of the pool never asked, so a
 * learner met "these do not combine" for the first time in a graded item.
 */
export const d2_rad2_unlike_l2: ItemTemplate = {
  template_id: "d2.rad2.unlike.l2",
  node_id: RAD2_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const a = rng.pick(SQUARE_FREE);
    let b = rng.pick(SQUARE_FREE);
    // The two square-free parts MUST differ, or the terms would combine after all.
    while (b === a) {
      b = rng.pick(SQUARE_FREE);
    }
    const p = rng.int(2, 4);
    const q = rng.int(2, 4);
    const first = p * p * a;
    const second = q * q * b;
    return {
      prompt: `Two fence rails are $\\sqrt{${first}}$ m and $\\sqrt{${second}}$ m long. Add them and write the total as simply as it will go.`,
      answer: radicalAnswer(`${p}*sqrt(${a})+${q}*sqrt(${b})`),
      params: { a, b, p, q, first, second },
      hints: [
        "Simplify each root first: pull the perfect square out from under it.",
        "Now compare what is left inside each root. Terms only add when those match.",
      ],
      worked_solution: [
        `Simplify each: $\\sqrt{${first}} = ${p}\\sqrt{${a}}$ and $\\sqrt{${second}} = ${q}\\sqrt{${b}}$.`,
        `What is left inside the roots is $${a}$ and $${b}$, which are different, so these are unlike radicals.`,
        `Unlike radicals do not add into one term, so $${p}\\sqrt{${a}} + ${q}\\sqrt{${b}}$ is the finished answer.`,
      ],
    };
  },
  varietyKey: (params) => `${params.p}:${params.a}:${params.q}:${params.b}`,
};

/** L2b, rationalize a unit denominator: 1/sqrt(p) = sqrt(p)/p (p square-free). */
export const d2_rad2_rationalize_unit_l2: ItemTemplate = {
  template_id: "d2.rad2.rationalize-unit.l2",
  node_id: RAD2_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const p = rng.pick(SQUARE_FREE);
    return {
      prompt: `Rationalize the denominator of $\\dfrac{1}{\\sqrt{${p}}}$ and write the result as a simplified radical.`,
      answer: radicalAnswer(`sqrt(${p})/${p}`),
      params: { p },
      hints: [
        "A root is not allowed to sit on the bottom, so clear it.",
        "Multiply the top and the bottom by that same root. The bottom then becomes a whole number.",
      ],
      worked_solution: [
        `Multiply top and bottom by $\\sqrt{${p}}$: $\\dfrac{1}{\\sqrt{${p}}} \\cdot \\dfrac{\\sqrt{${p}}}{\\sqrt{${p}}}$.`,
        `The bottom becomes $\\sqrt{${p}} \\cdot \\sqrt{${p}} = ${p}$.`,
        `Rationalized: $\\dfrac{\\sqrt{${p}}}{${p}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.p}`,
};

/** L3a, rationalize with a coefficient: (t*p)/sqrt(p) = t*sqrt(p). */
export const d2_rad2_rationalize_coeff_l3: ItemTemplate = {
  template_id: "d2.rad2.rationalize-coeff.l3",
  node_id: RAD2_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const p = rng.pick(SQUARE_FREE);
    const t = rng.int(2, 4);
    const c = t * p;
    return {
      prompt: `Rationalize the denominator of $\\dfrac{${c}}{\\sqrt{${p}}}$ and write the result as a simplified radical.`,
      answer: radicalAnswer(`${t}*sqrt(${p})`),
      params: { p, t, c },
      hints: [
        "Clear the root off the bottom by multiplying top and bottom by that root.",
        "Once the bottom is a whole number, check whether the numbers on the top and the bottom share a factor.",
      ],
      worked_solution: [
        `Multiply top and bottom by $\\sqrt{${p}}$: the bottom becomes $${p}$ and the top becomes $${c}\\sqrt{${p}}$.`,
        `Reduce the number in front: $${c} \\div ${p} = ${t}$.`,
        `Rationalized: $${t}\\sqrt{${p}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.t}:${params.p}`,
};

/**
 * L3b, WIDGET-GRADED build: a THREE-term combine where two of the terms are still
 * unsimplified, assembled as a coefficient times a square root through the
 * `expr_builder` module's `coeff_radical` shape.
 *
 * The shape it replaced handed the learner two already-simplified like terms and stated
 * the index in the prompt, so the only work left was one addition, which is the L1
 * `d2.rad2.combine-like.l1` slot wearing an L3 tag. Here two roots have to be simplified
 * before the three numbers in front can be added at all.
 */
export const d2_rad2_build_l3: ItemTemplate = {
  template_id: "d2.rad2.build.l3",
  node_id: RAD2_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const m = rng.pick(SQUARE_FREE);
    const p = rng.int(2, 4);
    let q = rng.int(2, 4);
    // Keep the two unsimplified roots genuinely different readings.
    while (q === p) {
      q = rng.int(2, 4);
    }
    const mid = rng.int(2, 5);
    const first = p * p * m;
    const third = q * q * m;
    const sum = p + mid + q;
    const spec: CoeffRadicalSpec = {
      kind: "coeff_radical",
      coeff: sum,
      radicand: m,
      index: 2,
    };
    return {
      prompt: `Three wooden beams are $\\sqrt{${first}}$ m, $${mid}\\sqrt{${m}}$ m and $\\sqrt{${third}}$ m long. Add them and build the total as a coefficient times a square root (root index 2).`,
      answer: interactiveAnswer("expr_builder", spec satisfies ExprBuilderSpec),
      params: { p, q, mid, m, first, third, sum },
      hints: [
        "Check all three against the perfect squares before assuming any of them is ready, and pull out whatever any of them will give up.",
        "Then compare what is left inside all three. Only the ones that agree can have their numbers in front added.",
        "The shared root gives the radicand, and a square root has index 2.",
      ],
      worked_solution: [
        `Simplify the two that are not simplified yet: $\\sqrt{${first}} = ${p}\\sqrt{${m}}$ and $\\sqrt{${third}} = ${q}\\sqrt{${m}}$.`,
        `All three now hold $\\sqrt{${m}}$, so add the numbers in front: $${p} + ${mid} + ${q} = ${sum}$.`,
        `Build $${sum}\\sqrt{${m}}$: coefficient $${sum}$, radicand $${m}$, index $2$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.sum}:${params.m}`,
};

/**
 * Every RAD.2 practice template, in stable authoring order (L1, L2a-c, L3a, L3b).
 *
 * The unlike shape is THIRD in the L2 cell on purpose: the canonical frozen five-slot set
 * takes the first two shapes of each cell, and both halves of the node title (combine and
 * rationalize) have to survive in it. The randomized set a learner actually plays draws
 * one instance per shape before a second from any, so the unlike shape is served from the
 * cell's retry variants and is not canonical-set-only content.
 */
export const RAD2_TEMPLATES: readonly ItemTemplate[] = [
  d2_rad2_combine_like_l1,
  d2_rad2_simplify_combine_l2,
  d2_rad2_rationalize_unit_l2,
  d2_rad2_unlike_l2,
  d2_rad2_rationalize_coeff_l3,
  d2_rad2_build_l3,
];
