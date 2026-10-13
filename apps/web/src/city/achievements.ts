import { NO_CRISIS_DAMAGE } from "@cr/game";
import { runtimeStorage } from "../storage/runtimeStorage";

/**
 * **ACHIEVEMENTS: THE RECORD LAYER, AND WHY IT IS NOT THE CRISIS ACKNOWLEDGEMENTS AGAIN.**
 *
 * The team lead, 2026-08-03: *"start building the framework for this: e.g you completed
 * your first crisis; your first era; etc things like that."* **The framework is the ask**,
 * and a handful of real entries is the demonstration that it works. Adding one is a row in
 * {@link ACHIEVEMENTS}.
 *
 * ## THIS IS AN ADDITION TO A RULING, NOT A REVERSAL OF ONE, AND THE HISTORY MATTERS
 *
 * SPOV 2 of `docs/BrainLift_Game_Design.md` refused points, badges and leaderboards. The
 * lead amended its badges third on 2026-08-01, saying a short line naming something the
 * player had just done could not hurt, and §5 of
 * `docs/superpowers/specs/2026-08-01-game-feel-mechanics-backlog.md` designed that
 * amendment as narrowly as it could be read: **two transient sentences, no store, no
 * surface**. Those shipped in #397 and they are still there, untouched by this file.
 * Then he asked for a framework, which is the thing §5.6 prohibition 3 declined to build.
 *
 * **So the two layers are deliberately different layers, not two versions of one.**
 *
 *  - A crisis acknowledgement is the MOMENT. It is a sentence on the beat that produced
 *    it, derived from `CrisisDamage` alone, shown once and never recorded. It cannot
 *    answer *"what have I done here"* an hour later, and by design it does not try.
 *  - An achievement is the RECORD. It is declared, persisted per id, earned once and
 *    permanently, and it can be read back.
 *
 * ## HOW THEY ARE KEPT FROM ARGUING, and it is a property rather than a promise
 *
 * The failure to avoid is *"you survived your first winter"* twice in two corners. The two
 * shipped acknowledgements fire on exactly two transitions: the conclusion card while the
 * damage mint is still at its opening value, and the repair that takes the last scar off.
 * **No achievement in this table is earned on either of those**, and
 * `test/achievementsAreNotAScore.test.ts` measures it rather than trusting it:
 *
 *  - the crisis one needs the mint to have MOVED, which happens when the player carries
 *    damage home, strictly after the conclusion card has had its say;
 *  - the recovery one needs a ruin STANDING, which is the negation of the state the
 *    second acknowledgement fires on, so the repair that clears the island cannot earn it.
 *
 * ## AND WHAT KEEPS IT FROM BECOMING A SCORE
 *
 * BUILD 2 of the ranked research is *"one unifying progress currency (mastery), no
 * parallel point systems"*, and it survives the surface this feature has and the
 * acknowledgements refused:
 *
 *  1. **Nothing is counted.** No total, no *"two of five"*, no percentage, no tier, no
 *     rarity, and no number in any line of copy. The list is a list of sentences.
 *  2. **Nothing is compared.** No other learner is in any sentence and there is no cohort
 *     to sit in.
 *  3. **Nothing can be missed.** Every condition below is satisfied by CONTINUING, never
 *     by doing better, so an unearned row reads as *"not yet"* rather than as a grade.
 *     That is what makes {@link AchievementDef.toEarn} safe to show before it is earned.
 *  4. **No threshold above one.** *"Ten buildings"* is a score wearing a sentence, so an
 *     achievement may name the FIRST of something and never the tenth. The guard pins
 *     this by proving every entry is earned by a witness whose every count is one.
 *  5. **It gates nothing** (`INV-COS-1`). Nothing reads an achievement back to decide
 *     whether a lesson may be entered, what anything costs, or whether an era may advance.
 *
 * ## THE COPY AND THE CONDITION CANNOT DRIFT, and that is what {@link AchievementAxis} is
 *
 * *"If the copy says 'your first era' and the predicate counts crises, nothing will ever
 * catch it."* So the two are chained through the axis, and both links are mechanical:
 *
 *  - **axis to predicate.** {@link ACHIEVEMENT_AXES} names the state fields an axis is
 *    allowed to read. The guard DERIVES each predicate's real dependencies by moving one
 *    field of {@link AchievementState} at a time and watching the answer, then requires
 *    the derived set to equal the declared one. A predicate that started counting crises
 *    would derive `crisesRecorded` and fail against an `era` axis.
 *  - **axis to copy.** Each axis carries the word its sentences must contain, and any two
 *    axes that read nothing in common must not borrow each other's word.
 */

