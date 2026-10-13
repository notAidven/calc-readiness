import {
  civicCatalogueForEra,
  ERA_MATERIAL_TOTAL,
  eraCostMultiplier,
  greedyPlanCost,
  LESSON_GRANT_MASTERY_BAR,
  lessonMaterialAmount,
} from "@cr/economy";
import {
  buildingLedger,
  CITIZENS_PER_COMPLETE_BUILDING,
  CITIZENS_PER_MASTERED_SKILL,
  type CitizenNodeInput,
  citizenPopulation,
  FOUNDING_POPULATION,
  residenceCapacity,
} from "@cr/game";
import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import type { Mastery } from "@cr/state-schema";
import { describe, expect, it } from "vitest";

/**
 * **INV-ERA-4 RE-DERIVED, BECAUSE ITS OLD ARGUMENT STOPPED BEING TRUE.**
 *
 * The invariant: *"for every reachable learning state, the resource granted up to that
 * point is at least the cost of the capacity needed to cover the population at that
 * point"* (`capacity.ts`). Its argument used to be that **one event delivered both** —
 * a lesson completion paid the material AND brought the citizens, so the means arrived
 * with the mouths by construction.
 *
 * That is dead twice over as of 2026-07-30. Material is now gated on the MASTERY BAR
 * (four of five), and population is now keyed on MASTERY too rather than on the
 * construction stage. They are no longer one event; they are two step functions of one
 * variable, which is a weaker premise and a provable one — so it is proved here rather
 * than asserted, per era, and what it proves is not entirely comfortable.
 *
 * ## THE LITERAL INVARIANT IS FALSE, AND HAS BEEN SINCE THE COLD OPEN
 *
 * Read literally it fails at the first state a learner ever occupies: a bare island is
 * **eight people and zero material**, and eight people cost 180 of capacity at era one.
 * That is not a regression, it is the game's premise — *"the crowd that has to be
 * housed"*, and `INV-COS-1` guarantees a shortfall gates nothing. But a file that
 * re-derived the invariant and quietly kept claiming the literal form would be worse
 * than one that never looked, so the literal form is asserted FALSE below and the claim
 * that replaces it is stated in three parts:
 *
 *  1. **Nothing arrives unfunded that could not have been funded.** A node at mastery 0
 *     brings no citizens and owes no material — the lockstep the population change
 *     bought, and the one part of this that is a real behaviour change.
 *  2. **Reaching the bar pays for the whole crowd that node brings**, including the part
 *     that arrived below the bar. So a below-bar node's deficit is a DEBT THAT RETIRES,
 *     not a hole. Checked in all ten eras.
 *  3. **Every era ends solvent**, and the balance turns positive well before the end.
 *
 * ## WHERE POPULATION DOES OUTRUN MATERIAL, named rather than smoothed
 *
 * **In every era, transiently.** Between the cold open and roughly two-thirds of the way
 * through an era, the crowd is ahead of the money, and the mastery gate widens that
 * window because a below-bar node now brings two citizens and pays nothing. Era one's
 * worst reachable point is measured exactly below: **260 short**, at one node mastered
 * and four practised below the bar.
 *
 * **Era eight is the era to watch.** It has the narrowest margin on part 2 (its nine-node
 * rate is the smallest per-lesson grant in the run) and the largest transient deficit,
 * for the same reason. It clears, but by the least.
 *
 * **And the honest measurement about the population change itself: at era one it did not
 * move the worst-case number.** It removes twelve unfunded citizens from the full
 * test-out state (20 people to 8), and the *cost* of both is the same 180, because era
 * one's cheapest dwelling covers twenty people and the crowd never crosses that boundary.
 * So the change is right on the principle — mouths no longer arrive on evidence of
 * nothing — and worth nothing at all to era one's arithmetic. Recorded because the
 * opposite claim would have been easy to make and impossible to check.
 */

/** Era one's six nodes, which is the only era with an authored citizens table. */
const D1_NODES = ["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4", "NUM.5"] as const;

/** The whole D1 island placed, at a given mastery vector. */
function placedAt(vector: readonly Mastery[]): CitizenNodeInput[] {
  return D1_NODES.map((node_id, index) => ({
    node_id,
    citizen_role: "civic" as const,
    placed: true,
    mastery: vector[index] ?? 0,
    lesson_stage: "done" as const,
    placement_estimate: 0 as const,
  }));
}

