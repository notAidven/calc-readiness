import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { eraCityLayout } from "../islandLand";
import {
  BUILDABLE_RADIUS,
  ISLAND_GRASS_RADIUS,
  MAX_BUILD_HEIGHT,
  SEA_RADIUS,
} from "../worldLayout";
import { resolveLightSpec } from "./CityLighting";
import { maxViewDistance, VILLAGE_CAMERA } from "./orbitCamera";
import { COLUMN_HEIGHT, columnSpanFor, FUEL_STEPS } from "./winterFire";
import { DRIFT_MAX_H } from "./winterScene";
import { WINTER_LIGHT } from "./winterTones";

/**
 * **THE CRISIS ASSETS MEASURED AT THE CAMERA THE GAME ACTUALLY HAS.**
 *
 * The reference plates the 2026-07-30 design batch was drawn from had the wrong camera: they
 * were drawn at roughly 16° of elevation, and the shipped camera is locked at
 * `VILLAGE_CAMERA.polarAngle` — 0.72 rad, so 48.75° of elevation — with `fov: 32` and a free
 * 360° heading. The batch's own text claims 49° and sizes the smoke column against it, so it
 * reasoned about the requirement rather than copying the plates; this file is what checks that.
 *
 * ## WHAT THE TILT COSTS A VERTICAL, EXACTLY
 *
 * A vertical of world height `H` at the orbit centre projects to a screen height proportional
 * to `H · cos(elevation)`, and a ground extent along the view direction to `cos(...)`'s
 * complement, `sin(elevation)`. So there are two different ratios in play and they differ by
 * almost three times, which is why "how much does 49° cost" needs a definition before it needs
 * a number:
 *
 *  - **absolutely**, a vertical shrinks by about **1.35x** going from 16° to 49°, which is
 *    modest;
 *  - **relative to the ground it stands on**, its prominence falls by about **3.67x**, which is
 *    the figure that matters, because a plate is read as a composition and a vertical competes
 *    with the ground plane in it, not with itself at another angle.
 *
 * Both are measured below through real projections rather than from the flat trigonometry, which
 * over-states both (1.47x and 4.0x): the top of a tall object at this tilt is much nearer the
 * camera in depth than its base, so perspective gives some of the foreshortening back.
 */

/** The shipped framing: fov, the default dolly distance, and the locked tilt. */
const FOV = 32;
const LAYOUT = eraCityLayout("prehistoric");
const DEFAULT_DISTANCE = LAYOUT.cameraDistance;
/** A 1080-tall frame, which is the height the design batch quotes its pixel figures against. */
const FRAME_H = 1080;

/** Elevation above the horizon, in radians, for a three.js polar angle from +Y. */
function elevationFor(polar: number): number {
  return Math.PI / 2 - polar;
}

/**
 * How many pixels tall a vertical segment of height `worldH` standing at the orbit centre
 * reads, on a `FRAME_H`-tall frame, from a camera at `polar` and `distance`.
 */
function screenHeight(worldH: number, polar: number, distance = DEFAULT_DISTANCE): number {
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 2000);
  camera.position.set(0, Math.cos(polar) * distance, Math.sin(polar) * distance);
  camera.lookAt(0, 2, 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const foot = new THREE.Vector3(0, 0, 0).project(camera);
  const head = new THREE.Vector3(0, worldH, 0).project(camera);
  // NDC spans -1..1 over the frame, so half the frame height per NDC unit.
  return (Math.abs(head.y - foot.y) * FRAME_H) / 2;
}

/** The same, for a horizontal extent laid ALONG the view direction on the ground. */
function screenDepth(worldD: number, polar: number, distance = DEFAULT_DISTANCE): number {
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 2000);
  camera.position.set(0, Math.cos(polar) * distance, Math.sin(polar) * distance);
  camera.lookAt(0, 2, 0);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const near = new THREE.Vector3(0, 0, worldD / 2).project(camera);
  const far = new THREE.Vector3(0, 0, -worldD / 2).project(camera);
  return (Math.abs(near.y - far.y) * FRAME_H) / 2;
}

