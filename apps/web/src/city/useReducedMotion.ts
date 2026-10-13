import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/** Safe read that tolerates environments without `matchMedia` (e.g. jsdom). */
function readPreference(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(QUERY).matches;
}

/**
 * Tracks `prefers-reduced-motion`. The scene skips weather, construction, and
 * reward animation when this is true, applying state changes instantly (design §9).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(readPreference);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);

    setReduced(media.matches);
    media.addEventListener("change", onChange);

    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
