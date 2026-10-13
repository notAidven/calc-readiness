/**
 * Pure, framework-free model for the city's fixed-angle "village" camera (no
 * three, no React — the key→intent map is unit-testable in isolation).
 *
 * This mirrors the Clash of Clans village camera: a fixed oblique downward view
 * (~49° elevation) that the player can ORBIT AROUND — the tilt is locked, but the
 * azimuth (heading) is free, so you can spin the whole island to any angle. The
 * player PANS (drag / arrow keys), ZOOMS (pinch / wheel / +−) — both clamped so
 * the island can never be lost off-screen — and ROTATES (drag / Q·E / buttons)
 * without ever changing the fixed tilt. The camera itself is drei's `MapControls`
 * (see `CityScene`); the DOM viewport and on-screen toolbar translate keys/clicks
 * into these discrete `CameraAction`s, applied imperatively to the controls.
 */

export type CameraAction =
  | "panUp"
  | "panDown"
  | "panLeft"
  | "panRight"
  | "zoomIn"
  | "zoomOut"
  | "rotateLeft"
  | "rotateRight"
  | "recenter";

/**
 * Fixed tilt + feel for the village camera (Clash-of-Clans-style; azimuth free),
 * plus its DEPTH RANGE — `nearPlane` / `farPlaneRatio` live here because they are
 * derived from the same clamped orbit the rest of this object describes.
 */
export const VILLAGE_CAMERA = {
  /** Closest the camera may dolly in, as a fraction of the default distance. */
  minDistanceRatio: 0.5,
  /**
   * Farthest the camera may dolly out, as a fraction of the default distance.
   * Raised from 1.6 so the player can pull back far enough to take in the WHOLE
   * island plus a comfortable margin of surrounding sea (the fog far-plane in
   * `CityScene` is pushed out to match, so the island stays clear at full zoom-out)
   * — without overshooting so far the island shrinks to a speck.
   */
  maxDistanceRatio: 2.6,
  /** Fixed downward tilt from +Y (radians). ~0.72 ≈ 49° elevation (CoC-like). */
  polarAngle: 0.72,
  /** Initial heading around +Y (radians); azimuth is FREE (the player may orbit). */
  azimuthAngle: -Math.PI * 0.28,
  /** Damping factor for eased pan/zoom/rotate (disabled under reduced motion). */
  dampingFactor: 0.08,
  /** World-units panned per discrete key/button step, as a fraction of distance. */
  panStepRatio: 0.09,
  /** Multiplicative dolly per discrete zoom step (< 1 zooms in). */
  zoomStep: 0.84,
  /** Azimuth turned per discrete rotate key/button step (radians). ~15°. */
  rotateStep: Math.PI / 12,
  /**
   * Camera NEAR plane (world units). This is a depth-PRECISION knob, not a framing
   * one, and it is the whole reason road tiles used to z-fight at full zoom-out.
   *
   * A perspective depth buffer's resolution degrades with `distance² / near` (see
   * {@link depthResolutionAt}), so a needlessly small near plane throws away
   * precision everywhere. three's default is `0.1`, which was ~20× tighter than
   * this camera can ever get: the tilt is locked at `polarAngle` and the dolly is
   * clamped at `minDistanceRatio`, so across every zoom / pan / azimuth extreme
   * nothing solid comes within 3u of the camera. At `0.1` one depth step at full
   * zoom-out was ~0.039u — WIDER than the 0.02u gap between the road curb's top
   * face and the asphalt's, so the two traded places per-pixel and the network read
   * as overlapping, twitching slabs.
   *
   * `1` sits well under that floor (so it cannot clip anything the player can see)
   * while buying a 10× precision win for the whole scene.
   */
  nearPlane: 1,
  /**
   * Camera FAR plane as a multiple of the island radius. Only has to cover the
   * furthest thing that can sit in front of the camera at full zoom-out (see
   * {@link maxViewDistance}); ×14 clears that with room to spare and stays inside
   * the fog's far distance, so nothing pops.
   *
   * Note this is NOT the precision lever — resolution goes as `1/near - 1/far`,
   * and with `near` this small the `1/far` term is worth ~0.2%. Pulling the far
   * plane in from ×40 changes nothing visible; it is tightened here only so the
   * range honestly describes the scene.
   */
  farPlaneRatio: 14,
  /**
   * How far PAN may overscroll past the island's play-area bound, as a fraction of
   * that bound. The pan target may travel this much further out under increasing
   * resistance, then settles back on release (see {@link overscrolledPosition} and
   * {@link settleOvershoot}). `0` would restore the old hard wall.
   *
   * Sized against the DEPTH BUDGET, not by feel alone: overscroll moves the target
   * further from the scene, which lengthens the worst-case view distance and eats
   * into the road layer's z-fight margin (`depthPrecision.test.ts`, from #152).
   * At `0.12` pan + `0.08` zoom the margin is ~4.4 depth steps against that test's
   * bar of 4; at `0.25` + `0.15` it drops to ~3.96 and the regression test fails.
   * So this is a real ceiling rather than a taste knob — do not raise it without
   * re-running that test.
   */
  panOverscrollRatio: 0.12,
  /**
   * How far ZOOM may overscroll past `minDistanceRatio` / `maxDistanceRatio`, as a
   * fraction of the exceeded limit. Same depth budget as `panOverscrollRatio`.
   */
  zoomOverscrollRatio: 0.08,
  /**
   * Resistance at the moment the bound is crossed: a drag just past the edge moves
   * the camera this fraction of its free-space distance, falling to zero as the
   * overscroll approaches its maximum. This is the `c` in the standard rubber-band
   * curve (see {@link overscrollResistance}); `0.55` is the value iOS uses and it
   * reads as "firm but not stuck".
   */
  overscrollStiffness: 0.55,
  /**
   * Exponential settle rate (per second) for the return once the pointer is
   * released. Overshoot decays by `e^(-lambda·dt)`, so `14` returns ~87% of the way
   * in 150 ms — quick enough to feel like a snap-back rather than a drift, slow
   * enough to read as elastic.
   */
  settleLambda: 14,
} as const;

