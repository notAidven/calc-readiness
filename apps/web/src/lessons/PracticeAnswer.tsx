import { getInteractiveModule, isInteractiveAnswerType } from "@cr/components";
import type { FrozenItem } from "@cr/item-bank";
import type { ReactElement } from "react";

import {
  answerKeypad,
  answerPreview,
  practicePlaceholder,
  RATIONAL_EXCLUSIONS_PLACEHOLDER,
} from "./answerFormat";
import { MathAnswerColumn } from "./MathAnswerColumn";
import { InlineMath } from "./svgKit";

/**
 * The single answer-input dispatcher for BOTH practice surfaces (graded
 * `LessonPractice` + casual `InfinitePractice`). Given a frozen item, it renders the
 * right control for the item's `answer_type`:
 *
 *  - an interactive type (`isInteractiveAnswerType`) → the module's controlled widget
 *    (`module.Input`), fed the ANSWER-FREE `module.toWorkspace(interactive_spec)` so
 *    the answer key never reaches the client, emitting a structured payload;
 *  - `rational_answer` (D5) → a two-field expression + excluded-values input, because the
 *    comparator grades both halves and rejects a bare string; or
 *  - any other text type → the existing single-line text `<input>`, unchanged.
 *
 * Both branches are controlled through the same `value` / `onChange` seam, so the
 * surface owns submission and grades through the ONE global `checkAnswer` — the
 * mastery path is identical for widget and text answers.
 *
 * A widget is never handed the prompt STRING. Every host renders `frozen.prompt` itself,
 * typeset, and names that element through `promptId`; a widget given the string printed
 * it again, unprocessed, so the learner read the problem twice with the repeat in raw
 * LaTeX.
 *
 * The web app is also where KaTeX lives, so it hands each widget a typesetter for the
 * expression the student is assembling. `@cr/components` stays free of a math-rendering
 * dependency and every widget still works without one.
 */

/** The union a practice surface carries: a text string, a widget payload, or unanswered. */
export type PracticeAnswerValue = string | Record<string, unknown> | null;

export function PracticeAnswer({
  frozen,
  value,
  onChange,
  disabled,
  ariaInvalid,
  describedBy,
  placeholder,
  promptId,
  answerLabelId,
}: {
  frozen: FrozenItem;
  value: PracticeAnswerValue;
  onChange: (value: PracticeAnswerValue) => void;
  disabled: boolean;
  ariaInvalid?: boolean;
  /**
   * The id of a message about THIS field — the diagnostic's refusal line. Wired to every text
   * field the shape renders, so a screen-reader user who is told the answer could not be read
   * hears it from the field they have to fix rather than only as a passing announcement.
   */
  describedBy?: string;
  placeholder?: string;
  /**
   * The id of the element in which the HOST has already rendered `frozen.prompt`. An
   * interactive widget takes its accessible name from that element instead of printing
   * the prompt string again: this used to be passed down as the widget's `label`, and the
   * widget showed it as plain text, so a learner met the problem twice, the second time
   * as raw LaTeX (`practicePromptOnce.browser.test.tsx`).
   */
  promptId?: string;
  /** Visible host-owned "Answer" label for the single text field or interactive group. */
  answerLabelId?: string;
}): ReactElement {
  const answerType = frozen.answer.answer_spec.answer_type;

  if (isInteractiveAnswerType(answerType)) {
    const module = getInteractiveModule(answerType);
    if (module && frozen.answer.interactive_spec !== undefined) {
      const workspace = module.toWorkspace(frozen.answer.interactive_spec);
      const Input = module.Input;
      // The widget's payload is a structured object; a bare string only appears for
      // the text branch, so hand the widget only object|null values.
      const payload =
        value !== null && typeof value === "object"
          ? (value as Record<string, unknown>)
          : null;
      return (
        <Input
          itemVersionId={frozen.item_version_id}
          workspace={workspace}
          value={payload}
          onChange={(next) => onChange(next as Record<string, unknown>)}
          labelledBy={[promptId, answerLabelId].filter(Boolean).join(" ") || undefined}
          disabled={disabled}
          renderMath={(latex) => <InlineMath latex={latex} />}
        />
      );
    }
  }

  if (answerType === "rational_answer") {
    return (
      <RationalAnswerInput
        frozen={frozen}
        value={value}
        onChange={onChange}
        disabled={disabled}
        ariaInvalid={ariaInvalid}
        describedBy={describedBy}
      />
    );
  }

  return (
    <MathTextAnswer
      frozen={frozen}
      value={typeof value === "string" ? value : ""}
      onChange={onChange}
      disabled={disabled}
      ariaInvalid={ariaInvalid}
      describedBy={describedBy}
      placeholder={placeholder ?? "Your answer"}
      labelledBy={answerLabelId}
    />
  );
}

