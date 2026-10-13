import {
  buildableCellCount,
  ERA_LAND_DEMAND,
  ERA_ONE_BUILDABLE_CELLS,
  ERA_ONE_FILL_RATIO,
  ERA_ONE_OCCUPIED_CELLS,
  ERA_SEQUENCE,
  type EraId,
  eraBuildableRadius,
  eraLandDemand,
  HALL_LAND_CELLS,
  LAND_GRID_CELL,
  landBudgetRadiusFor,
  occupiedLandCells,
} from "@cr/skill-graph";
import { describe, expect, it } from "vitest";
import { eraCityLayout } from "./islandLand";
import { TOWN_HALL_FOOTPRINT, TOWN_HALL_ID } from "./townHall";
import {
  BUILDABLE_RADIUS,
  DEFAULT_FOOTPRINT,
  type Footprint,
  footprintCells,
  footprintFor,
  GRID_CELL,
  ISLAND_GRASS_RADIUS,
  isCellBuildable,
  NODE_FOOTPRINTS,
  SEA_RADIUS,
  type Transform,
} from "./worldLayout";

/**
 * **D-ERA25's LAND BUDGET, PROVED WHERE ITS INPUTS MEET.**
 *
 * `packages/skill-graph/src/eras.ts` authors ten radii and records the arithmetic behind them
 * in `ERA_LAND_DEMAND`. It cannot check that arithmetic: two of the three demand columns come
 * from modules it must not import, since `NODE_FOOTPRINTS` and `TOWN_HALL_FOOTPRINT` live in
 * `apps/`, which `packages/` may never reach (TS6059), and the civic catalogue lives in a
 * package that imports `skill-graph` rather than the reverse. **This file is the only place in
 * the tree where all three are importable**, so it owns the skill column, the hall column, and
 * the packing measurements the fill ratio is calibrated on.
 * `packages/economy/src/civicSolvency.test.ts` owns the civic column.
 *
 * Every column is DERIVED from its source rather than pinned. That is not tidiness: #293
 * re-priced seven civic catalogues and silently invalidated an earlier version of the demand
 * table, and a transcribed column cannot report that.
 *
 * ## It also states what authoring the radii does NOT do
 *
 * It moves no pixel. `isCellBuildable` and `computeCityLayout` read the module constant
 * `BUILDABLE_RADIUS`, and `ISLAND_GRASS_RADIUS` and `SEA_RADIUS` do not follow the buildable
 * disc at all. Both facts are asserted below rather than left as a claim, because "the numbers
 * landed and nothing rendered differently" is exactly the kind of statement that stops being
 * true quietly.
 */

/** Every anchor whose cells could sit inside `radius`, nearest the centre first. */
function anchorsWithin(radius: number): Transform[] {
  const reach = Math.ceil(radius / GRID_CELL) + 1;
  const out: Transform[] = [];
  for (let col = -reach; col <= reach; col += 1) {
    for (let row = -reach; row <= reach; row += 1) {
      out.push({ col, row, rot: 0 });
    }
  }
  return out.sort(
    (a, b) =>
      Math.hypot((a.col + 0.5) * GRID_CELL, (a.row + 0.5) * GRID_CELL) -
      Math.hypot((b.col + 0.5) * GRID_CELL, (b.row + 0.5) * GRID_CELL),
  );
}

/**
 * `isFootprintInBounds` at an arbitrary radius. The shipped one closes over
 * `BUILDABLE_RADIUS`, which is era one's, so a packing on era ten's disc has to re-derive the
 * same centre rule: the identical rule `buildableCellCount` uses.
 */
function seatsWithin(t: Transform, fp: Footprint, radius: number): boolean {
  for (let i = 0; i < fp.w; i += 1) {
    for (let j = 0; j < fp.d; j += 1) {
      const x = (t.col + i + 0.5) * GRID_CELL;
      const z = (t.row + j + 0.5) * GRID_CELL;
      if (Math.hypot(x, z) > radius) {
        return false;
      }
    }
  }
  return true;
}

/** Lay footprints greedily, nearest the centre first, on a disc of `radius`. */
function packOnto(
  footprints: readonly Footprint[],
  radius: number,
): { placed: number; occupied: Set<string> } {
  const spots = anchorsWithin(radius);
  const occupied = new Set<string>();
  let placed = 0;
  for (const fp of footprints) {
    const spot = spots.find(
      (t) =>
        seatsWithin(t, fp, radius) &&
        footprintCells(t, fp).every((key) => !occupied.has(key)),
    );
    if (spot === undefined) {
      continue;
    }
    for (const key of footprintCells(spot, fp)) {
      occupied.add(key);
    }
    placed += 1;
  }
  return { placed, occupied };
}

