import {
  buildCompletionReport,
  type CompletedWalkDiagnostic,
  type CompletionReport,
  type DiagnosticItem,
  type ReadinessMeasurement,
} from "@cr/diagnostic";
import { resolveEraCity } from "@cr/game";
import { type EraId, getEraOrThrow } from "@cr/skill-graph";
import type { AssessmentItemSubmission, UUID } from "@cr/state-schema";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AuthGate } from "../auth/AuthGate";
import { SessionProvider } from "../auth/SessionProvider";
import { useSession } from "../auth/session";
import {
  DIAGNOSTIC_CHECKER_VERSION,
  itemForVersion,
  promptForItem,
} from "../diagnostic/browserRuntime";
import {
  DiagnosticAnswer,
  type DiagnosticAnswerSubmission,
} from "../diagnostic/DiagnosticAnswer";
import { MathText } from "../diagnostic/MathText";
import {
  createDiagnosticClient,
  type DiagnosticClient,
  type DiagnosticRun,
} from "../diagnostic/session";
import { skillDisplayName } from "../diagnostic/skillNames";
import "./completionCeremony.css";
import { markCompletionCeremonyFinished } from "./completionState";

/**
 * THE GAME-COMPLETION CEREMONY — the retake, and what happens when its results come
 * back.
 *
 * Specified by `docs/superpowers/specs/2026-07-31-game-completion-ceremony-design.md`.
 * The lead's framing, which is what makes a ~57-item instrument bearable as an
 * ending, is adopted literally: **the diagnostic is the thing you DO, and the
 * ceremony is what happens when the results come back.** So this surface is not a
 * screen the learner watches after an exam — the exam is the last act, and the three
 * beats below are the invitation, the act, and its consequence.
 *
 * ## The prohibitions, and why they are structural here rather than remembered
 *
 * **D-END6** names four things the ceremony may not do, and it names them because
 * each one is reachable by a reasonable implementer. The worst is the first: a
 * `post` administration's `finalize()` still RETURNS `placement_by_node` — the guard
 * against a retake wrecking a city is at the WRITE boundary, not in the shape of the
 * value — and the function the pretest passes that field to,
 * `session.seedFromPlacement`, is not a merge but a **destructive full reset** of
 * node states, placements, roads, gold, crisis damage and the Town Hall. Called
 * after ten eras it deletes the playthrough, with every existing gate reporting
 * correct.
 *
 * This module's answer is not a comment saying "don't". It is that the ceremony
 * drives {@link DiagnosticClient} DIRECTLY rather than mounting `DiagnosticRunner`,
 * so the hand-off prop that carries placement into the city (`onPretestComplete`)
 * does not exist on this path to be passed; and that the only thing it reads off the
 * completed retake is {@link CompletionRetakeEvidence}, which has no placement in
 * it. `completionProhibitions.test.ts` holds the sweep that keeps it that way.
 *
 * The fourth prohibition is the quiet one: `unlockedNodeIdsFromPlacement` derives the
 * "You've unlocked N buildings" celebration from the same field, and after ten eras
 * there is nothing to unlock and the number would be a lie about buildings the
 * learner earned. Nothing here imports it.
 *
 * ## What the copy may claim
 *
 * **D-END11** — no validity claim, and the copy may not imply one. The three-field
 * gate is a structural match (same blueprint, same scoring model, counterbalanced
 * forms); it does not establish that the two forms are equally difficult, that the
 * item content is what the baseline was taken under, or that a per-node statement is
 * reliable. So every sentence here is scoped to *this check, today*, and the delta
 * is a line about the instrument rather than about the learner.
 *
 * **D-END5** — the fallback is never a broken growth ceremony and must never render a
 * machine status. Today's dev results screen prints *"Not comparable yet (not
 * comparable)"*, which is fine on a dev surface and unusable as the last thing a
 * learner sees after ten eras. {@link CompletionReport.standing_reason} carries which
 * of the five cases it is and this file never renders it.
 */

/** The three beats: the ask, the sitting, and the reading. */
type Beat = "invitation" | "retake" | "reading";

type AnswerEntry = DiagnosticAnswerSubmission;

