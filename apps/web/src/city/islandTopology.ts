/**
 * Pure topology shared by the runtime island builder and non-WebGL representations.
 *
 * This module deliberately imports neither React nor Three.js. Atlas and fallback art can read
 * the exact shoreline shape without pulling the city renderer into their static bundle.
 */

/** Facet count for every procedural island's stacked shoreline rings. */
export const ISLAND_SHORE_FACETS = 9;

/** The runtime island's shelving shore, measured outward from the flat land edge. */
export const ISLAND_SHORE_PROFILE = [
  { dr: 0, y: 0 },
  { dr: 1.4, y: -0.32 },
  { dr: 2.6, y: -0.92 },
  { dr: 3.5, y: -1.72 },
] as const;

/** Surface height `dr` units outside the flat land edge. */
export function islandShoreY(dr: number): number {
  if (dr <= 0) {
    return 0;
  }
  for (let index = 1; index < ISLAND_SHORE_PROFILE.length; index += 1) {
    const before = ISLAND_SHORE_PROFILE[index - 1];
    const after = ISLAND_SHORE_PROFILE[index];
    if (before !== undefined && after !== undefined && dr <= after.dr) {
      const t = (dr - before.dr) / (after.dr - before.dr);
      return before.y + (after.y - before.y) * t;
    }
  }
  return ISLAND_SHORE_PROFILE[ISLAND_SHORE_PROFILE.length - 1]?.y ?? 0;
}

/**
 * Radius correction from a circumcircle to the runtime regular polygon at azimuth `phi`.
 * Corners stay at the circum-radius; side midpoints land at the polygon apothem.
 */
export function islandPolygonFactor(phi: number): number {
  const step = (Math.PI * 2) / ISLAND_SHORE_FACETS;
  const fromNormal = (((phi % step) + step) % step) - step / 2;
  return Math.cos(step / 2) / Math.cos(fromNormal);
}
