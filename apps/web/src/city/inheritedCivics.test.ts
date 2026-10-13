import { civicCatalogueForEra, civicFootprintCells } from "@cr/economy";
import { ERA_SEQUENCE, type EraId, eraLandDemand } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { eraPlacementFromSeed, seedPlacingAtEra } from "../catchup/eraPlacement";
import { civicOptionsForEra, hasCivicModel } from "./civicBuildings";
import {
  eraCapacityTarget,
  eraCivicLoadout,
  eraCivicPlacementIds,
  eraClosingCity,
  inheritedCivicEras,
  inheritedCivicLoadout,
  inheritedCivicPlacementIds,
  loadoutCapacity,
} from "./inheritedCivics";

/**
 * **WHAT A CAUGHT-UP LEARNER INHERITS: the derivation, held to the game's own arithmetic.**
 *
 * This file is about the SET: which buildings, how many, and whether that is what a learner who
 * played to the same era would be standing in. The other two halves are
 * `catchup/civicSeats.test.ts` (WHERE they stand, per age) and
 * `catchup/inheritedCivicsSeatedAtTheFounding.test.tsx` (WHEN they arrive, driven through the
 * shipped surface).
 */

/** The ages one placement hands over, through the real reader. */
function handedBy(placedEra: EraId): readonly EraId[] {
  return eraPlacementFromSeed(seedPlacingAtEra(placedEra)).skipped;
}

/** Every age a learner can be caught up TO, derived through the real reader. */
const CAUGHT_UP_ERAS: readonly EraId[] = ERA_SEQUENCE.map((era) => era.id).filter(
  (id) => handedBy(id).length > 0,
);

