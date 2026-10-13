/**
 * The answer column — the notation line and the preview — in real Chromium, with the real
 * stylesheet.
 *
 * Most of these cannot be written anywhere else. The surd guard needs layout, so jsdom cannot
 * see it. The mobile check needs a real viewport. The "the line is under the field" claims are
 * spatial. And `getAllByRole("textbox")` needs a real accessibility tree, which is what the five
 * suites that find the answer field that way depend on and what this file has to leave alone.
 *
 * `../styles.css` is imported LAST, after the component tree has pulled in `katex.min.css`
 * through `svgKit`, because that is the order `main.tsx` produces and the surd test below is a
 * statement about which of two tied rules wins on source order. The first test asserts that
 * ordering, so the guard cannot pass on a broken build.
 *
 * ## This file used to be `mathKeypad.browser.test.tsx`
 *
 * The INSERT NOTATION strip is gone — `MathKeypad`, a `<fieldset>` of 44px buttons on the
 * field's bottom edge — so the tests that drove buttons (typing at the caret, refusing focus on
 * mousedown, tap-equals-type through the grader, the tab order through the key row) are gone
 * with it, and what stands here is what the column still does. Two claims replace them and are
 * stronger for the learner:
 *
 *  - the strip does not come back (no group, no buttons, in a column that is really rendered);
 *  - the notation the strip used to type is still NAMED, and named PERSISTENTLY — the field's own
 *    placeholder repeated under the field from the first keystroke, which is the moment the
 *    placeholder itself stops saying it.
 */

import {
  D2_PRACTICE_ITEMS,
  D5_PRACTICE_ITEMS,
  D7_PRACTICE_ITEMS,
  D10_PRACTICE_ITEMS,
  type FrozenItem,
} from "@cr/item-bank";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactElement, useState } from "react";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import {
  cfuNotation,
  EXPONENT_NOTATION_PLACEHOLDER,
  NUMERIC_LITERAL_PLACEHOLDER,
  normalizeTextSubmission,
  PI_EXPRESSION_PLACEHOLDER,
  POSITIVE_EXPONENT_PLACEHOLDER,
  practicePlaceholder,
  RATIONAL_EXCLUSIONS_PLACEHOLDER,
  RATIONAL_EXPRESSION_PLACEHOLDER,
  RATIONAL_POLYNOMIAL_PLACEHOLDER,
} from "./answerFormat";
import { LessonCfu } from "./cfu";
import { d2LessonByNode } from "./d2";
import { allLessons } from "./domains";
import { PracticeAnswer, type PracticeAnswerValue } from "./PracticeAnswer";
import { checkerVersionForItem, practiceChecker } from "./practiceChecker";
import { FIGURE_CONTENT_CAP } from "./readingWidths";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

// This project sets no vitest globals, so Testing Library's own auto-cleanup never
// registers and a second render would leave two answer fields on the page.
afterEach(cleanup);

/** The name the removed strip carried, kept here so its absence can be asserted by name. */
const RETIRED_STRIP_LABEL = "Insert notation";

/** The EXP.1 instance from the reported screenshot's family: its key IS `1/x^2`. */
const NOTATION_ITEM = D2_PRACTICE_ITEMS.find(
  (item) => (item.answer as { answer_key?: string }).answer_key === "1/x^2",
) as FrozenItem;

/** A D7 classify item: the answer is the word `decreasing`, so it wants no notation. */
const WORD_ITEM = D7_PRACTICE_ITEMS.find(
  (item) => item.answer.answer_spec.answer_type === "multiple_choice",
) as FrozenItem;

/**
 * The box to measure in: `FIGURE_CONTENT_CAP` where there is room for it, the container
 * where there is not. Both halves matter, because the desktop reading is taken at the cap
 * and the phone reading has to be taken at the width the phone actually gives.
 *
 * See `readingWidths.ts` for what 460 is — a cap the stylesheet puts on figure content, and
 * not the width of a lesson card.
 */
const MEASURE_BOX = `min(${FIGURE_CONTENT_CAP}px, 100%)`;

/** The real answer row: a `<form>` whose Check control is `type="submit"`. */
function AnswerCard({
  frozen,
  onSubmit,
}: {
  frozen: FrozenItem;
  onSubmit?: () => void;
}): ReactElement {
  const [value, setValue] = useState<PracticeAnswerValue>("");
  return (
    <div style={{ width: MEASURE_BOX, background: "#fff", padding: 12 }}>
      <section className="lesson-practice">
        <form
          className="lesson-player__row"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit?.();
          }}
        >
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

function field(): HTMLInputElement {
  return screen.getByRole("textbox") as HTMLInputElement;
}

/** Type into the field the way React sees it, with the caret left where a typist's is. */
function typeInto(input: HTMLInputElement, value: string): void {
  fireEvent.change(input, { target: { value } });
  input.setSelectionRange(value.length, value.length);
}

function notationLine(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".cr-math-notation");
}

test("the app stylesheet loads after KaTeX's, as it does in the app", () => {
  const index = (match: (selector: string) => boolean): number =>
    Array.from(document.styleSheets).findIndex((sheet) => {
      try {
        return Array.from(sheet.cssRules).some((rule) => {
          const selector = (rule as CSSStyleRule).selectorText;
          return typeof selector === "string" && match(selector);
        });
      } catch {
        return false;
      }
    });

  const katexSheet = index((s) => s.includes(".hide-tail"));
  const appSheet = index((s) => s.includes(".cr-math-notation"));
  expect(katexSheet, "KaTeX's stylesheet is loaded").toBeGreaterThanOrEqual(0);
  expect(appSheet, "the app stylesheet is loaded").toBeGreaterThanOrEqual(0);
  expect(
    appSheet,
    "the app stylesheet must be injected after KaTeX's, or the surd guard is vacuous",
  ).toBeGreaterThan(katexSheet);
});

