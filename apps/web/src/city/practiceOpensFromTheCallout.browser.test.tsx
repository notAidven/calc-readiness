import { afterEach, beforeAll, expect, test } from "vitest";
import { cdp, page } from "vitest/browser";

import { findButton, type Harness, mount, waitFor } from "../lessons/testHarness";
import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";
import { d1LessonHost } from "./d1LessonHost";
import { framedTestBudget } from "./shotBudget";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * **THE DESTINATION THE ACCOUNT-MODE WRITE PATH EXISTS TO REACH, PHOTOGRAPHED.**
 *
 * A signed-in learner could finish a lesson and never reach the practice set, because nothing
 * wrote `lesson_stage` and the building stayed at Foundation.
 * `lessonProgressionIsNotDevGated.test.tsx` owns the wiring half of that fix and drives it red
 * by injection; what it cannot own is what a learner SEES, because it runs in jsdom, where
 * there is no stylesheet, no island behind the popup and nothing to look at.
 *
 * So this file is the spatial half, and it is spatial in the sense the QA rule means: the
 * claim is not "a button exists with `disabled` unset" but "the practice set replaces the
 * whole application frame, with the city and HUD hidden and inert, then returns to the same
 * mounted city". Both frames are taken at **1024x580** — a short, realistic viewport rather
 * than a comfortable developer one — on a mount wrapped in `.city-shell`, because the panel
 * tokens (`--glass-fill-strong` and its neighbours) are declared on that class and not at
 * `:root`. Mounted bare, every panel here would resolve them to nothing and photograph as
 * transparent.
 *
 * `enableCanvas` for the same reason: the subject is the transition between surfaces, not a
 * component mounted alone. Keeping the real canvas mounted is what makes identity restoration
 * observable even though it is deliberately absent from the practice frame.
 *
 * ## What is seeded, and what is therefore NOT claimed here
 *
 * The lesson stage is advanced directly on the session before the mount, which is the local
 * equivalent of what `POST /api/lesson/stage` now does server-side. That keeps this file to
 * two frames instead of a full teaching-and-CFU navigation, and it means this file does not
 * evidence that the CFU signal arrives — its sibling does that, with an injection proof. What
 * is evidenced here is everything downstream of the stage write: the callout a learner returns
 * to, and the practice set opening from it.
 */

/** The learner's window, and the viewport both frames below are taken at. */
const VIEW = { width: 1024, height: 580 } as const;

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterEach(async () => {
  h?.cleanup();
  h = null;
  // CDP emulation and the viewport belong to the PAGE, which Vitest reuses for the next
  // file in this worker. Hand both back even when the framed test fails midway through.
  await session().send("Emulation.setEmulatedMedia", { features: [] });
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

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

function session() {
  return cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
  };
}

async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  await settle(120);
  // The viewport is half the evidence, so a frame that drifted off it is not one of these.
  expect(window.innerWidth).toBe(VIEW.width);
  expect(window.innerHeight).toBe(VIEW.height);
  if (CAPTURE_EVIDENCE) {
    expect(
      await page.screenshot({
        path: `__screenshots__/account-mode-practice/${name}-1024x580.png`,
      }),
    ).toBeTruthy();
  }
}

