import {
  D3_PRACTICE_RETRY_VARIANTS_PER_CELL,
  DEMO_PINNED_TEMPLATE_IDS,
  type DiscardedMutation,
  type FormViolation,
  formViolationsFor,
  type FrozenItem,
  type KeyDerivedWrongAnswer,
  keyDerivedWrongAnswers,
} from "@cr/item-bank";
import { beforeAll, describe, expect, it } from "vitest";

import {
  type PracticeSurface,
  SERVED_PRACTICE_ITEMS,
  submitThroughPracticeSurface,
} from "./submitPathHarness";

/**
 * WRONG ANSWERS, DERIVED FROM EVERY SERVED ITEM'S OWN KEY, SUBMITTED THROUGH THE WHOLE PATH.
 *
 * ## What this measures that no other sweep in the tree does
 *
 * `validateTemplates` and `validatePracticePool` are positive-only: they grade the declared
 * key and assert it is accepted, over ~322 templates x 40 samples plus 2,265 frozen items, and
 * they never once submit a wrong answer. The wrong-answer coverage that existed before this
 * file was roughly 75-100 checker spike cases on synthetic fixtures plus ~40-50 CFU digit-bump
 * rows — well under 1% of what is served, and none of it tied to a served instance.
 *
 * ## Wrongness is established WITHOUT the checker, and that is the whole design
 *
 * Every mutation carries an independent witness (`mathjs` evaluation at fixed probe points, or
 * exact rational arithmetic, or a structural comparison of a parsed roster / interval / point /
 * payload) before it is submitted. If the checker decided which mutations counted, a checker
 * that accepted everything would report zero false positives AND zero valid mutations, and the
 * two would be indistinguishable from outside. Mutations that cannot be shown wrong are
 * DISCARDED, not submitted-and-excused, and the discard reasons are counted below.
 *
 * ## Three outcome classes, held apart on purpose
 *
 * A wrong answer refused `invalid_input` because it did not PARSE proves nothing about the
 * comparator; the identical refusal would meet a correct answer written that way. A refusal
 * `blocked_by_guard` is a third thing again — it never reached the grader. So the
 * rejection-quality floor below counts only `value_wrong` families and only rejections on a
 * value comparison, and `empty_string` / `whitespace_only` / `prompt_echo` / `empty_payload`
 * are excluded from it BY NAME, with the exclusion asserted in both directions.
 *
 * ## The coverage gap this file encodes rather than scopes around
 *
 * 409 served items carry a simplification rule that the mechanical census never attacked with
 * a same-value-forbidden-shape mutation, `simplified_radical` (97 items) among them — the very
 * family `submitGuards.ts` records a shipped defect in. Those mutations are built here, and
 * the coverage assertion derives the rule set FROM THE POOL rather than from the generator's
 * own list, so a rule nothing can attack fails here instead of being quietly absent.
 */

const SURFACES: readonly PracticeSurface[] = ["lesson_practice", "infinite_drill"];

/**
 * TEMPORARY, and self-restoring. A template pinned to one instance for the scripted
 * demonstration contributes its canonical instance and NO variants, so the served population
 * drops by exactly the retry depth per pinned template. Derived from the pin list rather than
 * written down as a smaller number, so the floor climbs back to 2,265 on its own when the list
 * empties and cannot be left slack once the pin is reverted. `demoPinnedTemplates.ts` holds the
 * contract and `d3.test.ts` proves the exemption is still earned. Only the COUNT moves: the
 * pinned template still freezes a real item whose wrong answers are mutated and submitted here
 * like any other, so the per-item `value_wrong` assertion beside this floor still covers it.
 */
const SERVED_ITEMS_FLOOR =
  2265 - DEMO_PINNED_TEMPLATE_IDS.length * D3_PRACTICE_RETRY_VARIANTS_PER_CELL;

/**
 * The reason codes that mean the comparator actually COMPARED, as opposed to the reader
 * failing to read. Derived from the checker's vocabulary rather than guessed: anything ending
 * `_mismatch`, plus the named value verdicts.
 */
