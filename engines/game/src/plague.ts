import type { EraId } from "@cr/skill-graph";

import { type CrisisDamageReport, NO_CRISIS_RUIN } from "./crisis-damage";
import { midEraCrisisNodeIds, midEraCrisisTrigger } from "./mid-era-crisis";
import { PLAGUE } from "./plague-tuning";

export { PLAGUE };

export const PLAGUE_ERA: EraId = "renaissance";
export const PLAGUE_SEED = 0x91a6de;
export const PLAGUE_STATE_VERSION = 2;

export const PLAGUE_NODE_IDS = [
  "care-house",
  "market",
  "printworks",
  "chapel",
  "guildhall",
] as const;
export type PlagueNodeId = (typeof PLAGUE_NODE_IDS)[number];

export const PLAGUE_ROUTE_IDS = [
  "market-care",
  "market-printworks",
  "printworks-chapel",
  "chapel-guildhall",
  "care-guildhall",
] as const;
export type PlagueRouteId = (typeof PLAGUE_ROUTE_IDS)[number];

export interface PlagueGraphNode {
  readonly id: PlagueNodeId;
  readonly label: string;
}

export interface PlagueGraphRoute {
  readonly id: PlagueRouteId;
  readonly from: PlagueNodeId;
  readonly to: PlagueNodeId;
}

/**
 * The complete outbreak graph. It is deliberately small and authored: no traffic simulation,
 * citizen itinerary, probability, or tile adjacency can enter the reducer through this contract.
 */
export const PLAGUE_GRAPH = {
  nodes: [
    { id: "care-house", label: "Care House" },
    { id: "market", label: "Market" },
    { id: "printworks", label: "Printworks" },
    { id: "chapel", label: "Meeting Hall" },
    { id: "guildhall", label: "Guildhall" },
  ],
  routes: [
    { id: "market-care", from: "market", to: "care-house" },
    { id: "market-printworks", from: "market", to: "printworks" },
    { id: "printworks-chapel", from: "printworks", to: "chapel" },
    { id: "chapel-guildhall", from: "chapel", to: "guildhall" },
    { id: "care-guildhall", from: "care-house", to: "guildhall" },
  ],
} as const satisfies {
  readonly nodes: readonly PlagueGraphNode[];
  readonly routes: readonly PlagueGraphRoute[];
};

export type PlagueAction =
  | { readonly kind: "quarantine"; readonly route_id: PlagueRouteId }
  | { readonly kind: "care"; readonly node_id: PlagueNodeId };

export type PlaguePhase = "choosing" | "answering" | "resolved" | "ended";
export type PlagueVerdict = "contained" | "lost";
export type PlagueNodeStatus = "clean" | "exposed" | "infected" | "cared";
export type PlagueRouteStatus = "open" | "quarantined" | "carried";

export interface PlagueNodeState {
  readonly id: PlagueNodeId;
  readonly infected: boolean;
  readonly care_strength: number;
}

export interface PlagueRouteState {
  readonly id: PlagueRouteId;
  readonly quarantine_rounds: number;
  readonly carried_last_night: boolean;
}

export interface PlagueNodeView extends PlagueNodeState {
  readonly label: string;
  readonly status: PlagueNodeStatus;
  readonly open_risk_routes: readonly PlagueRouteId[];
}

export interface PlagueRouteView extends PlagueRouteState, PlagueGraphRoute {
  readonly status: PlagueRouteStatus;
  readonly at_risk: boolean;
  readonly infected_end: PlagueNodeId | null;
  readonly vulnerable_end: PlagueNodeId | null;
}

export interface PlaguePendingIntervention {
  readonly kind: PlagueAction["kind"];
  readonly target_id: PlagueRouteId | PlagueNodeId;
  readonly answered: number;
  readonly correct: number;
  readonly strength: number;
  readonly committed: boolean;
}

