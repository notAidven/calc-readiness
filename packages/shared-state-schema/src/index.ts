/**
 * Frozen shared records from docs/Contracts.md.
 * Keep wire names in snake_case so database rows and API payloads do not drift.
 */

export type UUID = string;
export type ISODateTime = string;

/** Slice 2 server-owned account lifecycle contract; Slice 1 creates no row or deletion API. */
export type LearnerAccountStatus = "active" | "deletion_pending";
export const ACCOUNT_DELETION_RECOVERY_DAYS = 30;

export interface LearnerAccountLifecycle {
  readonly student_id: UUID;
  readonly status: LearnerAccountStatus;
  readonly deletion_requested_at: ISODateTime | null;
  readonly purge_after: ISODateTime | null;
}

/** Client capability projection only. The server must independently reject pending accounts. */
export function accountAccessEnabled(status: LearnerAccountStatus): boolean {
  return status === "active";
}

export type PlacementEstimate = 0 | 1 | 2 | 3;
export type Mastery = 0 | 1 | 2 | 3;
export type CompletionStatus = "locked" | "in_progress" | "complete";
export type LessonStage = "not_started" | "teaching" | "practice" | "done";
export type AssessmentPurpose = "pre" | "post" | "placement";
export type ScoringStatus =
  | "correct"
  | "incorrect"
  | "invalid_input"
  | "unsupported_expression"
  | "scoring_error";

export interface StudentNodeState {
  student_id: UUID;
  node_id: string;
  placement_estimate: PlacementEstimate;
  mastery: Mastery;
  mastery_updated_at: ISODateTime | null;
  completion_status: CompletionStatus;
  lesson_stage: LessonStage;
  last_practiced_at: ISODateTime | null;
}

export interface NeighborhoodState {
  student_id: UUID;
  neighborhood_id: string;
  checkpoint_cleared: boolean;
}

export interface AssessmentAdministration {
  administration_id: UUID;
  student_id: UUID;
  purpose: AssessmentPurpose;
  form_id: string;
  form_version: number;
  blueprint_version: number;
  scoring_engine_version: number;
  /** Adaptive frontier scoring model in force; pre and post must share it. Adaptive-diagnostic amendment (ratified 2026-07-20). */
  scoring_model_version: number;
  equivalence_checker_version: number;
  /** Ordered stage ids served (null until finalized), for deterministic recompute. Adaptive-diagnostic amendment (ratified 2026-07-20). */
  routing_path: readonly string[] | null;
  started_at: ISODateTime;
  submitted_at: ISODateTime | null;
}

/** Client-to-scorer payload before an immutable response record is finalized. */
export interface AssessmentItemSubmission {
  administration_id: UUID;
  item_version_id: string;
  node_id: string;
  raw_answer: unknown;
  item_definition_hash: string;
  equivalence_checker_version: number;
  client_correct: boolean;
}

/** Final, append-only response record produced by the authoritative scorer. */
export interface AssessmentItemResponse extends AssessmentItemSubmission {
  authoritative_correct: boolean;
  scoring_status: ScoringStatus;
  reason_code: string;
}
