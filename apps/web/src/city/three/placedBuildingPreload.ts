import { useEffect, useRef } from "react";

import { nodeModelPreloadUrls } from "../buildingAssets";
import type { BuildStage } from "../palette";

/**
 * Resolve the URLs one placed thing can still need.
 *
 * Skill buildings use the stage-aware registry suffix. A bought civic has no skill-registry
 * entry and one already-resolved built URL, so that active descriptor is its complete set.
 */
export function placedBuildingPreloadUrls(
  nodeId: string,
  stage: BuildStage,
  activeUrl: string | null,
): readonly string[] {
  const skillUrls = nodeModelPreloadUrls(nodeId, stage);
  return skillUrls.length > 0 ? skillUrls : activeUrl === null ? [] : [activeUrl];
}

/**
 * Warm each reachable URL once during this placement's mounted lifetime.
 *
 * The fixed URL slots are primitive dependencies: fresh model descriptors and ordinary
 * rerenders do not retrigger the effect. The set additionally prevents a forward transition
 * from asking for construction/built a second time after the site stage already warmed them.
 */
export function usePlacedBuildingPreload(
  nodeId: string,
  stage: BuildStage,
  activeUrl: string | null,
  preload: (url: string) => unknown,
): void {
  const [first = null, second = null, third = null] = placedBuildingPreloadUrls(
    nodeId,
    stage,
    activeUrl,
  );
  const warmed = useRef(new Set<string>());

  useEffect(() => {
    for (const url of [first, second, third]) {
      if (url !== null && !warmed.current.has(url)) {
        warmed.current.add(url);
        preload(url);
      }
    }
  }, [first, second, third, preload]);
}
