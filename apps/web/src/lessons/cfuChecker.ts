/**
 * Builds the answer checkers for the form-independent CFUs of EVERY authored domain, and
 * owns the decision each typed answer is graded by ({@link gradeCfuAnswer}).
 *
 * Each lesson whose `cfu.check` is set contributes one immutable item version off its authored
 * key, and one per COMPUTED instance its re-ask can serve, off that instance's own key; grading
 * goes through the shared `@cr/components` checker (Anthony consumes the frozen API, Gabe owns
 * it). The lessons come from the all-domains registry rather than one domain's pack, so a newly
 * registered domain's checked CFUs are gradable with no change here.
 *
 * We call this locally-built checker instance directly rather than the global
 * `configureAnswerChecker` registry (owned by `CheckerLab.tsx`) to avoid cross-lane
 * coupling.
 *
 * ## Why this is the PRODUCT checker and not the D1 one
 *
 * It was `createD1AnswerChecker`, whose dispatch grades four answer types and returns
 * `unsupported_answer_type` for every other one — including `interval`, `solution_set` and
 * `point`. So a CFU could only ever declare `numeric` or `expression`, and the 39 packs
 * whose answer is an interval, a roster or a coordinate pair had no route to a comparator at
 * all: they graded by exact string match against a hand-written list, which returns a
 * boolean and no reason, so a learner there met a bare "Not quite" whatever they got wrong.
 * LIN.6 was the sharpest case — its practice twin shows `BOUND_INCLUSIVITY_NOTE` on a
 * wrong-bracket answer and its check could not.
 *
 * The two checkers share `checker-core.ts`'s mathjs configuration and safe-parse layer, so
 * the arithmetic is the same instance in both; what v2 adds is types and reason codes.
 * `cfuCheckerProductParity.test.ts` grades every accepted spelling and a battery of wrong
 * answers on all 23 packs that already carried a check through BOTH checkers and requires
 * the same verdict and the same reason code from each, because this swap silently changes
 * grading for every pack that already worked.
 */

import {
  type AnswerChecker,
  type AnswerDefinition,
  type AnswerSpec,
  type CheckAnswerResult,
  createProductAnswerChecker,
  foldRenderedMinus,
  foldTerminalPeriod,
  PRODUCT_CHECKER_VERSION,
  type ProductItemVersion,
} from "@cr/components";

import {
  cfuPlaceholder,
  dropLeadingPlus,
  exactMatchFormNote,
  GENERIC_MISS_NOTE,
  isNumericLiteral,
  isReducedFraction,
  missNote,
  NUMERIC_LITERAL_NOTE,
  normalizeAcceptedAnswer,
  REDUCED_FRACTION_NOTE,
} from "./answerFormat";
import {
  type CfuInstance,
  cfuAsk,
  cfuAuthoredSpellings,
  cfuInstances,
} from "./cfuVariants";
import { allLessons } from "./domains";
import type { LessonCfuAnswerType, LessonCfuCheck, LessonCfuSpec } from "./types";
import { unreadableAnswer } from "./unreadableAnswer";

export const CFU_CHECKER_VERSION = PRODUCT_CHECKER_VERSION;

export const cfuItemVersionId = (nodeId: string) => `cfu:${nodeId}:v1`;

/**
 * The equivalence mode each answer type is graded under, DERIVED rather than authored.
 *
 * Every one of these is the mode `packages/item-bank/src/template.ts` already emits for a
 * practice item of that type — `exact_value` from `numericAnswer`, `symbolic` from
 * `expressionAnswer`, `structural` from `solutionSetAnswer`, `intervalAnswer`, `pointAnswer`
 * and the two equation-form shapes — so a CFU and its practice twin are compared the same
 * way. It is a table rather than an authored field because the pair is not free: the v1
 * dispatch returned `unsupported_equivalence_mode` for a type and a mode that disagree, and
 * the v2 one silently takes the type's branch regardless, which would grade a mistyped pack
 * without saying so.
 */
