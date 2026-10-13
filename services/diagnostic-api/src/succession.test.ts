import type { DiagnosticIdentity } from "@cr/diagnostic-runtime";
import type {
  SuccessionBatchComposition,
  SuccessionQuestionCandidate,
  SuccessionRosterMember,
} from "@cr/game";
import { describe, expect, it } from "vitest";

import {
  createSuccessionCommandService,
  type StoredSuccessionBattle,
  type SuccessionBattleStore,
} from "./succession";

const STUDENT = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const PROMPTS: SuccessionBatchComposition = {
  status: "ready",
  size: 3,
  prompts: [0, 1, 2].map((index) => ({
    index,
    node_id: "POL.1",
    item_version_id: `item-${index}`,
    prompt: `Question ${index + 1}`,
    era: "classical",
  })),
};

function memoryStore(
  eligible = true,
  roster: readonly SuccessionRosterMember[] | null = null,
): SuccessionBattleStore & {
  readonly rows: Map<string, StoredSuccessionBattle>;
} {
  const rows = new Map<string, StoredSuccessionBattle>();
  return {
    rows,
    eligible: async () => eligible,
    ...(roster === null ? {} : { roster: async () => roster }),
    load: async (studentId) => rows.get(studentId) ?? null,
    save: async (studentId, expectedRevision, battle) => {
      const current = rows.get(studentId);
      if ((current?.revision ?? 0) !== expectedRevision) {
        return false;
      }
      rows.set(studentId, { ...battle, revision: expectedRevision + 1 });
      return true;
    },
  };
}

function service(store = memoryStore()) {
  return createSuccessionCommandService({
    store,
    authenticate: async (token): Promise<DiagnosticIdentity | null> =>
      token === "valid" ? { student_id: STUDENT } : null,
    drawBatch: (): SuccessionBatchComposition => PROMPTS,
    grade: (_itemVersionId, rawAnswer) =>
      rawAnswer === "right"
        ? { status: "correct", correct: true, unreadable: null }
        : rawAnswer === "wrong"
          ? { status: "incorrect", correct: false, unreadable: null }
          : { status: "invalid", correct: null, unreadable: "Use a readable answer." },
  });
}

function member(placement_id: string, suspendable: boolean): SuccessionRosterMember {
  return { placement_id, label: placement_id, suspendable };
}

