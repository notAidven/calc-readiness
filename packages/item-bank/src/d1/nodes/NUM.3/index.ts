import {
  additiveInversePrompt,
  expandAndCombineMath,
  expandMath,
  expressionVariable,
  FRACTION_LOWEST_TERMS_SUFFIX,
  reciprocalFracPrompt,
  simplifyMath,
} from "../../../promptFormat";
import {
  combinedConstantsAnswer,
  expressionAnswer,
  type GenerateContext,
  gcd,
  type ItemTemplate,
  numericAnswer,
  type Rng,
  reducedFraction,
  reducedFractionAnswer,
} from "../../../template";
import type { GoldenFixture } from "../../golden";
import { fracFromString, signed, workedSolution } from "../../hints";
import { toolBundleExpand } from "../../theming";
import { numStr, varTerm } from "../_shared";

/** Diagnostic L1 (down stage) — distributive property as an expression. */
export const num3_l1: ItemTemplate = {
  template_id: "d1.num-3.l1",
  node_id: "NUM.3",
  difficulty: 1,
  concept: "distributive",
  generate(rng: Rng, ctx?: GenerateContext) {
    // Distributive property as an expression: a(v + b) -> a*v + a*b. The
    // constant a*b never equals the coefficient a (b >= 2), so the key is never
    // the "Nx + N" form that mathjs would factor under combined_polynomial.
    // `varIndex` picks the variable letter and `order` optionally puts the
    // constant first, e.g. a(b + v).
    const a = rng.int(2, 6);
    const b = rng.int(2, 8);
    const varIndex = rng.int(0, 3);
    const order = rng.int(0, 1);
    const v = expressionVariable(varIndex);
    const inner = order === 1 ? `${b} + ${v}` : `${v} + ${b}`;
    return {
      // Practice: a tool-bundle word problem; assessment
      // keeps the neutral "Expand" prompt. Both still require the expanded form.
      prompt:
        ctx?.form === "practice"
          ? toolBundleExpand(a, inner)
          : expandMath(`${a}(${inner})`),
      answer: expressionAnswer(`${a}*${v} + ${a * b}`, [v]),
      params: { a, b, varIndex, order },
      hints: [
        "Every group needs both items in the parentheses, so the number outside multiplies each term inside, not just the first one. That is the distributive property.",
        `Multiply the outside number by each of the two terms inside, the $${v}$-term and the constant, then write the two results as a sum.`,
      ],
      worked_solution: workedSolution([
        `Multiply $${a}$ by $${v}$: $${varTerm(a, v)}$.`,
        `Multiply $${a}$ by $${b}$: $${a * b}$.`,
        `Combine: $${varTerm(a, v)} + ${a * b}$.`,
      ]),
    };
  },
};

/** Diagnostic L2 (routing stage) — distributing over a coefficient term. */
export const num3_l2: ItemTemplate = {
  template_id: "d1.num-3.l2",
  node_id: "NUM.3",
  difficulty: 2,
  concept: "distributive",
  generate(rng: Rng, ctx?: GenerateContext) {
    // Distributing over a coefficient term: a(bv + c) -> (a*b)*v + a*c. Guard
    // b != c so the coefficient a*b and constant a*c differ, keeping the key
    // out of the "Nx + N" form mathjs factors under combined_polynomial.
    // `order = 1` puts the constant first, e.g. a(c + bv) -> 4(5 + 2y).
    const a = rng.int(2, 5);
    const b = rng.int(2, 4);
    let c = rng.int(2, 6);
    while (c === b) {
      c = rng.int(2, 6);
    }
    const varIndex = rng.int(0, 3);
    const order = rng.int(0, 1);
    const v = expressionVariable(varIndex);
    const inner = order === 1 ? `${c} + ${varTerm(b, v)}` : `${varTerm(b, v)} + ${c}`;
    return {
      prompt:
        ctx?.form === "practice"
          ? toolBundleExpand(a, inner)
          : expandMath(`${a}(${inner})`),
      answer: expressionAnswer(`${a * b}*${v} + ${a * c}`, [v]),
      params: { a, b, c, varIndex, order },
      hints: [
        "Every group needs both items in the parentheses, so the number outside multiplies each term inside, not just the first one.",
        `On the $${v}$-term the two numbers multiply and the $${v}$ comes along unchanged. Multiply the outside number by the constant as well, then write the two results as a sum.`,
      ],
      worked_solution: workedSolution([
        `Multiply $${a}$ by $${varTerm(b, v)}$: $${varTerm(a * b, v)}$.`,
        `Multiply $${a}$ by $${c}$: $${a * c}$.`,
        `Combine: $${varTerm(a * b, v)} + ${a * c}$.`,
      ]),
    };
  },
};

