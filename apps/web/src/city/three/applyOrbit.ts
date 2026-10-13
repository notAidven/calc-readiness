import {
  type CameraAction,
  overscrolledPosition,
  settledPosition,
  VILLAGE_CAMERA,
} from "./orbitCamera";

/**
 * Imperative application of the pure `CameraAction`s to a live drei
 * `MapControls`/`OrbitControls` instance. Typed structurally (no `three`/drei
 * import) so the DOM-side camera controls in `CitySurface` can drive the 3D
 * village camera without pulling the renderer into the jsdom test graph.
 *
 * The camera is FIXED-TILT (Clash-of-Clans "village") but free to ORBIT: these
 * actions PAN on the ground plane, ZOOM (dolly), ROTATE the azimuth (spin around
 * the island without changing the ~49° tilt), or RECENTER home.
 */
export interface OrbitControlsLike {
  readonly object: { position: { x: number; y: number; z: number } };
  readonly target: { x: number; y: number; z: number };
  readonly minDistance: number;
  readonly maxDistance: number;
  /** Current heading around +Y (radians) — drei OrbitControls/MapControls API. */
  getAzimuthalAngle(): number;
  /** Set the heading around +Y (radians); the fixed tilt is untouched. */
  setAzimuthalAngle(value: number): void;
  update(): void;
  reset(): void;
  saveState?(): void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function distance(controls: OrbitControlsLike): number {
  const p = controls.object.position;
  const t = controls.target;
  return Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z) || 1;
}

/** Current camera→target distance (the dolly amount the zoom limits apply to). */
export function controlsDistance(controls: OrbitControlsLike): number {
  return distance(controls);
}

/** Re-seat the camera at `next` world units from the target, along the same ray. */
function setDistance(controls: OrbitControlsLike, next: number): void {
  const p = controls.object.position;
  const t = controls.target;
  const dx = p.x - t.x;
  const dy = p.y - t.y;
  const dz = p.z - t.z;
  const dist = Math.hypot(dx, dy, dz) || 1;
  const k = next / dist;
  p.x = t.x + dx * k;
  p.y = t.y + dy * k;
  p.z = t.z + dz * k;
}

/**
 * Discrete zoom step. Clamps to `limits` when given — the TRUE dolly limits, not the
 * widened elastic ones the controls carry, because a button press that springs back
 * would read as the control being broken rather than as elasticity. The rubber band
 * is for continuous gestures (wheel / pinch / drag), which is where a wall is felt.
 */
function dolly(
  controls: OrbitControlsLike,
  factor: number,
  limits?: { min: number; max: number },
): void {
  const dist = distance(controls);
  const min = limits?.min ?? controls.minDistance;
  const max = limits?.max ?? controls.maxDistance;
  setDistance(controls, clamp(dist * factor, min, max));
  controls.update();
}

/**
 * Resist a dolly the controls have just applied, against the TRUE distance limits.
 * `fromDistance` is the distance before the controls moved, so the outward part of
 * this frame's change is what gets damped. Mirrors {@link resistControlsPan}.
 */
export function resistControlsZoom(
  controls: OrbitControlsLike,
  fromDistance: number,
  limits: { min: number; max: number },
  maxOverscroll: number,
): void {
  const dist = distance(controls);
  const next = overscrolledPosition(
    fromDistance,
    dist,
    limits.min,
    limits.max,
    maxOverscroll,
  );
  if (next !== dist) {
    setDistance(controls, next);
  }
}

/** Move the pan target to (cx, cz), carrying the camera so framing is unchanged. */
function moveTargetTo(controls: OrbitControlsLike, cx: number, cz: number): void {
  const t = controls.target;
  const p = controls.object.position;
  const dx = cx - t.x;
  const dz = cz - t.z;
  if (dx !== 0 || dz !== 0) {
    t.x = cx;
    t.z = cz;
    p.x += dx;
    p.z += dz;
  }
}

/**
 * Hold the pan target inside a square play area (±`bound` on x/z), shifting the
 * camera by the same correction so the framing stays fixed — CoC's "you can't lose
 * the base". Safe to call every frame / after every pan.
 *
 * With `maxOverscroll > 0` the edge is ELASTIC rather than a wall: the target may
 * stretch past `bound` under rising resistance, up to `maxOverscroll` further out,
 * and {@link settleControlsToBounds} eases it back when the pointer is released.
 * Passing `0` (which is what reduced motion passes) restores the hard clamp exactly.
 *
 * `current` is read from the live target, so the resistance is a function of where
 * the camera is rather than of accumulated pointer travel — no drag state to keep.
 */
