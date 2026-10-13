import {
  createHardWinter,
  createPlague,
  createRelay,
  createSuccession,
  HARD_WINTER,
  hardWinterReducer,
  midEraCrisisNodeIds,
  PLAGUE,
  plagueAvailableActions,
  plagueReducer,
  RELAY,
  relayReducer,
  SUCCESSION,
  successionReducer,
} from "@cr/game";
import { PRACTICE_SET_SIZE } from "@cr/mastery-service";
import { type EraDefinition, type EraId, releasedEras } from "@cr/skill-graph";

import { hasPlayableCrisis } from "../city/crisisCall";
import { CRISIS_ERAS } from "../city/three/crisis/registry";
import { intrusionBatchForCheck } from "../intrusion/intrusionItems";
import { isNodeAuthoringComplete, practiceSourceForNode } from "../lessons/domains";
import { plagueBatchForCycle } from "../plague/plagueItems";
import { successionCycleBatch } from "../succession/successionItems";
import { winterBatchFor } from "../winter/hardWinterItems";

export interface EraReleaseGateIssue {
  readonly gate: "crisis" | "practice";
  readonly era_id?: EraId;
  readonly node_id?: string;
  readonly message: string;
}

type PracticeComposer = (nodeId: string) => readonly string[];

export interface PracticeReleaseGateOptions {
  readonly eras?: readonly EraDefinition[];
  readonly authoringComplete?: (nodeId: string) => boolean;
  readonly compose?: PracticeComposer;
}

const composePractice: PracticeComposer = (nodeId) =>
  practiceSourceForNode(nodeId).createSession().initialInstanceIds;

/**
 * Prove that every node exposed by the registry is the same node the city calls authored and can
 * compose the real five-item practice set. The optional seams exist only so failure paths remain
 * executable tests instead of comments beside a green population.
 */
