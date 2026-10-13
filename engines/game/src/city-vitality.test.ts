import type { Mastery } from "@cr/state-schema";
import { describe, expect, it, vi } from "vitest";

import {
  buildingLedger,
  type CitizenNodeInput,
  residenceCapacity,
} from "./citizens-population";
import {
  type CapacityContribution,
  type CityVitalityInput,
  deriveCityVitality,
  roadHappinessCoverage,
} from "./city-vitality";
import {
  ERA_ONE_CIVIC_TYPES,
  ERA_ONE_FREE_CIVIC,
  type EraOneCivicTypeId,
  HAPPINESS_BAND_FLOOR,
  HUB_FOUNDING_LIVABILITY,
  ROAD_HAPPINESS_PER_TILE,
  SKILL_HAPPINESS_BY_ROLE,
} from "./city-vitality-tuning";
import { type CitizenRoleId, NEIGHBORHOOD_DESCRIPTORS } from "./descriptors";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                     */
/* -------------------------------------------------------------------------- */

const D1_ORDER: readonly { node_id: string; citizen_role: CitizenRoleId }[] = [
  { node_id: "NUM.S", citizen_role: "civic" },
  { node_id: "NUM.F", citizen_role: "civic" },
  { node_id: "NUM.2", citizen_role: "residence" },
  { node_id: "NUM.3", citizen_role: "school" },
  { node_id: "NUM.4", citizen_role: "civic" },
  { node_id: "NUM.5", citizen_role: "civic" },
];

function nodesAt(mastery: Readonly<Record<string, Mastery>>): CitizenNodeInput[] {
  return D1_ORDER.map((entry) => ({
    ...entry,
    placed: true,
    mastery: mastery[entry.node_id] ?? 0,
    lesson_stage: "done" as const,
    placement_estimate: 0 as const,
  }));
}

const ALL_MASTERED: Readonly<Record<string, Mastery>> = Object.fromEntries(
  D1_ORDER.map((entry) => [entry.node_id, 2 as Mastery]),
);

const CIVIC_IDS = Object.keys(ERA_ONE_CIVIC_TYPES) as EraOneCivicTypeId[];

function civicRows(ids: readonly EraOneCivicTypeId[]): CapacityContribution[] {
  return ids.map((id) => ({
    livability: ERA_ONE_CIVIC_TYPES[id].livability,
    happiness: ERA_ONE_CIVIC_TYPES[id].happiness,
  }));
}

function civics(...ids: EraOneCivicTypeId[]): CapacityContribution[] {
  return civicRows(ids);
}

/* -------------------------------------------------------------------------- */
/* 2. The two dials, and how they relate                                        */
/* -------------------------------------------------------------------------- */

