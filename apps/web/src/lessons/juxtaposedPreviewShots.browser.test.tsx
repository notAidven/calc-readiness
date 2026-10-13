/**
 * THE PREVIEW'S READING OF A JUXTAPOSED PRODUCT, ON A PAINTED FRAME.
 *
 * `implicitProductAgreement.test.ts` asserts the LaTeX the preview emits, which is a claim
 * about a string. What a learner meets is a drawing, and the specific thing that changed is
 * how a drawing reads: `(11x + 8)/(x(x + 2))` used to be typeset as `\operatorname{x}(x + 2)`
 * in the denominator — a function named x applied to an argument, spoken aloud as "x of x plus
 * 2" — and now typesets as a product. Both are valid LaTeX and both draw without error, so no
 * assertion about *whether* it renders can tell them apart. Somebody has to look.
 *
 * So this file types the answer into the real D5 field, at the real viewports, and shoots the
 * column. The assertions beside the shots are the mechanical half (the KaTeX box exists, the
 * spoken line beside it says "times"); the shots are for the half that has to be read.
 *
 * Viewports per `.cursor/rules/qa-verification.mdc`: 1024x580 because a taller developer
 * window is the frame that cannot fail, and 390px because that is the phone, where the answer
 * row has the least room and the `*` the learner no longer needs is behind a symbol layer.
 */

import { D5_PRACTICE_ITEMS, type FrozenItem } from "@cr/item-bank";
import { cleanup, render, screen } from "@testing-library/react";
import { type ReactElement, useState } from "react";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { answerNotation, practicePlaceholder } from "./answerFormat";
import { PracticeAnswer, type PracticeAnswerValue } from "./PracticeAnswer";
import { checkerVersionForItem, practiceChecker } from "./practiceChecker";
import { FIGURE_CONTENT_CAP } from "./readingWidths";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

afterEach(cleanup);

/** The load-bearing D5 item, found by its own notation tag rather than by id. */
const ITEM = D5_PRACTICE_ITEMS.find(
  (item) =>
    answerNotation(
      item.answer.answer_spec,
      item.answer.allowed_symbols,
      item.answer.answer_key,
    ) === "rational_quotient_product",
) as FrozenItem;

/** The answer as a learner writes it: the item's own key with the stars simply left out. */
const STARLESS = String(ITEM?.answer.answer_key ?? "").replaceAll("*", "");

function AnswerCard({ frozen }: { frozen: FrozenItem }): ReactElement {
  const [value, setValue] = useState<PracticeAnswerValue>(null);
  return (
    <div
      style={{
        width: `min(${FIGURE_CONTENT_CAP}px, 100%)`,
        background: "#fff",
        padding: 12,
      }}
    >
      <section className="lesson-practice">
        <form className="lesson-player__row" onSubmit={(event) => event.preventDefault()}>
          <PracticeAnswer
            frozen={frozen}
            value={value}
            onChange={setValue}
            disabled={false}
            placeholder={practicePlaceholder(
              frozen.answer.answer_spec,
              frozen.answer.allowed_symbols,
              frozen.answer.answer_key,
            )}
          />
          <button type="submit">Check</button>
        </form>
      </section>
    </div>
  );
}

test.each([
  [1024, 580, "1024x580"],
  [390, 720, "390px"],
] as const)(
  "the starless answer previews as a product on the real D5 row at %sx%s",
  async (width, height, tag) => {
    expect(ITEM, "no D5 item is tagged rational_quotient_product").toBeTruthy();
    expect(STARLESS, "the key carries no star, so nothing is being demonstrated").not.toBe(
      String(ITEM.answer.answer_key),
    );

    await page.viewport(width, height);
    render(<AnswerCard frozen={ITEM} />);

    // Type the answer the way a learner writes it, into the field they actually type into.
    const field = (
      screen.getAllByRole("textbox") as HTMLInputElement[]
    )[0] as HTMLInputElement;
    await page.elementLocator(field).fill(STARLESS);

    // The grader accepts it — which is the whole point of the frame below being worth taking.
    expect(
      practiceChecker({
        raw_answer: {
          expression: field.value,
          excluded_values: (ITEM.answer.excluded_values ?? []).join(", "),
        },
        item_version_id: ITEM.item_version_id,
        equivalence_checker_version: checkerVersionForItem(ITEM),
      }).status,
      `${field.value} is not accepted, so this frame is of a wrong answer`,
    ).toBe("correct");

    // The preview drew something, and it drew it with real KaTeX rather than as raw text.
    const preview = document.querySelector(".cr-math-preview") as HTMLElement;
    expect(preview, "there is no preview on this row").not.toBeNull();
    expect(preview.dataset.empty, `the preview refuses to draw ${field.value}`).toBe(
      "false",
    );
    const typeset = preview.querySelector(".katex") as HTMLElement;
    expect(typeset, "the preview drew no KaTeX").not.toBeNull();
    const box = typeset.getBoundingClientRect();
    expect(box.width, "the drawn preview has no width").toBeGreaterThan(40);
    expect(box.height, "the drawn preview has no height").toBeGreaterThan(20);
    expect(box.right, "the drawn preview runs off the right edge").toBeLessThanOrEqual(
      width,
    );

    // THE READING, in the words the live region speaks: a product, not an application.
    const spoken = preview.querySelector(".cr-math-preview__spoken") as HTMLElement;
    expect(spoken.textContent, "the spoken reading is a function application").not.toMatch(
      /\bx of\b/,
    );
    expect(spoken.textContent, "the spoken reading names no multiplication").toContain(
      "times",
    );

    if (CAPTURE_EVIDENCE) {
      await page.screenshot({
        element: document.querySelector(".lesson-practice") as HTMLElement,
        path: `__screenshots__/juxtaposed-preview-${tag}.png`,
      });
    }
    if (CAPTURE_EVIDENCE) {
      await page.screenshot({
        path: `__screenshots__/juxtaposed-preview-${tag}-viewport.png`,
      });
    }
  },
);
