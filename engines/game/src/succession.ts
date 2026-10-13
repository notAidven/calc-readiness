import type { EraId } from "@cr/skill-graph";

import { type CrisisDamageReport, NO_CRISIS_RUIN } from "./crisis-damage";
import { midEraCrisisNodeIds, midEraCrisisTrigger } from "./mid-era-crisis";
import {
  type Allegiance,
  type CivicClaimState,
  type ClaimantId,
  SUCCESSION,
  type SuccessionBoard,
  type SuccessionCivicPlan,
  type SuccessionCivicType,
  type SuccessionDistrictPlan,
} from "./succession-tuning";

export { SUCCESSION };

/**
 * Era four's production Succession crisis.
 *
 * This is intentionally smaller than the superseded planner. One district is threatened,
 * a batch of three lets the rival claim it, and the player chooses one of two paid responses:
 * rally the next undecided district or reopen the newest closed civic building.
 *
 * The reducer is pure and has no time input. Proposing and committing actions never advances
 * the rival; only a valid `resolve_batch` event does.
 */

export const SUCCESSION_ERA: EraId = "classical";
export const SUCCESSION_BATTLE_VERSION = 1;
export const SUCCESSION_LIVE_CITY_BOARD = "live-city";
export const SUCCESSION_MAX_CITY_WARDS = 7;

export interface SuccessionEntry {
  readonly era: EraId;
  readonly trigger: number;
  readonly node_ids: readonly string[];
}

export function successionEntry(): SuccessionEntry {
  return {
    era: SUCCESSION_ERA,
    trigger: midEraCrisisTrigger(SUCCESSION_ERA),
    node_ids: midEraCrisisNodeIds(SUCCESSION_ERA),
  };
}

/**
 * The approved surface is one six-district forum. Keeping one production board is part of
 * the Hard Winter simplicity bar: a reload changes no geography and a tuning comparison
 * never crosses different encounter lengths.
 */
export function successionBoards(): readonly SuccessionBoard[] {
  const board = SUCCESSION.boards.find((candidate) => candidate.id === "six-wards");
  return board ? [board] : SUCCESSION.boards.slice(0, 1);
}

export function defaultSuccessionBoard(): SuccessionBoard {
  const board = successionBoards()[0];
  if (!board) {
    throw new Error("The Succession needs one authored board.");
  }
  return board;
}

export function successionBoardById(id: string): SuccessionBoard {
  const board = successionBoards().find((candidate) => candidate.id === id);
  if (!board) {
    throw new Error(`There is no production Succession board "${id}".`);
  }
  return board;
}

export function successionBoardFor(encounter: number): SuccessionBoard {
  if (!Number.isInteger(encounter) || encounter < 1) {
    throw new Error(`A Succession encounter is a whole number from 1 (got ${encounter}).`);
  }
  return defaultSuccessionBoard();
}

export type SuccessionSide = "player" | "rival";
export type SuccessionControl = "undecided" | SuccessionSide;
export type SuccessionCivicState = "open" | "closed";
export type SuccessionActionKind = "rally" | "reopen";
export type SuccessionPhase = "ready" | "answering" | "response" | "settled";

export interface SuccessionDistrict {
  readonly id: string;
  readonly label: string;
  readonly civic: SuccessionCivicPlan;
  readonly exposure: number;
  /** No statue is `undecided`; a player/rival statue is the other two values. */
  readonly control: SuccessionControl;
  /** Rival action closes capacity; reopening changes this field and never control. */
  readonly civic_state: SuccessionCivicState;
  readonly decided_by: SuccessionSide | null;
  readonly decided_after_batch: number | null;
  readonly reopened_after_batch: number | null;

  /**
   * Compatibility projections for the procedural scene's existing geometry vocabulary.
   * They are derived together with the fields above and are never read by the reducer.
   */
  readonly allegiance: Allegiance;
  readonly decided_in_cycle: number | null;
  readonly civic_claim: CivicClaimState;
  readonly civic_holder: ClaimantId | null;
  readonly warned_in_cycle: number | null;
}

export interface SuccessionThreat {
  readonly district_id: string;
  readonly district_label: string;
  readonly civic_label: string;
  readonly to: "rival";
}

