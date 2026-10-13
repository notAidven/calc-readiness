import type { DataApiExecutor, SqlParams } from "@cr/db";
import type { AssessmentAdministration, AssessmentItemResponse } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { createAuroraPlacementWriter } from "./aurora-placement-writer";
import { createAuroraResponseRepository } from "./aurora-response-repository";
import { createAuroraDiagnosticStore } from "./aurora-store";
import {
  computeStudentMeasurement,
  computeStudentReadiness,
  loadAdministrationRecord,
} from "./measurement-read";

interface Call {
  sql: string;
  params: SqlParams | undefined;
}

/**
 * A minimal {@link DataApiExecutor} double: every `query`/`execute` records its
 * SQL + params and `query` settles via `resolver`, which sees the call so a test
 * can return canned rows and assert the exact SQL / binds the adapter issued.
 */
function createFakeExec(resolver: (call: Call) => unknown[]): {
  exec: DataApiExecutor;
  calls: Call[];
} {
  const calls: Call[] = [];
  const exec: DataApiExecutor = {
    async query<T>(sql: string, params?: SqlParams): Promise<T[]> {
      const call = { sql, params };
      calls.push(call);
      return resolver(call) as T[];
    },
    async execute(sql: string, params?: SqlParams): Promise<number> {
      calls.push({ sql, params });
      return 1;
    },
  };
  return { exec, calls };
}

/** Unwrap a `json(...)` bind for assertions. */
function jsonValue(param: unknown): unknown {
  return (param as { value: unknown }).value;
}

function fakeAdministration(
  overrides: Partial<AssessmentAdministration> = {},
): AssessmentAdministration {
  return {
    administration_id: "adm-1",
    student_id: "stu-1",
    purpose: "pre",
    form_id: "A",
    form_version: 1,
    blueprint_version: 1,
    scoring_engine_version: 1,
    scoring_model_version: 1,
    equivalence_checker_version: 1,
    routing_path: ["R", "H"],
    started_at: "2026-07-21T00:00:00.000Z",
    submitted_at: "2026-07-21T00:10:00.000Z",
    ...overrides,
  };
}

function fakeResponse(
  overrides: Partial<AssessmentItemResponse> = {},
): AssessmentItemResponse {
  return {
    administration_id: "adm-1",
    item_version_id: "iv-1",
    node_id: "NUM.S",
    raw_answer: "x",
    item_definition_hash: "hash",
    equivalence_checker_version: 1,
    client_correct: false,
    authoritative_correct: true,
    scoring_status: "correct",
    reason_code: "correct",
    ...overrides,
  };
}