export interface CompletionCeremonyProps {
  /** The era the city is standing in — era ten, by the time this can open. */
  eraId: EraId;
  /** Leave the ending. Fires for "not yet" and for closing the reading alike. */
  onExit: () => void;
  /**
   * The learner has been through the reading. The ending is once-only (D-END2), and
   * this is what tells the caller to write that down — on LEAVING the reading, not
   * on the retake finalizing, because an ending closed halfway through is an ending
   * the learner has not had.
   */
  onFinished?: () => void;
  /**
   * The diagnostic transport. Injected only by tests and the dev harness; the live
   * surface builds its own off the session, exactly as `DiagnosticRunner` does.
   */
  client?: DiagnosticClient;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** A coverage fraction in [0, 1] as a whole-number percent. */
function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function toSubmission(
  item: DiagnosticItem,
  administrationId: UUID,
  entry: AnswerEntry,
): AssessmentItemSubmission {
  return {
    administration_id: administrationId,
    item_version_id: item.item_version_id,
    node_id: item.node_id,
    raw_answer: entry.raw_answer,
    item_definition_hash: item.item_definition_hash,
    equivalence_checker_version: DIAGNOSTIC_CHECKER_VERSION,
    client_correct: entry.client_correct,
  };
}

/**
 * Node id -> the building that stands for it in this era's city.
 *
 * Total at era ten by construction: `resolveEraCity` returns one plot per roster
 * node and the roster is the ten eras' nodes accumulated, which `eras.test.ts` pins
 * as a partition of the 62 in-product nodes.
 *
 * **The name is the ARCHETYPE's**, and that is the whole of what the tree authors.
 * The design record imagines *"the Workshop, the Observatory, the Foundry"* — a
 * per-node building name — and there is no such field: `BuildingArchetypeDescriptor`
 * gives a shared label ("Numeric hall") that several nodes wear at once. Naming the
 * archetype is the true version of the sentence; inventing sixty-two proper nouns
 * here would be authoring content in a ceremony.
 *
 * **And it is a name, never a place.** D-END12/O-END4: the authenticated city read
 * persists no `placements` and no `town_hall`, so nothing here may claim WHERE a
 * building stands or point a camera at one.
 */
function buildingLabels(eraId: EraId): ReadonlyMap<string, string> {
  return new Map(
    resolveEraCity(eraId).plots.map((plot) => [plot.node_id, plot.archetype.label]),
  );
}

export function CompletionCeremony(props: CompletionCeremonyProps) {
  // Its own provider, on `DiagnosticSurface`'s precedent: the city is not inside
  // one, and the ceremony needs a student id to open an administration against.
  return (
    <SessionProvider>
      <CompletionCeremonyGate {...props} />
    </SessionProvider>
  );
}

function CompletionCeremonyGate(props: CompletionCeremonyProps) {
  const session = useSession();
  if (session.mode === "cognito" && session.status === "loading") {
    return (
      <CeremonyShell
        eraId={props.eraId}
        beat="invitation"
        title="The last age"
        onExit={props.onExit}
      >
        <p className="completion__lede" aria-live="polite" aria-busy="true">
          Checking your session…
        </p>
      </CeremonyShell>
    );
  }
  if (!session.studentId) {
    return (
      <CeremonyShell
        eraId={props.eraId}
        beat="invitation"
        title="The last age"
        onExit={props.onExit}
      >
        <AuthGate />
      </CeremonyShell>
    );
  }
  return <CompletionCeremonyRun key={session.studentId} {...props} />;
}

function CompletionCeremonyRun({
  eraId,
  onExit,
  onFinished,
  client: injectedClient,
}: CompletionCeremonyProps) {
  const session = useSession();
  const clientRef = useRef<DiagnosticClient | null>(injectedClient ?? null);
  if (clientRef.current === null) {
    clientRef.current = createDiagnosticClient({
      mode: session.mode,
      studentId: session.studentId as UUID,
      getAccessToken: session.getAccessToken,
    });
  }
  const client = clientRef.current;

  const runRef = useRef<DiagnosticRun | null>(null);
  const [beat, setBeat] = useState<Beat>("invitation");
  const [administrationId, setAdministrationId] = useState<UUID | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [item, setItem] = useState<DiagnosticItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<CompletionReport | null>(null);

  const labels = useMemo(() => buildingLabels(eraId), [eraId]);

  const startRetake = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      // `"post"` and never `"placement"`: `PLACEMENT_WRITING_PURPOSES` is
      // `{pre, placement}`, so choosing the latter for a retake would open BOTH
      // test-out write paths at once (D-END6).
      const run = client.begin("post");
      runRef.current = run;
      const served = await run.start();
      setAdministrationId(served.administrationId);
      setQuestionNumber(1);
      setItem(served.items[0] ?? null);
      setBeat("retake");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }, [client]);

  const submitAnswer = useCallback(
    async (entry: AnswerEntry) => {
      const run = runRef.current;
      if (!run || !administrationId || !item) {
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const advance = await run.submitStage([
          toSubmission(item, administrationId, entry),
        ]);
        if (!advance.complete) {
          setItem(advance.items[0] ?? null);
          setQuestionNumber((n) => n + 1);
          return;
        }
        // THE HAND-OFF THAT IS NOT MADE. A pretest finalizing here would seed the
        // city off `placement_by_node`; a retake finalizing takes the two evidence
        // fields it is entitled to and lets the rest of the value fall on the floor.
        const completed: CompletedWalkDiagnostic = await run.finalize();
        const measurement: ReadinessMeasurement | null = await client.measurement();
        setReport(
          buildCompletionReport({
            retake: {
              resolved: completed.resolved,
              robust_pass_node_ids: completed.robust_pass_node_ids,
              ceiling_reached: completed.ceiling_reached,
            },
            // A legacy θ pair is not this instrument and cannot denominate a
            // coverage claim, so it reads as no baseline rather than as a number.
            measurement: measurement?.model === "coverage" ? measurement.measurement : null,
          }),
        );
        setBeat("reading");
      } catch (caught) {
        setError(errorMessage(caught));
      } finally {
        setBusy(false);
      }
    },
    [administrationId, item, client],
  );

  const finish = useCallback(() => {
    markCompletionCeremonyFinished();
    onFinished?.();
    onExit();
  }, [onExit, onFinished]);

  return (
    <CeremonyShell
      eraId={eraId}
      beat={beat}
      title={ceremonyTitle(beat, report)}
      onExit={beat === "reading" ? finish : onExit}
    >
      {error && (
        <p className="completion__error" role="alert">
          {error}
        </p>
      )}

      {beat === "invitation" && (
        <Invitation busy={busy} onStart={startRetake} onLater={onExit} />
      )}

      {beat === "retake" && item && (
        <RetakeQuestion
          questionNumber={questionNumber}
          item={item}
          busy={busy}
          onSubmitAnswer={submitAnswer}
          onStepAway={onExit}
        />
      )}

      {beat === "reading" && report && (
        <Reading report={report} labels={labels} onClose={finish} />
      )}
    </CeremonyShell>
  );
}