/** The plates' camera, and the game's. */
const PLATE_POLAR = Math.PI / 2 - THREE.MathUtils.degToRad(16);
const GAME_POLAR = VILLAGE_CAMERA.polarAngle;

describe("the tilt the plates were drawn at is not the tilt the game renders at", () => {
  it("locks the game camera at about 49 degrees of elevation with a 32 degree fov", () => {
    // Stated here because everything below is measured against it, so a change to the locked
    // tilt fails in the file that reasons about it rather than only where it is defined.
    expect(THREE.MathUtils.radToDeg(elevationFor(GAME_POLAR))).toBeCloseTo(48.75, 1);
    expect(FOV).toBe(32);
  });

  it("costs a vertical about 1.5x absolutely, and about 4x against the ground plane", () => {
    const tall = 10;
    const absolute = screenHeight(tall, PLATE_POLAR) / screenHeight(tall, GAME_POLAR);
    expect(absolute).toBeGreaterThan(1.3);
    expect(absolute).toBeLessThan(1.7);

    const plateRatio = screenHeight(tall, PLATE_POLAR) / screenDepth(tall, PLATE_POLAR);
    const gameRatio = screenHeight(tall, GAME_POLAR) / screenDepth(tall, GAME_POLAR);
    // A vertical reads about three and a half times its own ground footprint at 16° and about
    // seven eighths of it at 49°, so its prominence in the composition falls by about four.
    expect(plateRatio / gameRatio).toBeGreaterThan(3.4);
    expect(plateRatio / gameRatio).toBeLessThan(4.6);
  });
});

describe("the smoke column is the asset that survives the tilt", () => {
  it("still clears the tallest building a lot may wear, by a wide margin", () => {
    // The hearth is about three world units and disappears behind the first thing between it
    // and the camera. The column is what marks the fire's position, so its whole job is to be
    // taller than anything that can stand in front of it.
    expect(COLUMN_HEIGHT).toBeGreaterThan(MAX_BUILD_HEIGHT);
  });

  it("reads as a large fraction of the frame at the shipped framing", () => {
    const column = screenHeight(COLUMN_HEIGHT, GAME_POLAR);
    // Measured, not asserted from the batch: at 49°, fov 32 and the default 69-unit dolly the
    // column top sits **648.7 px** up a 1080-tall frame, 60% of it. At the plates' own 16° it
    // would be 753 px, so the real camera costs the column 14% of its screen height and the
    // batch's findability claim survives with room to spare.
    expect(column).toBeGreaterThan(600);
    expect(column).toBeLessThan(FRAME_H);
  });

  it("out-reads a one-storey roofline by more than the batch claimed, not less", () => {
    // The batch says the column is "~5.5x a one-storey roofline". Era one's shortest building
    // renders 2.608u and its roundhouse 4.821u (`worldLayout.ts` records both), and against
    // either of them the ratio comes out HIGHER than claimed: **13.4x** and **7.1x**. So the
    // claim is conservative at this camera rather than optimistic, which is the safe direction
    // for a findability argument to be wrong in.
    //
    // Worth recording alongside it: the batch's other pixel figure — "a one-storey building
    // reads roughly 90 px tall on a 1080-tall frame" — is right, and right about the
    // ROUNDHOUSE, which measures **91.5 px** here. Its neighbouring "about 3 units" is what
    // does not match this island; the shortest placement is 2.608u and reads 48.3 px.
    const column = screenHeight(COLUMN_HEIGHT, GAME_POLAR);
    expect(column / screenHeight(2.608, GAME_POLAR)).toBeGreaterThan(5.5);
    expect(column / screenHeight(4.821, GAME_POLAR)).toBeGreaterThan(4);
    expect(screenHeight(4.821, GAME_POLAR)).toBeGreaterThan(80);
    expect(screenHeight(4.821, GAME_POLAR)).toBeLessThan(100);
  });

  it("is still found from the far rim of the island, not only from the middle", () => {
    // The findability claim is about a fire on the opposite side of the disc, which is the
    // furthest anything can be from the orbit centre and still be on the island.
    // Measured: 405 px from the far rim, 202 px at full zoom-out.
    const acrossTheIsland = DEFAULT_DISTANCE + ISLAND_GRASS_RADIUS;
    expect(screenHeight(COLUMN_HEIGHT, GAME_POLAR, acrossTheIsland)).toBeGreaterThan(300);
    const zoomedOut = DEFAULT_DISTANCE * VILLAGE_CAMERA.maxDistanceRatio;
    expect(screenHeight(COLUMN_HEIGHT, GAME_POLAR, zoomedOut)).toBeGreaterThan(150);
  });
});

