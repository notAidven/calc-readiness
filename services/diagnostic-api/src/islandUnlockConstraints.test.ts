import { json } from "@cr/db";
import { describe, expect, it } from "vitest";

import { ECONOMY_AUTHORITY_STATEMENTS } from "./economy";
import { createFakeCluster } from "./test/fakeCluster";

const STUDENT = "00000000-0000-4000-8000-0000000000aa";

describe("normalized island unlock database constraints", () => {
  it("rejects non-adjacent, non-positive, and non-derived session targets", async () => {
    const cluster = createFakeCluster();
    const valid = {
      sid: STUDENT,
      session: "constraint-session",
      outgoing: "prehistoric",
      destination: "neolithic",
      target: 12,
      expires: "2026-09-01T00:00:00.000Z",
    };
    const invalid = [
      { ...valid, destination: "bronze_age" },
      { ...valid, target: 0 },
      { ...valid, target: 10 },
      { ...valid, session: "bad:session" },
    ];
    expect(invalid).toHaveLength(4);
    for (const params of invalid) {
      await expect(
        cluster.db.execute(ECONOMY_AUTHORITY_STATEMENTS.createIslandExamSession, params),
      ).rejects.toThrow("session constraint");
    }
    expect(cluster.tables.island_unlock_exam_session).toEqual([]);
  });

  it("rejects malformed response members and internally inconsistent variants", async () => {
    const cluster = createFakeCluster();
    await cluster.db.execute(ECONOMY_AUTHORITY_STATEMENTS.createIslandExamSession, {
      sid: STUDENT,
      session: "constraint-session",
      outgoing: "prehistoric",
      destination: "neolithic",
      target: 12,
      expires: "2026-09-01T00:00:00.000Z",
    });
    const valid = {
      sid: STUDENT,
      session: "constraint-session",
      response: "response-0",
      sequence: 0,
      item: "D1.NUM.S.v1",
      node: "NUM.S",
      outcome: "answer",
      raw: json("42"),
      checker: 1,
      correct: true,
      delta: 1,
      score: 1,
    };
    const invalid = [
      { ...valid, response: "" },
      { ...valid, sequence: -1 },
      { ...valid, item: "bad item" },
      { ...valid, node: "bad-node" },
      { ...valid, outcome: "invented" },
      { ...valid, outcome: "skip", checker: null, correct: false, delta: -1 },
      { ...valid, correct: false, delta: 1 },
    ];
    expect(invalid).toHaveLength(7);
    for (const params of invalid) {
      await expect(
        cluster.db.execute(ECONOMY_AUTHORITY_STATEMENTS.recordIslandExamResponse, params),
      ).rejects.toThrow("response constraint");
    }
    expect(cluster.tables.island_unlock_exam_response).toEqual([]);
  });

  it("rejects invalid bounded state and exam/diagnostic authority mixtures", async () => {
    const cluster = createFakeCluster();
    await cluster.db.execute(ECONOMY_AUTHORITY_STATEMENTS.createIslandExamSession, {
      sid: STUDENT,
      session: "constraint-session",
      outgoing: "prehistoric",
      destination: "neolithic",
      target: 12,
      expires: "2026-09-01T00:00:00.000Z",
    });
    const update = {
      sid: STUDENT,
      session: "constraint-session",
      score: 1,
      count: 1,
      cycle: json(["NUM.S"]),
      last_node: "NUM.S",
      last_items: json({ "NUM.S": "D1.NUM.S.v1" }),
      passed: false,
    };
    const invalidUpdates = [
      { ...update, score: -1 },
      { ...update, count: -1 },
      { ...update, cycle: json(["NUM.S", 7]) },
      { ...update, last_items: json({ "NUM.S": "" }) },
      { ...update, passed: true },
    ];
    expect(invalidUpdates).toHaveLength(5);
    for (const params of invalidUpdates) {
      await expect(
        cluster.db.execute(ECONOMY_AUTHORITY_STATEMENTS.updateIslandExamSession, params),
      ).rejects.toThrow("session constraint");
    }

    const validAuthority = {
      sid: STUDENT,
      island: "neolithic",
      kind: "exam",
      outgoing: "prehistoric",
      session: "constraint-session",
      target: 12,
    };
    const invalidAuthorities = [
      { ...validAuthority, island: "bronze_age" },
      { ...validAuthority, target: 10 },
      { ...validAuthority, session: null },
      { ...validAuthority, kind: "diagnostic" },
    ];
    expect(invalidAuthorities).toHaveLength(4);
    for (const params of invalidAuthorities) {
      await expect(
        cluster.db.execute(
          ECONOMY_AUTHORITY_STATEMENTS.recordIslandUnlockAuthority,
          params,
        ),
      ).rejects.toThrow("authority constraint");
    }
    expect(cluster.tables.island_unlock_authority).toEqual([]);
  });
});