function profilesFor(eraId: EraId) {
  return civicCatalogueForEra(eraId).map((building) => ({
    livability: building.provides.livability,
    happiness: building.provides.happiness,
    cost: building.cost,
  }));
}

const ERA_ONE_PROFILES = profilesFor("prehistoric");
const ERA_ONE_LESSON = lessonMaterialAmount("prehistoric");

/** What it costs to cover `people` on both axes, through the SHIPPED predicate. */
function coverageCost(eraId: EraId, people: number): number {
  const cost = greedyPlanCost(profilesFor(eraId), {
    livability: people,
    happiness: people,
  });
  if (cost === null) {
    throw new Error(`no plan prices ${people} people in ${eraId}`);
  }
  return cost;
}

interface EraOneState {
  readonly atBar: number;
  readonly population: number;
  readonly material: number;
  readonly cost: number;
  /** `material - cost`. Negative means the crowd is ahead of the money. */
  readonly balance: number;
}

function eraOneStateAt(vector: readonly Mastery[]): EraOneState {
  const ledger = buildingLedger(placedAt(vector));
  const population = citizenPopulation(ledger);
  // Row 1 pays a node once it clears the bar. Every node here is placed and practised,
  // so the `practiced` conjunct is satisfied and mastery is the only gate left.
  const atBar = vector.filter((mastery) => mastery >= LESSON_GRANT_MASTERY_BAR).length;
  const material = ERA_ONE_LESSON * atBar;
  const cost = greedyPlanCost(ERA_ONE_PROFILES, {
    livability: population,
    happiness: population,
  });
  if (cost === null) {
    throw new Error("era one prices no plan");
  }
  return { atBar, population, material, cost, balance: material - cost };
}

/** All 4^6 reachable mastery vectors for a fully placed D1 island. */
function everyEraOneState(): readonly EraOneState[] {
  const states: EraOneState[] = [];
  for (let code = 0; code < 4 ** D1_NODES.length; code += 1) {
    const vector: Mastery[] = [];
    let rest = code;
    for (let index = 0; index < D1_NODES.length; index += 1) {
      vector.push((rest % 4) as Mastery);
      rest = Math.floor(rest / 4);
    }
    states.push(eraOneStateAt(vector));
  }
  return states;
}

const ERA_ONE_STATES = everyEraOneState();

describe("part 1 — nothing arrives unfunded that could not have been funded", () => {
  it("gives a tested-out island the founding crowd and nothing more", () => {
    // **THE ONE BEHAVIOUR CHANGE THIS WHOLE DERIVATION RESTS ON, AND THE ASSERTION THAT
    // FAILS IF IT IS REVERTED.** A passed placement pre-builds a node to
    // `lesson_stage: "done"` at mastery 0. Under the old rule six of those put twenty
    // people on the island having answered nothing — and the economy has refused to pay
    // that node since #102, so those twelve extra citizens were mouths with no possible
    // means. Population is keyed on mastery now, so the two derivations agree.
    const testedOut = eraOneStateAt([0, 0, 0, 0, 0, 0]);
    expect(testedOut.population).toBe(FOUNDING_POPULATION);
    expect(testedOut.material).toBe(0);
    // And the same island under the OLD rule, computed here rather than remembered, so
    // the size of what changed is visible: 8 + six build terms.
    const underTheOldRule =
      FOUNDING_POPULATION + D1_NODES.length * CITIZENS_PER_COMPLETE_BUILDING;
    expect(underTheOldRule).toBe(20);
    expect(testedOut.population).toBeLessThan(underTheOldRule);
  });

  it("keeps population and material moving on ONE variable, at every mastery", () => {
    // The lockstep, stated as a table over the four mastery values for a single node.
    // Both columns are functions of the same `mastery`, which is the replacement for
    // "one event delivers both".
    const single = ([0, 1, 2, 3] as const).map((mastery) => {
      const state = eraOneStateAt([mastery, 0, 0, 0, 0, 0]);
      return {
        mastery,
        broughtPeople: state.population - FOUNDING_POPULATION,
        paidMaterial: state.material,
      };
    });
    expect(single).toEqual([
      { mastery: 0, broughtPeople: 0, paidMaterial: 0 },
      { mastery: 1, broughtPeople: CITIZENS_PER_COMPLETE_BUILDING, paidMaterial: 0 },
      {
        mastery: 2,
        broughtPeople: CITIZENS_PER_COMPLETE_BUILDING + CITIZENS_PER_MASTERED_SKILL,
        paidMaterial: ERA_ONE_LESSON,
      },
      {
        mastery: 3,
        broughtPeople: CITIZENS_PER_COMPLETE_BUILDING + CITIZENS_PER_MASTERED_SKILL,
        paidMaterial: ERA_ONE_LESSON,
      },
    ]);
    // The bar the material column steps at, named so the table cannot drift from it.
    expect(LESSON_GRANT_MASTERY_BAR).toBe(2);
  });
});

