import { getNodesByScope } from "@cr/skill-graph";

/**
 * Fixed linear blueprint (two tagged slots per D1 node). Retained as the item
 * pool descriptor and for the web app shell; the administered instrument is the
 * multistage adaptive test (see `engine.ts` / `routing.ts`), per the
 * Adaptive-Diagnostic amendment.
 */
export type DiagnosticItemDifficulty = 2 | 3;

export interface AssessmentBlueprintSlot {
  node_id: string;
  difficulty: DiagnosticItemDifficulty;
}

export interface AssessmentBlueprint {
  blueprint_version: number;
  scope: "foundational";
  slots: readonly AssessmentBlueprintSlot[];
}

export function createMvpAssessmentBlueprint(): AssessmentBlueprint {
  return {
    blueprint_version: 1,
    scope: "foundational",
    slots: getNodesByScope("mvp").flatMap((node) => [
      { node_id: node.id, difficulty: 2 as const },
      { node_id: node.id, difficulty: 3 as const },
    ]),
  };
}

export { type Adjudication, adjudicate, MAX_PROBE_ITEMS } from "./adjudicator";
export {
  buildCompletionReport,
  type CompletionCeremonyKind,
  type CompletionReport,
  type CompletionRetakeEvidence,
  type CompletionStandingReason,
} from "./completion-report";
// ── Adaptive-Diagnostic v2 (prerequisite-gated walk + coverage) ──────────────
export {
  type CoverageMeasurement,
  type CoverageResult,
  computeCoverage,
  computeCoverageMeasurement,
  coverageWeight,
  type EvidenceSource,
  inProductScope,
  type NodeResolution,
  perDomainCoverage,
  type ResolutionStatus,
  type ResolvedKnowledgeState,
} from "./coverage";
export {
  COVERAGE_SCORING_MODEL_VERSION,
  type CoverageAdministrationRecord,
  type CoverageAdministrationScore,
  type CoverageAdministrationStatus,
  type CoverageMeasurementRecord,
  type CoverageMeasurementStatus,
  type CoverageResolutionRules,
  computeCoverageMeasurementFromRecords,
  coverageResolutionRulesFor,
  isCoverageScoringModelVersion,
  rebuildWalkState,
  recomputeCoverage,
  STATIC_CONSEQUENCE_SCORING_MODEL_VERSION,
  scoreCoverageAdministration,
} from "./coverage-measurement";
export {
  type AdaptiveDiagnosticEngine,
  type AdaptiveDiagnosticEngineDeps,
  type AdministrationProgress,
  type CompletedDiagnostic,
  createAdaptiveDiagnosticEngine,
  type DiagnosticAdministrationStore,
  type DiagnosticItem,
  type DiagnosticItemBank,
  type DiagnosticResponseScorer,
  type NewAdministration,
  type PlacementWriter,
  type ServedItemRef,
  type StageAdvance,
  type StageServe,
} from "./engine";
export {
  type AdministrationRecord,
  type AdministrationStatus,
  type AggregateScore,
  COMPLETENESS_THRESHOLD,
  type ComputeMeasurementInput,
  computeMeasurement,
  FAULT_THRESHOLD,
  type MeasurementRecord,
  type MeasurementStatus,
  rebuildStageOutcomes,
  recomputeAbilityScore,
  type ScoreAdministrationInput,
  scoreAdministration,
} from "./measurement";
export type { ReadinessMeasurement } from "./readiness";
export {
  createD1MultistageSpec,
  createMultistageSpec,
  type DiagnosticStage,
  type DiagnosticStageSlot,
  getStage,
  type ItemDifficulty,
  type MultistageSpec,
  type MultistageSpecNode,
  type StageRole,
} from "./routing";
export {
  computePlacement,
  frontierScore,
  isScorable,
  measuredPlacement,
  type PlacementResult,
  proportionCorrect,
  type ScoredResponse,
  type StageOutcome,
} from "./scoring";
export {
  currentProbeNode,
  isWalkComplete,
  type ProbeRecord,
  probedNodeCount,
  recordScoredOutcome,
  resolveKnowledgeState,
  robustPassNodeIds,
  startWalk,
  type WalkConfig,
  type WalkState,
} from "./walk";
export {
  type CompletedWalkDiagnostic,
  createFrontierWalkEngine,
  type FrontierWalkConfig,
  type FrontierWalkEngine,
  type FrontierWalkEngineDeps,
  type WalkAdvance,
  type WalkItemSource,
  type WalkProbeItem,
  type WalkProgressStore,
  type WalkServe,
} from "./walk-engine";
