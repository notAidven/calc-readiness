/**
 * WHICH SERVED ITEMS NEED NOTATION NAMED, AND WHY THE STRIP THAT NAMED IT COULD COME OUT.
 *
 * The INSERT NOTATION strip is gone (`MathKeypad`, removed — see `MathAnswerColumn.tsx`). This
 * file is the measurement that made removing it safe, and it is written so that the measurement
 * keeps being taken rather than being quoted from a merge note.
 *
 * ## The two things a strip could have been the only source of
 *
 * **Expressiveness.** It never was. Every key it offered spliced plain ASCII a keyboard already
 * has (`/`, `^`, `*`, `sqrt()`, `abs()`, `pi`) and converted nothing, so the string reaching the
 * grader after a tap was byte-for-byte the string a typist produces. `#562`, which argued to keep
 * the strip, conceded this in as many words.
 *
 * **Discoverability.** That is the real question, and it is measured here per item: is there a
 * served item whose own grader cannot read its answer without some notation, where nothing else
 * on screen names that notation? `STAR_IS_LOAD_BEARING` derives the cohort by re-grading each
 * starless answer key through the same versioned checker the surface grades with — per
 * `docs/Answer_Equivalence_Spec.md` §12 an `invalid_input` scores as UNANSWERED, so a learner
 * writing the answer without the star loses the attempt rather than being marked wrong.
 *
 * ## What moved, and when
 *
 * `#562` measured the population at **21** items in two halves: **14** on `d5.rat3.factorlcd.l3`
 * and `d5.rat3.unlike.l2`, whose line (`RATIONAL_EXPRESSION_PLACEHOLDER`) named no star, so the
 * times key was the only thing on screen that did; and **7** on `d8.el5.condense-sum.l2`, whose
 * line (`IMPLICIT_PRODUCT_PLACEHOLDER`, "Use * between letters: log(a*b)") named it outright.
 *
 * The 14 left when `#573` merged: `x(x + 2)` grades identically to `x*(x + 2)` now, so their keys
 * are answerable in the notation a learner naturally writes. The 7 remain and always will, for a
 * reason that fix deliberately refuses to cover: `log(maq)` is not a product of three symbols, it
 * is one symbol named `maq`, and reading it otherwise would be the checker inventing a reading
 * (`packages/shared-components/src/implicitProduct.test.ts`, "two symbols run together").
 *
 * So the surviving cohort is exactly the one whose own line names what it needs, which is what
 * left the strip naming nothing that was not already named — and `NAMED_ONLY_BY_THE_ROW` being
 * EMPTY is the fact the removal rests on. Measured here rather than described, over 2121 served
 * items:
 *
 * ```
 * STAR_IS_LOAD_BEARING  = 7   (d8.el5.condense-sum.l2)
 * NAMED_BY_THE_LINE     = 7
 * NAMED_ONLY_BY_THE_ROW = 0   (was 14, over the two d5.rat3 templates)
 * ```
 *
 * ## Why this is a browser test and not a dispatch one
 *
 * `answerKeypad.test.ts` reads the DISPATCH, and a dispatch says nothing about a painted frame:
 * it stayed green through the strip's entire removal, because `answerKeypad()` goes on returning
 * a row and the row now decides only whether the column exists. The claim this file makes is
 * that the learner can SEE the notation named, and that it is still named after they have started
 * typing — which is where a placeholder stops being an answer. So it is made against a real mount
 * at a real viewport.
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
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type ReactElement, useState } from "react";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { answerKeypad, answerNotation, practicePlaceholder } from "./answerFormat";
import { PracticeAnswer, type PracticeAnswerValue } from "./PracticeAnswer";
import { checkerVersionForItem, practiceChecker } from "./practiceChecker";
import { FIGURE_CONTENT_CAP } from "./readingWidths";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

afterEach(cleanup);

/** The same population `answerKeypad.test.ts` sweeps: every item a practice surface serves. */
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

const answerKeyOf = (item: FrozenItem): string =>
  (item.answer as { answer_key?: string }).answer_key ?? "";

