import {
  createHardWinter,
  type HardWinterState,
  hardWinterView,
  winterCellKey,
} from "@cr/game";
import type { ReactElement, RefObject } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { resolveBuildingModel } from "../buildingAssets";
import { CURRENT_ERA_ID } from "../eraDressing";
import { eraCityLayout } from "../islandLand";
import { resolveTownHallModel, TOWN_HALL_ID } from "../townHall";
import {
  footprintCells,
  footprintFor,
  occupiedCells,
  type PlacedTransform,
} from "../worldLayout";
import type { OrbitControlsLike } from "./applyOrbit";
import { CityCanvasHost } from "./CityCanvasHost";
import type { ScenePlacement, SceneTownHall } from "./CityScene";

import "../../styles.css";

/**
 * **GROUND A FIRE IS HOLDING: PER TILE, AND NOT UNDER A BUILDING.**
 *
 * > *"instead of making all the tiles overlap, just make the tiles protected by the real fire
 * > look like it does in the preview, with each tile individually protected"*
 *
 * > *"also the fire-protected squares that overlap with buildings look terrible; just make the
 * > fire not show when it overlaps with the building"*
 *
 * Both are SPATIAL claims, so `.cursor/rules/qa-verification.mdc` says a passing test does not
 * discharge either: they owe rendered frames at a short realistic viewport, named beside them.
 * 1024x580 is the lead's own window, and nothing here is cropped to the held patch, because the
 * question *"does this still read as ground someone cleared"* is about the surface round it.
 *
 * ## THE BOARD IS BUILT SO ONE FRAME CARRIES EVERY CASE THAT WAS ASKED ABOUT
 *
 * A fire at `(0, 0)` and a compact settlement round it, so a single wide-reach frame holds:
 *
 *  - **a building INSIDE the held area** — `NUM.3`, a 1x1 at `(0, 1)`, with held ground on all
 *    four sides of it. This is the *"does it read as a hole"* case;
 *  - **a multi-cell footprint fully inside** — `NUM.F`, a 2x1 at `(-2, 0)`, both cells held;
 *  - **a building at the EDGE of the reach** — `NUM.5`, a 2x2 at `(1, 1)` with exactly one of its
 *    four cells in reach. This is the *"partial tan patch under one corner"* case, which the fix
 *    answers by omitting the whole footprint rather than the cells that happen to be held;
 *  - **the HUB straddling the boundary** — a 3x2 at `(-2, -2)` with three of its six cells held;
 *  - **buildings the fire does not reach**, so the frame has an unheld comparison in it.
 *
 * And the reach varies with accuracy, so the committed fire is photographed at all three radii a
 * tier can buy — a dot, a cross and a diamond. A single-cell hold and a thirteen-cell one are
 * different pictures and only the second could ever have merged.
 *
 * ## THE PREVIEW AND THE FACT ARE PHOTOGRAPHED AT THE SAME REACH
 *
 * *"Make the committed fire look like the preview"* is a claim about two pictures, so both are
 * taken, at the same cell, with the same camera and the same city — `01` against `04`. The
 * committed fire's own hearth and smoke stand in `04` and the ghost's in `01`, which is the one
 * difference that is meant to be there.
 *
 * ## THE FRAMES ARE COMMITTED AND BEHIND A SHOT FLAG
 *
 * `docs/design-refs/hard-winter-held-ground-per-tile/`, copied to `output/`. Behind
 * `VITE_WINTER_SHOTS`, per the rule that no test writes a tracked path unless a shot flag is set
 * (`test/testWritesStayOutOfTheTree.test.ts`).
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's actual window, named in every filename per the spatial-claim rule. */
const VIEW = { width: 1024, height: 580 } as const;

const DIRS = [
  "docs/design-refs/hard-winter-held-ground-per-tile",
  "output/design-refs/hard-winter-held-ground-per-tile",
] as const;

