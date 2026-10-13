import type { AnswerChecker, CheckAnswerResult } from "@cr/components";
import type { AssessmentItemResponse, AssessmentItemSubmission } from "@cr/state-schema";

export interface AssessmentResponseRepository {
  append(response: AssessmentItemResponse): Promise<void>;
}

export interface AuthoritativeScorer {
  scoreAndAppend(submission: AssessmentItemSubmission): Promise<AssessmentItemResponse>;
}

function versionMismatch(
  requestedVersion: number,
  result: CheckAnswerResult,
): CheckAnswerResult {
  if (result.checker_version === requestedVersion) {
    return result;
  }

  return {
    status: "scoring_error",
    reason_code: "checker_version_mismatch",
    client_correct: false,
    checker_version: requestedVersion,
  };
}

export function createAuthoritativeScorer(
  checker: AnswerChecker,
  repository: AssessmentResponseRepository,
): AuthoritativeScorer {
  return {
    async scoreAndAppend(submission) {
      const checked = versionMismatch(
        submission.equivalence_checker_version,
        checker({
          raw_answer: submission.raw_answer,
          item_version_id: submission.item_version_id,
          equivalence_checker_version: submission.equivalence_checker_version,
        }),
      );
      const response: AssessmentItemResponse = {
        ...submission,
        authoritative_correct: checked.status === "correct",
        scoring_status: checked.status,
        reason_code: checked.reason_code,
      };

      await repository.append(response);
      return response;
    },
  };
}
