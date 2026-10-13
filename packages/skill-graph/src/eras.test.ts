import { describe, expect, it } from "vitest";

import {
  buildableCellCount,
  ERA_LAND_DEMAND,
  ERA_MAX_NODES,
  ERA_MIN_NODES,
  ERA_ONE_BUILDABLE_CELLS,
  ERA_ONE_FILL_RATIO,
  ERA_ONE_OCCUPIED_CELLS,
  ERA_SEQUENCE,
  type EraId,
  type EraLandBudget,
  type EraLandEntry,
  eraAtNumber,
  eraBuildableRadius,
  eraLandDemand,
  eraNumber,
  findLandBudgetViolations,
  getEraNodes,
  getEraOfNode,
  getEraOrderedNodes,
  getEraOrThrow,
  HALL_LAND_CELLS,
  LAND_GRID_CELL,
  landBudgetRadius,
  landBudgetRadiusFor,
  occupiedLandCells,
} from "./eras";
import { getProductNodes } from "./index";

/**
 * The era data model's invariants (spec §3, INV-ERA-2 and INV-ERA-5) and the per-era
 * land budget (§5.1, D-ERA25). Everything here derives from the registry rather than
 * transcribing it, so a skill-graph change that would drop a node from the curriculum
 * fails HERE instead of quietly shrinking the game.
 *
 * Note on `node.domain`: these tests read it, and `eras.ts` deliberately does not.
 * That asymmetry is the point of INV-ERA-5 — the test's job is to prove the
 * grouping is not derivable from `DomainId`, which it cannot do without looking at
 * the domains it is ruling out.
 */

const productNodes = getProductNodes();
const productNodeIds = new Set(productNodes.map((node) => node.id));
const domainByNodeId = new Map(productNodes.map((node) => [node.id, node.domain]));

const eraNumberByNodeId = new Map<string, number>(
  ERA_SEQUENCE.flatMap((era, index) =>
    era.nodes.map((nodeId) => [nodeId, index + 1] as const),
  ),
);

describe("the era sequence", () => {
  it("is ten eras, named and ordered as the spec's §3 table", () => {
    expect(ERA_SEQUENCE).toHaveLength(10);
    expect(ERA_SEQUENCE.map((era) => era.name)).toEqual([
      "Prehistoric Era",
      "Neolithic Era",
      "Bronze Age",
      "Classical Era",
      "Medieval Era",
      "Early Modern",
      "Industrial Era",
      "Atomic Age",
      "Information Age",
      "Cyberpunk Era",
    ]);
  });

  it("holds between 3 and 9 nodes per era, at the authored sizes", () => {
    expect(ERA_MIN_NODES).toBe(3);
    expect(ERA_MAX_NODES).toBe(9);

    for (const era of ERA_SEQUENCE) {
      expect(era.nodes.length).toBeGreaterThanOrEqual(ERA_MIN_NODES);
      expect(era.nodes.length).toBeLessThanOrEqual(ERA_MAX_NODES);
    }

    // Pinned so a regrouping is visible in review rather than only in a total.
    expect(ERA_SEQUENCE.map((era) => era.nodes.length)).toEqual([
      6, 5, 5, 5, 5, 6, 6, 9, 6, 9,
    ]);

    // The band's floor is 3 and no era is anywhere near it: the smallest chapter
    // holds 5. Stated separately from the band because it is a different claim —
    // the band is what the spec permits, this is what the sequence actually does,
    // and Early Modern sitting one node above the floor was the defect that the
    // graph-reading rule below fixed.
    const sizes = ERA_SEQUENCE.map((era) => era.nodes.length);
    expect(Math.min(...sizes)).toBe(5);
    expect(Math.max(...sizes)).toBe(9);
  });

  it("gives every era a rationale a reader can check the grouping against", () => {
    expect(ERA_SEQUENCE).toHaveLength(10);
    for (const era of ERA_SEQUENCE) {
      expect(era.rationale.length).toBeGreaterThan(40);
    }
  });
});

