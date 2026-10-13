import {
  type DataApiClient,
  type DataApiExecutor,
  lockAccountInitialization,
} from "@cr/db";
import { computeMaterialBalances, eraMaterialTotal } from "@cr/economy";
import { NO_CRISIS_DAMAGE } from "@cr/game";
import { getProductNodes } from "@cr/skill-graph";
import type { UUID } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { type CityRead, loadCityFromAurora } from "./reads";
import { loadEconomyLedger } from "./economy";
import { createFakeCluster } from "./test/fakeCluster";
import {
  type CityWrite,
  bootstrapCityInAurora,
  createAuroraWriteService,
  CITY_BOOTSTRAP_STATEMENTS,
  missingSchemaHint,
  parseCityWrite,
  resetIslandInAurora,
  saveCityToAurora,
} from "./writes";

/**
 * **A SIGNED-IN LEARNER BUILDS A CITY, REFRESHES, AND IT IS STILL THERE.**
 *
 * The round trip is the whole subject: `saveCityToAurora` writes, `loadCityFromAurora`
 * reads it back, and the two are held equal FIELD BY FIELD off a list the compiler derives
 * from `CityRead`. A round trip that checks only the fields it happens to remember is a
 * tautology — it cannot fail for the one defect this seam produces, which is a field one
 * side stores and the other never fetches. `EXPECTED` below is typed
 * `Record<keyof CityRead, unknown>`, so a field added to the read model does not compile
 * until this file names it, and a field the writer stops storing fails the comparison.
 *
 * Both sides are the real functions over `createFakeCluster`, which throws on any statement
 * it does not model. Read its header for what that double can and cannot prove.
 */

const STUDENT: UUID = "00000000-0000-4000-8000-0000000000aa";
const OTHER: UUID = "00000000-0000-4000-8000-0000000000bb";

/** Every product node a fresh archipelago read synthesizes. */
const CITY_NODE_COUNT = getProductNodes().length;

function city(over: Partial<CityWrite> = {}): CityWrite {
  return {
    placements: [],
    civic: [],
    town_hall: null,
    roads: [],
    road_gold_spent: 0,
    civic_material_spent: 0,
    crisis_damage: NO_CRISIS_DAMAGE,
    era_id: "prehistoric",
    island_era: "prehistoric",
    current_island: "prehistoric",
    ...over,
  };
}

function seedPaidRepair(
  cluster: ReturnType<typeof createFakeCluster>,
  damageId: string,
  kind: "building" | "ground" | "civic",
  subject: string,
): void {
  const eventId = `repair:${damageId}:${kind}:${subject}`;
  cluster.tables.resource_grant_ledger.push({
    student_id: STUDENT,
    event_id: eventId,
    resource_type: "stone",
    kind: "spend",
    amount: 1,
    reason_code: eventId,
    era_id: "prehistoric",
    created_at: "2026-08-06T00:00:00.000Z",
  });
}

/** A city with something in every field the writer owns, so nothing is vacuously equal. */
function wholeCity(): CityWrite {
  return city({
    placements: [
      { nodeId: "NUM.S", col: -4, row: -3, rot: 1 },
      { nodeId: "NUM.F", col: 2, row: 3, rot: 0 },
    ],
    town_hall: { nodeId: "town-hall", col: -1, row: -1, rot: 2 },
    roads: [
      { col: 1, row: 1 },
      { col: 1, row: 2 },
    ],
    road_gold_spent: 10,
    crisis_damage: {
      next_damage_id: 3,
      ruined_buildings: [{ node_id: "NUM.2", damage_id: "d1" }],
      ruined_cells: [{ cell: "3,4", damage_id: "d1" }],
      suspended_civic: [{ placement_id: "civic:prehistoric_longhouse:1", damage_id: "d2" }],
      overwritten_records: [],
    },
  });
}

