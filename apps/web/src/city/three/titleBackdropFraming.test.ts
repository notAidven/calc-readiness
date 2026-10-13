import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { eraCityLayout } from "../islandLand";
import {
  CAMERA_DISTANCE_RATIO,
  type CityLayout,
  ISLAND_GRASS_RADIUS,
} from "../worldLayout";
import {
  applyCityFraming,
  FRAME_MARGIN,
  groundRingOnScreen,
  islandFitRadius,
  islandFraming,
} from "./cityFraming";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { cameraAt, titleBackdropLayout } from "./TitleBackdrop";

/**
 * **DOES THE ISLAND FIT THE TITLE SCREEN — and should it?**
 *
 * #419 fitted the island to the city's frame and named this canvas as carrying the same defect
 * without fixing it, on the grounds that a title screen is a composition call: a poster may want
 * its subject cropped and looming. The ruling that answers it is in `TitleBackdrop.tsx`'s
 * docblock and the frames are in `titleBackdropFraming.browser.test.tsx`; this file is the
 * arithmetic under both, and the part that can run in CI on every commit.
 *
 * ## WHAT IS MEASURED HERE THAT `cityFraming.test.ts` DOES NOT ALREADY MEASURE
 *
 * The framing model is `cityFraming.ts`'s and is pinned there — the closed form against a real
 * projection, the fit radius against the drawn art, the cap's excluded population. None of that
 * is repeated. What is only true of THIS canvas is:
 *
 *  - it sits on its own dolly (`BACKDROP_DISTANCE_RATIO`), so the defect and the fit are its own
 *    numbers and not the city's — 115% of the viewport's height rather than 143%;
 *  - **its camera never stops moving.** The city's is a `MapControls` the player drives; this one
 *    auto-orbits. A framing applied once to a moving camera is only correct if the picture is
 *    invariant under that motion, which is measured below through real cameras rather than
 *    argued from symmetry;
 *  - the alternatives it rejects are different ones. #419 rejected a dolly because a dolly spends
 *    the road layer's depth budget and the island's growth headroom. Neither applies to a
 *    decorative canvas with no roads on it, so the dolly is re-costed here on this canvas's own
 *    terms — and it loses anyway, on size, on the lagoon's rim and on fog.
 *
 * Every claim states what the SHIPPED framing does first. "The island is inside the frame" is
 * also true of a camera so far out that the island is a speck, so every fit assertion below has a
 * floor on the island's size beside it.
 */

const FOV = 32;
const LAYOUT = titleBackdropLayout();
const CITY = eraCityLayout("prehistoric");

const SHORT_LAPTOP = { width: 1024, height: 580 } as const;
const LAPTOP = { width: 1440, height: 900 } as const;
const DESKTOP = { width: 1920, height: 1080 } as const;
/** 1024x580 is the WINDOW; the page inside it is about 507px once the browser takes its chrome. */
const SHORT_PAGE = { width: 1024, height: 507 } as const;
const VIEWPORTS = [SHORT_LAPTOP, SHORT_PAGE, LAPTOP, DESKTOP] as const;

interface View {
  readonly width: number;
  readonly height: number;
}

/** Where the drawn island lands with NO framing — the picture that shipped. */
function unframed(view: View, layout: CityLayout = LAYOUT) {
  return groundRingOnScreen({
    view,
    radius: islandFitRadius(layout.islandRadius),
    distance: layout.cameraDistance,
    targetY: layout.cameraTarget[1],
    fov: FOV,
  });
}

/**
 * A real `THREE.PerspectiveCamera` where `TitleBackdrop` puts one, at `azimuth`.
 *
 * Built from the component's own exported `cameraAt` and the same `<Canvas>` camera config, so
 * this is the shipped camera and not a second description of it.
 */
