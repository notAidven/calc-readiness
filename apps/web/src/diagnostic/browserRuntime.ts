import {
  type AnswerChecker,
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
} from "@cr/components";
import {
  type AdministrationRecord,
  type CompletedWalkDiagnostic,
  computeCoverageMeasurementFromRecords,
  type FrontierWalkConfig,
  type ReadinessMeasurement,
} from "@cr/diagnostic";
import {
  createInMemoryDiagnosticStore,
  createInMemoryPlacementWriter,
  createInMemoryResponseRepository,
  createInMemoryWalkStore,
  createWalkRuntime,
  oneProbeSubmission,
  walkAdvanceToStage,
  walkServeToStage,
} from "@cr/diagnostic-runtime";
import {
  createItemPackWalkSource,
  DIAGNOSTIC_WALK_ITEM_PACK,
  DIAGNOSTIC_WALK_SCOPE,
  type FrozenItem,
  toProductItemVersions,
} from "@cr/item-bank";
import { createAuthoritativeScorer } from "@cr/scorer";
import type { AssessmentPurpose, UUID } from "@cr/state-schema";

import type { DiagnosticClient } from "./session";

export interface BrowserDiagnosticSnapshot {
  readonly finalized: readonly AdministrationRecord[];
  readonly completed: readonly CompletedWalkDiagnostic[];
}

export interface BrowserDiagnosticClientOptions {
  readonly restored?: BrowserDiagnosticSnapshot | null;
  readonly onSnapshot?: (snapshot: BrowserDiagnosticSnapshot) => void;
  readonly mode?: DiagnosticClient["mode"];
}

/**
 * THE NODES THE WALK COVERS + SCORES; also the coverage denominator.
 *
 * Content-derived (`@cr/item-bank`'s `DIAGNOSTIC_WALK_SCOPE`) rather than
 * `getNodesByScope("mvp")`, which is the six D1 nodes and was what every consumer
 * downstream of here inherited. The derivation is per node: in product, ≥3 servable
 * walk items in each form, and a practice pool to place into. Author walk items for a
 * node that already has a lesson and it joins this scope with no edit here.
 *
 * The registry is untouched: `product_scope` still reads `mvp = 6`, and the city's own
 * roster is still era-driven. What widened is the INSTRUMENT, which is a different
 * question from what the city builds.
 */
const WALK_SCOPE: readonly string[] = DIAGNOSTIC_WALK_SCOPE;

/** The prerequisite-gated walk config: the derived scope, entered at the L2 routing tier. */
const WALK_CONFIG: FrontierWalkConfig = { scope: WALK_SCOPE, entryTier: 2 };

/** item_version_id -> the authored entry (the engine serves ids only). */
const ITEM_BY_VERSION: ReadonlyMap<string, FrozenItem> = new Map(
  DIAGNOSTIC_WALK_ITEM_PACK.map((entry) => [entry.item_version_id, entry] as const),
);

export function promptForItem(itemVersionId: string): string {
  return ITEM_BY_VERSION.get(itemVersionId)?.prompt ?? itemVersionId;
}

/**
 * The authored item behind a served probe, or undefined for an id this build does not
 * carry. The runner needs the ANSWER SPEC as well as the prompt now: which answer
 * control a probe gets, and which keypad and placeholder go with it, are dispatched off
 * `answer.answer_spec` exactly as lesson practice dispatches them. The answer KEY rides
 * along in the same object, which is unavoidable while the client grades locally at all
 * (`MathInput` already received the whole checker) and is why grading is authoritative
 * server-side on the persisted path regardless of `client_correct`.
 */
export function itemForVersion(itemVersionId: string): FrozenItem | undefined {
  return ITEM_BY_VERSION.get(itemVersionId);
}

/**
 * The PRODUCT (v2) answer checker over the full diagnostic walk pool (both forms). The
 * UI passes this to the answer row so client grading uses the same checker the
 * authoritative scorer uses — it is NOT the globally-registered spike checker
 * (`CheckerLab`).
 *
 * v2 rather than the D1 (v1) checker because the scope is no longer D1. v1's grammar has
 * no `sqrt(...)`, no variable denominator and no variable radicand, so it returns
 * `invalid_input` on 22 of the 66 walk-servable items outside D1 — and `invalid_input` is
 * not a fault, so the walk would re-serve the same item forever while every metric looked
 * healthy (`docs/Diagnostic_11_Node_Scope_Measurement.md` §2). v2 grades all 66 and every
 * alternate spelling of them.
 */
export const diagnosticAnswerChecker: AnswerChecker = createProductAnswerChecker({
  itemVersions: toProductItemVersions(DIAGNOSTIC_WALK_ITEM_PACK),
});

