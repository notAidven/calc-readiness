import {
  createHardWinter,
  type HardWinterState,
  hardWinterReducer,
  hardWinterView,
  type WinterAction,
  type WinterFire,
  winterFireState,
} from "@cr/game";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { afterAll, afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { CURRENT_ERA_ID } from "../eraDressing";
import { cellCenter, ISLAND_GRASS_RADIUS } from "../worldLayout";
import { CityLighting } from "./CityLighting";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { WinterGround } from "./WinterGround";
import { WINTER_GROUND_TONES, WINTER_LIGHT } from "./winterTones";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * **THE SPENT HEARTH, PHOTOGRAPHED — the same stones later, over ground that has closed over.**
 *
 * The ruling of 2026-08-02 keeps a fire on the board once its fuel is gone, and the brief asks for
 * two changes at once: *"the same hearth with its stones gone dark, the fuel spent, a thin wisp of
 * smoke or none at all, and the held ground closed over again by pale frost"*, with *"the reversion
 * legible as the same ground in a later state"*.
 *
 * **THAT IS A SPATIAL CLAIM, so it owes a rendered frame rather than a dimension.**
 * `winterScene.test.ts` measures the geometry and the tones — the ring is the same nine stones,
 * darkened; the fuel is char — and a passing tone comparison says nothing whatever about whether a
 * player can see the difference on the ground the hearth stands on. So this file renders the real
 * board at the game's own camera, AT 1024x580 (`SHORT`, the lead's own window), and measures the
 * FRAME:
 *
 *  - the same cell, the same camera, twice: once with the fire burning and once with it spent;
 *  - the warm ochre of held ground is there in the first and gone in the second, which is the
 *    reversion;
 *  - the hearth is still standing in the second, as a dark mass against the pale ice that replaced
 *    its ochre, which is what makes it the same hearth rather than an empty patch of frost.
 *
 * The frames are FRAMED TO SHOW THE GROUND AROUND EACH HEARTH rather than cropped to the hearths:
 * cropped to the thing that changed, a screenshot proves nothing about the surface it changed on.
 * They land in `__screenshots__/`, which is gitignored — they are evidence for a review, not a
 * fixture, and nothing here compares them to a baseline.
 */

/** The lead's own window. Every frame in this file is taken here; see `winterCrisisShots`. */
const SHORT = { width: 1024, height: 580 };

/**
 * How long a test that renders a real winter board is allowed, and why it is stated.
 *
 * **This file was the only shot test in `city/three/` that declared no timeout**, so it ran
 * on the browser default of 15000ms while its neighbours declare 60000
 * (`islandEra.browser.test.tsx`), 120000 (`frostCrustSilhouette`), 180000
 * (`frostFront`, `winterProtectionStates`) and 240000 (`winterIslandVisible`,
 * `winterConclusionSheet`). That is what turned it red in CI, and nothing about the frames
 * or the tones was involved:
 *
 * | test | mounts | here | on the runner |
 * | --- | --- | --- | --- |
 * | the ground closing over | **2** | 4401ms | **22004ms — over the 15000ms default** |
 * | three states in one frame | 1 | 1894ms | 10830ms |
 * | the close frame | 1 | 1925ms | **14517ms, inside the default by 483ms** |
 *
 * The first test is the only one that mounts and shoots a whole scene TWICE — the same
 * hearth burning and then spent is two boards — so it costs about 2.3x its siblings, and a
 * runner about six times slower than this machine puts that over a budget the other two
 * only just clear. The third row is the reason the timeout is set for the whole file rather
 * than for the failing test: at 483ms of margin it is the next one to go.
 *
 * NOT A MASKED ASSERTION. Every measurement in this file was re-taken in the same headless
 * Chromium CI uses and reproduces the numbers its docblocks quote, so nothing here was
 * loosened to fit the runner: 8464-pixel window, warm 4713 burning against 0 spent (quoted
 * 4752/0), dark 1 against 1618 (quoted 1/1727). {@link DARK_BELOW} is untouched and still
 * has 3.2x margin on the assertion that depends on it.
 *
 * 120000 follows `frostCrustSilhouette`'s heaviest frames: 5.5x the runner's own worst
 * observed 22004ms, and well inside the workflow's 25-minute job cap.
 */
const SHOT_TEST_TIMEOUT_MS = 120000;

