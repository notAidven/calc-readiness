import { isInteractiveAnswerType } from "@cr/components";
import {
  type IslandUnlockExamState,
  initialIslandUnlockExamState,
  islandUnlockExamReducer,
} from "@cr/game";
import type { FrozenItem } from "@cr/item-bank";
import { type EraId, getEraOrThrow } from "@cr/skill-graph";
import {
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { EraHallMedallion } from "../archipelago/EraHallGlyph";
import { islandManifestEntry } from "../archipelago/islandManifest";
import {
  isNumericLiteral,
  isReducedFraction,
  NUMERIC_LITERAL_NOTE,
  normalizeTextSubmission,
  practicePlaceholder,
  REDUCED_FRACTION_NOTE,
  revealedAnswerLine,
} from "../lessons/answerFormat";
import { DifficultyTag } from "../lessons/DifficultyTag";
import { lessonByNode } from "../lessons/domains";
import {
  createInterleavedScheduler,
  type InterleavedScheduler,
} from "../lessons/infiniteScheduler";
import { PracticeAnswer, type PracticeAnswerValue } from "../lessons/PracticeAnswer";
import { checkerVersionForItem, practiceChecker } from "../lessons/practiceChecker";
import { LessonProse } from "../lessons/prose";
import { requiresNumericLiteral } from "../lessons/submitGuards";
import { UnreadableAnswerNote } from "../lessons/UnreadableAnswerNote";
import { unreadableAnswer } from "../lessons/unreadableAnswer";
import { WorkedSolution } from "../lessons/WorkedSolution";
import { type BrowserStorage, runtimeStorage } from "../storage/runtimeStorage";
import { useDeclareActiveIslandUnlock } from "./activeIslandUnlock";
import { nextEraId } from "./eraState";
import type {
  IslandFoundingAuthority,
  IslandUnlockExamResponse,
  IslandUnlockExamResponseOutcome,
  IslandUnlockExamResponseRequest,
} from "./islandUnlockAuthority";
import {
  ISLAND_UNLOCK_EXAM_SCHEMA_VERSION,
  type IslandUnlockExamRecord,
  type IslandUnlockResolvedOutcome,
  loadIslandUnlockExam,
  saveIslandUnlockExam,
} from "./islandUnlockExamPersistence";
import { islandUnlockExamPool } from "./islandUnlockExamPool";

import "./islandUnlockExam.css";

type AnswerPhase = "answering" | "correct" | "incorrect" | "skipped";
type FoundingStatus = "pending" | "failure" | "success";

const MODAL_FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export interface IslandUnlockExamProps {
  readonly eraId: EraId;
  readonly onUnlockIsland: (
    destination: EraId,
    authority: IslandFoundingAuthority,
  ) => void | Promise<void>;
  readonly onRecordResponse?: (
    destination: EraId,
    request: IslandUnlockExamResponseRequest,
  ) => Promise<IslandUnlockExamResponseOutcome>;
  readonly onSail: (destination: EraId) => void | Promise<void>;
  readonly onKeepLearning: () => void;
  readonly onExit: () => void;
  /** Persistent fallback when the invoking control is removed with its containing menu. */
  readonly returnFocusRef?: RefObject<HTMLElement | null>;
  readonly enableCanvas?: boolean;
  readonly reducedMotion?: boolean;
  /** Deterministic draw seam for tests. Production uses `Math.random`. */
  readonly rng?: () => number;
  /** Runtime-scoped storage seam. Omit for the exact-path-aware browser store. */
  readonly storage?: BrowserStorage | null;
  /** Pool seam used to prove missing-skill refusal and cross-era containment. */
  readonly poolSource?: readonly FrozenItem[];
}

interface ExamRuntime {
  readonly record: IslandUnlockExamRecord;
  readonly state: IslandUnlockExamState;
  readonly current: FrozenItem | null;
}

function isSafeFocusTarget(target: Element | null | undefined): target is HTMLElement {
  if (
    !(target instanceof HTMLElement) ||
    !target.isConnected ||
    target.matches(":disabled") ||
    target.getAttribute("aria-disabled") === "true" ||
    target.closest('[hidden], [inert], [aria-hidden="true"]') !== null
  ) {
    return false;
  }
  const style = window.getComputedStyle(target);
  return style.display !== "none" && style.visibility !== "hidden";
}

function stateFromRecord(record: IslandUnlockExamRecord): IslandUnlockExamState {
  return {
    era: record.eraId,
    score: record.score,
    target: record.target,
    last_delta: null,
    passed: record.phase !== "exam" || record.score >= record.target,
  };
}

function recordFor(
  state: IslandUnlockExamState,
  destinationEraId: EraId,
  phase: IslandUnlockExamRecord["phase"],
  current: FrozenItem | null,
  scheduler: InterleavedScheduler | null,
  sessionId: string,
  responseCount: number,
  pendingResponse: IslandUnlockExamRecord["pendingResponse"],
  resolvedOutcome: IslandUnlockResolvedOutcome = null,
): IslandUnlockExamRecord {
  return {
    version: ISLAND_UNLOCK_EXAM_SCHEMA_VERSION,
    eraId: state.era,
    destinationEraId,
    phase,
    score: state.score,
    target: state.target,
    currentItemVersionId: current?.item_version_id ?? null,
    scheduler: phase === "exam" ? (scheduler?.snapshot() ?? null) : null,
    resolvedOutcome,
    sessionId,
    responseCount,
    pendingResponse,
  };
}

function freshExamSessionId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `exam-${Date.now()}-${Math.random()}`;
}

