import { expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import {
  createDevSessionStore,
  type DevSessionStorage,
  withDevPersistence,
} from "../devPersistence/devSession";
import { findButton, type Harness, mount, waitFor } from "../lessons/testHarness";
import { CitySurface } from "./CitySurface";
import { createCityDevSession, D1_NODE_IDS } from "./citySession";

import "../styles.css";

/**
 * **THE SAME CITY, BEFORE THE CARRY-BACK AND AFTER, AT THE SAME CAMERA.**
 *
 * The lead, twice: *"also carry this damage back to my city still doesnt work; buildings arent
 * affected and still look the same"*. That is a claim about a RENDERED FRAME, and no passing
 * test discharges it — `carryBackReachesTheIsland.test.tsx` proves the button reaches the
 * city's own state and says nothing whatever about whether the buildings change.
 *
 * So this plays a real winter over the real `CitySurface`, presses the real button, and
 * photographs the island on both sides of it. Whole-viewport frames at **1024x580**, the lead's
 * own window, under `reducedMotion`.
 *
 * ## Nothing about the composition is rebuilt here
 *
 * Every other browser test of the crisis hand-composes `CityCanvasHost` + `WinterInCity`,
 * which is right when the subject is the canvas and wrong here: the defect lived in
 * `CitySurface`'s own wiring between the two, so a harness that wired them itself would be
 * photographing a composition the product does not have. This mounts `CitySurface`.
 *
 * ## Which means the declaration is aimed at the CANVAS, because in-city there is nowhere else
 *
 * On the island mount there is no 2D grid; a fire is aimed by clicking the ground, and
 * `CitySurface` deliberately routes a building click to the crisis rather than to the roster.
 * So the fire is declared with a real pointer event on the canvas, resolved by R3F's own
 * raycast — the precedent is `three/unmappedBuildingRenders.browser.test.tsx`, which drives
 * `PlacedBuilding`'s click the same way. One declaration is enough: the dev skip's run-out
 * repeats it for every remaining round.
 *
 * ## The camera is the same in both frames, and that is a property rather than a hope
 *
 * A crisis re-frames the island by moving the PROJECTION and never the controls —
 * `CityScene`'s `cityFrameFor` says so in terms: *"a crisis opening or closing moves no
 * control"* — and both frames here are taken with no crisis on screen, so the offset is
 * cleared in both. Nothing in this file zooms, orbits or pans.
 *
 * ## Off by default, for the reason `winterZeroAccuracy.browser.test.tsx` records
 *
 * A full shadow-mapped scene with seven GLBs is heavy, and a heavy scene left switched on in
 * this suite starves an animation-timing assertion in a DIFFERENT file rather than failing
 * here. The always-on claims about this fix are the jsdom ones. Run:
 *
 *   VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/city/carryBackFrames.browser.test.tsx
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/** The lead's own window, named in every filename. */
const VIEW = { width: 1024, height: 580 } as const;

const FRAMES = "docs/design-refs/winter-carry-back";

/**
 * A cell for each skill, ringed round the hub's reserved block.
 *
 * The same six `carryBackReachesTheIsland.test.tsx` uses, and they are shared rather than
 * spread further for a measured reason: a placement the session REFUSES is a silent no-op, and
 * the first cut of this file lost two of the six that way — the frame was then a settlement of
 * four, which is a weaker picture and a fixture nobody had noticed shrinking. The count is
 * asserted below rather than trusted.
 */
const CELL_FOR: Readonly<Record<string, { col: number; row: number }>> = {
  "NUM.S": { col: 2, row: 2 },
  "NUM.F": { col: 0, row: 3 },
  "NUM.2": { col: -3, row: 2 },
  "NUM.3": { col: 3, row: -2 },
  "NUM.4": { col: -3, row: -2 },
  "NUM.5": { col: 0, row: -3 },
};

let h: Harness | null = null;

function memStorage(): DevSessionStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

function settle(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Era one placed and mastered, over a store of this test's own. */
async function aCityWorthLosing() {
  const store = createDevSessionStore({
    storage: memStorage(),
    enabled: true,
    debounceMs: 0,
  });
  const session = withDevPersistence(createCityDevSession(), store);
  for (const nodeId of D1_NODE_IDS) {
    const cell = CELL_FOR[nodeId];
    if (!cell) {
      throw new Error(`no test cell for ${nodeId}`);
    }
    await session.placeSkill(nodeId, { ...cell, rot: 0 });
    await session.advanceMasteryDev(nodeId, 3);
  }
  store.flush();
  // A refused placement is a silent no-op, so the settlement in the frame is counted rather
  // than assumed: without this the pictures can quietly become a picture of a smaller city.
  const placed = (await session.load()).placements ?? [];
  expect(placed.map((p) => p.nodeId).sort()).toEqual([...D1_NODE_IDS].sort());
  return session;
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
 * `page.screenshot` is Playwright's locator capture and never gets past *"waiting for element
 * to be stable"* over a canvas running `frameloop="always"`.
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
    await commands.writeFile(`${FRAMES}/${name}.png`, shot, { encoding: "base64" });
  }
}

type Sample = { data: Uint8ClampedArray; width: number; height: number };

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
  };
}

