import type { CompletionStatus, Mastery, UUID } from "@cr/state-schema";

export const PRACTICE_SET_SIZE = 5;
export const MASTERY_CORRECT_COUNT = 4;
export const GOLD_CORRECT_COUNT = 5;

export interface EvidenceResponse {
  item_id: string;
  item_version: number;
  template_id?: string;
  template_params?: Readonly<Record<string, unknown>>;
  raw_answer: unknown;
  hints_used: number;
  revealed: boolean;
  attempt: number;
  time_on_item_ms: number;
  misconception_tag?: string;
}

export interface SubmitAssessmentEvidenceInput {
  /** Ignored by the service implementation; identity is read from auth. */
  student_id: UUID;
  context: "lesson" | "diagnostic-practice";
  node_id: string;
  responses: readonly EvidenceResponse[];
  evidence_id: string;
}

export interface SubmitAssessmentEvidenceResult {
  node_id: string;
  mastery: Mastery;
  changed: boolean;
  completion_status: CompletionStatus;
}

export interface MasteryService {
  submitAssessmentEvidence(
    input: SubmitAssessmentEvidenceInput,
  ): Promise<SubmitAssessmentEvidenceResult>;
}

export function masteryFromCorrectCount(
  correctCount: number,
  setSize = PRACTICE_SET_SIZE,
): Exclude<Mastery, 0> {
  if (setSize !== PRACTICE_SET_SIZE) {
    throw new Error(
      `Mastery evidence requires exactly ${PRACTICE_SET_SIZE} resolved slots.`,
    );
  }

  if (!Number.isInteger(correctCount) || correctCount < 0 || correctCount > setSize) {
    throw new Error("Correct count must be an integer within the practice-set size.");
  }

  if (correctCount === GOLD_CORRECT_COUNT) {
    return 3;
  }

  return correctCount >= MASTERY_CORRECT_COUNT ? 2 : 1;
}

/**
 * The persisted mastery produced by a perfect practice set: the canonical three-star,
 * celebratory-gold state. Derived through the service mapping so fixtures and callers do not
 * encode the current numeric tier independently from the evidence rule.
 */
export const GOLD_MASTERY: Mastery = masteryFromCorrectCount(GOLD_CORRECT_COUNT);

/**
 * **THE PERSISTED `mastery` A LEARNER REACHES BY SCORING THE BAR** — the one place
 * "four of five correct" and a stored mastery value are joined, and it is DERIVED
 * from {@link masteryFromCorrectCount} rather than written down beside it.
 *
 * Every consumer that wants to ask "did this learner clear the bar?" reads a
 * persisted `mastery`, never a correct count: the count exists only inside one
 * submission, and `submitAssessmentEvidence` keeps the running MAX of it. So the two
 * have to be mapped, and a mapping transcribed as a literal `2` is a second opinion
 * waiting to go stale — the day the bar moves to 3 of 5 or the set size changes, this
 * constant moves with it and a hardcoded `2` would not.
 *
 * Note what this is NOT: it is not the same statement as
 * {@link completionStatusForMastery}. That function happens to switch at the same
 * value today, but `completion_status` is also written by the diagnostic test-out
 * seed at `mastery: 0`, so "complete" and "cleared the bar" are different claims and
 * the economy's lesson grant needs the second one.
 */
export const MASTERY_BAR: Mastery = masteryFromCorrectCount(MASTERY_CORRECT_COUNT);

/**
 * **THE LOWEST `mastery` A SCORED PRACTICE SET CAN LEAVE** — so `mastery >= this` is the
 * predicate for "the learner has actually worked this node's set", as distinct from the
 * node merely reading finished.
 *
 * Derived by asking {@link masteryFromCorrectCount} for the worst possible score rather
 * than by writing 1 down, which is the same discipline {@link MASTERY_BAR} follows: the
 * two constants are the floor and the bar of one mapping, and either could move.
 *
 * It matters because THREE other signals look like this one and are not: a diagnostic
 * test-out writes `completion_status: "complete"`, `lesson_stage: "done"` and a passed
 * `placement_estimate` while leaving `mastery: 0`, so all three admit nodes the learner
 * has never practised. `apps/web/src/lessons/lessonProgress.ts` re-exports this rather
 * than declaring its own copy, so the drill's completion gate and the city's population
 * cannot come to disagree about what "practised" means.
 */
