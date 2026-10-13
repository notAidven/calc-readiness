/**
 * Worked-solution figures for the D1 and D2 CHECKS, whose questions no practice template asks.
 *
 * A lesson's check draws its re-ask from a template like a practice item does, but seven of
 * those templates are `cfu.*`: written for the check because the pool does not hold its
 * question. So the reveal had nothing to key on and fell through to the step cards, on both the
 * authored question and the re-ask, while the twelve packs whose check happens to share a pool
 * shape got a diagram. The learner meeting the same skill twice met it two different ways
 * depending on which pack they were in, which is the gap these close.
 *
 * Each figure is built from its OWN generator's `worked_solution` steps in
 * `cfuVariants.ts`: same rows, same order, same closing answer. That is deliberate rather than
 * convenient -- the steps were written against the question, the figure is the same solution
 * rendered a second way, and a figure inventing a different route would leave a learner who
 * read the cards once and the diagram once holding two explanations of one problem.
 *
 * All seven are reduction columns, as 121 of the registry's 201 entries are. NUM.F's is the
 * three rows `d1.num-f.l2b` uses for the same skill, rebuilt on the kit's own row archetype
 * rather than imported: a `worked/` module reaches DOWN to `workedKit` and never back up to the
 * registry, which is what keeps this layer free of an import cycle.
 *
 * Every figure is driven only by `template_params` with a default for each, and recomputes what
 * it prints the way `generate()` does rather than being handed an answer, so a figure cannot
 * agree with a wrong parameter set.
 */

import { expressionVariable } from "@cr/item-bank";

import { CIVIC, type EqToken, SIGNAL } from "../svgKit";
import {
  CHIP,
  ExpressionReductionWorked,
  frac,
  fracSpoken,
  MINUS,
  MINUS_INK,
  PLUS_INK,
  type ReductionRow,
  reduceTail,
  spoken,
  TIMES,
  vt,
  type WorkedSolutionVisual,
} from "../workedKit";

/** Multiplication as a raised dot, which is how these prompts write it. */
const CDOT: EqToken = { text: "\\cdot" };

/** A radical, and a radical over a radical, since four of these figures are built of them. */
function sqrtOf(inner: string | number): string {
  return `\\sqrt{${inner}}`;
}

/**
 * A row holding a `\sqrt` wrapped around a `\dfrac` is taller than the display fraction
 * `rowInkHeight` measures, because the radical's vinculum sits above the fraction's own rule.
 */
const SQRT_OVER_FRACTION_INK = 64;

/* --------------------------------------------------------------- NUM.2: nothing is bracketed */

/**
 * `lead - factor \times base^power`, one tier per row.
 *
 * The chips carry the whole claim of this check, which is that the ORDER was not written down
 * anywhere and had to be decided: three rows, three different tier colours, each resolving the
 * tier that outranks what is left. A learner who multiplied before squaring paired `factor`
 * with `base` and never had the middle row.
 */
function precedenceRows(
  lead: number,
  factor: number,
  base: number,
  power: number,
): ReductionRow[] {
  const powered = base ** power;
  const product = factor * powered;
  return [
    {
      chip: CHIP.exp,
      tokens: [
        { text: `${lead}`, role: "addsub" },
        MINUS,
        { text: `${factor}`, role: "muldiv" },
        TIMES,
        { text: `${base}`, role: "exp", sup: `${power}` },
      ],
    },
    {
      chip: CHIP.times,
      tokens: [
        { text: `${lead}`, role: "addsub" },
        MINUS,
        { text: `${factor}`, role: "muldiv" },
        TIMES,
        { text: `${powered}`, role: "muldiv" },
      ],
    },
    {
      chip: CHIP.minus,
      tokens: [
        { text: `${lead}`, role: "addsub" },
        MINUS,
        { text: `${product}`, role: "addsub" },
      ],
    },
    { tokens: [{ text: `${lead - product}` }] },
  ];
}

/* ------------------------------------------------------------ NUM.4: the term with no partner */

/**
 * `negative v + v^2 + positive v` collected, with the squared term held out.
 *
 * The middle row regroups before it combines, and it is the row this figure exists for: the two
 * like terms are not adjacent in the question, so a learner reading left to right meets
 * `negative v` and `v^2` first and the tempting move is to add those. Gathering the pair inside
 * one bracket, tinted, says which two were allowed to meet.
 */
