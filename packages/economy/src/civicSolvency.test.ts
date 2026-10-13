import {
  buildableCellCount,
  ERA_LAND_DEMAND,
  ERA_ONE_FILL_RATIO,
  ERA_SEQUENCE,
  type EraId,
  eraBuildableRadius,
  eraLandDemand,
  occupiedLandCells,
} from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import type { CivicCapacityProfile } from "./capacity";
import { greedyPlanCost, isSolvent } from "./capacity";
import {
  civicBuildingForRole,
  civicCatalogueForEra,
  civicFootprintCells,
} from "./civicCatalogue";
import { DRILL_PAID_SETS_PER_ERA, EARN, ERA_MATERIAL_TOTAL } from "./constants";
import { islandFoundingGrant, lessonCompleteGrant } from "./earn";
import { eraCostMultiplier, lessonMaterialAmount } from "./materials";

/**
 * **THE SOLVENCY SWEEP (INV-ERA-4 / D-ERA15): can a learner afford the capacity
 * their population needs, in every era?**
 *
 * The design record has carried this as open for exactly one reason — *"a civic
 * catalogue and the retuned population curve"* — and half of that now exists. This
 * file is what the catalogue makes answerable.
 *
 * ## Money and land, and the land half is answerable for all ten now
 *
 * This section used to open *"only one is answerable"*, because `eraBuildableRadius()` threw
 * for nine of the ten eras. All ten land budgets are authored (D-ERA25, and the requirement
 * is D-ET8 beat two), so:
 *
 *  - **The MONEY question is answerable for all ten eras as a TUNING question.** Lesson
 *    rates and catalogue costs are both authored for every era, so the arithmetic
 *    closes everywhere.
 *  - **As a question about the PRODUCT it is answerable for era one only**, and that is
 *    the same shape as land rather than a different one. `materialForEra` returns `null`
 *    for every `proposed` entry and `ERA_MATERIALS` authors exactly one era, so a lesson
 *    completed in eras two to ten pays XP and no material whatsoever. Nine of the ten
 *    rows below are therefore what the code WOULD pay once their materials are authored.
 *    The sweep used to call that column `earnable`, which is the word for the one thing
 *    it is not; it is `projected` now, `mintable` measures what is really credited, and
 *    a census names which eras are which.
 *  - **The LAND question is answerable for all ten**, and the assertion that nine eras
 *    THROW is gone because it would now be false rather than because it stopped being
 *    convenient. What replaces it is the check it was standing in for: every era's cheapest
 *    closing city, plus everything standing from the eras before it, against that era's
 *    authored disc.
 *
 * **THIS FILE OWNS ONE COLUMN OF THE D-ERA25 DERIVATION AND NO OTHER.**
 * `ERA_LAND_DEMAND` (`packages/skill-graph/src/eras.ts`) records cumulative skill cells,
 * cumulative civic cells and the hall per era, and `skill-graph` cannot import a catalogue
 * that imports it, so the civic column is authored there and DERIVED here by exhaustive
 * search over `CIVIC_CATALOGUE`. Deriving rather than pinning is the whole point: #293
 * re-priced seven catalogues and silently invalidated an earlier version of that table,
 * which is the failure a pinned column cannot report. The skill and hall columns are
 * derived in `apps/web/src/city/eraLandBudget.test.ts`, the only place all three sources
 * can be imported at once.
 *
 * Blurring any of them would be the more comfortable report and the less true one. A
 * green solvency sweep over income no era can receive is worse than a red one, because
 * it is the same reassurance with none of the meaning.
 *
 * ## Population is derived, not simulated
 *
 * An era's population target is its own headline magnitude: era one sustains ~60
 * (era one §4) against a headline of 20, so the target is `3 ×` the magnitude, which
 * is `60 × 2^(N-1)`. That is a pure function of which era you are in, and an era is
 * reached only by learning — no clock, no simulation, nothing to seed.
 *
 * ## What the numbers here are NOT
 *
 * `greedyPlanCost` is an UPPER BOUND on cost: it prices the two axes separately and
 * so cannot see that a blend row covers both at once. Solvency measured against it
 * is therefore CONSERVATIVE — it can under-report solvency and never over-report it,
 * which is the safe direction for a guarantee.
 *
 * This file prices the EXACT optimum too, by exhaustive search over building counts
 * ({@link optimalPlanCost}), and reports both. The exact figure is what tells us era
 * one's true minimum is 520 rather than the bound's 540 — four Family Lodges and two
 * Campfires beat the greedy plan, because the Lodge's 5 happiness is invisible to a
 * per-axis price.
 *
 * **ERA ONE IS THE ONLY ERA WHERE THAT STILL PAYS, AS OF 2026-07-30.** It used to be
 * three, and the 2026-07-30 per-era cost-variance ruling is why it is one: the
 * substitution needs a dwelling that carries a secondary happiness AND costs no more than
 * its era's food row, and eras two and three had that only because they priced the two
 * rows identically — which is exactly the uniformity the ruling removed. The set is now
 * derived from the catalogue and compared to the gap list, so the two cannot drift.
 *
 * ## THE LADDER SETS WHAT A CITY COSTS; THE ERA SETS WHICH OF THE FOUR PAYS FOR IT
 *
 * The cost-variance ruling (team lead, 2026-07-30) re-priced seven of the ten catalogues
 * and **moved no figure in the greedy table below**, which is not luck. The greedy plan
 * buys three of the cheaper livability row and three amenities, so an era's city price is
 * `3 × (min(food, dwelling) + amenity)` — and every re-priced era holds that sum at 180 at
 * era-one scale, exactly where it was. So the era's total city price is a property of the
 * LADDER, and which of the four an era makes dearest is a property of the ERA. That split
 * is what let a design ruling land without reopening INV-ERA-4.
 *
 * ## ALL TEN ERAS ARE SOLVENT, and it took a normalisation rather than a re-price
 *
 * **Four eras were insolvent when this sweep was first written, and every shortfall
 * survived exact pricing** — so they were facts about the numbers, not artefacts of
 * the bound. The cause was structural: supply was a flat per-lesson amount, so an
 * era's total income depended on how many lessons it happened to have, while its need
 * did not. Solvency reduced to `lessons >= 6`, and the four five-node eras failed.
 *
 * `ERA_MATERIAL_TOTAL` is now the authored constant and the per-lesson rate is derived
 * from it ({@link lessonMaterialAmount}), which removes `lessons` from the supply side
 * entirely. Every era clears by construction, and the insolvent census below is
 * asserted EMPTY over a population of ten rather than deleted — a sweep that closed
 * because it stopped looking is the failure mode this file's own history warns about.
 */

/** The catalogue as the profiles `greedyPlanCost` prices against. */
function profilesFor(eraId: EraId): CivicCapacityProfile[] {
  return civicCatalogueForEra(eraId).map((building) => ({
    livability: building.provides.livability,
    happiness: building.provides.happiness,
    cost: building.cost,
  }));
}

/** A priced row with the ground it takes: the land half of the same catalogue. */
interface CivicLandProfile extends CivicCapacityProfile {
  readonly cells: number;
}

function landProfilesFor(eraId: EraId): CivicLandProfile[] {
  return civicCatalogueForEra(eraId).map((building) => ({
    livability: building.provides.livability,
    happiness: building.provides.happiness,
    cost: building.cost,
    cells: civicFootprintCells(building),
  }));
}

/**
 * Lessons in an era, from the skill graph. Era one has six; the others have their
 * own curated node sets, and this reads them rather than assuming a number.
 */
function lessonsIn(eraId: EraId): number {
  const era = ERA_SEQUENCE.find((entry) => entry.id === eraId);
  return era === undefined ? 0 : era.nodes.length;
}

/**
 * What completing every lesson in the era **would** pay, at that era's scale — the
 * DESIGNED supply, and for nine eras out of ten a projection rather than a payout.
 *
 * The rate is DERIVED from {@link ERA_MATERIAL_TOTAL} and the era's node count, so
 * this product lands within 3 of the era total at era-one scale whatever the node
 * count is. It used to be `lessons × a flat constant`, which is why an era's supply
 * used to depend on its size.
 *
 * **IT DELIBERATELY BYPASSES THE AUTHORED-MATERIAL GATE, and it is named for that.**
 * `lessonCompleteGrant` resolves the era's material through `materialForEra`, which
 * returns `null` for every `proposed` entry and so omits the payout key entirely —
 * nine eras credit XP and nothing else today. Reading `lessonMaterialAmount` directly
 * skips that, which is right for a question about the TUNING and wrong for a question
 * about the PRODUCT. This function answers the first; {@link mintedSupplyIn} answers
 * the second, and the census below asserts which eras are which so the two can never
 * be read for each other again. It used to be called `earnable`, which claimed the
 * thing that is not true.
 */
