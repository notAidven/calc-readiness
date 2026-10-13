import { useMemo } from "react";
import * as THREE from "three";

import { parseRoadCellKey } from "../roads";
import { cellCenter, GRID_CELL, SURFACE_Y } from "../worldLayout";
import { ERA_ONE_PROP_TONES, GROUND_DECAL_TOPS } from "./StarterIsland";

/**
 * **THE RUINED-GROUND SEAM. SCARS ARE CELLS, NOT BUILDINGS.**
 *
 * A crisis scars ground as well as ruining buildings (`ruined_cells` in
 * `engines/game/src/crisis-damage.ts`), and a scarred cell is durable, unbuildable and
 * un-roadable until it is reclaimed at the authored price. The city already enforces all of
 * that; until now none of it was drawn.
 *
 * This is the per-cell layer that draws it, built the way the island's only other per-cell
 * ground layer is (`Roads.tsx`): one plain `THREE.Group` assembled from cell keys, cached by
 * the caller's memo, with the geometry and material shared across every tile. It is inert —
 * no pointer handlers — because a scar is not something the player picks on the canvas; the
 * reclaim action lives in the DOM, which is the accessible surface for it.
 *
 * ## WHAT EVAN SUPPLIES
 *
 * {@link addScarTile} is still the placeholder and still the thing to replace: a full-cell
 * slab of ash under a 45-degree hatch. Whatever goes in its place must keep two properties,
 * which {@link SCAR_TOP} and `ruinSeam.test.ts` hold between them:
 *
 *  - it lies ON the ground plane, on the shared depth ladder, never at a free height;
 *  - it reads by tone step and plan area rather than by lighting, like every other flat
 *    thing on this island.
 *
 * ...and one it did not have when it was a single flat slab: **the state may not be carried by
 * colour alone** (INV-CRISIS-16). See {@link SCAR_PLACEHOLDER_TONE} for the tone the lead sent
 * this layer back over, and {@link SCAR_HATCH_NAME} for the channel that carries the state
 * once the tone is no longer a near-black hole in the island.
 */

/**
 * Where a scar's TOP face sits, in world Y.
 *
 * IT SHARES THE ISLAND'S `worn` RUNG rather than adding one, and that is deliberate on two
 * counts. A scar IS worn bare ground, so it belongs on the rung the worn earth and footpaths
 * are on — and `GROUND_DECAL_TOPS` is asserted to be a uniform ladder whose top stays below
 * the road stack (`groundDepth.test.ts`), so a sixth rung invented here would move the roads
 * up and break that guard to say nothing new.
 *
 * Nothing on that rung can overlap a scar in plan: the island's worn decals all sit outside
 * radius 25 and a scar is inside `BUILDABLE_RADIUS` (22) — the same argument
 * `groundDepth.test.ts` already makes for roads against decals. And sitting on rung 1 puts a
 * scar BELOW the road stack, so in the one case that should be impossible anyway (a road and
 * a scar on one cell — the session makes scarred ground occupied, so a road cannot be laid
 * there) the road wins rather than the two fighting.
 */
export const SCAR_TOP = SURFACE_Y + GROUND_DECAL_TOPS.worn;

/**
 * How thick a scar slab is. Only its top face is meant to be seen; the rest is bedded well
 * below the surface so the ground swallows its sides, exactly as `Roads.tsx` beds its
 * courses and for the same reason.
 */
const SLAB_THICK = 1.2;

/** One shared full-cell slab — every tile is the same box, so this is built once. */
const SCAR_GEOMETRY = new THREE.BoxGeometry(GRID_CELL, SLAB_THICK, GRID_CELL);

/**
 * **SPOILED GROUND, NOT ABSENT GROUND — the island's own hearth ash.**
 *
 * This was `0x4a4844`, a dead cold char, and it was wrong in both weathers. The team lead, on
 * the crisis surface: *"the broken ground is too dark and jarrin[g]"*. The arithmetic is the
 * argument: a scar lies on the fair-weather island's vivid yellow-green tussock (`0xa8b850`,
 * relative luminance 0.432) and, while a winter is on, on near-white snow (0.90). Against the
 * second, a near-black tone is not a strong read but **the maximum contrast the scene can
 * produce** — 0.835 of luminance, wider than any other pair on the island — and a patch at
 * maximum contrast reads as a hole punched through the island rather than as damaged land.
 *
 * `ERA_ONE_PROP_TONES.ash` is the grey ash bed under the camp's fire-blackened stone ring, so
 * ground gone to ash is said in a tone this island already wears and **no hue is introduced**.
 * It is imported rather than repeated: this file may open `three`, so unlike `winterTones.ts`
 * it has no reason to copy the number and every reason not to.
 *
 * Measured: luminance 0.065 → 0.255, so the step down from the tussock goes 0.367 → 0.177 and
 * from lit snow 0.835 → 0.646. It stays the darkest ground state in either weather, and it is
 * still fully desaturated (saturation 0.09) against a tussock at 0.71 and warm earth at 0.70 —
 * which is the channel that keeps it clear of the worn-earth decals at a similar value.
 *
 * The winter's own layer carries the same number for the same state
 * (`winterTones.ts`: `WINTER_GROUND_TONES.abandoned`), because ground given up during a crisis
 * and a scar left after the thaw are one state at two moments — this layer takes over from that
 * one at the thaw (`CitySurface.tsx`), and an island that changed colour as the frost lifted
 * would be reporting a change nothing made.
 */
