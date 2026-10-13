import type { PlagueState } from "@cr/game";
import type { UUID } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { createPlagueStateService, type PlagueStateStore } from "./plagueState";

function inMemoryStore(): PlagueStateStore {
  const states = new Map<UUID, PlagueState>();
  return {
    load: async (studentId) => states.get(studentId) ?? null,
    update: async (studentId, transition) => {
      const next = transition(states.get(studentId) ?? null);
      states.set(studentId, next);
      return next;
    },
  };
}

const STUDENT = "00000000-0000-4000-8000-000000000006" as UUID;

describe("the signed-in Care House state service", () => {
  it("derives identity from the verified token and resumes the exact mid-batch state", async () => {
    const service = createPlagueStateService({
      store: inMemoryStore(),
      authenticate: async (token) => (token === "valid" ? { student_id: STUDENT } : null),
    });

    const started = await service.act("valid", { type: "start" });
    expect(started.status).toBe(200);
    const opened = started.body as PlagueState;

    const chosen = await service.act("valid", {
      type: "choose_action",
      action: { kind: "care", node_id: "care-house" },
      question_ids: ["q1", "q2", "q3"],
      expected_revision: opened.revision,
    });
    const answering = chosen.body as PlagueState;
    const answered = await service.act("valid", {
      type: "answer",
      question_id: "q1",
      correct: true,
      expected_revision: answering.revision,
    });

    const reloaded = await service.read("valid");
    expect(reloaded.status).toBe(200);
    expect(reloaded.body).toEqual(answered.body);
  });

  it("rejects client-authored state and malformed events without changing the stored state", async () => {
    const service = createPlagueStateService({
      store: inMemoryStore(),
      authenticate: async () => ({ student_id: STUDENT }),
    });
    await service.act("token", { type: "start" });
    const before = await service.read("token");

    for (const body of [
      { state: { patients: 0, verdict: "best" } },
      { type: "answer", question_id: "q1", correct: "yes", expected_revision: 0 },
      { type: "choose_action", action: "wait", question_ids: ["q1", "q2", "q3"] },
    ]) {
      const response = await service.act("token", body);
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect((await service.read("token")).body).toEqual(before.body);
    }
  });

  it("refuses stale writes and keeps the stored revision unchanged", async () => {
    const service = createPlagueStateService({
      store: inMemoryStore(),
      authenticate: async () => ({ student_id: STUDENT }),
    });
    const started = (await service.act("token", { type: "start" })).body as PlagueState;
    const chosen = await service.act("token", {
      type: "choose_action",
      action: { kind: "quarantine", route_id: "market-care" },
      question_ids: ["q1", "q2", "q3"],
      expected_revision: started.revision,
    });
    const current = chosen.body as PlagueState;

    const stale = await service.act("token", {
      type: "answer",
      question_id: "q1",
      correct: true,
      expected_revision: started.revision,
    });
    expect(stale.status).toBe(409);
    expect((await service.read("token")).body).toEqual(current);
  });

  it("rejects an unverified caller before reading or writing state", async () => {
    let touched = false;
    const store: PlagueStateStore = {
      load: async () => {
        touched = true;
        return null;
      },
      update: async () => {
        touched = true;
        throw new Error("unreachable");
      },
    };
    const service = createPlagueStateService({
      store,
      authenticate: async () => null,
    });

    expect((await service.read(null)).status).toBe(401);
    expect((await service.act(null, { type: "start" })).status).toBe(401);
    expect(touched).toBe(false);
  });
});
