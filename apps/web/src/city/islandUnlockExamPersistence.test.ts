import { ERA_SEQUENCE } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { ERA_STATE_STORAGE_KEY } from "./eraState";
import {
  type IslandUnlockExamRecord,
  LEGACY_CEREMONY_KEY_PREFIX,
  clearIslandUnlockExam,
  islandUnlockExamStorageKey,
  loadIslandUnlockExam,
  migrateLegacyCeremonyData,
  saveIslandUnlockExam,
} from "./islandUnlockExamPersistence";
import { demoStorage, type BrowserStorage } from "../storage/runtimeStorage";

class MemoryStorage implements BrowserStorage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const CURRENT = ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number];
const DESTINATION = ERA_SEQUENCE[1] as (typeof ERA_SEQUENCE)[number];

function record(phase: IslandUnlockExamRecord["phase"]): IslandUnlockExamRecord {
  return {
    version: 2,
    eraId: CURRENT.id,
    destinationEraId: DESTINATION.id,
    phase,
    score: phase === "exam" ? 7 : 12,
    target: 12,
    currentItemVersionId: phase === "exam" ? "NUM.S:resume-item" : null,
    resolvedOutcome: null,
    sessionId: "persistence-test-session",
    responseCount: 0,
    pendingResponse: null,
    scheduler:
      phase === "exam"
        ? {
            version: 1,
            remainingNodeIds: CURRENT.nodes.slice(2),
            lastNodeId: CURRENT.nodes[1] as string,
            lastItemByNode: [[CURRENT.nodes[1] as string, "NUM.F:last-item"]],
          }
        : null,
  };
}

describe("versioned unlock exam resume", () => {
  it.each(["exam", "reveal", "choice", "complete"] as const)(
    "round-trips the %s phase so refresh resumes instead of replaying",
    (phase) => {
      const storage = new MemoryStorage();
      const saved = record(phase);
      saveIslandUnlockExam(saved, storage);

      expect(loadIslandUnlockExam(CURRENT.id, storage)).toEqual(saved);
    },
  );

  it("keeps the exact current question and remaining shuffled cycle in progress", () => {
    const storage = new MemoryStorage();
    saveIslandUnlockExam(record("exam"), storage);

    const resumed = loadIslandUnlockExam(CURRENT.id, storage);
    expect(resumed?.currentItemVersionId).toBe("NUM.S:resume-item");
    expect(resumed?.scheduler?.remainingNodeIds).toEqual(CURRENT.nodes.slice(2));
    expect(resumed?.score).toBe(7);
  });

  it("refuses a corrupt or cross-era record instead of widening progression", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      islandUnlockExamStorageKey(CURRENT.id),
      JSON.stringify({ ...record("exam"), eraId: DESTINATION.id }),
    );
    expect(loadIslandUnlockExam(CURRENT.id, storage)).toBeNull();

    storage.setItem(islandUnlockExamStorageKey(CURRENT.id), "{bad json");
    expect(loadIslandUnlockExam(CURRENT.id, storage)).toBeNull();
  });

  it("clears only this exam record", () => {
    const storage = new MemoryStorage();
    const unrelated = "cr.infinitePractice.bestStreak.era.prehistoric";
    storage.setItem(unrelated, "19");
    saveIslandUnlockExam(record("exam"), storage);

    clearIslandUnlockExam(CURRENT.id, storage);
    expect(loadIslandUnlockExam(CURRENT.id, storage)).toBeNull();
    expect(storage.getItem(unrelated)).toBe("19");
  });
});

describe("legacy four-beat migration boundary", () => {
  it("deletes every legacy beat key without changing standing era or unrelated city state", () => {
    const storage = new MemoryStorage();
    const standing = ERA_SEQUENCE[4]?.id as string;
    const preserved = new Map([
      [ERA_STATE_STORAGE_KEY, standing],
      ["cr.archipelago.v1.dev", '{"version":1,"islands":[]}'],
      ["cr.city.devSession.v7.dev", '{"placements":["kept"]}'],
      ["cr.economy.v3.dev", '{"materials":{"stone":80}}'],
      ["cr.infinitePractice.bestStreak.era.prehistoric", "13"],
      ["cr.completion.ceremony.v1", "complete"],
    ]);
    for (const [key, value] of preserved) {
      storage.setItem(key, value);
    }
    for (const era of ERA_SEQUENCE.slice(0, 3)) {
      storage.setItem(`${LEGACY_CEREMONY_KEY_PREFIX}${era.id}`, "4");
    }

    const removed = migrateLegacyCeremonyData(storage);

    expect([...removed].sort()).toEqual(
      ERA_SEQUENCE.slice(0, 3)
        .map((era) => `${LEGACY_CEREMONY_KEY_PREFIX}${era.id}`)
        .sort(),
    );
    for (const [key, value] of preserved) {
      expect(storage.getItem(key), key).toBe(value);
    }
    expect(storage.getItem(ERA_STATE_STORAGE_KEY)).toBe(standing);
  });

  it("keeps exact /demo records physically isolated from ordinary runtime records", () => {
    const physical = new MemoryStorage();
    const demo = demoStorage(physical);

    saveIslandUnlockExam(record("choice"), demo);

    expect(loadIslandUnlockExam(CURRENT.id, physical)).toBeNull();
    expect(loadIslandUnlockExam(CURRENT.id, demo)?.phase).toBe("choice");
    expect(physical.getItem(islandUnlockExamStorageKey(CURRENT.id))).toBeNull();
    expect(
      physical.getItem(`cr.demo.city.islandUnlockExam.v2.${CURRENT.id}`),
    ).not.toBeNull();
  });
});
