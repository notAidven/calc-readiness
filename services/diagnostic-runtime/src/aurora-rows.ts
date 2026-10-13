import { parseJsonColumn } from "@cr/db";
import type {
  AssessmentAdministration,
  AssessmentItemResponse,
  CompletionStatus,
  LessonStage,
  Mastery,
  NeighborhoodState,
  PlacementEstimate,
  ScoringStatus,
  StudentNodeState,
  UUID,
} from "@cr/state-schema";

/**
 * Row <-> domain mapping for the Data API. `formatRecordsAs: "JSON"` returns
 * records keyed by column name, but timestamptz/jsonb serialization is
 * driver-dependent, so we (a) format every timestamp to canonical ISO-8601 UTC in
 * SQL via {@link iso} and (b) `parseJsonColumn` the jsonb columns defensively.
 */

/** ISO-8601 UTC millisecond text for a timestamptz column (stable across drivers). */
function iso(column: string): string {
  return `to_char(${column} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
}

/** `assessment_administration` projection with ISO-normalized timestamps. */
export const ADMINISTRATION_COLUMNS = [
  "administration_id",
  "student_id",
  "purpose",
  "form_id",
  "form_version",
  "blueprint_version",
  "scoring_engine_version",
  "scoring_model_version",
  "equivalence_checker_version",
  "routing_path",
  `${iso("started_at")} as started_at`,
  `${iso("submitted_at")} as submitted_at`,
].join(", ");

/** `student_node_state` projection with ISO-normalized timestamps. */
export const STUDENT_NODE_STATE_COLUMNS = [
  "student_id",
  "node_id",
  "placement_estimate",
  "mastery",
  `${iso("mastery_updated_at")} as mastery_updated_at`,
  "completion_status",
  "lesson_stage",
  `${iso("last_practiced_at")} as last_practiced_at`,
].join(", ");

export interface AdministrationRow {
  administration_id: UUID;
  student_id: UUID;
  purpose: AssessmentAdministration["purpose"];
  form_id: string;
  form_version: number;
  blueprint_version: number;
  scoring_engine_version: number;
  scoring_model_version: number;
  equivalence_checker_version: number;
  routing_path: unknown;
  started_at: string;
  submitted_at: string | null;
}

export function toAdministration(row: AdministrationRow): AssessmentAdministration {
  return {
    administration_id: row.administration_id,
    student_id: row.student_id,
    purpose: row.purpose,
    form_id: row.form_id,
    form_version: row.form_version,
    blueprint_version: row.blueprint_version,
    scoring_engine_version: row.scoring_engine_version,
    scoring_model_version: row.scoring_model_version,
    equivalence_checker_version: row.equivalence_checker_version,
    routing_path:
      row.routing_path == null ? null : parseJsonColumn<string[]>(row.routing_path),
    started_at: row.started_at,
    submitted_at: row.submitted_at,
  };
}

export interface StudentNodeStateRow {
  student_id: UUID;
  node_id: string;
  placement_estimate: number;
  mastery: number;
  mastery_updated_at: string | null;
  completion_status: CompletionStatus;
  lesson_stage: LessonStage;
  last_practiced_at: string | null;
}

export function toNodeState(row: StudentNodeStateRow): StudentNodeState {
  return {
    student_id: row.student_id,
    node_id: row.node_id,
    // smallint columns are CHECK-constrained 0-3 in the schema (0001).
    placement_estimate: row.placement_estimate as PlacementEstimate,
    mastery: row.mastery as Mastery,
    mastery_updated_at: row.mastery_updated_at,
    completion_status: row.completion_status,
    lesson_stage: row.lesson_stage,
    last_practiced_at: row.last_practiced_at,
  };
}

export interface NeighborhoodStateRow {
  student_id: UUID;
  neighborhood_id: string;
  checkpoint_cleared: boolean;
}

export function toNeighborhood(row: NeighborhoodStateRow): NeighborhoodState {
  return {
    student_id: row.student_id,
    neighborhood_id: row.neighborhood_id,
    checkpoint_cleared: row.checkpoint_cleared,
  };
}

export interface ResponseRow {
  administration_id: UUID;
  item_version_id: string;
  node_id: string;
  raw_answer: unknown;
  item_definition_hash: string;
  equivalence_checker_version: number;
  client_correct: boolean;
  authoritative_correct: boolean;
  scoring_status: ScoringStatus;
  reason_code: string;
  seq: number;
}

export function toResponse(row: ResponseRow): AssessmentItemResponse {
  return {
    administration_id: row.administration_id,
    item_version_id: row.item_version_id,
    node_id: row.node_id,
    raw_answer: parseJsonColumn<unknown>(row.raw_answer),
    item_definition_hash: row.item_definition_hash,
    equivalence_checker_version: row.equivalence_checker_version,
    client_correct: row.client_correct,
    authoritative_correct: row.authoritative_correct,
    scoring_status: row.scoring_status,
    reason_code: row.reason_code,
  };
}