describe("the authenticated first-city bootstrap", () => {
  it("creates only the empty Prehistoric founding and is idempotent", async () => {
    const cluster = createFakeCluster();

    const first = await bootstrapCityInAurora(cluster.db, STUDENT);
    const second = await bootstrapCityInAurora(cluster.db, STUDENT);

    expect(first.launch_initialized).toBe(true);
    expect(first.current_island).toBe("prehistoric");
    expect(second).toEqual(first);
    expect(cluster.tables.city_state).toEqual([
      expect.objectContaining({
        student_id: STUDENT,
        era_id: "prehistoric",
        current_island: "prehistoric",
        road_gold_spent: 0,
        next_damage_ordinal: 1,
      }),
    ]);
    expect(cluster.tables.city_island_state).toEqual([
      expect.objectContaining({
        student_id: STUDENT,
        island_era: "prehistoric",
        road_gold_spent: 0,
        civic_material_spent: 0,
        next_damage_ordinal: 1,
        reset_count: 0,
      }),
    ]);
    expect(cluster.tables.student_node_state).toEqual([]);
    expect(cluster.tables.neighborhood_state).toEqual([]);
    expect(cluster.tables.city_placement).toEqual([]);
    expect(cluster.tables.city_road).toEqual([]);
    expect(cluster.tables.city_crisis_damage).toEqual([]);
    expect(cluster.tables.resource_grant_ledger).toEqual([]);
    expect(
      cluster.issued.filter(
        ({ sql }) => sql === CITY_BOOTSTRAP_STATEMENTS.initializeCityState,
      ),
    ).toHaveLength(1);
    expect(
      cluster.issued.filter(
        ({ sql }) => sql === CITY_BOOTSTRAP_STATEMENTS.initializeIslandState,
      ),
    ).toHaveLength(1);
  });

  it("converges concurrent devices on one founding", async () => {
    const cluster = createFakeCluster();

    const cities = await Promise.all([
      bootstrapCityInAurora(cluster.db, STUDENT),
      bootstrapCityInAurora(cluster.db, STUDENT),
      bootstrapCityInAurora(cluster.db, STUDENT),
    ]);

    expect(cities).toHaveLength(3);
    expect(cities.every((city) => city.launch_initialized)).toBe(true);
    expect(cluster.tables.city_state).toHaveLength(1);
    expect(cluster.tables.city_island_state).toHaveLength(1);
  });

  it("lets a concurrent diagnostic start win without founding or resetting a city", async () => {
    const cluster = createFakeCluster();
    let announceLocked = (): void => {};
    const diagnosticLocked = new Promise<void>((resolve) => {
      announceLocked = resolve;
    });
    let releaseDiagnostic = (): void => {};
    const holdDiagnostic = new Promise<void>((resolve) => {
      releaseDiagnostic = resolve;
    });

    const diagnostic = cluster.db.withTransaction(async (tx) => {
      await lockAccountInitialization(tx, STUDENT);
      cluster.tables.assessment_administration.push({
        administration_id: "diagnostic-in-flight",
        student_id: STUDENT,
        purpose: "pre",
      });
      announceLocked();
      await holdDiagnostic;
    });
    await diagnosticLocked;

    const bootstrap = bootstrapCityInAurora(cluster.db, STUDENT);
    await Promise.resolve();
    expect(cluster.tables.city_state).toEqual([]);

    releaseDiagnostic();
    await diagnostic;
    const city = await bootstrap;
    expect(city.launch_initialized).toBe(true);
    expect(cluster.tables.assessment_administration).toHaveLength(1);
    expect(cluster.tables.city_state).toEqual([]);
    expect(cluster.tables.city_island_state).toEqual([]);
  });

  it("preserves a later-era account byte for byte", async () => {
    const cityState = {
      student_id: STUDENT,
      era_id: "classical",
      current_island: "classical",
      road_gold_spent: 25,
      next_damage_ordinal: 7,
      updated_at: 42,
    };
    const cluster = createFakeCluster({
      city_state: [cityState],
      city_island_state: [
        {
          student_id: STUDENT,
          island_era: "classical",
          road_gold_spent: 25,
          civic_material_spent: 9,
          next_damage_ordinal: 7,
          reset_count: 0,
          updated_at: 42,
        },
      ],
    });

    const loaded = await bootstrapCityInAurora(cluster.db, STUDENT);

    expect(loaded.current_island).toBe("classical");
    expect(cluster.tables.city_state).toEqual([cityState]);
    expect(
      cluster.issued.some(
        ({ sql }) => sql === CITY_BOOTSTRAP_STATEMENTS.initializeCityState,
      ),
    ).toBe(false);
  });

  it("rolls the founding back when its second write fails", async () => {
    const cluster = createFakeCluster();
    const failingDb: DataApiClient = {
      ...cluster.db,
      withTransaction: <T>(run: (tx: DataApiExecutor) => Promise<T>): Promise<T> =>
        cluster.db.withTransaction((tx) =>
          run({
            ...tx,
            execute: (sql, params) => {
              if (sql === CITY_BOOTSTRAP_STATEMENTS.initializeIslandState) {
                throw new Error("injected island bootstrap failure");
              }
              return tx.execute(sql, params);
            },
          }),
        ),
    };

    await expect(bootstrapCityInAurora(failingDb, STUDENT)).rejects.toThrow(
      "injected island bootstrap failure",
    );
    expect(cluster.tables.city_state).toEqual([]);
    expect(cluster.tables.city_island_state).toEqual([]);
  });

  it("authenticates before touching the database", async () => {
    const cluster = createFakeCluster();
    const writes = createAuroraWriteService({
      db: cluster.db,
      authenticate: async (token) => (token === "jwt" ? { student_id: STUDENT } : null),
    });

    expect(await writes.bootstrapCity(null)).toEqual({
      status: 401,
      body: { error: "unauthorized" },
    });
    expect(cluster.issued).toEqual([]);
    const accepted = await writes.bootstrapCity("jwt");
    expect(accepted.status).toBe(200);
    expect(accepted.body).toMatchObject({ launch_initialized: true });
  });
});