/**
 * The dialog's name at each beat, and the heading a learner reads.
 *
 * Computed here rather than inside each beat because it is the SHELL's `aria-labelledby`
 * target: a heading that only some branches render is a dialog that only some branches
 * have a name for.
 */
function ceremonyTitle(beat: Beat, report: CompletionReport | null): string {
  if (beat === "retake") {
    return "The last check";
  }
  if (beat === "reading" && report) {
    return report.kind === "growth"
      ? "What you can do now that you could not."
      : "What still holds, cold.";
  }
  return "The city is finished.";
}

/** Focusable-element selector for the sheet's focus trap (the `HowToPlay` pattern). */
const COMPLETION_FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** The id the dialog is named by. Owned by the shell, so it is never dangling. */
const TITLE_ID = "completion-title";

/**
 * The frame: the house `coc-popup` / `coc-card` pair every other city overlay uses.
 *
 * **The scrim is deliberately translucent and the card deliberately bounded**, so
 * the city the learner spent ten ages building is visible around its own ending.
 * That is the one spatial claim this surface makes and it is what
 * `output/completion/*.png` was taken to show.
 *
 * ## The shell owns the heading, and that is a fix rather than a tidy-up
 *
 * `aria-labelledby` used to point at a heading each BEAT rendered. Three of the five
 * things this shell can contain have no heading of their own — the session-loading
 * state, the auth gate, and any beat that renders only an error — so on those the
 * dialog was labelled by an id that was not in the document and had no accessible
 * name at all. The id is right on every branch a developer looks at, which is exactly
 * why it survived: the branches that lose it are the ones nobody opens.
 *
 * ## Modality is a promise, and this is where it is kept
 *
 * `aria-modal="true"` tells assistive technology the rest of the page is not there.
 * Without a trap, Tab walks straight out into a city the screen reader has been told
 * is absent, which is worse than never claiming modality. Escape, the trap and the
 * focus hand-off below are the same three `HowToPlay`, `AchievementsPanel`, `Shop`,
 * `UnlockCelebration`, `BuildingUnlockedPopup` and `CrisisCallAdvisor` already do.
 */
