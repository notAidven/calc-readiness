import { ERA_SEQUENCE, eraBuildableRadius } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  eraBuildableDiscRadius,
  eraCityLayout,
  eraLandDemand,
  eraLandIsClamped,
  eraLandRadius,
  eraSeaRadius,
  GRASS_OVER_BUILDABLE,
  ISLAND_GROWTH_CEILING,
} from "./islandLand";
import {
  BUILDABLE_RADIUS,
  computeCityLayout,
  ISLAND_GRASS_RADIUS,
  SEA_RADIUS,
} from "./worldLayout";

/**
 * **HOW BIG IS EACH ERA'S ISLAND, AND WHY THAT SIZE.**
 *
 * Two things are at stake and they pull opposite ways. The land has to grow enough to carry
 * the buildings D-ERA25 budgets for each era, and it may not grow past the ceiling
 * `three/depthPrecision.test.ts` measures. So this file pins the rule, its margin, and the
 * clamp — and it pins the margin against the ALTERNATIVE that was costed and rejected,
 * because "grass = the budget" is the obvious rule and the reason it is wrong is a
 * measurement rather than a preference.
 *
 * The depth ceiling itself is asserted next door, through the road layer's own helpers.
 */

/** Where the island's decoration band runs, as offsets around the buildable disc. */
const BAND_INNER_OVER_BUILDABLE = 3;
const BAND_OUTER_UNDER_GRASS = 2.2;

