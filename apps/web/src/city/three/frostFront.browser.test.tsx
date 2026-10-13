import { type ReactElement, useRef, useState } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import {
  findButton,
  type Harness,
  mount,
  setInputValue,
  waitFor,
} from "../../lessons/testHarness";
import {
  WINTER_NODE_ORDER,
  winterBatchFor,
  winterFrozenItem,
} from "../../winter/hardWinterItems";
import { resolveBuildingModel } from "../buildingAssets";
import { CURRENT_ERA_ID } from "../eraDressing";
import { resolveTownHallModel } from "../townHall";
import type { PlacedTransform } from "../worldLayout";
import type { OrbitControlsLike } from "./applyOrbit";
import { CityCanvasHost } from "./CityCanvasHost";
import type { ScenePlacement, SceneTownHall } from "./CityScene";
import { type WinterCityBoard, WinterInCity } from "./WinterInCity";
import { crisisPanelReach } from "./winterFraming";

import "../../styles.css";
import { eraCityLayout } from "../islandLand";

/**
 * **WHERE IS THE FROST, AND WHICH WAY IS IT GOING? PHOTOGRAPHED AT THE LEAD'S OWN WINDOW.**
 *
 * The lead, on the winter running over his city: *"right now the frost layer is not very
 * visible / where the frost is right now. it should also be visible on load, so that users can
 * see where the frost starts."*
 *
 * ## THE MEASUREMENT THAT REFRAMES THAT, AND IT IS THE FIRST TEST IN THIS FILE
 *
 * The frost is not faint at round one. There is NONE of it. `createHardWinter` opens with
 * `frozen: []` and the first advance happens in `end_round`, so a board on load has 0 of 88
 * cells frozen and 0 frost-line cells — which is what the panel in his screenshot says in
 * words (*"0 of 88 cells frozen"*). Nothing was rendering faintly; there was nothing to
 * render. So the ask is not "brighten the frost", it is **make the threat legible before it
 * arrives**, and `frost_next` is the state that did not exist.
 *
 * That claim is asserted here unconditionally rather than left in a commit message, because
 * every photograph below is only worth reading if it is true.
 *
 * ## WHY THIS IS PHOTOGRAPHS AND NOT STATISTICS
 *
 * `winterCrisisScene.browser.test.tsx` measures luminance and coverage, and a mean is
 * compatible with a great many pictures. The question here is one only a frame can answer:
 * from the frame alone, without reading the panel, can you tell where the frost is and which
 * way it is moving? The frost front is drawn in near-black-blue against near-white snow — the
 * whole island is already white (#323 made every winter ground state faceted snow-toned
 * terrain, which is right and is exactly why frost has no lightness contrast left to use), so
 * the read has to come from value and form and has to be LOOKED at.
 *
 * ## 1024x580, AND THE TWO CAPTURES
 *
 * 1024x580 is the lead's real window. A comfortable developer viewport has hidden a real
 * defect on this surface twice, and this one flatters it in a specific way: the crisis band
 * covers the bottom half of a short window, so a frost mark that only reads down there reads
 * nowhere.
 *
 * A WebGL canvas composites on its own layer, and a CDP capture taken with a full-screen
 * overlay above it comes back with a STALE canvas frame — `winterIslandVisible` measured that
 * and its answer is the one followed here: `composite-*.png` is the photograph of the screen,
 * and `island-*.png` is the same moment with the crisis mount hidden, which is the only
 * capture that shows the canvas layer as it actually stands. The frost is judged on the
 * second.
 *
 * ## IT IS OFF BY DEFAULT, FOR THE REASON `winterCrisisShots` RECORDS
 *
 * Run `VITE_WINTER_SHOTS=1 npm run test:browser` to take the pictures. Two shadow-mapped
 * scenes with seven GLBs each starves an animation-timing assertion in a DIFFERENT file when
 * left on, which is worse than not having the photographs in CI. `winterGround.test.ts` and
 * `frostSeam.test.ts` carry the always-on claims about this layer.
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's actual window. Short, which is where a bottom-band layout hides things. */
const HIS_WINDOW = { width: 1024, height: 580 } as const;

const LAYOUT = eraCityLayout("prehistoric");

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

function placed(nodeId: string, col: number, row: number): PlacedTransform {
  return { nodeId, col, row, rot: 0 };
}

