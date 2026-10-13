import type { EraId } from "@cr/skill-graph";

import type { CityLayout } from "../worldLayout";
import { VILLAGE_CAMERA } from "./orbitCamera";

/**
 * **WHERE THE ISLAND IS DRAWN IN THE FRAME — the DEFAULT framing, and the mechanism the
 * crisis framing borrows.**
 *
 * The lead's window is 1024x580 and the island does not fit in it. Measured through the
 * projection below at the framing that shipped: the drawn island spans **829px** down a
 * **580px** viewport, its near shore sits **275px below the bottom edge**, and it runs 2.4px
 * past each side. `cityFraming.browser.test.tsx` photographs it — the top arc of shoreline is
 * in view and the whole southern shore is off the screen.
 *
 * ## IT IS NOT A SHORT-VIEWPORT BUG, WHICH IS THE FIRST THING THE ARITHMETIC SETTLES
 *
 * The obvious reading is that 1024x580 is a small window and a bigger one is fine. It is not:
 * a perspective camera's vertical frustum is a fixed ANGLE, so the world extent that maps
 * onto the viewport's height is the same however many pixels that height is. The island's
 * vertical span is therefore **143% of the viewport height at every viewport** — 427px below
 * the bottom edge at 1440x900, 513px at 1920x1080 — and the defect is universal rather than
 * the lead's screen being unusual. What a short viewport changes is only how much is left over
 * on the OTHER axis, which is why the horizontal fit binds on a phone and never on a laptop.
 *
 * ## WHAT "FITS" MEANS HERE, WHICH IS THE RULING EVERYTHING ELSE HANGS ON
 *
 * **The whole drawn island — the grass disc AND the shore it shelves into — inside the
 * canvas, with a thin margin of lagoon around it. Not the buildable area, and not a
 * generous apron of sea.**
 *
 * Three candidates were costed against the projection before this one was taken:
 *
 *  - **the buildable disc (22) plus context** costs NO widening at all — its span is 87% of
 *    the viewport's height and only the off-centring puts its near rim off the bottom — so
 *    the lift alone would seat it. That is what makes it the tempting rule and the wrong one:
 *    the frame it certifies still has every pixel of shoreline outside it, which is the frame
 *    being complained about;
 *  - **the grass disc alone (`islandRadius`)** costs a 1.31x view and still crops the beach:
 *    the shore shelves 4 units further out (`StarterIsland.tsx`'s `SHORE_PROFILE` — *"it
 *    reaches `dr = 4` ... so the island's visible footprint is unchanged"*), which leaves 51px
 *    of sand below the bottom edge at 1024x580 and 79px at 1440x900. An island whose beach is
 *    cut off by the window is the picture this is fixing, so a rule that leaves it cut off is
 *    the wrong rule;
 *  - **the grass disc plus a generous apron of sea** is the failure the crisis framing
 *    already made and the lead already rejected in terms: *"we're too zoomed out to see the
 *    actual island."* The lagoon is not content. {@link FRAME_MARGIN} buys the smallest band
 *    that stops the shore reading as a crop, and nothing beyond it.
 *
 * So the fit radius is `islandRadius + ISLAND_SHORE_REACH`, and the cost is a **1.52x** view
 * at every laptop viewport, which leaves the grass disc reading 81% of the screen's height
 * against 123% today.
 *
 * ## AND IT IS A LENS, NOT A DOLLY — BECAUSE A DOLLY SPENDS THE ISLAND'S GROWTH HEADROOM
 *
 * The cheap fix is to raise `CAMERA_DISTANCE_RATIO` until the island fits. The objection is not
 * that it fails today. It is that this change is a PREREQUISITE TO ISLAND GROWTH, and a dolly
 * pays for the frame out of exactly the budget the growth needs.
 *
 * A camera pulled back is still aimed at the island's centre, so it has to buy the
 * off-centredness with distance as well as the size — the fit needs the ratio at **4.02**
 * rather than 2.3, a **1.75x** pullback against the lens's 1.52x. Depth resolution degrades
 * with the SQUARE of the view distance (`depthResolutionAt`), and `depthPrecision.test.ts`
 * holds the road layer to 4 resolvable steps at the furthest view. Measured at the tip:
 *
 *  - **era one today: 11.04 steps.** Not the 4.42 §5.1 recorded until #413 re-derived it on
 *    2026-08-02 — that figure was measured against the road stack D-ERA30 replaced, and this
 *    module quoted it before the correction landed;
 *  - **era one under the dolly: 4.74.** It passes, which is why this is not an argument about
 *    breaking a guard today;
 *  - **grass 46 today: 4.69. Grass 46 under the dolly: 2.02.** The island's growth ceiling
 *    falls from about grass 50 to about **grass 33** — below era three's authored 35. The
 *    camera fix would have eaten the expansion it exists to unblock, and the era that paid for
 *    it would have been the third one.
 *
 * A projection VIEW OFFSET moves no camera. The worst-case view distance is unchanged to the
 * last bit, so the road layer's headroom and the growth ceiling are exactly where they were.
 * `nearPlane` keeps its argument too, and the one thing that DOES change was measured rather
 * than waved past: a wider frustum admits rays that were outside it, so the closest VISIBLE
 * surface can come nearer even though the closest surface cannot. The steepest ray steepens
 * from 64.7 to 72.3 degrees below horizontal, which over the whole dolly/pan/azimuth sweep
 * costs the nearest visible surface single-digit percent, against a floor of 3u and a near
 * plane of 1u (`cityFraming.test.ts`).
 *
 * It is also the mechanism `winterFraming.ts` already established for exactly this reason:
 * `MapControls` keeps the player's target, distance and heading, so there is no restore, no
 * fight with the wheel, and no state change that can reset a pan.
 *
 * ## TWO NUMBERS, AND THE LIFT IS WORTH A QUARTER OF THE ISLAND
 *
 *  - **`lift`** slides the frame UP so the island's SILHOUETTE is centred, rather than the
 *    point the camera is aimed at. Those are different points: the ground is seen at a locked
 *    oblique tilt, so the near half of the disc is magnified and the far half compressed, and
 *    the projection of a disc centred on the target lands well BELOW the middle of the
 *    screen — 151px below it at 1024x580. That is the whole reason the island runs off the
 *    bottom while leaving sky at the top.
 *  - **`zoom`** widens the view until the fit radius is inside the viewport on both axes.
 *
 * The two are not independent, and the lift is what makes the zoom affordable: widening about
 * the SCREEN's centre has to buy back the off-centredness twice over, and needs **2.07x**
 * where centring the silhouette first needs **1.52x**. That is 27% of the island's size for
 * one number.
 *
 * ## AND IT FOLLOWS A GROWING ISLAND FOR FREE
 *
 * Everything above is derived from `layout.islandRadius` and `layout.cameraDistance`, and the
 * second is `radius * CAMERA_DISTANCE_RATIO`, so the picture is scale-invariant: a bigger
 * disc seen from proportionally further out projects identically. The only term that does not
 * scale is the shore's 4 units, which is an absolute width of beach, so a bigger island needs
 * slightly LESS widening (1.45x at grass 46, 1.41x at grass 69). Nothing here has to be
 * re-tuned when the island grows.
 */