export interface PlagueRoundLog {
  readonly round: number;
  readonly action: PlagueAction;
  readonly correct: number;
  readonly spread_route_ids: readonly PlagueRouteId[];
  readonly newly_infected: readonly PlagueNodeId[];
  readonly protected_node_ids: readonly PlagueNodeId[];
  readonly expired_route_ids: readonly PlagueRouteId[];
}

export interface PlagueOutcome {
  readonly affected: number;
  readonly clear: number;
  readonly cared_for: number;
  readonly correct: number;
  readonly asked: number;
  readonly verdict: PlagueVerdict;
  readonly leaves_a_trace: false;
  readonly writes_mastery: false;
  readonly gates_progression: false;
}

export interface PlagueState {
  readonly version: typeof PLAGUE_STATE_VERSION;
  readonly era: EraId;
  readonly encounter: number;
  readonly round: number;
  readonly phase: PlaguePhase;
  readonly nodes: readonly PlagueNodeState[];
  readonly routes: readonly PlagueRouteState[];
  readonly action: PlagueAction | null;
  readonly question_ids: readonly string[];
  readonly answers: readonly boolean[];
  readonly log: readonly PlagueRoundLog[];
  readonly outcome: PlagueOutcome | null;
  readonly revision: number;
}

export type PlagueEvent =
  | {
      readonly type: "choose_action";
      readonly action: PlagueAction;
      readonly question_ids: readonly string[];
      readonly expected_revision: number;
    }
  | {
      readonly type: "answer";
      readonly question_id: string;
      readonly correct: boolean;
      readonly expected_revision: number;
    }
  | {
      readonly type: "advance";
      readonly expected_revision: number;
    }
  | {
      readonly type: "restart";
      readonly expected_revision: number;
    };

export interface PlagueEntry {
  readonly era: EraId;
  readonly trigger: number;
  readonly node_ids: readonly string[];
}

export function plagueEntry(): PlagueEntry {
  return {
    era: PLAGUE_ERA,
    trigger: midEraCrisisTrigger(PLAGUE_ERA),
    node_ids: midEraCrisisNodeIds(PLAGUE_ERA),
  };
}

export function createPlague(
  input: { readonly encounter?: number; readonly revision?: number } = {},
): PlagueState {
  const encounter = input.encounter ?? 1;
  const revision = input.revision ?? 0;
  if (!isWhole(encounter, 1) || !isWhole(revision, 0)) {
    throw new Error("A Plague encounter and revision must be whole numbers.");
  }
  return {
    version: PLAGUE_STATE_VERSION,
    era: PLAGUE_ERA,
    encounter,
    round: 1,
    phase: "choosing",
    nodes: PLAGUE_NODE_IDS.map((id) => ({
      id,
      infected: id === "market",
      care_strength: 0,
    })),
    routes: PLAGUE_ROUTE_IDS.map((id) => ({
      id,
      quarantine_rounds: 0,
      carried_last_night: false,
    })),
    action: null,
    question_ids: [],
    answers: [],
    log: [],
    outcome: null,
    revision,
  };
}

function isWhole(value: unknown, floor: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= floor;
}

function isNodeId(value: unknown): value is PlagueNodeId {
  return (
    typeof value === "string" && (PLAGUE_NODE_IDS as readonly string[]).includes(value)
  );
}

function isRouteId(value: unknown): value is PlagueRouteId {
  return (
    typeof value === "string" && (PLAGUE_ROUTE_IDS as readonly string[]).includes(value)
  );
}

function isAction(value: unknown): value is PlagueAction {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const action = value as Record<string, unknown>;
  return (
    (action.kind === "quarantine" && isRouteId(action.route_id)) ||
    (action.kind === "care" && isNodeId(action.node_id))
  );
}

function sameAction(a: PlagueAction, b: PlagueAction): boolean {
  return a.kind === b.kind && JSON.stringify(a) === JSON.stringify(b);
}

