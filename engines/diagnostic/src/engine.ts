import { getNodesByScope } from "@cr/skill-graph";
import type {
  AssessmentAdministration,
  AssessmentItemResponse,
  AssessmentItemSubmission,
  AssessmentPurpose,
  PlacementEstimate,
  UUID,
} from "@cr/state-schema";

import {
  type DiagnosticStageSlot,
  getStage,
  type ItemDifficulty,
  type MultistageSpec,
} from "./routing";
import {
  computePlacement,
  frontierScore,
  type ScoredResponse,
  type StageOutcome,
} from "./scoring";

/** A concrete immutable item version chosen for one stage slot at serve time. */
export interface DiagnosticItem {
  item_version_id: string;
  node_id: string;
  difficulty: ItemDifficulty;
  item_definition_hash: string;
}

/**
 * Fields needed to open an administration. `student_id` is taken from the
 * authenticated context by the store, never trusted from a client payload
 * (Contracts §5). `blueprint_version` is checked against the engine's spec so
 * pre and post share one adaptive structure (INV-DIAG-5).
 */
export interface NewAdministration {
  student_id: UUID;
  purpose: AssessmentPurpose;
  form_id: string;
  form_version: number;
  blueprint_version: number;
  scoring_engine_version: number;
  scoring_model_version: number;
  equivalence_checker_version: number;
}

export interface ServedItemRef {
  item_version_id: string;
  stage_id: string;
  node_id: string;
  difficulty: ItemDifficulty;
}

/**
 * The engine's working state for one administration, persisted between adaptive
 * turns. `outcomes` (with per-stage scored responses) is the reproducible basis
 * for the frontier score; `served` maps each item to its difficulty/stage.
 */
export interface AdministrationProgress {
  administration_id: UUID;
  current_stage_id: string | null;
  served: ServedItemRef[];
  outcomes: StageOutcome[];
  status: "in_progress" | "complete";
}

export interface StageServe {
  administration: AssessmentAdministration;
  stage_id: string;
  items: readonly DiagnosticItem[];
}

export type StageAdvance =
  | { complete: false; stage_id: string; items: readonly DiagnosticItem[] }
  | { complete: true };

export interface CompletedDiagnostic {
  administration: AssessmentAdministration;
  /** Difficulty-aware ability frontier in [0, 3]; the pre/post-comparable metric. */
  ability_score: number;
  /** Per-node city seed (measured + graph-inferred). Never mastery. */
  placement_by_node: Record<string, PlacementEstimate>;
  /** Nodes whose placement was graph-inferred rather than directly measured. */
  inferred_nodes: readonly string[];
  /** Ordered stage ids served, for deterministic recomputation (INV-DIAG-4). */
  path: readonly string[];
}

export interface DiagnosticItemBank {
  selectItem(slot: DiagnosticStageSlot, formId: string): DiagnosticItem;
}

/**
 * Recomputes correctness server-side and appends the immutable response record.
 * Structurally satisfied by `services/scorer`'s `AuthoritativeScorer`; kept as a
 * local port so the engine does not depend on that package.
 */
export interface DiagnosticResponseScorer {
  scoreAndAppend(submission: AssessmentItemSubmission): Promise<AssessmentItemResponse>;
}

/**
 * Writes `placement_estimate` on `student_node_state` (once, at onboarding;
 * immutable thereafter, enforced by the writer/DB). The ONLY per-node field the
 * diagnostic writes; it never writes `mastery` (Contracts §1/§3, INV-DIAG-1).
 */
export interface PlacementWriter {
  writePlacement(input: {
    student_id: UUID;
    node_id: string;
    placement_estimate: PlacementEstimate;
  }): Promise<void>;
}

export interface DiagnosticAdministrationStore {
  createAdministration(input: NewAdministration): Promise<AssessmentAdministration>;
  getAdministration(administrationId: UUID): Promise<AssessmentAdministration>;
  getProgress(administrationId: UUID): Promise<AdministrationProgress | null>;
  saveProgress(progress: AdministrationProgress): Promise<void>;
  /**
   * Persist the finalized `routing_path` and stamp `submitted_at` (server time).
   * These are the ONLY `assessment_administration` fields written after creation;
   * everything else is immutable. Returns the finalized record so the diagnostic
   * result carries the score's recompute basis, letting the measurement pipeline
   * reproduce `θ` from immutable records (Assessment_Scoring_Spec §9, INV-DIAG-4).
   */
  finalizeAdministration(input: {
    administration_id: UUID;
    routing_path: readonly string[];
  }): Promise<AssessmentAdministration>;
}

/**
 * Placement-writing purposes: the pretest doubles as the placement source, and
 * `placement` is reserved for a post-MVP adaptive instrument. The posttest never
 * writes placement (Contracts §1, Assessment_Scoring_Spec §1).
 */
const PLACEMENT_WRITING_PURPOSES: ReadonlySet<AssessmentPurpose> = new Set([
  "pre",
  "placement",
]);

export interface AdaptiveDiagnosticEngine {
  /** Open an administration and serve the first (routing) stage. */
  start(input: NewAdministration): Promise<StageServe>;
  /** Score the current stage's responses, route, and serve the next stage or signal completion. */
  submitStage(
    administrationId: UUID,
    submissions: readonly AssessmentItemSubmission[],
  ): Promise<StageAdvance>;
  /** Compute the frontier score + placement, seed placement (pretest only), finalize. */
  finalize(administrationId: UUID): Promise<CompletedDiagnostic>;
}