describe("INV-ERA-2 — every node is retained", () => {
  it("partitions all 62 in-product nodes across the ten eras", () => {
    // Non-vacuity floor: the registry side of the comparison is a real, non-empty
    // population before anything is asserted about coverage.
    expect(productNodes.length).toBe(62);
    expect(productNodeIds.size).toBe(62);

    const assigned = ERA_SEQUENCE.flatMap((era) => era.nodes);
    const uniqueAssigned = new Set(assigned);

    // No duplicates: a node counted twice would otherwise mask a dropped one.
    expect(assigned).toHaveLength(62);
    expect(uniqueAssigned.size).toBe(62);

    // Retention, stated as set equality in both directions rather than as a
    // one-way containment that an over-broad era set could satisfy.
    const missing = [...productNodeIds].filter((id) => !uniqueAssigned.has(id));
    const unknown = [...uniqueAssigned].filter((id) => !productNodeIds.has(id));
    expect(missing).toEqual([]);
    expect(unknown).toEqual([]);
    expect([...uniqueAssigned].sort()).toEqual([...productNodeIds].sort());
  });

  it("resolves an era for every in-product node, and only for those", () => {
    expect(productNodes.length).toBe(62);

    for (const node of productNodes) {
      expect(getEraOfNode(node.id), `no era for ${node.id}`).toBeDefined();
    }

    expect(getEraOrderedNodes()).toHaveLength(62);
    expect(getEraOfNode("NUM.0")).toBeUndefined();
    expect(getEraOfNode("NOPE.1")).toBeUndefined();
  });

  it("never places a node before one of its prerequisites", () => {
    const edges = productNodes.flatMap((node) =>
      node.prereqs
        .filter((prereq) => productNodeIds.has(prereq))
        .map((prereq) => [prereq, node.id] as const),
    );

    // Non-vacuity floor: the sweep runs over more edges than there are nodes, so
    // it cannot be passing because the edge list came out empty.
    expect(edges.length).toBeGreaterThan(62);

    for (const [prereq, dependent] of edges) {
      const prereqEra = eraNumberByNodeId.get(prereq);
      const dependentEra = eraNumberByNodeId.get(dependent);
      expect(prereqEra, `${prereq} has no era`).toBeDefined();
      expect(dependentEra, `${dependent} has no era`).toBeDefined();
      expect(
        prereqEra as number,
        `${dependent} (era ${dependentEra}) requires ${prereq} (era ${prereqEra})`,
      ).toBeLessThanOrEqual(dependentEra as number);
    }
  });
});

