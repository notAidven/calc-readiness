import { useFrame } from "@react-three/fiber";
import { type RefObject, useMemo, useRef } from "react";
import * as THREE from "three";

import { SURFACE_Y } from "../worldLayout";
import { crisisBadgeLocalY, crisisMeasuredRooflineY } from "./crisis/buildingMark";
import { orientStarsFacingCamera } from "./MasteryStars";
import { WINTER_SCENE_TONES as W, WINTER_GROUND_TONES } from "./winterTones";

/**
 * **THE MARK A BUILDING WEARS WHILE A CRISIS IS ON IT, IN THE SLOT ITS MASTERY STARS USE.**
 *
 * The ruling: while a crisis is on, a building that is ABOUT TO BE HIT or already LOST says so
 * above its roofline, in the slot the mastery stars occupy the rest of the time. It replaces
 * them rather than joining them, because the slot holds one thing legibly and two things never,
 * and because the question a player has during a winter is not how well they know a skill,
 * it is which buildings they are about to lose. Mastery is not undone by a crisis and the stars
 * come straight back when it ends (`PlacedBuilding` swaps on the presence of a status, so the
 * thaw restores them for free).
 *
 * ## AN UNTHREATENED BUILDING GETS NOTHING, AND THAT IS A RULING RATHER THAN AN OMISSION
 *
 * This file shipped with a third state, `safe`, drawn as a stone hexagon on every standing
 * building at once. The lead ruled it off on 2026-08-01, in favour of
 * `2026-08-01-hard-winter-art-brief-addendum.md` §5.1, which says an unthreatened building gets
 * **nothing added**. Two things follow and both are load-bearing:
 *
 *  - **the presence of a badge now MEANS something**, namely that something has happened to
 *    this building or is about to. A mark on every building spends the one channel above a
 *    roofline saying *nothing is happening here*, which is the reading an empty slot already
 *    carries for free;
 *  - **an unthreatened standing building keeps its stars through the winter**, because
 *    `crisisDressing` hands `null` up for it, and `null` is the ordinary city's value. So the
 *    swap is now scoped to the buildings the crisis is actually about.
 *
 * `crisisLabels.test.ts` pins both directions: the statuses this file can draw, and that no
 * combination of board conditions produces a badge for a standing, unthreatened building. That
 * sweep used to live in `winterShield.test.ts`, which went with the storm roof on 2026-08-03; it
 * is a claim about this file and not about the geometry, so it moved rather than being deleted.
 *
 * ## THIS IS THE NEAR HALF OF A DELIBERATELY SPLIT PAIR
 *
 * A building can be shielded AND threatened at once — *"I reinforced that one and the frost is
 * about to reach it"* — and that overlap is the moment the reinforce mechanic justifies
 * itself. It is also the frame most likely to turn to mush, because two indicators competing
 * for one channel is exactly how it would.
 *
 * The shield used to be the building's own GEOMETRY — a storm roof over its roof — and the split
 * was geometry against billboard. The lead scrapped the roof on 2026-08-03 (*"scrap the shield
 * youre using completely"*), so the pair is now split by RANGE instead, one slot apart:
 *
 *  - **the caption above, in words**, which spells all four states including `shielded`
 *    (`SkillLabels`' `CRISIS_LABEL_TEXT`) and fades out past 1.35x the default dolly, because a
 *    legible word over a building a few pixels wide is a lie about what it is pointing at;
 *  - **this badge below, as a silhouette**, which does NOT fade. Pulled back over the whole
 *    island is exactly when *"which of these am I about to lose"* is the question, so the shape
 *    is the reading that survives the zoom the caption cannot.
 *
 * The marker still measures the group containing the model and anything the crisis added to it,
 * which is what `crisisBadgeSlot.test.ts` asserts off the real boxes rather than trusting this
 * paragraph.
 *
 * ## SHAPE FIRST, THE SAME RULE THE SHIELD IS UNDER
 *
 * Each state is a different SILHOUETTE, a double chevron driving down against a broken cross, so
 * neither is carried by hue, neither needs the player to hold a legend in their head, and both
 * survive the pale overcast sky they are seen against. Colour is corroboration only. Mastery
 * gold `#FFB703` appears on neither, which is what keeps a crisis badge from being mistaken for
 * the stars it replaced.
 *
 * ## NO MAGNITUDE, ON EITHER AXIS
 *
 * Not how much shield is left and not how much damage is on the building: two states, drawn two
 * ways. `frostStage.ts` already carries the damage ramp on the building's own surface, and
 * putting a second reading of it up here would be two badges arguing about one number.
 */