/**
 * Era one's six skills plus the hall, spread across the board.
 *
 * Spread rather than packed on purpose: the frost front is a RING, so a city bunched at the
 * centre would leave the whole front out in empty snow where nothing tests whether it reads
 * against the settlement.
 */
const CITY: readonly PlacedTransform[] = [
  placed("NUM.S", -4, -3),
  placed("NUM.F", 2, 3),
  placed("NUM.2", 4, -1),
  placed("NUM.3", -3, 2),
  placed("NUM.4", 1, -4),
  placed("NUM.5", -1, 0),
];
const HALL: PlacedTransform = { nodeId: "town-hall", col: -1, row: -1, rot: 0 };

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

/**
 * The city and the crisis, wired the way `CitySurface` wires them, so the board on the canvas
 * is the board the panel is playing rather than one this file made up.
 */
function CityUnderWinter({
  onBoard,
}: {
  readonly onBoard: (board: WinterCityBoard | null) => void;
}): ReactElement {
  const [board, setBoard] = useState<WinterCityBoard | null>(null);
  const controlsRef = useRef<OrbitControlsLike | null>(null);
  return (
    <div className="city-shell">
      <div className="city-surface" data-winter={board !== null ? "true" : "false"}>
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
            winterRows={board?.rows ?? null}
            winterFires={board?.fires}
            ruinedNodeIds={board?.ruinedNodeIds}
            frostStageByNodeId={board?.frostStageByNodeId}
            onAimWinterCell={board?.onAimCell ?? undefined}
            fallback={<div data-testid="canvas-fallback" />}
          />
        </div>
      </div>
      <WinterInCity
        placements={CITY}
        townHall={HALL}
        canvasLive
        practisedNodeIds={WINTER_NODE_ORDER}
        onBoard={(next) => {
          setBoard(next);
          onBoard(next);
        }}
        onExit={() => undefined}
      />
    </div>
  );
}

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

function panel(): HTMLElement {
  return query<HTMLElement>(".winter-in-city .hw-shell");
}

/** How many land cells on the published board carry `flag`. */
function countCells(
  board: WinterCityBoard,
  flag: (cell: WinterCityBoard["rows"][number][number]) => boolean,
): number {
  let total = 0;
  for (const line of board.rows) {
    for (const cell of line) {
      if (cell.land && flag(cell)) {
        total += 1;
      }
    }
  }
  return total;
}

/**
 * WHERE THIS TEST'S VIEWPORT SITS INSIDE THE BROWSER WINDOW.
 *
 * Vitest runs the test in an iframe on a tester page and SCALES that iframe when the requested
 * viewport is larger than the window, so `window.innerWidth` and the real screen pixels
 * disagree. Every capture is clipped to this box, which is what makes an image pixel divide
 * cleanly back into a CSS pixel of the viewport the assertions are written in.
 */
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
 * The composited frame, clipped to this test's viewport, as a base64 PNG.
 *
 * CDP rather than `page.screenshot`, which is Playwright's LOCATOR capture and never gets past
 * *"waiting for element to be stable"* against a canvas running `frameloop="always"`.
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
    await commands.writeFile(
      `apps/web/src/city/three/__screenshots__/frost-front/${name}.png`,
      shot,
      { encoding: "base64" },
    );
  }
}

/** A captured PNG, decoded to pixels this test can read. */
async function frame(base64: string): Promise<{
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
    throw new Error("no 2D context to sample the frame with");
  }
  ctx.drawImage(image, 0, 0);
  return {
    data: ctx.getImageData(0, 0, sink.width, sink.height).data,
    width: sink.width,
    height: sink.height,
  };
}

