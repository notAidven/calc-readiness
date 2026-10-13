import type { CitizenRoleId } from "./descriptors";

/**
 * The SINGLE tuning table for the city's LIVABILITY and HAPPINESS, pure and
 * framework-free, following `citizens-tuning.ts` and D-CIT14: every number the
 * feature has lives here rather than as a literal inside a derivation, and because
 * none of it is persisted a retune applies retroactively with no migration.
 *
 * THE MODEL THIS IMPLEMENTS IS NOT THIS FILE'S. It is
 * `packages/economy/src/capacity.ts`, and this file's rows MIRROR that module's
 * `CivicCapacityProfile` field for field — `livability`, `happiness`, `cost` — rather
 * than inventing a shape of their own.
 *
 * **THE MIRROR IS NOT AN IMPORT, AND THAT IS A CONTRACT RATHER THAN A PREFERENCE.**
 * INV-COS-1 (`docs/Contracts_Amendment_Cosmetic_Economy.md`: *"no economy field is an
 * input to any progression decision ... asserted structurally: the mastery service,
 * diagnostic engine, and isNeighborhoodReady() import NOTHING from the economy
 * module"*) forbids `engines/game/src` from importing the economy package at all, and
 * `packages/economy/src/one-way-invariant.test.ts` enforces it over this exact
 * directory because it also holds `isNeighborhoodReady` and the storm gates. That check
 * is a TEXT scan for the package specifier, so a type-only import fails it — and so does
 * naming the specifier in a comment, which is why this file describes the module by path.
 *
 * So the duplication is REQUIRED here, and what stops it drifting is a guard in a place
 * the contract allows: `test/capacityModelAgreement.test.ts` imports both lanes and
 * fails if this table stops satisfying `CivicCapacityProfile`, or if the derivation in
 * `city-vitality.ts` stops agreeing with `deriveCapacities` on any city. See that file
 * for the full argument and for what still needs Gabriel's sign-off.
 *
 *   - TWO CAPACITIES: livability and happiness.
 *   - **LIVABILITY IS ONE POOL. Housing and food are not tracked separately.** PR
 *     #236, merged 2026-07-29T17:59:55Z: *"Livability is one pool, and D-ERA24
 *     becomes a test over all ten catalogues."*
 *   - POPULATION is a derived readout, and so is the happiness LEVEL, with happiness
 *     COVERAGE being the capacity that era one's catalogue actually buys.
 *
 * WHAT THE SECOND RULING COST THIS FILE, recorded because it is the reason the table
 * looks different rather than merely renamed. #218 ruled two capacities with housing
 * and food as inputs to livability and left the aggregation open; this file shipped
 * `LIVABILITY_AGGREGATION = "binding"` for one day, on the measurement that a summed
 * era one let the food row weakly dominate the dwelling. #236 ruled the other way and
 * named that measurement for what it was: *"a PRICING problem wearing an aggregation
 * problem's clothes"*. So the union type, the constant, `aggregateLivability` and every
 * `housing`/`food` field are gone, and the catalogues were differentiated instead —
 * which is why the Longhouse below carries 5 happiness it did not have.
 *
 * WHAT IS DELIBERATELY NOT HERE, each because it is an open item someone else owns:
 *   - the LEGACY DECAY curve (O-5, Gabriel) — a frozen building's contribution does
 *     not fall here, so era one's figures are its build-time figures forever;
 *   - the ERA MULTIPLIER `2^(N-1)` (§7) — era one is x1, so era one's authored
 *     numbers ARE the base numbers and no multiplier is needed to render them;
 *   - TEARDOWN pricing (O-4, Gabriel).
 *
 * DEPARTURES ARE NOW HERE, and the paragraph that used to stand above deferring them
 * is gone rather than edited. It read: *"§7 says happiness 'decides whether they stay',
 * but what pulls a departed citizen back is O-7 (Evan) and the spec marks it as gating
 * the D-CIT6 reversal being shippable."* **O-7 is answered rather than waived**, and the
 * answer is that the question dissolves: a departure is DERIVED, so what pulls a departed
 * citizen back is raising the capacity that lost them, and the return needs no mechanism
 * at all because nothing was stored. See `city-departures.ts` for the whole argument and
 * {@link DEPARTURE_SHARE} for the one number it needs.
 */

