import { D8_PRACTICE_ITEMS, D8_PRACTICE_VARIANTS } from "@cr/item-bank";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkedSolution } from "../WorkedSolution";

/**
 * The EL.5 condense reveal must hand back a spelling the grader can read.
 *
 * The item's key is `log(m*a*q)`. The typeset answer juxtaposes the symbols, $\log(maq)$,
 * which is conventionally correct and is what the figure draws; the checker reads adjacent
 * LETTERS as one symbol, so `log(maq)` grades `invalid_input / unknown_symbol` and is scored
 * UNANSWERED under Answer_Equivalence_Spec §12. A learner who typed back what the reveal had
 * just shown them therefore lost the attempt and was told only that the format was unreadable.
 *
 * This is asserted HERE, against the rendered DOM, rather than only against the template's
 * `worked_solution` array, because for this template the array is not what a learner sees:
 * `WorkedSolution` renders the registered SVG figure and its caption INSTEAD of the steps
 * whenever a visual is registered, and one is. The item bank's own guard
 * (`d8el5.test.ts`) covers the step array for the surfaces that do fall back to it; a guard
 * that stopped there would be asserting over a string nobody renders.
 *
 * Rendering rather than reading the source is also what catches the way this fix goes wrong.
 * A caption is MARKDOWN, so a bare `log(m*a*q)` has its middle symbol read as emphasis and
 * reaches the learner as `log(maq)`: the source looks fixed, and the defect is unchanged.
 * Measured, not assumed — that is exactly what the first attempt at this caption rendered.
 */

/** Every condense instance the pool and its retry variants actually serve. */
const CONDENSE_ITEMS = [
  ...new Map(
    [...D8_PRACTICE_ITEMS, ...D8_PRACTICE_VARIANTS]
      .filter((item) => item.template_id === "d8.el5.condense-sum.l2")
      .map((item) => [item.item_version_id, item] as const),
  ).values(),
];

function captionTextOf(params: Record<string, number>): string {
  const { container } = render(
    <WorkedSolution templateId="d8.el5.condense-sum.l2" params={params} steps={[]} />,
  );
  // The claim is about the FIGURE's caption, so assert the figure is what rendered.
  expect(container.querySelector("figure.lesson-visual")).not.toBeNull();
  expect(container.querySelector(".worked-solution__steps")).toBeNull();
  return container.querySelector("figcaption")?.textContent ?? "";
}

describe("the EL.5 condense reveal shows a typeable spelling", () => {
  it("renders the key's own spelling in the caption of every served instance", () => {
    // A containment claim needs a count under it: with no items this loop asserts nothing.
    expect(CONDENSE_ITEMS.length, "condense instances are served").toBeGreaterThanOrEqual(
      7,
    );
    for (const item of CONDENSE_ITEMS) {
      expect(captionTextOf(item.template_params), item.item_version_id).toContain(
        item.answer.answer_key,
      );
    }
  });

  it("keeps the stars literal on both the two-term and the three-term draw", () => {
    // Driven by hand rather than by whichever draws the freezer happened to keep, because the
    // two branches build their argument differently and a served set need not carry both.
    expect(captionTextOf({ kind: 0, i: 0, j: 1, k: 2 })).toContain("log(x*y)");
    expect(captionTextOf({ kind: 1, i: 0, j: 1, k: 2 })).toContain("log(x*y*a)");
  });
});
