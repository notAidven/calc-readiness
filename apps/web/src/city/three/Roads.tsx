import type { EraId } from "@cr/skill-graph";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

import { CURRENT_ERA_ID } from "../eraDressing";
import {
  type RoadCourse,
  type RoadSlabCourse,
  type RoadSurfacing,
  roadSurfacing,
} from "../roadSurfacing";
import { type NeighborMask, type RoadCell, roadCellKey, roadNeighborMask } from "../roads";
import { cellCenter, GRID_CELL, SURFACE_Y } from "../worldLayout";
import { GROUND_DECAL_STEP, GROUND_DECAL_TOPS } from "./StarterIsland";

const NO_BUILDING_CELLS: ReadonlySet<string> = new Set<string>();

/**
 * The road layer for the R3F city — CONNECTION-AWARE paths laid on the grid.
 *
 * STYLE: **per era, not baked in** (D-ERA30). What a road is MADE OF comes from
 * `roadSurfacing.ts`, which keys an ordered list of courses by `EraId` in the same
 * idiom `eraDressing.ts` uses for dressing subtitles. This file owns only HOW a
 * course is drawn and WHERE it sits; it knows nothing about earth or asphalt. Era one
 * declares a scuffed earth verge under a darker packed tread — a path worn into the
 * ground — and a modern era can declare aggregate under painted markings again
 * without touching anything here.
 *
 * TILING: each tile is a central patch plus an ARM toward every occupied neighbour,
 * so adjacent tiles' arms meet exactly at the shared cell edge — straights run
 * seamlessly, and corner / T / crossroads / lone-stub / dead-end all fall out of
 * the occupied-neighbour mask (the pure, unit-tested `roadNeighborMask`), with the
 * shape used only to place a `markings` course's dashes. Because every mask is
 * recomputed from the CURRENT road set on each build, removing a tile re-tiles its
 * neighbours for free: the crossroads beside it becomes a T, the straight a stub.
 *
 * PICKING: with `onSelectTile` wired, each laid tile gets an invisible full-cell
 * click target, so a player can pick one tile out of the network and `selected`
 * draws the gold selection frame on it. Purely decorative otherwise (the canvas is
 * `aria-hidden`); the DOM roster + running-cost bar carry the semantics.
 */

const HALF = GRID_CELL / 2;

/* -------------------------------------------------------------------------- */
/* The depth ladder — ONE ladder over the whole ground plane                   */
/* -------------------------------------------------------------------------- */

/**
 * Which rung the road stack's LOWEST course sits on, counting the island's ground
 * decals as rungs 1..n.
 *
 * The road stack used to run its own ad-hoc heights (curb 0.11, asphalt 0.13, dash
 * 0.17 above the surface) with a 0.02u gap at its tightest — about **4.4** resolvable
 * depth steps at full zoom-out, which is the whole margin #152 bought and no more.
 * Meanwhile the island's flat detail was put on a UNIFORM 0.05u ladder clearing
 * **11** steps. Two ladders on one plane is what let the old road stack be the tight
 * one, so the roads now CONTINUE the island's: the courses take consecutive rungs
 * starting at the first free one above the highest decal, and the step is the
 * island's own `GROUND_DECAL_STEP`.
 *
 * Two properties fall out of that, and both are pinned in `depthPrecision.test.ts`:
 * the gap between any two road courses is ALWAYS exactly one step, so no era's
 * surfacing can be the tight one; and the roads always sit above every island decal,
 * so `groundDepth.test.ts`'s clearance assertion holds by construction rather than by
 * care (it gets more clearance than before, not less — 11 steps where it had 2.2).
 */
const ROAD_BASE_RUNG = Object.keys(GROUND_DECAL_TOPS).length + 1;

/** Where course `index` (0 = lowest) puts its TOP face, in world Y. */
export function roadCourseTop(index: number): number {
  return SURFACE_Y + (ROAD_BASE_RUNG + index) * GROUND_DECAL_STEP;
}

/**
 * Every surface an era's road stack presents, lowest first, in world Y. These are the
 * faces that can z-fight one another, and the numbers `depthPrecision.test.ts` measures
 * the camera's depth resolution against. Derived from the era's course COUNT, so a
 * surfacing cannot author a height and cannot land between two rungs.
 */
