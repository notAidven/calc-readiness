import { describe, expect, it } from "vitest";

import {
  checkerVersionForId,
  practiceChecker,
  practiceItemsById,
} from "../lessons/practiceChecker";
import { wrongButReadable } from "./wrongButReadable";

/**
 * THE HELPER'S ONE CLAIM, MEASURED: what it returns is a miss the grader can READ.
 *
 * The population is every text item a practice or crisis surface can serve, derived from the
 * shipped map rather than listed, with the shapes named so the sweep cannot pass by covering only
 * plain numbers — which is exactly how `${key}00000+1` passed for as long as it did.
 *
 * The second test is the control the first needs: an unreadable string on the SAME population
 * really does come back `invalid_input`, so "readable" above is a property of what this returns
 * rather than of a checker that reads anything.
 */

/**
 * Every item answered by ONE text field. `rational_answer` is out, and out for a reason rather
 * than to make the sweep pass: its answer is the payload `{ expression, excluded_values }`, so a
 * bare string of any kind is `invalid_rational_answer` and no string helper can produce a miss for
 * it. A suite driving a D5 item to a deliberate miss has to fill both fields, which is what
 * `DiagnosticRunner.test.tsx` already does; `wellFormedWrongRawAnswer` is the object-valued
 * sibling for that case.
 */
const TEXT_ITEMS = [...practiceItemsById.values()].filter(
  (item) =>
    typeof item.answer.answer_key === "string" &&
    !item.answer.parts?.length &&
    item.answer.answer_spec.answer_type !== "rational_answer",
);

function statusOf(itemVersionId: string, raw: string): string {
  return practiceChecker({
    raw_answer: raw,
    item_version_id: itemVersionId,
    equivalence_checker_version: checkerVersionForId(itemVersionId),
  }).status;
}

describe("a wrong answer the grader can read", () => {
  it("sweeps a real population, spanning every text answer shape the surfaces serve", () => {
    expect(TEXT_ITEMS.length, "the served text pool is empty").toBeGreaterThan(1000);
    const shapes = new Set(TEXT_ITEMS.map((item) => item.answer.answer_spec.answer_type));
    expect(
      [...shapes].sort(),
      `only ${[...shapes].join(", ")}, so the shapes that broke are not in the sweep`,
    ).toContain("solution_set");
    expect([...shapes]).toContain("point");
    expect([...shapes]).toContain("expression");
    expect(shapes.size).toBeGreaterThanOrEqual(6);
  });

  /*
   * A NAMED BUDGET, because the default one is not a measurement of this sweep on the machine
   * that matters. It drives every one of the 1,000-plus served text items through the real
   * versioned checker, which is 13.4s on a developer laptop and 44.4s on the CI runner — so
   * against vitest's 20s default it passed locally and timed out in CI, and the CI reading is
   * the true one. Nothing about what is asserted changes here: the same population, the same
   * floor and shape census above it, the same demand that every item come back `incorrect`.
   * Only the wall clock moves, to roughly 2.5x the slowest run observed.
   */
  it("grades as a MISS on every one of them, never as unreadable", () => {
    const unreadable: string[] = [];
    for (const item of TEXT_ITEMS) {
      const key = item.answer.answer_key as string;
      const status = statusOf(item.item_version_id, wrongButReadable(key));
      if (status !== "incorrect") {
        unreadable.push(
          `${item.item_version_id} [${item.template_id}] key=${JSON.stringify(key)} wrong=${JSON.stringify(wrongButReadable(key))} -> ${status}`,
        );
      }
    }
    expect(
      unreadable.slice(0, 20),
      `${unreadable.length} items get an answer the grader cannot read, so a suite driving a deliberate miss with it is driving a refusal instead`,
    ).toEqual([]);
  }, 120_000);

  it("and the string it replaced really was unreadable on some of them", () => {
    // The control, and the reason the eleven suites needed changing rather than the fix
    // needing loosening. `${key}00000+1` is what they all used.
    const refused = TEXT_ITEMS.filter(
      (item) =>
        statusOf(item.item_version_id, `${item.answer.answer_key as string}00000+1`) ===
        "invalid_input",
    );
    expect(
      refused.length,
      "the old fabricated miss is readable everywhere, so this helper is solving nothing",
    ).toBeGreaterThan(0);
  });
});
