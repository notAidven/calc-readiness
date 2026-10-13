import { MASTERY_BAR } from "@cr/mastery-service";

/**
 * The ONE economy tuning table (resource spec §12). Every magnitude the rules
 * read lives here — earn amounts, the mastery bar row 1 is paid at, the per-practice-set
 * cap and the per-era bound on how many drill sets pay at all. First guesses will be
 * wrong; keeping them in one place makes retuning a code change that applies
 * retroactively (balances are reconstructed from the ledger).
 *
 * **THE XP→LEVEL CURVE AND THE RANK TITLES WERE HERE AND ARE GONE** (team lead,
 * 2026-08-03: *"sunset the cosmetic shop and xp systems completely"*). So are the
 * cosmetic prices this header used to point at, which lived on the catalog descriptors.
 * What is left is the ONE currency: the era's material.
 *
 * THREE deliberate exclusions, and **every one of them is a wall clock**:
 * - There is NO passive-income constant (rate/capacity/fill-window), because there
 *   is NO passive income of any kind (§5.5). Do not add one.
 * - There is NO island-condition constant (decay window / floor), because the
 *   CONDITION CLOCK IS SUNSET (team lead, 2026-07-29: "i think we're gonna sunset
 *   condition clock - don't really think it makes sense in the new model"). Nothing
 *   replaces it, and a crisis mechanic that may reuse the idea is unspecified. Do not
 *   add one back.
 * - There is NO `windowMs` on {@link CAP}, because the practice cap is PER PRACTICE SET
 *   (team lead, 2026-07-29: "cap shouldn't be daily - it should be per-practice"). It
 *   was the last wall-clock-keyed magnitude in the economy, and it outlived the
 *   condition clock by a week. Do not add one back either.
 *
 * All three are one prohibition read three ways, which is why they are listed
 * together rather than argued separately: **no magnitude in this table may be
 * denominated in time.** `clockless.test.ts` is where that stops being prose.
 */

/**
 * WHAT PRICES ARE DENOMINATED IN, now that there is one currency.
 *
 * Civic building costs live on the catalogue rows (`civicCatalogue.ts`), authored at era
 * one's `×1` scale and multiplied by `eraCostMultiplier` at the point of sale. So a
 * 12-unit building is 12 stone in era one and 6,144 data in era ten: the same fraction
 * of an era's wealth, which is the only reading that survives materials not converting
 * forward (O-6).
 */

/** Reason codes carried on ledger rows (resource spec §6 / §8.2). */
export const REASON_LESSON_COMPLETE = "lesson_complete";
export const REASON_INTERLEAVED = "interleaved";
/**
 * One scored lesson-practice set, keyed by its mastery-evidence id.
 *
 * The row's `reason_code` remains either lesson completion (first qualifying set) or
 * interleaved/repeat practice (later sets), because those names decide the amount and cap.
 * This name is the transaction's idempotency namespace: one genuine set can select exactly
 * one of those rewards, and replaying it cannot select the other one after state changes.
 */
export const REASON_PRACTICE_COMPLETE = "practice_complete";
/** One lesson's material advanced when an island is founded: `island_founding:<era>`. */
export const REASON_ISLAND_FOUNDING = "island_founding";
/**
 * A one-time onboarding top-up, once per era, so a learner reaching the civic-buildings
 * tour step can place one immediately rather than being told about a purchase they cannot
 * yet afford: `civic_bootstrap:<era>`.
 */
export const REASON_CIVIC_BOOTSTRAP = "civic_bootstrap";
/** Restore one island's wallet to its authored total: `island_reset:<era>:<generation>`. */
export const REASON_ISLAND_RESET_PREFIX = "island_reset:";
/** A material spend on a civic placement: `build:<placement_id>`. */
export const REASON_BUILD_PREFIX = "build:";
/**
 * A material spend PUTTING CRISIS DAMAGE RIGHT: `repair:<damage_id>:<kind>:<subject>`.
 *
 * Distinct from {@link REASON_BUILD_PREFIX} because the two answer different questions
 * about the same ledger. A `build:` row says a building was BOUGHT, so its subject is a
 * placement that did not exist before it; a `repair:` row says a building the player
 * already earned, or ground they already held, was put back. Reading a repair as a build
 * would make the ledger claim the player bought a skill building, which is precisely what
 * the failure floor forbids — an earned building is never removed and so never re-bought.
 *
 * The subject carries a DAMAGE ID as well as the thing repaired, because one building may
 * be ruined by one crisis, repaired, and ruined again by the next. `build:` needs no such
 * part (a placement is bought once ever); a repair is once per ruin, not once per building.
 */
