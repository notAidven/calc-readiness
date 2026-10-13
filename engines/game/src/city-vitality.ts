import {
  type CitizenBuildingLedger,
  citizenPopulation,
  residenceCapacity,
} from "./citizens-population";
import { type CityProvision, deriveProvision } from "./city-provision";
import {
  HAPPINESS_BAND_FLOOR,
  type HappinessBand,
  HUB_FOUNDING_LIVABILITY,
  ROAD_HAPPINESS_PER_TILE,
  SKILL_HAPPINESS_BY_ROLE,
} from "./city-vitality-tuning";

/**
 * The city's LIVABILITY and HAPPINESS arithmetic (pure, framework-free, no clock, no
 * seed, no renderer).
 *
 * **THE MODEL IS `packages/economy/src/capacity.ts`, AND THIS FILE MIRRORS IT.** PR #236
 * (merged 2026-07-29T17:59:55Z) ruled livability to be one pool, and the functions below
 * reproduce `deriveCapacities` and `capacityShortfall` term for term rather than being
 * an independent reading of the ruling.
 *
 * WHY A MIRROR AND NOT AN IMPORT — this was tried the other way first, and a shipped
 * contract said no. INV-COS-1 asserts structurally that the learning-path modules
 * *"import NOTHING from the economy module"*, and
 * `packages/economy/src/one-way-invariant.test.ts` enforces it over `engines/game/src`
 * specifically, because this directory also holds `isNeighborhoodReady` and the storm
 * gates. Importing `deriveCapacities` here — even as a type — fails that test, and
 * loosening someone else's dependency invariant to make a HUD readout tidier is not a
 * trade this lane may make.
 *
 * WHAT STOPS THE MIRROR DRIFTING, since this file's own history is the reason to ask.
 * For one day it held `aggregateLivability` with a `min` branch and a `+` branch while
 * `packages/economy` held only the `+`, and because neither module imported the other,
 * git saw no conflict and no test failed. That is the exact failure a duplication invites,
 * so it is guarded rather than promised: `test/capacityModelAgreement.test.ts` sits above
 * both lanes, where INV-COS-1 permits both imports, and asserts that this derivation and
 * his produce the same two numbers on every era-one city. If the aggregation is ever
 * re-ruled, that file fails — which is the alarm the afternoon of 2026-07-29 did not have.
 *
 * HOW THE TWO DIALS RELATE, which is the part it is easiest to get backwards:
 *
 *   - LIVABILITY sets how many people the city can SUSTAIN (section 7). It is ONE
 *     POOL: housing and food are not tracked separately (#236).
 *   - HAPPINESS COVERAGE is the second capacity: how many of them an amenity reaches.
 *     Section 7 had it *"decide whether they stay"*, and that clause is retired — see the
 *     ruling below.
 *   - NEITHER GATES THE OTHER, and neither gates the population. Population is a
 *     pure function of learning state with no capacity feedback (D-CIT2), pinned by
 *     `citizens-invariants.test.ts`'s "capacity never gates arrivals", and INV-COS-1
 *     forbids any shortfall from gating a lesson, mastery, a trial or an era advance.
 *     So livability is something population is MEASURED AGAINST, never something that
 *     throttles it — build a hundred Longhouses and not one person arrives.
 *   - What each is CONSUMED BY is therefore the same thing, the population: the
 *     livability capacity is consumed by heads needing sustaining, the happiness
 *     capacity by the same heads needing an amenity within reach.
 *
 * NO CLOCK, and it must stay that way. INV-ERA-3 (D-ERA14) forbids anything keying off
 * study pace, absence, streaks or elapsed wall-clock time, and section 8 names the
 * existing clockless test as INV-ERA-3's natural home. This derivation takes no time
 * input at all, which is what makes that structural rather than intended.
 *
 * ⚑ SECTION 7'S "DECIDES WHETHER THEY STAY" IS RETIRED, AND NOBODY LEAVES HERE.
 *
 * This paragraph has now been written three times and its first version was right. It read
 * *"NOBODY LEAVES HERE … the return trip is O-7 (Evan) … A departure with no legible return
 * is the punitive version, so the readout warns and the crowd stays."* #500 overruled it and
 * built the departure rule. On 2026-08-05 the product owner withdrew that half of his own
 * brief — *"maybe just remove the actual consequences just tell them their people are
 * unhappy?"* — and it is settled: **citizens do not leave, and departures are removed as a
 * mechanic entirely.** So the readout warns and the crowd stays, which is where the
 * objection started.
 *
 * What replaced the departure rule is `city-provision.ts`, and it is the INDICATOR half of
 * the same brief with the consequence taken out: how deep the shortfall is, which provision
 * it is, and the one boolean a row reads to look alarmed. It reports no headcount at all,
 * which is the property that makes the ruling structural rather than a promise.
 *
 * **THE READINESS SIGNAL IS THE BEHAVIOUR, NOT THIS PARAGRAPH.** Two documents once used
 * *"`city-vitality.ts:61` reads NOBODY LEAVES HERE"* as their check for whether departures
 * existed, and every part of that pointer rotted while it went on matching, so it reported
 * the opposite of the truth for a day. Nobody should re-point it in either direction:
 * `test/departuresAreWired.test.ts` derives era-one cities from nothing to fully provided
 * for and asserts that not one number on this readout falls, so it answers correctly however
 * this comment reads.
 *
 * **`population` BELOW IS `citizenPopulation`, AND THERE IS NOWHERE ELSE FOR A HEADCOUNT TO
 * GO.** {@link CityVitality.provision} carries no count, so D-CIT2's no-capacity-feedback
 * rule and the one-headcount contract the HUD and the renderer share are held by the shape
 * of the model rather than by this file remembering to leave the number alone.
 */