/**
 * THE STRIP DOES NOT COME BACK, asserted on a column that is really rendered.
 *
 * Both halves are needed and neither is sufficient. "There is no group called Insert notation"
 * holds trivially on a page with no answer column at all, so the column is measured first; and
 * "the column exists" says nothing about what is inside it. The button count is the one that
 * would catch a differently-labelled keypad.
 */
test("an item that wants notation gets a column with no buttons in it", () => {
  render(<AnswerCard frozen={NOTATION_ITEM} />);

  const column = document.querySelector<HTMLElement>(".cr-math-answer");
  expect(column, "the item that most wants notation has no answer column").not.toBeNull();
  expect(
    (column as HTMLElement).getBoundingClientRect().height,
    "the column is not painted",
  ).toBeGreaterThan(0);

  expect(screen.queryByRole("group", { name: RETIRED_STRIP_LABEL })).toBeNull();
  expect(document.querySelector("fieldset")).toBeNull();
  expect(
    within(column as HTMLElement).queryAllByRole("button"),
    "the notation strip is back inside the answer column",
  ).toEqual([]);
  expect(document.body.textContent).not.toContain(RETIRED_STRIP_LABEL);
});

/**
 * THE NOTATION LINE, and the property it exists for: it says its piece at the moment the
 * placeholder stops saying it.
 *
 * The placeholder is the control — it names the notation before the first keystroke — and the
 * line is what carries the same rule afterwards. Both are read off the field itself, so the two
 * cannot be different sentences.
 */
test("the notation line takes over from the placeholder, and reserves its room", () => {
  render(<AnswerCard frozen={NOTATION_ITEM} />);
  const input = field();
  const line = notationLine() as HTMLElement;
  expect(line, "the answer column has no notation line").not.toBeNull();

  // EMPTY: the placeholder is doing the talking and the line is silent — but it is holding its
  // height, so the first keystroke cannot push the preview or the Check button down the screen.
  expect(input.value).toBe("");
  expect(input.placeholder).toBe(POSITIVE_EXPONENT_PLACEHOLDER);
  expect(line.textContent).toBe("");
  const emptyHeight = line.getBoundingClientRect().height;
  expect(emptyHeight, "the line collapses when it has nothing to say").toBeGreaterThan(8);
  const previewTopEmpty = (
    document.querySelector(".cr-math-preview") as HTMLElement
  ).getBoundingClientRect().top;

  // TYPING: the placeholder is no longer visible to the learner, and the line has the rule.
  typeInto(input, "1");
  expect(line.textContent, "the line does not carry the field's own guidance").toBe(
    POSITIVE_EXPONENT_PLACEHOLDER,
  );
  expect(line.getAttribute("data-showing")).toBe("true");
  expect(line.getBoundingClientRect().height).toBeCloseTo(emptyHeight, 0);
  expect(
    (document.querySelector(".cr-math-preview") as HTMLElement).getBoundingClientRect().top,
    "the preview moved when the line spoke",
  ).toBeCloseTo(previewTopEmpty, 0);

  // It is the FIELD'S line: directly under it, inside its column, and quieter than it.
  const inputBox = input.getBoundingClientRect();
  const lineBox = line.getBoundingClientRect();
  expect(lineBox.top, "the line is not under the field").toBeGreaterThanOrEqual(
    inputBox.bottom - 1,
  );
  expect(lineBox.top - inputBox.bottom, "the line floats off the field").toBeLessThan(8);
  expect(lineBox.left).toBeCloseTo(inputBox.left, 0);
  expect(Number.parseFloat(getComputedStyle(line).fontSize)).toBeLessThan(
    Number.parseFloat(getComputedStyle(input).fontSize),
  );

  // …and it is not announced twice: the input already carries this string as its placeholder.
  expect(line.getAttribute("aria-hidden")).toBe("true");
});

/**
 * THE FIELD GETS ALL FOUR CORNERS BACK, which is the strip's removal being finished.
 *
 * `.cr-math-answer > input` squared the bottom two unconditionally, on the premise that a field
 * inside this wrapper always had a strip continuing them. Measured with the strip gone and the
 * rule left in place, the field drew 8px on top and 0px underneath — two rounded corners and two
 * square ones over empty space, and every other test still passed on it.
 */
test("the field inside the column keeps the same corners as a bare field", () => {
  const wrapped = render(<AnswerCard frozen={NOTATION_ITEM} />);
  const inColumn = getComputedStyle(field());
  const radii = [
    inColumn.borderTopLeftRadius,
    inColumn.borderTopRightRadius,
    inColumn.borderBottomLeftRadius,
    inColumn.borderBottomRightRadius,
  ];
  expect(radii[0], "the field has no radius at all to compare").not.toBe("0px");
  expect(new Set(radii).size, `the field's corners disagree: ${radii.join(" ")}`).toBe(1);
  wrapped.unmount();

  render(<AnswerCard frozen={WORD_ITEM} />);
  const bare = getComputedStyle(field());
  expect(document.querySelector(".cr-math-answer")).toBeNull();
  expect(radii[3]).toBe(bare.borderBottomLeftRadius);
});

/**
 * THE PREVIEW STANDS APART, because it is output and the field and its line are input.
 *
 * Compared against each other rather than against pixel constants, because "equal" was the
 * original defect: with one shared column gap the aid under the field sat as far from the field
 * as from the preview, so a learner's eye grouped an INPUT with the OUTPUT under it.
 */
