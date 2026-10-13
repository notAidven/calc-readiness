import { useState } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { EconomyHud } from "../../economy/EconomyHud";
import { createInMemoryEconomyClient } from "../../economy/economySession";
import { useEconomy } from "../../economy/useEconomy";
import { type Harness, mount, waitFor } from "../../lessons/testHarness";
import { CitySurface } from "../CitySurface";
import { createCityDevSession } from "../citySession";
import { forgetCrisisBriefingRead } from "../crisisCall";
import { CURRENT_ERA_ID } from "../eraDressing";
import {
  FIRST_BUILDING_TASK,
  ONBOARDING_ADVISOR_DONE_KEY,
  ONBOARDING_ADVISOR_STEP_KEY,
  ONBOARDING_GATED_MOMENT,
  onboardingBriefingFor,
} from "./onboardingScript";
import { ONBOARDING_DEMO_SEEN_KEY } from "./useDemoScript";

import "../../styles.css";

/**
 * **THE INTRO ONBOARDING, PHOTOGRAPHED, at the product lead's own window.**
 *
 * His verdict on what shipped was *"it really doesn't explain what the game does and is awful
 * user experience"*, and the rebuild answering it is overwhelmingly a COMPREHENSION and VISUAL
 * claim. `.cursor/rules/qa-verification.mdc` decides what discharges one: a rendered frame
 * somebody LOOKED at, at a named viewport, framed to show the thing being claimed about AND
 * what is around it. So every moment is here, the spotlight is here over the control it lights
 * up with the whole screen around it, and the drag is here mid-gesture and finished.
 *
 * ## THE VIEWPORT IS HALF THE EVIDENCE, and it is 1024x580
 *
 * The lead reviews in a short window and the figure is sized in `vh`:
 * `clamp(148px, 44vh, 280px)` is 280px on a tall monitor and 255px here. A frame taken at
 * 1440x900 would make any overlay look roomy. Every frame is at his window and says so in its
 * own filename, and every one is under an emulated `prefers-reduced-motion: reduce`, which is
 * the harder case for a spotlight because it stands the ring's pulse down.
 *
 * ## AND THE FRAMES ARE THE WHOLE VIEWPORT, never a crop
 *
 * The subject is the SURFACE. *"Can you see the island"* and *"does that control stand out
 * from what is around it"* are both questions about the picture as a whole, and cropping to
 * the ring photographs the one part nobody doubted.
 *
 * ## WHAT IS ALWAYS ON, AND WHAT IS NOT
 *
 * The frames need `VITE_ONBOARDING_SHOTS=1`:
 *
 *   VITE_ONBOARDING_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/city/onboarding/onboardingAdvisorShots.browser.test.tsx
 *
 * A full shadow-mapped scene with seven GLBs is heavy, and a heavy scene left on in this suite
 * starves an animation-timing assertion in a different file rather than failing here.
 *
 * **Three claims survive in CI**, and each is the numeric half of something a frame shows: the
 * figure is drawn at crisis size, the ring really is over the control, and the control really
 * is IN FRONT of the bubble that would otherwise clip it. The last of those carries its own
 * negative control, because "the Build pill is on top" is worth nothing without "and here is
 * the frame where it is not".
 */

const SHOTS = Boolean(import.meta.env.VITE_ONBOARDING_SHOTS);

/** The lead's actual window. Short, which is where an overlay stops leaving room. */
const LEAD_WINDOW = { width: 1024, height: 580 } as const;
const PHONE_WINDOW = { width: 390, height: 580 } as const;

const MOMENTS = onboardingBriefingFor(CURRENT_ERA_ID, { bay: true }).moments;
// From the BAY-LESS sequence, not `ONBOARDING_MOMENT_ORDER`: every `openCity` call this
// constant feeds defaults `bay: false` (`options.bay ?? false`), and "bay" now sits ahead of
// "place" in the authored order, so the raw order's index and the bay-less walked sequence's
// index disagree by exactly one.
const GATED_STEP = onboardingBriefingFor(CURRENT_ERA_ID).moments.findIndex(
  (moment) => moment.id === ONBOARDING_GATED_MOMENT,
);

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
/** What the frames measured, accumulated so every line lands in one file. */
const measured: string[] = [];

function session() {
  return cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data?: string }>;
  };
}

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  await session().send("Emulation.setEmulatedMedia", { features: [] });
  vi.unstubAllEnvs();
  localStorage.clear();
  forgetCrisisBriefingRead();
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

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
 * CDP rather than `page.screenshot`, following `crisisAdvisorOverIsland`: the locator capture
 * runs actionability checks and never gets past "waiting for element to be stable" against a
 * canvas running `frameloop="always"`.
 */
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

async function keep(name: string, shot: string): Promise<void> {
  if (SHOTS) {
    await commands.writeFile(`docs/design-refs/onboarding-advisor/${name}.png`, shot, {
      encoding: "base64",
    });
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * A REAL MOUSE, through CDP, in the top-level page's coordinates.
 *
 * The board is driven by pointer events with pointer capture, and a synthesised
 * `new PointerEvent(...)` has no pointer id the browser will capture, so `setPointerCapture`
 * throws and the drag never leaves the tile. CDP's input is the same path a hand takes.
 */
async function mouse(type: string, x: number, y: number): Promise<void> {
  const frame = testViewportBox();
  await session().send("Input.dispatchMouseEvent", {
    type,
    x: frame.x + x,
    y: frame.y + y,
    button: "left",
    buttons: type === "mouseReleased" ? 0 : 1,
    clickCount: 1,
    pointerType: "mouse",
  });
}

/** The middle of an element, in this document's coordinates. */
function centreOf(selector: string): { x: number; y: number; box: DOMRect } {
  const found = document.querySelector(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}, so there is nothing to aim at`);
  }
  const box = found.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2, box };
}

function boxOf(selector: string): DOMRect {
  const found = document.querySelector(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}, so there is no box to measure`);
  }
  return found.getBoundingClientRect();
}

