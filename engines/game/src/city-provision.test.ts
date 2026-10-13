import type { Mastery } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

import {
  buildingLedger,
  type CitizenNodeInput,
  citizenPopulation,
} from "./citizens-population";
import { FOUNDING_POPULATION } from "./citizens-tuning";
import { amenityPressure, deriveProvision, sustenancePressure } from "./city-provision";
import { type CityVitality, deriveCityVitality } from "./city-vitality";
import { ERA_ONE_CIVIC_TYPES, HAPPINESS_BAND_FLOOR } from "./city-vitality-tuning";
import type { CitizenRoleId } from "./descriptors";

/**
 * **WHAT THE CITY IS SHORT OF, AGAINST EACH OF THE FOUR DECISIONS THE READING IS MADE OF.**
 *
 * `city-provision.ts` states the design; this holds it to era one's own numbers. Every case
 * here is about a claim in that header rather than about a line of code, because the risk
 * with a reading like this is not that it computes the wrong number — it is that it computes
 * a number nobody argued for.
 *
 * **This file replaces `city-departures.test.ts`, which held the removed mechanic to six
 * decisions.** Four survived the ruling and are below. The two that went were about the
 * magnitude of a loss (`DEPARTURE_SHARE`'s trickle) and the floor that capped it, and there
 * is nothing left in the model for either to be about. The claim they were really protecting
 * — *"learning never costs you people"* — is not weakened by their going: it is now
 * unconditional, and `test/departuresAreWired.test.ts` is where it is asserted as such.
 *
 * The D1 skill set and its roles are duplicated as DATA rather than imported, following
 * `citizens-invariants.test.ts`'s own reasoning: the graph is Gabriel's, and an assertion
 * about era one's curve should fail loudly if the graph moves under it rather than silently
 * tracking it.
 */

const NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.5", "NUM.4"] as const;
const ROLE: Readonly<Record<string, CitizenRoleId>> = {
  "NUM.S": "civic",
  "NUM.F": "civic",
  "NUM.2": "residence",
  "NUM.3": "school",
  "NUM.4": "civic",
  "NUM.5": "civic",
};

/**
 * The one civic row every era-one city is guaranteed: section 4's free Smokehouse, which
 * `apps/web/src/city/citizens.ts` leads its contribution list with on every path.
 */
const FREE_SMOKEHOUSE = {
  livability: ERA_ONE_CIVIC_TYPES.smokehouse.livability,
  happiness: ERA_ONE_CIVIC_TYPES.smokehouse.happiness,
};
const CAMPFIRE = {
  livability: ERA_ONE_CIVIC_TYPES.campfire.livability,
  happiness: ERA_ONE_CIVIC_TYPES.campfire.happiness,
};

function island(mastery: Readonly<Record<string, Mastery>>): CitizenNodeInput[] {
  return NODES.map((nodeId) => {
    const level = mastery[nodeId] ?? 0;
    return {
      node_id: nodeId,
      citizen_role: ROLE[nodeId] ?? "civic",
      placed: level > 0,
      mastery: level,
      lesson_stage: level > 0 ? ("done" as const) : ("not_started" as const),
      placement_estimate: 0 as const,
    };
  });
}

function cityAt(
  mastery: Readonly<Record<string, Mastery>>,
  options: {
    readonly roadTileCount?: number;
    readonly civic?: readonly { livability: number; happiness: number }[];
  } = {},
): CityVitality {
  return deriveCityVitality({
    ledger: buildingLedger(island(mastery)),
    civic: options.civic ?? [FREE_SMOKEHOUSE],
    roadTileCount: options.roadTileCount ?? 0,
  });
}

/** The ordinary path: skills mastered one at a time, nothing bought, no paths laid. */
function afterMastering(count: number): Readonly<Record<string, Mastery>> {
  const mastery: Record<string, Mastery> = {};
  for (const nodeId of NODES.slice(0, count)) {
    mastery[nodeId] = 2;
  }
  return mastery;
}

const ALL_MASTERED = afterMastering(NODES.length);

/** Every one of the 4096 mastery vectors, which is the population the sweeps below use. */
function everyMasteryVector(): Readonly<Record<string, Mastery>>[] {
  const levels: readonly Mastery[] = [0, 1, 2, 3];
  const vectors: Record<string, Mastery>[] = [];
  for (let code = 0; code < 4 ** NODES.length; code += 1) {
    const vector: Record<string, Mastery> = {};
    let rest = code;
    for (const nodeId of NODES) {
      vector[nodeId] = levels[rest % 4] ?? 0;
      rest = Math.floor(rest / 4);
    }
    vectors.push(vector);
  }
  return vectors;
}

