import { createProductAnswerChecker, PRODUCT_CHECKER_VERSION } from "@cr/components";
import { type DataApiClient, json } from "@cr/db";
import type {
  DiagnosticAuthenticator,
  DiagnosticServerResponse,
} from "@cr/diagnostic-runtime";
import {
  createSuccession,
  parseSuccessionState,
  serializeSuccessionState,
  type SuccessionActionKind,
  type SuccessionBatchComposition,
  type SuccessionDistrictPlan,
  type SuccessionQuestionCandidate,
  type SuccessionRosterMember,
  type SuccessionState,
  successionBatchFor,
  successionBoardFor,
  successionDistrictsForRoster,
  successionEntry,
  SUCCESSION_LIVE_CITY_BOARD,
  successionReducer,
} from "@cr/game";
import {
  D2_PRACTICE_ITEMS,
  D3_PRACTICE_ITEMS,
  D4_PRACTICE_ITEMS,
  type FrozenItem,
} from "@cr/item-bank";
import type { UUID } from "@cr/state-schema";
import { loadCityFromAurora } from "./reads";

/** The complete server-owned battle, including an interrupted question batch. */
export interface SuccessionBattle {
  readonly state: SuccessionState;
  readonly active_batch: SuccessionBatchComposition | null;
  readonly verdicts: readonly boolean[];
}

/** A stored battle uses optimistic revisioning so two tabs cannot overwrite one another. */
export interface StoredSuccessionBattle extends SuccessionBattle {
  readonly revision: number;
}

export interface SuccessionBattleStore {
  /** Eligibility is derived from authoritative progress, never a browser claim. */
  eligible(studentId: UUID): Promise<boolean>;
  /** Authoritative completed nodes for the question window. */
  mastered?(studentId: UUID): Promise<readonly string[]>;
  /** Stable placements on the learner's current city, for the in-city binding. */
  roster?(studentId: UUID): Promise<readonly SuccessionRosterMember[]>;
  load(studentId: UUID): Promise<StoredSuccessionBattle | null>;
  /**
   * Compare-and-save. `false` means another command won the revision and this command did
   * not land.
   */
  save(
    studentId: UUID,
    expectedRevision: number,
    battle: SuccessionBattle,
  ): Promise<boolean>;
}

export interface SuccessionGrade {
  readonly status: string;
  readonly correct: boolean | null;
  readonly unreadable: string | null;
}

export type SuccessionCommand =
  | { readonly type: "start"; readonly binding: "authored" | "city" }
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

export interface SuccessionCommandService {
  load(token: string | null): Promise<DiagnosticServerResponse>;
  command(token: string | null, body: unknown): Promise<DiagnosticServerResponse>;
}

export interface SuccessionCommandServiceDeps {
  readonly store: SuccessionBattleStore;
  readonly authenticate: DiagnosticAuthenticator;
  readonly drawBatch: (
    state: SuccessionState,
    mastered: readonly string[],
  ) => SuccessionBatchComposition;
  readonly grade: (
    itemVersionId: string,
    rawAnswer: string | Record<string, unknown>,
  ) => SuccessionGrade;
}

function parseCommand(body: unknown): SuccessionCommand | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const record = body as Record<string, unknown>;
  switch (record.type) {
    case "start":
      return {
        type: "start",
        binding: record.binding === "city" ? "city" : "authored",
      };
    case "start_batch":
    case "cancel_proposal":
    case "commit_action":
    case "finish_response":
      return { type: record.type };
    case "propose_action":
      return record.kind === "rally" || record.kind === "reopen"
        ? { type: record.type, kind: record.kind }
        : null;
    case "answer":
      return typeof record.item_version_id === "string" &&
        (typeof record.raw_answer === "string" ||
          (typeof record.raw_answer === "object" && record.raw_answer !== null))
        ? {
            type: record.type,
            item_version_id: record.item_version_id,
            raw_answer: record.raw_answer as string | Record<string, unknown>,
          }
        : null;
    default:
      return null;
  }
}

function visible(battle: StoredSuccessionBattle | SuccessionBattle | null): {
  readonly battle: StoredSuccessionBattle | SuccessionBattle | null;
} {
  return { battle };
}

