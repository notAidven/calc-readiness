import type { StudentNodeState, UUID } from "@cr/state-schema";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * **WHERE SIGN OUT SITS IN THE KEYBOARD'S ORDER, AND WHETHER IT IS STILL LIVE UNDER A TAKEOVER.**
 *
 * Two defects, both measured on the ordinary account mount at `b7bdc6d2`, and they are the same
 * one line of composition seen from two sides. `AccountBoundary` rendered its *Signed in / Sign
 * out* chrome AFTER `children`, so:
 *
 *  1. **the order lied.** The pill is `position: fixed` at the top centre of every authenticated
 *     surface — the first thing on the screen — and it was the LAST thing in the tab order,
 *     behind every HUD control in the city. A keyboard learner who wanted to sign out had to
 *     traverse the whole game to reach a control sitting above the game.
 *  2. **it outlived the screen it belongs to.** `.account-chrome` is `z-index: 95` and the
 *     diagnostic takeover is `z-index: 30`, so the pill painted OVER a modal
 *     `aria-modal="true"` dialog, inside its focus order, and a press landed on it. Signing out
 *     mid-diagnostic is the one interaction on that surface nobody was offered and everybody
 *     could reach.
 *
 * Both are read on the real `<App />` through the real `AccountBoundary`, against a stand-in for
 * the Cognito service and `fetch` and nothing else, because "the chrome is composed above the
 * city" is a claim about composition and no unit test of the boundary can discharge it.
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

vi.mock("./cognitoClient", () => ({
  CognitoOperationError: class CognitoOperationError extends Error {
    code = "UnknownError";
  },
  createCognitoAuthService: vi.fn(() => auth),
}));

vi.mock("../diagnostic/DiagnosticSurface", () => ({
  DiagnosticSurface: () => (
    <div data-testid="diagnostic-stub">
      <button type="button">First diagnostic question</button>
    </div>
  ),
}));

import { App } from "../App";
import type { CityLoad } from "../city/types";
import { resetCityEra } from "../city/useCityEra";

const STUDENT = "11111111-1111-4111-8111-111111111111" as UUID;
const IDENTITY = { studentId: STUDENT, email: "learner@example.test" };

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

/** An account that has begun, so the city is drawn without a launch question in front of it. */
function startedCity(): CityLoad {
  return {
    node_states: [node({ mastery: 2, lesson_stage: "done" })],
    placements: [{ nodeId: "NUM.1", col: 3, row: 3, rot: 0 }],
    civic: [],
    roads: [],
    road_gold_spent: 0,
    civic_material_spent: 0,
  };
}

function stubBackend(city: CityLoad): void {
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
        return json(city);
      }
      if (url.pathname === "/api/city") {
        return json({ saved: true });
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
      return json({ error: `unexpected ${url.pathname}` }, 404);
    }),
  );
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

/** Every control a Tab press can reach, in document order, skipping inert subtrees. */
function reachable(): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => element.closest("[inert]") === null);
}

function label(element: HTMLElement): string {
  return (element.getAttribute("aria-label") ?? element.textContent ?? "").trim();
}

beforeEach(() => {
  configureProductionAccount();
  window.history.replaceState(null, "", "/");
  auth.restoreIdentity.mockResolvedValue(IDENTITY);
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

async function enterTheCity(): Promise<void> {
  stubBackend(startedCity());
  render(<App />);
  await waitFor(() => expect(screen.queryByTestId("launch-loading")).toBeNull(), {
    timeout: 5000,
  });
  await screen.findByRole("button", { name: "Build" });
}

describe("the account chrome is reachable where it is drawn, and only while it applies", () => {
  it("puts the account menu at the front of the keyboard order, not behind the whole city", async () => {
    // Sign out itself is no longer a top-level control: the always-visible Signed in /
    // Sign out pill row collapsed into a single "Account menu" popover trigger. The
    // guarantee this test holds -- a keyboard learner does not have to traverse the
    // whole city to reach account controls -- now lands on THAT trigger being first,
    // with Sign out reachable immediately once the menu opens (checked below).
    await enterTheCity();
    const user = userEvent.setup();

    const order = reachable();
    const trigger = screen.getByRole("button", { name: "Account menu" });
    const position = order.indexOf(trigger);
    expect(
      order.length,
      "nothing is reachable, so this order assertion is measuring nothing",
    ).toBeGreaterThan(5);
    expect(
      position,
      `Account menu is stop ${position + 1} of ${order.length} in the tab order, behind ` +
        `${order.slice(0, Math.max(0, position)).map(label).join(", ")}`,
    ).toBe(0);

    await user.click(trigger);
    expect(
      screen.getByRole("menuitem", { name: "Sign out" }),
      "opening the account menu did not surface Sign out",
    ).toBeInTheDocument();
  });

  it("stands down over the diagnostic takeover instead of floating live above it", async () => {
    await enterTheCity();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Menu" }));
    await user.click(await screen.findByRole("button", { name: /Survey|Diagnostic/i }));
    await screen.findByTestId("diagnostic-stub");
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");

    const chrome = document.querySelector<HTMLElement>(".account-chrome");
    expect(
      chrome,
      "the account chrome left the document instead of standing down",
    ).not.toBeNull();
    const signOut = (chrome as HTMLElement).querySelector<HTMLButtonElement>("button");
    expect(signOut, "the account chrome lost its Sign out control").not.toBeNull();

    const standDown =
      (chrome as HTMLElement).hasAttribute("inert") ||
      (chrome as HTMLElement).closest("[inert]") !== null;
    expect(
      standDown,
      "the Signed in / Sign out chrome is still live over an aria-modal diagnostic takeover",
    ).toBe(true);
    expect(
      reachable().map(label),
      "Sign out is still in the keyboard order under the diagnostic takeover",
    ).not.toContain("Sign out");
    expect(
      auth.signOut,
      "the takeover was opened and something signed the learner out",
    ).not.toHaveBeenCalled();
  });

  it("hands Sign out back when the takeover closes", async () => {
    await enterTheCity();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Menu" }));
    await user.click(await screen.findByRole("button", { name: /Survey|Diagnostic/i }));
    await screen.findByTestId("diagnostic-stub");
    await user.click(screen.getByRole("button", { name: "Back to city" }));
    await screen.findByRole("button", { name: "Build" });

    // Sign out lives inside the account-menu popover now; what "comes back" at the front
    // of the tab order is that popover's own trigger (see the test above).
    expect(
      reachable().map(label),
      "the account menu trigger did not come back",
    ).toContain("Account menu");
    expect(reachable().indexOf(screen.getByRole("button", { name: "Account menu" }))).toBe(
      0,
    );
  });
});
