import { FLOOR_ACROSS, SUCCESSION_CAMERA } from "../../succession/successionForum";
import {
  type CityFraming,
  FRAME_MARGIN,
  groundRingOnScreen,
  uprightOnScreen,
} from "./cityFraming";

/**
 * **THE FORUM, FITTED TO WHATEVER WINDOW IT IS IN.**
 *
 * The play-test frame that produced this module had the arc of civic buildings running off both
 * sides of the canvas: measured at 1024x580, the composition's corners reached ndc x -2.2 to
 * +2.8, so a player at the lead's own window size was looking at roughly the middle third of a
 * forum. The lead's own frame did not show that, because his window is more than twice as wide —
 * which is the whole reason this is a viewport question rather than a layout one.
 *
 * **The crisis panel is what makes the Succession worse at it than the city.** `.sx-shell` gives
 * the panel `min(400px, 44vw)`, so at 1024 the canvas is 624x580 — very nearly SQUARE — while at
 * the lead's 2167 it is 1767x1143 and half as tall as it is wide. One fixed camera cannot frame a
 * wide arc in both, and a camera tuned for either is wrong in the other.
 *
 * ## IT IS THE CITY'S OWN MECHANISM, NOT A SECOND ONE
 *
 * `CityScene` has fitted its island to the canvas since it was written: `islandFraming` measures
 * the drawn silhouette with {@link groundRingOnScreen} and hands the widening to
 * `applyCityFraming`, which puts it on the camera as a `setViewOffset` rather than by moving
 * anything. Every line of that applies here unchanged, and this module reuses all of it — the
 * projection algebra is pinned against a real `THREE.PerspectiveCamera` in `cityFraming.test.ts`,
 * which is not evidence worth re-earning.
 *
 * What could NOT be reused is `islandFraming` itself, and the reason is one line of it: it fits
 * `islandFitRadius(layout.islandRadius)` against `VILLAGE_CAMERA.maxDistanceRatio` and lifts by
 * the island's own off-centre. Those are the city's three numbers. The two shapes that matter —
 * the ring measurement and the widening — are the shared functions, and this holds the forum's
 * own fit, its own cap and its own headroom.
 *
 * ## WHY IT IS `forumFraming` AND NOT `successionFraming`
 *
 * Because it has no district in it. It knows a camera, a canvas and how far the drawn paving
 * reaches, and it decides nothing whatever about the board — so it belongs beside
 * `winterFraming.ts` and `cityFraming.ts` rather than in era four's own directory under era
 * four's own prefix. `SUCCESSION_CAMERA`'s docblock has the longer argument, including the
 * guard that makes the placement a requirement rather than a preference.
 *
 * ## WHY THE TILT IS NOT A PARAMETER
 *
 * {@link groundRingOnScreen} reads `VILLAGE_CAMERA.polarAngle` directly, and the Succession locks
 * `OrbitControls` to **the same 0.72** — deliberately, because it is the tilt every cut groove in
 * this crisis was drawn to read at. `forumFraming.test.ts` asserts the two are equal rather
 * than trusting the coincidence, because the day they diverge this module silently measures a
 * camera the crisis does not ship.
 */

/**
 * **HOW FAR THE FRAME HAS TO REACH, and it is the DRAWN paving rather than the composition.**
 *
 * Fitting the composition's own bounding box would be the tighter picture and the wrong one: the
 * paved disc is the biggest thing on screen by a long way, and a frame that cropped it would put
 * a hard cut edge through the one surface the whole crisis stands on. So the disc plus its kerb
 * plus a finger of sea, which is `ISLAND_SHORE_REACH`'s argument applied to a smaller island.
 */
export const FORUM_FIT = FLOOR_ACROSS + 2;

/**
 * How much world height above the far rim the frame keeps.
 *
 * The ring measurement is a GROUND ring and knows nothing about how tall anything on it is, so a
 * frame fitted to the ring alone cuts the roofs off the buildings standing at the back of it. The
 * tallest thing on this island is the treadwheel crane's mast at 5.7 above its deck; this is that
 * plus a little, so the port's own silhouette clears the top edge.
 */
export const FORUM_HEADROOM = 6.4;

/** The camera's distance from its target, which the mount's own position states. */
export function forumCameraDistance(): number {
  const [px, py, pz] = SUCCESSION_CAMERA.position;
  const [tx, ty, tz] = SUCCESSION_CAMERA.target;
  return Math.hypot(px - tx, py - ty, pz - tz);
}

/**
 * The frame the forum asks for at this canvas size, or `null` before the canvas has one.
 *
 * The widening is capped at {@link SUCCESSION_CAMERA.farRatio} for `islandFraming`'s own reason:
 * that constant already means *"the widest view of this forum the game is willing to show"*,
 * because it is exactly what the player's own zoom-out reaches, so a DEFAULT frame may not be
 * wider than the widest frame anybody can ask for.
 */
export function forumFraming(input: {
  readonly view: { readonly width: number; readonly height: number };
  readonly fit?: number;
  readonly headroom?: number;
  /** CSS pixels covered by a full-height rail on the left. Zero for a bottom sheet. */
  readonly occludedLeft?: number;
}): CityFraming | null {
  const { view } = input;
  if (view.width <= 0 || view.height <= 0) {
    return null;
  }
  const fit = input.fit ?? FORUM_FIT;
  const headroom = input.headroom ?? FORUM_HEADROOM;
  const occludedLeft = Math.max(0, Math.min(view.width - 1, input.occludedLeft ?? 0));
  const visibleWidth = view.width - occludedLeft;
  const distance = forumCameraDistance();
  const targetY = SUCCESSION_CAMERA.target[1];
  const fov = SUCCESSION_CAMERA.fov;

  const ring = groundRingOnScreen({ view, radius: fit, distance, targetY, fov });
  /*
   * THE ROOFLINE, AND IT IS MEASURED RATHER THAN ADDED AS A MARGIN. An upright at the ring's FAR
   * pole is the conservative reading for anything standing at the back of the forum, which is
   * where the port and the deepest civic buildings are — the same `groundOffset` convention
   * `uprightOnScreen` documents, pointed at the edge the roofs actually cross.
   */
  const roofline =
    ring.top -
    uprightOnScreen({ view, height: headroom, distance, targetY, fov, groundOffset: fit });

  const usable = 1 - 2 * FRAME_MARGIN;
  const zoom = Math.min(
    SUCCESSION_CAMERA.farRatio,
    Math.max(
      1,
      (ring.bottom - roofline) / (view.height * usable),
      (ring.right - ring.left) / (visibleWidth * usable),
    ),
  );
  // The silhouette's own centre in the frame the zoom leaves, exactly as `islandFraming` does it:
  // the widening shrinks everything toward the middle first, so what is left to correct is that
  // much smaller.
  const offCentre = (roofline + ring.bottom) / 2 - view.height / 2;
  return { offsetX: occludedLeft / 2, lift: offCentre / zoom, zoom };
}
