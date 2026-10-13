import {
  ACCOUNT_INITIALIZATION_LOCK_SQL,
  type DataApiClient,
  type DataApiExecutor,
  type SqlParams,
  type SqlValue,
} from "@cr/db";
import { parseCivicPlacementId } from "@cr/economy";
import { islandUnlockTarget } from "@cr/game";
import { completionStatusForMastery } from "@cr/mastery-service";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import { ACCOUNT_STATE_EXISTS_SQL } from "../accountState";
import { ECONOMY_AUTHORITY_STATEMENTS, ECONOMY_LEDGER_INSERT } from "../economy";
import { MASTERY_WRITE_STATEMENTS } from "../mastery";
import {
  CITY_BOOTSTRAP_STATEMENTS,
  CITY_WRITE_STATEMENTS,
  ISLAND_RESET_STATEMENTS,
} from "../writes";

/**
 * A `DataApiClient` double that behaves like the civilization tables, so a city can be
 * WRITTEN and READ BACK by the real functions in one test.
 *
 * ## Why this exists rather than a queue of canned results
 *
 * A round trip is the only assertion that can catch the defect this lane keeps producing:
 * a field one side stores and the other does not fetch. `reads.test.ts` proves the read
 * maps rows correctly and `writes` could be proved to issue statements, and both could be
 * green over a writer that stores the row under a column the reader never selects. The
 * subject here is the two together, which needs something that remembers.
 *
 * ## What it can and cannot prove, stated because a double that overstates itself is worse
 *    than none
 *
 * It CAN prove: that every column the reader selects is a column the writer filled; that
 * the reader's projection is honest (a column absent from its `select` list is absent from
 * the row it maps, exactly as Postgres would leave it); that a save is atomic; that the
 * generated `damage_id` follows the ordinal; that every statement is scoped to one
 * student; and that the enum-valued and event-id-safe columns are only ever handed legal
 * values.
 *
 * It CANNOT prove that the SQL means what this file believes it means. Recognition is by
 * EXACT identity against `CITY_WRITE_STATEMENTS`, so no edit to a statement can slip past
 * unnoticed — but a statement whose text and whose model here are wrong in the same
 * direction would pass. Two guards outside this file cover what a double structurally
 * cannot: `test/cityWriteGrants.test.ts` holds the DML to the grants the migrations
 * actually issue (a `permission denied` is production-only and no double can reach it),
 * and it holds the enum members to the authored era sequence.
 *
 * ## It throws on a statement it does not know
 *
 * That is the load-bearing property. A double that returned `[]` for an unrecognized
 * statement would let a writer add a table nobody models, or a reader select from one
 * nobody fills, and report green over both.
 */

export type FakeTableName =
  | "assessment_administration"
  | "student_node_state"
  | "mastery_evidence"
  | "raw_response_log"
  | "neighborhood_state"
  | "city_placement"
  | "city_road"
  | "city_state"
  | "city_island_state"
  | "city_crisis_damage"
  | "interleaved_practice_clear"
  | "island_unlock_exam_session"
  | "island_unlock_exam_response"
  | "island_unlock_authority"
  | "resource_grant_ledger";

export type FakeRow = Record<string, SqlValue | undefined>;

/** The one issued statement, kept so a test can assert the scoping of every single one. */
export interface IssuedStatement {
  sql: string;
  params: SqlParams | undefined;
}

const TABLE_NAMES: readonly FakeTableName[] = [
  "assessment_administration",
  "student_node_state",
  "mastery_evidence",
  "raw_response_log",
  "neighborhood_state",
  "city_placement",
  "city_road",
  "city_state",
  "city_island_state",
  "city_crisis_damage",
  "interleaved_practice_clear",
  "island_unlock_exam_session",
  "island_unlock_exam_response",
  "island_unlock_authority",
  "resource_grant_ledger",
];

/** The `0004` enums, so a value outside one fails here rather than only in Aurora. */
const ENUM_MEMBERS: Readonly<Record<string, readonly string[]>> = {
  kind: ["skill", "town_hall", "civic"],
  subject_kind: ["building", "ground", "civic", "record"],
  lesson_stage: ["not_started", "teaching", "practice", "done"],
  completion_status: ["locked", "in_progress", "complete"],
};

/** `0001`'s `lesson_stage` enum in declaration order, which is what Postgres compares on. */
const LESSON_STAGE_ORDER: readonly string[] = ENUM_MEMBERS.lesson_stage ?? [];

export interface FakeCluster {
  db: DataApiClient;
  tables: Record<FakeTableName, FakeRow[]>;
  issued: IssuedStatement[];
  /** Every era id the fake accepted for a `public.city_era` column. */
  eraValues: string[];
}

function jsonValue(value: SqlValue | undefined): unknown {
  if (value === null || value === undefined || typeof value !== "object") {
    throw new Error("a jsonb parameter must be wrapped in `json(...)`");
  }
  return (value as { value: unknown }).value;
}

function jsonRows(value: SqlValue | undefined): FakeRow[] {
  const rows = jsonValue(value);
  if (!Array.isArray(rows)) {
    throw new Error("a `jsonb_to_recordset` parameter must bind an array");
  }
  return rows as FakeRow[];
}