export function roadSurfaceTops(eraId: EraId): number[] {
  return roadSurfacing(eraId).courses.map((_, index) => roadCourseTop(index));
}

/** The highest face an era's roads present — what anything drawn over a tile must clear. */
export function roadStackTop(eraId: EraId): number {
  const tops = roadSurfaceTops(eraId);
  return tops[tops.length - 1] ?? SURFACE_Y;
}

/**
 * How thick a course's slab is. Only its TOP face is ever meant to be seen: the slab is
 * BEDDED well below `SURFACE_Y` so the ground swallows its sides, because a visible side
 * wall is most of what makes a flat band look laid down rather than worn in (the same
 * reason the island's `DECAL_THICK` is far larger than any decal's height). Generous
 * enough that it still beds in for a stack several courses taller than era one's two.
 */
const SLAB_THICK = 1.2;

/* -------------------------------------------------------------------------- */
/* Per-course geometry and materials, cached by shape                          */
/* -------------------------------------------------------------------------- */

/** The four box geometries one slab course needs, cached per width. */
interface SlabGeometry {
  readonly center: THREE.BoxGeometry;
  readonly armNS: THREE.BoxGeometry;
  readonly armEW: THREE.BoxGeometry;
  /** Half the arm's length, i.e. how far from the cell centre to sit it. */
  readonly armOffset: number;
}

const SLAB_GEOMETRY = new Map<number, SlabGeometry>();

function slabGeometry(widthFactor: number): SlabGeometry {
  const cached = SLAB_GEOMETRY.get(widthFactor);
  if (cached) {
    return cached;
  }
  const w = GRID_CELL * widthFactor;
  const armLength = HALF - w / 2;
  const built: SlabGeometry = {
    center: new THREE.BoxGeometry(w, SLAB_THICK, w),
    armNS: new THREE.BoxGeometry(w, SLAB_THICK, armLength),
    armEW: new THREE.BoxGeometry(armLength, SLAB_THICK, w),
    armOffset: (HALF + w / 2) / 2,
  };
  SLAB_GEOMETRY.set(widthFactor, built);
  return built;
}

/** A unit cylinder every ragged edge lump is a scaled instance of (one geometry, many lumps). */
const LUMP_GEO = new THREE.CylinderGeometry(1, 1.1, 1, 7);

/** Dash geometry, cached per markings course shape. */
const DASH_GEOMETRY = new Map<string, THREE.BoxGeometry>();

function dashGeometry(course: RoadMarkingsShape): THREE.BoxGeometry {
  const key = `${course.lengthFactor}x${course.widthFactor}`;
  const cached = DASH_GEOMETRY.get(key);
  if (cached) {
    return cached;
  }
  const built = new THREE.BoxGeometry(
    GRID_CELL * course.lengthFactor,
    SLAB_THICK,
    GRID_CELL * course.widthFactor,
  );
  DASH_GEOMETRY.set(key, built);
  return built;
}

interface RoadMarkingsShape {
  readonly lengthFactor: number;
  readonly widthFactor: number;
}

/**
 * How many distinct depth biases a ragged course cycles through. The lumps that break a
 * course's outline OVERLAP EACH OTHER by design and all sit on that course's single
 * rung, so height cannot separate them — the same problem the island's worn paths have,
 * solved the same way (`decalBias`, `GROUND_DECAL_BIAS_CYCLE`). The sign is opposite
 * here: the island pulls its decals TOWARD the camera off the ground, whereas these
 * lumps must be pushed AWAY so a lump can never rise through the course above it.
 *
 * Offsets are UNITS-ONLY (`polygonOffsetFactor` stays 0). Factor is multiplied by the
 * triangle's depth slope; at full zoom-out that amplification was pushing the lowest
 * dirt course behind the tussock and the paths flickered green. Units are a constant
 * depth-buffer nudge, so they keep coplanar lumps ordered without sinking the slab.
 */
const RAGGED_BIAS_CYCLE = 6;

/** Positive (push-back) polygon-offset UNITS for lump `seq`, cycling so neighbours differ. */
function raggedBias(seq: number): number {
  return 1 + (seq % RAGGED_BIAS_CYCLE);
}

/**
 * Materials for one course. A slab course carrying ragged lumps needs one material per
 * bias in the cycle (a polygon offset is material state, not mesh state), so they are
 * built once per course and shared across every tile.
 */