describe("a written city reads back as the same city", () => {
  it("round-trips every field of CityRead, and the field list is the type's", async () => {
    const cluster = createFakeCluster();
    const written = wholeCity();

    await saveCityToAurora(cluster.db, STUDENT, written);
    const read = await loadCityFromAurora(cluster.db, STUDENT);

    /**
     * THE DERIVATION. `Record<keyof CityRead, unknown>` is exhaustive: this object does not
     * compile with a key missing, so growing `CityRead` forces an entry here, and the
     * `toEqual` below fails the moment the writer stops storing one of them (the read hands
     * back the empty value instead).
     *
     * `node_states` and `neighborhood_state` are named with what a read over a
     * writer-populated database ACTUALLY returns, which is the untouched default — that is
     * this change's deferral written where it can be checked rather than only asserted in
     * prose. See the case below that pins it.
     */
    const EXPECTED: Record<keyof CityRead, unknown> = {
      launch_initialized: true,
      placements: [
        { nodeId: "NUM.S", col: -4, row: -3, rot: 1 },
        { nodeId: "NUM.F", col: 2, row: 3, rot: 0 },
      ],
      civic: [],
      town_hall: { nodeId: "town-hall", col: -1, row: -1, rot: 2 },
      roads: [
        { col: 1, row: 1 },
        { col: 1, row: 2 },
      ],
      road_gold_spent: 10,
      civic_material_spent: 0,
      crisis_damage: {
        next_damage_id: 3,
        ruined_buildings: [{ node_id: "NUM.2", damage_id: "d1" }],
        ruined_cells: [{ cell: "3,4", damage_id: "d1" }],
        suspended_civic: [
          { placement_id: "civic:prehistoric_longhouse:1", damage_id: "d2" },
        ],
        overwritten_records: [],
      },
      archipelago_version: 1,
      current_island: "prehistoric",
      islands: [
        {
          era_id: "prehistoric",
          placements: [
            { nodeId: "NUM.S", col: -4, row: -3, rot: 1 },
            { nodeId: "NUM.F", col: 2, row: 3, rot: 0 },
          ],
          civic: [],
          town_hall: { nodeId: "town-hall", col: -1, row: -1, rot: 2 },
          roads: [
            { col: 1, row: 1 },
            { col: 1, row: 2 },
          ],
          road_gold_spent: 10,
          civic_material_spent: 0,
          crisis_damage: {
            next_damage_id: 3,
            ruined_buildings: [{ node_id: "NUM.2", damage_id: "d1" }],
            ruined_cells: [{ cell: "3,4", damage_id: "d1" }],
            suspended_civic: [
              { placement_id: "civic:prehistoric_longhouse:1", damage_id: "d2" },
            ],
            overwritten_records: [],
          },
        },
      ],
      node_states: read.node_states,
      neighborhood_state: null,
    };

    // A floor under the derivation: a `Record` over a type that had lost its fields would
    // be satisfied by `{}`, and every equality below would then hold over nothing.
    expect(Object.keys(EXPECTED).length).toBeGreaterThanOrEqual(7);
    expect(new Set(Object.keys(read))).toEqual(new Set(Object.keys(EXPECTED)));
    expect(read).toEqual(EXPECTED);
  });

  it("re-reads a saved city identically after saving it a second time", async () => {
    // Idempotence is what lets the browser mirror after every gesture without tracking
    // which gesture it was. A second save must upsert every row onto itself and prune
    // nothing — a prune that read its own set backwards would empty the city here.
    const cluster = createFakeCluster();
    await saveCityToAurora(cluster.db, STUDENT, wholeCity());
    const first = await loadCityFromAurora(cluster.db, STUDENT);
    await saveCityToAurora(cluster.db, STUDENT, wholeCity());
    const second = await loadCityFromAurora(cluster.db, STUDENT);

    expect(second).toEqual(first);
    expect(cluster.tables.city_placement).toHaveLength(3);
    expect(cluster.tables.city_road).toHaveLength(2);
    expect(cluster.tables.city_crisis_damage).toHaveLength(3);
  });

  it("authoritatively round-trips the Intrusion record magnitude and one-use verification", async () => {
    const cluster = createFakeCluster();
    const placementId = "civic:information_age_food_warehouse:1";
    cluster.tables.city_island_state.push({
      student_id: STUDENT,
      island_era: "information_age",
      road_gold_spent: 0,
      civic_material_spent: 0,
      next_damage_ordinal: 1,
      reset_count: 0,
    });
    await saveCityToAurora(
      cluster.db,
      STUDENT,
      city({
        era_id: "information_age",
        island_era: "information_age",
        current_island: "information_age",
        crisis_damage: {
          ...NO_CRISIS_DAMAGE,
          next_damage_id: 2,
          overwritten_records: [
            {
              placement_id: placementId,
              damage_id: "d1",
              bands_dark: 5,
              verification_attempted: false,
            },
          ],
        },
      }),
    );

    const first = await loadCityFromAurora(cluster.db, STUDENT);
    expect(first.crisis_damage.overwritten_records).toEqual([
      {
        placement_id: placementId,
        damage_id: "d1",
        bands_dark: 5,
        verification_attempted: false,
      },
    ]);

    await saveCityToAurora(cluster.db, STUDENT, {
      ...city({
        era_id: "information_age",
        island_era: "information_age",
        current_island: "information_age",
      }),
      crisis_damage: {
        ...first.crisis_damage,
        overwritten_records: [
          {
            placement_id: placementId,
            damage_id: "d1",
            bands_dark: 2,
            verification_attempted: true,
          },
        ],
      },
    });

    expect(
      (await loadCityFromAurora(cluster.db, STUDENT)).crisis_damage.overwritten_records,
    ).toEqual([
      {
        placement_id: placementId,
        damage_id: "d1",
        bands_dark: 2,
        verification_attempted: true,
      },
    ]);
    expect(cluster.tables.city_crisis_damage).toHaveLength(1);

    await saveCityToAurora(
      cluster.db,
      STUDENT,
      city({
        era_id: "information_age",
        island_era: "information_age",
        current_island: "information_age",
        crisis_damage: {
          ...NO_CRISIS_DAMAGE,
          next_damage_id: 2,
          overwritten_records: [],
        },
      }),
    );
    expect(
      (await loadCityFromAurora(cluster.db, STUDENT)).crisis_damage.overwritten_records,
    ).toEqual([]);
    expect(cluster.tables.city_crisis_damage).toHaveLength(0);
  });

  it("keeps two islands at the same cells without either save pruning the other", async () => {
    const cluster = createFakeCluster();
    const eraOne = city({
      placements: [{ nodeId: "NUM.S", col: 2, row: 2, rot: 0 }],
      town_hall: { nodeId: "town-hall", col: 0, row: 0, rot: 0 },
      roads: [
        { col: 3, row: 3 },
        { col: 4, row: 4 },
      ],
      road_gold_spent: 10,
    });
    const eraTwo = city({
      era_id: "neolithic",
      island_era: "neolithic",
      current_island: "neolithic",
      placements: [{ nodeId: "NUM.F", col: 2, row: 2, rot: 1 }],
      town_hall: { nodeId: "town-hall", col: 0, row: 0, rot: 0 },
      roads: [{ col: 3, row: 3 }],
      road_gold_spent: 5,
    });

    await saveCityToAurora(cluster.db, STUDENT, eraOne);
    cluster.tables.city_island_state.push({
      student_id: STUDENT,
      island_era: "neolithic",
      road_gold_spent: 0,
      civic_material_spent: 0,
      next_damage_ordinal: 1,
      reset_count: 0,
    });
    await saveCityToAurora(cluster.db, STUDENT, eraTwo);
    const read = await loadCityFromAurora(cluster.db, STUDENT);

    expect(read.current_island).toBe("neolithic");
    expect(read.islands.map((island) => island.era_id)).toEqual([
      "prehistoric",
      "neolithic",
    ]);
    expect(read.islands[0]?.placements.map((placed) => placed.nodeId)).toEqual(["NUM.S"]);
    expect(read.islands[1]?.placements.map((placed) => placed.nodeId)).toEqual(["NUM.F"]);
    expect(read.islands.map((island) => island.roads)).toEqual([
      [
        { col: 3, row: 3 },
        { col: 4, row: 4 },
      ],
      [{ col: 3, row: 3 }],
    ]);
    expect(
      cluster.tables.city_placement.filter((row) => row.placement_id === "town-hall"),
    ).toHaveLength(2);
  });

  it("moves a building rather than founding a second one", async () => {
    const cluster = createFakeCluster();
    await saveCityToAurora(cluster.db, STUDENT, wholeCity());
    await saveCityToAurora(
      cluster.db,
      STUDENT,
      city({
        ...wholeCity(),
        placements: [
          { nodeId: "NUM.S", col: 5, row: 5, rot: 3 },
          { nodeId: "NUM.F", col: 2, row: 3, rot: 0 },
        ],
        town_hall: { nodeId: "town-hall", col: 4, row: -4, rot: 0 },
      }),
    );
    const read = await loadCityFromAurora(cluster.db, STUDENT);

    expect(read.placements).toEqual([
      { nodeId: "NUM.S", col: 5, row: 5, rot: 3 },
      { nodeId: "NUM.F", col: 2, row: 3, rot: 0 },
    ]);
    expect(read.town_hall).toEqual({ nodeId: "town-hall", col: 4, row: -4, rot: 0 });
    // Three rows, not six: `placement_id` is the node id, so a move lands on the row that
    // is already there. A second row would render the same building twice and would make
    // the `N/6` roster count wrong forever, since nothing deletes a placement.
    expect(cluster.tables.city_placement).toHaveLength(3);
  });

  it("lifts a road and a repaired ruin instead of accumulating them", async () => {
    const cluster = createFakeCluster();
    await saveCityToAurora(cluster.db, STUDENT, wholeCity());
    seedPaidRepair(cluster, "d1", "building", "NUM.2");
    // What `removeRoads` and a repair leave behind: fewer tiles, fewer ruins, a refunded
    // spend — and a mint that has NOT come back down (see the rewind case below).
    await saveCityToAurora(
      cluster.db,
      STUDENT,
      city({
        ...wholeCity(),
        roads: [{ col: 1, row: 1 }],
        road_gold_spent: 10,
        crisis_damage: {
          next_damage_id: 3,
          ruined_buildings: [],
          ruined_cells: [{ cell: "3,4", damage_id: "d1" }],
          suspended_civic: [
            { placement_id: "civic:prehistoric_longhouse:1", damage_id: "d2" },
          ],
          overwritten_records: [],
        },
      }),
    );
    const read = await loadCityFromAurora(cluster.db, STUDENT);

    expect(read.roads).toEqual([{ col: 1, row: 1 }]);
    expect(read.road_gold_spent).toBe(5);
    expect(read.crisis_damage.ruined_buildings).toEqual([]);
    expect(read.crisis_damage.ruined_cells).toEqual([{ cell: "3,4", damage_id: "d1" }]);
  });

  it("keeps an unrepaired ruin's created_at across a save", async () => {
    // The fold keeps an already-ruined subject's ORIGINAL damage id rather than re-stamping
    // it, precisely so an unpaid repair cannot be silently invalidated. A writer that
    // deleted and re-inserted every damage row would churn `created_at` under it; the
    // `not exists` prune leaves a surviving ruin alone.
    const cluster = createFakeCluster();
    await saveCityToAurora(cluster.db, STUDENT, wholeCity());
    const stamps = cluster.tables.city_crisis_damage.map((row) => row.created_at);
    await saveCityToAurora(cluster.db, STUDENT, wholeCity());

    expect(cluster.tables.city_crisis_damage.map((row) => row.created_at)).toEqual(stamps);
    expect(stamps.length).toBe(3);
  });

  it("writes NO learning record, and that is the deferral this change ships with", async () => {
    // `student_node_state` and `neighborhood_state` belong to the mastery lane and to
    // `engines/game`; Contracts §3 makes them the only writers. A browser POST must not
    // reach either, so the tables stay empty and the read still synthesizes a full node set
    // — which is what makes a signed-in learner's buildings come back at the SITE stage.
    // The fake throws on a statement it does not model, so a writer that started touching
    // them would fail before this assertion, not after it.
    const cluster = createFakeCluster();
    await saveCityToAurora(cluster.db, STUDENT, wholeCity());

    expect(cluster.tables.student_node_state).toEqual([]);
    expect(cluster.tables.neighborhood_state).toEqual([]);
    const read = await loadCityFromAurora(cluster.db, STUDENT);
    expect(read.node_states).toHaveLength(CITY_NODE_COUNT);
    expect(read.node_states.every((state) => state.mastery === 0)).toBe(true);
  });
});

