import type { EraId } from "@cr/skill-graph";

import { type CrisisDamageReport, NO_CRISIS_RUIN } from "./crisis-damage";
import { midEraCrisisNodeIds, midEraCrisisTrigger } from "./mid-era-crisis";
import { RELAY } from "./relay-tuning";

export const RELAY_ERA: EraId = "information_age";
/** Stable salt for the relay's deterministic question sequence. */
export const RELAY_SEED = 0xdec0ded;
/** Version of the serializable authoritative encounter state. */
export const RELAY_STATE_VERSION = 1;

export interface RelayEntry {
  readonly era: EraId;
  readonly trigger: number;
  readonly node_ids: readonly string[];
}

export function relayEntry(): RelayEntry {
  return {
    era: RELAY_ERA,
    trigger: midEraCrisisTrigger(RELAY_ERA),
    node_ids: midEraCrisisNodeIds(RELAY_ERA),
  };
}

export type RelayAction = "cut" | "restore";
export type RelayPhase = "deciding" | "armed" | "answering" | "settled";

export interface RelayRoundLog {
  readonly round: number;
  readonly action: RelayAction;
  readonly correct: number;
  readonly asked: number;
  readonly dark_before: number;
  readonly dark_after: number;
  readonly shutters_before: number;
  readonly shutters_after: number;
  readonly bands_written: number;
  readonly bands_through: number;
  /** City hop occupied before this resolved batch. */
  readonly probe_before: number;
  /** Advances exactly once when any counterfeit feed gets through. */
  readonly probe_after: number;
  /** Age of the physical evidence plates before this batch. */
  readonly evidence_epoch_before: number;
  /** Increments with a breach, making every earlier plate visibly stale. */
  readonly evidence_epoch_after: number;
}

export type RelayVerdict = "whole" | "held" | "overwritten";

/**
 * One concrete city target whose intake holds covers laid by a Cut round.
 *
 * The engine stores the route index rather than a placement id because only the city knows its
 * layout. This is the same boundary as `probe_index`: the city projects the index onto a real
 * placement and clamps it when a very small settlement has fewer hops.
 */
export interface RelayIsolation {
  readonly probe_index: number;
  readonly strength: number;
}

export interface RelayOutcome {
  readonly era: EraId;
  readonly dark: number;
  readonly standing: number;
  readonly verdict: RelayVerdict;
  readonly rounds: readonly RelayRoundLog[];
  readonly writes_mastery: false;
  readonly gates_progression: false;
}