function backdropCamera(view: View, azimuth: number, layout: CityLayout = LAYOUT) {
  const camera = new THREE.PerspectiveCamera(
    FOV,
    view.width / view.height,
    0.1,
    layout.islandRadius * 40,
  );
  const [x, y, z] = cameraAt(layout, azimuth);
  camera.position.set(x, y, z);
  camera.lookAt(layout.cameraTarget[0], layout.cameraTarget[1], layout.cameraTarget[2]);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

/** Where a ground ring really lands, sampled all the way round a real projection. */
function projectedRing(
  camera: THREE.PerspectiveCamera,
  view: View,
  radius: number,
  samples = 2048,
) {
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  const point = new THREE.Vector3();
  for (let step = 0; step < samples; step += 1) {
    const angle = (step / samples) * Math.PI * 2;
    point.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius).project(camera);
    top = Math.min(top, ((1 - point.y) / 2) * view.height);
    bottom = Math.max(bottom, ((1 - point.y) / 2) * view.height);
    left = Math.min(left, ((point.x + 1) / 2) * view.width);
    right = Math.max(right, ((point.x + 1) / 2) * view.width);
  }
  return { top, bottom, left, right };
}

/** The backdrop's camera with its framing on, exactly as `BackdropFrame` applies it. */
function framedCamera(view: View, azimuth: number, layout: CityLayout = LAYOUT) {
  const camera = backdropCamera(view, azimuth, layout);
  const framing = islandFraming({ view, layout, fov: FOV });
  expect(framing, `no framing at ${view.width}x${view.height}`).not.toBeNull();
  applyCityFraming(camera, framing, view);
  camera.updateProjectionMatrix();
  return { camera, framing };
}

describe("the backdrop's camera is the city's on a longer lens, and only that", () => {
  it("sits exactly BACKDROP_DISTANCE_RATIO further out than the city's default", () => {
    // The ratio is not exported (it is a composition constant, not an interface), so it is
    // measured rather than quoted: further out than the city's camera, and by a fixed multiple.
    expect(LAYOUT.cameraDistance).toBeGreaterThan(CITY.cameraDistance);
    const ratio = LAYOUT.cameraDistance / CITY.cameraDistance;
    expect(ratio).toBeCloseTo(1.2, 10);
    // ...and the multiple rides on the radius-driven dolly rather than replacing it, which is
    // what makes the whole thing scale with a growing island.
    expect(LAYOUT.cameraDistance).toBeCloseTo(
      ISLAND_GRASS_RADIUS * CAMERA_DISTANCE_RATIO * ratio,
      10,
    );
  });

  it("changes nothing else about the layout, so the island and its lagoon are the city's", () => {
    expect(LAYOUT.islandRadius).toBe(CITY.islandRadius);
    expect(LAYOUT.seaRadius).toBe(CITY.seaRadius);
    expect(LAYOUT.buildableRadius).toBe(CITY.buildableRadius);
    expect(LAYOUT.cameraTarget).toEqual(CITY.cameraTarget);
    expect(LAYOUT.surfaceY).toBe(CITY.surfaceY);
    // Exactly one field differs, so this cannot drift into a second layout by accident.
    const differing = (Object.keys(CITY) as (keyof CityLayout)[]).filter(
      (key) => JSON.stringify(LAYOUT[key]) !== JSON.stringify(CITY[key]),
    );
    expect(differing).toEqual(["cameraDistance"]);
  });

  it("scales its dolly with the radius it is laying out for", () => {
    const ratios = [30, 35, 46, 69].map(
      (radius) => titleBackdropLayout(radius).cameraDistance / radius,
    );
    for (const ratio of ratios) {
      expect(ratio).toBeCloseTo(ratios[0] as number, 10);
    }
    expect(titleBackdropLayout(69).cameraDistance).toBeGreaterThan(
      titleBackdropLayout(30).cameraDistance,
    );
  });
});

