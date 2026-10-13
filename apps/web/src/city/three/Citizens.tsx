import {
  type CitizenRoster,
  MAX_RENDERED_CITIZENS,
  WALK_SPEED_UNITS_PER_SEC,
} from "@cr/game";
import type { EraId } from "@cr/skill-graph";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { CITIZEN_SKIN, type CitizenDress, citizenDress } from "../citizenDress";
import { CURRENT_ERA_ID } from "../eraDressing";
import { mix } from "../palette";
import {
  footprintCells,
  footprintFor,
  GRID_CELL,
  type GroundPoint,
  type PlacedTransform,
  SURFACE_Y,
} from "../worldLayout";
import { type CitizenPlace, citizenPlaces } from "./citizenPlaces";
import { routeBetween } from "./citizenRoutes";
import type { ShelterGround } from "./citizenShelter";
import {
  buildPersonBodyGeometry,
  buildPersonHeadGeometry,
  buildPersonOrnamentGeometry,
  PERSON_HEIGHT,
} from "./personFigure";

/**
 * The city's population, drawn (D-CIT9).
 *
 * WHAT THIS LAYER DECIDES, AND WHAT IT MUST NOT. It decides geometry, colour and
 * motion. It does NOT decide who exists, who lives where, or who goes where by day —
 * `cityCitizenRoster` in `../citizens.ts` already did, and its header says why reading
 * it rather than re-deriving it is structural: there is no second counter for the HUD
 * and the crowd to drift apart on. Two specific temptations are named there and both
 * are refused here:
 *
 *   - **Never draw a capacity.** `roster.residence_capacity` is the housing INPUT to
 *     livability and `cityVitality().livability.sustains` folds food in on top; both sit
 *     above and below the real headcount at different points in the game. The number of
 *     bodies is `roster.population`, and the split worth drawing is housed against
 *     waiting.
 *   - **Never mint a seed.** Every look, every jitter and every gait phase traces back
 *     to `CITY_CITIZEN_SEED` through the roster or through `citizenPlaces`. An unseeded
 *     crowd would re-roll on every mount, which makes a screenshot unreproducible and a
 *     bug report unrepeatable.
 *
 * THE CAP IS THIS LAYER'S JOB. `MAX_RENDERED_CITIZENS` caps RENDERING only: the roster,
 * the counts and the DOM readout stay exact. Above the cap the crowd stops getting
 * denser while the text keeps counting, which is the correct degradation — and the
 * sample is the LOWEST-INDEXED citizens, a stable prefix, so an arrival never pushes
 * somebody already on screen off it. "People vanished" is the failure mode a cap
 * invites, and a prefix is what rules it out.
 *
 * TWO DRAWS, NO SHADOWS. One `InstancedMesh` for bodies and one for heads over shared
 * geometry and one material each, so a throng costs roughly what a handful does. Neither
 * enters the shadow pass — the gulls set that precedent, and on the named Chromebook
 * floor the shadow pass is one of the three levers that actually bite. There is also
 * deliberately **no contact decal** under a citizen: a flat patch on the ground would
 * re-enter the uniform 0.05u depth ladder that #152 fixed, and forty-four of them
 * moving every frame is precisely the shape of that bug.
 *
 * NOBODY LEAVES, AND NOTHING HERE DRAWS ONE LEAVING. This paragraph deferred to `O-7`
 * (*"what pulls departed citizens back, and how the return reads"*) on the grounds that a
 * leaving animation would quietly decide it; #500 then withdrew it and put the leavers on the
 * shoreline. On 2026-08-05 departures were removed as a mechanic entirely, so it stands again
 * and `O-7` is answered by there being no departure to return from.
 *
 * **AND NOTHING IS REMOVED FOR A CRISIS EITHER (2026-08-02).** `shelter` changes where people
 * stand and how they stand and nothing else: the same `count` is instanced, the same stable
 * prefix, the same two draws. A crowd that thinned out when the winter arrived would be
 * "people vanished" with a weather excuse, and it is the failure mode this file already names
 * twice over. See {@link CitizensProps.shelter} for why the traffic layer's stand-down is the
 * right answer for a cart and the wrong one for a person.
 */

