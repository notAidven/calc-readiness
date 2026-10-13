import type { EraId } from "@cr/skill-graph";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

import { CURRENT_ERA_ID } from "../eraDressing";
import {
  drawEraGroundPattern,
  type EraIslandDesign,
  INDUSTRIAL_LOCK,
} from "../islandDesign";
import {
  type FieldBoundaryKind,
  type FishTraps,
  type IslandGroundDressing,
  type IslandTerrainTones,
  islandGround,
  type SkidTrack,
  type ThreshingFloor,
  type WorkedPlotCrop,
  type WorkedPlotState,
} from "../islandGround";
import {
  ISLAND_SHORE_FACETS,
  ISLAND_SHORE_PROFILE,
  islandPolygonFactor,
  islandShoreY,
} from "../islandTopology";
import {
  buildableRadiusForLand,
  type CityLayout,
  GRID_CELL,
  ISLAND_GRASS_RADIUS,
  SURFACE_Y,
  walkableRadiusFor,
} from "../worldLayout";
import { disposeSceneGraph, useDisposableGraph } from "./disposeSceneGraph";
import { buildEvanCityIsland } from "./evanIslandGeometry";
import { batchStaticIslandGraph } from "./islandBatching";

/**
 * The starter island, dressed for THE ERA THE CITY IS STANDING IN.
 *
 * The ground re-dresses with the era — one of the four surfaces that still do after the
 * 2026-07-29 re-dressing ruling — and under **D-ERA32** it is the one that has to carry
 * the age, because it is the only large surface an advance changes. **This file had no era
 * concept at all until now**, so all ten eras rendered era one; `../islandGround.ts` holds
 * the per-era table, the ratified ladder and the deliberate fallback, and this component
 * paints whichever dressing the era resolves to.
 *
 * ## Era one, the ladder's floor
 *
 * A small island in calm, pale, shallow water, barely altered by the people on it:
 * dry tussock grass over packed earth, worn through to bare soil along the routes
 * they walk; sparse windblown trees, scrub and coarse grass at the margins; reeds in
 * the shallows. There is NO built water edge anywhere — the land shelves gradually
 * into coarse sand and gravel, with rounded boulders lying in loose clusters where
 * the water reaches, left rather than placed. A small hide boat is pulled up above
 * the waterline without a laid rock trail pointing to it.
 * The margins carry the camp's leavings: a fire-blackened stone ring, a lashed
 * drying rack, a midden gone grey, a scatter of pale flint chips.
 *
 * Nothing is planted, in rows or fenced, nothing flowers, and no stone meets the
 * water: cultivation is era two's premise, and mortar and metal are later still.
 *
 * ## An era with no authored ground: what changes and what does not
 *
 * The walking surface goes mid-value and low-chroma, and **era one's own dressing comes
 * off** — the camp, the landing and the worn routes those four explain are all gated on
 * {@link IslandGroundDressing.props}, so a prehistoric hide boat never sits on a
 * Early Modern island. Everything that is the ISLAND rather than an era's dressing stays:
 * the mass, the shelving shore, the lagoon, the boulder and gravel scatter, the wild margin
 * vegetation, and the grid. `../islandGround.ts` carries the argument for each half.
 *
 * The tile grid survives every re-dress on purpose: it is the affordance that tells a player
 * where a building can go, not a feature of the terrain, so no era has standing to remove it
 * — an era changes what the ground is made of, not what the player is allowed to see about
 * it. Its LINE is per-era, because a grid line is a relationship to its ground rather than a
 * colour (see `ERA_ONE_TERRAIN`).
 *
 * Built at the shared `worldLayout` coordinates (ground top at `SURFACE_Y`,
 * decoration in the margin OUTSIDE `BUILDABLE_RADIUS`) so the visible island and the
 * buildable grid agree, and at the SHIPPED island size: `ISLAND_GRASS_RADIUS` and
 * `SEA_RADIUS` set the camera's worst-case view distance and depth resolution falls
 * off with its square, so growing the island costs depth precision the road layer
 * needs (`depthPrecision.test.ts`). This is a re-skin, not a re-scale — an era re-dress
 * moves tones and props and never the geometry's extent. The static island is built once
 * per dressing (memoized, seeded) for stable geometry; only the gulls animate on the frame
 * loop, and they are motion-gated. Decorative (the canvas is `aria-hidden`).
 */

/**
 * ERA ONE'S OWN PROPS, in era one's own tones: the camp's leavings and the landing.
 *
 * These stayed here when the terrain palette moved to `../islandGround.ts`, and the split is
 * the point rather than a convenience. The terrain is what every island has and is therefore
 * per-era data; a fire-blackened stone ring on grey ash, hide over lashed timber, a midden of
 * shell and bone gone grey and pale flint chips are era one's authored content, drawn by the
 * geometry below and by nothing else. An era that has authored no props draws none of it.
 *
 * The flint chips keep the word deliberately: the era's material id was renamed `flint` →
 * `stone` on 2026-07-29, and these chips are an object on the ground rather than the resource.
 *
 * EXPORTED so the era guard derives its population from this table rather than transcribing
 * nine hex values into a test, where they would go stale the moment one moved.
 */
export const ERA_ONE_PROP_TONES = {
  stoneBurnt: 0x5b544a,
  ash: 0x8d8a82,
  hide: 0xa9835c,
  hideDark: 0x8a6845,
  timber: 0xa5825f,
  cord: 0x6d5a41,
  midden: 0xc2bcae,
  bone: 0xd3cdbe,
  flint: 0xdad6cb,
} as const;

/* -------------------------------------------------------------------------- */
/* The ground-decal ladder — why the island's flat detail stopped flickering    */
/* -------------------------------------------------------------------------- */

/**
 * A uniform step between any two near-coplanar ground surfaces, and the reason the
 * island's detail stopped flickering.
 *
 * The first era-one pass gave every flat thing its own ad-hoc offset, and several of
 * them collided: the worn earth and the footpaths BOTH sat 0.045 above the ground and
 * overlap each other by design, and the hearth's ash bed sat 0.005 above them. At the
 * furthest the camera can ever get, one resolvable depth step is about 0.0045 world
 * units, so a 0.005 gap is barely one step and an identical height is none at all —
 * which surface won was decided per pixel per frame. That is precisely the defect #152
 * fixed for the road stack, reintroduced on the ground plane, and #152's own
 * recommendation was a single uniform step of about this size.
 *
 * The step is sized to two constraints at once: comfortably more than one depth step at
 * the furthest view (it clears eleven), and low enough that the island's whole flat
 * detail stays UNDER the road stack's lowest surface, so the roads always sit above the
 * ground rather than interleaved with it. `groundDepth.test.ts` pins both, so neither a
 * new decal nor a wider camera can quietly walk it back.
 *
 * EXPORTED because the road stack now continues this same ladder rather than running a
 * second one of its own: `Roads.tsx` puts its first course on the next free rung above
 * the highest decal here, so there is ONE ladder over the whole ground plane and the two
 * systems cannot drift into each other's rungs (D-ERA30).
 */
export const GROUND_DECAL_STEP = 0.05;

/**
 * Where each ground decal's TOP face sits, as an offset above the surface it lies on.
 * Rungs, not free numbers — a new decal joins a rung or adds one, and nothing in this
 * file is allowed to invent a height between them.
 *
 * The rungs only have to separate surfaces that can OVERLAP IN PLAN, which is why the
 * grid texture is not on the ladder: it is drawn at `SURFACE_Y + 0.03` with
 * `depthWrite: false`, has a documented relationship to the road stack above it, and
 * fades to fully transparent by radius 24 — while every decal here sits outside 25. It
 * is left exactly where it shipped rather than folded in, because moving it would
 * perturb the roads to fix a collision that cannot happen.
 */
export const GROUND_DECAL_TOPS = {
  /** Worn bare earth and the footpaths, lying directly on the tussock. */
  worn: GROUND_DECAL_STEP,
  /** Loose material lying on worn ground: the hearth's ash, the slipway's gravel. */
  loose: GROUND_DECAL_STEP * 2,
} as const;

/**
 * Thickness of a ground decal. Only its top face is ever seen; the rest is bedded in.
 * Exported so a test can turn a mesh's CENTRE — which is what the scene graph holds — back
 * into the rung its top face is on, rather than pinning a rung by transcribing this number.
 */
export const DECAL_THICK = 0.16;

/** Centre Y for a decal whose top face should land `top` above the surface at `surface`. */
function decalCentre(surface: number, top: number): number {
  return surface + top - DECAL_THICK / 2;
}

/**
 * A distinct depth bias per decal, cycling over a short period.
 *
 * The ladder cannot solve the worst case on its own, because the worst offenders are
 * coplanar WITH EACH OTHER: a worn path is a run of deliberately overlapping lumps and
 * they all belong on one rung, so separating them by height would either stay inside a
 * single depth step or become a visible staircase. A bias is in depth-buffer units, so
 * one unit is always exactly one resolvable step however far out the camera is, and
 * neighbouring lumps drawing different biases means the winner is fixed rather than
 * re-decided as the camera orbits.
 */
export function decalBias(seq: number): number {
  return -1 - (seq % GROUND_DECAL_BIAS_CYCLE);
}

/**
 * How many distinct biases the cycle offers. Longer than any run of lumps that can
 * plausibly pile up on one spot, and short enough that the total bias stays negligible.
 */
export const GROUND_DECAL_BIAS_CYCLE = 6;

/**
 * How deep a lumpy object is BEDDED INTO the ground, so it reads as resting in the
 * surface rather than balanced on it. Not a surface height — `rock()` adds most of the
 * lump's own radius back on top — and named so it cannot be mistaken for one, which is
 * how two of these ended up looking like coplanar surfaces below the ground top.
 */
const ROCK_SEAT = 0.05;

/** Small deterministic RNG so the island's scatter is stable across renders. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mat(
  color: number,
  opts: {
    rough?: number;
    metal?: number;
    flat?: boolean;
    side?: THREE.Side;
    /**
     * Depth bias (factor + units) for a surface that lies near-coplanar with another.
     * Measured in units of the depth buffer's CURRENT resolution rather than in world
     * units, which is why it is the right tool for a decal: it tightens exactly where
     * precision is worst, at full zoom-out, and moves nothing geometrically. Negative
     * pulls a surface toward the camera. Same idiom the road curb uses (`Roads.tsx`).
     */
    polygonOffset?: number;
  } = {},
) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.9,
    metalness: opts.metal ?? 0.02,
    flatShading: opts.flat !== false,
  });
  if (opts.side !== undefined) {
    material.side = opts.side;
  }
  if (opts.polygonOffset !== undefined) {
    material.polygonOffset = true;
    material.polygonOffsetFactor = opts.polygonOffset;
    material.polygonOffsetUnits = opts.polygonOffset;
  }
  return material;
}

