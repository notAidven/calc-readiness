import { ERA_SEQUENCE } from "@cr/skill-graph";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { islandGround } from "../islandGround";
import { eraCityLayout } from "../islandLand";
import {
  BUILDABLE_RADIUS,
  CAMERA_DISTANCE_RATIO,
  type CityLayout,
  computeCityLayout,
  GRASS_OVER_BUILDABLE,
  ISLAND_GRASS_RADIUS,
  MAX_BUILD_HEIGHT,
} from "../worldLayout";
import { cityFrameFor, intrusionPanelReach } from "./CityScene";
import {
  applyCityFraming,
  FRAME_MARGIN,
  groundPointOnScreen,
  groundRingOnScreen,
  ISLAND_SHORE_REACH,
  islandFitRadius,
  islandFraming,
  PHONE_CITY_INSETS,
  PHONE_FRAME_MAX_ZOOM,
  uprightOnScreen,
} from "./cityFraming";
import { depthResolutionAt, maxViewDistance, VILLAGE_CAMERA } from "./orbitCamera";
import { PERSON_HEIGHT } from "./personFigure";
import { roadSurfaceTops } from "./Roads";
import { buildIslandGroup, ISLAND_LAGOON_MESH, WATERLINE_Y } from "./StarterIsland";
import { winterFraming } from "./winterFraming";

/**
 * **DOES THE ISLAND FIT THE FRAME — measured through the projection the scene really builds.**
 *
 * The lead found the island overflowing his 1024x580 window with only the top arc of shoreline
 * in view. `cityFraming.browser.test.tsx` is the picture, on a real GPU, and it is the evidence
 * that answers the complaint; this file is the half that can run in CI on every commit, and it
 * is where the arithmetic behind the picture is pinned.
 *
 * Every claim comes with its own premise, because "the island is inside the frame" is also true
 * of a camera so far out that the island is a speck, and trivially true of a camera pointed at
 * nothing. So each test states what the DEFAULT framing does first — the defect — and then what
 * the fix does, and there is a ceiling on the widening beside every floor.
 */

const FOV = 32;
const LAYOUT = eraCityLayout("prehistoric");

/** The lead's window, a roomy laptop, a big desktop, and the page inside the lead's window. */
const SHORT_LAPTOP = { width: 1024, height: 580 } as const;
const LAPTOP = { width: 1440, height: 900 } as const;
const DESKTOP = { width: 1920, height: 1080 } as const;
/** 1024x580 is the WINDOW; the page inside it is about 507px once the browser takes its chrome. */
const SHORT_PAGE = { width: 1024, height: 507 } as const;
const VIEWPORTS = [SHORT_LAPTOP, SHORT_PAGE, LAPTOP, DESKTOP] as const;
const PHONE = { width: 390, height: 580 } as const;
const PHONE_CONTENT = { left: 8, right: 382, top: 104, bottom: 452 } as const;

/** Era one's tallest building, as `worldLayout.ts` records the Lookout rendering on its 2x2. */
const ERA_ONE_ROOFLINE = 9.769;

