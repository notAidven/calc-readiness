import type { EraId } from "@cr/skill-graph";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

import { CITIZEN_SKIN, citizenDress } from "../citizenDress";
import { CURRENT_ERA_ID } from "../eraDressing";
import { vehicleForEra } from "../eraVehicles";
import { mix } from "../palette";
import type { RoadCell } from "../roads";
import { planVehicles, type VehiclePlan, vehiclePose } from "../vehicleRoutes";
import {
  buildPersonBodyGeometry,
  buildPersonHeadGeometry,
  buildPersonOrnamentGeometry,
  PERSON_SOLE_RADIUS,
  SHOULDER_Y,
} from "./personFigure";
import { roadStackTop } from "./Roads";
import { ERA_ONE_PROP_TONES } from "./StarterIsland";

/**
 * WHAT MOVES ON THE ROADS THE PLAYER PAID FOR.
 *
 * Design: `docs/superpowers/specs/2026-08-01-era-vehicles-and-city-life.md` — §2.1 for era
 * one's form, §4.2 for how big, §4.3 for how fast, §4.4 for the six rules. Route and count
 * are `../vehicleRoutes.ts`; which form an era wears is `../eraVehicles.ts`. **This file
 * owns geometry and pigment and decides nothing.**
 *
 * ## THE PROBLEM THIS ANSWERS
 *
 * A road tile costs the era's material out of the same stockpile a civic building comes from
 * (`roadsEconomy.ts:11-19`), and until now the player paid that for a texture change. A
 * thing moving along a road you paid for is the difference between a road that LOOKS used
 * and a road that IS used, which is the clearest available answer to *"what did that stone
 * do"*.
 *
 * ## GEOMETRY, NOT ART, AND THE GULL IS THE PRECEDENT
 *
 * `crises/README.md:123-131` measures that there is no image texture anywhere in the
 * renderer, so *"an asset table full of PNGs is unbuildable"*. The five gulls
 * (`StarterIsland.tsx`) are wings, tails, banking and flapping in 240 lines of icosahedra
 * and cones, and no image was ever generated for any of it. This file is built the same way,
 * down to the rig-plus-pose shape: `buildVehicleRig` allocates once, `poseVehicle(rig, t)`
 * is a pure function of one number, and reduced motion holds the pose taken before the first
 * frame.
 *
 * ## THREE PROPERTIES THAT ARE STRUCTURAL RATHER THAN CAREFUL
 *
 * - **No shadow.** There is one shadow map from one direction and the citizens design
 *   already rules the crowd casts none; a moving shadow on something 16px wide would be the
 *   most expensive and least legible thing in the frame (§4.2).
 * - **Not a click target, no accessible name.** The canvas is `aria-hidden` and nothing here
 *   is interactive, so a vehicle carries no state a learner needs and gates nothing
 *   (`INV-COS-1`, R6).
 * - **Every geometry and material is module-level and shared.** The road layer rebuilds its
 *   whole group on every paint stroke and this rebuilds with it, so a per-rig allocation
 *   would churn a few hundred buffers across a drag. Rebuilding costs `Group`s and `Mesh`es
 *   and nothing else.
 */

/** Local forward is `+Z`, the convention the gull rig already uses. */
const TONES = ERA_ONE_PROP_TONES;

function mat(color: number, rough = 0.94): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: 0,
    flatShading: true,
  });
}

/**
 * **WHICH OF ERA ONE'S FOUR PROP TONES GOES ON WHICH PART, AND THIS WAS DECIDED BY LOOKING
 * AT A FRAME RATHER THAN BY TASTE.**
 *
 * The design's answer to the art-overhead objection is that `ERA_ONE_PROP_TONES` already
 * holds the whole sled: `timber`, `hide`, `hideDark`, `cord`. It does not say which part
 * takes which, and the obvious assignment — the hide bundle in `hide` — photographs badly,
 * because **the road is earth and so is the sled.** Measured in three's working space, the
 * road's tread reads 0.207 and `hide` reads 0.254: a value step of 0.05, which at the 5.64
 * px/u §4.1 measures for a 580px-tall viewport at full zoom-out is no step at all.
 *
 * So the tones are assigned for a TWO-SIDED value contrast against the tread, which is
 * exactly the trick `roadSurfacing.ts` already used to keep era one's road legible against
 * era one's grass:
 *
 * - the **masses go darker than the road** — `hideDark` (0.158) on the load, `cord` (0.109)
 *   on the hauler, against the tread's 0.207;
 * - the **frame goes lighter** — `timber` (0.246) on the poles and battens, so the wedge's
 *   outline reads against its own load rather than dissolving into it.
 *
 * One dominant mass plus one thing that breaks the outline, which is the Art Bible rule
 * §4.2 applies to a vehicle. No tone is invented and none comes from outside the era.
 */