const VALUE_REASONS = new Set([
  "sign_error",
  "extra_solution",
  "incomplete_solution_set",
  "missing_exclusion",
  "extra_exclusion",
  "not_simplified",
  "not_factored",
  "not_expanded",
  "not_condensed",
  "not_primitive",
  "reducible_factor",
  "wrong_representation",
  "mixed_log_bases",
  "wrong_unit",
  "precision_mismatch",
  // Both of these ARE value comparisons that happen to have their own named verdict rather
  // than a `_mismatch` suffix: an interval whose endpoint is included when the key excludes it
  // is a different SET, and a swapped ordered pair is a different POINT. Reading them as
  // parse-dominated would understate the comparator by two whole families.
  "wrong_bound_inclusivity",
  "coordinates_swapped",
]);

function isValueRejection(reasonCode: string | null): boolean {
  return (
    reasonCode !== null &&
    (reasonCode.endsWith("_mismatch") || VALUE_REASONS.has(reasonCode))
  );
}

/**
 * The families that are legitimately refused before any comparison happens, EXCLUDED BY NAME
 * from the rejection-quality floor.
 *
 * Asserted in both directions below. A listed family that starts rejecting on value fails, so
 * the list cannot sit here excusing something that has stopped needing it; an unlisted family
 * that drops below the floor fails, so the list cannot become the place a genuinely broken
 * family goes to hide.
 */
const PARSE_DOMINATED_FAMILIES: readonly string[] = [
  "empty_string",
  "whitespace_only",
  "prompt_echo",
  "empty_payload",
];

interface Submission {
  readonly item: FrozenItem;
  readonly family: string;
  readonly answerClass: string;
  readonly witness: string;
  readonly outcome: string;
  readonly reasonCode: string | null;
  readonly surface: PracticeSurface;
  readonly payload: unknown;
}

interface CensusResult {
  readonly submissions: readonly Submission[];
  readonly discarded: readonly (DiscardedMutation & { readonly item: string })[];
  readonly perItemValueWrong: ReadonlyMap<string, number>;
  readonly formViolationsByRule: ReadonlyMap<string, number>;
  readonly rulesInPool: ReadonlySet<string>;
}

/**
 * A multiple-choice item's own option vocabulary, derived from the keys its node serves. A
 * wrong option has to come from the item's own alternatives or the submission is a parse test.
 */
function optionVocabulary(): Map<string, string[]> {
  const byNode = new Map<string, Set<string>>();
  for (const item of SERVED_PRACTICE_ITEMS) {
    if (item.answer.answer_spec.answer_type !== "multiple_choice") {
      continue;
    }
    const key = typeof item.answer.answer_key === "string" ? item.answer.answer_key : "";
    if (!key) {
      continue;
    }
    const bucket = byNode.get(item.node_id) ?? new Set<string>();
    bucket.add(key);
    byNode.set(item.node_id, bucket);
  }
  return new Map([...byNode].map(([node, options]) => [node, [...options]]));
}

let census: CensusResult;

beforeAll(() => {
  const vocabulary = optionVocabulary();
  const submissions: Submission[] = [];
  const discarded: (DiscardedMutation & { item: string })[] = [];
  const perItemValueWrong = new Map<string, number>();
  const formViolationsByRule = new Map<string, number>();
  const rulesInPool = new Set<string>();

  for (const item of SERVED_PRACTICE_ITEMS) {
    const spec = item.answer.answer_spec;
    if (spec.simplification && spec.simplification !== "none") {
      rulesInPool.add(spec.simplification);
    }
    if (spec.required_form) {
      rulesInPool.add(spec.required_form);
    }

    const derived = keyDerivedWrongAnswers(item, {
      siblingOptions: vocabulary.get(item.node_id) ?? [],
    });
    const forms = formViolationsFor(item);
    for (const entry of [...derived.discarded, ...forms.discarded]) {
      discarded.push({ ...entry, item: item.item_version_id });
    }
    for (const violation of forms.violations) {
      formViolationsByRule.set(
        violation.rule,
        (formViolationsByRule.get(violation.rule) ?? 0) + 1,
      );
    }

    const all: readonly (KeyDerivedWrongAnswer | (FormViolation & { rule: string }))[] = [
      ...derived.mutations,
      ...forms.violations,
    ];
    let valueWrong = 0;
    for (const mutation of all) {
      const answerClass =
        "answer_class" in mutation ? mutation.answer_class : ("form_violation" as const);
      if (answerClass === "value_wrong") {
        valueWrong += 1;
      }
      for (const surface of SURFACES) {
        const result = submitThroughPracticeSurface(item, mutation.payload, { surface });
        submissions.push({
          item,
          family: mutation.family,
          answerClass,
          witness: mutation.witness,
          outcome: result.outcome,
          reasonCode: result.reason_code,
          surface,
          payload: mutation.payload,
        });
      }
    }
    perItemValueWrong.set(item.item_version_id, valueWrong);
  }

  census = { submissions, discarded, perItemValueWrong, formViolationsByRule, rulesInPool };
}, 1_800_000);

