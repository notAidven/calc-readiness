import { ContactShadows } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { TitleScreen } from "../../TitleScreen";
import { type CityLayout, SURFACE_Y } from "../worldLayout";

import "../../styles.css";
import { CityLighting, cityEnvironment } from "./CityLighting";
import { applyCityFraming, islandFraming } from "./cityFraming";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { StarterIsland } from "./StarterIsland";
import { cameraAt, titleBackdropLayout } from "./TitleBackdrop";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * **IS THE TITLE SCREEN A PICTURE OF AN ISLAND? PHOTOGRAPHED, NOT CALCULATED.**
 *
 * `titleBackdropFraming.test.ts` measures the projection and every assertion in it passes at the
 * framing that shipped as well as at this one — which is exactly the trap, because the question
 * here is a COMPOSITION one and no amount of arithmetic answers it. #419 declined to fit this
 * canvas precisely because a title screen may want its subject cropped and looming, and the only
 * way to settle whether this crop was composition or accident was to look at both.
 *
 * So this renders the real island through the real backdrop camera on a real GPU and asks the
 * two questions that decide it:
 *
 *  - **is there lagoon all the way round the island** — the canvas on its own, before and after,
 *    at two viewports and two island radii;
 *  - **and can you see the island AROUND THE MENU CARD** — because the card is centred and
 *    opaque, so an island fitted to the frame is an island fitted BEHIND a card, and a frame
 *    cropped to the canvas alone would prove nothing about that. The card's box is read off the
 *    real `TitleScreen` through the shipped stylesheet, and the land is measured against it.
 *
 * ## THE VIEWPORTS, AND WHAT EACH IS FOR
 *
 *  - **1024x580**, the lead's own window and where #419 found the defect. Short, and exact here:
 *    the tester iframe is 1024x580 at `dpr` 1, so one canvas pixel is one CSS pixel;
 *  - **1440x900**, a roomy laptop, because a fix for a short window that ruins a tall one is not
 *    a fix. The overflow is the SAME FRACTION at both — a perspective camera's vertical frustum
 *    is an angle, not a pixel count — so this is the same defect with more room round it.
 *
 * ## AND IT IS SHOT UNDER REDUCED MOTION, BEHIND A STABILITY GATE
 *
 * The island's gulls run on the render clock and are worth up to 0.88% whole-frame pixel noise,
 * which is enough to make a frame comparison both hollow and flaky. Under `reducedMotion` they
 * are posed once and held, and the gate below requires two consecutive captures to be
 * pixel-identical before anything is measured — which also catches a frame taken before the
 * first real draw.
 *
 * The PNGs land under `__screenshots__/`, which `.gitignore` excludes for the whole tree.
 * Regenerate them with
 *
 *   npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/city/three/titleBackdropFraming.browser.test.tsx
 *
 * and read them out of `apps/web/src/city/three/__screenshots__/title-framing/`.
 */

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
/**
 * The renderer of the canvas currently mounted, so its GL context can be HANDED BACK.
 *
 * Chromium caps the live WebGL contexts per process and evicts the oldest when the cap is hit.
 * This file mounts a dozen canvases, and unmounting React does not free the context on its own:
 * measured, the twelfth mount logged *"THREE.WebGLRenderer: Context Lost"* and the frame it had
 * just been handed was somebody else's. `forceContextLoss` gives it back explicitly.
 */
let live: THREE.WebGLRenderer | null = null;

