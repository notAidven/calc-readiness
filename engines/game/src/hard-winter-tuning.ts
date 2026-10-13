/**
 * THE SINGLE TUNING TABLE for the Hard Winter — era one's mid-era crisis encounter.
 * Pure data, framework-free, and the ONLY place the encounter's numbers live.
 *
 * Every magnitude the mechanic reads is here, never as a literal inside a rule, so a
 * retune is one edit to one file. This follows `citizens-tuning.ts` (D-CIT14) for the
 * same reason it does: the encounter is a first-pass design that will be played and
 * then rebalanced, and nothing about it is persisted, so a retune applies
 * retroactively with no migration.
 *
 * `hard-winter.test.ts` pins the RELATIONSHIPS between these numbers rather than the
 * digits — that the tier ladder is strictly ordered, that a `none` tier buys nothing,
 * that doing nothing for a whole winter ruins every building, and that every authored
 * layout is on the island. Change a digit and the suite should stay green; change a
 * relationship and it should not. `hard-winter-layouts.test.ts` is the other half: it
 * measures what each authored layout can reach at each accuracy, because a number tuned
 * against one board is not a tuned number.
 *
 * ALL VALUES ARE FIRST GUESSES. The simulations quoted in the comments were measured
 * against this table at the values written here; if you change one, the quoted numbers
 * are stale and `hard-winter-layouts.test.ts`'s sweep is what to re-read.
 *
 * ## ⚑ RETUNED 2026-08-02 FOR THE LEAD'S QA BUILD: THREE ROUNDS, CONTACT RUINS
 *
 * Four values moved together, on his direct feedback after playing the encounter, and they
 * do not decompose — every figure in this file was re-measured at the set rather than
 * carried over. `rounds` is 3, `damage.ruin_at` is 1, `damage.bite` opens at 1 and
 * accelerates every round, and `spread.accelerate_every` is 1. The give-up-ground action is
 * gone entirely, so the winter offers TWO choices.
 *
 * His words, kept because they are the argument: *"5 rounds is way too much. the storm
 * always gets to the innermost layer but nothing ends up happening even if its hit which is
 * confusing to the user. the give up ground option is incredibly confusing - just discard it
 * completely and keep it to two options. … frost should instantly destroy buildings and
 * round # should be 3 - lets try that as a parameter set and get that onto my qa."*
 *
 * **THE RUN IS NOW SHORT AND HARSH, and the docblocks below say so rather than arguing for
 * the values they replaced.** What each of them keeps is the RECORD: several of these numbers
 * were tried, measured and reversed over 2026-07-30..08-01, and the reversals are the most
 * useful thing anybody has measured about this table. Those paragraphs are marked as history
 * and left standing. What is rewritten is every sentence that described the winter as it
 * ships, because at three rounds none of them was true any more.
 */

/**
 * What an accuracy batch buys, coarsened into four steps.
 *
 * The tier is deliberately NOT the raw ratio. The learner declares before they answer,
 * so the thing they are betting on has to be legible in advance ("three of three lights
 * a real bonfire"), and a continuous magnitude cannot be described in a sentence before
 * the batch starts. Four steps over a batch of three gives exactly one step per possible
 * score, which is the smallest ladder that never wastes a correct answer.
 */
export type WinterActionTier = "none" | "weak" | "steady" | "strong";

/** Every tier, weakest first. The ORDER is load-bearing: it is the magnitude ladder. */
export const WINTER_TIERS: readonly WinterActionTier[] = [
  "none",
  "weak",
  "steady",
  "strong",
];

/** One rung of the accuracy ladder: the tier a batch earns at `min_ratio` or better. */
export interface WinterTierRung {
  readonly tier: WinterActionTier;
  /** Inclusive floor on `correct / asked`. Rungs are read strongest-first. */
  readonly min_ratio: number;
}

/** An authored building's position on the winter grid, by node id. */
export interface WinterBuildingPlacement {
  readonly node_id: string;
  readonly col: number;
  readonly row: number;
}

/**
 * ONE WAY A PLAYER MIGHT HAVE BUILT THEIR CITY, as a whole board.
 *
 * The winter is fought over a layout the PLAYER chose, and real cities vary in how spread
 * out they are. A single authored arrangement would therefore be tuning against a
 * fiction: whatever the numbers measured on it, the first player to build differently
 * would meet a different encounter. So the prototype ships several and varies which one
 * it deals (`winterLayoutFor`), and `hard-winter-layouts.test.ts` measures the outcome
 * spread across all of them rather than one.
 */
export interface WinterLayout {
  readonly id: string;
  /** How it reads on screen. */
  readonly label: string;
  /** What this shape puts under test, in one sentence, for the tuning read-out. */
  readonly blurb: string;
  readonly buildings: readonly WinterBuildingPlacement[];
}

/** What a completed winter pays, per surviving building and as a clean-sweep bonus. */
export interface WinterPayoutBand {
  readonly xp: number;
  readonly gold: number;
  /** In the ERA's material (era one: the material `packages/economy` authors for it). */
  readonly material: number;
}