function cyl(
  g: THREE.Object3D,
  rt: number,
  rb: number,
  h: number,
  seg: number,
  color: number,
  x: number,
  y: number,
  z: number,
  flat = true,
) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, seg),
    mat(color, { flat }),
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function box(
  g: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/**
 * The prevailing wind, as a direction in world XZ plus the trunk lean it produces.
 * Every growing thing on the island leans with it — trees, scrub, tussock, reeds —
 * because that shared bias is what makes sparse vegetation read as WINDBLOWN rather
 * than merely thin. One constant so the whole island agrees about the weather.
 */
const WIND_X = 0.83;
const WIND_Z = -0.56;
const WIND_LEAN = 0.26;

/**
 * Island tree scale. A wind-sheared `tree(...)` stands ~2.15·s tall, so s in
 * [0.65, 1.0] → ~1.4–2.15u: LOW trees, per the era's "a few low wind-shaped trees
 * near the margins". They are scattered as a handful of copses rather than a ring.
 *
 * The ceiling is a CLEARANCE number as much as a stylistic one. A trunk stands
 * outside `BUILDABLE_RADIUS + 3` but a crown is wider than its trunk and is pushed
 * downwind of it, so the crown is what actually decides whether anything overhangs a
 * placement cell. At this scale, with the drift below, the innermost any canopy can
 * reach is ~22.9 — outside `BUILDABLE_RADIUS`, and further out than the shipped
 * island's larger crowns managed (~22.7) despite claiming otherwise in a comment.
 */
const TREE_SCALE_MIN = 0.65;
const TREE_SCALE_JITTER = 0.35;

/**
 * A single low-poly TREE-CANOPY geometry: an icosahedron whose UNIQUE vertices are
 * shoved around by a seeded displacement (keyed by rounded coords so every face
 * meeting a vertex shares one offset → the faceting stays crack-free) so each crown
 * is lumpy + irregular, never a clean symmetric blob. Same trick as
 * `boulderGeometry`, tuned a touch gentler so a canopy still reads leafy.
 */
function canopyGeometry(rng: () => number, radius: number): THREE.BufferGeometry {
  const detail = radius > 0.9 ? 2 : 1;
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const cache = new Map<string, [number, number, number]>();
  const v = new THREE.Vector3();
  const lateral = radius * 0.34;
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const key = `${Math.round(v.x * 1000)}:${Math.round(v.y * 1000)}:${Math.round(v.z * 1000)}`;
    let d = cache.get(key);
    if (!d) {
      const radial = (rng() - 0.5) * 0.62; // ±31% in/out lobes along the radius
      d = [
        v.x * radial + (rng() - 0.5) * lateral,
        v.y * radial + (rng() - 0.5) * lateral,
        v.z * radial + (rng() - 0.5) * lateral,
      ];
      cache.set(key, d);
    }
    pos.setXYZ(i, v.x + d[0], v.y + d[1], v.z + d[2]);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Lean an upright object downwind by `angle` radians (its local +Y tips with WIND). */
function leanDownwind(obj: THREE.Object3D, angle: number) {
  obj.rotation.z = -angle * WIND_X;
  obj.rotation.x = angle * WIND_Z;
}

/**
 * A low, wind-shaped tree: a trunk leaning downwind under a FLATTENED crown pushed
 * downwind of it, so the silhouette reads flagged by the weather rather than as a
 * ball on a stick. One dry foliage family, never a flower.
 */
function tree(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  x: number,
  z: number,
  y: number,
  s: number,
) {
  const pick = () => t.foliage[(rng() * t.foliage.length) | 0] ?? t.scrub;

  const trunk = cyl(g, 0.13 * s, 0.21 * s, 1.25 * s, 6, t.trunk, x, y + 0.58 * s, z);
  leanDownwind(trunk, WIND_LEAN * (0.7 + rng() * 0.6));

  // Irregular crown: a main clump plus 1–2 smaller lobes, each with a jittered
  // geometry, a free spin and a hard vertical squash (the wind shear) — so no two
  // canopies share a silhouette and none is a clean symmetric blob.
  const clump = (radius: number, cx: number, cy: number, cz: number) => {
    const m = new THREE.Mesh(canopyGeometry(rng, radius), mat(pick()));
    m.scale.set(0.86 + rng() * 0.4, 0.5 + rng() * 0.22, 0.86 + rng() * 0.4);
    m.rotation.set((rng() - 0.5) * 0.5, rng() * Math.PI * 2, (rng() - 0.5) * 0.5);
    m.position.set(cx, cy, cz);
    m.castShadow = true;
    g.add(m);
  };

  // Drift is kept short deliberately: the lean and the vertical squash carry the wind,
  // and a crown shoved far off its trunk buys little silhouette while spending all the
  // clearance the margin has (see TREE_SCALE_MIN).
  const drift = (0.4 + rng() * 0.25) * s;
  clump(1.05 * s, x + WIND_X * drift, y + 1.5 * s, z + WIND_Z * drift);
  const extra = 1 + ((rng() * 2) | 0); // 1–2 offset lobes for a lopsided outline
  for (let i = 0; i < extra; i += 1) {
    const off = drift + (0.3 + rng() * 0.3) * s;
    clump(
      (0.5 + rng() * 0.32) * s,
      x + WIND_X * off + (rng() - 0.5) * 0.34 * s,
      y + (1.42 + rng() * 0.5) * s,
      z + WIND_Z * off + (rng() - 0.5) * 0.34 * s,
    );
  }
}

/**
 * Low windblown scrub: two or three small lumps leaning together. Kept LUMPY rather
 * than flat — a single squashed canopy reads as a green plate lying on the ground from
 * the fixed 49° camera, which is the only angle anyone sees this from.
 */
function scrub(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  x: number,
  z: number,
  y: number,
  radius: number,
) {
  const lobes = 2 + ((rng() * 2) | 0);
  for (let i = 0; i < lobes; i += 1) {
    const r = radius * (0.6 + rng() * 0.45);
    const a = rng() * Math.PI * 2;
    const off = i === 0 ? 0 : radius * (0.35 + rng() * 0.4);
    const m = new THREE.Mesh(canopyGeometry(rng, r), mat(t.scrub));
    m.scale.set(1.0 + rng() * 0.3, 0.8 + rng() * 0.3, 0.92 + rng() * 0.26);
    m.rotation.set((rng() - 0.5) * 0.3, rng() * Math.PI * 2, (rng() - 0.5) * 0.3);
    m.position.set(
      x + Math.cos(a) * off + WIND_X * off * 0.4,
      y + r * 0.52,
      z + Math.sin(a) * off + WIND_Z * off * 0.4,
    );
    m.castShadow = true;
    g.add(m);
  }
}

/**
 * Bare soil worn through the tussock: several overlapping thin discs rather than one,
 * so the outline is irregular and it reads as ground that got walked on instead of a
 * tile laid down. Barely proud of the surface — a visible side wall is most of what
 * makes a flat patch look placed.
 */
function earthPatch(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  x: number,
  z: number,
  size: number,
  nextBias: () => number,
) {
  const lobes = 3 + ((rng() * 3) | 0);
  for (let i = 0; i < lobes; i += 1) {
    const a = rng() * Math.PI * 2;
    const off = i === 0 ? 0 : rng() * size * 0.8;
    const r = size * (0.42 + rng() * 0.4);
    wornLump(g, t, rng, x + Math.cos(a) * off, z + Math.sin(a) * off, r, nextBias());
  }
}

/**
 * A clump of blades leaning downwind — coarse tussock grass on the ground, and the
 * same shape drawn taller and thinner for the reeds standing in the shallows. Blades
 * cast no shadow: at this size the shadow is sub-pixel and the shadow pass is not.
 */
function blades(
  g: THREE.Object3D,
  rng: () => number,
  x: number,
  z: number,
  y: number,
  opts: { count: number; height: number; spread: number; tones: readonly number[] },
) {
  for (let i = 0; i < opts.count; i += 1) {
    const h = opts.height * (0.7 + rng() * 0.6);
    const tone = opts.tones[(rng() * opts.tones.length) | 0] ?? opts.tones[0] ?? 0xa8b850;
    const blade = cyl(
      g,
      0.016,
      0.07,
      h,
      4,
      tone,
      x + (rng() - 0.5) * opts.spread,
      y + h / 2,
      z + (rng() - 0.5) * opts.spread,
    );
    blade.castShadow = false;
    blade.receiveShadow = false;
    leanDownwind(blade, 0.18 + rng() * 0.34);
  }
}

/**
 * A single low-poly boulder GEOMETRY: an icosahedron whose vertices are shoved
 * around by a seeded random displacement so the silhouette is lumpy + irregular —
 * no clean sphere/icosahedron, no two rocks alike. Each UNIQUE vertex position
 * (keyed by its rounded coords) is displaced once and shared by every face that
 * meets there, so the faceting stays crack-free while flat shading keeps it
 * chunky. Bigger boulders get one subdivision (a few more facets); pebbles stay
 * coarse. Radius is baked in; per-axis squash/rotation is applied to the mesh.
 */
function boulderGeometry(rng: () => number, radius: number): THREE.BufferGeometry {
  const detail = radius > 0.24 ? 2 : 1;
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const cache = new Map<string, [number, number, number]>();
  const v = new THREE.Vector3();
  const lateral = radius * 0.3;
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const key = `${Math.round(v.x * 1000)}:${Math.round(v.y * 1000)}:${Math.round(v.z * 1000)}`;
    let d = cache.get(key);
    if (!d) {
      const radial = (rng() - 0.5) * 0.72; // ±36% in/out lumps along the radius
      d = [
        v.x * radial + (rng() - 0.5) * lateral,
        v.y * radial + (rng() - 0.5) * lateral,
        v.z * radial + (rng() - 0.5) * lateral,
      ];
      cache.set(key, d);
    }
    pos.setXYZ(i, v.x + d[0], v.y + d[1], v.z + d[2]);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * A natural, hand-modelled-looking cartoon boulder: a jittered low-poly lump
 * given non-uniform (per-axis) scaling — wider than tall, so it reads as a rock
 * resting on the ground rather than a floating gem — plus a free spin and a slight
 * tip, then seated a touch INTO the ground. `radius` is the boulder's rough size
 * (~0.1u pebble → ~0.5u boulder) — a natural shoreline scatter around the margin.
 * `tone` overrides the grey range for the lumps that are not rock: fire-blackened
 * hearth stones, shell and bone in the midden, pale flint chips.
 */
function rock(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  x: number,
  z: number,
  y: number,
  radius: number,
  tone?: number,
) {
  const grey = t.rockTones[(rng() * t.rockTones.length) | 0] ?? t.rockTones[0] ?? 0x8b93a0;
  const rk = new THREE.Mesh(
    boulderGeometry(rng, radius),
    mat(tone ?? grey, { rough: 0.98 }),
  );
  const sx = 1.0 + rng() * 0.45;
  const sy = 0.48 + rng() * 0.2; // squat: boulders sit lower than they are wide
  const sz = 1.0 + rng() * 0.45;
  rk.scale.set(sx, sy, sz);
  rk.rotation.set((rng() - 0.5) * 0.35, rng() * Math.PI * 2, (rng() - 0.5) * 0.35);
  rk.position.set(x, y + radius * sy * 0.62, z); // seat it, bottom slightly buried
  rk.castShadow = true;
  rk.receiveShadow = true;
  g.add(rk);
}

/**
 * The lagoon: a calm puck with a radial near→deep gradient baked into vertex colors.
 * The DIRECTION is the era's — pale at the shore, deepening outward — which is what
 * sells water shallow enough to see the bottom of near the land.
 */
export const ISLAND_LAGOON_MESH = "island-lagoon";

function buildSea(
  t: IslandTerrainTones,
  seaRadius: number,
  waterline: number,
  design: EraIslandDesign | null,
): THREE.Mesh {
  const R = seaRadius;
  const H = 4;
  const geo = new THREE.CylinderGeometry(R, R * 0.92, H, 64, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const count = pos.count;
  const cols = new Float32Array(count * 3);
  const near = new THREE.Color(t.shallows);
  const far = new THREE.Color(t.deepWater);
  const side = new THREE.Color(t.deepWater).multiplyScalar(0.9);
  const halfH = H / 2;
  for (let i = 0; i < count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let c: THREE.Color;
    if (y > halfH - 0.01) {
      const r = Math.min(1, Math.hypot(x, z) / R);
      c = near.clone().lerp(far, r ** 1.2);
    } else {
      c = side;
    }
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  const sea = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: design?.water.roughness ?? 0.5,
      metalness: design?.water.metalness ?? 0.05,
    }),
  );
  sea.position.y = waterline - halfH;
  sea.name = ISLAND_LAGOON_MESH;
  return sea;
}

/**
 * The name the grid mesh carries in the island group, so `placementGrid.test.ts` can find the
 * one mesh it is about without indexing into a group whose child order is
 * {@link buildIslandGroup}'s own business.
 *
 * A handle for the guard and nothing more: the grid's visibility is not a mode and no caller
 * gets to switch it, which is the whole of what that guard holds.
 */
export const PLACEMENT_GRID = "placement-grid";
export const ACTIVE_PLACEMENT_GRID = "active-placement-grid";

/**
 * How strongly the grid draws during normal exploration.
 *
 * Exported so the guard reads the shipped number rather than a second copy of it that agrees
 * today.
 *
 * ## Context-aware contrast
 *
 * The earlier 0.22 compromise still made a lattice over roughly two thirds of the land one of the
 * island's strongest fields. At rest this mesh now supplies only a quiet placement memory. While
 * placing or painting roads, `CityScene` mounts its complete high-contrast `BuildGrid` over the
 * same disc, so the actionable state does not depend on this low value.
 *
 * ⚑ **DO NOT SIZE THIS FROM A PIXEL DELTA.** Between 0.16 and 0.22 no pixel moves by more than
 * about 2 levels of 255, so on the numbers they are the same frame; to the eye one has cells
 * while placing and the other does not. A coherent lattice over a third of the screen is legible
 * far below the contrast a difference summary calls visible, which is why
 * `.cursor/rules/qa-verification.mdc` rules that a spatial claim owes a frame somebody LOOKED
 * at. A passing test is not evidence for this number, and neither is this docblock.
 */
export const PLACEMENT_GRID_OPACITY = 0.22;

/**
 * A subtle, PERSISTENT CoC-style cell grid on the buildable flat — thin lines baked
 * into a canvas texture, aligned to the FINE cell pitch (`GRID_CELL`) from the world
 * origin so the lines sit on cell boundaries and every placed building reads against
 * the dense grid. Radially faded to nothing before the shoreline so it never spills
 * onto the sand or the water.
 *
 * The grid SURVIVES the era re-dress on purpose: it is the affordance that tells a
 * player where a building can go, not a feature of the terrain, so no era has standing to
 * remove it — an era changes what the ground is made of, not what the
 * player is allowed to see about it.
 *
 * ## ⚑ PERSISTENT IS A RULING, NOT A DEFAULT — IT WAS GATED ONCE AND THE LEAD REVERSED IT
 *
 * #566 read *"an affordance is for
 * the moment it affords something"* off the paragraph above and hid this grid outside placement,
 * on the diagnosis that a grid over undressed ground is what makes a grown island read as an
 * unfinished build site. The lead, on the tree that shipped: *"dude wtf - where did the
 * grid/tiles go?? they need to still be in the game."*
 *
 * So the tiles are the ground a learner builds on and not a mode's furniture, and the emptiness
 * #566 measured — real, and still there; `islandBareInterior.test.ts` holds the numbers — is not
 * to be paid for out of them. `placementGrid.test.ts` pins the grid visible at every era so this
 * cannot be re-gated quietly a third time.
 *
 * ## ⚑ AND THEN THE STRENGTH WAS RULED ON SEPARATELY: SUBTLE, NOT ABSENT
 *
 * #636 put the grid back at the strength it had always drawn at, which is the strength the
 * *first* complaint was about. Shown that trade, the lead ruled for **two strengths** rather than
 * for either end: the ground shows its cells quietly at all times and brightens while a placement
 * is live. That is one number and one predicate, not a mechanism —
 * {@link PLACEMENT_GRID_OPACITY} carries the resting strength and the frames it was chosen from,
 * and `CityScene`'s drei `BuildGrid` is the brighter half, mounted on `placing || roadPainting`
 * as it has been since it was written. That one is the placement affordance; this one is the
 * ground. Neither is a flag on this component, and nothing reaches into the group to hide it,
 * which is what `placementGrid.test.ts` holds and what makes the strength safe to tune.
 *
 * Its COLOUR is PER-ERA and comes in on the dressing, because a grid line is a
 * RELATIONSHIP to its ground rather than a colour, and the ground moves. Era one's took
 * three passes and the third one was measured rather than guessed: the retired pairing — a
 * deep forest green on a vibrant green meadow — worked because the line was dark, the
 * ground had real chroma, and both sat in one hue family, so the line read as a crease in
 * the surface. Worn soil on a low-chroma khaki broke the second and third of those (it
 * measures 2.60:1, so contrast was never the problem — the drawn line landed 18° of hue
 * off its ground, and the ground had almost no chroma to carry it). A warm cream broke the
 * first outright by going lighter than the surface, at 1.45:1.
 *
 * `../islandGround.ts` carries each era's line with the pairing measured against that era's
 * own ground, which is the only place the number means anything. The pitch, the radial fade
 * and the opacity are shared and era-neutral, so the affordance is exactly as strong in
 * every era.
 */
function buildGrid(
  t: IslandTerrainTones,
  buildableRadius: number,
  opacity = PLACEMENT_GRID_OPACITY,
  active = false,
): THREE.Mesh {
  // An even CELL count centered on the origin → grid lines land on world
  // multiples of GRID_CELL, i.e. exactly the placement cell boundaries.
  //
  // ⚑ IT TAKES THE DISC, AND IT USED TO BE ERA ONE'S CONSTANT. `worldLayout.ts` used to argue
  // the split from this end — *"`buildGrid` is masked to `BUILDABLE_RADIUS` and stays there, so
  // nothing on screen offers a cell the placement path would refuse"* — and that was true while
  // the disc did not move. Now it does, so a grid left at 22 inverts the argument: the ground a
  // learner may build on would run sixteen units past the last line drawn on it, and the
  // affordance that says *"a building can go here"* would stop before the ground does.
  const cells = 2 * Math.ceil(buildableRadius / GRID_CELL) + 2;
  const span = cells * GRID_CELL;
  const ppc = 12; // canvas pixels per cell
  const size = cells * ppc;
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const g = cv.getContext("2d");
  if (g) {
    for (let k = 0; k <= cells; k += 1) {
      const p = Math.round(k * ppc) + 0.5;
      const section = active && k % 3 === 0;
      g.strokeStyle = section ? "rgba(242,193,78,0.96)" : t.gridLine;
      g.lineWidth = section ? 2.2 : active ? 1.65 : 1.4;
      g.beginPath();
      g.moveTo(p, 0);
      g.lineTo(p, size);
      g.stroke();
      g.beginPath();
      g.moveTo(0, p);
      g.lineTo(size, p);
      g.stroke();
    }
    // Radial mask: full inside, dissolved before the shoreline.
    g.globalCompositeOperation = "destination-in";
    const c = size / 2;
    const pxPerWorld = size / span;
    const full = (buildableRadius - 3) * pxPerWorld;
    const gone = (buildableRadius + 2) * pxPerWorld;
    const grad = g.createRadialGradient(c, c, full * 0.2, c, c, gone);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(Math.min(0.999, full / gone), "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(span, span),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = SURFACE_Y + 0.03;
  mesh.name = PLACEMENT_GRID;
  mesh.renderOrder = active ? 130 : 120;
  return mesh;
}

/** The complete, high-contrast grid used only while placing a building or painting a road. */
export function buildActivePlacementGrid(
  t: IslandTerrainTones,
  buildableRadius: number,
): THREE.Mesh {
  const mesh = buildGrid(t, buildableRadius, 0.72, true);
  mesh.name = ACTIVE_PLACEMENT_GRID;
  mesh.position.y = SURFACE_Y + 0.04;
  return mesh;
}

function islandTopShape(grassRadius: number, lockCutout: boolean): THREE.Shape {
  const shape = new THREE.Shape();
  const points: Array<readonly [number, number]> = [];
  const step = (Math.PI * 2) / SHORE_SEG;

  if (lockCutout) {
    const innerZ = grassRadius - INDUSTRIAL_LOCK.depth;
    const mouthZ = grassRadius - INDUSTRIAL_LOCK.halfWidth * Math.tan(Math.PI / SHORE_SEG);
    points.push(
      [-INDUSTRIAL_LOCK.halfWidth, -innerZ],
      [-INDUSTRIAL_LOCK.halfWidth, -mouthZ],
    );
    for (let index = 1; index < SHORE_SEG; index += 1) {
      const phi = -index * step;
      points.push([Math.sin(phi) * grassRadius, -Math.cos(phi) * grassRadius]);
    }
    points.push([INDUSTRIAL_LOCK.halfWidth, -mouthZ], [INDUSTRIAL_LOCK.halfWidth, -innerZ]);
  } else {
    for (let index = 0; index < SHORE_SEG; index += 1) {
      const phi = -index * step;
      points.push([Math.sin(phi) * grassRadius, -Math.cos(phi) * grassRadius]);
    }
  }

  const first = points[0];
  if (!first) {
    return shape;
  }
  shape.moveTo(first[0], first[1]);
  for (const point of points.slice(1)) {
    shape.lineTo(point[0], point[1]);
  }
  shape.closePath();
  return shape;
}

function buildEraGroundPattern(design: EraIslandDesign, grassRadius: number): THREE.Mesh {
  const span = grassRadius * 2;
  const cells = Math.ceil(span / GRID_CELL);
  const size = Math.max(256, Math.ceil(span * 8));
  const pixelsPerCell = size / cells;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    drawEraGroundPattern(context, design, size, cells, pixelsPerCell);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const geometry = new THREE.ShapeGeometry(
    islandTopShape(grassRadius, design.shoreline === "straight-docks"),
  );
  const position = geometry.getAttribute("position");
  const uv = new Float32Array(position.count * 2);
  for (let index = 0; index < position.count; index += 1) {
    uv[index * 2] = (position.getX(index) + grassRadius) / (grassRadius * 2);
    uv[index * 2 + 1] = (position.getY(index) + grassRadius) / (grassRadius * 2);
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: design.patternOpacity,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = SURFACE_Y + 0.015;
  mesh.name = `${design.sceneName}-ground-pattern`;
  mesh.userData.terrainSurface = true;
  return mesh;
}

/* -------------------------------------------------------------------------- */
/* The shore — a gradual gravel shelf, with no built edge anywhere             */
/* -------------------------------------------------------------------------- */

/**
 * Facet count for the island's stacked rings (a 9-gon reads properly low-poly). Exported for
 * the other authored island surfaces that must share its phase.
 */
export const SHORE_SEG = ISLAND_SHORE_FACETS;

/** How far the lagoon surface sits below the ground's top face. */
const WATER_DROP = 1.4;

/**
 * World Y of the lagoon's own top face.
 *
 * Exported because the crisis lays cold water and a freeze collar over this lagoon
 * (`winterScene.ts`) and had otherwise to guess at the height it meets — a guess that is
 * a z-fight at best and a floating ice shelf at worst. One number, one owner.
 */
export const WATERLINE_Y = SURFACE_Y - WATER_DROP;

/**
 * The shore SURFACE, as circum-radius offsets from the ground's edge paired with the
 * drop below `SURFACE_Y` at each. Three segments whose cone sides MEET, so the land
 * descends as one continuous ramp rather than a stack of courses, and the ramp is
 * CONCAVE — it leaves the ground almost imperceptibly (13°), tips over (26°), then
 * steepens into the water (41°), which is the profile a beach actually has. The
 * shipped island did the opposite: equal, clean, near-vertical steps that read as cut.
 *
 * It reaches `dr = 4`, exactly as far as the shipped skirt did, so the island's visible
 * footprint is unchanged — `ISLAND_GRASS_RADIUS` and `SEA_RADIUS` are load-bearing for
 * the camera's depth budget and neither this nor anything else here may grow them.
 *
 * One table, two consumers: `buildShore` derives ring geometry from consecutive pairs and
 * `shoreY` reads heights back out, so scatter cannot drift off its ground.
 */
export const SHORE_PROFILE = ISLAND_SHORE_PROFILE;

/** The shore surface height `dr` units of circum-radius outside the ground's edge. */
export const shoreY = islandShoreY;

/**
 * How far the faceted shore actually reaches at azimuth `phi`, as a fraction of a
 * ring's circum-radius: 1 at a facet CORNER, cos(π/9) at the middle of a flat side.
 * Scatter placed through this sits ON the facets instead of floating over the flats —
 * at this radius the 9-gon's corners stand ~1.8u proud of its sides, which is over half
 * the width of the whole shelf.
 *
 * The phase is not free to guess and was wrong once. `CylinderGeometry` lays its first
 * vertex at `theta = 0` and positions it `(r·sinθ, y, r·cosθ)`, so a CORNER sits on +Z
 * and `phi` is `atan2(x, z)` with corners at every multiple of `2π/9`. Wrapping `phi`
 * about the corners — rather than about the side midpoints — is therefore the whole
 * correctness condition here, and getting it a half-step out returns the minimum where
 * the maximum belongs: it floated shore scatter by up to 0.6u on the steep band while
 * agreeing perfectly with a harness that had copied the same mistake.
 *
 * Exported because later-era island surfaces and their authored props use the same facets.
 */
export const polyFactor = islandPolygonFactor;

/** A point on the shore surface at circum-radius `rc`, azimuth `phi`. */
function shorePoint(
  grassR: number,
  rc: number,
  phi: number,
): { x: number; y: number; z: number } {
  const d = rc * polyFactor(phi);
  return {
    x: Math.sin(phi) * d,
    y: SURFACE_Y + shoreY(rc - grassR),
    z: Math.cos(phi) * d,
  };
}

/** A point on the flat ground, `d` from the centre at azimuth `phi`. */
function flatPoint(d: number, phi: number): { x: number; z: number } {
  return { x: Math.sin(phi) * d, z: Math.cos(phi) * d };
}

/**
 * **THE SMALLEST `rc` A SHORE-ANCHORED PROP MAY TAKE AT AZIMUTH `phi` WITHOUT CROSSING THE
 * DECORATION FLOOR — the floor converted into the coordinate the shore families are authored in.**
 *
 * The shore scatters bound themselves inwards with a bare `grassR - 2.6`, which is a bound on
 * `rc` — a CIRCUM-radius, measured to the polygon's corners. {@link shorePoint} then multiplies
 * it by {@link polyFactor}, which runs from `cos(π/SHORE_SEG)` at a side's midpoint to `1` at a
 * corner, so the planar radius a prop actually lands at is up to 6% inside its own bound. The
 * decoration floor is a PLANAR radius, so the two are in different coordinates and the `rc`
 * bound does not enforce the floor.
 *
 * That was slack rather than a defect while the floor was era one's constant 25 and the shore
 * was 27.4 out: the gap absorbed the 6%. Once the floor follows the land, the two close. At the
 * growth-ceiling eras the band floor is 41 and the clusters start at `46 - 2.6 = 43.4`, whose
 * midpoint planar radius is `43.4 × 0.9397 = 40.78` — inside it. Measured before this clamp, one
 * pebble stood at **40.983** at every era from `classical` on.
 *
 * ## It clears the floor by a ROCK rather than by nothing
 *
 * Clamping to the floor exactly puts a stone's ORIGIN on it, and a stone is not its origin: the
 * body of a `0.39` boulder squashed to `1.45` reaches `0.57` further in, so the visible rock
 * would still cross a line its centre sat on. {@link SHORE_FLOOR_CLEARANCE} is that reach, which
 * is what makes *"nothing decorative reaches a cell a building could stand on"* a claim about
 * the decoration and not about the point it is positioned from.
 *
 * ## It binds where the arithmetic says it must, and era one cannot reach it
 *
 * The floor is `grassR - 5` and the clusters start at `grassR - 2.6`, so this can only bite once
 * `(grassR - 5 + 0.6) / cos(π/SHORE_SEG) > grassR - 2.6`, i.e. above a grass radius of about
 * **36.5**: eras two to ten. **Era one cannot reach it** — it would need a floor rc of
 * `25.6 / 0.9397 = 27.24` against a scatter that starts at `27.4` — which is why era one's
 * geometry digest is untouched, and `eraOneIslandUnchanged.test.ts` is where that is checked
 * rather than asserted here.
 */
function shoreFloorRc(marginIn: number, phi: number): number {
  return (marginIn + SHORE_FLOOR_CLEARANCE) / polyFactor(phi);
}

/**
 * How far a shore-cluster rock reaches from its own origin, so {@link shoreFloorRc} can hold the
 * ROCK off the decoration floor rather than the point it is placed at.
 *
 * The widest the family draws: a lead boulder is `0.26 + rng() * 0.13` and every rock takes an
 * `sx` of `1.0 + rng() * 0.45`, so `0.39 × 1.45 = 0.566` is its reach at the extreme of both.
 * Rounded up, and deliberately one number for the whole family rather than per prop — the
 * pebbles are a third of that and are held to the boulder's clearance, which costs a fifth of a
 * unit of beach and keeps the floor one rule.
 */
const SHORE_FLOOR_CLEARANCE = 0.6;

/* -------------------------------------------------------------------------- */
/* The decoration band, and why every offset below is a FRACTION of it         */
/* -------------------------------------------------------------------------- */

/** The band ALL of an island's decoration lives in, for an island of grass radius `grassR`. */
export interface MarginRing {
  /** The floor: nothing decorative may sit inside it. */
  readonly inner: number;
  /** The ceiling: nothing decorative may stand off the shore. */
  readonly outer: number;
}

/**
 * **THE BAND ALL DECORATION LIVES IN, AND BOTH ENDS FOLLOW THE ISLAND.**
 *
 * `inner` is the permanent perimeter no placement can ever claim — `walkableRadiusFor` of the
 * disc this island carries — so nothing decorative can reach a build cell. `outer` is where the
 * ground stops being flat: `buildShore` starts shelving at `grassR - 2.4`, so anything further
 * out is already tipping over.
 *
 * ## ⚑ `inner` FOLLOWS THE LAND, AND IT USED TO BE ERA ONE'S CONSTANT
 *
 * This read `BUILDABLE_RADIUS + 3` on the reasoning that *"it does NOT follow the island,
 * because the placement disc does not either"*. That premise was true when it was written and
 * is now false: `isCellBuildable` closed over era one's 22, which is the defect
 * {@link buildableRadiusForLand} closes, so the disc grows with the drawn land and the floor
 * under this band has to grow with it. Left on the constant, every era from two on would scatter
 * trees, scrub and boulders across ground a learner may build on — up to sixteen units of it at
 * the ceiling eras — and the floor this band exists to keep (*"nothing decorative reaches a cell
 * a building could stand on"*) would be measuring era one's island on era six's.
 *
 * **The coupling is exact rather than parallel.** `buildableRadiusForLand(grassR)` here is the
 * same derivation the standing island's placement gate uses.
 *
 * ## What that does to the ring's WIDTH, which is the thing #537 was fixing
 *
 * `islandLand.ts` derives an era's grass by ADDING `GRASS_OVER_BUILDABLE` (8) to its budget, and
 * this subtracts 8 and adds back the 3-unit walkable margin, so the ring is
 * `8 - 3 - 2.2` = **2.8 units at every era** — era one's own width, at the era's own radius.
 * The wide rings that motivated the two scale factors below (10.8 on era two, 18.8 at the
 * ceiling) were the symptom of a floor that had stopped following the land, so they are gone
 * with their cause, and `ringSpread` is now exactly `1` everywhere rather than only on era one.
 *
 * **The count half of #537 is untouched and still load-bearing.** A 2.8-unit ring at radius 41
 * is 1.6x the GROUND of a 2.8-unit ring at radius 25, so era one's five copses and twelve scrub
 * clumps laid out there are still an island getting sparser as it grows. {@link buildIslandGroup}
 * keeps scaling counts by band AREA and shore length by CIRCUMFERENCE; only the radial-offset
 * factors collapse to identity.
 */
export function marginRing(grassR: number): MarginRing {
  return { inner: walkableRadiusFor(buildableRadiusForLand(grassR)), outer: grassR - 2.2 };
}

/**
 * Era one's own ring — the one every radial offset in this file was authored against.
 *
 * Built by {@link marginRing} rather than written out, so the two can never come apart and the
 * era-one case stays an exact identity rather than an approximation.
 */
export const ERA_ONE_MARGIN_RING = marginRing(ISLAND_GRASS_RADIUS);

/** How much ground a decoration band covers, so a count over it can be read as a density. */
export function marginRingArea(ring: MarginRing): number {
  return Math.PI * (ring.outer ** 2 - ring.inner ** 2);
}

/**
 * The island's mass and its shelving shore: dry tussock ground, a worn earth verge,
 * coarse sand, then wet gravel running away under the water. Still five stacked rings,
 * but their steps are softened and unequal and their slopes join, so the edge reads
 * shelved rather than cut — and nothing anywhere on it was built.
 */
function buildShore(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  grassR: number,
  design: EraIslandDesign | null,
) {
  if (design && design.shoreline !== "partial-quay") {
    // Later islands no longer inherit the starter beach. Classical, Medieval and Industrial
    // stand on cut walls; Early Modern keeps a deliberately drawn embankment.
    cyl(g, grassR, 8, 20, SHORE_SEG, t.earthDeep, 0, SURFACE_Y - 13, 0);
    if (design.shoreline === "straight-docks") {
      const depth = 1.9;
      const land = new THREE.Mesh(
        new THREE.ExtrudeGeometry(islandTopShape(grassR, true), {
          depth,
          steps: 1,
          bevelEnabled: false,
          curveSegments: 1,
        }),
        mat(t.ground),
      );
      land.name = "industrial-notched-land";
      land.rotation.x = -Math.PI / 2;
      land.position.y = SURFACE_Y - depth;
      land.castShadow = true;
      land.receiveShadow = true;
      g.add(land);
      cyl(
        g,
        grassR + 0.2,
        grassR + 1.25,
        2.6,
        SHORE_SEG,
        t.gravelWet,
        0,
        WATERLINE_Y - 1.35,
        0,
      );
    } else if (design.shoreline === "curved-embankment") {
      cyl(g, grassR, grassR + 2.35, 1.72, SHORE_SEG, t.ground, 0, SURFACE_Y - 0.86, 0);
      cyl(
        g,
        grassR + 2.15,
        grassR + 3.15,
        2.5,
        SHORE_SEG,
        t.gravelWet,
        0,
        WATERLINE_Y - 1.05,
        0,
      );
    } else {
      cyl(g, grassR, grassR + 0.28, 1.9, SHORE_SEG, t.ground, 0, SURFACE_Y - 0.95, 0);
      cyl(
        g,
        grassR + 0.2,
        grassR + 1.25,
        2.6,
        SHORE_SEG,
        t.gravelWet,
        0,
        WATERLINE_Y - 1.15,
        0,
      );
    }
    return;
  }

  // The submerged mass. It never shows; it only has to stop the shore reading as a
  // floating disc where the lagoon meets it.
  cyl(g, grassR, 8, 20, SHORE_SEG, t.earthDeep, 0, SURFACE_Y - 13, 0);

  // Each ring tucks a little under the next ALONG THE SAME SLOPE, so the cone sides
  // join without a hairline gap and without leaving a flat lip wide enough to read as
  // a step.
  const OVERHANG = 0.15;
  // Outward: the tussock carries over the first gentle slope, then coarse sand, then
  // gravel darkening as it gets wetter. The grass does not stop at the shore, it thins
  // out on it.
  const tones = [t.ground, t.coarseSand, t.gravel] as const;
  for (let i = 1; i < SHORE_PROFILE.length; i += 1) {
    const a = SHORE_PROFILE[i - 1];
    const b = SHORE_PROFILE[i];
    if (!a || !b) {
      continue;
    }
    const footY = b.y + OVERHANG * ((b.y - a.y) / (b.dr - a.dr));
    cyl(
      g,
      grassR + a.dr,
      grassR + b.dr + OVERHANG,
      a.y - footY,
      SHORE_SEG,
      tones[i - 1] ?? t.ground,
      0,
      SURFACE_Y + (a.y + footY) / 2,
      0,
    );
  }

  // The drop-off into deeper water, starting just inside the shelf's toe and falling
  // away below the lagoon surface — so the shore never ends at an edge, it just runs
  // out of light.
  const toeDr = (SHORE_PROFILE[SHORE_PROFILE.length - 1]?.dr ?? 3.5) - OVERHANG;
  const toeY = shoreY(toeDr);
  cyl(
    g,
    grassR + toeDr,
    grassR + 4,
    toeY + 3.9,
    SHORE_SEG,
    t.gravelWet,
    0,
    SURFACE_Y + (toeY - 3.9) / 2,
    0,
  );
}

export const PREHISTORIC_HIDE_BOAT = "prehistoric-hide-boat";
export const PREHISTORIC_BOAT_PADDLE = "prehistoric-boat-paddle";

/**
 * Where boats land, and the whole of it: a small hide boat pulled up above the waterline.
 *
 * This replaces the shipped harbour, which was wrong for era one in every part — a
 * weathered stone abutment, a stepped shore threshold, courses of masonry with mortar
 * gaps kerbing the deck, a plank pier on pilings with railings, mooring bollards,
 * cargo and a lamp. Era one has no mortar, no dressed stone and no metal, and nothing
 * it builds meets the water at all.
 *
 * The former thirteen faceted patches plus ten loose pebbles made one diagonal chain from
 * the boat into the water at the shipped camera. They are retired by explicit user direction.
 * Their geometry is still built into an unattached sink and immediately disposed so the seeded
 * stream stays byte-for-byte aligned for the hearth, rack, midden and flint that follow; changing
 * that stream would move unrelated camp art while fixing this one location.
 */
function buildBoatLanding(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  grassR: number,
  nextBias: () => number,
) {
  const retiredRockTrail = new THREE.Group();
  const fromRc = grassR - 2.4; // far enough in to hold the radius-25 floor with its patches
  const toRc = grassR + 2.9; // a little way under the water
  const STEPS = 13;
  const bed = new THREE.Group();
  bed.name = "gravel-slipway-bed";
  for (let i = 0; i < STEPS; i += 1) {
    const along = i / (STEPS - 1);
    const rc = fromRc + (toRc - fromRc) * along;
    const y = SURFACE_Y + shoreY(rc - grassR);
    const tilt = Math.atan2(y - (SURFACE_Y + shoreY(rc + 0.5 - grassR)), 0.5);
    /*
     * One small patch per step, not two 1–3u overlapping seven-sided slabs. Those slabs tipped
     * with the shelf and presented their polygon faces to the city camera as the pale angular
     * pile in the public frame. The loose pebbles below still break the line into gravel.
     */
    const r = 0.26 + rng() * 0.14;
    const lump = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r * 1.12, DECAL_THICK, 7),
      mat(rng() < 0.5 ? t.gravel : t.coarseSand, { polygonOffset: nextBias() }),
    );
    lump.name = `slipway-bed-${i + 1}`;
    lump.position.set(
      (rng() - 0.5) * (1.4 - along * 0.5),
      decalCentre(y, GROUND_DECAL_TOPS.loose),
      rc + (rng() - 0.5) * 0.35,
    );
    lump.rotation.x = tilt; // bed it onto the ramp
    lump.scale.set(1 + rng() * 0.2, 1, 0.82 + rng() * 0.28);
    lump.receiveShadow = true;
    bed.add(lump);
  }
  retiredRockTrail.add(bed);

  // Loose gravel over and beside the track, dense on the walked line and thinning
  // either side, so the slipway has no edge either.
  for (let i = 0; i < 10; i += 1) {
    const rc = fromRc - 0.8 + rng() * (toRc + 2.0 - fromRc);
    const y = SURFACE_Y + shoreY(rc - grassR);
    rock(
      retiredRockTrail,
      t,
      rng,
      (rng() - 0.5) * 4.6,
      rc,
      y - ROCK_SEAT,
      0.07 + rng() * 0.13,
    );
  }
  disposeSceneGraph(retiredRockTrail);

  // The hide boat: hide stretched over a lashed frame, its gunwale ring showing and two
  // thwarts across it, hauled out on the flat above the shelf with a paddle beside it.
  // Proportion is doing real work here — a ROUND hull with ribs across it reads as a
  // cartwheel from the fixed overhead angle, and the wheel is era two's invention, so
  // the hull is stretched to about 2.4:1 and the thwarts sit off-centre.
  const seat = shorePoint(grassR, grassR - 1.8, 0.19);
  const boat = new THREE.Group();
  boat.name = PREHISTORIC_HIDE_BOAT;
  const hull = new THREE.Mesh(
    new THREE.CylinderGeometry(1.12, 0.8, 0.62, SHORE_SEG, 1, true),
    mat(ERA_ONE_PROP_TONES.hide, { rough: 0.95, side: THREE.DoubleSide }),
  );
  hull.castShadow = true;
  hull.receiveShadow = true;
  boat.add(hull);
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.8, 0.09, SHORE_SEG),
    mat(ERA_ONE_PROP_TONES.hideDark),
  );
  floor.position.y = -0.24;
  boat.add(floor);
  const gunwale = new THREE.Mesh(
    new THREE.TorusGeometry(1.12, 0.058, 4, SHORE_SEG),
    mat(ERA_ONE_PROP_TONES.timber),
  );
  gunwale.rotation.x = Math.PI / 2;
  gunwale.position.y = 0.3;
  boat.add(gunwale);
  for (const rz of [-0.62, 0.34]) {
    box(boat, 2.1, 0.07, 0.12, ERA_ONE_PROP_TONES.timber, 0, 0.24, rz);
  }
  boat.scale.set(0.72, 1, 1.72); // a long, narrow hull, stretched along its own axis
  boat.rotation.set(0.05, 1.5, 0.11); // lying along the shore, listing where it rests
  boat.position.set(seat.x, seat.y + 0.26, seat.z);
  g.add(boat);

  const paddle = new THREE.Group();
  paddle.name = PREHISTORIC_BOAT_PADDLE;
  const shaft = cyl(paddle, 0.045, 0.05, 1.9, 5, ERA_ONE_PROP_TONES.timber, 0, 0.06, 0);
  shaft.rotation.x = Math.PI / 2;
  box(paddle, 0.26, 0.05, 0.5, ERA_ONE_PROP_TONES.hideDark, 0, 0.06, 1.05);
  const rest = shorePoint(grassR, grassR - 2.6, 0.3);
  paddle.rotation.y = 0.5;
  paddle.position.set(rest.x, rest.y, rest.z);
  g.add(paddle);
}

/* -------------------------------------------------------------------------- */
/* The camp — the signs someone lives here, kept to the margins                */
/* -------------------------------------------------------------------------- */

/**
 * Where the camp's leavings sit: azimuths spread apart from one another and well away
 * from the landing at 0, at distances inside the margin band so none of them can land
 * on a placement cell. Two of them get walked to, so two of them get paths.
 *
 * `out` is HOW FAR INTO THE BAND, not a radius. These were bare radii — 26.6, 26.8, 26.9 — and
 * a bare radius is a distance from the island's centre, which is the one thing about the camp
 * that is not fixed: the ground it is pitched on runs out to 27.8 on era one and to 35.8 on era
 * two's island. `buildIslandGroup` puts each of them at the same fraction of whatever ring the
 * era has, so the camp stays in the margin instead of stranding itself at era one's old
 * shoreline — with its own worn paths running down to a landing that had moved eight units
 * further out. `marginIn + out` reproduces each of the four radii EXACTLY on era one's ring.
 */
const HEARTH = { phi: 2.35, out: 1.6 } as const;
const RACK = { phi: -2.05, out: 1.8 } as const;
const MIDDEN = { phi: 3.62, out: 1.9 } as const;
const FLINT = { phi: 1.2, out: 1.8 } as const;

/** A fire-blackened stone ring on grey ash, one charred log left across it. */
function hearthRing(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  x: number,
  z: number,
  bias: number,
) {
  // The ash bed lies ON the worn ground the track brings to the fire, so it takes the
  // `loose` rung above it rather than an offset of its own — it used to sit 0.005 above
  // the worn earth, which is one depth step and therefore a coin toss per pixel.
  const ash = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.02, DECAL_THICK, SHORE_SEG),
    mat(ERA_ONE_PROP_TONES.ash, { polygonOffset: bias }),
  );
  ash.position.set(x, decalCentre(SURFACE_Y, GROUND_DECAL_TOPS.loose), z);
  ash.receiveShadow = true;
  g.add(ash);
  const STONES = 8;
  for (let i = 0; i < STONES; i += 1) {
    const a = (i / STONES) * Math.PI * 2 + (rng() - 0.5) * 0.24;
    const r = 1.0 + (rng() - 0.5) * 0.18;
    rock(
      g,
      t,
      rng,
      x + Math.cos(a) * r,
      z + Math.sin(a) * r,
      SURFACE_Y - ROCK_SEAT,
      0.17 + rng() * 0.09,
      ERA_ONE_PROP_TONES.stoneBurnt,
    );
  }
  // One charred log left lying off-centre in the ash. Two of them cross, and two logs
  // crossed read as a drawn symbol rather than as something someone left behind. It rests
  // clear of the ash bed's top rather than in its plane — it is a round log, so its
  // silhouette is what reads, and nothing about it wants to be coplanar.
  const log = cyl(
    g,
    0.035,
    0.05,
    1.1,
    5,
    ERA_ONE_PROP_TONES.stoneBurnt,
    x - 0.16,
    SURFACE_Y + GROUND_DECAL_TOPS.loose + 0.05,
    z + 0.2,
  );
  log.rotation.set(0, 0.42, Math.PI / 2);
}

