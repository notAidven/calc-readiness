import {
  canonicalRawAnswer,
  D3_PRACTICE_RETRY_VARIANTS_PER_CELL,
  DEMO_PINNED_TEMPLATE_IDS,
  type FrozenItem,
} from "@cr/item-bank";
import { beforeAll, describe, expect, it } from "vitest";

import {
  type PracticeSurface,
  SERVED_PRACTICE_ITEMS,
  type SubmitPathResult,
  submitThroughPracticeSurface,
} from "./submitPathHarness";

/**
 * EVERY SERVED PRACTICE ITEM ACCEPTS ITS OWN ANSWER, through the whole path the Check button
 * runs, on both surfaces that run it.
 *
 * ## Why this guard and not the sweep that already exists
 *
 * `validateTemplates` and `validatePracticePool` already grade every declared key and assert
 * it is accepted. They enter at `practiceChecker`. The learner does not: two pre-submit guards
 * run first, and a submission either of them refuses NEVER REACHES THE GRADER — no attempt is
 * recorded, the answer is neither correct nor incorrect, and the item is re-served. A
 * checker-only sweep is structurally blind to that, which is how RAD.1 shipped a pool of 83
 * instances whose own gate refused their own answer key while every positive sweep stayed
 * green (`submitGuards.ts`'s own docstring records it).
 *
 * So this is the only guard in the tree that can catch a gate refusing the key it demands, and
 * `blocked_by_guard` is held apart from `incorrect` in {@link SubmitPathResult} precisely so
 * that the difference is a value an assertion can see.
 *
 * ## And it is the only guard that would have caught the P0
 *
 * `InfiniteDrill.tsx` read a submission as `typeof value === "string" ? value : ""` and
 * branched on `isInteractiveAnswerType` where `LessonPractice.tsx` branches on `typeof`.
 * `rational_answer` is not an interactive type, so a rational item's
 * `{ expression, excluded_values }` collapsed to `""` and the empty string was graded: all
 * 140 rational items answered `invalid_input / invalid_rational_answer` on that surface, 4 of
 * 4 RAT nodes, 100% of each node's drill pool, with a message telling the learner to fill in
 * the two boxes they had just filled in. A one-surface sweep cannot see a two-surface defect,
 * which is why the surface is a parameter here and why the agreement case below exists.
 *
 * ## The risk running the other way
 *
 * This round tightened the comparator by a thousand lines. A grader that starts refusing
 * CORRECT answers is a worse defect than the false positives that tightening closed, and this
 * file is the primary evidence against it: 2,265 declared keys, submitted as a learner submits
 * them, every one of which must still be accepted.
 */

interface Graded {
  readonly item: FrozenItem;
  readonly answerType: string;
  readonly canonical: unknown;
  readonly lesson: SubmitPathResult;
  readonly drill: SubmitPathResult;
}

const SURFACES: readonly PracticeSurface[] = ["lesson_practice", "infinite_drill"];

/**
 * TEMPORARY, and self-restoring. A template pinned to one instance for the scripted
 * demonstration contributes its canonical instance and NO variants, so the served population
 * drops by exactly the retry depth per pinned template. Derived from the pin list rather than
 * written down as a smaller number, so all three floors below climb back to 2,265 on their own
 * when the list empties and none can be left slack once the pin is reverted.
 * `demoPinnedTemplates.ts` holds the contract and `d3.test.ts` proves the exemption is still
 * earned. Only the COUNTS move: the pinned template still freezes a real item the checker owns,
 * so every per-item acceptance assertion below still covers it with no exemption at all.
 */
const SERVED_ITEMS_FLOOR =
  2265 - DEMO_PINNED_TEMPLATE_IDS.length * D3_PRACTICE_RETRY_VARIANTS_PER_CELL;

let graded: Graded[] = [];

beforeAll(() => {
  graded = SERVED_PRACTICE_ITEMS.map((item) => {
    const canonical = canonicalRawAnswer(item.answer);
    return {
      item,
      answerType: item.answer.answer_spec.answer_type,
      canonical,
      lesson: submitThroughPracticeSurface(item, canonical, { surface: "lesson_practice" }),
      drill: submitThroughPracticeSurface(item, canonical, { surface: "infinite_drill" }),
    };
  });
}, 600_000);

/**
 * The population is READ FROM THE REGISTRY, never written down, and the composition is
 * asserted beside the count.
 *
 * The composition half is the one that does work. A floor of 2,265 is satisfied by 2,265
 * numeric items, and scoping this sweep to string-keyed items — which is what "the answer is
 * the key" quietly assumes — would have excluded all 217 non-string ones, which is exactly the
 * cohort the P0 lived in. So each shape that needs its own payload gets its own floor.
 */