async function release(): Promise<void> {
  if (live) {
    live.forceContextLoss();
    live.dispose();
    live = null;
  }
  // `TitleScreen` owns its renderer privately (the backdrop is `React.lazy`-d and builds its own
  // `<Canvas>`), so that one is handed back through the canvas instead of the renderer.
  for (const canvas of document.querySelectorAll("canvas")) {
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    (gl as WebGL2RenderingContext | null)
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
  }
  h?.cleanup();
  h = null;
  /*
   * AND THEN YIELD, because `loseContext()` QUEUES the loss rather than performing it:
   * `webglcontextlost` is dispatched on a later task and the driver's context is not handed back
   * until it has been. Mounting the next canvas in the same task therefore asks for a context
   * while the one before it is still counted, which walks this file straight into the cap the
   * note above records — observed on the runner as `waitFor timed out: the canvas never created`
   * on the LAST of the four frames, the heaviest, with `locator.screenshot: Timeout 5000ms
   * exceeded` in the same log. A frame and a task is all it needs, and a healthy run pays about a
   * millisecond for it.
   */
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

const FOV = 32;
const ERA_ONE = titleBackdropLayout();
const GROWN_RADIUS = 46;

/**
 * The grown island's LAGOON is scaled here, by hand, and `titleBackdropLayout` deliberately does
 * not do it.
 *
 * D-ERA26 makes the shore per-era art and `computeCityLayout` refuses to derive `seaRadius` from
 * the grass radius, so a layout that scaled it would be inventing a shoreline for eras that have
 * not authored one. But a lagoon left at 58 around a grass disc of 46 photographs the MISSING
 * SHORE ART rather than the framing — the frustum scales with the island, so the water's own rim
 * would be in the frame. Scaling it here keeps this file's subject the camera.
 */
const GROWN: CityLayout = {
  ...titleBackdropLayout(GROWN_RADIUS),
  seaRadius: (ERA_ONE.seaRadius * GROWN_RADIUS) / ERA_ONE.islandRadius,
};

const SHORT_LAPTOP = { width: 1024, height: 580 } as const;
const LAPTOP = { width: 1440, height: 900 } as const;
const VIEWPORTS = [SHORT_LAPTOP, LAPTOP] as const;

const ISLANDS = [
  { label: "grass-30", layout: ERA_ONE },
  { label: `grass-${GROWN_RADIUS}`, layout: GROWN },
] as const;

const CANVAS_WAIT_MS = 15000;
const SHOT_TEST_TIMEOUT_MS = 120000;

interface Session {
  send: (method: string, params?: Record<string, unknown>) => Promise<{ data?: string }>;
}

function session(): Session {
  return cdp() as unknown as Session;
}

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  // The title screen honours `prefers-reduced-motion` end to end (`useReducedMotion` →
  // `TitleBackdrop`), so emulating the real media query is what freezes the gulls and the
  // ambient orbit rather than a prop the product does not set.
  await session().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
});

afterAll(async () => {
  await session().send("Emulation.setEmulatedMedia", { features: [] });
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(release);

/** Applies the backdrop's framing to the live camera, exactly as `BackdropFrame` does. */
function Framing({ layout, on }: { layout: CityLayout; on: boolean }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) {
      return;
    }
    const view = { width: size.width, height: size.height };
    const framing = on ? islandFraming({ view, layout, fov: FOV }) : null;
    applyCityFraming(camera, framing, view);
  }, [camera, layout, on, size.width, size.height]);
  return null;
}

interface Frame {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly triangles: number;
  readonly png: string;
}

function read(canvas: HTMLCanvasElement): { data: Uint8ClampedArray; png: string } {
  const sink = document.createElement("canvas");
  sink.width = canvas.width;
  sink.height = canvas.height;
  const ctx = sink.getContext("2d");
  if (!ctx) {
    throw new Error("no 2D context to sample the frame with");
  }
  ctx.drawImage(canvas, 0, 0);
  return {
    data: ctx.getImageData(0, 0, sink.width, sink.height).data,
    png: sink.toDataURL("image/png").split(",")[1] ?? "",
  };
}

function differingPixels(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let differing = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (
      Math.abs((a[i] ?? 0) - (b[i] ?? 0)) > 2 ||
      Math.abs((a[i + 1] ?? 0) - (b[i + 1] ?? 0)) > 2 ||
      Math.abs((a[i + 2] ?? 0) - (b[i + 2] ?? 0)) > 2
    ) {
      differing += 1;
    }
  }
  return differing;
}