/**
 * How far the island's drawn shore reaches past the grass disc, in world units.
 *
 * `StarterIsland.tsx` owns the shore and states this number as the island's own footprint:
 * its `SHORE_PROFILE` runs to `dr = 3.5` with a toe out to `dr = 4`, and the docblock says
 * "it reaches `dr = 4`, exactly as far as the shipped skirt did, so the island's visible
 * footprint is unchanged". The waterline itself falls at `dr = 3.14`, so fitting 4 is
 * conservative by the better part of a world unit rather than tight against the art.
 *
 * It is a constant and not a fraction of the radius on purpose. A beach is an absolute width
 * of sand, not a share of the island, and D-ERA26 makes the shore per-era ART — so a fraction
 * would be this module inventing a shoreline rule for nine eras that have not authored one.
 * `cityFraming.test.ts` walks the BUILT island's own vertices and fails if the drawn silhouette
 * grows past this, or if this drifts more than a unit clear of it.
 */
export const ISLAND_SHORE_REACH = 4;

/**
 * The band of lagoon kept between the island and the edge of the canvas, as a share of the
 * viewport on whichever axis binds.
 *
 * SMALL ON PURPOSE. This is not breathing room, it is the difference between a shore that
 * reads as a shore and one that reads as a crop — the eye needs to see the water close over
 * the sand, and about a finger's width of it does that. 3% is 17px at 1024x580 and 27px at
 * 1440x900. Every point above it is paid for out of the island's own size, in the one
 * currency the lead has already objected about twice, so it buys the picture nothing.
 */