const SLED_MATERIALS = {
  timber: mat(TONES.timber),
  load: mat(TONES.hideDark, 0.97),
  cord: mat(TONES.cord, 0.99),
} as const;

/* -------------------------------------------------------------------------- */
/* The hauler is a CITIZEN (`./personFigure.ts`)                              */
/* -------------------------------------------------------------------------- */

/**
 * **THE FIGURE AT THE FRONT OF THE SLED IS THE SAME PERSON THE CROWD IS MADE OF.**
 *
 * The team lead, off a running build: *"the person pulling the cart in era 1 doesnt
 * actually look like the other people it looks corrupted: just use the same model as you do
 * for hte normal people as you do for pulling the cart."*
 *
 * ## What the third construction actually was, measured rather than described
 *
 * This layer built its own figure and it differed from a citizen on four axes at once,
 * every one of them visible at the game's camera:
 *
 *  - **It floated.** The hauler hung off the sled group, which is tilted nose-up by
 *    `SLED.noseLift` and seated at `SLED.seatY`, and the hauler sits at the NOSE. Measured
 *    off the built rig: its feet were **0.374u above the road**, which is 29% of a person's
 *    standing height. A citizen's feet are on the ground by construction, and every posture
 *    in `Citizens.tsx` rotates about the sole for exactly that reason.
 *  - **It was a box.** A `BoxGeometry` torso on two cylinders, where a citizen is a tapered
 *    leg mass under a garment that flares to a hem wider than the shoulders.
 *  - **It had no arms.** Arms are one of the three cues `personFigure.ts` names as
 *    load-bearing at this size: without them a figure is a post.
 *  - **It was one flat tone.** Legs, torso and head all in `cord`, the darkest of era one's
 *    four prop tones, against a crowd whose cloth is the era's own and whose head is skin.
 *
 * So it was not a stylised person. It was a dark armless blob at a person's height,
 * hovering, and "corrupted" is a fair reading of it.
 *
 * ## It is dressed per era, and it costs one cached build
 *
 * `citizenDress(eraId)` is the same row the crowd is dressed from, so a hauler in an era
 * with an authored crowd wears that crowd's cloth and cut, and one in an unauthored era
 * wears the same honest fallback the crowd does. Only era one has an authored vehicle
 * today, so this is one row in practice; it is written per era anyway because the day era
 * two's cart is drawn, its driver being a citizen should not be a second decision.
 *
 * The build is CACHED per era, which keeps this file's *"every geometry and material is
 * module-level and shared"* promise: the road layer rebuilds its whole group on every paint
 * stroke, so a per-rig person would churn geometries and materials across a drag.
 */
interface HaulerParts {
  readonly body: THREE.BufferGeometry;
  readonly head: THREE.BufferGeometry;
  readonly ornament: THREE.BufferGeometry | null;
  readonly bodyMaterial: THREE.Material;
  readonly headMaterial: THREE.Material;
  readonly ornamentMaterial: THREE.Material | null;
}

const HAULER_BY_ERA = new Map<EraId, HaulerParts>();

/**
 * Where on each of the crowd's two seeded ramps this one figure sits.
 *
 * A crowd varies because a crowd of identical people reads as a clone army; ONE person has
 * nothing to vary against, and there is no citizen id here to seed from — a vehicle is
 * derived from roads and a citizen from mastery, and §6.2 forbids coupling the two budgets.
 * So the hauler takes the middle of both ramps: a person from the middle of this crowd
 * rather than an invented look or a re-rolled one.
 */