export function validatePracticeReleaseGate(
  options: PracticeReleaseGateOptions = {},
): readonly EraReleaseGateIssue[] {
  const eras = options.eras ?? releasedEras();
  const authoringComplete = options.authoringComplete ?? isNodeAuthoringComplete;
  const compose = options.compose ?? composePractice;
  const issues: EraReleaseGateIssue[] = [];

  if (eras.length === 0) {
    issues.push({ gate: "practice", message: "No released era was checked." });
  }

  for (const era of eras) {
    if (era.nodes.length === 0) {
      issues.push({
        gate: "practice",
        era_id: era.id,
        message: "Released era has no nodes.",
      });
    }

    for (const nodeId of era.nodes) {
      if (!authoringComplete(nodeId)) {
        issues.push({
          gate: "practice",
          era_id: era.id,
          node_id: nodeId,
          message: "The city would render this released node as preview.",
        });
        continue;
      }

      try {
        const itemIds = compose(nodeId);
        if (
          itemIds.length !== PRACTICE_SET_SIZE ||
          new Set(itemIds).size !== PRACTICE_SET_SIZE
        ) {
          issues.push({
            gate: "practice",
            era_id: era.id,
            node_id: nodeId,
            message: `Practice composed ${itemIds.length} items (${new Set(itemIds).size} distinct); expected ${PRACTICE_SET_SIZE}.`,
          });
        }
      } catch (error) {
        issues.push({
          gate: "practice",
          era_id: era.id,
          node_id: nodeId,
          message: `Practice composition failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  }

  return issues;
}

/** Released eras that deliberately have no shipping crisis, asserted in both directions. */
export const CRISIS_RELEASE_EXEMPT_ERAS = [
  "neolithic",
  "bronze_age",
  "medieval",
  "industrial",
  "atomic_age",
  "cyberpunk",
] as const satisfies readonly EraId[];

type CrisisProbe = (eraId: EraId) => boolean;

export interface CrisisReleaseGateOptions {
  readonly eras?: readonly EraDefinition[];
  readonly playable?: (eraId: EraId) => boolean;
  readonly composeAtTrigger?: CrisisProbe;
  readonly reachesTerminal?: CrisisProbe;
}

function crisisComposesAtTrigger(eraId: EraId): boolean {
  const mastered = midEraCrisisNodeIds(eraId);
  switch (eraId) {
    case "prehistoric":
      return (
        winterBatchFor({ masteredNodeIds: mastered, encounter: 1, round: 1 }).status ===
        "ready"
      );
    case "classical":
      return (
        successionCycleBatch({ nodeIds: mastered, encounter: 1, cycle: 1 }).status ===
        "ready"
      );
    case "renaissance":
      return (
        plagueBatchForCycle({ masteredNodeIds: mastered, encounter: 1, cycle: 1 })
          .status === "ready"
      );
    case "information_age":
      return (
        intrusionBatchForCheck({ drawFrom: mastered, encounter: 1, check: 1 }).status ===
        "ready"
      );
    default:
      return false;
  }
}

function hardWinterReachesTerminal(): boolean {
  let state = createHardWinter({ era: "prehistoric" });
  for (
    let guard = 0;
    state.phase !== "ended" && guard < HARD_WINTER.rounds + 1;
    guard += 1
  ) {
    state = hardWinterReducer(state, {
      type: "declare",
      action: { kind: "reinforce", node_id: "NUM.S" },
    });
    state = hardWinterReducer(state, {
      type: "resolve",
      correct: HARD_WINTER.batch_size,
      asked: HARD_WINTER.batch_size,
    });
    state = hardWinterReducer(state, { type: "end_round" });
  }
  return state.phase === "ended" && state.outcome !== null;
}

function successionReachesTerminal(): boolean {
  let state = createSuccession();
  // The terminal is board exhaustion rather than a separately tuned cycle count. The largest
  // shipping board settles well below this fail-loud guard; the state-graph suite proves all
  // branches, while this release probe proves one concrete path stays wired.
  for (let guard = 0; state.phase !== "settled" && guard < 100; guard += 1) {
    if (state.phase === "ready") {
      state = successionReducer(state, { type: "start_batch" });
    } else if (state.phase === "answering") {
      state = successionReducer(state, {
        type: "resolve_batch",
        correct: SUCCESSION.batch_size,
        asked: SUCCESSION.batch_size,
      });
    } else if (state.proposal === null) {
      state = successionReducer(state, { type: "finish_response" });
    } else {
      state = successionReducer(state, { type: "cancel_proposal" });
    }
  }
  return state.phase === "settled";
}

function plagueReachesTerminal(): boolean {
  let state = createPlague();
  for (
    let guard = 0;
    state.phase !== "ended" && guard < PLAGUE.rounds * 6 + 6;
    guard += 1
  ) {
    if (state.phase === "choosing") {
      const action = plagueAvailableActions(state)[0];
      if (!action) return false;
      state = plagueReducer(state, {
        type: "choose_action",
        action,
        question_ids: ["release-q1", "release-q2", "release-q3"],
        expected_revision: state.revision,
      });
    } else if (state.phase === "answering") {
      const questionId = state.question_ids[state.answers.length];
      if (!questionId) return false;
      state = plagueReducer(state, {
        type: "answer",
        question_id: questionId,
        correct: true,
        expected_revision: state.revision,
      });
    } else {
      state = plagueReducer(state, {
        type: "advance",
        expected_revision: state.revision,
      });
    }
  }
  return state.phase === "ended" && state.outcome !== null;
}

function relayReachesTerminal(): boolean {
  let state = createRelay();
  for (let guard = 0; state.phase !== "settled" && guard < RELAY.rounds + 1; guard += 1) {
    state = relayReducer(state, { type: "arm", action: "cut" });
    state = relayReducer(state, { type: "start_questions" });
    state = relayReducer(state, {
      type: "resolve_round",
      correct: RELAY.questions_per_round,
      asked: RELAY.questions_per_round,
    });
  }
  return state.phase === "settled" && state.outcome !== null;
}

function crisisReachesTerminal(eraId: EraId): boolean {
  switch (eraId) {
    case "prehistoric":
      return hardWinterReachesTerminal();
    case "classical":
      return successionReachesTerminal();
    case "renaissance":
      return plagueReachesTerminal();
    case "information_age":
      return relayReachesTerminal();
    default:
      return false;
  }
}

/** Validate the separate crisis promise over the same explicit released-era population. */
export function validateCrisisReleaseGate(
  options: CrisisReleaseGateOptions = {},
): readonly EraReleaseGateIssue[] {
  const eras = options.eras ?? releasedEras();
  const playable = options.playable ?? hasPlayableCrisis;
  const composeAtTrigger = options.composeAtTrigger ?? crisisComposesAtTrigger;
  const reachesTerminal = options.reachesTerminal ?? crisisReachesTerminal;
  const issues: EraReleaseGateIssue[] = [];
  const playableEras = eras.filter((era) => playable(era.id));

  if (playableEras.length < 4) {
    issues.push({
      gate: "crisis",
      message: `Only ${playableEras.length} released crisis eras were checked; expected at least 4.`,
    });
  }

  const registry = new Set<EraId>(CRISIS_ERAS);
  for (const era of eras) {
    if (playable(era.id) !== registry.has(era.id)) {
      issues.push({
        gate: "crisis",
        era_id: era.id,
        message: "The standing-call predicate and shipping-crisis registry disagree.",
      });
    }
  }

  const actualExempt = eras.filter((era) => !playable(era.id)).map((era) => era.id);
  const expectedExempt = new Set<EraId>(CRISIS_RELEASE_EXEMPT_ERAS);
  for (const eraId of actualExempt) {
    if (!expectedExempt.has(eraId)) {
      issues.push({
        gate: "crisis",
        era_id: eraId,
        message: "Unrecorded crisis exemption.",
      });
    }
  }
  for (const eraId of expectedExempt) {
    if (!actualExempt.includes(eraId)) {
      issues.push({ gate: "crisis", era_id: eraId, message: "Stale crisis exemption." });
    }
  }

  for (const era of playableEras) {
    if (!composeAtTrigger(era.id)) {
      issues.push({
        gate: "crisis",
        era_id: era.id,
        message: "The real crisis composer refused the trigger state.",
      });
    }
    if (!reachesTerminal(era.id)) {
      issues.push({
        gate: "crisis",
        era_id: era.id,
        message: "No bounded terminal path was demonstrated.",
      });
    }
  }

  return issues;
}
