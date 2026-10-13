import type {
  AssessmentAdministration,
  AssessmentItemSubmission,
  AssessmentPurpose,
  PlacementEstimate,
  UUID,
} from "@cr/state-schema";

import {
  type CoverageResult,
  computeCoverage,
  type NodeResolution,
  perDomainCoverage,
} from "./coverage";
import type {
  DiagnosticAdministrationStore,
  DiagnosticResponseScorer,
  NewAdministration,
  PlacementWriter,
} from "./engine";
import type { ItemDifficulty } from "./routing";
import { isScorable } from "./scoring";
import {
  currentProbeNode,
  type ProbeRecord,
  probedNodeCount,
  recordScoredOutcome,
  resolveKnowledgeState,
  robustPassNodeIds,
  startWalk,
  type WalkState,
} from "./walk";

/**
 * The v2 prerequisite-gated diagnostic engine (Contracts Amendment v2 §4) composed
 * over injected ports. It drives the pure `walk` state machine one probe item at a
 * time: `start` opens the walk, `submitProbe` scores one item (re-serving faults,
 * never scoring them) and returns the next probe or completion, and `finalize`
 * collapses the walk into the downward-closed resolved state and the depth-weighted
 * readiness coverage.
 *
 * It reuses the existing scorer / placement / administration ports unchanged, and
 * adds only two v2-native ports: a NODE-addressed item source (needs pool depth
 * >= 3 per served cell for the 2-of-3 rule) and walk-state persistence. It does
 * NOT write mastery (INV-DIAG-1) and writes placement only on placement-writing
 * purposes (pretest), exactly like v1.
 */

/** One immutable item version chosen to probe a node this turn. */
export interface WalkProbeItem {
  item_version_id: string;
  node_id: string;
  item_definition_hash: string;
  /**
   * The served difficulty tier, for display/telemetry only — the adjudicator
   * counts correctness, not difficulty (the walk is difficulty-agnostic). A
   * pack-backed source stamps the authored cell's tier; synthetic sources may
   * omit it (transports default to the routing tier when presenting the probe).
   */
  difficulty?: ItemDifficulty;
}

export interface WalkItemSource {
  /**
   * The `attempt`-th (0-based) parallel item for a node in a form. Successive
   * attempts within a node MUST return distinct items (the 2-of-3 rule serves up
   * to three), so the pool needs >= 3 parallel items per (node, difficulty) cell.
   */
  selectProbeItem(input: {
    node_id: string;
    attempt: number;
    form_id: string;
  }): WalkProbeItem;
}

/** Walk-state persistence — the v2 analogue of v1's stage `AdministrationProgress`. */
export interface WalkProgressStore {
  getWalk(administrationId: UUID): Promise<WalkState | null>;
  saveWalk(administrationId: UUID, state: WalkState): Promise<void>;
}

export interface FrontierWalkConfig {
  /** In-scope node ids the walk covers + scores. REQUIRED — there is no default;
   *  callers pass `MVP_NODE_IDS` (the 6 live D1 nodes) or `inProductScope()` (the
   *  62 in-product nodes). */
  scope: readonly string[];
  /** Recorded for provenance; vestigial for ordering (info-gain enters at the foundations). */
  entryTier: number;
}

export interface WalkServe {
  administration: AssessmentAdministration;
  node_id: string;
  item: WalkProbeItem;
}

export type WalkAdvance =
  | { complete: false; node_id: string; item: WalkProbeItem }
  | { complete: true };

export interface CompletedWalkDiagnostic {
  administration: AssessmentAdministration;
  /** Depth-weighted readiness coverage over the config scope (the reported metric). */
  coverage: CoverageResult;
  per_domain_coverage: Record<string, number>;
  /** Downward-closed per-node resolution (measured ∪ inferred passes, failures, prunes). */
  resolved: NodeResolution[];
  /** Per-node city seed derived from resolution; never mastery (INV-DIAG-1). */
  placement_by_node: Record<string, PlacementEstimate>;
  /** Nodes actually administered — the instrument-length signal. */
  probed_node_count: number;
  /**
   * In-scope nodes whose MEASURED pass was robust — a clean 2/2, the same bar that
   * already gates the top city seed and downward inference (`adjudicate`).
   *
   * Carried here because robustness lives on `WalkState.probed` and dies with it:
   * `resolved` collapses a pass to `measured`/`inferred` and drops how confidently
   * it was decided, and `placement_by_node` encodes it only as the value 3, which a
   * `post` administration's reader is forbidden to touch (D-END6). A consumer that
   * wants to NAME a skill rather than count it needs the two-item bar, and this is
   * the only field on a completed walk that offers it.
   *
   * Scope order, so a list built from it is stable across administrations.
   */
  robust_pass_node_ids: readonly string[];
  /**
   * The instrument ceiling cut this walk short of resolving everything, so the
   * coverage above is a floor rather than a complete picture. Distinguishes a
   * truncated administration from a completed one, which `probed_node_count`
   * alone cannot (see `WalkState.ceiling_reached`).
   */
  ceiling_reached: boolean;
  /** Probe order (finalized into `routing_path`), for a deterministic trace. */
  path: readonly string[];
}

export interface FrontierWalkEngine {
  start(input: NewAdministration): Promise<WalkServe>;
  submitProbe(
    administrationId: UUID,
    submission: AssessmentItemSubmission,
  ): Promise<WalkAdvance>;
  finalize(administrationId: UUID): Promise<CompletedWalkDiagnostic>;
}

