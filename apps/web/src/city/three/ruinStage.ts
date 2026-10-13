import * as THREE from "three";

import { type Footprint, GRID_CELL, MAX_BUILD_HEIGHT } from "../worldLayout";
import { WINTER_SCENE_TONES as W } from "./winterTones";

/**
 * **THE RUIN SEAM. A RUINED BUILDING IS JUST ANOTHER STAGE.**
 *
 * A crisis does not remove a building (`engines/game/src/crisis-damage.ts` — the ruling is
 * that mastery and earned buildings survive), so a ruin is not a new asset class and not a
 * new placement. It is the SAME node, at the same cell, drawn from a different template —
 * exactly the relationship `site` and `construction` already have to `built`. So it reuses
 * that machinery end to end rather than running a second one beside it:
 *
 *  - it is a footprint-keyed cached template cloned per lot, like `neutralSiteModel` /
 *    `neutralConstructionModel` in `constructionStages.ts`;
 *  - it is selected as a `PlacedModelStack` layer kind (`"ruined"`), so going into ruins and
 *    being repaired out of them CROSS-FADE through the same `FadeLayer` a stage change uses;
 *  - it is contain-fit and grounded by `PlacedBuilding`'s own `prepareModel`, so it lands on
 *    the node's real footprint with no sizing rules of its own.
 *
 * ## THE ART LANDED HERE ON 2026-07-30, AND THIS FILE NO LONGER HOLDS A PLACEHOLDER
 *
 * {@link buildRuin} is the design batch's asset 8
 * (`docs/superpowers/specs/2026-07-30-winter-crisis-scene-assets.html`), wired in the local
 * units this file already worked in. It replaced two grey boxes — a knee-high mass over the
 * footprint plus one off-centre remnant — which the file itself asked to have replaced and
 * described as "deliberately crude so nobody mistakes it for art".
 *
 * If the ruin should instead be an authored GLB per node, the swap is still just as local:
 * {@link ruinedStageModel} is the only thing `PlacedBuilding` calls, so pointing it at a
 * loaded `gltf.scene` keeps the cache, the cross-fade and the picking untouched.
 *
 * ## CONSTRAINTS THAT BIND WHATEVER GOES IN HERE
 *
 * 1. **The ruin has to read at the game's fixed camera and at full zoom-out.** It reads by
 *    GEOMETRY, SILHOUETTE and TONE STEP — never by lighting. No emissive, no added light, no
 *    rim, no gradient: `flatShading` with a flat colour, which is what every other stage
 *    template here does.
 * 2. **Mastery gold `#FFB703` is reserved** and may never appear on a body. Nothing in
 *    {@link RUIN_TONES} may be it, and `ruinSeam.test.ts` fails if it becomes it.
 * 3. **It must occupy real volume inside the node's group.** A ruin is still clickable to its
 *    lesson, and on the canvas the click target IS the rendered geometry (`PlacedBuilding`
 *    puts `onClick` on the named group the model stack hangs under). An empty group would
 *    take the lesson away from the pointer, which is the one thing crisis damage may not do.
 * 4. **It must stay markedly shorter than the scaffold on the same lot** — `ruinSeam.test.ts`
 *    holds it under 0.6 of that height, per footprint. See {@link STOREY_PER_SPAN} for the
 *    one number that was re-derived rather than copied out of the batch, and why.
 */

/**
 * The ruin's tones, all of them the design batch's named palette.
 *
 * Exported so the reserved-gold assertion has something to sweep, and so a later replacement
 * has one obvious place to look for "what am I overwriting".
 *
 * **None of these may be a colour the site or the scaffold stage uses**, which `ruinSeam.test.ts`
 * asserts per footprint. That rules out the batch's `WOOD_LIT` (`0xb08968`, which is exactly
 * `constructionStages.ts`'s `TIMBER`) and it is the reason the batch's colder `STONE_DARK`
 * rather than the shipped `0xd9ccb2` footing stone is what a ruin is built from — see
 * {@link W} for the whole of that decision.
 */
