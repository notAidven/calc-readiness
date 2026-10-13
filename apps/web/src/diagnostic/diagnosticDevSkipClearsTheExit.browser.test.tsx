import { DIAGNOSTIC_WALK_SCOPE } from "@cr/item-bank";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { cdp, page } from "vitest/browser";
import { SessionProvider } from "../auth/SessionContext";
import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import { findButton, type Harness, mount, waitFor } from "../lessons/testHarness";
import { DiagnosticDevSkip } from "./DiagnosticDevSkip";
import { DiagnosticRunner } from "./DiagnosticRunner";

import "../styles.css";
import "./diagnostic-demo.css";
import "./diagnostic-dev-skip.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * **THE DEV PANEL DOES NOT COVER THE WAY OUT OF THE DIAGNOSTIC.**
 *
 * A spatial claim owes a rendered frame at a realistic viewport, not a dimension — and this
 * one was WRONG the first time it was written down. The panel shipped at `top: 10px;
 * right: 10px`, copying the winter's, and the stylesheet said folding it left "a chip clear of
 * that button". Read off a real 1024x580 frame it was not: the panel occupied
 * 754..1014 x 10..135, the overlay's "Back to city" button 897..1000 x 16..56, a 103x40
 * overlap — the WHOLE button — and `elementFromPoint` at the button's centre returned
 * `button.dgx-skip__title`. **Folding made it worse, not better:** the panel shortens to 47px
 * and the fold control still lands on the button's centre. The diagnostic takes over the whole
 * viewport, so that button is the only exit, and a reviewer could not leave.
 *
 * The panel is bottom-right now. This measures the claim so it cannot come back, and it is a
 * BROWSER test rather than a jsdom one because jsdom has no layout at all: every rectangle
 * below would be `0x0` there, and the overlap check would pass over nothing.
 *
 * ## The population is what is INSIDE the diagnostic overlay
 *
 * Not every button on the page. The diagnostic mounts as an opaque takeover over the 3D city,
 * so the city's own controls are already covered by the overlay and counting them reports a
 * "collision" for every position the panel could possibly take — which is how the first
 * version of this measurement produced a false positive on the city's Build button.
 */

const SHORT_LAPTOP = { width: 1024, height: 580 };

let harness: Harness | null = null;
let restore: { width: number; height: number } | null = null;

/**
 * A frame of the whole viewport, under REDUCED MOTION.
 *
 * Unconditional, unlike the winter's opt-in shots: those need a shadow-mapped scene with seven
 * GLBs and starve a timing assertion elsewhere when left on, and this needs no canvas at all —
 * the diagnostic intro is text and the panel is a fixed box, so the shot costs a capture. The
 * PNGs land under `__screenshots__/`, which `.gitignore` already excludes, so what CI keeps is
 * the claim and what a reviewer regenerates is the picture.
 *
 * Reduced motion because the panel and the overlay both animate in, and a capture that races a
 * transition photographs a box on its way to somewhere else — which is a frame nobody can read
 * a spatial claim off.
 */
async function shoot(name: string): Promise<void> {
  if (CAPTURE_EVIDENCE) {
    await page.screenshot({ path: `__screenshots__/dev-skip/${name}.png` });
  }
}

/**
 * `prefers-reduced-motion`, over CDP — emulated for this file and HANDED BACK afterwards.
 *
 * Cast the way `winterDevSkipOverTheIsland.browser.test.tsx` casts it: vitest's `CDPSession`
 * type does not publish `send`, so the raw protocol call needs one either way.
 *
 * **THE RESET IS NOT TIDINESS.** Emulated media outlives a test file on the page it was set
 * on, exactly as an emulated viewport does — which is why the viewport is restored below and
 * why this is too. Left set, this file would hand the next file in its worker a browser where
 * every animation is stood down, and the file that notices is not this one:
 * `lessons/oruAdvisorMotion.browser.test.tsx` counts the parts of the advisor that animate and
 * reads 1 where it wants 9 under reduced motion. That failure was observed once in a full-suite
 * run of this tree and did not reproduce on a re-run, so it is recorded as a mechanism closed
 * rather than as a diagnosis; the winter's own skip file carries the same warning about a heavy
 * scene starving a timing assertion in a different file.
 */