describe("the island did not fit the title screen, and not because the window was short", () => {
  /**
   * The defect #419 named and left. The whole crop is on ONE side, which is the tell that it was
   * never composed: the projection of a disc seen at this tilt lands well below the middle of the
   * screen, so the near shore is lost while sky is banked above the far one.
   */
  for (const view of VIEWPORTS) {
    const at = `${view.width}x${view.height}`;
    it(`runs off the bottom edge while leaving sky above the far shore at ${at}`, () => {
      const island = unframed(view);
      expect(island.bottom, `the island already fits at ${at}`).toBeGreaterThan(
        view.height,
      );
      expect(island.top, `the far shore is off the top too at ${at}`).toBeGreaterThan(0);
      // The crop is bottom-only and the waste is top-only, which no composition does on purpose.
      const lost = island.bottom - view.height;
      expect(lost).toBeGreaterThan(island.top);
    });
  }

  it("overflows by the same 115% of the height at every viewport", () => {
    const shares = VIEWPORTS.map((view) => {
      const island = unframed(view);
      return (island.bottom - island.top) / view.height;
    });
    for (const share of shares) {
      expect(share).toBeCloseTo(1.1535, 4);
    }
    // Which is the whole point: a perspective camera's vertical frustum is an ANGLE, so a taller
    // window is not a fix and a short-viewport-only fix would have been fixing the wrong thing.
    expect(Math.max(...shares) - Math.min(...shares)).toBeLessThan(1e-9);
    // A floor under "the same": the viewports really do differ in height, so this is not one
    // window measured four times.
    expect(new Set(VIEWPORTS.map((view) => view.height)).size).toBeGreaterThan(2);
  });

  it("loses 149px of near shore off a 580px viewport", () => {
    const island = unframed(SHORT_LAPTOP);
    expect(island.bottom - SHORT_LAPTOP.height).toBeCloseTo(149.3, 1);
    expect(island.top).toBeCloseTo(60.3, 1);
    // The grass disc alone is almost exactly the viewport's height, so what the crop throws
    // away is the SHORE — the 4 units `StarterIsland` calls the island's visible footprint.
    const grass = groundRingOnScreen({
      view: SHORT_LAPTOP,
      radius: LAYOUT.islandRadius,
      distance: LAYOUT.cameraDistance,
      targetY: LAYOUT.cameraTarget[1],
      fov: FOV,
    });
    expect((grass.bottom - grass.top) / SHORT_LAPTOP.height).toBeCloseTo(1.0, 2);
  });
});