interface ScreenBox {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

/**
 * The camera `CityScene` mounts, at the framing it mounts it.
 *
 * Rebuilt here rather than imported because `initialCameraPosition` is private to the scene;
 * both are derived from `VILLAGE_CAMERA` and the layout, and the distance is asserted below to
 * be the layout's. Same shape as `winterFraming.test.ts`'s `sceneCamera`, deliberately, so the
 * two files measure the same camera.
 */
function sceneCamera(
  view: { readonly width: number; readonly height: number },
  layout: CityLayout = LAYOUT,
) {
  const [tx, ty, tz] = layout.cameraTarget;
  const az = VILLAGE_CAMERA.azimuthAngle;
  const polar = VILLAGE_CAMERA.polarAngle;
  const r = layout.cameraDistance;
  const s = Math.sin(polar) * r;
  const camera = new THREE.PerspectiveCamera(
    FOV,
    view.width / view.height,
    VILLAGE_CAMERA.nearPlane,
    layout.islandRadius * VILLAGE_CAMERA.farPlaneRatio,
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

/** Where a ground ring really lands, sampled all the way round a real projection. */
function projectedRing(
  camera: THREE.PerspectiveCamera,
  view: { readonly width: number; readonly height: number },
  radius: number,
  samples = 4096,
): ScreenBox {
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  const point = new THREE.Vector3();
  for (let step = 0; step < samples; step += 1) {
    const angle = (step / samples) * Math.PI * 2;
    point.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius).project(camera);
    const screenY = ((1 - point.y) / 2) * view.height;
    const screenX = ((point.x + 1) / 2) * view.width;
    top = Math.min(top, screenY);
    bottom = Math.max(bottom, screenY);
    left = Math.min(left, screenX);
    right = Math.max(right, screenX);
  }
  return { top, bottom, left, right };
}

/** The scene camera with the default framing applied, exactly as `CityFrame` applies it. */
function framedCamera(
  view: { readonly width: number; readonly height: number },
  layout: CityLayout = LAYOUT,
) {
  const camera = sceneCamera(view, layout);
  const framing = islandFraming({ view, layout, fov: FOV });
  expect(framing, `no framing at ${view.width}x${view.height}`).not.toBeNull();
  applyCityFraming(camera, framing, view);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return { camera, framing };
}

describe("the closed form is the projection, not an estimate of it", () => {
  /**
   * EVERYTHING BELOW RESTS ON `groundRingOnScreen`, and an exact form that is exactly wrong
   * produces a perfectly self-consistent set of passing assertions. `winterFraming.ts` estimates
   * its span and pins the error at 8%; this one solves the extrema, so it is checked to six
   * decimal places against a 4096-point projection instead of to a percentage.
   *
   * Both extrema are non-obvious and both are checked: the vertical one is the ring's near and
   * far POLES (which is why the projection is so far off-centre), and the horizontal one is the
   * TANGENT point rather than the ring's +-90 degree point.
   */
  it("agrees with a real THREE.PerspectiveCamera at every viewport and radius", () => {
    for (const view of VIEWPORTS) {
      for (const radius of [22, 30, 34, 46, 73]) {
        const real = projectedRing(sceneCamera(view), view, radius);
        const closed = groundRingOnScreen({
          view,
          radius,
          distance: LAYOUT.cameraDistance,
          targetY: LAYOUT.cameraTarget[1],
          fov: FOV,
        });
        const at = `${view.width}x${view.height} r=${radius}`;
        // A hundredth of a CSS pixel, which is the 4096-point sample's OWN resolution near a
        // turning point rather than a tolerance chosen to pass: three builds its projection
        // matrix in float32, so exact agreement is not available to assert.
        for (const [edge, a, b] of [
          ["top", closed.top, real.top],
          ["bottom", closed.bottom, real.bottom],
          ["left", closed.left, real.left],
          ["right", closed.right, real.right],
        ] as const) {
          expect(Math.abs(a - b), `${at} ${edge}`).toBeLessThan(0.01);
        }
      }
    }
  });

  /**
   * **AND SO DO THE TWO FORMS THE CROWD'S FRAMING IS BUILT ON, which this file's own docblocks
   * claimed were pinned here before they were.**
   *
   * `uprightOnScreen` and `groundPointOnScreen` both say *"`cityFraming.test.ts` pins it against
   * a real `THREE.PerspectiveCamera`"*. They were carried forward from #453 with that sentence
   * and without the assertion, which is precisely the shape of guard the tree has been bitten by
   * before — a claim about coverage that nothing covered. Both are now measured the same way
   * `groundRingOnScreen` is: against three's own `project()`, to a hundredth of a CSS pixel.
   *
   * `uprightOnScreen` is worth pinning rather than trusting for two reasons its own docblock
   * gives and neither of which is obvious: it is NOT linear in the height, and it is NOT
   * monotonic in the distance from the island's centre. Both are exercised below — a person's
   * 1.30u against the Lookout's 9.769u, and a ground offset either side of the peak.
   */
  it("pins the upright and off-centre forms against the same camera", () => {
    for (const view of VIEWPORTS) {
      const camera = sceneCamera(view);
      const away = {
        x: -Math.sin(VILLAGE_CAMERA.azimuthAngle),
        z: -Math.cos(VILLAGE_CAMERA.azimuthAngle),
      };
      const point = new THREE.Vector3();
      const screenY = (world: THREE.Vector3) =>
        ((1 - world.clone().project(camera).y) / 2) * view.height;

      for (const height of [1, PERSON_HEIGHT, 3.096, ERA_ONE_ROOFLINE]) {
        for (const groundOffset of [-16, 0, 12, 24]) {
          const at = `${view.width}x${view.height} h=${height} out=${groundOffset}`;
          const base = LAYOUT.cameraTarget;
          const foot = point
            .set(base[0] + away.x * groundOffset, 0, base[2] + away.z * groundOffset)
            .clone();
          const crown = foot.clone().setY(height);
          const real = screenY(foot) - screenY(crown);
          const closed = uprightOnScreen({
            view,
            height,
            distance: LAYOUT.cameraDistance,
            targetY: LAYOUT.cameraTarget[1],
            fov: FOV,
            groundOffset,
          });
          expect(Math.abs(real - closed), at).toBeLessThan(0.01);
        }
      }

      // And an arbitrary place on the ground, at every heading, because the gathering ground is
      // on ONE side of the island and a form that only worked at the default azimuth would put
      // the ceremony's frame on empty grass for any player who had dragged.
      for (let step = 0; step < 8; step += 1) {
        const azimuth = VILLAGE_CAMERA.azimuthAngle + (step / 8) * Math.PI * 2;
        const turned = sceneCamera(view);
        const polar = VILLAGE_CAMERA.polarAngle;
        const s = Math.sin(polar) * LAYOUT.cameraDistance;
        turned.position.set(
          LAYOUT.cameraTarget[0] + s * Math.sin(azimuth),
          LAYOUT.cameraTarget[1] + Math.cos(polar) * LAYOUT.cameraDistance,
          LAYOUT.cameraTarget[2] + s * Math.cos(azimuth),
        );
        turned.lookAt(
          LAYOUT.cameraTarget[0],
          LAYOUT.cameraTarget[1],
          LAYOUT.cameraTarget[2],
        );
        turned.updateMatrixWorld(true);
        turned.updateProjectionMatrix();
        for (const place of [
          { x: 0, z: 0 },
          { x: 12, z: -7 },
          { x: -18, z: 4 },
          { x: 3, z: 21 },
        ]) {
          const world = new THREE.Vector3(
            LAYOUT.cameraTarget[0] + place.x,
            0,
            LAYOUT.cameraTarget[2] + place.z,
          ).project(turned);
          const closed = groundPointOnScreen({
            view,
            point: place,
            distance: LAYOUT.cameraDistance,
            targetY: LAYOUT.cameraTarget[1],
            fov: FOV,
            azimuth,
          });
          const at = `${view.width}x${view.height} az=${step} (${place.x},${place.z})`;
          expect(
            Math.abs(((world.x + 1) / 2) * view.width - closed.x),
            `${at} x`,
          ).toBeLessThan(0.01);
          expect(
            Math.abs(((1 - world.y) / 2) * view.height - closed.y),
            `${at} y`,
          ).toBeLessThan(0.01);
        }
      }
    }
  });

  /**
   * The two counter-intuitive properties `uprightOnScreen`'s docblock states, asserted so they
   * are measurements rather than remarks — and so a later "simplification" to `height ×
   * pxPerUnit` fails here instead of silently under-reading every tall thing on the island.
   */
  it("is neither linear in the height nor monotonic in the distance from the centre", () => {
    const at = (height: number, groundOffset = 0) =>
      uprightOnScreen({
        view: SHORT_LAPTOP,
        height,
        distance: LAYOUT.cameraDistance,
        targetY: LAYOUT.cameraTarget[1],
        fov: FOV,
        groundOffset,
      });
    // A tall thing projects LARGER than a per-unit scale predicts, because its top is nearer.
    const perUnit = at(1);
    expect(at(PERSON_HEIGHT) / (perUnit * PERSON_HEIGHT)).toBeCloseTo(1, 2);
    expect(at(ERA_ONE_ROOFLINE) / (perUnit * ERA_ONE_ROOFLINE)).toBeGreaterThan(1.05);
    // ...and the peak is a little way out from the middle, so a figure at the centre is the
    // CONSERVATIVE reading rather than the smallest one.
    expect(at(PERSON_HEIGHT, 14)).toBeGreaterThan(at(PERSON_HEIGHT, 0));
    expect(at(PERSON_HEIGHT, 30)).toBeLessThan(at(PERSON_HEIGHT, 14));
  });

  it("puts the horizontal extreme past the ring's own quarter points", () => {
    // The premise for using the tangent solution rather than the obvious one: a fit sized on
    // the +-90 degree points would under-state the disc's width and clip its sides.
    const view = LAPTOP;
    const camera = sceneCamera(view);
    const quarter = new THREE.Vector3(34, 0, 0).project(camera);
    const quarterX = ((quarter.x + 1) / 2) * view.width;
    const closed = groundRingOnScreen({
      view,
      radius: 34,
      distance: LAYOUT.cameraDistance,
      targetY: LAYOUT.cameraTarget[1],
      fov: FOV,
    });
    expect(closed.right).toBeGreaterThan(quarterX);
  });
});

describe("the island does not fit the frame, and it never did at any viewport", () => {
  /**
   * **THE DEFECT, AS THE PREMISE.** Measured on the unframed camera, so it fails the day the
   * default framing stops being broken — which is the only thing that makes the fix below
   * worth asserting.
   */
  it("runs off the bottom of the canvas at every viewport", () => {
    for (const view of VIEWPORTS) {
      const island = projectedRing(
        sceneCamera(view),
        view,
        islandFitRadius(LAYOUT.islandRadius),
      );
      const at = `${view.width}x${view.height}`;
      expect(island.bottom, `the island already fits at ${at}`).toBeGreaterThan(
        view.height,
      );
      // And by a quarter of the screen, not by a hair.
      expect(island.bottom - view.height, at).toBeGreaterThan(view.height * 0.2);
      // ...while leaving sky at the top, which is what the lift is for.
      expect(island.top, at).toBeGreaterThan(0);
    }
  });

  /**
   * **AND IT IS NOT A SHORT-VIEWPORT BUG**, which is the finding that decides the mechanism. A
   * perspective camera's vertical frustum is a fixed ANGLE, so the world extent that maps onto
   * the viewport's height is the same however many pixels tall it is — the overflow is
   * therefore the same FRACTION at 1024x580 and at 1920x1080, and a fix that only widened on
   * short screens would be fixing the wrong thing.
   */
  it("overflows by the same fraction of the height whatever the viewport", () => {
    const shares = VIEWPORTS.map((view) => {
      const island = projectedRing(
        sceneCamera(view),
        view,
        islandFitRadius(LAYOUT.islandRadius),
      );
      return (island.bottom - island.top) / view.height;
    });
    for (const share of shares) {
      expect(share).toBeCloseTo(shares[0] ?? 0, 6);
    }
    // 143% of the viewport's height, so a quarter of the island is off the screen.
    expect(shares[0] ?? 0).toBeGreaterThan(1.4);
  });

  /**
   * **AND THE PART A PLAYER BUILDS ON WOULD COST NO WIDENING AT ALL**, which is the premise for
   * fitting the whole drawn island instead of it. The buildable disc's SPAN already sits inside
   * the viewport — it is only the off-centring that puts its near rim below the bottom edge — so
   * "the buildable area plus context" is bought by the lift alone and leaves every pixel of
   * shoreline off the screen. It is the cheap rule, and it certifies the frame being complained
   * about.
   */
  it("would need no widening to seat the part a player builds on, which is why the shore is the rule", () => {
    for (const view of VIEWPORTS) {
      const at = `${view.width}x${view.height}`;
      const buildable = projectedRing(sceneCamera(view), view, LAYOUT.buildableRadius);
      expect(buildable.bottom - buildable.top, at).toBeLessThan(
        view.height * (1 - 2 * FRAME_MARGIN),
      );
      expect(buildable.bottom, at).toBeGreaterThan(view.height);
    }
  });
});

describe("the whole island is inside the canvas once it is framed", () => {
  for (const view of VIEWPORTS) {
    const at = `${view.width}x${view.height}`;

    it(`puts the shore inside the frame on all four sides at ${at}`, () => {
      const { camera } = framedCamera(view);
      const island = projectedRing(camera, view, islandFitRadius(LAYOUT.islandRadius));
      expect(island.top, `the island is cut off at the top at ${at}`).toBeGreaterThan(0);
      expect(
        island.bottom,
        `${Math.round(island.bottom - view.height)}px of island is below the bottom edge at ${at}`,
      ).toBeLessThan(view.height);
      expect(island.left, `the island is cut off on the left at ${at}`).toBeGreaterThan(0);
      expect(island.right, `the island is cut off on the right at ${at}`).toBeLessThan(
        view.width,
      );
    });

    it(`keeps a band of lagoon around it, and only a band, at ${at}`, () => {
      const { camera } = framedCamera(view);
      const island = projectedRing(camera, view, islandFitRadius(LAYOUT.islandRadius));
      const margins = [
        island.top,
        view.height - island.bottom,
        island.left,
        view.width - island.right,
      ];
      // The binding axis gets exactly the margin and no more, so the widening is not buying
      // itself headroom: the tightest margin is the one that was paid for.
      const tightest = Math.min(...margins);
      const binding = Math.min(view.width, view.height) * FRAME_MARGIN;
      expect(tightest, at).toBeGreaterThanOrEqual(binding * 0.98);
      expect(tightest, at).toBeLessThan(binding * 1.02);
    });

    /**
     * AND THE ISLAND IS STILL BIG, which is the objection every other assertion here would let
     * through. *"Too zoomed out to see the actual island"* was the lead's verdict on a picture
     * that satisfied its own fit perfectly, so the fit owes a ceiling as well as a floor.
     */
    it(`hands the island most of the screen at ${at}`, () => {
      const { camera, framing } = framedCamera(view);
      const grass = projectedRing(camera, view, LAYOUT.islandRadius);
      expect(
        (grass.bottom - grass.top) / view.height,
        `the grass disc reads only ${Math.round(((grass.bottom - grass.top) / view.height) * 100)}% of the height at ${at}`,
      ).toBeGreaterThan(0.75);
      expect(framing?.zoom ?? 0).toBeGreaterThan(1);
      expect(
        framing?.zoom ?? 0,
        `the island is being shrunk to ${Math.round(100 / (framing?.zoom ?? 1))}% at ${at}`,
      ).toBeLessThan(1.6);
    });
  }

  /**
   * **THE LIFT IS WHAT MAKES THE ZOOM AFFORDABLE, and this is the measurement that earns it.**
   *
   * Widening about the SCREEN's centre has to buy back the island's off-centredness twice over.
   * Both numbers are computed here from the same projection, so the comparison is a measurement
   * rather than a recollection.
   */
  it("costs a quarter less than widening about the middle of the screen would", () => {
    for (const view of VIEWPORTS) {
      const island = projectedRing(
        sceneCamera(view),
        view,
        islandFitRadius(LAYOUT.islandRadius),
      );
      const half = view.height / 2;
      const usable = 1 - 2 * FRAME_MARGIN;
      const withoutLift = Math.max(
        (island.bottom - half) / (half * usable),
        (half - island.top) / (half * usable),
      );
      const framing = islandFraming({ view, layout: LAYOUT, fov: FOV });
      const at = `${view.width}x${view.height}`;
      expect(withoutLift, at).toBeGreaterThan(2);
      expect(framing?.zoom ?? 0, at).toBeLessThan(withoutLift * 0.76);
      // And the lift really is a lift: the island sits BELOW the middle of the screen, so the
      // picture is pulled up rather than pushed down.
      expect(framing?.lift ?? 0, at).toBeGreaterThan(0);
    }
  });

  /** The aspect ratio survives the widening, so nothing is stretched. */
  it("does not distort the picture", () => {
    const view = LAPTOP;
    const measure = (cam: THREE.PerspectiveCamera) => {
      const a = new THREE.Vector3(-5, 0, 0).project(cam);
      const b = new THREE.Vector3(5, 0, 0).project(cam);
      const c = new THREE.Vector3(0, 0, -5).project(cam);
      const d = new THREE.Vector3(0, 0, 5).project(cam);
      return {
        across: Math.abs(b.x - a.x) * view.width,
        along: Math.abs(d.y - c.y) * view.height,
      };
    };
    const before = measure(sceneCamera(view));
    const after = measure(framedCamera(view).camera);
    expect(after.across / before.across).toBeCloseTo(after.along / before.along, 2);
  });

  /**
   * CLEARING IT IS A FULL UNDO, which is what makes the framing free for the player: nothing
   * but the projection was ever touched, so the pan, zoom and heading they had are still theirs.
   */
  it("restores the exact projection it started from when the framing is cleared", () => {
    const camera = sceneCamera(LAPTOP);
    const before = camera.projectionMatrix.toArray();
    applyCityFraming(
      camera,
      islandFraming({ view: LAPTOP, layout: LAYOUT, fov: FOV }),
      LAPTOP,
    );
    camera.updateProjectionMatrix();
    expect(
      camera.projectionMatrix.toArray(),
      "the framing changed nothing, so it cannot be the fix",
    ).not.toEqual(before);

    applyCityFraming(camera, null, LAPTOP);
    camera.updateProjectionMatrix();
    expect(camera.projectionMatrix.toArray()).toEqual(before);
  });

  it("asks for no framing before the canvas has a size", () => {
    for (const view of [
      { width: 0, height: 0 },
      { width: 1440, height: 0 },
    ] as const) {
      expect(islandFraming({ view, layout: LAYOUT, fov: FOV })).toBeNull();
    }
  });
});

describe("the phone camera frames content between the compact HUD rails", () => {
  it("keeps every era's island identity inside the 390x580 live-city region", () => {
    expect(ERA_SEQUENCE).toHaveLength(10);
    for (const era of ERA_SEQUENCE) {
      const layout = eraCityLayout(era.id);
      const { camera } = framedCamera(PHONE, layout);
      const island = projectedRing(camera, PHONE, islandFitRadius(layout.islandRadius));
      const grass = projectedRing(camera, PHONE, layout.islandRadius);
      expect(
        island.left,
        `${era.id} runs under the left phone rail`,
      ).toBeGreaterThanOrEqual(PHONE_CONTENT.left);
      expect(island.right, `${era.id} runs under the right phone rail`).toBeLessThanOrEqual(
        PHONE_CONTENT.right,
      );
      expect(
        island.top,
        `${era.id} runs under the phone status rail`,
      ).toBeGreaterThanOrEqual(PHONE_CONTENT.top);
      expect(island.bottom, `${era.id} runs under the phone controls`).toBeLessThanOrEqual(
        PHONE_CONTENT.bottom,
      );
      expect(
        grass.right - grass.left,
        `${era.id} was shrunk until its authored landforms cannot read`,
      ).toBeGreaterThan(260);
    }
  });
});

describe("the camera follows a growing island, which is the point of the layout taking one", () => {
  /**
   * **THE DEFECT THE LAYOUT CHANGE FIXES**, stated as the thing that is now possible: the
   * distance is the radius's, so asking for a bigger island gets a proportionally further
   * camera. It was written that way already and closed over the module constant, so nothing
   * could drive it.
   */
  it("scales the default dolly with the radius it is laying out for", () => {
    for (const radius of [ISLAND_GRASS_RADIUS, 35, 46, 69]) {
      const layout = computeCityLayout(radius);
      expect(layout.islandRadius).toBe(radius);
      expect(layout.cameraDistance).toBeCloseTo(radius * CAMERA_DISTANCE_RATIO, 9);
    }
    expect(eraCityLayout("prehistoric").islandRadius).toBe(ISLAND_GRASS_RADIUS);
  });

  /**
   * ⚑ THE DISC NOW FOLLOWS THE ISLAND AND THE LAGOON STILL DOES NOT, WHICH USED TO BE ONE
   * SENTENCE ABOUT BOTH.
   *
   * This guard read *"leaves the buildable disc and the lagoon on their own authored
   * constants"*, on §5.1 / D-ERA26's reasoning that deriving either from the grass radius would
   * put a number on screen no era ratified. Half of that survives and half of it was the defect:
   * a disc pinned at era one's 22 while the drawn land reached 46 is exactly *"the island got
   * bigger and you cannot build on the new part"*, and a four-age catch-up roster of 21 seated
   * 18 because of it.
   *
   * The disc is not a number this file invents either way. `islandLand.ts` derives an era's
   * grass by ADDING `GRASS_OVER_BUILDABLE` to that era's authored budget, so subtracting the
   * same margin is that derivation read backwards — which is why the two meet exactly at every
   * era the growth ceiling does not clamp, asserted next door in `islandLand.test.ts`.
   *
   * **The lagoon is untouched**, and that half is asserted here rather than assumed, because a
   * later tidy-up making it proportional is still the defect §5.1 named.
   */
  it("grows the buildable disc with the island and leaves the lagoon alone", () => {
    const grown = computeCityLayout(69);
    expect(grown.seaRadius).toBe(LAYOUT.seaRadius);

    // The disc moved, and it moved by exactly the margin era one keeps between its last legal
    // cell and its shore — so it is a re-reading of the land and not a second opinion about it.
    expect(grown.buildableRadius).toBeGreaterThan(LAYOUT.buildableRadius);
    expect(grown.buildableRadius).toBe(69 - GRASS_OVER_BUILDABLE);
    expect(LAYOUT.buildableRadius).toBe(ISLAND_GRASS_RADIUS - GRASS_OVER_BUILDABLE);

    // MONOTONE and FLOORED, which is what makes a persisted transform safe: the disc under a
    // saved placement can widen and can never come back below era one's.
    let previous = 0;
    for (const radius of [ISLAND_GRASS_RADIUS, 35, 46, 69]) {
      const disc = computeCityLayout(radius).buildableRadius;
      expect(disc).toBeGreaterThanOrEqual(previous);
      expect(disc).toBeGreaterThanOrEqual(BUILDABLE_RADIUS);
      previous = disc;
    }
    // And an island SMALLER than era one's does not shrink it, which is the floor doing work
    // rather than decorating the expression.
    expect(computeCityLayout(12).buildableRadius).toBe(BUILDABLE_RADIUS);
  });

  /**
   * **AND THE FRAMING IS THE SAME PICTURE AT EVERY RADIUS**, which is what "for free" means. A
   * disc seen from a proportionally further camera projects identically, so nothing here has to
   * be re-tuned when the island grows. The only term that does not scale is the shore's absolute
   * four units of beach, which is why a bigger island needs slightly LESS widening rather than
   * exactly the same.
   */
  it("frames a grown island to the same picture, without re-tuning anything", () => {
    for (const view of [SHORT_LAPTOP, LAPTOP] as const) {
      const eraOne = framedCamera(view);
      const eraOneGrass = projectedRing(eraOne.camera, view, LAYOUT.islandRadius);
      for (const radius of [35, 46, 69]) {
        const layout = computeCityLayout(radius);
        const grown = framedCamera(view, layout);
        const at = `grass ${radius} at ${view.width}x${view.height}`;

        // The whole island is in frame, exactly as era one's is.
        const island = projectedRing(grown.camera, view, islandFitRadius(radius));
        expect(island.top, at).toBeGreaterThan(0);
        expect(island.bottom, at).toBeLessThan(view.height);
        expect(island.left, at).toBeGreaterThan(0);
        expect(island.right, at).toBeLessThan(view.width);

        // ...and it reads the same size on screen, within the beach's share of the disc.
        const grass = projectedRing(grown.camera, view, radius);
        const ratio = (grass.bottom - grass.top) / (eraOneGrass.bottom - eraOneGrass.top);
        expect(ratio, at).toBeGreaterThan(1);
        expect(ratio, at).toBeLessThan(1.1);
      }
    }
  });

  /**
   * AND THE DEPTH RANGE FOLLOWS TOO, rather than being left behind at era one's numbers. Both
   * are derived from `cameraDistance`, which is now derived from the radius — checked rather
   * than assumed, because "it is derived so it follows" is exactly the reasoning that produced
   * a scaling nothing could drive.
   */
  it("keeps the far plane clear of the worst view distance at every radius", () => {
    for (const radius of [ISLAND_GRASS_RADIUS, 35, 46, 69]) {
      const layout = computeCityLayout(radius);
      const worst = maxViewDistance(
        layout.cameraDistance,
        layout.seaRadius,
        layout.islandRadius * 0.72,
      );
      const far = layout.islandRadius * VILLAGE_CAMERA.farPlaneRatio;
      expect(far, `grass ${radius}`).toBeGreaterThan(worst);
      // A floor: the worst case really does grow with the island, so the check above is not
      // passing because nothing moved.
      expect(worst, `grass ${radius}`).toBeGreaterThan(radius * 6);
    }
  });
});

describe("the widening has a phone-specific projection cap", () => {
  /**
   * The cap is `maxDistanceRatio` — the widest view of the island the game is willing to show,
   * which is exactly what the player's own zoom-out control reaches. Everything from landscape
   * down to about 3:4 portrait fits whole without phone adaptation. A narrower phone takes a
   * wider projection inside the HUD-safe content region; the camera itself never dollies.
   */
  it("fits whole from landscape down to about a 3:4 portrait window", () => {
    for (const view of [
      { width: 1920, height: 1080 },
      { width: 1024, height: 580 },
      { width: 900, height: 900 },
      { width: 800, height: 1000 },
      { width: 760, height: 1000 },
    ] as const) {
      const { camera, framing } = framedCamera(view);
      const island = projectedRing(camera, view, islandFitRadius(LAYOUT.islandRadius));
      const at = `${view.width}x${view.height}`;
      expect(framing?.zoom ?? 0, at).toBeLessThan(VILLAGE_CAMERA.maxDistanceRatio);
      expect(island.left, at).toBeGreaterThan(0);
      expect(island.right, at).toBeLessThan(view.width);
      expect(island.bottom, at).toBeLessThan(view.height);
    }
  });

  it("fits the ruled 390x580 phone inside its live content region without shrinking identity away", () => {
    const phone = PHONE;
    const framing = islandFraming({ view: phone, layout: LAYOUT, fov: FOV });
    expect(framing?.zoom).toBeGreaterThan(VILLAGE_CAMERA.maxDistanceRatio);
    expect(framing?.zoom).toBeLessThanOrEqual(PHONE_FRAME_MAX_ZOOM);
    const { camera } = framedCamera(phone);
    const island = projectedRing(camera, phone, islandFitRadius(LAYOUT.islandRadius));
    const grass = projectedRing(camera, phone, LAYOUT.islandRadius);
    expect(island.left).toBeGreaterThanOrEqual(PHONE_CITY_INSETS.left);
    expect(island.right).toBeLessThanOrEqual(phone.width - PHONE_CITY_INSETS.right);
    expect(island.top).toBeGreaterThanOrEqual(PHONE_CITY_INSETS.top);
    expect(island.bottom).toBeLessThanOrEqual(phone.height - PHONE_CITY_INSETS.bottom);
    expect(
      grass.right - grass.left,
      "the phone fit keeps enough island width for authored landmarks",
    ).toBeGreaterThan(260);
    expect(
      camera.position.toArray(),
      "the phone region is projection-only and does not move the camera",
    ).toEqual(sceneCamera(phone).position.toArray());
  });
});

describe("the near plane's reasoning survives, because no camera moved", () => {
  /**
   * **THE ONE THING A VIEW OFFSET COULD COST THE DEPTH BUDGET, checked rather than inherited.**
   *
   * `VILLAGE_CAMERA.nearPlane` is a depth-PRECISION knob sized against a measured floor: over
   * ~12k camera states nothing solid in the built city came within 3u of the camera, and `1`
   * sits well under that so it cannot clip. A framing that DOLLIED the camera would invalidate
   * that sweep outright. A view offset does not move the camera, so every distance in it is the
   * distance it was — but it does WIDEN the frustum, and a wider frustum admits rays that were
   * outside it, so the closest VISIBLE surface can come nearer even though the closest surface
   * cannot.
   *
   * That is the number measured here, over the real island geometry plus a horizontal surface at
   * era one's tallest roofline, swept across the dolly, pan and azimuth extremes INCLUDING their
   * elastic overscroll. The steepest ray in the frustum steepens from 64.7 to 72.3 degrees below
   * horizontal, which is a few percent of range and nowhere near the floor.
   */
  const layout = LAYOUT;
  const panBound = layout.islandRadius * 0.72 * (1 + VILLAGE_CAMERA.panOverscrollRatio);
  const dollies = [
    layout.cameraDistance *
      VILLAGE_CAMERA.minDistanceRatio *
      (1 - VILLAGE_CAMERA.zoomOverscrollRatio),
    layout.cameraDistance,
    layout.cameraDistance *
      VILLAGE_CAMERA.maxDistanceRatio *
      (1 + VILLAGE_CAMERA.zoomOverscrollRatio),
  ];

  /** Every world point the sweep measures against: the real island, plus a roofline over it. */
  function solidPoints(): THREE.Vector3[] {
    const group = buildIslandGroup(
      layout,
      islandGround("prehistoric"),
      layout.islandRadius,
    );
    group.updateMatrixWorld(true);
    const points: THREE.Vector3[] = [];
    const vertex = new THREE.Vector3();
    group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const position = mesh.geometry?.getAttribute?.("position");
      if (!position) {
        return;
      }
      // Decimated: the sweep is about how close a SURFACE gets, and this island's facets are
      // world units across, so every eighth vertex bounds it to a fraction of a unit.
      for (let i = 0; i < position.count; i += 8) {
        points.push(
          vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).clone(),
        );
      }
    });
    // A roof at era one's tallest, over the whole buildable disc — the closest a building can
    // put a surface to this camera. `MAX_BUILD_HEIGHT` is a cap nothing in era one reaches and
    // is measured separately below.
    for (let x = -layout.buildableRadius; x <= layout.buildableRadius; x += 2) {
      for (let z = -layout.buildableRadius; z <= layout.buildableRadius; z += 2) {
        if (Math.hypot(x, z) <= layout.buildableRadius) {
          points.push(new THREE.Vector3(x, ERA_ONE_ROOFLINE, z));
        }
      }
    }
    return points;
  }