function validQuestionIds(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length === PLAGUE.batch_size &&
    value.every((id) => typeof id === "string" && id.trim().length > 0) &&
    new Set(value).size === value.length
  );
}

function hasExpectedRevision(
  state: PlagueState,
  event: { readonly expected_revision?: unknown },
): boolean {
  return isWhole(event.expected_revision, 0) && event.expected_revision === state.revision;
}

function nodeMap(state: PlagueState): ReadonlyMap<PlagueNodeId, PlagueNodeState> {
  return new Map(state.nodes.map((node) => [node.id, node]));
}

function routeMap(state: PlagueState): ReadonlyMap<PlagueRouteId, PlagueRouteState> {
  return new Map(state.routes.map((route) => [route.id, route]));
}

function routeRisk(
  route: PlagueGraphRoute,
  nodes: ReadonlyMap<PlagueNodeId, PlagueNodeState>,
  quarantineRounds: number,
): {
  readonly atRisk: boolean;
  readonly infectedEnd: PlagueNodeId | null;
  readonly vulnerableEnd: PlagueNodeId | null;
} {
  if (quarantineRounds > 0) {
    return { atRisk: false, infectedEnd: null, vulnerableEnd: null };
  }
  const from = nodes.get(route.from);
  const to = nodes.get(route.to);
  if (!from || !to || from.infected === to.infected) {
    return { atRisk: false, infectedEnd: null, vulnerableEnd: null };
  }
  return from.infected
    ? { atRisk: true, infectedEnd: route.from, vulnerableEnd: route.to }
    : { atRisk: true, infectedEnd: route.to, vulnerableEnd: route.from };
}

export function plagueRouteViews(state: PlagueState): readonly PlagueRouteView[] {
  const nodes = nodeMap(state);
  const routes = routeMap(state);
  return PLAGUE_GRAPH.routes.map((route) => {
    const runtime = routes.get(route.id);
    if (!runtime) {
      throw new Error(`Plague state has no route "${route.id}".`);
    }
    const risk = routeRisk(route, nodes, runtime.quarantine_rounds);
    return {
      ...route,
      ...runtime,
      status:
        runtime.quarantine_rounds > 0
          ? "quarantined"
          : runtime.carried_last_night
            ? "carried"
            : "open",
      at_risk: risk.atRisk,
      infected_end: risk.infectedEnd,
      vulnerable_end: risk.vulnerableEnd,
    };
  });
}

export function plagueNodeViews(state: PlagueState): readonly PlagueNodeView[] {
  const routes = plagueRouteViews(state);
  return PLAGUE_GRAPH.nodes.map((authored) => {
    const runtime = state.nodes.find((node) => node.id === authored.id);
    if (!runtime) {
      throw new Error(`Plague state has no node "${authored.id}".`);
    }
    const risks = routes
      .filter((route) => route.at_risk && route.vulnerable_end === authored.id)
      .map((route) => route.id);
    return {
      ...runtime,
      label: authored.label,
      status: runtime.infected
        ? "infected"
        : runtime.care_strength > 0
          ? "cared"
          : risks.length > 0
            ? "exposed"
            : "clean",
      open_risk_routes: risks,
    };
  });
}

export function plagueAvailableActions(state: PlagueState): readonly PlagueAction[] {
  if (state.phase !== "choosing") {
    return [];
  }
  const routes = plagueRouteViews(state).filter((route) => route.at_risk);
  const vulnerable = new Set(routes.map((route) => route.vulnerable_end));
  return [
    ...routes.map((route): PlagueAction => ({ kind: "quarantine", route_id: route.id })),
    ...PLAGUE_NODE_IDS.filter((id) => {
      const node = state.nodes.find((entry) => entry.id === id);
      return (
        vulnerable.has(id) && (node?.care_strength ?? 0) < PLAGUE.max_intervention_strength
      );
    }).map((node_id): PlagueAction => ({ kind: "care", node_id })),
  ];
}

