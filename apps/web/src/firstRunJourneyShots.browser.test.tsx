import { useState } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { AccountBoundary } from "./auth/AccountBoundary";
import type { CognitoAuthService } from "./auth/cognitoClient";
import { CitySurface } from "./city/CitySurface";
import { createCityDevSession } from "./city/citySession";
import { forgetCrisisBriefingRead } from "./city/crisisCall";
import { CURRENT_ERA_ID } from "./city/eraDressing";
import {
  ONBOARDING_ADVISOR_DONE_KEY,
  ONBOARDING_ADVISOR_STEP_KEY,
  ONBOARDING_MOMENT_ORDER,
  onboardingBriefingFor,
} from "./city/onboarding/onboardingScript";
import { ONBOARDING_DEMO_SEEN_KEY } from "./city/onboarding/useDemoScript";
import { EconomyHud } from "./economy/EconomyHud";
import { createInMemoryEconomyClient } from "./economy/economySession";
import { useEconomy } from "./economy/useEconomy";
import { type Harness, mount, waitFor } from "./lessons/testHarness";
import type { AccountRuntimeConfig } from "./runtimeMode";
import { TitleScreen } from "./TitleScreen";

import "./styles.css";

/**
 * **THE FIRST-RUN JOURNEY, PHOTOGRAPHED, AT TWO REAL WINDOWS.**
 *
 * Account entry, the start choice, and the tour beats a learner meets are all COMPREHENSION
 * and SPATIAL claims: does the screen say what it is, is the action we recommend visible
 * without scrolling, and can you still see the island the advisor is standing on.
 * `.cursor/rules/qa-verification.mdc` decides what discharges one of those, and a computed box
 * is not it — the evidence is a rendered frame somebody LOOKED at, at a named viewport, framed
 * to show the surface rather than cropped to the component nobody doubted.
 *
 * ## THE TWO WINDOWS, AND WHY THEY ARE THESE TWO
 *
 * `1024x580` is the product lead's own review window, and it is short, which is where an
 * overlay stops leaving room. `390x580` is a phone, and it is the case a two-route choice
 * screen is most likely to lose: a second route pushed under the fold reads as "there is only
 * one way in". Both are stated in every filename, because a frame whose viewport is unnamed
 * says nothing about anybody's screen.
 *
 * Every frame is under an emulated `prefers-reduced-motion: reduce`, and every frame is the
 * WHOLE viewport.
 *
 * ## WHAT SURVIVES IN CI
 *
 * The frames need `VITE_FIRST_RUN_SHOTS=1`, following `onboardingAdvisorShots.browser.test.tsx`:
 *
 *   VITE_FIRST_RUN_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/firstRunJourneyShots.browser.test.tsx
 *
 * What runs every time is the numeric half of the same claim, which a picture cannot assert
 * and which is the half that regresses silently: at BOTH windows, every route out of these
 * screens is inside the viewport and every one of them is a 44px target. A frame answers
 * "does this look right"; these answer "is the button still on the screen at all".
 */

const SHOTS = Boolean(import.meta.env.VITE_FIRST_RUN_SHOTS);

/** The lead's window, and a phone. Both short, which is the case that costs. */
const WINDOWS = [
  { label: "1024x580", width: 1024, height: 580 },
  { label: "390x580", width: 390, height: 580 },
] as const;

/** WCAG 2.5.5 / the project's own floor for anything a finger has to hit. */
const TOUCH_TARGET = 44;

/**
 * How long one of these may take, and it is stated rather than left to the default.
 *
 * Every test below mounts a surface TWICE, once per window, and two of them mount a whole city.
 * Vitest's 15s default is a comfortable-hardware assumption: all four tour tests passed locally
 * and timed out on GitHub's 2-core runner. A budget that is too generous costs nothing on a
 * healthy run, and a hung one still says so.
 */
const TEST_BUDGET = 120_000;

const CONFIG: AccountRuntimeConfig = {
  userPoolId: "us-east-1_pool",
  clientId: "public-client",
  region: "us-east-1",
  diagnosticApiUrl: "/api/diagnostic",
};

