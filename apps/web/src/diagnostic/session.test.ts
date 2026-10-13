import type { UUID } from "@cr/state-schema";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDiagnosticClient } from "./session";

const STUDENT = "00000000-0000-4000-8000-000000000abc" as UUID;
const getAccessToken = async (): Promise<string | null> => "jwt";

afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * The `isServerBacked` gate (Cognito auth AND a configured diagnostic API URL) is
 * the single source of truth for both the client transport here and the city's
 * placement handoff in `App.handlePretestComplete`. These cases pin the transport
 * side; the regression they guard is the Cognito-but-no-API-URL path, where the
 * diagnostic must run in-memory so App seeds placement into the local dev session.
 */
describe("createDiagnosticClient (server-backed gate)", () => {
  it("stays in-memory for a dev session even when the diagnostic API URL is set", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "https://fn.example/diagnostic");
    const client = createDiagnosticClient({
      mode: "dev",
      studentId: STUDENT,
      getAccessToken,
    });
    expect(client.mode).toBe("in-memory");
  });

  it("stays in-memory for a Cognito session when the diagnostic API URL is unset", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    const client = createDiagnosticClient({
      mode: "cognito",
      studentId: STUDENT,
      getAccessToken,
    });
    expect(client.mode).toBe("in-memory");
  });

  it("uses the server client only when Cognito AND the diagnostic API URL are both present", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "https://fn.example/diagnostic");
    const client = createDiagnosticClient({
      mode: "cognito",
      studentId: STUDENT,
      getAccessToken,
    });
    expect(client.mode).toBe("server");
  });
});