/**
 * The livability pool.
 *
 * ONE FIELD, WHICH IS THE WHOLE OF #236 AS IT REACHES A READOUT. This interface used to
 * carry `housing`, `food`, `sustains` and the `aggregation` that combined them. Under
 * one pool the first two are not quantities the model has, and the fourth is not a
 * choice the model offers, so a readout that still reported them would be inventing
 * three numbers to put in front of a learner. `sustains` is the total from
 * {@link deriveCapacities}, and it is never a stockpile, so it cannot drain while
 * nobody plays.
 */
export interface LivabilityReadout {
  /**
   * How many the city can sustain: `residenceCapacity` plus the hub's founding
   * provision plus every civic row's `livability`, pooled by the ruled function.
   */
  readonly sustains: number;
}

/** The happiness capacity, and the readout derived from it. */
export interface HappinessReadout {
  /** The CAPACITY: how many people the city's amenities reach. */
  readonly coverage: number;
  /** How many of the population that actually reaches. */
  readonly covered: number;
  /** The rest. Zero is the settled city. */
  readonly uncovered: number;
  /** The derived READOUT: percentage of the population covered, 0..100. */
  readonly level: number;
  readonly band: HappinessBand;
  /**
   * How much of {@link coverage} came from laid road tiles. Zero when the city has
   * no paths. Surfaced so the HUD can name paths the same way it names the amenity
   * total, without inventing a second capacity.
   */
  readonly fromPaths: number;
}

/**
 * How far each capacity falls short of the population, **straight from
 * {@link capacityShortfall}**. Every one of these is a MANAGEMENT SIGNAL and none of
 * them gates anything (INV-COS-1): they are what section 8 calls fair game, because
 * each traces to an allocation choice.
 *
 * TWO FIELDS RATHER THAN FOUR, and the two that went are the two that stopped existing.
 * `capacity.ts` records the cost of its own ruling: *"a shortfall can no longer say
 * 'food is your binding constraint', because there is no food term left to bind"*.
 */
export interface VitalityShortfalls {
  /** People beyond what livability sustains — his `unsustained`. */
  readonly livability: number;
  /**
   * Happiness coverage still owed — his `happinessGap`, which is measured against the
   * SUSTAINED population rather than the whole of it. It is therefore not always equal
   * to `happiness.uncovered`, and `city-vitality.test.ts` pins both the definitional
   * difference and the fact that no era-one city currently exhibits it.
   */
  readonly happiness: number;
  /**
   * **STANDING BUILDINGS WHOSE SKILL NOBODY HAS PRACTISED YET** — the count of the
   * ledger's `inherited && !complete`.
   *
   * The third shortfall, and the only one that is not measured in people. It is here
   * rather than beside the panel because of what it does to {@link none}: a caught-up
   * city really can be full, sustained and covered on the day it arrives, and the panel's
   * one sentence for a city with nothing left to fix is the wrong sentence for a city
   * whose whole point is still ahead of it. Folding this in is what makes *"everybody is
   * sustained"* structurally unsayable over an unpractised city rather than a case
   * somebody has to remember to exclude.
   *
   * It is NOT mirrored from `capacity.ts`, and it could not be: `PooledShortfall` is the
   * two capacity terms and the economy has no notion of practice.
   */
  readonly practice: number;
  /** True when all three of the above are zero. */
  readonly none: boolean;
}

