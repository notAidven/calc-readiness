import type { DomainId } from "@cr/skill-graph";
import type { StudentNodeState } from "@cr/state-schema";

import { D1_NEIGHBORHOOD_ID, isNeighborhoodReady } from "./neighborhood";

/**
 * The storm (neighborhood checkpoint) state machine — pure and framework-free.
 *
 * The storm is checkpoint-only (Contracts §3, Mastery_Scoring_Spec §5): it reads
 * mastery and controls exactly one flag, `neighborhood_checkpoint_cleared`. It
 * NEVER submits mastery evidence, NEVER writes `mastery`, and cannot raise or
 * lower any node's mastery. Nothing in this module calls `submitAssessmentEvidence`.
 *
 * Rules encoded here (design §7): unlock only when all required nodes are
 * mastered; default 5 prompts; clear at >= 80% (4 of 5); a soft timer scales only
 * bonus Prestige; a failure has no loss and allows immediate retry; a clear is
 * the single game write (idempotent).
 */

/** Default number of mixed-retention prompts (tunable; the 80% rule is fixed). */
export const DEFAULT_STORM_ITEM_COUNT = 5;
/** The clear threshold — the fixed rule the student already understands. */
export const STORM_CLEAR_RATIO = 0.8;
/** Soft-timer budget; only affects bonus Prestige, never pass/fail (tunable). */
export const DEFAULT_STORM_TIMER_BUDGET_MS = 90_000;

export interface StormConfig {
  neighborhood_id: string;
  item_count: number;
  clear_ratio: number;
  timer_budget_ms: number;
}

export function defaultStormConfig(
  neighborhoodId: string = D1_NEIGHBORHOOD_ID,
): StormConfig {
  return {
    neighborhood_id: neighborhoodId,
    item_count: DEFAULT_STORM_ITEM_COUNT,
    clear_ratio: STORM_CLEAR_RATIO,
    timer_budget_ms: DEFAULT_STORM_TIMER_BUDGET_MS,
  };
}

/** The storm is attemptable only once every required node is mastered (>= 2). */
export function isStormUnlocked(
  domain: DomainId,
  states: readonly StudentNodeState[],
): boolean {
  return isNeighborhoodReady(domain, states);
}

/**
 * Prompts required to clear, at the given ratio. Uses an epsilon-guarded ceil so
 * floating-point does not turn 0.8 * 5 (= 4.0000…0002) into 5.
 */
export function stormRequiredCorrect(
  itemCount: number,
  clearRatio: number = STORM_CLEAR_RATIO,
): number {
  if (!Number.isInteger(itemCount) || itemCount <= 0) {
    throw new Error("Storm item_count must be a positive integer.");
  }

  if (clearRatio < 0 || clearRatio > 1) {
    throw new Error("Storm clear_ratio must be within [0, 1].");
  }

  const required = Math.ceil(clearRatio * itemCount - 1e-9);
  return Math.min(Math.max(required, 0), itemCount);
}

/** Clear iff correct/total >= ratio, computed via `stormRequiredCorrect`. */
export function stormClears(
  correctCount: number,
  itemCount: number,
  clearRatio: number = STORM_CLEAR_RATIO,
): boolean {
  if (!Number.isInteger(correctCount) || correctCount < 0 || correctCount > itemCount) {
    throw new Error("Storm correct_count must be an integer within [0, item_count].");
  }

  return correctCount >= stormRequiredCorrect(itemCount, clearRatio);
}

/**
 * Soft-timer bonus ratio in [0, 1]. More time remaining → larger bonus. An
 * expired (<= 0) timer or a non-positive budget yields 0 (no bonus, no penalty).
 */
export function stormSpeedBonusRatio(
  timeRemainingMs: number,
  timerBudgetMs: number,
): number {
  if (timerBudgetMs <= 0 || timeRemainingMs <= 0) {
    return 0;
  }

  return Math.min(1, timeRemainingMs / timerBudgetMs);
}

export interface StormSubmission {
  neighborhood_id: string;
  item_count: number;
  correct_count: number;
  time_remaining_ms: number;
}

export interface StormResult {
  neighborhood_id: string;
  item_count: number;
  correct_count: number;
  cleared: boolean;
  accuracy: number;
  required_correct: number;
  time_remaining_ms: number;
  /** 0 when not cleared or the timer expired; otherwise in (0, 1]. */
  speed_bonus_ratio: number;
  /** Always true: a storm has no-loss failure and unlimited immediate retries. */
  can_retry: boolean;
  /** A clear implies the single (idempotent) checkpoint write. */
  writes_checkpoint: boolean;
}

