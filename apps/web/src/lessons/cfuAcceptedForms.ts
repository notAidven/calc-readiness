/**
 * Every way a learner may TYPE a computed answer, so a generated check accepts as much as a
 * hand-authored one did.
 *
 * ## Why this is written rather than borrowed
 *
 * The draw behind a check's variants is the item bank's, unchanged (see `cfuVariants.ts`).
 * This half has no counterpart there and could not have one: a practice item carries an
 * `AnswerSpec` and is graded by a checker that decides equivalence itself, so the pool never
 * has to enumerate spellings. A check for understanding has no checker on 20 of the 26 packs
 * and grades by exact match against `accepted` after {@link normalizeAcceptedAnswer}, and
 * that is deliberate: measured across the shipped packs, those lists accept LaTeX
 * (`\dfrac{6\sqrt{2}}{5}`) and the `sqrt` glyph, both of which the practice checker refuses
 * as `invalid_input`. Routing the check through it would silently withdraw acceptance
 * learners have today and start telling them their correct answer cannot be read.
 *
 * So the list is COMPUTED and the match is KEPT, and the obligation that creates is the one
 * these functions discharge: a computed list must be no NARROWER than the authored list it
 * stands beside. `cfuVariants.test.ts` holds that open by running each pack's own speller
 * over its own authored answer and requiring every authored spelling to come back.
 *
 * ## Spacing is not a spelling
 *
 * The card normalizes away case and all whitespace before comparing, so `3x + 12` and
 * `3x+12` are one entry and not two. Every list below therefore keeps the FIRST spelling of
 * each distinct normalized form and drops the rest: the first entry is the canonical one the
 * reveal prints and the notation dispatch reads, and the tail exists only to widen what
 * grades.
 */

import { normalizeAcceptedAnswer } from "./answerFormat";

/**
 * How many spellings one answer may expand to.
 *
 * A runaway guard and not a budget. A composite answer is the product of its parts' spellings,
 * the separators between them and the prefixes on the first part, so it expands
 * multiplicatively: LF.1's is the widest in the tree, and measured over its own authored
 * parameters it comes to 1200 distinct forms -- four prefixes times ten slope spellings times
 * four separators times three words, plus the reversed order, all doubled by the trailing
 * period.
 *
 * That 1200 is why this is not 1200. The cap was exactly the width of the widest list it had
 * to pass, which is a boundary rather than a clearance: the next separator or spelling added
 * anywhere would have been dropped silently. It sits well clear now so that a list REACHING it
 * is evidence of a bug rather than of a generous author.
 *
 * The widest list is no longer LF.1's. {@link withExclusions} multiplies an expression's
 * spellings by two separators chosen independently, by the orderings of the excluded values
 * and by the four ways of marking them, so RAT.2's three exclusions expand further than any
 * two-part composite does. The clearance is kept for the same reason it was widened the first
 * time, and the same assertion still stands behind it: `cfuVariants.test.ts` runs each pack's
 * speller over that pack's own authored answer, so a cap that started cutting would redden
 * there rather than quietly narrowing what a learner may type.
 *
 * Truncating cannot quietly narrow acceptance, because the claim that matters is asserted
 * against real content rather than against this number: `cfuVariants.test.ts` runs each pack's
 * own speller over its own authored answer and fails if any authored spelling is missing, so a
 * cap that started cutting would redden there.
 */
const MAX_FORMS = 20_000;

/**
 * An exact fraction, where passing the quotient as a number would lose the exactness.
 *
 * Named rather than a bare pair so that a caller cannot silently swap the two: which number is
 * on top is the whole content of a root like `3/2`, and a transposition produces a plausible
 * wrong answer rather than an obvious one.
 */
export interface Ratio {
  over: number;
  under: number;
}

/** Keep the first spelling of each distinct normalized form, in order, and stop at the cap. */
function unique(forms: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const form of forms) {
    const key = normalizeAcceptedAnswer(form);
    if (key === "" || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(form);
    if (out.length >= MAX_FORMS) {
      break;
    }
  }
  return out;
}

/**
 * A learner who ends a typed answer with a full stop has not got it wrong.
 *
 * Four of the shipped accepted lists carry an explicit trailing-period spelling (LF.1, LF.4,
 * RAT.5, EL.4), which is four authors independently noticing the same thing about how people
 * type a sentence-shaped answer. Applied to every composite rather than remembered per pack.
 */
function withStop(forms: readonly string[]): readonly string[] {
  return [...forms, ...forms.map((form) => `${form}.`)];
}

