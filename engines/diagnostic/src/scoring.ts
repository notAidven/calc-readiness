import { getNode } from "@cr/skill-graph";
import type { PlacementEstimate, ScoringStatus } from "@cr/state-schema";

import type { ItemDifficulty, StageRole } from "./routing";

/**
 * Only genuinely answered items count. Application faults
 * (`scoring_error`/`unsupported_expression`) and malformed input
 * (`invalid_input`) are excluded from every denominator, never scored as wrong
 * (Assessment_Scoring_Spec §6, INV-DIAG-2).
 */
const SCORABLE_STATUSES: ReadonlySet<ScoringStatus> = new Set(["correct", "incorrect"]);

export function isScorable(status: ScoringStatus): boolean {
  return SCORABLE_STATUSES.has(status);
}

/** A response enriched with the served item's difficulty (the engine knows it from serving). */
export interface ScoredResponse {
  node_id: string;
  difficulty: ItemDifficulty;
  authoritative_correct: boolean;
  scoring_status: ScoringStatus;
}

export interface StageOutcome {
  stage_id: string;
  role: StageRole;
  responses: readonly ScoredResponse[];
}

/** Scorable proportion-correct for a set of responses; 0 when nothing is scorable. */
export function proportionCorrect(responses: readonly ScoredResponse[]): number {
  const scorable = responses.filter((response) => isScorable(response.scoring_status));
  if (scorable.length === 0) {
    return 0;
  }
  const correct = scorable.filter((response) => response.authoritative_correct).length;
  return correct / scorable.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function findRole(
  outcomes: readonly StageOutcome[],
  role: StageRole,
): StageOutcome | undefined {
  return outcomes.find((outcome) => outcome.role === role);
}

/**
 * Difficulty-aware ability frontier `θ ∈ [0, 3]` (Adaptive-Diagnostic amendment
 * §4.3). Computed ONLY from answered items (INV-DIAG-2) and path-invariant: two
 * students of equal ability reach the same route and the same score regardless
 * of which counterbalanced pool they saw.
 *
 *   routed up   (r >= bar):              θ = 2 + h        -> [2, 3]
 *   routed down (r < bar), e >= bar:     θ = 1 + r        -> [1, 2)
 *   routed down (r < bar), e <  bar:     θ = e            -> [0, 1)
 *
 * where r/h/e are the scorable proportion-correct on the routing/up/down stages.
 */
export function frontierScore(
  outcomes: readonly StageOutcome[],
  routingBar: number,
): number {
  const routing = findRole(outcomes, "routing");
  const up = findRole(outcomes, "up");
  const down = findRole(outcomes, "down");

  const r = routing ? proportionCorrect(routing.responses) : 0;

  if (up) {
    return clamp(2 + proportionCorrect(up.responses), 0, 3);
  }
  if (down) {
    const e = proportionCorrect(down.responses);
    return e >= routingBar ? clamp(1 + r, 0, 2) : clamp(e, 0, 1);
  }
  // Only the routing stage was administered (defensive fallback): scale medium
  // performance into the sub-"medium-cleared" band.
  return clamp(2 * r, 0, 2);
}

/**
 * Per-node placement from directly-measured items: the highest difficulty the
 * student answered correctly (L3->3, L2->2, L1->1), else 0. Placement seeds the
 * initial city visual only; it is never mastery (mastery always starts at 0).
 */
export function measuredPlacement(responses: readonly ScoredResponse[]): PlacementEstimate {
  let best = 0;
  for (const response of responses) {
    if (isScorable(response.scoring_status) && response.authoritative_correct) {
      best = Math.max(best, response.difficulty);
    }
  }
  return best as PlacementEstimate;
}

export interface PlacementResult {
  placement_by_node: Record<string, PlacementEstimate>;
  inferred_nodes: readonly string[];
}

/**
 * Build per-node placement over `targetNodes`, combining direct measurement with
 * graph inference. When a tested node is placed at level p, its transitive
 * prerequisites are credited as inferred placement >= p (foundational skills are
 * highly correlated, so clearing the dependent is strong evidence for the
 * prerequisites). Inferred placement seeds the city ONLY (INV-DIAG-2); measured
 * placement always wins over inference for the same node.
 */
export function computePlacement(
  responses: readonly ScoredResponse[],
  targetNodes: readonly string[],
): PlacementResult {
  const target = new Set(targetNodes);

  const byNode = new Map<string, ScoredResponse[]>();
  for (const response of responses) {
    const list = byNode.get(response.node_id);
    if (list) {
      list.push(response);
    } else {
      byNode.set(response.node_id, [response]);
    }
  }

  const measured = new Map<string, PlacementEstimate>();
  for (const [nodeId, nodeResponses] of byNode) {
    measured.set(nodeId, measuredPlacement(nodeResponses));
  }

  const placement = new Map<string, PlacementEstimate>();
  const inferred = new Set<string>();

  for (const nodeId of targetNodes) {
    placement.set(nodeId, measured.get(nodeId) ?? 0);
  }

  // Propagate each measured placement down to transitive prerequisites.
  for (const [nodeId, level] of measured) {
    if (level <= 0) {
      continue;
    }
    for (const prereqId of transitivePrereqs(nodeId)) {
      if (!target.has(prereqId)) {
        continue;
      }
      const directlyMeasured = measured.has(prereqId);
      if (directlyMeasured) {
        continue;
      }
      const current = placement.get(prereqId) ?? 0;
      if (level > current) {
        placement.set(prereqId, level);
        inferred.add(prereqId);
      } else if (current === 0) {
        inferred.add(prereqId);
      }
    }
  }

  return {
    placement_by_node: Object.fromEntries(placement),
    inferred_nodes: [...inferred].sort(),
  };
}

function transitivePrereqs(nodeId: string): Set<string> {
  const collected = new Set<string>();
  const stack = [...(getNode(nodeId)?.prereqs ?? [])];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || collected.has(current)) {
      continue;
    }
    collected.add(current);
    stack.push(...(getNode(current)?.prereqs ?? []));
  }
  return collected;
}
