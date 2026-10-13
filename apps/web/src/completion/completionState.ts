import { runtimeStorage } from "../storage/runtimeStorage";

/**
 * WHETHER THE GAME-COMPLETION CEREMONY HAS ALREADY HAPPENED — a stored timestamp,
 * and nothing else.
 *
 * **D-END2** rules the ceremony fires ONCE per playthrough. Most of that
 * once-only-ness is structural rather than stored, and it is worth saying which
 * part is which so nobody later "simplifies" the wrong half:
 *
 * - **The RETAKE is once-only by construction.** Only two forms exist (`A`/`B`) and
 *   `counterbalancedForm` spends both on the pre/post pair, so a second retake
 *   would re-serve a form the learner has already seen and the comparability gate
 *   would return `not_comparable`. Nothing in this module enforces that and nothing
 *   should try to.
 * - **The CEREMONY needs a flag, because its trigger is re-enterable.** The advance
 *   ceremony is opened from `☰ Menu → Advance the age` and is deliberately ungated,
 *   so a learner standing in era ten can finish it as many times as they like. Its
 *   last beat is what hands over to the ending, so without a flag the ending fires
 *   every time. That is what this stores.
 *
 * The key is versioned (`.v1`) on `eraState.ts`'s precedent: if the stored shape
 * ever stops being a bare timestamp, the key moves rather than the reader learning
 * to parse two shapes.
 */

export const COMPLETION_CEREMONY_STORAGE_KEY = "cr.city.completion.v1";

/** The storage surface this module needs. `localStorage` satisfies it. */
export interface CompletionStateStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * `localStorage` when there is one. Absent under SSR and in a bare unit test, and
 * the module degrades to "the ceremony has not happened" rather than throwing — a
 * learner who is shown their ending twice has seen a bug; a learner whose city will
 * not load has seen a worse one.
 */
function defaultStorage(): CompletionStateStorage | null {
  return runtimeStorage();
}

/**
 * Whether this playthrough has already been through its ending.
 *
 * Reads truthy-presence rather than parsing the timestamp: the value is written for
 * a human reading their own storage, and a reader that parsed it would acquire an
 * opinion about a malformed one for no benefit.
 */
export function hasFinishedCompletionCeremony(
  storage: CompletionStateStorage | null = defaultStorage(),
): boolean {
  const raw = storage?.getItem(COMPLETION_CEREMONY_STORAGE_KEY);
  return typeof raw === "string" && raw.length > 0;
}

/**
 * Record that the ending has been seen through to its end.
 *
 * Called when the learner LEAVES the ceremony's final beat, not when the retake
 * finalizes: an ending closed halfway through is an ending the learner has not had,
 * and D-END9 makes leaving and returning ordinary rather than a forfeit.
 */
export function markCompletionCeremonyFinished(
  storage: CompletionStateStorage | null = defaultStorage(),
  now: () => Date = () => new Date(),
): void {
  storage?.setItem(COMPLETION_CEREMONY_STORAGE_KEY, now().toISOString());
}

/** Forget the ending, so it can be watched again. The dev control's reset. */
export function clearCompletionCeremony(
  storage: CompletionStateStorage | null = defaultStorage(),
): void {
  storage?.removeItem(COMPLETION_CEREMONY_STORAGE_KEY);
}
