import {
  ACCOUNT_INITIALIZATION_LOCK_SQL,
  type DataApiClient,
  type DataApiExecutor,
  type SqlParams,
} from "@cr/db";
import type { UUID } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { createAuroraWalkDiagnosticServer } from "./aurora-server";

const STUDENT = "00000000-0000-4000-8000-0000000000aa" as UUID;

interface Call {
  readonly sql: string;
  readonly params: SqlParams | undefined;
}

/**
 * The production diagnostic start and city bootstrap must serialize on the same account lock.
 * The bootstrap race test exercises the lock's behavior; this test proves the real v2 server
 * acquires it before the administration row that makes an account non-empty.
 */
describe("the deployed diagnostic participates in first-use serialization", () => {
  it("locks the account before starting a walk administration", async () => {
    const calls: Call[] = [];
    const executor: DataApiExecutor = {
      async query<T>(sql: string, params?: SqlParams): Promise<T[]> {
        calls.push({ sql, params });
        if (sql === ACCOUNT_INITIALIZATION_LOCK_SQL) {
          return [] as T[];
        }
        if (sql.includes("insert into public.assessment_administration")) {
          return [
            {
              administration_id: params?.administration_id,
              student_id: params?.student_id,
              purpose: params?.purpose,
              form_id: params?.form_id,
              form_version: params?.form_version,
              blueprint_version: params?.blueprint_version,
              scoring_engine_version: params?.scoring_engine_version,
              scoring_model_version: params?.scoring_model_version,
              equivalence_checker_version: params?.equivalence_checker_version,
              routing_path: null,
              started_at: params?.started_at,
              submitted_at: null,
            },
          ] as T[];
        }
        throw new Error(`unexpected diagnostic query: ${sql}`);
      },
      async execute(sql: string, params?: SqlParams): Promise<number> {
        calls.push({ sql, params });
        return 1;
      },
    };
    const db: DataApiClient = {
      ...executor,
      withTransaction: <T>(run: (tx: DataApiExecutor) => Promise<T>): Promise<T> =>
        run(executor),
    };
    const server = createAuroraWalkDiagnosticServer({
      db,
      authenticate: async (token) => (token === "jwt" ? { student_id: STUDENT } : null),
    });

    const response = await server.handle({
      token: "jwt",
      body: { action: "start", purpose: "pre" },
    });

    expect(response.status).toBe(200);
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect(calls[0]).toEqual({
      sql: ACCOUNT_INITIALIZATION_LOCK_SQL,
      params: { sid: STUDENT },
    });
    expect(calls[1]?.sql).toContain("insert into public.assessment_administration");
    expect(calls[1]?.params?.student_id).toBe(STUDENT);
  });
});
