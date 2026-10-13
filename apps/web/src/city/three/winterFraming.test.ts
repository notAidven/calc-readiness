import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { eraCityLayout } from "../islandLand";
import { TOWN_HALL_ID } from "../townHall";
import { MAX_BUILD_HEIGHT, type PlacedTransform } from "../worldLayout";
import { VILLAGE_CAMERA } from "./orbitCamera";
import {
  applyWinterFraming,
  crisisPanelReach,
  ROOFLINE_SPREAD_ACROSS,
  ROOFLINE_SPREAD_DOWN,
  settlementRadius,
  WINTER_ROOFLINE_ALLOWANCE,
  winterFraming,
} from "./winterFraming";

/**
 * **THE ISLAND IS IN THE STRIP THE CRISIS PANEL LEAVES FREE, MEASURED THROUGH A REAL PROJECTION.**
 *
 * The lead could not see the island under the winter's panel three times running, and the second
 * time the panel's own box had already been measured at five viewports and declared fixed. So the
 * claim this file holds is deliberately not about the panel: it is where the SETTLEMENT lands on
 * screen, put through a `THREE.PerspectiveCamera` built exactly as `CityScene` builds it, with the
 * framing applied through the same `applyWinterFraming` the scene calls.
 *
 * The panel is now a side panel down the LEFT edge, so every claim below is about the HORIZONTAL
 * axis. That is the change, and it is why this file was rewritten rather than retuned: the band's
 * assertions were about a top edge and a lift, and both of those are gone.
 *
 * Every test here comes in a pair with its own premise, because "the settlement is clear of the
 * panel" is also true of a settlement drawn off the right of the screen, and it is trivially true
 * of a camera that shows nothing. So each one states what the DEFAULT framing does first — the
 * defect — and then what the winter framing does.
 *
 * The picture is `winterIslandVisible.browser.test.tsx`, which mounts the real canvas under the
 * real panel and samples the frame. This file is the half that can run in CI on every commit.
 */

const LAYOUT = eraCityLayout("prehistoric");
/** `CityScene`'s own `cameraConfig.fov`. */
const FOV = 32;

/**
 * The two laptop viewports the review named, and the phone width the side layout gives up at.
 *
 * 1024x580 is the lead's real window, measured off his own screenshot, and it replaces the 1024x640
 * that stood here: a viewport 60px taller is a viewport where this defect is easier, and the whole
 * history of this panel is reviews passing at a developer's window and failing at his.
 */
const LAPTOP = { width: 1440, height: 900 } as const;
const SHORT_LAPTOP = { width: 1024, height: 580 } as const;
const PHONE = { width: 460, height: 800 } as const;

/**
 * The camera `CityScene` mounts, at the framing it mounts it: `initialCameraPosition(layout)`
 * with the locked tilt, the default dolly and the depth range from `VILLAGE_CAMERA`.
 *
 * Rebuilt here rather than imported because `initialCameraPosition` is private to the scene. What
 * keeps the two honest is that both are derived from `VILLAGE_CAMERA` and `layout`, and the
 * distance is asserted below to be the layout's.
 */