function normalizedRoster(
  roster: readonly SuccessionRosterMember[],
): readonly SuccessionRosterMember[] {
  const byPlacement = new Map<string, SuccessionRosterMember>();
  for (const member of roster) {
    const held = byPlacement.get(member.placement_id);
    if (!held) {
      byPlacement.set(member.placement_id, member);
      continue;
    }
    byPlacement.set(member.placement_id, {
      placement_id: member.placement_id,
      label: held.label < member.label ? held.label : member.label,
      suspendable: held.suspendable || member.suspendable,
    });
  }
  return [...byPlacement.values()];
}

function bindingSignature(districts: readonly SuccessionDistrictPlan[]): string {
  return JSON.stringify(
    districts.map((district) => [
      district.id,
      district.civic.placement_id,
      district.civic.suspendable !== false,
    ]),
  );
}

function reconciledCityBattle(
  current: StoredSuccessionBattle,
  roster: readonly SuccessionRosterMember[],
): SuccessionBattle | null {
  const districts = successionDistrictsForRoster(normalizedRoster(roster));
  if (
    current.state.board === SUCCESSION_LIVE_CITY_BOARD &&
    bindingSignature(current.state.districts) === bindingSignature(districts)
  ) {
    return null;
  }
  return {
    state: createSuccession({
      boardId: SUCCESSION_LIVE_CITY_BOARD,
      districts,
    }),
    active_batch: null,
    verdicts: [],
  };
}

