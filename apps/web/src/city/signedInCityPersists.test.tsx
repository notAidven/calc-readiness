import { createAuroraReadService } from "@cr/diagnostic-api/reads";
import { createFakeCluster } from "@cr/diagnostic-api/test/fakeCluster";
import { createAuroraWriteService } from "@cr/diagnostic-api/writes";
import type { EraId } from "@cr/skill-graph";
import type { UUID } from "@cr/state-schema";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadCityFromApi } from "./apiCityLoad";
import { type ApiCitySession, createApiCitySession, saveCityToApi } from "./apiCitySession";
import { CitySurface } from "./CitySurface";
import { civicTestPayment } from "./civicTestSupport";
import { openBuiltShelf } from "./test/openBuiltShelf";
import { TOWN_HALL_ID } from "./townHall";
import type { CityLoad } from "./types";
import { resetCityEra, setCityEra } from "./useCityEra";
import {
  BUILDABLE_RADIUS,
  findOpenCell,
  footprintFor,
  occupiedCells,
  type PlacedTransform,
  type Transform,
} from "./worldLayout";

/**
 * **A SIGNED-IN LEARNER BUILDS A CITY. THEY REFRESH. IT IS STILL THERE.**
 *
 * That sentence is the whole change, and this is the only test in the tree that can say it,
 * because it is the only one where nothing between the click and the table is a stand-in:
 * the REAL `POST /api/city` body, the REAL `GET /api/city` body, the REAL browser session,
 * the REAL `CitySurface`, and a fake that behaves like the four civilization tables and
 * throws on any statement it does not model.
 *
 * ## Why the refresh is a second mount over the same tables
 *
 * A reload is not `refresh()` — that re-reads through the same live session. It is a NEW
 * session, hydrated from nothing but what the database holds. So the second half of each
 * case below builds a fresh `createApiCitySession` over the same cluster and mounts a fresh
 * surface: whatever the first half failed to write simply is not there.
 *
 * Every other city test hands `CitySurface` a `CityLoad` literal, which is exactly why two
 * weeks of QA never saw the defect Wave 1 fixed: a literal is written by whoever writes the
 * test, so it always carries the fields the surface needs.
 */

const STUDENT = "11111111-1111-4111-8111-111111111111" as UUID;
const CITY_URL = "https://api.example.test/api/city";

/**
 * The whole server, in memory: the real read and write services over the fake cluster,
 * reached through a stubbed `fetch` that dispatches on the HTTP method exactly as the Hono
 * app does. The token is checked, so an unauthenticated call still 401s here.
 */
function serveCity() {
  const cluster = createFakeCluster();
  const authenticate = async (token: string | null) =>
    token === "jwt" ? { student_id: STUDENT } : null;
  const reads = createAuroraReadService({ db: cluster.db, authenticate });
  const writes = createAuroraWriteService({ db: cluster.db, authenticate });

  // The order the browser reached the endpoint in, so "no save before the load" can be
  // asserted as a fact about the traffic rather than inferred from the outcome.
  const calls: ("GET" | "POST")[] = [];
  vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
    const header = new Headers(init?.headers).get("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    const method = init?.method === "POST" ? "POST" : "GET";
    calls.push(method);
    const { status, body } =
      method === "POST"
        ? await writes.saveCity(token, JSON.parse(String(init?.body)))
        : await reads.city(token);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  });

  return { cluster, calls };
}

/** A browser session over that server. `debounceMs: 0` so `flush()` is enough to settle. */
function browserSession(eraId?: EraId): ApiCitySession {
  return createApiCitySession({
    studentId: STUDENT,
    load: loadCityFromApi(CITY_URL, async () => "jwt"),
    save: saveCityToApi(CITY_URL, async () => "jwt"),
    ...(eraId ? { eraId: () => eraId } : {}),
    debounceMs: 0,
  });
}

/** Mount the real surface wired the way `App.tsx` wires a signed-in learner. */
function mountCity(session: ApiCitySession) {
  return render(
    <CitySurface
      enableCanvas={false}
      loadCity={session.load}
      onPlaceSkill={session.placeSkill}
      onMoveSkill={session.moveSkill}
      onMoveTownHall={session.moveTownHall}
      onMoveCivic={session.moveCivic}
      onRemoveCivic={session.removeCivic}
    />,
  );
}