export const FRAME_MARGIN = 0.03;

export const PHONE_CITY_INSETS = {
  top: 104,
  right: 8,
  bottom: 128,
  left: 8,
} as const;

export const PHONE_FRAME_MAX_ZOOM = 3.2;

/** Where something lands on screen, in CSS pixels from the canvas's top-left. */
export interface ScreenBox {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

/**
 * Where a ring of `radius` on the ground plane lands on screen, EXACTLY.
 *
 * ## THE DERIVATION, BECAUSE THIS IS CLOSED FORM AND NOT AN APPROXIMATION
 *
 * `winterFraming.ts`'s `worldToPx` estimates a span and pins its error at 8%; there is no
 * need to do that here, because the extrema of a ground circle under this camera have exact
 * solutions and both fall out of the same two lines of camera algebra.
 *
 * Put the camera at height `H` above the ground plane with its nadir `D` from the island's
 * centre, and take axes along the view's horizontal direction (`a`, away from the camera),
 * across it (`b`) and up. The camera's forward and up unit vectors are `(cos e, -sin e)` and
 * `(sin e, cos e)` in the (`a`, vertical) plane, `e` being the elevation, so a ground point
 * at `(a, b)` from the nadir sits at
 *
 *     depth = a·cos e + H·sin e        across = b        up = a·sin e - H·cos e
 *
 * and the ring is `a = D + R·cos t`, `b = R·sin t`.
 *
 * **Vertically**, `b` does not appear, and `up/depth` differentiates to `H/depth²`, which is
 * positive everywhere — so the extremes are simply the ring's NEAR and FAR poles,
 * `a = D ∓ R`. (This is also why the projection is so far off-centre: the two poles are at
 * very different depths, and the near one is magnified.)
 *
 * **Horizontally**, maximising `R·sin t / (K + R·cos e·cos t)` with `K = D·cos e + H·sin e`
 * gives `cos t = -R·cos e / K` and a maximum of `R / sqrt(K² - R²cos²e)` — the tangent point,
 * which is NOT the ring's ±90° point and is a few percent wider than one. It is symmetric
 * about the centre line, which is why there is no horizontal counterpart to `lift`.
 *
 * Both are pinned against a real `THREE.PerspectiveCamera` in `cityFraming.test.ts` — to a
 * hundredth of a CSS pixel, which is the dense sample's own resolution, rather than to a
 * percentage — because an exact form that is exactly wrong is the failure this shape invites.
 */
export function groundRingOnScreen(input: {
  readonly view: { readonly width: number; readonly height: number };
  readonly radius: number;
  /** The camera's distance from its target — the LAYOUT's, never the live dolly. */
  readonly distance: number;
  /** World Y of the point the camera is aimed at (`layout.cameraTarget[1]`). */
  readonly targetY: number;
  readonly fov: number;
}): ScreenBox {
  const { view, radius: R } = input;
  // `polarAngle` is measured from +Y, so its cosine is the elevation's sine and vice versa.
  const sinE = Math.cos(VILLAGE_CAMERA.polarAngle);
  const cosE = Math.sin(VILLAGE_CAMERA.polarAngle);
  const H = input.targetY + sinE * input.distance;
  const D = cosE * input.distance;
  const tanHalfFov = Math.tan((input.fov * Math.PI) / 360);
  const aspect = view.width / view.height;

  const ndcY = (a: number) => (a * sinE - H * cosE) / (a * cosE + H * sinE) / tanHalfFov;
  const K = D * cosE + H * sinE;
  const ndcHalfX = R / Math.sqrt(K * K - R * R * cosE * cosE) / (tanHalfFov * aspect);

  return {
    top: ((1 - ndcY(D + R)) / 2) * view.height,
    bottom: ((1 - ndcY(D - R)) / 2) * view.height,
    left: ((1 - ndcHalfX) / 2) * view.width,
    right: ((1 + ndcHalfX) / 2) * view.width,
  };
}

/**
 * How tall an UPRIGHT standing on the ground reads on screen, in CSS pixels, EXACTLY.
 *
 * The companion to {@link groundRingOnScreen}, and it falls out of the same two lines of
 * camera algebra: a point at height `y` above the ground plane, `a` from the camera's nadir,
 * sits at
 *
 *     depth = a·cos e + (H - y)·sin e        up = a·sin e - (H - y)·cos e
 *
 * so `ndcY` differentiates to `a / depth²` in `y`. Two consequences worth naming, because both
 * are counter-intuitive and both are measured rather than assumed:
 *
 *  - **it is not linear in the height**, so the answer is the difference of the two ndc values
 *    rather than a slope times a height. At a person's size the two agree to a fraction of a
 *    pixel; at the Lookout's 9.769u they do not;
 *  - **it is not monotonic in the distance from the centre.** `a / depth²` peaks at
 *    `a = H·sin e / cos e`, which on the shipped camera falls a little way out from the
 *    island's middle — so a figure on the near shore and a figure at the centre are not simply
 *    "nearer, therefore bigger". `groundOffset` defaults to the island's centre, which is the
 *    CONSERVATIVE reading for anything standing in the settlement.
 *
 * `zoom` is the framing's widening. A view offset scales the whole ndc frame by `1/zoom`
 * ({@link applyCityFraming}), and nothing about a vertical extent escapes that, so it divides
 * out here rather than needing a second projection.
 *
 * Derived on `cursor/citizen-size-noticeable-e17b` (#453) and carried forward unchanged; its
 * control is that it reproduces four independently measured screen figures to a tenth of a
 * pixel, and `cityFraming.test.ts` pins it against a real `THREE.PerspectiveCamera`.
 */
export function uprightOnScreen(input: {
  readonly view: { readonly height: number };
  /** The upright's world height, its foot on the ground plane. */
  readonly height: number;
  /** The camera's distance from its target — the LAYOUT's, never the live dolly. */
  readonly distance: number;
  /** World Y of the point the camera is aimed at (`layout.cameraTarget[1]`). */
  readonly targetY: number;
  readonly fov: number;
  /** How far out from the island's centre it stands, along the view's away direction. */
  readonly groundOffset?: number;
  /** The framing's widening. `1` is the frame the camera's own fov gives. */
  readonly zoom?: number;
}): number {
  const sinE = Math.cos(VILLAGE_CAMERA.polarAngle);
  const cosE = Math.sin(VILLAGE_CAMERA.polarAngle);
  const H = input.targetY + sinE * input.distance;
  const a = cosE * input.distance + (input.groundOffset ?? 0);
  const tanHalfFov = Math.tan((input.fov * Math.PI) / 360);
  const ndcY = (y: number) =>
    (a * sinE - (H - y) * cosE) / (a * cosE + (H - y) * sinE) / tanHalfFov;
  return ((ndcY(input.height) - ndcY(0)) / 2) * (input.view.height / (input.zoom ?? 1));
}

/**
 * Where an arbitrary point on the ground plane lands on screen, in CSS pixels.
 *
 * {@link groundRingOnScreen} answers the same question for a ring CENTRED ON THE CAMERA'S
 * TARGET, which is enough for the island because the island is centred on the target and a
 * ring is symmetric — that symmetry is exactly why the default framing needs no horizontal
 * counterpart to `lift`, and why it does not depend on the azimuth.
 *
 * An off-centre ground point is neither. Where it lands depends on the player's live azimuth,
 * so a frame that wants to hold it has to project it rather than assume it.
 *
 * The decomposition is the same one {@link groundRingOnScreen} derives: with `MapControls`'
 * spherical convention the camera looks along `(-sin azimuth, -cos azimuth)` flattened to the
 * ground, so a world point splits into a component `a` along that heading and a component `b`
 * across it, and then the algebra is identical.
 */
export function groundPointOnScreen(input: {
  readonly view: { readonly width: number; readonly height: number };
  /** The point, in world XZ, relative to the point the camera is aimed at. */
  readonly point: { readonly x: number; readonly z: number };
  readonly distance: number;
  readonly targetY: number;
  readonly fov: number;
  /** The camera's live heading around +Y, in radians. */
  readonly azimuth: number;
}): { readonly x: number; readonly y: number } {
  const sinE = Math.cos(VILLAGE_CAMERA.polarAngle);
  const cosE = Math.sin(VILLAGE_CAMERA.polarAngle);
  const H = input.targetY + sinE * input.distance;
  const D = cosE * input.distance;
  const tanHalfFov = Math.tan((input.fov * Math.PI) / 360);
  const aspect = input.view.width / input.view.height;

  const awayX = -Math.sin(input.azimuth);
  const awayZ = -Math.cos(input.azimuth);
  // The across axis is the away heading turned a quarter-turn about +Y.
  const acrossX = -awayZ;
  const acrossZ = awayX;
  const along = input.point.x * awayX + input.point.z * awayZ;
  const across = input.point.x * acrossX + input.point.z * acrossZ;

  const a = D + along;
  const depth = a * cosE + H * sinE;
  const ndcY = (a * sinE - H * cosE) / depth / tanHalfFov;
  const ndcX = across / depth / (tanHalfFov * aspect);
  return {
    x: ((1 + ndcX) / 2) * input.view.width,
    y: ((1 - ndcY) / 2) * input.view.height,
  };
}

/** How far the island's drawn silhouette reaches from its centre, in world units. */
export function islandFitRadius(islandRadius: number): number {
  return islandRadius + ISLAND_SHORE_REACH;
}

/**
 * A framing, as the three screen-space numbers `setViewOffset` can carry at once.
 *
 * One shape for both the default framing and the crisis one, so the scene applies exactly
 * one of them and there is never a partly-applied frame to reason about.
 */
export interface CityFraming {
  /** CSS pixels to slide the picture RIGHT. The crisis panel's slide; `0` otherwise. */
  readonly offsetX: number;
  /** CSS pixels to slide the picture UP the screen. */
  readonly lift: number;
  /** How much wider a view to take. `1` is the frame the camera's own fov gives. */
  readonly zoom: number;
}

const PRESENTER_REFERENCE_CANVAS = { width: 1024, height: 518 } as const;

/**
 * Presenter-only projection measured from the two approved source rasters into the real
 * 1024×580 learner mount (whose canvas is 1024×518 above the Presenter bar).
 *
 * The rejected whole-island fit put the reference landmarks into roughly half their authored
 * screen span. A single scale/translation fit explains both source-to-runtime maps with 19–24px
 * RMS error, so this is a projection correction rather than a second set of fixture cells.
 * Ordinary learners, phones, later eras, and every crisis frame keep the product island fit.
 */
export function presenterReferenceFraming(
  eraId: EraId,
  view: { readonly width: number; readonly height: number },
): CityFraming | null {
  if (view.width < 900 || view.height < 450 || view.width / view.height < 1.55) {
    return null;
  }
  const reference =
    eraId === "prehistoric"
      ? { offsetX: 47, lift: 59, zoom: 0.816 }
      : eraId === "neolithic"
        ? { offsetX: 43, lift: 59, zoom: 0.715 }
        : null;
  if (reference === null) {
    return null;
  }
  return {
    offsetX: (reference.offsetX * view.width) / PRESENTER_REFERENCE_CANVAS.width,
    lift: (reference.lift * view.height) / PRESENTER_REFERENCE_CANVAS.height,
    zoom: reference.zoom,
  };
}

/**
 * The frame the island asks for at this canvas size, or `null` before the canvas has one.
 *
 * ## THE CEILING, AND THE ONE POPULATION IT LEAVES OUT
 *
 * The widening is capped at `VILLAGE_CAMERA.maxDistanceRatio`. That constant already means
 * "the widest view of the island this game is willing to show" — it is exactly what the
 * player's own zoom-out control reaches — so the DEFAULT frame may not be wider than the
 * widest frame anybody can ask for. It also keeps the effective field of view sane: at the
 * cap the 32° lens reads as 73°, and the uncapped portrait-phone fit would ask for 99°.
 *
 * The cap binds on **portrait viewports narrower than about 0.73:1**, where the disc is wider
 * than two and a half screens; a phone in portrait therefore still gets an island that runs
 * off both sides, framed as well as the cap allows. Every landscape viewport, and every
 * portrait one down to about 3:4, fits whole. `cityFraming.test.ts` pins the crossover so
 * that population is a measured claim rather than a hedge.
 */
export function islandFraming(input: {
  readonly view: { readonly width: number; readonly height: number };
  readonly layout: CityLayout;
  readonly fov: number;
}): CityFraming | null {
  const { view, layout } = input;
  if (view.width <= 0 || view.height <= 0) {
    return null;
  }
  const island = groundRingOnScreen({
    view,
    radius: islandFitRadius(layout.islandRadius),
    distance: layout.cameraDistance,
    targetY: layout.cameraTarget[1],
    fov: input.fov,
  });
  if (view.width <= 640) {
    const content = {
      left: PHONE_CITY_INSETS.left,
      right: view.width - PHONE_CITY_INSETS.right,
      top: PHONE_CITY_INSETS.top,
      bottom: view.height - PHONE_CITY_INSETS.bottom,
    };
    const contentWidth = Math.max(1, content.right - content.left);
    const contentHeight = Math.max(1, content.bottom - content.top);
    const zoom = Math.min(
      PHONE_FRAME_MAX_ZOOM,
      Math.max(
        1,
        (island.right - island.left) / contentWidth,
        (island.bottom - island.top) / contentHeight,
      ),
    );
    const screenCenterX = view.width / 2;
    const screenCenterY = view.height / 2;
    const islandCenterX = (island.left + island.right) / 2;
    const islandCenterY = (island.top + island.bottom) / 2;
    const contentCenterX = (content.left + content.right) / 2;
    const contentCenterY = (content.top + content.bottom) / 2;
    return {
      offsetX: contentCenterX - (screenCenterX + (islandCenterX - screenCenterX) / zoom),
      lift: screenCenterY + (islandCenterY - screenCenterY) / zoom - contentCenterY,
      zoom,
    };
  }
  const usable = 1 - 2 * FRAME_MARGIN;
  const zoom = Math.min(
    VILLAGE_CAMERA.maxDistanceRatio,
    Math.max(
      1,
      (island.bottom - island.top) / (view.height * usable),
      (island.right - island.left) / (view.width * usable),
    ),
  );
  // The silhouette's own centre, in the frame the zoom leaves: `zoom` shrinks everything
  // toward the middle of the screen first, so what is left to correct is that much smaller.
  const offCentre = (island.top + island.bottom) / 2 - view.height / 2;
  return { offsetX: 0, lift: offCentre / zoom, zoom };
}

/** The slice of `THREE.PerspectiveCamera` a framing needs, so the arithmetic stays testable alone. */
export interface ViewOffsetCamera {
  setViewOffset(
    fullWidth: number,
    fullHeight: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void;
  clearViewOffset(): void;
}

/**
 * Put a framing on a camera, or take it off with `null`.
 *
 * ## WHY `setViewOffset` CARRIES ALL THREE NUMBERS
 *
 * `setViewOffset` says "render this sub-rectangle of that larger virtual frame", which is what
 * it is for when tiling a render across machines. Read the other way round it is exactly this
 * feature: ask for a WINDOW BIGGER than the virtual frame and the frustum scales up, which is
 * a zoom-out, and move that window and the picture shifts the opposite way. So the call below
 * asks for a window `zoom` times the frame, centred (that is the negative half-difference on
 * each axis), then slid to place the picture: LEFT by `offsetX · zoom` to push the island
 * right off a panel, and DOWN by `lift · zoom` to pull the island up the screen. One screen
 * pixel is `zoom` virtual pixels, which is where each `· zoom` comes from, and it is why both
 * numbers are stated in the CSS pixels a reviewer can measure rather than in frustum units.
 *
 * Scaling both axes by the same factor is what leaves the aspect ratio where it was. The
 * centring term is not optional: without it three anchors the frame's TOP-LEFT corner and
 * grows right and down, so a zoom-out alone would slide the island rather than widen around
 * it.
 *
 * ## AND WHY IT IS THE PROJECTION AND NOT THE CONTROLS
 *
 * Dollying `MapControls` would have to be undone, would fight the player's own wheel, would be
 * overwritten by the settle loop that returns the camera to its bounds, and would move the
 * camera far enough to cost the road layer its z-fight margin. A projection offset is outside
 * all of that: the controls' target, distance and heading are untouched, so there is nothing to
 * restore. Picking is unaffected for the same reason it is exact — `Raycaster.setFromCamera`
 * unprojects through `projectionMatrixInverse`, which is built from this matrix — so a click on
 * a cell still lands on the cell that is under it.
 */
export function applyCityFraming(
  camera: ViewOffsetCamera,
  framing: CityFraming | null,
  view: { readonly width: number; readonly height: number },
): void {
  if (framing === null) {
    camera.clearViewOffset();
    return;
  }
  const { zoom, offsetX, lift } = framing;
  camera.setViewOffset(
    view.width,
    view.height,
    (-view.width * (zoom - 1)) / 2 - offsetX * zoom,
    (-view.height * (zoom - 1)) / 2 + lift * zoom,
    view.width * zoom,
    view.height * zoom,
  );
}