export const SCAR_PLACEHOLDER_TONE = ERA_ONE_PROP_TONES.ash;

/**
 * The hatch's own tone: the same ash, a value step down. A step and not a second hue, so the
 * hatch is legible in greyscale — which is the whole point of it (see {@link SCAR_HATCH_NAME}).
 */
const SCAR_HATCH_TONE = 0x76736c;

/**
 * A single negative depth bias, so a scar has a FIXED winner against anything that ends up
 * coplanar with it rather than one decided per pixel per frame. Insurance rather than a
 * rule — nothing on this rung overlaps a scar in plan today (see {@link SCAR_TOP}) — and it
 * mirrors what the island's own coplanar decals do (`decalBias`).
 */
const SCAR_DEPTH_BIAS = -1;

/**
 * The hatch's bias, one step stronger than the slab's, because the hatch IS coplanar with the
 * slab by design — both faces sit exactly on {@link SCAR_TOP}, so the layer takes no second
 * rung and the ladder above it does not move. A fixed winner rather than a per-pixel coin toss
 * is exactly what {@link SCAR_DEPTH_BIAS} exists to buy, and it buys it here too.
 */
const SCAR_HATCH_BIAS = -2;

const SCAR_MATERIAL = new THREE.MeshStandardMaterial({
  color: SCAR_PLACEHOLDER_TONE,
  roughness: 0.98,
  metalness: 0,
  flatShading: true,
  polygonOffset: true,
  polygonOffsetFactor: SCAR_DEPTH_BIAS,
  polygonOffsetUnits: SCAR_DEPTH_BIAS,
});

const SCAR_HATCH_MATERIAL = new THREE.MeshStandardMaterial({
  color: SCAR_HATCH_TONE,
  roughness: 0.98,
  metalness: 0,
  flatShading: true,
  polygonOffset: true,
  polygonOffsetFactor: SCAR_HATCH_BIAS,
  polygonOffsetUnits: SCAR_HATCH_BIAS,
});

/** The name every scar tile carries, so tests can count the layer without reaching inside it. */
export const SCAR_TILE_NAME = "ruined-ground-tile";

/**
 * **THE SECOND CARRIER, AND WHY THE LAYER OWES ONE AT ALL.**
 *
 * As it shipped, a scar was one flat slab in one tone: the state was carried by COLOUR ALONE,
 * which the crisis's own INV-CRISIS-16 forbids and which leaves a colour-blind player unable to
 * read the board. That was survivable-looking only because the tone was near-black, and taking
 * the value off black is exactly what makes the omission bite — so the retone above and this go
 * in together or neither does.
 *
 * **A 45-DEGREE HATCH, because that is already this feature's word for ground given up.** The
 * 2D board marks an abandoned cell with a `repeating-linear-gradient` at 45 degrees
 * (`hard-winter.css`, `.hw-cell--abandoned`), and the pull-back preview deliberately borrows a
 * sparser version of it so the two read as before and after. Nothing is invented here; the
 * island is being taught a mark the board already uses.
 *
 * Two tones a value step apart rather than raised ridges, because this layer reads *"by tone
 * step and plan area rather than by lighting, like every other flat thing on this island"* (see
 * the header). A relief hatch would be a read that depends on where the key light happens to
 * be, and it would also have to leave the rung.
 */
export const SCAR_HATCH_NAME = "ruined-ground-hatch";

/** Bar width, and the gap between bar centres. Coarse enough to survive full zoom-out. */
const HATCH_BAR = 0.34;
const HATCH_PITCH = 0.82;

