import {
  createHardWinter,
  HARD_WINTER,
  type HardWinterState,
  hardWinterIsland,
  hardWinterView,
  type WinterBuilding,
  type WinterFire,
} from "@cr/game";
import type { ReactElement, RefObject } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import {
  winterShieldedNodeIds,
  winterThreatenedNodeIds,
} from "../../winter/buildingThreat";
import { WINTER_NODE_ORDER } from "../../winter/hardWinterItems";
import { resolveBuildingModel } from "../buildingAssets";
import { CURRENT_ERA_ID } from "../eraDressing";
import { eraCityLayout } from "../islandLand";
import { resolveTownHallModel, TOWN_HALL_ID } from "../townHall";
import {
  cellCenter,
  footprintFor,
  type PlacedTransform,
  transformCenter,
} from "../worldLayout";
import { applyCameraAction, controlsDistance, type OrbitControlsLike } from "./applyOrbit";
import { CityCanvasHost } from "./CityCanvasHost";
import type { ScenePlacement, SceneTownHall } from "./CityScene";
import { VILLAGE_CAMERA } from "./orbitCamera";
import { CRISIS_LABEL_TEXT } from "./SkillLabels";
import { WinterInCity } from "./WinterInCity";
import { FUEL_STEPS } from "./winterFire";

import "../../styles.css";

/**
 * **CAN A PLAYER TELL A THREE-ROUND FIRE FROM A ONE-ROUND FIRE, AND FIND A SHIELDED BUILDING, AT
 * THE ZOOM THE GAME CLAMPS THEM TO?**
 *
 * Both rulings of 2026-08-02 are legibility claims about a whole frame, so both owe a rendered frame
 * somebody looked at rather than a dimension somebody measured. This is that instrument.
 *
 * ## THE VIEWPORT IS HALF THE EVIDENCE, AND IT IS 1024x580
 *
 * The lead's own short laptop window, named in every filename. A frame taken at a comfortable
 * developer viewport is exactly as misleading as arithmetic and misleading for the same reason: it
 * will look fine.
 *
 * ## AND THE DOLLY IS THE OTHER HALF
 *
 * `CityScene` clamps the dolly to `VILLAGE_CAMERA.minDistanceRatio` (0.5x) and `maxDistanceRatio`
 * (2.6x), so **three views exist**: those two clamps and the resting distance a winter opens at.
 * Every frame here is at one of them, reached with {@link applyCameraAction} — the game's own zoom
 * button — and the distance is ASSERTED after the scene's clamp has had a frame to pull it back, so
 * what is photographed is a camera the game allows.
 *
 * **A previous pass demonstrated the fuel ladder at `cameraDistance * 0.22`, 2.3x nearer than
 * `minDistanceRatio` permits.** A frame from a camera the game forbids is not evidence about the
 * shipped one, and that is the specific mistake these assertions exist to make impossible.
 *
 * ## THE INSTRUMENT IS A DIFF BETWEEN RUNGS, WHICH IS #449'S OWN INSTRUMENT
 *
 * "Can you tell these two apart" is a question about what CHANGED between two frames of the same
 * board, so the measurement is the changed-pixel count and the bounding box of the change, taken
 * between adjacent rungs with everything else held. That is deliberately the same instrument #449
 * used on the flame, so the numbers are comparable with the ones that failed: **about 340 changed
 * pixels in a 25x30 box**, which is what "an 11px descent on a 21px-wide flame" means in this unit.
 *
 * ## `reducedMotion`, BECAUSE THE ISLAND MOVES ON ITS OWN
 *
 * The gulls alone produce up to 0.88% whole-frame noise between two frames of an unchanged board,
 * and a guard here has already been found hollow because of it. Under `reducedMotion` the gulls are
 * seated at `t = 0`, the snowfall is seated once, `updateFire` runs once at `t = 0` and the contact
 * shadows render a single frame, so two mounts of the same board are comparable and a diff measures
 * the board rather than the clock.
 *
 * ## OFF BY DEFAULT
 *
 *   VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/city/three/winterCrisisLegibility.browser.test.tsx
 *
 * `winterCrisisShots.browser.test.tsx` records the measurement behind the flag: a shadow-mapped
 * island with seven GLBs left switched on in CI does not fail here, it starves an animation-timing
 * assertion in some other file, once per run, in a different file each time — which is worse than
 * having no photographs, because the next reader cannot tell it from a regression. What runs in CI
 * is the census below.
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's own short laptop window. Named in the filename, per the spatial-claim rule. */
const VIEW = { width: 1024, height: 580 } as const;

/** Where the committed frames go. Reference only: nothing under `docs/` is reachable in-app. */
const OUT = "docs/design-refs/hard-winter-legibility";

const LAYOUT = eraCityLayout("prehistoric");

/**
 * A compact city, for `winterProtectionStates.browser.test.tsx`'s reason: `winterFraming` dollies
 * out until the whole settlement fits the strip the crisis panel leaves free, so a spread city is
 * photographed from further away and every building in it is smaller. A cluster puts these at the
 * size the game gives them at rest, which is the size the read has to survive.
 */
const CITY: readonly PlacedTransform[] = [
  { nodeId: "NUM.S", col: -2, row: -2, rot: 0 },
  { nodeId: "NUM.F", col: 1, row: -2, rot: 0 },
  { nodeId: "NUM.3", col: -2, row: 1, rot: 0 },
  { nodeId: "NUM.5", col: 1, row: 1, rot: 0 },
  { nodeId: "NUM.4", col: -2, row: 3, rot: 0 },
  { nodeId: "NUM.2", col: 3, row: 2, rot: 0 },
];
const HALL: PlacedTransform = { nodeId: TOWN_HALL_ID, col: 0, row: -1, rot: 0 };

/**
 * Which buildings are reinforced in these frames, and the HUB is one of them on purpose.
 *
 * #449 found the shielded hall was the one subject in this crisis no frame had ever been taken of,
 * because every population in the tree was copied from a file that correctly exempts it — the skill
 * graph, which is right about a skill name and wrong about a status. So the hall is in shot, and it
 * is the one this file asserts is on screen: SHIELDED over the hub is the reading nobody had.
 *
 * **THE THREE ARE SPREAD ACROSS THE CLUSTER, AND THAT IS A FINDING RATHER THAN A CONVENIENCE.** The
 * first set photographed was the hall with the tall Tower (`NUM.5`, which `worldLayout.ts` records
 * rendering at 9.769u) two cells away, and measured at 1024x580 their captions landed at x=674 and
 * x=762 against a box 120px wide: they overlap, the depth-ordered pass correctly kept the nearer
 * one, and the hub's was dropped. **On a packed board two adjacent buildings are one caption's worth
 * of room** — which is the collision pass doing its job rather than a defect, and it is why the set
 * here is the hall plus the two buildings furthest from it.
 */
