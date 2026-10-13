import { type DataApiExecutor, json } from "@cr/db";
import type { AssessmentResponseRepository } from "@cr/scorer";
import type { AssessmentItemResponse } from "@cr/state-schema";

/**
 * Append-only `assessment_item_response` writer over the Data API. This is the
 * authoritative write path for `authoritative_correct` (Contracts §2/§5), so it
 * only runs server-side under the least-privilege `app_service` role. `seq` is
 * DB-assigned identity and is intentionally omitted from the insert.
 */
export function createAuroraResponseRepository(
  exec: DataApiExecutor,
): AssessmentResponseRepository {
  return {
    async append(response: AssessmentItemResponse): Promise<void> {
      await exec.execute(
        `insert into public.assessment_item_response
           (administration_id, item_version_id, node_id, raw_answer, item_definition_hash,
            equivalence_checker_version, client_correct, authoritative_correct,
            scoring_status, reason_code)
         values
           (:administration_id::uuid, :item_version_id, :node_id, :raw_answer::jsonb,
            :item_definition_hash, :equivalence_checker_version, :client_correct,
            :authoritative_correct, :scoring_status::public.scoring_status, :reason_code)`,
        {
          administration_id: response.administration_id,
          item_version_id: response.item_version_id,
          node_id: response.node_id,
          raw_answer: json(response.raw_answer),
          item_definition_hash: response.item_definition_hash,
          equivalence_checker_version: response.equivalence_checker_version,
          client_correct: response.client_correct,
          authoritative_correct: response.authoritative_correct,
          scoring_status: response.scoring_status,
          reason_code: response.reason_code,
        },
      );
    },
  };
}
