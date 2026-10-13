import { createProductAnswerChecker, PRODUCT_CHECKER_VERSION } from "@cr/components";
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
} from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import * as answerFormat from "./answerFormat";
import {
  answerKeypad,
  answerNotation,
  BOUND_INCLUSIVITY_NOTE,
  COMBINE_CONSTANTS_NOTE,
  COORDINATES_SWAPPED_NOTE,
  cfuNotation,
  cfuPlaceholder,
  EXACT_RADIAN_PLACEHOLDER,
  EXACT_TRIG_FORM_NOTE,
  EXACT_TRIG_VALUE_PLACEHOLDER,
  EXPONENT_LOWEST_TERMS_NOTE,
  EXPONENT_NOTATION_PLACEHOLDER,
  EXTRA_EXCLUSION_NOTE,
  EXTRA_SOLUTION_NOTE,
  FRACTION_BAR_PLACEHOLDER,
  FRACTION_PLACEHOLDER,
  GENERIC_MISS_NOTE,
  GENERIC_PLACEHOLDER,
  hasLoadBearingStar,
  IMPLICIT_PRODUCT_PLACEHOLDER,
  INCOMPLETE_SOLUTION_SET_NOTE,
  INTERVAL_PLACEHOLDER,
  isAbsoluteValueAnswerText,
  isCoordinatePairAnswerText,
  isIntervalAnswerText,
  isPiAnswerText,
  isPlainFractionAnswerText,
  isPositiveExponentAnswerText,
  isRadicalAnswerText,
  isSolutionRosterAnswerText,
  MISSING_EXCLUSION_NOTE,
  MULTIPLE_CHOICE_PLACEHOLDER,
  missNote,
  NUMERIC_LITERAL_PLACEHOLDER,
  normalizeAcceptedAnswer,
  normalizeTextSubmission,
  PI_EXPRESSION_PLACEHOLDER,
  PI_FRACTION_PLACEHOLDER,
  POINT_NOTATION_NOTE,
  POINT_PLACEHOLDER,
  POSITIVE_EXPONENT_NOTE,
  POSITIVE_EXPONENT_PLACEHOLDER,
  practicePlaceholder,
  RADICAL_PLACEHOLDER,
  RADICAL_QUOTIENT_PLACEHOLDER,
  RADICAL_SUM_PLACEHOLDER,
  RATIONAL_EXCLUSIONS_PLACEHOLDER,
  RATIONAL_EXPRESSION_PLACEHOLDER,
  RATIONAL_POLYNOMIAL_PLACEHOLDER,
  type RadicalShape,
  REDUCED_FRACTION_NOTE,
  REDUCED_FRACTION_PLACEHOLDER,
  radicalShape,
  SET_BUILDER_NOTATION_NOTE,
  SET_BUILDER_PLACEHOLDER,
  SIMPLIFIED_RADICAL_NOTE,
  SOLUTION_SET_FRACTION_PLACEHOLDER,
  SOLUTION_SET_PLACEHOLDER,
  VARIABLE_RADICAL_PLACEHOLDER,
} from "./answerFormat";
import { cfuInstances } from "./cfuVariants";
import { d2LessonByNode } from "./d2";
import { LESSON_DOMAINS } from "./domains";
import { previewOf } from "./mathPreviewParser";
import { checkerVersionForItem, practiceChecker } from "./practiceChecker";

/**
 * Every item any of the three answer surfaces can serve.
 *
 * A LIST, and it is the thing a new domain gets left off: D3 shipped its pool, its loader and its
 * registry entry, and every sweep in this file went on measuring five domains and passing. The
 * cohort that mattered was the one it was missing, because D3 is the first pool to serve a plain
 * `interval`, so the placeholder recorded here as reaching nobody was reaching a learner while the
 * assertion below still said it was not. Keep this in step with `PRODUCT_POOL_ITEMS` in
 * `practiceChecker.ts`, which is the list that decides what is gradable at all.
 *
 * D6 arrived the same way D3 did and was added on the wiring pass rather than after it, so no
 * D6 answer-format claim was ever measured by a green run: three of its nodes answer in
 * interval notation, which is the cohort D3's omission left unmeasured for exactly the same
 * reason.
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
];

/**
 * Every authored check-your-understanding card in the tree, with the node and the domain it
 * belongs to.
 *
 * Derived from `LESSON_DOMAINS` rather than written down, because a hand-written list of
 * domain maps is exactly what goes stale: the same six maps were listed three times in this
 * file, and one of the three omitted D8, leaving EL.1's and EL.3's `accepted[0]` convention
 * pinned by nothing while the sweep that was supposed to pin it passed. A new domain is one
 * entry in `domains.ts` and reaches every sweep built on this.
 */
const AUTHORED_CFUS = LESSON_DOMAINS.flatMap((domain) =>
  Object.entries(domain.lessonByNode).flatMap(([nodeId, lesson]) =>
    lesson?.cfu ? [{ domainId: domain.id, nodeId, cfu: lesson.cfu }] : [],
  ),
);

/**
 * Every question the check-your-understanding card can RENDER, authored and re-asked alike.
 *
 * The population above is the authored packs, and for most of this file that is the right
 * one: an authored `accepted` list is a piece of content, and the sweeps over it are asking
 * whether the content is well formed. But the thing that ADVERTISES a notation to a learner
 * is a rendered instance, and a pack with a `variants` block renders several — the authored
 * question first and then a computed re-ask per rotation, each with its own accepted list
 * built by a registered speller rather than by hand.
 *
 * Scoped to authored packs, every sweep in this file and in `answerKeypad.test.ts` was silent
 * about all of them. That is a population gap and not a weakness in the assertions: the
 * assertions were exact enough that when POL.3's and POL.4's bracket spellings were briefly
 * pushed into the AUTHORED lists, both files went red naming those two nodes. They could see
 * the defect; they were just not looking at the surface that had it.
 *
 * So the population is derived from the same registry and widened to the instances, and the
 * defect it exists for is the one below: POL.4's re-ask answers `-4, 2/5` and was showing an
 * interval placeholder with no keypad at all.
 */
const RENDERED_CFU_ASKS = AUTHORED_CFUS.flatMap(({ domainId, nodeId, cfu }) =>
  cfuInstances(cfu).map((ask, index) => ({
    domainId,
    nodeId,
    cfu,
    ask,
    /** The authored question is index 0 by construction; everything after it is a re-ask. */
    isReAsk: index > 0,
    label: `${nodeId}[${index}]`,
  })),
);

/** A spec carrying only a simplification profile, the shape most of these cases need. */
const profile = (simplification: string | undefined) => ({ simplification });

/** A radical answer over a CONSTANT radicand: the family that splits three ways. */
const isConstantRadical = (item: FrozenItem): boolean =>
  item.answer.answer_spec.simplification === "simplified_radical" &&
  (item.answer.allowed_symbols?.length ?? 0) === 0;

const shapeOf = (item: FrozenItem): RadicalShape => radicalShape(item.answer.answer_key);