/** Every guided frame keeps its navigation and any required action inside the viewport. */
function expectCriticalControlsVisible(momentId: string): void {
  const slide = document.querySelector<HTMLElement>(".crisis-call-slide");
  if (!slide) {
    throw new Error(`${momentId}: the current onboarding slide is not mounted`);
  }
  expect(
    slide.scrollHeight,
    `${momentId}: the slide clips ${slide.scrollHeight - slide.clientHeight}px of its own content`,
  ).toBeLessThanOrEqual(slide.clientHeight + 1);

  const selectors = [
    '[data-testid="onboarding-advisor-back"]',
    '[data-testid="onboarding-advisor-next"]',
    '[data-testid="onboarding-advisor-skip"]',
  ];
  const action = document.querySelector(`[data-testid="onboarding-action-${momentId}"]`);
  if (action) {
    selectors.push(`[data-testid="onboarding-action-${momentId}"]`);
  }
  for (const selector of selectors) {
    const box = boxOf(selector);
    expect(box.width, `${momentId}: ${selector} has no visible width`).toBeGreaterThan(20);
    expect(box.height, `${momentId}: ${selector} has no visible height`).toBeGreaterThan(
      20,
    );
    expect(
      box.left,
      `${momentId}: ${selector} leaves the left edge`,
    ).toBeGreaterThanOrEqual(0);
    expect(box.right, `${momentId}: ${selector} leaves the right edge`).toBeLessThanOrEqual(
      window.innerWidth,
    );
    expect(box.top, `${momentId}: ${selector} leaves the top edge`).toBeGreaterThanOrEqual(
      0,
    );
    expect(
      box.bottom,
      `${momentId}: ${selector} leaves the bottom edge`,
    ).toBeLessThanOrEqual(window.innerHeight);
  }
}

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * **THE COMPOSITED FRAME AS PIXELS, so "which of these two things is in front" is answered by
 * what was PAINTED rather than by a stylesheet.**
 *
 * `elementFromPoint` was the obvious instrument and it is the wrong one here: a spotlit HUD
 * panel is deliberately given `pointer-events: none` so that raising it past an `aria-modal`
 * dialogue does not hand its buttons back their clicks, and hit testing skips exactly that.
 * It answered "the advisor's layer" over a Build pill that the screenshot beside it shows
 * sitting plainly on top.
 *
 * A z-index comparison would have been the next thing to reach for and it is a claim about
 * CSS, which `.cursor/rules/qa-verification.mdc` is explicit is not a claim about a frame. So
 * this decodes the frame that is being written to disk anyway and reads it.
 */
async function framePixels(): Promise<(x: number, y: number) => Rgb> {
  const shot = await capture();
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("the captured frame did not decode"));
    image.src = `data:image/png;base64,${shot}`;
  });
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("no 2d context, so the frame cannot be read");
  }
  context.drawImage(image, 0, 0);
  // The capture is clipped to this viewport at `scale: 1`, so the only thing that can put the
  // image and the layout on different scales is the device pixel ratio.
  const scale = image.naturalWidth / window.innerWidth;
  return (x: number, y: number) => {
    const [r, g, b] = context.getImageData(
      Math.round(x * scale),
      Math.round(y * scale),
      1,
      1,
    ).data;
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
  };
}

/** How far apart two painted colours are, as the largest per-channel difference. */
function apart(one: Rgb, other: Rgb): number {
  return Math.max(
    Math.abs(one.r - other.r),
    Math.abs(one.g - other.g),
    Math.abs(one.b - other.b),
  );
}

const rgb = (colour: Rgb) => `rgb(${colour.r}, ${colour.g}, ${colour.b})`;

/**
 * Every line measured so far, written beside the frames.
 *
 * Called at the end of each frame test rather than once at the end of the file: `afterAll`
 * runs after the last test either way, and a run cut short by one failing shot would otherwise
 * leave the frames it did take with no measurements against them at all.
 */
async function writeMeasurements(): Promise<void> {
  if (SHOTS) {
    await commands.writeFile(
      `docs/design-refs/onboarding-advisor/measured-${LEAD_WINDOW.width}x${LEAD_WINDOW.height}.txt`,
      [
        `Measured on the frames at ${LEAD_WINDOW.width}x${LEAD_WINDOW.height}, under an emulated`,
        "prefers-reduced-motion: reduce. Written by onboardingAdvisorShots.browser.test.tsx in",
        "the same run as the frames.",
        "",
        ...measured,
        "",
      ].join("\n"),
    );
  }
}

/**
 * The live city with the stockpile HUD beside it, which is `App`'s own composition.
 *
 * `EconomyHud` is a SIBLING of `CitySurface` in the real app, so a frame taken of
 * `CitySurface` alone has no stockpile in it, and the resources moment's whole job is to point
 * at one. The client is the in-memory adapter with no seed, so the counter reads what a
 * first-run learner's reads: zero.
 */
function CityWithStockpile({
  canvas,
  bay,
}: {
  readonly canvas: boolean;
  readonly bay: boolean;
}) {
  const economy = useEconomy(ECONOMY_CLIENT);
  const [city] = useState(() => createCityDevSession());
  return (
    <div className="city-shell">
      <CitySurface
        enableCanvas={canvas}
        enableOnboardingDemo
        bayAvailable={bay}
        loadCity={city.load}
        onPlaceSkill={city.placeSkill}
        onOpenSurface={() => undefined}
      />
      <EconomyHud economy={economy} reducedMotion />
    </div>
  );
}

const ECONOMY_CLIENT = createInMemoryEconomyClient(null);

/**
 * The live city, its canvas real, settled, with the tutorial in whatever state storage says.
 *
 * `flags` is written BEFORE the mount because every one of these gates is read as lazy initial
 * state or at the mount: that is the whole design of "never repeated", and it means the only
 * way to choose which surface comes up is to choose it before React runs.
 *
 * **The dev replay panel is stubbed off by default.** It is a large dark box in the top-right
 * corner and it is not the product; a review of what a learner meets should not have to look
 * past it. It gets a frame of its own at the end, with the stub lifted.
 */
