import {
  PLAGUE,
  PLAGUE_ERA,
  type PlagueAction,
  type PlagueNodeId,
  type PlagueState,
  plagueAvailableActions,
  plagueNodeViews,
  plaguePendingIntervention,
  plagueRouteViews,
} from "@cr/game";
import type { FrozenItem } from "@cr/item-bank";
import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { eraMaterialSfx, playSfx } from "../audio/soundEffects";
import { useDeclareActiveCrisis } from "../city/activeCrisis";
import { defaultDevStorage, readDevUserKey } from "../devPersistence/devSession";
import { practicePlaceholder, revealedAnswerLine } from "../lessons/answerFormat";
import { PracticeAnswer, type PracticeAnswerValue } from "../lessons/PracticeAnswer";
import { LessonProse } from "../lessons/prose";
import { UnreadableAnswerNote } from "../lessons/UnreadableAnswerNote";
import { WorkedSolution } from "../lessons/WorkedSolution";
import {
  gradePlagueAnswer,
  loadPlagueEligibleNodes,
  plagueBatchForCycle,
  plagueDrawSetFromIds,
  plagueFrozenItem,
} from "./plagueItems";
import { createLocalPlagueSession, type PlagueSession } from "./plaguePersistence";

import "./plague.css";

interface Feedback {
  readonly frozen: FrozenItem;
  readonly correct: boolean;
  readonly question: number;
}

export interface PlagueSurfaceProps {
  readonly session?: PlagueSession;
  readonly readMasteredNodes?: () => readonly string[];
  readonly nodeLabels?: Readonly<Partial<Record<PlagueNodeId, string>>>;
  readonly onStateChange?: (state: PlagueState | null) => void;
  readonly onExit?: () => void;
}

function localSession(): PlagueSession {
  const storage = defaultDevStorage();
  if (storage === null) {
    const memory = new Map<string, string>();
    return createLocalPlagueSession({
      storage: {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => memory.set(key, value),
        removeItem: (key) => memory.delete(key),
      },
      userKey: "memory",
    });
  }
  return createLocalPlagueSession({ storage, userKey: readDevUserKey(storage) });
}

