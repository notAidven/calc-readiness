import type { DataApiExecutor, SqlParams } from "@cr/db";
import { COVERAGE_SCORING_MODEL_VERSION, type WalkState } from "@cr/diagnostic";
import type { AssessmentAdministration, AssessmentItemResponse } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { createAuroraWalkStore } from "./aurora-walk-store";
import { computeStudentCoverageMeasurement } from "./coverage-read";
import { computeStudentReadiness } from "./measurement-read";

interface Call {
  sql: string;
  params: SqlParams | undefined;
}

/** Minimal {@link DataApiExecutor} double — records every call, `query` settles via `resolver`. */
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

function fakeWalkState(overrides: Partial<WalkState> = {}): WalkState {
  return {
    scope: ["NUM.2"],
    entry_tier: 2,
    target_tier: 2,
    current: "NUM.2",
    probed: {},
    ...overrides,
  };
}

describe("createAuroraWalkStore", () => {
  it("getWalk returns the parsed WalkState whether jsonb-parsed or JSON-text", async () => {
    const state = fakeWalkState({
      probed: { "NUM.2": { outcomes: [true, true], result: "passed", robust: true } },
    });

    const parsed = await createAuroraWalkStore(
      createFakeExec(() => [{ administration_id: "adm-1", state }]).exec,
    ).getWalk("adm-1");
    expect(parsed).toEqual(state);

    const asText = await createAuroraWalkStore(
      createFakeExec(() => [{ administration_id: "adm-1", state: JSON.stringify(state) }])
        .exec,
    ).getWalk("adm-1");
    expect(asText).toEqual(state);
  });

  it("getWalk returns null when there is no walk row", async () => {
    const { exec, calls } = createFakeExec(() => []);
    expect(await createAuroraWalkStore(exec).getWalk("adm-x")).toBeNull();
    expect(calls[0]?.sql).toContain("from public.assessment_administration_walk");
  });

  it("saveWalk upserts state (student id derived from the admin row)", async () => {
    const { exec, calls } = createFakeExec(() => []);
    const state = fakeWalkState();
    await createAuroraWalkStore(exec).saveWalk("adm-1", state);

    const call = calls[0];
    expect(call?.sql).toContain("insert into public.assessment_administration_walk");
    expect(call?.sql).toContain("on conflict (administration_id) do update");
    expect(call?.sql).toContain("a.student_id"); // never trust a client-supplied id
    expect(call?.sql).not.toContain("current_stage_id"); // v2 walk, not v1 stage progress
    expect(call?.params?.administration_id).toBe("adm-1");
    expect(jsonValue(call?.params?.state)).toEqual(state);
    expect(typeof call?.params?.updated_at).toBe("string");
  });
});

// ── Reproducible coverage read (served order) ─────────────────────────────────

function fakeAdministration(
  overrides: Partial<AssessmentAdministration> = {},
): AssessmentAdministration {
  return {
    administration_id: "adm-1",
    student_id: "stu-1",
    purpose: "pre",
    form_id: "A",
    form_version: 1,
    blueprint_version: 2,
    scoring_engine_version: 1,
    scoring_model_version: 2,
    equivalence_checker_version: 1,
    routing_path: ["NUM.2"],
    started_at: "2026-07-21T00:00:00.000Z",
    submitted_at: "2026-07-21T00:10:00.000Z",
    ...overrides,
  };
}

function nodeResponses(
  administrationId: string,
  nodeId: string,
  outcomes: readonly boolean[],
): AssessmentItemResponse[] {
  return outcomes.map((correct, index) => ({
    administration_id: administrationId,
    item_version_id: `${administrationId}:${nodeId}:${index}`,
    node_id: nodeId,
    raw_answer: "answer",
    item_definition_hash: "hash",
    equivalence_checker_version: 1,
    client_correct: false,
    authoritative_correct: correct,
    scoring_status: correct ? "correct" : "incorrect",
    reason_code: correct ? "correct" : "incorrect",
  }));
}

