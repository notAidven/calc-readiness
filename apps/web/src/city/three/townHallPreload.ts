import { useEffect } from "react";

import { townHallPreloadUrls } from "../townHall";

/**
 * Warm the showing Town Hall's stable URL family exactly once per URL change.
 *
 * The model descriptor itself is intentionally not a dependency: resting city stages resolve a
 * fresh descriptor on ordinary rerenders even when the showing GLB did not change.
 */
export function useTownHallPreload(
  modelUrl: string | null,
  preload: (url: string) => unknown,
): void {
  useEffect(() => {
    for (const url of townHallPreloadUrls(modelUrl)) {
      preload(url);
    }
  }, [modelUrl, preload]);
}
