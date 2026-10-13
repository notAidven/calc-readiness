import { cityRosterNodeIds } from "@cr/game";
import type { EraId } from "@cr/skill-graph";
import type { RefObject } from "react";
import { afterEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { ringLayout } from "../../catchup/ringLayout";
import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { resolveBuildingModel } from "../buildingAssets";
import { eraBuildableDiscRadius, eraCityLayout } from "../islandLand";
import { resolveEraTownHall, TOWN_HALL_CENTER_TRANSFORM, TOWN_HALL_ID } from "../townHall";
import { BUILDABLE_RADIUS, type CityLayout, type PlacedTransform } from "../worldLayout";
import type { OrbitControlsLike } from "./applyOrbit";
import type CityScene from "./CityScene";
import type { ScenePlacement, SceneTownHall } from "./CityScene";

/**
 * **CAN THE LEARNER BUILD ON THE ISLAND THEY ARE LOOKING AT? PHOTOGRAPHED, AT 1024x580.**
 *
 * The spatial half of the buildable-disc fix, and it is owed a rendered frame rather than a
 * dimension: `.cursor/rules/qa-verification.mdc` rules that a claim about *"how much room a
 * thing leaves"* is a claim about a picture, and that a passing layout test says nothing about
 * it. `islandLand.test.ts` proves the disc is 38 at era six and `eraDiscSeatsTheRoster.test.tsx`
 * proves 32 buildings seat on it; neither says whether the city fills the land a learner can see.
 *
 * ## THE VIEWPORT IS HALF THE EVIDENCE, and it is 1024x580
 *
 * The lead reviews in a short window. Every frame below is at **1024x580** and is named as such,
 * from a FIXED-SIZE CONTAINER rather than from `page.viewport` alone — the rule
 * `beatTwoGrowsTheIsland.browser.test.tsx` records, for the CI run where a viewport call leaked
 * into a neighbour's lesson-column measurement.
 *
 * ## BEFORE AND AFTER ARE ONE TREE AND ONE CAMERA
 *
 * "Before" is not the old tree: it is this tree with the defect injected, which is the only way
 * two frames can share a camera exactly. `CityScene` reads `layout.buildableRadius`, so a
 * layout whose disc is overwritten with {@link BUILDABLE_RADIUS} — era one's constant, which is
 * what `isCellBuildable` closed over — reproduces the shipped behaviour precisely: the same
 * `islandRadius`, so the same `cameraDistance` and the same framing, with the placement grid,
 * the decoration floor and the seated city all back on era one's disc.
 *
 * **Framed to show the whole island** rather than cropped to what changed. The claim is about the
 * relationship between the land that is drawn and the land that can be built on, and the surface
 * is the subject: a crop to the settlement would prove nothing about the apron around it.
 *
 * ## ERA ONE MUST NOT MOVE, and this is one of the two proofs
 *
 * `buildableRadiusForLand(30)` is 22 — era one's own disc — so the injection is a no-op there
 * and the two frames must be **byte-identical**. The other proof is arithmetic and lives in
 * `eraOneIslandUnchanged.test.ts`, which digests every mesh position in the island group; this
 * is the picture, and neither substitutes for the other.
 *
 * ## ⚑ OFF BY DEFAULT, on `beatTwoGrowsTheIsland`'s precedent and for its measured reason
 *
 *     VITE_BUILDABLE_DISC_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *       apps/web/src/city/three/buildableDiscOnTheIsland.browser.test.tsx
 *
 * A heavy WebGL scene left always-on in this suite starves a neighbour's timing on a two-core
 * runner rather than failing here — that file records two CI runs where it took a different
 * innocent test down each time. What is NOT gated is every arithmetic claim underneath: the disc
 * per era (`islandLand.test.ts`), the seating (`eraDiscSeatsTheRoster.test.tsx`), the legality of
 * every seat against the shipped gate (`ringLayout.test.ts`), and era one's mesh digest.
 */

/** Off by default; see the header. */
const SHOTS = Boolean(import.meta.env.VITE_BUILDABLE_DISC_SHOTS);

async function loadScene(): Promise<typeof CityScene> {
  return (await import("./CityScene")).default;
}

/** The lead's window, and the only one measured here. */
const LEAD_WINDOW = { width: 1024, height: 580 } as const;
const CANVAS_WAIT_MS = 20000;
const SHOT_TEST_TIMEOUT_MS = 240000;
const STAGE_ID = "buildable-disc-stage";

/**
 * The eras photographed, and why these two.
 *
 * **Era six is the demo's own age** and the case the whole change is for: 32 buildings against
 * 19, on a disc of 38 against 22. **Era one is the control**, where the disc does not move and
 * the two frames have to come back identical.
 */
const SHOWN = [
  { eraId: "prehistoric", control: true },
  { eraId: "renaissance", control: false },
] as const satisfies readonly { eraId: EraId; control: boolean }[];

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

type Sample = { data: Uint8ClampedArray; width: number; height: number; png: string };

const HALL: PlacedTransform = { nodeId: TOWN_HALL_ID, ...TOWN_HALL_CENTER_TRANSFORM };

/** The city an era's roster seats on a disc, as the scene's own placement descriptors. */
function cityOn(eraId: EraId, buildableRadius: number): readonly ScenePlacement[] {
  const seated = ringLayout({
    nodeIds: [...cityRosterNodeIds(eraId)],
    reserved: [HALL],
    buildableRadius,
  });
  return seated.placed.map((seat) => ({
    nodeId: seat.nodeId,
    col: seat.col,
    row: seat.row,
    rot: seat.rot,
    model: resolveBuildingModel(seat.nodeId, "built"),
    mastery: 2,
    celebrateToken: 0,
  }));
}

function hallFor(eraId: EraId): SceneTownHall {
  return {
    ...TOWN_HALL_CENTER_TRANSFORM,
    model: resolveEraTownHall(eraId, "prehistoric").model,
    celebrateToken: 0,
  };
}

/**
 * The shipped scene, filling the lead's window exactly.
 *
 * `position: fixed` at the origin rather than a flowed box: the capture is clipped to the tester
 * iframe, so the canvas has to BE that rectangle or every edge measured is the page's margin.
 */
function Host({
  Scene,
  eraId,
  layout,
  placed,
  controlsRef,
}: {
  readonly Scene: typeof CityScene;
  readonly eraId: EraId;
  readonly layout: CityLayout;
  readonly placed: readonly ScenePlacement[];
  readonly controlsRef: RefObject<OrbitControlsLike | null>;
}) {
  return (
    <div
      id={STAGE_ID}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: LEAD_WINDOW.width,
        height: LEAD_WINDOW.height,
        overflow: "hidden",
      }}
    >
      <Scene
        layout={layout}
        placed={placed}
        townHall={hallFor(eraId)}
        variant="day"
        reducedMotion
        controlsRef={controlsRef}
        onSelect={() => undefined}
        eraId={eraId}
      />
    </div>
  );
}

