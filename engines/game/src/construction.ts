import { MASTERY_CORRECT_COUNT, PRACTICE_SET_SIZE } from "@cr/mastery-service";
import type { Mastery, PlacementEstimate, StudentNodeState } from "@cr/state-schema";

/**
 * Construction-state derivation (pure, framework-free, rendering-only).
 *
 * A building's look is a deterministic derivation of the node's state. It is
 * never stored, never authoritative, and never written back to
 * `student_node_state`.
 *
 * THREE-STEP PROGRESSION (design: Foundation → Construction → Complete). The
 * visible stage tracks the learn→practice loop, mapped through `buildStageFor`:
 *   - Foundation (`site`): placed, lesson_stage `not_started` OR `teaching` — the
 *     building stays a bare site through the teaching + CFU segment.
 *   - Construction (`practice`): lesson_stage `practice` — the CFU is passed and the
 *     learner is working the practice set.
 *   - Complete (`complete`): the practice set is finished (lesson_stage `done`) OR
 *     the node tested out / is mastered (`mastery >= 2`). The exact score rides on
 *     top as MasteryStars (0–3); it does NOT gate the Complete stage.
 *
 * The `unfinished`/`gold` variants are legacy and no longer derived — the built
 * variants collapse into a single `complete` (built) stage, with mastery shown as
 * stars. Mastery is still checked BEFORE lesson_stage, so a mastered node always
 * reads complete regardless of lesson_stage.
 */

export type ConstructionState =
  | "preview"
  | "not_started"
  | "teaching"
  | "practice"
  | "unfinished"
  | "complete"
  | "gold";

/** Minimal per-node projection needed to derive a building's look. */
export type NodeProgressInput = Pick<
  StudentNodeState,
  "mastery" | "lesson_stage" | "placement_estimate"
>;

export interface ConstructionDerivationOptions {
  /**
   * Whether the node's item bank can fill a valid 5-item practice set
   * (Mastery_Scoring_Spec §7). A node that cannot is not authoring-complete and
   * renders as a permanent preview that can never reach `complete` (design §4.4).
   * All six D1 MVP nodes are authoring-complete; defaults to true.
   */
  authoring_complete?: boolean;
}

/** Kept for backward compatibility with the original `@cr/game` surface. */
export interface BuildingProgress {
  node_id: string;
  mastery: Mastery;
  complete: boolean;
  gold: boolean;
}

export function toBuildingProgress(state: StudentNodeState): BuildingProgress {
  return {
    node_id: state.node_id,
    mastery: state.mastery,
    complete: state.mastery >= 2,
    gold: state.mastery === 3,
  };
}

/**
 * The single deterministic construction rule (design: 3-step progression, first
 * match wins). A not-authoring-complete node degrades to `preview` and can never
 * complete.
 */
export function deriveConstructionState(
  input: NodeProgressInput,
  options?: ConstructionDerivationOptions,
): ConstructionState {
  const authoringComplete = options?.authoring_complete ?? true;

  if (!authoringComplete) {
    return "preview";
  }

  // Complete (built): the practice set is finished (`done`) OR the node tested out /
  // is mastered (`mastery >= 2`). Mastery is checked BEFORE lesson_stage, and the
  // score (1–3) rides on top as MasteryStars — it never gates the Complete STAGE.
  if (input.mastery >= 2 || input.lesson_stage === "done") {
    return "complete";
  }

  // Construction: the CFU is passed and the learner is in the practice set.
  if (input.lesson_stage === "practice") {
    return "practice";
  }

  // Foundation (site): placed, mid-teaching — stays a bare site through the lesson.
  if (input.lesson_stage === "teaching") {
    return "teaching";
  }

  return "not_started";
}

export type BlueprintProminence = "full" | "fading" | "hidden";

/**
 * The diagnostic placement rendered as a translucent ghost (design §3). Sized by
 * `placement_estimate` (higher placement → taller ghost), NOT by progress: the
 * ghost's height is orthogonal to mastery, and THIS derivation still keys off
 * mastery alone — placement never *directly* pre-builds here.
 *
 * Under the test-out amendment (RATIFIED 2026-07-26 by Gabe, diagnostic-lane owner
 * and tie-break; Evan ack'd, Anthony did not — cite that, not the old "ratified by
 * docs PR #36", which was false when it was written), a PASSED placement (>= 2) is
 * pre-seeded by the city session (`citySession.seedFromPlacement` / `placeSkill`)
 * to `lesson_stage "done"`
 * at MASTERY 0 — the building then derives `complete` off the lesson_stage rule
 * above and this ghost hides, while the node still shows zero of three stars. A
 * FAILED placement (0/1) keeps `not_started`, so the ghost stays until the lesson
 * is done. (So a tall ghost still isn't a pre-built building — the pre-build comes
 * from the session's seeded completion, not from placement itself, and it is
 * emphatically not seeded mastery: the practice still earns every star. See
 * `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` §8.1.)
 */
