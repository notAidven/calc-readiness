/**
 * What a check for understanding serves on its re-ask, computed rather than authored.
 *
 * ## The decision this implements
 *
 * At #224 the check's re-ask served the byte-identical question, because a `cfu` is one static
 * `prompt` with one hand-written `accepted` list and there was nothing else to serve. The two
 * ways out were a second authored question per pack, or a generator. The generator won on one
 * argument: it is more work once and none afterwards, where authored retries are 26 packs of
 * new content now and a 27th pack's worth every time a domain lands.
 *
 * ## The draw is the item bank's, unchanged
 *
 * Not a second generator. A pack names an `ItemTemplate` by `template_id` and this module
 * resolves it out of the domain practice pools, then draws through `generateFromTemplate` on
 * `createRng` seeds and rejects collisions by `hashItemDefinition` -- which is
 * `buildD1PracticeVariants`'s loop, reached by importing it rather than by copying it. That
 * buys the part that is genuinely hard about parameter rotation and easy to get wrong:
 * a template's draw is CONSTRAINED, not merely ranged. `d1.num-3.l1` keeps `b >= 2` so its
 * key never lands on the one shape mathjs would factor; `d7.lf4.elimination.l2` rerolls until
 * exactly one variable cancels; `d7.lf1.two-point.l3` rerolls until the slope is a genuine
 * fraction AND is not one of the two point pairs the LESSON already works. Those constraints
 * are why rotating numbers is safe here, and none of them were written for this change.
 *
 * ## What is added on top of the draw
 *
 * Two things the pool does not need and a check does.
 *
 * The first is the ACCEPTED LIST, in `cfuAcceptedForms.ts`: a pool item is graded by a checker
 * that decides equivalence for itself, and a check is graded by exact match against an
 * enumerated list, so the list has to be computed. That is the constraint kept deliberately
 * rather than designed around, because the shipped lists accept LaTeX and the `sqrt` glyph
 * that the practice checker refuses as `invalid_input`.
 *
 * The second is DISTINCTNESS BY ANSWER, below. `hashItemDefinition` distinctness is about the
 * item's whole definition, so it is satisfied by a differently-worded question with the same
 * answer -- and a re-ask like that is #224's defect in a disguise. Rotating the exponents in
 * `(x^2)^3 * x^-8` to another pair that still resolves to `1/x^2` is a new-looking question
 * whose revealed answer is still copyable. So an instance is rejected unless its ACCEPTED SET
 * IS DISJOINT from every earlier instance's, which is the strongest form of the property: not
 * merely a different canonical answer, but no spelling in common, so nothing the reveal
 * printed can be typed back.
 *
 * That disjointness is also what licenses `cfu.tsx` to stop treating a post-reveal answer as
 * recall once the instance has moved on. The two are one decision read from two ends.
 */

import {
  D1_PRACTICE_TEMPLATES,
  D2_PRACTICE_TEMPLATES,
  D3_PRACTICE_TEMPLATES,
  D4_PRACTICE_TEMPLATES,
  D5_PRACTICE_TEMPLATES,
  D7_PRACTICE_TEMPLATES,
  D8_PRACTICE_TEMPLATES,
  D9_PRACTICE_TEMPLATES,
  D10_PRACTICE_TEMPLATES,
  EL6_EXTRANEOUS_DRAWS,
  EXPRESSION_VARIABLES,
  el5Symbol,
  generateFromTemplate,
  hashItemDefinition,
  type ItemTemplate,
  multipleChoiceAnswer,
  type Rng,
  reducedFraction,
} from "@cr/item-bank";

import { cfuPlaceholder, normalizeAcceptedAnswer } from "./answerFormat";
import {
  absBarsForms,
  compositeForms,
  equationForms,
  factoredForms,
  fractionForms,
  integerForms,
  intervalForms,
  linearForms,
  logArgumentForms,
  monomialForms,
  pointForms,
  radicalForms,
  ratioForms,
  reciprocalPowerForms,
  solutionSetForms,
  squarePlusLinearForms,
  standardQuadraticForms,
  withExclusions,
  wordForms,
} from "./cfuAcceptedForms";
import type { LessonCfuSpec } from "./types";

/** One question the check can put in front of the learner. */
export interface CfuInstance {
  /** The question, Markdown + $LaTeX$. */
  prompt: string;
  /** Every spelling this instance grades as correct, canonical first. */
  accepted: readonly string[];
  /** The reasoning that produces THIS instance's answer, for the hint and the reveal. */
  hint: string;
  /** The answer as the reveal prints it and the learner is asked to type it. */
  answerKey: string;
  /**
   * The steps that produce THIS instance's answer, shown beneath the reveal's passage.
   *
   * Where they come from is the difference between the two kinds of instance, and it is the
   * reason a converted pack authors nothing for its re-ask: the authored question carries the
   * pack's own `cfu.worked_solution`, and a computed one carries the steps the item bank drew
   * with it, which every practice template already owes and `validateTemplates` already
   * enforces.
   *
   * May be empty, and `WorkedSolution` renders nothing when it is. That is the honest state
   * for a pack whose steps are not written yet rather than a reason to throw at mount.
   */
  workedSolution: readonly string[];
  /**
   * The template whose registered visual explains this instance, or `""` for none.
   *
   * Handed to `WorkedSolution`, which keys `WORKED_SOLUTION_VISUALS` on it, so a computed
   * instance renders whatever diagram its practice template already owns. The authored
   * question borrows that same id when the pack sets `cfu.worked_solution_params`, and is
   * `""` otherwise, which matches nothing in the registry and falls through to the step cards.
   */
  templateId: string;
  /**
   * The parameters the registered visual reads: the ones the instance was drawn from, or the
   * pack's `cfu.worked_solution_params` for the authored question. Empty when there is no
   * figure to feed.
   */
  params: Record<string, number>;
  /**
   * True only for the pack's own authored question.
   *
   * Read by `cfu.tsx` to decide the GRADING PATH, which is the one place the two kinds of
   * instance genuinely differ: a pack with a `check` block has exactly one item version
   * registered with the shared checker (`cfuChecker.ts`, keyed `cfu:<node>:v1` off the
   * authored key), so only the authored instance can be graded by it. A computed instance is
   * graded by its computed list. That is not a shortfall to fix later: registering a version
   * per variant would route grading for exactly the instances nobody has hand-audited through
   * a checker whose `invalid_input` rules are stricter than the lists these packs ship, which
   * is the unification the whole design refuses.
   */
  authored: boolean;
}

/**
 * Turns one drawn item into the spellings a learner may type for it.
 *
 * Keyed by `template_id` rather than by node, because the spelling follows the ANSWER SHAPE
 * and the shape is the template's. Two packs sharing a template would rightly share a
 * speller; a pack changing template gets a compile-time-visible gap rather than a silently
 * wrong list.
 */
type Speller = (params: Record<string, number>, answerKey: string) => readonly string[];

/* ------------------------------------------------------------------ CFU-only templates */

/**
 * LF.1's check, as a parameterized draw. Written here because the pool has no template for
 * it, and the reason is the interesting part: LF.1's check is a COMPOSITE. It asks for the
 * slope AND for the classification, where the pool splits those into two items
 * (`d7.lf1.two-point.l3` for the slope, `d7.lf1.direction.l2` for the word). Nine of the 26
 * checks are composites like this, so a check that needs a generator of its own is the
 * expected case rather than a failure of the pool.
 *
 * ## Rotating a fixed-word part
 *
 * The word part has no numbers in it: the three options are `increasing`, `decreasing` and
 * `constant` whatever the draw. Rotating the numbers alone would leave `decreasing` correct on
 * every instance, and a learner who remembered one word out of three would be halfway to the
 * answer without looking. So the SUBJECT rotates instead: `kind` is drawn FIRST and the rise
 * follows from it, so a learner shown `decreasing` can be re-asked an `increasing` line and
 * has to read the points. Drawn as a kind rather than left to the sign of a rise draw for the
 * same reason `d7.lf1.direction.l2` does it: a level line is otherwise a one-in-nineteen
 * accident, and it is the case a learner is likeliest to call by the shape of the numbers.
 *
 * ## Constraints, borrowed rather than reinvented
 *
 * The slope must be a genuine non-zero fraction on the two sloping kinds, or "write the slope
 * as a fraction" asks for something the answer is not, and `dy` must not share a factor
 * pattern that reduces to a whole number. That is `d7.lf1.two-point.l3`'s own reroll, and the
 * level case is exempt from it because a level line's slope IS the whole number zero.
 */