/**
 * Part 2, in all ten eras. Only era one has an authored citizens table, so the general
 * claim is made at ERA-ONE SCALE with the era's own rate — which is legitimate because
 * the ladder cancels: every price and every grant is multiplied by `2^(N-1)`, so the
 * comparison is the same in every era and this is the same normalisation
 * `civicSolvency.test.ts` uses to answer the money question for ten eras.
 */
interface EraMarginal {
  readonly era: EraId;
  readonly nodes: number;
  /** Era-one-scale material one lesson pays. */
  readonly perLesson: number;
  /** Era-one-scale cost of covering one person, from the era's own catalogue. */
  readonly perPerson: number;
  /** `perLesson - (build + mastery terms) * perPerson`. The debt-retiring margin. */
  readonly marginAtBar: number;
  /** Era-one-scale deficit a single below-bar node runs. */
  readonly belowBarDebtPerNode: number;
  /** Every node below the bar at once — the worst the era's own crowd can owe. */
  readonly worstBelowBarDebt: number;
}

const PER_NODE_CROWD = CITIZENS_PER_COMPLETE_BUILDING + CITIZENS_PER_MASTERED_SKILL;

const MARGINALS: readonly EraMarginal[] = ERA_SEQUENCE.map((era) => {
  const multiplier = eraCostMultiplier(era.id);
  // The era's own design population target, `3x` its headline magnitude, and what
  // covering it costs — both at era-one scale, so their ratio is a per-person rate.
  const people = 3 * 20 * multiplier;
  const perPerson = coverageCost(era.id, people) / multiplier / (people / multiplier);
  const perLesson = lessonMaterialAmount(era.id) / multiplier;
  return {
    era: era.id,
    nodes: era.nodes.length,
    perLesson,
    perPerson,
    marginAtBar: perLesson - PER_NODE_CROWD * perPerson,
    belowBarDebtPerNode: CITIZENS_PER_COMPLETE_BUILDING * perPerson,
    worstBelowBarDebt: era.nodes.length * CITIZENS_PER_COMPLETE_BUILDING * perPerson,
  };
});