describe("computeStudentCoverageMeasurement", () => {
  it("returns null without a finalized pre AND post (and gates on submitted_at)", async () => {
    const { exec, calls } = createFakeExec(() => []);
    expect(await computeStudentCoverageMeasurement(exec, "stu-1")).toBeNull();

    const call = calls[0];
    expect(call?.sql).toContain("purpose in ('pre', 'post')");
    expect(call?.sql).toContain("submitted_at is not null");
  });

  it("pairs the latest pre + post and recomputes the coverage gain from served-order records", async () => {
    const preAdmin = fakeAdministration({
      administration_id: "adm-pre",
      purpose: "pre",
      form_id: "A",
    });
    const postAdmin = fakeAdministration({
      administration_id: "adm-post",
      purpose: "post",
      form_id: "B",
    });

    const { exec, calls } = createFakeExec((call) => {
      if (call.sql.includes("purpose in")) {
        return [postAdmin, preAdmin];
      }
      const id = call.params?.id;
      if (call.sql.includes("assessment_item_response")) {
        // Broken pre (confirmed fail on NUM.2) vs healthy post (robust pass).
        return id === "adm-pre"
          ? nodeResponses("adm-pre", "NUM.2", [false, false, false])
          : nodeResponses("adm-post", "NUM.2", [true, true]);
      }
      return [id === "adm-pre" ? preAdmin : postAdmin];
    });

    const measurement = await computeStudentCoverageMeasurement(exec, "stu-1", {
      scope: ["NUM.2"],
    });

    expect(measurement?.status).toBe("computed");
    expect(measurement?.student_id).toBe("stu-1");
    expect(measurement?.pre.status).toBe("valid");
    expect(measurement?.post.status).toBe("valid");
    expect(measurement?.pre.coverage).toBe(0); // confirmed fail → no credit
    expect(measurement?.post.coverage).toBeCloseTo(1, 10); // robust pass covers the scope
    expect(measurement?.coverage_gain).toBeGreaterThan(0);

    // Responses were read in served order for the reproducible recompute.
    const responseCall = calls.find((call) =>
      call.sql.includes("assessment_item_response"),
    );
    expect(responseCall?.sql).toMatch(/order by\s+seq\s+asc/i);
  });
});

describe("computeStudentReadiness (unified dispatch, §9 step 5b)", () => {
  /**
   * Both coverage versions dispatch to the coverage recompute, and the SUPERSEDED
   * one is the case that matters.
   *
   * The dispatch used to ask `version === COVERAGE_SCORING_MODEL_VERSION`, which
   * is a correct-looking equality that silently means "is this the CURRENT
   * coverage version". While there was only one, the two readings were the same
   * function. When `scoring_model_version` bumped 2 → 3 for the tail cut they came
   * apart, and every stored record — all of them stamped 2 — routed to the v1 θ
   * branch, where `computeMeasurement` throws looking up an MST stage a walk
   * record has never had. Not a wrong number: an exception on read.
   *
   * The 2 below is therefore a literal on purpose and must not be refreshed to
   * "whatever is current" the next time the version moves. It stands for a record
   * that already exists in the database.
   */
  it.each([
    ["a superseded coverage version (2, what every stored record is stamped)", 2],
    ["the current coverage version", COVERAGE_SCORING_MODEL_VERSION],
  ])("returns a coverage measurement for %s", async (_label, scoring_model_version) => {
    const preAdmin = fakeAdministration({
      administration_id: "adm-pre",
      purpose: "pre",
      form_id: "A",
      scoring_model_version,
    });
    const postAdmin = fakeAdministration({
      administration_id: "adm-post",
      purpose: "post",
      form_id: "B",
      scoring_model_version,
    });

    const { exec } = createFakeExec((call) => {
      if (call.sql.includes("purpose in")) {
        return [postAdmin, preAdmin];
      }
      const id = call.params?.id;
      if (call.sql.includes("assessment_item_response")) {
        return id === "adm-pre"
          ? nodeResponses("adm-pre", "NUM.2", [false, false, false])
          : nodeResponses("adm-post", "NUM.2", [true, true]);
      }
      return [id === "adm-pre" ? preAdmin : postAdmin];
    });

    const readiness = await computeStudentReadiness(exec, "stu-1", { scope: ["NUM.2"] });
    expect(readiness?.model).toBe("coverage");
    if (readiness?.model === "coverage") {
      expect(readiness.measurement.status).toBe("computed");
      expect(readiness.measurement.coverage_gain).toBeGreaterThan(0);
    }
  });

  it("returns null without both a finalized pre and post", async () => {
    const { exec } = createFakeExec(() => []);
    expect(await computeStudentReadiness(exec, "stu-1")).toBeNull();
  });
});