describe("the drawn land, per era", () => {
  it("leaves era one exactly as it ships", () => {
    // The floor every other era is a departure from. If this moves, era one's approved
    // island has been re-authored by a rule that was only supposed to reach later eras.
    expect(eraLandRadius("prehistoric")).toBe(ISLAND_GRASS_RADIUS);
    expect(eraSeaRadius("prehistoric")).toBe(SEA_RADIUS);
    expect(eraBuildableRadius("prehistoric")).toBe(BUILDABLE_RADIUS);
    expect(GRASS_OVER_BUILDABLE).toBe(8);
  });

  it("never shrinks, never dips under the shipped island, never passes the ceiling", () => {
    // A FLOOR under the sweep: ten eras, so none of the three claims holds vacuously.
    expect(ERA_SEQUENCE).toHaveLength(10);
    let previous = 0;
    for (const era of ERA_SEQUENCE) {
      const radius = eraLandRadius(era.id);
      expect(radius, era.id).toBeGreaterThanOrEqual(ISLAND_GRASS_RADIUS);
      expect(radius, era.id).toBeLessThanOrEqual(ISLAND_GROWTH_CEILING);
      // Nothing is ever torn down, so no advance may take land away.
      expect(radius, era.id).toBeGreaterThanOrEqual(previous);
      previous = radius;
    }
  });

  it("states the ten radii, and which four are the ceiling's rather than their own", () => {
    // Derived, named, and readable at review time — the shape `eraCityLand.test.ts` uses for
    // the cell-demand column, for the same reason: the rule's cost should be legible and not
    // merely computable.
    expect(ERA_SEQUENCE.map((era) => [era.id, eraLandRadius(era.id)])).toEqual([
      ["prehistoric", 30],
      ["neolithic", 38],
      ["bronze_age", 43],
      ["classical", 46],
      ["medieval", 46],
      ["renaissance", 46],
      ["industrial", 46],
      ["atomic_age", 46],
      ["information_age", 46],
      ["cyberpunk", 46],
    ]);
    // Era four is the first the ceiling binds on, which is exactly what #413 re-measured:
    // its 42 + 8 wants grass 50, and 50 resolves 3.97 depth steps against a bar of 4.
    expect(
      ERA_SEQUENCE.filter((era) => eraLandIsClamped(era.id)).map((era) => era.id),
    ).toEqual([
      "classical",
      "medieval",
      "renaissance",
      "industrial",
      "atomic_age",
      "information_age",
      "cyberpunk",
    ]);
    expect(eraLandDemand("classical")).toBe(50);
    expect(eraLandDemand("cyberpunk")).toBe(77);
  });

  it("keeps era one's own green margin at every era it can", () => {
    // Not a taste: the margin is what stops a building standing on the beach, and it is the
    // island's whole decoration band. Exactly 8 wherever the ceiling is not binding.
    for (const era of ERA_SEQUENCE) {
      if (eraLandIsClamped(era.id)) {
        continue;
      }
      expect(eraLandRadius(era.id) - eraBuildableRadius(era.id), era.id).toBe(
        GRASS_OVER_BUILDABLE,
      );
    }
  });

  it("leaves a decoration band where a no-margin rule would invert it", () => {
    /*
     * THE REJECTED ALTERNATIVE, MEASURED. "Grass = the era's budget" is the cheap rule and it
     * has one genuine attraction: era one to two costs nothing, because era two's budget of 30
     * is exactly `ISLAND_GRASS_RADIUS`. This is what it costs instead — `StarterIsland`
     * scatters every tree, bush and boulder between `BUILDABLE_RADIUS + 3` and `grassR - 2.2`,
     * and under that rule the band is INVERTED from era three on, so the island loses its
     * vegetation outright. Asserted rather than argued, in both directions.
     */
    const bandWidth = (grass: number, buildable: number) =>
      grass - BAND_OUTER_UNDER_GRASS - (buildable + BAND_INNER_OVER_BUILDABLE);

    // As shipped, era one's band is 2.8 units wide, and the rule holds it there.
    expect(bandWidth(ISLAND_GRASS_RADIUS, BUILDABLE_RADIUS)).toBeCloseTo(2.8, 9);
    for (const era of ERA_SEQUENCE) {
      if (eraLandIsClamped(era.id)) {
        continue;
      }
      expect(
        bandWidth(eraLandRadius(era.id), eraBuildableRadius(era.id)),
        era.id,
      ).toBeCloseTo(2.8, 9);
    }
    // And the alternative: from era three the band is negative, i.e. there is nowhere on the
    // island a tree is allowed to stand.
    const noMargin = (eraId: (typeof ERA_SEQUENCE)[number]["id"]) =>
      bandWidth(
        Math.max(ISLAND_GRASS_RADIUS, eraBuildableRadius(eraId)),
        eraBuildableRadius(eraId),
      );
    expect(noMargin("prehistoric")).toBeCloseTo(2.8, 9);
    expect(noMargin("neolithic")).toBeCloseTo(-5.2, 9);
    expect(noMargin("bronze_age")).toBeCloseTo(-5.2, 9);
    for (const era of ERA_SEQUENCE.slice(1)) {
      expect(noMargin(era.id), era.id).toBeLessThan(0);
    }
  });

  it("keeps era one's lagoon ratio, so a grown island still has water round it", () => {
    const ratio = SEA_RADIUS / ISLAND_GRASS_RADIUS;
    for (const era of ERA_SEQUENCE) {
      expect(eraSeaRadius(era.id) / eraLandRadius(era.id), era.id).toBeCloseTo(ratio, 9);
      // The lagoon has to clear the drawn island's own footprint (grass plus its 4 units of
      // beach) or the shore would end at the edge of the water plane.
      expect(eraSeaRadius(era.id), era.id).toBeGreaterThan(eraLandRadius(era.id) + 4);
    }
    // Left flat at 58 the largest island would keep only 8 units of water outside its beach,
    // which is the state `cityFraming.browser.test.tsx` had to scale round by hand.
    expect(SEA_RADIUS - (ISLAND_GROWTH_CEILING + 4)).toBe(8);
    expect(eraSeaRadius("cyberpunk") - (ISLAND_GROWTH_CEILING + 4)).toBeCloseTo(38.9, 1);
  });
});