function stageBox(): { x: number; y: number; width: number; height: number } {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const stage = document.getElementById(STAGE_ID);
  if (!stage) {
    throw new Error("the scene's container is not mounted, so there is nothing to clip to");
  }
  const frame = frameElement.getBoundingClientRect();
  if (Math.abs(frame.width - window.innerWidth) > 2) {
    throw new Error(
      `the tester iframe is scaled (${frame.width}px of page for ${window.innerWidth}px of ` +
        "document), so a clip in CSS pixels would not be one in page pixels",
    );
  }
  if (frame.width < LEAD_WINDOW.width || frame.height < LEAD_WINDOW.height) {
    throw new Error(
      `the browser window is ${frame.width}x${frame.height}, smaller than the ` +
        `${LEAD_WINDOW.width}x${LEAD_WINDOW.height} this file photographs`,
    );
  }
  const inner = stage.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: frame.left + outer.scrollX + inner.left,
    y: frame.top + outer.scrollY + inner.top,
    width: inner.width,
    height: inner.height,
  };
}

/**
 * The composited frame, clipped to the scene's own container, as a base64 PNG.
 *
 * CDP rather than reading the canvas back: the shipped `Canvas` carries no
 * `preserveDrawingBuffer`, so its buffer is cleared between the draw and any sample. Adding the
 * flag would photograph a canvas configured differently from the one the game ships.
 */