/** A Cognito stand-in that knows nobody, which is the state the front door exists for. */
function anonymousService(): CognitoAuthService {
  return {
    restoreIdentity: async () => null,
    getAccessToken: async () => null,
    signIn: async () => {
      throw new Error("not reached in a frame");
    },
    signUp: async () => ({ confirmationRequired: true }),
    forgotPassword: async () => undefined,
    confirmForgotPassword: async () => undefined,
    signOut: () => undefined,
  } as unknown as CognitoAuthService;
}

const ECONOMY_CLIENT = createInMemoryEconomyClient(null);

/**
 * The city as `App` composes it: the surface inside `.city-shell`, with the stockpile HUD as
 * its SIBLING.
 *
 * Both halves matter to a frame. The panel tokens (`--glass-fill-strong` and its neighbours)
 * are declared on `.city-shell` rather than at `:root`, so a bare mount paints every panel
 * transparent and photographs a defect that does not exist. And `EconomyHud` is a sibling in
 * the real app, so a frame of `CitySurface` alone has no stockpile in it for the resources
 * beat to point at.
 */
function CityAsShipped({
  bay,
  canvas,
}: {
  readonly bay: boolean;
  readonly canvas: boolean;
}) {
  const economy = useEconomy(ECONOMY_CLIENT);
  /*
    The app's own new-city session, created once per mount. `MOCK_NODE_STATES` is not empty:
    it carries finished lessons and mastery, so stripping only its placements photographs
    a partly learned city. This session begins with every node at zero evidence and no skill
    placement, exactly like the learner path, and wiring its placement command keeps the
    gated beat real when this harness needs to walk it.
  */
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

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
/** What the frames measured, accumulated so every line lands in one file. */
const measured: string[] = [];

function session() {
  return cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data?: string }>;
  };
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
 * CDP rather than `page.screenshot`: the locator capture runs actionability checks and never
 * gets past "waiting for element to be stable" against a canvas running `frameloop="always"`.
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
    await commands.writeFile(`docs/design-refs/first-run-journey/${name}.png`, shot, {
      encoding: "base64",
    });
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * The composited frame as pixels, so a CONTRAST claim is measured against what was painted
 * rather than against a stylesheet.
 *
 * Compositing is the whole reason: both new controls sit on a translucent parchment panel over
 * a gradient, so their effective background is not any one declared value and `getComputedStyle`
 * can only report the layer it is asked about.
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

/** WCAG relative luminance. */
function luminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(one: Rgb, other: Rgb): number {
  const [light, dark] = [luminance(one), luminance(other)].sort((a, b) => b - a);
  return ((light as number) + 0.05) / ((dark as number) + 0.05);
}

/**
 * A computed colour string as sRGB bytes, resolved by PAINTING it.
 *
 * A regex over the string is the obvious instrument and it is wrong here: this stylesheet's
 * palette is written in `oklch()`, Chromium returns `color` in the syntax the author used, and
 * `oklch(0.97 0.02 182)` parsed as three numbers reads as `rgb(0.97, 0.02, 182)` — a
 * near-black, which is the opposite of the near-white it is. Measured: the front door's primary
 * action came back at 1.62:1 against a background it actually clears comfortably. Canvas fills
 * resolve every colour syntax to sRGB, which is the same resolution the compositor does.
 */
function toRgb(value: string): Rgb {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("no 2d context, so a colour cannot be resolved");
  }
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
}

/**
 * **THE TEXT COLOUR AGAINST THE PAINTED BACKGROUND BEHIND IT, at 4.5:1.**
 *
 * The background is sampled from the frame at a point 3px inside the element's own left edge,
 * vertically centred. Both controls this is used on are pills with centred text and at least
 * 10px of inline padding, so that point is padding rather than a glyph; the assertion carries
 * the sampled colour in its message, so a sample that landed on a letter is visible in the
 * failure rather than silently lowering the figure.
 */
