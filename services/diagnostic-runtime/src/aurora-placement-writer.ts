import type { DataApiExecutor } from "@cr/db";
import type { PlacementWriter } from "@cr/diagnostic";

/**
 * Seeds `student_node_state.placement_estimate` (the ONLY per-node field the
 * diagnostic writes; never `mastery` — Contracts §1/§3, INV-DIAG-1). Placement is
 * write-once at onboarding and immutable thereafter, so this inserts with
 * `on conflict do nothing` (first write wins) rather than overwriting a seed.
 */
export function createAuroraPlacementWriter(exec: DataApiExecutor): PlacementWriter {
  return {
    async writePlacement(input): Promise<void> {
      await exec.execute(
        `insert into public.student_node_state (student_id, node_id, placement_estimate)
         values (:student_id::uuid, :node_id, :placement_estimate)
         on conflict (student_id, node_id) do nothing`,
        {
          student_id: input.student_id,
          node_id: input.node_id,
          placement_estimate: input.placement_estimate,
        },
      );
    },
  };
}
