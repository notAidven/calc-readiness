import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import {
  createDevSessionStore,
  type DevSessionStorage,
  withDevPersistence,
} from "../devPersistence/devSession";
import { findButton, type Harness, mount, waitFor } from "../lessons/testHarness";
import { CitySurface } from "./CitySurface";
import { createCityDevSession, D1_NODE_IDS } from "./citySession";
import { framedTestBudget } from "./shotBudget";
import { preloadHardWinterSurface } from "./three/WinterInCity";

import "../styles.css";

/**
 * **THE ONE CONTROL THAT MAY OPEN A LESSON AND MUST STAY LIVE THROUGH A CRISIS.**
 *
 * `crisisShutsTheLessonDoors.test.tsx` shuts every city door into a lesson while a winter is
 * running, and names the island's own building click as an exception. This file is that
 * exception's pair of assertions, and it is here rather than beside the others because the
 * click only exists on a live canvas: R3F resolves a pointer event by RAYCASTING into the
 * scene, so in jsdom — where `CityCanvasHost` falls back and draws no geometry — there is
 * nothing for a click to hit and the handler under test can never run.
 *
 * ## Why the exception needs a guard MORE after the fix than before it
 *
 * The island is the crisis's board: a click on a building is how "Reinforce" is aimed. So it
 * must stay live, and it must NOT do what it does off a crisis.
 *
 * Before the gate, a redirect that went missing was LOUD — the click fell through to the city
 * and a lesson popup appeared over the winter, which is the report this work came from. With
 * `openLessonPopup` now refusing outright, the same missing redirect is SILENT: the click
 * lands on the building, reaches a gate that returns, and nothing happens at all. A player
 * would find that Reinforce simply cannot be aimed, with nothing on screen saying why. That is
 * the failure this file exists to catch, and it is one the fix made room for.
 *
 * ## Both directions, as an exception owes
 *
 *  - **still live**: the click reaches the crisis, which is what the exemption is FOR. An
 *    island that went inert during a winter fails here, so the entry cannot sit in the list
 *    excusing nothing;
 *  - **still redirected**: the click opens no lesson popup. An island that went back to being
 *    an ordinary city click fails here, so the list cannot go on excusing something it has
 *    stopped describing. Checked after EVERY press of the search below rather than once at the
 *    end, so a regression reports as itself instead of as the search running out of points.
 *
 * ## And the refusal holds against a real mouse, at a named viewport
 *
 * This mount is also the only place the CSS half of the story can be settled, and settling it
 * changed what this change is about. `winter-in-city.css` puts `pointer-events: none` on `.hud`
 * for the duration of a winter and reads as though that made the city's controls inert. It does
 * not: `styles.css` has `.hud > * { pointer-events: auto }` one level down, so every control
 * inside is `auto` and the crisis rule only ever silenced a container that was already
 * transparent. The measurement is beside the assertion below. So a real mouse press really did
 * reach the roster row in the shipped browser, and this file presses one at **1024x580** rather
 * than reading a computed value that would only describe a stylesheet.
 */

/** The lead's own window, and the viewport every measurement below is taken at. */
const VIEW = { width: 1024, height: 580 } as const;

const CELL_FOR: Readonly<Record<string, { col: number; row: number }>> = {
  "NUM.S": { col: 2, row: 2 },
  "NUM.F": { col: 0, row: 3 },
  "NUM.2": { col: -3, row: 2 },
  "NUM.3": { col: 3, row: -2 },
  "NUM.4": { col: -3, row: -2 },
  "NUM.5": { col: 0, row: -3 },
};

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

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
async function aCity() {
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
  // A refused placement is a silent no-op, so the settlement the search has to hit is counted
  // rather than assumed: without this the island could quietly become a smaller city, and the
  // search below would be hunting for buildings that are not there.
  const placed = (await session.load()).placements ?? [];
  expect(placed.map((p) => p.nodeId).sort()).toEqual([...D1_NODE_IDS].sort());
  return session;
}