/**
 * WHERE THE FROST FRONT IS DRAWN, read off a frame.
 *
 * The front is the only thing in a winter frame that is strongly BLUE rather than teal or pale:
 * it is `WINTER_GROUND_TONES.frostFront` at three value steps, and everything else cold in the
 * scene is either near-white (snow, sheet ice, frost) or teal (`WATER_COLD`, whose green and blue
 * channels sit within about ten of each other). So the classifier asks for blue over GREEN as well
 * as blue over red, and the sea — measured at `(10, 49, 57)` in these very frames, a
 * blue-over-green of 8 — is excluded by the first term rather than by a threshold that happens to
 * work on one picture.
 *
 * **AND IT ASKS FOR A DARK PIXEL, WHICH IT DID NOT HAVE TO UNTIL 2026-08-02.** The frozen margin
 * (`buildFrostMargin`) put frost-toned ground over the whole island outside the board, and
 * `WINTER_GROUND_TONES.frost` is `(200, 223, 239)`: a blue-over-green of 16 and a blue-over-red of
 * 39, which is within a pixel's lighting of clearing both of the terms above. It did clear them,
 * and the run before this line went in reported a front starting 42px further left than the panel's
 * own edge — the margin, read as front. The front is `(60, 127, 160)`, so its RED is 140 below
 * frost's while its blue-over-red is 61 above; the front is the one dark value in the cold palette
 * and that constant's own docblock says so. Keying on darkness is therefore keying on the property
 * the tone was chosen for rather than on a threshold that separates these two frames.
 *
 * Reported in CSS pixels of this test's viewport, so it can be set against the crisis panel's own
 * `getBoundingClientRect`.
 */
function frontBand(
  sample: { data: Uint8ClampedArray; width: number; height: number },
  view: { readonly width: number; readonly height: number },
  behind: number,
): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  pixels: number;
  /** How many of those pixels fall left of `behind`, so the panel is hiding them. */
  hidden: number;
} {
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  let pixels = 0;
  let hidden = 0;
  for (let y = 0; y < sample.height; y += 1) {
    for (let x = 0; x < sample.width; x += 1) {
      const at = (y * sample.width + x) * 4;
      const r = sample.data[at] ?? 0;
      const g = sample.data[at + 1] ?? 0;
      const b = sample.data[at + 2] ?? 0;
      if (!(b - g > 15 && b - r > 40 && r < 140)) {
        continue;
      }
      pixels += 1;
      const cssX = (x * view.width) / sample.width;
      const cssY = (y * view.height) / sample.height;
      if (cssX < behind) {
        hidden += 1;
      }
      left = Math.min(left, cssX);
      right = Math.max(right, cssX);
      top = Math.min(top, cssY);
      bottom = Math.max(bottom, cssY);
    }
  }
  return { left, right, top, bottom, pixels, hidden };
}

/**
 * THE PAIR OF CAPTURES ONE MOMENT OWES: the screen, and the canvas under it.
 *
 * The second is what the frost is judged on, and it is not an optimisation — a capture taken
 * with the crisis mount up returns a stale canvas layer, so the composite alone cannot be read
 * for anything the renderer changed.
 */
async function photograph(name: string): Promise<string> {
  await keep(`composite-${name}`, await capture());
  const mount = query<HTMLElement>(".winter-in-city");
  mount.style.visibility = "hidden";
  try {
    const island = await capture();
    await keep(`island-${name}`, island);
    return island;
  } finally {
    mount.style.visibility = "";
  }
}

/** Mount the composition and wait for the SETTLEMENT to be drawn, not merely mounted. */
async function openCrisisOverTheIsland(
  onBoard: (board: WinterCityBoard | null) => void,
): Promise<void> {
  await page.viewport(HIS_WINDOW.width, HIS_WINDOW.height);
  h = mount(<CityUnderWinter onBoard={onBoard} />);
  await waitFor(
    () => document.querySelector(".city-viewport canvas") !== null,
    "the city canvas never mounted",
    30000,
  );
  await waitFor(
    () => document.querySelector(".winter-in-city .hw-shell") !== null,
    "the crisis panel never rendered",
    30000,
  );
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 2500));
  /*
   * A THROWAWAY CAPTURE, and it is load-bearing. `Page.captureScreenshot` with a `clip` puts a
   * device-metrics override on the page, which R3F sees as a resize: it re-measures and
   * re-renders, and the frame the FIRST capture returns is the one drawn before any of that
   * settled. `winterIslandVisible` measured a first clipped capture coming back as flat pale
   * sky. So the first one is spent here.
   */
  await capture();
  await new Promise<void>((resolve) => setTimeout(resolve, 600));
}