async function openCity(
  flags: Record<string, string>,
  options: {
    readonly canvas?: boolean;
    readonly devPanel?: boolean;
    readonly bay?: boolean;
    readonly viewport?: { readonly width: number; readonly height: number };
  } = {},
): Promise<void> {
  const viewport = options.viewport ?? LEAD_WINDOW;
  await page.viewport(viewport.width, viewport.height);
  h?.cleanup();
  localStorage.clear();
  forgetCrisisBriefingRead();
  for (const [key, value] of Object.entries(flags)) {
    localStorage.setItem(key, value);
  }
  if (options.devPanel) {
    vi.unstubAllEnvs();
  } else {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "https://api.example.test");
  }
  // END TO END, not the `reducedMotion` prop: the crisis stage's rise, the advisor's own
  // breathing swing and the spotlight's pulse are stood down by a CSS media query, so
  // emulating the query is the only way to photograph what a learner with the preference set
  // actually sees.
  await session().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });

  const canvas = options.canvas ?? true;
  h = mount(<CityWithStockpile canvas={canvas} bay={options.bay ?? false} />);
  if (canvas) {
    await waitFor(
      () => document.querySelector(".city-viewport canvas") !== null,
      "the city canvas never mounted",
      30000,
    );
  }
  await waitFor(() => named("Menu") !== undefined, "the city's Menu button appears", 30000);
  await document.fonts.ready;
  if (canvas) {
    // The GLBs resolve behind their own Suspense boundaries, so a first frame is a bare
    // island. No renderer handle out here to count against, so this waits on the clock.
    await wait(3000);
    // A THROWAWAY CAPTURE, and it is load-bearing: a clipped capture puts a device-metrics
    // override on the page, which R3F reads as a resize and re-renders through. The frame that
    // comes back from the FIRST capture is the one drawn before any of that settled.
    await capture();
    await wait(800);
  }
}

/** How much of a figure is inside the window, as a line for the measurements file. */
function figureLine(label: string, figure: Element | null): string {
  const box = figure?.getBoundingClientRect();
  if (!box) {
    return `${label}: no figure drawn at all`;
  }
  const seen = Math.max(0, Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0));
  const share = (box.width * seen) / (window.innerWidth * window.innerHeight);
  return (
    `${label}: ${Math.round(box.width)}x${Math.round(box.height)}px, ` +
    `${Math.round(seen)}px of its height inside the ${window.innerWidth}x${window.innerHeight} ` +
    `window, top at y=${Math.round(box.top)}, covering ${(share * 100).toFixed(1)}% of the viewport`
  );
}

/* -------------------------------------------------------------------------- */
/* Always on: he is drawn at crisis size, not at caption size                   */
/* -------------------------------------------------------------------------- */

/**
 * **THE NUMBERS BEHIND THE FRAMES, measured in a real browser with the real stylesheet.**
 *
 * Deliberately a comparison rather than a threshold. A pinned pixel count would be a claim
 * about CSS at one viewport and would go stale the first time the clamp moved; *"the same box
 * the crisis gives him"* is the claim the lead actually made, and it stays true through a
 * retune because both surfaces move together.
 *
 * The reel's caption figure is measured beside them as the FLOOR, because "large" is
 * meaningless without the small thing it is being contrasted with.
 */
test("draws the advisor at the crisis figure's size, and far larger than the reel's caption", async () => {
  await page.viewport(LEAD_WINDOW.width, LEAD_WINDOW.height);

  const boxOf = (selector: string): DOMRect => {
    const found = document.querySelector(selector);
    if (!found) {
      throw new Error(`nothing matched ${selector}, so there is no box to measure`);
    }
    return found.getBoundingClientRect();
  };

  // ONBOARDING, mounted without the canvas: this test is about the overlay's own box, and the
  // island is the frames' subject rather than this one's.
  h?.cleanup();
  localStorage.clear();
  const { OnboardingAdvisor } = await import("./OnboardingAdvisor");
  h = mount(<OnboardingAdvisor eraId={CURRENT_ERA_ID} onDone={() => undefined} />);
  await waitFor(
    () => document.querySelector('[data-testid="onboarding-advisor"]') !== null,
    "the onboarding advisor never mounted",
  );
  const onboarding = boxOf(".crisis-call-speech__figure");
  const onboardingBubble = boxOf(".crisis-call-speech__bubble");

  // THE CRISIS, the surface the lead pointed at, at the same viewport in the same run.
  h?.cleanup();
  const { CrisisCallAdvisor } = await import("../CrisisCallAdvisor");
  const { crisisBriefingForCity } = await import("../crisisCall");
  const briefing = crisisBriefingForCity(CURRENT_ERA_ID);
  if (briefing === null) {
    throw new Error(
      "era one has no crisis briefing, so there is nothing to compare against",
    );
  }
  h = mount(
    <CrisisCallAdvisor
      briefing={briefing}
      onFace={() => undefined}
      onLater={() => undefined}
    />,
  );
  await waitFor(
    () => document.querySelector('[data-testid="crisis-call-advisor"]') !== null,
    "the crisis advisor never mounted",
  );
  const crisis = boxOf(".crisis-call-speech__figure");

  // THE REEL's caption figure, which is the register being replaced.
  h?.cleanup();
  const { DemoReel } = await import("./DemoReel");
  h = mount(<DemoReel enableCanvas={false} reducedMotion onDone={() => undefined} />);
  await waitFor(
    () => document.querySelector(".demo-reel__advisor") !== null,
    "the reel's caption advisor never mounted",
  );
  const reel = boxOf(".demo-reel__advisor");

  // A FLOOR FIRST: every ratio below is satisfied by two zeroes.
  expect(onboarding.width, "the onboarding figure has no width").toBeGreaterThan(100);
  expect(crisis.width, "the crisis figure has no width").toBeGreaterThan(100);
  expect(reel.width, "the reel figure has no width").toBeGreaterThan(20);

  // THE CLAIM: the same box, because it is the same stylesheet through the same components.
  expect(Math.round(onboarding.width)).toBe(Math.round(crisis.width));
  expect(Math.round(onboarding.height)).toBe(Math.round(crisis.height));
  // AND A DIFFERENT REGISTER FROM THE CAPTION BAR, by a wide margin rather than by a nudge.
  expect(onboarding.width / reel.width).toBeGreaterThan(1.8);
  // The bubble is beside him and takes the rest of the width, so the assembly really is the
  // "large portion of the screen" the ruling is about rather than a tall thin figure.
  expect((onboarding.width + onboardingBubble.width) / window.innerWidth).toBeGreaterThan(
    0.6,
  );

  const line = (label: string, box: DOMRect) =>
    `${label}: ${Math.round(box.width)}x${Math.round(box.height)}px, ` +
    `covering ${(((box.width * box.height) / (window.innerWidth * window.innerHeight)) * 100).toFixed(1)}% ` +
    `of the ${window.innerWidth}x${window.innerHeight} window`;
  measured.push(
    line("BEFORE, the reel's caption figure", reel),
    line("the crisis figure, which is the register asked for", crisis),
    line("AFTER, the onboarding figure", onboarding),
    `the onboarding figure is ${(onboarding.width / reel.width).toFixed(1)}x the reel caption's width, ` +
      `and figure plus bubble span ${Math.round(((onboarding.width + onboardingBubble.width) / window.innerWidth) * 100)}% of the window's width`,
  );
}, 120000);