describe("missNote", () => {
  it("names the fix for a form miss, per simplification profile", () => {
    expect(missNote(profile("reduced_fraction"), "not_simplified")).toBe(
      REDUCED_FRACTION_NOTE,
    );
    expect(missNote(profile("combined_constants"), "not_simplified")).toBe(
      COMBINE_CONSTANTS_NOTE,
    );
    expect(missNote(profile("combined_constants"), "wrong_representation")).toBe(
      COMBINE_CONSTANTS_NOTE,
    );
    // The two radical profiles, which are the two largest in the tree and had no branch at
    // all. The derived sweep below is what stops the next one being missed; these two lines
    // pin the literals so a rename cannot quietly hand either of them the other's sentence.
    expect(missNote(profile("simplified_radical"), "not_simplified")).toBe(
      SIMPLIFIED_RADICAL_NOTE,
    );
    expect(missNote(profile("canonical_exact_trig_value"), "not_simplified")).toBe(
      EXACT_TRIG_FORM_NOTE,
    );
    // Both are declared `representation: "exact"`, so a rounded decimal arrives as a form
    // miss under the other code and must land on the same sentence.
    expect(missNote(profile("simplified_radical"), "wrong_representation")).toBe(
      SIMPLIFIED_RADICAL_NOTE,
    );
    expect(missNote(profile("canonical_exact_trig_value"), "wrong_representation")).toBe(
      EXACT_TRIG_FORM_NOTE,
    );
  });

  it("falls back to the generic line for a value miss or an unmapped profile", () => {
    // A wrong VALUE must never be explained as a formatting problem.
    expect(missNote(profile("combined_constants"), "value_mismatch")).toBe(
      GENERIC_MISS_NOTE,
    );
    expect(missNote(profile("combined_polynomial"), "not_simplified")).toBe(
      GENERIC_MISS_NOTE,
    );
    expect(missNote(undefined, "not_simplified")).toBe(GENERIC_MISS_NOTE);
  });

  /**
   * The gating regression: `COMBINE_CONSTANTS_NOTE` keys off the served item's
   * `simplification`, so it only ever reaches a learner if a real item actually
   * carries the `combined_constants` profile. While `d1.num-3.l3` was still on
   * `combined_polynomial` this note was dead code and the student saw the generic
   * line instead.
   */
  it("fires for the real d1.num-3.l3 items, using their served answer spec", () => {
    const instances = D1_PRACTICE_ITEMS.filter((i) => i.template_id === "d1.num-3.l3");
    expect(instances.length).toBeGreaterThan(0);

    for (const item of instances) {
      expect(
        missNote(item.answer.answer_spec, "not_simplified"),
        item.item_version_id,
      ).toBe(COMBINE_CONSTANTS_NOTE);
    }
  });

  /**
   * The same gate, for EXP.1. `positive_exponents` had no branch at all, so a learner
   * who did the arithmetic right and wrote `x^-2` was told "Not quite. Try again, reveal
   * a hint, or work through it." -- a line that points at the one thing that was not
   * wrong. Driven by the REAL served items, so it cannot pass on a hand-made profile
   * while every shipped item carries a different one.
   */
  it("names the fix for a negative exponent, on the real EXP.1 items", () => {
    expect(missNote(profile("positive_exponents"), "not_simplified")).toBe(
      POSITIVE_EXPONENT_NOTE,
    );

    const exp1 = D2_PRACTICE_ITEMS.filter(
      (item) =>
        item.node_id === "EXP.1" &&
        item.answer.answer_spec.simplification === "positive_exponents",
    );
    expect(exp1.length).toBeGreaterThan(0);
    for (const item of exp1) {
      expect(
        missNote(item.answer.answer_spec, "not_simplified"),
        item.item_version_id,
      ).toBe(POSITIVE_EXPONENT_NOTE);
      expect(
        practicePlaceholder(item.answer.answer_spec, item.answer.allowed_symbols),
        item.item_version_id,
      ).toBe(POSITIVE_EXPONENT_PLACEHOLDER);
    }
  });

  /**
   * End to end through the app's OWN checker, because the note is only useful if the
   * reason code it keys on is the one a real submission produces. A learner who reduces
   * `x^7 * x^-9` correctly and writes `x^-2` has the value right and the form wrong.
   */
  it("is the line the app actually shows for a negative-exponent submission", () => {
    const item = D2_PRACTICE_ITEMS.find(
      (candidate) =>
        candidate.node_id === "EXP.1" &&
        candidate.answer.answer_spec.simplification === "positive_exponents" &&
        String(candidate.answer.answer_key).startsWith("1/"),
    );
    if (!item) {
      throw new Error("no EXP.1 item whose answer is a reciprocal");
    }
    // `1/x^2` -> the equal-but-unsimplified `x^-2` the learner writes instead.
    const negative = String(item.answer.answer_key).replace(/^1\/(\w+)\^(\d+)$/, "$1^-$2");
    expect(negative).not.toBe(String(item.answer.answer_key));

    const result = practiceChecker({
      raw_answer: negative,
      item_version_id: item.item_version_id,
      equivalence_checker_version: checkerVersionForItem(item),
    });
    expect(result.status, negative).toBe("incorrect");
    expect(result.reason_code, negative).toBe("not_simplified");
    expect(missNote(item.answer.answer_spec, result.reason_code)).toBe(
      POSITIVE_EXPONENT_NOTE,
    );
  });

  /** A wrong VALUE on an EXP.1 item must still not be explained as a formatting problem. */
  it("does not blame the form when an EXP.1 answer is simply wrong", () => {
    expect(missNote(profile("positive_exponents"), "value_mismatch")).toBe(
      GENERIC_MISS_NOTE,
    );
  });

  /**
   * The `expr_builder` rational-power shape reports its own form miss, because a
   * widget answer has no text simplification profile to key on. Without this a
   * student who correctly summed 1/3 + 1/6 to 3/6 saw only the generic line.
   */
  it("names the fix for an unreduced widget exponent, whatever the profile", () => {
    for (const simplification of [undefined, "none", "reduced_fraction"]) {
      expect(missNote(profile(simplification), "exponent_not_reduced")).toBe(
        EXPONENT_LOWEST_TERMS_NOTE,
      );
    }
  });

  it("does not explain an ordinary widget field miss as a formatting problem", () => {
    expect(missNote(profile("none"), "numerator_mismatch")).toBe(GENERIC_MISS_NOTE);
    expect(missNote(profile("none"), "base_mismatch")).toBe(GENERIC_MISS_NOTE);
  });

  /**
   * A D5 rational answer is graded on two halves, so a miss on the exclusions must say
   * which half fell short. Told only "not quite", a student who reduced perfectly would
   * re-derive the expression they already had right.
   */
  it("names which half of a rational answer missed", () => {
    expect(missNote(profile("none"), "missing_exclusion")).toBe(MISSING_EXCLUSION_NOTE);
    expect(missNote(profile("none"), "extra_exclusion")).toBe(EXTRA_EXCLUSION_NOTE);
  });

  /**
   * A RAT.6 solution set is graded as a SET, and the miss that matters is the extraneous
   * root: the algebra was right and the check was skipped. Told only "not quite", the
   * student would re-solve an equation they already solved correctly.
   */
  it("points a solution-set miss at the check rather than the algebra", () => {
    expect(missNote(profile("none"), "extra_solution")).toBe(EXTRA_SOLUTION_NOTE);
    expect(missNote(profile("none"), "incomplete_solution_set")).toBe(
      INCOMPLETE_SOLUTION_SET_NOTE,
    );
  });

  /**
   * `wrong_notation` means the SET or the pair may be right and only the writing is off,
   * so the note has to name the notation this item wanted. It is reported by two unrelated
   * answer types, which is why the spec, not the reason code alone, decides the wording.
   */
  it("names the notation a form miss wanted, per answer type", () => {
    expect(missNote({ required_notation: "set_builder" }, "wrong_notation")).toBe(
      SET_BUILDER_NOTATION_NOTE,
    );
    expect(missNote({ answer_type: "point" }, "wrong_notation")).toBe(POINT_NOTATION_NOTE);
    // No notation to name: better generic than confidently wrong.
    expect(missNote(profile("none"), "wrong_notation")).toBe(GENERIC_MISS_NOTE);
  });

  it("names a swapped coordinate pair rather than calling it a wrong point", () => {
    expect(missNote({ answer_type: "point" }, "coordinates_swapped")).toBe(
      COORDINATES_SWAPPED_NOTE,
    );
  });

  /**
   * `wrong_bound_inclusivity` is the interval verdict that says the SOLVING was right, so the
   * generic line points at the only part that was not wrong. It had no branch at all, which
   * discarded exactly the distinction the interval comparator goes out of its way to report
   * separately from a plain value miss.
   */
  it("names the bracket when an interval's endpoints are right", () => {
    expect(missNote({ answer_type: "interval" }, "wrong_bound_inclusivity")).toBe(
      BOUND_INCLUSIVITY_NOTE,
    );
    // Reported by the set-builder path over the same comparator, so it must land there too.
    expect(
      missNote(
        { answer_type: "interval", required_notation: "set_builder" },
        "wrong_bound_inclusivity",
      ),
    ).toBe(BOUND_INCLUSIVITY_NOTE);
    // A wrong VALUE on an interval item is still not explained as a bracket problem.
    expect(missNote({ answer_type: "interval" }, "value_mismatch")).toBe(GENERIC_MISS_NOTE);
  });

  /**
   * End to end through the REAL comparator, because the note is only useful if
   * `wrong_bound_inclusivity` is the code a real submission produces. A learner who solves
   * $|x - 2| \le 5$ correctly and writes the open interval has the endpoints right.
   */
  it("is the line the app shows for a right-endpoints-wrong-bracket interval", () => {
    const definition = intervalDefinition("[-3, 7]");
    const checker = createProductAnswerChecker({
      itemVersions: [
        { item_version_id: "interval-probe", answer: definition },
      ] as unknown as Parameters<typeof createProductAnswerChecker>[0]["itemVersions"],
    });
    const result = checker({
      raw_answer: "(-3, 7)",
      item_version_id: "interval-probe",
      equivalence_checker_version: PRODUCT_CHECKER_VERSION,
    });
    expect(result.status).toBe("incorrect");
    expect(result.reason_code).toBe("wrong_bound_inclusivity");
    expect(missNote(definition.answer_spec, result.reason_code)).toBe(
      BOUND_INCLUSIVITY_NOTE,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* A form miss names its own fix, over a population derived from the tree       */
/* -------------------------------------------------------------------------- */

/**
 * Every simplification profile any served item carries, read off the pools rather than
 * written down.
 *
 * The block above has fixed the same defect twice by hand — `positive_exponents` at
 * "names the fix for a negative exponent" and `wrong_bound_inclusivity` at "names the
 * bracket" — and both times the population was "the profiles somebody remembered". Neither
 * radical profile appeared in it in EITHER direction: not asserted to name a fix, and not
 * declared as an exemption the way `combined_polynomial` is. They are the two largest
 * profiles in the tree, and both fell through to the generic line.
 *
 * So the population is derived. A profile that arrives with a new domain is in this sweep
 * the day its pool is registered, and it has to either name its own fix or be argued for by
 * name in one of the two lists below.
 */
const SERVED_SIMPLIFICATION_PROFILES: readonly string[] = [
  ...new Set(
    SERVED_ITEMS.map((item) => String(item.answer.answer_spec.simplification ?? "none")),
  ),
].sort();

/**
 * Profiles that owe no note of their own, with the reason each owes none.
 *
 * `none` is the whole list because it is the only profile that declares no form
 * requirement at all: an item on it can still report a form miss (`missing_exclusion`,
 * `wrong_bound_inclusivity`, `coordinates_swapped`), and every one of those is named by its
 * reason code higher up in {@link missNote}, where the answer TYPE rather than the profile
 * is what decides the wording.
 */
const NO_FORM_TO_NAME: Readonly<Record<string, string>> = {
  none: "declares no simplification requirement, so a form miss on one of its items is named by its reason code rather than by the profile",
};

/**
 * Profiles that owe a note and do not have one. A measured gap, listed rather than quietly
 * dropped out of the population, because a profile nobody has got to and a profile somebody
 * forgot look identical from outside this sweep.
 *
 * This is not an exemption in the sense the other list is: `combined_polynomial` really does
 * leave a learner who submits an unexpanded product with the generic line. It is here so
 * that the gap is a listed, failing-both-ways fact rather than an absence. The assertion
 * below fails the moment it acquires a note, which is the signal to delete this entry.
 */
const NAMED_GAP_CARRIED_FORWARD: Readonly<Record<string, string>> = {
  combined_polynomial:
    "181 served items across six domains, pinned to the generic line by the 'unmapped profile' case above; out of scope for the round that added the two radical branches and reported as an open finding",
};

/**
 * An equal-valued answer the profile's own canonical form rejects, built from the item's
 * OWN key so the rewriting is a fact about the served item rather than a literal.
 *
 * Returns `null` for an item whose key the rewriting does not fit; the sweep scans for the
 * first item where it does, and floors the count so it cannot pass having found none.
 */
const UNSIMPLIFIED_REWRITING: Readonly<
  Record<string, (item: FrozenItem) => string | null>
> = {
  // 3/5 -> 6/10: the same number, not in lowest terms.
  reduced_fraction: (item) => {
    const match = /^(-?\d+)\s*\/\s*(\d+)$/.exec(String(item.answer.answer_key ?? ""));
    return match ? `${Number(match[1]) * 2}/${Number(match[2]) * 2}` : null;
  },
  // 1/x^2 -> x^-2: the arithmetic done, the negative exponent left in.
  positive_exponents: (item) => {
    const match = /^1\/([a-z])\^(\d+)$/.exec(String(item.answer.answer_key ?? ""));
    return match ? `${match[1]}^-${match[2]}` : null;
  },
  // 6x + 14 -> 6x + 14 + 0: two plain numbers where the profile wants one.
  combined_constants: (item) => `${item.answer.answer_key} + 0`,
  simplified_radical: (item) => squareUnderTheRoot(item),
  canonical_exact_trig_value: (item) => squareUnderTheRoot(item),
};

/**
 * The item's own key with a perfect square pushed back under every integer root and the
 * term halved to compensate: `sqrt(3)/2` becomes `1*sqrt(12)/2/2`, which is the same number.
 *
 * This is the rewriting Finding 1 is about, and it is deliberately applied to EVERY served
 * item rather than to the two radical profiles, because the population that owes a stated
 * form requirement is the one that exhibits the behaviour — refusing this answer — and not
 * the one that happens to be built on a particular profile string.
 */
function squareUnderTheRoot(item: FrozenItem): string | null {
  const key = String(item.answer.answer_key ?? "");
  if (!/sqrt\(\d+\)/.test(key)) {
    return null;
  }
  return key.replace(
    /(\d*)\*?sqrt\((\d+)\)/g,
    (_whole, coefficient: string, radicand: string) =>
      `${coefficient === "" ? 1 : Number(coefficient)}*sqrt(${Number(radicand) * 4})/2`,
  );
}

/** Grade a raw submission against a served item through the surface's own checker. */
function gradeAgainst(item: FrozenItem, rawAnswer: string) {
  return practiceChecker({
    raw_answer: rawAnswer,
    item_version_id: item.item_version_id,
    equivalence_checker_version: checkerVersionForItem(item),
  });
}

describe("a form miss names its own fix, per profile, over the served pools", () => {
  it("derives its population from the pools and does not stop at the profiles someone listed", () => {
    // Floor: the sweep cannot pass over an empty or shrunken set of profiles.
    expect(SERVED_SIMPLIFICATION_PROFILES.length).toBeGreaterThanOrEqual(6);

    const listed = [
      ...Object.keys(NO_FORM_TO_NAME),
      ...Object.keys(NAMED_GAP_CARRIED_FORWARD),
    ];
    const owing = SERVED_SIMPLIFICATION_PROFILES.filter((name) => !listed.includes(name));

    // Composition, not size: the lists cannot grow until they have swallowed the population.
    expect(owing.length).toBeGreaterThanOrEqual(4);

    // Composition again, and this is the one the old block would have failed. Three profiles
    // were hand-written into it; the sweep is only wider than that layer if what is left
    // after removing them is not empty.
    const beyondTheHandWrittenThree = owing.filter(
      (name) =>
        !["reduced_fraction", "positive_exponents", "combined_constants"].includes(name),
    );
    expect(beyondTheHandWrittenThree.length).toBeGreaterThanOrEqual(2);
  });

  it("names a distinct fix for every profile that is not on a list", () => {
    const listed = [
      ...Object.keys(NO_FORM_TO_NAME),
      ...Object.keys(NAMED_GAP_CARRIED_FORWARD),
    ];
    const notes = new Map<string, string>();
    for (const name of SERVED_SIMPLIFICATION_PROFILES) {
      if (listed.includes(name)) {
        continue;
      }
      const note = missNote(profile(name), "not_simplified");
      expect(note, `${name} falls through to the generic line`).not.toBe(GENERIC_MISS_NOTE);
      notes.set(name, note);
    }
    // "Names ITS OWN fix": two profiles sharing one sentence is one of them being explained
    // by the other's rule.
    expect(new Set(notes.values()).size, [...notes.keys()].join(", ")).toBe(notes.size);
  });

  it("keeps both lists honest in both directions", () => {
    const noForm = Object.keys(NO_FORM_TO_NAME);
    const gaps = Object.keys(NAMED_GAP_CARRIED_FORWARD);

    expect(noForm.filter((name) => gaps.includes(name))).toEqual([]);

    for (const name of [...noForm, ...gaps]) {
      // Direction one: an entry that has stopped describing anything in the tree fails, so a
      // renamed or retired profile cannot sit here exempting nothing.
      expect(
        SERVED_SIMPLIFICATION_PROFILES,
        `${name} is listed but no served item carries it`,
      ).toContain(name);
      // Direction two: an entry that has quietly acquired a note fails, so neither list can
      // go on excusing something it has stopped describing.
      expect(
        missNote(profile(name), "not_simplified"),
        `${name} now names a fix; take it off its list`,
      ).toBe(GENERIC_MISS_NOTE);
    }
  });

  /**
   * The note is only worth anything if `not_simplified` is a verdict a REAL submission
   * against a REAL served item can produce, so every profile that owes a note has to show
   * one. A profile whose rewriting never lands is a profile whose branch is untested, which
   * is how the two radical profiles went unnoticed in the first place.
   */
  it("reaches each profile's note through the production checker on a served item", () => {
    const listed = [
      ...Object.keys(NO_FORM_TO_NAME),
      ...Object.keys(NAMED_GAP_CARRIED_FORWARD),
    ];
    const owing = SERVED_SIMPLIFICATION_PROFILES.filter((name) => !listed.includes(name));

    // Set equality, so a new profile cannot join the population without a rewriting that
    // demonstrates its verdict, and a rewriting cannot outlive the profile it was written for.
    expect([...owing].sort()).toEqual(Object.keys(UNSIMPLIFIED_REWRITING).sort());

    for (const name of owing) {
      const rewrite = UNSIMPLIFIED_REWRITING[name];
      if (!rewrite) {
        throw new Error(`no rewriting for ${name}`);
      }
      let reached = 0;
      let witness = "";
      for (const item of SERVED_ITEMS) {
        if (String(item.answer.answer_spec.simplification ?? "none") !== name) {
          continue;
        }
        const submission = rewrite(item);
        if (submission === null) {
          continue;
        }
        const result = gradeAgainst(item, submission);
        if (result.status !== "incorrect" || result.reason_code !== "not_simplified") {
          continue;
        }
        reached += 1;
        if (witness === "") {
          witness = `${item.item_version_id}: ${item.answer.answer_key} <- ${submission}`;
        }
        expect(
          missNote(item.answer.answer_spec, result.reason_code),
          `${item.item_version_id} is told nothing about the form it missed`,
        ).toBe(missNote(profile(name), "not_simplified"));
      }
      // Floor per profile: a sweep that found no witness has asserted nothing about it.
      expect(
        reached,
        `no served ${name} item was made to report not_simplified`,
      ).toBeGreaterThan(0);
      expect(witness).not.toBe("");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* A prompt states the form its own checker enforces                            */
/* -------------------------------------------------------------------------- */

/**
 * What counts as telling the learner the root has to be taken as far as it goes.
 *
 * Three idioms are already in the tree and all three say the same thing: D2 and D10 write
 * *"as a simplified radical"*, `d2.rad2.unlike.l2` writes *"as simply as it will go"*, and a
 * prompt may instead state the rule outright.
 */
const STATES_THE_SIMPLIFIED_FORM = /simplif|simplest|as simply as/i;

/**
 * There is deliberately NO exemption list here, and that is the stronger claim.
 *
 * This sweep briefly carried one, holding `d9.trg9.sum-exact.l1` while the lane that found
 * the defect worked in three other nodes. Once its prompt was fixed the list emptied, and an
 * empty exemption list asserted in both directions is exactly the vacuous shape
 * `qa-verification.mdc` warns about: the loop runs zero times and reports green having
 * checked nothing. So the list is gone rather than left standing at zero, and every item in
 * the population below owes the property with no way to opt out.
 *
 * If a future item genuinely cannot state the rule, the list comes back WITH its both-ways
 * assertions — an entry that stops refusing the answer fails, and an entry whose prompt
 * starts stating the rule fails. Re-adding it is meant to cost that much, because the reason
 * this defect reached four prompts is that nothing was watching the whole population at once.
 */

describe("a prompt states the radical form its own checker enforces", () => {
  /**
   * The population is every served item that REFUSES an equal-valued answer differing only
   * by a square left under a root, measured through the production checker rather than
   * filtered by profile string. A learner who obeys every printed instruction and is still
   * marked wrong is the defect; which profile the item is built on is an implementation
   * detail of it.
   */
  const refusesASquareUnderTheRoot = SERVED_ITEMS.filter((item) => {
    const submission = squareUnderTheRoot(item);
    if (submission === null) {
      return false;
    }
    const result = gradeAgainst(item, submission);
    return result.status === "incorrect" && result.reason_code === "not_simplified";
  });

  it("has a population to sweep at all", () => {
    expect(refusesASquareUnderTheRoot.length).toBeGreaterThanOrEqual(60);
    const templates = new Set(refusesASquareUnderTheRoot.map((item) => item.template_id));
    // Composition: more than one domain's worth, so the sweep cannot pass having collapsed
    // onto whichever pool happens to be first in the list.
    expect(templates.size).toBeGreaterThanOrEqual(10);
    expect(
      new Set([...templates].map((id) => id.split(".")[0])).size,
    ).toBeGreaterThanOrEqual(3);
  });

  it("says so in the prompt, for every item that refuses it, with nothing exempted", () => {
    const silent = new Set<string>();
    for (const item of refusesASquareUnderTheRoot) {
      if (!STATES_THE_SIMPLIFIED_FORM.test(item.prompt)) {
        silent.add(item.template_id);
      }
    }
    expect([...silent].sort(), "graded by a rule the prompt never states").toEqual([]);
  });
});

/** A minimal `interval` item definition, the shape LIN.6 / FUN.4 answers are graded under. */
function intervalDefinition(answerKey: string) {
  return {
    answer_key: answerKey,
    answer_spec: {
      answer_type: "interval" as const,
      equivalence: "exact_value" as const,
      representation: "any" as const,
      simplification: "none",
      required_form: null,
      required_notation: "none" as const,
      precision: null,
      unit_policy: "none" as const,
    },
  };
}

describe("practicePlaceholder", () => {
  it("maps each simplification profile to its format guidance", () => {
    expect(practicePlaceholder(profile("reduced_fraction"))).toBe(
      REDUCED_FRACTION_PLACEHOLDER,
    );
    expect(practicePlaceholder(profile("simplified_radical"))).toBe(RADICAL_PLACEHOLDER);
    expect(practicePlaceholder(profile("none"))).toBe(GENERIC_PLACEHOLDER);
    expect(practicePlaceholder(undefined)).toBe(GENERIC_PLACEHOLDER);
  });

  /**
   * `simplified_radical` is one profile over three shapes, so the profile alone cannot pick
   * the line: the item's own answer key does. Same reading PR #209 used one layer down, where
   * a submit gate inferred "plain number" from `answer_type: "numeric"` and made 83 radical
   * instances unanswerable.
   */
  it("picks the radical line from the item's own answer key, not the profile", () => {
    const radical = profile("simplified_radical");
    expect(practicePlaceholder(radical, [], "9*sqrt(13)")).toBe(RADICAL_PLACEHOLDER);
    expect(practicePlaceholder(radical, [], "sqrt(3)/3")).toBe(
      RADICAL_QUOTIENT_PLACEHOLDER,
    );
    expect(practicePlaceholder(radical, [], "4*sqrt(6)+3*sqrt(5)")).toBe(
      RADICAL_SUM_PLACEHOLDER,
    );
    // A variable radicand still beats the shape: bars are the notation problem there.
    expect(practicePlaceholder(radical, ["x"], "abs(x^3)")).toBe(
      VARIABLE_RADICAL_PLACEHOLDER,
    );
    // And the shape is read only for a radical: a `/` in a fraction key means nothing here.
    expect(practicePlaceholder(profile("reduced_fraction"), [], "1/3")).toBe(
      REDUCED_FRACTION_PLACEHOLDER,
    );
  });

  /**
   * The notation-carrying D5 types. A set-builder domain has simplification `none`, so
   * without reading the spec's notation the learner would be shown "Your answer" for an
   * item that marks a correctly-valued interval answer wrong.
   */
  it("advertises the notation a set-builder, point, or solution-set item requires", () => {
    expect(
      practicePlaceholder({ answer_type: "interval", required_notation: "set_builder" }),
    ).toBe(SET_BUILDER_PLACEHOLDER);
    expect(practicePlaceholder({ answer_type: "point" })).toBe(POINT_PLACEHOLDER);
    expect(practicePlaceholder({ answer_type: "solution_set" })).toBe(
      SOLUTION_SET_PLACEHOLDER,
    );
  });

  /**
   * D7's classify families are the first practice items to be graded as a choose-one, and
   * they are typed into the same plain text field as everything else, so without this the
   * input would offer no clue that one of the OFFERED options is wanted rather than a
   * description of the answer in the learner's own words.
   */
  it("asks a choose-one item for one of the offered options", () => {
    expect(practicePlaceholder({ answer_type: "multiple_choice" })).toBe(
      MULTIPLE_CHOICE_PLACEHOLDER,
    );
  });

  /**
   * The interval category had NO branch: a LIN.6 learner met the generic "Your answer" and was
   * never told that infinity is written `inf`, or that a union has to be spaced. All three of
   * those limits were measured when the category was cleared and none of them was surfaced.
   * Set-builder stays ahead of it, being the notation-carrying sub-case of the type.
   */
  it("advertises interval notation, without stealing the set-builder sub-case", () => {
    expect(practicePlaceholder({ answer_type: "interval" })).toBe(INTERVAL_PLACEHOLDER);
    expect(
      practicePlaceholder({ answer_type: "interval", required_notation: "none" }),
    ).toBe(INTERVAL_PLACEHOLDER);
    expect(
      practicePlaceholder({ answer_type: "interval", required_notation: "set_builder" }),
    ).toBe(SET_BUILDER_PLACEHOLDER);
  });

  /**
   * `representation: fraction` is graded strictly (a decimal equal to the key is
   * `wrong_representation`) and is NOT the same rule as `reduced_fraction`, which additionally
   * demands lowest terms. Keeping them as two placeholders is what lets each state only what
   * its own items enforce; `reduced_fraction` stays ahead, being the stricter rule.
   */
  it("distinguishes a fraction representation from a lowest-terms requirement", () => {
    expect(practicePlaceholder({ representation: "fraction" })).toBe(FRACTION_PLACEHOLDER);
    expect(
      practicePlaceholder({
        representation: "fraction",
        simplification: "reduced_fraction",
      }),
    ).toBe(REDUCED_FRACTION_PLACEHOLDER);
  });

  /**
   * The numeric-exact representations stay generic ON PURPOSE. `representation: exact` with
   * `pi` (TRG.1) rejects a decimal, and `representation: decimal` (EL.1) rejects a fraction, so
   * a "single number" line would advertise, on those items, a form the grader marks wrong.
   */
  it("does not offer a plain-number line to an item that rejects one", () => {
    expect(practicePlaceholder({ answer_type: "numeric", representation: "exact" })).toBe(
      GENERIC_PLACEHOLDER,
    );
    expect(practicePlaceholder({ answer_type: "numeric", representation: "decimal" })).toBe(
      GENERIC_PLACEHOLDER,
    );
  });
});

describe("isPositiveExponentAnswerText", () => {
  it("fires on a power answer in every spelling EXP.1's CFU accepts", () => {
    for (const spelling of [
      "x^2",
      "1/x^2",
      "1/x^{2}",
      "1/(x^2)",
      "1/x**2",
      "\\frac{1}{x^2}",
      "\\dfrac{1}{x^{2}}",
      "x^3/y^4",
    ]) {
      expect(isPositiveExponentAnswerText(spelling), spelling).toBe(true);
    }
  });

  /**
   * Whole-string on purpose. Every one of these carries a `^` and none wants exponent guidance:
   * a sum is NUM.4's simplify, the bars are RAD.4's actual notation problem, and the exclusion
   * list is a RAT.3 answer whose separators the character class excludes.
   */
  it("does not fire on the other shapes that happen to contain a caret", () => {
    for (const spelling of [
      "x^2 + 5x",
      "5*x + x^2",
      "6*abs(x^3)",
      "6|x^3|",
      "(x+14)/(x^2+3x-4); x = -4, 1",
      "6*sqrt(2)/5",
      "\\frac{6\\sqrt{2}}{5}",
      "y = -3x - 1",
      "125",
      "1/3",
      // A negative exponent excludes itself, so the line can claim positive exponents.
      "x^-2",
      "x^{-2}",
    ]) {
      expect(isPositiveExponentAnswerText(spelling), spelling).toBe(false);
    }
  });

  /**
   * The gate, over every question the card can RENDER rather than every pack that authors one.
   *
   * Scoped to `AUTHORED_CFUS` this answered `['EXP.1']`, which is a true statement about the
   * packs and a silent one about the surface: POL.6's re-ask is keyed `20x^3`, the predicate
   * fires on it, and nothing in either file said so. What keeps that instance off the
   * positive-exponent line is not this predicate at all — POL.6's `check` is an `expression`
   * whose key carries a caret, so `answerNotation` tags it `exponent_notation` and `cfuNotation`
   * returns before the predicate is consulted.
   *
   * Both halves are asserted, because they are what makes the difference legible: which
   * instances the predicate SPEAKS to, and which of them it DECIDES. A change to either side —
   * the predicate's character class, or the spec rule above it — moves POL.6's line, and until
   * this population widened neither move had a red waiting for it.
   */
  it("speaks to three rendered questions and decides two of them", () => {
    const fired = RENDERED_CFU_ASKS.filter(({ ask }) =>
      ask.accepted.some(isPositiveExponentAnswerText),
    );
    expect(fired.map(({ label }) => label).sort()).toEqual([
      "EXP.1[0]",
      "EXP.1[1]",
      "POL.6[1]",
    ]);
    for (const entry of fired) {
      expect(
        cfuNotation(entry.cfu.check, entry.ask.accepted),
        `${entry.label} is keyed ${JSON.stringify(entry.ask.accepted[0])}`,
      ).toBe(entry.nodeId === "POL.6" ? "exponent_notation" : "positive_exponents");
    }
  });

  /**
   * WHY THE BARE MONOMIAL STAYS IN, measured on the bank rather than argued.
   *
   * {@link EXPONENT_NOTATION_PLACEHOLDER} records that NUM.4's `x^2 + 5x` is refused because
   * the positive-exponent line asserts a SIMPLIFICATION PROFILE and a sum has none, and it is
   * tempting to read the same reasoning onto a single term — `20x^3` is not a simplification of
   * anything either. It does not carry across, and the bank is where that shows: of the 34
   * served items that declare `simplification: "positive_exponents"`, 20 key a bare monomial
   * with no bar in it, because that is what `x^5 * x^-3` and `(x^2)^3` SIMPLIFY TO. A monomial
   * is the profile's ordinary output, not an answer outside it.
   *
   * So the population here is the profile's own cohort, derived from the served bank, and every
   * caret-carrying member of it has to satisfy the predicate: refusing a bare monomial would
   * show 19 of these 34 answers a line that names no negative exponent and take away the bar
   * key that writes the other 14. `1` is the one member with no notation at all (a net exponent
   * of zero) and it is named rather than filtered silently.
   */
  it("admits every bare monomial the profile's own cohort is keyed on", () => {
    const cohort = SERVED_ITEMS.filter(
      (item) => item.answer.answer_spec.simplification === "positive_exponents",
    );
    const keyOf = (item: FrozenItem): string =>
      (item.answer as { answer_key?: string }).answer_key ?? "";
    const monomials = cohort.filter((item) => !keyOf(item).includes("/"));
    const quotients = cohort.filter((item) => keyOf(item).includes("/"));
    // Three floors, because the claim below is a per-member assertion and an empty cohort
    // would satisfy it for free — and because the composition is the argument: this profile is
    // keyed on monomials MORE often than on quotients, which is the whole point.
    expect(cohort.length, "no served item declares the profile").toBeGreaterThan(30);
    expect(
      monomials.length,
      "the profile is no longer keyed on a bare monomial, so this argument has no subject",
    ).toBeGreaterThan(15);
    expect(
      quotients.length,
      "the profile is no longer keyed on a quotient",
    ).toBeGreaterThan(10);

    const withoutNotation = monomials.filter((item) => !/\^/.test(keyOf(item)));
    expect(
      [...new Set(withoutNotation.map(keyOf))],
      "a monomial key with no caret in it, other than the net-zero exponent",
    ).toEqual(["1"]);
    for (const item of monomials.filter((item) => /\^/.test(keyOf(item)))) {
      expect(
        isPositiveExponentAnswerText(keyOf(item)),
        `${item.item_version_id} is keyed ${JSON.stringify(keyOf(item))} under a positive-exponent profile and the predicate refuses it`,
      ).toBe(true);
    }
  });
});

/**
 * ONE derivation for all three surfaces. The CFU card and the two practice surfaces used to
 * read their placeholder off separate ladders, which is how EXP.1 ended up naming its notation
 * on practice and saying nothing on the check-your-understanding panel.
 */
describe("cfuPlaceholder", () => {
  it("hands a spec-carrying CFU exactly what practice would show for that spec", () => {
    for (const spec of [
      { answer_type: "numeric" as const, simplification: "reduced_fraction" },
      { answer_type: "numeric" as const, representation: "fraction" as const },
      { answer_type: "expression" as const, simplification: "positive_exponents" },
      { answer_type: "expression" as const, simplification: "simplified_radical" },
    ]) {
      expect(cfuPlaceholder(spec, []), JSON.stringify(spec)).toBe(
        practicePlaceholder(spec),
      );
    }
  });

  it("infers the notation from the accepted list when the CFU has no spec", () => {
    expect(cfuPlaceholder(undefined, ["1/x^2"])).toBe(POSITIVE_EXPONENT_PLACEHOLDER);
    // RAD.1's own canonical answer, which is a quotient. It was shown the product line.
    expect(cfuPlaceholder(undefined, ["6*sqrt(2)/5"])).toBe(RADICAL_QUOTIENT_PLACEHOLDER);
    // RAD.2's, which is a bare root and so reads as the product shape's degenerate case.
    expect(cfuPlaceholder(undefined, ["sqrt(10)"])).toBe(RADICAL_PLACEHOLDER);
    expect(cfuPlaceholder(undefined, ["6*abs(x^3)"])).toBe(VARIABLE_RADICAL_PLACEHOLDER);
    expect(cfuPlaceholder(undefined, ["3x+12"])).toBe(GENERIC_PLACEHOLDER);
  });

  /**
   * `cfuNotation` reads `accepted[0]` where practice reads the answer key, so the two are only
   * one dispatch if those agree. They do for all eight spec-carrying CFUs, and this pins it:
   * the day a pack lists a non-canonical spelling first, the shape read here would diverge
   * from the shape the check itself is graded on.
   *
   * The population is `AUTHORED_CFUS`, so it is the registry's. Written as its own list of
   * five domain maps it silently excluded D8, and the floor below — satisfied by the six it
   * could see — is why that never showed: EL.1 and EL.3 both carry a check, and neither was
   * compared. A floor constrains size and not shape, so the per-domain counts are asserted
   * beside it.
   *
   * D10 is named for exactly the reason D8 is, and the reason is the general one rather than
   * a fact about either domain: a total that only has to be big enough is met by any eight
   * CFUs, so a domain can be absent from a green run indefinitely. GEO.1 and GEO.2 both carry
   * a numeric check (`5` and `92`), so the shape is comparable on both and there is no ground
   * on which their absence would be legitimate.
   */
  it("reads a shape from the same string the spec-carrying CFUs are keyed on", () => {
    const checked: { domainId: string; nodeId: string }[] = [];
    for (const { domainId, nodeId, cfu } of AUTHORED_CFUS) {
      const check = cfu.check as { answer_key?: string } | undefined;
      if (check?.answer_key === undefined) {
        continue;
      }
      checked.push({ domainId, nodeId });
      expect(cfu.accepted?.[0], `${domainId}:${nodeId}`).toBe(check.answer_key);
    }
    expect(checked.length, "no CFU carries a check to compare").toBeGreaterThan(7);
    expect(
      checked.filter((entry) => entry.domainId === "d8").length,
      "the D8 checks are outside this sweep again",
    ).toBeGreaterThan(1);
    // Composition, not just size: the two D10 nodes by NAME, so the count cannot be met by
    // one node twice and a renamed node fails rather than being covered by its sibling.
    expect(
      checked
        .filter((entry) => entry.domainId === "d10")
        .map((entry) => entry.nodeId)
        .sort(),
      "the D10 checks are outside this sweep",
    ).toEqual(["GEO.1", "GEO.2"]);
  });

  /** Bars beat both a root and a caret: `6*abs(x^3)` carries all three and needs the bars. */
  it("names the bars first when an answer carries bars and a power", () => {
    expect(cfuPlaceholder(undefined, ["6*abs(x^3)", "6|x^3|"])).toBe(
      VARIABLE_RADICAL_PLACEHOLDER,
    );
  });

  it("falls back to the single-number line only for a numeric check", () => {
    expect(cfuPlaceholder({ answer_type: "numeric" }, ["-3"])).toBe(
      NUMERIC_LITERAL_PLACEHOLDER,
    );
    expect(cfuPlaceholder({ answer_type: "expression" }, ["3x+12"])).toBe(
      GENERIC_PLACEHOLDER,
    );
  });
});

/**
 * The spec-only branches of {@link answerNotation} that sit ABOVE the two key-derived tails,
 * mirrored by hand.
 *
 * Every `shownFor` below is a hand-written mirror of the dispatch, and for the tails that is
 * unavoidably a mirror of the ORDER as well: `fraction_bar` is only reached because
 * `reduced_fraction`, `positive_exponents`, `simplified_radical` and the `fraction`
 * representation all missed first, so a mirror that did not say so would claim NUM.F's `1/3`
 * and LF.1's `-1/2` as well. Written once because three entries need the same list, and
 * written as conditions on the SPEC rather than as a call to the dispatch, which is what lets
 * the agreement test below catch a reordering.
 *
 * The `answer_type` branches above the tails (`interval`, `point`, `solution_set`,
 * `multiple_choice`, `rational_answer`) are not here: each entry that uses this names the one
 * `answer_type` it is about, which excludes them all. {@link typeBranchesMiss} is for the one
 * rule that names no type of its own.
 */
/**
 * The `answer_type` branches that return ABOVE the key-reading tail, so an item declaring one
 * of them never reaches a rule that reads its key.
 *
 * The entries above name their own one `answer_type` and so exclude these implicitly.
 * `PI_EXPRESSION_PLACEHOLDER` cannot: its rule in the dispatch is deliberately NOT gated on a
 * type, so its mirror has to state the exclusion the dispatch gets from control flow.
 */
const TYPE_BRANCHES_ABOVE_THE_KEY_RULES: readonly string[] = [
  "interval",
  "point",
  "solution_set",
  "multiple_choice",
  "rational_answer",
];

const specOnlyBranchesMiss = (item: FrozenItem): boolean => {
  const spec = item.answer.answer_spec;
  return (
    spec.required_notation !== "set_builder" &&
    spec.simplification !== "reduced_fraction" &&
    spec.simplification !== "positive_exponents" &&
    spec.simplification !== "simplified_radical" &&
    spec.representation !== "fraction"
  );
};

/**
 * The five `answer_type` branches the dispatch runs before it reads any profile, mirrored for
 * the one rule below them that does NOT name a type of its own.
 *
 * `exact_trig_value` tests a simplification and a key and nothing else, so every served
 * instance being `numeric` is a fact about the D9 pool rather than about the dispatch. Writing
 * `answer_type === "numeric"` into that mirror would be a condition the dispatch does not have,
 * and it would disagree the day a trig value arrives under another type — which is precisely
 * the drift the agreement test exists to report.
 */
const typeBranchesMiss = (item: FrozenItem): boolean =>
  !["interval", "point", "solution_set", "multiple_choice", "rational_answer"].includes(
    String(item.answer.answer_spec.answer_type),
  );

/**
 * The `exact_trig_value` branch's own condition. Read by two entries, because the radian rule
 * sits directly below it and so is only reached when this one misses.
 */
const isExactTrigValueBranch = (item: FrozenItem): boolean =>
  item.answer.answer_spec.simplification === "canonical_exact_trig_value" &&
  String(item.answer.answer_key ?? "").includes("sqrt(");

/**
 * The `exact_radian` branch's own condition, read off `allowed_symbols` exactly as the dispatch
 * reads it.
 *
 * Shared by three entries, and it is shared because leaving it inline in one of them is how the
 * leak got out. The pi mirror below omitted this branch, so it claimed all 66 D9 radian items on
 * top of the 7 it really sees, and the sweep then graded `7*pi` against `d9.trg1.arc-length.l3`'s
 * `7pi` and reported a leak on a line no radian learner is ever shown. The dispatch was right and
 * the mirror was wrong, which is the direction that costs a whole investigation to discover.
 */
const isExactRadianBranch = (item: FrozenItem): boolean =>
  item.answer.answer_spec.answer_type === "numeric" &&
  (item.answer.allowed_symbols ?? []).includes("pi");

/**
 * Every rule above the pi tail missing, and the key carrying a pi. The two pi entries differ
 * only in the bar, so they share the prefix rather than each restating six conditions.
 */
const reachesThePiRules = (item: FrozenItem): boolean => {
  const spec = item.answer.answer_spec;
  const key = item.answer.answer_key;
  if (TYPE_BRANCHES_ABOVE_THE_KEY_RULES.includes(spec.answer_type)) {
    return false;
  }
  if (!specOnlyBranchesMiss(item)) {
    return false;
  }
  if (isExactTrigValueBranch(item)) {
    return false;
  }
  if (isExactRadianBranch(item)) {
    return false;
  }
  if (spec.answer_type === "numeric" && isPlainFractionAnswerText(key)) {
    return false;
  }
  if (spec.answer_type === "expression" && hasLoadBearingStar(key)) {
    return false;
  }
  if (spec.answer_type === "expression" && /(\^|\*\*)/.test(String(key ?? ""))) {
    return false;
  }
  return isPiAnswerText(key);
};

/** Which side of the pi split an item falls on, read off its key exactly as the dispatch does. */
const piKeyIsAFraction = (item: FrozenItem): boolean =>
  String(item.answer.answer_key ?? "").includes("/");

/**
 * The tags the dispatch reads off an item's own ANSWER KEY, and the cohorts they name.
 *
 * `radicalShape` established the reading: a `simplification` profile is a label over several
 * written shapes, so the shape has to come from the key. These five cohorts are the same
 * defect one layer further out — an answer type or a profile that says nothing at all about
 * the notation the answer is written in, so the item was handed `"none"` and the field went
 * bare over an answer nobody can type without being told two characters.
 *
 * Every claim below is made twice: once on a literal, so the rule is readable, and once over
 * the SERVED pool with a census, so it cannot pass against a shape nothing serves. The census
 * numbers are the measured inventory the sweep in `answerKeypad.test.ts` reported.
 */
describe("the dispatch reads the notation an answer key is written in", () => {
  const tagOf = (item: FrozenItem) =>
    answerNotation(
      item.answer.answer_spec,
      item.answer.allowed_symbols,
      item.answer.answer_key,
    );

  const templatesTagged = (tag: string): readonly string[] =>
    [
      ...new Set(
        SERVED_ITEMS.filter((item) => tagOf(item) === tag).map((i) => i.template_id),
      ),
    ].sort();

  const countTagged = (tag: string): number =>
    SERVED_ITEMS.filter((item) => tagOf(item) === tag).length;

  /**
   * A plain numeric whose exact value happens to be a fraction. RAD.3's negative-exponent
   * evaluations are the cohort: the graded skill is turning `2^-5` into a value, and the bar is
   * incidental to it — which is precisely why the learner has to be told the bar exists.
   */
  it("tags a numeric answer keyed as a fraction as written with a bar", () => {
    const plainNumeric = { answer_type: "numeric" as const };
    expect(answerNotation(plainNumeric, [], "1/32")).toBe("fraction_bar");
    expect(answerNotation(plainNumeric, [], "4/3")).toBe("fraction_bar");
    // An integer key on the SAME spec keeps the bare line: the tag is the key's, not the type's.
    expect(answerNotation(plainNumeric, [], "0")).toBe("none");
    expect(answerNotation(plainNumeric, [], "125")).toBe("none");
    // And the two stricter fraction rules still win, so neither is weakened into this one.
    expect(
      answerNotation(
        { representation: "fraction", simplification: "reduced_fraction" },
        [],
        "1/3",
      ),
    ).toBe("reduced_fraction");
    expect(answerNotation({ representation: "fraction" }, [], "-1/2")).toBe("fraction");

    // D9 widened this cohort by ten templates at once, and they are the domain's plain trig
    // VALUES: an exact value with no root in it is a bar and nothing else, so it takes this
    // line rather than `exact_trig_value`. TRG.4's four are the clearest case, since their
    // values come off Pythagorean triples and can never be radicals.
    //
    // `d9.trg3.coordinates.l3` left this cohort when its question was reshaped: it used to ask
    // for one exact coordinate of a heading's point and now asks for the heading itself, which
    // is a whole number of degrees. Its two L3 shapes had been the same question twice over,
    // and the one that moved is the one that changed sides of it.
    //
    // The tier rebalance moved this cohort by one template net and by eight ITEMS, and the two
    // numbers move for different reasons. `d9.trg4.evenodd-value.l2` retired, and the two new
    // L3s that replaced the retired pair both key a plain fraction: `compound-evaluate.l3`
    // multiplies two readings off a Pythagorean triple, and `compound-angle.l3` combines two
    // such triples, so neither can produce a root however it is drawn. The item count gains
    // more than the template count because `compound-angle.l3` alone contributes seven, its
    // rational values giving it the full retry depth that the radical-keyed shape it replaced
    // could not reach.
    expect(templatesTagged("fraction_bar")).toEqual([
      "d2.rad3.negeval.l3",
      "d5.rat5.level.l2",
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
    ]);
    // 8 before D9, 63 after, 61 once `coordinates.l3` started answering in degrees, and 69
    // after the tier rebalance: trigonometry's exact values are mostly fractions, so this went
    // from a cohort of two templates to the busiest notation line in the tree.
    expect(countTagged("fraction_bar")).toBe(69);
    // `d5.rat5.level.l2` is the proof that this is per ITEM and not per template: one of its
    // seven served instances is keyed `4/3` and the other six are keyed `0` or `3`.
    const level = SERVED_ITEMS.filter((i) => i.template_id === "d5.rat5.level.l2");
    expect(level.length).toBe(7);
    expect(level.filter((i) => tagOf(i) === "fraction_bar").length).toBe(1);
  });

  /** A solution set one of whose roots is a fraction, which the integer-roster line cannot say. */
  it("tags a solution set holding a fraction apart from a roster of integers", () => {
    const set = { answer_type: "solution_set" as const };
    expect(answerNotation(set, [], "{8/3}")).toBe("solution_set_fraction");
    expect(answerNotation(set, [], "{4}")).toBe("solution_set");
    expect(answerNotation(set, [], "{-1, 3}")).toBe("solution_set");

    expect(templatesTagged("solution_set_fraction")).toEqual([
      "d4.pol4.formula.l3",
      "d5.rat6.rate.l2",
    ]);
    expect(countTagged("solution_set_fraction")).toBe(13);
    // Same per-item split: `d5.rat6.rate.l2`'s seventh instance is keyed `{4}`.
    const rate = SERVED_ITEMS.filter((i) => i.template_id === "d5.rat6.rate.l2");
    expect(
      rate.filter((i) => tagOf(i) === "solution_set").map((i) => i.answer.answer_key),
    ).toEqual(["{4}"]);
    // The integer rosters keep their line, and there are a lot of them.
    expect(countTagged("solution_set")).toBeGreaterThan(80);
  });

  /** An expression whose `*` the grader cannot read without. See {@link hasLoadBearingStar}. */
  it("tags an expression whose star is load-bearing", () => {
    const expression = { answer_type: "expression" as const };
    expect(answerNotation(expression, ["m", "a", "q"], "log(m*a*q)")).toBe(
      "implicit_product",
    );
    // A coefficient against a letter is not load-bearing, and 26 templates depend on it not
    // being: `5*n + 25` grades as `5n + 25`.
    expect(answerNotation(expression, ["n"], "5*n + 25")).toBe("none");
    expect(answerNotation(expression, ["b", "m"], "5 * log(b) + log(m)")).toBe("none");

    expect(templatesTagged("implicit_product")).toEqual(["d8.el5.condense-sum.l2"]);
    expect(countTagged("implicit_product")).toBe(7);
  });

  /**
   * An expression whose key carries a CARET, in a shape no simplification profile names.
   *
   * `positive_exponents` claims both the caret and a simplification (no negative exponent
   * left), and D2's exponent items declare it, so they never reach this line. NUM.4's
   * `d1.num-4.l3b` keys `6*x^2 + 16` under a bare `expression` spec, and before this line
   * existed it fell through to `none`: a generic placeholder and no keypad, over an answer the
   * learner cannot type without a character no phone keyboard shows.
   *
   * Measured rather than assumed, across all seven served pools: 35 served expression items
   * carry a caret, 33 of them are D2's and already tagged `positive_exponents` by their spec,
   * and `d1.num-4.l3b` is the entire remainder. So this line is the complement of that
   * profile and not a second rule competing with it.
   */
  it("tags an expression whose key carries a caret no profile names", () => {
    const expression = { answer_type: "expression" as const };
    expect(answerNotation(expression, ["x"], "6*x^2 + 16")).toBe("exponent_notation");
    // A caret-free key on the SAME spec keeps the bare line: the tag is the key's.
    expect(answerNotation(expression, ["x"], "8*x + 9")).toBe("none");
    // The profile that also claims a simplification still wins, so it is not weakened.
    expect(
      answerNotation(
        { answer_type: "expression", simplification: "positive_exponents" },
        ["x"],
        "x^4",
      ),
    ).toBe("positive_exponents");
    // And a load-bearing star still wins, which is the precedence `cfuNotation` already had:
    // it reads `answerNotation` first and only then falls through to its own caret rule.
    expect(answerNotation(expression, ["m", "a", "q"], "log(m*a^2*q)")).toBe(
      "implicit_product",
    );

    // Three domains reach this tag. D4's polynomials are graded on FORM, so the caret in the key
    // is the only thing that could name their notation; D1's `d1.num-4.l3b` is here because its
    // squared-pile branch keys `6*x^2 + 16`; and D6's three key a caret for the same reason D4's
    // do — a difference quotient's numerator and a composition's squared inner function are both
    // answered as polynomials in written form.
    //
    // D4's three newest are the graph-reading shapes, and they are here for a reason worth
    // separating from the others: their key is a single MONOMIAL rather than a polynomial in
    // written form, because the answer to "give the leading term" is one term. The caret is what
    // earns them the key row all the same, and without the tag a learner would be asked for a
    // power with nothing on screen naming the notation.
    expect(templatesTagged("exponent_notation")).toEqual([
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
    ]);
    // Per ITEM: 70 from D4's ten templates, 2 from D1's one, and 21 from D6's three.
    expect(countTagged("exponent_notation")).toBe(93);
    // `d1.num-4.l3b` is the reason the per-item count matters: only its squared-pile branch keys
    // a caret, so its other draws sit in the `none` cohort and it contributes 2 of its 7 served
    // instances rather than all of them.
    const l3b = SERVED_ITEMS.filter((i) => i.template_id === "d1.num-4.l3b");
    expect(l3b.length).toBe(7);
    expect(l3b.filter((i) => tagOf(i) === "none").length).toBe(5);
    expect(l3b.filter((i) => tagOf(i) === "exponent_notation").length).toBe(2);
  });

  /**
   * An answer written in terms of pi, which is the tail of the key-reading group.
   *
   * The cohort is `d10.geo2.cylinder-volume-exact.l3` and every one of its seven served
   * instances. Before this tag existed all seven fell through to `none`: a generic "Your
   * answer", no key row, and — because `MathAnswerColumn` returns the bare field when the row
   * is empty — no live preview either, on the one served item whose answer cannot be written
   * without a symbol nothing on the card spells.
   *
   * The rule sits LAST, so it can only claim items that would otherwise be `none`. Both
   * directions of that are asserted here: a pi key takes the tag, and each earlier rule still
   * wins on a key that carries pi AND its own notation, so nothing above can be stolen.
   */
  it("tags an answer written in terms of pi, and yields to every rule above it", () => {
    const expression = { answer_type: "expression" as const };
    expect(answerNotation(expression, ["pi"], "588*pi")).toBe("pi_expression");
    // The starless spelling the grader also reads, so the tag is not an artifact of the star.
    expect(answerNotation(expression, ["pi"], "588pi")).toBe("pi_expression");
    // No pi, no tag: the rule is the key's, not the declared symbol list's.
    expect(answerNotation(expression, ["pi"], "588")).toBe("none");
    // Not gated on `answer_type`, because needing the spelling is a fact about the answer.
    expect(answerNotation({ answer_type: "numeric" }, [], "12*pi")).toBe("pi_expression");
    // A NAME and not a substring, or every symbol containing those letters would be claimed.
    expect(answerNotation(expression, ["pixel"], "3*pixel")).toBe("none");

    // Every rule above it still wins over a key that also carries pi. These are the collisions
    // the placement decision is about, and asserting them is what makes "last" a property
    // rather than a comment — a future reorder that promoted pi would fail here.
    expect(
      answerNotation({ answer_type: "numeric" }, [], "1/32"),
      "the bar rule was overtaken",
    ).toBe("fraction_bar");
    expect(answerNotation(expression, ["a", "pi"], "log(a*pi)")).toBe("implicit_product");
    expect(answerNotation(expression, ["pi"], "pi*r^2")).toBe("implicit_product");
    expect(answerNotation(expression, ["pi"], "2*pi^2")).toBe("exponent_notation");
    expect(answerNotation({ simplification: "simplified_radical" }, [], "sqrt(pi)")).toBe(
      "constant_radical_product",
    );

    expect(templatesTagged("pi_expression")).toEqual(["d10.geo2.cylinder-volume-exact.l3"]);
    expect(countTagged("pi_expression")).toBe(7);
    // The whole template, not a branch of it: unlike `d1.num-4.l3b`, every draw of this
    // generator keys `r^2 * h` against pi, so a count short of 7 means instances went missing.
    expect(
      SERVED_ITEMS.filter((i) => i.template_id === "d10.geo2.cylinder-volume-exact.l3")
        .length,
    ).toBe(7);
    // The pi-carrying keys in the bank, and the two tags they are split between. This used to
    // read `.toBe(7)` on the strength of «it is the ONLY pi-carrying key in the bank», which was
    // true when D10 was the only pool keying one and stopped being true the day D9 merged — 66
    // radian keys arrived and this assertion went on passing at 7 for exactly as long as its
    // pool list omitted D9. Both numbers are here so the two cohorts cannot drift into each
    // other: the radian rule taking a D10 item, or the pi rule taking a radian one, moves one of
    // them without moving the total.
    //
    // 73 became 70, and 66 became 63, when `d9.trg5.features.l3` stopped asking for the period.
    // That cell asked for the amplitude, the period or the midline of a printed rule, and two of
    // those three were a number the rule already showed; it now asks for the highest value, the
    // lowest, or the distance between them, all of which are whole numbers. The period is still
    // asked at TRG.5, by `period-radian.l2`, which is where the three radian keys went.
    const piKeys = SERVED_ITEMS.filter((item) => isPiAnswerText(item.answer.answer_key));
    // Then 6 more: `d9.trg7.signed-radian.l2`'s keys are the first negative radian keys in the
    // bank, which is a cohort the pi rule and the radian rule could plausibly have split
    // differently. The decomposition below is what says they did not: both numbers move by the
    // same 6, so the six arrived as radian keys and none of them crossed into the pi cohort.
    expect(piKeys.length, "a served key is written in pi").toBe(76);
    expect(
      piKeys.filter((item) => tagOf(item) === "exact_radian").length,
      "a radian key stopped reaching the radian tag",
    ).toBe(69);
    expect(
      piKeys.filter((item) => tagOf(item).startsWith("pi_expression")).length,
      "a served key is written in pi and does not reach the pi tag",
    ).toBe(7);
    // No served key reaches the fraction half of the split: every pi key that also carries a bar
    // is a radian one and declares `pi`, so the radian rule takes it first. TRG.1's and TRG.6's
    // CFUs are that cohort, and `answerKeypad.test.ts` is where they are swept.
    expect(countTagged("pi_expression_fraction")).toBe(0);
    expect(answerNotation(expression, ["pi"], "pi/4")).toBe("pi_expression_fraction");
    expect(answerNotation(expression, ["pi"], "7pi/9")).toBe("pi_expression_fraction");

    // The instance a review named as being shown its own answer, pinned by id because the
    // question it settles is about ONE item and a count cannot answer it. Its key IS `7pi` and
    // `7*pi` did grade against it, but the line it is shown is the radian one — the pi line's
    // cohort never included it, and the sweep that said otherwise was reading a mirror that had
    // skipped the radian branch. Both halves are asserted, so neither can drift back.
    const arcLength = SERVED_ITEMS.find(
      (item) => item.item_version_id === "d9.trg1.arc-length.l3:practice:141036",
    );
    if (!arcLength) {
      throw new Error("the named arc-length instance is no longer served");
    }
    expect(arcLength.answer.answer_key).toBe("7pi");
    expect(tagOf(arcLength)).toBe("exact_radian");
    expect(
      practicePlaceholder(
        arcLength.answer.answer_spec,
        arcLength.answer.allowed_symbols,
        arcLength.answer.answer_key,
      ),
      "the pi line reaches a radian item",
    ).toBe(EXACT_RADIAN_PLACEHOLDER);
  });

  /**
   * The D5 expression half, split three ways by what its own key carries. This is the cohort
   * the scope doc's §3.3 counted independently: 12 of the 20 `rational_answer` templates, 84 of
   * the 140 items, carry a bar; the other 8 templates are keyed as polynomials and want nothing.
   */
  it("splits the D5 expression half by the notation its own key carries", () => {
    const rational = { answer_type: "rational_answer" as const };
    expect(answerNotation(rational, ["x"], "(x - 8)/(x + 8)")).toBe("rational_quotient");
    expect(answerNotation(rational, ["x"], "3*x^2/2")).toBe("rational_quotient_power");
    expect(answerNotation(rational, ["x"], "(2*x + 19)/(x*(x + 6))")).toBe(
      "rational_quotient_product",
    );
    // A polynomial key wants no keys at all, and a star that is only a coefficient does not
    // change that: `5*x` grades as `5x`.
    expect(answerNotation(rational, ["x"], "x + 10")).toBe("rational_expression");
    expect(answerNotation(rational, ["x"], "5*x")).toBe("rational_expression");
    expect(answerNotation(rational, ["x"], "(x + 4)*(x - 5)")).toBe("rational_expression");

    const quotientTags = [
      "rational_quotient",
      "rational_quotient_power",
      "rational_quotient_product",
    ];
    const keyed = SERVED_ITEMS.filter((item) => quotientTags.includes(tagOf(item)));
    expect(keyed.length, "the measured §3.3 cohort").toBe(84);
    expect([...new Set(keyed.map((i) => i.template_id))].length).toBe(12);
    // Every one of the 84 really is keyed with a bar, and every rational item that is not is
    // left alone — the two halves together, so neither can drift.
    const rationalItems = SERVED_ITEMS.filter(
      (item) => item.answer.answer_spec.answer_type === "rational_answer",
    );
    expect(rationalItems.length).toBe(140);
    for (const item of rationalItems) {
      const hasBar = String(item.answer.answer_key ?? "").includes("/");
      expect(quotientTags.includes(tagOf(item)), item.item_version_id).toBe(hasBar);
    }
    expect(templatesTagged("rational_quotient_product")).toEqual([
      "d5.rat3.factorlcd.l3",
      "d5.rat3.unlike.l2",
    ]);
    expect(templatesTagged("rational_quotient_power")).toEqual(["d5.rat1.monomial.l1"]);
  });

  /**
   * A caret the `positive_exponents` line cannot claim. Reached by the CFU card alone today,
   * which is why it is asserted on `cfuPlaceholder` as well as on the shape.
   */
  it("tags a caret outside the positive-exponent profile as caret notation", () => {
    expect(cfuPlaceholder(undefined, ["x^2 + 5x"])).toBe(EXPONENT_NOTATION_PLACEHOLDER);
    // The whole-string power shape still takes the profile line, which is the stronger claim.
    expect(cfuPlaceholder(undefined, ["1/x^2"])).toBe(POSITIVE_EXPONENT_PLACEHOLDER);
    // And a caret inside bars or a root is still the bars' or the root's problem.
    expect(cfuPlaceholder(undefined, ["6*abs(x^3)"])).toBe(VARIABLE_RADICAL_PLACEHOLDER);
  });

  /** A bar in a composite answer, where none of the three fraction lines can be shown. */
  it("tags a bar inside a composite answer as written with a bar", () => {
    expect(cfuPlaceholder(undefined, ["-1/2, decreasing"])).toBe(FRACTION_BAR_PLACEHOLDER);
    expect(cfuPlaceholder(undefined, ["(x + 8)/(x + 5), x = 8, x = -5"])).toBe(
      FRACTION_BAR_PLACEHOLDER,
    );
    // RAD.1's canonical answer carries a bar too, and its notation problem is the ROOT.
    expect(cfuPlaceholder(undefined, ["6*sqrt(2)/5"])).toBe(RADICAL_QUOTIENT_PLACEHOLDER);
  });

  /**
   * The three keyless lines that already existed and that `cfuNotation` could not reach, so six
   * checks whose answers are an interval, a pair or a roster met the bare "Your answer". It is
   * the same unreachable-placeholder defect `docs/Native_Math_Input_Scope.md` §7.1 recorded for
   * EXP.1, and it adds no keys: writing the form is the graded skill in all three.
   *
   * The cohorts are asserted as NAMED node lists in both directions, because a pair of numbers
   * is where this can go wrong silently: `(15, 25)` (LIN.6, an interval) and `(2, -3)` (LF.4, a
   * point) are the same string, and telling a learner the wrong one is worse than telling them
   * nothing. What separates them is the pack: `pointForms` spells every point as `x = 2, y = -3`
   * as well, and LF.4's authored list carries that spelling while LIN.6's carries only the pair.
   */
  it.each([
    // D6's FUN.2 asks for a range in interval notation, so it joins D3's two.
    ["INTERVAL_PLACEHOLDER", INTERVAL_PLACEHOLDER, ["FUN.2", "LIN.4", "LIN.6"]],
    ["POINT_PLACEHOLDER", POINT_PLACEHOLDER, ["LF.4"]],
    // RAT.6's canonical answer is the bare `3` and its roster `{3}` is the spelling it lists
    // second, which is why the roster rule reads the whole accepted list and the two
    // one-character rules below it read only the canonical spelling.
    ["SOLUTION_SET_PLACEHOLDER", SOLUTION_SET_PLACEHOLDER, ["LIN.5", "POL.3", "RAT.6"]],
  ] as const)(
    "shows %s to exactly the CFUs whose answer is one",
    (_name, text, expected) => {
      expect(AUTHORED_CFUS.length, "no CFUs to census").toBeGreaterThan(15);
      expect(
        AUTHORED_CFUS.filter(({ cfu }) => cfuPlaceholder(cfu.check, cfu.accepted) === text)
          .map(({ nodeId }) => nodeId)
          .sort(),
      ).toEqual([...expected].sort());
    },
  );

  /** The two the pair-shaped guess above is deliberately NOT extended to, and why. */
  it("leaves a composite answer of unlike parts on the bare line", () => {
    // EL.2 is an asymptote EQUATION plus a point and EL.4 an inequality plus an equation, so
    // each of the three lines above would claim the whole answer is something it is not. Both
    // prompts already carry the literal typing they want, which is the guidance a placeholder
    // would be duplicating: EL.4's says «Type it the way this example is typed: `x > 4; x = 4`».
    for (const nodeId of ["EL.2", "EL.4", "RAT.5"]) {
      const cfu = AUTHORED_CFUS.find((entry) => entry.nodeId === nodeId)?.cfu;
      if (!cfu) {
        throw new Error(`no ${nodeId} CFU`);
      }
      expect(cfuPlaceholder(cfu.check, cfu.accepted), nodeId).toBe(GENERIC_PLACEHOLDER);
      expect(cfu.prompt, `${nodeId} has no typed example to fall back on`).toMatch(
        /Type it the way|Write the asymptote as/,
      );
    }
  });
});

/**
 * Every literal any placeholder advertises, against the item shape that placeholder is shown
 * for. Two independent things are checked below, and both are why this table exists: the form
 * has to GRADE, and it must not be the answer to a served item.
 */
const ADVERTISED: readonly {
  readonly name: string;
  readonly text: string;
  /** The example forms the text offers the learner. */
  readonly forms: readonly string[];
  /** Which served items see this placeholder (for the leak check). */
  readonly shownFor: (item: FrozenItem) => boolean;
  /**
   * What a learner who copied `form` into THIS field would submit. Only the two-field
   * `rational_answer` input needs it: each of its fields advertises one half of the answer, so
   * the half under test is paired with the item's own other half. Pairing it with a blank
   * instead would make the leak check vacuous — a blank expression is rejected before the
   * exclusions are read, so nothing could ever score.
   */
  readonly submitFor?: (item: FrozenItem, form: string) => unknown;
}[] = [
  {
    name: "POSITIVE_EXPONENT_PLACEHOLDER",
    text: POSITIVE_EXPONENT_PLACEHOLDER,
    forms: ["a^3", "1/a^5"],
    shownFor: (item) => item.answer.answer_spec.simplification === "positive_exponents",
  },
  {
    name: "RADICAL_PLACEHOLDER",
    text: RADICAL_PLACEHOLDER,
    forms: ["5*sqrt(2)"],
    shownFor: (item) => isConstantRadical(item) && shapeOf(item) === "product",
  },
  {
    name: "RADICAL_QUOTIENT_PLACEHOLDER",
    text: RADICAL_QUOTIENT_PLACEHOLDER,
    forms: ["sqrt(6)/5"],
    shownFor: (item) => isConstantRadical(item) && shapeOf(item) === "quotient",
  },
  {
    name: "RADICAL_SUM_PLACEHOLDER",
    text: RADICAL_SUM_PLACEHOLDER,
    forms: ["sqrt(3)+2*sqrt(7)"],
    shownFor: (item) => isConstantRadical(item) && shapeOf(item) === "sum",
  },
  {
    name: "VARIABLE_RADICAL_PLACEHOLDER",
    text: VARIABLE_RADICAL_PLACEHOLDER,
    forms: ["2*x*sqrt(2*x)", "abs(x^5)", "|x^5|"],
    shownFor: (item) =>
      item.answer.answer_spec.simplification === "simplified_radical" &&
      (item.answer.allowed_symbols?.length ?? 0) > 0,
  },
  {
    name: "INTERVAL_PLACEHOLDER",
    // Three forms from one union, because a learner copies the PART that matches their
    // answer: someone whose solution is a single ray types `(-inf, 5]` on its own, and a
    // ray has to grade and has to stay leak-free in its own right, not only inside the join.
    // The upper bound moved from 2 to 5 when D6 landed, because `d6.fun10.range.l3` keys
    // `(-inf, 2]` and the ray form was scoring it. See the note on the constant itself.
    text: INTERVAL_PLACEHOLDER,
    forms: ["(-inf, 5] U (7, inf)", "(-inf, 5]", "(7, inf)"],
    shownFor: (item) =>
      item.answer.answer_spec.answer_type === "interval" &&
      item.answer.answer_spec.required_notation !== "set_builder",
  },
  {
    name: "SET_BUILDER_PLACEHOLDER",
    text: SET_BUILDER_PLACEHOLDER,
    forms: ["{x | x != 9}"],
    shownFor: (item) => item.answer.answer_spec.required_notation === "set_builder",
  },
  {
    name: "POINT_PLACEHOLDER",
    text: POINT_PLACEHOLDER,
    forms: ["(6, -7)"],
    shownFor: (item) => item.answer.answer_spec.answer_type === "point",
  },
  {
    name: "SOLUTION_SET_PLACEHOLDER",
    text: SOLUTION_SET_PLACEHOLDER,
    forms: ["13", "{-1, 4}"],
    // The integer rosters only. A roster holding a fraction is told apart from them, because
    // the reason this line offers no keys is that a roster of integers needs none.
    shownFor: (item) =>
      item.answer.answer_spec.answer_type === "solution_set" &&
      !String(item.answer.answer_key ?? "").includes("/"),
  },
  {
    name: "SOLUTION_SET_FRACTION_PLACEHOLDER",
    text: SOLUTION_SET_FRACTION_PLACEHOLDER,
    forms: ["7/8", "{2/3, 5}"],
    shownFor: (item) =>
      item.answer.answer_spec.answer_type === "solution_set" &&
      String(item.answer.answer_key ?? "").includes("/"),
  },
  {
    name: "REDUCED_FRACTION_PLACEHOLDER",
    text: REDUCED_FRACTION_PLACEHOLDER,
    forms: ["7/9"],
    shownFor: (item) => item.answer.answer_spec.simplification === "reduced_fraction",
  },
  {
    name: "FRACTION_PLACEHOLDER",
    text: FRACTION_PLACEHOLDER,
    forms: ["9/13"],
    shownFor: (item) =>
      item.answer.answer_spec.representation === "fraction" &&
      item.answer.answer_spec.simplification !== "reduced_fraction",
  },
  {
    name: "EXACT_TRIG_VALUE_PLACEHOLDER",
    text: EXACT_TRIG_VALUE_PLACEHOLDER,
    forms: ["sqrt(5)/4"],
    // The two trigonometric rules sit between the `fraction` representation and `fraction_bar`,
    // so this mirror is the whole prefix missing plus the branch's own two conditions. It names
    // no `answer_type` because the branch does not: see {@link typeBranchesMiss}.
    shownFor: (item) =>
      typeBranchesMiss(item) && specOnlyBranchesMiss(item) && isExactTrigValueBranch(item),
  },
  {
    name: "EXACT_RADIAN_PLACEHOLDER",
    text: EXACT_RADIAN_PLACEHOLDER,
    // NOT `2pi/7`, which is what the line shipped with and what this sweep caught: it is the
    // period `d9.trg5.period-radian.l2` is keyed with, so the greyed field was printing the
    // answer to one of the 66 items it is shown on. A seventh is still the right kind of
    // example, and the numerator is the whole of the change.
    forms: ["3pi/7"],
    // Directly below the trig-value rule, which is why the negation is here rather than left
    // implicit: `sqrt(3)/2` is not a plain fraction but it IS a numeric answer, and a radian
    // item declaring `pi` would take this line over it if the order were the other way round.
    shownFor: (item) =>
      specOnlyBranchesMiss(item) &&
      !isExactTrigValueBranch(item) &&
      isExactRadianBranch(item),
  },
  {
    name: "FRACTION_BAR_PLACEHOLDER",
    text: FRACTION_BAR_PLACEHOLDER,
    forms: ["3/8"],
    shownFor: (item) =>
      item.answer.answer_spec.answer_type === "numeric" &&
      specOnlyBranchesMiss(item) &&
      isPlainFractionAnswerText(item.answer.answer_key),
  },
  {
    name: "EXPONENT_NOTATION_PLACEHOLDER",
    text: EXPONENT_NOTATION_PLACEHOLDER,
    forms: ["a^2 + 3a"],
    // No longer CFU-only. D4's polynomial answers are graded on FORM
    // (`is_standard_polynomial`, `fully_factored_over_integers`), and a form requirement says
    // nothing about how the answer is written, so the caret in the key is the only thing that
    // could name it. D1's `d1.num-4.l3b` joins that cohort keying `6*x^2 + 16`. The
    // load-bearing-star branch runs first, which is why this predicate excludes it rather than
    // merely not mentioning it.
    shownFor: (item) =>
      item.answer.answer_spec.answer_type === "expression" &&
      specOnlyBranchesMiss(item) &&
      !hasLoadBearingStar(item.answer.answer_key) &&
      /(\^|\*\*)/.test(String(item.answer.answer_key ?? "")),
  },
  {
    name: "IMPLICIT_PRODUCT_PLACEHOLDER",
    text: IMPLICIT_PRODUCT_PLACEHOLDER,
    forms: ["log(a*b)"],
    shownFor: (item) =>
      item.answer.answer_spec.answer_type === "expression" &&
      specOnlyBranchesMiss(item) &&
      hasLoadBearingStar(item.answer.answer_key),
  },
  {
    name: "PI_EXPRESSION_PLACEHOLDER",
    text: PI_EXPRESSION_PLACEHOLDER,
    // NOT `7*pi`, which is what the line shipped with and what this sweep caught once the mirror
    // below stopped over-claiming: `d9.trg1.arc-length.l3` serves `7pi`, and the star does not
    // tell them apart because the checker grades them the same. See the constant's own note for
    // the five other coefficients that turned out to leak.
    forms: ["13*pi"],
    // The LAST of the key-reading rules, so the mirror has to say that all five above it missed
    // as well as that the spec-only branches did. Written out step by step rather than as one
    // conjunction, because each line is a different rule of the dispatch and a reorder there
    // should be legible as a change here.
    shownFor: (item) => reachesThePiRules(item) && !piKeyIsAFraction(item),
  },
  {
    name: "PI_FRACTION_PLACEHOLDER",
    text: PI_FRACTION_PLACEHOLDER,
    forms: ["4pi/11"],
    // Reached by no SERVED item — every pi-carrying practice key that also has a bar declares
    // `pi` in `allowed_symbols` and is taken by the radian branch above. It is TRG.1's and
    // TRG.6's CFUs that land here, and the CFU leak sweep is the one that covers them. The entry
    // stays in this table so the two halves of the split are mirrored side by side, and so the
    // day a served key does reach it, the form is already being graded against it.
    shownFor: (item) => reachesThePiRules(item) && piKeyIsAFraction(item),
  },
  {
    name: "RATIONAL_EXPRESSION_PLACEHOLDER",
    text: RATIONAL_EXPRESSION_PLACEHOLDER,
    forms: ["(x+3)/(x+2)"],
    // The bar in the item's OWN key is what selects this line over the polynomial one, so the
    // mirror reads the key exactly as `rationalNotation` does.
    shownFor: (item) =>
      item.answer.answer_spec.answer_type === "rational_answer" &&
      String(item.answer.answer_key).includes("/"),
    submitFor: (item, form) => ({
      expression: form,
      excluded_values: (item.answer.excluded_values ?? []).join(", "),
    }),
  },
  {
    name: "RATIONAL_POLYNOMIAL_PLACEHOLDER",
    text: RATIONAL_POLYNOMIAL_PLACEHOLDER,
    // BOTH shapes the line now names, because the cohort keys both and a sweep over one of
    // them would leave the other free to be some item's answer. `x + 6` is what this pair
    // replaced and is exactly why the pair is graded: it is `correct` on 3 of the 70.
    forms: ["7*x", "(x+2)*(x-9)"],
    shownFor: (item) =>
      item.answer.answer_spec.answer_type === "rational_answer" &&
      !String(item.answer.answer_key).includes("/"),
    submitFor: (item, form) => ({
      expression: form,
      excluded_values: (item.answer.excluded_values ?? []).join(", "),
    }),
  },
  {
    name: "RATIONAL_EXCLUSIONS_PLACEHOLDER",
    text: RATIONAL_EXCLUSIONS_PLACEHOLDER,
    forms: ["-2, 3"],
    shownFor: (item) => item.answer.answer_spec.answer_type === "rational_answer",
    submitFor: (item, form) => ({
      expression: String(item.answer.answer_key),
      excluded_values: form,
    }),
  },
  {
    name: "NUMERIC_LITERAL_PLACEHOLDER",
    text: NUMERIC_LITERAL_PLACEHOLDER,
    forms: ["7"],
    // CFU-only, so no served practice item sees it; nothing to leak from that pool.
    shownFor: () => false,
  },
];

/**
 * The exported placeholders the table above deliberately holds no entry for, each with its
 * reason.
 *
 * Both are here for the same property and it is a real one rather than a convenience: neither
 * string offers the learner a literal to copy, so both of the table's checks are vacuous over
 * them. There is no form to grade, and nothing that could be the answer to anything.
 *
 * Named rather than filtered out by a rule, so a third cannot join them by accident, and
 * asserted in both directions below: a listed name that stops being exported fails, and a
 * listed string that grows an example fails and has to move into the table.
 */
const ADVERTISES_NO_FORM: readonly { readonly name: string; readonly why: string }[] = [
  {
    name: "GENERIC_PLACEHOLDER",
    why: "the bare 'Your answer' the dispatch falls back to, which names no notation at all",
  },
  {
    name: "MULTIPLE_CHOICE_PLACEHOLDER",
    why: "points at the options already printed above the field rather than showing a form",
  },
];

/**
 * The census the table above went without, and the reason two D9 placeholders could ship
 * through a guard that exists to catch exactly what one of them was doing.
 *
 * `EXACT_RADIAN_PLACEHOLDER` and `EXACT_TRIG_VALUE_PLACEHOLDER` landed with the trigonometry
 * domain, were never typed into `ADVERTISED`, and so were graded by nothing and swept for leaks
 * by nothing — while the radian line printed `2pi/7`, which is the key of a served
 * `d9.trg5.period-radian.l2` instance. Nothing went red, because a table nobody counts is
 * silent about its own incompleteness: every assertion in this file iterates the table, so an
 * absent entry costs no assertion.
 *
 * So the population is DERIVED from the module's exports and the table is required to name
 * exactly it. The naming convention is the contract, the same one
 * `answerPlaceholderFit.browser.test.tsx` reads to decide what to measure.
 */
describe("the advertised table names every placeholder the module exports", () => {
  /** Every `*_PLACEHOLDER` the module exports, read off the module rather than listed. */
  const EXPORTED: readonly (readonly [string, string])[] = Object.entries(
    answerFormat as Record<string, unknown>,
  ).flatMap(([name, value]) =>
    name.endsWith("_PLACEHOLDER") && typeof value === "string"
      ? [[name, value] as const]
      : [],
  );

  /**
   * What earns a placeholder a row in the table: a literal the learner can copy out of the
   * greyed field. Every advertised line carries a digit or a piece of notation; the two excused
   * lines are prose and nothing else.
   */
  const FORM_CHARACTER = /[0-9^*/(){}[\]|]/;

  const byName = new Map(EXPORTED);

  it("holds an entry for every exported placeholder, and names nothing else", () => {
    // A floor, because the filter returns [] just as quietly if the convention changes, and a
    // set equality over two empty lists is the emptiest possible pass.
    expect(EXPORTED.length, "the naming convention derived nothing").toBeGreaterThan(19);

    const advertised = ADVERTISED.map((entry) => entry.name);
    const excused = ADVERTISES_NO_FORM.map((entry) => entry.name);
    expect(
      advertised.filter((name) => excused.includes(name)),
      "a placeholder cannot be both advertised and excused",
    ).toEqual([]);

    // Set equality, so it fails BOTH ways: a new placeholder nobody listed fails here, and so
    // does an entry naming a constant the module no longer exports.
    expect([...advertised, ...excused].sort()).toEqual(
      EXPORTED.map(([name]) => name).sort(),
    );
  });

  it("binds each entry to the constant it names, and each names a form", () => {
    for (const entry of ADVERTISED) {
      expect(byName.get(entry.name), `${entry.name} carries another line's text`).toBe(
        entry.text,
      );
      expect(entry.forms.length, `${entry.name} advertises no form`).toBeGreaterThan(0);
      expect(entry.text, `${entry.name} shows no form to copy`).toMatch(FORM_CHARACTER);
    }
  });

  it("excuses only the placeholders that offer no form to copy", () => {
    expect(
      ADVERTISES_NO_FORM.length,
      "nothing is excused, so this is vacuous",
    ).toBeGreaterThan(0);
    for (const { name, why } of ADVERTISES_NO_FORM) {
      const text = byName.get(name);
      expect(typeof text, `${name} is excused but the module does not export it`).toBe(
        "string",
      );
      expect(why.length, `${name} is excused without a reason`).toBeGreaterThan(0);
      // The direction that stops an exemption becoming permanent by neglect: a line that grows
      // an example has adopted the property and has to move into the table to be graded.
      expect(
        text,
        `${name} now shows a form, so it belongs in the table: ${why}`,
      ).not.toMatch(FORM_CHARACTER);
    }
    // Pinned by name, because the set equality above is satisfied by a line MOVING from the
    // table into this list: an excused placeholder is one nothing grades and nothing sweeps,
    // so the composition of the exception is the claim and not only its size.
    expect(ADVERTISES_NO_FORM.map((entry) => entry.name).sort()).toEqual([
      "GENERIC_PLACEHOLDER",
      "MULTIPLE_CHOICE_PLACEHOLDER",
    ]);
  });
});

describe("a placeholder never advertises a form the grader rejects", () => {
  /**
   * The trap that nearly shipped on the RAD.4 absolute-value placeholder: a bar spelling the
   * comparator cannot read would send a learner who copied the guidance straight into
   * `invalid_input`. So every advertised form is graded HERE, through the real product
   * comparator, against an item whose key IS that form.
   *
   * It catches more than bad bars. `x^9` was the first candidate exponent for the
   * positive-exponent line, chosen because no served key uses 9 — and it fails here with
   * `unsupported_exponent`, because the parser caps an exponent at `MAX_EXPONENT = 8`.
   */
  it.each(
    ADVERTISED.flatMap(({ name, forms }) => forms.map((form) => [name, form] as const)),
  )("%s: the grader accepts %s", (name, form) => {
    const definition = definitionFor(name, form);
    const checker = createProductAnswerChecker({
      itemVersions: [
        { item_version_id: "advertised", answer: definition },
      ] as unknown as Parameters<typeof createProductAnswerChecker>[0]["itemVersions"],
    });
    const result = checker({
      raw_answer: definition.submit ?? form,
      item_version_id: "advertised",
      equivalence_checker_version: PRODUCT_CHECKER_VERSION,
    });
    expect(result.status, `${form} -> ${result.reason_code}`).toBe("correct");
  });

  /** Every form appears in the string it is claimed to come from, so the table cannot rot. */
  it.each(
    ADVERTISED.flatMap(({ name, text, forms }) =>
      forms.map((form) => [name, form, text] as const),
    ),
  )("%s really does advertise %s", (_name, form, text) => {
    expect(text).toContain(form);
  });
});

/**
 * The other half of "advertise only what the grader accepts", and the half that was missing:
 * advertise the shape the item is actually keyed in.
 *
 * `simplification: "simplified_radical"` is a label over three shapes. One line, naming a
 * coefficient times a root, was shown to all 55 served constant-radicand instances — and 20
 * of them are keyed as a root over an integer or as a sum of two radical terms, neither of
 * which that line can express. A learner holding a correct `sqrt(7)/2` was being shown a
 * field that said their answer should look like something else.
 *
 * Two assertions, and they catch different failures. Shape equality is the headline property.
 * Notation coverage is what catches a key that MIXES shapes: `radicalShape` returns one tag,
 * so a future `sqrt(3)/3 + sqrt(2)/2` key would be handed the sum line, whose example has no
 * `/` — and the second assertion goes red rather than letting it take the closest of three.
 */
describe("a radical placeholder advertises the shape its own item is keyed in", () => {
  /** The one example each shape's line offers, read back out of the table above. */
  const exampleFor = (shape: RadicalShape): string => {
    const name = {
      product: "RADICAL_PLACEHOLDER",
      quotient: "RADICAL_QUOTIENT_PLACEHOLDER",
      sum: "RADICAL_SUM_PLACEHOLDER",
    }[shape];
    const entry = ADVERTISED.find((candidate) => candidate.name === name);
    const form = entry?.forms.length === 1 ? entry.forms[0] : undefined;
    if (form === undefined) {
      throw new Error(`${name} does not advertise exactly one form`);
    }
    return form;
  };

  it("shows each served instance an example of its own shape", () => {
    const mismatched: string[] = [];
    const census: Record<RadicalShape, number> = { product: 0, quotient: 0, sum: 0 };

    for (const item of SERVED_ITEMS.filter(isConstantRadical)) {
      const shape = shapeOf(item);
      census[shape] += 1;
      const shown = practicePlaceholder(
        item.answer.answer_spec,
        item.answer.allowed_symbols,
        item.answer.answer_key,
      );
      const advertised = exampleFor(shape);
      if (!shown.includes(advertised)) {
        mismatched.push(
          `${item.item_version_id} (${item.answer.answer_key}, ${shape}) shown ${JSON.stringify(shown)}`,
        );
      }
      if (radicalShape(advertised) !== shape) {
        mismatched.push(
          `${JSON.stringify(advertised)} is advertised for ${shape} but is a ${radicalShape(advertised)}`,
        );
      }
    }

    // The measured census, so no cohort can empty out and leave the sweep vacuously true —
    // and so the 20-instance defect this fixes stays named in the count that proves it.
    // The product cohort took D10's seven `d10.geo1.exact-diagonal.l3` instances, which are
    // keyed `a*sqrt(b)` and so read as the same shape as D2's, and then D9's seven exact
    // triangle sides, which are keyed the same way for the same reason.
    expect(census).toEqual({ product: 49, quotient: 14, sum: 6 });
    expect(mismatched.join("\n")).toBe("");
  });

  /**
   * Every notation character the item's own key uses appears in the line shown for it. This
   * is the placeholder's version of the keypad's "offers a key for every notation the item's
   * own answer key uses", and it is what the old single line failed: `/` on 14 items and `+`
   * on 6, neither anywhere in `5*sqrt(2)`.
   */
  it("names every notation character the item's own key uses", () => {
    const NOTATION = ["sqrt(", "*", "/", "+", "^", "abs("];
    const short: string[] = [];
    let checked = 0;

    for (const item of SERVED_ITEMS.filter(isConstantRadical)) {
      const key = item.answer.answer_key ?? "";
      const shown = practicePlaceholder(
        item.answer.answer_spec,
        item.answer.allowed_symbols,
        key,
      );
      checked += 1;
      for (const token of NOTATION) {
        if (key.includes(token) && !shown.includes(token)) {
          short.push(
            `${item.item_version_id}: key ${JSON.stringify(key)} uses ${JSON.stringify(token)}, placeholder is ${JSON.stringify(shown)}`,
          );
        }
      }
    }

    // 55 before D10, plus its seven exact-diagonal instances, plus D9's seven exact sides.
    expect(checked).toBe(69);
    expect(short.join("\n")).toBe("");
  });

  /**
   * The shape reader itself, on the literal keys the three cohorts are made of. Read off the
   * pool as well as from literals, so a template whose keys change shape cannot leave this
   * agreeing with a shape nothing is keyed in any more.
   */
  it("reads the shape off a served key of each kind", () => {
    expect(radicalShape("9*sqrt(13)")).toBe("product");
    expect(radicalShape("sqrt(10)")).toBe("product");
    expect(radicalShape("sqrt(3)/3")).toBe("quotient");
    expect(radicalShape("6*sqrt(2)/5")).toBe("quotient");
    expect(radicalShape("4*sqrt(6)+3*sqrt(5)")).toBe("sum");
    // A missing key cannot crash the dispatch, and falls to the shape 35 of 55 items use.
    expect(radicalShape(undefined)).toBe("product");

    const seen = new Set(
      SERVED_ITEMS.filter(isConstantRadical).map((item) => shapeOf(item)),
    );
    expect([...seen].sort()).toEqual(["product", "quotient", "sum"]);
  });
});

/**
 * A placeholder must not be a hint about the problem on screen. The user's own framing:
 * `e.g. x^3 or 1/x^5` is safe because the exponent differs from the item's and because TWO
 * forms read as a syntax menu.
 *
 * This is the assertion the previous strings failed, six times over. `POSITIVE_EXPONENT` named
 * `1/x^2`, `x^3` and `x^3/y^4`, all served EXP.1 keys; `VARIABLE_RADICAL` named `abs(x)` and
 * `|x|`, both of which answer `d2.rad4.magnitude.l1`; `SET_BUILDER`, `POINT`, `SOLUTION_SET`
 * and `REDUCED_FRACTION` each answered one or two served items outright.
 */
describe("a placeholder never gives away a served answer", () => {
  /**
   * Graded, not string-compared. A key of `{4}` is not the string `4` and a bare `4` scores
   * CORRECT against it, so comparing text would have missed the two RAT.6 items the old
   * solution-set line answered. The question a leak check has to ask is the learner's: would
   * typing what the field suggests score this problem?
   */
  it.each(ADVERTISED.map((entry) => [entry.name, entry] as const))(
    "%s scores nothing it is shown on",
    (_name, entry) => {
      const shown = SERVED_ITEMS.filter(entry.shownFor);
      const leaked: string[] = [];
      for (const item of shown) {
        for (const form of entry.forms) {
          const result = practiceChecker({
            raw_answer: entry.submitFor ? entry.submitFor(item, form) : form,
            item_version_id: item.item_version_id,
            equivalence_checker_version: checkerVersionForItem(item),
          });
          if (result.status === "correct") {
            leaked.push(
              `${form} answers ${item.item_version_id} (${item.answer.answer_key})`,
            );
          }
        }
      }
      // A containment claim over an empty collection proves nothing, so the count is the floor.
      // The two placeholders no served item reaches yet are named in the test below.
      expect(shown.length, `${entry.name} is shown on no served item`).toBeGreaterThan(
        UNREACHED.includes(entry.name) ? -1 : 0,
      );
      expect(leaked.join("; "), `${entry.name} over ${shown.length} served items`).toBe("");
    },
    // Explicitly timed rather than left on the 20s default: the D5 entries grade 140 items
    // each through the real comparator, and the machine is not the claim.
    120_000,
  );

  /** The EXP.1 CFU is graded by exact match, so its own accepted list is the leak surface. */
  it("does not give away the EXP.1 check-your-understanding answer", () => {
    const accepted = (d2LessonByNode["EXP.1"]?.cfu?.accepted ?? []).map(
      normalizeAcceptedAnswer,
    );
    expect(accepted.length).toBeGreaterThan(0);
    for (const form of ["a^3", "1/a^5"]) {
      expect(accepted, form).not.toContain(normalizeAcceptedAnswer(form));
    }
  });

  /**
   * The same leak surface for the two lines the CFU card is the only surface to reach, and for
   * the CFU half of the bar line. The served-pool sweep above cannot see any of it: a
   * form-dependent CFU is graded by `accepted.has(normalizeAcceptedAnswer(value))`, with no
   * checker consulted, so the accepted LIST is where a leak would land.
   *
   * The cohort is derived from `cfuPlaceholder` rather than written down, so a pack that starts
   * reaching one of these lines is graded here without anyone remembering to add it — and the
   * node list is asserted beside the floor, so one that stops reaching a line cannot leave the
   * sweep passing over a smaller population than it was written for.
   */
  it.each([
    [
      "FRACTION_BAR_PLACEHOLDER",
      FRACTION_BAR_PLACEHOLDER,
      // TRG.1 and TRG.6 were here too, keyed `pi/4` and `pi/6`, and they have moved to
      // `PI_FRACTION_PLACEHOLDER` below. This line used to record that as the CFU path
      // differing from the practice path and not endorse it; the difference is now narrower
      // and worth stating, because a bar line over a radian answer says nothing about the
      // harder half. `pi` is spelled, and «Use / for a fraction: 3/8» does not mention it.
      //
      // FOUR nodes left this row in one merge, from two rounds that never saw each other, and
      // the combined list is the union of both departures rather than either side's.
      //
      // TRG.3, TRG.4 and TRG.9 have gone to the lowest-terms row below, and the reason is the
      // D9 round's P0 rather than a re-tagging. Their checks are keyed `-1/2`, `4/3` and
      // `7/25` and read as a bare bar for as long as the packs declared no profile at all —
      // the same silence that let each of them accept, on the authored question, a form its
      // own re-ask rejected. Declaring `reduced_fraction` states the rule the re-ask was
      // already enforcing, so the stricter line is now the honest one.
      //
      // POL.4 left for its own unrelated reason: its answer is a solution set with a
      // fractional root, so it moved to the line that says both, and that row is where its
      // leak check now runs.
      ["RAT.1", "RAT.2", "RAT.3", "RAT.4", "LF.1"],
    ],
    [
      "EXPONENT_NOTATION_PLACEHOLDER",
      EXPONENT_NOTATION_PLACEHOLDER,
      // POL.6 joined when its pack was authored: its check answers with a leading TERM, which
      // is a monomial carrying a caret, so the same line is the one that names its notation.
      ["NUM.4", "POL.1", "POL.6", "POL.8"],
    ],
    // One node, and a cohort of one is worth asserting precisely because it is the first: this
    // line reached no authored CFU at all until POL.4 arrived, so an unasserted cohort here
    // could empty back to nothing and the sweep would pass over it.
    ["SOLUTION_SET_FRACTION_PLACEHOLDER", SOLUTION_SET_FRACTION_PLACEHOLDER, ["POL.4"]],
    // The two CFUs the pi split exists for, and the only surface either half of it reaches with
    // a bar. No served practice item is shown this line, so this row is where its example form
    // is graded against a real cohort at all.
    ["PI_FRACTION_PLACEHOLDER", PI_FRACTION_PLACEHOLDER, ["TRG.1", "TRG.6"]],
    // The lowest-terms line, which the row above sends three CFUs to. This row exists so that
    // the leak check FOLLOWS them: deleting them from the bar line alone would have left three
    // hand-graded accepted lists checked by nothing, and shrinking a population is the one way
    // this sweep can go green over less than it was written for. NUM.F has declared the profile
    // since D1 and is here to keep the cohort from being D9's alone.
    [
      "REDUCED_FRACTION_PLACEHOLDER",
      REDUCED_FRACTION_PLACEHOLDER,
      ["NUM.F", "TRG.3", "TRG.4", "TRG.9"],
    ],
  ] as const)("%s gives away no CFU answer it is shown on", (name, text, expected) => {
    const entry = ADVERTISED.find((candidate) => candidate.name === name);
    if (!entry) {
      throw new Error(`${name} is not in the advertised table`);
    }
    const shown = AUTHORED_CFUS.filter(
      ({ cfu }) => cfuPlaceholder(cfu.check, cfu.accepted) === text,
    );
    expect(
      shown.map(({ nodeId }) => nodeId).sort(),
      `${name} reaches a different set of CFUs than the leak check was written for`,
    ).toEqual([...expected].sort());
    expect(shown.length, `${name} is shown to no CFU`).toBeGreaterThan(0);

    for (const { nodeId, cfu } of shown) {
      const accepted = cfu.accepted.map(normalizeAcceptedAnswer);
      expect(accepted.length, nodeId).toBeGreaterThan(0);
      for (const form of entry.forms) {
        expect(accepted, `${form} answers ${nodeId}`).not.toContain(
          normalizeAcceptedAnswer(form),
        );
      }
    }
  });

  /**
   * `shownFor` is a hand-written mirror of {@link answerNotation}, so the sweep above grades
   * the right forms against the right items only while the two agree. They can drift silently:
   * reordering the dispatch so `interval` steals the `set_builder` sub-case moves the
   * placeholder on all 7 RAT.5 items and moves NO `shownFor` predicate, because they read the
   * spec rather than the dispatch. So each entry's cohort is checked against what
   * `practicePlaceholder` actually returns.
   *
   * Two entries are exempt, and the exemption is the interesting part rather than a hole.
   * `RATIONAL_EXPRESSION_PLACEHOLDER` used to be a third, on the ground that the two-field D5
   * input was the one surface OUTSIDE this dispatch — it hard-coded both of its lines and
   * `answerNotation` returned `none` for all 140 of its items. That is no longer true: its
   * expression half now takes its keys from the dispatch, so it is swept here like everything
   * else, and the exemption is discharged rather than reworded.
   *
   * What remains exempt is the EXCLUSIONS half and the single-number line. The exclusions half
   * is the second field of a surface the dispatch answers once per item: one tag cannot name
   * two lines, so the field that is not the notation-carrying one keeps its own literal (every
   * excluded value in the pool is a plain integer, so it has no notation to name). The
   * single-number line is CFU-only. They are named rather than filtered by a rule, so a third
   * entry cannot join them by accident.
   */
  it("shows each placeholder to exactly the items the dispatch hands it to", () => {
    const NOT_FROM_THE_ITEM_DISPATCH = [
      "RATIONAL_EXCLUSIONS_PLACEHOLDER",
      "NUMERIC_LITERAL_PLACEHOLDER",
    ];
    const disagreements: string[] = [];
    let checked = 0;

    for (const entry of ADVERTISED) {
      if (NOT_FROM_THE_ITEM_DISPATCH.includes(entry.name)) {
        continue;
      }
      for (const item of SERVED_ITEMS) {
        checked += 1;
        const shown =
          practicePlaceholder(
            item.answer.answer_spec,
            item.answer.allowed_symbols,
            item.answer.answer_key,
          ) === entry.text;
        if (shown !== entry.shownFor(item)) {
          disagreements.push(
            `${entry.name} ${entry.shownFor(item) ? "claims" : "disowns"} ${item.item_version_id}, dispatch says ${shown}`,
          );
        }
      }
    }

    expect(checked, "no (placeholder, item) pair examined").toBeGreaterThan(5000);
    expect(disagreements.join("\n")).toBe("");
  });

  /**
   * The placeholders no served practice item reaches, recorded explicitly so the count floor
   * above is exempting a named list rather than leaving a silent hole. `INTERVAL_PLACEHOLDER`
   * used to be here too, on the stated ground that "interval items arrive with LIN.6"; they
   * have arrived, so the exemption is discharged rather than shrunk, and the test below records
   * what replaced it.
   *
   * Both entries are CFU-ONLY by design rather than forward-looking, and each is CFU-only for
   * its own reason. The single-number line states a requirement only the CFU has (it rejects an
   * expression before grading, where practice evaluates it). The caret line is reached by
   * `cfuNotation` alone because a caret in a served practice key always arrives with a profile
   * or an answer type that claims it first — `positive_exponents` on the 28 EXP.1 instances, and
   * the D5 expression half on `d5.rat1.monomial.l1`'s `3*x^2/2`. Their CFU-side leak checks are
   * the two tests below this one, because a CFU is graded by exact accepted-list match and the
   * served pool is not its leak surface.
   */
  it("records which placeholders no served item reaches yet", () => {
    const unreached = ADVERTISED.filter(
      (entry) => SERVED_ITEMS.filter(entry.shownFor).length === 0,
    ).map((entry) => entry.name);
    expect(unreached).toEqual(UNREACHED);
  });
  /**
   * The interval line IS reached now, and by whom.
   *
   * This assertion is the replacement for one that said the opposite. It used to record that every
   * served interval item declared `set_builder` and took the earlier branch, so the three input
   * rules `INTERVAL_PLACEHOLDER` carries — `inf` not `oo`, whitespace around a union, a closed
   * bound on an infinity is `wrong_notation` — were guidance nobody had been shown. D3's LIN.4 and
   * LIN.6 serve plain intervals, so those rules are live guidance from now on, and the two
   * cohorts are asserted apart rather than the old claim being deleted: the set-builder branch is
   * still taken, by RAT.5, EL.4 and one LIN.6 shape whose graded skill IS writing that form.
   */
  it("shows the interval line to the plain-interval items and the set-builder line to the rest", () => {
    const intervals = SERVED_ITEMS.filter(
      (item) => item.answer.answer_spec.answer_type === "interval",
    );
    const plain = intervals.filter(
      (item) => item.answer.answer_spec.required_notation !== "set_builder",
    );
    const setBuilder = intervals.filter(
      (item) => item.answer.answer_spec.required_notation === "set_builder",
    );
    // Floors on BOTH cohorts, because a containment claim over an empty one proves nothing and
    // this test now makes two of them.
    expect(
      plain.length,
      "no plain interval items, so the first claim is vacuous",
    ).toBeGreaterThan(20);
    expect(
      setBuilder.length,
      "no set-builder items, so the second claim is vacuous",
    ).toBeGreaterThan(20);

    // The plain cohort was D3's alone, which is the reason the exemption above was dropped, and
    // two domains have joined it since. D6 doubled it: FUN.2 answers domains and ranges in
    // interval notation, FUN.4 answers the stretch a trace climbs or falls on, and FUN.10 the
    // range of a vee. D9 adds one, its inverse-trig principal RANGE, in degrees and
    // deliberately: an interval cannot parse a pi, which is the same limit that keeps every D9
    // roster in degrees too.
    expect([...new Set(plain.map((item) => item.template_id))].sort()).toEqual([
      "d3.lin4.compound-and.l3",
      "d3.lin4.compound-or.l2",
      "d3.lin4.compound-or.l3",
      "d3.lin4.negative-coefficient.l2",
      "d3.lin4.one-step.l1",
      "d3.lin4.two-step.l2",
      "d3.lin6.band.l1",
      "d3.lin6.scaled-band.l2",
      "d3.lin6.scaled-union.l3",
      "d3.lin6.union.l2",
      "d6.fun10.range.l3",
      "d6.fun2.output-range.l2",
      "d6.fun2.quotient-domain.l2",
      "d6.fun2.root-domain.l1",
      "d6.fun2.root-flip-domain.l3",
      "d6.fun2.root-over-linear.l3",
      "d6.fun4.fall-union.l3",
      "d6.fun4.rising-interval.l2",
      "d9.trg7.range-interval.l2",
    ]);
    for (const item of plain) {
      expect(
        practicePlaceholder(item.answer.answer_spec, item.answer.allowed_symbols),
        item.item_version_id,
      ).toBe(INTERVAL_PLACEHOLDER);
    }

    expect([...new Set(setBuilder.map((item) => item.template_id))].sort()).toEqual([
      "d3.lin6.set-builder.l3",
      "d5.rat5.domain.l1",
      "d8.el4.domain-shift.l3",
      "d8.el4.domain.l2",
    ]);
    for (const item of setBuilder) {
      expect(
        practicePlaceholder(item.answer.answer_spec, item.answer.allowed_symbols),
        item.item_version_id,
      ).toBe(SET_BUILDER_PLACEHOLDER);
    }
  });
});

/**
 * The placeholders no SERVED practice item reaches.
 *
 * `EXPONENT_NOTATION_PLACEHOLDER` used to be here, on the ground that no served key carried a
 * caret outside the `positive_exponents` profile. D4 made that false: 49 of its items are keyed
 * as polynomials whose form is graded and whose notation is not, so the caret is theirs to
 * advertise and the entry is discharged rather than reworded. D1's `d1.num-4.l3b` reaches it
 * too, keying `6*x^2 + 16` under a bare expression spec.
 *
 * `PI_FRACTION_PLACEHOLDER` is here for a reason that could change: every pi-carrying practice
 * key that also has a bar is a radian one and declares `pi`, so the radian branch takes it first
 * and this half of the pi split is reached only by TRG.1's and TRG.6's CFUs. Those ARE graded
 * against it, in the CFU leak sweep above. The day a served key arrives here this entry fails,
 * which is the direction that matters.
 *
 * In ADVERTISED order, because the assertion below compares against the table as written.
 */
const UNREACHED = ["PI_FRACTION_PLACEHOLDER", "NUMERIC_LITERAL_PLACEHOLDER"];

/** The item definition each advertised form is graded against. */
function definitionFor(name: string, form: string) {
  const spec = (over: Record<string, unknown>) => ({
    answer_type: "numeric",
    equivalence: "exact_value",
    representation: "any",
    simplification: "none",
    required_form: null,
    required_notation: "none",
    precision: null,
    unit_policy: "none",
    ...over,
  });
  switch (name) {
    case "POSITIVE_EXPONENT_PLACEHOLDER":
      return {
        answer_key: form,
        allowed_symbols: ["a"],
        answer_spec: spec({
          answer_type: "expression",
          equivalence: "symbolic",
          simplification: "positive_exponents",
        }),
        submit: undefined as string | undefined,
      };
    // All three constant-radicand shapes are graded under the SAME spec, which is the
    // point: `simplified_radical` is what they share and the shape is what it does not say.
    case "RADICAL_PLACEHOLDER":
    case "RADICAL_QUOTIENT_PLACEHOLDER":
    case "RADICAL_SUM_PLACEHOLDER":
      return {
        answer_key: form,
        answer_spec: spec({
          representation: "exact",
          simplification: "simplified_radical",
        }),
        submit: undefined as string | undefined,
      };
    case "VARIABLE_RADICAL_PLACEHOLDER":
      return {
        // `|x^5|` is the pipe spelling of the same value, so it is graded against the
        // `abs(...)` key a RAD.4 item actually carries.
        answer_key: form.startsWith("|") ? "abs(x^5)" : form,
        allowed_symbols: ["x"],
        answer_spec: spec({
          representation: "exact",
          simplification: "simplified_radical",
        }),
        submit: form,
      };
    case "INTERVAL_PLACEHOLDER":
      return { ...intervalDefinition(form), submit: undefined as string | undefined };
    case "SET_BUILDER_PLACEHOLDER":
      return {
        answer_key: form,
        answer_spec: spec({ answer_type: "interval", required_notation: "set_builder" }),
        submit: undefined as string | undefined,
      };
    case "POINT_PLACEHOLDER":
      return {
        answer_key: form,
        answer_spec: spec({ answer_type: "point" }),
        submit: undefined as string | undefined,
      };
    case "SOLUTION_SET_PLACEHOLDER":
      return {
        answer_key: form,
        answer_spec: spec({ answer_type: "solution_set" }),
        submit: undefined as string | undefined,
      };
    case "REDUCED_FRACTION_PLACEHOLDER":
      return {
        answer_key: form,
        answer_spec: spec({
          representation: "fraction",
          simplification: "reduced_fraction",
        }),
        submit: undefined as string | undefined,
      };
    case "FRACTION_PLACEHOLDER":
      return {
        answer_key: form,
        answer_spec: spec({ representation: "fraction" }),
        submit: undefined as string | undefined,
      };
    // The cohort's own spec: a plain numeric graded on VALUE, with no representation demand.
    // That is what makes `d2.rad3.negeval.l3` reach this line rather than either fraction one.
    case "FRACTION_BAR_PLACEHOLDER":
      return {
        answer_key: form,
        answer_spec: spec({}),
        submit: undefined as string | undefined,
      };
    case "EXPONENT_NOTATION_PLACEHOLDER":
      return {
        answer_key: form,
        allowed_symbols: ["a"],
        answer_spec: spec({ answer_type: "expression", equivalence: "symbolic" }),
        submit: undefined as string | undefined,
      };
    case "IMPLICIT_PRODUCT_PLACEHOLDER":
      return {
        answer_key: form,
        allowed_symbols: ["a", "b"],
        answer_spec: spec({
          answer_type: "expression",
          equivalence: "symbolic",
          required_form: "is_condensed_log",
        }),
        submit: undefined as string | undefined,
      };
    // The cohort's own spec, which is what `expressionAnswer(key, ["pi"])` builds in
    // `packages/item-bank/src/template.ts`: a symbolic expression over a declared `pi`.
    case "PI_EXPRESSION_PLACEHOLDER":
    // The fraction half of the split reaches no served item, so its grading definition is the
    // same one — the split is on the shape of the KEY, and both shapes are the same spec.
    case "PI_FRACTION_PLACEHOLDER":
      return {
        answer_key: form,
        allowed_symbols: ["pi"],
        answer_spec: spec({
          answer_type: "expression",
          equivalence: "symbolic",
          simplification: "combined_polynomial",
        }),
        submit: undefined as string | undefined,
      };
    // The two D9 profiles, each under the spec its own answer helper builds. `exact` is the
    // representation both carry, and it is not decorative: it is what makes a decimal
    // approximation of either answer wrong, so grading them under the default `any` would
    // measure a laxer item than the one a learner meets.
    case "EXACT_TRIG_VALUE_PLACEHOLDER":
      return {
        answer_key: form,
        answer_spec: spec({
          representation: "exact",
          simplification: "canonical_exact_trig_value",
        }),
        submit: undefined as string | undefined,
      };
    case "EXACT_RADIAN_PLACEHOLDER":
      return {
        answer_key: form,
        // The declaration that routes the answer to the checker's pi-aware path, and the same
        // one the mirror above reads to decide the item sees this line at all.
        allowed_symbols: ["pi"],
        answer_spec: spec({ representation: "exact" }),
        submit: undefined as string | undefined,
      };
    case "SOLUTION_SET_FRACTION_PLACEHOLDER":
      return {
        answer_key: form,
        answer_spec: spec({ answer_type: "solution_set", equivalence: "structural" }),
        submit: undefined as string | undefined,
      };
    case "RATIONAL_EXPRESSION_PLACEHOLDER":
    case "RATIONAL_POLYNOMIAL_PLACEHOLDER":
      return {
        answer_key: form,
        allowed_symbols: ["x"],
        excluded_values: [],
        answer_spec: spec({ answer_type: "rational_answer", equivalence: "symbolic" }),
        // A rational answer is two halves, so it is submitted as the payload the
        // comparator reads rather than as a bare string.
        submit: { expression: form, excluded_values: "" } as unknown as string,
      };
    case "RATIONAL_EXCLUSIONS_PLACEHOLDER":
      return {
        // The exclusions field is graded against `excluded_values`, so the item under test is
        // one whose forbidden values ARE the advertised list.
        answer_key: "(x+3)/(x+2)",
        allowed_symbols: ["x"],
        excluded_values: ["-2", "3"],
        answer_spec: spec({ answer_type: "rational_answer", equivalence: "symbolic" }),
        submit: {
          expression: "(x+3)/(x+2)",
          excluded_values: form,
        } as unknown as string,
      };
    case "NUMERIC_LITERAL_PLACEHOLDER":
      return {
        answer_key: form,
        answer_spec: spec({}),
        submit: undefined as string | undefined,
      };
    default:
      throw new Error(`no grading definition for ${name}`);
  }
}

/**
 * The two trigonometric notation tags, asserted over the real served pool rather than over a
 * hand-built spec.
 *
 * Both cohorts reached a learner as a bare "Your answer" with no keypad and no live preview
 * until the tags landed, and for two different reasons. An `exactRadianAnswer` key like
 * `11pi/6` fails `isPlainFractionAnswerText`, which is digits over digits, so it fell past the
 * only fraction rule that could have claimed it. An `exactTrigValueAnswer` key carries
 * `simplification: "canonical_exact_trig_value"`, which is not the `simplified_radical` the
 * radical branch tests, so `sqrt(3)/2` fell past that one. Both then fell to `none`.
 *
 * What makes this worth asserting rather than reading off the dispatch is the ORDER. Both
 * rules sit above `fraction_bar`, and a trig value that happens to be `1/2` satisfies the
 * plain-fraction predicate, so moving either rule down would silently take the square-root
 * key away from the radical draws of the same generator.
 */
describe("the trigonometric answer cohorts get a notation, not a bare field", () => {
  it("tags every exact radian answer and offers it a fraction key", () => {
    const radians = SERVED_ITEMS.filter(
      (item) =>
        item.answer.answer_spec.answer_type === "numeric" &&
        (item.answer.allowed_symbols ?? []).includes("pi"),
    );
    expect(radians.length, "exact radian answers are served").toBeGreaterThanOrEqual(10);
    for (const item of radians) {
      const notation = answerNotation(
        item.answer.answer_spec,
        item.answer.allowed_symbols,
        item.answer.answer_key,
      );
      expect(notation, item.item_version_id).toBe("exact_radian");
      expect(
        practicePlaceholder(
          item.answer.answer_spec,
          item.answer.allowed_symbols,
          item.answer.answer_key,
        ),
        item.item_version_id,
      ).toBe(EXACT_RADIAN_PLACEHOLDER);
      expect(
        answerKeypad(
          item.answer.answer_spec,
          item.answer.allowed_symbols,
          item.answer.answer_key,
        ).length,
        `${item.item_version_id} gets a key row`,
      ).toBeGreaterThan(0);
    }
  });

  /**
   * The dispatch splits this profile by the key each instance actually carries, so both
   * halves are asserted here rather than only the one that motivated the tag.
   *
   * That the split is live matters. `d9.trg3.exact-value-circle.l3` draws `1/2` and
   * `sqrt(3)/2` from a single generator, so if either branch stopped being populated this
   * pair of counts would say so instead of quietly measuring one shape twice.
   */
  it("tags a radical trig value for its root, and a plain one for its bar", () => {
    const values = SERVED_ITEMS.filter(
      (item) => item.answer.answer_spec.simplification === "canonical_exact_trig_value",
    );
    expect(values.length, "exact trig values are served").toBeGreaterThanOrEqual(10);

    let radicals = 0;
    let plain = 0;
    for (const item of values) {
      const key = item.answer.answer_key ?? "";
      const notation = answerNotation(
        item.answer.answer_spec,
        item.answer.allowed_symbols,
        key,
      );
      if (key.includes("sqrt(")) {
        expect(notation, item.item_version_id).toBe("exact_trig_value");
        expect(
          answerKeypad(item.answer.answer_spec, item.answer.allowed_symbols, key).some(
            (mathKey) => mathKey.id === "sqrt",
          ),
          `${item.item_version_id} is offered a root key`,
        ).toBe(true);
        radicals += 1;
      } else {
        // A trig value with no root in it is a plain value, and says so: no root key is
        // offered over an answer that cannot contain one.
        expect(notation, item.item_version_id).not.toBe("exact_trig_value");
        plain += 1;
      }
    }
    expect(radicals, "radical draws exist").toBeGreaterThan(0);
    expect(plain, "plain-fraction draws exist").toBeGreaterThan(0);
  });
});

describe("normalizeTextSubmission", () => {
  /**
   * The checker compares a choose-one answer with `===`, and the option is typed into a
   * plain text field whose first letter a mobile keyboard capitalizes by default. Without
   * the fold, a learner who picks the right option is marked wrong for the capital.
   */
  it("folds case and collapses spacing for a choose-one answer", () => {
    expect(normalizeTextSubmission("Parallel", "multiple_choice")).toBe("parallel");
    expect(normalizeTextSubmission("  DECREASING ", "multiple_choice")).toBe("decreasing");
    expect(normalizeTextSubmission("One  Solution", "multiple_choice")).toBe(
      "one solution",
    );
  });

  /**
   * Deliberately narrow. Case and spacing carry meaning elsewhere: `abs(X)` is not `abs(x)`
   * to the variable-radical path, so folding everything would hide real misses.
   */
  it("trims other answer types and canonicalizes only unambiguous root glyphs", () => {
    expect(normalizeTextSubmission("  2*sqrt(X) ", "expression")).toBe("2*sqrt(X)");
    expect(normalizeTextSubmission(" 5√2 ", "expression")).toBe("5*sqrt(2)");
    expect(normalizeTextSubmission(" √2x ", "expression")).toBe("√2x");
    expect(normalizeTextSubmission(" (3, 5) ", "point")).toBe("(3, 5)");
    expect(normalizeTextSubmission(" 12 ", undefined)).toBe("12");
  });

  /**
   * The gating regression: the fold only helps if the real served keys are lower case, so
   * that a folded submission can match one.
   *
   * **Swept over every served pool, not over the domain that happens to have introduced
   * choose-one items.** This assertion used to read `D7_PRACTICE_ITEMS`, on the reasoning
   * that D7 shipped the first ones. That scoped the guard to where the feature landed rather
   * than to which items exhibit the behaviour, and the two came apart the moment a second
   * domain served a choose-one key: D9's `d9.trg4.identity-name.l3` shipped a capitalized
   * `Pythagorean`, which no learner could match, and this file reported green throughout
   * because D9 was outside the population.
   *
   * The floors are what stop it passing over an empty or shrunken set, and the D9 floor
   * specifically is what stops the sweep silently narrowing back to one domain.
   */
  it("produces a value that matches every real choose-one key, in every served pool", () => {
    const choices = SERVED_ITEMS.filter(
      (item) => item.answer.answer_spec.answer_type === "multiple_choice",
    );
    expect(choices.length, "there are choose-one items to check").toBeGreaterThanOrEqual(
      20,
    );
    expect(
      choices.filter((item) => item.template_id.startsWith("d9.")).length,
      "the sweep reaches beyond the domain it was first written for",
    ).toBeGreaterThanOrEqual(3);
    for (const item of choices) {
      const key = item.answer.answer_key ?? "";
      expect(normalizeTextSubmission(key.toUpperCase(), "multiple_choice"), key).toBe(key);
    }
  });

  /**
   * The gating regression, mirroring the `d1.num-3.l3` case above: the radical
   * placeholder only reaches a learner if real served items carry the
   * `simplified_radical` profile.
   */
  it("fires for the real D2 radical practice items", () => {
    const radicals = D2_PRACTICE_ITEMS.filter(
      (item) => item.answer.answer_spec.simplification === "simplified_radical",
    );
    expect(radicals.length).toBeGreaterThan(0);

    const lineFor: Record<RadicalShape, string> = {
      product: RADICAL_PLACEHOLDER,
      quotient: RADICAL_QUOTIENT_PLACEHOLDER,
      sum: RADICAL_SUM_PLACEHOLDER,
    };
    for (const item of radicals) {
      const symbols = item.answer.allowed_symbols;
      expect(
        practicePlaceholder(item.answer.answer_spec, symbols, item.answer.answer_key),
        item.item_version_id,
      ).toBe(
        symbols && symbols.length > 0
          ? VARIABLE_RADICAL_PLACEHOLDER
          : lineFor[shapeOf(item)],
      );
    }
  });

  /**
   * RAD.4's whole point is that $\sqrt{x^2}$ is $|x|$, so its served items must be the
   * ones that reach the placeholder naming how to type bars. A variable radicand is
   * exactly what `allowed_symbols` declares, and it is also what routes the item to the
   * checker's variable-aware radical path, so the two can never drift apart.
   */
  it("names absolute-value notation on the served RAD.4 radical items", () => {
    const rad4 = D2_PRACTICE_ITEMS.filter(
      (item) =>
        item.node_id === "RAD.4" &&
        item.answer.answer_spec.simplification === "simplified_radical",
    );
    expect(rad4.length).toBeGreaterThan(0);

    for (const item of rad4) {
      expect(item.answer.allowed_symbols?.length, item.item_version_id).toBeGreaterThan(0);
      expect(
        practicePlaceholder(item.answer.answer_spec, item.answer.allowed_symbols),
        item.item_version_id,
      ).toBe(VARIABLE_RADICAL_PLACEHOLDER);
    }
  });

  /** The placeholder advertises exactly the spellings the input boundary can canonicalize. */
  it("advertises accepted radical notation without implying ambiguous variable scope", () => {
    expect(RADICAL_PLACEHOLDER).toContain("√2");
    expect(RADICAL_PLACEHOLDER).toContain("sqrt(2)");
    expect(RADICAL_QUOTIENT_PLACEHOLDER).toContain("sqrt(");
    expect(RADICAL_SUM_PLACEHOLDER).toContain("sqrt(");
    expect(VARIABLE_RADICAL_PLACEHOLDER).toContain("sqrt(");
    // Both bar spellings, on the letter the RAD.4 items use. Not the bare `abs(x)` / `|x|`
    // it used to name: both of those ANSWER `d2.rad4.magnitude.l1`, whose key is `abs(x)`.
    expect(VARIABLE_RADICAL_PLACEHOLDER).toContain("abs(x^5)");
    expect(VARIABLE_RADICAL_PLACEHOLDER).toContain("|x^5|");
    expect(VARIABLE_RADICAL_PLACEHOLDER).not.toContain("√");
  });
});

/**
 * Blocker: every RAD widget and KaTeX prompt draws the root as a literal `√`, and the
 * input carried only the generic "Your answer" placeholder, so `5√2` was the natural
 * thing to type. The accepted-list CFUs matched exactly after trim/lowercase/strip and
 * REJECTED it. The lists now carry the Unicode spellings, and the input names the
 * notation up front.
 */
describe("D2 radical CFUs accept the notation the lesson renders", () => {
  const cfuAccepts = (nodeId: string, answer: string): boolean => {
    const accepted = d2LessonByNode[nodeId]?.cfu?.accepted ?? [];
    return new Set(accepted.map(normalizeAcceptedAnswer)).has(
      normalizeAcceptedAnswer(answer),
    );
  };

  it.each([
    ["RAD.1", "6√2/5"],
    ["RAD.1", "6 √2/5"],
    ["RAD.1", "6*√2/5"],
    ["RAD.1", "6sqrt2/5"],
    ["RAD.1", "6\\sqrt2/5"],
    ["RAD.1", "6*sqrt(2)/5"],
    ["RAD.1", "6\\sqrt{2}/5"],
    ["RAD.1", "(6sqrt(2))/5"],
    ["RAD.1", "\\dfrac{6\\sqrt{2}}{5}"],
    ["RAD.2", "√10"],
    ["RAD.2", " √10"],
    ["RAD.2", "sqrt10"],
    ["RAD.2", "sqrt(10)"],
    ["RAD.2", "\\sqrt10"],
    ["RAD.2", "\\sqrt{10}"],
    ["RAD.2", "1*sqrt(10)"],
  ])("%s accepts %s", (nodeId, answer) => {
    expect(cfuAccepts(nodeId, answer)).toBe(true);
  });

  /** The near misses each CFU's own slides warn about, so a partial answer stays wrong. */
  it("still rejects a wrong radical", () => {
    // Simplified the top but never split the root over the denominator.
    expect(cfuAccepts("RAD.1", "6√2")).toBe(false);
    expect(cfuAccepts("RAD.1", "6√5/2")).toBe(false);
    // Combined the top but stopped before rationalizing.
    expect(cfuAccepts("RAD.2", "5√2/√5")).toBe(false);
    expect(cfuAccepts("RAD.2", "√5")).toBe(false);
  });

  /**
   * RAD.3's CFU evaluates 25^(3/2), a base no `d2.rad3.eval.l1` instance draws, so
   * practice can never re-serve the CFU word for word. The numeric spellings must all
   * pass; `5^3` is deliberately NOT accepted, because the prompt asks for the evaluated
   * scale factor and an unevaluated power is the intermediate step, not the answer.
   */
  it("RAD.3 accepts the numeric spellings of 125 but not an unevaluated power", () => {
    expect(cfuAccepts("RAD.3", "125")).toBe(true);
    expect(cfuAccepts("RAD.3", "125.0")).toBe(true);
    expect(cfuAccepts("RAD.3", "125.00")).toBe(true);
    expect(cfuAccepts("RAD.3", "5^3")).toBe(false);
  });

  it("marks the RAD.1/RAD.2 CFUs as radical-answer, so the input names the notation", () => {
    for (const nodeId of ["RAD.1", "RAD.2"]) {
      const accepted = d2LessonByNode[nodeId]?.cfu?.accepted ?? [];
      expect(accepted.some(isRadicalAnswerText), nodeId).toBe(true);
    }
    // RAD.3 evaluates to a plain number, so it must NOT claim a radical answer.
    expect((d2LessonByNode["RAD.3"]?.cfu?.accepted ?? []).some(isRadicalAnswerText)).toBe(
      false,
    );
  });

  /**
   * RAD.4's CFU asks for $\sqrt{36x^6}$, whose answer is an absolute value with no root
   * left in it. The accepted list therefore trips the ABSOLUTE-VALUE predicate rather
   * than the radical one, and it has to carry every spelling a learner would reasonably
   * type: `abs(...)` or pipes, bars around the whole power or around the letter alone,
   * with or without an explicit `*`. The bare $6x^3$ stays wrong, because dropping the
   * bars is the exact mistake the node exists to correct.
   */
  it("RAD.4 accepts every reasonable absolute-value spelling but not the bare power", () => {
    const accepted = d2LessonByNode["RAD.4"]?.cfu?.accepted ?? [];
    expect(accepted.some(isAbsoluteValueAnswerText)).toBe(true);

    for (const answer of [
      "6*abs(x^3)",
      "6abs(x^3)",
      "6 abs(x^3)",
      "6*|x^3|",
      "6|x^3|",
      "6*abs(x)^3",
      "6|x|^3",
      "abs(6x^3)",
      "|6x^3|",
      "6*x^2*abs(x)",
      "6x^2|x|",
    ]) {
      expect(cfuAccepts("RAD.4", answer), answer).toBe(true);
    }

    expect(cfuAccepts("RAD.4", "6x^3")).toBe(false);
    expect(cfuAccepts("RAD.4", "6*x^3")).toBe(false);
    // Simplified the letter but never took the root of 36.
    expect(cfuAccepts("RAD.4", "36abs(x^3)")).toBe(false);
  });

  /**
   * The CFU comes BEFORE practice, so whatever it accepts is what a learner concludes
   * the notation is. RAD.4's list used to accept four braced-exponent spellings
   * (`6abs(x^{3})`) and four KaTeX bar macros (`6\left|x^3\right|`), none of which the
   * practice checker can read: braced exponents and the bar macros are not in its
   * grammar, so all eight came back `invalid_input / parse_error` or
   * `wrong_representation` the moment the same learner typed them into a practice slot.
   * The list was internally inconsistent about it too, carrying brace variants for two
   * of the five spellings and none of the others.
   *
   * Widening the grammar would have been the other fix, and it is not free: the parse
   * limits are shared by every domain. So the CFU drops the spellings instead, and this
   * pins that what it teaches, practice can grade.
   */
  it("RAD.4 accepts nothing its own practice checker cannot parse", () => {
    const symbols = ["x"];
    const definition = {
      answer_key: "6*abs(x^3)",
      allowed_symbols: symbols,
      answer_spec: {
        answer_type: "numeric",
        equivalence: "exact_value",
        representation: "exact",
        simplification: "simplified_radical",
        required_form: null,
        required_notation: "none",
        precision: null,
        unit_policy: "none",
      },
    };
    const checker = createProductAnswerChecker({
      itemVersions: [
        { item_version_id: "rad4-cfu", answer: definition },
      ] as unknown as Parameters<typeof createProductAnswerChecker>[0]["itemVersions"],
    });
    const accepted = d2LessonByNode["RAD.4"]?.cfu?.accepted ?? [];
    expect(accepted.length).toBeGreaterThan(0);
    for (const spelling of accepted) {
      const result = checker({
        raw_answer: spelling,
        item_version_id: "rad4-cfu",
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
      });
      expect(result.status, `${spelling} -> ${result.reason_code}`).toBe("correct");
    }
  });
});

/**
 * The placeholder a RENDERED question shows, judged against the answer that question actually
 * wants.
 *
 * Every sweep above this one reads an authored pack. A pack with a `variants` block renders
 * more questions than it authors, and a re-ask's accepted list is BUILT rather than written:
 * `solutionSetForms` spells a roster every way a learner might write it, `{-4, 2/5}` and
 * `[-4, 2/5]` among them. `cfuNotation` then read that list with `.some`, so the square-bracket
 * spelling — an alternative nobody is asked to produce — decided the notation of the answer
 * everybody IS asked to produce.
 *
 * `[-4, 2/5]` satisfies `isIntervalAnswerText`, so POL.4's re-ask was tagged `interval`: the
 * field said "Interval, e.g. (-inf, 2] U (7, inf)" and offered NO keys, over an answer that
 * cannot be written without a slash. The authored question on the same card says "Use / for a
 * fraction: 3/8" and offers the fraction key, so the guidance did not merely go missing on the
 * re-ask, it reversed.
 *
 * The rule below is the general one rather than a POL.4 special case: a line that names a
 * SHAPE may only be shown where the canonical answer is that shape. It is derived from the
 * dispatch's own predicates, so a new pack landing in the wrong cohort is reported without
 * anybody adding a row.
 */
describe("a rendered CFU never advertises a shape its own answer is not", () => {
  /**
   * The placeholders that claim the whole answer is one particular shape, each with the
   * predicate that recognises it. These are the lines that can be WRONG rather than merely
   * unhelpful: an interval line over a roster tells a learner to write brackets and bounds.
   */
  const SHAPE_LINES: readonly {
    readonly name: string;
    readonly text: string;
    readonly isShape: (value: string) => boolean;
  }[] = [
    {
      name: "INTERVAL_PLACEHOLDER",
      text: INTERVAL_PLACEHOLDER,
      isShape: isIntervalAnswerText,
    },
    {
      name: "POINT_PLACEHOLDER",
      text: POINT_PLACEHOLDER,
      isShape: isCoordinatePairAnswerText,
    },
  ];

  it("shows a shape line only where the canonical answer has that shape", () => {
    const misdirected: string[] = [];
    let checked = 0;

    // Exactly the call `cfu.tsx` makes: the PACK's spec beside the INSTANCE's accepted list.
    // Passing `undefined` for the spec would be measuring a dispatch the surface never runs.
    for (const { label, cfu, ask } of RENDERED_CFU_ASKS) {
      const shown = cfuPlaceholder(cfu.check, ask.accepted);
      const canonical = ask.accepted[0] ?? "";
      for (const line of SHAPE_LINES) {
        if (shown !== line.text) {
          continue;
        }
        checked += 1;
        if (!line.isShape(canonical)) {
          misdirected.push(
            `${label} answers ${JSON.stringify(canonical)} and is shown ${line.name}`,
          );
        }
      }
    }

    // Floors, because "nothing misdirected" over a cohort that emptied is free. The first says
    // the population exists at all; the second that some ask really does reach a shape line, or
    // the loop above never ran a comparison.
    expect(RENDERED_CFU_ASKS.length, "no rendered asks").toBeGreaterThan(60);
    expect(checked, "no ask reaches a shape line, so this proves nothing").toBeGreaterThan(
      2,
    );
    expect(misdirected.join("\n")).toBe("");
  });

  /**
   * The re-asks are genuinely IN the population, asserted separately because the sweep above
   * would pass just as quietly if `cfuInstances` returned only the authored question for every
   * pack — which is exactly what it does for a pack with no `variants` block, and what the
   * whole tree looked like to these files before this population existed.
   */
  it("covers rendered re-asks and not only the authored questions", () => {
    const reAsks = RENDERED_CFU_ASKS.filter((entry) => entry.isReAsk);
    expect(
      reAsks.length,
      "no re-ask is rendered, so the widening bought nothing",
    ).toBeGreaterThan(40);
    // The two nodes this sweep was written for, named so the population cannot drift off them.
    for (const nodeId of ["POL.3", "POL.4"]) {
      expect(
        reAsks.filter((entry) => entry.nodeId === nodeId).length,
        `${nodeId} renders no re-ask`,
      ).toBeGreaterThan(0);
    }
  });
});

/**
 * WHAT A SPELLING ADDED TO POL.4'S ACCEPTED LIST DOES TO THE LINE ABOVE ITS FIELD.
 *
 * An accepted list is two things at once: the set the grader compares against, and the pack's
 * statement of what notation the answer is written in. So widening it to grade one more correct
 * answer can silently rewrite the guidance, and this round watched that happen — pushing POL.4
 * from four entries to 144 retagged it `interval` and deleted its `/` key.
 *
 * ## The measurement that was taken before anything was landed
 *
 * Over the real {@link cfuNotation}, at the tip, with the unreduced spellings still unlanded:
 *
 * | accepted list | notation |
 * |---|---|
 * | at the pin (6 entries) | `fraction_bar` |
 * | + the 6 BARE unreduced fractions | `fraction_bar` |
 * | + the 6 BRACED unreduced fractions as well | `fraction_bar` |
 * | + a braced DECIMAL, `{-4, 1.5}` | `solution_set_fraction` |
 *
 * A braced spelling moved the tag only if it was a braced roster of PLAIN NUMBERS, because that
 * was all {@link isSolutionRosterAnswerText} matched — a character class of `[\d.]`, with no
 * reading for a slash. So all twelve unreduced spellings were inert and Stream A's declined
 * braced decimals were the only lever, which meant the grading fix and the notation question
 * were never actually in conflict and could be decided one at a time.
 *
 * ## The ruling, and why it is not taken by pulling that lever
 *
 * `solution_set_fraction` IS the right tag here. POL.4's prompt says *"list both solutions"* and
 * its answer is `{-4, 3/2}`: a solution set, one of whose members is a fraction. `fraction_bar`
 * says *"Use / for a fraction: 3/8"*, which names the slash and says nothing about there being
 * two roots to list or how to separate them; `SOLUTION_SET_FRACTION_PLACEHOLDER` names both, and
 * POL.4's own RE-ASK was already on it, so the authored card was the odd half of one card.
 *
 * But reaching it by adding a decimal spelling would make the guidance a side effect of the
 * grader list — the tag would then depend on `{-4, 1.5}` staying listed, and deleting a
 * redundant decimal in a year's tidy-up would silently take the roster line with it. The
 * predicate was simply wrong instead: `{-4, 3/2}` is a braced roster of values and the rule
 * failed to see it only because a slash is not a digit. Widened there, the tag follows from
 * POL.4's OWN canonical spelling. Measured blast radius, over every authored pack in the tree:
 * one node moves, POL.4, and the `fraction_bar` cohort census in this file is the assertion that
 * says so.
 */
describe("POL.4's accepted list, and which additions to it move the notation", () => {
  const AT_THE_PIN = [
    "{-4, 3/2}",
    "{3/2, -4}",
    "-4, 3/2",
    "3/2, -4",
    "-4, 1.5",
    "1.5, -4",
  ] as const;

  const BARE_UNREDUCED = [
    "-4, 6/4",
    "6/4, -4",
    "-4, 9/6",
    "9/6, -4",
    "-4, 12/8",
    "12/8, -4",
  ] as const;

  const BRACED_UNREDUCED = [
    "{-4, 6/4}",
    "{6/4, -4}",
    "{-4, 9/6}",
    "{9/6, -4}",
    "{-4, 12/8}",
    "{12/8, -4}",
  ] as const;

  const BRACED_DECIMAL = ["{-4, 1.5}", "{1.5, -4}"] as const;

  // POL.4 carries no `check` block: `cfu.tsx` grades it by exact match over the list, and
  // `cfuNotation` therefore has nothing but the list to read the notation off.
  const dispatch = (accepted: readonly string[]) => cfuNotation(undefined, accepted);

  /**
   * The ruling, on the list POL.4 actually ships. Read off its own canonical `{-4, 3/2}`, so
   * every other row below is a statement that some ADDITION did not change it.
   */
  it("names the roster and the bar, because the answer is a roster with a bar in it", () => {
    expect(dispatch(AT_THE_PIN)).toBe("solution_set_fraction");
    expect(cfuPlaceholder(undefined, AT_THE_PIN)).toBe(SOLUTION_SET_FRACTION_PLACEHOLDER);
  });

  it("is unmoved by the unreduced spellings, braced or bare, or by a braced decimal", () => {
    for (const addition of [
      BARE_UNREDUCED,
      BRACED_UNREDUCED,
      [...BARE_UNREDUCED, ...BRACED_UNREDUCED],
      BRACED_DECIMAL,
      [...BARE_UNREDUCED, ...BRACED_UNREDUCED, ...BRACED_DECIMAL],
    ]) {
      expect(
        dispatch([...AT_THE_PIN, ...addition]),
        `moved by ${JSON.stringify(addition)}`,
      ).toBe("solution_set_fraction");
    }
  });

  /**
   * The boundary of the widened predicate, both ways, because "a roster is a roster" is worth
   * nothing if it has quietly become "anything braced is a roster" or if the widening has
   * swallowed the bare cohort it was never about.
   */
  it("reads a braced roster whether its members are fractions, decimals or whole", () => {
    for (const roster of ["{-4, 3/2}", "{-4, 6/4}", "{-4, 1.5}", "{39, 51}", "{4}"]) {
      expect(isSolutionRosterAnswerText(roster), `${roster} is a roster`).toBe(true);
    }
    // Not braced, so not a roster: this is the spelling that keeps `fraction_bar` a live tag.
    for (const other of ["-4, 3/2", "3/8", "(-4, 2]", "{x | x > 3}", "{-4, y/2}"]) {
      expect(isSolutionRosterAnswerText(other), `${other} is not a roster`).toBe(false);
    }
    expect(dispatch(["-4, 3/2", "3/2, -4"])).toBe("fraction_bar");
  });
});

/**
 * The notation a CFU advertises, over every question the card can actually ASK.
 *
 * A pack's authored accepted list and its DRAWN re-ask are two different lists, and this defect
 * lived only in the second: `solutionSetForms` spelt a roster with a bracketed alternative
 * (`[5, 11]`) beside the braced one — it no longer generates that entry at all, and
 * `cfuRosterBracketing.test.ts` fails if one returns — `isIntervalAnswerText` matched it, and
 * the interval branch of `cfuNotation` sat ABOVE the roster branch. So LIN.5's re-ask of
 * `|x - 8| = 3` advertised
 * `Interval, e.g. (-inf, 2] U (7, inf)` for an answer that is two numbers, on the one surface a
 * learner only reaches after already missing once, and with no keypad or live preview to
 * contradict it (`interval` and `solution_set` both map to an empty key row). The authored
 * question was unaffected, which is why a pass over the packs could not see it.
 *
 * The population is scoped to the BEHAVIOUR and not to the layer: every instance `cfuInstances`
 * can serve, from every registered domain, authored and drawn alike — because the card reads its
 * placeholder off the instance in hand (`cfu.tsx` calls `cfuPlaceholder(cfu.check,
 * asked.accepted)`), so an authored-only sweep measures half of what ships. Membership is read
 * off the BRACES, which are the unambiguous half of the pair: an instance accepting `{5, 11}` has
 * an answer that is a set, whatever else its list spells.
 */
const ROSTER_CFU_INSTANCES = LESSON_DOMAINS.flatMap((domain) =>
  Object.entries(domain.lessonByNode).flatMap(([nodeId, lesson]) => {
    const cfu = lesson?.cfu;
    return cfu
      ? cfuInstances(cfu).flatMap((instance, index) =>
          instance.accepted.some(isSolutionRosterAnswerText)
            ? [
                {
                  where: `${domain.id}:${nodeId} instance ${index}${instance.authored ? " (authored)" : " (drawn)"}`,
                  authored: instance.authored === true,
                  check: cfu.check,
                  accepted: instance.accepted,
                },
              ]
            : [],
        )
      : [];
  }),
);

describe("a CFU whose answer is a solution set is never shown the interval line", () => {
  it(`sweeps ${ROSTER_CFU_INSTANCES.length} roster-answer CFU instances across ${new Set(ROSTER_CFU_INSTANCES.map((entry) => entry.where.split(" ")[0])).size} nodes`, () => {
    expect(
      ROSTER_CFU_INSTANCES.length,
      "no CFU instance accepts a braced roster any more",
    ).toBeGreaterThanOrEqual(6);
    // A floor constrains size and not shape. The DRAWN half is where the bracketed alternative
    // comes from and where the defect was, so a population that had drifted back to the authored
    // questions alone — which is the shape every earlier sweep in this file had — fails here
    // instead of clearing the count with the wrong members.
    expect(
      ROSTER_CFU_INSTANCES.filter((entry) => !entry.authored).length,
      "the drawn re-asks have left the population, which is where this defect lives",
    ).toBeGreaterThanOrEqual(3);
  });

  it("names the roster on every one of them, not the interval", () => {
    for (const { where, check, accepted } of ROSTER_CFU_INSTANCES) {
      const notation = cfuNotation(check, accepted);
      expect(notation, `${where}: ${accepted.slice(0, 4).join(" | ")}`).not.toBe(
        "interval",
      );
      expect(cfuPlaceholder(check, accepted), where).not.toBe(INTERVAL_PLACEHOLDER);
    }
  });

  /**
   * The dispatch on its own, over hand-built lists, so the property is pinned to the two pure
   * functions rather than to any pack's current numbers.
   *
   * The lists below are HYPOTHETICAL and no longer describe anything the tree generates:
   * `solutionSetForms` used to push `[${list}]` beside `{${list}}` and has stopped, because a
   * bracketed roster is the closed interval and accepting it marked that misconception correct.
   * They are kept as literals rather than rebuilt from the generator precisely because of that —
   * reading the real shape would leave this reading braces against nothing, and the ordering
   * rule (braces before brackets, the unambiguous half of the pair first) still has to hold for
   * any list that reaches it. `cfuRosterBracketing.test.ts` is what now asserts that no served
   * instance actually offers one.
   */
  it("reads the braces, not the bracketed alternative beside them", () => {
    const forms = ["5, 11", "{5, 11}", "[5, 11]", "11, 5", "{11, 5}", "[11, 5]"];
    expect(cfuNotation(undefined, forms)).toBe("solution_set");
    expect(cfuPlaceholder(undefined, forms)).toBe(SOLUTION_SET_PLACEHOLDER);
    // A three-value roster flipped the same way, and a one-value roster never did, so both ends
    // of the range the report measured are here.
    expect(cfuNotation(undefined, ["3, 5, 7", "{3, 5, 7}", "[3, 5, 7]"])).toBe(
      "solution_set",
    );
    expect(cfuNotation(undefined, ["3", "{3}", "[3]"])).toBe("solution_set");
    // And a real interval still reaches the interval line: nothing in that list is braced.
    expect(cfuNotation(undefined, ["(-inf, 2] U (7, inf)"])).toBe("interval");
    expect(cfuPlaceholder(undefined, ["[-3, 5)"])).toBe(INTERVAL_PLACEHOLDER);
  });
});

/**
 * THE PREVIEW GATE, and the one property that makes opening it a fix rather than a regression.
 *
 * `MathAnswerColumn` used to render the keypad and the live preview together or not at all, on
 * `keys.length`, so the five notation-carrying tags that correctly get no key row also got no
 * reading of the notation whose writing is their whole graded skill. Deleting that gate is NOT
 * the fix: measured at `da781d1f`, `previewOf` returned `null` for `(-inf, 5]`, `39, 51`,
 * `{-4, 2/5}`, `{x | x != 9}` and `(-inf, 19] U [29, inf)`, so the box would have appeared and
 * stayed empty — and it would have appeared over `multiple_choice` too, typesetting the word
 * `decreasing` as `\mathrm{decreasing}`.
 *
 * So the gate is `previewsNotation`, and what has to hold of it is an IMPLICATION in one
 * direction: **every field that draws a preview is one whose own answer the parser can read.**
 * That is asserted over the answers themselves — every served key and every rendered CFU
 * instance's canonical spelling — rather than over the tag list, because a tag admitted by
 * name proves nothing about whether the box would have anything in it.
 *
 * The converse is deliberately not claimed. `previewOf` reads plenty that stays previewless: a
 * plain `numeric` practice key draws fine and is tagged `none`, because `none` is the
 * fall-through tag reached when the spec has said nothing at all about notation, and a
 * form-dependent CFU with no `check` lands there whatever its answer is — words included.
 */
const PREVIEWED_SERVED_ANSWERS = SERVED_ITEMS.filter((item) =>
  answerFormat.answerPreview(
    item.answer.answer_spec,
    item.answer.allowed_symbols,
    item.answer.answer_key,
  ),
).map((item) => ({
  where: item.item_version_id,
  tag: answerNotation(
    item.answer.answer_spec,
    item.answer.allowed_symbols,
    item.answer.answer_key,
  ),
  answer: String(item.answer.answer_key ?? ""),
}));

const PREVIEWED_CFU_ASKS = RENDERED_CFU_ASKS.filter(({ cfu, ask }) =>
  answerFormat.cfuPreview(cfu.check, ask.accepted),
).map(({ label, cfu, ask }) => ({
  where: label,
  tag: cfuNotation(cfu.check, ask.accepted),
  answer: ask.accepted[0] ?? "",
}));

describe("a field only draws a preview when the parser can read its own answer", () => {
  it(`sweeps ${PREVIEWED_SERVED_ANSWERS.length} served answers and ${PREVIEWED_CFU_ASKS.length} rendered CFU asks`, () => {
    // The floor, because an implication over an empty population holds trivially.
    expect(
      PREVIEWED_SERVED_ANSWERS.length,
      "no served item previews, so this sweep is about nothing",
    ).toBeGreaterThanOrEqual(400);
    expect(PREVIEWED_CFU_ASKS.length).toBeGreaterThanOrEqual(20);
    // A floor constrains size and not shape, and the shape IS the change: the three tags
    // below are the ones that had no preview at all before this, so a population that had
    // drifted back to the fields which already previewed would still clear the counts.
    const tags = new Set([
      ...PREVIEWED_SERVED_ANSWERS.map((entry) => entry.tag),
      ...PREVIEWED_CFU_ASKS.map((entry) => entry.tag),
    ]);
    for (const tag of [
      "interval",
      "solution_set",
      "rational_expression",
      "numeric_literal",
    ]) {
      expect(tags, `no previewing field is tagged ${tag}`).toContain(tag);
    }
  });

  it.each([...PREVIEWED_SERVED_ANSWERS, ...PREVIEWED_CFU_ASKS])(
    "$where draws its own answer $answer",
    ({ where, tag, answer }) => {
      expect(
        previewOf(answer),
        `${where} (${tag}) previews, and the parser refuses ${JSON.stringify(answer)} — so the box appears and stays empty`,
      ).not.toBeNull();
    },
  );

  /**
   * The four tags that stay previewless, each with the reason it does, asserted so that
   * neither half of the exemption can lapse: a tag that stops being previewless fails here,
   * and a tag that has left the notation vocabulary fails at the `answerNotation` call above
   * it. The two reasons are different and only one of them is about the parser.
   */
  it("keeps the word answers and the two unread notations out", () => {
    // Words. `previewOf` would draw these, which is exactly the problem.
    expect(answerFormat.previewsNotation("multiple_choice")).toBe(false);
    expect(answerFormat.previewsNotation("none")).toBe(false);
    expect(previewOf("decreasing")).not.toBeNull();
    // NOT DONE, and refused rather than half-read: a set-builder condition needs a grammar
    // for `|` and `!=` the parser does not have, and a coordinate pair is byte-identical to
    // an open interval, so the parser reads `(6, -7)` as an interval and would say so.
    expect(answerFormat.previewsNotation("set_builder")).toBe(false);
    expect(answerFormat.previewsNotation("point")).toBe(false);
    expect(previewOf("{x | x != 9}")).toBeNull();
    expect(previewOf("(6, -7)")?.spoken).toBe("the open interval from 6 to negative 7");
  });
});
