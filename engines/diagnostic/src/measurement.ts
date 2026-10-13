import type {
  AssessmentAdministration,
  AssessmentItemResponse,
  ScoringStatus,
  UUID,
} from "@cr/state-schema";

import { getStage, type ItemDifficulty, type MultistageSpec } from "./routing";
import {
  frontierScore,
  isScorable,
  type ScoredResponse,
  type StageOutcome,
} from "./scoring";

/**
 * The pre/post measurement pipeline (Assessment_Scoring_Spec §5/§6/§9,
 * Adaptive-Diagnostic amendment §4).
 *
 * The MVP ship requirement (§9) is that the pipeline can *reproducibly* compute a
 * blueprint-matched pre/post aggregate score difference **from versioned,
 * immutable test records**, correctly excluding incomplete administrations,
 * invalidated items, and application faults. Everything here is a pure function
 * of (the immutable `assessment_administration` + its append-only
 * `assessment_item_response` rows + the versioned `MultistageSpec`); it holds no
 * state and reads/writes no `mastery` or `placement_estimate` (§8, INV-DIAG-1).
 *
 * Reproducibility (INV-DIAG-4) works because the reported metric `θ` depends only
 * on each stage's scorable proportion-correct and its role, NOT on per-response
 * difficulty. So `θ` rebuilds from the recorded `routing_path` (ordered stage ids)
 * + the spec + the response rows, and reuses the SAME `frontierScore` the live
 * engine used. No difficulty needs to be re-derived to reproduce the score.
 */

/** Completeness gate: an administration is valid only at/above this answered fraction (§6). */
export const COMPLETENESS_THRESHOLD = 0.9;

/** Fault gate: above this fraction of application faults, the administration is withheld (§6). */
export const FAULT_THRESHOLD = 0.05;

/**
 * Application faults (Answer_Equivalence_Spec §12): the app broke, not the
 * student. Never scored as wrong; excluded from every denominator (§6).
 *
 * Do NOT add `invalid_input` here to make a wedged walk observable. That was
 * proposed and rejected; the reasoning is in `engines/diagnostic/README.md`
 * ("A rejected change: `invalid_input` is not an application fault").
 */
const FAULT_STATUSES: ReadonlySet<ScoringStatus> = new Set([
  "scoring_error",
  "unsupported_expression",
]);

/**
 * Per-administration validity (§6):
 * - `valid`      — counts toward the gain.
 * - `incomplete` — student quit before the completeness threshold; excluded from the gain
 *   (NOT scored as if blanks were wrong, which would fabricate a low score and inflate gain).
 * - `needs_review` — application faults exceeded the threshold; withheld until resolved.
 */
export type AdministrationStatus = "valid" | "incomplete" | "needs_review";

/**
 * Paired pre/post outcome:
 * - `computed`       — both valid and comparable; `ability_gain` is meaningful.
 * - `pre_invalid` / `post_invalid` — one side is not `valid` (§6 incomplete/needs_review).
 * - `not_comparable` — blueprint / scoring-model / form counterbalancing rules broken (§3, §6).
 */
export type MeasurementStatus =
  | "computed"
  | "not_comparable"
  | "pre_invalid"
  | "post_invalid";

/** The scored result of ONE administration (pre or post). Grain: aggregate only, never per-node (§5). */
export interface AggregateScore {
  administration_id: UUID;
  status: AdministrationStatus;
  /**
   * Difficulty-aware ability frontier `θ ∈ [0, 3]` recomputed from the immutable
   * records. Always computed (deterministic), but only pre/post-comparable when
   * `status === "valid"`.
   */
  ability_score: number;
  /** Items that count toward `θ`/correctness: scorable (correct|incorrect), minus invalidated. */
  scorable_count: number;
  correct_count: number;
  /** Response rows the student actually produced (used for the completeness gate). */
  answered_count: number;
  /** Items the served `routing_path` should have produced (from the spec). */
  expected_count: number;
  /** Application-fault rows (excluded from the denominator, never wrong). */
  fault_count: number;
  /** Rows dropped because their `item_version` was invalidated (symmetric pre/post, §6). */
  invalidated_count: number;
  completeness: number;
  fault_rate: number;
}

