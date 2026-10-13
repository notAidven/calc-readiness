import { type D1NodeId, isInteractiveAnswerType } from "@cr/components";
import { canonicalRawAnswer } from "@cr/item-bank";
import type { LessonSession } from "@cr/lesson";
import {
  MASTERY_CORRECT_COUNT,
  masteryFromCorrectCount,
  PRACTICE_SET_SIZE,
  type SubmitAssessmentEvidenceResult,
} from "@cr/mastery-service";
import type { Mastery } from "@cr/state-schema";
import { type FormEvent, useCallback, useReducer, useRef, useState } from "react";
import { useOptionalSession } from "../auth/session";
import { usePresenterRegistration } from "../demo/PresenterShell";
import { WorkChecker, type WorkParseClient, type WorkUploadStore } from "../work-upload";
import { type AdvisorMood, AdvisorNpc } from "./AdvisorNpc";
import {
  isNumericLiteral,
  isReducedFraction,
  missNote,
  NUMERIC_LITERAL_NOTE,
  normalizeTextSubmission,
  practicePlaceholder,
  REDUCED_FRACTION_NOTE,
} from "./answerFormat";
import { DifficultyTag } from "./DifficultyTag";
import { practiceSourceForNode } from "./domains";
import { HintIcon } from "./icons";
import { recordReviewMistake } from "./mistakeStore";
import { PracticeAnswer, type PracticeAnswerValue } from "./PracticeAnswer";
import { practiceItemsById } from "./practiceChecker";
import { getPracticeNpcNote } from "./practiceNotes";
import { isDistinctRetry, type PracticeSource } from "./practiceSession";
import { LessonProse } from "./prose";
import { recordStruggleAttempt } from "./struggleStore";
import { requiresNumericLiteral } from "./submitGuards";
import { UnreadableAnswerNote } from "./UnreadableAnswerNote";
import { unreadableAnswer } from "./unreadableAnswer";
import { WorkedSolution } from "./WorkedSolution";

type UiPhase =
  | "answering"
  | "correct"
  | "revealed"
  | "submitting"
  | "save-error"
  | "result";

/** The text-guard helpers expect a string; a non-string (widget) payload reads as empty. */
function asText(value: PracticeAnswerValue): string {
  return typeof value === "string" ? value : "";
}

/**
 * Resolve a fresh Presenter practice set as five genuine first-try correct responses.
 *
 * This drives the same lesson session and mastery service as ordinary practice. It never calls
 * either reveal method, so the demo earns gold through the real 5/5 rule rather than by writing
 * a mastery tier directly. Ordinary learner submissions do not call this Presenter-only seam.
 */
export async function completePerfectPresenterPractice(
  active: LessonSession,
  evidenceId: string = crypto.randomUUID(),
): Promise<SubmitAssessmentEvidenceResult> {
  let correctCount = 0;
  while (!active.isPracticeComplete()) {
    const current = active.getCurrentSlot();
    if (!current) {
      throw new Error("Presenter practice ended before all five slots were resolved.");
    }
    const item = practiceItemsById.get(current.instance.item_version_id);
    if (!item) {
      throw new Error(
        `Presenter practice cannot resolve ${current.instance.item_version_id}.`,
      );
    }
    const outcome = active.submitAnswer({
      raw_answer: canonicalRawAnswer(item.answer),
      time_on_item_ms: 0,
    });
    if (!outcome.resolved || !outcome.client_correct) {
      throw new Error(
        `Presenter practice could not produce a correct response for slot ${current.slot + 1}.`,
      );
    }
    correctCount += 1;
    active.advanceSlot();
  }

  const evidence = await active.submitPractice(evidenceId);
  const expectedMastery = masteryFromCorrectCount(correctCount);
  if (correctCount !== PRACTICE_SET_SIZE || evidence.mastery !== expectedMastery) {
    throw new Error(
      `Presenter set with ${correctCount} correct answers out of ${PRACTICE_SET_SIZE} produced mastery ${evidence.mastery}, expected ${expectedMastery}.`,
    );
  }
  return evidence;
}

/**
 * The practice phase: the node's five bank problems (already ordered easy -> hard),
 * graded through the real lesson engine + mastery service. Each problem carries
 * up to three progressive hints (Mastery_Scoring_Spec §4): the student reveals
 * them one at a time and, only once all are exhausted, may give up to reveal the worked
 * solution — then retry a fresh number-swapped instance or move on (losing that slot's
 * credit; a revealed slot never counts). Hints do not reduce credit. Mastery is the
 * service's 4/5 rule (5/5 = gold); every completed set reports its evidenced mastery
 * via `onComplete` so the city building reflects the real score.
 */
