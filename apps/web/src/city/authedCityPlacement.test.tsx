import type { StudentNodeState } from "@cr/state-schema";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadCityFromApi } from "./apiCityLoad";
import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";
import { MOCK_NODE_STATES } from "./mockCity";
import { openBuiltShelf } from "./test/openBuiltShelf";
import { occupiedCells, type PlacedTransform } from "./worldLayout";

/**
 * **THE SIGNED-IN LEARNER'S FIRST PLACEMENT, DRIVEN RATHER THAN READ.**
 *
 * The design record measured this against the real surface and printed:
 *
 * ```
 * SERVER CityRead keys: ["neighborhood_state","node_states"]
 * town_hall: null          placements: null
 * CHOSE: NUM.S
 * onPlaceSkill CALLED WITH: [{"nodeId":"NUM.S","transform":{"col":-1,"row":-1,…}}]
 * DEV SESSION town_hall (which the server load does not carry): {"col":-1,"row":-1,…}
 * IN-MEMORY SESSION placements after place: []
 * ROSTER 'Built' BADGES AFTER PLACING: 0
 * ```
 *
 * Two states disagreed about one island. Occupancy came from the server payload, which
 * carried no hall, so the centre looked free and the ghost took it; the write went to
 * the city session, which HAS a hall there and refused the overlap. Nothing on screen
 * said so.
 *
 * This wires the two exactly as `App.tsx` does — `loadCity` from the API, `onPlaceSkill`
 * passed unconditionally to the session — and asserts the disagreement is gone. It is
 * the behavioural half of Wave 1: `apiCityLoad.test.ts` proves the hall is in the
 * payload, and this proves what having it there is FOR.
 */

/** What `GET /api/city` returns for a student who has never built anything. */
const FRESH_SERVER_CITY = {
  node_states: MOCK_NODE_STATES.map(
    (state): StudentNodeState => ({
      ...state,
      mastery: 0,
      completion_status: "locked",
      lesson_stage: "not_started",
    }),
  ),
  neighborhood_state: null,
  placements: [],
  roads: [],
  road_gold_spent: 0,
  town_hall: null,
  crisis_damage: {
    next_damage_id: 1,
    ruined_buildings: [],
    ruined_cells: [],
    suspended_civic: [],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the authenticated city can be built on", () => {
  it("does not aim the first building at the hall's own cells", async () => {
    const user = userEvent.setup();
    // A REAL `Response`, and A FRESH ONE PER CALL. `unwrapJson` reads the body as text so
    // it can quote back a 200 that is not JSON at all, and an object literal implementing
    // only `json()` is a double that decides which methods the code under test may call.
    // Per call because a `Response` body can be read exactly once, which is also true of
    // the real thing — this test loads the city twice.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(FRESH_SERVER_CITY), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );

    // Wired as `App.tsx` wires the signed-in path: the load comes from the API and
    // `onPlaceSkill` goes to the session unconditionally.
    const session = createCityDevSession();
    const onPlaceSkill = vi.fn(session.placeSkill);
    const loadCity = loadCityFromApi("https://fn.example/api/city", async () => "jwt");

    render(
      <CitySurface enableCanvas={false} loadCity={loadCity} onPlaceSkill={onPlaceSkill} />,
    );

    await openBuiltShelf(user);
    const roster = document.querySelector<HTMLElement>(
      'button.city-plot[data-node-id="NUM.S"]',
    );
    expect(roster).not.toBeNull();
    await user.click(roster as HTMLElement);

    const bar = await screen.findByRole("group", { name: /Placing/ });
    await user.click(within(bar).getByRole("button", { name: /Build here/ }));

    await waitFor(() => expect(onPlaceSkill).toHaveBeenCalled());
    const [, transform] = onPlaceSkill.mock.calls[0] as [string, PlacedTransform];

    // THE HALL IS READ FROM THE WRITE TARGET, not from the payload, because the payload
    // is the half that used to be missing. Asserting against the payload's hall would
    // fail on a null precondition and never reach the claim — the session always has a
    // hub, so this is the state the ghost had to agree with and did not.
    const afterPlacing = await session.load();
    const hall = afterPlacing.town_hall;
    expect(hall).not.toBeNull();
    const hallCells = occupiedCells([hall as PlacedTransform]);
    expect(hallCells.size).toBeGreaterThan(0);
    const chosen = [...occupiedCells([transform])];
    expect(chosen.length).toBeGreaterThan(0);
    for (const cell of chosen) {
      expect(hallCells.has(cell), `the ghost took the hall's cell ${cell}`).toBe(false);
    }

    // And the write LANDED. `placeSkill` is a silent no-op on an invalid transform, so
    // "the ghost picked a clear cell" and "the building exists" are two claims and the
    // record's reproduction failed the second one with `placements: []`.
    expect((afterPlacing.placements ?? []).map((p) => p.nodeId)).toContain("NUM.S");

    // The two islands are one island: the payload the surface reasons about now names
    // the same hub cell as the session it writes to.
    expect((await loadCity()).town_hall).toEqual(hall);
  });
});
