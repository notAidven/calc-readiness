import type { DataApiClient } from "@cr/db";
import {
  civicBootstrapMaterialAmount,
  EARN,
  eraMaterialTotal,
  interleavedEventId,
  lessonMaterialAmount,
  lessonMaterialAmountAfterFounding,
} from "@cr/economy";
import { hardWinterRepairPrices } from "@cr/game";
import { canonicalRawAnswer, D1_PRACTICE_ITEMS } from "@cr/item-bank";
import { ERA_SEQUENCE, getEraOrThrow } from "@cr/skill-graph";
import type { UUID } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { createAuroraEconomyService, ECONOMY_AUTHORITY_STATEMENTS } from "./economy";
import { loadCityFromAurora } from "./reads";
import { createFakeCluster, type FakeCluster, type FakeRow } from "./test/fakeCluster";

const STUDENT = "00000000-0000-4000-8000-0000000000aa" as UUID;
const OTHER_STUDENT = "00000000-0000-4000-8000-0000000000bb" as UUID;

function harness(seed: Parameters<typeof createFakeCluster>[0] = {}) {
  const cluster = createFakeCluster(seed);
  return {
    cluster,
    service: serviceFor(cluster),
  };
}

function serviceFor(cluster: FakeCluster, studentId: UUID = STUDENT) {
  return createAuroraEconomyService({
    db: cluster.db,
    authenticate: async (token) => (token === "jwt" ? { student_id: studentId } : null),
  });
}

function practicedNode(nodeId: string): FakeRow {
  return {
    student_id: STUDENT,
    node_id: nodeId,
    placement_estimate: 0,
    mastery: 2,
    completion_status: "complete",
    lesson_stage: "done",
    mastery_updated_at: "2026-08-06T00:00:00.000Z",
    last_practiced_at: "2026-08-06T00:00:00.000Z",
  };
}

function correctPrehistoricRound() {
  return getEraOrThrow("prehistoric").nodes.map((nodeId) => {
    const item = D1_PRACTICE_ITEMS.find((candidate) => candidate.node_id === nodeId);
    if (!item) {
      throw new Error(`the D1 practice bank has no item for ${nodeId}`);
    }
    return {
      itemVersionId: item.item_version_id,
      rawAnswer: canonicalRawAnswer(item.answer),
    };
  });
}

function correctPrehistoricExamResponses() {
  const era = getEraOrThrow("prehistoric");
  return [0, 1].flatMap((cycle) =>
    era.nodes.map((nodeId) => {
      const candidates = D1_PRACTICE_ITEMS.filter((item) => item.node_id === nodeId);
      const item = candidates[cycle];
      if (!item) {
        throw new Error(`the D1 practice bank needs two exam items for ${nodeId}`);
      }
      return {
        itemVersionId: item.item_version_id,
        outcome: "answer",
        rawAnswer: canonicalRawAnswer(item.answer),
      };
    }),
  );
}

function longPrehistoricExamResponses() {
  const era = getEraOrThrow("prehistoric");
  const cycle = (cycleIndex: number, outcome: "answer" | "skip") =>
    era.nodes.map((nodeId) => {
      const candidates = D1_PRACTICE_ITEMS.filter((item) => item.node_id === nodeId);
      const item = candidates[cycleIndex % 2];
      if (!item) {
        throw new Error(`the D1 practice bank needs two exam items for ${nodeId}`);
      }
      return outcome === "skip"
        ? { itemVersionId: item.item_version_id, outcome }
        : {
            itemVersionId: item.item_version_id,
            outcome,
            rawAnswer: canonicalRawAnswer(item.answer),
          };
    });
  return [
    ...Array.from({ length: 84 }, (_, index) => cycle(index, "skip")).flat(),
    ...cycle(84, "answer"),
    ...cycle(85, "answer"),
  ];
}

function accountAtEightyPercent() {
  const era = getEraOrThrow("prehistoric");
  return {
    city_state: [
      {
        student_id: STUDENT,
        era_id: era.id,
        current_island: era.id,
        road_gold_spent: 0,
        next_damage_ordinal: 1,
      },
    ],
    city_island_state: [
      {
        student_id: STUDENT,
        island_era: era.id,
        road_gold_spent: 0,
        civic_material_spent: 0,
        next_damage_ordinal: 1,
        reset_count: 0,
      },
    ],
    // The real persisted checkpoint shape is domain-keyed and uncleared at the new 80% gate.
    neighborhood_state: [
      {
        student_id: STUDENT,
        neighborhood_id: "D1",
        checkpoint_cleared: false,
      },
    ],
    student_node_state: era.nodes.map((nodeId, index) => ({
      ...practicedNode(nodeId),
      mastery: index < 5 ? 2 : 1,
    })),
  };
}

function diagnosticAccount(evidence: readonly FakeRow[]) {
  const first = ERA_SEQUENCE[0] as (typeof ERA_SEQUENCE)[number];
  return {
    city_state: [
      {
        student_id: STUDENT,
        era_id: first.id,
        current_island: first.id,
        road_gold_spent: 0,
        next_damage_ordinal: 1,
      },
    ],
    city_island_state: [
      {
        student_id: STUDENT,
        island_era: first.id,
        road_gold_spent: 0,
        civic_material_spent: 0,
        next_damage_ordinal: 1,
        reset_count: 0,
      },
    ],
    student_node_state: evidence,
  };
}