/**
 * **NOBODY GETS ERA ONE'S ISLAND BY OMISSION — the repair for the sharpest hollow guard this
 * tree has produced.**
 *
 * `computeCityLayout()` used to return era one's island from a call that named no island at
 * all, and two guards took it as *"the city layout"* while measuring **era two**:
 * `eraTwoGround.test.ts` asserted era two's worked field inside a 2.8-unit margin ring and
 * `three/eraTwoField.browser.test.tsx` PHOTOGRAPHED it there. Era two's island is grass 38 with
 * a 10.8-unit ring. Both were green over a container the game does not ship, so era two's
 * fields shipped a third of the width its style guide implies and the era ceremony's fourth
 * beat moved 0.62% of a 1024x580 frame.
 *
 * `.cursor/rules/qa-verification.mdc` names this shape: *"a width pinned in a guard is the same
 * substitution with a test standing in for the box … a true measurement in a box no container
 * has."* The rule also says a comment does not hold a line, so the mechanism is the COMPILER —
 * `computeCityLayout`'s radius is required and a no-argument call no longer typechecks.
 *
 * **What this file adds is the thing the compiler cannot say: that the requirement is still
 * there.** A default restored on `islandRadius` would make every no-argument call legal again
 * and nothing else in the tree would notice, because there would be no call sites left to
 * break — the 36 that existed are now `eraCityLayout("prehistoric")`, and they would go on
 * passing.
 */
describe("the island a measurement is about has to be named", () => {
  it("keeps computeCityLayout's radius required, so the era-one default cannot come back", () => {
    // `Function.length` counts the parameters BEFORE the first defaulted one. It is 1 while the
    // radius is required and would be 0 the moment a default went back on it, which is the one
    // change that would reopen this.
    expect(computeCityLayout.length).toBe(1);
    // ...and the second parameter really is still optional, so this is a claim about the FIRST
    // one rather than about the arity of the function.
    expect(computeCityLayout(ISLAND_GRASS_RADIUS).seaRadius).toBe(SEA_RADIUS);
  });

  /**
   * The population is every era, and the property is that the era-explicit entry point returns
   * the island that era is DRAWN on — the clamped radius and the lagoon that goes with it,
   * which is what `CitySurface` composes by hand for the live game.
   */
  it("hands back the island each era is drawn on, at all ten", () => {
    expect(ERA_SEQUENCE).toHaveLength(10);
    for (const era of ERA_SEQUENCE) {
      const layout = eraCityLayout(era.id);
      expect(layout.islandRadius, era.id).toBe(eraLandRadius(era.id));
      expect(layout.seaRadius, era.id).toBeCloseTo(eraSeaRadius(era.id), 9);
      // The camera follows the island it is laying out, which is the whole reason the radius
      // is an argument (see `computeCityLayout`).
      expect(layout.cameraDistance, era.id).toBeGreaterThan(0);
    }
    // AND THE ERAS REALLY DIFFER, so none of the above is one island asserted ten times: this
    // is the gap that made the substitution invisible.
    const radii = new Set(ERA_SEQUENCE.map((era) => eraCityLayout(era.id).islandRadius));
    expect(radii.size).toBeGreaterThanOrEqual(4);
    expect(eraCityLayout("neolithic").islandRadius).toBeGreaterThan(
      eraCityLayout("prehistoric").islandRadius + 5,
    );
  });

  /**
   * **THE NAMED FORM IS THE OLD DEFAULT, EXACTLY** — which is what makes the 36 rewritten call
   * sites a rename rather than a change of what they measure. Asserted rather than assumed,
   * because if the two ever came apart this whole sweep would have silently re-measured every
   * era-one guard in the tree.
   */
  it("gives era one precisely the island the removed default gave", () => {
    const eraOne = eraCityLayout("prehistoric");
    expect(eraOne).toEqual(computeCityLayout(ISLAND_GRASS_RADIUS, SEA_RADIUS));
    expect(eraOne.islandRadius).toBe(ISLAND_GRASS_RADIUS);
    expect(eraOne.seaRadius).toBe(SEA_RADIUS);
  });
});