const placeholderFor = (item: FrozenItem): string =>
  practicePlaceholder(
    item.answer.answer_spec,
    item.answer.allowed_symbols,
    item.answer.answer_key,
  );

const keypadFor = (item: FrozenItem) =>
  answerKeypad(
    item.answer.answer_spec,
    item.answer.allowed_symbols,
    item.answer.answer_key,
  );

/** A `rational_answer` submits an object; a bare string grades as a missing exclusion. */
function rawAnswerFor(item: FrozenItem, expression: string): string {
  if (item.answer.answer_spec.answer_type !== "rational_answer") {
    return expression;
  }
  const excluded = (item.answer as { excluded_values?: readonly string[] }).excluded_values;
  return {
    expression,
    excluded_values: (excluded ?? []).join(", "),
  } as unknown as string;
}

function verdict(item: FrozenItem, rawAnswer: string): string {
  const result = practiceChecker({
    raw_answer: rawAnswerFor(item, rawAnswer),
    item_version_id: item.item_version_id,
    equivalence_checker_version: checkerVersionForItem(item),
  });
  return `${result.status}/${result.reason_code}`;
}

/**
 * Every served item whose own answer key carries a star its grader cannot read without,
 * MEASURED through the same versioned checker the surface grades with rather than listed.
 *
 * Deriving it from the tree is what keeps the cohort honest in both directions: a template
 * whose grader learns to read juxtaposition leaves this population on the day it does — which
 * is what the 14 D5 items just did — and a new template whose grader cannot arrives in it
 * without anybody remembering to add a line.
 */
const STAR_IS_LOAD_BEARING: readonly FrozenItem[] = SERVED_ITEMS.filter((item) => {
  const key = answerKeyOf(item);
  if (!key.includes("*")) {
    return false;
  }
  return verdict(item, key.replace(/\s*\*\s*/g, "")).startsWith("invalid_input");
});

/** Of those, the ones whose own placeholder already names the star. */
const NAMED_BY_THE_LINE = STAR_IS_LOAD_BEARING.filter((item) =>
  placeholderFor(item).includes("*"),
);

/** And the ones where the key row is the only thing on screen that does. */
const NAMED_ONLY_BY_THE_ROW = STAR_IS_LOAD_BEARING.filter(
  (item) => !placeholderFor(item).includes("*"),
);

/** The cohort the checker fix was written for, identified by its own notation tag. */
const RATIONAL_QUOTIENT_PRODUCT = SERVED_ITEMS.filter(
  (item) =>
    answerNotation(
      item.answer.answer_spec,
      item.answer.allowed_symbols,
      item.answer.answer_key,
    ) === "rational_quotient_product",
);

const templatesOf = (items: readonly FrozenItem[]): string[] =>
  [...new Set(items.map((item) => item.template_id))].sort();

const MEASURE_BOX = `min(${FIGURE_CONTENT_CAP}px, 100%)`;

function AnswerCard({ frozen }: { frozen: FrozenItem }): ReactElement {
  const [value, setValue] = useState<PracticeAnswerValue>(null);
  return (
    <div style={{ width: MEASURE_BOX, background: "#fff", padding: 12 }}>
      <section className="lesson-practice">
        <form className="lesson-player__row" onSubmit={(event) => event.preventDefault()}>
          <PracticeAnswer
            frozen={frozen}
            value={value}
            onChange={setValue}
            disabled={false}
            placeholder={placeholderFor(frozen)}
          />
          <button type="submit">Check</button>
        </form>
      </section>
    </div>
  );
}

/**
 * THE HALF THAT MADE THE STRIP LOAD-BEARING IS EMPTY, and the emptiness is asserted with
 * floors under everything that could make it empty for the wrong reason.
 *
 * An emptiness assertion is the easiest kind to satisfy by accident: `SERVED_ITEMS` going
 * empty, `answerNotation` returning a different tag, or the checker grading every input
 * `correct` would each satisfy it while measuring nothing. So the same test carries the three
 * positive facts the emptiness is supposed to follow from — the served population is real, the
 * cohort the fix targeted is real and is 14 items over two named templates, and every one of
 * them now grades the starless spelling of its own key CORRECT.
 */
