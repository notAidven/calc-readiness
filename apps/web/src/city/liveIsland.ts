import { archipelagoEnabled } from "../archipelago/archipelagoFlag";
import { eraIslandLandRadius, eraLandRadius } from "./islandLand";
import { cityEraId } from "./useCityEra";
import { buildableRadiusForLand } from "./worldLayout";

/** The standing island's authored grass radius. Unlock exams never mutate this surface. */
export function liveIslandRadius(): number {
  const eraId = cityEraId();
  return archipelagoEnabled() ? eraIslandLandRadius(eraId) : eraLandRadius(eraId);
}

/** The one buildable-disc reading used by layout writes outside React. */
export function liveBuildableRadius(): number {
  return buildableRadiusForLand(liveIslandRadius());
}