function skillLabel(item: FrozenItem): string {
  return lessonByNode[item.node_id]?.title ?? item.node_id;
}

function cssColor(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

function destinationPalette(eraId: EraId): CSSProperties {
  const tones = islandManifestEntry(eraId).palette.tones;
  return {
    "--unlock-ground": cssColor(tones.ground),
    "--unlock-ground-pale": cssColor(tones.groundPale),
    "--unlock-shore": cssColor(tones.coarseSand),
    "--unlock-water": cssColor(tones.shallows),
    "--unlock-deep-water": cssColor(tones.deepWater),
    "--unlock-trunk": cssColor(tones.trunk),
  } as CSSProperties;
}

function VoyageProgress({
  score,
  target,
  destinationName,
}: {
  readonly score: number;
  readonly target: number;
  readonly destinationName: string;
}) {
  const reached = Math.min(score, target);
  const ports: React.ReactNode[] = [];
  for (let point = 1; point <= target; point += 1) {
    ports.push(
      <span
        key={`net-point-${point}`}
        className="island-unlock-route__port"
        data-reached={point <= reached ? "true" : "false"}
      />,
    );
  }
  return (
    <div
      className="island-unlock-route"
      data-testid="island-unlock-progress"
      role="progressbar"
      aria-label={`${reached} of ${target} net points toward ${destinationName}`}
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuenow={reached}
    >
      <span className="island-unlock-route__line" aria-hidden="true">
        <span
          className="island-unlock-route__sailed"
          style={{ width: `${(reached / target) * 100}%` }}
        />
      </span>
      <span className="island-unlock-route__ports" aria-hidden="true">
        {ports}
      </span>
    </div>
  );
}

function emptyAnswerNote(item: FrozenItem, value: PracticeAnswerValue): string | null {
  const spec = item.answer.answer_spec;
  if (spec.answer_type === "rational_answer") {
    const record = value !== null && typeof value === "object" ? value : {};
    const expression =
      typeof record.expression === "string" ? record.expression.trim() : "";
    const exclusions =
      typeof record.excluded_values === "string" ? record.excluded_values.trim() : "";
    return expression === "" || exclusions === ""
      ? "Complete both answer fields before checking."
      : null;
  }
  if (isInteractiveAnswerType(spec.answer_type)) {
    return value === null ? "Complete the answer before checking." : null;
  }
  if (typeof value !== "string" || value.trim() !== "") {
    return null;
  }
  return spec.simplification === "reduced_fraction" || spec.representation === "fraction"
    ? "Enter a fraction before checking. Use / between its numerator and denominator."
    : "Enter an answer before checking.";
}

function FoundingView({
  destination,
  reducedMotion,
  children,
  phase,
  status,
}: {
  readonly destination: EraId;
  readonly reducedMotion: boolean;
  readonly children: React.ReactNode;
  readonly phase: "reveal" | "choice";
  readonly status: FoundingStatus;
}) {
  const era = getEraOrThrow(destination);
  const heading =
    status === "pending"
      ? `Founding ${era.name}…`
      : status === "failure"
        ? "Founding paused"
        : `${era.name} island founded`;
  const eyebrow =
    status === "pending"
      ? "Preparing the new shore"
      : status === "failure"
        ? "Voyage held"
        : "Island unlocked";
  const hallLine =
    status === "pending"
      ? "Securing a place for the destination Town Hall"
      : status === "failure"
        ? `The ${era.name} shore is still waiting. Your unlock progress is safe.`
        : "Town Hall founded on the new shore";
  const landmarkLabel =
    status === "success"
      ? `${era.name} Town Hall, founded`
      : `${era.name} destination Town Hall`;
  return (
    <div
      className="island-unlock-founding"
      data-testid="island-unlock-founding"
      data-phase={phase}
      data-status={status}
      data-destination={destination}
      style={destinationPalette(destination)}
    >
      <div
        className="island-unlock-founding__world"
        data-reduced-motion={reducedMotion ? "true" : "false"}
        aria-hidden="true"
      >
        <span className="island-unlock-founding__wake" />
      </div>
      <div
        className="island-unlock-founding__landmark"
        role="img"
        aria-label={landmarkLabel}
        data-testid="destination-town-hall-visual"
      >
        <span className="island-unlock-founding__seal">
          <EraHallMedallion eraId={destination} />
        </span>
        <span>{era.name}</span>
        <strong>Town Hall</strong>
      </div>
      <section
        className="island-unlock-founding__card"
        aria-labelledby="island-founding-title"
      >
        <p className="island-unlock-eyebrow">{eyebrow}</p>
        <h2 id="island-founding-title">{heading}</h2>
        <p className="island-unlock-founding__hall" data-testid="destination-town-hall">
          {hallLine}
        </p>
        {children}
      </section>
    </div>
  );
}

export function IslandUnlockExam({
  eraId,
  onUnlockIsland,
  onRecordResponse,
  onSail,
  onKeepLearning,
  onExit,
  returnFocusRef,
  reducedMotion = false,
  rng = Math.random,
  storage,
  poolSource,
}: IslandUnlockExamProps) {
  const era = useMemo(() => getEraOrThrow(eraId), [eraId]);
  const destination = nextEraId(eraId);
  if (destination === null) {
    throw new Error(`The final era "${eraId}" has no next-island unlock exam.`);
  }
  const destinationEra = getEraOrThrow(destination);
  const pool = useMemo(() => islandUnlockExamPool(eraId, poolSource), [eraId, poolSource]);
  useDeclareActiveIslandUnlock(pool.status === "ready" ? eraId : null);
  const targetStorage = storage === undefined ? runtimeStorage() : storage;
  const schedulerRef = useRef<InterleavedScheduler | null>(null);

  const [runtime, setRuntime] = useState<ExamRuntime>(() => {
    const initial = initialIslandUnlockExamState(eraId);
    const saved = loadIslandUnlockExam(eraId, targetStorage);
    const sessionId = saved?.sessionId ?? freshExamSessionId();
    const responseCount = saved?.responseCount ?? 0;
    const pendingResponse = saved?.pendingResponse ?? null;
    if (pool.status !== "ready") {
      return {
        record: recordFor(
          initial,
          destination,
          "exam",
          null,
          null,
          sessionId,
          responseCount,
          pendingResponse,
        ),
        state: initial,
        current: null,
      };
    }
    const state = saved === null ? initial : stateFromRecord(saved);
    if (saved !== null && saved.phase !== "exam") {
      return { record: saved, state, current: null };
    }
    const scheduler = createInterleavedScheduler(
      pool.items,
      rng,
      saved?.scheduler ?? undefined,
    );
    schedulerRef.current = scheduler;
    const savedCurrent =
      saved?.currentItemVersionId === null || saved?.currentItemVersionId === undefined
        ? null
        : (pool.items.find((item) => item.item_version_id === saved.currentItemVersionId) ??
          null);
    const current = savedCurrent ?? scheduler.next();
    const record = recordFor(
      state,
      destination,
      "exam",
      current,
      scheduler,
      sessionId,
      responseCount,
      pendingResponse,
      saved?.resolvedOutcome ?? null,
    );
    saveIslandUnlockExam(record, targetStorage);
    return { record, state, current };
  });
  const [value, setValue] = useState<PracticeAnswerValue>("");
  const [answerPhase, setAnswerPhase] = useState<AnswerPhase>(() => {
    switch (runtime.record.resolvedOutcome) {
      case "correct":
        return "correct";
      case "wrong":
        return "incorrect";
      case "skip":
        return "skipped";
      default:
        return "answering";
    }
  });
  const [feedback, setFeedback] = useState<string | null>(() =>
    runtime.current !== null &&
    (runtime.record.resolvedOutcome === "wrong" ||
      runtime.record.resolvedOutcome === "skip")
      ? revealedAnswerLine(runtime.current)
      : null,
  );
  const [formatNote, setFormatNote] = useState<string | null>(null);
  const [unreadable, setUnreadable] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [unlockReady, setUnlockReady] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [foundingAttempt, setFoundingAttempt] = useState(0);
  const [sailing, setSailing] = useState(false);
  const [sailError, setSailError] = useState<string | null>(null);
  const unlocking = useRef<Promise<void> | null>(null);
  const sailingPromise = useRef<Promise<void> | null>(null);
  const attemptedPending = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const answerSummaryRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(
    typeof document === "undefined" ? null : document.activeElement,
  );

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const isolated: { readonly element: HTMLElement; readonly wasInert: boolean }[] = [];
    let branch: HTMLElement = dialog;
    let parent = branch.parentElement;
    while (parent) {
      for (const sibling of parent.children) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          isolated.push({ element: sibling, wasInert: sibling.inert });
          sibling.inert = true;
        }
      }
      branch = parent;
      parent = parent.parentElement;
    }
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      dialog.setAttribute("open", "");
    }
    return () => {
      for (const { element, wasInert } of isolated) {
        element.inert = wasInert;
      }
      if (dialog.open && typeof dialog.close === "function") {
        dialog.close();
      }
      const restoreFocus = () => {
        const returnTarget = [openerRef.current, returnFocusRef?.current].find(
          isSafeFocusTarget,
        );
        if (
          returnTarget &&
          (document.activeElement === document.body ||
            document.activeElement === dialog ||
            dialog.contains(document.activeElement))
        ) {
          returnTarget.focus();
        }
      };
      restoreFocus();
      queueMicrotask(restoreFocus);
    };
  }, [returnFocusRef]);

  useLayoutEffect(() => {
    if (answerPhase === "answering" || runtime.record.phase !== "exam") {
      return;
    }
    answerSummaryRef.current?.focus({ preventScroll: true });
  }, [answerPhase, runtime.record.phase]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: these state values deliberately retrigger the focus hand-off after rendered controls change.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.contains(document.activeElement)) {
      return;
    }
    dialog.querySelector<HTMLElement>(MODAL_FOCUSABLE)?.focus();
  }, [answerPhase, pool.status, runtime.record.phase, unlockError, unlockReady]);

  const handleModalKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (runtime.record.phase === "exam") {
        onExit();
      }
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const stops = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE) ?? [],
    );
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (!first || !last) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const modal = (children: React.ReactNode) => (
    <dialog
      ref={dialogRef}
      className="island-unlock-modal"
      aria-label={
        pool.status === "unavailable"
          ? "Island unlock exam unavailable"
          : runtime.record.phase === "exam"
            ? "Island unlock exam"
            : "Island founding"
      }
      onKeyDown={handleModalKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        if (runtime.record.phase === "exam") {
          onExit();
        }
      }}
    >
      {children}
    </dialog>
  );

  const persist = (
    state: IslandUnlockExamState,
    phase: IslandUnlockExamRecord["phase"],
    current: FrozenItem | null,
    resolvedOutcome: IslandUnlockResolvedOutcome = null,
    responseCount: number = runtime.record.responseCount,
    pendingResponse: IslandUnlockExamRecord["pendingResponse"] = runtime.record
      .pendingResponse,
  ): void => {
    const record = recordFor(
      state,
      destination,
      phase,
      current,
      schedulerRef.current,
      runtime.record.sessionId,
      responseCount,
      pendingResponse,
      resolvedOutcome,
    );
    saveIslandUnlockExam(record, targetStorage);
    setRuntime({ record, state, current });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: `foundingAttempt` is an explicit retry trigger.
  useEffect(() => {
    if (runtime.record.phase === "exam") {
      return;
    }
    if (unlocking.current === null) {
      unlocking.current = Promise.resolve(
        onUnlockIsland(destination, {
          source: "exam",
          sessionId: runtime.record.sessionId,
        }),
      );
    }
    let active = true;
    void unlocking.current.then(
      () => {
        if (active) {
          setUnlockReady(true);
          setUnlockError(null);
        }
      },
      (error: unknown) => {
        if (active) {
          setUnlockError(
            error instanceof Error
              ? error.message
              : "The destination could not be founded.",
          );
        }
        unlocking.current = null;
      },
    );
    return () => {
      active = false;
    };
  }, [
    destination,
    onUnlockIsland,
    runtime.record.phase,
    runtime.record.sessionId,
    foundingAttempt,
  ]);

  const completeAttempt = async (
    pending: NonNullable<IslandUnlockExamRecord["pendingResponse"]>,
  ): Promise<void> => {
    const current = runtime.current;
    if (
      current === null ||
      pending.sequence !== runtime.record.responseCount ||
      pending.response.itemVersionId !== current.item_version_id
    ) {
      setSubmissionError("This exam response no longer matches the current question.");
      return;
    }
    setSubmitting(true);
    setSubmissionError(null);
    try {
      const localCorrect =
        pending.response.outcome === "answer" &&
        practiceChecker({
          raw_answer: pending.response.rawAnswer,
          item_version_id: current.item_version_id,
          equivalence_checker_version: checkerVersionForItem(current),
        }).client_correct;
      const authoritative = onRecordResponse
        ? await onRecordResponse(destination, {
            sessionId: runtime.record.sessionId,
            ...pending,
          })
        : null;
      if (
        authoritative !== null &&
        (authoritative.target !== runtime.state.target ||
          authoritative.responseCount < pending.sequence + 1)
      ) {
        throw new Error("The account exam authority returned inconsistent progress.");
      }
      const nextState =
        authoritative === null
          ? islandUnlockExamReducer(runtime.state, {
              type:
                pending.response.outcome === "skip"
                  ? "skip"
                  : localCorrect
                    ? "correct"
                    : "wrong",
            })
          : {
              ...runtime.state,
              score: authoritative.score,
              target: authoritative.target,
              last_delta: authoritative.delta,
              passed: authoritative.passed,
            };
      const correct = nextState.last_delta === 1;
      const resolvedOutcome: Exclude<IslandUnlockResolvedOutcome, null> = correct
        ? "correct"
        : pending.response.outcome === "skip"
          ? "skip"
          : "wrong";
      setFeedback(correct ? null : revealedAnswerLine(current));
      setAnswerPhase(
        correct ? "correct" : pending.response.outcome === "skip" ? "skipped" : "incorrect",
      );
      attemptedPending.current = null;
      const responseCount =
        authoritative?.responseCount ?? runtime.record.responseCount + 1;
      if (nextState.passed) {
        persist(nextState, "reveal", null, null, responseCount, null);
      } else {
        persist(nextState, "exam", current, resolvedOutcome, responseCount, null);
      }
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "The exam response could not be recorded.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const beginAttempt = (response: IslandUnlockExamResponse): void => {
    if (
      runtime.current === null ||
      answerPhase !== "answering" ||
      submitting ||
      runtime.record.pendingResponse !== null
    ) {
      return;
    }
    const pending = {
      responseId: `${runtime.record.sessionId}-${runtime.record.responseCount}`,
      sequence: runtime.record.responseCount,
      response,
    };
    persist(runtime.state, "exam", runtime.current, null, pending.sequence, pending);
    attemptedPending.current = pending.responseId;
    void completeAttempt(pending);
  };

  // Resume the one bounded pending response after a refresh. A committed response replays by
  // response id; an uncommitted response is graded once. Either way history is never resent.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the persisted pending id is the trigger.
  useEffect(() => {
    const pending = runtime.record.pendingResponse;
    if (pending === null || attemptedPending.current === pending.responseId) {
      return;
    }
    attemptedPending.current = pending.responseId;
    void completeAttempt(pending);
  }, [runtime.record.pendingResponse]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const current = runtime.current;
    if (current === null || answerPhase !== "answering") {
      return;
    }
    const answerType = current.answer.answer_spec.answer_type;
    const interactive = isInteractiveAnswerType(answerType);
    const text = typeof value === "string" ? value : "";
    const emptyNote = emptyAnswerNote(current, value);
    if (emptyNote !== null) {
      setFormatNote(emptyNote);
      setUnreadable(null);
      return;
    }
    if (!interactive && requiresNumericLiteral(current) && !isNumericLiteral(text)) {
      setFormatNote(NUMERIC_LITERAL_NOTE);
      return;
    }
    if (
      !interactive &&
      current.answer.answer_spec.simplification === "reduced_fraction" &&
      isNumericLiteral(text) &&
      /\d+\s*\/\s*\d+/.test(text) &&
      !isReducedFraction(text)
    ) {
      setFormatNote(REDUCED_FRACTION_NOTE);
      return;
    }
    const rawAnswer = interactive ? value : normalizeTextSubmission(text, answerType);
    const outcome = practiceChecker({
      raw_answer: rawAnswer,
      item_version_id: current.item_version_id,
      equivalence_checker_version: checkerVersionForItem(current),
    });
    const unreadableNow = unreadableAnswer(outcome, interactive ? value : text, {
      allowedSymbols: current.answer.allowed_symbols,
      notationLine: practicePlaceholder(
        current.answer.answer_spec,
        current.answer.allowed_symbols,
        current.answer.answer_key,
      ),
    });
    if (unreadableNow) {
      setUnreadable(unreadableNow.message);
      setFormatNote(null);
      return;
    }
    setUnreadable(null);
    setFormatNote(null);
    beginAttempt({
      itemVersionId: current.item_version_id,
      outcome: "answer",
      rawAnswer,
    });
  };

  const skip = (): void => {
    const current = runtime.current;
    if (current === null || answerPhase !== "answering") {
      return;
    }
    beginAttempt({ itemVersionId: current.item_version_id, outcome: "skip" });
  };

  const nextQuestion = (): void => {
    const scheduler = schedulerRef.current;
    if (scheduler === null) {
      return;
    }
    const current = scheduler.next();
    setValue("");
    setFeedback(null);
    setFormatNote(null);
    setUnreadable(null);
    setAnswerPhase("answering");
    persist({ ...runtime.state, last_delta: null }, "exam", current);
  };

  const sail = (): void => {
    if (sailingPromise.current !== null) {
      return;
    }
    setSailing(true);
    setSailError(null);
    // `complete` still renders the choice on refresh, so a rejected durable landing remains
    // recoverable while a successful host callback is free to unmount this surface.
    persist(runtime.state, "complete", null);
    const operation = Promise.resolve(onSail(destination));
    sailingPromise.current = operation;
    void operation
      .then(
        () => {
          setSailError(null);
        },
        (error: unknown) => {
          setSailError(
            error instanceof Error ? error.message : "The island could not be reached.",
          );
        },
      )
      .finally(() => {
        if (sailingPromise.current === operation) {
          sailingPromise.current = null;
          setSailing(false);
        }
      });
  };

  if (pool.status === "unavailable") {
    return modal(
      <div className="island-unlock-exam">
        <section className="island-unlock-exam__card">
          <p className="island-unlock-eyebrow">Unlock exam unavailable</p>
          <h2>The {era.name} island stays as it is</h2>
          <p data-testid="island-unlock-pool-refusal">{pool.message}</p>
          <button type="button" onClick={onExit}>
            Keep learning here
          </button>
        </section>
      </div>,
    );
  }

  const visiblePhase =
    runtime.record.phase === "complete" ? "choice" : runtime.record.phase;
  if (visiblePhase === "reveal" || visiblePhase === "choice") {
    const foundingStatus: FoundingStatus = unlockError
      ? "failure"
      : unlockReady
        ? "success"
        : "pending";
    return modal(
      <FoundingView
        destination={destination}
        reducedMotion={reducedMotion}
        phase={visiblePhase}
        status={foundingStatus}
      >
        {unlockError ? (
          <>
            <p className="island-unlock-error" role="alert">
              {unlockError}
            </p>
            <button
              type="button"
              className="city-action city-action-primary"
              onClick={() => {
                setUnlockError(null);
                setUnlockReady(false);
                unlocking.current = null;
                setFoundingAttempt((attempt) => attempt + 1);
              }}
            >
              Retry founding
            </button>
          </>
        ) : !unlockReady ? (
          <p className="island-unlock-founding__pending" role="status">
            Saving the new island and its Town Hall…
          </p>
        ) : (
          <fieldset className="island-unlock-choice" data-testid="island-unlock-choice">
            <legend>Choose your next shore</legend>
            <p>
              You earned {runtime.state.target} net points. Sail now, or stay and keep
              learning here. The new island remains unlocked.
            </p>
            {sailError && (
              <p className="island-unlock-error" role="alert">
                {sailError}
              </p>
            )}
            <div className="island-unlock-choice__actions">
              <button
                type="button"
                className="city-action city-action-primary"
                onClick={sail}
                disabled={sailing}
              >
                {sailing ? "Saving voyage…" : `Sail to ${destinationEra.name}`}
              </button>
              <button
                type="button"
                className="city-action city-action-ghost"
                disabled={sailing}
                onClick={() => {
                  persist(runtime.state, "complete", null);
                  onKeepLearning();
                }}
              >
                Stay on {era.name}
              </button>
            </div>
          </fieldset>
        )}
      </FoundingView>,
    );
  }

  const current = runtime.current;
  if (current === null) {
    return null;
  }
  const delta = runtime.state.last_delta;
  const resolvedDelta =
    answerPhase === "correct"
      ? 1
      : answerPhase === "incorrect" || answerPhase === "skipped"
        ? -1
        : null;
  const answerSummary =
    resolvedDelta === null
      ? null
      : `${
          answerPhase === "correct"
            ? "Correct"
            : answerPhase === "skipped"
              ? "Skipped"
              : "Incorrect"
        } · ${resolvedDelta > 0 ? "+1" : "−1"} · ${runtime.state.score}/${runtime.state.target}`;
  const answerDescription = `island-unlock-prompt${
    formatNote === null ? "" : " island-unlock-answer-note"
  }`;
  return modal(
    <div
      className="island-unlock-exam"
      data-testid="island-unlock-exam"
      data-item-version-id={current.item_version_id}
      style={destinationPalette(destination)}
    >
      <section className="island-unlock-exam__card">
        <header className="island-unlock-exam__header">
          <div className="island-unlock-exam__journey">
            <span className="island-unlock-exam__destination" aria-hidden="true">
              <EraHallMedallion eraId={destination} />
            </span>
            <div className="island-unlock-exam__title">
              <p className="island-unlock-eyebrow">Voyage to {destinationEra.name}</p>
              <h2 id="island-unlock-title">
                {era.name} → {destinationEra.name}
              </h2>
            </div>
          </div>
          <div className="island-unlock-meter">
            <span className="island-unlock-meter__score" data-testid="island-unlock-score">
              {runtime.state.score}
            </span>
            <span aria-hidden="true"> / </span>
            <span>{runtime.state.target}</span>
            <span className="island-unlock-meter__label">net points</span>
            {delta !== null && (
              <span
                className="island-unlock-delta"
                data-testid="island-unlock-delta"
                data-delta={delta > 0 ? "positive" : "negative"}
              >
                {delta > 0 ? "+1" : "−1"}
              </span>
            )}
          </div>
          <div className="island-unlock-exam__contract">
            <p id="island-unlock-goal" data-testid="island-unlock-goal">
              Reach {runtime.state.target} net points to unlock {destinationEra.name}
            </p>
            <p data-testid="island-unlock-rules">Correct +1 · Wrong or Skip −1</p>
          </div>
          <VoyageProgress
            score={runtime.state.score}
            target={runtime.state.target}
            destinationName={destinationEra.name}
          />
        </header>

        <div className="island-unlock-exam__question">
          <div className="island-unlock-exam__meta">
            <span>{skillLabel(current)}</span>
            <DifficultyTag difficulty={current.difficulty} />
          </div>
          <div
            id="island-unlock-prompt"
            className="island-unlock-exam__prompt lesson-player__prose"
          >
            <LessonProse markdown={current.prompt} />
          </div>

          <form
            className="lesson-player__row island-unlock-exam__answer-form"
            onSubmit={handleSubmit}
          >
            <fieldset className="island-unlock-exam__answer-control">
              <legend id="island-unlock-answer-label">Answer</legend>
              <PracticeAnswer
                key={current.item_version_id}
                frozen={current}
                value={value}
                onChange={setValue}
                disabled={answerPhase !== "answering" || submitting}
                ariaInvalid={formatNote !== null}
                describedBy={answerDescription}
                promptId="island-unlock-prompt"
                answerLabelId="island-unlock-answer-label"
                placeholder={practicePlaceholder(
                  current.answer.answer_spec,
                  current.answer.allowed_symbols,
                  current.answer.answer_key,
                )}
              />
            </fieldset>
            {answerPhase === "answering" && (
              <button type="submit" disabled={submitting}>
                {submitting ? "Recording…" : "Check"}
              </button>
            )}
          </form>
        </div>

        <UnreadableAnswerNote note={unreadable} />
        {formatNote && (
          <p
            id="island-unlock-answer-note"
            className="island-unlock-note"
            aria-live="polite"
          >
            <LessonProse markdown={formatNote} />
          </p>
        )}
        {answerSummary && (
          <div
            ref={answerSummaryRef}
            className="island-unlock-answer-summary"
            data-testid="island-unlock-answer-summary"
            data-outcome={answerPhase}
            role="status"
            aria-live="polite"
            tabIndex={-1}
          >
            {answerSummary}
          </div>
        )}
        {feedback && (
          <div
            className="lesson-player__feedback lesson-player__prose"
            data-status="incorrect"
          >
            <LessonProse markdown={feedback} />
          </div>
        )}
        {submissionError && (
          <div className="island-unlock-error" role="alert">
            <p>{submissionError}</p>
            {runtime.record.pendingResponse && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  const pending = runtime.record.pendingResponse;
                  if (pending) {
                    attemptedPending.current = pending.responseId;
                    void completeAttempt(pending);
                  }
                }}
              >
                Retry response
              </button>
            )}
          </div>
        )}

        <div className="island-unlock-exam__actions">
          {answerPhase === "answering" ? (
            <>
              <button
                type="button"
                className="city-action city-action-ghost"
                onClick={skip}
                disabled={submitting || runtime.record.pendingResponse !== null}
              >
                Skip (−1)
              </button>
              <button type="button" className="island-unlock-exit" onClick={onExit}>
                Back to island · progress saved
              </button>
            </>
          ) : (
            <button
              type="button"
              className="city-action city-action-primary"
              onClick={nextQuestion}
            >
              Next question
            </button>
          )}
        </div>
        {(answerPhase === "incorrect" || answerPhase === "skipped") && (
          <WorkedSolution
            templateId={current.template_id}
            params={current.template_params}
            steps={current.worked_solution}
          />
        )}
      </section>
    </div>,
  );
}