export const REASON_REPAIR_PREFIX = "repair:";
/** An era-advance carry-forward, both legs: `era_advance:<era_id>`. */
export const REASON_ERA_ADVANCE_PREFIX = "era_advance:";

/**
 * The minimum distinct practised skills needed to claim an interleaved round.
 *
 * Shared by the browser's offer/scheduler and the authenticated evidence validator: if
 * those two floors drift, the browser can present work the server can never clear, or the
 * server can pay a one-skill repetition the product does not call interleaving.
 */
export const INTERLEAVED_PRACTICE_MIN_COMPLETED = 2;

/** Authored material price of one durable road cell; server save derives spend from row count. */
export const ROAD_TILE_MATERIAL_COST = 5;

/**
 * The reason prefixes that NAME WHAT A SPEND BOUGHT. Every `spend` row must carry
 * one, which is the clause that keeps "spend" from meaning "material left for no stated
 * reason": before materials existed, a subject-less debit was caught by the
 * `cosmetic_id`-is-set rule, and re-keying that rule off the purchase prefix (so a
 * civic placement could carry no cosmetic) opened exactly that hole. The
 * `economyPersistence.test.ts` forged-blob case is the test that found it, and this
 * list is now the ONLY thing standing where those two clauses used to overlap.
 *
 * `purchase:` LEFT THIS LIST WITH THE SHOP (2026-08-03). A row carrying it is no longer
 * a legal spend, which is deliberate: a stored blob or an Aurora row minted before the
 * sunset fails the invariant rather than restoring a purchase nothing can undo.
 *
 * `era_advance:` appears on BOTH legs of a carry-forward (the old material's debit
 * and the new material's credit) under one event id, so this list is asserted in the
 * spend direction only — a grant may legitimately carry it.
 */
export const SPEND_REASON_PREFIXES: readonly string[] = [
  REASON_BUILD_PREFIX,
  REASON_REPAIR_PREFIX,
  REASON_ERA_ADVANCE_PREFIX,
  REASON_ISLAND_RESET_PREFIX,
];

/**
 * The repeatable earn source(s) the rolling cap covers (D-R6: row 2 only). Row 1
 * (lesson complete) and row 3 (star) are one-time/monotonic and left UNCAPPED, so
 * capping them can never throttle honest first-time progress.
 */
export const CAPPED_REASONS: ReadonlySet<string> = new Set([REASON_INTERLEAVED]);

export function isCappedReason(reasonCode: string): boolean {
  return CAPPED_REASONS.has(reasonCode);
}