/**
 * A learner who writes an explicit leading `+` on a positive answer has not got it wrong.
 *
 * Applied only where the form does not already open with a sign, so nothing produces `+-4`.
 */
function withLeadingPlus(forms: readonly string[]): readonly string[] {
  return [
    ...forms,
    ...forms.filter((form) => !form.startsWith("-")).map((form) => `+${form}`),
  ];
}

/** Greatest common divisor, positive. */
function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

/** Format a number without floating-point noise (the item bank's own `numStr`). */
function numStr(value: number): string {
  return String(Number(value.toFixed(6)));
}

/**
 * A whole number, in the spellings a learner reaches for.
 *
 * The two decimal tails are not padding. On the six packs that carry a `check`, instance zero
 * is graded by the shared checker under `exact_value`, which accepts `6`, `6.0` and `6.00`
 * alike; a computed instance is graded by this list instead, so the list has to carry what
 * the checker would have allowed or the variant would be STRICTER than the question it
 * replaces. Two of the shipped numeric lists (EL.1, EL.3) already write the `.0` spelling out
 * by hand and RAD.3 writes both, which is the same conclusion reached three times.
 */
export function integerForms(value: number): readonly string[] {
  // A non-integer is REJECTED here rather than spelled, and the empty list is the channel:
  // `cfuVariants.ts` drops any draw whose speller returns nothing, so this is where a check
  // whose answer has to come out whole states that constraint. It is load-bearing on NUM.5,
  // whose pool cell can legitimately draw "10% of 12": `1.2` is a fine practice answer and a
  // bad question for a check whose whole point is a clean percent of a dollar amount.
  if (!Number.isInteger(value)) {
    return [];
  }
  const base = numStr(value);
  return unique([base, `${base}.0`, `${base}.00`]);
}

/**
 * A fraction, in the spellings a learner reaches for, including LaTeX.
 *
 * `unreduced` is a per-item decision and never a default. A node that requires lowest terms
 * (NUM.F) must not accept `2/6`, and a node whose grader is `simplification: "none"` (LF.1's
 * slope, where the pool's own comment records that an unreduced equivalent grades correct)
 * must not refuse it. Passing the flag makes each caller state which of the two it is instead
 * of inheriting whichever was convenient.
 *
 * `decimals` is the same kind of decision made about the other notation. A slope is a number
 * and a learner who divided rather than reduced has answered the question, which is why LF.1's
 * authored list carries `-0.5`; NUM.F's does not, and must not, because its `check` block is
 * keyed `representation: "fraction"` with `simplification: "reduced_fraction"` and the whole
 * question is writing the product AS a fraction in lowest terms. Left on by default because
 * the slope case is the common one, and turned off where a pack says otherwise.
 */
export function fractionForms(
  numerator: number,
  denominator: number,
  { unreduced = false, decimals = true }: { unreduced?: boolean; decimals?: boolean } = {},
): readonly string[] {
  const divisor = gcd(numerator, denominator);
  const sign = denominator < 0 ? -1 : 1;
  const n = (sign * numerator) / divisor;
  const d = Math.abs(denominator) / divisor;
  if (d === 1) {
    return integerForms(n);
  }

  const forms = [`${n}/${d}`, `\\dfrac{${n}}{${d}}`, `\\frac{${n}}{${d}}`];
  if (n < 0) {
    forms.push(`-\\dfrac{${-n}}{${d}}`, `-\\frac{${-n}}{${d}}`, `-${-n}/${d}`);
  }
  // A terminating decimal is the same number, and a learner who divided rather than reduced
  // has answered the question. `-0.5` and the leading-zero-free `-.5` are both in LF.1's
  // authored list.
  const exact = n / d;
  if (decimals && Number.isFinite(exact) && numStr(exact).replace("-", "").length <= 8) {
    const decimal = numStr(exact);
    if (decimal !== `${n}/${d}` && !decimal.includes("e")) {
      forms.push(decimal, decimal.replace(/^(-?)0\./, "$1."));
    }
  }
  if (unreduced) {
    for (const k of [2, 3, 4]) {
      forms.push(`${n * k}/${d * k}`);
    }
  }
  return unique(forms);
}

/**
 * A linear expression `coefficient * variable + constant`, in both term orders.
 *
 * Both orders matter and are not cosmetic: addition commutes, so a learner who writes the
 * constant first has the right answer, and every shipped expression list says so.
 *
 * Multiplication commutes too, so the coefficient may sit on either side of the variable
 * (`x*3` as much as `3*x`), and a learner may open a positive answer with an explicit `+`.
 * NUM.3's authored list carries all three families, so this has to produce all three or the
 * variant would grade a correct answer wrong that the question beside it grades right.
 */
