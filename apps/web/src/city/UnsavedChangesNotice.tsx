import { useSyncExternalStore } from "react";

import type { ApiCitySession } from "./apiCitySession";

/**
 * **THE LEARNER IS TOLD WHEN THEIR CITY IS NOT SAVED.**
 *
 * `apiCitySession` swallowed a failed `POST /api/city` and named the gap in its own
 * words: *"If the POST fails and the learner does nothing else before closing the tab,
 * that last gesture is lost. There is no surface for it yet."* This is that surface, and
 * it stopped being hypothetical the day `POST /api/city` turned out never to have been
 * routed at the edge — every save failed, for everyone, and the only thing between that
 * and a learner rebuilding their island was a notice nobody had built.
 *
 * ## What it is, and what it deliberately is not
 *
 * It REPORTS; it does not repair. The retry is still the existing one — the whole city is
 * re-sent on the next gesture, and `pagehide` flushes what is queued — and this renders
 * the state that mechanism is in. A retry queue would be a second mechanism arguing with
 * the first, and a "Retry" button here would offer a learner mid-lesson a decision they
 * have no way to evaluate. So the notice says the true thing and names the one action
 * that always works: keep the tab open, and make another change.
 *
 * ## Why it is persistent rather than a toast
 *
 * The failure it describes persists. A toast that fades leaves a learner who looked away
 * in exactly the state this exists to prevent — believing the city is safe. It stays up
 * until a save lands, which (because every save carries the whole city) clears the debt of
 * every failed one at once.
 *
 * ## Announced, not just drawn
 *
 * `role="status"` with `aria-live="polite"` so it reaches a screen reader when it appears
 * without interrupting a lesson, and the state is carried by WORDS rather than by the
 * amber alone. It renders nothing at all in the ordinary case, so it costs an empty
 * subscription and no layout on the happy path.
 */
export function UnsavedChangesNotice({ session }: { session: ApiCitySession | null }) {
  const unsaved = useSyncExternalStore(
    // A null session (the dev island, `?mock`, a signed-out visitor) has no server to fail
    // against. Subscribing to nothing keeps the hook order stable rather than making the
    // call conditional.
    session ? session.subscribeUnsaved : noSubscription,
    session ? session.hasUnsavedChanges : never,
    never,
  );

  if (!unsaved) {
    return null;
  }

  return (
    <div className="unsaved-notice" role="status" aria-live="polite">
      <span className="unsaved-notice-title">Changes not saved</span>
      <span className="unsaved-notice-detail">
        We could not reach the server. Keep this tab open. Your next change tries again, and
        one save that goes through restores your whole city.
      </span>
    </div>
  );
}

const never = () => false;
const noSubscription = () => () => {};
