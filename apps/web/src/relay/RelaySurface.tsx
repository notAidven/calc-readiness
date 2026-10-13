import {
  createRelay,
  RELAY,
  type RelayAction,
  type RelayState,
  relayActionRefusal,
  relayProjection,
  relayReducer,
  relayResultLine,
} from "@cr/game";
import {
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { eraMaterialSfx, playSfx } from "../audio/soundEffects";
import { useDeclareActiveCrisis } from "../city/activeCrisis";
import { placementLabel } from "../city/townHall";
import {
  gradeIntrusionAnswer,
  type IntrusionDrawSet,
  intrusionBatchForCheck,
  intrusionDrawSetFromIds,
  intrusionFrozenItem,
  loadIntrusionDrawSet,
} from "../intrusion/intrusionItems";
import { practicePlaceholder, revealedAnswerLine } from "../lessons/answerFormat";
import { playCorrectChime } from "../lessons/lessonSound";
import { PracticeAnswer, type PracticeAnswerValue } from "../lessons/PracticeAnswer";
import { LessonProse } from "../lessons/prose";
import { UnreadableAnswerNote } from "../lessons/UnreadableAnswerNote";
import { WorkedSolution } from "../lessons/WorkedSolution";
import { RelayDiagram } from "./RelayDiagram";
import {
  type RelayAnswerFeedback,
  type RelayCityView,
  relayCityView,
} from "./relayCityView";

import "./relay.css";

const BAND_IDS = [
  "band-1",
  "band-2",
  "band-3",
  "band-4",
  "band-5",
  "band-6",
  "band-7",
  "band-8",
  "band-9",
] as const;
const INTRUSION_TARGET_NAMES: Readonly<Record<string, string>> = {
  "EL.1": "Data Centre",
  "EL.2": "Office Tower",
  "EL.3": "Chip Factory",
  "EL.4": "Research Lab",
  "EL.5": "Glass Apartments",
  "EL.6": "Air Force Base",
};

function intrusionTargetName(nodeId: string): string {
  return INTRUSION_TARGET_NAMES[nodeId] ?? placementLabel(nodeId);
}

/**
 * A refresh cannot retain a half-entered answer, so resume at the committed intervention.
 * No reducer event is replayed and no world state moves; the learner starts that batch again.
 */
export function resumableRelayState(state: RelayState): RelayState {
  return state.phase === "answering" && state.armed !== null
    ? { ...state, phase: "armed" }
    : state;
}

export interface RelaySurfaceProps {
  readonly initialState?: RelayState;
  readonly readDrawSet?: () => IntrusionDrawSet;
  readonly practisedNodeIds?: readonly string[];
  /** Authoritative checker seam; production uses the shared crisis grader. */
  readonly gradeAnswer?: typeof gradeIntrusionAnswer;
  readonly onStateChange?: (state: RelayState) => void;
  /** Real placement ids in the exact route order drawn by the city renderer. */
  readonly cityTargetIds?: readonly string[];
  /** Per-answer physical lock feedback, published before the batch resolves. */
  readonly onFeedbackChange?: (feedback: RelayAnswerFeedback) => void;
  /** Persist the final scar before returning to the city. Zero means no scar. */
  readonly onCarryRecord?: (bandsDark: number) => Promise<unknown>;
  readonly onVerificationComplete?: (
    correct: number,
    bandsDark: number,
  ) => Promise<unknown>;
  readonly onExit?: () => void;
  /** The actual city remains visible through this slot on the in-city production mount. */
  readonly illustration?: ReactNode;
  readonly embedded?: boolean;
  /** Frame/test seam for a state whose result has already resolved. */
  readonly focusResultOnMount?: boolean;
}

export function RelaySurface({
  initialState,
  readDrawSet = loadIntrusionDrawSet,
  practisedNodeIds,
  gradeAnswer = gradeIntrusionAnswer,
  onStateChange,
  cityTargetIds = [],
  onFeedbackChange,
  onCarryRecord,
  onVerificationComplete,
  onExit,
  illustration,
  embedded = false,
  focusResultOnMount = false,
}: RelaySurfaceProps = {}): ReactElement {
  useDeclareActiveCrisis("information_age");
  const [relay, setRelay] = useState<RelayState>(() =>
    resumableRelayState(initialState ?? createRelay()),
  );
  const drawSet = useMemo(
    () =>
      practisedNodeIds === undefined
        ? readDrawSet()
        : intrusionDrawSetFromIds(practisedNodeIds),
    [practisedNodeIds, readDrawSet],
  );
  const [batch, setBatch] = useState<ReturnType<typeof intrusionBatchForCheck> | null>(
    null,
  );
  const [questionMode, setQuestionMode] = useState<"round" | "verification" | null>(null);
  const [verdicts, setVerdicts] = useState<readonly boolean[]>([]);
  const [answer, setAnswer] = useState<PracticeAnswerValue>(null);
  const [shown, setShown] = useState<boolean | null>(null);
  const [unreadable, setUnreadable] = useState<string | null>(null);
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const [verifiedDark, setVerifiedDark] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [inspectedRound, setInspectedRound] = useState<number | null>(null);
  const actionRefs = useRef(new Map<RelayAction, HTMLButtonElement>());
  const resultRef = useRef<HTMLParagraphElement | null>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const focusResultRef = useRef(focusResultOnMount);
  const leavingRef = useRef(false);

  const dark = verifiedDark ?? relay.dark;
  const lastRound = relay.rounds.at(-1) ?? null;
  const result = lastRound === null ? "" : relayResultLine(lastRound);
  const cityFeedback = useMemo<RelayAnswerFeedback>(() => {
    const visible = shown === null ? verdicts : [...verdicts, shown];
    return { answered: visible.length, verdicts: visible };
  }, [shown, verdicts]);
  const cityView = useMemo(
    () => relayCityView(relay, cityTargetIds, cityFeedback),
    [cityFeedback, cityTargetIds, relay],
  );
  const activeTarget =
    cityView.activeTargetId === null
      ? "the Civic Archive Relay"
      : intrusionTargetName(cityView.activeTargetId);

  useEffect(() => {
    onStateChange?.(relay);
  }, [onStateChange, relay]);

  useEffect(() => {
    onFeedbackChange?.(cityFeedback);
  }, [cityFeedback, onFeedbackChange]);

  useEffect(() => {
    if (focusResultRef.current && result.length > 0) {
      focusResultRef.current = false;
      resultRef.current?.focus();
    }
  }, [result]);

  function arm(action: RelayAction): void {
    setRelay((state) => relayReducer(state, { type: "arm", action }));
  }

  function cancel(): void {
    const action = relay.armed;
    setRelay((state) => relayReducer(state, { type: "disarm" }));
    window.setTimeout(() => {
      if (action) {
        actionRefs.current.get(action)?.focus();
      }
    }, 0);
  }

  function beginQuestions(): void {
    if (relay.phase !== "armed" || relay.armed === null) {
      return;
    }
    setBatch(
      intrusionBatchForCheck({
        drawFrom: drawSet.nodeIds,
        encounter: 1,
        check: relay.round,
      }),
    );
    setQuestionMode("round");
    resetQuestion();
    setRelay((state) => relayReducer(state, { type: "start_questions" }));
    playSfx(eraMaterialSfx("crisis-commit", "information_age"));
    window.setTimeout(() => questionHeadingRef.current?.focus(), 0);
  }

  function beginVerification(): void {
    setBatch(
      intrusionBatchForCheck({
        drawFrom: drawSet.nodeIds,
        encounter: 1,
        check: RELAY.rounds + 1,
      }),
    );
    setQuestionMode("verification");
    resetQuestion();
    window.setTimeout(() => questionHeadingRef.current?.focus(), 0);
  }

  function resetQuestion(): void {
    setVerdicts([]);
    setAnswer(null);
    setShown(null);
    setUnreadable(null);
  }

  function submitAnswer(): void {
    if (batch === null || batch.status !== "ready" || answer === null) {
      return;
    }
    const prompt = batch.prompts[verdicts.length];
    if (!prompt) {
      return;
    }
    const graded = gradeAnswer(prompt.item_version_id, answer);
    if (graded.correct === null) {
      setUnreadable(graded.unreadable);
      return;
    }
    setUnreadable(null);
    setShown(graded.correct);
    if (graded.correct) {
      playCorrectChime();
    } else {
      playSfx("answer-missed");
    }
  }

  function nextQuestion(): void {
    if (shown === null || batch === null || batch.status !== "ready") {
      return;
    }
    const landed = [...verdicts, shown];
    if (landed.length < batch.prompts.length) {
      setVerdicts(landed);
      setAnswer(null);
      setShown(null);
      setUnreadable(null);
      return;
    }

    const correct = landed.filter(Boolean).length;
    if (questionMode === "verification") {
      const after = Math.max(
        0,
        relay.dark - correct * RELAY.verification_bands_per_correct,
      );
      setVerifiedDark(after);
      setVerificationAttempted(true);
      void onVerificationComplete?.(correct, after);
    } else {
      focusResultRef.current = true;
      setRelay((state) =>
        relayReducer(state, {
          type: "resolve_round",
          correct,
          asked: batch.prompts.length,
        }),
      );
    }
    setBatch(null);
    setQuestionMode(null);
    resetQuestion();
  }

  async function leave(): Promise<void> {
    if (leavingRef.current) {
      return;
    }
    leavingRef.current = true;
    setLeaving(true);
    try {
      await onCarryRecord?.(dark);
      onExit?.();
    } finally {
      leavingRef.current = false;
      setLeaving(false);
    }
  }

  const defaultIllustration = (
    <RelayDiagram
      dark={dark}
      shuttersClosed={relay.shutters_closed}
      copy={relay.copy}
      proposal={relay.phase === "armed" ? relay.armed : null}
    />
  );

  return (
    <main
      className={`relay-surface${embedded ? " relay-surface--embedded" : ""}`}
      data-testid="relay-surface"
      data-phase={relay.phase}
    >
      <p className="relay-cap" aria-live="assertive">
        {relay.dark === RELAY.bands && relay.phase !== "settled"
          ? `The record is dark. ${RELAY.rounds - relay.round + 1} round remains to stop the trace.`
          : ""}
      </p>

      <div className="relay-layout">
        <section className="relay-city" aria-label="The city and its Civic Archive Relay">
          {illustration === undefined ? defaultIllustration : illustration}
        </section>

        <aside className="relay-rail" aria-label="Intrusion instrument">
          <header className="relay-masthead">
            <div>
              <p className="relay-eyebrow">Information Age · live trace</p>
              <h1>The Intrusion</h1>
            </div>
            <p className="relay-round" data-testid="relay-round">
              {relay.round}/{RELAY.rounds}
            </p>
            {onExit && relay.phase !== "settled" && (
              <button type="button" className="relay-exit" onClick={onExit}>
                Leave
              </button>
            )}
          </header>

          {cityTargetIds.length > 0 && <CityEvidence view={cityView} />}
          <RecordMeter dark={dark} />

          <section className="relay-instrument__facts" aria-label="Crisis resources">
            <span>
              Clean copy: <strong>{relay.copy === "ready" ? "ready" : "used"}</strong>
            </span>
            <span>
              Covers: <strong>{relay.shutters_closed}/3</strong>
            </span>
          </section>

          {questionMode !== null && batch !== null ? (
            <QuestionPanel
              batch={batch}
              declared={
                questionMode === "verification"
                  ? "You are verifying the record."
                  : relay.armed === "restore"
                    ? `Restoring the route at ${activeTarget}.`
                    : `Isolating the intake at ${activeTarget}.`
              }
              verdicts={verdicts}
              answer={answer}
              shown={shown}
              unreadable={unreadable}
              headingRef={questionHeadingRef}
              onAnswer={setAnswer}
              onSubmit={submitAnswer}
              onNext={nextQuestion}
            />
          ) : relay.phase === "settled" ? (
            <Ending
              dark={dark}
              verificationAttempted={verificationAttempted}
              onVerify={beginVerification}
              onLeave={() => void leave()}
              leaving={leaving}
            />
          ) : (
            <>
              {relay.phase === "deciding" && (
                <p
                  className="relay-result"
                  data-testid="relay-result"
                  aria-live="polite"
                  tabIndex={-1}
                  ref={resultRef}
                >
                  {result}
                </p>
              )}

              {relay.phase === "deciding" && inspectedRound !== relay.round && (
                <section className="relay-inspect" data-testid="relay-inspect-step">
                  <p className="relay-step">1 · Trace found</p>
                  <h2>{activeTarget}</h2>
                  <p>
                    Open this service trace. Then choose how to stop what is moving through
                    it.
                  </p>
                  <button
                    type="button"
                    className="primary-action"
                    data-testid="relay-inspect"
                    onClick={() => setInspectedRound(relay.round)}
                  >
                    Inspect this trace
                  </button>
                </section>
              )}
              {relay.phase === "deciding" && inspectedRound === relay.round && (
                <ActionCards
                  relay={relay}
                  targetLabel={activeTarget}
                  refs={actionRefs}
                  onArm={arm}
                />
              )}
              {relay.phase === "armed" && relay.armed !== null && (
                <ArmedPanel
                  relay={relay}
                  action={relay.armed}
                  targetLabel={activeTarget}
                  onCommit={beginQuestions}
                  onCancel={cancel}
                />
              )}
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

function CityEvidence({ view }: { readonly view: RelayCityView }): ReactElement {
  const active = view.activeTargetId
    ? intrusionTargetName(view.activeTargetId)
    : "the relay";
  const held = view.answerLocks.filter((lock) => lock === "held").length;
  const gaps = view.answerLocks.filter((lock) => lock === "gap").length;
  return (
    <section
      className="relay-city-evidence"
      data-testid="relay-city-evidence"
      aria-live="polite"
      aria-label={`Trace at ${active}. ${view.staleCount} old readings. ${view.coveredCount} covers closed. ${held} held and ${gaps} gaps in this answer set.`}
    >
      <p className="relay-city-evidence__signal">
        <span aria-hidden="true">⌁</span>
        <span>
          Trace at <strong>{active}</strong>
        </span>
      </p>
      <p>
        {view.staleCount > 0
          ? `${view.staleCount} old reading${view.staleCount === 1 ? "" : "s"}`
          : "Reading is current"}{" "}
        · {held} held · {gaps} gap{gaps === 1 ? "" : "s"}
      </p>
      <ol className="visually-hidden" aria-label="Trace route through the city">
        {view.targets.map((target) => (
          <li key={target.nodeId} data-state={target.active ? "active" : target.evidence}>
            <span>{intrusionTargetName(target.nodeId)}</span>
            <strong>
              {target.active
                ? "Trace here"
                : target.cover === "closed"
                  ? `${target.coverStrength} covers closed`
                  : target.cover === "proposed"
                    ? "Isolation preview"
                    : target.evidence === "stale"
                      ? "Old reading"
                      : "Unread"}
            </strong>
          </li>
        ))}
      </ol>
    </section>
  );
}

function RecordMeter({ dark }: { readonly dark: number }): ReactElement {
  return (
    <section
      className="relay-meter"
      data-testid="relay-meter"
      aria-label={`${dark} of the record's nine bands have been overwritten. ${RELAY.bands - dark} are still standing.`}
    >
      <div className="relay-meter__heading">
        <span>PUBLIC RECORD</span>
        <strong>{dark} of 9</strong>
      </div>
      <div className="relay-meter__cells" aria-hidden="true">
        {BAND_IDS.map((id, index) => (
          <span
            key={id}
            className="relay-meter__cell"
            data-state={index < dark ? "taken" : "standing"}
            data-testid="relay-band"
          >
            <i />
          </span>
        ))}
      </div>
      <p>{RELAY.bands - dark} trusted</p>
    </section>
  );
}

function ActionCards({
  relay,
  targetLabel,
  refs,
  onArm,
}: {
  readonly relay: RelayState;
  readonly targetLabel: string;
  readonly refs: MutableRefObject<Map<RelayAction, HTMLButtonElement>>;
  readonly onArm: (action: RelayAction) => void;
}): ReactElement {
  return (
    <section className="relay-actions" aria-labelledby="relay-actions-title">
      <p className="relay-step">2 · Choose intervention</p>
      <h2 id="relay-actions-title">{targetLabel}</h2>
      {(["cut", "restore"] as const).map((action) => {
        const refusal =
          relay.phase === "deciding"
            ? relayActionRefusal(relay, action)
            : action === "restore" && relay.copy === "spent"
              ? `You restored from it in round ${relay.copy_spent_in_round}. There was one.`
              : null;
        const reasonId = `relay-${action}-reason`;
        const pressed = relay.armed === action;
        return (
          <article
            key={action}
            className="relay-action"
            data-chosen={pressed ? "true" : "false"}
            data-testid="relay-action"
          >
            <button
              type="button"
              data-action={action}
              aria-pressed={pressed}
              aria-describedby={refusal ? reasonId : undefined}
              disabled={
                refusal !== null ||
                relay.phase === "answering" ||
                (relay.phase === "armed" && !pressed)
              }
              ref={(node) => {
                if (node) {
                  refs.current.set(action, node);
                }
              }}
              onClick={() => onArm(action)}
            >
              {action === "cut" ? "Isolate this intake" : "Restore this route"}
            </button>
            {refusal ? (
              <p id={reasonId}>{refusal}</p>
            ) : action === "cut" ? (
              <p>Each right closes one cover here. Any gap pushes the trace onward.</p>
            ) : (
              <p>Use the clean copy now. It restores bands, then reopens every cover.</p>
            )}
          </article>
        );
      })}
    </section>
  );
}

function ArmedPanel({
  relay,
  action,
  targetLabel,
  onCommit,
  onCancel,
}: {
  readonly relay: RelayState;
  readonly action: RelayAction;
  readonly targetLabel: string;
  readonly onCommit: () => void;
  readonly onCancel: () => void;
}): ReactElement {
  const missed = relayProjection(relay, action, 0);
  const held = relayProjection(relay, action, 3);
  return (
    <section className="relay-armed" data-testid="relay-armed">
      <p className="relay-step">3 · Answer to act</p>
      <h2>{action === "cut" ? `Isolate ${targetLabel}` : `Restore at ${targetLabel}`}</h2>
      <p>
        {action === "cut"
          ? "Three answers close physical covers on this intake."
          : "Three answers drive the clean copy back through this route."}
      </p>
      <ul className="relay-outcomes">
        <li>
          <strong>All three hold:</strong>{" "}
          {action === "cut"
            ? `${held.shutters_closed} covers closed; ${held.bands_through === 0 ? "the trace stops here" : `${held.bands_through} bands get through`}.`
            : `${held.bands_written} bands restored; ${held.bands_through === 0 ? "the trace stops" : "the trace moves"}; covers reopen.`}
        </li>
        <li>
          <strong>No holds:</strong>{" "}
          {action === "cut"
            ? `${missed.bands_through} bands get through and the trace moves.`
            : `${missed.bands_written} band restored; ${missed.bands_through} get through; covers reopen.`}
        </li>
      </ul>
      <div className="relay-commit">
        <button
          type="button"
          className="primary-action"
          data-testid="relay-commit"
          onClick={onCommit}
          aria-label={`${action === "cut" ? `Isolate ${targetLabel}` : `Restore at ${targetLabel}`}. Three questions, then the city changes.`}
        >
          Start 3 questions
        </button>
        <button type="button" data-testid="relay-cancel" onClick={onCancel}>
          Not this one
        </button>
      </div>
    </section>
  );
}

function Ending({
  dark,
  verificationAttempted,
  onVerify,
  onLeave,
  leaving,
}: {
  readonly dark: number;
  readonly verificationAttempted: boolean;
  readonly onVerify: () => void;
  readonly onLeave: () => void;
  readonly leaving: boolean;
}): ReactElement {
  const whole = dark === 0;
  return (
    <section
      className="relay-ending"
      data-testid="relay-ending"
      data-ending={whole ? "best" : "partial"}
    >
      <p className="relay-ending__eyebrow">
        {whole ? "Systems restored" : "Trace isolated"}
      </p>
      <h2>{whole ? "The city's record is whole" : `${dark} bands still need repair`}</h2>
      <p>
        {whole
          ? "The service covers close. The route goes quiet, and every building comes back online."
          : `The route is quiet. ${dark} crossed bands stay on the relay so the city remembers where the breach landed.`}
      </p>
      <button
        type="button"
        className="primary-action relay-return"
        onClick={onLeave}
        disabled={leaving}
      >
        {leaving ? "Saving the record…" : "Return to my city"}
      </button>
      {!whole && !verificationAttempted && (
        <button
          type="button"
          className="relay-verify"
          onClick={onVerify}
          aria-label="Verify the record. Three questions. One band comes back for each one you get right. One attempt, and leaving it costs nothing."
        >
          Verify the record
        </button>
      )}
    </section>
  );
}

function QuestionPanel({
  batch,
  declared,
  verdicts,
  answer,
  shown,
  unreadable,
  headingRef,
  onAnswer,
  onSubmit,
  onNext,
}: {
  readonly batch: ReturnType<typeof intrusionBatchForCheck>;
  readonly declared: string;
  readonly verdicts: readonly boolean[];
  readonly answer: PracticeAnswerValue;
  readonly shown: boolean | null;
  readonly unreadable: string | null;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly onAnswer: (answer: PracticeAnswerValue) => void;
  readonly onSubmit: () => void;
  readonly onNext: () => void;
}): ReactElement {
  if (batch.status === "unavailable") {
    return (
      <section className="relay-question" data-testid="relay-question">
        <h2 ref={headingRef} tabIndex={-1}>
          No questions to ask
        </h2>
        <p>{batch.message}</p>
      </section>
    );
  }
  const prompt = batch.prompts[verdicts.length];
  const frozen = prompt ? intrusionFrozenItem(prompt.item_version_id) : undefined;
  return (
    <section className="relay-question" data-testid="relay-question">
      <h2 ref={headingRef} tabIndex={-1}>
        Question {verdicts.length + 1} of {batch.prompts.length}
      </h2>
      <p className="relay-declared">{declared}</p>
      {prompt && frozen && (
        <>
          <div id="relay-question-prompt" className="lesson-player__prose">
            <LessonProse markdown={frozen.prompt} />
          </div>
          <form
            className="lesson-player__row"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <PracticeAnswer
              key={prompt.item_version_id}
              frozen={frozen}
              value={answer}
              onChange={onAnswer}
              disabled={shown !== null}
              promptId="relay-question-prompt"
              placeholder={practicePlaceholder(
                frozen.answer.answer_spec,
                frozen.answer.allowed_symbols,
                frozen.answer.answer_key,
              )}
            />
            {shown === null && (
              <button
                type="submit"
                disabled={answer === null}
                data-testid="relay-check-answer"
              >
                Check
              </button>
            )}
          </form>
          <UnreadableAnswerNote note={unreadable} />
          {shown !== null && (
            <>
              <p
                className="relay-verdict"
                data-status={shown ? "correct" : "incorrect"}
                aria-live="polite"
              >
                {shown ? "Right" : "Not this time"}
              </p>
              <div className="relay-solution">
                <h3>How this one works</h3>
                <div className="lesson-player__prose">
                  <LessonProse markdown={revealedAnswerLine(frozen)} />
                </div>
                <WorkedSolution
                  templateId={frozen.template_id}
                  params={frozen.template_params}
                  steps={frozen.worked_solution}
                />
              </div>
              <button type="button" className="primary-action" onClick={onNext}>
                {verdicts.length + 1 >= batch.prompts.length
                  ? "See what got through"
                  : "Next question"}
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}
