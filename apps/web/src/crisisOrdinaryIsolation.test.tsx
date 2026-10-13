import { NO_CRISIS_DAMAGE } from "@cr/game";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CitySurfaceProps } from "./city/CitySurface";
import { MOCK_CITY_LOAD } from "./city/mockCity";
import { CRISIS_PREVIEW_ROUTES } from "./crisisPreviewRoutes";

/**
 * Independent population census.
 *
 * This does not start from CRISIS_PREVIEW_ROUTES. It discovers the source modules that export
 * a crisis entry query parameter, establishes a floor, and only then compares that population
 * with the router. A fifth EntryChip therefore joins the behavior sweep by existing, while a
 * registry entry with no entry implementation fails the set comparison.
 */
const ENTRY_SOURCES = import.meta.glob(["./**/*EntryChip.tsx", "./**/*Route.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const CRISIS_ENTRY_PARAMS = Object.values(ENTRY_SOURCES)
  .flatMap((source) => [
    ...source.matchAll(
      /export const (?:WINTER_QUERY_PARAM|PLAGUE_QUERY_PARAM|INTRUSION_QUERY_PARAM|SUCCESSION_PARAM) = "([^"]+)"/g,
    ),
  ])
  .map((match) => match[1] as string)
  .sort();

const accountCity = vi.hoisted(() => ({
  load: vi.fn(),
}));

let captured: CitySurfaceProps | null = null;

vi.mock("./city/apiCityLoad", () => ({
  loadCityFromApi: () =>
    Object.assign(accountCity.load, { cancelPending: () => undefined }),
  bootstrapCityFromApi: () =>
    Object.assign(async () => accountCity.load(), { cancelPending: () => undefined }),
}));

vi.mock("./auth/AccountBoundary", () => ({
  AccountBoundary: ({
    children,
  }: {
    children: (account: {
      studentId: string;
      getAccessToken: () => Promise<string>;
    }) => ReactNode;
  }) =>
    children({
      studentId: "11111111-1111-4111-8111-111111111111",
      getAccessToken: async () => "token",
    }),
}));

vi.mock("./city/CitySurface", () => ({
  CitySurface: (props: CitySurfaceProps) => {
    captured = props;
    const navigationEnabled = props.crisisCapabilityEnabled ?? true;
    return (
      <div data-testid="ordinary-city">
        {navigationEnabled && <nav aria-label="Crisis destinations" />}
        <output data-testid="automatic-crisis-calls">
          {props.suppressCrisisCalls ? "off" : "on"}
        </output>
      </div>
    );
  },
}));

vi.mock("./diagnostic/DiagnosticSurface", () => ({
  DiagnosticSurface: () => null,
}));

const { App } = await import("./App");

function configureOrdinaryProduction(): void {
  vi.stubEnv("DEV", false);
  vi.stubEnv("PROD", true);
  vi.stubEnv("VITE_ACCOUNT_APP_ENABLED", "true");
  vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "us-east-1_pool");
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "public-client");
  vi.stubEnv("VITE_AWS_REGION", "us-east-1");
  vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "/api/diagnostic");
  vi.stubEnv("VITE_CRISIS_CAPABILITY", "");
}

async function enterOrdinaryCity(): Promise<CitySurfaceProps> {
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() => {
    if (
      screen.queryByTestId("ordinary-city") === null &&
      screen.queryByRole("button", { name: "Start at Era 1" }) === null
    ) {
      throw new Error("the account neither resumed nor offered its launch routes");
    }
  });
  const start = screen.queryByRole("button", { name: "Start at Era 1" });
  if (start) {
    await user.click(start);
  }
  await screen.findByTestId("ordinary-city");
  if (captured === null) {
    throw new Error("App did not compose the ordinary city");
  }
  return captured;
}

beforeEach(() => {
  configureOrdinaryProduction();
  captured = null;
  accountCity.load.mockResolvedValue({
    ...MOCK_CITY_LOAD,
    crisis_damage: {
      next_damage_id: 4,
      ruined_buildings: [{ node_id: "NUM.2", damage_id: "d1" }],
      ruined_cells: [{ cell: "4,1", damage_id: "d2" }],
      suspended_civic: [],
      overwritten_records: [
        {
          placement_id: "civic:information_age_archive_relay:0",
          damage_id: "d3",
          bands_dark: 5,
          verification_attempted: false,
        },
      ],
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => undefined)),
  );
});

afterEach(() => {
  cleanup();
  accountCity.load.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("the full crisis population is held out of ordinary production", () => {
  it("derives the implemented population independently, with a floor and exact composition", () => {
    expect(CRISIS_ENTRY_PARAMS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(CRISIS_ENTRY_PARAMS).size).toBe(CRISIS_ENTRY_PARAMS.length);
    expect(CRISIS_ENTRY_PARAMS).toEqual(
      CRISIS_PREVIEW_ROUTES.map((route) => route.param).sort(),
    );
  });

  it("has no fresh-entry navigation, automatic watcher, resume session, or damage writer", async () => {
    window.history.replaceState(null, "", "/");
    const props = await enterOrdinaryCity();

    expect(screen.queryByRole("navigation", { name: "Crisis destinations" })).toBeNull();
    expect(screen.getByTestId("automatic-crisis-calls")).toHaveTextContent("off");
    expect(props.plagueSession).toBeNull();
    expect(props.successionSession).toBeNull();
    expect(props.onCarryCrisisDamage).toBeUndefined();
    expect(props.onRepairRuin).toBeUndefined();
    expect(props.onVerifyOverwrittenRecord).toBeUndefined();
  });

  it("quarantines stale city damage on entry and every refresh without rewriting it", async () => {
    window.history.replaceState(null, "", "/");
    const props = await enterOrdinaryCity();

    const first = await props.loadCity?.();
    const refreshed = await props.loadCity?.();
    expect(first?.crisis_damage).toEqual(NO_CRISIS_DAMAGE);
    expect(refreshed?.crisis_damage).toEqual(NO_CRISIS_DAMAGE);
    expect(first?.placements).toEqual(MOCK_CITY_LOAD.placements);
    expect(refreshed?.node_states).toEqual(first?.node_states);
    expect(first?.node_states.find((state) => state.node_id === "NUM.S")?.mastery).toBe(
      MOCK_CITY_LOAD.node_states[0]?.mastery,
    );
  });

  it("keeps the exact demo Plague fixture explicitly enabled at the composition root", async () => {
    window.history.replaceState(null, "", "/demo?plague");
    render(<App />);
    await screen.findByTestId("ordinary-city");
    if (captured === null) {
      throw new Error("the exact demo did not compose its city");
    }

    expect(captured.crisisCapabilityEnabled).toBe(true);
    expect(captured.suppressCrisisCalls).toBe(false);
    expect(captured.initialPlagueInCity).toBe(true);
    expect(captured.plagueSession).not.toBeNull();
  });

  for (const param of CRISIS_ENTRY_PARAMS) {
    it(`treats direct ordinary ?${param} as an ordinary launch or resume`, async () => {
      window.history.replaceState(null, "", `/?${param}`);
      render(<App />);

      await screen.findByTestId("ordinary-city");
      if (captured === null) {
        throw new Error("the ordinary account did not resume its city");
      }
      expect(captured.crisisCapabilityEnabled).toBe(false);
      expect(captured.suppressCrisisCalls).toBe(true);
      expect(captured.autoOpenSuccession).toBe(false);
      expect(captured.initialPlagueInCity).toBe(false);
    });
  }
});