export interface SuccessionActionOffer {
  readonly kind: SuccessionActionKind;
  readonly district_id: string;
  readonly district_label: string;
  readonly civic_label: string;
  readonly cost: number;
}

export interface SuccessionCommittedAction extends SuccessionActionOffer {
  readonly committed_after_batch: number;
}

export interface SuccessionBatchLog {
  readonly batch: number;
  readonly correct: number;
  readonly asked: number;
  readonly influence_earned: number;
  readonly rival_claimed: string;
}

export type SuccessionVerdict = "best" | "partial" | "fractured";

export interface SuccessionOutcome {
  readonly era: EraId;
  readonly board: string;
  readonly batches: number;
  readonly districts_total: number;
  readonly player_controlled: number;
  readonly rival_controlled: number;
  readonly civic_buildings_open: number;
  readonly civic_buildings_closed: number;
  /**
   * A transparent quality measure: player-controlled districts count twice, functioning
   * civic buildings once. Accuracy never enters this formula; it only sized the influence
   * that made these board states reachable.
   */
  readonly score: number;
  readonly verdict: SuccessionVerdict;
  readonly influence_earned: number;
  readonly influence_spent: number;
  readonly influence_unspent: number;
  readonly suspended_civic: readonly string[];
  readonly writes_mastery: false;
  readonly gates_progression: false;
}

export interface SuccessionState {
  readonly battle_version: typeof SUCCESSION_BATTLE_VERSION;
  readonly era: EraId;
  readonly board: string;
  /** Number of complete three-question batches. */
  readonly batch: number;
  readonly phase: SuccessionPhase;
  readonly districts: readonly SuccessionDistrict[];
  readonly influence: number;
  readonly earned: number;
  readonly spent: number;
  readonly proposal: SuccessionActionOffer | null;
  readonly actions_this_response: Readonly<Record<SuccessionActionKind, boolean>>;
  readonly last_batch: SuccessionBatchLog | null;
  readonly last_action: SuccessionCommittedAction | null;
  readonly batch_log: readonly SuccessionBatchLog[];
  readonly action_log: readonly SuccessionCommittedAction[];
  readonly outcome: SuccessionOutcome | null;
}

export interface CreateSuccessionInput {
  readonly era?: EraId;
  readonly board?: SuccessionBoard;
  /** Dynamic board identity, used by the live-city adapter. */
  readonly boardId?: string;
  /** Real-city placement ids in deterministic roster order. */
  readonly districts?: readonly SuccessionDistrictPlan[];
}

export interface SuccessionRosterMember {
  /** Stable city placement id, separate from the engine's ward id. */
  readonly placement_id: string;
  readonly label: string;
  /** Only bought civic placements can be written to `suspended_civic`. */
  readonly suspendable: boolean;
}

const SUCCESSION_CIVIC_TYPES: readonly SuccessionCivicType[] = [
  "grain_dock",
  "cottages",
  "baths",
  "fountain",
];

/**
 * Turn the city's stable placement roster into engine wards.
 *
 * The engine receives identity and order only. Grid transforms remain in the city/render lane,
 * so binding the crisis to real buildings does not import a topology into its rules. The first
 * seven stable ids bound encounter length and the procedural crowd; a larger city still supplies
 * real members rather than stand-ins, but does not turn this crisis into a twenty-round census.
 */
export function successionDistrictsForRoster(
  roster: readonly SuccessionRosterMember[],
): readonly SuccessionDistrictPlan[] {
  if (roster.length < 2) {
    throw new Error(
      `The live-city Succession needs at least two placed buildings (got ${roster.length}).`,
    );
  }
  const ordered = [...roster].sort((left, right) =>
    left.placement_id < right.placement_id
      ? -1
      : left.placement_id > right.placement_id
        ? 1
        : 0,
  );
  const unique = new Set(ordered.map((member) => member.placement_id));
  if (unique.size !== ordered.length) {
    throw new Error("The live-city Succession roster contains a duplicate placement id.");
  }
  return ordered.slice(0, SUCCESSION_MAX_CITY_WARDS).map((member, index) => ({
    id: `city-ward:${member.placement_id}`,
    label: `${member.label} ward`,
    exposure: index,
    civic: {
      placement_id: member.placement_id,
      label: member.label,
      type: SUCCESSION_CIVIC_TYPES[
        index % SUCCESSION_CIVIC_TYPES.length
      ] as SuccessionCivicType,
      suspendable: member.suspendable,
    },
  }));
}

