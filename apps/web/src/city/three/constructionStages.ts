import * as THREE from "three";

import { type Footprint, GRID_CELL } from "../worldLayout";

/**
 * Shared, building-AGNOSTIC build-phase geometry (framework-free three.js).
 *
 * FALLBACK ONLY: a node with authored art renders its OWN `site`/`construction`/`built`
 * GLBs (see `buildingAssets.ts`), so it builds up as itself (the Roundhouse as a
 * roundhouse, the Lookout as a stepped tower, etc.). The three neutral templates here —
 * foundation (`site`), scaffold (`construction`) and finished shell (`built`) — are the
 * FAIL-CLOSED fallback `resolveBuildingModel` returns for a phase a node has no GLB for.
 * Each reads as "this plot is at that phase" without previewing any specific (possibly
 * wrong) building.
 *
 * ## WHY A NEUTRAL `built` EXISTS AT ALL, AND WHAT IT IS LOAD-BEARING FOR
 *
 * `site` and `construction` were fallbacks for a phase; `built` is a fallback for a whole
 * NODE. 56 of the 62 in-product nodes have no building model, and the moment the city's
 * roster stopped being era one's six (`engines/game/src/city-roster.ts`) every one of them
 * became placeable. `PlacedBuilding` renders its named, click-handling `<group>`
 * unconditionally and hangs all geometry inside it, so a node that resolved to nothing was
 * about to become an invisible building AND an unclickable one: on the canvas the pointer
 * hits GEOMETRY, so a group with no mesh has no raycast target and its `onClick` can never
 * fire, which puts the lesson behind it out of reach. That is the same constraint the ruin
 * template is held to (`ruinStage.ts`), for the same reason.
 *
 * It is deliberately GENERIC and not a guess at any era's architecture: a plain shell with
 * a hipped roof and a door, in the island's own palette. It says "a finished building
 * stands here" and nothing about what the building is. Replacing it for a node is
 * additive and local — drop that node's `built` GLB into `art/models/` and
 * `resolveBuildingModel` picks it up by node id with no code change.
 *
 * PER-FOOTPRINT: each building has its own footprint (`NODE_FOOTPRINTS`), so the
 * neutral foundation/scaffold are built to MATCH that footprint's aspect ratio —
 * the base spans `w × d` cells around the origin, so after `PlacedBuilding`'s
 * contain-fit (`prepareModel`) a 1×1 School site is visibly smaller than a 2×2
 * Tower site, and a 1×2 site is rectangular (not a square dropped in a strip). The
 * templates are cached per footprint (cloned per lot), and share the exact same
 * contain-fit + ground path the GLB stages use, so the footprint and the site →
 * construction → built cross-fade stay consistent across every phase.
 *
 * Palette matches the warm low-poly village (`StarterIsland` / the art bible):
 * dug earth, poured stone footing, timber scaffold, plank decking.
 */

const EARTH = 0xb98f57;
const STONE = 0xd9ccb2; // poured footing (parchment-deep, per palette)
const STONE_LIGHT = 0xe7ddc9; // foundation floor / fresh concrete
const STONE_CORE = 0xcabfa6; // rising ground-floor core
const TIMBER = 0xb08968; // scaffold poles + rails (BASE.timber)
const TIMBER_LIGHT = 0xcaa87e; // planks / platform decking / ladder
const SAND = 0xefd299; // gravel + material piles
const STRING = 0xeee6d5; // mason's layout line

/**
 * The neutral BUILT shell's tones. Warm plaster walls, a timber roof and a darker door —
 * the island's own palette, so an unmapped building reads as part of the settlement rather
 * than as a debug box, and one clear tone step between wall and roof so the silhouette
 * survives full zoom-out.
 *
 * Exported so the reserved-gold sweep has something to read: mastery gold `#FFB703` is
 * reserved for stars and rewards and may never be a body colour (`ruinSeam.test.ts` holds
 * the same rule for the ruin).
 */
export const NEUTRAL_BUILT_TONES = {
  /** Plastered wall mass filling the footprint. */
  wall: 0xe3d6bd,
  /** Roof, one clear step darker than the wall. */
  roof: 0x9c6f4e,
  /** Door and sill — the detail that says "finished and in use", not "a block". */
  door: 0x7a5638,
} as const;

/** Bare earth rim (world units) left around the footing inside the plot pad. */
const EARTH_RIM = 0.8;

