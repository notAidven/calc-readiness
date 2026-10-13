import { type DataApiClient, type DataApiExecutor, json } from "@cr/db";
import type {
  DiagnosticAuthenticator,
  DiagnosticServerResponse,
} from "@cr/diagnostic-runtime";
import {
  applyCivicPurchase,
  applyGrant,
  applyRepairSpend,
  assertLedgerEntryInvariant,
  civicBootstrapGrant,
  civicLiftSuspensionCost,
  computeMaterialBalances,
  countInterleavedGrants,
  DRILL_PAID_SETS_PER_ERA,
  drillSetsRemaining,
  hasLessonCompletionGrant,
  interleavedGrant,
  islandFoundingGrant,
  LESSON_GRANT_MASTERY_BAR,
  type LedgerEntry,
  type LedgerView,
  lessonCompleteGrant,
  materialForEra,
  parseCivicPlacementId,
  practiceSetGrant,
  type RepairSubjectKind,
  repairEventIdFor,
} from "@cr/economy";
import {
  diagnosticEraPlacement,
  hardWinterRepairPrices,
  ISLAND_UNLOCK_MASTERY_GATE,
  islandUnlockMasteryRequirement,
  islandUnlockTarget,
} from "@cr/game";
import {
  checkerVersionForPracticeItem,
  PRACTICE_AUTHORITY_ITEMS,
  PRACTICE_AUTHORITY_ITEMS_BY_ID,
  practiceAuthorityChecker,
} from "@cr/item-bank";
import { PRACTICED_MASTERY } from "@cr/mastery-service";
import { ERA_SEQUENCE, type EraId, getEraOrThrow } from "@cr/skill-graph";
import type { UUID } from "@cr/state-schema";

import type { EconomyService } from "./app";
import { describeWriteFailure } from "./writes";

const ERA_IDS: ReadonlySet<string> = new Set(ERA_SEQUENCE.map((era) => era.id));

interface LedgerRow {
  student_id: string;
  event_id: string;
  resource_type: LedgerEntry["resource_type"];
  kind: LedgerEntry["kind"];
  amount: number;
  reason_code: string;
  created_at: string;
}

interface NodeEvidenceRow {
  node_id: string;
  mastery: number;
  placement_estimate: number;
  last_practiced_at: string | null;
}

interface PracticeEvidenceRow {
  evidence_id: string;
  node_id: string;
  mastery: number;
}

interface IslandAuthorityRow {
  island_era: EraId;
}

interface IslandWalletRow {
  road_gold_spent: number;
}

interface CurrentIslandRow {
  current_island: EraId;
}

interface DamageAuthorityRow {
  island_era: EraId;
  damage_id: string;
  subject_kind: RepairSubjectKind;
  subject: string;
}

interface InterleavedClearRow {
  session_id: string;
}

interface IslandUnlockExamSessionRow {
  session_id: string;
  outgoing_era: EraId;
  destination_era: EraId;
  score: number;
  target_score: number;
  response_count: number;
  cycle_node_ids: unknown;
  last_node_id: string | null;
  last_item_by_node: unknown;
  expires_at: string;
  passed_at: string | null;
}

interface IslandUnlockExamResponseRow {
  response_id: string;
  sequence: number;
  item_version_id: string;
  node_id: string;
  outcome: "answer" | "skip";
  raw_answer: unknown;
  checker_version: number | null;
  correct: boolean;
  delta: 1 | -1;
  score_after: number;
}

export const ECONOMY_LEDGER_INSERT = `insert into public.resource_grant_ledger
    (student_id, event_id, resource_type, kind, amount, reason_code, era_id, created_at)
  select :sid::uuid, r.event_id, r.resource_type::public.economy_resource,
         r.kind::public.economy_txn_kind, r.amount, r.reason_code,
         r.era_id::public.city_era, r.created_at
    from jsonb_to_recordset(:rows::jsonb)
      as r(event_id text, resource_type text, kind text, amount integer,
           reason_code text, era_id text, created_at timestamptz)
  on conflict (student_id, event_id, resource_type) do nothing`;

/** Server-owned evidence and state transitions issued by the economy authority. */
export const ECONOMY_AUTHORITY_STATEMENTS = {
  foundIsland: `insert into public.city_island_state
      (student_id, island_era, road_gold_spent, civic_material_spent,
       next_damage_ordinal, reset_count, updated_at)
    values (:sid::uuid, :island::public.city_era, 0, 0, 1, 0, now())
    on conflict (student_id, island_era) do nothing`,
  recordInterleavedClear: `insert into public.interleaved_practice_clear
      (student_id, session_id, era_id, item_version_ids, node_ids, response_count)
    values (:sid::uuid, :session, :era::public.city_era, :items::jsonb, :nodes::jsonb, :count)
    on conflict (student_id, session_id) do nothing`,
  createIslandExamSession: `insert into public.island_unlock_exam_session
      (student_id, session_id, outgoing_era, destination_era, score, target_score,
       response_count, cycle_node_ids, last_node_id, last_item_by_node, expires_at)
    values (:sid::uuid, :session, :outgoing::public.city_era,
            :destination::public.city_era, 0, :target, 0, '[]'::jsonb, null,
            '{}'::jsonb, :expires::timestamptz)
    on conflict (student_id, session_id) do nothing`,
  recordIslandExamResponse: `insert into public.island_unlock_exam_response
      (student_id, session_id, response_id, sequence, item_version_id, node_id,
       outcome, raw_answer, checker_version, correct, delta, score_after)
    values (:sid::uuid, :session, :response, :sequence, :item, :node,
            :outcome, :raw::jsonb, :checker, :correct, :delta, :score)`,
  updateIslandExamSession: `update public.island_unlock_exam_session
      set score = :score,
          response_count = :count,
          cycle_node_ids = :cycle::jsonb,
          last_node_id = :last_node,
          last_item_by_node = :last_items::jsonb,
          passed_at = case when :passed then coalesce(passed_at, now()) else passed_at end
    where student_id = :sid::uuid and session_id = :session`,
  recordIslandUnlockAuthority: `insert into public.island_unlock_authority
      (student_id, island_era, authority_kind, outgoing_era, session_id, target_score)
    values (:sid::uuid, :island::public.city_era, :kind,
            :outgoing::public.city_era, :session, :target)
    on conflict (student_id, island_era) do nothing`,
  foundTownHall: `insert into public.city_placement
      (student_id, island_era, placement_id, kind, subject_id,
       grid_col, grid_row, rot, era_built)
    values (:sid::uuid, :island::public.city_era, 'town-hall',
            'town_hall'::public.city_placement_kind, 'town-hall',
            -1, -1, 0, :island::public.city_era)
    on conflict (student_id, island_era, placement_id) do nothing`,
  landIsland: `update public.city_state
    set current_island = :island::public.city_era, updated_at = now()
    where student_id = :sid::uuid`,
  clearRepairedDamage: `delete from public.city_crisis_damage
    where student_id = :sid::uuid
      and island_era = :island::public.city_era
      and damage_id = :damage
      and subject_kind = :kind::public.crisis_damage_subject
      and subject = :subject`,
} as const;