function claimantFor(control: SuccessionControl): Allegiance {
  if (control === "player") {
    return SUCCESSION.sides.player.claimant;
  }
  if (control === "rival") {
    return SUCCESSION.sides.rival.claimant;
  }
  return "neutral";
}

function districtState(
  district: SuccessionDistrict,
  patch: Partial<
    Pick<
      SuccessionDistrict,
      | "control"
      | "civic_state"
      | "decided_by"
      | "decided_after_batch"
      | "reopened_after_batch"
    >
  >,
): SuccessionDistrict {
  const control = patch.control ?? district.control;
  const civicState = patch.civic_state ?? district.civic_state;
  const allegiance = claimantFor(control);
  return {
    ...district,
    ...patch,
    control,
    civic_state: civicState,
    allegiance,
    decided_in_cycle: patch.decided_after_batch ?? district.decided_after_batch,
    civic_claim:
      civicState === "closed"
        ? "contested"
        : control === "undecided"
          ? "unclaimed"
          : "claimed",
    civic_holder: allegiance === "neutral" ? null : allegiance,
    warned_in_cycle: null,
  };
}

export function createSuccession(input: CreateSuccessionInput = {}): SuccessionState {
  const board = input.board ?? defaultSuccessionBoard();
  const plans = input.districts ?? board.districts;
  if (plans.length < 2) {
    throw new Error(
      `The Succession needs at least two districts for a civic choice (got ${plans.length}).`,
    );
  }
  return {
    battle_version: SUCCESSION_BATTLE_VERSION,
    era: input.era ?? SUCCESSION_ERA,
    board: input.boardId ?? board.id,
    batch: 0,
    phase: "ready",
    districts: [...plans]
      .sort((first, second) => first.exposure - second.exposure)
      .map((plan) => ({
        ...plan,
        control: "undecided",
        civic_state: "open",
        decided_by: null,
        decided_after_batch: null,
        reopened_after_batch: null,
        allegiance: "neutral",
        decided_in_cycle: null,
        civic_claim: "unclaimed",
        civic_holder: null,
        warned_in_cycle: null,
      })),
    influence: 0,
    earned: 0,
    spent: 0,
    proposal: null,
    actions_this_response: { rally: false, reopen: false },
    last_batch: null,
    last_action: null,
    batch_log: [],
    action_log: [],
    outcome: null,
  };
}

export function successionCountersFor(correct: number): number {
  if (
    !Number.isInteger(correct) ||
    correct < 0 ||
    correct >= SUCCESSION.influence_by_correct.length
  ) {
    throw new Error(`A Succession batch scores 0 to ${SUCCESSION.batch_size} correct.`);
  }
  return SUCCESSION.influence_by_correct[correct] as number;
}

export function successionThreat(state: SuccessionState): SuccessionThreat | null {
  const district = [...state.districts]
    .sort((first, second) => first.exposure - second.exposure)
    .find((candidate) => candidate.control === "undecided");
  return district
    ? {
        district_id: district.id,
        district_label: district.label,
        civic_label: district.civic.label,
        to: "rival",
      }
    : null;
}

function newestClosure(state: SuccessionState): SuccessionDistrict | null {
  return (
    [...state.districts]
      .filter(
        (district) => district.control === "rival" && district.civic_state === "closed",
      )
      .sort(
        (first, second) =>
          (second.decided_after_batch ?? -1) - (first.decided_after_batch ?? -1) ||
          first.exposure - second.exposure,
      )[0] ?? null
  );
}