/* -------------------------------------------------------------------------- */
/* Always on: the ring is over the control, and the control is in FRONT        */
/* -------------------------------------------------------------------------- */

/**
 * **THE SPOTLIGHT'S TWO CLAIMS, MEASURED OFF THE PAINTED FRAME, with the second carrying its
 * own permanent negative control.**
 *
 * The frames below show a ring round the Build pill. A ring is worth nothing if the pill is
 * behind the speech bubble that is talking about it, and that is not a hypothetical: the
 * bubble is `min(900px, 100%)` wide at `z-index: 30` over a `z-index: 5` HUD, and
 * `docs/design-refs/onboarding-advisor/README.md` recorded it clipping this exact control
 * before this pass.
 *
 * ## Two sample points on the pill, and neither colour is written down
 *
 * At the same height inside the Build pill: one point at its MIDDLE, which the bubble covers,
 * and one near its RIGHT END, which is clear of the bubble. Both facts are asserted against
 * the two rects rather than assumed, so the day the bubble's width changes this says so
 * instead of quietly measuring two uncovered points.
 *
 * The pill is a vertical gradient, so at one height its own colour is the same across its
 * width. That is what makes the clear point a reference for what the covered point OUGHT to
 * read once the panel is lifted, with no hex value pinned anywhere: the claim is *"these two
 * points are the same colour"* rather than *"this point is gold"*.
 *
 * ## The negative control is the moment before, and it is permanent
 *
 * `.cursor/rules/qa-verification.mdc`: an assertion that passes because nothing was ever in
 * the way looks exactly like one that passes because the fix works. So the moment before the
 * Build moment is measured first, at the same viewport with the same bubble over the same
 * pill and no lift, and the two points there have to DISAGREE. If the bubble ever stops
 * reaching the pill, this fails rather than the lift silently becoming decoration.
 *
 * `elementFromPoint` was the obvious instrument and it is the wrong one; {@link framePixels}
 * says why.
 */
test("puts the ring over the Build pill and paints the pill in front of the bubble", async () => {
  await openCity(
    { [ONBOARDING_ADVISOR_STEP_KEY]: String(buildStep() - 1) },
    { canvas: false },
  );

  const pill = boxOf(".city-build-button");
  const bubble = boxOf(".crisis-call-speech__bubble");
  /*
    BOTH POINTS AT THE PILL'S VERTICAL CENTRE, where its shape is full width rather than
    curving, and both inside its 26px horizontal padding, where its fill is a plain vertical
    gradient with no glyph over it. The bubble only overlaps the pill's LEADING edge — it runs
    to about x=915 against a pill starting near x=878 — so the covered point is 18px in from
    the pill's left and the clear reference is 14px in from its right.
  */
  const y = pill.top + pill.height / 2;
  const covered = { x: pill.left + 18, y };
  const clear = { x: pill.right - 14, y };
  const insideBubble = (point: { x: number; y: number }) =>
    point.x >= bubble.left &&
    point.x <= bubble.right &&
    point.y >= bubble.top &&
    point.y <= bubble.bottom;
  expect(
    Math.round(bubble.right - pill.left),
    `the bubble overlaps the Build pill by ${Math.round(bubble.right - pill.left)}px, which is too little to sample inside`,
  ).toBeGreaterThan(24);
  expect(
    insideBubble(covered),
    `the bubble does not reach into the Build pill at ${LEAD_WINDOW.width}x${LEAD_WINDOW.height}, so there is no occlusion to fix`,
  ).toBe(true);
  expect(
    insideBubble(clear),
    "the bubble covers the whole pill, so there is no uncovered reference point on it",
  ).toBe(false);
  expect(document.querySelector('[data-testid="onboarding-spotlight"]')).toBeNull();

  // THE NEGATIVE CONTROL: unlit, the two points are different colours, because one of them is
  // a speech bubble.
  const before = await framePixels();
  const beforeCovered = before(covered.x, covered.y);
  const beforeClear = before(clear.x, clear.y);
  expect(
    apart(beforeCovered, beforeClear),
    `unlit, the middle of the pill paints ${rgb(beforeCovered)} and its clear end paints ${rgb(beforeClear)}: nothing is covering it`,
  ).toBeGreaterThan(40);

  // Forward to the moment that names the Build menu.
  document
    .querySelector<HTMLButtonElement>('[data-testid="onboarding-advisor-next"]')
    ?.click();
  await waitFor(
    () => document.querySelector('[data-testid="onboarding-spotlight"]') !== null,
    "the spotlight never appeared on the buildings moment",
  );
  await wait(250);

  const ring = boxOf('[data-testid="onboarding-spotlight"]');
  // ONE: the ring frames the control rather than sitting somewhere near it...
  expect(ring.left).toBeLessThanOrEqual(pill.left);
  expect(ring.right).toBeGreaterThanOrEqual(pill.right);
  expect(ring.top).toBeLessThanOrEqual(pill.top);
  expect(ring.bottom).toBeGreaterThanOrEqual(pill.bottom);
  // ...and is not simply the whole screen, which would contain everything.
  expect(ring.width).toBeLessThan(window.innerWidth / 2);

  // TWO: the pill is now PAINTED where the bubble used to be, so the ring is round a control
  // and not round a speech bubble.
  const after = await framePixels();
  const afterCovered = after(covered.x, covered.y);
  const afterClear = after(clear.x, clear.y);
  expect(
    apart(afterCovered, afterClear),
    `lit, the middle of the pill paints ${rgb(afterCovered)} against ${rgb(afterClear)} at its clear end, so the bubble is still in front of it`,
  ).toBeLessThan(12);

  measured.push(
    `the Build pill: ${Math.round(pill.width)}x${Math.round(pill.height)}px at ` +
      `x=${Math.round(pill.left)}, y=${Math.round(pill.top)}, with the bubble ending at x=${Math.round(bubble.right)}`,
    `the ring round it: ${Math.round(ring.width)}x${Math.round(ring.height)}px at ` +
      `x=${Math.round(ring.left)}, y=${Math.round(ring.top)}`,
    `painted at the pill's middle: ${rgb(beforeCovered)} unlit, ${rgb(afterCovered)} lit, ` +
      `against ${rgb(afterClear)} at the end of the pill the bubble never reaches`,
  );
  // PUSHED, NOT WRITTEN. `measured` is accumulated across the file and flushed by the frame
  // tests, which are behind the shot flag; writing from an always-on test would have CI
  // modifying a tracked file, which `test/testWritesStayOutOfTheTree.test.ts` refuses. The
  // frame tests are declared after this one, so a shot run still carries these lines.
}, 120000);