  /** The closest point of the scene that is inside the frustum, over every camera extreme. */
  function closestVisible(
    points: readonly THREE.Vector3[],
    view: { readonly width: number; readonly height: number },
    framed: boolean,
  ): number {
    const framing = framed ? islandFraming({ view, layout, fov: FOV }) : null;
    let closest = Number.POSITIVE_INFINITY;
    const camera = new THREE.PerspectiveCamera(
      FOV,
      view.width / view.height,
      VILLAGE_CAMERA.nearPlane,
      layout.islandRadius * VILLAGE_CAMERA.farPlaneRatio,
    );
    applyCityFraming(camera, framing, view);
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4();
    const polar = VILLAGE_CAMERA.polarAngle;
    for (const distance of dollies) {
      for (let a = 0; a < 16; a += 1) {
        const az = (a / 16) * Math.PI * 2;
        for (let p = 0; p < 8; p += 1) {
          const pan = (p / 8) * Math.PI * 2;
          const tx = Math.cos(pan) * panBound;
          const tz = Math.sin(pan) * panBound;
          const s = Math.sin(polar) * distance;
          camera.position.set(
            tx + s * Math.sin(az),
            layout.cameraTarget[1] + Math.cos(polar) * distance,
            tz + s * Math.cos(az),
          );
          camera.lookAt(tx, layout.cameraTarget[1], tz);
          camera.updateMatrixWorld(true);
          camera.updateProjectionMatrix();
          frustum.setFromProjectionMatrix(
            matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
          );
          for (const point of points) {
            if (frustum.containsPoint(point)) {
              closest = Math.min(closest, camera.position.distanceTo(point));
            }
          }
        }
      }
    }
    return closest;
  }