/**
 * Differing pixels between two captures, at `eraAdvanceOnTheIsland`'s tolerance of 12 per
 * channel so shadow dither along an edge that did not move is not counted as a change.
 */
function differs(
  a: Sample,
  b: Sample,
  within?: { x: number; y: number; width: number; height: number },
): number {
  const box = within ?? { x: 0, y: 0, width: VIEW.width, height: VIEW.height };
  const scale = a.width / VIEW.width;
  let differing = 0;
  for (
    let y = Math.round(box.y * scale);
    y < Math.round((box.y + box.height) * scale);
    y++
  ) {
    for (
      let x = Math.round(box.x * scale);
      x < Math.round((box.x + box.width) * scale);
      x++
    ) {
      const at = (y * a.width + x) * 4;
      const dr = Math.abs((a.data[at] ?? 0) - (b.data[at] ?? 0));
      const dg = Math.abs((a.data[at + 1] ?? 0) - (b.data[at + 1] ?? 0));
      const db = Math.abs((a.data[at + 2] ?? 0) - (b.data[at + 2] ?? 0));
      if (dr > 12 || dg > 12 || db > 12) {
        differing += 1;
      }
    }
  }
  return differing;
}

/**
 * A rectangle holding NOTHING BUT THE SETTLEMENT, so the change can be attributed.
 *
 * The whole-frame diff is the honest headline and it is not attributable on its own: the
 * repair panel arrives on the right at the same beat, the roster's counters move, and the sky
 * has clouds in it. This band is the middle of the island where the buildings stand — right of
 * the city-life column (which ends near x=240), left of the repair panel (which begins near
 * x=690), below the top chip lane (y<60) and above the Buildings disclosure (y>500). What
 * changes inside it is buildings becoming ruins and nothing else.
 */
const SETTLEMENT_BAND = { x: 330, y: 80, width: 320, height: 290 } as const;

/** Width and height out of a PNG's IHDR, so a scaled capture cannot pass for the viewport. */
function pngSize(base64: string): { width: number; height: number } {
  const binary = atob(base64);
  const at = (i: number): number => binary.charCodeAt(i) & 0xff;
  const read = (offset: number): number =>
    (at(offset) << 24) | (at(offset + 1) << 16) | (at(offset + 2) << 8) | at(offset + 3);
  expect(binary.slice(1, 4), "not a PNG").toBe("PNG");
  return { width: read(16) >>> 0, height: read(20) >>> 0 };
}

/** One synthetic click on the island's canvas, the way R3F resolves a real pointer. */
function clickTheCanvasAt(clientX: number, clientY: number): void {
  const canvas = query<HTMLCanvasElement>(".city-viewport canvas");
  for (const type of ["pointermove", "pointerdown", "pointerup", "click"] as const) {
    canvas.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
        buttons: type === "pointerdown" ? 1 : 0,
      }),
    );
  }
}