describe("no wrong answer derived from an item's own key is graded correct", () => {
  it.each(SURFACES)("holds on every mutation on the %s surface", (surface) => {
    // Scope: mutations whose VALUE differs from the key, plus the non-answers. A form
    // violation is by construction the same number as the key, so it is a claim about the
    // item's declared shape rule and not about the comparator; it gets its own assertion in
    // "never accepts a right-value-wrong-shape answer" below, with its own floor, so nothing
    // is dropped by this split. Both classes are asserted; neither is excused.
    const accepted = census.submissions.filter(
      (row) =>
        row.surface === surface &&
        row.outcome === "correct" &&
        row.answerClass !== "form_violation",
    );
    expect(
      accepted
        .slice(0, 20)
        .map(
          (row) =>
            `${row.item.item_version_id} [${row.family}] ${JSON.stringify(row.payload)} — ${row.witness}`,
        ),
    ).toEqual([]);
    // The floor: "no acceptances" is free over an empty sweep, and a generator that silently
    // stopped producing mutations is exactly how this file would stop measuring anything.
    const submitted = census.submissions.filter((row) => row.surface === surface);
    expect(submitted.length).toBeGreaterThanOrEqual(9000);
  });
});

describe("the census is broad enough for that zero to mean something", () => {
  it("mutates every served item, with a value_wrong mutation for each", () => {
    expect(census.perItemValueWrong.size).toBeGreaterThanOrEqual(SERVED_ITEMS_FLOOR);
    // Not merely one mutation per item: `empty_string` is available for every item and would
    // satisfy a bare floor while testing the parser only.
    const noValueWrong = [...census.perItemValueWrong.entries()].filter(([, n]) => n === 0);
    expect(noValueWrong.slice(0, 20).map(([id]) => id)).toEqual([]);
  });

  it("covers every answer type, so no cohort is silently outside the sweep", () => {
    // Composition, not size. A sweep of 13,000 mutations over numeric items only would clear
    // the floor above and leave the 217 non-string items — the P0's cohort — untouched.
    const byType = new Map<string, number>();
    for (const row of census.submissions) {
      const type = row.item.answer.answer_spec.answer_type;
      byType.set(type, (byType.get(type) ?? 0) + 1);
    }
    expect(byType.size).toBeGreaterThanOrEqual(9);
    for (const type of [
      "numeric",
      "expression",
      "solution_set",
      "interval",
      "point",
      "multiple_choice",
      "rational_answer",
      "expr_builder",
      "number_line",
    ]) {
      expect(byType.get(type) ?? 0, `no mutation reached a ${type} item`).toBeGreaterThan(
        0,
      );
    }
  });

  it("spans at least a dozen distinct mutation families", () => {
    const families = new Set(census.submissions.map((row) => row.family));
    expect(families.size).toBeGreaterThanOrEqual(12);
    // Named, not just counted: these are the shapes the plan asked for, and a family that
    // stops being constructible fails here rather than shrinking the sweep silently.
    for (const family of [
      "digit_bump",
      "sign_flip",
      "off_by_one",
      "dropped_set_member",
      "added_set_member",
      "flipped_interval_bracket",
      "swapped_point_coordinates",
      "sibling_option",
      "dropped_rational_exclusion",
      "prompt_echo",
      "empty_string",
    ]) {
      expect(families.has(family), `family ${family} produced nothing`).toBe(true);
    }
  });
});