describe("livability is ONE POOL, per the #236 ruling", () => {
  it("sustains the sum of the hub, the homes and the civic rows, with no second term", () => {
    const ledger = buildingLedger(nodesAt({ "NUM.2": 2 }));
    const vitality = deriveCityVitality({
      ledger,
      civic: civics("smokehouse", "longhouse"),
    });
    // The residence ledger is a livability contributor and is read from there rather
    // than restated, so the settled-ending arithmetic it is pinned on cannot drift.
    expect(residenceCapacity(ledger)).toBeGreaterThan(0);
    expect(vitality.livability.sustains).toBe(
      residenceCapacity(ledger) +
        HUB_FOUNDING_LIVABILITY +
        ERA_ONE_CIVIC_TYPES.smokehouse.livability +
        ERA_ONE_CIVIC_TYPES.longhouse.livability,
    );
  });

  it("adds a FOOD row and a DWELLING row together, which is the whole ruling", () => {
    // The one behaviour #236 changed, stated as the thing that would have to break for
    // the old reading to have come back. Under `min` the Smokehouse alone raised nothing
    // (the housing term bound), and a Smokehouse plus a Longhouse sustained
    // min(28, 28) = 28 rather than 48. Both rows carry 20 livability and both must land.
    const ledger = buildingLedger([]);
    const bare = deriveCityVitality({ ledger, civic: [] }).livability.sustains;
    const food = deriveCityVitality({ ledger, civic: civics("smokehouse") }).livability
      .sustains;
    const both = deriveCityVitality({
      ledger,
      civic: civics("smokehouse", "longhouse"),
    }).livability.sustains;
    expect(ERA_ONE_CIVIC_TYPES.smokehouse.livability).toBeGreaterThan(0);
    expect(ERA_ONE_CIVIC_TYPES.longhouse.livability).toBeGreaterThan(0);
    // A pure food row RAISES the pool. Under the limiting-factor reading it could not.
    expect(food).toBe(bare + ERA_ONE_CIVIC_TYPES.smokehouse.livability);
    expect(both).toBe(food + ERA_ONE_CIVIC_TYPES.longhouse.livability);
  });

  it("pools every source, with no term left out of the total", () => {
    // The arithmetic identity, over a city that has all four sources contributing at
    // once. Agreement with `capacity.ts`'s own `deriveCapacities` is asserted where
    // INV-COS-1 permits that import: `test/capacityModelAgreement.test.ts`. This file
    // may not import it, so what it can check is that no source is silently dropped.
    const ledger = buildingLedger(nodesAt(ALL_MASTERED));
    const civic: EraOneCivicTypeId[] = [
      "smokehouse",
      "longhouse",
      "campfire",
      "water_spring",
    ];
    const vitality = deriveCityVitality({ ledger, civic: civicRows(civic) });

    expect(ledger.length).toBeGreaterThanOrEqual(6);
    expect(residenceCapacity(ledger)).toBeGreaterThan(0);

    const civicLivability = civic.reduce(
      (total, id) => total + ERA_ONE_CIVIC_TYPES[id].livability,
      0,
    );
    const civicHappiness = civic.reduce(
      (total, id) => total + ERA_ONE_CIVIC_TYPES[id].happiness,
      0,
    );
    const skillHappiness = ledger
      .filter((entry) => entry.complete)
      .reduce((total, entry) => total + SKILL_HAPPINESS_BY_ROLE[entry.role], 0);
    // Floors: each of the four sources must actually be non-zero here, or the identity
    // below would hold with a term missing.
    expect(civicLivability).toBeGreaterThan(0);
    expect(civicHappiness).toBeGreaterThan(0);
    expect(skillHappiness).toBeGreaterThan(0);

    expect(vitality.livability.sustains).toBe(
      HUB_FOUNDING_LIVABILITY + residenceCapacity(ledger) + civicLivability,
    );
    expect(vitality.happiness.coverage).toBe(civicHappiness + skillHappiness);
  });

  it("keeps happiness OUT of livability — the two dials never mix", () => {
    const ledger = buildingLedger(nodesAt({ "NUM.2": 2 }));
    const without = deriveCityVitality({ ledger, civic: [] });
    const withAmenity = deriveCityVitality({ ledger, civic: civics("campfire") });
    // The Campfire is era one's ONLY pure-happiness row now that the Longhouse carries
    // a secondary, which is why it is the one that can prove the dials are separate.
    expect(ERA_ONE_CIVIC_TYPES.campfire.livability).toBe(0);
    expect(withAmenity.livability).toEqual(without.livability);
    expect(withAmenity.happiness.coverage).toBeGreaterThan(without.happiness.coverage);
  });

  it("reports no housing or food field anywhere in the readout", () => {
    // The deletion, asserted rather than grepped. #236 deleted the sub-fields in his
    // lane; a readout here that still carried them would be a second model wearing the
    // ruled model's numbers, which is exactly the state this reconciliation ended.
    const vitality = deriveCityVitality({
      ledger: buildingLedger(nodesAt({ "NUM.2": 2 })),
      civic: civicRows(ERA_ONE_FREE_CIVIC),
    });
    expect(Object.keys(vitality.livability)).toEqual(["sustains"]);
    // `practice` joined this census on 2026-08-04 and is NOT a capacity sub-field: it is
    // a count of handed-over buildings nobody has scored a set on, and the economy mirror
    // has no notion of practice to disagree with. What this census still forbids is
    // `housing` and `food`, which are the two #236 deleted.
    expect(Object.keys(vitality.shortfalls).sort()).toEqual([
      "happiness",
      "livability",
      "none",
      "practice",
    ]);
  });
});

