import { ECONOMY_RESOURCES } from "./types";

/**
 * THE TWO CAPACITIES — livability and happiness (era design §7's "two dials, not
 * three"). **LIVABILITY IS A SINGLE POOL: housing and food are not tracked separately.**
 *
 * THE RULING THIS FILE IMPLEMENTS, and it is the second of two on the same subject. §7
 * and D-ERA13 contradicted each other about whether housing and food were capacities;
 * the team lead ruled on 2026-07-29 that there are two capacities, livability and
 * happiness, with housing and food as inputs to livability. That left HOW the two inputs
 * aggregate open, and this file shipped the limiting-factor reading of it —
 * `min(Σ housing, Σ food)` — for one day.
 *
 * **The lead then ruled the aggregation: livability is one pool, and housing and food are
 * not tracked separately.** His reasoning overrides the argument `min` shipped on, so it
 * is recorded here rather than paraphrased: THERE IS NO MIDDLE GROUND ON SEPARATE
 * TRACKING. If housing and food are distinct quantities then every building in every era
 * catalogue has to declare which of them it feeds, and that is a great deal of
 * specification bought for one extra dial in a game where the city is motivation rather
 * than the subject.
 *
 * WHAT `min` WAS COVERING UP, because this is the half that cost something. It was chosen
 * partly on a measurement: under a sum, era one's Smokehouse (2×1, 80, +20) weakly
 * dominates the Family Lodge (2×2, 80, +20) on footprint, cost and magnitude at once, and
 * the same collapse appeared in 7 of the 10 era catalogues — which reads as D-ERA24 ("no
 * building may win on every axis") breaking outright. That was a PRICING problem wearing
 * an aggregation problem's clothes. A building that is worse on every axis with no
 * compensating property is not a design that needs a cleverer formula; it is a building
 * nobody will place. So the catalogues were differentiated on footprint, cost and a
 * secondary happiness contribution, and D-ERA24 is now an executable invariant over all
 * ten of them: `test/eraCivicCatalogueDominance.test.ts`.
 *
 * WHAT THE FLIP COSTS, recorded rather than hidden: a shortfall can no longer say "food
 * is your binding constraint", because there is no food term left to bind.
 * {@link capacityShortfall} reports two independent numbers instead of one number and a
 * name — which is more information about the two capacities and none at all about their
 * inputs, since under this ruling the inputs do not exist as quantities.
 *
 * A CAPACITY IS A DERIVED READOUT, NEVER A RESOURCE (§7: "population and happiness are
 * derived readouts, never stored and never spent"). There is no capacity balance, no
 * capacity ledger row, and no way to spend livability. The direction is one-way and
 * load-bearing: materials buy civic buildings, civic buildings provide capacity, and
 * nothing converts back. `capacity.test.ts` asserts that neither capacity name is a
 * member of {@link ECONOMY_RESOURCES}, so a later edit cannot quietly make one storable.
 *
 * INV-COS-1 still holds over all of it: a shortfall gates nothing — not a lesson, not
 * mastery, not the trial, not the era advance. A hungry city is a management problem.
 * Nothing in this file returns a boolean anything could gate on.
 */

/** The two capacities, exhaustively. */
export type CapacityId = "livability" | "happiness";

export const CAPACITY_IDS: readonly CapacityId[] = ["livability", "happiness"];

/**
 * The two quantities a building CONTRIBUTES, which are exactly the two capacities.
 *
 * This is the contract a civic catalogue row satisfies — deliberately A TYPE, NOT A
 * CATALOGUE. The ten `civic-buildings.md` catalogues are Evan's two-class building model
 * (D-ERA7) and are authored there; era one's four types appear here only as test
 * fixtures.
 *
 * READING THE ERA TABLES. A dwelling row's `Provides` column says "N livability" and a
 * food row's says "food for ~N". **Under one pool those are the same contribution**: both
 * are `livability: N`, which is why a food building and a dwelling of equal magnitude on
 * equal ground at equal cost are the same building, and why the catalogues had to be
 * differentiated rather than the formula made cleverer.
 */
export interface CapacityContribution {
  /** People this can sustain — housing and food pooled, never separated. */
  readonly livability: number;
  /** Happiness coverage, the other capacity. */
  readonly happiness: number;
}

/**
 * A priced catalogue row: what it provides and what it costs in the era's material.
 * `cost` is in that era's material at that era's `2^(N-1)` scale.
 */