function CeremonyShell({
  eraId,
  beat,
  title,
  onExit,
  children,
}: {
  eraId: EraId;
  beat: Beat;
  /** The dialog's accessible name, and its visible heading. Never absent. */
  title: string;
  onExit: () => void;
  children: React.ReactNode;
}) {
  const era = getEraOrThrow(eraId);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /**
   * Where focus was when the ending opened, so it can go back.
   *
   * Captured once, in a ref rather than state, because reading it during render
   * would see whatever the ending has since focused.
   */
  const openerRef = useRef<Element | null>(
    typeof document === "undefined" ? null : document.activeElement,
  );

  /**
   * Take focus on open and on every beat change — but only when it is not already
   * inside the sheet.
   *
   * The condition is what lets one mechanism serve three beats without fighting the
   * one that is already right. The retake's answer field claims focus from its own
   * callback ref as each question card mounts, which runs before this effect, so on
   * the way into the check this sees focus already inside and leaves it alone. On the
   * way OUT of the check the focused field has just unmounted, focus has fallen to
   * `<body>`, and this catches it: without that the learner's next Tab starts at the
   * top of the document, outside a dialog claiming to be modal.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: `beat` is the trigger, not a value read.
  useEffect(() => {
    const sheet = dialogRef.current;
    if (!sheet || sheet.contains(document.activeElement)) {
      return;
    }
    const anchor = sheet.querySelector<HTMLElement>("[data-beat-anchor]");
    (anchor ?? closeRef.current)?.focus();
  }, [beat]);

  /**
   * Give focus back on the way out.
   *
   * Two conditions, both earned. The opener must still be CONNECTED, because the
   * control that opened the ending is often one that closes with it (era ten's
   * progression hands over from its own last beat), and focusing a detached node
   * silently drops focus to `<body>` — the failure this is here to prevent. And focus
   * must currently be on `<body>`, so a caller with an opinion wins: `CitySurface`
   * sends focus to the ☰ Menu button, which is a better answer than the ceremony has,
   * and this must not overrule it.
   */
  useEffect(() => {
    return () => {
      const opener = openerRef.current;
      if (
        opener instanceof HTMLElement &&
        opener.isConnected &&
        document.activeElement === document.body
      ) {
        opener.focus();
      }
    };
  }, []);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      event.preventDefault();
      onExit();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const stops = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(COMPLETION_FOCUSABLE) ?? [],
    );
    if (stops.length === 0) {
      return;
    }
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div
      className="coc-popup completion"
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      data-testid="completion-ceremony"
      data-beat={beat}
      ref={dialogRef}
      onKeyDown={onKeyDown}
    >
      <div className="coc-card completion__card">
        {/* The house close affordance, glyph and all: the shared rule styles a `svg`
            child and a bare "x" character renders as a red disc with nothing in it. */}
        <button
          type="button"
          className="coc-card__close completion__close"
          onClick={onExit}
          aria-label="Close"
          ref={closeRef}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M7 7l10 10M17 7L7 17" />
          </svg>
        </button>
        {/* The scroll lives on a BODY inside the card rather than on the card, because
            `.coc-card`'s own note says overflow stays visible so the corner close can
            hang off the top-right edge. Scrolling the card clips it to a half disc. */}
        <div className="completion__body">
          <header className="completion__head">
            <span className="completion__eyebrow">The last age · the {era.name}</span>
            <h2 id={TITLE_ID}>{title}</h2>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}