export function createSuccessionCommandService(
  deps: SuccessionCommandServiceDeps,
): SuccessionCommandService {
  const { store, authenticate, drawBatch, grade } = deps;

  async function identity(token: string | null): Promise<UUID | null> {
    return (await authenticate(token))?.student_id ?? null;
  }

  async function save(
    studentId: UUID,
    current: StoredSuccessionBattle,
    battle: SuccessionBattle,
    extra: Record<string, unknown> = {},
  ): Promise<DiagnosticServerResponse> {
    const saved = await store.save(studentId, current.revision, battle);
    return saved
      ? {
          status: 200,
          body: {
            ...visible({ ...battle, revision: current.revision + 1 }),
            ...extra,
          },
        }
      : {
          status: 409,
          body: {
            error: "This battle changed in another session. Reload it and try again.",
          },
        };
  }

  return {
    async load(token) {
      const studentId = await identity(token);
      if (studentId === null) {
        return { status: 401, body: { error: "unauthorized" } };
      }
      const current = await store.load(studentId);
      if (current?.state.board === SUCCESSION_LIVE_CITY_BOARD) {
        const roster = await store.roster?.(studentId);
        if (!roster || normalizedRoster(roster).length < 2) {
          return {
            status: 409,
            body: {
              error:
                "The Succession cannot resume because this city no longer has two placed buildings.",
            },
          };
        }
        const replacement = reconciledCityBattle(current, roster);
        if (replacement !== null) {
          return save(studentId, current, replacement);
        }
      }
      return { status: 200, body: visible(current ?? null) };
    },

    async command(token, body) {
      const studentId = await identity(token);
      if (studentId === null) {
        return { status: 401, body: { error: "unauthorized" } };
      }
      const command = parseCommand(body);
      if (command === null) {
        return { status: 400, body: { error: "unknown or malformed Succession command" } };
      }

      const current = await store.load(studentId);
      if (command.type === "start") {
        const cityBound = command.binding === "city";
        if (current !== null && !cityBound) {
          return { status: 200, body: visible(current) };
        }
        if (
          current?.state.board !== SUCCESSION_LIVE_CITY_BOARD &&
          !(await store.eligible(studentId))
        ) {
          return {
            status: 403,
            body: { error: "The Succession has not unlocked for this learner." },
          };
        }
        const roster = cityBound ? await store.roster?.(studentId) : undefined;
        if (cityBound && (!roster || normalizedRoster(roster).length < 2)) {
          return {
            status: 409,
            body: {
              error:
                "The Succession needs at least two real buildings on the current city.",
            },
          };
        }
        if (current !== null) {
          const replacement = reconciledCityBattle(current, roster ?? []);
          return replacement === null
            ? { status: 200, body: visible(current) }
            : save(studentId, current, replacement);
        }
        const battle: SuccessionBattle = {
          state: cityBound
            ? createSuccession({
                boardId: SUCCESSION_LIVE_CITY_BOARD,
                districts: successionDistrictsForRoster(normalizedRoster(roster ?? [])),
              })
            : createSuccession({ board: successionBoardFor(1) }),
          active_batch: null,
          verdicts: [],
        };
        const saved = await store.save(studentId, 0, battle);
        return saved
          ? { status: 200, body: visible({ ...battle, revision: 1 }) }
          : {
              status: 409,
              body: { error: "The battle was opened in another session. Reload it." },
            };
      }
      if (current === null) {
        return { status: 409, body: { error: "Start the Succession first." } };
      }

      if (command.type === "start_batch") {
        if (current.active_batch !== null || current.state.phase !== "ready") {
          return { status: 409, body: { error: "This battle cannot start a batch now." } };
        }
        const mastered = (await store.mastered?.(studentId)) ?? [];
        const drawn = drawBatch(current.state, mastered);
        if (drawn.status !== "ready") {
          return { status: 409, body: { error: drawn.message } };
        }
        const state = successionReducer(current.state, { type: "start_batch" });
        if (state === current.state) {
          return { status: 409, body: { error: "This battle cannot start a batch now." } };
        }
        return save(studentId, current, {
          state,
          active_batch: drawn,
          verdicts: [],
        });
      }

      if (command.type === "answer") {
        const batch = current.active_batch;
        if (batch?.status !== "ready" || current.state.phase !== "answering") {
          return { status: 409, body: { error: "There is no active question to answer." } };
        }
        const prompt = batch.prompts[current.verdicts.length];
        if (!prompt || prompt.item_version_id !== command.item_version_id) {
          return {
            status: 409,
            body: { error: "That is not the active question in this battle." },
          };
        }
        const verdict = grade(command.item_version_id, command.raw_answer);
        if (verdict.correct === null) {
          return {
            status: 200,
            body: { ...visible(current), verdict },
          };
        }
        const verdicts = [...current.verdicts, verdict.correct];
        if (verdicts.length < batch.prompts.length) {
          return save(studentId, current, { ...current, verdicts }, { verdict });
        }
        const state = successionReducer(current.state, {
          type: "resolve_batch",
          correct: verdicts.filter(Boolean).length,
          asked: verdicts.length,
        });
        if (state === current.state) {
          return { status: 409, body: { error: "The completed batch was refused." } };
        }
        return save(
          studentId,
          current,
          { state, active_batch: null, verdicts: [] },
          { verdict },
        );
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
        return { status: 409, body: { error: "That action is not available now." } };
      }
      return save(studentId, current, { ...current, state });
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Production Aurora + product-checker composition                            */
/* -------------------------------------------------------------------------- */

const SUCCESSION_ITEMS: readonly FrozenItem[] = [
  ...D2_PRACTICE_ITEMS,
  ...D3_PRACTICE_ITEMS,
  ...D4_PRACTICE_ITEMS,
];

const SUCCESSION_POOL: readonly SuccessionQuestionCandidate[] = SUCCESSION_ITEMS.map(
  (item) => ({
    item_version_id: item.item_version_id,
    node_id: item.node_id,
    prompt: item.prompt,
  }),
);

const SUCCESSION_CHECKER = createProductAnswerChecker({
  itemVersions: SUCCESSION_ITEMS.map((item) => ({
    item_version_id: item.item_version_id,
    node_id: item.node_id,
    answer: item.answer,
  })),
});

interface SuccessionBattleRow {
  readonly revision: number;
  readonly battle: unknown;
}

function storedJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function parseStoredBattle(row: SuccessionBattleRow): StoredSuccessionBattle | null {
  const value = storedJson(row.battle);
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const state = parseSuccessionState(JSON.stringify(record.state));
  const verdicts = record.verdicts;
  const active = record.active_batch;
  if (
    state === null ||
    !Array.isArray(verdicts) ||
    !verdicts.every((verdict) => typeof verdict === "boolean") ||
    verdicts.length > 3
  ) {
    return null;
  }
  const activeBatch:
    | Extract<SuccessionBatchComposition, { status: "ready" }>
    | null
    | undefined =
    active === null
      ? null
      : typeof active === "object" &&
          active !== null &&
          (active as Record<string, unknown>).status === "ready" &&
          Array.isArray((active as Record<string, unknown>).prompts) &&
          !(JSON.stringify(active) as string).includes("answer_key")
        ? (active as Extract<SuccessionBatchComposition, { status: "ready" }>)
        : undefined;
  if (
    activeBatch === undefined ||
    (state.phase === "answering") !== (activeBatch !== null) ||
    (activeBatch === null ? verdicts.length !== 0 : verdicts.length >= activeBatch.size)
  ) {
    return null;
  }
  return {
    revision: row.revision,
    state,
    active_batch: activeBatch,
    verdicts,
  };
}

export function createAuroraSuccessionStore(db: DataApiClient): SuccessionBattleStore {
  return {
    async eligible(studentId) {
      const required = successionEntry();
      const rows = await db.query<{ completed: number }>(
        `select count(*)::integer as completed
           from public.student_node_state s
           join jsonb_to_recordset(:nodes::jsonb) as n(node_id text)
             on n.node_id = s.node_id
          where s.student_id = :sid::uuid
            and s.completion_status = 'complete'`,
        {
          sid: studentId,
          nodes: json(required.node_ids.map((node_id) => ({ node_id }))),
        },
      );
      return (rows[0]?.completed ?? 0) >= required.trigger;
    },

    async mastered(studentId) {
      const rows = await db.query<{ node_id: string }>(
        `select node_id from public.student_node_state
          where student_id = :sid::uuid and completion_status = 'complete'
          order by node_id`,
        { sid: studentId },
      );
      return rows.map((row) => row.node_id);
    },

    async roster(studentId) {
      const city = await loadCityFromAurora(db, studentId);
      return [
        ...city.placements.map((placement) => ({
          placement_id: placement.nodeId,
          label: placement.nodeId,
          suspendable: false,
        })),
        ...(city.town_hall
          ? [
              {
                placement_id: city.town_hall.nodeId,
                label: city.town_hall.nodeId,
                suspendable: false,
              },
            ]
          : []),
        ...city.civic.map((placement) => ({
          placement_id: placement.nodeId,
          label: placement.nodeId,
          suspendable: true,
        })),
      ];
    },

    async load(studentId) {
      const rows = await db.query<SuccessionBattleRow>(
        `select revision, battle from public.succession_battle
          where student_id = :sid::uuid`,
        { sid: studentId },
      );
      const row = rows[0];
      if (!row) {
        return null;
      }
      const parsed = parseStoredBattle(row);
      if (parsed === null) {
        throw new Error("Stored Succession battle is not valid for this build.");
      }
      return parsed;
    },

    async save(studentId, expectedRevision, battle) {
      const nextRevision = expectedRevision + 1;
      const payload = {
        state: JSON.parse(serializeSuccessionState(battle.state)) as unknown,
        active_batch: battle.active_batch,
        verdicts: battle.verdicts,
      };
      const rows =
        expectedRevision === 0
          ? await db.query<{ revision: number }>(
              `insert into public.succession_battle
                  (student_id, revision, battle, updated_at)
                values (:sid::uuid, :next, :battle::jsonb, now())
                on conflict (student_id) do nothing
                returning revision`,
              {
                sid: studentId,
                next: nextRevision,
                battle: json(payload),
              },
            )
          : await db.query<{ revision: number }>(
              `update public.succession_battle
                  set revision = :next, battle = :battle::jsonb, updated_at = now()
                where student_id = :sid::uuid and revision = :expected
                returning revision`,
              {
                sid: studentId,
                expected: expectedRevision,
                next: nextRevision,
                battle: json(payload),
              },
            );
      return rows[0]?.revision === nextRevision;
    },
  };
}

export function createAuroraSuccessionCommandService(deps: {
  readonly db: DataApiClient;
  readonly authenticate: DiagnosticAuthenticator;
}): SuccessionCommandService {
  return createSuccessionCommandService({
    authenticate: deps.authenticate,
    store: createAuroraSuccessionStore(deps.db),
    drawBatch: (state, mastered) =>
      successionBatchFor({
        mastered,
        pool: SUCCESSION_POOL,
        encounter: 1,
        cycle: state.batch + 1,
      }),
    grade: (itemVersionId, rawAnswer) => {
      const result = SUCCESSION_CHECKER({
        item_version_id: itemVersionId,
        equivalence_checker_version: PRODUCT_CHECKER_VERSION,
        raw_answer: rawAnswer,
      });
      return result.status === "invalid_input"
        ? {
            status: result.status,
            correct: null,
            unreadable: "Use the notation requested by the question.",
          }
        : {
            status: result.status,
            correct: result.client_correct,
            unreadable: null,
          };
    },
  });
}