/** How many further 2x2 buildings seat on a disc once `occupied` is standing. */
function furtherSquarePlots(occupied: ReadonlySet<string>, radius: number): number {
  const spots = anchorsWithin(radius);
  const busy = new Set(occupied);
  let count = 0;
  for (;;) {
    const spot = spots.find(
      (t) =>
        seatsWithin(t, DEFAULT_FOOTPRINT, radius) &&
        footprintCells(t, DEFAULT_FOOTPRINT).every((key) => !busy.has(key)),
    );
    if (spot === undefined) {
      return count;
    }
    for (const key of footprintCells(spot, DEFAULT_FOOTPRINT)) {
      busy.add(key);
    }
    count += 1;
  }
}

const cells = (fp: Footprint): number => fp.w * fp.d;

function skillCellsOf(eraId: EraId): number {
  const era = ERA_SEQUENCE.find((entry) => entry.id === eraId);
  if (era === undefined) {
    throw new Error(`no era ${eraId}`);
  }
  return era.nodes.reduce((total, nodeId) => total + cells(footprintFor(nodeId)), 0);
}

/**
 * The eras whose skill cells in `ERA_LAND_DEMAND` are an ASSUMPTION rather than a measurement,
 * each with its reason. This is the named-exception list a derivation needs so that "authored
 * at 2x2" and "fell through to 2x2" stop looking identical from outside the guard.
 *
 * The assumption is the same for all three: their nodes resolve to `DEFAULT_FOOTPRINT`, and
 * because no authored plot in the run exceeds 2x2 that default is an UPPER BOUND. Whatever
 * those guides eventually decide can only free cells, so a budget derived from it cannot come
 * out too small, which is the direction that matters since a budget too small is a dead end.
 */
const ASSUMED_FOOTPRINT_ERAS: readonly { readonly era: EraId; readonly why: string }[] = [
  {
    era: "atomic_age",
    why:
      "era-08-atomic/style-guide.md closes no footprint item; its brief flags the gap and " +
      "draws all nine to the 2x2 default. Nine nodes, 36 of the 223 cumulative skill cells.",
  },
  {
    era: "information_age",
    why:
      "era-09-information/style-guide.md closes nothing either, and its brief calls the " +
      "2x2 default 'a design fact, not a placeholder'. Six nodes, 24 cells.",
  },
  {
    era: "cyberpunk",
    why:
      "era-10-cyberpunk/style-guide.md closes nothing ('footprints are not yet authored " +
      "for these nine') and has no brief yet. Nine nodes, 36 cells.",
  },
];

