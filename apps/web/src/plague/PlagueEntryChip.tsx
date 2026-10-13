import type { ReactElement } from "react";

import { isDevPersistenceEnabled } from "../devPersistence/devSession";

/**
 * **THE WAY INTO THE PLAGUE, AND THE WAY BACK OUT** — one module, because they are one contract:
 * {@link PLAGUE_QUERY_PARAM} is the only thing that separates the two addresses, and a rename
 * that reached one direction and not the other would strand whoever followed it.
 *
 * ## WHY THERE IS A DOOR AT ALL, AND WHY IT IS DEV ONLY (D-CRISIS-35)
 *
 * A crisis is something the game gives you. The lead ruled on 2026-07-31 that a player who is
 * given a crisis call and declines it has their CITY FROZEN while lessons carry on, and the freeze
 * is the pressure to engage — so an ungated entry dissolves it, because a player who can open the
 * crisis whenever they like is never a player waiting on a call. The chip exists anyway because it
 * is how the lead and QA reach the encounter at all, and a crisis nobody can open is a crisis
 * nobody reviews.
 *
 * ## WHICH GATE, AND IT IS THE FEATURE'S OWN RATHER THAN A THIRD ONE
 *
 * {@link isDevPersistenceEnabled} — `!isServerBacked(true)`, which is `VITE_DIAGNOSTIC_API_URL`
 * being unset. `WinterEntryChip` argues the choice at length against the two alternatives and the
 * argument is unchanged here, so it is cited rather than restated: `import.meta.env.DEV` is
 * compiled to `false` by every `vite build` and would confine a reviewer to a local dev server,
 * and a query parameter ships to production for anyone to type. What matters is that era six's
 * chip and era six's dev skip read the SAME definition of dev, because two definitions across one
 * feature come apart on a preview deployment — the chip compiled away while the control behind it
 * still renders.
 *
 * **There is deliberately no override prop.** Its sibling in the winter declined one for the same
 * reason: the gate is unroutable rather than merely defaulted, so no mount can pass a flag that
 * supersedes it, and both of its answers are driven through the real environment in
 * `plagueEntryChipIsDevOnly.test.tsx`.
 *
 * ## THE QUERY IS EDITED AS TEXT, AND THAT IS NOT FUSSINESS
 *
 * `WinterEntryChip` records the measurement this copies: a round trip through `URLSearchParams`
 * gives every bare flag an `=`, so `?mock&plague` would come back as `?mock=`. Every reader in
 * this app asks `has()`, so that URL still works — which is exactly what makes it the kind of
 * drift nothing catches. Both directions here filter ENTRIES, so whatever a function is not
 * addressing comes out byte-identical rather than normalised.
 *
 * The twenty lines below are a second copy of the winter's, and they stay a copy on purpose: the
 * winter's pair is exported from a file three agents are not editing, and lifting them into a
 * shared module would put a refactor of somebody else's surface inside a pass that is adding a new
 * one. If a third crisis needs a door, that is the moment to generalise.
 */

/** The query parameter `App.tsx` watches for, kept next to the only code that sets it. */
export const PLAGUE_QUERY_PARAM = "plague";

/** Whether one `a=b`-style query entry is the plague flag, in either of its two forms. */
function isPlagueEntry(entry: string): boolean {
  return entry === PLAGUE_QUERY_PARAM || entry.startsWith(`${PLAGUE_QUERY_PARAM}=`);
}

/** The query entries of a URL, in order, with the empty string dropped. */
function queryEntries(url: URL): string[] {
  return url.search
    .replace(/^\?/, "")
    .split("&")
    .filter((entry) => entry.length > 0);
}

/**
 * The URL that opens the Plague, preserving whatever else is on the address bar so a `?mock` or
 * `?reset` session is not silently dropped on the way in.
 *
 * The flag is written BARE (`?plague`, not `?plague=`) because `App.tsx` only asks `has("plague")`,
 * so the bare form is both correct and the one somebody would type by hand.
 */
export function plagueHref(from: string): string {
  const url = new URL(from);
  const entries = queryEntries(url);
  const kept = entries.some(isPlagueEntry)
    ? entries.map((entry) => (isPlagueEntry(entry) ? PLAGUE_QUERY_PARAM : entry))
    : [...entries, PLAGUE_QUERY_PARAM];
  url.search = kept.join("&");
  return url.toString();
}

/** The URL that leaves the Plague, preserving everything else for the same reason. */
export function cityHrefFromPlague(from: string): string {
  const url = new URL(from);
  url.search = queryEntries(url)
    .filter((entry) => !isPlagueEntry(entry))
    .join("&");
  return url.toString();
}

export function PlagueEntryChip({
  className = "city-chip",
  onOpenInCity,
}: {
  readonly className?: string;
  readonly onOpenInCity?: () => void;
}): ReactElement | null {
  if (!isDevPersistenceEnabled()) {
    return null;
  }
  if (onOpenInCity) {
    return (
      <button
        type="button"
        className={className}
        onClick={onOpenInCity}
        title="Open the three-round Care House crisis on this island."
        data-testid="pl-entry-chip"
      >
        <span aria-hidden="true">{"\u25CE"}</span> The Care House
      </button>
    );
  }
  return (
    <a
      className={className}
      href={plagueHref(window.location.href)}
      // A real link, not a button: it goes to another page, so it should middle-click, open in a
      // new tab and show its destination on hover like one.
      //
      // The hover promises nothing is written back, and unlike the winter's that promise has no
      // exception: era six is the only crisis of the ten that leaves no trace, there is no
      // carry-back button because there is nothing to carry, and `plagueDamage` is empty on every
      // reachable state.
      title="Play era six's three-round Care House crisis."
      data-testid="pl-entry-chip"
    >
      <span aria-hidden="true">{"\u25CE"}</span> The Care House
    </a>
  );
}

/**
 * THE WAY BACK TO THE CITY, rendered inside the crisis.
 *
 * Deliberately the same shape as {@link PlagueEntryChip} — a real link, so it middle-clicks and
 * shows where it goes — and deliberately honest in its hover about the title screen standing
 * between here and the island.
 */
export function CityReturnFromPlagueChip({
  className = "pl-care-return",
}: {
  readonly className?: string;
}): ReactElement {
  return (
    <a
      className={className}
      href={cityHrefFromPlague(window.location.href)}
      title="Leave the Care House. On this preview route, the title screen appears before the city."
    >
      <span aria-hidden="true">{"\u2190"}</span> Return to my city
    </a>
  );
}