/** Immutable inputs for scoring one administration. */
export interface ScoreAdministrationInput {
  administration: AssessmentAdministration;
  /**
   * The administration's append-only response rows **in served order** (one row
   * per served item; a genuine non-answer within a completed test is recorded as
   * `incorrect`, i.e. scored 0, per §6). Ordering matches the append-only log the
   * live engine produced.
   */
  responses: readonly AssessmentItemResponse[];
  spec: MultistageSpec;
  /** `item_version_id`s invalidated after the fact (broken/mis-keyed); dropped symmetrically (§6). */
  invalidatedItemVersionIds?: ReadonlySet<string>;
}

/** The immutable record of one administration for a paired measurement. */
export interface AdministrationRecord {
  administration: AssessmentAdministration;
  responses: readonly AssessmentItemResponse[];
}

export interface ComputeMeasurementInput {
  pre: AdministrationRecord;
  post: AdministrationRecord;
  spec: MultistageSpec;
  invalidatedItemVersionIds?: ReadonlySet<string>;
}

/** The paired pre/post outcome: the marketed "foundational assessment gain" (§5, §7). */
export interface MeasurementRecord {
  student_id: UUID;
  status: MeasurementStatus;
  /** `θ_post − θ_pre`; non-null only when `status === "computed"`. */
  ability_gain: number | null;
  pre: AggregateScore;
  post: AggregateScore;
}

const EMPTY_INVALIDATED: ReadonlySet<string> = new Set();

/**
 * Rebuild the per-stage scored outcomes from immutable records. Partitions the
 * ordered response rows by each served stage's slot count (from `routing_path` +
 * the spec), tags each with the stage's role, and drops invalidated items from
 * the scorable set (kept out of the per-stage proportion, so `θ` matches an
 * administration where the item never existed). A truncated tail (student quit)
 * yields a short final stage, which is fine: incomplete administrations are gated
 * out of the gain upstream.
 */
export function rebuildStageOutcomes(
  spec: MultistageSpec,
  routingPath: readonly string[],
  orderedResponses: readonly AssessmentItemResponse[],
  invalidated: ReadonlySet<string> = EMPTY_INVALIDATED,
): StageOutcome[] {
  const outcomes: StageOutcome[] = [];
  let cursor = 0;

  for (const stageId of routingPath) {
    const stage = getStage(spec, stageId);
    const slice = orderedResponses.slice(cursor, cursor + stage.slots.length);
    cursor += stage.slots.length;

    const difficultyByNode = new Map<string, ItemDifficulty>(
      stage.slots.map((slot) => [slot.node_id, slot.difficulty] as const),
    );
    // Stages are single-difficulty in the D1 spec; this is only a fallback for a
    // response whose node is not in the stage slots. It never feeds `θ`
    // (frontierScore ignores difficulty), only keeps StageOutcome well-formed.
    const fallbackDifficulty: ItemDifficulty = stage.slots[0]?.difficulty ?? 2;

    const responses: ScoredResponse[] = slice
      .filter((response) => !invalidated.has(response.item_version_id))
      .map((response) => ({
        node_id: response.node_id,
        difficulty: difficultyByNode.get(response.node_id) ?? fallbackDifficulty,
        authoritative_correct: response.authoritative_correct,
        scoring_status: response.scoring_status,
      }));

    outcomes.push({ stage_id: stageId, role: stage.role, responses });
  }

  return outcomes;
}

/**
 * Reproduce the difficulty-aware ability frontier `θ` deterministically from the
 * immutable records (INV-DIAG-4). Reuses the live engine's `frontierScore`, so a
 * recomputed pre/post score is bit-for-bit the score the engine reported.
 */
export function recomputeAbilityScore(
  spec: MultistageSpec,
  routingPath: readonly string[],
  orderedResponses: readonly AssessmentItemResponse[],
  invalidated: ReadonlySet<string> = EMPTY_INVALIDATED,
): number {
  const outcomes = rebuildStageOutcomes(spec, routingPath, orderedResponses, invalidated);
  return frontierScore(outcomes, spec.routing_bar);
}

function expectedCount(spec: MultistageSpec, routingPath: readonly string[]): number {
  let total = 0;
  for (const stageId of routingPath) {
    total += getStage(spec, stageId).slots.length;
  }
  return total;
}

/**
 * Score ONE administration into an `AggregateScore`, applying the §6 validity
 * gates. `θ` is always recomputed (deterministic); `status` records whether the
 * administration may enter the gain. Faults are never scored as wrong, and
 * invalidated items are dropped from every denominator symmetrically.
 */
