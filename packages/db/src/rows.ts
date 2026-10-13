import type { AssessmentItemResponse, ISODateTime, UUID } from "@cr/state-schema";

/** Postgres `jsonb`-compatible value. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * `assessment_item_response` row + the server-assigned `seq` ordering column
 * (migration 0002, additive amendment). `seq` is `generated always as identity`,
 * so it is present on every read and MUST be omitted on insert; the measurement
 * read path orders by it to reproduce served order. Hand-written to match the
 * Postgres schema in `db/migrations` (the DB contract is storage-layer-agnostic).
 */
export interface AssessmentItemResponseRow extends AssessmentItemResponse {
  seq: number;
}

/**
 * `assessment_administration_progress` (migration 0002): the engine's ephemeral
 * working state between adaptive turns. NOT a frozen immutable record — `served`
 * and `outcomes` are jsonb payloads the diagnostic-runtime adapter (de)serializes
 * to the engine's `AdministrationProgress` (kept as `Json` here so this package
 * stays engine-agnostic).
 */
export interface AssessmentAdministrationProgressRow {
  administration_id: UUID;
  student_id: UUID;
  current_stage_id: string | null;
  served: Json;
  outcomes: Json;
  status: string;
  updated_at: ISODateTime;
}
