import type { AnswerChecker, CheckAnswerInput, CheckAnswerResult } from "./index";

let answerChecker: AnswerChecker = (input) => ({
  status: "scoring_error",
  reason_code: "checker_not_configured",
  client_correct: false,
  checker_version: input.equivalence_checker_version,
});

/**
 * Installs the checker proven by the capability spike. Until then, calls fail
 * closed as an application fault and are never misreported as student errors.
 */
export function configureAnswerChecker(checker: AnswerChecker): void {
  answerChecker = checker;
}

export function checkAnswer(input: CheckAnswerInput): CheckAnswerResult {
  return answerChecker(input);
}

/**
 * Routes each request to the checker for its declared `equivalence_checker_version`,
 * so one configured checker can grade a mixed item bank (locked D1 v1 items + Phase-2
 * v2 items) without ever rescoring a response under a different version
 * (Answer_Equivalence_Spec §13.13). An unknown version fails closed.
 */
export function createVersionedAnswerChecker(
  checkers: ReadonlyMap<number, AnswerChecker>,
): AnswerChecker {
  return (input: CheckAnswerInput): CheckAnswerResult => {
    const checker = checkers.get(input.equivalence_checker_version);
    if (!checker) {
      return {
        status: "scoring_error",
        reason_code: "checker_version_unsupported",
        client_correct: false,
        checker_version: input.equivalence_checker_version,
      };
    }
    return checker(input);
  };
}
