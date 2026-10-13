import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";

import {
  coachAnchorsVersion,
  resolveCoachAnchor,
  subscribeCoachAnchors,
} from "../coachmarks/coachAnchorRegistry";
import type { CoachAnchor } from "../coachmarks/coachMarksCore";

import "./onboardingSpotlight.css";

/**
 * **THE RING ROUND THE CONTROL THE ADVISOR IS TALKING ABOUT.**
 *
 * The product lead, reviewing the intro: *"whenever a concept is mentioned, highlight the
 * corresponding control."* A moment names its control in
 * `onboardingScript.ts`'s `spotlight` field and this draws the ring on the live HUD while
 * that moment is up.
 *
 * ## ⚑ IT IS NOT A SECOND ANCHOR LAYER, and that was the first thing to check
 *
 * The brief said a spotlight mechanism may already exist. What exists is
 * `coachmarks/coachAnchorRegistry.ts` — a `useSyncExternalStore` source that lets any control
 * volunteer itself under a `CoachAnchor` name — plus `Tooltip.tsx`, which measures an anchor's
 * rect and glues a popover to it. **The registry is exactly the half worth reusing and the
 * tooltip is not**: a tooltip is a chip of text beside a control and what is wanted here is
 * the control itself standing out from what is around it. So this shares the registry, shares
 * `resolveCoachAnchor` with `CoachMarks` so the two can never land on different elements, and
 * draws something a tooltip does not.
 *
 * ## THE OCCLUSION PROBLEM, WHICH IS THE WHOLE REASON THIS IS MORE THAN A `box-shadow`
 *
 * The advisor is a full-screen `position: fixed` layer at `z-index: 30` with a bubble
 * `min(900px, 100%)` wide across the bottom, and the HUD is `z-index: 5`. Measured on the
 * frames in `docs/design-refs/onboarding-advisor/` at 1024x580 before this landed: the bubble
 * runs to about x=924 and **clips the Build pill's leading edge**. A ring painted over a
 * control that is itself behind the bubble is a ring round a speech bubble.
 *
 * So lighting a control up is two things, and the second is the load-bearing one:
 *
 *  1. **The ring**, a fixed overlay at the anchor's rect, above the stage, `aria-hidden` and
 *     `pointer-events: none` so it changes nothing about what is reachable.
 *  2. **The lift.** The anchor's nearest `.hud` ancestor is given `data-spotlit="true"`, and
 *     `onboardingSpotlight.css` raises that panel above the stage for as long as the moment
 *     lasts. `.hud` is the right handle rather than the control itself: `.hud` is
 *     `position: absolute; z-index: 5`, which makes it a stacking context, so a child of it
 *     cannot be raised past the stage no matter what z-index it is given.
 *
 * The attribute is written imperatively because the element belongs to `CitySurface` and
 * `EconomyHud`, which have no reason to know a tutorial exists. It is an attribute React does
 * not control on those nodes, and the cleanup removes it, so the two cannot fight over it.
 *
 * ## ⚑ THE LIFT NORMALLY TAKES THE CONTROL'S CLICKS AWAY, AND ONE MOMENT NEEDS THEM BACK
 *
 * Raising a panel past an `aria-modal` dialogue would otherwise hand its buttons back every
 * press the dialogue is supposed to be holding, so `onboardingSpotlight.css` puts
 * `pointer-events: none` on a lifted panel's children. That is right on nine moments and
 * exactly wrong on the tenth: the placement moment stands the stage DOWN and asks the learner
 * to go and open the Build menu, so a ring that made the Build pill unclickable would be the
 * tutorial pointing at a control it had just disabled.
 *
 * {@link OnboardingSpotlight.handsBackClicks} is that case, and it is written as a different
 * ATTRIBUTE VALUE rather than a second attribute so the two states cannot both be set: the
 * panel carries `data-spotlit="live"` instead of `"true"`, the lift and the dimming key off
 * the attribute's presence, and only the pointer rule keys off `"true"`.
 *
 * ## `prefers-reduced-motion`
 *
 * The ring's breathing pulse is CSS animation and nothing else, so the media query stands it
 * down and what is left is a static ring that is exactly as visible. The `reducedMotion` prop
 * does the same job for a caller that has resolved the preference in JS, and both are applied,
 * because the app's own preference hook and the OS query can disagree in a test harness.
 */