function interventionStrength(answers: readonly boolean[]): number {
  return Math.max(
    1,
    Math.min(PLAGUE.max_intervention_strength, answers.filter(Boolean).length),
  );
}

export function plaguePendingIntervention(
  state: PlagueState,
): PlaguePendingIntervention | null {
  if (state.action === null) {
    return null;
  }
  return {
    kind: state.action.kind,
    target_id:
      state.action.kind === "quarantine" ? state.action.route_id : state.action.node_id,
    answered: state.answers.length,
    correct: state.answers.filter(Boolean).length,
    strength: interventionStrength(state.answers),
    committed: state.phase === "resolved",
  };
}

/**
 * The entire crisis transition. Invalid, stale, or out-of-phase events return the same object.
 */
export function plagueReducer(state: PlagueState, event: PlagueEvent): PlagueState {
  if (
    typeof event !== "object" ||
    event === null ||
    !hasExpectedRevision(state, event as { readonly expected_revision?: unknown })
  ) {
    return state;
  }

  switch (event.type) {
    case "choose_action": {
      if (
        state.phase !== "choosing" ||
        !isAction(event.action) ||
        !validQuestionIds(event.question_ids) ||
        !plagueAvailableActions(state).some((action) => sameAction(action, event.action))
      ) {
        return state;
      }
      return {
        ...state,
        phase: "answering",
        action: event.action,
        question_ids: [...event.question_ids],
        answers: [],
        revision: state.revision + 1,
      };
    }

    case "answer": {
      if (
        state.phase !== "answering" ||
        state.action === null ||
        typeof event.question_id !== "string" ||
        typeof event.correct !== "boolean" ||
        state.question_ids[state.answers.length] !== event.question_id
      ) {
        return state;
      }
      const answers = [...state.answers, event.correct];
      const answered = {
        ...state,
        answers,
        revision: state.revision + 1,
      };
      return answers.length === PLAGUE.batch_size ? commitIntervention(answered) : answered;
    }

    case "advance":
      return state.phase === "resolved" ? advanceNight(state) : state;

    case "restart":
      return createPlague({
        encounter: state.encounter + 1,
        revision: state.revision + 1,
      });

    default:
      return state;
  }
}

function commitIntervention(state: PlagueState): PlagueState {
  const action = state.action;
  if (action === null) {
    return state;
  }
  const strength = interventionStrength(state.answers);
  if (action.kind === "quarantine") {
    return {
      ...state,
      phase: "resolved",
      routes: state.routes.map((route) =>
        route.id === action.route_id
          ? { ...route, quarantine_rounds: Math.max(route.quarantine_rounds, strength) }
          : route,
      ),
    };
  }
  return {
    ...state,
    phase: "resolved",
    nodes: state.nodes.map((node) =>
      node.id === action.node_id
        ? { ...node, care_strength: Math.max(node.care_strength, strength) }
        : node,
    ),
  };
}