/** Practice-only L3 — expand two DISTINCT products, combining the constants. */
export const num3_l3: ItemTemplate = {
  template_id: "d1.num-3.l3",
  node_id: "NUM.3",
  difficulty: 3,
  generate(rng: Rng) {
    // Expand two DISTINCT products and combine: a(x+b) + c(x+d) ->
    // (a+c)*x + (a*b+c*d). Graded under `combined_constants`, NOT
    // `combined_polynomial`: collecting the like terms is NUM.4 material this
    // learner has not reached, so `2x + 4x + 14` must be accepted too (the advisor
    // note on this template says so). Both coefficient and constant are positive
    // ("+" form); with a,b,c,d in [2,4] the constant (>= 8) always exceeds the
    // coefficient (<= 8 only when a=c=4, which forces the constant >= 16), so the
    // key stays out of the "Nx + N" shape mathjs factors.
    const a = rng.int(2, 4);
    const b = rng.int(2, 4);
    let c = rng.int(2, 4);
    let d = rng.int(2, 4);
    // Never the identical product twice — that reads as a typo, not a combine task.
    while (a === c && b === d) {
      c = rng.int(2, 4);
      d = rng.int(2, 4);
    }
    const varIndex = rng.int(0, 3);
    const v = expressionVariable(varIndex);
    return {
      prompt: expandAndCombineMath(`${a}(${v} + ${b}) + ${c}(${v} + ${d})`),
      answer: combinedConstantsAnswer(`${a + c}*${v} + ${a * b + c * d}`, [v]),
      params: { a, b, c, d, varIndex },
      hints: [
        "Take one product at a time: each outside number multiplies both terms inside its own parentheses, and neither one reaches into the other pair.",
        `Once the parentheses are gone, add the two plain numbers into a single constant. Collecting the two $${v}$-terms into one is allowed here but not required.`,
      ],
      worked_solution: workedSolution([
        `Distribute the first: $${a}(${v} + ${b}) = ${a}${v} + ${a * b}$.`,
        `Distribute the second: $${c}(${v} + ${d}) = ${c}${v} + ${c * d}$.`,
        `Add the $${v}$-terms: $${a} + ${c} = ${a + c}$.`,
        `Add the constants: $${a * b} + ${c * d} = ${a * b + c * d}$.`,
        `Combine: $${a + c}${v} + ${a * b + c * d}$.`,
      ]),
    };
  },
};

/** Extra practice shape — L1: recall an inverse (additive or reciprocal). */
export const num3_l1b: ItemTemplate = {
  template_id: "d1.num-3.l1b",
  node_id: "NUM.3",
  difficulty: 1,
  generate(rng: Rng) {
    const kind = rng.int(0, 1);
    if (kind === 0) {
      const a = rng.int(2, 9);
      const s = rng.int(0, 1);
      const m = s === 1 ? -a : a;
      return {
        prompt: additiveInversePrompt(m),
        answer: numericAnswer(numStr(-m)),
        params: { kind, a, b: 0, s },
        hints: [
          "A number plus its additive inverse equals zero, so the inverse sits the same distance from zero on the other side.",
          "Keep the size and flip the sign.",
        ],
        worked_solution: workedSolution([
          `The additive inverse is the opposite of $${signed(m)}$.`,
          `Flip the sign: $${numStr(-m)}$.`,
        ]),
      };
    }
    // Reciprocal of a reduced fraction a/b is b/a; a !== b keeps it off 1, and
    // gcd(a,b) === 1 with a,b >= 2 keeps the reciprocal a proper `n/d` (never whole).
    let a = rng.int(2, 5);
    let b = rng.int(2, 5);
    while (gcd(a, b) !== 1 || a === b) {
      a = rng.int(2, 5);
      b = rng.int(2, 5);
    }
    return {
      prompt: `${reciprocalFracPrompt(a, b)}${FRACTION_LOWEST_TERMS_SUFFIX}`,
      answer: reducedFractionAnswer(reducedFraction(b, a)),
      params: { kind, a, b, s: 0 },
      hints: [
        "The reciprocal is the multiplicative inverse: a number times its reciprocal equals one.",
        "For a fraction that means swapping the numerator and the denominator, since the two then cancel.",
      ],
      worked_solution: workedSolution([
        `Swap the numerator and denominator: $\\dfrac{${a}}{${b}} \\to \\dfrac{${b}}{${a}}$.`,
        `Reciprocal: ${fracFromString(reducedFraction(b, a))}.`,
      ]),
    };
  },
};