/**
 * Half the length a hatch bar may have at perpendicular offset `v`, so it stops AT the cell.
 *
 * The cell is `GRID_CELL` square and the bars run at 45 degrees across it, so in the rotated
 * frame the square's cross-section shrinks with the offset: at perpendicular distance `v` the
 * available run is `GRID_CELL·√2 − 2|v|`, and the bar's own half-width has to come off both
 * ends of it. Derived rather than eyeballed because the alternative is a bar poking out of its
 * cell — which `ruinSeam.test.ts` catches as a scar whose footprint is no longer 4 by 4, and
 * which would look like the scar bleeding into the ground beside it.
 */
function hatchHalfLength(v: number): number {
  return (GRID_CELL * Math.SQRT2) / 2 - Math.abs(v) - HATCH_BAR / 2;
}

/** One shared geometry per distinct bar length. Symmetric in `v`, so the cache is small. */
const HATCH_GEOMETRIES = new Map<string, THREE.BoxGeometry>();

function hatchGeometry(halfLength: number): THREE.BoxGeometry {
  const key = halfLength.toFixed(4);
  const cached = HATCH_GEOMETRIES.get(key);
  if (cached) {
    return cached;
  }
  const made = new THREE.BoxGeometry(halfLength * 2, SLAB_THICK, HATCH_BAR);
  HATCH_GEOMETRIES.set(key, made);
  return made;
}

/**
 * The hatch over one cell: parallel bars at 45 degrees, each clipped to the cell it is in.
 *
 * A child of the tile rather than a sibling, so the tile stays the ONE named object per cell
 * that `ruinSeam.test.ts` counts, and so the bars move with it for free.
 */
function addScarHatch(tile: THREE.Object3D): void {
  const hatch = new THREE.Group();
  hatch.name = SCAR_HATCH_NAME;
  // Rotated as a group about Y, so every bar shares one 45-degree direction and the geometry
  // stays axis-aligned (and therefore cheap to reason about in {@link hatchHalfLength}).
  hatch.rotation.y = Math.PI / 4;
  for (let v = -GRID_CELL; v <= GRID_CELL; v += HATCH_PITCH) {
    const halfLength = hatchHalfLength(v);
    // A stub shorter than its own width is a dot in the corner, not a bar. Dropped rather than
    // drawn, which is also what keeps the corners of the cell reading as corners.
    if (halfLength <= HATCH_BAR) {
      continue;
    }
    const bar = new THREE.Mesh(hatchGeometry(halfLength), SCAR_HATCH_MATERIAL);
    // At the tile's own origin, so the bar is exactly co-extensive with the slab in Y: same
    // thickness, same centre, therefore the same top face. The hatch is a pattern ON the slab
    // and takes no rung of its own — see {@link SCAR_HATCH_BIAS} for what settles the overlap.
    bar.position.set(0, 0, v);
    hatch.add(bar);
  }
  tile.add(hatch);
}

/**
 * One scarred cell: a full-cell slab of ash with a hatch across it.
 *
 * Full-cell rather than inset (roads inset, because a road is a strip through a cell) since
 * the claim a scar makes is about the WHOLE cell: this ground is gone until it is reclaimed.
 */
function addScarTile(group: THREE.Object3D, col: number, row: number): void {
  const { x, z } = cellCenter(col, row);
  const mesh = new THREE.Mesh(SCAR_GEOMETRY, SCAR_MATERIAL);
  mesh.name = SCAR_TILE_NAME;
  mesh.position.set(x, SCAR_TOP - SLAB_THICK / 2, z);
  mesh.receiveShadow = true;
  addScarHatch(mesh);
  group.add(mesh);
}

/**
 * Build the whole scarred-ground layer as one group: one tile per ruined cell key.
 *
 * Exported for unit tests, which assert one tile lands per cell and at that cell's centre —
 * the same reason `buildRoadsGroup` is exported.
 *
 * Duplicate keys collapse, so a damage list that recorded the same cell twice cannot stack
 * two coplanar slabs on it (which is the one way this layer could z-fight with itself).
 */
export function buildScarredGroundGroup(cells: readonly string[]): THREE.Group {
  const group = new THREE.Group();
  for (const key of new Set(cells)) {
    const { col, row } = parseRoadCellKey(key);
    if (!Number.isFinite(col) || !Number.isFinite(row)) {
      continue;
    }
    addScarTile(group, col, row);
  }
  return group;
}

export interface ScarredGroundProps {
  /** `"col,row"` keys of the cells a crisis scarred and nobody has reclaimed yet. */
  readonly cells: readonly string[];
}

export function ScarredGround({ cells }: ScarredGroundProps) {
  const group = useMemo(() => buildScarredGroundGroup(cells), [cells]);
  return <primitive object={group} />;
}