/* -------------------------------------------------------------------------- */
/* Era one's civic catalogue (era one civic-buildings.md section 3)             */
/* -------------------------------------------------------------------------- */

/**
 * Era one's four bought types. Era-exclusive and frozen at build time (D-ERA11), so
 * this table is era one's forever and later eras author their own rather than
 * extending it.
 */
export type EraOneCivicTypeId = "smokehouse" | "longhouse" | "campfire" | "water_spring";

/**
 * What one civic building of a type contributes, and what it costs to put down.
 *
 * THE FIRST THREE FIELDS ARE `capacity.ts`'s `CivicCapacityProfile`, declared here
 * rather than inherited because INV-COS-1 forbids the import (see the file header).
 * `test/capacityModelAgreement.test.ts` assigns this type to his in a type position, so
 * the mirror is checked by `tsc` at a layer where the contract permits both imports —
 * a field renamed or dropped on either side fails there.
 *
 * `cost` CARRIES NO MATERIAL NAME, which is deliberate and is the second lesson of the
 * afternoon rather than a style preference. The field was `cost_flint`, and #233
 * renamed era one's material to `stone` on the team lead's recognisability ruling,
 * which made the field name a lie that nothing could catch — and broke the spec-
 * agreement guard's regex silently, since it matched on the literal `flint`.
 * `CivicCapacityProfile` defines `cost` as *"in that era's material at that era's
 * `2^(N-1)` scale"*, so the material lives in one place
 * (`packages/economy/src/materials.ts`) and a further rename cannot reach this table.
 */
export interface CivicBuildingType {
  /** People this can sustain — housing and food pooled, never separated. */
  readonly livability: number;
  /** Happiness coverage, the other capacity. */
  readonly happiness: number;
  /** In the era's material at that era's `2^(N-1)` scale. Era one is x1. */
  readonly cost: number;
  readonly id: EraOneCivicTypeId;
  /** The learner-facing name. Civic names may be era-flavoured (D-ERA9). */
  readonly name: string;
  /** Grid cells, `[width, depth]`. Era one's whole island is 88 cells. */
  readonly footprint: readonly [number, number];
  /**
   * The social role the roster reports for one of these, so the crowd's per-building
   * view and this table cannot describe the same building differently.
   *
   * D-CIT17 keys a role on `node_id`, and a civic building HAS NO NODE — it is bought
   * rather than earned, so it never appears in `student_node_state` and never gets a
   * `citizen_roles` descriptor entry. The role therefore has to be authored somewhere,
   * and it is authored HERE, beside the row it describes, for the same reason
   * `descriptors.ts` holds the skill roles: a role is the building's IDENTITY, and
   * identity lives with the thing rather than in the arithmetic.
   *
   * READ THE ROLE OFF WHAT THE BUILDING IS, NOT OFF WHAT IT PROVIDES. Under one pool
   * every livability contribution is the same number, so the Provides column cannot
   * tell a dwelling from a food store. Era one section 3's prose can: the Longhouse is
   * *"the era's densest dwelling: one roof over many people"* and is a `residence`; the
   * Smokehouse is *"where the settlement's survival actually happens"* and houses
   * nobody. The Campfire is a gathering place and the Water Spring a shared amenity, so
   * all three of those are `civic` — a workplace or a public place, which is what that role
   * means on the skill side too. NONE of them is a `school`: teaching is a skill
   * building's job in era one (`style-guide.md`'s Teaching Ground), and no bought row
   * teaches.
   */
  readonly citizen_role: CitizenRoleId;
}

