import { type AnswerStatus, checkAnswer } from "@cr/components";
import type {
  EvidenceResponse,
  MasteryService,
  SubmitAssessmentEvidenceInput,
  SubmitAssessmentEvidenceResult,
} from "@cr/mastery-service";
import { PRACTICE_SET_SIZE } from "@cr/mastery-service";
import { getLessonShells, getNodesByScope } from "@cr/skill-graph";
import type { LessonStage, UUID } from "@cr/state-schema";

export interface LessonShellManifest {
  shell_id: string;
  node_ids: readonly string[];
}

export function getMvpLessonShellManifests(): readonly LessonShellManifest[] {
  const mvpNodes = getNodesByScope("mvp");

  return getLessonShells("mvp").map((shellId) => ({
    shell_id: shellId,
    node_ids: mvpNodes
      .filter((node) => node.lesson_shell === shellId)
      .map((node) => node.id),
  }));
}

/**
 * One concrete presentation of a practice item. A reveal retires the instance and
 * a fresh instance (number-swapped or a sibling from the bank) takes its place.
 */
export interface PracticeItemInstance {
  item_id: string;
  item_version: number;
  /** Immutable snapshot id passed to `checkAnswer` (never the mutable `item_id`). */
  item_version_id: string;
  equivalence_checker_version: number;
  template_id?: string;
  template_params?: Readonly<Record<string, unknown>>;
}

export interface SlotSubmission {
  raw_answer: unknown;
  time_on_item_ms: number;
  /** Feedback/logging only; never an input to the 4/5 mastery score. */
  misconception_tag?: string;
}

export interface SlotView {
  slot: number;
  instance: PracticeItemInstance;
  hints_used: number;
  revealed: boolean;
  attempt: number;
  has_provisional: boolean;
}

export interface SlotOutcome {
  status: AnswerStatus;
  reason_code: string;
  /** Client-side grade for instant UX only; never the authoritative mastery input. */
  client_correct: boolean;
  /** True when the grade produced a provisional resolution the caller can commit. */
  resolved: boolean;
  /** True when the current instance was revealed and needs a fresh-instance retry. */
  requires_fresh_instance: boolean;
}

const LESSON_CONTEXT: SubmitAssessmentEvidenceInput["context"] = "lesson";

/** Application faults + malformed input never resolve a slot (treated as unanswered). */
function isResolvingStatus(status: AnswerStatus): boolean {
  return status === "correct" || status === "incorrect";
}

interface SlotState {
  instance: PracticeItemInstance;
  hints_used: number;
  revealed: boolean;
  attempt: number;
  provisional: EvidenceResponse | null;
  resolution: EvidenceResponse | null;
}

export interface LessonSessionOptions {
  node_id: string;
  /** Framework-agnostic identity passthrough; the service reads identity from auth. */
  student_id?: UUID;
  context?: SubmitAssessmentEvidenceInput["context"];
  /** Exactly `PRACTICE_SET_SIZE` initial instances, one per slot. */
  items: readonly PracticeItemInstance[];
}

/**
 * Pure-TS orchestration for a single node's lesson: a `not_started -> teaching ->
 * practice -> done` stage machine plus the practice-set orchestrator. No React and
 * no direct state writes beyond `lesson_stage`; mastery flows only through
 * `submitAssessmentEvidence`.
 */
export interface LessonSession {
  readonly node_id: string;
  getStage(): LessonStage;

  startTeaching(): void;
  submitCheckForUnderstanding(passed: boolean): void;
  isCheckForUnderstandingPassed(): boolean;
  startPractice(): void;

  getCurrentSlot(): SlotView | null;
  useHint(): number;
  reveal(): void;
  retryWithFreshInstance(instance: PracticeItemInstance): void;
  submitAnswer(submission: SlotSubmission): SlotOutcome;
  advanceSlot(): void;
  /**
   * Resolve a REVEALED slot as not-correct and advance (the student gives up
   * instead of retrying a fresh instance). Per Mastery_Scoring_Spec §4 a revealed
   * slot never counts as correct, so this closes the slot with a `revealed`
   * response the mastery service scores as incorrect. Throws unless the current
   * slot has been revealed.
   */
  skipRevealedSlot(time_on_item_ms?: number): void;
  isPracticeComplete(): boolean;
  submitPractice(evidence_id: string): Promise<SubmitAssessmentEvidenceResult>;
}