describe("the demand columns skill-graph cannot check for itself", () => {
  it("re-derives the cumulative SKILL column from footprintFor, era by era", () => {
    let cumulative = 0;
    const derived = ERA_SEQUENCE.map((era) => {
      cumulative += skillCellsOf(era.id);
      return { era: era.id, cumulative_skill_cells: cumulative };
    });

    for (const row of derived) {
      expect(eraLandDemand(row.era).cumulative_skill_cells, row.era).toBe(
        row.cumulative_skill_cells,
      );
    }
    // Both directions and a floor, so a shrunken derivation cannot satisfy the loop.
    expect(ERA_LAND_DEMAND.map((demand) => demand.cumulative_skill_cells)).toEqual(
      derived.map((row) => row.cumulative_skill_cells),
    );
    expect(derived).toHaveLength(10);
    // The per-era column, which is what a footprint edit actually moves.
    expect(ERA_SEQUENCE.map((era) => skillCellsOf(era.id))).toEqual([
      17, 18, 18, 16, 16, 22, 20, 36, 24, 36,
    ]);
    // And the total against the registry: 62 nodes, none counted twice or dropped.
    expect(cumulative).toBe(
      ERA_SEQUENCE.flatMap((era) => era.nodes).reduce(
        (total, nodeId) => total + cells(footprintFor(nodeId)),
        0,
      ),
    );
  });

  it("re-derives the HALL column from the hub's own footprint", () => {
    expect(cells(TOWN_HALL_FOOTPRINT)).toBe(HALL_LAND_CELLS);
    expect(footprintFor(TOWN_HALL_ID)).toEqual(TOWN_HALL_FOOTPRINT);
    // Every row carries it, and the hub belongs to no era: it is pre-seeded and stands from
    // the start, so it is added once rather than accumulated.
    for (const demand of ERA_LAND_DEMAND) {
      expect(demand.hall_cells, demand.era).toBe(HALL_LAND_CELLS);
    }
    // The hub is NOT one of the 62, so counting it inside the skill column would double-count
    // it. Stated because the two columns are summed together downstream.
    expect(ERA_SEQUENCE.flatMap((era) => era.nodes)).not.toContain(TOWN_HALL_ID);
  });

  it("names the eras whose skill cells are ASSUMED, and fails both ways", () => {
    const assumed = ASSUMED_FOOTPRINT_ERAS.map((entry) => entry.era);
    expect(assumed).toEqual(["atomic_age", "information_age", "cyberpunk"]);

    for (const { era, why } of ASSUMED_FOOTPRINT_ERAS) {
      const nodes = ERA_SEQUENCE.find((entry) => entry.id === era)?.nodes ?? [];
      // A listed era that has left the registry, or that quietly adopted an authored plot,
      // fails here rather than sitting in the list forever excusing nothing.
      expect(
        nodes.length,
        `${era} is a declared exception that still exists`,
      ).toBeGreaterThan(0);
      expect(
        nodes.filter((id) => id in NODE_FOOTPRINTS),
        `${era} adopted a footprint`,
      ).toEqual([]);
      expect(why.length, `${era} states why`).toBeGreaterThan(40);
    }

    // The other direction: an era NOT on the list whose nodes fall through to the default is
    // an era whose demand row is an assumption nobody declared.
    const fallsThrough = ERA_SEQUENCE.filter(
      (era) => !era.nodes.every((id) => id in NODE_FOOTPRINTS),
    ).map((era) => era.id);
    expect(fallsThrough).toEqual(assumed);

    // WHY THE ASSUMPTION IS SAFE, as arithmetic rather than as a sentence: no authored plot
    // in the run exceeds the default, so authoring these 24 can only ever free cells and the
    // budgets above them cannot be too small.
    const authoredPlots = ERA_SEQUENCE.flatMap((era) => era.nodes)
      .filter((id) => id in NODE_FOOTPRINTS)
      .map((id) => cells(footprintFor(id)));
    expect(authoredPlots).toHaveLength(38);
    expect(Math.max(...authoredPlots)).toBe(cells(DEFAULT_FOOTPRINT));
    // Non-vacuity: some of the 38 are strictly smaller, so this is not a table of 2x2s
    // satisfying a `<=`.
    expect(authoredPlots.filter((n) => n < cells(DEFAULT_FOOTPRINT)).length).toBe(12);

    const assumedCells = ASSUMED_FOOTPRINT_ERAS.reduce(
      (total, entry) => total + skillCellsOf(entry.era),
      0,
    );
    expect(assumedCells).toBe(96);
    expect(assumedCells).toBe(24 * cells(DEFAULT_FOOTPRINT));
  });
});