async function requireContrast(label: string, element: Element | null): Promise<void> {
  if (!element) {
    throw new Error(`${label} is not on the screen, so its contrast cannot be read`);
  }
  const box = element.getBoundingClientRect();
  const pixels = await framePixels();
  const behind = pixels(box.left + 3, box.top + box.height / 2);
  const ink = toRgb(getComputedStyle(element).color);
  const ratio = contrast(ink, behind);
  measured.push(
    `${window.innerWidth}x${window.innerHeight} ${label}: text rgb(${ink.r}, ${ink.g}, ${ink.b}) ` +
      `on painted rgb(${behind.r}, ${behind.g}, ${behind.b}) = ${ratio.toFixed(2)}:1`,
  );
  expect(
    ratio,
    `${label} draws rgb(${ink.r}, ${ink.g}, ${ink.b}) on a painted rgb(${behind.r}, ${behind.g}, ${behind.b}) at ${ratio.toFixed(2)}:1, under the 4.5:1 floor`,
  ).toBeGreaterThanOrEqual(4.5);
}

/**
 * **IS THIS CONTROL ON THE SCREEN, AND IS IT BIG ENOUGH TO PRESS.**
 *
 * Recorded into the measurements file either way, and asserted, because a route pushed under
 * the fold at a short viewport is the exact defect a comfortable developer window hides.
 */
function requireOnScreen(label: string, element: Element | null): void {
  if (!element) {
    throw new Error(`${label} is not on the screen at all`);
  }
  const box = element.getBoundingClientRect();
  measured.push(
    `${window.innerWidth}x${window.innerHeight} ${label}: ` +
      `${Math.round(box.width)}x${Math.round(box.height)}px at ` +
      `(${Math.round(box.left)}, ${Math.round(box.top)}), bottom y=${Math.round(box.bottom)}`,
  );
  expect(
    box.top,
    `${label} is above the top of the ${window.innerWidth}x${window.innerHeight} window`,
  ).toBeGreaterThanOrEqual(0);
  expect(
    Math.round(box.bottom),
    `${label} runs past the bottom of the ${window.innerWidth}x${window.innerHeight} window`,
  ).toBeLessThanOrEqual(window.innerHeight);
  expect(
    Math.round(box.right),
    `${label} runs past the right edge of the ${window.innerWidth}x${window.innerHeight} window`,
  ).toBeLessThanOrEqual(window.innerWidth);
  expect(
    Math.round(box.height),
    `${label} is a ${Math.round(box.height)}px target, under the ${TOUCH_TARGET}px floor`,
  ).toBeGreaterThanOrEqual(TOUCH_TARGET);
}

/**
 * A teaching sentence is painted in full on first view: not `display:none`, not beyond the
 * viewport, and not inside an ancestor's clipped/scrolling remainder. This is intentionally
 * stricter than "the paragraph exists in the DOM", which was green while the City Life panel
 * painted over all three vitality explanations at 390x580.
 */
function requireReadableSentence(label: string, element: Element | null): DOMRect {
  if (!(element instanceof HTMLElement)) {
    throw new Error(`${label} is not mounted`);
  }
  const style = getComputedStyle(element);
  const box = element.getBoundingClientRect();
  expect(style.display, `${label} is deliberately hidden`).not.toBe("none");
  expect(style.visibility, `${label} is not visible`).toBe("visible");
  expect(Number(style.opacity), `${label} is transparent`).toBeGreaterThan(0);
  expect(box.width, `${label} has no painted width`).toBeGreaterThan(1);
  expect(box.height, `${label} has no painted height`).toBeGreaterThan(1);
  expect(box.top, `${label} starts above the viewport`).toBeGreaterThanOrEqual(0);
  expect(box.left, `${label} starts left of the viewport`).toBeGreaterThanOrEqual(0);
  expect(box.right, `${label} runs past the viewport`).toBeLessThanOrEqual(
    window.innerWidth,
  );
  expect(box.bottom, `${label} runs below the viewport`).toBeLessThanOrEqual(
    window.innerHeight,
  );

  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const ancestorStyle = getComputedStyle(ancestor);
    if (
      !/(auto|clip|hidden|scroll)/.test(
        `${ancestorStyle.overflowX} ${ancestorStyle.overflowY}`,
      )
    ) {
      continue;
    }
    const clip = ancestor.getBoundingClientRect();
    expect(
      box.top,
      `${label} is clipped above ${ancestor.className}`,
    ).toBeGreaterThanOrEqual(clip.top - 1);
    expect(
      box.bottom,
      `${label} is clipped below ${ancestor.className}`,
    ).toBeLessThanOrEqual(clip.bottom + 1);
  }
  return box;
}