describe("the whole island is inside the title screen once it is framed", () => {
  for (const view of VIEWPORTS) {
    const at = `${view.width}x${view.height}`;
    it(`seats the shore on all four sides with a band of lagoon, at ${at}`, () => {
      const { camera, framing } = framedCamera(view, VILLAGE_CAMERA.azimuthAngle);
      const island = projectedRing(camera, view, islandFitRadius(LAYOUT.islandRadius));
      const band = Math.min(view.width, view.height) * FRAME_MARGIN * 0.9;
      expect(island.top, `cut off at the top, ${at}`).toBeGreaterThan(band);
      expect(view.height - island.bottom, `off the bottom, ${at}`).toBeGreaterThan(band);
      expect(island.left, `cut off on the left, ${at}`).toBeGreaterThan(band);
      expect(view.width - island.right, `off the right, ${at}`).toBeGreaterThan(band);

      // AND IT IS STILL BIG, which every line above would let a speck through on. The drawn
      // island keeps 90%+ of the frame's height, and the widening that buys it is 1.23x —
      // pinned both ways, because the cheap way to satisfy a fit is to zoom out until the
      // island is a dot in the middle of a lagoon.
      expect(
        (island.bottom - island.top) / view.height,
        `the island reads too small at ${at}`,
      ).toBeGreaterThan(0.9);
      expect(framing?.zoom, `widening at ${at}`).toBeCloseTo(1.227, 3);
    });
  }

  it("centres the island's silhouette rather than the point the camera aims at", () => {
    const { camera, framing } = framedCamera(SHORT_LAPTOP, VILLAGE_CAMERA.azimuthAngle);
    const island = projectedRing(
      camera,
      SHORT_LAPTOP,
      islandFitRadius(LAYOUT.islandRadius),
    );
    const was = unframed(SHORT_LAPTOP);
    // Before: 105px low, which is why sky was banked above the far shore while the near one
    // ran off the bottom. After: on the screen's centre line, within a pixel.
    expect((was.top + was.bottom) / 2 - SHORT_LAPTOP.height / 2).toBeCloseTo(104.8, 1);
    expect(
      Math.abs((island.top + island.bottom) / 2 - SHORT_LAPTOP.height / 2),
    ).toBeLessThan(1);

    /*
     * AND THE LIFT IS WHAT MAKES THE WIDENING AFFORDABLE, which is the reason it is worth a
     * number of its own rather than being folded into the zoom. Widening about the SCREEN's
     * centre has to buy the off-centredness back twice over: the far extreme is 439px from the
     * middle where the whole island is only 669px tall, so it needs 1.61x where centring the
     * silhouette first needs 1.23x — 24% of the island's size for one term.
     */
    const usableHalf = (SHORT_LAPTOP.height / 2) * (1 - 2 * FRAME_MARGIN);
    const centreOnly =
      Math.max(
        Math.abs(was.top - SHORT_LAPTOP.height / 2),
        Math.abs(was.bottom - SHORT_LAPTOP.height / 2),
      ) / usableHalf;
    expect(centreOnly).toBeCloseTo(1.611, 3);
    expect(framing?.zoom as number).toBeLessThan(centreOnly * 0.8);
  });

  it("moves no camera and touches neither depth plane", () => {
    const plain = backdropCamera(SHORT_LAPTOP, VILLAGE_CAMERA.azimuthAngle);
    const before = {
      position: plain.position.clone(),
      near: plain.near,
      far: plain.far,
      fov: plain.fov,
      projection: plain.projectionMatrix.clone(),
    };
    const { camera } = framedCamera(SHORT_LAPTOP, VILLAGE_CAMERA.azimuthAngle);
    expect(camera.position.distanceTo(before.position)).toBe(0);
    expect(camera.near).toBe(before.near);
    expect(camera.far).toBe(before.far);
    expect(camera.fov).toBe(before.fov);
    // ...and it really is a lens: the projection matrix, and only it, changed.
    expect(camera.projectionMatrix.elements).not.toEqual(before.projection.elements);
    // Clearing it restores the shipped projection exactly, so nothing is left behind.
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
    for (const [index, value] of before.projection.elements.entries()) {
      expect(camera.projectionMatrix.elements[index]).toBeCloseTo(value, 12);
    }
  });
});