  it("keeps every visible surface far clear of the near plane, framed and unframed", () => {
    const points = solidPoints();
    // A floor under the sweep: an empty point set would satisfy every distance assertion.
    // 2026-08-21: prehistoric's gravel-shelf, shore-boulder-clusters, ground-scatter, scrub,
    // reed banks, and windblown camp were all deliberately removed across the day, dropping
    // this decimated vertex sample from ~2,300 to 704. The floor only needs to rule out an
    // empty/near-empty point set, not hold every prop.
    expect(points.length).toBeGreaterThan(400);
    const unframed = closestVisible(points, SHORT_LAPTOP, false);
    const framed = closestVisible(points, SHORT_LAPTOP, true);
    // The framing DOES cost something, which is why it is measured rather than argued.
    expect(framed).toBeLessThan(unframed);
    // ...and what it costs is single-digit percent, against a floor of 3u and a near plane of 1.
    expect(framed).toBeGreaterThan(unframed * 0.9);
    expect(framed, `closest visible surface is ${framed.toFixed(2)}u`).toBeGreaterThan(3);
    expect(VILLAGE_CAMERA.nearPlane).toBeLessThan(3);
  });

  /**
   * **AND THE DOLLY ALTERNATIVE WOULD HAVE SPENT THE ISLAND'S GROWTH HEADROOM.**
   *
   * This is the measurement that decides the mechanism, and the FIRST version of it was wrong,
   * so it is derived here rather than quoted. It read *"`depthPrecision.test.ts` ships 4.42
   * steps against a bar of 4, so a dolly breaks it outright"* — and 4.42 was measured against
   * the road stack D-ERA30 replaced. #413 re-derived it and merged on 2026-08-02: the real
   * figure is **11.04**, and a dolly does NOT break the guard today.
   *
   * What it breaks is the growth this change is a prerequisite for. Depth resolution degrades
   * with the square of the view distance, so a camera 1.75x further out costs the same budget
   * an island 1.75x wider would have spent — and the two draw on one account. The road tops and
   * `maxViewDistance` are read here exactly as `depthPrecision.test.ts` reads them, so the two
   * files cannot disagree about the arithmetic.
   */
  const roadGap = Math.min(
    ...ERA_SEQUENCE.map((era) => {
      const tops = [...roadSurfaceTops(era.id)].sort((a, b) => a - b);
      let tightest = Number.POSITIVE_INFINITY;
      for (let i = 1; i < tops.length; i += 1) {
        tightest = Math.min(tightest, (tops[i] ?? 0) - (tops[i - 1] ?? 0));
      }
      return tightest;
    }),
  );

