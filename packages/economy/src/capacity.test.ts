import { describe, expect, it } from "vitest";

import {
  CAPACITY_IDS,
  type CivicCapacityProfile,
  capacityShortfall,
  deriveCapacities,
  greedyPlanCost,
  isSolvent,
  NO_CONTRIBUTION,
} from "./capacity";
import { lessonMaterialAmount } from "./materials";
import { ECONOMY_RESOURCES } from "./types";

/**
 * ERA ONE'S CATALOGUE, from `eras/era-01-prehistoric/civic-buildings.md` §3, as FIXTURES
 * and deliberately not as shipped data (the catalogue is Evan's two-class building model).
 *
 * Under the pooled ruling the doc's "food capacity for ~20" and its "20 livability" are
 * the SAME contribution, which is why the Family Lodge also carries the 5 happiness the
 * rebalance gave it: without something of its own it was a strictly worse Smokehouse.
 * The footprint axis that completes that trade is not visible to this type — it is
 * authored in the catalogue and swept by `test/eraCivicCatalogueDominance.test.ts`.
 */
const SMOKEHOUSE: CivicCapacityProfile = { livability: 20, happiness: 0, cost: 80 };
const FAMILY_LODGE: CivicCapacityProfile = { livability: 20, happiness: 5, cost: 80 };
const CAMPFIRE: CivicCapacityProfile = { livability: 0, happiness: 20, cost: 100 };
const SPRING: CivicCapacityProfile = { livability: 10, happiness: 10, cost: 120 };
const ERA_ONE = [SMOKEHOUSE, FAMILY_LODGE, CAMPFIRE, SPRING];

describe("deriveCapacities — livability is ONE POOL, housing and food untracked", () => {
  it("sums every contribution into the one livability pool", () => {
    expect(deriveCapacities([FAMILY_LODGE, SMOKEHOUSE]).livability).toBe(40);
    expect(deriveCapacities([FAMILY_LODGE, FAMILY_LODGE, SMOKEHOUSE]).livability).toBe(60);
    expect(deriveCapacities([FAMILY_LODGE, SMOKEHOUSE, SMOKEHOUSE]).livability).toBe(60);
  });

  it("reads a dwelling with no food building as sustaining its full number", () => {
    // This is the behaviour the flip changed, and it is the whole ruling in two lines:
    // under the limiting-factor reading both of these were 0, because the other input
    // was missing. There is no other input now.
    expect(deriveCapacities([FAMILY_LODGE]).livability).toBe(20);
    expect(deriveCapacities([SMOKEHOUSE]).livability).toBe(20);
  });

  it("makes a food row and a dwelling row INTERCHANGEABLE on the livability axis", () => {
    // The consequence that costs something, asserted rather than commented: nothing in
    // the model can tell these two apart, so the catalogue has to. Era one's do it on
    // footprint (2x1 against 2x2) and on the Family Lodge's happiness.
    const food = deriveCapacities([SMOKEHOUSE, SMOKEHOUSE, SMOKEHOUSE]);
    const dwellings = deriveCapacities([FAMILY_LODGE, FAMILY_LODGE, FAMILY_LODGE]);
    expect(food.livability).toBe(dwellings.livability);
    expect(dwellings.happiness - food.happiness).toBe(15);
  });

  it("sums happiness, which is the other capacity", () => {
    expect(deriveCapacities([CAMPFIRE, CAMPFIRE]).happiness).toBe(40);
    expect(deriveCapacities([CAMPFIRE, FAMILY_LODGE]).happiness).toBe(25);
  });

  it("returns the two capacities and nothing else", () => {
    // No housing or food sub-total survives the flip: a readout that could still name one
    // would be naming a quantity the ruling says is not tracked.
    expect(deriveCapacities([FAMILY_LODGE, FAMILY_LODGE, SMOKEHOUSE])).toEqual({
      livability: 60,
      happiness: 10,
    });
  });

  it("is empty-safe and contributes nothing for a nothing-building", () => {
    expect(deriveCapacities([])).toEqual({ livability: 0, happiness: 0 });
    expect(deriveCapacities([NO_CONTRIBUTION]).livability).toBe(0);
  });

  it("is CLOCKLESS — the same contributions give the same capacities forever", () => {
    const spy = () => {
      throw new Error("deriveCapacities read the clock");
    };
    const realNow = Date.now;
    Date.now = spy as unknown as typeof Date.now;
    try {
      // One of each: 20 + 20 + 0 + 10 livability, 0 + 5 + 20 + 10 happiness.
      expect(deriveCapacities(ERA_ONE)).toEqual({ livability: 50, happiness: 35 });
    } finally {
      Date.now = realNow;
    }
  });
});