/**
 * **AND SINCE 2026-08-02 THE COLUMN CARRIES THE FIRE'S DURATION, so its findability is not the
 * only thing about it this file has to measure.**
 *
 * The ruling moved the duration off the flame because the flame does not have the pixels: at
 * 1024x580 at this camera the whole difference between three rounds left and one is the flame's top
 * edge descending **11px on a 21px-wide flame**, measured on the committed frames. That is the
 * number every assertion below is against, and it is why the requirement is stated in PIXELS here
 * rather than in world units: `fireDuration.test.ts` owns the world-space ladder, and a correct
 * world-space ladder is exactly what an unreadable one looks like from inside that file.
 *
 * ## THE FRAME IS 580 TALL AND THE CRISIS ZOOM IS LEFT OUT, both deliberately
 *
 * {@link FRAME_H} is 1080 because that is what the design batch quotes; the lead's own window is
 * 580 tall, so every figure below is converted, which costs the ladder 46% of its pixels. And
 * `winterFraming`'s own **1.4669x** is deliberately NOT applied: a crisis enlarges the island by
 * that factor, so leaving it out makes every assertion here a lower bound on what a player in a
 * winter actually sees. Both moves are in the same direction — a claim that survives the small
 * frame without the zoom survives the real one.
 *
 * ## AND IT IS MEASURED AT THE DOLLY CLAMPS, NOT AT A COMFORTABLE DISTANCE
 *
 * `CityScene` clamps the dolly to `VILLAGE_CAMERA.minDistanceRatio` and `maxDistanceRatio`, so
 * those two and the resting distance are the three views a player can actually have. A previous
 * pass demonstrated the fuel ladder at `cameraDistance * 0.22`, which is 2.3x nearer than
 * `minDistanceRatio` allows, and a frame from a camera the game forbids is not evidence about the
 * shipped one. The hard case is `maxDistanceRatio`, where everything is a third of its resting
 * size, and that is the reason the read had to move to a 26-unit asset at all.
 */
