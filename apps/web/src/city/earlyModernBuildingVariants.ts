/**
 * Canonical Era 6 node-to-building identities, kept framework-free so the model resolver can
 * name the variant without pulling Three.js into the city's static application chunk.
 */
export const EARLY_MODERN_BUILDING_VARIANTS = {
  "GEO.1": "early-modern:observatory",
  "GEO.2": "early-modern:drawing-office",
  "CG.1": "early-modern:mapmakers-house",
  "POL.6": "early-modern:printing-house",
  "POL.7": "early-modern:lecture-theatre",
  "RAT.5": "early-modern:cannon-tower",
} as const;

export type EarlyModernBuildingVariant =
  (typeof EARLY_MODERN_BUILDING_VARIANTS)[keyof typeof EARLY_MODERN_BUILDING_VARIANTS];

export function earlyModernVariantForNode(
  nodeId: string,
): EarlyModernBuildingVariant | null {
  return (
    EARLY_MODERN_BUILDING_VARIANTS[nodeId as keyof typeof EARLY_MODERN_BUILDING_VARIANTS] ??
    null
  );
}