async function capture(): Promise<string> {
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const box = stageBox();
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
  });
  if (!shot.data) {
    throw new Error("CDP returned no screenshot data");
  }
  return shot.data;
}

async function decode(base64: string): Promise<Sample> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("the screenshot did not decode"));
    image.src = `data:image/png;base64,${base64}`;
  });
  const sink = document.createElement("canvas");
  sink.width = image.naturalWidth;
  sink.height = image.naturalHeight;
  const ctx = sink.getContext("2d");
  if (!ctx) {
    throw new Error("no 2D context to sample the frame with");
  }
  ctx.drawImage(image, 0, 0);
  return {
    data: ctx.getImageData(0, 0, sink.width, sink.height).data,
    width: sink.width,
    height: sink.height,
    png: base64,
  };
}

function differingPixels(a: Sample, b: Sample): number {
  let differing = 0;
  for (let at = 0; at < a.data.length; at += 4) {
    if (
      Math.abs((a.data[at] ?? 0) - (b.data[at] ?? 0)) > 2 ||
      Math.abs((a.data[at + 1] ?? 0) - (b.data[at + 1] ?? 0)) > 2 ||
      Math.abs((a.data[at + 2] ?? 0) - (b.data[at + 2] ?? 0)) > 2
    ) {
      differing += 1;
    }
  }
  return differing;
}

/**
 * The island's own box on screen — every pixel that is NOT sky and NOT lagoon.
 *
 * Warm against blue-dominant, which is the one classification these frames make unambiguous:
 * the sky is a pale blue gradient and the lagoon a teal ramp, while era six's ground, its sand,
 * its buildings and its scrub are all warm. It is the CONTROL rather than the claim — the two
 * frames share a camera and an island radius, so this box must be identical in both, and
 * anything that did move is therefore the city.
 */
function islandBox(frame: Sample): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  pixels: number;
} {
  const { width, height, data } = frame;
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  let pixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 4;
      if ((data[at + 2] ?? 0) > (data[at] ?? 0) + 4) {
        continue;
      }
      pixels += 1;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return { left, right, top, bottom, pixels };
}

/**
 * How much BARE GROUND is left on the island, in pixels.
 *
 * Self-calibrating rather than a colour threshold: the island's bare ground is by a long way
 * the commonest warm tone in the frame, so the modal 16-step colour bucket IS the ground, and
 * counting it needs no per-era palette. Measured on the before frame at era six the mode holds
 * 183,462 of 242,343 warm pixels — three quarters of the island is empty.
 *
 * This is the measurement the claim actually needs. A count of BUILDING pixels would rise for a
 * city that merely got taller or moved nearer the camera; ground that stops being bare is
 * ground the settlement now stands on.
 */
function bareGround(frame: Sample, bucket: string): number {
  const { width, height, data } = frame;
  let bare = 0;
  for (let i = 0; i < width * height; i += 1) {
    const at = i * 4;
    const r = data[at] ?? 0;
    const g = data[at + 1] ?? 0;
    const b = data[at + 2] ?? 0;
    if (b > r + 4) {
      continue;
    }
    if (`${r >> 4},${g >> 4},${b >> 4}` === bucket) {
      bare += 1;
    }
  }
  return bare;
}