/**
 * **THE ERA TOTAL: how much material an era grants across ALL of its lessons, at era
 * one's `×1` scale.** Scaled by `ERA_COST_MULTIPLIER_STEP ** (N-1)` for era N.
 *
 * THE RULING (team lead, 2026-07-29, verbatim): *"each era should give about the same
 * amount of total resource - it shouldn't fluctuate. adjust by scaling the reward per
 * lesson relative to the # of lessons."* So the authored constant is the TOTAL and the
 * per-lesson rate is derived (`lessonMaterialAmount`), which is the opposite of what
 * shipped before — a flat 100 per lesson, with the era total left to whatever the node
 * count happened to be.
 *
 * **THIS IS WHAT FIXES THE INSOLVENCY.** Era sizes run 6, 5, 5, 5, 5, 6, 6, 9, 6, 9,
 * so a flat per-lesson rate made supply `100 × lessons` against a need that does not
 * know how many lessons an era has. Measured before this change: solvency was exactly
 * `lessons >= 6`, and the four five-node eras failed — not by a rounding error but
 * structurally. Normalising the total removes `lessons` from the supply side entirely,
 * so all ten eras clear by construction rather than by tuning.
 *
 * ## The constant is bounded on BOTH sides, and scarcity is the reason
 *
 * THE SECOND RULING (team lead, 2026-07-29, verbatim): *"there should be a tradeoff.
 * if theres enough gold to buy everything then decisions are meaningless. the resource
 * is what should fund the cosmetics - resources should be the purchase point for
 * everything."* So this number may not simply be made generous: an era that funds the
 * whole city AND the whole cosmetics catalogue has deleted the only decision the single
 * currency exists to create.
 *
 * Both bounds are measured, not asserted — `civicSolvency.test.ts` derives them:
 *
 *  - **FLOOR: 540.** The worst era's optimum city cost at era-one scale (the ten run
 *    480–540). Below it an era is literally unfinishable, which is a dead end rather
 *    than a trade, and it would breach INV-ERA-4.
 *  - **CEILING: 2182.** The cheapest era's optimum (480) plus the entire cosmetics
 *    catalogue (1,702 across its twenty purchasable items). At or above it, some era
 *    affords everything and the decision evaporates.
 *
 * So any `540 < T < 2182` satisfies the ruling. **Landed at 600**, near the floor
 * rather than mid-range, for two reasons: it is era one's existing figure (6 nodes ×
 * the old flat 100) and era one is the only era whose numbers have been reviewed, so
 * this change re-prices nine eras and leaves the anchor exactly where it was; and the
 * ruling asks for teeth, which means erring low.
 *
 * WHAT THAT BUYS, as a SHARE of the era total, because that is the figure that stays
 * true when prices move: headroom is **10% to 20%** of an era's grant (**59.98–120** at
 * era-one scale, varying with the era's own catalogue). This read "10% to 20.5%
 * (60–123)", which was the nine-node rounding taken in the wrong direction: the rate
 * rounds DOWN, so the two nine-node eras land 3 under and the band's low end is era
 * eight's 59.977 rather than a flat 60 — and 123 would require an era 3 OVER, which the
 * arithmetic cannot produce. The top of the published band was 2.5 points too generous,
 * which matters because it is what a retune gets sized against.
 * `civicSolvency.test.ts` pins both ends. Summed over all ten eras a
 * player who completes every city can afford about **43%** of the cosmetics catalogue,
 * and the two aspirational items (210 and 240) are unbuyable in ANY single era without
 * giving up part of that era's city. That is the trade, and it has teeth.
 *
 * > **46% UNTIL 2026-07-30.** The per-era cost-variance ruling (see `civicCatalogue.ts`)
 * > left this constant, the floor, the ceiling and every headroom figure above untouched —
 * > the re-price holds each era's `min(food, dwelling) + amenity` at 180 at era-one scale,
 * > which is what the greedy plan buys. What it did move is the EXACT optimum in two eras:
 * > eras two and three used to price their dwelling level with their food row, which let
 * > four dwellings cover an amenity's happiness for less, and both now pay a premium for
 * > housing. That took **40 of era-one-scale headroom** out of the run, so the cumulative
 * > figure is 740 rather than 780. **Recorded rather than compensated for**, because the
 * > direction is toward the scarcity the second ruling above asks for.
 *
 * **The lesson channel is the only thing this bounds.** Practice pays material too (row
 * 2 below), and that channel is bounded by effort rather than by time — the cap is per
 * practice set, and {@link DRILL_PAID_SETS_PER_ERA} bounds how many sets pay at all. The
 * size of the commitment is measured rather than asserted: **86** completed sets for the
 * whole cosmetics catalogue at a payout of 20, where it was 69 at 25 and 171 at the
 * retired 10. **A run's drill income is now finite too**, at ten paid sets an era across
 * ten eras — 100 sets, so the catalogue is reachable but only across most of a run
 * rather than inside one era. See {@link CAP}, {@link DRILL_PAID_SETS_PER_ERA}, and
 * `civicSolvency.test.ts` for the derivation.
 */
export const ERA_MATERIAL_TOTAL = 600;