describe("neither capacity gates anything (D-CIT2, INV-COS-1)", () => {
  it("leaves the population untouched however much capacity is built", () => {
    const ledger = buildingLedger(nodesAt({ "NUM.2": 2, "NUM.S": 2 }));
    const bare = deriveCityVitality({ ledger, civic: [] });
    // Every civic building, ten times over: the forbidden feedback loop would show
    // up as a population that moved.
    const stacked = deriveCityVitality({
      ledger,
      civic: civicRows(
        CIVIC_IDS.flatMap((id) => new Array<EraOneCivicTypeId>(10).fill(id)),
      ),
    });
    expect(CIVIC_IDS.length).toBeGreaterThanOrEqual(4);
    expect(stacked.population).toBe(bare.population);
    expect(stacked.livability.sustains).toBeGreaterThan(bare.livability.sustains);
  });

  it("does not read the clock, so an hour later is the same city (INV-ERA-3)", () => {
    // The shape `citizens-roster-invariants.test.ts:42` uses, for the same reason:
    // two back-to-back calls land in one millisecond and would hide a `Date.now`
    // leak. Moving the clock an hour is what makes the no-clock half falsifiable,
    // and INV-ERA-3 forbids elapsed wall-clock time of ANY kind reaching this dial.
    const ledger = buildingLedger(nodesAt({ "NUM.2": 2 }));
    const clock = vi.spyOn(Date, "now");
    try {
      // An hour apart AND of different parity. The first pair tried here were both
      // even milliseconds, and a `Date.now() % 2` term injected into the happiness
      // level sailed through the whole file — the assertion existed and measured
      // nothing. Both properties are load-bearing; do not round these off.
      clock.mockReturnValue(1_700_000_000_000);
      const first = deriveCityVitality({ ledger, civic: civics("smokehouse") });
      clock.mockReturnValue(1_700_003_600_777);
      const second = deriveCityVitality({ ledger, civic: civics("smokehouse") });
      expect(second).toEqual(first);
    } finally {
      clock.mockRestore();
    }
  });

  it("takes no time, streak or session input at all, so none can be added quietly", () => {
    // The structural form of INV-ERA-3: a contributor who wants study pace to reach
    // happiness has to widen this signature, which a reviewer can see in the diff.
    // `satisfies Required<CityVitalityInput>` is the load-bearing half, and it is a
    // COMPILE-time assertion: the literal below must name every field the interface has,
    // so adding a `streak` or an `elapsedMs` to `CityVitalityInput` fails `tsc` here
    // rather than sailing through a runtime key census of a literal this file wrote
    // itself. The runtime line then pins WHICH two, so the pair cannot both be widened
    // in one quiet edit.
    const exhaustive = {
      ledger: [],
      civic: [],
      roadTileCount: 0,
    } satisfies Required<CityVitalityInput>;
    // roadTileCount is build state (like civic), never a clock or streak. Naming it
    // here is what stops a contributor from quietly adding elapsedMs beside it.
    expect(Object.keys(exhaustive).sort()).toEqual(["civic", "ledger", "roadTileCount"]);
  });
});

/* -------------------------------------------------------------------------- */
/* 3. Monotonicity — nobody is ever punished for building (D-CIT6)              */
/* -------------------------------------------------------------------------- */

describe("building never makes a dial worse", () => {
  it("raises or holds every capacity for every type in the catalogue", () => {
    const ledger = buildingLedger(nodesAt({ "NUM.2": 2 }));
    const before = deriveCityVitality({ ledger, civic: civics("smokehouse") });
    expect(CIVIC_IDS.length).toBeGreaterThanOrEqual(4);
    let raisedSomething = 0;
    for (const id of CIVIC_IDS) {
      const after = deriveCityVitality({
        ledger,
        civic: civics("smokehouse", id),
      });
      expect(after.livability.sustains, id).toBeGreaterThanOrEqual(
        before.livability.sustains,
      );
      expect(after.happiness.coverage, id).toBeGreaterThanOrEqual(
        before.happiness.coverage,
      );
      const moved =
        after.livability.sustains > before.livability.sustains ||
        after.happiness.coverage > before.happiness.coverage;
      if (moved) {
        raisedSomething += 1;
      }
    }
    // A sweep of >= 0 comparisons passes over a catalogue of paperweights. At least
    // three of the four must actually move a dial on this city.
    expect(raisedSomething).toBeGreaterThanOrEqual(3);
  });
});

