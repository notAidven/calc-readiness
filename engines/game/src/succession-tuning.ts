/**
 * THE SINGLE TUNING TABLE for the Succession — era four's mid-era crisis encounter.
 * Pure data, framework-free, and the ONLY place the encounter's numbers live.
 *
 * Shaped after `hard-winter-tuning.ts` (INV-CRISIS-14) and for the same reason it is
 * shaped that way: every magnitude the mechanic reads is here, never as a literal inside
 * a rule, so a retune is one edit to one file and nothing is persisted, so a retune
 * applies retroactively with no migration.
 *
 * `succession.test.ts` pins the RELATIONSHIPS between these numbers rather than the
 * digits — that the earning ladder is total and strictly ordered over a batch, that the
 * three spends are strictly ordered, that a perfect batch buys exactly one sway, and that
 * every authored board can be settled. Change a digit and the suite should stay green;
 * change a relationship and it should not. `succession-drift.test.ts` is the other half:
 * it plays every board at every uniform accuracy and measures the spread, because a
 * number tuned against one board is not a tuned number (INV-CRISIS-15).
 *
 * ## WHAT ERA FOUR IS, IN THE ONE SENTENCE THAT DECIDES EVERY NUMBER BELOW
 *
 * **Allegiance tips; it does not spread.** Era one's frost creeps along tile adjacency and
 * the player watches an edge. Era four's districts decide *on their own, in favour of
 * whoever is currently strongest*, and the player watches an object arrive at a plinth
 * before the decision lands. `crisis-reference-packs/README.md` §4 rules the four
 * propagation crises apart as a fact about the picture: era one is **creeping** and era
 * four is **tipping**.
 *
 * So there is no front, no edge and no neighbour relation anywhere in this table or in
 * `succession.ts`. A district has no position, no extent and no neighbours — it has an
 * `exposure` rank, which is a total order over the board and not a topology, and it has an
 * allegiance that is decided by a GLOBAL scalar (who is strongest right now). That is
 * enforced rather than promised: `test/successionPropagation.test.ts` sweeps every source
 * that can decide an allegiance for spatial tokens and fails on one.
 *
 * ## ALL VALUES ARE FIRST GUESSES, and the measurements are quoted at these values
 *
 * Every table in the docblocks below was measured against this file as it stands. Change
 * one and the quoted figures are stale; `succession-drift.test.ts`'s sweep is what to
 * re-read, and it prints the whole board-by-accuracy grid on failure.
 */

/**
 * WHO IS COURTING THE DISTRICTS. Exactly two, and they separate by POSE.
 *
 * The presentation brief's §3.2: *"The two claimants separate by pose, not by colour. A
 * standing figure against a seated one is a silhouette difference that survives full
 * zoom-out, which colour on a three-tone body would not, and which no runtime tint could
 * deliver anyway."* The ids are therefore the poses rather than names or colours, so the
 * engine and the board cannot drift about which is which.
 *
 * **Q5 (`era-04-succession-crisis.md` §13) asks whether there are exactly two and it is
 * open with the team lead.** The brief's own answer is that three would need a third pose
 * and *"the set stops reading at a glance"*. Nothing here is written for two specifically
 * — `successionStrengths` counts over `SUCCESSION.claimants` and the tie-break reads the
 * array's order — so a third claimant is a one-line change to this array plus a pose for
 * the artist. What a third WOULD cost is the tie-break's clarity, and that is named where
 * the tie-break is.
 */
export type ClaimantId = "standing" | "seated";

/** One claimant, as the board draws it. */
export interface SuccessionClaimant {
  readonly id: ClaimantId;
  /** How the rail names them. The brief's copy calls them by pose (§9.1). */
  readonly label: string;
  /** The mark cut into a boundary stone and into a drift block's top face (§3.2). */
  readonly mark: "chevron" | "ring";
}

/**
 * A district's allegiance. FOUR VALUES, and the fourth is not a claimant.
 *
 * `neutral` is the bare plinth. `standing` and `seated` are the two claimants. There is
 * deliberately no `contested` member here: a contest is a fact about a district's CIVIC
 * BUILDING and not about the district's allegiance, and the brief's own copy is what
 * settles that. Every line about a contest names a building — *"Cancel the claim on the
 * {building}"*, *"Secure the {building}"*, *"Their plate is off the {building}"*, *"The
 * {building} is back in use"* — while the line about deciding names a district, *"Sway
 * the {district}"* (§9.2, §9.5). Two layers, stated by the copy, and folding them into one
 * enum would make the three verbs act on the same noun when the brief says they do not.
 */
export type Allegiance = "neutral" | ClaimantId;

/**
 * A CIVIC BUILDING'S CLAIM, which is the second layer and the one that carries the
 * crisis's only durable consequence.
 *
 *  - `unclaimed` — no plate on the wall. A neutral district's building, or one the player
 *    has cancelled a claim on.
 *  - `claimed` — one claim plate on the wall, and the building works (§8.1's *"Resolved"*
 *    row: *"Plates off, one claim plate on the wall"*).
 *  - `contested` — the claim is disputed: shutter plates over the openings, the corner
 *    milestone tag, and **the capacity suspended** (§8.1). This is what a drift leaves
 *    behind, and it is the only state that writes to `CrisisDamage.suspended_civic`.
 */