/**
 * The things a building can be MARKED as while a crisis is on the island.
 *
 * A runtime tuple with the type derived from it rather than a bare type, so a guard can sweep
 * the population instead of restating it: *"a badge exists for each of these and for nothing
 * else"* is the claim the 2026-08-01 ruling turns on, and a type alone cannot be swept.
 * Deliberately does NOT contain a safe or unthreatened member; see the header.
 */
export const CRISIS_STATUSES = ["threatened", "lost"] as const;

export type CrisisStatus = (typeof CRISIS_STATUSES)[number];

/**
 * Tones, all read from the winter's existing tables and none added.
 *
 * `threatened` is `WINTER_GROUND_TONES.frostFront` on purpose rather than by coincidence: the
 * island's legend already glosses that swatch as *"the ice front: where it reaches this
 * round"*, and a threatened building is exactly a building the ice front reaches this round.
 * Saying the same fact in the same tone is one vocabulary, not two.
 *
 * **AND IT IS THE REASON THE MARK IS NOT AMBER**, which is worth stating here because amber is
 * what a reader arrives expecting. The island already spends its one warm swatch on `warded`,
 * glossed *"a fire is holding this"*, so warm on this board already means PROTECTED: an amber
 * threat would land in the protection family and read as reassurance. The argument is in §5.1a
 * of `2026-08-01-hard-winter-art-brief-addendum.md`, which is where it belongs, since it is a
 * fact about the crisis's vocabulary rather than about this component.
 */
const MARKER_TONES = {
  threatened: { face: WINTER_GROUND_TONES.frostFront, edge: W.CHAR },
  lost: { face: W.CHAR, edge: W.SLUSH_DARK },
} as const satisfies Record<CrisisStatus, { face: number; edge: number }>;

/**
 * The face and the backing plate one badge is drawn in.
 *
 * Exported so a guard can sweep the tones the renderer actually spends instead of re-typing a
 * list beside it. The guard that used to cover this kept such a list, and after the `safe` hexagon
 * came off it was still checking the hexagon's two stones.
 */
export function crisisMarkerTones(status: CrisisStatus): {
  readonly face: number;
  readonly edge: number;
} {
  return MARKER_TONES[status];
}

/**
 * World-unit size of the badge.
 *
 * The GAP above the roofline and the unmeasured fallback are not here: they are the SLOT's, and
 * the slot is shared by every crisis that marks a building (`crisis/buildingMark.ts`). Era one
 * spends 2.4 and 6 exactly as it always did, and now says so through the seam, so a second crisis
 * cannot float its badge at a different height in the same slot.
 */
const MARKER_SIZE = 2.5;

/** Decorative meshes never take pointer hits (clicks fall through to the building). */
const noRaycast = (): null => null;

/**
 * One band of a chevron driving DOWNWARD, at `offset` up the badge.
 *
 * Down rather than up, and pointed rather than blunt: the frost arrives from outside and comes
 * IN, so the badge points the way the harm is travelling. Two of them stacked is the thing no
 * other badge on this island looks like.
 */
function chevronShape(offset: number): THREE.Shape {
  const w = 0.5;
  const thickness = 0.19;
  const drop = 0.22;
  const shape = new THREE.Shape();
  shape.moveTo(-w, offset + drop);
  shape.lineTo(0, offset - drop);
  shape.lineTo(w, offset + drop);
  shape.lineTo(w, offset + drop - thickness);
  shape.lineTo(0, offset - drop - thickness);
  shape.lineTo(-w, offset + drop - thickness);
  shape.closePath();
  return shape;
}