export interface AdaptiveDiagnosticEngineDeps {
  spec: MultistageSpec;
  itemBank: DiagnosticItemBank;
  store: DiagnosticAdministrationStore;
  scorer: DiagnosticResponseScorer;
  placementWriter: PlacementWriter;
}

export function createAdaptiveDiagnosticEngine(
  deps: AdaptiveDiagnosticEngineDeps,
): AdaptiveDiagnosticEngine {
  const { spec, itemBank, store, scorer, placementWriter } = deps;
  const targetNodes = getNodesByScope("mvp").map((node) => node.id);

  function serveStage(
    stageId: string,
    formId: string,
  ): { items: DiagnosticItem[]; served: ServedItemRef[] } {
    const stage = getStage(spec, stageId);
    const items: DiagnosticItem[] = [];
    const served: ServedItemRef[] = [];
    for (const slot of stage.slots) {
      const item = itemBank.selectItem(slot, formId);
      items.push(item);
      served.push({
        item_version_id: item.item_version_id,
        stage_id: stageId,
        node_id: item.node_id,
        difficulty: item.difficulty,
      });
    }
    return { items, served };
  }

  async function loadProgress(administrationId: UUID): Promise<AdministrationProgress> {
    const progress = await store.getProgress(administrationId);
    if (!progress) {
      throw new Error(`no diagnostic progress for administration ${administrationId}`);
    }
    return progress;
  }

  return {
    async start(input) {
      if (input.blueprint_version !== spec.spec_version) {
        throw new Error(
          `adaptive spec version mismatch: administration ${input.blueprint_version} vs engine ${spec.spec_version}`,
        );
      }
      const administration = await store.createAdministration(input);
      const { items, served } = serveStage(spec.first_stage, input.form_id);
      await store.saveProgress({
        administration_id: administration.administration_id,
        current_stage_id: spec.first_stage,
        served,
        outcomes: [],
        status: "in_progress",
      });
      return { administration, stage_id: spec.first_stage, items };
    },

    async submitStage(administrationId, submissions) {
      const administration = await store.getAdministration(administrationId);
      const progress = await loadProgress(administrationId);
      const currentStageId = progress.current_stage_id;
      if (!currentStageId) {
        throw new Error(`administration ${administrationId} has no open stage`);
      }
      const stage = getStage(spec, currentStageId);

      const difficultyByItem = new Map(
        progress.served
          .filter((ref) => ref.stage_id === currentStageId)
          .map((ref) => [ref.item_version_id, ref.difficulty] as const),
      );

      const scored: ScoredResponse[] = [];
      for (const submission of submissions) {
        const difficulty = difficultyByItem.get(submission.item_version_id);
        if (difficulty === undefined) {
          throw new Error(
            `submission item ${submission.item_version_id} was not served for stage ${currentStageId}`,
          );
        }
        const response = await scorer.scoreAndAppend(submission);
        scored.push({
          node_id: response.node_id,
          difficulty,
          authoritative_correct: response.authoritative_correct,
          scoring_status: response.scoring_status,
        });
      }

      const outcome: StageOutcome = {
        stage_id: currentStageId,
        role: stage.role,
        responses: scored,
      };
      const outcomes = [...progress.outcomes, outcome];
      const proportion = proportionOf(scored);
      const nextStageId = spec.route(currentStageId, proportion);

      if (nextStageId) {
        const { items, served } = serveStage(nextStageId, administration.form_id);
        await store.saveProgress({
          ...progress,
          current_stage_id: nextStageId,
          served: [...progress.served, ...served],
          outcomes,
        });
        return { complete: false, stage_id: nextStageId, items };
      }

      await store.saveProgress({
        ...progress,
        current_stage_id: null,
        outcomes,
      });
      return { complete: true };
    },

    async finalize(administrationId) {
      const administration = await store.getAdministration(administrationId);
      const progress = await loadProgress(administrationId);

      const allResponses = progress.outcomes.flatMap((outcome) => outcome.responses);
      const ability_score = frontierScore(progress.outcomes, spec.routing_bar);
      const { placement_by_node, inferred_nodes } = computePlacement(
        allResponses,
        targetNodes,
      );

      if (PLACEMENT_WRITING_PURPOSES.has(administration.purpose)) {
        for (const [node_id, placement_estimate] of Object.entries(placement_by_node)) {
          await placementWriter.writePlacement({
            student_id: administration.student_id,
            node_id,
            placement_estimate,
          });
        }
      }

      const path = progress.outcomes.map((outcome) => outcome.stage_id);
      const finalized = await store.finalizeAdministration({
        administration_id: administrationId,
        routing_path: path,
      });
      await store.saveProgress({ ...progress, status: "complete" });

      return {
        administration: finalized,
        ability_score,
        placement_by_node,
        inferred_nodes,
        path,
      };
    },
  };
}

function proportionOf(responses: readonly ScoredResponse[]): number {
  const scorable = responses.filter(
    (response) =>
      response.scoring_status === "correct" || response.scoring_status === "incorrect",
  );
  if (scorable.length === 0) {
    return 0;
  }
  const correct = scorable.filter((response) => response.authoritative_correct).length;
  return correct / scorable.length;
}
