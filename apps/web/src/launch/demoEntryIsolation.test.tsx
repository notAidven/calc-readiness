import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * **THE DEMO ENTRY IS NOT WHAT CHANGED, AND THIS IS THE PROOF RATHER THAN THE CLAIM.**
 *
 * The ordinary route got a new launch surface. The exact `/demo` showcase did not, on purpose:
 * that URL is already out with reviewers, so the screen it opens on has to be the screen it
 * opened on. The split is structural — `TitleScreen.tsx` is untouched and still the only launch
 * surface `/demo` can reach, and `launch/LaunchScreen.tsx` is reachable only from account
 * composition — but "structural" is an argument, and an argument is what a guard exists to
 * replace.
 *
 * So this reads the demo route with FULL production account configuration present, which is the
 * condition under which a leak would happen if one were going to, and asks four things of it:
 *
 *  1. it opens on the title screen, with both of its routes, exactly as before;
 *  2. no element of the new launch surface is anywhere in the document;
 *  3. no account machinery is touched — no Cognito service, no token, no network;
 *  4. nothing the new path writes appears in storage, and what is written stays `cr.demo.`.
 *
 * The Presenter address and the era-preview address a reviewer may already be holding are read
 * in the same run, because "demo entry still works" is not evidence about the URLs that were
 * actually sent.
 */

const auth = vi.hoisted(() => ({
  restoreIdentity: vi.fn(async () => null),
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

vi.mock("../auth/cognitoClient", () => ({
  CognitoOperationError: class CognitoOperationError extends Error {
    code = "UnknownError";
  },
  createCognitoAuthService,
}));

vi.mock("../diagnostic/DiagnosticSurface", () => ({
  DiagnosticSurface: () => <div data-testid="diagnostic-stub" />,
}));

import { App } from "../App";
import { LAUNCH_RECORD_PREFIX } from "./launchRecord";

/** Everything the new ordinary launch surface puts in the document. */
const LAUNCH_MARKERS: readonly string[] = [
  '[data-testid="ordinary-launch"]',
  '[data-testid="launch-loading"]',
  '[data-testid="launch-error"]',
  ".launch",
  ".launch__sheet",
  ".launch__action",
];

function configureProductionAccount(): void {
  vi.stubEnv("DEV", false);
  vi.stubEnv("PROD", true);
  vi.stubEnv("VITE_ACCOUNT_APP_ENABLED", "true");
  vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "us-east-1_pool");
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "public-client");
  vi.stubEnv("VITE_AWS_REGION", "us-east-1");
  vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "/api/diagnostic");
}

beforeEach(() => {
  configureProductionAccount();
});

afterEach(() => {
  cleanup();
  createCognitoAuthService.mockClear();
  for (const mock of Object.values(auth)) {
    mock.mockClear();
  }
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

function noLaunchSurfaceAnywhere(where: string): void {
  // Each marker proves it can find its own subject before it is trusted to report an absence:
  // a selector typo would otherwise read as isolation.
  const probes = ["ordinary-launch", "launch-loading", "launch-error"].map((testid) => {
    const probe = document.createElement("div");
    probe.className = "launch launch__sheet launch__action";
    probe.dataset.testid = testid;
    document.body.append(probe);
    return probe;
  });
  const blind = LAUNCH_MARKERS.filter(
    (selector) => document.querySelector(selector) === null,
  );
  for (const probe of probes) {
    probe.remove();
  }
  expect(blind, "a marker below cannot see the surface it is looking for").toEqual([]);

  const found = LAUNCH_MARKERS.filter(
    (selector) => document.querySelector(selector) !== null,
  );
  expect(found, `the ordinary launch surface reached ${where}`).toEqual([]);
}

describe("the ordinary launch path does not reach the demo entry", () => {
  it("opens /demo on the title screen it shipped with, with account config present", async () => {
    window.history.replaceState(null, "", "/demo");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();

    render(<App />);

    // The screen the sent URL opens on, unchanged: heading, both routes, device-only notice.
    expect(
      screen.getByRole("heading", { level: 1, name: "Remedial Calculus" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Take the diagnostic" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Start at Era 1" })).toBeVisible();
    expect(
      await screen.findByText(/Progress is stored only on this device/i),
    ).toBeVisible();
    noLaunchSurfaceAnywhere("the demo title screen");

    // ...and it still enters the demo city in one press.
    await user.click(screen.getByRole("button", { name: "Start at Era 1" }));
    expect(await screen.findByRole("button", { name: "Build" })).toBeVisible();
    noLaunchSurfaceAnywhere("the demo city");

    // No account machinery was touched on the way through.
    expect(createCognitoAuthService).not.toHaveBeenCalled();
    expect(auth.restoreIdentity).not.toHaveBeenCalled();
    expect(auth.getAccessToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    // Storage stays where the demo's own namespace puts it, and the ordinary route's own
    // record — which is keyed by a Cognito subject the demo does not have — is nowhere.
    const keys = Object.keys(localStorage);
    expect(keys.filter((key) => key.startsWith(LAUNCH_RECORD_PREFIX))).toEqual([]);
    expect(keys.filter((key) => key.startsWith("cr.demo.")).length).toBeGreaterThan(0);
    expect(
      keys.filter((key) => key.startsWith("cr.") && !key.startsWith("cr.demo.")),
    ).toEqual([]);
  });

  it("keeps the era-preview address a reviewer may already be holding", async () => {
    window.history.replaceState(null, "", "/demo?era=classical");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Remedial Calculus" }),
    ).toBeVisible();
    expect(await screen.findByText(/Queued preview: era 4/i)).toBeVisible();
    noLaunchSurfaceAnywhere("the demo era preview");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(createCognitoAuthService).not.toHaveBeenCalled();
  });

  it("keeps the Presenter address, which does not go through any launch surface at all", async () => {
    window.history.replaceState(null, "", "/demo?presenter=1");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    render(<App />);

    await waitFor(() =>
      expect(document.querySelector(".presenter-live-app")).not.toBeNull(),
    );
    expect(
      screen.queryByRole("heading", { level: 1, name: "Remedial Calculus" }),
    ).toBeNull();
    noLaunchSurfaceAnywhere("Presenter");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(createCognitoAuthService).not.toHaveBeenCalled();
    expect(
      Object.keys(localStorage).filter((key) => key.startsWith(LAUNCH_RECORD_PREFIX)),
    ).toEqual([]);
  });
});