/**
 * One settled frame of the backdrop's island, at the given canvas size, framed or not.
 *
 * `dpr={1}` so one canvas pixel is one CSS pixel and the measurements below can be read against
 * `titleBackdropFraming.test.ts`'s CSS-pixel predictions with no conversion in between. The
 * camera, the fov, the fog and the contact shadow are `TitleBackdrop`'s — the position comes
 * from its own exported `cameraAt` — so this is the shipped canvas and not a second description
 * of it.
 *
 * THE SIZE COMES FROM A FIXED-SIZE CONTAINER AND NOT FROM `page.viewport`, which is a fix for a
 * measured problem: vitest scales the tester iframe when the requested viewport is larger than
 * the window it is given, so a 1440x900 request comes back visually scaled. A container the
 * canvas simply fills gives the frame the size this file names at either viewport, and the
 * caller asserts that it did.
 */
async function frameOf(
  view: { readonly width: number; readonly height: number },
  layout: CityLayout,
  framed: boolean,
): Promise<Frame> {
  let gl: THREE.WebGLRenderer | null = null;
  let cam: THREE.Camera | null = null;
  const env = cityEnvironment("day");
  await release();
  h = mount(
    <div style={{ width: view.width, height: view.height, overflow: "hidden" }}>
      <Canvas
        shadows
        dpr={1}
        camera={{
          position: cameraAt(layout, VILLAGE_CAMERA.azimuthAngle),
          fov: FOV,
          near: 0.1,
          far: layout.islandRadius * 40,
        }}
        // Kept so the frame can be READ BACK; without it the buffer is cleared between the draw
        // and the sample and every measurement here is of an empty canvas.
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          gl = state.gl;
          cam = state.camera;
          live = state.gl;
          state.gl.toneMapping = THREE.ACESFilmicToneMapping;
          state.gl.toneMappingExposure = 1;
        }}
      >
        <color attach="background" args={[env.background]} />
        <fog
          attach="fog"
          args={[env.fog, layout.islandRadius * 3, layout.islandRadius * 20]}
        />
        <CityLighting islandRadius={layout.islandRadius} variant="day" />
        <StarterIsland layout={layout} reducedMotion />
        <ContactShadows
          position={[0, SURFACE_Y + 0.02, 0]}
          scale={layout.islandRadius * 2.2}
          blur={2.6}
          far={16}
          opacity={0.34}
          color="#1d4b46"
          frames={1}
        />
        <Framing layout={layout} on={framed} />
      </Canvas>
    </div>,
  );

  await waitFor(
    () => gl !== null && cam !== null,
    "the canvas never created",
    CANVAS_WAIT_MS,
  );
  const renderer = gl as unknown as THREE.WebGLRenderer;
  const camera = cam as unknown as THREE.PerspectiveCamera;
  await waitFor(
    () => renderer.info.render.triangles > 0,
    "the renderer submitted nothing",
    CANVAS_WAIT_MS,
  );

  /*
   * **THE LENS IS ON THE CAMERA, AND A FRAME HAS BEEN DRAWN THROUGH IT.**
   *
   * The stability loop below is necessary and, on its own, VACUOUS — and it was found that way
   * on a runner rather than argued. `Framing` applies the view offset in an effect and asks for a
   * frame; `triangles > 0` goes true before either has happened, so under starvation the two
   * captures can be pixel-identical because they are two copies of the UNFRAMED picture, and the
   * "after" frame is then the "before" frame. CI reported it as
   * `the island runs off the bottom edge, grass-46 at 1024x580: expected 1 to be greater than
   * 11.6` — one pixel of lagoon under the island is the unframed reading exactly — on a run whose
   * log also carries `locator.screenshot: Timeout 5000ms exceeded`.
   *
   * `setViewOffset` sets `camera.view.enabled` and `clearViewOffset` clears it, so the lens is
   * directly observable, and BOTH directions are asserted: an unframed capture that quietly
   * carried the offset is the same defect mirrored. Then frames are counted rather than slept
   * for, and three.js increments that counter AFTER its lost-context early return, so a lost
   * context stalls here and says so instead of handing back a stale buffer to measure.
   *
   * `cityFraming.browser.test.tsx` carries the identical gate for the identical reason.
   */
  await waitFor(
    () => (camera.view?.enabled ?? false) === framed,
    `the camera's view offset never reached ${framed}, so the frame is not the one this measures`,
    CANVAS_WAIT_MS,
  );
  const applied = renderer.info.render.frame;
  await waitFor(
    () => renderer.info.render.frame >= applied + 2,
    `the render loop stalled at frame ${applied}: no frame was drawn through the lens`,
    CANVAS_WAIT_MS,
  );

  let previous = read(renderer.domElement);
  let settled: { data: Uint8ClampedArray; png: string } | null = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    const next = read(renderer.domElement);
    if (differingPixels(previous.data, next.data) === 0) {
      settled = next;
      break;
    }
    previous = next;
  }
  if (!settled) {
    throw new Error("the frame never settled, so nothing measured here is repeatable");
  }
  return {
    data: settled.data,
    png: settled.png,
    width: renderer.domElement.width,
    height: renderer.domElement.height,
    triangles: renderer.info.render.triangles,
  };
}