async function emulateMotionPreference(value: "reduce" | "no-preference"): Promise<void> {
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
  };
  await session.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value }],
  });
  // MEASURED, not assumed: a protocol call that silently did nothing would leave every frame
  // below taken mid-transition while this file went on saying "under reduced motion".
  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches !==
    (value === "reduce")
  ) {
    throw new Error(`the ${value} motion emulation did not reach the page`);
  }
}

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(SHORT_LAPTOP.width, SHORT_LAPTOP.height);
  await emulateMotionPreference("reduce");
});

afterAll(async () => {
  await emulateMotionPreference("no-preference");
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  harness?.cleanup();
  harness = null;
  vi.unstubAllEnvs();
});

/** Every interactive element in `scope` the panel's box overlaps, with the overlap. */
function overlapsWithin(scope: HTMLElement): string[] {
  const panel = document.querySelector<HTMLElement>(".dgx-skip");
  if (!panel) {
    throw new Error("the dev panel is not mounted, so this measures nothing");
  }
  const p = panel.getBoundingClientRect();
  const hits: string[] = [];
  for (const element of scope.querySelectorAll<HTMLElement>("button, a[href], input")) {
    if (panel.contains(element)) {
      continue;
    }
    const r = element.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) {
      continue;
    }
    const ox = Math.min(p.right, r.right) - Math.max(p.left, r.left);
    const oy = Math.min(p.bottom, r.bottom) - Math.max(p.top, r.top);
    if (ox > 0 && oy > 0) {
      hits.push(
        `"${(element.textContent ?? element.tagName).trim().slice(0, 40)}" ` +
          `overlapped by ${Math.round(ox)}x${Math.round(oy)}px`,
      );
    }
  }
  return hits;
}

/**
 * The overlay chrome the diagnostic is served inside. `App.tsx` renders the runner inside
 * `.surface-overlay--diagnostic`, whose header carries the only exit; the runner alone has no
 * exit of its own, so a test that mounted just the runner would have nothing to collide with
 * and would pass over an empty population. The header is reproduced here rather than mounting
 * `App` (which needs the 3D city, and headless Chromium has no reliable WebGL).
 */
function OverlayChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-overlay surface-overlay--diagnostic">
      <div className="surface-overlay-frame surface-overlay-frame--diagnostic">
        <header className="surface-overlay-head surface-overlay-head--diagnostic">
          <span className="surface-overlay-brand">Diagnostic</span>
          <button type="button" className="city-action">
            Back to city
          </button>
        </header>
        <div className="surface-overlay-body surface-overlay-body--diagnostic">
          {children}
        </div>
      </div>
    </div>
  );
}