/** A lashed drying rack: two A-frames under one ridge pole, hides over it. */
function dryingRack(g: THREE.Object3D, x: number, z: number, spin: number) {
  const rack = new THREE.Group();
  for (const sx of [-0.9, 0.9]) {
    for (const lean of [-1, 1]) {
      const leg = cyl(
        rack,
        0.06,
        0.085,
        2.0,
        5,
        ERA_ONE_PROP_TONES.timber,
        sx,
        0.95,
        lean * 0.42,
      );
      leg.rotation.x = -lean * 0.4; // feet splayed out, apex converging on z = 0
    }
    const lash = cyl(rack, 0.1, 0.1, 0.2, 6, ERA_ONE_PROP_TONES.cord, sx, 1.8, 0);
    lash.rotation.z = Math.PI / 2;
  }
  const pole = cyl(rack, 0.07, 0.07, 2.5, 5, ERA_ONE_PROP_TONES.timber, 0, 1.78, 0);
  pole.rotation.z = Math.PI / 2;
  const skin = box(rack, 1.4, 0.07, 1.1, ERA_ONE_PROP_TONES.hide, -0.34, 1.66, 0.02);
  skin.rotation.x = 0.07;
  box(rack, 0.8, 0.06, 0.9, ERA_ONE_PROP_TONES.hideDark, 0.72, 1.7, -0.04);
  rack.rotation.y = spin;
  rack.position.set(x, SURFACE_Y, z);
  g.add(rack);
}