describe("the comparator is doing the rejecting, not the parser", () => {
  /** Per family, on the graded surface: how many graded attempts were refused on a value. */
  function rejectionQuality(): Map<string, { graded: number; onValue: number }> {
    const byFamily = new Map<string, { graded: number; onValue: number }>();
    for (const row of census.submissions) {
      if (row.surface !== "lesson_practice" || row.answerClass !== "value_wrong") {
        continue;
      }
      if (row.outcome === "blocked_by_guard") {
        continue;
      }
      const bucket = byFamily.get(row.family) ?? { graded: 0, onValue: 0 };
      bucket.graded += 1;
      if (row.outcome === "incorrect" && isValueRejection(row.reasonCode)) {
        bucket.onValue += 1;
      }
      byFamily.set(row.family, bucket);
    }
    return byFamily;
  }

  it("rejects at least 95% of every value_wrong family on a value comparison", () => {
    // This is what stops the suite passing on a checker that has degenerated into a parser.
    // Measured at the anchor SHA every such family cleared 98%.
    const quality = rejectionQuality();
    expect(quality.size).toBeGreaterThanOrEqual(10);
    const weak = [...quality.entries()]
      .filter(([, { graded, onValue }]) => graded >= 10 && onValue / graded < 0.95)
      .map(([family, { graded, onValue }]) => `${family}: ${onValue}/${graded}`);
    expect(weak).toEqual([]);
  });

  it("excludes the parse-dominated families by name, and the list fails both ways", () => {
    const byFamily = new Map<string, { graded: number; onValue: number }>();
    for (const row of census.submissions) {
      if (row.surface !== "lesson_practice" || row.answerClass !== "non_answer") {
        continue;
      }
      if (row.outcome === "blocked_by_guard") {
        continue;
      }
      const bucket = byFamily.get(row.family) ?? { graded: 0, onValue: 0 };
      bucket.graded += 1;
      if (row.outcome === "incorrect" && isValueRejection(row.reasonCode)) {
        bucket.onValue += 1;
      }
      byFamily.set(row.family, bucket);
    }

    // Direction one: every excluded family still exists and is still parse-dominated. An
    // entry that stops qualifying fails, so the list cannot go on excusing nothing.
    const stillExcused: string[] = [];
    for (const family of PARSE_DOMINATED_FAMILIES) {
      const bucket = byFamily.get(family);
      if (!bucket) {
        continue;
      }
      if (bucket.graded >= 20 && bucket.onValue / bucket.graded >= 0.95) {
        stillExcused.push(
          `${family} now rejects on value ${bucket.onValue}/${bucket.graded}`,
        );
      }
    }
    expect(stillExcused).toEqual([]);

    // Direction two: no unlisted non_answer family is quietly enjoying the exemption.
    const unlisted = [...byFamily.keys()].filter(
      (family) => !PARSE_DOMINATED_FAMILIES.includes(family),
    );
    expect(unlisted).toEqual([]);
    // A floor, because containment over an empty collection holds trivially.
    expect(byFamily.size).toBeGreaterThanOrEqual(3);
  });

  it("counts a guard refusal separately from a comparator rejection", () => {
    // 917 of the empty-string attempts never reached the grader at all. Folding those into
    // "rejected" would credit a guard with a comparator's work.
    const blocked = census.submissions.filter(
      (row) => row.surface === "lesson_practice" && row.outcome === "blocked_by_guard",
    );
    expect(blocked.length).toBeGreaterThan(0);
    for (const row of blocked) {
      expect(row.reasonCode, `${row.item.item_version_id} [${row.family}]`).toBeNull();
    }
  });
});

/**
 * The gap the census asked the guard phase to ENCODE rather than scope around.
 *
 * `census-report.md` reached `reduced_fraction` and all four `required_form` values and left
 * five simplification rules unattacked: `combined_polynomial` 181 items, `simplified_radical`
 * 97, `canonical_exact_trig_value` 83, `positive_exponents` 34, `combined_constants` 14 — 409
 * items whose "right number, wrong shape" failure mode had never been tried. Each of those is
 * exactly what a comparator that normalizes too eagerly would accept.
 *
 * All ten rules the pool declares now carry violations, each with its own floor, and the
 * coverage set below is derived FROM THE POOL rather than from the generator's list, so a rule
 * nothing can attack fails here instead of being quietly absent.
 *
 * The coverage set is derived FROM THE POOL, not from the generator's own list. A coverage
 * assertion that counts what the generator happens to produce is the failure mode
 * `.cursor/rules/qa-verification.mdc` exists to prevent: it is green by construction.
 */