describe("INV-ERA-5 — the sequence is authored data, never inferred from DomainId", () => {
  it("gives eras non-numeric ids, so no ordinal can be parsed or sorted", () => {
    expect(ERA_SEQUENCE).toHaveLength(10);

    for (const era of ERA_SEQUENCE) {
      // `Number(id.slice(1))` is the shape `getLockedDistricts` uses on DomainId.
      // On an era id it yields NaN, so that pattern cannot recover the sequence.
      expect(Number(era.id.slice(1))).toBeNaN();
      expect(Number(era.id)).toBeNaN();
      expect(era.id).not.toMatch(/\d/);
    }
  });

  it("derives the era number from array position and nothing else", () => {
    ERA_SEQUENCE.forEach((era, index) => {
      expect(eraNumber(era.id)).toBe(index + 1);
      expect(eraAtNumber(index + 1)?.id).toBe(era.id);
    });

    expect(eraAtNumber(0)).toBeUndefined();
    expect(eraAtNumber(11)).toBeUndefined();
  });

  it("carries no domain on any era, so the renumber cannot reach this data", () => {
    expect(ERA_SEQUENCE).toHaveLength(10);

    for (const era of ERA_SEQUENCE) {
      expect(Object.keys(era).sort()).toEqual([
        "id",
        "land",
        "name",
        "nodes",
        "rationale",
        "release",
      ]);
    }
  });

  it("is not a function of DomainId, so no derivation could reproduce it", () => {
    const erasByDomain = new Map<string, Set<number>>();
    const domainsByEra = new Map<number, Set<string>>();

    for (const node of productNodes) {
      const era = eraNumberByNodeId.get(node.id) as number;
      const domain = domainByNodeId.get(node.id) as string;
      const eras = erasByDomain.get(domain) ?? new Set<number>();
      eras.add(era);
      erasByDomain.set(domain, eras);
      const domains = domainsByEra.get(era) ?? new Set<string>();
      domains.add(domain);
      domainsByEra.set(era, domains);
    }

    // Floors: both indexes cover the whole registry before anything is concluded
    // from them.
    expect(erasByDomain.size).toBe(10);
    expect(domainsByEra.size).toBe(10);

    // A domain whose nodes span two eras makes domain -> era a non-function, so
    // there is no `DomainId` keyed lookup that could produce these sets. D4 splits
    // three ways: POL.5 requires CG.1 and FUN.1, and POL.6/POL.7 follow the plane
    // as graph-reading lessons. D5 splits because RAT.5 does the same. D6 splits
    // because Functions are divided across eras seven and eight, with CG.1 pulled
    // forward to era six.
    const split = [...erasByDomain].filter(([, eras]) => eras.size > 1);
    expect(split.length).toBeGreaterThanOrEqual(3);
    expect(new Set(split.map(([domain]) => domain))).toEqual(new Set(["D4", "D5", "D6"]));
    expect(erasByDomain.get("D4")).toEqual(new Set([4, 6, 7]));

    // And eras that hold more than one domain make era -> domain a non-function in
    // the other direction. The Early Modern holds four, which is why a
    // `DomainId`-keyed derivation cannot even name it.
    const mixed = [...domainsByEra].filter(([, domains]) => domains.size > 1);
    expect(mixed.length).toBeGreaterThanOrEqual(3);
    expect(new Set(mixed.map(([era]) => era))).toEqual(new Set([6, 7, 8]));
    expect(domainsByEra.get(6)).toEqual(new Set(["D4", "D5", "D6", "D10"]));
  });
});

describe("no graph-reading lesson precedes the era that introduces the plane", () => {
  /**
   * Every node whose lesson is reading or drawing a picture on axes. The
   * prerequisite sweep in INV-ERA-2 CANNOT protect most of these: a hard edge
   * records what must have been MASTERED, and end behaviour can be stated from a
   * degree and a leading coefficient without drawing anything, so the registry
   * honestly declines to make CG.1 a prerequisite of POL.6. It cannot be TAUGHT
   * that way, which is a fact about the lesson rather than about the graph, so the
   * era sets have to carry it and this is where it is carried.
   */
  const GRAPH_READING = [
    "POL.5",
    "POL.6",
    "POL.7",
    "RAT.5",
    "FUN.3",
    "FUN.4",
    "FUN.9",
    "FUN.10",
    "EL.2",
    "EL.4",
    "TRG.5",
    "TRG.6",
  ] as const;

  it("places all twelve at or after CG.1, nine of them beyond the edge sweep's reach", () => {
    const planeEra = eraNumberByNodeId.get("CG.1");
    expect(planeEra).toBe(6);

    // Floor: the list is the population it claims to be, and each entry is a real
    // in-product node rather than a typo that would pass vacuously.
    expect(GRAPH_READING).toHaveLength(12);
    expect(new Set(GRAPH_READING).size).toBe(12);
    for (const nodeId of GRAPH_READING) {
      expect(productNodeIds.has(nodeId), `${nodeId} is not an in-product node`).toBe(true);
    }

    for (const nodeId of GRAPH_READING) {
      const era = eraNumberByNodeId.get(nodeId);
      expect(era, `${nodeId} has no era`).toBeDefined();
      expect(
        era as number,
        `${nodeId} (era ${era}) is a graphing lesson and CG.1 lands in era ${planeEra}`,
      ).toBeGreaterThanOrEqual(planeEra as number);
    }

    // And the reason this test exists rather than leaning on the prereq sweep:
    // most of the list does not declare CG.1 at all, so the sweep sees nothing.
    // Counted from the registry so the claim cannot drift from the edge data.
    const declaresPlane = GRAPH_READING.filter((nodeId) =>
      (productNodes.find((node) => node.id === nodeId)?.prereqs ?? []).includes("CG.1"),
    );
    expect(declaresPlane.sort()).toEqual(["FUN.4", "FUN.9", "POL.5"]);
    expect(GRAPH_READING.length - declaresPlane.length).toBe(9);
  });
});

