import type { MasteryService, SubmitAssessmentEvidenceInput } from "@cr/mastery-service";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiResponseError } from "../api";
import { type ApiMasteryServiceDeps, createApiMasteryService } from "./apiMasteryService";

function input(): SubmitAssessmentEvidenceInput {
  return {
    student_id: "22222222-2222-4222-8222-222222222222",
    context: "lesson",
    node_id: "NUM.1",
    evidence_id: "attempt-1",
    responses: Array.from({ length: 5 }, (_, index) => ({
      item_id: `item-${index}`,
      item_version: 1,
      raw_answer: String(index),
      hints_used: 0,
      revealed: false,
      attempt: 1,
      time_on_item_ms: 100,
    })),
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the account mastery client", () => {
  it("sends raw evidence without a student identity or client verdict", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        node_id: "NUM.1",
        mastery: 3,
        changed: true,
        completion_status: "complete",
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const service = createApiMasteryService({
      baseUrl: "https://example.test/api",
      getToken: async () => "jwt",
      fallback: {
        submitAssessmentEvidence: vi.fn(),
      },
    } as ApiMasteryServiceDeps);

    await expect(service.submitAssessmentEvidence(input())).resolves.toMatchObject({
      mastery: 3,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty("student_id");
    expect(body).not.toHaveProperty("mastery");
    expect(body.evidence_id).toBe("attempt-1");
    expect(body.responses).toHaveLength(5);
    for (const response of body.responses as Record<string, unknown>[]) {
      expect(response).not.toHaveProperty("correct");
      expect(response).not.toHaveProperty("client_correct");
      expect(response).not.toHaveProperty("mastery");
    }
  });

  it("rejects a failed account write instead of substituting session-memory mastery", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "try again" }, 503)),
    );
    const fallback: MasteryService = {
      submitAssessmentEvidence: vi.fn(async () => ({
        node_id: "NUM.1",
        mastery: 3 as const,
        changed: true,
        completion_status: "complete" as const,
      })),
    };
    const service = createApiMasteryService({
      baseUrl: "https://example.test/api",
      getToken: async () => "jwt",
      fallback,
    } as ApiMasteryServiceDeps);

    await expect(service.submitAssessmentEvidence(input())).rejects.toMatchObject({
      status: 503,
    } satisfies Partial<ApiResponseError>);
    expect(fallback.submitAssessmentEvidence).not.toHaveBeenCalled();
  });

  it("rejects a malformed success body rather than treating it as persisted mastery", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ saved: true })),
    );
    const fallback: MasteryService = {
      submitAssessmentEvidence: vi.fn(async () => ({
        node_id: "NUM.1",
        mastery: 3 as const,
        changed: true,
        completion_status: "complete" as const,
      })),
    };
    const service = createApiMasteryService({
      baseUrl: "https://example.test/api",
      getToken: async () => "jwt",
      fallback,
    } as ApiMasteryServiceDeps);

    await expect(service.submitAssessmentEvidence(input())).rejects.toThrow(
      /mastery.*body/i,
    );
    expect(fallback.submitAssessmentEvidence).not.toHaveBeenCalled();
  });
});