export function linearForms(
  coefficient: number,
  constant: number,
  variable: string,
): readonly string[] {
  const terms =
    coefficient === 1
      ? [variable]
      : [
          `${coefficient}${variable}`,
          `${coefficient}*${variable}`,
          `${variable}*${coefficient}`,
        ];
  if (constant === 0) {
    return unique(withLeadingPlus(terms));
  }
  // A negative constant already carries its sign, so the constant-first order reads
  // `-4 + 3x` with no special case.
  const tail = constant < 0 ? `- ${-constant}` : `+ ${constant}`;
  return unique(
    withLeadingPlus([
      ...terms.map((term) => `${term} ${tail}`),
      ...terms.map((term) => `${constant} + ${term}`),
    ]),
  );
}

/**
 * A squared term standing beside a linear one, which is what a check on collecting like terms
 * leaves behind.
 *
 * The squared term is the one that could NOT be combined, so it is carried along untouched and
 * the two terms may be written in either order. Both exponent notations are generated because
 * NUM.4's authored list carries both: a learner copying the prompt's typesetting writes
 * `x^{2}` and one typing it fresh writes `x^2`, and the card's normalization does not bring
 * the braces together.
 */
export function squarePlusLinearForms(
  linear: number,
  variable: string,
  square = 1,
): readonly string[] {
  if (linear === 0) {
    return [];
  }
  const power = [`${variable}^2`, `${variable}^{2}`];
  const squareTerms =
    square === 1
      ? power
      : power.flatMap((term) => [`${square}${term}`, `${square}*${term}`]);
  const linearTerms =
    Math.abs(linear) === 1
      ? [`${linear < 0 ? "-" : ""}${variable}`]
      : [`${linear}${variable}`, `${linear}*${variable}`, `${variable}*${linear}`];
  // A negative linear term carries its own sign, so leading with the square reads
  // `x^2 - 3x` with no special case for the joiner.
  const bare = (term: string): string => term.replace(/^-/, "");
  const forms = squareTerms.flatMap((sq) => [
    ...linearTerms.map((lin) => `${sq} ${linear < 0 ? "-" : "+"} ${bare(lin)}`),
    ...linearTerms.map((lin) => `${lin} + ${sq}`),
  ]);
  return unique(withLeadingPlus(forms));
}

/**
 * A quadratic in standard form, which is what expanding a product and what dividing one out
 * both leave behind.
 *
 * Unlike {@link squarePlusLinearForms}, the term ORDER is fixed. Standard form is the thing
 * POL.1 asks for by name, so `6 + 13x + 2x^2` is a correct value written in the wrong form and
 * accepting it would mark the misconception right. What varies is only typesetting: the two
 * exponent spellings, the explicit star, and the redundant `1` on a unit linear coefficient
 * that POL.8's authored list carries (`x^2 - 1x - 2`), because a learner reading coefficients
 * off a synthetic division row writes down the `1` the row actually holds.
 *
 * A zero coefficient drops its term rather than spelling `+ 0x`, since no learner writes that
 * and the check is on the polynomial rather than on the arithmetic that produced it.
 */
export function standardQuadraticForms(
  square: number,
  linear: number,
  constant: number,
  variable = "x",
): readonly string[] {
  if (square === 0) {
    return [];
  }
  const powers = [`${variable}^2`, `${variable}^{2}`];
  const squareTerms =
    Math.abs(square) === 1
      ? powers.map((power) => `${square < 0 ? "-" : ""}${power}`)
      : powers.flatMap((power) => [`${square}${power}`, `${square}*${power}`]);
  const magnitude = Math.abs(linear);
  const linearTerms =
    magnitude === 1
      ? [variable, `1${variable}`, `1*${variable}`]
      : [`${magnitude}${variable}`, `${magnitude}*${variable}`];

  const forms: string[] = [];
  for (const head of squareTerms) {
    const middles =
      linear === 0 ? [head] : linearTerms.map((term) => `${head} ${sign(linear)} ${term}`);
    for (const middle of middles) {
      forms.push(
        constant === 0 ? middle : `${middle} ${sign(constant)} ${Math.abs(constant)}`,
      );
    }
  }
  return unique(forms);
}