function projectedSupplyIn(eraId: EraId): number {
  return lessonsIn(eraId) * lessonMaterialAmount(eraId);
}

/**
 * What completing every lesson in the era **actually credits today**, measured by
 * driving the shipped recipe rather than by re-deriving its arithmetic.
 *
 * `lessonCompleteGrant` is the only thing that mints lesson material, so calling it
 * over the era's real node ids puts the authored gate inside the measurement instead of
 * beside it. Summed over every key but `xp`, so it reads the material whatever the era's
 * material is called and returns 0 for an era that carries no payout key at all.
 */
function mintedSupplyIn(eraId: EraId): number {
  const era = ERA_SEQUENCE.find((entry) => entry.id === eraId);
  if (era === undefined) {
    return 0;
  }
  let total = 0;
  const grants = [
    islandFoundingGrant({
      studentId: "solvency-sweep",
      eraId,
      nowMs: 0,
    }),
    ...era.nodes.map((nodeId) =>
      lessonCompleteGrant({
        studentId: "solvency-sweep",
        nodeId,
        nowMs: 0,
      }),
    ),
  ];
  for (const { amounts } of grants) {
    for (const [resource, amount] of Object.entries(amounts)) {
      if (resource !== "xp") {
        total += amount ?? 0;
      }
    }
  }
  return total;
}

/**
 * The era's headline magnitude, `20 × 2^(N-1)` — the number one dwelling sustains.
 */
function headlineMagnitude(eraId: EraId): number {
  return 20 * eraCostMultiplier(eraId);
}

/**
 * The capacity the era's population needs: three times the headline magnitude on
 * both axes, i.e. era one's ~60 sustained with happiness covering it.
 */
function targetFor(eraId: EraId): { livability: number; happiness: number } {
  const people = 3 * headlineMagnitude(eraId);
  return { livability: people, happiness: people };
}

/**
 * The TRUE minimum cost of a plan reaching both targets, by exhaustive search over
 * whole-building counts.
 *
 * `greedyPlanCost` is an upper bound and cannot see a blend row covering both axes,
 * so a shortfall it reports might not be a real one. This closes that gap, and it is
 * cheap to do exactly: contributions scale with the target, so no row is ever needed
 * more than about seven times and the search is a few thousand pruned branches.
 *
 * It is a TEST-ONLY function on purpose. Shipping it would put an exhaustive search
 * on a path the HUD could call, and `greedyPlanCost`'s conservative bound is the
 * right thing for a runtime guarantee — being wrong in the safe direction beats being
 * exact and slow. What the exact number is for is deciding whether an authored era's
 * numbers actually close, which is a question asked at review time, not at runtime.
 */
/**
 * Every MINIMUM-COST plan's footprint, in cells. The same search as
 * {@link optimalPlanCost} carrying the land column, and collecting ties rather than stopping
 * at the first winner.
 *
 * **TIES ARE COLLECTED BECAUSE ONE ERA HAS ONE.** The D-ERA25 civic column is "the cells the
 * cheapest closing city takes", and since #293 re-priced era two, three Granaries plus three
 * Bread Ovens (18 cells) and four Village Houses plus two Bread Ovens (24 cells) both cost
 * exactly 1,080 grain. A learner may buy either, so the budget owes the LARGER, and this
 * returns the whole set so the tie-break is visible rather than hidden inside a search.
 */
function optimalPlanCells(
  catalogue: readonly CivicLandProfile[],
  target: { livability: number; happiness: number },
): { cost: number; cells: number[] } {
  const ceilings = catalogue.map((row) =>
    Math.max(
      row.livability > 0 ? Math.ceil(target.livability / row.livability) : 0,
      row.happiness > 0 ? Math.ceil(target.happiness / row.happiness) : 0,
    ),
  );
  let best = Number.POSITIVE_INFINITY;
  let cells: number[] = [];

  const search = (
    index: number,
    livability: number,
    happiness: number,
    cost: number,
    used: number,
  ): void => {
    if (cost > best) {
      return;
    }
    if (livability >= target.livability && happiness >= target.happiness) {
      if (cost < best) {
        best = cost;
        cells = [used];
      } else {
        cells.push(used);
      }
      return;
    }
    if (index >= catalogue.length) {
      return;
    }
    const row = catalogue[index];
    const ceiling = ceilings[index];
    if (row === undefined || ceiling === undefined) {
      return;
    }
    for (let count = 0; count <= ceiling; count += 1) {
      search(
        index + 1,
        livability + count * row.livability,
        happiness + count * row.happiness,
        cost + count * row.cost,
        used + count * row.cells,
      );
    }
  };

  search(0, 0, 0, 0, 0);
  return { cost: best, cells: [...new Set(cells)].sort((a, b) => a - b) };
}

/**
 * The most CELLS an era's catalogue can put on the ground for a given purse, ignoring the
 * capacity targets entirely. This is the land question the scarcity ruling asks (can a learner
 * buy more building than they have ground for) and it is deliberately the greediest possible
 * reading of what an era's economy can afford.
 */
function maxAffordableCells(
  catalogue: readonly CivicLandProfile[],
  budget: number,
): number {
  let best = 0;
  const search = (index: number, spent: number, cells: number): void => {
    if (cells > best) {
      best = cells;
    }
    if (index >= catalogue.length) {
      return;
    }
    const row = catalogue[index];
    if (row === undefined) {
      return;
    }
    const ceiling = Math.floor((budget - spent) / row.cost);
    for (let count = 0; count <= ceiling; count += 1) {
      search(index + 1, spent + count * row.cost, cells + count * row.cells);
    }
  };
  search(0, 0, 0);
  return best;
}

function optimalPlanCost(
  catalogue: readonly CivicCapacityProfile[],
  target: { livability: number; happiness: number },
): number {
  const ceilings = catalogue.map((row) =>
    Math.max(
      row.livability > 0 ? Math.ceil(target.livability / row.livability) : 0,
      row.happiness > 0 ? Math.ceil(target.happiness / row.happiness) : 0,
    ),
  );
  let best = Number.POSITIVE_INFINITY;

  const search = (
    index: number,
    livability: number,
    happiness: number,
    cost: number,
  ): void => {
    if (cost >= best) {
      return;
    }
    if (livability >= target.livability && happiness >= target.happiness) {
      best = cost;
      return;
    }
    if (index >= catalogue.length) {
      return;
    }
    const row = catalogue[index];
    const ceiling = ceilings[index];
    if (row === undefined || ceiling === undefined) {
      return;
    }
    for (let count = 0; count <= ceiling; count += 1) {
      search(
        index + 1,
        livability + count * row.livability,
        happiness + count * row.happiness,
        cost + count * row.cost,
      );
    }
  };

  search(0, 0, 0, 0);
  return best;
}

/** A row of the report, by era. Throws rather than returning undefined. */
function reportFor(eraId: EraId): EraMoneyReport {
  const row = moneyReport.find((entry) => entry.era === eraId);
  if (row === undefined) {
    throw new Error(`solvency sweep produced no row for era "${eraId}"`);
  }
  return row;
}

interface EraMoneyReport {
  readonly era: EraId;
  readonly lessons: number;
  /** The DESIGNED supply — {@link projectedSupplyIn}, which skips the authored gate. */
  readonly projected: number;
  /** What the era actually credits today — {@link mintedSupplyIn}. Zero for nine. */
  readonly mintable: number;
  /** `greedyPlanCost` — an UPPER BOUND, which is what the shipped predicate uses. */
  readonly needed: number;
  /** The exhaustive minimum. Never above {@link needed}. */
  readonly optimal: number;
  readonly solvent: boolean;
  readonly headroom: number;
  /** Solvency against the EXACT cost — the claim that survives review. */
  readonly solventAtOptimum: boolean;
  readonly optimalHeadroom: number;
  /**
   * Solvency against income the era can actually RECEIVE. False for the nine eras whose
   * material is still a proposal, which is a measurement rather than a failure — the
   * census names them, and every other verdict in this file is about the tuning.
   */
  readonly solventToday: boolean;
}