function requireSid(params: SqlParams | undefined): string {
  const sid = params?.sid;
  if (typeof sid !== "string" || sid.length === 0) {
    throw new Error("every statement must bind the caller's own student id as `:sid`");
  }
  return sid;
}

/** The columns a `select … from` names, in order. `*` is deliberately unsupported. */
function projection(sql: string): string[] {
  const list = /^\s*select\s+([\s\S]+?)\s+from\s/i.exec(sql)?.[1];
  if (list === undefined || list.includes("*")) {
    throw new Error(`the fake cluster needs an explicit select list: ${sql}`);
  }
  return list.split(",").map((column) => column.trim());
}

/** The columns an `order by` names. Ascending only, which is all the reads use. */
function orderBy(sql: string): string[] {
  const list = /\border\s+by\s+([\s\S]+?)\s*$/i.exec(sql)?.[1];
  return list === undefined ? [] : list.split(",").map((column) => column.trim());
}

function compareBy(columns: readonly string[]) {
  return (a: FakeRow, b: FakeRow): number => {
    for (const column of columns) {
      const left = a[column];
      const right = b[column];
      if (typeof left === "number" && typeof right === "number" && left !== right) {
        return left - right;
      }
      if (typeof left === "string" && typeof right === "string" && left !== right) {
        return left < right ? -1 : 1;
      }
    }
    return 0;
  };
}

/**
 * Build a fresh in-memory cluster. `seed` pre-loads rows exactly as a migrated-and-used
 * database would hold them, so a read-only case can start from state no writer produced.
 */