/** Area where two viewport-space boxes occupy the same pixels. */
function overlapArea(one: DOMRect, other: DOMRect): number {
  return (
    Math.max(0, Math.min(one.right, other.right) - Math.max(one.left, other.left)) *
    Math.max(0, Math.min(one.bottom, other.bottom) - Math.max(one.top, other.top))
  );
}

/**
 * The spotlight raises a whole HUD stacking context, not only its row. A sentence can
 * therefore pass every viewport/overflow assertion above and still be painted underneath
 * that panel. Read the two boxes together and require zero shared pixels.
 */
function requireClearOfLiftedHud(label: string, sentence: DOMRect): void {
  for (const panel of document.querySelectorAll<HTMLElement>(".hud[data-spotlit]")) {
    /*
      `.hud-top-left` reserves a 300px layout column around a 196px painted City Life card.
      Its empty remainder is not occlusion, so measure the direct painted surfaces brought
      forward by the stacking-context lift, not their transparent positioning wrapper.
    */
    const painted = Array.from(panel.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        getComputedStyle(child).display !== "none" &&
        child.getBoundingClientRect().width > 0 &&
        child.getBoundingClientRect().height > 0,
    );
    expect(
      painted.length,
      `${panel.className} is lifted but has no painted child to measure`,
    ).toBeGreaterThan(0);
    for (const surface of painted) {
      const covered = overlapArea(sentence, surface.getBoundingClientRect());
      expect(
        covered,
        `${label} has ${Math.round(covered)}px² painted under ${surface.className} at ${window.innerWidth}x${window.innerHeight}`,
      ).toBe(0);
    }
  }
}

function named(label: RegExp | string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find((button) => {
    const name = (button.getAttribute("aria-label") ?? button.textContent ?? "").trim();
    return typeof label === "string" ? name === label : label.test(name);
  });
}

async function reducedMotion(): Promise<void> {
  // END TO END rather than through a prop: the entrance rise and the spotlight pulse are stood
  // down by a media query, so emulating the query is the only way to photograph what a learner
  // with the preference set actually sees.
  await session().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
}

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await reducedMotion();
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