test("the preview is separated from the field and its line", () => {
  render(<AnswerCard frozen={NOTATION_ITEM} />);
  typeInto(field(), "1/x^2");

  const inputBox = field().getBoundingClientRect();
  const lineBox = (notationLine() as HTMLElement).getBoundingClientRect();
  const previewBox = (
    document.querySelector(".cr-math-preview") as HTMLElement
  ).getBoundingClientRect();

  const seam = lineBox.top - inputBox.bottom;
  const split = previewBox.top - lineBox.bottom;
  expect(split, "the preview is not separated from the input guidance").toBeGreaterThan(
    seam + 4,
  );
});

test("and the row still holds exactly one textbox", () => {
  render(<AnswerCard frozen={NOTATION_ITEM} />);
  // Five suites find the answer field with `getByRole("textbox")`, which throws on two.
  expect(screen.getAllByRole("textbox")).toHaveLength(1);
  expect(document.querySelectorAll("[contenteditable]")).toHaveLength(0);
});

/**
 * `answerPlaceholderFit.browser.test.tsx` measures every placeholder against the field
 * that has to hold it, and it measures a BARE field in a `.lesson-player__row`. Wrapping
 * the field in a column would silently invalidate all of that if the column were even a
 * few pixels narrower — the guard would keep passing while `POSITIVE_EXPONENT_PLACEHOLDER`
 * clipped on the one surface it was written for. So the two widths are pinned equal here.
 */
test("wrapping the field in the answer column does not narrow it", () => {
  const contentWidth = (el: HTMLElement): number => {
    const style = getComputedStyle(el);
    return (
      el.getBoundingClientRect().width -
      Number.parseFloat(style.paddingLeft) -
      Number.parseFloat(style.paddingRight) -
      Number.parseFloat(style.borderLeftWidth) -
      Number.parseFloat(style.borderRightWidth)
    );
  };

  const withColumn = render(<AnswerCard frozen={NOTATION_ITEM} />);
  const wrapped = contentWidth(field());
  expect(document.querySelector(".cr-math-answer"), "no column to measure").not.toBeNull();
  expect(wrapped, "the field measured as nothing").toBeGreaterThan(0);
  withColumn.unmount();

  render(<AnswerCard frozen={WORD_ITEM} />);
  const bare = contentWidth(field());
  expect(document.querySelector(".cr-math-answer"), "the control grew a column").toBeNull();

  expect(wrapped).toBeCloseTo(bare, 1);
});

/**
 * The answer row is a real form, and Enter in a form activates its DEFAULT BUTTON: the first
 * submit-capable control in tree order. The removed keypad had to declare `type="button"` on
 * every key to stay out of that running; the column now contributes no control at all, which is
 * the same property held by construction rather than by an attribute.
 */
test("Enter in the field presses Check, and the column adds no control", () => {
  let submitted = 0;
  render(<AnswerCard frozen={NOTATION_ITEM} onSubmit={() => (submitted += 1)} />);
  const input = field();
  const form = input.closest("form") as HTMLFormElement;

  expect(form.querySelectorAll("button")).toHaveLength(1);
  const defaultButton = form.querySelector<HTMLElement>(
    "button:not([type]), button[type='submit'], input[type='submit'], input[type='image']",
  );
  expect(defaultButton, "the row has no submit control at all").not.toBeNull();
  expect(defaultButton?.textContent).toBe("Check");

  typeInto(input, "1/x^2");
  fireEvent.submit(form);
  expect(submitted).toBe(1);
  expect(input.value).toBe("1/x^2");
});

/**
 * The whole reason the preview exists: `/` on a keyboard still leaves the learner reading
 * `1/x^2` on one line.
 */
test("the preview draws the typed fraction as a stacked fraction", async () => {
  render(<AnswerCard frozen={NOTATION_ITEM} />);
  typeInto(field(), "1/x^2");

  const preview = document.querySelector(".cr-math-preview__typeset") as HTMLElement;
  await vi_waitFor(() => preview.querySelector(".katex") !== null);
  expect(preview.querySelector("[data-latex]")?.getAttribute("data-latex")).toBe(
    "\\dfrac{1}{x^{2}}",
  );
  // The typeset copy is decoration; the words beside it are what is announced.
  expect(
    (preview.closest(".cr-math-preview") as HTMLElement).querySelector(
      "[aria-hidden='true']",
    ),
  ).not.toBeNull();
});

/**
 * The house pattern, and deliberately not the naive one: typeset math markup reads badly
 * aloud, so the live region carries the same content in words and a test pins both
 * halves — exactly as `ExprBuilderInput.browser.test.tsx` pins `x^3` AND `x to the 3`.
 */
test("the live region carries the same answer in words", () => {
  render(<AnswerCard frozen={NOTATION_ITEM} />);

  const live = document.querySelector('[aria-live="polite"]') as HTMLElement;
  expect(live.textContent).toBe("Nothing to preview yet.");

  typeInto(field(), "1/x^2");
  expect(live.textContent).toContain("1/x^2");
  expect(live.textContent).toContain("1 over x to the 2");
});

/**
 * The `Preview` caption names its row in BOTH states, which REVERSES what this file used to
 * assert, so the reasoning is worth keeping rather than just the assertion.
 *
 * The old claim was that a caption over an empty box is chrome announcing a thing that is not
 * there. That argument is sound for a row that is not drawn, and this row is always drawn:
 * `min-height: 2.4rem` reserves it so nothing steps down the screen on the first keystroke.
 * Hiding only the words therefore left a reserved band with nothing in it to explain it, and it
 * was reported exactly that way — an awkward gap for no reason.
 *
 * The second half is what the old rule was really protecting, and it still has to hold: turning
 * the caption on must cost the row nothing as it fills, so the caption's own box does not move
 * or resize on the first character and the row never shrinks under it.
 */