/**
 * The state an achievement is decided over: four counts, every one of them ALREADY
 * derived by the city for another purpose.
 *
 * Counts rather than booleans, and the reason is the guard rather than the predicates:
 * a count can be moved past one, which is what lets the sweep prove that no entry here is
 * a threshold in disguise. Nothing is accumulated for this feature and nothing new is
 * tracked; `achievementStateFrom` in `CitySurface` is four reads.
 */
export interface AchievementState {
  /**
   * Crisis runs this island has carried home, from the damage mint.
   *
   * The mint is the city's own monotone counter, persisted with the scars because a repair
   * spend is keyed by it. It only ever rises, so this is the one field here that a second
   * crisis cannot take back.
   */
  readonly crisesRecorded: number;
  /** Ages behind the city: era position less one, so a city in its first age reads zero. */
  readonly agesBehind: number;
  /** Skills carried to full mastery. Monotonic in v1 (`docs/MVP_Definition.md`). */
  readonly masteredSkills: number;
  /** Buildings a crisis has left standing in ruins, waiting to be paid for. */
  readonly standingRuins: number;
}

/** An island nothing has happened to yet. The floor every witness is built up from. */
export const NEW_CITY_ACHIEVEMENT_STATE: AchievementState = {
  crisesRecorded: 0,
  agesBehind: 0,
  masteredSkills: 0,
  standingRuins: 0,
};

/**
 * What an achievement is ABOUT. The join between its sentence and its predicate.
 *
 * A closed union rather than free text: a new axis is a visible edit to
 * {@link ACHIEVEMENT_AXES} beside the fields it may read and the word it must say, which
 * is the whole mechanism that stops a row's copy drifting off its condition.
 */
export type AchievementAxis = "crisis" | "era" | "mastery" | "recovery";

export interface AchievementAxisRule {
  /**
   * The only fields of {@link AchievementState} a predicate on this axis may depend on.
   * Derived from the predicates and compared, never trusted.
   */
  readonly reads: readonly (keyof AchievementState)[];
  /** The word every sentence on this axis has to contain. */
  readonly says: RegExp;
}

/**
 * The axes, their fields and their vocabulary.
 *
 * `recovery` is the one axis that reads two fields, and that is what it IS: learning while
 * the city is still wrecked is not the mastery axis and not the crisis axis, it is the two
 * crossed. Because its fields overlap `mastery`'s, the guard does not hold the two apart by
 * vocabulary — it holds them apart by the predicates, which is the stronger check anyway.
 */
export const ACHIEVEMENT_AXES: Readonly<Record<AchievementAxis, AchievementAxisRule>> = {
  crisis: { reads: ["crisesRecorded"], says: /crisis/i },
  era: { reads: ["agesBehind"], says: /\bage\b/i },
  mastery: { reads: ["masteredSkills"], says: /master/i },
  recovery: { reads: ["masteredSkills", "standingRuins"], says: /ruin/i },
};

export interface AchievementDef {
  /** Stable, and part of the storage key, so a rename forgets what a learner earned. */
  readonly id: string;
  readonly axis: AchievementAxis;
  /**
   * The sentence shown once it is earned, on the moment and in the list.
   *
   * Past tense, and about the player rather than about the mechanic. `cityCopyRegister`
   * sweeps these with every other line in the city: no em-dash, and nothing may open with
   * what did not happen.
   */
  readonly earned: string;
  /**
   * The same row before it is earned.
   *
   * **An invitation, never a bar.** It has to be readable by somebody who will get there
   * eventually just by carrying on, because the list shows it to them on the way. That is
   * the difference between a locked entry that says *"not yet"* and one that says *"you
   * failed"*, which CAREFUL 11 is about.
   */
  readonly toEarn: string;
  readonly isEarned: (state: AchievementState) => boolean;
}

