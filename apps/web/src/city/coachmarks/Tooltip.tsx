import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { CoachAnchor, CoachMarkId } from "./coachMarksCore";
import { computePosition, type Position, placementFor } from "./tooltipPlacement";

/**
 * A single contextual coach-mark tooltip — a small, anchored, dismissible popover
 * `CoachMarks` renders for the current hint. It positions itself (fixed) against its
 * anchor element's rect, clamps fully inside the viewport (so a corner anchor like
 * the Build button never pushes it off-screen), and re-measures on resize/scroll so
 * it tracks the HUD. Its arrow keeps pointing at the anchor even after clamping. It
 * is an accessible, labelled `role="dialog"` with a focusable "Got it" dismiss and an
 * `Escape` shortcut; focus lands on the dismiss on open so it is immediately operable
 * + announced. Under reduced motion the entrance is skipped (via the
 * `data-reduced-motion` hook read in CSS).
 *
 * A second "Skip tips" action retires the whole hint layer. It sits AFTER the dismiss
 * in the tab order and is deliberately not what `Escape` does — a learner clearing one
 * hint out of the way must not silently turn the tutorial off.
 *
 * ⚑ `keepClear` IS WHY THE GEOMETRY LEFT THIS FILE. A hint over the HUD is a hint over
 * controls, and the first-use one covered up to 12,504px² of the camera toolbar and took
 * the press at the centre of five of its six buttons. `tooltipPlacement.ts` owns the
 * search for a spot that clears the rectangles the caller hands it and moves as little as
 * clearing them takes; this component only measures and paints.
 */