/**
 * **THE BAR ROW 1 IS PAID AT: the persisted `mastery` that four of five correct
 * produces.** Re-exported from `@cr/mastery-service`, where it is derived from
 * `masteryFromCorrectCount(MASTERY_CORRECT_COUNT)`, so no consumer of this package
 * has to know that the answer happens to be 2 today.
 *
 * THE RULING (team lead): **currency rewards competence, not attendance.** Row 1 used
 * to pay on a FINISHED union that included `lesson_stage === "done"`, and a learner
 * who worked all five questions and scored three still lands on `done` — so the full
 * material grant was an attendance payment. XP already rewards depth through the star
 * row (row 3, which fires per star from mastery alone), so the currency is free to
 * demand the bar without leaving below-bar work unrecognised.
 *
 * **A learner below the bar is NOT YET PAID rather than permanently excluded**, which
 * is the whole reason this is humane rather than punitive: practice sets are
 * re-runnable from the building menu, mastery is written as `max(existing, evidenced)`
 * so a re-run can only raise it, and the grant is DERIVED on every city load — so
 * crossing the bar later pays the same event id, once, with no retroactive sweep
 * needed. `useEconomy.ts` holds the derivation and the argument.
 */
export const LESSON_GRANT_MASTERY_BAR = MASTERY_BAR;

/**
 * Earn magnitudes per trigger (resource spec §6). **ONE currency: the era's material.**
 *
 * ## THE EARN TABLE IS TWO ROWS NOW, AND THE THIRD DID NOT LOSE A FIELD — IT LEFT
 *
 * Row 3 (a mastery star) paid `{ xp: 15 }` and, by the D-R3 asymmetry, deliberately no
 * currency at all: *"stars credit competence/depth, which currency never rewards."* With
 * XP sunset (team lead, 2026-08-03) that row's whole payout is gone, so it grants an
 * empty set — a recipe, an event id and a reconciliation pass that between them credit
 * nothing. `starGrant`, `starEventId`, `REASON_STAR` and `reportStar` are therefore
 * deleted rather than reduced to a no-op that still costs a round trip per star.
 *
 * **The mastery STARS are untouched.** They are a mastery visual over a building
 * (`city/three/MasteryStars.tsx`, driven by `masteryVisuals.ts`), not an economy row;
 * what went is the payout the economy attached to reaching one.
 *
 * GOLD IS RETIRED (the gold-drop, 2026-07-29). Both surviving rows used to credit gold
 * and one credited a material lump beside it; both now credit the material and only the
 * material.
 *
 * Note what is NOT here: a per-lesson material amount. That is derived from
 * {@link ERA_MATERIAL_TOTAL} and the era's node count, so it cannot be a constant.
 */