afterAll(async () => {
  await session().send("Emulation.setEmulatedMedia", { features: [] });
  vi.unstubAllEnvs();
  localStorage.clear();
  forgetCrisisBriefingRead();
  // BEHIND THE SAME FLAG AS THE FRAMES, and `testWritesStayOutOfTheTree.test.ts` is why: this
  // path is tracked, so an unconditional write would have every ordinary CI run leaving a
  // modified file in the checkout. The numbers are still MEASURED on every run; what the flag
  // decides is whether they are written down beside the pictures they describe.
  if (SHOTS) {
    if (SHOTS) {
      await commands.writeFile(
        "docs/design-refs/first-run-journey/measured.txt",
        [
          "Measured on the frames in docs/design-refs/first-run-journey, under an emulated",
          "prefers-reduced-motion: reduce, by firstRunJourneyShots.browser.test.tsx in the same run.",
          "Every box is in CSS pixels, in the viewport named at the start of its line.",
          "",
          ...measured,
          "",
        ].join("\n"),
      );
    }
  }
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

/* -------------------------------------------------------------------------- */
/* 1. Account entry: the front door                                            */
/* -------------------------------------------------------------------------- */

test("the account front door fits both windows, and leads with Create account", {
  timeout: TEST_BUDGET,
}, async () => {
  for (const window_ of WINDOWS) {
    await page.viewport(window_.width, window_.height);
    h?.cleanup();
    localStorage.clear();
    window.history.replaceState(null, "", "/");
    h = mount(
      <AccountBoundary config={CONFIG} service={anonymousService()}>
        {() => <p>never reached without a session</p>}
      </AccountBoundary>,
    );
    await waitFor(
      () => document.querySelector('[data-testid="account-welcome"]') !== null,
      "the account front door never mounted",
      10000,
    );
    await document.fonts.ready;

    requireOnScreen("front door / Create account", named("Create account") ?? null);
    requireOnScreen("front door / Sign in", named("Sign in") ?? null);
    // The two colour pairs this screen introduces, against what was actually painted.
    await requireContrast("front door / Create account", named("Create account") ?? null);
    await requireContrast("front door / Sign in", named("Sign in") ?? null);

    if (SHOTS) {
      await keep(`account-entry-${window_.label}`, await capture());
    }
  }
});

/* -------------------------------------------------------------------------- */
/* 2. The start choice                                                         */
/* -------------------------------------------------------------------------- */

test("both start routes are on the screen at both windows", {
  timeout: TEST_BUDGET,
}, async () => {
  for (const window_ of WINDOWS) {
    await page.viewport(window_.width, window_.height);
    h?.cleanup();
    localStorage.clear();
    // Withhold the dev route panel, which is a large dark instrument over the corner of the
    // frame and is not what a learner is given.
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "https://api.example.test");
    h = mount(
      <TitleScreen
        accountMode
        onStart={() => undefined}
        onTakeDiagnostic={() => undefined}
      />,
    );
    await waitFor(
      () => named("Take the diagnostic") !== undefined,
      "the start choice never mounted",
      10000,
    );
    await document.fonts.ready;
    // The island backdrop is a lazy WebGL scene; give it a beat so the frame is the one a
    // learner lands on rather than the gradient underneath it.
    await wait(1200);
    await capture();
    await wait(400);

    expect(
      document.querySelector(".start-choice__meta")?.textContent,
      `the ${window_.label} title surface still carries the obsolete diagnostic duration`,
    ).toBe("About 35 questions, around 20 minutes.");
    requireOnScreen(
      "start choice / Take the diagnostic",
      named("Take the diagnostic") ?? null,
    );
    // THE SECOND ROUTE IS THE ONE THAT GETS LOST. A choice screen whose alternative is under
    // the fold at 390x580 is a screen that offers one route and looks like it offers two.
    requireOnScreen("start choice / Start at Era 1", named("Start at Era 1") ?? null);

    /*
      AND THE WHOLE PANEL, not only its buttons. Both routes can be on the screen while the
      sentence that says the diagnostic is still available later is off the bottom of it, and
      `.title-screen` is `overflow: hidden`, so anything past the edge is not merely below the
      fold, it is unreachable. This is the assertion that caught it: 620px of panel in a 580px
      window at 1024x580, and 731px at 390x580.
    */
    const panel = document.querySelector(".title-screen__panel");
    const panelBox = panel?.getBoundingClientRect();
    if (!panelBox) {
      throw new Error("the start choice drew no panel, so there is nothing to measure");
    }
    measured.push(
      `${window.innerWidth}x${window.innerHeight} start choice / panel: ` +
        `${Math.round(panelBox.width)}x${Math.round(panelBox.height)}px, top y=${Math.round(panelBox.top)}, bottom y=${Math.round(panelBox.bottom)}`,
    );
    expect(
      Math.round(panelBox.top),
      `the start choice panel starts above the top of the ${window.innerWidth}x${window.innerHeight} window`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      Math.round(panelBox.bottom),
      `the start choice panel runs ${Math.round(panelBox.bottom - window.innerHeight)}px past the bottom of the ${window.innerWidth}x${window.innerHeight} window, where nothing can reach it`,
    ).toBeLessThanOrEqual(window.innerHeight);
    // ...and it did not merely become a scrolling box: the last sentence has to be laid out
    // inside it, not parked below its own overflow.
    expect(
      panel?.scrollHeight ?? 0,
      "the panel fits the window only by scrolling inside itself",
    ).toBeLessThanOrEqual(Math.ceil(panelBox.height) + 1);

    // The colour pairs this screen introduces: the "Recommended" pill on its gold wash, and
    // the secondary route's own button.
    await requireContrast(
      "start choice / Recommended tag",
      document.querySelector(".start-choice__tag"),
    );
    await requireContrast("start choice / Start at Era 1", named("Start at Era 1") ?? null);

    if (SHOTS) {
      await keep(`start-choice-${window_.label}`, await capture());
    }
  }
});

/* -------------------------------------------------------------------------- */
/* 3. The tour, over the real island                                           */
/* -------------------------------------------------------------------------- */

/** Open the city with the tour parked on one moment. See `resumeOnboardingAt`. */
async function openTourAt(moment: string, bay: boolean): Promise<void> {
  h?.cleanup();
  localStorage.clear();
  forgetCrisisBriefingRead();
  localStorage.removeItem(ONBOARDING_ADVISOR_DONE_KEY);
  localStorage.removeItem(ONBOARDING_DEMO_SEEN_KEY);
  // From the sequence THIS CITY actually walks (bay on/off matches the `bay` argument), not
  // `ONBOARDING_MOMENT_ORDER`: "bay" now sits ahead of most other moments in the raw authored
  // order, so a bay-less render's real index disagrees with the raw order's by one wherever
  // bay would otherwise have taken a slot.
  localStorage.setItem(
    ONBOARDING_ADVISOR_STEP_KEY,
    String(
      onboardingBriefingFor(CURRENT_ERA_ID, { bay }).moments.findIndex((m) => m.id === moment),
    ),
  );
  // Withhold the dev stand-in panel, which is a large dark box over the corner of every frame
  // and is not the product.
  vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "https://api.example.test");

  /*
    ⚑ THE ISLAND IS RENDERED ONLY WHEN A FRAME IS BEING TAKEN, and that is a cost decision
    rather than a shortcut. Everything asserted on these beats is a DOM box — where Next and
    Skip tour are, how much of the window the bubble covers, which control the ring is over —
    and none of it moves with the canvas, which lives inside `.city-viewport` under all of it.
    What the canvas is for is the picture, and the picture is what the shot flag governs.

    Measured: with the scene on, one beat over two viewports is a full city mount, ~3.8s of
    settling and two captures EACH, which is comfortably inside vitest's 15s default on a
    12-core box and comfortably outside it on GitHub's 2-core runner, where all four of these
    timed out. The frames in `docs/design-refs/first-run-journey` are taken with the scene on.
  */
  h = mount(<CityAsShipped bay={bay} canvas={SHOTS} />);
  if (SHOTS) {
    await waitFor(
      () => document.querySelector(".city-viewport canvas") !== null,
      "the city canvas never mounted",
      30000,
    );
  }
  await waitFor(() => named("Menu") !== undefined, "the city's Menu button appears", 30000);
  await waitFor(
    () => document.querySelector('[data-testid="onboarding-advisor"]') !== null,
    "the tour never opened",
    20000,
  );
  await document.fonts.ready;
  if (SHOTS) {
    // The GLBs resolve behind their own Suspense boundaries, so a first frame is bare ground.
    await wait(3000);
    // A THROWAWAY CAPTURE, and it is load-bearing: a clipped capture puts a device-metrics
    // override on the page, which R3F reads as a resize and re-renders through, so the frame
    // that comes back from the FIRST capture is the one drawn before any of that settled.
    await capture();
    await wait(800);
  }
}