describe("every simplification rule the pool declares can be attacked in its own shape", () => {
  /**
   * Rules that genuinely have no same-value-forbidden-shape witness, each with its reason.
   * Asserted in both directions, so an entry that becomes constructible fails and a rule that
   * stops appearing fails.
   */
  const NO_FORM_WITNESS: readonly { readonly rule: string; readonly reason: string }[] = [];

  /**
   * A form violation the shipped checker ACCEPTS, named rather than omitted.
   *
   * `combined_polynomial` runs `hasUncombinedLikeTerms`, which compares additive terms by
   * SYMBOL, so `5*t + 9 + 1` clears a profile whose own docstring (`template.ts`) says it
   * "requires the response be a fully expanded/combined polynomial". The sibling profile
   * `combined_constants` runs `hasUncombinedConstants` and refuses the identical payload.
   *
   * This is NOT closed in this round, deliberately, and it is a ranked carry in
   * `docs/qa-practice-answering-2026-08-10.md` rather than a one-line edit, for three reasons
   * a reviewer can check: `hasUncombinedConstants` lives in `checker-core.ts` and is shared
   * with the D1 v1 checker, so tightening it rescores production verdicts and owes a
   * `D1_CHECKER_VERSION` bump under Answer_Equivalence_Spec §13.13; its own docstring warns it
   * must be narrowed to additive parents before any reuse, and `combined_polynomial` grades
   * expressions that may carry a division; and `d1-checker-fixtures.ts` already pins the
   * identical hole on the sibling `expand_only` profile as KNOWN INHERITED LENIENCY, so this
   * predates the round rather than being introduced by it.
   *
   * Asserted in BOTH directions below, so the entry cannot outlive the leniency it describes.
   */
  const KNOWN_LENIENT_FAMILIES: readonly {
    readonly family: string;
    readonly rule: string;
    readonly reason: string;
  }[] = [
    {
      family: "uncombined_constants_on_polynomial",
      rule: "combined_polynomial",
      reason: "hasUncombinedLikeTerms compares by symbol and never looks at constant terms",
    },
  ];

  it("has a form-violation mutation for every rule, or a named reason it cannot", () => {
    const rules = [...census.rulesInPool].sort();
    expect(rules.length).toBeGreaterThanOrEqual(7);
    const excused = new Set(NO_FORM_WITNESS.map((entry) => entry.rule));
    const uncovered = rules.filter(
      (rule) => (census.formViolationsByRule.get(rule) ?? 0) === 0 && !excused.has(rule),
    );
    expect(uncovered).toEqual([]);

    // Direction two of the exception list: an excused rule that HAS become constructible
    // fails, so the list cannot outlive the reason it was written for.
    const nowConstructible = NO_FORM_WITNESS.filter(
      (entry) => (census.formViolationsByRule.get(entry.rule) ?? 0) > 0,
    ).map((entry) => entry.rule);
    expect(nowConstructible).toEqual([]);
    // And an excused rule that no longer appears in the pool at all.
    const stale = NO_FORM_WITNESS.filter(
      (entry) => !census.rulesInPool.has(entry.rule),
    ).map((entry) => entry.rule);
    expect(stale).toEqual([]);
  });

  it("carries a floor per rule, so no rule is covered by a single token witness", () => {
    // Every rule the pool declares, with a floor under the count measured on this tree. These
    // floors are what make the coverage assertion above more than a presence check: one
    // witness for `simplified_radical` would satisfy "at least one" over 97 items.
    //
    // `canonical_exact_trig_value` is the low one on purpose and its number is the finding
    // rather than a shortfall. 83 items carry it and only 6 have a forbidden shape at all,
    // because `radicalFormIssue` is a rule about RADICALS and most of this cohort's keys are
    // plain rationals (`3/5`, `-24/7`) with no radical to mis-write. An earlier draft read
    // that as 77 uncovered items and manufactured `6/10` for the key `3/5` to close the gap,
    // which reported the generator's assumption as a product false positive. The reduced form
    // is not required by the profile, so the shape does not exist to attack.
    const measured: readonly (readonly [string, number])[] = [
      ["reduced_fraction", 30],
      ["combined_polynomial", 250],
      ["combined_constants", 10],
      ["positive_exponents", 25],
      ["simplified_radical", 45],
      ["is_standard_polynomial", 55],
      ["fully_factored_over_integers", 25],
      ["is_expanded_log", 15],
      ["is_condensed_log", 5],
      ["canonical_exact_trig_value", 4],
    ];
    for (const [rule, floor] of measured) {
      expect(
        census.formViolationsByRule.get(rule) ?? 0,
        `rule ${rule}`,
      ).toBeGreaterThanOrEqual(floor);
    }
    // Composition, not just size: the floor table must still name every rule the pool serves,
    // so a newly authored rule cannot arrive uncovered while the ten above keep it green.
    const floored = new Set(measured.map(([rule]) => rule));
    const unfloored = [...census.rulesInPool].filter((rule) => !floored.has(rule));
    expect(unfloored).toEqual([]);
  });

  it("never accepts a right-value-wrong-shape answer", () => {
    // The finding, if there is one. A form violation is by construction the SAME NUMBER as the
    // key, so this is the assertion that says the item's declared rule is enforced rather than
    // decorative — and it must not be weakened to make the file green.
    const accepted = census.submissions.filter(
      (row) =>
        row.answerClass === "form_violation" &&
        row.outcome === "correct" &&
        !KNOWN_LENIENT_FAMILIES.some((entry) => entry.family === row.family),
    );
    expect(
      accepted
        .slice(0, 20)
        .map(
          (row) =>
            `${row.item.item_version_id} [${row.family}] accepted ${JSON.stringify(row.payload)} — ${row.witness}`,
        ),
    ).toEqual([]);
    const submitted = census.submissions.filter(
      (row) => row.answerClass === "form_violation",
    );
    expect(submitted.length).toBeGreaterThanOrEqual(400);
  });

  it("pins the one accepted form violation by name, failing if it is fixed or vanishes", () => {
    for (const entry of KNOWN_LENIENT_FAMILIES) {
      const rows = census.submissions.filter(
        (row) => row.family === entry.family && row.surface === "lesson_practice",
      );
      // The family is still constructed at all — an entry excusing nothing fails here.
      expect(rows.length, `${entry.family} produced no mutations`).toBeGreaterThanOrEqual(
        50,
      );
      const acceptedRows = rows.filter((row) => row.outcome === "correct");
      // Direction one: it is still accepted. When someone tightens `combined_polynomial`, this
      // fails and the entry must be deleted rather than left here excusing a closed hole.
      expect(
        acceptedRows.length / rows.length,
        `${entry.family} is no longer leniently accepted — delete this entry`,
      ).toBeGreaterThan(0.5);
      // Direction two: it is a genuine FORM violation, i.e. the same value as the key. If the
      // generator ever starts emitting a value-wrong payload here, "accepted" would be a real
      // false positive wearing this exemption, so the class is asserted too.
      for (const row of rows.slice(0, 5)) {
        expect(row.answerClass).toBe("form_violation");
      }
      expect(census.rulesInPool.has(entry.rule)).toBe(true);
    }
  });
});

describe("mutations that could not be shown wrong are discarded, not excused", () => {
  it("records a reason for every discard", () => {
    for (const entry of census.discarded.slice(0, 200)) {
      expect(entry.reason.length, `${entry.item} [${entry.family}]`).toBeGreaterThan(10);
    }
    // A discard rate that ran away would mean the generator had stopped constructing rather
    // than that the pool had got harder, so the ceiling is asserted beside the reasons.
    const submitted = census.submissions.filter(
      (row) => row.surface === "lesson_practice",
    ).length;
    expect(census.discarded.length).toBeLessThan(submitted);
  });
});
