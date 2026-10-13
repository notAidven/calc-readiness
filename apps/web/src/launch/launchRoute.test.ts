import { NO_CRISIS_DAMAGE } from "@cr/game";
import { ERA_SEQUENCE } from "@cr/skill-graph";
import type { StudentNodeState, UUID } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import { seededTownHallTransform } from "../city/citySession";
import { TOWN_HALL_ID } from "../city/townHall";
import type { CityLoad } from "../city/types";
import {
  BEGUN_READINGS,
  canonicalProgress,
  FIRST_ERA_ID,
  resolveLaunchRoute,
} from "./launchRoute";

/**
 * **WHO GETS ASKED WHERE TO BEGIN, AND WHO IS PUT BACK IN THEIR CITY.**
 *
 * The question is asked once. Asking it again is not a cosmetic annoyance: the diagnostic's
 * server-side `start` is not idempotent, so a launcher that reappears on every refresh is a
 * launcher that can mint a second administration for the same learner — and *Start at Era 1*
 * offered to somebody four eras in is the "my progress reset" defect in person.
 *
 * So the readings that mean "this account has begun" are the subject here, and they are read in
 * BOTH directions: each one is proved independently sufficient over a city where it is the only
 * signal present, and the empty city is proved to still reach the launcher. A reading that stops
 * working fails at its own name rather than silently shrinking the population it recognises.
 */

const STUDENT = "11111111-1111-4111-8111-111111111111" as UUID;

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

/**
 * A brand-new account exactly as `GET /api/city` hands it over — including the Town Hall that
 * `city/apiCityLoad.ts` synthesises onto every payload that has none. Built through the app's
 * own `seededTownHallTransform` rather than a literal, so this fixture cannot drift from what
 * the loader actually produces.
 */
function freshAccountCity(over: Partial<CityLoad> = {}): CityLoad {
  return {
    node_states: [node(), node({ node_id: "NUM.2" })],
    placements: [],
    civic: [],
    roads: [],
    road_gold_spent: 0,
    civic_material_spent: 0,
    town_hall: { nodeId: TOWN_HALL_ID, ...seededTownHallTransform([]) },
    ...over,
  };
}

/**
 * Every reading, with a city in which it is the ONLY signal. Written as a table so the guard
 * measures the shipped list: a reading added to `launchRoute.ts` without a row here fails the
 * census below, and a row whose city no longer trips its reading fails on its own line.
 */
const ONLY_SIGNAL: readonly { readonly reason: string; readonly city: CityLoad }[] = [
  {
    reason: "the server initialized this account",
    city: freshAccountCity({ launch_initialized: true }),
  },
  {
    reason: "the diagnostic recorded a placement",
    city: freshAccountCity({ node_states: [node({ placement_estimate: 2 })] }),
  },
  {
    reason: "a skill has mastery on the account",
    city: freshAccountCity({ node_states: [node({ mastery: 1 })] }),
  },
  {
    reason: "a lesson has been opened",
    city: freshAccountCity({ node_states: [node({ lesson_stage: "teaching" })] }),
  },
  {
    reason: "a skill is marked complete",
    city: freshAccountCity({ node_states: [node({ completion_status: "complete" })] }),
  },
  {
    reason: "a skill building stands on the island",
    city: freshAccountCity({ placements: [{ nodeId: "NUM.1", col: 3, row: 3, rot: 0 }] }),
  },
  {
    reason: "a civic building has been bought",
    city: freshAccountCity({ civic: [{ nodeId: "civic-1", col: 5, row: 5, rot: 0 }] }),
  },
  {
    reason: "roads have been laid",
    city: freshAccountCity({ roads: [{ col: 4, row: 4 }] }),
  },
  {
    reason: "material has been spent",
    city: freshAccountCity({ road_gold_spent: 40 }),
  },
  {
    reason: "the city stands in a later era",
    city: freshAccountCity({ current_island: ERA_SEQUENCE[3]?.id }),
  },
  {
    reason: "more than one island has been founded",
    city: freshAccountCity({
      islands: [
        {
          era_id: ERA_SEQUENCE[0]?.id as never,
          placements: [],
          roads: [],
          road_gold_spent: 0,
          town_hall: null,
          civic: [],
          civic_material_spent: 0,
          crisis_damage: NO_CRISIS_DAMAGE,
        },
        {
          era_id: ERA_SEQUENCE[1]?.id as never,
          placements: [],
          roads: [],
          road_gold_spent: 0,
          town_hall: null,
          civic: [],
          civic_material_spent: 0,
          crisis_damage: NO_CRISIS_DAMAGE,
        },
      ],
    }),
  },
  {
    reason: "the neighbourhood checkpoint is cleared",
    city: freshAccountCity({
      neighborhood_state: {
        student_id: STUDENT,
        neighborhood_id: "d1",
        checkpoint_cleared: true,
      },
    }),
  },
];

describe("what counts as an account that has begun", () => {
  it("covers every shipped reading, with no row describing a reading that no longer exists", () => {
    // BOTH DIRECTIONS. A reading added to the module without a row here would otherwise be
    // untested, and a row left behind after a reading was deleted would be exercising nothing
    // while looking like coverage.
    expect([...ONLY_SIGNAL.map((row) => row.reason)].sort()).toEqual(
      [...BEGUN_READINGS].sort(),
    );
    expect(
      BEGUN_READINGS.length,
      "the readings collapsed to a handful, so the census below proves very little",
    ).toBeGreaterThanOrEqual(12);
  });

  for (const row of ONLY_SIGNAL) {
    it(`treats "${row.reason}" as begun on its own`, () => {
      const read = canonicalProgress(row.city);
      expect(read.begun, `${row.reason} did not register`).toBe(true);
      expect(
        read.reasons,
        `${row.reason} was registered by a different reading, so its own is inert`,
      ).toContain(row.reason);
      expect(resolveLaunchRoute({ city: row.city })).toBe("resume");
    });
  }

  /**
   * ⚑ **THE TRAP THIS FIXTURE EXISTS FOR.** `city/apiCityLoad.ts` synthesises a Town Hall onto
   * every payload that has none, so a brand-new account's city arrives with a building already
   * on it. A "has a hall" reading would therefore classify every first-time learner as
   * returning, and the launch choice would be unreachable for the audience it is for.
   */
  it("does not read the synthesised Town Hall as progress", () => {
    const fresh = freshAccountCity();
    expect(fresh.town_hall, "the fixture stopped carrying a seeded hall").not.toBeNull();
    const read = canonicalProgress(fresh);
    expect(read.reasons).toEqual([]);
    expect(read.begun).toBe(false);
    expect(resolveLaunchRoute({ city: fresh })).toBe("launcher");
  });

  it("does not read standing in the first era as progress", () => {
    expect(FIRST_ERA_ID).toBe(ERA_SEQUENCE[0]?.id);
    const city = freshAccountCity({ current_island: FIRST_ERA_ID ?? undefined });
    expect(canonicalProgress(city).begun).toBe(false);
    expect(resolveLaunchRoute({ city })).toBe("launcher");
  });

  /**
   * The server marker closes the empty-city window without inventing progress. It is independently
   * sufficient even though every mastery, layout, road, spend, and checkpoint reading stays empty.
   */
  it("resumes from an initialized empty city", () => {
    const initialized = freshAccountCity({ launch_initialized: true });
    expect(canonicalProgress(initialized).reasons).toEqual([
      "the server initialized this account",
    ]);
    expect(resolveLaunchRoute({ city: initialized })).toBe("resume");
  });
});