/* -------------------------------------------------------------------------- */
/* Always on: the real placement, with a real pointer on the real controls     */
/* -------------------------------------------------------------------------- */

/**
 * **THE PLACEMENT, DRIVEN BY A REAL POINTER ON THE CITY'S OWN CONTROLS.**
 *
 * The product lead: *"they should actually have to place the building and not just place a
 * house into a 2d box."* This is that claim, and a real browser is the only place it can be
 * made, for a reason that is not merely thoroughness:
 *
 * **The Build pill is inside a HUD panel the spotlight LIFTS above the advisor's stage, and a
 * lifted panel's children normally carry `pointer-events: none`** so that raising them past an
 * `aria-modal` dialogue does not hand their buttons back the clicks the dialogue is holding.
 * On this one moment the stage has stood down and the pill must be pressable. That is a claim
 * about hit testing under a stylesheet, so jsdom — which has neither layout nor a cascade that
 * reaches this — cannot see it at all. The node suite drives the same flow through the panel's
 * own shortcut and would stay green with the pill dead.
 *
 * So this presses the pill itself, at its painted centre, through CDP. Every control it
 * touches afterwards belongs to `CitySurface`: a card in the real Build menu, and the real
 * confirm bar. Nothing in the tutorial is pressed at all.
 */
test("places a building on the real island, through the real Build menu", async () => {
  await openCity({ [ONBOARDING_ADVISOR_STEP_KEY]: String(GATED_STEP) }, { canvas: false });
  await waitFor(
    () => document.querySelector('[data-testid="ob-task"]') !== null,
    "the placement moment never opened",
  );

  const status = () =>
    document.querySelector('[data-testid="ob-task-status"]')?.textContent?.trim();
  const gate = () =>
    document
      .querySelector('[data-testid="onboarding-advisor-next"]')
      ?.getAttribute("aria-disabled");

  // THE GATE IS SHUT, AND THE RETIRED BOARD IS NOT ON SCREEN TO OPEN IT.
  expect(gate()).toBe("true");
  expect(document.querySelector('[data-testid="ob-place-house"]')).toBeNull();
  expect(status()).toBe(FIRST_BUILDING_TASK.prompt);
  // AND THE STAGE HAS HANDED THE SCREEN BACK, which is what makes the rest of this possible.
  expect(
    document.querySelector('[data-testid="onboarding-advisor"]')?.getAttribute("role"),
  ).toBe("group");

  /*
    ⚑ AND THE PANEL IS NOT HIDING ITS OWN INSTRUCTIONS, which is a defect a passing DOM test
    cannot see and a frame showed at once.

    `.crisis-call-slide` is the walkthrough's scrolling row, so a stood-down panel with more
    content than corner does not spill and does not complain: it clips, in the MIDDLE, leaving
    the stepper visible underneath. Photographed before this was fixed, the shortcut button and
    the entire status line were below the fold, so the one frame that tells a learner what to
    do next drew neither of them and every jsdom assertion about both was green.
  */
  const slide = document.querySelector(".crisis-call-slide");
  if (!slide) {
    throw new Error("the walkthrough's scrolling row is not on screen");
  }
  expect(
    slide.scrollHeight,
    `the stood-down panel is clipping ${slide.scrollHeight - slide.clientHeight}px of itself, ` +
      "so part of what it says is off the bottom of the bubble",
  ).toBeLessThanOrEqual(slide.clientHeight + 1);
  const shortcut = boxOf('[data-testid="ob-task-open-build"]');
  const statusLine = boxOf('[data-testid="ob-task-status"]');
  const said = boxOf(".crisis-call-speech__said");
  expect(shortcut.height).toBeGreaterThan(20);
  expect(statusLine.height).toBeGreaterThan(10);
  expect(
    statusLine.bottom,
    "the status line is drawn below the bubble",
  ).toBeLessThanOrEqual(said.bottom + 1);

  // ONE: the real Build pill, at its painted centre, with the ring round it.
  const pill = centreOf(".city-build-button");
  await mouse("mousePressed", pill.x, pill.y);
  await mouse("mouseReleased", pill.x, pill.y);
  await waitFor(
    () => document.querySelector(".build-shop") !== null,
    "pressing the ringed Build pill did not open the Build menu, so the lift took its clicks",
  );

  // TWO: a card in the real menu.
  const card = centreOf(".build-card:not([data-built]):not([data-locked]) .build-card-cta");
  await mouse("mousePressed", card.x, card.y);
  await mouse("mouseReleased", card.x, card.y);
  await waitFor(
    () => document.querySelector(".city-placement") !== null,
    "choosing a card never produced a ghost on the island",
  );
  expect(status()).toBe(FIRST_BUILDING_TASK.positioning);

  // AND THE CONFIRM BAR IS CLEAR OF HIM. It is `z-index: 5` against the stage's 30, so
  // without the lift `firstBuildingTask.css` gives it, the one button that finishes a
  // placement would be painted behind the panel telling the learner to press it.
  const bar = boxOf(".city-placement");
  const bubble = boxOf(".crisis-call-speech__bubble");
  const overlaps =
    bar.left < bubble.right &&
    bar.right > bubble.left &&
    bar.top < bubble.bottom &&
    bar.bottom > bubble.top;
  expect(
    overlaps,
    `the confirm bar (${Math.round(bar.left)}..${Math.round(bar.right)} x ${Math.round(bar.top)}..${Math.round(bar.bottom)}) ` +
      `runs under his bubble (${Math.round(bubble.left)}..${Math.round(bubble.right)} x ${Math.round(bubble.top)}..${Math.round(bubble.bottom)})`,
  ).toBe(false);

  // THREE: confirm it, on the city's own bar.
  const confirm = centreOf(".city-placement-actions .city-action-primary");
  await mouse("mousePressed", confirm.x, confirm.y);
  await mouse("mouseReleased", confirm.x, confirm.y);
  await waitFor(() => gate() === "false", "the gate never opened on a real placement");
  expect(status()).toBe(FIRST_BUILDING_TASK.done);
  // AND HE HAS THE SCREEN BACK, because there is nothing left to reach past him.
  expect(
    document.querySelector('[data-testid="onboarding-advisor"]')?.getAttribute("role"),
  ).toBe("dialog");
  // WAITED FOR, not read. `role` is render output and flips in the commit; the attribute on
  // <body> is a passive effect's cleanup and flushes after it, so reading the two in one tick
  // caught the frame between them.
  await waitFor(
    () => document.body.getAttribute("data-ob-stand-down") === null,
    "the confirm bar was left lifted after the placement finished",
  );
}, 120000);

