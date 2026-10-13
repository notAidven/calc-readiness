import {
  type CivicBuildingDefinition,
  civicCatalogueForEra,
  civicFootprintCells,
  eraCostMultiplier,
} from "@cr/economy";
import type { EraId } from "@cr/skill-graph";

import { civicPlacementId } from "./civic";
import { civicOptionsForEra } from "./civicBuildings";

/**
 * **THE CIVIC BUILDINGS A LEARNER INHERITS WITH A CITY THEY DID NOT BUILD.**
 *
 * The product lead, on a caught-up city whose vitality panel is byte-identical to a cold
 * learner's on an empty island: *"lowkey just have it auto-seed one copy of each of the
 * civic buildings"* — then, on the intent behind it, which is what this module is built to:
 *
 * > *"structure it in the seeding to where they start with the livability/happiness they
 * > would have if they previously built those buildings"*
 *
 * So the target is a NUMBER TO MATCH rather than a rule to follow, and *one of each* is not
 * that number. Measured: era one's played-through city is **four Family Lodges and two
 * Campfires** — six buildings, two of the catalogue's four rows, four copies of one of them.
 * One of each would be the wrong count, the wrong composition and the wrong total.
 *
 * ## ⚑ THE REFERENCE, WHICH IS THE CRUX OF THE WHOLE CHANGE
 *
 * **An era's ‘closing city' is the cheapest set of whole buildings from its own catalogue
 * that reaches the era's capacity target on BOTH axes.** That is not this module's
 * invention; it is INV-ERA-4 / D-ERA15's own model of a played-through city, and
 * `packages/economy/src/civicSolvency.test.ts` is the sweep that proves every era can afford
 * it. The target is the era's headline magnitude times three — `3 × 20 × 2^(N-1)`, era one's
 * *"sustains ~60"* — and it is a pure function of which era you are in, because an era is
 * reached only by learning.
 *
 * **It is checkable rather than asserted, and it checks out.** `ERA_LAND_DEMAND`
 * (`packages/skill-graph/src/eras.ts`) authors, per era, *"every civic building the cheapest
 * closing city buys from era one to this era"* as a cumulative CELL COUNT — a column derived
 * independently, in another package, by another lane's exhaustive search.
 * {@link eraClosingCity} reproduces all ten of those figures exactly (24, 48, 72, 102, 126,
 * 156, 180, 210, 240, 261), which is what turns *"this is what a played-through player has"*
 * from a claim into a measurement. `inheritedCivics.test.ts` asserts that agreement per era,
 * so a catalogue re-price that moved one and not the other fails rather than drifting.
 *
 * It also means **the seeded city fits the era's island by construction**: those are the
 * exact cells D-ERA25 sized each era's buildable radius for.
 *
 * ### Why the bar is the TARGET and not equality with some particular played city
 *
 * Exact equality against *"a"* played-through city is not a well-posed bar, and this is
 * measured rather than hedged: **era two has two different cheapest cities**. Three Granaries
 * plus three Bread Ovens and four Village Houses plus two Bread Ovens both cost exactly 1,080
 * grain, and they do not provide the same thing — 120 livability against 160. A learner may
 * buy either, so there is no single number *"the"* played-through learner has.
 *
 * So the guard asserts the property every played-through city shares rather than one city's
 * figures: **the inherited loadout reaches `3 × 20 × 2^(N-1)` on both axes for every era it
 * covers.** That is the bar the closing city is bought to clear and the one INV-ERA-4 is
 * stated in terms of. Where a tie has to be broken anyway — because buildings have to stand
 * somewhere — this takes D-ERA25's own tie-break, the LARGER footprint, so the loadout is the
 * one the land budget was sized for.
 *
 * ### What this CANNOT match, and it is ONE number rather than three
 *
 * Livability, happiness and population come out within **exactly** the D-ERA7 amenity term of a
 * played-through city — the per-role happiness of a building the learner FINISHED, which is the
 * one figure that still records that this city's skills are undone. Measured at a four-age
 * placement (21 nodes, 24 civic buildings):
 *
 * ```
 * played through:            population 134   sustains 1032   coverage 942
 * caught up + closing city:  population 134   sustains 1032   coverage 900
 * gap:                                     0              0            42
 * ```
 *
 * The 42 is `Σ SKILL_HAPPINESS_BY_ROLE` over complete buildings.
 *
 * **⚑ IT WAS THREE NUMBERS UNTIL 2026-08-04, and closing two of them is #567's and not this
 * module's.** This read *"population 8 · sustains 988 · gap 126 / 44 / 42"*, because the
 * population and `residenceCapacity` were both gated on a mastery a tested-out learner does not
 * have, and `citizens-population.ts` said in as many words that *"since 2026-07-30 you cannot
 * test out into them either"*. The lead then ruled *"population should be proportional to era
 * always"*, and #567 added
 * `CitizenBuildingLedger.inherited` — a handed-over building holds the crowd AND the homes a
 * mastered one holds, off the passed `placement_estimate` rather than off mastery — which closed
 * the 126 and the 44 without lowering the floor the lead declined to reopen.
 * `caughtUpCityIsFurnished.test.ts` asserts both closures as EQUALITIES with a floor under the
 * surviving gap, so a regression in either lane fails there rather than drifting.
 *
 * **What the seeding still owes the panel is the MARGIN, not the crowd**: a four-age arrival
 * reads *"1032 sustained · room for 898 more"*, because these buildings are seeded to the era's
 * capacity TARGET — what a played-through city buys — while the crowd is the era's population. A
 * played-through learner sees the same surplus (O-20). See
 * `docs/superpowers/specs/2026-08-04-what-a-caught-up-city-inherits.md` §5; this module's job is
 * to be the honest arithmetic under that rather than to hide it by seeding less.
 *
 * ## THE SET IS DERIVED FROM THE CATALOGUE AND IS NEVER WRITTEN DOWN
 *
 * Neither half of *"which civics"* is a list in this file:
 *
 *  - **WHICH AGES** is the ages the walk actually FOUNDS, handed in by the caller — which is
 *    `EraPlacement.skipped`, the ages the diagnostic handed over, one at a time as each is
 *    founded. No era literal, no node count. A learner handed two ages inherits two ages'
 *    civics: you do not inherit buildings from an age you never reached.
 *  - **WHICH BUILDINGS** is the search above over `civicCatalogueForEra`, gated on
 *    {@link civicOptionsForEra} having distinct bundled art for the whole era. **Evan is
 *    authoring eras five to ten's civic buildings separately**, and the point of reading it
 *    this way is that the day his art lands, a learner caught up to era six starts inheriting
 *    era five's closing city with no edit here. `civicOptionsForEra` fails CLOSED on a
 *    part-authored era — 3 of 4 modelled is an empty catalogue, never three buildings — so a
 *    half-finished era cannot leak a lopsided set into a city.
 *
 * Today exactly eras one to four are model-backed, so a learner caught up to era six inherits
 * eras one to four's twenty-four buildings — which is *both* "everything that exists" and
 * "only ages at or below the placement" at once, because the two coincide while eras five to
 * ten have no art. The guard asserts the derivation rather than that coincidence.
 *
 * ## NOTHING IS BOUGHT, AND THAT IS STRUCTURAL RATHER THAN A SHORTCUT
 *
 * These are not purchases and must not go through `placeCivic`, for two independent reasons
 * either of which is on its own decisive:
 *
 *  1. **The learner is broke by ruled design.** §7.2 of the test-out review measured
 *     `spendable: 0`, because the earn table pays on practice evidence a tested-out node does
 *     not carry. A seeding that paid would refuse every building.
 *  2. **Era-exclusivity forbids it outright.** `placeCivic` returns `wrong_era` unless the row
 *     is the era the city is standing in (era one §1, D-ERA11). Every building seeded here is
 *     from an age the learner has already walked PAST, so the purchase path would refuse all
 *     twenty-four however rich they were. Granting material — the other option the lead
 *     rejected — would not have helped.
 *
 * What is seeded instead is what the model already says these are: buildings **bought in
 * their own era and frozen there**, which is exactly what `civicPlacementEra` reads back off
 * the placement id. So the inherited city is spelled the same way a played one is, and no
 * ledger row is invented for a spend that never happened.
 *
 * ## ⚑ WHERE THEY STAND IS NOT THIS MODULE'S, AND THAT IS THE IMPORT DIRECTION
 *
 * This file used to lay the seats out too, through `catchup/ringLayout` — and that import is
 * what turned trunk red. `citySession` read this module for the seeding, and `citySession` is
 * inside the era advance's transitive import closure, so the shipped advance could suddenly
 * see the catch-up's `foundingClock.ts` and `catchUpCannotShortenTheAdvance.test.ts` failed on
 * exactly the absence it exists to protect.
 *
 * So the seating moved to the lane that already owns `ringLayout` — **`catchup/civicSeats.ts`**
 * — and what is left here is WHICH buildings, which is a fact about the catalogue and the era
 * model. Every arrow now runs catch-up → city and none runs back, so no city module can
 * re-create that closure through this file. It also means this module reads no radius, no
 * island and no live store: it is a pure function of the era.
 */