describe("the framing survives the ambient orbit, which is why it is applied once", () => {
  /**
   * `BackdropFrame` sets one view offset in an effect and never touches it again while the
   * camera keeps turning. That is only correct if the island's projection does not depend on the
   * azimuth — true because the drift is a rotation about the world's Y axis through the target,
   * over a disc that is symmetric about that same axis. Measured through real cameras over a
   * full turn rather than taken from the symmetry argument, because the argument is exactly what
   * a `lookAt` with a fixed `up` could quietly break.
   */
  const TURN = Array.from({ length: 24 }, (_, step) => (step / 24) * Math.PI * 2);
  /**
   * A hundredth of a CSS pixel, which is `projectedRing`'s OWN resolution rather than a
   * tolerance for the claim: the ring is sampled at fixed world angles, so as the heading turns
   * the nearest sample to the true extreme shifts by a fraction of a step. Measured, the spread
   * over a full turn is 1e-4px — four orders of magnitude under the 17px lagoon band the fit is
   * sized by, so "the same box" is exact here and not approximate.
   */
  const SAMPLING_PX = 0.01;

  it("keeps the camera on one sphere about the target, at one tilt", () => {
    const target = new THREE.Vector3(...LAYOUT.cameraTarget);
    for (const azimuth of TURN) {
      const position = new THREE.Vector3(...cameraAt(LAYOUT, azimuth));
      expect(position.distanceTo(target)).toBeCloseTo(LAYOUT.cameraDistance, 9);
      const elevation = Math.asin((position.y - target.y) / LAYOUT.cameraDistance);
      expect(elevation).toBeCloseTo(Math.PI / 2 - VILLAGE_CAMERA.polarAngle, 9);
    }
    // A floor, so a sweep that had collapsed to one heading could not satisfy the above.
    const headings = new Set(
      TURN.map((azimuth) =>
        cameraAt(LAYOUT, azimuth)
          .map((v) => v.toFixed(4))
          .join(),
      ),
    );
    expect(headings.size).toBe(TURN.length);
  });

  it("draws the island in the same box at every heading, framed and unframed", () => {
    const radius = islandFitRadius(LAYOUT.islandRadius);
    const base = projectedRing(
      backdropCamera(SHORT_LAPTOP, TURN[0] as number),
      SHORT_LAPTOP,
      radius,
    );
    const framedBase = projectedRing(
      framedCamera(SHORT_LAPTOP, TURN[0] as number).camera,
      SHORT_LAPTOP,
      radius,
    );
    for (const azimuth of TURN) {
      const plain = projectedRing(
        backdropCamera(SHORT_LAPTOP, azimuth),
        SHORT_LAPTOP,
        radius,
      );
      const framed = projectedRing(
        framedCamera(SHORT_LAPTOP, azimuth).camera,
        SHORT_LAPTOP,
        radius,
      );
      for (const edge of ["top", "bottom", "left", "right"] as const) {
        expect(
          Math.abs(plain[edge] - base[edge]),
          `unframed ${edge} @ ${azimuth.toFixed(3)}`,
        ).toBeLessThan(SAMPLING_PX);
        expect(
          Math.abs(framed[edge] - framedBase[edge]),
          `framed ${edge} @ ${azimuth.toFixed(3)}`,
        ).toBeLessThan(SAMPLING_PX);
      }
    }
    // The premise the sweep rests on: the island really is inside the frame at every heading,
    // so this is not 24 identically wrong measurements.
    expect(framedBase.top).toBeGreaterThan(0);
    expect(framedBase.bottom).toBeLessThan(SHORT_LAPTOP.height);
  });
});

describe("the backdrop follows a growing island with nothing re-tuned", () => {
  const RADII = [30, 35, 46, 69] as const;

  it("frames every radius to the same picture", () => {
    const boxes = RADII.map((radius) => {
      const layout = titleBackdropLayout(radius);
      const { camera } = framedCamera(SHORT_LAPTOP, VILLAGE_CAMERA.azimuthAngle, layout);
      return {
        radius,
        box: projectedRing(camera, SHORT_LAPTOP, islandFitRadius(layout.islandRadius)),
      };
    });
    const first = boxes[0]?.box as { top: number; bottom: number };
    for (const { radius, box } of boxes) {
      // A hundredth of a pixel — `projectedRing`'s own sampling resolution, not a tolerance
      // for the claim. Measured, the spread across these four radii is under 1e-5px.
      expect(Math.abs(box.top - first.top), `top @ grass ${radius}`).toBeLessThan(0.01);
      expect(Math.abs(box.bottom - first.bottom), `bottom @ grass ${radius}`).toBeLessThan(
        0.01,
      );
      // The claim is a fit, not just a repeat: it is inside the frame at every radius.
      expect(box.top, `off the top @ grass ${radius}`).toBeGreaterThan(0);
      expect(box.bottom, `off the bottom @ grass ${radius}`).toBeLessThan(
        SHORT_LAPTOP.height,
      );
    }
    // And a floor under "same picture": the radii really do differ, so this is not one radius
    // measured four times.
    expect(new Set(RADII).size).toBe(RADII.length);
    expect(
      new Set(RADII.map((radius) => titleBackdropLayout(radius).cameraDistance)).size,
    ).toBe(RADII.length);
  });

  it("needs slightly less widening as the island grows, because the beach does not scale", () => {
    const zooms = RADII.map(
      (radius) =>
        islandFraming({
          view: SHORT_LAPTOP,
          layout: titleBackdropLayout(radius),
          fov: FOV,
        })?.zoom as number,
    );
    for (const [index, zoom] of zooms.entries()) {
      expect(zoom, `grass ${RADII[index]}`).toBeGreaterThan(1);
      if (index > 0) {
        expect(zoom).toBeLessThan(zooms[index - 1] as number);
      }
    }
  });
});