test("the preview caption names its row before there is anything to preview", async () => {
  render(<AnswerCard frozen={NOTATION_ITEM} />);
  const preview = document.querySelector(".cr-math-preview") as HTMLElement;
  const caption = preview.querySelector(".micro-label") as HTMLElement;

  expect(preview.getAttribute("data-empty")).toBe("true");
  expect(caption.textContent?.trim()).toBe("Preview");
  expect(
    getComputedStyle(caption).visibility,
    "the caption is invisible over the very row it is there to explain",
  ).toBe("visible");

  const reserved = caption.getBoundingClientRect();
  const emptyRow = preview.getBoundingClientRect().height;
  expect(reserved.width, "the caption is drawn with no ink").toBeGreaterThan(0);

  typeInto(field(), "1/x^2");
  await vi_waitFor(() => preview.getAttribute("data-empty") === "false");

  expect(getComputedStyle(caption).visibility).toBe("visible");
  expect(
    caption.getBoundingClientRect().width,
    "the caption resized as the row filled",
  ).toBeCloseTo(reserved.width, 0);
  expect(
    caption.getBoundingClientRect().left,
    "the caption slid sideways as the row filled",
  ).toBeCloseTo(reserved.left, 0);
  expect(
    preview.getBoundingClientRect().height,
    "the reserved row shrank once it had something to draw",
  ).toBeGreaterThanOrEqual(emptyRow);
});

/**
 * The KaTeX surd trap, on a new render surface.
 *
 * `.lesson-visual svg` and `.lesson-interactive svg` are descendant selectors whose
 * `height: auto` once collapsed the tiny `<svg>` KaTeX draws a radical's hook with to
 * about a tenth of a pixel, so `\sqrt{50t^{7}}` painted as a bare `50t^{7}` — a different
 * and false statement. The preview is a fifth place KaTeX now renders, so the same
 * collapse is one careless `svg` selector away.
 */
test("a radical in the preview paints its surd at full height", async () => {
  const radical = D2_PRACTICE_ITEMS.find(
    (item) =>
      item.answer.answer_spec.simplification === "simplified_radical" &&
      (item.answer.allowed_symbols?.length ?? 0) === 0,
  ) as FrozenItem;
  render(<AnswerCard frozen={radical} />);

  typeInto(field(), "5*sqrt(50)");
  await vi_waitFor(() => document.querySelector(".cr-math-preview .hide-tail") !== null);

  const wrappers = Array.from(
    document.querySelectorAll<HTMLElement>(".cr-math-preview .katex .hide-tail"),
  );
  expect(wrappers.length, "the preview drew no radical to measure").toBeGreaterThan(0);

  for (const wrapper of wrappers) {
    const svg = wrapper.querySelector("svg") as SVGElement;
    const surd = svg.getBoundingClientRect();
    const slot = wrapper.getBoundingClientRect();
    // The collapse measured about 0.1px. A painted surd fills its wrapper.
    expect(surd.height, "surd has height").toBeGreaterThan(1);
    expect(surd.width, "surd has width").toBeGreaterThan(1);
    expect(surd.height, "surd fills its .hide-tail slot").toBeGreaterThanOrEqual(
      slot.height * 0.9,
    );
  }
});

/**
 * The dispatch in the other direction, and it is the cohort that gets neither aid for the same
 * reason. A notation line over `decreasing` is clutter at best and an invitation to type
 * notation the grader will refuse at worst; a PREVIEW over `decreasing` is worse than either,
 * because `previewOf` would draw `\mathrm{decreasing}` and typeset a word as mathematics.
 *
 * This is the assertion that stayed put while the other two in this file were rewritten. The
 * line and the preview are separate decisions (`answerKeypad` and `previewsNotation` in
 * `answerFormat.ts`), and `multiple_choice` is one of the four tags where both answers are
 * still no.
 */
test("an item whose answer is a word gets no notation line and no preview", () => {
  render(<AnswerCard frozen={WORD_ITEM} />);

  expect(notationLine()).toBeNull();
  expect(document.querySelector(".cr-math-preview")).toBeNull();
  expect(document.querySelector(".cr-math-answer")).toBeNull();
  // The field itself is untouched: the same bare input, with the same guidance.
  const input = field();
  expect(input.placeholder).toBe("One of the options above");
  expect(input.getAttribute("autocapitalize")).toBe("off");
});

/**
 * 390px is an iPhone 14/15, and it is the width the removed strip was most argued for: `^` and
 * `/` sit behind a symbol layer of the software keyboard there. So it is also the width where a
 * line replacing a row of tap targets has to be checked to still fit and still read.
 */
test("the column fits a 390px phone without overflowing its card", async () => {
  await page.viewport(390, 720);
  render(<AnswerCard frozen={NOTATION_ITEM} />);

  typeInto(field(), "1/x^2");
  await vi_waitFor(() => document.querySelector(".cr-math-preview .katex") !== null);

  const column = document.querySelector(".cr-math-answer") as HTMLElement;
  const columnBox = column.getBoundingClientRect();
  expect(columnBox.width, "the answer column collapsed").toBeGreaterThan(100);

  const line = notationLine() as HTMLElement;
  const lineBox = line.getBoundingClientRect();
  expect(line.textContent, "the line has nothing to fit").toBe(
    POSITIVE_EXPONENT_PLACEHOLDER,
  );
  expect(lineBox.right, "the notation line overflows the column").toBeLessThanOrEqual(
    columnBox.right + 0.5,
  );
  // It wraps rather than clipping: the scroll width of a clipped line exceeds its box.
  expect(line.scrollWidth, "the notation line is clipped").toBeLessThanOrEqual(
    Math.ceil(lineBox.width) + 1,
  );

  const preview = document.querySelector(".cr-math-preview") as HTMLElement;
  expect(preview.getBoundingClientRect().right).toBeLessThanOrEqual(columnBox.right + 0.5);
});