export const EQUIVALENCE_FOR: Readonly<
  Record<LessonCfuAnswerType, AnswerSpec["equivalence"]>
> = {
  numeric: "exact_value",
  expression: "symbolic",
  interval: "structural",
  solution_set: "structural",
  point: "structural",
  equation_form: "structural",
};

/**
 * Every answer type a check block may declare, DERIVED from the table above.
 *
 * Exported because two D8 files probe "can the shared checker grade this pack's answer at
 * all" once per type, and a probe that writes the union down itself measures its own list:
 * `d8El2Cfu.test.tsx` held `["numeric", "expression"]` and stayed green through the swap that
 * quadrupled the union, which is exactly the case it was written to catch. Keyed off a record
 * `LessonCfuAnswerType` exhausts, so a seventh type is a compile error here before it is a
 * silent hole there.
 */
export const CFU_ANSWER_TYPES: readonly LessonCfuAnswerType[] = Object.keys(
  EQUIVALENCE_FOR,
) as LessonCfuAnswerType[];

/**
 * The answer spec one check block declares, in the shape the shared checker reads.
 *
 * The defaults are `template.ts`'s, field for field, so a CFU's spec and the spec of the
 * practice item testing the same skill are the same object: `representation: "any"`,
 * `simplification: "none"`, no precision and no units, with `required_notation: "interval"`
 * on an interval answer because that is what `intervalAnswer()` emits.
 */
function answerSpec(check: LessonCfuCheck): AnswerSpec {
  return {
    answer_type: check.answer_type,
    equivalence: EQUIVALENCE_FOR[check.answer_type],
    representation: check.representation ?? "any",
    simplification: check.simplification ?? "none",
    required_form: check.required_form ?? null,
    required_notation:
      check.required_notation ?? (check.answer_type === "interval" ? "interval" : "none"),
    precision: null,
    unit_policy: "none",
  };
}

/**
 * One immutable item version, off a check block and the answer the question in hand has.
 *
 * The KEY is a parameter rather than read from the check, because the check block carries the
 * authored question's answer and the re-ask asks a different one. Everything else about how an
 * answer is judged - the answer type, the representation, the simplification profile, the
 * symbols an expression may use - is a property of the QUESTION KIND and so is shared by every
 * instance of it.
 *
 * `allowed_symbols` is written only where the pack declares one, plus the empty array an
 * expression has always carried. The distinction is load-bearing in the product checker and
 * `[]` is the safe side of it: `compareRadical`'s additivity gate is `symbols.length > 0`, so
 * a numeric radical answer with no declared symbol keeps the constant-radicand path rather
 * than reaching the variable-aware sampler.
 */
export function cfuItemVersion(
  itemVersionId: string,
  nodeId: string,
  check: LessonCfuCheck,
  answerKey: string,
): ProductItemVersion {
  const answer: AnswerDefinition = {
    answer_spec: answerSpec(check),
    answer_key: answerKey,
  };
  if (check.allowed_symbols !== undefined || check.answer_type === "expression") {
    answer.allowed_symbols = check.allowed_symbols ?? [];
  }
  return { item_version_id: itemVersionId, node_id: nodeId, answer };
}

const itemVersions: ProductItemVersion[] = [];
for (const lesson of allLessons) {
  const check = lesson.cfu?.check;
  if (!check) continue;
  itemVersions.push(
    cfuItemVersion(
      cfuItemVersionId(lesson.node_id),
      lesson.node_id,
      check,
      check.answer_key,
    ),
  );
}

export const cfuChecker: AnswerChecker = createProductAnswerChecker({ itemVersions });

/** The item version id for a COMPUTED instance, which the pack's own key cannot cover. */
export const cfuVariantItemVersionId = (nodeId: string, index: number) =>
  `cfu:${nodeId}:v1:variant:${index}`;