/**
 * The single-line text answer, plus the two aids the item asks for.
 *
 * The field itself is unchanged: one `<input type="text">`, one `value`/`onChange` seam,
 * the same string reaching the same checker. What is new around it is presentational on
 * both sides — a notation line that keeps saying how the answer is typed after the
 * placeholder has gone, and a preview that reads the characters back as notation — and both
 * are driven by the same notation dispatch the placeholder comes from, through its two
 * consumers: `answerKeypad` for the notation row and `answerPreview` for the reading. They
 * are asked separately because they answer differently: an interval gets no notation row
 * (its brackets are the graded skill) and does get a preview (the reading is what says the
 * brackets mean what the learner thinks). An item whose answer is the word `decreasing`
 * gets neither.
 *
 * Neither aid is a form control. The line is a paragraph and the preview is two spans and
 * a paragraph, so the row still holds exactly one `textbox` and the five suites that find
 * the answer field with `getByRole("textbox")` are untouched.
 */
function MathTextAnswer({
  frozen,
  value,
  onChange,
  disabled,
  ariaInvalid,
  describedBy,
  placeholder,
  labelledBy,
}: {
  frozen: FrozenItem;
  value: string;
  onChange: (value: PracticeAnswerValue) => void;
  disabled: boolean;
  ariaInvalid?: boolean;
  describedBy?: string;
  placeholder: string;
  labelledBy?: string;
}): ReactElement {
  return (
    <MathAnswerColumn
      keys={answerKeypad(
        frozen.answer.answer_spec,
        frozen.answer.allowed_symbols,
        frozen.answer.answer_key,
      )}
      preview={answerPreview(
        frozen.answer.answer_spec,
        frozen.answer.allowed_symbols,
        frozen.answer.answer_key,
      )}
      value={value}
      hint={placeholder}
    >
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={ariaInvalid}
        aria-describedby={describedBy}
        aria-labelledby={labelledBy}
        {...MATH_TEXT_INPUT_ATTRS}
        placeholder={placeholder}
        disabled={disabled}
      />
    </MathAnswerColumn>
  );
}

/**
 * Attributes every math text input needs. iOS and Android capitalize the first character
 * of an empty text field unless told not to, and a capitalized variable used to reach the
 * checker as an unknown symbol: the attempt scored as unanswered with no indication that
 * case was the problem. Autocorrect and the spellchecker are equally unhelpful over
 * `2*x^2*sqrt(2*x)`. The checker also case-folds a submitted symbol against the item's
 * `allowed_symbols` now, so this is belt AND braces: the keyboard stops producing the
 * problem, and a capital that arrives some other way still grades.
 */
const MATH_TEXT_INPUT_ATTRS = {
  autoComplete: "off",
  autoCapitalize: "off",
  autoCorrect: "off",
  spellCheck: false,
} as const;