describe("a dolly was re-costed on this canvas's terms, and it loses on all three", () => {
  /**
   * #419's objection to a dolly does NOT transfer here: it was about the road layer's z-fight
   * margin and the island's growth ceiling, and this canvas draws no roads and grows nothing.
   * So the cheap fix — raise `BACKDROP_DISTANCE_RATIO` until the island fits — has to be
   * refused on the picture instead, and it is refused three times over.
   */
  /** The smallest `BACKDROP_DISTANCE_RATIO` that seats the island on distance alone. */
  const DOLLY_FIT = 1.75;

  /** The layout a dolly-only fit would need, at the ratio that just seats the island. */
  const dollied: CityLayout = {
    ...CITY,
    cameraDistance: CITY.cameraDistance * DOLLY_FIT,
  };

  it("really would seat the island, which is why it is tempting", () => {
    const island = unframed(SHORT_LAPTOP, dollied);
    expect(island.top).toBeGreaterThan(SHORT_LAPTOP.height * FRAME_MARGIN);
    expect(island.bottom).toBeLessThan(SHORT_LAPTOP.height * (1 - FRAME_MARGIN));
    // ...and 1.2 does not, so the two really are different framings.
    expect(unframed(SHORT_LAPTOP).bottom).toBeGreaterThan(SHORT_LAPTOP.height);
  });

  it("costs the island a fifth of its size, where the lens costs it none", () => {
    const dollyBox = unframed(SHORT_LAPTOP, dollied);
    const { camera } = framedCamera(SHORT_LAPTOP, VILLAGE_CAMERA.azimuthAngle);
    const lensBox = projectedRing(
      camera,
      SHORT_LAPTOP,
      islandFitRadius(LAYOUT.islandRadius),
    );
    const dollyShare = (dollyBox.bottom - dollyBox.top) / SHORT_LAPTOP.height;
    const lensShare = (lensBox.bottom - lensBox.top) / SHORT_LAPTOP.height;
    expect(dollyShare).toBeCloseTo(0.762, 3);
    expect(lensShare).toBeCloseTo(0.94, 2);
    expect(dollyShare).toBeLessThan(lensShare * 0.85);
    // The grass disc pays the same way: two thirds of the frame's height rather than four fifths.
    const dollyGrass = groundRingOnScreen({
      view: SHORT_LAPTOP,
      radius: dollied.islandRadius,
      distance: dollied.cameraDistance,
      targetY: dollied.cameraTarget[1],
      fov: FOV,
    });
    expect((dollyGrass.bottom - dollyGrass.top) / SHORT_LAPTOP.height).toBeCloseTo(
      0.667,
      3,
    );
  });

  it("leaves the composition off-centre, which is the defect it was meant to fix", () => {
    const dollyBox = unframed(SHORT_LAPTOP, dollied);
    const offCentre = (dollyBox.top + dollyBox.bottom) / 2 - SHORT_LAPTOP.height / 2;
    // Better than the 105px it starts at, and still half of it: a dolly shrinks the
    // off-centring without addressing it, because the camera still aims at the disc's middle.
    expect(offCentre).toBeCloseTo(51.4, 1);
    expect(offCentre).toBeLessThan(
      (unframed(SHORT_LAPTOP).top + unframed(SHORT_LAPTOP).bottom) / 2 -
        SHORT_LAPTOP.height / 2,
    );
    // Where the lens leaves it centred, which is what a composition is.
    const { camera } = framedCamera(SHORT_LAPTOP, VILLAGE_CAMERA.azimuthAngle);
    const lensBox = projectedRing(
      camera,
      SHORT_LAPTOP,
      islandFitRadius(LAYOUT.islandRadius),
    );
    expect(
      Math.abs((lensBox.top + lensBox.bottom) / 2 - SHORT_LAPTOP.height / 2),
    ).toBeLessThan(1);
  });

  it("brings the lagoon's own rim into frame, and the lens does not", () => {
    const inFrame = (box: { top: number; left: number; right: number }) =>
      box.top > 0 || box.left > 0 || box.right < SHORT_LAPTOP.width;
    const dollySea = groundRingOnScreen({
      view: SHORT_LAPTOP,
      radius: dollied.seaRadius,
      distance: dollied.cameraDistance,
      targetY: dollied.cameraTarget[1],
      fov: FOV,
    });
    expect(inFrame(dollySea), "a dolly-only fit shows the water ending").toBe(true);

    const { camera } = framedCamera(SHORT_LAPTOP, VILLAGE_CAMERA.azimuthAngle);
    const lensSea = projectedRing(camera, SHORT_LAPTOP, LAYOUT.seaRadius);
    expect(inFrame(lensSea), "the framed canvas shows the water ending").toBe(false);
  });

  it("puts the whole island behind the fog the backdrop already sets", () => {
    // `TitleBackdrop`'s fog is `[islandRadius * 3, islandRadius * 20]`, so how much of the
    // island is desaturated is a function of how far away the camera is.
    const fogNear = LAYOUT.islandRadius * 3;
    const nearPoleDepth = (layout: CityLayout) => {
      const sinE = Math.cos(VILLAGE_CAMERA.polarAngle);
      const cosE = Math.sin(VILLAGE_CAMERA.polarAngle);
      const height = layout.cameraTarget[1] + sinE * layout.cameraDistance;
      const nadir = cosE * layout.cameraDistance;
      const a = nadir - islandFitRadius(layout.islandRadius);
      return a * cosE + height * sinE;
    };
    expect(nearPoleDepth(LAYOUT)).toBeLessThan(fogNear);
    expect(nearPoleDepth(dollied)).toBeGreaterThan(fogNear);
  });
});