export interface RelayState {
  readonly era: EraId;
  readonly phase: RelayPhase;
  /** One-based; remains on the final round after settlement. */
  readonly round: number;
  readonly dark: number;
  readonly shutters_closed: number;
  readonly copy: "ready" | "spent";
  readonly copy_spent_in_round: number | null;
  readonly armed: RelayAction | null;
  /**
   * Unbounded city-route hop. The renderer clamps it to the real placements available on the
   * learner's island, so the engine never needs to know a city layout.
   */
  readonly probe_index: number;
  /**
   * Monotone evidence age. A batch with no feed through leaves it fixed; a breach makes every
   * reading from an earlier epoch old without deleting what it said.
   */
  readonly evidence_epoch: number;
  /** Physical covers stay on the target where they landed until Restore reopens them. */
  readonly isolations: readonly RelayIsolation[];
  readonly rounds: readonly RelayRoundLog[];
  readonly outcome: RelayOutcome | null;
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

/** Reject a stale or partial browser snapshot instead of half-loading an encounter. */
export function isRelayState(value: unknown): value is RelayState {
  const state = recordOf(value);
  if (state === null) {
    return false;
  }
  const phase = state.phase;
  const armed = state.armed;
  const isolations = state.isolations;
  const rounds = state.rounds;
  if (
    state.era !== RELAY_ERA ||
    !["deciding", "armed", "answering", "settled"].includes(String(phase)) ||
    !Number.isInteger(state.round) ||
    (state.round as number) < 1 ||
    (state.round as number) > RELAY.rounds ||
    !Number.isInteger(state.dark) ||
    (state.dark as number) < 0 ||
    (state.dark as number) > RELAY.bands ||
    !Number.isInteger(state.shutters_closed) ||
    (state.shutters_closed as number) < 0 ||
    (state.shutters_closed as number) > RELAY.shutters ||
    !["ready", "spent"].includes(String(state.copy)) ||
    (state.copy_spent_in_round !== null &&
      (!Number.isInteger(state.copy_spent_in_round) ||
        (state.copy_spent_in_round as number) < 1 ||
        (state.copy_spent_in_round as number) > RELAY.rounds)) ||
    ![null, "cut", "restore"].includes(armed as null | string) ||
    !Number.isInteger(state.probe_index) ||
    (state.probe_index as number) < 0 ||
    !Number.isInteger(state.evidence_epoch) ||
    (state.evidence_epoch as number) < 0 ||
    !Array.isArray(isolations) ||
    !isolations.every((entry) => {
      const isolation = recordOf(entry);
      return (
        isolation !== null &&
        Number.isInteger(isolation.probe_index) &&
        (isolation.probe_index as number) >= 0 &&
        Number.isInteger(isolation.strength) &&
        (isolation.strength as number) >= 1 &&
        (isolation.strength as number) <= RELAY.shutters
      );
    }) ||
    !Array.isArray(rounds) ||
    !rounds.every((entry) => {
      const round = recordOf(entry);
      return (
        round !== null &&
        Number.isInteger(round.round) &&
        ["cut", "restore"].includes(String(round.action)) &&
        Number.isInteger(round.correct) &&
        Number.isInteger(round.asked) &&
        round.asked === RELAY.questions_per_round
      );
    })
  ) {
    return false;
  }
  if ((phase === "armed" || phase === "answering") !== (armed !== null)) {
    return false;
  }
  if ((phase === "deciding" || phase === "settled") && armed !== null) {
    return false;
  }
  return phase === "settled" ? state.outcome !== null : state.outcome === null;
}

export function createRelay(): RelayState {
  return {
    era: RELAY_ERA,
    phase: "deciding",
    round: 1,
    dark: RELAY.opens_dark,
    shutters_closed: 0,
    copy: "ready",
    copy_spent_in_round: null,
    armed: null,
    probe_index: 0,
    evidence_epoch: 0,
    isolations: [],
    rounds: [],
    outcome: null,
  };
}

export function relayActionRefusal(state: RelayState, action: RelayAction): string | null {
  if (state.phase !== "deciding") {
    return `Nothing can be chosen while the crisis is "${state.phase}".`;
  }
  if (action === "restore" && state.copy === "spent") {
    return `You restored from it in round ${state.copy_spent_in_round}. There was one.`;
  }
  return null;
}

export function relayLegalActions(state: RelayState): readonly RelayAction[] {
  if (state.phase !== "deciding") {
    return [];
  }
  return state.copy === "ready" ? ["cut", "restore"] : ["cut"];
}

export type RelayEvent =
  | { readonly type: "arm"; readonly action: RelayAction }
  | { readonly type: "disarm" }
  | { readonly type: "start_questions" }
  | {
      readonly type: "resolve_round";
      /** `null` means the checker could not read the answer; it is not a miss. */
      readonly correct: number | null;
      readonly asked: number;
    };

export function relayReducer(state: RelayState, event: RelayEvent): RelayState {
  switch (event.type) {
    case "arm": {
      if (relayActionRefusal(state, event.action) !== null) {
        return state;
      }
      return { ...state, phase: "armed", armed: event.action };
    }
    case "disarm": {
      return state.phase === "armed" ? { ...state, phase: "deciding", armed: null } : state;
    }
    case "start_questions": {
      return state.phase === "armed" && state.armed !== null
        ? { ...state, phase: "answering" }
        : state;
    }
    case "resolve_round": {
      if (state.phase !== "answering" || state.armed === null || event.correct === null) {
        return state;
      }
      return resolveRelayRound(state, state.armed, event.correct, event.asked);
    }
    default:
      return state;
  }
}

export interface RelayProjection {
  readonly action: RelayAction;
  readonly correct: number;
  readonly dark: number;
  readonly shutters_closed: number;
  readonly bands_written: number;
  readonly bands_through: number;
}

/** Preview one score without advancing the round. */
export function relayProjection(
  state: Pick<RelayState, "dark" | "shutters_closed">,
  action: RelayAction,
  correct: number,
): RelayProjection {
  requireScore(correct, RELAY.questions_per_round);
  if (action === "cut") {
    const shutters = Math.min(
      RELAY.shutters,
      state.shutters_closed + correct * RELAY.block_per_correct,
    );
    const through = Math.max(0, RELAY.feed_bands - shutters);
    return {
      action,
      correct,
      dark: Math.min(RELAY.bands, state.dark + through),
      shutters_closed: shutters,
      bands_written: 0,
      bands_through: through,
    };
  }

  const written = Math.min(
    state.dark,
    RELAY.restore_base + correct * RELAY.restore_per_correct,
  );
  const through = RELAY.copy_silences_feed
    ? 0
    : Math.max(0, RELAY.feed_bands - state.shutters_closed);
  return {
    action,
    correct,
    dark: Math.min(RELAY.bands, Math.max(0, state.dark - written) + through),
    shutters_closed: RELAY.restore_reopens_all ? 0 : state.shutters_closed,
    bands_written: written,
    bands_through: through,
  };
}

function requireScore(correct: number, asked: number): void {
  if (!Number.isInteger(asked) || asked !== RELAY.questions_per_round) {
    throw new Error(
      `An Intrusion round is three questions (got ${asked}). A short round would sell a cheaper action for the same round.`,
    );
  }
  if (!Number.isInteger(correct) || correct < 0 || correct > asked) {
    throw new Error(`An Intrusion round cannot score ${correct} of ${asked}.`);
  }
}

function resolveRelayRound(
  state: RelayState,
  action: RelayAction,
  correct: number,
  asked: number,
): RelayState {
  requireScore(correct, asked);
  const projected = relayProjection(state, action, correct);
  const breached = projected.bands_through > 0;
  const probeAfter = state.probe_index + (breached ? 1 : 0);
  const evidenceEpochAfter = state.evidence_epoch + (breached ? 1 : 0);
  const newlyClosed =
    action === "cut" ? projected.shutters_closed - state.shutters_closed : 0;
  const isolations =
    action === "restore"
      ? []
      : newlyClosed <= 0
        ? state.isolations
        : [
            ...state.isolations.filter(
              (isolation) => isolation.probe_index !== state.probe_index,
            ),
            {
              probe_index: state.probe_index,
              strength: Math.min(
                RELAY.shutters,
                newlyClosed +
                  (state.isolations.find(
                    (isolation) => isolation.probe_index === state.probe_index,
                  )?.strength ?? 0),
              ),
            },
          ].sort((a, b) => a.probe_index - b.probe_index);
  const log: RelayRoundLog = {
    round: state.round,
    action,
    correct,
    asked,
    dark_before: state.dark,
    dark_after: projected.dark,
    shutters_before: state.shutters_closed,
    shutters_after: projected.shutters_closed,
    bands_written: projected.bands_written,
    bands_through: projected.bands_through,
    probe_before: state.probe_index,
    probe_after: probeAfter,
    evidence_epoch_before: state.evidence_epoch,
    evidence_epoch_after: evidenceEpochAfter,
  };
  const rounds = [...state.rounds, log];
  const final = state.round >= RELAY.rounds;
  const committed: RelayState = {
    ...state,
    phase: final ? "settled" : "deciding",
    round: final ? state.round : state.round + 1,
    dark: projected.dark,
    shutters_closed: projected.shutters_closed,
    copy: action === "restore" ? "spent" : state.copy,
    copy_spent_in_round: action === "restore" ? state.round : state.copy_spent_in_round,
    armed: null,
    probe_index: probeAfter,
    evidence_epoch: evidenceEpochAfter,
    isolations,
    rounds,
    outcome: null,
  };
  return final ? { ...committed, outcome: relayOutcome(committed) } : committed;
}

export function relayOutcome(state: RelayState): RelayOutcome {
  return {
    era: state.era,
    dark: state.dark,
    standing: RELAY.bands - state.dark,
    verdict:
      state.dark === 0 ? "whole" : state.dark === RELAY.bands ? "overwritten" : "held",
    rounds: state.rounds,
    writes_mastery: false,
    gates_progression: false,
  };
}

export function relayDamage(
  outcome: RelayOutcome,
  placementId: string,
): CrisisDamageReport {
  return {
    ...NO_CRISIS_RUIN,
    overwritten_records:
      outcome.dark === 0 ? [] : [{ placement_id: placementId, bands_dark: outcome.dark }],
  };
}

export function relayResultLine(log: RelayRoundLog): string {
  if (log.action === "cut") {
    const closed = log.shutters_after - log.shutters_before;
    const coverLine =
      closed === 0
        ? "No new covers locked."
        : `${closed} ${closed === 1 ? "cover" : "covers"} locked.`;
    const throughLine =
      log.bands_through === 0
        ? "The trace stopped here."
        : `${log.bands_through} ${log.bands_through === 1 ? "band got" : "bands got"} through. The trace moved to the next building.`;
    return `${coverLine} ${throughLine} ${log.dark_after} of ${RELAY.bands} are overwritten.`;
  }
  return (
    `${log.bands_written} ${log.bands_written === 1 ? "band" : "bands"} back. ` +
    `${log.bands_through} got through. Covers reopened. ` +
    `${log.dark_after} of ${RELAY.bands} are overwritten.`
  );
}