function offerFor(
  state: SuccessionState,
  kind: SuccessionActionKind,
  allowLegacySecondResponse = false,
): SuccessionActionOffer | null {
  if (
    state.phase !== "response" ||
    state.actions_this_response[kind] ||
    (!allowLegacySecondResponse &&
      Object.values(state.actions_this_response).some(Boolean)) ||
    state.proposal !== null
  ) {
    return null;
  }
  const cost = SUCCESSION.actions[kind].cost;
  if (state.influence < cost) {
    return null;
  }
  if (kind === "rally") {
    const threat = successionThreat(state);
    return threat
      ? {
          kind,
          district_id: threat.district_id,
          district_label: threat.district_label,
          civic_label: threat.civic_label,
          cost,
        }
      : null;
  }
  const district = newestClosure(state);
  return district
    ? {
        kind,
        district_id: district.id,
        district_label: district.label,
        civic_label: district.civic.label,
        cost,
      }
    : null;
}

export function successionActionOffers(
  state: SuccessionState,
): readonly SuccessionActionOffer[] {
  const offers = (["rally", "reopen"] as const)
    .map((kind) => offerFor(state, kind))
    .filter((offer): offer is SuccessionActionOffer => offer !== null);
  return offers;
}

/**
 * The UI uses a choice treatment only when both strategic actions are live. A single legal
 * action can still be taken, but it is never dressed as a decision between alternatives.
 */
export function successionMeaningfulChoice(
  state: SuccessionState,
): readonly SuccessionActionOffer[] {
  const offers = successionActionOffers(state);
  return offers.length === 2 ? offers : [];
}

export type SuccessionEvent =
  | { readonly type: "start_batch" }
  | { readonly type: "resolve_batch"; readonly correct: number; readonly asked: number }
  | { readonly type: "propose_action"; readonly kind: SuccessionActionKind }
  | { readonly type: "cancel_proposal" }
  | { readonly type: "commit_action" }
  | { readonly type: "finish_response" };

function validBatch(correct: number, asked: number): boolean {
  return (
    Number.isInteger(correct) &&
    Number.isInteger(asked) &&
    asked === SUCCESSION.batch_size &&
    correct >= 0 &&
    correct <= asked
  );
}

function outcomeFor(state: SuccessionState): SuccessionOutcome {
  const player = state.districts.filter((district) => district.control === "player").length;
  const rival = state.districts.filter((district) => district.control === "rival").length;
  const workingWards = state.districts.filter(
    (district) => district.civic_state === "open",
  ).length;
  const actualCivics = state.districts.filter(
    (district) => district.civic.suspendable !== false,
  );
  const open = actualCivics.filter((district) => district.civic_state === "open").length;
  const closed = actualCivics.length - open;
  const score = player * 2 + workingWards;
  const bestScore = Math.max(3, Math.floor(state.districts.length / 2) * 3);
  const partialScore = Math.ceil((bestScore * 2) / 3);
  return {
    era: state.era,
    board: state.board,
    batches: state.batch,
    districts_total: state.districts.length,
    player_controlled: player,
    rival_controlled: rival,
    civic_buildings_open: open,
    civic_buildings_closed: closed,
    score,
    verdict: score >= bestScore ? "best" : score >= partialScore ? "partial" : "fractured",
    influence_earned: state.earned,
    influence_spent: state.spent,
    influence_unspent: state.influence,
    suspended_civic: state.districts
      .filter(
        (district) =>
          district.civic_state === "closed" && district.civic.suspendable !== false,
      )
      .map((district) => district.civic.placement_id),
    writes_mastery: false,
    gates_progression: false,
  };
}

/**
 * Commit the proposal currently on the state.
 *
 * The legacy flag is parser-only. Version-one battles could commit rally and reopen after the
 * same batch; accepting those logs on reload preserves already-played server battles while the
 * live reducer below permits one response. New commands never pass the flag.
 */
function commitProposed(
  state: SuccessionState,
  allowLegacySecondResponse = false,
): SuccessionState {
  if (state.phase !== "response" || state.proposal === null) {
    return state;
  }
  const proposed = state.proposal;
  const current = offerFor(
    { ...state, proposal: null },
    proposed.kind,
    allowLegacySecondResponse,
  );
  if (current === null || JSON.stringify(current) !== JSON.stringify(proposed)) {
    return state;
  }
  const districts = state.districts.map((district) => {
    if (district.id !== proposed.district_id) {
      return district;
    }
    return proposed.kind === "rally"
      ? districtState(district, {
          control: "player",
          civic_state: "open",
          decided_by: "player",
          decided_after_batch: state.batch,
        })
      : districtState(district, {
          civic_state: "open",
          reopened_after_batch: state.batch,
        });
  });
  const committed: SuccessionCommittedAction = {
    ...proposed,
    committed_after_batch: state.batch,
  };
  return {
    ...state,
    districts,
    influence: state.influence - proposed.cost,
    spent: state.spent + proposed.cost,
    proposal: null,
    actions_this_response: {
      ...state.actions_this_response,
      [proposed.kind]: true,
    },
    last_action: committed,
    action_log: [...state.action_log, committed],
  };
}

