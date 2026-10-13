import { type FormEvent, type ReactElement, useId, useState } from "react";

import { checkAnswer } from "./answer-checker-registry";
import type { AnswerChecker, CheckAnswerResult } from "./index";
import { canonicalizeRootGlyphInput } from "./root-glyph-input";

export interface MathInputSubmission {
  raw_answer: string;
  result: CheckAnswerResult;
}

export interface MathInputProps {
  itemVersionId: string;
  checkerVersion: number;
  label: string;
  checker?: AnswerChecker;
  disabled?: boolean;
  feedbackMode?: "immediate" | "record-only";
  placeholder?: string;
  submitLabel?: string;
  onChecked?: (submission: MathInputSubmission) => void;
}

function feedbackFor(
  result: CheckAnswerResult,
  mode: MathInputProps["feedbackMode"],
): string {
  if (
    mode === "record-only" &&
    (result.status === "correct" || result.status === "incorrect")
  ) {
    return "Answer recorded.";
  }

  switch (result.reason_code) {
    case "match":
      return "That works.";
    case "sign_error":
      return "The size is right. Check the sign.";
    case "wrong_representation":
      return "Use the form requested in the question.";
    case "not_simplified":
      return "The value matches, but this still needs to be simplified.";
    case "wrong_unit":
      return "Check the required unit and write it after the value.";
    case "empty_answer":
      return "Enter an answer before checking.";
    case "parse_error":
    case "unsupported_syntax":
    case "unknown_symbol":
      return "Check the format so the expression can be read.";
    case "checker_version_unsupported":
    case "item_version_not_found":
    case "checker_not_configured":
      return "This item cannot be checked right now. It was not counted as wrong.";
    default:
      return result.status === "incorrect"
        ? "Not quite. Check your work and try again."
        : result.status === "invalid_input"
          ? "Check the answer format and try again."
          : result.status === "correct"
            ? "That works."
            : "This answer could not be checked. It was not counted as wrong.";
  }
}

export function MathInput({
  itemVersionId,
  checkerVersion,
  label,
  checker = checkAnswer,
  disabled = false,
  feedbackMode = "immediate",
  placeholder = "Type your answer",
  submitLabel = "Check answer",
  onChecked,
}: MathInputProps): ReactElement {
  const inputId = useId();
  const feedbackId = useId();
  const [rawAnswer, setRawAnswer] = useState("");
  const [result, setResult] = useState<CheckAnswerResult | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const canonicalAnswer = canonicalizeRootGlyphInput(rawAnswer);
    const checked = checker({
      raw_answer: canonicalAnswer,
      item_version_id: itemVersionId,
      equivalence_checker_version: checkerVersion,
    });
    setResult(checked);
    onChecked?.({ raw_answer: canonicalAnswer, result: checked });
  }

  const state =
    result?.status === "correct"
      ? "correct"
      : result?.status === "incorrect"
        ? "incorrect"
        : result?.status === "invalid_input"
          ? "invalid"
          : result
            ? "error"
            : "idle";

  return (
    <form className="cr-math-input" data-state={state} onSubmit={handleSubmit}>
      <label className="cr-math-input__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="cr-math-input__controls">
        <input
          id={inputId}
          className="cr-math-input__field"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          value={rawAnswer}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={result ? feedbackId : undefined}
          aria-invalid={state === "invalid"}
          onChange={(event) => {
            setRawAnswer(event.target.value);
            setResult(null);
          }}
        />
        <button className="cr-math-input__submit" type="submit" disabled={disabled}>
          {submitLabel}
        </button>
      </div>
      <p
        id={feedbackId}
        className="cr-math-input__feedback"
        data-status={result?.status ?? "idle"}
        aria-live="polite"
      >
        {result ? feedbackFor(result, feedbackMode) : " "}
      </p>
    </form>
  );
}