/**
 * A checker over one pack's computed instances, built the first time one is graded.
 *
 * Lazy and per pack, because building it resolves that pack's instances, and resolving an
 * instance runs a rejection loop over a template draw. A learner meets one check at a time and
 * the sweep in `cfuVariantGrading.test.ts` meets all of them, so neither wants every pack's
 * draw done at import.
 */
const variantCheckers = new Map<string, AnswerChecker>();

function variantChecker(nodeId: string, cfu: LessonCfuSpec, check: LessonCfuCheck) {
  const cached = variantCheckers.get(nodeId);
  if (cached !== undefined) {
    return cached;
  }
  const versions: ProductItemVersion[] = [];
  cfuInstances(cfu).forEach((instance, index) => {
    if (instance.authored) {
      return;
    }
    versions.push(
      cfuItemVersion(
        cfuVariantItemVersionId(nodeId, index),
        nodeId,
        check,
        // The SPELLER's canonical form, which is the string the reveal prints and the list
        // leads with, rather than the template's raw key. `cfuVariants.ts` records why those
        // two can differ: LF.1's level line keys `0/1` where its check accepts `0`.
        instance.answerKey,
      ),
    );
  });
  const built = createProductAnswerChecker({ itemVersions: versions });
  variantCheckers.set(nodeId, built);
  return built;
}

/** What grading one typed answer came to, and the note the card puts under it. */
export interface CfuGrade {
  correct: boolean;
  note: string | null;
  /**
   * Set when the checker could not READ the answer, in which case `correct: false` means
   * "not graded" and not "wrong". The card must not say "Not quite" over one of these: that is
   * a verdict on an answer nobody graded, and it was the harshest instance of this defect in
   * the app. See `unreadableAnswer.ts`.
   */
  unreadable: string | null;
}

/**
 * Grade one typed answer against the question actually in front of the learner.
 *
 * ## Why the two kinds of instance no longer take two different paths
 *
 * They did, and the asymmetry fell on the learner at the worst moment. The authored question
 * went to the shared checker, which decides EQUIVALENCE, and every computed instance went to
 * string membership in the list `cfuAcceptedForms.ts` spells - three strings for a whole
 * number. So LIN.1 accepted `49/7` for its authored key of 7 and rejected `56/7` for the 8 its
 * re-ask asks, which is the division that node's own last step performs. A variant is only ever
 * served after a miss, so a learner who has just been told they were wrong was told again, for
 * an answer that is right, in a spelling the same node had accepted from them a moment earlier.
 *
 * The fix is the UNION rather than a wider list, because both halves are load-bearing and
 * neither contains the other:
 *
 *  - the LIST has to stay, and that is the constraint `cfuAcceptedForms.ts` was written under:
 *    these packs accept LaTeX (`\dfrac{6\sqrt{2}}{5}`) and the root glyph, and the checker
 *    refuses both as `invalid_input`. Routing a variant through the checker ALONE would
 *    withdraw acceptance the learner has today;
 *  - the CHECKER has to be reachable, or the re-ask stays stricter than the question it
 *    replaces, which is the defect above.
 *
 * So a computed instance is graded correct if EITHER says so, which makes the re-ask no
 * stricter than the authored question in both directions at once.
 *
 * ## And the same union on the authored question, which is the half that was missed
 *
 * The paragraph above fixed one direction and left the mirror image of it live, because the
 * union was reached only by a computed instance: the authored ask consulted no list at all when
 * a check block was present, and where there was NO check block it consulted the literal
 * strings in the pack JSON and nothing else. A roster answer cannot declare a check block --
 * `answer_type` is `"numeric" | "expression"` -- so on all five D4 packs the strict grader was
 * a hand-typed list with no equivalence behind it, and the generous one was the re-ask. POL.3
 * accepted 4 of the 48 spellings its own retry accepts and POL.4 accepted 18 of 168, so
 * `-7; 5` and `-4, \dfrac{3}{2}` were wrong on attempt one and right on attempt two. The
 * authored ask now reaches the list too, its OWN spellings included ({@link acceptedByForm}),
 * so the union is the same one on both asks.
 *
 * ## What the union cannot let back in
 *
 * `cfuVariants.ts` rejects any instance sharing an accepted spelling with an earlier one, and
 * `cfu.tsx` spends that disjointness: once the re-ask has moved the question on, an answer is
 * the learner's own work rather than the string the reveal printed. Equivalence does not widen
 * that, because the checker only ever accepts values equal to THIS instance's key, and two
 * instances with disjoint lists have different answers. A spelling of the answer the reveal
 * printed is still not an accepted answer to the question that replaced it.
 */