const HAULER_TONE = 0.5;

function haulerParts(eraId: EraId): HaulerParts {
  const cached = HAULER_BY_ERA.get(eraId);
  if (cached) {
    return cached;
  }
  const dress = citizenDress(eraId);
  const ornament = buildPersonOrnamentGeometry(dress);
  const parts: HaulerParts = {
    body: buildPersonBodyGeometry(dress.cut),
    head: buildPersonHeadGeometry(dress.crown),
    ornament,
    // The crowd's own roughness and metalness, so the hauler takes the light the way the
    // people on the pavement beside them do.
    bodyMaterial: new THREE.MeshStandardMaterial({
      color: mix(dress.cloth, dress.clothDeep, HAULER_TONE),
      roughness: 0.92,
      metalness: 0.02,
      flatShading: true,
    }),
    headMaterial: new THREE.MeshStandardMaterial({
      color: mix(CITIZEN_SKIN.warm, CITIZEN_SKIN.deep, HAULER_TONE),
      roughness: 0.9,
      metalness: 0.02,
      flatShading: true,
    }),
    ornamentMaterial:
      ornament && dress.ornament
        ? new THREE.MeshStandardMaterial({
            color: dress.ornament.color,
            roughness: 0.72,
            metalness: 0.02,
            flatShading: true,
          })
        : null,
  };
  HAULER_BY_ERA.set(eraId, parts);
  return parts;
}

/* -------------------------------------------------------------------------- */
/* Era one — the hide sled (§2.1)                                             */
/* -------------------------------------------------------------------------- */

/**
 * The sled's own numbers, in world units, laid out along `+Z` with the hauler at the front.
 *
 * These are what `Vehicles.test.ts` measures the BUILT rig against, so the form declared in
 * `eraVehicles.ts` and the thing on the screen cannot drift apart: the test reads the
 * bounding box of `buildVehicleRig`'s output and holds it under the form's `length`,
 * `bodyWidth` and `height`, and under the era's own road tread width.
 */
const SLED = {
  /** Half the pole spacing at the dragging tail, and at the converging nose. */
  tailHalfWidth: 0.62,
  noseHalfWidth: 0.2,
  /** The poles run from here to here in local Z. */
  tailZ: -1.34,
  noseZ: 0.42,
  poleRadius: 0.072,
  /** Three cross-battens, lashed across the poles. */
  battenZ: [-1.05, -0.5, 0.05],
  battenRadius: 0.052,
  /** The corded hide bundle, and how far along the poles it sits. */
  bundleZ: -0.52,
  bundle: { x: 0.48, y: 0.33, z: 0.64 },
  /**
   * The hauler at the point: one citizen, standing on the road.
   *
   * **A SIBLING OF THE SLED AND NOT A CHILD OF IT**, which is the fix for the float. The
   * sled tilts nose-up and is seated clear of the surface; a figure parented to it rode
   * both, and the nose is the end that rises. Attached to the rig root instead, the
   * hauler's own y = 0 is the road, which is where a person's feet go.
   */
  haulerZ: 1.12,
  /**
   * Radians the hauler leans into the pull, about the FEET. Somebody dragging a load leans
   * forward, and this is also why §4.3 puts a hauled load at 1.1 u/s rather than the 1.6
   * ceiling. It is the same channel and the same pivot as the crowd's crisis hunch
   * (`Citizens.tsx`'s 0.2), a hair steeper, so a leaning hauler is still a person standing
   * on the ground rather than a person tipped over.
   *
   * **The pair with {@link SLED.haulerZ} is bounded by the form's own length**, which is
   * why neither is free: a lean rotates the head forward, `Vehicles.test.ts` measures the
   * rig's bounding box against `form.length`, and three's `Box3.setFromObject` takes the
   * transformed corners of each part's LOCAL box rather than its hull, so the measured
   * length grows faster with the lean than the silhouette does. At this pair the built box
   * is 2.95u against the declared 3.0.
   */
  haulLean: 0.22,
  /** Radians the nose rides up by, so the silhouette is a tilted wedge. */
  noseLift: 0.12,
  /** Where local Y zero sits above the road surface the rig is mounted on. */
  seatY: 0.24,
} as const;