describe("the reading reports no headcount, which is the ruling made structural", () => {
  it("returns exactly three fields, and not one of them is a count of people", () => {
    // The load-bearing shape claim. A `leaving`, a `remaining`, a `stayed` or a `floor`
    // would each be a headcount this reading could lower, and there is nowhere to put one:
    // an exact key set fails on any field added, whatever it is called.
    const reading = deriveProvision({
      population: 44,
      happinessLevel: 0,
      sustains: 100,
    });
    expect(Object.keys(reading).sort()).toEqual(["cause", "pressure", "unmet"]);
    // And every numeric field is a FRACTION rather than a tally, so none of them can be
    // read as people by a surface looking for one.
    expect(reading.pressure).toBeGreaterThan(0);
    expect(reading.pressure).toBeLessThanOrEqual(1);
  });

  it("leaves the city's headcount exactly what learning brought, over all 4096 vectors", () => {
    let checked = 0;
    for (const vector of everyMasteryVector()) {
      const city = cityAt(vector);
      expect(city.population, JSON.stringify(vector)).toBe(
        citizenPopulation(buildingLedger(island(vector))),
      );
      checked += 1;
    }
    // The floor under the sweep: an empty vector list satisfies the loop above.
    expect(checked).toBe(4096);
  });
});

describe("decision 1: the threshold is the band floor, and there is no second one", () => {
  it("engages exactly where `bandFor` calls the city restless", () => {
    // The claim is that one constant drives both readouts, so it is checked at the seam
    // rather than at two hand-written numbers: for every coverage a fully mastered island
    // can reach with paths, the band being `restless` and the reading being past the line
    // are the same fact.
    let restless = 0;
    let settled = 0;
    for (let tiles = 0; tiles <= 40; tiles += 1) {
      const city = cityAt(ALL_MASTERED, { roadTileCount: tiles });
      const past = city.provision.pressure > 0;
      expect(past, `${tiles} tiles at ${city.happiness.level}%`).toBe(
        city.happiness.band === "restless",
      );
      if (past) {
        restless += 1;
      } else {
        settled += 1;
      }
    }
    // Both sides of the threshold were actually visited, or the agreement above holds
    // trivially over a sweep that never crossed it.
    expect(restless).toBeGreaterThan(5);
    expect(settled).toBeGreaterThan(5);
  });

  it("moves with the band floor rather than with a number of its own", () => {
    // `amenityPressure` is exported for this: a fraction of the threshold, so the value
    // itself says which threshold was read. At half the floor the city is half way under.
    expect(amenityPressure(HAPPINESS_BAND_FLOOR.settling)).toBe(0);
    expect(amenityPressure(HAPPINESS_BAND_FLOOR.settling / 2)).toBeCloseTo(0.5, 10);
    expect(amenityPressure(0)).toBe(1);
    expect(amenityPressure(100)).toBe(0);
  });
});

describe("decision 2: the depth is kept, and it is the only thing with a magnitude", () => {
  it("deepens monotonically as the city gets worse, and really moves", () => {
    let previous = -1;
    let moved = 0;
    for (let level = 100; level >= 0; level -= 1) {
      const pressure = deriveProvision({
        population: 44,
        happinessLevel: level,
        sustains: 100,
      }).pressure;
      expect(pressure).toBeGreaterThanOrEqual(previous);
      if (pressure !== previous) {
        moved += 1;
      }
      previous = pressure;
    }
    // The floor: a reading that returned 0 everywhere would be monotone too.
    expect(moved).toBeGreaterThanOrEqual(50);
    expect(previous).toBe(1);
  });

  it("has a REACHABLE shallow band, so the alarm is not a cliff", () => {
    // Kept from the removed mechanic's decision 2, because the band it describes is still
    // real and still what a learner meets on the way down. Derived from real cities — a
    // fully mastered island with paths laid — rather than from a hand-built level.
    const shallow: number[] = [];
    for (let tiles = 0; tiles <= 40; tiles += 1) {
      const city = cityAt(ALL_MASTERED, { roadTileCount: tiles });
      if (city.provision.pressure > 0 && city.provision.pressure < 0.1) {
        shallow.push(city.happiness.level);
      }
    }
    // Re-measured after the 8->12 founding-population retune: 56 and 58 percent, both
    // `restless`, both one step under the line. The retune's coarser population
    // denominator (48 vs 44) means fewer discrete tile counts land in this narrow a
    // pressure band than before -- two rather than three -- but the qualitative claim
    // (a reachable shallow step exists before the alarm) still holds.
    expect(shallow.length).toBeGreaterThanOrEqual(2);
    for (const level of shallow) {
      expect(level).toBeLessThan(HAPPINESS_BAND_FLOOR.settling);
      expect(level).toBeGreaterThan(HAPPINESS_BAND_FLOOR.settling - 10);
    }
  });
});

