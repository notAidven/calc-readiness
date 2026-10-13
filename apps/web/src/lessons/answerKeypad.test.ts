/**
 * The keypad's two hard rules, checked against the served bank and the real checker.
 *
 *  1. **It offers only notation the item's own grader accepts.** A key that types a
 *     character the checker cannot read is worse than no key: the learner taps it, the
 *     attempt comes back `invalid_input` (which §12 of the equivalence spec treats as
 *     UNANSWERED, so it is not even scored against them), and the only thing they are
 *     told is "Check the format so the expression can be read." So every key is graded
 *     against every served instance that would be offered it, through the same versioned
 *     checker the practice surfaces grade with.
 *
 *  2. **It reads the same dispatch the placeholder does.** Two tables answering "what
 *     notation does this item need" would drift, and the failure mode is silent and
 *     specific: a field advertising "One of the options above" with a square-root key
 *     under it. There is one dispatch, {@link answerNotation}, and this file pins that
 *     both consumers agree on every item the bank can serve.
 */

import {
  D1_PRACTICE_ITEMS,
  D2_PRACTICE_ITEMS,
  D3_PRACTICE_ITEMS,
  D4_PRACTICE_ITEMS,
  D5_PRACTICE_ITEMS,
  D6_PRACTICE_ITEMS,
  D7_PRACTICE_ITEMS,
  D8_PRACTICE_ITEMS,
  D9_PRACTICE_ITEMS,
  D10_PRACTICE_ITEMS,
  type FrozenItem,
  INTERACTIVE_PRACTICE_ITEMS,
} from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import {
  type AnswerNotation,
  answerKeypad,
  answerNotation,
  cfuKeypad,
  cfuNotation,
  cfuPlaceholder,
  EXACT_RADIAN_PLACEHOLDER,
  EXACT_TRIG_VALUE_PLACEHOLDER,
  EXPONENT_NOTATION_PLACEHOLDER,
  FRACTION_BAR_PLACEHOLDER,
  FRACTION_PLACEHOLDER,
  GENERIC_PLACEHOLDER,
  IMPLICIT_PRODUCT_PLACEHOLDER,
  INTERVAL_PLACEHOLDER,
  type MathKey,
  MULTIPLE_CHOICE_PLACEHOLDER,
  NUMERIC_LITERAL_PLACEHOLDER,
  PI_EXPRESSION_PLACEHOLDER,
  PI_FRACTION_PLACEHOLDER,
  POINT_PLACEHOLDER,
  POSITIVE_EXPONENT_PLACEHOLDER,
  practicePlaceholder,
  RADICAL_PLACEHOLDER,
  RADICAL_QUOTIENT_PLACEHOLDER,
  RADICAL_SUM_PLACEHOLDER,
  RATIONAL_EXPRESSION_PLACEHOLDER,
  RATIONAL_POLYNOMIAL_PLACEHOLDER,
  REDUCED_FRACTION_PLACEHOLDER,
  SET_BUILDER_PLACEHOLDER,
  SOLUTION_SET_FRACTION_PLACEHOLDER,
  SOLUTION_SET_PLACEHOLDER,
  VARIABLE_RADICAL_PLACEHOLDER,
} from "./answerFormat";
import { cfuInstances } from "./cfuVariants";
import { allLessons, LESSON_DOMAINS } from "./domains";
import { checkerVersionForItem, practiceChecker } from "./practiceChecker";

/**
 * Every item any practice surface can serve: the seven registered lesson domains plus the
 * interactive demo pool.
 *
 * A LIST, and it is the thing a new domain gets left off — this one was left off FOUR
 * times. D3, D8, D10 and D9 each shipped a pool, a loader and a `domains.ts` entry, and every
 * sweep in this file went on saying "all the registered pools" and passing, with those
 * items outside the guard entirely. Keep it in step with `SERVED_ITEMS` in
 * `answerFormat.test.ts`, which is the same domain pools, and with `PRODUCT_POOL_ITEMS`
 * in `practiceChecker.ts`, which is the list that decides what is gradable at all.
 *
 * D9's omission is the one that cost something. `answerNotation`'s pi rule carries a comment
 * saying that a key written in pi that ALSO needs another notation "FAILS rather than shipping
 * half a row, because `pi` is in `NOTATION_KEY_FOR` in `answerKeypad.test.ts`". That was a true
 * statement about the sweep and a false one about its population: TRG.1's and TRG.6's CFUs are
 * keyed `pi/4` and `pi/6`, they shipped a pi key with no bar for as long as this list omitted
 * D9, and the assertion written to catch exactly that passed every run. The prefix census below
 * is derived from the registry now so that a pool cannot be missing from this line silently.
 *
 * **D6 IS THE FIRST POOL THAT CENSUS CAUGHT, ON THE DAY IT COULD.** D6 registered itself in
 * `LESSON_DOMAINS` and was never spread into this list, so on the merge that brought the two
 * together the derived census failed by name — `no d6 item is in SERVED_ITEMS` — where the
 * hand-written prefix list it replaced would have said nothing at all. What was hiding behind
 * the gap is the point: FUN.8 was keying its inverses `4*x + 6` against a keypad that offers D6
 * no times key, so fourteen items across two templates were ungradable by anything a learner
 * could type, and not one assertion in this file had ever run over them.
 */
const SERVED_ITEMS: readonly FrozenItem[] = [
  ...D1_PRACTICE_ITEMS,
  ...D2_PRACTICE_ITEMS,
  ...D3_PRACTICE_ITEMS,
  ...D4_PRACTICE_ITEMS,
  ...D5_PRACTICE_ITEMS,
  ...D6_PRACTICE_ITEMS,
  ...D7_PRACTICE_ITEMS,
  ...D8_PRACTICE_ITEMS,
  ...D9_PRACTICE_ITEMS,
  ...D10_PRACTICE_ITEMS,
  ...INTERACTIVE_PRACTICE_ITEMS,
];

/**
 * A floor under each pool's contribution, and a census that the pools present are exactly the
 * pools registered.
 *
 * The floor half was here already, and it was not enough. `SERVED_ITEMS` is a spread of arrays
 * and a spread that comes back empty is invisible, so a floor catches a pool that EMPTIES. It
 * cannot catch a pool that was never spread in the first place, because the list of prefixes it
 * iterates was written by hand beside the list of spreads — the two went stale together, four
 * times, and a domain missing from both reads as a domain that does not exist.
 *
 * So the population is derived from `LESSON_DOMAINS`, which is the registry a domain has to join
 * to be reachable at all, and the census runs BOTH ways: a registered domain contributing
 * nothing here fails by name, and an item whose prefix belongs to no registered domain fails
 * too. `INTERACTIVE_PRACTICE_ITEMS` is the one member that is deliberately not a lesson domain,
 * so it is named as an exception rather than quietly widening the second direction.
 */
describe("the served population holds every pool it claims to", () => {
  const prefixOf = (item: FrozenItem): string => item.template_id.split(".")[0] ?? "";
  const REGISTERED = LESSON_DOMAINS.map((domain) => domain.id);
  /** Not a lesson domain: the `?interactive` demo pool, whose ids are `int.*` and which no
   * `domains.ts` entry owns. */
  const NOT_A_LESSON_DOMAIN = ["int"];

  it.each(REGISTERED)("serves %s items", (id) => {
    expect(
      SERVED_ITEMS.filter((item) => prefixOf(item) === id).length,
      `no ${id} item is in SERVED_ITEMS, so every sweep in this file skips that pool`,
    ).toBeGreaterThan(60);
  });

  it("serves nothing from a pool no registered domain owns", () => {
    const allowed = new Set([...REGISTERED, ...NOT_A_LESSON_DOMAIN]);
    expect(
      [...new Set(SERVED_ITEMS.map(prefixOf))]
        .filter((prefix) => !allowed.has(prefix))
        .sort(),
      "an item's pool is in this population but in no registered lesson domain",
    ).toEqual([]);
  });

  it("names the interactive pool as an exception that is really there", () => {
    // The other direction on the exception, so it cannot sit in the list forever excusing a
    // pool that has been renamed or removed.
    for (const prefix of NOT_A_LESSON_DOMAIN) {
      expect(
        SERVED_ITEMS.filter((item) => prefixOf(item) === prefix).length,
        `${prefix} is declared an exception to the registry census but serves nothing`,
      ).toBeGreaterThan(0);
      expect(
        REGISTERED,
        `${prefix} is a registered domain now, so it no longer needs excusing`,
      ).not.toContain(prefix);
    }
  });
});

const keypadFor = (item: FrozenItem): readonly MathKey[] =>
  answerKeypad(
    item.answer.answer_spec,
    item.answer.allowed_symbols,
    item.answer.answer_key,
  );

const placeholderFor = (item: FrozenItem): string =>
  practicePlaceholder(
    item.answer.answer_spec,
    item.answer.allowed_symbols,
    item.answer.answer_key,
  );

/** The tag both of the above are switches over, read exactly as the surfaces read it. */
const notationFor = (item: FrozenItem): AnswerNotation =>
  answerNotation(
    item.answer.answer_spec,
    item.answer.allowed_symbols,
    item.answer.answer_key,
  );

/** The three tags the constant-radicand family splits into, which share one row of keys. */
const CONSTANT_RADICAL_NOTATIONS: readonly AnswerNotation[] = [
  "constant_radical_product",
  "constant_radical_quotient",
  "constant_radical_sum",
];

/**
 * The payload the answer surface submits for one written expression.
 *
 * A `rational_answer` item is graded on TWO halves and submits an object, not a string
 * (`RationalAnswerInput` in `PracticeAnswer.tsx`, and `rationalAnswer.test.tsx` grades the
 * whole D5 pool through the same shape). Handing it a bare string grades as a missing
 * exclusion whatever the expression says, which would make every verdict below meaningless
 * on the largest pool in the bank. The excluded values are the item's own, so the only
 * thing under test is the spelling of the expression.
 */
function rawAnswerFor(item: FrozenItem, expression: string): string | object {
  if (item.answer.answer_spec.answer_type !== "rational_answer") {
    return expression;
  }
  const excluded = (item.answer as { excluded_values?: readonly string[] }).excluded_values;
  return { expression, excluded_values: (excluded ?? []).join(", ") };
}

/** Grade a raw string against an item exactly as the practice surface would. */
function verdict(item: FrozenItem, rawAnswer: string): string {
  const result = practiceChecker({
    raw_answer: rawAnswerFor(item, rawAnswer) as string,
    item_version_id: item.item_version_id,
    equivalence_checker_version: checkerVersionForItem(item),
  });
  return `${result.status}/${result.reason_code}`;
}

/**
 * Exactly what the field holds after a learner writes `key`'s notation around `inner`.
 * Every realization below is built out of this rather than out of a hand-written string —
 * so a notation whose `insert` changed to something the grader cannot read produces a
 * realization the grader cannot read, and the sweep goes red. Realizations written by hand
 * would have gone on passing.
 *
 * The two shapes are the two the table has: a call-shaped spelling takes its argument
 * between the brackets, and everything else is a mark the learner writes and carries on
 * from. This used to be a stored caret offset on `MathKey`, which existed because the
 * `Insert notation` keypad had to know where to park a text cursor after a tap; with the
 * strip gone the offset is derivable from the spelling and is no longer carried.
 */
function fill(key: MathKey, inner: string): string {
  return key.insert.endsWith("()")
    ? `${key.insert.slice(0, -1)}${inner})`
    : `${key.insert}${inner}`;
}

/**
 * A key on its own types a fragment (`^`), which is not a gradeable answer. So each key
 * declares the finished shapes a learner would reach for with it, built from the key's
 * own insertion and the item's own declared symbol.
 *
 * Keyed by `MathKey.id` and checked for completeness below, so a new key cannot be added
 * to the keypad without a realization that puts it through the checker.
 */
const REALIZATIONS: Record<
  string,
  (key: MathKey, symbol: string | undefined, item: FrozenItem) => readonly string[]
