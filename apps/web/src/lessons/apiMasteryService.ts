import type { MasteryService, SubmitAssessmentEvidenceResult } from "@cr/mastery-service";
import type { CompletionStatus, Mastery } from "@cr/state-schema";

import { type AccessTokenGetter, ApiResponseError, apiPostJsonAuthenticated } from "../api";

/**
 * The browser half of the learning-record write path: a {@link MasteryService} that submits
 * raw answers and lets the server decide what they were worth.
 *
 * ## What is deliberately NOT here
 *
 * No grading. The local service this replaces recomputes correctness in the browser through
 * `practiceChecker`, and its own comment calls that a *"server-side stand-in"* — this is what
 * it was standing in for. The body below is assembled field by field from a fixed list rather
 * than by spreading the engine's response objects, which is what makes "the wire cannot carry
 * a verdict" a property of the code rather than a promise: there is no line here that could
 * put one on. The server rejects one anyway (`services/diagnostic-api/src/mastery.ts`), and
 * these are the two halves of the same rule.
 *
 * No `student_id` either. The server takes identity from the verified Cognito `sub`, so a
 * field naming a learner would be at best ignored and at worst believed.
 */

/** The lesson lane's column, in the order it may advance. */
export type LessonStageName = "not_started" | "teaching" | "practice" | "done";

export interface MasteryApiConfig {
  /** The API base, e.g. `https://app.example/api`. */
  baseUrl: string;
  getToken: AccessTokenGetter;
}

/** Exactly the fields the evidence route accepts, and nothing that could imply a grade. */
function wireResponse(response: {
  item_id: string;
  item_version: number;
  raw_answer: unknown;
  hints_used: number;
  revealed: boolean;
  attempt: number;
  time_on_item_ms: number;
}) {
  return {
    item_id: response.item_id,
    item_version: response.item_version,
    raw_answer: response.raw_answer,
    hints_used: response.hints_used,
    revealed: response.revealed,
    attempt: response.attempt,
    time_on_item_ms: response.time_on_item_ms,
  };
}

const MASTERY_VALUES: readonly number[] = [0, 1, 2, 3];
const COMPLETION_VALUES: readonly string[] = ["locked", "in_progress", "complete"];

/**
 * The server's answer, or null if it is not one. A malformed body must not be mistaken for a
 * verdict: it would set a mastery the record does not hold, which is the same lie as grading
 * in the browser, arrived at by accident.
 */
function parseResult(body: unknown): SubmitAssessmentEvidenceResult | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const result = body as Record<string, unknown>;
  if (
    typeof result.node_id !== "string" ||
    typeof result.changed !== "boolean" ||
    typeof result.mastery !== "number" ||
    !MASTERY_VALUES.includes(result.mastery) ||
    typeof result.completion_status !== "string" ||
    !COMPLETION_VALUES.includes(result.completion_status)
  ) {
    return null;
  }
  return {
    node_id: result.node_id,
    mastery: result.mastery as Mastery,
    changed: result.changed,
    completion_status: result.completion_status as CompletionStatus,
  };
}

export type ApiMasteryServiceDeps = MasteryApiConfig;

export function createApiMasteryService(deps: ApiMasteryServiceDeps): MasteryService {
  const endpoint = `${deps.baseUrl}/mastery/evidence`;
  return {
    async submitAssessmentEvidence(input) {
      const body = await apiPostJsonAuthenticated<unknown>(endpoint, deps.getToken, {
        node_id: input.node_id,
        evidence_id: input.evidence_id,
        context: input.context,
        responses: input.responses.map(wireResponse),
      });
      const result = parseResult(body);
      if (result === null) {
        throw new ApiResponseError(
          "The mastery service answered with a result body this app cannot read. Your answers were not marked saved.",
          502,
          "invalid_mastery_response",
        );
      }
      return result;
    },
  };
}

/**
 * Advance the lesson lane's own column. Separate from the evidence route because it happens
 * at CFU pass, BEFORE any practice evidence exists — which is the whole point: it is what
 * makes the practice set reachable in the first place.
 *
 * Resolves either way. The stage write is a progress marker rather than a graded record, and
 * a learner who has just passed the check should not be held at the advisor because a POST
 * failed; the write is monotonic, so the next one that lands sets it correctly.
 */
export async function postLessonStage(
  config: MasteryApiConfig,
  nodeId: string,
  stage: LessonStageName,
): Promise<boolean> {
  try {
    await apiPostJsonAuthenticated<unknown>(
      `${config.baseUrl}/lesson/stage`,
      config.getToken,
      { node_id: nodeId, lesson_stage: stage },
    );
    return true;
  } catch (error) {
    console.warn("mastery: the lesson-stage route did not accept this write", error);
    return false;
  }
}