describe("the 53.4% fill ratio, as a packing rather than a division", () => {
  const eraOne = ERA_SEQUENCE[0];
  const eraOneNodes = eraOne?.nodes ?? [];
  const base: Footprint[] = [TOWN_HALL_FOOTPRINT, ...eraOneNodes.map(footprintFor)];
  /** Era one's cheapest closing city: four Family Lodges (2x2) and two Campfires (2x2). */
  const eraOneCivic: Footprint[] = Array.from({ length: 6 }, () => ({ w: 2, d: 2 }));

  it("measures era one's occupancy at 47 of 88, which is where the ratio comes from", () => {
    expect(eraOneNodes).toHaveLength(6);
    expect(buildableCellCount(eraBuildableRadius("prehistoric"))).toBe(
      ERA_ONE_BUILDABLE_CELLS,
    );
    expect(occupiedLandCells(eraLandDemand("prehistoric"))).toBe(ERA_ONE_OCCUPIED_CELLS);
    expect(ERA_ONE_FILL_RATIO).toBeCloseTo(0.5341, 4);
  });

  it("leaves exactly 13 further 2x2 slots after the hub and era one's six", () => {
    // The spec's own figure (§5.1: "the seven D1 occupants take 23 of 88 tiles and leave 65
    // free, but 13 further 2x2 buildings fit in them"), re-measured here because it is the
    // evidence that free TILES badly overstate free GROUND. 65 free tiles carry 52 cells of
    // building, so the remainder is 80% usable and a fill ratio near 53% is nowhere near the
    // point at which the island is merely under-used.
    const { occupied } = packOnto(base, BUILDABLE_RADIUS);
    expect(occupied.size).toBe(23);
    expect(ERA_ONE_BUILDABLE_CELLS - occupied.size).toBe(65);
    expect(furtherSquarePlots(occupied, BUILDABLE_RADIUS)).toBe(13);
  });

  it("seats era one's WHOLE content with placement freedom left over", () => {
    // The calibration has to describe a playable island, not merely an arithmetic one.
    // Everything era one owns (hub, six earned buildings, the cheapest bought city) packs onto
    // the shipped disc, and there is still somewhere to put another building.
    const full = packOnto([...base, ...eraOneCivic], BUILDABLE_RADIUS);
    expect(full.placed).toBe(base.length + eraOneCivic.length);
    expect(full.placed).toBe(13);
    expect(full.occupied.size).toBe(ERA_ONE_OCCUPIED_CELLS);
    expect(furtherSquarePlots(full.occupied, BUILDABLE_RADIUS)).toBe(7);
  });

  it("seats the whole TEN-ERA city on era ten's disc, packed and not summed", () => {
    // The end state, measured. 62 skill buildings, the hub, and every era's cheapest city:
    // 123 buildings and 490 cells, laid nearest-centre-first on radius 69. A sum of footprints
    // proves a budget is big enough only if the ground is packable, and contiguity is what
    // actually binds (the 13-slot measurement above is that in miniature), so the packing is
    // the claim rather than the addition.
    const civicPlans: Readonly<Record<EraId, readonly [number, number, number][]>> = {
      prehistoric: [[6, 2, 2]],
      neolithic: [[6, 2, 2]],
      bronze_age: [
        [3, 1, 2],
        [3, 3, 2],
      ],
      classical: [
        [3, 2, 2],
        [3, 3, 2],
      ],
      medieval: [[6, 2, 2]],
      renaissance: [
        [3, 2, 2],
        [3, 3, 2],
      ],
      industrial: [[6, 2, 2]],
      atomic_age: [
        [3, 2, 2],
        [3, 3, 2],
      ],
      information_age: [
        [3, 2, 2],
        [3, 3, 2],
      ],
      cyberpunk: [
        [3, 1, 1],
        [3, 3, 2],
      ],
    };
    const civic: Footprint[] = [];
    for (const era of ERA_SEQUENCE) {
      for (const [count, w, d] of civicPlans[era.id]) {
        for (let k = 0; k < count; k += 1) {
          civic.push({ w, d });
        }
      }
    }
    // The plans are the ones `civicSolvency.test.ts` derives; this checks the transcription
    // rather than trusting it.
    expect(civic.reduce((total, fp) => total + cells(fp), 0)).toBe(
      eraLandDemand("cyberpunk").cumulative_civic_cells,
    );

    const skill = ERA_SEQUENCE.flatMap((era) => era.nodes.map(footprintFor));
    const all = [TOWN_HALL_FOOTPRINT, ...skill, ...civic];
    const radius = eraBuildableRadius("cyberpunk");
    const packed = packOnto(all, radius);

    expect(all).toHaveLength(123);
    expect(packed.placed, "a building did not seat on era ten's island").toBe(all.length);
    expect(packed.occupied.size).toBe(occupiedLandCells(eraLandDemand("cyberpunk")));
    expect(packed.occupied.size).toBe(490);
    expect(buildableCellCount(radius) - packed.occupied.size).toBe(446);
    // And the ground is not merely large but usable: further square plots seat once the whole
    // run's city stands, so the leftover is not fragmented into unbuildable slivers.
    const spare = furtherSquarePlots(packed.occupied, radius);
    expect(spare).toBeGreaterThanOrEqual(90);
    expect(spare * 4).toBeLessThanOrEqual(
      buildableCellCount(radius) - packed.occupied.size,
    );
  });

  it("seats every era's cumulative city on that era's own disc, not only era ten's", () => {
    // The end state is the easy case, because era ten's disc is the largest. The tight ones
    // are in the middle: era two's budget clears its requirement by under three cells. So the
    // packing runs for all ten, cumulatively, on each era's own authored radius.
    const civicSquares = (count: number): Footprint[] =>
      Array.from({ length: count }, () => ({ w: 2, d: 2 }));
    let placedSoFar: Footprint[] = [];
    const report: [EraId, number][] = [];

    for (const era of ERA_SEQUENCE) {
      const demand = eraLandDemand(era.id);
      const previousCivic =
        ERA_SEQUENCE.indexOf(era) === 0
          ? 0
          : (ERA_LAND_DEMAND[ERA_SEQUENCE.indexOf(era) - 1]?.cumulative_civic_cells ?? 0);
      const newCivicCells = demand.cumulative_civic_cells - previousCivic;
      // 2x2s are the worst-shape stand-in for the era's own civic cells: the real plans use
      // 3x2 and 1x1 rows, and a 2x2 packing is at least as hard to seat as a 1x1 one.
      placedSoFar = [
        ...placedSoFar,
        ...era.nodes.map(footprintFor),
        ...civicSquares(Math.ceil(newCivicCells / 4)),
      ];
      const all = [TOWN_HALL_FOOTPRINT, ...placedSoFar];
      const radius = eraBuildableRadius(era.id);
      const packed = packOnto(all, radius);
      expect(packed.placed, `${era.id} could not seat its cumulative city`).toBe(
        all.length,
      );
      report.push([era.id, buildableCellCount(radius) - packed.occupied.size]);
    }

    expect(report).toHaveLength(10);
    // Every era leaves real ground, and the report is per era so a single tight era cannot
    // hide behind nine comfortable ones.
    for (const [era, spare] of report) {
      expect(spare, `${era} has no ground left over`).toBeGreaterThan(0);
    }
  });
});