/**
 * Aim a fire at the island by clicking its ground, and report where the click landed.
 *
 * **A SEARCH RATHER THAN A PINNED PIXEL**, because the point that has to be hit is a fact
 * about three things this file does not own: the crisis sheet takes the left of the window,
 * the dev skip takes the top right corner, and the ground plane only reports a cell the winter
 * will accept where that cell is LAND — the lagoon and the sea are dropped by
 * `WinterBoardBridge` rather than declared. A single coordinate would be a guess at the
 * intersection of all three, and the first re-layout of any of them would turn this file into
 * a timeout with no idea why.
 *
 * So it walks the strip the sheet leaves, skips any point another element is sitting over
 * (checked with `elementFromPoint`, which is the same hit test a real pointer gets), and stops
 * at the first one the winter accepts as a declaration.
 */
async function aimAFireAtTheIsland(): Promise<{ x: number; y: number }> {
  const viewport = query<HTMLElement>(".city-viewport");
  const sheet = document.querySelector<HTMLElement>(".winter-in-city .hw-shell");
  const left = (sheet?.getBoundingClientRect().right ?? 0) + 24;
  const right = window.innerWidth - 24;
  const tried: string[] = [];

  for (const fy of [0.55, 0.45, 0.65, 0.38, 0.72]) {
    for (const fx of [0.5, 0.38, 0.62, 0.26, 0.74]) {
      const x = Math.round(left + (right - left) * fx);
      const y = Math.round(window.innerHeight * fy);
      const over = document.elementFromPoint(x, y);
      if (over === null || !viewport.contains(over)) {
        continue;
      }
      tried.push(`${x},${y}`);
      clickTheCanvasAt(x, y);
      // One frame is enough: the pick is synchronous through R3F's raycast into a React
      // state update, and a cell the winter refused leaves the commit control where it was.
      await settle(120);
      if (!findButton(panel(), /Commit and face/).disabled) {
        return { x, y };
      }
    }
  }
  throw new Error(
    `no point on the island took a fire; tried ${tried.length}: ${tried.join(" | ")}`,
  );
}

/** ☰ Menu → Hard Winter → the advisor's slides → "Face the winter". */
async function openTheWinter(): Promise<void> {
  findButton(document.body, /^Menu$/).click();
  await waitFor(
    () => document.querySelector('[aria-label="Other places"]') !== null,
    "the menu never opened",
    20000,
  );
  findButton(query<HTMLElement>('[aria-label="Other places"]'), /Hard Winter/).click();
  await waitFor(
    () => document.querySelector('[data-testid="crisis-call-face"]') !== null,
    "the crisis briefing never opened",
    20000,
  );
  const slides = Number(
    /of (\d+)/.exec(
      query<HTMLElement>('[data-testid="crisis-call-slide"]').textContent ?? "",
    )?.[1] ?? "0",
  );
  expect(slides, "the walkthrough does not say how many steps it has").toBeGreaterThan(1);
  for (let step = 1; step < slides; step += 1) {
    query<HTMLButtonElement>('[data-testid="crisis-call-next"]').click();
    await settle(60);
  }
  const face = query<HTMLButtonElement>('[data-testid="crisis-call-face"]');
  expect(face.disabled, "the briefing gate did not open on the last slide").toBe(false);
  face.click();
  await waitFor(
    () => document.querySelector(".winter-in-city .hw-shell") !== null,
    "the crisis panel never rendered over the island",
    30000,
  );
}

const panel = (): HTMLElement => query<HTMLElement>(".winter-in-city .hw-shell");

/**
 * Declare one fire on the island and run the winter out at the bottom rung.
 *
 * The bottom rung, `none`, is a fire that is really lit and catches nothing, so the frost takes
 * the settlement — which is the point: the frame after the press has to have buildings missing
 * from it, and at `HARD_WINTER.damage.ruin_at: 1` a building the frost reaches is a ruin.
 */
