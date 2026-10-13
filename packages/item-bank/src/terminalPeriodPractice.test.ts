/**
 * A SENTENCE-FINAL period is punctuation, and the practice surface reads it as mathematics.
 *
 * What happened to `16.` before this guard depended entirely on the SHAPE of the key rather than
 * on any decision anybody made. mathjs reads `16.` as 16, so a bare-number key took it; the
 * roster unwrapper looks for a closing brace at the END of the string, so `{-9, 7}.` was
 * `invalid_input/parse_error`; and the exact-representation gate reads a period as a decimal, so
 * `pi/2.` and `4*sqrt(2).` were `incorrect/wrong_representation` over answers that were right.
 * Measured over this pool at `3fbe5fcb`: accepted on 751 of 797 bare-number items, refused on 35
 * of 35 `solution_set` items and 35 of 35 exact-trig ones. The CFU card refused the same
 * punctuation on all 40 of its bare-number asks while accepting it on LIN.5's roster — so the two
 * surfaces disagreed with each other AND each disagreed with itself, which is what makes this one
 * inconsistency rather than 40 separate calls.
 *
 * The rule chosen is ACCEPT, on both surfaces: a trailing period is dropped before grading. It is
 * the direction that withdraws nothing (refusing everywhere would take acceptance away from 751
 * items a learner has today) and the direction that stops a false note being shown over a right
 * answer. `foldTerminalPeriod` is the one implementation, and the CFU half of the same rule is
 * asserted in `apps/web/src/lessons/cfuGradingGates.test.ts`.
 *
 * ## The population, and the half that keeps the fold honest
 *
 * Derived from `PRACTICE_AUTHORITY_ITEMS` — every item a learner can be served whose canonical
 * answer is a string, which is every item a period can be typed into — floored so a registry that
 * stopped loading fails here instead of sweeping nothing, and composed by `answer_type` beside the
 * floor, because the three refusing shapes above are three different comparators and a population
 * that drifted onto bare numbers would clear the floor while measuring the one case that already
 * worked.
 *
 * The second test is not a second probe, it is the fold's safety argument made falsifiable.
 * `representation: "decimal"` is the one profile where a terminal period is LOAD-BEARING —
 * `isPlainDecimal` reads `16.` as a decimal and `16` as an integer — so folding at the dispatch
 * would turn a correct answer into `wrong_representation` there. `checkProductDefinition` grades
 * the raw string first and retries the folded one only after a refusal, which makes that
 * impossible by construction; the test asserts the profile is actually served, so the claim is
 * about something.
 */

import { PRODUCT_CHECKER_VERSION } from "@cr/components";
import { describe, expect, it } from "vitest";

import {
  checkerVersionForPracticeItem,
  PRACTICE_AUTHORITY_ITEMS,
  practiceAuthorityChecker,
} from "./practice-authority";
import { canonicalRawAnswer } from "./raw-answer";
import type { FrozenItem } from "./template";

function stringKey(item: FrozenItem): string | null {
  const key = canonicalRawAnswer(item.answer);
  return typeof key === "string" ? key : null;
}

/**
 * Every product-version item with a string answer.
 *
 * The v1 carve-out is a carve-out with a REASON and it is asserted in both directions below: the
 * locked v1 checker recomputes historical responses, so widening it would rescore answers already
 * scored (Answer_Equivalence_Spec §13.13), and this lane changes the v2 dispatch only.
 * `V1_STRING_ITEMS` pins what that leaves behind, so the carve-out can neither become permanent
 * by neglect nor quietly become empty.
 */
const PRODUCT_STRING_ITEMS: readonly FrozenItem[] = PRACTICE_AUTHORITY_ITEMS.filter(
  (item) =>
    checkerVersionForPracticeItem(item) === PRODUCT_CHECKER_VERSION &&
    stringKey(item) !== null,
);

const V1_STRING_ITEMS: readonly FrozenItem[] = PRACTICE_AUTHORITY_ITEMS.filter(
  (item) =>
    checkerVersionForPracticeItem(item) !== PRODUCT_CHECKER_VERSION &&
    stringKey(item) !== null,
);

/**
 * Floors, read off the printed counts once the sweep was green rather than copied from a report.
 * They are floors and not fingerprints: a domain landing raises them with no edit here.
 */
const PRODUCT_ITEM_FLOOR = 1_200;
const V1_ITEM_FLOOR = 100;
const ANSWER_TYPE_FLOOR = 5;