/** The index of the moment that lights the Build menu up. */
function buildStep(): number {
  const index = MOMENTS.findIndex((moment) => moment.spotlight === "build");
  if (index < 1) {
    throw new Error("no moment after the first lights the Build menu up");
  }
  return index;
}

/* -------------------------------------------------------------------------- */
/* The frames                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * BEFORE: the `place` coach-mark, which is what a learner who SKIPS still gets.
 *
 * Both onboarding flags set, so nothing takes over the island and the hint layer runs. Not a
 * reconstruction: it is live code, unchanged by this branch, and it is the register the whole
 * advisor sequence was built to replace.
 */
test.runIf(SHOTS)(
  "photographs the opening coach-mark tooltip",
  async () => {
    await openCity({
      [ONBOARDING_ADVISOR_DONE_KEY]: "true",
      [ONBOARDING_DEMO_SEEN_KEY]: "true",
    });
    await waitFor(
      () => document.querySelector("[data-coach-mark]") !== null,
      "no opening coach-mark appeared at all",
    );
    await document.fonts.ready;
    await wait(700);

    const tip = document.querySelector<HTMLElement>("[data-coach-mark]");
    const id = tip?.dataset.coachMark ?? "none";
    const box = tip?.getBoundingClientRect();
    expect(id).toBe("place");
    measured.push(
      `BEFORE, the "${id}" coach-mark: ${Math.round(box?.width ?? 0)}x${Math.round(box?.height ?? 0)}px, ` +
        `covering ${((((box?.width ?? 0) * (box?.height ?? 0)) / (window.innerWidth * window.innerHeight)) * 100).toFixed(1)}% ` +
        `of the ${window.innerWidth}x${window.innerHeight} window, and all it says is: ` +
        `${tip?.querySelector(".coach-mark__text")?.textContent?.trim()}`,
    );
    await keep(
      `before-02-coach-mark-${id}-${LEAD_WINDOW.width}x${LEAD_WINDOW.height}`,
      await capture(),
    );
    await writeMeasurements();
  },
  180000,
);

/**
 * AFTER: one frame per moment, over the live island, with the ring on the control it names.
 *
 * Derived from the moment table rather than written out, so an eleventh moment joins the shot
 * list with no edit here. Each one is opened at its own step through the stored step rather
 * than by pressing Next repeatedly, which is the dev control's own route and is also the only
 * way to reach a frame past the placement gate without performing the gesture.
 */
for (const [index, moment] of MOMENTS.entries()) {
  test.runIf(SHOTS)(
    `photographs the "${moment.id}" moment over the live island`,
    async () => {
      await openCity(
        { [ONBOARDING_ADVISOR_STEP_KEY]: String(index) },
        { bay: moment.id === "bay" },
      );
      await waitFor(
        () => document.querySelector('[data-testid="onboarding-advisor"]') !== null,
        "the onboarding advisor never opened",
      );
      // THE FRAME IS OF THE MOMENT IT CLAIMS TO BE OF, read off the rendered section rather
      // than off the number of times anything was pressed.
      expect(
        document.querySelector<HTMLElement>('[data-testid="onboarding-advisor-moment"]')
          ?.dataset.moment,
      ).toBe(moment.id);
      // And he is in this era's clothes, which is the other thing a frame can silently be
      // wrong about.
      expect(
        document.querySelector<HTMLElement>(".crisis-call-speech .oru-advisor")?.dataset
          .dress,
      ).toBe(CURRENT_ERA_ID);
      await document.fonts.ready;
      await wait(900);
      expectCriticalControlsVisible(moment.id);

      const ring = document
        .querySelector('[data-testid="onboarding-spotlight"]')
        ?.getBoundingClientRect();
      if (index === 0) {
        measured.push(
          figureLine(
            "the advisor on the opening frame",
            document.querySelector(".crisis-call-speech__figure"),
          ),
        );
      }
      measured.push(
        `moment ${index + 1} (${moment.id}): ` +
          (moment.spotlight === null
            ? "no control named, so no ring"
            : ring
              ? `ring on "${moment.spotlight}", ${Math.round(ring.width)}x${Math.round(ring.height)}px at x=${Math.round(ring.left)}, y=${Math.round(ring.top)}`
              : `names "${moment.spotlight}" and NO RING WAS DRAWN`),
      );
      await keep(
        `after-${String(index + 1).padStart(2, "0")}-moment-${moment.id}-${LEAD_WINDOW.width}x${LEAD_WINDOW.height}`,
        await capture(),
      );
      await writeMeasurements();
    },
    180000,
  );
}

