import type { EraId } from "@cr/skill-graph";
import { type FormEvent, useState } from "react";

import { useOptionalSession } from "../auth/session";
import { AdvisorNpc } from "./AdvisorNpc";
import { normalizeTextSubmission, practicePlaceholder } from "./answerFormat";
import { clearReviewMistake, readReviewMistakes } from "./mistakeStore";
import { PracticeAnswer, type PracticeAnswerValue } from "./PracticeAnswer";
import {
  checkerVersionForItem,
  practiceChecker,
  practiceItemsById,
} from "./practiceChecker";
import { LessonProse } from "./prose";
import { UnreadableAnswerNote } from "./UnreadableAnswerNote";
import { unreadableAnswer } from "./unreadableAnswer";

export function ReviewMistakes({
  eraId,
  onExit,
}: {
  readonly eraId: EraId;
  readonly onExit: () => void;
}) {
  const session = useOptionalSession();
  const learnerId = session?.studentId ?? "local-demo";
  const [mistakes, setMistakes] = useState(() => readReviewMistakes(learnerId, eraId));
  const [value, setValue] = useState<PracticeAnswerValue>("");
  const [message, setMessage] = useState("");
  const [unreadable, setUnreadable] = useState<string | null>(null);
  const current = mistakes[0];
  const item = current ? practiceItemsById.get(current.itemVersionId) : undefined;

  if (!current || !item) {
    return (
      <div className="advisor-lesson advisor-lesson--infinite advisor-lesson--review">
        <button
          type="button"
          className="advisor-npc__action advisor-npc__action--prev advisor-lesson__back"
          onClick={onExit}
        >
          Back to city
        </button>
        <AdvisorNpc
          line="There are no missed questions waiting here. When you miss or skip a practice question, it will appear in Review mistakes."
          mood="encouraging"
        />
        <p className="advisor-lesson__gate-hint" data-testid="review-mistakes-empty">
          No mistakes to review yet.
        </p>
      </div>
    );
  }
  const reviewItem = item;

  function submit(event: FormEvent) {
    event.preventDefault();
    const answerType = reviewItem.answer.answer_spec.answer_type;
    const rawAnswer =
      typeof value === "string" ? normalizeTextSubmission(value, answerType) : value;
    const outcome = practiceChecker({
      raw_answer: rawAnswer,
      item_version_id: reviewItem.item_version_id,
      equivalence_checker_version: checkerVersionForItem(reviewItem),
    });
    const unreadableNow = unreadableAnswer(outcome, value, {
      allowedSymbols: reviewItem.answer.allowed_symbols,
      notationLine: practicePlaceholder(
        reviewItem.answer.answer_spec,
        reviewItem.answer.allowed_symbols,
        reviewItem.answer.answer_key,
      ),
    });
    if (unreadableNow) {
      setMessage("");
      setUnreadable(unreadableNow.message);
      return;
    }
    setUnreadable(null);
    if (!outcome.client_correct) {
      setMessage("Not yet. This mistake stays here until you answer it correctly.");
      return;
    }
    setMistakes(clearReviewMistake(learnerId, eraId, reviewItem.item_version_id));
    setValue("");
    setMessage("Correct. That question has been cleared from Review mistakes.");
  }

  return (
    <div className="advisor-lesson advisor-lesson--infinite advisor-lesson--review">
      <button
        type="button"
        className="advisor-npc__action advisor-npc__action--prev advisor-lesson__back"
        onClick={onExit}
      >
        Back to city
      </button>
      <AdvisorNpc
        line={`This question is here because it was missed or skipped. Answer it correctly once to clear it. ${mistakes.length} ${mistakes.length === 1 ? "mistake remains" : "mistakes remain"}.`}
        mood="neutral"
      />
      <section
        className="lesson-practice review-mistakes-card"
        aria-labelledby="review-mistake-prompt"
      >
        <span className="micro-label">Review mistake · {mistakes.length} remaining</span>
        <div
          id="review-mistake-prompt"
          className="lesson-practice__prompt lesson-player__prose"
        >
          <LessonProse markdown={item.prompt} />
        </div>
        <form className="lesson-player__row" onSubmit={submit}>
          <PracticeAnswer
            key={item.item_version_id}
            frozen={item}
            value={value}
            onChange={setValue}
            disabled={false}
            promptId="review-mistake-prompt"
            placeholder={practicePlaceholder(
              item.answer.answer_spec,
              item.answer.allowed_symbols,
              item.answer.answer_key,
            )}
          />
          <button type="submit">Check</button>
        </form>
        <UnreadableAnswerNote note={unreadable} />
        {message && (
          <p className="lesson-player__feedback" aria-live="polite">
            {message}
          </p>
        )}
      </section>
    </div>
  );
}