/**
 * Transcribed from era one's section 3 table AS REBALANCED BY #236, whose four rows
 * are now:
 *
 * | Building      | Footprint | Provides                      | Cost      |
 * | Smokehouse    | 2x1       | food capacity for ~20         | 80 stone  |
 * | Family Lodge  | 2x2       | 20 livability + 5 happiness   | 80 stone  |
 * | Campfire      | 2x2       | 20 happiness coverage         | 100 stone |
 * | Spring        | 1x1       | 10 livability + 10 happiness  | 120 stone |
 *
 * THE JUDGEMENT THAT USED TO BE HERE IS GONE, and its disappearance is the ruling.
 * This table used to split each row's "Provides" between a `housing` and a `food`
 * field, and to argue from the section's prose which of the two each row fed — the
 * Longhouse *"one roof over many people"* as housing, and the 1x1 row — then the
 * Storage Pit — *"food security"* as food. Under one pool **a food row and a dwelling row are the same
 * contribution**, so there is nothing left to assign and the argument is void.
 * `capacity.ts` states the reading directly: *"A dwelling row's `Provides` column says
 * 'N livability' and a food row's says 'food for ~N'. Under one pool those are the same
 * contribution."*
 *
 * THE THREE THINGS THAT MOVED, none of them ours to choose:
 *   - `drying_racks` is now the **Smokehouse** and `hearth_circle` the **Campfire**,
 *     renamed in the era one spec by the same pass that rebalanced it;
 *   - the **Longhouse carries 5 happiness**. That figure is the whole rebalance as it
 *     touches era one: it is what stops the 2x1 Smokehouse weakly dominating the 2x2
 *     Longhouse now that both read as 20 livability for 80 stone, and it is asserted
 *     as an invariant over all ten catalogues by
 *     `test/eraCivicCatalogueDominance.test.ts`;
 *   - `flint` is `stone`, so the cost column is unitless here (see above).
 *
 * AND TWO MORE SINCE, NEITHER OF THEM OURS TO CHOOSE:
 *
 *   - `storage_pit` is now `water_spring`. The 1x1 row named a sunken thatch-capped pit
 *     that was never drawn; Evan's authored art for the slot is a stone-ringed spring,
 *     and he ruled for the art (*"the storage pit is supposed to be a bathhouse"*), so
 *     the ROW moved rather than the model. **NO FIGURE MOVED**: 1x1, 120, 10 + 10 are the
 *     same numbers under a new subject, and a re-price would have to clear the dominance
 *     sweep for the whole catalogue.
 *   - **THE TWO DISPLAY NAMES ARE THE TEAM LEAD'S, and they are not the ones this lane
 *     picked.** Both branches renamed the 1x1 row on 2026-07-29 and they chose different
 *     words: this lane wrote *The Water Spring* (uniqueness against era three's
 *     Bathhouse) while `integration` wrote **The Spring**, and it also renamed the 2x2
 *     dwelling from *The Longhouse* to **The Family Lodge**. His are the names that ship,
 *     for a reason that is not seniority: `packages/economy/src/civicCatalogue.ts` keys
 *     its parity census on the DISPLAY NAME in both directions against era one's section
 *     3, so a name this table and that catalogue disagree about is a name the tree cannot
 *     hold. Reconciled on the 2026-07-30 forward-merge. **The type IDS did not move** —
 *     `longhouse` and `water_spring` are the addresses the GLB basenames follow, and the
 *     two id spaces are independent by his catalogue's own declaration.
 */
export const ERA_ONE_CIVIC_TYPES: Readonly<Record<EraOneCivicTypeId, CivicBuildingType>> = {
  smokehouse: {
    id: "smokehouse",
    name: "The Smokehouse",
    footprint: [2, 1],
    cost: 80,
    livability: 20,
    happiness: 0,
    citizen_role: "civic",
  },
  longhouse: {
    id: "longhouse",
    name: "The Family Lodge",
    footprint: [2, 2],
    cost: 80,
    livability: 20,
    happiness: 5,
    citizen_role: "residence",
  },
  campfire: {
    id: "campfire",
    name: "The Campfire",
    footprint: [2, 2],
    cost: 100,
    livability: 0,
    happiness: 20,
    citizen_role: "civic",
  },
  water_spring: {
    id: "water_spring",
    name: "The Spring",
    footprint: [1, 1],
    cost: 120,
    livability: 10,
    happiness: 10,
    citizen_role: "civic",
  },
};

/* -------------------------------------------------------------------------- */
/* The starting city (section 8.1's solvency guarantee, INV-ERA-4)             */
/* -------------------------------------------------------------------------- */