> = {
  // 8 is `MAX_EXPONENT`: the largest power the grammar admits.
  exponent: (key, symbol) => [
    `${symbol ?? "2"}${fill(key, "2")}`,
    `${symbol ?? "2"}${fill(key, "8")}`,
  ],
  // A symbol goes on BOTH sides of the bar, and which side is graded depends on the item.
  //
  // The numerator shape is the one this list was missing, and D9 is what showed it: an exact
  // radian is keyed `pi/4`, so a symbol over an integer is the whole shape that cohort's bar key
  // exists for, and the sweep had no realization of it. The denominator shape is kept where the
  // grader has one — `1/x^2` is an ordinary D2 and D5 answer — and dropped where it does not:
  // a numeric-exact item grades `1/pi^2` as `invalid_input/unsupported_symbolic_denominator`,
  // which is a true statement about a form no radian answer takes and would have this sweep
  // reporting a key that is correctly offered. The realization is aimed at the item's own
  // grammar rather than the exemption list being grown, so no template is excused anything.
  //
  // The numerator shape skips the two-field `rational_answer` surface, and that exclusion is a
  // recorded FINDING rather than a convenience. Measured on this tree: `x/3` and `6*x/5` are
  // served keys of `d5.rat1.monomial.l1` and grade `correct/match`, while the same shape on
  // `d5.rat3.samedenom.l1` (keyed `16/(x + 4)`) grades `invalid_input/parse_error` — as do
  // `(x + 1)/2` and `3*x/2`, though `2/x`, `1/x^2` and `x` all grade there. So a symbol over an
  // integer is readable on one D5 template and unreadable on another, which is D5's grader to
  // answer for and is not something this pool's keypad can fix. All 210 D5 items do grade their
  // own key correct, so no learner is blocked on the answer they are actually asked for.
  fraction: (key, symbol, item) => {
    if (!symbol) {
      return [`1${fill(key, "2")}`];
    }
    const shapes = [`1${fill(key, "2")}`];
    if (item.answer.answer_spec.answer_type !== "rational_answer") {
      shapes.push(`${symbol}${fill(key, "2")}`);
    }
    if (item.answer.answer_spec.equivalence === "symbolic") {
      shapes.push(`1${fill(key, `${symbol}^2`)}`);
    }
    return shapes;
  },
  sqrt: (key, symbol) =>
    symbol
      ? [fill(key, symbol), `2*${symbol}*${fill(key, `2*${symbol}`)}`]
      : [fill(key, "2"), `5*${fill(key, "2")}`, `${fill(key, "2")}/5`],
  abs: (key, symbol) => [fill(key, symbol ?? "2"), fill(key, `${symbol ?? "2"}^5`)],
  times: (key, symbol) =>
    symbol
      ? [`2${fill(key, "")}${symbol}`]
      : [`2${fill(key, "")}3`, `5${fill(key, "")}sqrt(2)`],
  // Both spellings the pi cohort's grader reads, because the key types a complete token and
  // the learner joins it to a coefficient either way: `3*pi` and `3pi`. The bare token is
  // graded too, so a row that typed something unparseable on its own is caught.
  pi: (key) => [fill(key, ""), `3${fill(key, "")}`, `3*${fill(key, "")}`],
};

/**
 * The notation a written answer can carry, and the key that types it. `+` and `-` are
 * absent on purpose: both are on a phone keyboard's first layer, so neither is a key.
 */