export function successionReducer(
  state: SuccessionState,
  event: SuccessionEvent,
): SuccessionState {
  switch (event.type) {
    case "start_batch":
      return state.phase === "ready" ? { ...state, phase: "answering" } : state;

    case "resolve_batch": {
      if (state.phase !== "answering" || !validBatch(event.correct, event.asked)) {
        return state;
      }
      const threat = successionThreat(state);
      if (!threat) {
        return state;
      }
      const nextBatch = state.batch + 1;
      const influence = successionCountersFor(event.correct);
      const districts = state.districts.map((district) =>
        district.id === threat.district_id
          ? districtState(district, {
              control: "rival",
              civic_state: "closed",
              decided_by: "rival",
              decided_after_batch: nextBatch,
            })
          : district,
      );
      const log: SuccessionBatchLog = {
        batch: nextBatch,
        correct: event.correct,
        asked: event.asked,
        influence_earned: influence,
        rival_claimed: threat.district_id,
      };
      return {
        ...state,
        batch: nextBatch,
        phase: "response",
        districts,
        influence: state.influence + influence,
        earned: state.earned + influence,
        proposal: null,
        actions_this_response: { rally: false, reopen: false },
        last_batch: log,
        batch_log: [...state.batch_log, log],
      };
    }

    case "propose_action": {
      const offer = offerFor(state, event.kind);
      return offer ? { ...state, proposal: offer } : state;
    }

    case "cancel_proposal":
      return state.phase === "response" && state.proposal !== null
        ? { ...state, proposal: null }
        : state;

    case "commit_action": {
      return commitProposed(state);
    }

    case "finish_response": {
      if (state.phase !== "response" || state.proposal !== null) {
        return state;
      }
      if (successionThreat(state) !== null) {
        return {
          ...state,
          phase: "ready",
          actions_this_response: { rally: false, reopen: false },
        };
      }
      const settled = { ...state, phase: "settled" as const };
      return { ...settled, outcome: outcomeFor(settled) };
    }
  }
}

export function successionOutcome(state: SuccessionState): SuccessionOutcome {
  return state.outcome ?? outcomeFor(state);
}

export function successionDamage(state: SuccessionState): CrisisDamageReport {
  return {
    ...NO_CRISIS_RUIN,
    suspended_civic: state.districts
      .filter(
        (district) =>
          district.civic_state === "closed" && district.civic.suspendable !== false,
      )
      .map((district) => district.civic.placement_id),
  };
}

/** Current holdings in the legacy claimant id space used by procedural marks. */
export function successionHoldings(
  districts: readonly SuccessionDistrict[],
): Readonly<Record<ClaimantId, number>> {
  return {
    standing: districts.filter((district) => district.control === "player").length,
    seated: districts.filter((district) => district.control === "rival").length,
  };
}

export function successionStrengths(
  districts: readonly SuccessionDistrict[],
): Readonly<Record<ClaimantId, number>> {
  return successionHoldings(districts);
}

export function strongestClaimant(districts: readonly SuccessionDistrict[]): ClaimantId {
  const held = successionHoldings(districts);
  return held.seated > held.standing ? "seated" : "standing";
}

/** Compatibility projection: the one threat is the old renderer's one standing block. */
export interface SuccessionBlock {
  readonly district_id: string;
  readonly district_label: string;
  readonly warned_in_cycle: number;
  readonly to: ClaimantId;
}

export function successionStandingBlocks(
  state: SuccessionState,
): readonly SuccessionBlock[] {
  const threat = successionThreat(state);
  return threat
    ? [
        {
          district_id: threat.district_id,
          district_label: threat.district_label,
          warned_in_cycle: state.batch,
          to: SUCCESSION.sides.rival.claimant,
        },
      ]
    : [];
}

