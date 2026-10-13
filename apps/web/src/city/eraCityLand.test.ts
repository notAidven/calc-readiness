import { cityRosterNodeIds } from "@cr/game";
import {
  buildableCellCount,
  ERA_SEQUENCE,
  type EraId,
  eraBuildableRadius,
} from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { eraBuildableDiscRadius, eraLandRadius } from "./islandLand";
import { TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_FOOTPRINT, TOWN_HALL_ID } from "./townHall";
import {
  BUILDABLE_RADIUS,
  cellCenter,
  DEFAULT_FOOTPRINT,
  defaultPlacements,
  type Footprint,
  footprintFor,
  GRID_CELL,
  isCellBuildable,
  NODE_FOOTPRINTS,
  type PlacedTransform,
} from "./worldLayout";

/**
 * **DOES THE ERA ROSTER FIT? — the land half of the plot-derivation rule.**
 *
 * The rule is cumulative: an era's city holds its own nodes and every earlier era's
 * (`@cr/game` — `city-roster.ts`). That rule is only correct if the land can hold it, so
 * this is where it is measured. This file can measure it and `packages/skill-graph` cannot:
 * `footprintFor` and `TOWN_HALL_FOOTPRINT` live in `apps/`, which `packages/` may never
 * import (TS6059).
 *
 * ## Two different discs, and the difference is the honest gap
 *
 * **D-ERA25's per-era radius** is what the rule has to fit, because that is the island the
 * era is designed for, and the radii were derived FROM this rule — the demand table in
 * `eras.ts` states it directly: *"era five's island must hold everything from eras one to
 * five, not era five's own content"*. Any era with an authored radius is checked against it.
 *
 * **The SHIPPED disc is now the era's own**, and it did not used to be. `isCellBuildable` read
 * the module constant `BUILDABLE_RADIUS`, so the roster the city OFFERED outgrew the island the
 * player could actually build on, and the second describe below was a TRIPWIRE pinning where —
 * written to go red on the day the radius became era-driven, and saying so.
 *
 * ## ⚑ THE TRIPWIRE FIRED, AND THIS IS WHAT IT BECAME
 *
 * `worldLayout.ts` named the follow-up beside the predicate: *"make the disc era-driven … and
 * delete `eraCityLand.test.ts`'s TRIPWIRE describe — which exists to go red exactly then and
 * says so."* Discharged. The disc is `buildableRadiusForLand(eraLandRadius(era))`, so the
 * placement surface and the drawn land are one number.
 *
 * **It is a replacement rather than a deletion**, because two of the tripwire's three
 * assertions were measuring something that is still true and still worth a guard, and dropping
 * them with the third would have quietly given back coverage:
 *
 *  - *"pins the shipped disc, which no era drives yet"* was the approval-shaped one. Gone.
 *  - *"holds the placement disc and the DRAWN island apart"* probed the FIRST cell an era-driven
 *    disc would gain, chosen so it would flip the moment the placement half landed. Kept, with
 *    the expectation inverted — the probe is now buildable at era two and still refused at era
 *    one, which is the same probe doing the opposite job.
 *  - *"names the first era whose roster cannot be seated"* is the measurement. Kept, re-run, and
 *    it moved from era three to era nine.
 *
 * What has NOT gone away is the ceiling: `islandLand.ts` holds the drawn land at grass 46 from
 * era four on, so eras four to ten all build on a disc of 38 against the 42 to 69 their budgets
 * authored. The last two rosters still do not fit, and that is the road lane's depth budget to
 * close (era design §13) rather than this file's.
 */

/** Cells a footprint covers. */
const cells = (fp: Footprint): number => fp.w * fp.d;

/** Every skill plot in an era's roster, plus the pre-seeded hall, which belongs to no era. */
function rosterCells(eraId: EraId): number {
  return (
    cityRosterNodeIds(eraId).reduce(
      (total, nodeId) => total + cells(footprintFor(nodeId)),
      0,
    ) + cells(TOWN_HALL_FOOTPRINT)
  );
}

/** The pre-seeded hall at the island centre, reserved before any auto-layout runs. */
const HALL: PlacedTransform = { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };

/**
 * How many of an era's roster the shipped auto-layout can seat on the island THAT ERA IS DRAWN
 * ON — which used to be era one's for every era, and is what this file was reporting.
 */