function sceneCamera(view: { readonly width: number; readonly height: number }) {
  const [tx, ty, tz] = LAYOUT.cameraTarget;
  const az = VILLAGE_CAMERA.azimuthAngle;
  const polar = VILLAGE_CAMERA.polarAngle;
  const r = LAYOUT.cameraDistance;
  const s = Math.sin(polar) * r;
  const camera = new THREE.PerspectiveCamera(
    FOV,
    view.width / view.height,
    VILLAGE_CAMERA.nearPlane,
    LAYOUT.islandRadius * VILLAGE_CAMERA.farPlaneRatio,
  );
  camera.position.set(
    tx + s * Math.sin(az),
    ty + Math.cos(polar) * r,
    tz + s * Math.cos(az),
  );
  camera.lookAt(tx, ty, tz);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

/**
 * A SPREAD ERA-ONE CITY, which is the hard case for the fit.
 *
 * Spread on purpose: a packed city sits inside any strip and would prove nothing. These reach
 * cols -4..4 and rows -4..4, the same layout `winterIslandVisible.browser.test.tsx` photographs,
 * so the numbers here and the pixels there are about the same island.
 */
const CITY: readonly PlacedTransform[] = [
  { nodeId: "NUM.S", col: -4, row: -3, rot: 0 },
  { nodeId: "NUM.F", col: 2, row: 3, rot: 0 },
  { nodeId: "NUM.2", col: 4, row: -1, rot: 0 },
  { nodeId: "NUM.3", col: -3, row: 2, rot: 0 },
  { nodeId: "NUM.4", col: 1, row: -4, rot: 0 },
  { nodeId: "NUM.5", col: -1, row: 0, rot: 0 },
  { nodeId: TOWN_HALL_ID, col: -1, row: -1, rot: 0 },
];

/** A fresh island: the pre-seeded hall and nothing else. The state a demo machine is in. */
const FRESH: readonly PlacedTransform[] = [
  { nodeId: TOWN_HALL_ID, col: -1, row: -1, rot: 0 },
];

const CITY_RADIUS = settlementRadius(CITY, LAYOUT.buildableRadius);

interface ScreenBox {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

/**
 * Where the thing that has to stay visible lands on screen, in CSS pixels from the top-left.
 *
 * Sampled all the way round rather than at four poles: the camera's heading is oblique, so the
 * leftmost point on screen is not the point furthest along any world axis. A ROOFLINE is sampled on
 * that ring too, because what has to be inside the strip is a building and not the cell it stands
 * on — at `WINTER_ROOFLINE_ALLOWANCE`, which is what the fit allows for, so this asks whether the
 * fit delivers what it aimed at rather than something else.
 */
function ringOnScreen(
  camera: THREE.PerspectiveCamera,
  view: { readonly width: number; readonly height: number },
  radius = CITY_RADIUS,
  roofline = WINTER_ROOFLINE_ALLOWANCE,
): ScreenBox {
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  for (let step = 0; step < 128; step += 1) {
    const angle = (step / 128) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    for (const y of [0, roofline]) {
      const ndc = new THREE.Vector3(x, y, z).project(camera);
      const screenY = ((1 - ndc.y) / 2) * view.height;
      const screenX = ((ndc.x + 1) / 2) * view.width;
      top = Math.min(top, screenY);
      bottom = Math.max(bottom, screenY);
      left = Math.min(left, screenX);
      right = Math.max(right, screenX);
    }
  }
  return { top, bottom, left, right };
}

function framedCamera(
  view: { readonly width: number; readonly height: number },
  fitRadius = CITY_RADIUS,
) {
  const camera = sceneCamera(view);
  const framing = winterFraming({
    view,
    fitRadius,
    distance: LAYOUT.cameraDistance,
    fov: FOV,
  });
  expect(framing, `no framing at ${view.width}x${view.height}`).not.toBeNull();
  applyWinterFraming(camera, framing, view);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return { camera, framing };
}

describe("the panel's reach is the one the stylesheet actually sets", () => {
  /**
   * THE MIRROR IS THE RISK THIS MODULE TAKES, so the numbers are pinned at the viewports the
   * stylesheet's own breakpoints divide: either side of where the cap starts binding, and phone
   * width where the side layout gives up.
   *
   * That the numbers are the SAME ONES `winter-in-city.css` sets is
   * `test/winterCrisisBandMirror.test.ts`'s claim — it reads both files as text and fails if a
   * width moves in one without moving in the other. It lives there rather than here because this
   * project has no node types, so a test in it cannot open a file. That the width is the one the
   * panel's CONTENT needs is a third file's,
   * `crisisPanelFitsItsContent.browser.test.tsx`, which re-measures the content in Chromium.
   *
   * THE CROSSOVER MOVED WHEN THE PANEL WAS SIZED TO ITS CONTENT, and it is worth pinning for its
   * own sake: `min(620px, 50vw)` handed the cap over at 1240px, so every laptop in this file was
   * on the `50vw` branch and the cap was only ever exercised at 1440. `min(470px, 50vw)` hands it
   * over at 940px, which puts BOTH laptops on the cap and leaves the share binding only on a
   * window narrower than most. Both branches are still checked below, because both still ship.
   */
  it("carries the widths the stylesheet sets, on both sides of the cap", () => {
    // `min(470px, 50vw)` plus the 14px gutter it is inset by. The cap binds from 940px up.
    expect(crisisPanelReach(SHORT_LAPTOP)).toBe(470 + 14);
    expect(crisisPanelReach(LAPTOP)).toBe(470 + 14);
    expect(crisisPanelReach({ width: 940, height: 900 })).toBe(470 + 14);
    // ...and just below it the share is what binds, which is the other branch of the `min`.
    expect(crisisPanelReach({ width: 900, height: 700 })).toBe(900 * 0.5 + 14);
    expect(crisisPanelReach({ width: 920, height: 800 })).toBe(920 * 0.5 + 14);
    // Phone width is the full-bleed bottom sheet, so the panel reaches all the way across and
    // there is no strip at all to frame into.
    expect(crisisPanelReach(PHONE)).toBe(PHONE.width);
  });

  /**
   * AND IT IS THE HEIGHT IT NO LONGER DEPENDS ON, which is the band's whole geometry retired in
   * one assertion. A side panel is as tall as the screen in every phase, so its reach across the
   * screen cannot move when the screen gets shorter — and the 8vh the band gave up at
   * `max-height: 760px`, which is what made this a two-branch function, has nothing to give up.
   */
  it("does not change when the viewport gets shorter", () => {
    for (const width of [1024, 1440, 900] as const) {
      const tall = crisisPanelReach({ width, height: 900 });
      for (const height of [760, 759, 640, 580, 500] as const) {
        expect(crisisPanelReach({ width, height }), `${width}x${height}`).toBe(tall);
      }
    }
  });
});

describe("the settlement's reach is what the fit is sized by", () => {
  it("measures a spread city out to most of the board, and a fresh one to a few cells", () => {
    expect(CITY_RADIUS).toBeGreaterThan(LAYOUT.buildableRadius * 0.8);
    expect(CITY_RADIUS).toBeLessThanOrEqual(LAYOUT.buildableRadius);
    // A fresh island is the demo case, and it is a fraction of the board — which is the whole
    // reason the fit is sized by what is standing.
    const fresh = settlementRadius(FRESH, LAYOUT.buildableRadius);
    expect(fresh).toBeLessThan(CITY_RADIUS / 2);
    expect(
      fresh,
      "the hall contributes nothing, so a fresh island would fit trivially",
    ).toBeGreaterThan(0);
  });

  it("never reaches past the board, whatever a placement claims", () => {
    expect(
      settlementRadius(
        [{ nodeId: "NUM.S", col: 40, row: 40, rot: 0 }],
        LAYOUT.buildableRadius,
      ),
    ).toBe(LAYOUT.buildableRadius);
    expect(settlementRadius([], LAYOUT.buildableRadius)).toBe(0);
  });
});

describe("the winter frames the settlement into the strip beside the panel", () => {
  for (const view of [LAPTOP, SHORT_LAPTOP] as const) {
    const label = `${view.width}x${view.height}`;

    /**
     * **THE DEFECT, AS THE PREMISE, AND IT IS ALSO THE ANSWER TO "CAN THE CORRECTION GO?".**
     *
     * The brief asked that first: with the panel off the bottom, is the settlement clear with no
     * framing at all? It is not. The settlement is drawn CENTRED, because `layout.cameraTarget` is
     * the island's middle, and a panel occupying the left half of the screen therefore covers the
     * settlement's left half. Measured through the real projection at the default framing, this is
     * how much of it is behind the panel — and it is not a hair, it is hundreds of pixels, which is
     * why the correction survives the move to a side panel instead of being deleted.
     */
    it(`starts from a settlement that runs behind the panel at ${label}`, () => {
      const reach = crisisPanelReach(view);
      const { left } = ringOnScreen(sceneCamera(view), view);
      expect(
        left,
        `the settlement already clears the panel at ${label}, so there is nothing to fix`,
      ).toBeLessThan(reach);
      // And by a lot, not by a hair: this is a third of the settlement, not a rounding error.
      expect(reach - left).toBeGreaterThan(100);
    });

    it(`puts the whole settlement clear of the panel at ${label}`, () => {
      const reach = crisisPanelReach(view);
      const { camera } = framedCamera(view);
      const box = ringOnScreen(camera, view);

      expect(
        box.left,
        `${Math.round(reach - box.left)}px of settlement is still behind the panel at ${label}`,
      ).toBeGreaterThanOrEqual(reach);
      // AND IT IS ON SCREEN AT THE OTHER END, which is the failure mode a slide alone would have:
      // a frame pushed far enough sideways clears the panel by leaving the viewport.
      expect(
        box.right,
        `the settlement is drawn off the right edge at ${label}`,
      ).toBeLessThanOrEqual(view.width);
      // AND ON SCREEN VERTICALLY, which the panel does not constrain but the screen does: at
      // 1024x580 a spread settlement is 582px tall against 580px of viewport, so the fit has to
      // look down as well as across or the Lookout's roof leaves the top of the screen.
      expect(
        box.top,
        `the settlement is drawn off the top at ${label}`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        box.bottom,
        `the settlement is drawn off the bottom at ${label}`,
      ).toBeLessThanOrEqual(view.height);
    });

    /**
     * AND IT IS NOT FURTHER OUT THAN IT HAS TO BE. A framing that simply zoomed to the cap would
     * satisfy the test above and hand the reviewer a speck, so the settlement has to FILL the
     * strip: the same claim the browser file makes about pixels, made here about the projection.
     */
    it(`fills the free strip rather than shrinking to fit at ${label}`, () => {
      const strip = view.width - crisisPanelReach(view);
      const { camera, framing } = framedCamera(view);
      const box = ringOnScreen(camera, view);
      const span = box.right - box.left;

      expect(
        span / strip,
        `the settlement fills only ${Math.round((span / strip) * 100)}% of the strip at ${label}`,
      ).toBeGreaterThan(0.8);
      // Never past the dolly the player's own zoom control can reach, so the crisis cannot frame
      // the island from somewhere the game does not otherwise allow.
      expect(framing?.zoom ?? 0).toBeLessThanOrEqual(VILLAGE_CAMERA.maxDistanceRatio);
      expect(framing?.zoom ?? 0).toBeGreaterThan(1);
      // The slide is half the panel's reach, which is what centres the aimed-at point in the strip.
      expect(framing?.offsetX).toBeCloseTo(crisisPanelReach(view) / 2, 6);
    });

    /**
     * **AND THE ISLAND IS BIG, WHICH IS THE OBJECTION THE SIDE PANEL EXISTS TO ANSWER.**
     *
     * *"Now we're too zoomed out to see the actual island"* was said about a picture whose every
     * other assertion passed. The band needed **2.36x** at 1024x580 and **2.49x** at 1440x900 to
     * clear itself, because it was competing for the axis the settlement already nearly filled;
     * this ceiling is what would fail if the panel crept back onto that axis, or if its width crept
     * up until the strip beside it was as mean as the strip above the band.
     *
     * Read as a floor under the island's size rather than a ceiling on the zoom: `1.7` is a
     * settlement drawn at 59% of its unframed scale, against 42% under the band.
     */
    it(`hands the island back most of its size at ${label}`, () => {
      const { framing } = framedCamera(view);
      expect(
        framing?.zoom ?? 0,
        `the island is being shrunk to ${Math.round(100 / (framing?.zoom ?? 1))}% at ${label}`,
      ).toBeLessThan(1.7);
    });

    /**
     * **AND THE CORRECTION IS SIDEWAYS ONLY**, which is the other half of the rewrite. A vertical
     * lift is what shrank the island, and there is nothing left for one to uncover: a full-height
     * side panel covers the top of the island exactly as much as the bottom.
     *
     * Asserted on the PICTURE and not only on the absent field, and read off the ONE point that
     * makes it exact: the camera's own target, projected through both cameras. Its screen y is
     * unchanged to the pixel, which is what "the frame was not lifted" means, and its screen x has
     * moved right by exactly the slide. A margins-agree test was tried first and measures the wrong
     * thing — the roofline is sampled at the top of the ring and not the bottom, so the two margins
     * are 40px apart under a framing that lifts nothing at all.
     */
    it(`slides the frame sideways and not up at ${label}`, () => {
      const { camera, framing } = framedCamera(view);
      expect(framing).not.toHaveProperty("offsetY");
      const aimedAt = () => new THREE.Vector3(...LAYOUT.cameraTarget);
      const plain = aimedAt().project(sceneCamera(view));
      const framed = aimedAt().project(camera);
      const screenY = (ndc: THREE.Vector3) => ((1 - ndc.y) / 2) * view.height;
      const screenX = (ndc: THREE.Vector3) => ((ndc.x + 1) / 2) * view.width;

      expect(
        screenY(framed),
        `the point the camera is aimed at moved ${Math.round(screenY(plain) - screenY(framed))}px up the screen at ${label}`,
      ).toBeCloseTo(screenY(plain), 6);
      expect(screenX(framed) - screenX(plain)).toBeCloseTo(framing?.offsetX ?? 0, 6);
      // ...and that lands it in the middle of the strip the panel leaves free, which is the whole
      // purpose of the slide and the thing the offset is only a means to.
      const reach = crisisPanelReach(view);
      expect(screenX(framed)).toBeCloseTo(reach + (view.width - reach) / 2, 6);
    });

    /**
     * AND A FRESH ISLAND KEEPS ITS SCALE, which is the state a demo machine is in: one building,
     * so nothing has to be given up to fit it, and the frame is SLID without being widened at all.
     */
    it(`widens nothing for a fresh island at ${label}`, () => {
      const framing = winterFraming({
        view,
        fitRadius: settlementRadius(FRESH, LAYOUT.buildableRadius),
        distance: LAYOUT.cameraDistance,
        fov: FOV,
      });
      expect(framing?.zoom ?? 0, `a fresh island is being zoomed out at ${label}`).toBe(1);
      expect(framing?.offsetX).toBeCloseTo(crisisPanelReach(view) / 2, 6);

      // ...and the hall's own ground really is clear of the panel afterwards, which is the point of
      // not widening. Read on the ground ring rather than with the roofline allowance on top of it:
      // that allowance is the worst case for a building standing on the fitted ring's far edge, and
      // on a one-building island the ring is four cells wider than anything standing on it.
      const camera = sceneCamera(view);
      applyWinterFraming(camera, framing, view);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      const hall = ringOnScreen(
        camera,
        view,
        settlementRadius(FRESH, LAYOUT.buildableRadius),
        0,
      );
      expect(hall.left).toBeGreaterThanOrEqual(crisisPanelReach(view));
      expect(hall.right).toBeLessThanOrEqual(view.width);
      expect(hall.top).toBeGreaterThanOrEqual(0);
      expect(hall.bottom).toBeLessThanOrEqual(view.height);
    });
  }

  /**
   * THE FRAMING IS THE ONLY THING THAT MOVED, and clearing it is a full undo.
   *
   * This is what makes the fix free for the player: the pan, the zoom and the heading they had
   * are still there when the winter ends, because nothing but the projection was ever touched.
   * Asserted as "the matrix comes back", which is the strongest form of it.
   */
  it("restores the exact projection it started from when the framing is cleared", () => {
    const camera = sceneCamera(LAPTOP);
    const before = camera.projectionMatrix.toArray();
    const framing = winterFraming({
      view: LAPTOP,
      fitRadius: CITY_RADIUS,
      distance: LAYOUT.cameraDistance,
      fov: FOV,
    });
    applyWinterFraming(camera, framing, LAPTOP);
    camera.updateProjectionMatrix();
    expect(
      camera.projectionMatrix.toArray(),
      "the framing changed nothing, so it cannot be the fix",
    ).not.toEqual(before);

    applyWinterFraming(camera, null, LAPTOP);
    camera.updateProjectionMatrix();
    expect(camera.projectionMatrix.toArray()).toEqual(before);
  });

  /** The aspect ratio survives the zoom, so nothing is stretched while the crisis is on. */
  it("does not distort the picture", () => {
    const plain = sceneCamera(LAPTOP);
    const { camera } = framedCamera(LAPTOP);
    // A unit square on the ground keeps its screen proportions: the width and the height of its
    // projection scale by the same factor.
    const measure = (cam: THREE.PerspectiveCamera) => {
      const a = new THREE.Vector3(-5, 0, 0).project(cam);
      const b = new THREE.Vector3(5, 0, 0).project(cam);
      const c = new THREE.Vector3(0, 0, -5).project(cam);
      const d = new THREE.Vector3(0, 0, 5).project(cam);
      return {
        across: Math.abs(b.x - a.x) * LAPTOP.width,
        along: Math.abs(d.y - c.y) * LAPTOP.height,
      };
    };
    const before = measure(plain);
    const after = measure(camera);
    expect(after.across / before.across).toBeCloseTo(after.along / before.along, 2);
  });

  /**
   * PHONE WIDTH IS REFUSED, and that is the ruling rather than an oversight: there the panel is
   * one full-width 76vh bottom sheet in every phase, because half of 460px is narrower than the
   * rail the lead threw out. So there is no strip beside it at all, and a frame slid into one
   * would show a speck over a sheet.
   */
  it("asks for no framing at phone width, where there is no strip to frame into", () => {
    expect(
      winterFraming({
        view: PHONE,
        fitRadius: CITY_RADIUS,
        distance: LAYOUT.cameraDistance,
        fov: FOV,
      }),
    ).toBeNull();
  });

  /**
   * AND JUST ABOVE IT, where the side panel is real but the strip it leaves cannot hold a spread
   * settlement even at the furthest dolly the game allows. This is the refusal's own premise: it
   * has a live branch, and it is not merely the phone-width early return wearing a second name.
   */
  it("asks for no framing when the strip beside the panel is too narrow", () => {
    const narrow = { width: 600, height: 900 } as const;
    expect(crisisPanelReach(narrow)).toBeLessThan(narrow.width);
    expect(
      winterFraming({
        view: narrow,
        fitRadius: CITY_RADIUS,
        distance: LAYOUT.cameraDistance,
        fov: FOV,
      }),
    ).toBeNull();
    // ...and it is the SETTLEMENT's size that refuses it, not the viewport: a fresh island at the
    // same width is framed. Otherwise this would be a hidden width threshold.
    expect(
      winterFraming({
        view: narrow,
        fitRadius: settlementRadius(FRESH, LAYOUT.buildableRadius),
        distance: LAYOUT.cameraDistance,
        fov: FOV,
      }),
    ).not.toBeNull();
  });

  it("asks for no framing before the canvas has a size", () => {
    for (const view of [
      { width: 0, height: 0 },
      { width: 1440, height: 0 },
    ] as const) {
      expect(
        winterFraming({
          view,
          fitRadius: CITY_RADIUS,
          distance: LAYOUT.cameraDistance,
          fov: FOV,
        }),
      ).toBeNull();
    }
  });

  /**
   * The closed form in `worldToPx` against a real projection, because everything above rests on it
   * and a formula wrong by a third would still produce a self-consistent set of passing assertions.
   * Perspective makes the near half of the board read larger than the far half, which the closed
   * form ignores; this is how much that costs, on BOTH axes, because the side panel made the
   * horizontal one load-bearing.
   */
  it("estimates the span within a few percent of the real projection", () => {
    const view = LAPTOP;
    const ground = ringOnScreen(sceneCamera(view), view, CITY_RADIUS, 0);
    const frustum = 2 * LAYOUT.cameraDistance * Math.tan((FOV * Math.PI) / 360);
    const elevation = Math.PI / 2 - VILLAGE_CAMERA.polarAngle;
    const scale = view.height / frustum;

    const closedAcross = 2 * CITY_RADIUS * scale;
    const realAcross = ground.right - ground.left;
    expect(Math.abs(closedAcross - realAcross) / realAcross).toBeLessThan(0.08);

    const closedDown = 2 * CITY_RADIUS * Math.sin(elevation) * scale;
    const realDown = ground.bottom - ground.top;
    expect(Math.abs(closedDown - realDown) / realDown).toBeLessThan(0.08);

    // AND THE HORIZONTAL EXTENT IS THE BIGGER OF THE TWO, which is the asymmetry the whole side
    // layout turns on: the tilt foreshortens a ground extent along the view direction and leaves
    // one across it alone, so a disc reads wider than it is tall and a panel that takes width is
    // taking from the axis with slack in it.
    expect(realAcross).toBeGreaterThan(realDown * 1.2);
  });

  /**
   * **THE ROOFLINE WIDENS BOTH AXES, AND THE TWO NUMBERS THE FIT USES FOR IT ARE PINNED HERE.**
   *
   * This is the assertion that caught the bug. The fit's first version allowed for the roofline
   * vertically only, on the reasoning that a roof is drawn above its own footprint and never beside
   * it. That is true of the footprint and false of the PROJECTION: raising the ring by `h` scales it
   * about the camera's nadir, which moves its left edge left. At 1440x900 that is 58 pixels of
   * settlement straight behind a left-hand panel, which no other test here would have found —
   * "clear of the panel" was measured with the same wrong extent it was fitted against.
   *
   * `ROOFLINE_SPREAD_ACROSS` and `ROOFLINE_SPREAD_DOWN` cannot be closed in algebra (see their
   * docblock), so they are calibrated constants, and a calibrated constant needs a tripwire in both
   * directions: SAFE, or the fit under-states the extent and the settlement goes behind the panel
   * again; and TIGHT, or the fit buys headroom in the one currency the lead is objecting about.
   * Checked at both viewports, because a ratio that held at one and not the other would be a
   * coincidence rather than a geometric fact.
   */
  it("allows for what the roofline really does to the extent, on both axes", () => {
    for (const view of [LAPTOP, SHORT_LAPTOP] as const) {
      const label = `${view.width}x${view.height}`;
      const ground = ringOnScreen(sceneCamera(view), view, CITY_RADIUS, 0);
      const withRoof = ringOnScreen(sceneCamera(view), view);

      // THE DEFECT, AS THE PREMISE: the roofline moves the LEFT edge, and by a real amount.
      expect(
        ground.left - withRoof.left,
        `the roofline does not widen the settlement sideways at ${label}, so the across allowance is unnecessary`,
      ).toBeGreaterThan(20);
      expect(withRoof.top).toBeLessThan(ground.top);
      // It cannot push anything DOWN: a roof is above its own base, so the bottom edge is the
      // ground's. That is the half of the original reasoning which was right.
      expect(withRoof.bottom).toBeCloseTo(ground.bottom, 6);

      const across = (withRoof.right - withRoof.left) / (ground.right - ground.left);
      const down = (withRoof.bottom - withRoof.top) / (ground.bottom - ground.top);

      expect(
        ROOFLINE_SPREAD_ACROSS,
        `the fit under-states the roofline across at ${label}: the real spread is ${across.toFixed(4)}`,
      ).toBeGreaterThanOrEqual(across);
      expect(
        ROOFLINE_SPREAD_DOWN,
        `the fit under-states the roofline down at ${label}: the real spread is ${down.toFixed(4)}`,
      ).toBeGreaterThanOrEqual(down);
      // AND TIGHT: no more than a percentage point of conservatism, which is a percentage point of
      // the island's size.
      expect(ROOFLINE_SPREAD_ACROSS - across, label).toBeLessThan(0.01);
      expect(ROOFLINE_SPREAD_DOWN - down, label).toBeLessThan(0.01);
    }
  });

  /**
   * THE ROOFLINE THE FIT ALLOWS FOR IS ERA ONE'S OWN, NOT `MAX_BUILD_HEIGHT`.
   *
   * The cap is 24u and nothing in era one comes near it — `worldLayout.ts` records the tallest,
   * the Lookout, at 9.769u on its 2x2 plot and says in as many words that the cap "is not binding
   * for any D1 building today". Fitting against the cap would have cost another 40% of zoom as
   * headroom for a building that does not exist, which is exactly the kind of conservatism that
   * hands a reviewer a speck; fitting against nothing would clip the Lookout's roof.
   */
  it("allows for era one's tallest building and not for the height cap", () => {
    expect(WINTER_ROOFLINE_ALLOWANCE).toBeGreaterThan(9.769);
    expect(WINTER_ROOFLINE_ALLOWANCE).toBeLessThan(MAX_BUILD_HEIGHT / 2);
  });
});