/* -------------------------------------------------------------------------- */
/* The era's people (../citizenDress.ts)                                      */
/* -------------------------------------------------------------------------- */

/**
 * WHAT THE CROWD WEARS IS PER-ERA AND LIVES IN `../citizenDress.ts`, not here.
 *
 * This file was era one's crowd and nothing else: a `CITIZEN` constant of era-one hex, an
 * era-one hide tunic, and no era concept at all — so a Bronze Age city was populated by
 * people in prehistoric hide, which is the *"the advance did nothing"* defect at its most
 * vivid, because the people are the only thing on the island that moves.
 *
 * `citizenDress.ts` owns the table, the fallback for an era nobody has dressed, and — most
 * of all — the D-ERA28 argument for why the crowd re-dresses at an advance when a standing
 * building does not. **Read that header before adding a row here.** This layer decides only
 * how a row is turned into geometry and instance colour.
 *
 * NO `#FFB703` ANYWHERE, in any era. Gold is reserved for mastery and a body is never gold;
 * all three authored guides restate it, and `Citizens.test.ts` sweeps every era for it.
 */

/* -------------------------------------------------------------------------- */
/* Proportions — NONE OF THEM LIVE HERE (see `personFigure.ts`)                */
/* -------------------------------------------------------------------------- */

/**
 * **HOW BIG A CITIZEN IS AND WHAT SHAPE THEY ARE IS `personFigure.ts`'s, NOT THIS LAYER'S.**
 *
 * Every proportion this file used to declare — the standing height, the head, the hem, the
 * three per-era cuts — moved there on 2026-08-02, and it is a repair rather than a tidy-up.
 * A retired gathering layer declared its own set, sized against a pixel count instead of
 * against a building, and the two crowds ended up **2.31x apart as declared heights** — see
 * `personFigure.ts` for why that figure and not the 2.18x this docblock used to quote, which was
 * one figure's drawn crown over the other's nominal. A citizen inflated when
 * they walked in to gather. Two constants that happen to agree drift the first time somebody
 * tunes one of them; one shared constant cannot.
 *
 * The derivation this file used to carry — *"half the Dwellings' rendered height ... a number
 * with a reason survives the next art change and a number that looked right in a screenshot
 * does not"* — moved with the number, and is now the ruling for BOTH crowds rather than for
 * one of them.
 *
 * What is left here is what this layer actually decides: where people walk, how they move, and
 * what a crisis does to their posture.
 */

/** Seconds a citizen stands at each end of their beat before turning round. */
const DWELL_SECONDS = 2.5;

/**
 * How far a walker rocks side to side, in radians, and how fast. A body that slides
 * along its route at a fixed attitude reads as a chess piece being pushed; a small roll
 * at a stride's cadence reads as walking. It is a ROTATION rather than a bob so a
 * citizen's feet never leave the ground — the near-plane argument above depends on
 * that, and a bob would have quietly spent it.
 */
const WALK_ROLL_RADIANS = 0.07;
const WALK_ROLL_HZ = 2.4;

/* -------------------------------------------------------------------------- */
/* Sheltering: what FRIGHTENED looks like at twelve screen pixels             */
/* -------------------------------------------------------------------------- */