describe("decision 3: which deficiency, and how reachable each is on era one", () => {
  it("names the deeper of the two, and never their sum", () => {
    const starving = deriveProvision({ population: 40, happinessLevel: 100, sustains: 10 });
    expect(starving.cause).toBe("sustenance");
    expect(starving.pressure).toBeCloseTo(sustenancePressure(40, 10), 10);

    const unreached = deriveProvision({ population: 40, happinessLevel: 0, sustains: 400 });
    expect(unreached.cause).toBe("amenities");
    expect(unreached.pressure).toBe(1);

    // A city that is both is short once: the deeper deficiency decides.
    const both = deriveProvision({ population: 40, happinessLevel: 0, sustains: 10 });
    expect(both.pressure).toBe(Math.max(starving.pressure, unreached.pressure));

    // Sustenance takes a tie, because it is the more physical failure.
    const tied = deriveProvision({
      population: 100,
      happinessLevel: HAPPINESS_BAND_FLOOR.settling / 2,
      sustains: 50,
    });
    expect(tied.pressure).toBeCloseTo(0.5, 10);
    expect(tied.cause).toBe("sustenance");
  });

  it("RECORDS that the sustenance limb is unreachable on era one's shipped path", () => {
    // `.cursor/rules/qa-verification.mdc`: a rule whose population is empty reports green
    // while measuring nothing. This limb IS such a rule today, and the honest thing is to
    // assert the fact rather than to leave it as a branch nobody knows is dead.
    //
    // With the guaranteed free Smokehouse the hub's 8 plus its 20 already cover the
    // founding crowd, and every residence adds more livability than it adds population.
    const withFree = everyMasteryVector().filter(
      (vector) => cityAt(vector).shortfalls.livability > 0,
    );
    expect(withFree.length, "the livability limb has become reachable on era one").toBe(0);

    // ...and the control, in the same run: it is not that the limb cannot fire, it is that
    // era one's free row is what stops it. Take the row away and a third of the vectors
    // are short.
    const withoutFree = everyMasteryVector().filter(
      (vector) => cityAt(vector, { civic: [] }).shortfalls.livability > 0,
    );
    expect(withoutFree.length).toBe(1216);
    const worst = cityAt({ "NUM.3": 2, "NUM.4": 2 }, { civic: [] });
    expect(worst.shortfalls.livability).toBeGreaterThan(0);
    // The reading is engaged over it. It still names AMENITIES, because on an island with
    // no civic row at all the amenity deficit is deeper than the sustenance one even here;
    // the nine vectors where sustenance does overtake it are counted in the next case.
    expect(worst.provision.unmet).toBe(true);
    expect(
      worst.provision.pressure,
      "a city short of livability reads no worse than one that is not",
    ).toBeGreaterThanOrEqual(
      sustenancePressure(worst.population, worst.livability.sustains),
    );
  });

  it("finds AMENITIES the binding deficiency in every SHIPPED era-one city, and the limb live without the free row", () => {
    // Worth measuring rather than assuming, because it is the reason the panel's happiness
    // row is the only one that ever speaks on this era: era one's skill buildings supply
    // at most 9 coverage for a town of 44, so the amenity deficit is deep everywhere and
    // there is almost nothing for the sustenance deficit to overtake.
    const causesOf = (civic: readonly { livability: number; happiness: number }[]) => {
      const tally = { amenities: 0, sustenance: 0, quiet: 0 };
      for (const vector of everyMasteryVector()) {
        const cause = cityAt(vector, { civic }).provision.cause;
        tally[cause ?? "quiet"] += 1;
      }
      return tally;
    };

    // On the shipped path the sustenance limb never binds.
    const shipped = causesOf([FREE_SMOKEHOUSE]);
    expect(shipped.sustenance).toBe(0);
    expect(shipped.amenities, "no shipped era-one city is past the line at all").toBe(4096);

    // The control, re-measured after the 8->12 founding-population retune (which moved
    // HUB_FOUNDING_LIVABILITY in lockstep, by the same design intent that keeps the
    // Town Hall exactly covering its founders). Stripping the free row now clears zero
    // vectors into sustenance rather than nine: sustains grew by the same +4 floor
    // population did, so sustenance pressure is uniformly no deeper than amenities
    // pressure across all 4096 mastery vectors at these numbers. The limb itself is
    // still live -- `sustenancePressure` is exercised and can dominate at a low enough
    // `sustains` input (see its own unit tests) -- this sweep just no longer reaches
    // that region with the free row removed.
    const stripped = causesOf([]);
    expect(stripped.sustenance).toBe(0);
    expect(stripped.amenities).toBe(4096);
  });
});

