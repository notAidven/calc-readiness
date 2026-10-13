/**
 * **A CUE THAT SAYS THE BOX SCROLLS, FOR THE TWO BOXES IN A LESSON THAT DO.**
 *
 * ## The defect
 *
 * Both of the lesson's scrollers can end on a clean edge with content still below it, and a
 * clean edge is exactly what a finished box looks like. Measured on the learner's own mount
 * at 1024x580 (`scrollAffordanceMeasure.browser.test.tsx`):
 *
 *  - Every one of the 53 packs whose slide 0 has a worked example overflows the 411px well,
 *    and on 15 of them, across seven domains, the fold lands within 12px BELOW the foot of
 *    the last whole step with no step straddling it. The card presents a tidy bottom edge and
 *    hides two to three steps behind it.
 *  - 49 of the 62 slide-0 lectures, across all TEN domains, overflow the short-screen bubble
 *    cap, hiding 53 to 134px of the advisor's line.
 *
 * ## Why this is a rendered element and not a scrollbar
 *
 * `catchUp.css` reaches for the scrollbar — *"THE SCROLLBAR IS THE AFFORDANCE, and it is
 * visible on purpose"* — and that was the first thing tried here. It cannot be used, and the
 * reason is measurable rather than aesthetic. In this tree's browser harness an overflowing
 * scroller consumes **0px** of layout width, and `scrollbar-width: thin` and `scrollbar-color`
 * each leave it at 0px: headless Chromium paints no scrollbar at all, so a scrollbar cue can
 * neither be photographed nor asserted here. The one declaration that does bite,
 * `scrollbar-gutter: stable`, reserves **15px** (10px alongside `thin`) whether or not the box
 * overflows — and `CITY_PHONE` is a MEASURED 330.8px that some 29 files depend on, so paying
 * that would rewrap the phone reading column, which is the failure #654 already shipped once.
 *
 * A rendered element costs no width, paints in every browser, and can be asserted on the
 * behaviour rather than on the declaration: it is present with content below and gone at the
 * bottom of the scroll, which is a claim an always-on decoration cannot satisfy.
 *
 * ## It is out of flow on purpose
 *
 * Both anchors are `position: relative` already, and the cue is absolutely positioned inside
 * them, so it cannot move a button, wrap a control row, or take a pixel from a reading column.
 * That is what lets `lessonScrollAffordance.browser.test.tsx` assert the reading widths are
 * untouched at both viewports rather than re-deriving them.
 */

import { type ReactNode, type RefObject, useCallback, useEffect, useState } from "react";

/**
 * Sub-pixel slack. A box scrolled to its end can report a fraction of a pixel left, and a cue
 * that says "more below" at the bottom of the scroll is worse than no cue: it is the one state
 * this element exists to tell apart.
 *
 * Two, not one, and the extra pixel is not padding. `scrollHeight` and `clientHeight` are
 * ROUNDED integers while `scrollTop` is fractional, so a box at its true end can report close
 * to a whole pixel of rounding noise — which put the old value of 1 exactly on the boundary of
 * the error it exists to absorb. Nothing is lost at 2: the smallest thing worth announcing is
 * a line of text, some 24px.
 *
 * Exported because `lessonScrollAffordance.browser.test.tsx` splits its population on the same
 * threshold. If the two ever disagreed, a scroller hiding a pixel and a half would be counted
 * as capped by the guard and left uncued by this hook, and the guard would fail over nothing.
 */
export const AT_THE_END_PX = 2;

/**
 * Whether `resolve(host)` has content below what it is currently showing.
 *
 * Re-subscribed on every render rather than pinned to a dependency list, because the thing
 * being watched changes underneath this component in two ways a list cannot see: the lesson
 * swaps the section (lecture to example to activity) so the scroller's content is replaced,
 * and KaTeX lays out asynchronously so the same content changes height after it mounts. The
 * `ResizeObserver` covers the second; re-running covers the first, and re-reads the children
 * so a swapped subtree is the one being observed. It settles rather than looping: the effect
 * only ever writes a boolean, and writing the same boolean does not re-render.
 */
export function useHasMoreBelow(
  hostRef: RefObject<HTMLElement | null>,
  resolve: (host: HTMLElement) => HTMLElement | null,
): boolean {
  const [more, setMore] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) {
      return;
    }
    const scroller = resolve(host);
    if (scroller === null) {
      // A surface that does not scroll this content — the `?dev` frame lifts the card's cap,
      // and the reading surface has no card at all — owes no cue.
      setMore(false);
      return;
    }
    const read = () => {
      const left = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
      setMore(left > AT_THE_END_PX);
    };
    read();
    scroller.addEventListener("scroll", read, { passive: true });
    // Optional, because jsdom does not implement it: `civicPurchaseSfx.test.tsx` records the
    // same gap and stubs whole components around it, which is not available to the advisor
    // itself. Nothing is lost there — an environment with no layout reports no heights, so
    // there is never anything below a fold to announce.
    const sizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(read);
    if (sizes !== null) {
      sizes.observe(scroller);
      for (const child of Array.from(scroller.children)) {
        sizes.observe(child);
      }
    }
    return () => {
      scroller.removeEventListener("scroll", read);
      sizes?.disconnect();
    };
  });

  return more;
}

/** The scroller a control row inside the lesson well belongs to. */
export const wellAround = (host: HTMLElement): HTMLElement | null =>
  host.closest<HTMLElement>(".coc-card__body");

/** The scrolling half of the advisor bubble: the words, held apart from the tail. */
export const saidInside = (host: HTMLElement): HTMLElement | null =>
  host.querySelector<HTMLElement>(".advisor-npc__said");

/**
 * The cue itself.
 *
 * `aria-hidden`, because it is a fix for a VISUAL failure and nothing else: a screen reader
 * is given the whole scroller's text whatever the fold does to it, so announcing this would be
 * announcing a problem that reader does not have.
 */
export function ScrollMoreCue({ where }: { where: "well" | "bubble" }): ReactNode {
  return (
    <span className={`scroll-more-cue scroll-more-cue--${where}`} aria-hidden="true">
      <span className="scroll-more-cue__mark" />
      More below
    </span>
  );
}

/** `useHasMoreBelow` bound to the well, for the one caller that sits inside a control row. */
export function useMoreBelowInWell(hostRef: RefObject<HTMLElement | null>): boolean {
  return useHasMoreBelow(hostRef, useCallback(wellAround, []));
}

/** `useHasMoreBelow` bound to the advisor's own scrolling words. */
export function useMoreBelowInBubble(hostRef: RefObject<HTMLElement | null>): boolean {
  return useHasMoreBelow(hostRef, useCallback(saidInside, []));
}
