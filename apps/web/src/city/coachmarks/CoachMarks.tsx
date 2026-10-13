import type { EraId } from "@cr/skill-graph";
import { type RefObject, useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  coachAnchorsVersion,
  resolveCoachAnchor,
  subscribeCoachAnchors,
} from "./coachAnchorRegistry";
import {
  type CoachAnchor,
  type CoachMarkId,
  type CoachState,
  loadSeenCoachMarks,
  markCoachMarkSeen,
  nextCoachMark,
  skipAllCoachMarks,
} from "./coachMarksCore";
import { Tooltip } from "./Tooltip";

/**
 * The contextual coach-marks controller `CitySurface` mounts over the live HUD. It
 * reads the derived `CoachState`, computes the current hint (the first relevant,
 * unseen one), and renders a single anchored `Tooltip` for it. Each hint shows once:
 * it is remembered when the learner DISMISSES it OR when they complete its action and
 * a later hint takes over (the superseded hint is marked seen so it never nags).
 * Seen state persists per-hint in localStorage, so each appears at most once ever.
 *
 * "Skip tips" on any hint retires the whole layer at once — the escape hatch that
 * makes a growing hint list safe, since a learner who does not want to be taught
 * spends one click and is never interrupted again. How to play hands it back.
 *
 * `active` gates the whole thing to LIVE play — while the demo reel (or any takeover
 * overlay) is up, `active` is false and no hint shows; when the reel hands off,
 * `active` flips true and the first relevant hint (normally "place", over the Build
 * button on the empty island) appears. This is how the reel "kicks off" the marks.
 *
 * Remounting the controller re-reads localStorage, which is how How to play's "Show
 * tips again" takes effect immediately (`CitySurface` keys it on a reset token).
 */
export function CoachMarks({
  active,
  eraId,
  reducedMotion,
  state,
  anchors,
}: {
  /** Only surface hints during live play (false during the reel / any overlay). */
  active: boolean;
  /**
   * The era the city is standing in. Passed rather than read from the store so a hint
   * names the same material the surface behind it is charging in — `CitySurface` takes
   * an `eraId` prop that overrides the live era, and a hint reading the store directly
   * would say era one's word over an era-five island.
   */
  eraId: EraId;
  /** Skip the tooltip entrance animation when true. */
  reducedMotion: boolean;
  /** The derived live game state the hints read. */
  state: CoachState;
  /**
   * The HUD elements each anchor slot resolves to. Partial: slots absent here are
   * looked up in the anchor registry, which is how hints reach controls mounted
   * outside `CitySurface` (see `coachAnchorRegistry`).
   */
  anchors: Partial<Record<CoachAnchor, RefObject<HTMLElement | null>>>;
}) {
  const [seen, setSeen] = useState<Set<CoachMarkId>>(() => loadSeenCoachMarks());

  // Re-render when a registry-backed anchor mounts or unmounts, so a hint pointing at
  // a sibling HUD control finds it even if that control mounted after this did.
  useSyncExternalStore(subscribeCoachAnchors, coachAnchorsVersion, coachAnchorsVersion);

  const current = active ? nextCoachMark(state, seen) : null;

  // Remember a hint once we advance PAST it (the learner did its action, so a later
  // hint — or none — is now current). Combined with explicit dismiss, this makes
  // every hint show at most once without nagging when its moment returns.
  const prevIdRef = useRef<CoachMarkId | null>(null);
  useEffect(() => {
    const currentId = current?.id ?? null;
    const prevId = prevIdRef.current;
    if (prevId && prevId !== currentId && !seen.has(prevId)) {
      markCoachMarkSeen(prevId);
      setSeen((current) => {
        const next = new Set(current);
        next.add(prevId);
        return next;
      });
    }
    prevIdRef.current = currentId;
  }, [current, seen]);

  if (!current) {
    return null;
  }

  // Resolve the anchor element: a ref passed in by `CitySurface` wins, then the
  // registry, then the hint's fallback slot (e.g. the "interleaved" hint points at the
  // roster's Civic Center row, which only exists while the roster is open, and falls
  // back to the Buildings disclosure that opens it). The first two steps are shared with
  // the onboarding spotlight so the two cannot land on different elements.
  const resolve = (name: CoachAnchor): HTMLElement | null =>
    resolveCoachAnchor(anchors, name);

  const primaryEl = resolve(current.anchor);
  const useFallback = !primaryEl && current.fallbackAnchor !== undefined;
  const anchorName = useFallback ? (current.fallbackAnchor as CoachAnchor) : current.anchor;
  const anchorEl = useFallback ? resolve(current.fallbackAnchor as CoachAnchor) : primaryEl;

  const dismiss = () => {
    markCoachMarkSeen(current.id);
    setSeen((prev) => {
      const next = new Set(prev);
      next.add(current.id);
      return next;
    });
  };

  const skipAll = () => {
    skipAllCoachMarks();
    setSeen(loadSeenCoachMarks());
  };

  /*
    THE CONTROLS A HINT MAY NOT SIT ON, which is not the same set as the anchors it points at.

    The camera toolbar is the one that shipped covered: the first-use hint anchors above the Build
    button, the toolbar sits between the two, and it lost up to 12,504px² of itself and the press
    at the centre of five of its six buttons. It is read through the same registry the anchors
    resolve through, so a hint and its keep-off list cannot disagree about which element is which.

    THE ANCHOR IS IN THE LIST TOO, which is not a contradiction: a hint sits BESIDE the thing it
    is about, never on top of it, and the first spot the search found once the toolbar was excluded
    was 12px under the toolbar and 6,065px² over the Build button. For the `viewport` anchor —
    where the anchor is the whole map — every candidate covers it equally, so the preferred
    position wins on having moved nothing, which is the behaviour that surface already had.
  */
  const keepClear = [resolve("camera"), anchorEl];

  return (
    <Tooltip
      key={current.id}
      id={current.id}
      text={current.text(eraId)}
      anchor={anchorName}
      anchorEl={anchorEl}
      reducedMotion={reducedMotion}
      keepClear={keepClear}
      onDismiss={dismiss}
      onSkipAll={skipAll}
    />
  );
}