export const EARN = {
  /**
   * Row 1 — lesson completed: the era MATERIAL. One-time per node, uncapped.
   *
   * The material amount is `lessonMaterialAmount(era)`, not a field here. This is the
   * payout INV-ERA-4 (solvency) rests on: population arrives with lesson completion,
   * so the means arrive alongside the mouths — and now they arrive in the same
   * quantity in every era.
   */
  lessonComplete: {},
  /**
   * Row 2 — interleaved practice cleared: material, REPEATABLE and CAPPED.
   *
   * `material` is at era-one scale and is credited in the CURRENT era's material,
   * scaled by that era's multiplier — so practice is worth the same fraction of an
   * era's wealth wherever the player is.
   *
   * **20, AND IT IS THE 30% TARGET REVISED DOWN TO 25%.** The figure has now moved
   * twice: 10 (the retired gold number, carried verbatim through the gold-drop so that
   * change would be a re-denomination rather than a silent re-tune), then 25 for a 30%
   * target, and now 20. {@link ERA_MATERIAL_TOTAL} is unchanged at 600 through all three.
   *
   * Practice's share is `K·m / (T + K·m)` for `K` sets at payout `m` against era total
   * `T`, which the era ladder leaves invariant because `2^(N-1)` multiplies both terms
   * and cancels. **The denominator is era INCOME, not the lesson channel** — the two
   * readings differ by eight points here, so it is stated rather than assumed. Setting
   * that to 25% gives `K·m = T/3`, and at the tree's own realistic ten sets
   * (`civicSolvency.test.ts`) that is `m = 20` EXACTLY: no rounding, unlike the 30%
   * target, which wanted 25.71 and was taken at 25. Measured at 20: **25.00% of total
   * era income**, 33.33% of the lesson channel.
   *
   * **THE COSMETICS FIGURES THIS PARAGRAPH CARRIED ARE RETIRED WITH THE SHOP.** They
   * priced the drill in "completed sets to buy the whole catalogue" (86 at this payout,
   * 69 at 25, 171 at 10), and there is no catalogue to buy. What is left of the scarcity
   * ruling is the CITY: an era's lesson channel is 600 against a cheapest solvent city of
   * 480–540, so the trade is still real and is now entirely about which buildings go up.
   * `civicSolvency.test.ts` carries that derivation and no longer carries the other.
   *
   * {@link CAP} needs no second edit — `maxMaterial` is DEFINED as this field, which is
   * the derivation doing its job rather than a coincidence. {@link DRILL_PAID_SETS_PER_ERA}
   * is the OTHER half of this ruling, and it is the half that makes the 25% reachable
   * rather than hypothetical: with no bound on the count, `K` is unbounded and practice's
   * share has no ceiling at all.
   */
  interleaved: {
    material: 20,
    /**
     * **WHAT A DRILL SET PAYS ON SKILLS THE LEARNER HAS IN HAND.** The field above is the
     * ceiling and this is the floor; `interleavedPayout` reads between them on how hard
     * the learner is finding the round's skills.
     *
     * THE RULING it implements: rewards *"should be capped or decreased after the user has
     * demonstrated they have fully understood a concept"*, and should be larger on the
     * concepts they struggle with. Both halves are one number, because the second is only
     * meaningful relative to the first — "more for hard skills" with no reduced rate
     * elsewhere is just a bigger payout.
     *
     * **THE BONUS IS BUILT DOWNWARD, AND IT HAD TO BE.** `CAP.maxMaterial` is DEFINED as
     * `material`, and `interleavedGrant` passes `capped: true`, so anything above 20 is
     * clamped and a struggle bonus stacked on top of 20 would credit nothing. Making the
     * mastered rate lower is the only shape that fits, and it has the better side effect:
     * an era's drill income can now only FALL from the 200 the solvency sweep is measured
     * at, so no era can be pushed toward the ruled share by this change.
     *
     * **TEN, and it is the payout the drill shipped with for most of its life** — the
     * retired gold figure, carried verbatim through the gold-drop and only raised to 20 by
     * the 25%-of-era-income retune. So a learner drilling skills they have mastered earns
     * what the drill has historically paid, and the struggle bonus is an increase on top of
     * a known-liveable rate rather than everyone taking a cut. Exactly half the ceiling, so
     * "your focus skills pay double" is a sentence a learner can be told.
     *
     * **AN UNKNOWN LEVEL PAYS THE CEILING, NOT THE FLOOR** (`interleavedPayout(null)`).
     * The reduction is a claim about demonstrated command, and no data is not a
     * demonstration; a caller with no signal must not have one inferred against the
     * learner.
     */
    materialFloor: 10,
  },
} as const;