test(`the practice set opens from the building callout at ${VIEW.width}x${VIEW.height}`, {
  timeout: framedTestBudget(6),
}, async () => {
  await page.viewport(VIEW.width, VIEW.height);
  await session().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });

  const city = createCityDevSession();
  await city.placeSkill("NUM.3", { col: 3, row: -2, rot: 0 });
  // The stage write, standing where the route's own write lands. See the header.
  await city.markLessonTaught("NUM.3");

  h = mount(
    <div className="city-shell">
      <CitySurface
        enableCanvas
        reducedMotion
        loadCity={city.load}
        lessonHost={d1LessonHost}
        onLessonTaught={city.markLessonTaught}
        onPracticeComplete={city.advanceMasteryDev}
        onOpenSurface={() => undefined}
      />
    </div>,
  );

  await waitFor(
    () => document.querySelector(".city-viewport canvas") !== null,
    "the city canvas never mounted",
    40000,
  );
  await document.fonts.ready;
  // The GLBs resolve behind their own Suspense boundaries, so a first frame is bare ground.
  await settle(3500);
  const cityStage = query<HTMLElement>(".city-stage-full");
  const cityViewport = query<HTMLElement>(".city-viewport");
  const cityCanvas = query<HTMLCanvasElement>(".city-viewport canvas");
  const buildButton = query<HTMLButtonElement>(".city-build-button");

  findButton(document.body, "Build").click();
  await waitFor(
    () => document.querySelector(".build-shop-built-toggle") !== null,
    "the Build dialog never opened",
    20000,
  );
  query<HTMLButtonElement>(".build-shop-built-toggle").click();
  await waitFor(
    () => document.querySelector('button.city-plot[data-node-id="NUM.3"]') !== null,
    "the Built shelf never listed the placed skill",
    20000,
  );
  query<HTMLButtonElement>('button.city-plot[data-node-id="NUM.3"]').click();
  await waitFor(
    () => document.querySelector(".building-callout") !== null,
    "the building callout never opened",
    20000,
  );

  /* ---------------------------------------------------------------- */
  /* Frame 1: the callout a learner returns to, in Construction        */
  /* ---------------------------------------------------------------- */

  const callout = query<HTMLElement>(".building-callout");
  const practice = findButton(callout, /Practice set/);
  expect(
    practice.disabled,
    "the practice set is still locked, so the stage write did not reach the callout",
  ).toBe(false);
  await shoot("callout-construction");

  /* ---------------------------------------------------------------- */
  /* Frame 2: the practice set, opened from it                         */
  /* ---------------------------------------------------------------- */

  practice.click();
  await waitFor(
    () => document.querySelector(".lesson-practice") !== null,
    "the practice set never opened from the callout",
    30000,
  );
  // Not just mounted: mounted with a question on it. A practice surface that came up empty
  // would satisfy the selector above and photograph as a blank sheet over the island.
  await waitFor(
    () => (document.querySelector(".lesson-practice")?.textContent ?? "").length > 40,
    "the practice set opened with nothing in it",
    30000,
  );
  const sceneBox = query<HTMLElement>(".world-scene").getBoundingClientRect();
  const cardBox = query<HTMLElement>(".world-scene .coc-card").getBoundingClientRect();
  const coveredCityStage = query<HTMLElement>(".city-stage-full");
  expect(sceneBox).toMatchObject({
    left: 0,
    top: 0,
    width: VIEW.width,
    height: VIEW.height,
  });
  expect(cardBox).toMatchObject({
    left: 0,
    top: 0,
    width: VIEW.width,
    height: VIEW.height,
  });
  expect(
    coveredCityStage.inert,
    "the account-style practice path left the city operable",
  ).toBe(true);
  expect(
    getComputedStyle(coveredCityStage).display,
    "the account-style practice path left the city visible beside the work",
  ).toBe("none");
  await shoot("practice-set-open");

  findButton(document.body, "Back to city").click();
  await waitFor(
    () => document.querySelector(".world-scene") === null,
    "the practice set did not return to the city",
    20_000,
  );
  expect(document.querySelector(".city-stage-full")).toBe(cityStage);
  expect(document.querySelector(".city-viewport")).toBe(cityViewport);
  expect(document.querySelector(".city-viewport canvas")).toBe(cityCanvas);
  expect(cityStage.inert).toBe(false);
  expect(buildButton).toBe(document.activeElement);
});

test("hands its browser media and viewport state back to the worker", () => {
  // This runs after the framed test's `afterEach`. Without that cleanup, the CityGuide
  // animation guard deterministically sees reduced motion when both files share one worker.
  expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(false);
  expect({ width: window.innerWidth, height: window.innerHeight }).toEqual(restore);
});
