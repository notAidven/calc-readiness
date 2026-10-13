import type { ReactElement } from "react";

import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import { SUCCESSION_PARAM } from "./successionRoute";

export { isSuccessionEntry, SUCCESSION_PARAM } from "./successionRoute";

/**
 * **THE DOOR INTO THE REAL IN-CITY SUCCESSION.**
 *
 * The lead's requirement for this crisis was *"as testable and ready to iterate on since we
 * have a short timeline"*, and the first thing that costs is reachability: the crisis fires
 * after three of era four's five nodes, and a reviewer standing in era one cannot get to it at
 * all. The link opens the isolated `?succession` QA city; the button form opens the same crisis
 * over the Classical city already on screen.
 *
 * ## IT IMPORTS REACT AND THE DEV GATE, AND NOTHING ELSE
 *
 * That is the same property era one's chip keeps and it is load-bearing for the same reason:
 * the chip is reached from the city's STATIC import graph, so pulling `@cr/game` or the era
 * registry in here would put the whole crisis engine in the city's first chunk. The surface
 * behind the route is lazy; this is the handle, and a handle has to be cheap.
 *
 * ## THE GATE IS THE REPOSITORY'S
 *
 * {@link isDevPersistenceEnabled} — `VITE_DIAGNOSTIC_API_URL` unset, which is the product's own
 * definition of "this browser does not talk to the account service". On the deployed build this
 * renders nothing at all, so a learner cannot reach a dispute that decides an allegiance on a
 * board that is not their city.
 *
 * ## AND IT IS A LINK RATHER THAN A BUTTON
 *
 * The QA form goes to another page, so it should middle-click, open in a new tab and show its
 * destination on hover. The destination still mounts `CitySurface`, not the authored forum
 * fixture: the query parameter supplies a disposable real city and the crisis falls on it.
 */

/**
 * The URL that opens the dispute from wherever the player is standing.
 *
 * Every other entry parameter is dropped, so `?winter&succession` cannot ask for two crises at
 * once — which would resolve to whichever branch `App` happens to check first, and would look
 * like the chip opening the wrong one.
 */
export function successionHref(from: string): string {
  const url = new URL(from);
  const kept = [...url.searchParams.entries()].filter(
    ([key]) => key !== "winter" && key !== SUCCESSION_PARAM,
  );
  url.search = "";
  for (const [key, value] of kept) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set(SUCCESSION_PARAM, "");
  // `set` with an empty value writes `?succession=`; the bare form is what the chip's own href
  // test reads and what a reviewer types, so the trailing `=` is trimmed.
  return url.toString().replace(/([?&])succession=(?=&|$)/, "$1succession");
}

/** Return to the city that opened the dispute, preserving every unrelated query flag. */
export function successionCityHref(from: string): string {
  const url = new URL(from);
  const kept = [...url.searchParams.entries()].filter(([key]) => key !== SUCCESSION_PARAM);
  url.search = "";
  for (const [key, value] of kept) {
    url.searchParams.append(key, value);
  }
  return url.toString();
}

export function SuccessionEntryChip({
  className = "city-chip",
  unlocked = false,
  onOpenInCity,
}: {
  readonly className?: string;
  /** Production door; the server rechecks authoritative node completion before starting. */
  readonly unlocked?: boolean;
  /** Open over the city already on screen instead of navigating to the authored preview. */
  readonly onOpenInCity?: () => void;
} = {}): ReactElement | null {
  if (!isDevPersistenceEnabled() && !unlocked) {
    return null;
  }
  if (onOpenInCity) {
    return (
      <button
        type="button"
        className={className}
        data-testid="sx-entry-chip"
        onClick={onOpenInCity}
        title="Open the Succession on this city's placed buildings."
      >
        <span aria-hidden="true">{"\u2617"}</span> The Succession
      </button>
    );
  }
  return (
    <a
      className={className}
      data-testid="sx-entry-chip"
      href={successionHref(window.location.href)}
      title="Enter era four's Succession crisis. The server checks your progress before the battle starts."
    >
      <span aria-hidden="true">{"\u2617"}</span> The Succession
    </a>
  );
}
