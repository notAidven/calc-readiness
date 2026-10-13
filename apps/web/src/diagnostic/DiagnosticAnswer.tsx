import type { FrozenItem } from "@cr/item-bank";
import { type ReactElement, useEffect, useId, useRef, useState } from "react";

import { practicePlaceholder } from "../lessons/answerFormat";
import { PracticeAnswer, type PracticeAnswerValue } from "../lessons/PracticeAnswer";
import { unreadableAnswer } from "../lessons/unreadableAnswer";
import { DIAGNOSTIC_CHECKER_VERSION, diagnosticAnswerChecker } from "./browserRuntime";

import "./diagnostic-answer.css";

/**
 * THE DIAGNOSTIC'S ANSWER ROW — the same control lesson practice uses, with the
 * diagnostic's submit on it.
 *
 * It used to be `MathInput`: one text `<input>`, no notation line, no preview. That was
 * adequate while the instrument was six D1 nodes, every one of which is answered with a
 * number or a short expression. Over the widened scope it is not, in two different ways:
 *
 *  - **`RAT.1` could not be answered at all.** A rational answer is submitted as
 *    `{ expression, excluded_values }`, because the comparator grades the simplified
 *    expression AND the values the ORIGINAL denominator forbids — cancelling a factor hides
 *    the value it excluded, so the exclusions cannot be inferred from what was typed. A
 *    bare string is refused outright as `invalid_rational_answer`, which is `invalid_input`,
 *    which `isScorable` refuses, so the walk would have re-served that item forever. The
 *    alternative was to drop `RAT.1` from the scope, and that takes D5 out of the
 *    instrument entirely.
 *  - **Several shapes could not be answered CONFIDENTLY.** `LIN.1` is keyed as a solution
 *    set (`{-3, 2}`), `CG.1` as a coordinate pair, `RAD.*` with radicals. Those grade fine
 *    from a bare field and a learner has no way to know the notation the grader reads. The
 *    placeholder and the notation note under the field are the existing answer to that, and
 *    they come from ONE notation dispatch (`answerFormat.ts`) that lesson practice, the CFU
 *    card and now this all ask, so a diagnostic question and the practice question after it
 *    speak the same grammar.
 *
 * So `PracticeAnswer` is reused rather than reimplemented: it is the dispatcher that owns
 * "which control does this answer shape need", and a second copy of that decision in the
 * diagnostic lane is exactly how the two surfaces would drift.
 *
 * ## What is deliberately NOT shared
 *
 * **Feedback.** Lesson practice tells a learner whether they were right; a diagnostic must
 * not. `PracticeAnswer` renders no verdict of its own, so the property holds by
 * construction here rather than by passing a mode flag: this component grades locally only
 * to fill `client_correct` (which the server recomputes and never trusts) and shows the
 * learner nothing but that the answer went in.
 *
 * **The empty submit.** `MathInput` submitted an empty field, which reaches the walk as
 * `empty_answer`/`invalid_input` — non-scorable, so the identical question comes back and
 * the learner sees a press that did nothing. Refused here instead, with a line saying why.
 *
 * **Every OTHER unreadable submit, for the same reason.** `empty_answer` is one of twenty-odd
 * reason codes under `invalid_input`, and this row used to refuse that one and pass the rest:
 * it graded locally, read `client_correct` off the result and dropped the `status`. So an
 * answer the checker could not PARSE submitted exactly like one it could, `isScorable` refused
 * the row, the walk re-served the same node without advancing its adjudication, and the runner
 * incremented its own question counter over it. Reported from question 23 as
 * *"its silently rejecting improperly formatted answers; like putting in 'a' doesnt display an
 * error bar"*. Where the line is drawn, and the wording, are
 * `../lessons/unreadableAnswer.ts`'s: this surface was the first of ten to get the fix and it
 * no longer owns any part of the decision.
 */

export interface DiagnosticAnswerSubmission {
  /**
   * `unknown` rather than `string`, matching `AssessmentItemSubmission.raw_answer`: a
   * rational answer is an object and an interactive payload would be too.
   */
  raw_answer: unknown;
  /** The local verdict, for telemetry only — the authoritative score is recomputed. */
  client_correct: boolean;
}

/** What the refusal line is saying, so the row can be styled and read per case. */
type NoticeTone = "empty" | "unreadable";

interface AnswerNotice {
  tone: NoticeTone;
  text: string;
}

/** Whether a value is answered at all, over both shapes the control can produce. */
function isAnswered(value: PracticeAnswerValue): boolean {
  if (value === null) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  // The rational payload: the expression half is the answer, so an empty one is unanswered
  // however many exclusions were typed.
  const expression = value.expression;
  return typeof expression === "string" && expression.trim().length > 0;
}

