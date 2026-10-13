import { type ReactElement, useRef, useState } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { resolveBuildingModel } from "../city/buildingAssets";
import { CURRENT_ERA_ID } from "../city/eraDressing";
import type { OrbitControlsLike } from "../city/three/applyOrbit";
import { CityCanvasHost } from "../city/three/CityCanvasHost";
import type { ScenePlacement, SceneTownHall } from "../city/three/CityScene";
import { type WinterCityBoard, WinterInCity } from "../city/three/WinterInCity";
import { resolveTownHallModel } from "../city/townHall";
import type { PlacedTransform } from "../city/worldLayout";
import { findButton, type Harness, mount, waitFor } from "../lessons/testHarness";
import { WINTER_NODE_ORDER } from "./hardWinterItems";

import "../styles.css";
import { eraCityLayout } from "../city/islandLand";

/**
 * **WHAT THE DEV SKIP COVERS WHEN THE BOARD IS THE ISLAND, AT 1024x580.**
 *
 * `winterDevSkipShots.browser.test.tsx` photographs the control over the 2D grid, which is a real
 * complete surface and the one where the frost and the damage read in text. It is not the mount the
 * lead is looking at: in-city the board is the city's own canvas, the winter's controls are a sheet
 * over it, and a fixed corner panel is competing with a DIFFERENT layout — one whose answering sheet
 * is 737x452 of a 1024x580 screen.
 *
 * So this mounts the other half, the way `winterIslandVisible.browser.test.tsx` does: the city's
 * canvas, its real camera and its real GLBs, under the same sheet, with the skip control in the
 * corner. The question is about the COMPOSITION and cannot be answered from either piece.
 *
 * ## THE MEASUREMENTS, AND WHAT THEY DELIBERATELY DO NOT CLAIM
 *
 * The claims are: it never covers the QUESTION it is offering to skip, its answer field, or the
 * commit row; it is clear of the way out of the crisis; and it is entirely clear of the crisis
 * panel, so the island's own strip is untouched in the phase where the island is what a reviewer
 * is looking at. "The panel overlaps nothing" is deliberately NOT claimed, because it was not
 * available when this file was written: the answering sheet was then 72vw by 78vh and centred,
 * and no corner of a 1024x580 screen was free of it.
 *
 * ## THE AXIS MOVED UNDER THIS FILE, AND THE MEASUREMENTS FOLLOWED IT
 *
 * #337 made the crisis a left sidebar — `--hw-side` wide, full height — where it had been a
 * bottom-anchored band. Every measurement here about "the strip the island is drawn in" was
 * therefore asked on the wrong axis afterwards, and one of them reported -173px of clearance for
 * a control sitting in 248px of open ocean. They are re-anchored horizontally rather than
 * relaxed, and their numbers are re-measured on the merged result; the axis is the only thing
 * that changed. The one deliberate loosening is the answering sheet's width floor, argued at the
 * line itself.
 *
 * The fold gives the corner back outright, which the grid file photographs.
 *
 * ## THE PICTURES ARE OFF BY DEFAULT, FOR THE REASON `winterCrisisShots` RECORDS
 *
 * Run `VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *   apps/web/src/winter/winterDevSkipOverTheIsland.browser.test.tsx` to take them.
 *
 * A full shadow-mapped scene with seven GLBs is heavy, and a heavy scene left on in this suite does
 * not fail: it starves an animation-timing assertion in a DIFFERENT file, one per run, which is
 * worse than not having the photographs in CI because the next reader cannot tell it from a real
 * regression. The measurements above run unconditionally and need no canvas, so what CI keeps is
 * the claim rather than the picture.
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's actual window. */
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
  localStorage.clear();
});

function placed(nodeId: string, col: number, row: number): PlacedTransform {
  return { nodeId, col, row, rot: 0 };
}

/** Era one's six skills plus the hall, spread across the board so the frame holds a settlement. */
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
 * The city and the crisis, wired the way `CitySurface` wires them.
 *
 * `WinterInCity` publishes one moment of the winter through `onBoard` and the canvas host takes it
 * as `winterRows` / `winterFires` / `ruinedNodeIds`. Driven rather than stubbed, because a board
 * that never reached the canvas would leave a fair-weather island under a crisis panel.
 */