/**
 * **THE THREE CHANNELS A CRISIS POSTURE CAN ACTUALLY USE, AND THE ONE IT CANNOT.**
 *
 * A citizen is about a dozen screen pixels tall at default framing and a few at full zoom-out
 * (see `LEG_HEIGHT`'s block), which decides this entirely. What survives at that size, in the
 * order it survives:
 *
 *   1. **WHERE THEY ARE.** By far the strongest channel, and it is `citizenPlaces.ts`'s to
 *      spend: a crowd in tight knots against walls with the open ground empty reads as
 *      sheltering before any single figure is legible at all.
 *   2. **HOW TALL THEY ARE.** {@link SHELTER_CROUCH_SCALE} takes 14% off the standing height,
 *      which at this size is a pixel or two of silhouette — and it lands on the one part of
 *      the figure the eye is reading, because the head is 41.5% of standing height and a
 *      shorter figure is a MORE head-heavy one.
 *   3. **WHAT ANGLE THEY ARE AT.** {@link SHELTER_HUNCH_RADIANS} tips the whole body forward
 *      about the feet, so the head comes out past the hem instead of sitting over it. A
 *      vertical figure and a leaning one are tellable apart at a few pixels because the
 *      silhouette's TOP moves, which is exactly where the head is.
 *
 * **HEADING IS THE ONE THAT CANNOT BE USED, and it is worth saying so because it is the
 * obvious idea.** Era one's `tunic` cut is a stack of cylinders and an icosahedron — surfaces
 * of revolution — with two arms that are mirror images, so turning a citizen about Y changes
 * essentially nothing on screen. Only era three's `mantle` is asymmetric. So "everyone turns
 * to face the frost" would be a true statement about the transforms and an invisible one in
 * the frame, and it is not attempted: the knot's POSITION says which side of the building the
 * weather is on, which is the same information delivered through channel 1.
 */
const SHELTER_CROUCH_SCALE = 0.86;
const SHELTER_HUNCH_RADIANS = 0.2;

/**
 * How long a sheltering citizen holds still at each end of their shift, in seconds.
 *
 * Long, against `DWELL_SECONDS`' 2.5, and the ratio is the read rather than either number: a
 * huddle's beat is under a unit long (`SHELTER_SHIFT`), so at the tuned walk speed the travel
 * is about half a second. Held for 2.5 that is a figure fidgeting; held for this it is a figure
 * standing still that occasionally shifts its weight, which is what someone waiting out
 * weather does. Everybody still moves — nobody is a statue — but the settlement stops looking
 * like a place where people are getting on with things.
 */
const SHELTER_DWELL_SECONDS = 4.6;

/**
 * The shiver: how far it rocks and how fast.
 *
 * It is the SAME axis as the walk roll and deliberately so — one rotation channel, two
 * cadences — but it is nearly twice the frequency at about two thirds the amplitude, which is
 * the difference between a stride and a tremor. And unlike the walk roll it runs while a
 * citizen is STANDING STILL, which is the whole point: the walk roll is suppressed at rest
 * because "a whole crowd swaying in place would read as a fidget", and a whole crowd shivering
 * in place on a freezing board reads as cold. That inversion is the one behaviour difference
 * between the two.
 */
const SHIVER_RADIANS = 0.045;
const SHIVER_HZ = 4.6;

/* -------------------------------------------------------------------------- */
/* The rig                                                                     */
/* -------------------------------------------------------------------------- */

/** One person's walk: the polyline they pace, and where they are in their cycle. */
interface CitizenWalk {
  /** The route, from the resting end outward. Element 0 is where they come to rest. */
  readonly path: readonly GroundPoint[];
  /** Cumulative distance to each point, so a sample is one scan and no `sqrt`. */
  readonly milestones: readonly number[];
  readonly length: number;
  /** From the engine's seeded `look.gait_phase`, so nobody walks in lockstep. */
  readonly phase: number;
  readonly heightScale: number;
  /**
   * This person is SHELTERING (`CitizenPlace.state`), so they hold a crouch, shiver where
   * they stand, and dwell far longer at each end of a beat that never leaves its cell.
   *
   * Carried on the walk rather than looked up per frame because `poseCitizens` is the hot
   * loop, and read from the PLACE rather than re-derived here for the reason the whole layer
   * is built on: there is no second opinion about whether a winter is on for the posture and
   * the position to disagree over.
   */
  readonly sheltering: boolean;
}

