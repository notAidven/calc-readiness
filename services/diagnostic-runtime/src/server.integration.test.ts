import { createDataApiClient } from "@cr/db";
import type { CompletedDiagnostic, DiagnosticItem, StageAdvance } from "@cr/diagnostic";
import { D1_ITEM_PACK } from "@cr/item-bank";
import type { AssessmentItemSubmission, AssessmentPurpose, UUID } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { computeStudentMeasurement, createAuroraDiagnosticServer } from "./aurora";
import { randomUuid } from "./ids";
import type { DiagnosticAuthenticator } from "./server";

/**
 * Live browser_auth server smoke test over Aurora. Skipped in CI: run against a
 * real Aurora cluster (Data API + migrations applied) by setting
 * DB_TEST_CLUSTER_ARN, DB_TEST_SECRET_ARN, and DB_TEST_NAME. Unlike
 * `integration.test.ts` (which drives the runtime directly), this exercises the
 * deployed shape: the `server.handle` action protocol, per-request Data API
 * transactions, and cross-student ownership enforcement. Auth is stubbed (the
 * bearer token IS the student id) so no Cognito user pool is needed — the real
 * deploy swaps in `createCognitoAuthenticator`, which is the only difference.
 */
const env =
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process?.env ?? {};
const resourceArn = env.DB_TEST_CLUSTER_ARN;
const secretArn = env.DB_TEST_SECRET_ARN;
const database = env.DB_TEST_NAME;
const enabled = Boolean(resourceArn && secretArn && database);

const KEY_BY_ID = new Map(
  D1_ITEM_PACK.map((entry) => [entry.item_version_id, entry.answer.answer_key] as const),
);

describe.skipIf(!enabled)("diagnostic server against live Aurora (browser_auth)", () => {
  it("runs an authenticated pre+post and enforces administration ownership", async () => {
    const db = createDataApiClient({
      resourceArn: resourceArn as string,
      secretArn: secretArn as string,
      database: database as string,
    });
    // Stand-in for Cognito verification: the token is trusted as the student id.
    const authenticate: DiagnosticAuthenticator = async (token) =>
      token ? { student_id: token as UUID } : null;
    const server = createAuroraDiagnosticServer({ db, authenticate });

    const aliceId = randomUuid();
    const bobId = randomUuid();

    async function ace(token: string, purpose: AssessmentPurpose): Promise<void> {
      const start = await server.handle({ token, body: { action: "start", purpose } });
      expect(start.status).toBe(200);
      const startBody = start.body as {
        administration_id: string;
        items: DiagnosticItem[];
      };
      const administrationId = startBody.administration_id;
      let items: readonly DiagnosticItem[] = startBody.items;
      for (;;) {
        const submissions: AssessmentItemSubmission[] = items.map((item) => ({
          administration_id: administrationId,
          item_version_id: item.item_version_id,
          node_id: item.node_id,
          raw_answer: KEY_BY_ID.get(item.item_version_id),
          item_definition_hash: item.item_definition_hash,
          equivalence_checker_version: 1,
          client_correct: true,
        }));
        const advance = await server.handle({
          token,
          body: { action: "submitStage", administration_id: administrationId, submissions },
        });
        expect(advance.status).toBe(200);
        const advanceBody = advance.body as StageAdvance;
        if (advanceBody.complete) {
          break;
        }
        items = advanceBody.items;
      }
      const finalized = await server.handle({
        token,
        body: { action: "finalize", administration_id: administrationId },
      });
      expect(finalized.status).toBe(200);
      expect((finalized.body as CompletedDiagnostic).ability_score).toBeCloseTo(3, 5);
    }

    await ace(aliceId, "pre");
    await ace(aliceId, "post");

    const measurement = await computeStudentMeasurement(db, aliceId);
    expect(measurement).not.toBeNull();
    expect(measurement?.status).toBe("computed");
    expect(measurement?.pre.ability_score).toBeCloseTo(3, 5);
    expect(measurement?.post.ability_score).toBeCloseTo(3, 5);

    // Ownership: bob cannot act on alice's administration (enforced in server code).
    const aliceStart = await server.handle({
      token: aliceId,
      body: { action: "start", purpose: "pre" },
    });
    const administrationId = (aliceStart.body as { administration_id: string })
      .administration_id;
    const forbidden = await server.handle({
      token: bobId,
      body: { action: "finalize", administration_id: administrationId },
    });
    expect(forbidden.status).toBe(403);
  });
});
