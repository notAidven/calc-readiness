import type { ReactElement } from "react";

import { isDevPersistenceEnabled } from "../devPersistence/devSession";

/**
 * **THE TWO DEV HANDLES INTO THE INTRUSION, AND THE FIXTURE'S WAY BACK OUT.**
 *
 * The playable form is a button whose caller owns the in-city mount. The fixture form and its
 * return link share {@link INTRUSION_FIXTURE_QUERY_PARAM}; a rename reaching one direction and
 * not the other would strand whoever followed the fixture.
 *
 * `WinterEntryChip.tsx` is the precedent and its header argues every decision below at length.
 * Three of them are inherited without re-argument and are worth naming so a reader knows they
 * were considered rather than copied:
 *
 *  - **it is DEV ONLY (D-CRISIS-35).** A crisis is something the game gives you, and an ungated
 *    entry dissolves the pressure the unanswered-call freeze exists to create. The chip is kept
 *    rather than deleted because it is how the lead and QA reach the crisis at all, and a crisis
 *    nobody can open is a crisis nobody reviews;
 *  - **the gate is {@link isDevPersistenceEnabled}** — `VITE_DIAGNOSTIC_API_URL` being unset —
 *    and not `import.meta.env.DEV`, which every `vite build` replaces with `false` and which
 *    would therefore confine the lead to a local dev server. It answers on the first frame, so
 *    it cannot flash this control at a learner while an identity resolves;
 *  - **there is no override prop.** Its sibling in the winter takes one and needs a
 *    tracked-source sweep to stop a mount passing it. Declining it makes the gate unroutable
 *    rather than merely defaulted.
 *
 * **IT ADDS NO WEIGHT TO THE CITY BUNDLE.** React and the dev gate, and nothing else — not the
 * surface, not `@cr/game` — so the crisis stays behind `App.tsx`'s lazy import and the city does
 * not pay for a surface it is only linking to.
 *
 * ## THE TWO FORMS HAVE DIFFERENT NAMES BECAUSE THEY OPEN DIFFERENT SURFACES
 *
 * With `onOpenInCity`, this is the playable **The Intrusion** action. It stays on the current
 * island and opens the redesigned relay over real buildings. Without that callback it is the
 * standalone `?intrusion-fixture` page, retained as an **Intrusion fixture** for isolated review.
 * Calling both things "The Intrusion" crossed the menu dispatch in plain sight: the named
 * Intrusion link left the city while the reused Hard Winter button opened the live relay.
 * Distinct labels make that mistake visible before either control is pressed.
 */

/** The canonical learner/demo route. `App.tsx` opens it on the real Information Age city. */
export const INTRUSION_QUERY_PARAM = "intrusion";
/** The local-only standalone bench, deliberately absent from the demo route registry. */
export const INTRUSION_FIXTURE_QUERY_PARAM = "intrusion-fixture";

/** Whether one `a=b`-style query entry is a named bare flag, in either of its two forms. */
function isEntry(entry: string, param: string): boolean {
  return entry === param || entry.startsWith(`${param}=`);
}

/** The query entries of a URL, in order, with the empty string dropped. */
function queryEntries(url: URL): string[] {
  return url.search
    .replace(/^\?/, "")
    .split("&")
    .filter((entry) => entry.length > 0);
}

/**
 * The URL that opens the standalone fixture, preserving whatever else is on the address bar so
 * a `?mock` or `?reset` session is not silently dropped on the way in.
 *
 * The flag is written BARE, because `App.tsx` only asks whether the fixture parameter is present,
 * so the bare form is both correct and the one somebody would type by hand. The query is
 * assembled from TEXT rather than through `searchParams`, for the reason the winter's own pair
 * records: serialising a
 * `URLSearchParams` back gives every bare flag an `=`, so a neighbouring `?mock` would come out
 * as `?mock=` — still working, and exactly the kind of drift nothing catches. Filtering entries
 * means what a function is not addressing comes out byte-identical.
 */
export function intrusionHref(from: string): string {
  const url = new URL(from);
  const entries = queryEntries(url);
  const kept = entries.some((entry) => isEntry(entry, INTRUSION_FIXTURE_QUERY_PARAM))
    ? entries.map((entry) =>
        isEntry(entry, INTRUSION_FIXTURE_QUERY_PARAM)
          ? INTRUSION_FIXTURE_QUERY_PARAM
          : entry,
      )
    : [...entries, INTRUSION_FIXTURE_QUERY_PARAM];
  url.search = kept.join("&");
  return url.toString();
}

/** The URL that leaves either Intrusion door, dropping those entries and nothing else. */
export function cityHrefFromIntrusion(from: string): string {
  const url = new URL(from);
  url.search = queryEntries(url)
    .filter(
      (entry) =>
        !isEntry(entry, INTRUSION_QUERY_PARAM) &&
        !isEntry(entry, INTRUSION_FIXTURE_QUERY_PARAM),
    )
    .join("&");
  return url.toString();
}

export function IntrusionEntryChip({
  className = "city-chip",
  onOpenInCity,
}: {
  readonly className?: string;
  /** Open the redesigned crisis over the city already on screen. */
  readonly onOpenInCity?: () => void;
} = {}): ReactElement | null {
  if (!isDevPersistenceEnabled()) {
    return null;
  }
  if (onOpenInCity) {
    return (
      <button
        type="button"
        className={className}
        onClick={onOpenInCity}
        title="Play the Information Age's Intrusion over this city's real buildings."
      >
        <span aria-hidden="true">{"\u25A6"}</span> The Intrusion
      </button>
    );
  }
  return (
    <a
      className={className}
      href={intrusionHref(window.location.href)}
      title="Open the standalone Intrusion fixture. This is not the playable live-city crisis."
    >
      <span aria-hidden="true">{"\u25A6"}</span> Intrusion fixture
    </a>
  );
}

/**
 * The way back to the city, rendered inside the crisis.
 *
 * The same shape as the fixture form — a real link, so it middle-clicks and shows where it goes
 * — and honest in its hover about the title screen standing between here and the island.
 */
export function CityReturnFromIntrusion({
  className = "in9-chip",
}: {
  readonly className?: string;
} = {}): ReactElement {
  return (
    <a
      className={className}
      href={cityHrefFromIntrusion(window.location.href)}
      title="Leave the check and reload your city from storage. The title screen comes first, so press Start to go back in."
    >
      <span aria-hidden="true">{"\u2190"}</span> Back to my city
    </a>
  );
}
