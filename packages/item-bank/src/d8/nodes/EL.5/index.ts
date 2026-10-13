import {
  condensedLogAnswer,
  expandedLogAnswer,
  type ItemTemplate,
  precisionAnswer,
  type Rng,
} from "../../../template";

/**
 * EL.5 practice templates: the three logarithm properties, run forwards to expand and
 * backwards to condense, plus the one shape that turns a base a calculator cannot read into
 * one it can. Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  expand a plain product, which is the product rule and nothing else;
 *  - L2a expand a product one of whose factors is a power, so the power rule must be used;
 *  - L2b condense a sum back into one logarithm, the same rule read the other way;
 *  - L3a expand a quotient that holds a power, where the ORDER of the two rules decides it;
 *  - L3b evaluate a logarithm on an unavailable base, as a rounded decimal.
 *
 * ## Answer path, and the one thing no item here may depend on
 *
 * The four algebraic shapes are graded by FORM as well as by value, through
 * `expandedLogAnswer` / `condensedLogAnswer` (`is_expanded_log` / `is_condensed_log`).
 * Measured against the real v2 checker before these were written: the condensed `log(x*y)`
 * against an expanded key is rejected `not_expanded`, a value-wrong `log(x) - log(y)` is
 * rejected `value_mismatch`, and the PARTIALLY expanded `log(x^2) + log(y)` against the key
 * `2 * log(x) + log(y)` is rejected `not_expanded` as well. So every prompt states the form
 * it wants, because the checker enforces one and a prompt that stayed silent about it would
 * fail a learner who produced a correct value in the other form.
 *
 * **`log` and `ln` are interchangeable to the checker**: against an `ln(x) - ln(y)` key the
 * answer `log(x) - log(y)` grades `correct/match`. That is right for identities that hold in
 * any base, and it means no item here may turn on WHICH token the learner typed. Every
 * identity these shapes use holds in every base, and no prompt asks for a named one.
 *
 * The change-of-base shape is EVALUATION only. `Answer_Equivalence_Spec.md` v0.16 still
 * defers general log identities under §10, and the cleared slice is expand/condense, so the
 * symbolic identity is not authorable; a rounded value is. `precisionAnswer` treats its
 * precision as a FLOOR rather than a format (a 3 dp key accepts `1.861` and `1.8614` and
 * rejects `1.86`), so the pairs below are filtered to keep the exact value clear of a
 * rounding boundary and every prompt states the rounding.
 *
 * ## Why the variables are drawn from an index
 *
 * `template_params` is `Record<string, number>`, so a symbol has to be stored as its index
 * into {@link EL5_SYMBOLS} and decoded identically by the template, the worked solution and
 * any test. That index is also what gives these cells their variety: a shape with fixed
 * variables would have one instance, and every cell needs a pool item plus six distinct
 * retry variants (see the comment on EL.3's `d8_el3_evaluate_common_l1`).
 */

export const EL5_NODE = "EL.5";

/**
 * The variables these shapes are written in. Ten of them, so a two-variable shape has ninety
 * ordered pairs to draw from and no cell can run short of retry variants.
 *
 * `e` is deliberately absent: it is the base of the natural logarithm rather than a free
 * variable, and an answer key containing it would be asking the checker to read a constant
 * as an unknown.
 */
export const EL5_SYMBOLS: readonly string[] = [
  "x",
  "y",
  "a",
  "b",
  "m",
  "n",
  "p",
  "q",
  "u",
  "v",
];

/** The variable an index stands for. Out-of-range folds back rather than throwing. */
export function el5Symbol(index: number): string {
  const at =
    ((Math.trunc(index) % EL5_SYMBOLS.length) + EL5_SYMBOLS.length) % EL5_SYMBOLS.length;
  return EL5_SYMBOLS[at] as string;
}

