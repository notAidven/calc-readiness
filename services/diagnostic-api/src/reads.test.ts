import type { DataApiExecutor, SqlParams } from "@cr/db";
import { getProductNodes } from "@cr/skill-graph";
import type { UUID } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { ACCOUNT_STATE_EXISTS_SQL } from "./accountState";
import { type CityRead, loadCityFromAurora } from "./reads";

/**
 * **`GET /api/city` HAS TO RETURN A CITY.**
 *
 * Before Wave 1 it returned `{ node_states, neighborhood_state }` and nothing else, so
 * `town_hall`, `placements`, `roads`, `road_gold_spent` and `crisis_damage` were all
 * permanently `undefined` for a signed-in learner. The design record measured the
 * consequence by driving this read into the real `CitySurface`: the payload carried no
 * hall, so the island centre looked free, the placement ghost chose the hall's own cell,
 * and the write to the session that DOES have a hall there was silently refused —
 * `ROSTER 'Built' BADGES AFTER PLACING: 0`.
 *
 * These drive the real `loadCityFromAurora` over a stub executor, which is the same
 * method the record used, so the "keys" assertion below is directly comparable to the
 * `["neighborhood_state","node_states"]` it printed.
 */

const STUDENT: UUID = "00000000-0000-4000-8000-0000000000aa";
const OTHER: UUID = "00000000-0000-4000-8000-0000000000bb";
const CITY_NODE_COUNT = getProductNodes().length;

interface Issued {
  sql: string;
  params: SqlParams | undefined;
}

interface Tables {
  node_state?: readonly Record<string, unknown>[];
  neighborhood_state?: readonly Record<string, unknown>[];
  city_placement?: readonly Record<string, unknown>[];
  city_road?: readonly Record<string, unknown>[];
  city_state?: readonly Record<string, unknown>[];
  city_island_state?: readonly Record<string, unknown>[];
  city_crisis_damage?: readonly Record<string, unknown>[];
}

/**
 * A Data API double that answers by which table the statement names. Deliberately NOT a
 * queue of canned results in call order: the read issues its six selects concurrently,
 * and a positional double would pass while handing the roads to the crisis parser.
 */
function stubDb(tables: Tables): { db: DataApiExecutor; issued: Issued[] } {
  const issued: Issued[] = [];
  const db: DataApiExecutor = {
    async query<T>(sql: string, params?: SqlParams): Promise<T[]> {
      issued.push({ sql, params });
      if (sql === ACCOUNT_STATE_EXISTS_SQL) {
        const present = Object.values(tables).some((rows) => (rows?.length ?? 0) > 0);
        return (present ? [{ present: true }] : []) as T[];
      }
      const table = (
        [
          ["public.city_crisis_damage", tables.city_crisis_damage],
          ["public.city_placement", tables.city_placement],
          ["public.city_road", tables.city_road],
          [
            "public.city_island_state",
            tables.city_island_state ??
              tables.city_state?.map((row) => ({
                island_era: "prehistoric",
                road_gold_spent: row.road_gold_spent ?? 0,
                civic_material_spent: 0,
                next_damage_ordinal: row.next_damage_ordinal ?? 1,
              })),
          ],
          ["public.city_state", tables.city_state],
          ["public.neighborhood_state", tables.neighborhood_state],
          ["public.student_node_state", tables.node_state],
        ] as const
      ).find(([name]) => sql.includes(name));
      if (table === undefined) {
        throw new Error(`the stub was asked for a table it does not know: ${sql}`);
      }
      const rows = table[1] ?? [];
      return rows.map((entry) => {
        const row = entry as Record<string, unknown>;
        return {
          ...row,
          ...(sql.includes("island_era") && row.island_era === undefined
            ? { island_era: "prehistoric" }
            : {}),
          ...(sql.includes("current_island") && row.current_island === undefined
            ? { current_island: "prehistoric" }
            : {}),
        };
      }) as T[];
    },
    execute() {
      throw new Error("a read must never execute a write");
    },
  };
  return { db, issued };
}

