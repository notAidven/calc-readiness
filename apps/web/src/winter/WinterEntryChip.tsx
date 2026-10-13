import type { ReactElement } from "react";

import { isDevPersistenceEnabled } from "../devPersistence/devSession";

/**
 * THE WAY INTO THE HARD WINTER FROM THE CITY, AND THE WAY BACK OUT — one module, because
 * they are one contract: {@link WINTER_QUERY_PARAM} is the only thing that distinguishes
 * the two addresses, and a rename that reached one direction and not the other would strand
 * whoever followed it.
 *
 * ## Why the way back exists at all
 *
 * The winter's outcome panel can now mark the real city (`scarLiveCity.ts`), and the line it
 * prints on success tells the player to *"go back to the island to repair them"*. That
 * sentence was an instruction with no control behind it: `?winter` replaces the whole app,
 * so the only way back was editing the address bar. {@link CityReturnChip} is that control.
 *
 * IT IS A FULL PAGE LOAD, and that is a feature rather than a cost — the trip out of the
 * winter re-reads the saved city from storage, so the ruins the player just carried back
 * are being restored rather than merely still held in memory. It lands on the TITLE screen
 * (`App.tsx` opens every normal entry there), so entering the city is one further click on
 * **Start**; the chip's hover says so rather than promising a destination it does not reach.
 *
 * ## Why a component rather than four lines of JSX in the menu
 *
 * `CitySurface.tsx` is Evan's, and the winter is ours. Putting the button here means his
 * file gains one import and one element, while the behaviour, the copy and the test that
 * covers them stay in the lane that owns them. If the winter is ever deleted this comes out
 * in one commit and leaves a single line behind.
 *
 * ## Why it navigates instead of swapping a component in
 *
 * `?winter` is already the app's own escape hatch for this surface (`App.tsx`, beside
 * `?dev` / `?three` / `?graph`), so navigating reuses the route that exists rather than
 * adding a second way in that would have to be kept in step. It also means the winter
 * mounts against a FRESHLY PERSISTED city: the dev session flushes any debounced save on
 * `pagehide`, so the snapshot the winter reads is the island as the player last left it,
 * not as it was when the city first mounted.
 *
 * IT ADDS NO WEIGHT TO THE CITY BUNDLE. This module imports React and the dev gate and
 * nothing else — not `HardWinterSurface`, not `@cr/game` — so the winter's chunk stays behind
 * `App.tsx`'s lazy import and the city still does not pay for a surface it is only linking to.
 * The gate is free here: `App.tsx` already imports `devPersistence/devSession`, so the module
 * is in the city's graph either way and this adds an existing binding rather than a chunk.
 *
 * ## WHY THE CHIP IS DEV ONLY (D-CRISIS-35)
 *
 * **The crisis is something the game gives you, and this was something you could pick off a
 * menu.** The team lead ruled on 2026-07-31 that a player who is given a crisis call and does
 * not enter it has their CITY FROZEN — no building, no roads, no purchases — while lessons and
 * practice carry on. The freeze is the pressure to engage, and an ungated entry chip dissolves
 * it: a player who can open the crisis whenever they like is never a player waiting on a call,
 * so the state the freeze exists to make uncomfortable stops being reachable. The chip is kept
 * rather than deleted because it is how the lead and QA reach the crisis at all, and a crisis
 * nobody can open is a crisis nobody reviews.
 *
 * ## WHICH GATE, AND WHY THIS ONE RATHER THAN THE OTHER PRECEDENT
 *
 * {@link isDevPersistenceEnabled} — `!isServerBacked(true)`, which is `VITE_DIAGNOSTIC_API_URL`
 * being unset. Two precedents in this repo disagree, so the choice is argued rather than
 * inherited:
 *
 *  - **`WinterDevSkip.tsx` uses this gate.** That control lives INSIDE the surface this chip
 *    opens, and it is the reason this one is not `import.meta.env.DEV`: two definitions of
 *    "dev" across one feature would come apart on a preview deployment, where the entry chip
 *    would be compiled away while the skip control behind it still rendered. One definition per
 *    feature, and the feature already has one.
 *  - **`audio/audioPrefs.ts` chose `import.meta.env.DEV` and rejected a `?dev` query
 *    parameter.** Its objection was to the QUERY PARAMETER — a bare flag ships to production
 *    and anyone can type it — and that objection is shared here rather than overruled: `?winter`
 *    is the local proof, a route whose own comment says *"DEV ONLY"* while `App.tsx` checks
 *    `has("winter")` with no environment test beside it, so it keeps nobody out. This chip
 *    copies neither the parameter nor the pretence.
 *
 * **What decides it between the two environment signals is who has to keep reaching the
 * crisis.** `import.meta.env.DEV` is replaced with the literal `false` by every `vite build`,
 * so it is false on a preview deployment exactly as it is on the product — gating the only
 * entry on it would confine the lead and QA to a local `vite dev` server. This gate is false
 * precisely when the SPA talks to the account service (`docs/Deployment.md` bakes
 * `VITE_DIAGNOSTIC_API_URL=/api/diagnostic` into the shipped build), so a preview build without
 * the endpoint keeps the chip and a learner's build cannot render it. That is the split the
 * ruling asked for.
 *
 * **And it answers on the first frame.** It asks `isServerBacked` with the STRONGEST auth
 * state, so it never waits for the Cognito identity to resolve. The alternative would be to
 * read the live auth state, which is null for the first frames of a real signed-in session
 * (`App.tsx` resolves the Cognito identity behind a lazy import) — and for an entry into a
 * modal crisis that is the one failure mode it cannot afford.
 *
 * This paragraph used to cite the Developer stand-in panel as the counter-example, because
 * that panel really did hang on the live auth state. **It no longer does.** Under the sign-in
 * ruling that gate withheld the panel from everybody, so those three props were re-keyed onto
 * this very gate — which makes the panel a PRECEDENT for the choice above rather than a foil
 * to it, and leaves this chip and the dev controls on one definition of "dev" for the whole
 * feature. See `city/devControlsAreNotAuthGated.test.tsx`.
 *
 * **There is deliberately NO OVERRIDE PROP on this component.** Its sibling in the winter takes
 * an optional flag that supersedes the gate, mirroring `devSessionStore`'s option of the same
 * name, and that prop needs a tracked-source sweep of its own to stop a mount from passing it
 * (`test/winterDevSkipStaysDev.test.ts`). Declining the prop costs nothing here and removes the
 * hazard outright: the gate is unroutable rather than merely defaulted. Both of its answers are
 * driven through the real environment in `winterEntryChipIsDevOnly.test.tsx` instead.
 */