export function LessonPractice({
  nodeId,
  onComplete,
  source: sourceProp,
  workUploadStore,
  workParseClient,
}: {
  nodeId: string;
  onComplete?: (mastery: Mastery, evidenceId: string) => void | Promise<void>;
  /** Work-checker seams, injected by browser contract tests; production uses the factories. */
  workUploadStore?: WorkUploadStore;
  workParseClient?: WorkParseClient;
  /**
   * The problem source. Defaults to the pool of whichever domain owns `nodeId`
   * (`practiceSourceForNode`), so every authored domain practices without its caller
   * knowing which one it is; the `?interactive` demo hatch passes the number_line
   * source so the SAME component drives that pool through the identical engine +
   * mastery path.
   */
  source?: PracticeSource;
}) {
  const authSession = useOptionalSession();
  const learnerId = authSession?.studentId ?? "local-demo";
  const node = nodeId as D1NodeId;
  const sourceRef = useRef<PracticeSource | null>(null);
  if (sourceRef.current === null) {
    sourceRef.current = sourceProp ?? practiceSourceForNode(nodeId);
  }
  const source = sourceRef.current;
  const sessionRef = useRef<LessonSession | null>(null);
  // Minted once per five-slot set and retained across a failed request. A retry with a new
  // id would be a second attempt; reusing this one is what lets the server return the first
  // committed receipt when the response, rather than the transaction, was lost.
  const evidenceIdRef = useRef<string | null>(null);
  const shownIdsRef = useRef<Set<string>>(new Set());
  if (sessionRef.current === null) {
    const created = source.createSession();
    sessionRef.current = created.session;
    evidenceIdRef.current = crypto.randomUUID();
    // Seed the dedup set with all five opening instances so a "fresh version" retry
    // never draws an item already used in another slot of this set.
    shownIdsRef.current = new Set(created.initialInstanceIds);
  }
  const slotStartRef = useRef<number>(Date.now());
  const lastCorrectRef = useRef<boolean>(false);
  /**
   * Wrong answers on the instance currently on screen, which is what tells an independent
   * correct apart from one that took a stumble first. Reset per instance rather than per
   * slot, so a fresh-version retry after a reveal starts clean.
   */
  const slotMissesRef = useRef<number>(0);

  const [value, setValue] = useState<PracticeAnswerValue>("");
  const [uiPhase, setUiPhase] = useState<UiPhase>("answering");
  /**
   * The note under the field, and whether it is a JUDGED MISS.
   *
   * The flag travels with the message because the element carried `data-status="incorrect"`
   * unconditionally, and three of the four things that set it are not misses: both pre-submit
   * guards refuse before `submitAnswer` is ever called, so no attempt is recorded and the slot
   * is untouched, and the scoring-fault line is the app breaking rather than the learner. The
   * distinction is the one `unreadable` below is held apart from `feedback` to keep, and the one
   * `InfiniteDrill` keeps by deriving the attribute from its phase.
   */
  const [feedback, setFeedback] = useState<{
    readonly message: string;
    readonly scored: boolean;
  } | null>(null);
  /**
   * The refusal, held apart from `feedback` on purpose. `feedback` may be painted
   * `data-status="incorrect"`, and an answer the reader could not read has not been judged
   * incorrect or anything else, so it must not wear a miss.
   */
  const [unreadable, setUnreadable] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [result, setResult] = useState<SubmitAssessmentEvidenceResult | null>(null);
  const [, redraw] = useReducer((tick: number) => tick + 1, 0);

  const session = sessionRef.current;
  const presenter = usePresenterRegistration();
  const slot = session.getCurrentSlot();
  const frozen = slot ? practiceItemsById.get(slot.instance.item_version_id) : undefined;

  function resetForNextSlot() {
    setValue("");
    setFeedback(null);
    setUnreadable(null);
    setUiPhase("answering");
    slotStartRef.current = Date.now();
    slotMissesRef.current = 0;
    redraw();
  }

  async function finishPractice() {
    setUiPhase("submitting");
    try {
      let evidenceId = evidenceIdRef.current;
      if (evidenceId === null) {
        evidenceId = crypto.randomUUID();
        evidenceIdRef.current = evidenceId;
      }
      const evidence = await session.submitPractice(evidenceId);
      setResult(evidence);
      setUiPhase("result");
      // Report only a receipt the configured mastery service actually returned. In account
      // mode that means the transaction persisted; a failed request stays on the retry
      // surface and never advances the city from a browser-only grade.
      await onComplete?.(evidence.mastery, evidenceId);
    } catch {
      setUiPhase("save-error");
    }
  }

  const completeForPresenter =
    useCallback(async (): Promise<SubmitAssessmentEvidenceResult> => {
      // Always start a fresh deterministic five-slot set. A presenter can press this after any
      // partial interaction and still land on a perfect set rather than inheriting stale UI.
      const created = source.createSession();
      const active = created.session;
      sessionRef.current = active;
      evidenceIdRef.current = crypto.randomUUID();
      shownIdsRef.current = new Set(created.initialInstanceIds);
      lastCorrectRef.current = false;
      slotMissesRef.current = 0;
      setValue("");
      setFeedback(null);
      setUnreadable(null);
      setResult(null);
      setUiPhase("submitting");

      try {
        const evidenceId = crypto.randomUUID();
        const evidence = await completePerfectPresenterPractice(active, evidenceId);
        await onComplete?.(evidence.mastery, evidenceId);
        return evidence;
      } catch (error: unknown) {
        const retry = source.createSession();
        sessionRef.current = retry.session;
        evidenceIdRef.current = crypto.randomUUID();
        shownIdsRef.current = new Set(retry.initialInstanceIds);
        setCorrectCount(0);
        setResult(null);
        setUiPhase("answering");
        redraw();
        throw error;
      }
    }, [onComplete, source]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const current = session.getCurrentSlot();
    if (!current) {
      return;
    }
    // Numeric prompts (e.g. order of operations) are graded by exact-value, which
    // evaluates the input — so reject a pasted expression before grading and make
    // the student enter the computed number (mirrors the CFU guard). These string
    // format guards apply only to text answers; interactive widgets emit a structured
    // payload and are gated out here. `requiresNumericLiteral` reads the item's OWN
    // answer key rather than `answer_type` alone, because a simplified radical is
    // `numeric` too and this gate used to refuse `sqrt(7)/2` on the item keyed
    // `sqrt(7)/2` (see `submitGuards.ts`).
    const currentFrozen = practiceItemsById.get(current.instance.item_version_id);
    const currentType = currentFrozen?.answer.answer_spec.answer_type;
    const isInteractive = currentType !== undefined && isInteractiveAnswerType(currentType);
    if (
      !isInteractive &&
      requiresNumericLiteral(currentFrozen) &&
      !isNumericLiteral(asText(value))
    ) {
      setFeedback({ message: NUMERIC_LITERAL_NOTE, scored: false });
      return;
    }
    if (
      !isInteractive &&
      currentFrozen?.answer.answer_spec.simplification === "reduced_fraction" &&
      isNumericLiteral(asText(value)) &&
      /\d+\s*\/\s*\d+/.test(asText(value)) &&
      !isReducedFraction(asText(value))
    ) {
      setFeedback({ message: REDUCED_FRACTION_NOTE, scored: false });
      return;
    }
    // Text answers submit the normalized string (trimmed, and case-folded for a
    // choose-one answer); interactive answers submit the widget payload object as-is.
    // Both go through the same `submitAnswer` → global checker.
    const rawAnswer: unknown =
      typeof value === "string" ? normalizeTextSubmission(value, currentType) : value;
    const outcome = session.submitAnswer({
      raw_answer: rawAnswer,
      time_on_item_ms: Date.now() - slotStartRef.current,
    });
    shownIdsRef.current.add(current.instance.item_version_id);

    /*
     * THE READER COULD NOT READ IT, which is not a miss and is not scored: `isResolvingStatus`
     * in the lesson engine admits only `correct` and `incorrect`, so this slot is untouched and
     * the attempt costs the learner nothing.
     *
     * What stood here said only "Check the answer format so it can be read, then try again." —
     * true, and it left a learner in exactly the place they were already stuck in, since nothing
     * on screen said what the format IS once the placeholder had gone. The shared decision in
     * `unreadableAnswer.ts` says what to do about it, and `setFeedback` is deliberately NOT used
     * for it: that element is painted `data-status="incorrect"`.
     */
    const unreadableNow = unreadableAnswer(outcome, rawAnswer, {
      allowedSymbols: currentFrozen?.answer.allowed_symbols,
      notationLine: currentFrozen
        ? practicePlaceholder(
            currentFrozen.answer.answer_spec,
            currentFrozen.answer.allowed_symbols,
            currentFrozen.answer.answer_key,
          )
        : undefined,
    });
    if (unreadableNow) {
      setFeedback(null);
      setUnreadable(unreadableNow.message);
      return;
    }
    setUnreadable(null);
    if (!outcome.resolved) {
      // A fault rather than unreadable input (`scoring_error` / `unsupported_expression`): the
      // app broke, not the learner, and no rewriting gets them past it. Unchanged.
      setFeedback({
        message: "Check the answer format so it can be read, then try again.",
        scored: false,
      });
      return;
    }

    lastCorrectRef.current = outcome.client_correct;
    if (outcome.client_correct) {
      setFeedback(null);
      setUiPhase("correct");
      // The instance is resolved, so this is the one place a correct answer is recorded.
      // Selection is untouched by it: this set was drawn before the component mounted.
      if (currentFrozen) {
        recordStruggleAttempt({
          nodeId,
          templateId: currentFrozen.template_id,
          difficulty: currentFrozen.difficulty,
          correct: true,
          firstTry: slotMissesRef.current === 0,
          revealed: false,
          hintsUsed: current.hints_used,
        });
      }
      return;
    }
    // A wrong answer keeps the student on the same instance: they can try again,
    // reveal a hint, or (once hints are exhausted) give up. Only a correct answer
    // or a reveal moves the slot forward.
    slotMissesRef.current += 1;
    if (currentFrozen) {
      recordReviewMistake(learnerId, currentFrozen);
    }
    setFeedback({
      message: missNote(currentFrozen?.answer.answer_spec, outcome.reason_code ?? ""),
      scored: true,
    });
  }

  function handleShowHint() {
    // biome-ignore lint/correctness/useHookAtTopLevel: session.useHint() is an engine method (reveal the next hint), not a React hook.
    session.useHint();
    redraw();
  }

  function handleReveal() {
    const current = session.getCurrentSlot();
    const revealedFrozen = current
      ? practiceItemsById.get(current.instance.item_version_id)
      : undefined;
    session.reveal();
    setFeedback(null);
    setUiPhase("revealed");
    // Recorded HERE and not in `handleMoveOn`, because the reveal is what resolves this
    // instance. Taking a fresh version afterwards is a new instance and gets its own
    // record; recording at move-on instead would miss every retry the learner then won.
    // The item is looked up BEFORE `session.reveal()`, so the slot read is the one the
    // learner gave up on rather than whatever the session advances to.
    if (revealedFrozen) {
      recordReviewMistake(learnerId, revealedFrozen);
      recordStruggleAttempt({
        nodeId,
        templateId: revealedFrozen.template_id,
        difficulty: revealedFrozen.difficulty,
        correct: false,
        firstTry: false,
        revealed: true,
        hintsUsed: current?.hints_used ?? 0,
      });
    }
  }

  function handleContinue() {
    if (lastCorrectRef.current) {
      setCorrectCount((count) => count + 1);
    }
    session.advanceSlot();
    if (session.isPracticeComplete()) {
      void finishPractice();
      return;
    }
    resetForNextSlot();
  }

  function handleFreshVersion() {
    const current = session.getCurrentSlot();
    const currentFrozen = current
      ? practiceItemsById.get(current.instance.item_version_id)
      : undefined;
    if (!current || !currentFrozen) {
      return;
    }
    shownIdsRef.current.add(current.instance.item_version_id);
    const fresh = source.drawFresh(
      currentFrozen.difficulty,
      shownIdsRef.current,
      currentFrozen.template_id,
    );
    // Hard gate: never re-serve the same id or the same prompt as the revealed item.
    if (!fresh || !isDistinctRetry(currentFrozen, fresh)) {
      return;
    }
    session.retryWithFreshInstance(fresh);
    shownIdsRef.current.add(fresh.item_version_id);
    resetForNextSlot();
  }

  function handleMoveOn() {
    // Give up on a revealed slot: it resolves as not-correct (never counts) and
    // the set advances. lastCorrectRef stays false, so no credit is added.
    lastCorrectRef.current = false;
    session.skipRevealedSlot(Date.now() - slotStartRef.current);
    if (session.isPracticeComplete()) {
      void finishPractice();
      return;
    }
    resetForNextSlot();
  }

  function handlePracticeAgain() {
    const created = source.createSession();
    sessionRef.current = created.session;
    evidenceIdRef.current = crypto.randomUUID();
    shownIdsRef.current = new Set(created.initialInstanceIds);
    lastCorrectRef.current = false;
    slotStartRef.current = Date.now();
    setCorrectCount(0);
    setResult(null);
    resetForNextSlot();
  }

  if (uiPhase === "save-error") {
    return (
      <div className="advisor-lesson">
        <AdvisorNpc
          line="Your set is complete. Let's make sure it reaches your account."
          mood="encouraging"
        />
        <section
          className="lesson-practice__result"
          data-outcome="save-error"
          aria-labelledby="practice-save-error-title"
        >
          <span className="micro-label">Practice not saved</span>
          <p
            id="practice-save-error-title"
            className="lesson-practice__verdict"
            role="alert"
          >
            We could not save this practice set. Your answers are still here.
          </p>
          <p>Check your connection, then retry. Retrying will not count the set twice.</p>
          <button
            type="button"
            className="primary-action"
            onClick={() => void finishPractice()}
          >
            Retry saving results
          </button>
        </section>
      </div>
    );
  }

  if (uiPhase === "result" && result) {
    const mastered = result.mastery >= 2;
    const gold = result.mastery >= 3;
    const line = gold
      ? `Perfect! ${correctCount} of ${PRACTICE_SET_SIZE}! This skill shines gold.`
      : mastered
        ? `You did it! ${correctCount} of ${PRACTICE_SET_SIZE} correct. This skill's building is complete!`
        : `So close. ${correctCount} of ${PRACTICE_SET_SIZE}. You need ${MASTERY_CORRECT_COUNT} to master it. Let's run it back.`;

    return (
      <div className="advisor-lesson">
        <AdvisorNpc line={line} mood={mastered ? "happy" : "encouraging"} />
        <section
          className="lesson-practice__result"
          data-outcome={gold ? "gold" : mastered ? "complete" : "retry"}
          data-mastery={result.mastery}
          aria-live="polite"
        >
          <span className="micro-label">Practice complete</span>
          <p className="lesson-practice__score">
            {correctCount} <span>/ {PRACTICE_SET_SIZE} correct</span>
          </p>
          <p className="lesson-practice__verdict">
            {gold
              ? "Gold mastery: a perfect set."
              : mastered
                ? "Mastered. The building is finished."
                : `Not mastered yet: ${MASTERY_CORRECT_COUNT} of ${PRACTICE_SET_SIZE} needed.`}
          </p>
          {gold && presenter.enabled && (
            <span
              className="lesson-practice__mastery-stars"
              role="img"
              aria-label={`${nodeId} mastery, ${result.mastery} of ${result.mastery} gold stars`}
            >
              <span aria-hidden="true">★</span>
              <span aria-hidden="true">★</span>
              <span aria-hidden="true">★</span>
            </span>
          )}
          {!mastered && (
            <button type="button" className="primary-action" onClick={handlePracticeAgain}>
              Practice again
            </button>
          )}
        </section>
      </div>
    );
  }

  const isLastProblem = slot?.slot === PRACTICE_SET_SIZE - 1;
  const hintsTotal = frozen?.hints.length ?? 0;
  const hintsUsed = slot?.hints_used ?? 0;
  const hintsExhausted = hintsUsed >= hintsTotal;
  const crossSkillNote = getPracticeNpcNote(frozen?.template_id);
  const npcLine =
    uiPhase === "correct"
      ? isLastProblem
        ? "Nice! That's right. Great finish. Press Continue to see your results."
        : "Nice! That's right. On to the next one."
      : uiPhase === "revealed"
        ? "No worries. Here's the full solution. Try a fresh version to earn it, or move on."
        : uiPhase === "submitting"
          ? "Great work. Tallying up your set…"
          : hintsUsed > 0
            ? "Take a look at the hint and give it another go."
            : nodeId === "NUM.F"
              ? "Write each fraction answer in **lowest terms**: fully simplified. Take your time."
              : crossSkillNote
                ? crossSkillNote
                : "Give it your best shot. Take your time.";
  const npcMood: AdvisorMood =
    uiPhase === "correct" ? "happy" : uiPhase === "revealed" ? "encouraging" : "neutral";

  const freshCandidate =
    uiPhase === "revealed" && frozen !== undefined
      ? source.drawFresh(frozen.difficulty, shownIdsRef.current, frozen.template_id)
      : undefined;
  const freshAvailable =
    frozen !== undefined &&
    freshCandidate !== undefined &&
    isDistinctRetry(frozen, freshCandidate);

  return (
    <div className="advisor-lesson">
      <AdvisorNpc line={npcLine} mood={npcMood} />

      {slot && frozen && (
        <section
          className="lesson-practice"
          aria-labelledby="lesson-practice-prompt"
          data-node-id={nodeId}
          data-template-id={frozen.template_id}
        >
          <div className="lesson-practice__head">
            <span className="micro-label">
              Problem {slot.slot + 1} of {PRACTICE_SET_SIZE}
            </span>
            <DifficultyTag difficulty={frozen.difficulty} />
            {presenter.enabled && (
              <button
                type="button"
                className="city-action city-action-primary presenter-surface-action"
                disabled={uiPhase === "submitting"}
                onClick={() => {
                  void completeForPresenter()
                    .then(() =>
                      presenter.navigate({
                        preset: presenter.request?.preset ?? "bronze-city",
                        surface: "city",
                      }),
                    )
                    .catch((error: unknown) => {
                      console.error("Presenter practice completion failed.", error);
                      presenter.showReward("practice completion could not run");
                    });
                }}
              >
                {uiPhase === "submitting" ? "Completing practice…" : "Complete practice"}
              </button>
            )}
          </div>

          <div
            id="lesson-practice-prompt"
            className="lesson-practice__prompt lesson-player__prose"
          >
            <LessonProse markdown={frozen.prompt} />
          </div>

          <form className="lesson-player__row" onSubmit={handleSubmit}>
            <PracticeAnswer
              key={slot.instance.item_version_id}
              frozen={frozen}
              value={value}
              onChange={setValue}
              disabled={uiPhase !== "answering"}
              ariaInvalid={
                (feedback !== null || unreadable !== null) && uiPhase === "answering"
              }
              promptId="lesson-practice-prompt"
              placeholder={practicePlaceholder(
                frozen.answer.answer_spec,
                frozen.answer.allowed_symbols,
                frozen.answer.answer_key,
              )}
            />
            {uiPhase === "answering" && <button type="submit">Check</button>}
          </form>

          {hintsUsed > 0 && (
            <ol className="lesson-practice__hints" aria-label="Hints">
              {frozen.hints.slice(0, hintsUsed).map((hint) => (
                <li key={hint} className="lesson-practice__hint lesson-player__prose">
                  <LessonProse markdown={hint} />
                </li>
              ))}
            </ol>
          )}

          <UnreadableAnswerNote note={unreadable} />

          {feedback && (
            <p
              className="lesson-player__feedback"
              data-status={feedback.scored ? "incorrect" : undefined}
              aria-live="polite"
            >
              {feedback.message}
            </p>
          )}

          {uiPhase === "answering" && (
            <div className="lesson-practice__actions">
              {!hintsExhausted ? (
                <button
                  type="button"
                  className="advisor-npc__action advisor-npc__action--hint"
                  onClick={handleShowHint}
                >
                  <HintIcon />
                  Show hint{hintsTotal > 1 ? ` (${hintsUsed + 1} of ${hintsTotal})` : ""}
                </button>
              ) : (
                <button
                  type="button"
                  className="advisor-npc__action advisor-npc__action--reveal"
                  onClick={handleReveal}
                >
                  Reveal answer
                </button>
              )}
            </div>
          )}

          {uiPhase === "revealed" && (
            <WorkedSolution
              templateId={frozen.template_id}
              params={frozen.template_params}
              steps={frozen.worked_solution}
            />
          )}

          {uiPhase === "revealed" && (
            <WorkChecker
              association={{
                surface: "lesson-practice",
                node_id: node,
                item_version_id: slot.instance.item_version_id,
                template_id: frozen.template_id,
              }}
              store={workUploadStore}
              parseClient={workParseClient}
            />
          )}

          {(uiPhase === "correct" || uiPhase === "revealed") && (
            <div className="lesson-practice__actions">
              {uiPhase === "correct" && (
                <p className="lesson-player__feedback" data-status="correct">
                  Correct! Nice work.
                </p>
              )}
              {freshAvailable && (
                <button
                  type="button"
                  className="advisor-npc__action"
                  onClick={handleFreshVersion}
                >
                  Try a new version
                </button>
              )}
              <button
                type="button"
                className="advisor-npc__action advisor-npc__action--next"
                onClick={uiPhase === "revealed" ? handleMoveOn : handleContinue}
              >
                {uiPhase === "revealed" ? "Move on" : "Continue"}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