export function gradeCfuAnswer({
  nodeId,
  cfu,
  index,
  value: typed,
}: {
  nodeId: string;
  cfu: LessonCfuSpec;
  index: number;
  value: string;
}): CfuGrade {
  const check = cfu.check;
  /*
   * THE RENDERED MINUS, folded before anything reads the answer — and BEFORE the gate below,
   * which is the whole reason it cannot be left to the checker.
   *
   * KaTeX paints a minus as U+2212, so a coefficient copied off the rendered prompt arrives as a
   * character no grammar here reads. `checkProductDefinition` folds it too, and on a numeric
   * check nothing ever reached it: the gate on the next line runs first and answers
   * NUMERIC_LITERAL_NOTE, telling a learner who typed the right number to type a number. The
   * accepted-list half is behind the same fold for the same reason, so a pack with no check
   * block — which has no checker to fall through to at all — is covered by this line alone.
   */
  const value = foldRenderedMinus(typed);
  const asked = cfuAsk(cfu, index);
  /*
   * THE LIST FIRST, ahead of the two format gates below, which is the ORDER and not one more
   * spelling folded in front of them.
   *
   * The gates used to run first, and a gate in front of a list means a pack can advertise a
   * spelling its own card refuses. It did: measured over all 36,112 forms in every instance's
   * accepted list at `3fbe5fcb`, twelve failed, every one of them a LaTeX fraction on a
   * computed re-ask — TRG.9 lists `-\dfrac{7}{25}` and answered *"Enter your final answer as a
   * single number (for example, 6), not the expression."*, which is a false statement about the
   * input and is shown to the learner who did the most reasonable thing available, copying the
   * fraction off the rendered prompt. #735 met the same ordering with U+2212 and folded that
   * one GLYPH ahead of the gates; the ordering itself is what closes the class.
   *
   * The gates lose nothing by moving behind it. They are statements about answers the pack does
   * NOT advertise — "you have handed back the expression rather than its value", "you have not
   * reduced" — and a spelling the author wrote into `accepted` is by definition not one of
   * those. The load-bearing case is the lowest-terms gate on the four `reduced_fraction` packs,
   * and `cfuVariants.ts` already turned `unreduced` OFF on every one of their spellers for this
   * exact reason, so their lists carry no unreduced form for the reorder to let through.
   * `cfuGradingGates.test.ts` asserts that rather than trusting it, in the direction that fails
   * if a speller ever turns the flag back on.
   */
  if (acceptedByForm(cfu, asked, value)) {
    return { correct: true, note: null, unreadable: null };
  }
  // Numeric checks want the evaluated result, not the (equivalent) expression.
  if (check?.answer_type === "numeric" && !isNumericLiteral(value)) {
    return { correct: false, note: NUMERIC_LITERAL_NOTE, unreadable: null };
  }
  if (
    check?.simplification === "reduced_fraction" &&
    isNumericLiteral(value) &&
    /\d+\s*\/\s*\d+/.test(value) &&
    !isReducedFraction(value)
  ) {
    return { correct: false, note: REDUCED_FRACTION_NOTE, unreadable: null };
  }
  if (check === undefined) {
    // Form matters and there is no checker to fall through to, so the list is the whole
    // decision -- and the note is the only thing this branch can offer, since there is no
    // reason code behind it. See {@link exactMatchFormNote}.
    return {
      correct: false,
      note: exactMatchFormNote(asked.accepted),
      unreadable: null,
    };
  }

  const result = checkCfuThroughChecker({ nodeId, cfu, index, value });
  if (result?.client_correct === true) {
    return { correct: true, note: null, unreadable: null };
  }
  /*
   * THE READER COULD NOT READ IT. Until this branch existed the card fell straight through to
   * `{ correct: false }` and said *"Not quite. Try again, or reveal the hint."* over an answer
   * the checker had refused to parse — the one place in the app where the swallow produced a
   * false CORRECTNESS statement rather than only silence.
   *
   * The list is consulted before the checker on either kind of instance (above), so a spelling
   * the pack accepts and the grammar cannot read is still correct and never reaches here.
   */
  const unreadable = unreadableAnswer(result, value, {
    allowedSymbols: check.allowed_symbols,
    notationLine: cfuPlaceholder(check, asked.accepted),
  });
  if (unreadable) {
    return { correct: false, note: null, unreadable: unreadable.message };
  }
  return { correct: false, note: noteFor(check, result?.reason_code), unreadable: null };
}

