import { PRODUCT_CHECKER_VERSION } from "@cr/components";
import {
  COVERAGE_SCORING_MODEL_VERSION,
  createFrontierWalkEngine,
  type DiagnosticAdministrationStore,
  type DiagnosticResponseScorer,
  type FrontierWalkConfig,
  type FrontierWalkEngine,
  type NewAdministration,
  type PlacementWriter,
  type WalkItemSource,
  type WalkProgressStore,
} from "@cr/diagnostic";
import type { AssessmentPurpose, UUID } from "@cr/state-schema";

import { counterbalancedForm } from "./runtime";

export interface WalkRuntimeVersions {
  form_version: number;
  scoring_engine_version: number;
  /** Versions the coverage-weight fn + resolution rules; v2 registers 2. */
  scoring_model_version: number;
  equivalence_checker_version: number;
}

/**
 * v2 defaults. `scoring_model_version` is 2 — the depth-weighted coverage +
 * conservative-resolution model — so v2 administrations never pair against v1
 * (scoring_model_version 1) in the comparability gate.
 *
 * `equivalence_checker_version` is the PRODUCT (v2) checker, and it moved here from the
 * D1 (v1) checker when the walk's scope widened past D1. v1's grammar has no `sqrt(...)`,
 * no variable denominator and no variable radicand, so it cannot grade 22 of the 66
 * walk-servable items outside D1 — measured in `docs/Diagnostic_11_Node_Scope_Measurement.md`
 * §2, where four of five D2 nodes come back `invalid_input`, which `isScorable` refuses,
 * so the walk re-serves the identical item forever at a 0% fault rate. v2 grades all 66
 * plus every alternate spelling, so it is a superset over this pool rather than a
 * different opinion.
 *
 * **This stamp must move together with the two composed checkers** — `aurora-server.ts`
 * and `apps/web/src/diagnostic/browserRuntime.ts` (which also exports the constant the
 * client puts on every submission). Both checkers fail closed on a version mismatch, so
 * a half-migration returns `scoring_error` on EVERY item including D1's.
 * `walkCheckerVersionParity.test.ts` is what stops that landing.
 *
 * No existing administration becomes non-comparable: `comparabilityStatus` reads
 * `blueprint_version`, `scoring_model_version` and `form_id`, and the checker version is
 * none of them. Historical records recompute unchanged too, because `rebuildWalkState`
 * reads the stored `scoring_status` off the immutable rows and never re-invokes a checker.
 */
export const DEFAULT_WALK_VERSIONS: WalkRuntimeVersions = {
  form_version: 1,
  scoring_engine_version: 1,
  scoring_model_version: COVERAGE_SCORING_MODEL_VERSION,
  equivalence_checker_version: PRODUCT_CHECKER_VERSION,
};

/**
 * The graph blueprint version stamped on walk administrations (comparability, INV-DIAG-5).
 *
 * **6 because the instrument widened again.** `scope` is not on the record — it is an argument
 * the reader supplies — so the coverage denominator is a property of today's code rather
 * than of the administration being scored. A widening that left this alone would silently
 * re-denominate every baseline already collected and show a learner who has learned
 * nothing a large positive gain, with the comparability gate reporting `computed`
 * throughout (D-END4). Bumping it turns that into an honest `not_comparable`, which is
 * what the field is for.
 *
 * 2 was the registry's six D1 nodes; 3 was the content-derived twenty across nine domains;
 * 4 was the thirty-four the practice-derived walk pack reaches, across all ten; 5 was the
 * forty the horizon admitted once `POL.6` and `POL.7` were authored and the sixth era could
 * fire; and 6 is ALL SIXTY-TWO, because `POL.5` was the last in-product node with no authored
 * content and every era is servable without it. This is the last widening of this kind
 * available: there is no node left outside the instrument to author in.
 *
 * `services/diagnostic-runtime/src/walkInstrumentScope.test.ts` holds the per-version record
 * of which node set each version denotes, and `engines/diagnostic/src/blueprintScope.test.ts`
 * holds the composition half of it.
 */
export const DEFAULT_WALK_BLUEPRINT_VERSION = 6;

export interface WalkRuntime {
  engine: FrontierWalkEngine;
  config: FrontierWalkConfig;
  versions: WalkRuntimeVersions;
  blueprint_version: number;
  /**
   * Build a `NewAdministration` for a student + purpose, choosing the
   * counterbalanced form (override with `form_id`) and stamping the v2
   * blueprint + scoring-model versions so a pre/post pair is comparable.
   */
  newAdministration(input: {
    student_id: UUID;
    purpose: AssessmentPurpose;
    form_id?: string;
  }): NewAdministration;
}

export interface WalkRuntimeDeps {
  config: FrontierWalkConfig;
  itemSource: WalkItemSource;
  store: DiagnosticAdministrationStore;
  walkStore: WalkProgressStore;
  scorer: DiagnosticResponseScorer;
  placementWriter: PlacementWriter;
  blueprintVersion?: number;
  versions?: Partial<WalkRuntimeVersions>;
}

/**
 * Compose the v2 prerequisite-gated walk engine over injected ports (the two
 * v2-native ones — a node-addressed {@link WalkItemSource} and a
 * {@link WalkProgressStore} — plus the reused administration store / scorer /
 * placement writer). This is the port-level factory shared by every backend: the
 * in-memory doubles use it for CI, and `createAuroraWalkRuntime` (server-only,
 * `./aurora`) wraps it with the RDS Data API adapters, transaction-scoped.
 */
export function createWalkRuntime(deps: WalkRuntimeDeps): WalkRuntime {
  const versions = { ...DEFAULT_WALK_VERSIONS, ...deps.versions };
  const blueprint_version = deps.blueprintVersion ?? DEFAULT_WALK_BLUEPRINT_VERSION;
  const engine = createFrontierWalkEngine({
    config: deps.config,
    itemSource: deps.itemSource,
    store: deps.store,
    walkStore: deps.walkStore,
    scorer: deps.scorer,
    placementWriter: deps.placementWriter,
  });

  return {
    engine,
    config: deps.config,
    versions,
    blueprint_version,
    newAdministration({ student_id, purpose, form_id }) {
      return {
        student_id,
        purpose,
        form_id: form_id ?? counterbalancedForm(student_id, purpose),
        form_version: versions.form_version,
        blueprint_version,
        scoring_engine_version: versions.scoring_engine_version,
        scoring_model_version: versions.scoring_model_version,
        equivalence_checker_version: versions.equivalence_checker_version,
      };
    },
  };
}