/**
 * ONE term: a coefficient times a power, which is the answer to "give the leading term".
 *
 * A narrower list than {@link standardQuadraticForms}'s head, and deliberately so. That helper
 * spells `x^{2}` as well as `x^2` because a quadratic's authored lists carry both, and measured
 * against the real v2 checker the braced spelling is `invalid_input / parse_error`: it is
 * accepted there only because an accepted list is a set of strings a learner might type and a
 * spelling the grader refuses costs nothing sitting in it. Here the list is the whole answer
 * rather than one term of it, so a braced spelling would be the canonical form of an answer the
 * grader cannot read, and it is left out.
 *
 * A coefficient of one is not written, matching how a polynomial prints, but `1x^4` and `-1x^4`
 * are both accepted because a learner deriving the coefficient from a product arrives at the
 * numeral and writes it down.
 */
export function monomialForms(
  coefficient: number,
  power: number,
  variable = "x",
): readonly string[] {
  if (coefficient === 0 || power < 1) {
    return [];
  }
  const body = power === 1 ? variable : `${variable}^${power}`;
  const size = Math.abs(coefficient);
  const lead = coefficient < 0 ? "-" : "";
  const forms =
    size === 1
      ? [`${lead}${body}`, `${lead}1${body}`, `${lead}1*${body}`]
      : [`${lead}${size}${body}`, `${lead}${size}*${body}`];
  return unique(forms);
}

/**
 * A product of brackets, which is what factoring completely produces.
 *
 * The bracket ORDER is free and multiplication is commutative, so every ordering is generated;
 * a numeric common measure, when there is one, stays at the front, because `(x + 4)2(x - 3)` is
 * not something a learner types and generating it would only widen the list with noise.
 *
 * "Completely" is the word POL.2's check turns on, and it is NOT enforced here: a list built
 * from the fully factored form simply never spells a partial one, so `2(x^2 + x - 12)` grades
 * wrong by omission rather than by a rule. That is the right division of labour, since whether
 * a factoring has finished is a fact about the caller's parameters and not about spelling.
 */
export function factoredForms(
  brackets: readonly string[],
  { outside = 1 }: { outside?: number } = {},
): readonly string[] {
  if (brackets.length === 0 || brackets.length > 3) {
    return [];
  }
  const forms: string[] = [];
  for (const order of permutations(brackets)) {
    const bracketed = order.map((bracket) => `(${bracket})`);
    for (const joiner of ["", "*"]) {
      const body = bracketed.join(joiner);
      forms.push(outside === 1 ? body : `${outside}${joiner}${body}`);
    }
  }
  return unique(forms);
}

/** The operator that joins a signed term on, so a negative never reads `+ -3`. */
function sign(value: number): string {
  return value < 0 ? "-" : "+";
}

/**
 * One over a power, which is what "write your answer with positive exponents only" produces
 * when the exponents total a negative.
 *
 * Four spellings of the power and three of the division, because EXP.1's authored list carries
 * all of them: the bracketed `1/(x^2)`, the Python-flavoured `1/x**2` that a learner reaching
 * for a calculator types, and the two LaTeX fraction commands.
 */
export function reciprocalPowerForms(variable: string, power: number): readonly string[] {
  if (power < 1 || !Number.isInteger(power)) {
    return [];
  }
  const powers =
    power === 1
      ? [variable]
      : [`${variable}^${power}`, `${variable}^{${power}}`, `${variable}**${power}`];
  const forms = powers.flatMap((term) => [`1/${term}`, `1/(${term})`]);
  for (const command of ["\\frac", "\\dfrac"]) {
    for (const term of powers) {
      forms.push(`${command}{1}{${term}}`);
    }
  }
  return unique(forms);
}

/**
 * An ordered pair, in the spellings a learner reaches for.
 *
 * The coordinate-naming spellings (`x = 2, y = -3`) are carried because LF.4's authored list
 * carries them, and the reversed one (`y = -3, x = 2`) because naming the coordinates removes
 * the ambiguity that made the order matter. A BARE reversal (`-3, 2`) is not accepted and
 * must not be: with nothing naming which is which, that is the wrong pair.
 *
 * The three axes are independent and are generated as a product rather than as a remembered
 * list of spellings, because LF.4's authored list is that product: a LAYOUT, a JOINER between
 * the two coordinates, and a decimal tail on either coordinate. Enumerating them by hand is
 * what left `x = 2; y = -3` accepted and `x = 2; y = -3.0` a coin toss.
 *
 * The `.0` tail is offered only on a whole number, since `2.5.0` is not a number anybody
 * types. Spacing is not an axis: the card normalizes it away, so `x=2,y=-3` is the same entry
 * as `x = 2, y = -3` and only one of them is generated.
 */