export function OnboardingSpotlight({
  anchor,
  anchors,
  reducedMotion,
  handsBackClicks = false,
}: {
  /** The control to light up, or null on a moment with nothing on screen to point at. */
  readonly anchor: CoachAnchor | null;
  /**
   * Leave the lit control CLICKABLE. See the header: true on the one moment whose stage has
   * stood down, false everywhere else, where the dialogue is modal and the lift must not
   * quietly reopen the city underneath it.
   */
  readonly handsBackClicks?: boolean;
  /**
   * The HUD elements the host already holds refs to. Partial: a slot missing here is looked
   * up in the anchor registry, which is how this reaches controls mounted outside
   * `CitySurface`. Empty by default, so the advisor still mounts in a test that has no HUD.
   */
  readonly anchors: Partial<Record<CoachAnchor, RefObject<HTMLElement | null>>>;
  /** Skip the pulse when the caller has already resolved the preference. */
  readonly reducedMotion: boolean;
}) {
  // Re-render when a registry-backed anchor mounts or unmounts, so a spotlight pointing at a
  // sibling HUD control finds it even if that control mounted after this did.
  useSyncExternalStore(subscribeCoachAnchors, coachAnchorsVersion, coachAnchorsVersion);
  const [box, setBox] = useState<Box | null>(null);

  const target = anchor === null ? null : resolveCoachAnchor(anchors, anchor);

  /*
    THE LIFT. A layout effect rather than an ordinary one, so the panel is already above the
    stage on the frame the ring paints on: with a passive effect the two land in different
    frames and the control flashes from behind the bubble to in front of it.

    The cleanup is unconditional and runs on every change of target, which is what makes
    walking the sequence leave nothing behind: moment six lifts the stockpile, moment seven
    puts it back and lifts the population row.
  */
  useLayoutEffect(() => {
    const panel = target?.closest<HTMLElement>(".hud") ?? null;
    const lift = handsBackClicks ? "live" : "true";
    panel?.setAttribute("data-spotlit", lift);
    target?.setAttribute("data-spotlit", lift);
    return () => {
      panel?.removeAttribute("data-spotlit");
      target?.removeAttribute("data-spotlit");
    };
  }, [target, handsBackClicks]);

  /*
    THE RECT, re-measured on resize and on any scroll in the page, exactly as `Tooltip` does:
    the HUD is `position: absolute` inside a viewport that can be resized under it, and a ring
    that measured once would sit where the control used to be.
  */
  useLayoutEffect(() => {
    if (!target) {
      setBox(null);
      return;
    }
    const measure = () => setBox(clampToViewport(target.getBoundingClientRect()));
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [target]);

  /*
    AND ONE RE-MEASURE AFTER PAINT. The bubble's own content decides how much room the HUD
    has on a short window, and the moment's copy changes with the moment, so the first
    measurement can be taken against a layout that is one frame stale.
  */
  useEffect(() => {
    if (!target) {
      return;
    }
    const raf = requestAnimationFrame(() =>
      setBox(clampToViewport(target.getBoundingClientRect())),
    );
    return () => cancelAnimationFrame(raf);
  }, [target]);

  if (anchor === null || box === null) {
    return null;
  }

  return (
    <div
      className="ob-spotlight"
      // DECORATION, TWICE OVER. The moment's own sentence names the control in words, so a
      // reader who never sees the ring loses nothing; and the ring must not intercept a
      // click aimed at the control it is drawn over.
      aria-hidden="true"
      data-anchor={anchor}
      data-reduced-motion={reducedMotion}
      data-testid="onboarding-spotlight"
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
    />
  );
}

interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** How far outside the control the ring sits, so the control is framed rather than covered. */
const HALO = 6;

/**
 * The anchor's rect, grown by the halo and clipped to the window.
 *
 * The clip is not tidiness: the bottom dock sits flush against the bottom edge, so an
 * un-clipped halo puts the ring's lower stroke off-screen and the control reads as underlined
 * rather than as ringed. A control scrolled entirely out of view collapses to a zero box,
 * which draws nothing.
 */
function clampToViewport(rect: DOMRect): Box {
  const left = Math.max(0, rect.left - HALO);
  const top = Math.max(0, rect.top - HALO);
  const right = Math.min(window.innerWidth, rect.right + HALO);
  const bottom = Math.min(window.innerHeight, rect.bottom + HALO);
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}
