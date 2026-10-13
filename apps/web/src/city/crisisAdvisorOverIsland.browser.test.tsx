import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { CitySurface } from "./CitySurface";
import { crisisBriefingFor, forgetCrisisBriefingRead } from "./crisisCall";
import { CURRENT_ERA_ID } from "./eraDressing";

import "../styles.css";

/**
 * **IS THE ADVISOR STANDING ON YOUR ISLAND, OR IS HE A CARD ON A SCREEN?** Photographed
 * over the LIVE canvas, at the lead's own window, because that is the only way the
 * question can be answered.
 *
 * `crisisCallShots.browser.test.tsx` photographs the advisor with `enableCanvas={false}`,
 * which is the right instrument for reading the dialogue and the wrong one for this claim:
 * a briefing that blacked the island out and one that left it showing look identical over
 * a blank page. So this file mounts the city with its real canvas, its real island and its
 * real HUD underneath the advisor, and photographs the composition.
 *
 * ## THE VIEWPORT IS HALF THE EVIDENCE, and it is 1024x580
 *
 * The lead reviews in a short window. A frame taken at 1440x900 will make almost any
 * overlay look roomy, so the shot list is the short window first.
 *
 * ## TWO CAPTURES, because a WebGL canvas photographs STALE under an overlay
 *
 * `winterIslandVisible.browser.test.tsx` measured this and the finding is reused rather
 * than rediscovered: a CDP capture taken with a full-screen overlay above the canvas comes
 * back with a stale canvas layer. So the island is photographed with the advisor hidden
 * (`island-only-*`) and the advisor is photographed over it (`advisor-*`), and the two are
 * read together. The scene is settled BEFORE the advisor opens and the camera never moves
 * for it, so the stale layer under the composite is a frame of the same settled island.
 *
 * ## IT IS OFF BY DEFAULT, for the reason `winterIslandVisible` records
 *
 *   VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/city/crisisAdvisorOverIsland.browser.test.tsx
 *
 * A full shadow-mapped scene with seven GLBs is heavy, and a heavy scene left on in this
 * suite starves an animation-timing assertion in a different file rather than failing here.
 * The always-on test below is the claim that survives in CI: the advisor draws NO opaque
 * box over the island, which is measurable in the DOM at every run.
 */

const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS);

/**
 * The lead's window FIRST, and it is short on purpose: this is where an overlay stops
 * leaving room, and it is the frame the review will be read from. The roomy laptop and the
 * phone are behind it because a layout that only holds at one size is not a layout.
 */
const LEAD_WINDOW = { width: 1024, height: 580 } as const;
const VIEWPORTS = [
  LEAD_WINDOW,
  { width: 1440, height: 900 },
  { width: 460, height: 800 },
] as const;

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

const briefing = (() => {
  const found = crisisBriefingFor(CURRENT_ERA_ID);
  if (found === null) {
    throw new Error("era one has no briefing, so this whole file proves nothing");
  }
  return found;
})();

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  forgetCrisisBriefingRead();
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

function named(label: RegExp | string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find((button) => {
    const name = (button.getAttribute("aria-label") ?? button.textContent ?? "").trim();
    return typeof label === "string" ? name === label : label.test(name);
  });
}

/** Where this test's viewport sits in the real window (vitest scales the tester iframe). */
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
 * CDP rather than `page.screenshot`, following `winterIslandVisible`: the locator capture
 * runs actionability checks and never gets past "waiting for element to be stable" against
 * a canvas running `frameloop="always"`.
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
      `apps/web/src/city/__screenshots__/crisis-advisor/${name}.png`,
      shot,
      { encoding: "base64" },
    );
  }
}

/**
 * The city, its canvas live, with the advisor opened the way the demo operator opens it.
 *
 * Waits for the scene to SETTLE before the advisor goes up, so the canvas layer under the
 * composite is a frame of the finished island rather than of a bare one.
 */