async function keep(name: string, png: string): Promise<void> {
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `apps/web/src/city/three/__screenshots__/title-framing/${name}.png`,
      png,
      { encoding: "base64" },
    );
  }
}

interface LandMass {
  top: number;
  bottom: number;
  left: number;
  right: number;
  pixels: number;
  masses: number;
  /** Every row the mass touches, so "is there land above the card" is answerable. */
  rows: Set<number>;
}

/**
 * WHERE THE LAND IS, read off a frame — as the LARGEST CONNECTED MASS of it.
 *
 * A land pixel is one whose green beats its blue. The sky and the lagoon are both cool; the
 * island's tussock, earth and sand are all warm, so this separates them with no per-material
 * threshold to keep in sync with the art, and 12 keeps the wet gravel at the waterline on the
 * land side while leaving the deepest lagoon tone well clear.
 *
 * **AND THE EXTREMES ARE TAKEN OVER ONE CONNECTED MASS, WHICH IS NOT FUSSINESS.** A bounding box
 * over every warm pixel measures the GULLS — their beaks are orange, and one bird clipped by a
 * corner puts `top` at 0 in a frame whose island has a hundred pixels of water on every side.
 * The menu card's gold Start button is warm too. A flood fill answers both, because a bird over
 * water and a button on a cream card are each their own component. The mass's own pixel count is
 * returned so a classifier that matched almost nothing cannot satisfy any assertion here.
 */
function landMass(frame: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}): LandMass {
  const { width, height, data } = frame;
  const land = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const at = i * 4;
    land[i] = (data[at + 1] ?? 0) - (data[at + 2] ?? 0) > 12 ? 1 : 0;
  }
  let best: LandMass = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    pixels: 0,
    masses: 0,
    rows: new Set<number>(),
  };
  let masses = 0;
  const stack: number[] = [];
  for (let seed = 0; seed < land.length; seed += 1) {
    if (land[seed] !== 1) {
      continue;
    }
    masses += 1;
    let top = height;
    let bottom = -1;
    let left = width;
    let right = -1;
    let pixels = 0;
    const rows = new Set<number>();
    stack.push(seed);
    land[seed] = 2;
    while (stack.length > 0) {
      const at = stack.pop() as number;
      const x = at % width;
      const y = (at - x) / width;
      pixels += 1;
      rows.add(y);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
      for (const next of [
        x > 0 ? at - 1 : -1,
        x < width - 1 ? at + 1 : -1,
        y > 0 ? at - width : -1,
        y < height - 1 ? at + width : -1,
      ]) {
        if (next >= 0 && land[next] === 1) {
          land[next] = 2;
          stack.push(next);
        }
      }
    }
    if (pixels > best.pixels) {
      best = { top, bottom, left, right, pixels, masses: 0, rows };
    }
  }
  return { ...best, masses };
}