export function createFakeCluster(
  seed: Partial<Record<FakeTableName, readonly FakeRow[]>> = {},
): FakeCluster {
  const tables = Object.fromEntries(
    TABLE_NAMES.map((name) => [
      name,
      [...(seed[name] ?? [])].map((row) => ({
        ...row,
        ...([
          "city_placement",
          "city_road",
          "city_island_state",
          "city_crisis_damage",
        ].includes(name) && row.island_era === undefined
          ? { island_era: "prehistoric" }
          : {}),
        ...(name === "city_state" && row.current_island === undefined
          ? { current_island: "prehistoric" }
          : {}),
      })),
    ]),
  ) as Record<FakeTableName, FakeRow[]>;
  const issued: IssuedStatement[] = [];
  const eraValues: string[] = [];
  const initializationLockTails = new Map<string, Promise<void>>();
  // Stands in for `created_at default now()`, monotone so insertion order is a total order
  // (the placement read orders on it, and two rows inserted in one statement must not tie).
  let clock = 0;

  function checkColumnValues(row: FakeRow): void {
    for (const [column, members] of Object.entries(ENUM_MEMBERS)) {
      const value = row[column];
      if (value !== undefined && !members.includes(String(value))) {
        throw new Error(
          `invalid input value for enum on ${column}: "${String(value)}" is not one of ${members.join(", ")}`,
        );
      }
    }
    if (row.placement_id !== undefined) {
      const value = String(row.placement_id);
      const parsed = parseCivicPlacementId(value);
      const valid =
        row.kind === "civic"
          ? parsed !== null && !parsed.legacy
          : value.length > 0 && !value.includes(":");
      if (!valid) {
        throw new Error(`new row violates check constraint on placement_id: "${value}"`);
      }
    }
    if (row.subject !== undefined) {
      const value = String(row.subject);
      const parsed = parseCivicPlacementId(value);
      const valid =
        row.subject_kind === "civic" || row.subject_kind === "record"
          ? parsed !== null && !parsed.legacy
          : value.length > 0 && !value.includes(":");
      if (!valid) {
        throw new Error(`new row violates check constraint on subject: "${value}"`);
      }
    }
    if (row.subject_id !== undefined && String(row.subject_id) === "") {
      throw new Error("new row violates check constraint on subject_id");
    }
  }

  function upsertPlacements(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const era = String(params?.era);
    const island = String(params?.island);
    eraValues.push(era);
    let affected = 0;
    for (const incoming of jsonRows(params?.rows)) {
      const existing = tables.city_placement.find(
        (row) =>
          row.student_id === sid &&
          row.island_era === island &&
          row.placement_id === incoming.placement_id,
      );
      if (existing) {
        // `do update` sets the transform and nothing else: era_built, kind and subject_id
        // are what a placement IS, and the grant is column-scoped so they cannot move.
        existing.grid_col = incoming.grid_col;
        existing.grid_row = incoming.grid_row;
        existing.rot = incoming.rot;
      } else {
        clock += 1;
        const row: FakeRow = {
          student_id: sid,
          island_era: island,
          placement_id: incoming.placement_id,
          kind: incoming.kind,
          subject_id: incoming.subject_id,
          grid_col: incoming.grid_col,
          grid_row: incoming.grid_row,
          rot: incoming.rot,
          era_built: era,
          created_at: clock,
        };
        checkColumnValues(row);
        tables.city_placement.push(row);
      }
      affected += 1;
    }
    return affected;
  }

  function prunePlacements(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const island = String(params?.island);
    const keep = new Set(jsonRows(params?.rows).map((row) => String(row.placement_id)));
    const before = tables.city_placement.length;
    tables.city_placement = tables.city_placement.filter(
      (row) =>
        row.student_id !== sid ||
        row.island_era !== island ||
        keep.has(String(row.placement_id)),
    );
    return before - tables.city_placement.length;
  }

  function pruneRoads(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const island = String(params?.island);
    const keep = new Set(
      jsonRows(params?.rows).map(
        (row) => `${String(row.grid_col)},${String(row.grid_row)}`,
      ),
    );
    const before = tables.city_road.length;
    tables.city_road = tables.city_road.filter(
      (row) =>
        row.student_id !== sid ||
        row.island_era !== island ||
        keep.has(`${String(row.grid_col)},${String(row.grid_row)}`),
    );
    return before - tables.city_road.length;
  }

  function laidRoads(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const island = String(params?.island);
    let affected = 0;
    for (const incoming of jsonRows(params?.rows)) {
      const present = tables.city_road.some(
        (row) =>
          row.student_id === sid &&
          row.island_era === island &&
          row.grid_col === incoming.grid_col &&
          row.grid_row === incoming.grid_row,
      );
      if (!present) {
        clock += 1;
        tables.city_road.push({
          student_id: sid,
          island_era: island,
          grid_col: incoming.grid_col,
          grid_row: incoming.grid_row,
        });
        affected += 1;
      }
    }
    return affected;
  }

  const damageKey = (row: FakeRow): string =>
    `${String(row.damage_ordinal)}|${String(row.subject_kind)}|${String(row.subject)}`;

  function pruneCrisisDamage(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const island = String(params?.island);
    const keep = new Set(jsonRows(params?.rows).map(damageKey));
    const before = tables.city_crisis_damage.length;
    tables.city_crisis_damage = tables.city_crisis_damage.filter((row) => {
      if (row.student_id !== sid || row.island_era !== island || keep.has(damageKey(row))) {
        return true;
      }
      if (row.subject_kind === "record") {
        return false;
      }
      const eventId = `repair:${String(row.damage_id)}:${String(row.subject_kind)}:${String(
        row.subject,
      )}`;
      const paid = tables.resource_grant_ledger.some(
        (entry) =>
          entry.student_id === sid && entry.event_id === eventId && entry.kind === "spend",
      );
      return !paid;
    });
    return before - tables.city_crisis_damage.length;
  }

  function insertCrisisDamage(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const island = String(params?.island);
    let affected = 0;
    for (const incoming of jsonRows(params?.rows)) {
      const present = tables.city_crisis_damage.find(
        (row) =>
          row.student_id === sid &&
          row.island_era === island &&
          damageKey(row) === damageKey(incoming),
      );
      if (present) {
        present.bands_dark = incoming.bands_dark;
        present.verification_attempted = incoming.verification_attempted;
        continue;
      }
      affected += 1;
      clock += 1;
      const row: FakeRow = {
        student_id: sid,
        island_era: island,
        damage_ordinal: incoming.damage_ordinal,
        // `damage_id text generated always as ('d' || damage_ordinal::text) stored` — a
        // column the writer must NOT supply and the reader does select, so the fake has to
        // generate it or the round trip would prove nothing about it.
        damage_id: `d${String(incoming.damage_ordinal)}`,
        subject_kind: incoming.subject_kind,
        subject: incoming.subject,
        bands_dark: incoming.bands_dark,
        verification_attempted: incoming.verification_attempted,
        created_at: clock,
      };
      checkColumnValues(row);
      tables.city_crisis_damage.push(row);
    }
    return affected;
  }

  function upsertIslandState(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const island = String(params?.island);
    const spent = Number(params?.spent);
    const civicSpent = Number(params?.civic_spent);
    const mint = Number(params?.mint);
    const existing = tables.city_island_state.find(
      (row) => row.student_id === sid && row.island_era === island,
    );
    if (existing) {
      existing.road_gold_spent = spent;
      existing.civic_material_spent = civicSpent;
      existing.next_damage_ordinal = Math.max(Number(existing.next_damage_ordinal), mint);
      clock += 1;
      existing.updated_at = clock;
      return 1;
    }
    clock += 1;
    tables.city_island_state.push({
      student_id: sid,
      island_era: island,
      road_gold_spent: spent,
      civic_material_spent: civicSpent,
      next_damage_ordinal: mint,
      reset_count: 0,
      updated_at: clock,
    });
    return 1;
  }

  function ensureInitialIsland(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    if (params?.island !== "prehistoric") {
      return 0;
    }
    const present = tables.city_island_state.some(
      (row) => row.student_id === sid && row.island_era === "prehistoric",
    );
    if (present) {
      return 0;
    }
    clock += 1;
    tables.city_island_state.push({
      student_id: sid,
      island_era: "prehistoric",
      road_gold_spent: 0,
      civic_material_spent: 0,
      next_damage_ordinal: 1,
      reset_count: 0,
      updated_at: clock,
    });
    return 1;
  }

  function initializeBootstrapIsland(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const present = tables.city_island_state.some(
      (row) => row.student_id === sid && row.island_era === "prehistoric",
    );
    if (present) {
      return 0;
    }
    clock += 1;
    tables.city_island_state.push({
      student_id: sid,
      island_era: "prehistoric",
      road_gold_spent: 0,
      civic_material_spent: 0,
      next_damage_ordinal: 1,
      reset_count: 0,
      updated_at: clock,
    });
    return 1;
  }

  function initializeBootstrapCity(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    if (tables.city_state.some((row) => row.student_id === sid)) {
      return 0;
    }
    clock += 1;
    tables.city_state.push({
      student_id: sid,
      era_id: "prehistoric",
      current_island: "prehistoric",
      road_gold_spent: 0,
      next_damage_ordinal: 1,
      updated_at: clock,
    });
    return 1;
  }

  function upsertCityState(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const era = String(params?.era);
    const current = String(params?.current);
    eraValues.push(era);
    const spent = Number(params?.spent);
    const mint = Number(params?.mint);
    if (!Number.isInteger(spent) || spent < 0) {
      throw new Error("new row violates check constraint on road_gold_spent");
    }
    if (!Number.isInteger(mint) || mint < 1) {
      throw new Error("new row violates check constraint on next_damage_ordinal");
    }
    const existing = tables.city_state.find((row) => row.student_id === sid);
    if (existing) {
      existing.era_id = era;
      existing.current_island = current;
      if (params?.island === "prehistoric") {
        existing.road_gold_spent = spent;
        existing.next_damage_ordinal = Math.max(Number(existing.next_damage_ordinal), mint);
      }
      clock += 1;
      existing.updated_at = clock;
      return 1;
    }
    clock += 1;
    tables.city_state.push({
      student_id: sid,
      era_id: era,
      current_island: current,
      road_gold_spent: spent,
      next_damage_ordinal: mint,
      updated_at: clock,
    });
    return 1;
  }

  function insertLedger(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    let affected = 0;
    for (const incoming of jsonRows(params?.rows)) {
      const present = tables.resource_grant_ledger.some(
        (row) =>
          row.student_id === sid &&
          row.event_id === incoming.event_id &&
          row.resource_type === incoming.resource_type,
      );
      if (present) {
        continue;
      }
      tables.resource_grant_ledger.push({ student_id: sid, ...incoming });
      affected += 1;
    }
    return affected;
  }

  function foundIsland(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const island = String(params?.island);
    const present = tables.city_island_state.some(
      (row) => row.student_id === sid && row.island_era === island,
    );
    if (present) {
      return 0;
    }
    clock += 1;
    tables.city_island_state.push({
      student_id: sid,
      island_era: island,
      road_gold_spent: 0,
      civic_material_spent: 0,
      next_damage_ordinal: 1,
      reset_count: 0,
      updated_at: clock,
    });
    return 1;
  }

  function recordInterleavedClear(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const session = String(params?.session);
    const present = tables.interleaved_practice_clear.some(
      (row) => row.student_id === sid && row.session_id === session,
    );
    if (present) {
      return 0;
    }
    const itemIds = jsonValue(params?.items);
    const nodeIds = jsonValue(params?.nodes);
    if (!Array.isArray(itemIds) || !Array.isArray(nodeIds)) {
      throw new Error("interleaved evidence arrays must be json");
    }
    clock += 1;
    tables.interleaved_practice_clear.push({
      student_id: sid,
      session_id: session,
      era_id: String(params?.era),
      item_version_ids: JSON.stringify(itemIds),
      node_ids: JSON.stringify(nodeIds),
      response_count: Number(params?.count),
      cleared_at: clock,
    });
    return 1;
  }

  function createIslandExamSession(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const session = String(params?.session);
    const outgoing = String(params?.outgoing);
    const destination = String(params?.destination);
    const outgoingIndex = ERA_SEQUENCE.findIndex((era) => era.id === outgoing);
    const expectedDestination = ERA_SEQUENCE[outgoingIndex + 1]?.id;
    const expectedTarget =
      outgoingIndex < 0
        ? null
        : islandUnlockTarget(ERA_SEQUENCE[outgoingIndex]?.nodes.length ?? 0);
    if (
      session.length === 0 ||
      session.includes(":") ||
      destination !== expectedDestination ||
      Number(params?.target) !== expectedTarget ||
      !Number.isFinite(Date.parse(String(params?.expires)))
    ) {
      throw new Error("new row violates island unlock exam session constraint");
    }
    if (
      tables.island_unlock_exam_session.some(
        (row) => row.student_id === sid && row.session_id === session,
      )
    ) {
      return 0;
    }
    clock += 1;
    tables.island_unlock_exam_session.push({
      student_id: sid,
      session_id: session,
      outgoing_era: outgoing,
      destination_era: destination,
      score: 0,
      target_score: Number(params?.target),
      response_count: 0,
      cycle_node_ids: JSON.stringify([]),
      last_node_id: null,
      last_item_by_node: JSON.stringify({}),
      started_at: clock,
      expires_at: String(params?.expires),
      passed_at: null,
    });
    return 1;
  }

  function recordIslandExamResponse(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const raw = params?.raw === null ? null : jsonValue(params?.raw);
    const session = String(params?.session);
    const responseId = String(params?.response);
    const sequence = Number(params?.sequence);
    const item = String(params?.item);
    const node = String(params?.node);
    const outcome = String(params?.outcome);
    const correct = Boolean(params?.correct);
    const delta = Number(params?.delta);
    const checker = params?.checker ?? null;
    if (
      !tables.island_unlock_exam_session.some(
        (row) => row.student_id === sid && row.session_id === session,
      ) ||
      responseId.length === 0 ||
      responseId.includes(":") ||
      !Number.isInteger(sequence) ||
      sequence < 0 ||
      item.length === 0 ||
      /\s/.test(item) ||
      !/^[A-Z0-9]+\.[A-Z0-9]+$/.test(node) ||
      !["answer", "skip"].includes(outcome) ||
      (outcome === "skip" && (raw !== null || checker !== null || correct)) ||
      (outcome === "answer" && (raw === null || !Number.isInteger(Number(checker)))) ||
      (correct ? delta !== 1 : delta !== -1) ||
      Number(params?.score) < 0 ||
      tables.island_unlock_exam_response.some(
        (row) =>
          row.student_id === sid &&
          row.session_id === session &&
          (row.response_id === responseId || row.sequence === sequence),
      )
    ) {
      throw new Error("new row violates island unlock exam response constraint");
    }
    tables.island_unlock_exam_response.push({
      student_id: sid,
      session_id: session,
      response_id: responseId,
      sequence,
      item_version_id: item,
      node_id: node,
      outcome,
      raw_answer: raw === null ? null : JSON.stringify(raw),
      checker_version: checker,
      correct,
      delta,
      score_after: Number(params?.score),
      answered_at: ++clock,
    });
    return 1;
  }

  function updateIslandExamSession(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const row = tables.island_unlock_exam_session.find(
      (candidate) =>
        candidate.student_id === sid && candidate.session_id === params?.session,
    );
    if (!row) {
      return 0;
    }
    const score = Number(params?.score);
    const count = Number(params?.count);
    const cycle = jsonValue(params?.cycle);
    const lastItems = jsonValue(params?.last_items);
    if (
      !Number.isInteger(score) ||
      score < 0 ||
      score > Number(row.target_score) ||
      !Number.isInteger(count) ||
      count < 0 ||
      !Array.isArray(cycle) ||
      cycle.length > Number(row.target_score) / 2 ||
      cycle.some((entry) => typeof entry !== "string" || entry.length === 0) ||
      typeof lastItems !== "object" ||
      lastItems === null ||
      Array.isArray(lastItems) ||
      Object.entries(lastItems).some(
        ([key, value]) =>
          key.length === 0 || typeof value !== "string" || value.length === 0,
      ) ||
      (params?.passed === true && score !== Number(row.target_score))
    ) {
      throw new Error("update violates island unlock exam session constraint");
    }
    row.score = score;
    row.response_count = count;
    row.cycle_node_ids = JSON.stringify(cycle);
    row.last_node_id = params?.last_node ?? null;
    row.last_item_by_node = JSON.stringify(lastItems);
    if (params?.passed === true && row.passed_at === null) {
      row.passed_at = ++clock;
    }
    return 1;
  }

  function recordIslandUnlockAuthority(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const island = String(params?.island);
    const present = tables.island_unlock_authority.some(
      (row) => row.student_id === sid && row.island_era === island,
    );
    if (present) {
      return 0;
    }
    const kind = String(params?.kind);
    const outgoing = params?.outgoing ?? null;
    const session = params?.session ?? null;
    const target = params?.target ?? null;
    const outgoingIndex = ERA_SEQUENCE.findIndex((era) => era.id === outgoing);
    const expectedIsland = ERA_SEQUENCE[outgoingIndex + 1]?.id;
    const expectedTarget =
      outgoingIndex < 0
        ? null
        : islandUnlockTarget(ERA_SEQUENCE[outgoingIndex]?.nodes.length ?? 0);
    if (
      (kind === "exam" &&
        (outgoing === null ||
          session === null ||
          island !== expectedIsland ||
          target !== expectedTarget ||
          !tables.island_unlock_exam_session.some(
            (row) => row.student_id === sid && row.session_id === session,
          ))) ||
      (kind === "diagnostic" &&
        (outgoing !== null || session !== null || target !== null)) ||
      (kind !== "exam" && kind !== "diagnostic")
    ) {
      throw new Error("new row violates island unlock authority constraint");
    }
    clock += 1;
    tables.island_unlock_authority.push({
      student_id: sid,
      island_era: island,
      authority_kind: kind,
      outgoing_era: outgoing,
      session_id: session,
      target_score: target,
      authorized_at: clock,
    });
    return 1;
  }

  function foundTownHall(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const island = String(params?.island);
    const present = tables.city_placement.some(
      (row) =>
        row.student_id === sid &&
        row.island_era === island &&
        row.placement_id === "town-hall",
    );
    if (present) {
      return 0;
    }
    tables.city_placement.push({
      student_id: sid,
      island_era: island,
      placement_id: "town-hall",
      kind: "town_hall",
      subject_id: "town-hall",
      grid_col: -1,
      grid_row: -1,
      rot: 0,
      era_built: island,
      created_at: ++clock,
    });
    return 1;
  }

  function landIsland(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const city = tables.city_state.find((row) => row.student_id === sid);
    if (!city) {
      return 0;
    }
    city.current_island = String(params?.island);
    city.updated_at = ++clock;
    return 1;
  }

  function clearRepairedDamage(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const before = tables.city_crisis_damage.length;
    tables.city_crisis_damage = tables.city_crisis_damage.filter(
      (row) =>
        row.student_id !== sid ||
        row.island_era !== params?.island ||
        row.damage_id !== params?.damage ||
        row.subject_kind !== params?.kind ||
        row.subject !== params?.subject,
    );
    return before - tables.city_crisis_damage.length;
  }

  function clearIslandTable(
    table: "city_placement" | "city_road" | "city_crisis_damage",
    params: SqlParams | undefined,
  ): number {
    const sid = requireSid(params);
    const island = String(params?.island);
    const before = tables[table].length;
    tables[table] = tables[table].filter(
      (row) =>
        row.student_id !== sid ||
        row.island_era !== island ||
        (table === "city_placement" && row.kind === "town_hall"),
    );
    return before - tables[table].length;
  }

  function resetIslandState(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const island = String(params?.island);
    const existing = tables.city_island_state.find(
      (row) => row.student_id === sid && row.island_era === island,
    );
    if (existing) {
      existing.road_gold_spent = 0;
      existing.civic_material_spent = 0;
      existing.reset_count = Number(existing.reset_count ?? 0) + 1;
      return 1;
    }
    tables.city_island_state.push({
      student_id: sid,
      island_era: island,
      road_gold_spent: 0,
      civic_material_spent: 0,
      next_damage_ordinal: 1,
      reset_count: 1,
    });
    return 1;
  }

  /** The `(student_id, node_id)` row the learning-record writers operate on, if it exists. */
  function nodeStateRow(params: SqlParams | undefined): FakeRow | undefined {
    const sid = requireSid(params);
    return tables.student_node_state.find(
      (row) => row.student_id === sid && row.node_id === params?.nid,
    );
  }

  function ensureNodeStateRow(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    if (nodeStateRow(params)) {
      return 0;
    }
    const row: FakeRow = {
      student_id: sid,
      node_id: String(params?.nid),
      placement_estimate: 0,
      mastery: 0,
      mastery_updated_at: null,
      // `generated always as … stored` over `mastery`, so the fake maintains it for the
      // same reason it generates `damage_id`: the writer must not supply it and the reader
      // does select it, and a fake that let the writer set it would prove nothing.
      completion_status: completionStatusForMastery(0),
      lesson_stage: "not_started",
      last_practiced_at: null,
    };
    checkColumnValues(row);
    tables.student_node_state.push(row);
    return 1;
  }

  function finalizePractice(params: SqlParams | undefined): number {
    const row = nodeStateRow(params);
    const next = Number(params?.mastery);
    if (!Number.isInteger(next) || next < 0 || next > 3) {
      throw new Error("new row violates check constraint on mastery");
    }
    if (row === undefined) {
      return 0;
    }
    clock += 1;
    if (Number(row.mastery) < next) {
      row.mastery = next;
      row.mastery_updated_at = clock;
      row.completion_status = completionStatusForMastery(next as 0 | 1 | 2 | 3);
    }
    // A new evidence row means a practice set finished even when its score did not raise
    // mastery. These fields move in the same fake statement, matching the atomic SQL.
    row.lesson_stage = "done";
    row.last_practiced_at = clock;
    checkColumnValues(row);
    return 1;
  }

  function writeStage(params: SqlParams | undefined): number {
    const row = nodeStateRow(params);
    const next = String(params?.stage);
    const rank = LESSON_STAGE_ORDER.indexOf(next);
    if (rank < 0) {
      throw new Error(`invalid input value for enum lesson_stage: "${next}"`);
    }
    if (row === undefined || LESSON_STAGE_ORDER.indexOf(String(row.lesson_stage)) >= rank) {
      return 0;
    }
    clock += 1;
    row.lesson_stage = next;
    row.last_practiced_at = clock;
    checkColumnValues(row);
    return 1;
  }

  function writeEvidence(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const evidenceId = String(params?.eid);
    // `on conflict (evidence_id) do nothing` — and on `evidence_id` ALONE, which is the
    // primary key, so a second student cannot take an id the first one already used.
    if (tables.mastery_evidence.some((row) => row.evidence_id === evidenceId)) {
      return 0;
    }
    clock += 1;
    const row: FakeRow = {
      evidence_id: evidenceId,
      student_id: sid,
      node_id: String(params?.nid),
      mastery: Number(params?.mastery),
      completion_status: String(params?.status),
      changed: Boolean(params?.changed),
      received_at: clock,
    };
    checkColumnValues(row);
    tables.mastery_evidence.push(row);
    return 1;
  }

  function writeResponses(params: SqlParams | undefined): number {
    const sid = requireSid(params);
    const evidenceId = String(params?.eid);
    const evidence = tables.mastery_evidence.find(
      (row) => row.evidence_id === evidenceId && row.student_id === sid,
    );
    if (!evidence) {
      throw new Error("raw response violates mastery evidence foreign key");
    }
    let affected = 0;
    for (const incoming of jsonRows(params?.rows)) {
      const slot = Number(incoming.slot_index);
      if (
        tables.raw_response_log.some(
          (row) => row.evidence_id === evidenceId && row.slot_index === slot,
        )
      ) {
        throw new Error("raw response violates attempt-slot unique constraint");
      }
      clock += 1;
      const row: FakeRow = {
        ...incoming,
        student_id: sid,
        evidence_id: evidenceId,
        node_id: String(params?.nid),
        slot_index: slot,
        misconception_tag: null,
        created_at: clock,
      };
      checkColumnValues(row);
      tables.raw_response_log.push(row);
      affected += 1;
    }
    return affected;
  }

  const writers: readonly [string, (params: SqlParams | undefined) => number][] = [
    [MASTERY_WRITE_STATEMENTS.ensureRow, ensureNodeStateRow],
    [MASTERY_WRITE_STATEMENTS.finalizePractice, finalizePractice],
    [MASTERY_WRITE_STATEMENTS.writeStage, writeStage],
    [MASTERY_WRITE_STATEMENTS.writeEvidence, writeEvidence],
    [CITY_BOOTSTRAP_STATEMENTS.initializeCityState, initializeBootstrapCity],
    [CITY_BOOTSTRAP_STATEMENTS.initializeIslandState, initializeBootstrapIsland],
    [MASTERY_WRITE_STATEMENTS.writeResponses, writeResponses],
    [CITY_WRITE_STATEMENTS.ensureInitialIsland, ensureInitialIsland],
    [CITY_WRITE_STATEMENTS.prunePlacements, prunePlacements],
    [CITY_WRITE_STATEMENTS.upsertPlacements, upsertPlacements],
    [CITY_WRITE_STATEMENTS.pruneRoads, pruneRoads],
    [CITY_WRITE_STATEMENTS.laidRoads, laidRoads],
    [CITY_WRITE_STATEMENTS.pruneCrisisDamage, pruneCrisisDamage],
    [CITY_WRITE_STATEMENTS.insertCrisisDamage, insertCrisisDamage],
    [CITY_WRITE_STATEMENTS.upsertIslandState, upsertIslandState],
    [CITY_WRITE_STATEMENTS.upsertCityState, upsertCityState],
    [ECONOMY_LEDGER_INSERT, insertLedger],
    [ECONOMY_AUTHORITY_STATEMENTS.foundIsland, foundIsland],
    [ECONOMY_AUTHORITY_STATEMENTS.foundTownHall, foundTownHall],
    [ECONOMY_AUTHORITY_STATEMENTS.landIsland, landIsland],
    [ECONOMY_AUTHORITY_STATEMENTS.recordInterleavedClear, recordInterleavedClear],
    [ECONOMY_AUTHORITY_STATEMENTS.createIslandExamSession, createIslandExamSession],
    [ECONOMY_AUTHORITY_STATEMENTS.recordIslandExamResponse, recordIslandExamResponse],
    [ECONOMY_AUTHORITY_STATEMENTS.updateIslandExamSession, updateIslandExamSession],
    [ECONOMY_AUTHORITY_STATEMENTS.recordIslandUnlockAuthority, recordIslandUnlockAuthority],
    [ECONOMY_AUTHORITY_STATEMENTS.clearRepairedDamage, clearRepairedDamage],
    [
      ISLAND_RESET_STATEMENTS.clearPlacements,
      (params) => clearIslandTable("city_placement", params),
    ],
    [ISLAND_RESET_STATEMENTS.clearRoads, (params) => clearIslandTable("city_road", params)],
    [
      ISLAND_RESET_STATEMENTS.clearDamage,
      (params) => clearIslandTable("city_crisis_damage", params),
    ],
    [ISLAND_RESET_STATEMENTS.resetState, resetIslandState],
  ];

  function hasCanonicalState(params: SqlParams | undefined): boolean {
    const sid = requireSid(params);
    return [
      tables.assessment_administration,
      tables.student_node_state,
      tables.neighborhood_state,
      tables.city_state,
      tables.city_island_state,
      tables.city_placement,
      tables.city_road,
      tables.city_crisis_damage,
      tables.resource_grant_ledger,
    ].some((rows) => rows.some((row) => row.student_id === sid));
  }

  function runSelect(sql: string, params: SqlParams | undefined): FakeRow[] {
    const sid = requireSid(params);
    const table = TABLE_NAMES.find((name) => sql.includes(`public.${name}`));
    if (table === undefined) {
      throw new Error(`the fake cluster was asked for a table it does not have: ${sql}`);
    }
    const columns = projection(sql);
    // Evidence ids are globally unique. Its ownership check must see an id another student
    // owns; pre-filtering to the caller would turn that conflict into "not found" and let the
    // second request touch mastery before the unique insert refused it.
    let rows =
      table === "mastery_evidence" && sql === MASTERY_WRITE_STATEMENTS.readEvidence
        ? tables[table]
        : tables[table].filter((row) => row.student_id === sid);
    if (table === "neighborhood_state") {
      rows = rows.filter((row) => row.neighborhood_id === params?.nid);
    }
    if (table === "student_node_state" && params?.node !== undefined) {
      rows = rows.filter((row) => row.node_id === params.node);
    }
    if (table === "island_unlock_exam_session" && params?.session !== undefined) {
      rows = rows.filter((row) => row.session_id === params.session);
    }
    if (table === "island_unlock_exam_response" && params?.session !== undefined) {
      rows = rows.filter(
        (row) =>
          row.session_id === params.session &&
          (row.response_id === params.response || row.sequence === params.sequence),
      );
    }
    // The learning-record lane binds the node as `:nid`, matching the writes it sits beside.
    if (table === "student_node_state" && params?.nid !== undefined) {
      rows = rows.filter((row) => row.node_id === params.nid);
    }
    if (table === "mastery_evidence" && params?.eid !== undefined) {
      rows = rows.filter((row) => row.evidence_id === params.eid);
    }
    if (
      table === "mastery_evidence" &&
      sql !== MASTERY_WRITE_STATEMENTS.readEvidence &&
      params?.nid !== undefined
    ) {
      rows = rows.filter((row) => row.node_id === params.nid);
    }
    if (table === "city_island_state" && params?.island !== undefined) {
      rows = rows.filter((row) => row.island_era === params.island);
    }
    if (table === "city_placement" && params?.island !== undefined) {
      rows = rows.filter(
        (row) =>
          row.island_era === params.island &&
          (!sql.includes("placement_id = 'town-hall'") ||
            (row.placement_id === "town-hall" && row.kind === "town_hall")),
      );
    }
    if (table === "city_crisis_damage" && params?.damage !== undefined) {
      rows = rows.filter(
        (row) =>
          row.damage_id === params.damage &&
          row.subject_kind === params.kind &&
          row.subject === params.subject,
      );
    }
    const order = orderBy(sql);
    if (order.length > 0) {
      rows = [...rows].sort(compareBy(order));
    }
    // PROJECT, so a column the read forgot to select is absent from the row it maps —
    // which is how Postgres behaves and is the point of doing this at all.
    return rows.map((row) =>
      Object.fromEntries(columns.map((column) => [column, row[column] ?? null])),
    );
  }

  function executor(): DataApiExecutor {
    return {
      async query<T>(sql: string, params?: SqlParams): Promise<T[]> {
        issued.push({ sql, params });
        if (!/^\s*select\b/i.test(sql)) {
          throw new Error(`query() was handed a write: ${sql}`);
        }
        if (sql === ACCOUNT_INITIALIZATION_LOCK_SQL) {
          return [] as T[];
        }
        if (sql === ACCOUNT_STATE_EXISTS_SQL) {
          return (hasCanonicalState(params) ? [{ present: true }] : []) as T[];
        }
        return runSelect(sql, params) as T[];
      },
      async execute(sql: string, params?: SqlParams): Promise<number> {
        issued.push({ sql, params });
        const writer = writers.find(([statement]) => statement === sql);
        if (writer === undefined) {
          throw new Error(
            "the fake cluster does not model this statement. Every write must be one of " +
              `CITY_WRITE_STATEMENTS, byte for byte: ${sql}`,
          );
        }
        return writer[1](params);
      },
    };
  }

  function transactionExecutor(): {
    readonly tx: DataApiExecutor;
    readonly releaseLocks: () => void;
  } {
    let statementRunning = false;
    const releases: (() => void)[] = [];
    const run = async <T>(statement: () => Promise<T>): Promise<T> => {
      if (statementRunning) {
        throw new Error("Transaction is still running a query");
      }
      statementRunning = true;
      try {
        // Yield once so concurrent calls overlap as they do against Aurora Data API.
        await Promise.resolve();
        return await statement();
      } finally {
        statementRunning = false;
      }
    };
    const acquireInitializationLock = async (
      params: SqlParams | undefined,
    ): Promise<void> => {
      const sid = requireSid(params);
      const previous = initializationLockTails.get(sid) ?? Promise.resolve();
      let release = (): void => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const tail = previous.then(() => held);
      initializationLockTails.set(sid, tail);
      await previous;
      releases.push(() => {
        release();
        if (initializationLockTails.get(sid) === tail) {
          initializationLockTails.delete(sid);
        }
      });
    };
    return {
      tx: {
        query: <T>(sql: string, params?: SqlParams) =>
          run(async () => {
            if (sql === ACCOUNT_INITIALIZATION_LOCK_SQL) {
              await acquireInitializationLock(params);
            }
            return base.query<T>(sql, params);
          }),
        execute: (sql: string, params?: SqlParams) => run(() => base.execute(sql, params)),
      },
      releaseLocks: () => {
        for (const release of releases.reverse()) {
          release();
        }
      },
    };
  }

  const base = executor();
  return {
    tables,
    issued,
    eraValues,
    db: {
      query: base.query,
      execute: base.execute,
      async withTransaction<T>(fn: (tx: DataApiExecutor) => Promise<T>): Promise<T> {
        // A real rollback, so "a half-saved city is impossible" is a testable claim rather
        // than a comment: the snapshot goes back on any throw.
        const snapshot = Object.fromEntries(
          TABLE_NAMES.map((name) => [name, tables[name].map((row) => ({ ...row }))]),
        ) as Record<FakeTableName, FakeRow[]>;
        const transaction = transactionExecutor();
        try {
          return await fn(transaction.tx);
        } catch (error) {
          for (const name of TABLE_NAMES) {
            tables[name] = snapshot[name];
          }
          throw error;
        } finally {
          transaction.releaseLocks();
        }
      },
    },
  };
}