export interface CitizenRig {
  readonly root: THREE.Group;
  readonly bodies: THREE.InstancedMesh;
  readonly heads: THREE.InstancedMesh;
  /**
   * The era's one note on a person, or `null` in an era that puts nothing on one — era one
   * has neither metal nor weaving, and an unauthored era has chosen no material to make a
   * bead out of. A third instanced draw, uniform-coloured, and absent rather than empty so
   * a crowd with no ornament costs exactly what it did before this axis existed.
   */
  readonly ornaments: THREE.InstancedMesh | null;
  /** The citizen ids actually instanced — a stable prefix of the roster at the cap. */
  readonly drawn: readonly string[];
  /** Standing height at `height_scale = 1`, in world units. */
  readonly height: number;
  /** The era's dressing, as the rig was built from it. */
  readonly dress: CitizenDress;
  readonly walks: readonly CitizenWalk[];
}

export const CITIZEN_BODY_NAME = "citizen-bodies";
export const CITIZEN_HEAD_NAME = "citizen-heads";
export const CITIZEN_ORNAMENT_NAME = "citizen-ornaments";

/** Scratch objects, reused so the per-frame pose allocates nothing. */
const SCRATCH_MATRIX = new THREE.Matrix4();
const SCRATCH_POSITION = new THREE.Vector3();
const SCRATCH_QUATERNION = new THREE.Quaternion();
const SCRATCH_SCALE = new THREE.Vector3();
const SCRATCH_EULER = new THREE.Euler();

/** The cell a ground point falls in. */
function cellOf(point: GroundPoint): { col: number; row: number } {
  return {
    col: Math.floor(point.x / GRID_CELL),
    row: Math.floor(point.z / GRID_CELL),
  };
}

/**
 * Turn one place into a walk. The route is routed round buildings and along roads where
 * they exist, and its two ends are the place's own jittered points rather than the cell
 * centres the router works in — so a citizen arrives at their doorstep, not near it.
 */
function walkFor(
  place: CitizenPlace,
  phase: number,
  heightScale: number,
  roadCells: ReadonlySet<string>,
  blockedCells: ReadonlySet<string>,
): CitizenWalk {
  const cells = routeBetween({
    from: cellOf(place.point),
    to: cellOf(place.walkTo),
    roadCells,
    blockedCells,
  });
  const sheltering = place.state === "sheltering";
  // Interior cells become their centres; the ends are the real places. A one-cell
  // route (both places in the same cell) still gives a two-point path, so a citizen
  // always has somewhere to pace.
  const path: GroundPoint[] = [place.point];
  for (const cell of cells.slice(1, -1)) {
    path.push({ x: (cell.col + 0.5) * GRID_CELL, z: (cell.row + 0.5) * GRID_CELL });
  }
  path.push(place.walkTo);

  const milestones: number[] = [0];
  let length = 0;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1] as GroundPoint;
    const b = path[i] as GroundPoint;
    length += Math.hypot(b.x - a.x, b.z - a.z);
    milestones.push(length);
  }
  return { path, milestones, length, phase, heightScale, sheltering };
}

/** Where along the path distance `d` lands, plus the heading there. */
function sampleWalk(
  walk: CitizenWalk,
  distance: number,
): { point: GroundPoint; heading: number } {
  const clamped = Math.max(0, Math.min(walk.length, distance));
  let segment = 1;
  while (
    segment < walk.milestones.length - 1 &&
    (walk.milestones[segment] ?? 0) < clamped
  ) {
    segment += 1;
  }
  const a = walk.path[segment - 1] as GroundPoint;
  const b = walk.path[segment] as GroundPoint;
  const from = walk.milestones[segment - 1] ?? 0;
  const to = walk.milestones[segment] ?? from;
  const span = to - from;
  const t = span > 0 ? (clamped - from) / span : 0;
  return {
    point: { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t },
    heading: Math.atan2(b.x - a.x, b.z - a.z),
  };
}

/**
 * How far along their beat a citizen is at `elapsed`, as a distance from the resting
 * end. A pure function of elapsed time — never an accumulated step — so the walk covers
 * the same ground per second on a fast machine and a slow one, and returning the clock
 * to zero returns the crowd home.
 */