const SHIELDED_IN_FRAME = [TOWN_HALL_ID, "NUM.4", "NUM.2"] as const;

/** A shield magnitude a declaration can really buy, rather than one this file invented. */
const SHIELD = HARD_WINTER.reinforce.shield_by_tier.steady;

/** Where the fire stands: one cell clear of the cluster, so nothing hides its hearth. */
const FIRE_AT = { col: 3, row: -1 } as const;

/**
 * And where it stands for the frame that asks the column's OWN design question.
 *
 * `winterFire.ts` sizes the column so that *"from the far rim of the island it has to be findable
 * over whatever is standing in between"*, and that is a fire across the island at the ORDINARY
 * camera rather than a fire beside you at the dolly clamp. `(-5, 0)` is a real rim-depth-0 cell —
 * `hard-winter-tuning.ts`'s `rimward` layout stands a building on it — so the frame is the
 * settlement in the middle distance with a fire out on the shore behind it.
 */
const FAR_RIM_FIRE = { col: -5, row: 0 } as const;

/** Every rung of the fire's burn ladder, longest first — off the tuning, never a literal 3. */
const FUEL_RUNGS: readonly number[] = Array.from(
  { length: FUEL_STEPS },
  (_, index) => FUEL_STEPS - index,
);

/**
 * The winter these frames are taken in: the cluster at rest, three buildings reinforced, and one
 * fire burning on a cell beside them.
 *
 * Built off `createHardWinter` and then moved in the two fields the reducer itself writes, so
 * nothing here is a board the engine could not reach. `rounds_left` is the one thing that varies
 * between the ladder's frames.
 */
function winterWith(
  roundsLeft: number,
  at: { readonly col: number; readonly row: number } = FIRE_AT,
): HardWinterState {
  const opening = createHardWinter({
    era: CURRENT_ERA_ID,
    // THE HALL IS ONE OF THE WINTER'S BUILDINGS, and it is in the engine's own list rather than
    // only in the scene's. `liveCityLayoutFrom` appends `town_hall` to the buildings it hands
    // `createHardWinter`, so a fixture that left it out would be photographing a board the game
    // never deals — and `winterShieldedNodeIds` reads the engine's buildings, so the hub could not
    // be shielded at all. That is exactly how the one subject with no frame stayed that way.
    buildings: [...CITY, HALL].map((p) => ({
      node_id: p.nodeId,
      col: p.col,
      row: p.row,
    })),
  });
  const island = hardWinterIsland(CURRENT_ERA_ID);
  const frozen = island.cells.filter((key) => (island.rim_depth.get(key) ?? 9) <= 0);
  const fire: WinterFire = {
    col: at.col,
    row: at.row,
    radius: HARD_WINTER.fire.radius_by_tier.strong as number,
    rounds_left: roundsLeft,
    lit_in_round: 1,
  };
  const dress = (building: WinterBuilding): WinterBuilding =>
    SHIELDED_IN_FRAME.includes(building.node_id as (typeof SHIELDED_IN_FRAME)[number])
      ? { ...building, shield: SHIELD }
      : building;
  return {
    ...opening,
    round: 2,
    frozen,
    fires: [fire],
    buildings: opening.buildings.map(dress),
  };
}

/**
 * The board, wired the way `WinterInCity`'s bridge wires it for the canvas.
 *
 * `fire_preview` is the only option there is. This passed `abandon_preview: false` beside it while
 * that branch was open, and #447 removed the give-up-ground action and every field it owned — see
 * `WinterAction`'s note for the list — so the second key stopped existing rather than changing
 * meaning. Nothing about these frames moves: `false` was *no preview*, which is now the only state
 * the view has, and `HardWinterSurface`'s own call passes exactly this one key.
 */
function boardFor(winter: HardWinterState) {
  const view = hardWinterView(winter, { fire_preview: null });
  return {
    rows: view.rows,
    fires: winter.fires,
    shieldedNodeIds: winterShieldedNodeIds(winter.buildings, false),
    threatenedNodeIds: winterThreatenedNodeIds(view.rows),
  };
}

/* -------------------------------------------------------------------------- */
/* The census, which is the half that runs in CI                              */
/* -------------------------------------------------------------------------- */

/**
 * **THE FRAMES' OWN CAPTIONS, CHECKED BEFORE A PIXEL IS TAKEN.**
 *
 * A frame set whose captions are written by the test is a frame set that cannot be wrong about what
 * it is showing. So every claim the filenames make is derived from the engine here: which buildings
 * the board reports as shielded, that the hub is one of them, that the fire is drawn at every rung
 * of the tuning's own ladder, and that the ground the fire holds does not move between rungs — which
 * is the caption's truth condition for "one fire later" rather than "three different fires".
 */
test("the boards these frames photograph really carry the conditions the filenames claim", () => {
  expect(FUEL_STEPS, "the burn ladder has one rung, so there is no ladder").toBeGreaterThan(
    1,
  );
  expect([...FUEL_RUNGS].sort((a, b) => a - b)).toEqual(
    Array.from({ length: FUEL_STEPS }, (_, index) => index + 1),
  );
  expect(
    SHIELD,
    "the steady tier buys no shield, so nothing is reinforced",
  ).toBeGreaterThan(0);

  const top = boardFor(winterWith(FUEL_STEPS));
  // THE SHIELDED SET IS THE ENGINE'S OWN READING, and the hall is in it.
  expect([...top.shieldedNodeIds].sort()).toEqual([...SHIELDED_IN_FRAME].sort());
  expect(top.shieldedNodeIds.has(TOWN_HALL_ID), "the hub is not in shot shielded").toBe(
    true,
  );
  // A floor and a complement, so "three are shielded" is not met by a board where all seven are.
  expect(winterWith(FUEL_STEPS).buildings).toHaveLength(CITY.length + 1);
  expect(CITY.length + 1 - top.shieldedNodeIds.size).toBe(4);

  // THE FIRE IS DRAWN AT EVERY RUNG, and it holds the same ground at each — which is what makes the
  // ladder's frames one fire later rather than three fires.
  const heldAt = (roundsLeft: number): string =>
    boardFor(winterWith(roundsLeft))
      .rows.flat()
      .filter((c) => c.warded)
      .map((c) => `${c.col},${c.row}`)
      .sort()
      .join(" ");
  const held = heldAt(FUEL_STEPS);
  expect(held.length, "the fire holds no ground, so it never caught").toBeGreaterThan(0);
  for (const rung of FUEL_RUNGS) {
    expect(heldAt(rung), `the fire holds different ground at ${rung} rounds left`).toBe(
      held,
    );
    expect(boardFor(winterWith(rung)).fires).toHaveLength(1);
  }
});