/** The query parameter `App.tsx` watches for, kept next to the only code that sets it. */
export const WINTER_QUERY_PARAM = "winter";

/**
 * What the chip says when nobody tells it whose crisis this is: era-neutral, and therefore
 * true in every era. Never a named era — see the `crisis` prop for why.
 */
export const DEFAULT_CRISIS_PHRASE = "a mid-era crisis";

/** Whether one `a=b`-style query entry is the winter flag, in either of its two forms. */
function isWinterEntry(entry: string): boolean {
  return entry === WINTER_QUERY_PARAM || entry.startsWith(`${WINTER_QUERY_PARAM}=`);
}

/** The query entries of a URL, in order, with the empty string dropped. */
function queryEntries(url: URL): string[] {
  return url.search
    .replace(/^\?/, "")
    .split("&")
    .filter((entry) => entry.length > 0);
}

/**
 * The URL that opens the winter, preserving whatever else is on the address bar so a
 * `?mock` or `?reset` session is not silently dropped on the way in.
 *
 * The flag is written BARE (`?winter`, not `?winter=`) because `App.tsx` only asks
 * `has("winter")`, so the bare form is both correct and the one somebody would type by
 * hand. See {@link cityHref} for why the query is assembled from text rather than through
 * `searchParams` — the short version is that `searchParams.set` would have written
 * `?mock=` for a neighbour that arrived as `?mock`, and the round trip in and back out is
 * only the identity if neither direction rewrites what it is not addressing.
 */
export function winterHref(from: string): string {
  const url = new URL(from);
  const entries = queryEntries(url);
  const kept = entries.some(isWinterEntry)
    ? entries.map((entry) => (isWinterEntry(entry) ? WINTER_QUERY_PARAM : entry))
    : [...entries, WINTER_QUERY_PARAM];
  url.search = kept.join("&");
  return url.toString();
}