/**
 * Below this much remaining overshoot (world units) the settle is finished and the
 * value is snapped exactly onto the bound, so the animation terminates instead of
 * decaying asymptotically forever.
 */
export const SETTLE_EPSILON = 0.001;

/**
 * Rubber-band resistance factor at a given `overshoot` past a bound: the fraction of
 * further outward movement that is actually applied.
 *
 * This is the derivative of the classic rubber-band curve `f(x) = c·d·x / (d + c·x)`
 * expressed in terms of the CURRENT overshoot rather than total drag travelled,
 * which is what lets the caller stay stateless — it only needs to know where the
 * camera is now, not how far the pointer has moved in total. Substituting
 * `y = f(x)` into `f'(x) = c·d² / (d + c·x)²` gives `c·(1 - y/d)²`.
 *
 * At the bound it returns `stiffness` (movement is damped but free); at
 * `maxOverscroll` it returns `0` (an asymptotic wall that is reached smoothly
 * rather than hit).
 *
 * **`maxOverscroll <= 0` returns `0`, which is how reduced motion is honoured** —
 * the same code path becomes a hard clamp with no special case to keep in sync.
 */
export function overscrollResistance(
  overshoot: number,
  maxOverscroll: number,
  stiffness: number = VILLAGE_CAMERA.overscrollStiffness,
): number {
  if (maxOverscroll <= 0 || overshoot >= maxOverscroll) {
    return 0;
  }
  const remaining = 1 - Math.max(0, overshoot) / maxOverscroll;
  return stiffness * remaining * remaining;
}

/**
 * Where a proposed camera value actually lands, given a `[min, max]` play area it
 * may stretch past elastically.
 *
 * Inside the bounds nothing happens. Moving further OUT past a bound is resisted by
 * {@link overscrollResistance} and can never exceed `maxOverscroll`. Moving back IN
 * from an overshoot is deliberately unresisted — the band is releasing its tension,
 * and damping the return would make the camera feel sticky rather than elastic.
 *
 * With `maxOverscroll = 0` this is exactly `clamp(proposed, min, max)`, the hard
 * wall that shipped before, which is what reduced motion gets.
 */
export function overscrolledPosition(
  current: number,
  proposed: number,
  min: number,
  max: number,
  maxOverscroll: number,
  stiffness: number = VILLAGE_CAMERA.overscrollStiffness,
): number {
  if (proposed >= min && proposed <= max) {
    return proposed;
  }
  if (maxOverscroll <= 0) {
    return Math.min(Math.max(proposed, min), max);
  }
  const overMax = proposed > max;
  const bound = overMax ? max : min;
  const sign = overMax ? 1 : -1;
  const currentOvershoot = Math.max(0, (current - bound) * sign);
  const proposedOvershoot = (proposed - bound) * sign;
  // Releasing tension (or coming back through the bound): let it move freely.
  if (proposedOvershoot <= currentOvershoot) {
    return proposed;
  }
  const applied =
    (proposedOvershoot - currentOvershoot) *
    overscrollResistance(currentOvershoot, maxOverscroll, stiffness);
  const nextOvershoot = Math.min(currentOvershoot + applied, maxOverscroll);
  return bound + sign * nextOvershoot;
}