export interface FrontierWalkEngineDeps {
  config: FrontierWalkConfig;
  itemSource: WalkItemSource;
  store: DiagnosticAdministrationStore;
  walkStore: WalkProgressStore;
  scorer: DiagnosticResponseScorer;
  placementWriter: PlacementWriter;
}

/** Pretest doubles as the placement source; posttest never writes placement (INV-DIAG-1). */
const PLACEMENT_WRITING_PURPOSES: ReadonlySet<AssessmentPurpose> = new Set([
  "pre",
  "placement",
]);

function attemptCount(state: WalkState, nodeId: string): number {
  return state.probed[nodeId]?.outcomes.length ?? 0;
}

/**
 * Map a resolved node to a 0–3 city seed (never mastery, INV-DIAG-1), refining the
 * status with evidence already collected — no extra items:
 * - 3: a robust measured pass (cleared 2/2, top of the ladder);
 * - 2: a non-robust measured pass or a robust-inferred (test-out) pass;
 * - 1: a fail that still had ≥1 correct attempt (partial ground);
 * - 0: a fail with no correct attempts, or unknown/pruned (not ready).
 *
 * Exported so the graph-agnostic scale tests can lock the 0–3 seed mapping on
 * synthetic DAGs (the engine composition itself is registry-backed).
 */
export function placementFor(
  resolution: NodeResolution,
  record?: ProbeRecord,
): PlacementEstimate {
  if (resolution.status === "passed") {
    if (resolution.source === "measured") {
      return record?.robust ? 3 : 2;
    }
    return 2;
  }
  if (resolution.status === "failed") {
    const correct = record?.outcomes.filter(Boolean).length ?? 0;
    return correct >= 1 ? 1 : 0;
  }
  return 0;
}

export function createFrontierWalkEngine(deps: FrontierWalkEngineDeps): FrontierWalkEngine {
  const { config, itemSource, store, walkStore, scorer, placementWriter } = deps;

  async function loadWalk(administrationId: UUID): Promise<WalkState> {
    const state = await walkStore.getWalk(administrationId);
    if (!state) {
      throw new Error(`no walk state for administration ${administrationId}`);
    }
    return state;
  }

  function serveCurrent(
    state: WalkState,
    formId: string,
  ): { node_id: string; item: WalkProbeItem } | null {
    const node = currentProbeNode(state);
    if (!node) {
      return null;
    }
    const item = itemSource.selectProbeItem({
      node_id: node,
      attempt: attemptCount(state, node),
      form_id: formId,
    });
    return { node_id: node, item };
  }

  return {
    async start(input) {
      const administration = await store.createAdministration(input);
      const state = startWalk({ scope: config.scope, entryTier: config.entryTier });
      await walkStore.saveWalk(administration.administration_id, state);
      const serve = serveCurrent(state, administration.form_id);
      if (!serve) {
        throw new Error("frontier walk produced no eligible probe at start (empty scope?)");
      }
      return { administration, node_id: serve.node_id, item: serve.item };
    },

    async submitProbe(administrationId, submission) {
      const administration = await store.getAdministration(administrationId);
      const state = await loadWalk(administrationId);
      const node = currentProbeNode(state);
      if (!node) {
        throw new Error(`administration ${administrationId} has no open probe`);
      }
      if (submission.node_id !== node) {
        throw new Error(
          `submission node ${submission.node_id} does not match the open probe ${node}`,
        );
      }

      const response = await scorer.scoreAndAppend(submission);
      // Faults/invalid inputs are never scored (Answer_Equivalence §12): re-serve the
      // same node without advancing the adjudication.
      const nextState = isScorable(response.scoring_status)
        ? recordScoredOutcome(state, response.authoritative_correct)
        : state;
      await walkStore.saveWalk(administrationId, nextState);

      const serve = serveCurrent(nextState, administration.form_id);
      if (!serve) {
        return { complete: true };
      }
      return { complete: false, node_id: serve.node_id, item: serve.item };
    },

    async finalize(administrationId) {
      const administration = await store.getAdministration(administrationId);
      const state = await loadWalk(administrationId);

      const resolved = resolveKnowledgeState(state);
      const coverage = computeCoverage(resolved, config.scope);
      const per_domain_coverage = perDomainCoverage(resolved);

      const placement_by_node: Record<string, PlacementEstimate> = {};
      for (const resolution of resolved) {
        placement_by_node[resolution.node_id] = placementFor(
          resolution,
          state.probed[resolution.node_id],
        );
      }

      if (PLACEMENT_WRITING_PURPOSES.has(administration.purpose)) {
        for (const [node_id, placement_estimate] of Object.entries(placement_by_node)) {
          await placementWriter.writePlacement({
            student_id: administration.student_id,
            node_id,
            placement_estimate,
          });
        }
      }

      const path = Object.keys(state.probed);
      const finalized = await store.finalizeAdministration({
        administration_id: administrationId,
        routing_path: path,
      });

      return {
        administration: finalized,
        coverage,
        per_domain_coverage,
        resolved,
        placement_by_node,
        probed_node_count: probedNodeCount(state),
        robust_pass_node_ids: robustPassNodeIds(state),
        ceiling_reached: state.ceiling_reached === true,
        path,
      };
    },
  };
}