describe("the damage-id mint cannot rewind", () => {
  it("holds the mint above a repaired ruin's ordinal", async () => {
    // THE DEFECT, as a round trip. `next_damage_id` was derived as `max(ordinal) + 1` over
    // the rows that survive, which satisfies the strictly-greater invariant over rows
    // PRESENT and goes backwards the moment a repair deletes the highest one. A re-issued
    // ordinal keys a repair spend the ledger has already recorded, so the second ruin
    // reports `already_spent` and can never be cleared.
    const cluster = createFakeCluster();
    await saveCityToAurora(
      cluster.db,
      STUDENT,
      city({
        crisis_damage: {
          next_damage_id: 4,
          ruined_buildings: [
            { node_id: "NUM.2", damage_id: "d1" },
            { node_id: "NUM.3", damage_id: "d3" },
          ],
          ruined_cells: [{ cell: "3,4", damage_id: "d2" }],
          suspended_civic: [],
          overwritten_records: [],
        },
      }),
    );
    expect(
      (await loadCityFromAurora(cluster.db, STUDENT)).crisis_damage.next_damage_id,
    ).toBe(4);

    // The learner repairs d3 — the highest ordinal, so `max(ordinal)` over the survivors
    // drops to 2.
    seedPaidRepair(cluster, "d3", "building", "NUM.3");
    await saveCityToAurora(
      cluster.db,
      STUDENT,
      city({
        crisis_damage: {
          next_damage_id: 4,
          ruined_buildings: [{ node_id: "NUM.2", damage_id: "d1" }],
          ruined_cells: [{ cell: "3,4", damage_id: "d2" }],
          suspended_civic: [],
          overwritten_records: [],
        },
      }),
    );
    const after = await loadCityFromAurora(cluster.db, STUDENT);

    expect(cluster.tables.city_crisis_damage).toHaveLength(2);
    expect(after.crisis_damage.next_damage_id).toBe(4);
  });

  it("refuses a client that posts a mint below the stored high-water mark", async () => {
    // A stale tab, an older build, or a hand-edited payload. `greatest(…)` in the upsert is
    // what makes this monotone at the database rather than in whichever client asked last.
    const cluster = createFakeCluster();
    await saveCityToAurora(
      cluster.db,
      STUDENT,
      city({
        crisis_damage: {
          next_damage_id: 9,
          ruined_buildings: [{ node_id: "NUM.2", damage_id: "d8" }],
          ruined_cells: [],
          suspended_civic: [],
          overwritten_records: [],
        },
      }),
    );
    seedPaidRepair(cluster, "d8", "building", "NUM.2");
    await saveCityToAurora(cluster.db, STUDENT, city({ crisis_damage: NO_CRISIS_DAMAGE }));
    const after = await loadCityFromAurora(cluster.db, STUDENT);

    expect(cluster.tables.city_crisis_damage).toEqual([]);
    expect(after.crisis_damage).toEqual({
      next_damage_id: 9,
      ruined_buildings: [],
      ruined_cells: [],
      suspended_civic: [],
      overwritten_records: [],
    });
  });

  it("floors the mint above every ordinal the payload carries, not at the number it claims", async () => {
    // A client whose own mint is behind its own ruins. The row set is the evidence, so the
    // written mint is derived from it rather than believed.
    const cluster = createFakeCluster();
    await saveCityToAurora(
      cluster.db,
      STUDENT,
      city({
        crisis_damage: {
          next_damage_id: 1,
          ruined_buildings: [{ node_id: "NUM.2", damage_id: "d11" }],
          ruined_cells: [],
          suspended_civic: [],
          overwritten_records: [],
        },
      }),
    );
    const read = await loadCityFromAurora(cluster.db, STUDENT);

    // `d11` sorts before `d2` as text, which is why the column is the ordinal.
    expect(read.crisis_damage.next_damage_id).toBe(12);
  });

  it("still mints above the rows when the student has no city_state row at all", async () => {
    // A city seeded by hand, or one written by a build that predates the high-water column.
    // The read takes the greater of the two, so neither source can pull it down.
    const cluster = createFakeCluster({
      city_crisis_damage: [
        {
          student_id: STUDENT,
          damage_ordinal: 5,
          damage_id: "d5",
          subject_kind: "ground",
          subject: "0,1",
        },
      ],
    });
    const read = await loadCityFromAurora(cluster.db, STUDENT);

    expect(read.crisis_damage.next_damage_id).toBe(6);
  });
});