test("photographs the short window the defect was found at, and a roomy one", () => {
  expect(VIEWPORTS.map((v) => `${v.width}x${v.height}`)).toEqual(["1024x580", "1440x900"]);
  expect(Math.min(...VIEWPORTS.map((v) => v.height))).toBeLessThanOrEqual(580);
  // Two radii, and the grown one is bigger, so the growth claim has something to be about.
  expect(ISLANDS).toHaveLength(2);
  expect(GROWN.islandRadius).toBeGreaterThan(ERA_ONE.islandRadius);
  expect(GROWN.cameraDistance).toBeGreaterThan(ERA_ONE.cameraDistance);
});

for (const island of ISLANDS) {
  for (const view of VIEWPORTS) {
    const at = `${island.label} at ${view.width}x${view.height}`;
    test(
      `there is lagoon all the way round the backdrop's island — ${at}`,
      async () => {
        /*
         * THE CROP FIRST, AS A PHOTOGRAPH AND AS PIXELS. The "after" frame alone proves nothing:
         * an island drawn correctly by accident and one drawn correctly by this change look
         * identical, and only the pair says which happened.
         */
        const before = await frameOf(view, island.layout, false);
        await keep(`before-${island.label}-${view.width}x${view.height}`, before.png);
        expect(before.triangles, `nothing was drawn, ${at}`).toBeGreaterThan(1000);
        // The frame really is the size this test names, rather than an iframe-scaled stand-in.
        expect(before.width, at).toBe(view.width);
        expect(before.height, at).toBe(view.height);
        const cropped = landMass(before);
        expect(cropped.pixels, `no island in the frame at all, ${at}`).toBeGreaterThan(
          20000,
        );
        expect(
          cropped.bottom,
          `the island already clears the bottom edge unframed, so there is nothing to fix — ${at}`,
        ).toBe(before.height - 1);

        const after = await frameOf(view, island.layout, true);
        await keep(`after-${island.label}-${view.width}x${view.height}`, after.png);
        expect(after.triangles, `nothing was drawn, ${at}`).toBeGreaterThan(1000);
        const land = landMass(after);

        /*
         * A FLOOR, so nothing below is vacuous: a frame with no island in it satisfies "there is
         * lagoon on all four sides" perfectly. Measured, these frames carry well over a hundred
         * thousand land pixels in the island's own mass, so this is a floor and not a target.
         */
        expect(land.pixels, `no island in the frame at all, ${at}`).toBeGreaterThan(20000);

        // THE CLAIM: water on every side, at the margin the fit was sized for.
        const margin = Math.min(after.width, after.height) * 0.02;
        expect(land.top, `the island is cut off at the top, ${at}`).toBeGreaterThan(margin);
        expect(
          after.height - land.bottom,
          `the island runs off the bottom edge, ${at}`,
        ).toBeGreaterThan(margin);
        expect(land.left, `the island is cut off on the left, ${at}`).toBeGreaterThan(
          margin,
        );
        expect(
          after.width - land.right,
          `the island is cut off on the right, ${at}`,
        ).toBeGreaterThan(margin);

        // AND IT IS STILL BIG, which every assertion above would let a speck through on.
        expect(
          (land.bottom - land.top) / after.height,
          `the island reads only ${Math.round(((land.bottom - land.top) / after.height) * 100)}% of the frame's height, ${at}`,
        ).toBeGreaterThan(0.7);

        // This is the composition guard: the pixels and card are the evidence. The unit
        // framing guard separately proves the authored graph stays inside its fit radius.
        expect(islandFraming({ view, layout: island.layout, fov: FOV }), at).not.toBeNull();
      },
      SHOT_TEST_TIMEOUT_MS,
    );
  }
}

/**
 * **AND THE TWO RADII ARE THE SAME PICTURE**, which is the whole of "the backdrop follows a
 * growing island". Compared as frames rather than as numbers: the island's box on screen is the
 * same box at grass 30 and grass 46, because the dolly is the radius's.
 */