/**
 * The line under a wrong answer, off the reason code the checker returned.
 *
 * ONE dispatch shared with the two practice surfaces ({@link missNote}), rather than the
 * two-code table this used to hold. That table predates the CFU reaching a comparator that
 * can distinguish anything: with only `numeric` and `expression` gradable, the codes a CFU
 * could see were `value_mismatch` and the two form misses, so mapping both form misses to
 * the lowest-terms line was complete. It is not complete now. The whole point of routing the
 * card through the product checker is that `wrong_bound_inclusivity`, `coordinates_swapped`,
 * `extra_solution`, `incomplete_solution_set` and `wrong_notation` are reachable here, and
 * every one of them says the learner's mathematics was right and their WRITING was not —
 * which is the one thing a generic "Not quite" cannot say. LIN.6 is the motivating case:
 * `(15, 25]` for a key of `(15, 25)` is now told which bracket to change.
 *
 * `missNote` reads the spec as well as the code, so a form miss names the profile that
 * refused it rather than assuming lowest terms. That is a strictly finer reading than the old
 * table on every pack that had one — the four fraction packs declare
 * `simplification: "reduced_fraction"` and get the identical line — and it is what lets a
 * migrated pack carrying `simplified_radical` avoid being told to reduce a fraction.
 *
 * `GENERIC_MISS_NOTE` maps back to `null` because the CARD owns its own fallback sentence
 * ("Not quite. Try again, or reveal the hint.", which names the reveal this surface has and
 * practice does not). Returning the practice wording here would replace it.
 */
function noteFor(check: LessonCfuCheck, reasonCode: string | undefined): string | null {
  if (reasonCode === undefined) {
    return null;
  }
  const note = missNote(check, reasonCode);
  return note === GENERIC_MISS_NOTE ? null : note;
}

/**
 * Whether a typed answer is one of the SPELLINGS this instance accepts.
 *
 * Two sources, and the second is the one that closed the asymmetry this function exists to
 * state. A computed instance's list is BUILT by the speller off the parameters it was drawn
 * from, so it already holds every equivalence-preserving spelling of its own answer. The
 * authored question's list is TYPED into the pack JSON, so it holds the spellings someone
 * thought of -- which on the five D4 packs was between 3% and 11% of them, because those packs
 * can carry no `check` block at all (`answer_type` is `"numeric" | "expression"`, and a roster
 * is neither) and so had nothing behind the list. The authored ask therefore runs the SAME
 * speller over its OWN parameters and accepts that too, which makes the first attempt no
 * stricter than the retry that replaces it.
 *
 * What this cannot do is widen the ANSWER. `cfuAuthoredSpellings` returns nothing at all unless
 * the pack's own answer comes back out of the speller, so a params set describing a different
 * question contributes no spellings rather than the wrong ones; and a speller only ever spells
 * the value it was handed, so POL.3 still refuses `5` -- one root of a question whose prompt
 * asks for every solution -- because no spelling of `{-7, 5}` is `5`.
 */
