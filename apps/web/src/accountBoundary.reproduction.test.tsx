import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  restoreIdentity: vi.fn(),
  getAccessToken: vi.fn(async () => "access-token"),
  signIn: vi.fn(),
  signUp: vi.fn(),
  confirmSignUp: vi.fn(),
  resendConfirmationCode: vi.fn(),
  forgotPassword: vi.fn(),
  confirmForgotPassword: vi.fn(),
  signOut: vi.fn(),
}));

const createCognitoAuthService = vi.hoisted(() => vi.fn(() => auth));
const localAdapters = vi.hoisted(() => ({
  cityPersistence: vi.fn(),
  economy: vi.fn(),
}));

vi.mock("./auth/cognitoClient", () => ({
  CognitoOperationError: class CognitoOperationError extends Error {
    code = "UnknownError";
  },
  createCognitoAuthService,
}));

vi.mock("./devPersistence/devSession", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./devPersistence/devSession")>();
  return {
    ...actual,
    createDevSessionStore(
      ...args: Parameters<typeof actual.createDevSessionStore>
    ): ReturnType<typeof actual.createDevSessionStore> {
      localAdapters.cityPersistence();
      return actual.createDevSessionStore(...args);
    },
  };
});

vi.mock("./economy/economyClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./economy/economyClient")>();
  return {
    ...actual,
    createEconomyClient(
      ...args: Parameters<typeof actual.createEconomyClient>
    ): ReturnType<typeof actual.createEconomyClient> {
      localAdapters.economy();
      return actual.createEconomyClient(...args);
    },
  };
});

import { App } from "./App";

afterEach(() => {
  cleanup();
  auth.restoreIdentity.mockReset();
  auth.getAccessToken.mockClear();
  createCognitoAuthService.mockClear();
  localAdapters.cityPersistence.mockClear();
  localAdapters.economy.mockClear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

function configureBackendProduction(): void {
  vi.stubEnv("DEV", false);
  vi.stubEnv("PROD", true);
  vi.stubEnv("VITE_ACCOUNT_APP_ENABLED", "true");
  vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "us-east-1_pool");
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "public-client");
  vi.stubEnv("VITE_AWS_REGION", "us-east-1");
  vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "/api/diagnostic");
}

describe("pre-slice account-boundary reproductions", () => {
  it("does not let an anonymous production visitor enter the local city", async () => {
    configureBackendProduction();
    auth.restoreIdentity.mockResolvedValue(null);
    window.history.replaceState(null, "", "/");

    render(<App />);
    await waitFor(() => expect(auth.restoreIdentity).toHaveBeenCalled());

    expect(screen.queryByRole("button", { name: "Start at Era 1" })).toBeNull();
    // The front door: a start screen leading with Create account, and no city behind it.
    expect(screen.getByTestId("account-welcome")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("constructs no local persistence or economy adapter for an authenticated account", async () => {
    configureBackendProduction();
    auth.restoreIdentity.mockResolvedValue({
      studentId: "11111111-1111-4111-8111-111111111111",
      email: "learner@example.test",
    });
    const fetchSpy = vi.fn(() => new Promise<Response>(() => undefined));
    vi.stubGlobal("fetch", fetchSpy);

    render(<App />);
    /*
      THE ORDINARY ROUTE DRAWS NOTHING IT COULD HAVE TO TAKE BACK. The city read here never
      settles (`fetchSpy` returns a pending promise), and while it is pending the learner is
      told that and nothing else: no start choice, because offering "Start at Era 1" to an
      account whose progression is unknown is the reset this path exists to prevent, and no
      city, because there is nothing yet to draw one from. See `launch/useAccountLaunch.ts`.
    */
    expect(await screen.findByTestId("launch-loading")).toBeVisible();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Start at Era 1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Take the diagnostic" })).toBeNull();

    expect(localAdapters.cityPersistence).not.toHaveBeenCalled();
    expect(localAdapters.economy).not.toHaveBeenCalled();
  });

  it("keeps exact /demo frontend-only even when account configuration is present", async () => {
    configureBackendProduction();
    window.history.replaceState(null, "", "/demo?era=classical");
    auth.restoreIdentity.mockResolvedValue({
      studentId: "11111111-1111-4111-8111-111111111111",
      email: "learner@example.test",
    });
    localStorage.setItem("cr.account.preference", "keep");
    localStorage.setItem(
      "CognitoIdentityServiceProvider.public-client.user.accessToken",
      "account-token",
    );
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(<App />);
    expect(
      await screen.findByText(/Progress is stored only on this device/i),
    ).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Start at Era 1" }));

    expect(createCognitoAuthService).not.toHaveBeenCalled();
    expect(auth.restoreIdentity).not.toHaveBeenCalled();
    expect(auth.getAccessToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    const keys = Object.keys(localStorage);
    const demoKeys = keys.filter((key) => key.startsWith("cr.demo."));
    expect(demoKeys.length).toBeGreaterThan(0);
    expect(
      keys.filter((key) => key.startsWith("cr.") && key !== "cr.account.preference"),
    ).toEqual(demoKeys);
    expect(localStorage.getItem("cr.account.preference")).toBe("keep");
    expect(
      localStorage.getItem("CognitoIdentityServiceProvider.public-client.user.accessToken"),
    ).toBe("account-token");
  });

  it("re-resolves demo and protected account modes on popstate", async () => {
    configureBackendProduction();
    auth.restoreIdentity.mockResolvedValue(null);
    window.history.replaceState(null, "", "/demo");
    render(<App />);
    expect(
      await screen.findByText(/Progress is stored only on this device/i),
    ).toBeVisible();

    window.history.pushState(null, "", "/sign-in");
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(
      await screen.findByRole("heading", { name: "Sign in to your account" }),
    ).toBeVisible();
    expect(createCognitoAuthService).toHaveBeenCalledTimes(1);
  });

  it("treats /demo/ as a protected learner route, not as the showcase", async () => {
    configureBackendProduction();
    auth.restoreIdentity.mockResolvedValue(null);
    window.history.replaceState(null, "", "/demo/");
    render(<App />);

    // The protected front door, which is what any non-exact path gets.
    expect(await screen.findByTestId("account-welcome")).toBeVisible();
    expect(screen.queryByText(/Progress is stored only on this device/i)).toBeNull();
  });

  it("shows missing production configuration instead of an anonymous city", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_ACCOUNT_APP_ENABLED", "true");
    vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "");
    vi.stubEnv("VITE_COGNITO_CLIENT_ID", "");
    vi.stubEnv("VITE_AWS_REGION", "");
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");

    render(<App />);
    expect(screen.getByRole("heading", { name: "Account app unavailable" })).toBeVisible();
    expect(screen.getByText(/VITE_COGNITO_USER_POOL_ID/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Start at Era 1" })).toBeNull();
    expect(createCognitoAuthService).not.toHaveBeenCalled();
  });
});