/**
 * A legal transform for `nodeId` over what the city currently holds, derived through the
 * same `worldLayout` rules the session gates on rather than written down. A hardcoded cell
 * would be a silent no-op the day the buildable radius or a footprint changed, and a
 * `placeSkill` that no-ops looks exactly like a save that failed.
 */
function openCellFor(load: CityLoad, nodeId: string): Transform {
  const occupants = [...(load.placements ?? [])];
  if (load.town_hall) {
    occupants.push(load.town_hall);
  }
  occupants.push(...(load.civic ?? []));
  const cell = findOpenCell(
    footprintFor(nodeId),
    occupiedCells(occupants),
    BUILDABLE_RADIUS,
  );
  if (!cell) {
    throw new Error(`no open cell for ${nodeId}`);
  }
  return { col: cell.col, row: cell.row, rot: cell.rot };
}

/** Place a skill through the ordinary roster + ghost path, as a learner does. */
async function placeThroughTheRoster(
  user: ReturnType<typeof userEvent.setup>,
  nodeId: string,
) {
  await openBuiltShelf(user);
  const plot = document.querySelector<HTMLElement>(
    `button.city-plot[data-node-id="${nodeId}"]`,
  );
  if (!plot) {
    throw new Error(`no roster plot for ${nodeId}`);
  }
  await user.click(plot);
  const bar = await screen.findByRole("group", { name: /Placing/ });
  await user.click(within(bar).getByRole("button", { name: /Build here/ }));
}