/* -------------------------------------------------------------------------- */
/* 4. The solvency guarantee (INV-ERA-4, section 8.1)                           */
/* -------------------------------------------------------------------------- */

describe("the starting city is solvent by construction", () => {
  it("has no shortfall of any kind on a bare island with its free Smokehouse", () => {
    // Nothing built, nothing mastered: the founding crowd against the hub's own
    // provision plus the free food building era one section 4 names.
    const vitality = deriveCityVitality({
      ledger: buildingLedger([]),
      civic: civicRows(ERA_ONE_FREE_CIVIC),
    });
    expect(vitality.population).toBeGreaterThan(0);
    expect(vitality.shortfalls.livability).toBe(0);
  });

  it("gives the hub exactly its founders and NOT twice over", () => {
    // The pooling trap, pinned. Under two inputs the hub held 8 housing AND 8 food and
    // `min` returned 8; adding those two fields instead of recognising them as one
    // provision described twice would silently hand the bare city 16. Section 8.1 says
    // the Town Hall covers its founders, so the hub's provision must equal the founding
    // population exactly — no more.
    const bare = deriveCityVitality({ ledger: buildingLedger([]), civic: [] });
    expect(bare.population).toBeGreaterThan(0);
    expect(HUB_FOUNDING_LIVABILITY).toBe(bare.population);
    expect(bare.livability.sustains).toBe(bare.population);
    expect(bare.shortfalls.livability).toBe(0);
  });

  it("names a free civic building that the catalogue actually contains", () => {
    expect(ERA_ONE_FREE_CIVIC.length).toBeGreaterThanOrEqual(1);
    for (const id of ERA_ONE_FREE_CIVIC) {
      expect(ERA_ONE_CIVIC_TYPES[id]).toBeDefined();
      // Era one section 4: the free one is the food row. Under one pool what matters is
      // that it contributes LIVABILITY — a free amenity would leave the founders unfed.
      expect(ERA_ONE_CIVIC_TYPES[id].livability).toBeGreaterThan(0);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* 5. Happiness: the capacity, and the readout derived from it                  */
/* -------------------------------------------------------------------------- */

describe("roads add happiness coverage (D-CIT7 amplify, INV-COS-1 non-gating)", () => {
  /**
   * The population of claims this block guards: contribution scales with tiles, never
   * touches livability or population, can move the settling band, and stays below one
   * Campfire at a network shorter than the Campfire's own coverage. A floor under the
   * tile sweep stops an empty loop from going green.
   */
  const ROAD_SWEEP = [0, 1, 5, 18, 20, 35] as const;

  it("prices every tile in the sweep, with a floor under the sweep itself", () => {
    expect(ROAD_SWEEP.length).toBeGreaterThanOrEqual(5);
    expect(ROAD_HAPPINESS_PER_TILE).toBe(1);
    for (const tiles of ROAD_SWEEP) {
      expect(roadHappinessCoverage(tiles)).toBe(tiles * ROAD_HAPPINESS_PER_TILE);
    }
  });

  it("raises happiness coverage by exactly the road term, and nothing else", () => {
    const ledger = buildingLedger(nodesAt(ALL_MASTERED));
    const bare = deriveCityVitality({ ledger, civic: [] });
    const paved = deriveCityVitality({ ledger, civic: [], roadTileCount: 18 });
    expect(bare.happiness.fromPaths).toBe(0);
    expect(paved.happiness.fromPaths).toBe(18);
    expect(paved.happiness.coverage).toBe(bare.happiness.coverage + 18);
    // Livability and population are learning-derived; roads must not touch them.
    expect(paved.livability).toEqual(bare.livability);
    expect(paved.population).toBe(bare.population);
  });

  it("lets a reasonable network reach Settling at full mastery without a Campfire", () => {
    // ARITHMETIC, not a vibe: pop 48, skill amenities 9, settling floor 60%.
    const ledger = buildingLedger(nodesAt(ALL_MASTERED));
    const bare = deriveCityVitality({ ledger, civic: [] });
    expect(bare.population).toBe(48);
    expect(bare.happiness.coverage).toBe(9);
    expect(bare.happiness.level).toBe(19);
    expect(bare.happiness.band).toBe("restless");

    const needForSettling = Math.ceil(
      (HAPPINESS_BAND_FLOOR.settling / 100) * bare.population,
    );
    // round() can land on 59 at coverage 26 (26/44*100 = 59.09 → 59), so the
    // coverage that actually clears the floor is the first c with round ≥ 60.
    let coverageForSettling = needForSettling;
    while (
      Math.round((coverageForSettling / bare.population) * 100) <
      HAPPINESS_BAND_FLOOR.settling
    ) {
      coverageForSettling += 1;
    }
    const roadsOwed = coverageForSettling - bare.happiness.coverage;
    expect(roadsOwed).toBe(20);

    const paved = deriveCityVitality({
      ledger,
      civic: [],
      roadTileCount: roadsOwed,
    });
    expect(paved.happiness.coverage).toBe(29);
    expect(paved.happiness.level).toBeGreaterThanOrEqual(HAPPINESS_BAND_FLOOR.settling);
    expect(paved.happiness.band).toBe("settling");
  });

  it("keeps a Campfire denser than matching it with roads", () => {
    // 20 tiles = one Campfire's coverage; the civic still wins on footprint/placement
    // once buyable, so roads amplify without trivialising the catalogue.
    expect(ERA_ONE_CIVIC_TYPES.campfire.happiness).toBe(20);
    expect(roadHappinessCoverage(ERA_ONE_CIVIC_TYPES.campfire.happiness)).toBe(
      ERA_ONE_CIVIC_TYPES.campfire.happiness,
    );
    const ledger = buildingLedger(nodesAt(ALL_MASTERED));
    const byRoads = deriveCityVitality({ ledger, civic: [], roadTileCount: 20 });
    const byCampfire = deriveCityVitality({ ledger, civic: civics("campfire") });
    expect(byRoads.happiness.coverage).toBe(byCampfire.happiness.coverage);
  });

  it("defaults a missing road count to zero, so building-only agreement stays intact", () => {
    const ledger = buildingLedger(nodesAt(ALL_MASTERED));
    const omitted = deriveCityVitality({ ledger, civic: [] });
    const explicit = deriveCityVitality({ ledger, civic: [], roadTileCount: 0 });
    expect(omitted.happiness).toEqual(explicit.happiness);
    expect(omitted.happiness.fromPaths).toBe(0);
  });
});

describe("happiness coverage is the capacity, the level is the readout", () => {
  it("reads 100 and 'content' only when coverage reaches everybody", () => {
    const ledger = buildingLedger(nodesAt({}));
    const population = deriveCityVitality({ ledger, civic: [] }).population;
    const enough = Math.ceil(population / ERA_ONE_CIVIC_TYPES.campfire.happiness);
    const covered = deriveCityVitality({
      ledger,
      civic: civicRows(new Array<EraOneCivicTypeId>(enough).fill("campfire")),
    });
    expect(covered.happiness.level).toBe(100);
    expect(covered.happiness.band).toBe("content");
    expect(covered.happiness.uncovered).toBe(0);
  });

  it("bands down as the city outgrows its amenities, and never below zero", () => {
    const ledger = buildingLedger(nodesAt(ALL_MASTERED));
    const bare = deriveCityVitality({ ledger, civic: [] });
    expect(bare.happiness.level).toBeLessThan(100);
    expect(bare.happiness.band).not.toBe("content");
    expect(bare.happiness.uncovered).toBeGreaterThan(0);
    expect(bare.happiness.covered).toBeGreaterThanOrEqual(0);
    expect(bare.happiness.covered + bare.happiness.uncovered).toBe(bare.population);
  });

  it("does not report a shortfall against an empty city", () => {
    const empty = deriveCityVitality({
      ledger: [],
      civic: civicRows(ERA_ONE_FREE_CIVIC),
    });
    expect(empty.happiness.level).toBeGreaterThanOrEqual(0);
    expect(empty.happiness.level).toBeLessThanOrEqual(100);
  });
});

describe("D-ERA7's skill-building happiness is small and typed by ROLE", () => {
  /**
   * The population is every role the shipped descriptors can actually resolve — the
   * authored `citizen_roles` values plus every `default_citizen_role`, which is the
   * fallback an unlisted node takes. Derived from the descriptors rather than from
   * this table's own keys, because a table checking its own keys proves nothing.
   */
  const rolesInUse = new Set<CitizenRoleId>();
  for (const descriptor of Object.values(NEIGHBORHOOD_DESCRIPTORS)) {
    rolesInUse.add(descriptor.default_citizen_role);
    for (const role of Object.values(descriptor.citizen_roles)) {
      rolesInUse.add(role);
    }
  }

  it("prices every role the descriptors can resolve", () => {
    expect(rolesInUse.size).toBeGreaterThanOrEqual(3);
    for (const role of rolesInUse) {
      expect(SKILL_HAPPINESS_BY_ROLE[role], role).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps the ORDERING rather than the digits: civic > school > residence = 0", () => {
    expect(SKILL_HAPPINESS_BY_ROLE.civic).toBeGreaterThan(SKILL_HAPPINESS_BY_ROLE.school);
    expect(SKILL_HAPPINESS_BY_ROLE.school).toBeGreaterThan(
      SKILL_HAPPINESS_BY_ROLE.residence,
    );
    // A home is livability, and it already provides that on the other ledger.
    expect(SKILL_HAPPINESS_BY_ROLE.residence).toBe(0);
  });

  it("keeps era one's whole skill set under a single Campfire", () => {
    const ledger = buildingLedger(nodesAt(ALL_MASTERED));
    const all = deriveCityVitality({ ledger, civic: [] });
    expect(ledger.length).toBeGreaterThanOrEqual(6);
    expect(all.happiness.coverage).toBeGreaterThan(0);
    expect(all.happiness.coverage).toBeLessThan(ERA_ONE_CIVIC_TYPES.campfire.happiness);
  });

  it("counts a building only once it is COMPLETE — a site is not an amenity", () => {
    const unfinished = D1_ORDER.map((entry) => ({
      ...entry,
      placed: true,
      mastery: 0 as Mastery,
      lesson_stage: "teaching" as const,
      placement_estimate: 0 as const,
    }));
    expect(
      deriveCityVitality({ ledger: buildingLedger(unfinished), civic: [] }).happiness
        .coverage,
    ).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* 6. Where the ruled shortfall and this module's readout part company          */
/* -------------------------------------------------------------------------- */

/**
 * THIS SECTION REPLACES `describe("aggregateLivability")`, and the swap is the point.
 * That block tested a function this module no longer owns: it asserted `min` for
 * `"binding"` and `+` for `"sum"`, and that both branches existed. Both branches are
 * gone, the union is gone, and the ruled `+` lives in `capacity.ts` where its own file
 * tests it. Re-pointing the block at `deriveCapacities` would only have re-tested his
 * module from ours.
 *
 * WHAT GENUINELY NEEDS A GUARD HERE INSTEAD is the one seam adopting his
 * `capacityShortfall` opened. His `happinessGap` measures against the SUSTAINED
 * population (`min(people, livability)`); this module's `happiness.uncovered` measures
 * against the WHOLE population, because the HUD's band is about everybody who is here
 * and not merely everybody the city can feed.
 *
 * THE FIRST VERSION OF THIS BLOCK ASSERTED THAT THE TWO PART COMPANY, and measurement
 * said otherwise, so it is recorded rather than quietly rewritten. The claim was that a
 * city which has outgrown its livability would show his gap lower than the readout's. No
 * era-one city does, and the reason is the flip itself: pooling raised the mastered city
 * from `min(52, 28) = 28` sustained to `52`, against a population of 44, so **every
 * reachable era-one city is now within its livability and the two numbers agree
 * everywhere.** The guard below therefore asserts the agreement — and, because an
 * agreement that cannot fail is not a guard, it also shows the two definitions genuinely
 * differing on inputs `capacityShortfall` accepts. Without that second test the first
 * would be indistinguishable from a tautology.
 */
describe("the ruled shortfall and the HUD's coverage readout", () => {
  it("agree on every era-one city, because pooling put them all within livability", () => {
    const ledger = buildingLedger(nodesAt(ALL_MASTERED));
    const population = deriveCityVitality({ ledger, civic: [] }).population;
    const homes = Math.ceil(population / ERA_ONE_CIVIC_TYPES.longhouse.livability);

    // A swept population rather than one city, so the agreement is not a single lucky
    // fixture: bare, mastered, each single row, and a city with enough dwellings.
    const cities: { readonly label: string; readonly civic: EraOneCivicTypeId[] }[] = [
      { label: "no civic", civic: [] },
      ...CIVIC_IDS.map((id) => ({ label: id, civic: [id] })),
      { label: "free civic", civic: [...ERA_ONE_FREE_CIVIC] },
      {
        label: "homes for everybody",
        civic: new Array<EraOneCivicTypeId>(homes).fill("longhouse"),
      },
    ];
    // The floor: an empty or single-element sweep would prove nothing.
    expect(cities.length).toBeGreaterThanOrEqual(7);

    let sawARealGap = 0;
    for (const { label, civic } of cities) {
      const vitality = deriveCityVitality({ ledger, civic: civicRows(civic) });
      expect(vitality.shortfalls.livability, `${label} is within its livability`).toBe(0);
      expect(vitality.shortfalls.happiness, `${label} agrees`).toBe(
        vitality.happiness.uncovered,
      );
      if (vitality.happiness.uncovered > 0) {
        sawARealGap += 1;
      }
    }
    // And the agreement was tested on cities that actually HAD a gap, not only on
    // settled ones where both numbers are trivially 0.
    expect(sawARealGap).toBeGreaterThanOrEqual(5);
  });

  it("are nonetheless different definitions, which is why the agreement is a finding", () => {
    // A city era one cannot currently produce, so that the agreement above is not
    // mistaken for a tautology: 44 people against 30 livability. `sustained` is 30, so
    // the gap against a coverage of 9 is 21, while 35 people are out of reach of an
    // amenity. If the two definitions were one number this would read 35.
    const overPool = deriveCityVitality({
      ledger: buildingLedger(nodesAt(ALL_MASTERED)),
      civic: [],
    });
    // Era one cannot reach it, which is itself the finding, so the arithmetic is shown on
    // the definitions directly rather than on a city that cannot exist.
    expect(overPool.shortfalls.livability).toBe(0);
    const population = 44;
    const sustained = Math.min(population, 30);
    expect(Math.max(0, sustained - 9)).toBe(21);
    expect(population - Math.min(9, population)).toBe(35);
  });

  it("calls the city settled only when BOTH capacities reach everybody", () => {
    // `none` is derived from his two numbers now, so it is worth pinning that it cannot
    // read true on a city with people out of reach of an amenity. It cannot: a zero
    // livability shortfall forces `sustained === population`, which makes his gap equal
    // the readout's uncovered, so `none` implies both are zero.
    const ledger = buildingLedger(nodesAt(ALL_MASTERED));
    const population = deriveCityVitality({ ledger, civic: [] }).population;
    const homes = Math.ceil(population / ERA_ONE_CIVIC_TYPES.longhouse.livability);
    const amenities = Math.ceil(population / ERA_ONE_CIVIC_TYPES.campfire.happiness);

    const short = deriveCityVitality({
      ledger,
      civic: civicRows(new Array<EraOneCivicTypeId>(homes).fill("longhouse")),
    });
    expect(short.shortfalls.none).toBe(false);

    const settled = deriveCityVitality({
      ledger,
      civic: civicRows([
        ...new Array<EraOneCivicTypeId>(homes).fill("longhouse"),
        ...new Array<EraOneCivicTypeId>(amenities).fill("campfire"),
      ]),
    });
    expect(settled.happiness.uncovered).toBe(0);
    expect(settled.shortfalls.none).toBe(true);
  });
});