test("no served item is left with a star only the key row names", () => {
  expect(SERVED_ITEMS.length, "the served population is empty").toBeGreaterThan(1000);
  expect(
    RATIONAL_QUOTIENT_PRODUCT.length,
    "the rational_quotient_product cohort is empty, so the fix below is about nothing",
  ).toBe(14);
  expect(templatesOf(RATIONAL_QUOTIENT_PRODUCT)).toEqual([
    "d5.rat3.factorlcd.l3",
    "d5.rat3.unlike.l2",
  ]);

  // THE FIX, on every member: the answer as keyed grades, and so does the same answer with
  // the star simply left out — which is the spelling every textbook prints.
  for (const item of RATIONAL_QUOTIENT_PRODUCT) {
    const key = answerKeyOf(item);
    expect(verdict(item, key), `${item.item_version_id} cannot grade its own key`).toBe(
      "correct/match",
    );
    expect(
      verdict(item, key.replace(/\s*\*\s*/g, "")),
      `${item.item_version_id}: ${JSON.stringify(key.replace(/\s*\*\s*/g, ""))} is still unreadable, so the juxtaposition fix has regressed`,
    ).toBe("correct/match");
  }

  // Hence: nothing is left whose star is named by the key row alone.
  expect(
    NAMED_ONLY_BY_THE_ROW.map((item) => item.item_version_id),
    "a served item still keys a star its grader needs and its own line does not mention, so the notation strip is load-bearing again and must not be removed",
  ).toEqual([]);
});

/**
 * THE OTHER DIRECTION, which is what stops the emptiness above being read as "no item needs
 * notation named".
 *
 * A load-bearing star still exists — it is just named by its own line now — so the cohort is
 * named and floored, and every member is required to have its line name the star. The day one
 * of them stops, `NAMED_ONLY_BY_THE_ROW` grows and the assertion above fails, which is the
 * defect the removed strip used to hide.
 */
test("a load-bearing star still exists, and every remaining one is named by its own line", () => {
  expect(
    STAR_IS_LOAD_BEARING.length,
    "no served answer key carries a star its grader needs, so the notation strip is no longer propping anything up and should be removed",
  ).toBeGreaterThanOrEqual(7);
  expect(templatesOf(STAR_IS_LOAD_BEARING)).toEqual(["d8.el5.condense-sum.l2"]);
  expect(NAMED_BY_THE_LINE.length).toBe(STAR_IS_LOAD_BEARING.length);

  for (const item of STAR_IS_LOAD_BEARING) {
    const key = answerKeyOf(item);
    const starless = key.replace(/\s*\*\s*/g, "");
    // The control: the answer as keyed is readable, so the verdict below is about the star.
    expect(verdict(item, key), `${item.item_version_id} cannot grade its own key`).toBe(
      "correct/match",
    );
    // WHY the juxtaposition fix does not reach these: `log(maq)` is one symbol, not three.
    expect(
      verdict(item, starless),
      `${item.item_version_id}: ${JSON.stringify(starless)} is readable after all, so the star is a spelling here and this item does not belong in the population`,
    ).toBe("invalid_input/unknown_symbol");
    // And the line does name it, which is the fact that stops the strip being the sole namer.
    expect(placeholderFor(item)).toContain("*");
  }
});

/**
 * The dispatch half, stated over the whole cohort: whatever else changes, an item whose grader
 * needs a star is one the notation dispatch recognizes as needing notation — which is what earns
 * it an answer column, and therefore a notation line, at all.
 *
 * `answerKeypad` is read for its LENGTH now rather than for its contents. It is still the same
 * dispatch and still returns the same rows; what changed is that a non-empty row draws a line
 * instead of a strip of buttons.
 */
test("every item with a load-bearing star is given an answer column", () => {
  expect(STAR_IS_LOAD_BEARING.length).toBeGreaterThanOrEqual(7);
  for (const item of STAR_IS_LOAD_BEARING) {
    expect(
      keypadFor(item).map((key) => key.insert),
      `${item.item_version_id} keys ${JSON.stringify(answerKeyOf(item))} and the dispatch gives it no notation row, so it gets no line either`,
    ).toContain("*");
  }
});