describe("the signed-in Succession session", () => {
  it("authenticates and checks authoritative progression before creating a battle", async () => {
    const ineligible = service(memoryStore(false));
    expect(await ineligible.command(null, { type: "start" })).toMatchObject({
      status: 401,
    });
    expect(await ineligible.command("valid", { type: "start" })).toMatchObject({
      status: 403,
    });

    const store = memoryStore();
    const started = await service(store).command("valid", {
      type: "start",
      student_id: OTHER,
    });
    expect(started.status).toBe(200);
    expect(store.rows.has(STUDENT)).toBe(true);
    expect(store.rows.has(OTHER)).toBe(false);
  });

  it("rebinds an authored battle to the authority's real city roster", async () => {
    const roster = ["POL.1", "POL.2", "POL.3", "town-hall"].map(
      (placement_id): SuccessionRosterMember => ({
        placement_id,
        label: placement_id,
        suspendable: false,
      }),
    );
    const store = memoryStore(true, roster);
    const api = service(store);
    await api.command("valid", { type: "start" });

    const rebound = await api.command("valid", {
      type: "start",
      binding: "city",
      districts: [{ placement_id: "forged-other-city" }],
    });

    expect(rebound.status).toBe(200);
    expect(store.rows.get(STUDENT)?.revision).toBe(2);
    expect(store.rows.get(STUDENT)?.state).toMatchObject({
      board: "live-city",
      phase: "ready",
    });
    expect(
      store.rows
        .get(STUDENT)
        ?.state.districts.map((district) => district.civic.placement_id),
    ).toEqual(["POL.1", "POL.2", "POL.3", "town-hall"]);
  });

  it("replaces a removed civic with the current skill instead of resuming orphan state", async () => {
    let roster = [member("civic-a", true), member("civic-b", true)];
    const store = memoryStore();
    store.roster = async () => roster;
    const api = service(store);
    await api.command("valid", { type: "start", binding: "city" });

    roster = [member("civic-a", true), member("skill-c", false)];
    const resumed = await api.load("valid");

    expect(resumed.status).toBe(200);
    expect(
      store.rows
        .get(STUDENT)
        ?.state.districts.map((district) => district.civic.placement_id),
    ).toEqual(["civic-a", "skill-c"]);
    expect(
      store.rows
        .get(STUDENT)
        ?.state.districts.find((district) => district.civic.placement_id === "skill-c")
        ?.civic.suspendable,
    ).toBe(false);
    expect(JSON.stringify(resumed.body)).not.toContain("civic-b");
  });

  it("resets an in-progress battle when the same placement changes from civic to skill", async () => {
    let roster = [member("same-id", true), member("town-hall", false)];
    const store = memoryStore();
    store.roster = async () => roster;
    const api = service(store);
    await api.command("valid", { type: "start", binding: "city" });
    await api.command("valid", { type: "start_batch" });
    for (const [item_version_id, raw_answer] of [
      ["item-0", "right"],
      ["item-1", "wrong"],
      ["item-2", "right"],
    ]) {
      await api.command("valid", {
        type: "answer",
        item_version_id,
        raw_answer,
      });
    }
    await api.command("valid", { type: "finish_response" });
    await api.command("valid", { type: "start_batch" });
    const before = store.rows.get(STUDENT);
    expect(before?.state.batch_log).toHaveLength(1);
    expect(before?.active_batch).not.toBeNull();

    roster = [member("same-id", false), member("town-hall", false)];
    const resumed = await api.load("valid");

    expect(resumed.status).toBe(200);
    const after = store.rows.get(STUDENT);
    expect(after?.revision).toBe((before?.revision ?? 0) + 1);
    expect(after?.active_batch).toBeNull();
    expect(after?.verdicts).toEqual([]);
    expect(after?.state).toMatchObject({
      phase: "ready",
      batch: 0,
      influence: 0,
      earned: 0,
      spent: 0,
      proposal: null,
      last_batch: null,
      last_action: null,
      batch_log: [],
      action_log: [],
    });
    expect(
      after?.state.districts.find((district) => district.civic.placement_id === "same-id")
        ?.civic.suspendable,
    ).toBe(false);
  });

  it("drops a removed placement from a resumed battle", async () => {
    let roster = [
      member("civic-a", true),
      member("skill-b", false),
      member("town-hall", false),
    ];
    const store = memoryStore();
    store.roster = async () => roster;
    const api = service(store);
    await api.command("valid", { type: "start", binding: "city" });

    roster = [member("civic-a", true), member("town-hall", false)];
    await api.command("valid", { type: "start", binding: "city" });

    expect(
      store.rows
        .get(STUDENT)
        ?.state.districts.map((district) => district.civic.placement_id),
    ).toEqual(["civic-a", "town-hall"]);
  });

  it("deduplicates an authoritative roster before binding it", async () => {
    const duplicate = member("civic-a", true);
    const store = memoryStore();
    store.roster = async () => [duplicate, { ...duplicate }, member("town-hall", false)];

    const result = await service(store).command("valid", {
      type: "start",
      binding: "city",
    });

    expect(result.status).toBe(200);
    expect(
      store.rows
        .get(STUDENT)
        ?.state.districts.map((district) => district.civic.placement_id),
    ).toEqual(["civic-a", "town-hall"]);
  });

  it("rereads a reordered roster without resetting the same bindings", async () => {
    let roster = [
      member("civic-a", true),
      member("skill-b", false),
      member("town-hall", false),
    ];
    let reads = 0;
    const store = memoryStore();
    store.roster = async () => {
      reads += 1;
      return roster;
    };
    const api = service(store);
    await api.command("valid", { type: "start", binding: "city" });
    const before = store.rows.get(STUDENT);

    roster = [...roster].reverse();
    await api.command("valid", { type: "start", binding: "city" });
    const after = store.rows.get(STUDENT);

    expect(reads).toBe(2);
    expect(after).toEqual(before);
  });

  it("accepts answers, never a client-authored score or state", async () => {
    const api = service();
    await api.command("valid", { type: "start" });
    await api.command("valid", { type: "start_batch" });

    expect(
      await api.command("valid", {
        type: "resolve_batch",
        correct: 3,
        asked: 3,
        state: { influence: 999 },
      }),
    ).toMatchObject({ status: 400 });

    const unreadable = await api.command("valid", {
      type: "answer",
      item_version_id: "item-0",
      raw_answer: "unreadable",
    });
    expect(unreadable.status).toBe(200);
    expect(unreadable.body).toMatchObject({
      verdict: { correct: null, unreadable: "Use a readable answer." },
      battle: { verdicts: [] },
    });

    for (const [item, answer] of [
      ["item-0", "right"],
      ["item-1", "wrong"],
      ["item-2", "right"],
    ] as const) {
      expect(
        (
          await api.command("valid", {
            type: "answer",
            item_version_id: item,
            raw_answer: answer,
          })
        ).status,
      ).toBe(200);
    }

    const loaded = await api.load("valid");
    expect(loaded.body).toMatchObject({
      battle: {
        active_batch: null,
        verdicts: [],
        state: {
          phase: "response",
          influence: 2,
          earned: 2,
          last_batch: {
            correct: 2,
            asked: 3,
            influence_earned: 2,
          },
        },
      },
    });
  });

  it("reloads the exact active question and proposed action from the authority", async () => {
    const store = memoryStore();
    const first = service(store);
    await first.command("valid", { type: "start" });
    await first.command("valid", { type: "start_batch" });
    await first.command("valid", {
      type: "answer",
      item_version_id: "item-0",
      raw_answer: "right",
    });

    const before = await first.load("valid");
    const after = await service(store).load("valid");
    expect(after).toEqual(before);
    expect(after.body).toMatchObject({
      battle: {
        active_batch: PROMPTS,
        verdicts: [true],
        state: { phase: "answering" },
      },
    });
  });

  it("fails a racing write instead of overwriting the newer battle", async () => {
    const store = memoryStore();
    const api = service(store);
    await api.command("valid", { type: "start" });

    const originalSave = store.save;
    let first = true;
    store.save = async (studentId, revision, battle) => {
      if (first) {
        first = false;
        const current = store.rows.get(studentId) as StoredSuccessionBattle;
        store.rows.set(studentId, { ...current, revision: current.revision + 1 });
      }
      return originalSave(studentId, revision, battle);
    };

    expect(await api.command("valid", { type: "start_batch" })).toMatchObject({
      status: 409,
    });
  });
});

describe("the production question boundary", () => {
  it("draws only prompt data and keeps answer keys behind the service", async () => {
    const seen: SuccessionQuestionCandidate[] = [];
    const store = memoryStore();
    const api = createSuccessionCommandService({
      store,
      authenticate: async () => ({ student_id: STUDENT }),
      drawBatch: () => {
        seen.push({
          item_version_id: "server-item",
          node_id: "POL.1",
          prompt: "Server prompt",
        });
        return PROMPTS;
      },
      grade: () => ({ status: "incorrect", correct: false, unreadable: null }),
    });

    await api.command("valid", { type: "start" });
    const result = await api.command("valid", { type: "start_batch" });
    expect(seen).toHaveLength(1);
    expect(JSON.stringify(result.body)).not.toContain("answer_key");
  });
});