export const HARD_WINTER = {
  /**
   * How many rounds winter lasts. Fixed, announced up front, and the only clock in
   * the encounter: a round advances when the player acts and never otherwise.
   *
   * ## THREE, RULED BY THE TEAM LEAD ON 2026-08-02 AFTER PLAYING IT
   *
   * His words: *"5 rounds is way too much. … round # should be 3 - lets try that as a
   * parameter set and get that onto my qa."* This is a ruling on the DIGIT and not on a
   * direction, so nothing here was derived: what was derived, against it, is
   * `spread.accelerate_every` and the damage model, because at three rounds neither of the
   * values that shipped with five was doing what its own docblock claimed.
   *
   * **THE SHAPE OF A RUN, at the shipped set.** Seven-building live board (the city the build
   * menu's own defaults produce), greedy one-round-lookahead play, two actions:
   *
   *   | correct | survivors of 7 | ruins | recovery bill | bill at the end of R1 / R2 / R3 |
   *   |---------|----------------|-------|---------------|---------------------------------|
   *   |  0 of 3 |            0   |   7   |      420      |            0 /  60 / 420        |
   *   |  1 of 3 |            2   |   5   |      300      |            0 /   0 / 300        |
   *   |  2 of 3 |            3   |   4   |      240      |            0 /   0 / 240        |
   *   |  3 of 3 |            6   |   1   |       60      |            0 /   0 /  60        |
   *
   * Adjacent gaps 120 / 60 / 180. **The last round decides most of the winter**, and that is
   * the honest reading of three rounds with a frost that crosses the island in three: the
   * shore band goes in round one and holds nothing on this board, the middle two bands go in
   * round two, and the heart and the band around it go as the winter ends. Two of the four
   * bands are indistinguishable until the final beat. See
   * `hard-winter-difficulty.test.ts`'s *"the last round decides most of it"*, which measures
   * exactly that rather than claiming the early rounds still carry the signal they did at
   * five.
   *
   * ## WHAT THREE ROUNDS COST, itemised, because each item was a claim this file used to make
   *
   *  - **the band-separation floor.** The smallest adjacent gap on the live board is 60
   *    against `hard-winter-difficulty.test.ts`'s `BANDS_APART` of 100, so the guard would
   *    have refused this change. The lead ruled the floor off in the same message; that
   *    constant carries the ruling and says precisely what stopped being caught.
   *  - **"the early rounds carry signal".** At five rounds the end of round four separated
   *    all four bands (360 / 240 / 190 / 60) one round before the end. At three there is no
   *    such round: the end of round two reads 60 / 0 / 0 / 0, so only the band that answers
   *    nothing is distinguishable before the last beat.
   *  - **a whole winter thrown away is the whole settlement, and now so is most of one.** At
   *    zero accuracy nothing stands, which was already true at five rounds. What is new is
   *    that two thrown-away rounds out of three leave two ruins rather than one.
   *  - **the near miss is gone outright**, and that is `ruin_at: 1`'s doing rather than the
   *    round count's. See `damage.ruin_at`.
   *
   * ## HISTORY, kept because it is the record of two reversals and both are still relevant
   *
   * It was SIX until 2026-07-30 (D-CRISIS-27 ruled the direction, *"6 rounds is too many
   * anyways"*, and set no number), then FIVE, then FOUR on 2026-08-01, then five again the
   * same day. #362 swept 166,500 configurations and recommended five; the lead took four with
   * the cost itemised; the cost was itemised again per consequence and he reversed it. That
   * round trip established the most useful fact anybody has measured here — **the round count
   * buys the difficulty and the ruin threshold buys the shape** — and it is why the four-item
   * bill above is itemised the same way rather than asserted.
   *
   * The measurement that chose five, kept verbatim because it is the record of what a longer
   * winter reads like. Same board and policy, every row at the `ruin_at` beside it:
   *
   *   | rounds | `ruin_at` | ruins 0/1/2/3 of 3 | recovery bill      | adjacent gaps      |
   *   |--------|-----------|--------------------|--------------------|--------------------|
   *   |   4    |     6     |  0 / 0 / 0 / 0     | 200 / 120 / 100/30 | 80 / **20** / 70   |
   *   |   5    |     6     |  6 / 4 / 1 / 0     | 390 / 270 / 160/30 | 120 / 110 / 130    |
   *   |   5    |     2     |  7 / 5 / 3 / 1     | 420 / 300 / 190/60 | 120 / 110 / 130    |
   *   |   4    |     2     |  6 / 4 / 3 / 1     | 360 / 240 / 190/60 | 120 / **50** / 130 |
   *   |   6    |     6     |  7 / 4 / 2 / 0     | 420 / 290 / 180/30 | 130 / 110 / 150    |
   *
   * Those rows are at a FIVE-BAND frost schedule spread over four to six rounds and at a
   * ruin threshold with room in it. Neither holds now, so read them as history: the row that
   * ships is the four-band table at the top of this docblock.
   */
  rounds: 3,

  /**
   * Questions per round. Three, per the brief, and it is also the batch size the tier
   * ladder is shaped for: four rungs over four possible scores (0, 1, 2, 3 of 3).
   *
   * A SHORT batch is refused rather than served (`composeHardWinterBatch`), because the
   * tier is a ratio of what was asked: two of two would resolve `strong`, so a thin
   * item pool would quietly make the encounter easier instead of shorter.
   */
  batch_size: 3,

  /**
   * **HOW FAR THE FROST CREEPS PER ROUND, AND WHERE ROUND ONE'S FRONT STANDS.**
   *
   * `steps(round) = base + step * floor((round - 1) / accelerate_every)`, so at these values
   * the schedule is **1, 2, 3** and the cumulative reach after each round is **1, 3, 6**.
   * Era one's island is five rim bands deep (0..4, and 28 / 24 / 20 / 12 / 4 cells), so:
   *
   *   | round | steps | cumulative | cells frozen | deepest band under ice |
   *   |-------|-------|------------|--------------|------------------------|
   *   |   1   |   1   |      1     |     28 / 88  |            0 (the rim) |
   *   |   2   |   2   |      3     |     72 / 88  |                      2 |
   *   |   3   |   3   |      6     |     88 / 88  |            4 (the heart)|
   *
   * An untouched island is wholly frozen exactly as the last round closes, which is the
   * property the five-round schedule had and the reason this one is shaped to keep it.
   *
   * ## `base: 1` IS WHAT PUTS ROUND ONE'S FRONT ON THE ISLAND'S RIM
   *
   * The lead, 2026-08-02: *"the frost ring doesnt start on the edge of the island like i
   * instructed - it's literally like 3 rounds away from the innermost building which is so
   * stupid."*
   *
   * **The front already stood on the rim, and the half of that sentence that was measurable
   * is the second half.** `createHardWinter` freezes nothing, the first advance is part of
   * `end_round`, and `WinterCellView.frost_next` projects the coming advance through the
   * reducer's own `winterFrostAfterAdvance` — measured at the tip, round one's front is all
   * **28 depth-0 cells and nothing inside them**, which is the outermost ring of land on the
   * board. `base: 1` is the value that keeps it exactly one band: at `base: 2` the opening
   * front is 52 cells over two bands, so the frost's first beat lands inside the island
   * rather than on its edge, and that is the reason `base` did not move even though it reads
   * a better ladder (see the table below).
   *
   * **WHAT WAS THREE ROUNDS AWAY, and it was this constant.** `accelerate_every` was 4,
   * chosen so that 1, 1, 1, 1, 2 covered five bands in five rounds. At `rounds: 3` that
   * schedule flattens to 1, 1, 1: cumulative reach 3, deepest band 2, 72 of 88 cells. Era
   * one's buildings are placed nearest-the-centre-first by `defaultPlacements`, which puts
   * every one of them in band 2 or deeper — so measured at three rounds and
   * `accelerate_every: 4`, the frost reached ONE building on the live board and **none at all
   * on `packed`**, the board the game deals to a player who never rearranges anything:
   *
   *   | `accelerate_every` | steps | cumulative | frozen      | deepest | live ladder      | `packed` ladder |
   *   |--------------------|-------|------------|-------------|---------|------------------|-----------------|
   *   |    4 (was)         | 1,1,1 |   1,2,3    | 28/52/72    |    2    | **60/0/0/0**     | **0/0/0/0**     |
   *   |    3               | 1,1,1 |   1,2,3    | 28/52/72    |    2    | 60/0/0/0         | 0/0/0/0         |
   *   |    2               | 1,1,2 |   1,2,4    | 28/52/84    |    3    | 360/300/240/120  | 300/240/180/0   |
   *   |  **1 (this)**      | 1,2,3 |   1,3,6    | 28/72/**88**|  **4**  | 420/300/240/60   | 360/240/180/0   |
   *
   * A ladder of zeroes is not a difficulty curve, it is an encounter that never happened, and
   * it is what `rounds: 3` bought at the old advance. `accelerate_every: 2` is the near miss:
   * it reaches band 3 and leaves the heart standing at every accuracy, which is the same
   * defect `rounds: 4` produced at five-round tuning.
   *
   * ## WHAT WAS REJECTED, and each on a property rather than on a preference
   *
   *   | candidate                | steps | cumulative | frozen    | why not                            |
   *   |--------------------------|-------|------------|-----------|------------------------------------|
   *   | `base 2`, `every 1`      | 2,3,4 |   2,5,9    | 52/88/88  | island wholly frozen by ROUND TWO  |
   *   | `base 2`, `every 2`      | 2,2,3 |   2,4,7    | 52/84/88  | 84 of 88 by round two; front opens two bands deep |
   *   | `base 1`, `step 2`       | 1,3,5 |   1,4,9    | 28/84/88  | 84 of 88 by round two              |
   *
   * All three read a smallest adjacent gap of 60 somewhere against this one's 0, so they
   * separate the bands better. They are declined anyway: two of them open the front two bands
   * inside the rim, which is the thing the lead asked to be fixed, and all three finish the
   * board a whole round early so the last round has nothing left at stake. **This is the only
   * candidate that both starts on the rim and finishes on the last beat.**
   *
   * ## AND IT IS NOT `frost_rings_beyond_buildable`, WHICH DOES NOT EXIST HERE
   *
   * Recorded because it is the first place a reader will look. A constant of that name was
   * hand-edited into this table on 2026-07-31 under demo pressure (`93cf65c7`): it widened
   * `hardWinterIsland`'s board one cell ring PAST `eraBuildableRadius`, so the front seeded
   * outside the buildable disc and the frost spent a round crossing land nothing stands on.
   * The lead dropped it after #362 measured it as the most destructive of that day's three
   * values, and it survives only on a parked branch (`0291c549`). It is not in this table, it
   * is not in `hard-winter.ts`, and it is not what made the frost far away.
   *
   * **THE ONE HALF OF HIS COMPLAINT THIS CONSTANT CANNOT REACH is the PICTURE on the in-city
   * mount, and it is a real gap rather than a misreading.** The board is
   * `eraBuildableRadius` (22 world units); the island a player SEES is
   * `ISLAND_GRASS_RADIUS` (30) plus overhang, snow-coursed edge to edge by `buildSnowCourse`,
   * whose own docblock rules that *"the visual extent and the gameplay extent are now
   * deliberately decoupled"*. So about two cells of snowed island lie outside the outermost
   * cell the front can ever stand on, and there the ring genuinely does read as a line in a
   * field rather than as the sea taking the island. Closing it means moving the drawn island
   * or widening the board, and widening the board is the reverted experiment above. Left
   * alone deliberately; it is a rendering decision, not a tuning one.
   */
  spread: {
    base: 1,
    step: 1,
    accelerate_every: 1,
  },

  /**
   * **WHAT THE FROST DOES TO A BUILDING: IT DESTROYS IT.**
   *
   * ## RULED 2026-08-02 — CONTACT RUINS, AND THERE IS NO NEAR MISS LEFT
   *
   * The lead, having played it: *"the storm always gets to the innermost layer but nothing
   * ends up happening even if its hit which is confusing to the user. … frost should
   * instantly destroy buildings."*
   *
   * He is describing the one outcome the graded model could still produce: a building the
   * frost reached, marked, and left standing. At `ruin_at: 2` that took a 2-point shield
   * meeting a 3-point bite, which is rare and unreadable — the board showed a hit and the
   * building was still there. At the shipped `ruin_at: 1` **every unabsorbed point of frost
   * is the whole building**, so a hit is a ruin and nothing else, and a standing damaged
   * building is not merely rare but UNREACHABLE. Measured over all sixteen plays of the
   * uniform ladder across the live board and the three authored layouts: **zero standing
   * damaged buildings**, against 1 at `ruin_at: 2` and 58 at the `ruin_at: 6` this model was
   * introduced for.
   *
   * **SO THE POINTS ARE NOW A SHIELD CURRENCY AND NOTHING ELSE**, and that is the whole of
   * what survives from the paragraphs below. A cold round does `damage.bite` points; a
   * shield absorbs what it can BEFORE the building is touched; whatever is left over ends the
   * building. The bite's magnitude no longer decides how much of a building is left, because
   * the answer is always none of it. It decides how much SHIELD one cold round eats, which is
   * what keeps reinforcing a real decision rather than an immunity.
   *
   * **WHAT THE ENCOUNTER LOST WITH THE NEAR MISS, said plainly rather than left to be
   * discovered.** `damage.stages` has no reachable band, `damage.repair_cost_per_point`
   * prices nothing the winter can produce, `HardWinterOutcome.damaged` and `.repair_cost` are
   * always empty and zero, and the recovery bill is a whole number of rebuilds. Each of those
   * constants keeps its docblock and says so at its own site, and each is pinned as a CENSUS
   * in `hard-winter.test.ts` rather than deleted, so restoring a `ruin_at` with room in it
   * fails there and brings a reader back here.
   *
   * ## HISTORY — the defect the points model replaced, measured rather than argued
   *
   * Kept in full. It is the record of why harm is denominated in points at all, and the next
   * person to want a scar back needs it: the shape below is what a one-bit model of a
   * building's condition does to an accuracy curve, and `ruin_at: 1` is a one-bit model
   * again by ruling rather than by accident.
   *
   * Until 2026-07-30 a building carried `cold_rounds` and became a ruin at two of them.
   * That is a one-bit model of a building's condition, and a one-bit model cannot express
   * a near miss — so the encounter's outcome could not vary with accuracy until the bit
   * flipped. Measured at `e3b715a` on the seven-building live board, ruins standing after
   * each round, four plausible lines at each uniform accuracy:
   *
   *   | line                     | 0 of 3        | 1 of 3        | 2 of 3        | 3 of 3        |
   *   |--------------------------|---------------|---------------|---------------|---------------|
   *   | best-covering fire       | 0,0,0,1,6,7   | 0,0,0,1,6,6   | 0,0,0,1,4,4   | 0,0,0,1,2,2   |
   *   | triage (reinforce worst) | 0,0,0,1,6,7   | 0,0,0,0,3,5   | 0,0,0,0,2,2   | 0,0,0,0,2,2   |
   *   | greedy, no pull-backs    | 0,0,0,1,6,7   | 0,0,0,0,3,4   | 0,0,0,0,3,3   | 0,0,0,0,0,0   |
   *   | random legal (mean/60)   | 0,0,0,1,6,7   | 0,0,0,.9,5,6.7| 0,0,0,.8,3.7,5.8 | 0,0,0,.6,2.2,4.2 |
   *
   * **Every column is identical for the first three rounds and near-identical for the
   * fourth.** Accuracy bought nothing observable until round five, and then bought
   * everything at once. The flat region is not a tuning failure; it is the model having
   * nothing between "fine" and "gone" to report.
   *
   * ## HISTORY — the three things damage points were each doing, and which of them is left
   *
   * A cold round does `damage.bite` POINTS and a building is a ruin at `damage.ruin_at` of
   * them. That is unchanged as MACHINERY; what has gone is two of the three jobs the currency
   * was introduced to do, because at `ruin_at: 1` the currency has two values in it again.
   *
   *  - **"the early rounds carry signal" is spent, and by BOTH values.** A ward that covered
   *    three buildings instead of one was worth four points a round from the moment the frost
   *    landed. At `ruin_at: 1` there is no partial harm for it to reduce, and at `rounds: 3`
   *    there is one round before the last one. Measured, the end of round two reads
   *    60 / 0 / 0 / 0 across the four bands. `rounds` itemises this.
   *  - **"a near miss is not a doom loop" is spent, and the SHIELD is what replaces it.**
   *    This read *"a shield absorbs a whole bite before it is taken, so a round played well
   *    after a round played badly stops the deficit growing"*, and the absorption half is
   *    still exactly true: a shield raised in time leaves the building unmarked and costs
   *    nothing to put right. What is gone is the graded half — there is no deficit to grow,
   *    because a building either takes nothing or is destroyed. `hard-winter-difficulty.test.ts`
   *    asserts what survives instead: a wasted opening costs a building or two and never the
   *    settlement.
   *  - **the price is spent too, and it is unreachable rather than merely bounded.**
   *    `damage.repair_cost_per_point` times `damage.ruin_at` was exactly
   *    `rebuild_cost_per_ruin` while `ruin_at` was 6. At 2 it was 20 against 60. At 1 the
   *    product is 10 against 60 and NOTHING CAN PAY IT, because there is no standing damaged
   *    building for it to price. The bound it existed for still holds and is still swept, over
   *    a ladder with no rungs on it; see that constant.
   *
   * COLD IS CUMULATIVE AND NEVER UNDONE INSIDE THE WINTER. A fire buys TIME and a shield
   * buys ABSORPTION, and neither is an undo; there is no undo, because the `repair` action
   * that was one was ruled out on 2026-07-31. At `ruin_at: 1` "cumulative" is a property with
   * nothing to accumulate over, and it is kept as a rule rather than deleted because it is
   * what stops an undo being reintroduced under a new name if the threshold ever rises again.
   */
  damage: {
    /**
     * Damage points a building absorbs before it is a ruin.
     *
     * ## ONE. CONTACT RUINS, AND THIS IS THE VALUE THAT SAYS SO
     *
     * Ruled by the team lead on 2026-08-02: *"frost should instantly destroy buildings."*
     * One is the smallest value there is, and it is the only one at which the sentence is
     * unconditionally true: **any unabsorbed point of frost is the whole building**, at any
     * round, on any board, whatever the bite happens to be that round.
     *
     * `ruin_at: 1` PLUS the bite below is the pair, and both halves are needed. The bite
     * opens at 1, so round one's frost already reaches the threshold in one; had the bite
     * opened at 0 there would be a cold round that did nothing. Every rung of the bite ladder
     * is at or over this threshold, which is the whole of "contact ruins".
     *
     * ## WHAT ONE MEANS, measured rather than argued
     *
     * **There is no standing damaged building, anywhere, at any accuracy.** Not rare:
     * unreachable. `winterDamageBudget` is `1 - damage + shield`, so a building either absorbs
     * the whole bite into its shield and comes through UNMARKED, or takes a point and is a
     * ruin. Measured over all sixteen plays of the uniform ladder across the live board and
     * the three authored layouts, standing damaged buildings at the end:
     *
     *   | `ruin_at` | bite      | standing damaged over 16 plays | live ladder          |
     *   |-----------|-----------|--------------------------------|----------------------|
     *   | **1**     | **1,2,3** |            **0**               | 420 / 300 / 240 / 60 |
     *   |   1       |  2,3,4    |              0                 | 420 / 300 / 240 /120 |
     *   |   2       |  2,3,4    |              1                 | 420 / 300 / 240 / 70 |
     *   |   2       |  1,2,3    |              2                 | 420 / 250 / 190 / 60 |
     *   |   6       |  2,2,3    |             58                 | 160 /  80 /  60 / 20 |
     *
     * The bottom row is the graded model at three rounds, and it is the measurement that
     * makes this a fix rather than a preference: at `ruin_at: 6` a short winter reads
     * 160 / 80 / 60 / 20 with a smallest gap of 20, which is a settlement that is barely
     * scratched at any accuracy. That is the *"nothing ends up happening even if its hit"*
     * the lead played, in numbers.
     *
     * ## THE FOUR CONSEQUENCES, each stated where it lands
     *
     *  - **no damage value is left at all.** The mend ladder has no rungs. `hard-winter.test.ts`
     *    pins that as a CENSUS, so a `ruin_at` with room in it fails there.
     *  - **the damaged appearances are all unreachable.** See `stages`.
     *  - **the mend price prices nothing.** See `repair_cost_per_point`.
     *  - **"answer nothing and lose everything" is literally true**, and now so is most of
     *    "answer badly": the frost reaches every band by the last round, so a winter at zero
     *    accuracy ends with nothing standing and one at one right answer in three keeps two of
     *    seven.
     *
     * TWO AND FOUR ARE THE NEIGHBOURS, for a future retune. Two is the smallest value that can
     * express a near miss at all (a 2-point shield meeting a 3-point bite), and four is the
     * smallest that gives an unsheltered building two cold rounds. Both restore the graded
     * model this ruling withdrew, and both need the ruling reversed rather than reinterpreted.
     *
     * ## HISTORY
     *
     * Six until 2026-08-01, chosen as the smallest number divisible by both the shallow bite
     * (2) and the deep one (3) with room for `stages` distinct appearances in between; #362
     * swept it and recommended keeping six. The lead ruled TWO on 2026-08-01 with the cost
     * itemised, alongside `rounds: 4` which was reversed the same day. At two, the record read
     * *"the shallow bite is the whole of a building"* and *"a steady two-of-three learner ends
     * with three of seven … the bill is 190"*. At one that learner keeps three of seven on a
     * bill of 240, which is four rebuilds and no scar: the ruin count barely moved and the bill
     * rose, because a scar is cheap and a rebuild is not.
     */
    ruin_at: 1,
    /**
     * Points an unsheltered cold round costs, on the same accelerating shape the frost's
     * own advance uses: `base + step * floor((round - 1) / accelerate_every)`.
     *
     * At these values the schedule is **1, 2, 3** over the winter's three rounds, which is the
     * same shape `spread` takes and deliberately so: the frost takes more GROUND and eats more
     * SHIELD late in the winter, and one formula written twice would be two places for the
     * back half to stop feeling different from the front.
     *
     * ## THE BITE DECIDES HOW MUCH SHIELD IT EATS, AND NOTHING ELSE
     *
     * That was already half true at `ruin_at: 2`, and at `ruin_at: 1` it is the whole truth: a
     * bite no longer decides how much of a building is left, because the answer is none of it.
     * So the only thing this ladder is tuning is how long a shield lasts, and the acceleration
     * is what stops one from lasting the whole winter:
     *
     *   | shield             | 1, 2, 3 (this)              | 1, 1, 1 (flat)              |
     *   |--------------------|-----------------------------|-----------------------------|
     *   | `weak` (2 points)  | covers R1, ruined in R2     | covers R1 and R2, ruined R3 |
     *   | `steady` (4)       | covers R1 and R2, ruined R3 | covers the whole winter     |
     *   | `strong` (6)       | covers the whole winter     | covers the whole winter     |
     *
     * **A flat bite makes `steady` an immunity**, which is what rules it out: two of the four
     * accuracy bands would buy the same permanent answer, and a reinforcement declared in
     * round one would be worth exactly as much as one declared in round three. The
     * accelerating ladder puts a real difference between the three shield rungs over a
     * three-round winter, and it is the only shape that does at these shield values.
     *
     * It reads a WORSE accuracy curve and is taken anyway. Measured, live board: the flat bite
     * reads 420 / 240 / 180 / 60 with a smallest gap anywhere of 60, and this one reads
     * 420 / 300 / 240 / 60 with a smallest gap of 0 on `spread`. So the flat bite separates the
     * bands better and collapses the shield ladder, and the trade is taken in favour of the
     * decision the player actually makes.
     *
     * `base: 1` rather than 2 is forced by `ruin_at: 1` in one direction and by nothing in the
     * other: any base at or above 1 ruins on contact, so the smallest is the one that leaves a
     * `weak` shield a round of cover to buy. At `base: 2` a `weak` shield buys nothing at all
     * and the bottom rung of `reinforce.shield_by_tier` becomes a dead rung; measured, that
     * reads live 420 / 300 / 240 / 120.
     *
     * ## HISTORY
     *
     * It was 2, 2, 2, 3, 3 over five rounds at `accelerate_every: 3`. The sentence this
     * docblock opened with in the graded era is worth keeping because it is the one that
     * stopped being true first: *"an early cold round costs a third of a building and a late
     * one costs a half"*, back when the frost needed three cold rounds to finish something it
     * reached early. `accelerate_every: 2` was the rejected candidate then (2, 2, 3, 3, 4), on
     * the grounds that the baseline layout's last ruin fell in round four and left the final
     * round with only a scar at stake. There are no scars now, so that argument has no subject.
     */
    bite: {
      base: 1,
      step: 1,
      accelerate_every: 1,
    },
    /**
     * How many DAMAGED appearances there are between sound and ruined.
     *
     * Three, so at `ruin_at: 6` the bands were 1-2, 3-4 and 5 points — one per early cold
     * round, which is what made the read-out legible ("it has taken two hits") rather than a
     * percentage. The surface draws them as frost climbing the building; see
     * `apps/web/src/winter/WinterGrid.tsx`.
     *
     * **AT `ruin_at: 1` ALL THREE ARE UNREACHABLE, and this value is deliberately left at 3
     * anyway.** `winterDamageStage` bands equal slices of `ruin_at`, so the whole table is now
     * `0 -> 0` and `1 -> 3 (a ruin)`. There is no middle: a building is sound or it is a ruin,
     * so `hw-cell--hurt`, `hw-cell--hurt-1`, `hw-cell--hurt-2` and `hw-cell--hurt-3` in
     * `hard-winter.css` are all dead rules and the rime overlay never draws.
     *
     * **THE COLLAPSE WENT ONE STEP FURTHER THAN 2026-08-01's, and the record of that step is
     * the reason this is not tidied away.** At `ruin_at: 2` the table was `0 -> 0`, `1 -> 2`,
     * `2 -> 3`: two of three unreachable, one damaged appearance surviving, and
     * `hw-cell--hurt-2` live. At 1 the survivor goes too. This is a fact about `ruin_at` alone
     * and about neither `rounds` nor the bite.
     *
     * Kept at 3 for the same two reasons it was kept then. The number of appearances a renderer
     * offers is a rendering decision, and the lead ruled tuning values here rather than art.
     * And the collapse is pinned as a CENSUS in `hard-winter.test.ts` rather than described, so
     * restoring `ruin_at` to a value with room in it fails there and brings a reader back to
     * this paragraph instead of quietly re-lighting four CSS rules nobody has looked at.
     */
    stages: 3,
    /**
     * **WHAT MENDING ONE DAMAGE POINT COSTS, in the era's material.**
     *
     * ## ⚑ IT PRICES NOTHING THE WINTER CAN PRODUCE, AND THAT IS THE STATE TO KNOW FIRST
     *
     * At `ruin_at: 1` there is no standing damaged building on any board at any accuracy (see
     * that constant, where it is measured over sixteen plays), so no winter can bill a point.
     * `HardWinterOutcome.repair_cost` is 0 in every outcome the reducer can reach, and the
     * recovery bill is a whole number of rebuilds.
     *
     * **KEPT, and for a stronger reason than tidiness.** It is still the answer, kept correct
     * by its pin, to *"what does one point of frost damage cost to put right"*, and that is the
     * question a `ruin_at` above 1 asks again immediately. Its bound is what D-CRISIS-12 needs
     * and `hard-winter.test.ts` still sweeps it — over a ladder with no rungs on it, which is a
     * fact the sweep now asserts as a CENSUS rather than a silence, because a sweep over an
     * empty set holds trivially and would go on passing if the ladder came back wrong.
     *
     * ## HISTORY — the identity, and what breaking it cost at five rounds
     *
     * It read *"DERIVED, NOT CHOSEN: `rebuild_cost_per_ruin / ruin_at` is 60 / 6"* until
     * 2026-08-01, and `hard-winter.test.ts` asserted the division rather than the digit.
     * `ruin_at: 2` falsified it (ten times two is 20 against a rebuild of 60) and it was HELD
     * at 10 rather than restored, on this measurement — five rounds, `ruin_at: 2`, live board,
     * against a `BANDS_APART` floor that was then 100:
     *
     *   | per-point price   | bills                | adjacent gaps      | min | 100 floor |
     *   |-------------------|----------------------|--------------------|-----|-----------|
     *   | **10 (this)**     | 420 / 300 / 190 / 60 | 120 / **110** / 130| 110 | clears    |
     *   | 20                | 420 / 300 / 200 / 60 | 120 / 100 / 140    | 100 | clears, exactly |
     *   | 30 (the identity) | 420 / 300 / 210 / 60 | 120 / **90** / 150 |  90 | **fails** |
     *   | 40                | 420 / 300 / 220 / 60 | 120 / 80 / 160     |  80 | fails     |
     *
     * Every row of that table is now unreachable in both directions: the two-of-three band it
     * measured carried the only scar in the encounter, and there are no scars, and the floor it
     * was measured against is off by the 2026-08-02 ruling. It is kept because it is the record
     * of a derivation that was tried and could not be honoured, and because at `ruin_at: 6` the
     * identity WAS honoured, so a retune upward has to answer it rather than rediscover it.
     *
     * It lives HERE and not in `packages/economy` deliberately. The economy package owns what a
     * lesson pays; it has never owned what a crisis costs, and every one of the winter's prices
     * (`rebuild_cost_per_ruin`, `reclaim_cost_per_cell`) is authored in this file. A price
     * authored anywhere else would be the first one that could drift from the anchor it is
     * derived against.
     */
    repair_cost_per_point: 10,
  },

  /** A fire holds the frost off a patch — the AREA answer. */
  fire: {
    /**
     * **HOW LONG A FIRE BURNS, BY TIER, counting the round it is lit.**
     *
     * A LADDER AS OF 2026-07-31, where it was one number for every tier. Accuracy already
     * decided how WIDE a fire was (`radius_by_tier`, below); it now decides how LONG it
     * lasts as well, and the two tables are deliberately the same shape for the same reason.
     *
     * ## ⚑ RE-MEASURED AT THE 2026-08-02 SET, AND THE LADDER DOES NOT MOVE
     *
     * Three rounds and `ruin_at: 1`. **The whole duration ladder collapses to one question —
     * does a fire outlive the round it was lit in — and every candidate that answers yes is
     * bit-identical.** Live board and all three authored layouts, competent play, two actions,
     * with the smallest adjacent gap anywhere on any board:
     *
     *   | duration by tier     | live bills           | `spread` bills        | smallest gap |
     *   |----------------------|----------------------|-----------------------|--------------|
     *   | 1 / 1 / 1            | 420 / 360 / 240 / 60 | 360 / 300 / 240 / 180 |      60      |
     *   | 2 / 2 / 2            | 420 / 300 / 240 / 60 | 360 / 240 / 240 / 120 |   **0**      |
     *   | **2 / 2 / 3 (this)** | 420 / 300 / 240 / 60 | 360 / 240 / 240 / 120 |   **0**      |
     *   | 2 / 3 / 3            | 420 / 300 / 240 / 60 | 360 / 240 / 240 / 120 |   **0**      |
     *   | 3 / 3 / 3 (flat)     | 420 / 300 / 240 / 60 | 360 / 240 / 240 / 120 |   **0**      |
     *   | 1 / 2 / 3            | 420 / 360 / 240 / 60 | 360 / 300 / 240 / 120 |      60      |
     *
     * Four of the six rows are identical to the digit on every board. A three-round winter has
     * two later rounds for a fire to reach into, so `strong: 3` and `steady: 3` and a flat three
     * all buy ground the frost was going to take in the same rounds either way; the only value
     * on this table that changes an outcome is **`weak`**, and only because a one-round fire is
     * one that never outlives its own declaration.
     *
     * **SO THE FIVE-ROUND FINDING BELOW HAS INVERTED, AND IT IS RECORDED RATHER THAN ACTED ON.**
     * At five rounds `weak: 1` was *"FORCED"* at 2 because dropping it closed the bottom two
     * bands to 90 and broke a floor of 100. At three rounds `weak: 1` OPENS the bottom two bands
     * (300 to 360 on the live board), removes `spread`'s tie, and takes the smallest gap anywhere
     * from 0 to 60. It is the one available one-value fix for the tie again, and it is declined
     * for the same reason `steady: 3` was declined on 2026-08-01: the lead ruled four values on
     * 2026-08-02 and a fifth would ride along unruled, and he asked in the same message to be
     * left free to tune this himself. **The price is written down here so he can take it in one
     * edit.**
     *
     * The tie is still named and asserted in BOTH directions in `hard-winter-difficulty.test.ts`,
     * and that was measured rather than trusted at this set: drop `spread` from the exception
     * list and the sweep fails at *"spread: [360,240,240,120]"*, set `weak: 1` and it fails at
     * *"a declared exception that now slopes strictly at every step"*.
     *
     * ## HISTORY BELOW THIS LINE. Everything from here down was measured at five or six rounds
     * and at `ruin_at: 6` or `2`, and is kept because it is the record of two rulings and of
     * three candidates that were priced and declined. None of it describes the winter that
     * ships; the table above does.
     *
     * ## RULED 2026-08-01: THE TIE STAYS, AND `steady` DOES NOT MOVE
     *
     * **The lead's ruling, taken on the price list above rather than instead of it.** `steady`
     * stays at 2, the `spread` board goes on reading 360 / 240 / **240** / 70, and one right
     * answer in three and two of three go on finishing that board on the same bill.
     *
     * **The price, re-measured at the ruling rather than quoted, so nobody has to derive it
     * again to know what was accepted.** Uniform ladder, competent play, no pull-backs, every
     * board the prototype deals, at the shipped `steady: 2` and at the candidate `steady: 3`:
     *
     *   | board      | `steady: 2` (ships)      | `steady: 3` (declined)   |
     *   |------------|--------------------------|--------------------------|
     *   | live       | 420 / 300 / 190 / 60     | 420 / 300 / 190 / 60     |
     *   | `spread`   | 360 / 240 / **240** / 70 | 360 / 240 / **180** / 70 |
     *   | `packed`   | 360 / 240 / 180 / 0      | 360 / 240 / 180 / 0      |
     *   | `rimward`  | 360 / 300 / **240** / 0  | 360 / 300 / **180** / 0  |
     *
     *  - **what the tie costs:** on `spread`, one right answer and two finish on the same 240,
     *    so the smallest adjacent gap anywhere on any board is **0** rather than **60**.
     *    Nothing is inverted: more accuracy is never worse, and the end-to-end drop on that
     *    board is still 290 material;
     *  - **what removing it would have cost, corrected.** #374 recorded *"at no measured cost
     *    to any other band on any board"*, and re-measuring narrows that: the live board and
     *    `packed` are identical to the digit, and **`rimward`'s two-right-answer band does
     *    move**, 240 to 180. That is a cheaper bill rather than a cost, and `rimward`'s own
     *    smallest gap is 60 either way, so no board separates worse at `steady: 3`. The honest
     *    statement of the price is therefore that **the fix is free and was declined anyway**,
     *    on the argument below, which is a stronger thing to have ruled than a trade;
     *  - **what it buys instead:** the `steady: 2` argument stands as it was made. A third
     *    round on a five-cell fire improves the two-right-answer player as much as the
     *    three-right-answer one, so at `ruin_at: 6` it held the TOP gap at 30 where
     *    `steady: 2` doubled it. The ruling declines to reopen an argument about the reward
     *    for a perfect answer in order to close a tie one rung down.
     *
     * **So a later reader who finds this tie is looking at something priced and accepted, not
     * missed.** Reopening it is a new ruling and needs the argument above answered, not just
     * the tie pointed at. The exception in `hard-winter-difficulty.test.ts` stays asserted in
     * both directions, so if a future retune removes the tie for some other reason that file
     * fails and the entry is deleted rather than left excusing a board that has started
     * behaving.
     *
     * ## Why a ladder rather than a bigger scalar, measured rather than argued
     *
     * The lead asked for a fire that is visible for two rounds AFTER the round it was
     * declared in, which is `strong: 3` — the count includes the round the batch resolved
     * in, so at two a fire outlived its own declaration by a single round and read as no
     * persistence at all. Handing that three to EVERY tier was tried first and it broke the
     * difficulty model. Measured on the seven-building live board at `ruin_at: 6`, recovery
     * bill at 0, 1, 2 and 3 right answers:
     *
     *   | duration by tier      | bill                  | adjacent gaps      |
     *   |-----------------------|-----------------------|--------------------|
     *   | 2 / 2 / 2 (was)       | 390 / 270 / 160 / 30  | 120 / 110 / 130    |
     *   | 3 / 3 / 3 (flat)      | 390 / 240 / 160 / 30  | 150 /  **80** / 130 |
     *   | **2 / 2 / 3 (this)**  | 390 / 270 / 160 / 30  | 120 / 110 / 130    |
     *
     * A flat three is a CONSOLATION PRIZE FOR THE WORST PLAYER, which is backwards for a
     * mechanic whose whole job is to make accuracy legible. A `weak` fire is one cell, so a
     * third round on it is worth exactly one late bite to somebody who had nothing better to
     * do with the round: the one-right-answer band gained 30 and the two-right-answer band
     * gained nothing, closing them to 80 and crossing `hard-winter-difficulty.test.ts`'s
     * 100-material floor (`BANDS_APART`). Spending the extra round only at the top leaves
     * every band where it was and puts the duration where it is earned.
     *
     * ## The two rungs that are not the lead's requirement, and why each is what it is
     *
     * **`weak: 2` IS FORCED, and this is the finding worth keeping.** Paying for the strong
     * fire's third round by shortening the weak one is the obvious move and it fails at the
     * other end of the ladder: at `weak: 1` the live board reads 390 / 300 / 160 / 30, so
     * the bottom two bands close to 90 and break the same floor the flat three broke. The
     * weak fire is doing more work than its one cell suggests — it is most of what separates
     * answering nothing from answering something.
     *
     * **`steady: 2` RATHER THAN 3 IS THE ONE REAL CHOICE HERE**, and the live board does not
     * decide it: 2/2/3 and 2/3/3 both read 390 / 270 / 160 / 30 there, to the digit. What
     * decides it is `spread`, the widest board the prototype deals, where the two come apart:
     *
     *   | duration by tier | `spread` bill         | adjacent gaps       |
     *   |------------------|-----------------------|---------------------|
     *   | 2 / 2 / 2 (was)  | 330 / 240 / 110 / 80  | 90 / 130 / **30**   |
     *   | 2 / 2 / 3 (this) | 330 / 240 / 110 / 50  | 90 / 130 / **60**   |
     *   | 2 / 3 / 3        | 330 / 240 /  80 / 50  | 90 / 160 / **30**   |
     *
     * At `steady: 3` the two-right-answer player improves as much as the three-right-answer
     * player does, so the top gap stays at 30 and the third round buys nothing legible; at
     * `steady: 2` that gap doubles. Read across all four boards, **the smallest gap anywhere
     * goes from 30 to 60** under this ladder and stays at 30 under either alternative — so
     * this is the only candidate that improves the weakest link, and the link it improves is
     * the reward for a perfect answer. That is the exact inverse of the flat three's defect.
     *
     * **`none: 1` is a coherence choice and provably nothing else.** `radius_by_tier.none` is
     * `null` and `fireWard` returns nothing for a null radius whatever `rounds_left` says, so
     * this rung cannot reach any outcome: measured, every figure in this docblock is
     * bit-identical at `none: 1` and `none: 3`. What it does reach is the BOARD, which draws
     * a lit fire for as long as it is in `state.fires`. One round is the shortest value that
     * is still a fire — it burns for the round it was lit in and no other — which keeps the
     * bottom rung what `radius_by_tier` says it is, a real lit fire that warded nothing,
     * rather than a fire drawn for three rounds doing nothing at all.
     *
     * **THE BOARD HALF OF THAT PARAGRAPH IS NO LONGER TRUE, and this rung now reaches nothing
     * at all.** The 2026-08-02 ruling keeps a fire on the board after its fuel runs out (see
     * `WinterFire`), so *"drawn for as long as it is in `state.fires`"* is the whole winter for
     * every rung — and the state a hearth is drawn in is read off the RADIUS first
     * (`winterFireState`), because a hearth that never caught has burnt nothing and must not be
     * drawn as one that burnt out. So `none`'s value is unobservable in the picture as well as
     * in the outcome: 1 and 3 draw the same laid, unlit hearth for the whole winter. It is
     * kept at 1 rather than deleted because the table is keyed by every tier, and 1 is still
     * the honest reading of a fire that never lit.
     */
    burn_rounds_by_tier: {
      none: 1,
      weak: 2,
      steady: 2,
      strong: 3,
    } as Readonly<Record<WinterActionTier, number>>,
    /**
     * **THE ONE DURATION A SENTENCE READ BEFORE THE BATCH IS ALLOWED TO QUOTE. NOTHING
     * QUOTES IT TODAY, and that is the state to know about before touching it.**
     *
     * `apps/web/src/winter/HardWinterSurface.tsx`'s declare card used to render *"Holds the
     * frost off a patch of ground for {HARD_WINTER.fire.burn_rounds} rounds."*, which is read
     * BEFORE the batch and so could not name a rung — the player has not earned one yet. A
     * table cannot be interpolated into a sentence, so that sentence needed a number, and the
     * question was which number a promise made in advance is allowed to be.
     *
     * IT IS THE FLOOR AMONG FIRES THAT CATCH, not the top, and that is the whole of the
     * choice. Quoting `strong`'s three would advertise to every player a duration two thirds
     * of them will not get, which is an overpromise the board then visibly breaks; quoting
     * the floor is a promise every fire that catches keeps. `none` is excluded from the
     * floor because such a sentence does not describe it either way — a fire that never
     * caught holds the frost off nothing for any number of rounds. `hard-winter.test.ts`
     * asserts this IS that floor rather than a digit, so the two cannot drift.
     *
     * **THE COPY UPGRADE THIS DOCBLOCK ASKED FOR HAS LANDED, so the last reader is gone.**
     * The card now reads *"Holds the frost off a patch of ground, and answering well makes it
     * burn longer and reach further."* — no number, both magnitudes named, and the same
     * "X, and Y" shape as the Reinforce card beside it. The advisor's briefing line
     * (`apps/web/src/city/crisisCall.ts`) was widened to match in the same change. A ladder
     * described qualitatively cannot understate its own top rung, which is what quoting any
     * single number in advance did.
     *
     * **THE CONSTANT AND ITS ASSERTION STAY ANYWAY, deliberately, and the lead reserved that
     * call.** So this is a number with no reader rather than an oversight: it is the answer,
     * kept correct by the pin, to *"what is the one duration a surface may promise before it
     * knows the player's accuracy"*, and the next surface that has to promise one in a space
     * too small for a clause has it to hand. Retiring it is a decision on its own and takes
     * the assertion in `hard-winter.test.ts` with it.
     */
    burn_rounds: 2,
    /**
     * Ward radius by tier, measured as a EUCLIDEAN DISC over cell centres
     * (`winterWardOffsets`). `null` is a fire that never caught: it is a real lit fire in
     * the state and the log, warding nothing, which is what "accuracy decides the
     * magnitude, not whether it happens" looks like at the bottom of the ladder.
     *
     * ## THE RETUNE, and the arithmetic behind it
     *
     * The first pass warded a CHEBYSHEV square, and the top tier's 5x5 was reported as
     * covering too much: 25 cells of an 88-cell island is **28% of the whole board in one
     * action**, held for the two rounds a fire then burned, out of a winter of six rounds.
     * (That clause has now read "out of six", "out of five", "out of four" for part of
     * 2026-08-01 while a four-round count was ruled and reversed, and since 2026-08-02 "out of
     * three". The cell-rounds table further down is recomputed against the shipped count every
     * time, and `hard-winter-layouts.test.ts` pins it, which is what has stopped the two halves
     * of this docblock quoting different winters on each occasion.)
     * The square is also why there was nothing to do about it — its rungs are 1, 9 and 25
     * cells, so the only setting below 25 is 9, which is the middle tier, and "shrink the top
     * tier" would have meant deleting it.
     *
     * A disc has rungs in between, and these three are the shipped ladder:
     *
     *   | tier      | radius | cells | share of the 88 | shape           |
     *   |-----------|--------|-------|-----------------|-----------------|
     *   | `none`    | —      |     0 |             0%  | never catches   |
     *   | `weak`    |    0   |     1 |           1.1%  | one cell        |
     *   | `steady`  |    1   |     5 |           5.7%  | a cross         |
     *   | `strong`  |    2   |    13 |          14.8%  | a diamond       |
     *
     * So the top tier is **13 cells, 14.8% of the island** — a shade under half of the
     * 28% it was, and the ladder still steps 1 -> 5 -> 13, which is 5x and then 2.6x.
     * Accuracy still visibly buys ground, and each rung is a different SHAPE rather than
     * a bigger square, so the three read apart at a glance on the board.
     *
     * **THE SHARE ARGUMENT ABOVE IS ABOUT FOOTPRINT, AND THE COMPLAINT WAS ABOUT FOOTPRINT
     * HELD FOR A WHILE.** Since 2026-07-31 the duration is a ladder too
     * (`burn_rounds_by_tier`), so there is no longer one number to multiply the table by and
     * the share is per rung. In cell-rounds out of the encounter's 88 x 3 = **264**, which is
     * the unit the original 28% complaint was really made in:
     *
     *   | tier      | cells | rounds | cell-rounds | share of the encounter |
     *   |-----------|-------|--------|-------------|------------------------|
     *   | `weak`    |     1 |    2   |           2 |                  0.8%  |
     *   | `steady`  |     5 |    2   |          10 |                  3.8%  |
     *   | `strong`  |    13 |    3   |          39 |                 14.8%  |
     *
     * **A SHORTER WINTER MAKES EVERY FIRE A BIGGER SHARE OF IT, and `strong` is now the one
     * rung worth watching.** At five rounds it was 39 cell-rounds of 440, 8.9%; at three it is
     * the same 39 of 264, **14.8%**, because a three-round fire declared in round one holds its
     * ground for the entire encounter. Against the 5x5 square that started the complaint — 25
     * cells for two rounds, 50 cell-rounds, 18.9% of this encounter — it is still comfortably
     * under, and the ladder steps 0.8% -> 3.8% -> 14.8%. But the headroom is a third of what it
     * was, so if the top tier is reported as too generous again, the two dials are `radius 1.5`
     * (9 cells, 27 cell-rounds, 10.2%) and `strong: 2` (26 cell-rounds, 9.8%), and neither
     * needs a code change.
     *
     * **Every share here is a function of the round count and nothing else**, which is why they
     * all moved when `rounds` briefly read 4 on 2026-08-01 (the top tier read 11.1% of 352),
     * moved back when it was reversed, and moved again on 2026-08-02.
     * `hard-winter-layouts.test.ts` pins the whole table for that reason.
     *
     * The rungs either side, for the next retune, all measured against the same 88:
     * radius 1.5 is 9 cells (10.2%), radius 2.5 is 21 (23.9%), radius 3 is 29 (33.0%).
     * If 13 is still too generous, 1.5 is the next step down and needs no code change.
     *
     * WHAT THIS IS WORTH ON THE BOARD, rather than in the abstract: a 13-cell diamond
     * reaches two cells in each cardinal direction and one on each diagonal, so it holds
     * a building and its near neighbour and no more — unless the player packed them, in
     * which case it holds what they packed. See `hard-winter-layouts.test.ts` for the
     * measured spread across three ways of building, and note that a fire lit near the
     * shore covers FEWER than the table says, because the island clips the disc: the
     * mean over every cell of era one's island is 11.0 for radius 2 and the minimum is 7.
     */
    radius_by_tier: {
      none: null,
      weak: 0,
      steady: 1,
      strong: 2,
    } as Readonly<Record<WinterActionTier, number | null>>,
  },

  /**
   * Reinforcing gives ONE building a SHIELD — damage points the frost spends before it
   * marks the building at all. **One of the winter's TWO actions** (see `WinterAction` in
   * `hard-winter.ts` for why there are two), the single-target answer, and the only one
   * whose effect cannot expire. Cumulative if the same building is reinforced twice.
   *
   * ## AT `ruin_at: 1` THE SHIELD IS THE ONLY THING BETWEEN A BUILDING AND A RUIN
   *
   * A shield is spent by the frost and is bought BEFORE the harm, so it does not raise a
   * ceiling: it eats the bite. That was a distinction worth drawing while a building could
   * survive scarred; now it is the whole mechanic, because there is no scarred survival to
   * distinguish it from. A building either absorbs the round's whole bite into its shield and
   * comes through unmarked, or it is gone.
   *
   * **SO THE LADDER IS A NUMBER OF COLD ROUNDS SURVIVED, and `damage.bite` is what converts
   * it.** Against the shipped bite of 1, 2, 3: `weak` (2) covers round one; `steady` (4)
   * covers rounds one and two; `strong` (6) covers the whole winter. Three distinct answers
   * over three rounds, which is the reason neither this table nor the bite's `step` moved —
   * see `damage.bite`, where a flat bite is measured making `steady` an immunity.
   *
   * The rungs stay 0 / 2 / 4 / 6 rather than being re-scaled to 0 / 1 / 2 / 3. Halving them
   * would read the same against a halved bite and buy nothing, and it would lose the one
   * property this ladder has that the bite's does not: a shield is CUMULATIVE, so two `weak`
   * declarations equal one `steady`, and that arithmetic is legible at these values.
   *
   * ## HISTORY
   *
   * There used to be a `repair` action that took damage back off a building already marked; it
   * was ruled out on 2026-07-31 as a dominated choice, and the measurement behind the ruling is
   * that a shield is at least as good while the frost still has something to give. At
   * `ruin_at: 1` it is not merely dominated but meaningless — there is no marked building to
   * repair. The docblock here used to end *"the top rung is a whole early cold round more than
   * the bottom one"*, which was true against a bite of 2, 2, 2, 3, 3; against 1, 2, 3 the top
   * rung is two cold rounds more than the bottom one.
   */
  reinforce: {
    shield_by_tier: {
      none: 0,
      weak: 2,
      steady: 4,
      strong: 6,
    } as Readonly<Record<WinterActionTier, number>>,
  },

  /**
   * The accuracy ladder, read STRONGEST FIRST: a batch earns the first tier whose
   * `min_ratio` it meets. `none` is the floor at ratio 0 and is what makes the table
   * total — every ratio in [0, 1] lands on exactly one rung.
   *
   * At `batch_size` 3 this is 3/3 strong, 2/3 steady, 1/3 weak, 0/3 none.
   */
  tiers: [
    { tier: "strong", min_ratio: 1 },
    { tier: "steady", min_ratio: 2 / 3 },
    { tier: "weak", min_ratio: Number.MIN_VALUE },
    { tier: "none", min_ratio: 0 },
  ] as readonly WinterTierRung[],

  /**
   * What surviving the winter pays. Scaled by what SURVIVED, which is the brief's
   * ruling, and shaped per-survivor rather than as a fraction of a lump so the player
   * can read the reward off the board ("each building that made it is worth this").
   *
   * Sized against the economy's own table (`EARN.lessonComplete` is 20 XP / 15 gold
   * / 100 material, `EARN.interleaved` 12 XP / 10-40 gold): a whole winter with all six
   * buildings saved pays 32 XP / 24 gold / 96 material, so a flawless
   * crisis is worth about one lesson and a badly handled one is worth a fraction of
   * it. NOTHING here is a passive source — the payout exists only because an encounter
   * was completed, which is exactly the distinction the resource design draws.
   *
   * The sizing is per SURVIVOR and so does not follow the round count: a three-round winter
   * pays the same as a five-round one for the same board saved, which is right, because what it
   * rewards is the settlement and not the sitting.
   */
  payout: {
    per_survivor: { xp: 4, gold: 3, material: 12 } as WinterPayoutBand,
    /**
     * Paid once, only if NOTHING was ruined — no building, and no ground.
     *
     * **AT THE 2026-08-02 SET THIS IS "EVERY BUILDING STANDING", and the two other clauses are
     * unreachable rather than removed.** There is no scarred ground since the give-up-ground
     * action went, and no scarred BUILDING since `damage.ruin_at: 1`, so every survivor is
     * unmarked by construction and the ground count is always zero.
     *
     * `hardWinterPayoutFor` still REQUIRES both counts rather than defaulting them, and that is
     * deliberate: they are the ruling, not the arithmetic. A settlement that came through with
     * all six buildings by giving up most of its island did not have a clean winter, and a bonus
     * that said otherwise would be a scoreboard endorsing an exploit. A caller who could omit
     * the counts would reintroduce exactly that the moment a crisis scarred ground again.
     */
    flawless_bonus: { xp: 8, gold: 6, material: 24 } as WinterPayoutBand,
  },

  /**
   * **WHAT RECLAIMING ONE SCARRED GROUND CELL COSTS, in the era's material.**
   *
   * ## ⚑ THE WINTER CANNOT SCAR GROUND ANY MORE. THIS IS KEPT BECAUSE THE CITY CAN
   *
   * This was `abandon.reclaim_cost_per_cell` until 2026-08-02, and the action it priced is
   * gone: the lead ruled the give-up-ground choice out entirely (*"the give up ground option is
   * incredibly confusing - just discard it completely and keep it to two options"*), so no
   * winter can produce a scarred cell and `hardWinterDamage` reports none.
   *
   * **It is NOT deleted with the action, because it is load-bearing for something else.** It is
   * the only per-cell price in the tree, and two things read it:
   *
   *  - `hardWinterRepairPrices().per_cell`, which is what `apps/web/src/city/crisisRepair.ts`
   *    charges for a ground repair. That path is CRISIS-GENERIC: scarred cells live in
   *    `CrisisDamage.ruined_cells`, which is persisted (`db/migrations/0004_civilization_state.sql`),
   *    rendered by `ScarredGround.tsx` and cleared by `reclaimRuinedCell`. Deleting the price
   *    would leave that path with nothing to charge;
   *  - **saved cities that already carry scars.** A player who played a winter before this
   *    change has scarred cells in their saved blob, and they can still be reclaimed. Removing
   *    the price would either strand them or make them free.
   *
   * So this is a price with no producer rather than a price with no reader. Whether the next
   * crisis to scar ground authors its own is that crisis's decision; era one's is here.
   *
   * ## The number, and the derivation that survives the action
   *
   * Three, derived AGAINST `rebuild_cost_per_ruin` so that twenty scarred cells cost what one
   * ruined building costs — and era one's rim bands are 28, 24, 20, 12 and 4 cells deep, so
   * giving up a rim band cost about what losing a building cost. That exchange rate is what the
   * name means and it is still the right rate for a scar the city has to buy back.
   * `hard-winter.test.ts` asserts the derivation rather than the digit.
   *
   * ## HISTORY, and it is worth keeping because it is a measured exploit and a withdrawn clause
   *
   * The action was priced in BUILDINGS first: you lost whatever stood on the abandoned ring. On
   * `packed` — the board `defaultPlacements` produces — the outer rings are empty, so the price
   * was **zero**, and a measured greedy player opened `abandon, abandon, abandon` at every
   * accuracy from one right answer upward, saved all six buildings, and gave up 72 of the
   * island's 88 cells for nothing. Repricing in ground is what gave it teeth: at 3 a cell, that
   * exploit earned 72 material and owed 216, a net loss of 144.
   *
   * And this constant is where a contradiction with the failure floor was resolved. This file
   * used to say *"the ground is ruined, **it does not come back**"*; the floor (team lead,
   * 2026-07-30) says *"Crises can damage, disable, scar, or reduce capacity, but they cannot
   * undo mastery or permanently remove an earned building"*, with damage REPAIRABLE. The ruling
   * won, and this constant's own name was always on its side: a price on ground that never comes
   * back is not a price, it is a score. [DEFAULT TAKEN 2026-07-30, not a ruling: that ground is
   * reclaimable at all.]
   */
  reclaim_cost_per_cell: 3,

  /**
   * What rebuilding one ruin would cost, in the era's material. Just over half a lesson's
   * material lump, so a ruin is a real setback and never an unrecoverable one.
   *
   * This is also the anchor `reclaim_cost_per_cell` is derived against: twenty scarred cells
   * cost what one ruined building costs.
   *
   * **IT IS THE WHOLE RECOVERY BILL NOW.** At `damage.ruin_at: 1` there are no scars to mend
   * and no ground to reclaim, so `HardWinterOutcome.recovery_cost` is this number times the
   * ruin count and nothing else. That is why every bill quoted in this file is a multiple of
   * 60, and it is worth knowing before reading a gap: the smallest difference two accuracy
   * bands can have is one rebuild.
   *
   * **IT IS NOW SPENT.** This said *"REPORTED on the outcome and never spent here: the
   * winter has no economy write, and rebuilding is a city-surface action that does not
   * exist yet"* — an accurate description of an accounting error, since the whole point of
   * a price is that something charges it. That action exists as of 2026-07-30
   * (`apps/web/src/city/crisisRepair.ts`), and the clause that survives is *"never spent
   * HERE"*: the winter engine is still a pure reducer with no economy write, and this
   * number is still only REPORTED by `hardWinterOutcome`. The city charges it.
   *
   * [DEFAULT TAKEN 2026-07-30, not a ruling: repair is charged PER RUIN rather than as one
   * bulk bill, because these prices are authored per ruin and per cell and a per-item
   * action is what they describe — it also leaves the choice with a player who cannot
   * afford everything. Reversing it means one bulk transaction in `crisisRepair.ts`
   * priced by `crisisRepairCost`, which already computes the whole bill.]
   */
  rebuild_cost_per_ruin: 60,

  /**
   * WHERE ERA ONE'S SIX BUILDINGS STAND — three whole boards, not one.
   *
   * ## Why three
   *
   * In the finished game the player chooses where every building goes, and real cities
   * will vary in how spread out they are. So one authored arrangement is not a
   * simplification of the real thing, it is a DIFFERENT thing: a number tuned against it
   * would be a number tuned against a fiction, and the first player who built differently
   * would meet an encounter nobody had measured. The prototype therefore deals a
   * different one of these per encounter (`winterLayoutFor`), so a compact city and a
   * spread one both get played and the difference can be FELT rather than argued;
   * `hard-winter-layouts.test.ts` measures the outcome spread across all three and
   * asserts the two bounds that make the fire tunable at all — that no layout can be won
   * at zero accuracy, and that every layout can be won at full accuracy, so the encounter
   * is neither free nor a dead end on any board the prototype deals.
   *
   * Every placement below is on era one's real island and its rim depth is quoted from
   * the island `hardWinterIsland` derives, five bands deep (0 is the shoreline, 4 the
   * heart). Registry order throughout is NUM.S, NUM.F, NUM.2, NUM.3, NUM.4, NUM.5.
   *
   * ## The first is the baseline, and the shape of the encounter is authored into it
   *
   * `spread` stands the six across four rim bands, which staggers the freeze timetable so
   * that something is in danger in every round rather than all six at once. Two details
   * in it are load-bearing and were measured, not guessed:
   *
   *  - **the Lookout is on the shoreline on purpose, and the reason has changed rather than
   *    gone.** It was put there because abandoning was only a sacrifice if the outermost ring
   *    had something on it: with the shore empty, giving up ring zero on round one was a free
   *    +3 to every building for the price of land nobody was using, which measured as an
   *    all-six survival and made the first decision a formality. That action was removed on
   *    2026-08-02, so the exploit has no route left. The placement STAYS because it is now
   *    doing a different and better job: at `spread.base: 1` round one's frost is exactly the
   *    shore band, so a building on band 0 is the only way a board has anything at stake in
   *    round one at all. Every other layout's round one is a free move.
   *  - **the buildings sit in overlapping pairs, and the pairs are what the ladder is read
   *    off.** Measured over all 88 cells: the `weak` dot never holds two, the `steady`
   *    cross holds two from four cells (the Commons/Dwellings pair from (-4, -2) or
   *    (-3, -3), the Workshop/Store pair from (0, 1) or (1, 2)), and the `strong` diamond
   *    holds two from nineteen and three from three — its best is three, at (2, 0),
   *    (1, 1) or (0, 2). So a fire reaches a building or two and never a region, which is
   *    the property the retuned radius is for, and it is only visible on a layout with
   *    pairs in it.
   */
  layouts: [
    {
      id: "spread",
      label: "Spread out",
      blurb:
        "Four rim bands, in overlapping pairs. Something is in danger every round, and a " +
        "good fire holds two buildings.",
      buildings: [
        { node_id: "NUM.S", col: 0, row: 0 }, // depth 4 — the heart, reached last
        { node_id: "NUM.F", col: 2, row: 2 }, // depth 2 — pairs with the Workshop
        { node_id: "NUM.2", col: -3, row: -2 }, // depth 2 — pairs with the Commons
        { node_id: "NUM.3", col: 0, row: 2 }, // depth 2
        { node_id: "NUM.4", col: -4, row: -3 }, // depth 1
        { node_id: "NUM.5", col: 4, row: 0 }, // depth 0 — the frost takes it first
      ],
    },
    /**
     * `packed` is the CITY SURFACE'S OWN DEFAULT, and the placements are not invented
     * here — they are what `defaultPlacements` (`apps/web/src/city/worldLayout.ts`)
     * actually produces for era one's six nodes. That function sorts every cell by
     * distance from the centre and gives each building the nearest free spot its
     * `NODE_FOOTPRINTS` entry fits in, so the six anchors land in a four-by-four box
     * spanning columns -2..1 and rows -2..1, across only two rim bands. Both plausible
     * node orders produce the same six anchors, which is why they can be written down.
     *
     * It is here because it is the board a player who never rearranges anything will
     * meet, and because it is the WORST case for this mechanic: five of its six sit in band
     * 3 and the sixth is the heart in band 4, so the frost reaches them within two rounds of
     * each other, the staggered timetable disappears, and a cluster four cells across is
     * smaller than any ward worth having. Measured: the
     * top-tier disc covers all six of these from **exactly one cell**, (-1, -1), where the
     * 25-cell square managed it from four — a knife edge instead of a region, which is as
     * far as shrinking a footprint can get you against a city this compact. See
     * `hard-winter-layouts.test.ts`, where this layout is a named exception for exactly
     * that reason.
     *
     * **AT THE 2026-08-02 SET ITS WHOLE WINTER IS ONE ROUND.** Bands 3 and 4 both go as round
     * three closes, so nothing on this board is threatened until the final beat and then all
     * six are at once. It is also the board that measured `spread.accelerate_every: 4` as
     * unshippable at three rounds: the frost reached band 2 and no further, so `packed` read
     * **0 / 0 / 0 / 0** at every accuracy — an encounter that never happened on the board the
     * game deals by default. See `spread`.
     */
    {
      id: "packed",
      label: "Packed in",
      blurb:
        "Nearest-the-centre-first, exactly the way the city surface places buildings by " +
        "default. Nothing is threatened until the last round, and then everything is at once.",
      buildings: [
        { node_id: "NUM.S", col: -1, row: -1 }, // depth 4
        { node_id: "NUM.F", col: -1, row: -2 }, // depth 3
        { node_id: "NUM.2", col: -1, row: 1 }, // depth 3
        { node_id: "NUM.3", col: -2, row: -1 }, // depth 3
        { node_id: "NUM.4", col: -2, row: 0 }, // depth 3
        { node_id: "NUM.5", col: 1, row: -1 }, // depth 3
      ],
    },
    /**
     * `rimward` is a city built out toward one shore rather than around the centre — the
     * shape a player gets by following a coastline, and the opposite failure mode to
     * `packed`. Nothing sits deeper than band 3, so the frost is on the nearest building
     * from round one and on the last of them as the last round closes. Measured: the `strong` diamond
     * reaches four of the six from (-3, 0) and two or more from twenty-two of the 88
     * cells, so the middle of this city is worth aiming at while its ends are not — which
     * is the shape that makes "which of these do I save" a real question rather than a
     * search for the one cell that answers everything.
     */
    {
      id: "rimward",
      label: "Out along the shore",
      blurb:
        "Built out toward one coast. The frost arrives early and from one side, and no " +
        "fire reaches more than two buildings.",
      buildings: [
        { node_id: "NUM.S", col: -2, row: -2 }, // depth 3
        { node_id: "NUM.F", col: -2, row: 1 }, // depth 3
        { node_id: "NUM.2", col: -3, row: 2 }, // depth 2
        { node_id: "NUM.3", col: -3, row: -1 }, // depth 2
        { node_id: "NUM.4", col: -5, row: 0 }, // depth 0 — the frost takes it first
        { node_id: "NUM.5", col: -4, row: -3 }, // depth 1
      ],
    },
  ] as readonly WinterLayout[],
} as const;
