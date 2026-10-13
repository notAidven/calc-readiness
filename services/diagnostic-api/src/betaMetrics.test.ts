import type { DataApiExecutor } from "@cr/db";
import { describe, expect, it, vi } from "vitest";

import {
  BETA_METRICS_SQL,
  countRegisteredUsers,
  createBetaMetricsService,
} from "./betaMetrics";

describe("public beta metrics", () => {
  it("returns aggregate counts without accepting or exposing student identity", async () => {
    const query = vi.fn(async () => [
      {
        students_with_progress: 18,
        active_last_7_days: "7",
        diagnostics_started: 21,
        diagnostics_completed: "14",
        mastery_evidence_recorded: 96,
      },
    ]);
    const db = { query } as unknown as DataApiExecutor;
    const service = createBetaMetricsService({
      db,
      registeredUserCount: async () => 24,
      now: () => new Date("2026-08-24T18:00:00.000Z"),
    });

    expect(await service.read()).toEqual({
      status: 200,
      body: {
        registered_users: 24,
        students_with_progress: 18,
        active_last_7_days: 7,
        diagnostics_started: 21,
        diagnostics_completed: 14,
        mastery_evidence_recorded: 96,
        generated_at: "2026-08-24T18:00:00.000Z",
      },
    });
    expect(query).toHaveBeenCalledWith(BETA_METRICS_SQL);
    expect(BETA_METRICS_SQL).not.toMatch(/email|username|select\s+student_id/i);
  });

  it("normalizes an empty beta to zeroes", async () => {
    const service = createBetaMetricsService({
      db: { query: async () => [] } as unknown as DataApiExecutor,
      registeredUserCount: async () => 0,
      now: () => new Date("2026-08-24T18:00:00.000Z"),
    });

    expect((await service.read()).body).toMatchObject({
      registered_users: 0,
      students_with_progress: 0,
      active_last_7_days: 0,
      diagnostics_started: 0,
      diagnostics_completed: 0,
      mastery_evidence_recorded: 0,
    });
  });

  it("counts every Cognito page but keeps user records inside the adapter", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        Users: [{ Username: "one" }, { Username: "two" }],
        PaginationToken: "next",
      })
      .mockResolvedValueOnce({ Users: [{ Username: "three" }] });

    expect(await countRegisteredUsers("pool", { send })).toBe(3);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("reuses a warm Lambda snapshot so direct API traffic cannot query AWS per request", async () => {
    const query = vi.fn(async () => [{}]);
    const registeredUserCount = vi.fn(async () => 3);
    const service = createBetaMetricsService({
      db: { query } as unknown as DataApiExecutor,
      registeredUserCount,
      now: () => new Date("2026-08-24T18:00:00.000Z"),
    });

    const first = await service.read();
    expect(await service.read()).toBe(first);
    expect(query).toHaveBeenCalledTimes(1);
    expect(registeredUserCount).toHaveBeenCalledTimes(1);
  });
});