/** A midden of shell and bone gone grey: heaped toward the middle, and unarranged. */
function middenHeap(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  x: number,
  z: number,
) {
  for (let i = 0; i < 8; i += 1) {
    const a = rng() * Math.PI * 2;
    const r = rng() ** 0.6 * 1.3;
    rock(
      g,
      t,
      rng,
      x + Math.cos(a) * r,
      z + Math.sin(a) * r,
      SURFACE_Y - ROCK_SEAT + 0.3 * (1 - r / 1.45),
      0.09 + rng() * 0.1,
      rng() < 0.45 ? ERA_ONE_PROP_TONES.bone : ERA_ONE_PROP_TONES.midden,
    );
  }
}

/** A scatter of pale flint chips, where someone sits and works. */
function flintScatter(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  x: number,
  z: number,
) {
  for (let i = 0; i < 7; i += 1) {
    const a = rng() * Math.PI * 2;
    const r = rng() * 1.45;
    rock(
      g,
      t,
      rng,
      x + Math.cos(a) * r,
      z + Math.sin(a) * r,
      SURFACE_Y - ROCK_SEAT,
      0.05 + rng() * 0.06,
      ERA_ONE_PROP_TONES.flint,
    );
  }
}

/**
 * One worn-through lump of a path or a bare patch, on the `worn` rung of the ladder and
 * carrying its own depth bias — these lumps overlap each other by design, so the bias is
 * what stops the overlap being re-decided every time the camera moves.
 */
function wornLump(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  x: number,
  z: number,
  r: number,
  bias: number,
): void {
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r * 1.1, DECAL_THICK, 7),
    mat(rng() < 0.4 ? t.earthWorn : t.earth, { polygonOffset: bias }),
  );
  disc.position.set(x, decalCentre(SURFACE_Y, GROUND_DECAL_TOPS.worn), z);
  disc.scale.set(1, 1, 0.7 + rng() * 0.5);
  disc.rotation.y = rng() * Math.PI;
  disc.receiveShadow = true;
  g.add(disc);
}

/**
 * A path that appeared from USE rather than being laid: overlapping unequal lumps of
 * soil worn through the tussock, wandering either side of the line people actually walk
 * and breaking wherever the grass held on.
 *
 * It runs ALONG the margin rather than in and out of it, which is both truer and the
 * only shape that fits: people move between the fire, the rack, the midden and the boat,
 * and all four of those are in the margin. A radial spur would have to start inside
 * `BUILDABLE_RADIUS + 3` to look like it came from anywhere, and the floor is a veto
 * rather than a guideline — it holds for ground-flat decals too, not just for things
 * with height.
 */
function wornArc(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  d: number,
  phiFrom: number,
  phiTo: number,
  width: number,
  nextBias: () => number,
) {
  const sweep = Math.abs(phiTo - phiFrom);
  const steps = Math.max(2, Math.round((sweep * d) / 2.6));
  for (let i = 0; i <= steps; i += 1) {
    if (rng() < 0.26) {
      continue; // the track wears through unevenly; grass survives in patches
    }
    const phi = phiFrom + ((phiTo - phiFrom) * i) / steps;
    const at = flatPoint(d + (rng() - 0.5) * 0.8, phi);
    wornLump(g, t, rng, at.x, at.z, width * (0.42 + rng() * 0.3), nextBias());
  }
}

/** How many plots era two's island carries. The guide's own count: *"a dozen or so"*. */
export const WORKED_PLOT_COUNT = 12;

/**
 * HOW BIG A WORKED PLOT IS, and it is decided by the ring rather than by taste — by the ring
 * **THIS ERA'S ISLAND ACTUALLY HAS**, which is the whole of the correction.
 *
 * ## The defect this replaces, and it was a constant standing in for a measurement
 *
 * This was two numbers, `0.8` and `0.35`, with the derivation written beside them: *"every
 * island decal is held outside radius 25 and inside `islandRadius - 2.2`, which leaves the
 * margin 2.8u wide — so a plot that keeps the floor at both ends cannot be wider than this."*
 * The derivation is right and the numbers are era one's, because **2.8u is era one's margin**:
 * `ISLAND_GRASS_RADIUS` is 30, so `30 - 2.2 - 25` is 2.8.
 *
 * **Era two's island is not era one's island.** `islandLand.ts` draws era two's ground at grass
 * **38** (its authored buildable 30 plus the island's own 8u margin), so the ring era two's
 * fields are actually laid in is **10.8u wide** and a plot may be almost four times as wide as
 * the constant allowed. The result on screen was a dozen 2u smudges in an eleven-unit apron,
 * where era two's guide asks for an island that *"reads in two families for the first time:
 * ground somebody has broken, and ground nobody has touched"* — and whose furrow rule (*"no two
 * adjacent plots are furrowed the same way, which is what stops a dozen fields reading as one
 * striped carpet"*) only means anything about plots big enough to run into each other.
 *
 * ## Two fits, and only the first of them ever bound on era one's narrow ring
 *
 *  - **RADIALLY**, a plot's own reach must clear the radius-25 floor at one end and the shore at
 *    the other. That is the original derivation, kept exactly: `(ring - clearance) / 2·1.06`,
 *    where 1.06 is the lobe cylinder's flare and {@link WORKED_PLOT_RING_CLEARANCE} is the slack
 *    the shipped numbers left. On era one's 2.8u ring it returns **1.151**, which is the `1.15`
 *    this replaces;
 *  - **ALONG THE RING**, a dozen plots must not merge into one continuous band. Each plot has
 *    `2π·r̄ / 12` of circumference to itself, and its own longest form — three lobes stepping
 *    along — is `(2·1.06 + 2·0.85)·r`. On a 2.8u ring the radial fit was 2.7x tighter than this
 *    and it never bound, which is why the constant it replaced never had to state it.
 *
 * The size is the SMALLER, so the rule is the same rule at both ends of the ladder. Era one's
 * ring returns the shipped numbers to three decimal places; era two's returns a plot about 3x
 * wider, and `eraTwoGround.test.ts` measures both.
 */
export const WORKED_PLOT_LOBE_EDGE = 1.06;

/**
 * The slack the plots leave inside the ring, in world units, so a lobe's edge is not exactly on
 * the floor. Read back off the shipped numbers rather than chosen: `2.8 - 2·1.15·1.06`.
 */
export const WORKED_PLOT_RING_CLEARANCE = 0.36;

/**
 * How much of the ring's circumference stays UNTOUCHED TUSSOCK between one plot and the next.
 *
 * *"The island reads in two families … ground somebody has broken, and ground nobody has
 * touched"*, and the untouched family is *"era one's exactly"*. So the lane is what the second
 * family is made of along the ring, and it is also where the field boundaries stand — they
 * *"divide plots from each other"*, which needs somewhere between two plots to stand in.
 *
 * A quarter, which leaves each plot three quarters of its own arc and the ring a lane about 4u
 * wide at era two's radius — wider than a plot's own lobe, so a boundary reads as sitting
 * between two fields rather than as jammed against one.
 */
export const WORKED_PLOT_LANE = 0.25;

/** How much smaller the smallest lobe is than the largest — *"they are not the same size"*. */
export const WORKED_PLOT_LOBE_SPREAD = 0.7;

/** The most lobes a plot is drawn from, and how far each steps along the ring, as fractions. */
export const WORKED_PLOT_LOBES_MAX = 3;
export const WORKED_PLOT_LOBE_STEP = 0.85;

/**
 * How far apart two furrows are across a plot, in world units — *"a fine-pitched corrugation
 * catching one tone step"*.
 *
 * A PITCH rather than a count, because how finely somebody hoes is a fact about the hoe and not
 * about the size of the field. Read back off the shipped geometry: four ridges across `r · 1.5`
 * of a lobe in the middle of era one's own band.
 */
export const FURROW_PITCH = 0.37;

/**
 * How wide one block of standing cereal is against the crop's own height.
 *
 * Read back off the shipped stand rather than chosen: on era one's ring a lobe sits at about
 * `0.978` and drew blocks of `r · (0.34..0.54)`, so a block is about `0.43u` across the middle
 * of its range against a `0.72u` crop. Restating it per HEIGHT is what makes it survive a plot
 * three times as wide — a block shows its stalk sides because of how wide it is against how
 * TALL it is, and the height is authored (see {@link WorkedPlotCrop}).
 */
export const BLOCK_WIDTH_PER_HEIGHT = 0.5972;

/**
 * How far apart the blocks of one stand are laid, as a multiple of a block's own mid width.
 *
 * A COVERAGE argument rather than a look: the guide's crop is *"dense, hiding the soil
 * entirely"*, and discs of radius `w` on a lattice of pitch `p` leave bare ground unless
 * `p < w·√π ≈ 1.77w`. At `1.5` every block overlaps its neighbours with room for the jitter
 * and the radius spread on top, so a stand of any width covers the plot it stands on.
 */
export const BLOCK_PITCH_PER_WIDTH = 1.5;

/**
 * Spacing of the loose stalks round a stand's rim.
 *
 * Twice the spacing the shipped seven gave (`2π · 0.978 · 0.9 / 7`), because the rim is the one
 * part of the stand whose job is already half done by something else: the blocks are spread over
 * the lobe's AREA rather than crowded into its middle, so a wide stand already has an irregular
 * edge before a stalk is drawn. Held at seven as a floor, so a small stand is unchanged.
 */
export const RIM_PITCH = 1.58;

/** The size band a plot's lobes are drawn from, for one era's ring. */
export interface WorkedPlotSize {
  readonly lobeMin: number;
  readonly lobeMax: number;
}

/**
 * The plot size for the ring between `marginIn` and `marginOut` — see
 * {@link WORKED_PLOT_LOBE_EDGE} for the two fits and why only one of them used to bind.
 */
export function workedPlotSize(
  marginIn: number,
  marginOut: number,
  count: number = WORKED_PLOT_COUNT,
): WorkedPlotSize {
  const ring = Math.max(0, marginOut - marginIn);
  const radialFit = (ring - WORKED_PLOT_RING_CLEARANCE) / (2 * WORKED_PLOT_LOBE_EDGE);
  // `2π·r̄ / count` with the ring's mean radius, which is `(marginIn + marginOut) / 2`.
  const share = (Math.PI * (marginIn + marginOut)) / count;
  const longest =
    2 * WORKED_PLOT_LOBE_EDGE + (WORKED_PLOT_LOBES_MAX - 1) * WORKED_PLOT_LOBE_STEP;
  const arcFit = (share * (1 - WORKED_PLOT_LANE)) / longest;
  const lobeMax = Math.max(0, Math.min(radialFit, arcFit));
  return { lobeMin: lobeMax * WORKED_PLOT_LOBE_SPREAD, lobeMax };
}

/**
 * THE WORKED GROUND IS ONE NAMED SUBTREE, with a named group per surface inside it.
 *
 * Not decoration for a test: the alternative was a guard that told a crop stand from a furrow
 * ridge from a picked stone by sniffing geometry parameters and tone, which is a description of
 * today's meshes rather than of what they ARE — it would pass over a stand drawn at the wrong
 * height as readily as a correct one, and go stale the first time a radius changed.
 *
 * Naming the subtree makes the renderer DECLARE what it drew, so `eraTwoGround.test.ts` can
 * partition by surface and then measure each one's own properties independently. The partition
 * cannot hide anything either: the guard asserts every mesh under this group carries one of these
 * names, so a surface added without a name fails rather than going unchecked.
 */
export const WORKED_GROUND_GROUP = "era2-worked-ground";

/** The surfaces inside {@link WORKED_GROUND_GROUP}, one named group each. */
export const WORKED_SURFACES = {
  plotSoil: "plot-soil",
  furrowRidge: "furrow-ridge",
  cropStand: "crop-stand",
  cropRim: "crop-rim",
  clearanceStone: "clearance-stone",
  brushwoodStake: "brushwood-stake",
  brushwoodBrush: "brushwood-brush",
  ditchScratch: "ditch-scratch",
  ditchSpoil: "ditch-spoil",
  threshingFloor: "threshing-floor",
  threshingHusk: "threshing-husk",
  threshingSledge: "threshing-sledge",
} as const;

/**
 * Draw into a named child group of `parent`, creating it on first use.
 *
 * The shared drawing helpers (`rock`, `scrub`, `blades`, `cyl`, `box`) add straight to whatever
 * object they are handed, so routing them through the right group is how their output gets
 * labelled without changing any of their signatures.
 */
function surfaceGroup(parent: THREE.Object3D, name: string): THREE.Object3D {
  const existing = parent.children.find((child) => child.name === name);
  if (existing) {
    return existing;
  }
  const group = new THREE.Group();
  group.name = name;
  parent.add(group);
  return group;
}

/**
 * ONE PLOT OF WORKED GROUND: two or three overlapping lobes in a single state's soil, so the
 * outline is irregular and *"no two are the same shape"* rather than a disc somebody stamped.
 *
 * On the ladder's EXISTING `worn` rung, which is where it belongs on the fiction as well as on
 * the arithmetic: a broken plot lies directly on the tussock exactly as a worn patch does, and
 * a new rung above `loose` would breach the decal ceiling `groundDepth.test.ts` holds
 * (`SURFACE_Y + 0.11`). Sharing a rung is safe for the reason the rung was built that way —
 * every lobe takes its own bias out of the one shared cycle, which is what fixes the winner
 * between surfaces that overlap by design.
 */
function workedPlot(
  g: THREE.Object3D,
  rng: () => number,
  d: number,
  phi: number,
  state: WorkedPlotState,
  /** The plot's index round the ring — furrow direction is derived from it. See below. */
  index: number,
  size: WorkedPlotSize,
  /**
   * How far a lobe may wander in and out of the plot's own radius, in world units.
   *
   * ZERO on a ring with nothing to spare, which is what era one's 2.8u margin was: the
   * caller's own budget decides it, so the radius-25 floor is held by construction rather
   * than by a check here. What it buys on a ring that HAS room is the guide's *"irregular in
   * outline … no two are the same shape"* — a chain of lobes all at one radius is a bar, and
   * a plot argued *"from the slope and from where the stones ran out"* is not a bar.
   */
  wander: number,
  nextBias: () => number,
): void {
  const soilGroup = surfaceGroup(g, WORKED_SURFACES.plotSoil);
  const lobes = 2 + ((rng() * 2) | 0);
  for (let i = 0; i < lobes; i += 1) {
    const r = size.lobeMin + rng() * (size.lobeMax - size.lobeMin);
    // The lobes step ALONG the margin rather than across it, which `wornArc` does for the same
    // reason: a field lies along the ring it is in. The plot's radial extent is therefore one
    // lobe's plus `wander`, which is the budget the caller measured off this era's own ring.
    const along = (i - (lobes - 1) / 2) * (r * WORKED_PLOT_LOBE_STEP);
    const dr = d + (rng() - 0.5) * wander;
    const at = flatPoint(dr, phi + along / dr);
    const lobe = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r * WORKED_PLOT_LOBE_EDGE, DECAL_THICK, 7),
      mat(state.soil, { polygonOffset: nextBias() }),
    );
    lobe.position.set(at.x, decalCentre(SURFACE_Y, GROUND_DECAL_TOPS.worn), at.z);
    lobe.rotation.y = rng() * Math.PI;
    lobe.receiveShadow = true;
    soilGroup.add(lobe);

    // WHAT IS ON THE LOBE. A state is furrowed, or sown, or neither — never both: the guide
    // furrows ground that has just been turned and sows ground that has finished being turned.
    if (state.furrow !== undefined) {
      furrowLobe(g, rng, at.x, at.z, r, state.furrow, index);
    }
    if (state.crop !== undefined) {
      cropStand(g, rng, at.x, at.z, r, state.crop, state.soil);
    }
  }
}

