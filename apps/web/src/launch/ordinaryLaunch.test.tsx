import { ERA_SEQUENCE } from "@cr/skill-graph";
import type { StudentNodeState, UUID } from "@cr/state-schema";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * **THE ORDINARY PRODUCTION ENTRY ROUTE, END TO END, AT THE APP'S OWN COMPOSITION ROOT.**
 *
 * Every test here mounts the real `<App />` with the real account runtime configuration and the
 * real `AccountBoundary`, against a stand-in for two seams and only two: the Cognito service, and
 * `fetch`. Nothing below reaches into the launch modules directly — the claims are about what a
 * learner meets on `/`, which is not a claim any unit test of those modules can discharge.
 *
 * The list it answers, in order:
 *
 *  1. an unauthenticated visitor meets authentication, and no city or start choice behind it;
 *  2. a restored session persists across a reload, and the auth address is normalised away;
 *  3. sign-in hands the learner back to a validated destination, never to the raw one;
 *  4. *Take the diagnostic* enters the real diagnostic flow;
 *  5. *Start at Era 1* enters the real city and initialises the canonical era exactly once;
 *  6. a refresh after either door does not re-ask and does not re-initialise;
 *  7. a returning learner with a city resumes into it, and one in a later era is not reset;
 *  8. signing out returns to authentication;
 *  9. a backend that cannot be reached shows Retry rather than a city or a choice.
 *
 * Demo isolation is the tenth item and lives in `demoEntryIsolation.test.tsx`, because it is a
 * claim about a different route and mixing it in here is how a demo assertion ends up depending
 * on account setup.
 */

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

// The diagnostic surface is browser-only (KaTeX / canvas widgets). Stubbed so the ENTRY into
// the real diagnostic flow is exercisable in jsdom without the diagnostic runtime; the stub
// keeps the hand-off callback, which is the part the launch path is responsible for reaching.
vi.mock("../diagnostic/DiagnosticSurface", () => ({
  DiagnosticSurface: ({
    onPretestComplete,
  }: {
    onPretestComplete?: (
      placement: Record<string, number>,
      unlocked: readonly string[],
    ) => void;
  }) => (
    <div data-testid="diagnostic-stub">
      <button type="button" onClick={() => onPretestComplete?.({}, [])}>
        Finish diagnostic (stub)
      </button>
    </div>
  ),
}));

import { App } from "../App";
import { ERA_STATE_STORAGE_KEY } from "../city/eraState";
import { resetCityEra } from "../city/useCityEra";
import type { CityLoad } from "../city/types";
import { launchRecordKey } from "./launchRecord";

const STUDENT = "11111111-1111-4111-8111-111111111111" as UUID;
const IDENTITY = { studentId: STUDENT, email: "learner@example.test" };
const FIRST_ERA = ERA_SEQUENCE[0]?.id as string;
const LATER_ERA = ERA_SEQUENCE[3]?.id as string;

function node(over: Partial<StudentNodeState> = {}): StudentNodeState {
  return {
    student_id: STUDENT,
    node_id: "NUM.1",
    placement_estimate: 0,
    mastery: 0,
    mastery_updated_at: null,
    completion_status: "in_progress",
    lesson_stage: "not_started",
    last_practiced_at: null,
    ...over,
  };
}

/** A brand-new account's city: node rows exist, nothing has happened to any of them. */
function emptyCity(over: Partial<CityLoad> = {}): CityLoad {
  return {
    node_states: [node(), node({ node_id: "NUM.2" })],
    placements: [],
    civic: [],
    roads: [],
    road_gold_spent: 0,
    civic_material_spent: 0,
    ...over,
  };
}

interface Backend {
  /** Every `GET /api/city` this render made. */
  readonly cityReads: () => number;
  readonly failCity: (failing: boolean) => void;
  readonly failCityWith: (failure: "offline" | 403 | 500) => void;
  readonly hangCity: (hanging: boolean) => void;
  readonly abortedCityReads: () => number;
  readonly cityWrites: () => unknown[];
  readonly bootstrapCalls: () => number;
  readonly failBootstrapWith: (failure: null | "offline" | 401 | 500) => void;
  readonly hangBootstrap: (hanging: boolean) => void;
  readonly abortedBootstraps: () => number;
  readonly markLaunchInitialized: () => void;
}