/** Answer the round's whole batch through the panel, so the round really resolves. */
async function answerTheBatch(round: number): Promise<void> {
  const batch = winterBatchFor({
    masteredNodeIds: WINTER_NODE_ORDER,
    encounter: 1,
    round,
  });
  if (batch.status !== "ready") {
    throw new Error(`no batch for round ${round}`);
  }
  const keys = batch.prompts.map((prompt) => {
    const key = winterFrozenItem(prompt.item_version_id)?.answer.answer_key;
    if (typeof key !== "string") {
      throw new Error(`no text answer key for ${prompt.item_version_id}`);
    }
    return key;
  });

  for (const [index, key] of keys.entries()) {
    setInputValue(query<HTMLInputElement>(".winter-in-city .hw-panel input"), key);
    await waitFor(
      () => !findButton(panel(), /^Check$/).disabled,
      `Check arms on question ${index + 1} of round ${round}`,
    );
    findButton(panel(), /^Check$/).click();
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-verdict") !== null,
      `a verdict lands on question ${index + 1} of round ${round}`,
    );
    findButton(panel(), /See what you earned|Next question/).click();
    await waitFor(
      () =>
        index + 1 >= keys.length
          ? panel().dataset.phase === "resolved"
          : document.querySelector(".winter-in-city .hw-verdict") === null,
      `the batch moves on from question ${index + 1} of round ${round}`,
    );
  }
}

/**
 * One whole round, played through the panel: reinforce a building, answer the batch, and let
 * the frost advance.
 *
 * **REINFORCE AND NOT A PULL-BACK, WHICH WAS TRIED FIRST AND PHOTOGRAPHED WRONG.** A pull-back
 * hands the frost a whole rim band at once and paints it `abandoned`, which sits ABOVE the
 * frost on the rung ladder — so the first mid-encounter frame taken this way was a picture of
 * a large dead-char region with the frost hidden under it. The subject is the frost's own
 * advance, so the round is played with the one action that changes no ground at all.
 */
async function playRoundThroughThePanel(
  round: number,
  reinforce: (nodeId: string) => void,
): Promise<void> {
  findButton(panel(), /Reinforce a building/).click();
  await waitFor(
    () => panel().dataset.aiming === "true",
    `the panel arms a reinforce in round ${round}`,
  );
  reinforce("NUM.S");
  await waitFor(
    () => !findButton(panel(), /Commit and face/).disabled,
    `the commit control arms in round ${round}`,
  );
  findButton(panel(), /Commit and face/).click();
  await waitFor(
    () => panel().dataset.phase === "answering",
    `the batch opens in round ${round}`,
  );
  await answerTheBatch(round);
  findButton(panel(), /Let the frost advance/).click();
  await waitFor(
    () => panel().dataset.phase === "declaring",
    `round ${round} closes and the next opens`,
  );
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 900));
}

/* -------------------------------------------------------------------------- */
/* The always-on claim: the diagnosis                                         */
/* -------------------------------------------------------------------------- */

/**
 * **THE FROST IS NOT FAINT AT ROUND ONE. THERE IS NONE OF IT.**
 *
 * Measured off the engine rather than described, because it is the finding that decides what
 * this whole change is for: if cells WERE frozen on load and simply rendered invisibly, the
 * fix would be a re-tone and not a new state.
 *
 * Run in node as well as in Chromium — this is pure engine arithmetic — but it lives here
 * because it is the premise of the photographs below and a reader of them needs it in the
 * same file.
 */
test("at round one nothing is frozen, and the front is the whole 28-cell shoreline", async () => {
  const { createHardWinter, hardWinterIsland, hardWinterView, winterSpreadSteps } =
    await import("@cr/game");

  const island = hardWinterIsland(CURRENT_ERA_ID);
  expect(island.cells.length, "era one's island is 88 cells").toBe(88);

  const winter = createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: CITY.map((p) => ({ node_id: p.nodeId, col: p.col, row: p.row })),
  });
  expect(winter.round).toBe(1);
  expect(winter.phase).toBe("declaring");
  // THE FINDING: the set is empty, so there is nothing on the ground to make brighter.
  expect(winter.frozen, "something is frozen on load").toEqual([]);

  const view = hardWinterView(winter);
  const land = view.rows.flat().filter((cell) => cell.land);
  expect(land).toHaveLength(88);
  expect(land.filter((cell) => cell.frozen)).toHaveLength(0);
  expect(land.filter((cell) => cell.frost_line)).toHaveLength(0);

  // ...and what the new state has to draw instead: the ground this round takes, which is the
  // whole shoreline band, one orthogonal step in from the water.
  const next = land.filter((cell) => cell.frost_next);
  expect(winterSpreadSteps(1)).toBe(1);
  expect(next.length, "the front is not the shoreline band").toBe(28);
  for (const cell of next) {
    expect(cell.rim_depth, `(${cell.col},${cell.row}) is not on the shore`).toBe(0);
  }
  // The front is a RING and not a patch: it reaches every side of the island, which is the
  // claim the picture has to make good on.
  expect(Math.min(...next.map((c) => c.col))).toBeLessThan(-3);
  expect(Math.max(...next.map((c) => c.col))).toBeGreaterThan(3);
  expect(Math.min(...next.map((c) => c.row))).toBeLessThan(-3);
  expect(Math.max(...next.map((c) => c.row))).toBeGreaterThan(3);
});

