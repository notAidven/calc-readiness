import type { ExprBuilderSpec, RadicalFormSpec, RationalPowerSpec } from "@cr/components";

import { EXPONENT_LOWEST_TERMS_SUFFIX } from "../../../promptFormat";
import {
  type ItemTemplate,
  interactiveAnswer,
  numericAnswer,
  type Rng,
} from "../../../template";

/**
 * RAD.3 practice templates for the "Boomtown Square" island (fraction exponent to and from
 * radical form). This is the checker-nuance node: radical to rational-exponent FORM
 * conversion has NO text-checker predicate (a value-equivalence check would accept EITHER
 * form), so the two conversion shapes are graded by CONSTRUCTION through the
 * `expr_builder` widget: `radical_form` for "write in radical form" and `rational_power`
 * for "write in exponent form". Numeric EVALUATION (b^(p/q) and a negative rational power)
 * is graded by the text checker's exact-value path via `numericAnswer`. The L3 simplify
 * shape (x^(1/2)*x^(1/3)) is also widget-graded so the learner must produce the single
 * combined rational power, not an equivalent product the `positive_exponents` checker
 * would wave through.
 *
 * Every key is computed by real arithmetic (perfect powers whose rational power is a whole
 * number; fraction sums reduced to lowest terms), so `validateTemplates` grades each
 * sampled instance correct. Each template declares a `varietyKey`, and the D2 pool
 * ENFORCES it, so a case list has to be longer than the number of instances drawn from it.
 *
 * The two evaluation shapes SAY their arithmetic in the worked solution (the root's value
 * and the power applied to it). A reveal forfeits the slot, so that reveal is the one paid
 * look at the work, and stating only "the root is a whole number" spent it on nothing.
 *
 * Wording is PLAIN FIRST: these prompts are pure math tasks, since a story adds nothing to
 * "evaluate this". The 2026-07-26 pass dropped the mining vocabulary (the assayer's ore
 * grade, a played-out claim) and says "top"/"bottom" where it used to say
 * numerator/denominator in prose; the quantities, keys, difficulties, hint structure and
 * worked-solution steps are unchanged.
 */

export const RAD3_NODE = "RAD.3";

/**
 * Perfect-power bases whose rational power is a whole number: base = root^den, so
 * base^(num/den) = root^num. Kept small so the evaluated value stays readable, with
 * the exponent num/den in lowest terms and num !== den (a genuine fraction). `root` is
 * stored rather than recomputed because the worked solution has to SAY it: a reveal
 * forfeits the slot, so it is the student's one paid look at the arithmetic.
 */
const EVAL_CASES: readonly {
  base: number;
  num: number;
  den: number;
  root: number;
  value: number;
}[] = [
  { base: 8, num: 2, den: 3, root: 2, value: 4 },
  { base: 8, num: 4, den: 3, root: 2, value: 16 },
  { base: 27, num: 2, den: 3, root: 3, value: 9 },
  { base: 16, num: 3, den: 4, root: 2, value: 8 },
  { base: 16, num: 5, den: 4, root: 2, value: 32 },
  { base: 32, num: 2, den: 5, root: 2, value: 4 },
  { base: 32, num: 3, den: 5, root: 2, value: 8 },
  { base: 4, num: 3, den: 2, root: 2, value: 8 },
  { base: 9, num: 3, den: 2, root: 3, value: 27 },
  { base: 64, num: 2, den: 3, root: 4, value: 16 },
];

/**
 * A root in LaTeX. A square root is written BARE: `\sqrt[2]{x^3}` is legal but is not how
 * RAD.1 / RAD.2 draw a square root, so an explicit index of 2 would show a learner two
 * notations for one object inside a single domain.
 */
function radicalTex(radicand: string, index: number): string {
  return index === 2 ? `\\sqrt{${radicand}}` : `\\sqrt[${index}]{${radicand}}`;
}

/** Coprime (numerator, denominator) pairs for a genuine fractional exponent (den >= 2). */
const FRACTION_EXPONENTS: readonly { num: number; den: number }[] = [
  { num: 2, den: 3 },
  { num: 3, den: 2 },
  { num: 3, den: 4 },
  { num: 4, den: 3 },
  { num: 2, den: 5 },
  { num: 5, den: 2 },
  { num: 3, den: 5 },
  { num: 5, den: 3 },
  { num: 4, den: 5 },
  { num: 5, den: 4 },
];