function distanceAt(walk: CitizenWalk, elapsed: number): number {
  if (walk.length <= 0) {
    return 0;
  }
  const dwell = walk.sheltering ? SHELTER_DWELL_SECONDS : DWELL_SECONDS;
  const travel = walk.length / WALK_SPEED_UNITS_PER_SEC;
  const cycle = 2 * (travel + dwell);
  // The phase is an offset into the cycle, not a speed change: everyone walks at the
  // tuned speed, they are just at different points in their own day.
  const t = (((elapsed + walk.phase * cycle) % cycle) + cycle) % cycle;
  if (t < dwell) {
    return 0;
  }
  if (t < dwell + travel) {
    return ((t - dwell) / travel) * walk.length;
  }
  if (t < 2 * dwell + travel) {
    return walk.length;
  }
  const back = (t - (2 * dwell + travel)) / travel;
  return walk.length * (1 - back);
}

/**
 * Write one citizen's transform into both matrix buffers.
 *
 * `pitch` is the crisis hunch and it is a rotation about the citizen's own left-right axis, so
 * — like the walk roll, and for the same reason — the FEET STAY ON THE GROUND. The instance
 * origin is the sole of the foot (`personFigure.ts` translates y=0 there), so tipping the
 * body forward about it leans the head out over the hem without lifting anything, and the
 * near-plane claim `#152` bought is untouched because a leaning figure is a SHORTER one.
 */
function seat(
  rig: CitizenRig,
  index: number,
  point: GroundPoint,
  heading: number,
  heightScale: number,
  roll = 0,
  pitch = 0,
): void {
  SCRATCH_POSITION.set(point.x, SURFACE_Y, point.z);
  // `YXZ` puts the roll INNERMOST, so a walker rocks about their own spine rather than
  // about a world axis — the difference between a stride and a figure being tipped over.
  // The pitch is the X term, which the same ordering puts in the HEADING-rotated frame: a
  // citizen hunches forward over their own toes rather than toward a world axis.
  SCRATCH_EULER.set(pitch, heading, roll, "YXZ");
  SCRATCH_QUATERNION.setFromEuler(SCRATCH_EULER);
  SCRATCH_SCALE.set(heightScale, heightScale, heightScale);
  SCRATCH_MATRIX.compose(SCRATCH_POSITION, SCRATCH_QUATERNION, SCRATCH_SCALE);
  rig.bodies.setMatrixAt(index, SCRATCH_MATRIX);
  rig.heads.setMatrixAt(index, SCRATCH_MATRIX);
  // The ornament rides the same transform, so a bead cannot drift off the throat it is
  // pinned to no matter how the walker turns or rocks.
  rig.ornaments?.setMatrixAt(index, SCRATCH_MATRIX);
}

