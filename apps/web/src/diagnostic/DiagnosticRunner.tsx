import type {
  CompletedWalkDiagnostic,
  DiagnosticItem,
  NodeResolution,
  ReadinessMeasurement,
} from "@cr/diagnostic";
import { neighborhoodLabel } from "@cr/game";
import {
  canonicalRawAnswer,
  DIAGNOSTIC_WALK_SCOPE,
  wellFormedWrongRawAnswer,
} from "@cr/item-bank";
import { type DomainId, getEraOrderedNodes, getNodeOrThrow } from "@cr/skill-graph";
import type { AssessmentItemSubmission, PlacementEstimate, UUID } from "@cr/state-schema";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { AuthGate } from "../auth/AuthGate";
import { type SessionMode, useSession } from "../auth/session";
import {
  DIAGNOSTIC_CHECKER_VERSION,
  itemForVersion,
  promptForItem,
} from "./browserRuntime";
import { DiagnosticAnswer, type DiagnosticAnswerSubmission } from "./DiagnosticAnswer";
import "./diagnostic-demo.css";
import {
  DiagnosticDevSkip,
  type DiagnosticSkipResult,
  type DiagnosticSkipRung,
} from "./DiagnosticDevSkip";
import { DIAGNOSTIC_DURATION_ESTIMATE, TYPICAL_QUESTIONS } from "./diagnosticShape";
import { MathText } from "./MathText";
import {
  type PlacementSeed,
  UNLOCK_PLACEMENT_THRESHOLD,
  unlockedNodeIdsFromPlacement,
} from "./placementRosters";
import {
  createDiagnosticClient,
  type DiagnosticClient,
  type DiagnosticRun,
} from "./session";
import { skillDisplayName } from "./skillNames";

/**
 * The learner-facing phases: a plain-language overview, the one-at-a-time
 * questions, and a results read-out. From results the learner hands off straight
 * into the city, where a Clash-of-Clans-style "You've unlocked N buildings!"
 * celebration (see `CitySurface`) replaces the old in-diagnostic seeding + hand-off
 * beats. A `post` retake also stops at results (the city is already seeded).
 */
type Phase = "intro" | "running" | "results";
type AnswerEntry = DiagnosticAnswerSubmission;

/**
 * The placement seam, re-exported from the leaf module that owns it
 * (`placementRosters.ts`) so the city can read a placement without importing this whole
 * runner. The threshold and the split live there because the reward screen's headline
 * denominates over the same object, and two copies of the split is how its numerator and
 * denominator came apart.
 */
export type { PlacementSeed, PretestRosters } from "./placementRosters";
export {
  pretestRostersFromPlacement,
  UNLOCK_PLACEMENT_THRESHOLD,
  unlockedNodeIdsFromPlacement,
} from "./placementRosters";

export interface DiagnosticRunnerProps {
  /**
   * Called when a pretest finalizes, so the city can seed placement blueprints and
   * celebrate. Receives the per-node placement seeds plus the unlocked (passed,
   * placement >= 2) node ids.
   */
  onPretestComplete?: (
    placement: PlacementSeed,
    unlockedNodeIds: readonly string[],
  ) => void | Promise<void>;
  /** Close the diagnostic overlay and return to the (now-seeded) city. */
  onExit?: () => void;
}

/**
 * THE SKILLS THIS DIAGNOSTIC COVERS, from the one content-derived scope the engine is
 * composed over (`@cr/item-bank`'s `DIAGNOSTIC_WALK_SCOPE`) rather than from
 * `getNodesByScope("mvp")`.
 *
 * Every count and every list on these screens reads off this, so the intro's promise, the
 * results table and the walk the engine actually runs cannot come apart. It arrives in
 * TEACHING ORDER — prerequisites first — so the intro reads bottom-up and the results read
 * foundations-first with no group labels needed, which is what the old `prereqDepth` sort
 * was for.
 */
const SCOPE_NODES = DIAGNOSTIC_WALK_SCOPE.map((nodeId) => getNodeOrThrow(nodeId));
/** Scope position, so every screen lists skills in the same order. */
const SCOPE_ORDER = new Map(SCOPE_NODES.map((node, index) => [node.id, index] as const));

/** How many distinct subject areas the scope spans, for the intro's one-line promise. */
const SCOPE_DOMAIN_COUNT = new Set(SCOPE_NODES.map((node) => node.domain)).size;

/**
 * ROUGHLY HOW LONG THIS TAKES, which is the one thing the intro could not previously say.
 *
 * The card used to answer "what is coming" by listing every skill in the scope, and the
 * product lead's report is what that costs: sixty-two rows of *"Signed numbers / Fractions
 * / Field properties & the distributive law / …"* in front of somebody about to sit a
 * placement test, of which five are above the fold at 1024x580 and the Start button is not.
 * A roster is also the wrong answer to the question a learner is actually asking, which is
 * not "which skills" but "how much of my afternoon".
 *
 * The two expectations live in `diagnosticShape.ts` because the first-run start choice quotes
 * them too: a rounded adaptive item count and a broader "about 15–20 minutes" planning range.
 */

/**
 * WHAT THE RESULTS SCREEN SAYS ABOUT ONE SKILL, WHICH IS NOW A BINARY.
 *
 * The lead, off the shipped screen: *"it shouldnt just show this laundry list of skills…
 * marked as either mastered/not mastered, not showing the 3 tier thing you have going on
 * right now."* So the four-segment meter and its four blurbs are gone from the display, and
 * what a learner reads is `mastered` or not.
 *
 * **The MODEL is untouched, and it is not a display detail.** `placementFor`
 * (`engines/diagnostic/src/walk-engine.ts`) still produces all four: 3 a robust measured
 * pass, 2 a single measured pass or a graph-inferred one, 1 a miss with at least one correct
 * attempt, 0 a miss with none. All four leave here on `onPretestComplete` exactly as before,
 * and the city reads the whole range: `citySession` seeds a building at >= 2, and
 * `deriveBlueprint` sizes the ghost silhouette at `MIN_BLUEPRINT_HEIGHT + placement_estimate`,
 * so a 1 and a 0 raise visibly different plots on the island.
 *
 * What the learner loses on THIS screen is the 0-versus-1 distinction (*"you're close: a
 * quick refresher locks it in"* against *"we'll teach this one from the ground up"*) and the
 * 2-versus-3 one (*"cleared it cleanly"* against *"you've tested out of this one"*). Both
 * were shown as a bar of pips and a sentence; neither changed what happens next, since the
 * only boundary anything acts on is {@link UNLOCK_PLACEMENT_THRESHOLD}.
 */
