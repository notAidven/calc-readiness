import { createDataApiClient } from "@cr/db";
import type { DiagnosticItem } from "@cr/diagnostic";
import { D1_ITEM_PACK } from "@cr/item-bank";
import type { AssessmentItemSubmission, AssessmentPurpose } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { computeStudentMeasurement, createAuroraDiagnosticRuntime } from "./aurora";
import { randomUuid } from "./ids";

/**
 * Live Aurora integration. Skipped in CI: run it against a real Aurora Serverless
 * v2 cluster with the Data API enabled + migrations applied (`node db/apply.mjs`)
 * by setting DB_TEST_CLUSTER_ARN, DB_TEST_SECRET_ARN (a role with the app_service
 * grants), and DB_TEST_NAME. student_id is any uuid (the Cognito `sub`; there is
 * no auth.users FK after the AWS migration).
 */
const env =
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process?.env ?? {};
const resourceArn = env.DB_TEST_CLUSTER_ARN;
const secretArn = env.DB_TEST_SECRET_ARN;
const database = env.DB_TEST_NAME;
const enabled = Boolean(resourceArn && secretArn && database);

describe.skipIf(!enabled)("diagnostic runtime against live Aurora (Data API)", () => {
  it("persists a full pre + post and computes the measurement from real records", async () => {
    const db = createDataApiClient({
      resourceArn: resourceArn as string,
      secretArn: secretArn as string,
      database: database as string,
    });
    const runtime = createAuroraDiagnosticRuntime({ db });
    const studentId = randomUuid();
    const keyById = new Map(
      D1_ITEM_PACK.map(
        (entry) => [entry.item_version_id, entry.answer.answer_key] as const,
      ),
    );

    async function aceAdministration(purpose: AssessmentPurpose): Promise<void> {
      const started = await runtime.engine.start(
        runtime.newAdministration({ student_id: studentId, purpose }),
      );
      const administrationId = started.administration.administration_id;
      let items: readonly DiagnosticItem[] = started.items;
      for (;;) {
        const submissions: AssessmentItemSubmission[] = items.map((item) => ({
          administration_id: administrationId,
          item_version_id: item.item_version_id,
          node_id: item.node_id,
          raw_answer: keyById.get(item.item_version_id),
          item_definition_hash: item.item_definition_hash,
          equivalence_checker_version: runtime.versions.equivalence_checker_version,
          client_correct: true,
        }));
        const advance = await runtime.engine.submitStage(administrationId, submissions);
        if (advance.complete) {
          break;
        }
        items = advance.items;
      }
      await runtime.engine.finalize(administrationId);
    }

    await aceAdministration("pre");
    await aceAdministration("post");

    const measurement = await computeStudentMeasurement(db, studentId);
    expect(measurement).not.toBeNull();
    expect(measurement?.status).toBe("computed");
    // Both administrations aced the real items -> frontier theta = 3 on each side.
    expect(measurement?.pre.ability_score).toBeCloseTo(3, 5);
    expect(measurement?.post.ability_score).toBeCloseTo(3, 5);
  });
});