function seatedOnEraIsland(eraId: EraId): number {
  return defaultPlacements(
    [...cityRosterNodeIds(eraId)],
    [HALL],
    eraBuildableDiscRadius(eraId),
  ).length;
}

describe("the cumulative roster fits the land D-ERA25 authors for its era", () => {
  it("checks every era whose radius is authored, and says how many that is", () => {
    // The population is derived from `ERA_SEQUENCE`'s own `land.status`, so it WIDENS on its
    // own as radii are authored — no list here to go stale, and nothing that turns red when
    // one lands. #298 authors all ten; at the time of writing era one is the only one, which
    // is why the count is stated rather than left implicit.
    const authored = ERA_SEQUENCE.filter((era) => era.land.status === "authored");
    expect(authored.length).toBeGreaterThanOrEqual(1);

    for (const era of authored) {
      const available = buildableCellCount(eraBuildableRadius(era.id));
      const demand = rosterCells(era.id);
      expect(demand, `${era.id} demands cells`).toBeGreaterThan(0);
      expect(
        demand,
        `${era.id}'s cumulative roster (${demand} cells) does not fit its authored ` +
          `radius ${eraBuildableRadius(era.id)} (${available} cells)`,
      ).toBeLessThanOrEqual(available);
    }
  });

  it("reports the cell demand for all ten, authored radius or not", () => {
    // Derived, per era, and named — so the rule's cost is legible at review time rather
    // than only computable. Skill plots plus the hall; the civic buildings a player BUYS are
    // the economy's column and are proved in `packages/economy/src/civicSolvency.test.ts`.
    const demand = ERA_SEQUENCE.map((era) => [era.id, rosterCells(era.id)] as const);
    expect(demand).toEqual([
      ["prehistoric", 23],
      ["neolithic", 41],
      ["bronze_age", 59],
      ["classical", 75],
      ["medieval", 91],
      ["renaissance", 113],
      ["industrial", 133],
      ["atomic_age", 169],
      ["information_age", 193],
      ["cyberpunk", 229],
    ]);
    // Monotone, because nothing is torn down. A demand row that fell would mean the roster
    // rule had stopped accumulating.
    for (let i = 1; i < demand.length; i += 1) {
      expect((demand[i] as [EraId, number])[1]).toBeGreaterThan(
        (demand[i - 1] as [EraId, number])[1],
      );
    }
  });

  it("reads every plot through footprintFor, so no era needed a footprint invented for it", () => {
    // The footprint question the roster raises answers itself: `footprintFor` is TOTAL over
    // node ids. Eras one to seven are authored in `NODE_FOOTPRINTS` (`eraFootprints.test.ts`
    // owns which eras owe a row and why); eras eight to ten resolve to `DEFAULT_FOOTPRINT`
    // because their guides closed no footprint item, which their briefs call a design fact
    // rather than a placeholder. D-ERA10 freezes a plot once authored, so opening the plots
    // must not — and does not — set one.
    const roster = cityRosterNodeIds("cyberpunk");
    const authoredPlots = roster.filter((nodeId) => nodeId in NODE_FOOTPRINTS);
    const defaulted = roster.filter((nodeId) => !(nodeId in NODE_FOOTPRINTS));
    expect(authoredPlots).toHaveLength(38);
    expect(defaulted).toHaveLength(24);
    for (const nodeId of defaulted) {
      expect(footprintFor(nodeId), nodeId).toEqual(DEFAULT_FOOTPRINT);
    }
    // And the default is an UPPER bound: no authored plot is larger, so the demand rows
    // above cannot come out too small when those 24 are eventually decided.
    expect(
      Math.max(...authoredPlots.map((nodeId) => cells(footprintFor(nodeId)))),
    ).toBeLessThanOrEqual(cells(DEFAULT_FOOTPRINT));
  });
});