/**
 * Unit/simple-fraction exponent pairs whose sum reduces to a proper rational power
 * in lowest terms: x^(a) * x^(b) = x^(sum). Pre-reduced so the widget key is exact.
 *
 * Several cases (1/3 + 1/6 = 3/6 and 1/2 + 1/6 = 4/6) only reach the key AFTER
 * reducing, so the prompt must SAY that lowest terms are required: the widget
 * comparator matches num/den exactly and would otherwise fail a student who
 * correctly computed the unreduced sum.
 */
const SUM_CASES: readonly {
  n1: number;
  d1: number;
  n2: number;
  d2: number;
  rn: number;
  rd: number;
}[] = [
  { n1: 1, d1: 2, n2: 1, d2: 3, rn: 5, rd: 6 },
  { n1: 1, d1: 2, n2: 1, d2: 4, rn: 3, rd: 4 },
  { n1: 1, d1: 3, n2: 1, d2: 6, rn: 1, rd: 2 },
  { n1: 1, d1: 2, n2: 1, d2: 6, rn: 2, rd: 3 },
  { n1: 1, d1: 3, n2: 1, d2: 4, rn: 7, rd: 12 },
  { n1: 2, d1: 5, n2: 1, d2: 5, rn: 3, rd: 5 },
  // Five more so the enforced variety guard has room: `varietyKey` is the reduced sum,
  // and the six cases above supply exactly six distinct keys for a draw that wants six.
  { n1: 1, d1: 4, n2: 1, d2: 6, rn: 5, rd: 12 },
  { n1: 1, d1: 2, n2: 2, d2: 5, rn: 9, rd: 10 },
  { n1: 1, d1: 3, n2: 1, d2: 5, rn: 8, rd: 15 },
  { n1: 1, d1: 4, n2: 1, d2: 5, rn: 9, rd: 20 },
  { n1: 1, d1: 2, n2: 1, d2: 5, rn: 7, rd: 10 },
];