/**
 * EVERY beat, not a sample. The independent review found the population, livability and
 * happiness sentences hidden specifically because the earlier browser guard mounted only
 * advisor, era, crisis and bay. A sweep summary about four examples is no evidence about the
 * other eight, so each real row in the source table owns this same browser composition check
 * and a full-surface frame at both named windows.
 */
for (const moment of ONBOARDING_MOMENT_ORDER) {
  test(`the ${moment} beat paints every teaching sentence at both windows`, {
    timeout: TEST_BUDGET,
  }, async () => {
    for (const window_ of WINDOWS) {
      await page.viewport(window_.width, window_.height);
      await openTourAt(moment, moment === "bay");

      const shown = document.querySelector<HTMLElement>(
        '[data-testid="onboarding-advisor-moment"]',
      );
      expect(shown?.dataset.moment, `the tour is not on the ${moment} beat`).toBe(moment);

      const lead = requireReadableSentence(
        `${moment} beat / lead`,
        document.querySelector('[data-testid="onboarding-advisor-lead"]'),
      );
      const body = requireReadableSentence(
        `${moment} beat / body`,
        document.querySelector('[data-testid="onboarding-advisor-body"]'),
      );
      requireClearOfLiftedHud(`${moment} beat / lead`, lead);
      requireClearOfLiftedHud(`${moment} beat / body`, body);
      if (moment === "place") {
        const task = requireReadableSentence(
          "place beat / task",
          document.querySelector(".ob-task__line"),
        );
        const status = requireReadableSentence(
          "place beat / live instruction",
          document.querySelector('[data-testid="ob-task-status"]'),
        );
        requireClearOfLiftedHud("place beat / task", task);
        requireClearOfLiftedHud("place beat / live instruction", status);
      }

      // THE WAY OUT AND THE WAY ON, both of which a learner has to be able to reach on a
      // short window with a speech bubble over the island.
      requireOnScreen(
        `${moment} beat / Next`,
        document.querySelector('[data-testid="onboarding-advisor-next"]'),
      );
      requireOnScreen(
        `${moment} beat / Skip tour`,
        document.querySelector('[data-testid="onboarding-advisor-skip"]'),
      );

      // ...AND THE ISLAND IS STILL THERE BEHIND HIM, which is the claim the frames are of.
      // The bubble is measured against the viewport rather than against itself: an overlay
      // that has grown to fill the window is a slideshow, which is what this tour is not.
      const bubble = document.querySelector(".crisis-call-speech__bubble");
      const box = bubble?.getBoundingClientRect();
      if (!box) {
        throw new Error("the advisor drew no bubble, so there is nothing to measure");
      }
      const covered = (box.width * box.height) / (window.innerWidth * window.innerHeight);
      measured.push(
        `${window.innerWidth}x${window.innerHeight} ${moment} beat / bubble covers ` +
          `${(covered * 100).toFixed(1)}% of the viewport`,
      );
      expect(
        covered,
        `the ${moment} beat's bubble covers ${(covered * 100).toFixed(0)}% of the window, which is a slideshow rather than a tour`,
      ).toBeLessThan(0.75);

      if (SHOTS) {
        await keep(`tour-${moment}-${window_.label}`, await capture());
      }
    }
  });
}