/**
 * **THE CAPACITY AN ERA'S POPULATION NEEDS**, on both axes: three times the era's headline
 * magnitude, `3 × 20 × 2^(N-1)`.
 *
 * `civicSolvency.test.ts`'s `targetFor`, restated rather than imported — that file is a test
 * and a test is not a module anything may depend on. The two are held together by
 * `inheritedCivics.test.ts` reproducing `ERA_LAND_DEMAND`'s civic column, which is the
 * artefact both derivations feed, so a divergence fails somewhere rather than nowhere.
 */
export function eraCapacityTarget(eraId: EraId): {
  readonly livability: number;
  readonly happiness: number;
} {
  const people = 3 * 20 * eraCostMultiplier(eraId);
  return { livability: people, happiness: people };
}

/** What a set of catalogue rows provides, summed. */
export function loadoutCapacity(rows: readonly CivicBuildingDefinition[]): {
  readonly livability: number;
  readonly happiness: number;
} {
  let livability = 0;
  let happiness = 0;
  for (const row of rows) {
    livability += row.provides.livability;
    happiness += row.provides.happiness;
  }
  return { livability, happiness };
}

const closingCityByEra = new Map<EraId, readonly CivicBuildingDefinition[]>();

/**
 * **THE ERA'S CHEAPEST CLOSING CITY** — the minimum-cost multiset of whole buildings from its
 * own catalogue reaching {@link eraCapacityTarget} on both axes, in catalogue row order.
 *
 * An exhaustive search over building counts, which `civicSolvency.test.ts` keeps as
 * test-only on the grounds that *"shipping it would put an exhaustive search on a path the
 * HUD could call"*. That objection is about a HUD; this runs **once per founded age**, and is
 * memoised per era on top — so at most ten searches ever happen in a session and each is the
 * few-thousand-branch job that file measures. A greedy pick was the
 * alternative and is the wrong one here for the reason `greedyPlanCost` documents: it prices
 * the axes separately, cannot see a blend row covering both, and would therefore seed a city
 * a real player would not have bought.
 *
 * **THE TIE-BREAK IS D-ERA25'S: the LARGER footprint.** Era two really does have two cheapest
 * cities, and taking the land budget's own choice is what keeps this loadout the one each
 * era's radius was sized for. It is not a neutral choice — the two tied cities provide 120
 * and 160 livability — which is exactly why it is made explicitly here rather than falling
 * out of iteration order.
 */
