import { hardWinterIsland } from "@cr/game";
import { ERA_SEQUENCE, type EraId, getEraOrThrow } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import {
  CRISIS_CONTENT_ERAS,
  canPlayCrisisIn,
  crisisPlayableEras,
  describeCrisisEra,
  resolveCrisisEra,
} from "./crisisEra";
import { WINTER_ITEM_POOL } from "./hardWinterItems";

/**
 * **WHOSE CRISIS THE HARD WINTER PLAYS, and the copy that has to travel with it.**
 *
 * THE DEFECT: every `hardWinterIsland` call site passed `CURRENT_ERA_ID`, and the entry chip's
 * hover asserted *"Play era one's mid-era crisis on this island"*. That was harmless only
 * because the island never re-dressed. It does now, so a crisis silently pinned to era one
 * under era three's ground is a mismatch a player can see, and a hover that names era one is a
 * sentence that goes quietly false the day a second era's winter is built.
 *
 * ## ⚑ THE BLOCKER MOVED, and this file is scoped to the half that still binds
 *
 * These guards were written when the blocker was the LAND: `hardWinterIsland` opened with
 * `eraBuildableRadius`, which threw for nine of the ten eras, and the pinned case was derived
 * from `land.status`. **All ten land budgets are authored now** (D-ERA25), so land no longer
 * discriminates and a guard scoped to it would be measuring a constant.
 *
 * What still binds is the CONTENT: the winter draws its questions from `WINTER_ITEM_POOL`,
 * which is era one's `D1_PRACTICE_ITEMS`. So the pinned case is re-derived from the real item
 * pool rather than from the land, which is the fact that actually makes a later era
 * unplayable, and the day a second era's items land this file goes red at the census below
 * instead of the encounter silently repointing at an era it cannot ask a question in.
 */

/** Whether the winter's real question pool holds an item for any of an era's nodes. */
function hasWinterItems(eraId: EraId): boolean {
  const nodes = new Set(getEraOrThrow(eraId).nodes);
  return WINTER_ITEM_POOL.some((item) => nodes.has(item.node_id));
}