/**
 * The evidence for the review, at both widths and in both directions: an item that wants
 * notation and one that wants none. Into the gitignored screenshot directory, because
 * these are photographs of a run rather than assets the app ships.
 */
test("photographs both dispatch directions at desktop and at 390px", async () => {
  for (const [width, height, tag] of [
    [900, 640, "desktop"],
    [390, 720, "390px"],
  ] as const) {
    await page.viewport(width, height);

    const notation = render(<AnswerCard frozen={NOTATION_ITEM} />);
    typeInto(field(), "1/x^2");
    await vi_waitFor(() => document.querySelector(".cr-math-preview .katex") !== null);
    if (CAPTURE_EVIDENCE) {
      await page.screenshot({
        element: document.querySelector(".lesson-practice") as HTMLElement,
        path: `__screenshots__/answer-column-notation-${tag}.png`,
      });
    }
    notation.unmount();

    const word = render(<AnswerCard frozen={WORD_ITEM} />);
    typeInto(field(), "decreasing");
    if (CAPTURE_EVIDENCE) {
      await page.screenshot({
        element: document.querySelector(".lesson-practice") as HTMLElement,
        path: `__screenshots__/answer-column-no-notation-${tag}.png`,
      });
    }
    word.unmount();
  }

  const radical = D2_PRACTICE_ITEMS.find(
    (item) =>
      item.answer.answer_spec.simplification === "simplified_radical" &&
      (item.answer.allowed_symbols?.length ?? 0) > 0,
  ) as FrozenItem;
  await page.viewport(390, 720);
  render(<AnswerCard frozen={radical} />);
  typeInto(field(), "2*x*sqrt(2*x)");
  await vi_waitFor(() => document.querySelector(".cr-math-preview .katex") !== null);
  if (CAPTURE_EVIDENCE) {
    await page.screenshot({
      element: document.querySelector(".lesson-practice") as HTMLElement,
      path: "__screenshots__/answer-column-radical-390px.png",
    });
  }

  expect(true).toBe(true);
});

/**
 * The surface the reported screenshot was actually taken on. The EXP.1 check asks the
 * learner to simplify to `1/x^2`, and nothing on the screen used to say that `^` writes an
 * exponent or that `/` writes the bar a negative exponent turns into. The card is the
 * real one from `content/lessons/d2/EXP.1.json`, not a fixture.
 */
test("the real EXP.1 check-your-understanding card gets the line and the preview", async () => {
  const cfu = d2LessonByNode["EXP.1"]?.cfu;
  if (!cfu) {
    throw new Error("the D2 pack has no EXP.1 CFU");
  }
  render(
    <div style={{ width: MEASURE_BOX, background: "#fff", padding: 12 }}>
      <LessonCfu cfu={cfu} nodeId="EXP.1" />
    </div>,
  );

  const input = field();
  expect(input.placeholder).toBe(POSITIVE_EXPONENT_PLACEHOLDER);
  expect(screen.queryByRole("group", { name: RETIRED_STRIP_LABEL })).toBeNull();
  expect(notationLine(), "the CFU card has no notation line").not.toBeNull();

  // The card's form still submits through Check, and the column contributes no control.
  const form = input.closest("form") as HTMLFormElement;
  expect(
    form.querySelector<HTMLElement>(
      "button:not([type]), button[type='submit'], input[type='submit']",
    )?.textContent,
  ).toBe("Check");
  expect(screen.getAllByRole("textbox")).toHaveLength(1);

  typeInto(input, "1/x^2");
  expect((notationLine() as HTMLElement).textContent).toBe(POSITIVE_EXPONENT_PLACEHOLDER);
  await vi_waitFor(() => document.querySelector(".cr-math-preview .katex") !== null);
  expect(
    document.querySelector(".cr-math-preview [data-latex]")?.getAttribute("data-latex"),
  ).toBe("\\dfrac{1}{x^{2}}");

  const live = document.querySelector(".cr-math-preview [aria-live='polite']");
  expect(live?.textContent).toContain("1/x^2");
  expect(live?.textContent).toContain("1 over x to the 2");

  // And the answer it now helps them type is the one the pack accepts, verbatim.
  expect(cfu.accepted).toContain(input.value);

  for (const [width, height, tag] of [
    [900, 640, "desktop"],
    [390, 720, "390px"],
  ] as const) {
    await page.viewport(width, height);
    if (CAPTURE_EVIDENCE) {
      await page.screenshot({
        element: document.querySelector(".lesson-player__cfu") as HTMLElement,
        path: `__screenshots__/answer-column-cfu-exp1-${tag}.png`,
      });
    }
  }
});

/**
 * The other direction on the same surface: a check that wants a single evaluated number.
 *
 * **This assertion was rewritten, and the rewrite is the point.** It used to require no
 * notation AND no preview AND no column, which was one claim standing for two decisions,
 * because `MathAnswerColumn` rendered both aids or neither on `keys.length`. Only the first
 * of those three was ever argued: `cfuKeypad` withholds a fraction row here because the line
 * over the field says "A single number, e.g. 7" and notation that contradicts the line is
 * drift. That argument is about what the notation ADVERTISES and says nothing about reading
 * back what is already typed, so the preview's absence was a side effect of the shared gate
 * rather than a decision anybody made. It is now `previewsNotation`'s answer, and it is yes.
 *
 * So the notation half is asserted exactly as before, and the preview half is asserted in the
 * opposite direction with the drawing itself rather than the element, so an empty box would
 * fail here as surely as a missing one.
 */
