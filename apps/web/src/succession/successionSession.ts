import {
  createSuccession,
  parseSuccessionState,
  serializeSuccessionState,
  type SuccessionActionKind,
  type SuccessionBatchComposition,
  type SuccessionDistrictPlan,
  type SuccessionState,
  SUCCESSION_LIVE_CITY_BOARD,
  successionBoardFor,
  successionReducer,
} from "@cr/game";

import {
  apiGetJsonAuthenticated,
  apiPostJsonAuthenticated,
  type AccessTokenGetter,
} from "../api";
import { defaultDevStorage } from "../devPersistence/devSession";
import { gradeCrisisAnswer } from "../lessons/crisisAnswer";
import { loadSuccessionDrawSet, successionCycleBatch } from "./successionItems";

export interface SuccessionBattleSnapshot {
  readonly revision: number;
  readonly state: SuccessionState;
  readonly active_batch: SuccessionBatchComposition | null;
  readonly verdicts: readonly boolean[];
}

export interface SuccessionSessionResult {
  readonly battle: SuccessionBattleSnapshot | null;
  readonly verdict?: {
    readonly correct: boolean | null;
    readonly unreadable: string | null;
  };
}

export type SuccessionSessionCommand =
  | {
      readonly type: "start";
      readonly binding?: "authored" | "city";
      readonly districts?: readonly SuccessionDistrictPlan[];
    }
  | { readonly type: "start_batch" }
  | {
      readonly type: "answer";
      readonly item_version_id: string;
      readonly raw_answer: string | Record<string, unknown>;
    }
  | { readonly type: "propose_action"; readonly kind: SuccessionActionKind }
  | { readonly type: "cancel_proposal" }
  | { readonly type: "commit_action" }
  | { readonly type: "finish_response" };

export interface SuccessionSession {
  load(): Promise<SuccessionSessionResult>;
  command(command: SuccessionSessionCommand): Promise<SuccessionSessionResult>;
}

/** Account-backed commands contain no state or correctness authored by the browser. */
export function createApiSuccessionSession(
  url: string,
  getToken: AccessTokenGetter,
): SuccessionSession {
  return {
    async load() {
      return apiGetJsonAuthenticated<SuccessionSessionResult>(url, getToken);
    },
    async command(command) {
      return apiPostJsonAuthenticated<SuccessionSessionResult>(url, getToken, command);
    },
  };
}

export interface SuccessionLocalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const LOCAL_KEY = "cr.succession.v1";
const LOCAL_VERSION = 1;

function bindingSignature(districts: readonly SuccessionDistrictPlan[]): string {
  return JSON.stringify(
    districts.map((district) => [
      district.id,
      district.civic.placement_id,
      district.civic.suspendable !== false,
    ]),
  );
}