/** One arm of a broken cross. Two of them is the mark for a building that is gone. */
function brokenArmShape(rotation: number): THREE.Shape {
  const half = 0.52;
  const thickness = 0.15;
  const gap = 0.09;
  const shape = new THREE.Shape();
  const corners: [number, number][] = [
    [gap, -thickness],
    [half, -thickness],
    [half, thickness],
    [gap, thickness],
  ];
  corners.forEach(([x, y], i) => {
    const rx = x * Math.cos(rotation) - y * Math.sin(rotation);
    const ry = x * Math.sin(rotation) + y * Math.cos(rotation);
    if (i === 0) {
      shape.moveTo(rx, ry);
    } else {
      shape.lineTo(rx, ry);
    }
  });
  shape.closePath();
  return shape;
}

/** The badge's outline shapes for one status. */
function shapesFor(status: CrisisStatus): THREE.Shape[] {
  if (status === "threatened") {
    return [chevronShape(0.3), chevronShape(-0.08)];
  }
  return [
    brokenArmShape(Math.PI / 4),
    brokenArmShape((3 * Math.PI) / 4),
    brokenArmShape((5 * Math.PI) / 4),
    brokenArmShape((7 * Math.PI) / 4),
  ];
}

export const CRISIS_MARKER_NAME = "crisis-status-marker";

/**
 * Build the badge's geometry for one status, outside React so the shapes are unit-testable.
 *
 * Returned as a single merged-by-group pair — a dark backing plate a touch larger than the
 * face, then the face — which is `MasteryStars`' own construction and exists for the same
 * reason: a flat shape against a near-white overcast sky needs an outline or it dissolves into
 * it, and that is the one background every badge on this island is seen against.
 */
export function crisisMarkerGeometries(status: CrisisStatus): THREE.ShapeGeometry[] {
  return shapesFor(status).map((shape) => new THREE.ShapeGeometry(shape));
}

export function CrisisStatusMarker({
  measureRef,
  status,
  reducedMotion,
}: {
  /** The group to measure the live roofline from — the model AND its shield, if it has one. */
  measureRef: RefObject<THREE.Object3D | null>;
  status: CrisisStatus;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Group>(null);
  const boundsRef = useRef(new THREE.Box3());
  const parentPosRef = useRef(new THREE.Vector3());

  const geometries = useMemo(() => crisisMarkerGeometries(status), [status]);
  const tone = MARKER_TONES[status];

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) {
      return;
    }
    // The group measured is the model AND whatever the crisis added to it, so a shielded
    // building's badge rides above its storm roof rather than through it.
    const worldTop = crisisMeasuredRooflineY(measureRef.current, boundsRef.current);
    const parentY = group.parent
      ? group.parent.getWorldPosition(parentPosRef.current).y
      : SURFACE_Y;
    group.position.y = crisisBadgeLocalY(worldTop, parentY);

    orientStarsFacingCamera(group, state.camera);

    // A THIRD CHANNEL, and the one thing that makes "about to be hit" impossible to miss on a
    // board full of buildings: shape says which state, tone corroborates it, and MOTION says
    // it is urgent. Only the threatened badge moves, so movement anywhere on the island means
    // the same thing. Reduced motion holds it still and loses nothing but the urgency.
    if (pulseRef.current) {
      const beat =
        !reducedMotion && status === "threatened"
          ? 1 + Math.sin(state.clock.elapsedTime * 4.2) * 0.11
          : 1;
      pulseRef.current.scale.setScalar(beat);
    }
  });

  return (
    <group ref={groupRef} name={CRISIS_MARKER_NAME} userData={{ crisisStatus: status }}>
      <group ref={pulseRef}>
        {geometries.map((geometry) => (
          // Keyed by the geometry's own identity rather than by its index: the list is rebuilt
          // wholesale when `status` changes, so an index key would let React keep the previous
          // status's meshes and swap only the material under them.
          <group key={geometry.uuid}>
            <mesh
              geometry={geometry}
              scale={MARKER_SIZE * 1.24}
              position={[0, 0, -0.05]}
              raycast={noRaycast}
            >
              <meshStandardMaterial
                color={tone.edge}
                roughness={0.8}
                metalness={0}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh geometry={geometry} scale={MARKER_SIZE} raycast={noRaycast}>
              <meshStandardMaterial
                color={tone.face}
                roughness={0.55}
                metalness={0}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
