import { type CrisisDamage, isCrisisDamageClear, NO_CRISIS_DAMAGE } from "@cr/game";

/**
 * **TWO MILESTONE ACKNOWLEDGEMENTS, AND DELIBERATELY NO WAY TO COLLECT THEM.**
 *
 * The team lead overruled the badges third of SPOV 2 on 2026-08-01, in one narrow place:
 * *"overruling spov - short achievements like 'You defeated your first crisis!' literally
 * cant hurt"*. **Points and leaderboards are untouched and still refused.** The amendment
 * is in `docs/BrainLift_Game_Design.md` under SPOV 2, and §5 of
 * `docs/superpowers/specs/2026-08-01-game-feel-mechanics-backlog.md` is the design record
 * it points at. What is permitted is a one-off acknowledgement of a real in-game event the
 * player caused: one short line, shown once, where that event already announces itself.
 *
 * ## WHAT MAKES THIS NOT A POINT SYSTEM, and it is the constraint most easily broken
 *
 * BUILD 2 of the ranked research is *"one unifying progress currency (mastery), no
 * parallel point systems"*, and the way this feature goes wrong is not the copy. It is
 * somebody collecting the lines onto one screen: **the moment milestones share a surface
 * they are a set with a size, and a set with a size has a completion percentage whether
 * or not anybody renders one.** So four things are true of this module by construction,
 * and `milestones.test.ts` is the measurement of each:
 *
 *  1. **No aggregate view.** There is no page, drawer or list. Each line is handed to the
 *     one surface its own event already occupies, and no surface is handed two.
 *  2. **Nothing is counted.** No total, no tier, no rarity, and no number in the copy.
 *  3. **It is DERIVED, never accumulated.** There is no store, no earned-set, and no
 *     `milestones` array anywhere — including in here. Both predicates are pure reads
 *     over `CrisisDamage`, which the city already persists for the repair prices.
 *  4. **The once-only check is `hasEvent`-shaped, not a timestamp.** `next_damage_id` is
 *     the crisis damage's own monotone MINT, the same id a repair spend is already keyed
 *     by. Nothing here reads an instant, so `INV-ERA-3` holds structurally rather than by
 *     intention.
 *
 * Nothing reads a milestone back, either, which is what keeps `INV-COS-1` intact: a
 * milestone is a sentence, not an input, so it cannot gate a lesson, a mastery, a trial
 * or an era advance.
 *
 * ## The mint is the once-only key, and here is exactly what it can and cannot promise
 *
 * `NO_CRISIS_DAMAGE.next_damage_id` is 1 and `foldCrisisDamage` advances it on every
 * carry-back, forever, persisted. So *"this city has never carried a crisis"* is the mint
 * at its opening value, and *"this city has carried exactly one"* is one past it. A second
 * winter moves the mint and neither line can ever return.
 *
 * **THE HONEST LIMITATION**, stated rather than discovered: a winter that ruined nothing
 * and a winter the player never carried back both fold nothing, so they leave the mint
 * where it was (`scarLiveCity.ts` refuses `nothing_to_record` precisely so no mint is
 * burned on a flawless run). A learner who plays a spotless first winter and then a second
 * one is therefore told *"your first crisis"* twice. Closing that would need a durable row
 * for a crisis that damaged nothing, which is a new economy primitive rather than a
 * sentence, and the alternative — a stored flag — is the earned-set prohibition 3 exists
 * to refuse. The narrower promise is the one worth keeping.
 */

/** The mint an undamaged city starts on. Read from the engine, never typed here. */
const FIRST_DAMAGE_MINT = NO_CRISIS_DAMAGE.next_damage_id;

/**
 * The lead's own example, verbatim, exclamation mark included.
 *
 * It is the one line in the game that shouts and is not spoken by a character, and that
 * is his wording rather than a register choice made here.
 */
export const MILESTONE_FIRST_CRISIS = "You defeated your first crisis!";

/**
 * The recovery beat, which is a different beat from surviving.
 *
 * The player spent material putting every scar right, one repair at a time, and that is an
 * allocation choice they made rather than an outcome that happened to them.
 * `isCrisisDamageClear` has existed since the damage model landed and drove nothing.
 */
export const MILESTONE_CITY_RECOVERED = "Your city is back on its feet.";

/**
 * **THE FIRST CRISIS, acknowledged on the conclusion the encounter already renders.**
 *
 * `damage` is the CITY's standing crisis damage at the moment the crisis concludes, so
 * the question this answers is *"has a crisis ever reached this city before"* and not
 * *"how did this one go"*. That is what keeps the line unconditional: it cannot be missed,
 * because it does not read the outcome. A milestone that could be missed would be a
 * punishment wearing a reward's clothes, which is why the near-miss *"survived a crisis
 * without losing a building"* is rejected by name in §5.5.
 */
export function firstCrisisMilestone(damage: CrisisDamage): string | null {
  return damage.next_damage_id === FIRST_DAMAGE_MINT ? MILESTONE_FIRST_CRISIS : null;
}

/**
 * **THE CITY BACK ON ITS FEET, acknowledged on the repair that clears the last scar.**
 *
 * A TRANSITION and not a state, which is the difference between an event and a standing
 * fact: `before` must carry damage and `after` must carry none. A city that loads already
 * repaired has not just recovered, and a line for something that happened three sessions
 * ago is a false event — the same baseline discipline `CitySurface` already applies to the
 * skill-complete celebration and the crisis call.
 */
export function cityRecoveredMilestone(
  before: CrisisDamage,
  after: CrisisDamage,
): string | null {
  if (isCrisisDamageClear(before) || !isCrisisDamageClear(after)) {
    return null;
  }
  return after.next_damage_id === FIRST_DAMAGE_MINT + 1 ? MILESTONE_CITY_RECOVERED : null;
}