describe("what authoring the radii does NOT touch", () => {
  it("leaves the placement disc on the module constant, so no era moves it", () => {
    // The only thing that decides where a building may stand is `BUILDABLE_RADIUS`, and it is
    // era one's. Nothing in the placement or camera path reads the per-era radius, which is
    // why ten authored numbers change no behaviour a player can see today.
    expect(BUILDABLE_RADIUS).toBe(eraBuildableRadius("prehistoric"));
    expect(eraCityLayout("prehistoric").buildableRadius).toBe(BUILDABLE_RADIUS);
    expect(GRID_CELL).toBe(LAND_GRID_CELL);

    // Stated as behaviour rather than as a constant: a cell just outside era one's disc and
    // well inside era two's authored one is NOT buildable today.
    const beyond = Math.ceil(BUILDABLE_RADIUS / GRID_CELL);
    expect(isCellBuildable(beyond, 0, BUILDABLE_RADIUS)).toBe(false);
    expect(Math.hypot((beyond + 0.5) * GRID_CELL, 0.5 * GRID_CELL)).toBeLessThan(
      eraBuildableRadius("neolithic"),
    );
  });

  it("reports where the buildable disc and the DRAWN island diverge, without moving either", () => {
    // D-ERA26 keeps the island's art per-era and §5.1 gates the first expansion on the road
    // layer's depth budget (4.42 against a bar of 4, so about 5% of growth). So these radii
    // are a design figure until that lane lands, and this records the gap they would open
    // rather than closing it here.
    expect(ISLAND_GRASS_RADIUS).toBe(30);
    expect(SEA_RADIUS).toBe(58);

    const pastTheGrass = ERA_SEQUENCE.filter(
      (era) => eraBuildableRadius(era.id) > ISLAND_GRASS_RADIUS,
    ).map((era) => era.id);
    const pastTheLagoon = ERA_SEQUENCE.filter(
      (era) => eraBuildableRadius(era.id) > SEA_RADIUS,
    ).map((era) => era.id);

    // Era two lands EXACTLY on the drawn grass edge; era three is the first past it.
    expect(eraBuildableRadius("neolithic")).toBe(ISLAND_GRASS_RADIUS);
    expect(pastTheGrass).toEqual([
      "bronze_age",
      "classical",
      "medieval",
      "renaissance",
      "industrial",
      "atomic_age",
      "information_age",
      "cyberpunk",
    ]);
    // Era seven's 55 is still inside the lagoon; era eight's 60 is the first past it.
    expect(eraBuildableRadius("industrial")).toBeLessThan(SEA_RADIUS);
    expect(pastTheLagoon).toEqual(["atomic_age", "information_age", "cyberpunk"]);
    // Non-vacuity in the other direction: era one sits well inside both, which is why the
    // shipped island has never had to answer this question.
    expect(eraBuildableRadius("prehistoric")).toBeLessThan(ISLAND_GRASS_RADIUS);
  });

  it("keeps the derivation reproducible from the demand table alone", () => {
    // The one-line restatement of the whole file: every radius in the tree follows from its
    // demand row and era one's measured fill, and nothing here has to be believed.
    for (const era of ERA_SEQUENCE) {
      expect(landBudgetRadiusFor(occupiedLandCells(eraLandDemand(era.id))), era.id).toBe(
        eraBuildableRadius(era.id),
      );
    }
    expect(ERA_SEQUENCE).toHaveLength(10);
  });
});