function diagnosticPasses(...eraIndexes: readonly number[]): FakeRow[] {
  return eraIndexes.flatMap((index) =>
    (ERA_SEQUENCE[index]?.nodes ?? []).map((nodeId) => ({
      ...practicedNode(nodeId),
      mastery: 0,
      placement_estimate: 2,
      mastery_updated_at: null,
      last_practiced_at: null,
      completion_status: "complete",
      lesson_stage: "done",
    })),
  );
}

function incrementalExamAction(
  response: ReturnType<typeof correctPrehistoricExamResponses>[number],
  sequence: number,
  sessionId = "exam-release-review",
) {
  return {
    action: "island_exam_response",
    eraId: "neolithic",
    sessionId,
    responseId: `${sessionId}-${sequence}`,
    sequence,
    response,
  } as const;
}

async function submitExamResponses(
  service: ReturnType<typeof serviceFor>,
  responses = correctPrehistoricExamResponses(),
  sessionId = "exam-release-review",
) {
  let result: Awaited<ReturnType<typeof service.act>> | null = null;
  for (const [sequence, response] of responses.entries()) {
    result = await service.act("jwt", incrementalExamAction(response, sequence, sessionId));
    if (result.status !== 200) {
      return result;
    }
  }
  if (result === null) {
    throw new Error("the exam fixture has no responses");
  }
  return result;
}

function examFoundingAction(sessionId = "exam-release-review") {
  return {
    action: "found_island",
    eraId: "neolithic",
    authority: {
      source: "exam",
      sessionId,
    },
  } as const;
}

