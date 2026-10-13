import type { CompletedWalkDiagnostic, DiagnosticItem, StageAdvance } from "@cr/diagnostic";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createServerDiagnosticClient } from "./serverRuntime";

const STUDENT = "00000000-0000-4000-8000-000000000abc";

const ITEM: DiagnosticItem = {
  item_version_id: "D1.NUM.S.L2.A#1",
  node_id: "NUM.S",
  difficulty: 2,
  item_definition_hash: "hash",
};

/** A token getter double (the Cognito access-token resolver the client depends on). */
function tokenGetter(token: string | null): () => Promise<string | null> {
  return async () => token;
}

/**
 * A REAL `Response`, not `{ ok, status, json }` cast to one. The client no longer takes
 * the body through `json()` — it reads the text so it can quote back a body that is not
 * JSON at all — and a double that implements only the method the code used to call is a
 * double that decides what the code is allowed to do. `ok` is derived from the status here
 * for the same reason: an object literal could claim `ok: true` on a 500.
 *
 * A `Response` body can be read exactly ONCE, so every call site below builds a fresh one
 * per fetch (`mockResolvedValueOnce(...)` per response, or `vi.fn(async () => ...)`) rather
 * than sharing one instance across calls. That is true of the real thing too.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function bodyOf(call: unknown): { action: string; administration_id?: string } {
  const init = (call as [string, RequestInit])[1];
  return JSON.parse(init.body as string);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createServerDiagnosticClient", () => {
  it("POSTs start/submit/finalize with the bearer token and maps each response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ administration_id: "adm-1", stage_id: "ROUTING", items: [ITEM] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          complete: false,
          stage_id: "HARDER",
          items: [ITEM],
        } as StageAdvance),
      )
      .mockResolvedValueOnce(jsonResponse({ complete: true } as StageAdvance))
      .mockResolvedValueOnce(
        jsonResponse({
          coverage: {
            coverage: 1,
            coverage_measured: 1,
            weighted_passed: 1,
            weighted_passed_measured: 1,
            weighted_total: 1,
          },
          per_domain_coverage: {},
          resolved: [{ node_id: "NUM.S", status: "passed", source: "measured" }],
          administration: { purpose: "pre", form_id: "A" },
          placement_by_node: { "NUM.S": 3 },
          probed_node_count: 1,
          path: ["NUM.S"],
        } as unknown as CompletedWalkDiagnostic),
      );
    vi.stubGlobal("fetch", fetchMock);

    const client = createServerDiagnosticClient({
      getAccessToken: tokenGetter("jwt-123"),
      apiUrl: "https://fn.example/diagnostic",
      studentId: STUDENT,
    });
    expect(client.mode).toBe("server");

    const run = client.begin("pre");
    const served = await run.start();
    expect(served.administrationId).toBe("adm-1");
    expect(served.items).toHaveLength(1);

    const first = await run.submitStage([]);
    expect(first.complete).toBe(false);
    const second = await run.submitStage([]);
    expect(second.complete).toBe(true);

    const completed = await run.finalize();
    expect(completed.coverage.coverage).toBe(1);

    // Endpoint + bearer token on every call; the actions + resolved administration id.
    const firstCall = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(firstCall[0]).toBe("https://fn.example/diagnostic");
    expect(firstCall[1].method).toBe("POST");
    expect(new Headers(firstCall[1].headers).get("authorization")).toBe("Bearer jwt-123");
    expect(bodyOf(fetchMock.mock.calls[0]).action).toBe("start");
    expect(bodyOf(fetchMock.mock.calls[1]).action).toBe("submitStage");
    expect(bodyOf(fetchMock.mock.calls[1]).administration_id).toBe("adm-1");
    expect(bodyOf(fetchMock.mock.calls[3]).action).toBe("finalize");
    expect(bodyOf(fetchMock.mock.calls[3]).administration_id).toBe("adm-1");
  });

  it("surfaces the server's error message on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "forbidden" }, 403)),
    );
    const client = createServerDiagnosticClient({
      getAccessToken: tokenGetter("jwt"),
      apiUrl: "u",
      studentId: STUDENT,
    });
    await expect(client.begin("pre").start()).rejects.toThrow(/forbidden/);
  });

  it("refuses to call the server without an auth session", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const client = createServerDiagnosticClient({
      getAccessToken: tokenGetter(null),
      apiUrl: "u",
      studentId: STUDENT,
    });
    await expect(client.begin("pre").start()).rejects.toThrow(/sign in/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads the paired measurement from GET /api/measurement with the bearer token", async () => {
    // The parameters are declared, unused, so `mock.calls[0]` is typed as a fetch call and
    // the assertions below can read the URL and the init off it.
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse(null),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = createServerDiagnosticClient({
      getAccessToken: tokenGetter("jwt-xyz"),
      apiUrl: "https://fn.example/diagnostic",
      studentId: STUDENT,
    });

    expect(await client.measurement()).toBeNull();

    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe("https://fn.example/measurement");
    expect(new Headers(call[1].headers).get("authorization")).toBe("Bearer jwt-xyz");
  });
});