export interface CityVitality {
  /** Straight from `citizenPopulation` — this module never adjusts it. */
  readonly population: number;
  readonly livability: LivabilityReadout;
  readonly happiness: HappinessReadout;
  readonly shortfalls: VitalityShortfalls;
  /**
   * WHAT THE CITY IS FAILING TO PROVIDE, AND WHETHER THE PANEL SHOULD BE ALARMED — one
   * object, because they are one decision (`city-provision.ts`).
   *
   * A surface that wants to know whether to show its distressed state reads
   * `provision.unmet` and never re-derives a threshold of its own. That is the whole of how
   * the band label and the alarm are kept from drifting: there is no second place a
   * threshold could live.
   *
   * **It is a reading, not a consequence.** Nothing is taken from the city for it; see the
   * ruling in the file header.
   */
  readonly provision: CityProvision;
}

export interface CityVitalityInput {
  /**
   * The per-building ledger from `buildingLedger`, in placement order. Supplies both
   * the population and the housing input, from the SAME placed-and-complete set
   * (D-CIT10), so the two can never come apart.
   */
  readonly ledger: readonly CitizenBuildingLedger[];
  /**
   * The civic buildings standing on the island, one entry per building rather than
   * per type — the catalogue is buildable *"as many times as you can afford"*.
   */
  readonly civic: readonly CapacityContribution[];
  /**
   * How many road tiles are laid. Feeds happiness coverage only (D-CIT7 amplify).
   *
   * NOT an input to the citizen roster — D-CIT18 keeps `CitizenRosterInput` free of
   * roads by construction. Passing the count here never gates a lesson, mastery, or
   * placement (INV-COS-1): capacities are management signals, not locks.
   */
  readonly roadTileCount?: number;
}

/**
 * Happiness coverage from a road network: `tiles × {@link ROAD_HAPPINESS_PER_TILE}`.
 * Pure and clockless. Negative or fractional counts truncate to zero contribution.
 */
export function roadHappinessCoverage(tileCount: number): number {
  return Math.max(0, Math.trunc(tileCount)) * ROAD_HAPPINESS_PER_TILE;
}

function bandFor(level: number): HappinessBand {
  if (level >= HAPPINESS_BAND_FLOOR.content) {
    return "content";
  }
  if (level >= HAPPINESS_BAND_FLOOR.settling) {
    return "settling";
  }
  return "restless";
}

/**
 * The two quantities a building contributes, mirroring `capacity.ts`'s
 * `CapacityContribution` (see the file header for why it is mirrored and not imported).
 */
export interface CapacityContribution {
  /** People this can sustain — housing and food pooled, never separated. */
  readonly livability: number;
  /** Happiness coverage, the other capacity. */
  readonly happiness: number;
}

/**
 * Everything standing in the city, as one contribution row per source. Kept as rows
 * rather than pre-added so that the pooling happens in exactly one place below, which is
 * what makes the agreement with `deriveCapacities` checkable rather than coincidental:
 *
 *   - the HUB's founding provision (section 8.1);
 *   - the RESIDENCE ledger, which is livability and contributes no happiness;
 *   - each CIVIC building, whose row already has the two fields;
 *   - each COMPLETE skill building's small per-role happiness (D-ERA7). Only complete
 *     ones: an unfinished building is a site, and a site is not an amenity. There is no
 *     mastery term, because none is authored;
 *   - laid ROAD TILES, happiness only (D-CIT7). Absent or zero leaves the building
 *     terms alone, which is what keeps `capacityModelAgreement` agreeing with the
 *     economy mirror that has no road concept.
 */
