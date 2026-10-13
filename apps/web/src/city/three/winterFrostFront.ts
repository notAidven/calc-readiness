import * as THREE from "three";

import { GRID_CELL } from "../worldLayout";
import { flatWinter } from "./winterScene";
import { WINTER_GROUND_TONES } from "./winterTones";

/**
 * **WHERE THE FROST COMES FROM, AND WHICH WAY IT IS GOING — DRAWN, NOT IMPLIED.**
 *
 * The lead, on the winter running over his city: *"right now the frost layer is not very
 * visible / where the frost is right now. it should also be visible on load, so that users can
 * see where the frost starts. it needs to be more apparent what's actually happening."*
 *
 * ## THE FROST WAS NOT FAINT. AT ROUND ONE THERE WAS NONE OF IT
 *
 * `createHardWinter` opens with `frozen: []`; the first advance is part of `end_round`, so that
 * round one is a real decision and not a cutscene. Measured on era one's board, the panel in his
 * own screenshot is exactly right: **0 of 88 cells frozen, 0 on the frost line**, and the ground
 * the frost takes when the round closes is the whole **28-cell shoreline band**. Nothing was
 * rendering dimly. There was nothing to render, and the renderer was faithful.
 *
 * So this is not a brightness fix. What is missing is the state that says *the frost starts
 * HERE and is coming THIS WAY* before it has taken anything, and the engine now projects it:
 * `WinterCellView.frost_next`, computed through the reducer's own advance
 * (`winterFrostAfterAdvance`) so the picture cannot promise ground the rules will not take.
 *
 * ## THE WHOLE ISLAND IS ALREADY WHITE, WHICH RULES OUT THREE OBVIOUS ANSWERS
 *
 * #323 made every winter ground state faceted terrain, tonally varied, snow-toned — the right
 * call, and the reason frost has no lightness contrast left. Frost is 0.79 relative luminance
 * against lit snow's 0.90. So:
 *
 *  - **not another pale tone.** More white on white marks nothing;
 *  - **not a translucent wash.** Alpha over near-white snow composites to a pale tint however
 *    the numbers read on paper — `winterFireGhost.ts` had its ramp raised off a photograph for
 *    exactly that, and this state could least afford it;
 *  - **not a fill in a new hue.** The three hues that carry correctness in this game are spoken
 *    for, and a fourth flat colour on the ground would be a fifth mottled patch to tell apart.
 *
 * What is left, and what this is: **value, form, and the boundary drawn as an object.** The
 * front is the one dark thing on a white board (`WINTER_GROUND_TONES.frostFront`, 0.19), it has
 * real height so the flat overcast key catches its faces and it throws a short shadow, and it is
 * two marks rather than one because the player is asking two different questions.
 *
 * ## THE TWO MARKS, AND THE QUESTION EACH ANSWERS
 *
 *  - **{@link FROST_FRONT_WALL_NAME}, the wall.** *How far has it got?* A run of jammed,
 *    tilted plates standing along every edge of a `frost_next` cell that faces ground the frost
 *    already holds, or open water. One rule, and it lands in the right place in both cases that
 *    matter: at round one nothing is frozen, so it faces water and the wall is a ring around the
 *    settlement's shoreline — *this is where the frost starts*. Mid-encounter it faces the frozen
 *    sheet, so the wall is a ring at the frost's real edge — *this is how far it has got*. Where
 *    a fire is holding the ground, the neighbour is neither water nor frozen, so the wall breaks
 *    and the front visibly dents around the fire.
 *  - **{@link FROST_FRONT_REACH_NAME}, the reach.** *What is it about to take?* Tapered rime
 *    shards lying across the cell from the wall INWARD, pointing the way the frost is moving. A
 *    static line says how far; a field of shards all pointing the same way says which way.
 *
 * **THE REACH USED TO CLAIM A THIRD JOB AND NO LONGER HAS IT (2026-08-04).** The sentence here
 * read *"it is also what makes a two-step late round read as deeper than a one-step early one,
 * because the band behind the wall is two cells of shards instead of one"* — and that band of
 * shards, on a cell with no wall of its own, is what a player sees as a SECOND concentric ring.
 * The lead has ruled it off for the fifth time. `frostFrontMarks` in `WinterGround.tsx` now
 * marks the stand ring alone, so the shards always lie on the same cells the plates stand on;
 * how deep the round is stays in the crisis panel's words and in how far the frost's own extent
 * jumps when the round closes. Both marks are still owed and are still two questions — this file
 * is untouched by that change, which is the point of it owning WHAT a mark is and nothing about
 * WHICH cells wear one.
 *
 * ## THE GRAMMAR IS THE SCENE'S OWN, WHICH IS WHY IT READS AS ICE
 *
 * The plates are shove ice. `buildFrozenLagoon` already establishes that where ice meets not-ice
 * on this island there is a broken jammed lip of tilted plates, and its own note says why: *"the
 * lip carries the read. Without it, ice and water are two flat colours meeting along a line,
 * which looks like a selection error rather than a freeze."* That is the identical problem one
 * scale down, so it takes the identical answer rather than inventing a second vocabulary for it.
 *
 * ## IT MUST NOT BE MISTAKEN FOR THE FIRE GHOST, AND IT IS SEPARATED ON THREE CHANNELS
 *
 * The convention `winterFireGhost.ts` owns is *translucent ochre = ground a fire WOULD hold,
 * solid ochre = ground it does hold*: proposal against fact. A "the frost arrives here next"
 * treatment sits right beside that and must not be read for either half of it.
 *
 *  - **hue** — cold blue against ochre, and they mean opposite things (ground about to be lost
 *    against ground that would be saved), so the palette split is the semantic one;
 *  - **form** — standing objects on the ground against a ground-plane patch. The ghost is the
 *    terrain the cell would become; this is a thing arriving on the terrain it has not taken;
 *  - **opacity** — opaque against translucent. Which is the honest reading, and not merely a
 *    convenient difference: the ghost is a hypothesis about a declaration nobody has made, and
 *    where it lands depends on a batch nobody has answered. The front is not a hypothesis. It is
 *    the frost's published timetable, the panel states it in words as a fact of the round (*"1
 *    step of frost this round"*), and the player is meant to plan against it.
 *
 * So a candidate aimed at the front shows translucent ochre patches BEHIND opaque blue walls,
 * which is the decision stated in one picture: this fire would hold the ground that is next.
 */

