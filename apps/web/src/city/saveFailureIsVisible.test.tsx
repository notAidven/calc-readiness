import type { UUID } from "@cr/state-schema";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadCityFromApi } from "./apiCityLoad";
import { type ApiCitySession, createApiCitySession, saveCityToApi } from "./apiCitySession";
import type { CityLoad } from "./types";
import { UnsavedChangesNotice } from "./UnsavedChangesNotice";
import {
  BUILDABLE_RADIUS,
  findOpenCell,
  footprintFor,
  occupiedCells,
  type PlacedTransform,
  type Transform,
} from "./worldLayout";

/**
 * **THE WHOLE CHAIN, REPRODUCED: A SAVE THAT NEVER LANDED AND A LEARNER WHO WAS TOLD
 * NOTHING.**
 *
 * `signedInCityPersists.test.tsx` proves the happy path against the real services. This is
 * its opposite number, and it is the case four layers of tests could not see:
 *
 *  1. `POST /api/city` was declared in the Hono app but not in the CDK route table, so API
 *     Gateway 404'd it.
 *  2. CloudFront's `errorResponses` mapped 404 to `200 /index.html` — distribution-wide,
 *     because they cannot be scoped to a behaviour — so the browser was handed the SPA's
 *     own HTML under a `200 OK`.
 *  3. `unwrap` read `response.ok`, failed to parse the HTML, and returned `null` AS A
 *     SUCCESS.
 *  4. `apiCitySession` therefore ran its success branch and cleared `pending`, dropping the
 *     snapshot instead of keeping it for the next gesture.
 *
 * So the fetch double below serves exactly that response, and the three assertions are the
 * three things that were wrong: the save must be an error, the snapshot must stay queued,
 * and the learner must be able to see it.
 */

const STUDENT = "11111111-1111-4111-8111-111111111111" as UUID;
const CITY_URL = "https://api.example.test/api/city";

const EMPTY_CITY: CityLoad = { node_states: [], neighborhood_state: null };

/** The SPA's index.html, which is what CloudFront returned instead of the API's answer. */
const SPA_HTML =
  '<!doctype html><html lang="en"><head><title>calc-readiness</title></head>' +
  '<body><div id="root"></div></body></html>';

/**
 * A server whose GET works and whose POST is swallowed by the edge exactly as it was in
 * production. `postAs` flips to a real answer so "a save that lands clears the notice" is
 * measured on the same session rather than on a second one.
 */
function serveCityWithABrokenWrite() {
  let postAs: "swallowed-by-the-edge" | "ok" = "swallowed-by-the-edge";
  const posts: string[] = [];

  vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
    if (init?.method !== "POST") {
      return new Response(JSON.stringify(EMPTY_CITY), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    posts.push(String(init.body));
    return postAs === "ok"
      ? new Response(JSON.stringify({ saved: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      : // THE DEFECT, byte for byte: a 200, and a web page.
        new Response(SPA_HTML, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
  });

  return {
    posts,
    repairTheEdge: () => {
      postAs = "ok";
    },
  };
}

function browserSession(): ApiCitySession {
  return createApiCitySession({
    studentId: STUDENT,
    load: loadCityFromApi(CITY_URL, async () => "jwt"),
    save: saveCityToApi(CITY_URL, async () => "jwt"),
    debounceMs: 0,
  });
}

/**
 * A legal transform derived through the same `worldLayout` rules the session gates on,
 * exactly as `signedInCityPersists.test.tsx` does. A hardcoded cell can be refused for
 * overlapping the pre-seeded hall, and a `placeSkill` that no-ops looks identical here to
 * a snapshot that was dropped — which is the very thing under test.
 */
function openCellFor(load: CityLoad, nodeId: string): Transform {
  const occupants: PlacedTransform[] = [...(load.placements ?? [])];
  if (load.town_hall) {
    occupants.push(load.town_hall);
  }
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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("a save the edge swallowed", () => {
  it("is an error, not a successful null", async () => {
    serveCityWithABrokenWrite();
    const save = saveCityToApi(CITY_URL, async () => "jwt");

    await expect(
      save({
        placements: [],
        civic: [],
        town_hall: null,
        roads: [],
        road_gold_spent: 0,
        civic_material_spent: 0,
        crisis_damage: {
          next_damage_id: 1,
          ruined_buildings: [],
          ruined_cells: [],
          suspended_civic: [],
          overwritten_records: [],
        },
        era_id: "prehistoric",
        island_era: "prehistoric",
        current_island: "prehistoric",
      }),
    ).rejects.toThrow(/not JSON/);
  });

  it("leaves the snapshot queued rather than dropping it", async () => {
    /**
     * THE DATA LOSS ITSELF, and the assertion has to be chosen carefully to see it. A
     * LATER GESTURE is not the measurement: the in-memory session still holds the
     * placement either way, so the city it captures next carries `NUM.S` whether or not
     * the failed snapshot was dropped — that version of this case passes under the defect.
     *
     * What separates the two worlds is a flush with NO gesture behind it, which is the
     * `pagehide` path and the exact moment the file's own docblock named: *"if the POST
     * fails and the learner does nothing else before closing the tab, that last gesture is
     * lost."* With `pending` cleared by a false success, `write()` returns early and the
     * tab closes having sent nothing. With it kept, the flush re-sends the whole city.
     *
     * Measured, not argued: restore `unwrap`'s `.json().catch(() => null)` and this case
     * fails at `expect(posts).toHaveLength(2)` with *"expected [ Array(1) ] to have a
     * length of 2 but got 1"* — one POST made, and nothing left to send.
     */
    const { posts, repairTheEdge } = serveCityWithABrokenWrite();
    const session = browserSession();

    await session.placeSkill("NUM.S", openCellFor(await session.load(), "NUM.S"));
    await session.flush();
    expect(posts).toHaveLength(1);

    repairTheEdge();
    await session.flush();

    expect(posts).toHaveLength(2);
    const recovered = JSON.parse(String(posts.at(-1))) as {
      placements: { nodeId: string }[];
    };
    expect(recovered.placements.map((placement) => placement.nodeId)).toContain("NUM.S");
    expect(session.hasUnsavedChanges()).toBe(false);
  });

  it("tells the learner, and stops telling them once a save lands", async () => {
    const { repairTheEdge } = serveCityWithABrokenWrite();
    const session = browserSession();
    render(<UnsavedChangesNotice session={session} />);

    // Nothing to report before anything has failed. A notice that is always up is a notice
    // nobody reads.
    expect(screen.queryByText(/Changes not saved/i)).toBeNull();

    await session.placeSkill("NUM.S", openCellFor(await session.load(), "NUM.S"));
    await session.flush();

    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent(/Changes not saved/i);
    expect(session.hasUnsavedChanges()).toBe(true);

    repairTheEdge();
    await session.layRoads([{ col: 3, row: 0 }], 1000);
    await session.flush();

    await waitFor(() => {
      expect(screen.queryByRole("status")).toBeNull();
    });
    expect(session.hasUnsavedChanges()).toBe(false);
  });

  it("renders nothing at all on the dev island, which has no server to fail against", () => {
    render(<UnsavedChangesNotice session={null} />);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