/** Extra practice shape — L2: distribute one product, then combine a trailing constant. */
export const num3_l2b: ItemTemplate = {
  template_id: "d1.num-3.l2b",
  node_id: "NUM.3",
  difficulty: 2,
  generate(rng: Rng) {
    // The constant a*b + c always exceeds the coefficient a (b >= 2), so the key is
    // never the factorable "Nx + N" shape.
    const a = rng.int(2, 6);
    const b = rng.int(2, 6);
    const c = rng.int(2, 9);
    const varIndex = rng.int(0, 3);
    const v = expressionVariable(varIndex);
    return {
      prompt: expandAndCombineMath(`${a}(${v} + ${b}) + ${c}`),
      answer: expressionAnswer(`${a}*${v} + ${a * b + c}`, [v]),
      params: { a, b, c, varIndex },
      hints: [
        "Distribute the number outside the parentheses to both terms inside, and leave the lone constant at the end untouched for now.",
        "That leaves two plain constants, so add them into one and keep them beside the variable term.",
      ],
      worked_solution: workedSolution([
        `Distribute: $${a}(${v} + ${b}) = ${varTerm(a, v)} + ${a * b}$.`,
        `Bring down the constant: $${varTerm(a, v)} + ${a * b} + ${c}$.`,
        `Combine the constants: $${varTerm(a, v)} + ${a * b + c}$.`,
      ]),
    };
  },
};

/** Extra practice shape — L2: simplify using an inverse then an identity. */
export const num3_l2c: ItemTemplate = {
  template_id: "d1.num-3.l2c",
  node_id: "NUM.3",
  difficulty: 2,
  generate(rng: Rng) {
    const kind = rng.int(0, 1);
    const p = rng.int(2, 6);
    const varIndex = rng.int(0, 3);
    const v = expressionVariable(varIndex);
    if (kind === 0) {
      const m = rng.int(2, 9);
      return {
        prompt: simplifyMath(`${varTerm(p, v)} + ${m} - ${m}`),
        answer: expressionAnswer(`${p}*${v}`, [v]),
        params: { kind, p, m, varIndex },
        hints: [
          "The two constants are additive inverses of each other, so they cancel to zero.",
          "Adding zero, the additive identity, changes nothing, so the expression collapses to whatever is left.",
        ],
        worked_solution: workedSolution([
          `The constant and its additive inverse cancel: $${m} - ${m} = 0$.`,
          `Adding zero changes nothing: $${varTerm(p, v)} + 0 = ${varTerm(p, v)}$.`,
        ]),
      };
    }
    const m = rng.int(2, 6);
    return {
      prompt: simplifyMath(`${m} \\cdot \\dfrac{1}{${m}} \\cdot ${varTerm(p, v)}`),
      answer: expressionAnswer(`${p}*${v}`, [v]),
      params: { kind, p, m, varIndex },
      hints: [
        "A number times its reciprocal, the multiplicative inverse, equals one.",
        "Multiplying by one, the multiplicative identity, changes nothing, so the expression collapses to whatever is left.",
      ],
      worked_solution: workedSolution([
        `The number and its reciprocal multiply to one: $${m} \\cdot \\dfrac{1}{${m}} = 1$.`,
        `Multiplying by one changes nothing: $1 \\cdot ${varTerm(p, v)} = ${varTerm(p, v)}$.`,
      ]),
    };
  },
};