/**
 * **THE TABLE. Four entries, and each one is a different kind of thing.**
 *
 * Small on purpose. BUILD 6 asks the game layer to stay subordinate to the maths, AVOID 15
 * forbids inventing something in order to mark it, and the superseded research's one honest
 * observation about badges was that they *"fade with novelty"*. Four sentences that mean
 * something beat twenty that do not.
 *
 * **What was deliberately left for later**, each for a reason rather than for room:
 *
 *  - **Every skill of an age mastered.** It is a real beat and it belongs to the era-advance
 *    ceremony, which already renders an inspection of exactly that.
 *  - **The whole graph.** `2026-07-31-game-completion-ceremony-design.md` owns the ending.
 *    A row here would be a smaller second version of it.
 *  - **Anything about the citizens coming home.** The departure mechanic is ruled
 *    (D-CRISIS-28) and NOT WIRED: `citizens.ts` says in as many words that the capacity a
 *    crisis lowers is the economy's livability, that the roster takes no economy input, and
 *    *"until those are reconciled the ruling cannot reach this line"*. So no crisis can
 *    displace anybody today, and an achievement for their return would be a row nobody
 *    could ever earn.
 *  - **Anything conditional on a crisis going WELL.** Two of the five verdict rungs
 *    (`held`, `bought`) are unreachable at the shipped tuning by `WinterConclusion`'s own
 *    account, and a rung that cannot be reached is the same defect from the other side.
 */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    /*
     * THE LEAD'S FIRST EXAMPLE. It is the crisis, and it is deliberately NOT the sentence
     * the conclusion card already says.
     *
     * The mint moves when the player carries the damage home, which is a press they make
     * after the card has had its say, so this cannot land on top of it. And the line claims
     * only what the 2026-07-30 ruling GUARANTEES: a crisis may ruin, disable and scar, and
     * may never remove an earned building, so a city that met one is a city still standing
     * however badly the winter went. Nothing here reads the outcome, so there is no winter
     * this sentence would be tactless about.
     */
    id: "crisis-behind-you",
    axis: "crisis",
    earned: "A crisis came, and your city is still standing.",
    toEarn: "See a crisis through, and bring what it did home.",
    isEarned: (state) => state.crisesRecorded >= 1,
  },
  {
    /*
     * THE LEAD'S SECOND EXAMPLE, and the copy is the design record's own: §5.5 wrote this
     * sentence for a fourth acknowledgement that never shipped, because the era-advance
     * ceremony was another agent's at the time. The ceremony has landed and the sentence
     * was never used, so it is spent here rather than written again.
     */
    id: "first-age",
    axis: "era",
    earned: "Your first age is behind you.",
    toEarn: "Take your city on into its second age.",
    isEarned: (state) => state.agesBehind >= 1,
  },
  {
    /*
     * THE MATHS, which is the only axis where the city is not the subject.
     *
     * Full mastery and not the built stage: a building tops out at mastery 1 and the city
     * already celebrates that with a chime and a note. The last star is a beat nothing in
     * the game marks, and it is the one this whole product is for.
     */
    id: "first-mastery",
    axis: "mastery",
    earned: "You took a skill all the way to mastery.",
    toEarn: "Earn every mastery star on one skill.",
    isEarned: (state) => state.masteredSkills >= 1,
  },
  {
    /*
     * RECOVERING FROM A BAD POSITION, which is worth more than a bigger number.
     *
     * A ruin standing is the worst the game can do to a city, and a ruined building stays
     * clickable on purpose (`ruinLessonAccess.test.tsx`) so its lesson is still open. This
     * marks the player who used that: kept going, with the wreckage still there.
     *
     * It is the one entry that cannot collide with the second crisis acknowledgement, and
     * the reason is structural rather than careful: that sentence fires when the island
     * carries NO damage, and this needs damage standing.
     */
    id: "learning-through-ruin",
    axis: "recovery",
    earned: "You kept learning with your city in ruins.",
    toEarn: "Finish a skill while a ruin is still standing.",
    isEarned: (state) => state.masteredSkills >= 1 && state.standingRuins >= 1,
  },
];

/* -------------------------------------------------------------------------- */
/* Per-achievement localStorage (earned once, remembered across sessions)     */
/* -------------------------------------------------------------------------- */

