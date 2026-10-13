import { describe, expect, it } from "vitest";

import { resolveRuntimeMode } from "./runtimeMode";

const ACCOUNT_ENV = {
  DEV: false,
  PROD: true,
  VITE_ACCOUNT_APP_ENABLED: "true",
  VITE_COGNITO_USER_POOL_ID: "us-east-1_pool",
  VITE_COGNITO_CLIENT_ID: "public-client",
  VITE_AWS_REGION: "us-east-1",
  VITE_DIAGNOSTIC_API_URL: "/api/diagnostic",
} as const;

describe("runtime authority resolution", () => {
  it("makes only exact /demo local, including when account outputs are present", () => {
    expect(resolveRuntimeMode("/demo", ACCOUNT_ENV)).toEqual({ mode: "demo" });
    expect(resolveRuntimeMode("/demo/", ACCOUNT_ENV).mode).toBe("account");
    expect(resolveRuntimeMode("/demonstration", ACCOUNT_ENV).mode).toBe("account");
    expect(resolveRuntimeMode("/", ACCOUNT_ENV).mode).toBe("account");
  });

  it("ignores the legacy build-wide demo marker outside /demo", () => {
    expect(
      resolveRuntimeMode("/", {
        ...ACCOUNT_ENV,
        VITE_DEMO_MODE: "true",
      }),
    ).toMatchObject({ mode: "account" });
  });

  it("keeps the zero-backend stand-in behind Vite's compile-time dev gate", () => {
    expect(resolveRuntimeMode("/", { DEV: true, PROD: false })).toEqual({
      mode: "local",
    });
    expect(resolveRuntimeMode("/", { DEV: false, PROD: true })).toEqual({
      mode: "unavailable",
      reason: "rollout_disabled",
      configurationErrors: [],
    });
  });

  it("fails closed and names every missing account output", () => {
    const resolution = resolveRuntimeMode("/", {
      DEV: false,
      PROD: true,
      VITE_ACCOUNT_APP_ENABLED: "true",
    });
    expect(resolution).toEqual({
      mode: "unavailable",
      reason: "invalid_configuration",
      configurationErrors: [
        "VITE_COGNITO_USER_POOL_ID",
        "VITE_COGNITO_CLIENT_ID",
        "VITE_AWS_REGION",
        "VITE_DIAGNOSTIC_API_URL",
      ],
    });
  });

  it("rejects non-stack identifiers and insecure production API endpoints", () => {
    expect(
      resolveRuntimeMode("/", {
        ...ACCOUNT_ENV,
        VITE_COGNITO_USER_POOL_ID: "not-a-pool",
        VITE_COGNITO_CLIENT_ID: "client with spaces",
        VITE_AWS_REGION: "somewhere",
        VITE_DIAGNOSTIC_API_URL: "http://api.example.test/not-diagnostic",
      }),
    ).toEqual({
      mode: "unavailable",
      reason: "invalid_configuration",
      configurationErrors: [
        "VITE_COGNITO_USER_POOL_ID",
        "VITE_COGNITO_CLIENT_ID",
        "VITE_AWS_REGION",
        "VITE_DIAGNOSTIC_API_URL",
      ],
    });
  });
});