export function eraClosingCity(eraId: EraId): readonly CivicBuildingDefinition[] {
  const memo = closingCityByEra.get(eraId);
  if (memo !== undefined) {
    return memo;
  }
  const rows = civicCatalogueForEra(eraId);
  const target = eraCapacityTarget(eraId);
  // No row can ever be needed more times than it takes to reach a target single-handed, which
  // is what keeps the search a few thousand branches rather than unbounded.
  const ceilings = rows.map((row) =>
    Math.max(
      row.provides.livability > 0
        ? Math.ceil(target.livability / row.provides.livability)
        : 0,
      row.provides.happiness > 0 ? Math.ceil(target.happiness / row.provides.happiness) : 0,
    ),
  );
  let bestCost = Number.POSITIVE_INFINITY;
  let bestPlans: number[][] = [];
  const counts = new Array<number>(rows.length).fill(0);

  const search = (
    index: number,
    livability: number,
    happiness: number,
    cost: number,
  ): void => {
    if (cost > bestCost) {
      return;
    }
    if (livability >= target.livability && happiness >= target.happiness) {
      if (cost < bestCost) {
        bestCost = cost;
        bestPlans = [[...counts]];
      } else {
        // Collected rather than discarded: the tie is real and the tie-break below is a
        // decision, so a search that stopped at the first winner would make it silently.
        bestPlans.push([...counts]);
      }
      return;
    }
    const row = rows[index];
    const ceiling = ceilings[index];
    if (row === undefined || ceiling === undefined) {
      return;
    }
    for (let count = 0; count <= ceiling; count += 1) {
      counts[index] = count;
      search(
        index + 1,
        livability + count * row.provides.livability,
        happiness + count * row.provides.happiness,
        cost + count * row.cost,
      );
    }
    counts[index] = 0;
  };
  search(0, 0, 0, 0);

  let chosen: number[] = [];
  let chosenCells = -1;
  for (const plan of bestPlans) {
    const cells = plan.reduce((sum, count, index) => {
      const row = rows[index];
      return row === undefined ? sum : sum + count * civicFootprintCells(row);
    }, 0);
    if (cells > chosenCells) {
      chosenCells = cells;
      chosen = plan;
    }
  }
  const city: CivicBuildingDefinition[] = [];
  chosen.forEach((count, index) => {
    const row = rows[index];
    if (row === undefined) {
      return;
    }
    for (let copy = 0; copy < count; copy += 1) {
      city.push(row);
    }
  });
  closingCityByEra.set(eraId, city);
  return city;
}

