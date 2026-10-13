import {
  apiGetJsonAuthenticated,
  apiPostJsonAuthenticated,
  ApiResponseError,
  type AccessTokenGetter,
} from "../api";
import { seededTownHallTransform } from "./citySession";
import { TOWN_HALL_ID } from "./townHall";
import type { CityIslandLoad, CityLoad } from "./types";

/**
 * Account launch blocks every useful surface, so it gets a firm deadline rather than an
 * indefinite spinner. Ten seconds leaves room for a normal regional API read and one Cognito
 * refresh on a poor mobile connection, while ending the reproduced 12-second dead wait before
 * the learner reasonably concludes the app is stuck.
 *
 * This deadline belongs only to account-city GETs. The shared authenticated request path accepts
 * a caller-owned signal but sets no deadline of its own, so uploads, diagnostic finalization,
 * and model parsing do not inherit a launch-oriented timeout.
 */
export const ACCOUNT_CITY_READ_TIMEOUT_MS = 10_000;

export interface AccountCityLoadOptions {
  readonly timeoutMs?: number;
}

export interface AccountCityLoader {
  (): Promise<CityLoad>;
  /** Cancel every outstanding read (for an owning surface that is being discarded). */
  cancelPending(): void;
}

/**
 * The production city loader: the signed-in student's whole city, read through
 * `GET /api/city` (Cognito bearer) — their own `student_node_state`, the D1
 * `neighborhood_state` checkpoint, and since Wave 1 the layout too (`town_hall`,
 * `placements`, `roads`, `road_gold_spent`, `crisis_damage`). The server derives
 * `student_id` from the verified JWT and synthesizes the full D1 node set (fresh
 * unbuilt nodes where unplaced) — so this stays a thin authenticated fetch. This is how
 * a completed pretest's placement survives reloads and follows the student across
 * devices — the seed lives in Aurora, not the tab.
 */
export function loadCityFromApi(
  cityUrl: string,
  getToken: AccessTokenGetter,
  options: AccountCityLoadOptions = {},
): AccountCityLoader {
  const timeoutMs = options.timeoutMs ?? ACCOUNT_CITY_READ_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError("Account city read timeout must be a positive finite duration.");
  }
  const pending = new Set<AbortController>();

  const read = async (): Promise<CityLoad> => {
    const controller = new AbortController();
    let timedOut = false;
    pending.add(controller);
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const loaded = await apiGetJsonAuthenticated<CityLoad>(cityUrl, getToken, {
        signal: controller.signal,
      });
      return normalizeAccountCity(loaded);
    } catch (error: unknown) {
      if (timedOut) {
        throw new ApiResponseError(
          `Reading your city timed out after ${timeoutMs / 1000} seconds. Check your connection and try again.`,
          408,
          "request_timeout",
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
      pending.delete(controller);
    }
  };
  return Object.assign(read, {
    cancelPending(): void {
      for (const controller of pending) {
        controller.abort();
      }
    },
  });
}

export interface AccountCityBootstrapper {
  (): Promise<CityLoad>;
  /** Cancel every outstanding bootstrap owned by a discarded account bundle. */
  cancelPending(): void;
}

/**
 * Ask the authenticated API to initialize an untouched account, then return its canonical city.
 *
 * The deadline and cancellation semantics match the launch GET: neither may leave the only
 * useful screen spinning forever. A failed or timed-out response is not converted into local
 * success; the launch state machine exposes it as Retry.
 */
export function bootstrapCityFromApi(
  cityUrl: string,
  getToken: AccessTokenGetter,
  options: AccountCityLoadOptions = {},
): AccountCityBootstrapper {
  const timeoutMs = options.timeoutMs ?? ACCOUNT_CITY_READ_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError(
      "Account city bootstrap timeout must be a positive finite duration.",
    );
  }
  const pending = new Set<AbortController>();

  const bootstrap = async (): Promise<CityLoad> => {
    const controller = new AbortController();
    let timedOut = false;
    pending.add(controller);
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      const city = await apiPostJsonAuthenticated<CityLoad>(
        `${cityUrl}/bootstrap`,
        getToken,
        {},
        { signal: controller.signal, dispatchSessionExpired: false },
      );
      return normalizeAccountCity(city);
    } catch (error: unknown) {
      if (timedOut) {
        throw new ApiResponseError(
          `Starting your city timed out after ${timeoutMs / 1000} seconds. Check your connection and try again.`,
          408,
          "request_timeout",
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
      pending.delete(controller);
    }
  };
  return Object.assign(bootstrap, {
    cancelPending(): void {
      for (const controller of pending) {
        controller.abort();
      }
    },
  });
}

function withSeededIslandHub(island: CityIslandLoad): CityIslandLoad {
  if (island.town_hall) {
    return island;
  }
  const transform = seededTownHallTransform([...island.placements, ...island.civic]);
  return { ...island, town_hall: { nodeId: TOWN_HALL_ID, ...transform } };
}

/**
 * **EVERY ISLAND HAS A HUB FROM THE START, AND THE AUTHENTICATED ONE IS AN ISLAND.**
 *
 * The 2026-07-26 pre-seed design says the Town Hall already exists on every island and
 * is only ever relocated; `citySession` implements that for the dev island, and until
 * this function the authenticated island had no equivalent. The consequence was not a
 * missing decoration. `CitySurface` computes occupancy from the payload this returns and
 * sends `onPlaceSkill` to the city session, which pre-seeds a hall at the island centre
 * — so a payload with no hall made those six cells look free, the placement ghost chose
 * them, and the session refused the write for overlapping a building nothing had drawn.
 * The learner's first action failed silently, and the design record measured it:
 * `ROSTER 'Built' BADGES AFTER PLACING: 0`.
 *
 * WHY THE SEED IS HERE AND NOT IN THE SERVER READ. The fallback branch — "the centre,
 * unless something is standing on it" — is `worldLayout`'s grid math (`footprintFor`,
 * `occupiedCells`, `isPlacementValid`, `findOpenCell`), which a service cannot import
 * from an app. Re-deriving it server-side would be a second implementation of a rule
 * that already has an edge case in it, and the two islands would seed different cells
 * the first time either changed. So the server stays honest about STORAGE — `town_hall`
 * is null when no row exists — and the product rule is applied once, here, through the
 * same function the dev island uses.
 *
 * A STORED HALL ALWAYS WINS. This only fills an absence; it never moves a hall the
 * learner has relocated. Once Wave 2's write path exists every city has a row and this
 * branch stops being taken at all, which is why it reads as a migration rather than as
 * a default.
 */
function withSeededHub(load: CityLoad): CityLoad {
  if (load.town_hall) {
    return load;
  }
  const transform = seededTownHallTransform([
    ...(load.placements ?? []),
    ...(load.civic ?? []),
  ]);
  return { ...load, town_hall: { nodeId: TOWN_HALL_ID, ...transform } };
}

/** Apply the product's free Town Hall seed consistently to GET and bootstrap responses. */
export function normalizeAccountCity(loaded: CityLoad): CityLoad {
  if (loaded.archipelago_version !== 1 || loaded.islands === undefined) {
    return withSeededHub(loaded);
  }
  const islands = loaded.islands.map(withSeededIslandHub);
  const current = islands.find((island) => island.era_id === loaded.current_island);
  return withSeededHub({
    ...loaded,
    islands,
    ...(current
      ? {
          placements: current.placements,
          roads: current.roads,
          road_gold_spent: current.road_gold_spent,
          town_hall: current.town_hall,
          civic: current.civic,
          civic_material_spent: current.civic_material_spent,
          crisis_damage: current.crisis_damage,
        }
      : {}),
  });
}