describe("capacityShortfall — numbers, never a name for an untracked input", () => {
  const capacities = deriveCapacities([FAMILY_LODGE, SMOKEHOUSE]);

  it("reports the people livability cannot sustain", () => {
    expect(capacityShortfall(capacities, 50).unsustained).toBe(10);
    expect(capacityShortfall(capacities, 40).unsustained).toBe(0);
    expect(capacityShortfall(capacities, 5).unsustained).toBe(0);
  });

  it("reports the happiness gap for the SUSTAINED population only", () => {
    const withAmenity = deriveCapacities([FAMILY_LODGE, SMOKEHOUSE, CAMPFIRE]);
    // livability 40, happiness 25: 60 people means 20 unsustained and a gap of 15 for
    // the 40 who are sustained, not for the 60 who turned up.
    expect(capacityShortfall(withAmenity, 60)).toEqual({
      unsustained: 20,
      happinessGap: 15,
    });
  });

  it("keeps the two capacities independent — within one, short of the other", () => {
    const noAmenity = deriveCapacities([FAMILY_LODGE, SMOKEHOUSE]);
    expect(capacityShortfall(noAmenity, 40)).toEqual({
      unsustained: 0,
      happinessGap: 35,
    });
  });

  it("carries NO binding-input field, because there is no second input to bind", () => {
    // The field this replaces was `binding: "housing" | "food" | "balanced"`. Asserted as
    // a key census rather than in prose, so a re-added sub-total fails here.
    expect(Object.keys(capacityShortfall(capacities, 99)).sort()).toEqual([
      "happinessGap",
      "unsustained",
    ]);
  });

  it("never returns anything shaped like a gate (INV-COS-1)", () => {
    const result: unknown = capacityShortfall(capacities, 999);
    for (const value of Object.values(result as Record<string, unknown>)) {
      expect(typeof value).not.toBe("boolean");
    }
  });

  it("treats a negative population as zero rather than as a surplus", () => {
    expect(capacityShortfall(capacities, -5).unsustained).toBe(0);
  });
});

describe("a capacity is NEVER a resource", () => {
  it("keeps both capacity names out of ECONOMY_RESOURCES", () => {
    expect(CAPACITY_IDS).toEqual(["livability", "happiness"]);
    for (const id of CAPACITY_IDS) {
      expect(ECONOMY_RESOURCES).not.toContain(id);
    }
    // Floor, so the containment check cannot pass over an empty resource list. TEN since
    // the XP sunset, where it was eleven after the gold-drop (xp plus the ten materials)
    // and twelve before it. The floor moves with the axis on purpose: a `not.toContain`
    // holds trivially over an empty collection, so this is the line that makes the one
    // above mean anything.
    expect(ECONOMY_RESOURCES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("greedyPlanCost + isSolvent — INV-ERA-4's predicate", () => {
  it("prices livability ONCE, which is what the pooled ruling changed", () => {
    // 20 livability is one Smokehouse or one Family Lodge, 80 either way. Under the
    // limiting-factor reading the same target cost 160, because it had to buy both a
    // housing row and a food row.
    expect(greedyPlanCost(ERA_ONE, { livability: 20, happiness: 0 })).toBe(80);
  });

  it("rounds up to whole buildings", () => {
    expect(greedyPlanCost(ERA_ONE, { livability: 25, happiness: 0 })).toBe(160);
  });

  it("costs nothing for a zero target", () => {
    expect(greedyPlanCost(ERA_ONE, { livability: 0, happiness: 0 })).toBe(0);
  });

  it("returns null — not zero — when no row can supply an axis", () => {
    expect(greedyPlanCost([SMOKEHOUSE], { livability: 20, happiness: 20 })).toBeNull();
    expect(greedyPlanCost([], { livability: 1, happiness: 0 })).toBeNull();
  });

  it("is an UPPER BOUND — a real plan beats it when one row covers both axes", () => {
    // Three Family Lodges cost 240 and provide 60 livability with 15 happiness, covering
    // this target exactly. Pricing the axes separately cannot see that and answers 340
    // (240 of livability plus a 100 Campfire). The bound is the safe direction for
    // a solvency guarantee, and this pins it so nobody re-reads the answer as optimal.
    const target = { livability: 60, happiness: 15 };
    expect(greedyPlanCost(ERA_ONE, target)).toBe(340);
    const threeLodges = deriveCapacities([FAMILY_LODGE, FAMILY_LODGE, FAMILY_LODGE]);
    expect(threeLodges.livability).toBeGreaterThanOrEqual(target.livability);
    expect(threeLodges.happiness).toBeGreaterThanOrEqual(target.happiness);
    expect(3 * FAMILY_LODGE.cost).toBe(240);
  });

  it("finds era one solvent at the six-lesson payout, which min did not", () => {
    // Six D1 lessons at the era-one lump, against era one's ~60 sustained population with
    // happiness covering it (era one §4).
    const granted = 6 * lessonMaterialAmount("prehistoric");
    const needed = greedyPlanCost(ERA_ONE, { livability: 60, happiness: 60 });
    expect(granted).toBe(600);
    // 240 of livability (three rows of 20 at 80) plus 300 of happiness (three Hearth
    // Circles). The limiting-factor reading answered 780 here and failed the predicate,
    // and era one closed the gap on Evan's numbers — the free first Smokehouse, the
    // Town Hall's own founders, a population that climbs over play time. Pooling pays for
    // the same population once instead of twice, so the predicate now holds outright and
    // those three are headroom rather than the whole margin.
    expect(needed).toBe(540);
    expect(isSolvent(granted, needed ?? 0)).toBe(true);
  });
});