/**
 * One frame of the elastic settle: how much overshoot remains after `dtSeconds`.
 *
 * Exponential decay so the return is frame-rate independent (a 30 fps and a 120 fps
 * client take the same wall-clock time), and snapped to `0` under
 * {@link SETTLE_EPSILON} so the animation actually ends.
 */
export function settleOvershoot(
  overshoot: number,
  dtSeconds: number,
  lambda: number = VILLAGE_CAMERA.settleLambda,
): number {
  if (overshoot <= SETTLE_EPSILON || dtSeconds <= 0) {
    return overshoot <= SETTLE_EPSILON ? 0 : overshoot;
  }
  const next = overshoot * Math.exp(-lambda * dtSeconds);
  return next <= SETTLE_EPSILON ? 0 : next;
}

/**
 * Settle a value that may be sitting outside `[min, max]` back toward the bound it
 * exceeded. Values already inside are returned untouched, so this is safe to call
 * every frame regardless of state.
 */
export function settledPosition(
  value: number,
  min: number,
  max: number,
  dtSeconds: number,
  lambda: number = VILLAGE_CAMERA.settleLambda,
): number {
  if (value > max) {
    return max + settleOvershoot(value - max, dtSeconds, lambda);
  }
  if (value < min) {
    return min - settleOvershoot(min - value, dtSeconds, lambda);
  }
  return value;
}

/**
 * The maximum pan/zoom overscroll allowed right now — `0` under reduced motion,
 * which collapses every elastic path above into the hard clamp that shipped before.
 * Centralised so the reduced-motion rule is stated once and cannot drift between
 * the pan seam and the zoom seam.
 */
export function overscrollAllowance(
  limit: number,
  ratio: number,
  reducedMotion: boolean,
): number {
  return reducedMotion ? 0 : Math.abs(limit) * ratio;
}

/**
 * The smallest depth difference (world units) a `depthBits`-deep depth buffer can
 * still resolve `distance` in front of a perspective camera with this `near`/`far`.
 *
 * Two surfaces closer together than this at that distance are not separable: which
 * one wins is decided by rounding, per pixel, and the loser speckles through — the
 * classic z-fight. Distance enters SQUARED and `near` reciprocally, which is why a
 * scene can look perfect zoomed in and fall apart zoomed out.
 */
export function depthResolutionAt(
  distance: number,
  near: number,
  far: number,
  depthBits = 24,
): number {
  return (distance * distance * (1 / near - 1 / far)) / 2 ** depthBits;
}

/**
 * Upper bound (world units) on how far in front of the camera anything visible can
 * sit: at full zoom-out the camera is `cameraDistance × maxDistanceRatio` from its
 * target, the target may be panned `panBound` off-center, and the scene reaches out
 * to the lagoon's far rim beyond it. Deliberately generous — it exists to size the
 * far plane and to pin the worst-case depth resolution, so over-estimating is safe.
 */
export function maxViewDistance(
  cameraDistance: number,
  seaRadius: number,
  panBound: number,
): number {
  return cameraDistance * VILLAGE_CAMERA.maxDistanceRatio + seaRadius + panBound;
}

/**
 * Map a keyboard key to a camera action, or `null` if it is not a camera control.
 * Arrow keys / WASD PAN, +/- zoom, Q/E orbit the azimuth, 0 recenters home.
 */
export function cameraKeyIntent(key: string): CameraAction | null {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "panUp";
    case "ArrowDown":
    case "s":
    case "S":
      return "panDown";
    case "ArrowLeft":
    case "a":
    case "A":
      return "panLeft";
    case "ArrowRight":
    case "d":
    case "D":
      return "panRight";
    case "+":
    case "=":
      return "zoomIn";
    case "-":
    case "_":
      return "zoomOut";
    case "q":
    case "Q":
      return "rotateLeft";
    case "e":
    case "E":
      return "rotateRight";
    case "0":
      return "recenter";
    default:
      return null;
  }
}