test("a check-your-understanding card that wants a plain number gets the preview and no notation line", async () => {
  const numeric = allLessons.find(
    (lesson) =>
      lesson.cfu !== undefined &&
      cfuNotation(lesson.cfu.check, lesson.cfu.accepted) === "numeric_literal",
  );
  if (!numeric?.cfu) {
    throw new Error("no numeric-literal CFU authored");
  }
  render(
    <div style={{ width: MEASURE_BOX, background: "#fff", padding: 12 }}>
      <LessonCfu cfu={numeric.cfu} nodeId={numeric.node_id} />
    </div>,
  );

  // UNCHANGED: no notation row, because a fraction key would contradict the line under it,
  // and `answerKeypad` is what the notation LINE is now drawn from.
  expect(notationLine()).toBeNull();
  expect(field().placeholder).toBe(NUMERIC_LITERAL_PLACEHOLDER);
  // The column exists for the preview's sake alone, and it carries no line.
  expect(document.querySelector(".cr-math-answer")).not.toBeNull();

  // NEW: the reading is there, and it is DRAWN. `4/3` is a legal answer to a check that
  // demands a single number (`isNumericLiteral` admits a bare fraction), so it is the
  // submission where the reading earns its place: a stacked bar rather than a slash.
  typeInto(field(), "4/3");
  await vi_waitFor(() => document.querySelector(".cr-math-preview .katex") !== null);
  expect(
    document.querySelector(".cr-math-preview [data-latex]")?.getAttribute("data-latex"),
  ).toBe("\\dfrac{4}{3}");

  await page.viewport(390, 720);
  if (CAPTURE_EVIDENCE) {
    await page.screenshot({
      element: document.querySelector(".lesson-player__cfu") as HTMLElement,
      path: "__screenshots__/answer-column-cfu-no-notation-390px.png",
    });
  }
});

/**
 * The D5 two-field answer, which is the largest pool in the bank: `(2*x + 19)/(x*(x + 6))`
 * needs a `/`, and `d5.rat1.monomial.l1`'s `3*x^2/2` is the one served expression carrying BOTH
 * a caret and a bar. The item is chosen by its own key rather than by name, so the test is about
 * the shape rather than about an id that can be reshuffled.
 */
const RATIONAL_POWER_ITEM = D5_PRACTICE_ITEMS.find(
  (item) =>
    item.answer.answer_spec.answer_type === "rational_answer" &&
    /\^/.test(String((item.answer as { answer_key?: string }).answer_key)) &&
    String((item.answer as { answer_key?: string }).answer_key).includes("/"),
) as FrozenItem;

/** A D5 item keyed as a polynomial, which is the half of that pool that wants no aids. */
const RATIONAL_PLAIN_ITEM = D5_PRACTICE_ITEMS.find(
  (item) =>
    item.answer.answer_spec.answer_type === "rational_answer" &&
    !String((item.answer as { answer_key?: string }).answer_key).includes("/"),
) as FrozenItem;

test("the D5 expression field gets the column, and the exclusions field does not", async () => {
  expect(RATIONAL_POWER_ITEM, "no D5 item is keyed with a caret and a bar").toBeTruthy();
  render(<AnswerCard frozen={RATIONAL_POWER_ITEM} />);

  const boxes = screen.getAllByRole("textbox") as HTMLInputElement[];
  // The count several suites depend on: two fields, unchanged by the aids, because neither
  // the notation line nor the preview is a form control.
  expect(boxes).toHaveLength(2);
  expect(boxes[0]?.placeholder).toBe(RATIONAL_EXPRESSION_PLACEHOLDER);
  expect(boxes[1]?.placeholder).toBe(RATIONAL_EXCLUSIONS_PLACEHOLDER);

  // ONE column, on the expression half, and the line it shows is that half's own guidance.
  const column = boxes[0]?.closest(".cr-math-answer");
  expect(column, "the expression field is not inside an answer column").not.toBeNull();
  expect(
    boxes[1]?.closest(".cr-math-answer"),
    "the exclusions field grew a column",
  ).toBeNull();
  expect(document.querySelectorAll(".cr-math-notation")).toHaveLength(1);
  typeInto(boxes[0] as HTMLInputElement, "3*x^2/2");
  expect((notationLine() as HTMLElement).textContent).toBe(RATIONAL_EXPRESSION_PLACEHOLDER);
  expect(screen.queryByRole("group", { name: RETIRED_STRIP_LABEL })).toBeNull();

  // The exclusions half is a single line of numbers, not a second storey beside the line
  // and preview. Without `align-items: flex-start` on `.cr-rational-answer` it stretches to
  // the expression column's full height instead.
  const expressionInputHeight = boxes[0]?.getBoundingClientRect().height ?? 0;
  const exclusionsInputHeight = boxes[1]?.getBoundingClientRect().height ?? 0;
  const columnHeight = column?.getBoundingClientRect().height ?? 0;
  expect(
    expressionInputHeight,
    "expression input has no height to compare",
  ).toBeGreaterThan(0);
  expect(columnHeight, "expression column has no height to compare").toBeGreaterThan(
    expressionInputHeight,
  );
  expect(
    exclusionsInputHeight,
    "exclusions input stretched to the expression column height",
  ).toBeCloseTo(expressionInputHeight, 0);
  expect(exclusionsInputHeight).toBeLessThan(columnHeight * 0.75);

  // And the preview reads back what was typed, on the expression half only.
  await vi_waitFor(() => document.querySelector(".cr-math-preview .katex") !== null);
  expect(document.querySelectorAll(".cr-math-preview")).toHaveLength(1);
  expect(
    document.querySelector(".cr-math-preview [data-latex]")?.getAttribute("data-latex"),
    // The thin space is the preview reading the star back as an explicit product, which is
    // what the learner typed: `3*x^2/2` is this item's own answer key, verbatim.
  ).toBe("\\dfrac{3\\,x^{2}}{2}");

  await page.viewport(390, 720);
  if (CAPTURE_EVIDENCE) {
    await page.screenshot({
      element: document.querySelector(".lesson-practice") as HTMLElement,
      path: "__screenshots__/answer-column-d5-rational-390px.png",
    });
  }
});

