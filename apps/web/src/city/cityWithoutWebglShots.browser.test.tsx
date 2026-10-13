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
 * **THE CITY A LEARNER WITHOUT WEBGL IS SERVED, PHOTOGRAPHED.**
 *
 * ## What this is evidence about
 *
 * The all-domain QA round reported a chip row reading `D6 D7 D8 D9 D10` at the top-left of the
 * HUD, immediately right of the `STONE` counter, on a learner's mount. It came from
 * `StaticCityBackdrop` — the DOM stand-in `three/CityCanvasHost.tsx` renders whenever the 3D
 * scene cannot mount — which printed each locked district's `domain` where the same object
 * carries the engine's `label`, and each building's `node_id` where the scene it stands in for
 * names the skill.
 *
 * `qa-verification.mdc`: a claim about what a learner SEES owes a frame somebody looked at, and
 * a frame cropped to the element that changed proves nothing about the surface around it. So
 * this shoots the whole 1024x580 screen, HUD and island well together.
 *
 * ## The mount is the whole question, so it is argued rather than assumed
 *
 * `<App />` itself, at `/demo`, and that address is what makes it a LEARNER's mount rather than
 * a developer's: `isDevPersistenceEnabled()` is `import.meta.env.DEV && !isDemoMode() &&
 * !isServerBacked(true)`, so exact `/demo` switches the dev gate off inside a Vite dev server
 * exactly as a built artifact's `DEV === false` does. Asserted below rather than described.
 * `App` renders its own `.city-shell`, so the panel tokens declared there (and not at `:root`)
 * resolve and the frame is not the all-transparent misread a bare `document.body` gives.
 *
 * ## Why the canvas is switched off, and why that is faithful rather than synthetic
 *
 * `canRenderCanvas()` probes `getContext("webgl2") ?? getContext("webgl")` and hands the whole
 * well to the DOM fallback when it comes back null. That is a real learner's device — no
 * WebGL, a blocked GPU, a driver the browser has denylisted — and it is the ONLY state in which
 * this surface is on screen at all, so a frame of a machine that happens to have a GPU would be
 * a frame of the thing that is not being claimed about. The probe is answered null here rather
 * than left to the CI runner's driver, so the subject of the picture is the same every run.
 * Everything else is the shipped composition root.
 *
 * 1024x580 — the short evidence viewport, where the skyline row costs the most.
 *
 * ## Reproducing the BEFORE frame
 *
 * Gitignored, like every `__screenshots__` shot in this tree, and this file shoots the tree it
 * is run against. The 2026-08-08 before/after pair was taken by running this file twice with
 * the two label reads in `StaticCityBackdrop` (`CitySurface.tsx`) put back to
 * `{district.domain}` and `{building.node_id}` for the first run, and each output copied aside
 * to its own name so neither overwrote the other.
 *
 *   npx vitest run --config vitest.browser.config.ts --maxWorkers=1 \
 *     apps/web/src/city/cityWithoutWebglShots.browser.test.tsx
 */

const VIEWPORT = { width: 1024, height: 580 } as const;

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
let restoreGetContext: typeof HTMLCanvasElement.prototype.getContext | null = null;
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

/** Answer the WebGL probe the way a device without it does, and only that probe. */
function serveADeviceWithoutWebgl(): void {
  const original = HTMLCanvasElement.prototype.getContext;
  restoreGetContext = original;
  HTMLCanvasElement.prototype.getContext = function patched(
    this: HTMLCanvasElement,
    id: string,
    ...rest: unknown[]
  ) {
    if (id === "webgl" || id === "webgl2" || id === "experimental-webgl") {
      return null;
    }
    return (original as (...args: unknown[]) => unknown).call(this, id, ...rest);
  } as typeof HTMLCanvasElement.prototype.getContext;
}

beforeEach(() => {
  localStorage.clear();
  resetCityEra();
  serveADeviceWithoutWebgl();
});

afterEach(() => {
  if (restoreGetContext) {
    HTMLCanvasElement.prototype.getContext = restoreGetContext;
    restoreGetContext = null;
  }
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
 * requested viewport's CSS pixels lands in the wrong place; the scale is asserted at capture.
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
      `apps/web/src/city/__screenshots__/city-fallback/${name}.png`,
      shot.data,
      { encoding: "base64" },
    );
  }
}

test("photographs the city a learner without WebGL is served", {
  timeout: 180_000,
}, async () => {
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
  document
    .querySelector<HTMLButtonElement>('[data-testid="onboarding-advisor-skip"]')
    ?.click();
  const tips = [...document.querySelectorAll("button")].find((b) =>
    /Skip tips/i.test(b.textContent ?? ""),
  );
  tips?.click();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  /*
   * THE PREMISE. The frame is worth nothing unless this is a learner's build AND the surface
   * in the well is the DOM fallback: without both, an unremarkable picture and a picture of
   * something else look the same.
   */
  expect(
    isDevPersistenceEnabled(),
    "the dev gate is OPEN on this mount, so this is a developer's city and not a learner's",
  ).toBe(false);
  const backdrop = query<HTMLElement>('[data-testid="city-backdrop"]');
  expect(
    document.querySelector(".city-canvas canvas"),
    "the 3D canvas mounted, so this frame is not the surface a device without WebGL gets",
  ).toBeNull();

  // FLOOR AND COMPOSITION on what is in the picture, because a picture cannot be searched
  // for a word and an empty skyline photographs exactly like a clean one.
  const skyline = [...backdrop.querySelectorAll(".city-backdrop-district")].map((el) =>
    (el.textContent ?? "").trim(),
  );
  expect(
    skyline.length,
    "the skyline rendered no districts, so the frame shows nothing about them",
  ).toBeGreaterThanOrEqual(9);
  expect(
    backdrop.querySelectorAll(".city-backdrop-node").length,
    "the backdrop rendered no building plots",
  ).toBeGreaterThanOrEqual(6);

  await shoot("the-city-without-webgl-1024x580");

  /*
   * WHAT THE FRAME IS OF, IN TEXT. `learnerCityHoldsNoAuthoringIds.test.tsx` owns the sweep
   * over every id the registry knows; this line is the one the picture is about, so a
   * regression here fails beside the frame rather than only in another file.
   */
  for (const chip of skyline) {
    expect(chip, `the skyline shows a learner "${chip}"`).not.toMatch(/^D(?:10|[1-9])$/);
  }

  /*
   * AND WHERE IT LANDS, which is the half a name cannot carry. Naming the districts made
   * each chip five times wider, so the row that used to tuck nine tokens along the top now
   * wraps — and wrapped at full width it runs under the top-left capsule and came out
   * reading "…thmic". A rect test is not a substitute for the frame above and is not
   * offered as one; it is what fails on the day somebody widens a HUD cluster, which is a
   * day nobody will be looking at a picture.
   */
  const hudClusters = [".economy-hud", ".hud-top-left", ".hud-top-right-bar"].map(
    (selector) => ({ selector, box: query<HTMLElement>(selector).getBoundingClientRect() }),
  );
  expect(
    hudClusters.length,
    "no HUD cluster was found to measure against, so the check below overlaps nothing",
  ).toBe(3);
  for (const cluster of hudClusters) {
    expect(
      cluster.box.width * cluster.box.height,
      `${cluster.selector} has no area, so nothing can overlap it`,
    ).toBeGreaterThan(0);
  }
  for (const chip of backdrop.querySelectorAll<HTMLElement>(".city-backdrop-district")) {
    const box = chip.getBoundingClientRect();
    for (const cluster of hudClusters) {
      const overlaps =
        box.left < cluster.box.right &&
        box.right > cluster.box.left &&
        box.top < cluster.box.bottom &&
        box.bottom > cluster.box.top;
      expect(
        overlaps,
        `the district "${chip.textContent}" is drawn under ${cluster.selector}`,
      ).toBe(false);
    }
  }

  /*
   * AND THE SAME CLAIM WITHOUT THE FONT. The loop above only fires when the row happens to
   * wrap a chip into the band beside a cluster, so it is a measurement of TEXT METRICS as
   * much as of the inset: over one unchanged stylesheet it passed on Windows and failed on
   * CI, where wider glyphs took the row one line further down and pushed "Geometry" into
   * `.hud-top-left`'s vertical reach. The inset is uniform across every wrapped line, so
   * what the layout actually promises is that the chip column CLEARS the cluster, and that
   * is a claim about two boxes with no text in it. Asserted directly, the defect fails on
   * every machine on the same run rather than on whichever one happens to wrap.
   */
  const row = query<HTMLElement>(".city-backdrop-skyline");
  const inset = Number.parseFloat(getComputedStyle(row).paddingInlineStart);
  expect(
    inset,
    "the skyline declares no start inset, so it clears nothing by design",
  ).toBeGreaterThan(0);
  const leftCluster = query<HTMLElement>(".hud-top-left").getBoundingClientRect();
  expect(
    row.getBoundingClientRect().left + inset,
    `the skyline's chip column starts inside .hud-top-left, which is ${leftCluster.width}px wide: an inset built from a narrower box than the cluster it is meant to clear`,
  ).toBeGreaterThanOrEqual(leftCluster.right);
});
