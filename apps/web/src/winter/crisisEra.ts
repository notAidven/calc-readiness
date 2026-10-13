import { ERA_SEQUENCE, type EraId, getEra } from "@cr/skill-graph";

import { CURRENT_ERA_ID } from "../city/eraDressing";

/**
 * **WHICH ERA'S CRISIS THE HARD WINTER CAN ACTUALLY PLAY, and why it is not always the live
 * one.**
 *
 * Every `hardWinterIsland` call site passed the era-one constant `CURRENT_ERA_ID`. That was
 * harmless while the island never re-dressed and stops being harmless the moment it does: the
 * ground under the crisis now follows the era the city is standing in, so a crisis that is
 * still era one's while the ground is not is a mismatch a player can see.
 *
 * ## ⚑ THE BLOCKER MOVED, and this module was written against the half that has gone
 *
 * It used to be the LAND. `hardWinterIsland(eraId)` opens with `eraBuildableRadius(eraId)`,
 * which threw for nine of the ten eras because only era one's land budget was authored, so
 * swapping the constant for the live era did not make the crisis era-aware, it made the crisis
 * **crash** in every era but the first.
 *
 * **All ten land budgets are authored now** (D-ERA25 in `packages/skill-graph/src/eras.ts`),
 * so `hardWinterIsland` builds a real island for every era and the land no longer discriminates
 * at all. That did NOT make the crisis playable in ten eras, and reading it that way would have
 * repointed the encounter at nine eras with nothing to ask: the winter's questions are
 * `D1_PRACTICE_ITEMS` (`hardWinterItems.ts`), which is **era one's item pool**, and the board's
 * roster and tuning are era one's too.
 *
 * So the condition is a CONJUNCTION and always was; land was simply the half that bound first.
 * {@link canPlayCrisisIn} states both halves, and the half that still binds is
 * {@link CRISIS_CONTENT_ERAS}. Scoping the question to land would now be a guard measuring
 * something that has stopped varying.
 *
 * ## What this module is
 *
 * The pin, made **explicit, derived and self-reporting** instead of nine bare references to a
 * constant. {@link resolveCrisisEra} answers *which era's crisis this is, and is that the era
 * the city is standing in* — so:
 *
 *  - the surface can say whose crisis the player is about to play rather than asserting era
 *    one's in copy that will quietly go wrong;
 *  - the day a later era's winter content lands, the crisis follows the city with no further
 *    change here;
 *  - and a reader looking for *why is the crisis era one's* finds the reason at the call site.
 *
 * **It deliberately does not fall back silently.** Naming a fallback is the house pattern for
 * exactly this: `resolveEraTownHall` names its fallback and `islandGround` names its
 * unauthored dressing, and a crisis quietly playing era one's board under era three's ground is
 * the same
 * defect those two were written against.
 */

/**
 * THE ERAS WHOSE WINTER EXISTS AS CONTENT: an item pool to draw questions from, a roster and
 * a tuned board.
 *
 * One entry, and it is `CURRENT_ERA_ID` rather than the literal `"prehistoric"`, because that
 * is the era `HardWinterSurface` pins its item pool and roster to. This is the list
 * `crisisCall.ts` used to keep separately under the same reasoning; it is here because this is
 * the module that answers *whose crisis is this*, and two lists of the same fact can drift.
 *
 * **It is the half of the condition that binds**, now that every era's land is authored.
 * `crisisEra.test.ts` derives the same set from the winter's real item pool and fails if the
 * two disagree, so a second era's items landing is a red test rather than a silent gap.
 */
export const CRISIS_CONTENT_ERAS: readonly EraId[] = [CURRENT_ERA_ID];

/** Whether an era's winter exists as content, whatever its ground looks like. */
export function hasCrisisContentFor(eraId: EraId): boolean {
  return CRISIS_CONTENT_ERAS.includes(eraId);
}

/**
 * Whether the winter can be played in an era: it needs **ground** (an authored land budget,
 * D-ERA25) and **content** ({@link CRISIS_CONTENT_ERAS}). Both halves are read rather than one,
 * because the land half stopped varying when all ten budgets were authored and a condition that
 * silently reduces to `true` is worse than no condition.
 */
export function canPlayCrisisIn(eraId: EraId): boolean {
  return getEra(eraId)?.land.status === "authored" && hasCrisisContentFor(eraId);
}

/**
 * Every era whose crisis can be played today, in sequence order.
 *
 * DERIVED from `ERA_SEQUENCE` rather than written down, so it grows by itself when the
 * remaining half of the condition is satisfied for a later era. Era one only at this tip.
 */
export function crisisPlayableEras(): readonly EraId[] {
  return ERA_SEQUENCE.filter((era) => canPlayCrisisIn(era.id)).map((era) => era.id);
}

/** The era whose crisis is on offer, and whether that is the era the city is standing in. */
export interface ResolvedCrisisEra {
  /** The era the board is actually built from. Always one with an authored land budget. */
  readonly eraId: EraId;
  /** The era the city is standing in, which the copy has to be honest about. */
  readonly liveEraId: EraId;
  /**
   * `"live"`: this era's own winter is playable, so the crisis is the city's own age.
   * `"pinned"`: the live era has no winter of its own, so the board is the earliest playable
   *   era's and a surface must say whose crisis it is rather than implying it is this one's.
   */
  readonly board: "live" | "pinned";
}

/**
 * The crisis the city can play right now.
 *
 * Fails loud if NOTHING is playable, following `landBudgetRadius`'s own discipline: an empty
 * playable set means no era has both ground and content, and returning some era anyway would
 * hand the surface an era it cannot draw a question for, which is a failure one frame further
 * from its cause.
 */
export function resolveCrisisEra(liveEraId: EraId): ResolvedCrisisEra {
  if (canPlayCrisisIn(liveEraId)) {
    return { eraId: liveEraId, liveEraId, board: "live" };
  }
  const fallback = crisisPlayableEras()[0];
  if (fallback === undefined) {
    throw new Error(
      "No era has both an authored land budget and a winter of its own, so there is no " +
        "mid-era crisis to walk into at all. Ground is D-ERA25 in eras.ts; content is " +
        "CRISIS_CONTENT_ERAS here.",
    );
  }
  return { eraId: fallback, liveEraId, board: "pinned" };
}

/**
 * How the crisis names itself to a player, given the era the city is standing in.
 *
 * The copy that shipped said *"Play era one's mid-era crisis on this island"* — a sentence that
 * is true today, would silently become false the moment a second era's land was authored, and
 * already reads oddly to a player standing in era three. This derives it, so the promise and
 * the board can never disagree.
 *
 * Takes the era NAME from the caller rather than reading the registry, so the entry chip keeps
 * its one property: it imports React and nothing else, which is what keeps `@cr/game` and the
 * era registry out of the city's first chunk.
 */
export function describeCrisisEra(
  resolved: ResolvedCrisisEra,
  boardEraName: string,
): string {
  return resolved.board === "live"
    ? "this age's mid-era crisis"
    : `the ${boardEraName}'s mid-era crisis, which is the only age whose winter is built`;
}