/**
 * How dark a pixel has to be to count as the hearth's own stones and char.
 *
 * MEASURED RATHER THAN CHOSEN, and the first value tried was wrong in a way worth recording. At
 * `0.3` the count over the spent hearth's cell was 4300 of an 8464-pixel window against the burning
 * frame's 420 — a tenfold difference, and most of it was not the hearth. It was the FROST FRONT,
 * the standing shove ice that arrives on that cell the moment the fire stops holding it, whose
 * `#3c7fa0` renders around 0.3 in shadow. So the threshold was counting the reversion a second time
 * and the stones barely at all, which would have made "the hearth is still standing" a claim
 * satisfiable by ice.
 *
 * Swept at 0.3, 0.22, 0.15 and 0.1 over the same two frames. The front drops out between 0.3 and
 * 0.22, and at 0.15 the same window reads **1 pixel while the fire burns against 1727 once it is
 * spent** — which is the hearth, because nothing else on that cell got darker.
 */
const DARK_BELOW = 0.15;

/** Where the three hearths stand. Close enough together for one close frame to hold them. */
const SPENT_AT = { col: -3, row: 0 } as const;
const COLD_AT = { col: 0, row: 3 } as const;
const BURNING_AT = { col: 2, row: 0 } as const;

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

function playRound(
  winter: HardWinterState,
  action: WinterAction,
  correct: number,
): HardWinterState {
  let next = hardWinterReducer(winter, { type: "declare", action });
  next = hardWinterReducer(next, { type: "resolve", correct, asked: 3 });
  return hardWinterReducer(next, { type: "end_round" });
}

/**
 * The board, played through the REAL reducer to the round named.
 *
 * Round one lights the hearth under test at full accuracy, so it burns for three rounds and is
 * spent the moment the third closes. Round two lights a hearth that never catches, and round three
 * a second full-accuracy fire that is still burning at the end — so the board at round four holds
 * one of each of the three states the engine can produce, and the state of every hearth in the
 * frames below is the engine's own rather than a fixture's.
 */
function board(throughRound: 1 | 3): {
  rows: ReturnType<typeof hardWinterView>["rows"];
  fires: readonly WinterFire[];
} {
  let winter = createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: [{ node_id: "NUM.S", col: 0, row: 0 }],
  });
  winter = playRound(winter, { kind: "fire", ...SPENT_AT }, 3);
  if (throughRound === 3) {
    winter = playRound(winter, { kind: "fire", ...COLD_AT }, 0);
    winter = playRound(winter, { kind: "fire", ...BURNING_AT }, 3);
  }
  return {
    rows: hardWinterView(winter).rows,
    fires: winter.fires,
  };
}

interface FramePixels {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

function readFrame(canvas: HTMLCanvasElement): FramePixels {
  const sink = document.createElement("canvas");
  sink.width = canvas.width;
  sink.height = canvas.height;
  const ctx = sink.getContext("2d");
  if (!ctx) {
    throw new Error("no 2D context to sample the frame with");
  }
  ctx.drawImage(canvas, 0, 0);
  const { data } = ctx.getImageData(0, 0, sink.width, sink.height);
  return { data, width: sink.width, height: sink.height };
}

/**
 * What a square window of the frame, centred on one cell, is made of.
 *
 * `warm` is the ochre of held ground and the flame above it: snow is neutral and ice is cold, so
 * `r - b` separates the fire's whole warm family from everything else on this board in one number
 * — which matters because ACES tone mapping and the winter exposure move every rendered value off
 * its authored hex, so an exact-tone match would be measuring the tone mapper.
 *
 * `dark` is the spent hearth's own read: nine darkened stones and charred fuel against ice that is
 * within a step of white.
 */
function windowStats(
  frame: FramePixels,
  camera: THREE.PerspectiveCamera,
  cell: { readonly col: number; readonly row: number },
  half: number,
  darkBelow = DARK_BELOW,
): { readonly warm: number; readonly dark: number; readonly total: number } {
  const { x, z } = cellCenter(cell.col, cell.row);
  const at = new THREE.Vector3(x, 0, z).project(camera);
  const cx = Math.round(((at.x + 1) / 2) * frame.width);
  const cy = Math.round(((1 - at.y) / 2) * frame.height);
  let warm = 0;
  let dark = 0;
  let total = 0;
  for (let y = Math.max(0, cy - half); y < Math.min(frame.height, cy + half); y += 1) {
    for (let x2 = Math.max(0, cx - half); x2 < Math.min(frame.width, cx + half); x2 += 1) {
      const i = (y * frame.width + x2) * 4;
      const r = frame.data[i] ?? 0;
      const g = frame.data[i + 1] ?? 0;
      const b = frame.data[i + 2] ?? 0;
      total += 1;
      if (r - b > 30) {
        warm += 1;
      }
      if ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < darkBelow) {
        dark += 1;
      }
    }
  }
  return { warm, dark, total };
}