/**
 * The TYPEABLE spelling of a condensed logarithm, `log(x*q)`, which is also the answer key
 * of {@link d8_el5_condense_sum_l2}.
 *
 * The typeset answer is the symbols juxtaposed, $\log(xq)$, which is conventionally correct
 * and is what the reveal's figure draws; but two adjacent LETTERS read as one symbol to the
 * checker, so `log(xq)` grades `invalid_input / unknown_symbol` and is scored UNANSWERED
 * under Answer_Equivalence_Spec §12. A reveal that showed only the typeset form was teaching
 * the one spelling that costs the attempt, so the last worked-solution step now prints this
 * one alongside it, and so does the caption on the registered worked-solution figure in
 * `apps/web/src/lessons/worked/d8EL5.tsx`.
 *
 * That caption cannot call this function, because `@cr/item-bank` does not export it, so the
 * two surfaces are held together by assertion instead of by a shared call: `d8el5.test.ts`
 * sweeps this step against the key on every draw and `d8EL5.test.tsx` grades the RENDERED
 * caption against the key of every served instance.
 *
 * Both surfaces print it inside a MARKDOWN CODE SPAN, which is load-bearing rather than
 * decorative: a reveal is rendered through `LessonProse`, so a bare `log(m*a*q)` has its
 * middle symbol read as emphasis and reaches the learner as `log(maq)` — the exact spelling
 * this string exists to replace, arriving silently while the source reads correctly.
 */
export function el5CondensedTyped(symbols: readonly string[]): string {
  return `log(${symbols.join("*")})`;
}

/** Two DISTINCT symbol indices, drawn uniformly. */
function twoSymbols(rng: Rng): { i: number; j: number } {
  const i = rng.int(0, EL5_SYMBOLS.length - 1);
  const raw = rng.int(0, EL5_SYMBOLS.length - 2);
  return { i, j: raw >= i ? raw + 1 : raw };
}

/** A third index distinct from both of the first two. */
function thirdSymbol(rng: Rng, i: number, j: number): number {
  const taken = [i, j].sort((left, right) => left - right);
  let k = rng.int(0, EL5_SYMBOLS.length - 3);
  for (const used of taken) {
    if (k >= used) {
      k += 1;
    }
  }
  return k;
}

/**
 * L1, the product rule on its own. Both factors are bare variables, so the only move is the
 * split, and the checker's form guard is what makes the shape worth asking: a learner who
 * hands back the prompt unchanged is rejected `not_expanded` rather than credited for a
 * correct value.
 */
export const d8_el5_expand_product_l1: ItemTemplate = {
  template_id: "d8.el5.expand-product.l1",
  node_id: EL5_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const { i, j } = twoSymbols(rng);
    const s1 = el5Symbol(i);
    const s2 = el5Symbol(j);
    return {
      prompt: `Expand $\\log(${s1}${s2})$ into a sum of logarithms with a single variable inside each one. Type a logarithm as log with its argument in parentheses.`,
      answer: expandedLogAnswer(`log(${s1}) + log(${s2})`, [s1, s2]),
      params: { i, j },
      hints: [
        "A logarithm hands back an exponent, and multiplying two powers of one base adds their exponents. So a logarithm whose argument is a product is what two separate logarithms come to when they are added.",
        "Write one logarithm for each factor sitting inside the parentheses, and join the two of them with the operation that matches adding exponents.",
      ],
      worked_solution: [
        `The argument $${s1}${s2}$ is a product, so the operation on the outside of it is the multiplication.`,
        `Multiplying powers of one base adds their exponents, and a logarithm IS such an exponent, so a logarithm of a product is a sum of logarithms.`,
        `That gives $\\log(${s1}${s2}) = \\log(${s1}) + \\log(${s2})$, and each logarithm now holds a single variable.`,
      ],
    };
  },
  varietyKey: (params) => `${params.i ?? 0}:${params.j ?? 0}`,
};