/**
 * The tab order across the two-field answer, driven rather than reasoned about. It used to run
 * expression, key row, exclusions; with the strip gone the column contributes nothing focusable,
 * so the two fields have to be adjacent and Check has to follow them.
 */
test("the D5 tab order runs expression, exclusions, Check", async () => {
  const user = userEvent.setup();
  render(<AnswerCard frozen={RATIONAL_POWER_ITEM} />);
  const boxes = screen.getAllByRole("textbox") as HTMLInputElement[];

  (boxes[0] as HTMLInputElement).focus();
  expect(document.activeElement).toBe(boxes[0]);
  await user.tab();
  expect(document.activeElement, "Tab off the expression misses the exclusions field").toBe(
    boxes[1],
  );
  await user.tab();
  expect(
    (document.activeElement as HTMLElement).textContent,
    "Tab off the exclusions field misses Check",
  ).toBe("Check");
});

/**
 * **Rewritten for the same reason as the numeric-literal card above.** The argued half is the
 * notation row: these 56 items key a polynomial, so there is no bar to write and the star is a
 * coefficient's, which grades away — a notation line here would advertise characters the
 * learner never has to produce. Nothing in that argument touches the preview, and `x + 10` and
 * `(x + 4)*(x - 5)` are read by the expression grammar exactly as they stand, so the field
 * that used to be bare now carries the reading and still carries no line.
 *
 * The two spatial claims underneath are untouched and are why this test stayed in Chromium:
 * Check lines up with the expression input rather than with the label above it.
 */
test("a D5 item keyed as a polynomial gets the preview, no notation line, and Check still lines up", async () => {
  expect(RATIONAL_PLAIN_ITEM, "no D5 item is keyed without a bar").toBeTruthy();
  render(<AnswerCard frozen={RATIONAL_PLAIN_ITEM} />);

  const boxes = screen.getAllByRole("textbox") as HTMLInputElement[];
  expect(boxes).toHaveLength(2);
  // The line is the other half of "no aids": this item's answer has no bar, so the field must
  // not be showing the bar-shaped example the quotient-keyed items get.
  expect(boxes[0]?.placeholder).toBe(RATIONAL_POLYNOMIAL_PLACEHOLDER);
  expect(boxes[0]?.placeholder).not.toBe(RATIONAL_EXPRESSION_PLACEHOLDER);
  // NEW: one preview, on the expression half only, and it draws. The exclusions field is
  // still a bare input — a list of integers has no notation to read back.
  expect(boxes[0]?.closest(".cr-math-answer")).not.toBeNull();
  expect(boxes[1]?.closest(".cr-math-answer")).toBeNull();
  typeInto(boxes[0] as HTMLInputElement, "(x + 4)*(x - 5)");
  await vi_waitFor(() => document.querySelector(".cr-math-preview .katex") !== null);
  expect(document.querySelectorAll(".cr-math-preview")).toHaveLength(1);
  expect(
    document.querySelector(".cr-math-preview [data-latex]")?.getAttribute("data-latex"),
  ).toBe("\\left(x + 4\\right)\\,\\left(x - 5\\right)");
  // And no notation line, which is the other half of "no aids the item does not want": the
  // answer has no bar, so there is no rule to keep repeating once the placeholder has gone.
  expect(notationLine()).toBeNull();

  const checkButton = screen.getByRole("button", { name: "Check" });
  const label = document.querySelector(".cr-rational-answer__label") as HTMLElement;
  expect(label, "the rational row has no field label to measure against").not.toBeNull();
  const expressionTop = boxes[0]?.getBoundingClientRect().top ?? 0;
  const exclusionsTop = boxes[1]?.getBoundingClientRect().top ?? 0;
  const checkTop = checkButton.getBoundingClientRect().top;
  expect(expressionTop, "expression input has no top to compare").toBeGreaterThan(0);
  expect(checkTop, "Check sits on the label row instead of the inputs").toBeGreaterThan(
    label.getBoundingClientRect().bottom - 1,
  );
  expect(checkTop, "Check misses the expression input top").toBeCloseTo(expressionTop, 0);
  // Side by side both tops match; when the row wraps the button still lines up with the
  // expression field, which is the input row Check sits beside.
  if (Math.abs(expressionTop - exclusionsTop) < 2) {
    expect(checkTop, "Check misses the exclusions input top").toBeCloseTo(exclusionsTop, 0);
  }
});

/**
 * The other CFU shape the dispatch could not reach: a caret in a SUM. NUM.4's check is keyed
 * `x^2 + 5x`, which `isPositiveExponentAnswerText` refuses on purpose (it asserts a
 * simplification profile NUM.4 has not got), so the card showed the bare "Your answer" over an
 * answer whose one unguessable character is the caret.
 */