test(
  "a grown island is framed to the same picture as era one's",
  async () => {
    const view = SHORT_LAPTOP;
    const eraOne = landMass(await frameOf(view, ERA_ONE, true));
    const grown = landMass(await frameOf(view, GROWN, true));

    expect(eraOne.pixels).toBeGreaterThan(20000);
    expect(grown.pixels).toBeGreaterThan(20000);
    // Within a few percent of the frame on every edge. Not identical: the shore's four units of
    // beach are an absolute width, so they are a smaller share of a bigger disc and a grown
    // island is framed very slightly larger.
    const slack = view.height * 0.05;
    expect(Math.abs(grown.top - eraOne.top), "top").toBeLessThan(slack);
    expect(Math.abs(grown.bottom - eraOne.bottom), "bottom").toBeLessThanOrEqual(slack);
    expect(Math.abs(grown.left - eraOne.left), "left").toBeLessThan(slack);
    expect(Math.abs(grown.right - eraOne.right), "right").toBeLessThan(slack);
    // ...and larger rather than smaller, which is the direction the beach's share predicts.
    expect(grown.bottom - grown.top).toBeGreaterThanOrEqual(eraOne.bottom - eraOne.top);
  },
  SHOT_TEST_TIMEOUT_MS,
);

/** A base64 PNG's pixels, so a composited capture can be measured like a canvas readback. */
async function decode(base64: string): Promise<{
  data: Uint8ClampedArray;
  width: number;
  height: number;
}> {
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
    throw new Error("no 2D context to sample the capture with");
  }
  ctx.drawImage(image, 0, 0);
  return {
    data: ctx.getImageData(0, 0, sink.width, sink.height).data,
    width: sink.width,
    height: sink.height,
  };
}

/**
 * **THE REAL TITLE SCREEN, CARD AND ALL — and this is the test that guards the WIRING.**
 *
 * Everything above renders the framing model through a canvas this file builds, which is the
 * right instrument for a camera claim and is blind to the one mistake that matters most: a
 * `TitleBackdrop` that never applies it. Delete `<BackdropFrame>` from the component, or let its
 * fov drift from the `<Canvas>`'s, or hand the framing a different distance from the camera's,
 * and every assertion above still passes. So this one mounts the shipped `TitleScreen`,
 * composites it — card, scrim, fonts, island — and measures the island in the frame a person
 * actually looks at.
 *
 * ## AND MEASURING IT AGAINST THE CARD IS THE POINT, NOT A REFINEMENT
 *
 * The card is centred, opaque and 560px wide, so fitting the island puts its middle exactly
 * BEHIND the card and its outline exactly in the margins the card leaves. Whether that outline is
 * visible there is a claim about the surface rather than about the canvas, and a frame cropped to
 * the canvas could not answer it. So the land is measured against the card's real box, read off
 * the shipped stylesheet.
 *
 * The pair is the evidence, and the "before" half is the canvas measured through the same
 * classifier: unframed, the island's near shore is off the bottom of the screen, so there is no
 * shoreline below the card to see and the card sits on a field. (The before cannot be composited,
 * because the shipped screen is now the framed one — that pair is in the work log's frames.)
 *
 * At 1440x900 the tester iframe is scaled inside a 1280x720 window, so the capture is 1152x720
 * pixels of an exactly 1440x900 LAYOUT: the composition is exact and the resolution is four
 * fifths. Every box below is scaled by the capture's own factor, and the factor is asserted to be
 * uniform rather than assumed.
 */