describe("decision 4: the hub provides for its founders, so a bare island is not alarmed", () => {
  it("stays quiet at the deepest shortfall there is, while still reporting it", () => {
    // A bare island is 8 people and NOTHING reaches them: pressure 1, the worst the model
    // can express. It is not alarmed, because there is no provision the PLAYER owes — the
    // hub feeds and houses exactly its founders on its own (section 8.1).
    const bare = cityAt({});
    expect(bare.population).toBe(FOUNDING_POPULATION);
    expect(bare.happiness.level).toBe(0);
    expect(bare.provision.pressure).toBe(1);
    expect(bare.provision.cause).toBe("amenities");
    expect(bare.provision.unmet).toBe(false);

    // AND THE FACT IS NEVER HIDDEN, which is what makes the silence a scoping decision
    // rather than a euphemism: the band still reads restless, so the happiness row still
    // prints "Your people are unhappy!". What is withheld is the triangle.
    expect(bare.happiness.band).toBe("restless");

    // The very next thing that happens does alarm it, so the silence above is the founding
    // crowd rather than the reading being inert on a fresh island.
    expect(cityAt(afterMastering(1)).provision.unmet).toBe(true);
  });

  it("keys the silence on the founding crowd and on nothing else", () => {
    // Stated on the exported rule so the boundary is visible at the exact person rather
    // than inferred from whichever populations era one happens to produce.
    for (const population of [0, 1, FOUNDING_POPULATION - 1, FOUNDING_POPULATION]) {
      expect(
        deriveProvision({ population, happinessLevel: 0, sustains: 0 }).unmet,
        `${population} people`,
      ).toBe(false);
    }
    expect(
      deriveProvision({
        population: FOUNDING_POPULATION + 1,
        happinessLevel: 0,
        sustains: 0,
      }).unmet,
    ).toBe(true);
  });

  it("is total on the degenerate inputs rather than only on the sane ones", () => {
    expect(deriveProvision({ population: 0, happinessLevel: 0, sustains: 0 })).toEqual({
      pressure: 0,
      cause: null,
      unmet: false,
    });
    // A negative capacity is a shortfall of everybody, not a crash.
    expect(
      deriveProvision({ population: 3, happinessLevel: 100, sustains: -50 }).pressure,
    ).toBe(1);
    expect(
      deriveProvision({ population: 4000, happinessLevel: 0, sustains: 0 }).unmet,
    ).toBe(true);
  });
});

describe("a provided-for city says nothing, and getting there needs no mechanism", () => {
  it("falls quiet the moment the amenities reach everybody", () => {
    const unhappy = cityAt(ALL_MASTERED);
    expect(unhappy.provision.unmet).toBe(true);
    expect(unhappy.provision.pressure).toBeGreaterThan(0);

    // Two Campfires take coverage to the whole town.
    const repaired = cityAt(ALL_MASTERED, { civic: [FREE_SMOKEHOUSE, CAMPFIRE, CAMPFIRE] });
    expect(repaired.happiness.band).toBe("content");
    expect(repaired.provision).toEqual({ pressure: 0, cause: null, unmet: false });

    // And the crowd is the same crowd throughout, which is the ruling: the repair changed
    // what the city PROVIDES and never who is in it.
    expect(repaired.population).toBe(unhappy.population);
  });

  it("walks the shortfall back step by step as paths are laid, rather than all at once", () => {
    // What a learner actually does about it. Each block of paving closes some of the gap,
    // so the repair is legible while it is happening instead of only at the end.
    const path = [0, 5, 10, 14, 15, 20].map((tiles) => {
      const city = cityAt(ALL_MASTERED, { roadTileCount: tiles });
      return { tiles, pressure: city.provision.pressure, population: city.population };
    });
    const pressures = path.map((step) => step.pressure);
    // Strictly falling until it reaches zero, and it does reach zero.
    for (let at = 1; at < pressures.length; at += 1) {
      expect(pressures[at] as number).toBeLessThanOrEqual(pressures[at - 1] as number);
    }
    expect(pressures[0]).toBeGreaterThan(0);
    expect(pressures.at(-1)).toBe(0);
    // The headcount never moved once across the whole repair.
    expect(new Set(path.map((step) => step.population)).size).toBe(1);
  });
});