interface CourseMaterials {
  readonly base: THREE.MeshStandardMaterial;
  readonly ragged: readonly THREE.MeshStandardMaterial[];
}

const COURSE_MATERIALS = new Map<string, CourseMaterials>();

function courseMaterials(course: RoadCourse, index: number): CourseMaterials {
  const key = `${index}:${course.kind}:${course.id}:${course.color}`;
  const cached = COURSE_MATERIALS.get(key);
  if (cached) {
    return cached;
  }
  const marking = course.kind === "markings";
  const make = (units: number | null): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({
      color: course.color,
      roughness: marking ? 0.7 : course.roughness,
      metalness: 0,
      flatShading: !marking,
      // Painted markings stay unlit-bright in every lighting variant, exactly as the
      // outgoing centreline did; earth is lit like the ground it is part of.
      toneMapped: !marking,
      ...(units === null
        ? {}
        : {
            polygonOffset: true,
            // Factor MUST stay 0 — see RAGGED_BIAS_CYCLE. DepthPrecision pins this.
            polygonOffsetFactor: 0,
            polygonOffsetUnits: units,
          }),
    });
  // Pull every course TOWARD the camera by its rung (negative units). The shipped dirt
  // stack pushed the lowest course AWAY (`factor === units === 1`), and at full zoom-out
  // the slope-amplified factor sank verge fragments behind the tussock — green speckles
  // that re-decided as the camera orbited. The ladder (~11 depth steps per rung) already
  // separates courses; the pull only fixes the winner against the ground and coplanar
  // lumps. Ragged lumps take a small push-back relative to their own course's pull.
  const coursePull = -(index + 1);
  const built: CourseMaterials = {
    base: make(coursePull),
    ragged:
      course.kind === "slab" && course.ragged
        ? Array.from({ length: RAGGED_BIAS_CYCLE }, (_, i) =>
            make(coursePull + raggedBias(i)),
          )
        : [],
  };
  COURSE_MATERIALS.set(key, built);
  return built;
}

function previewMat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.7,
    metalness: 0.02,
    transparent: true,
    opacity: 0.6,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.3,
    depthWrite: false,
    flatShading: true,
  });
}
const PREVIEW_OK_MAT = previewMat(0x6fca7b);
const PREVIEW_BAD_MAT = previewMat(0xe0685e);

/* -------------------------------------------------------------------------- */
/* Selected-tile highlight                                                    */
/* -------------------------------------------------------------------------- */

/** Object name the selection highlight carries, so it is findable in the scene. */
export const ROAD_HIGHLIGHT_NAME = "road-tile-highlight";

/**
 * The highlight has to read UNAMBIGUOUSLY at the game's fixed ~49° camera tilt, on
 * whatever the era surfaced the road with, from any azimuth — so it is reward-gold
 * (`--game-gold`, the HUD's selection/reward accent), unlit (`MeshBasicMaterial`,
 * `toneMapped: false`) so it stays bright in every lighting variant, and drawn as a
 * FRAME that rides just proud of the tile rather than a flat tint that the camera angle
 * would foreshorten away. A soft wash inside the frame fills the tile so the whole cell
 * reads as picked.
 */
const HIGHLIGHT_COLOR = 0xf2c14e;

/**
 * How far the highlight and the pick target ride above the road stack's TOP course.
 * Measured as a clearance rather than an absolute height, because the stack's top now
 * depends on how many courses the era declared — a three-course paved era would have
 * risen into a hardcoded 0.24, and the translucent wash sitting level with a road
 * surface is exactly the coplanar pair the depth work exists to prevent. These are the
 * clearances the shipped absolutes gave over the old three-course stack (0.24 and 0.30
 * over a top of 0.17), so nothing moves relative to the road it is drawn on.
 */
const HIGHLIGHT_CLEARANCE = 0.07;
const PICK_CLEARANCE = 0.13;

/** Frame bar thickness + how far in from the cell edge the frame sits. */
const FRAME_BAR = 0.42;
const FRAME_SPAN = GRID_CELL - 0.5;
const FRAME_OFF = FRAME_SPAN / 2 - FRAME_BAR / 2;
const FRAME_H = 0.5;