/**
 * THE CLAIM THIS FILE EXISTS FOR, made against a painted frame rather than against the tree.
 *
 * 1024x580 per `.cursor/rules/qa-verification.mdc`: "the notation is named on screen" is spatial,
 * and a comfortable developer viewport is the frame that cannot fail. 390px is the phone, where
 * the argument for the removed strip was strongest, because `*` is behind a symbol layer of the
 * software keyboard there — so it is the width where a line replacing a tap target has to be
 * shown still readable.
 *
 * The FIELD IS TYPED INTO before the frame is taken, and that is the whole difference from the
 * frame `#562` took of the same item. A placeholder is gone the moment the learner follows it, so
 * a photograph of an empty field is a photograph of guidance nobody has yet had to keep. What is
 * claimed here is that a learner who has typed half of `log(m*a*q)` can still read the rule that
 * tells them the star belongs in it.
 */
test.each([
  [1024, 580, "1024x580"],
  [390, 720, "390px"],
] as const)(
  "the star is still named on the real EL.5 surface, mid-answer, at %sx%s",
  async (width, height, tag) => {
    const item = STAR_IS_LOAD_BEARING[0] as FrozenItem;
    expect(item, "the cohort this test is about is empty").toBeTruthy();

    await page.viewport(width, height);
    render(<AnswerCard frozen={item} />);

    const expressionField = (
      screen.getAllByRole("textbox") as HTMLInputElement[]
    )[0] as HTMLInputElement;
    expect(expressionField.closest(".cr-math-answer")).not.toBeNull();

    // THE STRIP IS NOT BACK. Asserted here as well as in the dispatch tests above, because this
    // is the only place in the file with a painted frame to assert it on.
    expect(screen.queryByRole("group", { name: "Insert notation" })).toBeNull();
    expect(document.querySelectorAll(".cr-math-answer button")).toHaveLength(0);

    // The line inside the field names the star before the first character.
    expect(
      expressionField.placeholder,
      "the placeholder no longer names the star, so this cohort has become the row-only kind and the emptiness assertion above is measuring the wrong thing",
    ).toContain("*");

    // …and after it. Half the answer is typed, which is the state the placeholder cannot cover.
    fireEvent.change(expressionField, { target: { value: "log(m" } });
    const line = document.querySelector<HTMLElement>(".cr-math-notation");
    expect(line, "the EL.5 field has no notation line").not.toBeNull();
    const named = line as HTMLElement;
    expect(named.textContent, "the line stops naming the star mid-answer").toContain("*");

    // PAINTED, not merely present: a line with no box is a line nobody can read.
    const lineBox = named.getBoundingClientRect();
    expect(lineBox.width, "the notation line has no width").toBeGreaterThan(80);
    expect(lineBox.height, "the notation line has no height").toBeGreaterThan(8);
    expect(lineBox.top, "the notation line is above the viewport").toBeGreaterThanOrEqual(
      0,
    );
    expect(lineBox.left, "the notation line is off the left edge").toBeGreaterThanOrEqual(
      0,
    );
    expect(lineBox.right, "the notation line is off the right edge").toBeLessThanOrEqual(
      width,
    );
    expect(lineBox.bottom, "the notation line is below the fold").toBeLessThanOrEqual(
      height,
    );
    // It wraps rather than clipping, which is the failure mode a narrow phone produces.
    expect(named.scrollWidth, "the notation line is clipped").toBeLessThanOrEqual(
      Math.ceil(lineBox.width) + 1,
    );

    // It is the field's own line rather than a caption floating near it.
    expect(lineBox.top).toBeGreaterThanOrEqual(
      expressionField.getBoundingClientRect().bottom - 1.5,
    );

    if (CAPTURE_EVIDENCE) {
      await page.screenshot({
        element: document.querySelector(".lesson-practice") as HTMLElement,
        path: `__screenshots__/load-bearing-star-${tag}.png`,
      });
    }
    if (CAPTURE_EVIDENCE) {
      await page.screenshot({
        path: `__screenshots__/load-bearing-star-${tag}-viewport.png`,
      });
    }
  },
);