test("the dev panel leaves the diagnostic's exit reachable, expanded and folded", async () => {
  // The developer's own environment, stated rather than inherited from whatever the runner
  // happens to be started with: the panel is on screen here because the gate is open, which is
  // the only way it is ever on screen.
  vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
  harness = mount(
    <OverlayChrome>
      <SessionProvider>
        <DiagnosticRunner />
      </SessionProvider>
    </OverlayChrome>,
  );
  await waitFor(
    () => document.querySelector(".dgx-intro") !== null,
    "the diagnostic intro",
    20_000,
  );

  const overlay = document.querySelector<HTMLElement>(".surface-overlay--diagnostic");
  if (!overlay) {
    throw new Error("the overlay chrome did not mount");
  }
  const exit = findButton(overlay, /Back to city/);

  // THE POPULATION FLOOR. Every assertion below is "nothing overlaps", which is trivially
  // true over an empty set — so the set is established first: the panel is really mounted,
  // the exit is really laid out, and the surface behind it is really the diagnostic.
  expect(
    document.querySelector(".dgx-skip"),
    "the dev panel is not mounted",
  ).not.toBeNull();
  expect(exit.getBoundingClientRect().width).toBeGreaterThan(40);
  // The surface behind the panel is the real intro with its real promise on it. This used
  // to count the intro's skill roster against the scope; the roster came off the screen
  // (`diagnosticIntroPromise.test.ts` owns what replaced it), so the same floor is taken
  // from the copy that is still derived from the scope.
  expect(
    document.querySelector(".dgx-intro")?.textContent ?? "",
    "the surface behind the panel is not the diagnostic's own intro",
  ).toContain(`${DIAGNOSTIC_WALK_SCOPE.length} skills`);
  expect(overlay.querySelectorAll("button").length).toBeGreaterThan(2);

  // Expanded: covers nothing inside the overlay, and the exit answers a hit test at its
  // own centre. Both, because "the boxes do not intersect" and "the button is clickable"
  // are different claims and a stacking-context change breaks only the second.
  expect(
    overlapsWithin(overlay),
    "the dev panel covers the diagnostic's own chrome",
  ).toEqual([]);
  const centre = exit.getBoundingClientRect();
  expect(
    document.elementFromPoint(centre.x + centre.width / 2, centre.y + centre.height / 2),
    "something else answers a click at the exit button's centre",
  ).toBe(exit);

  // THE FRAME THE ARITHMETIC ABOVE OWES. Framed to hold the WHOLE viewport rather than the
  // panel, because a shot cropped to the thing that changed proves nothing about what it
  // covers: the panel is the one part of the picture nobody doubted. See below for why the
  // shots run unconditionally here.
  await shoot("dev-panel-and-exit-expanded-1024x580");

  // Folded: the same, because folding used to make it worse rather than better.
  findButton(document.body, /Answer it for me/).click();
  await waitFor(
    () => document.querySelectorAll(".dgx-skip__rung").length === 0,
    "the panel to fold",
  );
  expect(
    overlapsWithin(overlay),
    "the FOLDED dev panel covers the diagnostic's chrome",
  ).toEqual([]);
  expect(
    document.elementFromPoint(centre.x + centre.width / 2, centre.y + centre.height / 2),
    "the folded panel still answers a click at the exit button's centre",
  ).toBe(exit);
  await shoot("dev-panel-and-exit-folded-1024x580");
});

test("the panel sits in the bottom-right of the viewport, not over the header", async () => {
  // The positional claim on its own, so a future move that happens to miss today's buttons
  // still has to be a deliberate decision rather than a silent drift back up the screen.
  //
  // MOUNTED BY SETTING THE ENVIRONMENT, not by overriding the gate. The panel used to take an
  // override prop and this line used to pass it, which is precisely the hole
  // `test/diagnosticDevSkipStaysDev.test.ts` exists to close: a test that switches a dev
  // control on is harmless in itself and is the shape a production mount gets copied from. The
  // prop is gone, so the only door in is the one a developer's browser comes through.
  vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
  expect(isDevPersistenceEnabled(), "the gate is shut, so nothing below is measured").toBe(
    true,
  );
  harness = mount(
    <DiagnosticDevSkip midRun={false} busy={false} onRun={async () => null} />,
  );
  await waitFor(() => document.querySelector(".dgx-skip") !== null, "the panel");
  const box = (document.querySelector(".dgx-skip") as HTMLElement).getBoundingClientRect();
  expect(
    box.height,
    "the panel has no layout, so nothing here is measured",
  ).toBeGreaterThan(40);
  expect(box.bottom).toBeLessThanOrEqual(SHORT_LAPTOP.height);
  expect(
    box.top,
    `the panel starts at y=${Math.round(box.top)}, which is in the overlay header's band`,
  ).toBeGreaterThan(SHORT_LAPTOP.height / 2);
  expect(box.right).toBeLessThanOrEqual(SHORT_LAPTOP.width);
});
