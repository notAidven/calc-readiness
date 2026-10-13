import type { DomainId } from "@cr/skill-graph";
import type { NeighborhoodState, UUID } from "@cr/state-schema";

/**
 * The single shared learning-state write the game makes (Contracts §3).
 *
 * When the storm is beaten the game sets `neighborhood_state.checkpoint_cleared`
 * through this GAME-OWNED port — never through an economy service. The storm
 * reads mastery and controls exactly this one flag; it NEVER writes `mastery` or
 * `placement_estimate` and NEVER submits mastery evidence. `checkpoint_cleared`
 * is a progression/cosmetic flag, gated on all required nodes already being
 * mastered (>= 2), so a storm can never "master" an unfinished node.
 *
 * The MVP D1 demo backs this with an in-memory writer (see
 * `apps/web/src/city/citySession.ts`); a persistent implementation would set the
 * caller's single `neighborhood_state` row and nothing else.
 */
export interface CheckpointWriter {
  clearCheckpoint(input: {
    student_id: UUID;
    neighborhood_id: DomainId;
  }): Promise<NeighborhoodState>;
}
