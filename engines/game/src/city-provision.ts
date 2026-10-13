import { FOUNDING_POPULATION } from "./citizens-tuning";
import { HAPPINESS_BAND_FLOOR } from "./city-vitality-tuning";

/**
 * **WHAT THE CITY IS FAILING TO PROVIDE FOR ITS PEOPLE** (pure, framework-free, no clock,
 * no seed, no renderer, nothing persisted).
 *
 * ## ⚑ THIS FILE USED TO TAKE PEOPLE AWAY, AND THE PRODUCT OWNER RULED THAT OFF
 *
 * It was `city-departures.ts`, and it implemented the second half of the team lead's
 * original brief: *"if the people are unhappy, it should say so and indicate that people
 * are gonna start leaving. there needs to be clear consequence and indicator of discontent
 * (and same with livability)"*, and then, plainly: *"there needs to be an actual mechanic
 * of people leaving."*
 *
 * He then withdrew that half himself — *"maybe just remove the actual consequences just
 * tell them their people are unhappy?"* — and on 2026-08-05 it was settled as a product
 * decision: **citizens do not leave. Departures are removed as a mechanic, entirely.** So
 * `leaving`, `remaining`, the founding floor that capped them and `DEPARTURE_SHARE` are
 * gone from the model rather than zeroed, because a rule that computes a loss nothing
 * applies is the decorative version of the mechanic and the next reader would wire it back
 * up. **The INDICATOR is the whole of what this file is for now**, and that is the first
 * half of the same brief, untouched.
 *
 * The objection that turned out to be right was already written down here, in the paragraph
 * `city-vitality.ts` used to carry and that the departure rule was built to retire:
 * *"NOBODY LEAVES HERE … A departure with no legible return is the punitive version, so the
 * readout warns and the crowd stays."* That is now the shipped design, reached the long way
 * round. `test/departuresAreWired.test.ts` holds the tree to it and fails if a headcount
 * ever falls for a shortfall again.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THE FOUR DECISIONS THAT SURVIVED, EACH WITH ITS ARGUMENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ## 1. WHAT TRIGGERS IT: the `restless` band, which is a threshold that already exists
 *
 * A city is failing its people exactly when `HAPPINESS_BAND_FLOOR.settling` is not met —
 * which is to say exactly when `bandFor()` calls it `restless`, which is this model's own
 * word for unhappy and is already what the panel's face and label key on.
 *
 * **Inventing a second, lower number was the obvious alternative and it is the trap.** It
 * would let the panel's band label say one thing at 60 while its alarm lit at 30, and the
 * thirty points in between would be two readouts disagreeing about one city. One constant,
 * read by both, is the only shape in which "the label and the alarm agree" is structural
 * rather than a promise. The argument was written for the departure rule and it survives
 * the removal unchanged, because it was never about the consequence.
 *
 * ## 2. HOW DEEP: {@link pressure}, which is kept even though nothing acts on it
 *
 * How far below the line the city is, as a fraction of the line. It is what makes
 * {@link CityProvision.cause} computable at all — the cause is whichever of the two
 * deficiencies is the deeper — so it is not an ornament left behind by the removal.
 *
 * It is also the only thing a guard can read to prove the threshold is SHARED. Moving
 * `HAPPINESS_BAND_FLOOR.settling` and watching a boolean flip says nothing about whether
 * the panel and the engine read one number, because a boolean flips for any threshold at
 * all; watching a fraction move by the right amount does.
 * `departureThresholdIsShared.test.tsx` reads it for exactly that.
 *
 * **What it must NOT become is a magnitude for a loss.** That is the whole of the ruling,
 * and the shape of the file is the argument: there is no share, no floor, no count and
 * nothing to multiply.
 *
 * ## 3. WHICH DEFICIENCY: the deeper of the two, and sustenance wins a tie
 *
 * The lead's *"(and same with livability)"* is the second limb. An amenity is something the
 * city lacks; sustenance is something the person lacks, so sustenance is the more physical
 * failure and takes a tie.
 *
 * **THE SUSTENANCE LIMB IS UNREACHABLE ON TODAY'S ERA ONE, and that is stated here rather
 * than discovered later.** Measured over all 4096 mastery vectors with the free Smokehouse
 * the starting city is guaranteed: **0 of 4096** are short of livability, because the hub's
 * 8 plus that row's 20 already cover the founding crowd and every residence added after it
 * adds more livability than population. Drop the free row and it is 1216 of 4096, so the
 * limb is correct code over an input the shipped path does not currently produce.
 * `city-provision.test.ts` asserts both of those counts, so the day a catalogue change
 * makes it reachable — or makes it MORE reachable than anyone intended — the number moves
 * and the test says so, rather than this limb sitting here as a branch nobody knows is dead.
 *
 * ## 4. THE ALARM IS SILENT ON A CITY THAT IS ONLY ITS FOUNDERS, and the reason is no
 * longer about who could be lost
 *
 * {@link CityProvision.unmet} carries a second conjunct: the crowd has to have grown past
 * {@link FOUNDING_POPULATION}. It was there because the departure floor was the founding
 * crowd and a bare island could therefore lose nobody. That reason is void, and the
 * conjunct is kept because the ORIGINAL fact underneath it is still true and is a better
 * argument than the one it was carrying:
 *
 * **the hub provides for its founders on its own.** Era one's section 8.1 —
 * *"The Town Hall feeds and houses its founders on its own"* — and
 * `HUB_FOUNDING_LIVABILITY` is that same 8 expressed as a capacity. So on a bare island
 * there is no provision the PLAYER owes and nothing they have failed to do; the shortfall
 * this file reports is the gap between what the crowd needs and what the player has built,
 * and until the crowd exceeds the founders that gap is the hub's and it is covered.
 *
 * A learner who has not built anything yet has not failed at anything yet, and the alarm
 * staying dark there is the same cry-wolf rule as everywhere else on this panel. The BAND
 * still reads `restless` and the happiness row still prints *"Your people are unhappy!"*,
 * so the state is never hidden — what is withheld is the warning triangle, not the fact.
 *
 * ## WHAT THIS FILE DOES NOT DECIDE, AND NOW NEVER WILL
 *
 * Where anybody goes. `citizenPlaces.ts` used to put the leavers out at the water's edge
 * with their backs to the town, and that is deleted rather than parked: every citizen the
 * roster holds stands in the settlement, whatever this file reports.
 * `departuresOnTheIsland.test.ts` asserts it on the render layer.
 */