function advanceNight(state: PlagueState): PlagueState {
  const action = state.action;
  if (action === null) {
    return state;
  }
  const sources = new Set(
    state.nodes.filter((node) => node.infected).map((node) => node.id),
  );
  const originalNodes = nodeMap(state);
  const originalRoutes = routeMap(state);
  const nodes = state.nodes.map((node) => ({ ...node }));
  const spread_route_ids: PlagueRouteId[] = [];
  const newly_infected: PlagueNodeId[] = [];
  const protected_node_ids: PlagueNodeId[] = [];

  const candidates = PLAGUE_GRAPH.routes
    .filter((route) => {
      const runtime = originalRoutes.get(route.id);
      if (!runtime || runtime.quarantine_rounds > 0) {
        return false;
      }
      const fromInfected = sources.has(route.from);
      const toInfected = sources.has(route.to);
      return fromInfected !== toInfected;
    })
    .slice(0, PLAGUE.incoming_by_round[state.round - 1] ?? 0);

  for (const route of candidates) {
    const target = sources.has(route.from) ? route.to : route.from;
    const targetIndex = nodes.findIndex((node) => node.id === target);
    const targetNode = nodes[targetIndex];
    if (!targetNode || originalNodes.get(target)?.infected) {
      continue;
    }
    if (targetNode.care_strength > 0) {
      nodes[targetIndex] = {
        ...targetNode,
        care_strength: targetNode.care_strength - 1,
      };
      protected_node_ids.push(target);
    } else {
      nodes[targetIndex] = { ...targetNode, infected: true, care_strength: 0 };
      spread_route_ids.push(route.id);
      newly_infected.push(target);
    }
  }

  const expired_route_ids: PlagueRouteId[] = [];
  const routes = state.routes.map((route) => {
    const quarantine_rounds = Math.max(0, route.quarantine_rounds - 1);
    if (route.quarantine_rounds > 0 && quarantine_rounds === 0) {
      expired_route_ids.push(route.id);
    }
    return {
      ...route,
      quarantine_rounds,
      carried_last_night: spread_route_ids.includes(route.id),
    };
  });
  const logEntry: PlagueRoundLog = {
    round: state.round,
    action,
    correct: state.answers.filter(Boolean).length,
    spread_route_ids,
    newly_infected,
    protected_node_ids,
    expired_route_ids,
  };
  const advanced: PlagueState = {
    ...state,
    nodes,
    routes,
    phase: "choosing",
    round: Math.min(PLAGUE.rounds, state.round + 1),
    action: null,
    question_ids: [],
    answers: [],
    log: [...state.log, logEntry],
    outcome: null,
    revision: state.revision + 1,
  };
  const noRisk = plagueRouteViews(advanced).every((route) => !route.at_risk);
  const finished = noRisk || state.round === PLAGUE.rounds;
  if (!finished) {
    return advanced;
  }
  const ended: PlagueState = { ...advanced, phase: "ended", round: state.round };
  return { ...ended, outcome: plagueOutcome(ended) };
}

export function plagueOutcome(state: PlagueState): PlagueOutcome {
  const affected = state.nodes.filter((node) => node.infected).length;
  const atRisk = plagueRouteViews(state).some((route) => route.at_risk);
  return {
    affected,
    clear: PLAGUE_GRAPH.nodes.length - affected,
    cared_for: state.nodes.filter((node) => node.care_strength > 0).length,
    correct: state.log.reduce((sum, round) => sum + round.correct, 0),
    asked: state.log.length * PLAGUE.batch_size,
    verdict: !atRisk && affected <= PLAGUE.contained_max_affected ? "contained" : "lost",
    leaves_a_trace: false,
    writes_mastery: false,
    gates_progression: false,
  };
}

export function plagueDamage(_state: PlagueState): CrisisDamageReport {
  return { ...NO_CRISIS_RUIN, suspended_civic: [] };
}

function isNodeState(value: unknown): value is PlagueNodeState {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const node = value as Record<string, unknown>;
  return (
    isNodeId(node.id) &&
    typeof node.infected === "boolean" &&
    isWhole(node.care_strength, 0) &&
    (node.care_strength as number) <= PLAGUE.max_intervention_strength &&
    !(node.infected && (node.care_strength as number) > 0)
  );
}

function isRouteState(value: unknown): value is PlagueRouteState {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const route = value as Record<string, unknown>;
  return (
    isRouteId(route.id) &&
    isWhole(route.quarantine_rounds, 0) &&
    (route.quarantine_rounds as number) <= PLAGUE.max_intervention_strength &&
    typeof route.carried_last_night === "boolean"
  );
}

function isRoundLog(value: unknown): value is PlagueRoundLog {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const log = value as Record<string, unknown>;
  return (
    isWhole(log.round, 1) &&
    isAction(log.action) &&
    isWhole(log.correct, 0) &&
    (log.correct as number) <= PLAGUE.batch_size &&
    Array.isArray(log.spread_route_ids) &&
    log.spread_route_ids.every(isRouteId) &&
    Array.isArray(log.newly_infected) &&
    log.newly_infected.every(isNodeId) &&
    Array.isArray(log.protected_node_ids) &&
    log.protected_node_ids.every(isNodeId) &&
    Array.isArray(log.expired_route_ids) &&
    log.expired_route_ids.every(isRouteId)
  );
}

