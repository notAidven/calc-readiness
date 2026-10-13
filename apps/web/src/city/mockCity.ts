import type { StudentNodeState } from "@cr/state-schema";

import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "./townHall";
import type { CityLoad } from "./types";
import { BUILDABLE_RADIUS, defaultPlacements, type PlacedTransform } from "./worldLayout";

/**
 * In-file demo seed for the city surface. It is NOT authoritative: it exists only
 * so the surface renders a full spread of construction states before a real,
 * RLS-scoped read is wired. There is no economy payload — the MVP shows only a
 * cosmetic preview derived from mastery (persistent economy is Contracts §8).
 */

const STUDENT_ID = "mock-student";

function seedNode(node_id: string, over: Partial<StudentNodeState>): StudentNodeState {
  return {
    student_id: STUDENT_ID,
    node_id,
    placement_estimate: 0,
    mastery: 0,
    mastery_updated_at: null,
    completion_status: "locked",
    lesson_stage: "not_started",
    last_practiced_at: null,
    ...over,
  };
}

/**
 * A fixed practice stamp for the nodes below that have actually been practised.
 * Any node that has entered its practice set carries one in real life (every
 * practice write in `citySession.ts` stamps it), and the economy's row-1 grant now
 * reads it to tell a practised finish from a test-out pre-build (issue #102) — so a
 * seed that left it null would show this demo city as having earned no lesson gold.
 */
const MOCK_PRACTICED_AT = "2026-07-01T12:00:00.000Z";

/**
 * A spread across the 3-step progression so the mock city shows every stage at
 * once (registry order NUM.S, NUM.F, NUM.2, NUM.3, NUM.4, NUM.5):
 *   - Complete (built): NUM.S (mastered 3★), NUM.F (mastered 2★), NUM.2 (finished
 *     practice below-bar, 1★) — the built variants collapse to one Complete stage
 *     with MasteryStars showing the quality.
 *   - Construction: NUM.3 (in the practice set).
 *   - Foundation (site): NUM.4 (mid-lesson / teaching), NUM.5 (freshly placed).
 *
 * The first four have practice evidence (`last_practiced_at`); NUM.4 is still in
 * teaching and NUM.5 untouched, so neither has entered a practice set yet.
 */
export const MOCK_NODE_STATES: readonly StudentNodeState[] = [
  seedNode("NUM.S", {
    placement_estimate: 3,
    mastery: 3,
    lesson_stage: "done",
    completion_status: "complete",
    last_practiced_at: MOCK_PRACTICED_AT,
  }),
  seedNode("NUM.F", {
    placement_estimate: 2,
    mastery: 2,
    lesson_stage: "done",
    completion_status: "complete",
    last_practiced_at: MOCK_PRACTICED_AT,
  }),
  seedNode("NUM.2", {
    placement_estimate: 2,
    mastery: 1,
    lesson_stage: "done",
    completion_status: "in_progress",
    last_practiced_at: MOCK_PRACTICED_AT,
  }),
  seedNode("NUM.3", {
    placement_estimate: 1,
    mastery: 0,
    lesson_stage: "practice",
    completion_status: "in_progress",
    last_practiced_at: MOCK_PRACTICED_AT,
  }),
  seedNode("NUM.4", {
    placement_estimate: 1,
    mastery: 0,
    lesson_stage: "teaching",
    completion_status: "in_progress",
  }),
  seedNode("NUM.5", {
    placement_estimate: 0,
    mastery: 0,
    lesson_stage: "not_started",
    completion_status: "locked",
  }),
];

/**
 * The pre-seeded island HUB, dead-centre on the origin — the landmark every island
 * carries from the start (design 2026-07-26). The `?mock` demo shows it already there,
 * exactly like the live session's pre-seed (`citySession.ts`).
 */
export const MOCK_TOWN_HALL_PLACEMENT: PlacedTransform = {
  nodeId: TOWN_HALL_ID,
  ...TOWN_HALL_CENTER_TRANSFORM,
};

/**
 * A fully-placed default layout: every skill dropped onto a tidy, spread grid transform
 * so the mock city shows the full spread of build phases immediately. The hub's cells
 * are RESERVED first, so no skill is auto-placed on top of the centre landmark. The live
 * app session (`citySession.ts`) instead starts with only the pre-seeded hub and no
 * skills, so the player lays out their own city.
 */
const MOCK_PLACED = defaultPlacements(
  MOCK_NODE_STATES.map((state) => state.node_id),
  [MOCK_TOWN_HALL_PLACEMENT],
  // ERA ONE'S DISC, NAMED. The mock is era one's city and this runs at module load, before any
  // surface exists to say which island is standing — so it is the one place the constant is the
  // honest answer rather than the answer nobody chose.
  BUILDABLE_RADIUS,
);

export const MOCK_CITY_LOAD: CityLoad = {
  node_states: MOCK_NODE_STATES,
  neighborhood_state: null,
  placements: MOCK_PLACED,
  town_hall: MOCK_TOWN_HALL_PLACEMENT,
};

/**
 * A settling-sized dirt-path network for the DEV `?mock&paths` hatch: 18 tiles, the
 * measured count that lifts a fully-mastered city (skills 9 + paths 18 = 27 of 44)
 * into the Settling happiness band. Cells sit outside the mock build cluster so they
 * overlap nothing. Opt-in via the query param — the plain `?mock` demo stays unpaved.
 */
export const MOCK_PATH_HAPPINESS_ROADS: readonly {
  readonly col: number;
  readonly row: number;
}[] = Array.from({ length: 18 }, (_, index) => ({
  col: 12 + (index % 6),
  row: 12 + Math.floor(index / 6),
}));

/** Fully mastered node states for the `?mock&paths` settling demo. */
export const MOCK_MASTERED_NODE_STATES: readonly StudentNodeState[] = MOCK_NODE_STATES.map(
  (state) => ({
    ...state,
    mastery: 2,
    lesson_stage: "done",
    completion_status: "complete",
    last_practiced_at: state.last_practiced_at ?? MOCK_PRACTICED_AT,
  }),
);

/** Default loader for the surface; resolves the mock seed on a microtask. */
export function loadMockCity(): Promise<CityLoad> {
  return Promise.resolve(MOCK_CITY_LOAD);
}