const MASTERED_LABEL = "Mastered";
const NOT_MASTERED_LABEL = "Not mastered";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatScore(value: number): string {
  return value.toFixed(1);
}

/** A coverage fraction in [0, 1] as a whole-number percent (e.g. 0.83 → "83%"). */
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

/** One skill's outcome, joined from the resolved state + the 0–3 placement seed. */
interface SkillOutcome {
  nodeId: string;
  name: string;
  level: PlacementEstimate;
  /** The binary the screen shows: a PASS (>= 2, measured or inferred) reads as mastered. */
  mastered: boolean;
  /** `measured` = directly tested; `inferred` = deduced from the skill map. */
  source: "measured" | "inferred";
}

/**
 * A node is `measured` when it was answered directly (a graded pass or a graded
 * miss) and `inferred` when the walk credited or ruled it out from the map
 * (a robust pass testing out its prerequisites, or a confirmed miss pruning the
 * branch above it). Uncertain/unseen nodes read as inferred (INV-DIAG-8).
 */
function sourceOf(resolution: NodeResolution | undefined): "measured" | "inferred" {
  if (!resolution) {
    return "inferred";
  }
  if (resolution.status === "failed") {
    return "measured";
  }
  if (resolution.status === "passed") {
    return resolution.source === "inferred" ? "inferred" : "measured";
  }
  return "inferred";
}

/** Per-skill outcomes in canonical building order, for the results + seeding views. */
function skillOutcomes(completed: CompletedWalkDiagnostic): SkillOutcome[] {
  const byId = new Map(completed.resolved.map((node) => [node.node_id, node] as const));
  return Object.entries(completed.placement_by_node)
    .map(([nodeId, level]) => ({
      nodeId,
      name: skillDisplayName(nodeId),
      level,
      mastered: level >= UNLOCK_PLACEMENT_THRESHOLD,
      source: sourceOf(byId.get(nodeId)),
    }))
    .sort(
      (a, b) =>
        (SCOPE_ORDER.get(a.nodeId) ?? Number.MAX_SAFE_INTEGER) -
        (SCOPE_ORDER.get(b.nodeId) ?? Number.MAX_SAFE_INTEGER),
    );
}

/**
 * ONE SUBJECT AREA'S STANDING, which is what the screen now leads with.
 *
 * The lead's ask: *"it should show like overall summary of domains you tested out of and a
 * breakdown of the specific skills … via a drop down menu if the user wants to click it."*
 * Sixty-two skills is a wall; ten areas is a sentence, and the intro has already promised the
 * learner *"{N} skills in {M} subject areas"* off this same count.
 *
 * The name comes from `@cr/game`'s `NEIGHBORHOOD_LABELS` through `neighborhoodLabel`, which is
 * the one learner-facing name a domain has in this product (the city's storm announcements
 * speak the same strings). Nothing here prints a `DomainId`: `D6` is a registry key and
 * "Functions & Coordinate Geometry" is what it is called.
 */
interface AreaOutcome {
  domain: DomainId;
  label: string;
  skills: readonly SkillOutcome[];
  mastered: number;
  /** `all` = tested out of the whole area, `some` = a start on it, `none` = from the top. */
  standing: "all" | "some" | "none";
}

/**
 * WHAT ORDER THE AREAS READ IN, and why it is not the walk's.
 *
 * `DIAGNOSTIC_WALK_SCOPE` is a prerequisite-respecting order built for the WALK, and it
 * interleaves: it opens `NUM.S NUM.F NUM.3 POL.3 FUN.6 EL.6 TRG.3`, which is a fine
 * probe sequence and reads, grouped by area, as arithmetic then polynomials then functions
 * then logarithms then trigonometry then exponents. That is nobody's curriculum.
 *
 * `getEraOrderedNodes()` is the city's own play order: era one's nodes first, era ten's last,
 * read off `ERA_SEQUENCE`'s array position (INV-ERA-5) rather than parsed out of a `DomainId`.
 * Ranked by their earliest node in it, the areas come out arithmetic to trigonometry, which is
 * both the ladder the intro promises and the order the learner will actually meet them in.
 */
const PLAY_ORDER = new Map(
  getEraOrderedNodes().map((nodeId, index) => [nodeId, index] as const),
);

function playRank(nodeId: string): number {
  return PLAY_ORDER.get(nodeId) ?? Number.MAX_SAFE_INTEGER;
}

/**
 * Group the administered skills by subject area.
 *
 * `getNodeOrThrow` rather than a lookup with a fallback, deliberately: a node the registry
 * does not know is a build that cannot place anybody, and silently bucketing it under a
 * default would drop a skill out of the disclosure while every count on the screen still
 * added up.
 */
function areaOutcomes(outcomes: readonly SkillOutcome[]): AreaOutcome[] {
  const byDomain = new Map<DomainId, SkillOutcome[]>();
  for (const outcome of outcomes) {
    const { domain } = getNodeOrThrow(outcome.nodeId);
    const bucket = byDomain.get(domain);
    if (bucket) {
      bucket.push(outcome);
    } else {
      byDomain.set(domain, [outcome]);
    }
  }
  return [...byDomain]
    .map(([domain, skills]) => {
      const ordered = [...skills].sort((a, b) => playRank(a.nodeId) - playRank(b.nodeId));
      const mastered = ordered.filter((skill) => skill.mastered).length;
      return {
        domain,
        label: neighborhoodLabel(domain),
        skills: ordered,
        mastered,
        standing:
          mastered === ordered.length ? "all" : mastered > 0 ? ("some" as const) : "none",
      } as AreaOutcome;
    })
    .sort(
      (a, b) => playRank(a.skills[0]?.nodeId ?? "") - playRank(b.skills[0]?.nodeId ?? ""),
    );
}