export const RUIN_TONES = {
  /** Standing wall, outside face. */
  wall: W.WOOD_MID,
  /** Exposed interior — the timber a standing building never shows. */
  inner: W.WOOD_DARK,
  /** The fallen roof and the beams under it. */
  char: W.CHAR,
  /** Rubble that was masonry. */
  stone: W.STONE_DARK,
  /** Snow settled on the rubble and on the fallen roof. */
  snow: W.SNOW_LIT,
} as const;

/**
 * A ruin's storey height, as a fraction of its plot's SHORTER span.
 *
 * **THE ONE NUMBER RE-DERIVED RATHER THAN COPIED.** The batch authors `buildRuin(w = 3.2,
 * d = 3.0, storey = 3.0)` — a storey nearly as tall as the building is wide. That aspect is
 * wrong for this renderer, and not by a little: `prepareModel` contain-fits every stage to its
 * plot, so a template authored at a 0.94 height-to-width ratio renders at 0.94 of its plot's
 * span whatever numbers it was written in. On a 2×2 that is 7.2 world units, where the
 * Roundhouse standing on the same plot renders 4.821u — a wrecked building taller than the
 * building it replaced, which is exactly the defect the shipped placeholder's own comment
 * records having shipped once already.
 *
 * So the storey is expressed against the plot instead. At 0.55 of the shorter span the tallest
 * element (the corner shard, at `storey * 0.96`) lands at about 53% of that span, comfortably
 * under the 0.6-of-the-scaffold ceiling on every authored footprint — the 1×1 is the binding
 * one, where the scaffold is only 5.2u tall. `ruinSeam.test.ts` measures the margin rather
 * than taking it on trust.
 */
const STOREY_PER_SPAN = 0.55;

/** Wall thickness, as a fraction of the storey. */
const WALL_T = 0.093;

function ruinMat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });
}