export function Tooltip({
  id,
  text,
  anchor,
  anchorEl,
  reducedMotion,
  keepClear,
  onDismiss,
  onSkipAll,
}: {
  /** The hint id (drives the test id + a CSS hook). */
  id: CoachMarkId;
  /** The hint copy (also the accessible label). */
  text: string;
  /** The anchor slot this hint resolved to (drives placement + the pointer side). */
  anchor: CoachAnchor;
  /** The live anchor element to glue to (null falls back to a safe corner). */
  anchorEl: HTMLElement | null;
  /** Skip the entrance animation when true. */
  reducedMotion: boolean;
  /**
   * Elements the hint may not sit on: live HUD controls that are not its anchor. Read at
   * measure time rather than as rectangles, because these move as the HUD reflows and the
   * hint re-measures on every resize and scroll.
   */
  keepClear?: readonly (HTMLElement | null)[];
  /** Dismiss (Got it / Escape) — the controller marks the hint seen. */
  onDismiss: () => void;
  /** Retire every hint — the controller sets the skip-all preference. */
  onSkipAll: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dismissRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<Position | null>(null);
  const textId = `coach-mark-${id}-text`;
  const placement = placementFor(anchor);

  /*
    WHATEVER HELD FOCUS THE INSTANT BEFORE THIS HINT MOUNTED, captured during render (so it
    runs before either effect below can move focus anywhere). A pointer click on "Got it" /
    "Skip tips" always focuses that button first — the browser does this on `mousedown`,
    unconditionally, regardless of whether the effect below ever stole anything — and once
    the button is removed on dismiss, a focused element leaving the DOM resets focus to
    `<body>`. A learner mid road-draft (or any other keyboard interaction the hint interrupts)
    would lose the viewport's focus to that reset even though this hint never "stole" it.
    Restoring on dismiss, below, is what a well-behaved transient popover owes its opener.
  */
  const previousFocusRef = useRef<Element | null>(null);
  const capturedPreviousFocusRef = useRef(false);
  if (!capturedPreviousFocusRef.current) {
    previousFocusRef.current = document.activeElement;
    capturedPreviousFocusRef.current = true;
  }

  const restorePreviousFocus = () => {
    const target = previousFocusRef.current;
    if (
      target instanceof HTMLElement &&
      target.isConnected &&
      target !== dismissRef.current
    ) {
      target.focus({ preventScroll: true });
    }
  };

  // Glue to the anchor's rect (clamped to the viewport), and keep tracking it as the
  // layout shifts. Runs in a layout effect so the measured position paints, not the
  // off-screen fallback. The tooltip remounts per hint (keyed by id upstream), so its
  // copy — and thus measured size — is constant for this instance's lifetime.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!anchorEl || !root) {
      setPos(null);
      return;
    }
    const zones = (keepClear ?? []).filter(
      (element): element is HTMLElement => element !== null,
    );
    let cancelled = false;
    const measure = () => {
      if (cancelled) {
        return;
      }
      const size = root.getBoundingClientRect();
      setPos(
        computePosition(
          anchorEl.getBoundingClientRect(),
          { width: size.width, height: size.height },
          { width: window.innerWidth, height: window.innerHeight },
          placement,
          zones.map((element) => element.getBoundingClientRect()),
        ),
      );
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    /*
      ⚑ RE-MEASURE WHEN THE THINGS IT IS AVOIDING MOVE, not only when the window does. The first
      measurement happens in a layout effect on mount, and the HUD is still settling then: a web
      font landing reflows the panels, and a hint that had already chosen a spot clear of the
      camera toolbar kept it after the toolbar had moved. It surfaced as 450px² of the toolbar
      covered at 200% text on one run and 0 on the next, which is the shape of a stale
      measurement rather than a geometry that does not work.
    */
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(root);
    observer?.observe(anchorEl);
    for (const element of zones) {
      observer?.observe(element);
    }
    void document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchorEl, keepClear, placement]);

  // Land focus on the dismiss so the hint is operable + announced on appear — but ONLY
  // when focus is parked (on the body, i.e. nowhere in particular), which is the case
  // in the moment this was designed for: the reel unmounts, or a popup closes, and the
  // hint is the next thing the learner meets. This is a non-modal popover, so it must
  // not YANK focus off a control the learner is deliberately on: closing How to play,
  // for instance, returns focus to the ☰ Menu button that opened it, and a hint
  // becoming current again in that same commit used to steal it straight back. When it
  // declines focus the hint is still visible and one Tab away.
  useEffect(() => {
    const active = document.activeElement;
    const parked = active === null || active === document.body;
    if (parked || rootRef.current?.contains(active)) {
      dismissRef.current?.focus();
    }
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      event.preventDefault();
      restorePreviousFocus();
      onDismiss();
    }
  };

  // Until measured, park off-screen (a layout effect positions it before paint).
  const style = pos
    ? { position: "fixed" as const, left: pos.left, top: pos.top }
    : { position: "fixed" as const, left: -9999, top: 0 };

  return (
    <div
      ref={rootRef}
      className="coach-mark"
      role="dialog"
      aria-modal="false"
      aria-labelledby={textId}
      data-coach-mark={id}
      data-anchor={anchor}
      data-placement={pos?.placement ?? placement}
      data-reduced-motion={reducedMotion}
      data-testid={`coach-mark-${id}`}
      style={style}
      onKeyDown={handleKeyDown}
    >
      <span
        className="coach-mark__pointer"
        data-anchor={anchor}
        aria-hidden="true"
        style={pos ? { left: pos.pointerLeft } : undefined}
      />
      <p className="coach-mark__text" id={textId}>
        {text}
      </p>
      <div className="coach-mark__actions">
        <button
          type="button"
          className="city-action city-action-ghost coach-mark__dismiss"
          ref={dismissRef}
          onClick={() => {
            restorePreviousFocus();
            onDismiss();
          }}
        >
          Got it
        </button>
        <button
          type="button"
          className="coach-mark__skip"
          data-testid={`coach-mark-${id}-skip`}
          onClick={() => {
            restorePreviousFocus();
            onSkipAll();
          }}
        >
          Skip tips
        </button>
      </div>
    </div>
  );
}