export function pointForms(x: number, y: number): readonly string[] {
  const spellings = (value: number): readonly string[] =>
    Number.isInteger(value) ? [numStr(value), `${numStr(value)}.0`] : [numStr(value)];
  const forms: string[] = [];
  for (const xs of spellings(x)) {
    for (const ys of spellings(y)) {
      for (const joiner of [", ", "; ", " and "]) {
        forms.push(
          `(${xs}${joiner}${ys})`,
          `${xs}${joiner}${ys}`,
          `(x, y) = (${xs}${joiner}${ys})`,
          // Reversed only WITH the coordinates named. A bare `-3, 2` is the wrong pair and is
          // never generated, which is the one asymmetry in this product.
          `x = ${xs}${joiner}y = ${ys}`,
          `y = ${ys}${joiner}x = ${xs}`,
        );
      }
    }
  }
  return unique(withStop(forms));
}

/**
 * One word, plus the phrasings a learner wraps it in.
 *
 * `extras` is per-item because the wrapping is: "the line is decreasing" reads naturally for
 * a classification about a line and would read as noise elsewhere.
 */
export function wordForms(word: string, extras: readonly string[] = []): readonly string[] {
  return unique([word, ...extras]);
}

/**
 * An interval, in the three ways the unbounded end gets written.
 *
 * The BRACKETS are not an axis and must never become one: which bracket an endpoint takes is
 * the half of this skill that the two shipped packs are testing (LIN.4 decides it from a
 * `\le`, LIN.6 from a strict `<`), so a list offering both would mark the misconception
 * correct. What does vary is only how a learner spells infinity, and all three spellings mean
 * the same thing.
 *
 * `-Infinity` and `Infinity` are the open ends. An infinite endpoint is always round, whatever
 * the caller passes, because there is no such number to include.
 */
export function intervalForms(
  low: number,
  high: number,
  {
    lowClosed = false,
    highClosed = false,
  }: { lowClosed?: boolean; highClosed?: boolean } = {},
): readonly string[] {
  if (!(low < high)) {
    return [];
  }
  // The canonical spelling first, and it is `inf`: printable ASCII, so it survives the keypad
  // tripwire in `cfuVariants.test.ts`, which the glyph would not.
  const infinities = ["inf", "infinity", "\u221e"];
  const forms: string[] = [];
  for (const word of infinities) {
    const left =
      low === Number.NEGATIVE_INFINITY
        ? `(-${word}`
        : `${lowClosed ? "[" : "("}${numStr(low)}`;
    const right =
      high === Number.POSITIVE_INFINITY
        ? `${word})`
        : `${numStr(high)}${highClosed ? "]" : ")"}`;
    forms.push(`${left}, ${right}`);
  }
  return unique(forms);
}

/**
 * A solution set, in the ways a learner writes "these values, and no others".
 *
 * Braces are optional rather than required, and a bare list is first, because that is what the
 * two shipped packs accept and because the prompt on each one shows a braced example without
 * demanding it. The ORDER is free in both directions: a set has none, so refusing the reversal
 * would be marking a correct answer wrong.
 *
 * SQUARE brackets are not a spelling of any of this and must never be added back. `[6, 20]` is
 * the closed interval — every real number between the two — and it is the notation LIN.4's
 * second slide teaches, so a learner who reaches for it on a roster question is applying that
 * lesson to a question it does not fit. This list is EXACT-STRING matched by the card, so an
 * entry here is accepted whatever the shared checker would have said about it, and the checker
 * itself stopped conflating the two when `parseValueList` left off stripping `[` and `]`.
 * `cfuRosterBracketing.test.ts` sweeps every served instance and fails if one comes back.
 *
 * `extraneous` is the note a learner appends after throwing a candidate out, and it exists
 * because RAT.6's authored list carries three spellings of it. It is passed rather than
 * inferred: only the caller knows whether the equation it drew invented a root that its
 * excluded values then forbid, and a parenthetical naming a value that was never a candidate
 * would be an accepted spelling of something untrue.
 *
 * A root may be given as a {@link Ratio} rather than a number, and POL.4 is why: the quadratic
 * formula's whole reason for existing is the root that does not come out whole, so its check
 * keys `3/2`. Passing `1.5` would spell the decimal and not the fraction, which is the one
 * spelling that pack's authored list has.
 *
 * `unreduced` is handed straight to {@link fractionForms} and is a per-item decision there for
 * the same reason it is one here: whether lowest terms is part of the question is a fact about
 * the NODE, so every caller states it rather than inheriting whichever was convenient. POL.4
 * passes it — a learner who reaches `-4, 4/10` through the quadratic formula has done all of
 * what that node teaches, and was being marked wrong for a reduction it never asks for — and
 * the three integer-rooted callers have no fraction for it to reach.
 */