for (const [index, moment] of MOMENTS.entries()) {
  test.runIf(SHOTS)(
    `photographs the "${moment.id}" moment over the live island at 390x580`,
    async () => {
      await openCity(
        { [ONBOARDING_ADVISOR_STEP_KEY]: String(index) },
        { bay: moment.id === "bay", viewport: PHONE_WINDOW },
      );
      await waitFor(
        () => document.querySelector('[data-testid="onboarding-advisor"]') !== null,
        "the onboarding advisor never opened",
      );
      expect(
        document.querySelector<HTMLElement>('[data-testid="onboarding-advisor-moment"]')
          ?.dataset.moment,
      ).toBe(moment.id);
      await document.fonts.ready;
      await wait(900);
      expectCriticalControlsVisible(moment.id);
      await keep(
        `after-phone-${String(index + 1).padStart(2, "0")}-moment-${moment.id}-${PHONE_WINDOW.width}x${PHONE_WINDOW.height}`,
        await capture(),
      );
    },
    180000,
  );
}

for (const viewport of [LEAD_WINDOW, PHONE_WINDOW] as const) {
  test.runIf(SHOTS)(
    `photographs the Bay handoff and return at ${viewport.width}x${viewport.height}`,
    async () => {
      const bayStep = MOMENTS.findIndex((moment) => moment.id === "bay");
      expect(bayStep, "the Bay is not in the guided tour").toBeGreaterThanOrEqual(0);
      await openCity(
        { [ONBOARDING_ADVISOR_STEP_KEY]: String(bayStep) },
        { bay: true, viewport },
      );
      await waitFor(
        () => document.querySelector('[data-testid="onboarding-action-bay"]') !== null,
        "the guided Bay action never appeared",
      );
      document
        .querySelector<HTMLButtonElement>('[data-testid="onboarding-action-bay"]')
        ?.click();
      await waitFor(
        () => document.querySelector('[data-testid="archipelago-overview"]') !== null,
        "the real Bay never mounted",
      );
      await document.fonts.ready;
      await wait(1200);
      const returnControl = named("Return to tour")?.getBoundingClientRect();
      expect(
        returnControl?.width ?? 0,
        "the Bay return control has no visible width",
      ).toBeGreaterThan(80);
      expect(
        returnControl?.right ?? Number.POSITIVE_INFINITY,
        "the Bay return control leaves the viewport",
      ).toBeLessThanOrEqual(window.innerWidth);
      await keep(
        `after-bay-01-handoff-${viewport.width}x${viewport.height}`,
        await capture(),
      );

      named(/Next island/)?.click();
      await waitFor(
        () =>
          document
            .querySelector('[data-testid="archipelago-overview"]')
            ?.getAttribute("data-selected-era") === "neolithic",
        "the Bay did not navigate to the locked future island",
      );
      await wait(900);
      await keep(
        `after-bay-02-locked-future-${viewport.width}x${viewport.height}`,
        await capture(),
      );

      named("Return to tour")?.click();
      await waitFor(
        () =>
          document.querySelector('[data-testid="archipelago-overview"]') === null &&
          document
            .querySelector('[data-testid="onboarding-advisor-moment"]')
            ?.getAttribute("data-moment") === "bay",
        "the Bay did not return to the suspended tour",
      );
      await wait(700);
      await keep(
        `after-bay-03-resumed-${viewport.width}x${viewport.height}`,
        await capture(),
      );
    },
    180000,
  );
}

/**
 * **THE PLACEMENT, PHOTOGRAPHED AT EVERY STEP OF THE REAL FLOW, over the real island.**
 *
 * *"They should actually have to place the building and not just drag a house into a 2d box."*
 * That is a claim about what a learner is looking at, so it owes frames of the learner doing
 * it, taken at the lead's own window with the whole viewport in shot rather than cropped to
 * the thing that changed.
 *
 * Four frames, and the third is the one the ask turns on: a ghost on the actual island with
 * the actual confirm bar under it, the advisor stood down beside it, and enough of the city
 * around both to see that neither is covering the other.
 */