export function buildCitizenRig(params: {
  readonly roster: CitizenRoster;
  readonly places: readonly CitizenPlace[];
  /** Everything standing on the ground, INCLUDING the hub, so nobody walks through it. */
  readonly placements: readonly PlacedTransform[];
  readonly roadCells?: ReadonlySet<string>;
  /**
   * The era the city is WEARING. Defaults to the first era, following `CityScene`'s own
   * default, so an existing caller keeps era one's crowd rather than the fallback.
   */
  readonly eraId?: EraId;
  /**
   * The winter board's ground, from `shelterGround(winterRows)`. Frozen cells are handed to
   * the ROUTER here, as blocked ground.
   *
   * **IT IS A SECOND LOCK ON A DOOR `citizenPlaces` HAS ALREADY BOLTED, and that is
   * deliberate.** A sheltering beat's two ends are in one unfrozen cell, so today there is no
   * route for the frost to be in the middle of. This is what stops that from being the only
   * thing standing between a citizen and a walk across ice: the day somebody gives a
   * sheltering citizen a two-cell beat, or hands these places to a caller that did not pass
   * `shelter` to the allocator, the router refuses the frozen interior rather than the
   * behaviour silently coming back.
   *
   * A frozen cell is blocked and NOT merely expensive, which is the opposite treatment from a
   * road (D-CIT7 — roads amplify, never gate). The two are not in tension: a road is a
   * cosmetic spend that must never decide whether the city functions, and frost is the crisis
   * itself.
   */
  readonly shelter?: ShelterGround | null;
}): CitizenRig {
  const { roster, places, placements, roadCells, eraId = CURRENT_ERA_ID } = params;
  const dress = citizenDress(eraId);

  // The cap is a DRAW cap and this is the only place it is applied. Note what is being
  // capped: `places.length`, not the roster, which stays exact for the DOM readout.
  const count = Math.min(roster.population, places.length, MAX_RENDERED_CITIZENS);

  const blockedCells = new Set<string>();
  for (const placed of placements) {
    for (const key of footprintCells(placed, footprintFor(placed.nodeId))) {
      blockedCells.add(key);
    }
  }
  for (const key of params.shelter?.frozen ?? []) {
    blockedCells.add(key);
  }
  // Roads are walkable and only ever CHEAPER to walk on, so they are passed to the
  // router as a preference and never added to `blockedCells` (D-CIT7).
  const roads = roadCells ?? new Set<string>();

  // Geometry is translated so y=0 is the ground under the citizen's feet, which lets a
  // single instance matrix place a body, its head and its ornament from the same transform.
  const bodyGeometry = buildPersonBodyGeometry(dress.cut);
  const headGeometry = buildPersonHeadGeometry(dress.crown);
  const ornamentGeometry = buildPersonOrnamentGeometry(dress);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.02,
    flatShading: true,
  });
  const headMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.02,
    flatShading: true,
  });

  const bodies = new THREE.InstancedMesh(bodyGeometry, bodyMaterial, Math.max(count, 1));
  const heads = new THREE.InstancedMesh(headGeometry, headMaterial, Math.max(count, 1));
  bodies.name = CITIZEN_BODY_NAME;
  heads.name = CITIZEN_HEAD_NAME;
  bodies.count = count;
  heads.count = count;

  // The ornament takes its colour on the MATERIAL, not per instance: era three's bronze is
  // the era's and not the person's, so there is no instance-colour buffer to fill and the
  // third draw is the cheapest of the three. `metalness` stays where the other two hold it
  // — the scene has no runtime lights, so a metal workflow would darken it, not brighten
  // it, and the era's own guide asks for a dulled bronze rather than a polished one.
  let ornaments: THREE.InstancedMesh | null = null;
  if (ornamentGeometry && dress.ornament) {
    const ornamentMaterial = new THREE.MeshStandardMaterial({
      color: dress.ornament.color,
      roughness: 0.72,
      metalness: 0.02,
      flatShading: true,
    });
    ornaments = new THREE.InstancedMesh(
      ornamentGeometry,
      ornamentMaterial,
      Math.max(count, 1),
    );
    ornaments.name = CITIZEN_ORNAMENT_NAME;
    ornaments.count = count;
  }

  for (const mesh of [bodies, heads, ...(ornaments ? [ornaments] : [])]) {
    // Small, numerous, and moving every frame: exactly what must not enter the shadow
    // pass. The gulls already skip it for the same reason.
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    // The transforms change every frame, so three must not cache a bounding volume.
    mesh.frustumCulled = false;
  }

  const root = new THREE.Group();
  root.add(bodies, heads);
  if (ornaments) {
    root.add(ornaments);
  }

  const drawn: string[] = [];
  const walks: CitizenWalk[] = [];
  const colour = new THREE.Color();
  for (let index = 0; index < count; index += 1) {
    const citizen = roster.citizens[index];
    const place = places[index];
    if (!citizen || !place) {
      continue;
    }
    drawn.push(citizen.id);
    walks.push(
      walkFor(
        place,
        citizen.look.gait_phase,
        citizen.look.height_scale,
        roads,
        blockedCells,
      ),
    );
    // The engine hands over tones in 0..1 and never a colour, so the mapping onto the
    // era's own materials happens here, against the row `citizenDress.ts` resolved. The
    // cloth is per-era; the skin is not, and all three guides say why.
    colour.setHex(mix(dress.cloth, dress.clothDeep, citizen.look.shirt_tone));
    bodies.setColorAt(index, colour);
    colour.setHex(mix(CITIZEN_SKIN.warm, CITIZEN_SKIN.deep, citizen.look.body_tone));
    heads.setColorAt(index, colour);
  }

  const rig: CitizenRig = {
    root,
    bodies,
    heads,
    ornaments,
    drawn,
    height: PERSON_HEIGHT,
    dress,
    walks,
  };

  // Seat everybody at their resting place BEFORE the first frame. An instance matrix
  // buffer starts as zeros, so deferring this to the first `useFrame` draws the whole
  // crowd stacked at the world origin for one frame — the classic instancing flash.
  //
  // THIS IS ALSO THE WHOLE REDUCED-MOTION FRAME, which is why the crouch is applied here and
  // not only in `poseCitizens`: under `prefers-reduced-motion` the per-frame pose never runs,
  // so anything that lives only in there is a posture a learner with the preference set never
  // sees. A sheltering crowd has to still read as sheltering when nothing is moving.
  for (let index = 0; index < count; index += 1) {
    const walk = walks[index];
    if (!walk) {
      continue;
    }
    const { point, heading } = sampleWalk(walk, 0);
    seat(
      rig,
      index,
      point,
      heading,
      walk.sheltering ? walk.heightScale * SHELTER_CROUCH_SCALE : walk.heightScale,
      0,
      walk.sheltering ? SHELTER_HUNCH_RADIANS : 0,
    );
  }
  bodies.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  if (ornaments) {
    ornaments.instanceMatrix.needsUpdate = true;
  }
  if (bodies.instanceColor) {
    bodies.instanceColor.needsUpdate = true;
  }
  if (heads.instanceColor) {
    heads.instanceColor.needsUpdate = true;
  }

  return rig;
}