describe("resetting a durable island", () => {
  it("clears place-owned state, preserves the Hall, and restores exactly one era total", async () => {
    const cluster = createFakeCluster({
      resource_grant_ledger: [
        {
          student_id: STUDENT,
          event_id: "lesson_complete:ALG.1",
          resource_type: "grain",
          kind: "grant",
          amount: 500,
          reason_code: "lesson_complete",
          created_at: "2026-08-06T00:00:00.000Z",
        },
      ],
      city_island_state: [
        {
          student_id: STUDENT,
          island_era: "neolithic",
          road_gold_spent: 0,
          civic_material_spent: 0,
          next_damage_ordinal: 1,
          reset_count: 0,
        },
      ],
    });
    await saveCityToAurora(
      cluster.db,
      STUDENT,
      city({
        era_id: "neolithic",
        island_era: "neolithic",
        current_island: "neolithic",
        placements: [{ nodeId: "ALG.1", col: 2, row: 2, rot: 0 }],
        town_hall: { nodeId: "town-hall", col: 0, row: 0, rot: 0 },
        roads: [{ col: 3, row: 3 }],
        road_gold_spent: 5,
        civic_material_spent: 40,
        crisis_damage: {
          next_damage_id: 2,
          ruined_buildings: [{ node_id: "ALG.1", damage_id: "d1" }],
          ruined_cells: [],
          suspended_civic: [],
          overwritten_records: [],
        },
      }),
    );

    await resetIslandInAurora(cluster.db, STUDENT, "neolithic");
    const read = await loadCityFromAurora(cluster.db, STUDENT);
    const island = read.islands.find((entry) => entry.era_id === "neolithic");
    expect(island?.town_hall?.nodeId).toBe("town-hall");
    expect(island?.placements).toEqual([]);
    expect(island?.civic).toEqual([]);
    expect(island?.roads).toEqual([]);
    expect(island?.road_gold_spent).toBe(0);
    expect(island?.civic_material_spent).toBe(0);
    expect(island?.crisis_damage.ruined_buildings).toEqual([]);

    const entries = await loadEconomyLedger(cluster.db, STUDENT);
    expect(computeMaterialBalances({ entries }).grain).toBe(eraMaterialTotal("neolithic"));
    const ledgerCount = entries.length;
    await resetIslandInAurora(cluster.db, STUDENT, "neolithic");
    expect(await loadEconomyLedger(cluster.db, STUDENT)).toHaveLength(ledgerCount);
  });

  it("refuses to create and fund an unfounded island through reset", async () => {
    const cluster = createFakeCluster();
    const writes = createAuroraWriteService({
      db: cluster.db,
      authenticate: async (token) => (token === "jwt" ? { student_id: STUDENT } : null),
    });

    const response = await writes.resetIsland("jwt", { island_era: "cyberpunk" });

    expect(response.status).toBe(409);
    expect(cluster.tables.city_island_state).toEqual([]);
    expect(cluster.tables.resource_grant_ledger).toEqual([]);
  });
});