/**
 * **THE BUILDABLE DISC FOLLOWS THE DRAWN LAND — the third instance of one bug, and the last of
 * the three surfaces that were standing on era one's island while the learner was on era six's.**
 *
 * #521 fixed the ground art, #537 the props and dressing, and both by the same move: derive the
 * thing from whatever island the era actually has instead of from era one's constant. The
 * placement surface was the third, and the loudest, because it is the only one a learner can
 * bump into — `isCellBuildable` closed over `BUILDABLE_RADIUS`, so the land visibly grew and
 * then refused to be built on.
 *
 * What this describe holds is the DERIVATION rather than the ten numbers, because the numbers
 * are the land's and the land is already pinned above. Four claims:
 *
 *  1. it is `islandLand.ts`'s own margin rule read backwards, so the shore and the disc cannot
 *     come apart — asserted as an equality at every era the ceiling does not clamp;
 *  2. it never exceeds what D-ERA25 authored, so no building stands on water;
 *  3. it never drops below era one's, so era one does not move and no saved transform can be
 *     orphaned;
 *  4. the live twin latches on the BEAT rather than on the era, which is the off-by-one-beat
 *     #537 found and the one a static test cannot see.
 */
describe("the buildable disc is the land the era is drawn on, less era one's margin", () => {
  it("leaves era one exactly where it was", () => {
    expect(eraBuildableDiscRadius("prehistoric")).toBe(BUILDABLE_RADIUS);
    expect(eraCityLayout("prehistoric").buildableRadius).toBe(BUILDABLE_RADIUS);
  });

  it("states the ten discs, and never authors a number of its own", () => {
    expect(ERA_SEQUENCE.map((era) => [era.id, eraBuildableDiscRadius(era.id)])).toEqual([
      ["prehistoric", 22],
      ["neolithic", 30],
      ["bronze_age", 35],
      ["classical", 38],
      ["medieval", 38],
      ["renaissance", 38],
      ["industrial", 38],
      ["atomic_age", 38],
      ["information_age", 38],
      ["cyberpunk", 38],
    ]);
    // Three distinct values below the clamp plus the clamped one, so the table is not one
    // number stated ten times — which is exactly what the defect looked like.
    expect(new Set(ERA_SEQUENCE.map((era) => eraBuildableDiscRadius(era.id))).size).toBe(4);
  });

  it("meets D-ERA25's authored budget exactly wherever the ceiling is not binding", () => {
    // The claim that says this is a re-reading rather than a second opinion: `eraLandRadius`
    // ADDS the margin to the budget, so subtracting it has to give the budget back.
    let unclamped = 0;
    for (const era of ERA_SEQUENCE) {
      if (eraLandIsClamped(era.id)) {
        continue;
      }
      expect(eraBuildableDiscRadius(era.id), era.id).toBe(eraBuildableRadius(era.id));
      unclamped += 1;
    }
    // FLOOR: three eras are unclamped, so the equality is not holding over an empty set.
    expect(unclamped).toBe(3);
  });

  it("never exceeds the authored budget, and never drops below era one's", () => {
    expect(ERA_SEQUENCE).toHaveLength(10);
    let previous = 0;
    for (const era of ERA_SEQUENCE) {
      const disc = eraBuildableDiscRadius(era.id);
      // Never on water: the disc plus the margin is inside the land the era is drawn on.
      expect(disc + GRASS_OVER_BUILDABLE, era.id).toBeLessThanOrEqual(
        eraLandRadius(era.id),
      );
      // Never past what the era's own budget authored.
      expect(disc, era.id).toBeLessThanOrEqual(eraBuildableRadius(era.id));
      // Never below era one's, and never backwards, which is what makes a saved transform safe.
      expect(disc, era.id).toBeGreaterThanOrEqual(BUILDABLE_RADIUS);
      expect(disc, era.id).toBeGreaterThanOrEqual(previous);
      previous = disc;
    }
  });

  it("names what the growth ceiling costs, rather than leaving it a silence", () => {
    // Seven eras get less disc than their budget authored, and this is by how much. It is the
    // road lane's depth budget that would close it (era design §13), so the number belongs
    // somewhere a reviewer reads rather than in a comment.
    const shortfall = ERA_SEQUENCE.filter((era) => eraLandIsClamped(era.id)).map(
      (era) =>
        [era.id, eraBuildableRadius(era.id) - eraBuildableDiscRadius(era.id)] as const,
    );
    expect(shortfall).toEqual([
      ["classical", 4],
      ["medieval", 8],
      ["renaissance", 13],
      ["industrial", 17],
      ["atomic_age", 22],
      ["information_age", 26],
      ["cyberpunk", 31],
    ]);
  });
});
