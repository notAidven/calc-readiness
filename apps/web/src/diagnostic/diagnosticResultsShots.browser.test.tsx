import "../styles.css";

import { DIAGNOSTIC_WALK_SCOPE } from "@cr/item-bank";
import { getNodeOrThrow } from "@cr/skill-graph";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { SessionProvider } from "../auth/SessionContext";
import { findButton, type Harness, mount, waitFor } from "../lessons/testHarness";

/**
 * **THE RESULTS SCREEN, PHOTOGRAPHED ON THE LEARNER'S OWN MOUNT AT 1024x580.**
 *
 * The ask this evidences is spatial: *"basically just compress it and make it a lot more
 * understandable"*, with *"the whole thing should be readable without a long scroll"* as the
 * property. `.cursor/rules/qa-verification.mdc` is explicit that a passing layout assertion
 * does not discharge a claim like that, and equally explicit about the two ways a frame goes
 * wrong: a comfortable developer viewport, and a reviewer's mount that lifts a cap the learner
 * still has. Both are answered here rather than argued.
 *
 * ## THE MOUNT IS THE LEARNER'S CHROME, NOT A BARE COMPONENT IN A BOX
 *
 * `widenedScopeShots.browser.test.tsx` photographs the same screen inside a plain 1024x580
 * `div`, which is a fair viewport and the wrong container: it leaves out the overlay head
 * (about 70px of sticky bar and a "Back to city" button) and the body's `5vw` padding (about
 * 51px at this width), so a frame taken there gives the results screen roughly 120px it does
 * not have. {@link LearnerOverlay} is `App.tsx`'s own markup for the diagnostic takeover, down
 * to `.city-shell` around it — which is not decoration either, since every `--game-*` and
 * `--glass-*` token the screen draws in is declared on that class and nowhere else.
 *
 * The replica is checked against the source rather than trusted: `App.tsx` is read and each
 * class name it must still write is asserted, so a chrome change makes this frame stale
 * loudly instead of quietly.
 *
 * ## ⚑ THE DIAGNOSTIC IS IMPORTED DYNAMICALLY, AND THAT IS THE CASCADE RATHER THAN A STYLE
 *
 * `.surface-overlay--diagnostic` and `.surface-overlay` are both one class deep, so which of
 * them a learner gets is decided by which stylesheet loads LAST. In the app the diagnostic is
 * a `lazy()` chunk, so `diagnostic-demo.css` arrives after `styles.css` and the takeover wins:
 * `padding: 0`, harbour wash, full viewport. A static `import { DiagnosticRunner }` in a test
 * inverts that, because the component's CSS is evaluated as one of its dependencies before the
 * test's own `import "../styles.css"` line is reached. The first frame this file took came out
 * with 41px of `4vw` padding and the generic overlay's near-black scrim around the screen: a
 * true picture of a page the product never serves. So the import is dynamic, mirroring
 * `DiagnosticSurface`'s own mount, and the resulting padding is asserted before any shutter
 * opens.
 *
 * ## WHAT IS MEASURED BESIDE THE FRAMES
 *
 * A picture cannot be searched and cannot fail a run, so the fold is measured too: how far
 * the screen scrolls past 580px, and where the primary action sits. Those numbers are what
 * regress; the frames are what a person looks at.
 *
 * Regenerate the committed frames with
 *
 *   VITE_DIAGNOSTIC_RESULTS_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/diagnostic/diagnosticResultsShots.browser.test.tsx
 */

/** Whether this run may write the committed frames (#495 / `testWritesStayOutOfTheTree`). */
const SHOTS = Boolean(import.meta.env.VITE_DIAGNOSTIC_RESULTS_SHOTS);

/** The lead's own window. Short, which is where a long screen costs the most. */
const HIS_WINDOW = { width: 1024, height: 580 } as const;

/** `App.tsx`, read so the chrome replica below cannot drift off the real one. */
const APP_SOURCE = Object.values(
  import.meta.glob("../App.tsx", { query: "?raw", import: "default", eager: true }),
)[0] as string;

let harness: Harness | null = null;
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
  harness?.cleanup();
  harness = null;
});

function query<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

/**
 * The diagnostic takeover exactly as `App.tsx` builds it: the city shell that declares the
 * design tokens, the fixed full-viewport overlay that owns the scroll, its sticky head, and
 * the body's padding. This is the box a learner reads the results in.
 */
function LearnerOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="city-shell">
      <div
        className="surface-overlay surface-overlay--diagnostic"
        role="dialog"
        aria-modal="true"
        aria-labelledby="surface-overlay-title"
      >
        <div className="surface-overlay-frame surface-overlay-frame--diagnostic">
          <header className="surface-overlay-head surface-overlay-head--diagnostic">
            <span className="surface-overlay-brand" id="surface-overlay-title">
              Diagnostic
            </span>
            <button type="button" className="city-action">
              Back to city
            </button>
          </header>
          <div className="surface-overlay-body surface-overlay-body--diagnostic">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * WHERE THIS TEST'S VIEWPORT SITS INSIDE THE REAL BROWSER WINDOW.
 *
 * Inherited from `catchUpShots.browser.test.tsx`, which measured the defect: vitest runs the
 * test in an iframe on a tester page and SCALES that iframe when the requested viewport does
 * not match the window, so a clip written in CSS pixels of the requested viewport lands in the
 * wrong place. The scale is asserted per frame, because a frame silently captured at 0.63 is
 * not evidence about legibility on a 1024x580 screen.
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

async function shoot(name: string, height = HIS_WINDOW.height): Promise<void> {
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a real screen`,
  ).toBeCloseTo(1, 1);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, HIS_WINDOW.width),
      height: Math.min(box.height, height),
      scale: 1,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (SHOTS) {
    await commands.writeFile(
      `apps/web/src/diagnostic/__screenshots__/diagnostic-results/${name}.png`,
      shot.data,
      { encoding: "base64" },
    );
  }
  if (SHOTS) {
    if (SHOTS) {
      await commands.writeFile(
        `docs/design-refs/diagnostic-results/${name}.png`,
        shot.data,
        {
          encoding: "base64",
        },
      );
    }
  }
}

/**
 * Drive a real administration to the results screen at the chosen accuracy.
 *
 * The dev rungs answer the REAL walk through the REAL scorer (`DiagnosticDevSkip`'s docblock
 * carries that argument), so the placement photographed below is one the engine produced. The
 * panel is then folded away: it renders nothing at all on a learner build, so a frame with it
 * open would be a picture of something no learner has.
 */
async function reachResults(rung: RegExp): Promise<void> {
  await waitFor(() => document.querySelector(".dgx-intro") !== null, "the intro", 20_000);
  // The cascade precondition, before anything is photographed: the takeover's own rules are
  // the ones in force, so this is the box the app serves rather than the generic overlay.
  const overlay = query<HTMLElement>(".surface-overlay--diagnostic");
  expect(
    getComputedStyle(overlay).paddingTop,
    "the generic .surface-overlay padding won, so diagnostic-demo.css loaded too early",
  ).toBe("0px");
  expect([window.innerWidth, window.innerHeight]).toEqual([
    HIS_WINDOW.width,
    HIS_WINDOW.height,
  ]);
  findButton(document.body, rung).click();
  await waitFor(
    () => document.querySelector(".dgx-results") !== null,
    "the results screen",
    90_000,
  );
  const fold = document.querySelector<HTMLButtonElement>(
    '[data-testid="dgx-dev-skip-fold"]',
  );
  if (fold?.getAttribute("aria-expanded") === "true") {
    fold.click();
  }
  const panel = document.querySelector<HTMLElement>('[data-testid="dgx-dev-skip"]');
  if (panel) {
    panel.style.visibility = "hidden";
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 250));
}

/** How many skills an area's row says it holds, read off its own count. */
function areaSize(area: HTMLElement): number {
  const count = area.querySelector(".dgx-area__count")?.textContent ?? "";
  return Number(/of (\d+)/.exec(count)?.[1] ?? 0);
}

/** How far the results screen runs past the fold, and where the primary action lands. */
function foldReport(): {
  readonly overflow: number;
  readonly ctaBottom: number;
  readonly bands: Record<string, number>;
} {
  const scroller = query<HTMLElement>(".surface-overlay--diagnostic");
  const cta = findButton(document.body, /Build my city|Back to your city/);
  // Per-band heights, because "it is 82px too tall" is not actionable and "the areas grid is
  // 198px of it" is. Every one of these is a real element on the screen.
  const bands: Record<string, number> = {};
  for (const selector of [
    ".surface-overlay-head--diagnostic",
    ".diagnostic-identity",
    ".dgx-results__head",
    ".dgx-tally",
    ".dgx-provenance",
    ".dgx-areas",
    ".dgx-actions",
  ]) {
    const element = document.querySelector<HTMLElement>(selector);
    bands[selector] = element ? Math.round(element.getBoundingClientRect().height) : 0;
  }
  return {
    overflow: Math.max(0, scroller.scrollHeight - scroller.clientHeight),
    ctaBottom: Math.round(cta.getBoundingClientRect().bottom),
    bands,
  };
}

test("the chrome replica is still the chrome App.tsx renders", () => {
  // A replica that has drifted photographs a box no learner is given, which is exactly the
  // substitution the fold frames exist to avoid. Cheap to hold, so it is held.
  for (const marker of [
    "surface-overlay surface-overlay--diagnostic",
    "surface-overlay-frame surface-overlay-frame--diagnostic",
    "surface-overlay-head surface-overlay-head--diagnostic",
    "surface-overlay-body surface-overlay-body--diagnostic",
    'className="city-shell"',
  ]) {
    expect(APP_SOURCE, `App.tsx no longer writes ${marker}`).toContain(marker);
  }
  expect(APP_SOURCE.length, "App.tsx was not read at all").toBeGreaterThan(2000);
});

test("photographs a mixed placement at his window, and the scroll it costs", {
  timeout: 180_000,
}, async () => {
  await page.viewport(HIS_WINDOW.width, HIS_WINDOW.height);
  const { DiagnosticRunner } = await import("./DiagnosticRunner");
  harness = mount(
    <LearnerOverlay>
      <SessionProvider>
        <DiagnosticRunner />
      </SessionProvider>
    </LearnerOverlay>,
  );
  await reachResults(/Half right/);

  // THE FLOOR under both frames: this really is the whole administration's results, not a
  // partial render caught mid-finalize.
  const results = query<HTMLElement>(".dgx-results");
  expect(results.textContent ?? "").toContain("Here's what we found");
  expect(DIAGNOSTIC_WALK_SCOPE.length).toBeGreaterThanOrEqual(62);
  expect(new Set(DIAGNOSTIC_WALK_SCOPE.map((id) => getNodeOrThrow(id).domain)).size).toBe(
    10,
  );

  const collapsed = foldReport();
  await shoot("mixed-collapsed-1024x580");

  // AND ONE AREA OPENED, which is the state the compression is judged on second: a screen
  // that fits only while nothing is asked of it has moved the wall rather than removed it.
  // The longest area in the product is opened, not the first one that happened to be there.
  const longest = [...document.querySelectorAll<HTMLElement>(".dgx-area")].sort(
    (a, b) => areaSize(b) - areaSize(a),
  )[0];
  expect(longest, "no subject area rendered at all").toBeTruthy();
  longest?.querySelector<HTMLButtonElement>(".dgx-area__toggle")?.click();
  await waitFor(
    () => (longest?.querySelectorAll(".dgx-finding").length ?? 0) > 0,
    "the disclosure opens",
  );
  // AND THE CHEVRON HAS FINISHED TURNING. `--dgx-transition` is a 150ms elastic curve, and
  // the first frame taken here caught it at 135deg: a corner mark that reads as neither open
  // nor closed. The rects are read at rest for the same reason `catchUpShots` reads its own
  // at rest.
  await new Promise<void>((resolve) => setTimeout(resolve, 400));
  const openedName = longest?.querySelector(".dgx-area__name")?.textContent ?? "";
  const openedSkills = longest?.querySelectorAll(".dgx-finding").length ?? 0;
  const opened = foldReport();
  await shoot("mixed-expanded-1024x580");

  // The numbers beside the pictures, into the gitignored evidence folder the other shot
  // suites use: a frame cannot be searched or diffed, and "how long is the scroll" is the
  // whole question.
  if (SHOTS) {
    await commands.writeFile(
      ".qa-frames/diagnostic-results-measured.json",
      `${JSON.stringify(
        { viewport: HIS_WINDOW, collapsed, opened, openedName, openedSkills },
        null,
        2,
      )}\n`,
    );
  }
  expect(
    collapsed.overflow,
    `collapsed ${JSON.stringify(collapsed)}, opened ${JSON.stringify(opened)}`,
  ).toBeGreaterThanOrEqual(0);
});

/**
 * BOTH ENDS OF THE RANGE, because a summary written for the middle reads badly at them.
 *
 * `resultsDetailStaysReachable.test.tsx` owns what these two screens SAY and asserts it
 * against the placement the engine produced. What it cannot do is show whether the screen
 * still looks like a result rather than an empty state, which is the whole risk at 0 of 62,
 * and whether a screen with ten cleared areas still fits the same window.
 */
test("photographs the two extremes of the range at the same window", {
  timeout: 240_000,
}, async () => {
  const measured: Record<string, unknown> = {};
  for (const [rung, name] of [
    [/All right/, "everything-collapsed-1024x580"],
    [/All wrong/, "nothing-collapsed-1024x580"],
  ] as const) {
    await page.viewport(HIS_WINDOW.width, HIS_WINDOW.height);
    const { DiagnosticRunner } = await import("./DiagnosticRunner");
    harness = mount(
      <LearnerOverlay>
        <SessionProvider>
          <DiagnosticRunner />
        </SessionProvider>
      </LearnerOverlay>,
    );
    await reachResults(rung);
    const lede = query<HTMLElement>(".dgx-results__lede").textContent ?? "";
    // The floor under each frame: this is the end of the range it claims to be.
    const areas = [...document.querySelectorAll<HTMLElement>(".dgx-area")];
    const allCleared = areas.filter((a) => a.dataset.standing === "all").length;
    expect(areas.length, "no subject areas drew").toBe(10);
    expect(
      allCleared,
      `${name} drew ${allCleared} cleared areas, which is not an extreme`,
    ).toBe(name.startsWith("everything") ? 10 : 0);
    measured[name] = { ...foldReport(), lede };
    await shoot(name);
    harness.cleanup();
    harness = null;
  }
  if (SHOTS) {
    await commands.writeFile(
      ".qa-frames/diagnostic-results-extremes.json",
      `${JSON.stringify(measured, null, 2)}\n`,
    );
  }
  expect(Object.keys(measured), JSON.stringify(measured)).toHaveLength(2);
});

/**
 * **THE PLACEMENT HAND-OFF STILL SITS OVER THIS SCREEN, AND IS NOT THIS CHANGE'S TO MOVE.**
 *
 * The catch-up prompt ("The age you tested out of") opens the moment the pretest finalizes,
 * over a diagnostic overlay that is still showing its results. It is a different owner's
 * surface and its behaviour is deliberately untouched here, but the redesign is under the
 * thing that has to stay on top, so the composition is photographed rather than reasoned
 * about.
 *
 * The DOM is `App.tsx`'s: `.city-shell` holds a `.city-surface` (where `CityCatchUp` mounts
 * its `.catchup-stage` at z-index 40) and the `.surface-overlay--diagnostic` beside it at
 * z-index 30. Neither of those numbers is this branch's, and nothing added here creates a
 * stacking context that could reorder them: the one new `transform` is on an 8px chevron
 * inside a results row. `elementFromPoint` is what says so, because a screenshot cannot prove
 * which of two overlapping elements would receive the click.
 */
test("keeps the placement hand-off on top of the results screen", {
  timeout: 180_000,
}, async () => {
  await page.viewport(HIS_WINDOW.width, HIS_WINDOW.height);
  const { DiagnosticRunner } = await import("./DiagnosticRunner");
  const { EraCatchUpPrompt } = await import("../catchup/EraCatchUpPrompt");
  harness = mount(
    <div className="city-shell">
      <div className="city-surface">
        <EraCatchUpPrompt
          eraId="prehistoric"
          position={1}
          total={2}
          forfeited={["neolithic"]}
          buildMode="learner_places"
          nextEra="neolithic"
          onChoose={() => undefined}
        />
      </div>
      <div
        className="surface-overlay surface-overlay--diagnostic"
        role="dialog"
        aria-modal="true"
      >
        <div className="surface-overlay-frame surface-overlay-frame--diagnostic">
          <header className="surface-overlay-head surface-overlay-head--diagnostic">
            <span className="surface-overlay-brand">Diagnostic</span>
            <button type="button" className="city-action">
              Back to city
            </button>
          </header>
          <div className="surface-overlay-body surface-overlay-body--diagnostic">
            <SessionProvider>
              <DiagnosticRunner />
            </SessionProvider>
          </div>
        </div>
      </div>
    </div>,
  );
  await reachResults(/Half right/);
  await waitFor(
    () => document.querySelector('[data-testid="catchup-prompt"]') !== null,
    "the catch-up prompt",
  );

  // ON TOP, where "on top" means the press lands on it. Both of the prompt's roads are
  // tested, because either one being swallowed by the results screen behind it is the defect.
  for (const road of ["keep_going", "stop_here"]) {
    const button = query<HTMLButtonElement>(`[data-testid="catchup-choose-${road}"]`);
    const box = button.getBoundingClientRect();
    const hit = document.elementFromPoint(
      Math.round(box.left + box.width / 2),
      Math.round(box.top + box.height / 2),
    );
    expect(
      button.contains(hit) || hit === button,
      `the results screen is in front of the ${road} road: the press would land on ${hit?.className}`,
    ).toBe(true);
    expect(box.bottom, `${road} is off a 580px screen`).toBeLessThanOrEqual(
      HIS_WINDOW.height,
    );
  }
  // And the results screen is still BEHIND it rather than gone, which is what makes this a
  // stacking claim and not a "the other surface unmounted" one.
  expect(document.querySelector(".dgx-results")).not.toBeNull();
  await shoot("catch-up-over-the-results-1024x580");
});