export function solutionSetForms(
  values: readonly (number | Ratio)[],
  {
    extraneous = [],
    unreduced = false,
  }: { extraneous?: readonly number[]; unreduced?: boolean } = {},
): readonly string[] {
  if (values.length === 0 || values.length > 3) {
    return [];
  }
  // A fraction spells as a fraction FIRST and as its decimal after, which is the order
  // `fractionForms` already puts them in, so an exact root stays exact in the canonical form
  // the reveal prints while a learner who divided is still marked right.
  const spellings = (value: number | Ratio): readonly string[] => {
    if (typeof value !== "number") {
      return fractionForms(value.over, value.under, { unreduced });
    }
    return Number.isInteger(value)
      ? [numStr(value), `${numStr(value)}.0`]
      : [numStr(value)];
  };

  const bodies: string[] = [];
  for (const order of permutations(values)) {
    for (const separator of [", ", "; ", " and "]) {
      for (const spelt of cartesian(order.map(spellings))) {
        const list = spelt.join(separator);
        bodies.push(list, `{${list}}`);
        if (order.length === 1) {
          // A single value invites the sentence forms a list does not: naming the variable,
          // and saying it is the only one. Both are in RAT.6's authored list.
          bodies.push(`x = ${list}`, `{x = ${list}}`, `${list} only`, `x = ${list} only`);
        }
      }
    }
  }

  const notes = extraneous.flatMap((value) => [
    ` (x = ${numStr(value)} is extraneous)`,
    ` (${numStr(value)} is extraneous)`,
  ]);
  return unique([
    ...bodies,
    ...bodies.flatMap((body) => notes.map((note) => `${body}${note}`)),
  ]);
}

/** Every ordering of up to three values. A set has no order, so every one of them is right. */
function permutations<T>(values: readonly T[]): readonly (readonly T[])[] {
  if (values.length <= 1) {
    return [values];
  }
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [
      value,
      ...rest,
    ]),
  );
}

/** Every way of picking one spelling from each part, in order. */
function cartesian(parts: readonly (readonly string[])[]): readonly (readonly string[])[] {
  let built: string[][] = [[]];
  for (const part of parts) {
    built = built.flatMap((head) => part.map((spelling) => [...head, spelling]));
  }
  return built;
}

/**
 * A line as an EQUATION rather than as a value, which is what LF.2 asks a learner to type.
 *
 * Three things vary independently, and LF.2's authored list is exactly their product: what the
 * left side is called (`y =`, `f(x) =`, or nothing at all, since the prompt asks only for the
 * right-hand side), how the two terms are ordered, and how a negative constant is joined on. A
 * learner may write `- 1`, `+ -1` or `+ (-1)` for the same intercept, and all three are in the
 * shipped list, so all three are generated rather than remembered.
 */
export function equationForms(
  slope: number,
  intercept: number,
  variable = "x",
): readonly string[] {
  const magnitude = Math.abs(slope);
  const slopeTerms =
    magnitude === 1
      ? [`${slope < 0 ? "-" : ""}${variable}`]
      : [`${slope}${variable}`, `${slope}*${variable}`, `${variable}*${slope}`];
  // The same term with its sign stripped, for the order that leads with the constant and
  // therefore has to join the variable term with an operator.
  const bareSlopeTerms =
    magnitude === 1 ? [variable] : [`${magnitude}${variable}`, `${magnitude}*${variable}`];

  const spellings = (value: number): readonly string[] =>
    Number.isInteger(value) ? [numStr(value), `${numStr(value)}.0`] : [numStr(value)];
  const signedConstants = spellings(intercept);
  const bareConstants = spellings(Math.abs(intercept));

  const tails: string[] =
    intercept === 0
      ? [""]
      : intercept < 0
        ? [
            ...bareConstants.map((c) => ` - ${c}`),
            ...signedConstants.flatMap((c) => [` + ${c}`, ` + (${c})`]),
          ]
        : bareConstants.map((c) => ` + ${c}`);

  const bodies = slopeTerms.flatMap((term) => tails.map((tail) => `${term}${tail}`));
  // The constant-first order, which addition makes just as correct: `-1 - 3x`.
  const reversed =
    intercept === 0
      ? []
      : signedConstants.flatMap((c) =>
          bareSlopeTerms.map((term) => `${c} ${slope < 0 ? "-" : "+"} ${term}`),
        );

  const all = [...bodies, ...reversed];
  return unique([
    ...all.map((body) => `y = ${body}`),
    ...all,
    ...all.map((body) => `f(x) = ${body}`),
  ]);
}