export const PRACTICED_MASTERY: Mastery = masteryFromCorrectCount(0);

export function completionStatusForMastery(mastery: Mastery): CompletionStatus {
  if (mastery >= 2) {
    return "complete";
  }

  return mastery === 1 ? "in_progress" : "locked";
}

/** The mastery snapshot the service reads before applying the monotonic max. */
export interface StoredMastery {
  mastery: Mastery;
  completion_status: CompletionStatus;
}

/**
 * Injected persistence boundary. The service never issues SQL; a repository
 * adapter (Aurora, in-memory, etc.) implements these calls. The service is the
 * only writer of `mastery`/`completion_status`, so `setMastery` is the sole write.
 */
export interface MasteryStateStore {
  /** Current stored mastery for the node, or `null` when never evidenced (treated as 0). */
  getMastery(node_id: string): Promise<StoredMastery | null> | StoredMastery | null;
  /** Persist a raised mastery + its derived completion status for one node only. */
  setMastery(
    node_id: string,
    mastery: Mastery,
    completion_status: CompletionStatus,
  ): Promise<void> | void;
  /** Prior result for an `evidence_id`, or `null` if this submission is new. */
  getEvidenceResult(
    evidence_id: string,
  ): Promise<SubmitAssessmentEvidenceResult | null> | SubmitAssessmentEvidenceResult | null;
  /** Record the result under `evidence_id` so replays become no-ops. */
  recordEvidenceResult(
    evidence_id: string,
    result: SubmitAssessmentEvidenceResult,
  ): Promise<void> | void;
}

/**
 * Authoritative, server-side correctness recompute for a single response. Injected
 * so the real Lambda/answer-checker can be wired later without this package
 * depending on the scorer. `client_correct` is intentionally never consulted; the
 * response carries only the raw answer + version refs. Reveal/hint handling is
 * applied by the service, so this function reports pure answer correctness.
 */
export type ResponseCorrectness = (
  response: EvidenceResponse,
  context: {
    node_id: string;
    context: SubmitAssessmentEvidenceInput["context"];
  },
) => Promise<boolean> | boolean;

export interface MasteryServiceDeps {
  store: MasteryStateStore;
  recomputeCorrectness: ResponseCorrectness;
}

/**
 * Returns whether a single resolved slot counts as correct for mastery:
 * a revealed slot is never correct (Mastery_Scoring_Spec §4); hints do not
 * reduce credit, so `hints_used` is ignored here (logged, not scored).
 */
async function slotIsCorrect(
  response: EvidenceResponse,
  recompute: ResponseCorrectness,
  context: { node_id: string; context: SubmitAssessmentEvidenceInput["context"] },
): Promise<boolean> {
  if (response.revealed) {
    return false;
  }

  return await recompute(response, context);
}

export function createMasteryService(deps: MasteryServiceDeps): MasteryService {
  const { store, recomputeCorrectness } = deps;

  return {
    async submitAssessmentEvidence(input) {
      const prior = await store.getEvidenceResult(input.evidence_id);

      if (prior) {
        return { ...prior, changed: false };
      }

      let correctCount = 0;

      for (const response of input.responses) {
        if (
          await slotIsCorrect(response, recomputeCorrectness, {
            node_id: input.node_id,
            context: input.context,
          })
        ) {
          correctCount += 1;
        }
      }

      const evidenced = masteryFromCorrectCount(correctCount, input.responses.length);
      const existingState = await store.getMastery(input.node_id);
      const existing: Mastery = existingState?.mastery ?? 0;
      const mastery: Mastery = existing >= evidenced ? existing : evidenced;
      const changed = mastery > existing;
      const completion_status = completionStatusForMastery(mastery);

      if (changed) {
        await store.setMastery(input.node_id, mastery, completion_status);
      }

      const result: SubmitAssessmentEvidenceResult = {
        node_id: input.node_id,
        mastery,
        changed,
        completion_status,
      };

      await store.recordEvidenceResult(input.evidence_id, result);

      return result;
    },
  };
}