  /** `depthPrecision.test.ts`'s headroom, for an island of `grass` at dolly ratio `ratio`. */
  function roadHeadroom(grass: number, ratio: number): number {
    // The lagoon re-authored with the shore, as §5.1's own growth table scales it.
    const sea = (LAYOUT.seaRadius * grass) / LAYOUT.islandRadius;
    const furthest = maxViewDistance(
      grass * ratio * (1 + VILLAGE_CAMERA.zoomOverscrollRatio),
      sea,
      grass * 0.72 * (1 + VILLAGE_CAMERA.panOverscrollRatio),
    );
    return (
      roadGap /
      depthResolutionAt(
        furthest,
        VILLAGE_CAMERA.nearPlane,
        grass * VILLAGE_CAMERA.farPlaneRatio,
      )
    );
  }

  /** The `CAMERA_DISTANCE_RATIO` a DOLLY would need to seat the island, with no lift available. */
  function dollyRatioThatFits(view: {
    readonly width: number;
    readonly height: number;
  }): number {
    const usable = 1 - 2 * FRAME_MARGIN;
    for (let ratio = CAMERA_DISTANCE_RATIO; ratio < 40; ratio += 0.002) {
      const box = groundRingOnScreen({
        view,
        radius: islandFitRadius(LAYOUT.islandRadius),
        distance: LAYOUT.islandRadius * ratio,
        targetY: LAYOUT.cameraTarget[1],
        fov: FOV,
      });
      if (
        box.bottom <= view.height / 2 + (view.height / 2) * usable &&
        box.top >= view.height / 2 - (view.height / 2) * usable &&
        box.right <= view.width / 2 + (view.width / 2) * usable
      ) {
        return ratio;
      }
    }
    throw new Error("no dolly seats the island, which this test does not expect");
  }