/** The village camera, at the shipped tilt, looking at a point on the board. */
function cameraAt(
  target: THREE.Vector3,
  distance: number,
): { position: [number, number, number]; target: THREE.Vector3 } {
  const azimuth = -Math.PI * 0.28;
  const polar = VILLAGE_CAMERA.polarAngle;
  return {
    position: [
      Math.sin(polar) * Math.sin(azimuth) * distance + target.x,
      Math.cos(polar) * distance + 2,
      Math.sin(polar) * Math.cos(azimuth) * distance + target.z,
    ],
    target,
  };
}

/**
 * Render one board at 1024x580 and hand back the frame plus the camera it was taken with, so a
 * window can be projected onto a cell afterwards.
 */
async function shoot(
  which: 1 | 3,
  name: string,
  distance: number,
  lookAt: { readonly col: number; readonly row: number } = { col: 0, row: 0 },
): Promise<{ frame: FramePixels; camera: THREE.PerspectiveCamera }> {
  const { rows, fires } = board(which);
  const { x, z } = cellCenter(lookAt.col, lookAt.row);
  const rig = cameraAt(new THREE.Vector3(x, 0, z), distance);
  let gl: THREE.WebGLRenderer | null = null;
  let camera: THREE.PerspectiveCamera | null = null;

  restore = restore ?? { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(SHORT.width, SHORT.height);

  h = mount(
    <div style={{ width: SHORT.width, height: SHORT.height }}>
      <Canvas
        dpr={1}
        camera={{
          position: rig.position,
          fov: 32,
          near: VILLAGE_CAMERA.nearPlane,
          far: ISLAND_GRASS_RADIUS * VILLAGE_CAMERA.farPlaneRatio,
        }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={(state) => {
          state.gl.toneMapping = THREE.ACESFilmicToneMapping;
          state.gl.toneMappingExposure = WINTER_LIGHT.exposure;
          state.camera.lookAt(rig.target.x, 2, rig.target.z);
          gl = state.gl;
          camera = state.camera as THREE.PerspectiveCamera;
        }}
      >
        <color attach="background" args={[`#${WINTER_LIGHT.sky.toString(16)}`]} />
        <CityLighting islandRadius={ISLAND_GRASS_RADIUS} variant="day" winter />
        <WinterGround rows={rows} fires={fires} reducedMotion />
      </Canvas>
    </div>,
  );

  await waitFor(() => gl !== null && camera !== null, "the canvas never created", 20000);
  const renderer = gl as unknown as THREE.WebGLRenderer;
  await waitFor(
    () => renderer.info.render.triangles > 0,
    "the renderer submitted no triangles",
    20000,
  );
  await new Promise<void>((resolve) => setTimeout(resolve, 400));

  if (CAPTURE_EVIDENCE) {
    const written = await page.screenshot({
      path: `__screenshots__/winter-spent-hearth/${name}.png`,
    });
    expect(written, `no screenshot was written for ${name}`).toBeTruthy();
  }
  return {
    frame: readFrame(renderer.domElement),
    camera: camera as unknown as THREE.PerspectiveCamera,
  };
}

/**
 * **THE SAME HEARTH, THE SAME CAMERA, BEFORE AND AFTER — which is the only framing that can show
 * "the same ground in a later state".**
 *
 * Both frames are 1024x580 at the shipped 49° tilt, framed on the settlement rather than on the
 * hearth, so the ice, the snow and the second hearth are all in shot: a claim about what is visible
 * AROUND a thing cannot be settled by a crop of the thing.
 */
test(
  "photographs the held ground closing over the hearth that was holding it",
  async () => {
    // The tone this measures for, stated so the classifier below is readable against it: ochre held
    // ground is `#c9a06a`, warm by 95 in `r - b`, where the frost is `#c8dfef` — COLDER than
    // neutral — and the snow is within a step of white.
    expect(WINTER_GROUND_TONES.warded & 0xff).toBeLessThan(
      WINTER_GROUND_TONES.warded >> 16,
    );
    expect(WINTER_GROUND_TONES.frost & 0xff).toBeGreaterThan(
      WINTER_GROUND_TONES.frost >> 16,
    );

    const burning = await shoot(1, "01-burning-hearth-holds-its-ground-1024x580", 46);
    const before = windowStats(burning.frame, burning.camera, SPENT_AT, 46);
    h?.cleanup();
    h = null;

    const spent = await shoot(3, "02-the-same-hearth-spent-1024x580", 46);
    const after = windowStats(spent.frame, spent.camera, SPENT_AT, 46);

    // Both windows are the same window of the same size, or nothing below is a comparison.
    expect(after.total).toBe(before.total);
    expect(before.total).toBeGreaterThan(5000);

    // THE HELD GROUND WAS THERE. A floor first: an ochre patch of nothing would make the reversion
    // below vacuous, and this is the frame that has to prove there was something to revert. Measured
    // at 4752 of 8464 — the radius-2 disc fills more than half the window.
    expect(
      before.warm,
      "no held ground was drawn around the burning hearth",
    ).toBeGreaterThan(2000);

    // AND IT HAS CLOSED OVER. Not "fewer warm pixels" — a margin, and a wide one, because the two
    // states are supposed to be a change a player reads at a glance rather than a measurable
    // difference. Measured at 0, so the margin is not carrying the assertion; it is there because a
    // hair of the patch surviving a different rasteriser is not the defect this guards against.
    expect(after.warm).toBeLessThan(before.warm * 0.02);

    // ...AND THE HEARTH IS STILL STANDING IN IT, as a dark mass against ice that is within a step of
    // white. This is the half that makes it the same hearth in a later state rather than an empty
    // patch of frost, and it is why the ground reverting alone is not the whole claim. Measured at 1
    // against 1727 — see {@link DARK_BELOW} for why the threshold is 0.15 and not the 0.3 this was
    // first written with.
    expect(before.dark, "the flame-lit ring is already reading as dark stone").toBeLessThan(
      50,
    );
    expect(after.dark, "nothing dark is standing where the hearth was").toBeGreaterThan(
      500,
    );
  },
  SHOT_TEST_TIMEOUT_MS,
);

/**
 * **ALL THREE STATES IN ONE FRAME**, which is the only way to see that they are three: a spent
 * hearth read on its own is just a hearth, and the question the ruling asks is whether a player can
 * tell it from the two states that were already drawable.
 */
test(
  "photographs a spent hearth beside a burning one and one that never caught",
  async () => {
    const { fires } = board(3);
    const states = new Map(fires.map((f) => [`${f.col},${f.row}`, winterFireState(f)]));
    expect(states.get(`${SPENT_AT.col},${SPENT_AT.row}`)).toBe("spent");
    expect(states.get(`${COLD_AT.col},${COLD_AT.row}`)).toBe("never_caught");
    expect(states.get(`${BURNING_AT.col},${BURNING_AT.row}`)).toBe("burning");

    // Far enough out to hold all three hearths and the ground between them.
    const shot = await shoot(3, "03-three-fire-states-1024x580", 72);

    const spent = windowStats(shot.frame, shot.camera, SPENT_AT, 30);
    const cold = windowStats(shot.frame, shot.camera, COLD_AT, 30);
    const burning = windowStats(shot.frame, shot.camera, BURNING_AT, 30);

    // The burning hearth is the only one with HELD GROUND under it: measured at 2597 warm pixels of
    // a 3600-pixel window, against 0 over the spent hearth.
    expect(burning.warm).toBeGreaterThan(1500);
    expect(spent.warm).toBeLessThan(burning.warm * 0.02);
    // The cold hearth is allowed a little warmth and it is not ground: its three logs are UNBURNT,
    // and `WOOD_LIT` is a warm timber. Measured at 128, which is a fiftieth of an ochre patch and
    // twenty times what a hearth standing on one would read. The bound is what separates "its own
    // logs" from "it is holding ground", which is the thing that would be wrong.
    expect(cold.warm).toBeLessThan(burning.warm * 0.2);

    // And the two unlit hearths are NOT the same picture: the spent one's stones are dark and its
    // fuel is char, and the one that never caught is in the pale stone and the pale timber it was
    // built in. Measured at 619 against 40, so the ratio has fifteen times the margin it needs.
    expect(spent.dark).toBeGreaterThan(cold.dark * 3);
    expect(cold.dark, "the cold hearth is reading as dark too").toBeGreaterThan(0);
  },
  SHOT_TEST_TIMEOUT_MS,
);

/**
 * **THE CLOSE FRAME, and it is a supplement rather than the evidence.**
 *
 * The two frames above are the load-bearing ones because they are framed on the settlement: a claim
 * about ground closing over cannot be settled by a crop of the thing that changed. This one exists
 * because there is a second, smaller claim in the brief — *"a thin wisp of smoke or none at all"* —
 * and a wisp three puffs tall is a handful of pixels at the framing above, so the only way anyone
 * can judge whether it reads is a frame close enough to see it. The ground is still in shot.
 */
test(
  "photographs the spent hearth close enough to read its stones",
  async () => {
    const shot = await shoot(3, "04-spent-hearth-close-1024x580", 22, SPENT_AT);
    const at = windowStats(shot.frame, shot.camera, SPENT_AT, 120);

    // The stones fill a real part of the frame at this range: measured at 5502 of a 57600-pixel
    // window, against 1727 of 8464 at the wide framing.
    expect(at.dark).toBeGreaterThan(3000);
    // ...and the ground under it is ice rather than ochre, at every framing.
    expect(at.warm / at.total).toBeLessThan(0.01);
  },
  SHOT_TEST_TIMEOUT_MS,
);