/**
 * Whether an age's civic buildings can be inherited at all: its whole catalogue has to have
 * bundled art behind it.
 *
 * {@link civicOptionsForEra} fails CLOSED on a part-authored era — 3 of 4 modelled is an empty
 * catalogue, never three buildings — so a half-finished age cannot leak a lopsided set into a
 * city, and the day Evan's era-five art lands era five joins with no edit here.
 */
export function eraCivicsAreAuthored(eraId: EraId): boolean {
  return civicOptionsForEra(eraId).length > 0;
}

/** The subset of the ages handed over that have a civic catalogue with art behind it. */
export function inheritedCivicEras(handedEras: readonly EraId[]): readonly EraId[] {
  return handedEras.filter((eraId) => eraCivicsAreAuthored(eraId));
}

/**
 * **THE CIVIC BUILDINGS ONE FOUNDED AGE HANDS OVER** — its closing city, or nothing at all
 * when the age has no authored art.
 *
 * The per-age entry point, and the one the seeding actually calls: the ages are seeded one
 * founding at a time, because the island that has room for them is the one that age's founding
 * grew.
 */
export function eraCivicLoadout(eraId: EraId): readonly CivicBuildingDefinition[] {
  return eraCivicsAreAuthored(eraId) ? eraClosingCity(eraId) : [];
}

/**
 * **EVERY CIVIC BUILDING THE ARRIVING LEARNER OWES**, in era order and then in each era's own
 * catalogue row order — the concatenation of every inherited age's closing city.
 *
 * Cumulative, because a civic building is bought once and stands forever (D-ERA11, no
 * renovation), which is the same reason `ERA_LAND_DEMAND`'s columns are running totals. It is
 * the whole walk's total rather than one age's: what a learner is OWED by the end, which is the
 * denominator every count below is reported against.
 */
export function inheritedCivicLoadout(
  handedEras: readonly EraId[],
): readonly CivicBuildingDefinition[] {
  return handedEras.flatMap((eraId) => eraCivicLoadout(eraId));
}

/**
 * One age's loadout as placement ids, minted from `sequenceFrom`.
 *
 * **THE SEQUENCE IS AN ARGUMENT BECAUSE THE AGES ARRIVE ONE AT A TIME.** `civic.ts`'s scheme is
 * *"a monotone counter over the session's whole civic list… so an id is never reused after a
 * teardown hands a plot back"*, so an age seeded after another mints past the ids already
 * standing — `civicSequenceAfter` over what the session is holding, which is what the caller
 * passes.
 *
 * **What that is NOT, said accurately because the comment here first claimed it was:** it is not
 * today preventing a collision. Measured — every catalogue row id is era-prefixed
 * (`prehistoric_campfire`, `neolithic_granary`), so restarting each age at `0` mints
 * `civic:neolithic_granary:0` beside `civic:prehistoric_campfire:0` and nothing overlaps.
 * Injecting that restart leaves `inheritedCivicsSeatedAtTheFounding.test.tsx` at 16 passed; what
 * fails is `civicSeats.test.ts`'s sequence census, which is the assertion that holds the scheme
 * rather than the symptom. The offset is what keeps *"no two eras share a row id"* from being
 * load-bearing — the day one is offered in two ages, or an age is seeded twice, a restart would
 * have the second claim the first's id, and the session refuses that rather than overwriting it.
 */
export function eraCivicPlacementIds(eraId: EraId, sequenceFrom = 0): readonly string[] {
  return eraCivicLoadout(eraId).map((row, index) =>
    civicPlacementId(row.id, sequenceFrom + index),
  );
}

/** Every id the whole walk owes, in walk order, as one run of sequence numbers. */
export function inheritedCivicPlacementIds(
  handedEras: readonly EraId[],
): readonly string[] {
  return inheritedCivicLoadout(handedEras).map((row, index) =>
    civicPlacementId(row.id, index),
  );
}
