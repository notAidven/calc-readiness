import { type DataApiClient, type DataApiExecutor, json } from "@cr/db";
import type {
  DiagnosticAuthenticator,
  DiagnosticServerResponse,
} from "@cr/diagnostic-runtime";
import {
  createPlague,
  isPlagueState,
  PLAGUE_NODE_IDS,
  PLAGUE_ROUTE_IDS,
  type PlagueAction,
  type PlagueEvent,
  type PlagueNodeId,
  type PlagueRouteId,
  type PlagueState,
  plagueReducer,
} from "@cr/game";
import type { UUID } from "@cr/state-schema";

export interface PlagueStateStore {
  load(studentId: UUID): Promise<PlagueState | null>;
  update(
    studentId: UUID,
    transition: (current: PlagueState | null) => PlagueState,
  ): Promise<PlagueState>;
}

export interface PlagueStateService {
  read(token: string | null): Promise<DiagnosticServerResponse>;
  act(token: string | null, body: unknown): Promise<DiagnosticServerResponse>;
}

function plagueActionFrom(value: unknown): PlagueAction | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const action = value as Record<string, unknown>;
  if (
    action.kind === "quarantine" &&
    typeof action.route_id === "string" &&
    (PLAGUE_ROUTE_IDS as readonly string[]).includes(action.route_id)
  ) {
    return { kind: "quarantine", route_id: action.route_id as PlagueRouteId };
  }
  if (
    action.kind === "care" &&
    typeof action.node_id === "string" &&
    (PLAGUE_NODE_IDS as readonly string[]).includes(action.node_id)
  ) {
    return { kind: "care", node_id: action.node_id as PlagueNodeId };
  }
  return null;
}

function eventFrom(value: unknown): PlagueEvent | "start" | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const body = value as Record<string, unknown>;
  const action = plagueActionFrom(body.action);
  if (body.type === "start") {
    return "start";
  }
  if (
    body.type === "choose_action" &&
    action !== null &&
    Array.isArray(body.question_ids) &&
    body.question_ids.length === 3 &&
    body.question_ids.every((id) => typeof id === "string" && id.trim().length > 0) &&
    new Set(body.question_ids).size === body.question_ids.length &&
    Number.isSafeInteger(body.expected_revision) &&
    (body.expected_revision as number) >= 0
  ) {
    return {
      type: "choose_action",
      action,
      question_ids: body.question_ids as string[],
      expected_revision: body.expected_revision as number,
    };
  }
  if (
    body.type === "advance" &&
    Number.isSafeInteger(body.expected_revision) &&
    (body.expected_revision as number) >= 0
  ) {
    return {
      type: "advance",
      expected_revision: body.expected_revision as number,
    };
  }
  if (
    body.type === "answer" &&
    typeof body.question_id === "string" &&
    typeof body.correct === "boolean" &&
    Number.isSafeInteger(body.expected_revision) &&
    (body.expected_revision as number) >= 0
  ) {
    return {
      type: "answer",
      question_id: body.question_id,
      correct: body.correct,
      expected_revision: body.expected_revision as number,
    };
  }
  if (
    body.type === "restart" &&
    Number.isSafeInteger(body.expected_revision) &&
    (body.expected_revision as number) >= 0
  ) {
    return {
      type: "restart",
      expected_revision: body.expected_revision as number,
    };
  }
  return null;
}

export function createPlagueStateService(input: {
  readonly store: PlagueStateStore;
  readonly authenticate: DiagnosticAuthenticator;
}): PlagueStateService {
  async function student(token: string | null): Promise<UUID | null> {
    return (await input.authenticate(token))?.student_id ?? null;
  }

  return {
    async read(token) {
      const studentId = await student(token);
      if (studentId === null) {
        return { status: 401, body: { error: "unauthorized" } };
      }
      try {
        return { status: 200, body: await input.store.load(studentId) };
      } catch {
        return {
          status: 500,
          body: { error: "The Care House state could not be loaded." },
        };
      }
    },

    async act(token, body) {
      const studentId = await student(token);
      if (studentId === null) {
        return { status: 401, body: { error: "unauthorized" } };
      }
      const event = eventFrom(body);
      if (event === null) {
        return { status: 400, body: { error: "invalid Care House event" } };
      }
      let refused = false;
      try {
        const state = await input.store.update(studentId, (current) => {
          if (event === "start") {
            return current ?? createPlague();
          }
          if (current === null) {
            refused = true;
            return createPlague();
          }
          const next = plagueReducer(current, event);
          refused = next === current;
          return next;
        });
        return refused
          ? {
              status: 409,
              body: { error: "The Care House changed before that action arrived.", state },
            }
          : { status: 200, body: state };
      } catch {
        return { status: 500, body: { error: "The Care House state could not be saved." } };
      }
    },
  };
}

export const PLAGUE_STATE_STATEMENTS = {
  read: `select state from public.plague_crisis_state
    where student_id = :sid::uuid`,
  lock: `select state from public.plague_crisis_state
    where student_id = :sid::uuid
    for update`,
  write: `insert into public.plague_crisis_state (student_id, state, updated_at)
    values (:sid::uuid, :state::jsonb, now())
    on conflict (student_id) do update
      set state = excluded.state, updated_at = now()`,
} as const;

interface PlagueStateRow {
  state: unknown;
}

function stateFromRow(row: PlagueStateRow | undefined): PlagueState | null {
  if (row === undefined) {
    return null;
  }
  const value = typeof row.state === "string" ? JSON.parse(row.state) : row.state;
  if (
    value !== null &&
    typeof value === "object" &&
    (value as { version?: unknown }).version === 1
  ) {
    return null;
  }
  if (!isPlagueState(value)) {
    throw new Error("Stored Care House state is invalid.");
  }
  return value;
}

async function loadFrom(
  db: DataApiExecutor,
  studentId: UUID,
  lock: boolean,
): Promise<PlagueState | null> {
  const rows = await db.query<PlagueStateRow>(
    lock ? PLAGUE_STATE_STATEMENTS.lock : PLAGUE_STATE_STATEMENTS.read,
    { sid: studentId },
  );
  return stateFromRow(rows[0]);
}

export function createAuroraPlagueStateStore(db: DataApiClient): PlagueStateStore {
  return {
    load: (studentId) => loadFrom(db, studentId, false),
    update: (studentId, transition) =>
      db.withTransaction(async (tx) => {
        const next = transition(await loadFrom(tx, studentId, true));
        await tx.execute(PLAGUE_STATE_STATEMENTS.write, {
          sid: studentId,
          state: json(next),
        });
        return next;
      }),
  };
}

export function createAuroraPlagueStateService(input: {
  readonly db: DataApiClient;
  readonly authenticate: DiagnosticAuthenticator;
}): PlagueStateService {
  return createPlagueStateService({
    authenticate: input.authenticate,
    store: createAuroraPlagueStateStore(input.db),
  });
}