function contributionsOf(input: CityVitalityInput): CapacityContribution[] {
  const rows: CapacityContribution[] = [
    { livability: HUB_FOUNDING_LIVABILITY, happiness: 0 },
    { livability: residenceCapacity(input.ledger), happiness: 0 },
  ];
  for (const contribution of input.civic) {
    rows.push({
      livability: contribution.livability,
      happiness: contribution.happiness,
    });
  }
  for (const entry of input.ledger) {
    if (entry.complete) {
      rows.push({ livability: 0, happiness: SKILL_HAPPINESS_BY_ROLE[entry.role] });
    }
  }
  const fromPaths = roadHappinessCoverage(input.roadTileCount ?? 0);
  if (fromPaths > 0) {
    rows.push({ livability: 0, happiness: fromPaths });
  }
  return rows;
}

/**
 * `deriveCapacities`, mirrored: each capacity is the SUM of what the buildings
 * contribute. Pure and clockless, so INV-ERA-3 holds structurally.
 *
 * ONE POOL, and the `min` that used to stand here is gone rather than commented out.
 *
 * EXPORTED SO THE MIRROR IS TESTABLE DIRECTLY, which is not incidental. Checked only
 * through `deriveCityVitality`, the mirror can only ever be exercised on inputs era one
 * can actually produce, and that turned out to hide a defect: no era-one city is over its
 * livability pool, so a wrong mirror of the shortfall agreed with the ruled one on every
 * city and an injected defect went uncaught. `test/capacityModelAgreement.test.ts` sweeps
 * these two against the ruled pair over inputs including that unreachable region.
 */
export function pooledCapacities(
  rows: readonly CapacityContribution[],
): CapacityContribution {
  let livability = 0;
  let happiness = 0;
  for (const row of rows) {
    livability += row.livability;
    happiness += row.happiness;
  }
  return { livability, happiness };
}

/** What the city is short of. Mirrors `capacity.ts`'s `CapacityShortfall`. */
export interface PooledShortfall {
  /** People beyond what livability sustains. 0 when the city is within capacity. */
  readonly unsustained: number;
  /** Happiness coverage still owed for the SUSTAINED population. 0 when covered. */
  readonly happinessGap: number;
}

/**
 * `capacityShortfall`, mirrored. Reports NUMBERS, never a pass/fail: INV-COS-1 forbids a
 * shortfall gating anything, so nothing here is shaped like a gate.
 *
 * `happinessGap` is measured against the SUSTAINED population — `min(people,
 * livability)` — exactly as his does, and that is the one place this mirror is easy to get
 * subtly wrong. It is also invisible to any test that goes through `deriveCityVitality`,
 * because the wrong version agrees with the right one on every city era one can reach.
 * Exported for that reason; swept against his in `test/capacityModelAgreement.test.ts`.
 */
export function pooledShortfall(
  capacities: CapacityContribution,
  population: number,
): PooledShortfall {
  const people = Math.max(0, population);
  const sustained = Math.min(people, capacities.livability);
  return {
    unsustained: Math.max(0, people - capacities.livability),
    happinessGap: Math.max(0, sustained - capacities.happiness),
  };
}

export function deriveCityVitality(input: CityVitalityInput): CityVitality {
  const population = citizenPopulation(input.ledger);
  const fromPaths = roadHappinessCoverage(input.roadTileCount ?? 0);
  const capacities = pooledCapacities(contributionsOf(input));
  const shortfall = pooledShortfall(capacities, population);

  const coverage = capacities.happiness;
  const covered = Math.min(coverage, population);
  const uncovered = population - covered;
  const level = population === 0 ? 100 : Math.round((covered / population) * 100);
  // Handed over and still unscored. `complete` is the practised conjunct, so this counts
  // exactly the buildings whose crowd arrived on the diagnostic's word.
  const unpractised = input.ledger.filter(
    (entry) => entry.inherited && !entry.complete,
  ).length;

  return {
    population,
    livability: { sustains: capacities.livability },
    happiness: {
      coverage,
      covered,
      uncovered,
      level,
      band: bandFor(level),
      fromPaths,
    },
    shortfalls: {
      livability: shortfall.unsustained,
      happiness: shortfall.happinessGap,
      practice: unpractised,
      none:
        shortfall.unsustained === 0 && shortfall.happinessGap === 0 && unpractised === 0,
    },
    // Derived from the headcount LEARNING brought and from the two capacities. It reports
    // no headcount back, so there is no direction for a feedback loop to run in.
    provision: deriveProvision({
      population,
      happinessLevel: level,
      sustains: capacities.livability,
    }),
  };
}