/**
 * A single logarithm of one argument, in the ways a learner writes the function's name.
 *
 * `ln` and `log_b` are accepted alongside `log` because EL.5's authored list accepts them: the
 * condensing rules hold in every base, so a learner who wrote the wrong NAME for the base has
 * still condensed correctly, and this node is testing the condensing.
 */
export function logArgumentForms(argument: readonly string[]): readonly string[] {
  const forms = argument.flatMap((inside) =>
    ["log", "ln", "log_b"].flatMap((name) => [`${name}(${inside})`, `${name}${inside}`]),
  );
  return unique(forms);
}

/**
 * An expression wearing absolute-value bars, in the two notations and every place the bars
 * can legitimately go.
 *
 * RAD.4's authored list is the reason each family is here rather than only the canonical one:
 * `6|x^3|`, `6|x|^3`, `|6x^3|` and `6x^2|x|` are four genuinely different pieces of correct
 * reasoning about where a sign can hide, and a list that took only the first would mark three
 * correct answers wrong. `abs(...)` and the pipes are the same notation typed two ways, and
 * the prompt itself offers both.
 */
export function absBarsForms(
  coefficient: number,
  variable: string,
  power: number,
): readonly string[] {
  const bars = (inner: string): readonly string[] => [`abs(${inner})`, `|${inner}|`];
  const pow = (base: string, exponent: number): string =>
    exponent === 1 ? base : `${base}^${exponent}`;
  const forms: string[] = [];
  const lead = coefficient === 1 ? "" : `${coefficient}`;
  for (const barred of bars(pow(variable, power))) {
    forms.push(`${lead}*${barred}`, `${lead}${barred}`);
  }
  for (const barred of bars(variable)) {
    forms.push(`${lead}*${barred}^${power}`, `${lead}${barred}^${power}`);
  }
  for (const barred of bars(`${lead}${pow(variable, power)}`)) {
    forms.push(barred);
  }
  for (const barred of bars(`${lead}*${pow(variable, power)}`)) {
    forms.push(barred);
  }
  // An even power of the variable carries no sign, so it can stand outside the bars while a
  // single factor stays inside them. Only available when the power is odd and above one.
  if (power > 1 && power % 2 === 1) {
    for (const barred of bars(variable)) {
      forms.push(
        `${lead}*${pow(variable, power - 1)}*${barred}`,
        `${lead}${pow(variable, power - 1)}${barred}`,
      );
    }
  }
  return unique(forms.map((form) => (form.startsWith("*") ? form.slice(1) : form)));
}

/**
 * A simplified radical, optionally over a whole number, in every notation the packs accept.
 *
 * Three notations, and all three are in RAD.1's shipped list: `sqrt(2)`, the LaTeX
 * `\sqrt{2}`, and the bare glyph. The glyph is generated LAST of the three on purpose, because
 * the first form in the list is the one the reveal prints and asks the learner to type, and the
 * keypad tripwire in `cfuVariants.test.ts` requires that one to be reachable from a keyboard.
 */
export function radicalForms(
  outside: number,
  inside: number,
  denominator = 1,
): readonly string[] {
  if (inside < 2 || !Number.isInteger(inside)) {
    return [];
  }
  const roots = [
    `sqrt(${inside})`,
    `sqrt${inside}`,
    `\\sqrt{${inside}}`,
    `\\sqrt${inside}`,
    `\u221a${inside}`,
  ];
  const forms: string[] = [];
  for (const root of roots) {
    const heads =
      outside === 1
        ? [root, `1*${root}`, `1${root}`]
        : [`${outside}*${root}`, `${outside}${root}`];
    for (const head of heads) {
      if (denominator === 1) {
        forms.push(head);
      } else {
        forms.push(`${head}/${denominator}`, `(${head})/${denominator}`);
      }
    }
  }
  if (denominator !== 1) {
    // The LaTeX fraction wrapping the LaTeX root, which is how a learner copying the prompt's
    // own typesetting writes it.
    for (const command of ["\\frac", "\\dfrac"]) {
      const top = outside === 1 ? `\\sqrt{${inside}}` : `${outside}\\sqrt{${inside}}`;
      forms.push(`${command}{${top}}{${denominator}}`);
    }
  }
  return unique(forms);
}

