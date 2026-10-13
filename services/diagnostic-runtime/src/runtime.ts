import { D1_CHECKER_VERSION } from "@cr/components";
import {
  type AdaptiveDiagnosticEngine,
  createAdaptiveDiagnosticEngine,
  createD1MultistageSpec,
  type DiagnosticAdministrationStore,
  type DiagnosticResponseScorer,
  type MultistageSpec,
  type NewAdministration,
  type PlacementWriter,
} from "@cr/diagnostic";
import { createItemBank, D1_ITEM_PACK, type ItemPackEntry } from "@cr/item-bank";
import type { AssessmentPurpose, UUID } from "@cr/state-schema";

export interface DiagnosticRuntimeVersions {
  form_version: number;
  scoring_engine_version: number;
  scoring_model_version: number;
  equivalence_checker_version: number;
}

export const DEFAULT_DIAGNOSTIC_VERSIONS: DiagnosticRuntimeVersions = {
  form_version: 1,
  scoring_engine_version: 1,
  scoring_model_version: 1,
  equivalence_checker_version: D1_CHECKER_VERSION,
};

export interface DiagnosticRuntime {
  engine: AdaptiveDiagnosticEngine;
  spec: MultistageSpec;
  versions: DiagnosticRuntimeVersions;
  itemPack: readonly ItemPackEntry[];
  /**
   * Build a `NewAdministration` for a student + purpose, choosing the
   * counterbalanced form (override with `form_id`). `blueprint_version` is pinned
   * to the spec so `engine.start` accepts it (INV-DIAG-5).
   */
  newAdministration(input: {
    student_id: UUID;
    purpose: AssessmentPurpose;
    form_id?: string;
  }): NewAdministration;
}

export interface DiagnosticRuntimeDeps {
  store: DiagnosticAdministrationStore;
  scorer: DiagnosticResponseScorer;
  placementWriter: PlacementWriter;
  spec?: MultistageSpec;
  itemPack?: readonly ItemPackEntry[];
  versions?: Partial<DiagnosticRuntimeVersions>;
}

/**
 * Compose the adaptive engine over injected ports + the D1 item bank. This is the
 * port-level factory shared by every backend: the in-memory doubles use it for CI,
 * and `createAuroraDiagnosticRuntime` (server-only, `./aurora`) wraps it with the
 * RDS Data API adapters — one per request, transaction-scoped.
 */
export function createDiagnosticRuntime(deps: DiagnosticRuntimeDeps): DiagnosticRuntime {
  const spec = deps.spec ?? createD1MultistageSpec();
  const itemPack = deps.itemPack ?? D1_ITEM_PACK;
  const versions = { ...DEFAULT_DIAGNOSTIC_VERSIONS, ...deps.versions };
  const engine = createAdaptiveDiagnosticEngine({
    spec,
    itemBank: createItemBank(itemPack),
    store: deps.store,
    scorer: deps.scorer,
    placementWriter: deps.placementWriter,
  });

  return {
    engine,
    spec,
    versions,
    itemPack,
    newAdministration({ student_id, purpose, form_id }) {
      return {
        student_id,
        purpose,
        form_id: form_id ?? counterbalancedForm(student_id, purpose),
        form_version: versions.form_version,
        blueprint_version: spec.spec_version,
        scoring_engine_version: versions.scoring_engine_version,
        scoring_model_version: versions.scoring_model_version,
        equivalence_checker_version: versions.equivalence_checker_version,
      };
    },
  };
}

/**
 * Counterbalanced form choice: a student's pre and post forms are always
 * different (so no item is seen twice — the measurement comparability gate,
 * §3/§6), and the A/B assignment is balanced across students by a stable hash of
 * the student id. Shared by the v1 runtime and the v2 walk runtime.
 */
export function counterbalancedForm(
  studentId: string,
  purpose: AssessmentPurpose,
): "A" | "B" {
  const startsWithA = fnv1a(studentId) % 2 === 0;
  if (purpose === "post") {
    return startsWithA ? "B" : "A";
  }
  return startsWithA ? "A" : "B";
}

function fnv1a(value: string): number {
  let hash = 0x81_1c_9d_c5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01_00_01_93);
  }
  return hash >>> 0;
}
