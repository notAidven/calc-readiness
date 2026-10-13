import type { HardWinterState, WinterBuilding, WinterCellView } from "@cr/game";

/**
 * **WHICH BUILDINGS ARE SHIELDED, WHICH ARE ABOUT TO BE HIT, AND WHICH SHIELDS JUST BROKE.**
 *
 * Three pure readings off state the engine already publishes, kept here rather than inside
 * `WinterInCity`'s bridge so the crisis panel and the island's canvas answer the same three
 * questions with the same three functions. Nothing in this file re-derives a rule.
 *
 * ## THE THREAT IS READ OFF THE FRONT'S POSITION, NOT OFF ACCUMULATED DAMAGE
 *
 * "Threatened" means *the frost reaches this building when the round closes*. That is a fact
 * about where the front is, so it stays true whatever the damage tuning does — it does not
 * care how many points a bite is worth, how many a building has taken, or how many it takes
 * to ruin one. A reading built on damage would have to be revisited every time
 * `HARD_WINTER.damage` moved; this one does not.
 *
 * **AND IT IS THE BOARD'S OWN PREDICTION, NOT A SECOND ONE.** `hardWinterView` computes the
 * advance once, through `winterFrostAfterAdvance` — the same function `end_round` advances
 * with — and projects it per cell as `frozen` and `frost_next`. {@link winterThreatenedNodeIds}
 * reads those two flags and the `warded` flag beside them, which is exactly the condition
 * `closeRound` bites on (`frozen.has(key) && !warded.has(key)`, against the post-advance set).
 * A cell is in that post-advance set precisely when it is already `frozen` or the view marked
 * it `frost_next`, because `frost_next` is defined as *reached and not already frozen*. So the
 * badge on the island and the damage the reducer deals cannot disagree: there is one flood
 * fill in this codebase and neither of them runs a copy of it.
 *
 * A building standing on ground the frost ALREADY holds is threatened too, and that is not an
 * edge case — an unwarded building on frozen ground is bitten again every round it stands
 * there. Reading only the newly-taken ring would mark a building the round the frost arrived
 * and then quietly clear it while the building was being ground down.
 */

/**
 * Standing buildings carrying a shield.
 *
 * **BINARY, and the ruling behind that is worth restating where the set is built.** The engine
 * models reinforcement as a depleting integer — `HARD_WINTER.reinforce.shield_by_tier` grants
 * 2, 4 or 6 points and a cold round spends what it needs — and the island draws NO magnitude
 * for it. A building either wears the storm roof or it does not.
 *
 * `ended` empties it, which is the other ruling: **a shield does not persist after the
 * crisis.** A building that was reinforced and survived the winter goes back to its ordinary
 * look in the city, so this is gated on the phase rather than left to `WinterBuilding.shield`,
 * which the reducer has no reason to zero when the winter stops. The ground reverts through
 * `thaw.ts` for the same reason and on the same signal.
 */
export function winterShieldedNodeIds(
  buildings: readonly WinterBuilding[],
  ended: boolean,
): ReadonlySet<string> {
  const ids = new Set<string>();
  if (ended) {
    return ids;
  }
  for (const building of buildings) {
    if (building.state === "standing" && building.shield > 0) {
      ids.add(building.node_id);
    }
  }
  return ids;
}

/**
 * Standing buildings the frost reaches when this round closes — see the header.
 *
 * Read off the ROWS rather than off the building list, because the rows are what carry the
 * front's position, and read off the rows the board is actually publishing, which are the
 * THAWED ones once the winter has ended. So a finished winter threatens nothing without this
 * function needing to know the winter finished: `thawWinterRows` clears `frozen` and
 * `frost_next`, and the set comes back empty.
 */
export function winterThreatenedNodeIds(
  rows: readonly (readonly WinterCellView[])[],
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const line of rows) {
    for (const cell of line) {
      const building = cell.building;
      if (building?.state !== "standing") {
        continue;
      }
      if ((cell.frozen || cell.frost_next) && !cell.warded) {
        ids.add(building.node_id);
      }
    }
  }
  return ids;
}

/**
 * **SHIELDS THAT WERE SPENT TO NOTHING BETWEEN THESE TWO MOMENTS — the notification's source.**
 *
 * A shield that silently disappears mid-crisis reads as a bug rather than as a mechanic, and
 * the geometry is binary precisely so that it CAN disappear in one step. So the disappearance
 * is announced, and this is what it is announced from.
 *
 * **A building that was ruined in the same round is deliberately excluded.** It did not revert
 * to its ordinary look — it became a ruin — and the round's own report already says it was
 * lost. Reporting the shield as well would spend the player's attention on the smaller of two
 * facts about the same building.
 */
export function winterSpentShields(
  before: readonly WinterBuilding[],
  after: readonly WinterBuilding[],
): readonly string[] {
  const shieldBefore = new Map(before.map((b) => [b.node_id, b.shield] as const));
  const spent: string[] = [];
  for (const building of after) {
    const had = shieldBefore.get(building.node_id) ?? 0;
    if (had > 0 && building.shield <= 0 && building.state === "standing") {
      spent.push(building.node_id);
    }
  }
  return spent;
}

/**
 * **THE BUILDINGS THE ROUND JUST FROZE — what the notification announces.**
 *
 * The lead, having played it: *"there also needs to be some kind of notification/pop up when a
 * city is forzen so users know."* He means a building, and he is right that nothing said so: a
 * building could be lost between one frame and the next with the only record of it in a round log
 * the in-city mount hides, and at `ruin_at: 1` that is not a rare corner — any unabsorbed point of
 * frost takes a whole building, so a bad round can take several at once.
 *
 * **READ OFF THE ENGINE'S OWN LOG RATHER THAN DIFFED, which is the difference from
 * {@link winterSpentShields} one function up.** A spent shield is not a transition the reducer
 * records, so it has to be recovered by comparing two states. A ruin is: `closeRound` writes
 * `WinterRoundLog.ruined` for exactly the buildings it destroyed, in that round, and reading it
 * means the notice and the log cannot disagree about what was lost. It is also the reading that
 * survives a render the surface did not run — nothing here depends on holding the previous state.
 *
 * The LAST entry only, because the notice is about the round that just closed; the whole history
 * is `RoundLog`'s. Empty before the first round closes and empty on any round that lost nothing,
 * so the caller has nothing to gate on beyond the list being empty.
 */
export function winterFrozenThisRound(state: HardWinterState): readonly string[] {
  return state.log[state.log.length - 1]?.ruined ?? [];
}