function createLessonSession(
  masteryService: MasteryService,
  options: LessonSessionOptions,
): LessonSession {
  const context = options.context ?? LESSON_CONTEXT;
  let stage: LessonStage = "not_started";
  let cfuPassed = false;
  let slots: SlotState[] = [];
  let currentSlot = 0;

  function requireStage(expected: LessonStage, action: string): void {
    if (stage !== expected) {
      throw new Error(
        `Cannot ${action} while lesson_stage is "${stage}" (expected "${expected}").`,
      );
    }
  }

  function activeSlot(): SlotState {
    requireStage("practice", "operate on a practice slot");

    const slot = slots[currentSlot];

    if (!slot) {
      throw new Error("Practice set is already complete.");
    }

    return slot;
  }

  return {
    node_id: options.node_id,

    getStage() {
      return stage;
    },

    startTeaching() {
      requireStage("not_started", "start teaching");
      stage = "teaching";
    },

    submitCheckForUnderstanding(passed) {
      requireStage("teaching", "submit the check-for-understanding");
      cfuPassed = passed;
    },

    isCheckForUnderstandingPassed() {
      return cfuPassed;
    },

    startPractice() {
      requireStage("teaching", "start practice");

      if (!cfuPassed) {
        throw new Error("The check-for-understanding must pass before practice.");
      }

      if (options.items.length !== PRACTICE_SET_SIZE) {
        throw new Error(
          `A practice set needs exactly ${PRACTICE_SET_SIZE} items (got ${options.items.length}).`,
        );
      }

      slots = options.items.map((instance) => ({
        instance,
        hints_used: 0,
        revealed: false,
        attempt: 1,
        provisional: null,
        resolution: null,
      }));
      currentSlot = 0;
      stage = "practice";
    },

    getCurrentSlot() {
      const slot = slots[currentSlot];

      if (stage !== "practice" || !slot) {
        return null;
      }

      return {
        slot: currentSlot,
        instance: slot.instance,
        hints_used: slot.hints_used,
        revealed: slot.revealed,
        attempt: slot.attempt,
        has_provisional: slot.provisional !== null,
      };
    },

    useHint() {
      const slot = activeSlot();
      slot.hints_used += 1;
      return slot.hints_used;
    },

    reveal() {
      const slot = activeSlot();
      slot.revealed = true;
      // A revealed instance can never resolve; the caller must retry a fresh one.
      slot.provisional = null;
    },

    retryWithFreshInstance(instance) {
      const slot = activeSlot();
      slot.instance = instance;
      slot.hints_used = 0;
      slot.revealed = false;
      slot.provisional = null;
      slot.attempt += 1;
    },

    submitAnswer(submission) {
      const slot = activeSlot();
      const result = checkAnswer({
        raw_answer: submission.raw_answer,
        item_version_id: slot.instance.item_version_id,
        equivalence_checker_version: slot.instance.equivalence_checker_version,
      });

      if (slot.revealed) {
        return {
          status: result.status,
          reason_code: result.reason_code,
          client_correct: result.client_correct,
          resolved: false,
          requires_fresh_instance: true,
        };
      }

      if (!isResolvingStatus(result.status)) {
        // invalid_input (re-prompt) or an application fault: never a student-wrong.
        return {
          status: result.status,
          reason_code: result.reason_code,
          client_correct: result.client_correct,
          resolved: false,
          requires_fresh_instance: false,
        };
      }

      slot.provisional = {
        item_id: slot.instance.item_id,
        item_version: slot.instance.item_version,
        template_id: slot.instance.template_id,
        template_params: slot.instance.template_params,
        raw_answer: submission.raw_answer,
        hints_used: slot.hints_used,
        revealed: false,
        attempt: slot.attempt,
        time_on_item_ms: submission.time_on_item_ms,
        misconception_tag: submission.misconception_tag,
      };

      return {
        status: result.status,
        reason_code: result.reason_code,
        client_correct: result.client_correct,
        resolved: true,
        requires_fresh_instance: false,
      };
    },

    advanceSlot() {
      const slot = activeSlot();

      if (slot.revealed) {
        throw new Error(
          "Revealed slot must be retried on a fresh instance before advancing.",
        );
      }

      if (!slot.provisional) {
        throw new Error("Submit an answer before advancing the slot.");
      }

      slot.resolution = slot.provisional;
      currentSlot += 1;
    },

    skipRevealedSlot(time_on_item_ms = 0) {
      const slot = activeSlot();

      if (!slot.revealed) {
        throw new Error("Only a revealed slot can be skipped; reveal it first.");
      }

      // Close the slot with a revealed response: the mastery service scores any
      // `revealed` slot as not-correct, so giving up costs the credit (spec §4).
      slot.resolution = {
        item_id: slot.instance.item_id,
        item_version: slot.instance.item_version,
        template_id: slot.instance.template_id,
        template_params: slot.instance.template_params,
        raw_answer: null,
        hints_used: slot.hints_used,
        revealed: true,
        attempt: slot.attempt,
        time_on_item_ms,
      };
      currentSlot += 1;
    },

    isPracticeComplete() {
      return (
        stage === "practice" &&
        slots.length === PRACTICE_SET_SIZE &&
        slots.every((slot) => slot.resolution !== null)
      );
    },

    async submitPractice(evidence_id) {
      requireStage("practice", "submit practice evidence");

      const responses = slots.map((slot) => {
        if (!slot.resolution) {
          throw new Error("All practice slots must be resolved before submitting.");
        }

        return slot.resolution;
      });

      const result = await masteryService.submitAssessmentEvidence({
        student_id: options.student_id ?? "",
        context,
        node_id: options.node_id,
        responses,
        evidence_id,
      });

      stage = "done";
      return result;
    },
  };
}

export interface LessonEngine {
  submitPracticeEvidence(
    input: SubmitAssessmentEvidenceInput,
  ): Promise<SubmitAssessmentEvidenceResult>;
  startLesson(options: LessonSessionOptions): LessonSession;
}

export function createLessonEngine(masteryService: MasteryService): LessonEngine {
  return {
    submitPracticeEvidence(input) {
      return masteryService.submitAssessmentEvidence(input);
    },
    startLesson(options) {
      return createLessonSession(masteryService, options);
    },
  };
}