const LF1_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.lf1.slope-direction",
  node_id: "LF.1",
  difficulty: 3,
  generate(rng: Rng) {
    let x1 = 0;
    let y1 = 0;
    let dx = 0;
    let dy = 0;
    let kind = 0;
    do {
      // 0 level, 1 rising, 2 falling. Drawn first, so the correct WORD rotates.
      kind = rng.int(0, 2);
      x1 = rng.int(-8, -1);
      y1 = rng.int(-8, 8);
      dx = rng.int(3, 9);
      dy = kind === 0 ? 0 : kind === 1 ? rng.int(1, 11) : -rng.int(1, 11);
    } while (kind !== 0 && (dy === 0 || dy % dx === 0));
    const x2 = x1 + dx;
    const y2 = y1 + dy;
    const verdict = kind === 0 ? "constant" : kind === 1 ? "increasing" : "decreasing";
    // A level line's slope is the whole number zero and has to be written as one:
    // `reducedFraction(0, dx)` spells it `0/1`, which is not what "find its slope" is asking
    // for. The sloping kinds are rerolled until the ratio does not divide out, so they are
    // always genuine fractions.
    const slope = dy === 0 ? "0" : reducedFraction(dy, dx);
    return {
      prompt: `A line passes through $(${x1}, ${y1})$ and $(${x2}, ${y2})$. Find its slope $m$, then say whether the line is increasing, decreasing, or constant. Type the slope first, then the word, like \`2/3, increasing\`.`,
      // An exact-match key over a composite string. `multiple_choice` is the only spec in the
      // bank that means "compare the key literally", which is what a composite needs, and
      // nothing routes this template to a checker: it is never frozen into a pool and never
      // registered as an item version, so the spec is documentation of how the key is read.
      answer: multipleChoiceAnswer(`${slope}, ${verdict}`),
      params: { x1, y1, dx, dy, kind },
      hints: [
        "Match the subtraction order on the top and the bottom: pick one point to be the first, and use that same choice for both differences.",
        "Subtracting a negative coordinate adds its size, so read the signs before you divide. Reduce the fraction if the top and bottom share a factor.",
        "The sign of the slope is the classification: a positive slope rises from left to right, a negative slope falls, and a slope of zero stays level.",
      ],
      // A pool template's steps are enforced by `validateTemplates`; a CFU-only template is
      // in no pool, so nothing else would notice their absence. The resolver rejects a draw
      // with none, which turns a forgotten array into a pack that visibly serves no variant.
      worked_solution: [
        `Slope is rise over run: $m = \\dfrac{y_2 - y_1}{x_2 - x_1}$. Take $(${x1}, ${y1})$ as the first point and keep that choice on the top and the bottom.`,
        `Rise: $${y2} - (${y1}) = ${dy}$. Run: $${x2} - (${x1}) = ${dx}$.`,
        dy === 0
          ? `A rise of $0$ over a run of $${dx}$ is $0$, so the line holds the same height the whole way across.`
          : slope === `${dy}/${dx}`
            ? `$m = \\dfrac{${dy}}{${dx}}$, and the top and the bottom share no factor, so it is already in lowest terms.`
            : `$m = \\dfrac{${dy}}{${dx}}$, and dividing the top and the bottom by their common factor gives $${slope}$.`,
        `A ${dy === 0 ? "zero" : dy > 0 ? "positive" : "negative"} slope means the line is ${verdict}, so the answer is \`${slope}, ${verdict}\`.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.kind}:${reducedFraction(params.dy ?? 0, params.dx ?? 1)}`,
};

/**
 * EL.5's check: condense a sum whose first term still wears a coefficient.
 *
 * The census filed this one as a pool twin, and reading the pool says otherwise. EL.5's
 * `d8.el5.condense-sum.l2` condenses `log(x) + log(y)` into `log(x*y)` out of bare terms, and
 * its own comment records that as a decision rather than an accident: *"Every term is a bare
 * logarithm, deliberately. Moving a coefficient inside first is the lesson's own
 * check-your-understanding question."* So the one move the check exists to test is the one
 * move that template is written to avoid, and drawing from it would re-ask a strictly easier
 * question. A twin by node is not a twin by concept, and the concept is what a re-ask owes.
 *
 * What varies is the coefficient, the plain number it lands on and the symbol beside it. The
 * base is held to 2, 3 or 5 and the coefficient to 2 or 3 so the evaluated power stays a
 * number a learner works out rather than reaches for a calculator over, which is the same
 * bound the authored question sits inside at $2^{3}$.
 */
const EL5_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.el5.condense-coefficient",
  node_id: "EL.5",
  difficulty: 2,
  generate(rng: Rng) {
    const base = [2, 3, 5][rng.int(0, 2)] as number;
    // 2 or 3. Above that the evaluated power stops being arithmetic and starts being a lookup.
    const power = rng.int(2, 3);
    const symIndex = rng.int(0, 9);
    const symbol = el5Symbol(symIndex);
    const value = base ** power;
    return {
      prompt: `Condense $${power} \\log ${base} + \\log ${symbol}$ into a single logarithm. Write one logarithm with one argument inside it, and evaluate any power of a plain number.`,
      // Compared literally, as LF.1's is: this template is in no pool and is registered as no
      // item version, so nothing routes it to a checker and the spec documents how the key is
      // read rather than selecting a grader.
      answer: multipleChoiceAnswer(`log(${value}${symbol})`),
      params: { base, power, symIndex, value },
      hints: [
        `Nothing can be gathered while the $${power}$ is still a multiplier out front, because a coefficient on a logarithm is not a term of the sum. A number multiplying a logarithm is the same as that number sitting as an exponent on the argument.`,
        "Once both terms are bare logarithms, a sum of logarithms is the logarithm of the product of their arguments. A power of a plain number is worth working out rather than leaving as a power.",
      ],
      worked_solution: [
        `The $${power}$ out in front has to move before anything is gathered: a coefficient on a logarithm goes inside as an exponent, so $${power} \\log ${base} = \\log ${base}^{${power}}$.`,
        `A power of a plain number is worth evaluating: $${base}^{${power}} = ${value}$, so that term is $\\log ${value}$.`,
        `Both terms are bare logarithms now, and a sum of logarithms condenses to the logarithm of the product: $\\log ${value} + \\log ${symbol} = \\log(${value}${symbol})$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.value}:${params.symIndex}`,
};

/**
 * EL.6's check: gather, convert, and then throw one of the two roots away.
 *
 * A pool twin was available on the node and is the wrong draw, for a reason the other conversions
 * in this file do not cover. `d8.el6.extraneous.l3` is a twin by CONCEPT -- it is the same
 * equation and the same extraneous root -- but it asks for the answer in a different SHAPE: its
 * prompt asks for the solution set in braces, because deciding how many solutions survive is
 * that item's own skill, while the check's question ends "Enter one number". Drawing from it
 * would change the answer format under a learner who had just missed the question, which is not
 * a variation on what was asked, and the reveal would have printed a braced set for them to
 * type back into a field asking for one number.
 *
 * So the DRAWS are the pool's, imported rather than re-enumerated (the equation is only clean
 * where `kept * rejected` is an exact power of the base, and those bounds should not exist
 * twice), and the wording is this check's own. The rejected root stays in `params` because it is
 * what the extraneous note in the accepted list is built from.
 */
const EL6_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.el6.solve-extraneous",
  node_id: "EL.6",
  difficulty: 3,
  generate(rng: Rng) {
    const [base, exponent, kept, rejected] = rng.pick(EL6_EXTRANEOUS_DRAWS) as readonly [
      number,
      number,
      number,
      number,
    ];
    const power = base ** exponent;
    const shift = kept - rejected;
    // Base 10 is written bare, as every textbook writes the common logarithm.
    const log = base === 10 ? "\\log" : `\\log_{${base}}`;
    return {
      prompt: `Solve $${log} x + ${log}(x - ${shift}) = ${exponent}$. Enter one number.`,
      // Compared literally, as every CFU-only template's is: this is in no pool and is
      // registered as no item version, so nothing routes it to a checker.
      answer: multipleChoiceAnswer(`${kept}`),
      params: { base, exponent, kept, rejected },
      // Digit-free on purpose. The answer is a single number, so a hint that mentioned any
      // number at all could contain it, and the reveal prints these beneath that answer.
      hints: [
        "Two logarithms of the same base are added, and nothing can be converted while there is more than one. A sum of logarithms is the logarithm of the product, so gathering comes first.",
        "With one logarithm left, convert it to exponential form. Multiplying out what is inside leaves a quadratic, which factors.",
        "A quadratic hands back two roots whatever the question was, and the ORIGINAL equation only accepts a number that leaves every logarithm's argument positive. Test both roots in the equation you were given, and give the one that survives.",
      ],
      worked_solution: [
        `Both terms are logarithms of base $${base === 10 ? "10" : base}$ added together, so the product rule read backwards gathers them into one: $${log}\\left(x(x - ${shift})\\right) = ${exponent}$.`,
        `Converting that single logarithm to exponential form gives $x(x - ${shift}) = ${base}^{${exponent}} = ${power}$.`,
        `Expanding and collecting gives the quadratic $x^{2} - ${shift}x - ${power} = 0$, which factors as $(x - ${kept})(x + ${rejected}) = 0$, so the roots are $x = ${kept}$ and $x = -${rejected}$.`,
        `Testing $x = -${rejected}$ in the original equation asks for $${log}(-${rejected})$, which is undefined, so that root is extraneous. Testing $x = ${kept}$ leaves both arguments positive, $${kept}$ and $${rejected}$, so the answer is $${kept}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.base ?? 0}:${params.exponent ?? 0}:${params.kept ?? 0}`,
};

/**
 * NUM.2's check: one exponent, one product and one difference, in that precedence order.
 *
 * The node's pool cell is keyed on `(a + b)^2 +- cd`, where the brackets do the deciding. This
 * check has no brackets at all, and that is the whole question: what has to be settled first
 * when nothing tells you. So the shape is kept and the numbers rotate.
 *
 * The subtraction is drawn to land BELOW zero about half the time. A learner who multiplies
 * before squaring gets `(2 \times 3)^2`-shaped answers, and a learner who subtracts first gets
 * a positive one; keeping the correct answer's sign varied means the sign cannot be used as a
 * check in place of the reasoning.
 */
const NUM2_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.num2.precedence-chain",
  node_id: "NUM.2",
  difficulty: 2,
  generate(rng: Rng) {
    const power = rng.int(2, 3);
    const base = rng.int(2, 5);
    const factor = rng.int(2, 6);
    const lead = rng.int(4, 40);
    const value = lead - factor * base ** power;
    return {
      prompt: `Evaluate $${lead} - ${factor} \\times ${base}^${power}$.`,
      answer: multipleChoiceAnswer(`${value}`),
      params: { lead, factor, base, power, value },
      hints: [
        "Nothing here is bracketed, so the tiers decide the order rather than the reading order. Exponents are settled before multiplication, and multiplication before subtraction.",
        "Work down one tier at a time and rewrite the whole expression after each one, so the subtraction is the last thing left rather than something done in passing.",
      ],
      worked_solution: [
        `Exponents are settled before multiplication and subtraction, so start there: $${base}^${power} = ${base ** power}$.`,
        `The expression reads $${lead} - ${factor} \\times ${base ** power}$, and multiplication outranks subtraction: $${factor} \\times ${base ** power} = ${factor * base ** power}$.`,
        `Subtract last: $${lead} - ${factor * base ** power} = ${value}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.value}`,
};

/**
 * NUM.4's check: collect the like terms and leave the unlike one alone.
 *
 * The pool's cells on this node are purely linear, so every term in them combines. What this
 * check tests is the term that does NOT, and a re-ask that dropped the squared term would be
 * asking something easier. Two linear terms of opposite sign, and a squared term with no
 * partner, so the answer is always a sum of exactly two unlike terms.
 *
 * The squared term is placed in the MIDDLE of the three, as the authored question places it,
 * so the two that combine are not adjacent and cannot be collected by reading left to right.
 */
const NUM4_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.num4.unlike-term",
  node_id: "NUM.4",
  difficulty: 2,
  generate(rng: Rng) {
    const varIndex = rng.int(0, 3);
    const variable = EXPRESSION_VARIABLES[varIndex] ?? "x";
    let negative = 0;
    let positive = 0;
    do {
      negative = -rng.int(2, 9);
      positive = rng.int(2, 12);
      // A total of zero would delete the linear term and leave a one-term answer, and a total
      // of one would make the answer read `x^2 + x`, where the coefficient a learner is being
      // asked to compute is invisible in the result.
    } while (negative + positive === 0 || negative + positive === 1);
    const total = negative + positive;
    const linear = total < 0 ? `- ${-total}${variable}` : `+ ${total}${variable}`;
    return {
      prompt: `Simplify $${negative}${variable} + ${variable}^2 +${positive}${variable}$.`,
      answer: multipleChoiceAnswer(`${variable}^2 ${linear}`),
      params: { varIndex, negative, positive, total },
      hints: [
        `Sort the terms by their variable part before combining anything. Two of them carry a plain $${variable}$ and one carries $${variable}$ squared, and only matching variable parts may be collected.`,
        "Combining like terms is adding their coefficients and keeping the variable part unchanged. The term with no partner is carried through exactly as it stands.",
      ],
      worked_solution: [
        `Sort the terms by their variable part: $${negative}${variable}$ and $${positive}${variable}$ both carry a plain $${variable}$, while $${variable}^2$ carries $${variable}$ squared and has no partner.`,
        `Only the like pair combines, and combining them is adding their coefficients: $${negative} + ${positive} = ${total}$, so $${negative}${variable} + ${positive}${variable}$ becomes $${total}${variable}$.`,
        `The lone $${variable}^2$ is carried along untouched, giving $${variable}^2 ${linear}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.varIndex}:${params.total}`,
};

/**
 * NUM.F's check: a product of two fractions, written in lowest terms.
 *
 * The node's pool cells add and subtract, so a re-ask drawn from them would test finding a
 * common denominator rather than multiplying across and reducing. The draw is built BACKWARDS
 * from the answer instead of forwards from two fractions, because the interesting constraint
 * is on the result: it has to reduce (or the reducing step is not tested) and it must not come
 * out whole (or "in lowest terms" has nothing to ask for).
 */
const NUMF_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.numf.multiply-reduce",
  node_id: "NUM.F",
  difficulty: 2,
  generate(rng: Rng) {
    let n = 0;
    let d = 1;
    let a = 0;
    let b = 1;
    let c = 0;
    let e = 1;
    do {
      // The answer first, as a proper fraction in lowest terms.
      n = rng.int(1, 5);
      d = rng.int(2, 9);
      // Then a shared factor planted in the two fractions, which cancels between them and is
      // what makes the product need reducing at all.
      const shared = rng.int(2, 6);
      const split = rng.int(1, 3);
      a = n * split;
      b = shared;
      c = shared;
      e = d * split;
    } while (
      gcdOf(n, d) !== 1 ||
      n >= d ||
      // Two identical fractions would let a learner read the answer off the symmetry, and a
      // factor of one on either side would make a whole side of the product do nothing.
      (a === c && b === e) ||
      a === b ||
      c === e
    );
    return {
      prompt: `Multiply and write in lowest terms: $\\dfrac{${a}}{${b}} \\times \\dfrac{${c}}{${e}}$.`,
      answer: multipleChoiceAnswer(`${n}/${d}`),
      params: { a, b, c, e, n, d },
      hints: [
        "Multiplying fractions needs no common denominator: the tops multiply together and the bottoms multiply together, straight across.",
        "The product will usually not be in lowest terms, so look for a factor the top and the bottom share and divide it out. Cancelling before multiplying gets to the same place with smaller numbers.",
      ],
      worked_solution: [
        `Multiplying fractions goes straight across, top with top and bottom with bottom: $\\dfrac{${a} \\times ${c}}{${b} \\times ${e}} = \\dfrac{${a * c}}{${b * e}}$.`,
        `The top and the bottom share a factor of $${(a * c) / n}$, so divide each by it: $\\dfrac{${a * c} \\div ${(a * c) / n}}{${b * e} \\div ${(a * c) / n}}$.`,
        `In lowest terms the product is $\\dfrac{${n}}{${d}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.n}/${params.d}`,
};

/**
 * EXP.1's check: a power of a power times a negative power, rewritten with positive exponents.
 *
 * The node is served through an expression-builder widget, so no pool template yields a typed
 * key at all and a generator is the only route. The exponents are drawn so the total is
 * NEGATIVE, which is the half of the question the answer's shape depends on: a positive total
 * needs no reciprocal and would quietly turn this into a different check.
 */
const EXP1_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.exp1.negative-total",
  node_id: "EXP.1",
  difficulty: 2,
  generate(rng: Rng) {
    const varIndex = rng.int(0, 3);
    const variable = EXPRESSION_VARIABLES[varIndex] ?? "x";
    const inner = rng.int(2, 4);
    const outer = rng.int(2, 4);
    // The answer's exponent, drawn first so it is never zero or one: zero would collapse the
    // answer to 1 and one would hide the exponent the learner is asked to produce.
    const power = rng.int(2, 5);
    const negative = -(inner * outer + power);
    return {
      prompt: `Simplify $(${variable}^{${inner}})^{${outer}} \\cdot ${variable}^{${negative}}$. Write your answer with positive exponents only.`,
      answer: multipleChoiceAnswer(`1/${variable}^${power}`),
      params: { varIndex, inner, outer, power },
      hints: [
        "Two rules apply here in order. A power raised to a power multiplies its exponents, and multiplying powers of one base adds them, so settle the bracket before combining.",
        "The prompt asks for positive exponents only, so read the SIGN of the total before writing anything down. A negative exponent means the power belongs underneath a one.",
      ],
      worked_solution: [
        `A power raised to a power multiplies the two exponents: $(${variable}^{${inner}})^{${outer}} = ${variable}^{${inner * outer}}$.`,
        `Multiplying powers of the same base adds the exponents: $${variable}^{${inner * outer}} \\cdot ${variable}^{${negative}} = ${variable}^{${inner * outer} + (${negative})}$, which is $${variable}^{-${power}}$.`,
        `The total came out negative, and the prompt asks for positive exponents, so take the reciprocal: $${variable}^{-${power}} = \\dfrac{1}{${variable}^{${power}}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.varIndex}:${params.power}`,
};

/** Denominator roots {@link RAD1_CFU_TEMPLATE} may draw, before the coprimality filter. */
const RAD1_CFU_ROOTS: readonly number[] = [2, 3, 4, 5, 6, 7, 8, 9];

/**
 * RAD.1's check: a square root over a fraction, simplified.
 *
 * Built from the answer outwards, because the constraint is on the radicand rather than on the
 * result: the bottom has to be a perfect square (or the question is rationalizing, which is
 * RAD.2's) and the top has to hold a perfect square factor beside something squarefree (or
 * there is nothing to pull out).
 *
 * The radicand is not the only place a square can survive. The answer is a FRACTION, so a
 * coefficient sharing a factor with the denominator leaves it unreduced, and the prompt asks
 * for a simplified radical: at seed 2 the draw was `sqrt(216/16)`, keyed `6*sqrt(6)/4` where
 * the answer is `3*sqrt(6)/2`. The accepted list is computed from this key, so the learner
 * who cancels correctly is the one marked wrong.
 */
const RAD1_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.rad1.quotient-radical",
  node_id: "RAD.1",
  difficulty: 3,
  generate(rng: Rng) {
    const outside = rng.int(2, 7);
    // Squarefree, so nothing is left to pull out once the answer is written.
    const inside = rng.pick([2, 3, 5, 6, 7, 10, 11, 13, 14, 15]);
    // Coprime to the coefficient, so the fraction the answer is written as is already in
    // lowest terms. PICKED from the coprime set rather than redrawn in a reject loop:
    // `templateTermination.test.ts` caps the draws a single generate() may take, and every
    // coefficient in 2..7 leaves at least two roots here, so the set is never empty.
    const root = rng.pick(RAD1_CFU_ROOTS.filter((r) => gcdOf(outside, r) === 1));
    const top = outside * outside * inside;
    const bottom = root * root;
    return {
      prompt: `A roof beam is $\\sqrt{\\dfrac{${top}}{${bottom}}}$ meters long. Write that length as a simplified radical.`,
      answer: multipleChoiceAnswer(`${outside}*sqrt(${inside})/${root}`),
      params: { outside, inside, root },
      hints: [
        "A root over a fraction splits into a root on the top and a root on the bottom, so each piece can be simplified on its own rather than all at once.",
        "A piece is finished once no perfect square is left inside it, so take out the first perfect square you spot and then look inside again.",
      ],
      worked_solution: [
        `A root over a fraction splits into two roots: $\\sqrt{\\dfrac{${top}}{${bottom}}} = \\dfrac{\\sqrt{${top}}}{\\sqrt{${bottom}}}$.`,
        `Take a perfect square out of the top. Since $${top} = ${outside * outside} \\times ${inside}$, that gives $\\sqrt{${top}} = ${outside}\\sqrt{${inside}}$.`,
        `The bottom is a perfect square outright: $\\sqrt{${bottom}} = ${root}$.`,
        `Nothing square is left inside either piece, so the beam measures $\\dfrac{${outside}\\sqrt{${inside}}}{${root}}$ meters, typed \`${outside}*sqrt(${inside})/${root}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.outside}:${params.inside}:${params.root}`,
};

/**
 * The two counts {@link RAD2_CFU_TEMPLATE} adds, restricted to pairs whose SUM is squarefree.
 * Enumerated rather than filtered at the draw so the constraint is readable beside the shape
 * it protects: every sum here is one of 3, 5, 6, 7, 10, 11.
 */
const RAD2_CFU_COUNTS: readonly (readonly [number, number])[] = [
  [2, 1],
  [3, 2],
  [4, 1],
  [4, 2],
  [4, 3],
  [5, 1],
  [5, 2],
  [6, 1],
  [6, 4],
  [6, 5],
];

/** Shared radicands {@link RAD2_CFU_TEMPLATE} may draw, all squarefree, before coprimality. */
const RAD2_CFU_SHARED: readonly number[] = [2, 3, 5, 6, 7];

/**
 * RAD.2's check: combine two unlike-LOOKING roots on the top, then clear the bottom.
 *
 * The sum's coefficient is made to equal the number under the bottom root, so the fraction the
 * rationalizing produces cancels to a bare root. That is the authored question's shape and it
 * is what makes the last step worth taking: an answer still wearing a coefficient would let a
 * learner stop one step early and be nearly right.
 *
 * A bare root is not yet a SIMPLIFIED one, which is the second constraint and the one that
 * was missing. The answer's radicand is `shared * bottom`, and neither factor was stopped
 * from carrying a square into it: at seed 1 the draw was `(sqrt(24)+sqrt(6))/sqrt(3)`, keyed
 * `sqrt(18)` where the answer is `3*sqrt(2)`, and at the seed the pack's own re-ask lands on
 * it keyed `sqrt(49)` for an answer of `7`. RAD.1 slide 4 defines a simplified root as one
 * with no perfect square left inside it, so those keys are the rule's counter-example served
 * as its answer, and a learner typing `7` was marked wrong.
 */
const RAD2_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.rad2.combine-rationalize",
  node_id: "RAD.2",
  difficulty: 3,
  generate(rng: Rng) {
    // The two counts add to the number under the bottom root, so the `denominator` the
    // rationalizing introduces cancels the coefficient exactly. Drawn as a PAIR from the
    // sums that are squarefree, because a bottom of 4, 8 or 9 puts its own square inside
    // the answer's root however `shared` is drawn.
    const [first, second] = rng.pick(RAD2_CFU_COUNTS);
    const bottom = first + second;
    // Squarefree and coprime to the bottom, which together make `shared * bottom`
    // squarefree: that is the whole of "no perfect square is left inside it".
    const shared = rng.pick(RAD2_CFU_SHARED.filter((s) => gcdOf(s, bottom) === 1));
    const inside = shared * bottom;
    return {
      prompt: `Simplify $\\dfrac{\\sqrt{${first * first * shared}} + \\sqrt{${second * second * shared}}}{\\sqrt{${bottom}}}$. Combine the top first, then rationalize the denominator, and write the result as a simplified radical.`,
      answer: multipleChoiceAnswer(`sqrt(${inside})`),
      params: { shared, first, second, bottom, inside },
      hints: [
        "Simplify each term on the top before adding, because two roots that look unlike may turn out to be like radicals once the perfect squares are pulled out of them.",
        "Then clear the root off the bottom by multiplying the top and the bottom by that root, since a square root times itself gives back the number inside. Reduce at the end if the numbers share a factor.",
      ],
      worked_solution: [
        `Simplify the two roots on the top before adding: $\\sqrt{${first * first * shared}} = ${first}\\sqrt{${shared}}$ and $\\sqrt{${second * second * shared}} = ${second}\\sqrt{${shared}}$.`,
        `They turned out to be like radicals, so add their counts: $${first}\\sqrt{${shared}} + ${second}\\sqrt{${shared}} = ${bottom}\\sqrt{${shared}}$.`,
        `Clear the root off the bottom by multiplying top and bottom by $\\sqrt{${bottom}}$: $\\dfrac{${bottom}\\sqrt{${shared}}}{\\sqrt{${bottom}}} \\cdot \\dfrac{\\sqrt{${bottom}}}{\\sqrt{${bottom}}} = \\dfrac{${bottom}\\sqrt{${inside}}}{${bottom}}$.`,
        `The $${bottom}$ above and below cancel, leaving $\\sqrt{${inside}}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.inside}`,
};

/**
 * RAD.4's check: a square root of an even power whose half comes out ODD.
 *
 * The odd half is the entire question. An even half is never negative and needs no bars, so a
 * draw that produced one would serve a re-ask that a learner could get right while holding the
 * misconception this check exists to catch. Constrained rather than left to chance.
 */
const RAD4_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.rad4.odd-half-bars",
  node_id: "RAD.4",
  difficulty: 3,
  generate(rng: Rng) {
    const varIndex = rng.int(0, 3);
    const variable = EXPRESSION_VARIABLES[varIndex] ?? "x";
    const coefficient = rng.int(2, 9);
    // Odd, and above one, so the bars are genuinely required and the halving is visible.
    const half = rng.pick([3, 5, 7]);
    return {
      prompt: `Nobody wrote down whether $${variable}$ is positive or negative. Write $\\sqrt{${coefficient * coefficient}${variable}^{${2 * half}}}$ in simplified form. Type an absolute value as \`abs(${variable})\` or \`|${variable}|\`.`,
      answer: multipleChoiceAnswer(`${coefficient}*abs(${variable}^${half})`),
      params: { varIndex, coefficient, half },
      hints: [
        "Work the number and the variable one at a time, since a root spreads across a product. An even exponent under a square root halves.",
        `Then ask the bars question about the expression you are about to WRITE rather than about the root: could the thing left over be negative? Nothing here says $${variable}$ is positive.`,
      ],
      worked_solution: [
        `Split the root across the two factors: $\\sqrt{${coefficient * coefficient}${variable}^{${2 * half}}} = \\sqrt{${coefficient * coefficient}} \\cdot \\sqrt{${variable}^{${2 * half}}}$.`,
        `The number is a perfect square, so $\\sqrt{${coefficient * coefficient}} = ${coefficient}$.`,
        `An even exponent halves under a square root, so $\\sqrt{${variable}^{${2 * half}}}$ gives $${variable}^{${half}}$.`,
        `Now ask the bars question about $${variable}^{${half}}$, not about the root. Nobody said $${variable}$ is positive, and an odd power keeps the sign of its base, so $${variable}^{${half}}$ can be negative while a square root never returns a negative value.`,
        `It therefore needs bars: the simplified form is $${coefficient}\\lvert ${variable}^{${half}} \\rvert$, typed \`${coefficient}*abs(${variable}^${half})\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.varIndex}:${params.coefficient}:${params.half}`,
};

/**
 * RAT.1's check: reduce, and say what the ORIGINAL bottom forbade.
 *
 * A difference of two squares over a quadratic sharing one of its factors, so exactly one
 * cancels. The excluded values are read off the bottom BEFORE the cancelling, which is the
 * part a learner loses: the cancelled factor's value is still forbidden and is no longer
 * visible in the answer.
 */
const RAT1_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.rat1.reduce-exclusions",
  node_id: "RAT.1",
  difficulty: 3,
  generate(rng: Rng) {
    let a = 0;
    let b = 0;
    do {
      a = rng.int(2, 11);
      b = rng.int(2, 11);
      // `a === b` would make the surviving factors identical and the answer 1, and a shared
      // value would put the same number on both sides of the excluded list.
    } while (a === b);
    const middle = b - a;
    const middleTerm = middle === 0 ? "" : middle < 0 ? ` - ${-middle}x` : ` + ${middle}x`;
    return {
      prompt: `Simplify $\\dfrac{x^{2} - ${a * a}}{x^{2}${middleTerm} - ${a * b}}$ to lowest terms and list every excluded value. Type the expression first, then the values, like \`(x+1)/(x+2), x = 3, x = -4\`.`,
      answer: multipleChoiceAnswer(`(x + ${a})/(x + ${b}), x = ${a}, x = -${b}`),
      params: { a, b },
      hints: [
        "Factor both parts before cancelling anything. The top is a difference of two squares, and the bottom needs the two numbers that multiply to its constant and add to its middle coefficient.",
        "Write the excluded values down from the ORIGINAL bottom, while both of its factors are still there. One of them is about to cancel, and it stays forbidden after it disappears.",
      ],
      worked_solution: [
        `The top is a difference of two squares: $x^{2} - ${a * a} = (x - ${a})(x + ${a})$.`,
        `The bottom needs two numbers multiplying to $${-a * b}$ and adding to $${middle}$, which are $${-a}$ and $${b}$: $x^{2}${middleTerm} - ${a * b} = (x - ${a})(x + ${b})$.`,
        `Read the excluded values off the ORIGINAL bottom, while both factors are still there: $x = ${a}$ and $x = -${b}$.`,
        `Now cancel the shared $(x - ${a})$, which leaves $\\dfrac{x + ${a}}{x + ${b}}$.`,
        `Typed as the prompt asks: \`(x + ${a})/(x + ${b}), x = ${a}, x = -${b}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a}:${params.b}`,
};

/**
 * RAT.2's check: divide, and count the value the FLIP created.
 *
 * Three excluded values, and the third is the whole point: the divisor's numerator becomes a
 * denominator when the fraction is inverted, so it forbids a value that was never underneath
 * anything in the question as written.
 */
const RAT2_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.rat2.divide-exclusions",
  node_id: "RAT.2",
  difficulty: 3,
  generate(rng: Rng) {
    let a = 0;
    let b = 0;
    let c = 0;
    do {
      a = rng.int(2, 11);
      b = rng.int(2, 11);
      c = rng.int(2, 11);
      // Three distinct excluded values, and a surviving fraction that is not 1.
    } while (a === c || b === c || a === b);
    const sorted = [-b, -c, a].sort((left, right) => left - right);
    const list = sorted.join(", ");
    return {
      prompt: `Evaluate $\\dfrac{x^{2} - ${a * a}}{x^{2} + ${b + c}x + ${b * c}} \\div \\dfrac{x - ${a}}{x + ${b}}$ in lowest terms and list every excluded value, smallest first. Type the expression first, then the values, like \`(x+1)/(x+2); x = -3, 5\`.`,
      answer: multipleChoiceAnswer(`(x + ${a})/(x + ${c}); x = ${list}`),
      params: { a, b, c },
      hints: [
        "Flip the divisor before anything else, because dividing by a fraction is multiplying by its reciprocal and nothing can be cancelled across a division sign.",
        "Then factor, and collect the excluded values before cancelling. The divisor's NUMERATOR became a denominator when it flipped, so it bars a value too.",
      ],
      worked_solution: [
        `Dividing by a fraction is multiplying by its reciprocal, so flip the divisor: $\\dfrac{x^{2} - ${a * a}}{x^{2} + ${b + c}x + ${b * c}} \\times \\dfrac{x + ${b}}{x - ${a}}$.`,
        `Factor what is left: $x^{2} - ${a * a} = (x - ${a})(x + ${a})$, and $x^{2} + ${b + c}x + ${b * c} = (x + ${b})(x + ${c})$.`,
        `Collect the excluded values now, before anything cancels. The first bottom bars $x = -${b}$ and $x = -${c}$, and the divisor's top became a bottom when it flipped, which bars $x = ${a}$.`,
        `Cancel the shared $(x - ${a})$ and $(x + ${b})$, leaving $\\dfrac{x + ${a}}{x + ${c}}$.`,
        `Typed as the prompt asks, smallest excluded value first: \`(x + ${a})/(x + ${c}); x = ${list}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a}:${params.b}:${params.c}`,
};

/**
 * RAT.3's check: subtract two fractions over a common denominator, and let the minus reach
 * both terms it is in front of.
 *
 * The two bottoms are drawn to share no factor, so the common denominator is their product and
 * the arithmetic stays about the SIGN rather than about factoring an LCD. The numerators are
 * drawn one apart so the collected top comes out with a coefficient of one on `x`, which is the
 * authored shape and keeps the answer readable as `(x + k)`.
 */
const RAT3_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.rat3.subtract-lcd",
  node_id: "RAT.3",
  difficulty: 3,
  generate(rng: Rng) {
    const q = rng.int(2, 7);
    const p = q + 1;
    let r = 0;
    let s = 0;
    do {
      r = rng.int(1, 9);
      s = rng.int(1, 9);
      // `x - r` and `x + s` are the same factor when r is -s, which cannot happen with both
      // positive; what must be ruled out is the two bottoms coinciding at r === -s === 0.
    } while (r === 0 || s === 0);
    const constant = p * s + q * r;
    return {
      prompt: `Write $\\dfrac{${p}}{x - ${r}} - \\dfrac{${q}}{x + ${s}}$ as a single fraction with a factored denominator, and list both excluded values in increasing order. Type it the way this example is typed: \`(2x-9)/((x-3)(x+5)); x = -5, 3\`.`,
      answer: multipleChoiceAnswer(`(x+${constant})/((x-${r})(x+${s})); x = -${s}, ${r}`),
      params: { p, q, r, s, constant },
      hints: [
        "Check whether the two bottoms share a factor before reaching for an LCD. These do not, so the common denominator is simply their product.",
        "Rewrite each fraction over that denominator, and watch the subtraction: the minus sign is in front of a whole bracketed numerator, so it has to reach every term inside it.",
      ],
      worked_solution: [
        `The two bottoms share no factor, so the common denominator is simply their product, $(x - ${r})(x + ${s})$.`,
        `Rewrite each fraction over it: $\\dfrac{${p}(x + ${s})}{(x - ${r})(x + ${s})} - \\dfrac{${q}(x - ${r})}{(x - ${r})(x + ${s})}$.`,
        `Expand the top, letting the minus reach both of its terms: $${p}x + ${p * s} - ${q}x + ${q * r}$, which collects to $x + ${constant}$.`,
        `The excluded values are whatever would empty an original bottom: $x = ${r}$ and $x = -${s}$.`,
        `Typed as the prompt asks, smallest excluded value first: \`(x+${constant})/((x-${r})(x+${s})); x = -${s}, ${r}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.p}:${params.r}:${params.s}`,
};

/**
 * RAT.4's check: clear a complex fraction, and keep the exclusion the INNER denominator made.
 *
 * Zero is always barred here and is the one a learner forgets, because it never appears in the
 * cleared answer's denominator as a factor they wrote down: it comes from the `1/x` buried in
 * the original numerator.
 */
const RAT4_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.rat4.complex-clear",
  node_id: "RAT.4",
  difficulty: 3,
  generate(rng: Rng) {
    let d = 0;
    let n = 0;
    do {
      d = rng.int(2, 9);
      n = rng.int(2, 9);
      // A shared factor would leave the answer reducible, and the prompt asks for lowest terms.
    } while (gcdOf(n, d) !== 1);
    return {
      prompt: `Simplify $\\dfrac{\\dfrac{1}{x} + \\dfrac{1}{${d}}}{\\dfrac{x + ${d}}{${n}}}$ by clearing the inner denominators. Write a single fraction in lowest terms and list every excluded value in increasing order. Type it the way this example is typed: \`7/(2x); x = -3, 0\`.`,
      answer: multipleChoiceAnswer(`${n}/(${d}x); x = -${d}, 0`),
      params: { d, n },
      hints: [
        `Make the top a single fraction first. $\\dfrac{1}{x} + \\dfrac{1}{${d}}$ is not one fraction until both parts are written over their common denominator.`,
        "The main bar is a division, so flip what is underneath and multiply. Read the excluded values off the ORIGINAL expression before cancelling: an inner denominator bars a value, and so does whatever would empty the divisor.",
      ],
      worked_solution: [
        `Make the top a single fraction over the LCD $${d}x$: $\\dfrac{1}{x} + \\dfrac{1}{${d}} = \\dfrac{${d} + x}{${d}x}$.`,
        `The main bar is a division, so flip what is underneath and multiply: $\\dfrac{${d} + x}{${d}x} \\times \\dfrac{${n}}{x + ${d}}$.`,
        `Read the excluded values off the original, before anything cancels. The inner denominator bars $x = 0$, and the value emptying the divisor bars $x = -${d}$.`,
        `Now cancel the shared $(x + ${d})$, which leaves $\\dfrac{${n}}{${d}x}$.`,
        `Typed as the prompt asks, in increasing order: \`${n}/(${d}x); x = -${d}, 0\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.n}:${params.d}`,
};

/**
 * RAT.5's check: a hole, a vertical asymptote and a horizontal one, from the same function.
 *
 * Three parts, and they are three parts on purpose: a cancelled factor and a surviving one look
 * identical in the unfactored expression, so reporting both is what shows the difference was
 * seen. The numerator's leading coefficient is drawn above one so the horizontal asymptote is a
 * ratio worth computing rather than the reflexive $y = 1$.
 */
const RAT5_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.rat5.hole-asymptotes",
  node_id: "RAT.5",
  difficulty: 3,
  generate(rng: Rng) {
    let lead = 0;
    let hole = 0;
    let other = 0;
    let vertical = 0;
    let height = 0;
    do {
      lead = rng.int(2, 6);
      hole = rng.int(2, 8);
      other = rng.int(-6, 6);
      vertical = rng.int(-6, 6);
      height = (lead * (hole + other)) / (hole - vertical);
      // Three distinct roots, and a hole whose height is a whole number a learner can state.
    } while (
      hole === vertical ||
      hole === -other ||
      vertical === -other ||
      hole - vertical === 0 ||
      !Number.isInteger(height)
    );
    const sign = (value: number): string => (value < 0 ? `- ${-value}` : `+ ${value}`);
    // `other` may be drawn as zero, and `x + 0` reads as a mistake in a factor even though it is
    // true. The steps and the registered figure both spell that factor as a bare `x`.
    const factor = (value: number): string => (value === 0 ? "x" : `x ${sign(value)}`);
    // (x - hole)(x + other) expanded, times the lead.
    const b = lead * (other - hole);
    const c = lead * -hole * other;
    // (x - hole)(x - vertical) expanded.
    const e = -(hole + vertical);
    const f = hole * vertical;
    return {
      prompt: `For $P(x) = \\dfrac{${lead}x^{2} ${sign(b)}x ${sign(c)}}{x^{2} ${sign(e)}x ${sign(f)}}$, report three things: the hole as a coordinate pair; the vertical asymptote as an $x$-value; and the horizontal asymptote as a $y$-value. Type it the way this example is typed: \`(2, 7); x = -3; y = 5\`.`,
      answer: multipleChoiceAnswer(`(${hole}, ${height}); x = ${vertical}; y = ${lead}`),
      params: { lead, hole, other, vertical, height },
      hints: [
        "Factor both parts before reading anything off the graph, because a factor that cancels and a factor that survives look identical before they are written out.",
        "A cancelled factor punctures the graph at its input, and the puncture's height comes from the REDUCED function there. A surviving factor in the bottom is a genuine vertical asymptote, and with equal degrees the horizontal one is the ratio of the leading coefficients.",
      ],
      worked_solution: [
        `Factor both parts: the top is $${lead}(x - ${hole})(${factor(other)})$ and the bottom is $(x - ${hole})(${factor(-vertical)})$.`,
        `A factor that cancels marks a hole rather than an asymptote. $(x - ${hole})$ cancels, so the graph is punctured at $x = ${hole}$, and what is left is $\\dfrac{${lead}(${factor(other)})}{${factor(-vertical)}}$.`,
        `The hole's height comes from the reduced function at that input: $\\dfrac{${lead}(${other === 0 ? `${hole}` : `${hole} ${sign(other)}`})}{${hole} ${sign(-vertical)}}$, which is $${height}$. The hole is at $(${hole}, ${height})$.`,
        `$(${factor(-vertical)})$ survives in the bottom, so it is a genuine vertical asymptote: $x = ${vertical}$.`,
        `Top and bottom are both degree two, so the horizontal asymptote is the ratio of the leading coefficients, $\\dfrac{${lead}}{1}$, which is $y = ${lead}$.`,
        `Typed as the prompt asks: \`(${hole}, ${height}); x = ${vertical}; y = ${lead}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.hole}:${params.vertical}:${params.lead}`,
};

/**
 * LF.3's check: build a falling linear model from a rate and a starting amount, then use it.
 *
 * Two parts, and the second is what stops the first from being a pattern-match: writing
 * `-15x + 320` can be done by copying the two numbers out of the sentence in the right places,
 * and substituting into it cannot.
 *
 * The scenario is held fixed at a draining pool while the numbers rotate, because the answer's
 * accepted list carries a UNIT (`140 liters`) and `template_params` is a record of numbers with
 * nowhere to put a word. A re-ask owes a different question of the same concept rather than a
 * different setting.
 */
const LF3_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.lf3.drain-model",
  node_id: "LF.3",
  difficulty: 3,
  generate(rng: Rng) {
    let rate = 0;
    let minutes = 0;
    let start = 0;
    let left = 0;
    do {
      rate = rng.int(4, 25);
      minutes = rng.int(5, 20);
      start = rng.int(6, 40) * 10;
      left = start - rate * minutes;
      // The pool must still hold something at the prediction time, or the model has run past
      // the situation it describes and the answer stops meaning anything.
    } while (left <= 0 || left === start);
    return {
      prompt: `A pool holds $${start}$ liters and a pump drains $${rate}$ liters each minute. Write the right-hand side of $y = \\ldots$ for the liters left after $x$ minutes, then predict the liters left after $${minutes}$ minutes. Type the expression first, then the number, like \`4x + 9, 57\`.`,
      answer: multipleChoiceAnswer(`-${rate}x + ${start}, ${left}`),
      params: { rate, minutes, start, left },
      hints: [
        "Take the two numbers apart before writing anything. One of them is the amount before the pump starts, which is the output at $x = 0$, and the other is a rate per minute.",
        "Draining takes liters away, so the rate enters the model with a negative sign. Once the right-hand side is written, the prediction is a substitution rather than a new piece of reasoning.",
      ],
      worked_solution: [
        `The pool is full before the pump starts, so $${start}$ is the amount left at $x = 0$: it is the constant term.`,
        `Draining takes liters away each minute, so the rate enters as a negative: $-${rate}$ per minute.`,
        `Those two build the model, giving the right-hand side $-${rate}x + ${start}$.`,
        `Predict at $x = ${minutes}$ by substituting: $-${rate}(${minutes}) + ${start} = -${rate * minutes} + ${start}$.`,
        `That leaves $${left}$ liters, so the full answer is \`-${rate}x + ${start}, ${left}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.rate}:${params.start}:${params.minutes}`,
};

/**
 * EL.2's check: a reflection and a shift, reported as an asymptote and a moved point.
 *
 * The point and the asymptote move differently under the two operations, and that is the
 * question: the reflection leaves the asymptote alone (zero is its own opposite) while flipping
 * the point, and the shift then carries both by the same amount. Reporting only one of them
 * would let a learner who applied the shift to everything look correct.
 *
 * The learner-facing strings below say "the point $(0, 1)$" rather than "the anchor" on purpose.
 * The era teaches no such term, and it was grading on it here and in the pack: see the `anchor`
 * entry in `d8EraProse.test.ts`, which fails if it comes back.
 */
const EL2_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.el2.reflect-shift",
  node_id: "EL.2",
  difficulty: 3,
  generate(rng: Rng) {
    const base = rng.pick([2, 3, 4, 5, 6, 10]);
    const shift = rng.int(2, 12);
    const anchor = shift - 1;
    return {
      prompt: `The graph of $y = ${base}^{x}$ is reflected over the $x$-axis and then shifted $${shift}$ units up. Give the horizontal asymptote of the new graph and the new position of the point $(0, 1)$. Write the asymptote as $y = \\ldots$ first, then the point as an ordered pair, separated by a comma.`,
      answer: multipleChoiceAnswer(`y = ${shift}, (0, ${anchor})`),
      params: { base, shift, anchor },
      hints: [
        "Take the two moves in the order the sentence gives them rather than together, because they do different things to the two features being asked about.",
        "Mirroring over the $x$-axis turns every height into its opposite, and zero is its own opposite. The shift afterwards carries the asymptote and the point the same distance.",
      ],
      worked_solution: [
        `Start from what $y = ${base}^{x}$ already has: a horizontal asymptote at $y = 0$ and the point $(0, 1)$ sitting on the curve.`,
        `Reflecting over the $x$-axis negates every height. Zero is its own opposite, so the asymptote stays at $y = 0$, while the point drops to $(0, -1)$.`,
        `Shifting $${shift}$ up adds $${shift}$ to both heights: the asymptote rises to $y = ${shift}$ and the point to $(0, ${anchor})$.`,
        `Typed as the prompt asks: \`y = ${shift}, (0, ${anchor})\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.base}:${params.shift}`,
};

/**
 * EL.4's check: a domain inequality and the asymptote standing at its boundary.
 *
 * The argument is written with the variable SUBTRACTED, so solving the domain condition turns
 * the inequality round. A draw that put the variable first would leave the direction unchanged
 * and remove the one thing this check is looking at, so the shape is fixed and the numbers
 * rotate.
 */
const EL4_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.el4.domain-asymptote",
  node_id: "EL.4",
  difficulty: 3,
  generate(rng: Rng) {
    const bound = rng.int(2, 20);
    return {
      prompt: `For $g(x) = \\log(${bound} - x)$, state the domain as an inequality in $x$ and give the vertical asymptote as an equation. Type it the way this example is typed: \`x > 4; x = 4\`.`,
      answer: multipleChoiceAnswer(`x < ${bound}; x = ${bound}`),
      params: { bound },
      hints: [
        "A logarithm only accepts an argument above zero, so the domain starts as an inequality saying exactly that about the expression inside it.",
        "Solving that inequality is where the direction gets decided, because the variable is being subtracted. The vertical asymptote then stands at the boundary value the domain stops at.",
      ],
      worked_solution: [
        `A logarithm only accepts an argument above zero, so the domain condition is $${bound} - x > 0$.`,
        `Add $x$ to both sides to keep it positive: $${bound} > x$, which reads the usual way round as $x < ${bound}$.`,
        `The vertical asymptote stands at the boundary the domain stops at, which is $x = ${bound}$.`,
        `Typed as the prompt asks: \`x < ${bound}; x = ${bound}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.bound}`,
};

/**
 * POL.2's check: take the common measure out FIRST, then factor what is left.
 *
 * The census filed this as a pool twin on `d4.pol2.trinomial.l2`, and reading it says
 * otherwise, for the same reason EL.5 above did. That template factors a monic trinomial whose
 * two roots are both positive, so it has no common measure to take out and no sign to get
 * wrong; POL.2's node does have a GCF cell, `d4.pol2.gcf.l1`, but it takes the measure out of a
 * LINEAR binomial and never factors anything afterwards. The check is exactly the composition
 * of the two, and neither half on its own re-asks it.
 *
 * So both halves are drawn together, and both are kept honest. `k` is the greatest common
 * measure rather than merely a common one, because the roots are drawn to share nothing, and
 * the two roots take OPPOSITE signs so the trinomial's constant stays negative and the middle
 * coefficient is a difference rather than a sum, which is the arrangement the authored
 * question sits in and the one where a dropped sign shows.
 */
const POL2_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.pol2.measure-then-factor",
  node_id: "POL.2",
  difficulty: 3,
  generate(rng: Rng) {
    const k = rng.int(2, 5);
    let plus = 0;
    let minus = 0;
    do {
      plus = rng.int(2, 9);
      minus = rng.int(2, 9);
      // Equal roots would collapse the answer to a difference of squares, which is a
      // different shape with a different name, and the node teaches it as one.
    } while (plus === minus);
    // (x + plus)(x - minus), scaled by k.
    const middle = plus - minus;
    const constant = -plus * minus;
    const quadratic = `${k}x^{2} ${middle < 0 ? "-" : "+"} ${Math.abs(k * middle)}x - ${k * plus * minus}`;
    return {
      prompt: `Factor $${quadratic}$ completely.`,
      answer: multipleChoiceAnswer(`${k}(x + ${plus})(x - ${minus})`),
      params: { k, plus, minus },
      hints: [
        `Every term here is divisible by $${k}$, and a common measure comes out before any pair is hunted for. Taking it out first is what makes the numbers inside small enough to search.`,
        "What is left inside is an ordinary trinomial whose two numbers multiply to its constant and add to its middle coefficient. A negative constant means the two numbers have opposite signs.",
      ],
      worked_solution: [
        `Every coefficient is divisible by $${k}$, so that comes out in front: $${quadratic} = ${k}(x^{2} ${middle < 0 ? "-" : "+"} ${Math.abs(middle)}x - ${plus * minus})$.`,
        `Inside the bracket the two numbers multiply to $${-plus * minus}$ and add to $${middle}$. A negative product means they have opposite signs.`,
        `The pair is $${plus}$ and $-${minus}$, so the trinomial factors as $(x + ${plus})(x - ${minus})$.`,
        `Completely factored, that is $${k}(x + ${plus})(x - ${minus})$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.k}:${params.plus}:${params.minus}`,
};

/**
 * GEO.1's check: a foundation's diagonal, then scaled down to its timber model.
 *
 * A generator rather than a pool draw, and the reason is the one reference.md warns about:
 * check the CONCEPT, not the node. GEO.1's pool has both halves of this question separately,
 * `d10.geo1.hypotenuse.l1` for the diagonal and `d10.geo1.similar-side.l3` for the scaling,
 * and drawing from either would re-ask a strictly easier question than the one the learner
 * just failed. What the check tests is that the two combine, so the draw has to hold both.
 *
 * The 3-4-5 family keeps the diagonal whole, and `n` is constrained to divide it so the
 * model's diagonal is whole too: a check whose answer arrived as $12.5$ would be asking the
 * learner to trust a decimal from a lesson that never produces one.
 */
const GEO1_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.geo1.model-diagonal",
  node_id: "GEO.1",
  difficulty: 2,
  generate(rng: Rng) {
    let m = 0;
    let n = 2;
    do {
      m = rng.pick([4, 6, 8, 10, 12, 16, 20]);
      n = rng.pick([2, 4, 5, 10]);
      // The model must come out at a whole number of meters AND be small enough to be a
      // model, so a scale that leaves the diagonal unchanged or fractional is rerolled.
    } while ((5 * m) % n !== 0 || (5 * m) / n < 2);
    const a = 3 * m;
    const b = 4 * m;
    const diagonal = 5 * m;
    const answer = diagonal / n;
    return {
      prompt: `A foundation is set out as a rectangle $${a}$ meters by $${b}$ meters. A timber model of it is built at one ${n === 2 ? "half" : `${n}th`} of full size. How long is the model's diagonal, in meters? Enter one number.`,
      answer: multipleChoiceAnswer(`${answer}`),
      params: { a, b, n },
      hints: [
        "Work on the foundation first. Its diagonal is the hypotenuse of a right triangle whose legs are the two given sides, so square them and add before taking any root.",
        "Then bring in the scale. The model and the foundation are similar, so every length on the model is that same fraction of the length it corresponds to.",
      ],
      worked_solution: [
        `The foundation is a rectangle, so its diagonal is the hypotenuse of a right triangle with legs $${a}$ and $${b}$.`,
        `Square the legs and add: $${a}^{2} + ${b}^{2} = ${a * a} + ${b * b} = ${diagonal * diagonal}$.`,
        `Take the square root: the foundation's diagonal is $${diagonal}$ meters.`,
        `The model is similar to the foundation, so that length is multiplied by the scale factor $\\dfrac{1}{${n}}$, giving a model diagonal of $${answer}$ meters.`,
      ],
    };
  },
  varietyKey: (params) => `${params.a ?? 0}:${params.n ?? 0}`,
};

/**
 * GEO.2's check: a cistern lined on its floor and four walls, with its open top left bare.
 *
 * A generator for the same reason as GEO.1's, and a sharper one. The pool's
 * `d10.geo2.prism-surface-area.l3` covers a CLOSED box, and its own prompt says so, because
 * the six-face formula is what that shape teaches. This check is about deciding which faces
 * the job actually covers, so re-asking the closed box would drop the only thing the learner
 * got wrong. The draw omits the top face for every instance, since that omission IS the
 * question.
 */
const GEO2_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.geo2.open-cistern-lining",
  node_id: "GEO.2",
  difficulty: 2,
  generate(rng: Rng) {
    const l = rng.int(5, 14);
    const w = rng.int(3, 9);
    const d = rng.int(2, 6);
    const floor = l * w;
    const longWalls = 2 * l * d;
    const shortWalls = 2 * w * d;
    const answer = floor + longWalls + shortWalls;
    return {
      prompt: `A rectangular cistern is $${l}$ meters long, $${w}$ meters wide and $${d}$ meters deep, and it stands open at the top. Its floor and its four walls are to be lined with lead, and the open top is left bare. How many square meters of lead does the lining take? Enter one number.`,
      answer: multipleChoiceAnswer(`${answer}`),
      params: { l, w, d },
      hints: [
        "Lining covers faces rather than filling the tank, so what is wanted is a surface area and not the capacity.",
        "Take the floor as one rectangle, then the walls in two matching pairs, and leave the open top out of the count.",
      ],
      worked_solution: [
        `Lining covers the faces, so the quantity asked for is a surface area in square meters rather than a volume in cubic meters.`,
        `The floor is one rectangle: $${l} \\times ${w} = ${floor}$ square meters.`,
        `The two long walls give $2 \\times ${l} \\times ${d} = ${longWalls}$, and the two short walls give $2 \\times ${w} \\times ${d} = ${shortWalls}$ square meters.`,
        `The open top is not lined, so only those five faces count: $${floor} + ${longWalls} + ${shortWalls} = ${answer}$ square meters of lead.`,
      ],
    };
  },
  varietyKey: (params) => `${params.l ?? 0}:${params.w ?? 0}:${params.d ?? 0}`,
};

/* ------------------------------------------------- D6, the Gearwright's Menagerie */

/**
 * All eleven D6 checks get a generator, and none of them is filed as a pool twin.
 *
 * That is a reading of the eleven rather than a policy: every one of them is a COMPOSITE or a
 * chained one-number answer, which is the shape the pool deliberately splits. FUN.4 asks for a
 * stretch AND the extreme reading, where the pool asks for one feature at a time; FUN.5 asks
 * for two rates over two windows, because the second window is the only thing that shows an
 * average belongs to an interval; CG.1 asks for a midpoint AND a distance off two intercepts a
 * learner has to write down first. Drawing either half from a pool template would re-ask a
 * strictly easier question than the one the learner just missed, which is the mistake
 * `cfuVariants.test.ts`'s POL.1 and POL.2 notes record being made twice already.
 *
 * FUN.7 and FUN.9 answer with one number and still need a generator, for the same reason: the
 * number is the END of a chain (compose then evaluate; use parity, then the shift, then the
 * gain), and no pool template asks for the whole chain.
 */

/** `x - 3` or `x + 3`, so a negative shift never prints as `x - -3`. */
function shiftedInput(shift: number, variable = "x"): string {
  return shift < 0 ? `${variable} + ${-shift}` : `${variable} - ${shift}`;
}

/** ` + 5` or ` - 5`, for a constant joined onto a term already written. */
function joinedConstant(value: number): string {
  return value < 0 ? ` - ${-value}` : ` + ${value}`;
}

/**
 * Pythagorean triples with BOTH legs even.
 *
 * The parity is the constraint, not decoration: the check asks for a midpoint as well as a
 * length, and a midpoint of two intercepts is each leg halved. An odd leg would hand the
 * learner a coordinate like $-3.5$ from a lesson whose every worked example is whole.
 */
const CG1_EVEN_TRIPLES: readonly (readonly [number, number, number])[] = [
  [6, 8, 10],
  [8, 6, 10],
  [12, 16, 20],
  [16, 12, 20],
  [10, 24, 26],
  [24, 10, 26],
  [18, 24, 30],
  [24, 18, 30],
  [16, 30, 34],
  [30, 16, 34],
];

/** CG.1's check: two intercepts written down, then the midpoint and the length they span. */
const CG1_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.cg1.plot-and-measure",
  node_id: "CG.1",
  difficulty: 2,
  generate(rng: Rng) {
    const triple = rng.pick(CG1_EVEN_TRIPLES) as readonly [number, number, number];
    const [legX, legY, hypotenuse] = triple;
    // Which side of the bench mark each crossing falls on. Both signs rotate, so a learner
    // who read one crossing as negative last time has to read the signs again rather than
    // reproduce them.
    const a = (rng.int(0, 1) === 0 ? -1 : 1) * legX;
    const b = (rng.int(0, 1) === 0 ? -1 : 1) * legY;
    const mx = a / 2;
    const my = b / 2;
    return {
      prompt: `A chalked line is ruled across the surveyed piazza, with the bench mark at the origin and one unit to the pace. The line crosses the horizontal axis $${legX}$ paces to the ${a < 0 ? "left" : "right"} of the bench mark and it crosses the vertical axis $${legY}$ paces ${b < 0 ? "below" : "above"} it. Give the midpoint of the segment joining those two crossings, then give how many paces long that segment is. Type the point first and the length after it, like \`(1, 2), 7\`.`,
      // Compared literally, as every CFU-only template's key is: this is in no pool and is
      // registered as no item version, so nothing routes it to a checker.
      answer: multipleChoiceAnswer(`(${mx}, ${my}), ${hypotenuse}`),
      params: { a, b },
      hints: [
        "Write each crossing down as a point before doing anything with it. A crossing of the horizontal axis has an up coordinate of zero, and a crossing of the vertical axis has an across coordinate of zero; a crossing left of the bench mark or below it carries a minus sign.",
        "With both points down, the centre averages them one coordinate at a time. For the length, the two crossings and the bench mark make a right triangle whose legs are the two paced distances, so square the legs, add, and take the square root of the total.",
      ],
      worked_solution: [
        `A point on the horizontal axis has an up coordinate of $0$, and the crossing is $${legX}$ paces to the ${a < 0 ? "left" : "right"}, so it is $(${a},\\, 0)$.`,
        `A point on the vertical axis has an across coordinate of $0$, and the crossing is $${legY}$ paces ${b < 0 ? "below" : "above"}, so it is $(0,\\, ${b})$.`,
        `The midpoint averages the two ends one coordinate at a time: $\\dfrac{${a} + 0}{2} = ${mx}$ across, and $\\dfrac{0 + ${b}}{2} = ${my}$ up.`,
        `The two crossings and the bench mark make a right triangle whose legs are $${legX}$ and $${legY}$ paces long.`,
        `Square the legs and add: $${legX}^{2} + ${legY}^{2} = ${legX * legX} + ${legY * legY} = ${hypotenuse * hypotenuse}$, and $\\sqrt{${hypotenuse * hypotenuse}} = ${hypotenuse}$.`,
        `Typed as the prompt asks: \`(${mx}, ${my}), ${hypotenuse}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${(params.a ?? 0) / 2}:${(params.b ?? 0) / 2}`,
};

/**
 * FUN.1's check: one evaluation, and one ruling on a log of pairs.
 *
 * The VERDICT is drawn first, for the reason LF.1's `kind` is: `yes` and `no` are the only two
 * answers the second half can have, so rotating the arithmetic alone would leave a learner who
 * remembered one word out of two halfway to the answer. Drawing it first makes the log get
 * built to fit the ruling rather than the ruling read off whatever log the numbers produced.
 */
const FUN1_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.fun1.evaluate-and-test",
  node_id: "FUN.1",
  difficulty: 2,
  generate(rng: Rng) {
    const isFunction = rng.int(0, 1) === 1;
    const m = rng.int(2, 9);
    const c = rng.int(-9, 9) || 6;
    const n = -rng.int(2, 9);
    const value = m * n + c;
    // Four inputs in increasing order, so a repeat is visible as a repeat rather than as a
    // number that happens to look familiar.
    const p = rng.int(1, 9);
    const q = p + rng.int(1, 4);
    const r = q + rng.int(1, 4);
    const s = r + rng.int(1, 4);
    const u = rng.int(1, 9);
    const v = u + rng.int(1, 5);
    const w = v + rng.int(1, 5);
    // Both logs repeat an OUTPUT, which is the harmless case and is on the board either way.
    // Only the failing log repeats an INPUT, which is the case the ruling turns on.
    const pairs: readonly (readonly [number, number])[] = isFunction
      ? [
          [p, u],
          [q, v],
          [r, w],
          [s, u],
        ]
      : [
          [p, u],
          [q, v],
          [p, w],
          [s, u],
        ];
    const verdict = isFunction ? "yes" : "no";
    const log = pairs.map(([input, output]) => `(${input},\\, ${output})`).join(",\\, ");
    return {
      prompt: `An automaton runs on the rule $f(x) = ${m}x${joinedConstant(c)}$, and a second machine's log records the pairs $\\{${log}\\}$. Find $f(${n})$, then say whether the log records a function. Type the number first, then \`yes\` or \`no\`, like \`12, yes\`.`,
      answer: multipleChoiceAnswer(`${value}, ${verdict}`),
      params: { m, c, n, value, isFunction: isFunction ? 1 : 0 },
      hints: [
        "Take the two halves separately. For the reading, put the input in place of every $x$ in the rule, brackets and all, so the multiplication is settled before anything is added or subtracted.",
        "For the log, look only at the settings column and ask whether any one setting is listed twice with two different motions beside it. Two different settings sharing a motion is allowed, because each of them still returns exactly one thing.",
      ],
      worked_solution: [
        `Replace every $x$ with $(${n})$: $f(${n}) = ${m}(${n})${joinedConstant(c)}$.`,
        `Multiplication is settled first: $${m} \\times (${n}) = ${m * n}$, which leaves $${m * n}${joinedConstant(c)}$.`,
        `So $f(${n}) = ${value}$.`,
        isFunction
          ? `Now the log. The settings $${p}$, $${q}$, $${r}$ and $${s}$ are all different, so no setting carries two motions.`
          : `Now the log. The setting $${p}$ is recorded twice, once against $${u}$ and once against $${w}$, so one input carries two different outputs.`,
        isFunction
          ? `The repeated motion $${u}$ is harmless, because two different settings are allowed to share an output, so the answer is \`${value}, ${verdict}\`.`
          : `The repeated motion $${u}$ is harmless; it is the repeated SETTING that rules the log out, so the answer is \`${value}, ${verdict}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.isFunction}:${params.value}`,
};

/**
 * FUN.2's check: the RANGE of a rule with a floor or a ceiling, written as an interval.
 *
 * The range rather than the domain, deliberately, and the pack's own prose says why: reading
 * one off when the question asked for the other is the easiest mistake on this node. What
 * rotates is the DIRECTION the outputs run in as well as the numbers, so a learner shown a
 * capped range is not re-asked another capped range with a different number in it.
 */
const FUN2_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.fun2.domain-and-range",
  node_id: "FUN.2",
  difficulty: 3,
  generate(rng: Rng) {
    const upward = rng.int(0, 1) === 1;
    const useAbs = rng.int(0, 1) === 1;
    const bound = rng.int(2, 20);
    const inner = rng.int(-9, 9);
    const body = useAbs
      ? `\\lvert ${shiftedInput(inner)} \\rvert`
      : `\\sqrt{${shiftedInput(inner)}}`;
    const rule = upward ? `${body} + ${bound}` : `${bound} - ${body}`;
    return {
      prompt: `A machine runs on the rule $f(x) = ${rule}$. Give its **range** (every output the rule can reach) in interval notation. Type infinity as \`inf\`.`,
      answer: multipleChoiceAnswer(upward ? `[${bound}, inf)` : `(-inf, ${bound}]`),
      params: { upward: upward ? 1 : 0, useAbs: useAbs ? 1 : 0, bound, inner },
      hints: [
        useAbs
          ? "Work out what the bars on their own can hand back before you worry about the constant. An absolute value never returns a negative number, so its smallest output is zero, and from there it climbs with nothing stopping it."
          : "Work out what the root on its own can hand back before you worry about the constant. A square root never returns a negative number, so its smallest output is zero, and from there it climbs with nothing stopping it.",
        upward
          ? "Then ask what adding the constant to a quantity like that does to the outputs: it lifts the floor by exactly that much and leaves the climb above it untouched. The floor is reached, so its bracket takes it in."
          : "Then ask what subtracting a quantity like that from the constant does to the outputs: the floor becomes a ceiling, and the outputs fall away from it as the inner part grows. The ceiling is reached, so its bracket takes it in.",
      ],
      worked_solution: [
        useAbs
          ? `Start with the bars. $\\lvert ${shiftedInput(inner)} \\rvert$ is $0$ when $x = ${inner}$ and grows in both directions away from there, so it covers $0$ and every value above it.`
          : `Start with the root. An even root needs $${shiftedInput(inner)} \\ge 0$, so the rule runs from $x = ${inner}$ upward, and over those inputs $\\sqrt{${shiftedInput(inner)}}$ is $0$ at $x = ${inner}$ and climbs with no ceiling.`,
        upward
          ? `Adding $${bound}$ lifts every one of those outputs by $${bound}$, so the smallest output is $0 + ${bound} = ${bound}$.`
          : `Subtracting that from $${bound}$ turns the floor into a ceiling: the largest output is $${bound} - 0 = ${bound}$.`,
        upward
          ? `The inner part grows without bound, so no output is too high to reach, and $${bound}$ itself is reached because the inner part really does hit $0$.`
          : `The inner part grows without bound, so no output is too low to reach, and $${bound}$ itself is reached because the inner part really does hit $0$.`,
        `Typed as the prompt asks: \`${upward ? `[${bound}, inf)` : `(-inf, ${bound}]`}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.upward}:${params.bound}`,
};

/** FUN.3's check: two loads, one either side of the break, each into its own piece. */
const FUN3_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.fun3.evaluate-by-piece",
  node_id: "FUN.3",
  difficulty: 2,
  generate(rng: Rng) {
    let breakAt = 0;
    let rateLow = 0;
    let rateHigh = 0;
    let standing = 0;
    let light = 0;
    let heavyCharge = 0;
    let lightCharge = 0;
    do {
      breakAt = rng.int(3, 9);
      rateLow = rng.int(5, 12);
      rateHigh = rng.int(2, rateLow - 1);
      standing = rng.int(5, 30);
      light = rng.int(1, breakAt - 1);
      heavyCharge = rateHigh * breakAt + standing;
      lightCharge = rateLow * light;
      // Two identical charges would let a learner answer the second half by copying the
      // first, which is the one thing a two-part check must not allow.
    } while (heavyCharge === lightCharge);
    return {
      prompt: `A goods shed charges by the ton. For a load of $t$ tons the charge in dollars is $C(t) = ${rateLow}t$ when $t < ${breakAt}$, and $C(t) = ${rateHigh}t + ${standing}$ when $t \\ge ${breakAt}$. Find $C(${breakAt})$ and $C(${light})$. Give the two charges separated by a comma. Put the charge for the $${breakAt}$ ton load first, like \`40, 20\`.`,
      answer: multipleChoiceAnswer(`${heavyCharge}, ${lightCharge}`),
      params: { breakAt, rateLow, rateHigh, standing, light },
      hints: [
        "Read the conditions before you multiply anything. The second condition uses $\\ge$, which takes the number itself in, so settle which formula owns the load sitting exactly at the break before substituting.",
        "Then substitute each load into that one formula alone. Putting a load through the other piece gives a number that is arithmetically perfect and is simply not this function's value.",
      ],
      worked_solution: [
        `Start with the heavier load and test it. The first condition needs $t < ${breakAt}$, which $${breakAt}$ fails, and the second needs $t \\ge ${breakAt}$, which $${breakAt}$ satisfies, so the second formula owns it.`,
        `Substitute into that formula alone: $C(${breakAt}) = ${rateHigh} \\times ${breakAt} + ${standing} = ${heavyCharge}$.`,
        `Now the lighter load. Here $t < ${breakAt}$ holds, so the first formula owns it: $C(${light}) = ${rateLow} \\times ${light} = ${lightCharge}$.`,
        `The prompt asks for the heavier load first, so the two charges are written \`${heavyCharge}, ${lightCharge}\`.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${(params.rateHigh ?? 0) * (params.breakAt ?? 0) + (params.standing ?? 0)}:${(params.rateLow ?? 0) * (params.light ?? 0)}`,
};

/**
 * FUN.4's check: the one falling stretch, and the highest reading of the whole shift.
 *
 * The draw is constrained so the ABSOLUTE maximum sits at the shift's right-hand END and never
 * at the turn, because that is the whole content of the question: a turn beats its immediate
 * neighbours and says nothing about the rest, and a trace that runs off the end higher than it
 * ever peaked is the case the pack's third paragraph is written about. A draw whose peak WAS
 * the answer would re-ask a question the learner could get right by reading the turn.
 */
const FUN4_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.fun4.read-features",
  node_id: "FUN.4",
  difficulty: 3,
  generate(rng: Rng) {
    const h1 = rng.int(2, 5);
    const h2 = h1 + rng.int(3, 6);
    const h3 = h2 + rng.int(3, 6);
    const r0 = rng.int(2, 8);
    const r1 = r0 + rng.int(3, 8);
    // Below the opening reading, so the middle leg unambiguously falls.
    const r2 = rng.int(1, r0 - 1);
    // Strictly above the turn, which is what puts the absolute maximum at the endpoint.
    const r3 = r1 + rng.int(1, 6);
    return {
      prompt: `A strip chart from the control hall opens at a reading of $${r0}$ at hour $0$, climbs steadily to $${r1}$ at hour $${h1}$, falls steadily to $${r2}$ at hour $${h2}$, then climbs steadily to $${r3}$ at hour $${h3}$, where the shift ends. On which stretch of hours is the reading decreasing, and what is the absolute maximum of the whole shift? Give the stretch in interval notation with round brackets, then the reading, like \`(1, 5), 7\`.`,
      answer: multipleChoiceAnswer(`(${h1}, ${h2}), ${r3}`),
      params: { h1, h2, h3, r0, r1, r2, r3 },
      hints: [
        "Split the shift into its legs first, one between each pair of neighbouring marks, and settle each leg on its own by comparing only the two readings at its ends. A leg between two neighbours only ever does one thing.",
        "Then for the absolute maximum compare every mark on the chart, the two at the ends of the shift included. A turn beats its immediate neighbours and says nothing whatever about the rest of the shift.",
      ],
      worked_solution: [
        `The marks in order are $(0,\\, ${r0})$, $(${h1},\\, ${r1})$, $(${h2},\\, ${r2})$ and $(${h3},\\, ${r3})$.`,
        `Take the legs one at a time: the reading climbs from hour $0$ to hour $${h1}$, falls from hour $${h1}$ to hour $${h2}$, then climbs again from hour $${h2}$ to hour $${h3}$.`,
        `Only one leg falls, so the reading is decreasing across the stretch of hours from $${h1}$ to $${h2}$.`,
        `For the absolute maximum, compare every mark rather than only the turns: $${r0}$, $${r1}$, $${r2}$ and $${r3}$.`,
        `The largest of those is $${r3}$, reached at the very end of the shift, so the turn at $${r1}$ is only a local maximum.`,
        `Written as the prompt asks: \`(${h1}, ${h2}), ${r3}\`.`,
      ],
    };
  },
  varietyKey: (params) => `${params.h1}:${params.h2}:${params.r3}`,
};

/**
 * FUN.5's check: the same trace averaged over two windows, which disagree.
 *
 * Both rates are drawn WHOLE and of OPPOSITE SIGNS, and neither is decoration. Whole, because
 * the check is about what an average rate means rather than about dividing; opposite, because
 * the pack's third and fourth paragraphs are the sign the subtraction carries and the fact
 * that a reading can climb across a shift while falling across its last stretch. A draw whose
 * two rates agreed in sign would re-ask a question with both of those removed.
 */
const FUN5_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.fun5.average-rate",
  node_id: "FUN.5",
  difficulty: 2,
  generate(rng: Rng) {
    let t1 = 0;
    let t2 = 0;
    let v0 = 0;
    let v1 = 0;
    let v2 = 0;
    let rateWhole = 0;
    let rateLate = 0;
    do {
      t1 = rng.int(2, 5);
      t2 = t1 + rng.int(2, 5);
      rateWhole = rng.int(-6, 6);
      rateLate = rng.int(-6, 6);
      v0 = rng.int(2, 30);
      v2 = v0 + rateWhole * t2;
      v1 = v2 - rateLate * (t2 - t1);
    } while (
      rateWhole === 0 ||
      rateLate === 0 ||
      // The two windows must disagree in DIRECTION, which is the question.
      rateWhole * rateLate > 0 ||
      // A recorder does not ink a negative pressure, and a reading nobody could take makes
      // the arithmetic the only thing left in the question.
      v1 < 1 ||
      v2 < 1
    );
    return {
      prompt: `A recorder marks the pressure at three points in one shift: $${v0}$ units at hour $0$, $${v1}$ units at hour $${t1}$, and $${v2}$ units at hour $${t2}$. Work out the average rate of change per hour from hour $0$ to hour $${t2}$, and then the average rate of change per hour from hour $${t1}$ to hour $${t2}$. Give the two rates in that order, separated by a comma.`,
      answer: multipleChoiceAnswer(`${rateWhole}, ${rateLate}`),
      params: { t1, t2, v0, v1, v2 },
      hints: [
        "Take the two windows one at a time. Over a window only the marks at its two ends count, so subtract the reading at the start from the reading at the end and divide by the hours between them.",
        "Keep whatever sign the subtraction gives. Measuring the size of the gap and dropping the direction turns a fall into a rise, and the direction is half of what a rate reports.",
      ],
      worked_solution: [
        `Over the whole shift only the endpoints count: the reading runs from $${v0}$ units at hour $0$ to $${v2}$ units at hour $${t2}$.`,
        `The change in the reading is $${v2} - ${v0} = ${v2 - v0}$ units, and the change in the hours is $${t2} - 0 = ${t2}$.`,
        `So the average rate over the whole shift is $\\dfrac{${v2 - v0}}{${t2}} = ${rateWhole}$ units per hour.`,
        `Now the second window on its own: the reading runs from $${v1}$ units at hour $${t1}$ to $${v2}$ units at hour $${t2}$, a change of $${v2} - ${v1} = ${v2 - v1}$ units over $${t2} - ${t1} = ${t2 - t1}$ hours.`,
        `That window averages $\\dfrac{${v2 - v1}}{${t2 - t1}} = ${rateLate}$ units per hour, so the two windows disagree about which way the trace is going.`,
        `The two rates are typed \`${rateWhole}, ${rateLate}\`.`,
      ],
    };
  },
  varietyKey: (params) => {
    const whole = ((params.v2 ?? 0) - (params.v0 ?? 0)) / (params.t2 ?? 1);
    const late =
      ((params.v2 ?? 0) - (params.v1 ?? 0)) / ((params.t2 ?? 1) - (params.t1 ?? 0));
    return `${whole}:${late}`;
  },
};

/** FUN.6's check: the difference quotient of a quadratic at a point, simplified completely. */
const FUN6_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.fun6.difference-quotient",
  node_id: "FUN.6",
  difficulty: 3,
  generate(rng: Rng) {
    let a = 2;
    let b = 0;
    let c = 0;
    let p = 2;
    let k = 0;
    do {
      a = rng.int(2, 6);
      b = rng.int(-9, 9);
      c = rng.int(-9, 9);
      p = rng.int(2, 7);
      k = 2 * a * p + b;
      // A zero constant term would collapse the answer to a single term and take the
      // collecting step, which is the point of the node, out of the question.
    } while (b === 0 || k === 0);
    const start = a * p * p + b * p + c;
    const expanded = a * p * p + k * p + c;
    return {
      prompt: `For $f(x) = ${a}x^{2}${joinedConstant(b)}x${joinedConstant(c)}$, simplify the difference quotient at $x = ${p}$, $\\dfrac{f(${p} + h) - f(${p})}{h}$. Simplify it completely.`,
      answer: multipleChoiceAnswer(`${a}h${joinedConstant(k)}`),
      params: { a, b, c, p },
      hints: [
        `Start with $f(${p} + h)$, and put the whole input in place of every $x$ in the rule. The squared term becomes $${a}(${p} + h)^{2}$, and that bracket has to be multiplied out in full rather than squared piece by piece.`,
        "Once the starting output has been subtracted, every term with no $h$ in it has gone, because it was in both outputs. Only then does the $h$ underneath divide out, and it divides out of every term at once.",
      ],
      worked_solution: [
        `Put the whole input into the rule: $f(${p} + h) = ${a}(${p} + h)^{2}${joinedConstant(b)}(${p} + h)${joinedConstant(c)}$.`,
        `Multiply the square out in full: $(${p} + h)^{2} = ${p * p} + ${2 * p}h + h^{2}$.`,
        `Collect the pieces: $f(${p} + h) = ${a}h^{2}${joinedConstant(k)}h${joinedConstant(expanded)}$.`,
        `The starting output is $f(${p}) = ${start}$.`,
        `Subtract it. The constant is in both outputs, so it goes: $f(${p} + h) - f(${p}) = ${a}h^{2}${joinedConstant(k)}h$.`,
        `Every term left carries an $h$, so factor it out: $${a}h^{2}${joinedConstant(k)}h = h(${a}h${joinedConstant(k)})$.`,
        `Now the $h$ underneath cancels, which $h$ being nonzero allows, and the difference quotient at $x = ${p}$ is $${a}h${joinedConstant(k)}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.a}:${2 * (params.a ?? 0) * (params.p ?? 0) + (params.b ?? 0)}`,
};

/**
 * FUN.7's check: compose, then evaluate, with the order being the whole question.
 *
 * Digit-free hints, for the reason EL.6's are: the answer is a single number, so a hint that
 * mentioned any number at all could contain it, and the reveal prints these directly beneath
 * that answer.
 */
const FUN7_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.fun7.compose-evaluate",
  node_id: "FUN.7",
  difficulty: 2,
  generate(rng: Rng) {
    let a = 2;
    let b = 0;
    let k = 0;
    let n = 2;
    let inner = 0;
    let value = 0;
    do {
      a = rng.int(2, 7);
      b = rng.int(-9, 12);
      k = rng.int(-9, 9);
      n = rng.int(2, 8);
      inner = n * n + k;
      value = a * inner + b;
      // A zero handover makes the outer rule's multiplier vanish, which is the one draw where
      // running the machines the wrong way round can still land on the right number.
    } while (b === 0 || k === 0 || inner === 0 || inner === n);
    const swapped = a * n + b;
    return {
      prompt: `Let $f(x) = ${a}x${joinedConstant(b)}$ and $g(x) = x^{2}${joinedConstant(k)}$. Evaluate $(f \\circ g)(${n})$. Enter one number.`,
      answer: multipleChoiceAnswer(`${value}`),
      params: { a, b, k, n, value },
      hints: [
        "The circle notation names the outer function first, so the input goes into the INNER function and the outer one never meets it. Work out the inner function's value on its own and write it down as a single number before touching the outer rule.",
        "Then hand that one number to the outer rule, in place of its own variable. Running the two machines in the other order is a different machine and a different question.",
      ],
      worked_solution: [
        `The circle notation names the outer function first, so $(f \\circ g)(${n})$ means $f(g(${n}))$: the $${n}$ goes into $g$, and $f$ acts only on what $g$ hands over.`,
        `Work out the inner value: $g(${n}) = ${n}^{2}${joinedConstant(k)} = ${inner}$.`,
        `Hand that value to the outer function: $f(${inner}) = ${a} \\times ${inner}${joinedConstant(b)} = ${value}$.`,
        `The other order would give $g(f(${n})) = g(${swapped}) = ${swapped * swapped + k}$, so the two orders really are different questions.`,
        `$(f \\circ g)(${n}) = ${value}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.value}`,
};

/** FUN.8's check: build the inverse rule by swapping and solving, then use it once. */
const FUN8_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.fun8.find-inverse",
  node_id: "FUN.8",
  difficulty: 2,
  generate(rng: Rng) {
    let m = 2;
    let c = 0;
    let v = 2;
    let value = 0;
    do {
      m = rng.int(2, 8);
      c = rng.int(-9, 9);
      v = rng.int(2, 9);
      value = m * v - c;
      // A value equal to the input would let a learner report the input back and be right by
      // accident, on a node whose whole subject is that the two are different numbers.
    } while (c === 0 || value === v);
    return {
      prompt: `For $f(x) = \\dfrac{${shiftedInput(-c)}}{${m}}$, find the rule for $f^{-1}(x)$, then use that rule to work out $f^{-1}(${v})$. Type the rule first, then the value, like \`3x - 1, 8\`.`,
      answer: multipleChoiceAnswer(`${m}x${joinedConstant(-c)}, ${value}`),
      params: { m, c, v },
      hints: [
        "Write the rule with $y$ in place of $f(x)$ and then trade the two variables, because the inverse reads the same pairing the other way round. Multiplying both sides by the number underneath clears the bar in one move.",
        "What is left is a one-step solve for $y$, and that is the rule. The second part is then only a substitution into the rule you have just built, so build it before you touch the number.",
      ],
      worked_solution: [
        `Write the rule with $y$ in place of $f(x)$: $y = \\dfrac{${shiftedInput(-c)}}{${m}}$.`,
        `Swap $x$ and $y$, because the inverse reads the same pairing the other way round: $x = \\dfrac{${shiftedInput(-c, "y")}}{${m}}$.`,
        `Multiply both sides by $${m}$ to clear the bar: $${m}x = ${shiftedInput(-c, "y")}$.`,
        `${c > 0 ? `Subtract $${c}$ from` : `Add $${-c}$ to`} both sides: $y = ${m}x${joinedConstant(-c)}$, so $f^{-1}(x) = ${m}x${joinedConstant(-c)}$.`,
        `Put $${v}$ into that rule: $f^{-1}(${v}) = ${m} \\cdot ${v}${joinedConstant(-c)} = ${value}$. The answer is \`${m}x${joinedConstant(-c)}, ${value}\`.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.m}:${params.c}:${(params.m ?? 0) * (params.v ?? 0) - (params.c ?? 0)}`,
};

/**
 * FUN.9's check: the bracket first, then the parity, then the two moves outside.
 *
 * Digit-free hints, for FUN.7's reason. The PARITY rotates along with the numbers, because a
 * learner who remembered "flip the sign of the logged value" would otherwise be halfway to
 * every re-ask; an even trace hands the logged value back unchanged, which is the same
 * question with the opposite answer to the one move it turns on.
 */
const FUN9_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.fun9.transform-and-parity",
  node_id: "FUN.9",
  difficulty: 3,
  generate(rng: Rng) {
    const even = rng.int(0, 1) === 1;
    const gain = rng.int(2, 5);
    const shift = (rng.int(0, 1) === 0 ? -1 : 1) * rng.int(1, 6);
    const lift = rng.int(-9, 9) || 5;
    const logged = rng.int(2, 9);
    const height = rng.int(2, 12);
    // The input the question asks about, chosen so the bracket lands on the NEGATIVE of the
    // logged input. That is what makes the parity load-bearing rather than decorative.
    const asked = shift - logged;
    const reflected = even ? height : -height;
    const value = gain * reflected + lift;
    return {
      prompt: `A load trace $f$ is symmetric ${even ? "in the vertical axis, so $f$ is even" : "through the origin, so $f$ is odd"}, and the recorder logged $f(${logged}) = ${height}$. The loft replays the run with the gain multiplied by $${gain}$, ${lift < 0 ? `dropped $${-lift}$ units down the paper` : `lifted $${lift}$ units up the paper`}, and started ${shift < 0 ? `an hour early` : `late`}, which is $g(x) = ${gain}f(${shiftedInput(shift)})${joinedConstant(lift)}$. Find $g(${asked})$. Enter one number.`,
      answer: multipleChoiceAnswer(`${value}`),
      params: { even: even ? 1 : 0, gain, shift, lift, logged, height },
      hints: [
        "Settle the bracket before anything else. The constant inside it acts on the input, before the function ever sees it, so work out which input of $f$ the question really needs, and it is not the one the log gives you.",
        even
          ? "The log records only one reading, and the symmetry is what turns it into the one you need: a trace mirrored in the vertical axis hands back the same output at an input and its negative. Then the multiplier outside the brackets acts on that value first, and the constant on the end is applied to the result."
          : "The log records only one reading, and the symmetry is what turns it into the one you need: a trace symmetric through the origin hands back the opposite output at an input and its negative. Then the multiplier outside the brackets acts on that value first, and the constant on the end is applied to the result.",
      ],
      worked_solution: [
        `The question asks for $g(${asked})$, so put $${asked}$ in for $x$ wherever the rule writes it: $g(${asked}) = ${gain}f(${asked}${joinedConstant(-shift)})${joinedConstant(lift)}$.`,
        `The constant inside the brackets acts on the input, so settle that bracket next: $${asked}${joinedConstant(-shift)} = ${-logged}$, which is the input $f$ is actually handed, and $g(${asked}) = ${gain}f(${-logged})${joinedConstant(lift)}$.`,
        even
          ? `The log records only $f(${logged})$, and even symmetry says $f(-x) = f(x)$, so $f(${-logged}) = ${height}$.`
          : `The log records only $f(${logged})$, and odd symmetry says $f(-x) = -f(x)$, so $f(${-logged}) = -${height} = ${-height}$.`,
        `The multiplier outside the brackets acts on that value first: $${gain} \\times (${reflected}) = ${gain * reflected}$.`,
        `The constant on the end is applied to the result: $${gain * reflected}${joinedConstant(lift)} = ${value}$.`,
        `So $g(${asked}) = ${value}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.even}:${(params.gain ?? 0) * ((params.even === 1 ? 1 : -1) * (params.height ?? 0)) + (params.lift ?? 0)}`,
};

/**
 * FUN.10's check: the vertex of a vee, and whether the height there is a high or a low.
 *
 * `varietyKey` is the VERDICT alone, and that is the rotation this check needs rather than a
 * distinctness key that happens to be coarse. The word part has two options and the authored
 * question's is `maximum`, so a re-ask drawn from the same half of the parameter space would
 * leave a learner who remembered one word out of two halfway to the answer. Keyed on the
 * verdict, the two computed instances cannot share one, so a learner shown a maximum is
 * re-asked a minimum. `cfuVariants.test.ts` pins that rather than trusting this comment.
 */
const FUN10_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.fun10.vertex-and-graph",
  node_id: "FUN.10",
  difficulty: 2,
  generate(rng: Rng) {
    const opensDown = rng.int(0, 1) === 0;
    const stretch = rng.int(2, 5) * (opensDown ? -1 : 1);
    const h = rng.int(-8, 12);
    const k = rng.int(-9, 15);
    const verdict = opensDown ? "maximum" : "minimum";
    return {
      prompt: `A chart recorder traces $f(x) = ${stretch}\\lvert ${shiftedInput(h)} \\rvert${joinedConstant(k)}$ across a shift, where $x$ is the hour. Give the vertex of the trace as a coordinate pair, then say whether the height there is a maximum or a minimum. Type the pair first, then the word, like \`(2, 5), minimum\`.`,
      answer: multipleChoiceAnswer(`(${h}, ${k}), ${verdict}`),
      params: { stretch, h, k },
      hints: [
        "Start inside the bars and find the input that makes them zero, because the graph turns exactly there. Reading that sign backwards is the commonest slip on this graph, so solve it rather than eyeing it.",
        "Put that input back through the whole rule to get the height of the turn, and let the SIGN of the number multiplying the bars settle which way the arms point from there.",
      ],
      worked_solution: [
        `The bars turn the trace, so find the input that empties them: $${shiftedInput(h)} = 0$ gives $x = ${h}$.`,
        `Put that input back through the rule: $f(${h}) = ${stretch} \\times 0${joinedConstant(k)} = ${k}$, so the trace turns at $(${h}, ${k})$.`,
        `The number multiplying the bars is $(${stretch})$. It is ${opensDown ? "negative, so both arms fall away from the corner" : "positive, so both arms rise away from the corner"}.`,
        `${opensDown ? "A downward vee never rises above its corner" : "An upward vee never falls below its corner"}, so the answer is \`(${h}, ${k}), ${verdict}\`.`,
      ],
    };
  },
  varietyKey: (params) => ((params.stretch ?? 0) < 0 ? "maximum" : "minimum"),
};

/* ------------------------------------------------------------------ D9, trigonometry */

/**
 * All nine of D9's checks generate rather than retarget, and the reason is a measurement
 * rather than a preference.
 *
 * `docs/D9_Domain_Plan.md` records what the two checkers grade, and its finding about this
 * path is total: the expression grammar holds no trigonometric functions, so a key containing
 * `sin`, `cos` or `tan` does not grade against ITSELF. Every question below therefore asks for
 * a NUMBER or an exact radian, and none asks for an expression. Two further limits shape the
 * draws. A radian binds only as `answer_type: "expression"` with `allowed_symbols: ["pi"]`,
 * which is why TRG.1 and TRG.6 are typed that way and why their parameters are chosen so the
 * answer is a fraction times pi rather than a decimal. And a radical does not grade on this
 * path at all, `sqrt(3)/2` coming back `invalid_input/unsupported_syntax` against itself, so
 * every draw is constrained to land on a rational value: TRG.3 reads a coordinate only where
 * it is a half, TRG.4 and TRG.9 work off Pythagorean triples, and TRG.8 asks for a heading in
 * degrees rather than for the value that produced it.
 *
 * Each is a composite of its node's ideas that no single practice template asks, so none of
 * the nine had a pool twin to point at. Judged by concept rather than by node: TRG.6's pool
 * asks for the smallest positive asymptote of $\tan(bx)$ too, and its check is that question
 * with the outside coefficient added as a distractor, so the generator is written here where
 * the distractor can be drawn beside the answer.
 */

/** How a quadrant is named in a D9 prompt, which is by word rather than by number. */
const ORDINALS: readonly string[] = ["first", "second", "third", "fourth"];

/**
 * TRG.1's check: bring a sweep inside one turn, THEN change the unit.
 *
 * Both moves are the question, and their order is what a wrong answer usually gets wrong, so
 * the draw always needs both: the given heading is always at least one full turn past the
 * answer. Two turns as well as one, so the move cannot be applied once by reflex.
 *
 * A half turn is excluded from the bases, along with the two ends of the turn. `180` converts
 * to a bare `pi` with no fraction in it, which is a strictly easier answer to type than the
 * one the check asks for, and `0` and `360` have no smallest POSITIVE coterminal heading at
 * all.
 */
const COTERMINAL_BASES: readonly number[] = [
  30, 45, 60, 90, 120, 135, 150, 210, 225, 240, 270, 300, 315, 330,
];

const TRG1_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.trg1.coterminal-radian",
  node_id: "TRG.1",
  difficulty: 3,
  generate(rng: Rng) {
    const base = rng.pick(COTERMINAL_BASES);
    const turns = rng.int(1, 2);
    const given = base + 360 * turns;
    const divisor = gcdOf(base, 180);
    const top = base / divisor;
    const bottom = 180 / divisor;
    const forms = radianForms(top, bottom);
    return {
      // The typed example is `5pi/12`, which no base in the list produces, so the prompt
      // cannot hand a learner the answer while explaining the notation.
      prompt: `A dish sweeps counterclockwise from its rest heading and stops after $${given}^{\\circ}$. Give the smallest positive heading coterminal with it, measured in radians, as a fraction times $\\pi$. Type pi for $\\pi$, so $\\dfrac{5\\pi}{12}$ would be typed 5pi/12.`,
      // Compared literally, as every CFU-only template's key is: this template is in no pool
      // and is registered as no item version, so nothing routes it to a checker.
      answer: multipleChoiceAnswer(forms[0] ?? ""),
      params: { base, turns },
      hints: [
        "Two moves, and the order decides how much arithmetic there is. Bring the heading inside one turn first, by taking whole turns of $360^{\\circ}$ off it until what is left is positive and smaller than a full turn, which leaves the arm on the terminal side it had already reached.",
        "Then change the unit on what is left. A half turn is $180^{\\circ}$ and it is also $\\pi$ radians, so multiplying by $\\dfrac{\\pi}{180^{\\circ}}$ is multiplying by one: the degrees cancel off the bottom and a $\\pi$ arrives on top.",
      ],
      worked_solution: [
        `A full turn is $360^{\\circ}$ and the sweep runs to $${given}^{\\circ}$, so the arm passes its rest heading ${turns === 1 ? "once" : "twice"} before it stops.`,
        `Taking off ${turns === 1 ? "that one whole turn" : "those two whole turns"} gives $${given}^{\\circ} - ${360 * turns}^{\\circ} = ${base}^{\\circ}$, which is coterminal with the sweep because the two measures differ by a whole number of full turns.`,
        `Nothing smaller and still positive is coterminal with it, since the next subtraction would give $${base}^{\\circ} - 360^{\\circ} = ${base - 360}^{\\circ}$.`,
        `Now change the unit. A half turn is $180^{\\circ}$ and it is also $\\pi$ radians, so $\\dfrac{\\pi}{180^{\\circ}}$ is worth one and multiplying by it changes nothing but the unit.`,
        `Multiplying gives $${base}^{\\circ} \\times \\dfrac{\\pi}{180^{\\circ}} = \\dfrac{${base}\\pi}{180} = ${radianTex(top, bottom)}$.`,
        `So the smallest positive coterminal heading is $${radianTex(top, bottom)}$ radians, typed as ${forms[0] ?? ""}.`,
      ],
    };
  },
  varietyKey: (params) => `${params.base}`,
};

/**
 * TRG.2's check: complement the angle, name the two sides, then use the special value.
 *
 * The ratio is always the one worth $\dfrac{1}{2}$, and that is a constraint rather than a
 * habit: the other two special values carry a root, and this path cannot grade one. So the
 * masthead angle is $30^{\circ}$ or $60^{\circ}$, and which of the two decides which leg the
 * prompt may state, since only the leg the pad's ratio pairs with the wire keeps the answer
 * whole.
 *
 * What rotates on top of that is the DIRECTION of the work: half the draws state a leg and ask
 * for the wire, half state the wire and ask for the leg. Without that, every instance would
 * answer "double the number in the prompt", and a learner who noticed would never look at the
 * triangle again.
 */
const TRG2_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.trg2.wire-length",
  node_id: "TRG.2",
  difficulty: 3,
  generate(rng: Rng) {
    const masthead = rng.pick([30, 60]);
    const pad = 90 - masthead;
    const asksWire = rng.int(0, 1) === 1;
    const shorter = rng.int(6, 30);
    const given = asksWire ? shorter : 2 * shorter;
    const answer = asksWire ? 2 * shorter : shorter;
    // From the pad, the deck run lies alongside and the mast rises across, so a pad angle of
    // $60^{\circ}$ pairs the deck run with the wire through the cosine and one of
    // $30^{\circ}$ pairs the mast with the wire through the sine.
    const alongDeck = pad === 60;
    const ratioName = alongDeck ? "cosine" : "sine";
    const ratioTex = alongDeck ? "\\cos" : "\\sin";
    const legWord = alongDeck ? "deck run" : "mast";
    const legRole = alongDeck ? "adjacent side" : "opposite side";
    const legGiven = alongDeck
      ? `the pad sits $${given}$ meters along the deck from the foot of the mast`
      : `the masthead stands $${given}$ meters above the deck`;
    const legAsked = alongDeck
      ? "How far along the deck does the pad sit from the foot of the mast, in meters?"
      : "How high above the deck does the masthead stand, in meters?";
    const legAnswered = alongDeck
      ? `the pad sits $${answer}$ meters along the deck`
      : `the masthead stands $${answer}$ meters above the deck`;
    return {
      prompt: `A guy wire runs from the top of a mast down to an anchor pad on the deck, meeting the mast at $${masthead}^{\\circ}$ where it leaves the masthead. The mast stands square to the deck, and ${asksWire ? legGiven : `the wire measures $${given}$ meters`}. ${asksWire ? "How long is the wire, in meters?" : legAsked} Enter one number.`,
      answer: multipleChoiceAnswer(`${answer}`),
      params: { masthead, given, asksWire: asksWire ? 1 : 0 },
      // Digit-free on purpose. The answer is a single number, so a hint naming any number at
      // all could contain it, and the reveal prints these beneath that answer.
      hints: [
        "Find the angle at the pad before reaching for any ratio. The corner at the foot of the mast is square, so the pad's corner takes whatever is left of a quarter turn once the masthead has taken its share.",
        "Standing at the pad, the deck run lies alongside you, the mast rises across from you, and the wire runs from the right angle to where you stand. Name which two of those three the question mentions, and take the ratio built from exactly that pair.",
      ],
      worked_solution: [
        "The mast, the deck run and the wire close into a right triangle, with the right angle at the foot of the mast.",
        `The two acute corners are complementary, so the angle at the pad is $90^{\\circ} - ${masthead}^{\\circ} = ${pad}^{\\circ}$.`,
        asksWire
          ? `From the pad the ${legWord} is the ${legRole} and the wire is the hypotenuse, so the ratio pairing those two is the ${ratioName}. Writing the wire as $c$, that reads $${ratioTex} ${pad}^{\\circ} = \\dfrac{${given}}{c}$.`
          : `From the pad the ${legWord} is the ${legRole} and the wire is the hypotenuse, so the ratio pairing those two is the ${ratioName}. Writing the unknown length as $x$, that reads $${ratioTex} ${pad}^{\\circ} = \\dfrac{x}{${given}}$.`,
        `At the special angle $${pad}^{\\circ}$ that ratio is exactly $\\dfrac{1}{2}$, so $\\dfrac{1}{2} = \\dfrac{${asksWire ? given : "x"}}{${asksWire ? "c" : given}}$.`,
        asksWire
          ? `Solving gives $c = 2 \\times ${given} = ${answer}$, so the wire is $${answer}$ meters long.`
          : `Solving gives $x = \\dfrac{${given}}{2} = ${answer}$, so ${legAnswered}.`,
      ],
    };
  },
  varietyKey: (params) => `${params.masthead}:${params.given}:${params.asksWire}`,
};

/**
 * TRG.3's check: which coordinate, which quadrant, which reference angle, which sign.
 *
 * Every heading here reads a half, and nothing else can be asked: the other two special
 * headings put a root in the coordinate, and a radical does not grade on this path. So the
 * six rows below are the whole population, and they are the six non-acute headings at which
 * one named coordinate comes out rational. Quadrant I is excluded because there the reference
 * angle IS the heading, which collapses the question onto TRG.2's right triangles.
 *
 * The size is the same on every row, so what a re-ask moves is the SIGN and the coordinate
 * being asked for. Those are the two decisions the check is about, and this comment used to
 * stop there as though that settled it. It does not: a size that never moves means the whole
 * answer space is `-1/2 | 1/2`, and `resolve` forbids a re-ask from repeating anything the
 * authored question already spoke, so the re-ask is not merely likely to be the other sign, it
 * is the only draw left. A learner who reveals answers the second question by copying the
 * first and changing its sign, on the node whose skill IS the sign.
 *
 * That is unfixed, and it is unfixable from this table: widening it needs a radical, and a
 * radical does not grade here (see the domain note above). TRG.3 is the tree's only generator
 * with two answers in it, and `cfuVariants.test.ts` carries it as the single declared exception
 * to a floor of three, with the two ways out written down beside it.
 */
const HALF_READINGS: readonly { isSine: boolean; deg: number; quadrant: number }[] = [
  { isSine: false, deg: 120, quadrant: 2 },
  { isSine: false, deg: 240, quadrant: 3 },
  { isSine: false, deg: 300, quadrant: 4 },
  { isSine: true, deg: 150, quadrant: 2 },
  { isSine: true, deg: 210, quadrant: 3 },
  { isSine: true, deg: 330, quadrant: 4 },
];

const TRG3_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.trg3.circle-cosine",
  node_id: "TRG.3",
  difficulty: 3,
  generate(rng: Rng) {
    const { isSine, deg, quadrant } = rng.pick(HALF_READINGS);
    const reference = deg < 180 ? 180 - deg : deg < 270 ? deg - 180 : 360 - deg;
    const sign = circleReadingSign(isSine, deg);
    const roman = ["I", "II", "III", "IV"][quadrant - 1] ?? "I";
    const nearer = quadrant === 4 ? 360 : 180;
    const subtraction =
      quadrant === 3
        ? `${deg}^{\\circ} - 180^{\\circ}`
        : `${nearer}^{\\circ} - ${deg}^{\\circ}`;
    const placement =
      quadrant === 2
        ? `A heading of $${deg}^{\\circ}$ has passed the quarter turn at $90^{\\circ}$ without reaching the half turn at $180^{\\circ}$, so the terminal side lands in Quadrant II.`
        : quadrant === 3
          ? `A heading of $${deg}^{\\circ}$ has passed the half turn at $180^{\\circ}$ without reaching $270^{\\circ}$, so the terminal side lands in Quadrant III.`
          : `A heading of $${deg}^{\\circ}$ has passed $270^{\\circ}$ without closing the full turn at $360^{\\circ}$, so the terminal side lands in Quadrant IV.`;
    const axis = isSine
      ? sign > 0
        ? "lies above the horizontal axis, so the second coordinate is positive"
        : "lies below the horizontal axis, so the second coordinate is negative"
      : sign > 0
        ? "lies right of the vertical axis, so the first coordinate is positive"
        : "lies left of the vertical axis, so the first coordinate is negative";
    const reach = isSine ? "vertical reach" : "horizontal reach";
    const measuredFrom = isSine ? "horizontal axis" : "vertical axis";
    const negativeWay = isSine ? "a downward reach" : "a leftward reach";
    return {
      prompt: `A rotating antenna reaches one unit from the center of its pad and is aimed at a heading of $${deg}^{\\circ}$. What is the ${reach} of its tip, measured from the ${measuredFrom} with ${negativeWay} counting as negative? Enter one number, as a fraction in lowest terms.`,
      answer: multipleChoiceAnswer(`${sign < 0 ? "-" : ""}1/2`),
      params: { isSine: isSine ? 1 : 0, deg },
      hints: [
        "Decide first which of the two reaches the question is asking for, because the vertical reach is the second coordinate of the point and the horizontal reach is the first, and the two are different functions of the same heading.",
        "Then place the heading in its quadrant, since that one fact settles both of the moves that are left: the quadrant chooses the subtraction that gives the reference angle, and it also decides the sign. Find the size at the acute angle first and leave the sign until there is something to put it on.",
      ],
      worked_solution: [
        `The ${reach} of the tip is the ${isSine ? "second" : "first"} coordinate of the point where the terminal side crosses the unit circle, so the reading asked for is $${isSine ? "\\sin" : "\\cos"} ${deg}^{\\circ}$.`,
        placement,
        `In Quadrant ${roman} the nearer end of the horizontal axis is the one at $${nearer}^{\\circ}$, so the reference angle is $${subtraction} = ${reference}^{\\circ}$.`,
        `At that acute angle the reading is $${isSine ? "\\sin" : "\\cos"} ${reference}^{\\circ} = \\dfrac{1}{2}$, which fixes the size.`,
        `Quadrant ${roman} ${axis}, so the antenna's ${reach} is $${sign < 0 ? "-" : ""}\\dfrac{1}{2}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.isSine}:${params.deg}`,
};

/**
 * The Pythagorean triples TRG.4's and TRG.9's checks are built from.
 *
 * Both checks recover a second reading from a first one, and both would ask for a radical on
 * almost every other pair of legs. A triple keeps the recovered reading rational, which is the
 * only reason either question is gradable here at all: the value under the root is a perfect
 * square by construction rather than by luck.
 */
const PYTHAGOREAN_LEGS: readonly (readonly [number, number, number])[] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
];

/**
 * TRG.4's check: the Pythagorean identity, then the quadrant's sign, then the quotient.
 *
 * Three of the node's four slides in one question, and the middle one is where it is decided:
 * the square root offers two candidates and only the quadrant says which. So the quadrant is
 * drawn from II, III and IV and never I, where both readings are positive and the sign step
 * has nothing to do.
 *
 * Which reading is GIVEN rotates as well as the triple. A learner who has seen a sine handed
 * over and the cosine recovered has not yet been asked to run it the other way, and the answer
 * moves with it: the tangent's numerator is the leg opposite, whichever reading named it.
 */
const TRG4_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.trg4.quadrant-tangent",
  node_id: "TRG.4",
  difficulty: 3,
  generate(rng: Rng) {
    const [shorter, longer, hyp] = rng.pick(PYTHAGOREAN_LEGS);
    const swap = rng.int(0, 1) === 1;
    const opposite = swap ? longer : shorter;
    const adjacent = swap ? shorter : longer;
    const quadrant = rng.int(2, 4);
    const givenSine = rng.int(0, 1) === 1;
    const sineSign = quadrant === 2 ? 1 : -1;
    const cosineSign = quadrant === 4 ? 1 : -1;
    const tangentSign = quadrantTangentSign(quadrant);
    const givenTop = givenSine ? opposite : adjacent;
    const missingTop = givenSine ? adjacent : opposite;
    const missingSign = givenSine ? cosineSign : sineSign;
    const givenFn = givenSine ? "\\sin" : "\\cos";
    const missingFn = givenSine ? "\\cos" : "\\sin";
    const ordinal = ORDINALS[quadrant - 1] ?? "first";
    return {
      prompt: `A meter reports $${givenFn}\\theta = ${signedFractionTex(givenSine ? sineSign : cosineSign, givenTop, hyp)}$, and the heading $\\theta$ lies in the ${ordinal} quadrant. What is $\\tan\\theta$? Enter one number, as a fraction in lowest terms.`,
      answer: multipleChoiceAnswer(`${tangentSign * opposite}/${adjacent}`),
      params: {
        opposite,
        adjacent,
        hyp,
        quadrant,
        givenSine: givenSine ? 1 : 0,
      },
      hints: [
        `Nothing here hands you the other reading, so recover it first. Square the reading you were given, take that away from $1$, and the Pythagorean identity leaves you the square of the ${givenSine ? "cosine" : "sine"}.`,
        "A square root offers two candidates, so let the quadrant choose between them before dividing anything. Then keep the quotient the right way up, since the tangent is the sine over the cosine and the other way round is a different function.",
      ],
      worked_solution: [
        `The two readings satisfy $\\sin^{2}\\theta + \\cos^{2}\\theta = 1$ at every heading, so the ${givenSine ? "cosine" : "sine"} can be recovered from the ${givenSine ? "sine" : "cosine"} alone.`,
        `Squaring the reading gives $\\left(${signedFractionTex(givenSine ? sineSign : cosineSign, givenTop, hyp)}\\right)^{2} = \\dfrac{${givenTop * givenTop}}{${hyp * hyp}}$, so $${missingFn}^{2}\\theta = 1 - \\dfrac{${givenTop * givenTop}}{${hyp * hyp}} = \\dfrac{${missingTop * missingTop}}{${hyp * hyp}}$.`,
        `Taking the square root leaves two candidates, $\\dfrac{${missingTop}}{${hyp}}$ and $-\\dfrac{${missingTop}}{${hyp}}$.`,
        `In the ${ordinal} quadrant the ${givenSine ? "horizontal" : "vertical"} coordinate is ${missingSign < 0 ? "negative" : "positive"}, so $${missingFn}\\theta = ${signedFractionTex(missingSign, missingTop, hyp)}$.`,
        `The quotient identity finishes it: $\\tan\\theta = \\dfrac{\\sin\\theta}{\\cos\\theta}$, and dividing $${signedFractionTex(sineSign, opposite, hyp)}$ by $${signedFractionTex(cosineSign, adjacent, hyp)}$ gives $${signedFractionTex(tangentSign, opposite, adjacent)}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.opposite}:${params.adjacent}:${params.quadrant}:${params.givenSine}`,
};

/**
 * TRG.5's check: the midline and the amplitude together, with the coefficient as a distractor.
 *
 * A learner who reads only the number out front answers the amplitude, which is why the
 * midline is never zero: with $d = 0$ the wrong reading and the right one coincide and the
 * question stops asking anything. The total is kept off zero for the same reason it is kept
 * off the amplitude, so no instance can be answered by copying a number out of the rule.
 *
 * Whether the LARGEST or the smallest value is wanted rotates too. Both are the same fact
 * about a midline and an amplitude, and rotating them means a learner who added once cannot
 * add again without reading the question.
 */
const TRG5_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.trg5.max-value",
  node_id: "TRG.5",
  difficulty: 3,
  generate(rng: Rng) {
    const isSine = rng.int(0, 1) === 1;
    const amplitude = rng.int(2, 9);
    const coefficient = rng.int(2, 6);
    const wantsMax = rng.int(0, 1) === 1;
    let midline = 0;
    do {
      midline = rng.int(-9, 9);
      // A midline of zero makes the answer the amplitude itself, and a total of zero on
      // either question makes it a number carrying no sign to read.
    } while (midline === 0 || midline + amplitude === 0 || midline - amplitude === 0);
    const answer = wantsMax ? midline + amplitude : midline - amplitude;
    const rule = `y = ${amplitude}${isSine ? "\\sin" : "\\cos"}(${coefficient}x) ${midline < 0 ? "-" : "+"} ${Math.abs(midline)}`;
    const superlative = wantsMax ? "largest" : "smallest";
    return {
      prompt: `A link carries the signal $${rule}$. Give the ${superlative} value that signal ever reaches. Enter one number.`,
      answer: multipleChoiceAnswer(`${answer}`),
      params: {
        amplitude,
        coefficient,
        midline,
        wantsMax: wantsMax ? 1 : 0,
        isSine: isSine ? 1 : 0,
      },
      // Digit-free, since the answer is one small number and a hint naming any number could
      // hold it.
      hints: [
        "Two of the numbers in the rule decide this and one of them does not. Start from the level the signal swings about, which is the constant on the end, and then ask how far from that level a peak sits, which is the number out front.",
        "The coefficient beside $x$ changes how often the signal comes back around and not how far it reaches, so it has no say here. A peak sits the amplitude above the midline and a trough the same distance below it.",
      ],
      worked_solution: [
        `The constant on the end sets the level the signal swings about, so the midline of $${rule}$ is $y = ${midline}$.`,
        `The number out front is the amplitude, so the trace reaches $${amplitude}$ above that level and $${amplitude}$ below it.`,
        `The coefficient $${coefficient}$ inside changes only how often the cycle comes around, so it has no say in how far the signal reaches.`,
        `${isSine ? "Sine" : "Cosine"} takes its own ${superlative} value of $${wantsMax ? 1 : -1}$ somewhere in every cycle, so the ${superlative} reading is the midline ${wantsMax ? "plus" : "minus"} the amplitude.`,
        `That gives $${midline} ${wantsMax ? "+" : "-"} ${amplitude} = ${answer}$, so the ${superlative} value the signal reaches is $${answer}$.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.amplitude}:${params.midline}:${params.wantsMax}:${params.isSine}`,
};

/**
 * TRG.6's check: the break belongs to the ARGUMENT, and the coefficient out front is noise.
 *
 * The node's pool asks for the same asymptote, and this is not that item: `d9.trg6
 * .asymptote-radian.l3` writes a bare $\tan(bx)$, so a learner who read the coefficient as
 * the thing that moves the break has nothing there to be caught by. The check adds a
 * coefficient in FRONT, which changes no asymptote and is the one distractor the question is
 * built around, so the generator lives here rather than pointing at the pool.
 *
 * The inside coefficient stays above one, which keeps the answer a genuine fraction of pi: at
 * $b = 1$ the answer is the quarter turn the reasoning names, and a question whose answer is
 * the number quoted in its own hint is no question.
 */
const TRG6_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.trg6.first-asymptote",
  node_id: "TRG.6",
  difficulty: 3,
  generate(rng: Rng) {
    const inside = rng.int(2, 9);
    const outside = rng.int(1, 5);
    const forms = radianForms(1, 2 * inside);
    const rule = `y = ${outside === 1 ? "" : outside}\\tan(${inside}x)`;
    return {
      prompt: `For $${rule}$, give the smallest positive value of $x$ at which the graph has a vertical asymptote. Give an exact answer in terms of $\\pi$ rather than a decimal, typed with pi for $\\pi$, so $\\dfrac{5\\pi}{12}$ would be typed 5pi/12.`,
      answer: multipleChoiceAnswer(forms[0] ?? ""),
      params: { outside, inside },
      hints: [
        "The break belongs to the whole argument rather than to $x$ on its own. Tangent is a ratio with the cosine underneath it, so it loses its value exactly where that cosine is zero, and the first positive place that happens is a quarter turn.",
        "So set the argument equal to that quarter turn, which is $\\dfrac{\\pi}{2}$ in radians, and solve for $x$ itself. The number out in front multiplies the height of the graph, and no height can move a heading the function has no value at.",
      ],
      worked_solution: [
        `Tangent is $\\dfrac{\\sin\\theta}{\\cos\\theta}$, so it breaks wherever its argument makes the cosine zero, and the first positive argument that does is $\\theta = \\dfrac{\\pi}{2}$.`,
        `Here the argument is $${inside}x$ rather than $x$, so the first break is where $${inside}x = \\dfrac{\\pi}{2}$.`,
        `Dividing both sides by $${inside}$ gives $x = \\dfrac{\\pi}{2} \\times \\dfrac{1}{${inside}} = ${radianTex(1, 2 * inside)}$.`,
        outside === 1
          ? `So the smallest positive asymptote of $${rule}$ sits at $x = ${radianTex(1, 2 * inside)}$, typed as ${forms[0] ?? ""}.`
          : `The $${outside}$ out in front stretches the graph vertically and moves no break, so it never enters the working: the smallest positive asymptote sits at $x = ${radianTex(1, 2 * inside)}$, typed as ${forms[0] ?? ""}.`,
      ],
    };
  },
  varietyKey: (params) => `${params.inside}`,
};

/**
 * Every composition TRG.7's check may draw, and each is one the restricted range CHANGES.
 *
 * That is the whole population and the whole point: a heading inside the stretch its inverse
 * answers in comes straight back, so drawing one would ask a learner nothing. Every row here
 * puts the inner heading outside that stretch, so the answer is never the heading that went
 * in. The readings are held to the special values so the middle step is exact, which the
 * worked solution needs and a decimal would deny it.
 */
const PRINCIPAL_COMPOSITIONS: readonly {
  kind: number;
  deg: number;
  valueTex: string;
}[] = [
  { kind: 0, deg: 210, valueTex: "-\\dfrac{\\sqrt{3}}{2}" },
  { kind: 0, deg: 225, valueTex: "-\\dfrac{\\sqrt{2}}{2}" },
  { kind: 0, deg: 240, valueTex: "-\\dfrac{1}{2}" },
  { kind: 0, deg: 300, valueTex: "\\dfrac{1}{2}" },
  { kind: 0, deg: 315, valueTex: "\\dfrac{\\sqrt{2}}{2}" },
  { kind: 0, deg: 330, valueTex: "\\dfrac{\\sqrt{3}}{2}" },
  { kind: 1, deg: 120, valueTex: "\\dfrac{\\sqrt{3}}{2}" },
  { kind: 1, deg: 135, valueTex: "\\dfrac{\\sqrt{2}}{2}" },
  { kind: 1, deg: 150, valueTex: "\\dfrac{1}{2}" },
  { kind: 2, deg: 210, valueTex: "\\dfrac{\\sqrt{3}}{3}" },
  { kind: 2, deg: 225, valueTex: "1" },
  { kind: 2, deg: 240, valueTex: "\\sqrt{3}" },
];

/**
 * TRG.7's check: evaluate the inside, then let the restricted range answer.
 *
 * The reading in the middle carries a radical on eight of the twelve rows, and that is safe
 * where an ANSWER would not be: the reading is prose in a worked-solution step and the answer
 * is a whole number of degrees, which is what the field grades. Asked in degrees throughout,
 * because `intervalAnswer("[-pi/2, pi/2]")` is a parse error at the key, so a learner is never
 * shown a spelling of a range the surface would refuse.
 */
const TRG7_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.trg7.compose-principal",
  node_id: "TRG.7",
  difficulty: 3,
  generate(rng: Rng) {
    const { kind, deg, valueTex } = rng.pick(PRINCIPAL_COMPOSITIONS);
    const answer = principalDegrees(kind, deg);
    const innerFn = ["\\cos", "\\sin", "\\tan"][kind] ?? "\\cos";
    const outerFn = ["\\arccos", "\\arcsin", "\\arctan"][kind] ?? "\\arccos";
    const innerName = ["the cosine", "the sine", "the tangent"][kind] ?? "the cosine";
    const outerName = ["Arccosine", "Arcsine", "Arctangent"][kind] ?? "Arccosine";
    const range =
      [
        "[0^{\\circ}, 180^{\\circ}]",
        "[-90^{\\circ}, 90^{\\circ}]",
        "(-90^{\\circ}, 90^{\\circ})",
      ][kind] ?? "[0^{\\circ}, 180^{\\circ}]";
    const quadrant = Math.floor(deg / 90) + 1;
    const reference = deg < 180 ? 180 - deg : deg < 270 ? deg - 180 : 360 - deg;
    const positive = !valueTex.startsWith("-");
    return {
      prompt: `Evaluate $${outerFn}(${innerFn} ${deg}^{\\circ})$, giving the heading in degrees. Enter one number.`,
      answer: multipleChoiceAnswer(`${answer}`),
      params: { kind, deg },
      // Digit-free, as the other whole-number checks in this domain are.
      hints: [
        "Work from the inside out, and turn the inner reading into a number first. Its reference angle gives the size, and the quadrant the heading lands in gives the sign.",
        "Then ask the inverse for the one heading inside the stretch it is allowed to answer in whose reading is that number. The heading you started from lies outside that stretch, which is exactly why it cannot be the heading that comes back.",
      ],
      worked_solution: [
        `Work from the inside out, so the first job is the reading $${innerFn} ${deg}^{\\circ}$.`,
        `Its reference angle is $${reference}^{\\circ}$, and ${innerName} is ${positive ? "positive" : "negative"} in the ${ORDINALS[quadrant - 1] ?? "first"} quadrant, so $${innerFn} ${deg}^{\\circ} = ${valueTex}$.`,
        `${outerName} may only answer inside $${range}$, and $${deg}^{\\circ}$ is not in there, so the heading that went in cannot be the heading that comes out.`,
        `Inside that stretch exactly one heading gives that reading, and it is $${answer}^{\\circ}$.`,
        `So $${outerFn}(${innerFn} ${deg}^{\\circ}) = ${answer}^{\\circ}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.kind}:${params.deg}`,
};

/**
 * TRG.8's check: one algebra step, then a roster, then the larger of its two headings.
 *
 * The roster is the work and is not the answer, deliberately. `solution_set` is not one of the
 * two `check` types this path grades, so asking for the roster would leave the pack on its
 * accepted list alone; asking which of the two headings is larger keeps every step of the work
 * and lands on a number. A learner who stopped after one heading cannot answer it, which is
 * the first of the two failures the node's third slide names.
 *
 * The radical constants are in the EQUATION and never in the answer. $2\sin x - \sqrt{3} = 0$
 * is a fine question here because what the learner types is a heading in degrees.
 */
const TRG8_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.trg8.larger-root",
  node_id: "TRG.8",
  difficulty: 3,
  generate(rng: Rng) {
    const isSine = rng.int(0, 1) === 1;
    const reference = rng.pick([30, 45, 60]);
    const negative = rng.int(0, 1) === 1;
    // The constant is twice the function's value AT the reference angle, so it cannot be read
    // off the angle alone: a sine climbs across $30/45/60$ and a cosine falls. Written as one
    // table it was right on every sine draw and wrong on two thirds of the cosines, which
    // asked $2\cos x - 1 = 0$ over a stated reference angle of $30^{\circ}$ and an answer of
    // $330^{\circ}$, when $\cos x = \dfrac{1}{2}$ is $60^{\circ}$ and $300^{\circ}$.
    const constant = isSine
      ? reference === 30
        ? "1"
        : reference === 45
          ? "\\sqrt{2}"
          : "\\sqrt{3}"
      : reference === 30
        ? "\\sqrt{3}"
        : reference === 45
          ? "\\sqrt{2}"
          : "1";
    const fn = isSine ? "\\sin" : "\\cos";
    const roots = isSine
      ? negative
        ? [180 + reference, 360 - reference]
        : [reference, 180 - reference]
      : negative
        ? [180 - reference, 180 + reference]
        : [reference, 360 - reference];
    const lower = Math.min(...roots);
    const larger = largerBasicRoot(isSine, reference, negative);
    const quadrants = isSine
      ? negative
        ? "third and fourth"
        : "first and second"
      : negative
        ? "second and third"
        : "first and fourth";
    const placement = isSine
      ? negative
        ? `$180^{\\circ} + ${reference}^{\\circ} = ${180 + reference}^{\\circ}$ and $360^{\\circ} - ${reference}^{\\circ} = ${360 - reference}^{\\circ}$`
        : `the reference angle itself, $${reference}^{\\circ}$, and $180^{\\circ} - ${reference}^{\\circ} = ${180 - reference}^{\\circ}$`
      : negative
        ? `$180^{\\circ} - ${reference}^{\\circ} = ${180 - reference}^{\\circ}$ and $180^{\\circ} + ${reference}^{\\circ} = ${180 + reference}^{\\circ}$`
        : `the reference angle itself, $${reference}^{\\circ}$, and $360^{\\circ} - ${reference}^{\\circ} = ${360 - reference}^{\\circ}$`;
    return {
      prompt: `Solve $2${fn} x ${negative ? "+" : "-"} ${constant} = 0$ for $0^{\\circ} \\le x < 360^{\\circ}$, then give the LARGER of the two headings. Enter one number, in degrees, with no degree sign.`,
      answer: multipleChoiceAnswer(`${larger}`),
      params: {
        isSine: isSine ? 1 : 0,
        reference,
        negative: negative ? 1 : 0,
      },
      // Digit-free, as the other whole-number checks in this domain are.
      hints: [
        "Isolate the function before anything else. Take the constant across, then divide both sides by the number multiplying the function, so what is left is the function on its own against a plain value.",
        "Then split the work in two. The SIZE of that value, with its sign set aside, fixes the acute reference angle, and only afterwards does the sign choose which pair of quadrants the reference angle is measured into. Work both headings out before deciding which of them to write down.",
      ],
      worked_solution: [
        `Move the constant across first: $2${fn} x = ${negative ? "-" : ""}${constant}$.`,
        `Divide both sides by $2$, which leaves the function standing alone: $${fn} x = ${negative ? "-" : ""}\\dfrac{${constant}}{2}$.`,
        `Set the sign aside and match the size: $${fn} ${reference}^{\\circ} = \\dfrac{${constant}}{2}$, so the reference angle is $${reference}^{\\circ}$.`,
        `The value is ${negative ? "negative" : "positive"}, and ${isSine ? "a sine" : "a cosine"} is ${negative ? "negative" : "positive"} in the ${quadrants} quadrants, so the reference angle is placed in each of them: ${placement}.`,
        `Both headings lie inside the window, so the roster is $\\{${lower}^{\\circ},\\; ${larger}^{\\circ}\\}$ and the larger of the two is $${larger}$.`,
      ],
    };
  },
  varietyKey: (params) => `${params.isSine}:${params.reference}:${params.negative}`,
};

/**
 * TRG.9's check: pick the doubling form the given reading can actually feed.
 *
 * Three forms give $\cos 2\theta$ and only one of them is written in the function handed over,
 * so which reading is given is the question rather than a detail, and it rotates. The triple
 * keeps the squared reading rational; a radical answer would not grade on this path.
 *
 * The quadrant is stated and does no arithmetic, exactly as it does not in the pack's own
 * authored question. That is not a decorative parameter: a learner who reaches for
 * $\sin 2\theta$ needs it, and the last worked-solution step says why $\cos 2\theta$ does not,
 * which is the distinction between the two double-angle formulas.
 */
const TRG9_CFU_TEMPLATE: ItemTemplate = {
  template_id: "cfu.trg9.double-from-sine",
  node_id: "TRG.9",
  difficulty: 3,
  generate(rng: Rng) {
    const [shorter, longer, hyp] = rng.pick(PYTHAGOREAN_LEGS);
    const swap = rng.int(0, 1) === 1;
    const opposite = swap ? longer : shorter;
    const adjacent = swap ? shorter : longer;
    const quadrant = rng.int(1, 4);
    const givenSine = rng.int(0, 1) === 1;
    const givenTop = givenSine ? opposite : adjacent;
    const givenSign = givenSine
      ? quadrant <= 2
        ? 1
        : -1
      : quadrant === 1 || quadrant === 4
        ? 1
        : -1;
    const square = givenTop * givenTop;
    const whole = hyp * hyp;
    const top = doubleAngleTop(givenSine, givenTop, hyp);
    const givenTex = signedFractionTex(givenSign, givenTop, hyp);
    return {
      prompt: `Given $${givenSine ? "\\sin" : "\\cos"}\\theta = ${givenTex}$ with $\\theta$ in the ${ORDINALS[quadrant - 1] ?? "first"} quadrant, find the exact value of $\\cos 2\\theta$. Enter one number, as a fraction in lowest terms.`,
      answer: multipleChoiceAnswer(`${top}/${whole}`),
      params: {
        opposite,
        adjacent,
        hyp,
        quadrant,
        givenSine: givenSine ? 1 : 0,
      },
      hints: [
        `Cosine has three doubling forms, and the one to reach for is whichever is written in the function you were handed: $\\cos 2\\theta = ${givenSine ? "1 - 2\\sin^{2}\\theta" : "2\\cos^{2}\\theta - 1"}$.`,
        "Square the reading you were given, double it, and combine it with $1$ by writing $1$ over the same denominator. The quadrant fixes the sign of the reading you were handed, and squaring throws that sign away again.",
      ],
      worked_solution: [
        `Three forms give $\\cos 2\\theta$, and the one to reach for is the form written in the function you were handed: $\\cos 2\\theta = ${givenSine ? "1 - 2\\sin^{2}\\theta" : "2\\cos^{2}\\theta - 1"}$.`,
        `Square the given value: $\\left(${givenTex}\\right)^{2} = \\dfrac{${square}}{${whole}}$.`,
        givenSine
          ? `Substitute it, writing $1$ over the same denominator: $1 - 2 \\cdot \\dfrac{${square}}{${whole}} = \\dfrac{${whole}}{${whole}} - \\dfrac{${2 * square}}{${whole}}$.`
          : `Substitute it, writing $1$ over the same denominator: $2 \\cdot \\dfrac{${square}}{${whole}} - 1 = \\dfrac{${2 * square}}{${whole}} - \\dfrac{${whole}}{${whole}}$.`,
        "The quadrant never enters the arithmetic, because the reading went in squared and a squared value carries no sign.",
        `So $\\cos 2\\theta = ${signedFractionTex(top < 0 ? -1 : 1, Math.abs(top), whole)}$, entered as ${top}/${whole}.`,
      ],
    };
  },
  varietyKey: (params) =>
    `${params.opposite}:${params.adjacent}:${params.hyp}:${params.givenSine}`,
};

/** Templates a check may draw from that are not in any practice pool. */
const CFU_ONLY_TEMPLATES: readonly ItemTemplate[] = [
  LF1_CFU_TEMPLATE,
  EL5_CFU_TEMPLATE,
  EL6_CFU_TEMPLATE,
  NUM2_CFU_TEMPLATE,
  NUM4_CFU_TEMPLATE,
  NUMF_CFU_TEMPLATE,
  EXP1_CFU_TEMPLATE,
  RAD1_CFU_TEMPLATE,
  RAD2_CFU_TEMPLATE,
  RAD4_CFU_TEMPLATE,
  RAT1_CFU_TEMPLATE,
  RAT2_CFU_TEMPLATE,
  RAT3_CFU_TEMPLATE,
  RAT4_CFU_TEMPLATE,
  RAT5_CFU_TEMPLATE,
  LF3_CFU_TEMPLATE,
  EL2_CFU_TEMPLATE,
  EL4_CFU_TEMPLATE,
  POL2_CFU_TEMPLATE,
  GEO1_CFU_TEMPLATE,
  GEO2_CFU_TEMPLATE,
  CG1_CFU_TEMPLATE,
  FUN1_CFU_TEMPLATE,
  FUN2_CFU_TEMPLATE,
  FUN3_CFU_TEMPLATE,
  FUN4_CFU_TEMPLATE,
  FUN5_CFU_TEMPLATE,
  FUN6_CFU_TEMPLATE,
  FUN7_CFU_TEMPLATE,
  FUN8_CFU_TEMPLATE,
  FUN9_CFU_TEMPLATE,
  FUN10_CFU_TEMPLATE,
  TRG1_CFU_TEMPLATE,
  TRG2_CFU_TEMPLATE,
  TRG3_CFU_TEMPLATE,
  TRG4_CFU_TEMPLATE,
  TRG5_CFU_TEMPLATE,
  TRG6_CFU_TEMPLATE,
  TRG7_CFU_TEMPLATE,
  TRG8_CFU_TEMPLATE,
  TRG9_CFU_TEMPLATE,
];

/**
 * The templates above, exported so a guard can derive its population from this list rather
 * than from a copy of it written down in the test.
 *
 * These are the checks a practice pool does not serve, so they are also the checks whose
 * worked-solution figures nothing else in the tree sweeps: `visualsMath.test.tsx` and
 * `workedSolutionArithmetic.test.tsx` both build their populations out of the item bank's
 * practice exports, and a `cfu.` id is in none of them. A guard that wants to render every
 * CFU figure has to start here.
 */
export const CFU_ONLY_TEMPLATE_LIST: readonly ItemTemplate[] = CFU_ONLY_TEMPLATES;

/** Greatest common divisor, positive, for the draw constraints above. */
function gcdOf(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

/* ----------------------------------------------- D9: the answers the two paths agree on */

/**
 * A radian measure as a fraction times pi, in the spellings a learner types.
 *
 * D9's two radian checks are the only answers in this file carrying a symbol rather than a
 * number, so the shape lives beside them. The list is TRG.1's own authored one widened by the
 * spellings `docs/D9_Domain_Plan.md` measured as `correct/match` on the practice path
 * (`5pi/6`, `5*pi/6`, `(5/6)pi`, `5/6 pi`), plus the two LaTeX fractions a learner copying the
 * prompt's typesetting writes.
 *
 * A decimal is deliberately absent, and that is the one place this list is narrower than a
 * fraction's would be: `0.5pi` grades `wrong_representation` over there, so accepting it here
 * would teach a spelling the practice items refuse. Lowest terms is NOT required for the same
 * reason read the other way, `14pi/12` grading against a key of `7pi/6`, so nothing that
 * reaches this function may ask for a reduction and the caller reduces before spelling.
 */
function radianForms(numerator: number, denominator: number): readonly string[] {
  const divisor = gcdOf(numerator, denominator);
  const top = numerator / divisor;
  const bottom = denominator / divisor;
  if (top < 1 || bottom < 1 || !Number.isInteger(top) || !Number.isInteger(bottom)) {
    return [];
  }
  if (bottom === 1) {
    return top === 1 ? ["pi", "1pi", "1*pi"] : [`${top}pi`, `${top}*pi`, `pi*${top}`];
  }
  const tex = top === 1 ? "\\pi" : `${top}\\pi`;
  return [
    // Canonical first, and it is the bare `pi/6` shape: the reveal prints this string and asks
    // the learner to type it, so it has to be the one the prompt's own example shows.
    ...(top === 1 ? [`pi/${bottom}`, `1pi/${bottom}`] : [`${top}pi/${bottom}`]),
    `${top}*pi/${bottom}`,
    `(${top}/${bottom})pi`,
    `(${top}/${bottom})*pi`,
    `${top}/${bottom}pi`,
    `${top}/${bottom}*pi`,
    `pi*${top}/${bottom}`,
    `\\dfrac{${tex}}{${bottom}}`,
    `\\frac{${tex}}{${bottom}}`,
  ];
}

/** The same measure typeset, for a prompt or a worked-solution step. */
function radianTex(numerator: number, denominator: number): string {
  const tex = numerator === 1 ? "\\pi" : `${numerator}\\pi`;
  return denominator === 1 ? tex : `\\dfrac{${tex}}{${denominator}}`;
}

/** A signed fraction typeset, so a negative reading never renders as a bare minus in a bar. */
function signedFractionTex(sign: number, numerator: number, denominator: number): string {
  return `${sign < 0 ? "-" : ""}\\dfrac{${numerator}}{${denominator}}`;
}

/**
 * The sign the quadrant puts on the coordinate TRG.3's check asks for.
 *
 * Written as a function of the heading rather than stored beside it, because the SPELLER has
 * to reach the same sign from the pack's own two parameters: a stored sign would be the answer
 * written down, and this recomputes it.
 */
function circleReadingSign(isSine: boolean, deg: number): number {
  if (isSine) {
    return deg < 180 ? 1 : -1;
  }
  return deg < 90 || deg > 270 ? 1 : -1;
}

/** The sign a quadrant puts on a tangent, which is its sine's sign times its cosine's. */
function quadrantTangentSign(quadrant: number): number {
  return quadrant === 1 || quadrant === 3 ? 1 : -1;
}

/**
 * The principal heading a composition hands back, in degrees.
 *
 * `kind` is `0` for arccosine over cosine, `1` for arcsine over sine and `2` for arctangent
 * over tangent, and each formula holds only on the headings
 * {@link PRINCIPAL_COMPOSITIONS} draws: those are the ones lying OUTSIDE the stretch the
 * inverse answers in, which is why the answer is never the heading that went in.
 */
function principalDegrees(kind: number, deg: number): number {
  if (kind === 1) {
    return 180 - deg;
  }
  if (kind === 2) {
    return deg - 180;
  }
  return 360 - deg;
}

/** The larger of the two headings in one turn, which is what TRG.8's check asks for. */
function largerBasicRoot(isSine: boolean, reference: number, negative: boolean): number {
  if (isSine) {
    return negative ? 360 - reference : 180 - reference;
  }
  return negative ? 180 + reference : 360 - reference;
}

/**
 * The numerator of $\cos 2\theta$ over $c^{2}$, from one reading of a Pythagorean triple.
 *
 * Two forms of one identity, and which one applies is decided by which reading was handed
 * over: $1 - 2\sin^{2}\theta$ from a sine and $2\cos^{2}\theta - 1$ from a cosine. They are
 * negatives of each other over the same leg, which is what makes a rotation of the given
 * function move the answer rather than merely reword the question.
 */
function doubleAngleTop(givenSine: boolean, given: number, hypotenuse: number): number {
  const square = given * given;
  const whole = hypotenuse * hypotenuse;
  return givenSine ? whole - 2 * square : 2 * square - whole;
}

/** A number as an answer box spells it, matching `cfuAcceptedForms.ts`'s own rounding. */
function numberText(value: number): string {
  return String(Number(value.toFixed(6)));
}

/**
 * A union of two outward rays, in the ways a learner writes the join and the infinities.
 *
 * `intervalForms` in `cfuAcceptedForms.ts` spells ONE interval and has no union shape at all, so
 * this is the missing half of that grammar rather than a variation on it. It keeps that file's
 * two rulings and adds one of its own:
 *
 *  - the BRACKETS are not an axis and must never become one. Which bracket each end takes is
 *    half of what LIN.6 is testing, so a list offering both would mark the misconception correct;
 *  - an infinite end is always round, whatever the caller passes, and the three spellings of
 *    infinity are the same number;
 *  - the JOIN is an axis, and has to be, because every surface the learner has met spells it
 *    differently. `parseIntervals` in the practice checker splits on ` U `, the glyph, or the
 *    word `or`; the interval placeholder advertises the letter; LIN.6's prose prints
 *    $(-\infty, 58) \cup (62, \infty)$; and its set-builder template teaches the word. A learner
 *    who typed back what the slide showed them must not lose the attempt on the spelling.
 *
 * SPACING is deliberately not an axis. A check with no `check` block grades by exact match after
 * {@link normalizeAcceptedAnswer}, which strips every space, so `(-inf, 15) U (25, inf)` and
 * `(-inf,15)U(25,inf)` are already one entry here. That is worth saying rather than leaving to be
 * rediscovered: the whitespace around a union IS load-bearing one layer down, in the practice
 * grader, and the two surfaces are otherwise easy to reason about as if they agreed.
 */
function unionForms(
  low: number,
  high: number,
  {
    lowClosed = false,
    highClosed = false,
  }: { lowClosed?: boolean; highClosed?: boolean } = {},
): readonly string[] {
  // The two rays have to miss each other, or the answer is not this shape.
  if (!(low < high)) {
    return [];
  }
  const forms: string[] = [];
  const seen = new Set<string>();
  for (const word of ["inf", "infinity", "\u221e"]) {
    const left = `(-${word}, ${numberText(low)}${lowClosed ? "]" : ")"}`;
    const right = `${highClosed ? "[" : "("}${numberText(high)}, ${word})`;
    for (const join of [" U ", " \u222a ", " or "]) {
      const form = `${left}${join}${right}`;
      const key = normalizeAcceptedAnswer(form);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      forms.push(form);
    }
  }
  return forms;
}

/**
 * The strings a learner could copy out of an answer field's placeholder and type.
 *
 * Shared by {@link resolve}, which refuses to draw an instance one of these answers, and by
 * `cfuPlaceholderLeak.test.ts`, which asserts no question in the tree is answered by one. Two
 * copies of this grammar would be two different answers to "what is this field advertising", and
 * the constraint and the guard would then be able to disagree.
 *
 * Deliberately generous, because the failure mode of a narrow extractor is a leak that ships. The
 * whole line and its example tail are what a learner reads as "write it like this"; the tail's
 * comma- and `or`-separated pieces are what the multi-example lines offer
 * (`"2*x*sqrt(2*x), abs(x^5), |x^5|"`); and every bare number anywhere in the line is the case
 * this exists for, since a numeric answer IS a bare number and `{-1, 4}` shows two of them.
 */
export function placeholderExamples(placeholder: string): readonly string[] {
  const tail = placeholder.replace(/^.*?(?::|\be\.g\.)\s*/s, "");
  return [
    ...new Set([
      placeholder,
      tail,
      ...tail.split(/,\s(?=\S)|\s+or\s+/i).map((piece) => piece.trim()),
      ...(placeholder.match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) ?? []),
    ]),
  ].filter((form) => form.length > 0);
}

/* --------------------------------------------------------------------------- spellers */

/**
 * How each converted check's answers are spelled.
 *
 * One entry per converted pack. A pack that declares `variants` with no entry here resolves to
 * its authored question alone rather than serving a list nobody wrote, and
 * `cfuVariants.test.ts` fails on it, so the omission is loud instead of quiet.
 */
const SPELLERS: Readonly<Record<string, Speller>> = {
  // NUM.S: a signed running balance. One whole number, possibly negative.
  "d1.num-s.l1": (params) => {
    const a = params.a ?? 0;
    const b = params.b ?? 0;
    return integerForms((params.sa === 1 ? -a : a) + (params.sb === 1 ? -b : b));
  },
  // NUM.3: expand a(v + b). Both term orders, both multiplication spellings.
  "d1.num-3.l1": (params) => {
    const a = params.a ?? 0;
    const b = params.b ?? 0;
    return linearForms(a, a * b, EXPRESSION_VARIABLES[params.varIndex ?? 0] ?? "x");
  },
  // NUM.5: a percent of a dollar amount. Constrained to a whole number of dollars below.
  "d1.num-5.l2": (params) => integerForms(((params.p ?? 0) * (params.base ?? 0)) / 100),
  // RAD.3: evaluate a rational power. The pool cell's cases all land on a whole number.
  "d2.rad3.eval.l1": (params) => integerForms(params.value ?? 0),
  // LIN.1: a balance stated in words, keyed on one ingot's weight.
  "d3.lin1.balance-word.l2": (params) => integerForms(params.weight ?? 0),
  // LIN.3: rearrange a formula, then use it. Keyed on the tin charged.
  "d3.lin3.melt-tin.l2": (params) => integerForms(params.tin ?? 0),
  // LIN.4: a two-step inequality as a ray. The bracket is the answer, so it is never an axis.
  //
  // This is the shape LIN.4's AUTHORED question asks and no longer the shape of its re-ask, so the
  // pack names it in `worked_solution_template` rather than in `variants`. It stays registered for
  // the same reason `d3.lin6.band.l1` does: `cfuVariants.test.ts` spells the pack's own authored
  // parameters through it, which is how "a converted check accepts everything its authored
  // question accepted" survives a re-ask that changes the answer's shape on purpose.
  "d3.lin4.two-step.l2": (params) =>
    params.upward === 1
      ? intervalForms(params.bound ?? 0, Number.POSITIVE_INFINITY, {
          lowClosed: params.closed === 1,
        })
      : intervalForms(Number.NEGATIVE_INFINITY, params.bound ?? 0, {
          highClosed: params.closed === 1,
        }),
  // LIN.4: the two-piece shape, as two outward rays with a gap between them. The check re-asks
  // this one while its authored question asks a single ray, because the split between a one-piece
  // answer and a two-piece one is half of what the node teaches -- `LIN.4.json:8`, "if the two
  // stretches do not touch the answer is two separate pieces joined by the union symbol" -- and a
  // check that only ever asks the ray never measures it. `compound-or.l2` is the two-piece answer
  // at the check's OWN tier: one move per half, against `compound-or.l3`'s two, so the re-ask is
  // not harder than the question the learner has just missed.
  "d3.lin4.compound-or.l2": (params) =>
    unionForms(params.low ?? 0, params.high ?? 0, {
      lowClosed: params.lowClosed === 1,
      highClosed: params.highClosed === 1,
    }),
  // LIN.5: two branches off one absolute value, as a set.
  "d3.lin5.shift.l1": (params) => {
    const centre = params.centre ?? 0;
    const distance = params.distance ?? 0;
    return solutionSetForms([centre - distance, centre + distance]);
  },
  // LIN.6: the band shape, as one bounded interval. This is the shape LIN.6's AUTHORED question
  // asks and no longer the shape of its re-ask, so no pack names it in `variants`. It is not dead
  // for that: `cfuVariants.test.ts` spells the pack's own authored parameters through it, which
  // is how the "a converted check accepts everything its authored question accepted" obligation
  // survives a re-ask that deliberately changes the answer's shape.
  "d3.lin6.band.l1": (params) => {
    const centre = params.centre ?? 0;
    const tolerance = params.tolerance ?? 0;
    const closed = params.closed === 1;
    return intervalForms(centre - tolerance, centre + tolerance, {
      lowClosed: closed,
      highClosed: closed,
    });
  },
  // LIN.6: the away-from shape, as two outward rays with a gap between them. The check's re-ask
  // asks this one while its authored question asks the band, because the discrimination between
  // the two shapes IS the node -- `LIN.6.json:5`, "Which of the two shapes an answer takes is
  // settled entirely by which way the inequality sign points" -- and a check serving the same
  // shape twice never takes a measurement of it. `union.l2` is tagged difficulty 2 against
  // `band.l1`'s 1, which is a tag difference rather than a harder re-ask: the arithmetic is the
  // same one-step move and only the shape it is poured into differs.
  "d3.lin6.union.l2": (params) => {
    const centre = params.centre ?? 0;
    const tolerance = params.tolerance ?? 0;
    const closed = params.closed === 1;
    return unionForms(centre - tolerance, centre + tolerance, {
      lowClosed: closed,
      highClosed: closed,
    });
  },
  // RAT.6: an equation whose algebra invents a root the denominators forbid. The extraneous
  // candidate is passed because this template is the one that HAS one: its quadratic factors
  // as `(x + p)(x - r)`, so `-p` is a candidate and `-p` is exactly the excluded value.
  "d5.rat6.cursed.l3": (params) =>
    solutionSetForms([params.r ?? 0], { extraneous: [-(params.p ?? 0)] }),
  // LF.2: a perpendicular line, spelled as an equation rather than as a value.
  "d7.lf2.perpendicular-standard.l3": (params) =>
    equationForms(params.m ?? 0, params.c ?? 0),
  // EL.1: a geometric decay continued. Keyed on the amount left.
  "d8.el1.decay-value.l2": (params) => integerForms(params.m ?? 0),
  // EL.3: a logarithm evaluated, which is the exponent it hands back.
  "d8.el3.evaluate-base.l2": (params) => integerForms(params.k ?? 0),
  // EL.5: one condensed logarithm, spelled by its argument. The product commutes, so the
  // symbol may lead, and the argument may be written with or without an explicit `*`.
  "cfu.el5.condense-coefficient": (params) => {
    const value = params.value ?? 0;
    const symbol = el5Symbol(params.symIndex ?? 0);
    return logArgumentForms([
      `${value}${symbol}`,
      `${value}*${symbol}`,
      `${symbol}*${value}`,
    ]);
  },
  // EL.6: two logarithms of one base gathered, converted, and one of the quadratic's two roots
  // thrown out. The surviving root is the whole answer, so this is `integerForms` and not
  // `solutionSetForms`: the question ends "Enter one number", exactly as the authored one does,
  // and a braced set printed into a field asking for a number is the mismatch the CFU-only
  // template above exists to avoid.
  "cfu.el6.solve-extraneous": (params) => integerForms(params.kept ?? 0),
  // NUM.2: a precedence chain, which lands on one whole number.
  "cfu.num2.precedence-chain": (params) => integerForms(params.value ?? 0),
  // NUM.4: the squared term that could not be combined, beside the linear one that could.
  "cfu.num4.unlike-term": (params) =>
    squarePlusLinearForms(
      params.total ?? 0,
      EXPRESSION_VARIABLES[params.varIndex ?? 0] ?? "x",
    ),
  // NUM.F: a product in lowest terms. Decimals are refused rather than offered: the pack's
  // own `check` is keyed `representation: "fraction"` with `simplification:
  // "reduced_fraction"`, and writing the product AS a reduced fraction is the question.
  "cfu.numf.multiply-reduce": (params) =>
    fractionForms(params.n ?? 0, params.d ?? 1, { decimals: false }),
  // EXP.1: one over a power, which is what the negative total turns into.
  "cfu.exp1.negative-total": (params) =>
    reciprocalPowerForms(
      EXPRESSION_VARIABLES[params.varIndex ?? 0] ?? "x",
      params.power ?? 1,
    ),
  // RAD.1: a coefficient times a root, over a whole number.
  "cfu.rad1.quotient-radical": (params) =>
    radicalForms(params.outside ?? 1, params.inside ?? 0, params.root ?? 1),
  // RAD.2: a bare root, the coefficient having cancelled.
  "cfu.rad2.combine-rationalize": (params) => radicalForms(1, params.inside ?? 0),
  // RAD.4: a coefficient times an odd power wearing bars.
  "cfu.rad4.odd-half-bars": (params) =>
    absBarsForms(
      params.coefficient ?? 1,
      EXPRESSION_VARIABLES[params.varIndex ?? 0] ?? "x",
      params.half ?? 1,
    ),
  // RAT.1: the reduced expression, then the two values the original bottom forbade.
  "cfu.rat1.reduce-exclusions": (params) => {
    const a = params.a ?? 0;
    const b = params.b ?? 0;
    return withExclusions(ratioForms([`x + ${a}`, `${a} + x`], [`x + ${b}`, `${b} + x`]), [
      a,
      -b,
    ]);
  },
  // RAT.2: the same, with the third exclusion the flip created.
  "cfu.rat2.divide-exclusions": (params) => {
    const a = params.a ?? 0;
    const b = params.b ?? 0;
    const c = params.c ?? 0;
    return withExclusions(ratioForms([`x + ${a}`, `${a} + x`], [`x + ${c}`, `${c} + x`]), [
      -b,
      -c,
      a,
    ]);
  },
  // RAT.3: a linear top over a FACTORED bottom, which the pack also accepts expanded.
  "cfu.rat3.subtract-lcd": (params) => {
    const r = params.r ?? 0;
    const s = params.s ?? 0;
    const constant = params.constant ?? 0;
    // Zipped rather than crossed: a learner who reorders the bottom's factors does not also
    // reorder the top's terms, so the pairs are written out instead of multiplied together.
    const tops = [
      `x+${constant}`,
      `x+${constant}`,
      `${constant}+x`,
      `x+${constant}`,
      `x+${constant}`,
    ];
    const bottoms = [
      `(x-${r})(x+${s})`,
      `(x+${s})(x-${r})`,
      `(x-${r})(x+${s})`,
      `(x-${r})*(x+${s})`,
      // The expanded bottom, which is the same denominator and is in the pack's list.
      `x^2${s - r < 0 ? `-${r - s}` : `+${s - r}`}x-${r * s}`,
    ];
    return withExclusions(ratioForms(tops, bottoms), [-s, r]);
  },
  // RAT.4: a whole number over a monomial, plus the exclusion the inner denominator made.
  "cfu.rat4.complex-clear": (params) => {
    const d = params.d ?? 1;
    const n = params.n ?? 0;
    // Written out rather than run through `ratioForms`, because the canonical spelling here
    // does NOT bracket its numerator and the card's normalization keeps parentheses: `5/(4x)`
    // and `(5)/(4x)` are two entries, and the pack's is the first.
    return withExclusions(
      [
        `${n}/(${d}x)`,
        `${n}/(${d}*x)`,
        `${n}/(x*${d})`,
        `${n}/${d}x`,
        `(${n})/(${d}x)`,
        `\\dfrac{${n}}{${d}x}`,
        `\\frac{${n}}{${d}x}`,
      ],
      [-d, 0],
    );
  },
  // RAT.5: three parts, and the widest list in the tree. The two asymptotes may be reported
  // either way round, which is two passes over `compositeForms` rather than its `reversed`
  // flag: that flag reverses ALL the parts, and the hole stays first in every shipped form.
  "cfu.rat5.hole-asymptotes": (params) => {
    const hole = params.hole ?? 0;
    const height = params.height ?? 0;
    const vertical = params.vertical ?? 0;
    const lead = params.lead ?? 0;
    const point = `(${hole}, ${height})`;
    const holeForms = [
      point,
      `(x, y) = ${point}`,
      `(${hole}.0, ${height}.0)`,
      `hole ${point}`,
      `hole: ${point}`,
      `hole at ${point}`,
      `${point}; hole`,
      `${point}, hole`,
      `${point} and hole`,
    ];
    const verticalForms = [
      `x = ${vertical}`,
      `${vertical}`,
      `x = ${vertical}.0`,
      `va x = ${vertical}`,
      `va: x = ${vertical}`,
      `vertical asymptote x = ${vertical}`,
      `asymptote x = ${vertical}`,
    ];
    const horizontalForms = [
      `y = ${lead}`,
      `${lead}`,
      `y = ${lead}.0`,
      `ha y = ${lead}`,
      `ha: y = ${lead}`,
      `horizontal asymptote y = ${lead}`,
      `level y = ${lead}`,
    ];
    const separators = [", ", "; ", " and "];
    return [
      ...compositeForms([holeForms, verticalForms, horizontalForms], { separators }),
      ...compositeForms([holeForms, horizontalForms, verticalForms], { separators }),
    ];
  },
  // LF.3: the model's right-hand side, then the number it predicts.
  "cfu.lf3.drain-model": (params) => {
    const rate = params.rate ?? 0;
    const start = params.start ?? 0;
    const left = params.left ?? 0;
    return compositeForms(
      [
        equationForms(-rate, start),
        [...integerForms(left), `y = ${left}`, `y = ${left}.0`, `${left} liters`],
      ],
      { separators: [", ", "; ", " and "] },
    );
  },
  // EL.2: an asymptote and a moved anchor, either way round. Naming both removes the
  // ambiguity that would otherwise make the order part of the answer.
  "cfu.el2.reflect-shift": (params) => {
    const shift = params.shift ?? 0;
    const anchor = params.anchor ?? 0;
    return compositeForms(
      [
        [`y = ${shift}`, `${shift}`, `y = ${shift}.0`, `asymptote y = ${shift}`],
        [`(0, ${anchor})`, `point (0, ${anchor})`, `(0, ${anchor}.0)`],
      ],
      { separators: [", ", "; ", " and "], reversed: true },
    );
  },
  // EL.4: a domain inequality and the asymptote at its boundary. The bare space is a
  // separator here because the pack accepts `x < 9 x = 9`, which normalizes to the two
  // clauses run together and is a spelling a learner produces by typing without punctuation.
  //
  // SET-BUILDER IS HERE NOW, and getting it here was the whole of round one's P1-2. EL.4's
  // mini-lesson defines set-builder notation LAST, on the same slide that introduces the flipped
  // domain this check asks about, and two of the node's five practice templates
  // (`d8.el4.domain.l2`, `d8.el4.domain-shift.l3`) grade nothing else, so while this list
  // refused it the check refused the one form its own slide had just taught.
  //
  // What blocked it was not this file. `cfuNotation` read the whole accepted list through
  // `isAbsoluteValueAnswerText`, whose pattern matched a bare `|`, so ONE set-builder spelling
  // anywhere in the list retagged the answer as `variable_radical` and the field under EL.4's
  // question advertised `2*x*sqrt(2*x), abs(x^5), |x^5|` over a sqrt-and-bars keypad. Round one
  // measured that, declined to ship it, and filed the dispatch. The predicate now asks what the
  // bar is DOING rather than whether there is one, so a set-builder separator is not an
  // absolute-value bar and this list is free to spell the notation.
  //
  // The bare and the `domain:`-labelled spellings are both here, because the inequality already
  // has both and a learner who labels one notation labels the other.
  //
  // This list is also the AUTHORED question's list. `content/lessons/d8/EL.4.json` carries this
  // set enumerated at its own bound, and `d8El4Cfu.test.tsx` fails if the two come apart, so a
  // spelling added here has to be regenerated into the pack. That is the price of the pack's
  // grading path being exact match, and the alternative was the first attempt refusing 432
  // spellings the re-ask accepted.
  "cfu.el4.domain-asymptote": (params) => {
    const bound = params.bound ?? 0;
    return compositeForms(
      [
        [
          `x < ${bound}`,
          `${bound} > x`,
          `domain: x < ${bound}`,
          `domain x < ${bound}`,
          `{x | x < ${bound}}`,
          `domain: {x | x < ${bound}}`,
        ],
        [
          `x = ${bound}`,
          `${bound}`,
          `va: x = ${bound}`,
          `va x = ${bound}`,
          `vertical asymptote x = ${bound}`,
          `vertical asymptote: x = ${bound}`,
          `asymptote: x = ${bound}`,
          `asymptote x = ${bound}`,
        ],
      ],
      { separators: [", ", "; ", " and ", " "], reversed: true },
    );
  },
  // LF.4: a system's solution as an ordered pair.
  "d7.lf4.elimination.l2": (params) => pointForms(params.x0 ?? 0, params.y0 ?? 0),
  // LF.1: the composite capstone. Slope and word, in the pack's own typing convention.
  "cfu.lf1.slope-direction": (params) => {
    const dy = params.dy ?? 0;
    const dx = params.dx ?? 1;
    const verdict = dy === 0 ? "constant" : dy > 0 ? "increasing" : "decreasing";
    return compositeForms(
      [
        // The slope's grader on this node is `simplification: "none"`, so an unreduced
        // equivalent is the right answer written differently. The pool's own comment records
        // that measurement; this follows it rather than re-deciding it.
        fractionForms(dy, dx, { unreduced: true }),
        wordForms(verdict, [`the line is ${verdict}`, `${verdict} line`]),
      ],
      {
        // `" and "` joins the two parts in LF.1's own authored list (`-1/2 and decreasing`),
        // so it is a separator the pack already accepts rather than a new generosity.
        separators: [", ", "; ", " ", " and "],
        prefixes: ["", "m = ", "slope ", "slope = "],
        reversed: true,
      },
    );
  },
  // POL.1: a product of two binomials expanded into standard form. The twin the census named
  // was `d4.pol1.binomial.l2`, which multiplies two MONIC binomials; this is
  // `d4.pol1.leading.l3` instead, because the check carries a coefficient and dropping it
  // removes the two unequal middle products that are the only reason the expansion needs
  // care. Slightly harder than the authored question rather than easier, which is the side to
  // err on: a re-ask exists because the first question was not answered.
  "d4.pol1.leading.l3": (params) => {
    const a = params.a ?? 1;
    const b = params.b ?? 0;
    const c = params.c ?? 1;
    const d = params.d ?? 0;
    return standardQuadraticForms(a * c, a * d + b * c, b * d);
  },
  // POL.6: the leading term of a factored polynomial, answered without expanding anything. The
  // degree is the sum of the factors' exponents and the coefficient is the product of theirs,
  // so both are recomputed here from the factors rather than read off a stored leading term:
  // a check reaching this with its own parameters gets the term those parameters really produce.
  "d4.pol6.leading-term-factored.l2": (params) =>
    monomialForms(
      (params.outer ?? 1) * (params.inner ?? 1),
      1 + (params.multiplicity ?? 1),
    ),
  // POL.5: where a vertex form crosses the vertical axis, which is the whole rule evaluated at
  // an input of zero. Recomputed from `a`, `h` and `k` rather than read off a stored value, so
  // a check reaching this with its own parameters gets the crossing those parameters really
  // produce — and the pack does exactly that, at an `a` of five the practice template never
  // draws. The bracket at zero is `-h`, which is the sign flip the whole shape is about, so it
  // is written that way rather than as `h` squared: they agree here because the square erases
  // it, and a reader coming to this line needs the reason and not the coincidence.
  "d4.pol5.y-intercept-vertex-form.l2": (params) => {
    const a = params.a ?? 1;
    const h = params.h ?? 0;
    const k = params.k ?? 0;
    return integerForms(a * (-h) ** 2 + k);
  },
  // POL.7: the multiplicity of a named zero, which is a count and so an integer. `asked` picks
  // which of the three factors the question is about, and the multiplicity is read off THAT
  // one; reading any other is the miss the check exists to catch, so the index is honoured
  // rather than defaulted past.
  "d4.pol7.multiplicity-at-zero.l2": (params) =>
    integerForms([params.m0 ?? 1, params.m1 ?? 1, params.m2 ?? 1][params.asked ?? 0] ?? 1),
  // POL.8: a cubic divided by `x - r`, answered with the quotient. Standard form again, and
  // the unit-coefficient spelling matters here specifically: a learner reads the quotient off
  // the synthetic row, so the `1` that row holds gets written down.
  "d4.pol8.synthetic-cubic.l2": (params) =>
    standardQuadraticForms(1, params.m ?? 0, params.n ?? 0),
  // POL.2: the common measure out first, then the trinomial. Opposite-signed roots, so one
  // bracket adds and the other subtracts.
  "cfu.pol2.measure-then-factor": (params) => {
    const plus = params.plus ?? 0;
    const minus = params.minus ?? 0;
    return factoredForms([`x + ${plus}`, `x - ${minus}`], { outside: params.k ?? 1 });
  },
  // POL.3: an area gathered at zero and factored, answered with BOTH roots. The negative one
  // is the whole point, so the set is what is spelled and not the length.
  "d4.pol3.area.l3": (params) => solutionSetForms([params.low ?? 0, params.high ?? 0]),
  // POL.4: the quadratic formula, whose reason for existing is the root that does not come out
  // whole. The fraction is passed exactly rather than as its quotient, so `3/2` is the
  // canonical spelling the reveal prints and `1.5` is merely also accepted.
  //
  // `unreduced` because this node is graded on the formula and not on lowest terms: it has no
  // `check` block and so no `simplification` profile to demand one, and a learner who lands on
  // `-4, 4/10` has gathered at zero, substituted and simplified the radical. Refusing that was
  // marking a correct answer wrong. Ruled by the content owner rather than decided here.
  "d4.pol4.formula.l3": (params) =>
    solutionSetForms([-(params.q ?? 0), { over: params.p ?? 0, under: params.a ?? 1 }], {
      unreduced: true,
    }),
  // GEO.1: the foundation's diagonal, then scaled to the model. Derived from the rectangle's
  // own sides rather than from a stored answer, so the fixture in `cfuVariants.test.ts`
  // carries the authored question's real numbers and this recomputes the whole path.
  "cfu.geo1.model-diagonal": (params) => {
    const a = params.a ?? 0;
    const b = params.b ?? 0;
    const n = params.n ?? 1;
    return integerForms(Math.sqrt(a * a + b * b) / n);
  },
  // GEO.2: floor plus four walls, with the open top deliberately absent from the sum. The
  // omitted `l * w` is the difference between this and a closed box, and it is the whole
  // content of the check, so it is written here as an omission rather than a subtraction.
  "cfu.geo2.open-cistern-lining": (params) => {
    const l = params.l ?? 0;
    const w = params.w ?? 0;
    const d = params.d ?? 0;
    return integerForms(l * w + 2 * l * d + 2 * w * d);
  },
  // CG.1: the midpoint of the two intercepts, then the length between them. Derived from the
  // two intercept COORDINATES rather than from a stored midpoint, so the fixture in
  // `cfuVariants.test.ts` carries the pack's own question and this recomputes the whole path.
  //
  // Reversed for EL.2's stated reason — naming both orders is what stops the order becoming
  // part of the answer — and it is safe here on FUN.8's test: a point and a scalar length
  // cannot be mistaken for one another, so `10, (-3, 4)` can only be the two right parts
  // typed the other way round. See the note on `cfu.fun3.evaluate-by-piece` for the shape
  // that fails that test and is therefore left strict.
  "cfu.cg1.plot-and-measure": (params) => {
    const a = params.a ?? 0;
    const b = params.b ?? 0;
    return compositeForms(
      [pointForms(a / 2, b / 2), integerForms(Math.sqrt(a * a + b * b))],
      {
        separators: [", ", "; ", " and "],
        reversed: true,
      },
    );
  },
  // FUN.1: one reading, then the ruling on the log. The `not a function` phrasing is in the
  // pack's own list, and its opposite number is offered on the other verdict for symmetry.
  //
  // Reversed on the same test as CG.1 above, and on LF.1's precedent for this exact shape: a
  // number beside a verdict word is unmistakable either way round, so `no, -19` is the two
  // right parts in the other order rather than a different claim.
  "cfu.fun1.evaluate-and-test": (params) => {
    const isFunction = params.isFunction === 1;
    const verdict = isFunction ? "yes" : "no";
    return compositeForms(
      [
        integerForms(params.value ?? 0),
        wordForms(
          verdict,
          isFunction ? ["it is a function", "a function"] : ["not a function"],
        ),
      ],
      { separators: [", ", "; ", " and "], reversed: true },
    );
  },
  // FUN.2: a range with a floor or a ceiling, as one half-line. The bracket is NOT an axis:
  // which bracket the reached end takes is half of what this node teaches, and the infinite
  // end is always round because there is no such number to include.
  "cfu.fun2.domain-and-range": (params) => {
    const bound = params.bound ?? 0;
    return params.upward === 1
      ? intervalForms(bound, Number.POSITIVE_INFINITY, { lowClosed: true })
      : intervalForms(Number.NEGATIVE_INFINITY, bound, { highClosed: true });
  },
  // FUN.3: two charges, the one at the break first. Both are recomputed from the two pieces
  // rather than stored, so a fixture naming the charges would be restating the speller.
  //
  // NOT `reversed`, and this is the boundary of the flag rather than an omission. CG.1, FUN.1,
  // FUN.4, FUN.8 and FUN.10 reverse because their two parts are of different kinds and cannot
  // be swapped without the swap being visible. Both of FUN.3's parts are bare charges, so
  // `14, 38` is indistinguishable from the misconception this node exists to catch — a learner
  // who read the heavy load off the light piece and the light load off the heavy one produces
  // exactly that string. Accepting it would grade the wrong pairing correct, which is a worse
  // failure than asking a learner to obey the order the prompt states and illustrates.
  "cfu.fun3.evaluate-by-piece": (params) =>
    compositeForms(
      [
        integerForms(
          (params.rateHigh ?? 0) * (params.breakAt ?? 0) + (params.standing ?? 0),
        ),
        integerForms((params.rateLow ?? 0) * (params.light ?? 0)),
      ],
      { separators: [", ", "; ", " and "] },
    ),
  // FUN.4: the falling stretch, then the highest reading. The stretch is offered with either
  // bracket and as an inequality, because the pack's list carries all three: the question asks
  // for a stretch of INPUTS and whether its ends are taken in is not what it is testing.
  "cfu.fun4.read-features": (params) => {
    const from = params.h1 ?? 0;
    const to = params.h2 ?? 0;
    return compositeForms(
      [
        [
          `(${from}, ${to})`,
          `[${from}, ${to}]`,
          `${from} < x < ${to}`,
          `${from} <= x <= ${to}`,
        ],
        integerForms(params.r3 ?? 0),
      ],
      { separators: [", ", "; ", " and "], reversed: true },
    );
  },
  // FUN.5: two rates, in the order the prompt asks for them. Both are recomputed from the
  // three marks, which is what makes the fixture the pack's chart rather than its answer.
  //
  // NOT `reversed`, for FUN.3's reason and one more of its own: the two rates are bare signed
  // numbers over two different windows, so `-4, 2` is what a learner produces by averaging the
  // wide window over the narrow one's endpoints and vice versa. The pack's third paragraph is
  // that a reading can climb across a shift while falling across its last stretch, so which
  // rate belongs to which window is the content of the check and not its presentation.
  "cfu.fun5.average-rate": (params) => {
    const t1 = params.t1 ?? 0;
    const t2 = params.t2 ?? 1;
    const v0 = params.v0 ?? 0;
    const v1 = params.v1 ?? 0;
    const v2 = params.v2 ?? 0;
    return compositeForms(
      [integerForms((v2 - v0) / t2), integerForms((v2 - v1) / (t2 - t1))],
      { separators: [", ", "; ", " and "] },
    );
  },
  // FUN.6: the quotient collapses to a linear expression in `h`, so both term orders and both
  // multiplication spellings are correct and the pack's list carries all four.
  "cfu.fun6.difference-quotient": (params) =>
    linearForms(
      params.a ?? 1,
      2 * (params.a ?? 0) * (params.p ?? 0) + (params.b ?? 0),
      "h",
    ),
  // FUN.7: one number, the end of a two-machine chain. `integerForms` rather than the bare
  // spelling because this pack carries a `check`: instance zero is graded by the shared checker
  // under `exact_value`, which takes `71`, `71.0` and `71.00` alike, so a computed instance
  // graded by this list has to carry what the checker would have allowed.
  "cfu.fun7.compose-evaluate": (params) => integerForms(params.value ?? 0),
  // FUN.8: the inverse rule, then one value from it. The prefixes are the two ways a learner
  // names the left-hand side, and the reversal is safe because a rule and a number cannot be
  // mistaken for one another.
  "cfu.fun8.find-inverse": (params) => {
    const m = params.m ?? 1;
    const c = params.c ?? 0;
    const v = params.v ?? 0;
    return compositeForms([linearForms(m, -c, "x"), integerForms(m * v - c)], {
      separators: [", ", "; ", " and "],
      prefixes: ["", "f^-1(x) = ", "y = "],
      reversed: true,
    });
  },
  // FUN.9: one number, after the bracket, the parity and the two outside moves. `integerForms`
  // for FUN.7's reason: this pack carries a `check` too.
  "cfu.fun9.transform-and-parity": (params) =>
    integerForms(
      (params.gain ?? 0) * (params.even === 1 ? 1 : -1) * (params.height ?? 0) +
        (params.lift ?? 0),
    ),
  // FUN.10: the vertex, then the word. The bare space is a separator here because the pack
  // accepts `(6, 10) maximum`, which is what a learner types running the two parts together.
  //
  // Reversed on CG.1's test above: a coordinate pair beside a verdict word is unmistakable in
  // either order, which is LF.1's shape exactly.
  "cfu.fun10.vertex-and-graph": (params) => {
    const h = params.h ?? 0;
    const k = params.k ?? 0;
    const verdict = (params.stretch ?? 0) < 0 ? "maximum" : "minimum";
    return compositeForms(
      [
        pointForms(h, k),
        wordForms(verdict, [`a ${verdict}`, `${verdict} value`, verdict.slice(0, 3)]),
      ],
      { separators: [", ", "; ", " ", " and "], reversed: true },
    );
  },
  // TRG.1: a heading brought inside one turn and then converted, so the spelling is a
  // fraction times pi. Reduced here rather than by the caller, because a radian answer does
  // not have to be in lowest terms to grade and the reduced form is only the CANONICAL one.
  "cfu.trg1.coterminal-radian": (params) => {
    const base = params.base ?? 0;
    const divisor = gcdOf(base, 180);
    return radianForms(base / divisor, 180 / divisor);
  },
  // TRG.2: one length of a right triangle, whole because the ratio is always the half. The
  // doubling runs the direction the draw asked for, so this recomputes the arithmetic rather
  // than reading a stored length back.
  "cfu.trg2.wire-length": (params) => {
    const given = params.given ?? 0;
    return integerForms(params.asksWire === 1 ? 2 * given : given / 2);
  },
  // TRG.3: one coordinate on the unit circle, whose size is always a half and whose SIGN is
  // the question. Decimals are off, and they used to be on: the pack's authored list carried
  // `-0.5` and this read that as the ruling, which made TRG.3 the one D9 pack accepting a
  // decimal where the pool refuses one on the same value (`d9.trg3.exact-value-circle.l3`
  // grades `-0.5` as `wrong_representation` against a key of `-1/2`). The pack now declares
  // `representation: "fraction"` beside its key, so the flag here and the ruling there say the
  // same thing and neither is inferred from the other.
  //
  // ## `unreduced` is OFF on all three TRG spellers, and that is this merge's one real ruling
  //
  // Two rounds fixed the same defect from opposite ends without seeing each other. Both are
  // right about the defect: these packs carry a `check`, so the AUTHORED question went to
  // `cfuChecker`, which built every numeric spec with `simplification: "none"` and duly marked
  // `2/4` correct against a key of `1/2`, while the re-ask's computed list spelled no unreduced
  // form and refused it. One card, two verdicts on one answer.
  //
  // The other round closed it by WIDENING the list (`unreduced: true`, as LF.1 and POL.4 have).
  // This round closed it by NARROWING the checker: the packs now declare `reduced_fraction`
  // beside their keys and their prompts ask for lowest terms in as many words. Both remove the
  // disagreement; they cannot both apply, because `gradeCfuAnswer` refuses an unreduced fraction
  // at its `simplification` gate BEFORE any list is consulted, which would leave the widened
  // spellings written and unreachable — the flag reading as tolerance the surface does not have.
  //
  // Narrowing wins here on the WIDENING SIDE'S OWN RULE, which is that a computed list refuses
  // an unreduced fraction only where lowest terms is the graded skill. That rule was written
  // against packs asking for "a fraction", and it put these three on the tolerant side because
  // nothing then asked for lowest terms. This round's content makes them the other case: the
  // prompt asks for lowest terms, the practice pool grades `not_simplified` on the same values,
  // and a CFU tolerating `-2/4` would be the sole D9 surface disagreeing with its own pool.
  // POL.4, where lowest terms is genuinely not the graded skill, keeps its `unreduced: true`.

  "cfu.trg3.circle-cosine": (params) =>
    fractionForms(circleReadingSign(params.isSine === 1, params.deg ?? 0), 2, {
      decimals: false,
    }),
  // TRG.4: a tangent recovered through the Pythagorean identity and signed by the quadrant.
  // Decimals are off, since the prompt asks for a fraction and `1.333333` is a rounded
  // spelling of one rather than another way of writing it. `unreduced` is off with it, for the
  // reason set out on TRG.3 above, and the pack's `simplification: "reduced_fraction"` is what
  // makes that safe rather than stricter than the question beside it: without the declaration
  // the checker took `8/6` on the authored question while this list refused `-14/48` on the
  // re-ask, which is exactly the disagreement both rounds were closing.
  "cfu.trg4.quadrant-tangent": (params) =>
    fractionForms(
      quadrantTangentSign(params.quadrant ?? 1) * (params.opposite ?? 0),
      params.adjacent ?? 1,
      { decimals: false },
    ),
  // TRG.5: the midline and the amplitude combined, which lands on one whole number.
  "cfu.trg5.max-value": (params) => {
    const amplitude = params.amplitude ?? 0;
    const midline = params.midline ?? 0;
    return integerForms(params.wantsMax === 1 ? midline + amplitude : midline - amplitude);
  },
  // TRG.6: the first break of `tan(bx)`, which is a quarter turn shared out by the inside
  // coefficient. The coefficient out front never appears, which is the check's whole point.
  "cfu.trg6.first-asymptote": (params) => radianForms(1, 2 * (params.inside ?? 1)),
  // TRG.7: the principal heading a composition hands back, in degrees.
  "cfu.trg7.compose-principal": (params) =>
    integerForms(principalDegrees(params.kind ?? 0, params.deg ?? 0)),
  // TRG.8: the larger of the two headings the roster holds. `integerForms` and not
  // `solutionSetForms`: the question ends by asking for one of the two, so a braced set
  // printed by the reveal would be a spelling the field refuses.
  "cfu.trg8.larger-root": (params) =>
    integerForms(
      largerBasicRoot(params.isSine === 1, params.reference ?? 0, params.negative === 1),
    ),
  // TRG.9: a doubled cosine from one reading of a triple. Decimals off for the same reason as
  // TRG.4, and backed by the same declaration on the pack: the prompt asks for a fraction, and
  // this one's decimals are exact but long (`0.28` for `7/25`, and nothing at all for
  // `161/289`), so the exactness that would have argued for them is not even available across
  // the draw space.
  "cfu.trg9.double-from-sine": (params) => {
    const givenSine = params.givenSine === 1;
    const hyp = params.hyp ?? 1;
    const given = givenSine ? (params.opposite ?? 0) : (params.adjacent ?? 0);
    // `unreduced` off, and `simplification: "reduced_fraction"` in the pack is what pays for
    // it; see the ruling on `cfu.trg3.circle-cosine` above.
    return fractionForms(doubleAngleTop(givenSine, given, hyp), hyp * hyp, {
      decimals: false,
    });
  },
};

/* --------------------------------------------------------------------------- resolution */

/** Every template a pack may name, pool and CFU-only alike. */
const TEMPLATES: readonly ItemTemplate[] = [
  ...D1_PRACTICE_TEMPLATES,
  ...D2_PRACTICE_TEMPLATES,
  ...D3_PRACTICE_TEMPLATES,
  ...D4_PRACTICE_TEMPLATES,
  ...D5_PRACTICE_TEMPLATES,
  ...D7_PRACTICE_TEMPLATES,
  ...D8_PRACTICE_TEMPLATES,
  ...D9_PRACTICE_TEMPLATES,
  ...D10_PRACTICE_TEMPLATES,
  ...CFU_ONLY_TEMPLATES,
];

/** The template a `template_id` names, or undefined. Exported so the sweep can assert it. */
export function cfuVariantTemplate(templateId: string): ItemTemplate | undefined {
  return TEMPLATES.find((template) => template.template_id === templateId);
}

/** Whether a speller is registered for a template. Exported for the same reason. */
export function hasCfuSpeller(templateId: string): boolean {
  return templateId in SPELLERS;
}

/**
 * Spell one set of parameters through a registered speller, or `undefined` if none is.
 *
 * Exported so `cfuVariants.test.ts` can run each pack's speller over the pack's OWN authored
 * parameters and require every hand-authored spelling to come back. That is the assertion
 * standing behind "computed, not narrowed": the reason the check does not consult the shared
 * checker is that its list accepts spellings the checker rejects, so a computed list that
 * quietly dropped some would give away the very thing the design is protecting.
 */
export function cfuSpell(
  templateId: string,
  params: Record<string, number>,
  answerKey: string,
): readonly string[] | undefined {
  return SPELLERS[templateId]?.(params, answerKey);
}

/**
 * The AUTHORED answer, in every spelling the RE-ASK's own machinery would accept for it,
 * normalized for membership.
 *
 * ## Why the authored ask needs this at all
 *
 * A computed instance's accepted list is BUILT, by the speller, off the parameters it was drawn
 * from. The authored question's is TYPED, into the pack JSON, by whoever wrote the question. So
 * the two asks of one check were graded to two different standards, and the strict one sat on
 * attempt one: POL.3 accepted 4 of the 48 spellings its own re-ask machinery generates and
 * POL.4 accepted 18 of 168, so a learner who wrote `-7; 5` was told they were wrong and then
 * told, by the retry, that the same convention was fine. `answer_type` is
 * `"numeric" | "expression"`, so a roster answer cannot declare a `check` block and reach the
 * equivalence checker instead; running the speller over the authored parameters is how the
 * authored ask reaches the same standard without one.
 *
 * ## The precondition, which is what keeps this a spelling and not an answer
 *
 * `worked_solution_params` is in the FIGURE's schema, and a speller reads the TEMPLATE's drawn
 * params. Those usually coincide and need not: `cfu.num2.precedence-chain` spells
 * `integerForms(params.value)` where NUM.2's figure names `lead`, `factor`, `base` and `power`,
 * so spelling its authored answer from them produces the forms of `0` against a key of `-3`.
 * Generating the wrong answer's spellings and accepting them would be the one thing this must
 * never do, so the pack's own answer has to come BACK out of the speller or nothing is
 * returned. That is a precondition rather than a warning because the two failures are
 * indistinguishable from here: a params schema that does not match and a params set that
 * describes a different question both come back as forms of something else.
 */
const AUTHORED_SPELLINGS = new WeakMap<LessonCfuSpec, ReadonlySet<string>>();

export function cfuAuthoredSpellings(cfu: LessonCfuSpec): ReadonlySet<string> {
  const cached = AUTHORED_SPELLINGS.get(cfu);
  if (cached !== undefined) {
    return cached;
  }
  const built = buildAuthoredSpellings(cfu);
  AUTHORED_SPELLINGS.set(cfu, built);
  return built;
}

function buildAuthoredSpellings(cfu: LessonCfuSpec): ReadonlySet<string> {
  // The template whose schema the pack's own parameters are written in: a pack may point its
  // authored figure at a sibling of the template its re-ask draws from, and then
  // `worked_solution_params` describes that sibling. Same resolution `authoredInstance` uses,
  // for the same reason.
  const templateId = cfu.worked_solution_template ?? cfu.variants?.template_id;
  const params = cfu.worked_solution_params;
  if (templateId === undefined || params === undefined) {
    return new Set();
  }
  const answerKey = cfu.check?.answer_key ?? cfu.accepted[0] ?? "";
  const forms = SPELLERS[templateId]?.({ ...params }, answerKey);
  if (forms === undefined) {
    return new Set();
  }
  const normalized = new Set(forms.map(normalizeAcceptedAnswer));
  return normalized.has(normalizeAcceptedAnswer(answerKey)) ? normalized : new Set();
}

/**
 * Seeds are offset per template so two packs drawing from the same pool never walk the same
 * sequence, and the base sits clear of the item bank's own (`5000` practice, `7000` retry
 * variants) so a shared seed can never be mistaken for a shared instance.
 */
const SEED_BASE = 91_000;

function seedFor(templateId: string): number {
  let hash = 0;
  for (let index = 0; index < templateId.length; index += 1) {
    hash = (hash * 31 + templateId.charCodeAt(index)) % 9973;
  }
  return SEED_BASE + hash * 13;
}

/**
 * Resolved instance lists, cached against the pack object.
 *
 * The draw is deterministic, so caching changes no output; what it prevents is the card
 * redrawing a rejection loop on every render. Keyed on the `cfu` object, which is a frozen
 * JSON import and therefore stable for the life of the module.
 */
const CACHE = new WeakMap<LessonCfuSpec, readonly CfuInstance[]>();

/**
 * The questions this check can put in front of the learner, authored one first.
 *
 * Always at least one entry, so every caller can treat the result as the check itself. A pack
 * with no `variants` block, an unresolvable `template_id`, a missing speller, or a parameter
 * space too small to yield a distinct instance all come back as the single authored question,
 * which is exactly what the surface did before this existed. Failing that way round is
 * deliberate: the alternative is a lesson that throws at mount over a content declaration,
 * and the sweep in `cfuVariants.test.ts` is where a broken declaration is meant to be caught.
 */
export function cfuInstances(cfu: LessonCfuSpec): readonly CfuInstance[] {
  const cached = CACHE.get(cfu);
  if (cached !== undefined) {
    return cached;
  }
  const resolved = resolve(cfu);
  CACHE.set(cfu, resolved);
  return resolved;
}

/**
 * The instance at `index`, wrapping, and never undefined.
 *
 * The wrap is here rather than at the call site so the card cannot hold an index the list has
 * stopped covering, and the authored fallback is here so its return type is a single
 * `CfuInstance`: the list is never empty, but a type that says so is worth more to the caller
 * than a comment claiming it.
 */
export function cfuAsk(cfu: LessonCfuSpec, index: number): CfuInstance {
  const list = cfuInstances(cfu);
  return list[((index % list.length) + list.length) % list.length] ?? authoredInstance(cfu);
}

function authoredInstance(cfu: LessonCfuSpec): CfuInstance {
  return {
    prompt: cfu.prompt,
    accepted: cfu.accepted,
    hint: cfu.hint,
    answerKey: cfu.check?.answer_key ?? cfu.accepted[0] ?? "",
    workedSolution: cfu.worked_solution ?? [],
    // No template drew this question, so the only route to a registered visual is the pack
    // naming the parameters itself. Where it has, the authored question is explained by a
    // figure like the re-asked one's: the same template's by default, or a sibling's where
    // the pack names one, because the question written for a node and the template chosen to
    // rotate it are not always the same shape. Where it has not, the id stays empty and
    // `WorkedSolution` falls through to its step cards. The id is deliberately withheld
    // rather than passed unconditionally: a pack whose variant template owns no registry
    // entry would otherwise key on a miss, which reads as an intent this content has not
    // declared.
    templateId:
      cfu.worked_solution_params === undefined
        ? ""
        : (cfu.worked_solution_template ?? cfu.variants?.template_id ?? ""),
    params: cfu.worked_solution_params ?? {},
    authored: true,
  };
}

function resolve(cfu: LessonCfuSpec): readonly CfuInstance[] {
  const authored = authoredInstance(cfu);
  const wanted = cfu.variants?.count ?? 1;
  if (cfu.variants === undefined || wanted < 2) {
    return [authored];
  }
  const template = cfuVariantTemplate(cfu.variants.template_id);
  const spell = SPELLERS[cfu.variants.template_id];
  if (template === undefined || spell === undefined) {
    return [authored];
  }

  const instances: CfuInstance[] = [authored];
  // The authored spellings are the first thing a later instance may not collide with: the
  // reveal prints one of them, so an instance accepting any of them is copyable.
  const spoken = new Set(cfu.accepted.map(normalizeAcceptedAnswer));
  spoken.add(normalizeAcceptedAnswer(authored.answerKey));
  const definitions = new Set<string>();
  const varieties = new Set<string>();

  let seed = seedFor(cfu.variants.template_id);
  let misses = 0;
  while (instances.length < wanted && misses < 400) {
    const drawn = generateFromTemplate(template, "practice", seed);
    seed += 1;
    const answerKey = drawn.answer.answer_key;
    const variety = template.varietyKey?.(drawn.template_params);
    const accepted = answerKey === undefined ? [] : spell(drawn.template_params, answerKey);
    const forms = accepted.map(normalizeAcceptedAnswer);
    // R30 on a question nobody authored. The field's placeholder is chosen from the notation of
    // the instance's OWN answer, so a rotation can walk onto the very example the field is
    // showing while it does it: RAT.6's re-ask drew the key `4` under "Every solution: 13 or
    // {-1, 4}". The item bank refuses the same collision on its practice draws
    // (`unadvertisedBound` and `unadvertisedUnionLow` in `packages/item-bank/src/d3/nodes/
    // _shared.ts`), and this is that rule one layer up, where the questions nobody hand-audited
    // are. It couples a draw to the field's copy -- editing an example rotates any instance that
    // example would have answered -- which is the direction the coupling should run in.
    const advertised = new Set(
      placeholderExamples(cfuPlaceholder(cfu.check, accepted)).map(normalizeAcceptedAnswer),
    );
    if (
      answerKey === undefined ||
      accepted.length === 0 ||
      drawn.hints.length === 0 ||
      // The reveal shows the steps, so a template with none cannot supply an instance the
      // reveal can explain. Pool templates all carry them under `validateTemplates`; a
      // CFU-only template is in no pool, and this is the only thing standing between a
      // forgotten array and a reveal that prints a heading over nothing.
      drawn.worked_solution.length === 0 ||
      definitions.has(hashItemDefinition(drawn)) ||
      (variety !== undefined && varieties.has(variety)) ||
      // THE constraint, and it is not a hypothetical one: with it removed, NUM.5's own pool
      // cell draws a different question that lands back on the authored answer (`6` is 20% of
      // 30 and also 10% of 60), and so does LF.4's. Hash distinctness accepts both, because
      // the DEFINITION differs; the learner reading the revealed answer cannot tell.
      forms.some((form) => spoken.has(form)) ||
      forms.some((form) => advertised.has(form))
    ) {
      misses += 1;
      continue;
    }
    instances.push({
      prompt: drawn.prompt,
      // The template's own progressive hints, joined. They are the reasoning that produces
      // the answer without stating it, which is the same contract `cfu.hint` is written to
      // and one `validateTemplates` already enforces over every practice template, so a
      // converted pack authors no new prose.
      hint: drawn.hints.join(" "),
      accepted,
      // The SPELLER's canonical form, not the template's raw key, and the difference is not
      // cosmetic: the reveal prints this string and then asks the learner to produce it, so a
      // key the check would reject is a reveal that teaches a wrong answer. LF.1's level line
      // is the case that showed it -- the template keyed the slope `0/1` where the check
      // accepts `0` -- and taking the canonical spelling makes the two impossible to diverge.
      answerKey: accepted[0] ?? answerKey,
      // The template's own steps and parameters, which the reveal renders through the same
      // `WorkedSolution` the practice card uses. Carrying `template_id` is what lets a
      // computed instance reach the diagram its practice template already has registered,
      // so the re-asked question is explained exactly as the practice set would explain it.
      workedSolution: drawn.worked_solution,
      templateId: drawn.template_id,
      params: drawn.template_params,
      authored: false,
    });
    definitions.add(hashItemDefinition(drawn));
    if (variety !== undefined) {
      varieties.add(variety);
    }
    for (const form of forms) {
      spoken.add(form);
    }
    misses = 0;
  }

  return instances;
}