const LAYOUT = eraCityLayout(CURRENT_ERA_ID);

/** Where the fire is lit and aimed. Free of every footprint below. */
const FIRE_AT = { col: 0, row: 0 } as const;

const CITY: readonly PlacedTransform[] = [
  // Inside the widest reach, with held ground on all four sides.
  { nodeId: "NUM.3", col: 0, row: 1, rot: 0 },
  // A 2x1 with BOTH cells inside the reach.
  { nodeId: "NUM.F", col: -2, row: 0, rot: 0 },
  // A 2x2 with exactly one of its four cells in reach: the edge case.
  { nodeId: "NUM.5", col: 1, row: 1, rot: 0 },
  // Outside the reach, so the frame has unheld buildings to read against.
  { nodeId: "NUM.S", col: -4, row: 1, rot: 0 },
  { nodeId: "NUM.2", col: 3, row: -1, rot: 0 },
  { nodeId: "NUM.4", col: 2, row: -3, rot: 0 },
];
/** The 3x2 hub, straddling the boundary: three of its six cells are held. */
const HALL: PlacedTransform = { nodeId: TOWN_HALL_ID, col: -2, row: -2, rot: 0 };

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

/** Every ward radius a tier can buy, from the tuning rather than written down. */
const REACHES = [0, 1, 2] as const;

function opening(): HardWinterState {
  return createHardWinter({
    era: CURRENT_ERA_ID,
    buildings: [...CITY, HALL].map((p) => ({
      node_id: p.nodeId,
      col: p.col,
      row: p.row,
    })),
  });
}

/**
 * The board with one burning fire of `radius`, or with the fire only PROPOSED.
 *
 * Nothing is frozen and the round is one, deliberately: the subject is the held ground, and a
 * board with frost on it would put the frost front's own blue through the same frame.
 */
function boardFor(radius: number | null) {
  const state: HardWinterState =
    radius === null
      ? opening()
      : {
          ...opening(),
          fires: [{ ...FIRE_AT, radius, rounds_left: 2, lit_in_round: 1 }],
        };
  const view =
    radius === null
      ? hardWinterView(state, { fire_preview: FIRE_AT })
      : hardWinterView(state);
  return { state, rows: view.rows };
}

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

function session(): {
  send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
} {
  return cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
}

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await session().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
});