/**
 * FURROWS ACROSS ONE LOBE — *"short, shallow, crooked and interrupted"*, hoed rather than
 * ploughed, so they *"stop where a stone was and resume past it"* and *"follow the plot's
 * outline rather than running its full length."*
 *
 * ## Why these are RELIEF and not decals, which is the depth decision in this pass
 *
 * A furrow lies ON a plot, so drawn as a flat decal it would be exactly coplanar with the
 * plot's own top face — the identical-height pair that took days to diagnose the last time it
 * shipped. The ladder cannot separate them either: its step is UNIFORM by assertion, so there
 * is no rung between `worn` and `loose` to move into, and a rung above `loose` would breach the
 * decal ceiling at `SURFACE_Y + 0.11`.
 *
 * So a furrow is drawn as what it physically is — a ridge of turned soil with HEIGHT, bedded
 * into the plot so its underside is buried and only its crown and flanks are ever seen.
 * **Nothing here needs a rung, because a ridge is a SOLID and the ladder is about coplanar
 * faces.** A box crossing the `loose` plane intersects it, which renders correctly; what cannot
 * happen is two horizontal faces at one height, and this ridge's crown sits at 0.125 where no
 * rung is. The ladder itself is untouched, so `groundDepth.test.ts`'s uniform 0.05u step and its
 * 11.04 depth steps of headroom both stand exactly as they were.
 *
 * ## What the ridge has to be to be SEEN, measured rather than guessed
 *
 * The first pass drew these 0.11u wide and 0.04u tall and they were **invisible** in a rendered
 * frame — not subtle, absent. At the shipped framing the island spans roughly 12 screen pixels
 * per world unit, so that ridge was about one pixel across and fell below the rasteriser. The
 * guide's own description says what to spend it on: *"at the fixed ~49° camera a furrow is a
 * fine-pitched corrugation catching one tone step"* — so the thing that must survive is the TONE
 * STRIPE rather than the relief, and a stripe needs width. At 0.18u it is about two pixels and
 * reads; the height then only has to be enough to catch the light, and 0.09u is ~11cm against a
 * hut's 3m, which is what a hoed furrow actually is.
 *
 * ## The direction is derived from the plot's index, not rolled
 *
 * *"No two adjacent plots are furrowed the same way, which is what stops a dozen fields reading
 * as one striped carpet."* A random heading per plot cannot promise that — two neighbours can
 * roll the same angle. Stepping the heading by a third of a turn per plot guarantees it, and
 * the small jitter on top keeps the field from reading as a survey.
 */
function furrowLobe(
  g: THREE.Object3D,
  rng: () => number,
  x: number,
  z: number,
  r: number,
  tone: number,
  index: number,
): void {
  const ridges = surfaceGroup(g, WORKED_SURFACES.furrowRidge);
  const RIDGE_H = 0.09;
  const RIDGE_W = 0.18;
  // THE PITCH IS THE AUTHORED QUANTITY, NOT THE COUNT. *"At the fixed ~49° camera a furrow is a
  // fine-pitched corrugation"*, and how finely a person hoes is a fact about the hoe rather
  // than about how big the field is — so a wider lobe gets MORE furrows at the same spacing
  // rather than four furrows spread further apart. `FURROW_PITCH` is the spacing the shipped
  // four gave across era one's own lobe, so a plot on that ring still draws about four.
  const RIDGES = Math.max(4, Math.round((r * 1.5) / FURROW_PITCH));
  /** Crown height above the surface the plot lies on. Not a rung: see the docblock. */
  const RIDGE_CROWN = GROUND_DECAL_TOPS.worn + 0.075;
  const heading = (index % 3) * (Math.PI / 3) + (rng() - 0.5) * 0.2;
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  for (let i = 0; i < RIDGES; i += 1) {
    // Offset across the heading, so the ridges run parallel down the lobe.
    const across = ((i - (RIDGES - 1) / 2) / RIDGES) * r * 1.5;
    // A chord of the lobe at this offset, shortened so the ridge dies inside the outline.
    const half = Math.sqrt(Math.max(0, r * r - across * across)) * 0.82;
    if (half < 0.16) {
      continue;
    }
    // INTERRUPTED: two segments with a gap where a stone was, and one of the two sometimes
    // missing outright, so a lobe never reads as a full set of parallel lines.
    for (const side of [-1, 1] as const) {
      if (rng() < 0.18) {
        continue;
      }
      const len = half * (0.6 + rng() * 0.5);
      const mid = side * (half - len / 2);
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(RIDGE_W, RIDGE_H, len), mat(tone));
      ridge.position.set(
        x - sin * across + cos * mid,
        // Bedded, so the underside is inside the plot decal's own thickness and only the crown
        // and its flanks are ever seen.
        SURFACE_Y + RIDGE_CROWN - RIDGE_H / 2,
        z + cos * across + sin * mid,
      );
      // Crooked rather than straight — hoed by hand, and never twice the same.
      ridge.rotation.y = -heading + (rng() - 0.5) * 0.22;
      ridge.receiveShadow = true;
      ridges.add(ridge);
    }
  }
}

/**
 * A STAND OF STANDING CEREAL — the fourth plot state, and the only tall ground surface on the
 * island.
 *
 * ## The flat top is the authored read, so it is one block and not a scatter
 *
 * *"Tall, pale and gone to seed head at the top … this is the only vegetation on the island with
 * a flat top, and that flatness at zoom-out is what reads as crop before any detail resolves."*
 * A field of individually jittered stalks would destroy exactly that, and at ~250 stalks a plot
 * it would also double the island's mesh count for a read the guide says arrives at distance. So
 * the stand is ONE many-sided block per lobe with a material per face group — seed head on the
 * top, stalk down the sides — which is the one shape that guarantees the flat pale top from
 * every azimuth the camera can orbit to.
 *
 * The rim then gets loose stalks so the silhouette is not a drum: those are free to jitter,
 * because a broken edge is what the block's crisp one needs and the flat read lives in the top
 * face rather than in the outline.
 *
 * ## Why it cannot z-fight, poke through a building, or flicker at distance
 *
 * It is not a ladder surface at all: its top face stands 0.62u up, six times the whole decal
 * ladder's height, and its underside is bedded below the plot it stands on so no face of it is
 * coplanar with anything. In plan it is inside its own lobe, which the ring keeps outside radius
 * 25 — buildings and roads are inside 22 — so there is nothing for it to intersect. And it is
 * shorter than the island's own trees (1.4–2.15u) standing in the same ring, so it cannot be the
 * thing that occludes the buildable disc.
 */
function cropStand(
  g: THREE.Object3D,
  rng: () => number,
  x: number,
  z: number,
  r: number,
  crop: WorkedPlotCrop,
  soil: number,
): void {
  // Bedded by this much, so a block's underside is inside the plot decal's own thickness.
  const BED = 0.06;
  const stands = surfaceGroup(g, WORKED_SURFACES.cropStand);
  // SEVERAL OVERLAPPING BLOCKS rather than one, which is the fix for the first pass's
  // read: a single cylinder was a clean pale disc from above and looked like a drum somebody
  // had set down. Overlapping blocks of unequal radius break the outline in plan while their
  // tops stay within 4% of each other, so the flat top — the thing the guide says carries the
  // crop at distance — survives having an irregular edge.
  //
  // A BLOCK'S WIDTH IS TIED TO THE CROP'S HEIGHT AND NOT TO THE PLOT'S, which is what lets the
  // plot grow without the stand turning back into the pale lid the frames rejected: what makes
  // a block show its stalk sides at a 49° camera is how wide it is against how TALL it is, and
  // the height is authored — *"to knee or waist height"*, against a person standing beside it.
  // So a wider plot gets more blocks of the same proportion rather than fewer, fatter ones, and
  // the count is what the lobe's own area asks for.
  //
  // AND THEY ARE LAID ON A JITTERED LATTICE, NOT SCATTERED, which is the third correction the
  // frames forced and the one a bigger plot made necessary. *"Dense, hiding the soil
  // entirely"* is a coverage claim, and blocks dropped at random over a lobe three times the
  // width leave gaps at exactly the rate a Poisson scatter does — photographed at that
  // spacing the stand read as pale lumps sitting on bare soil rather than as a crop. A lattice
  // at {@link BLOCK_PITCH_PER_WIDTH} of a block's own width makes the discs overlap by
  // construction, so no soil shows however wide the plot gets, and the per-block jitter and
  // the radius spread are what keep it from reading as a planted grid.
  const rrMid = crop.height * BLOCK_WIDTH_PER_HEIGHT;
  const pitch = rrMid * BLOCK_PITCH_PER_WIDTH;
  const reach = r * 0.86;
  const steps = Math.max(1, Math.ceil(reach / pitch));
  for (let row = -steps; row <= steps; row += 1) {
    for (let col = -steps; col <= steps; col += 1) {
      // Rows offset by half a pitch, so the lattice is staggered rather than square and its
      // own rank-and-file is that much harder to see.
      const cx = (col + (row % 2 === 0 ? 0 : 0.5)) * pitch + (rng() - 0.5) * pitch * 0.55;
      const cz = row * pitch + (rng() - 0.5) * pitch * 0.55;
      if (Math.hypot(cx, cz) > reach) {
        continue;
      }
      const height = crop.height * (0.96 + rng() * 0.08);
      // NARROW rather than broad, and this is the second correction the frames forced. Two wide
      // blocks presented almost nothing but their pale tops from a 49° camera and read as a pale
      // mass set down on the plot; several narrow ones of the same height show their stalk sides,
      // so the stand reads as something growing while its tops still line up into the flat plane
      // the guide says carries the crop at distance.
      const rr = crop.height * (BLOCK_WIDTH_PER_HEIGHT * (0.86 + rng() * 0.32));
      const stand = new THREE.Mesh(
        // Slightly wider at the foot: a stand of cereal thickens as it comes out of the ground,
        // and straight sides read as a container rather than as a plant.
        new THREE.CylinderGeometry(rr * 0.9, rr, height, 9),
        // Group order for a capped cylinder is [side, top, bottom]: the stalk, the seed head, and
        // the soil the stand grew out of on a face nobody ever sees from a 49° camera.
        [mat(crop.stalk, { rough: 0.95 }), mat(crop.seedHead, { rough: 0.92 }), mat(soil)],
      );
      stand.position.set(x + cx, SURFACE_Y + height / 2 - BED, z + cz);
      stand.rotation.y = rng() * Math.PI;
      stand.castShadow = true;
      stand.receiveShadow = true;
      stands.add(stand);
    }
  }

  // Loose stalks round the rim, so the block has an edge a plant would have. Two tones, both
  // the stand's own, so the rim reads as the same crop rather than as grass against it.
  const rim = surfaceGroup(g, WORKED_SURFACES.cropRim);
  // A SPACING rather than a count, for the reason the furrows are: seven clumps round a 2u lobe
  // is a broken edge and seven round a 6u one is a dotted line. `RIM_PITCH` is the spacing the
  // shipped seven gave on era one's own lobe.
  const RIM = Math.max(7, Math.round((2 * Math.PI * r * 0.9) / RIM_PITCH));
  for (let i = 0; i < RIM; i += 1) {
    const a = (i / RIM) * Math.PI * 2 + rng() * 0.5;
    blades(rim, rng, x + Math.cos(a) * r * 0.9, z + Math.sin(a) * r * 0.9, SURFACE_Y, {
      count: 2,
      height: crop.height * 0.92,
      spread: 0.3,
      tones: [crop.stalk, crop.seedHead],
    });
  }
}

/**
 * ONE FIELD BOUNDARY, dispatched on its kind so a kind added to the union is a compile error
 * here until it is drawn rather than a row that renders nothing.
 *
 * ## They run ACROSS the ring, and they used not to
 *
 * All three used to run ALONG the margin, for a reason stated in this docblock: *"the ring is
 * 2.8u wide, and a boundary that ran radially would break the radius-25 floor at one end."*
 * That was era one's ring standing in for era two's, the same substitution
 * {@link workedPlotSize} corrects — era two's ring is 10.8u wide, and a run of 6u across it
 * clears the floor at both ends with room.
 *
 * The direction matters because of what a boundary IS. *"Everything that divides this island
 * came out of the plot it divides"*, and the plots are strung round the ring, so what divides
 * one from the next is a run laid ACROSS the ring in the lane between them
 * ({@link WORKED_PLOT_LANE}). Running along the ring it lay parallel to the two fields it was
 * supposed to separate, which reads as a heap somebody left rather than as a field edge — and
 * at era two's plot size a 1.9u run beside a 12u field reads as nothing at all.
 *
 * `span` is therefore the plot's own radial extent, handed down by the caller, and every one of
 * the three keeps its shipped SPACING and takes as many pieces as the span asks for.
 */
function fieldBoundary(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  kind: FieldBoundaryKind,
  d: number,
  phi: number,
  span: number,
  nextBias: () => number,
): void {
  switch (kind) {
    case "clearance-heap":
      clearanceHeap(g, t, rng, d, phi, span);
      return;
    case "brushwood-line":
      brushwoodLine(g, t, rng, d, phi, span);
      return;
    case "scratched-ditch":
      scratchedDitch(g, t, rng, d, phi, span, nextBias);
      return;
  }
}

/**
 * How many pieces a boundary of this span is laid from, at the spacing the shipped runs used.
 *
 * Capped, because the spacings are close (a clearance heap's stones are `0.19u` apart and
 * overlap by design) and an uncapped count on a much wider ring would be a mesh bill for detail
 * nobody can resolve at this camera.
 */
function boundaryPieces(span: number, shippedSpan: number, shippedPieces: number): number {
  const spacing = shippedSpan / (shippedPieces - 1);
  return Math.min(
    BOUNDARY_PIECES_MAX,
    Math.max(shippedPieces, Math.round(span / spacing) + 1),
  );
}

/** The most pieces any one boundary is drawn from. See {@link boundaryPieces}. */
const BOUNDARY_PIECES_MAX = 26;

/**
 * STONE CLEARANCE HEAPS — the primary boundary, and *"heaps that have grown along, not walls
 * that were built: no courses, no faces, no through-stones, no gateposts."*
 *
 * The whole of what keeps it from reading as masonry is that it is `rock()` and nothing else —
 * the same seeded, jittered, per-axis-squashed lump the shoreline boulders are, in the same
 * authored greys, because these ARE those stones, picked out of the plot beside them. Two things
 * are then deliberate rather than incidental:
 *
 *  - it is **taller where the picking was worse**, so the run carries a second course of stones
 *    over its first two thirds and one course after that;
 *  - it **peters out entirely** at one end. *"Which is the detail that says made of what the
 *    field gave up louder than any amount of texture"* — so the stone size tapers to nothing and
 *    the last few positions drop out at rising odds, rather than the run simply stopping.
 */
function clearanceHeap(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  d: number,
  phi: number,
  span: number,
): void {
  const stones = surfaceGroup(g, WORKED_SURFACES.clearanceStone);
  const STONES = boundaryPieces(span, 1.9, 11);
  for (let i = 0; i < STONES; i += 1) {
    const along = (i / (STONES - 1) - 0.5) * span;
    // Peters out toward the far end: the stones shrink, and then stop arriving at all.
    const run = i / (STONES - 1);
    if (rng() < run * 0.55) {
      continue;
    }
    const size = 0.3 * (1 - run * 0.62);
    // ACROSS the ring: `along` steps the run in and out from the island's centre, and the
    // jitter is the sideways wobble a heap that grew rather than was built has.
    const at = flatPoint(d + along, phi + ((rng() - 0.5) * 0.22) / d);
    rock(stones, t, rng, at.x, at.z, SURFACE_Y - ROCK_SEAT, size);
    // A second course where the picking was worse — knee-high rather than ankle-high, and only
    // over the first part of the run.
    if (run < 0.62 && rng() < 0.8) {
      rock(
        stones,
        t,
        rng,
        at.x + (rng() - 0.5) * 0.14,
        at.z + (rng() - 0.5) * 0.14,
        SURFACE_Y - ROCK_SEAT + size * 0.72,
        size * 0.86,
      );
    }
  }
}

/**
 * BRUSHWOOD AND STAKE LINES — *"where there was no stone: cut scrub jammed between driven
 * stakes, leaning, gappy, and obviously renewed in patches."*
 *
 * Every word of that is in the geometry rather than in this comment: the stakes lean downwind on
 * the island's own shared wind bias, the brush between them is the island's `scrub` so it reads
 * as cut from the margin it stands in, one bay is left empty so the line is gappy, and the brush
 * heights alternate unevenly so it reads as renewed in patches instead of built in one go.
 */