export function clampControlsToBounds(
  controls: OrbitControlsLike,
  bound: number,
  maxOverscroll = 0,
): void {
  // A hard clamp onto the OUTER edge of the elastic envelope, not the resistance
  // curve: this is the "however we got here, get inside the envelope" guard, and it
  // has no per-frame delta to resist. `resistControlsPan` is what shapes a gesture.
  const limit = bound + Math.max(0, maxOverscroll);
  const t = controls.target;
  moveTargetTo(controls, clamp(t.x, -limit, limit), clamp(t.z, -limit, limit));
}

/**
 * Resist a pan the controls have just applied. `from` is where the target sat before
 * the controls moved it, so the delta between that and the live target is the raw
 * pointer movement this frame — the part of it that lies outside `bound` is what
 * gets damped.
 */
export function resistControlsPan(
  controls: OrbitControlsLike,
  from: { x: number; z: number },
  bound: number,
  maxOverscroll: number,
): void {
  const t = controls.target;
  moveTargetTo(
    controls,
    overscrolledPosition(from.x, t.x, -bound, bound, maxOverscroll),
    overscrolledPosition(from.z, t.z, -bound, bound, maxOverscroll),
  );
}

/**
 * One frame of the elastic return, for both pan and dolly. Returns `true` while
 * anything is still settling so the caller can stop driving frames once it is done.
 * A no-op when everything is already inside its bounds, which is always the case
 * under reduced motion.
 */
export function settleControlsToBounds(
  controls: OrbitControlsLike,
  bound: number,
  dtSeconds: number,
  distanceLimits?: { min: number; max: number },
): boolean {
  const t = controls.target;
  const sx = settledPosition(t.x, -bound, bound, dtSeconds);
  const sz = settledPosition(t.z, -bound, bound, dtSeconds);
  const panSettling = sx !== t.x || sz !== t.z;
  moveTargetTo(controls, sx, sz);

  let zoomSettling = false;
  if (distanceLimits) {
    const dist = distance(controls);
    const settled = settledPosition(
      dist,
      distanceLimits.min,
      distanceLimits.max,
      dtSeconds,
    );
    if (settled !== dist) {
      zoomSettling = true;
      setDistance(controls, settled);
    }
  }
  return panSettling || zoomSettling;
}

/** Move both camera + target along the ground plane, relative to the fixed heading. */
function pan(controls: OrbitControlsLike, forwardSign: number, rightSign: number): void {
  const p = controls.object.position;
  const t = controls.target;
  // Ground-projected forward (camera → target) and its rightward perpendicular.
  let fx = t.x - p.x;
  let fz = t.z - p.z;
  const len = Math.hypot(fx, fz) || 1;
  fx /= len;
  fz /= len;
  const rx = fz;
  const rz = -fx;
  const step = distance(controls) * VILLAGE_CAMERA.panStepRatio;
  const mx = (fx * forwardSign + rx * rightSign) * step;
  const mz = (fz * forwardSign + rz * rightSign) * step;
  p.x += mx;
  p.z += mz;
  t.x += mx;
  t.z += mz;
  controls.update();
}

/**
 * Apply a discrete camera intent to the fixed-angle village controls. `panBound`
 * (when given) keeps the target inside the island play area after a pan, and
 * `distanceLimits` pins a zoom step to the true dolly range rather than the widened
 * elastic one the controls carry.
 */
export function applyCameraAction(
  controls: OrbitControlsLike,
  action: CameraAction,
  panBound?: number,
  distanceLimits?: { min: number; max: number },
): void {
  switch (action) {
    case "panUp":
      pan(controls, 1, 0);
      break;
    case "panDown":
      pan(controls, -1, 0);
      break;
    case "panLeft":
      pan(controls, 0, -1);
      break;
    case "panRight":
      pan(controls, 0, 1);
      break;
    case "zoomIn":
      dolly(controls, VILLAGE_CAMERA.zoomStep, distanceLimits);
      break;
    case "zoomOut":
      dolly(controls, 1 / VILLAGE_CAMERA.zoomStep, distanceLimits);
      break;
    case "rotateLeft":
      controls.setAzimuthalAngle(controls.getAzimuthalAngle() - VILLAGE_CAMERA.rotateStep);
      controls.update();
      break;
    case "rotateRight":
      controls.setAzimuthalAngle(controls.getAzimuthalAngle() + VILLAGE_CAMERA.rotateStep);
      controls.update();
      break;
    case "recenter":
      controls.reset();
      break;
  }
  if (
    panBound !== undefined &&
    (action === "panUp" ||
      action === "panDown" ||
      action === "panLeft" ||
      action === "panRight")
  ) {
    clampControlsToBounds(controls, panBound);
  }
}
