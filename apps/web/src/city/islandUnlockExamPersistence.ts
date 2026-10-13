import { islandUnlockTarget } from "@cr/game";
import { type EraId, getEraNodes } from "@cr/skill-graph";

import type { InterleavedSchedulerSnapshot } from "../lessons/infiniteScheduler";
import { type BrowserStorage, runtimeStorage } from "../storage/runtimeStorage";
import { isEraId, nextEraId } from "./eraState";
import type { IslandUnlockExamResponse } from "./islandUnlockAuthority";

export const ISLAND_UNLOCK_EXAM_SCHEMA_VERSION = 2;
export const ISLAND_UNLOCK_EXAM_KEY_PREFIX = "cr.city.islandUnlockExam.v2";
export const LEGACY_CEREMONY_KEY_PREFIX = "cr.city.ceremony.beats.v1.";

export type IslandUnlockRuntimePhase = "exam" | "reveal" | "choice" | "complete";
export type IslandUnlockResolvedOutcome = "correct" | "wrong" | "skip" | null;

export interface IslandUnlockExamRecord {
  readonly version: typeof ISLAND_UNLOCK_EXAM_SCHEMA_VERSION;
  readonly eraId: EraId;
  readonly destinationEraId: EraId;
  readonly phase: IslandUnlockRuntimePhase;
  readonly score: number;
  readonly target: number;
  readonly currentItemVersionId: string | null;
  readonly scheduler: InterleavedSchedulerSnapshot | null;
  readonly resolvedOutcome: IslandUnlockResolvedOutcome;
  readonly sessionId: string;
  readonly responseCount: number;
  readonly pendingResponse: {
    readonly responseId: string;
    readonly sequence: number;
    readonly response: IslandUnlockExamResponse;
  } | null;
}

export function islandUnlockExamStorageKey(eraId: EraId): string {
  return `${ISLAND_UNLOCK_EXAM_KEY_PREFIX}.${eraId}`;
}

function defaultStorage(storage: BrowserStorage | null | undefined): BrowserStorage | null {
  return storage === undefined ? runtimeStorage() : storage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPhase(value: unknown): value is IslandUnlockRuntimePhase {
  return (
    value === "exam" || value === "reveal" || value === "choice" || value === "complete"
  );
}

function isResolvedOutcome(value: unknown): value is IslandUnlockResolvedOutcome {
  return value === null || value === "correct" || value === "wrong" || value === "skip";
}

function isSchedulerSnapshot(value: unknown): value is InterleavedSchedulerSnapshot {
  return (
    isRecord(value) &&
    value.version === 1 &&
    Array.isArray(value.remainingNodeIds) &&
    value.remainingNodeIds.every((nodeId) => typeof nodeId === "string") &&
    (value.lastNodeId === null || typeof value.lastNodeId === "string") &&
    Array.isArray(value.lastItemByNode) &&
    value.lastItemByNode.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === "string" &&
        typeof entry[1] === "string",
    )
  );
}

function isExamResponse(value: unknown): value is IslandUnlockExamResponse {
  if (!isRecord(value) || typeof value.itemVersionId !== "string") {
    return false;
  }
  return (
    value.outcome === "skip" ||
    (value.outcome === "answer" && Object.hasOwn(value, "rawAnswer"))
  );
}

export function migrateLegacyCeremonyData(
  storage: BrowserStorage | null,
): readonly string[] {
  if (storage === null) {
    return [];
  }
  const removed: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(LEGACY_CEREMONY_KEY_PREFIX)) {
      removed.push(key);
    }
  }
  for (const key of removed) {
    storage.removeItem(key);
  }
  return removed;
}

export function loadIslandUnlockExam(
  eraId: EraId,
  storage?: BrowserStorage | null,
): IslandUnlockExamRecord | null {
  const targetStorage = defaultStorage(storage);
  migrateLegacyCeremonyData(targetStorage);
  const key = islandUnlockExamStorageKey(eraId);
  const raw = targetStorage?.getItem(key);
  if (raw === null || raw === undefined) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    targetStorage?.removeItem(key);
    return null;
  }
  const destination = nextEraId(eraId);
  const target = islandUnlockTarget(getEraNodes(eraId).length);
  if (
    !isRecord(value) ||
    value.version !== ISLAND_UNLOCK_EXAM_SCHEMA_VERSION ||
    value.eraId !== eraId ||
    typeof value.destinationEraId !== "string" ||
    !isEraId(value.destinationEraId) ||
    value.destinationEraId !== destination ||
    !isPhase(value.phase) ||
    typeof value.score !== "number" ||
    !Number.isInteger(value.score) ||
    value.score < 0 ||
    value.score > target ||
    value.target !== target ||
    !isResolvedOutcome(value.resolvedOutcome) ||
    typeof value.sessionId !== "string" ||
    value.sessionId.length === 0 ||
    value.sessionId.includes(":") ||
    typeof value.responseCount !== "number" ||
    !Number.isInteger(value.responseCount) ||
    value.responseCount < 0 ||
    (value.pendingResponse !== null &&
      (!isRecord(value.pendingResponse) ||
        typeof value.pendingResponse.responseId !== "string" ||
        value.pendingResponse.responseId.length === 0 ||
        typeof value.pendingResponse.sequence !== "number" ||
        !Number.isInteger(value.pendingResponse.sequence) ||
        value.pendingResponse.sequence !== value.responseCount ||
        !isExamResponse(value.pendingResponse.response))) ||
    (value.currentItemVersionId !== null &&
      typeof value.currentItemVersionId !== "string") ||
    (value.scheduler !== null && !isSchedulerSnapshot(value.scheduler))
  ) {
    targetStorage?.removeItem(key);
    return null;
  }
  return value as unknown as IslandUnlockExamRecord;
}

export function saveIslandUnlockExam(
  record: IslandUnlockExamRecord,
  storage?: BrowserStorage | null,
): void {
  defaultStorage(storage)?.setItem(
    islandUnlockExamStorageKey(record.eraId),
    JSON.stringify(record),
  );
}

export function clearIslandUnlockExam(eraId: EraId, storage?: BrowserStorage | null): void {
  defaultStorage(storage)?.removeItem(islandUnlockExamStorageKey(eraId));
}
