import type { DataApiExecutor } from "@cr/db";
import type { UUID } from "@cr/state-schema";

/**
 * Durable evidence that an account is no longer untouched.
 *
 * The city bootstrap is allowed to create only an empty Prehistoric founding record. Any
 * diagnostic, learning, city, or economy row must win instead. Child diagnostic tables are
 * covered by `assessment_administration` (their required parent), and mastery/economy commands
 * create a node or ledger row in the same transaction.
 */
export const ACCOUNT_STATE_EXISTS_SQL = `select true as present
  where exists (
    select 1 from public.assessment_administration where student_id = :sid::uuid
  ) or exists (
    select 1 from public.student_node_state where student_id = :sid::uuid
  ) or exists (
    select 1 from public.neighborhood_state where student_id = :sid::uuid
  ) or exists (
    select 1 from public.city_state where student_id = :sid::uuid
  ) or exists (
    select 1 from public.city_island_state where student_id = :sid::uuid
  ) or exists (
    select 1 from public.city_placement where student_id = :sid::uuid
  ) or exists (
    select 1 from public.city_road where student_id = :sid::uuid
  ) or exists (
    select 1 from public.city_crisis_damage where student_id = :sid::uuid
  ) or exists (
    select 1 from public.resource_grant_ledger where student_id = :sid::uuid
  )`;

/** Whether the canonical database has any first-use, progress, era, or economy state. */
export async function accountHasCanonicalState(
  db: DataApiExecutor,
  studentId: UUID,
): Promise<boolean> {
  const rows = await db.query<{ present: boolean }>(ACCOUNT_STATE_EXISTS_SQL, {
    sid: studentId,
  });
  return rows[0]?.present === true;
}