  it("would cost the island its growth ceiling if it were bought with distance", () => {
    // A floor under the whole comparison: some era really does stack two courses that can fight,
    // or `roadGap` is `Infinity` and every ratio below reads as infinitely safe.
    expect(Number.isFinite(roadGap)).toBe(true);
    expect(ERA_SEQUENCE.length).toBeGreaterThan(1);

    // The premise `depthPrecision.test.ts` holds, restated at the tip rather than quoted from
    // §5.1: era one has a lot of headroom, not the 4.42 that section carried until #413.
    expect(roadHeadroom(LAYOUT.islandRadius, CAMERA_DISTANCE_RATIO)).toBeGreaterThan(10);

    // The dolly has to buy the off-centring with distance too, so it is FURTHER than the lens
    // is wide: 4.02 against 2.3, a 1.75x pullback against a 1.52x widening.
    const dolly = dollyRatioThatFits(SHORT_LAPTOP);
    const framing = islandFraming({ view: SHORT_LAPTOP, layout, fov: FOV });
    expect(dolly / CAMERA_DISTANCE_RATIO).toBeGreaterThan(framing?.zoom ?? 0);

    // AND IT PASSES TODAY, which is why the argument is about growth and not about a red guard.
    // Stated so nobody reads the next assertion as "a dolly breaks depth precision".
    expect(roadHeadroom(LAYOUT.islandRadius, dolly)).toBeGreaterThan(4);

    // THE COST: the island can grow to about grass 50 at the shipped dolly and about grass 33
    // under this one — below era three's authored 35. Read at grass 46, #413's own re-derived
    // headroom figure.
    expect(roadHeadroom(46, CAMERA_DISTANCE_RATIO)).toBeGreaterThan(4);
    expect(roadHeadroom(46, dolly)).toBeLessThan(4);
    expect(roadHeadroom(35, dolly)).toBeLessThan(4);

    // AND THE LENS SPENDS NONE OF IT, because it moves no camera. Read off the camera itself
    // rather than off the arithmetic: position, near and far are untouched — so every term
    // `maxViewDistance` is built from is the term it was — while the projection really did
    // change, which is what stops this being three assertions about a no-op.
    const camera = sceneCamera(SHORT_LAPTOP);
    const before = {
      position: camera.position.toArray(),
      near: camera.near,
      far: camera.far,
      projection: camera.projectionMatrix.toArray(),
    };
    applyCityFraming(camera, framing, SHORT_LAPTOP);
    camera.updateProjectionMatrix();
    expect(camera.position.toArray()).toEqual(before.position);
    expect(camera.near).toBe(before.near);
    expect(camera.far).toBe(before.far);
    expect(camera.projectionMatrix.toArray()).not.toEqual(before.projection);
  });