describe("the population is the served pool, by behaviour and not by implementation", () => {
  it("is every served practice instance, with every answer shape represented", () => {
    expect(SERVED_PRACTICE_ITEMS.length).toBeGreaterThanOrEqual(SERVED_ITEMS_FLOOR);

    const byType = new Map<string, number>();
    for (const item of SERVED_PRACTICE_ITEMS) {
      const type = item.answer.answer_spec.answer_type;
      byType.set(type, (byType.get(type) ?? 0) + 1);
    }
    // Composition, not size: nine distinct answer types, each with the floor measured at the
    // anchor SHA. A pool that collapsed to one shape clears the total and fails here.
    expect(byType.size).toBeGreaterThanOrEqual(9);
    expect(byType.get("rational_answer") ?? 0).toBeGreaterThanOrEqual(140);
    expect(byType.get("expr_builder") ?? 0).toBeGreaterThanOrEqual(42);
    expect(byType.get("number_line") ?? 0).toBeGreaterThanOrEqual(35);
    expect(byType.get("numeric") ?? 0).toBeGreaterThanOrEqual(1000);
    expect(byType.get("expression") ?? 0).toBeGreaterThanOrEqual(300);
    expect(byType.get("solution_set") ?? 0).toBeGreaterThanOrEqual(200);
    expect(byType.get("interval") ?? 0).toBeGreaterThanOrEqual(150);
    expect(byType.get("point") ?? 0).toBeGreaterThanOrEqual(80);
    expect(byType.get("multiple_choice") ?? 0).toBeGreaterThanOrEqual(80);

    // The cohort a string-only sweep would silently drop.
    const nonString = SERVED_PRACTICE_ITEMS.filter(
      (item) => typeof canonicalRawAnswer(item.answer) !== "string",
    );
    expect(nonString.length).toBeGreaterThanOrEqual(217);
  });
});

describe("no served item's own answer is refused by its own item", () => {
  it.each(SURFACES)("is accepted on every item on the %s surface", (surface) => {
    const results = graded.map((row) => ({
      row,
      result: surface === "lesson_practice" ? row.lesson : row.drill,
    }));
    const notCorrect = results.filter(({ result }) => result.outcome !== "correct");
    expect(
      notCorrect
        .slice(0, 12)
        .map(
          ({ row, result }) =>
            `${row.item.item_version_id} (${row.answerType}) -> ${result.outcome}/${
              result.guard ?? result.reason_code
            }`,
        ),
    ).toEqual([]);
    // A floor under the sweep, because "no failures" is free over an empty list.
    expect(results.length).toBeGreaterThanOrEqual(SERVED_ITEMS_FLOOR);
  });

  it.each(SURFACES)("is never blocked before grading on the %s surface", (surface) => {
    // Held apart from the case above on purpose. A refusal that never reaches the grader is
    // the RAD.1 class, and collapsing it into "not correct" is what made that defect invisible
    // for as long as it was: nothing was graded wrong, because nothing was graded.
    const blocked = graded
      .map((row) => ({
        row,
        result: surface === "lesson_practice" ? row.lesson : row.drill,
      }))
      .filter(({ result }) => result.outcome === "blocked_by_guard");
    expect(
      blocked
        .slice(0, 12)
        .map(({ row, result }) => `${row.item.item_version_id} refused by ${result.guard}`),
    ).toEqual([]);
  });
});

describe("the two surfaces agree about every served item", () => {
  it("returns the same outcome for the canonical answer on both", () => {
    // This is the assertion that would have caught the P0 the day it landed, and it is written
    // as an agreement rather than as "the drill accepts everything" because the failure mode is
    // a DIVERGENCE: each surface was internally consistent and only the pair was wrong.
    const disagreeing = graded.filter((row) => row.lesson.outcome !== row.drill.outcome);
    expect(
      disagreeing
        .slice(0, 12)
        .map(
          (row) =>
            `${row.item.item_version_id} (${row.answerType}): lesson ${row.lesson.outcome}, drill ${row.drill.outcome}`,
        ),
    ).toEqual([]);
    expect(graded.length).toBeGreaterThanOrEqual(SERVED_ITEMS_FLOOR);
    // The cohort the divergence lived in has to be IN the sweep for the agreement to mean
    // anything: an agreement over 2,125 string-keyed items would have been green throughout.
    expect(
      graded.filter((row) => row.answerType === "rational_answer").length,
    ).toBeGreaterThanOrEqual(140);
  });

  it("hands the checker the payload the control holds, not a collapsed empty string", () => {
    // The mechanism, asserted directly beside the outcome. The P0 was not that the drill
    // graded a rational item wrong; it was that the object never arrived, so `graded` was `""`.
    const rational = graded.filter((row) => row.answerType === "rational_answer");
    expect(rational.length).toBeGreaterThanOrEqual(140);
    const collapsed = rational.filter((row) => row.drill.graded === "");
    expect(collapsed.map((row) => row.item.item_version_id)).toEqual([]);
  });
});