/**
 * L2a, the same split with a power on one factor, so the product rule alone is not enough.
 *
 * This is the shape the spike measured the form guard on: against the key `2 * log(x) +
 * log(y)`, the half-finished `log(x^2) + log(y)` is rejected `not_expanded`. A learner who
 * splits and stops is caught by the grader rather than by the wording.
 */
export const d8_el5_expand_power_l2: ItemTemplate = {
  template_id: "d8.el5.expand-power.l2",
  node_id: EL5_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const { i, j } = twoSymbols(rng);
    const n = rng.int(2, 6);
    const s1 = el5Symbol(i);
    const s2 = el5Symbol(j);
    return {
      prompt: `Expand $\\log(${s1}^{${n}}${s2})$ completely, so that every logarithm holds a single variable with no exponent left inside it. Type a logarithm as log with its argument in parentheses.`,
      answer: expandedLogAnswer(`${n} * log(${s1}) + log(${s2})`, [s1, s2]),
      params: { i, j, n },
      hints: [
        "Two things are multiplied inside the logarithm, so the product rule splits it into two separate logarithms before anything else can happen.",
        "One of those two logarithms still has an exponent inside it. A power is repeated multiplication, so its logarithm is a repeated sum, which puts the exponent out in front of that logarithm as a multiplier.",
      ],
      worked_solution: [
        `Inside the logarithm, $${s1}^{${n}}$ and $${s2}$ are multiplied, so the product rule splits it: $\\log(${s1}^{${n}}${s2}) = \\log(${s1}^{${n}}) + \\log(${s2})$.`,
        `The first piece is a logarithm of a power, and the power rule brings the exponent down in front of it: $\\log(${s1}^{${n}}) = ${n}\\log(${s1})$.`,
        `Putting that back gives $${n}\\log(${s1}) + \\log(${s2})$, with no exponent left inside any logarithm.`,
      ],
    };
  },
  varietyKey: (params) => `${params.i ?? 0}:${params.j ?? 0}:${params.n ?? 0}`,
};

/**
 * L2b, the product rule read backwards. Two draws: a two-term sum and a three-term one, so
 * the shape is not simply L1 with the arrow reversed and the gathering has to survive an
 * extra factor.
 *
 * Every term is a bare logarithm, deliberately. Moving a coefficient inside first is the
 * lesson's own check-your-understanding question, and the two harder condensing moves belong
 * to a later node's equations rather than to an L2 slot here.
 */