afterEach(() => {
  resetCityEra();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the signed-in city survives a refresh", () => {
  it("stores a placed building and hands it back to a fresh session", async () => {
    const user = userEvent.setup();
    const { cluster } = serveCity();

    const first = browserSession();
    const { unmount } = mountCity(first);
    await placeThroughTheRoster(user, "NUM.S");
    await waitFor(async () => {
      expect((await first.load()).placements?.map((p) => p.nodeId)).toContain("NUM.S");
    });
    await first.flush();

    // THE ROW EXISTS. `placeSkill` is a silent no-op on an invalid transform and the mirror
    // is debounced, so "the learner clicked" and "the database holds it" are two claims.
    const stored = cluster.tables.city_placement.filter((row) => row.kind === "skill");
    expect(stored.map((row) => row.subject_id)).toEqual(["NUM.S"]);
    expect(stored[0]?.student_id).toBe(STUDENT);

    // THE HUB BECAME REAL TOO. A fresh account's payload carries no hall, `apiCityLoad`
    // seeds one at the island centre, and the first save is what turns that seed into a row
    // — so the next visit does not have to re-derive it and cannot derive it differently.
    const hall = cluster.tables.city_placement.filter((row) => row.kind === "town_hall");
    expect(hall).toHaveLength(1);
    expect(hall[0]?.subject_id).toBe(TOWN_HALL_ID);

    unmount();

    // THE REFRESH: a brand-new session that knows nothing but what the tables hold.
    const reloaded = browserSession();
    mountCity(reloaded);
    const { summary } = await openBuiltShelf(user);
    expect(summary).toHaveTextContent("1/6");
    const after = await reloaded.load();
    expect(after.placements?.map((p) => p.nodeId)).toEqual(["NUM.S"]);
    expect(after.town_hall?.nodeId).toBe(TOWN_HALL_ID);
  });

  it("keeps the building on the cell the learner chose, rotation included", async () => {
    const user = userEvent.setup();
    serveCity();

    const first = browserSession();
    const { unmount } = mountCity(first);
    await placeThroughTheRoster(user, "NUM.S");
    await waitFor(async () => {
      expect((await first.load()).placements?.length).toBe(1);
    });
    await first.flush();
    const placed = (await first.load()).placements?.[0] as PlacedTransform;
    unmount();

    const reloaded = browserSession();
    const after = await reloaded.load();
    expect(after.placements?.[0]).toEqual(placed);

    // AND IT DOES NOT LAND ON THE HUB. The occupancy the ghost was validated against is now
    // the occupancy the write went into — one object, not two — which is what closes the
    // record's `ROSTER 'Built' BADGES AFTER PLACING: 0`.
    const hallCells = occupiedCells([after.town_hall as PlacedTransform]);
    expect(hallCells.size).toBeGreaterThan(0);
    for (const cell of occupiedCells([placed])) {
      expect(hallCells.has(cell), `the building sits on the hall's cell ${cell}`).toBe(
        false,
      );
    }
  });

  it("carries a relocation rather than a second building", async () => {
    const { cluster } = serveCity();
    const first = browserSession();
    const where = openCellFor(await first.load(), "NUM.S");
    await first.placeSkill("NUM.S", where);
    const moved = openCellFor(await first.load(), "NUM.S");
    expect(moved).not.toEqual(where);
    await first.moveSkill("NUM.S", moved);
    await first.flush();

    const after = await browserSession().load();
    expect(after.placements).toEqual([{ nodeId: "NUM.S", ...moved }]);
    // Two rows, not three: the hall plus one building, because a move is an update.
    expect(cluster.tables.city_placement).toHaveLength(2);
  });

  it("carries roads and their spend together, or the learner gets free roads", async () => {
    const { cluster } = serveCity();
    const first = browserSession();
    const result = await first.layRoads(
      [
        { col: 3, row: 0 },
        { col: 3, row: 1 },
      ],
      1000,
    );
    expect(result.status).toBe("committed");
    await first.flush();

    const after = await browserSession().load();
    expect(after.roads).toHaveLength(2);
    // The spend rode along on the same `city_state` row. Without it a reload refunds every
    // tile for free, because the wallet nets this out of an authoritative balance.
    expect(after.road_gold_spent).toBe(result.cost);
    expect(result.cost).toBeGreaterThan(0);
    expect(cluster.tables.city_state[0]?.road_gold_spent).toBe(result.cost);
  });

  it("round-trips and moves a canonical civic placement as a non-skill building", async () => {
    const { cluster } = serveCity();
    const first = browserSession();
    const previewId = `civic:prehistoric_campfire:${Number.MAX_SAFE_INTEGER}`;
    const where = openCellFor(await first.load(), previewId);
    const bought = await first.placeCivic(
      "prehistoric_campfire",
      where,
      civicTestPayment(10_000),
    );
    expect(bought.status).toBe("built");
    await first.flush();

    const stored = cluster.tables.city_placement.filter((row) => row.kind === "civic");
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      placement_id: "civic:prehistoric_campfire:0",
      subject_id: "prehistoric_campfire",
    });

    const reloaded = browserSession();
    const restored = await reloaded.load();
    expect(restored.civic).toEqual([{ nodeId: "civic:prehistoric_campfire:0", ...where }]);

    const moved = openCellFor(restored, previewId);
    await reloaded.moveCivic("civic:prehistoric_campfire:0", moved);
    await reloaded.flush();
    expect((await browserSession().load()).civic).toEqual([
      { nodeId: "civic:prehistoric_campfire:0", ...moved },
    ]);
    expect(
      cluster.tables.city_placement.filter((row) => row.kind === "civic"),
    ).toHaveLength(1);
  });

  it("persists civic deletion without changing sunk material, including an idempotent retry", async () => {
    const { cluster } = serveCity();
    const first = browserSession();
    const previewId = `civic:prehistoric_campfire:${Number.MAX_SAFE_INTEGER}`;
    const bought = await first.placeCivic(
      "prehistoric_campfire",
      openCellFor(await first.load(), previewId),
      civicTestPayment(10_000),
    );
    expect(bought.placementId).toBe("civic:prehistoric_campfire:0");
    await first.flush();
    const spentBefore = cluster.tables.city_island_state[0]?.civic_material_spent;

    await expect(first.removeCivic(bought.placementId as string)).resolves.toMatchObject({
      status: "removed",
    });
    expect(cluster.tables.city_placement.filter((row) => row.kind === "civic")).toEqual([]);
    expect(cluster.tables.city_island_state[0]?.civic_material_spent).toBe(spentBefore);

    const reloaded = browserSession();
    expect((await reloaded.load()).civic).toEqual([]);
    await expect(reloaded.removeCivic(bought.placementId as string)).resolves.toMatchObject(
      {
        status: "missing",
      },
    );
    expect(cluster.tables.city_island_state[0]?.civic_material_spent).toBe(spentBefore);
  });

  it("round-trips and moves a Cyberpunk civic with one durable placement identity", async () => {
    setCityEra("cyberpunk");
    const { cluster } = serveCity();
    cluster.tables.city_island_state.push({
      student_id: STUDENT,
      island_era: "cyberpunk",
      road_gold_spent: 0,
      civic_material_spent: 0,
      next_damage_ordinal: 1,
      reset_count: 0,
    });
    const first = browserSession("cyberpunk");
    const typeId = "cyberpunk_vertical_farm";
    const placementId = `civic:${typeId}:0`;
    const previewId = `civic:${typeId}:${Number.MAX_SAFE_INTEGER}`;
    const where = openCellFor(await first.load(), previewId);

    const bought = await first.placeCivic(typeId, where, civicTestPayment(100_000));
    expect(bought.status).toBe("built");
    await first.flush();

    const reloaded = browserSession("cyberpunk");
    const restored = await reloaded.load();
    expect(restored.civic).toEqual([{ nodeId: placementId, ...where }]);

    const moved = openCellFor(restored, previewId);
    await reloaded.moveCivic(placementId, moved);
    await reloaded.flush();
    expect((await browserSession("cyberpunk").load()).civic).toEqual([
      { nodeId: placementId, ...moved },
    ]);
    expect(
      cluster.tables.city_placement.filter((row) => row.kind === "civic"),
    ).toHaveLength(1);
  });

  it("never posts an empty city over a real one while it is still loading", async () => {
    /**
     * THE ORDERING THAT MATTERS MOST, and it is measured on the state that can actually be
     * destroyed. Every method awaits the hydrate, so a save always carries the stored city
     * plus the gesture. Without that, the second visit's first gesture would post the empty
     * island a not-yet-restored session reports.
     *
     * **Roads and the road spend are the subject, not placements**, and the difference is a
     * property of the schema rather than of this test. `city_placement` has no delete grant
     * (nothing in the app demolishes a building), so an empty POST cannot remove one. Roads
     * and crisis damage DO prune, and `road_gold_spent` is overwritten outright — so an
     * unhydrated save lifts every road the learner paid for and hands the material back at
     * the same time. Measured: with the hydrate gate removed, this case fails on the roads
     * and the placement assertion stays green.
     */
    const { cluster, calls } = serveCity();
    const seeded = browserSession();
    await seeded.placeSkill("NUM.S", openCellFor(await seeded.load(), "NUM.S"));
    const laid = await seeded.layRoads(
      [
        { col: 3, row: 0 },
        { col: 3, row: 1 },
      ],
      1000,
    );
    await seeded.flush();
    expect(cluster.tables.city_road).toHaveLength(2);
    const target = openCellFor(await seeded.load(), "NUM.F");

    calls.length = 0;
    const second = browserSession();
    // Mutate the instant it exists, with no await in between: the queue cannot have run.
    await second.placeSkill("NUM.F", target);
    await second.flush();

    // The traffic, for the order; then the state, for the consequence.
    expect(calls[0]).toBe("GET");
    expect(calls).toContain("POST");
    const after = await browserSession().load();
    expect(after.roads).toHaveLength(2);
    expect(after.road_gold_spent).toBe(laid.cost);
    expect(after.placements?.map((p) => p.nodeId).sort()).toEqual(["NUM.F", "NUM.S"]);
  });

  it("keeps one learner's save out of another's city", async () => {
    // The write takes its student from the verified token; the session never sends one. A
    // service that read an id from the payload would let a signed-in learner post over
    // somebody else's island, which is the direction a WRITE makes newly dangerous.
    const { cluster } = serveCity();
    const first = browserSession();
    await first.placeSkill("NUM.S", openCellFor(await first.load(), "NUM.S"));
    await first.flush();

    expect(cluster.tables.city_placement.length).toBeGreaterThan(0);
    for (const row of cluster.tables.city_placement) {
      expect(row.student_id).toBe(STUDENT);
    }
  });

  it("fails closed when the city cannot be read at all", async () => {
    // An unapplied migration is the likeliest cause, and the service's message names the
    // command that fixes it. What matters here is that the session REJECTS rather than
    // quietly running an in-memory city it would then mirror over the real one.
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          JSON.stringify({ error: 'relation "public.city_placement" does not exist' }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          },
        ),
    );
    const session = browserSession();

    await expect(session.load()).rejects.toThrow(/does not exist/);
    await expect(session.placeSkill("NUM.S", { col: 0, row: 0, rot: 0 })).rejects.toThrow(
      /does not exist/,
    );
  });
});
