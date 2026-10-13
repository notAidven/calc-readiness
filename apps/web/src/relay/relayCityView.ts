import type { RelayAction, RelayState } from "@cr/game";

export interface RelayAnswerFeedback {
  readonly answered: number;
  readonly verdicts: readonly boolean[];
}

export type RelayEvidenceState = "unread" | "current" | "stale";
export type RelayCoverState = "open" | "proposed" | "closed";
export type RelayAnswerLock = "open" | "held" | "gap";

export interface RelayCityTargetView {
  readonly nodeId: string;
  readonly routeIndex: number;
  readonly evidence: RelayEvidenceState;
  readonly cover: RelayCoverState;
  /** Number of the engine's three physical cover bars fixed to this target. */
  readonly coverStrength: number;
  readonly active: boolean;
}

export interface RelayCityView {
  readonly targets: readonly RelayCityTargetView[];
  readonly activeTargetId: string | null;
  readonly activeIndex: number;
  readonly staleCount: number;
  readonly coveredCount: number;
  readonly darkBands: number;
  readonly evidenceEpoch: number;
  readonly proposal: "cover" | "trace" | null;
  readonly answerLocks: readonly RelayAnswerLock[];
  readonly ending: "active" | "contained" | "scarred";
  readonly probeMovedLastRound: boolean;
}

function proposalFor(action: RelayAction | null): RelayCityView["proposal"] {
  if (action === "cut") {
    return "cover";
  }
  if (action === "restore") {
    return "trace";
  }
  return null;
}

function lockState(verdict: boolean | undefined): RelayAnswerLock {
  if (verdict === undefined) {
    return "open";
  }
  return verdict ? "held" : "gap";
}

/**
 * Project the engine's anonymous record arithmetic onto the buildings that actually exist.
 *
 * Target order is supplied by the city because only the city knows its placements. The engine
 * keeps an unbounded hop and this clamps it to the final real building; a short city therefore
 * still tells the truth instead of inventing an off-island destination.
 */
export function relayCityView(
  state: RelayState,
  targetIds: readonly string[],
  feedback: RelayAnswerFeedback = { answered: 0, verdicts: [] },
): RelayCityView {
  const activeIndex =
    targetIds.length === 0 ? -1 : Math.min(state.probe_index, targetIds.length - 1);
  const proposal = state.phase === "armed" ? proposalFor(state.armed) : null;
  const isolationStrength = new Map<number, number>();
  for (const isolation of state.isolations) {
    if (targetIds.length === 0) {
      continue;
    }
    const targetIndex = Math.min(isolation.probe_index, targetIds.length - 1);
    isolationStrength.set(
      targetIndex,
      Math.min(3, (isolationStrength.get(targetIndex) ?? 0) + isolation.strength),
    );
  }

  const targets = targetIds.map((nodeId, routeIndex): RelayCityTargetView => {
    const coverStrength = isolationStrength.get(routeIndex) ?? 0;
    const cover: RelayCoverState =
      coverStrength > 0
        ? "closed"
        : activeIndex >= 0 && routeIndex === activeIndex && proposal === "cover"
          ? "proposed"
          : "open";
    const evidence: RelayEvidenceState =
      routeIndex < activeIndex && state.evidence_epoch > 0
        ? "stale"
        : routeIndex === activeIndex
          ? "current"
          : "unread";
    return {
      nodeId,
      routeIndex,
      evidence,
      cover,
      coverStrength,
      active: routeIndex === activeIndex,
    };
  });
  const lastRound = state.rounds.at(-1);

  return {
    targets,
    activeTargetId: activeIndex < 0 ? null : (targetIds[activeIndex] ?? null),
    activeIndex,
    staleCount: targets.filter((target) => target.evidence === "stale").length,
    coveredCount: targets.reduce((total, target) => total + target.coverStrength, 0),
    darkBands: state.dark,
    evidenceEpoch: state.evidence_epoch,
    proposal,
    answerLocks: Array.from({ length: 3 }, (_, index) =>
      lockState(index < feedback.answered ? feedback.verdicts[index] : undefined),
    ),
    ending:
      state.phase !== "settled" ? "active" : state.dark === 0 ? "contained" : "scarred",
    probeMovedLastRound: (lastRound?.probe_after ?? 0) > (lastRound?.probe_before ?? 0),
  };
}