async function openAdvisorOverTheIsland(view: {
  readonly width: number;
  readonly height: number;
}): Promise<HTMLElement> {
  await page.viewport(view.width, view.height);
  h?.cleanup();
  forgetCrisisBriefingRead();
  h = mount(<CitySurface enableCanvas onOpenSurface={() => undefined} />);

  await waitFor(
    () => document.querySelector(".city-viewport canvas") !== null,
    "the city canvas never mounted",
    30000,
  );
  await waitFor(() => named("Menu") !== undefined, "the city's Menu button appears", 30000);
  await document.fonts.ready;
  // The GLBs resolve behind their own Suspense boundaries, so a first frame is a bare
  // island. No renderer handle out here to count against, so this waits on the clock.
  await new Promise<void>((resolve) => setTimeout(resolve, 3000));
  // A THROWAWAY CAPTURE, and it is load-bearing: a clipped capture puts a device-metrics
  // override on the page, which R3F reads as a resize and re-renders through. The frame
  // that comes back from the FIRST capture is the one drawn before any of that settled.
  await capture();
  await new Promise<void>((resolve) => setTimeout(resolve, 800));

  named("Menu")?.click();
  await waitFor(() => named(/Hard Winter/i) !== undefined, "the Hard Winter entry appears");
  named(/Hard Winter/i)?.click();
  await waitFor(
    () => document.querySelector('[data-testid="crisis-call-advisor"]') !== null,
    "the advisor never opened",
  );
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 700));
  return query<HTMLElement>('[data-testid="crisis-call-advisor"]');
}

/**
 * The one assertion that runs unconditionally, so a gated file is never an empty one and
 * the shot list cannot quietly lose the viewport the review is being read at.
 */
test("photographs the lead's own short window first", () => {
  expect(VIEWPORTS[0]).toEqual(LEAD_WINDOW);
  expect(`${LEAD_WINDOW.width}x${LEAD_WINDOW.height}`).toBe("1024x580");
  expect(VIEWPORTS.length).toBeGreaterThanOrEqual(3);
});

for (const view of VIEWPORTS) {
  test.runIf(SHOTS)(
    `photographs the advisor over the live island at ${view.width}x${view.height}`,
    async () => {
      const advisor = await openAdvisorOverTheIsland(view);
      expect(advisor.textContent ?? "").toContain(briefing.lead);

      // THE ISLAND, with the advisor out of the way. This is the canvas layer as it
      // actually stands; the composite's own canvas layer is the stale one.
      advisor.style.visibility = "hidden";
      let island: string;
      try {
        await new Promise<void>((resolve) => setTimeout(resolve, 400));
        island = await capture();
      } finally {
        advisor.style.visibility = "";
      }
      await keep(`island-only-${view.width}x${view.height}`, island);

      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      await keep(`advisor-${view.width}x${view.height}`, await capture());

      // AND THE TALLEST SLIDE, which is the one that leaves least island and is not the
      // one the dialogue opens on. Named by the slide actually on screen rather than by
      // the number of times Next was pressed, so this cannot be a second photograph of
      // slide one.
      const tallest = briefing.slides.reduce((worst, slide) =>
        slide.terms.length > worst.terms.length ? slide : worst,
      );
      const index = briefing.slides.indexOf(tallest);
      expect(index, "the tallest slide is the one it opens on").toBeGreaterThan(0);
      for (let step = 0; step < index; step += 1) {
        document
          .querySelector<HTMLButtonElement>('[data-testid="crisis-call-next"]')
          ?.click();
        await new Promise<void>((resolve) => setTimeout(resolve, 80));
      }
      expect(
        document.querySelector<HTMLElement>('[data-testid="crisis-call-slide"]')?.dataset
          .slide,
        "the tallest slide never opened",
      ).toBe(tallest.id);
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
      await keep(`advisor-widest-slide-${view.width}x${view.height}`, await capture());
    },
    120000,
  );
}