afterAll(async () => {
  // The emulation is set on the PAGE and vitest reuses one page per worker, so leaving it on
  // would switch reduced motion into whatever file runs next.
  await session().send("Emulation.setEmulatedMedia", { features: [] });
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * The island alone, with no crisis panel over it.
 *
 * The panel is deliberately absent here, and it is the one place these frames differ from the
 * other winter sets: this claim is about a patch of GROUND in the middle of the settlement, the
 * panel is a left column that hides the left third, and there is a separate suite
 * (`winterOneIceRing`) whose subject is what the panel leaves visible. The camera is the crisis
 * camera either way, because `CityCanvasHost` frames a winter board the same whether or not
 * anything is mounted over it.
 */
function IslandUnderAFire({
  rows,
  firePreviewAt,
  fires,
  controlsRef,
}: {
  readonly rows: ReturnType<typeof boardFor>["rows"];
  readonly firePreviewAt: { readonly col: number; readonly row: number } | null;
  readonly fires: HardWinterState["fires"];
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
            winterRows={rows}
            winterFires={fires}
            winterFirePreviewAt={firePreviewAt}
            fallback={<div data-testid="canvas-fallback" />}
          />
        </div>
      </div>
    </div>
  );
}

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

async function capture(): Promise<string> {
  const box = testViewportBox();
  const shot = await session().send("Page.captureScreenshot", {
    format: "png",
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
  });
  if (!shot.data) {
    throw new Error("CDP returned no screenshot data");
  }
  return shot.data;
}

/** The first clipped capture after a change is the frame from before it. See `winterOneIceRing`. */
async function settledCapture(): Promise<string> {
  await capture();
  await new Promise<void>((resolve) => setTimeout(resolve, 500));
  return capture();
}

async function keep(name: string, shot: string): Promise<void> {
  for (const dir of DIRS) {
    if (SHOTS) {
      await commands.writeFile(`${dir}/${name}.png`, shot, { encoding: "base64" });
    }
  }
}

async function keepText(name: string, body: string): Promise<void> {
  for (const dir of DIRS) {
    if (SHOTS) {
      await commands.writeFile(`${dir}/${name}.txt`, body);
    }
  }
}

/**
 * What each building's floating caption ACTUALLY reads on screen, and whether it is drawn.
 *
 * This is the measurement the second ruling rests on and the one it would have been easiest to
 * skip: the argument for removing the tan is *"the caption already says SAFE"*, and a caption is
 * not guaranteed to be on screen. `resolveVisibleLabels` drops any label whose padded box hits a
 * nearer one, and `labelZoomOpacity` fades the whole set past 1.35x the default dolly — so
 * "SkillLabels renders a target for it" and "a player can read it" are different claims, and
 * only the second one licenses taking a channel away.
 *
 * Read off the live overlay rather than off `skillLabelTargets`, for that reason: the element's
 * own computed opacity and its box on screen.
 */
interface Caption {
  readonly text: string;
  readonly opacity: number;
  readonly left: number;
  readonly top: number;
}
function captionsOnScreen(): Map<string, Caption> {
  const found = new Map<string, Caption>();
  for (const element of document.querySelectorAll<HTMLElement>("[data-skill-label]")) {
    const nodeId = element.dataset.skillLabel;
    if (!nodeId) {
      continue;
    }
    const box = element.getBoundingClientRect();
    found.set(nodeId, {
      text: (element.textContent ?? "").trim(),
      opacity: Number(getComputedStyle(element).opacity),
      left: Math.round(box.left),
      top: Math.round(box.top),
    });
  }
  return found;
}

/** One board's frame, the ground it was taken over, and what every caption read on it. */
interface Frame {
  readonly shot: string;
  readonly heldCells: ReadonlySet<string>;
  readonly captions: ReadonlyMap<string, Caption>;
}

/**
 * Mount one board, wait for the settlement to be DRAWN rather than merely mounted, photograph.
 *
 * The return type is NAMED rather than written inline, and it has to be: the write guard in
 * `test/testWritesStayOutOfTheTree.test.ts` finds a helper's own name by walking back from its
 * body brace to the parameter list, and an inline `Promise<{ … }>` puts a `}` in the way. With
 * one here, `keep()` — which is reached only through this function — reads as an ungated write to
 * a tracked path and the guard fails the file. Measured, not guessed: it did.
 */
async function photograph(name: string, radius: number | null): Promise<Frame> {
  const { rows, state } = boardFor(radius);
  const controlsRef = { current: null as OrbitControlsLike | null };
  h = mount(
    <IslandUnderAFire
      rows={rows}
      firePreviewAt={radius === null ? FIRE_AT : null}
      fires={state.fires}
      controlsRef={controlsRef}
    />,
  );
  await waitFor(
    () => document.querySelector(".city-viewport canvas") !== null,
    "the city canvas never mounted",
    30000,
  );
  await document.fonts.ready;
  // The GLBs resolve behind their own Suspense boundaries and the ground group rebuilds when the
  // board arrives; there is no renderer handle out here, so this waits on the clock.
  await new Promise<void>((resolve) => setTimeout(resolve, 3000));
  const shot = await settledCapture();
  await keep(`${name}-${VIEW.width}x${VIEW.height}`, shot);

  const heldCells = new Set(
    rows
      .flat()
      .filter((cell) => (radius === null ? cell.preview_tier !== null : cell.warded))
      .map((cell) => winterCellKey(cell.col, cell.row)),
  );
  const captions = captionsOnScreen();
  h?.cleanup();
  h = null;
  return { shot, heldCells, captions };
}

/* -------------------------------------------------------------------------- */
/* The always-on premise: the board really is the one described above         */
/* -------------------------------------------------------------------------- */

/**
 * **THE FRAMES ARE ONLY WORTH READING IF THE BOARD HOLDS THE CASES THE CAPTIONS CLAIM.**
 *
 * A frame set whose captions are written by the test is a frame set that cannot be wrong about
 * what it is showing. So the four cases are derived off the engine's own board, unconditionally,
 * beside the photographs that depend on them.
 */
test("the photographed board holds a building inside the reach, one at its edge and the straddling hub", () => {
  const { rows } = boardFor(2);
  const held = new Set(
    rows
      .flat()
      .filter((cell) => cell.warded)
      .map((cell) => winterCellKey(cell.col, cell.row)),
  );
  expect(held.size, "the widest reach holds no ground").toBeGreaterThan(8);

  const cellsOf = (p: PlacedTransform) => footprintCells(p, footprintFor(p.nodeId));
  const heldCellsOf = (p: PlacedTransform) => cellsOf(p).filter((key) => held.has(key));

  // INSIDE: a 1x1 whose own cell is held and which has held ground on all four sides.
  const inside = CITY.find((p) => p.nodeId === "NUM.3") as PlacedTransform;
  expect(cellsOf(inside)).toHaveLength(1);
  expect(heldCellsOf(inside)).toHaveLength(1);
  for (const [dc, dr] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    expect(
      held.has(winterCellKey(inside.col + dc, inside.row + dr)),
      `${inside.nodeId} is not surrounded by held ground, so it is not the "inside" case`,
    ).toBe(true);
  }

  // A MULTI-CELL FOOTPRINT FULLY INSIDE.
  const wholly = CITY.find((p) => p.nodeId === "NUM.F") as PlacedTransform;
  expect(cellsOf(wholly).length).toBeGreaterThan(1);
  expect(heldCellsOf(wholly)).toHaveLength(cellsOf(wholly).length);

  // AT THE EDGE: a 2x2 with some cells held and some not, which is the partial-patch case.
  const edge = CITY.find((p) => p.nodeId === "NUM.5") as PlacedTransform;
  expect(cellsOf(edge)).toHaveLength(4);
  expect(heldCellsOf(edge).length).toBeGreaterThan(0);
  expect(heldCellsOf(edge).length).toBeLessThan(4);

  // THE HUB, straddling: the largest footprint on the island, part in and part out.
  expect(cellsOf(HALL).length).toBeGreaterThanOrEqual(6);
  expect(heldCellsOf(HALL).length).toBeGreaterThan(1);
  expect(heldCellsOf(HALL).length).toBeLessThan(cellsOf(HALL).length);

  // AND UNHELD BUILDINGS IN THE FRAME, so the treatment has something to be read against.
  expect(CITY.filter((p) => heldCellsOf(p).length === 0).length).toBeGreaterThanOrEqual(3);

  // The fire's own cell is free of every footprint, so no hearth stands inside a model.
  expect(occupiedCells([...CITY, HALL]).has(winterCellKey(FIRE_AT.col, FIRE_AT.row))).toBe(
    false,
  );
});

/**
 * The three reaches really are three different sizes of hold, so *"check it at more than one
 * reach"* is a sweep rather than three names for one picture.
 */
test("the three reaches hold 1, 5 and 13 cells before the island clips them", () => {
  const sizes = REACHES.map(
    (radius) =>
      boardFor(radius)
        .rows.flat()
        .filter((cell) => cell.warded).length,
  );
  expect(sizes).toEqual([1, 5, 13]);
});

/* -------------------------------------------------------------------------- */
/* The photographs                                                            */
/* -------------------------------------------------------------------------- */

test.runIf(SHOTS)(
  `photographs the preview and the committed fire at ${VIEW.width}x${VIEW.height}`,
  async () => {
    await page.viewport(VIEW.width, VIEW.height);

    const frames: [string, string][] = [];
    // THE PAIR THE "THEY NOW MATCH" CLAIM RESTS ON: the same cell, the same city, the same
    // camera, proposed and committed.
    const preview = await photograph("01-preview-widest-reach", null);
    frames.push(["preview", preview.shot]);
    let widestCaptions: ReadonlyMap<string, Caption> = new Map();
    for (const radius of REACHES) {
      const taken = await photograph(`0${radius + 2}-committed-reach-${radius}`, radius);
      frames.push([`reach-${radius}`, taken.shot]);
      if (radius === Math.max(...REACHES)) {
        widestCaptions = taken.captions;
      }
    }

    // The preview's widest band and the committed widest reach cover the same ground, which is
    // what makes `01` and `04` a comparison rather than two pictures.
    const widest = boardFor(2);
    const widestHeld = new Set(
      widest.rows
        .flat()
        .filter((cell) => cell.warded)
        .map((cell) => winterCellKey(cell.col, cell.row)),
    );
    expect([...preview.heldCells].sort()).toEqual([...widestHeld].sort());

    /*
     * **THE CLAIM THAT LICENSES REMOVING THE GROUND, CHECKED AT THE SHIPPED CAMERA.**
     *
     * The argument for taking the tan out from under a building is that its caption already says
     * SAFE. A caption is not guaranteed on screen — `resolveVisibleLabels` drops a label whose
     * box hits a nearer one — so this reads the live overlay of the widest-reach frame, the one
     * the tan was removed from, and writes the table beside the frames so the next reader does
     * not have to take it from a docblock.
     */
    const committedWidest = frames.find(([name]) => name === "reach-2");
    expect(committedWidest, "the widest-reach frame was never taken").toBeDefined();
    const onHeldGround = [...CITY, HALL].filter((p) =>
      footprintCells(p, footprintFor(p.nodeId)).some((key) => widestHeld.has(key)),
    );
    expect(onHeldGround.length, "no building stands on held ground").toBeGreaterThan(2);

    const lines = [...CITY, HALL].map((p) => {
      const caption = widestCaptions.get(p.nodeId);
      const held = footprintCells(p, footprintFor(p.nodeId)).filter((key) =>
        widestHeld.has(key),
      ).length;
      return (
        `${p.nodeId.padEnd(10)} footprint=${footprintFor(p.nodeId).w}x${footprintFor(p.nodeId).d}` +
        ` heldCells=${held} caption=${caption ? `"${caption.text}"` : "NONE"}` +
        ` opacity=${caption ? caption.opacity.toFixed(2) : "-"}` +
        ` at=${caption ? `${caption.left},${caption.top}` : "-"}`
      );
    });
    await keepText(`measured-captions-${VIEW.width}x${VIEW.height}`, lines.join("\n"));

    for (const p of onHeldGround) {
      const caption = widestCaptions.get(p.nodeId);
      expect(
        caption,
        `${p.nodeId} stands on ground the fire holds and has no caption element at all — the ` +
          `ground was the only channel and it has just been removed`,
      ).toBeDefined();
      expect(
        (caption as { text: string }).text,
        `${p.nodeId} stands on held ground and reads ` +
          `"${(caption as { text: string }).text}"`,
      ).toBe("SAFE");
      expect(
        (caption as { opacity: number }).opacity,
        `${p.nodeId}'s SAFE caption is on the page at zero opacity, so nobody can read it`,
      ).toBeGreaterThan(0.5);
    }

    // No two frames are the same picture. A stale canvas layer passing for a second witness is a
    // defect this exact instrument has produced before.
    for (const [a, aShot] of frames) {
      for (const [b, bShot] of frames) {
        if (a < b) {
          expect(aShot === bShot, `${a} is byte-identical to ${b}`).toBe(false);
        }
      }
    }
  },
  240000,
);