/**
 * The anti-grind cap (D-R6, §7 layer 4) — **PER COMPLETED PRACTICE SET**, not per day.
 *
 * Covers the repeatable source only (row 2). The one-time lesson grant is never passed
 * through it, so honest first-time progress is never throttled.
 *
 * ## THE ROLLING 24-HOUR WINDOW IS GONE, and it is a clock that went
 *
 * THE RULING (team lead, 2026-07-29, verbatim): *"cap shouldn't be daily - it should be
 * per-practice."*
 *
 * A rolling window is not merely a different unit from a per-set bound, it is **the same
 * species of mechanic as the condition clock** that was sunset the same week: a payout
 * that depends on when you last played rather than on what you did. This repo has now
 * ruled against time-based economics three times — D-CIT2 on population, the
 * no-generation ruling on resources (§5), and the condition-clock sunset (§5.3) — and
 * this window was the last one standing. It was also the only reason a PATIENT player
 * could out-earn an engaged one: past the twentieth set in a day the engaged player was
 * paid nothing and had to wait, while the patient one was never throttled at all.
 *
 * So there is NO `windowMs` here and there must not be one again. `capMaxFor` is a pure
 * function of the resource: it reads no ledger, no history and no instant, which is the
 * strongest form the ruling can take. `clockless.test.ts` sweeps for the shape.
 *
 * ## What it BOUNDS, now that it is not bounding time
 *
 * Income from ONE set is bounded here; income from MANY sets is bounded by
 * {@link DRILL_PAID_SETS_PER_ERA}, which is a different mechanism and a new one. Both
 * are keyed on effort — you cannot idle your way to either — and neither reads a clock.
 *
 * **THE COSMETICS CATALOGUE WAS THE UNIT THIS USED TO BE MEASURED IN, and it is gone.**
 * The figures were "86 completed practice sets buy the entire 1,702-unit catalogue" at
 * this payout, 69 at 25 and 171 at 10. With the shop sunset the only thing the drill's
 * income buys is the city, which `civicSolvency.test.ts` measures per era against the
 * lesson channel it sits beside.
 *
 * ## THE PER-ERA PRACTICE CEILING WAS WITHDRAWN AND IS NOW BACK, FOR A DIFFERENT REASON
 *
 * A hard per-era ceiling on practice income was queued and **WITHDRAWN** (team lead,
 * 2026-07-29) on the measurement below, and {@link DRILL_PAID_SETS_PER_ERA} is one. That
 * is a reversal and is recorded as one rather than smoothed over: the withdrawal was
 * argued from "the rule would only ever bind a player who does not exist", and the
 * mastery gate changed who the player is. A learner stuck below the bar on one node now
 * has a REASON to grind the Town Hall — replacing that node's lesson grant — which is
 * exactly the player the withdrawal assumed away.
 *
 * The rest of the withdrawal's measurement still holds and is kept, re-derived at 20:
 *
 *  - The retired window **never bound anything below the eleventh set in a day**, so it
 *    was adding waiting rather than limiting totals. The per-set payout was always the
 *    real bound, which is why removing the window changed no total at all.
 *  - Practice would have to exceed **30 sets in one era** to out-earn that era's entire
 *    lesson channel (`ERA_MATERIAL_TOTAL / EARN.interleaved.material`, so 30 sets is
 *    exactly the era total and 31 is where it passes) — three times the new bound, so
 *    the drill can never out-earn the lessons in an era.
 *  - Ten sets in an era earns **200 against 600, 33% of the lesson channel** and 25% of
 *    era income. Pinned in `civicSolvency.test.ts` rather than left as a claim here.
 *
 * **What has NOT come back is the shape the withdrawal was really about.** The concern
 * then was a cap **modelling an adversary rather than a learner** — there are no other
 * players, no leaderboard and nothing to hoard against, so a cap whose only effect is to
 * stop someone practising is the wrong shape whatever its units are. This bound does not
 * stop anyone practising: past it the drill still runs and still counts the streak. It
 * stops the drill being a way to BUY PAST a skill, which is a different objection and
 * the one the mastery gate creates.
 *
 * **PAST THE BOUND A SET NOW PAYS NOTHING AT ALL, where it used to pay XP.** That is the
 * sunset's one behavioural consequence outside the shop, and it is stated rather than
 * discovered: the "and it still pays XP" softening of the cliff is gone with the resource
 * it was denominated in. What is left is the streak, the fresh problems, and copy that
 * says so — `useEconomy.reportInterleavedClear` distinguishes a spent allowance from a
 * double-reported set so the learner is never told the wrong one.
 *
 * ## The two numbers are DERIVED from the payout, so they cannot drift apart
 *
 * In a per-window world the cap and the payout were independent: the cap bounded an
 * accumulation, the payout was one contribution to it. Per practice set they are the
 * same fact — "a practice set pays this much, and nothing can make it pay more" — so
 * authoring them separately would only create a way for them to disagree, and a payout
 * raised above a stale ceiling would silently clamp to the old value forever.
 *
 * That does not make the cap vacuous. It still clamps any request larger than one set's
 * worth, which is what a mis-wired caller or a second repeatable source on the same
 * reason code would produce, and `grant.test.ts` proves it fires by over-requesting.
 *
 * `maxMaterial` is at era-one scale and is multiplied by the era's ladder in
 * `capMaxFor`, so the ceiling is the same fraction of an era's wealth throughout.
 */
export const CAP: {
  readonly maxMaterial: number;
} = {
  maxMaterial: EARN.interleaved.material,
};