/**
 * The one sentence under the headline, which has to read at BOTH ends of the range.
 *
 * A learner who tested out of everything and one who tested out of nothing meet the same
 * screen, and a summary written for the middle insults one of them: "you tested out of 0 of
 * the 10 subject areas" is a scoreboard, and this screen is explicitly not a grade. So the
 * empty case says what happens next instead of what did not happen, and every case ends on
 * the same clause.
 *
 * Takes three numbers rather than the areas, and is exported, so all four branches are
 * reachable from a test. Two of them are not: a dev rung can drive a real administration to
 * "everything" and to "nothing", and no rung produces a learner who is part-way into several
 * areas and has finished none of them, which is the branch most learners will actually meet.
 */
export function areaLede(cleared: number, started: number, total: number): string {
  const summary =
    cleared === total
      ? `You tested out of all ${total} subject areas.`
      : cleared > 0
        ? `You tested out of ${cleared} of the ${total} subject areas.`
        : started > 0
          ? `You are part-way into ${started} of the ${total} subject areas.`
          : `We start you at the foundations of all ${total} subject areas.`;
  return `${summary} None of it is a grade.`;
}

/**
 * HOW MUCH OF THIS WAS MEASURED, kept because dropping it would make the screen more
 * authoritative than the instrument is.
 *
 * The old screen carried "Tested directly" / "From the skill map" on every one of the
 * sixty-two cards plus a legend paragraph. Both go: a per-card footnote is exactly the kind of
 * repetition the compression is for. What replaces them is one line that states the split
 * once, above the fold, where it qualifies the counts beside it, and a two-word marker on each
 * skill inside the disclosure for whoever opens it. That is cheaper than what it replaces and
 * says the same thing sooner.
 */
function provenanceLine(outcomes: readonly SkillOutcome[]): string {
  const measured = outcomes.filter((outcome) => outcome.source === "measured").length;
  const inferred = outcomes.length - measured;
  if (inferred === 0) {
    return `Every one of these ${outcomes.length} skills was tested directly.`;
  }
  if (measured === 0) {
    return `All ${inferred} of these follow from the skill map rather than from a question you answered.`;
  }
  // "what you passed AND MISSED", both halves. The inference runs in two directions: a clean
  // pass credits the skills beneath it, and a confirmed miss rules out the branch above. A
  // sentence that named only the first read as nonsense to the learner who passed nothing,
  // which is exactly the reading the zero-of-62 frame turned up.
  return `We asked about ${measured} of these skills directly. The other ${inferred} follow from the skill map, from what you passed and missed around them.`;
}

/** A small inline icon (decorative by default; give it a label to expose it). */
function Glyph({
  path,
  className,
  label,
}: {
  path: string;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      className={className ? `dgx-glyph ${className}` : "dgx-glyph"}
      viewBox="0 0 24 24"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {label ? <title>{label}</title> : null}
      <path d={path} />
    </svg>
  );
}

const ICON_ARROW = "M5 12h14M14 7l5 5-5 5";
const ICON_ALERT =
  "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z";
const ICON_CHECK = "M4 12.5 9.5 18 20 6.5";

/**
 * The live adaptive diagnostic in the browser: an auth gate (when Cognito is
 * configured) in front of the real v2 prerequisite-gated walk engine +
 * authoritative D1 scorer + coverage measurement pipeline, running on the shipped
 * in-memory doubles. The walk serves one adaptive probe at a time and finalizes to
 * a per-skill placement, which seeds the city.
 */
