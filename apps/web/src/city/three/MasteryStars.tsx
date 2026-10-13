import { useFrame } from "@react-three/fiber";
import { type RefObject, useMemo, useRef } from "react";
import * as THREE from "three";

import type { MasteryStars as MasteryStarsData } from "../masteryVisuals";
import { SURFACE_Y } from "../worldLayout";

/**
 * The floating mastery STARS above a built building (option A) — 0–3 filled of 3,
 * Clash-of-Clans style. They're PERSISTENT (always shown above a topped-out
 * building, not just on click) and camera-tracking: the cluster is a CAMERA-FACING
 * billboard — the star plane turns to face the camera so every star reads as a crisp,
 * UPRIGHT, POINT-UP star in a dead-LEVEL row — and rides at the building's LIVE
 * roofline, measured from the rendered model each frame (the same `Box3` idea the
 * anchored callout uses), so it hugs the real top as the camera pans / orbits / zooms.
 * A MANUAL camera-facing billboard (see `orientStarsFacingCamera`) copies the camera's
 * world orientation onto the cluster, so at the fixed ~49° village tilt the stars never
 * foreshorten or slant the way a world-vertical plane does when viewed from above —
 * they stay clean and point-up at every azimuth. They're still real 3D medallions
 * turned toward you, not a flat 2D HUD overlay.
 *
 * Filled stars are warm gold; at FULL mastery (3/3) the whole set turns brighter
 * gold + celebratory (a gentle pulse, motion-gated). Empty slots stay a muted
 * outline so the "X of 3" always reads. Whether stars show at all (and how many
 * are filled) is decided by `masteryStarsFor` — this component only draws them.
 * Decorative: the keyboard-navigable roster stays the accessible source of truth.
 */

/**
 * The 10 alternating outer/inner vertices of a five-pointed star, as plain points
 * in the shape's XY plane (where **+Y is up**), roughly unit-diameter at
 * `outer = 0.5`.
 *
 * The first OUTER vertex must sit at +90° so the star reads the canonical way up:
 * ONE point at the TOP and TWO legs along the BOTTOM. Starting at −90° (as this
 * did) puts an outer point at the BOTTOM instead, which renders the star UPSIDE
 * DOWN — two points up, one down. Exported so that orientation is unit-testable
 * without a renderer.
 */
export function starVertices(
  outer: number,
  inner: number,
  points = 5,
): { x: number; y: number }[] {
  const step = Math.PI / points;
  return Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const angle = Math.PI / 2 + i * step;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });
}

/** A five-pointed star polygon: one point up, two legs down (see `starVertices`). */
function makeStarShape(outer: number, inner: number, points = 5): THREE.Shape {
  const shape = new THREE.Shape();
  starVertices(outer, inner, points).forEach((vertex, i) => {
    if (i === 0) {
      shape.moveTo(vertex.x, vertex.y);
    } else {
      shape.lineTo(vertex.x, vertex.y);
    }
  });
  shape.closePath();
  return shape;
}

/** Warm gold filled star; a brighter celebratory gold at full mastery; muted slot. */
const STAR_COLORS = {
  filled: { color: 0xffc23d, emissive: 0xffb703, intensity: 0.75 },
  celebratory: { color: 0xffe08a, emissive: 0xffcf4d, intensity: 1.35 },
  empty: { color: 0x6f6552, emissive: 0x000000, intensity: 0 },
  outline: 0x241a10,
} as const;

/**
 * Named so the crisis SWAP is provable in a rendered scene.
 *
 * Where a crisis has something to say about a building, `PlacedBuilding` gives this slot to
 * `CrisisStatusMarker` instead, because one thing above a roofline reads and two never do, and "the
 * stars stepped aside" is a claim about what is in the scene graph, which needs something
 * findable to be absent. The swap is on the PRESENCE of a status, so a winter it has nothing to
 * say about leaves these standing: see `CrisisStatusMarker`'s header on the 2026-08-01 ruling.
 */
export const MASTERY_STARS_NAME = "mastery-stars";

/** World-unit size of one star + spacing, and the gap above the measured roofline. */
const STAR_SIZE = 1.5;
const STAR_SPACING = STAR_SIZE * 1.18;
const STAR_MARGIN = 2.6;
export const MASTERY_STAR_BAND_WIDTH = STAR_SPACING * 2 + STAR_SIZE * 1.18;
export const MASTERY_STAR_BAND_HEIGHT = STAR_SIZE * 1.18;
/** Half-amplitude (world units) of the idle bob, which is off under reduced motion. */
const STAR_BOB_AMPLITUDE = 0.16;
/** Roof height (world units) used until the model mesh is measurable. */
const FALLBACK_TOP_Y = 6;

/**
 * How far above the measured roofline the star cluster's TOP EDGE can reach: the
 * cluster's own margin, plus the bob it rides on, plus half the height of the largest
 * star drawn (the dark backing star, `STAR_SIZE * 1.18`).
 *
 * Exported because the stars are not the only thing that floats above a building —
 * `SkillLabels` sits above them, and it needs the star band's real extent rather than a
 * height guessed from a screenshot. Anything retuning the sizes above therefore moves
 * the label with it instead of silently overlapping.
 */
export const STAR_BAND_TOP_ABOVE_ROOF =
  STAR_MARGIN + STAR_BOB_AMPLITUDE + (STAR_SIZE * 1.18) / 2;