/** Extra practice shape — L3: an OPPOSITE outside factor over a DIFFERENCE. */
export const num3_l3b: ItemTemplate = {
  template_id: "d1.num-3.l3b",
  node_id: "NUM.3",
  difficulty: 3,
  generate(rng: Rng) {
    // `-a(v - b) + c(v + d)` -> `(c - a)*v + (a*b + c*d)`.
    //
    // The other shape in this cell (`d1.num-3.l3`) distributes two POSITIVE
    // factors over two SUMS, so all four of its products come out positive and no
    // sign ever has to travel. Here the outside factor of the first pair is the
    // OPPOSITE of `a` and that pair holds a difference, so the learner carries a
    // sign into both of its products: `(-a)(v)` stays negative and `(-a)(-b)`
    // turns positive. That is slide 2 (the distributive property) meeting slide 3
    // (opposites and inverses).
    //
    // Graded under `combined_constants`, NOT `expressionAnswer`: collecting the
    // two v-terms into one is NUM.4 material this learner has not reached, so the
    // un-collected `-2x + 4x + 18` must grade correct alongside `2x + 18`.
    //
    // Carrying over `num3_l3`'s guard against the "Nx + N" shape mathjs factors:
    // `c` is drawn 2 to 4 above `a`, so the collected coefficient `c - a` lands in
    // [2, 4] (positive, and never the 1 that gets dropped), while the constant
    // `a*b + c*d` is at least `4 + 8 = 12`. The two can therefore never coincide.
    const a = rng.int(2, 4);
    const b = rng.int(2, 4);
    const d = rng.int(2, 4);
    const c = a + rng.int(2, 4);
    const varIndex = rng.int(0, 3);
    const v = expressionVariable(varIndex);
    const coefficient = c - a;
    const constant = a * b + c * d;
    return {
      prompt: expandAndCombineMath(`-${a}(${v} - ${b}) + ${c}(${v} + ${d})`),
      answer: combinedConstantsAnswer(`${coefficient}*${v} + ${constant}`, [v]),
      params: { a, b, c, d, varIndex },
      hints: [
        "Treat the minus sign in front of the first factor as part of that factor, then hand the whole thing to both terms inside its parentheses. Nothing inside gets to skip it.",
        "Each of those two products takes its sign from its own two factors, so multiplying the negative factor by the term being subtracted turns that product positive.",
        `Distribute the second pair the same way, then add the plain numbers into a single constant. Collecting the two $${v}$-terms into one is allowed here but not required.`,
      ],
      worked_solution: workedSolution([
        `Distribute the opposite factor: $-${a}(${v} - ${b}) = ${varTerm(-a, v)} + ${a * b}$.`,
        `Distribute the second: $${c}(${v} + ${d}) = ${varTerm(c, v)} + ${c * d}$.`,
        `Add the $${v}$-coefficients: $${signed(-a)} + ${c} = ${coefficient}$.`,
        `Add the constants: $${a * b} + ${c * d} = ${constant}$.`,
        `Combine: $${varTerm(coefficient, v)} + ${constant}$.`,
      ]),
    };
  },
};

/** Prerequisite-gated walk L2 (tightened, commutativity-guarded). */
export const num3_walk: ItemTemplate = {
  template_id: "d1w.num-3.l2",
  node_id: "NUM.3",
  difficulty: 2,
  generate(rng: Rng) {
    // Distribute a coefficient term: a(bx + c) -> (a*b)x + a*c. Guard b != c so
    // the coefficient a*b and constant a*c differ, keeping the key out of the
    // "Nx + N" form mathjs factors under combined_polynomial. (a, b, c play
    // distinct roles, so there is no commutative twin to guard here.)
    const a = rng.int(2, 5);
    const b = rng.int(2, 4);
    let c = rng.int(2, 6);
    while (c === b) {
      c = rng.int(2, 6);
    }
    return {
      prompt: `Expand: ${a}(${b}x + ${c})`,
      answer: expressionAnswer(`${a * b}*x + ${a * c}`, ["x"]),
      params: { a, b, c },
    };
  },
  // A cell's instances must differ in the leading (a, b) shape, not just `c`
  // (so no `5(3x + 4)` alongside `5(3x + 5)`).
  varietyKey: (params) => `${params.a}:${params.b}`,
};

/** Golden fixtures for NUM.3 — distributive property (expression). */
export const num3_golden: readonly GoldenFixture[] = [
  {
    item_version_id: "d1.golden.num-3.1",
    node_id: "NUM.3",
    prompt: "Expand: 3(x + 4)",
    answer: expressionAnswer("3*x + 12", ["x"]),
    valid: "3*x + 12",
    alternate_valid: ["3x + 12", "3x+12", "12 + 3x", "12+3x"],
    // 3x + 4: didn't distribute; 3x + 7: added; x + 12: dropped coefficient.
    near_miss: ["3x + 4", "3x + 7", "x + 12"],
  },
  {
    item_version_id: "d1.golden.num-3.2",
    node_id: "NUM.3",
    prompt: "Expand: 2(3x + 5)",
    answer: expressionAnswer("6*x + 10", ["x"]),
    valid: "6*x + 10",
    alternate_valid: ["6x + 10", "10 + 6x", "10+6x"],
    // 6x + 5: didn't distribute to constant; 5x + 10: added; 6x + 7: wrong.
    near_miss: ["6x + 5", "5x + 10", "6x + 7"],
  },
];