function parseLocal(raw: string | null): SuccessionBattleSnapshot | null {
  if (raw === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const envelope = parsed as Record<string, unknown>;
  const battle = envelope.battle;
  if (envelope.version !== LOCAL_VERSION || typeof battle !== "object" || battle === null) {
    return null;
  }
  const record = battle as Record<string, unknown>;
  const state = parseSuccessionState(JSON.stringify(record.state));
  const verdicts = record.verdicts;
  const revision = record.revision;
  const active = record.active_batch;
  if (
    state === null ||
    !Number.isSafeInteger(revision) ||
    (revision as number) < 1 ||
    !Array.isArray(verdicts) ||
    !verdicts.every((verdict) => typeof verdict === "boolean")
  ) {
    return null;
  }
  const activeBatch =
    active === null
      ? null
      : typeof active === "object" &&
          active !== null &&
          (active as Record<string, unknown>).status === "ready" &&
          Array.isArray((active as Record<string, unknown>).prompts)
        ? (active as SuccessionBatchComposition)
        : undefined;
  if (
    activeBatch === undefined ||
    (state.phase === "answering") !== (activeBatch !== null)
  ) {
    return null;
  }
  return {
    revision: revision as number,
    state,
    active_batch: activeBatch,
    verdicts,
  };
}

export function createLocalSuccessionSession(
  options: {
    readonly storage?: SuccessionLocalStorage | null;
    readonly initial?: SuccessionState;
  } = {},
): SuccessionSession {
  const storage =
    options.storage === undefined
      ? (defaultDevStorage() as SuccessionLocalStorage | null)
      : options.storage;
  let memory: SuccessionBattleSnapshot | null = options.initial
    ? {
        revision: 1,
        state: options.initial,
        active_batch: null,
        verdicts: [],
      }
    : null;

  function read(): SuccessionBattleSnapshot | null {
    if (storage === null) {
      return memory;
    }
    const parsed = parseLocal(storage.getItem(LOCAL_KEY));
    if (parsed === null && storage.getItem(LOCAL_KEY) !== null) {
      storage.removeItem(LOCAL_KEY);
    }
    return parsed;
  }

  function write(
    battle: Omit<SuccessionBattleSnapshot, "revision">,
    previous: number,
  ): SuccessionBattleSnapshot {
    const saved: SuccessionBattleSnapshot = {
      ...battle,
      revision: previous + 1,
    };
    memory = saved;
    storage?.setItem(
      LOCAL_KEY,
      JSON.stringify({
        version: LOCAL_VERSION,
        battle: {
          ...saved,
          state: JSON.parse(serializeSuccessionState(saved.state)) as unknown,
        },
      }),
    );
    return saved;
  }

  return {
    async load() {
      return { battle: read() };
    },

    async command(command) {
      const current = read();
      if (command.type === "start") {
        const cityBound = command.binding === "city";
        if (
          current !== null &&
          (!cityBound ||
            (current.state.board === SUCCESSION_LIVE_CITY_BOARD &&
              command.districts !== undefined &&
              bindingSignature(current.state.districts) ===
                bindingSignature(command.districts)))
        ) {
          return { battle: current };
        }
        if (cityBound && (!command.districts || command.districts.length < 2)) {
          throw new Error("The Succession needs the real city's placed-building roster.");
        }
        const state = cityBound
          ? createSuccession({
              boardId: SUCCESSION_LIVE_CITY_BOARD,
              districts: command.districts,
            })
          : createSuccession({ board: successionBoardFor(1) });
        return {
          battle: write(
            {
              state,
              active_batch: null,
              verdicts: [],
            },
            current?.revision ?? 0,
          ),
        };
      }
      if (current === null) {
        throw new Error("Start the Succession before sending a battle command.");
      }

      if (command.type === "start_batch") {
        const draw = loadSuccessionDrawSet();
        const active = successionCycleBatch({
          nodeIds: draw.nodeIds,
          encounter: 1,
          cycle: current.state.batch + 1,
        });
        if (active.status !== "ready") {
          throw new Error(active.message);
        }
        const state = successionReducer(current.state, { type: "start_batch" });
        if (state === current.state) {
          throw new Error("This battle cannot start a batch now.");
        }
        return {
          battle: write({ state, active_batch: active, verdicts: [] }, current.revision),
        };
      }

      if (command.type === "answer") {
        const active = current.active_batch;
        if (active?.status !== "ready") {
          throw new Error("There is no active Succession question.");
        }
        const prompt = active.prompts[current.verdicts.length];
        if (prompt?.item_version_id !== command.item_version_id) {
          throw new Error("That is not the active Succession question.");
        }
        const verdict = gradeCrisisAnswer(command.item_version_id, command.raw_answer);
        if (verdict.correct === null) {
          return { battle: current, verdict };
        }
        const verdicts = [...current.verdicts, verdict.correct];
        if (verdicts.length < active.prompts.length) {
          return {
            battle: write({ ...current, verdicts }, current.revision),
            verdict,
          };
        }
        const state = successionReducer(current.state, {
          type: "resolve_batch",
          correct: verdicts.filter(Boolean).length,
          asked: verdicts.length,
        });
        if (state === current.state) {
          throw new Error("The completed Succession batch was refused.");
        }
        return {
          battle: write({ state, active_batch: null, verdicts: [] }, current.revision),
          verdict,
        };
      }

      const event =
        command.type === "propose_action"
          ? ({ type: command.type, kind: command.kind } as const)
          : ({ type: command.type } as
              | { readonly type: "cancel_proposal" }
              | { readonly type: "commit_action" }
              | { readonly type: "finish_response" });
      const state = successionReducer(current.state, event);
      if (state === current.state) {
        throw new Error("That Succession action is not available now.");
      }
      return {
        battle: write({ ...current, state }, current.revision),
      };
    },
  };
}