describe("the per-era land budget (D-ERA25)", () => {
  it("authors all ten radii, and every one follows from its own demand row", () => {
    expect(ERA_SEQUENCE).toHaveLength(10);

    const authored = ERA_SEQUENCE.filter((era) => era.land.status === "authored");
    expect(authored).toHaveLength(10);
    expect(ERA_SEQUENCE.filter((era) => era.land.status !== "authored")).toEqual([]);

    // 22 is the shipped `BUILDABLE_RADIUS` (apps/web/src/city/worldLayout.ts), so era one
    // describes the island D1's buildings already stand on, not a guess.
    expect(eraBuildableRadius("prehistoric")).toBe(22);

    // **THE TABLE, AND IT IS DERIVED RATHER THAN PINNED.** Every radius is recomputed from
    // that era's own demand row through `landBudgetRadiusFor`, so a moved footprint or a
    // re-priced catalogue moves the demand row and fails HERE instead of leaving ten stale
    // numbers behind. #293 re-priced seven civic catalogues and invalidated an earlier
    // version of this table exactly that way, which is why the check is a derivation.
    for (const era of ERA_SEQUENCE) {
      expect(
        landBudgetRadiusFor(occupiedLandCells(eraLandDemand(era.id))),
        `${era.id} does not follow from its demand row`,
      ).toBe(eraBuildableRadius(era.id));
    }

    // The report, so a reviewer can read the ten without running the derivation.
    expect(
      ERA_SEQUENCE.map((era) => [
        era.id,
        eraBuildableRadius(era.id),
        buildableCellCount(eraBuildableRadius(era.id)),
      ]),
    ).toEqual([
      ["prehistoric", 22, 88],
      ["neolithic", 30, 172],
      ["bronze_age", 35, 248],
      ["classical", 42, 332],
      ["medieval", 46, 408],
      ["renaissance", 51, 524],
      ["industrial", 55, 608],
      ["atomic_age", 60, 716],
      ["information_age", 64, 812],
      ["cyberpunk", 69, 936],
    ]);

    // Fail-loud survives every era being authored: an id that is not an era still stops
    // rather than resolving to a plausible-looking disc.
    expect(() => eraBuildableRadius("atlantean" as EraId)).toThrow(/Unknown era/);
    expect(() => eraLandDemand("atlantean" as EraId)).toThrow(/no land-demand row/);
  });

  it("keeps every radius at or under era one's measured fill, and never above it", () => {
    // The calibration is a CEILING, and the treads are why no era can exceed it: a tread is
    // a jump rather than a step, so the smallest admissible count overshoots. An era over
    // 53.4% would mean the derivation had been fitted rather than applied.
    const fills = ERA_SEQUENCE.map((era) => {
      const occupied = occupiedLandCells(eraLandDemand(era.id));
      const cells = buildableCellCount(eraBuildableRadius(era.id));
      return { era: era.id, occupied, cells, fill: occupied / cells };
    });

    for (const row of fills) {
      expect(row.fill, `${row.era} is fuller than the calibration era`).toBeLessThanOrEqual(
        ERA_ONE_FILL_RATIO,
      );
      // And the budget is not merely large enough but MINIMAL: the tread below it is short.
      expect(
        landBudgetRadiusFor(row.occupied),
        `${row.era} is not the smallest admissible budget`,
      ).toBe(eraBuildableRadius(row.era));
    }
    expect(fills).toHaveLength(10);
    // Era one is exact by construction, which is what makes it the calibration rather than
    // one more measurement, and the band the other nine land in.
    expect(fills[0]?.fill).toBe(ERA_ONE_FILL_RATIO);
    expect(ERA_ONE_FILL_RATIO).toBeCloseTo(0.5341, 4);
    // The emptiest is era six, whose tread jumps 484 to 524 and overshoots the most.
    expect(Math.min(...fills.map((row) => row.fill))).toBeCloseTo(0.5134, 4);
    expect(fills.reduce((worst, row) => (row.fill < worst.fill ? row : worst)).era).toBe(
      "renaissance",
    );
    // Non-vacuity: the ten are not all sitting on the calibration, so `<=` is doing work.
    expect(fills.filter((row) => row.fill < ERA_ONE_FILL_RATIO)).toHaveLength(9);
  });

  it("rejects a demand that is not a whole number of cells", () => {
    // The demand table is cell counts, so a fractional or empty demand means somebody
    // averaged something. It stops rather than returning a radius derived from a guess.
    expect(() => landBudgetRadiusFor(0)).toThrow(/positive whole number/);
    expect(() => landBudgetRadiusFor(-1)).toThrow(/positive whole number/);
    expect(() => landBudgetRadiusFor(46.5)).toThrow(/positive whole number/);
  });

  it("keeps reading an unauthored radius a compile error AND a live runtime throw", () => {
    // **NO ERA IN THE SEQUENCE IS UNAUTHORED, so this drives the variant directly.** The old
    // version of this test looped over `ERA_SEQUENCE`'s unauthored entries, and there are
    // none, so it would now sweep zero eras and pass over nothing. `landBudgetRadius` takes
    // the budget rather than reading it off the sequence for exactly this reason: the branch
    // stays reachable, so the guard stays enforced instead of rotting into dead code.
    // Built through a function returning the UNION rather than assigned as a literal, because a
    // `const` initialised with one member narrows to it and `tsc` then rejects the discriminant
    // check below as a comparison with no overlap (TS2367). The union is what is under test.
    const unauthoredBudget = (): EraLandBudget => ({ status: "unauthored" });
    const land = unauthoredBudget();

    if (land.status !== "authored") {
      // `land` is narrowed to the unauthored variant here, and that variant carries no
      // `buildable_radius` at all. THE DIRECTIVE IS THE ASSERTION: if the field is ever
      // added to it, this read compiles, the directive goes unused, and `tsc` fails the
      // build with TS2578. No runtime check can state that.
      // @ts-expect-error - the unauthored variant has no `buildable_radius` to read
      const unreadable: unknown = land.buildable_radius;
      expect(unreadable).toBeUndefined();
    }

    expect(land).not.toHaveProperty("buildable_radius");
    expect(() => landBudgetRadius("neolithic", land)).toThrow(/D-ERA25/);
    // O-3 is resolved, so the accessor must not still name it as an open decision.
    expect(() => landBudgetRadius("neolithic", land)).not.toThrow(/O-3/);
    // And the authored variant goes through the same door, so the two are one code path
    // rather than a guard beside a getter that could disagree with it.
    expect(landBudgetRadius("neolithic", { status: "authored", buildable_radius: 7 })).toBe(
      7,
    );
    // The `unauthored` variant is still a member of the union rather than a comment about
    // one: this assignment is what would stop compiling if somebody collapsed it.
    const stillAUnion: EraLandBudget = { status: "unauthored" };
    expect(stillAUnion.status).toBe("unauthored");
  });

  it("counts buildable cells off the cell CENTRE, in a staircase with flat treads", () => {
    // The shipped island: radius 22 gives the 88 cells the spec's §5 table enumerates
    // and the real `isCellBuildable` produces at `BUILDABLE_RADIUS`. This figure is what
    // pins `LAND_GRID_CELL` to the app's `GRID_CELL`, which cannot be imported here.
    expect(LAND_GRID_CELL).toBe(4);
    expect(buildableCellCount(22)).toBe(88);

    // The flat treads. Each pair is a radius bump that unlocks NOTHING, which is why
    // the ordering rule below reads cell counts and never radii.
    expect(buildableCellCount(21)).toBe(88);
    expect(buildableCellCount(23)).toBe(112);
    expect(buildableCellCount(24)).toBe(112);
    expect(buildableCellCount(32)).toBe(208);
    expect(buildableCellCount(33)).toBe(208);
    expect(buildableCellCount(41)).toBe(332);
    expect(buildableCellCount(42)).toBe(332);

    // And two risers, so the pins above are not all describing a constant function.
    // 45 -> 392 is the spec §5 table's own enumeration, kept here as a cross-check of
    // this counter and NOT as a target: D-ERA25 withdrew "~45" as an end state.
    expect(buildableCellCount(45)).toBe(392);
    expect(buildableCellCount(60)).toBe(716);
  });

  it("requires each authored era to unlock strictly more cells than the last", () => {
    expect(findLandBudgetViolations(ERA_SEQUENCE)).toEqual([]);

    // **THE SWEEP USED TO BE VACUOUS OVER THE REAL SEQUENCE, and this is the count that says
    // it no longer is.** With era one alone authored there was no consecutive authored pair,
    // so a green run over `ERA_SEQUENCE` compared nothing. Ten authored eras is nine pairs.
    const authored = ERA_SEQUENCE.filter((era) => era.land.status === "authored");
    expect(authored.length - 1).toBe(9);

    // AND IT REALLY BITES ON THE REAL DATA, forced pair by pair rather than argued: flatten
    // each era onto its predecessor's radius in turn, over the actual sequence, and every one
    // of the nine is reported. A synthetic two-entry case (below) cannot show that.
    for (let index = 1; index < ERA_SEQUENCE.length; index += 1) {
      const flattened = ERA_SEQUENCE.map((era, position) =>
        position === index
          ? {
              id: era.id,
              land: {
                status: "authored" as const,
                buildable_radius: eraBuildableRadius(
                  ERA_SEQUENCE[index - 1]?.id ?? "prehistoric",
                ),
              },
            }
          : era,
      );
      const violations = findLandBudgetViolations(flattened);
      expect(
        violations.map((v) => v.era),
        `era ${index + 1} flattened`,
      ).toEqual([ERA_SEQUENCE[index]?.id]);
    }
  });

  it("fires on the 21-then-22 pair a radius comparison would wave through", () => {
    const earlier = {
      id: "prehistoric",
      land: { status: "authored", buildable_radius: 21 },
    } as const;
    const later = {
      id: "neolithic",
      land: { status: "authored", buildable_radius: 22 },
    } as const;

    // The sharpest case in the staircase: 22 is the larger radius, and both radii sit
    // on the same tread, so the era that "grew" unlocks not one new tile.
    expect(later.land.buildable_radius).toBeGreaterThan(earlier.land.buildable_radius);
    expect(buildableCellCount(22)).toBe(buildableCellCount(21));

    const violations = findLandBudgetViolations([earlier, later]);

    expect(violations).toHaveLength(1);
    const [violation] = violations;
    expect(violation?.era).toBe("neolithic");
    expect(violation?.previousEra).toBe("prehistoric");
    expect(violation?.cells).toBe(88);
    expect(violation?.previousCells).toBe(88);
    expect(violation?.message).toContain("88 buildable cells");
    expect(violation?.message).toContain("D-ERA25");
  });

  it("compares an authored era against the last AUTHORED one, skipping the unset", () => {
    const eraOne: EraLandEntry = {
      id: "prehistoric",
      land: { status: "authored", buildable_radius: 22 },
    };
    const gap: EraLandEntry = { id: "neolithic", land: { status: "unauthored" } };

    // An era authored after a run of unset ones is compared against era one rather than
    // against a pending era read as zero: at radius 23 it grows (112 > 88), and at 21 it
    // lands back on era one's own tread and fails despite the gap between them.
    const grows: EraLandEntry = {
      id: "bronze_age",
      land: { status: "authored", buildable_radius: 23 },
    };
    const stalls: EraLandEntry = {
      id: "bronze_age",
      land: { status: "authored", buildable_radius: 21 },
    };

    expect(findLandBudgetViolations([eraOne, gap, grows])).toEqual([]);

    const violations = findLandBudgetViolations([eraOne, gap, stalls]);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.previousEra).toBe("prehistoric");
    expect(violations[0]?.cells).toBe(88);
  });

  it("names every radius at the TOP of its tread, which is era one's own convention", () => {
    // Every radius on a tread yields the identical cell SET, so without a rule a budget has
    // two to five equally correct names. The rule is the top, and era one's shipped 22 is
    // where it comes from rather than being a new invention.
    for (const era of ERA_SEQUENCE) {
      const radius = eraBuildableRadius(era.id);
      const cells = buildableCellCount(radius);
      expect(buildableCellCount(radius + 1), `${era.id} is not at the top`).toBeGreaterThan(
        cells,
      );
    }
    // Non-vacuity: at least one of the ten sits on a tread wider than a single radius, or
    // "the top" would be every radius trivially. Era four's 332 spans 41..42.
    const onWideTread = ERA_SEQUENCE.filter((era) => {
      const radius = eraBuildableRadius(era.id);
      return buildableCellCount(radius - 1) === buildableCellCount(radius);
    }).map((era) => era.id);
    expect(onWideTread).toEqual(["prehistoric", "classical"]);
  });
});

