import { useEffect, useSyncExternalStore } from "react";

/**
 * **WHETHER A MODAL SURFACE CURRENTLY OWNS THE SCREEN, so the app-wide chrome can stand down.**
 *
 * `AccountBoundary` fixes a *Signed in / Sign out* pill to the top centre of every authenticated
 * surface at `z-index: 95`. The diagnostic takeover is `z-index: 30` and `aria-modal="true"`, so
 * the pill painted OVER a modal dialog, sat inside its focus order, and took a press. Signing out
 * mid-diagnostic was the one action on that surface nobody offered and everybody could reach.
 *
 * ## Why a store rather than a prop or a DOM sniff
 *
 * The boundary is ABOVE the app in the tree — it renders the city as `children` — so the fact it
 * needs travels the wrong way for a prop, and threading it would put an auth concern through
 * every component in between. A DOM sniff for `[aria-modal="true"]` would be a second,
 * out-of-band definition of "a takeover is open" that no test could hold to the first. So the
 * surface that opens the takeover declares it, the same way `city/coachmarks/coachAnchorRegistry`
 * lets a control volunteer itself to a sibling that cannot reach it.
 *
 * ## Why it counts rather than flags
 *
 * Two takeovers can overlap for a frame during a swap, and a boolean set by the first unmount
 * would hand the chrome back over a screen the second still owns. A depth cannot get that wrong.
 */

let depth = 0;
const listeners = new Set<() => void>();

function announce(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): boolean {
  return depth > 0;
}

/** True while at least one modal surface has declared itself. */
export function useScreenTakeover(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Declare that this component's surface owns the screen for as long as it is mounted.
 *
 * Called unconditionally from a component that only mounts while its takeover is open, so the
 * claim is released by unmounting and cannot be left set by an early return.
 */
export function useDeclareScreenTakeover(): void {
  useEffect(() => {
    depth += 1;
    announce();
    return () => {
      depth -= 1;
      announce();
    };
  }, []);
}
