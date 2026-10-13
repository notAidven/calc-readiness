import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * THE CALL SITE, driven — the other half of `economyClientGate.test.ts`.
 *
 * That file pins what {@link createEconomyClient} does when it is asked. This one pins
 * HOW `App` asks it, because the two failed independently: the function ignored its
 * argument, and the call site computed one anyway from `authedCity !== null` — a value
 * that is `null` on the first render by construction (the Cognito identity resolves
 * behind a lazy `import()`) and, behind a ref null-check, is never re-evaluated.
 *
 * So the composition root passed `false` to a server-backed, signed-in app. Measured
 * before the fix, with both env vars set and a signed-in identity resolving:
 *
 * ```
 * createEconomyClient CALL COUNT: 1
 * createEconomyClient ARGS: [false]
 * isEconomyServerBacked(true): true
 * ```
 *
 * The wrapping spy calls THROUGH to the real module, so this is the real composition
 * root running under a real signed-in environment, not a re-implementation of it.
 */

const DEPLOYED_API = "https://api.example.test/api/diagnostic";
const SIGNED_IN_STUDENT = "11111111-2222-4333-8444-555555555555";

const createEconomyClientSpy = vi.hoisted(() => vi.fn());

vi.mock("./economyClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./economyClient")>();
  createEconomyClientSpy.mockImplementation(actual.createEconomyClient);
  return { ...actual, createEconomyClient: createEconomyClientSpy };
});

// A signed-in Cognito user, resolving through the same lazy module `App` imports.
vi.mock("../auth/cognitoClient", () => ({
  getCurrentIdentity: () => Promise.resolve({ studentId: SIGNED_IN_STUDENT }),
  getAccessToken: () => Promise.resolve("test-access-token"),
  subscribeAuthChange: () => () => {},
}));

// Browser-only (KaTeX / canvas widgets), and nothing here enters the diagnostic.
vi.mock("../diagnostic/DiagnosticSurface", () => ({
  DiagnosticSurface: () => null,
}));

const { App } = await import("../App");
const { isEconomyServerBacked } = await import("./economyClient");

beforeEach(() => {
  localStorage.clear();
  createEconomyClientSpy.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe("App — how the composition root opens the economy", () => {
  it("hands it no auth flag, in the deployed environment where one would be wrong", async () => {
    vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "us-east-1_testpool");
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);

    render(<App />);
    // The title screen renders, so the component body — and the client it builds — ran.
    expect(
      await screen.findByRole("heading", { level: 1, name: "Remedial Calculus" }),
    ).toBeInTheDocument();

    expect(createEconomyClientSpy).toHaveBeenCalledTimes(1);
    expect(createEconomyClientSpy).toHaveBeenCalledWith();

    // What the discarded flag was standing in for, and what it got wrong: this is the
    // answer the client is entitled to have on its very first frame.
    expect(isEconomyServerBacked(true)).toBe(true);
  });

  /**
   * The local loop, asserted at the same seam. `npm run dev` configures no endpoint, so
   * the same call must arrive the same way and the dev store must stay live — the team
   * QAs on this path and it is not allowed to change shape in service of the other one.
   */
  it("asks the same way locally, where the dev store is the one that answers", async () => {
    vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "");
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");

    render(<App />);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Remedial Calculus" }),
    ).toBeInTheDocument();

    expect(createEconomyClientSpy).toHaveBeenCalledTimes(1);
    expect(createEconomyClientSpy).toHaveBeenCalledWith();
    expect(isEconomyServerBacked(true)).toBe(false);
  });
});