  /**
   * ONE HONEST EXCEPTION, recorded because it would otherwise look like this file overlooked it:
   * a building at `MAX_BUILD_HEIGHT` would stand closer to the camera than the 3u floor at full
   * zoom-in. That is true with and without the framing, it is a cap nothing in era one reaches
   * (the tallest renders 9.769u), and it is not a cost of this change.
   */
  it("names the height at which the 3u floor would stop holding, framed or not", () => {
    const closest = dollies[0] ?? 0;
    const cameraHeight =
      layout.cameraTarget[1] + Math.cos(VILLAGE_CAMERA.polarAngle) * closest;
    expect(cameraHeight - MAX_BUILD_HEIGHT).toBeLessThan(3);
    expect(cameraHeight - ERA_ONE_ROOFLINE).toBeGreaterThan(3);
    // ...and even the cap clears the near plane itself, so nothing can ever be clipped.
    expect(cameraHeight - MAX_BUILD_HEIGHT).toBeGreaterThan(VILLAGE_CAMERA.nearPlane);
  });
});

describe("a crisis takes the frame, and hands it back", () => {
  /**
   * **THE SCENE APPLIES EXACTLY ONE FRAMING, AND THIS IS WHERE THE CHOICE IS MADE.**
   *
   * `CityFrame` is a one-line component around `cityFrameFor` precisely so the decision is
   * testable without a GPU: the wiring risk is then a single call rather than a branch nobody
   * can reach from a test.
   *
   * The two framings answer different questions — the whole island into the whole canvas,
   * against the SETTLEMENT into the strip beside a panel — so they do not compose.
   * `winterFraming.ts` records that fitting the whole board during a crisis was measured and
   * rejected at the lead's insistence, and maxing the two zooms together would draw the
   * settlement at 90% of the size that decision was tuned to.
   */
  const settlement = 20;

  it("frames the whole island when no crisis is running", () => {
    const framing = cityFrameFor({
      view: SHORT_LAPTOP,
      layout: LAYOUT,
      fov: FOV,
      winter: false,
      winterFitRadius: settlement,
    });
    expect(framing?.offsetX).toBe(0);
    expect(framing?.lift ?? 0).toBeGreaterThan(0);
    expect(framing?.zoom).toBe(
      islandFraming({ view: SHORT_LAPTOP, layout: LAYOUT, fov: FOV })?.zoom,
    );
  });

  it("hands the frame to the crisis while a panel is over the island", () => {
    const framing = cityFrameFor({
      view: SHORT_LAPTOP,
      layout: LAYOUT,
      fov: FOV,
      winter: true,
      winterFitRadius: settlement,
    });
    // The crisis slides sideways and does not lift, which is `winterFraming.ts`'s own claim.
    expect(framing?.offsetX ?? 0).toBeGreaterThan(0);
    expect(framing?.lift).toBe(0);
    expect(framing?.zoom).toBe(
      winterFraming({
        view: SHORT_LAPTOP,
        fitRadius: settlement,
        distance: LAYOUT.cameraDistance,
        fov: FOV,
      })?.zoom,
    );
  });

  it("fits the Intrusion beside its compact instrument instead of an obsolete wide rail", () => {
    const framing = cityFrameFor({
      view: SHORT_LAPTOP,
      layout: LAYOUT,
      fov: FOV,
      winter: false,
      intrusion: true,
      winterFitRadius: settlement,
    });
    const expected = winterFraming({
      view: SHORT_LAPTOP,
      fitRadius: settlement,
      distance: LAYOUT.cameraDistance,
      fov: FOV,
      panelReach: intrusionPanelReach(SHORT_LAPTOP),
      minimumZoom: 0.62,
    });

    expect(framing?.offsetX ?? 0).toBeLessThan(0);
    expect(framing?.zoom).toBe(expected?.zoom);
    expect(intrusionPanelReach(SHORT_LAPTOP)).toBe(362);
  });

  /**
   * AND WHERE THE CRISIS REFUSES, the default is what is left rather than nothing at all.
   * Phone width is the case: `winterFraming` returns `null` there because a full-bleed bottom
   * sheet leaves no strip to frame into, and before this the island was then drawn at the
   * unframed camera. The default framing is strictly better than that.
   */
  it("falls back to the default framing where the crisis refuses to frame", () => {
    const phone = { width: 460, height: 800 } as const;
    expect(
      winterFraming({
        view: phone,
        fitRadius: settlement,
        distance: LAYOUT.cameraDistance,
        fov: FOV,
      }),
    ).toBeNull();
    const framing = cityFrameFor({
      view: phone,
      layout: LAYOUT,
      fov: FOV,
      winter: true,
      winterFitRadius: settlement,
    });
    expect(framing).toEqual(islandFraming({ view: phone, layout: LAYOUT, fov: FOV }));
    expect(framing?.zoom ?? 0).toBeGreaterThan(1);
  });
});

