import { isInteractiveAnswerType } from "@cr/components";
import type { FrozenItem } from "@cr/item-bank";
import { type FormEvent, useRef, useState } from "react";

import { useOptionalSession } from "../auth/session";
import { runtimeStorage } from "../storage/runtimeStorage";
import { type AdvisorMood, AdvisorNpc } from "./AdvisorNpc";
import {
  isNumericLiteral,
  isReducedFraction,
  NUMERIC_LITERAL_NOTE,
  normalizeTextSubmission,
  practicePlaceholder,
  REDUCED_FRACTION_NOTE,
  revealedAnswerLine,
} from "./answerFormat";
import { DifficultyTag } from "./DifficultyTag";
import type { InfiniteScheduler } from "./infiniteScheduler";
import { recordReviewMistake } from "./mistakeStore";
import { PracticeAnswer, type PracticeAnswerValue } from "./PracticeAnswer";
import { checkerVersionForItem, practiceChecker } from "./practiceChecker";
import { LessonProse } from "./prose";
import { requiresNumericLiteral } from "./submitGuards";
import { UnreadableAnswerNote } from "./UnreadableAnswerNote";
import { unreadableAnswer } from "./unreadableAnswer";
import { WorkedSolution } from "./WorkedSolution";

type Phase = "answering" | "correct" | "incorrect" | "skipped";

/**
 * One resolved problem, reported so a host can learn something from it.
 *
 * The drill stays as unaware of what happens next as it is for `onCorrectAnswer`: it
 * describes what the learner did and hands over the item, and the host decides whether
 * that is worth recording, paying for, or ignoring.
 *
 * `"incorrect"` and `"skipped"` are held apart even though both reveal the answer and
 * both reset the streak, because they are different evidence. A learner who answered and
 * missed attempted the mathematics; a learner who skipped did not, and a store that reads
 * these as the same thing cannot tell working from guessing.
 */
export interface DrillAttemptEvent {
  readonly item: FrozenItem;
  readonly outcome: "correct" | "incorrect" | "skipped";
}

export interface InfiniteCorrectEvidence {
  readonly sessionCorrect: number;
  readonly nodeId: string;
  readonly itemVersionId: string;
  readonly rawAnswer: unknown;
}

/** Browser-local high-water mark until account-backed streak storage lands. */
export function nodeBestStreakKey(nodeId: string): string {
  return `cr.infinitePractice.bestStreak.${nodeId}`;
}

/**
 * The interleaved drill's high-water mark, keyed by ERA.
 *
 * This replaces a `…bestStreak.domain.${domainId}` key, and the old values are NOT
 * migrated: a domain streak and an era streak are records of different mixes, so
 * carrying `domain.d1`'s number onto `era.prehistoric` would only be right for the one
 * era whose node set happens to match a domain's. A learner's interleaved best streak
 * therefore resets once, which is a decorative counter rather than progress.
 */
export function eraBestStreakKey(eraId: string): string {
  return `cr.infinitePractice.bestStreak.era.${eraId}`;
}

