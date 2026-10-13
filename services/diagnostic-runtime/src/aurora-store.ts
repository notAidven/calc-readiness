import { type DataApiExecutor, json, parseJsonColumn } from "@cr/db";
import type {
  AdministrationProgress,
  DiagnosticAdministrationStore,
  NewAdministration,
  ServedItemRef,
  StageOutcome,
} from "@cr/diagnostic";
import type { AssessmentAdministration, UUID } from "@cr/state-schema";

import {
  ADMINISTRATION_COLUMNS,
  type AdministrationRow,
  toAdministration,
} from "./aurora-rows";
import { randomUuid } from "./ids";

interface ProgressRow {
  administration_id: UUID;
  current_stage_id: string | null;
  served: unknown;
  outcomes: unknown;
  status: string;
}

/**
 * `DiagnosticAdministrationStore` over the RDS Data API. Creates and reads the
 * immutable `assessment_administration`, round-trips the engine's ephemeral
 * progress through `assessment_administration_progress` (jsonb), and finalizes
 * `routing_path` + `submitted_at` (the only post-creation writes; Contracts §2,
 * INV-DIAG-4). Pass a transaction-scoped {@link DataApiExecutor} to make a whole
 * engine operation atomic; the root client works for single-statement calls.
 */
export function createAuroraDiagnosticStore(
  exec: DataApiExecutor,
): DiagnosticAdministrationStore {
  return {
    async createAdministration(
      input: NewAdministration,
    ): Promise<AssessmentAdministration> {
      const rows = await exec.query<AdministrationRow>(
        `insert into public.assessment_administration
           (administration_id, student_id, purpose, form_id, form_version, blueprint_version,
            scoring_engine_version, scoring_model_version, equivalence_checker_version,
            routing_path, started_at, submitted_at)
         values
           (:administration_id::uuid, :student_id::uuid, :purpose::public.assessment_purpose,
            :form_id, :form_version, :blueprint_version, :scoring_engine_version,
            :scoring_model_version, :equivalence_checker_version, :routing_path::jsonb,
            :started_at::timestamptz, :submitted_at::timestamptz)
         returning ${ADMINISTRATION_COLUMNS}`,
        {
          administration_id: randomUuid(),
          student_id: input.student_id,
          purpose: input.purpose,
          form_id: input.form_id,
          form_version: input.form_version,
          blueprint_version: input.blueprint_version,
          scoring_engine_version: input.scoring_engine_version,
          scoring_model_version: input.scoring_model_version,
          equivalence_checker_version: input.equivalence_checker_version,
          routing_path: json(null),
          started_at: new Date().toISOString(),
          submitted_at: null,
        },
      );
      const row = rows[0];
      if (!row) {
        throw new Error("failed to create administration: no row returned");
      }
      return toAdministration(row);
    },

    async getAdministration(administrationId: UUID): Promise<AssessmentAdministration> {
      const rows = await exec.query<AdministrationRow>(
        `select ${ADMINISTRATION_COLUMNS} from public.assessment_administration
           where administration_id = :id::uuid`,
        { id: administrationId },
      );
      const row = rows[0];
      if (!row) {
        throw new Error(`unknown administration ${administrationId}: not found`);
      }
      return toAdministration(row);
    },

    async getProgress(administrationId: UUID): Promise<AdministrationProgress | null> {
      const rows = await exec.query<ProgressRow>(
        `select administration_id, current_stage_id, served, outcomes, status
           from public.assessment_administration_progress
           where administration_id = :id::uuid`,
        { id: administrationId },
      );
      const row = rows[0];
      if (!row) {
        return null;
      }
      return {
        administration_id: row.administration_id,
        current_stage_id: row.current_stage_id,
        served: parseJsonColumn<ServedItemRef[]>(row.served ?? []),
        outcomes: parseJsonColumn<StageOutcome[]>(row.outcomes ?? []),
        status: row.status === "complete" ? "complete" : "in_progress",
      };
    },

    async saveProgress(progress: AdministrationProgress): Promise<void> {
      // Derive student_id from the administration row (created in the same flow) so
      // the writer never trusts a client-supplied id — mirrors the RLS invariant.
      await exec.execute(
        `insert into public.assessment_administration_progress
           (administration_id, student_id, current_stage_id, served, outcomes, status, updated_at)
         select :administration_id::uuid, a.student_id, :current_stage_id::text,
                :served::jsonb, :outcomes::jsonb, :status::text, :updated_at::timestamptz
           from public.assessment_administration a
           where a.administration_id = :administration_id::uuid
         on conflict (administration_id) do update set
           current_stage_id = excluded.current_stage_id,
           served = excluded.served,
           outcomes = excluded.outcomes,
           status = excluded.status,
           updated_at = excluded.updated_at`,
        {
          administration_id: progress.administration_id,
          current_stage_id: progress.current_stage_id,
          served: json(progress.served),
          outcomes: json(progress.outcomes),
          status: progress.status,
          updated_at: new Date().toISOString(),
        },
      );
    },

    async finalizeAdministration(input: {
      administration_id: UUID;
      routing_path: readonly string[];
    }): Promise<AssessmentAdministration> {
      const rows = await exec.query<AdministrationRow>(
        `update public.assessment_administration
           set routing_path = :routing_path::jsonb, submitted_at = :submitted_at::timestamptz
           where administration_id = :id::uuid
           returning ${ADMINISTRATION_COLUMNS}`,
        {
          id: input.administration_id,
          routing_path: json(input.routing_path),
          submitted_at: new Date().toISOString(),
        },
      );
      const row = rows[0];
      if (!row) {
        throw new Error(
          `failed to finalize administration ${input.administration_id}: no row returned`,
        );
      }
      return toAdministration(row);
    },
  };
}
