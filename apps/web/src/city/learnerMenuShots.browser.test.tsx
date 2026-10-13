import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { App } from "../App";
import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import { findButton, type Harness, mount, waitFor } from "../lessons/testHarness";
import { resetCityEra } from "./useCityEra";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * **THE ☰ MENU A LEARNER IS ACTUALLY GIVEN, PHOTOGRAPHED.**
 *
 * `docs/qa-prose-2026-08-08.md` §4.1 reported `CheckerLab` — a surface whose own copy says
 * *"This development fixture"* — sitting in the menu's "Other places" nav beside Diagnostic
 * and Lessons, and stated its own evidence limit in the same breath: the claim was read off
 * the tree (an unconditional `onOpenSurface`, a nav gated only on that prop) and **nobody had
 * looked at the menu**. `qa-verification.mdc` says a claim about what is visible on a surface
 * owes a frame somebody looked at, so this file takes it.
 *
 * ## The mount is the whole question, so it is argued rather than assumed
 *
 * `<App />` itself, not `CitySurface` with props chosen here. The defect IS a wiring decision
 * in the composition root — which props it passes and which it gates — so a mount that hands
 * `onOpenSurface` in by hand would be photographing this file's opinion of `App.tsx` instead
 * of `App.tsx`.
 *
 * The address is `/demo`, and that is what makes it a LEARNER's mount rather than a
 * developer's. `isDevPersistenceEnabled()` is `import.meta.env.DEV && !isDemoMode() &&
 * !isServerBacked(true)`, so the exact-`/demo` path switches the dev gate OFF inside a Vite
 * dev server exactly as a built artifact's `DEV === false` does. That is asserted below
 * rather than described: without it, "no dev control is on screen" and "the mount never
 * reached the city" are the same photograph. `/demo` is also a surface the product genuinely
 * ships (`demo/demoMode.browser.test.tsx`), so this is not a synthetic configuration.
 *
 * `App` renders its own `.city-shell`, so the panel tokens (`--glass-fill-strong` and its
 * neighbours, declared on `.city-shell` and not at `:root`) resolve, and the frame is not the
 * all-transparent misread a bare `document.body` mount produces.
 *
 * 1024x580 — the short evidence viewport, where a popover costs the most.
 *
 * Gitignored, like every other `__screenshots__` shot in this tree. Regenerate with
 *
 *   npx vitest run --config vitest.browser.config.ts --maxWorkers=1 \
 *     apps/web/src/city/learnerMenuShots.browser.test.tsx
 */

const VIEWPORT = { width: 1024, height: 580 } as const;

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
const enteredAt = typeof window === "undefined" ? "/" : window.location.pathname;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  window.history.replaceState(null, "", enteredAt);
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

beforeEach(() => {
  localStorage.clear();
  resetCityEra();
});

afterEach(() => {
  h?.cleanup();
  h = null;
  resetCityEra();
  localStorage.clear();
  window.history.replaceState(null, "", enteredAt);
});

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

/**
 * Where this test's viewport sits inside the real browser window. Vitest scales the tester
 * iframe when the requested viewport does not match the window, so a clip written in the
 * requested viewport's CSS pixels lands in the wrong place; `winterDevSkipShots` documents
 * the 647x1024 frame that produced. The scale is asserted at capture for the same reason.
 */
function testViewportBox(): {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
} {
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
    scale: box.height / window.innerHeight,
  };
}

async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a 1024x580 screen`,
  ).toBeCloseTo(1, 1);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, VIEWPORT.width),
      height: Math.min(box.height, VIEWPORT.height),
      scale: 1,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `apps/web/src/city/__screenshots__/learner-menu/${name}.png`,
      shot.data,
      { encoding: "base64" },
    );
  }
}