describe("the persisted per-island wallet", () => {
  it("authorizes an 80%-eligible exam pass against real D1 checkpoint persistence", async () => {
    const { cluster, service } = harness(accountAtEightyPercent());

    const response = await submitExamResponses(service);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      applied: true,
      grantedMaterials: { grain: lessonMaterialAmount("neolithic") },
    });
    expect(
      cluster.tables.city_island_state.filter((row) => row.island_era === "neolithic"),
    ).toHaveLength(1);
    expect(cluster.tables.island_unlock_authority).toHaveLength(1);
    expect(cluster.tables.island_unlock_authority[0]).toMatchObject({
      student_id: STUDENT,
      island_era: "neolithic",
      authority_kind: "exam",
      target_score: 12,
    });
  });

  it("refuses incomplete exam score, the wrong learner, and client-only pass claims", async () => {
    const incomplete = harness(accountAtEightyPercent());
    await submitExamResponses(
      incomplete.service,
      correctPrehistoricExamResponses().slice(0, -1),
    );
    const short = await incomplete.service.act("jwt", examFoundingAction());
    expect(short.status).toBe(403);
    expect(short.body).toMatchObject({ error: "founding_not_eligible" });
    expect(incomplete.cluster.tables.city_island_state).toHaveLength(1);

    const wrongCluster = createFakeCluster(accountAtEightyPercent());
    const wrongLearner = serviceFor(wrongCluster, OTHER_STUDENT);
    const wrongResponse = correctPrehistoricExamResponses()[0];
    if (!wrongResponse) {
      throw new Error("the exam fixture has no first response");
    }
    const wrong = await wrongLearner.act("jwt", incrementalExamAction(wrongResponse, 0));
    expect(wrong.status).toBe(403);
    expect(wrongCluster.tables.island_unlock_authority).toEqual([]);

    const forged = await incomplete.service.act("jwt", {
      action: "found_island",
      eraId: "neolithic",
      authority: { source: "exam", passed: true },
    });
    expect(forged.status).toBe(400);
  });

  it("replays an authenticated exam pass without double-founding or double-awarding", async () => {
    const { cluster, service } = harness(accountAtEightyPercent());
    const first = await submitExamResponses(service);
    const replay = await service.act("jwt", examFoundingAction());

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(replay.body).toMatchObject({ applied: false, grantedMaterials: {} });
    expect(
      cluster.tables.city_island_state.filter((row) => row.island_era === "neolithic"),
    ).toHaveLength(1);
    expect(cluster.tables.island_unlock_authority).toHaveLength(1);
    expect(cluster.tables.resource_grant_ledger).toHaveLength(1);
  });

  it("commits authority, island, Town Hall, and grant atomically before any response reaches the client", async () => {
    const { cluster, service } = harness(accountAtEightyPercent());

    // The first response is treated as lost after Aurora commits; the browser refreshes and
    // retries the same authenticated operation.
    const responses = correctPrehistoricExamResponses();
    const finalResponse = responses.at(-1);
    if (!finalResponse) {
      throw new Error("the exam fixture has no final response");
    }
    await submitExamResponses(service, responses);
    await service.act("jwt", incrementalExamAction(finalResponse, responses.length - 1));
    const city = await loadCityFromAurora(cluster.db, STUDENT);
    const destination = city.islands?.find((island) => island.era_id === "neolithic");

    expect(destination?.town_hall).toEqual({
      nodeId: "town-hall",
      col: -1,
      row: -1,
      rot: 0,
    });
    expect(cluster.tables.island_unlock_authority).toHaveLength(1);
    expect(
      cluster.tables.city_island_state.filter((row) => row.island_era === "neolithic"),
    ).toHaveLength(1);
    expect(
      cluster.tables.city_placement.filter(
        (row) => row.island_era === "neolithic" && row.kind === "town_hall",
      ),
    ).toHaveLength(1);
    expect(cluster.tables.resource_grant_ledger).toHaveLength(1);
  });

  it("rolls back the pass response and every founding object when Town Hall persistence fails", async () => {
    const { cluster, service } = harness(accountAtEightyPercent());
    const responses = correctPrehistoricExamResponses();
    await submitExamResponses(service, responses.slice(0, -1), "atomic-failure");
    const failing = createAuroraEconomyService({
      db: {
        ...cluster.db,
        withTransaction: (operation) =>
          cluster.db.withTransaction((tx) =>
            operation({
              ...tx,
              execute: (sql, params) => {
                if (sql === ECONOMY_AUTHORITY_STATEMENTS.foundTownHall) {
                  throw new Error("injected Town Hall write failure");
                }
                return tx.execute(sql, params);
              },
            }),
          ),
      },
      authenticate: async () => ({ student_id: STUDENT }),
    });
    const finalResponse = responses.at(-1);
    if (!finalResponse) {
      throw new Error("the exam fixture has no final response");
    }

    const failed = await failing.act(
      "jwt",
      incrementalExamAction(finalResponse, responses.length - 1, "atomic-failure"),
    );
    expect(failed.status).toBe(500);
    expect(cluster.tables.island_unlock_exam_response).toHaveLength(responses.length - 1);
    expect(cluster.tables.island_unlock_authority).toEqual([]);
    expect(cluster.tables.city_island_state).toHaveLength(1);
    expect(cluster.tables.city_placement).toEqual([]);
    expect(cluster.tables.resource_grant_ledger).toEqual([]);

    const retried = await service.act(
      "jwt",
      incrementalExamAction(finalResponse, responses.length - 1, "atomic-failure"),
    );
    expect(retried.status).toBe(200);
    expect(retried.body).toMatchObject({ passed: true, applied: true });
    expect(cluster.tables.island_unlock_authority).toHaveLength(1);
    expect(cluster.tables.city_island_state).toHaveLength(2);
    expect(cluster.tables.city_placement).toHaveLength(1);
    expect(cluster.tables.resource_grant_ledger).toHaveLength(1);
  });

  it("lands a founded account island idempotently and refuses a bare destination", async () => {
    const { cluster, service } = harness(accountAtEightyPercent());
    await submitExamResponses(service);

    const first = await service.act("jwt", {
      action: "land_island",
      eraId: "neolithic",
    });
    const replay = await service.act("jwt", {
      action: "land_island",
      eraId: "neolithic",
    });
    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(cluster.tables.city_state[0]?.current_island).toBe("neolithic");
    expect(cluster.tables.resource_grant_ledger).toHaveLength(1);

    cluster.tables.city_island_state.push({
      student_id: STUDENT,
      island_era: "bronze_age",
      road_gold_spent: 0,
      civic_material_spent: 0,
      next_damage_ordinal: 1,
      reset_count: 0,
    });
    const bare = await service.act("jwt", {
      action: "land_island",
      eraId: "bronze_age",
    });
    expect(bare.status).toBe(403);
    expect(bare.body).toMatchObject({ error: "island_not_founded" });
    expect(cluster.tables.city_state[0]?.current_island).toBe("neolithic");
  });

  it("grants the onboarding civic-bootstrap top-up once per founded island, idempotently", async () => {
    const { cluster, service } = harness(accountAtEightyPercent());
    await submitExamResponses(service);
    const bootstrapAmount = civicBootstrapMaterialAmount("neolithic");

    const first = await service.act("jwt", {
      action: "civic_bootstrap",
      eraId: "neolithic",
    });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      applied: true,
      grantedMaterials: { grain: bootstrapAmount },
    });

    const replay = await service.act("jwt", {
      action: "civic_bootstrap",
      eraId: "neolithic",
    });
    expect(replay.status).toBe(200);
    expect(replay.body).toMatchObject({ applied: false, grantedMaterials: {} });
    expect(
      cluster.tables.resource_grant_ledger.filter((row) => row.reason_code === "civic_bootstrap"),
    ).toHaveLength(1);
  });

  it("refuses the civic-bootstrap top-up for an island with no Town Hall", async () => {
    const { service } = harness(accountAtEightyPercent());
    // Never founded via the exam, so no Town Hall placement exists yet.
    const refused = await service.act("jwt", {
      action: "civic_bootstrap",
      eraId: "neolithic",
    });
    expect(refused.status).toBe(403);
    expect(refused.body).toMatchObject({ error: "island_not_founded" });
  });

  it("accepts a valid exam longer than 500 attempts through bounded idempotent response requests", async () => {
    const { cluster, service } = harness(accountAtEightyPercent());
    const responses = longPrehistoricExamResponses();
    expect(responses.length).toBeGreaterThan(500);
    let final: Awaited<ReturnType<typeof service.act>> | null = null;

    for (const [sequence, response] of responses.entries()) {
      const body = {
        action: "island_exam_response",
        eraId: "neolithic",
        sessionId: "long-exam",
        responseId: `long-exam-${sequence}`,
        sequence,
        response,
      } as const;
      expect(JSON.stringify(body).length).toBeLessThan(1_000);
      final = await service.act("jwt", body);
      expect(final.status, `response ${sequence}`).toBe(200);
    }

    expect(final?.body).toMatchObject({ passed: true, score: 12, target: 12 });
    expect(cluster.tables.island_unlock_exam_response).toHaveLength(responses.length);
    expect(cluster.tables.island_unlock_exam_session).toHaveLength(1);
    expect(cluster.tables.island_unlock_authority).toHaveLength(1);
    expect(cluster.tables.city_island_state).toHaveLength(2);
    expect(cluster.tables.resource_grant_ledger).toHaveLength(1);
    expect(
      String(cluster.tables.island_unlock_exam_session[0]?.cycle_node_ids).length,
    ).toBeLessThan(100);
    expect(
      String(cluster.tables.island_unlock_exam_session[0]?.last_item_by_node).length,
    ).toBeLessThan(1_000);
  });

  it("makes response replay idempotent and rejects out-of-order, expired, and tampered sessions", async () => {
    const { cluster, service } = harness(accountAtEightyPercent());
    const response = correctPrehistoricExamResponses()[0];
    if (!response) {
      throw new Error("the exam fixture has no first response");
    }
    const firstAction = incrementalExamAction(response, 0, "protocol-guards");
    const first = await service.act("jwt", firstAction);
    const duplicate = await service.act("jwt", firstAction);
    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(200);
    expect(cluster.tables.island_unlock_exam_response).toHaveLength(1);
    expect(cluster.tables.island_unlock_exam_session[0]?.response_count).toBe(1);

    const tampered = await service.act("jwt", {
      ...firstAction,
      response: { ...response, rawAnswer: "tampered" },
    });
    expect(tampered.status).toBe(409);
    expect(tampered.body).toMatchObject({ error: "island_exam_response_tampered" });

    const outOfOrder = await service.act(
      "jwt",
      incrementalExamAction(
        correctPrehistoricExamResponses()[1] as typeof response,
        2,
        "protocol-guards",
      ),
    );
    expect(outOfOrder.status).toBe(409);
    expect(outOfOrder.body).toMatchObject({ error: "island_exam_response_out_of_order" });

    const expired = harness({
      ...accountAtEightyPercent(),
      island_unlock_exam_session: [
        {
          student_id: STUDENT,
          session_id: "expired-exam",
          outgoing_era: "prehistoric",
          destination_era: "neolithic",
          score: 0,
          target_score: 12,
          response_count: 0,
          cycle_node_ids: "[]",
          last_node_id: null,
          last_item_by_node: "{}",
          expires_at: "2020-01-01T00:00:00.000Z",
          passed_at: null,
        },
      ],
    });
    const expiredResponse = await expired.service.act(
      "jwt",
      incrementalExamAction(response, 0, "expired-exam"),
    );
    expect(expiredResponse.status).toBe(410);
    expect(expiredResponse.body).toMatchObject({ error: "island_exam_session_expired" });
    expect(expired.cluster.tables.island_unlock_exam_response).toEqual([]);
  });

  it("authorizes diagnostic prefix founding from durable placement, not an era-slug checkpoint", async () => {
    const seed = accountAtEightyPercent();
    seed.student_node_state = [
      ...getEraOrThrow("prehistoric").nodes,
      ...getEraOrThrow("neolithic").nodes,
    ].map((nodeId) => ({
      ...practicedNode(nodeId),
      mastery: 0,
      placement_estimate: 2,
      last_practiced_at: null,
    }));
    const { cluster, service } = harness(seed);

    const response = await service.act("jwt", {
      action: "found_island",
      eraId: "neolithic",
      authority: { source: "diagnostic" },
    });

    expect(response.status).toBe(200);
    expect(cluster.tables.island_unlock_authority[0]).toMatchObject({
      student_id: STUDENT,
      island_era: "neolithic",
      authority_kind: "diagnostic",
    });

    const landing = await service.act("jwt", {
      action: "found_island",
      eraId: "bronze_age",
      authority: { source: "diagnostic" },
    });
    expect(landing.status).toBe(200);

    const notInPrefix = await service.act("jwt", {
      action: "found_island",
      eraId: "classical",
      authority: { source: "diagnostic" },
    });
    expect(notInPrefix.status).toBe(403);
    expect(
      cluster.tables.city_island_state.filter((row) => row.island_era === "classical"),
    ).toEqual([]);
  });

  describe("diagnostic completion founds one exact authoritative prefix atomically", () => {
    const cases = [
      { name: "first era unmastered", evidence: diagnosticPasses(), prefixLength: 1 },
      {
        name: "first three mastered",
        evidence: diagnosticPasses(0, 1, 2),
        prefixLength: 4,
      },
      {
        name: "non-monotonic later mastery",
        evidence: diagnosticPasses(0, 1, 2, 7),
        prefixLength: 4,
      },
      {
        name: "all mastered",
        evidence: diagnosticPasses(...ERA_SEQUENCE.map((_, index) => index)),
        prefixLength: ERA_SEQUENCE.length,
      },
      {
        name: "incomplete and unprobed evidence",
        evidence: diagnosticPasses(0).slice(0, -1),
        prefixLength: 1,
      },
    ] as const;

    it.each(cases)("$name", async ({ evidence, prefixLength }) => {
      expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
      const { cluster, service } = harness(diagnosticAccount(evidence));
      const expected = ERA_SEQUENCE.slice(0, prefixLength).map((era) => era.id);

      const first = await service.act("jwt", { action: "found_diagnostic_prefix" });
      expect(first.status).toBe(200);
      expect(first.body).toMatchObject({
        unlockedEras: expected,
        destinationEra: expected.at(-1),
      });
      expect(cluster.tables.city_island_state.map((row) => row.island_era)).toEqual(
        expected,
      );
      expect(
        cluster.tables.city_placement
          .filter((row) => row.kind === "town_hall")
          .map((row) => row.island_era),
      ).toEqual(expected);
      expect(cluster.tables.island_unlock_authority.map((row) => row.island_era)).toEqual(
        expected,
      );
      expect(cluster.tables.resource_grant_ledger).toHaveLength(
        Math.max(0, prefixLength - 1),
      );
      expect(
        new Set(
          cluster.tables.resource_grant_ledger.map(
            (row) => `${row.event_id}:${row.resource_type}`,
          ),
        ).size,
      ).toBe(cluster.tables.resource_grant_ledger.length);
      expect(
        cluster.tables.city_island_state.some(
          (row) => row.island_era === ERA_SEQUENCE[prefixLength]?.id,
        ),
      ).toBe(false);

      const durableBeforeReplay = JSON.stringify(cluster.tables);
      const replay = await service.act("jwt", { action: "found_diagnostic_prefix" });
      expect(replay.status).toBe(200);
      expect(replay.body).toMatchObject({
        unlockedEras: expected,
        destinationEra: expected.at(-1),
      });
      expect(JSON.stringify(cluster.tables)).toBe(durableBeforeReplay);

      const refreshed = await loadCityFromAurora(cluster.db, STUDENT);
      expect(refreshed.islands.map((island) => island.era_id)).toEqual(expected);
      expect(refreshed.islands.every((island) => island.town_hall !== null)).toBe(true);
    });

    it("rolls back a transient mid-prefix failure and recovers on an idempotent retry", async () => {
      const cluster = createFakeCluster(diagnosticAccount(diagnosticPasses(0, 1, 2)));
      const before = JSON.stringify(cluster.tables);
      const failingDb: DataApiClient = {
        query: cluster.db.query,
        execute: cluster.db.execute,
        withTransaction: (run) =>
          cluster.db.withTransaction((tx) =>
            run({
              query: tx.query,
              execute: (sql, params) => {
                if (
                  sql === ECONOMY_AUTHORITY_STATEMENTS.foundTownHall &&
                  params?.island === "classical"
                ) {
                  throw new Error("transient Aurora statement failure");
                }
                return tx.execute(sql, params);
              },
            }),
          ),
      };
      const failing = createAuroraEconomyService({
        db: failingDb,
        authenticate: async () => ({ student_id: STUDENT }),
      });

      const rejected = await failing.act("jwt", { action: "found_diagnostic_prefix" });
      expect(rejected.status).toBe(500);
      expect(JSON.stringify(cluster.tables)).toBe(before);

      const recovered = await serviceFor(cluster).act("jwt", {
        action: "found_diagnostic_prefix",
      });
      expect(recovered.status).toBe(200);
      expect(cluster.tables.city_island_state.map((row) => row.island_era)).toEqual(
        ERA_SEQUENCE.slice(0, 4).map((era) => era.id),
      );
    });
  });

  it("refuses a founding payload against an empty account without minting an island or grant", async () => {
    const { cluster, service } = harness();

    const response = await service.act("jwt", {
      action: "found_island",
      eraId: "neolithic",
      authority: { source: "diagnostic" },
    });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: "founding_not_eligible" });
    expect(cluster.tables.city_island_state).toEqual([]);
    expect(cluster.tables.resource_grant_ledger).toEqual([]);
  });

  it("records one eligible founding advance, replays it as a no-op, and keeps the era total fixed", async () => {
    const { cluster, service } = harness(accountAtEightyPercent());
    const founding = await submitExamResponses(service);
    expect(founding.status).toBe(200);
    expect(founding.body).toMatchObject({
      applied: true,
      grantedMaterials: { grain: lessonMaterialAmount("neolithic") },
    });

    const replay = await service.act("jwt", examFoundingAction());
    expect(replay.body).toMatchObject({ applied: false, grantedMaterials: {} });
    expect(cluster.tables.resource_grant_ledger).toHaveLength(1);
    expect(
      cluster.tables.city_island_state.filter((row) => row.island_era === "neolithic"),
    ).toHaveLength(1);

    for (const nodeId of ERA_SEQUENCE[1]?.nodes ?? []) {
      cluster.tables.student_node_state.push({
        student_id: STUDENT,
        node_id: nodeId,
        placement_estimate: 0,
        mastery: 2,
        mastery_updated_at: "2026-08-06T00:00:00.000Z",
        completion_status: "complete",
        lesson_stage: "done",
        last_practiced_at: "2026-08-06T00:00:00.000Z",
      });
      const lesson = await service.act("jwt", { action: "lesson_complete", nodeId });
      expect(lesson.status).toBe(200);
    }
    const read = await service.read("jwt", "neolithic");
    expect(read.status).toBe(200);
    expect(read.body).toMatchObject({
      wallet: { spendable: eraMaterialTotal("neolithic") },
    });
  });

  it("refuses a lesson-complete claim until the server-owned node row carries qualifying evidence", async () => {
    const { cluster, service } = harness();
    const nodeId = ERA_SEQUENCE[0]?.nodes[0] as string;

    const forged = await service.act("jwt", {
      action: "lesson_complete",
      nodeId,
      completed: true,
      mastery: 3,
    });

    expect(forged.status).toBe(403);
    expect(forged.body).toMatchObject({ error: "lesson_evidence_missing" });
    expect(cluster.tables.resource_grant_ledger).toEqual([]);

    cluster.tables.student_node_state.push({
      student_id: STUDENT,
      node_id: nodeId,
      placement_estimate: 0,
      mastery: 2,
      mastery_updated_at: "2026-08-06T00:00:00.000Z",
      completion_status: "complete",
      lesson_stage: "done",
      last_practiced_at: "2026-08-06T00:00:00.000Z",
    });
    const evidenced = await service.act("jwt", { action: "lesson_complete", nodeId });
    expect(evidenced.status).toBe(200);
    expect(evidenced.body).toMatchObject({ applied: true });
    expect(cluster.tables.resource_grant_ledger).toHaveLength(1);
  });

  it("pays one canonical transaction for an ordinary first set, each genuine repeat, and no replay", async () => {
    const nodeId = "NUM.S";
    const firstSetId = "ordinary-set-1";
    const repeatSetId = "ordinary-set-2";
    const { cluster, service } = harness({
      city_state: [
        {
          student_id: STUDENT,
          era_id: "prehistoric",
          current_island: "prehistoric",
          road_gold_spent: 0,
          next_damage_ordinal: 1,
        },
      ],
      student_node_state: [practicedNode(nodeId)],
      mastery_evidence: [
        {
          evidence_id: firstSetId,
          student_id: STUDENT,
          node_id: nodeId,
          mastery: 2,
          completion_status: "complete",
          changed: true,
        },
        {
          evidence_id: repeatSetId,
          student_id: STUDENT,
          node_id: nodeId,
          mastery: 3,
          completion_status: "complete",
          changed: true,
        },
      ],
    });

    const mismatched = await service.act("jwt", {
      action: "practice_complete",
      nodeId: "NUM.2",
      evidenceId: firstSetId,
    });
    expect(mismatched.status).toBe(403);
    expect(cluster.tables.resource_grant_ledger).toEqual([]);

    const first = await service.act("jwt", {
      action: "practice_complete",
      nodeId,
      evidenceId: firstSetId,
    });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      applied: true,
      rewardKind: "skill_completion",
      grantedMaterials: { stone: lessonMaterialAmountAfterFounding(nodeId) },
    });
    expect(cluster.tables.resource_grant_ledger).toHaveLength(1);

    const reconciled = await service.act("jwt", {
      action: "lesson_complete",
      nodeId,
    });
    expect(reconciled.body).toMatchObject({ applied: false, grantedMaterials: {} });
    expect(cluster.tables.resource_grant_ledger).toHaveLength(1);

    const repeat = await service.act("jwt", {
      action: "practice_complete",
      nodeId,
      evidenceId: repeatSetId,
    });
    expect(repeat.status).toBe(200);
    expect(repeat.body).toMatchObject({
      applied: true,
      rewardKind: "repeat_practice",
      grantedMaterials: { stone: EARN.interleaved.material },
    });
    expect(cluster.tables.resource_grant_ledger).toHaveLength(2);

    const exactDelta =
      lessonMaterialAmountAfterFounding(nodeId) + EARN.interleaved.material;
    expect((await service.read("jwt", "prehistoric")).body).toMatchObject({
      wallet: { spendable: exactDelta },
    });

    const restarted = serviceFor(cluster);
    const replay = await restarted.act("jwt", {
      action: "practice_complete",
      nodeId,
      evidenceId: repeatSetId,
    });
    expect(replay.status).toBe(200);
    expect(replay.body).toMatchObject({ applied: false, grantedMaterials: {} });
    expect(cluster.tables.resource_grant_ledger).toHaveLength(2);
    expect((await restarted.read("jwt", "prehistoric")).body).toMatchObject({
      wallet: { spendable: exactDelta },
    });
  });

  it("refuses every grant-capable action when its server-owned evidence is absent", async () => {
    const forged = [
      { action: "found_diagnostic_prefix" },
      {
        action: "found_island",
        eraId: "cyberpunk",
        authority: { source: "diagnostic" },
      },
      { action: "lesson_complete", nodeId: "NUM.S" },
      {
        action: "practice_complete",
        nodeId: "NUM.S",
        evidenceId: "missing-practice-set",
      },
      { action: "interleaved", sessionId: "invented", responses: [] },
    ] as const;

    // Non-vacuous and behavior-scoped: these are the five actions that can add a grant
    // ledger row, regardless of which helper currently implements each one.
    expect(forged).toHaveLength(5);
    for (const action of forged) {
      const { cluster, service } = harness();
      const response = await service.act("jwt", action);
      // An all-miss diagnostic legitimately opens Era 1, whose founding amount is zero.
      expect(response.status, action.action).toBe(
        action.action === "found_diagnostic_prefix" ? 200 : 403,
      );
      expect(cluster.tables.resource_grant_ledger, action.action).toEqual([]);
      expect(cluster.tables.interleaved_practice_clear, action.action).toEqual([]);
      if (action.action === "found_diagnostic_prefix") {
        expect(cluster.tables.city_island_state.map((row) => row.island_era)).toEqual([
          "prehistoric",
        ]);
        expect(cluster.tables.island_unlock_authority).toHaveLength(1);
      } else {
        expect(cluster.tables.city_island_state, action.action).toEqual([]);
        expect(cluster.tables.island_unlock_authority, action.action).toEqual([]);
      }
    }
  });

  it("persists an authoritatively graded interleaved clear across a service restart", async () => {
    const era = getEraOrThrow("prehistoric");
    const { cluster, service } = harness({
      city_state: [
        {
          student_id: STUDENT,
          era_id: era.id,
          current_island: era.id,
          road_gold_spent: 0,
          next_damage_ordinal: 1,
        },
      ],
      city_island_state: [
        {
          student_id: STUDENT,
          island_era: era.id,
          road_gold_spent: 0,
          civic_material_spent: 0,
          next_damage_ordinal: 1,
          reset_count: 0,
        },
      ],
      student_node_state: era.nodes.map(practicedNode),
    });
    const action = {
      action: "interleaved",
      sessionId: "verified-round",
      responses: correctPrehistoricRound(),
    } as const;
    expect(action.responses).toHaveLength(era.nodes.length);
    expect(era.nodes.length).toBeGreaterThanOrEqual(2);

    const cleared = await service.act("jwt", action);
    expect(cleared.status).toBe(200);
    expect(cleared.body).toMatchObject({ applied: true, paidSets: 1 });
    expect(cluster.tables.interleaved_practice_clear).toHaveLength(1);

    // A new service instance has no process memory from the first request. Its replay and
    // read can only know the clear through the shared durable store.
    const restarted = serviceFor(cluster);
    const replay = await restarted.act("jwt", action);
    expect(replay.body).toMatchObject({ applied: false, paidSets: 1 });
    expect(cluster.tables.interleaved_practice_clear).toHaveLength(1);
    expect((await restarted.read("jwt", era.id)).body).toMatchObject({
      appliedEventIds: [interleavedEventId(action.sessionId)],
      interleavedClearIds: [action.sessionId],
    });
  });

  it("keeps authoritative answer verification while applying the approved struggle payout band", async () => {
    const era = getEraOrThrow("prehistoric");
    async function paid(struggleLevel: number): Promise<number> {
      const { service } = harness({
        city_state: [
          {
            student_id: STUDENT,
            era_id: era.id,
            current_island: era.id,
            road_gold_spent: 0,
            next_damage_ordinal: 1,
          },
        ],
        city_island_state: [
          {
            student_id: STUDENT,
            island_era: era.id,
            road_gold_spent: 0,
            civic_material_spent: 0,
            next_damage_ordinal: 1,
            reset_count: 0,
          },
        ],
        student_node_state: era.nodes.map(practicedNode),
      });
      const result = await service.act("jwt", {
        action: "interleaved",
        sessionId: `struggle-${struggleLevel}`,
        responses: correctPrehistoricRound(),
        struggleLevel,
      });
      expect(result.status).toBe(200);
      return (
        (result.body as { grantedMaterials?: { stone?: number } }).grantedMaterials
          ?.stone ?? 0
      );
    }

    expect(await paid(0)).toBe(EARN.interleaved.materialFloor);
    expect(await paid(1)).toBe(EARN.interleaved.material);
  });

  it("derives a repair target, era, and authored price from durable damage", async () => {
    const authoredCost = hardWinterRepairPrices().per_building;
    const { cluster, service } = harness({
      resource_grant_ledger: [
        {
          student_id: STUDENT,
          event_id: "lesson_complete:NUM.S",
          resource_type: "stone",
          kind: "grant",
          amount: authoredCost + 20,
          reason_code: "lesson_complete",
          era_id: "prehistoric",
          created_at: "2026-08-06T00:00:00.000Z",
        },
      ],
      city_island_state: [
        {
          student_id: STUDENT,
          island_era: "prehistoric",
          road_gold_spent: 0,
          civic_material_spent: 0,
          next_damage_ordinal: 2,
          reset_count: 0,
        },
      ],
      city_crisis_damage: [
        {
          student_id: STUDENT,
          island_era: "prehistoric",
          damage_ordinal: 1,
          damage_id: "d1",
          subject_kind: "building",
          subject: "NUM.S",
        },
      ],
    });

    const repaired = await service.act("jwt", {
      action: "repair",
      damageId: "d1",
      subjectKind: "building",
      subject: "NUM.S",
      // Both values are deliberately forged. Neither is authority.
      cost: 1,
      eraId: "cyberpunk",
    });

    expect(repaired.status).toBe(200);
    expect(repaired.body).toMatchObject({
      status: "spent",
      cost: authoredCost,
      spendable: 20,
    });
    expect(cluster.tables.city_crisis_damage).toEqual([]);
    expect(
      cluster.tables.resource_grant_ledger.find((row) => row.kind === "spend")?.amount,
    ).toBe(authoredCost);
  });

  it("does not spend material already committed to server-priced durable roads", async () => {
    const authoredCost = hardWinterRepairPrices().per_building;
    const { cluster, service } = harness({
      resource_grant_ledger: [
        {
          student_id: STUDENT,
          event_id: "lesson_complete:NUM.S",
          resource_type: "stone",
          kind: "grant",
          amount: authoredCost + 20,
          reason_code: "lesson_complete",
          era_id: "prehistoric",
          created_at: "2026-08-06T00:00:00.000Z",
        },
      ],
      city_island_state: [
        {
          student_id: STUDENT,
          island_era: "prehistoric",
          road_gold_spent: 30,
          civic_material_spent: 0,
          next_damage_ordinal: 2,
          reset_count: 0,
        },
      ],
      city_crisis_damage: [
        {
          student_id: STUDENT,
          island_era: "prehistoric",
          damage_ordinal: 1,
          damage_id: "d1",
          subject_kind: "building",
          subject: "NUM.S",
        },
      ],
    });

    const refused = await service.act("jwt", {
      action: "repair",
      damageId: "d1",
      subjectKind: "building",
      subject: "NUM.S",
    });

    expect(refused.body).toMatchObject({
      status: "insufficient_material",
      spendable: 50,
      cost: 0,
    });
    expect(cluster.tables.city_crisis_damage).toHaveLength(1);
    expect(cluster.tables.resource_grant_ledger).toHaveLength(1);
  });

  it("cannot spend against damage that is absent from the durable city", async () => {
    const { cluster, service } = harness({
      resource_grant_ledger: [
        {
          student_id: STUDENT,
          event_id: "seed:repair-funds",
          resource_type: "stone",
          kind: "grant",
          amount: 100,
          reason_code: "seed",
          era_id: "prehistoric",
          created_at: "2026-08-06T00:00:00.000Z",
        },
      ],
    });

    const forged = await service.act("jwt", {
      action: "repair",
      damageId: "d99",
      subjectKind: "building",
      subject: "NUM.S",
      cost: 1,
      eraId: "prehistoric",
    });

    expect(forged.status).toBe(404);
    expect(forged.body).toMatchObject({ error: "damage_not_found" });
    expect(
      cluster.tables.resource_grant_ledger.filter((row) => row.kind === "spend"),
    ).toEqual([]);
  });

  it("reads an already-settled repair back after its durable damage row is gone", async () => {
    const cost = hardWinterRepairPrices().per_building;
    const { service } = harness({
      resource_grant_ledger: [
        {
          student_id: STUDENT,
          event_id: "lesson_complete:NUM.S",
          resource_type: "stone",
          kind: "grant",
          amount: cost + 20,
          reason_code: "lesson_complete",
          era_id: "prehistoric",
          created_at: "2026-08-06T00:00:00.000Z",
        },
        {
          student_id: STUDENT,
          event_id: "repair:d1:building:NUM.S",
          resource_type: "stone",
          kind: "spend",
          amount: cost,
          reason_code: "repair:d1:building:NUM.S",
          era_id: "prehistoric",
          created_at: "2026-08-06T00:01:00.000Z",
        },
      ],
      city_island_state: [
        {
          student_id: STUDENT,
          island_era: "prehistoric",
          road_gold_spent: 0,
          civic_material_spent: 0,
          next_damage_ordinal: 2,
          reset_count: 0,
        },
      ],
    });

    const replay = await service.act("jwt", {
      action: "repair",
      damageId: "d1",
      subjectKind: "building",
      subject: "NUM.S",
    });

    expect(replay.status).toBe(200);
    expect(replay.body).toMatchObject({
      status: "already_spent",
      spendable: 20,
      cost,
    });
  });

  it("authenticates before either a wallet read or write reaches storage", async () => {
    const { cluster, service } = harness();
    expect((await service.read(null, "prehistoric")).status).toBe(401);
    expect(
      (
        await service.act(null, {
          action: "found_island",
          eraId: "neolithic",
          authority: { source: "diagnostic" },
        })
      ).status,
    ).toBe(401);
    expect(cluster.issued).toEqual([]);
  });
});