describe("a lift without a widening was costed too, and it is not a poster crop either", () => {
  /**
   * The cheapest possible change: centre the silhouette and do not shrink the island at all.
   * It is the one candidate that keeps every pixel of today's island size, so it deserves a
   * measurement rather than a dismissal — and what it produces is a crop with NO water at the
   * top or the bottom of the frame, on a screen whose own tagline is "Build your island".
   */
  it("crops the island at both ends and leaves no lagoon above or below it", () => {
    for (const view of [SHORT_LAPTOP, LAPTOP, DESKTOP]) {
      const island = unframed(view);
      const lift = (island.top + island.bottom) / 2 - view.height / 2;
      const lifted = { top: island.top - lift, bottom: island.bottom - lift };
      expect(lifted.top, `${view.width}x${view.height} top`).toBeLessThan(0);
      expect(lifted.bottom, `${view.width}x${view.height} bottom`).toBeGreaterThan(
        view.height,
      );
      // Symmetric, which is the one thing it has going for it, and still a crop.
      expect(Math.abs(-lifted.top - (lifted.bottom - view.height))).toBeLessThan(0.001);
      // And the grass runs off the top edge, so there is no shoreline arc at the top either.
      const grass = groundRingOnScreen({
        view,
        radius: LAYOUT.islandRadius,
        distance: LAYOUT.cameraDistance,
        targetY: LAYOUT.cameraTarget[1],
        fov: FOV,
      });
      expect(grass.top - lift).toBeLessThan(0);
    }
  });
});