/**
 * Walk the crowd to where it should be at `elapsed` seconds.
 *
 * Under reduced motion this returns immediately, exactly as `Birds` does, which leaves
 * every citizen POSED at the resting end of their beat rather than frozen mid-stride
 * somewhere in the middle of the island. That is rung 2 of the degradation ladder and
 * it costs nothing: the whole per-frame matrix write stops, and the city still shows
 * who is where.
 */
export function poseCitizens(rig: CitizenRig, elapsed: number, reduced: boolean): void {
  if (reduced) {
    return;
  }
  for (let index = 0; index < rig.bodies.count; index += 1) {
    const walk = rig.walks[index];
    if (!walk) {
      continue;
    }
    const distance = distanceAt(walk, elapsed);
    const { point, heading } = sampleWalk(walk, distance);
    // Rock only while actually travelling: somebody standing at their doorstep should
    // stand still, and a whole crowd swaying in place would read as a fidget.
    //
    // A SHELTERING CITIZEN IS THE EXCEPTION AND SHIVERS WHETHER THEY ARE MOVING OR NOT, which
    // is the one place the two cadences differ in more than their numbers. See `SHIVER_HZ`: a
    // crowd swaying in place on an ordinary day reads as a fidget, and the same crowd
    // trembling in place on a freezing board reads as cold.
    const moving = distance > 0 && distance < walk.length;
    const roll = walk.sheltering
      ? Math.sin((elapsed + walk.phase * 10) * SHIVER_HZ * Math.PI * 2) * SHIVER_RADIANS
      : moving
        ? Math.sin((elapsed + walk.phase * 10) * WALK_ROLL_HZ * Math.PI * 2) *
          WALK_ROLL_RADIANS
        : 0;
    seat(
      rig,
      index,
      point,
      heading,
      walk.sheltering ? walk.heightScale * SHELTER_CROUCH_SCALE : walk.heightScale,
      roll,
      walk.sheltering ? SHELTER_HUNCH_RADIANS : 0,
    );
  }
  rig.bodies.instanceMatrix.needsUpdate = true;
  rig.heads.instanceMatrix.needsUpdate = true;
  if (rig.ornaments) {
    rig.ornaments.instanceMatrix.needsUpdate = true;
  }
}