function isOutcome(value: unknown): value is PlagueOutcome {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const outcome = value as Record<string, unknown>;
  return (
    isWhole(outcome.affected, 0) &&
    (outcome.affected as number) <= PLAGUE_GRAPH.nodes.length &&
    isWhole(outcome.clear, 0) &&
    (outcome.affected as number) + (outcome.clear as number) ===
      PLAGUE_GRAPH.nodes.length &&
    isWhole(outcome.cared_for, 0) &&
    isWhole(outcome.correct, 0) &&
    isWhole(outcome.asked, 0) &&
    (outcome.verdict === "contained" || outcome.verdict === "lost") &&
    outcome.leaves_a_trace === false &&
    outcome.writes_mastery === false &&
    outcome.gates_progression === false
  );
}

function exactIds<T extends string>(
  values: readonly { readonly id: T }[],
  expected: readonly T[],
): boolean {
  return (
    values.length === expected.length &&
    values.every((value, index) => value.id === expected[index])
  );
}

/** Strict persisted-state parser. Any mismatch rejects the whole snapshot. */
export function isPlagueState(value: unknown): value is PlagueState {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const state = value as Record<string, unknown>;
  const phase = state.phase;
  if (
    state.version !== PLAGUE_STATE_VERSION ||
    state.era !== PLAGUE_ERA ||
    !isWhole(state.encounter, 1) ||
    !isWhole(state.round, 1) ||
    (state.round as number) > PLAGUE.rounds ||
    !["choosing", "answering", "resolved", "ended"].includes(String(phase)) ||
    !Array.isArray(state.nodes) ||
    !state.nodes.every(isNodeState) ||
    !exactIds(state.nodes as PlagueNodeState[], PLAGUE_NODE_IDS) ||
    !Array.isArray(state.routes) ||
    !state.routes.every(isRouteState) ||
    !exactIds(state.routes as PlagueRouteState[], PLAGUE_ROUTE_IDS) ||
    !(state.action === null || isAction(state.action)) ||
    !Array.isArray(state.question_ids) ||
    !state.question_ids.every((id) => typeof id === "string" && id.trim().length > 0) ||
    !Array.isArray(state.answers) ||
    !state.answers.every((answer) => typeof answer === "boolean") ||
    !Array.isArray(state.log) ||
    !state.log.every(isRoundLog) ||
    !isWhole(state.revision, 0)
  ) {
    return false;
  }
  const plague = state as unknown as PlagueState;
  if (phase === "choosing") {
    return (
      plague.action === null &&
      plague.question_ids.length === 0 &&
      plague.answers.length === 0 &&
      plague.outcome === null &&
      plague.log.length === plague.round - 1
    );
  }
  if (phase === "answering") {
    return (
      plague.action !== null &&
      validQuestionIds(plague.question_ids) &&
      plague.answers.length < PLAGUE.batch_size &&
      plague.outcome === null &&
      plague.log.length === plague.round - 1
    );
  }
  if (phase === "resolved") {
    return (
      plague.action !== null &&
      validQuestionIds(plague.question_ids) &&
      plague.answers.length === PLAGUE.batch_size &&
      plague.outcome === null &&
      plague.log.length === plague.round - 1
    );
  }
  return (
    plague.action === null &&
    plague.question_ids.length === 0 &&
    plague.answers.length === 0 &&
    plague.log.length >= 1 &&
    plague.log.length <= PLAGUE.rounds &&
    isOutcome(plague.outcome) &&
    JSON.stringify(plague.outcome) === JSON.stringify(plagueOutcome(plague))
  );
}