/**
 * **HOW MANY DRILL SETS AN ERA PAYS MATERIAL FOR. Ten, per era, keyed on effort and
 * never on time.** Past it the drill still runs and still counts the streak; it stops
 * minting the era's material.
 *
 * ## Why this is NEW BEHAVIOUR beside {@link CAP} and not a retune of it
 *
 * `CAP.maxMaterial` is DEFINED as one set's payout, so it clamps a single grant and
 * says nothing whatsoever about how many sets are worked. Total practice income was
 * `payout × sets completed` with no ceiling at all — which `cap.ts` says in as many
 * words. This is the ceiling, and the two answer different questions: "what may one set
 * credit" and "how many sets credit anything".
 *
 * ## What it is FOR: the mastery gate would otherwise push a learner off the hard node
 *
 * With row 1 gated on four of five ({@link LESSON_GRANT_MASTERY_BAR}) and the drill
 * gated on nothing, a learner stuck on one node could earn that node's whole lesson
 * grant in the Town Hall instead and never go back to it — the gate would drive them
 * away from the exact skill it exists to enforce. At 20 a set, one era-one node's 100 is
 * five sets. The bound puts a hard stop two nodes' worth in, so the drill can soften a
 * hard node and cannot replace an era.
 *
 * ## EFFORT-KEYED, NEVER TIME-KEYED, and that is a standing prohibition
 *
 * There is no window here, in any form. The count is a pure derivation over the
 * PERSISTED LEDGER (`countInterleavedGrants`), which reads no `Date.now`, no `nowMs`
 * and no stored `created_at` — `ledger.ts` says why that last one matters. A rolling
 * window costs WAITING rather than effort, so it throttles the patient player and not
 * the grinder, and the lead sunset the last one on 2026-07-29 with the condition clock.
 * Do not reintroduce one. `clockless.test.ts` sweeps for the shape.
 *
 * The bound RESETS BY ERA, which is a learning event and not a clock: it comes back
 * when the learner advances, i.e. by doing the very lessons the gate is protecting. That
 * is the same species of "renewable by progress" the whole economy runs on.
 *
 * ## TEN, and the two measurements that pin it from opposite sides
 *
 * **From above — the ruled share.** `EARN.interleaved.material` is set so that ten sets
 * is 25% of era income (`K·m / (T + K·m)` with `K·m = T/3`). Bounding at ten therefore
 * makes 25% the share practice **tops out at** rather than the share it happens to reach
 * at a hypothetical "realistic" amount of play. Without a bound, `K` is unbounded and
 * the ruled share has no ceiling to be a ceiling of; with the bound anywhere else, the
 * two halves of the same ruling name different numbers.
 *
 * **From below — where the pool runs out.** Each drillable node's item pool supports
 * seven clean five-slot sets (7 L1, 14 L2, 14 L3 against a 1×L1/2×L2/2×L3 mix), measured
 * over every era at `cd13f968` and asserted in `apps/web/src/lessons/drillBound.test.ts`
 * so it fails if content shrinks under the bound. So by the eighth set a learner is
 * necessarily re-treading shapes, and the bound at ten sits comfortably PAST the last
 * fresh problem rather than short of it — the learner is told the set is spent because
 * it is.
 *
 * **That second figure is why the bound is not seven.** Seven was the natural reading of
 * "bound it where the content runs out", and it fails the first measurement: seven sets
 * is 140 against 600, an 18.9% ceiling, so the 25% ruling could never be reached and the
 * record would describe a state no learner can occupy. It is also the wrong KIND of
 * number to pin an economy constant to — it moved from four to seven in `cd13f968`, the
 * commit this work branched from, so keying money to it would owe a retune on every
 * practice-authoring pull request.
 *
 * ## A HARD STOP, not a taper, and it is ANNOUNCED
 *
 * The lead's instinct was a hard cap and his objection to a taper was that it is
 * invisible to the player. Both halves are taken: a decaying payout cannot be explained
 * in a sentence, and a learner who cannot explain why the number shrank concludes the
 * game is broken. The cliff's real cost — that it punishes engagement at the boundary —
 * is paid off in the two places that matter rather than by softening the edge:
 *
 *  - **Every paid set says how many are left** (`useEconomy.reportInterleavedClear`), so
 *    the bound is visible from the FIRST set of the era, not discovered at the last one.
 *  - **Past it the drill is not dead.** The streak still counts and the copy names what
 *    remains rather than telling the learner to stop. It used to be able to say "XP still
 *    pays" as well, and cannot since the sunset — so the announcement above carries more
 *    of the work than it did, which is why it is the half that must not be dropped.
 *
 * ## It cannot strand anybody, and that is arithmetic rather than intent
 *
 * An era's lesson channel alone is `ERA_MATERIAL_TOTAL = 600` against a cheapest solvent
 * city of 480–540, so a learner who has spent the whole drill bound can still finish
 * every era's city on lesson income. Asserted per era in `civicSolvency.test.ts` rather
 * than argued here.
 */