class EconomyAuthorityError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "EconomyAuthorityError";
    this.status = status;
    this.code = code;
  }
}

export async function loadEconomyLedger(
  db: DataApiExecutor,
  studentId: UUID,
): Promise<LedgerEntry[]> {
  const rows = await db.query<LedgerRow>(
    `select student_id, event_id, resource_type, kind, amount, reason_code, created_at
       from public.resource_grant_ledger
      where student_id = :sid::uuid
      order by created_at, event_id, resource_type`,
    { sid: studentId },
  );
  return rows.map((row) => {
    const entry: LedgerEntry = { ...row };
    assertLedgerEntryInvariant(entry);
    return entry;
  });
}

async function loadInterleavedClearIds(
  db: DataApiExecutor,
  studentId: UUID,
): Promise<string[]> {
  const rows = await db.query<InterleavedClearRow>(
    `select session_id from public.interleaved_practice_clear
      where student_id = :sid::uuid
      order by cleared_at, session_id`,
    { sid: studentId },
  );
  return rows.map((row) => row.session_id);
}

async function currentIsland(db: DataApiExecutor, studentId: UUID): Promise<EraId> {
  const rows = await db.query<CurrentIslandRow>(
    `select current_island from public.city_state
      where student_id = :sid::uuid`,
    { sid: studentId },
  );
  return rows[0]?.current_island ?? (ERA_SEQUENCE[0]?.id as EraId);
}

async function nodeEvidence(
  db: DataApiExecutor,
  studentId: UUID,
  nodeId?: string,
): Promise<NodeEvidenceRow[]> {
  return db.query<NodeEvidenceRow>(
    `select node_id, mastery, placement_estimate, last_practiced_at from public.student_node_state
      where student_id = :sid::uuid${nodeId === undefined ? "" : " and node_id = :node"}`,
    nodeId === undefined ? { sid: studentId } : { sid: studentId, node: nodeId },
  );
}

/** One scored lesson-practice submission, already graded by the mastery authority. */
async function practiceEvidence(
  db: DataApiExecutor,
  studentId: UUID,
  evidenceId: string,
  nodeId: string,
): Promise<PracticeEvidenceRow | null> {
  const rows = await db.query<PracticeEvidenceRow>(
    `select evidence_id, node_id, mastery from public.mastery_evidence
      where student_id = :sid::uuid and evidence_id = :eid and node_id = :nid`,
    { sid: studentId, eid: evidenceId, nid: nodeId },
  );
  return rows[0] ?? null;
}

async function roadSpend(
  db: DataApiExecutor,
  studentId: UUID,
  eraId: EraId,
): Promise<number> {
  const rows = await db.query<IslandWalletRow>(
    `select road_gold_spent from public.city_island_state
      where student_id = :sid::uuid and island_era = :island::public.city_era`,
    { sid: studentId, island: eraId },
  );
  return Math.max(0, rows[0]?.road_gold_spent ?? 0);
}

function wallet(view: LedgerView, eraId: EraId, roadSpent = 0) {
  const materials = computeMaterialBalances(view);
  const material = materialForEra(eraId);
  return {
    materials,
    spendable:
      material === null ? 0 : Math.max(0, (materials[material.id] ?? 0) - roadSpent),
    spendableMaterial: material,
  };
}

export async function appendEconomyRows(
  tx: DataApiExecutor,
  studentId: UUID,
  rows: readonly LedgerEntry[],
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }
  const eraByResource = new Map(
    ERA_SEQUENCE.map((era) => [materialForEra(era.id)?.id, era.id] as const),
  );
  return tx.execute(ECONOMY_LEDGER_INSERT, {
    sid: studentId,
    rows: json(
      rows.map((row) => ({
        event_id: row.event_id,
        resource_type: row.resource_type,
        kind: row.kind,
        amount: row.amount,
        reason_code: row.reason_code,
        era_id: eraByResource.get(row.resource_type) ?? "prehistoric",
        created_at: row.created_at,
      })),
    ),
  });
}

function parseEra(value: unknown): EraId | null {
  return typeof value === "string" && ERA_IDS.has(value) ? (value as EraId) : null;
}

interface InterleavedResponse {
  readonly itemVersionId: string;
  readonly rawAnswer: unknown;
}

type IslandExamResponse =
  | {
      readonly itemVersionId: string;
      readonly outcome: "answer";
      readonly rawAnswer: unknown;
    }
  | {
      readonly itemVersionId: string;
      readonly outcome: "skip";
    };

type IslandFoundingAuthority =
  | {
      readonly source: "exam";
      readonly sessionId: string;
    }
  | { readonly source: "diagnostic" };