for (const view of VIEWPORTS) {
  const at = `${view.width}x${view.height}`;
  test(
    `the island's whole outline reads around the menu card at ${at}`,
    async () => {
      await page.viewport(view.width, view.height);
      await release();
      h = mount(
        <TitleScreen onStart={() => undefined} onTakeDiagnostic={() => undefined} />,
      );
      const backdropCanvas = () =>
        document.querySelector(
          ".title-screen__backdrop canvas",
        ) as HTMLCanvasElement | null;
      // R3F mounts the canvas at its 300x150 default and sizes it on the first measure, so the
      // wait is for the SIZE and not for the element — a frame read in between is of a 300px
      // canvas at the wrong aspect ratio, which is a real failure this file hit.
      await waitFor(
        () => backdropCanvas()?.clientWidth === view.width,
        "the backdrop canvas never reached the viewport's size",
        CANVAS_WAIT_MS,
      );
      await document.fonts.ready;
      expect(window.innerWidth, at).toBe(view.width);
      expect(window.innerHeight, at).toBe(view.height);
      const canvas = backdropCanvas() as HTMLCanvasElement;
      expect(canvas.clientWidth, at).toBe(view.width);
      expect(canvas.clientHeight, at).toBe(view.height);
      const card = (
        document.querySelector(".title-screen__panel") as HTMLElement
      ).getBoundingClientRect();
      // The card is the thing the island has to read around, so it had better be big and central.
      expect(card.width, at).toBeGreaterThan(200);
      expect(card.height, at).toBeGreaterThan(200);

      /*
       * THE DEV INSTRUMENTS COME OFF THE FRAME BEFORE ANYTHING IS MEASURED.
       *
       * `winterCrisisLegibility.browser.test.tsx` does this already and for the same reason:
       * these panels gate on `isDevPersistenceEnabled()`, which is TRUE in this harness and
       * false for a learner, so they are in the frame here and in no frame a learner sees.
       * `landMass` classifies a pixel as land when its green beats its blue, and every one of
       * these instruments is drawn in the same amber — so an instrument's border is warm, and
       * one pinned at `10,10` puts `land.top` at 10 in a frame whose island has a hundred
       * pixels of water above it. That is the gull-beak problem the classifier's flood fill
       * was built for, arriving through a route the flood fill cannot answer: an instrument
       * standing over the island is contiguous with it.
       *
       * **Found by this assertion firing**, at `1024x580`, on `DemoRoutePanel`: *"cut off at
       * the top: expected 10 to be greater than 11.6"*.
       *
       * Scoped by the BEHAVIOUR rather than by a test id: what makes something a dev
       * instrument here is that it carries the eyebrow all of them carry, so a second panel
       * added to this screen tomorrow comes off without anybody remembering this comment. The
       * count is read back, because "no instrument was in the frame" and "the selector found
       * nothing" are the same picture and only one of them is a measurement.
       */
      const DEV_EYEBROW = "Dev only, not on the learner build";
      const instruments = [...document.querySelectorAll<HTMLElement>("aside")].filter(
        (panel) => (panel.textContent ?? "").includes(DEV_EYEBROW),
      );
      for (const instrument of instruments) {
        instrument.style.visibility = "hidden";
      }
      expect(
        [...document.querySelectorAll<HTMLElement>("aside")].filter(
          (panel) =>
            (panel.textContent ?? "").includes(DEV_EYEBROW) &&
            panel.style.visibility !== "hidden",
        ),
        `${at}: a dev instrument is still in the frame the island is measured in`,
      ).toEqual([]);
      // The harness really does mount them, so the loop above is doing something. If this ever
      // goes to zero the gate has changed and the hiding is dead code that should come out.
      expect(
        instruments.length,
        `${at}: no dev instrument was found on the title screen, so hiding them measures nothing`,
      ).toBeGreaterThan(0);

      /*
       * A THROWAWAY CAPTURE FIRST, and it is load-bearing: `Page.captureScreenshot` with a clip
       * puts a device-metrics override on the page, which R3F reads as a resize and re-renders
       * through, so the frame the FIRST capture returns is the one drawn before any of that
       * settled. Then the same STABILITY GATE the canvas frames use — two consecutive
       * pixel-identical captures — which under the emulated `prefers-reduced-motion` settles on
       * the first comparison and without it would be measuring wheeling gulls.
       */
      const frameElement = window.frameElement as HTMLElement | null;
      if (!frameElement) {
        throw new Error("not inside vitest's tester iframe, so nothing can be clipped");
      }
      const capture = async () => {
        const box = frameElement.getBoundingClientRect();
        const outer = window.parent as Window;
        const shot = await session().send("Page.captureScreenshot", {
          format: "png",
          clip: {
            x: box.left + outer.scrollX,
            y: box.top + outer.scrollY,
            width: box.width,
            height: box.height,
            scale: 1,
          },
        });
        if (!shot.data) {
          throw new Error("CDP returned no screenshot data");
        }
        return shot.data;
      };
      await capture();
      let previous = await decode(await capture());
      let settled: { data: Uint8ClampedArray; width: number; height: number } | null = null;
      let png = "";
      for (let attempt = 0; attempt < 12; attempt += 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        png = await capture();
        const next = await decode(png);
        if (
          next.width === previous.width &&
          differingPixels(previous.data, next.data) === 0
        ) {
          settled = next;
          break;
        }
        previous = next;
      }
      if (!settled) {
        throw new Error("the title screen never settled, so nothing measured here repeats");
      }
      await keep(`after-title-screen-${at}`, png);

      // The capture may be a uniformly scaled copy of the layout; every box below is in ITS
      // pixels, so the factor is measured on both axes rather than taken on one.
      const scale = settled.width / view.width;
      expect(
        settled.height / view.height,
        `${at} capture is not uniformly scaled`,
      ).toBeCloseTo(scale, 3);
      expect(scale, `${at} capture scale`).toBeGreaterThan(0.7);

      const land = landMass(settled);
      const before = landMass(await frameOf(view, ERA_ONE, false));

      // Floors first, so nothing below is satisfied by a classifier that matched almost nothing.
      expect(before.pixels, `no island unframed, ${at}`).toBeGreaterThan(20000);
      expect(land.pixels, `no island on the real screen, ${at}`).toBeGreaterThan(20000);

      /*
       * BEFORE: the land runs off the bottom of the screen — the frame's bottom row is land — so
       * there is no shoreline down there at all.
       */
      expect(before.bottom, `${at}: the island already fits unframed`).toBe(
        view.height - 1,
      );

      // AFTER, ON THE REAL SCREEN: water on all four sides, at the margin the fit was sized for.
      const margin = Math.min(settled.width, settled.height) * 0.02;
      expect(land.top, `${at}: cut off at the top`).toBeGreaterThan(margin);
      expect(
        settled.height - land.bottom,
        `${at}: runs off the bottom edge`,
      ).toBeGreaterThan(margin);
      expect(land.left, `${at}: cut off on the left`).toBeGreaterThan(margin);
      expect(settled.width - land.right, `${at}: cut off on the right`).toBeGreaterThan(
        margin,
      );
      // AND IT IS STILL BIG, which every line above would let a speck through on.
      expect(
        (land.bottom - land.top) / settled.height,
        `${at}: the island reads only ${Math.round(((land.bottom - land.top) / settled.height) * 100)}% of the frame's height`,
      ).toBeGreaterThan(0.7);

      /*
       * AND THE OUTLINE READS AROUND THE CARD: rows of island above the card's top edge, rows
       * below its bottom edge, and land past both its sides. This is the composition claim, and
       * it is the one that fails if the framing is not wired to the shipped camera.
       */
      const rows = [...land.rows];
      expect(
        rows.filter((row) => row < card.top * scale).length,
        `${at}: no island above the card`,
      ).toBeGreaterThan(10);
      expect(
        rows.filter((row) => row > card.bottom * scale).length,
        `${at}: no island below the card`,
      ).toBeGreaterThan(10);
      expect(
        land.left,
        `${at}: the island does not reach past the card's left edge`,
      ).toBeLessThan(card.left * scale);
      expect(
        land.right,
        `${at}: the island does not reach past the card's right edge`,
      ).toBeGreaterThan(card.right * scale);
    },
    SHOT_TEST_TIMEOUT_MS,
  );
}
