import { type DataApiExecutor, json, parseJsonColumn } from "@cr/db";
import type { WalkProgressStore, WalkState } from "@cr/diagnostic";
import type { UUID } from "@cr/state-schema";

interface WalkRow {
  administration_id: UUID;
  state: unknown;
}

/**
 * `WalkProgressStore` over the RDS Data API — the v2 analogue of v1's stage
 * `AdministrationProgress` store. Round-trips the engine's ephemeral `WalkState`
 * through `assessment_administration_walk` (a single jsonb `state` column; 0003
 * migration). Like `saveProgress`, `student_id` is derived from the administration
 * row in the same statement so the writer never trusts a client-supplied id
 * (mirrors the RLS invariant). Pass a transaction-scoped {@link DataApiExecutor} to
 * make a whole walk turn (score + persist) atomic.
 */
export function createAuroraWalkStore(exec: DataApiExecutor): WalkProgressStore {
  return {
    async getWalk(administrationId: UUID): Promise<WalkState | null> {
      const rows = await exec.query<WalkRow>(
        `select administration_id, state
           from public.assessment_administration_walk
           where administration_id = :id::uuid`,
        { id: administrationId },
      );
      const row = rows[0];
      if (!row) {
        return null;
      }
      return parseJsonColumn<WalkState>(row.state);
    },

    async saveWalk(administrationId: UUID, state: WalkState): Promise<void> {
      await exec.execute(
        `insert into public.assessment_administration_walk
           (administration_id, student_id, state, updated_at)
         select :administration_id::uuid, a.student_id, :state::jsonb, :updated_at::timestamptz
           from public.assessment_administration a
           where a.administration_id = :administration_id::uuid
         on conflict (administration_id) do update set
           state = excluded.state,
           updated_at = excluded.updated_at`,
        {
          administration_id: administrationId,
          state: json(state),
          updated_at: new Date().toISOString(),
        },
      );
    },
  };
}