type EconomyAction =
  | { action: "lesson_complete"; nodeId: string }
  | {
      action: "practice_complete";
      evidenceId: string;
      nodeId: string;
      struggleLevel: number | null;
    }
  | {
      action: "interleaved";
      sessionId: string;
      responses: readonly InterleavedResponse[];
      struggleLevel: number | null;
    }
  | {
      action: "found_island";
      eraId: EraId;
      authority: IslandFoundingAuthority;
    }
  | { action: "found_diagnostic_prefix" }
  | {
      action: "island_exam_response";
      eraId: EraId;
      sessionId: string;
      responseId: string;
      sequence: number;
      response: IslandExamResponse;
    }
  | { action: "land_island"; eraId: EraId }
  | { action: "civic_bootstrap"; eraId: EraId }
  | { action: "purchase_civic"; placementId: string; building: string }
  | {
      action: "repair";
      damageId: string;
      subjectKind: "building" | "ground" | "civic";
      subject: string;
    };

function parseInterleavedResponses(value: unknown): readonly InterleavedResponse[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const responses: InterleavedResponse[] = [];
  for (const entry of value) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Record<string, unknown>).itemVersionId !== "string" ||
      !Object.hasOwn(entry, "rawAnswer")
    ) {
      return null;
    }
    responses.push({
      itemVersionId: (entry as { itemVersionId: string }).itemVersionId,
      rawAnswer: (entry as { rawAnswer: unknown }).rawAnswer,
    });
  }
  return responses;
}

function parseIslandExamResponse(value: unknown): IslandExamResponse | null {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as Record<string, unknown>).itemVersionId !== "string"
  ) {
    return null;
  }
  const response = value as Record<string, unknown>;
  if (response.outcome === "skip") {
    return {
      itemVersionId: response.itemVersionId as string,
      outcome: "skip",
    };
  }
  return response.outcome === "answer" && Object.hasOwn(response, "rawAnswer")
    ? {
        itemVersionId: response.itemVersionId as string,
        outcome: "answer",
        rawAnswer: response.rawAnswer,
      }
    : null;
}

function parseIslandFoundingAuthority(value: unknown): IslandFoundingAuthority | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const authority = value as Record<string, unknown>;
  if (authority.source === "diagnostic") {
    return { source: "diagnostic" };
  }
  if (authority.source !== "exam") {
    return null;
  }
  if (Object.hasOwn(authority, "responses") || Object.hasOwn(authority, "passed")) {
    return null;
  }
  return typeof authority.sessionId === "string" &&
    authority.sessionId.length > 0 &&
    !authority.sessionId.includes(":")
    ? { source: "exam", sessionId: authority.sessionId }
    : null;
}

function parseAction(value: unknown): EconomyAction | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const body = value as Record<string, unknown>;
  switch (body.action) {
    case "lesson_complete":
      return typeof body.nodeId === "string"
        ? { action: body.action, nodeId: body.nodeId }
        : null;
    case "practice_complete": {
      const struggleLevel =
        body.struggleLevel === undefined || body.struggleLevel === null
          ? null
          : typeof body.struggleLevel === "number" && Number.isFinite(body.struggleLevel)
            ? body.struggleLevel
            : undefined;
      return typeof body.evidenceId === "string" &&
        body.evidenceId.length > 0 &&
        !body.evidenceId.includes(":") &&
        typeof body.nodeId === "string" &&
        body.nodeId.length > 0 &&
        struggleLevel !== undefined
        ? {
            action: body.action,
            evidenceId: body.evidenceId,
            nodeId: body.nodeId,
            struggleLevel,
          }
        : null;
    }
    case "interleaved": {
      const responses = parseInterleavedResponses(body.responses);
      const struggleLevel =
        body.struggleLevel === undefined || body.struggleLevel === null
          ? null
          : typeof body.struggleLevel === "number" && Number.isFinite(body.struggleLevel)
            ? body.struggleLevel
            : undefined;
      return typeof body.sessionId === "string" &&
        body.sessionId.length > 0 &&
        !body.sessionId.includes(":") &&
        responses &&
        struggleLevel !== undefined
        ? { action: body.action, sessionId: body.sessionId, responses, struggleLevel }
        : null;
    }
    case "found_island": {
      const eraId = parseEra(body.eraId);
      const authority = parseIslandFoundingAuthority(body.authority);
      return eraId && authority ? { action: body.action, eraId, authority } : null;
    }
    case "found_diagnostic_prefix":
      return { action: body.action };
    case "island_exam_response": {
      const eraId = parseEra(body.eraId);
      const response = parseIslandExamResponse(body.response);
      return eraId &&
        response &&
        typeof body.sessionId === "string" &&
        body.sessionId.length > 0 &&
        !body.sessionId.includes(":") &&
        typeof body.responseId === "string" &&
        body.responseId.length > 0 &&
        !body.responseId.includes(":") &&
        typeof body.sequence === "number" &&
        Number.isInteger(body.sequence) &&
        body.sequence >= 0
        ? {
            action: body.action,
            eraId,
            sessionId: body.sessionId,
            responseId: body.responseId,
            sequence: body.sequence,
            response,
          }
        : null;
    }
    case "land_island": {
      const eraId = parseEra(body.eraId);
      return eraId ? { action: body.action, eraId } : null;
    }
    case "civic_bootstrap": {
      const eraId = parseEra(body.eraId);
      return eraId ? { action: body.action, eraId } : null;
    }
    case "purchase_civic": {
      return typeof body.placementId === "string" && typeof body.building === "string"
        ? {
            action: body.action,
            placementId: body.placementId,
            building: body.building,
          }
        : null;
    }
    case "repair": {
      const subjectKind =
        body.subjectKind === "building" ||
        body.subjectKind === "ground" ||
        body.subjectKind === "civic"
          ? body.subjectKind
          : null;
      return typeof body.damageId === "string" &&
        typeof body.subject === "string" &&
        subjectKind
        ? {
            action: body.action,
            damageId: body.damageId,
            subjectKind,
            subject: body.subject,
          }
        : null;
    }
    default:
      return null;
  }
}

function distinctNodeIds(items: readonly { node_id: string }[]): string[] {
  return [...new Set(items.map((item) => item.node_id))];
}