export function DiagnosticAnswer({
  frozen,
  disabled,
  submitLabel,
  onSubmit,
}: {
  frozen: FrozenItem;
  disabled: boolean;
  submitLabel: string;
  onSubmit: (submission: DiagnosticAnswerSubmission) => void;
}): ReactElement {
  const promptId = useId();
  const noticeId = useId();
  const [value, setValue] = useState<PracticeAnswerValue>(null);
  const [notice, setNotice] = useState<AnswerNotice | null>(null);
  const noticeRef = useRef<HTMLParagraphElement | null>(null);
  /* Hoisted, because the field shows it as a placeholder AND the refusal quotes it once the
     placeholder is gone. Two calls could not disagree, but one string cannot. */
  const placeholder = practicePlaceholder(
    frozen.answer.answer_spec,
    frozen.answer.allowed_symbols,
    frozen.answer.answer_key,
  );

  /*
   * SCROLL THE REFUSAL INTO VIEW, because on the screen this instrument is demonstrated at it
   * is below the fold. Measured on the learner's own mount at 1024x580
   * (`answerAreaShots.browser.test.tsx`): the probe card's submit sits at 650px and the bar
   * under it at 704px, so an alert that only renders is an alert nobody reads. `block: "nearest"`
   * moves the surface by the least that makes it visible, which keeps the field and the question
   * on screen instead of jumping the learner to the bottom of the card.
   *
   * This is not a substitute for the card fitting a short screen, which is a whole-card
   * measurement and is reported as its own finding. It is what the answer row can do about it
   * alone, and it is worth doing regardless of who fixes the height: a bar that scrolls itself
   * into view is still correct on a screen where it would have been visible anyway.
   */
  useEffect(() => {
    // Optional-called because jsdom does not implement it. The claim it carries is spatial, so
    // it is made in real Chromium (`answerAreaShots.browser.test.tsx`) and the jsdom suites are
    // free not to have it rather than being handed a stub that would let it pass unmeasured.
    if (notice) {
      noticeRef.current?.scrollIntoView?.({ block: "nearest", behavior: "auto" });
    }
  }, [notice]);

  return (
    <form
      className="dgx-answer"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isAnswered(value)) {
          setNotice({ tone: "empty", text: "Enter an answer before submitting." });
          return;
        }
        const result = diagnosticAnswerChecker({
          raw_answer: value,
          item_version_id: frozen.item_version_id,
          equivalence_checker_version: DIAGNOSTIC_CHECKER_VERSION,
        });
        /*
         * THE ONE BRANCH ON THE CHECKER'S VERDICT, and it reads the STATUS rather than the
         * grade. `unreadableAnswer` is the shared decision every answer surface in the app now
         * makes (`../lessons/unreadableAnswer.ts`), so what a learner is told here and what
         * they are told in lesson practice, the check card, the endless drill, the ceremony and
         * the four crisis surfaces is one sentence from one place.
         *
         * Refused rather than submitted, so the walk never records a row it cannot score and
         * then re-serves the same question over it.
         */
        const unreadable = unreadableAnswer(result, value, {
          allowedSymbols: frozen.answer.allowed_symbols,
          notationLine: placeholder,
        });
        if (unreadable) {
          setNotice({ tone: "unreadable", text: unreadable.message });
          return;
        }
        setNotice(null);
        onSubmit({ raw_answer: value, client_correct: result.client_correct });
      }}
    >
      {/*
       * NAMED BUT NOT PAINTED. "Your answer" was a printed row above a single text field in a
       * form whose only purpose is the answer, under a heading that names the skill and a prompt
       * that asks the question — so it told a sighted learner nothing and cost a line plus a gap
       * on a screen measured to have neither (see the frames in
       * `answerAreaShots.browser.test.tsx`). It stays in the accessibility tree, because it is
       * what `promptId` names for an interactive answer widget and what the field is described
       * by, and `.visually-hidden` is the house way to keep one without drawing it.
       */}
      <span className="dgx-answer__label visually-hidden" id={promptId}>
        Your answer
      </span>
      <PracticeAnswer
        frozen={frozen}
        value={value}
        onChange={(next) => {
          setValue(next);
          setNotice(null);
        }}
        disabled={disabled}
        ariaInvalid={notice?.tone === "unreadable" ? true : undefined}
        describedBy={notice ? noticeId : undefined}
        placeholder={placeholder}
        promptId={promptId}
      />
      <div className="dgx-answer__actions">
        <button type="submit" className="dgx-answer__submit" disabled={disabled}>
          {submitLabel}
        </button>
      </div>
      {/*
       * `role="alert"` rather than the bare `aria-live` this used to carry, and the change is
       * the point: a refused submit is the one press here with no other visible consequence —
       * the question does not change and the field does not move — so it has to interrupt.
       * Rendered only when there is something to say, so "the row is silent" is a fact about
       * the DOM that a test can assert rather than a string of one space.
       */}
      {notice && (
        <p
          ref={noticeRef}
          className="dgx-answer__notice"
          id={noticeId}
          data-tone={notice.tone}
          role="alert"
        >
          {notice.text}
        </p>
      )}
    </form>
  );
}