function Invitation({
  busy,
  onStart,
  onLater,
}: {
  busy: boolean;
  onStart: () => void;
  onLater: () => void;
}) {
  return (
    <section className="completion__beat">
      <p className="completion__lede">
        Ten ages stand behind you. Before the lights go up there is one last thing, and it
        is the thing you did on your very first day here: a cold run at the foundations. No
        lessons, no hints, no second tries. Just what holds today.
      </p>
      {/*
        D-END9 rules the instrument is not shortened and the sitting is split instead,
        and D-ET14's exitable trial is the precedent. Saying so is what makes a long
        check sittable.

        WHAT THIS DELIBERATELY DOES NOT PROMISE is that the CHECK resumes where it was
        left. The walk is resumable by design (`WalkProgressStore` persists per
        administration, and an unfinalized administration reads `incomplete` and poisons
        nothing), but the offline client holds its progress in a per-instance `Map` that
        dies with this component, so on that path leaving restarts the check. "Pick it
        up where you left off" would therefore be false for every learner who is not
        server-backed. What is true on both paths is that the ENDING waits, because the
        once-only flag is written on leaving the reading and not before.
      */}
      <p className="completion__note">
        It is long, and nobody is timing you. Leave whenever you like: the ending will still
        be here when you come back.
      </p>
      <div className="completion__actions">
        {/* `data-beat-anchor` is where the shell parks focus when this beat opens. The
            primary action rather than the close button: a keyboard learner arriving at
            their own ending should land on the thing the ending is asking them to do. */}
        <button
          type="button"
          className="completion__btn completion__btn--primary"
          onClick={onStart}
          disabled={busy}
          data-beat-anchor
        >
          {busy ? "Opening…" : "Sit the last check"}
        </button>
        <button type="button" className="completion__btn" onClick={onLater}>
          Not yet
        </button>
      </div>
    </section>
  );
}

function RetakeQuestion({
  questionNumber,
  item,
  busy,
  onSubmitAnswer,
  onStepAway,
}: {
  questionNumber: number;
  item: DiagnosticItem;
  busy: boolean;
  onSubmitAnswer: (entry: AnswerEntry) => void;
  onStepAway: () => void;
}) {
  // Focus the field as each question mounts, on `DiagnosticRunner`'s pattern: a
  // callback ref on the re-keyed card, so it is tied to the DOM lifecycle. `input`
  // rather than a class hook, because the answer control is dispatched per shape and
  // the first text field is the answer on every one of them.
  const focusField = useCallback((node: HTMLDivElement | null) => {
    node?.querySelector<HTMLInputElement>("input[type='text']")?.focus();
  }, []);

  const frozen = itemForVersion(item.item_version_id);

  return (
    // A FRAGMENT, so the exit is a sibling of the question rather than its last child.
    // `position: sticky` is constrained by its containing block, and a sticky last
    // child of an auto-height section has no room inside that section to move: it
    // renders exactly like a static one and scrolls off. As a direct child of the
    // scroll well it pins.
    <>
      <section className="completion__beat completion__beat--work">
        {/* The skill and the question number both change under a field that keeps
            focus, so a learner who cannot see the card would otherwise be answering
            questions about an unannounced skill. Polite, so it never interrupts. */}
        <p className="completion__counter" aria-live="polite">
          Question {questionNumber} · {skillDisplayName(item.node_id)}
        </p>
        <div
          key={`${item.item_version_id}:${questionNumber}`}
          className="completion__item"
          data-item-version-id={item.item_version_id}
          ref={focusField}
        >
          {/* The skill is NOT repeated here. It moved up into the live counter, which
              is where it earns its place: the field keeps focus across questions, so
              without an announcement a learner who cannot see the card is answering
              about an unnamed skill. Printed in both, a screen reader says it twice
              and a sighted reader reads it twice on consecutive lines. */}
          <MathText prompt={promptForItem(item.item_version_id)} />
          {/* The SAME answer row the diagnostic uses, for the same reason: the final
              check now runs the widened scope, whose items include shapes one text
              field cannot submit at all (a rational answer is
              `{ expression, excluded_values }`) and several a bare field gives no
              notation cue for. See `diagnostic/DiagnosticAnswer.tsx`. */}
          {frozen ? (
            <DiagnosticAnswer
              frozen={frozen}
              disabled={busy}
              submitLabel={busy ? "Saving…" : "Submit answer"}
              onSubmit={onSubmitAnswer}
            />
          ) : (
            <p className="completion__note" role="alert">
              This question ({item.item_version_id}) is not in this build's item pack.
            </p>
          )}
        </div>
      </section>
      <button
        type="button"
        className="completion__btn completion__step-away"
        onClick={onStepAway}
      >
        Step away for now
      </button>
    </>
  );
}