/**
 * The learner-facing Town Hall widens to all practised skills only when the standing era
 * cannot furnish a two-skill mix. Re-derive that behavior from durable mastery here; importing
 * the browser helper would put an app behind the API and make the security boundary depend on
 * a UI implementation.
 */
function authorizedInterleavedPool(
  eraId: EraId,
  states: readonly NodeEvidenceRow[],
): {
  readonly items: typeof PRACTICE_AUTHORITY_ITEMS;
  readonly skillIds: readonly string[];
} {
  const practiced = new Set(
    states
      .filter((state) => state.mastery >= PRACTICED_MASTERY)
      .map((state) => state.node_id),
  );
  const eraNodes = new Set(getEraOrThrow(eraId).nodes);
  const own = PRACTICE_AUTHORITY_ITEMS.filter(
    (item) => practiced.has(item.node_id) && eraNodes.has(item.node_id),
  );
  const ownSkills = distinctNodeIds(own);
  if (ownSkills.length >= 2) {
    return { items: own, skillIds: ownSkills };
  }
  const widened = PRACTICE_AUTHORITY_ITEMS.filter((item) => practiced.has(item.node_id));
  return { items: widened, skillIds: distinctNodeIds(widened) };
}

function verifyInterleavedResponses(
  action: Extract<EconomyAction, { action: "interleaved" }>,
  pool: ReturnType<typeof authorizedInterleavedPool>,
): { itemIds: string[]; nodeIds: string[] } {
  if (pool.skillIds.length < 2 || action.responses.length !== pool.skillIds.length) {
    throw new EconomyAuthorityError(403, "interleaved_evidence_invalid");
  }
  const allowedItems = new Set(pool.items.map((item) => item.item_version_id));
  const answeredNodes = new Set<string>();
  const itemIds: string[] = [];
  const nodeIds: string[] = [];
  for (const response of action.responses) {
    const item = PRACTICE_AUTHORITY_ITEMS_BY_ID.get(response.itemVersionId);
    if (
      item === undefined ||
      !allowedItems.has(item.item_version_id) ||
      answeredNodes.has(item.node_id)
    ) {
      throw new EconomyAuthorityError(403, "interleaved_evidence_invalid");
    }
    const checked = practiceAuthorityChecker({
      raw_answer: response.rawAnswer,
      item_version_id: item.item_version_id,
      equivalence_checker_version: checkerVersionForPracticeItem(item),
    });
    if (checked.status !== "correct") {
      throw new EconomyAuthorityError(403, "interleaved_evidence_invalid");
    }
    answeredNodes.add(item.node_id);
    itemIds.push(item.item_version_id);
    nodeIds.push(item.node_id);
  }
  if (pool.skillIds.some((nodeId) => !answeredNodes.has(nodeId))) {
    throw new EconomyAuthorityError(403, "interleaved_evidence_invalid");
  }
  return { itemIds, nodeIds };
}

interface VerifiedIslandUnlock {
  readonly kind: "exam" | "diagnostic";
  readonly outgoing: EraId | null;
  readonly sessionId: string | null;
  readonly target: number | null;
}