/** The whole per-cell mark, so a test can count one thing per cell rather than its parts. */
export const FROST_FRONT_NAME = "winter-frost-front";
/** The jammed plates standing on the frost's own edge. */
export const FROST_FRONT_WALL_NAME = "winter-frost-front-wall";
/** The shards reaching inward across the ground the round will take. */
export const FROST_FRONT_REACH_NAME = "winter-frost-front-reach";

/**
 * How tall the wall stands, in world units.
 *
 * Sized against `DRIFT_MAX_H` (0.9), which `winterScene.ts` derived as the ceiling above which a
 * drift starts eating the wall of a one-storey building at this tilt. The front is drawn on
 * ground the settlement is still standing on, so it takes a fraction under that: tall enough to
 * catch the key light on its top faces and throw a short shadow, low enough that a ring of it
 * cannot hide the buildings inside the ring. The read is carried by VALUE — this is what makes
 * the value read as an object rather than as paint.
 */
const WALL_H = 0.72;

/** How thick a plate is across the edge it stands on. */
const WALL_THICK = 0.52;

/** Plates per exposed edge. Three across a 4-unit cell, overlapping, so the run reads jammed. */
const PLATES_PER_EDGE = 3;

/** How far inside the cell's own boundary the wall stands, so it never z-fights a neighbour. */
const WALL_INSET = 0.42;

/**
 * How much of a plate is bedded BELOW its rung, as a share of its height.
 *
 * Shove ice is pushed up out of the surface it came from, so a run of plates sitting flat on top
 * of the snow reads as a fence somebody built rather than as ice the cold shoved ashore. A
 * quarter is enough to say so.
 *
 * It is also the number the first draft got wrong in the other direction, and the frame is what
 * caught it: the plates and the shards were both built centred on their rung, so HALF of each was
 * underground and the wall stood 0.42 units of a designed 0.72. Photographed at the lead's
 * window, the front read as a thin bright line with the rime almost gone from the near arc, where
 * the shards point away from the camera and the wall is all there is to see.
 */
const WALL_BED = 0.25;

/** How long the shards reach into the cell, as a share of it. */
const REACH_SPAN = 0.62;

/** Shards per approach direction. */
const SHARDS_PER_APPROACH = 3;

/** How wide a shard is at its base, and how tall. Low and tapered: rime, not a fence. */
const SHARD_WIDTH = 0.46;
const SHARD_H = 0.34;