/**
 * The API as far as the app is concerned: the account's city, the economy read the HUD makes,
 * and a refusal for anything else so an unexpected call is visible rather than silently
 * satisfied.
 */
function stubBackend(initialCity: CityLoad): Backend {
  let city = initialCity;
  let reads = 0;
  let failure: null | "offline" | 403 | 500 | 503 = null;
  let hanging = false;
  let aborted = 0;
  let bootstrapFailure: null | "offline" | 401 | 500 = null;
  let bootstrapHanging = false;
  let bootstrapCalls = 0;
  let abortedBootstraps = 0;
  const writes: unknown[] = [];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        window.location.origin,
      );
      if (url.pathname === "/api/city" && (init?.method ?? "GET") === "GET") {
        reads += 1;
        if (hanging) {
          return new Promise<Response>((_resolve, reject) => {
            const onAbort = () => {
              aborted += 1;
              reject(new DOMException("The operation was aborted.", "AbortError"));
            };
            init?.signal?.addEventListener("abort", onAbort, { once: true });
          });
        }
        if (failure === "offline") {
          throw new TypeError("network unavailable");
        }
        return failure === null
          ? json(city)
          : json({ error: "The city service is unavailable." }, failure);
      }
      if (url.pathname === "/api/city/bootstrap") {
        bootstrapCalls += 1;
        if (bootstrapHanging) {
          return new Promise<Response>((_resolve, reject) => {
            const onAbort = () => {
              abortedBootstraps += 1;
              reject(new DOMException("The operation was aborted.", "AbortError"));
            };
            init?.signal?.addEventListener("abort", onAbort, { once: true });
          });
        }
        if (bootstrapFailure === "offline") {
          throw new TypeError("network unavailable");
        }
        if (bootstrapFailure !== null) {
          return json({ error: "The city bootstrap is unavailable." }, bootstrapFailure);
        }
        city = {
          ...city,
          launch_initialized: true,
          current_island: FIRST_ERA as never,
        };
        return json(city);
      }
      if (url.pathname === "/api/city") {
        writes.push(init?.body ? JSON.parse(String(init.body)) : null);
        return json({ saved: true });
      }
      if (url.pathname === "/api/economy") {
        return json({
          wallet: { materials: {}, spendable: 0, spendableMaterial: null },
          appliedEventIds: [],
        });
      }
      // The two crisis services the city opens a session against on entry. Nothing here
      // exercises them; answering "no sitting in progress" keeps their rejections out of
      // the run so a genuine unexpected call below is visible.
      if (url.pathname === "/api/succession" || url.pathname === "/api/plague") {
        return json(null);
      }
      return json({ error: `unexpected ${url.pathname}` }, 404);
    }),
  );

  return {
    cityReads: () => reads,
    failCity: (value: boolean) => {
      failure = value ? 503 : null;
    },
    failCityWith: (value) => {
      failure = value;
    },
    hangCity: (value: boolean) => {
      hanging = value;
    },
    abortedCityReads: () => aborted,
    cityWrites: () => writes,
    bootstrapCalls: () => bootstrapCalls,
    failBootstrapWith: (value) => {
      bootstrapFailure = value;
    },
    hangBootstrap: (value) => {
      bootstrapHanging = value;
    },
    abortedBootstraps: () => abortedBootstraps,
    markLaunchInitialized: () => {
      city = { ...city, launch_initialized: true };
    },
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
  auth.restoreIdentity.mockResolvedValue(IDENTITY);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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

/** Wait past the launch surface into whichever city or choice the account resolves to. */
async function settled(): Promise<void> {
  await waitFor(() => expect(screen.queryByTestId("launch-loading")).toBeNull(), {
    timeout: 5000,
  });
}

/* ---------------------------------------------------------------- 1. auth gate */

describe("1. the ordinary route puts authentication first", () => {
  it("refuses an unauthenticated visitor a city, a launch choice, and a city read", async () => {
    auth.restoreIdentity.mockResolvedValue(null);
    const backend = stubBackend(emptyCity());

    render(<App />);

    expect(await screen.findByTestId("account-welcome")).toBeVisible();
    expect(screen.getByRole("button", { name: "Create account" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();
    expect(screen.queryByTestId("ordinary-launch")).toBeNull();
    expect(screen.queryByRole("button", { name: "Start at Era 1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Build" })).toBeNull();
    // ...and nothing was asked of the account's own data on the way past.
    expect(backend.cityReads()).toBe(0);
  });

  it("holds the door shut while the session is still being checked", async () => {
    let release: (value: typeof IDENTITY | null) => void = () => undefined;
    auth.restoreIdentity.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const backend = stubBackend(emptyCity());

    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Checking your session…" }),
    ).toBeVisible();
    expect(screen.queryByTestId("ordinary-launch")).toBeNull();

    release(IDENTITY);
    await settled();
    expect(await screen.findByTestId("ordinary-launch")).toBeVisible();
  });
});

/* ------------------------------------------- 2/3. callbacks and session persistence */

describe("2. the session survives a reload and the address is handed back safely", () => {
  it("restores a signed-in learner on a reload without asking again", async () => {
    stubBackend(emptyCity({ placements: [{ nodeId: "NUM.1", col: 3, row: 3, rot: 0 }] }));

    const first = render(<App />);
    await settled();
    expect(await screen.findByRole("button", { name: "Build" })).toBeVisible();
    first.unmount();

    // A reload is a fresh mount over the same restored Cognito session and the same account.
    render(<App />);
    await settled();
    expect(await screen.findByRole("button", { name: "Build" })).toBeVisible();
    expect(screen.queryByTestId("ordinary-launch")).toBeNull();
    expect(auth.restoreIdentity).toHaveBeenCalledTimes(2);
  });

  it("normalises an account address away once the session is restored", async () => {
    stubBackend(emptyCity());
    window.history.replaceState(null, "", "/sign-in");

    render(<App />);

    // A learner who reloads on `/sign-in` with a valid session is signed in, so the address
    // must stop saying otherwise before it is bookmarked or shared.
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    await settled();
    expect(await screen.findByTestId("ordinary-launch")).toBeVisible();
  });

  it("hands a signed-in learner to a validated destination and never to the raw one", async () => {
    auth.restoreIdentity.mockResolvedValue(null);
    auth.signIn.mockResolvedValue(IDENTITY);
    stubBackend(emptyCity());
    // The open-redirect attempt: a real-looking link to this product's own sign-in page.
    window.history.replaceState(null, "", "/sign-in?next=//evil.example/harvest");
    const user = userEvent.setup();

    render(<App />);
    await user.type(await screen.findByLabelText("Email"), "learner@example.test");
    await user.type(screen.getByLabelText("Password"), "correcthorse1");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(window.location.href).not.toContain("evil.example");
    expect(sessionStorage.getItem("cr.auth.returnTo")).toBeNull();
  });
});

/* ----------------------------------------------------------- 4. the diagnostic door */

describe("4. Take the diagnostic enters the real diagnostic flow", () => {
  it("opens the diagnostic takeover the city's own Survey entry opens", async () => {
    stubBackend(emptyCity());
    const user = userEvent.setup();

    render(<App />);
    await settled();
    await user.click(await screen.findByRole("button", { name: "Take the diagnostic" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Back to city" })).toBeVisible();
    expect(await screen.findByTestId("diagnostic-stub")).toBeVisible();
    expect(screen.queryByTestId("ordinary-launch")).toBeNull();
  });

  it("records the door, so the question does not come back on the next load", async () => {
    const backend = stubBackend(emptyCity());
    const user = userEvent.setup();

    const first = render(<App />);
    await settled();
    await user.click(await screen.findByRole("button", { name: "Take the diagnostic" }));
    await screen.findByTestId("diagnostic-stub");
    expect(localStorage.getItem(launchRecordKey(STUDENT))).toContain("diagnostic");
    // The real diagnostic records an assessment administration as it opens. This stub has no
    // server runtime, so expose the canonical marker that administration makes GET /city return.
    backend.markLaunchInitialized();
    first.unmount();

    render(<App />);
    await settled();
    expect(await screen.findByRole("button", { name: "Build" })).toBeVisible();
    expect(screen.queryByTestId("ordinary-launch")).toBeNull();
  });
});

/* -------------------------------------------------------------- 5/6. the Era 1 door */

describe("5. Start at Era 1 enters the real city and initialises once", () => {
  it("enters the city and writes the canonical first era exactly once", async () => {
    stubBackend(emptyCity());
    const user = userEvent.setup();
    expect(localStorage.getItem(ERA_STATE_STORAGE_KEY)).toBeNull();

    render(<App />);
    await settled();
    await user.click(await screen.findByRole("button", { name: "Start at Era 1" }));

    expect(await screen.findByRole("button", { name: "Build" })).toBeVisible();
    expect(screen.queryByTestId("ordinary-launch")).toBeNull();
    expect(localStorage.getItem(ERA_STATE_STORAGE_KEY)).toBe(FIRST_ERA);
    expect(localStorage.getItem(launchRecordKey(STUDENT))).toContain("era-one");
  });

  it("does not ask again on Device B before the learner earns progress", async () => {
    stubBackend(emptyCity());
    const user = userEvent.setup();

    const deviceA = render(<App />);
    await settled();
    await user.click(await screen.findByRole("button", { name: "Start at Era 1" }));
    expect(await screen.findByRole("button", { name: "Build" })).toBeVisible();
    deviceA.unmount();

    // Device B restores the same Cognito account with none of Device A's launch or era cache.
    localStorage.clear();
    resetCityEra();
    render(<App />);
    await settled();

    expect(await screen.findByRole("button", { name: "Build" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Start at Era 1" })).toBeNull();
  });

  it("treats a local launch note as cache, not authority", async () => {
    localStorage.setItem(
      launchRecordKey(STUDENT),
      JSON.stringify({ choice: "era-one", at: "2026-08-13T00:00:00.000Z" }),
    );
    stubBackend(emptyCity());

    render(<App />);
    await settled();

    expect(await screen.findByTestId("ordinary-launch")).toBeVisible();
    expect(screen.getByRole("button", { name: "Start at Era 1" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Build" })).toBeNull();
  });

  it.each([
    ["offline", "offline"],
    ["unauthorized", 401],
    ["server failure", 500],
  ] as const)(
    "keeps a %s bootstrap retryable and writes no local completion",
    async (_label, failure) => {
      const backend = stubBackend(emptyCity());
      backend.failBootstrapWith(failure);
      const user = userEvent.setup();

      render(<App />);
      await settled();
      await user.click(await screen.findByRole("button", { name: "Start at Era 1" }));

      expect(await screen.findByTestId("launch-error")).toBeVisible();
      expect(screen.queryByRole("button", { name: "Build" })).toBeNull();
      expect(localStorage.getItem(launchRecordKey(STUDENT))).toBeNull();
      expect(localStorage.getItem(ERA_STATE_STORAGE_KEY)).toBeNull();

      backend.failBootstrapWith(null);
      await user.click(screen.getByRole("button", { name: "Try again" }));

      expect(await screen.findByRole("button", { name: "Build" })).toBeVisible();
      expect(localStorage.getItem(launchRecordKey(STUDENT))).toContain("era-one");
      expect(backend.bootstrapCalls()).toBeGreaterThanOrEqual(2);
    },
  );

  it("times out a hanging bootstrap, aborts it, and retries without a premature note", async () => {
    const backend = stubBackend(emptyCity());
    backend.hangBootstrap(true);

    render(<App />);
    await settled();
    const start = await screen.findByRole("button", { name: "Start at Era 1" });
    vi.useFakeTimers();
    start.click();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId("launch-loading")).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByTestId("launch-error")).toHaveTextContent(/timed out/i);
    expect(backend.abortedBootstraps()).toBe(1);
    expect(localStorage.getItem(launchRecordKey(STUDENT))).toBeNull();
    expect(localStorage.getItem(ERA_STATE_STORAGE_KEY)).toBeNull();

    backend.hangBootstrap(false);
    vi.useRealTimers();
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: "Build" })).toBeVisible();
  });

  it("grants nothing: no building stands and no card is marked built", async () => {
    stubBackend(emptyCity());
    const user = userEvent.setup();

    render(<App />);
    await settled();
    await user.click(await screen.findByRole("button", { name: "Start at Era 1" }));
    await screen.findByRole("button", { name: "Build" });
    await user.click(await screen.findByTestId("onboarding-advisor-skip"));

    const plots = Array.from(document.querySelectorAll<HTMLElement>(".city-backdrop-plot"));
    expect(
      plots.length,
      "the island drew no plots, so the occupancy assertion below measures nothing",
    ).toBeGreaterThan(0);
    expect(
      plots
        .filter((plot) => plot.dataset.state !== "empty")
        .map((plot) => plot.dataset.state),
      "entering at Era 1 put buildings on the island before the learner placed one",
    ).toEqual([]);
    expect(screen.queryByText(/you.{0,3}ve unlocked/i)).toBeNull();
  });

  it("does not bootstrap again, and canonical founding wins stale local era state", async () => {
    const backend = stubBackend(emptyCity());
    const user = userEvent.setup();

    const first = render(<App />);
    await settled();
    await user.click(await screen.findByRole("button", { name: "Start at Era 1" }));
    await screen.findByRole("button", { name: "Build" });
    const recordedAtFirstPress = localStorage.getItem(launchRecordKey(STUDENT));
    expect(recordedAtFirstPress).toContain("era-one");
    first.unmount();

    // A device-local era is cache too. The bootstrapped account says Prehistoric, so a stale
    // later value cannot overrule it on the next canonical GET.
    resetCityEra();
    localStorage.setItem(ERA_STATE_STORAGE_KEY, LATER_ERA);

    render(<App />);
    await settled();
    expect(await screen.findByRole("button", { name: "Build" })).toBeVisible();
    expect(screen.queryByTestId("ordinary-launch")).toBeNull();
    expect(
      localStorage.getItem(ERA_STATE_STORAGE_KEY),
      "the stale device era overruled the account's canonical founding",
    ).toBe(FIRST_ERA);
    expect(backend.bootstrapCalls()).toBe(1);
    expect(
      localStorage.getItem(launchRecordKey(STUDENT)),
      "the second load rewrote the note that records which door was taken",
    ).toBe(recordedAtFirstPress);
  });
});

/* ------------------------------------------------------------- 7. the returning learner */

describe("7. a returning learner resumes rather than being asked again", () => {
  it("opens straight into the city of an account that has progress", async () => {
    stubBackend(
      emptyCity({
        node_states: [node({ mastery: 2, lesson_stage: "done" })],
        placements: [{ nodeId: "NUM.1", col: 3, row: 3, rot: 0 }],
      }),
    );

    render(<App />);
    await settled();

    expect(await screen.findByRole("button", { name: "Build" })).toBeVisible();
    expect(screen.queryByTestId("ordinary-launch")).toBeNull();
    expect(screen.queryByRole("button", { name: "Start at Era 1" })).toBeNull();
  });

  it("does not reset a learner who is standing in a later era", async () => {
    stubBackend(
      emptyCity({
        archipelago_version: 1,
        current_island: LATER_ERA as never,
        islands: [],
      }),
    );

    render(<App />);
    await settled();
    await screen.findByRole("button", { name: "Build" });

    expect(screen.queryByTestId("ordinary-launch")).toBeNull();
    expect(
      localStorage.getItem(ERA_STATE_STORAGE_KEY),
      "the ordinary route put a later-era learner back in era one",
    ).toBe(LATER_ERA);
  });
});

/* ----------------------------------------------------------------------- 8. logout */

describe("8. signing out returns to authentication", () => {
  it("closes the city and shows the way back in", async () => {
    stubBackend(emptyCity({ placements: [{ nodeId: "NUM.1", col: 3, row: 3, rot: 0 }] }));
    const user = userEvent.setup();

    render(<App />);
    await settled();
    await screen.findByRole("button", { name: "Build" });

    // Sign out lives inside the account-chrome popover now (the always-visible pill row
    // collapsed into a single menu button), not as a top-level control.
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));

    // Signing out clears identity and lands back on the welcome screen (not the "sign-in"
    // intent directly) -- the way back in either way, which is the claim this test makes.
    expect(
      await screen.findByRole("heading", { name: "Welcome to Calculus Readiness!" }),
    ).toBeVisible();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Build" })).toBeNull();
    expect(screen.queryByTestId("ordinary-launch")).toBeNull();
  });
});

/* --------------------------------------------------------- 9. the backend is unreachable */

describe("9. an unreachable account is a retry, never a guess", () => {
  it("shows neither a city nor a start choice, and recovers on Retry", async () => {
    const backend = stubBackend(emptyCity());
    backend.failCity(true);
    const user = userEvent.setup();

    render(<App />);

    const failure = await screen.findByTestId("launch-error");
    expect(failure).toBeVisible();
    expect(screen.queryByTestId("ordinary-launch")).toBeNull();
    expect(screen.queryByRole("button", { name: "Start at Era 1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Build" })).toBeNull();
    // Nothing was written while the account was unreadable.
    expect(localStorage.getItem(launchRecordKey(STUDENT))).toBeNull();
    expect(localStorage.getItem(ERA_STATE_STORAGE_KEY)).toBeNull();

    const before = backend.cityReads();
    backend.failCity(false);
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByTestId("ordinary-launch")).toBeVisible();
    expect(
      backend.cityReads(),
      "Retry re-rendered over the cached rejection instead of re-reading",
    ).toBeGreaterThan(before);
  });

  it.each([
    ["offline", "offline"],
    ["forbidden", 403],
    ["server failure", 500],
  ] as const)("keeps the %s baseline fail-closed", async (_label, failure) => {
    const backend = stubBackend(emptyCity());
    backend.failCityWith(failure);

    render(<App />);

    expect(await screen.findByTestId("launch-error")).toBeVisible();
    expect(screen.queryByTestId("ordinary-launch")).toBeNull();
    expect(screen.queryByRole("button", { name: "Build" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start at Era 1" })).toBeNull();
    expect(backend.cityReads()).toBe(1);
  });

  it("times out a city read that never resolves, then retries from the recoverable error", async () => {
    vi.useFakeTimers();
    const backend = stubBackend(emptyCity());
    backend.hangCity(true);

    render(<App />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId("launch-loading")).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    const failure = screen.getByTestId("launch-error");
    expect(failure).toBeVisible();
    expect(failure).toHaveTextContent(/timed out|too long/i);
    expect(backend.abortedCityReads()).toBe(1);
    expect(screen.queryByRole("button", { name: "Build" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start at Era 1" })).toBeNull();

    backend.hangCity(false);
    await act(async () => {
      screen.getByRole("button", { name: "Try again" }).click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("ordinary-launch")).toBeVisible();
    expect(backend.cityReads()).toBe(2);

    vi.useRealTimers();
    await userEvent.setup().click(screen.getByRole("button", { name: "Start at Era 1" }));
    expect(await screen.findByRole("button", { name: "Build" })).toBeVisible();
    expect(screen.queryByTestId("city-error")).toBeNull();
  });

  it("aborts the pending city read when the account app unmounts and ignores its callback", async () => {
    vi.useFakeTimers();
    const backend = stubBackend(emptyCity());
    backend.hangCity(true);

    const view = render(<App />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId("launch-loading")).toBeVisible();

    view.unmount();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(backend.abortedCityReads()).toBe(1);
    expect(screen.queryByTestId("launch-error")).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});

/* ------------------------------------------------ the launch screen, from the keyboard */

describe("the launch screen is operable without a mouse", () => {
  it("lands focus on the recommended route and reaches the other one by tabbing", async () => {
    stubBackend(emptyCity());
    const user = userEvent.setup();

    render(<App />);
    await settled();
    const diagnostic = await screen.findByRole("button", { name: "Take the diagnostic" });

    // The route we recommend is the one a keyboard learner is already standing on.
    await waitFor(() => expect(diagnostic).toHaveFocus());
    await user.tab();
    expect(
      screen.getByRole("button", { name: "Start at Era 1" }),
      "the second route is not the next stop after the first",
    ).toHaveFocus();
  });

  it("says which route is recommended in the control's own description", async () => {
    stubBackend(emptyCity());
    render(<App />);
    await settled();

    // Colour is not a channel every learner has. A screen reader moving button by button has
    // to hear the status while standing on the route it describes, which is what the
    // `description` filter reads.
    expect(
      await screen.findByRole("button", {
        name: "Take the diagnostic",
        description: /recommended/i,
      }),
    ).toBeVisible();
  });

  it("uses one h1 and one h2 per route, with no level skipped", async () => {
    stubBackend(emptyCity());
    render(<App />);
    await settled();
    await screen.findByTestId("ordinary-launch");

    const levels = Array.from(
      document.querySelectorAll<HTMLHeadingElement>(
        ".launch h1, .launch h2, .launch h3, .launch h4",
      ),
    ).map((heading) => Number(heading.tagName.slice(1)));
    expect(levels.length, "the launch screen drew no headings at all").toBeGreaterThan(0);
    expect(levels, "the launch screen skipped a heading level").toEqual([1, 2, 2]);
    // The two routes are a list, so a screen reader announces "2 items" rather than leaving
    // the learner to discover that a second one exists.
    expect(screen.getByRole("list")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("stands its entrance down when the learner asks for reduced motion", async () => {
    stubBackend(emptyCity());
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      })),
    );

    render(<App />);
    await settled();

    expect(await screen.findByTestId("ordinary-launch")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );
  });
});

/* ------------------------------------------------------- the copy the screen may not use */

describe("what the launch screen is not allowed to say", () => {
  it("never sells the diagnostic as a measure of the learner, or as exact", async () => {
    stubBackend(emptyCity());
    render(<App />);
    await settled();
    await screen.findByTestId("ordinary-launch");

    const FORBIDDEN: readonly { pattern: RegExp; catches: string }[] = [
      { pattern: /\bhow smart\b/i, catches: "It finds out how smart you are." },
      { pattern: /\bintelligen/i, catches: "A quick intelligence check." },
      { pattern: /\bIQ\b/, catches: "Think of it as an IQ test." },
      { pattern: /\b(exact|perfect|precise)(ly)?\b/i, catches: "It places you exactly." },
      {
        pattern: /\bpass(ing)?\b.*\bfail/i,
        catches: "There is a passing and failing mark.",
      },
    ];
    // Each pattern proves it still reads before it is trusted over the shipped sentence.
    expect(FORBIDDEN.filter((row) => !row.pattern.test(row.catches))).toEqual([]);

    const said = document.body.textContent ?? "";
    expect(
      FORBIDDEN.filter((row) => row.pattern.test(said)).map((row) => row.catches),
    ).toEqual([]);
    // ...and it does say the two things it has to: what is recommended, and that Era 1 is not
    // a door that shuts.
    expect(said).toMatch(/recommended/i);
    expect(said).toMatch(/menu/i);
  });
});