function jsonStringArray(value: unknown): string[] | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function jsonStringRecord(value: unknown): Record<string, string> | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      Object.values(parsed).every((entry) => typeof entry === "string")
      ? (parsed as Record<string, string>)
      : null;
  } catch {
    return null;
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function authorizedIslandExamPool(outgoing: EraId) {
  const era = getEraOrThrow(outgoing);
  const allowedNodes = new Set(era.nodes);
  const items = PRACTICE_AUTHORITY_ITEMS.filter((item) => allowedNodes.has(item.node_id));
  const represented = new Set(items.map((item) => item.node_id));
  if (era.nodes.some((nodeId) => !represented.has(nodeId))) {
    throw new EconomyAuthorityError(403, "island_exam_evidence_invalid");
  }

  const allowedItems = new Set(items.map((item) => item.item_version_id));
  const itemCountByNode = new Map<string, number>();
  for (const item of items) {
    itemCountByNode.set(item.node_id, (itemCountByNode.get(item.node_id) ?? 0) + 1);
  }
  return { era, items, allowedItems, itemCountByNode };
}

interface VerifiedIslandExamResponse {
  readonly itemVersionId: string;
  readonly nodeId: string;
  readonly outcome: "answer" | "skip";
  readonly rawAnswer: unknown;
  readonly checkerVersion: number | null;
  readonly correct: boolean;
  readonly delta: 1 | -1;
  readonly score: number;
  readonly passed: boolean;
  readonly cycleNodeIds: readonly string[];
  readonly lastNodeId: string;
  readonly lastItemByNode: Readonly<Record<string, string>>;
}

function verifyIslandExamResponse(
  session: IslandUnlockExamSessionRow,
  response: IslandExamResponse,
): VerifiedIslandExamResponse {
  const pool = authorizedIslandExamPool(session.outgoing_era);
  if (
    session.destination_era !==
      ERA_SEQUENCE[ERA_SEQUENCE.findIndex((era) => era.id === session.outgoing_era) + 1]
        ?.id ||
    session.target_score !== islandUnlockTarget(pool.era.nodes.length)
  ) {
    throw new EconomyAuthorityError(403, "island_exam_evidence_invalid");
  }
  const item = PRACTICE_AUTHORITY_ITEMS_BY_ID.get(response.itemVersionId);
  const cycleValues = jsonStringArray(session.cycle_node_ids);
  const lastItems = jsonStringRecord(session.last_item_by_node);
  if (
    item === undefined ||
    !pool.allowedItems.has(item.item_version_id) ||
    cycleValues === null ||
    lastItems === null ||
    new Set(cycleValues).size !== cycleValues.length ||
    cycleValues.some((nodeId) => !pool.era.nodes.includes(nodeId))
  ) {
    throw new EconomyAuthorityError(403, "island_exam_evidence_invalid");
  }
  const cycle = new Set(cycleValues.length === pool.era.nodes.length ? [] : cycleValues);
  if (
    cycle.has(item.node_id) ||
    (pool.era.nodes.length > 1 && item.node_id === session.last_node_id) ||
    ((pool.itemCountByNode.get(item.node_id) ?? 0) > 1 &&
      lastItems[item.node_id] === item.item_version_id)
  ) {
    throw new EconomyAuthorityError(403, "island_exam_evidence_invalid");
  }
  cycle.add(item.node_id);
  const checkerVersion =
    response.outcome === "answer" ? checkerVersionForPracticeItem(item) : null;
  const checked =
    response.outcome === "answer"
      ? practiceAuthorityChecker({
          raw_answer: response.rawAnswer,
          item_version_id: item.item_version_id,
          equivalence_checker_version: checkerVersion as number,
        })
      : null;
  if (checked !== null && checked.status !== "correct" && checked.status !== "incorrect") {
    throw new EconomyAuthorityError(403, "island_exam_evidence_invalid");
  }
  const correct = checked?.status === "correct";
  const delta = correct ? 1 : -1;
  const score = correct
    ? Math.min(session.target_score, session.score + 1)
    : Math.max(0, session.score - 1);
  const lastItemByNode = { ...lastItems, [item.node_id]: item.item_version_id };
  return {
    itemVersionId: item.item_version_id,
    nodeId: item.node_id,
    outcome: response.outcome,
    rawAnswer: response.outcome === "answer" ? response.rawAnswer : null,
    checkerVersion,
    correct,
    delta,
    score,
    passed: score === session.target_score,
    cycleNodeIds: [...cycle],
    lastNodeId: item.node_id,
    lastItemByNode,
  };
}

function sameIslandExamResponse(
  stored: IslandUnlockExamResponseRow,
  action: Extract<EconomyAction, { action: "island_exam_response" }>,
): boolean {
  let storedRawAnswer = stored.raw_answer;
  if (typeof storedRawAnswer === "string") {
    try {
      storedRawAnswer = JSON.parse(storedRawAnswer);
    } catch {
      return false;
    }
  }
  return (
    stored.response_id === action.responseId &&
    stored.sequence === action.sequence &&
    stored.item_version_id === action.response.itemVersionId &&
    stored.outcome === action.response.outcome &&
    (stored.outcome === "skip" ||
      (action.response.outcome === "answer" &&
        canonicalJson(storedRawAnswer) === canonicalJson(action.response.rawAnswer)))
  );
}

async function loadIslandExamSession(
  tx: DataApiExecutor,
  studentId: UUID,
  sessionId: string,
): Promise<IslandUnlockExamSessionRow | null> {
  const rows = await tx.query<IslandUnlockExamSessionRow>(
    `select session_id, outgoing_era, destination_era, score, target_score,
            response_count, cycle_node_ids, last_node_id, last_item_by_node,
            expires_at, passed_at
       from public.island_unlock_exam_session
      where student_id = :sid::uuid and session_id = :session
      for update`,
    { sid: studentId, session: sessionId },
  );
  return rows[0] ?? null;
}

async function loadIslandExamResponse(
  tx: DataApiExecutor,
  studentId: UUID,
  sessionId: string,
  responseId: string,
  sequence: number,
): Promise<IslandUnlockExamResponseRow | null> {
  const rows = await tx.query<IslandUnlockExamResponseRow>(
    `select response_id, sequence, item_version_id, node_id, outcome, raw_answer,
            checker_version, correct, delta, score_after
       from public.island_unlock_exam_response
      where student_id = :sid::uuid and session_id = :session
        and (response_id = :response or sequence = :sequence)`,
    { sid: studentId, session: sessionId, response: responseId, sequence },
  );
  return rows[0] ?? null;
}

async function createIslandExamSession(
  tx: DataApiExecutor,
  studentId: UUID,
  action: Extract<EconomyAction, { action: "island_exam_response" }>,
  nowMs: number,
): Promise<IslandUnlockExamSessionRow> {
  const incomingIndex = ERA_SEQUENCE.findIndex((era) => era.id === action.eraId);
  const outgoing = incomingIndex > 0 ? ERA_SEQUENCE[incomingIndex - 1] : undefined;
  if (outgoing === undefined) {
    throw new EconomyAuthorityError(403, "founding_not_eligible");
  }
  // Aurora Data API permits only one in-flight statement per transaction id.
  const founded = await tx.query<IslandAuthorityRow>(
    `select island_era from public.city_island_state
      where student_id = :sid::uuid and island_era = :island::public.city_era`,
    { sid: studentId, island: outgoing.id },
  );
  const states = await nodeEvidence(tx, studentId);
  const standing = await currentIsland(tx, studentId);
  const mastered = states.filter(
    (state) =>
      outgoing.nodes.includes(state.node_id) && state.mastery >= ISLAND_UNLOCK_MASTERY_GATE,
  ).length;
  if (
    founded.length !== 1 ||
    standing !== outgoing.id ||
    mastered < islandUnlockMasteryRequirement(outgoing.nodes.length)
  ) {
    throw new EconomyAuthorityError(403, "founding_not_eligible");
  }
  // Refuse before writing a session if the server cannot serve every outgoing skill.
  authorizedIslandExamPool(outgoing.id);
  const target = islandUnlockTarget(outgoing.nodes.length);
  const expiresAt = new Date(nowMs + 30 * 24 * 60 * 60 * 1_000).toISOString();
  await tx.execute(ECONOMY_AUTHORITY_STATEMENTS.createIslandExamSession, {
    sid: studentId,
    session: action.sessionId,
    outgoing: outgoing.id,
    destination: action.eraId,
    target,
    expires: expiresAt,
  });
  const stored = await loadIslandExamSession(tx, studentId, action.sessionId);
  if (stored === null) {
    throw new EconomyAuthorityError(500, "island_exam_session_missing");
  }
  return stored;
}

async function applyIslandFounding(
  tx: DataApiExecutor,
  studentId: UUID,
  view: LedgerView,
  eraId: EraId,
  verified: VerifiedIslandUnlock,
  nowMs: number,
) {
  await tx.execute(ECONOMY_AUTHORITY_STATEMENTS.recordIslandUnlockAuthority, {
    sid: studentId,
    island: eraId,
    kind: verified.kind,
    outgoing: verified.outgoing,
    session: verified.sessionId,
    target: verified.target,
  });
  await tx.execute(ECONOMY_AUTHORITY_STATEMENTS.foundIsland, {
    sid: studentId,
    island: eraId,
  });
  await tx.execute(ECONOMY_AUTHORITY_STATEMENTS.foundTownHall, {
    sid: studentId,
    island: eraId,
  });
  const result = applyGrant(view, islandFoundingGrant({ studentId, eraId, nowMs }));
  const inserted = await appendEconomyRows(tx, studentId, result.rows);
  const next = inserted === result.rows.length ? result : { ...result, applied: false };
  return {
    applied: next.applied,
    materials: next.materials,
    grantedMaterials: next.applied ? next.grantedMaterials : {},
  };
}

function repairCost(row: DamageAuthorityRow): number {
  if (row.subject_kind === "civic") {
    const civic = parseCivicPlacementId(row.subject);
    return civic === null || civic.legacy
      ? 0
      : civicLiftSuspensionCost(civic.row, row.island_era);
  }
  const prices = hardWinterRepairPrices();
  return row.subject_kind === "building" ? prices.per_building : prices.per_cell;
}

export async function applyEconomyAction(
  db: DataApiClient,
  studentId: UUID,
  action: EconomyAction,
): Promise<unknown> {
  return db.withTransaction(async (tx) => {
    const entries = await loadEconomyLedger(tx, studentId);
    const view: LedgerView = { entries };
    const nowMs = Date.now();

    if (action.action === "lesson_complete") {
      const evidence = (await nodeEvidence(tx, studentId, action.nodeId))[0];
      if (
        evidence === undefined ||
        evidence.mastery < LESSON_GRANT_MASTERY_BAR ||
        evidence.last_practiced_at === null
      ) {
        throw new EconomyAuthorityError(403, "lesson_evidence_missing");
      }
      if (hasLessonCompletionGrant(view, action.nodeId)) {
        return {
          applied: false,
          materials: computeMaterialBalances(view),
          grantedMaterials: {},
        };
      }
      const result = applyGrant(
        view,
        lessonCompleteGrant({ studentId, nodeId: action.nodeId, nowMs }),
      );
      const inserted = await appendEconomyRows(tx, studentId, result.rows);
      const next = inserted === result.rows.length ? result : { ...result, applied: false };
      return {
        applied: next.applied,
        materials: next.materials,
        grantedMaterials: next.applied ? next.grantedMaterials : {},
      };
    }

    if (action.action === "practice_complete") {
      const evidence = await practiceEvidence(
        tx,
        studentId,
        action.evidenceId,
        action.nodeId,
      );
      if (evidence === null) {
        throw new EconomyAuthorityError(403, "practice_evidence_missing");
      }
      const selected = practiceSetGrant(view, {
        studentId,
        evidenceId: evidence.evidence_id,
        nodeId: evidence.node_id,
        mastery: evidence.mastery,
        nowMs,
        struggleLevel: action.struggleLevel,
      });
      const result = applyGrant(view, selected.grant);
      const inserted = await appendEconomyRows(tx, studentId, result.rows);
      const applied = result.applied && inserted === result.rows.length;
      const material = materialForEra(selected.rewardEra);
      const priorPaidSets =
        material === null ? 0 : countInterleavedGrants(view, material.id);
      const paidSets =
        priorPaidSets +
        (applied && selected.rewardKind === "repeat_practice" && result.rows.length > 0
          ? 1
          : 0);
      return {
        applied,
        materials: result.materials,
        grantedMaterials: applied ? result.grantedMaterials : {},
        eventId: selected.grant.eventId,
        rewardEra: selected.rewardEra,
        groupKey: selected.groupKey,
        rewardKind: selected.rewardKind,
        paidSets,
        setsRemaining: drillSetsRemaining(paidSets),
        setsBound: DRILL_PAID_SETS_PER_ERA,
      };
    }

    if (action.action === "land_island") {
      const island = await tx.query<IslandAuthorityRow>(
        `select island_era from public.city_island_state
          where student_id = :sid::uuid and island_era = :island::public.city_era`,
        { sid: studentId, island: action.eraId },
      );
      const hall = await tx.query<{ placement_id: string }>(
        `select placement_id from public.city_placement
          where student_id = :sid::uuid
            and island_era = :island::public.city_era
            and placement_id = 'town-hall'
            and kind = 'town_hall'::public.city_placement_kind`,
        { sid: studentId, island: action.eraId },
      );
      if (island.length !== 1 || hall.length !== 1) {
        throw new EconomyAuthorityError(403, "island_not_founded");
      }
      const updated = await tx.execute(ECONOMY_AUTHORITY_STATEMENTS.landIsland, {
        sid: studentId,
        island: action.eraId,
      });
      if (updated !== 1) {
        throw new EconomyAuthorityError(409, "city_state_missing");
      }
      return { landed: true, currentIsland: action.eraId };
    }

    if (action.action === "civic_bootstrap") {
      // Same precondition as `land_island`: the grant is an onboarding top-up for an
      // island that already exists, not a way to seed one, so it requires the same
      // town-hall evidence rather than trusting an era id the client could send early.
      const hall = await tx.query<{ placement_id: string }>(
        `select placement_id from public.city_placement
          where student_id = :sid::uuid
            and island_era = :island::public.city_era
            and placement_id = 'town-hall'
            and kind = 'town_hall'::public.city_placement_kind`,
        { sid: studentId, island: action.eraId },
      );
      if (hall.length !== 1) {
        throw new EconomyAuthorityError(403, "island_not_founded");
      }
      const result = applyGrant(
        view,
        civicBootstrapGrant({ studentId, eraId: action.eraId, nowMs }),
      );
      const inserted = await appendEconomyRows(tx, studentId, result.rows);
      const next = inserted === result.rows.length ? result : { ...result, applied: false };
      return {
        applied: next.applied,
        materials: next.materials,
        grantedMaterials: next.applied ? next.grantedMaterials : {},
      };
    }

    if (action.action === "island_exam_response") {
      let session = await loadIslandExamSession(tx, studentId, action.sessionId);
      if (session === null) {
        session = await createIslandExamSession(tx, studentId, action, nowMs);
      }
      if (session.destination_era !== action.eraId) {
        throw new EconomyAuthorityError(403, "island_exam_session_invalid");
      }
      if (session.passed_at === null && Date.parse(session.expires_at) <= nowMs) {
        throw new EconomyAuthorityError(410, "island_exam_session_expired");
      }
      const existing = await loadIslandExamResponse(
        tx,
        studentId,
        action.sessionId,
        action.responseId,
        action.sequence,
      );
      if (existing !== null) {
        if (!sameIslandExamResponse(existing, action)) {
          throw new EconomyAuthorityError(409, "island_exam_response_tampered");
        }
        return {
          applied: false,
          materials: computeMaterialBalances(view),
          grantedMaterials: {},
          score: session.score,
          target: session.target_score,
          delta: existing.delta,
          passed: session.passed_at !== null,
          responseCount: session.response_count,
        };
      }
      if (session.passed_at !== null) {
        throw new EconomyAuthorityError(409, "island_exam_already_passed");
      }
      if (action.sequence !== session.response_count) {
        throw new EconomyAuthorityError(409, "island_exam_response_out_of_order");
      }
      const verified = verifyIslandExamResponse(session, action.response);
      await tx.execute(ECONOMY_AUTHORITY_STATEMENTS.recordIslandExamResponse, {
        sid: studentId,
        session: action.sessionId,
        response: action.responseId,
        sequence: action.sequence,
        item: verified.itemVersionId,
        node: verified.nodeId,
        outcome: verified.outcome,
        raw: verified.outcome === "answer" ? json(verified.rawAnswer) : null,
        checker: verified.checkerVersion,
        correct: verified.correct,
        delta: verified.delta,
        score: verified.score,
      });
      await tx.execute(ECONOMY_AUTHORITY_STATEMENTS.updateIslandExamSession, {
        sid: studentId,
        session: action.sessionId,
        score: verified.score,
        count: session.response_count + 1,
        cycle: json(verified.cycleNodeIds),
        last_node: verified.lastNodeId,
        last_items: json(verified.lastItemByNode),
        passed: verified.passed,
      });
      const founding = verified.passed
        ? await applyIslandFounding(
            tx,
            studentId,
            view,
            action.eraId,
            {
              kind: "exam",
              outgoing: session.outgoing_era,
              sessionId: session.session_id,
              target: session.target_score,
            },
            nowMs,
          )
        : {
            applied: false,
            materials: computeMaterialBalances(view),
            grantedMaterials: {},
          };
      return {
        ...founding,
        score: verified.score,
        target: session.target_score,
        delta: verified.delta,
        passed: verified.passed,
        responseCount: session.response_count + 1,
      };
    }

    if (action.action === "found_diagnostic_prefix") {
      const states = await nodeEvidence(tx, studentId);
      const placement = diagnosticEraPlacement(
        states.map((state) => ({
          node_id: state.node_id,
          placement_estimate: state.placement_estimate,
        })),
      );
      const verified: VerifiedIslandUnlock = {
        kind: "diagnostic",
        outgoing: null,
        sessionId: null,
        target: null,
      };
      for (const eraId of placement.unlockedPrefix) {
        await applyIslandFounding(tx, studentId, view, eraId, verified, nowMs);
      }
      const settled = await loadEconomyLedger(tx, studentId);
      return {
        unlockedEras: placement.unlockedPrefix,
        destinationEra: placement.destinationEra,
        allMastered: placement.allMastered,
        materials: computeMaterialBalances({ entries: settled }),
      };
    }

    if (action.action === "found_island") {
      const incomingIndex = ERA_SEQUENCE.findIndex((era) => era.id === action.eraId);
      const previous = incomingIndex > 0 ? ERA_SEQUENCE[incomingIndex - 1] : undefined;
      if (previous === undefined) {
        throw new EconomyAuthorityError(403, "founding_not_eligible");
      }
      const founded = await tx.query<IslandAuthorityRow>(
        `select island_era from public.city_island_state
          where student_id = :sid::uuid and island_era = :island::public.city_era`,
        { sid: studentId, island: previous.id },
      );
      const states = await nodeEvidence(tx, studentId);
      if (founded.length !== 1) {
        throw new EconomyAuthorityError(403, "founding_not_eligible");
      }
      let verified: VerifiedIslandUnlock;
      if (action.authority.source === "exam") {
        const session = await loadIslandExamSession(
          tx,
          studentId,
          action.authority.sessionId,
        );
        if (
          session === null ||
          session.outgoing_era !== previous.id ||
          session.destination_era !== action.eraId ||
          session.target_score !== islandUnlockTarget(previous.nodes.length) ||
          session.score !== session.target_score ||
          session.passed_at === null
        ) {
          throw new EconomyAuthorityError(403, "founding_not_eligible");
        }
        verified = {
          kind: "exam",
          outgoing: previous.id,
          sessionId: session.session_id,
          target: session.target_score,
        };
      } else {
        const diagnosticPrefix = diagnosticEraPlacement(
          states.map((state) => ({
            node_id: state.node_id,
            placement_estimate: state.placement_estimate,
          })),
        );
        if (!diagnosticPrefix.unlockedPrefix.includes(action.eraId)) {
          throw new EconomyAuthorityError(403, "founding_not_eligible");
        }
        verified = {
          kind: "diagnostic",
          outgoing: null,
          sessionId: null,
          target: null,
        };
      }
      return applyIslandFounding(tx, studentId, view, action.eraId, verified, nowMs);
    }

    if (action.action === "interleaved") {
      const eraId = await currentIsland(tx, studentId);
      const pool = authorizedInterleavedPool(eraId, await nodeEvidence(tx, studentId));
      const verified = verifyInterleavedResponses(action, pool);
      await tx.execute(ECONOMY_AUTHORITY_STATEMENTS.recordInterleavedClear, {
        sid: studentId,
        session: action.sessionId,
        era: eraId,
        items: json(verified.itemIds),
        nodes: json(verified.nodeIds),
        count: verified.itemIds.length,
      });
      const material = materialForEra(eraId);
      const priorPaidSets =
        material === null ? 0 : countInterleavedGrants(view, material.id);
      const result = applyGrant(
        view,
        interleavedGrant({
          studentId,
          sessionId: action.sessionId,
          currentEra: eraId,
          priorPaidSets,
          nowMs,
          struggleLevel: action.struggleLevel,
        }),
      );
      const inserted = await appendEconomyRows(tx, studentId, result.rows);
      const applied = result.applied && inserted === result.rows.length;
      const paidSets = priorPaidSets + (applied && result.rows.length > 0 ? 1 : 0);
      return {
        applied,
        materials: result.materials,
        grantedMaterials: applied ? result.grantedMaterials : {},
        paidSets,
        setsRemaining: drillSetsRemaining(paidSets),
        setsBound: DRILL_PAID_SETS_PER_ERA,
      };
    }

    if (action.action === "purchase_civic") {
      const eraId = await currentIsland(tx, studentId);
      const roads = await roadSpend(tx, studentId, eraId);
      const result = applyCivicPurchase(view, {
        studentId,
        placementId: action.placementId,
        building: action.building,
        currentEra: eraId,
        nowMs,
      });
      const available = wallet(view, eraId, roads).spendable;
      if (result.status === "spent" && result.cost > available) {
        return {
          status: "insufficient_material",
          spendable: available,
          cost: 0,
          building: null,
        };
      }
      await appendEconomyRows(tx, studentId, result.rows);
      return {
        status: result.status,
        spendable: Math.max(0, result.balance - roads),
        cost: result.cost,
        building: result.building,
      };
    }

    const damage = await tx.query<DamageAuthorityRow>(
      `select island_era, damage_id, subject_kind, subject
        from public.city_crisis_damage
        where student_id = :sid::uuid
          and damage_id = :damage
          and subject_kind = :kind::public.crisis_damage_subject
          and subject = :subject`,
      {
        sid: studentId,
        damage: action.damageId,
        kind: action.subjectKind,
        subject: action.subject,
      },
    );
    const target = damage[0];
    if (target === undefined) {
      const eventId = repairEventIdFor(action);
      const paid = entries.find(
        (entry) => entry.event_id === eventId && entry.kind === "spend",
      );
      if (paid === undefined) {
        throw new EconomyAuthorityError(404, "damage_not_found");
      }
      const eraId = ERA_SEQUENCE.find(
        (era) => materialForEra(era.id)?.id === paid.resource_type,
      )?.id;
      const roads = eraId === undefined ? 0 : await roadSpend(tx, studentId, eraId);
      return {
        status: "already_spent",
        spendable: Math.max(
          0,
          (computeMaterialBalances(view)[paid.resource_type] ?? 0) - roads,
        ),
        cost: paid.amount,
      };
    }
    const material = materialForEra(target.island_era);
    if (material === null) {
      return { status: "era_material_unauthored", spendable: 0, cost: 0 };
    }
    const cost = repairCost(target);
    if (cost <= 0) {
      throw new EconomyAuthorityError(409, "damage_price_unavailable");
    }
    const roads = await roadSpend(tx, studentId, target.island_era);
    const available = wallet(view, target.island_era, roads).spendable;
    if (available < cost) {
      return { status: "insufficient_material", spendable: available, cost: 0 };
    }
    const result = applyRepairSpend(view, {
      studentId,
      damageId: target.damage_id,
      subjectKind: target.subject_kind,
      subject: target.subject,
      material: material.id,
      cost,
      nowMs,
    });
    await appendEconomyRows(tx, studentId, result.rows);
    if (result.status === "spent" || result.status === "already_spent") {
      await tx.execute(ECONOMY_AUTHORITY_STATEMENTS.clearRepairedDamage, {
        sid: studentId,
        island: target.island_era,
        damage: target.damage_id,
        kind: target.subject_kind,
        subject: target.subject,
      });
    }
    return {
      status: result.status,
      spendable: Math.max(0, result.balance - roads),
      cost: result.status === "spent" || result.status === "already_spent" ? cost : 0,
    };
  });
}

export function createAuroraEconomyService(deps: {
  db: DataApiClient;
  authenticate: DiagnosticAuthenticator;
}): EconomyService {
  async function authed(
    token: string | null,
    run: (studentId: UUID) => Promise<unknown>,
  ): Promise<DiagnosticServerResponse> {
    const identity = await deps.authenticate(token);
    if (!identity) {
      return { status: 401, body: { error: "unauthorized" } };
    }
    try {
      return { status: 200, body: await run(identity.student_id) };
    } catch (error) {
      if (error instanceof EconomyAuthorityError) {
        return { status: error.status, body: { error: error.code } };
      }
      return { status: 500, body: { error: describeWriteFailure(error) } };
    }
  }

  return {
    read(token, era) {
      const eraId = parseEra(era);
      if (eraId === null) {
        return Promise.resolve({ status: 400, body: { error: "era must be authored" } });
      }
      return authed(token, async (studentId) => {
        const [entries, interleavedClearIds, roads] = await Promise.all([
          loadEconomyLedger(deps.db, studentId),
          loadInterleavedClearIds(deps.db, studentId),
          roadSpend(deps.db, studentId, eraId),
        ]);
        return {
          wallet: wallet({ entries }, eraId, roads),
          appliedEventIds: [...new Set(entries.map((entry) => entry.event_id))],
          interleavedClearIds,
        };
      });
    },
    act(token, body) {
      const action = parseAction(body);
      if (action === null) {
        return Promise.resolve({
          status: 400,
          body: { error: "the economy action is malformed or unsupported" },
        });
      }
      return authed(token, (studentId) => applyEconomyAction(deps.db, studentId, action));
    },
  };
}