/** Which provision the city is short of, when it is short of one. */
export type ProvisionGap =
  /** Nothing in the city reaches them: happiness coverage below the band floor. */
  | "amenities"
  /** The city cannot sustain them at all: livability below the headcount. */
  | "sustenance";

export interface CityProvision {
  /**
   * How far the city is past the line that leaves people unprovided for, `0..1`.
   *
   * **Zero is the whole of "no alarm".** A panel reads this and nothing else to decide
   * whether to show its distressed state, which is what makes the band label and the alarm
   * one decision rather than two agreeing ones.
   */
  readonly pressure: number;
  /** What the city is short of, or `null` when it is failing nobody. */
  readonly cause: ProvisionGap | null;
  /**
   * **THE ONE BOOLEAN A SURFACE READS TO DECIDE WHETHER TO LOOK ALARMED.** True when the
   * city is past the line AND its crowd has grown past the founders the hub provides for
   * on its own.
   *
   * The second conjunct is §4's, and the opening of the game is what it is for: a bare
   * island is eight founders at zero coverage — the deepest {@link pressure} the model can
   * express — and there is no provision the player owes there, because the hub covers its
   * own founders. Warning would be the panel shouting at a learner who has not built
   * anything yet.
   *
   * **It is not a claim that anything will happen.** Nothing does; that is the ruling. It
   * says the city is short, and the row beside it says what of.
   */
  readonly unmet: boolean;
}

/**
 * How far under the happiness line the city is, as a fraction of the line.
 *
 * `0` at or above the threshold, `1` at zero coverage. Exported so the shared-threshold
 * guard can move `HAPPINESS_BAND_FLOOR.settling` and watch this move with it — see §2 for
 * why a boolean would not do.
 */
export function amenityPressure(happinessLevel: number): number {
  const threshold = HAPPINESS_BAND_FLOOR.settling;
  if (threshold <= 0) {
    return 0;
  }
  const under = threshold - Math.max(0, Math.min(100, happinessLevel));
  return under <= 0 ? 0 : Math.min(1, under / threshold);
}

/**
 * How far the city is from sustaining the people it has, as a fraction of them.
 *
 * The second limb, and it is the lead's *"(and same with livability)"* given a reading of
 * its own rather than only a colour. See §3 for the measurement that says it is
 * unreachable on era one as shipped.
 */
export function sustenancePressure(population: number, sustains: number): number {
  if (population <= 0) {
    return 0;
  }
  const unsustained = Math.max(0, population - Math.max(0, sustains));
  return Math.min(1, unsustained / population);
}

/**
 * The reading. Pure, total, and defined for every input including the degenerate ones: a
 * city of nobody, a negative capacity, a population under the founding crowd.
 *
 * **It returns no headcount of any kind**, and that is the load-bearing property rather
 * than an omission. `citizenPopulation` stays a pure function of learning state with no
 * capacity feedback (D-CIT2), monotone (D-CIT6), and this file cannot touch it because it
 * has nothing to report it through. Three shipped things depend on that:
 *
 *   - `citizens-invariants.test.ts` sweeps 4096 mastery vectors for monotonicity, and
 *     *"capacity never gates arrivals"*;
 *   - `ENDGAME_SPARE_HOMES = 0` pins full-mastery population against residence capacity;
 *   - `cityPeople.contract.test.ts` pins that the HUD and the renderer read ONE headcount.
 *
 * That last one is why a `remaining` beside the population would be as wrong as folding a
 * loss into it: two headcounts on one readout is two answers to "how big is my city", and
 * the shipped panel had to pick one of them to print.
 */
export function deriveProvision(input: {
  /** The headcount LEARNING brought — `citizenPopulation`, and this rule never reduces it. */
  readonly population: number;
  /** The happiness READOUT, 0..100, which is what the band and the panel both read. */
  readonly happinessLevel: number;
  /** How many the city can sustain. */
  readonly sustains: number;
}): CityProvision {
  const population = Math.max(0, Math.trunc(input.population));
  if (population <= 0) {
    // A city with nobody in it is failing nobody, so it is not alarmed either. Unreachable
    // through `deriveCityVitality` (the founding crowd is a constant term of
    // `citizenPopulation`) and handled anyway, because a panel that keys its distressed
    // state on `cause` must not light up over an empty city.
    return { pressure: 0, cause: null, unmet: false };
  }
  const amenities = amenityPressure(input.happinessLevel);
  const sustenance = sustenancePressure(population, input.sustains);
  // Whichever deficiency is deeper is the one the row names. Sustenance wins a tie because
  // it is the more physical failure: an amenity is something the city lacks, and sustenance
  // is something the person lacks.
  const pressure = Math.max(amenities, sustenance);
  const cause: ProvisionGap | null =
    pressure <= 0 ? null : sustenance >= amenities ? "sustenance" : "amenities";

  return {
    pressure,
    cause,
    // §4: the hub provides for its own founders, so a crowd that has not outgrown them has
    // no provision the player owes.
    unmet: pressure > 0 && population > FOUNDING_POPULATION,
  };
}