describe("createAuroraDiagnosticStore", () => {
  it("createAdministration inserts a row (server id + started_at) and returns it", async () => {
    const { exec, calls } = createFakeExec(() => [
      fakeAdministration({ routing_path: null, submitted_at: null }),
    ]);

    const administration = await createAuroraDiagnosticStore(exec).createAdministration({
      student_id: "stu-1",
      purpose: "pre",
      form_id: "A",
      form_version: 1,
      blueprint_version: 1,
      scoring_engine_version: 1,
      scoring_model_version: 1,
      equivalence_checker_version: 1,
    });

    expect(administration.student_id).toBe("stu-1");
    expect(administration.routing_path).toBeNull();

    const insert = calls[0];
    expect(insert?.sql).toContain("insert into public.assessment_administration");
    expect(insert?.params?.student_id).toBe("stu-1");
    expect(insert?.params?.submitted_at).toBeNull();
    expect(typeof insert?.params?.started_at).toBe("string");
    expect(typeof insert?.params?.administration_id).toBe("string");
  });

  it("getProgress maps jsonb served/outcomes whether parsed or JSON-text", async () => {
    const served = [
      { item_version_id: "iv-1", stage_id: "R", node_id: "NUM.S", difficulty: 2 },
    ];
    const outcomes = [{ stage_id: "R", role: "routing", responses: [] }];

    const parsed = await createAuroraDiagnosticStore(
      createFakeExec(() => [
        {
          administration_id: "adm-1",
          current_stage_id: "R",
          served,
          outcomes,
          status: "in_progress",
        },
      ]).exec,
    ).getProgress("adm-1");
    expect(parsed?.current_stage_id).toBe("R");
    expect(parsed?.served).toEqual(served);
    expect(parsed?.outcomes).toEqual(outcomes);

    const asText = await createAuroraDiagnosticStore(
      createFakeExec(() => [
        {
          administration_id: "adm-1",
          current_stage_id: "R",
          served: JSON.stringify(served),
          outcomes: JSON.stringify(outcomes),
          status: "in_progress",
        },
      ]).exec,
    ).getProgress("adm-1");
    expect(asText?.served).toEqual(served);
    expect(asText?.outcomes).toEqual(outcomes);
  });

  it("getProgress returns null when there is no working-state row", async () => {
    const { exec } = createFakeExec(() => []);
    expect(await createAuroraDiagnosticStore(exec).getProgress("adm-x")).toBeNull();
  });

  it("saveProgress upserts working state (student id derived from the admin row)", async () => {
    const { exec, calls } = createFakeExec(() => []);
    await createAuroraDiagnosticStore(exec).saveProgress({
      administration_id: "adm-1",
      current_stage_id: "H",
      served: [],
      outcomes: [],
      status: "in_progress",
    });

    const call = calls[0];
    expect(call?.sql).toContain("assessment_administration_progress");
    expect(call?.sql).toContain("on conflict");
    expect(call?.sql).toContain("a.student_id");
    expect(call?.params?.administration_id).toBe("adm-1");
    expect(call?.params?.current_stage_id).toBe("H");
    expect(jsonValue(call?.params?.served)).toEqual([]);
    expect(typeof call?.params?.updated_at).toBe("string");
  });

  it("finalizeAdministration writes routing_path + submitted_at only", async () => {
    const { exec, calls } = createFakeExec(() => [
      fakeAdministration({ routing_path: ["R", "H"] }),
    ]);
    const finalized = await createAuroraDiagnosticStore(exec).finalizeAdministration({
      administration_id: "adm-1",
      routing_path: ["R", "H"],
    });

    expect(finalized.routing_path).toEqual(["R", "H"]);
    expect(finalized.submitted_at).not.toBeNull();
    const call = calls[0];
    expect(call?.sql).toContain("update public.assessment_administration");
    expect(call?.sql).toContain("returning");
    expect(jsonValue(call?.params?.routing_path)).toEqual(["R", "H"]);
    expect(typeof call?.params?.submitted_at).toBe("string");
  });

  it("getAdministration throws when the row is missing", async () => {
    const { exec } = createFakeExec(() => []);
    await expect(
      createAuroraDiagnosticStore(exec).getAdministration("adm-x"),
    ).rejects.toThrow(/unknown administration/);
  });
});

describe("createAuroraResponseRepository", () => {
  it("appends the immutable response row (never binds seq)", async () => {
    const { exec, calls } = createFakeExec(() => []);
    await createAuroraResponseRepository(exec).append(fakeResponse());

    const call = calls[0];
    expect(call?.sql).toContain("insert into public.assessment_item_response");
    expect(call?.sql).not.toContain("seq");
    expect(call?.params?.item_version_id).toBe("iv-1");
    expect(call?.params?.authoritative_correct).toBe(true);
    expect(jsonValue(call?.params?.raw_answer)).toBe("x");
  });
});

describe("createAuroraPlacementWriter", () => {
  it("inserts placement once (on conflict do nothing preserves the seed)", async () => {
    const { exec, calls } = createFakeExec(() => []);
    await createAuroraPlacementWriter(exec).writePlacement({
      student_id: "stu-1",
      node_id: "NUM.S",
      placement_estimate: 2,
    });

    const call = calls[0];
    expect(call?.sql).toContain("insert into public.student_node_state");
    expect(call?.sql).toContain("on conflict (student_id, node_id) do nothing");
    expect(call?.params).toMatchObject({
      student_id: "stu-1",
      node_id: "NUM.S",
      placement_estimate: 2,
    });
  });
});