function unlikeTermRows(
  negative: number,
  positive: number,
  total: number,
  v: string,
): ReductionRow[] {
  return [
    {
      tokens: [
        { text: vt(negative, v), color: SIGNAL },
        PLUS_INK,
        { text: `${v}^{2}`, color: CIVIC },
        PLUS_INK,
        { text: vt(positive, v), color: SIGNAL },
      ],
    },
    {
      tokens: [
        { text: `${v}^{2}`, color: CIVIC },
        PLUS_INK,
        { text: `(${vt(negative, v)} + ${vt(positive, v)})`, color: SIGNAL },
      ],
    },
    {
      tokens: [
        { text: `${v}^{2}`, color: CIVIC },
        total < 0 ? MINUS_INK : PLUS_INK,
        { text: vt(Math.abs(total), v), color: SIGNAL },
      ],
    },
  ];
}

/* ------------------------------------------------------ EXP.1: the sign of the total decides */

/**
 * `(v^inner)^outer \cdot v^-(inner*outer + power)` down to `1/v^power`.
 *
 * The third row is the one that has to be seen rather than inferred: the exponent it prints is
 * NEGATIVE, and the last row exists only because of that. A figure that went straight from the
 * two rules to a fraction would show the reciprocal without showing what asked for it, which is
 * the half of this question the prompt spends a sentence on.
 */
function negativeTotalRows(
  inner: number,
  outer: number,
  power: number,
  v: string,
): ReductionRow[] {
  const multiplied = inner * outer;
  const negative = -(multiplied + power);
  return [
    {
      tokens: [
        { text: `(${v}^{${inner}})`, sup: `${outer}` },
        CDOT,
        { text: `${v}^{${negative}}` },
      ],
    },
    {
      tokens: [
        { text: `${v}^{${multiplied}}`, color: CIVIC },
        CDOT,
        { text: `${v}^{${negative}}` },
      ],
    },
    { tokens: [{ text: `${v}^{-${power}}`, color: SIGNAL }] },
    { tokens: [{ text: `\\dfrac{1}{${v}^{${power}}}`, color: CIVIC }] },
  ];
}

/* ---------------------------------------------------------- NUM.F: straight across, then down */

/**
 * `a/b \times c/e`, multiplied across and reduced.
 *
 * The middle row keeps the two products UNRESOLVED, which is the row that says multiplying
 * fractions needs no common denominator: top with top and bottom with bottom, visibly paired.
 * `reduceTail` then prints the reducing step only when it changes something, and the check's
 * draw guarantees it does -- a shared factor is planted in the two fractions on purpose, so a
 * figure closing on the unreduced product would be closing on a wrong answer.
 */
function multiplyReduceRows(a: number, b: number, c: number, e: number): ReductionRow[] {
  return [
    { tokens: [{ text: `${frac(a, b)} \\times ${frac(c, e)}` }] },
    { tokens: [{ text: frac(`${a} \\times ${c}`, `${b} \\times ${e}`) }] },
    { tokens: [{ text: reduceTail(a * c, b * e), color: CIVIC }] },
  ];
}

/* ------------------------------------------------------------- RAD.1: a root over a fraction */

/**
 * `\sqrt{outside^2 inside / root^2}` split, pulled apart and simplified.
 *
 * Splitting first is what makes the rest one-at-a-time, so the split gets its own row even
 * though nothing has been simplified in it yet: the two pieces are then finished by different
 * moves (one has a square factor pulled out of it, the other IS a square), and a single row
 * showing both happening at once would hide that they are different moves.
 */
function quotientRadicalRows(
  outside: number,
  inside: number,
  root: number,
): ReductionRow[] {
  const top = outside * outside * inside;
  const bottom = root * root;
  return [
    {
      ink: SQRT_OVER_FRACTION_INK,
      tokens: [{ text: sqrtOf(`\\dfrac{${top}}{${bottom}}`) }],
    },
    { tokens: [{ text: `\\dfrac{${sqrtOf(top)}}{${sqrtOf(bottom)}}` }] },
    {
      tokens: [{ text: `\\dfrac{${outside}${sqrtOf(inside)}}{${root}}`, color: CIVIC }],
    },
  ];
}

/* ------------------------------------------------ RAD.2: two roots that only look different */

/**
 * Combine the top, clear the bottom, and watch the coefficient cancel.
 *
 * Five rows, and the fourth is the one worth the height. The count on the top and the number
 * under the bottom root are the SAME number by construction, so the fraction rationalizing
 * produces cancels away completely: an answer still wearing that coefficient is a learner who
 * stopped one step early, and the only way a figure shows that stopping was early is by
 * printing the row they would have stopped on.
 */
function combineRationalizeRows(
  shared: number,
  first: number,
  second: number,
  bottom: number,
  inside: number,
): ReductionRow[] {
  const root = sqrtOf(bottom);
  return [
    {
      tokens: [
        {
          text: `\\dfrac{${sqrtOf(first * first * shared)} + ${sqrtOf(second * second * shared)}}{${root}}`,
        },
      ],
    },
    {
      tokens: [
        {
          text: `\\dfrac{${first}${sqrtOf(shared)} + ${second}${sqrtOf(shared)}}{${root}}`,
          color: SIGNAL,
        },
      ],
    },
    { tokens: [{ text: `\\dfrac{${bottom}${sqrtOf(shared)}}{${root}}` }] },
    {
      tokens: [{ text: `\\dfrac{${bottom}${sqrtOf(inside)}}{${bottom}}`, color: SIGNAL }],
    },
    { tokens: [{ text: sqrtOf(inside), color: CIVIC }] },
  ];
}