export type CivicClaimState = "unclaimed" | "claimed" | "contested";

/** One authored district: a plinth, a civic building, and a place in the drift order. */
export interface SuccessionDistrictPlan {
  readonly id: string;
  /** How the rail and the accessible name spell it, e.g. `"harbour district"` (§10.2). */
  readonly label: string;
  /**
   * The one civic building at the district's centre. **Only civic buildings can be
   * claimed**, which is the sharpest line in the brief's floor (§1): a faction taking a
   * SKILL building would breach D-CRISIS-7's always-preserved list outright, because a
   * skill building is the record of a completed lesson. This type has no field that could
   * name a skill node, which is how that floor is kept structurally rather than by
   * discipline — the same technique `crisis-damage.ts` uses for the whole ruling.
   */
  readonly civic: SuccessionCivicPlan;
  /**
   * WHERE THIS DISTRICT SITS IN THE DRIFT ORDER — lower goes first. A total order over the
   * board's districts, and **not a position**.
   *
   * It has to be authored rather than derived, and the reason is the crisis's own
   * topology. There is nothing spatial to derive an order from: era four's propagation is
   * *"nothing spatial at all"*, so there is no rim depth, no distance from a source and no
   * front to be nearest to. Deriving it from allegiance instead would make the order move
   * under the player's own spends, and the drift line — *"The harbour district decides
   * next"* — is the most valuable sentence on the screen (§5.3, where it is the one
   * element that never collapses). A sentence that changed its subject because the player
   * looked at a card is worse than no sentence.
   *
   * So `exposure` is the board's own answer to *"which district is most exposed to the
   * dispute"*, and it varies per board, which is INV-CRISIS-15 in era four's vocabulary.
   */
  readonly exposure: number;
}

/** The one claimable building in a district. */
export interface SuccessionCivicPlan {
  /**
   * The civic placement id — the same opaque string the economy package keys a spend by,
   * and what `CrisisDamage.suspended_civic` records.
   *
   * NAMED IN PROSE AND NOT IN IMPORT FORM for the reason `crisis-damage.ts` gives at the
   * same field: INV-COS-1 is enforced as a STRING SCAN over the learning-path trees, so
   * writing the module specifier in this file would fail that guard even in a comment.
   *
   * The authored boards below carry stand-in ids. A caller with a real city passes its own
   * districts to `createSuccession`, exactly as a caller with a real city passes its own
   * placements to `createHardWinter`.
   */
  readonly placement_id: string;
  /** How the copy spells it: *"Secure the {building}"*. */
  readonly label: string;
  /**
   * Whether this roster member is an actual bought civic placement that may enter the
   * existing `suspended_civic` consequence channel.
   *
   * Authored forum members default to true. A live-city ward may be anchored to a skill
   * building or the Town Hall; those anchors carry the public dispute visually but may not
   * be written as civic damage, so the city adapter sets false.
   */
  readonly suspendable?: boolean;
  /**
   * Which of era four's four authored civic types this is
   * (`eras/era-04-classical/civic-buildings.md` §2). Carried so a board cannot invent a
   * fifth type, and so the surface knows which model to draw a claim plate on.
   */
  readonly type: SuccessionCivicType;
}

/**
 * ERA FOUR'S FOUR CLAIMABLE CIVIC TYPES, quoted from the era's own catalogue rather than
 * invented here (`eras/era-04-classical/civic-buildings.md` §2).
 *
 * The presentation brief's §10.2 uses *"The Bath House"* and *"basilica"* as examples.
 * Those are the brief's prose and not the tree's catalogue; the catalogue is the Grain
 * Dock, the Cottages, the Baths and the Fountain, and this table follows the catalogue.
 */
export type SuccessionCivicType = "grain_dock" | "cottages" | "baths" | "fountain";

/**
 * ONE WAY A PLAYER'S ERA-FOUR CITY MIGHT BE DIVIDED, as a whole board.
 *
 * Three of them, for the reason era one ships three layouts: a number tuned against one
 * board is not a tuned number (INV-CRISIS-15). Era one varies WHERE the buildings stand,
 * because that is the dimension its encounter turns on. Era four has no positions to vary,
 * so it varies **how many districts there are**, which is the dimension era four's
 * encounter turns on: the crisis settles when no district is neutral, so the district
 * count is the length of the crisis and every accuracy band is measured against it.
 *
 * **Q4 (§13) asks how many districts there are and whether they are authored or derived**,
 * and it is open with whoever authors era four's land. These three are authored stand-ins
 * and are labelled as such. What they are NOT is a guess about era four's island: nothing
 * here places a district anywhere, because a district in this crisis has no place.
 */
export interface SuccessionBoard {
  readonly id: string;
  /** How it reads on screen. */
  readonly label: string;
  /** What this shape puts under test, in one sentence, for the tuning read-out. */
  readonly blurb: string;
  readonly districts: readonly SuccessionDistrictPlan[];
}