const moneyReport: readonly EraMoneyReport[] = ERA_SEQUENCE.map((era) => {
  const projected = projectedSupplyIn(era.id);
  const mintable = mintedSupplyIn(era.id);
  const profiles = profilesFor(era.id);
  const target = targetFor(era.id);
  const needed = greedyPlanCost(profiles, target);
  const optimal = optimalPlanCost(profiles, target);
  return {
    era: era.id,
    lessons: lessonsIn(era.id),
    projected,
    mintable,
    solventToday: needed !== null && isSolvent(mintable, needed),
    needed: needed ?? Number.POSITIVE_INFINITY,
    optimal,
    solvent: needed !== null && isSolvent(projected, needed),
    headroom: needed === null ? Number.NEGATIVE_INFINITY : projected - needed,
    solventAtOptimum: isSolvent(projected, optimal),
    optimalHeadroom: projected - optimal,
  };
});

describe("the MONEY half of solvency — a tuning answer for ten eras, a product answer for one", () => {
  it("prices a plan for every era, so no era drops out of the sweep", () => {
    // A `null` from `greedyPlanCost` means no catalogue row supplies an axis, which
    // is a fact about the catalogue rather than an affordability answer — it must not
    // read as "free" and must not silently shrink this population.
    expect(moneyReport.length).toBe(ERA_SEQUENCE.length);
    expect(moneyReport.length).toBeGreaterThanOrEqual(10);
    for (const row of moneyReport) {
      expect(Number.isFinite(row.needed), `${row.era} priced no plan`).toBe(true);
      expect(row.projected, `${row.era} projects nothing`).toBeGreaterThan(0);
      expect(row.lessons, `${row.era} has no lessons`).toBeGreaterThan(0);
    }
  });

  it("names the eras whose lesson income can actually be MINTED, as a census", () => {
    // **THE GATE THIS SWEEP USED TO MEASURE AROUND, NOW OPEN** (defect D-5, closed
    // 2026-07-30). This census read `["prehistoric"]` against nine eras measured at
    // zero: `materialForEra` returned null for every era whose words were unauthored,
    // so `lessonCompleteGrant` omitted the payout key entirely and eras two to ten paid
    // XP and nothing else. Minting no longer reads that flag.
    //
    // It stays a census in BOTH directions, and the direction that matters has flipped:
    // the list that must be empty is now the one that used to hold nine.
    const mints = moneyReport.filter((row) => row.mintable > 0).map((row) => row.era);
    const mintsNothing = moneyReport
      .filter((row) => row.mintable === 0)
      .map((row) => row.era);
    expect(mints).toEqual(ERA_SEQUENCE.map((era) => era.id));
    expect(mintsNothing).toEqual([]);
    // The floor under both, so neither list can be satisfied by an empty population.
    expect(mints.length + mintsNothing.length).toBe(10);
    expect(mints.length).toBeGreaterThanOrEqual(10);

    // **MINTED EQUALS PROJECTED, PER ERA.** The stronger claim, and the one that says the
    // gate is fully open rather than partly: every era credits exactly what the tuning
    // says it should, so `projected` is no longer a projection anywhere. Asserted per
    // row rather than in aggregate, because a sum can be right while two rows are wrong
    // in opposite directions.
    for (const row of moneyReport) {
      expect(row.mintable, `${row.era} does not mint its designed supply`).toBe(
        row.projected,
      );
      expect(row.mintable, `${row.era} mints nothing`).toBeGreaterThan(0);
      expect(row.solventToday, `${row.era} is not solvent on real income`).toBe(true);
    }

    // AND THE DIRECTION THAT MAKES THIS EXPIRE. Era two was the era this census named
    // first when the gate was shut, so it is named again now that it is open: a
    // regression that re-gates minting on authored words fails here first.
    expect(mints).toContain("neolithic");
    expect(reportFor("neolithic").mintable).toBe(1200);
  });

  it("makes solvency a claim about the PRODUCT in all ten eras, not a projection", () => {
    // The distinction this file was built around — `solvent` is a tuning verdict over
    // `projected`, `solventToday` is a product verdict over what is really credited —
    // and the two now agree everywhere. Kept rather than collapsed: the day a lesson
    // stops paying its era's material, these two diverge again and this is what says so.
    const eraOne = reportFor("prehistoric");
    expect(eraOne.mintable).toBe(600);
    expect(eraOne.solventToday).toBe(true);
    expect(moneyReport.filter((row) => row.solventToday)).toHaveLength(10);
    expect(moneyReport.filter((row) => row.solvent)).toHaveLength(10);
    // Stated as the equality rather than as two counts, so a population that shrank
    // could not satisfy both halves by being empty.
    expect(moneyReport.map((row) => row.solventToday)).toEqual(
      moneyReport.map((row) => row.solvent),
    );
    expect(moneyReport.length).toBeGreaterThanOrEqual(10);
  });

  it("clears every era against the EXACT optimum on income a learner can really earn", () => {
    // **THE RECOMPUTED SOLVENCY TABLE.** Every other solvency assertion in this file is
    // computed from `projected`, which bypasses the mint path by design. This one is
    // computed from `mintable` — driven through `lessonCompleteGrant` — against the
    // exhaustive optimum, which is the question "can a learner actually finish this
    // era's city" rather than "do the authored numbers close".
    //
    // The greedy bound is reported beside it because it is the conservative one and the
    // one the shipped predicate uses; the two differ in exactly ONE era, and because four
    // dwellings supply precisely one amenity's worth of happiness for less.
    //
    // **THREE ERAS UNTIL 2026-07-30, AND THE VARIANCE RULING IS WHY IT IS NOW ONE.** That
    // substitution only pays when a dwelling costs no more than the food row, which was
    // true in eras one, two and three because all three priced the two rows identically —
    // the uniformity the ruling removed. Era two's dwelling is now 20 grain dearer than
    // its Granary and era three's is 80 bronze dearer than its Fields, so four dwellings
    // stop being a bargain and the bound becomes exact there. Era one is unchanged and
    // keeps the gap, which is what makes the mechanism still visible at all.
    const table = moneyReport.map((row) => ({
      era: row.era,
      mintable: row.mintable,
      optimal: row.optimal,
      surplus: row.mintable - row.optimal,
      greedySurplus: row.mintable - row.needed,
    }));
    expect(table).toEqual([
      { era: "prehistoric", mintable: 600, optimal: 520, surplus: 80, greedySurplus: 60 },
      { era: "neolithic", mintable: 1200, optimal: 1080, surplus: 120, greedySurplus: 120 },
      {
        era: "bronze_age",
        mintable: 2400,
        optimal: 2160,
        surplus: 240,
        greedySurplus: 240,
      },
      { era: "classical", mintable: 4800, optimal: 4320, surplus: 480, greedySurplus: 480 },
      { era: "medieval", mintable: 9600, optimal: 8640, surplus: 960, greedySurplus: 960 },
      {
        era: "renaissance",
        mintable: 19200,
        optimal: 17280,
        surplus: 1920,
        greedySurplus: 1920,
      },
      {
        era: "industrial",
        mintable: 38400,
        optimal: 30720,
        surplus: 7680,
        greedySurplus: 7680,
      },
      {
        era: "atomic_age",
        mintable: 76797,
        optimal: 69120,
        surplus: 7677,
        greedySurplus: 7677,
      },
      {
        era: "information_age",
        mintable: 153600,
        optimal: 138240,
        surplus: 15360,
        greedySurplus: 15360,
      },
      {
        era: "cyberpunk",
        mintable: 307197,
        optimal: 245760,
        surplus: 61437,
        greedySurplus: 61437,
      },
    ]);
    // Every era clears on BOTH readings, stated as a census of the failures rather than
    // as a count of the successes — an empty failure list with a floor under the
    // population is the shape that cannot pass by measuring nothing.
    expect(table.filter((row) => row.surplus <= 0)).toEqual([]);
    expect(table.filter((row) => row.greedySurplus <= 0)).toEqual([]);
    expect(table).toHaveLength(10);
    // The era where the true optimum beats the bound, and by how much. The mechanism is
    // exact rather than approximate, so the gap is pinned exactly.
    expect(
      table
        .filter((row) => row.surplus !== row.greedySurplus)
        .map((row) => [row.era, row.surplus - row.greedySurplus]),
    ).toEqual([["prehistoric", 20]]);
  });

  it("derives WHICH eras can beat the bound from the catalogue, and matches the measurement", () => {
    // **ITS OWN `it` DELIBERATELY.** This is the claim about the mechanism rather than the
    // figures, and sharing a block with the table pinned above meant an injected price
    // tripped that `toEqual` first and this never ran — the failure mode
    // `.cursor/rules/qa-verification.mdc` names, and the reason the payout margin next to
    // `CAP` is a test of its own too. Measured: injecting a cheap era-nine blend fails the
    // table above and left these lines unexecuted.
    //
    // THE DERIVATION, in three clauses, because two of them are not enough. A dwelling's
    // secondary happiness is a QUARTER of the era magnitude wherever it exists, so four
    // dwellings supply exactly one amenity's worth of happiness. Buying that fourth
    // dwelling instead of the third amenity therefore pays when:
    //
    //  1. the dwelling carries a secondary happiness at all — era ten's does not, which is
    //     why the run's cheapest dwelling has no gap; its FOOD row carries the secondary;
    //  2. the dwelling costs no more than its era's food row, or the greedy plan would not
    //     have been buying food in the first place;
    //  3. the dwelling costs less than its era's amenity, since `4d < 3d + a` reduces to
    //     exactly `d < a`.
    //
    // **The equality is the check, not the derivation.** A gap arriving by some other
    // route — a blend row cheap enough to undercut the per-axis plan, say — makes the two
    // lists disagree and fails here, which is the outcome that sends a human to look
    // rather than one that quietly re-derives itself. Proven by injection: era nine's
    // blend at 20,480 gives that era a gap by the blend route and fails this line by name.
    const canBeatTheBound = ERA_SEQUENCE.filter((era) => {
      const dwelling = civicBuildingForRole(era.id, "dwelling");
      const food = civicBuildingForRole(era.id, "food");
      const amenity = civicBuildingForRole(era.id, "amenity");
      return (
        dwelling.provides.happiness > 0 &&
        dwelling.cost <= food.cost &&
        dwelling.cost < amenity.cost
      );
    }).map((era) => era.id);
    expect(
      canBeatTheBound,
      "the eras whose catalogue lets a fourth dwelling undercut a third amenity must be " +
        "exactly the eras where the exhaustive optimum beats the greedy bound",
    ).toEqual(moneyReport.filter((row) => row.needed > row.optimal).map((row) => row.era));
    // A floor with a SHAPE under the equality, since two empty lists are also equal: the
    // population it is derived over must be all ten eras, and at least one era must
    // actually qualify, or this passes over a catalogue where the mechanism has vanished.
    expect(moneyReport).toHaveLength(10);
    expect(canBeatTheBound).toEqual(["prehistoric"]);
  });

  it("re-derives era one at 600 projected against 540 needed", () => {
    // Re-derived from the CATALOGUE rather than the fixtures `capacity.test.ts` uses,
    // which is the point of this file: the same two numbers, now read off shipped
    // data. 6 lessons x 100 stone against 240 of livability (3 rows of 20 at 80) plus
    // 300 of happiness (3 Campfires at 100). Era one is the era whose 600 the
    // normalisation ANCHORED on, so this row is unchanged by it.
    const eraOne = reportFor("prehistoric");
    expect(eraOne.era).toBe("prehistoric");
    expect(eraOne.lessons).toBe(6);
    expect(eraOne.projected).toBe(600);
    expect(eraOne.needed).toBe(540);
    expect(eraOne.solvent).toBe(true);
    expect(eraOne.headroom).toBe(60);
  });

  it("reports every era's figures, pinned so none of them can move unnoticed", () => {
    // THE REPORT, as data. Measured, not predicted: the first version of this test
    // asserted that era one was the only solvent era, the measurement said six, and
    // normalising the era total took it to ten.
    expect(
      moneyReport.map(({ era, lessons, projected, needed, headroom, solvent }) => ({
        era,
        lessons,
        projected,
        needed,
        headroom,
        solvent,
      })),
    ).toEqual([
      {
        era: "prehistoric",
        lessons: 6,
        projected: 600,
        needed: 540,
        headroom: 60,
        solvent: true,
      },
      {
        era: "neolithic",
        lessons: 5,
        projected: 1200,
        needed: 1080,
        headroom: 120,
        solvent: true,
      },
      {
        era: "bronze_age",
        lessons: 5,
        projected: 2400,
        needed: 2160,
        headroom: 240,
        solvent: true,
      },
      {
        era: "classical",
        lessons: 5,
        projected: 4800,
        needed: 4320,
        headroom: 480,
        solvent: true,
      },
      {
        era: "medieval",
        lessons: 5,
        projected: 9600,
        needed: 8640,
        headroom: 960,
        solvent: true,
      },
      {
        era: "renaissance",
        lessons: 6,
        projected: 19200,
        needed: 17280,
        headroom: 1920,
        solvent: true,
      },
      {
        era: "industrial",
        lessons: 6,
        projected: 38400,
        needed: 30720,
        headroom: 7680,
        solvent: true,
      },
      // The two nine-node eras are the only rows the normalisation cannot land
      // exactly: 600 does not divide by 9, so the derived rate rounds DOWN
      // (`Math.round(76800 / 9) = 8533`, not 8534) and the era total comes in 3 UNDER
      // at this era's scale — 76,797 against 76,800. Three at era eight's ×128 is
      // 0.023 at era-one scale, which is why it costs solvency nothing: 599.977 still
      // clears a need of 540. This comment said "rounds UP … 3 over" and was wrong in
      // both halves; the direction matters because era eight's margin is the narrowest
      // in the table BECAUSE of it, not despite it.
      {
        era: "atomic_age",
        lessons: 9,
        projected: 76797,
        needed: 69120,
        headroom: 7677,
        solvent: true,
      },
      {
        era: "information_age",
        lessons: 6,
        projected: 153600,
        needed: 138240,
        headroom: 15360,
        solvent: true,
      },
      {
        era: "cyberpunk",
        lessons: 9,
        projected: 307197,
        needed: 245760,
        headroom: 61437,
        solvent: true,
      },
    ]);
  });

  it("names the eras that do NOT close, as a census that is now EMPTY", () => {
    // Four eras failed here before the era total was normalised, and this assertion
    // named exactly which four. It is kept as a census asserted empty rather than
    // deleted: a solvency sweep whose failure list was removed reads identically to
    // one whose failure list is empty, and only one of those is a result.
    expect(moneyReport.filter((row) => !row.solvent).map((row) => row.era)).toEqual([]);
    // The floor under the emptiness, which is what stops it holding trivially. Ten
    // rows were priced, every one of them answered, and every one solvent.
    expect(moneyReport).toHaveLength(10);
    expect(moneyReport.filter((row) => row.solvent)).toHaveLength(10);
    // And the four that used to fail are named, so the fix is checkable at the rows it
    // was for rather than only in aggregate.
    for (const era of ["neolithic", "bronze_age", "classical", "medieval"] as const) {
      const row = reportFor(era);
      expect(row.lessons, `${era} is no longer a five-node era`).toBe(5);
      expect(row.headroom, `${era} closed but with no room`).toBeGreaterThan(0);
    }
  });

  it("confirms every era against the EXACT optimum, not just the bound", () => {
    // The check the bound's caveat demands. `greedyPlanCost` overstates, so a
    // shortfall it reports might be an artefact — and for era one it partly is: the
    // true optimum is 520 (four Family Lodges for 80 livability and 20 happiness, plus
    // two Campfires for the other 40) against the bound's 540, so era one's real
    // headroom is 80 rather than 60.
    expect(
      moneyReport.map(({ era, optimal, optimalHeadroom, solventAtOptimum }) => ({
        era,
        optimal,
        optimalHeadroom,
        solventAtOptimum,
      })),
    ).toEqual([
      { era: "prehistoric", optimal: 520, optimalHeadroom: 80, solventAtOptimum: true },
      { era: "neolithic", optimal: 1080, optimalHeadroom: 120, solventAtOptimum: true },
      { era: "bronze_age", optimal: 2160, optimalHeadroom: 240, solventAtOptimum: true },
      { era: "classical", optimal: 4320, optimalHeadroom: 480, solventAtOptimum: true },
      { era: "medieval", optimal: 8640, optimalHeadroom: 960, solventAtOptimum: true },
      { era: "renaissance", optimal: 17280, optimalHeadroom: 1920, solventAtOptimum: true },
      { era: "industrial", optimal: 30720, optimalHeadroom: 7680, solventAtOptimum: true },
      { era: "atomic_age", optimal: 69120, optimalHeadroom: 7677, solventAtOptimum: true },
      {
        era: "information_age",
        optimal: 138240,
        optimalHeadroom: 15360,
        solventAtOptimum: true,
      },
      {
        era: "cyberpunk",
        optimal: 245760,
        optimalHeadroom: 61437,
        solventAtOptimum: true,
      },
    ]);

    // The bound is a bound: never below the optimum, and since the 2026-07-30 variance
    // ruling the two agree in nine of ten rather than seven.
    for (const row of moneyReport) {
      expect(row.needed, `${row.era} bound is under the optimum`).toBeGreaterThanOrEqual(
        row.optimal,
      );
    }
    expect(
      moneyReport.filter((row) => row.needed > row.optimal).map((row) => row.era),
    ).toEqual(["prehistoric"]);
    // And the verdicts agree everywhere, so the bound never mislabelled an era.
    expect(moneyReport.map((row) => row.solvent)).toEqual(
      moneyReport.map((row) => row.solventAtOptimum),
    );
  });

  it("takes LESSON COUNT out of the question entirely, which is what fixed it", () => {
    // THE INVERSION. This assertion used to read the other way round: supply was
    // `a flat 100 x lessons`, need was 540 (or 480) at era-one scale whatever the era,
    // so solvency reduced to `lessons >= 6` and the four five-node eras failed. It was
    // never about being early or late in the run — it was about era SIZE.
    //
    // Normalising removes `lessons` from the supply side: divide both sides by 2^(N-1)
    // and every era's supply is ERA_MATERIAL_TOTAL, whether it holds five nodes or
    // nine. So the predicate below is a CONSTANT rather than a function of the era, and
    // no era can be re-sized into insolvency again.
    for (const row of moneyReport) {
      const multiplier = eraCostMultiplier(row.era);
      expect(row.projected / multiplier).toBeCloseTo(ERA_MATERIAL_TOTAL, 1);
      expect(row.needed % multiplier, `${row.era} need is not a clean multiple`).toBe(0);
    }

    // The supply side no longer varies with lesson count, stated over the two node
    // counts that used to decide it: five-node and nine-node eras land in the same
    // place, within the 3 the nine-node rounding costs.
    const normalisedSupply = moneyReport.map(
      (row) => row.projected / eraCostMultiplier(row.era),
    );
    expect(Math.max(...normalisedSupply) - Math.min(...normalisedSupply)).toBeLessThan(1);
    // A floor with a SHAPE: the population must actually contain the era sizes whose
    // disagreement this claim is about, or the spread above is measured over one size.
    expect([...new Set(moneyReport.map((row) => row.lessons))].sort()).toEqual([5, 6, 9]);

    const normalisedNeed = new Map(
      moneyReport.map((row) => [row.era, row.needed / eraCostMultiplier(row.era)]),
    );
    // 540 everywhere except the two eras that price food below the ladder — era seven's
    // Food Works and era ten's Vertical Farm are both deliberate, and both show up here
    // rather than needing to be taken on trust. Unchanged by the normalisation, which
    // touched supply only.
    expect([...new Set(normalisedNeed.values())].sort((a, b) => a - b)).toEqual([480, 540]);
    expect(
      [...normalisedNeed.entries()].filter(([, need]) => need === 480).map(([era]) => era),
    ).toEqual(["industrial", "cyberpunk"]);

    // And the predicate itself: solvency no longer reads off lesson count at all.
    expect(moneyReport.map((row) => row.solvent)).toEqual(moneyReport.map(() => true));
    expect(moneyReport.filter((row) => row.lessons === 5)).toHaveLength(4);
  });

  it("leaves the narrowest margin at 10% of an era's grant, held by era eight", () => {
    // Headroom is now a SHARE of the era total rather than an accident of era size:
    // 10% wherever the need normalises to 540, 20% for the two eras that price food
    // below the ladder. That share is the figure that stays true when prices move.
    //
    // Era eight, not era one, holds the tightest margin — and by a hair, because its
    // nine-node rate rounds DOWN and takes 3 OFF a supply of 76,800 while its need does
    // not move: 7,677/76,797 = 0.099965 against era one's exact 60/600 = 0.100000.
    //
    // This line used to say "rounds up and adds 3", which would have made era eight's
    // share 7,683/76,803 = 0.100035 — WIDER than era one's, so the assertion five lines
    // below would name `prehistoric` and fail. The mechanism it stated contradicted the
    // assertion it was introducing, and the assertion was the half that was right.
    // Measured rather than assumed: the obvious guess is era one, which is the one this
    // line used to name before that.
    const shares = moneyReport.map((row) => row.headroom / row.projected);
    expect(Math.min(...shares)).toBeCloseTo(0.1, 3);
    expect(Math.max(...shares)).toBeCloseTo(0.2, 3);
    const narrowest = moneyReport.reduce((worst, row) =>
      row.headroom / row.projected < worst.headroom / worst.projected ? row : worst,
    );
    expect(narrowest.era).toBe("atomic_age");
    expect(reportFor("prehistoric").headroom / reportFor("prehistoric").projected).toBe(
      0.1,
    );

    // THE BAND AT ERA-ONE SCALE, pinned because `constants.ts` publishes it in that form
    // and the reversed sign above corrupted it there too: it read "10% to 20.5% (60–123)"
    // and measures 10% to 20%, 59.98 to 120. The low end is era eight's 7,677/128 =
    // 59.977 — below 60 because the nine-node rate rounds down — and the high end is era
    // seven's exact 7,680/64 = 120. 123 would need a nine-node era 3 OVER at era-one
    // scale, which is the arithmetic that cannot happen.
    const atEraOneScale = moneyReport.map(
      (row) => row.headroom / eraCostMultiplier(row.era),
    );
    expect(Math.min(...atEraOneScale)).toBeCloseTo(59.98, 2);
    expect(Math.min(...atEraOneScale)).toBeLessThan(60);
    expect(Math.max(...atEraOneScale)).toBe(120);
    // The two 20% eras named, so "10% to 20%" is a census and not a range someone read
    // off two rows.
    expect(
      moneyReport
        .filter((row) => row.headroom / row.projected > 0.15)
        .map((row) => row.era),
    ).toEqual(["industrial", "cyberpunk"]);
  });
});

