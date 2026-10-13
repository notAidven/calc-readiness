/**
 * Authored ROAD model registry.
 *
 * Road GLBs live in their OWN subdirectory (`art/models/roads/`), mirroring the
 * Town Hall's `art/models/townhall/` convention: the building loader globs
 * `./art/models/*.glb` NON-recursively (`buildingAssets.ts`), and its
 * "exactly 18 skill-node URLs" test would break the moment a road GLB landed in
 * that flat folder. Keeping roads one level down means the building glob never
 * absorbs them, the 18-URL assertion stays true AND meaningful (it counts only the
 * 6 skills × 3 stages), and roads get their own registry here.
 *
 * STATUS: the supplied `road-straight-rounded` GLB is a COMPOSITE kit sample (a
 * rounded curve + a lane-shift jog + a straight run + a stub around a central
 * junction, all on a 74×62 grass base) — NOT a single tileable straight. It can't
 * be tiled edge-to-edge as-is, so the live network currently renders PROCEDURALLY,
 * styled to match this model's profile (dark asphalt, light curbs, white dashed
 * centreline, flat/low). The asset is kept + registered here so a future authored
 * SINGLE-CELL tile (straight, corner, T, cross, stub — each within one GRID_CELL)
 * can be dropped in and swapped on per shape without touching the building loader.
 */

const ROAD_MODEL_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(
    import.meta.glob("./art/models/roads/*.glb", {
      query: "?url",
      import: "default",
      eager: true,
    }) as Record<string, string>,
  ).map(([path, url]) => [path.split("/").pop() as string, url]),
);

/** The authored road-tile shapes (a future authored GLB per shape can register here). */
export type RoadModelShape = "straight" | "corner" | "tee" | "cross" | "stub";

/** Basename of the authored straight kit sample (composite; see file header). */
export const ROAD_STRAIGHT_FILE = "road-straight-rounded.glb";

/** Bundled url for an authored road GLB by basename, or `undefined` if absent. */
export function roadModelUrl(basename: string): string | undefined {
  return ROAD_MODEL_URLS[basename];
}

/** Every bundled authored road-GLB url (for preload / tests). */
export function roadModelUrls(): string[] {
  return Object.values(ROAD_MODEL_URLS);
}