describe("the column's duration ladder survives the projection, at every dolly a player has", () => {
  /** The three dollies `CityScene` lets a player reach, closest first. */
  const DOLLIES: readonly { readonly name: string; readonly distance: number }[] = [
    {
      name: "the closest zoom the game allows",
      distance: DEFAULT_DISTANCE * VILLAGE_CAMERA.minDistanceRatio,
    },
    { name: "the resting camera", distance: DEFAULT_DISTANCE },
    {
      name: "full zoom-out",
      distance: DEFAULT_DISTANCE * VILLAGE_CAMERA.maxDistanceRatio,
    },
  ];

  /** Every rung of the tuning's burn ladder, longest first. */
  const RUNGS: readonly number[] = Array.from(
    { length: FUEL_STEPS },
    (_, index) => FUEL_STEPS - index,
  );

  /** How tall a rung's column reads on the lead's 580-tall window, before the crisis zoom. */
  function rungPixels(roundsLeft: number, distance: number): number {
    return (screenHeight(columnSpanFor(roundsLeft), GAME_POLAR, distance) * 580) / FRAME_H;
  }

  /**
   * The flame's own measured travel over the whole ladder, on the same 580-tall window.
   *
   * From `docs/design-refs/hard-winter-art-fix/README.md`, which measured it on the committed
   * 1024x580 frames at the resting crisis camera: *"its top edge descends 11px"*. Quoted rather
   * than recomputed, because it is a pixel count off a photograph and there is nothing in this
   * file that could derive it — which is also the honest statement of what the ruling was about.
   */
  const FLAME_TRAVEL_PX = 11;

  /**
   * The tallest thing era one actually renders, in world units.
   *
   * The Tower on its 2x2 plot. `worldLayout.ts` records it and `frostStage.ts`, `winterShield.ts`,
   * `winterFraming.ts`, `Citizens.tsx` and `cityFraming.test.ts` all quote the same figure — which
   * is also the point: `MAX_BUILD_HEIGHT` is a CAP and nothing in this era comes near it, so the
   * cap is the wrong measure of what can stand in front of a fire on this island.
   */
  const ERA_ONE_TALLEST = 9.769;

  it("has a rung per burn round and takes them off the tuning", () => {
    // The floor, so every sweep below compares something. One rung is a tuning with no duration
    // in it, and this file would be measuring a single number against itself.
    expect(
      FUEL_STEPS,
      "the burn ladder has one rung, so there is no ladder",
    ).toBeGreaterThan(1);
    expect(RUNGS).toHaveLength(FUEL_STEPS);
    expect([...RUNGS].sort((a, b) => a - b)).toEqual(
      Array.from({ length: FUEL_STEPS }, (_, index) => index + 1),
    );
    expect(DOLLIES).toHaveLength(3);
  });

  it("separates adjacent rungs by more than the flame ever moved, at every dolly", () => {
    for (const dolly of DOLLIES) {
      const heights = RUNGS.map((rung) => rungPixels(rung, dolly.distance));
      for (let i = 1; i < RUNGS.length; i += 1) {
        const gap = (heights[i - 1] as number) - (heights[i] as number);
        expect(
          gap,
          `${RUNGS[i - 1]} rounds against ${RUNGS[i]} at ${dolly.name}: ${gap.toFixed(1)}px`,
        ).toBeGreaterThan(FLAME_TRAVEL_PX);
      }
    }
  });

  /**
   * **THE OTHER HALF OF THE TRADE, AND THE PRICE THE RULING PAYS, stated rather than hidden.**
   *
   * A ladder is trivially legible if its bottom rung is nothing, and a column of nothing is not a
   * fire that is nearly out — it is a fire that has gone out, which the layer already draws as a
   * wisp. So the bottom rung owes a floor, and the floor it owes is the findability requirement the
   * test above this describes, applied to the SHORTEST column rather than the tallest.
   *
   * **IT NO LONGER CLEARS `MAX_BUILD_HEIGHT`, AND THAT IS THE COST OF THE RULING.** The test above
   * asserts `COLUMN_HEIGHT > MAX_BUILD_HEIGHT` (26 against 24) on the reasoning that the column's
   * whole job is to out-reach anything that can stand in front of it. At one round left the span is
   * 10.92u and no longer does, so a fire on its last round CAN be hidden by a building at the
   * height cap. Two things make that the right trade rather than a regression, and both are
   * measurements:
   *
   *  - **the cap is not binding in the era this crisis ships in.** `CRISIS_CONTENT_ERAS` is era one
   *    and its tallest placement renders {@link ERA_ONE_TALLEST}u, which `worldLayout.ts` records
   *    and half a dozen files quote. The shortest column out-reaches that with room, measured
   *    below — and it out-reaches it from the smoke's own floor upward, ignoring the four units of
   *    clear air the column starts at, so the real margin is wider than the assertion;
   *  - **the fire it hides is the one there is least to decide about.** A column is findable so a
   *    player can see where their fires are while choosing the next one; the fire with one round
   *    left is the one whose ward is about to lapse anyway.
   *
   * A later era that really does build to the cap and really does run a winter would owe this
   * paragraph a second look. It is recorded here rather than in a work log so the next reader of
   * the findability sweep finds it beside the sweep.
   */
  it("keeps the shortest rung a real column at full zoom-out rather than a smudge", () => {
    const zoomedOut = DEFAULT_DISTANCE * VILLAGE_CAMERA.maxDistanceRatio;
    const pixelsFor = (worldH: number): number =>
      (screenHeight(worldH, GAME_POLAR, zoomedOut) * 580) / FRAME_H;
    // Measured: 42.5px on a 580-tall window at full zoom-out, before the crisis framing's 1.4669x,
    // against era one's tallest roofline at 38.0px in the same view.
    expect(rungPixels(1, zoomedOut)).toBeGreaterThan(30);
    expect(rungPixels(1, zoomedOut)).toBeGreaterThan(pixelsFor(ERA_ONE_TALLEST));
    // AND THE COST IS PINNED AS WELL AS THE FLOOR, in both directions, so the paragraph above
    // cannot quietly stop describing the code: the whole-fuel column still clears the cap and the
    // last rung still does not. A retune that lifted the bottom rung over the cap fails here and
    // brings its author to the trade rather than letting the note rot.
    expect(pixelsFor(COLUMN_HEIGHT)).toBeGreaterThan(pixelsFor(MAX_BUILD_HEIGHT));
    expect(rungPixels(1, zoomedOut)).toBeLessThan(pixelsFor(MAX_BUILD_HEIGHT));
  });

  it("is a bigger read than the flame's by an order of magnitude at the resting camera", () => {
    // WHAT THE MOVE BOUGHT, as one number, because "it is more legible" is the claim and a ratio is
    // the shape of it. The column's travel over the whole ladder against the flame's 11px.
    const travel =
      rungPixels(FUEL_STEPS, DEFAULT_DISTANCE) - rungPixels(1, DEFAULT_DISTANCE);
    expect(travel / FLAME_TRAVEL_PX).toBeGreaterThan(10);
  });
});