/**
 * The civic demand column, derived once from the catalogue so the assertions over it can sit
 * in separate `it` blocks. The tie-break is applied here and it is visible: where two cheapest
 * cities differ in footprint the budget owes the LARGER, because a learner may buy either.
 */
const civicLandColumn: readonly {
  era: EraId;
  cost: number;
  era_cells: number;
  tied_at: readonly number[];
  cumulative_civic_cells: number;
}[] = (() => {
  let cumulative = 0;
  return ERA_SEQUENCE.map((era) => {
    const { cost, cells } = optimalPlanCells(landProfilesFor(era.id), targetFor(era.id));
    const used = cells[cells.length - 1] ?? 0;
    cumulative += used;
    return {
      era: era.id,
      cost,
      era_cells: used,
      tied_at: cells,
      cumulative_civic_cells: cumulative,
    };
  });
})();

describe("the LAND half of solvency: all ten eras, and the civic column derived", () => {
  it("gives era one 88 buildable cells at its authored radius of 22", () => {
    expect(eraBuildableRadius("prehistoric")).toBe(22);
    expect(buildableCellCount(22)).toBe(88);
  });

  it("fits era one's cheapest solvent plan on era one's island", () => {
    // The plan the money half priced at 540: three 20-livability rows plus three
    // Campfires. Cheapest per stone is the Smokehouse (2x1 = 2 cells) or the
    // Family Lodge (2x2 = 4); the Lodge is what `greedyPlanCost` picks on price
    // alone, so the land check uses the worse-for-land of the two.
    const catalogue = civicCatalogueForEra("prehistoric");
    const longhouse = catalogue.find((b) => b.id === "prehistoric_longhouse");
    const campfire = catalogue.find((b) => b.id === "prehistoric_campfire");
    expect(longhouse).toBeDefined();
    expect(campfire).toBeDefined();
    if (longhouse === undefined || campfire === undefined) {
      return;
    }

    const cells = 3 * civicFootprintCells(longhouse) + 3 * civicFootprintCells(campfire);
    expect(cells).toBe(24);
    // 88 cells total, and era one's SIX skill buildings plus the Town Hall stand on it
    // first. Even at 2x2 each that is 28 cells, leaving 60 — so 24 fits with room.
    const skillBuildingCells = 7 * 4;
    expect(cells + skillBuildingCells).toBeLessThanOrEqual(buildableCellCount(22));
    expect(buildableCellCount(22) - skillBuildingCells - cells).toBe(36);
  });

  it("answers the land question for all ten, where it used to answer for one", () => {
    // **THIS REPLACES A TEST THAT ASSERTED NINE ERAS THROW**, and the old one was right to
    // exist: it said a `describe.skip` would leave nine eras silently uncovered forever, and
    // that it should go red the moment somebody authored a radius so those eras got the land
    // check they were owed. This is the check it was holding the place for.
    const answered = ERA_SEQUENCE.map((era) => ({
      era: era.id,
      radius: eraBuildableRadius(era.id),
      cells: buildableCellCount(eraBuildableRadius(era.id)),
    }));
    expect(answered).toEqual([
      { era: "prehistoric", radius: 22, cells: 88 },
      { era: "neolithic", radius: 30, cells: 172 },
      { era: "bronze_age", radius: 35, cells: 248 },
      { era: "classical", radius: 42, cells: 332 },
      { era: "medieval", radius: 46, cells: 408 },
      { era: "renaissance", radius: 51, cells: 524 },
      { era: "industrial", radius: 55, cells: 608 },
      { era: "atomic_age", radius: 60, cells: 716 },
      { era: "information_age", radius: 64, cells: 812 },
      { era: "cyberpunk", radius: 69, cells: 936 },
    ]);
    // The fail-loud discipline that authoring every era did NOT remove.
    expect(() => eraBuildableRadius("atlantean" as EraId)).toThrow(/Unknown era/);
  });

  it("joins the derived CIVIC column onto the authored demand table, both ways", () => {
    // **THE ASSERTION THAT PROTECTS ALL TEN RADII, AND IT GETS AN `it` OF ITS OWN.**
    // `ERA_LAND_DEMAND.cumulative_civic_cells` is authored in `skill-graph`, which cannot
    // import this catalogue, so the number over there is a transcription until something
    // re-derives it here. A re-price that changes any era's cheapest city has to fail HERE,
    // which is exactly what did not happen when #293 landed under an earlier version of that
    // table: seven catalogues moved and ten radii were silently invalidated.
    //
    // It is its own block because the per-era report below is a `toEqual` over the same
    // derivation, and a shared block means an injected price trips the report first and this
    // never runs. Measured: with the two in one block, injecting era five's dwelling at 1,500
    // failed the report at `24 -> 18` and left these lines unexecuted. Split, the same
    // injection fails here at `medieval: expected 126 to be 120`.
    for (const row of civicLandColumn) {
      expect(eraLandDemand(row.era).cumulative_civic_cells, row.era).toBe(
        row.cumulative_civic_cells,
      );
    }
    expect(ERA_LAND_DEMAND.map((demand) => demand.cumulative_civic_cells)).toEqual(
      civicLandColumn.map((row) => row.cumulative_civic_cells),
    );
    // A floor with a shape under the equality, since two empty lists are also equal.
    expect(civicLandColumn).toHaveLength(10);
    expect(ERA_LAND_DEMAND).toHaveLength(10);
    expect(Math.min(...civicLandColumn.map((row) => row.era_cells))).toBeGreaterThan(0);
  });

  it("reports the per-era CIVIC cells, and the plan they are the footprint of", () => {
    // The report, so a reviewer can read the ten without running the search. Exhaustive
    // rather than the greedy bound: the greedy plan is dearer in era one, and a budget sized
    // off a plan no player would buy is sized off the wrong city.
    expect(civicLandColumn.map((row) => row.era_cells)).toEqual([
      24, 24, 24, 30, 24, 30, 24, 30, 30, 21,
    ]);
    // The cost column agrees with the money half's own optimum, so the plan priced here is
    // the same plan priced above rather than a second search that drifted from it.
    expect(civicLandColumn.map((row) => row.cost)).toEqual(
      moneyReport.map((row) => row.optimal),
    );
  });

  it("names the eras whose cheapest city TIES at two footprints, as a census", () => {
    // **THE TIE-BREAK IS LOAD-BEARING IN EXACTLY ONE ERA, and that is asserted rather than
    // assumed.** #293 priced era two's Granary at 140 and its Village Houses at 160, which
    // makes 3 food + 3 amenity and 4 dwelling + 2 amenity cost the same 1,080 at different
    // footprints. Before that re-price the optimum was unique in all ten, so a version of
    // this derivation written against the old catalogue had no tie-break at all and produced
    // a different era-two budget.
    //
    // A census in both directions with a floor: a tie appearing in a second era means the
    // rule is deciding a budget nobody reviewed, and this tie disappearing means era two's
    // radius should be re-derived. Either way a human looks.
    const tied = civicLandColumn.map((row) => ({ era: row.era, cells: row.tied_at }));
    expect(tied.filter((row) => row.cells.length > 1).map((row) => row.era)).toEqual([
      "neolithic",
    ]);
    expect(tied.find((row) => row.era === "neolithic")?.cells).toEqual([18, 24]);
    expect(tied).toHaveLength(10);
    expect(tied.filter((row) => row.cells.length === 1)).toHaveLength(9);
    // And the demand row really took the larger of the two, so the tie-break is provable
    // from the table rather than only from the comment above it.
    expect(
      eraLandDemand("neolithic").cumulative_civic_cells -
        eraLandDemand("prehistoric").cumulative_civic_cells,
    ).toBe(24);
  });

  it("fits every era's cheapest closing city on that era's own island", () => {
    // **THE DEAD-END CHECK, PER ERA.** An era whose budget cannot hold the city its own
    // economy has to build leaves the learner stuck through no fault of their own, which is
    // strictly worse than a loose budget. Cumulative on both sides, because nothing is ever
    // torn down: the city an era must hold is every era up to it.
    const rows = ERA_SEQUENCE.map((era) => {
      const occupied = occupiedLandCells(eraLandDemand(era.id));
      const cells = buildableCellCount(eraBuildableRadius(era.id));
      return { era: era.id, occupied, cells, spare: cells - occupied };
    });

    for (const row of rows) {
      expect(row.spare, `${row.era} cannot hold its own cheapest city`).toBeGreaterThan(0);
      expect(row.occupied / row.cells, row.era).toBeLessThanOrEqual(ERA_ONE_FILL_RATIO);
    }
    // Named per era rather than left as a loop verdict, because "every era fits" is the
    // claim and a shrunken population would satisfy the loop.
    expect(rows.map((row) => [row.era, row.spare])).toEqual([
      ["prehistoric", 41],
      ["neolithic", 83],
      ["bronze_age", 117],
      ["classical", 155],
      ["medieval", 191],
      ["renaissance", 255],
      ["industrial", 295],
      ["atomic_age", 337],
      ["information_age", 379],
      ["cyberpunk", 446],
    ]);
  });

  it("fits everything the LESSON channel can buy, which is why land does not bite", () => {
    // **THE UNCOMFORTABLE HALF, MEASURED RATHER THAN SMOOTHED.** The scarcity ruling wants
    // land to be a second scarce axis beside cost. It is not one on the lesson channel, and
    // that is inherited from era one rather than introduced by the budgets: era one's entire
    // 600-stone grant buys at most 28 cells of civic building, so a learner who spends every
    // stone on the most land-hungry rows still leaves 37 of 88 cells empty on the SHIPPED
    // island. A ratio calibrated on era one cannot make land bite later, and tightening it
    // would mean inventing a number instead of measuring one.
    let cumulative = 0;
    const rows = ERA_SEQUENCE.map((era) => {
      const demand = eraLandDemand(era.id);
      const income = era.nodes.length * lessonMaterialAmount(era.id);
      cumulative += maxAffordableCells(landProfilesFor(era.id), income);
      const occupied = demand.cumulative_skill_cells + demand.hall_cells + cumulative;
      const cells = buildableCellCount(eraBuildableRadius(era.id));
      return { era: era.id, occupied, cells, fits: occupied <= cells };
    });

    expect(rows.filter((row) => !row.fits)).toEqual([]);
    expect(rows).toHaveLength(10);
    expect(rows.map((row) => [row.era, row.cells - row.occupied])).toEqual([
      ["prehistoric", 37],
      ["neolithic", 75],
      ["bronze_age", 103],
      ["classical", 137],
      ["medieval", 169],
      ["renaissance", 227],
      ["industrial", 251],
      ["atomic_age", 291],
      ["information_age", 323],
      ["cyberpunk", 375],
    ]);

    // WHAT DOES BITE, since the finding above is not that land is free. The practice channel
    // is bounded by effort and nothing else, so filling an island is reachable and merely
    // expensive: era one's 41 free cells cost 820 stone at the Family Lodge's 20 a cell,
    // against 80 of lesson headroom, so 37 practice sets fill the island.
    //
    // **37 AT A PAYOUT OF 20, AND IT WAS 30 AT 25.** Written as the whole derivation rather
    // than as a figure, because every input here has moved once already: the payout was
    // retuned, and a version of this measurement carried over from a payout of 25 read 30 and
    // was simply wrong at this tip.
    const eraOne = landProfilesFor("prehistoric");
    const cheapestPerCell = Math.min(...eraOne.map((row) => row.cost / row.cells));
    expect(cheapestPerCell).toBe(20);
    const freeCells = 88 - occupiedLandCells(eraLandDemand("prehistoric"));
    expect(freeCells).toBe(41);
    const headroom = reportFor("prehistoric").mintable - reportFor("prehistoric").optimal;
    expect(headroom).toBe(80);
    expect(EARN.interleaved.material).toBe(20);
    expect(
      Math.ceil((freeCells * cheapestPerCell - headroom) / EARN.interleaved.material),
    ).toBe(37);
    expect(Math.ceil((820 - 80) / 20)).toBe(37);
    // And it is a real amount of grinding beside the era's own bound of ten paid sets, which
    // is what makes "practice bites and lessons do not" a measurement rather than a slogan.
    expect(37).toBeGreaterThan(DRILL_PAID_SETS_PER_ERA);
  });
});