function mat(color: number, rough = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: 0.02,
    flatShading: true,
  });
}

/** Add a flat-shaded box at `(x,y,z)`, optionally spun about Y (for braces/beams). */
function box(
  g: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
  rot?: { axis: "x" | "y" | "z"; angle: number },
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  if (rot) {
    m.rotation[rot.axis] = rot.angle;
  }
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function cone(
  g: THREE.Object3D,
  radius: number,
  height: number,
  color: number,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 7), mat(color, 0.96));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/**
 * A flat-shaded hipped roof: a four-sided pyramid whose base is AXIS-ALIGNED, so it can be
 * scaled to cover a rectangular footprint. `thetaStart` of a quarter-turn is what aligns
 * it; rotating the mesh instead would rotate the per-axis scale with it and leave a
 * diamond over a rectangular plot.
 */
function pyramid(
  g: THREE.Object3D,
  halfW: number,
  halfD: number,
  height: number,
  color: number,
  y: number,
): THREE.Mesh {
  const m = new THREE.Mesh(
    // radius √2 at thetaStart π/4 puts the four base vertices on (±1, ±1).
    new THREE.ConeGeometry(Math.SQRT2, height, 4, 1, false, Math.PI / 4),
    mat(color, 0.94),
  );
  m.scale.set(halfW, 1, halfD);
  m.position.set(0, y, 0);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/**
 * A mild height scale so a bigger footprint reads as a taller build going up (a
 * 2×2 Tower scaffold rises past a 1×1 School scaffold), while the horizontal build
 * always fills the footprint. `(w + d) / 4` → 1 for 2×2, 0.75 for 1×2, 0.5 for 1×1.
 */
function heightScale(fp: Footprint): number {
  return (fp.w + fp.d) / 4;
}

/**
 * The neutral SITE: a dug earth pad FILLING the footprint, with a poured stone
 * stem-wall footing tracing it (inset by a slim earth rim) around an open recessed
 * floor, corner survey stakes strung with a mason's line, and a small gravel pile —
 * the universal "ground broken, foundation laid" read, sized to the footprint.
 */
function buildSite(fp: Footprint): THREE.Object3D {
  const g = new THREE.Group();
  const cw = fp.w * GRID_CELL; // footprint width (x), world units
  const cd = fp.d * GRID_CELL; // footprint depth (z), world units

  // Excavated earth pad — fills the plot footprint (defines the horizontal extent).
  box(g, cw, 0.4, cd, EARTH, 0, 0.2, 0);

  // Poured stem-wall footing tracing the footprint (inset by the earth rim), with
  // an open, slightly recessed floor slab inside (an empty foundation).
  const wallH = 0.7;
  const wallY = 0.4 + wallH / 2;
  const t = 0.5; // wall thickness
  const ow = cw - EARTH_RIM; // footing outer width
  const od = cd - EARTH_RIM; // footing outer depth
  box(g, ow, wallH, t, STONE, 0, wallY, od / 2 - t / 2); // back wall
  box(g, ow, wallH, t, STONE, 0, wallY, -(od / 2 - t / 2)); // front wall
  box(g, t, wallH, od - t * 2, STONE, ow / 2 - t / 2, wallY, 0); // right wall
  box(g, t, wallH, od - t * 2, STONE, -(ow / 2 - t / 2), wallY, 0); // left wall
  box(g, ow - t * 2, 0.24, od - t * 2, STONE_LIGHT, 0, 0.55, 0); // recessed floor

  // Corner survey stakes strung with a mason's layout line (just inside the pad).
  const sx = cw / 2 - 0.25;
  const sz = cd / 2 - 0.25;
  const stakeTop = 1.5;
  const corners: [number, number][] = [
    [sx, sz],
    [sx, -sz],
    [-sx, sz],
    [-sx, -sz],
  ];
  for (const [x, z] of corners) {
    box(g, 0.16, stakeTop, 0.16, TIMBER, x, 0.4 + stakeTop / 2, z);
  }
  const lineY = 0.4 + stakeTop - 0.15;
  box(g, sx * 2, 0.05, 0.05, STRING, 0, lineY, sz); // back line
  box(g, sx * 2, 0.05, 0.05, STRING, 0, lineY, -sz); // front line
  box(g, 0.05, 0.05, sz * 2, STRING, sx, lineY, 0); // right line
  box(g, 0.05, 0.05, sz * 2, STRING, -sx, lineY, 0); // left line

  // A small gravel pile tucked in a corner of the yard (materials delivered).
  const gravelR = Math.min(cw, cd) * 0.16;
  cone(g, gravelR, 1.0, SAND, sx - gravelR, 0.9, sz - gravelR);

  return g;
}

/**
 * The neutral CONSTRUCTION: the same footprint-filling footing with a rising
 * concrete core wrapped in a timber scaffold — corner poles, ledger rings, diagonal
 * braces, a part-laid plank deck, and an access ladder. The universal "building
 * going up", sized to the footprint (taller for a bigger plot via `heightScale`).
 */
function buildConstruction(fp: Footprint): THREE.Object3D {
  const g = new THREE.Group();
  const cw = fp.w * GRID_CELL;
  const cd = fp.d * GRID_CELL;
  const hs = heightScale(fp);

  // Foundation base carried up from the site read (fills the footprint).
  box(g, cw, 0.4, cd, EARTH, 0, 0.2, 0);
  box(g, cw - EARTH_RIM, 0.5, cd - EARTH_RIM, STONE, 0, 0.5, 0);

  // Rising ground-floor concrete core (topped out well below a finished building).
  const coreH = 3.6 * hs;
  box(g, cw * 0.5, coreH, cd * 0.5, STONE_CORE, 0, 0.75 + coreH / 2, 0);

  // Scaffold: four corner poles rising past the core (just inside the plot).
  const px = cw / 2 - 0.35;
  const pz = cd / 2 - 0.35;
  const poleH = 9.4 * hs;
  const poleBaseY = 0.5;
  const poleY = poleBaseY + poleH / 2;
  const corners: [number, number][] = [
    [px, pz],
    [px, -pz],
    [-px, pz],
    [-px, -pz],
  ];
  for (const [x, z] of corners) {
    box(g, 0.18, poleH, 0.18, TIMBER, x, poleY, z);
  }

  // Horizontal ledger rings tying the poles together (rectangular with the plot).
  const spanX = px * 2;
  const spanZ = pz * 2;
  for (const frac of [0.25, 0.55, 0.84]) {
    const ringY = poleBaseY + poleH * frac;
    box(g, spanX, 0.12, 0.12, TIMBER, 0, ringY, pz);
    box(g, spanX, 0.12, 0.12, TIMBER, 0, ringY, -pz);
    box(g, 0.12, 0.12, spanZ, TIMBER, px, ringY, 0);
    box(g, 0.12, 0.12, spanZ, TIMBER, -px, ringY, 0);
  }

  // Diagonal braces on two faces (a bay of scaffold cross-bracing).
  const braceRise = poleH * 0.3;
  const braceY = poleBaseY + poleH * 0.4;
  const braceLenX = Math.hypot(spanX, braceRise);
  const braceAngleX = Math.atan2(braceRise, spanX);
  box(g, braceLenX, 0.1, 0.1, TIMBER, 0, braceY, pz, { axis: "z", angle: braceAngleX });
  const braceLenZ = Math.hypot(spanZ, braceRise);
  const braceAngleZ = Math.atan2(braceRise, spanZ);
  box(g, 0.1, 0.1, braceLenZ, TIMBER, px, braceY, 0, { axis: "x", angle: -braceAngleZ });

  // A part-laid plank working deck on a mid ledger (offset — a floor in progress).
  const deckY = poleBaseY + poleH * 0.55;
  box(g, spanX + 0.4, 0.16, Math.min(cd, spanZ) * 0.5, TIMBER_LIGHT, 0, deckY, cd * 0.12);

  // Access ladder on the front face.
  const ladderH = poleH * 0.6;
  const railX = Math.min(0.9, cw * 0.22);
  box(g, 0.12, ladderH, 0.12, TIMBER_LIGHT, -railX, poleBaseY + ladderH / 2, pz + 0.25);
  box(g, 0.12, ladderH, 0.12, TIMBER_LIGHT, railX, poleBaseY + ladderH / 2, pz + 0.25);
  const rungs = 5;
  for (let i = 0; i < rungs; i += 1) {
    const ry = poleBaseY + 0.6 + (i * (ladderH - 1.0)) / (rungs - 1);
    box(g, railX * 2, 0.1, 0.1, TIMBER_LIGHT, 0, ry, pz + 0.25);
  }

  // A small stack of decking on the ground (staged materials), inside the plot.
  const stack = Math.min(cw, cd) * 0.32;
  box(
    g,
    stack,
    0.28,
    stack * 0.42,
    TIMBER_LIGHT,
    -px + stack * 0.5,
    0.9,
    -pz + stack * 0.4,
  );

  return g;
}

/**
 * The neutral BUILT shell: a plastered wall mass filling the footprint on a low plinth,
 * under a hipped timber roof with a modest eaves overhang, with a door and two windows on
 * the front face. The universal "a finished building stands here", sized to the footprint
 * and taller on a bigger plot via `heightScale` — the same rule the site and the scaffold
 * grow by, so an unmapped node's three phases read as one building going up.
 *
 * It carries no era, no silhouette family and no mastery signal. It is what a node wears
 * until its own `built` GLB lands.
 */
function buildBuilt(fp: Footprint): THREE.Object3D {
  const g = new THREE.Group();
  const cw = fp.w * GRID_CELL;
  const cd = fp.d * GRID_CELL;
  const hs = heightScale(fp);

  // Low plinth, inset by the same rim the site's footing uses, so the shell sits ON
  // something rather than growing straight out of the grass.
  const plinthH = 0.35;
  box(g, cw - EARTH_RIM * 0.5, plinthH, cd - EARTH_RIM * 0.5, STONE, 0, plinthH / 2, 0);

  // The wall mass. Inset a hair further than the plinth so the plinth reads as a base.
  const wallH = 4.4 * hs;
  const ww = cw - EARTH_RIM;
  const wd = cd - EARTH_RIM;
  const wallY = plinthH + wallH / 2;
  box(g, ww, wallH, wd, NEUTRAL_BUILT_TONES.wall, 0, wallY, 0);

  // Hipped roof, covering the walls with a small eaves overhang.
  const roofH = 2.6 * hs;
  const overhang = 0.5;
  pyramid(
    g,
    (ww + overhang) / 2,
    (wd + overhang) / 2,
    roofH,
    NEUTRAL_BUILT_TONES.roof,
    plinthH + wallH + roofH / 2,
  );

  // Door on the front (+Z) face, and two windows either side of it: the detail that makes
  // the mass read as inhabited at the fixed camera rather than as an untextured block.
  const doorW = Math.min(1.4, ww * 0.28);
  const doorH = Math.min(2.4, wallH * 0.55);
  const face = wd / 2;
  box(g, doorW, doorH, 0.2, NEUTRAL_BUILT_TONES.door, 0, plinthH + doorH / 2, face);
  const windowSize = Math.min(0.9, ww * 0.16);
  const windowX = ww * 0.3;
  for (const x of [-windowX, windowX]) {
    box(
      g,
      windowSize,
      windowSize,
      0.16,
      NEUTRAL_BUILT_TONES.door,
      x,
      plinthH + wallH * 0.62,
      face,
    );
  }

  return g;
}

const siteTemplates = new Map<string, THREE.Object3D>();
const constructionTemplates = new Map<string, THREE.Object3D>();
const builtTemplates = new Map<string, THREE.Object3D>();

/** A stable cache key for a footprint (`"2x2"`, `"1x2"`, `"1x1"`, …). */
function footprintKey(fp: Footprint): string {
  return `${fp.w}x${fp.d}`;
}

/** The shared neutral SITE foundation template for a footprint (cached; cloned per lot). */
export function neutralSiteModel(fp: Footprint): THREE.Object3D {
  const key = footprintKey(fp);
  let template = siteTemplates.get(key);
  if (!template) {
    template = buildSite(fp);
    siteTemplates.set(key, template);
  }
  return template;
}

/** The shared neutral CONSTRUCTION scaffold template for a footprint (cached; cloned per lot). */
export function neutralConstructionModel(fp: Footprint): THREE.Object3D {
  const key = footprintKey(fp);
  let template = constructionTemplates.get(key);
  if (!template) {
    template = buildConstruction(fp);
    constructionTemplates.set(key, template);
  }
  return template;
}

/**
 * The shared neutral BUILT shell for a footprint (cached; cloned per lot) — what a node
 * with no `built` GLB of its own tops out into, so it is a visible, clickable building
 * rather than an empty group.
 */
export function neutralBuiltModel(fp: Footprint): THREE.Object3D {
  const key = footprintKey(fp);
  let template = builtTemplates.get(key);
  if (!template) {
    template = buildBuilt(fp);
    builtTemplates.set(key, template);
  }
  return template;
}