describe("a save is atomic and scoped to one student", () => {
  it("scopes every statement to the caller's own sub", async () => {
    const cluster = createFakeCluster();
    await saveCityToAurora(cluster.db, STUDENT, wholeCity());

    // Eight layout mutations, the initial-island insert, the founded-set read, and the
    // ledger read that derives paid damage/civic funding. The count is asserted so an
    // authority check that silently stopped running cannot pass vacuously.
    expect(cluster.issued.length).toBe(11);
    for (const { sql, params } of cluster.issued) {
      expect(sql, sql).toContain(":sid::uuid");
      expect(params?.sid, sql).toBe(STUDENT);
      expect(sql, sql).not.toContain(OTHER);
    }
  });

  it("leaves another student's city untouched", async () => {
    const cluster = createFakeCluster();
    await saveCityToAurora(cluster.db, OTHER, wholeCity());
    await saveCityToAurora(cluster.db, STUDENT, city());

    const mine = await loadCityFromAurora(cluster.db, STUDENT);
    const theirs = await loadCityFromAurora(cluster.db, OTHER);
    expect(mine.placements).toEqual([]);
    expect(mine.roads).toEqual([]);
    // The prunes are `delete … where student_id = :sid and not exists (…)`. Drop the
    // student clause and saving an empty city would empty everyone's.
    expect(theirs.placements).toHaveLength(2);
    expect(theirs.roads).toHaveLength(2);
    expect(theirs.crisis_damage.ruined_buildings).toHaveLength(1);
  });

  it("rolls the whole city back when one statement fails", async () => {
    const cluster = createFakeCluster();
    await saveCityToAurora(cluster.db, STUDENT, wholeCity());
    const before = await loadCityFromAurora(cluster.db, STUDENT);

    // The browser's road counter is no longer a failure input: the server derives it from
    // rows. Use a placement identity the schema rejects instead, after the prune has already
    // run, so rollback still has observable work to undo.
    await expect(
      saveCityToAurora(cluster.db, STUDENT, {
        ...wholeCity(),
        roads: [{ col: 8, row: 8 }],
        placements: [{ nodeId: "bad:id", col: 0, row: 0, rot: 0 }],
      }),
    ).rejects.toThrow(/placement_id/);

    expect(await loadCityFromAurora(cluster.db, STUDENT)).toEqual(before);
  });
});