/**
 * **THE SWEEP ABOVE MEASURES ONE OF TWO INCOME CHANNELS, and this block says so.**
 *
 * This described "gold and materials are NOT fungible" until the gold-drop, and the
 * independence it asserted was real: practice paid gold, civic buildings cost
 * materials, and no change to the practice payout could reach a single number above.
 * That is now FALSE, and it is false deliberately — practice pays the era's material,
 * which is the one spendable pool, so practice income lands in the same wallet the city
 * is bought from.
 *
 * So the sweep above is the LESSON channel, and the figures here are the practice
 * channel beside it. Deleting the old independence claim without replacing it would
 * have left a solvency file that measured half the income and did not mention it.
 */
describe("the practice channel, beside the lesson channel the sweep measures", () => {
  /**
   * What a whole run's cities leave over, at era-one scale. Summed off the EXACT optimum
   * rather than the greedy bound, because a player with change left over is by definition
   * building the cheapest city that closes.
   *
   * **IT USED TO BE MEASURED AGAINST THE COSMETICS CATALOGUE, AND THERE IS NO CATALOGUE.**
   * Two assertions here priced the scarcity ruling in shop terms: 1,702 of purchasable
   * items against 740 of cumulative headroom (43% of the catalogue affordable from lesson
   * income), and 86 completed practice sets to buy the whole thing. The 2026-08-03 sunset
   * removes the only thing those numbers were denominated in, so they are deleted rather
   * than re-derived over an empty array — a sum over `COSMETIC_CATALOG` would now be zero,
   * and `43% of zero` is a green assertion measuring nothing.
   *
   * What survives is the half of the ruling that was always about the CITY: an era's
   * income against the cheapest city that closes, which is what the ten rows above sweep,
   * and which the headroom below is the change left over from.
   */
  const cumulativeHeadroom = moneyReport.reduce(
    (total, row) => total + row.optimalHeadroom / eraCostMultiplier(row.era),
    0,
  );

  it("prices every one of the forty rows in a MATERIAL, and gold is now one", () => {
    // Kept from the fungibility check, because the population claim survived the
    // ruling that killed the independence claim: all forty costs are denominated in an
    // era material, one distinct material per era.
    const materials = new Set(
      ERA_SEQUENCE.flatMap((era) =>
        civicCatalogueForEra(era.id).map((building) => building.material),
      ),
    );
    expect(materials.size).toBe(10);
    // This asserted `false` while a currency held the word. Era five's material IS
    // `gold` now, so the same line is the other way round — and it is not a slackening,
    // because `materials.test.ts` holds the property that actually mattered (the two
    // unions are disjoint) rather than the string that used to stand in for it.
    expect(materials.has("gold")).toBe(true);
    expect(lessonMaterialAmount("prehistoric")).toBeGreaterThan(0);
  });

  it("keeps the sweep above reading the LESSON channel alone, and only that", () => {
    // The independence that survives: nothing in the derivation reads
    // `EARN.interleaved`, so the ten rows above are the lesson channel and nothing
    // else. That is now a scoping statement rather than a claim about two currencies.
    // `materialFloor` joined `material` when the drill payout started tapering on how hard
    // the learner is finding the round. It changes nothing here and the assertion is kept
    // exact rather than loosened to a `toContain`: what it is guarding is that no THIRD
    // kind of magnitude appears in row 2 without this sweep being re-read, and a
    // containment check would let one through silently.
    expect(Object.keys(EARN.interleaved).sort()).toEqual(["material", "materialFloor"]);
    // The sweep and every figure around it are measured at the CEILING, which is the rate
    // an un-tapered caller still pays; the floor can only move income down.
    expect(EARN.interleaved.materialFloor).toBeLessThan(EARN.interleaved.material);
    for (const row of moneyReport) {
      expect(row.projected).toBe(row.lessons * lessonMaterialAmount(row.era));
    }
  });

  it("leaves 740 of lesson headroom across a run, which is what the city costs less", () => {
    // The surviving half of the scarcity ruling, at era-one scale. A player who completes
    // every lesson in all ten eras and builds the cheapest city that closes ends the run
    // with this much change — and with the shop gone, roads and crisis repair are what it
    // is for.
    expect(cumulativeHeadroom).toBeCloseTo(740, 0);
    // **780 UNTIL 2026-07-30, AND THE COST-VARIANCE RULING IS WHAT MOVED IT.** Cumulative
    // headroom is summed off the EXACT optimum, and two eras' optima rose to meet their
    // greedy bound when their dwellings stopped being priced level with their food rows
    // (see "clears every era against the EXACT optimum"). Nobody re-tuned it: 40 of
    // era-one-scale headroom left the run as a consequence, which is a move TOWARD the
    // scarcity the second ERA_MATERIAL_TOTAL ruling asks for.
    //
    // A FLOOR AND A CEILING, not a bare closeness check: headroom of zero would satisfy
    // "the city is affordable" while meaning the city is affordable and nothing else is,
    // and headroom the size of a second city would mean the tradeoff has no teeth.
    expect(cumulativeHeadroom).toBeGreaterThan(0);
    const cheapestCity = Math.min(
      ...moneyReport.map((row) => row.optimal / eraCostMultiplier(row.era)),
    );
    expect(cheapestCity).toBe(480);
    expect(cumulativeHeadroom).toBeLessThan(cheapestCity * moneyReport.length);
  });

  it("puts an era's spare change well under a second city, in every era", () => {
    // Per era rather than summed, so an era that closed with nothing left is visible
    // instead of averaged away by nine that closed comfortably.
    for (const row of moneyReport) {
      expect(
        row.optimalHeadroom,
        `${row.era} closes with no change at all`,
      ).toBeGreaterThan(0);
      expect(row.optimalHeadroom, `${row.era} could build its city twice`).toBeLessThan(
        row.optimal,
      );
    }
    expect(moneyReport).toHaveLength(10);
  });

  it("shows practice TOPPING OUT at 25% of era income, which is the ruled target", () => {
    // **THE TARGET THE PAYOUT RULING WAS SET AGAINST**, revised from 30% to 25%.
    const perSet = EARN.interleaved.material;
    const realisticSets = 10;

    // THE RULED FIGURE. Practice's share is `K·m / (T + K·m)` and not `K·m / T` — the two
    // readings differ by eight points here, so the denominator is stated rather than
    // assumed. 25% of era income means `K·m = T/3`, and at the tree's own realistic ten
    // sets that is `m = 20` EXACTLY — no rounding, where the 30% target wanted 25.71 and
    // was taken at 25.
    const shareOfEraIncome =
      (realisticSets * perSet) / (ERA_MATERIAL_TOTAL + realisticSets * perSet);
    expect(shareOfEraIncome).toBe(0.25);
    // The lesson-channel reading of the same ten sets, so neither can be quoted as the
    // other. 200 against 600, where it was 250 at a payout of 25.
    expect(realisticSets * perSet).toBe(200);
    expect((realisticSets * perSet) / ERA_MATERIAL_TOTAL).toBeCloseTo(0.3333, 4);
    // The era ladder cancels out of both, which is why one figure covers ten eras.
    for (const row of moneyReport) {
      const scaled = realisticSets * perSet * eraCostMultiplier(row.era);
      expect(scaled / (row.projected + scaled), row.era).toBeCloseTo(shareOfEraIncome, 3);
    }

    // **"REALISTIC" AND "MAXIMUM" ARE THE SAME NUMBER NOW, AND THAT IS THE POINT.** The
    // ten sets this share is derived at is exactly `DRILL_PAID_SETS_PER_ERA`, so 25% is
    // the share practice TOPS OUT at rather than the share it happens to reach at a
    // modelled amount of play. Without the bound `K` is unbounded and a "target share"
    // has no ceiling to be a ceiling of. Asserted as an equality so the two halves of one
    // ruling cannot drift into naming different numbers.
    expect(realisticSets).toBe(DRILL_PAID_SETS_PER_ERA);

    // And the number of sets it takes to match an era's WHOLE lesson channel: 30
    // exactly, so 31 is where practice would start to out-earn it. Derived from the two
    // constants, so a retune of either moves it — and three times the bound, so no
    // learner can reach it.
    expect(ERA_MATERIAL_TOTAL / perSet).toBe(30);
    expect(30 * perSet).toBe(ERA_MATERIAL_TOTAL);
    expect(31 * perSet).toBeGreaterThan(ERA_MATERIAL_TOTAL);
    expect(DRILL_PAID_SETS_PER_ERA * perSet).toBeLessThan(ERA_MATERIAL_TOTAL);
  });

  it("keeps the ceiling well under break-even, which the withdrawn rule could not", () => {
    // **THE MARGIN THE WITHDRAWN PER-ERA CEILING RESTED ON.** This was
    // `realisticSets < breakEven / 3` — a factor of six at the retired payout of 10 —
    // then `/ 2` at 25, where break-even was twenty-four. At 20 break-even is thirty
    // against a bound of ten, so **the factor is EXACTLY three**, and the assertion is
    // written as the ratio rather than as a strict inequality against `/3`, which the
    // measurement says is false by a hair. Kept as a test of its own for the reason it
    // always was: sharing an `it` with the pinned figures above meant an injected payout
    // tripped a `toBe` first and this line never ran.
    //
    // What it guards is unchanged — "the most practice can be worth" and "break-even"
    // must not collapse into the same number, or the claim that practice cannot replace
    // an era's lessons has no arithmetic behind it. The claim is stronger than it was,
    // because ten is no longer a modelling assumption about how much someone plays: it is
    // the hard bound, so this is a statement about every player rather than a typical
    // one. `expect(...).toBeLessThanOrEqual` would let the two collapse, so the ratio is
    // pinned and floored instead.
    const perSet = EARN.interleaved.material;
    const breakEven = ERA_MATERIAL_TOTAL / perSet;
    expect(breakEven).toBe(30);
    expect(breakEven / DRILL_PAID_SETS_PER_ERA).toBe(3);
    expect(breakEven / DRILL_PAID_SETS_PER_ERA).toBeGreaterThanOrEqual(2);
    // And the floor with a shape: break-even must be a real number of sets above the
    // bound, so the comparison is not two ways of writing the same quantity.
    expect(breakEven - DRILL_PAID_SETS_PER_ERA).toBeGreaterThanOrEqual(10);
  });

  it("cannot strand a learner: the LESSON channel alone finishes every era's city", () => {
    // **THE ASSERTION THE DRILL BOUND OWES.** A bound on the only repeatable income is
    // only acceptable if a learner who has spent it can still finish. Measured per era
    // against the exact optimum rather than argued: lesson income alone clears every
    // one of the ten, so the drill is a supplement in the strict sense and never a
    // prerequisite.
    for (const row of moneyReport) {
      expect(
        row.mintable,
        `${row.era} cannot be finished on lesson income alone`,
      ).toBeGreaterThanOrEqual(row.optimal);
      expect(
        isSolvent(row.mintable, row.needed),
        `${row.era} fails the shipped bound`,
      ).toBe(true);
    }
    expect(moneyReport).toHaveLength(10);
    // And the bound leaves a real amount of income on the table rather than being
    // nominal: ten paid sets is a third of an era's lesson channel.
    expect(DRILL_PAID_SETS_PER_ERA * EARN.interleaved.material).toBeGreaterThan(0);
    expect(
      (DRILL_PAID_SETS_PER_ERA * EARN.interleaved.material) / ERA_MATERIAL_TOTAL,
    ).toBeCloseTo(0.3333, 4);
  });

  it("shows the retired 24h window cost WAITING and not effort, so the DAYS are unchanged", () => {
    // Why removing the rolling window did not need the per-set figure retuned, as
    // arithmetic rather than as an argument.
    //
    // The old cap was 200 per 24h at era-one scale, so it bound nobody until the
    // eleventh set in a day and then paid zero. Total income from K sets was
    // `m x min(K, (200/m) x days)` — bounded by effort AND by time. It is `m x K` capped
    // at the per-era bound now, bounded by effort alone. The effort to reach a given
    // total is identical either way; what the window added was a floor on the number of
    // DAYS.
    //
    // **THE UNIT USED TO BE THE COSMETICS CATALOGUE (1,702 at era-one scale, 86 sets),
    // AND THERE IS NO CATALOGUE.** The arithmetic is unchanged and does not depend on
    // which total is chosen, so it is restated over a total the game still has: a whole
    // run's ten cities, at the cheapest era's optimum. Any total behaves the same way,
    // which is exactly the property being demonstrated.
    const perSet = EARN.interleaved.material;
    const retiredDailyCeiling = 200;
    const setsPerDayBeforeThrottle = retiredDailyCeiling / perSet;
    expect(setsPerDayBeforeThrottle).toBe(10);
    const wholeRunOfCities = 480 * moneyReport.length;
    const setsForThatTotal = Math.ceil(wholeRunOfCities / perSet);
    expect(wholeRunOfCities).toBe(4800);
    expect(setsForThatTotal).toBe(240);
    // Twenty-four days minimum under the window, for exactly the same 240 sets of work.
    // That gap is the whole of what the window was, and it is the only thing removing it
    // removes — which is also why a "patient" player could out-earn an engaged one.
    //
    // **THE DAY COUNT IS INVARIANT IN THE PAYOUT**, which is the derivation holding
    // rather than a coincidence worth trusting: moving the payout divides the sets needed
    // and the sets-per-day by the same factor.
    expect(Math.ceil(setsForThatTotal / setsPerDayBeforeThrottle)).toBe(24);
    expect(Math.ceil(Math.ceil(wholeRunOfCities / 10) / (retiredDailyCeiling / 10))).toBe(
      24,
    );

    // **AND THE RETIRED CEILING AND THE NEW BOUND MEET AT 200, WHICH IS A COINCIDENCE.**
    // Ten paid sets at 20 is 200 per era; the window let 200 through per day. Named here
    // so nobody reads the new bound as the old window under another name: one is renewed
    // by waiting a day and the other by learning an era, and `clockless.test.ts` measures
    // that difference behaviourally.
    expect(DRILL_PAID_SETS_PER_ERA * perSet).toBe(retiredDailyCeiling);
    expect(setsPerDayBeforeThrottle).toBe(DRILL_PAID_SETS_PER_ERA);
  });
});