/**
 * **THE PERSISTENCE IS THE COACH-MARKS', NOT A NEW STORE.**
 *
 * `coachmarks/coachMarksCore.ts` already answers *"has this learner seen this once"* with
 * one key per id under a shared prefix, a `try`/`catch` around storage that degrades to
 * *"not yet"*, and a reset that walks the table. That is exactly this question, so this is
 * the same four functions over a different prefix rather than a second mechanism with its
 * own failure modes.
 *
 * ONE KEY PER ID and not one blob, for the reason that shape is worth having: adding a row
 * to {@link ACHIEVEMENTS} needs no migration, and a key nobody writes reads as unearned.
 */
const ACHIEVEMENT_KEY_PREFIX = "cr.achievement.";

/** localStorage key for one achievement. */
export function achievementKey(id: string): string {
  return `${ACHIEVEMENT_KEY_PREFIX}${id}`;
}

/** True once this achievement has been earned, in this session or any before it. */
export function hasEarnedAchievement(id: string): boolean {
  try {
    return runtimeStorage()?.getItem(achievementKey(id)) === "true";
  } catch {
    return false;
  }
}

/**
 * Remember that this achievement is earned, permanently.
 *
 * Write-once in effect as well as in intent: every predicate in the table is monotone over
 * state the city itself only ever advances, so nothing here has to defend against an
 * un-earn. A storage failure loses the record and nothing else, exactly as a coach-mark's
 * does: the learner is told again next time, which is a nicety lost rather than a bug.
 */
export function markAchievementEarned(id: string): void {
  try {
    runtimeStorage()?.setItem(achievementKey(id), "true");
  } catch {
    // Private mode, or storage disabled. Unremembered, not broken.
  }
}

/** Every achievement already earned. Read once when the surface mounts. */
export function loadEarnedAchievements(): Set<string> {
  const earned = new Set<string>();
  for (const achievement of ACHIEVEMENTS) {
    if (hasEarnedAchievement(achievement.id)) {
      earned.add(achievement.id);
    }
  }
  return earned;
}

/**
 * DEV: forget every achievement, so the whole set can be earned again.
 *
 * `resetCoachMarks`'s shape, and it walks the table rather than clearing by prefix, so a
 * key from a row somebody deleted is left alone instead of being quietly swept up.
 */
export function forgetAchievements(): void {
  try {
    const storage = runtimeStorage();
    for (const achievement of ACHIEVEMENTS) {
      storage?.removeItem(achievementKey(achievement.id));
    }
  } catch {
    // See markAchievementEarned.
  }
}

/* -------------------------------------------------------------------------- */
/* Selectors                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The achievements this state satisfies that are not yet recorded, in table order.
 *
 * A pure read over the two arguments, which is what lets the whole earning path be tested
 * without a surface: the caller records what comes back and shows it.
 *
 * `earned` is passed in rather than read from storage here so that this function has no
 * side effects at all and so the caller can hold the set it already loaded. It returns an
 * ARRAY because two achievements can genuinely come true on one tick (a repair that
 * finishes a skill, an era advance on a mastered city), and swallowing the second would be
 * a record with a hole in it.
 */
export function newlyEarnedAchievements(
  state: AchievementState,
  earned: ReadonlySet<string>,
): readonly AchievementDef[] {
  return ACHIEVEMENTS.filter(
    (achievement) => !earned.has(achievement.id) && achievement.isEarned(state),
  );
}

/**
 * How one row reads right now: its sentence, and whether it is a record or an invitation.
 *
 * The list renders these rather than choosing a string itself, so there is one place that
 * decides which of a row's two sentences a learner sees.
 */
export interface AchievementRow {
  readonly id: string;
  readonly earned: boolean;
  readonly line: string;
}

/** Every row, in table order, earned ones first so the record reads before the invitation. */
export function achievementRows(earned: ReadonlySet<string>): readonly AchievementRow[] {
  const rows = ACHIEVEMENTS.map((achievement) => ({
    id: achievement.id,
    earned: earned.has(achievement.id),
    line: earned.has(achievement.id) ? achievement.earned : achievement.toEarn,
  }));
  return [...rows.filter((row) => row.earned), ...rows.filter((row) => !row.earned)];
}

/**
 * Crisis runs an island has carried home, from its damage mint.
 *
 * The opening value comes from the engine's own constant rather than from a `1` typed here,
 * for the reason `milestones.ts` gives about the same number: the mint's floor is the
 * engine's to move.
 */
export function crisesRecordedFromMint(nextDamageId: number): number {
  return Math.max(0, nextDamageId - NO_CRISIS_DAMAGE.next_damage_id);
}
