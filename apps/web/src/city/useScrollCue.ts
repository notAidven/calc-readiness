import { useCallback, useEffect, useRef, useState } from "react";

/**
 * **WHETHER A SCROLLING BOX STILL HAS SOMETHING BELOW, so a surface can say so.**
 *
 * Three surfaces on the ordinary launch path cap their height and scroll the overflow, and all
 * three shipped silent about it: the account sheet, the launch sheet, and the build catalogue,
 * which hid 153px of its own cards at 1024x580 behind an overlay scrollbar Chromium does not
 * paint until something moves. A hidden overflow is not a smaller surface, it is a surface that
 * lies about how much of itself there is.
 *
 * The hook is deliberately a MEASUREMENT and not a cue: what to draw, and whether words or a
 * shape carry it, belongs to each surface. What is shared is the awkward part — that
 * `scrollHeight` changes for reasons no React render sees (a font landing, a lazy thumbnail
 * resolving, the window changing shape), so an effect that reads it once is wrong within a
 * frame of mounting.
 *
 * `false` on a box that does not scroll, and `false` again once the learner reaches the end, so
 * a cue built on this can never become furniture.
 */

/** Sub-pixel slack, so a box whose content rounds one pixel over never claims to scroll. */
const SLACK = 2;

export function useScrollCue<T extends HTMLElement>(): {
  /** Attach to the scrolling box. */
  readonly ref: (node: T | null) => void;
  /** True while there is content below the visible region. */
  readonly more: boolean;
} {
  const [more, setMore] = useState(false);
  const nodeRef = useRef<T | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const ref = useCallback((node: T | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    nodeRef.current = node;
    if (node === null) {
      setMore(false);
      return;
    }
    const measure = () => {
      setMore(node.scrollHeight - node.clientHeight - node.scrollTop > SLACK);
    };
    measure();
    node.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    // The content's own size moves without a scroll or a resize: a font lands, a lazy preview
    // resolves, a form grows an error line. Observe the box AND its children's box.
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(node);
    for (const child of node.children) {
      observer?.observe(child);
    }
    cleanupRef.current = () => {
      node.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => () => cleanupRef.current?.(), []);

  return { ref, more };
}
