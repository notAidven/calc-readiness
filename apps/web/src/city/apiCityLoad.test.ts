import type { StudentNodeState } from "@cr/state-schema";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SESSION_EXPIRED_EVENT } from "../auth/session";
import { loadCityFromApi } from "./apiCityLoad";
import { createCityDevSession } from "./citySession";
import type { CityLoad } from "./types";

/**
 * A REAL `Response`, not `{ ok, status, json }` cast to one. The loader no longer takes
 * the body through `json()` — `unwrapJson` reads the text so it can quote back a body that
 * is not JSON at all — and a double implementing only the method the code used to call is
 * a double that decides what the code is allowed to do.
 *
 * Handed to `vi.fn(async () => ...)` rather than to `mockResolvedValue` at every call site
 * below, because a `Response` body can be read exactly ONCE. One instance shared across
 * two fetches is a "Body is unusable" the second time — which is true of the real thing
 * too, so the double should not paper over it.
 */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const NODE_STATE: StudentNodeState = {
  student_id: "00000000-0000-4000-8000-000000000abc",
  node_id: "NUM.S",
  placement_estimate: 2,
  mastery: 0,
  mastery_updated_at: null,
  completion_status: "locked",
  lesson_stage: "not_started",
  last_practiced_at: null,
};

/** Serve one payload from `GET /api/city` and hand back the loader. */
function serving(payload: unknown): () => Promise<CityLoad> {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(payload)),
  );
  return loadCityFromApi("https://fn.example/api/city", async () => "jwt-abc");
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("loadCityFromApi", () => {
  it("GETs the city URL with the bearer token and returns the payload", async () => {
    const payload: CityLoad = { node_states: [NODE_STATE], neighborhood_state: null };
    // The parameters are declared, unused, so `mock.calls[0]` is typed as a fetch call and
    // the assertions below can read the URL and the init off it.
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse(payload),
    );
    vi.stubGlobal("fetch", fetchMock);

    const load = loadCityFromApi("https://fn.example/api/city", async () => "jwt-abc");
    const result = await load();

    expect(result.node_states).toEqual(payload.node_states);
    expect(result.neighborhood_state).toBeNull();
    const call = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(call[0]).toBe("https://fn.example/api/city");
    expect(new Headers(call[1].headers).get("authorization")).toBe("Bearer jwt-abc");
  });

  it("expires the session after the server rejects both token attempts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "unauthorized" }, 401)),
    );
    const load = loadCityFromApi("https://fn.example/api/city", async () => "jwt");
    await expect(load()).rejects.toThrow(/session has expired/i);
  });

  it("aborts a never-resolving read at the injected deadline and clears its timer", async () => {
    vi.useFakeTimers();
    let requestSignal: AbortSignal | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        requestSignal = init?.signal ?? null;
        return new Promise<Response>((_resolve, reject) => {
          requestSignal?.addEventListener(
            "abort",
            () => reject(new DOMException("The operation was aborted.", "AbortError")),
            { once: true },
          );
        });
      }),
    );
    const getToken = vi.fn(async () => "jwt");
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired, { once: true });
    const load = loadCityFromApi("https://fn.example/api/city", getToken, {
      timeoutMs: 250,
    });

    const result = load().catch((error: unknown) => error);
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(250);
    const error = await result;

    expect(error).toMatchObject({ status: 408, code: "request_timeout" });
    expect(String(error)).toContain("0.25 seconds");
    expect((requestSignal as AbortSignal | null)?.aborted).toBe(true);
    expect(getToken.mock.calls).toEqual([[false]]);
    expect(expired).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels an owned pending read without misreporting a timeout or leaving a timer", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("The operation was aborted.", "AbortError")),
            { once: true },
          );
        });
      }),
    );
    const load = loadCityFromApi("https://fn.example/api/city", async () => "jwt", {
      timeoutMs: 250,
    });

    const result = load().catch((error: unknown) => error);
    await Promise.resolve();
    load.cancelPending();
    const error = await result;

    expect(error).toMatchObject({ name: "AbortError" });
    expect(error).not.toMatchObject({ code: "request_timeout" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not duplicate a 401 refresh when the retried read times out", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401))
      .mockImplementationOnce((_url: string, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("The operation was aborted.", "AbortError")),
            { once: true },
          );
        });
      });
    vi.stubGlobal("fetch", fetchMock);
    const getToken = vi.fn(async (forceRefresh?: boolean) =>
      forceRefresh ? "fresh-jwt" : "old-jwt",
    );
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired, { once: true });
    const load = loadCityFromApi("https://fn.example/api/city", getToken, {
      timeoutMs: 250,
    });

    const result = load().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(250);
    const error = await result;

    expect(error).toMatchObject({ code: "request_timeout" });
    expect(getToken.mock.calls).toEqual([[false], [true]]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(expired).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("carries the whole city the server now sends, untouched", async () => {
    const payload: CityLoad = {
      node_states: [NODE_STATE],
      neighborhood_state: null,
      placements: [{ nodeId: "NUM.S", col: 2, row: 0, rot: 1 }],
      roads: [{ col: 1, row: 1 }],
      road_gold_spent: 20,
      town_hall: { nodeId: "town-hall", col: 3, row: 3, rot: 2 },
      crisis_damage: {
        next_damage_id: 2,
        ruined_buildings: [{ node_id: "NUM.F", damage_id: "d1" }],
        ruined_cells: [],
        suspended_civic: [],
        overwritten_records: [],
      },
    };

    const city = await serving(payload)();

    expect(city).toEqual(payload);
  });
});

/**
 * **THE HUB, AND WHY ITS ABSENCE WAS NOT A COSMETIC ONE.**
 *
 * `CitySurface` computes occupancy from this payload and sends `onPlaceSkill` to the
 * city session, which pre-seeds a hall at the island centre. A payload with no hall
 * therefore made those cells look free while the write target had a building on them,
 * so the learner's first placement was refused with nothing on screen to explain it.
 */
describe("the authenticated island gets its hub", () => {
  it("seeds the hall when the server carries none, at the dev island's own cell", async () => {
    const city = await serving({ node_states: [], neighborhood_state: null })();

    // Not a literal cell: the DEV island's hub, read from the session the writes
    // actually land in. Pinning `{-1,-1}` here would pass while the two islands drifted,
    // which is the whole failure this seed exists to prevent.
    const devIsland = await createCityDevSession().load();
    expect(devIsland.town_hall).not.toBeNull();
    expect(city.town_hall).toEqual(devIsland.town_hall);
  });

  it("never moves a hall the learner has already relocated", async () => {
    const stored = { nodeId: "town-hall", col: 4, row: -3, rot: 1 };

    const city = await serving({
      node_states: [],
      neighborhood_state: null,
      town_hall: stored,
    })();

    expect(city.town_hall).toEqual(stored);
  });

  it("puts the seeded hall clear of a building already standing on the centre", async () => {
    // The fallback branch: a stored layout whose skills predate the hub, or a hall row
    // lost while placements survived. The hub still arrives, and never on top of
    // something. `NUM.S` is 2x2 at the origin block, which the hall's 3x2 centre seat
    // overlaps.
    const onTheCentre = { nodeId: "NUM.S", col: -1, row: -1, rot: 0 };

    const city = await serving({
      node_states: [],
      neighborhood_state: null,
      placements: [onTheCentre],
    })();

    expect(city.town_hall).not.toBeNull();
    expect({ col: city.town_hall?.col, row: city.town_hall?.row }).not.toEqual({
      col: onTheCentre.col,
      row: onTheCentre.row,
    });
  });
});