function brushwoodLine(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  d: number,
  phi: number,
  span: number,
): void {
  const stakeGroup = surfaceGroup(g, WORKED_SURFACES.brushwoodStake);
  const brushGroup = surfaceGroup(g, WORKED_SURFACES.brushwoodBrush);
  const STAKES = boundaryPieces(span, 1.7, 6);
  const at = (i: number) => flatPoint(d + (i / (STAKES - 1) - 0.5) * span, phi);
  for (let i = 0; i < STAKES; i += 1) {
    const p = at(i);
    const h = 0.62 + rng() * 0.22;
    const stake = cyl(stakeGroup, 0.04, 0.055, h, 5, t.trunk, p.x, SURFACE_Y + h / 2, p.z);
    leanDownwind(stake, 0.12 + rng() * 0.3);
  }
  for (let i = 0; i < STAKES - 1; i += 1) {
    // One bay left empty: a hurdle taken out, or never replaced.
    if (rng() < 0.22) {
      continue;
    }
    const a = at(i);
    const b = at(i + 1);
    scrub(
      brushGroup,
      t,
      rng,
      (a.x + b.x) / 2,
      (a.z + b.z) / 2,
      SURFACE_Y,
      0.2 + rng() * 0.14,
    );
  }
}

/**
 * A SCRATCHED DITCH — *"unlined, a scratch rather than a cut, with the spoil thrown up on one
 * side as a low bank."*
 *
 * The scratch is the only part of this pass that is a flat decal, and it is placed BETWEEN plots
 * rather than on one, which is what makes the `worn` rung safe for it: there it overlaps only the
 * tussock and the island's own worn lumps, which is the pair the shared bias cycle was built for.
 * The bank is `rock()` in the island's worn soil rather than in its greys, because spoil is the
 * soil that came out of the scratch and not stone somebody picked.
 */
function scratchedDitch(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  d: number,
  phi: number,
  span: number,
  nextBias: () => number,
): void {
  const scratches = surfaceGroup(g, WORKED_SURFACES.ditchScratch);
  const spoil = surfaceGroup(g, WORKED_SURFACES.ditchSpoil);
  const STEPS = boundaryPieces(span, 1.6, 9);
  for (let i = 0; i < STEPS; i += 1) {
    const along = (i / (STEPS - 1) - 0.5) * span;
    const at = flatPoint(d + along, phi + ((rng() - 0.5) * 0.1) / d);
    // Narrow and dark: a scratch, so the disc is squashed hard across its length. It runs
    // ACROSS the ring now, so the squash is across the ring's tangent rather than along it.
    const scratch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.26, DECAL_THICK, 6),
      mat(t.earthDeep, { polygonOffset: nextBias() }),
    );
    scratch.position.set(at.x, decalCentre(SURFACE_Y, GROUND_DECAL_TOPS.worn), at.z);
    scratch.scale.set(0.42, 1, 1);
    scratch.rotation.y = -phi;
    scratch.receiveShadow = true;
    scratches.add(scratch);

    // The spoil, all on ONE side, which is the detail that says nobody lined it.
    if (rng() < 0.75) {
      const bank = flatPoint(d + along, phi + 0.3 / d);
      rock(
        spoil,
        t,
        rng,
        bank.x,
        bank.z,
        SURFACE_Y - ROCK_SEAT,
        0.12 + rng() * 0.08,
        t.earth,
      );
    }
  }
}

/**
 * THE THRESHING FLOOR — *"a patch beaten bare, swept hard and pale, with the sledge parked on it
 * and husk drifted off its downwind edge."*
 *
 * It sits at the INNER edge of the ring, which is the guide's own placement — *"between the plots
 * and the settlement, because it is where the crop stops being a field and starts being a
 * store"* — and it is the era's answer to the threshing step §7 records as missing from the
 * material chain when `RAD.2` became a sheep pen.
 *
 * Its husk goes on the `loose` rung rather than sharing the floor's own, and that is the one
 * place in this pass where the ladder's existing second rung is exactly right rather than merely
 * available: `loose` is documented as *"loose material lying on worn ground"*, and drifted husk
 * is precisely that. It also puts a full 0.05u between the drift and the floor it lies on, so the
 * two cannot fight even though they overlap by design.
 */
function threshingFloorPatch(
  g: THREE.Object3D,
  rng: () => number,
  d: number,
  phi: number,
  floor: ThreshingFloor,
  nextBias: () => number,
): void {
  const floorGroup = surfaceGroup(g, WORKED_SURFACES.threshingFloor);
  const huskGroup = surfaceGroup(g, WORKED_SURFACES.threshingHusk);
  // The swept surface: three overlapping discs, so the outline is beaten rather than cut.
  for (let i = 0; i < 3; i += 1) {
    const along = (i - 1) * 0.72;
    const at = flatPoint(d + (rng() - 0.5) * 0.2, phi + along / d);
    const patch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.84, DECAL_THICK, 9),
      mat(floor.floor, { rough: 0.99, polygonOffset: nextBias() }),
    );
    patch.position.set(at.x, decalCentre(SURFACE_Y, GROUND_DECAL_TOPS.worn), at.z);
    patch.rotation.y = rng() * Math.PI;
    patch.receiveShadow = true;
    floorGroup.add(patch);
  }

  // Husk drifted off the DOWNWIND edge, on the island's own shared wind direction so the drift
  // agrees with which way every growing thing on it leans.
  const centre = flatPoint(d, phi);
  for (let i = 0; i < 14; i += 1) {
    const spread = 0.5 + rng() * 1.3;
    const drift = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1 + rng() * 0.07, 0.12, DECAL_THICK, 5),
      mat(floor.husk, { polygonOffset: nextBias() }),
    );
    drift.position.set(
      centre.x + WIND_X * spread + (rng() - 0.5) * 0.7,
      decalCentre(SURFACE_Y, GROUND_DECAL_TOPS.loose),
      centre.z + WIND_Z * spread + (rng() - 0.5) * 0.7,
    );
    drift.receiveShadow = true;
    huskGroup.add(drift);
  }

  // THE SLEDGE, parked on it: two runners under three cross slats, and nothing else. §7 calls it
  // *"a threshing sledge"* and the era has no metal and no wheel, so it is timber and lashings.
  const sledge = new THREE.Group();
  for (const side of [-0.28, 0.28]) {
    const runner = box(sledge, 0.14, 0.1, 1.15, ERA_ONE_PROP_TONES.timber, side, 0.08, 0);
    runner.rotation.x = -0.06; // nose lifted, the way a dragged sledge sits
  }
  for (let i = 0; i < 3; i += 1) {
    box(sledge, 0.72, 0.07, 0.15, ERA_ONE_PROP_TONES.timber, 0, 0.15, (i - 1) * 0.4);
  }
  sledge.position.set(centre.x - WIND_X * 0.55, SURFACE_Y, centre.z - WIND_Z * 0.55);
  sledge.rotation.y = -phi + 0.4;
  surfaceGroup(g, WORKED_SURFACES.threshingSledge).add(sledge);
}

/* -------------------------------------------------------------------------- */
/* Era two at the water's edge — the skid track and the fish traps             */
/* -------------------------------------------------------------------------- */

/**
 * THE WATER'S EDGE IS ITS OWN NAMED SUBTREE, beside {@link WORKED_GROUND_GROUP}.
 *
 * Two subtrees rather than one, because they answer to different rules and a guard that swept
 * them together would have to weaken both: everything in the worked ground is held INSIDE the
 * margin ring, and everything here is deliberately OUTSIDE it, on the shore and in the shallows.
 * Folding the shore into the field's population would mean loosening the radius-25 assertion
 * that is the whole point of that population.
 */
export const WATER_EDGE_GROUP = "era2-water-edge";

/** The surfaces inside {@link WATER_EDGE_GROUP}, one named group each. */
export const WATER_EDGE_SURFACES = {
  skidLog: "skid-log",
  trapStake: "trap-stake",
  trapBasket: "trap-basket",
} as const;

/** The azimuth era one's slipway runs out along, and therefore the skid track's too. */
const SLIPWAY_PHI = 0;

/**
 * THE TIMBER SKID TRACK, laid over era one's gravel slipway without touching a line of it.
 *
 * `buildSlipway` is era one's approved art and this does not call into it, re-run its seeded
 * stream, or reuse its meshes: it reads the same public shore helpers (`shoreY` for the ramp,
 * the same `SLIPWAY_PHI`) and lays its own timbers on top. So era one's island is bit-identical
 * with this drawn or not, which `eraTwoGround.test.ts` asserts rather than assumes.
 *
 * ## Half-sunk, and flat side up
 *
 * *"Split logs, half-sunk, to drag hulls over."* Each log is a six-sided cylinder turned so a
 * FACET faces up rather than an edge — a split log has a flat face, and that face is also what a
 * hull would actually slide on. It is set into the gravel so about a third of its thickness is
 * buried, which is what "half-sunk" looks like once the gravel has washed round it.
 *
 * The flat top is a horizontal face, so it is worth saying where it sits: about 0.19u above the
 * local shore surface, against the slipway gravel's `loose` rung at 0.10 — roughly 0.09u apart,
 * or twenty depth steps at the furthest view, so the two cannot fight. Nothing here is on the
 * decal ladder and nothing here changes it.
 */
function skidTrack(
  g: THREE.Object3D,
  rng: () => number,
  grassR: number,
  track: SkidTrack,
): void {
  const logs = surfaceGroup(g, WATER_EDGE_SURFACES.skidLog);
  // The band the track is legible over: from the flat above the shelf down to just short of the
  // waterline. Past that the lagoon is opaque and a log is a log nobody can see.
  const fromDr = -1.6;
  const toDr = 2.6;
  for (let i = 0; i < track.logs; i += 1) {
    const along = track.logs === 1 ? 0 : i / (track.logs - 1);
    const dr = fromDr + (toDr - fromDr) * along + (rng() - 0.5) * 0.12;
    const rc = grassR + dr;
    const y = SURFACE_Y + shoreY(dr);
    // The local ramp angle, sampled the same way the slipway samples it.
    const tilt = Math.atan2(y - (SURFACE_Y + shoreY(dr + 0.5)), 0.5);
    const radius = 0.12 + rng() * 0.04;
    // The track narrows as it goes down, exactly as the gravel under it does.
    const length = 2.3 - along * 0.95;

    // A group so the two rotations cannot fight: the log lies along X inside it, and the group
    // is what beds onto the ramp. Composing both on one Euler is order-dependent and was not
    // worth the ambiguity.
    const holder = new THREE.Group();
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 6),
      mat(ERA_ONE_PROP_TONES.timber, { rough: 0.95 }),
    );
    log.rotation.z = Math.PI / 2; // axis along X, across the track
    log.rotation.y = Math.PI / 6; // a facet up: a split log shows its flat face
    log.castShadow = true;
    log.receiveShadow = true;
    holder.add(log);
    holder.position.set(
      (rng() - 0.5) * 0.3,
      // Riding on the slipway's gravel and set into it by about a third of its thickness.
      y + GROUND_DECAL_TOPS.loose - radius * 0.3,
      rc,
    );
    holder.rotation.x = tilt;
    holder.rotation.z = (rng() - 0.5) * 0.06; // none of them laid quite square
    logs.add(holder);
  }
}

/**
 * FISH TRAPS, read from ABOVE the waterline — see `islandGround.ts`'s {@link FishTraps} for the
 * ruling that made that the brief, and the era-two style guide's Water section for the departure.
 *
 * ## The shape is the argument
 *
 * The only thing carrying *"somebody has worked this water"* is what stands out of it, so the
 * stakes are a converging **V** rather than a line or a scatter: two runs leaving the beach wide
 * and closing to a mouth, with the baskets at the mouth. A V is not a thing that happens by
 * itself, and it makes the baskets read as the point of the stakes rather than as debris.
 *
 * The runs also **start above the waterline and end below it**, which is what sells the traps as
 * being IN the water rather than on the beach: the first stakes stand on wet gravel, the last
 * stand in the lagoon, and only the tops of those are visible. The shore crosses `WATERLINE_Y` at
 * about `dr = 3.14`, so the run from 2.6 to 3.5 straddles it.
 *
 * ## Nothing has a face on the water plane
 *
 * The lagoon's top is a horizontal plane at `WATERLINE_Y`, which this pass does not own and must
 * not fight. Every stake is sized from its own bed so its top lands a fixed distance PROUD of
 * that plane rather than at it, and the baskets' rims likewise, so the nearest horizontal face to
 * the water is {@link TRAP_PROUD_MIN} above it — far outside any depth-precision concern, and the
 * reason the stakes are cut to length individually instead of all being one height.
 */
const TRAP_PROUD_MIN = 0.2;

function fishTraps(
  g: THREE.Object3D,
  rng: () => number,
  grassR: number,
  phi: number,
  traps: FishTraps,
): void {
  const stakes = surfaceGroup(g, WATER_EDGE_SURFACES.trapStake);
  const baskets = surfaceGroup(g, WATER_EDGE_SURFACES.trapBasket);

  const FROM_DR = 2.6; // wet gravel, above the waterline
  const TO_DR = 3.5; // in the lagoon, past where the shore crosses it
  const PER_RUN = 6;

  /** A stake driven at `dr` out and `off` units along the shore, cut to stand proud. */
  const drive = (dr: number, off: number): void => {
    const bed = SURFACE_Y + shoreY(dr);
    const top = WATERLINE_Y + TRAP_PROUD_MIN + rng() * 0.22;
    // Long enough to reach that top from its own bed, plus a good depth buried. Sized per stake,
    // which is why the tops line up on the water rather than following the ground down out of
    // sight.
    //
    // The BURIAL DEPTH is a depth-precision number as much as a fiction one, and the guard found
    // it: at 0.5u the deepest-bedded stake's bottom cap landed 0.029u from `WATERLINE_Y`, which is
    // a horizontal face all but coplanar with the lagoon's own surface plane. It is buried inside
    // the shore cone and so invisible today, but it is exactly the kind of coincidence that
    // becomes a flicker the first time anything about the shore moves. At 0.85u the nearest cap is
    // 0.37u away.
    const length = top - bed + 0.85;
    const at = shorePoint(grassR, grassR + dr, phi + off / grassR);
    const stake = cyl(
      stakes,
      0.045,
      0.06,
      length,
      5,
      traps.stake,
      at.x,
      top - length / 2,
      at.z,
    );
    // Driven by hand and shoved about by the water: none of them quite plumb.
    stake.rotation.x = (rng() - 0.5) * 0.16;
    stake.rotation.z = (rng() - 0.5) * 0.16;
  };

  // The two converging runs. Wide at the beach, closing to the mouth.
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < PER_RUN; i += 1) {
      const along = i / (PER_RUN - 1);
      const dr = FROM_DR + (TO_DR - FROM_DR) * along;
      const spread = 1.7 - along * 1.2;
      drive(dr + (rng() - 0.5) * 0.08, side * spread + (rng() - 0.5) * 0.12);
    }
  }

  // THE BASKETS at the mouth, rims breaking the surface. Tapered, because a withy basket is
  // wider at its mouth than at its closed end, and that taper is most of what tells it from a
  // post at this size.
  for (let i = 0; i < 3; i += 1) {
    const dr = TO_DR - 0.15 + (rng() - 0.5) * 0.2;
    const off = (i - 1) * 0.55 + (rng() - 0.5) * 0.15;
    const at = shorePoint(grassR, grassR + dr, phi + off / grassR);
    const height = 0.62;
    // PROUD ENOUGH TO SHOW ITS SIDE. At a tenth of a unit only the rim ellipse cleared the water
    // and the basket read as a lily pad in the near-water frame; a fifth shows a band of the
    // taper, which is what tells a basket from a disc when its inside cannot be seen.
    const rim = WATERLINE_Y + 0.19 + rng() * 0.12;
    const basket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.15, height, 7),
      mat(traps.basket, { rough: 0.97 }),
    );
    basket.position.set(at.x, rim - height / 2, at.z);
    basket.rotation.set((rng() - 0.5) * 0.2, rng() * Math.PI, (rng() - 0.5) * 0.2);
    basket.castShadow = true;
    baskets.add(basket);
  }
}

/** The short radial track off the arc down to the landing, where the gravel takes over. */
function wornSpur(
  g: THREE.Object3D,
  t: IslandTerrainTones,
  rng: () => number,
  phi: number,
  fromD: number,
  toD: number,
  width: number,
  nextBias: () => number,
) {
  const steps = Math.max(1, Math.round((toD - fromD) / 0.8));
  for (let i = 0; i <= steps; i += 1) {
    const at = flatPoint(fromD + ((toD - fromD) * i) / steps, phi + (rng() - 0.5) * 0.07);
    wornLump(g, t, rng, at.x, at.z, width * (0.42 + rng() * 0.3), nextBias());
  }
}

const PREHISTORIC_CAMP_PROPS = [
  "worn-routes",
  "hide-boat",
  "fire-blackened-hearth",
  "drying-rack",
  "midden",
  "flint-scatter",
] as const;

/**
 * Era one's lived-in margin, kept as authored props over the shared designed terrain.
 *
 * The land mass now follows the same 13-facet authored pipeline as every later era. These are
 * not a second island renderer: they are the shoreline-camp feature group that the Prehistoric
 * design row asks that pipeline to retain.
 */
function buildPrehistoricCamp(
  root: THREE.Group,
  tones: IslandTerrainTones,
  grassRadius: number,
): void {
  const camp = new THREE.Group();
  camp.name = "windblown-camp";
  camp.userData.prehistoricFeature = true;
  const rng = mulberry32(0x1ca0);
  const ring = marginRing(grassRadius);
  const bandAt = (out: number) => ring.inner + out;
  let decalSequence = 0;
  const nextBias = () => decalBias(decalSequence++);

  const worn = new THREE.Group();
  worn.name = "prehistoric-worn-routes";
  camp.add(worn);
  for (let index = 0; index < 4; index += 1) {
    const at = flatPoint(bandAt(1.25 + rng() * 0.75), rng() * Math.PI * 2);
    earthPatch(worn, tones, rng, at.x, at.z, 0.52 + rng() * 0.28, nextBias);
  }
  wornArc(worn, tones, rng, bandAt(1.6), 0.05, HEARTH.phi, 1.25, nextBias);
  wornArc(
    worn,
    tones,
    rng,
    bandAt(1.7),
    RACK.phi + 0.03,
    MIDDEN.phi - Math.PI * 2,
    1.05,
    nextBias,
  );
  wornSpur(worn, tones, rng, 0, bandAt(1.5), bandAt(2.9), 1.45, nextBias);

  buildBoatLanding(camp, tones, rng, grassRadius, nextBias);
  const hearthAt = flatPoint(bandAt(HEARTH.out), HEARTH.phi);
  hearthRing(camp, tones, rng, hearthAt.x, hearthAt.z, nextBias());
  const rackAt = flatPoint(bandAt(RACK.out), RACK.phi);
  dryingRack(camp, rackAt.x, rackAt.z, RACK.phi + 0.5);
  const middenAt = flatPoint(bandAt(MIDDEN.out), MIDDEN.phi);
  middenHeap(camp, tones, rng, middenAt.x, middenAt.z);
  const flintAt = flatPoint(bandAt(FLINT.out), FLINT.phi);
  flintScatter(camp, tones, rng, flintAt.x, flintAt.z);

  root.add(camp);
  root.userData.prehistoricCampProps = [...PREHISTORIC_CAMP_PROPS];
}