/** The commonest warm colour bucket in a frame — the island's bare ground. */
function groundBucket(frame: Sample): string {
  const { width, height, data } = frame;
  const counts = new Map<string, number>();
  for (let i = 0; i < width * height; i += 1) {
    const at = i * 4;
    const r = data[at] ?? 0;
    const g = data[at + 1] ?? 0;
    const b = data[at + 2] ?? 0;
    if (b > r + 4) {
      continue;
    }
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = "";
  let most = 0;
  for (const [key, count] of counts) {
    if (count > most) {
      best = key;
      most = count;
    }
  }
  return best;
}

/** The box the two frames differ in — where on the island the change actually landed. */
function changedBox(
  a: Sample,
  b: Sample,
): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  pixels: number;
} {
  let left = a.width;
  let right = -1;
  let top = a.height;
  let bottom = -1;
  let pixels = 0;
  for (let y = 0; y < a.height; y += 1) {
    for (let x = 0; x < a.width; x += 1) {
      const at = (y * a.width + x) * 4;
      if (
        Math.abs((a.data[at] ?? 0) - (b.data[at] ?? 0)) <= 2 &&
        Math.abs((a.data[at + 1] ?? 0) - (b.data[at + 1] ?? 0)) <= 2 &&
        Math.abs((a.data[at + 2] ?? 0) - (b.data[at + 2] ?? 0)) <= 2
      ) {
        continue;
      }
      pixels += 1;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return { left, right, top, bottom, pixels };
}

async function keep(name: string, frame: Sample): Promise<void> {
  if (SHOTS) {
    await commands.writeFile(
      `docs/design-refs/buildable-disc-follows-the-island/${name}.png`,
      frame.png,
      { encoding: "base64" },
    );
  }
}

/**
 * **HOW LONG A FRAME TAKES, timed on the shipped canvas.**
 *
 * The cost this change adds is BUILDINGS on frames the island already pays for, and the honest
 * measurement of that is the frame, not a mesh count. #537's 2600 is an ISLAND mesh ceiling and
 * `islandMeshBudget.test.ts` holds this change to it directly, off the same builder — it is the
 * cheaper measurement and it is the one the budget is about.
 *
 * This is the other half: the wall clock. Timed over `FRAME_SAMPLES` animation frames with the
 * scene live and settled, reported as the median so one scheduler hiccup cannot move it.
 *
 * **A live scene's node count is not reachable from here**, which is why this is a clock rather
 * than a census: R3F v9 keeps its store in a module-private map rather than on the canvas, the
 * default camera is not parented into the scene, and this file's `three` is a different module
 * instance from the one the pre-bundled `@react-three/fiber` renders with (the "Multiple
 * instances of Three.js" warning the whole browser suite prints), so neither the DOM, the
 * controls' camera, nor a patched `WebGLRenderer.prototype.render` reaches it. All three were
 * tried and all three came back empty.
 */
const FRAME_SAMPLES = 60;

async function frameMillis(): Promise<number> {
  const marks: number[] = [];
  await new Promise<void>((resolve) => {
    let last = performance.now();
    let taken = 0;
    const step = () => {
      const now = performance.now();
      marks.push(now - last);
      last = now;
      taken += 1;
      if (taken >= FRAME_SAMPLES) {
        resolve();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const sorted = [...marks].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/** Mount one era's scene once, and re-render it between captures. */
async function sceneFor(eraId: EraId): Promise<{
  at: (buildableRadius: number) => Promise<{ frame: Sample; frameMs: number }>;
}> {
  const Scene = await loadScene();
  const controlsRef: RefObject<OrbitControlsLike | null> = { current: null };
  await page.viewport(LEAD_WINDOW.width, LEAD_WINDOW.height);
  h?.cleanup();
  const render = (buildableRadius: number) => (
    <Host
      Scene={Scene}
      eraId={eraId}
      // THE ONLY THING THAT CHANGES between the two frames. Same island radius, so the same
      // camera distance and the same framing; the disc drives the grid, the decoration floor
      // and the ground the city was seated on.
      layout={{ ...eraCityLayout(eraId), buildableRadius }}
      placed={cityOn(eraId, buildableRadius)}
      controlsRef={controlsRef}
    />
  );
  const harness = mount(render(BUILDABLE_RADIUS));
  h = harness;
  await waitFor(
    () => document.querySelector("canvas") !== null,
    `the scene never mounted for ${eraId}`,
    CANVAS_WAIT_MS,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 2500));
  // A throwaway capture first: a clipped `Page.captureScreenshot` puts a device-metrics
  // override on the page, which R3F reads as a resize and re-renders through.
  await capture();

  return {
    at: async (buildableRadius) => {
      harness.root.render(render(buildableRadius));
      await new Promise<void>((resolve) => setTimeout(resolve, 1200));
      let previous = await decode(await capture());
      for (let attempt = 0; attempt < 24; attempt += 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, 250));
        const next = await decode(await capture());
        if (differingPixels(previous, next) === 0) {
          return { frame: next, frameMs: await frameMillis() };
        }
        previous = next;
      }
      throw new Error(
        `the frame never settled for ${eraId} at disc ${buildableRadius}, so nothing ` +
          "measured here is repeatable",
      );
    },
  };
}

test("photographs the lead's own short window, on eras whose discs really differ", () => {
  expect(`${LEAD_WINDOW.width}x${LEAD_WINDOW.height}`).toBe("1024x580");
  // A FLOOR under the whole file: the control era's disc really does not move and the demo
  // era's really does, so neither frame pair below can be satisfied by a constant.
  expect(eraBuildableDiscRadius("prehistoric")).toBe(BUILDABLE_RADIUS);
  expect(eraBuildableDiscRadius("renaissance")).toBe(38);
  expect(cityOn("prehistoric", BUILDABLE_RADIUS)).toHaveLength(6);
  expect(cityOn("renaissance", BUILDABLE_RADIUS)).toHaveLength(19);
  expect(cityOn("renaissance", eraBuildableDiscRadius("renaissance"))).toHaveLength(32);
});

for (const shown of SHOWN) {
  const at = `${shown.eraId} at ${LEAD_WINDOW.width}x${LEAD_WINDOW.height}`;
  test.runIf(SHOTS)(
    shown.control
      ? `era one does not move, byte for byte — ${at}`
      : `the city fills the land it is drawn on — ${at}`,
    async () => {
      const disc = eraBuildableDiscRadius(shown.eraId);
      const scene = await sceneFor(shown.eraId);

      const opening = await scene.at(BUILDABLE_RADIUS);
      const before = opening.frame;
      await keep(`before-${shown.eraId}-1024x580`, before);
      const closing = await scene.at(disc);
      const after = closing.frame;
      await keep(`after-${shown.eraId}-1024x580`, after);

      /*
       * ⚑ WHAT THE EXTRA BUILDINGS COST A FRAME — asserted as a RATIO, and the absolute
       * numbers are reported rather than pinned.
       *
       * The absolutes here are SwiftShader's: this runs in a headless Chromium on a shared CI
       * VM with no GPU, and era six's island draws in about 200ms there against the 15-60ms
       * `CeremonyLayer.tsx` measured in a real Chromium. A 60fps threshold taken on this
       * hardware would be a promise the measurement cannot keep, in either direction — it would
       * fail a scene that runs fine, and it would pass one that had regressed tenfold on a
       * machine ten times faster.
       *
       * What transfers is the MULTIPLE: thirteen more buildings against nineteen is 68% more
       * city, and the frame it costs is the number the demo cares about. Measured at
       * **1.16x** — the buildings are a small share of a frame the island and its shadow pass
       * dominate. The bar is set at 1.6x, well clear of the reading, so it fails a change that
       * makes the extra buildings cost more than the ones already there and tolerates the
       * scheduler noise a median over sixty frames still carries.
       */
      const frameRatio = closing.frameMs / opening.frameMs;
      expect(
        frameRatio,
        `${shown.eraId} draws a frame in ${closing.frameMs.toFixed(1)}ms after against ` +
          `${opening.frameMs.toFixed(1)}ms before (${frameRatio.toFixed(2)}x) for 68% more ` +
          "buildings, in a software-rendered headless Chromium",
      ).toBeLessThan(1.6);

      const differing = differingPixels(before, after);
      const whole = before.width * before.height;

      if (shown.control) {
        // The control era's frame cost must not move either, since nothing about it changed.
        expect(
          closing.frameMs / opening.frameMs,
          `era one's frame went ${opening.frameMs.toFixed(1)}ms to ${closing.frameMs.toFixed(1)}ms`,
        ).toBeLessThan(1.6);
        // ERA ONE, BYTE FOR BYTE. `buildableRadiusForLand(30)` is 22, so the injection is a
        // no-op here and the two renders must agree exactly — same grid, same decoration floor,
        // same six buildings on the same cells.
        expect(disc).toBe(BUILDABLE_RADIUS);
        expect(
          differing,
          `era one moved by ${differing} of ${whole} pixels at 1024x580`,
        ).toBe(0);
        return;
      }

      /*
       * THE DEMO ERA. Three measurements, and the first is the CONTROL that makes the other two
       * mean anything: the island's own box on screen is identical, so the camera did not move,
       * the drawn land did not move, and everything that changed is the city.
       */
      const landBefore = islandBox(before);
      const landAfter = islandBox(after);
      expect(landAfter.left).toBe(landBefore.left);
      expect(landAfter.right).toBe(landBefore.right);
      expect(landAfter.bottom).toBe(landBefore.bottom);
      expect(landBefore.pixels).toBeGreaterThan(100_000);

      // THE CLAIM: bare ground stops being bare. Three quarters of era six's island was empty
      // grey before, and the settlement now covers a real share of what was left.
      const bucket = groundBucket(before);
      const bareBefore = bareGround(before, bucket);
      const bareAfter = bareGround(after, bucket);
      expect(
        bareBefore,
        "the before frame has an island of bare ground to cover",
      ).toBeGreaterThan(landBefore.pixels * 0.5);
      expect(
        1 - bareAfter / bareBefore,
        `the settlement covers ${(((bareBefore - bareAfter) / bareBefore) * 100).toFixed(1)}% ` +
          "more of the island's bare ground",
      ).toBeGreaterThan(0.25);

      // AND IT REACHES OUT, which the coverage alone would not say: a city that merely got
      // denser in the middle would cover ground too. The change spans most of the island's own
      // width, so the new buildings are out towards the shoreline.
      const changed = changedBox(after, before);
      expect(
        (changed.right - changed.left) / (landBefore.right - landBefore.left),
        `the change spans ${changed.right - changed.left}px of the island's ` +
          `${landBefore.right - landBefore.left}px`,
      ).toBeGreaterThan(0.7);

      if (SHOTS) {
        await commands.writeFile(
          `docs/design-refs/buildable-disc-follows-the-island/measured-${shown.eraId}-1024x580.txt`,
          [
            `era                  ${shown.eraId}`,
            `viewport             ${LEAD_WINDOW.width}x${LEAD_WINDOW.height}`,
            `drawn grass radius   ${eraCityLayout(shown.eraId).islandRadius}`,
            `disc before          ${BUILDABLE_RADIUS}`,
            `disc after           ${disc}`,
            `buildings before     ${cityOn(shown.eraId, BUILDABLE_RADIUS).length}`,
            `buildings after      ${cityOn(shown.eraId, disc).length}`,
            `island box           ${landBefore.left}..${landBefore.right} x ` +
              `${landBefore.top}..${landBefore.bottom} (identical in both)`,
            `island pixels        ${landBefore.pixels} before, ${landAfter.pixels} after`,
            `bare ground          ${bareBefore} before, ${bareAfter} after ` +
              `(${(((bareBefore - bareAfter) / bareBefore) * 100).toFixed(1)}% newly built on)`,
            `frame pixels moved   ${differing} of ${whole} ` +
              `(${((differing / whole) * 100).toFixed(2)}%)`,
            `change box           ${changed.left}..${changed.right} x ${changed.top}..` +
              `${changed.bottom}, ${changed.pixels} px`,
            `median frame         ${opening.frameMs.toFixed(2)}ms before, ` +
              `${closing.frameMs.toFixed(2)}ms after ` +
              `(${(closing.frameMs / opening.frameMs).toFixed(2)}x over ${FRAME_SAMPLES} frames, ` +
              "software-rendered headless Chromium — the RATIO is the transferable figure)",
            "",
          ].join("\n"),
          { encoding: "utf-8" },
        );
      }
    },
    SHOT_TEST_TIMEOUT_MS,
  );
}