const POLE_GEO = new THREE.CylinderGeometry(SLED.poleRadius, SLED.poleRadius * 1.25, 1, 5);
const BATTEN_GEO = new THREE.CylinderGeometry(SLED.battenRadius, SLED.battenRadius, 1, 5);
const BUNDLE_GEO = new THREE.IcosahedronGeometry(0.5, 0);
const CORD_GEO = new THREE.TorusGeometry(0.3, 0.03, 4, 10);
const HAUL_CORD_GEO = new THREE.CylinderGeometry(0.022, 0.022, 1, 4);

function part(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  // §4.2: no vehicle casts a shadow, and nothing about it should receive one either — a
  // 16px object taking the shadow pass twice buys nothing and costs a moving artefact.
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

/**
 * ERA ONE'S SLED: two poles converging to a blunt point, three battens lashed across them,
 * a hide bundle corded down over the battens, one figure hauling at the point. Nose up, tail
 * dragging.
 *
 * **No wheel of any kind, and that is the one hard rule.** Era one's guide bans the wheeled
 * cart in as many words and reserves the wheel for era two, so a roller, a runner-disc or a
 * pivot here would be the anachronism the whole design document exists to have prevented.
 *
 * **THE LOAD AND THE PERSON ARE SIBLINGS, not parent and child.** The sled is tilted and
 * seated clear of the road so its tail is what drags; a person is on the road, because that
 * is where people are. Parenting the hauler to the sled put its feet 0.374u in the air
 * (measured), which is 29% of a person's standing height. See {@link haulerParts}.
 */
function buildHideSled(eraId: EraId): THREE.Group {
  const rig = new THREE.Group();
  const sled = new THREE.Group();
  rig.add(sled);

  const poleLength = SLED.noseZ - SLED.tailZ;
  const poleMidZ = (SLED.noseZ + SLED.tailZ) / 2;
  for (const side of [-1, 1]) {
    const pole = part(sled, POLE_GEO, SLED_MATERIALS.timber);
    pole.scale.set(1, poleLength, 1);
    // A cylinder's axis is Y, so lay it down the run and then yaw it inward, which is what
    // makes the pair CONVERGE rather than run parallel. `YXZ` is what makes the second
    // rotation reach the already-laid-down axis; under the default `XYZ` the yaw would
    // apply first and leave the axis exactly where it started.
    pole.rotation.order = "YXZ";
    pole.rotation.x = Math.PI / 2;
    pole.rotation.y =
      side * Math.atan2(SLED.tailHalfWidth - SLED.noseHalfWidth, poleLength);
    pole.position.set((side * (SLED.tailHalfWidth + SLED.noseHalfWidth)) / 2, 0, poleMidZ);
  }

  for (const z of SLED.battenZ) {
    const fraction = (z - SLED.tailZ) / poleLength;
    const halfWidth =
      SLED.tailHalfWidth + (SLED.noseHalfWidth - SLED.tailHalfWidth) * fraction;
    const batten = part(sled, BATTEN_GEO, SLED_MATERIALS.timber);
    batten.scale.set(1, halfWidth * 2, 1);
    batten.rotation.z = Math.PI / 2;
    batten.position.set(0, SLED.poleRadius, z);
  }

  // THE LUMP ON THE WEDGE: one soft mass, corded down flat, which is what separates this
  // from the drying rack on the same island (that stands up and drapes its hides OVER a
  // ridge pole; this lies down and lashes its load ON).
  const bundle = part(sled, BUNDLE_GEO, SLED_MATERIALS.load);
  bundle.scale.set(SLED.bundle.x * 2, SLED.bundle.y * 2, SLED.bundle.z * 2);
  bundle.position.set(0, SLED.poleRadius + SLED.bundle.y * 0.82, SLED.bundleZ);
  bundle.rotation.y = 0.4;
  // Two lashings over the load, across the sled's width — a torus lies in XY by default,
  // which is already the hoop a cord makes over a bundle.
  for (const offset of [-0.26, 0.26]) {
    const cord = part(sled, CORD_GEO, SLED_MATERIALS.cord);
    cord.scale.set(SLED.bundle.x * 3.0, SLED.bundle.y * 3.2, 1);
    cord.position.set(0, SLED.poleRadius + SLED.bundle.y * 0.45, SLED.bundleZ + offset);
  }

  // Tilt the load so the nose rides up and the tail drags, then seat it so the tail is the
  // part in contact with the road.
  sled.rotation.x = -SLED.noseLift;
  sled.position.y = SLED.seatY;

  // THE PERSON. Same body, same head, same ornament as the crowd on the pavement, dressed
  // from the same era row, standing on the road rather than on the sled.
  const parts = haulerParts(eraId);
  const hauler = new THREE.Group();
  // Leaning forward into the pull, about the sole. A lean sinks the leading edge of the
  // foot by `sole * sin(lean)`, so the lift is derived from the figure's own sole radius
  // and the figure ends up standing ON the road at any lean angle rather than at this one.
  hauler.rotation.x = SLED.haulLean;
  hauler.position.set(0, PERSON_SOLE_RADIUS * Math.sin(SLED.haulLean), SLED.haulerZ);
  rig.add(hauler);
  part(hauler, parts.body, parts.bodyMaterial).name = HAULER_BODY_NAME;
  part(hauler, parts.head, parts.headMaterial).name = HAULER_HEAD_NAME;
  if (parts.ornament && parts.ornamentMaterial) {
    part(hauler, parts.ornament, parts.ornamentMaterial).name = HAULER_ORNAMENT_NAME;
  }

  // The haul cord, from the hauler's shoulder back to where the poles converge. It is the
  // one line that says the two masses are one object, and it is measured between the two
  // ANCHORS rather than laid out from a pair of tuned numbers: the shoulder rides the lean
  // and the nose rides the tilt, so anything written down here would be wrong the moment
  // either angle moved.
  const shoulder = new THREE.Vector3(0, SHOULDER_Y, 0)
    .applyEuler(new THREE.Euler(SLED.haulLean, 0, 0))
    .add(hauler.position);
  const nose = new THREE.Vector3(0, SLED.poleRadius, SLED.noseZ)
    .applyEuler(new THREE.Euler(-SLED.noseLift, 0, 0))
    .add(new THREE.Vector3(0, SLED.seatY, 0));
  const span = shoulder.z - nose.z;
  const rise = shoulder.y - nose.y;
  const haulCord = part(rig, HAUL_CORD_GEO, SLED_MATERIALS.cord);
  haulCord.scale.set(1, Math.hypot(span, rise), 1);
  haulCord.position.set(0, (shoulder.y + nose.y) / 2, (shoulder.z + nose.z) / 2);
  haulCord.rotation.x = Math.PI / 2 - Math.atan2(rise, span);

  return rig;
}

/* -------------------------------------------------------------------------- */
/* The rig, and posing it                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The name every vehicle root carries, so a test can find the traffic in a mounted scene
 * rather than re-deriving where it thinks the traffic ought to be. Same idiom
 * `ROAD_HIGHLIGHT_NAME` uses.
 */
export const VEHICLE_OBJECT_NAME = "city-vehicle";

/**
 * The two meshes the hauler is, named the way `CITIZEN_BODY_NAME` names the crowd's, so a
 * guard can pull this figure out of a built rig and hold it against the crowd's own
 * geometry rather than guessing which mesh is the person.
 */
export const HAULER_BODY_NAME = "vehicle-hauler-body";
export const HAULER_HEAD_NAME = "vehicle-hauler-head";
export const HAULER_ORNAMENT_NAME = "vehicle-hauler-ornament";

export interface VehicleRig {
  readonly plan: VehiclePlan;
  /** The node the pose moves: position in world XZ, yaw for the heading. */
  readonly root: THREE.Group;
}

/**
 * Build one vehicle's rig, seated on the road surface at `surfaceY` and posed at `t = 0`
 * before the first frame — which is exactly what makes the reduced-motion path a POSED
 * STILL FRAME rather than a hole in the picture (R5, and the house rule
 * `crises/README.md:213-216` states for every animation in the renderer).
 *
 * Exported for `Vehicles.test.ts`, which measures the built rig's bounding box against the
 * form's declared size and against the era's road width. A dimension in a table is a claim
 * about a number; the bounding box is the object.
 *
 * `eraId` is what the HAULER is dressed from, and it defaults the same way every other
 * per-era entry point in this lane does (`Vehicles`, `Citizens`, `buildCitizenRig`), so an
 * existing caller keeps era one's person rather than the unauthored fallback.
 */
export function buildVehicleRig(
  plan: VehiclePlan,
  surfaceY: number,
  eraId: EraId = CURRENT_ERA_ID,
): VehicleRig {
  const root = new THREE.Group();
  root.name = VEHICLE_OBJECT_NAME;
  root.rotation.order = "YXZ";
  switch (plan.form.kind) {
    // Exhaustive over `VehicleKind`, so an era's form added to `ERA_VEHICLES` is a compile
    // error here until it is actually drawn — D-ERA28's rule, the one `RoadCourse` uses.
    case "hide-sled":
      root.add(buildHideSled(eraId));
      break;
  }
  root.position.y = surfaceY;
  const rig: VehicleRig = { plan, root };
  poseVehicle(rig, 0);
  return rig;
}

/**
 * Put a rig where its plan says it is at time `t`. One call to `vehiclePose` and two
 * assignments: no velocity variable, no easing, no state machine, which is R1 checkable by
 * reading the function.
 */
export function poseVehicle(rig: VehicleRig, seconds: number): void {
  const pose = vehiclePose(rig.plan, seconds);
  rig.root.position.x = pose.x;
  rig.root.position.z = pose.z;
  rig.root.rotation.y = pose.headingY;
}

export interface VehiclesProps {
  /** The COMMITTED road tiles. A preview tile is not a road yet, so nothing rides it. */
  readonly roads: readonly RoadCell[];
  /** The era the city is wearing. Nine of the ten have no authored vehicle and get none. */
  readonly eraId?: EraId;
  /** `prefers-reduced-motion`: hold the posed still frame, never remove the vehicle. */
  readonly reducedMotion: boolean;
  /**
   * The board is a CRISIS board, so the traffic stands down. **The design does not rule on
   * this, so the reason is here rather than assumed.**
   *
   * Two of them. `WinterGround` lays its snow course ABOVE the road stack, so a vehicle
   * riding the road's top face during the winter is under the snow rather than on the road,
   * and *"a cart that appears where there is no road is a failure however cheap"* covers a
   * cart under a snowdrift too. And the tone: ambient life carrying on through the beat that
   * is taking the city apart reads as the game not noticing.
   *
   * **This is a removal and not a reduced-motion still frame**, which is the one place the
   * two differ: R5's still frame is what a learner with the preference set sees INSTEAD of
   * movement, whereas a buried road has no traffic on it at all.
   */
  readonly winter?: boolean;
}

/**
 * The traffic layer: at most one vehicle per connected run of road, moving at a walking
 * pace, in the era's own form, and nothing at all in an era whose form is unauthored, on an
 * island with no road on it, or on a crisis board.
 */
export function Vehicles({
  roads,
  eraId = CURRENT_ERA_ID,
  reducedMotion,
  winter = false,
}: VehiclesProps) {
  const form = useMemo(() => (winter ? null : vehicleForEra(eraId)), [eraId, winter]);
  const plans = useMemo(() => planVehicles(roads, form), [roads, form]);
  const surfaceY = roadStackTop(eraId);
  const rigs = useMemo(
    () => plans.map((plan) => buildVehicleRig(plan, surfaceY, eraId)),
    [plans, surfaceY, eraId],
  );
  useFrame((state) => {
    if (reducedMotion) {
      return;
    }
    const t = state.clock.elapsedTime;
    for (const rig of rigs) {
      poseVehicle(rig, t);
    }
  });
  return (
    <group>
      {rigs.map((rig) => (
        <primitive key={rig.plan.id} object={rig.root} />
      ))}
    </group>
  );
}