const FRAME_GEO_EW = new THREE.BoxGeometry(FRAME_SPAN, FRAME_H, FRAME_BAR);
const FRAME_GEO_NS = new THREE.BoxGeometry(FRAME_BAR, FRAME_H, FRAME_SPAN);
const WASH_GEO = new THREE.BoxGeometry(FRAME_SPAN, 0.02, FRAME_SPAN);
const FRAME_MAT = new THREE.MeshBasicMaterial({
  color: HIGHLIGHT_COLOR,
  toneMapped: false,
});
const WASH_MAT = new THREE.MeshBasicMaterial({
  color: HIGHLIGHT_COLOR,
  transparent: true,
  // Light enough that the road surface still reads through it — the frame is what says
  // "picked"; the wash only ties the whole cell to it.
  opacity: 0.22,
  depthWrite: false,
  toneMapped: false,
});

/**
 * The invisible click target laid over each road cell: a full-cell slab just above the
 * road's top course. Transparent rather than `visible={false}`, because an invisible
 * mesh is skipped by the raycaster and would pick nothing at all.
 */
const PICK_GEO = new THREE.BoxGeometry(GRID_CELL, 0.6, GRID_CELL);
const PICK_MAT = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
});

/** Draw the gold selection frame + wash over one cell (never more than one). */
function addSelectionHighlight(
  group: THREE.Group,
  col: number,
  row: number,
  highlightY: number,
): void {
  const { x, z } = cellCenter(col, row);
  const highlight = new THREE.Group();
  highlight.name = ROAD_HIGHLIGHT_NAME;
  highlight.position.set(x, 0, z);
  const bar = (geo: THREE.BufferGeometry, dx: number, dz: number): void => {
    const mesh = new THREE.Mesh(geo, FRAME_MAT);
    mesh.position.set(dx, highlightY, dz);
    highlight.add(mesh);
  };
  bar(FRAME_GEO_EW, 0, -FRAME_OFF);
  bar(FRAME_GEO_EW, 0, FRAME_OFF);
  bar(FRAME_GEO_NS, -FRAME_OFF, 0);
  bar(FRAME_GEO_NS, FRAME_OFF, 0);
  const wash = new THREE.Mesh(WASH_GEO, WASH_MAT);
  wash.position.set(0, highlightY, 0);
  highlight.add(wash);
  group.add(highlight);
}

function add(
  group: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
): void {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.receiveShadow = true;
  group.add(m);
}

/**
 * Small deterministic RNG, seeded from the cell so a tile's ragged edge is IDENTICAL
 * every rebuild. The road group is rebuilt on every paint stroke and every selection
 * change, so a live `Math.random()` would make the whole network's outline crawl.
 */