describe("the placement disc IS the era's island now, and here is what that seats", () => {
  it("puts the first cell an era-driven disc gains inside era two and outside era one", () => {
    /*
     * ⚑ THE TRIPWIRE'S OWN PROBE, WITH ITS EXPECTATION INVERTED.
     *
     * It read: *"the probe is the FIRST cell an era-driven disc would gain — outside era one's
     * 22 and inside era two's authored 30 — so this line flips the moment the placement half
     * lands rather than being a `false` that would survive most of the change."* It flipped.
     * Kept rather than deleted, because a probe chosen to be sensitive to exactly this change
     * is the best guard there is that the change is real, and it costs one inverted line.
     */
    const probe = { col: 6, row: 0 };
    const reach = Math.hypot(...Object.values(cellCenter(probe.col, probe.row)));
    expect(reach).toBeGreaterThan(BUILDABLE_RADIUS);
    expect(reach).toBeLessThan(eraBuildableRadius("neolithic"));

    expect(isCellBuildable(probe.col, probe.row, eraBuildableDiscRadius("neolithic"))).toBe(
      true,
    );
    // ...and era one has not moved, which is the other half of the same line.
    expect(
      isCellBuildable(probe.col, probe.row, eraBuildableDiscRadius("prehistoric")),
    ).toBe(false);
  });

  it("keeps every era's disc inside the grass that era is drawn on", () => {
    /*
     * The one direction that would be a REAL defect rather than a deferral: a buildable cell
     * outside the drawn grass would put a building on sand or water. It was true by accident
     * while the disc was pinned at era one's 22; now the disc moves, so it is measured at the
     * CELL rather than at the radius — a legal cell is tested at its centre and reaches
     * `GRID_CELL / 2` further on each axis, which is the corner the margin exists for.
     */
    const cornerReach = Math.hypot(GRID_CELL / 2, GRID_CELL / 2);
    for (const era of ERA_SEQUENCE) {
      const disc = eraBuildableDiscRadius(era.id);
      expect(disc, era.id).toBeLessThan(eraLandRadius(era.id));
      // The furthest corner of the furthest legal cell is still on flat ground, which
      // `StarterIsland` starts shelving 2.4 units inside the shoreline.
      expect(disc + cornerReach, era.id).toBeLessThanOrEqual(eraLandRadius(era.id) - 2.4);
    }
  });

  it("names the first era whose roster cannot be seated, measured through the real layout", () => {
    // `defaultPlacements` is the shipped greedy auto-layout, gated by `isFootprintInBounds` on
    // the disc it is handed — so this is what the island can hold, not an estimate. Counting
    // cells alone would be optimistic: contiguity binds before tiles do.
    const seated = ERA_SEQUENCE.map(
      (era) =>
        [era.id, seatedOnEraIsland(era.id), cityRosterNodeIds(era.id).length] as const,
    );
    const short = seated.filter(([, placed, wanted]) => placed < wanted);

    /*
     * ⚑ THE BOUNDARY MOVED FROM ERA THREE TO ERA NINE, and it moved because the disc followed
     * the land. Before: eras one and two seated in full and era three was the first that could
     * not, by two buildings, with the column topping out at 19 of a 62-node roster. Now eight of
     * the ten seat in full and era nine is the first that cannot, by one.
     *
     * The two figures below are the GREEDY layout's, which is what `defaultPlacements` is; the
     * catch-up's ring layout spends the same disc differently and seats 50 rather than 52 on the
     * same two rosters (`eraDiscSeatsTheRoster.test.tsx`). Both are reported because both ship:
     * the greedy one seeds a demo city and the ring one seats a handed-over age.
     *
     * What is left is the growth ceiling and nothing else: `islandLand.ts` holds the drawn land
     * at grass 46 from era four on, so eras four to ten all build on a disc of 38 against the 42
     * to 69 D-ERA25 authored. `ringLayout.test.ts` shows the same two rosters seating in full at
     * the authored radius, which is what attributes the shortfall to the ceiling rather than to
     * the layout. Closing it is the road lane's depth-budget work (era design §13).
     *
     * This is a fact about the shipped island and the shipped placement rule together, so it is
     * expected to move when either does, and it is pinned here so that it cannot move silently.
     */
    expect(
      seated.filter(([, placed, wanted]) => placed === wanted).map(([era]) => era),
    ).toEqual([
      "prehistoric",
      "neolithic",
      "bronze_age",
      "classical",
      "medieval",
      "renaissance",
      "industrial",
      "atomic_age",
    ]);
    expect(short.map(([era]) => era)).toEqual(["information_age", "cyberpunk"]);
    expect(seated).toEqual([
      ["prehistoric", 6, 6],
      ["neolithic", 11, 11],
      ["bronze_age", 16, 16],
      ["classical", 21, 21],
      ["medieval", 26, 26],
      ["renaissance", 32, 32],
      ["industrial", 38, 38],
      ["atomic_age", 47, 47],
      ["information_age", 52, 53],
      ["cyberpunk", 52, 62],
    ]);
  });
});