/**
 * The `rational_answer` input (D5): TWO fields, because the comparator grades two things.
 * A rational answer is the simplified expression PLUS the values the ORIGINAL denominator
 * forbids, and cancelling a factor hides the value it excluded, so the exclusions cannot be
 * inferred from the expression the student typed. One text box could not express both, and
 * a bare string is rejected outright as `invalid_rational_answer`.
 *
 * The payload is `{ expression, excluded_values }`. The exclusions go over as the raw
 * string; the comparator splits it on commas and evaluates each piece as a number, so the
 * student types `-2, 3` rather than `x != -2`.
 *
 * **Only the EXPRESSION half gets the aids**, and the asymmetry is measured rather than
 * assumed: 84 of the 140 served items are keyed with a fraction bar (two of those with a
 * caret, two templates with a star the grader cannot read without), and all 140 exclusion
 * lists are plain integers — `-2, 3` — so a keypad under the second field would be typing
 * notation nothing in that field ever needs. Which row the first field gets is the one
 * notation dispatch's answer for this item, the same `answerKeypad` every other surface
 * asks, so an item keyed as a polynomial gets the bare field back.
 *
 * **Its LINE comes from the same dispatch, per item.** Both halves of this field used to be
 * hard-coded, which showed a bar-shaped example to the 56 items whose answer reduces to a
 * polynomial. The expression half now asks `practicePlaceholder` with the item's own key, so
 * the bar in the key picks the line and the row together. The exclusions half stays a literal,
 * because every exclusion list in the pool is plain integers and no dispatch tag describes it.
 */
function RationalAnswerInput({
  frozen,
  value,
  onChange,
  disabled,
  ariaInvalid,
  describedBy,
}: {
  frozen: FrozenItem;
  value: PracticeAnswerValue;
  onChange: (value: PracticeAnswerValue) => void;
  disabled: boolean;
  ariaInvalid?: boolean;
  describedBy?: string;
}): ReactElement {
  const record = value !== null && typeof value === "object" ? value : {};
  const expression = typeof record.expression === "string" ? record.expression : "";
  const exclusions =
    typeof record.excluded_values === "string" ? record.excluded_values : "";
  return (
    <div className="cr-rational-answer">
      <label className="cr-rational-answer__field">
        <span className="cr-rational-answer__label">Simplified expression</span>
        {/*
         * The column goes INSIDE the label and around the input alone, so the notation line
         * and the preview belong to the field they describe rather than to the pair of fields.
         * The exclusions half gets neither: every exclusion list in the pool is plain integers.
         */}
        <MathAnswerColumn
          keys={answerKeypad(
            frozen.answer.answer_spec,
            frozen.answer.allowed_symbols,
            frozen.answer.answer_key,
          )}
          preview={answerPreview(
            frozen.answer.answer_spec,
            frozen.answer.allowed_symbols,
            frozen.answer.answer_key,
          )}
          value={expression}
          hint={practicePlaceholder(
            frozen.answer.answer_spec,
            frozen.answer.allowed_symbols,
            frozen.answer.answer_key,
          )}
        >
          <input
            type="text"
            value={expression}
            onChange={(event) =>
              onChange({ expression: event.target.value, excluded_values: exclusions })
            }
            aria-invalid={ariaInvalid}
            aria-describedby={describedBy}
            {...MATH_TEXT_INPUT_ATTRS}
            placeholder={practicePlaceholder(
              frozen.answer.answer_spec,
              frozen.answer.allowed_symbols,
              frozen.answer.answer_key,
            )}
            disabled={disabled}
          />
        </MathAnswerColumn>
      </label>
      <label className="cr-rational-answer__field">
        <span className="cr-rational-answer__label">Excluded values</span>
        <input
          type="text"
          value={exclusions}
          onChange={(event) =>
            onChange({ expression, excluded_values: event.target.value })
          }
          aria-invalid={ariaInvalid}
          aria-describedby={describedBy}
          {...MATH_TEXT_INPUT_ATTRS}
          placeholder={RATIONAL_EXCLUSIONS_PLACEHOLDER}
          disabled={disabled}
        />
      </label>
    </div>
  );
}
