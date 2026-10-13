import { type SuccessionDistrictPlan, successionDistrictsForRoster } from "@cr/game";

import { placementLabel } from "../city/townHall";
import type { PlacedTransform } from "../city/worldLayout";

export type SuccessionCityPlacementKind = "skill" | "town_hall" | "civic";
export const SUCCESSION_CITY_OVERVIEW = "succession-city-overview";

export interface SuccessionCityBinding {
  readonly district: SuccessionDistrictPlan;
  readonly placement: PlacedTransform;
  readonly kind: SuccessionCityPlacementKind;
}

export interface SuccessionCityRoster {
  readonly districts: readonly SuccessionDistrictPlan[];
  readonly bindings: readonly SuccessionCityBinding[];
}

/**
 * Bind engine wards to the stable placement identities already owned by the city session.
 *
 * Ordering is delegated to the engine's identity-only roster adapter. Transforms stay here,
 * beside the renderer, and moving a building never changes which ward it represents.
 */
export function successionCityRoster(input: {
  readonly placements: readonly PlacedTransform[];
  readonly townHall: PlacedTransform | null;
  readonly civic: readonly PlacedTransform[];
}): SuccessionCityRoster {
  const members = [
    ...input.placements.map((placement) => ({
      placement_id: placement.nodeId,
      label: placementLabel(placement.nodeId),
      suspendable: false,
    })),
    ...(input.townHall
      ? [
          {
            placement_id: input.townHall.nodeId,
            label: placementLabel(input.townHall.nodeId),
            suspendable: false,
          },
        ]
      : []),
    ...input.civic.map((placement) => ({
      placement_id: placement.nodeId,
      label: placementLabel(placement.nodeId),
      suspendable: true,
    })),
  ];
  const districts = successionDistrictsForRoster(members);
  const actual = new Map<
    string,
    { readonly placement: PlacedTransform; readonly kind: SuccessionCityPlacementKind }
  >([
    ...input.placements.map(
      (placement) => [placement.nodeId, { placement, kind: "skill" as const }] as const,
    ),
    ...(input.townHall
      ? [
          [
            input.townHall.nodeId,
            { placement: input.townHall, kind: "town_hall" as const },
          ] as const,
        ]
      : []),
    ...input.civic.map(
      (placement) => [placement.nodeId, { placement, kind: "civic" as const }] as const,
    ),
  ]);
  return {
    districts,
    bindings: districts.map((district) => {
      const bound = actual.get(district.civic.placement_id);
      if (!bound) {
        throw new Error(
          `Succession ward "${district.id}" lost placement "${district.civic.placement_id}".`,
        );
      }
      return { district, ...bound };
    }),
  };
}
