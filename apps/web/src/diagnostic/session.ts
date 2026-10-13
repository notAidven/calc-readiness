import type {
  CompletedWalkDiagnostic,
  DiagnosticItem,
  ReadinessMeasurement,
  StageAdvance,
} from "@cr/diagnostic";
import type { AssessmentItemSubmission, AssessmentPurpose, UUID } from "@cr/state-schema";

import { isServerBacked } from "../api";
import type { SessionMode } from "../auth/session";
import { isDemoMode } from "../demo/demoMode";
import { resolvePresenterRequest } from "../demo/presenterMode";
import { createInMemoryDiagnosticClient } from "./browserRuntime";
import { createBrowserLocalDiagnosticClient } from "./diagnosticPersistence";
import { createServerDiagnosticClient } from "./serverRuntime";

/**
 * The transport-agnostic seam the runner UI drives. The in-memory client (dev/CI)
 * and the server-backed client (browser_auth: a Cognito access-token JWT + the
 * Aurora-backed Lambda) both satisfy it, so the UI is identical whether records
 * live in this tab or in the database.
 *
 * The v2 default instrument is the prerequisite-gated walk, which serves one
 * adaptive probe per turn: each probe is presented as a one-item "section" so this
 * stage-shaped seam (and the runner UI) is unchanged across the flip — only the
 * finalized metric is now depth-weighted readiness coverage
 * ({@link CompletedWalkDiagnostic}) rather than the ability frontier.
 */

/** One served section: the administration + the item(s) to answer (one per probe). */
export interface ServedStage {
  administrationId: UUID;
  stageId: string;
  items: readonly DiagnosticItem[];
}

/** A single administration (a pretest or a posttest) in progress. */
export interface DiagnosticRun {
  readonly purpose: AssessmentPurpose;
  start(): Promise<ServedStage>;
  submitStage(submissions: readonly AssessmentItemSubmission[]): Promise<StageAdvance>;
  finalize(): Promise<CompletedWalkDiagnostic>;
}

/** `in-memory` records stay in this tab; `server` persists to the student's account. */
export type DiagnosticClientMode = "in-memory" | "browser-local" | "server";

export interface DiagnosticClient {
  readonly mode: DiagnosticClientMode;
  readonly studentId: UUID;
  begin(purpose: AssessmentPurpose): DiagnosticRun;
  /**
   * The paired pre/post §9 measurement once both are finalized, else null. Tagged
   * with the metric it was computed under (`coverage` for the walk, `ability` for a
   * legacy MST pair) so the UI renders the right units.
   */
  measurement(): Promise<ReadinessMeasurement | null>;
  completedRuns?(): Promise<{
    readonly pre: CompletedWalkDiagnostic | null;
    readonly post: CompletedWalkDiagnostic | null;
  }>;
  clearLocal?(): void;
}

/**
 * Pick the client for the current session. Real records require BOTH a Cognito
 * auth session (`cognito` mode) AND a configured server function endpoint
 * (`VITE_DIAGNOSTIC_API_URL`), the shared {@link isServerBacked} gate: the browser
 * never reaches the DB, so without the endpoint we fall back to the in-memory
 * client (still the real engine + authoritative checker, just not persisted). The
 * same gate drives the city's placement handoff, so the two never disagree.
 */
export function createDiagnosticClient(input: {
  mode: SessionMode;
  studentId: UUID;
  getAccessToken: () => Promise<string | null>;
}): DiagnosticClient {
  const apiUrl = import.meta.env.VITE_DIAGNOSTIC_API_URL;
  // `apiUrl` re-checked only to narrow it to a string; `isServerBacked` already
  // gates on it, so the branch is entered iff the endpoint is configured.
  if (isServerBacked(input.mode === "cognito") && apiUrl) {
    return createServerDiagnosticClient({
      getAccessToken: input.getAccessToken,
      apiUrl,
      studentId: input.studentId,
    });
  }
  const presenter =
    typeof window === "undefined"
      ? null
      : resolvePresenterRequest(window.location.pathname, window.location.search);
  if (presenter) {
    return createInMemoryDiagnosticClient(input.studentId);
  }
  if (isDemoMode()) {
    return createBrowserLocalDiagnosticClient(input.studentId);
  }
  return createInMemoryDiagnosticClient(input.studentId);
}
