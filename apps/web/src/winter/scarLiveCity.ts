import {
  type CrisisDamageReport,
  foldCrisisDamage,
  type HardWinterState,
  hardWinterDamage,
  NO_CRISIS_DAMAGE,
} from "@cr/game";

import type { CityDevSnapshot } from "../city/citySession";
import { devSessionStore } from "../devPersistence/devSession";

/**
 * **THE ONE WRITE — and it is OPT-IN, at the surface, on a button nobody has to press.**
 *
 * ## What was true before this file, and still is by default
 *
 * The winter is a sandbox. The engine is a pure reducer with no session handle, no economy
 * write and no mastery write; `loadLiveCityLayout` only reads; and
 * `liveCitySandbox.test.tsx` plays a whole winter to ruin over a saved city and compares the
 * stored blob BYTE FOR BYTE before and after. That test is the reason someone will open this
 * feature at all — the lead previews the Hard Winter against a snapshot of his real city
 * precisely because it cannot hurt it — so making damage durable had to leave it standing
 * rather than rewrite it.
 *
 * It does. That test's winter is played with the scar switch OFF, which is the default state
 * of the mount, and it still asserts byte-identity; the single line it gained is an assertion
 * that the switch was off, so the promise it makes is now *"a winter does not touch your city
 * unless you asked it to"* rather than the weaker *"nothing here can write"*. The paired test
 * (`liveCityScar.test.tsx`) turns the switch on over the same fixture and asserts the blob
 * DID move, which is what stops the byte-identity assertion from passing for the wrong reason
 * once a write path exists at all.
 *
 * ## Why the opt-in lives here and not in the engine
 *
 * Because a reducer that could write is a reducer nobody can reason about. `hardWinterDamage`
 * is a PROJECTION of engine state — pure, no I/O — and this module is the only thing in the
 * feature that touches storage. So the engine stays testable by folding events, the sandbox
 * stays a property of the mount rather than of the rules, and the whole of "a crisis can now
 * hurt your city" is one function with one call site.
 *
 * ## ⚑ THE STORAGE WRITE IS THE FALLBACK NOW, NOT THE PATH
 *
 * The lead, twice: *"also carry this damage back to my city still doesnt work; buildings arent
 * affected and still look the same"*. He was right and the write was correct — it went to the
 * blob rather than to the CITY. `App.tsx` builds one `CityDevSession` on its first render and
 * `CitySurface` draws ruins from `session.load()`, so a snapshot written straight to
 * `localStorage` behind that session's back reaches nothing on screen until a full reload, and
 * is then overwritten by the session's own next `capture()`. Measured end to end in
 * `apps/web/src/city/carryBackReachesTheIsland.test.tsx`: *"storage carries 7 ruins and the
 * live session carries none"*.
 *
 * So the write is now a {@link ScarCommit} the HOST supplies, and the in-city mount supplies
 * one that goes through `CityDevSession.recordCrisisDamage` — the session the island is drawn
 * from, whichever of the two it is. {@link scarIntoSavedCity} is the default and is what
 * `?winter` still gets: that route is opened cold with no city session anywhere, so storage
 * is genuinely the only city it can see.
 *
 * ## No clock, because this file is swept for one
 *
 * `test/hardWinterClockless.test.ts` sweeps every non-test source in `apps/web/src/winter`,
 * so nothing here may read `Date.now`, construct a bare `new Date`, or use a timer. The
 * `saved_at` stamp on the blob is written by `devSessionStore`, which is outside the swept
 * tree and is where the app's other stamps already come from.
 */

/** Why a winter could not be written back, in words the surface can show. */
export type ScarRefusal =
  | "not_your_city"
  | "winter_unfinished"
  | "no_saved_city"
  | "nothing_to_record";

export type ScarResult =
  | {
      readonly status: "recorded";
      /** How many buildings and cells the city now carries as damage FROM THIS WINTER. */
      readonly buildings: number;
      readonly cells: number;
    }
  | { readonly status: "refused"; readonly reason: ScarRefusal };

/**
 * Fold one winter's damage into a saved city snapshot. Pure — the caller supplies the
 * snapshot and stores the result, so the merge is testable without a browser.
 *
 * A snapshot with no `crisis_damage` (every city saved before this feature) folds onto
 * {@link NO_CRISIS_DAMAGE}, which mints `d1` for this winter.
 */