export interface CivicCapacityProfile extends CapacityContribution {
  readonly cost: number;
}

export const NO_CONTRIBUTION: CapacityContribution = { livability: 0, happiness: 0 };

/** The city's two capacity readouts. There is no third, and no sub-total. */
export type CityCapacities = CapacityContribution;

/**
 * The city's capacities: each is the SUM of what its buildings contribute.
 *
 * Pure and clockless: no `Date.now`, no elapsed time, no study pace, so INV-ERA-3
 * ("happiness responds to how you built, never to how fast you study") holds structurally
 * here and not merely by intent.
 */
export function deriveCapacities(
  contributions: readonly CapacityContribution[],
): CityCapacities {
  let livability = 0;
  let happiness = 0;
  for (const c of contributions) {
    livability += c.livability;
    happiness += c.happiness;
  }
  return { livability, happiness };
}

export interface CapacityShortfall {
  /** People beyond what livability sustains. 0 when the city is within capacity. */
  readonly unsustained: number;
  /** Happiness coverage still owed for the sustained population. 0 when covered. */
  readonly happinessGap: number;
}

/**
 * What the city is short of, for a population. Reports NUMBERS, never a pass/fail:
 * INV-COS-1 forbids a shortfall gating anything, so nothing here is shaped like a gate.
 *
 * Era one §6 requires every capacity, shortfall and count to live in the DOM because the
 * canvas is `aria-hidden`. The two fields are what makes that copy specific: they are
 * separately actionable, since a city can be within its livability and still short of
 * happiness, and the two are bought from different rows of the catalogue.
 */
export function capacityShortfall(
  capacities: CityCapacities,
  population: number,
): CapacityShortfall {
  const people = Math.max(0, population);
  const sustained = Math.min(people, capacities.livability);
  return {
    unsustained: Math.max(0, people - capacities.livability),
    happinessGap: Math.max(0, sustained - capacities.happiness),
  };
}

/**
 * INV-ERA-4 (D-ERA15), the solvency PREDICATE: "for every reachable learning state, the
 * resource granted up to that point is at least the cost of the livability and food
 * capacity needed to cover the population at that point."
 *
 * Shipped as a predicate, NOT as the sweep. The real invariant is a sweep over all 33 D1
 * build orders reusing the citizens harness, and it needs two things this lane does not
 * own: a priced civic catalogue and the retuned population curve. Recorded as open
 * (design record §7 item 6) rather than faked with an invented population model.
 */
export function isSolvent(materialGranted: number, capacityCostNeeded: number): boolean {
  return materialGranted >= capacityCostNeeded;
}

/**
 * The material cost of a plan that reaches `target` on both capacities, buying whole
 * buildings from `catalogue`. Greedy per axis: cheapest row per unit of livability for the
 * livability target, cheapest per unit of happiness for the happiness target.
 *
 * **An UPPER BOUND, not the optimum, and the name says `plan` for that reason.** A blend
 * row covers both axes at once, and pricing the axes separately cannot see that: era
 * one's Spring (10 + 10 for 120) beats this function's own answer at some targets.
 * `isSolvent` against an upper bound is therefore conservative — it can under-report
 * solvency and never over-report it, which is the safe direction for a guarantee.
 * `capacity.test.ts` pins the counterexample so the bound cannot quietly be re-read as
 * exact.
 *
 * Returns null when no catalogue row contributes to an axis the target needs, which is a
 * fact about the catalogue rather than an affordability answer, and so must not read as
 * "free".
 */
export function greedyPlanCost(
  catalogue: readonly CivicCapacityProfile[],
  target: CityCapacities,
): number | null {
  const axisCost = (
    provided: (profile: CivicCapacityProfile) => number,
    needed: number,
  ): number | null => {
    if (needed <= 0) {
      return 0;
    }
    let best: number | null = null;
    for (const profile of catalogue) {
      const per = provided(profile);
      if (per <= 0) {
        continue;
      }
      const cost = Math.ceil(needed / per) * profile.cost;
      if (best === null || cost < best) {
        best = cost;
      }
    }
    return best;
  };

  const parts = [
    axisCost((p) => p.livability, target.livability),
    axisCost((p) => p.happiness, target.happiness),
  ];
  let total = 0;
  for (const part of parts) {
    if (part === null) {
      return null;
    }
    total += part;
  }
  return total;
}