function cellRng(col: number, row: number): () => number {
  let a = ((col * 0x9e3779b1) ^ (row * 0x85ebca6b) ^ 0x5eed) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Break a slab course's outline with worn lumps straddling both of its long edges, so
 * the band reads as ground people wore through rather than a strip that was laid. The
 * lumps ride on the course's OWN rung — they are the same surface, not a layer above
 * it — and each takes a different push-back bias from the cycle so the overlaps they
 * make with the band and with each other are resolved once instead of being re-decided
 * every time the camera orbits.
 *
 * Only ever OUTWARD of the edge, so the band itself still meets its neighbour's band
 * exactly at the shared cell edge and a straight run stays seamless.
 */
function addRaggedEdge(
  group: THREE.Group,
  rng: () => number,
  materials: readonly THREE.MeshStandardMaterial[],
  y: number,
  x: number,
  z: number,
  span: number,
  halfWidth: number,
  alongZ: boolean,
  seq: { n: number },
): void {
  if (materials.length === 0) {
    return;
  }
  const lumps = Math.max(2, Math.round(span / 0.85));
  for (let i = 0; i < lumps; i += 1) {
    for (const side of [-1, 1]) {
      if (rng() < 0.22) {
        continue; // the edge wears through unevenly; grass survives in patches
      }
      const along = (-span / 2 + (span * (i + rng())) / lumps) * 1;
      // Straddle the edge: mostly outside it, so the lump reads as spill rather than
      // as a bite taken out of the band.
      const across = side * (halfWidth + (rng() - 0.25) * 0.34);
      const r = 0.26 + rng() * 0.3;
      const material = materials[seq.n % materials.length] as THREE.MeshStandardMaterial;
      seq.n += 1;
      const lump = new THREE.Mesh(LUMP_GEO, material);
      lump.scale.set(r, SLAB_THICK, r * (0.7 + rng() * 0.5));
      lump.rotation.y = rng() * Math.PI;
      lump.position.set(
        x + (alongZ ? across : along),
        y - SLAB_THICK / 2,
        z + (alongZ ? along : across),
      );
      lump.receiveShadow = true;
      group.add(lump);
    }
  }
}

/** Draw one SLAB course of a tile: the centre patch, an arm per connection, and the edge. */
function addSlabCourse(
  group: THREE.Group,
  course: RoadSlabCourse,
  materials: CourseMaterials,
  top: number,
  x: number,
  z: number,
  mask: NeighborMask,
  col: number,
  row: number,
): void {
  const geo = slabGeometry(course.widthFactor);
  // A box's TOP face is what the ladder positions, so its centre sits half a thickness
  // below — the rest is bedded into the ground where nothing can see its sides.
  const y = top - SLAB_THICK / 2;
  const { armOffset } = geo;
  add(group, geo.center, materials.base, x, y, z);
  if (mask.n) add(group, geo.armNS, materials.base, x, y, z - armOffset);
  if (mask.s) add(group, geo.armNS, materials.base, x, y, z + armOffset);
  if (mask.e) add(group, geo.armEW, materials.base, x + armOffset, y, z);
  if (mask.w) add(group, geo.armEW, materials.base, x - armOffset, y, z);

  if (!course.ragged) {
    return;
  }
  const rng = cellRng(col, row);
  const seq = { n: 0 };
  const halfWidth = (GRID_CELL * course.widthFactor) / 2;
  // The edge runs the whole cell where the band runs the whole cell, and only across
  // the centre patch where it does not — so a dead end's blunt end gets worn too.
  const spanNS = mask.n || mask.s ? GRID_CELL : GRID_CELL * course.widthFactor;
  const spanEW = mask.e || mask.w ? GRID_CELL : GRID_CELL * course.widthFactor;
  // Lumps down the two edges that run north-south, then the two that run east-west.
  addRaggedEdge(group, rng, materials.ragged, top, x, z, spanNS, halfWidth, true, seq);
  addRaggedEdge(group, rng, materials.ragged, top, x, z, spanEW, halfWidth, false, seq);
}

/**
 * Draw a MARKINGS course: one dash down each connected arm, oriented along it, so a
 * straight run reads as a continuous dashed line and a junction carries markings into
 * every leg. A lone stub (no arms) gets a single centre pip so it still reads as road.
 */
function addMarkingsCourse(
  group: THREE.Group,
  course: RoadMarkingsShape,
  materials: CourseMaterials,
  top: number,
  x: number,
  z: number,
  mask: NeighborMask,
): void {
  const geo = dashGeometry(course);
  const y = top - SLAB_THICK / 2;
  const dash = (dx: number, dz: number, alongZ: boolean): void => {
    const m = new THREE.Mesh(geo, materials.base);
    if (alongZ) {
      m.rotation.y = Math.PI / 2;
    }
    m.position.set(x + dx, y, z + dz);
    group.add(m);
  };
  const armDashOff = HALF * 0.5;
  if (mask.n) dash(0, -armDashOff, true);
  if (mask.s) dash(0, armDashOff, true);
  if (mask.e) dash(armDashOff, 0, false);
  if (mask.w) dash(-armDashOff, 0, false);
  if (!mask.n && !mask.e && !mask.s && !mask.w) {
    dash(0, 0, false);
  }
}

/**
 * A committed road tile: every course the era declared, lowest first, each on its own
 * rung of the shared ground ladder.
 *
 * The switch is EXHAUSTIVE over `RoadCourse["kind"]` rather than defaulted, which is
 * D-ERA28's rule applied to surfacing: a course kind a future era introduces is a
 * COMPILE ERROR here until it is actually drawn, instead of a course that typechecks
 * and silently renders nothing.
 */
function addCommittedTile(
  group: THREE.Group,
  col: number,
  row: number,
  mask: NeighborMask,
  surfacing: RoadSurfacing,
): void {
  const { x, z } = cellCenter(col, row);
  surfacing.courses.forEach((course, index) => {
    const materials = courseMaterials(course, index);
    const top = roadCourseTop(index);
    switch (course.kind) {
      case "slab":
        addSlabCourse(group, course, materials, top, x, z, mask, col, row);
        break;
      case "markings":
        addMarkingsCourse(group, course, materials, top, x, z, mask);
        break;
    }
  });
}

/**
 * A road's painted arms include both road neighbours and an adjacent building frontage.
 *
 * The stored road still occupies only its own free cell. A frontage arm reaches from that
 * cell's centre to the shared edge and stops there, so the path visibly meets the plot without
 * paving a cell under the building. Without this extension a structurally adjacent dead-end
 * draws only back toward the road network and leaves bare ground at the very edge it claims
 * to reach.
 */
function visibleConnectionMask(
  col: number,
  row: number,
  roadCells: ReadonlySet<string>,
  buildingCells: ReadonlySet<string>,
): NeighborMask {
  const roads = roadNeighborMask(col, row, roadCells);
  return {
    n: roads.n || buildingCells.has(roadCellKey(col, row - 1)),
    e: roads.e || buildingCells.has(roadCellKey(col + 1, row)),
    s: roads.s || buildingCells.has(roadCellKey(col, row + 1)),
    w: roads.w || buildingCells.has(roadCellKey(col - 1, row)),
  };
}

/**
 * A preview tile: one translucent tinted band, so a drafted path reads instantly as a
 * shape. Drawn at the TOP course's width and rung — the surface the finished road will
 * present — rather than replaying every course, which at preview opacity would only
 * muddy the outline the player is trying to judge.
 */
function addPreviewTile(
  group: THREE.Group,
  col: number,
  row: number,
  mask: NeighborMask,
  mat: THREE.Material,
  surfacing: RoadSurfacing,
): void {
  const { x, z } = cellCenter(col, row);
  const index = topSlabIndex(surfacing);
  const course = surfacing.courses[index];
  const widthFactor = course && course.kind === "slab" ? course.widthFactor : 0.56;
  const geo = slabGeometry(widthFactor);
  const y = roadCourseTop(index) - SLAB_THICK / 2;
  const { armOffset } = geo;
  add(group, geo.center, mat, x, y, z);
  if (mask.n) add(group, geo.armNS, mat, x, y, z - armOffset);
  if (mask.s) add(group, geo.armNS, mat, x, y, z + armOffset);
  if (mask.e) add(group, geo.armEW, mat, x + armOffset, y, z);
  if (mask.w) add(group, geo.armEW, mat, x - armOffset, y, z);
}

/** Index of the highest SLAB course — the road's own driving surface, ignoring paint. */
function topSlabIndex(surfacing: RoadSurfacing): number {
  for (let i = surfacing.courses.length - 1; i >= 0; i -= 1) {
    if (surfacing.courses[i]?.kind === "slab") {
      return i;
    }
  }
  return 0;
}

/**
 * Build the whole road layer as one group: every committed tile (auto-tiled against
 * the current network), the painting preview, and — for at most ONE cell that
 * actually carries a road — the selection highlight. Exported for unit tests, which
 * assert the highlight lands on exactly the selected tile and nowhere else.
 *
 * `surfacing` defaults to the era the city is currently wearing, so a test or a caller
 * that does not care about eras gets the shipped road; passing one explicitly is how
 * the per-era table is exercised without shipping an unratified era's art.
 */
export function buildRoadsGroup(
  committed: readonly RoadCell[],
  preview: readonly RoadCell[],
  affordable: boolean,
  selected: RoadCell | null = null,
  surfacing: RoadSurfacing = roadSurfacing(CURRENT_ERA_ID),
  buildingCells: ReadonlySet<string> = NO_BUILDING_CELLS,
): THREE.Group {
  const group = new THREE.Group();
  const committedKeys = new Set(committed.map((c) => roadCellKey(c.col, c.row)));
  const previewKeys = new Set(preview.map((c) => roadCellKey(c.col, c.row)));
  // Arms are computed over committed ∪ preview so an existing road reaches toward a
  // freshly drawn tile (and the draft joins itself) live while painting.
  const union = new Set<string>([...committedKeys, ...previewKeys]);

  for (const cell of committed) {
    addCommittedTile(
      group,
      cell.col,
      cell.row,
      visibleConnectionMask(cell.col, cell.row, union, buildingCells),
      surfacing,
    );
  }
  const previewMaterial = affordable ? PREVIEW_OK_MAT : PREVIEW_BAD_MAT;
  for (const cell of preview) {
    if (committedKeys.has(roadCellKey(cell.col, cell.row))) {
      continue;
    }
    addPreviewTile(
      group,
      cell.col,
      cell.row,
      visibleConnectionMask(cell.col, cell.row, union, buildingCells),
      previewMaterial,
      surfacing,
    );
  }
  // The highlight follows the COMMITTED set, so a stale selection (a tile removed
  // out from under it) simply stops drawing rather than gilding empty grass.
  if (selected && committedKeys.has(roadCellKey(selected.col, selected.row))) {
    addSelectionHighlight(
      group,
      selected.col,
      selected.row,
      surfacingStackTop(surfacing) + HIGHLIGHT_CLEARANCE,
    );
  }
  return group;
}

/** The highest face a surfacing presents, from the surfacing rather than from an era. */
export function surfacingStackTop(surfacing: RoadSurfacing): number {
  return surfacing.courses.length === 0
    ? SURFACE_Y
    : roadCourseTop(surfacing.courses.length - 1);
}

export interface RoadsProps {
  /** Committed road tiles (from the city load). */
  readonly roads: readonly RoadCell[];
  /** The draft being painted (optional); rendered as a tinted preview. */
  readonly preview?: readonly RoadCell[];
  /** Whether the draft is affordable — drives the preview tint (green vs rose). */
  readonly previewAffordable?: boolean;
  /** The picked tile, drawn with the gold selection frame (`null` = none). */
  readonly selected?: RoadCell | null;
  /** Occupied plot cells; an adjacent road paints to their shared edge, never beneath them. */
  readonly buildingCells?: ReadonlySet<string>;
  /**
   * Click-to-pick a single tile. Omitted (during placement / paint mode) the road
   * layer stays inert, so a build drag is never stolen by a road underneath it.
   */
  readonly onSelectTile?: (col: number, row: number) => void;
  /**
   * The era the roads are surfaced for (D-ERA30). Defaults to the era the city is
   * currently wearing, so every existing caller keeps working unchanged.
   */
  readonly eraId?: EraId;
}

export function Roads({
  roads,
  preview,
  previewAffordable = true,
  selected = null,
  buildingCells = NO_BUILDING_CELLS,
  onSelectTile,
  eraId = CURRENT_ERA_ID,
}: RoadsProps) {
  const previewCells = useMemo(() => preview ?? [], [preview]);
  const surfacing = useMemo(() => roadSurfacing(eraId), [eraId]);
  const group = useMemo(
    () =>
      buildRoadsGroup(
        roads,
        previewCells,
        previewAffordable,
        selected,
        surfacing,
        buildingCells,
      ),
    [roads, previewCells, previewAffordable, selected, surfacing, buildingCells],
  );
  const pickY = surfacingStackTop(surfacing) + PICK_CLEARANCE;
  return (
    <>
      <primitive object={group} />
      {/* One invisible pick target per laid tile, filling its WHOLE cell — a hit is
          then unambiguous (the tile it belongs to is the cell it covers, not a guess
          from where the road surface happened to be struck) and the player does not
          have to land on the narrow strip. Only mounted when picking is enabled, so
          the layer is completely inert during placement and paint mode. Stopping
          propagation keeps the click off the "tapped empty ground" path, which would
          otherwise dismiss the selection in the very gesture that made it. */}
      {onSelectTile &&
        roads.map((cell) => {
          const { x, z } = cellCenter(cell.col, cell.row);
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: <mesh> is a react-three-fiber 3D object, not a DOM element. The whole canvas is aria-hidden decoration; the keyboard-operable road paint bar in CitySurface is the accessible way to remove tiles.
            <mesh
              key={roadCellKey(cell.col, cell.row)}
              position={[x, pickY, z]}
              geometry={PICK_GEO}
              material={PICK_MAT}
              onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                onSelectTile(cell.col, cell.row);
              }}
            />
          );
        })}
    </>
  );
}