/** Decorative meshes never take pointer hits (clicks fall through to the building). */
const noRaycast = (): null => null;

// Reused scratch for the per-frame camera-facing billboard (no per-frame allocs).
const _desiredQuat = new THREE.Quaternion();
const _parentQuat = new THREE.Quaternion();

/**
 * Orient a billboard `group` to FACE THE CAMERA fully: its WORLD orientation is
 * copied straight from the camera, so the star plane sits parallel to the screen with
 * its up aligned to the camera's up. At the fixed ~49° village tilt that renders every
 * star as a crisp, UPRIGHT, POINT-UP star in a dead-LEVEL row, at any orbit azimuth —
 * instead of the foreshortened / slanted look a world-vertical plane gives when viewed
 * down the tilt (the reported bug: a truly-upright star is unavoidably seen at an angle
 * from above, so off-center rows tip and stars look squat). The stars stay real 3D
 * medallions turned toward you (Clash-of-Clans style), not a flat 2D HUD overlay.
 *
 * The camera's world orientation is applied as this group's LOCAL quaternion via
 * `parentWorldQuat.invert() * cameraWorldQuat`, so the cluster faces the camera even
 * when the parent building is rotated in 90° steps (any ancestor rotation is undone).
 * Pure three math — unit-testable on a bare scene graph, no renderer required.
 */
export function orientStarsFacingCamera(group: THREE.Object3D, camera: THREE.Camera): void {
  camera.getWorldQuaternion(_desiredQuat);
  if (group.parent) {
    group.parent.getWorldQuaternion(_parentQuat);
    group.quaternion.copy(_parentQuat.invert().multiply(_desiredQuat));
  } else {
    group.quaternion.copy(_desiredQuat);
  }
}

export function MasteryStars({
  measureRef,
  stars,
  reducedMotion,
}: {
  /** The rendered model group to measure the live roofline from. */
  measureRef: RefObject<THREE.Object3D | null>;
  stars: MasteryStarsData;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Group>(null);
  const boundsRef = useRef(new THREE.Box3());
  const parentPosRef = useRef(new THREE.Vector3());

  // One shared star geometry for this building's slots (centered on the origin).
  const geometry = useMemo(() => {
    const geo = new THREE.ShapeGeometry(makeStarShape(0.5, 0.23));
    geo.center();
    return geo;
  }, []);

  useFrame((state) => {
    const group = groupRef.current;
    const target = measureRef.current;
    if (!group) {
      return;
    }
    // Track the building's live roofline: measure the rendered model's world-space
    // top so the stars float just above whatever height it is (Box3, like the
    // callout). The parent sits at the surface, so subtract its world Y to get the
    // local offset. Falls back to a constant until the mesh is ready.
    let worldTop = FALLBACK_TOP_Y;
    if (target) {
      boundsRef.current.setFromObject(target);
      if (Number.isFinite(boundsRef.current.max.y)) {
        worldTop = boundsRef.current.max.y;
      }
    }
    const parentY = group.parent
      ? group.parent.getWorldPosition(parentPosRef.current).y
      : SURFACE_Y;
    const time = state.clock.elapsedTime;
    const bob = reducedMotion ? 0 : Math.sin(time * 1.6) * STAR_BOB_AMPLITUDE;
    group.position.y = worldTop - parentY + STAR_MARGIN + bob;

    // Camera-facing billboard: the star plane faces the camera so the row reads
    // point-up + dead level on screen at every azimuth and the fixed ~49° tilt.
    orientStarsFacingCamera(group, state.camera);

    // Celebratory (3/3) twinkle — a gentle scale pulse, motion-gated.
    if (pulseRef.current) {
      const pulse = !reducedMotion && stars.celebratory ? 1 + Math.sin(time * 3) * 0.05 : 1;
      pulseRef.current.scale.setScalar(pulse);
    }
  });

  const centerOffset = (stars.total - 1) / 2;
  const slots = Array.from({ length: stars.total }, (_, index) => ({
    id: `star-${index}`,
    filled: index < stars.filled,
    x: (index - centerOffset) * STAR_SPACING,
  }));

  return (
    // The outer group is oriented each frame by `orientStarsFacingCamera` (a
    // camera-facing billboard, so the row reads point-up + level on screen) and
    // positioned at the live roofline; the inner group carries the celebratory pulse.
    <group ref={groupRef} name={MASTERY_STARS_NAME}>
      <group ref={pulseRef}>
        {slots.map((slot) => {
          const face = slot.filled
            ? stars.celebratory
              ? STAR_COLORS.celebratory
              : STAR_COLORS.filled
            : STAR_COLORS.empty;
          return (
            <group key={slot.id} position={[slot.x, 0, 0]}>
              {/* Dark backing star for a crisp outline against the sky. */}
              <mesh
                geometry={geometry}
                scale={STAR_SIZE * 1.18}
                position={[0, 0, -0.05]}
                raycast={noRaycast}
              >
                <meshStandardMaterial
                  color={STAR_COLORS.outline}
                  roughness={0.7}
                  metalness={0}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <mesh geometry={geometry} scale={STAR_SIZE} raycast={noRaycast}>
                <meshStandardMaterial
                  color={face.color}
                  emissive={face.emissive}
                  emissiveIntensity={face.intensity}
                  transparent={!slot.filled}
                  opacity={slot.filled ? 1 : 0.72}
                  roughness={0.35}
                  metalness={0}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