/**
 * A rational expression, in the slash and LaTeX spellings.
 *
 * `tops` and `bottoms` are ZIPPED rather than crossed, and that is what keeps the list the size
 * the shipped packs are: a learner who writes the numerator's terms the other way round writes
 * the denominator's the same way (`(8 + x)/(5 + x)`), and pairing them says so instead of also
 * generating the two mixed spellings nobody types.
 */
export function ratioForms(
  tops: readonly string[],
  bottoms: readonly string[],
): readonly string[] {
  const canonicalTop = tops[0] ?? "";
  const canonicalBottom = bottoms[0] ?? "";
  const slashes = tops.map(
    (top, index) => `(${top})/(${bottoms[index] ?? canonicalBottom})`,
  );
  return unique([
    ...slashes,
    `\\dfrac{${canonicalTop}}{${canonicalBottom}}`,
    `\\frac{${canonicalTop}}{${canonicalBottom}}`,
  ]);
}

/**
 * An expression followed by the values it excludes, which is the shape of four of the five
 * rational capstones.
 *
 * Both separators vary INDEPENDENTLY, and that is read off the shipped lists rather than
 * invented: RAT.1 accepts `(x + 8)/(x + 5), x = 8 and x = -5`, where a comma joins the
 * expression to the list and the word joins the values inside it. Marking is its own axis
 * again, because a learner may write the variable once (`x = 8, -5`), on every value, or not
 * at all, and all three are shipped.
 *
 * The ORDER of the excluded values is free, for the reason it is free in a solution set: they
 * are a set. Two of the packs ask for them smallest first in the prompt, and that request is
 * about how to READ the answer rather than about which answers are right, so the list accepts
 * the orderings and the prompt keeps asking.
 */
export function withExclusions(
  expressions: readonly string[],
  values: readonly number[],
): readonly string[] {
  if (expressions.length === 0 || values.length === 0 || values.length > 3) {
    return [];
  }
  const separators = [", ", "; ", " and "];
  const lists: string[] = [];
  for (const order of permutations(values)) {
    const spelt = order.map(numStr);
    for (const inner of separators) {
      for (const marker of ["x = ", "x \u2260 ", "x != ", ""]) {
        // Marked on every value, and marked on the first only, which is the shorthand a
        // learner writes when the variable is obvious from the first one.
        lists.push(spelt.map((value) => `${marker}${value}`).join(inner));
        lists.push([`${marker}${spelt[0]}`, ...spelt.slice(1)].join(inner));
      }
    }
  }
  const forms = expressions.flatMap((expression) =>
    separators.flatMap((outer) => lists.map((list) => `${expression}${outer}${list}`)),
  );
  return unique(forms);
}

/**
 * Join a composite answer's parts under every separator the pack accepts.
 *
 * This is the machinery the nine composite capstones need, and the reason a composite is not
 * simply harder to author: the answer is a fixed sequence of parts, each with its own
 * spellings, and the typing convention is the separator between them. Enumerating that by
 * hand is where the authored lists get long and where they get uneven, which is visible in
 * the shipped ones: RAT.1 accepts `x = 8, x = -5` and its own reversal, RAT.4 accepts a bare
 * `-4, 0`, and neither accepts what the other does.
 *
 * `prefixes` decorate the FIRST part only (`m = -1/2, decreasing`), and `reversed` adds the
 * parts in the opposite order for the answers where naming makes the order safe to swap.
 */
export function compositeForms(
  parts: readonly (readonly string[])[],
  {
    separators,
    prefixes = [""],
    reversed = false,
  }: { separators: readonly string[]; prefixes?: readonly string[]; reversed?: boolean },
): readonly string[] {
  if (parts.length === 0 || parts.some((part) => part.length === 0)) {
    return [];
  }

  const join = (ordered: readonly (readonly string[])[]): string[] => {
    let built: string[] = [""];
    ordered.forEach((part, index) => {
      const next: string[] = [];
      for (const head of built) {
        for (const separator of index === 0 ? [""] : separators) {
          for (const spelling of part) {
            next.push(`${head}${separator}${spelling}`);
          }
        }
      }
      built = next;
    });
    return built;
  };

  const forward = prefixes.flatMap((prefix) =>
    join([parts[0]?.map((first) => `${prefix}${first}`) ?? [], ...parts.slice(1)]),
  );
  const backward = reversed ? join([...parts].reverse()) : [];
  return unique(withStop([...forward, ...backward]));
}
