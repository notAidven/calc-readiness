import type {
  CompletedWalkDiagnostic,
  DiagnosticItem,
  ReadinessMeasurement,
  StageAdvance,
} from "@cr/diagnostic";
import type { AssessmentItemSubmission, UUID } from "@cr/state-schema";

import {
  apiGetJsonAuthenticated,
  apiPostJsonAuthenticated,
  type AccessTokenGetter,
} from "../api";
import type { DiagnosticClient, ServedStage } from "./session";

export interface ServerDiagnosticClientDeps {
  /** Resolve the current Cognito access-token JWT (bearer), or null when signed out. */
  getAccessToken: AccessTokenGetter;
  /** The deployed browser_auth server function endpoint (`VITE_DIAGNOSTIC_API_URL`). */
  apiUrl: string;
  studentId: UUID;
}

type StartResponse = {
  administration_id: UUID;
  stage_id: string;
  items: readonly DiagnosticItem[];
};

/**
 * The persisted diagnostic client: the browser holds only the Cognito session and
 * POSTs each engine step to the Lambda with the user's access-token bearer.
 * Authoritative scoring, finalize, and placement writes all happen server-side over
 * the RDS Data API; the browser never reaches the DB (Contracts §5, AWS-native
 * migration).
 *
 * The paired measurement is read back through `GET /api/measurement` — the same
 * `sub`-scoped pre/post computation, server-side, instead of a browser DB read.
 */
export function createServerDiagnosticClient(
  deps: ServerDiagnosticClientDeps,
): DiagnosticClient {
  const { getAccessToken, apiUrl, studentId } = deps;
  const measurementUrl = apiUrl.replace(/\/diagnostic\/?$/, "/measurement");

  /**
   * Every engine step, unwrapped by the SAME reader `apiGetJson`/`apiPostJson` use.
   *
   * This held its own copy of `await response.json().catch(() => null)`, which is the
   * fallback that turned a `POST /api/city` outage into a silent dropped save (see
   * `unwrapJson`). The copy here is on the diagnostic's write path — a submitted stage —
   * so it loses a learner's answers rather than their island. One reader, so the two
   * cannot disagree about what a successful response is.
   */
  async function call<T>(body: unknown): Promise<T> {
    return apiPostJsonAuthenticated<T>(apiUrl, getAccessToken, body);
  }

  return {
    mode: "server",
    studentId,
    begin(purpose) {
      let administrationId: UUID | null = null;
      return {
        purpose,
        async start(): Promise<ServedStage> {
          const served = await call<StartResponse>({ action: "start", purpose });
          administrationId = served.administration_id;
          return {
            administrationId: served.administration_id,
            stageId: served.stage_id,
            items: served.items,
          };
        },
        async submitStage(
          submissions: readonly AssessmentItemSubmission[],
        ): Promise<StageAdvance> {
          if (!administrationId) {
            throw new Error("call start() before submitStage()");
          }
          return call<StageAdvance>({
            action: "submitStage",
            administration_id: administrationId,
            submissions,
          });
        },
        async finalize(): Promise<CompletedWalkDiagnostic> {
          if (!administrationId) {
            throw new Error("call start() before finalize()");
          }
          return call<CompletedWalkDiagnostic>({
            action: "finalize",
            administration_id: administrationId,
          });
        },
      };
    },
    async measurement(): Promise<ReadinessMeasurement | null> {
      return apiGetJsonAuthenticated<ReadinessMeasurement | null>(
        measurementUrl,
        getAccessToken,
      );
    },
  };
}