/** Walk the title screen into the city and open the ☰ Menu, as a learner does. */
async function openTheLearnersMenu(): Promise<HTMLElement> {
  window.history.replaceState(null, "", "/demo");
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
  h = mount(<App />);

  await waitFor(
    () => {
      try {
        findButton(document, "Start");
        return true;
      } catch {
        return false;
      }
    },
    "the title screen offers Start",
    30_000,
  );
  findButton(document, "Start").click();

  await waitFor(
    () => document.querySelector("button.hud-menu-toggle") !== null,
    "the city HUD mounts",
    30_000,
  );
  const skip = document.querySelector<HTMLButtonElement>(
    '[data-testid="onboarding-advisor-skip"]',
  );
  skip?.click();

  query<HTMLButtonElement>("button.hud-menu-toggle").click();
  await waitFor(
    () => document.querySelector(".city-menu-popover") !== null,
    "the ☰ Menu opens",
    20_000,
  );
  // The onboarding tip lands over the popover's top edge. Dismissed rather than photographed
  // around, because the subject here is what the nav offers and not what a coach mark covers.
  const tips = [...document.querySelectorAll("button")].find((b) =>
    /Skip tips/i.test(b.textContent ?? ""),
  );
  tips?.click();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await waitFor(
    () => document.querySelector('nav[aria-label="Other places"]') !== null,
    "the learner menu renders Other places",
    20_000,
  );
  return query<HTMLElement>(".city-menu-popover");
}

/**
 * Bring the nav into the popover's own scroll window, the way a learner reaching it does.
 *
 * At 1024x580 the menu is taller than the screen, so "Other places" opens below the fold —
 * which is a fact about the frame, not about reachability, and scrolling is the learner's
 * own gesture rather than a special affordance. `scrollIntoView` on the entry, then a frame,
 * so the picture shows the nav in the menu it belongs to rather than a crop of one chip.
 */
async function scrollOtherPlacesIntoView(): Promise<void> {
  const nav = document.querySelector('nav[aria-label="Other places"]');
  nav?.scrollIntoView({ block: "center" });
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => setTimeout(resolve, 120));
}

/** The labels in the menu's "Other places" nav, read off the rendered DOM. */
function otherPlaces(): string[] {
  const nav = document.querySelector('nav[aria-label="Other places"]');
  if (!nav) {
    return [];
  }
  return [...nav.querySelectorAll("button, a")].map((el) =>
    (el.textContent ?? "").replace(/\s+/g, " ").trim(),
  );
}

// The whole composition root mounts here — three.js city included — so this is sized to a
// cold Chromium rather than to the 15s default a lesson widget needs.
test("photographs the learner's ☰ Menu and what its Other places nav offers", {
  timeout: 180_000,
}, async () => {
  const menu = await openTheLearnersMenu();

  /*
   * THE PREMISE. Everything the frame is worth turns on this being a learner's build and not
   * a developer's, so the gate is measured before the shutter, and a dev control's absence is
   * measured beside it. Without these two, an empty corner proves nothing.
   */
  expect(
    isDevPersistenceEnabled(),
    "the dev gate is OPEN on this mount, so this is a developer's menu and not a learner's",
  ).toBe(false);
  expect(
    document.querySelector('[data-testid="dev-seed-crisis"]'),
    "a dev stand-in control is on screen, so the gate did not take effect",
  ).toBeNull();

  // FLOOR AND COMPOSITION, so "the nav holds no dev surface" cannot pass over an empty nav or
  // over a menu that failed to render its entries at all.
  const places = otherPlaces();
  expect(places.length, `Other places held ${places.join(", ")}`).toBeGreaterThanOrEqual(2);
  expect(places).toContain("Diagnostic");
  expect(places).toContain("Lessons");

  await shoot("01-the-learners-menu-as-it-opens-1024x580");
  await scrollOtherPlacesIntoView();
  await shoot("02-other-places-on-a-learners-menu-1024x580");

  /*
   * WHAT THE FRAMES ARE OF, IN TEXT, since a picture cannot be searched for a word. The two
   * frames are the evidence about what a learner SEES; these two lines are the part a picture
   * is bad at, and they are what fails when the entry comes back.
   */
  const words = (menu.textContent ?? "").replace(/\s+/g, " ");
  expect(
    places,
    `the ☰ Menu's Other places nav offers ${places.join(", ")} to a learner`,
  ).not.toContain("Checker Lab");
  expect(
    words,
    "the ☰ Menu speaks the authoring lane's vocabulary to a learner",
  ).not.toMatch(/capability probe|development fixture|golden case/i);
});