describe("measurement read path", () => {
  it("loadAdministrationRecord reads the admin then responses ordered by seq", async () => {
    const { exec, calls } = createFakeExec((call) =>
      call.sql.includes("assessment_item_response")
        ? [
            fakeResponse({ item_version_id: "iv-1" }),
            fakeResponse({ item_version_id: "iv-2" }),
          ]
        : [fakeAdministration()],
    );

    const record = await loadAdministrationRecord(exec, "adm-1");
    expect(record.administration.administration_id).toBe("adm-1");
    expect(record.responses).toHaveLength(2);

    const responsesCall = calls.find((call) =>
      call.sql.includes("assessment_item_response"),
    );
    expect(responsesCall?.sql).toMatch(/order by\s+seq\s+asc/i);
  });

  it("computeStudentMeasurement returns null without a finalized pre AND post", async () => {
    const { exec, calls } = createFakeExec(() => []);
    expect(await computeStudentMeasurement(exec, "stu-1")).toBeNull();

    const call = calls[0];
    expect(call?.sql).toContain("purpose in ('pre', 'post')");
    expect(call?.sql).toContain("submitted_at is not null");
  });

  it("computeStudentMeasurement pairs the latest pre + post and computes the gain", async () => {
    const preAdmin = fakeAdministration({
      administration_id: "adm-pre",
      purpose: "pre",
      form_id: "A",
      routing_path: ["R", "E"],
    });
    const postAdmin = fakeAdministration({
      administration_id: "adm-post",
      purpose: "post",
      form_id: "B",
      routing_path: ["R", "H"],
    });

    const { exec } = createFakeExec((call) => {
      if (call.sql.includes("purpose in")) {
        return [postAdmin, preAdmin];
      }
      const id = call.params?.id;
      if (call.sql.includes("assessment_item_response")) {
        return id === "adm-pre"
          ? [...routingResponses("adm-pre", false), ...easyResponses("adm-pre", true)]
          : [...routingResponses("adm-post", true), ...hardResponses("adm-post", true)];
      }
      return [id === "adm-pre" ? preAdmin : postAdmin];
    });

    const measurement = await computeStudentMeasurement(exec, "stu-1");
    expect(measurement?.status).toBe("computed");
    expect(measurement?.ability_gain).not.toBeNull();
    expect(measurement?.ability_gain).toBeGreaterThan(0);
  });

  it("computeStudentReadiness dispatches to the ability metric for a v1 pair", async () => {
    // fakeAdministration is scoring_model_version 1 → the θ (ability) branch.
    const preAdmin = fakeAdministration({
      administration_id: "adm-pre",
      purpose: "pre",
      form_id: "A",
      routing_path: ["R", "E"],
    });
    const postAdmin = fakeAdministration({
      administration_id: "adm-post",
      purpose: "post",
      form_id: "B",
      routing_path: ["R", "H"],
    });

    const { exec } = createFakeExec((call) => {
      if (call.sql.includes("purpose in")) {
        return [postAdmin, preAdmin];
      }
      const id = call.params?.id;
      if (call.sql.includes("assessment_item_response")) {
        return id === "adm-pre"
          ? [...routingResponses("adm-pre", false), ...easyResponses("adm-pre", true)]
          : [...routingResponses("adm-post", true), ...hardResponses("adm-post", true)];
      }
      return [id === "adm-pre" ? preAdmin : postAdmin];
    });

    const readiness = await computeStudentReadiness(exec, "stu-1");
    expect(readiness?.model).toBe("ability");
    if (readiness?.model === "ability") {
      expect(readiness.measurement.status).toBe("computed");
      expect(readiness.measurement.ability_gain).toBeGreaterThan(0);
    }
  });
});

const ROUTING_NODES = ["NUM.S", "NUM.F", "NUM.3", "NUM.2", "NUM.4", "NUM.5"];
const ROOT_NODES = ["NUM.S", "NUM.F", "NUM.3"];
const HIGHER_NODES = ["NUM.2", "NUM.4", "NUM.5"];

function makeResponses(
  administrationId: string,
  stage: string,
  nodes: readonly string[],
  correct: boolean,
): AssessmentItemResponse[] {
  return nodes.map((node, index) =>
    fakeResponse({
      administration_id: administrationId,
      item_version_id: `${administrationId}:${stage}:${index}`,
      node_id: node,
      authoritative_correct: correct,
      scoring_status: correct ? "correct" : "incorrect",
    }),
  );
}

const routingResponses = (administrationId: string, correct: boolean) =>
  makeResponses(administrationId, "R", ROUTING_NODES, correct);
const easyResponses = (administrationId: string, correct: boolean) =>
  makeResponses(administrationId, "E", ROOT_NODES, correct);
const hardResponses = (administrationId: string, correct: boolean) =>
  makeResponses(administrationId, "H", HIGHER_NODES, correct);
