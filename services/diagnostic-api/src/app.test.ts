import type {
  DiagnosticServer,
  DiagnosticServerRequest,
  DiagnosticServerResponse,
} from "@cr/diagnostic-runtime";
import { describe, expect, it } from "vitest";

import { createDiagnosticApi } from "./app";

const ORIGIN = "https://app.example.com";

function fakeServer(
  handle: (request: DiagnosticServerRequest) => Promise<DiagnosticServerResponse>,
): DiagnosticServer {
  return { handle };
}

describe("diagnostic api", () => {
  it("GET /api/health returns ok", async () => {
    const app = createDiagnosticApi({
      getServer: () => fakeServer(async () => ({ status: 200, body: {} })),
    });
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("GET /api/metrics returns a cacheable aggregate snapshot", async () => {
    const app = createDiagnosticApi({
      getServer: () => fakeServer(async () => ({ status: 200, body: {} })),
      getBetaMetrics: () => ({
        read: async () => ({
          status: 200,
          body: { registered_users: 12, students_with_progress: 9 },
        }),
      }),
    });

    const res = await app.request("/api/metrics");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ registered_users: 12, students_with_progress: 9 });
    expect(res.headers.get("cache-control")).toContain("s-maxage=300");
  });

  it("POST /api/diagnostic forwards the bearer token + JSON body and mirrors the server", async () => {
    const seen: DiagnosticServerRequest[] = [];
    const app = createDiagnosticApi({
      allowedOrigins: ORIGIN,
      getServer: () =>
        fakeServer(async (request) => {
          seen.push(request);
          return { status: 403, body: { error: "forbidden" } };
        }),
    });

    const res = await app.request("/api/diagnostic", {
      method: "POST",
      headers: {
        authorization: "Bearer jwt-token",
        "content-type": "application/json",
        origin: ORIGIN,
      },
      body: JSON.stringify({ action: "finalize", administration_id: "adm-1" }),
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);

    const first = seen[0];
    expect(first?.token).toBe("jwt-token");
    expect(first?.body).toEqual({ action: "finalize", administration_id: "adm-1" });
  });

  it("answers the CORS preflight without touching the server", async () => {
    let called = false;
    const app = createDiagnosticApi({
      allowedOrigins: ORIGIN,
      getServer: () =>
        fakeServer(async () => {
          called = true;
          return { status: 200, body: {} };
        }),
    });

    const res = await app.request("/api/diagnostic", {
      method: "OPTIONS",
      headers: {
        origin: ORIGIN,
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,content-type",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(called).toBe(false);
  });

  it("propagates a malformed-body 400 from the fetch adapter", async () => {
    const app = createDiagnosticApi({
      getServer: () => fakeServer(async () => ({ status: 200, body: {} })),
    });
    const res = await app.request("/api/diagnostic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    expect(res.status).toBe(400);
  });
});