export function readBestStreak(storageKey: string): number {
  const raw = runtimeStorage()?.getItem(storageKey) ?? null;
  if (raw === null) {
    return 0;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function writeBestStreak(storageKey: string, n: number): void {
  runtimeStorage()?.setItem(storageKey, String(n));
}

/** Decorative flame for the streak counter; meaning comes from the adjacent label. */
function FlameIcon() {
  return (
    <svg
      className="infinite-practice__flame"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2c1 3-1 4.5-2.5 6C8 9.5 7 11 7 13a5 5 0 0 0 10 0c0-1.7-.7-3.2-1.8-4.5-.5 1-1.2 1.5-2.2 1.7 1-2.3.4-5-1-8.2Z" />
    </svg>
  );
}

/**
 * Shared endless drill shell: streak tracking, no hints, skip/incorrect reveal via
 * worked solution. Callers supply the scheduler (random per-node or interleaved
 * per-domain) and the localStorage key for the best-streak high-water mark.
 */
export function InfiniteDrill({
  scheduler,
  storageKey,
  backLabel,
  skillLabelFor,
  onCorrectAnswer,
  onAttempt,
  onCorrectEvidence,
  onExit,
}: {
  scheduler: InfiniteScheduler;
  storageKey: string;
  backLabel: string;
  skillLabelFor?: (item: FrozenItem) => string;
  /**
   * Fired after each correct answer with the running total for this drill session. The
   * drill stays unaware of anything downstream (it grants no mastery and no resources);
   * a host may read the count to decide when a round's worth of work is done.
   */
  onCorrectAnswer?: (sessionCorrect: number) => void;
  /**
   * Fired once per resolved problem, however it resolved. Kept beside `onCorrectAnswer`
   * rather than replacing it: that one reports a session TALLY the payout is counted from,
   * this one reports a single OUTCOME, and a host wants them for different reasons.
   */
  onAttempt?: (event: DrillAttemptEvent) => void;
  /** Raw answer evidence for a host whose authenticated server recomputes a paid clear. */
  onCorrectEvidence?: (evidence: InfiniteCorrectEvidence) => void;
  onExit: () => void;
}) {
  const authSession = useOptionalSession();
  const learnerId = authSession?.studentId ?? "local-demo";
  const schedulerRef = useRef(scheduler);
  const correctCountRef = useRef(0);

  function drawNext(): FrozenItem {
    return schedulerRef.current.next();
  }

  const [current, setCurrent] = useState<FrozenItem>(() => drawNext());
  const [value, setValue] = useState<PracticeAnswerValue>("");
  const [phase, setPhase] = useState<Phase>("answering");
  const [feedback, setFeedback] = useState<string | null>(null);
  /** Held apart from `feedback`, which on this surface carries the revealed answer. */
  const [unreadable, setUnreadable] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => readBestStreak(storageKey));

  function goToNext() {
    setCurrent(drawNext());
    setValue("");
    setFeedback(null);
    setUnreadable(null);
    setPhase("answering");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const answerType = current.answer.answer_spec.answer_type;
    const isInteractive = isInteractiveAnswerType(answerType);
    const text = typeof value === "string" ? value : "";
    // Keyed off the item's own answer key, not `answer_type`: a simplified radical is
    // `numeric` too, and this gate used to refuse the key verbatim (`submitGuards.ts`).
    if (!isInteractive && requiresNumericLiteral(current) && !isNumericLiteral(text)) {
      setFeedback(NUMERIC_LITERAL_NOTE);
      return;
    }
    if (
      !isInteractive &&
      current.answer.answer_spec.simplification === "reduced_fraction" &&
      isNumericLiteral(text) &&
      /\d+\s*\/\s*\d+/.test(text) &&
      !isReducedFraction(text)
    ) {
      setFeedback(REDUCED_FRACTION_NOTE);
      return;
    }

    /*
     * WHAT DECIDES THIS IS THE PAYLOAD'S SHAPE, NOT THE ANSWER TYPE, and reading it off the
     * type is what made all four RAT nodes' drills unplayable. `rational_answer` renders a
     * two-field control and emits `{ expression, excluded_values }`, and it is not an
     * INTERACTIVE type — so the old `isInteractive ? value : …` sent that object down the
     * text branch, where `text` had already flattened it to `""`. The checker was handed the
     * empty string, answered `invalid_rational_answer`, and the learner was told to fill in
     * both boxes they had just filled in. Nothing scored, the streak neither advanced nor
     * broke, and the answer was never revealed, so the drill could not even be failed out of.
     *
     * `typeof value === "string"` is the test `LessonPractice` has always used, and it is the
     * one that describes the decision being made: normalize text, pass a structure through.
     */
    const rawAnswer: unknown =
      typeof value === "string" ? normalizeTextSubmission(value, answerType) : value;
    const outcome = practiceChecker({
      raw_answer: rawAnswer,
      item_version_id: current.item_version_id,
      equivalence_checker_version: checkerVersionForItem(current),
    });

    /*
     * THE READER COULD NOT READ IT, and this surface had the most to lose from not asking: the
     * fall-through below breaks the streak AND reveals the answer, so an unreadable answer cost
     * the learner their run and handed them the solution for it. Neither happens now; the
     * question stays, and the note says how to write it.
     */
    const unreadableNow = unreadableAnswer(outcome, rawAnswer, {
      allowedSymbols: current.answer.allowed_symbols,
      notationLine: practicePlaceholder(
        current.answer.answer_spec,
        current.answer.allowed_symbols,
        current.answer.answer_key,
      ),
    });
    if (unreadableNow) {
      setFeedback(null);
      setUnreadable(unreadableNow.message);
      return;
    }
    setUnreadable(null);

    if (outcome.client_correct) {
      setFeedback(null);
      setStreak((count) => {
        const next = count + 1;
        setBestStreak((best) => {
          const raised = Math.max(best, next);
          if (raised > best) {
            writeBestStreak(storageKey, raised);
          }
          return raised;
        });
        return next;
      });
      setPhase("correct");
      // Counted on a ref, not the streak state, so the tally survives a wrong answer
      // and is reported exactly once per correct answer (never twice under StrictMode).
      correctCountRef.current += 1;
      // The attempt goes FIRST, so a host that folds it into something `onCorrectAnswer`
      // then reads is looking at a record that already includes this answer. The reverse
      // order silently reports the state one answer behind.
      onAttempt?.({ item: current, outcome: "correct" });
      onCorrectAnswer?.(correctCountRef.current);
      onCorrectEvidence?.({
        sessionCorrect: correctCountRef.current,
        nodeId: current.node_id,
        itemVersionId: current.item_version_id,
        rawAnswer,
      });
      return;
    }
    setStreak(0);
    setFeedback(revealedAnswerLine(current));
    setPhase("incorrect");
    recordReviewMistake(learnerId, current);
    onAttempt?.({ item: current, outcome: "incorrect" });
  }

  function handleSkip() {
    setStreak(0);
    setFeedback(revealedAnswerLine(current));
    setPhase("skipped");
    recordReviewMistake(learnerId, current);
    onAttempt?.({ item: current, outcome: "skipped" });
  }

  const npcLine =
    phase === "correct"
      ? "Correct! Your streak grows. Keep it rolling."
      : phase === "incorrect"
        ? "Not this time, so the streak resets. Shake it off and keep going."
        : phase === "skipped"
          ? "Skipped. Streak resets. Here's the solution before you move on."
          : streak > 0
            ? "You're on a roll. Answer the next one to keep your streak alive."
            : "Answer as many as you like. Build a streak, and skip any you'd rather pass on.";
  const npcMood: AdvisorMood =
    phase === "correct"
      ? "happy"
      : phase === "incorrect" || phase === "skipped"
        ? "encouraging"
        : "neutral";

  const skillLabel = phase !== "answering" && skillLabelFor ? skillLabelFor(current) : null;

  return (
    <div className="advisor-lesson advisor-lesson--infinite">
      <button
        type="button"
        className="advisor-npc__action advisor-npc__action--prev advisor-lesson__back"
        onClick={onExit}
      >
        {backLabel}
      </button>

      <AdvisorNpc line={npcLine} mood={npcMood} />

      <section className="lesson-practice" aria-labelledby="infinite-practice-prompt">
        <div className="lesson-practice__head">
          <span className="infinite-practice__streak" aria-live="polite">
            <FlameIcon />
            <span className="infinite-practice__streak-count">{streak}</span>
            <span className="infinite-practice__streak-label">streak</span>
            <span className="infinite-practice__best">Best {bestStreak}</span>
          </span>
          {skillLabel ? (
            <span className="infinite-practice__skill">{skillLabel}</span>
          ) : null}
          <DifficultyTag difficulty={current.difficulty} />
        </div>

        <div
          id="infinite-practice-prompt"
          className="lesson-practice__prompt lesson-player__prose"
        >
          <LessonProse markdown={current.prompt} />
        </div>

        <form className="lesson-player__row" onSubmit={handleSubmit}>
          <PracticeAnswer
            key={current.item_version_id}
            frozen={current}
            value={value}
            onChange={setValue}
            disabled={phase !== "answering"}
            ariaInvalid={feedback !== null && phase === "answering"}
            promptId="infinite-practice-prompt"
            placeholder={practicePlaceholder(
              current.answer.answer_spec,
              current.answer.allowed_symbols,
              current.answer.answer_key,
            )}
          />
          {phase === "answering" && <button type="submit">Check</button>}
        </form>

        <UnreadableAnswerNote note={unreadable} />

        {feedback && (
          <div
            className="lesson-player__feedback lesson-player__prose"
            data-status={
              phase === "incorrect" || phase === "skipped" ? "incorrect" : undefined
            }
            aria-live="polite"
          >
            <LessonProse markdown={feedback} />
          </div>
        )}

        {phase === "answering" && (
          <div className="lesson-practice__actions">
            <button type="button" className="advisor-npc__action" onClick={handleSkip}>
              Skip
            </button>
          </div>
        )}

        {(phase === "incorrect" || phase === "skipped") && (
          <WorkedSolution
            templateId={current.template_id}
            params={current.template_params}
            steps={current.worked_solution}
          />
        )}

        {phase !== "answering" && (
          <div className="lesson-practice__actions">
            {phase === "correct" && (
              <p className="lesson-player__feedback" data-status="correct">
                Correct! Nice work.
              </p>
            )}
            <button
              type="button"
              className="advisor-npc__action advisor-npc__action--next"
              onClick={goToNext}
            >
              Next problem
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