export interface BlueprintSilhouette {
  placement_estimate: PlacementEstimate;
  /** Ghost height, monotonic in placement (1..4 so placement 0 still shows). */
  height: number;
  prominence: BlueprintProminence;
  visible: boolean;
}

/** Minimum ghost height, so a placement-0 plot still shows a silhouette. */
const MIN_BLUEPRINT_HEIGHT = 1;

function blueprintProminence(state: ConstructionState): BlueprintProminence {
  if (state === "complete" || state === "gold") {
    return "hidden";
  }

  if (state === "not_started" || state === "preview") {
    return "full";
  }

  return "fading";
}

export function deriveBlueprint(
  input: NodeProgressInput,
  options?: ConstructionDerivationOptions,
): BlueprintSilhouette {
  const state = deriveConstructionState(input, options);
  const prominence = blueprintProminence(state);

  return {
    placement_estimate: input.placement_estimate,
    height: MIN_BLUEPRINT_HEIGHT + input.placement_estimate,
    prominence,
    visible: prominence !== "hidden",
  };
}

/**
 * The "4 of 5" legibility surface (Mastery_Scoring_Spec §10, design §4.3). The
 * thresholds come from the single frozen mastery constants, not re-hardcoded.
 */
export interface MasteryProgress {
  mastery: Mastery;
  required_correct: number;
  set_size: number;
  label: string;
}

/** The per-node facts the label needs beyond the construction stage. */
export interface MasteryLabelInput {
  mastery: Mastery;
  /**
   * Practice evidence for this node (`hasPracticeEvidence` —
   * `last_practiced_at !== null`). FALSE on a tested-out node, which the city
   * pre-builds to `lesson_stage "done"` at mastery 0 before the learner has
   * answered anything, so "4 of 5 correct" would be a score nobody recorded
   * (issue #103).
   */
  practiced: boolean;
}

/**
 * The state phrase that follows the building's construction-state label in the
 * announcements and the panel summary.
 *
 * It carries NO subject: every consumer already names the building and its state
 * immediately before it (`announcements.ts` — `buildingSelectionMessage`,
 * `lotSelectionMessage`, `skillSelectionMessage`), so a leading subject was both
 * redundant and the one path that leaked the internal `node_id` into
 * learner-facing text, which the roster deliberately keeps out of the UI.
 *
 * "N of 5 correct" is a CLAIM in the finished branch and a TARGET everywhere
 * else, so the finished branch only ever states it once the practice set really
 * produced it — mastery >= 2. A tested-out node reads as tested out, and a
 * finished-but-below-bar node reads as built with the bar still ahead of it.
 */
function masteryLabel(state: ConstructionState, input: MasteryLabelInput): string {
  switch (state) {
    case "gold":
      return `${PRACTICE_SET_SIZE} of ${PRACTICE_SET_SIZE} correct`;
    case "complete":
      if (!input.practiced) {
        return `Tested out on the diagnostic, no practice yet — ${MASTERY_CORRECT_COUNT} of ${PRACTICE_SET_SIZE} correct earns its mastery stars`;
      }
      if (input.mastery < 2) {
        return `Practice set finished — ${MASTERY_CORRECT_COUNT} of ${PRACTICE_SET_SIZE} correct earns its mastery stars`;
      }
      return `${MASTERY_CORRECT_COUNT} of ${PRACTICE_SET_SIZE} correct`;
    case "unfinished":
      return `${MASTERY_CORRECT_COUNT} of ${PRACTICE_SET_SIZE} correct finishes this building`;
    case "preview":
      return "Content in authoring";
    default:
      return `${MASTERY_CORRECT_COUNT} of ${PRACTICE_SET_SIZE} correct completes it`;
  }
}

export function masteryProgress(
  state: ConstructionState,
  input: MasteryLabelInput,
): MasteryProgress {
  return {
    mastery: input.mastery,
    required_correct: MASTERY_CORRECT_COUNT,
    set_size: PRACTICE_SET_SIZE,
    label: masteryLabel(state, input),
  };
}