function grade(item: FrozenItem, rawAnswer: string) {
  return practiceAuthorityChecker({
    raw_answer: rawAnswer,
    item_version_id: item.item_version_id,
    equivalence_checker_version: PRODUCT_CHECKER_VERSION,
  });
}

describe("practice reads a terminal period as punctuation, not as mathematics", () => {
  it("sweeps a derived population composed of every comparator a period can reach", () => {
    expect(
      PRODUCT_STRING_ITEMS.length,
      `only ${PRODUCT_STRING_ITEMS.length} product items carry a string answer, under the floor of ${PRODUCT_ITEM_FLOOR}: the pool registry stopped loading`,
    ).toBeGreaterThanOrEqual(PRODUCT_ITEM_FLOOR);
    expect(
      V1_STRING_ITEMS.length,
      `the v1 carve-out holds ${V1_STRING_ITEMS.length} items, under the floor of ${V1_ITEM_FLOOR}: if it is empty it excuses nothing and should be removed`,
    ).toBeGreaterThanOrEqual(V1_ITEM_FLOOR);

    // The composition a floor cannot state. Each answer type routes to its OWN comparator, and
    // the three that refused a period refused it for three unrelated reasons — a brace the
    // unwrapper could not find, a representation gate reading the period as a decimal, and a
    // parse. A population that drifted onto bare numbers would clear the floor above while
    // measuring the one shape that already worked.
    const byType = new Map<string, number>();
    for (const item of PRODUCT_STRING_ITEMS) {
      const type = item.answer.answer_spec.answer_type;
      byType.set(type, (byType.get(type) ?? 0) + 1);
    }
    expect(
      byType.size,
      `the population covers only ${byType.size} answer types (${[...byType.keys()].sort().join(", ")}), under the floor of ${ANSWER_TYPE_FLOOR}`,
    ).toBeGreaterThanOrEqual(ANSWER_TYPE_FLOOR);
    for (const type of ["numeric", "expression", "solution_set", "interval"]) {
      expect(
        byType.get(type) ?? 0,
        `no ${type} item is in the population, so that comparator's reading of a period is unmeasured`,
      ).toBeGreaterThan(0);
    }
  });

  it("accepts it on every product-version item with a string answer", () => {
    /*
     * The period variant is graded for every item and the PLAIN one only where that refused. The
     * conditional is the one every claim of this shape rests on — an item whose own key the
     * grader refuses is a different defect and must not redden this — but paying for it on all
     * 1,800 items doubles a sweep whose canonical baseline `product-golden.test.ts` already
     * holds, so it is spent where it can actually change the verdict.
     */
    const refused: string[] = [];
    let judged = 0;
    for (const item of PRODUCT_STRING_ITEMS) {
      const key = stringKey(item) as string;
      judged += 1;
      const withPeriod = grade(item, `${key}.`);
      if (withPeriod.status === "correct") {
        continue;
      }
      if (grade(item, key).status !== "correct") {
        continue;
      }
      refused.push(
        `${item.item_version_id} (key "${key}") grades "${key}" correct and refuses "${key}." as ${withPeriod.status}/${withPeriod.reason_code}`,
      );
    }
    expect(judged, "nothing was graded, so this proves nothing").toBeGreaterThanOrEqual(
      PRODUCT_ITEM_FLOOR,
    );
    expect(refused.slice(0, 12)).toEqual([]);
  }, 180_000);

  it("and still grades a trailing point correct where the point IS the representation", () => {
    const decimalItems = PRODUCT_STRING_ITEMS.filter(
      (item) => item.answer.answer_spec.representation === "decimal",
    );
    expect(
      decimalItems.length,
      "no product item declares representation: decimal, so the one profile where a period is load-bearing is unmeasured",
    ).toBeGreaterThan(0);
    const broken: string[] = [];
    for (const item of decimalItems) {
      const key = stringKey(item) as string;
      const verdict = grade(item, key);
      if (verdict.status !== "correct") {
        broken.push(
          `${item.item_version_id} (key "${key}") is no longer correct: ${verdict.status}/${verdict.reason_code}`,
        );
      }
      // The same key with the period the profile is about, which a fold at the dispatch would
      // have turned into `wrong_representation` and the retry cannot.
      const pointed = grade(item, `${key}.`);
      if (pointed.status !== "correct" && /\.\d/.test(key)) {
        broken.push(
          `${item.item_version_id} (key "${key}") refuses "${key}." as ${pointed.status}/${pointed.reason_code}`,
        );
      }
    }
    expect(broken).toEqual([]);
  });
});