/**
 * Grade one storm attempt. Pure and fail-closed: invalid input throws rather than
 * fabricating a clear. Grading decides the game clear only; it is not mastery
 * evidence and changes no node's mastery.
 */
export function gradeStorm(
  submission: StormSubmission,
  config?: Partial<StormConfig>,
): StormResult {
  const merged = { ...defaultStormConfig(submission.neighborhood_id), ...config };

  if (!Number.isInteger(submission.item_count) || submission.item_count <= 0) {
    throw new Error("Storm item_count must be a positive integer.");
  }

  if (submission.time_remaining_ms < 0) {
    throw new Error("Storm time_remaining_ms must be non-negative.");
  }

  const cleared = stormClears(
    submission.correct_count,
    submission.item_count,
    merged.clear_ratio,
  );
  const requiredCorrect = stormRequiredCorrect(submission.item_count, merged.clear_ratio);
  const speedBonusRatio = cleared
    ? stormSpeedBonusRatio(submission.time_remaining_ms, merged.timer_budget_ms)
    : 0;

  return {
    neighborhood_id: submission.neighborhood_id,
    item_count: submission.item_count,
    correct_count: submission.correct_count,
    cleared,
    accuracy: submission.correct_count / submission.item_count,
    required_correct: requiredCorrect,
    time_remaining_ms: submission.time_remaining_ms,
    speed_bonus_ratio: speedBonusRatio,
    can_retry: true,
    writes_checkpoint: cleared,
  };
}

export type StormPhase = "locked" | "ready" | "in_progress" | "cleared" | "failed";

export interface StormMachineState {
  phase: StormPhase;
  config: StormConfig;
  /** Known checkpoint state; the authoritative write is server-side (fail-closed). */
  checkpoint_cleared: boolean;
  last_result: StormResult | null;
}

export type StormEvent =
  | { type: "start" }
  | { type: "submit"; submission: StormSubmission }
  | { type: "retry" };

/**
 * Initial machine state derived from readiness + a known checkpoint flag. This is
 * the load-on-enter view; readiness only changes via an explicit refresh (a new
 * `initialStormMachineState` with fresh states), matching the no-realtime model.
 */
export function initialStormMachineState(input: {
  node_states: readonly StudentNodeState[];
  neighborhood_id?: DomainId;
  checkpoint_cleared?: boolean;
  config?: Partial<StormConfig>;
}): StormMachineState {
  const domain = input.neighborhood_id ?? D1_NEIGHBORHOOD_ID;
  const config = { ...defaultStormConfig(domain), ...input.config };
  const unlocked = isStormUnlocked(domain, input.node_states);
  const checkpointCleared = input.checkpoint_cleared ?? false;

  const phase: StormPhase = !unlocked ? "locked" : checkpointCleared ? "cleared" : "ready";

  return { phase, config, checkpoint_cleared: checkpointCleared, last_result: null };
}

/**
 * Deterministic transitions (time is passed as data, never read from a clock):
 * - start: begin an attempt from ready/failed/cleared (a cleared storm is
 *   replayable for enjoyment). Locked cannot start.
 * - submit: grade an in-progress attempt; a clear sets `checkpoint_cleared`
 *   (idempotent upstream — a replay grants no additional Prestige), a miss fails
 *   with no loss.
 * - retry: return a finished attempt to ready for an immediate re-attempt.
 */
export function stormReducer(
  state: StormMachineState,
  event: StormEvent,
): StormMachineState {
  switch (event.type) {
    case "start": {
      if (state.phase === "locked" || state.phase === "in_progress") {
        return state;
      }

      return { ...state, phase: "in_progress" };
    }

    case "submit": {
      if (state.phase !== "in_progress") {
        return state;
      }

      const result = gradeStorm(event.submission, {
        clear_ratio: state.config.clear_ratio,
        timer_budget_ms: state.config.timer_budget_ms,
      });

      if (result.cleared) {
        return {
          ...state,
          phase: "cleared",
          checkpoint_cleared: true,
          last_result: result,
        };
      }

      return { ...state, phase: "failed", last_result: result };
    }

    case "retry": {
      if (state.phase === "failed" || state.phase === "cleared") {
        return { ...state, phase: "ready" };
      }

      return state;
    }

    default:
      return state;
  }
}