function nodeStateRow(nodeId: string, over: Record<string, unknown> = {}) {
  return {
    student_id: STUDENT,
    node_id: nodeId,
    placement_estimate: 0,
    mastery: 0,
    mastery_updated_at: null,
    completion_status: "locked",
    lesson_stage: "not_started",
    last_practiced_at: null,
    ...over,
  };
}

function placementRow(over: Record<string, unknown>) {
  return {
    placement_id: "NUM.S",
    kind: "skill",
    subject_id: "NUM.S",
    grid_col: 0,
    grid_row: 0,
    rot: 0,
    ...over,
  };
}

describe("loadCityFromAurora returns a whole city", () => {
  it("carries the layout, the road spend and the crisis damage, not just node state", async () => {
    const { db } = stubDb({
      node_state: [nodeStateRow("NUM.S", { mastery: 2, completion_status: "complete" })],
      neighborhood_state: [
        { student_id: STUDENT, neighborhood_id: "D1", checkpoint_cleared: true },
      ],
      city_placement: [
        placementRow({ subject_id: "NUM.S", grid_col: 2, grid_row: 0, rot: 1 }),
        placementRow({
          kind: "town_hall",
          subject_id: "town-hall",
          grid_col: -1,
          grid_row: -1,
        }),
      ],
      city_road: [{ grid_col: 1, grid_row: 1 }],
      city_state: [{ road_gold_spent: 20 }],
      city_crisis_damage: [
        { damage_ordinal: 1, damage_id: "d1", subject_kind: "building", subject: "NUM.F" },
        { damage_ordinal: 1, damage_id: "d1", subject_kind: "ground", subject: "3,4" },
      ],
    });

    const city = await loadCityFromAurora(db, STUDENT);

    // The record printed `["neighborhood_state","node_states"]` here. Set equality
    // rather than a containment check, so a field silently dropped from the read fails
    // exactly as loudly as one silently added.
    expect(new Set(Object.keys(city))).toEqual(
      new Set([
        "launch_initialized",
        "node_states",
        "neighborhood_state",
        "placements",
        "civic",
        "roads",
        "road_gold_spent",
        "civic_material_spent",
        "town_hall",
        "crisis_damage",
        "archipelago_version",
        "current_island",
        "islands",
      ] satisfies (keyof CityRead)[]),
    );

    expect(city.launch_initialized).toBe(true);
    expect(city.town_hall).toEqual({ nodeId: "town-hall", col: -1, row: -1, rot: 0 });
    expect(city.placements).toEqual([{ nodeId: "NUM.S", col: 2, row: 0, rot: 1 }]);
    expect(city.civic).toEqual([]);
    expect(city.roads).toEqual([{ col: 1, row: 1 }]);
    expect(city.road_gold_spent).toBe(20);
    expect(city.civic_material_spent).toBe(0);
    expect(city.current_island).toBe("prehistoric");
    expect(city.archipelago_version).toBe(1);
    expect(city.islands).toHaveLength(1);
    expect(city.crisis_damage.ruined_buildings).toEqual([
      { node_id: "NUM.F", damage_id: "d1" },
    ]);
    expect(city.crisis_damage.ruined_cells).toEqual([{ cell: "3,4", damage_id: "d1" }]);
    expect(city.crisis_damage.suspended_civic).toEqual([]);
    // Every era's nodes render, DB rows where present.
    expect(city.node_states).toHaveLength(CITY_NODE_COUNT);
    expect(city.node_states.find((s) => s.node_id === "NUM.S")?.mastery).toBe(2);
    expect(city.neighborhood_state?.checkpoint_cleared).toBe(true);
  });

  it("keeps the hall OUT of placements — the hall is not a skill and has no lesson", async () => {
    const { db } = stubDb({
      city_placement: [
        placementRow({
          kind: "town_hall",
          subject_id: "town-hall",
          grid_col: -1,
          grid_row: -1,
        }),
      ],
    });

    const city = await loadCityFromAurora(db, STUDENT);

    expect(city.town_hall?.nodeId).toBe("town-hall");
    // `placements` feeds the `N/6` roster and every surface that looks an entry up in
    // the skill graph, and the hall is in neither.
    expect(city.placements).toEqual([]);
  });

  it("returns civic placements through their separate canonical collection", async () => {
    const { db } = stubDb({
      city_placement: [
        placementRow({ subject_id: "NUM.2", grid_col: 4, grid_row: 4 }),
        placementRow({
          placement_id: "civic:prehistoric_longhouse:3",
          kind: "civic",
          subject_id: "prehistoric_longhouse",
          grid_col: 6,
          grid_row: 6,
        }),
      ],
    });

    const city = await loadCityFromAurora(db, STUDENT);

    expect(city.placements).toEqual([{ nodeId: "NUM.2", col: 4, row: 4, rot: 0 }]);
    expect(city.civic).toEqual([
      {
        nodeId: "civic:prehistoric_longhouse:3",
        col: 6,
        row: 6,
        rot: 0,
      },
    ]);
  });

  it("mints a next damage id strictly above every ordinal it was handed", async () => {
    // The invariant `devPersistence/devSession.ts` refuses a stored blob for breaking: a
    // rewound mint re-issues an id the ledger has already recorded a repair against, so
    // the second ruin can never be paid for.
    const { db } = stubDb({
      city_crisis_damage: [
        { damage_ordinal: 2, damage_id: "d2", subject_kind: "building", subject: "NUM.3" },
        { damage_ordinal: 11, damage_id: "d11", subject_kind: "civic", subject: "civ-1" },
        { damage_ordinal: 7, damage_id: "d7", subject_kind: "ground", subject: "0,1" },
      ],
    });

    const city = await loadCityFromAurora(db, STUDENT);

    const ordinals = [2, 11, 7];
    expect(ordinals).toHaveLength(3);
    for (const ordinal of ordinals) {
      expect(city.crisis_damage.next_damage_id).toBeGreaterThan(ordinal);
    }
    // `d11` sorts before `d2` as text, which is exactly why the column is the ordinal.
    expect(city.crisis_damage.next_damage_id).toBe(12);
    expect(city.crisis_damage.suspended_civic).toEqual([
      { placement_id: "civ-1", damage_id: "d11" },
    ]);
  });

  it("gives an empty island — never an undefined field — when the student has no rows", async () => {
    const { db } = stubDb({});

    const city = await loadCityFromAurora(db, STUDENT);

    expect(city.placements).toEqual([]);
    expect(city.roads).toEqual([]);
    expect(city.road_gold_spent).toBe(0);
    expect(city.town_hall).toBeNull();
    expect(city.crisis_damage).toEqual({
      next_damage_id: 1,
      overwritten_records: [],
      ruined_buildings: [],
      ruined_cells: [],
      suspended_civic: [],
    });
    // Fresh unbuilt rows for the full product roster.
    expect(city.node_states).toHaveLength(CITY_NODE_COUNT);
    expect(city.node_states.every((state) => state.mastery === 0)).toBe(true);
  });

  it("scopes EVERY read to the caller's own sub, never a payload id", async () => {
    // Contracts §5: `student_id` comes from the verified JWT and is bound as a
    // parameter. A new table read that forgot the `where` would be a cross-student read
    // of somebody's city, and it would pass every other test in this file.
    const { db, issued } = stubDb({ city_placement: [placementRow({})] });

    await loadCityFromAurora(db, STUDENT);

    expect(issued.length).toBeGreaterThanOrEqual(6);
    for (const { sql, params } of issued) {
      expect(sql, sql).toMatch(/where\s+student_id\s*=\s*:sid::uuid/);
      expect(params?.sid, sql).toBe(STUDENT);
      expect(sql, sql).not.toContain(OTHER);
    }
  });

  it("reads the current island without reusing the legacy progression-era column", async () => {
    const { db, issued } = stubDb({
      city_state: [{ current_island: "neolithic", era_id: "cyberpunk" }],
    });

    const city = await loadCityFromAurora(db, STUDENT);

    const cityStateSql = issued.find((i) =>
      i.sql.includes("select current_island from public.city_state"),
    )?.sql;
    expect(cityStateSql).toBeDefined();
    expect(cityStateSql).toContain("current_island");
    expect(cityStateSql).not.toContain("era_id");
    expect(city.current_island).toBe("neolithic");
  });
});