/**
 * The URL that leaves the winter, preserving whatever else is on the address bar for the
 * same reason {@link winterHref} does: a `?mock` or `?reset` session is the city the player
 * came from, and dropping it on the way out would return them to a different one.
 *
 * Dropping the flag is the whole of it — `App.tsx` reads `has("winter")` and nothing else,
 * so an address without it is the ordinary app.
 *
 * ## Why the query is edited as TEXT and not through `searchParams.delete`
 *
 * Because `delete` is not the only thing a round trip through `URLSearchParams` does:
 * serialising it back gives every bare flag an `=`, so `?mock&winter` would come out as
 * `?mock=`. Every reader in this app asks `has()`, so that URL still works — which is
 * exactly what makes it the kind of drift nothing catches, and it is why both directions
 * here filter ENTRIES: what a function is not addressing comes out byte-identical rather
 * than normalised. Assigning to `.search` writes the query verbatim, so the result is the
 * input minus one entry and nothing else.
 */
export function cityHref(from: string): string {
  const url = new URL(from);
  url.search = queryEntries(url)
    .filter((entry) => !isWinterEntry(entry))
    .join("&");
  return url.toString();
}

export function WinterEntryChip({
  className = "city-chip",
  onOpenInCity,
  crisis = DEFAULT_CRISIS_PHRASE,
}: {
  readonly className?: string;
  /**
   * WHOSE CRISIS THIS IS, as a noun phrase for the hover.
   *
   * The copy used to say *"era one's mid-era crisis"* outright. That is true today, would go
   * silently false the day a second era's land budget is authored, and already reads oddly to
   * a player standing in era three — so the caller derives it (`crisisEra.ts`) and this only
   * renders it. The default is era-neutral and true in every era, which is what keeps the
   * `?winter` route honest without giving this module the era registry: it imports React and
   * nothing else, and that is what keeps `@cr/game` out of the city's first chunk.
   */
  readonly crisis?: string;
  /**
   * Open the winter **without leaving the city** — the crisis falls on the island already on
   * screen, rather than on a screen of its own.
   *
   * That is the lead's ruling and the reason this became a button: `?winter` is a route, and a
   * route is a different place by construction. When it is supplied the chip stops navigating;
   * when it is not, the link above is unchanged, which is what keeps the `?winter` debugging
   * surface reachable by hand and its route test green.
   */
  readonly onOpenInCity?: () => void;
}): ReactElement | null {
  // BOTH FORMS, because they are one control with two presentations. Gating only the in-city
  // button would leave every other mount open, which is the drift this repo keeps catching:
  // the ☰ Menu would be closed and the navigating form would still be an unguarded door.
  if (!isDevPersistenceEnabled()) {
    return null;
  }
  if (onOpenInCity) {
    return (
      <button
        type="button"
        className={className}
        onClick={onOpenInCity}
        // The same promise the link makes, and deliberately the same shape: a winter writes
        // nothing UNLESS asked. The flat "nothing is written back" stopped being true when
        // the outcome panel gained its carry-back button, and it would be no truer here.
        title={`Play ${crisis} on this island. It changes nothing here unless you carry the damage back when it ends.`}
      >
        <span aria-hidden="true">{"\u2744"}</span> Hard Winter
      </button>
    );
  }
  return (
    <a
      className={className}
      href={winterHref(window.location.href)}
      // A real link, not a button: it goes to another page, so it should middle-click,
      // open in a new tab and show its destination on hover like one.
      //
      // The hover no longer says "nothing is written back", because that stopped being true
      // when the outcome panel gained its carry-back button: a winter writes nothing UNLESS
      // asked, which is a promise about the default rather than about the feature. Saying
      // the stronger thing would be the one sentence a player could be surprised by.
      title={`Play ${crisis} over a snapshot of this city. It changes nothing here unless you carry the damage back when it ends.`}
    >
      <span aria-hidden="true">{"\u2744"}</span> Hard Winter
    </a>
  );
}

/**
 * THE WAY BACK TO THE CITY, rendered inside the winter.
 *
 * Deliberately the same shape as {@link WinterEntryChip} — a real link, so it middle-clicks
 * and shows where it goes — and deliberately honest in its hover about the title screen
 * standing between here and the island.
 */
export function CityReturnChip({
  className = "hw-chip hw-chip--leave",
}: {
  readonly className?: string;
}): ReactElement {
  return (
    <a
      className={className}
      href={cityHref(window.location.href)}
      title="Leave the winter and reload your city from storage. The title screen comes first, so press Start to go back in."
    >
      <span aria-hidden="true">{"\u2190"}</span> Back to my city
    </a>
  );
}