/**
 * *"The Town Hall feeds and houses its founders on its own"* (section 8.1), so the
 * hub covers exactly the founding crowd — `FOUNDING_POPULATION`, restated here as a
 * capacity rather than imported, because this is a capacity figure and that one is a
 * headcount.
 *
 * **ONE CONSTANT, MATCHED TO `FOUNDING_POPULATION` RATHER THAN DOUBLED.** This was
 * `HUB_FOUNDING_HOUSING = 8` and `HUB_FOUNDING_FOOD = 8` (`FOUNDING_POPULATION` was 8
 * at the time), which under the limiting-factor reading came to `min(8, 8) = 8`.
 * Pooling two fields that each held the same headcount is the one place in this
 * reconciliation where the flip could have SILENTLY DOUBLED a shipped number: section
 * 8.1 gives the hub exactly its founders, so a hub sustaining twice `FOUNDING_POPULATION`
 * would hand the starting city that many citizens of free headroom it was never
 * authored to have. The two fields were never two provisions; they were one provision
 * described twice, once per input, and the inputs are what #236 deleted. Both numbers
 * moved together again when a later population rebalance bumped `FOUNDING_POPULATION`
 * from 8 to 12, which is why this constant is 12 rather than 8 today: the value
 * tracks the constant it restates, not a number pinned here.
 *
 * DELIBERATELY NOT ADDED TO `residenceCapacity`. That ledger decides WHICH BUILDING a
 * citizen's home is, and the shipped settled ending is pinned on its full-mastery
 * total equalling the population exactly (`ENDGAME_SPARE_HOMES = 0`). Livability is a
 * different question — how many the city can SUSTAIN — and section 8.1 answers it for
 * the founders without giving anybody a doorstep to stand on.
 */
export const HUB_FOUNDING_LIVABILITY = 12;

/**
 * *"Era one's free food building is the Smokehouse"* (era one section 4, correcting
 * section 8.1's pre-agricultural "first farm"). The free one is DECIDED; only how the
 * coach-mark introduces it is open (O-8, Evan), and that is a presentation question
 * this table does not touch.
 *
 * STILL THE FOOD ROW, and under one pool that is a statement about WHICH ROW rather
 * than about which input it feeds: the starting city is given the Smokehouse's 20
 * livability, and the fact that the spec calls it food is now flavour. What the free
 * row must still do is contribute LIVABILITY rather than happiness, because INV-ERA-4
 * asks the founders to be sustained and a free amenity would not sustain them.
 */
export const ERA_ONE_FREE_CIVIC: readonly EraOneCivicTypeId[] = ["smokehouse"];

/* -------------------------------------------------------------------------- */
/* What a SKILL building contributes (D-ERA7)                                  */
/* -------------------------------------------------------------------------- */

/**
 * D-ERA7: *"A skill building carries only a small livability or happiness
 * contribution, typed by its `citizen_roles` entry."* The livability half of that
 * sentence is already shipped and is `CITIZEN_NODE_CAPACITY`. The HAPPINESS half is
 * what this table adds, and the decision requires it be typed by the ROLE rather than
 * by the node, so it is.
 *
 * (D-ERA7's *"trickles resource"* clause is withdrawn — the no-generation ruling, era
 * one civic-buildings.md section 0: *"A skill building trickles nothing."* Nothing in
 * this file ever implemented the trickle, so the withdrawal costs it nothing.)
 *
 * FIRST GUESSES, in the sense `citizens-tuning.ts` uses the phrase: no magnitude is
 * authored anywhere, only that the contribution is "small". The tests pin the
 * RELATIONSHIPS — a civic building beats a school, a residence contributes none, and
 * every skill building in era one put together stays under one Campfire — so a
 * retune moves these digits without moving a test.
 *
 * `residence` is ZERO on purpose and that line is not crossed: a home is livability,
 * which it already provides on the other ledger. Counting it twice would let the
 * Dwellings answer both dials and collapse the trade D-ERA24 exists to protect.
 * (D-ERA24 is now executable over all ten catalogues, in
 * `test/eraCivicCatalogueDominance.test.ts`, which is what makes this a constraint
 * rather than an intention.)
 */