test("the bay beat rings the Menu it lives behind, at both windows", {
  timeout: TEST_BUDGET,
}, async () => {
  for (const window_ of WINDOWS) {
    await page.viewport(window_.width, window_.height);
    await openTourAt("bay", true);

    const shown = document.querySelector<HTMLElement>(
      '[data-testid="onboarding-advisor-moment"]',
    );
    expect(shown?.dataset.moment, "the tour is not on the bay beat").toBe("bay");
    expect(
      document
        .querySelector('[data-testid="onboarding-spotlight"]')
        ?.getAttribute("data-anchor"),
      "the bay beat is not ringing the Menu",
    ).toBe("menu");

    // THE RING IS OVER THE CONTROL, which is the spatial half: a ring drawn somewhere else on
    // the screen is a decoration, and the frames beside this are what a reviewer looks at.
    const ring = document
      .querySelector('[data-testid="onboarding-spotlight"]')
      ?.getBoundingClientRect();
    const menu = named("Menu")?.getBoundingClientRect();
    if (!ring || !menu) {
      throw new Error(
        "either the ring or the Menu button is missing, so nothing is over it",
      );
    }
    measured.push(
      `${window.innerWidth}x${window.innerHeight} bay beat / ring at ` +
        `(${Math.round(ring.left)}, ${Math.round(ring.top)}) ${Math.round(ring.width)}x${Math.round(ring.height)}, ` +
        `Menu at (${Math.round(menu.left)}, ${Math.round(menu.top)}) ${Math.round(menu.width)}x${Math.round(menu.height)}`,
    );
    expect(
      ring.left,
      "the ring starts to the right of the Menu button",
    ).toBeLessThanOrEqual(menu.left);
    expect(ring.right, "the ring ends before the Menu button does").toBeGreaterThanOrEqual(
      menu.right,
    );
  }
});

/** The era the frames were taken in, so a reviewer knows what the island is wearing. */
test("records the era the frames were taken in", () => {
  measured.push(`frames taken with the city standing in ${CURRENT_ERA_ID}`);
  expect(CURRENT_ERA_ID.length).toBeGreaterThan(0);
});