export function scoreAdministration(input: ScoreAdministrationInput): AggregateScore {
  const { administration, responses, spec } = input;
  const invalidated = input.invalidatedItemVersionIds ?? EMPTY_INVALIDATED;

  const routingPath = administration.routing_path;
  if (!routingPath) {
    throw new Error(
      `administration ${administration.administration_id} has no routing_path (not finalized); cannot score`,
    );
  }

  const expected_count = expectedCount(spec, routingPath);
  const answered_count = responses.length;

  let scorable_count = 0;
  let correct_count = 0;
  let fault_count = 0;
  let invalidated_count = 0;

  for (const response of responses) {
    if (invalidated.has(response.item_version_id)) {
      invalidated_count += 1;
      continue;
    }
    if (FAULT_STATUSES.has(response.scoring_status)) {
      fault_count += 1;
      continue;
    }
    if (isScorable(response.scoring_status)) {
      scorable_count += 1;
      if (response.authoritative_correct) {
        correct_count += 1;
      }
    }
    // Non-fault, non-scorable rows (e.g. a stray `invalid_input`) count as
    // neither right nor wrong and are excluded from the denominator (§6).
  }

  const completeness = expected_count === 0 ? 0 : answered_count / expected_count;
  const fault_rate = expected_count === 0 ? 0 : fault_count / expected_count;
  const ability_score = recomputeAbilityScore(spec, routingPath, responses, invalidated);

  const status: AdministrationStatus =
    fault_rate > FAULT_THRESHOLD
      ? "needs_review"
      : completeness < COMPLETENESS_THRESHOLD
        ? "incomplete"
        : "valid";

  return {
    administration_id: administration.administration_id,
    status,
    ability_score,
    scorable_count,
    correct_count,
    answered_count,
    expected_count,
    fault_count,
    invalidated_count,
    completeness,
    fault_rate,
  };
}

function comparabilityStatus(
  pre: AssessmentAdministration,
  post: AssessmentAdministration,
  preScore: AggregateScore,
  postScore: AggregateScore,
): MeasurementStatus {
  if (preScore.status !== "valid") {
    return "pre_invalid";
  }
  if (postScore.status !== "valid") {
    return "post_invalid";
  }
  // Cross-version comparison is never silently performed (§6). Pre and post must
  // share the blueprint and the scoring model (Adaptive-Diagnostic amendment).
  if (pre.blueprint_version !== post.blueprint_version) {
    return "not_comparable";
  }
  if (pre.scoring_model_version !== post.scoring_model_version) {
    return "not_comparable";
  }
  // Counterbalancing: a student gets one form at pre and the OTHER at post, so
  // the gain is never inflated by seeing an identical item twice (§3).
  if (pre.form_id === post.form_id) {
    return "not_comparable";
  }
  return "computed";
}

/**
 * Compute the paired pre/post measurement (the marketed foundational-assessment
 * gain). Scores both administrations (§6 gates), applies the comparability gates
 * (§3/§6), and only then reports `ability_gain = θ_post − θ_pre`. A student
 * without BOTH a valid, comparable pre and post contributes no gain (§6/§7).
 */
export function computeMeasurement(input: ComputeMeasurementInput): MeasurementRecord {
  const { pre, post, spec } = input;
  const invalidated = input.invalidatedItemVersionIds ?? EMPTY_INVALIDATED;

  if (pre.administration.student_id !== post.administration.student_id) {
    throw new Error(
      `cannot pair a measurement across different students: ${pre.administration.student_id} vs ${post.administration.student_id}`,
    );
  }

  const preScore = scoreAdministration({
    administration: pre.administration,
    responses: pre.responses,
    spec,
    invalidatedItemVersionIds: invalidated,
  });
  const postScore = scoreAdministration({
    administration: post.administration,
    responses: post.responses,
    spec,
    invalidatedItemVersionIds: invalidated,
  });

  const status = comparabilityStatus(
    pre.administration,
    post.administration,
    preScore,
    postScore,
  );
  const ability_gain =
    status === "computed" ? postScore.ability_score - preScore.ability_score : null;

  return {
    student_id: pre.administration.student_id,
    status,
    ability_gain,
    pre: preScore,
    post: postScore,
  };
}