export function snapshotWithWinterDamage(
  snapshot: CityDevSnapshot,
  report: CrisisDamageReport,
): CityDevSnapshot {
  return {
    ...snapshot,
    crisis_damage: foldCrisisDamage(snapshot.crisis_damage ?? NO_CRISIS_DAMAGE, report),
  };
}

/**
 * **HOW ONE HOST COMMITS A WINTER'S DAMAGE TO THE CITY IT OWNS.**
 *
 * Returns a refusal, or `null` when the damage landed. A refusal is returned rather than
 * thrown because "there is no city to write to" is a state the player can be told about and
 * act on, not an error.
 *
 * Two implementations ship. {@link scarIntoSavedCity} is the default and writes the saved
 * blob directly, which is right for `?winter` and wrong everywhere a city session exists;
 * `CitySurface` supplies one that goes through `CityDevSession.recordCrisisDamage`, so the
 * island redraws on the same state the write landed in.
 */
export type ScarCommit = (report: CrisisDamageReport) => Promise<ScarRefusal | null>;

/**
 * The default commit: fold the run into the SAVED BLOB and land it now.
 *
 * `no_saved_city` is this commit's own refusal and no other's — there is nothing in storage
 * to write to (it may have been cleared between the mount and the button), and writing would
 * MINT a city out of a crisis. A host that hands over a live session cannot be in that state,
 * which is why the reason belongs here rather than in {@link scarLiveCity}.
 *
 * `flush()` follows the save because the store debounces by 250ms and this is a durability
 * promise made at the moment the button is pressed: the player is about to navigate back to
 * their city, and a debounce window is a window for a closing tab to fall into.
 */
export const scarIntoSavedCity: ScarCommit = (report) => {
  const snapshot = devSessionStore.load();
  if (snapshot === null) {
    return Promise.resolve<ScarRefusal>("no_saved_city");
  }
  devSessionStore.save(snapshotWithWinterDamage(snapshot, report));
  devSessionStore.flush();
  return Promise.resolve(null);
};

/**
 * Write this winter's damage into the player's city — the opt-in half of the feature.
 *
 * Refuses rather than guesses, in four cases, each of which would otherwise scar a city over
 * something that did not happen to it:
 *
 *  - `not_your_city` — the winter fell on one of the AUTHORED layouts. Those boards exist to
 *    measure a tuning number across a range of cities; their ruins belong to `spread` and
 *    `packed`, not to the island the player built. This is checked by the caller passing
 *    `isLiveBoard`, because only the surface knows which board it dealt.
 *  - `winter_unfinished` — the encounter has not ended. Damage mid-winter is not damage yet:
 *    a building at one cold round is not ruined, and a ring given up in round one may be the
 *    reason five buildings survive.
 *  - `nothing_to_record` — a flawless winter. Nothing is written at all, so a clean run
 *    leaves the city exactly as it was; there is no empty damage record and no mint burned.
 *  - whatever `commit` refuses — `no_saved_city` from the storage default, and nothing at all
 *    from a live session, which always has a city to write to.
 *
 * The three checks above run BEFORE the commit is called, so a host's writer never sees a
 * report it should not have been handed.
 */
export async function scarLiveCity(
  winter: HardWinterState,
  isLiveBoard: boolean,
  commit: ScarCommit = scarIntoSavedCity,
): Promise<ScarResult> {
  if (!isLiveBoard) {
    return { status: "refused", reason: "not_your_city" };
  }
  if (winter.phase !== "ended") {
    return { status: "refused", reason: "winter_unfinished" };
  }

  const report = hardWinterDamage(winter);
  if (report.buildings.length === 0 && report.cells.length === 0) {
    return { status: "refused", reason: "nothing_to_record" };
  }

  const refusal = await commit(report);
  if (refusal !== null) {
    return { status: "refused", reason: refusal };
  }

  return {
    status: "recorded",
    buildings: report.buildings.length,
    cells: report.cells.length,
  };
}

/** How a refusal reads on screen. */
export const SCAR_REFUSAL_MESSAGE: Readonly<Record<ScarRefusal, string>> = {
  not_your_city:
    "This winter fell on an authored board, not on your city. Switch to Your city and " +
    "play a winter over it before this can leave a mark.",
  winter_unfinished:
    "Play the winter to the end first. Nothing is ruined until it is over.",
  no_saved_city:
    "Build something on the island first. This browser has no saved city to mark yet.",
  nothing_to_record:
    "Your settlement came through whole, so there is nothing to carry back. " +
    "Your city is exactly as you left it.",
};