/**
 * Build the island once, for one era's dressing.
 *
 * `dressing.props` controls only the starter camp, its landing and the worn routes those
 * explain. Later authored islands use `dressing.design` and never inherit those props.
 *
 * Exported for unit tests, which read the tones and the prop count out of the built scene
 * graph rather than out of the tables — the same reason `buildRoadsGroup`,
 * `buildScarredGroundGroup` and `buildWinterGroundGroup` are exported. A tone that is
 * declared and never painted must not satisfy a guard.
 *
 * **`grassR` IS A REQUIRED ARGUMENT rather than a read off `layout.islandRadius`**, which it
 * equals at every call site in the product. Everything this function decides — where the shore
 * is, how wide the decoration band is, how many things go in it, where the camp stands — hangs
 * off this one number, and a `layout` is not always the island the caller means: `CityScene`
 * has to hand `StarterIsland` a DIFFERENT one during an era advance, because the land grows two
 * beats before the layout does (`islandLand.ts`'s `islandDressingRadius`). Naming it here is
 * what lets a guard measure one era's dressing on another era's ring — which is how
 * `islandDressingFillsTheIsland.test.ts` states its density claim per unit of ground.
 */
export function buildIslandGroup(
  layout: CityLayout,
  dressing: IslandGroundDressing,
  grassR: number,
): THREE.Group {
  const rng = mulberry32(0x5eed);
  const group = new THREE.Group();
  const waterline = WATERLINE_Y;
  const t = dressing.tones;

  /*
   * Authored islands are complete blank-slate compositions, not a prop layer over the older
   * nine-sided terrain. Build the shared 13-sided plateau, shore, flora and signature landforms
   * as one graph, then add the project's placement affordance. Prehistoric keeps its lived-in
   * shoreline camp as a named authored feature group over that same terrain pipeline.
   */
  if (dressing.design) {
    const designedTerrain = buildEvanCityIsland(
      dressing.design,
      layout,
      grassR,
      walkableRadiusFor(layout.buildableRadius),
    );
    const authored = new THREE.Group();
    authored.name = dressing.design.sceneName;
    Object.assign(authored.userData, designedTerrain.userData);
    authored.add(designedTerrain);
    // 2026-08-21: the windblown-camp feature group (hearth, drying rack, midden, flint
    // scatter, hide boat, worn routes) is deliberately no longer built. It read as loose
    // brown clutter laid over the island rather than authored art ("theres still excess
    // stuff laying around on the island... delete all the brown stuff. there should be
    // like 8 things total") -- era one now keeps only its trees and grazing patches.
    authored.add(buildGrid(t, layout.buildableRadius));
    return authored;
  }

  // Calm, pale, shallow water, and land that shelves gradually into it.
  group.add(buildSea(t, layout.seaRadius, waterline, dressing.design));
  buildShore(group, t, grassR, dressing.design);

  // The placement grid over the buildable flat — see `buildGrid` on why every era keeps
  // it and why its line travels with the ground.
  if (dressing.design) {
    group.add(buildEraGroundPattern(dressing.design, grassR));
  }
  group.add(buildGrid(t, layout.buildableRadius));

  // The band ALL decoration lives in, with no exceptions: outside the permanent walkable
  // annulus so nothing can reach a placement cell, inside the ground's edge so nothing stands
  // off the shore. Ground-flat decals are held to the same floor as things with
  // height — a decal cannot collide with anything, but the floor is a veto and not a
  // guideline, so it holds for the paths and the worn earth too.
  //
  // ⚑ THE FLOOR IS THE ERA'S ANNULUS, AND IT USED TO BE ERA ONE'S. `marginRing`'s `inner` read
  // `BUILDABLE_RADIUS + 3`, which was the whole island's permanent perimeter while the disc was
  // era one's constant. The disc now follows the land, so the same literal would scatter trees,
  // scrub and boulders across sixteen units of ground a learner may build on — the floor is
  // *"nothing decorative reaches a cell a building could stand on"*, and that sentence names the
  // disc rather than the number 22. Keyed on `grassR`, whose buildable radius is the same
  // derivation the placement gate enforces.
  const ring = marginRing(grassR);
  const { inner: marginIn, outer: marginOut } = ring;

  /*
   * ⚑ AND THE TWO WAYS EVERY NUMBER BELOW IS HELD TO THE RING THE ERA ACTUALLY HAS.
   *
   * `marginRing`'s docblock has the arithmetic. The band is 2.8 units at every era — both of its
   * ends now follow the land — so an offset authored against era one's ring is that same offset
   * on every island, and `ringSpread` is exactly 1 rather than only on era one. The two radial
   * factors are kept as the identity they have become rather than inlined away, because what
   * makes them 1 is `islandLand.ts`'s margin arithmetic and not a fact about decoration: an era
   * whose land stopped paying that margin would widen this ring, and these are what would carry
   * era one's composition onto it.
   *
   * The COUNT factors are not identities and are the half of this that is still doing work: a
   * 2.8-unit ring at radius 41 is 1.6x the ground of one at radius 25, so era one's five copses
   * and twelve scrub clumps laid out there are still an island getting sparser as it grows.
   *
   * All four are exactly `1` on era one — each a quantity over ITSELF there, not a value that
   * rounds to one — so era one's approved scatter is bit-identical. That is asserted rather than
   * argued: `islandDressingFillsTheIsland.test.ts` pins the digest of every mesh position era
   * one's island draws.
   */

  /** How many times era one's ring wide this era's is. */
  const ringSpread =
    (marginOut - marginIn) / (ERA_ONE_MARGIN_RING.outer - ERA_ONE_MARGIN_RING.inner);
  /** A radius era one authored `out` units past the floor, at the same FRACTION of this ring. */
  const bandAt = (out: number) => marginIn + out * ringSpread;
  /** A radial jitter era one authored across its ring, at the same fraction of this one. */
  const bandSpan = (span: number) => span * ringSpread;
  /**
   * How many of something SCATTERED OVER THE BAND, at era one's number per unit of ground.
   *
   * By area and not by width, because that is what "reads as sparse" measures: era one's five
   * copses and twelve scrub clumps over 464 square units is a density, and the same counts over
   * the 746 a ceiling era's band covers are the same island with a third less on it. `1` on
   * era one.
   */
  const overTheBand = (count: number) =>
    Math.round((count * marginRingArea(ring)) / marginRingArea(ERA_ONE_MARGIN_RING));
  /**
   * …and how many of something STRUNG ALONG THE SHORE, at era one's number per unit of
   * shoreline. Circumference rather than area, because the shore families are a line and not a
   * field: `SHORE_PROFILE` is an absolute width of sand (D-ERA26) that does not grow with the
   * island, so what a bigger island gives the boulders and the gravel is a longer beach and
   * never a wider one. `1` on era one.
   */
  const alongTheShore = (count: number) =>
    Math.round((count * grassR) / ISLAND_GRASS_RADIUS);
  const scatter = {
    wildTrees: 1,
    scrub: 1,
    blades: 1,
    reeds: 1,
    shore: 1,
  };
  const scaledBandCount = (count: number, factor: number) =>
    factor <= 0 ? 0 : Math.max(1, Math.round(overTheBand(count) * factor));
  const scaledShoreCount = (count: number, factor: number) =>
    factor <= 0 ? 0 : Math.max(1, Math.round(alongTheShore(count) * factor));

  // Ground worn through to bare soil: unequal patches of packed earth in the tussock,
  // and tracks that exist because they get walked — one along the camp between the fire,
  // the flint and the landing, a shorter one between the rack and the midden, and a spur
  // down to where the gravel takes over. Nothing laid, nothing in a row, nothing fenced.
  // One sequence shared by EVERY ground decal, because the families interleave: the arcs
  // run through the bare-earth ring and the spur runs into the slipway's gravel, so a
  // per-family counter would hand two overlapping lumps the same bias.
  //
  // THEY GO WITH THE PROPS, because they are the props' own footprints: every one of these
  // tracks runs between the hearth, the rack, the midden and the boat, so a re-dress that
  // took those four away and left their paths behind would leave four routes to nowhere.
  //
  // ⚑ THE DRAWS STILL HAPPEN, AND THE MESHES GO NOWHERE. One seeded stream feeds this whole
  // function, so skipping these calls outright would shift every later draw and re-scatter the
  // trees, the scrub, the blades and the boulders as well — an era advance would move the
  // base vegetation, which is neither authored nor intended, and it would change era one's own
  // approved scatter if the order were rearranged to avoid it. Routing them to a group nobody
  // keeps advances the stream identically and renders nothing, so **the terrain is the same
  // base terrain in every era** while the authored feature layer remains era-specific. Measured in Chromium:
  // with the sink, an advance differs on the ground and the props; without it, the whole margin
  // moves too.
  let decalSeq = 0;
  const nextBias = () => decalBias(decalSeq++);
  const wornInto = dressing.props ? group : new THREE.Group();

  for (let i = 0; i < overTheBand(10); i += 1) {
    const at = flatPoint(bandAt(1.5 + rng() * 0.4), rng() * Math.PI * 2);
    earthPatch(wornInto, t, rng, at.x, at.z, 0.5 + rng() * 0.25, nextBias);
  }
  // The two arcs and the spur were bare radii too, and they are the four props' own footprints:
  // `wornArc` already takes its step count from `sweep * d`, and `wornSpur` from the run's
  // length over a 0.45 pitch, so both are spacings and a longer path simply gets more lumps.
  wornArc(wornInto, t, rng, bandAt(1.6), 0.05, HEARTH.phi, 1.25, nextBias);
  wornArc(
    wornInto,
    t,
    rng,
    bandAt(1.7),
    RACK.phi + 0.03,
    MIDDEN.phi - Math.PI * 2,
    1.05,
    nextBias,
  );
  wornSpur(wornInto, t, rng, 0, bandAt(1.5), bandAt(2.9), 1.45, nextBias);

  // Sparse windblown vegetation: five low copses of one to three trees at the margins,
  // scrub, and coarse tussock. The copse angles start off-axis and are spaced far
  // enough apart that none can land on the track down to the landing — so nothing
  // needs a corridor carved out of the scatter to explain a gap in it.
  const treeScale = () => TREE_SCALE_MIN + rng() * TREE_SCALE_JITTER;
  const copses = scaledBandCount(5, scatter.wildTrees);
  if (copses > 0) {
    const wildTrees = new THREE.Group();
    wildTrees.name = "base-wild-trees";
    group.add(wildTrees);
    for (let ci = 0; ci < copses; ci += 1) {
      const phi = 0.62 + (ci / copses) * Math.PI * 2 + (rng() - 0.5) * 0.5;
      const d = bandAt(1.2 + rng() * 0.9);
      const count = 1 + ((rng() * 3) | 0);
      for (let k = 0; k < count; k += 1) {
        const at = flatPoint(
          d + bandSpan((rng() - 0.5) * 1.6),
          phi + (rng() - 0.5) * 0.075,
        );
        tree(wildTrees, t, rng, at.x, at.z, SURFACE_Y, treeScale());
      }
    }
  }

  const scrubCount = scaledBandCount(12, scatter.scrub);
  const shoreScrubCount = scaledShoreCount(5, scatter.shore);
  if (scrubCount + shoreScrubCount > 0) {
    const baseScrub = new THREE.Group();
    baseScrub.name = "base-scrub";
    group.add(baseScrub);
    for (let i = 0; i < scrubCount; i += 1) {
      const at = flatPoint(bandAt(0.8 + rng() * 0.9), rng() * Math.PI * 2);
      scrub(baseScrub, t, rng, at.x, at.z, SURFACE_Y, 0.5 + rng() * 0.42);
    }
    for (let i = 0; i < shoreScrubCount; i += 1) {
      const p = shorePoint(grassR, grassR + 0.25 + rng() * 1.2, rng() * Math.PI * 2);
      scrub(baseScrub, t, rng, p.x, p.z, p.y, 0.42 + rng() * 0.3);
    }
  }

  const bladeCount = scaledBandCount(20, scatter.blades);
  const shoreBladeCount = scaledShoreCount(12, scatter.shore);
  if (bladeCount + shoreBladeCount > 0) {
    const baseBlades = new THREE.Group();
    baseBlades.name = "base-ground-blades";
    group.add(baseBlades);
    for (let i = 0; i < bladeCount; i += 1) {
      const at = flatPoint(
        marginIn + 0.25 + rng() * (marginOut - marginIn - 0.25),
        rng() * Math.PI * 2,
      );
      blades(baseBlades, rng, at.x, at.z, SURFACE_Y, {
        count: 3,
        height: 0.5,
        spread: 0.34,
        tones: t.bladeTones,
      });
    }
    for (let i = 0; i < shoreBladeCount; i += 1) {
      const p = shorePoint(grassR, grassR + rng() * 2.0, rng() * Math.PI * 2);
      blades(baseBlades, rng, p.x, p.z, p.y, {
        count: 3,
        height: 0.42,
        spread: 0.3,
        tones: t.bladeTones,
      });
    }
  }

  const reedStands = scaledShoreCount(5, scatter.reeds);
  if (reedStands > 0) {
    const baseReeds = new THREE.Group();
    baseReeds.name = "base-reeds";
    group.add(baseReeds);
    for (let i = 0; i < reedStands; i += 1) {
      const phi = 0.9 + (i / reedStands) * Math.PI * 2 + (rng() - 0.5) * 0.4;
      const p = shorePoint(grassR, grassR + 2.95 + rng() * 0.5, phi);
      blades(baseReeds, rng, p.x, p.z, p.y, {
        count: 6,
        height: 1.15,
        spread: 0.5,
        tones: t.reedTones,
      });
    }
  }

  // Coarse sand and gravel the whole way round, loosest where the water reaches and
  // thinning up onto the tussock. This is what stops the shore reading as a rim: the
  // ground and the beach never meet along a line, the material just gets looser, and
  // the loose stuff straddles the ground's edge in both directions. All of it is grains
  // and pebbles rather than patches — a flat patch of pale material lying on the shore
  // reads as something LAID, which is the one thing this shoreline may not be.
  const grainCount = scaledShoreCount(90, scatter.shore);
  const clusterCount = scaledShoreCount(9, scatter.shore);
  const shoreScatter = new THREE.Group();
  if (grainCount + clusterCount > 0) {
    shoreScatter.name = "base-shore-scatter";
    group.add(shoreScatter);
  }
  for (let i = 0; i < grainCount; i += 1) {
    const dr = -1.3 + rng() * 5.0;
    const p = shorePoint(grassR, grassR + dr, rng() * Math.PI * 2);
    const grain = dr > -0.3 && rng() < 0.55;
    rock(
      shoreScatter,
      t,
      rng,
      p.x,
      p.z,
      p.y - ROCK_SEAT,
      0.06 + rng() * 0.12,
      grain ? (rng() < 0.5 ? t.coarseSand : t.gravel) : undefined,
    );
  }

  // Shoreline boulders — the one thing the shipped island already had exactly right:
  // little clusters, a lead boulder ringed by a few pebbles, each a seeded, jittered,
  // per-axis-squashed lump so no two match and none reads as PLACED. They now run from
  // the margin down to where the water reaches, and no cluster is skipped: with no pier
  // to keep clear, a gap in the scatter would have nothing to explain it. Nine clusters round
  // era one's beach, and the same spacing round a longer one.
  for (let ci = 0; ci < clusterCount; ci += 1) {
    const phi = (ci / clusterCount) * Math.PI * 2 + (rng() - 0.5) * 0.55;
    // Held off the decoration floor in the coordinate the floor is measured in — see
    // `shoreFloorRc`, which is why this is not the bare `grassR - 2.6` the bound reads as.
    const rc = Math.max(grassR - 2.6 + rng() * 5.6, shoreFloorRc(marginIn, phi));
    const lead = shorePoint(grassR, rc, phi);
    rock(shoreScatter, t, rng, lead.x, lead.z, lead.y - ROCK_SEAT, 0.26 + rng() * 0.13);
    const pebbles = 2 + ((rng() * 3) | 0);
    for (let p = 0; p < pebbles; p += 1) {
      // Jittered in (radius, azimuth) rather than in x/z, so a pebble stays on the
      // shelf instead of stepping off the facet its cluster is sitting on. The two draws are
      // pulled out in the order they used to be evaluated as arguments, so the seeded stream
      // is unchanged: the azimuth is needed BEFORE the radius can be held off the floor,
      // because the floor's rc is a function of it.
      const pebbleRc = rc + (rng() - 0.5) * 2.2;
      const pebblePhi = phi + (rng() - 0.5) * 0.09;
      const at = shorePoint(
        grassR,
        Math.max(grassR - 2.6, shoreFloorRc(marginIn, pebblePhi), pebbleRc),
        pebblePhi,
      );
      rock(shoreScatter, t, rng, at.x, at.z, at.y - ROCK_SEAT, 0.09 + rng() * 0.12);
    }
  }

  // WHERE BOATS LAND, and the camp's leavings at the margins — era one's own authored
  // props, and the whole of what an era without starter props does NOT show.
  // A hide boat hauled up above the waterline and a fire-blackened stone ring are era one's
  // people; drawing them in Early Modern is the borrowed-dressing defect at its most
  // vivid, which is exactly what "fall back visibly" is meant to prevent.
  //
  // A plain skip is safe HERE, unlike the worn decals above, because nothing after this reads
  // the stream: these are the last draws in the function.
  if (dressing.props) {
    buildBoatLanding(group, t, rng, grassR, nextBias);

    const hearthAt = flatPoint(bandAt(HEARTH.out), HEARTH.phi);
    hearthRing(group, t, rng, hearthAt.x, hearthAt.z, nextBias());
    const rackAt = flatPoint(bandAt(RACK.out), RACK.phi);
    dryingRack(group, rackAt.x, rackAt.z, RACK.phi + 0.5);
    const middenAt = flatPoint(bandAt(MIDDEN.out), MIDDEN.phi);
    middenHeap(group, t, rng, middenAt.x, middenAt.z);
    const flintAt = flatPoint(bandAt(FLINT.out), FLINT.phi);
    flintScatter(group, t, rng, flintAt.x, flintAt.z);
  }

  // THE ERA'S WORKED GROUND, and for era two it is where the era's identity lives: *"the
  // island reads in two families for the first time: ground somebody has broken, and ground
  // nobody has touched."* Empty for every era that does not work its ground, so era one's
  // island is untouched by this block and later eras draw nothing in this Era 2 field model.
  //
  // LAST IN THE FUNCTION, deliberately, and for the reason the worn decals above are routed to
  // a sink instead of skipped: one seeded stream feeds this whole builder, so a draw inserted
  // anywhere earlier would re-scatter era one's approved trees, scrub, blades and boulders as
  // well. Nothing after this reads the stream, so plots can be drawn conditionally.
  //
  // The plots ring the margin at one radius, alternating state so no two neighbours are in the
  // same one — *"a settlement's fields are never all in one state, and authoring all four at
  // once is what makes the island read as farmed rather than as a green patch"*, and this
  // authors three of the four (see `ERA_TWO_WORKED_PLOTS` for what the fourth needs).
  if (dressing.plots.length > 0) {
    // One named subtree for the whole worked half, so the scene graph says what it drew — see
    // `WORKED_GROUND_GROUP`. An era that works no ground adds no group at all rather than an
    // empty one, which is the difference a guard can read.
    const worked = new THREE.Group();
    worked.name = WORKED_GROUND_GROUP;
    group.add(worked);
    // THE SIZE COMES OFF THIS ERA'S OWN RING, which is the correction — see
    // `workedPlotSize`. Era two's ring is 10.8u wide against era one's 2.8u, so the two
    // constants this replaces were sizing era two's fields for an island it never stands on.
    const size = workedPlotSize(marginIn, marginOut, WORKED_PLOT_COUNT);
    const lobeReach = size.lobeMax * WORKED_PLOT_LOBE_EDGE;
    /**
     * What the ring has left over once a plot's own reach has taken its share, split between
     * the plot's radius and the wander of the lobes within it — so the floor at radius 25 and
     * the shore at `grassR - 2.2` are both held by construction whichever way the two roll.
     */
    const slack = Math.max(0, marginOut - marginIn - 2 * lobeReach - 0.1);
    const wander = slack * 0.5;
    /** A radius that keeps a lobe's own reach clear of the floor at one end and the shore at the other. */
    const plotRadius = () =>
      marginIn + lobeReach + wander / 2 + 0.05 + rng() * (slack - wander);

    for (let i = 0; i < WORKED_PLOT_COUNT; i += 1) {
      // Unequal spacing round the ring, so the fields do not read as a surveyed row — era
      // two's plot outlines are *"argued from the slope and from where the stones ran out
      // rather than from a survey"*. The jitter is the LANE the sizing left free, so two
      // neighbours can lean toward each other without their plots running together: at the
      // widest a plot may be, `WORKED_PLOT_LANE` of the arc is exactly what is spare.
      const step = (Math.PI * 2) / WORKED_PLOT_COUNT;
      const phi = i * step + (rng() - 0.5) * step * WORKED_PLOT_LANE;
      const state = dressing.plots[i % dressing.plots.length];
      if (state) {
        workedPlot(worked, rng, plotRadius(), phi, state, i, size, wander, nextBias);
      }
    }

    // WHAT DIVIDES THEM, on the half-step between two plots and laid ACROSS the ring, so a
    // boundary reads as the edge between two fields rather than as a line drawn through open
    // ground beside them. Six of them against twelve plots, which is what keeps the guide's
    // constraint true on screen: *"nothing encloses the whole island … there is no wall, no
    // palisade, no defensive line."*
    const halfStep = Math.PI / WORKED_PLOT_COUNT;
    /** As long as a plot is deep, and centred in the ring, so it clears both ends of it. */
    const boundarySpan = 2 * lobeReach;
    const boundaryRadius = (marginIn + marginOut) / 2;
    let boundarySlot = 0;
    for (const boundary of dressing.boundaries) {
      for (let k = 0; k < boundary.count; k += 1) {
        const phi =
          ((boundarySlot * 2 + 1) / WORKED_PLOT_COUNT) * Math.PI * 2 +
          halfStep +
          (rng() - 0.5) * 0.16;
        fieldBoundary(
          worked,
          t,
          rng,
          boundary.kind,
          boundaryRadius,
          phi,
          boundarySpan,
          nextBias,
        );
        boundarySlot += 1;
      }
    }

    // AND WHERE THE CROP STOPS BEING A FIELD, at the ring's INNER edge — *"between the plots and
    // the settlement"* — so it sits between the fields and the buildable disc rather than out
    // among them. Still outside the radius-25 floor, which its own reach is measured against.
    if (dressing.threshingFloor !== null) {
      threshingFloorPatch(
        worked,
        rng,
        marginIn + 1.15,
        Math.PI * 0.36,
        dressing.threshingFloor,
        nextBias,
      );
    }
  }

  // THE WATER'S EDGE — its own subtree, because it lives OUTSIDE the ring the field is held
  // inside (see `WATER_EDGE_GROUP`). Drawn after the field for the same seeded-stream reason
  // everything in this block is drawn last: nothing after it reads the stream.
  if (dressing.skidTrack !== null || dressing.fishTraps !== null) {
    const waterEdge = new THREE.Group();
    waterEdge.name = WATER_EDGE_GROUP;
    group.add(waterEdge);
    if (dressing.skidTrack !== null) {
      skidTrack(waterEdge, rng, grassR, dressing.skidTrack);
    }
    if (dressing.fishTraps !== null) {
      // Set a quarter-turn off the landing: a weir across the slipway would be a weir across the
      // one bit of water the settlement drags its boats through.
      fishTraps(waterEdge, rng, grassR, SLIPWAY_PHI + Math.PI * 0.7, dressing.fishTraps);
    }
  }

  return group;
}