async function loseTheWinter(): Promise<{ x: number; y: number }> {
  findButton(panel(), /Light a fire/).click();
  await waitFor(
    () => document.querySelector(".winter-in-city .hw-prompt-line") !== null,
    "the panel never asked for a cell",
    10000,
  );
  const aimed = await aimAFireAtTheIsland();
  findButton(panel(), /Commit and face/).click();
  await waitFor(() => panel().dataset.phase === "answering", "the batch opens");

  query<HTMLButtonElement>('[data-testid="hw-dev-skip-runout-none"]').click();
  await waitFor(
    () => document.querySelector(".hw-conclusion") !== null,
    "the winter never reached its concluding card",
    30000,
  );
  await document.fonts.ready;
  return aimed;
}

test.runIf(SHOTS)(
  `photographs the city before and after the carry-back at ${VIEW.width}x${VIEW.height}`,
  async () => {
    await page.viewport(VIEW.width, VIEW.height);
    const session = await aCityWorthLosing();
    h = mount(
      <CitySurface
        enableCanvas
        reducedMotion
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        // As `App.tsx` wires it. Without this the crisis falls back to writing the saved
        // blob, which is the defect these two frames exist to disprove: with the fallback
        // in force the two captures below are the same picture.
        onCarryCrisisDamage={session.recordCrisisDamage}
        onOpenSurface={() => undefined}
      />,
    );

    await waitFor(
      () => document.querySelector(".city-viewport canvas") !== null,
      "the city canvas never mounted",
      40000,
    );
    await document.fonts.ready;
    // The GLBs resolve behind their own Suspense boundaries, so a first frame is a bare island.
    await settle(3500);
    /*
     * A THROWAWAY CAPTURE, and it is load-bearing. `Page.captureScreenshot` with a `clip` puts
     * a device-metrics override on the page, which R3F reads as a resize, so the first clipped
     * capture after a mount comes back as the frame drawn before any of that settled.
     */
    await capture();
    await settle(800);

    // 1. THE CITY AS THE PLAYER LEFT IT. Six buildings standing, no crisis on screen.
    const before = await capture();
    await keep(`${VIEW.width}x${VIEW.height}-1-before-the-carry-back`, before);

    await openTheWinter();
    await loseTheWinter();

    // The card offers the press only over a live board with damage to carry, so finding it is
    // itself the floor: a winter that ruined nothing has no button here.
    const card = query<HTMLElement>(".hw-conclusion");
    const ruins = Array.from(
      card.querySelectorAll<HTMLElement>(".hw-roll-tiles li"),
    ).filter((tile) => tile.dataset.state === "ruin");
    expect(
      ruins.length,
      "this winter took no building, so there is nothing to carry",
    ).toBeGreaterThan(0);

    findButton(card, /Carry this damage back to my city/).click();

    // THE WINTER LEAVES, which is the other half of the button's promise and what puts the
    // ordinary island back under the camera the first frame was taken at.
    await waitFor(
      () => document.querySelector(".winter-in-city") === null,
      "the carry-back never returned the player to their city",
      30000,
    );
    /*
     * The ruin templates swap in through the same cross-fade a build stage uses, the crisis
     * sheet unmounts with its own transition, the island reverts its winter dressing and the
     * repair panel animates in. Measured: at 3500ms the frame still caught the sheet part-way
     * out, so this is deliberately long — the subject is the city AFTER the press, not the
     * moment after it.
     */
    await settle(6000);
    await capture();
    await settle(1500);

    // 2. THE SAME CITY, AFTER. Same mount, same camera, same projection: the crisis moved the
    //    projection and it is cleared again, and nothing here zooms, orbits or pans.
    const after = await capture();
    await keep(`${VIEW.width}x${VIEW.height}-2-after-the-carry-back`, after);

    /*
     * **THE FRAMES ARE OF THE WINDOW THEY CLAIM TO BE.** A scaled capture would make every
     * measurement below a measurement of a different screen.
     */
    for (const [name, shot] of [
      ["before", before],
      ["after", after],
    ] as const) {
      const size = pngSize(shot);
      expect(size.width, `${name} came back ${size.width}px wide`).toBe(VIEW.width);
      expect(size.height, `${name} came back ${size.height}px tall`).toBe(VIEW.height);
    }

    /*
     * **AND THEY ARE NOT THE SAME PICTURE.** This is the lead's sentence, inverted: with the
     * carry-back writing the saved blob instead of the session, these two captures are the
     * same island and the diff is the shadow dither of a scene nobody touched.
     *
     * The floor is a real share of the frame rather than "greater than zero", because a
     * byte-difference is what a stale canvas layer produces. Six buildings replaced by ruins
     * is tens of thousands of pixels; 1% of 1024x580 is 5939, which no amount of dither
     * reaches under `reducedMotion` (`cityTellsWhatItKnows.browser.test.tsx` measured an
     * unchanged island band at exactly zero).
     */
    const beforeSample = await decode(before);
    const afterSample = await decode(after);
    const changed = differs(beforeSample, afterSample);
    const share = changed / (VIEW.width * VIEW.height);
    expect(
      share,
      `only ${changed} pixels (${(share * 100).toFixed(2)}%) differ across the carry-back, ` +
        "which is an island that did not redraw",
    ).toBeGreaterThan(0.01);

    /*
     * **AND THE CHANGE IS THE BUILDINGS**, measured over a band that holds nothing else. A
     * whole-frame number cannot tell "the buildings became ruins" from "a panel appeared on
     * the right", and the panel appearing is exactly what a carry-back that reached the data
     * layer and not the renderer would produce — which is the half of this the lead would
     * still call broken.
     */
    const settlement = differs(beforeSample, afterSample, SETTLEMENT_BAND);
    const bandPixels = SETTLEMENT_BAND.width * SETTLEMENT_BAND.height;
    expect(
      settlement / bandPixels,
      `only ${settlement} of the settlement band's ${bandPixels} pixels changed, so the ` +
        "buildings look the same and only the chrome moved",
    ).toBeGreaterThan(0.1);

    // ...and the city says the same thing in its accessible surface, so the diff above is
    // attributable to the ruins rather than to something else having moved.
    findButton(document.body, /^Buildings/).click();
    await waitFor(
      () => document.querySelectorAll('button.city-plot[data-ruined="true"]').length > 0,
      "the roster reports no ruin, so the frame's difference is not the carry-back's",
      20000,
    );
    const ruined = Array.from(
      document.querySelectorAll<HTMLElement>('button.city-plot[data-ruined="true"]'),
    ).map((row) => row.dataset.nodeId ?? "");

    if (SHOTS) {
      await commands.writeFile(
        `${FRAMES}/measured-${VIEW.width}x${VIEW.height}.txt`,
        [
          `viewport: ${VIEW.width}x${VIEW.height}, reducedMotion, one mount, camera untouched`,
          `the winter took: ${ruins.length} of ${card.querySelectorAll(".hw-roll-tiles li").length} buildings`,
          `after the carry-back the city draws as ruins: ${ruined.join(", ")}`,
          `frames differ by ${changed} px of ${VIEW.width * VIEW.height} (${(share * 100).toFixed(2)}%)`,
          `of which ${settlement} of ${bandPixels} fall in the settlement-only band ` +
            `${SETTLEMENT_BAND.x},${SETTLEMENT_BAND.y} ${SETTLEMENT_BAND.width}x${SETTLEMENT_BAND.height} ` +
            `(${((settlement / bandPixels) * 100).toFixed(1)}% of it)`,
          "",
          "1-before-the-carry-back.png: the island as the player left it",
          "2-after-the-carry-back.png: the same island, same camera, after the press",
        ].join("\n"),
        { encoding: "utf-8" },
      );
    }

    h?.cleanup();
    h = null;
  },
  300000,
);