describe("POST /api/city refuses what it cannot store", () => {
  const authed = { student_id: STUDENT };

  function service(cluster = createFakeCluster()) {
    return {
      cluster,
      writes: createAuroraWriteService({
        db: cluster.db,
        authenticate: async (token) => (token === "jwt" ? authed : null),
      }),
    };
  }

  it("401s an unverified caller before it looks at the body", async () => {
    const { cluster, writes } = service();
    const response = await writes.saveCity(null, wholeCity());

    expect(response.status).toBe(401);
    expect(cluster.issued).toEqual([]);
    expect(cluster.tables.city_placement).toEqual([]);
  });

  it("stores the city under the VERIFIED sub, never a student_id in the payload", async () => {
    const { cluster, writes } = service();
    const response = await writes.saveCity("jwt", {
      ...wholeCity(),
      student_id: OTHER,
    });

    expect(response.status).toBe(200);
    expect(cluster.tables.city_placement.every((row) => row.student_id === STUDENT)).toBe(
      true,
    );
    expect(cluster.tables.city_placement.length).toBeGreaterThan(0);
    expect(JSON.stringify(cluster.tables)).not.toContain(OTHER);
  });

  it("cannot found or land on a future island by posting city state", async () => {
    const { cluster, writes } = service();
    const forged = await writes.saveCity(
      "jwt",
      city({
        era_id: "neolithic",
        island_era: "neolithic",
        current_island: "neolithic",
        town_hall: { nodeId: "town-hall", col: 0, row: 0, rot: 0 },
      }),
    );

    expect(forged.status).toBe(409);
    expect(forged.body).toMatchObject({ error: "island_not_founded" });
    expect(cluster.tables.city_island_state).toEqual([]);
    expect(cluster.tables.city_state).toEqual([]);
    expect(cluster.tables.city_placement).toEqual([]);
  });

  it("cannot erase unpaid durable damage by omitting it from a city snapshot", async () => {
    const { cluster, writes } = service();
    expect((await writes.saveCity("jwt", wholeCity())).status).toBe(200);
    expect(cluster.tables.city_crisis_damage.length).toBeGreaterThan(0);

    const omitted = await writes.saveCity(
      "jwt",
      city({ ...wholeCity(), crisis_damage: NO_CRISIS_DAMAGE }),
    );

    expect(omitted.status).toBe(200);
    expect(cluster.tables.city_crisis_damage).toHaveLength(3);
    expect(
      cluster.tables.resource_grant_ledger.filter((row) => row.kind === "spend"),
    ).toEqual([]);
  });

  it("cannot resurrect paid damage from a stale city snapshot", async () => {
    const { cluster, writes } = service();
    expect((await writes.saveCity("jwt", wholeCity())).status).toBe(200);
    seedPaidRepair(cluster, "d1", "building", "NUM.2");

    expect((await writes.saveCity("jwt", wholeCity())).status).toBe(200);

    expect(
      cluster.tables.city_crisis_damage.filter(
        (row) => row.subject_kind === "building" && row.subject === "NUM.2",
      ),
    ).toEqual([]);
    expect(cluster.tables.city_crisis_damage).toHaveLength(2);
  });

  it("derives durable funding totals from stored subjects instead of client counters", async () => {
    const { cluster, writes } = service();
    const response = await writes.saveCity("jwt", {
      ...wholeCity(),
      roads: [
        { col: 1, row: 1 },
        { col: 2, row: 2 },
        { col: 3, row: 3 },
      ],
      road_gold_spent: 0,
      civic_material_spent: 1,
    });

    expect(response.status).toBe(200);
    expect(cluster.tables.city_island_state[0]).toMatchObject({
      road_gold_spent: 15,
      civic_material_spent: 0,
    });
  });

  it("400s each malformed field by name rather than 500ing on a constraint", async () => {
    const { cluster, writes } = service();
    const rejected: Record<string, unknown> = {
      "a body that is not an object": "not a city",
      "an era outside the authored sequence": { ...wholeCity(), era_id: "steam_age" },
      "a placement id with the event-id delimiter in it": {
        ...wholeCity(),
        placements: [{ nodeId: "civic:longhouse:1", col: 0, row: 0, rot: 0 }],
      },
      "a fractional grid cell": {
        ...wholeCity(),
        roads: [{ col: 1.5, row: 1 }],
      },
      "a negative road spend": { ...wholeCity(), road_gold_spent: -1 },
      "a damage id that is not `d<n>`": {
        ...wholeCity(),
        crisis_damage: {
          next_damage_id: 2,
          ruined_buildings: [{ node_id: "NUM.2", damage_id: "ruin-1" }],
          ruined_cells: [],
          suspended_civic: [],
        },
      },
      "a crisis record missing a collection": {
        ...wholeCity(),
        crisis_damage: { next_damage_id: 1, ruined_buildings: [], ruined_cells: [] },
      },
      // A null entry inside a collection. Not a hypothetical shape of malformed JSON: it is
      // the one that used to throw a TypeError out of the parser and answer 500 with a stack,
      // for a request whose answer is a 400 naming the field.
      "a null entry inside a crisis collection": {
        ...wholeCity(),
        crisis_damage: {
          next_damage_id: 2,
          ruined_buildings: [null],
          ruined_cells: [],
          suspended_civic: [],
        },
      },
      "a crisis entry with no subject field at all": {
        ...wholeCity(),
        crisis_damage: {
          next_damage_id: 2,
          ruined_buildings: [{ damage_id: "d1" }],
          ruined_cells: [],
          suspended_civic: [],
        },
      },
    };

    // A floor, so the sweep cannot pass by being empty.
    expect(Object.keys(rejected).length).toBeGreaterThanOrEqual(7);
    for (const [why, body] of Object.entries(rejected)) {
      const response = await writes.saveCity("jwt", body);
      expect(response.status, why).toBe(400);
      expect(
        String((response.body as { error: string }).error).length,
        why,
      ).toBeGreaterThan(10);
    }
    // Nothing reached the database at all: a refused body is refused whole.
    expect(cluster.issued).toEqual([]);
  });

  it("accepts the empty island a freshly seeded account starts from", async () => {
    const { writes, cluster } = service();
    expect((await writes.saveCity("jwt", city())).status).toBe(200);

    const read = await loadCityFromAurora(cluster.db, STUDENT);
    expect(read.placements).toEqual([]);
    expect(read.town_hall).toBeNull();
    expect(read.crisis_damage).toEqual(NO_CRISIS_DAMAGE);
  });
});

describe("parseCityWrite is the same gate the route uses", () => {
  it("passes a whole city through unchanged", () => {
    const parsed = parseCityWrite(wholeCity());
    expect("city" in parsed && parsed.city).toEqual(wholeCity());
  });

  it("names the field it refused", () => {
    const parsed = parseCityWrite({ ...wholeCity(), road_gold_spent: "20" });
    expect("error" in parsed && parsed.error).toContain("road_gold_spent");
  });
});

describe("an unapplied migration says what to run", () => {
  it("turns a missing table into the command that creates it", () => {
    const hint = missingSchemaHint(
      'BadRequestException: ERROR: relation "public.city_placement" does not exist',
    );
    expect(hint).toContain("node db/apply.mjs");
    expect(hint).toContain('relation "public.city_placement" does not exist');
  });

  it("does the same for a column, which is how 0005 fails on a cluster stuck at 0004", () => {
    expect(
      missingSchemaHint('ERROR: column "next_damage_ordinal" does not exist'),
    ).toContain("node db/apply.mjs");
  });

  it("leaves every other failure alone", () => {
    expect(missingSchemaHint("connection reset")).toBeNull();
    expect(missingSchemaHint("permission denied for table city_placement")).toBeNull();
  });
});