/* -------------------------------------------------------------------------- */
/* Gulls — a small flock of low-poly birds wheeling over the island + sea       */
/* -------------------------------------------------------------------------- */

/** Gull palette — a white body, slate wings with a dark tip, a warm beak. */
const BIRD = {
  body: 0xf2f4f7,
  wing: 0x9aa6b2,
  wingTip: 0x394049,
  beak: 0xf3a02b,
  eye: 0x241a10,
  tail: 0xd8dee5,
} as const;

/** A right-wing outline (pivot at the shoulder, span along +X, tip swept back). */
function wingShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, -0.2); // shoulder, leading edge (faces +Z once laid flat)
  s.lineTo(0.5, -0.14);
  s.lineTo(1.06, 0);
  s.lineTo(1.32, 0.16); // wingtip, swept back
  s.lineTo(0.52, 0.2);
  s.lineTo(0, 0.22); // shoulder, trailing edge
  s.closePath();
  return s;
}

/** The dark charcoal wingtip — a small triangle over the outer, trailing corner. */
function wingTipShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0.98, -0.02);
  s.lineTo(1.32, 0.16);
  s.lineTo(0.58, 0.2);
  s.closePath();
  return s;
}

/** A fanned, slightly forked tail (span along X, splayed back along -Z). */
function tailShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.17, 0);
  s.lineTo(0.17, 0);
  s.lineTo(0.11, 0.5);
  s.lineTo(0, 0.4); // shallow fork
  s.lineTo(-0.11, 0.5);
  s.closePath();
  return s;
}

/** One wing: a flat swept blade + dark tip on a shoulder PIVOT that flaps (rot.z). */
function makeWing(dir: 1 | -1): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(dir * 0.24, 0.09, 0.04);
  const blade = new THREE.Group();
  const wing = new THREE.Mesh(
    new THREE.ShapeGeometry(wingShape()),
    mat(BIRD.wing, { side: THREE.DoubleSide }),
  );
  wing.rotation.x = -Math.PI / 2; // lay the flat shape horizontal
  const tip = new THREE.Mesh(
    new THREE.ShapeGeometry(wingTipShape()),
    mat(BIRD.wingTip, { side: THREE.DoubleSide }),
  );
  tip.rotation.x = -Math.PI / 2;
  tip.position.y = 0.01; // a hair above the blade so it never z-fights
  blade.add(wing, tip);
  if (dir < 0) {
    blade.scale.x = -1; // mirror for the left wing
  }
  pivot.add(blade);
  return pivot;
}

/** Everything one animated gull needs: its nodes + its flight-path parameters. */
interface BirdRig {
  readonly id: string;
  readonly root: THREE.Group;
  readonly leftWing: THREE.Group;
  readonly rightWing: THREE.Group;
  /** Loop center (world x/z) + elliptical radii the gull glides around. */
  readonly cx: number;
  readonly cz: number;
  readonly rx: number;
  readonly rz: number;
  /** Base altitude + a gentle vertical bob. */
  readonly y: number;
  readonly bob: number;
  readonly bobFreq: number;
  /** Signed angular speed (sign = orbit direction) + starting angle. */
  readonly angSpeed: number;
  readonly phase: number;
  /** Wing-flap amplitude / speed / phase, and the rest dihedral (a slight up-V). */
  readonly flapAmp: number;
  readonly flapSpeed: number;
  readonly flapPhase: number;
  readonly wingBase: number;
  /** Constant roll banked into the circular turn. */
  readonly bank: number;
}

/** Build one gull: a body, head + beak + eyes, two flapping wings, and a tail. */
function makeBirdNodes(scale: number): {
  root: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
} {
  const root = new THREE.Group();
  root.rotation.order = "YXZ"; // yaw, then pitch, then bank — reads as a natural turn
  root.scale.setScalar(scale);

  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mat(BIRD.body));
  body.scale.set(0.46, 0.4, 1.06); // a stretched, tapered fuselage
  root.add(body);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), mat(BIRD.body));
  head.position.set(0, 0.14, 0.62);
  root.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 6), mat(BIRD.beak));
  beak.rotation.x = Math.PI / 2; // point the tip forward (+Z)
  beak.position.set(0, 0.12, 0.88);
  root.add(beak);

  for (const ex of [-0.11, 0.11]) {
    const eye = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), mat(BIRD.eye));
    eye.position.set(ex, 0.2, 0.72);
    root.add(eye);
  }

  const tail = new THREE.Mesh(
    new THREE.ShapeGeometry(tailShape()),
    mat(BIRD.tail, { side: THREE.DoubleSide }),
  );
  tail.rotation.x = -Math.PI / 2 - 0.12; // flat, tips tilted up a touch
  tail.position.set(0, 0.06, -0.5);
  root.add(tail);

  const leftWing = makeWing(-1);
  const rightWing = makeWing(1);
  root.add(leftWing, rightWing);

  // Gulls ride high above the buildable ground; skip shadows so they never drop
  // flickering specks onto the play area or cost a shadow pass.
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }
  });

  return { root, leftWing, rightWing };
}

/**
 * Pose one gull at time `t`: glide it around its elliptical loop (facing its
 * heading, banked into the turn), bob + pitch gently, and flap its wings. Under
 * reduced motion `t` is held so the bird sits still (wings at their rest dihedral).
 */
function poseBird(rig: BirdRig, t: number, reduced: boolean): void {
  const ang = rig.phase + rig.angSpeed * t;
  const x = rig.cx + Math.cos(ang) * rig.rx;
  const z = rig.cz + Math.sin(ang) * rig.rz;
  const bob = reduced ? 0 : Math.sin(t * rig.bobFreq + rig.phase) * rig.bob;
  rig.root.position.set(x, rig.y + bob, z);

  // Heading = the velocity direction along the loop (local forward is +Z).
  const vx = -Math.sin(ang) * rig.rx * rig.angSpeed;
  const vz = Math.cos(ang) * rig.rz * rig.angSpeed;
  const pitch = reduced ? 0 : Math.sin(t * rig.bobFreq + rig.phase) * 0.05;
  rig.root.rotation.set(pitch, Math.atan2(vx, vz), rig.bank);

  const flap = reduced
    ? rig.wingBase
    : rig.wingBase + Math.sin(t * rig.flapSpeed + rig.flapPhase) * rig.flapAmp;
  rig.rightWing.rotation.z = flap;
  rig.leftWing.rotation.z = -flap;
}

/** Build the flock: a few gulls on varied loops over the island + surrounding sea. */
function buildBirds(layout: CityLayout, reduced: boolean): BirdRig[] {
  const rng = mulberry32(0xb17d5);
  const islandR = layout.islandRadius;
  const seaR = layout.seaRadius;
  const rigs: BirdRig[] = [];
  const COUNT = 5;
  for (let i = 0; i < COUNT; i += 1) {
    const { root, leftWing, rightWing } = makeBirdNodes(1.0 + rng() * 0.5);
    const angSpeed = (rng() < 0.5 ? -1 : 1) * (0.13 + rng() * 0.12);
    // Loops span the island margin out over the sea; the min radius keeps every
    // ground-track OUTSIDE the buildable disc so a gull never wheels over the build
    // area — they read as ambient sky around/over the island + lagoon, not clutter.
    const rx = islandR + rng() * (seaR * 0.9 - islandR);
    const rig: BirdRig = {
      id: `gull-${i}`,
      root,
      leftWing,
      rightWing,
      cx: (rng() - 0.5) * islandR * 0.34,
      cz: (rng() - 0.5) * islandR * 0.34,
      rx,
      rz: rx * (0.74 + rng() * 0.22),
      y: islandR * 1.15 + rng() * (islandR * 0.55), // ~34–51u up: well clear of buildings
      bob: 1.2 + rng() * 1.4,
      bobFreq: 0.5 + rng() * 0.4,
      angSpeed,
      phase: rng() * Math.PI * 2,
      flapAmp: 0.28 + rng() * 0.12,
      flapSpeed: 2.4 + rng() * 1.2,
      flapPhase: rng() * Math.PI * 2,
      wingBase: 0.12,
      bank: -Math.sign(angSpeed) * (0.2 + rng() * 0.14),
    };
    poseBird(rig, 0, reduced); // seat each gull before the first frame
    rigs.push(rig);
  }
  return rigs;
}

/**
 * The flock of gulls, animated on the frame loop: each glides around its own loop
 * over the island + sea with a subtle wing-flap. Motion-gated — under reduced
 * motion they hold still (posed once, no flap), honoring `prefers-reduced-motion`.
 */
function Birds({ layout, reducedMotion }: { layout: CityLayout; reducedMotion: boolean }) {
  const rigs = useMemo(() => buildBirds(layout, reducedMotion), [layout, reducedMotion]);
  /**
   * The flock as ONE object, which is both what gets rendered and what gets disposed.
   *
   * It used to be `rigs.map(rig => <primitive key={rig.id} object={rig.root} />)` inside
   * an r3f `<group>`; this is the same scene graph — a `THREE.Group` holding the same
   * roots — reached by building the group here instead. Gathering them is what gives the
   * flock a single identity for {@link useDisposableGraph} to key on, so a rebuild
   * releases the gulls it replaced. Parenting them into a group and ALSO rendering them
   * individually would not work: `add` reparents, so the two would fight over the roots.
   */
  const flock = useMemo(() => {
    const holder = new THREE.Group();
    for (const rig of rigs) {
      holder.add(rig.root);
    }
    return holder;
  }, [rigs]);
  useDisposableGraph(flock);
  useFrame((state) => {
    if (reducedMotion) {
      return;
    }
    const t = state.clock.elapsedTime;
    for (const rig of rigs) {
      poseBird(rig, t, false);
    }
  });
  return <primitive object={flock} />;
}

export function StarterIsland({
  layout,
  reducedMotion,
  eraId = CURRENT_ERA_ID,
}: {
  /**
   * The island to draw, AND the island this component's every measurement is against.
   *
   * `CityScene` hands it the layout the island is drawn on rather than the one the camera was
   * built from, which are the same object except during an era advance — see
   * `islandLand.ts`'s `islandDressingRadius`. One radius reaches this component, on purpose:
   * the whole defect this closes was the island and its dressing coming from two.
   */
  layout: CityLayout;
  reducedMotion: boolean;
  /**
   * The era the city is standing in — what the ground is dressed from (D-ERA26 / D-ERA32).
   *
   * Defaults to the first era rather than being required, so every existing caller (the dev
   * previews, the tests that mount the scene directly) keeps era one without being edited,
   * exactly as `Roads` takes its `eraId`. `CitySurface` reads the live era and `CityScene`
   * passes it through, so the real city re-dresses at an advance.
   */
  eraId?: EraId;
}) {
  // Keyed on the DRESSING and not on the era id: two eras that resolve to the same dressing
  // — which is every unauthored era today — rebuild nothing when the city advances between
  // them, and the memo is what makes the island's seeded geometry stable across a re-render.
  const dressing = useMemo(() => islandGround(eraId), [eraId]);
  const group = useMemo(() => {
    const authored = buildIslandGroup(layout, dressing, layout.islandRadius);
    const renderable = batchStaticIslandGraph(authored, { bakeSolidColors: true });
    renderable.userData.cityIslandRenderGraph = true;
    // The authored graph is only an input to the adapter. It never reaches r3f, so it
    // must be released here rather than waiting for `useDisposableGraph`, which owns
    // the batched graph below. Both graphs contain wholly-owned clones.
    disposeSceneGraph(authored);
    return renderable;
  }, [layout, dressing]);
  // AND THE OLD ISLAND GOES BACK. `<primitive>` is never disposed by react-three-fiber
  // — the object was built out here, so the reconciler will not claim ownership of it —
  // which left every era advance holding a whole extra island's worth of GPU buffers.
  // Measured before this line existed: nine advances and back took the renderer from
  // 1291 bound geometries to 9033 with the drawn scene unchanged at 752.
  useDisposableGraph(group);
  return (
    <>
      <primitive object={group} />
      <Birds layout={layout} reducedMotion={reducedMotion} />
    </>
  );
}