/* -------------------------------------------------------------------------- */
/* The frames                                                                 */
/* -------------------------------------------------------------------------- */

const SCENE_PLACED: readonly ScenePlacement[] = CITY.map((p) => ({
  nodeId: p.nodeId,
  col: p.col,
  row: p.row,
  rot: p.rot,
  model: resolveBuildingModel(p.nodeId, "built"),
  mastery: 2,
  celebrateToken: 0,
}));

const SCENE_HALL: SceneTownHall = {
  col: HALL.col,
  row: HALL.row,
  rot: HALL.rot,
  model: resolveTownHallModel("built"),
  celebrateToken: 0,
};

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
    restore = null;
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** The island under one board, with the real crisis sidebar over it. */
function IslandUnder({
  board,
  controlsRef,
}: {
  readonly board: ReturnType<typeof boardFor>;
  readonly controlsRef: RefObject<OrbitControlsLike | null>;
}): ReactElement {
  return (
    <div className="city-shell">
      <div className="city-surface" data-winter="true">
        <div className="city-viewport" data-testid="city-viewport">
          <CityCanvasHost
            enableCanvas
            layout={LAYOUT}
            placed={SCENE_PLACED}
            townHall={SCENE_HALL}
            variant="day"
            reducedMotion
            controlsRef={controlsRef}
            onSelect={() => undefined}
            eraId={CURRENT_ERA_ID}
            winterRows={board.rows}
            winterFires={board.fires}
            shieldedNodeIds={board.shieldedNodeIds}
            crisisThreatenedNodeIds={board.threatenedNodeIds}
            fallback={<div data-testid="canvas-fallback" />}
          />
        </div>
      </div>
      <WinterInCity
        placements={CITY}
        townHall={HALL}
        canvasLive
        practisedNodeIds={WINTER_NODE_ORDER}
        onBoard={() => undefined}
        onExit={() => undefined}
      />
    </div>
  );
}

/** The middle of the settlement, for the frames whose subject is the buildings. */
function settlementCentre(): { x: number; z: number } {
  const centres = [...CITY, HALL].map((p) => transformCenter(p, footprintFor(p.nodeId)));
  return {
    x: centres.reduce((sum, c) => sum + c.x, 0) / centres.length,
    z: centres.reduce((sum, c) => sum + c.z, 0) / centres.length,
  };
}

/** Where this test's viewport sits in the browser window, so a capture can be clipped to it. */
function testViewportBox(): { x: number; y: number; width: number; height: number } {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const box = frameElement.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
  };
}

/**
 * The composited frame, over CDP.
 *
 * `page.screenshot` is Playwright's locator capture and never gets past *"waiting for element to be
 * stable"* over a canvas running `frameloop="always"`. CDP takes the frame as it stands.
 */
async function capture(): Promise<string> {
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const box = testViewportBox();
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
  });
  if (!shot.data) {
    throw new Error("CDP returned no screenshot data");
  }
  return shot.data;
}

async function keep(name: string, shot: string): Promise<void> {
  if (SHOTS) {
    await commands.writeFile(`${OUT}/${name}.png`, shot, { encoding: "base64" });
  }
}

/**
 * Write one sweep's measurements out beside its frames.
 *
 * A FILE RATHER THAN `console.log`, and that is not a style choice: vitest's browser bridge
 * forwards `console.warn` and `console.error` to the run log and swallows `console.log`, so the
 * numbers this file exists to produce were being measured and thrown away on every green run. The
 * frames are the evidence a reader looks at and these are the evidence they check it against, so
 * both are committed and `README.md` reads them.
 */
async function record(name: string, lines: readonly string[]): Promise<void> {
  if (SHOTS) {
    await commands.writeFile(`${OUT}/measured-${name}.txt`, `${lines.join("\n")}\n`);
  }
}

/** Width and height out of a PNG's IHDR, so a scaled capture cannot pass for the viewport. */
function pngSize(base64: string): { width: number; height: number } {
  const binary = atob(base64);
  const at = (i: number): number => binary.charCodeAt(i) & 0xff;
  const read = (offset: number): number =>
    (at(offset) << 24) | (at(offset + 1) << 16) | (at(offset + 2) << 8) | at(offset + 3);
  expect(binary.slice(1, 4), "not a PNG").toBe("PNG");
  return { width: read(16) >>> 0, height: read(20) >>> 0 };
}

interface Frame {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** Decode a captured PNG. */
async function imageOf(base64: string): Promise<HTMLImageElement> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("the captured PNG did not decode"));
    image.src = `data:image/png;base64,${base64}`;
  });
  return image;
}

/** Decode a captured PNG to pixels, so two frames can be compared. */
async function pixelsOf(base64: string): Promise<Frame> {
  const image = await imageOf(base64);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("no 2d context, so a frame cannot be read");
  }
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data };
}

/**
 * **THREE ROUNDS AND ONE ROUND IN ONE PICTURE, which is what the ruling asked to be shown.**
 *
 * Two captured frames laid side by side at full resolution with a caption under each, so a reader
 * answers *"can you tell them apart"* by looking at one image rather than by flicking between two
 * files and trusting their memory of the first. Composed from the frames as captured — same fixture,
 * same board, same camera, same viewport, nothing cropped and nothing scaled.
 */
async function sideBySide(
  name: string,
  left: { readonly shot: string; readonly caption: string },
  right: { readonly shot: string; readonly caption: string },
): Promise<void> {
  const [a, b] = await Promise.all([imageOf(left.shot), imageOf(right.shot)]);
  const gutter = 4;
  const captionBand = 22;
  const canvas = document.createElement("canvas");
  canvas.width = a.naturalWidth + gutter + b.naturalWidth;
  canvas.height = Math.max(a.naturalHeight, b.naturalHeight) + captionBand;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("no 2d context, so nothing can be composed");
  }
  context.fillStyle = "#10161a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(a, 0, 0);
  context.drawImage(b, a.naturalWidth + gutter, 0);
  context.fillStyle = "#f4f7f6";
  context.font = "13px system-ui, sans-serif";
  context.fillText(left.caption, 8, canvas.height - 7);
  context.fillText(right.caption, a.naturalWidth + gutter + 8, canvas.height - 7);
  if (SHOTS) {
    await commands.writeFile(
      `${OUT}/${name}.png`,
      canvas.toDataURL("image/png").split(",")[1] as string,
      { encoding: "base64" },
    );
  }
}

