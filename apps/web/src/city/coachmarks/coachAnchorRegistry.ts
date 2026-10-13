/**
 * A tiny registry that lets any component volunteer itself as a coach-mark anchor.
 *
 * WHY THIS EXISTS. `CoachMarks` is mounted by `CitySurface` and resolves most of its
 * anchors from refs `CitySurface` owns (the Build button, the Buildings disclosure,
 * the viewport, the open callout). Two of the newer hints point at controls
 * `CitySurface` cannot see, because `App` mounts them as its SIBLINGS: the economy
 * HUD's material stat (`EconomyHud`) and the Sound chip (`AudioSettings`, which sits at
 * shell level so it stays reachable during a lesson). Threading refs up through `App`
 * and back down into `CitySurface` would have put tutorial plumbing in the signature of
 * two components that have nothing to do with the tutorial, so each control registers
 * itself instead:
 *
 *     <div ref={useCoachAnchor("economy")} …>
 *
 * It was three until the 2026-08-03 sunset took the Shop chip and its `shop` anchor.
 *
 * It is a `useSyncExternalStore` source, so a hint whose anchor mounts after the
 * controller has rendered still finds it (the store's version bumps and `CoachMarks`
 * re-renders). Refs passed in by `CitySurface` still win, so the original four
 * anchors — and the tests that pass them — are untouched.
 */

import { type RefObject, useCallback } from "react";

import type { CoachAnchor } from "./coachMarksCore";

const elements = new Map<CoachAnchor, HTMLElement>();
const listeners = new Set<() => void>();

/**
 * Bumped on every register/unregister. `useSyncExternalStore` needs a snapshot that
 * is `Object.is`-stable between notifications, so a counter is the whole store — the
 * elements themselves are read imperatively during render, which is safe because a
 * change to the map is always accompanied by a bump.
 */
let version = 0;

function notify(): void {
  version += 1;
  for (const listener of listeners) {
    listener();
  }
}

/** Register (or, with `null`, unregister) the element an anchor slot points at. */
export function setCoachAnchor(name: CoachAnchor, element: HTMLElement | null): void {
  if (element === null) {
    if (elements.delete(name)) {
      notify();
    }
    return;
  }
  if (elements.get(name) === element) {
    return;
  }
  elements.set(name, element);
  notify();
}

/** The element registered for an anchor slot, if one is mounted. */
export function getCoachAnchor(name: CoachAnchor): HTMLElement | null {
  return elements.get(name) ?? null;
}

/** Subscribe to registry changes (the `useSyncExternalStore` subscribe function). */
export function subscribeCoachAnchors(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The registry's snapshot: a version counter that changes when the map does. */
export function coachAnchorsVersion(): number {
  return version;
}

/** Drop every registration (test hygiene between renders of different trees). */
export function clearCoachAnchors(): void {
  if (elements.size === 0) {
    return;
  }
  elements.clear();
  notify();
}

/**
 * THE ONE RESOLUTION ORDER, for every surface that anchors itself to a HUD control.
 *
 * A ref the host passed in wins, then the registry. There are two consumers now — the
 * contextual hints and the onboarding spotlight — and both have to land on the same element
 * or the tutorial rings one control while the tooltip points at another. It was `CoachMarks`'s
 * own three-line closure until the spotlight needed it; a second copy of those three lines is
 * how the two would drift apart.
 *
 * `anchors` is partial on purpose: slots absent from it are the ones whose control is a
 * sibling of the host rather than its child, and those register themselves.
 */
export function resolveCoachAnchor(
  anchors: Partial<Record<CoachAnchor, RefObject<HTMLElement | null>>>,
  name: CoachAnchor,
): HTMLElement | null {
  return anchors[name]?.current ?? getCoachAnchor(name);
}

/**
 * A `ref` callback that registers this element as a coach-mark anchor for as long as
 * it is mounted. Stable per `name`, so React only calls it on mount/unmount.
 */
export function useCoachAnchor(name: CoachAnchor) {
  return useCallback(
    (element: HTMLElement | null) => {
      setCoachAnchor(name, element);
    },
    [name],
  );
}