export interface CitizensProps {
  /**
   * The population, from `cityCitizenRoster`. `null` before the view model resolves.
   * The scene READS this and never derives it (D-CIT8).
   */
  readonly roster: CitizenRoster | null;
  /** Placed skill buildings, so people stand at doors and walk round walls. */
  readonly placements: readonly PlacedTransform[];
  /** The hub, which is where everybody with nowhere to live gathers. */
  readonly hub: PlacedTransform | null;
  /** Committed road cells: cheaper to walk on, never required (D-CIT7). */
  readonly roadCells?: ReadonlySet<string>;
  /** The seed the places are jittered from — an input, never minted here. */
  readonly seed: number;
  /**
   * The era the city is WEARING, which is what the crowd is dressed from — see
   * `../citizenDress.ts` for why a citizen re-dresses at an advance where a standing
   * building does not. The LIVE era is the right key here and it is the only one available:
   * a citizen is derived on every load and has no raised era to be frozen at (D-CIT1).
   */
  readonly eraId?: EraId;
  /**
   * **THE CRISIS, REACHING THE PEOPLE WHO LIVE HERE.** The winter board's ground from
   * `shelterGround(winterRows)`, or `null`/absent on an ordinary day.
   *
   * Present, every citizen shelters: they retreat to a wall that still has unfrozen ground
   * against it, huddle there, crouch, and stop crossing the settlement. `null` and the city
   * behaves exactly as it did before this prop existed.
   *
   * **IT IS NOT A STAND-DOWN, which is the one place this differs from the traffic layer.**
   * `Vehicles`' `winter` prop removes the vehicles, and its own note gives the reason — a cart
   * is *"the visible consequence of a spend"* and a buried road has no traffic on it. A person
   * is not a spend. Nobody may be removed from the island because the weather turned, so the
   * population drawn is unchanged and only where they stand and how they stand moves.
   */
  readonly shelter?: ShelterGround | null;
  /**
   * **WHAT THE CRISIS HAS WRECKED, because a ruin shelters nobody (2026-08-03).**
   *
   * The city's own `ruinedNodeIds`, handed straight to `citizenPlaces` so the crowd reads one
   * answer to *"what is left standing"* rather than deriving a second. Absent or empty is an
   * island with everything up, which is every ordinary day.
   *
   * It is what makes the final frame vary with how well the winter was played: shelter is
   * bounded by the buildings that survived, so the people who do not fit are out on the ring
   * and the number of them is the score. See `citizenShelter.ts` for the ruling.
   */
  readonly ruinedNodeIds?: ReadonlySet<string>;
  readonly reducedMotion: boolean;
}

export function Citizens({
  roster,
  placements,
  hub,
  roadCells,
  seed,
  eraId = CURRENT_ERA_ID,
  shelter = null,
  ruinedNodeIds,
  reducedMotion,
}: CitizensProps) {
  const standing = useMemo(
    () => (hub ? [...placements, hub] : [...placements]),
    [placements, hub],
  );
  const roadKeys = useMemo(() => roadCells ?? new Set<string>(), [roadCells]);

  const rig = useMemo(() => {
    if (!roster) {
      return null;
    }
    const places = citizenPlaces({
      roster,
      placements,
      hub,
      seed,
      shelter,
      ruinedNodeIds,
    });
    return buildCitizenRig({
      roster,
      places,
      placements: standing,
      roadCells: roadKeys,
      eraId,
      shelter,
    });
  }, [roster, placements, hub, seed, standing, roadKeys, eraId, shelter, ruinedNodeIds]);

  // A new roster (somebody arrived, a building finished) or a new ERA builds a new rig, so
  // the old one's geometry and materials are released rather than left on the GPU. Six
  // objects per rebuild is small, but a rebuild happens on every placement, every mastery
  // and every advance.
  useEffect(() => {
    if (!rig) {
      return;
    }
    return () => {
      for (const mesh of [
        rig.bodies,
        rig.heads,
        ...(rig.ornaments ? [rig.ornaments] : []),
      ]) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
    };
  }, [rig]);

  useFrame((state) => {
    if (!rig || reducedMotion) {
      return;
    }
    poseCitizens(rig, state.clock.elapsedTime, false);
  });

  if (!rig) {
    return null;
  }
  return <primitive object={rig.root} />;
}