export function successionDriftLine(state: SuccessionState): SuccessionBlock | null {
  return successionStandingBlocks(state)[0] ?? null;
}

export function successionNextToWarn(
  districts: readonly SuccessionDistrict[],
): readonly SuccessionDistrict[] {
  const district = [...districts]
    .sort((first, second) => first.exposure - second.exposure)
    .find((candidate) => candidate.control === "undecided");
  return district ? [district] : [];
}

/**
 * Save the exact battle. Parsing does not trust the object: it replays the immutable batch and
 * committed-action logs through the reducer and accepts only a byte-for-byte matching result.
 */
export function serializeSuccessionState(state: SuccessionState): string {
  return JSON.stringify(state);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function replaySavedState(candidate: SuccessionState): SuccessionState | null {
  let state: SuccessionState;
  try {
    if (candidate.board === SUCCESSION_LIVE_CITY_BOARD) {
      state = createSuccession({
        boardId: SUCCESSION_LIVE_CITY_BOARD,
        districts: candidate.districts.map((district) => ({
          id: district.id,
          label: district.label,
          exposure: district.exposure,
          civic: district.civic,
        })),
      });
    } else {
      state = createSuccession({ board: successionBoardById(candidate.board) });
    }
  } catch {
    return null;
  }
  const actionsByBatch = new Map<number, SuccessionCommittedAction[]>();
  for (const action of candidate.action_log) {
    const existing = actionsByBatch.get(action.committed_after_batch) ?? [];
    existing.push(action);
    actionsByBatch.set(action.committed_after_batch, existing);
  }

  for (const batch of candidate.batch_log) {
    if (state.phase === "response") {
      state = successionReducer(state, { type: "finish_response" });
    }
    state = successionReducer(state, { type: "start_batch" });
    state = successionReducer(state, {
      type: "resolve_batch",
      correct: batch.correct,
      asked: batch.asked,
    });
    if (
      state.last_batch === null ||
      JSON.stringify(state.last_batch) !== JSON.stringify(batch)
    ) {
      return null;
    }
    for (const action of actionsByBatch.get(batch.batch) ?? []) {
      const legacyOffer = offerFor(state, action.kind, true);
      if (legacyOffer === null) {
        return null;
      }
      state = { ...state, proposal: legacyOffer };
      if (
        state.proposal === null ||
        JSON.stringify(state.proposal) !==
          JSON.stringify({
            kind: action.kind,
            district_id: action.district_id,
            district_label: action.district_label,
            civic_label: action.civic_label,
            cost: action.cost,
          })
      ) {
        return null;
      }
      state = commitProposed(state, true);
      if (
        state.last_action === null ||
        JSON.stringify(state.last_action) !== JSON.stringify(action)
      ) {
        return null;
      }
    }
  }

  if (candidate.phase === "ready") {
    if (state.phase === "response") {
      state = successionReducer(state, { type: "finish_response" });
    }
  } else if (candidate.phase === "answering") {
    if (state.phase === "response") {
      state = successionReducer(state, { type: "finish_response" });
    }
    state = successionReducer(state, { type: "start_batch" });
  } else if (candidate.phase === "response") {
    if (candidate.proposal !== null) {
      const legacyOffer = offerFor(state, candidate.proposal.kind, true);
      if (legacyOffer !== null) {
        state = { ...state, proposal: legacyOffer };
      }
    }
  } else if (candidate.phase === "settled") {
    state = successionReducer(state, { type: "finish_response" });
  }
  return state;
}

export function parseSuccessionState(raw: string): SuccessionState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !isRecord(parsed) ||
    parsed.battle_version !== SUCCESSION_BATTLE_VERSION ||
    typeof parsed.board !== "string" ||
    !Array.isArray(parsed.batch_log) ||
    !Array.isArray(parsed.action_log) ||
    !["ready", "answering", "response", "settled"].includes(String(parsed.phase))
  ) {
    return null;
  }
  const candidate = parsed as unknown as SuccessionState;
  const replayed = replaySavedState(candidate);
  return replayed !== null && JSON.stringify(replayed) === JSON.stringify(candidate)
    ? replayed
    : null;
}