describe("part 2 — reaching the bar pays for the whole crowd that node brings", () => {
  it("clears in every era, as a census of the failures", () => {
    // **THE REPLACEMENT INVARIANT.** A below-bar node runs a deficit — two citizens, no
    // material — and the question that decides whether that is a debt or a hole is
    // whether crossing the bar covers BOTH terms of the crowd, not just the mastery one.
    // It does, in all ten. Stated as an empty failure census with a floor under it,
    // because a count of successes passes just as well over a population of nothing.
    const failing = MARGINALS.filter((row) => row.marginAtBar <= 0).map((row) => row.era);
    expect(failing).toEqual([]);
    expect(MARGINALS).toHaveLength(10);
    expect(MARGINALS.filter((row) => row.marginAtBar > 0)).toHaveLength(10);
    // A floor with a SHAPE: the population must span the era sizes whose per-lesson rates
    // differ, or this measured one rate ten times.
    expect([...new Set(MARGINALS.map((row) => row.nodes))].sort()).toEqual([5, 6, 9]);
  });

  it("names ERA EIGHT as the narrowest margin, and reports every era's", () => {
    // Measured rather than guessed. Era eight is a nine-node era, so its per-lesson rate
    // is the smallest in the run while the crowd one node brings is the same six people
    // everywhere — which makes it the era where a below-bar learner is furthest ahead of
    // their own income, and the one to re-read first if any of these numbers move.
    const narrowest = MARGINALS.reduce((worst, row) =>
      row.marginAtBar < worst.marginAtBar ? row : worst,
    );
    expect(narrowest.era).toBe("atomic_age");
    // 12.664 rather than a clean 12.667, because 600 does not divide by nine: era
    // eight's derived rate rounds DOWN and lands its era total 3 under at era-one scale,
    // which is the same rounding that gives it the narrowest headroom share in
    // `civicSolvency.test.ts`. Both of era eight's records point at the same arithmetic.
    expect(narrowest.marginAtBar).toBeCloseTo(12.664, 3);
    expect(narrowest.marginAtBar).toBeLessThan(200 / 9 - PER_NODE_CROWD);
    // And the widest, so "narrowest" is a comparison over a real spread.
    const widest = MARGINALS.reduce((best, row) =>
      row.marginAtBar > best.marginAtBar ? row : best,
    );
    expect(widest.marginAtBar).toBeCloseTo(66, 2);

    // The per-person rate is 8 or 9 at era-one scale in every era — the two eras that
    // price food below the ladder are the 8s, exactly as `civicSolvency.test.ts` finds.
    expect([...new Set(MARGINALS.map((row) => row.perPerson))].sort()).toEqual([8, 9]);
    expect(MARGINALS.filter((row) => row.perPerson === 8).map((row) => row.era)).toEqual([
      "industrial",
      "cyberpunk",
    ]);
  });

  it("bounds the transient debt, and names era eight as the largest", () => {
    // **WHERE POPULATION OUTRUNS MATERIAL, SIZED.** Every node below the bar at once is
    // the worst an era's own learning can owe: `nodes x 2 citizens x the per-person rate`.
    // It is a bound rather than a hole because part 2 clears — every one of those nodes
    // retires its own debt on crossing — but it is real while it lasts and it must not be
    // allowed to grow quietly.
    const worst = MARGINALS.reduce((most, row) =>
      row.worstBelowBarDebt > most.worstBelowBarDebt ? row : most,
    );
    expect(worst.era).toBe("atomic_age");
    expect(worst.worstBelowBarDebt).toBe(162);
    // As a share of the era's whole lesson channel, which is the figure that stays true
    // when prices move: 27% at the worst, and the ceiling is set at a third so a retune
    // that doubled it fails here rather than shipping.
    expect(worst.worstBelowBarDebt / ERA_MATERIAL_TOTAL).toBeCloseTo(0.27, 2);
    for (const row of MARGINALS) {
      expect(
        row.worstBelowBarDebt / ERA_MATERIAL_TOTAL,
        `${row.era} owes more than a third of its era income below the bar`,
      ).toBeLessThan(1 / 3);
    }
    // And the comparison that puts it in proportion: the FOUNDING crowd is already
    // unfunded by 72 at era-one scale, before a learner has done anything at all. The
    // below-bar window is the same beat arriving earlier, not a new kind of state.
    expect(FOUNDING_POPULATION * 9).toBe(72);
    expect(worst.worstBelowBarDebt).toBeLessThan(3 * FOUNDING_POPULATION * 9);
  });
});