export const d8_el5_condense_sum_l2: ItemTemplate = {
  template_id: "d8.el5.condense-sum.l2",
  node_id: EL5_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const kind = rng.int(0, 1);
    const { i, j } = twoSymbols(rng);
    // Drawn on every branch so the draw sequence does not depend on `kind`, then discarded
    // on the two-term branch so its variety key cannot vary on a number it never used.
    const drawn = thirdSymbol(rng, i, j);
    const k = kind === 1 ? drawn : -1;
    const s1 = el5Symbol(i);
    const s2 = el5Symbol(j);
    const s3 = el5Symbol(drawn);
    const terms =
      kind === 1
        ? `\\log(${s1}) + \\log(${s2}) + \\log(${s3})`
        : `\\log(${s1}) + \\log(${s2})`;
    const symbols = kind === 1 ? [s1, s2, s3] : [s1, s2];
    const typed = el5CondensedTyped(symbols);
    const shown = symbols.join("");
    return {
      prompt: `Condense $${terms}$ into a single logarithm of one argument. Type a logarithm as log with its argument in parentheses.`,
      answer: condensedLogAnswer(typed, symbols),
      params: { kind, i, j, k },
      hints: [
        "Adding logarithms of one base corresponds to multiplying the numbers inside them, because adding exponents is exactly what multiplying powers of one base does.",
        "Every term here is already a bare logarithm with nothing in front of it, so nothing has to be moved inside first. Collect all of the arguments into one product and write a single logarithm around it.",
      ],
      worked_solution: [
        `Every term is a bare logarithm with no coefficient in front of it, so nothing has to move inside before the terms are gathered.`,
        `The product rule read backwards turns a sum of logarithms into one logarithm of the product: $${terms} = \\log(${shown})$.`,
        `The whole expression is now a single logarithm of one argument, $\\log(${shown})$, which is typed \`${typed}\` with a star between the letters, because two letters written side by side read as one symbol instead of a product.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.kind ?? 0}:${params.i ?? 0}:${params.j ?? 0}:${params.k ?? -1}`,
};

/**
 * L3a, a quotient holding a power, which is the shape where the ORDER of the two rules
 * decides the answer. The exponent lands on the numerator on one branch and the denominator
 * on the other, and only the second one puts the coefficient behind the minus sign, which is
 * the sign slip a learner running on pattern recognition makes.
 *
 * Both hints are written to cover both branches in one wording: a hint that arrived only for
 * the denominator draw would announce which draw the learner had.
 */
export const d8_el5_expand_quotient_l3: ItemTemplate = {
  template_id: "d8.el5.expand-quotient.l3",
  node_id: EL5_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const kind = rng.int(0, 1);
    const { i, j } = twoSymbols(rng);
    const n = rng.int(2, 6);
    const s1 = el5Symbol(i);
    const s2 = el5Symbol(j);
    const shown =
      kind === 1
        ? `\\log \\dfrac{${s1}}{${s2}^{${n}}}`
        : `\\log \\dfrac{${s1}^{${n}}}{${s2}}`;
    const key =
      kind === 1 ? `log(${s1}) - ${n} * log(${s2})` : `${n} * log(${s1}) - log(${s2})`;
    return {
      prompt: `Expand $${shown}$ completely, so that every logarithm holds a single variable with no exponent left inside it. Type a logarithm as log with its argument in parentheses.`,
      answer: expandedLogAnswer(key, [s1, s2]),
      params: { kind, i, j, n },
      hints: [
        "The outermost operation inside the logarithm is the division, so the quotient rule goes first and turns the whole thing into a difference of two logarithms.",
        "One of those two logarithms still carries an exponent. Bring the exponent out in front of that logarithm alone and leave the other one untouched, so the difference stays a difference of exactly two terms.",
      ],
      worked_solution:
        kind === 1
          ? [
              `The division is the outermost operation, so the quotient rule goes first: $${shown} = \\log(${s1}) - \\log(${s2}^{${n}})$.`,
              `The subtracted piece is a logarithm of a power, and the power rule brings its exponent down in front: $\\log(${s2}^{${n}}) = ${n}\\log(${s2})$.`,
              `That whole term is the one being subtracted, so the expansion is $\\log(${s1}) - ${n}\\log(${s2})$.`,
            ]
          : [
              `The division is the outermost operation, so the quotient rule goes first: $${shown} = \\log(${s1}^{${n}}) - \\log(${s2})$.`,
              `The first piece is a logarithm of a power, and the power rule brings its exponent down in front: $\\log(${s1}^{${n}}) = ${n}\\log(${s1})$.`,
              `Putting that back gives $${n}\\log(${s1}) - \\log(${s2})$, with no exponent left inside any logarithm.`,
            ],
    };
  },
  varietyKey: (params) =>
    `${params.kind ?? 0}:${params.i ?? 0}:${params.j ?? 0}:${params.n ?? 0}`,
};

/* ------------------------------------------------------------------ change of base */

/** Bases with no key of their own, so the rule is needed rather than decorative. */
const CHANGE_BASE_BASES: readonly number[] = [3, 4, 5, 6, 7, 8, 9];

/** Arguments that are not powers of any of those bases and are readable at a glance. */
const CHANGE_BASE_ARGUMENTS: readonly number[] = [
  12, 15, 17, 20, 23, 29, 34, 40, 47, 55, 63, 70, 86, 90, 110, 140, 200, 260, 320, 400,
];

/** How far the exact value must sit from a rounding boundary in the third decimal place. */
const ROUNDING_MARGIN = 0.08;

/**
 * The (base, argument) pairs this shape may draw.
 *
 * Filtered rather than drawn and rejected, so `generate()` stays a straight `pick` and the
 * instance is fixed by one draw. Three things are excluded. An exact power of the base makes
 * the change-of-base rule pointless, because the answer is a whole number the learner can
 * count off the ladder instead. A value sitting within {@link ROUNDING_MARGIN} of a boundary
 * in the third decimal place turns the item into an argument about the fourth digit, which is
 * exactly the hazard the spike recorded for `precisionAnswer`. And a value outside a sensible
 * band is either barely bigger than one or large enough that the division reads as arithmetic
 * practice rather than as the rule.
 */
function buildChangeBasePairs(): readonly (readonly [number, number])[] {
  const pairs: (readonly [number, number])[] = [];
  for (const base of CHANGE_BASE_BASES) {
    for (const argument of CHANGE_BASE_ARGUMENTS) {
      const value = Math.log(argument) / Math.log(base);
      const nearest = Math.round(value);
      if (Math.abs(base ** nearest - argument) < 1e-9) {
        continue;
      }
      if (value < 1.2 || value > 6) {
        continue;
      }
      const scaled = value * 1000;
      if (Math.abs(scaled - Math.floor(scaled) - 0.5) < ROUNDING_MARGIN) {
        continue;
      }
      pairs.push([base, argument]);
    }
  }
  return pairs;
}

const CHANGE_BASE_PAIRS = buildChangeBasePairs();

/**
 * L3b, change of base as an evaluation. The symbolic identity stays out of the bank (spec
 * §10 still defers general log identities), so what is graded is the number the rule
 * produces, to a precision the prompt states.
 *
 * No hint here contains a digit, so none of them can collide with a numeric key on the draws
 * where the key happens to be short.
 */
export const d8_el5_change_base_value_l3: ItemTemplate = {
  template_id: "d8.el5.change-base-value.l3",
  node_id: EL5_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const [b, n] = rng.pick(CHANGE_BASE_PAIRS);
    const value = Math.log(n) / Math.log(b);
    const logN = Math.log10(n).toFixed(6);
    const logB = Math.log10(b).toFixed(6);
    return {
      prompt: `Use the change of base rule to evaluate $\\log_{${b}} ${n}$. Round your answer to three decimal places, and enter one number.`,
      answer: precisionAnswer(value.toFixed(3), {
        mode: "decimal_places",
        value: 3,
        rounding: "half_up",
      }),
      params: { b, n },
      hints: [
        "A calculator has keys for only two bases, so this base has to be swapped for one of those before anything can be evaluated. The change of base rule writes the logarithm as a quotient of two logarithms taken in whichever base you do have.",
        "The number inside the original logarithm goes on top and the original base goes underneath. Carry the full display value of each reading through the division, and round only at the very end.",
      ],
      worked_solution: [
        `A calculator carries $\\log$ and $\\ln$ only, so $\\log_{${b}} ${n}$ has to be rewritten on one of those bases first.`,
        `Change of base puts the argument on top and the base underneath: $\\log_{${b}} ${n} = \\dfrac{\\log ${n}}{\\log ${b}}$.`,
        `Reading both logarithms gives $\\log ${n} \\approx ${logN}$ and $\\log ${b} \\approx ${logB}$.`,
        `Dividing gives $\\dfrac{${logN}}{${logB}} \\approx ${value.toFixed(6)}$, which is $${value.toFixed(3)}$ to three decimal places.`,
      ],
    };
  },
  varietyKey: (params) => `${params.b ?? 0}:${params.n ?? 0}`,
};

/** EL.5's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const EL5_TEMPLATES: readonly ItemTemplate[] = [
  d8_el5_expand_product_l1,
  d8_el5_expand_power_l2,
  d8_el5_condense_sum_l2,
  d8_el5_expand_quotient_l3,
  d8_el5_change_base_value_l3,
];