describe("the demand table the radii are derived from", () => {
  it("covers ERA_SEQUENCE exactly once, in order", () => {
    expect(ERA_LAND_DEMAND.map((row) => row.era)).toEqual(
      ERA_SEQUENCE.map((era) => era.id),
    );
    expect(ERA_LAND_DEMAND).toHaveLength(10);
    for (const era of ERA_SEQUENCE) {
      expect(eraLandDemand(era.id).era).toBe(era.id);
    }
  });

  it("is CUMULATIVE on both building columns, which is the easy thing to get wrong", () => {
    // Nothing is ever torn down, so era five's island holds eras one to five. A column that
    // fell anywhere would mean somebody had written per-era demand into a running total.
    for (let index = 1; index < ERA_LAND_DEMAND.length; index += 1) {
      const row = ERA_LAND_DEMAND[index];
      const previous = ERA_LAND_DEMAND[index - 1];
      expect(row?.cumulative_skill_cells, row?.era).toBeGreaterThan(
        previous?.cumulative_skill_cells ?? 0,
      );
      expect(row?.cumulative_civic_cells, row?.era).toBeGreaterThan(
        previous?.cumulative_civic_cells ?? 0,
      );
    }
    // The hall is added once rather than accumulated: it belongs to no era and is
    // pre-seeded, so a row carrying a multiple of it would be counting it per era.
    for (const row of ERA_LAND_DEMAND) {
      expect(row.hall_cells, row.era).toBe(HALL_LAND_CELLS);
    }
    expect(HALL_LAND_CELLS).toBe(6);
  });

  it("makes era one's row the calibration, and the calibration era one's own island", () => {
    // The two integers the whole derivation hangs off, tied back to era one's demand row and
    // its shipped radius so neither can be edited alone. The catalogue and footprint sources
    // are re-derived in `apps/web/src/city/eraLandBudget.test.ts` and
    // `packages/economy/src/civicSolvency.test.ts`, which is where they can be imported.
    expect(occupiedLandCells(eraLandDemand("prehistoric"))).toBe(ERA_ONE_OCCUPIED_CELLS);
    expect(buildableCellCount(eraBuildableRadius("prehistoric"))).toBe(
      ERA_ONE_BUILDABLE_CELLS,
    );
    expect(ERA_ONE_OCCUPIED_CELLS).toBe(47);
    expect(ERA_ONE_BUILDABLE_CELLS).toBe(88);
    expect(eraLandDemand("prehistoric")).toEqual({
      era: "prehistoric",
      cumulative_skill_cells: 17,
      cumulative_civic_cells: 24,
      hall_cells: 6,
    });
  });
});

describe("era accessors", () => {
  it("reads node sets by era id and fails loud on an unknown one", () => {
    expect(getEraNodes("prehistoric")).toEqual([
      "NUM.S",
      "NUM.F",
      "NUM.2",
      "NUM.3",
      "NUM.4",
      "NUM.5",
    ]);
    expect(getEraOfNode("POL.5")?.id).toBe("industrial");
    expect(getEraOfNode("CG.1")?.id).toBe("renaissance");
    expect(() => getEraOrThrow("atlantean" as EraId)).toThrow(/Unknown era/);
    expect(() => eraNumber("atlantean" as EraId)).toThrow(/Unknown era/);
  });
});