test("a check whose answer is a caret inside a sum names the caret", async () => {
  const num4 = allLessons.find(
    (lesson) =>
      lesson.cfu !== undefined &&
      cfuNotation(lesson.cfu.check, lesson.cfu.accepted) === "exponent_notation",
  );
  if (!num4?.cfu) {
    throw new Error("no exponent-notation CFU authored");
  }
  render(
    <div style={{ width: MEASURE_BOX, background: "#fff", padding: 12 }}>
      <LessonCfu cfu={num4.cfu} nodeId={num4.node_id} />
    </div>,
  );

  const input = field();
  expect(input.placeholder).toBe(EXPONENT_NOTATION_PLACEHOLDER);
  expect(screen.getAllByRole("textbox")).toHaveLength(1);
  expect(screen.queryByRole("group", { name: RETIRED_STRIP_LABEL })).toBeNull();

  // The rule survives being followed: the learner types the pack's own answer and the caret
  // guidance is still on screen, which is precisely what the placeholder could not manage.
  typeInto(input, num4.cfu.accepted[0] ?? "");
  expect((notationLine() as HTMLElement).textContent).toBe(EXPONENT_NOTATION_PLACEHOLDER);
  await vi_waitFor(() => document.querySelector(".cr-math-preview .katex") !== null);
  expect(num4.cfu.accepted).toContain(input.value);

  await page.viewport(390, 720);
  if (CAPTURE_EVIDENCE) {
    await page.screenshot({
      element: document.querySelector(".lesson-player__cfu") as HTMLElement,
      path: "__screenshots__/answer-column-cfu-exponent-sum-390px.png",
    });
  }
});

/**
 * The one served item whose whole answer is written in terms of pi, chosen by its own key
 * rather than by template id so the test is about the shape and not about a name.
 */
const PI_ITEM = D10_PRACTICE_ITEMS.find((item) =>
  /(^|[^a-z])pi([^a-z]|$)/i.test(
    String((item.answer as { answer_key?: string }).answer_key),
  ),
) as FrozenItem;

/**
 * The pi dispatch, which is the sharpest case for a PERSISTENT line: the character a learner
 * cannot guess here is not a character at all. `π` is a glyph in the prompt whose ASCII spelling
 * has no visual cue anywhere on the card, and `π` itself grades `invalid_input / unknown_symbol`.
 * A rule like that surviving the first keystroke is the whole point.
 *
 * The frame is taken at 1024x580 per `.cursor/rules/qa-verification.mdc`: the claim "the line is
 * visible under the field" is spatial, and a comfortable developer viewport is exactly the frame
 * that cannot fail.
 */
test("the exact-pi item names the spelling, keeps naming it, and previews the glyph", async () => {
  expect(PI_ITEM, "no served item is keyed in pi").toBeTruthy();
  const answerKey = String((PI_ITEM.answer as { answer_key?: string }).answer_key);

  await page.viewport(1024, 580);
  render(<AnswerCard frozen={PI_ITEM} />);

  const input = field();
  // 1. The field says how the symbol is spelled, BEFORE the first attempt.
  expect(input.placeholder).toBe(PI_EXPRESSION_PLACEHOLDER);
  expect(input.placeholder).toContain("pi");
  expect(screen.getAllByRole("textbox")).toHaveLength(1);

  // 2. And it goes on saying it AFTER the first attempt, which the placeholder cannot.
  typeInto(input, answerKey);
  const line = notationLine() as HTMLElement;
  expect(line, "the pi item has no notation line").not.toBeNull();
  expect(line.textContent).toBe(PI_EXPRESSION_PLACEHOLDER);
  expect(line.textContent).toContain("pi");
  const inputBox = input.getBoundingClientRect();
  const lineBox = line.getBoundingClientRect();
  expect(lineBox.height, "the line has no height").toBeGreaterThan(8);
  expect(lineBox.top, "the line is not under the field").toBeGreaterThanOrEqual(
    inputBox.bottom - 1.5,
  );
  expect(lineBox.bottom, "the line is below the fold").toBeLessThanOrEqual(580);

  // 3. The preview reads it back AS THE GLYPH: `pi` drawn as `\mathrm{pi}` would be two
  //    upright letters, which is the reading the learner is already afraid is wrong.
  const preview = document.querySelector(".cr-math-preview__typeset") as HTMLElement;
  await vi_waitFor(() => preview.querySelector(".katex") !== null);
  expect(preview.querySelector("[data-latex]")?.getAttribute("data-latex")).toContain(
    "\\pi",
  );
  const live = document.querySelector(".cr-math-preview [aria-live='polite']");
  expect(live?.textContent).toContain(answerKey);

  // 4. The string the field holds is the string the grader accepts.
  expect(
    practiceChecker({
      raw_answer: normalizeTextSubmission(
        input.value,
        PI_ITEM.answer.answer_spec.answer_type,
      ),
      item_version_id: PI_ITEM.item_version_id,
      equivalence_checker_version: checkerVersionForItem(PI_ITEM),
    }).status,
  ).toBe("correct");

  // Two frames, because the claim has two halves. The element crop is the column itself; the
  // full viewport is what says the line and the preview are not pushed off a short screen or
  // sitting under something, which a crop to the changed element could never show.
  if (CAPTURE_EVIDENCE) {
    await page.screenshot({
      element: document.querySelector(".lesson-practice") as HTMLElement,
      path: "__screenshots__/answer-column-pi-1024x580.png",
    });
  }
  if (CAPTURE_EVIDENCE) {
    await page.screenshot({
      path: "__screenshots__/answer-column-pi-1024x580-viewport.png",
    });
  }
});

/** Poll until `predicate` holds; KaTeX renders in an effect, so it is a tick behind. */
async function vi_waitFor(predicate: () => boolean, timeoutMs = 4000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("waitFor timed out");
}