/** L1, evaluate a positive rational power to a whole number: b^(p/q) = value. */
export const d2_rad3_eval_l1: ItemTemplate = {
  template_id: "d2.rad3.eval.l1",
  node_id: RAD3_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const { base, num, den, root, value } = rng.pick(EVAL_CASES);
    return {
      prompt: `Work out $${base}^{${num}/${den}}$.`,
      answer: numericAnswer(`${value}`),
      params: { base, num, den, root, value },
      hints: [
        "The bottom of the exponent is the root to take; the top is the power to raise to.",
        "Take the root of the base first, then raise that result to the top number.",
      ],
      worked_solution: [
        `Read the exponent: the bottom $${den}$ is the root to take, the top $${num}$ is the power to apply.`,
        `$\\sqrt[${den}]{${base}} = ${root}$, because $${root}^{${den}} = ${base}$.`,
        `Now apply the power: $${root}^{${num}} = ${value}$.`,
        `The answer is $${value}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.base}:${params.num}:${params.den}`,
};

/**
 * L2a, WIDGET-GRADED: write a rational power in radical form, x^(p/q) =
 * root(x^p, q), scored by the `expr_builder` module's `radical_form` shape.
 */
export const d2_rad3_to_radical_l2: ItemTemplate = {
  template_id: "d2.rad3.to-radical.l2",
  node_id: RAD3_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const { num, den } = rng.pick(FRACTION_EXPONENTS);
    const spec: RadicalFormSpec = {
      kind: "radical_form",
      base: "x",
      power: num,
      index: den,
    };
    return {
      prompt: `Write $x^{${num}/${den}}$ in radical form. Build root(base^power, index).`,
      answer: interactiveAnswer("expr_builder", spec satisfies ExprBuilderSpec),
      params: { num, den },
      hints: [
        "In radical form the base sits under the root.",
        "The top of the exponent becomes the power under the root; the bottom becomes the index of the root.",
      ],
      worked_solution: [
        `The base $x$ goes under the root.`,
        `The top number $${num}$ is the power under the root; the bottom number $${den}$ is the index of the root.`,
        `Radical form: $${radicalTex(`x^{${num}}`, den)}$, built as base $x$, power $${num}$, index $${den}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.num}:${params.den}`,
};

/**
 * L2b, WIDGET-GRADED: write a radical in rational-exponent form, root(x^p, q) =
 * x^(p/q), scored by the `expr_builder` module's `rational_power` shape.
 */
export const d2_rad3_to_exponent_l2: ItemTemplate = {
  template_id: "d2.rad3.to-exponent.l2",
  node_id: RAD3_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const { num, den } = rng.pick(FRACTION_EXPONENTS);
    const spec: RationalPowerSpec = {
      kind: "rational_power",
      base: "x",
      num,
      den,
    };
    return {
      prompt: `Write the root $${radicalTex(`x^{${num}}`, den)}$ in exponent form. Build base^(numerator/denominator).`,
      answer: interactiveAnswer("expr_builder", spec satisfies ExprBuilderSpec),
      params: { num, den },
      hints: [
        "In exponent form the base carries one fraction exponent.",
        "The power under the root goes on top; the index of the root goes on the bottom.",
      ],
      worked_solution: [
        `The base $x$ carries a fraction exponent.`,
        `The power $${num}$ under the root goes on top; the index $${den}$ goes on the bottom.`,
        `Exponent form: $x^{${num}/${den}}$, built as base $x$, numerator $${num}$, denominator $${den}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.num}:${params.den}`,
};

/** L3a, evaluate a NEGATIVE rational power to a unit fraction: b^(-p/q) = 1/value. */
export const d2_rad3_negeval_l3: ItemTemplate = {
  template_id: "d2.rad3.negeval.l3",
  node_id: RAD3_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const { base, num, den, root, value } = rng.pick(EVAL_CASES);
    return {
      prompt: `Work out $${base}^{-${num}/${den}}$. Write the answer as a fraction.`,
      answer: numericAnswer(`1/${value}`),
      params: { base, num, den, root, value },
      hints: [
        "A negative exponent means one over that power, whatever the rest of the exponent is doing.",
        "So set the sign aside, work out the fraction power on its own, and then put the whole thing where the negative sign says it belongs.",
      ],
      worked_solution: [
        `A negative exponent means one over the power: $${base}^{-${num}/${den}} = \\dfrac{1}{${base}^{${num}/${den}}}$.`,
        `Inside, take the root first: $\\sqrt[${den}]{${base}} = ${root}$, because $${root}^{${den}} = ${base}$.`,
        `Then apply the power: $${root}^{${num}} = ${value}$.`,
        `The answer is $\\dfrac{1}{${value}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.base}:${params.num}:${params.den}`,
};

/**
 * L3b, WIDGET-GRADED: multiply powers with the same base by adding fractional
 * exponents, x^(a) * x^(b) = x^(a+b), and produce the single combined rational
 * power (lowest terms), scored by the `expr_builder` module's `rational_power`
 * shape. A widget is required here because the `positive_exponents` text checker
 * would accept the uncombined product x^(a) * x^(b) as "already positive".
 */
export const d2_rad3_simplify_l3: ItemTemplate = {
  template_id: "d2.rad3.simplify.l3",
  node_id: RAD3_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const { n1, d1, n2, d2, rn, rd } = rng.pick(SUM_CASES);
    const spec: RationalPowerSpec = {
      kind: "rational_power",
      base: "x",
      num: rn,
      den: rd,
    };
    return {
      prompt: `Simplify $x^{${n1}/${d1}} \\cdot x^{${n2}/${d2}}$ into a single power. Build base^(numerator/denominator).${EXPONENT_LOWEST_TERMS_SUFFIX}`,
      answer: interactiveAnswer("expr_builder", spec satisfies ExprBuilderSpec),
      params: { n1, d1, n2, d2, rn, rd },
      hints: [
        "Same base, so add the two exponents into one fraction.",
        "Give the fractions a common bottom number, add them, then reduce to lowest terms.",
      ],
      worked_solution: [
        `Same base means add the exponents: $\\dfrac{${n1}}{${d1}} + \\dfrac{${n2}}{${d2}}$.`,
        `Add them over a common bottom number, then reduce to lowest terms.`,
        `Single power: $x^{${rn}/${rd}}$, built as base $x$, numerator $${rn}$, denominator $${rd}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.rn}:${params.rd}`,
};

/** Every RAD.3 practice template, in stable authoring order (L1, L2a, L2b, L3a, L3b). */
export const RAD3_TEMPLATES: readonly ItemTemplate[] = [
  d2_rad3_eval_l1,
  d2_rad3_to_radical_l2,
  d2_rad3_to_exponent_l2,
  d2_rad3_negeval_l3,
  d2_rad3_simplify_l3,
];