export function DiagnosticRunner({
  onPretestComplete,
  onExit,
}: DiagnosticRunnerProps = {}) {
  const session = useSession();

  if (session.mode === "cognito" && session.status === "loading") {
    return (
      <div className="diagnostic-demo">
        <div className="dgx-status" aria-live="polite" aria-busy="true">
          <div className="dgx-status__spinner" aria-hidden="true" />
          <p>Checking your session…</p>
          <div className="dgx-skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }
  if (!session.studentId) {
    return <AuthGate />;
  }
  return (
    <DiagnosticSession
      key={session.studentId}
      studentId={session.studentId}
      mode={session.mode}
      email={session.email}
      getAccessToken={session.getAccessToken}
      onSignOut={session.signOut}
      onPretestComplete={onPretestComplete}
      onExit={onExit}
    />
  );
}

function DiagnosticSession({
  studentId,
  mode,
  email,
  getAccessToken,
  onSignOut,
  onPretestComplete,
  onExit,
}: {
  studentId: UUID;
  mode: SessionMode;
  email: string | null;
  getAccessToken: () => Promise<string | null>;
  onSignOut: () => Promise<void>;
  onPretestComplete?: (
    placement: PlacementSeed,
    unlockedNodeIds: readonly string[],
  ) => void | Promise<void>;
  onExit?: () => void;
}) {
  const clientRef = useRef<DiagnosticClient | null>(null);
  if (clientRef.current === null) {
    clientRef.current = createDiagnosticClient({ mode, studentId, getAccessToken });
  }
  const client = clientRef.current;

  const runRef = useRef<DiagnosticRun | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [isRetake, setIsRetake] = useState(false);
  const [administrationId, setAdministrationId] = useState<UUID | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [item, setItem] = useState<DiagnosticItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preRun, setPreRun] = useState<CompletedWalkDiagnostic | null>(null);
  const [postRun, setPostRun] = useState<CompletedWalkDiagnostic | null>(null);
  const [measurement, setMeasurement] = useState<ReadinessMeasurement | null>(null);
  const [placementHandoff, setPlacementHandoff] = useState<
    "idle" | "saving" | "saved" | "failed"
  >(onPretestComplete ? "idle" : "saved");
  /**
   * How many questions the finished administration actually asked. Not on
   * `CompletedWalkDiagnostic`, which carries `probed_node_count` — the number of NODES —
   * and those differ by the 2-of-3 rule: the widened walk probes a median of 13 nodes over
   * 23 items. The item count is the one the instrument is judged on, so it is shown.
   */
  const [itemsAsked, setItemsAsked] = useState(0);

  useEffect(() => {
    let active = true;
    void client
      .completedRuns?.()
      .then((runs) => {
        if (!active) {
          return;
        }
        setPreRun(runs.pre);
        setPostRun(runs.post);
        if (runs.pre && runs.post) {
          void client.measurement().then(
            (value) => {
              if (active) {
                setMeasurement(value);
              }
            },
            (caught: unknown) => {
              if (active) {
                setError(errorMessage(caught));
              }
            },
          );
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(errorMessage(caught));
        }
      });
    return () => {
      active = false;
    };
  }, [client]);

  const hasPre = preRun !== null;
  const hasPost = postRun !== null;
  const completed = isRetake ? postRun : preRun;

  const startRun = useCallback(
    async (retake: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const run = client.begin(retake ? "post" : "pre");
        runRef.current = run;
        const served = await run.start();
        setIsRetake(retake);
        setAdministrationId(served.administrationId);
        setQuestionNumber(1);
        setItem(served.items[0] ?? null);
        setPhase("running");
      } catch (caught) {
        setError(errorMessage(caught));
      } finally {
        setBusy(false);
      }
    },
    [client],
  );

  /**
   * Finalize the run and land the results. Shared by the typed path and the dev skip so
   * there is one place a completed administration becomes a screen — a second copy of this
   * is how the two would come to disagree about, say, whether the city gets seeded.
   */
  const finishRun = useCallback(
    async (run: DiagnosticRun, retake: boolean, asked: number) => {
      const finished = await run.finalize();
      setItemsAsked(asked);
      if (retake) {
        setPostRun(finished);
      } else {
        setPreRun(finished);
      }
      setMeasurement(await client.measurement());
      setPhase("results");
    },
    [client],
  );

  /**
   * Commit a finalized pretest's city handoff, including on a refresh that discovers an
   * already-completed run. Rejections are observed and remain retryable on the results screen;
   * the authoritative account operation is idempotent, so replay cannot duplicate a grant.
   *
   * A retake updates `postRun` in {@link finishRun}; it never changes `preRun` or resets this
   * handoff state, so the effect cannot seed the city from post-test evidence.
   */
  useEffect(() => {
    if (preRun === null || placementHandoff !== "idle" || !onPretestComplete) {
      return;
    }
    setPlacementHandoff("saving");
    void Promise.resolve(
      onPretestComplete?.(
        preRun.placement_by_node,
        unlockedNodeIdsFromPlacement(preRun.placement_by_node),
      ),
    ).then(
      () => {
        setPlacementHandoff("saved");
        setError(null);
      },
      (caught: unknown) => {
        setPlacementHandoff("failed");
        setError(errorMessage(caught));
      },
    );
  }, [onPretestComplete, placementHandoff, preRun]);

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
        if (advance.complete) {
          await finishRun(run, isRetake, questionNumber);
        } else {
          setItem(advance.items[0] ?? null);
          setQuestionNumber((n) => n + 1);
        }
      } catch (caught) {
        setError(errorMessage(caught));
      } finally {
        setBusy(false);
      }
    },
    [administrationId, item, isRetake, questionNumber, finishRun],
  );

  /**
   * DEV: answer a whole administration at a chosen accuracy — the affordance behind
   * {@link DiagnosticDevSkip}.
   *
   * It drives the REAL run: the same `submitStage` a typed answer goes through, the same
   * authoritative scorer, the same `finishRun`. Only the keystrokes are substituted, and
   * they come from the item bank's own `canonicalRawAnswer` / `wellFormedWrongRawAnswer`.
   *
   * The loop is over the values `submitStage` RETURNS rather than over component state,
   * which is the whole reason it is a function here and not a `useEffect` that watches
   * `item`: React batches those updates, so a state-driven loop would submit the same
   * question repeatedly or stall waiting for a render.
   */
  const runScripted = useCallback(
    async (
      rung: DiagnosticSkipRung,
      fromCurrent: boolean,
    ): Promise<DiagnosticSkipResult | null> => {
      setBusy(true);
      setError(null);
      try {
        const retake = fromCurrent ? isRetake : hasPre;
        let run = runRef.current;
        let administration = administrationId;
        let current = item;
        let asked = fromCurrent ? questionNumber - 1 : 0;

        if (!fromCurrent || !run || !administration || !current) {
          run = client.begin(retake ? "post" : "pre");
          runRef.current = run;
          const served = await run.start();
          administration = served.administrationId;
          current = served.items[0] ?? null;
          asked = 0;
          setIsRetake(retake);
          setAdministrationId(administration);
          setPhase("running");
        }

        // The walk is bounded by `DEFAULT_WALK_POLICY.maxItems` (70) and every probe is
        // scorable, so this cannot spin — but a guard turns a hypothetical hang into a
        // message rather than a locked tab.
        for (let step = 0; step < 500; step += 1) {
          if (!current || !administration || !run) {
            break;
          }
          const authored = itemForVersion(current.item_version_id);
          if (!authored) {
            throw new Error(
              `no authored item for ${current.item_version_id}; this build's pack cannot answer it`,
            );
          }
          const correct = rung.correctAt(asked);
          const advance = await run.submitStage([
            toSubmission(current, administration, {
              raw_answer: correct
                ? canonicalRawAnswer(authored.answer)
                : wellFormedWrongRawAnswer(authored),
              client_correct: correct,
            }),
          ]);
          asked += 1;
          if (advance.complete) {
            await finishRun(run, retake, asked);
            return { itemsAsked: asked, purpose: retake ? "post" : "pre" };
          }
          current = advance.items[0] ?? null;
          setItem(current);
          setQuestionNumber(asked + 1);
        }
        throw new Error("the scripted run did not complete within its guard");
      } catch (caught) {
        setError(errorMessage(caught));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [administrationId, client, finishRun, hasPre, isRetake, item, questionNumber],
  );

  const resetAll = useCallback(() => {
    client.clearLocal?.();
    clientRef.current = createDiagnosticClient({ mode, studentId, getAccessToken });
    runRef.current = null;
    setPreRun(null);
    setPostRun(null);
    setMeasurement(null);
    setPlacementHandoff(onPretestComplete ? "idle" : "saved");
    setError(null);
    setIsRetake(false);
    setPhase("intro");
  }, [client, mode, studentId, getAccessToken, onPretestComplete]);

  const exit = useCallback(() => {
    if (onExit) {
      onExit();
    } else {
      setPhase("intro");
    }
  }, [onExit]);

  return (
    // `data-phase` so the QUESTION screen can be given its own spacing without touching the
    // intro and the results, which are long scrolling pages with room to spare and are not
    // this pass's to redress.
    <div className="diagnostic-runner diagnostic-demo" data-phase={phase}>
      <IdentityBar
        mode={mode}
        clientMode={client.mode}
        email={email}
        studentId={studentId}
        onSignOut={onSignOut}
      />

      {error && (
        <div className="dgx-error" role="alert">
          <Glyph path={ICON_ALERT} />
          <span>{error}</span>
        </div>
      )}

      {phase === "intro" && (
        <IntroView
          busy={busy}
          clientMode={client.mode}
          hasPre={hasPre}
          hasPost={hasPost}
          placementHandoff={placementHandoff}
          onStart={() => startRun(hasPre)}
          onRetryPlacement={() => setPlacementHandoff("idle")}
          onReset={resetAll}
        />
      )}

      {phase === "running" && item && (
        <SectionView
          questionNumber={questionNumber}
          isRetake={isRetake}
          item={item}
          busy={busy}
          onSubmitAnswer={submitAnswer}
        />
      )}

      {phase === "results" && completed && (
        <ResultsView
          completed={completed}
          itemsAsked={itemsAsked}
          measurement={measurement}
          isRetake={isRetake}
          canRetake={!isRetake && !hasPost}
          busy={busy}
          placementHandoff={placementHandoff}
          onBuildCity={exit}
          onRetryPlacement={() => setPlacementHandoff("idle")}
          onRetake={() => startRun(true)}
          onExit={exit}
          onOverview={() => setPhase("intro")}
        />
      )}

      {/* Renders nothing on a learner build; see `DiagnosticDevSkip`'s gate. Outside the
          phase branches so it is reachable from the overview as well as mid-question. */}
      <DiagnosticDevSkip
        onRun={runScripted}
        midRun={phase === "running" && item !== null}
        busy={busy}
      />
    </div>
  );
}

function IdentityBar({
  mode,
  clientMode,
  email,
  studentId,
  onSignOut,
}: {
  mode: SessionMode;
  clientMode: DiagnosticClient["mode"];
  email: string | null;
  studentId: UUID;
  onSignOut: () => Promise<void>;
}) {
  const isDev = mode === "dev";
  return (
    <div className="diagnostic-identity">
      {clientMode === "browser-local" ? (
        <>
          <span className="diagnostic-identity__badge" title={studentId}>
            Demo device
          </span>
          <span className="diagnostic-identity__mode">Stored only on this device</span>
        </>
      ) : isDev ? (
        <span className="diagnostic-identity__badge" title={studentId}>
          Dev identity · {studentId.slice(0, 8)}
        </span>
      ) : (
        <>
          <span className="diagnostic-identity__badge">{email ?? "Signed in"}</span>
          <span className="diagnostic-identity__mode">
            {clientMode === "server" ? "Saved to your account" : "Local session"}
          </span>
          <button
            type="button"
            className="diagnostic-identity__signout"
            onClick={() => {
              void onSignOut();
            }}
          >
            Sign out
          </button>
        </>
      )}
    </div>
  );
}

/** The three plain-language "how it works" steps (accurate to the walk engine). */
const HOW_STEPS: { title: string; body: string }[] = [
  {
    title: "One question at a time",
    body: "No hints, no retries, no grades along the way. You answer, and it moves on.",
  },
  {
    title: "It adapts as you go",
    body: "It starts near the basics, then binary-searches the skill map. Get one right and it jumps ahead, testing out the easier skills underneath; miss one and it steps back toward the fundamentals to find your floor.",
  },
  {
    title: "So it stays short",
    body: "Because each answer rules a whole branch in or out, it homes in on your level in just a handful of questions: the stronger you are, the faster it climbs.",
  },
];

function IntroView({
  busy,
  clientMode,
  hasPre,
  hasPost,
  placementHandoff,
  onStart,
  onRetryPlacement,
  onReset,
}: {
  busy: boolean;
  clientMode: DiagnosticClient["mode"];
  hasPre: boolean;
  hasPost: boolean;
  placementHandoff: "idle" | "saving" | "saved" | "failed";
  onStart: () => void;
  onRetryPlacement: () => void;
  onReset: () => void;
}) {
  const cta = !hasPre
    ? "Start the diagnostic"
    : !hasPost
      ? "Start the retake"
      : "Run it again";
  return (
    <div className="dgx-intro">
      <section className="dgx-brief">
        <span className="dgx-eyebrow">Diagnostic</span>
        <h1 className="dgx-brief__title">Let's find your starting point</h1>
        <p className="dgx-lede">
          A short, adaptive check across {SCOPE_NODES.length} skills in {SCOPE_DOMAIN_COUNT}{" "}
          subject areas, from arithmetic to trigonometry. It finds where to begin and seeds
          your city so you skip what you already know, and there is no passing or failing
          it.
        </p>
        <p className="dgx-brief__duration">
          Plan for {DIAGNOSTIC_DURATION_ESTIMATE}. Untimed and adaptive.
        </p>

        <div className="dgx-actions">
          <button
            type="button"
            className="dgx-btn dgx-btn--primary"
            onClick={onStart}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className="dgx-spinner" aria-hidden="true" />
                Loading…
              </>
            ) : (
              <>
                {cta}
                <Glyph path={ICON_ARROW} className="dgx-btn__arrow" />
              </>
            )}
          </button>
          {(hasPre || hasPost) && (
            <button type="button" className="dgx-btn dgx-btn--ghost" onClick={onReset}>
              Start over
            </button>
          )}
          {hasPre && placementHandoff === "failed" ? (
            <button
              type="button"
              className="dgx-btn dgx-btn--ghost"
              onClick={onRetryPlacement}
            >
              Retry city placement
            </button>
          ) : null}
        </div>

        <div className="dgx-how">
          <span className="dgx-eyebrow">How it works</span>
          <ol className="dgx-how__steps">
            {HOW_STEPS.map((step, index) => (
              <li className="dgx-step" key={step.title}>
                <span className="dgx-step__num" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="dgx-step__body">
                  <span className="dgx-step__title">{step.title}</span>
                  <p className="dgx-step__text">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="dgx-blueprint dgx-card" aria-labelledby="blueprint-title">
        <div className="dgx-blueprint__head">
          <div>
            <span className="dgx-eyebrow">What we'll check</span>
            <h2 id="blueprint-title">Arithmetic through trigonometry</h2>
          </div>
          <span className="dgx-tag">Adaptive</span>
        </div>

        {/* The two figures a learner about to sit something wants first: how many, and
            how long. `dgx-shape` rather than the results screen's `dgx-tally`, which is a
            read-out of a finished run and would say the wrong thing before one. */}
        <ul className="dgx-shape">
          <li className="dgx-shape__cell dgx-shape__cell--duration">
            <span className="dgx-shape__value">~{TYPICAL_QUESTIONS}</span>
            <span className="dgx-shape__label">questions, typically</span>
          </li>
          <li className="dgx-shape__cell">
            <span className="dgx-shape__value">{DIAGNOSTIC_DURATION_ESTIMATE}</span>
            <span className="dgx-shape__label">untimed, at your pace</span>
          </li>
        </ul>

        <div className="dgx-blueprint__body">
          <p>
            {SCOPE_NODES.length} skills across {SCOPE_DOMAIN_COUNT} subject areas, ordered
            so the foundations come first.
          </p>
          <p>
            <strong>You will not be asked about all {SCOPE_NODES.length}.</strong> Each
            answer settles a whole branch of the map, so most skills are placed from the
            handful you do answer.
          </p>
          <p>
            At the end every skill has a starting point, and your city is built from it, so
            you begin where you actually are.
          </p>
        </div>

        <p className="dgx-note">
          {clientMode === "server"
            ? "Scored by the real engine and saved to your account."
            : clientMode === "browser-local"
              ? "Scored by the real engine and stored only on this device."
              : "Scored by the real engine. Your results stay in this browser session."}
        </p>
      </section>
    </div>
  );
}

/**
 * ONE SERVED QUESTION: the counter and the skill, the typeset prompt, the answer row, and
 * the two things under the card — the reassurance and the way out.
 *
 * ## "I HAVEN'T LEARNED THIS YET" IS AN ANSWER, NOT A SKIP
 *
 * A learner who cannot do a question had two options here: guess, or stop. The diagnostic is
 * deliberately anxiety-sensitive — the intro promises no hints, no retries and no grades —
 * and a screen that offers no dignified way past a question it has just discovered you
 * cannot do is at odds with that promise. This is the third option.
 *
 * **It submits a WRONG answer, because there is no third scoring status to submit.**
 * `isScorable` admits exactly `correct` and `incorrect` (`engines/diagnostic/scoring.ts`);
 * an empty or unparseable submission is `invalid_input`, which is neither scored nor counted
 * as a fault, so the walk RE-SERVES the identical question (Answer_Equivalence §12). A "move
 * on" built on a blank would not move on, and the learner would press it and watch nothing
 * happen — which is exactly the defect `DiagnosticAnswer` refuses an empty submit to avoid.
 *
 * **And the wrong answer is the repository's existing one.** `wellFormedWrongRawAnswer` is
 * the item bank's own per-shape miss, already driving the dev skip's "All wrong" rung, the
 * runtime's widened-walk guard and the bank's self-consistency probe. A second way to be
 * wrong, written here, is how this surface and those three would come to disagree about what
 * a miss is; and a bespoke literal would be `invalid_input` on most answer types, which is
 * the wedge above. So the press is scored by the authoritative scorer exactly as a typed
 * wrong answer is, and the placement it produces is a real one.
 *
 * **The wording is the point of the control, not decoration.** It says what is true — the
 * skill has not been taught yet — rather than asking a learner to declare a failure, and it
 * is the same thing the results screen will say back ("Start here: we'll teach this one from
 * the ground up"). It is a quiet text button under Submit rather than beside it, because the
 * offer must not compete with answering.
 */
function SectionView({
  questionNumber,
  isRetake,
  item,
  busy,
  onSubmitAnswer,
}: {
  questionNumber: number;
  isRetake: boolean;
  item: DiagnosticItem;
  busy: boolean;
  onSubmitAnswer: (entry: AnswerEntry) => void;
}) {
  // Focus the answer field as each new question mounts, so answering flows without
  // a click. A callback ref (fired on mount of the re-keyed card below) keeps this
  // tied to the DOM lifecycle rather than an effect. `input` rather than a class hook,
  // because the answer control is dispatched per shape now: the first text field is the
  // answer on every one of them (for `rational_answer` that is the expression half, which
  // is the half the learner starts on).
  const focusField = useCallback((node: HTMLDivElement | null) => {
    node?.querySelector<HTMLInputElement>("input[type='text']")?.focus();
  }, []);

  const frozen = itemForVersion(item.item_version_id);

  return (
    <section className="dgx-probe" aria-labelledby="diagnostic-section-title">
      {/* `--question` puts the counter and the skill on ONE baseline row. The two-line
          head is right on the `?graph` and `?interactive` probes, which carry a lede
          paragraph under it; here it spent a line of a 580px laptop on a kicker. */}
      <div className="dgx-probe__head dgx-probe__head--question">
        <span className="dgx-eyebrow">
          {isRetake ? "Retake" : "Diagnostic"} · Question {questionNumber}
        </span>
        <h2 id="diagnostic-section-title" className="dgx-probe__title">
          {skillDisplayName(item.node_id)}
        </h2>
      </div>

      <div
        key={`${item.item_version_id}:${questionNumber}`}
        className="diagnostic-item dgx-item"
        data-item-version-id={item.item_version_id}
        ref={focusField}
      >
        {/*
          NO META STRIP ABOVE THE QUESTION, and both halves of it are gone for reasons that
          outlive this edit.

          The SKILL was printed here as well as in the heading three lines up, so a sighted
          reader read it twice on consecutive lines and a screen reader said it twice. The
          completion ceremony's question card already made this call and records the same
          reasoning; the diagnostic is now consistent with it.

          The `Level {item.difficulty}` badge was a CONSTANT. The walk is difficulty-agnostic
          and its packs are L2-only (`engines/diagnostic/routing.ts`), so all 456 items in
          `DIAGNOSTIC_WALK_ITEM_PACK` are difficulty 2 and the badge read "LEVEL 2" on every
          question of every administration. It could tell a learner nothing, and on an
          anxiety-sensitive screen a grade-shaped chip that never varies costs more than the
          nothing it says. If difficulty-adaptive content is ever authored (deferred in the v2
          amendment), a badge that MOVES is a different proposition and can be argued then.
        */}
        <MathText prompt={promptForItem(item.item_version_id)} />
        {frozen ? (
          <DiagnosticAnswer
            frozen={frozen}
            disabled={busy}
            submitLabel={busy ? "Saving…" : "Submit answer"}
            onSubmit={onSubmitAnswer}
          />
        ) : (
          // Only reachable if the server served an item this build's pack does not carry,
          // which is a deploy skew rather than a learner state. Said plainly instead of
          // rendering a field that cannot be graded.
          <p className="dgx-error" role="alert">
            <Glyph path={ICON_ALERT} />
            <span>
              This question ({item.item_version_id}) is not in this build's item pack.
            </span>
          </p>
        )}
      </div>

      {/*
        THE WAY OUT OF A QUESTION YOU CANNOT ANSWER, on the same row as the reassurance that
        makes it safe to take. See {@link SectionView} for why it submits a wrong answer
        rather than a blank one, and why it is worded the way it is.
      */}
      <div className="dgx-probe__foot">
        <p className="dgx-probe__reassure">
          There are no consequences for wrong answers - answer as best as you can!
        </p>
        {frozen && (
          <button
            type="button"
            className="dgx-probe__unsure"
            disabled={busy}
            onClick={() =>
              onSubmitAnswer({
                raw_answer: wellFormedWrongRawAnswer(frozen),
                client_correct: false,
              })
            }
          >
            I haven't learned this yet
          </button>
        )}
      </div>
    </section>
  );
}

/**
 * ONE SUBJECT AREA: its standing at a glance, and its skills behind a disclosure.
 *
 * The row IS the toggle, so the thing a learner points at to ask *"which of these six did I
 * clear?"* is the thing that answers. Ten small disclosures rather than one big one, because
 * the ask is compression and a single door onto sixty-two rows re-opens the wall the moment
 * anybody uses it: opened here, the longest area adds eleven rows and the screen stays a
 * screen.
 *
 * A real `<button>` with `aria-expanded` and `aria-controls`, following the catch-up prompt's
 * disclosure rather than inventing a second pattern.
 */
function AreaRow({ area }: { area: AreaOutcome }) {
  const bodyId = useId();
  const [open, setOpen] = useState(false);
  const total = area.skills.length;
  return (
    <li className="dgx-area" data-standing={area.standing} data-domain={area.domain}>
      <button
        type="button"
        className="dgx-area__toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(!open)}
      >
        {area.standing === "all" ? (
          <Glyph path={ICON_CHECK} className="dgx-area__tick" />
        ) : (
          <span className="dgx-area__tick dgx-area__tick--empty" aria-hidden="true" />
        )}
        <span className="dgx-area__name">{area.label}</span>
        <span className="dgx-area__count">
          {area.mastered} of {total}
          <span className="visually-hidden"> skills mastered</span>
        </span>
        {/* Proportion, not tier: one bar, filled by how much of the area is behind the
            learner. The meter this replaces was per SKILL and had four states. */}
        <span className="dgx-area__bar" aria-hidden="true">
          <span style={{ width: `${Math.round((area.mastered / total) * 100)}%` }} />
        </span>
        <span className="dgx-area__mark" aria-hidden="true" data-open={open} />
      </button>
      {open && (
        <ul className="dgx-area__skills" id={bodyId}>
          {area.skills.map((skill) => (
            <li
              className="dgx-finding"
              key={skill.nodeId}
              data-node-id={skill.nodeId}
              data-mastered={skill.mastered}
            >
              <span className="dgx-finding__name">{skill.name}</span>
              <span className="dgx-finding__state">
                {skill.mastered ? MASTERED_LABEL : NOT_MASTERED_LABEL}
              </span>
              <span className="dgx-finding__source" data-source={skill.source}>
                {skill.source === "measured" ? "tested" : "from the map"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function ResultsView({
  completed,
  itemsAsked,
  measurement,
  isRetake,
  canRetake,
  busy,
  placementHandoff,
  onBuildCity,
  onRetryPlacement,
  onRetake,
  onExit,
  onOverview,
}: {
  completed: CompletedWalkDiagnostic;
  itemsAsked: number;
  measurement: ReadinessMeasurement | null;
  isRetake: boolean;
  canRetake: boolean;
  busy: boolean;
  placementHandoff: "idle" | "saving" | "saved" | "failed";
  onBuildCity: () => void;
  onRetryPlacement: () => void;
  onRetake: () => void;
  onExit: () => void;
  onOverview: () => void;
}) {
  const outcomes = skillOutcomes(completed);
  const areas = areaOutcomes(outcomes);
  const strong = outcomes.filter((outcome) => outcome.mastered).length;
  const cleared = areas.filter((area) => area.standing === "all").length;

  return (
    <section className="dgx-results" aria-labelledby="diagnostic-results-title">
      <div className="dgx-results__head">
        <span className="dgx-eyebrow">
          {isRetake ? "Retake complete" : "Diagnostic complete"}
        </span>
        <h2 id="diagnostic-results-title">Here's what we found</h2>
        <p className="dgx-results__lede">
          {areaLede(
            cleared,
            areas.filter((area) => area.standing === "some").length,
            areas.length,
          )}
        </p>
      </div>

      {/*
        THE THREE NUMBERS THE SCREEN COULD NOT PREVIOUSLY SAY, and the reason they are worth
        a strip of their own: the adaptive claim is that a few answers settle many skills,
        and a table of per-skill rows makes that claim without ever stating it. `questions`
        against `skills settled` is the claim in two figures — and at the widened scope it
        is a median of 23 against 20, where the D1 instrument's was 7 against 6.

        `questions` is the ITEM count, not `probed_node_count`: those differ by the 2-of-3
        rule, and the number a learner experiences is the one they answered.

        The other two are FRACTIONS now rather than bare counts. "17" and "62" in separate
        boxes was two facts a reader had to divide; "17 of 62" is the fact. The third cell is
        the area reading, which is what the screen leads with.
      */}
      <ul className="dgx-tally">
        {[
          {
            key: "asked",
            value: String(itemsAsked),
            label: itemsAsked === 1 ? "question asked" : "questions asked",
          },
          {
            key: "strong",
            value: `${strong} of ${outcomes.length}`,
            label: "skills mastered",
          },
          {
            key: "areas",
            value: `${cleared} of ${areas.length}`,
            label: "subject areas tested out",
          },
        ].map((cell) => (
          <li className="dgx-tally__cell" key={cell.key}>
            <span className="dgx-tally__value">{cell.value}</span>
            <span className="dgx-tally__label">{cell.label}</span>
          </li>
        ))}
      </ul>

      <p className="dgx-provenance">{provenanceLine(outcomes)}</p>

      {completed.ceiling_reached && (
        <p className="dgx-results__truncated">
          This run reached the length limit before settling everything, so anything left
          unmeasured is placed at the start rather than guessed at.
        </p>
      )}

      {isRetake && measurement && <MeasurementSummary measurement={measurement} />}

      {/* THE SCREEN'S BODY: ten areas, each a door onto its own skills. What stood here was
          one card per skill, sixty-two of them, 5,150px tall at 1024x580. */}
      <ol className="dgx-areas">
        {areas.map((area) => (
          <AreaRow area={area} key={area.domain} />
        ))}
      </ol>

      <div className="dgx-actions">
        {isRetake ? (
          <button type="button" className="dgx-btn dgx-btn--primary" onClick={onExit}>
            Back to your city
            <Glyph path={ICON_ARROW} className="dgx-btn__arrow" />
          </button>
        ) : placementHandoff === "failed" ? (
          <button
            type="button"
            className="dgx-btn dgx-btn--primary"
            onClick={onRetryPlacement}
          >
            Retry city placement
            <Glyph path={ICON_ARROW} className="dgx-btn__arrow" />
          </button>
        ) : (
          <button
            type="button"
            className="dgx-btn dgx-btn--primary"
            onClick={onBuildCity}
            disabled={placementHandoff !== "saved"}
          >
            {placementHandoff === "saved" ? "Build my city" : "Saving your city…"}
            {placementHandoff === "saved" ? (
              <Glyph path={ICON_ARROW} className="dgx-btn__arrow" />
            ) : null}
          </button>
        )}
        {isRetake ? (
          <button type="button" className="dgx-btn dgx-btn--ghost" onClick={onOverview}>
            Back to overview
          </button>
        ) : canRetake ? (
          <button
            type="button"
            className="dgx-btn dgx-btn--ghost"
            onClick={onRetake}
            disabled={busy || placementHandoff !== "saved"}
          >
            {busy ? "Loading…" : "Take it again to measure progress"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function MeasurementSummary({ measurement }: { measurement: ReadinessMeasurement }) {
  // v2 default: depth-weighted readiness coverage.
  if (measurement.model === "coverage") {
    const record = measurement.measurement;
    const gain = record.coverage_gain;
    return (
      <div className="dgx-gain">
        <span className="dgx-eyebrow">Progress since your first run</span>
        {record.status === "computed" && gain !== null ? (
          <p className="dgx-gain__value">
            {gain >= 0 ? "+" : ""}
            {formatPercent(gain)} of the skill map
            <span>
              ({formatPercent(record.pre.coverage)} → {formatPercent(record.post.coverage)})
            </span>
          </p>
        ) : (
          <p className="dgx-gain__value dgx-gain__value--muted">
            Not comparable yet ({record.status.replace(/_/g, " ")})
          </p>
        )}
      </div>
    );
  }

  // Legacy MST pair (θ) — kept so a pre-flip pretest still reads correctly.
  const record = measurement.measurement;
  const gain = record.ability_gain;
  return (
    <div className="dgx-gain">
      <span className="dgx-eyebrow">Progress since your first run</span>
      {record.status === "computed" && gain !== null ? (
        <p className="dgx-gain__value">
          {gain >= 0 ? "+" : ""}
          {formatScore(gain)} θ
          <span>
            ({formatScore(record.pre.ability_score)} →{" "}
            {formatScore(record.post.ability_score)})
          </span>
        </p>
      ) : (
        <p className="dgx-gain__value dgx-gain__value--muted">
          Not comparable yet ({record.status.replace(/_/g, " ")})
        </p>
      )}
    </div>
  );
}