describe("a drift stays a drift and does not become the wall", () => {
  it("keeps the batch's cap under a fifth of the shortest building's height on screen", () => {
    // The batch's whole sizing argument: above this a drift eats the wall and the building
    // stops reading as a building. Checked against the SHORTEST era-one placement, which is
    // where the ratio is worst.
    // Measured: 16.4 px against the shortest building's 48.3, so 0.339 of its height.
    const drift = screenHeight(DRIFT_MAX_H, GAME_POLAR);
    const shortest = screenHeight(2.608, GAME_POLAR);
    expect(drift / shortest).toBeLessThan(0.4);
    // ...and it is not vanishing either: a drift the camera cannot see is not a drift.
    expect(drift).toBeGreaterThan(12);
  });
});

describe("the crisis fog is pulled in as far as the dolly allows and no further", () => {
  it("keeps the far plane clear of the worst view distance this camera can reach", () => {
    // THE CONSTRAINT THAT MADE THE BATCH'S 24→68 UNUSABLE. This camera dollies to 2.6x and may
    // pan 0.72 of the island off centre, so something on the island can sit this far in front
    // of it — and a fog far inside that number fogs the island itself out.
    const worst = maxViewDistance(DEFAULT_DISTANCE, SEA_RADIUS, ISLAND_GRASS_RADIUS * 0.72);
    expect(worst).toBeGreaterThan(250);
    const far = ISLAND_GRASS_RADIUS * WINTER_LIGHT.fog.farRatio;
    expect(far).toBeGreaterThan(worst);
    // The batch's literal 68 is inside it, which is the measurement behind the deviation.
    expect(68).toBeLessThan(worst);
  });

  it("still pulls the haze in front of the shore, which is what the batch asked for", () => {
    const near = ISLAND_GRASS_RADIUS * WINTER_LIGHT.fog.nearRatio;
    // Haze starts before the far rim of the buildable settlement rather than past the sea.
    expect(near).toBeLessThan(DEFAULT_DISTANCE - BUILDABLE_RADIUS + BUILDABLE_RADIUS);
    expect(near).toBeLessThan(ISLAND_GRASS_RADIUS * 3);
    expect(near).toBeGreaterThan(ISLAND_GRASS_RADIUS);
  });
});