/** One box, positioned and tilted, with both shadow flags stated. */
function box(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  ry = 0,
  rz = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(0, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/**
 * **SAME FOOTPRINT, DIFFERENT SILHOUETTE.**
 *
 * The rule that makes a ruin read from any heading: no two of the four walls share a height,
 * one wall leans, and the roof is present but on the floor. A ruin whose walls are all
 * half-height reads as a building UNDER CONSTRUCTION — which is a state the same lot can
 * genuinely be in, so the two have to be told apart — and a ruin with a stub, a shard and a
 * lean reads as collapse. Snow settles on the rubble and on the fallen roof, which also says
 * the ruin has been there a while.
 *
 * The exposed interior floor is `WOOD_DARK` and the beams are `CHAR`: a real value step where
 * the reference plates had a painted occlusion pool, which would have needed an AO pass.
 *
 * 21 boxes. The same draw-budget class as a standing building.
 */
export function buildRuin(w: number, d: number, storey: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "ruin";
  const M = {
    wall: ruinMat(RUIN_TONES.wall),
    inner: ruinMat(RUIN_TONES.inner),
    char: ruinMat(RUIN_TONES.char),
    stone: ruinMat(RUIN_TONES.stone),
    snow: ruinMat(RUIN_TONES.snow),
  };
  const t = storey * WALL_T;
  const deg = THREE.MathUtils.degToRad;

  // Four walls, four different heights. This is the whole silhouette read.
  box(g, w, storey * 0.74, t, M.wall, 0, storey * 0.37, -d / 2);
  box(g, t, storey * 0.3, d * 0.62, M.wall, -w / 2, storey * 0.15, d * 0.1);
  box(g, t, storey * 0.58, d * 0.4, M.wall, w / 2, storey * 0.29, -d * 0.2, 0, deg(-7));
  box(g, w * 0.34, storey * 0.16, t, M.wall, -w * 0.3, storey * 0.08, d / 2);

  // A shard: one corner post still standing above the wall line. Reads at distance.
  box(g, t * 1.2, storey * 0.96, t * 1.2, M.inner, -w / 2 + t, storey * 0.48, -d / 2 + t);

  // Exposed interior floor, darker — stands in for the missing ambient occlusion.
  const floor = box(g, w - t * 2, storey * 0.027, d - t * 2, M.inner, 0, storey * 0.02, 0);
  floor.castShadow = false;

  // The roof, collapsed inward: one tilted slab resting on the wall and the floor.
  box(
    g,
    w * 0.86,
    storey * 0.067,
    d * 0.72,
    M.char,
    w * 0.04,
    storey * 0.3,
    d * 0.02,
    deg(6),
    deg(-34),
  );

  // Charred beams: thin, long, crossing. Three is enough; five reads as debris soup.
  const beam = storey * 0.053;
  box(g, beam, beam, d * 1.05, M.char, -w * 0.18, storey * 0.12, d * 0.06, deg(22), deg(9));
  box(
    g,
    beam * 0.88,
    beam * 0.88,
    w * 0.95,
    M.char,
    w * 0.16,
    storey * 0.073,
    -d * 0.18,
    deg(-64),
    deg(-4),
  );
  box(
    g,
    beam * 0.88,
    storey * 0.42,
    beam * 0.88,
    M.char,
    w * 0.3,
    storey * 0.2,
    d * 0.3,
    0,
    deg(28),
  );

  // Rubble, each lump capped with snow. A cap is a separate small box, never a decal.
  const unit = Math.min(w, d);
  const rubble = [
    [-0.28, 0.19, 0.14],
    [0.22, -0.25, 0.17],
    [0.34, 0.28, 0.11],
    [-0.09, -0.34, 0.15],
  ] as const;
  rubble.forEach(([rx, rz, rs], i) => {
    const s = unit * rs;
    const x = w * rx;
    const z = d * rz;
    box(
      g,
      s,
      s * 0.7,
      s * 0.9,
      i % 2 ? M.stone : M.inner,
      x,
      s * 0.35,
      z,
      i * 0.9,
      deg(i * 6 - 9),
    );
    box(g, s * 0.92, s * 0.18, s * 0.82, M.snow, x, s * 0.7 + s * 0.09, z, i * 0.9);
  });

  // Snow on the fallen roof slab: the flattest large up-face in the ruin.
  box(
    g,
    w * 0.62,
    storey * 0.033,
    d * 0.5,
    M.snow,
    w * 0.1,
    storey * 0.3 + storey * 0.1,
    d * 0.02,
    deg(6),
    deg(-34),
  );

  return g;
}

const ruinTemplates = new Map<string, THREE.Object3D>();

/** A stable cache key for a footprint (`"2x2"`, `"1x2"`, `"1x1"`, …). */
function footprintKey(fp: Footprint): string {
  return `${fp.w}x${fp.d}`;
}

/**
 * The RUINED representation for a footprint (cached; cloned per lot by `prepareModel`).
 *
 * This is the whole public surface of the seam: `PlacedBuilding` calls exactly this and
 * nothing else, so whatever a ruin becomes, it becomes it here.
 *
 * The template is built at the PLOT's own span so the ruin keeps the wrecked building's
 * footprint — the batch's requirement, and what keeps the grid cell still fitting — with the
 * storey derived from the shorter span (see {@link STOREY_PER_SPAN}).
 */
export function ruinedStageModel(fp: Footprint): THREE.Object3D {
  const key = footprintKey(fp);
  let template = ruinTemplates.get(key);
  if (!template) {
    const w = fp.w * GRID_CELL;
    const d = fp.d * GRID_CELL;
    template = buildRuin(w, d, Math.min(w, d) * STOREY_PER_SPAN);
    ruinTemplates.set(key, template);
  }
  return template;
}

/** The tallest a ruin template may stand, per footprint — a ceiling, not a target. */
export const RUIN_HEIGHT_CEILING = MAX_BUILD_HEIGHT * 0.5;