export const SKILL_HAPPINESS_BY_ROLE: Readonly<Record<CitizenRoleId, number>> = {
  residence: 0,
  school: 1,
  civic: 2,
};

/* -------------------------------------------------------------------------- */
/* The happiness readout (the ruling's derived half)                           */
/* -------------------------------------------------------------------------- */

/** The bands the happiness LEVEL reads out in. Never colour alone (D-CIT13). */
export type HappinessBand = "content" | "settling" | "restless";

/**
 * Percentage of the population covered at or above which each band starts. `content`
 * requires FULL coverage because section 6's settled ending is "everyone", not "most".
 *
 * COPY RULE (D-CIT13, INV-ERA-3): these bands may only ever describe what was BUILT.
 * None of them may key off study pace, absence, streaks, or wall-clock time, and none
 * of the words may shame — a shortfall is a management signal, not a verdict.
 *
 * ## `settling` IS ALSO THE ALARM LINE, AND THAT IS THE WHOLE OF ITS SECOND JOB
 *
 * A city below it is `restless`, which is this model's own word for unhappy, and
 * `city-provision.ts` reads exactly the same number. **There is no second threshold**,
 * which is not tidiness: a panel whose band label says one thing while its warning
 * triangle lights on another is two readouts disagreeing about one city, and two numbers in
 * two files is how they come apart. Move this one and both move together;
 * `departureThresholdIsShared.test.tsx` proves that by moving it.
 */
export const HAPPINESS_BAND_FLOOR: Readonly<Record<HappinessBand, number>> = {
  content: 100,
  settling: 60,
  restless: 0,
};

/*
 * ⚑ **`DEPARTURE_SHARE = 0.25` STOOD HERE AND IS GONE, BY A PRODUCT RULING.**
 *
 * It was the largest share of the crowd above the founding floor that could be away at
 * once, and its whole docblock was an argument about magnitude: *"A trickle reads as
 * consequence; a collapse reads as punishment"*, measured against era one's curve at 1, 2,
 * 3, 4, 5, 6 people lost as the six skills were mastered.
 *
 * That argument was sound and the mechanic it tuned was withdrawn — *"maybe just remove the
 * actual consequences just tell them their people are unhappy?"*, settled on 2026-08-05 as
 * **citizens do not leave**. The constant is deleted rather than set to zero for the reason
 * `city-provision.ts` gives at length: a dial whose only job is to scale a loss nothing
 * applies is an invitation to reconnect it. `HAPPINESS_BAND_FLOOR.settling` above is now the
 * only number the provision reading needs.
 */

/* -------------------------------------------------------------------------- */
/* Roads — happiness coverage from the gold-sink path network (D-CIT7 amplify) */
/* -------------------------------------------------------------------------- */

/**
 * Happiness coverage per laid road tile. Roads amplify city life (D-CIT7) and never
 * gate learning (INV-COS-1 / D-CIT18): this term feeds the happiness CAPACITY only,
 * never the roster, never a lesson, never mastery. A road still only ever blocks a
 * CELL.
 *
 * MAGNITUDE, measured against the band floors and era one's catalogue:
 *
 *   - **1 coverage per tile.** Integer capacities stay integer; a short path moves
 *     the dial by a visible count rather than a fraction the HUD would round away.
 *   - **Full mastery (pop 44, skill amenities = 9):** settling needs level ≥ 60 →
 *     coverage ≥ 27 → **+18 from roads** (18 tiles × 5 gold = 90 gold). That is a
 *     reasonable connecting network on the 88-cell island, and it is the first
 *     player-controllable way to leave `restless` while civics remain hard to buy.
 *   - **One Campfire = 20 coverage.** Matching it takes 20 road tiles, so when
 *     civics become buyable the Campfire stays the denser amenity (2×2 footprint,
 *     no gold, one placement) and roads do not make it pointless.
 *   - **Content (100%)** still wants coverage 44. Skills give 9; roads alone would
 *     need 35 more tiles — expensive enough that the settled ending is not a pave-
 *     everything freebie.
 *
 * Kept here with the other dial numbers (D-CIT14): retune is one edit, no migration.
 */
export const ROAD_HAPPINESS_PER_TILE = 1;