export const DRILL_PAID_SETS_PER_ERA = 10;

/**
 * THE ERA LADDER (era design §7's provisional tuning): "one multiplier drives
 * everything: era N scales by `2^(N-1)`". Era one is therefore `×1` and every
 * authored number in this table is an era-one number.
 *
 * Kept as a named step rather than a literal 2 because the carry-forward rate below
 * divides by it, and "half the purchasing power" has to keep meaning that if the
 * ladder is ever retuned.
 */
export const ERA_COST_MULTIPLIER_STEP = 2;

/**
 * O-6, SECOND HALF — the forward-conversion rate at an era change, as the FRACTION
 * OF PURCHASING POWER that survives (design record §4.3).
 *
 * Not a raw exchange rate, because a raw rate would silently encode the ladder: era
 * N+1 prices are `ERA_COST_MULTIPLIER_STEP` times era N's, so dividing by that step
 * alone is purchasing-power-NEUTRAL. This constant is the haircut ON TOP of it, and
 * the two ends of the range are both wrong:
 *
 * - 1.0 (neutral) kills era-exclusivity's "build it now or not at all" pull — if a
 *   stockpile crosses intact, hoarding through an era is never worse than building
 *   in it.
 * - 0.0 (confiscation) punishes the player who saved, against the visual brief's
 *   non-punishing stance.
 *
 * 0.5 splits it: carrying forward is real but lossy. Net of the ladder that is
 * `floor(amount / 4)`.
 */
export const MATERIAL_CARRY_FORWARD = 0.5;

/*
 * THE XP→LEVEL CURVE AND ITS EIGHT RANK TITLES STOOD HERE (D-R1), with `levels.ts`
 * resolving a total into a level, a title and a progress-to-next for the HUD meter, and
 * `prestigeUnlocks` reading the level to grant the five earned-only cosmetics. All of it
 * is deleted — the table, the tail step, the resolver, its test, and the meter — because
 * XP is sunset and a rank ladder over a resource nothing credits is a curve with no
 * input. The one surviving reading of a player's standing is how much of the era they
 * have completed, which is derived from the era's own node set rather than accumulated.
 */

/**
 * O-4, TEARDOWN PRICING: clearing a civic building costs **25% of the CURRENT
 * era's build cost for that building type**, and refunds nothing.
 *
 * Deliberately not 25% of what the building originally cost. Clearing an era-two
 * Granary in era eight costs a quarter of an ERA-EIGHT build, which is what keeps
 * teardown a real decision late on rather than loose change — the era ladder has
 * moved by ×64 underneath it, so a percentage of the original price would round to
 * nothing.
 */
export const TEARDOWN_COST_FRACTION = 0.25;

/**
 * O-5, THE LEGACY-DECAY CURVE: a frozen civic building's CONTRIBUTION is
 * multiplied by `0.9 ^ (eras behind the current era)`, never falling below
 * {@link LEGACY_DECAY_FLOOR}.
 *
 * NOT THE CONDITION CLOCK, which is sunset. The two are easy to confuse and are
 * opposites in the one way that matters: this decay is keyed on ERAS ADVANCED, a
 * pure function of learning state, while the condition clock was keyed on
 * WALL-CLOCK TIME AWAY. INV-ERA-3 ("happiness responds to how you built, never to
 * how fast you study") is why one survives and the other does not.
 *
 * Gentle on purpose. Costs and contributions already scale by
 * {@link ERA_COST_MULTIPLIER_STEP} per era, so a building three eras back is worth
 * an eighth of a current one BEFORE any decay; a steep curve on top double-counts
 * the ageing.
 */
export const LEGACY_DECAY_PER_ERA = 0.9;

/**
 * The floor under {@link LEGACY_DECAY_PER_ERA}, reached at seven eras behind
 * (`0.9 ** 7 ≈ 0.478`, the first power below it).
 *
 * A curve running to zero eventually turns the player's own earlier building into
 * a net drag on a city they cannot clear for free, which punishes them for having
 * played. At the floor an old quarter is charming and half useful.
 */
export const LEGACY_DECAY_FLOOR = 0.5;