describe("the reference is the game's own closing city, not a count somebody chose", () => {
  it("reproduces ERA_LAND_DEMAND's civic column exactly, for all ten eras", () => {
    /*
      THE CROSS-CHECK THAT MAKES "this is what a played-through player has" A MEASUREMENT.

      `ERA_LAND_DEMAND.cumulative_civic_cells` is authored in `packages/skill-graph` and
      described there as *"every civic building the cheapest closing city buys from era one to
      this era"*. It was derived by another lane, in another package, by its own exhaustive
      search (`packages/economy/src/civicSolvency.test.ts`), and skill-graph cannot import the
      catalogue that would let it check itself.

      So this is two independent searches over one catalogue agreeing on ten numbers. If
      `eraClosingCity` picked a different city — a greedy one, a one-of-each one, or the wrong
      side of era two's tie — the cumulative cells would diverge at the era where it differed.
    */
    let cumulative = 0;
    for (const era of ERA_SEQUENCE) {
      cumulative += eraClosingCity(era.id).reduce(
        (cells, row) => cells + civicFootprintCells(row),
        0,
      );
      expect(
        cumulative,
        `${era.id}: the closing city takes ${cumulative} cumulative cells against ` +
          `ERA_LAND_DEMAND's authored ${eraLandDemand(era.id).cumulative_civic_cells}`,
      ).toBe(eraLandDemand(era.id).cumulative_civic_cells);
    }
    // FLOOR: the loop ran over all ten rather than over an empty sequence.
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    expect(cumulative).toBeGreaterThan(0);
  });

  it("reaches every era's capacity target on both axes, which is the bar a played city clears", () => {
    // The bar rather than one city's figures, because "the" played-through city is not
    // unique — see the era-two tie below. Every solvent closing city clears this.
    for (const era of ERA_SEQUENCE) {
      const target = eraCapacityTarget(era.id);
      const provided = loadoutCapacity(eraClosingCity(era.id));
      expect(provided.livability, `${era.id} livability`).toBeGreaterThanOrEqual(
        target.livability,
      );
      expect(provided.happiness, `${era.id} happiness`).toBeGreaterThanOrEqual(
        target.happiness,
      );
      expect(target.livability, `${era.id} target is not zero`).toBeGreaterThan(0);
    }
  });

  it("is CHEAPEST: no whole-building plan reaching the same target costs less", () => {
    // Without this, "closing city" could be any plan that clears the target — including one
    // ten times too big, which would clear it and read as green.
    for (const era of ERA_SEQUENCE) {
      const rows = civicCatalogueForEra(era.id);
      const target = eraCapacityTarget(era.id);
      const chosenCost = eraClosingCity(era.id).reduce((sum, row) => sum + row.cost, 0);
      let best = Number.POSITIVE_INFINITY;
      const walk = (index: number, liv: number, hap: number, cost: number): void => {
        if (cost >= best) return;
        if (liv >= target.livability && hap >= target.happiness) {
          best = cost;
          return;
        }
        const row = rows[index];
        if (row === undefined) return;
        const ceiling = Math.max(
          row.provides.livability > 0
            ? Math.ceil(target.livability / row.provides.livability)
            : 0,
          row.provides.happiness > 0
            ? Math.ceil(target.happiness / row.provides.happiness)
            : 0,
        );
        for (let n = 0; n <= ceiling; n += 1) {
          walk(
            index + 1,
            liv + n * row.provides.livability,
            hap + n * row.provides.happiness,
            cost + n * row.cost,
          );
        }
      };
      walk(0, 0, 0, 0);
      expect(chosenCost, `${era.id} closing city is not the cheapest plan`).toBe(best);
    }
  });

  it("is NOT one of each, which is the shape the first version of this had", () => {
    // The lead's original wording was "one copy of each of the civic buildings"; his stated
    // INTENT was the livability and happiness a played-through player would have. Measured,
    // those are different cities — era one buys four Family Lodges and two Campfires, and
    // touches neither the Smokehouse nor the Spring. Pinned so a later simplification back to
    // one-of-each fails rather than quietly undershooting the target.
    const eraOne = ERA_SEQUENCE[0]?.id as EraId;
    const city = eraClosingCity(eraOne);
    expect(city.length).toBeGreaterThan(civicCatalogueForEra(eraOne).length);
    expect(new Set(city.map((row) => row.id)).size).toBeLessThan(city.length);
    // And one of each really would undershoot, rather than merely differ.
    const oneOfEach = loadoutCapacity(civicCatalogueForEra(eraOne));
    const target = eraCapacityTarget(eraOne);
    expect(
      oneOfEach.livability < target.livability || oneOfEach.happiness < target.happiness,
      `one of each provides ${JSON.stringify(oneOfEach)} against a target of ${JSON.stringify(target)}`,
    ).toBe(true);
  });

  it("takes D-ERA25's side of era two's tie, which is a decision and not iteration order", () => {
    // The measured reason "match a played-through city exactly" is not a well-posed bar.
    // Two cheapest cities, same cost, different livability — so there is no single number
    // "the" played-through learner has, and the guard above asserts the TARGET instead.
    const eraTwo = ERA_SEQUENCE[1]?.id as EraId;
    const rows = civicCatalogueForEra(eraTwo);
    const target = eraCapacityTarget(eraTwo);
    const chosenCost = eraClosingCity(eraTwo).reduce((sum, row) => sum + row.cost, 0);
    const ties: { cells: number; livability: number }[] = [];
    const counts = new Array<number>(rows.length).fill(0);
    const walk = (index: number, liv: number, hap: number, cost: number): void => {
      if (cost > chosenCost) return;
      if (liv >= target.livability && hap >= target.happiness) {
        if (cost === chosenCost) {
          ties.push({
            cells: counts.reduce(
              (sum, n, i) => sum + n * civicFootprintCells(rows[i] as never),
              0,
            ),
            livability: liv,
          });
        }
        return;
      }
      const row = rows[index];
      if (row === undefined) return;
      const ceiling = Math.max(
        row.provides.livability > 0
          ? Math.ceil(target.livability / row.provides.livability)
          : 0,
        row.provides.happiness > 0
          ? Math.ceil(target.happiness / row.provides.happiness)
          : 0,
      );
      for (let n = 0; n <= ceiling; n += 1) {
        counts[index] = n;
        walk(
          index + 1,
          liv + n * row.provides.livability,
          hap + n * row.provides.happiness,
          cost + n * row.cost,
        );
      }
      counts[index] = 0;
    };
    walk(0, 0, 0, 0);
    // THE TIE IS REAL — a floor, so this test cannot pass by finding nothing to break.
    expect(
      ties.length,
      "era two no longer ties, so this guard is measuring nothing",
    ).toBeGreaterThanOrEqual(2);
    expect(new Set(ties.map((tie) => tie.livability)).size).toBeGreaterThanOrEqual(2);
    // …and the one taken is the LARGEST-footprint of them, which is the land budget's own.
    const chosenCells = eraClosingCity(eraTwo).reduce(
      (cells, row) => cells + civicFootprintCells(row),
      0,
    );
    expect(chosenCells).toBe(Math.max(...ties.map((tie) => tie.cells)));
  });
});