/** Which side of a cell a mark stands on. */
export type FrostFrontSide = "north" | "south" | "east" | "west";

/**
 * Outward unit normal per side, in the grid's own axes.
 *
 * `north` is `row - 1` and `south` is `row + 1`, matching `CellExposure` in `winterScene.ts` and
 * `cellCenter`'s mapping of row to +Z — so a side named here is the same side the terrain
 * builder feathers.
 */
const SIDE_NORMAL: Readonly<Record<FrostFrontSide, readonly [number, number]>> = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
};

export const FROST_FRONT_SIDES: readonly FrostFrontSide[] = [
  "north",
  "south",
  "east",
  "west",
];

/**
 * Which sides of one cell the frost is coming from.
 *
 * Two lists rather than one, because they are two different claims and the wall would land in
 * the wrong place if they were merged:
 *
 *  - `wall` is the frost's REAL edge — a side facing open water or ground already frozen. The
 *    plates stand only here, so the ring is one line and never a lattice between two cells the
 *    same round is taking;
 *  - `approach` is every direction the advance is arriving from, `wall` plus a side facing
 *    another `frost_next` cell nearer the shore. It exists for the shards' HEADING: on a
 *    two-step round the deeper of the two cells has no wall of its own, and its shards still
 *    have to point the same way as the ones in front of it rather than defaulting to an axis.
 */
export interface FrostFrontApproach {
  readonly wall: readonly FrostFrontSide[];
  readonly approach: readonly FrostFrontSide[];
}

const MATERIALS = new Map<string, THREE.MeshStandardMaterial>();

/**
 * A flat-shaded opaque material per value step of the front's one tone, cached.
 *
 * A value MULTIPLIER on `frostFront` rather than a second authored colour, exactly as
 * `buildCellTerrain` varies its facets: the state stays one named tone, so the in-city legend
 * can paint its swatch from `WINTER_GROUND_TONES` and `winterGround.test.ts`'s reserved-gold
 * sweep still sees the hue it checks.
 */
function frontTone(value: number): THREE.MeshStandardMaterial {
  const key = value.toFixed(3);
  const cached = MATERIALS.get(key);
  if (cached) {
    return cached;
  }
  const color = new THREE.Color(WINTER_GROUND_TONES.frostFront).multiplyScalar(value);
  const made = flatWinter({ color, roughness: 0.9 });
  MATERIALS.set(key, made);
  return made;
}

/** One plate of shove ice, shared across every cell: 224 plates are a handful of draw calls. */
const PLATE_GEO = new THREE.BoxGeometry(1, WALL_H, WALL_THICK);

/**
 * One rime shard, base at the origin and tip along +X, shared the same way.
 *
 * A four-sided cone laid on its side, flattened: the cheapest shape that is unmistakably a
 * TAPER, and a taper is what carries the heading. A box would read as a tick mark, which says
 * where without saying which way.
 */
const SHARD_GEO = (() => {
  const cone = new THREE.ConeGeometry(SHARD_WIDTH, GRID_CELL * REACH_SPAN, 4, 1);
  cone.rotateZ(-Math.PI / 2);
  cone.translate((GRID_CELL * REACH_SPAN) / 2, 0, 0);
  cone.scale(1, SHARD_H / SHARD_WIDTH, 1);
  cone.computeVertexNormals();
  return cone;
})();

/** Hash in [0,1) off a world position, so the same cell breaks up the same way on a reload. */
function frontHash(x: number, z: number, salt: number): number {
  const v = Math.sin(x * 21.317 + z * 47.853 + salt * 13.271) * 39119.717;
  return v - Math.floor(v);
}

/**
 * The mark one cell of the front wears, as a group standing on `(x, z)` at `topY`.
 *
 * `approach.wall` decides where the plates go and `approach.approach` decides which way the
 * shards point; with neither, the group comes back empty rather than guessing, because a front
 * with no direction is not a front and drawing an arbitrary one would be worse than drawing
 * nothing.
 */