export function PlagueSurface({
  session: suppliedSession,
  readMasteredNodes = loadPlagueEligibleNodes,
  nodeLabels = {},
  onStateChange,
  onExit = () => undefined,
}: PlagueSurfaceProps = {}): ReactElement {
  useDeclareActiveCrisis(PLAGUE_ERA);
  const session = useMemo(() => suppliedSession ?? localSession(), [suppliedSession]);
  const [state, setState] = useState<PlagueState | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<PracticeAnswerValue>(null);
  const [unreadable, setUnreadable] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const feedbackButton = useRef<HTMLButtonElement | null>(null);
  const firstActionButton = useRef<HTMLButtonElement | null>(null);
  const shell = useRef<HTMLElement | null>(null);
  const mounted = useRef(true);

  const publish = useCallback(
    (next: PlagueState | null) => {
      setState(next);
      onStateChange?.(next);
    },
    [onStateChange],
  );

  useEffect(() => {
    mounted.current = true;
    setBusy(true);
    void session.start().then(
      (loaded) => {
        if (mounted.current) {
          publish(loaded);
          setBusy(false);
        }
      },
      (reason: unknown) => {
        if (mounted.current) {
          setError(
            reason instanceof Error
              ? reason.message
              : "The Plague response could not open.",
          );
          setBusy(false);
        }
      },
    );
    return () => {
      mounted.current = false;
      onStateChange?.(null);
    };
  }, [session, publish, onStateChange]);

  useEffect(() => {
    if (feedback !== null) {
      feedbackButton.current?.focus();
    } else if (state?.phase === "choosing") {
      firstActionButton.current?.focus();
    } else if (state?.phase === "answering") {
      shell.current
        ?.querySelector<HTMLElement>(".pl-care-answer input, .pl-care-answer button")
        ?.focus();
    } else if (state?.phase === "resolved") {
      shell.current?.querySelector<HTMLElement>('[data-testid="pl-advance"]')?.focus();
    } else if (state?.phase === "ended") {
      shell.current
        ?.querySelector<HTMLElement>(".pl-care-conclusion .pl-care-primary")
        ?.focus();
    }
  }, [state?.phase, feedback]);

  const mastered = useMemo(() => {
    const draw = plagueDrawSetFromIds(readMasteredNodes());
    return draw.nodeIds;
  }, [readMasteredNodes]);

  const labelFor = useCallback(
    (nodeId: PlagueNodeId): string =>
      nodeLabels[nodeId] ??
      plagueNodeViews(state ?? createFallbackState()).find((node) => node.id === nodeId)
        ?.label ??
      nodeId,
    [nodeLabels, state],
  );

  async function dispatch(
    event: Parameters<PlagueSession["dispatch"]>[0],
  ): Promise<PlagueState | null> {
    setBusy(true);
    setError(null);
    try {
      const next = await session.dispatch(event);
      if (mounted.current) {
        publish(next);
      }
      return next;
    } catch (reason) {
      if (mounted.current) {
        setError(reason instanceof Error ? reason.message : "That change was not saved.");
      }
      return null;
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  async function choose(action: PlagueAction): Promise<void> {
    if (state === null || state.phase !== "choosing" || busy) {
      return;
    }
    const batch = plagueBatchForCycle({
      masteredNodeIds: mastered,
      encounter: state.encounter,
      cycle: state.round,
    });
    if (batch.status !== "ready") {
      setError(batch.message);
      return;
    }
    const next = await dispatch({
      type: "choose_action",
      action,
      question_ids: batch.prompts.map((prompt) => prompt.item_version_id),
      expected_revision: state.revision,
    });
    if (next !== null && next !== state) {
      playSfx(eraMaterialSfx("crisis-commit", PLAGUE_ERA));
    }
  }

  async function checkAnswer(): Promise<void> {
    if (
      state === null ||
      state.phase !== "answering" ||
      answer === null ||
      feedback !== null ||
      busy
    ) {
      return;
    }
    const questionId = state.question_ids[state.answers.length];
    const frozen = questionId ? plagueFrozenItem(questionId) : undefined;
    if (!questionId || !frozen) {
      setError("This saved question is no longer available.");
      return;
    }
    const graded = gradePlagueAnswer(questionId, answer);
    if (graded.correct === null) {
      setUnreadable(graded.unreadable);
      return;
    }
    const question = state.answers.length + 1;
    const next = await dispatch({
      type: "answer",
      question_id: questionId,
      correct: graded.correct,
      expected_revision: state.revision,
    });
    if (next !== null) {
      setUnreadable(null);
      setFeedback({ frozen, correct: graded.correct, question });
    }
  }

  function continueAfterFeedback(): void {
    setFeedback(null);
    setAnswer(null);
    setUnreadable(null);
  }

  async function advanceNight(): Promise<void> {
    if (state === null || state.phase !== "resolved" || busy) {
      return;
    }
    await dispatch({ type: "advance", expected_revision: state.revision });
  }

  async function restart(): Promise<void> {
    if (state === null || busy) {
      return;
    }
    const next = await dispatch({
      type: "restart",
      expected_revision: state.revision,
    });
    if (next !== null) {
      setFeedback(null);
      setAnswer(null);
      setUnreadable(null);
    }
  }

  if (busy && state === null) {
    return (
      <section className="pl-care-shell pl-care-shell--loading" aria-live="polite">
        Mapping the town routes…
      </section>
    );
  }
  if (state === null) {
    return (
      <section className="pl-care-shell pl-care-shell--error" role="alert">
        <p>{error ?? "The Plague response could not open."}</p>
        <button type="button" className="pl-care-primary" onClick={onExit}>
          Return to my city
        </button>
      </section>
    );
  }

  const currentId =
    state.phase === "answering" ? state.question_ids[state.answers.length] : undefined;
  const current = currentId ? plagueFrozenItem(currentId) : undefined;

  return (
    <section
      ref={shell}
      className="pl-care-shell"
      data-testid="pl-care-house"
      data-phase={state.phase}
      data-round={state.round}
      aria-labelledby="pl-care-title"
    >
      <header className="pl-care-header">
        <div>
          <span className="pl-care-eyebrow">Era 6 crisis</span>
          <h1 id="pl-care-title">The Plague</h1>
        </div>
        <button type="button" className="pl-care-return" onClick={onExit}>
          Return to my city
        </button>
      </header>

      <CareHouseStatus state={state} />

      <div className="pl-care-layout">
        <div className="pl-care-rail">
          <NetworkPanel state={state} labelFor={labelFor} />
          {error && (
            <p className="pl-care-error" role="alert">
              {error}
            </p>
          )}

          {feedback !== null ? (
            <FeedbackPanel
              feedback={feedback}
              state={state}
              onContinue={continueAfterFeedback}
              buttonRef={feedbackButton}
            />
          ) : state.phase === "choosing" ? (
            <ActionPanel
              state={state}
              busy={busy}
              labelFor={labelFor}
              onChoose={choose}
              firstActionRef={firstActionButton}
            />
          ) : state.phase === "answering" && current ? (
            <QuestionPanel
              state={state}
              frozen={current}
              answer={answer}
              unreadable={unreadable}
              busy={busy}
              onAnswer={setAnswer}
              onCheck={checkAnswer}
            />
          ) : state.phase === "resolved" ? (
            <ResolvedPanel
              state={state}
              busy={busy}
              labelFor={labelFor}
              onAdvance={advanceNight}
            />
          ) : state.phase === "ended" && state.outcome ? (
            <ConclusionPanel
              state={state}
              onExit={onExit}
              onRestart={restart}
              busy={busy}
            />
          ) : null}
        </div>
      </div>

      <p className="visually-hidden" aria-live="polite" data-testid="pl-care-live">
        {changeAnnouncement(state, labelFor)}
      </p>
    </section>
  );
}

function createFallbackState(): PlagueState {
  return {
    version: 2,
    era: PLAGUE_ERA,
    encounter: 1,
    round: 1,
    phase: "choosing",
    nodes: [
      { id: "care-house", infected: false, care_strength: 0 },
      { id: "market", infected: true, care_strength: 0 },
      { id: "printworks", infected: false, care_strength: 0 },
      { id: "chapel", infected: false, care_strength: 0 },
      { id: "guildhall", infected: false, care_strength: 0 },
    ],
    routes: [
      { id: "market-care", quarantine_rounds: 0, carried_last_night: false },
      { id: "market-printworks", quarantine_rounds: 0, carried_last_night: false },
      { id: "printworks-chapel", quarantine_rounds: 0, carried_last_night: false },
      { id: "chapel-guildhall", quarantine_rounds: 0, carried_last_night: false },
      { id: "care-guildhall", quarantine_rounds: 0, carried_last_night: false },
    ],
    action: null,
    question_ids: [],
    answers: [],
    log: [],
    outcome: null,
    revision: 0,
  };
}

function CareHouseStatus({ state }: { readonly state: PlagueState }): ReactElement {
  const nodes = plagueNodeViews(state);
  const routes = plagueRouteViews(state);
  const infected = nodes.filter((node) => node.status === "infected").length;
  const exposed = nodes.filter((node) => node.status === "exposed").length;
  const risk = routes.filter((route) => route.at_risk).length;
  return (
    <div className="pl-care-status" role="status" aria-label="Plague containment status">
      <span>
        Night <strong>{state.round}</strong> of {PLAGUE.rounds}
      </span>
      <span data-testid="pl-infected">
        Infected <strong>{infected}</strong>
      </span>
      <span data-testid="pl-exposed">
        Exposed <strong>{exposed}</strong>
      </span>
      <span className="pl-care-threat" data-testid="pl-threat">
        Live routes <strong>{risk}</strong>
      </span>
    </div>
  );
}

function NetworkPanel({
  state,
  labelFor,
}: {
  readonly state: PlagueState;
  readonly labelFor: (nodeId: PlagueNodeId) => string;
}): ReactElement {
  const nodes = plagueNodeViews(state);
  const routes = plagueRouteViews(state);
  return (
    <section className="pl-network" aria-labelledby="pl-network-title">
      <div className="pl-network__heading">
        <span className="pl-care-step">The live city</span>
        <h2 id="pl-network-title">Where infection can move</h2>
      </div>
      <ul className="pl-network__nodes" aria-label="Building states">
        {nodes.map((node) => (
          <li key={node.id} data-status={node.status}>
            <span className="pl-network__mark" aria-hidden="true" />
            <strong>{labelFor(node.id)}</strong>
            <span>
              {node.status === "cared"
                ? `Cared for, strength ${node.care_strength}`
                : node.status}
            </span>
          </li>
        ))}
      </ul>
      <ul className="pl-network__routes" aria-label="Town routes">
        {routes.map((route) => (
          <li
            key={route.id}
            data-status={route.status}
            data-risk={route.at_risk}
            data-testid={`pl-route-${route.id}`}
          >
            <span aria-hidden="true" className="pl-route-line" />
            <span>
              {labelFor(route.from)} to {labelFor(route.to)}
            </span>
            <strong>
              {route.quarantine_rounds > 0
                ? `Closed ${route.quarantine_rounds}`
                : route.carried_last_night
                  ? "Carried last night"
                  : route.at_risk
                    ? "Exposed"
                    : "Open"}
            </strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function actionDescription(
  action: PlagueAction,
  labelFor: (nodeId: PlagueNodeId) => string,
): { readonly title: string; readonly body: string } {
  if (action.kind === "care") {
    return {
      title: `Send care to ${labelFor(action.node_id)}`,
      body: "A linen station blocks one crossing per strength.",
    };
  }
  const route = plagueRouteViews(createFallbackState()).find(
    (entry) => entry.id === action.route_id,
  );
  return {
    title: route
      ? `Quarantine ${labelFor(route.from)} to ${labelFor(route.to)}`
      : "Quarantine this route",
    body: "A barrier closes this connection for one to three nights.",
  };
}

function ActionPanel({
  state,
  busy,
  labelFor,
  onChoose,
  firstActionRef,
}: {
  readonly state: PlagueState;
  readonly busy: boolean;
  readonly labelFor: (nodeId: PlagueNodeId) => string;
  readonly onChoose: (action: PlagueAction) => void;
  readonly firstActionRef: { current: HTMLButtonElement | null };
}): ReactElement {
  const available = plagueAvailableActions(state);
  const actions = [
    available.find((action) => action.kind === "quarantine"),
    available.find((action) => action.kind === "care"),
  ].filter((action): action is PlagueAction => action !== undefined);
  return (
    <section className="pl-care-panel" aria-labelledby="pl-action-title">
      <span className="pl-care-step">Night {state.round}</span>
      <h2 id="pl-action-title">Choose one intervention</h2>
      <p className="pl-care-lead">Commit now. Three answers set how strongly it holds.</p>
      <div className="pl-care-actions">
        {actions.map((action, index) => {
          const description = actionDescription(action, labelFor);
          const key =
            action.kind === "care" ? `care:${action.node_id}` : `route:${action.route_id}`;
          return (
            <button
              type="button"
              ref={index === 0 ? firstActionRef : undefined}
              key={key}
              data-kind={action.kind}
              data-testid={
                action.kind === "care"
                  ? `pl-action-care-${action.node_id}`
                  : `pl-action-quarantine-${action.route_id}`
              }
              disabled={busy}
              onClick={() => onChoose(action)}
            >
              <span className="pl-care-action-icon" aria-hidden="true">
                {action.kind === "care" ? "▥" : "━"}
              </span>
              <strong>{description.title}</strong>
              <span>{description.body}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function QuestionPanel({
  state,
  frozen,
  answer,
  unreadable,
  busy,
  onAnswer,
  onCheck,
}: {
  readonly state: PlagueState;
  readonly frozen: FrozenItem;
  readonly answer: PracticeAnswerValue;
  readonly unreadable: string | null;
  readonly busy: boolean;
  readonly onAnswer: (value: PracticeAnswerValue) => void;
  readonly onCheck: () => void;
}): ReactElement {
  const number = state.answers.length + 1;
  const pending = plaguePendingIntervention(state);
  return (
    <section className="pl-care-panel" aria-labelledby="pl-question-title">
      <span className="pl-care-step">
        {state.action?.kind === "care" ? "Care" : "Quarantine"} · question {number} of{" "}
        {PLAGUE.batch_size}
      </span>
      <h2 id="pl-question-title">Make this one count</h2>
      <div className="pl-answer-register" role="status" aria-label="Intervention strength">
        {Array.from({ length: PLAGUE.batch_size }, (_, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed three-place answer register
            key={index}
            data-result={
              state.answers[index] === undefined
                ? "waiting"
                : state.answers[index]
                  ? "right"
                  : "miss"
            }
          />
        ))}
        <strong>{pending?.strength ?? 1} night strength</strong>
      </div>
      <div id="pl-question-prompt" className="pl-care-question lesson-player__prose">
        <LessonProse markdown={frozen.prompt} />
      </div>
      <form
        className="pl-care-answer lesson-player__row"
        onSubmit={(event) => {
          event.preventDefault();
          void onCheck();
        }}
      >
        <PracticeAnswer
          key={frozen.item_version_id}
          frozen={frozen}
          value={answer}
          onChange={onAnswer}
          disabled={busy}
          promptId="pl-question-prompt"
          placeholder={practicePlaceholder(
            frozen.answer.answer_spec,
            frozen.answer.allowed_symbols,
            frozen.answer.answer_key,
          )}
        />
        <button
          type="submit"
          className="pl-care-primary"
          disabled={answer === null || busy}
        >
          Check answer
        </button>
      </form>
      <UnreadableAnswerNote note={unreadable} />
    </section>
  );
}

function FeedbackPanel({
  feedback,
  state,
  onContinue,
  buttonRef,
}: {
  readonly feedback: Feedback;
  readonly state: PlagueState;
  readonly onContinue: () => void;
  readonly buttonRef: { current: HTMLButtonElement | null };
}): ReactElement {
  const pending = plaguePendingIntervention(state);
  return (
    <section
      className="pl-care-panel pl-care-feedback"
      data-result={feedback.correct ? "correct" : "incorrect"}
      data-testid={`pl-feedback-${feedback.correct ? "correct" : "incorrect"}`}
      aria-labelledby="pl-feedback-title"
    >
      <span className="pl-care-step">Question {feedback.question} result</span>
      <h2 id="pl-feedback-title">{feedback.correct ? "Right." : "Not this time."}</h2>
      <p className="pl-care-consequence">
        {feedback.correct
          ? `The intervention now holds at strength ${pending?.strength ?? 1}.`
          : `The intervention still lands at strength ${pending?.strength ?? 1}.`}
      </p>
      <div className="pl-care-solution lesson-player__prose">
        <LessonProse markdown={revealedAnswerLine(feedback.frozen)} />
        <WorkedSolution
          templateId={feedback.frozen.template_id}
          params={feedback.frozen.template_params}
          steps={feedback.frozen.worked_solution}
        />
      </div>
      <button
        type="button"
        className="pl-care-primary"
        ref={buttonRef}
        onClick={onContinue}
      >
        {state.phase === "resolved" ? "See the intervention" : "Next question"}
      </button>
    </section>
  );
}

function ResolvedPanel({
  state,
  busy,
  labelFor,
  onAdvance,
}: {
  readonly state: PlagueState;
  readonly busy: boolean;
  readonly labelFor: (nodeId: PlagueNodeId) => string;
  readonly onAdvance: () => void;
}): ReactElement {
  const pending = plaguePendingIntervention(state);
  const description =
    state.action === null ? null : actionDescription(state.action, labelFor);
  return (
    <section className="pl-care-panel pl-care-resolved" aria-labelledby="pl-resolved-title">
      <span className="pl-care-step">Intervention committed</span>
      <h2 id="pl-resolved-title">{description?.title ?? "The intervention is in place"}</h2>
      <p>
        Strength <strong>{pending?.strength ?? 1}</strong>. The barrier or care station is
        visible on the city now.
      </p>
      <p className="pl-care-lead">
        Infection has not moved yet. Advance only when you have read the routes.
      </p>
      <button
        type="button"
        className="pl-care-primary"
        data-testid="pl-advance"
        disabled={busy}
        onClick={onAdvance}
      >
        Let the night pass
      </button>
    </section>
  );
}

function ConclusionPanel({
  state,
  onExit,
  onRestart,
  busy,
}: {
  readonly state: PlagueState;
  readonly onExit: () => void;
  readonly onRestart: () => void;
  readonly busy: boolean;
}): ReactElement {
  const outcome = state.outcome;
  if (outcome === null) {
    throw new Error("An ended Plague encounter needs an outcome.");
  }
  return (
    <section
      className="pl-care-panel pl-care-conclusion"
      data-testid="pl-conclusion"
      data-verdict={outcome.verdict}
      aria-labelledby="pl-conclusion-title"
    >
      <span className="pl-care-step">The town reopens</span>
      <h2 id="pl-conclusion-title">
        {outcome.verdict === "contained"
          ? "The outbreak is contained."
          : "Containment failed."}
      </h2>
      <p>
        <strong>{outcome.affected}</strong> of 5 places were infected.{" "}
        <strong>{outcome.clear}</strong> remained clear.
      </p>
      <p>
        You answered {outcome.correct} of {outcome.asked} correctly.
      </p>
      <p className="pl-carryback">
        Temporary barriers and care stations clear now. Your buildings and learning progress
        are unchanged.
      </p>
      <button type="button" className="pl-care-primary" onClick={onExit}>
        Return to my city
      </button>
      <button
        type="button"
        className="pl-care-secondary"
        disabled={busy}
        onClick={onRestart}
      >
        Replay the outbreak
      </button>
    </section>
  );
}

function changeAnnouncement(
  state: PlagueState,
  labelFor: (nodeId: PlagueNodeId) => string,
): string {
  if (state.phase === "ended" && state.outcome) {
    return state.outcome.verdict === "contained"
      ? `The outbreak is contained. ${state.outcome.affected} places were infected.`
      : `Containment failed. ${state.outcome.affected} places were infected.`;
  }
  if (state.phase === "resolved") {
    const pending = plaguePendingIntervention(state);
    return `The intervention is committed at strength ${pending?.strength ?? 1}. Infection has not moved yet.`;
  }
  if (state.phase === "answering" && state.answers.length > 0) {
    const latest = state.answers[state.answers.length - 1];
    return latest
      ? `Answer recorded. Intervention strength ${plaguePendingIntervention(state)?.strength ?? 1}.`
      : `Answer recorded. The intervention still has strength ${plaguePendingIntervention(state)?.strength ?? 1}.`;
  }
  const last = state.log[state.log.length - 1];
  if (last) {
    const infected =
      last.newly_infected.length > 0
        ? ` Infection reached ${last.newly_infected.map(labelFor).join(" and ")}.`
        : " Infection reached no new building.";
    const protectedLine =
      last.protected_node_ids.length > 0
        ? ` Care protected ${last.protected_node_ids.map(labelFor).join(" and ")}.`
        : "";
    return `${infected}${protectedLine}`.trim();
  }
  const nodes = plagueNodeViews(state);
  return `${nodes.filter((node) => node.status === "infected").length} place is infected and ${nodes.filter((node) => node.status === "exposed").length} are exposed.`;
}