describe("the overcast rig is the same four lights, re-valued", () => {
  it("tightens the key:fill ratio to about 1.7:1, which is what reads as overcast", () => {
    // THIS RATIO IS THE BATCH'S WHOLE ARGUMENT, and it is the one number to check rather than
    // the hex values: there is nothing here to blur a shadow edge with, so the contrast ratio
    // is the only lever that softens one.
    const fair = resolveLightSpec("day", false);
    const winter = resolveLightSpec("day", true);
    expect(winter.keyIntensity / winter.rimIntensity).toBeGreaterThan(1.5);
    expect(winter.keyIntensity / winter.rimIntensity).toBeLessThan(2);
    expect(winter.keyIntensity / winter.rimIntensity).toBeLessThan(
      fair.keyIntensity / fair.rimIntensity,
    );
    expect(winter.keyIntensity).toBeLessThan(fair.keyIntensity * 0.5);
  });

  it("does NOT raise the absolute fill, because the shipped rig's fill was already higher", () => {
    // The batch says the fill "rises", and against ITS OWN fair baseline (0.28) it does. The
    // rig that actually ships fills at 0.48, so the batch's 0.34 is a 29% DROP in absolute
    // terms — measured here rather than described, because the discrepancy is easy to read as a
    // wiring mistake and it is not one. What the batch is really claiming is the RATIO, and the
    // ratio lands: the shipped rig is 1.32/0.48 = 2.75:1 and the winter is 0.58/0.34 = 1.71:1,
    // against the batch's own 4:1 → 1.7:1. The winter end is exact; only the baseline differed.
    const fair = resolveLightSpec("day", false);
    const winter = resolveLightSpec("day", true);
    expect(winter.rimIntensity).toBeLessThan(fair.rimIntensity);
    expect(fair.keyIntensity / fair.rimIntensity).toBeGreaterThan(2.5);
    expect(fair.keyIntensity / fair.rimIntensity).toBeLessThan(3);
    // And the total does not collapse into dusk, because the AMBIENT takes up the slack — the
    // one term that lifts every unlit face at once. `winterCrisisScene.browser.test.tsx`
    // measures the resulting frame at 0.586–0.610 mean luminance from eight headings.
    expect(winter.ambientIntensity).toBeGreaterThan(fair.ambientIntensity * 1.4);
  });

  it("keeps it a DAYTIME rig, and takes the blue out of the sky rather than the light out", () => {
    const winter = resolveLightSpec("day", true);
    const sky = new THREE.Color(winter.hemiSky);
    const hsl = { h: 0, s: 0, l: 0 };
    sky.getHSL(hsl);
    // Near-neutral and pale: a saturated hemisphere would re-introduce the blue the crisis
    // removes, and a dark one would read as dusk.
    expect(hsl.s).toBeLessThan(0.2);
    expect(hsl.l).toBeGreaterThan(0.75);
    // The exposure pulls the top end down rather than the whole scene.
    expect(WINTER_LIGHT.exposure).toBeGreaterThan(0.8);
    expect(WINTER_LIGHT.exposure).toBeLessThan(1);
  });

  it("adds no light and removes none, because the budget is four scene-wide", () => {
    // Both presets resolve exactly the same four lamps: hemisphere, ambient, key and fill. A
    // fifth would need a new field, so this is the assertion that fails if one appears.
    const fair = resolveLightSpec("day", false);
    const winter = resolveLightSpec("day", true);
    expect(Object.keys(winter).sort()).toEqual(Object.keys(fair).sort());
    expect(Object.keys(winter)).toHaveLength(9);
  });
});