describe("the crisis follows the city as far as its built winters allow", () => {
  it("offers a live board exactly where the winter is built, and a named pin elsewhere", () => {
    const playable = crisisPlayableEras();
    let live = 0;
    let pinned = 0;

    for (const era of ERA_SEQUENCE) {
      const crisis = resolveCrisisEra(era.id);
      expect(crisis.liveEraId, era.id).toBe(era.id);
      // The board's era is ALWAYS one a board can be built from, which is the property that
      // keeps the surface from resolving an era it cannot draw a question in.
      expect(canPlayCrisisIn(crisis.eraId), era.id).toBe(true);
      expect(() => hardWinterIsland(crisis.eraId), era.id).not.toThrow();

      if (canPlayCrisisIn(era.id)) {
        live += 1;
        expect(crisis.board, era.id).toBe("live");
        expect(crisis.eraId, era.id).toBe(era.id);
      } else {
        pinned += 1;
        expect(crisis.board, era.id).toBe("pinned");
        expect(crisis.eraId, era.id).not.toBe(era.id);
        expect(crisis.eraId, era.id).toBe(playable[0]);
        // AND THE REASON IS REAL, re-derived from the pool the encounter actually draws
        // from: this era has ground now, and not one question to ask on it. So the pin is a
        // constraint rather than a preference somebody could have chosen differently.
        expect(hasWinterItems(era.id), `${era.id} has winter items after all`).toBe(false);
        // THE HALF THAT USED TO BE THE REASON, asserted as the change it is: the island
        // builds for this era, so land is no longer what stops the crisis moving here.
        expect(() => hardWinterIsland(era.id), era.id).not.toThrow();
      }
    }

    // FLOORS ON BOTH VERDICTS, derived rather than written down: without the second there
    // would be no pinned case under test, and without the first no live one.
    expect(live + pinned).toBe(ERA_SEQUENCE.length);
    expect(ERA_SEQUENCE.length).toBeGreaterThanOrEqual(10);
    expect(live).toBe(playable.length);
    expect(live).toBeGreaterThanOrEqual(1);
    expect(pinned).toBeGreaterThanOrEqual(8);
  });

  it("derives the content set from the real item pool, so a second era's items fail here", () => {
    // **THE TRIPWIRE, MOVED TO WHERE ITS SUBJECT LIVES.** It used to be
    // `hard-winter-pool.test.ts`'s *"has one era whose land is authored"*, and land stopped
    // being the discriminator. What discriminates is the item pool, which the engine cannot
    // see and this file can, so the census is here now: `CRISIS_CONTENT_ERAS` must be exactly
    // the eras the winter's own pool can ask a question about.
    const withItems = ERA_SEQUENCE.filter((era) => hasWinterItems(era.id)).map(
      (era) => era.id,
    );
    const withoutItems = ERA_SEQUENCE.filter((era) => !hasWinterItems(era.id)).map(
      (era) => era.id,
    );
    expect(withItems).toEqual([...CRISIS_CONTENT_ERAS]);
    expect(crisisPlayableEras()).toEqual([...CRISIS_CONTENT_ERAS]);
    // Both directions with a floor under each, so neither list can be satisfied by an empty
    // population and the pool cannot quietly cover an era nobody declared.
    expect(withItems.length + withoutItems.length).toBe(ERA_SEQUENCE.length);
    expect(withItems.length).toBeGreaterThanOrEqual(1);
    expect(withoutItems.length).toBeGreaterThanOrEqual(8);
    expect(WINTER_ITEM_POOL.length).toBeGreaterThan(0);
  });

  it("names the era in the copy only when the crisis is not the city's own age", () => {
    const first = ERA_SEQUENCE[0];
    const laterUnplayable = ERA_SEQUENCE.find((era) => !canPlayCrisisIn(era.id));
    expect(first).toBeDefined();
    expect(laterUnplayable).toBeDefined();

    const own = resolveCrisisEra(first?.id ?? "prehistoric");
    const borrowed = resolveCrisisEra(laterUnplayable?.id ?? "bronze_age");

    // The city's own age says so WITHOUT naming an era, so the sentence cannot go stale.
    const ownPhrase = describeCrisisEra(own, getEraOrThrow(own.eraId).name);
    expect(ownPhrase).toBe("this age's mid-era crisis");
    for (const era of ERA_SEQUENCE) {
      expect(ownPhrase, era.id).not.toContain(era.name);
    }

    // A pinned board names the era it IS, and says why — which is the honest version of the
    // sentence that used to be hardcoded.
    const borrowedPhrase = describeCrisisEra(borrowed, getEraOrThrow(borrowed.eraId).name);
    expect(borrowedPhrase).toContain(getEraOrThrow(borrowed.eraId).name);
    expect(borrowedPhrase).not.toContain(getEraOrThrow(borrowed.liveEraId).name);
    expect(borrowedPhrase).toMatch(/only age whose winter is built/i);
    // The sentence no longer blames the LAND, because the land is authored in every era and a
    // hover saying otherwise would be a false statement about the tree.
    expect(borrowedPhrase).not.toMatch(/land is authored/i);
    // ...and the two really are different sentences, so this is not passing on one string.
    expect(borrowedPhrase).not.toBe(ownPhrase);
  });

  /**
   * The playable set is DERIVED, and this is what would fail if it were ever replaced by a
   * literal: it agrees with the two sources era by era, in sequence order, both ways.
   */
  it("derives the playable set from the registry and the pool rather than from a list", () => {
    const derived: EraId[] = ERA_SEQUENCE.filter(
      (era) => getEraOrThrow(era.id).land.status === "authored" && hasWinterItems(era.id),
    ).map((era) => era.id);
    expect(crisisPlayableEras()).toEqual(derived);
    expect(derived.length).toBeGreaterThanOrEqual(1);
    // BOTH CONJUNCTS ARE REALLY READ. Land alone would admit all ten, which is what makes the
    // conjunction load-bearing rather than decorative now that no era is unauthored.
    expect(
      ERA_SEQUENCE.filter((era) => getEraOrThrow(era.id).land.status === "authored"),
    ).toHaveLength(ERA_SEQUENCE.length);
    expect(derived.length).toBeLessThan(ERA_SEQUENCE.length);
  });
});