describe("which ages are inherited is derived, and the exclusions are provable", () => {
  it("names an inherited age exactly when it was handed over AND its whole catalogue has art", () => {
    /*
      A CENSUS IN BOTH DIRECTIONS, against a SEPARATE derivation.

      The population here is every era, and the claim is a membership rule. It is checked
      against the raw catalogue plus the art registry (`hasCivicModel` per row) rather than
      against `civicOptionsForEra`, which is what the module itself reads — otherwise the
      assertion would be the implementation restated.

      Both directions matter, and the one that will fire first is the second: the day Evan's
      era-five art lands, era five joins on its own and this test says so rather than a
      learner quietly not inheriting it.
    */
    const handedEras = handedBy(ERA_SEQUENCE[ERA_SEQUENCE.length - 1]?.id as EraId);
    const handed = new Set(handedEras);
    const inherited = new Set(inheritedCivicEras(handedEras));

    let modelled = 0;
    let unmodelled = 0;
    for (const era of ERA_SEQUENCE) {
      const rows = civicCatalogueForEra(era.id);
      const wholeEraHasArt =
        rows.length === 4 &&
        rows.every((row) =>
          hasCivicModel(row.era === "prehistoric" ? modelKeyFor(row.id) : row.id),
        );
      const expected = handed.has(era.id) && wholeEraHasArt;
      expect(
        inherited.has(era.id),
        `${era.id}: handed=${handed.has(era.id)} art=${wholeEraHasArt} but ` +
          `inherited=${inherited.has(era.id)}`,
      ).toBe(expected);
      if (wholeEraHasArt) {
        modelled += 1;
      } else {
        unmodelled += 1;
        // AN EXCLUSION MUST BE EXCLUDED FOR ITS STATED REASON. An era left out for any other
        // cause — a filter that quietly stopped matching — fails here rather than silently
        // shrinking what a learner inherits.
        expect(
          civicOptionsForEra(era.id).length,
          `${era.id} is excluded, so it must be excluded because it has no complete art`,
        ).toBe(0);
      }
    }
    // FLOORS on both halves of the census, so neither can be satisfied by an empty tree:
    // there is really art to include and really an era to exclude.
    expect(
      modelled,
      "no era has complete civic art, so this guard proves nothing",
    ).toBeGreaterThanOrEqual(4);
    expect(
      unmodelled,
      "every era has art, so the exclusion limb is inert",
    ).toBeGreaterThanOrEqual(1);
  });

  it("inherits only ages at or below the placement, never every age that exists", () => {
    // The lead's open question, answered: a learner handed two ages inherits two ages'
    // civics, not the four that happen to have art. Driven at a placement whose handed set is
    // strictly smaller than the model-backed set, so the two readings genuinely differ.
    const handed = handedBy(ERA_SEQUENCE[2]?.id as EraId);
    const inherited = inheritedCivicEras(handed);
    expect(inherited).toEqual(handed);
    expect(inherited.length).toBe(2);
    expect(inherited).not.toContain(ERA_SEQUENCE[3]?.id);
  });

  it("hands nothing to a learner who starts at era one", () => {
    const handed = handedBy(ERA_SEQUENCE[0]?.id as EraId);
    expect(handed).toEqual([]);
    expect(inheritedCivicEras(handed)).toEqual([]);
    expect(inheritedCivicLoadout(handed)).toEqual([]);
    expect(inheritedCivicPlacementIds(handed)).toEqual([]);
  });

  it("owes each age its own closing city, so the walk can seed one age at a time", () => {
    /*
      THE PER-AGE ENTRY POINT AGREES WITH THE WHOLE-WALK ONE, which is what makes seeding age by
      age the same city as seeding all of it at once. The old shape computed the concatenation in
      one go; the shipped shape asks per founded age, so the two readings have to be one set.
    */
    for (const placedEra of CAUGHT_UP_ERAS) {
      const handed = handedBy(placedEra);
      expect(
        handed.flatMap((eraId) => [...eraCivicLoadout(eraId)]),
        `${placedEra}: the per-age loadouts do not add up to the walk's`,
      ).toEqual([...inheritedCivicLoadout(handed)]);
    }
    // FLOOR, and the composition: the sum really is over more than one age at a deep placement,
    // so the equality is not one age agreeing with itself.
    expect(handedBy("medieval").length).toBe(4);
    expect(inheritedCivicLoadout(handedBy("medieval")).length).toBe(24);
  });

  it("mints one distinct placement id per building, over every caught-up age", () => {
    expect(CAUGHT_UP_ERAS.length).toBeGreaterThanOrEqual(8);
    for (const placedEra of CAUGHT_UP_ERAS) {
      const handed = handedBy(placedEra);
      const ids = inheritedCivicPlacementIds(handed);
      const loadout = inheritedCivicLoadout(handed);
      expect(ids.length, `${placedEra} id count`).toBe(loadout.length);
      expect(new Set(ids).size, `${placedEra} has duplicate placement ids`).toBe(
        ids.length,
      );
      expect(loadout.length, `${placedEra} inherits nothing`).toBeGreaterThanOrEqual(6);
      // And the per-age mint covers the same buildings, offset by where the session's own
      // counter had reached — `catchup/civicSeats.test.ts` drives the collision this prevents.
      expect(handed.flatMap((eraId) => [...eraCivicPlacementIds(eraId)]).length).toBe(
        ids.length,
      );
    }
  });
});

/** Era one's four GLBs predate the catalogue ids; `civicIdentity.ts` owns the bridge. */
function modelKeyFor(catalogueId: string): string {
  const legacy: Record<string, string> = {
    prehistoric_smokehouse: "smokehouse",
    prehistoric_longhouse: "longhouse",
    prehistoric_campfire: "campfire",
    prehistoric_storage_pit: "water_spring",
  };
  return legacy[catalogueId] ?? catalogueId;
}