describe("part 3 — era one, exactly, over all 4096 reachable states", () => {
  it("refutes the LITERAL invariant at the cold open, which is not a regression", () => {
    // Read literally, INV-ERA-4 fails at state zero and always has: eight people, no
    // material, 180 of capacity to cover them. Asserted rather than glossed, so this file
    // cannot be quoted as proving a claim it disproves.
    const coldOpen = eraOneStateAt([0, 0, 0, 0, 0, 0]);
    expect(coldOpen.population).toBe(FOUNDING_POPULATION);
    expect(coldOpen.material).toBe(0);
    expect(coldOpen.cost).toBe(180);
    expect(coldOpen.balance).toBeLessThan(0);
    // The premise, not a bug: a shortfall gates nothing (INV-COS-1), and the crowd with
    // nowhere to go is what gives the middle of the game its pull.
    expect(coverageCost("prehistoric", FOUNDING_POPULATION)).toBe(180);
  });

  it("measures the worst reachable deficit at 260, and where it sits", () => {
    // The exact worst case over every mastery vector, priced through the shipped
    // predicate. It is NOT the cold open and it is not the all-below-bar state: it is one
    // node mastered and four practised below the bar, where twenty-two citizens have
    // tipped the plan onto a second dwelling and a second amenity while only one lesson
    // has paid.
    const worst = ERA_ONE_STATES.reduce((most, state) =>
      state.balance < most.balance ? state : most,
    );
    expect(worst.balance).toBe(-260);
    expect(worst.population).toBe(22);
    expect(worst.material).toBe(ERA_ONE_LESSON);
    expect(worst.cost).toBe(360);
    // A floor under the population, so "worst over every state" is over 4096 of them.
    expect(ERA_ONE_STATES).toHaveLength(4096);
  });

  it("turns the balance positive at four nodes past the bar, and ends solvent", () => {
    // The curve, as the range of balances at each count of mastered nodes. What matters
    // is the sign flip and the endpoint: the crowd leads the money through the first
    // half of the era and the money catches up and stays ahead.
    const byBar = new Map<number, { min: number; max: number }>();
    for (const state of ERA_ONE_STATES) {
      const seen = byBar.get(state.atBar) ?? {
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
      };
      byBar.set(state.atBar, {
        min: Math.min(seen.min, state.balance),
        max: Math.max(seen.max, state.balance),
      });
    }
    const curve = [...byBar.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([atBar, range]) => ({ atBar, ...range }));
    expect(curve).toEqual([
      { atBar: 0, min: -180, max: -180 },
      { atBar: 1, min: -260, max: -80 },
      { atBar: 2, min: -160, max: 20 },
      { atBar: 3, min: -60, max: -60 },
      { atBar: 4, min: 40, max: 40 },
      { atBar: 5, min: 140, max: 140 },
      { atBar: 6, min: 60, max: 60 },
    ]);
    // Solvent from four nodes onward, in EVERY vector at that count and above — which is
    // the claim, rather than "solvent on average".
    for (const row of curve.filter((entry) => entry.atBar >= 4)) {
      expect(row.min, `${row.atBar} nodes at the bar is not solvent`).toBeGreaterThan(0);
    }
    // And the endpoint the whole era is for: 44 people, 44 homes, 600 earned against 540.
    const finished = eraOneStateAt([2, 2, 2, 2, 2, 2]);
    expect(finished.population).toBe(44);
    expect(finished.material).toBe(ERA_MATERIAL_TOTAL);
    expect(finished.cost).toBe(540);
    expect(finished.balance).toBe(60);
    expect(residenceCapacity(buildingLedger(placedAt([2, 2, 2, 2, 2, 2])))).toBe(44);
  });

  it("shows the population change cost era one's WORST CASE nothing, which is honest", () => {
    // **THE UNCOMFORTABLE MEASUREMENT.** Keying population on mastery is right on the
    // principle and worth zero to era one's arithmetic. Under the old rule the worst
    // reachable deficit was also 260 — at a DIFFERENT state (one node mastered, five
    // untouched and merely placed) — because era one's cheapest dwelling covers twenty
    // people, so the twelve citizens the change removes never cross a building boundary.
    //
    // What the change buys is the COMPOSITION of the worst state, not its size: it is now
    // a learner who has practised five nodes rather than one who has practised none.
    const oldRuleWorst = (() => {
      let worst = 0;
      for (let code = 0; code < 4 ** D1_NODES.length; code += 1) {
        let rest = code;
        let mastered = 0;
        for (let index = 0; index < D1_NODES.length; index += 1) {
          if (rest % 4 >= LESSON_GRANT_MASTERY_BAR) {
            mastered += 1;
          }
          rest = Math.floor(rest / 4);
        }
        // The old rule: every PLACED node counted as complete, whatever its mastery.
        const population =
          FOUNDING_POPULATION +
          D1_NODES.length * CITIZENS_PER_COMPLETE_BUILDING +
          mastered * CITIZENS_PER_MASTERED_SKILL;
        const deficit = coverageCost("prehistoric", population) - ERA_ONE_LESSON * mastered;
        worst = Math.max(worst, deficit);
      }
      return worst;
    })();
    expect(oldRuleWorst).toBe(260);
    const newRuleWorst = -ERA_ONE_STATES.reduce((most, state) =>
      state.balance < most.balance ? state : most,
    ).balance;
    expect(newRuleWorst).toBe(oldRuleWorst);
    // The thing that DID move, measured: twelve unfunded citizens gone from the full
    // test-out state, and the granularity that swallowed them.
    expect(coverageCost("prehistoric", 8)).toBe(coverageCost("prehistoric", 20));
  });
});