export const SUCCESSION = {
  /** The production civil-war cadence: every rival move follows one batch of three. */
  batch_size: 3,
  /** One influence per correct answer. Accuracy changes this bank and nothing else. */
  influence_by_correct: [0, 1, 2, 3] as const,
  /**
   * The only two strategic actions in the redesigned crisis.
   *
   * `rally` prevents the next rival claim by raising the player's statue first.
   * `reopen` removes the newest civic closure while leaving the rival's statue in place.
   *
   * A rally costs one perfect batch. The surface permits one response per batch, so the old
   * cost of two made 2/3 and 3/3 strategically identical: either score could answer every
   * rival move immediately. Three preserves the existing rule that each accuracy rung has a
   * strictly better reachable ending, while a learner may still bank across rounds.
   */
  actions: {
    rally: { cost: 3 },
    reopen: { cost: 1 },
  },
  /** Pose and cut mark identify the two sides; hue never does. */
  sides: {
    player: { claimant: "standing", mark: "chevron" },
    rival: { claimant: "seated", mark: "ring" },
  } as const,
  /**
   * THE CYCLE, which is era four's clock and is not a clock.
   *
   * **D-CRISIS-34 (2026-07-31): a cycle is an ANSWERED QUESTION BATCH.** D-CRISIS-16
   * settled that a cycle must advance on player actions and never on elapsed time, which
   * fixed the clock and left the unit; this fixes the unit. §5.42 records the reasoning
   * and it is the reason the encounter works rather than a tiebreak between two units:
   * tying the cycle to the batch makes **earning influence and losing ground the same
   * act**, so a player cannot accumulate without the board moving against them.
   *
   * **The rejected alternative is what states the ruling's value most sharply, and it is
   * quoted because somebody will propose it again.** Had a cycle advanced on COMMITMENT,
   * never committing would mean never drifting, so waiting would be free in the one crisis
   * of the ten built to punish it. `successionReducer` therefore advances the cycle on
   * `resolve_batch` and on nothing else, and `commit_plan` deliberately does not turn one.
   */
  cycle: {
    /**
     * Questions per batch. Three, and it is the same number era one uses for a related but
     * not identical reason.
     *
     * Era one needs three because its ladder has four rungs over four possible scores and
     * the tier is a RATIO of what was asked. Era four's ladder is absolute — counters are
     * the count of right answers — so a short batch could not inflate a rung here the way
     * it would there. **The reason a short batch is still refused is the inverse of era
     * one's and is worth having written down**: `districts_per_cycle` is calibrated
     * against what a full batch mints, so serving two questions would quietly make the
     * encounter HARDER (one district lost against at most two counters earned) where era
     * one's short batch would have made it easier. Same refusal, opposite defect.
     *
     * `successionReducer` refuses a batch of any other size loudly rather than scaling it,
     * following `winterTierFor`'s treatment of an impossible score.
     */
    batch_size: 3,
    /**
     * How many undecided districts pick a side each cycle.
     *
     * **ONE, and D-CRISIS-16's own sentence is singular:** *"an undecided district picks a
     * side on its own, and it picks the currently strongest faction."* Two independent
     * reasons hold it there.
     *
     * The drift line is **one sentence** — *"The harbour district decides next. Right now
     * it would go to the seated claimant."* — and §5.3 makes it the one element on the rail
     * that never collapses at 460, because it is the most valuable line on the screen. Two
     * districts a cycle is two sentences or a list, and a list is what a player skims.
     *
     * And it is what makes the accuracy ladder legible. At `earn.counters_by_correct[3]`
     * a perfect batch mints exactly `spend.sway` counters, so a perfect player decides one
     * district in the same cycle the board decides one against them. **One a cycle is what
     * puts full accuracy exactly on the break-even line**, and any other value moves the
     * break-even off a rung of the ladder and onto a fraction.
     *
     * `successionReducer` reads this as a COUNT rather than branching on 1: it lands every
     * standing warning and issues this many new ones, so a retune to 2 needs no code
     * change and no dead branch is carried for the value that ships.
     *
     * ## WHAT ONE A CYCLE COSTS A PLAYER WHO WAITS, measured
     *
     * Districts decided after banking through `w` cycles before spending anything, at two
     * of three, on each board (`succession-drift.test.ts` sweeps the whole grid):
     *
     *   | board             | w=0 | w=1 | w=2 | w=3 | w=4 | w=5 | w=6 | of |
     *   |-------------------|----:|----:|----:|----:|----:|----:|----:|---:|
     *   | four-quarters     |   2 |   2 |   2 |   2 |   1 |   0 |   0 |  4 |
     *   | six-wards         |   4 |   4 |   4 |   4 |   3 |   2 |   1 |  6 |
     *   | two-and-the-forum |   2 |   2 |   2 |   1 |   0 |   0 |   0 |  3 |
     *
     * **The curve is non-increasing everywhere and it is NOT a straight line**, and the
     * flat left-hand end is the half a slogan gets wrong. Counters held are not counters
     * lost, so a short wait is recoverable: the player who banks for two cycles and then
     * spends catches up on the districts that are still neutral. What no bank can buy back
     * is a district that has already decided, because allegiance is monotone — so the
     * charge lands the moment the wait outruns the drift rather than the moment it starts,
     * and the length of the flat end is exactly how many cycles that takes on that board.
     */
    districts_per_cycle: 1,
  },

  /**
   * **WHICH QUESTIONS A BATCH MAY ASK — D-CRISIS-14's three-era window, and era four is
   * the first crisis of the ten where the weights have anything to weigh.**
   *
   * The ruling, quoted rather than paraphrased: *"The window is the current era plus the
   * previous two. Sampled **bucket-first, then a skill within the bucket** — never
   * uniformly across eligible nodes."* The shares are **40% current, 35% previous, 25% two
   * eras back**, and the two named exceptions are exceptions to the WEIGHTS rather than to
   * the shape of the draw.
   *
   * ## Why this table is in era four's file and not in era one's
   *
   * `hard-winter-pool.test.ts` records that **the bucket weights are not implemented** for
   * era one, and its reason is precise rather than a shrug: era one has no era behind it,
   * so D-CRISIS-14 carries a written-down era-one exception at *"100% of era one's own
   * mastered nodes"*, and *"a general implementation hands era one a 60% share of nothing,
   * yields a short draw, and INV-CRISIS-9 then refuses it"*. That test also names the
   * condition that would make the buckets owed: **a second era with a question pool.**
   *
   * Era four's window is exactly that condition arriving. Its three eras all have authored
   * question pools — era four's own five POL nodes, era three's five LIN nodes, era two's
   * one EXP and four RAD nodes — so era four is the first crisis in the ten that can
   * actually draw across a window, and the first that owes the weights.
   *
   * ## WHY THE SHARES ARE INTEGERS, which is a correctness decision and not a formatting one
   *
   * They are **percentage points, whole numbers, summing to 100**, because the apportionment
   * in `succession-questions.ts` compares two magnitudes to decide which bucket a question
   * belongs to. Held as fractions (`0.4`, `0.35`, `0.25`) none of the three is exact in
   * binary, so the comparison at a tie would turn on float noise and the batch a player
   * meets would depend on rounding. Held as integers the comparison is
   * `share * asked - taken * 100` over whole numbers and is exact at every tie.
   *
   * ## What a UNIFORM draw across era four's window would actually do, measured
   *
   * §5.15's worked cases are the reason the ruling exists, and era four has its own. At the
   * trigger the eligible set is **3 mastered POL nodes, era three's 5 and era two's 5**, so
   * drawing uniformly across nodes gives:
   *
   *   | bucket | uniform across nodes | **ruled** |
   *   |--------|---------------------:|----------:|
   *   | era four (current) | 3/13 = **23%** | **40%** |
   *   | era three (previous) | 5/13 = **38%** | **35%** |
   *   | era two (two back) | 5/13 = **38%** | **25%** |
   *
   * So a uniform draw would very nearly HALVE the share of the chapter the player is
   * standing in and hand the oldest bucket half again more than it is ruled — era ten's
   * defect (§5.15) arriving in era four, for no reason except that era four's crisis fires
   * with three of its five nodes done while the two eras behind it are complete. That is
   * why `composeSuccessionBatch` requires the skill order rather than defaulting to a
   * shuffle, which is a deliberate departure from `composeHardWinterBatch`.
   */
  window: {
    /**
     * How many eras behind the crisis's own the window reaches. **Two** (D-CRISIS-14).
     *
     * Read as a count rather than branched on, so `successionWindow` needs no code change
     * if the reach is ever retuned; the share list below has to keep the same length, and
     * `succession-questions.test.ts` asserts that the two agree rather than trusting them.
     */
    eras_back: 2,
    /**
     * The shares, **current era first**, in percentage points.
     *
     * The order is load-bearing twice over. It is what `successionWindow` walks backward
     * from the crisis's own era, so index `k` is `k` eras back; and it is the tie-break in
     * the apportionment, which goes to the EARLIER entry — so a tie is settled in favour of
     * the chapter the player is standing in, which is the direction §5.15's softening
     * argues for (*"a crisis drawing only on older eras would feel disconnected from the
     * chapter the player is standing in"*).
     *
     * **A window that reaches past the start of the game COLLAPSES rather than shrinking**,
     * and that is derived from the ruling rather than invented beside it: the shares of the
     * eras that are not there fold into the oldest era that is. That single rule reproduces
     * both of D-CRISIS-14's named exceptions exactly — era two at *"40% current, 60% era
     * one"* (the 25 folds into the previous bucket) and era one at *"100% from era one's own
     * mastered nodes"* (35 and 25 both fold into the only bucket left). Era four needs no
     * exception at all, so the collapse never fires for the crisis that ships it;
     * reproducing the two written-down exceptions is how the derivation is checked rather
     * than how it is used, and era one's crisis does not read this table.
     */
    shares_percent: [40, 35, 25] as readonly number[],
  },

  /**
   * **WHAT A BATCH EARNS, and it is the plainest ladder in the nine on purpose.**
   *
   * Indexed by the number of right answers, so the array IS the ladder and the index IS
   * the score: `counters_by_correct[k]` is what `k` of `cycle.batch_size` mints. Total by
   * construction over every possible score, which is the property era one buys with a
   * `min_ratio: 0` floor rung and this buys with an array of the right length.
   *
   * §4.2 of the presentation brief, in full: *"Accuracy sizes how many counters a batch
   * sets into the slab. Nothing else about it changes: a batch never fails to earn, per
   * INV-CRISIS-4. […] This is the plainest ladder in the nine and it should stay plain.
   * Era four's complexity is in what the player does with the bank, not in how it fills."*
   *
   * ## INV-CRISIS-4 AT THE BOTTOM RUNG, which reads differently here and is sharper
   *
   * Era one's bottom rung still LIGHTS A FIRE — `radius_by_tier.none` is `null`, a real lit
   * fire that wards nothing — because *"accuracy decides the magnitude, not whether it
   * happens"*. Era four's bottom rung mints nothing at all, and §9.5's own copy for it is
   * *"0 right. No counters this round."* That is not a breach of the invariant, and the
   * reason is the ruling that makes era four work: **the thing a batch always does here is
   * turn a cycle.** A zero-accuracy batch banks nothing and still moves a district to the
   * strongest claimant, which is the whole of D-CRISIS-34. So the action still happens at
   * the bottom rung; what accuracy sizes is the bank, and what it never sizes is whether
   * the board moves.
   *
   * IDENTITY IS NOT AN ACCIDENT AND IS NOT LOAD-BEARING EITHER. One counter per right
   * answer is the plainest reading of §4.2's three-row table, and it makes the counting
   * board countable at a glance against the questions just answered, which is what the
   * ruled slab is for (§4.1: *"Why not a number"*). Nothing in `succession.ts` assumes
   * `counters_by_correct[k] === k`; a retune to `[0, 1, 2, 4]` — rewarding the perfect
   * batch — is a one-line edit, and the relationship the suite pins is the one below.
   */
  earn: {
    counters_by_correct: [0, 1, 2, 3] as readonly number[],
  },

  /**
   * **WHAT THE THREE VERBS COST, and the two anchors the whole price list is derived from.**
   *
   * D-CRISIS-4 rules the three uses: *"secure buildings, cancel rival claims, sway neutral
   * districts."* They are three genuinely different verbs (§6: the case era one's four
   * identical white boxes failed), and the prices below are what makes them three different
   * DECISIONS rather than three sizes of the same one.
   *
   * ## The two anchors, and the third price falls out of them
   *
   *  - **`cancel: 1` is the floor.** The smallest spend that is still a spend. A spend of
   *    zero is not a spend, and the floor has to exist for a reason the read-out panel
   *    makes plain: §7.2 requires the panel to *"show what is left over"*, and §9.3's
   *    leftover line is *"2 counters left over. They do not carry past the end of this."*
   *    Unspent influence evaporates at the end of the crisis (§5.42a), so **a verb priced
   *    at the floor is what stops a leftover counter being worthless**, and cancel is the
   *    right verb to put there because it is the only one of the three that changes no
   *    district's allegiance.
   *  - **`sway: 3` is the perfect batch** — `earn.counters_by_correct[cycle.batch_size]`.
   *    This is the single most important number in the table and `succession.test.ts`
   *    asserts the identity rather than the digit. It is what puts full accuracy exactly on
   *    the break-even line: `cycle.districts_per_cycle` is 1, so a player answering
   *    everything right decides exactly one district per cycle while the board decides
   *    exactly one against them. **At 3 of 3 you hold the line; at 2 of 3 you fall behind,
   *    and the shortfall is arithmetic rather than a threshold.** That is the sharpest
   *    statement of "era four punishes hesitation" the numbers can make.
   *  - **`secure: 2` is `cancel + 1`, and the extra counter is the plate.** Cancel takes
   *    the rival's plate off a contested building and leaves it unclaimed; secure takes it
   *    off and puts yours up. The second counter buys exactly the difference, which is a
   *    price a player can read off the two cards without being told.
   *
   * ## What each verb is worth, in the one currency the drift reads
   *
   * Drift goes to whoever is **strongest**, and strength is districts held plus claim
   * plates standing (`successionStrengths`). So the three verbs are three different moves
   * on one scalar, and the price list is a swing-per-counter table:
   *
   *   | verb     | cost | strength swing        | touches the terminal condition |
   *   |----------|-----:|-----------------------|--------------------------------|
   *   | `cancel` |    1 | rival −1              | no                             |
   *   | `secure` |    2 | rival −1, yours +1    | no                             |
   *   | `sway`   |    3 | yours +2              | **yes** — a district leaves neutral |
   *
   * Cancel and secure both swing one point per counter. **Sway swings two points for three
   * counters and is deliberately the worst rate**, because the premium is the price of the
   * only verb that ends the crisis on your terms. A player who spends only on strength can
   * steer WHOSE the drift is and never stop it, which is the mechanism charging for
   * hesitation stated as an exchange rate.
   *
   * ## The strategy that price list creates, and why it is a feature
   *
   * Buying strength cheaply makes the drift favour your own claimant, and a district that
   * arrives by drift arrives CONTESTED — its civic capacity suspended (§8.1). So the cheap
   * line ends with a city that went your way and cannot use half its civic buildings, and
   * the dear line ends with fewer decided districts and nothing suspended. **Two plans at
   * identical accuracy reaching visibly different endings is INV-CRISIS-12**, which is the
   * design's own success test, and `succession-drift.test.ts` asserts the gap rather than
   * describing it.
   *
   * ## WHAT THE PRICE LIST MEASURES, at the values above
   *
   * Every authored board played at every uniform accuracy, districts decided by the player,
   * with the district count beside it. `decisive` answers the standing block as soon as it
   * can afford to; `hesitate` never commits; `thrifty` settles every contest at the floor
   * price and decides nothing:
   *
   *   | board             | policy   | 0/3 | 1/3 | 2/3 | 3/3 | of |
   *   |-------------------|----------|----:|----:|----:|----:|---:|
   *   | four-quarters     | decisive |   0 |   1 |   2 |   4 |  4 |
   *   | six-wards         | decisive |   0 |   2 |   4 |   6 |  6 |
   *   | two-and-the-forum | decisive |   0 |   1 |   2 |   3 |  3 |
   *   | *any board*       | hesitate |   0 |   0 |   0 |   0 |    |
   *   | *any board*       | thrifty  |   0 |   0 |   0 |   0 |    |
   *
   * Three things to read off it.
   *
   *  - **Every adjacent pair separates on every board.** There is no tied rung anywhere,
   *    which era one's ladder cannot say of its own (`fire.burn_rounds_by_tier` carries a
   *    priced and accepted tie on the `spread` layout). Era four gets it for free from the
   *    identity above: a rung of the earning ladder is a fraction of a sway.
   *  - **A PERFECT PLAYER WHO HESITATES DECIDES NOTHING.** The `hesitate` row is flat at
   *    zero across the whole ladder, which is the design in one line: accuracy is not what
   *    the drift reads, and the crisis charges for declining to act rather than for
   *    answering badly.
   *  - **At full accuracy the accounts balance exactly.** 12 earned and 12 spent on
   *    `four-quarters`, 18 and 18 on `six-wards`, 9 and 9 on `two-and-the-forum`, and
   *    nothing forfeited on any of them. That is the sway identity showing up as a whole
   *    encounter's books, and it is the sharpest evidence that full accuracy sits on the
   *    break-even line rather than near it.
   */
  spend: {
    sway: 3,
    secure: 2,
    cancel: 1,
  },

  /**
   * The two claimants, in TIE-BREAK ORDER, which is the one thing this array's order
   * decides and is load-bearing.
   *
   * ## Why ties break to the array's order rather than to anything cleverer
   *
   * The opening board is every district neutral and both claimants on zero, so the very
   * first drift is a tie and something has to settle it. **The tie-break has to be
   * deterministic AND previewable**, and those two together rule out every alternative
   * that was considered:
   *
   *  - **A random tie-break cannot be previewed.** The drift line has to name who the
   *    block is marked for a whole cycle before it lands (*"Right now it would go to the
   *    seated claimant"*), and INV-CRISIS-11 forbids an unseeded draw. A seeded one would
   *    need a seed a player can read off the board, and there is no such number here.
   *  - **"Nobody drifts on a tie" breaks the outcome clause.** At 0–0 nothing would ever
   *    drift, so a player who enters and never commits would watch nothing happen — and
   *    §5.42c rules that exact player's ending: *"every neutral district drifts to the
   *    strongest faction and the crisis reaches its terminal condition decided against
   *    them."* A tie rule that freezes the opening board contradicts a ruling.
   *  - **Alternating on a tie** is previewable and deterministic and was declined as
   *    unreadable: the player would have to remember who won the last one, and the board
   *    draws no such thing.
   *
   * So ties go to the claimant EARLIER IN THIS ARRAY, and the board is free to order them,
   * which makes the direction of the opening snowball a property of the board rather than
   * a global constant.
   *
   * **A snowball is the intended shape and not a side effect.** D-CRISIS-16: *"waiting
   * compounds against you: the longer you hold influence back, the stronger the position
   * you will eventually have to buy against."* A drift gives its claimant a district, which
   * makes them strictly strongest, which sends the next drift the same way. A player who
   * never spends therefore loses the whole city to one claimant, which is exactly §5.42c's
   * ending; a player who spends can flip which claimant that is for two counters.
   *
   * WHAT A THIRD CLAIMANT WOULD COST (Q5): nothing in the code, and the tie-break's
   * legibility. With two, *"the tie goes to the standing claimant"* is a sentence. With
   * three it is an ordering nobody can hold in their head, and the brief's own objection —
   * that the silhouette set stops reading at a glance — arrives at the same time.
   */
  claimants: [
    { id: "standing", label: "the standing claimant", mark: "chevron" },
    { id: "seated", label: "the seated claimant", mark: "ring" },
  ] as readonly SuccessionClaimant[],

  /**
   * **THE VERDICT BAND, and it is the one number here that is read off the copy rather than
   * derived from the mechanics.**
   *
   * §9.5 gives exactly two settled outcomes and no third: *"Settled, favourable — It is
   * settled. Most of the city went your way, and the statues are up."* against *"Settled,
   * mixed — It is settled. Some districts went the other way."* **"Most" is a majority**,
   * so the band is a strict majority and this number is `0.5` read as an exclusive floor.
   * Half the city exactly is not most of it.
   *
   * ## What share is measured, and why it is not the claimant's
   *
   * It is the share of districts **the player decided**, not the share one claimant holds.
   * That is a deliberate choice and it is what makes the verdict answerable while **Q6 is
   * open** — Q6 asks whether the player backs a claimant or is the city, and it *"changes
   * the register of every outcome line"*.
   *
   * A verdict keyed to a claimant's holdings cannot be computed without Q6: if the player
   * is the city, no claimant is "yours". A verdict keyed to who DECIDED is computable under
   * either reading and says the same thing under both, because a district the player swayed
   * is one they chose the claimant for. It is also the axis the crisis is about: era four
   * charges for hesitation, so the thing worth counting at the end is how much of the city
   * the player decided rather than let decide itself.
   *
   * `successionOutcome` reports the claimant holdings beside the verdict anyway, so a
   * surface that gets a Q6 ruling can phrase the sentence either way off the same outcome.
   */
  verdict: {
    favourable_min_share: 0.5,
  },

  /**
   * WHAT ERA FOUR LEAVES BEHIND, which is capacity and never ruin.
   *
   * §8: *"Era four's consequence is capacity, not ruin. Nothing in this crisis destroys
   * anything, which is worth saying because the fiction of a succession dispute suggests
   * otherwise."* There is no `rebuild_cost`, no `reclaim_cost` and no damage ladder in this
   * table, and that is the whole of era four's damage model. `successionDamage` reports a
   * `CrisisDamageReport` with an empty `buildings` list and an empty `cells` list, always,
   * and `succession.test.ts` sweeps every reachable ending to assert it rather than
   * describing it.
   *
   * ## Q3 IS OPEN AND A DEFAULT IS TAKEN HERE, with the argument that forces it
   *
   * §8.2 rules that suspended capacity *"lifts when the district resolves"* and carries
   * **Q3**: *"Whether a district that resolved against the player keeps its suspension."*
   *
   * [DEFAULT TAKEN, not a ruling: **a contest that is still standing when the crisis
   * settles persists**, and it is what the crisis writes to `CrisisDamage.suspended_civic`.
   * The argument is that the alternative makes a ruled sentence false. §8.3 says era four's
   * *"whole consequence lands in `suspended_civic`, which exists as a durable record"*, and
   * §5.42c says a drift-settled crisis's consequence is that *"contested districts suspend a
   * building's contribution"*. If every suspension lifted at the settle, `suspended_civic`
   * would never be written by this crisis and era four would leave nothing behind at all —
   * so the default is forced by what the spec already claims era four's consequence IS,
   * rather than chosen between two live options. Reversing it means clearing the contests
   * in `successionDamage` and finding era four a different consequence, which is a design
   * change and not a flag.]
   *
   * It stays inside D-CRISIS-7's floor and the route back exists rather than being
   * promised: a suspension is *"temporarily unusable"*, which the floor names as permitted,
   * and `clearSuspendedCivic` in `crisis-damage.ts` is the existing path that lifts one.
   */
  consequence: {
    /**
     * Whether a drift suspends the district's civic capacity. Read by
     * `successionCycleClose`; it is the only place the crisis writes durable damage.
     *
     * It is a constant rather than a hard-coded `true` because it is the exact hinge Q3
     * turns on, and a reader looking for "where does era four's consequence come from"
     * should find one name rather than an `if` in a reducer.
     */
    drift_suspends_civic: true,
  },

  /**
   * **THE THREE AUTHORED BOARDS.** The first is the tuning baseline.
   *
   * Every district below is authored: an id, a label the copy can interpolate, one civic
   * building from era four's own catalogue, and a place in the drift order. **Nothing here
   * has a position**, and that absence is the design rather than an omission — see the head
   * of this file, and `SuccessionDistrictPlan.exposure` for why the order is authored.
   *
   * ## What the three vary, and why it is the district COUNT
   *
   * The crisis settles when no district is neutral and exactly one district decides per
   * cycle, so **the district count IS the length of the encounter** and every accuracy band
   * is measured against it. A four-district board and a six-district board are not the same
   * encounter played twice; they are different amounts of time for a 2-of-3 player to fall
   * behind in. Era one varies where the buildings stand because that is what its frost
   * reads; era four varies how many districts there are because that is what its drift
   * reads.
   *
   * The measured spread across all three is in `succession-drift.test.ts`, which asserts
   * the two bounds that make the price list tunable at all — that no board can be swept at
   * zero accuracy, and that every board CAN be swept at full accuracy, so the encounter is
   * neither free nor a dead end on any board the prototype deals (INV-CRISIS-3).
   */
  boards: [
    /**
     * `four-quarters` is the BASELINE and the four districts carry one of each of era
     * four's four civic types, so every claim plate, shutter plate and corner tag the
     * artist has to author is exercised by the default board.
     *
     * The exposure order is the city's own: the harbour first because a port city's
     * quayside is where a dispute is felt first and where §2.4 shuts the port, then the
     * market, then the kiln, and the forum last because it is the seat of the thing being
     * disputed and the last quarter to give up on a decision being made properly.
     */
    {
      id: "four-quarters",
      label: "Four quarters",
      blurb:
        "One district per civic type, decided one a cycle. A perfect batch holds the " +
        "line exactly and anything less falls behind.",
      districts: [
        {
          id: "harbour",
          label: "harbour district",
          civic: {
            placement_id: "succession-harbour-grain-dock",
            label: "Grain Dock",
            type: "grain_dock",
          },
          exposure: 0,
        },
        {
          id: "market",
          label: "market district",
          civic: {
            placement_id: "succession-market-fountain",
            label: "Fountain",
            type: "fountain",
          },
          exposure: 1,
        },
        {
          id: "kiln",
          label: "kiln district",
          civic: {
            placement_id: "succession-kiln-cottages",
            label: "Cottages",
            type: "cottages",
          },
          exposure: 2,
        },
        {
          id: "forum",
          label: "forum district",
          civic: {
            placement_id: "succession-forum-baths",
            label: "Baths",
            type: "baths",
          },
          exposure: 3,
        },
      ],
    },
    /**
     * `six-wards` is the LONG board and it is where the accuracy bands come apart furthest.
     *
     * Six districts is six cycles of perfect play and seven of none, so a 2-of-3 player has
     * the longest run in which to accumulate a shortfall of one counter a cycle. It is
     * also the board that shows the price list's second line: with six districts there is
     * room to spend on strength for several cycles and still have districts left to decide,
     * which is the plan the baseline board is too short to hold.
     *
     * Types repeat, which is correct rather than a compromise: era four's catalogue has
     * four types and a city of six quarters will have two of something.
     */
    {
      id: "six-wards",
      label: "Six wards",
      blurb:
        "The long board. Two more districts than there is time to decide well, and the " +
        "one where a steady learner's shortfall compounds furthest.",
      districts: [
        {
          id: "quay",
          label: "quay ward",
          civic: {
            placement_id: "succession-quay-grain-dock",
            label: "Grain Dock",
            type: "grain_dock",
          },
          exposure: 0,
        },
        {
          id: "shore",
          label: "shore ward",
          civic: {
            placement_id: "succession-shore-cottages",
            label: "Cottages",
            type: "cottages",
          },
          exposure: 1,
        },
        {
          id: "kiln",
          label: "kiln ward",
          civic: {
            placement_id: "succession-kiln-fountain",
            label: "Fountain",
            type: "fountain",
          },
          exposure: 2,
        },
        {
          id: "terrace",
          label: "terrace ward",
          civic: {
            placement_id: "succession-terrace-cottages",
            label: "Cottages",
            type: "cottages",
          },
          exposure: 3,
        },
        {
          id: "market",
          label: "market ward",
          civic: {
            placement_id: "succession-market-baths",
            label: "Baths",
            type: "baths",
          },
          exposure: 4,
        },
        {
          id: "forum",
          label: "forum ward",
          civic: {
            placement_id: "succession-forum-baths",
            label: "Baths",
            type: "baths",
          },
          exposure: 5,
        },
      ],
    },
    /**
     * `two-and-the-forum` is the SHORT board and it exists to put the opening under test.
     *
     * Three districts is the smallest board on which every one of the three verbs is
     * reachable in one encounter, and it is the board where the opening tie decides the
     * most: the first drift is the only one a player with no bank can do nothing about, and
     * on a three-district board that single district is a third of the city.
     *
     * **It is the board that shows the warning is worth something.** A player who reads the
     * drift line after their first batch has one cycle and up to three counters to answer
     * it, which is exactly enough to sway; a player who does not has lost a third of the
     * board to a claimant before they have spent anything.
     */
    {
      id: "two-and-the-forum",
      label: "Two quarters and the forum",
      blurb:
        "Three districts, so the opening tie is a third of the city and the first drift " +
        "line is the whole game.",
      districts: [
        {
          id: "harbour",
          label: "harbour district",
          civic: {
            placement_id: "succession-harbour-grain-dock",
            label: "Grain Dock",
            type: "grain_dock",
          },
          exposure: 0,
        },
        {
          id: "terrace",
          label: "terrace district",
          civic: {
            placement_id: "succession-terrace-cottages",
            label: "Cottages",
            type: "cottages",
          },
          exposure: 1,
        },
        {
          id: "forum",
          label: "forum district",
          civic: {
            placement_id: "succession-forum-baths",
            label: "Baths",
            type: "baths",
          },
          exposure: 2,
        },
      ],
    },
  ] as readonly SuccessionBoard[],
} as const;