const NOTATION_KEY_FOR: readonly (readonly [RegExp, string])[] = [
  [/\^/, "exponent"],
  [/\//, "fraction"],
  [/sqrt\(|cbrt\(|nthRoot\(/, "sqrt"],
  [/abs\(|\|/, "abs"],
  [/\*/, "times"],
  // The one entry whose pattern is a NAME rather than a character class, and the one whose
  // characters are all already on the keyboard. It is here for the same reason as the rest:
  // this table is what the positive sweep derives its requirement from, so with pi in it a key
  // written in pi that reaches a tag offering no pi key is REPORTED. Without it the defect that
  // shipped on `d10.geo2.cylinder-volume-exact.l3` — a bare field over `588*pi` — was invisible
  // to every assertion in this file even after D10 joined the population.
  [/(^|[^a-z])pi([^a-z]|$)/i, "pi"],
];

/**
 * One character a learner can type without any key at all: a letter, a digit, a space, or
 * punctuation a phone keyboard shows.
 *
 * It is the complement of {@link NOTATION_KEY_FOR} and the two are checked against each other
 * below, because that is the only thing that makes this class honest. Widened from
 * `[0-9a-zA-Z\s]` because that version implied a key for `+`, which the note above says is
 * deliberately not a key: an answer as ordinary as NUM.4's `x^2 + 5x` was reported as
 * untypable on account of its plus sign, and the caret it really is about would have been lost
 * in that noise. Every character listed here appears in an authored CFU answer.
 */
const ON_THE_KEYBOARD = /[0-9a-zA-Z\s+\-,;:.()[\]{}=<>!≠]/;

/** The answer key an item is graded against, which is where its notation is read from. */
const answerKeyOf = (item: FrozenItem): string =>
  (item.answer as { answer_key?: string }).answer_key ?? "";

/**
 * The templates whose answer key spells a product with a `*` the learner does not have to
 * type, because the item's own grader reads the product without it.
 *
 * This is the one ground on which a `*` in an answer key does not oblige a times key, and
 * it is not an argument: the sweep below re-grades every served instance of every template
 * named here with the star REMOVED, through the same versioned checker the practice surface
 * uses, and requires `correct`. So an entry here is a measurement, and a template whose
 * grader stops reading juxtaposition falls out of the list the moment it does.
 *
 * Three templates carry a star and are deliberately NOT here, which is what stops this
 * being a bucket for every current failure. `d8.el5.condense-sum.l2` keys `log(m*a*q)`, and
 * `log(maq)` grades `invalid_input / unknown_symbol` because three adjacent letters read as
 * one symbol. `d5.rat3.factorlcd.l3` and `d5.rat3.unlike.l2` key a denominator like
 * `(x*(x + 6))`, and `x(x + 6)` grades `invalid_input / unsupported_syntax`. On those three
 * the star is load-bearing notation with nothing on screen naming it, so they stay in the
 * sweep and the sweep reports them.
 */
const STAR_IS_OPTIONAL: ReadonlySet<string> = new Set([
  // D1 NUM.3 / NUM.4: `5*n + 25`, `9*t`, `6*y - 8`. A coefficient against a single letter.
  "d1.num-3.l1",
  "d1.num-3.l2",
  "d1.num-3.l2b",
  "d1.num-3.l2c",
  "d1.num-3.l3",
  "d1.num-4.l1",
  "d1.num-4.l2",
  "d1.num-4.l2b",
  "d1.num-4.l3",
  // The two L3 shapes added to close the single-shape cells: `3*y + 23`, `6*x^2 + 16`. Same
  // ground as their siblings above, a coefficient against a single letter. `d1.num-4.l3b` is
  // exempt from the TIMES key only: its squared branch is owed the caret key and gets it, and
  // `NO_KEYS_OWED` derives per (template, key) so this entry cannot excuse that.
  "d1.num-3.l3b",
  "d1.num-4.l3b",
  // D5 RAT.1 to RAT.4, the `rational_answer` templates whose star is only ever a
  // coefficient or a bracket product: `5*x`, `(x + 4)*(x - 5)`, `2*(x + 1)/(3*x)`.
  "d5.rat1.factor-out.l2",
  "d5.rat1.monomial.l1",
  "d5.rat1.scaled.l3",
  "d5.rat2.alloy.l3",
  "d5.rat2.billet.l3",
  "d5.rat2.charm.l1",
  "d5.rat3.numerator.l2",
  "d5.rat3.subtract.l3",
  "d5.rat4.mixture-divisor.l3",
  "d5.rat4.nested-sum.l3",
  "d5.rat4.stack.l1",
  // D7 LF.2: `3*x - 1`, the right-hand side of a line.
  "d7.lf2.parallel-point.l2",
  "d7.lf2.perpendicular-standard.l3",
  "d7.lf2.point-slope.l3",
  "d7.lf2.slope-intercept.l1",
  // D8 EL.5's expand halves: `5 * log(b) + log(m)`, a coefficient against a `log(` call.
  "d8.el5.expand-power.l2",
  "d8.el5.expand-quotient.l3",
  // D10 GEO.2's exact cylinder volume: `588*pi`, a coefficient against a declared symbol,
  // which is the same shape as D1's `9*t` above and grades the same way. All seven served
  // instances return `correct/match` with the star removed, which the sweep below re-measures.
  //
  // The entry excuses the TIMES KEY and nothing else, and it is LOAD-BEARING rather than
  // decorative now that the item has a real tag. It used to sit here beside a warning that the
  // item was tagged `none` and so got no row at all — an exemption that excused a times key on
  // an item that had no keypad to put one in, which is a thing no assertion could feel. The
  // item is tagged `pi_expression` since the pi dispatch landed and its field carries a pi key
  // and a live preview; the star is still optional and still unadvertised by that row, so the
  // exemption now excuses one absent key on a row that exists, which is what it always claimed
  // to be doing. Force it false and the sweep fails at this template by name.
  "d10.geo2.cylinder-volume-exact.l3",
]);

/**
 * The templates whose answer key carries a `|` that is not an absolute value bar.
 *
 * `{x | x != 2}` reads "x such that x is not 2", so the pipe `NOTATION_KEY_FOR` matches is
 * the set-builder separator and there is no absolute value anywhere in the answer. An
 * `abs()` key on these would be worse than useless: writing the FORM is what a set-builder
 * item measures (`SET_BUILDER_NOTATION_NOTE` marks a correct set wrong for being written any
 * other way), which is why `keypadForNotation` gives the tag nothing at all.
 *
 * The exemption is per-template rather than per-tag on purpose. Scoping it to "the
 * `set_builder` notation" would exempt any future set-builder item from an `abs` key
 * whatever its answer said; scoped to the templates, a set-builder answer that grew a real
 * `abs(` would be reported. The sweep below holds each entry to both halves of the reason:
 * a pipe present, and no `abs(` in the key.
 */
const SET_BUILDER_BAR_IS_NOT_A_VALUE_BAR: ReadonlySet<string> = new Set([
  // D3 LIN.6: `{x | 14 <= x <= 24}`, `{x | x <= 5 or x >= 27}`.
  "d3.lin6.set-builder.l3",
  // D5 RAT.5: `{x | x != -4}`, the excluded-value domain.
  "d5.rat5.domain.l1",
  // D8 EL.4: `{x | x > -5}`, `{x | x < -3}`, the domain of a shifted log.
  "d8.el4.domain-shift.l3",
  "d8.el4.domain.l2",
]);

/**
 * The (template, key) pairs the sweep does not require, derived from the two grounds above
 * so that a ground can only ever exempt the ONE key its reasoning is about. A template in
 * `STAR_IS_OPTIONAL` that stops offering a fraction key is still reported.
 */
const NO_KEYS_OWED: ReadonlySet<string> = new Set([
  ...[...STAR_IS_OPTIONAL].map((templateId) => `${templateId}:times`),
  ...[...SET_BUILDER_BAR_IS_NOT_A_VALUE_BAR].map((templateId) => `${templateId}:abs`),
]);

const DECLARED_EXCEPTIONS: readonly string[] = [
  ...STAR_IS_OPTIONAL,
  ...SET_BUILDER_BAR_IS_NOT_A_VALUE_BAR,
];

/** Every (item, key, realization) the keypad could put in front of a learner. */
function* offeredPairs(): Generator<{ item: FrozenItem; key: MathKey; raw: string }> {
  for (const item of SERVED_ITEMS) {
    const symbols = item.answer.allowed_symbols ?? [];
    for (const key of keypadFor(item)) {
      const realize = REALIZATIONS[key.id];
      if (!realize) {
        throw new Error(`key "${key.id}" has no realization to grade`);
      }
      for (const symbol of symbols.length > 0 ? symbols : [undefined]) {
        for (const raw of realize(key, symbol, item)) {
          yield { item, key, raw };
        }
      }
    }
  }
}

describe("the keypad offers only what the grader accepts", () => {
  // Explicitly timed: the population grew from 163 keyed items to 268 when the answer key
  // started selecting the tag, and each new one is a real grade through the real checker. The
  // 20s default is a limit on the machine, not on the claim.
  it("grades every key against every served item that would be offered it", {
    timeout: 120_000,
  }, () => {
    const refused: string[] = [];
    let graded = 0;

    const keyed = new Set<string>();
    for (const { item, key, raw } of offeredPairs()) {
      graded += 1;
      keyed.add(item.item_version_id);
      const outcome = verdict(item, raw);
      if (outcome.startsWith("invalid_input")) {
        refused.push(
          `${item.item_version_id} [${key.id}] ${JSON.stringify(raw)} → ${outcome}`,
        );
      }
    }

    // Without a floor the sweep would pass the day the dispatch stops offering anything,
    // which is exactly the day it stops being a guard. Adding the two missing pools moved
    // neither number's numerator — every D3 and D8 item the key-blind dispatch saw was
    // keyless, which is the whole reason those pools' absence went unnoticed here — and then
    // reading the answer key took the keyed population from 163 items to 268.
    expect(graded, "the sweep graded nothing, so it proves nothing").toBeGreaterThan(400);
    // The population itself, exactly, so a row that silently emptied cannot hide behind a
    // pair count that other keys keep above the floor.
    // 268 at the merge base, then four independent additions: D4's 56 keyed polynomial
    // items, the 8 that came with the shapes closing D1's single-shape cells, the 7 D10
    // brought in when its pool joined `SERVED_ITEMS`, and the 7 the `pi_expression` tag added
    // when `d10.geo2.cylinder-volume-exact.l3` stopped being served behind a bare field. Then
    // 160 more when D9 joined this list, which is the pool that had been shipping since the
    // trigonometry merge without one assertion in this file running over it. Then 21 more from
    // D4's Early Modern graph-reading pool: the three shapes whose answer is a monomial or a
    // factored form carry a caret, and each contributes its canonical slot plus six variants,
    // and 6 from TRG.7's `signed-radian.l2` (TRG.7's other new shape and both of TRG.8's key a
    // whole number or a roster of them, so they reach no key row and are not in this count).
    // Then 10 back OUT, when two D9 shapes were reworked so that their answer was no longer a
    // number the prompt had already printed: `d9.trg3.coordinates.l3` now answers a heading in
    // degrees rather than an exact coordinate, and `d9.trg5.features.l3` a highest or lowest
    // value rather than an amplitude, a period or a midline. A whole number needs no key row, so
    // both left this population with their five served instances each.
    // Then 3 back IN from the TRG.4 / TRG.9 tier rebalance. Both retirements and both new
    // shapes key a bar, so the movement is not a change of kind: `compound-angle.l3` reaches
    // the full retry depth that the radical-keyed shape it replaced could not, its values
    // being rational rather than drawn from a set of two.
    expect(keyed.size, "the keyed population moved").toBe(547);
    // D9's own share, named for the same reason D10's is below: a pool can be spread into
    // `SERVED_ITEMS` and still reach nothing, and this is the line that would say so.
    expect(
      [...keyed].filter((id) => id.startsWith("d9.")).length,
      "D9 is in the population but reaches no key row",
      // The whole of the rebalance's +3: every key row it gained or lost is D9's, which is what
      // a change confined to two D9 nodes should look like from here.
    ).toBe(159);
    // Which templates, by name, because the size alone would be met by any fourteen items and
    // the whole reason D10 is here is that a pool can be spread into this list and reach
    // nothing. `d10.geo1.exact-diagonal.l3` keys `6*sqrt(2)`; `d10.geo2.cylinder-volume-exact.l3`
    // keys `588*pi` and used to be ABSENT from this list — keyless, tagged `none`, behind a bare
    // "Your answer" with no preview — which is the defect the `pi_expression` tag closed. Both
    // D10 templates that carry notation are keyed now, and this line is where that stays true.
    expect(
      [...new Set([...keyed].map((id) => id.split(":")[0] ?? id))]
        .filter((templateId) => templateId.startsWith("d10."))
        .sort(),
      "D10's keyed population changed shape",
    ).toEqual(["d10.geo1.exact-diagonal.l3", "d10.geo2.cylinder-volume-exact.l3"]);
    // The size alone would be met by any eight items, and the eight D1 contributed are a claim
    // worth its own line: `d1.num-f.l3b` (6 items, a reduced fraction like its four NUM.F
    // siblings, so a bar key) and `d1.num-4.l3b` (2 items, the squared-pile branch whose key
    // carries a caret). Both arrived with the shapes that closed D1's single-shape cells, and
    // D1's keyed population is otherwise NUM.F's fractions plus one NUM.3 filler. Scoped to
    // `d1.` so D4's arrival cannot satisfy it.
    expect(
      [...new Set([...keyed].map((id) => id.split(":")[0] ?? id))]
        .filter((templateId) => templateId.startsWith("d1."))
        .sort(),
      "D1's keyed population changed shape",
    ).toEqual([
      "d1.num-3.l1b",
      "d1.num-4.l3b",
      "d1.num-f.l1",
      "d1.num-f.l2",
      "d1.num-f.l2b",
      "d1.num-f.l3",
      "d1.num-f.l3b",
    ]);
    expect(refused.join("\n"), "a key types notation its own item's grader refuses").toBe(
      "",
    );
  });

  /**
   * The control for the sweep above. `invalid_input` has to be REACHABLE on those same
   * items, or "none of them were invalid" would be a statement about the checker rather
   * than about the keys. `√` is the exact character a radical keypad is tempting to add:
   * every lesson visual draws the root as a glyph, and the text checker has no glyph
   * handling at all.
   */
  it("and the glyph no key types is refused by those same items", () => {
    const radical = SERVED_ITEMS.filter((item) =>
      CONSTANT_RADICAL_NOTATIONS.includes(
        answerNotation(
          item.answer.answer_spec,
          item.answer.allowed_symbols,
          item.answer.answer_key,
        ),
      ),
    );
    expect(radical.length, "no radical items to test the control on").toBeGreaterThan(10);

    for (const item of radical) {
      expect(verdict(item, "√2"), item.item_version_id).toBe("invalid_input/parse_error");
      // ... while the spelling the sqrt key types is read on the same item.
      expect(verdict(item, "5*sqrt(2)"), item.item_version_id).not.toContain("invalid");
    }
  });

  it("names nothing outside the checker's own alphabet", () => {
    const seen = new Set<string>();
    for (const item of SERVED_ITEMS) {
      for (const key of keypadFor(item)) {
        seen.add(key.id);
        expect(key.insert, `${key.id} spells itself with non-ASCII`).toMatch(
          /^[a-z()^*/]+$/,
        );
      }
    }
    expect(seen.size, "no notation was examined").toBeGreaterThan(3);
    // Every notation that reaches a learner is graded by the sweep above.
    for (const id of seen) {
      expect(REALIZATIONS[id], `"${id}" is advertised but never graded`).toBeDefined();
    }
  });

  /**
   * The positive half of the rule. The sweep above says nothing a key types is refused;
   * this says the notation the item's own answer key USES has a key for it, so a RAD.4
   * item whose answer is `2*abs(p)*t^3*sqrt(2*t)` cannot end up offering only a root.
   */
  it("offers a key for every notation the item's own answer key uses", () => {
    const short: string[] = [];
    let required = 0;
    let exempt = 0;

    for (const item of SERVED_ITEMS) {
      const answerKey = answerKeyOf(item);
      const ids = new Set(keypadFor(item).map((key) => key.id));
      for (const [pattern, id] of NOTATION_KEY_FOR) {
        if (!pattern.test(answerKey)) {
          continue;
        }
        required += 1;
        if (ids.has(id)) {
          continue;
        }
        if (NO_KEYS_OWED.has(`${item.template_id}:${id}`)) {
          exempt += 1;
          continue;
        }
        short.push(
          `${item.node_id} ${item.template_id} ${item.item_version_id}: key ${JSON.stringify(answerKey)} uses ${id}, keypad has ${[...ids].join("/") || "nothing"}`,
        );
      }
    }

    // Two floors, because the claim below is a containment and a containment over an empty
    // collection is free. Re-measured with D10 in the population: 707 (item, notation) pairs
    // are required across the seven domain pools and the interactive one, of which 225 are
    // declared exempt, leaving 482. The first floor says the sweep looked at something; the
    // second says the two declared grounds have not grown until they swallow the population,
    // which is the way an exception list stops being an exception list and starts being the
    // omission it replaced.
    expect(
      required,
      `no served answer key carries notation at all, so this proves nothing (required=${required} exempt=${exempt})`,
    ).toBeGreaterThan(600);
    expect(
      required - exempt,
      `the declared exceptions now cover the whole population, so nothing is required (required=${required} exempt=${exempt})`,
    ).toBeGreaterThan(400);
    expect(
      short.join("\n"),
      `${required} (item, notation) pairs required a key, ${exempt} declared exempt, ${short.length} short`,
    ).toBe("");
  });

  it("gives every key one accessible name in words, not a glyph", () => {
    const named = new Map<string, string>();
    for (const item of SERVED_ITEMS) {
      for (const key of keypadFor(item)) {
        named.set(key.id, key.label);
      }
    }
    expect(named.size).toBeGreaterThan(3);
    for (const [id, label] of named) {
      expect(label, `${id} is not named as an action`).toMatch(/^insert /);
      // A name a screen reader can only read as punctuation is not a name.
      expect(label, `${id} reads out a glyph`).toMatch(/^[a-z ]+$/);
    }
    expect(named.get("fraction")).toBe("insert a fraction");
  });
});

/**
 * The exceptions to the sweep above, kept honest in both directions.
 *
 * A surface that does not owe a key and a surface that forgot one look identical from
 * outside the guard, and quietly leaving the first out of the population is how the second
 * ships — which is exactly what the deleted `keys.length === 0` skip was doing to every
 * keyless item in the bank. So each ground is a named list, and each list is held to three
 * things: the entry still describes a served template, the entry has not been overtaken by
 * the tree, and the REASON still holds. The third is the one that makes an exemption
 * provable rather than decorative: force one entry false and the sweep fails at the item it
 * was excusing.
 */
describe("the exceptions to the notation sweep are declared, not omitted", () => {
  it("nothing is claimed under both grounds", () => {
    expect(
      [...STAR_IS_OPTIONAL].filter((id) => SET_BUILDER_BAR_IS_NOT_A_VALUE_BAR.has(id)),
    ).toEqual([]);
    expect(DECLARED_EXCEPTIONS.length).toBe(
      STAR_IS_OPTIONAL.size + SET_BUILDER_BAR_IS_NOT_A_VALUE_BAR.size,
    );
    // And the derived pair set is one entry per (template, key), not per template, so a
    // ground cannot be widened into a blanket exemption by editing the list alone.
    expect(NO_KEYS_OWED.size).toBe(DECLARED_EXCEPTIONS.length);
  });

  it.each(DECLARED_EXCEPTIONS)("%s is still a served template", (templateId) => {
    // A renamed or retired template would otherwise sit in a list forever, exempting
    // nothing and hiding the fact that it exempts nothing.
    expect(
      SERVED_ITEMS.filter((item) => item.template_id === templateId).length,
      "a declared exception serves no item",
    ).toBeGreaterThan(0);
  });

  it.each([...STAR_IS_OPTIONAL])(
    "%s still keys a product with a star, and still gets no times key",
    (templateId) => {
      const items = SERVED_ITEMS.filter((item) => item.template_id === templateId);
      const starred = items.filter((item) => answerKeyOf(item).includes("*"));
      // Direction one: an entry whose keys stopped carrying a star excuses nothing.
      expect(
        starred.length,
        "no served instance carries a star, so this entry exempts nothing",
      ).toBeGreaterThan(0);
      // Direction two: an entry that has been given the key it was excused from has to
      // leave the list, or the list stops describing the tree and starts excusing it.
      for (const item of items) {
        expect(
          keypadFor(item).map((key) => key.id),
          `${item.item_version_id} now offers a times key and is still declared exempt`,
        ).not.toContain("times");
      }
    },
  );

  it.each([...STAR_IS_OPTIONAL])(
    "%s grades every served instance with the star removed",
    (templateId) => {
      // THE REASON, measured rather than argued, on every instance rather than a sample:
      // the star is a spelling of the answer key and not notation the learner must produce,
      // because the item's own grader reads the product without it. `d5.rat3.unlike.l2` and
      // `d8.el5.condense-sum.l2` are the templates this fails for, which is why they are not
      // in the list.
      const items = SERVED_ITEMS.filter((item) => item.template_id === templateId);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        const starless = answerKeyOf(item).replace(/\s*\*\s*/g, "");
        expect(
          verdict(item, starless),
          `${item.item_version_id}: ${JSON.stringify(starless)} is not read as the product ${JSON.stringify(answerKeyOf(item))} is`,
        ).toBe("correct/match");
      }
    },
  );

  it.each([...SET_BUILDER_BAR_IS_NOT_A_VALUE_BAR])(
    "%s writes a such-that bar and no absolute value, and still gets no abs key",
    (templateId) => {
      const items = SERVED_ITEMS.filter((item) => item.template_id === templateId);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        const answerKey = answerKeyOf(item);
        // Direction one plus the reason: the pipe is still there (so the entry is still
        // doing work), it is still a separator rather than a bar, and the answer is still
        // graded on its set-builder FORM, which is why no key may type any of it.
        expect(answerKey, item.item_version_id).toContain("|");
        expect(
          answerKey,
          `${item.item_version_id} now carries a real absolute value`,
        ).not.toContain("abs(");
        expect(
          answerNotation(
            item.answer.answer_spec,
            item.answer.allowed_symbols,
            item.answer.answer_key,
          ),
          `${item.item_version_id} is no longer graded on set-builder form`,
        ).toBe("set_builder");
        // Direction two.
        expect(
          keypadFor(item).map((key) => key.id),
          `${item.item_version_id} now offers an abs key and is still declared exempt`,
        ).not.toContain("abs");
      }
    },
  );

  /**
   * And the floor under the lists themselves. Both grounds are template-scoped, so the way
   * they go wrong is by growing: 30 entries is already a quarter of the text templates in
   * the bank, and a list that reached every template would leave the sweep asserting
   * nothing while still reading as a guard.
   */
  it("the declared exceptions are a minority of the templates the sweep covers", () => {
    const templatesWithNotation = new Set(
      SERVED_ITEMS.filter((item) =>
        NOTATION_KEY_FOR.some(([pattern]) => pattern.test(answerKeyOf(item))),
      ).map((item) => item.template_id),
    );
    expect(templatesWithNotation.size).toBeGreaterThan(DECLARED_EXCEPTIONS.length);
  });
});

describe("the keypad and the placeholder read one dispatch", () => {
  /**
   * The placeholders that name character-level notation the item's own grader REQUIRES, and
   * nothing else.
   *
   * `RATIONAL_POLYNOMIAL_PLACEHOLDER` is deliberately absent even though its example carries a
   * `*`, and that is the "requires" doing the work rather than a convenience: on all 35 of the
   * 56 polynomial-keyed D5 items whose key is starred, re-grading the key with every `*` REMOVED
   * returns `correct` through the same versioned checker (0 of 35 load-bearing, against a
   * control where all 56 canonical keys grade correct). So the star there is a spelling, the
   * rest of the line is parentheses and a plus, and no key is owed — which is the same test
   * `IMPLICIT_PRODUCT_PLACEHOLDER` passes the other way and is why that one IS listed here.
   */
  const NOTATION_PLACEHOLDERS: readonly string[] = [
    POSITIVE_EXPONENT_PLACEHOLDER,
    RADICAL_PLACEHOLDER,
    RADICAL_QUOTIENT_PLACEHOLDER,
    RADICAL_SUM_PLACEHOLDER,
    VARIABLE_RADICAL_PLACEHOLDER,
    REDUCED_FRACTION_PLACEHOLDER,
    FRACTION_PLACEHOLDER,
    FRACTION_BAR_PLACEHOLDER,
    SOLUTION_SET_FRACTION_PLACEHOLDER,
    EXPONENT_NOTATION_PLACEHOLDER,
    IMPLICIT_PRODUCT_PLACEHOLDER,
    // Its literal example is `13*pi`, so it names the spelling the checker requires — and the
    // "requires" is the strictest it gets anywhere in this list: the glyph the prompt draws is
    // `invalid_input / unknown_symbol`, so there is no other way to write the answer at all.
    PI_EXPRESSION_PLACEHOLDER,
    // The other half of the pi split, and D9's two lines. All three arrive in this list together
    // because all three were absent for the same reason: D9 was not in `SERVED_ITEMS`, so the
    // sweep below never met a radian or an exact-value item and nobody noticed the lines were
    // unlisted. Each names notation its own grader requires — a spelled pi and a bar, a root and
    // a bar — on the strictest reading of "requires" this list uses.
    PI_FRACTION_PLACEHOLDER,
    EXACT_RADIAN_PLACEHOLDER,
    EXACT_TRIG_VALUE_PLACEHOLDER,
    // D4's polynomial answers. `x^2 + 13x + 6` and `(x + 7)^2` cannot be typed without the
    // caret, and neither `is_standard_polynomial` nor `fully_factored_over_integers` is a
    // simplification profile, so nothing but the key itself could have named it.
    EXPONENT_NOTATION_PLACEHOLDER,
    // Its literal example is `(x+3)/(x+2)`, so it names the bar — and it is now shown to
    // exactly the 84 of the 140 whose own key carries one.
    RATIONAL_EXPRESSION_PLACEHOLDER,
  ];

  /**
   * What reading the ANSWER KEY is allowed to do, and the one thing it is not.
   *
   * Two cohorts now come from the key rather than from the spec. Splitting
   * `constant_radical` into three tags moved 20 PLACEHOLDERS and no key row, and that was the
   * whole claim while it was the only key-derived tag: an item's row of keys could not depend
   * on its key at all, so no item could lose one. Five more tags are keyed off the answer
   * (see `answerFormat.test.ts`'s "the dispatch reads the notation an answer key is written
   * in"), and for them a moved key row is the POINT — 105 items had a bare field over an
   * answer carrying a `/`, a `^` or a load-bearing `*`.
   *
   * So the invariant is restated as what it always meant rather than dropped: **no item loses
   * a key.** Every key the key-blind dispatch offered is still offered by the key-aware one,
   * on every served item, which is the regression the old wording was buying. On top of that
   * both moved cohorts are pinned by count AND by named `template_id`, so neither number can
   * be met by unrelated items, and any item that gains a row outside those templates is
   * reported by name.
   */
  it("gains 163 key rows and 183 placeholders, and takes no key away", () => {
    const keysLost: string[] = [];
    const keysGained: string[] = [];
    const placeholdersMoved: string[] = [];

    for (const item of SERVED_ITEMS) {
      const before = answerKeypad(item.answer.answer_spec, item.answer.allowed_symbols);
      const after = keypadFor(item);
      const afterIds = new Set(after.map((key) => key.id));
      // The regression the old "not one key" wording was there to catch, stated directly.
      const lost = before.filter((key) => !afterIds.has(key.id));
      if (lost.length > 0) {
        keysLost.push(
          `${item.item_version_id}: ${before.map((k) => k.id).join("/")} -> ${after.map((k) => k.id).join("/") || "nothing"}`,
        );
      }
      if (after.length !== before.length) {
        keysGained.push(
          `${item.item_version_id}: ${before.map((k) => k.id).join("/") || "nothing"} -> ${after.map((k) => k.id).join("/")}`,
        );
      }
      const wasShown = practicePlaceholder(
        item.answer.answer_spec,
        item.answer.allowed_symbols,
      );
      if (wasShown !== placeholderFor(item)) {
        placeholdersMoved.push(item.item_version_id);
      }
    }

    expect(
      keysLost.join("\n"),
      "reading the key took a key away from an item whose notation needs did not change",
    ).toBe("");

    // The gained cohort: the measured inventory this file reported while it was red, plus the
    // 7 the `pi_expression` tag added, plus 87 from D9 joining the population, plus 21 from D4's
    // Early Modern graph-reading shapes, whose monomial and factored keys carry a caret, less
    // the seven `d9.trg3.coordinates.l3` instances that stopped keying an exact coordinate when
    // that shape was reworked to answer a heading in whole degrees. TRG.7's `signed-radian.l2`
    // is not here: its tag is read off `allowed_symbols`, so reading the key gains it nothing.
    //
    // Plus 3 net from the TRG.4 / TRG.9 tier rebalance. Both retired shapes were in this cohort
    // and both replacements are too, so the movement is not a change of kind: it is that
    // `compound-angle.l3` reaches the full retry depth its radical-keyed predecessor could not,
    // its values being rational rather than drawn from a two-radical set.
    expect(keysGained.length, "reading the key gained no key row at all").toBe(295);
    expect([...new Set(keysGained.map((id) => id.split(":")[0]))].sort()).toEqual([
      // NUM.4's `6*x^2 + 16`, whose caret no simplification profile speaks for. Only the
      // squared-pile branch of this template is here; its linear draws gain nothing, which is
      // why it contributes 2 of the total and not the template's full 7 served instances.
      "d1.num-4.l3b",
      // `588*pi`, whose pi is a name the keyboard has and the card never spells. It sorts here
      // rather than after D8 because `d10.` is lexically below `d2.`.
      "d10.geo2.cylinder-volume-exact.l3",
      // A plain numeric evaluating to a fraction, and a level-flight rate keyed `4/3`.
      "d2.rad3.negeval.l3",
      // D4's caret-carrying polynomial keys, across three of the Classical era's five nodes and
      // both of Early Modern's two. The three Early Modern shapes key a single monomial or a
      // factored form rather than a polynomial in written form, so their caret is the only thing
      // that could name their notation at all.
      "d4.pol1.binomial.l2",
      "d4.pol1.combine.l1",
      "d4.pol1.leading.l3",
      "d4.pol1.subtract.l2",
      "d4.pol2.grouping.l3",
      // The formula shape, whose roster holds a fraction.
      "d4.pol4.formula.l3",
      "d4.pol6.leading-term-factored.l2",
      "d4.pol6.product-leading-term.l3",
      "d4.pol7.build-from-graph.l3",
      "d4.pol8.missing-power.l3",
      "d4.pol8.synthetic-cubic.l2",
      "d5.rat1.monomial.l1",
      "d5.rat1.partial-cancel.l3",
      "d5.rat3.factorlcd.l3",
      "d5.rat3.numerator.l2",
      "d5.rat3.samedenom.l1",
      "d5.rat3.subtract.l3",
      "d5.rat3.unlike.l2",
      "d5.rat4.clear.l2",
      "d5.rat4.divisor-top.l2",
      "d5.rat4.mixture-divisor.l3",
      "d5.rat4.nested-sum.l3",
      "d5.rat4.stack.l1",
      "d5.rat5.level.l2",
      // The solution set with a fraction inside the roster.
      "d5.rat6.rate.l2",
      // D6, whose pool joined `SERVED_ITEMS` above. Three templates and 21 items, all of them
      // carets: FUN.6's numerator shape and FUN.7's two squared ones. FUN.8 is absent on
      // purpose — its linear keys carry no caret, and they are the reason this pool's absence
      // was worth finding, since they were shipping `4*x + 6` against a keypad with no times
      // key for as long as nothing here swept them.
      "d6.fun6.numerator.l2",
      "d6.fun7.square-inner.l3",
      "d6.fun7.square-outer.l3",
      // `log(m*a*q)`, where the star cannot be dropped.
      "d8.el5.condense-sum.l2",
      // D9, on both halves of its key-read split. The ratio and exact-value templates key a bar
      // (`4/3`, `-1/2`) that no simplification profile speaks for, and the six exact-value ones
      // key a root as well; the radian templates are absent from this list because their tag is
      // read off `allowed_symbols` rather than the key, so reading the key gains them nothing.
      "d9.trg2.ratio-from-sides.l1",
      "d9.trg2.special-exact.l2",
      "d9.trg3.exact-value-circle.l3",
      "d9.trg4.compound-evaluate.l3",
      "d9.trg4.pythagorean-solve.l3",
      "d9.trg4.quotient-value.l2",
      "d9.trg4.reciprocal-value.l1",
      "d9.trg6.reciprocal-exact.l3",
      "d9.trg9.compound-angle.l3",
      "d9.trg9.double-cosine.l3",
      "d9.trg9.double-sine.l2",
      "d9.trg9.sum-exact.l1",
    ]);

    // The placeholder cohort: the original 20 radicals, the four families above whose line
    // changed for the same reason their keys did, the 84 D5 quotient-keyed items, which the
    // key-blind dispatch sends to the polynomial line because a missing key carries no bar,
    // D9's 87, D6's 21 when its pool joined `SERVED_ITEMS`, and D4's 21 from the Early Modern
    // graph-reading shapes. Each of those two domains moves by exactly the number of key rows it
    // gains, which is the shape of this whole change: one reading of the key decides the row and
    // the line together.
    // Less `d9.trg3.coordinates.l3`'s seven, which move back to the bare line now that the shape
    // answers a heading in whole degrees. It moves by the same seven as the key-row cohort above,
    // which is the same point again: one reading of the key decides the row and the line.
    // Plus the same 3 the key-row cohort gains from the tier rebalance, which is this whole
    // change's shape restated once more: one reading of the key decides the row and the line
    // together, so a template entering one cohort enters the other by the same count.
    expect(placeholdersMoved.length, "reading the key moved no placeholder at all").toBe(
      315,
    );
    expect([...new Set(placeholdersMoved.map((id) => id.split(":")[0]))].sort()).toEqual([
      // The same two NUM.4 squared-pile draws that gain the caret key: one reading of the key
      // decides the line and the row together, which is the shape of this whole change.
      "d1.num-4.l3b",
      // The pi cohort is in both lists for the same reason: one reading of the key decides the
      // line and the row together.
      "d10.geo2.cylinder-volume-exact.l3",
      "d2.rad1.quotient.l2",
      "d2.rad2.rationalize-unit.l2",
      "d2.rad2.unlike.l2",
      "d2.rad3.negeval.l3",
      // The same eleven D4 templates: on this pool one reading of the key decides both, because
      // a form requirement says nothing about notation and a bar in a roster says everything.
      "d4.pol1.binomial.l2",
      "d4.pol1.combine.l1",
      "d4.pol1.leading.l3",
      "d4.pol1.subtract.l2",
      "d4.pol2.grouping.l3",
      "d4.pol4.formula.l3",
      "d4.pol6.leading-term-factored.l2",
      "d4.pol6.product-leading-term.l3",
      "d4.pol7.build-from-graph.l3",
      "d4.pol8.missing-power.l3",
      "d4.pol8.synthetic-cubic.l2",
      // The twelve D5 templates keyed with a bar. They are the same twelve that gain a key row
      // above, which is the whole shape of the change: one reading of the key decides both.
      "d5.rat1.monomial.l1",
      "d5.rat1.partial-cancel.l3",
      "d5.rat3.factorlcd.l3",
      "d5.rat3.numerator.l2",
      "d5.rat3.samedenom.l1",
      "d5.rat3.subtract.l3",
      "d5.rat3.unlike.l2",
      "d5.rat4.clear.l2",
      "d5.rat4.divisor-top.l2",
      "d5.rat4.mixture-divisor.l3",
      "d5.rat4.nested-sum.l3",
      "d5.rat4.stack.l1",
      "d5.rat5.level.l2",
      "d5.rat6.rate.l2",
      // D6, whose pool joined `SERVED_ITEMS` above: the same three caret templates that gain
      // a key row, moving here for the same single reading of the key.
      "d6.fun6.numerator.l2",
      "d6.fun7.square-inner.l3",
      "d6.fun7.square-outer.l3",
      "d8.el5.condense-sum.l2",
      // The same twelve D9 templates that gain a key row, for the same reason.
      "d9.trg2.ratio-from-sides.l1",
      "d9.trg2.special-exact.l2",
      "d9.trg3.exact-value-circle.l3",
      "d9.trg4.compound-evaluate.l3",
      "d9.trg4.pythagorean-solve.l3",
      "d9.trg4.quotient-value.l2",
      "d9.trg4.reciprocal-value.l1",
      "d9.trg6.reciprocal-exact.l3",
      "d9.trg9.compound-angle.l3",
      "d9.trg9.double-cosine.l3",
      "d9.trg9.double-sine.l2",
      "d9.trg9.sum-exact.l1",
    ]);
    // The 84 D5 quotient-keyed items are now in BOTH cohorts, and that is the sharpest thing
    // here. It used to be the opposite: their keys were key-derived while their line was the
    // field's one hard-coded string, so this assertion required that none of their placeholders
    // move. The field asks the dispatch now, so a `d5.rat3.*` item whose placeholder did NOT
    // move would be one still being shown a bar chosen without reading its key.
    expect(
      placeholdersMoved.filter((id) => id.startsWith("d5.rat3.")).length,
      "a D5 quotient item's line is not key-derived",
    ).toBeGreaterThan(0);
  });

  /**
   * NO exemption, and the absence is the point.
   *
   * The D5 two-field surface used to need one: it showed `RATIONAL_EXPRESSION_PLACEHOLDER` to
   * all 140 of its items, so the 56 keyed as polynomials met a line naming a bar their answer
   * must not contain, and no key row to go with it. The exemption named that as a fact about
   * the SURFACE — one field, one line, a per-item dispatch — and held it to its reason in both
   * directions, which was honest and was still an exemption.
   *
   * It is discharged rather than reworded: the field asks `practicePlaceholder` per item like
   * every other surface, the bar in the key picks the line as well as the row, and the sweep
   * below now runs over every served item with nothing skipped.
   */
  it("offers keys exactly where the placeholder names notation, on every served item", () => {
    const disagreements: string[] = [];
    let withKeys = 0;
    let withoutKeys = 0;

    for (const item of SERVED_ITEMS) {
      const keys = keypadFor(item);
      const namesNotation = NOTATION_PLACEHOLDERS.includes(placeholderFor(item));
      if (keys.length > 0) {
        withKeys += 1;
      } else {
        withoutKeys += 1;
      }
      if (keys.length > 0 !== namesNotation) {
        disagreements.push(
          `${item.item_version_id}: ${keys.length} keys, placeholder ${JSON.stringify(placeholderFor(item))}`,
        );
      }
    }

    // Both directions have to be populated or the agreement is trivially true.
    expect(withKeys, "no item gets a keypad").toBeGreaterThan(100);
    expect(withoutKeys, "every item gets a keypad").toBeGreaterThan(100);
    expect(disagreements.join("\n")).toBe("");
  });

  /**
   * The D5 pool split by the bar in its own key, line and row asserted TOGETHER.
   *
   * This is what replaced the exemption, and it is the stronger claim: not "the 56 are excused
   * from agreeing" but "the 56 show a different line from the 84, and it is the bar in their own
   * key that decides which". Both directions fail — a polynomial-keyed item that grows a bar,
   * and a quotient-keyed item that loses one — and the composition is asserted beside the
   * counts, so the pool cannot drift to 140 of one cohort and still pass.
   */
  it("splits the D5 pool by the bar in its own key, in the line and the row alike", () => {
    const pool = SERVED_ITEMS.filter(
      (item) => item.answer.answer_spec.answer_type === "rational_answer",
    );
    expect(pool.length, "the D5 two-field pool is not served").toBe(140);

    for (const item of pool) {
      const polynomial = notationFor(item) === "rational_expression";
      expect(answerKeyOf(item).includes("/"), item.item_version_id).toBe(!polynomial);
      expect(keypadFor(item).length > 0, item.item_version_id).toBe(!polynomial);
      expect(placeholderFor(item), item.item_version_id).toBe(
        polynomial ? RATIONAL_POLYNOMIAL_PLACEHOLDER : RATIONAL_EXPRESSION_PLACEHOLDER,
      );
    }

    const polynomialCount = pool.filter(
      (item) => notationFor(item) === "rational_expression",
    ).length;
    expect(polynomialCount, "the cohort that must NOT be shown a bar").toBe(56);
    expect(pool.length - polynomialCount, "the §3.3 cohort").toBe(84);
    // Neither line may be the only one the pool shows.
    expect(new Set(pool.map(placeholderFor)).size, "one line still covers the pool").toBe(
      2,
    );
  });

  /**
   * The item in the reported screenshot's family, named rather than swept: EXP.1's whole
   * difficulty is that `^` and `/` are the two characters nothing on screen mentions.
   */
  it("gives an EXP.1 item exactly the caret and the bar", () => {
    const exp1 = SERVED_ITEMS.filter(
      (item) => item.answer.answer_spec.simplification === "positive_exponents",
    );
    expect(exp1.length).toBeGreaterThan(10);

    for (const item of exp1) {
      expect(
        keypadFor(item).map((key) => key.insert),
        item.item_version_id,
      ).toEqual(["^", "/"]);
      expect(placeholderFor(item)).toBe(POSITIVE_EXPONENT_PLACEHOLDER);
    }
  });

  /**
   * The other direction, which matters just as much: 60 of the 99 text templates key as
   * plain numbers, coordinate pairs, solution rosters and single words, and a keypad on
   * those is pure clutter over an answer that has no notation in it.
   *
   * The population is the tag the SURFACES compute, answer key included. It used to be the
   * key-blind tag, which was the same set while nothing but a radical read the key and is not
   * any more: `{8/3}` is a solution set whose roster holds a bar and `1/32` is a plain numeric
   * whose value is a fraction, so a key-blind population would put both here and assert they
   * get nothing — the exact defect this file went red on. Each of them has its own tag and its
   * own row below, and the count floors are what stop this cohort quietly emptying into them.
   */
  it.each([
    ["multiple_choice", MULTIPLE_CHOICE_PLACEHOLDER, 20],
    ["point", POINT_PLACEHOLDER, 20],
    ["solution_set", SOLUTION_SET_PLACEHOLDER, 80],
    ["set_builder", SET_BUILDER_PLACEHOLDER, 20],
    ["interval", INTERVAL_PLACEHOLDER, 20],
    ["none", GENERIC_PLACEHOLDER, 300],
  ] as const)("offers nothing to a %s answer", (notation, placeholder, floor) => {
    const items = SERVED_ITEMS.filter((item) => notationFor(item) === notation);
    expect(items.length, `no ${notation} items served`).toBeGreaterThan(floor);

    for (const item of items) {
      expect(keypadFor(item), item.item_version_id).toEqual([]);
      expect(placeholderFor(item), item.item_version_id).toBe(placeholder);
    }
  });

  /**
   * And the five key-derived tags, each with the exact row its cohort gets and the templates
   * that cohort is. These are the 121 (item, key) pairs this file reported while it was red,
   * so a row that silently emptied would fail here as well as in the sweep above.
   *
   * `d5.rat5.level.l2` is the reason the counts are per ITEM: six of its seven instances are
   * keyed `0` or `3` and get nothing, and the seventh is keyed `4/3`.
   */
  it.each([
    [
      "fraction_bar",
      ["/"],
      69,
      [
        "d2.rad3.negeval.l3",
        "d5.rat5.level.l2",
        // D9's ten. A trigonometric ratio off a triangle or the unit circle is a bare numeric
        // whose value happens to be a fraction, which is the same shape as RAD.3's negative
        // exponents and reaches this tag by the same rule. `coordinates.l3` was one of them
        // until its shape was reworked to answer a heading in whole degrees.
        //
        // `compound-angle.l3` is the newest and the one that says most about the tag: it
        // combines two Pythagorean triples through a sum or difference formula, so it lives on
        // the node whose OTHER combining shapes are the bank's only radical keys, and still
        // answers with a plain bar. Which tag a trigonometric item takes is decided by the
        // arithmetic of its particular values, not by the identity it is about.
        "d9.trg2.ratio-from-sides.l1",
        "d9.trg2.special-exact.l2",
        "d9.trg3.exact-value-circle.l3",
        "d9.trg4.compound-evaluate.l3",
        "d9.trg4.pythagorean-solve.l3",
        "d9.trg4.quotient-value.l2",
        "d9.trg4.reciprocal-value.l1",
        "d9.trg9.compound-angle.l3",
        "d9.trg9.double-cosine.l3",
        "d9.trg9.double-sine.l2",
      ],
    ],
    // D9's two trigonometric tags, in this table for the first time: they shipped with the
    // trigonometry merge and no row of this file ran over them until D9 joined `SERVED_ITEMS`.
    // The radian row is `pi` AND `/` — it was the bar alone, which left 66 items one key short
    // of the two characters their own placeholder names. `signed-radian.l2` then added 6, and it
    // is the first radian shape in the bank whose key can carry a MINUS sign: arccosine's range
    // is `[0, pi]`, so the shape that used to be the only one here could not produce one.
    [
      "exact_radian",
      ["pi", "/"],
      69,
      [
        "d9.trg1.arc-length.l3",
        "d9.trg1.coterminal-radian.l3",
        "d9.trg1.deg-to-rad.l1",
        "d9.trg3.reference-radian.l2",
        // `d9.trg5.features.l3` was a tenth until it stopped asking for the period. The period
        // is still asked on that node, by `period-radian.l2`, which is the row below.
        "d9.trg5.period-radian.l2",
        "d9.trg5.phase-shift.l3",
        "d9.trg6.asymptote-radian.l3",
        "d9.trg6.tangent-period.l1",
        "d9.trg7.arccos-radian.l2",
        "d9.trg7.signed-radian.l2",
      ],
    ],
    [
      "exact_trig_value",
      ["sqrt()", "/"],
      // 22, down from 27 with the retirement of `d9.trg9.difference-exact.l2`, which took the
      // five items it served out of the tag. Nothing replaced it here: the L3 authored in its
      // place answers with a plain fraction and sits on the `fraction_bar` row above, so this
      // tag now rests on `sum-exact.l1` alone for the sum-and-difference family.
      22,
      [
        "d9.trg2.special-exact.l2",
        "d9.trg3.exact-value-circle.l3",
        "d9.trg6.reciprocal-exact.l3",
        "d9.trg9.sum-exact.l1",
      ],
    ],
    ["solution_set_fraction", ["/"], 13, ["d4.pol4.formula.l3", "d5.rat6.rate.l2"]],
    // A caret with no simplification profile to name it, from three domains: D4's polynomial
    // answers (70 items across ten templates, three of them the Early Modern graph-reading
    // shapes whose key is a single monomial or a factored form), NUM.4's `6*x^2 + 16` (2), and
    // D6's 21 when its pool joined `SERVED_ITEMS`. D1's share is per ITEM for the same reason as
    // `d5.rat5.level.l2` above: only that template's squared-pile branch keys a caret, so 2 of
    // its 7 served instances are here and the other 5 sit in the `none` cohort with no keys.
    [
      "exponent_notation",
      ["^"],
      93,
      [
        "d1.num-4.l3b",
        "d4.pol1.binomial.l2",
        "d4.pol1.combine.l1",
        "d4.pol1.leading.l3",
        "d4.pol1.subtract.l2",
        "d4.pol2.grouping.l3",
        "d4.pol6.leading-term-factored.l2",
        "d4.pol6.product-leading-term.l3",
        "d4.pol7.build-from-graph.l3",
        "d4.pol8.missing-power.l3",
        "d4.pol8.synthetic-cubic.l2",
        "d6.fun6.numerator.l2",
        "d6.fun7.square-inner.l3",
        "d6.fun7.square-outer.l3",
      ],
    ],
    ["implicit_product", ["*"], 7, ["d8.el5.condense-sum.l2"]],
    // The pi cohort: one template, all seven of its served instances, one key. The row is a
    // single key and that is asserted rather than merely counted, because "at least one key,
    // so the preview renders" was the reproduction's bar and it would be met by any row at
    // all — including a times key this template is declared exempt from three blocks above.
    ["pi_expression", ["pi"], 7, ["d10.geo2.cylinder-volume-exact.l3"]],
    ["rational_quotient_power", ["^", "/"], 2, ["d5.rat1.monomial.l1"]],
    [
      "rational_quotient_product",
      ["/", "*"],
      14,
      ["d5.rat3.factorlcd.l3", "d5.rat3.unlike.l2"],
    ],
    [
      "rational_quotient",
      ["/"],
      68,
      [
        "d5.rat1.monomial.l1",
        "d5.rat1.partial-cancel.l3",
        "d5.rat3.numerator.l2",
        "d5.rat3.samedenom.l1",
        "d5.rat3.subtract.l3",
        "d5.rat4.clear.l2",
        "d5.rat4.divisor-top.l2",
        "d5.rat4.mixture-divisor.l3",
        "d5.rat4.nested-sum.l3",
        "d5.rat4.stack.l1",
      ],
    ],
  ] as const)("gives a %s answer exactly %s", (notation, inserts, count, templates) => {
    const items = SERVED_ITEMS.filter((item) => notationFor(item) === notation);
    expect(items.length, `no ${notation} item is served`).toBe(count);
    expect([...new Set(items.map((item) => item.template_id))].sort()).toEqual(
      [...templates].sort(),
    );
    for (const item of items) {
      expect(
        keypadFor(item).map((key) => key.insert),
        item.item_version_id,
      ).toEqual([...inserts]);
    }
  });

  /**
   * REPRODUCTION for the pi dispatch defect. Written before the fix and red at `c31e2fde`.
   *
   * The population is every served item whose own answer key is written in terms of pi,
   * derived from the keys rather than from a template id, so a second such item cannot
   * arrive outside the guard.
   */
  describe("an answer written in terms of pi", () => {
    const PI_ITEMS = SERVED_ITEMS.filter((item) =>
      /(^|[^a-z])pi([^a-z]|$)/i.test(answerKeyOf(item)),
    );

    it("is served at all, or the two claims below have no subject", () => {
      expect(PI_ITEMS.length, "no served answer key is written in pi").toBeGreaterThan(0);
    });

    it("gets a key row, so the field draws a preview at all", () => {
      for (const item of PI_ITEMS) {
        expect(
          keypadFor(item).map((key) => key.id),
          `${item.item_version_id}: key ${JSON.stringify(answerKeyOf(item))} gets no key row, so MathAnswerColumn hands back the bare field and there is no live preview`,
        ).not.toEqual([]);
      }
    });

    it("is told how pi is spelled, rather than shown the generic line", () => {
      for (const item of PI_ITEMS) {
        expect(
          placeholderFor(item),
          `${item.item_version_id}: key ${JSON.stringify(answerKeyOf(item))} is advertised the generic placeholder, which names none of the notation it requires`,
        ).not.toBe(GENERIC_PLACEHOLDER);
      }
    });

    /**
     * WHAT THE LEARNER MUST TYPE DID NOT CHANGE, graded rather than asserted.
     *
     * This is the property the GEO.2 widget copy and the item's own prompt both depend on:
     * a sibling lane rewrote `GeoCisternPlay.tsx` to tell the learner to type the full
     * `588*pi` form, and the prompt says "Write pi as pi, for example 3*pi". A dispatch fix
     * has no business moving the answer, so both spellings are re-graded here through the
     * same versioned checker the surface grades with, and the glyph the learner would reach
     * for instead is confirmed still outside the grammar — which is the whole reason the
     * spelling has to be advertised.
     */
    it("grades the same strings it graded before the tag existed", () => {
      for (const item of PI_ITEMS) {
        const key = answerKeyOf(item);
        expect(verdict(item, key), `${key} is no longer the answer`).toBe("correct/match");
        expect(
          verdict(item, key.replace(/\s*\*\s*/g, "")),
          `${key} starless is no longer read as the same product`,
        ).toBe("correct/match");
        expect(verdict(item, key.replace("*", " * ")), `${key} spaced`).toBe(
          "correct/match",
        );
        // The glyph the prompt DRAWS is still not a thing the learner can type, which is
        // what the pi key and its placeholder exist to say before the first attempt.
        expect(
          verdict(item, key.replace("pi", "\u03c0")),
          "the glyph became gradable",
        ).toBe("invalid_input/unknown_symbol");
      }
    });
  });

  /**
   * A word answer is the sharpest case in the note: 21 served items across 3 templates
   * key as `increasing`, `decreasing`, `parallel`, `no solution`. Nothing about those
   * wants a square root.
   */
  it("offers nothing to the item whose answer is the word 'decreasing'", () => {
    const decreasing = SERVED_ITEMS.filter(
      (item) => (item.answer as { answer_key?: string }).answer_key === "decreasing",
    );
    expect(decreasing.length).toBeGreaterThan(0);
    for (const item of decreasing) {
      expect(keypadFor(item)).toEqual([]);
    }
  });
});

/**
 * The check-your-understanding card, which is the surface the reported screenshot was
 * taken on and the one where the keypad has the most to say. Its grader is different — a
 * form-dependent CFU is an exact match against a hand-authored list, with no checker
 * consulted at all — so "only offer what the grader accepts" has to be evidenced
 * differently: what must be true is that the pack's own canonical accepted answer can be
 * TYPED from the keys the card offers.
 */
describe("the check-your-understanding card reads the same dispatch", () => {
  const cfus = allLessons.flatMap((lesson) =>
    lesson.cfu ? [{ nodeId: lesson.node_id, cfu: lesson.cfu }] : [],
  );

  /** The CFUs that offer a row of keys, derived from the dispatch rather than written down. */
  const KEYED_CFUS = cfus.filter(
    ({ cfu }) => cfuKeypad(cfu.check, cfu.accepted).length > 0,
  );

  /**
   * The CFU answers that genuinely do not owe a key for the notation they carry.
   *
   * EMPTY, and the emptiness is derived rather than asserted. The practice sweep exempts on
   * exactly two grounds — a `|` that is a set-builder "such that" bar, and a `*` the grader
   * reads as optional — and the census below shows that no CFU in the tree qualifies under
   * either: none is graded as a set-builder condition, and the one whose canonical answer
   * carries a star (RAD.1's `6*sqrt(2)/5`) is offered a times key already. So an empty list
   * here is a measured fact about the packs, and the day a CFU adopts either shape the
   * census fails rather than this file quietly wanting an entry.
   */
  const NO_CFU_KEYS_OWED: ReadonlySet<string> = new Set();

  it("covers every authored pack", () => {
    expect(cfus.length).toBeGreaterThan(15);
  });

  it("no CFU qualifies under either ground the practice sweep exempts on", () => {
    expect(cfus.length, "no CFUs to census").toBeGreaterThan(15);
    // Ground one: a set-builder condition, whose pipe is a separator and not a bar.
    expect(
      cfus
        .filter(({ cfu }) => cfuNotation(cfu.check, cfu.accepted) === "set_builder")
        .map(({ nodeId }) => nodeId),
      "a CFU is now graded on set-builder form, so the pipe ground has a CFU instance",
    ).toEqual([]);
    // Ground two: a star in the canonical answer with no times key under the field.
    expect(
      cfus
        .filter(({ cfu }) => {
          const ids = new Set(cfuKeypad(cfu.check, cfu.accepted).map((key) => key.id));
          return (cfu.accepted[0] ?? "").includes("*") && !ids.has("times");
        })
        .map(({ nodeId }) => nodeId),
      "a CFU is short a times key, so the star ground has a CFU instance to judge",
    ).toEqual([]);
    expect([...NO_CFU_KEYS_OWED]).toEqual([]);
  });

  /**
   * The sharp one, and it is sharp because of what a form-dependent CFU's grader IS:
   * `accepted.has(normalizeAcceptedAnswer(value))`, an exact match against a hand-written
   * list with no checker consulted at all. `WidgetReveal` prints `cfu.accepted[0]` as the
   * answer the learner is then asked to produce, so that string is precisely what the
   * keypad has to be able to write.
   *
   * Two assertions, because a character count alone would be weak: `(` and `)` arrive
   * with either bracketed key, so a pad that lost `abs` would still "reach" every
   * character of `6*abs(x^3)`. The second check names the key each notation needs.
   */
  it("can type the canonical accepted answer of every CFU it gives keys to", () => {
    const unreachable: string[] = [];

    // The population is DECLARED rather than skipped past, because this claim is about the
    // completeness of a row that exists: "the keys under this field can write the answer".
    // Where no row exists the claim has no subject, and the character class below would say
    // that `+` and `,` need a key, which the module's own note on `NOTATION_KEY_FOR`
    // contradicts. The absent-row case is not lost by that — it is what the sweep below
    // measures, over every CFU, keyed or not.
    for (const { nodeId, cfu } of KEYED_CFUS) {
      const keys = cfuKeypad(cfu.check, cfu.accepted);
      const answer = cfu.accepted[0] ?? "";
      // Everything ON_THE_KEYBOARD is already typable; everything else has to come from a key.
      const typed = new Set([...keys.flatMap((key) => [...key.insert])]);
      const missing = [...answer].filter(
        (char) => !ON_THE_KEYBOARD.test(char) && !typed.has(char),
      );
      if (missing.length > 0) {
        unreachable.push(
          `${nodeId}: ${JSON.stringify(answer)} needs ${JSON.stringify(missing.join(""))}, keys type ${JSON.stringify([...typed].join(""))}`,
        );
      }
    }

    expect(
      KEYED_CFUS.length,
      "no CFU gets a keypad, so this proves nothing",
    ).toBeGreaterThan(3);
    expect(unreachable.join("\n")).toBe("");
  });

  /**
   * The class above, held to being the COMPLEMENT of the key table rather than a list that can
   * be widened until the sweep proves nothing. Every character the keypad exists to type has
   * to be outside it, and one that a learner really does have has to be inside it, so the
   * cheapest way to make the sweep above green — adding `/` to the class — fails here.
   */
  it("counts as already typable nothing the keypad exists to type", () => {
    for (const char of ["^", "/", "*", "|"]) {
      expect(ON_THE_KEYBOARD.test(char), `${char} is claimed to need no key`).toBe(false);
      expect(
        NOTATION_KEY_FOR.some(([pattern]) => pattern.test(char)),
        `${char} is in neither the class nor the key table`,
      ).toBe(true);
    }
    for (const char of ["+", "-", ",", "=", "(", "x", "7", " "]) {
      expect(ON_THE_KEYBOARD.test(char), `${char} is claimed to need a key`).toBe(true);
    }
  });

  /**
   * The keys the sentence above does not reach, named rather than left implicit.
   *
   * `ON_THE_KEYBOARD` is a claim about CHARACTERS, and three keys are not about a character at
   * all: `sqrt()`, `abs()` and `pi` type NAMES, every letter and bracket of which a learner
   * already has. What they lack is the spelling — that the checker reads `√` as `sqrt(`, a
   * bar pair as `abs(`, and `π` as `pi` — and two of those three glyphs are outside the
   * grammar entirely, so a learner who types what the prompt draws loses the attempt to
   * `invalid_input`.
   *
   * So the pi key is not a new kind of key, which was worth measuring rather than asserting:
   * the first draft of this test claimed pi was the only one and the sweep answered
   * `['sqrt', 'abs', 'pi']`. It is the third member of a family `RADICAL_PLACEHOLDER` has
   * documented since it shipped, and the set is pinned in BOTH directions so neither a fourth
   * spelling key nor the loss of one can pass unremarked.
   */
  it("names the keys that type a spelling rather than a character", () => {
    for (const char of ["p", "i", "s", "q", "r", "t", "a", "b", "(", ")"]) {
      expect(ON_THE_KEYBOARD.test(char), `${char} is claimed to need a key`).toBe(true);
    }
    const spellingKeys = new Set<string>();
    let examined = 0;
    for (const item of SERVED_ITEMS) {
      for (const key of keypadFor(item)) {
        examined += 1;
        if ([...key.insert].every((char) => ON_THE_KEYBOARD.test(char))) {
          spellingKeys.add(key.id);
        }
      }
    }
    // A floor, or an empty keypad everywhere would satisfy the set equality below by
    // producing an empty set against an empty expectation.
    expect(examined, "no keys were examined").toBeGreaterThan(100);
    expect([...spellingKeys].sort()).toEqual(["abs", "pi", "sqrt"]);

    // And pi's entry in the notation table is the word it has to be. A substring test would
    // claim any longer symbol carrying those two letters and owe it a key it does not need.
    const piEntry = NOTATION_KEY_FOR.filter(([, id]) => id === "pi");
    expect(piEntry.length, "the pi notation entry is gone").toBe(1);
    const [pattern] = piEntry[0] as readonly [RegExp, string];
    expect(pattern.test("588*pi")).toBe(true);
    expect(pattern.test("588pi")).toBe(true);
    expect(pattern.test("pixel")).toBe(false);
  });

  /**
   * The other half, and the half the `keys.length === 0` skip used to throw away: does a
   * CFU whose canonical answer carries notation get a key row AT ALL?
   *
   * Written against `cfu.accepted[0]` rather than an `answer_key`, because a form-dependent
   * CFU has no spec: its grader is `accepted.has(normalizeAcceptedAnswer(value))`, and
   * `WidgetReveal` prints `accepted[0]` as the string the learner is then asked to reproduce.
   * So that string is exactly what the card has to let them write, and a `^` or a `/` in it
   * with no key and a bare "Your answer" above the field is the reported defect itself.
   */
  it("offers a key for every notation the CFU's own canonical answer uses", () => {
    const short: string[] = [];
    let required = 0;
    let exempt = 0;

    for (const { nodeId, cfu } of cfus) {
      const answer = cfu.accepted[0] ?? "";
      const ids = new Set(cfuKeypad(cfu.check, cfu.accepted).map((key) => key.id));
      for (const [pattern, id] of NOTATION_KEY_FOR) {
        if (!pattern.test(answer)) {
          continue;
        }
        required += 1;
        if (ids.has(id)) {
          continue;
        }
        if (NO_CFU_KEYS_OWED.has(`${nodeId}:${id}`)) {
          exempt += 1;
          continue;
        }
        short.push(
          `${nodeId}: ${JSON.stringify(answer)} uses ${id}, keypad has ${[...ids].join("/") || "nothing"}`,
        );
      }
    }

    // 16 (CFU, notation) pairs are required across the 31 authored packs and none is exempt,
    // so the two floors sit at the same place today. They are still two claims: the first
    // fails if the packs stop carrying notation, the second if `NO_CFU_KEYS_OWED` grows to
    // cover them.
    expect(
      required,
      `no CFU's canonical answer carries notation, so this proves nothing (required=${required} exempt=${exempt})`,
    ).toBeGreaterThan(12);
    expect(
      required - exempt,
      `the declared exceptions cover every notation-carrying CFU (required=${required} exempt=${exempt})`,
    ).toBeGreaterThan(12);
    expect(
      short.join("\n"),
      `${required} (CFU, notation) pairs required a key, ${exempt} declared exempt, ${short.length} short`,
    ).toBe("");
  });

  it("gives the EXP.1 check exactly the two characters nothing on screen names", () => {
    const exp1 = cfus.find((entry) => entry.nodeId === "EXP.1");
    if (!exp1) {
      throw new Error("the D2 pack has no EXP.1 CFU");
    }
    // The reported screenshot: the prompt asks for `1/x^2` and the field said only
    // "Your answer" until the placeholder work landed. Neither character is on a phone
    // keyboard's first layer.
    expect(exp1.cfu.accepted[0]).toBe("1/x^2");
    expect(cfuKeypad(exp1.cfu.check, exp1.cfu.accepted).map((key) => key.insert)).toEqual([
      "^",
      "/",
    ]);
    expect(cfuPlaceholder(exp1.cfu.check, exp1.cfu.accepted)).toBe(
      POSITIVE_EXPONENT_PLACEHOLDER,
    );
  });

  it("offers keys exactly where the CFU placeholder names notation", () => {
    const NAMED: readonly string[] = [
      POSITIVE_EXPONENT_PLACEHOLDER,
      RADICAL_PLACEHOLDER,
      RADICAL_QUOTIENT_PLACEHOLDER,
      RADICAL_SUM_PLACEHOLDER,
      VARIABLE_RADICAL_PLACEHOLDER,
      REDUCED_FRACTION_PLACEHOLDER,
      FRACTION_PLACEHOLDER,
      FRACTION_BAR_PLACEHOLDER,
      EXPONENT_NOTATION_PLACEHOLDER,
      // TRG.1's and TRG.6's checks, keyed `pi/4` and `pi/6`. Two characters, both required: the
      // glyph in the prompt does not grade, and the bar is the rest of the answer.
      PI_FRACTION_PLACEHOLDER,
      // A FORM line names a shape rather than a notation, and the three whose every character
      // is on a phone keyboard are deliberately absent: an interval, a point and a plain
      // solution roster owe no key.
      //
      // `SOLUTION_SET_FRACTION_PLACEHOLDER` is the one that is BOTH, which is the entire reason
      // it was split off from `SOLUTION_SET_PLACEHOLDER`: it names the roster shape and a bar
      // inside it, and a bar is not on the keyboard. It sat outside this list until POL.4's
      // authored card reached it, because no authored pack had, and the list going red at that
      // moment is the list working.
      SOLUTION_SET_FRACTION_PLACEHOLDER,
    ];
    const disagreements: string[] = [];
    let withKeys = 0;
    let withoutKeys = 0;

    for (const { nodeId, cfu } of cfus) {
      const keys = cfuKeypad(cfu.check, cfu.accepted);
      const namesNotation = NAMED.includes(cfuPlaceholder(cfu.check, cfu.accepted));
      if (keys.length > 0) {
        withKeys += 1;
      } else {
        withoutKeys += 1;
      }
      if (keys.length > 0 !== namesNotation) {
        disagreements.push(
          `${nodeId}: ${keys.length} keys, placeholder ${JSON.stringify(cfuPlaceholder(cfu.check, cfu.accepted))}`,
        );
      }
    }

    expect(withKeys, "no CFU gets a keypad").toBeGreaterThan(3);
    expect(withoutKeys, "every CFU gets a keypad").toBeGreaterThan(3);
    expect(disagreements.join("\n")).toBe("");
  });

  /**
   * A CFU that wants a single evaluated number gets no keys, even though a bare `a/b`
   * would satisfy its gate: the field says "A single number, e.g. 7", and a fraction key
   * under that line would contradict it.
   */
  it("gives no keys to a CFU that wants a single evaluated number", () => {
    const numeric = cfus.filter(
      (entry) => cfuNotation(entry.cfu.check, entry.cfu.accepted) === "numeric_literal",
    );
    expect(numeric.length, "no numeric-literal CFU authored").toBeGreaterThan(0);
    for (const { nodeId, cfu } of numeric) {
      expect(cfuKeypad(cfu.check, cfu.accepted), nodeId).toEqual([]);
      expect(cfuPlaceholder(cfu.check, cfu.accepted), nodeId).toBe(
        NUMERIC_LITERAL_PLACEHOLDER,
      );
    }
  });
});

/**
 * The property that lets a keypad ship in front of a versioned grader without a version
 * question: the value is spliced, not converted, so the string a tap produces is the
 * string a keyboard would have produced. The browser suite drives the real component to
 * establish that the tapped STRING is byte-identical; this establishes that a string
 * built that way is graded identically, object for object, through the real checker.
 */
describe("tapping and typing reach the checker as the same answer", () => {
  it("grades a spliced answer exactly as it grades the typed one", () => {
    const item = SERVED_ITEMS.find(
      (candidate) => (candidate.answer as { answer_key?: string }).answer_key === "1/x^2",
    );
    if (!item) {
      throw new Error("the EXP.1 item keyed 1/x^2 is no longer served");
    }

    // What the field holds after: type `1`, tap the fraction key, type `x`, tap the
    // exponent key, type `2`. The keypad splices `insert` at the caret and nothing else.
    const keys = new Map(keypadFor(item).map((key) => [key.id, key.insert]));
    const tapped = `1${keys.get("fraction")}x${keys.get("exponent")}2`;
    const typed = "1/x^2";

    expect(tapped).toBe(typed);

    const request = {
      item_version_id: item.item_version_id,
      equivalence_checker_version: checkerVersionForItem(item),
    };
    expect(practiceChecker({ raw_answer: tapped, ...request })).toEqual(
      practiceChecker({ raw_answer: typed, ...request }),
    );
    expect(practiceChecker({ raw_answer: tapped, ...request }).status).toBe("correct");
  });

  /**
   * The same claim for every key row the answer key now selects, on an item that really is
   * served from each, and made the hard way: the tapped string is REBUILT from the row's own
   * `insert` values against the item's own answer key, so a key whose insertion changed
   * produces a different string and the identity below fails. A hand-written pair of strings
   * would have gone on passing.
   *
   * `correct` on both sides is asserted as well as the identity, because two `invalid_input`
   * verdicts are also equal to each other, and that is exactly the way this could pass while
   * the row was unusable.
   */
  it.each([
    ["fraction_bar", "d2.rad3.negeval.l3"],
    ["solution_set_fraction", "d5.rat6.rate.l2"],
    ["implicit_product", "d8.el5.condense-sum.l2"],
    ["rational_quotient", "d5.rat3.samedenom.l1"],
    ["rational_quotient_power", "d5.rat1.monomial.l1"],
    ["rational_quotient_product", "d5.rat3.unlike.l2"],
  ] as const)(
    "grades a tapped %s answer exactly as the typed one",
    (notation, templateId) => {
      const item = SERVED_ITEMS.find(
        (candidate) =>
          candidate.template_id === templateId && notationFor(candidate) === notation,
      );
      if (!item) {
        throw new Error(`no served ${templateId} item is tagged ${notation}`);
      }

      // Retype the item's own answer key using the row under its field: every character the row
      // types is removed from the key and spliced back in from the key's own `insert`.
      const typed = answerKeyOf(item);
      const inserts = new Map(keypadFor(item).map((key) => [key.insert, key] as const));
      expect(inserts.size, `${notation} offers no keys to tap`).toBeGreaterThan(0);
      let tapped = "";
      let tappedFrom = 0;
      for (const char of typed) {
        const key = inserts.get(char);
        tapped += key ? fill(key, "") : char;
        tappedFrom += key ? 1 : 0;
      }
      // The row has to have been USED, or the two strings are the same string for no reason.
      expect(tappedFrom, `${typed} contains nothing the row types`).toBeGreaterThan(0);
      expect(tapped).toBe(typed);

      const request = {
        item_version_id: item.item_version_id,
        equivalence_checker_version: checkerVersionForItem(item),
      };
      const gradeTapped = practiceChecker({
        raw_answer: rawAnswerFor(item, tapped) as string,
        ...request,
      });
      expect(gradeTapped).toEqual(
        practiceChecker({ raw_answer: rawAnswerFor(item, typed) as string, ...request }),
      );
      expect(gradeTapped.status, `${typed} does not grade correct`).toBe("correct");
    },
  );
});

/**
 * The keypad under a RENDERED question, which is a wider population than the authored packs
 * every CFU sweep above this one reads.
 *
 * A pack with a `variants` block renders more questions than it authors: the authored one, and
 * then a computed re-ask per rotation whose accepted list a registered speller BUILDS. Those
 * instances are what a learner meets, and until this sweep existed not one of them was in any
 * population in this file or in `answerFormat.test.ts`.
 *
 * That gap is not the same thing as weak assertions, and the difference is measurable: when
 * POL.3's and POL.4's bracket spellings were briefly pushed into the AUTHORED lists, both files
 * went red naming exactly those two nodes. The assertions could see the defect. They were
 * pointed at the surface that did not have it — the population was scoped by where a notation
 * is AUTHORED rather than by every surface that ADVERTISES one.
 *
 * What it was hiding: POL.4's re-ask answers `-4, 2/5` and offered no keys at all, because
 * `solutionSetForms` spells the roster `[-4, 2/5]` as well as `{-4, 2/5}` and the square-bracket
 * spelling made `cfuNotation` read the whole answer as an interval. The learner was left with no
 * way to type the slash their answer needs, on a card whose authored question hands them the
 * slash key. POL.3 and LIN.5 were misdirected the same way.
 */
describe("the keypad reaches every question the CFU card can render", () => {
  /**
   * Every rendered instance, derived from the same lesson registry the authored sweeps use and
   * widened through `cfuInstances`, which is the function the card itself calls.
   */
  const RENDERED_ASKS = allLessons.flatMap((lesson) =>
    lesson.cfu
      ? cfuInstances(lesson.cfu).map((ask, index) => ({
          nodeId: lesson.node_id,
          cfu: lesson.cfu as NonNullable<typeof lesson.cfu>,
          ask,
          isReAsk: index > 0,
          label: `${lesson.node_id}[${index}]`,
        }))
      : [],
  );

  /**
   * The rendered asks that genuinely owe no key for a notation their answer carries.
   *
   * EMPTY, and derived rather than asserted, on the same two grounds the practice sweep
   * exempts on: a `|` that is a set-builder "such that" bar, and a `*` the grader reads as
   * optional. The census below shows no rendered ask qualifies under either. Both directions
   * are checked: an entry that stops qualifying fails, and a qualifier not listed fails.
   */
  const NO_ASK_KEYS_OWED: ReadonlySet<string> = new Set();

  it("renders more questions than the packs author", () => {
    expect(RENDERED_ASKS.length, "no rendered asks").toBeGreaterThan(60);
    const reAsks = RENDERED_ASKS.filter((entry) => entry.isReAsk);
    // The floor that makes every assertion below non-vacuous over the NEW half of the
    // population: without it, a `cfuInstances` that stopped rotating would leave this whole
    // describe measuring the authored packs a second time and passing.
    expect(
      reAsks.length,
      "no re-ask is rendered, so this file is still authored-only",
    ).toBeGreaterThan(40);
    expect(
      [...new Set(reAsks.map((entry) => entry.nodeId))].length,
      "re-asks come from one node only",
    ).toBeGreaterThan(5);
  });

  it("offers a key for every notation a rendered ask's own canonical answer uses", () => {
    const short: string[] = [];
    let required = 0;
    let exempt = 0;

    for (const { label, cfu, ask } of RENDERED_ASKS) {
      const answer = ask.accepted[0] ?? "";
      // The call `cfu.tsx` makes: the pack's spec, the INSTANCE's accepted list.
      const ids = new Set(cfuKeypad(cfu.check, ask.accepted).map((key) => key.id));
      for (const [pattern, id] of NOTATION_KEY_FOR) {
        if (!pattern.test(answer)) {
          continue;
        }
        required += 1;
        if (ids.has(id)) {
          continue;
        }
        if (NO_ASK_KEYS_OWED.has(`${label}:${id}`)) {
          exempt += 1;
          continue;
        }
        short.push(
          `${label}: ${JSON.stringify(answer)} uses ${id}, keypad has ${[...ids].join("/") || "nothing"}`,
        );
      }
    }

    // Two floors under a containment, and the second is the one that matters here: it says the
    // declared exceptions have not grown until nothing is required of anybody.
    expect(
      required,
      `no rendered answer carries notation at all (required=${required} exempt=${exempt})`,
    ).toBeGreaterThan(20);
    expect(
      required - exempt,
      `the exceptions now cover the population (required=${required} exempt=${exempt})`,
    ).toBeGreaterThan(20);
    expect(short.join("\n")).toBe("");
  });

  it("can type the canonical answer of every rendered ask it gives keys to", () => {
    const unreachable: string[] = [];
    let keyed = 0;

    for (const { label, cfu, ask } of RENDERED_ASKS) {
      const keys = cfuKeypad(cfu.check, ask.accepted);
      if (keys.length === 0) {
        continue;
      }
      keyed += 1;
      const answer = ask.accepted[0] ?? "";
      const typed = new Set([...keys.flatMap((key) => [...key.insert])]);
      const missing = [...answer].filter(
        (char) => !ON_THE_KEYBOARD.test(char) && !typed.has(char),
      );
      if (missing.length > 0) {
        unreachable.push(
          `${label}: ${JSON.stringify(answer)} needs ${JSON.stringify(missing.join(""))}, keys type ${JSON.stringify([...typed].join(""))}`,
        );
      }
    }

    expect(keyed, "no rendered ask gets a key row, so this proves nothing").toBeGreaterThan(
      10,
    );
    expect(unreachable.join("\n")).toBe("");
  });

  /**
   * The exception list held to being empty by MEASUREMENT rather than by assertion, so it
   * cannot become a bucket. Both grounds the practice sweep recognises are tested against the
   * rendered population; if a rendered ask ever qualifies under one, this fails and the entry
   * has to be written down with its reason rather than the sweep quietly wanting it.
   */
  it("has no rendered ask qualifying for either declared exemption", () => {
    expect(RENDERED_ASKS.length).toBeGreaterThan(60);
    expect(
      RENDERED_ASKS.filter(
        ({ cfu, ask }) => cfuNotation(cfu.check, ask.accepted) === "set_builder",
      ).map((entry) => entry.label),
      "a rendered ask is graded on set-builder form, so the pipe ground has an instance",
    ).toEqual([]);
    expect(
      RENDERED_ASKS.filter(({ cfu, ask }) => {
        const ids = new Set(cfuKeypad(cfu.check, ask.accepted).map((key) => key.id));
        return (ask.accepted[0] ?? "").includes("*") && !ids.has("times");
      }).map((entry) => entry.label),
      "a rendered ask is short a times key, so the star ground has an instance to judge",
    ).toEqual([]);
    expect([...NO_ASK_KEYS_OWED]).toEqual([]);
  });

  /**
   * The two nodes the widening was written for, pinned as the tags they now reach.
   *
   * A cohort assertion rather than a count, because the defect was a MISTAG and not an absence:
   * POL.4's re-ask had a placeholder and it was the wrong one. Naming the tag is what would
   * fail if the interval reading came back, and it fails in both directions — a node that stops
   * reaching its tag fails just as loudly as one that changes tag.
   */
  it("tags POL.3, POL.4 and LIN.5 re-asks by the answers they actually want", () => {
    const tagsFor = (nodeId: string): string[] => [
      ...new Set(
        RENDERED_ASKS.filter((entry) => entry.isReAsk && entry.nodeId === nodeId).map(
          (entry) => cfuNotation(entry.cfu.check, entry.ask.accepted) as string,
        ),
      ),
    ];
    // A roster of integers: no key is owed, and the line names the roster rather than an
    // interval's bounds.
    expect(tagsFor("POL.3"), "POL.3 renders no re-ask").toEqual(["solution_set"]);
    expect(tagsFor("LIN.5"), "LIN.5 renders no re-ask").toEqual(["solution_set"]);
    // A roster holding a fraction, so the bar has to be named AND typable. Its authored
    // question reaches the same tag: `{-4, 3/2}` is braced, which is one of the spellings
    // `isSolutionRosterAnswerText` reads, so the roster rule claims it and the bar inside sends
    // it to the fraction line rather than to the plain one. The sweep below is where the two
    // instances agreeing is asserted rather than described.
    expect(tagsFor("POL.4"), "POL.4 renders no re-ask").toEqual(["solution_set_fraction"]);
    for (const entry of RENDERED_ASKS.filter(
      (candidate) => candidate.isReAsk && candidate.nodeId === "POL.4",
    )) {
      expect(
        cfuKeypad(entry.cfu.check, entry.ask.accepted).map((key) => key.insert),
        `${entry.label} answers ${entry.ask.accepted[0]} and cannot type the bar`,
      ).toContain("/");
    }
  });

  /** The whole menu one instance advertises: the line over the field and the row under it. */
  const menuOf = (entry: (typeof RENDERED_ASKS)[number]): string =>
    `${JSON.stringify(cfuPlaceholder(entry.cfu.check, entry.ask.accepted))} over [${
      cfuKeypad(entry.cfu.check, entry.ask.accepted)
        .map((key) => key.insert)
        .join(",") || "no keys"
    }]`;

  /**
   * The notation an instance's own canonical answer carries, read through the same table the
   * sweeps above derive their requirements from. This is what tells a node whose draws really
   * do want different menus from one that is contradicting itself.
   */
  const notationOf = (entry: (typeof RENDERED_ASKS)[number]): string =>
    NOTATION_KEY_FOR.filter(([pattern]) => pattern.test(entry.ask.accepted[0] ?? ""))
      .map(([, id]) => id)
      .sort()
      .join("+") || "nothing";

  /**
   * ONE QUESTION, ONE MENU.
   *
   * Every sweep above this one judges an instance against its OWN answer, which is the right
   * question to ask of an instance and leaves a whole class of defect unasked: a learner who
   * misses the authored question is shown the re-ask, and the two are one question with one
   * notation. A line and a row that change between them tell the learner the rules changed
   * when only the numbers did, on the surface they reach only after already getting it wrong.
   *
   * Nothing asserted this. `POL.6` is the instance that made the gap visible — its ask is keyed
   * `-10x^4` and its re-ask `20x^3`, `isPositiveExponentAnswerText` fires on the second and not
   * the first (there is no `-` in its character class), and the two would advertise different
   * lines and different rows if the predicate were what decided the tag. It is not: POL.6's
   * `check` is an `expression` carrying a caret, so the spec rule tags both instances
   * `exponent_notation` before the predicate is consulted, and they agree today. That is the
   * kind of agreement that holds by a coincidence of ordering and needs a guard under it, which
   * is what this is.
   *
   * The population is derived and the exemption is the interesting half: a node MAY show two
   * menus, but only when its own draws answer in different notation. That is the condition
   * POL.6 could not have met — both of its answers carry a caret and nothing else — so the
   * defect this is written for cannot be excused into the list.
   */
  const MENU_FOLLOWS_THE_DRAW: ReadonlyMap<string, string> = new Map([
    [
      "LF.1",
      "its two draws answer with a fractional slope and a zero one: `-1/2, decreasing` needs the bar and `0, constant` carries no notation at all, so one menu for both would either hide the slash or advertise it over an answer that has none",
    ],
  ]);

  it("advertises one menu per node, unless that node's own draws differ in notation", () => {
    const byNode = new Map<string, (typeof RENDERED_ASKS)[number][]>();
    for (const entry of RENDERED_ASKS) {
      byNode.set(entry.nodeId, [...(byNode.get(entry.nodeId) ?? []), entry]);
    }
    const rotating = [...byNode].filter(([, group]) => group.length > 1);

    const split: string[] = [];
    const excused: string[] = [];
    let agreed = 0;
    for (const [nodeId, group] of rotating) {
      if (new Set(group.map(menuOf)).size === 1) {
        agreed += 1;
        continue;
      }
      if (new Set(group.map(notationOf)).size > 1 && MENU_FOLLOWS_THE_DRAW.has(nodeId)) {
        excused.push(nodeId);
        continue;
      }
      split.push(
        `${nodeId}: ${group
          .map(
            (entry) =>
              `${entry.label} ${JSON.stringify(entry.ask.accepted[0] ?? "")} is shown ${menuOf(entry)} and carries ${notationOf(entry)}`,
          )
          .join("\n    ")}`,
      );
    }

    // A floor under the population, and a second under the AGREEING half: a sweep whose nodes
    // had all become single-instance, or had all drifted into the exemption, would report an
    // empty `split` and prove nothing. 62 nodes rotate and 61 of them agree.
    expect(rotating.length, "no node renders more than one question").toBeGreaterThan(50);
    expect(
      agreed,
      "no node's instances agree, so the property is not held anywhere",
    ).toBeGreaterThan(50);
    // The exemption census, both ways in one line: a listed node that has stopped splitting, or
    // whose draws have stopped differing in notation, is missing from `excused` and fails here;
    // a node that starts splitting without being listed lands in `split` below instead.
    expect(
      excused.sort(),
      "the declared exemption no longer describes the node it excuses",
    ).toEqual([...MENU_FOLLOWS_THE_DRAW.keys()].sort());
    expect(
      split.join("\n"),
      `${rotating.length} nodes rotate, ${agreed} agree, ${excused.length} excused, ${split.length} contradict themselves`,
    ).toBe("");
  });

  it.each([...MENU_FOLLOWS_THE_DRAW])(
    "%s is a declared exemption that still renders a rotation whose draws differ",
    (nodeId, reason) => {
      const group = RENDERED_ASKS.filter((entry) => entry.nodeId === nodeId);
      expect(
        group.length,
        `${nodeId} is excused from showing one menu and renders no rotation: ${reason}`,
      ).toBeGreaterThan(1);
      expect(
        [...new Set(group.map(notationOf))].sort(),
        `${nodeId} is excused because ${reason}, and its draws now carry the same notation`,
      ).toEqual(["fraction", "nothing"]);
    },
  );

  it("keeps the exemption a minority of the rotating population", () => {
    const rotating = new Set(
      RENDERED_ASKS.filter((entry) => entry.isReAsk).map((entry) => entry.nodeId),
    );
    expect(rotating.size).toBeGreaterThan(50);
    expect(MENU_FOLLOWS_THE_DRAW.size * 10).toBeLessThan(rotating.size);
  });
});