/** ☰ Menu → Hard Winter → the advisor's slides → "Face the winter". The player's own route. */
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
  try {
    await waitFor(
      () => document.querySelector(".winter-in-city .hw-shell") !== null,
      "the crisis panel never rendered over the island",
      30000,
    );
  } catch (error) {
    const winter = document.querySelector<HTMLElement>('[data-testid="winter-in-city"]');
    const advisor = document.querySelector<HTMLElement>(
      '[data-testid="crisis-call-advisor"]',
    );
    const currentFace = document.querySelector<HTMLButtonElement>(
      '[data-testid="crisis-call-face"]',
    );
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}; ` +
        `winter wrapper=${winter !== null}, ` +
        `winter fallback=${winter?.textContent?.includes("Bringing the winter in") ?? false}, ` +
        `advisor=${advisor !== null}, ` +
        `face=${currentFace !== null}, ` +
        `face disabled=${currentFace?.disabled ?? "absent"}`,
      { cause: error },
    );
  }
}

const panel = (): HTMLElement => query<HTMLElement>(".winter-in-city .hw-shell");

/** One pointer sequence on the island's canvas, the way R3F resolves a real pointer. */
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
 * **THE OUTER BUDGET HAS TO CONTAIN THE INNER WAITS, and at `framedTestBudget(3)` it did not.**
 *
 * `shotBudget.ts` states the rule this number obeys and the history behind it: an outer budget
 * smaller than its own contents means a slow canvas can never produce its own diagnostic, and
 * every failure arrives as an anonymous "Test timed out in Nms". This test is not three frames
 * of screenshot — it is one mount, then the whole player route into a winter, then a search of
 * up to 121 points on the canvas — and the waits below, each with a message naming what
 * stalled, are budgeted at 40s (canvas) + 20s (menu) + 20s (briefing) + 30s (crisis panel) +
 * 30s (winter board) + 20s (roster) = **160s**, plus ~15s of settles and the search. Declared
 * at 90s, the outer clock always won, so not one of those six messages was reachable.
 *
 * MEASURED, NOT SUSPECTED. Run 30874434982 failed here as
 * `Error: Test timed out in 90000ms` pointing at this line and naming no stall at all, which
 * is the symptom exactly. The same test off the runner takes **15.6s**, so the pass has ample
 * room; what it lacked was room to FAIL legibly on a two-core runner under software
 * rasterisation.
 *
 * Six frames rather than three, i.e. 180s, is the first multiple of this file's own unit that
 * exceeds the 175s its contents can ask for.
 *
 * NOTHING ABOUT THE ASSERTIONS MOVES — a budget is a resource bound — and that it still
 * reddens is injected rather than argued. With `crisisHasTheIsland` forced to `false` in
 * `CitySurface`, reinstating the defect this whole change is about, this file fails, and it
 * fails NAMING WHAT STALLED: *"waitFor timed out: the winter published no board, so the island
 * is not the crisis's"*. That message is the whole point of the number. At 90s the same
 * injection could only ever have produced the anonymous line quoted above, because the outer
 * clock reached its end before the first inner wait reached its own.
 *
 * The narrower injection — the gate left in place everywhere but at `openLessonPopup` — is
 * deliberately NOT this file's to catch, and running it proves the division of labour rather
 * than a hole: the roster row stays `disabled`, so a dispatched press never reaches the
 * handler and this file passes. `crisisShutsTheLessonDoors.test.tsx`'s census is what fails
 * there, by name, on *"openLessonPopup opens the anchored lesson popup without asking whether
 * a crisis has the island"*.
 */
test(`the island stays the crisis's board at ${VIEW.width}x${VIEW.height}`, {
  timeout: framedTestBudget(6),
}, async () => {
  // This guard starts at the live-canvas hand-off, not at the runner's first winter-chunk
  // transform. The shared loader guarantees this is the same promise React.lazy consumes.
  await preloadHardWinterSurface();
  await page.viewport(VIEW.width, VIEW.height);
  const session = await aCity();

  h = mount(
    <CitySurface
      enableCanvas
      reducedMotion
      loadCity={session.load}
      onPlaceSkill={session.placeSkill}
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
  // The GLBs resolve behind their own Suspense boundaries, so a first frame is a bare island
  // with nothing on it for a ray to hit.
  await settle(3500);

  // Open Build's Built shelf BEFORE the crisis. Build correctly becomes disabled once the
  // board owns the island, while an already-open shelf remains mounted and its rows become
  // disabled — the state this test needs in order to press the original reported instance.
  findButton(document.body, "Build").click();
  await waitFor(
    () => document.querySelector(".build-shop-built-toggle") !== null,
    "the Build dialog never opened",
    20000,
  );
  query<HTMLButtonElement>(".build-shop-built-toggle").click();
  await waitFor(
    () => document.querySelector("button.city-plot[data-node-id]") !== null,
    "the Built shelf never opened",
    20000,
  );
  const row = query<HTMLButtonElement>('button.city-plot[data-node-id="NUM.S"]');

  await openTheWinter();

  /*
   * **THE BOARD REALLY REACHED THE CANVAS.** Without this the island under the panel could be
   * a fair-weather one, `winterBoard` would be null, and the redirect under test would not
   * exist to be exercised — a green run over the wrong picture.
   */
  await waitFor(
    () => document.querySelector('.city-surface[data-winter="true"]') !== null,
    "the winter published no board, so the island is not the crisis's",
    30000,
  );

  /* ------------------------------------------------------------------ */
  /* The refusal, READ off the rendered city rather than off a prop      */
  /* ------------------------------------------------------------------ */

  /*
   * **AND A REAL POINTER, AT THE ROW'S OWN COORDINATES, WITH THE REAL STYLESHEETS LOADED.**
   *
   * This is the half a jsdom run cannot speak to, and the reason it is a press rather than a
   * computed-style read. `winter-in-city.css` sets `pointer-events: none` on `.hud` during a
   * winter and has always read as though that made the city's controls inert. MEASURED here
   * at this viewport, with `.city-surface[data-winter="true"]` on the page, the chain from
   * this row up is:
   *
   *   button.city-plot        => auto
   *   ul.city-plot-list       => auto
   *   div.build-shop-built-panel => auto
   *   div.build-shop              => auto
   *
   * `.hud > *` puts every direct child back, so the crisis rule only ever made a container
   * transparent that was already transparent. The mouse path to this row was open in the
   * shipped browser, which is why the report was a CLICK. The dimming does work — `.hud-dock`
   * measures `opacity: 0.22` — so the row was faint, live, and one press from a lesson.
   */
  const box = row.getBoundingClientRect();
  for (const type of ["pointerdown", "pointerup", "click"] as const) {
    row.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: box.left + box.width / 2,
        clientY: box.top + box.height / 2,
        pointerId: 2,
        pointerType: "mouse",
        button: 0,
      }),
    );
  }
  await settle(150);
  // The press comes before the `disabled` check for the reason its sibling in the jsdom file
  // records: `disabled` is a real defence, so checking it first would abort this case before
  // the thing it is actually about — what is on screen — had been looked at, and the failure
  // screenshot vitest keeps would be of a city with no popup in it.
  expect(
    document.querySelector(".building-callout"),
    "a real mouse press on a roster row opened a lesson popup underneath the crisis panel",
  ).toBeNull();
  expect(
    row.disabled,
    "the roster row is live during a crisis, so a press on it reads as broken",
  ).toBe(true);
  const closeBuild = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Close build menu"]',
  );
  if (closeBuild) {
    closeBuild.click();
    await waitFor(
      () => document.querySelector(".build-shop") === null,
      "the Built shelf kept covering the crisis board",
      20000,
    );
  }

  /* ------------------------------------------------------------------ */
  /* The exception, both ways                                            */
  /* ------------------------------------------------------------------ */

  // Arm a reinforce, so the crisis is asking for a BUILDING. In this mode the ground takes no
  // click at all (`WinterCityBoard.onAimCell` is null off a fire), so a declaration appearing
  // is proof that a building was hit rather than the island.
  findButton(panel(), /Reinforce a building/).click();
  await settle(250);
  expect(
    findButton(panel(), /Commit and face/).disabled,
    "the crisis already had a declaration before anything was clicked",
  ).toBe(true);

  /*
   * A SEARCH RATHER THAN A PINNED PIXEL, which is `carryBackFrames.browser.test.tsx`'s own
   * argument for the same problem: where a building lands on screen is a fact about the
   * crisis's re-framing, the panel's width and this city's layout, none of which this file
   * owns. It walks the strip the panel leaves, skips any point another element is sitting
   * over (`elementFromPoint` is the hit test a real pointer gets), and stops at the first one
   * the crisis accepts.
   */
  const viewport = query<HTMLElement>(".city-viewport");
  const sheet = document.querySelector<HTMLElement>(".winter-in-city .hw-shell");
  const left = (sheet?.getBoundingClientRect().right ?? 0) + 16;
  const right = window.innerWidth - 16;
  const tried: string[] = [];
  let landed: string | null = null;

  for (let iy = 0; iy < 11 && landed === null; iy += 1) {
    for (let ix = 0; ix < 11 && landed === null; ix += 1) {
      const x = Math.round(left + ((right - left) * ix) / 10);
      const y = Math.round(80 + ((window.innerHeight - 140) * iy) / 10);
      const over = document.elementFromPoint(x, y);
      if (over === null || !viewport.contains(over)) {
        continue;
      }
      tried.push(`${x},${y}`);
      clickTheCanvasAt(x, y);
      await settle(90);

      // DIRECTION TWO, CHECKED ON EVERY PRESS. An island that went back to being an ordinary
      // city click puts the lesson menu over the crisis — the defect this whole change is
      // about — and it has to report as itself rather than as the search running out.
      expect(
        document.querySelector(".building-callout"),
        `the island click at ${x},${y} opened a lesson popup underneath the crisis panel`,
      ).toBeNull();

      if (!findButton(panel(), /Commit and face/).disabled) {
        landed = `${x},${y}`;
      }
    }
  }

  // DIRECTION ONE: STILL LIVE. The commit control is refused until the crisis has something to
  // act on, so an enabled one is the crisis reporting that it took the click. An island that
  // went inert during a winter never enables it and fails here — which is the silent failure
  // the gate made possible, and the reason this exception is worth a guard at all.
  expect(
    landed,
    `no click on the island reached the crisis, so Reinforce cannot be aimed at a ` +
      `building; tried ${tried.length} points: ${tried.join(" | ")}`,
  ).not.toBeNull();

  // ...and the crisis says what it took, so "the button enabled" is not standing in for a
  // declaration nobody can read.
  expect(
    query<HTMLElement>(".winter-in-city .hw-commit p").textContent ?? "",
    "the crisis enabled its commit control without declaring anything",
  ).toMatch(/Reinforce/i);
});