/** How different one channel has to be for a pixel to count as changed. */
const CHANNEL_THRESHOLD = 8;

interface Change {
  readonly pixels: number;
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

/**
 * What moved between two frames: how many pixels, and the box they sit in.
 *
 * `from` is the left edge of the strip to measure over, and it exists because the first run of this
 * sweep reported a change box of the WHOLE 1024x580 frame at the resting dolly. That is true and
 * useless: the crisis panel is not fully opaque, so a column big enough to change the sky behind it
 * changes a handful of pixels under it too, and one such pixel in a corner makes the box the frame.
 * Measured over the island strip the panel leaves free, the same change is a box you can point at.
 */
function changeBetween(a: Frame, b: Frame, from = 0): Change {
  expect(a.width, "the two frames are different sizes").toBe(b.width);
  expect(a.height).toBe(b.height);
  let pixels = 0;
  let top = a.height;
  let bottom = -1;
  let left = a.width;
  let right = -1;
  for (let y = 0; y < a.height; y += 1) {
    for (let x = Math.max(0, Math.round(from)); x < a.width; x += 1) {
      const i = (y * a.width + x) * 4;
      const moved =
        Math.abs((a.data[i] as number) - (b.data[i] as number)) > CHANNEL_THRESHOLD ||
        Math.abs((a.data[i + 1] as number) - (b.data[i + 1] as number)) >
          CHANNEL_THRESHOLD ||
        Math.abs((a.data[i + 2] as number) - (b.data[i + 2] as number)) > CHANNEL_THRESHOLD;
      if (moved) {
        pixels += 1;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
  }
  return { pixels, top, bottom, left, right };
}

/** Keep the pan target inside this fraction of the island — mirrors `CityScene`. */
const PAN_BOUND_RATIO = 0.72;

/**
 * **BRING THE SUBJECT INTO FRAME WITH THE BUTTONS THE GAME GIVES THE PLAYER, AND NOTHING ELSE.**
 *
 * `winterCrisisAtlas.browser.test.tsx`'s mechanism and its reason: the crisis camera looks at the
 * island's CENTRE and `winterFraming` then slides the projection sideways so the settlement lands in
 * the strip the panel leaves free, so anything out toward the rim is a long way right of the middle
 * and zooming in pushes it further. Measured on this file's own first run: at the nearest dolly the
 * fire left the frame entirely and the diff still reported 1848 changed pixels, off a translucent
 * column drifting over an island with no fire in the picture.
 *
 * Every press goes through {@link applyCameraAction} — the arrow keys and the zoom button — and is
 * clamped to `panBound`, the play area `CityScene` holds the target inside, so a subject the player
 * could not centre is photographed as far over as they could get rather than from a camera position
 * the game forbids. The tilt is untouched throughout.
 */
function driveTo(
  controls: OrbitControlsLike,
  look: { readonly x: number; readonly z: number },
): void {
  const panBound = LAYOUT.islandRadius * PAN_BOUND_RATIO;
  const eye = controls.object.position;
  const target = controls.target;
  const length = Math.hypot(target.x - eye.x, target.z - eye.z) || 1;
  const forward = { x: (target.x - eye.x) / length, z: (target.z - eye.z) / length };
  const right = { x: forward.z, z: -forward.x };
  const step = controlsDistance(controls) * VILLAGE_CAMERA.panStepRatio;
  const delta = { x: look.x - target.x, z: look.z - target.z };
  const along = Math.round((delta.x * forward.x + delta.z * forward.z) / step);
  const across = Math.round((delta.x * right.x + delta.z * right.z) / step);
  for (let press = 0; press < Math.abs(along); press += 1) {
    applyCameraAction(controls, along > 0 ? "panUp" : "panDown", panBound);
  }
  for (let press = 0; press < Math.abs(across); press += 1) {
    applyCameraAction(controls, across > 0 ? "panRight" : "panLeft", panBound);
  }
}

/**
 * Mount one board, take the camera to a named dolly with the player's own controls, and photograph.
 *
 * The dolly is driven in whole button presses and then MEASURED, because `CityScene` clamps it on
 * the next frame whatever this asks for: `expectRatio` is what the game let the camera end up at,
 * and it is the assertion that stops a frame being taken from a distance the game forbids.
 */
async function photograph(
  board: ReturnType<typeof boardFor>,
  name: string,
  options: {
    readonly notches: number;
    readonly out: boolean;
    readonly expectRatio: number;
    readonly look: { readonly x: number; readonly z: number };
  },
): Promise<string> {
  h?.cleanup();
  h = null;
  await page.viewport(VIEW.width, VIEW.height);
  const controlsRef = { current: null as OrbitControlsLike | null };
  h = mount(<IslandUnder board={board} controlsRef={controlsRef} />);

  await waitFor(
    () => document.querySelector(".city-viewport canvas") !== null,
    "the city canvas never mounted",
    40000,
  );
  await waitFor(
    () => document.querySelector(".winter-in-city .hw-shell") !== null,
    "the crisis panel never rendered",
    40000,
  );
  await document.fonts.ready;
  // The GLBs resolve behind their own Suspense boundaries, the frost course rebuilds when the board
  // arrives, and the badges' tracking and the caption layer's projection both run in `useFrame`.
  // There is no renderer handle out here, so this waits on the clock, and the size and ratio checks
  // below are what make a too-early sample fail rather than pass quietly.
  await new Promise<void>((resolve) => setTimeout(resolve, 3500));

  const controls = controlsRef.current;
  if (!controls) {
    throw new Error("the canvas never handed its controls out, so nothing can be driven");
  }
  for (let notch = 0; notch < options.notches; notch += 1) {
    applyCameraAction(controls, options.out ? "zoomOut" : "zoomIn");
  }
  driveTo(controls, options.look);
  await new Promise<void>((resolve) => setTimeout(resolve, 1400));
  const ratio = controlsDistance(controls) / LAYOUT.cameraDistance;
  expect(
    ratio,
    `${name}: the camera settled at ${ratio.toFixed(3)}x rather than ${options.expectRatio}x of the default dolly`,
  ).toBeCloseTo(options.expectRatio, 2);
  const landed = Math.hypot(
    controls.target.x - options.look.x,
    controls.target.z - options.look.z,
  );
  // WITHIN HALF A PAN PRESS, plus a cell. A press moves `panStepRatio` of the DOLLY, so a press at
  // full zoom-out is 2.6x a press at rest and the best a player can do is that much coarser: the
  // tolerance is the granularity of the controls rather than a fixed distance. Measured, this is
  // 6.2u at the resting dolly and 12.5u at full zoom-out.
  const grain =
    controlsDistance(controls) * VILLAGE_CAMERA.panStepRatio * 0.5 + LAYOUT.gridCell;
  expect(
    landed,
    `${name}: the camera settled ${landed.toFixed(1)}u from its subject, past the ${grain.toFixed(1)}u a pan press can resolve`,
  ).toBeLessThan(grain);

  /*
   * A THROWAWAY CAPTURE, and it is load-bearing. `Page.captureScreenshot` with a `clip` puts a
   * device-metrics override on the page, which R3F sees as a resize and re-renders from — so the
   * first clipped capture after a mount comes back as the frame drawn before any of that settled.
   */
  await capture();
  await new Promise<void>((resolve) => setTimeout(resolve, 900));

  // The dev skip panel comes off every frame: it gates itself on `isDevPersistenceEnabled()`, which
  // is true in this harness and false for a learner, and it sits over the island's top-right corner.
  const devSkip = document.querySelector<HTMLElement>('[data-testid="hw-dev-skip"]');
  if (devSkip) {
    devSkip.style.visibility = "hidden";
  }
  try {
    await new Promise<void>((resolve) => setTimeout(resolve, 700));
    const shot = await capture();
    const size = pngSize(shot);
    expect(size, `${name}: not the named viewport`).toEqual({
      width: VIEW.width,
      height: VIEW.height,
    });
    await keep(name, shot);
    return shot;
  } finally {
    if (devSkip) {
      devSkip.style.visibility = "";
    }
  }
}

/**
 * **THE THREE DOLLIES A PLAYER CAN BE AT.**
 *
 * `zoomStep` is 0.84, so four presses in is already past `minDistanceRatio` and six out is past
 * `maxDistanceRatio`: both are driven further than the clamp, so what is photographed is the clamp
 * itself rather than one notch short of it.
 */
const DOLLIES = [
  { id: "resting", notches: 0, out: false, ratio: 1 },
  { id: "closest", notches: 6, out: false, ratio: VILLAGE_CAMERA.minDistanceRatio },
  { id: "far", notches: 8, out: true, ratio: VILLAGE_CAMERA.maxDistanceRatio },
] as const;

/**
 * **THE FOUR VIEWS THE LADDER IS MEASURED IN, AND WHAT IS CLAIMED IN EACH.**
 *
 * The three dollies above, each with the camera driven onto the fire, plus the one the column was
 * actually built for: `winterFire.ts` sizes it so a fire is findable *"from the far rim of the
 * island"*, which is a fire a whole island away at the ORDINARY camera and not a fire beside you at
 * a dolly clamp. `across-the-island` is that composition — the settlement in the middle of the
 * frame and the fire out on the shore behind it — and it is the strongest reading of "the far view"
 * the ruling asks the design to survive.
 *
 * `claimed` is where the COLUMN's read is ASSERTED, and it is not everywhere. Measured at the branch
 * tip, the one place it fails is full zoom-out, and that is reported rather than papered over: see
 * the finding on the sweep below.
 */
const VIEWS = [
  ...DOLLIES.map((dolly) => ({
    ...dolly,
    fire: FIRE_AT,
    claimed: dolly.id !== "far",
  })),
  {
    id: "across-the-island",
    notches: 0,
    out: false,
    ratio: 1,
    fire: FAR_RIM_FIRE,
    claimed: true,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* Ruling 2: three rounds left against one, side by side                      */
/* -------------------------------------------------------------------------- */

/**
 * **THE FLOOR THE READ HAS TO BEAT, IN THE UNIT #449 MEASURED THE FLAME IN.**
 *
 * The flame's whole ladder moved *"about 340 changed pixels in a 25x30 box"* between rungs at the
 * resting dolly, which is the pass the lead rejected. So a rung-to-rung change at the resting dolly
 * has to be an order of magnitude bigger than that in pixel count, and its box has to be tall enough
 * that the change is a THING moving rather than an edge shimmering.
 */
const FLAME_LADDER_PIXELS = 340;
const CHANGE_PIXELS_MIN = FLAME_LADDER_PIXELS * 10;
const CHANGE_HEIGHT_MIN = 60;

/**
 * **AND THE FLOOR AT THE TWO DOLLIES WHERE THE READ IS NOT CLAIMED.**
 *
 * Low, and it is not a claim about legibility: it says the ladder still reaches the pixels at all,
 * which is what fails if a future change stops `rounds_left` reaching the column. The frames beside
 * it are what a reader judges, and the finding recorded on the sweep is what they say.
 */
const CHANGE_PIXELS_DRAWN = 200;

for (const view of VIEWS) {
  /**
   * **WHAT THIS SWEEP FOUND, AT THE BRANCH TIP, IN THE FOUR VIEWS THE COLUMN HAS TO SURVIVE.**
   * Adjacent rungs and then the pair the ruling named, as changed pixels and the box they sit in,
   * measured over the island strip the crisis panel leaves free. The measurements are committed
   * beside the frames as `measured-smoke-*.txt`; this table is them, read.
   *
   * | view | 3 -> 2 | 2 -> 1 | 3 -> 1 | can you tell them apart |
   * | --- | --- | --- | --- | --- |
   * | `resting` 1.0x | 16,261 | 6,493 | 18,125 | **yes, unmistakably** |
   * | `closest` 0.5x | 11,379 | 10,085 | 14,198 | **yes** |
   * | `across-the-island` 1.0x | see the file | see the file | see the file | **yes** |
   * | `far` 2.6x | 339 | 443 | 448 | **no** |
   *
   * Against the flame ladder's **340 changed pixels in a 25x30 box** at the resting dolly, which is
   * the pass the lead rejected. The `far` row is the honest half and it is a finding rather than a
   * fix: at full zoom-out the island is about 300px across, the column is a few hundred pixels of
   * low-contrast pale smoke against a pale overcast sky with the crisis fog over it, and read side
   * by side the two frames cannot be told apart by eye. Nothing about the column's tone or opacity
   * was changed to chase it, because that ramp is #449's and it is what keeps a dying fire's wisp
   * from reading as a living fire's plume.
   */
  test.runIf(SHOTS)(
    `photographs the fuel ladder ${view.id} and measures what a rung is worth`,
    async () => {
      const look =
        view.claimed && view.id === "across-the-island"
          ? settlementCentre()
          : cellCenter(view.fire.col, view.fire.row);
      const frames = new Map<number, string>();
      for (const rung of FUEL_RUNGS) {
        frames.set(
          rung,
          await photograph(
            boardFor(winterWith(rung, view.fire)),
            `smoke-${view.id}-${rung}-of-${FUEL_STEPS}-rounds-${VIEW.width}x${VIEW.height}`,
            {
              notches: view.notches,
              out: view.out,
              expectRatio: view.ratio,
              look,
            },
          ),
        );
      }
      // WHERE THE ISLAND STARTS. The crisis panel is a DOM overlay over the left of the frame and it
      // is not fully opaque, so a change big enough to move the sky moves a few pixels under it too
      // and the raw bounding box comes back as the whole viewport. Measured off the live panel
      // rather than a constant, because its width is responsive.
      const panel = document
        .querySelector(".winter-in-city .hw-shell")
        ?.getBoundingClientRect();
      const strip = panel ? panel.right : 0;

      const decoded = new Map<number, Frame>();
      for (const [rung, shot] of frames) {
        decoded.set(rung, await pixelsOf(shot));
      }

      // THE PAIR THE RULING ASKED TO SEE, in one image rather than in two files.
      await sideBySide(
        `smoke-${view.id}-${FUEL_STEPS}-against-1-${VIEW.width}x${VIEW.height}`,
        {
          shot: frames.get(FUEL_STEPS) as string,
          caption: `${FUEL_STEPS} of ${FUEL_STEPS} rounds left, ${view.id}, ${VIEW.width}x${VIEW.height}`,
        },
        {
          shot: frames.get(1) as string,
          caption: `1 of ${FUEL_STEPS} rounds left, same board, same camera`,
        },
      );

      /*
       * ADJACENT RUNGS FIRST, because that is the hard pair: a player watching a fire burn down sees
       * one step at a time, and three-against-one is the easy comparison the ruling asked for.
       *
       * EVERY NUMBER IS MEASURED AND PRINTED BEFORE ANYTHING IS ASSERTED. The numbers are the
       * finding — including at the two dollies where the read fails — and an assertion that throws
       * in the middle of the loop takes the rest of the measurements with it, which is how a run
       * that could have reported three views reports one.
       */
      const report: string[] = [];
      const adjacent: { readonly change: Change; readonly label: string }[] = [];
      for (let i = 1; i < FUEL_RUNGS.length; i += 1) {
        const a = decoded.get(FUEL_RUNGS[i - 1] as number) as Frame;
        const b = decoded.get(FUEL_RUNGS[i] as number) as Frame;
        const change = changeBetween(a, b, strip);
        const label = `${FUEL_RUNGS[i - 1]}->${FUEL_RUNGS[i]}`;
        adjacent.push({ change, label });
        report.push(
          `${label}: ${change.pixels}px in ${change.right - change.left + 1}x${change.bottom - change.top + 1}`,
        );
      }
      const whole = changeBetween(
        decoded.get(FUEL_STEPS) as Frame,
        decoded.get(1) as Frame,
        strip,
      );
      report.push(
        `${FUEL_STEPS}->1: ${whole.pixels}px in ${whole.right - whole.left + 1}x${whole.bottom - whole.top + 1}`,
      );
      await record(`smoke-${view.id}`, [
        `# the fuel ladder, ${view.id} (${view.ratio}x of the default dolly), ${VIEW.width}x${VIEW.height}`,
        `# changed pixels between rungs, and the box they sit in, over the island strip from x=${Math.round(strip)}`,
        `# read claimed here: ${view.claimed}`,
        ...report,
      ]);

      const floor = view.claimed ? CHANGE_PIXELS_MIN : CHANGE_PIXELS_DRAWN;
      for (const { change, label } of adjacent) {
        expect(
          change.pixels,
          `${view.id}: ${label} rounds changed only ${change.pixels} pixels, against the flame ladder's ${FLAME_LADDER_PIXELS}`,
        ).toBeGreaterThan(floor);
        if (view.claimed) {
          const height = change.bottom - change.top + 1;
          expect(
            height,
            `${view.id}: ${label} rounds changed a ${height}px-tall band`,
          ).toBeGreaterThan(CHANGE_HEIGHT_MIN);
        }
      }
      // AND THE PAIR THE RULING NAMED, three rounds against one, which must be the biggest of them:
      // a ladder whose ends are no further apart than its rungs is not a ladder.
      expect(
        whole.pixels,
        `${view.id}: ${FUEL_STEPS} rounds against 1 changed ${whole.pixels} pixels`,
      ).toBeGreaterThan(floor);
      expect(
        whole.pixels,
        `${view.id}: the ends of the ladder are no further apart than one of its rungs`,
      ).toBeGreaterThanOrEqual(Math.max(...adjacent.map((a) => a.change.pixels)));
    },
    900000,
  );
}

/* -------------------------------------------------------------------------- */
/* Ruling 1: SHIELDED, on the surface rather than cropped to itself           */
/* -------------------------------------------------------------------------- */

/**
 * **`SHIELDED` OVER A REINFORCED BUILDING, FRAMED TO SHOW WHAT IS AROUND IT.**
 *
 * A claim about a caption being visible over a building is a claim about the surface, not about the
 * caption: cropped to the element that changed, a screenshot proves nothing, because the element is
 * the one part of the picture nobody doubted. So the frames are the whole 1024x580 viewport with the
 * crisis panel on it, and what is asserted is that every caption is really on screen, really inside
 * the island's own viewport, and really carrying the word — measured off the live DOM beside the
 * photograph rather than inferred from it.
 *
 * **THIS USED TO PHOTOGRAPH A SECOND OVERLAY, AND THE MEASUREMENT SURVIVED IT.** #470 drew a
 * `SHIELDED` tag from its own DOM host above the roofline; the lead's 2026-08-03 QA made the whole
 * label the status instead, so there is one host again and `[data-label-status="shielded"]` is the
 * subject these frames had as `[data-shield-tag]`. Three things about the port are worth naming,
 * because they are what the frames are for:
 *
 *  - **the hub is still the subject that matters.** #449 found the shielded hall was the one
 *    building in this crisis no frame had ever been taken of, because every population in the tree
 *    was derived from the skill graph, which correctly exempts it. The caption's population is the
 *    board's for exactly that reason (`skillLabelTargets`), and the resting frame asserts the hall's
 *    caption is on screen;
 *  - **the neighbour-collision half is gone because its cause is.** A tag over one building could
 *    sit on a NEIGHBOUR's label while each host policed only its own boxes. One host means one pass
 *    over every box in the channel, so the overlap check below is captions against captions and it
 *    is what says the single pass really does resolve them together;
 *  - **the second line went with the tag.** *"stops the next hit"* was the tag's own copy and there
 *    is no room for it in a one-word status vocabulary. The declare card and the advisor's briefing
 *    still say what a shield does.
 *
 * ## ⚑ AND TWO THINGS THE CAPTION DOES NOT DO THAT THE TAG DID, BOTH FOUND BY RUNNING THIS
 *
 * The port was first written asserting the tag's guarantees over the caption, on the reasonable
 * assumption that one box above a roofline behaves like another. It does not, and these two are
 * what retiring #470's overlay actually cost. They are ASSERTED here in the shape they really
 * have — see {@link CAPTION_AT}, which is a per-dolly expectation rather than one claim repeated —
 * so that a change restoring either behaviour fails rather than passing quietly:
 *
 *  - **NO ZOOM-OUT READING.** `labelZoomOpacity` fades every caption to nothing by
 *    `LABEL_FADE_END_RATIO` (1.9x) and the `far` dolly is 2.6x, so at full zoom-out **0 of 3**
 *    SHIELDED captions are legible. #470's tag had no fade, deliberately: *"pulled back over the
 *    whole island is exactly when 'which of these did I reinforce' is the question."* That reading
 *    is not lost, it changes CHANNEL — `CrisisStatusMarker`'s chevron is in-scene geometry and does
 *    not fade, which is the argument recorded in that file's header. What is lost is the WORD;
 *  - **NO CLAMP, SO A CAPTION CAN LEAVE THE FRAME.** At the `closest` dolly the hub's caption was
 *    measured with its top at **y = -38** against a viewport top of 0 — off the screen, and cut by
 *    the host's `overflow:hidden`. This is exactly the defect `placeTag` was written for; #470
 *    measured the hub's TAG 51px above this same 1024x580 viewport and answered it with a clamp and
 *    a flip, and `SkillLabels` has neither, because *"a caption clipped at the frame edge is a
 *    caption you were about to lose to the zoom fade anyway"* — which was true of a skill name and
 *    is not true of a status. Porting the clamp is the fix and it is not a merge's work.
 */

/**
 * What a SHIELDED caption is claimed to do at each dolly, and it is not the same claim three times.
 *
 * `onScreen` is how many of the three the caption layer really keeps LEGIBLE — kept by the collision
 * pass, not faded out, and inside the island's own viewport — and `hub` is whether the hall's is one
 * of them. Both are measured at the merged tip rather than intended, and both are asserted in BOTH
 * directions below: a dolly that starts doing better than its row fails just as loudly as one that
 * stops doing what its row says, which is what keeps the header's two findings from becoming
 * permanent by neglect.
 */
const CAPTION_AT: Readonly<
  Record<string, { readonly onScreen: number; readonly hub: boolean }>
> = {
  // The view the ruling is about: all three, the hub included, every one inside the frame.
  resting: { onScreen: SHIELDED_IN_FRAME.length, hub: true },
  // Dollied in, the cluster spreads past the frame and nothing pulls a caption back — the
  // header's second finding. Two of three stay legible; the hub's leaves the top at y = -38.
  closest: { onScreen: 2, hub: false },
  // Faded to nothing by 1.9x — the header's first finding. The chevron badge is the channel here.
  far: { onScreen: 0, hub: false },
};

for (const dolly of DOLLIES) {
  test.runIf(SHOTS)(
    `photographs the SHIELDED caption at the ${dolly.id} dolly, with the island around it`,
    async () => {
      const expected = CAPTION_AT[dolly.id];
      if (!expected) {
        throw new Error(
          `${dolly.id} has no row in CAPTION_AT, so nothing about it is being claimed`,
        );
      }
      await photograph(
        boardFor(winterWith(FUEL_STEPS)),
        `shielded-${dolly.id}-${VIEW.width}x${VIEW.height}`,
        {
          notches: dolly.notches,
          out: dolly.out,
          expectRatio: dolly.ratio,
          // AIMED AT THE SETTLEMENT rather than at the fire: the subject here is the buildings, and
          // the claim is about what is visible AROUND a caption, so the frame is of the surface.
          look: settlementCentre(),
        },
      );

      const everyCaption = Array.from(
        document.querySelectorAll<HTMLElement>("[data-skill-label][data-label-status]"),
      );
      const shieldedCaptions = everyCaption.filter(
        (el) => el.dataset.labelStatus === "shielded",
      );
      expect(
        shieldedCaptions.map((el) => el.dataset.skillLabel).sort(),
        "the label layer did not caption one SHIELDED per reinforced building",
      ).toEqual([...SHIELDED_IN_FRAME].sort());
      // EVERY building is captioned, not only the reinforced ones, which is the whole of the ask
      // the tag never covered: the name is REPLACED by a status rather than a status being added
      // over three of seven buildings.
      expect(
        everyCaption.length,
        "some buildings kept a skill name through the winter",
      ).toBe(CITY.length + 1);

      const viewport = document
        .querySelector('[data-testid="city-viewport"]')
        ?.getBoundingClientRect();
      if (!viewport) {
        throw new Error(
          "the city viewport never mounted, so nothing can be measured against it",
        );
      }
      let shown = 0;
      const detail: string[] = [];
      const shownBoxes: { readonly id: string; readonly box: DOMRect }[] = [];
      for (const caption of shieldedCaptions) {
        const nodeId = caption.dataset.skillLabel;
        expect(caption.textContent, `${nodeId}'s caption lost its word`).toBe(
          CRISIS_LABEL_TEXT.shielded,
        );
        const at = caption.getBoundingClientRect();
        detail.push(
          `${nodeId}:${caption.dataset.labelState}@${Math.round(at.left)},${Math.round(at.top)}`,
        );
        /*
         * LEGIBLE IS THREE CONDITIONS, and each of the three is a way this frame has actually
         * been wrong:
         *
         *  1. `labelState`, the collision pass's own verdict — a caption it dropped is at opacity 0;
         *  2. the ZOOM FADE, which is applied separately as opacity: past `LABEL_FADE_END_RATIO`
         *     (1.9x) every caption is transparent while still reading `shown`, so the `far` row at
         *     2.6x would otherwise report three captions no player can see;
         *  3. INSIDE THE ISLAND'S OWN VIEWPORT, because the host is `overflow:hidden` and
         *     `SkillLabels` has no clamp. Measured at the `closest` dolly: the hub's caption reads
         *     `shown` at full opacity with its top at y = -38, which is a box the compositor cut in
         *     half. Counting it would have been this file reporting a caption that is off the
         *     screen — the exact substitution the whole rig exists to refuse.
         *
         * `left` and `bottom` are in the same test as `top` rather than beside it, so a caption
         * clamped out past the crisis panel is not counted either: on screen and pointing at
         * nothing is not legible.
         */
        const box = caption.getBoundingClientRect();
        const insideTheIsland =
          box.left >= viewport.left - 1 &&
          box.top >= viewport.top - 1 &&
          box.bottom <= viewport.bottom + 1;
        if (
          caption.dataset.labelState !== "shown" ||
          Number.parseFloat(caption.style.opacity || "0") <= 0.05 ||
          !insideTheIsland
        ) {
          continue;
        }
        shown += 1;
        shownBoxes.push({ id: nodeId ?? "?", box });
        expect(box.width, `${nodeId}'s caption has no width`).toBeGreaterThan(40);
        expect(box.height, `${nodeId}'s caption has no height`).toBeGreaterThan(12);
      }

      /*
       * AND NO CAPTION SITS ON ANOTHER ONE, WHICH IS NOW ONE PASS'S JOB RATHER THAN TWO.
       *
       * Measured off the live DOM rather than read out of the photograph, because a 3px bite out
       * of a word is not a thing anybody reliably spots in a 1024x580 frame: the photograph is
       * what says it looks right, and this is what says it IS right. Both boxes come from
       * `getBoundingClientRect`, so what is compared is what the compositor laid out and not what
       * the layer intended.
       */
      const visible = everyCaption.filter(
        (el) =>
          el.dataset.labelState === "shown" &&
          Number.parseFloat(el.style.opacity || "0") > 0.05,
      );
      const collisions: string[] = [];
      for (const { id, box } of shownBoxes) {
        for (const other of visible) {
          if (other.dataset.skillLabel === id) {
            continue;
          }
          const at = other.getBoundingClientRect();
          const clear =
            box.right <= at.left ||
            at.right <= box.left ||
            box.bottom <= at.top ||
            at.bottom <= box.top;
          if (!clear) {
            collisions.push(
              `${id}'s SHIELDED overlaps ${other.dataset.skillLabel}'s ${other.dataset.labelStatus} by ${Math.round(Math.min(box.right, at.right) - Math.max(box.left, at.left))}x${Math.round(Math.min(box.bottom, at.bottom) - Math.max(box.top, at.top))}px`,
            );
          }
        }
      }

      await record(`shielded-${dolly.id}`, [
        `# the SHIELDED captions at the ${dolly.id} dolly (${dolly.ratio}x of the default), ${VIEW.width}x${VIEW.height}`,
        `${shown} of ${shieldedCaptions.length} on screen`,
        ...detail,
        // AND WHAT THE RULING COSTS, NAMED. A caption the collision pass drops is a building whose
        // status went unsaid for that frame, and that is the trade rather than a side effect, so it
        // is recorded per caption instead of left as a count to be inferred from.
        `${visible.length} of ${everyCaption.length} captions visible, ${collisions.length} overlapping`,
        ...everyCaption.map((el) => {
          const at = el.getBoundingClientRect();
          return `caption ${el.dataset.skillLabel}:${el.dataset.labelStatus}:${el.dataset.labelState}@${Math.round(at.left)},${Math.round(at.top)} ${Math.round(at.width)}x${Math.round(at.height)} opacity ${el.style.opacity || "0"}`;
        }),
        ...collisions,
      ]);

      /*
       * FLOORS, because every assertion above is satisfied by a frame in which every caption is
       * hidden, and "nothing overlaps" is free over an empty set.
       *
       * Two of the three shielded at every dolly, and ALL THREE at the resting one. The looser
       * floor away from rest is the collision pass doing its job rather than a defect: at full
       * zoom-out the three buildings are a few dozen pixels apart and two captions over one of them
       * is less readable than one, so a dropped caption there is the correct picture. At the resting
       * dolly — the view the ruling is about — there is room for all three, and the hub is the one
       * that has to be in shot, because it is the subject no frame in the tree had before #449.
       */
      expect(collisions, collisions.join("; ")).toEqual([]);
      expect(
        shown,
        `${shown} of ${shieldedCaptions.length} SHIELDED captions are legible at the ` +
          `${dolly.id} dolly, against the ${expected.onScreen} this view is measured to keep. ` +
          `More is the fade or the clamp having been improved: move the CAPTION_AT row and say so. ` +
          `Fewer is a regression`,
      ).toBe(expected.onScreen);

      if (expected.onScreen > 0) {
        // A caption cannot be "clear of another" over an empty set, so the overlap check above
        // only means something where something was on screen to overlap.
        expect(
          visible.length,
          "no caption at all is on screen, so nothing can be shown clear of another",
        ).toBeGreaterThanOrEqual(2);
      }

      // THE HUB, BOTH WAYS. It is the subject no frame in the tree had before #449 and the only
      // channel that can say a shielded hall is protected now that the roof and the tag are both
      // gone — so where it is claimed it is required, and where it is not, its absence is PINNED
      // rather than tolerated, which is what stops the header's two findings becoming permanent.
      const hub = shieldedCaptions.find((el) => el.dataset.skillLabel === TOWN_HALL_ID);
      expect(hub, "the hub has no SHIELDED caption at all, at any dolly").toBeDefined();
      const hubBox = hub?.getBoundingClientRect();
      const hubLegible =
        hub?.dataset.labelState === "shown" &&
        Number.parseFloat(hub?.style.opacity || "0") > 0.05 &&
        (hubBox?.top ?? -1) >= viewport.top - 1;
      expect(
        hubLegible,
        expected.hub
          ? "the shielded hub's caption is not legible inside the frame at the dolly the ruling is about"
          : `the shielded hub's caption is now legible at the ${dolly.id} dolly, which the ` +
              `CAPTION_AT row says it is not: read the header's two findings and move the row`,
      ).toBe(expected.hub);
    },
    600000,
  );
}

/**
 * And the table itself, so a row cannot quietly stop describing a dolly the frames above run.
 *
 * This one runs in CI, unlike the frames, because it costs nothing and because a dolly with no row
 * would otherwise throw inside a shot-gated test nobody runs — which is the same as not checking.
 */
test("every dolly the frames photograph has a claim written down for it", () => {
  expect([...DOLLIES].map((dolly) => dolly.id).sort()).toEqual(
    Object.keys(CAPTION_AT).sort(),
  );
  // A floor, so an emptied `DOLLIES` cannot satisfy the equality above against an emptied table.
  expect(DOLLIES.length).toBeGreaterThanOrEqual(3);
  // And the rows are not one row three times: the reason this is a table at all is that the caption
  // layer behaves differently at the three framings, so a collapse to one claim fails here.
  expect(
    new Set(Object.values(CAPTION_AT).map((row) => row.onScreen)).size,
  ).toBeGreaterThan(1);
  expect(new Set(Object.values(CAPTION_AT).map((row) => row.hub)).size).toBe(2);
  // And one row still claims the full set, so the table cannot decay into three excuses.
  expect(
    Object.values(CAPTION_AT).some((row) => row.onScreen === SHIELDED_IN_FRAME.length),
  ).toBe(true);
});