/* -------------------------------------------------------------------------- */
/* The photographs                                                            */
/* -------------------------------------------------------------------------- */

test.runIf(SHOTS)(
  "photographs the frost front on load and mid-encounter at 1024x580",
  async () => {
    let latest: WinterCityBoard | null = null;
    await openCrisisOverTheIsland((board) => {
      if (board) {
        latest = board;
      }
    });
    expect(panel().dataset.phase, "the crisis did not open on declare").toBe("declaring");

    /*
     * ROUND ONE ON LOAD — the state the objection is about. The board is asserted to be the
     * one the diagnosis describes BEFORE it is photographed, so the frame cannot be a picture
     * of some other moment: nothing frozen, no frost line, and a full shoreline front.
     */
    const onLoad = latest as unknown as WinterCityBoard;
    expect(onLoad, "the winter never published a board").not.toBeNull();
    expect(countCells(onLoad, (cell) => cell.frozen)).toBe(0);
    expect(countCells(onLoad, (cell) => cell.frost_line)).toBe(0);
    expect(countCells(onLoad, (cell) => cell.frost_next)).toBe(28);
    const onLoadFrame = await photograph("01-round-one-on-load-1024x580");

    /*
     * **AND IT IS DRAWN WHERE HE CAN SEE IT, which is the half a beautiful ring can still fail.**
     *
     * At 1024x580 the crisis panel takes about half the screen, so the island gets a strip and the
     * front is a RING — the whole point of which is that it reaches every edge of the board, so it
     * is the first thing a panel crops. `winterFraming`'s own note says as much: what the framing
     * costs is the outermost ring of cells on the panel's side.
     *
     * The claim is therefore measured against the panel's REAL BOX rather than against a viewport
     * fraction, and against whichever edge the panel is on. It was a bottom band when this was
     * written and #337 made it a left side panel with the framing sliding sideways to match; a
     * measurement keyed to "above the band's top" would have gone on passing over a panel that no
     * longer has a top edge inside the screen.
     *
     * Measured on the ISLAND-ONLY capture, because that is the only one that shows the canvas layer
     * as it stands.
     */
    const box = panel().getBoundingClientRect();
    const front = frontBand(await frame(onLoadFrame), HIS_WINDOW, box.right);
    // A floor first, so nothing below is vacuous: a frame with no front in it would satisfy
    // "the front is not behind the panel" perfectly.
    expect(front.pixels, "no frost front in the frame at all").toBeGreaterThan(1500);

    /*
     * The panel is a LEFT column, so the free strip is to the right of it. Both numbers are read
     * rather than assumed: `crisisPanelReach` is the arithmetic the CAMERA is aimed by (a mirror of
     * the stylesheet, which `winterCrisisBandMirror.test.ts` holds against it), and the DOM box is
     * what is actually on screen. Asserting the front against both is what makes this a claim about
     * the composition rather than about either half — a framing that agreed with the mirror while
     * the panel had moved would satisfy one and fail the other.
     */
    const reach = crisisPanelReach(HIS_WINDOW);
    expect(box.left, "the crisis panel is not anchored to the left edge").toBeLessThan(
      HIS_WINDOW.width / 4,
    );
    expect(
      Math.round(box.right),
      "the panel on screen is wider than the reach the camera is aimed by",
    ).toBeLessThanOrEqual(Math.ceil(reach));
    /*
     * **AND IT IS A SHARE OF THE RING RATHER THAN ITS LEFTMOST PIXEL, SINCE 2026-08-03.**
     *
     * This read `box.right - front.left <= 0`: not one pixel of the front behind the panel. That
     * was a true claim only because the front used to be drawn ON the board's own outermost ring,
     * so it was never bigger than the settlement the framing is sized to fit. The front now stands
     * a full cell OUTSIDE that ring (`frostFrontMarks`, and the lead's *"it needs to start one
     * layer out"*), so at 1024x580 the ring is wider than the disc `winterFraming` fits and its
     * left arc is tangent to the panel's edge: measured on the frame this run took, `front.left`
     * is 483 against a panel reaching 484, so the old line failed by **1px**.
     *
     * Widening the framing to fit the ring is the alternative and it is the wrong trade — that
     * module's own header records the lead rejecting the zoom-out twice, and fitting a ring at
     * radius 27 rather than a settlement at 22 costs about a fifth of the scale. So the claim is
     * restated as what it was always protecting: the ring is on screen, not behind the panel. The
     * loosened line still catches the defect it was written for, which is the framing failing to
     * slide at all — `winterFraming.ts` measures the island running **335px** behind the panel's
     * edge unframed, which hides most of the ring's left half rather than a rounding error.
     */
    expect(
      front.hidden / front.pixels,
      `${Math.round((front.hidden / front.pixels) * 100)}% of the front is behind the crisis panel ` +
        `(${front.hidden} of ${front.pixels} px, its left edge ${Math.round(box.right - front.left)}px past it)`,
    ).toBeLessThan(0.05);

    // ...and it is a RING in the strip that is left rather than an arc squeezed against the far
    // edge, which is what a front the framing had cropped would look like.
    const strip = HIS_WINDOW.width - reach;
    expect(
      (front.right - front.left) / strip,
      `the front spans only ${Math.round(((front.right - front.left) / strip) * 100)}% of the free strip`,
    ).toBeGreaterThan(0.5);

    /*
     * A MID-ENCOUNTER ROUND, so the boundary between taken and untaken ground is in the frame
     * as well as the approach. Played through the panel rather than by handing the canvas a
     * board of this file's own making: the picture has to be of the product's own state.
     *
     * **ONE ROUND, AND NOT THE TWO IT PLAYED UNTIL 2026-08-02.** The advance is 1, 2, 3 bands now
     * (`HARD_WINTER.spread.accelerate_every: 1`), which reaches 28, then 72, then all 88 cells, so
     * the frame taken after two rounds had 72 frozen, the last 16 under the front, and NO clear
     * land left anywhere on it — a picture of a wholly claimed island rather than of a boundary.
     * The floor below caught it, which is what a floor is for. After one round the board reads
     * 28 frozen / 44 coming / 16 clear, which is the three-way frame this shot is of.
     */
    const reinforce = (nodeId: string): void => {
      (latest as unknown as WinterCityBoard).onPickBuilding(nodeId);
    };
    await playRoundThroughThePanel(1, reinforce);
    const mid = latest as unknown as WinterCityBoard;
    expect(countCells(mid, (cell) => cell.frozen)).toBeGreaterThan(20);
    expect(countCells(mid, (cell) => cell.frost_line)).toBeGreaterThan(0);
    expect(countCells(mid, (cell) => cell.frost_next)).toBeGreaterThan(0);
    // A GROUND STATE ABOVE THE FROST COULD HIDE IT, and there is none: the abandoned state was
    // the only one, and it went with the give-up-ground action on 2026-08-02. This read
    // `countCells(mid, (cell) => cell.abandoned)`, which was the version of the check that could
    // still be false; what is left is that every land cell on this frame is in a frost state or
    // clear, so nothing is stacked over the marks the shot is of.
    expect(
      countCells(
        mid,
        (cell) => cell.land && !cell.frozen && !cell.frost_next && !cell.warded,
      ),
      "no clear land is left, so this frame cannot show a front at all",
    ).toBeGreaterThan(0);
    // The three frost states are genuinely all on the board, which is what makes this frame
    // the one that answers "how far has it got" as well as "what is it about to take".
    expect(
      countCells(mid, (cell) => cell.frozen && !cell.frost_next),
      "no ground the frost already holds",
    ).toBeGreaterThan(10);
    await photograph("02-mid-encounter-1024x580");
  },
  180000,
);
