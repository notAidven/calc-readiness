import type { StudentNodeState, UUID } from "@cr/state-schema";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The reproduced account hand-off, at the composition root that owns the shared city read.
 *
 * The diagnostic and city paint are small witnesses, not replacements for the behavior under
 * test: the first changes the server's canonical NUM.S row exactly as a successful finalize
 * does, and the second renders the NUM.S mastery returned by App's real `loadCity` prop. App,
 * account launch, the memoized API bundle, and the authenticated city session are all real.
 *
 * Before the fix this reads `0` after Build my city and reports one city GET: remounting the
 * surface only asks the already-hydrated session for its stale pre-diagnostic snapshot.
 */

const STUDENT = "11111111-1111-4111-8111-111111111111" as UUID;

const account = vi.hoisted(() => ({
  city: null as null | { node_states: StudentNodeState[]; placements: unknown[] },
  cityReads: 0,
  finalizes: 0,
  failRehydrate: false,
}));

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

vi.mock("../auth/cognitoClient", () => ({
  CognitoOperationError: class CognitoOperationError extends Error {
    code = "UnknownError";
  },
  createCognitoAuthService: vi.fn(() => auth),
}));

vi.mock("../city/CitySurface", async () => {
  const { useEffect, useState } = await import("react");
  return {
    CitySurface: ({
      loadCity,
    }: {
      loadCity: () => Promise<{ node_states: StudentNodeState[] }>;
    }) => {
      const [mastery, setMastery] = useState<number | null>(null);
      useEffect(() => {
        let active = true;
        void loadCity().then((city) => {
          if (active) {
            setMastery(
              city.node_states.find((state) => state.node_id === "NUM.S")?.mastery ?? -1,
            );
          }
        });
        return () => {
          active = false;
        };
      }, [loadCity]);
      return (
        <output className="city-viewport" data-testid="account-city-mastery" tabIndex={-1}>
          {mastery ?? "loading"}
        </output>
      );
    },
  };
});

vi.mock("../diagnostic/DiagnosticSurface", () => ({
  DiagnosticSurface: ({
    onPretestComplete,
    onExit,
  }: {
    onPretestComplete?: (
      placement: Record<string, number>,
      unlocked: readonly string[],
    ) => void;
    onExit?: () => void;
  }) => (
    <div data-testid="diagnostic-stub">
      <button
        type="button"
        onClick={() => {
          account.finalizes += 1;
          account.city = canonicalCity(3);
          onPretestComplete?.({ "NUM.S": 3 }, ["NUM.S"]);
        }}
      >
        Finalize diagnostic
      </button>
      <button type="button" onClick={onExit}>
        Build my city
      </button>
    </div>
  ),
}));

import { App } from "../App";
import { resetCityEra } from "../city/useCityEra";

function canonicalCity(mastery: 0 | 3) {
  return {
    node_states: [
      {
        student_id: STUDENT,
        node_id: "NUM.S",
        placement_estimate: mastery,
        mastery,
        mastery_updated_at: mastery === 0 ? null : "2026-08-13T23:00:00.000Z",
        completion_status: mastery === 0 ? "in_progress" : "complete",
        lesson_stage: mastery === 0 ? "not_started" : "done",
        last_practiced_at: null,
      } satisfies StudentNodeState,
    ],
    placements: [],
    civic: [],
    roads: [],
    road_gold_spent: 0,
    civic_material_spent: 0,
  };
}

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
  window.history.replaceState(null, "", "/");
  account.city = canonicalCity(0);
  account.cityReads = 0;
  account.finalizes = 0;
  account.failRehydrate = false;
  auth.restoreIdentity.mockResolvedValue({
    studentId: STUDENT,
    email: "learner@example.test",
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        window.location.origin,
      );
      const json = (body: unknown) =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      if (url.pathname === "/api/city" && (init?.method ?? "GET") === "GET") {
        account.cityReads += 1;
        if (account.failRehydrate && account.cityReads > 1) {
          return new Response(JSON.stringify({ error: "canonical city unavailable" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        return json(account.city);
      }
      if (url.pathname === "/api/economy") {
        return json({
          wallet: { materials: {}, spendable: 0, spendableMaterial: null },
          appliedEventIds: [],
        });
      }
      if (url.pathname === "/api/succession" || url.pathname === "/api/plague") {
        return json(null);
      }
      return json({ saved: true });
    }),
  );
});

afterEach(() => {
  cleanup();
  for (const mock of Object.values(auth)) {
    mock.mockReset();
  }
  auth.getAccessToken.mockResolvedValue("access-token");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
  sessionStorage.clear();
  resetCityEra();
  window.history.replaceState(null, "", "/");
});

describe("successful diagnostic to canonical account city", () => {
  it("re-reads once before entry, uses canonical NUM.S mastery, and absorbs a double click", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByTestId("ordinary-launch");
    expect(account.cityReads).toBe(1);
    await user.click(screen.getByRole("button", { name: "Take the diagnostic" }));
    await user.click(await screen.findByRole("button", { name: "Finalize diagnostic" }));

    const build = screen.getByRole("button", { name: "Build my city" });
    fireEvent.click(build);
    fireEvent.click(build);

    await waitFor(() =>
      expect(screen.getByTestId("account-city-mastery")).toHaveTextContent("3"),
    );
    expect(account.finalizes).toBe(1);
    expect(account.cityReads).toBe(2);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("account-city-mastery")).toHaveFocus();
  });

  it("fails closed when canonical rehydrate fails and retries without re-finalizing", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByTestId("ordinary-launch");
    await user.click(screen.getByRole("button", { name: "Take the diagnostic" }));
    await user.click(await screen.findByRole("button", { name: "Finalize diagnostic" }));
    account.failRehydrate = true;
    await user.click(screen.getByRole("button", { name: "Build my city" }));

    const failure = await screen.findByTestId("launch-error");
    expect(failure).toHaveTextContent("canonical city unavailable");
    expect(screen.queryByTestId("account-city-mastery")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(account.finalizes).toBe(1);
    expect(account.cityReads).toBe(2);

    account.failRehydrate = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(screen.getByTestId("account-city-mastery")).toHaveTextContent("3"),
    );
    expect(account.finalizes).toBe(1);
    expect(account.cityReads).toBe(3);
  });
});
