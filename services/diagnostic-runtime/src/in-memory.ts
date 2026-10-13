import type {
  AdministrationProgress,
  DiagnosticAdministrationStore,
  NewAdministration,
  PlacementWriter,
  WalkProgressStore,
  WalkState,
} from "@cr/diagnostic";
import type { AssessmentResponseRepository } from "@cr/scorer";
import type {
  AssessmentAdministration,
  AssessmentItemResponse,
  PlacementEstimate,
  UUID,
} from "@cr/state-schema";

import { randomUuid } from "./ids";

/**
 * Shipped in-memory doubles of the three persistence ports. They promote the
 * engine's test fakes to a supported dev/test implementation so the full
 * diagnostic -> measurement loop runs with zero infrastructure (CI-safe), and so
 * the Aurora (RDS Data API) adapters have a behavioural reference.
 */

export interface InMemoryDiagnosticStore extends DiagnosticAdministrationStore {
  /** Every administration created/finalized, keyed by id (finalized rows carry routing_path). */
  readonly administrations: ReadonlyMap<string, AssessmentAdministration>;
}

export interface InMemoryResponseRepository extends AssessmentResponseRepository {
  /** The append-only response log, in served (append) order. */
  readonly responses: readonly AssessmentItemResponse[];
}

export interface InMemoryPlacementWriter extends PlacementWriter {
  readonly writes: readonly {
    student_id: UUID;
    node_id: string;
    placement_estimate: PlacementEstimate;
  }[];
}

export interface InMemoryWalkStore extends WalkProgressStore {
  /** Every persisted walk state, keyed by administration id (last write wins). */
  readonly walks: ReadonlyMap<string, WalkState>;
}

export function createInMemoryDiagnosticStore(options?: {
  now?: () => string;
  administrations?: readonly AssessmentAdministration[];
}): InMemoryDiagnosticStore {
  const now = options?.now ?? (() => new Date().toISOString());
  const administrations = new Map<string, AssessmentAdministration>(
    (options?.administrations ?? []).map((administration) => [
      administration.administration_id,
      administration,
    ]),
  );
  const progressByAdministration = new Map<string, AdministrationProgress>();

  return {
    administrations,
    async createAdministration(
      input: NewAdministration,
    ): Promise<AssessmentAdministration> {
      const administration: AssessmentAdministration = {
        administration_id: randomUuid(),
        student_id: input.student_id,
        purpose: input.purpose,
        form_id: input.form_id,
        form_version: input.form_version,
        blueprint_version: input.blueprint_version,
        scoring_engine_version: input.scoring_engine_version,
        scoring_model_version: input.scoring_model_version,
        equivalence_checker_version: input.equivalence_checker_version,
        routing_path: null,
        started_at: now(),
        submitted_at: null,
      };
      administrations.set(administration.administration_id, administration);
      return administration;
    },
    async getAdministration(administrationId: UUID): Promise<AssessmentAdministration> {
      const administration = administrations.get(administrationId);
      if (!administration) {
        throw new Error(`unknown administration ${administrationId}`);
      }
      return administration;
    },
    async getProgress(administrationId: UUID): Promise<AdministrationProgress | null> {
      return progressByAdministration.get(administrationId) ?? null;
    },
    async saveProgress(progress: AdministrationProgress): Promise<void> {
      progressByAdministration.set(progress.administration_id, progress);
    },
    async finalizeAdministration(input: {
      administration_id: UUID;
      routing_path: readonly string[];
    }): Promise<AssessmentAdministration> {
      const administration = administrations.get(input.administration_id);
      if (!administration) {
        throw new Error(`unknown administration ${input.administration_id}`);
      }
      const finalized: AssessmentAdministration = {
        ...administration,
        routing_path: input.routing_path,
        submitted_at: now(),
      };
      administrations.set(finalized.administration_id, finalized);
      return finalized;
    },
  };
}

export function createInMemoryResponseRepository(): InMemoryResponseRepository {
  const responses: AssessmentItemResponse[] = [];
  return {
    responses,
    async append(response: AssessmentItemResponse): Promise<void> {
      responses.push(response);
    },
  };
}

/**
 * In-memory {@link WalkProgressStore} — the v2 analogue of the stage-progress map
 * embedded in {@link createInMemoryDiagnosticStore}. Kept as its own double because
 * v2 persists walk state to a separate table (`assessment_administration_walk`).
 */
export function createInMemoryWalkStore(): InMemoryWalkStore {
  const walks = new Map<string, WalkState>();
  return {
    walks,
    async getWalk(administrationId: UUID): Promise<WalkState | null> {
      return walks.get(administrationId) ?? null;
    },
    async saveWalk(administrationId: UUID, state: WalkState): Promise<void> {
      walks.set(administrationId, state);
    },
  };
}

export function createInMemoryPlacementWriter(): InMemoryPlacementWriter {
  const writes: {
    student_id: UUID;
    node_id: string;
    placement_estimate: PlacementEstimate;
  }[] = [];
  return {
    writes,
    async writePlacement(input): Promise<void> {
      writes.push(input);
    },
  };
}