/** One named skill and the building that stands for it. */
function SkillRoll({
  nodeIds,
  labels,
  testId,
}: {
  nodeIds: readonly string[];
  labels: ReadonlyMap<string, string>;
  testId: string;
}) {
  return (
    <ul className="completion__roll" data-testid={testId}>
      {nodeIds.map((nodeId) => (
        <li className="completion__roll-item" key={nodeId}>
          <span className="completion__roll-skill">{skillDisplayName(nodeId)}</span>
          {/* The building is a NAME and never a place (O-END4). */}
          <span className="completion__roll-building">
            {labels.get(nodeId) ?? "a building"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Reading({
  report,
  labels,
  onClose,
}: {
  report: CompletionReport;
  labels: ReadonlyMap<string, string>;
  onClose: () => void;
}) {
  const growth = report.kind === "growth";
  return (
    <section
      className="completion__beat completion__beat--reading"
      data-kind={report.kind}
      data-testid="completion-reading"
    >
      {report.named_node_ids.length > 0 ? (
        <>
          <p className="completion__lede">
            {growth
              ? "You sat down today with no lessons, no hints and no retries. These are the foundations the check found you holding that it did not find on your first day, and the buildings that stand on them."
              : "You sat down today with no lessons, no hints and no retries. These held, and so do the buildings that stand on them."}
          </p>
          <SkillRoll
            nodeIds={report.named_node_ids}
            labels={labels}
            testId="completion-named"
          />
        </>
      ) : (
        <p className="completion__lede" data-testid="completion-named-empty">
          {growth
            ? "Everything the check found you holding today, it found you holding on your first day here too. That is its own kind of ending. You came in able to do this, and ten ages later it is still true, cold."
            : "The check did not find a foundation it could confirm outright today. That is one cold sitting and not a verdict on ten ages: the city standing outside this window is the record of those."}
        </p>
      )}

      {/* D-END7: the aggregate is shown, small, and not suppressed. A ceremony that
          reports only the good half is the kind of thing that gets found later and read
          as a lie. It is a line about the instrument, never the headline. */}
      {report.coverage && (
        <p className="completion__aggregate" data-testid="completion-aggregate">
          Across the whole check, the map it covers went from{" "}
          {formatPercent(report.coverage.pre)} to {formatPercent(report.coverage.post)}.
        </p>
      )}

      {/* D-END8b: a skill mastered by practice and missed cold is UNCONFIRMED TODAY,
          never unmastered, and the door to its practice stays open. A single cold
          sitting has no standing to withdraw evidence the learner earned, and D-END8c
          keeps the building exactly as it is — stage, stars and all. */}
      {report.unconfirmed_node_ids.length > 0 && (
        <div className="completion__unconfirmed">
          <h3>Worth another look</h3>
          <p>
            These did not come out today. They are still yours: you did the work and the
            buildings are standing. A cold run is a different question from a practised one,
            and their doors are open whenever you want them.
          </p>
          <SkillRoll
            nodeIds={report.unconfirmed_node_ids}
            labels={labels}
            testId="completion-unconfirmed"
          />
        </div>
      )}

      {/* D-END11: what the check is, in the instrument's own terms, with no validity
          claim anywhere near it. */}
      <p className="completion__caveat">
        This is what one cold sitting found, on this check, today. It is not a grade, and it
        is not the measure of what you built here. That is outside the window.
      </p>

      <div className="completion__actions">
        {/* The focus anchor for this beat. The question card the learner was typing in
            has just unmounted, so without a hand-off focus falls to `<body>` and the
            next Tab starts outside a dialog that claims to be modal. */}
        <button
          type="button"
          className="completion__btn completion__btn--primary"
          onClick={onClose}
          data-beat-anchor
        >
          Back to the city
        </button>
      </div>
    </section>
  );
}
