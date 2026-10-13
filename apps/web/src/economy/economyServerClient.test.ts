import { afterEach, describe, expect, it, vi } from "vitest";

import { createServerEconomyClient } from "./economyServerClient";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the authenticated economy adapter sends evidence and subjects, never prices or eras", () => {
  it("forwards raw answers and struggle evidence while omitting caller prices and eras", async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)));
        return new Response(
          JSON.stringify({
            applied: false,
            grantedMaterials: {},
            materials: {},
            paidSets: 0,
            setsRemaining: 10,
            setsBound: 10,
            status: "already_spent",
            spendable: 0,
            cost: 0,
            building: null,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );
    const client = createServerEconomyClient({
      apiBase: "https://example.test/api",
      getToken: async () => "jwt",
    });
    const responses = [{ itemVersionId: "item-v1", rawAnswer: "42" }];

    await client.reportPracticeSetComplete({
      evidenceId: "lesson-set-1",
      nodeId: "NUM.S",
      mastery: 3,
      struggleLevel: 0.25,
    });
    await client.reportInterleavedClear({
      sessionId: "round-1",
      responses,
      struggleLevel: 0.75,
    });
    await client.purchaseCivicBuilding({
      placementId: "civic:prehistoric_longhouse:1",
      building: "prehistoric_longhouse",
    });
    await client.repairRuin({
      damageId: "d1",
      subjectKind: "building",
      subject: "NUM.S",
      cost: 1,
    });
    const authority = {
      source: "exam" as const,
      sessionId: "exam-1",
    };
    await client.recordIslandExamResponse?.({
      eraId: "neolithic",
      sessionId: "exam-1",
      responseId: "exam-1-0",
      sequence: 0,
      response: { itemVersionId: "item-v1", outcome: "answer", rawAnswer: "42" },
    });
    await client.reportIslandFounded({ eraId: "neolithic", authority });
    await client.foundDiagnosticPrefix?.();
    await client.landOnIsland?.({ eraId: "neolithic" });

    expect(bodies).toEqual([
      {
        action: "practice_complete",
        evidenceId: "lesson-set-1",
        nodeId: "NUM.S",
        struggleLevel: 0.25,
      },
      {
        action: "interleaved",
        sessionId: "round-1",
        responses,
        struggleLevel: 0.75,
      },
      {
        action: "purchase_civic",
        placementId: "civic:prehistoric_longhouse:1",
        building: "prehistoric_longhouse",
      },
      {
        action: "repair",
        damageId: "d1",
        subjectKind: "building",
        subject: "NUM.S",
      },
      {
        action: "island_exam_response",
        eraId: "neolithic",
        sessionId: "exam-1",
        responseId: "exam-1-0",
        sequence: 0,
        response: { itemVersionId: "item-v1", outcome: "answer", rawAnswer: "42" },
      },
      {
        action: "found_island",
        eraId: "neolithic",
        authority,
      },
      {
        action: "found_diagnostic_prefix",
      },
      {
        action: "land_island",
        eraId: "neolithic",
      },
    ]);
  });
});