/* ------------------------------------------------------------- RAD.4: the bars are the answer */

/**
 * `\sqrt{coefficient^2 v^(2 half)}` with an ODD half, so the result needs bars.
 *
 * The last two rows are the check. Row three is what a learner writes when they halve the
 * exponent and stop, and row four is the same expression with the bars it needs; keeping them
 * as separate rows is what makes the bars a step that was TAKEN rather than a detail that was
 * always there. The half is odd by construction, which is why row three can be negative at all.
 */
function oddHalfBarsRows(coefficient: number, half: number, v: string): ReductionRow[] {
  const square = coefficient * coefficient;
  const even = 2 * half;
  return [
    { tokens: [{ text: sqrtOf(`${square}${v}^{${even}}`) }] },
    {
      tokens: [{ text: sqrtOf(square) }, CDOT, { text: sqrtOf(`${v}^{${even}}`) }],
    },
    {
      tokens: [{ text: `${coefficient}` }, CDOT, { text: `${v}^{${half}}`, color: SIGNAL }],
    },
    {
      tokens: [{ text: `${coefficient}\\lvert ${v}^{${half}} \\rvert`, color: CIVIC }],
    },
  ];
}

export const CFU_D1_D2_WORKED_SOLUTIONS: Record<string, WorkedSolutionVisual> = {
  "cfu.num2.precedence-chain": {
    Svg: ({ lead = 30, factor = 2, base = 3, power = 2 }) => (
      <ExpressionReductionWorked
        rows={precedenceRows(lead, factor, base, power)}
        title="Three tiers, taken in rank order because nothing was bracketed"
        ariaLabel={`${base} to the power ${power} is ${base ** power}, then ${factor} times ${base ** power} is ${factor * base ** power}, and ${lead} minus that is ${spoken(lead - factor * base ** power)}`}
      />
    ),
    caption: ({ lead = 30, factor = 2, base = 3, power = 2 }) => {
      const powered = base ** power;
      const product = factor * powered;
      return `Nothing is bracketed, so the tiers decide: the exponent is settled first ($${base}^{${power}} = ${powered}$), then the multiplication ($${factor} \\times ${powered} = ${product}$), and the subtraction is what is left ($${lead} - ${product} = ${lead - product}$). Multiplying first would have paired $${factor}$ with $${base}$ instead of with $${powered}$.`;
    },
  },

  "cfu.num4.unlike-term": {
    Svg: ({ negative = -4, positive = 9, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      const total = negative + positive;
      return (
        <ExpressionReductionWorked
          rows={unlikeTermRows(negative, positive, total, v)}
          title="Only the matching variable parts may be collected"
          ariaLabel={`${spoken(negative)} ${v} and ${positive} ${v} are like terms and combine to ${vt(total, v)}, while ${v} squared has no partner and is carried through, leaving ${v} squared ${total < 0 ? "minus" : "plus"} ${vt(Math.abs(total), v)}`}
        />
      );
    },
    caption: ({ negative = -4, positive = 9, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      const total = negative + positive;
      const linear = total < 0 ? `- ${vt(-total, v)}` : `+ ${vt(total, v)}`;
      return `The two terms carrying a plain $${v}$ are the only pair allowed to meet, and they are not next to each other: gathering them gives $${negative} + ${positive} = ${total}$. The $${v}^{2}$ has no partner, so it is carried through exactly as it stands, leaving $${v}^{2} ${linear}$.`;
    },
  },

  "cfu.numf.multiply-reduce": {
    // `e` is the second denominator here, not `d`: this template spends `d` on the ANSWER's
    // denominator, so the two schemas disagree about one letter and reading `d` as the second
    // fraction's bottom would draw a different question.
    Svg: ({ a = 4, b = 3, c = 3, e = 10 }) => (
      <ExpressionReductionWorked
        rows={multiplyReduceRows(a, b, c, e)}
        title="Multiplying two fractions, then reducing"
        ariaLabel={`Multiply ${a} over ${b} by ${c} over ${e} straight across, giving ${a * c} over ${b * e}, which reduces to ${fracSpoken(a * c, b * e)}`}
      />
    ),
    caption: ({ a = 4, b = 3, c = 3, e = 10, n = 2, d = 5 }) => {
      const top = a * c;
      const bottom = b * e;
      const shared = top / n;
      return `Multiplying needs no common denominator: the tops multiply and the bottoms multiply, giving $\\dfrac{${top}}{${bottom}}$. That is the right number in the wrong form, because top and bottom still share a factor of $${shared}$; dividing both by it leaves $\\dfrac{${n}}{${d}}$, which is the answer in lowest terms.`;
    },
  },

  "cfu.exp1.negative-total": {
    Svg: ({ inner = 2, outer = 3, power = 4, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return (
        <ExpressionReductionWorked
          rows={negativeTotalRows(inner, outer, power, v)}
          title="A negative total is what puts the power underneath"
          ariaLabel={`The bracket multiplies its exponents to give ${v} to the ${inner * outer}, adding the exponents gives ${v} to the negative ${power}, and a negative exponent means 1 over ${v} to the ${power}`}
        />
      );
    },
    caption: ({ inner = 2, outer = 3, power = 4, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      const multiplied = inner * outer;
      const negative = -(multiplied + power);
      return `Two rules, in order: a power raised to a power multiplies its exponents ($${v}^{${inner} \\times ${outer}} = ${v}^{${multiplied}}$), and multiplying powers of one base adds them ($${multiplied} + (${negative}) = -${power}$). The total came out **negative**, and that is the only reason the answer is a fraction: $${v}^{-${power}} = \\dfrac{1}{${v}^{${power}}}$.`;
    },
  },

  "cfu.rad1.quotient-radical": {
    Svg: ({ outside = 6, inside = 2, root = 5 }) => (
      <ExpressionReductionWorked
        rows={quotientRadicalRows(outside, inside, root)}
        title="Split the root over the fraction, then finish each piece"
        ariaLabel={`The root of the fraction splits into a root over a root. The top holds ${outside * outside} times ${inside}, so ${outside} comes out; the bottom is ${root} squared, so it is exactly ${root}. The length is ${outside} root ${inside} over ${root}`}
      />
    ),
    caption: ({ outside = 6, inside = 2, root = 5 }) => {
      const top = outside * outside * inside;
      return `A root over a fraction splits into two roots, which is what lets each piece be finished on its own. The top holds a perfect square, $${top} = ${outside * outside} \\times ${inside}$, so $${outside}$ comes out and $${inside}$ stays in; the bottom is a perfect square outright. Nothing square is left inside either piece, so $\\dfrac{${outside}\\sqrt{${inside}}}{${root}}$ is simplified.`;
    },
  },

  "cfu.rad2.combine-rationalize": {
    Svg: ({ shared = 5, first = 3, second = 2, bottom = 5, inside = 25 }) => (
      <ExpressionReductionWorked
        rows={combineRationalizeRows(shared, first, second, bottom, inside)}
        title="Like radicals in disguise, and a coefficient that cancels"
        ariaLabel={`Simplified, the two roots on top are ${first} root ${shared} and ${second} root ${shared}, which add to ${bottom} root ${shared}. Multiplying top and bottom by root ${bottom} gives ${bottom} root ${inside} over ${bottom}, and the ${bottom}s cancel to leave root ${inside}`}
      />
    ),
    caption: ({ shared = 5, first = 3, second = 2, bottom = 5, inside = 25 }) =>
      `The two roots on the top look unlike and are not: simplified they are $${first}\\sqrt{${shared}}$ and $${second}\\sqrt{${shared}}$, so their counts add to $${bottom}\\sqrt{${shared}}$. Clearing the bottom multiplies top and bottom by $\\sqrt{${bottom}}$, and then the $${bottom}$ the count carries and the $${bottom}$ the clearing produced cancel each other, which is why the answer is a bare $\\sqrt{${inside}}$ and not a multiple of one.`,
  },

  "cfu.rad4.odd-half-bars": {
    Svg: ({ coefficient = 6, half = 3, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return (
        <ExpressionReductionWorked
          rows={oddHalfBarsRows(coefficient, half, v)}
          title="An odd power can be negative, and a square root cannot"
          ariaLabel={`The root splits across the product: ${coefficient * coefficient} is ${coefficient} squared, and halving the exponent leaves ${v} to the ${half}. Because ${half} is odd, that can be negative, so the simplified form is ${coefficient} times the absolute value of ${v} to the ${half}`}
        />
      );
    },
    caption: ({ coefficient = 6, half = 3, varIndex = 0 }) => {
      const v = expressionVariable(varIndex);
      return `The number and the variable are handled separately, and halving the even exponent leaves $${v}^{${half}}$. The bars question is about **that**, not about the root: $${half}$ is odd, an odd power keeps the sign of its base, and nobody said $${v}$ was positive, so $${v}^{${half}}$ can be negative while a square root never is. Hence $${coefficient}\\lvert ${v}^{${half}} \\rvert$.`;
    },
  },
};