/**
 * The version stamped on every submission the runner makes. It must equal the version of
 * the checker the SERVER composes (`DEFAULT_WALK_VERSIONS.equivalence_checker_version`),
 * because both checkers fail closed on a mismatch: a client still stamping 1 against a
 * server composed at 2 returns `scoring_error` on every item, D1's included, which is a
 * total wedge rather than a partial one. `walkCheckerVersionParity.test.ts` pins the three
 * declarations together.
 */
export const DIAGNOSTIC_CHECKER_VERSION = PRODUCT_CHECKER_VERSION;

/**
 * A browser-local diagnostic client on the shipped in-memory doubles plus the REAL
 * authoritative product scorer, running the v2 prerequisite-gated **walk** — the default
 * instrument after the flip. A full pre/post walks, grades, and measures coverage
 * exactly as the engine + measurement pipeline do — no database, no AWS and no secrets in
 * the browser, which is what makes the widened diagnostic demonstrable without a backend.
 * The walk serves one adaptive probe per turn; the {@link DiagnosticRun} seam presents
 * each as a one-item section (via `walkServeToStage`/`walkAdvanceToStage`), so the runner
 * UI is identical to the persisted path.
 *
 * One shared administration store + walk store + placement writer per client: a
 * student's pretest placement persists and their pre/post administrations coexist
 * for the measurement read. Each administration gets its own response repository so
 * its records are captured in served order; finalized records are retained so
 * `measurement()` can pair pre + post — the same read the server client does over
 * the API (`GET /api/measurement` → `computeStudentReadiness`).
 *
 * This is the offline/dev runner. The persisted path is `createServerDiagnosticClient`
 * (the browser_auth server function); the `DiagnosticClient` seam is identical.
 */
export function createInMemoryDiagnosticClient(
  studentId: UUID,
  options: BrowserDiagnosticClientOptions = {},
): DiagnosticClient {
  const store = createInMemoryDiagnosticStore({
    administrations: (options.restored?.finalized ?? []).map(
      (record) => record.administration,
    ),
  });
  const walkStore = createInMemoryWalkStore();
  const placementWriter = createInMemoryPlacementWriter();
  const finalized = new Map<AssessmentPurpose, AdministrationRecord>(
    (options.restored?.finalized ?? []).map((record) => [
      record.administration.purpose,
      record,
    ]),
  );
  const completedByPurpose = new Map<AssessmentPurpose, CompletedWalkDiagnostic>(
    (options.restored?.completed ?? []).map((run) => [run.administration.purpose, run]),
  );

  const snapshot = (): BrowserDiagnosticSnapshot => ({
    finalized: [...finalized.values()],
    completed: [...completedByPurpose.values()],
  });

  return {
    mode: options.mode ?? "in-memory",
    studentId,
    begin(purpose) {
      const repository = createInMemoryResponseRepository();
      const scorer = createAuthoritativeScorer(diagnosticAnswerChecker, repository);
      const runtime = createWalkRuntime({
        config: WALK_CONFIG,
        itemSource: createItemPackWalkSource(DIAGNOSTIC_WALK_ITEM_PACK),
        store,
        walkStore,
        scorer,
        placementWriter,
      });
      let administrationId: UUID | null = null;

      return {
        purpose,
        async start() {
          const served = await runtime.engine.start(
            runtime.newAdministration({ student_id: studentId, purpose }),
          );
          administrationId = served.administration.administration_id;
          const stage = walkServeToStage(served);
          return {
            administrationId: served.administration.administration_id,
            stageId: stage.stage_id,
            items: stage.items,
          };
        },
        async submitStage(submissions) {
          if (!administrationId) {
            throw new Error("call start() before submitStage()");
          }
          const advance = await runtime.engine.submitProbe(
            administrationId,
            oneProbeSubmission(submissions),
          );
          return walkAdvanceToStage(advance);
        },
        async finalize() {
          if (!administrationId) {
            throw new Error("call start() before finalize()");
          }
          const completed = await runtime.engine.finalize(administrationId);
          finalized.set(purpose, {
            administration: completed.administration,
            responses: [...repository.responses],
          });
          completedByPurpose.set(purpose, completed);
          options.onSnapshot?.(snapshot());
          return completed;
        },
      };
    },
    async measurement(): Promise<ReadinessMeasurement | null> {
      const pre = finalized.get("pre");
      const post = finalized.get("post");
      if (!pre || !post) {
        return null;
      }
      return {
        model: "coverage",
        measurement: computeCoverageMeasurementFromRecords({
          pre,
          post,
          scope: WALK_SCOPE,
        }),
      };
    },
    async completedRuns() {
      return {
        pre: completedByPurpose.get("pre") ?? null,
        post: completedByPurpose.get("post") ?? null,
      };
    },
  };
}