/**
 * The board the island was last handed, kept at module scope so a test can declare a REINFORCE.
 *
 * A pull-back needed no target, so every helper here used to be two clicks. The lead ruled it out
 * on 2026-08-02 and the shortest declaration left is a shield, which is aimed through the island's
 * own `onPickBuilding` seam — the path a player uses in the city, and the only one there is: there
 * is no 2D grid on this mount.
 */
let latestBoard: WinterCityBoard | null = null;

function CityUnderWinter(): ReactElement {
  const [board, setBoard] = useState<WinterCityBoard | null>(null);
  const controlsRef = useRef<OrbitControlsLike | null>(null);
  return (
    <div className="city-shell">
      <div className="city-surface" data-winter={board !== null ? "true" : "false"}>
        <div className="city-viewport" data-testid="city-viewport">
          <CityCanvasHost
            enableCanvas={SHOTS}
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
          latestBoard = next;
          setBoard(next);
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

const sheet = (): HTMLElement => query<HTMLElement>(".winter-in-city .hw-shell");
const skip = (): HTMLElement => query<HTMLElement>(".hw-skip");

/** Do two boxes share any pixel? */
function overlaps(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function describe(name: string, box: DOMRect): string {
  return `${name} ${Math.round(box.left)},${Math.round(box.top)} to ${Math.round(box.right)},${Math.round(box.bottom)}`;
}

async function openCrisis(): Promise<void> {
  await page.viewport(HIS_WINDOW.width, HIS_WINDOW.height);
  h = mount(<CityUnderWinter />);
  await waitFor(
    () => document.querySelector(".winter-in-city .hw-shell") !== null,
    "the crisis sheet never rendered",
    30000,
  );
  await waitFor(
    () => document.querySelector(".hw-skip") !== null,
    "the skip never rendered",
  );
  await document.fonts.ready;
}

/** Declare a shield on the first building the city has, through the island. */
async function declareAShield(): Promise<void> {
  findButton(sheet(), /Reinforce a building/).click();
  await waitFor(() => latestBoard !== null, "the island was never handed a board");
  const target = CITY[0]?.nodeId;
  if (target === undefined) {
    throw new Error("the fixture city has no building to reinforce");
  }
  latestBoard?.onPickBuilding(target);
}

/** Declare a shield and commit, which reaches the answering sheet. */
async function reachAnswering(): Promise<void> {
  await declareAShield();
  await waitFor(() => !findButton(sheet(), /Commit and face/).disabled, "commit arms");
  findButton(sheet(), /Commit and face/).click();
  await waitFor(
    () => document.querySelector(".winter-in-city .hw-question") !== null,
    "the question never rendered",
  );
}

/* ------------------------------------------------------------------ the measurements, always on */

test("the skip never covers the question it is offering to skip, at 1024x580", {
  timeout: 30_000,
}, async () => {
  await openCrisis();

  /*
   * THE DECLARING PANEL FIRST, which is the phase where the island is the thing being looked at.
   * The panel is a left sidebar, `--hw-side` = `min(620px, 50vw)` wide and the full height of the
   * screen, so a corner panel on the RIGHT should be clear of it entirely — and if that ever stops
   * being true, the panel has started eating the crisis's own controls rather than a corner of sky.
   */
  const band = sheet().getBoundingClientRect();
  expect(
    overlaps(skip().getBoundingClientRect(), band),
    `${describe("the skip", skip().getBoundingClientRect())} overlaps ${describe("the declaring panel", band)}`,
  ).toBe(false);

  /*
   * AND WITH CLEARANCE, reported as a number so a regression reads as a shrinking margin rather
   * than as a boolean that flipped.
   *
   * THE AXIS IS THE SIDEBAR'S, NOT THIS PANEL'S. This measured vertically while the crisis was a
   * bottom-anchored band: the panel cleared it by -18px as a 2x2 rung grid, and four rungs across
   * brought that to 89px. #337 moved the crisis down the left-hand side at full height, so the
   * vertical form of the question stopped meaning anything — the sidebar's top edge is now 14px
   * from the top of the screen, above this panel's bottom edge, and a correctly placed control
   * reads as -173px of "headroom" while sitting in open ocean 248px to its right. The claim did
   * not change; the axis it is asked on did, which is the same move #337 made to the conclusion
   * card's own spatial assertion. Measured on the merged result at 1024x580: the sidebar ends at
   * x=526 and this panel starts at x=774.
   *
   * The floor is deliberately generous: a 20px margin would be met by a panel one wrapped line
   * away from failing.
   */
  const clearance = skip().getBoundingClientRect().left - band.right;
  expect(
    clearance,
    `the skip clears the declaring panel by only ${Math.round(clearance)}px`,
  ).toBeGreaterThan(40);

  // And clear of the way out of the crisis, which is the one control a half-covered version of
  // would be worse than an untidy screen.
  const exit = query<HTMLElement>(".winter-in-city__exit").getBoundingClientRect();
  expect(
    overlaps(skip().getBoundingClientRect(), exit),
    `${describe("the skip", skip().getBoundingClientRect())} overlaps ${describe("the exit", exit)}`,
  ).toBe(false);

  /*
   * WHAT IT COSTS THE ISLAND'S OWN STRIP, stated as a share rather than as "it covers nothing".
   *
   * The strip is what the sidebar leaves: from its right edge to the right edge of the screen, at
   * the full height, and it is where `winterFraming` now slides the settlement so a reviewer can
   * see it while choosing. The panel is in the corner of that strip, so it costs something, and
   * the number is the honest form of that. Measured on the merged result at 1024x580: the strip is
   * 498 by 580, the panel covers 15% of it, and its left edge clears the sidebar by 248px.
   *
   * Note the strip is the thing that moved, not the fraction: this file recorded 1024 by 276 and
   * the same 15% while the crisis was a bottom band. Dividing by the OLD strip on the new layout
   * divides by a height of 14px and reports 297% over a 1024x14 strip — measured, by putting the
   * old expression back — which is the shape of a stale spatial guard rather than a real
   * regression.
   */
  const box = skip().getBoundingClientRect();
  const strip = { width: HIS_WINDOW.width - band.right, height: HIS_WINDOW.height };
  const cost = (box.width * box.height) / (strip.width * strip.height);
  expect(
    cost,
    `the skip covers ${Math.round(cost * 100)}% of the ${Math.round(strip.width)}x${Math.round(strip.height)} strip the island is drawn in`,
  ).toBeLessThan(0.2);

  /*
   * AND THE MIDDLE OF THAT STRIP IS UNCOVERED, hit-tested rather than inferred from the boxes: the
   * settlement is framed into the middle of the strip the sidebar leaves, so that point is where
   * it is, and two non-overlapping rectangles plus a pointer that still lands on the panel are
   * different claims.
   */
  const at = document.elementFromPoint(
    (band.right + HIS_WINDOW.width) / 2,
    HIS_WINDOW.height / 2,
  );
  expect(
    at !== null && !skip().contains(at),
    "the skip is under the pointer at the middle of the island's strip",
  ).toBe(true);

  /*
   * THE ANSWERING SHEET, which since #337 takes the sidebar's own column: at 1024x580 that is
   * 512x423, so the question, its answer row and the declared line all sit left of x=487 and this
   * panel is clear of every one of them. It was 737x452 and centred while the crisis was a band,
   * which left no corner free at all, so the claim below is written as "WHAT it overlaps" rather
   * than "whether it overlaps anything" — that is the weaker form and it is kept deliberately, so
   * that a future layout which reclaims the middle of the screen is still covered by it.
   */
  await reachAnswering();
  const answeringBox = skip().getBoundingClientRect();
  for (const [what, selector] of [
    ["the question", ".winter-in-city .hw-question"],
    ["the answer row", ".winter-in-city .lesson-player__row"],
    ["the declared line", ".winter-in-city .hw-declared"],
  ] as const) {
    const other = query<HTMLElement>(selector).getBoundingClientRect();
    expect(
      overlaps(answeringBox, other),
      `${describe("the skip", answeringBox)} overlaps ${describe(what, other)}`,
    ).toBe(false);
  }
  /*
   * The sheet really is the shape this claim is about, so a layout change that made it small
   * enough to dodge cannot pass this quietly.
   *
   * THE WIDTH FLOOR IS 0.4 AND WAS 0.6, and that is a loosening rather than a re-anchoring, so it
   * is argued rather than asserted. The sidebar is `min(620px, 50vw)`, which is exactly half the
   * width at 1024 and can never be more, so 0.6 is a floor the shipped layout cannot clear on the
   * lead's own screen — it fails at 50%, on a sheet that is the full declared width of the panel.
   * What the floor is FOR is a sheet shrunk until it no longer reaches the corner this panel is
   * pinned to, and 0.4 still catches that: at 1024 it wants 410px against the panel's own left
   * edge at x=774, so a sheet narrow enough to stop competing fails here first. Measured red, not
   * argued: forcing `--hw-side` to `min(300px, 29vw)` fails this line at 29%.
   *
   * The height floor is untouched at 0.6; the sidebar is the full height and measures 0.73 here.
   */
  const answering = sheet().getBoundingClientRect();
  expect(
    answering.width / HIS_WINDOW.width,
    `the answering sheet is only ${Math.round((answering.width / HIS_WINDOW.width) * 100)}% of the width, so this test is not about the sheet the lead sees`,
  ).toBeGreaterThan(0.4);
  expect(answering.height / HIS_WINDOW.height).toBeGreaterThan(0.6);
});

/* --------------------------------------------------------------------- the pictures, opt-in */

/**
 * WHERE THIS TEST'S VIEWPORT SITS INSIDE THE BROWSER WINDOW — see
 * `winterIslandVisible.browser.test.tsx`, whose defect and fix this is.
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

async function shoot(name: string): Promise<void> {
  const box = testViewportBox();
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: { ...box, scale: 1 },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (SHOTS) {
    await commands.writeFile(
      `apps/web/src/winter/__screenshots__/dev-skip/${name}.png`,
      shot.data,
      { encoding: "base64" },
    );
  }
}

test.runIf(SHOTS)("photographs the skip over the real island at 1024x580", async () => {
  await openCrisis();
  await waitFor(
    () => document.querySelector(".city-viewport canvas") !== null,
    "the city canvas never mounted",
    30000,
  );
  // The GLBs resolve behind their own Suspense boundaries and the frost course rebuilds when the
  // board arrives, so a first frame is a bare island.
  await new Promise<void>((resolve) => setTimeout(resolve, 2500));
  // A throwaway capture: the first clipped capture after a mount puts a device-metrics override on
  // the page, which R3F reads as a resize, so the frame it returns was drawn before that settled.
  await shoot("10-throwaway");
  await new Promise<void>((resolve) => setTimeout(resolve, 700));

  await shoot("10-in-city-declaring-with-the-skip-1024x580");

  await reachAnswering();
  await new Promise<void>((resolve) => setTimeout(resolve, 700));
  await shoot("11-in-city-answering-with-the-ladder-live-1024x580");

  // Three rounds at the weak rung, so the island carries frost and damage rather than a first move.
  for (let round = 1; round <= 3; round += 1) {
    if (round > 1) {
      await declareAShield();
      await waitFor(() => !findButton(sheet(), /Commit and face/).disabled, "commit arms");
      findButton(sheet(), /Commit and face/).click();
      await waitFor(
        () => document.querySelector('[data-testid="hw-dev-skip-resolve-weak"]') !== null,
        "the ladder comes back",
      );
    }
    query<HTMLButtonElement>('[data-testid="hw-dev-skip-resolve-weak"]').click();
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-magnitude") !== null,
      `round ${round} resolves`,
    );
    findButton(sheet(), /Let the frost advance/).click();
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-actions") !== null,
      `round ${round + 1} opens`,
    );
  }
  expect(document.querySelectorAll(".hw-log li")).toHaveLength(3);
  await new Promise<void>((resolve) => setTimeout(resolve, 1200));
  await shoot("12-in-city-frost-advanced-and-damage-standing-1024x580");
});