describe("the shore allowance is the island the art really draws", () => {
  /**
   * **THE FIT RADIUS IS A CONSTANT, SO IT OWES A MEASUREMENT AGAINST THE ART.**
   *
   * Read off the built island rather than off `SHORE_PROFILE`'s table, so a shore that grows
   * in the geometry without the table moving still fails here. "Dry land" is the honest subject:
   * the one named lagoon is excluded explicitly, then only opaque surfaces above its waterline
   * count. Naming it matters once authored source geometry is scaled into world units: its cap
   * can round a fraction above the shared line while remaining the same sea. The build-grid
   * decal is excluded by transparency — a 56u quad whose texture is
   * fully dissolved by radius 24, so its geometric corners at 39.6u are not island and would
   * make this measure a plane instead of a shore.
   */
  it("covers the drawn silhouette without paying for sea", () => {
    const group = buildIslandGroup(
      LAYOUT,
      islandGround("prehistoric"),
      LAYOUT.islandRadius,
    );
    group.updateMatrixWorld(true);
    let reach = 0;
    let counted = 0;
    let excludedLagoons = 0;
    let furthestMesh = "";
    const vertex = new THREE.Vector3();
    group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const position = mesh.geometry?.getAttribute?.("position");
      const material = mesh.material as THREE.Material | undefined;
      if (mesh.name === ISLAND_LAGOON_MESH) {
        excludedLagoons += 1;
        return;
      }
      if (!position || material?.transparent === true) {
        return;
      }
      for (let i = 0; i < position.count; i += 1) {
        vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        if (vertex.y <= WATERLINE_Y) {
          continue;
        }
        counted += 1;
        const radius = Math.hypot(vertex.x, vertex.z);
        if (radius > reach) {
          reach = radius;
          furthestMesh = mesh.name || "(unnamed)";
        }
      }
    });
    // A floor, so an empty traversal cannot satisfy the bound below.
    // 2026-08-21: prehistoric's gravel-shelf, shore-boulder-clusters, ground-scatter, scrub,
    // reed banks, and windblown camp were all deliberately removed across the day, dropping
    // this vertex count from ~2,300 to 1,956.
    expect(excludedLagoons).toBe(1);
    expect(counted).toBeGreaterThan(1500);
    expect(reach).toBeGreaterThan(LAYOUT.islandRadius);
    expect(
      reach,
      `${furthestMesh} reaches ${reach.toFixed(2)}u, past the ${ISLAND_SHORE_REACH}u the fit allows`,
    ).toBeLessThanOrEqual(islandFitRadius(LAYOUT.islandRadius));
    // ...and the allowance is not idly generous either: it is within a few units of the art.
    // 2026-08-21: removing era 1's reed banks (past decorative clutter) pulled the drawn
    // silhouette's furthest point inward, widening this gap from the prior 1.5u bound.
    expect(islandFitRadius(LAYOUT.islandRadius) - reach).toBeLessThan(2.6);
  });
});
