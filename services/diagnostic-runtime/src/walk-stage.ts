import type {
  DiagnosticItem,
  ItemDifficulty,
  StageAdvance,
  StageServe,
  WalkAdvance,
  WalkProbeItem,
  WalkServe,
} from "@cr/diagnostic";
import type { AssessmentItemSubmission } from "@cr/state-schema";

/**
 * Present the v2 prerequisite-gated walk through the SAME stage transport the MST
 * uses (`start`/`submitStage`/`finalize` + `StageServe`/`StageAdvance`). The walk
 * serves one adaptive probe at a time, so each probe maps to a one-item "section":
 * the runner UI, the browser_auth command protocol, and the client seam are all
 * unchanged across the flip — only the served instrument and the finalized metric
 * (coverage, via {@link CompletedWalkDiagnostic}) differ. Shared by the in-memory
 * browser client and the deployed Aurora walk server so the mapping lives once.
 */

/** The tier a probe is shown at when its source didn't stamp one (the L2 routing tier). */
export const DEFAULT_WALK_PROBE_DIFFICULTY: ItemDifficulty = 2;

/** A walk probe as a served diagnostic item (the shape the runner + client seam render). */
export function walkItemToDiagnosticItem(item: WalkProbeItem): DiagnosticItem {
  return {
    item_version_id: item.item_version_id,
    node_id: item.node_id,
    difficulty: item.difficulty ?? DEFAULT_WALK_PROBE_DIFFICULTY,
    item_definition_hash: item.item_definition_hash,
  };
}

/** The opening probe as a one-item stage serve (`stage_id` is the probed node). */
export function walkServeToStage(serve: WalkServe): StageServe {
  return {
    administration: serve.administration,
    stage_id: serve.node_id,
    items: [walkItemToDiagnosticItem(serve.item)],
  };
}

/** The next probe (or completion) as a stage advance (`stage_id` is the next node). */
export function walkAdvanceToStage(advance: WalkAdvance): StageAdvance {
  if (advance.complete) {
    return { complete: true };
  }
  return {
    complete: false,
    stage_id: advance.node_id,
    items: [walkItemToDiagnosticItem(advance.item)],
  };
}

/**
 * Take the single submission for a walk "section". The walk adjudicates one probe
 * per turn, so a section carries exactly one submission — anything else is a
 * caller/transport bug (surfaced loudly rather than silently dropping answers).
 */
export function oneProbeSubmission(
  submissions: readonly AssessmentItemSubmission[],
): AssessmentItemSubmission {
  const [submission, ...rest] = submissions;
  if (!submission || rest.length > 0) {
    throw new Error(
      `the walk serves one probe per section; expected exactly one submission, got ${submissions.length}`,
    );
  }
  return submission;
}