export function buildFrostFrontGroup(
  x: number,
  z: number,
  topY: number,
  approach: FrostFrontApproach,
): THREE.Group {
  const group = new THREE.Group();
  group.name = FROST_FRONT_NAME;
  group.position.set(x, topY, z);

  const half = GRID_CELL / 2;

  // 1. THE WALL. A run of plates along each real edge, jammed: overlapping in plan, alternating
  //    two value steps, each tilted a different amount off the horizontal so the run breaks up
  //    into individual plates instead of reading as one extruded bar.
  for (const side of approach.wall) {
    const [nx, nz] = SIDE_NORMAL[side];
    const alongX = nz === 0 ? 0 : 1;
    for (let i = 0; i < PLATES_PER_EDGE; i += 1) {
      // Overlapping by design: the span is wider than the cell divided by the count.
      const span = GRID_CELL / PLATES_PER_EDGE;
      const along = -half + span * (i + 0.5);
      const jitter = frontHash(x + along * alongX, z + along * (1 - alongX), i + 1);
      const plate = new THREE.Mesh(PLATE_GEO, frontTone(i % 2 === 0 ? 1 : 0.78));
      const tall = 0.82 + 0.36 * jitter;
      plate.scale.set(span * 1.28, tall, 1);
      plate.position.set(
        nx * (half - WALL_INSET) + along * alongX,
        // Standing ON the rung with a quarter of itself bedded into it, rather than centred on
        // it — see `WALL_BED`, and the photograph that found the difference.
        WALL_H * tall * (0.5 - WALL_BED),
        nz * (half - WALL_INSET) + along * (1 - alongX),
      );
      // Turned to lie along the edge, then heeled over toward the ground the frost has not
      // taken yet — shove ice is pushed, so it leans the way it is travelling.
      plate.rotation.y = Math.atan2(nx, nz);
      plate.rotation.z = THREE.MathUtils.degToRad(8 + jitter * 13) * (i % 2 === 0 ? 1 : -1);
      plate.castShadow = true;
      plate.receiveShadow = true;
      plate.name = FROST_FRONT_WALL_NAME;
      group.add(plate);
    }
  }

  // 2. THE REACH. Shards from the approach side inward. The heading is the SUM of the approach
  //    normals reversed, so a corner cell on the rim reaches diagonally inward rather than
  //    picking one of its two sides arbitrarily.
  let inX = 0;
  let inZ = 0;
  for (const side of approach.approach) {
    const [nx, nz] = SIDE_NORMAL[side];
    inX -= nx;
    inZ -= nz;
  }
  const length = Math.hypot(inX, inZ);
  if (length === 0) {
    return group;
  }
  // The unit heading, and the axis across it so the shards spread over the cell rather than
  // stacking in one line. Kept as VECTORS: `rotation.y` sends a local +X axis to
  // `(cos y, -sin y)`, so the one place an angle is needed derives it from the vector rather
  // than the other way round — the first draft went through `atan2(dx, dz)` and pointed every
  // shard ninety degrees off its own front.
  const dirX = inX / length;
  const dirZ = inZ / length;
  const acrossX = -dirZ;
  const acrossZ = dirX;
  const heading = Math.atan2(-dirZ, dirX);
  for (let i = 0; i < SHARDS_PER_APPROACH; i += 1) {
    const offset = (i - (SHARDS_PER_APPROACH - 1) / 2) * (GRID_CELL / SHARDS_PER_APPROACH);
    const jitter = frontHash(x + offset, z - offset, i + 7);
    const shard = new THREE.Mesh(SHARD_GEO, frontTone(i === 1 ? 0.86 : 0.66));
    const tall = 0.7 + 0.6 * jitter;
    shard.scale.set(0.62 + 0.5 * jitter, tall, 0.8 + 0.4 * jitter);
    // Based at the cell's own approach edge, so the shards start where the wall stands and
    // reach away from it — and sitting ON the ground rather than half in it, which is what the
    // near arc needs: there the rime points away from the camera and every unit of height it has
    // is a unit the wall in front of it is not hiding.
    shard.position.set(
      -dirX * (half - WALL_INSET) + acrossX * offset,
      SHARD_H * tall,
      -dirZ * (half - WALL_INSET) + acrossZ * offset,
    );
    shard.rotation.y = heading + (jitter - 0.5) * 0.5;
    shard.castShadow = false;
    // Stated rather than defaulted, and `false` for a reason: the wall is the mark that has to
    // read as standing, so it carries the shadow budget. Three shards a cell over a
    // twenty-eight cell ring would be eighty-four more casters in a single shadowed key for a
    // contact shadow a few pixels long.
    shard.receiveShadow = true;
    shard.name = FROST_FRONT_REACH_NAME;
    group.add(shard);
  }

  return group;
}