function acceptedByForm(cfu: LessonCfuSpec, asked: CfuInstance, value: string): boolean {
  const plain = normalizeAcceptedAnswer(value);
  const folded = spellingKey(value);
  if (acceptedSpellings(asked).has(folded)) {
    return true;
  }
  if (!asked.authored) {
    return false;
  }
  /*
   * BOTH forms against the speller's set, because that set is built elsewhere and normalized
   * without the sign fold. Checking the folded spelling alone would take `+3` and lose `+3x`,
   * which `linearForms` genuinely spells and NUM.3's own list genuinely carries.
   */
  const spelled = cfuAuthoredSpellings(cfu);
  return spelled.has(folded) || spelled.has(plain);
}

/**
 * The one key an accepted spelling and a typed answer are both reduced to.
 *
 * Applied to BOTH sides, which is what makes the two folds safe here rather than a widening of
 * the list: a pack that lists `+3x` still matches a learner who types `+3x`, because the form
 * and the answer land on the same key. Neither fold can make a spelling stop matching itself.
 *
 * The terminal period is folded here as well as retried inside the product checker, because 28
 * packs have no checker behind their list -- on those the list IS the grader, and a rule that
 * lived only in the checker would leave `sqrt(10).` refused on RAD.2 while `pi/2.` is taken on
 * TRG.6, which is the shape of inconsistency this lane exists to remove.
 */
function spellingKey(value: string): string {
  return dropLeadingPlus(foldTerminalPeriod(normalizeAcceptedAnswer(value)));
}

/**
 * One instance's accepted list, normalized once.
 *
 * A cache and not only an optimization. `acceptedByForm` is now the FIRST thing every typed
 * answer meets, and it re-normalized the whole list on every call: over the 36,112 advertised
 * forms the new sweep grades, the quadratic term put one assertion at 287 seconds. The instances
 * are the objects `cfuInstances` already caches per pack, so keying a WeakMap on one is safe and
 * needs no invalidation.
 */
const ACCEPTED_SPELLINGS = new WeakMap<CfuInstance, ReadonlySet<string>>();

function acceptedSpellings(asked: CfuInstance): ReadonlySet<string> {
  const cached = ACCEPTED_SPELLINGS.get(asked);
  if (cached !== undefined) {
    return cached;
  }
  const built = new Set(asked.accepted.map(spellingKey));
  ACCEPTED_SPELLINGS.set(asked, built);
  return built;
}

/**
 * Grade one instance through the shared checker ALONE, or `null` where the pack has no check.
 *
 * Exported because the union in {@link gradeCfuAnswer} answers off the list first, so a sweep
 * grading an instance's canonical answer through that function would come back correct with the
 * checker never consulted - and "the checker can grade this question at all" is exactly the
 * claim that was false. `cfuVariantGrading.test.ts` asserts it here, where nothing else can
 * satisfy it.
 */
export function checkCfuThroughChecker({
  nodeId,
  cfu,
  index,
  value,
}: {
  nodeId: string;
  cfu: LessonCfuSpec;
  index: number;
  value: string;
}): CheckAnswerResult | null {
  const check = cfu.check;
  if (check === undefined) {
    return null;
  }
  const asked = cfuAsk(cfu, index);
  return asked.authored
    ? cfuChecker({
        raw_answer: value,
        item_version_id: cfuItemVersionId(nodeId),
        equivalence_checker_version: CFU_CHECKER_VERSION,
      })
    : variantChecker(
        nodeId,
        cfu,
        check,
      )({
        raw_answer: value,
        item_version_id: cfuVariantItemVersionId(nodeId, wrap(cfu, index)),
        equivalence_checker_version: CFU_CHECKER_VERSION,
      });
}

/** The index `cfuAsk` resolved to, so the item version looked up is the instance served. */
function wrap(cfu: LessonCfuSpec, index: number): number {
  const length = cfuInstances(cfu).length;
  return length === 0 ? 0 : ((index % length) + length) % length;
}