test.runIf(SHOTS)(
  "photographs the whole real placement, over the live island",
  async () => {
    await openCity({ [ONBOARDING_ADVISOR_STEP_KEY]: String(GATED_STEP) });
    await waitFor(
      () => document.querySelector('[data-testid="ob-task"]') !== null,
      "the placement moment never opened",
    );
    await document.fonts.ready;
    await wait(900);

    const speech = boxOf(".crisis-call-speech");
    const pillBox = boxOf(".city-build-button");
    const vitality = boxOf('[data-testid="city-vitality"]');
    measured.push(
      `the stood-down advisor: ${Math.round(speech.width)}x${Math.round(speech.height)}px at ` +
        `x=${Math.round(speech.left)}, y=${Math.round(speech.top)}, covering ` +
        `${(((speech.width * speech.height) / (window.innerWidth * window.innerHeight)) * 100).toFixed(1)}% ` +
        `of the ${window.innerWidth}x${window.innerHeight} window, with the Build pill it rings ` +
        `at x=${Math.round(pillBox.left)}, y=${Math.round(pillBox.top)}`,
      // The panel he has to fit UNDER, recorded beside his own box so the corner he is sized
      // to is a number somebody can check rather than a claim in a stylesheet comment.
      `the City life panel above him ends at y=${Math.round(vitality.bottom)}, and his bubble ` +
        `starts at y=${Math.round(boxOf(".crisis-call-speech__bubble").top)}`,
    );
    // ONE: his turn, the ring on the pill, the island in view and the screen handed back.
    await keep(
      `after-11-place-01-your-turn-${LEAD_WINDOW.width}x${LEAD_WINDOW.height}`,
      await capture(),
    );

    // TWO: the real Build menu, opened by pressing the real pill.
    const pill = centreOf(".city-build-button");
    await mouse("mousePressed", pill.x, pill.y);
    await mouse("mouseReleased", pill.x, pill.y);
    await waitFor(
      () => document.querySelector(".build-shop") !== null,
      "pressing the ringed Build pill did not open the Build menu",
    );
    await wait(500);
    await keep(
      `after-11-place-02-build-menu-${LEAD_WINDOW.width}x${LEAD_WINDOW.height}`,
      await capture(),
    );

    // THREE: the ghost on the island, the confirm bar under it, and him beside them. This is
    // the frame the whole change is for.
    const card = centreOf(
      ".build-card:not([data-built]):not([data-locked]) .build-card-cta",
    );
    await mouse("mousePressed", card.x, card.y);
    await mouse("mouseReleased", card.x, card.y);
    await waitFor(
      () => document.querySelector(".city-placement") !== null,
      "choosing a card never produced a ghost on the island",
    );
    await wait(900);
    const bar = boxOf(".city-placement");
    const bubble = boxOf(".crisis-call-speech__bubble");
    measured.push(
      `the confirm bar on the island: ${Math.round(bar.width)}x${Math.round(bar.height)}px at ` +
        `x=${Math.round(bar.left)}, y=${Math.round(bar.top)}, against his bubble at ` +
        `x=${Math.round(bubble.left)}..${Math.round(bubble.right)}, y=${Math.round(bubble.top)}..${Math.round(bubble.bottom)}`,
    );
    await keep(
      `after-11-place-03-aiming-${LEAD_WINDOW.width}x${LEAD_WINDOW.height}`,
      await capture(),
    );

    // FOUR: confirmed. The building is on the island, the gate is open, and he has the screen.
    const confirm = centreOf(".city-placement-actions .city-action-primary");
    await mouse("mousePressed", confirm.x, confirm.y);
    await mouse("mouseReleased", confirm.x, confirm.y);
    await waitFor(
      () =>
        document
          .querySelector('[data-testid="onboarding-advisor-next"]')
          ?.getAttribute("aria-disabled") === "false",
      "the gate never opened on a real placement",
    );
    await wait(900);
    measured.push(
      "after the real placement the status line reads: " +
        `${document.querySelector('[data-testid="ob-task-status"]')?.textContent?.trim()}`,
    );
    await keep(
      `after-11-place-04-placed-${LEAD_WINDOW.width}x${LEAD_WINDOW.height}`,
      await capture(),
    );
    await writeMeasurements();
  },
  180000,
);

/**
 * THE GATE HELD, and the way past it, in one frame.
 *
 * Next pressed with nothing placed: the status line says what is owed and the tray offers to
 * do it. Whether that reads as a dead end or as a door is exactly the kind of question only a
 * frame answers.
 */
test.runIf(SHOTS)(
  "photographs the gated Next, pressed too early",
  async () => {
    await openCity({ [ONBOARDING_ADVISOR_STEP_KEY]: String(GATED_STEP) });
    await waitFor(
      () => document.querySelector('[data-testid="ob-task"]') !== null,
      "the placement moment never opened",
    );
    document
      .querySelector<HTMLButtonElement>('[data-testid="onboarding-advisor-next"]')
      ?.click();
    await waitFor(
      () =>
        document
          .querySelector('[data-testid="ob-task-status"]')
          ?.getAttribute("data-state") === "wrong",
      "the gated Next said nothing",
    );
    await document.fonts.ready;
    await wait(700);
    expect(
      document.querySelector('[data-testid="onboarding-advisor-place-for-me"]'),
      "there is no way past the gate on screen",
    ).not.toBeNull();
    await keep(
      `after-13-gate-held-${LEAD_WINDOW.width}x${LEAD_WINDOW.height}`,
      await capture(),
    );
    await writeMeasurements();
  },
  180000,
);

/**
 * AND THE DEV CONTROL, over the island it covers.
 *
 * It is the one panel in these frames that is not the product, which is why every other frame
 * is taken with it stubbed off. Whether it reads as scaffolding at a glance and whether it
 * clears the ☰ Menu are both answerable only by looking.
 */
test.runIf(SHOTS)(
  "photographs the dev replay control over the live city",
  async () => {
    await openCity(
      {
        [ONBOARDING_ADVISOR_DONE_KEY]: "true",
        [ONBOARDING_DEMO_SEEN_KEY]: "true",
      },
      { devPanel: true },
    );
    await waitFor(
      () => document.querySelector('[data-testid="ob-dev-replay"]') !== null,
      "the dev replay control never appeared",
    );
    await document.fonts.ready;
    await wait(700);

    // MEASURED AGAINST THE CORNER IT WAS PLACED TO CLEAR, so the frame is read beside a number.
    const panel = document
      .querySelector('[data-testid="ob-dev-replay"]')
      ?.getBoundingClientRect();
    const menu = named("Menu")?.getBoundingClientRect();
    const clears =
      panel && menu ? panel.top >= menu.bottom || panel.left >= menu.right : false;
    measured.push(
      `the dev replay panel: ${Math.round(panel?.width ?? 0)}x${Math.round(panel?.height ?? 0)}px ` +
        `at y=${Math.round(panel?.top ?? 0)}, with the Menu button ending at y=${Math.round(menu?.bottom ?? 0)}: ` +
        `${clears ? "clears it" : "OVERLAPS IT"}`,
    );
    await keep(
      `after-99-dev-replay-${LEAD_WINDOW.width}x${LEAD_WINDOW.height}`,
      await capture(),
    );
    await writeMeasurements();
  },
  180000,
);
