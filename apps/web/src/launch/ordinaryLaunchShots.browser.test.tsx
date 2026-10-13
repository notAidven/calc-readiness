import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { AccountBoundary } from "../auth/AccountBoundary";
import type { CognitoAuthService, CognitoIdentity } from "../auth/cognitoClient";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import type { AccountRuntimeConfig } from "../runtimeMode";
import { LaunchScreen } from "./LaunchScreen";

import "../styles.css";

/**
 * **THE ORDINARY ROUTE, PHOTOGRAPHED, ON THE SURFACE A LEARNER ACTUALLY GETS.**
 *
 * `.cursor/rules/qa-verification.mdc` decides what discharges a spatial claim, and a computed
 * box is not it: the evidence is a rendered frame somebody LOOKED at, at a named viewport,
 * framed to show the surface rather than cropped to the component nobody doubted.
 *
 * ## HOW THIS IS COMPOSED, AND WHY IT IS NOT `<App />`
 *
 * Both screens are mounted through the real `AccountBoundary` with a Cognito stand-in passed as
 * its `service` PROP — never a module mock. `test/browserModeModuleMocker.test.ts` bans
 * `vi.mock` in browser mode outright: the mocker keys its registry on a URL-escaped module id,
 * so on a checkout whose path contains a space it registers, matches nothing, and returns
 * silently, and the file then exercises the real module and reports green. A frame taken under
 * a mock that may or may not have applied is not evidence of anything.
 *
 * Injecting the service is the guard's own preferred remedy, and it costs the frame nothing that
 * matters. `AccountBoundary` is what renders the fixed *Signed in / Sign out* chrome and what an
 * anonymous visitor gets the front door from, so both are the shipped article. What is left out
 * is `useAccountLaunch`'s decision, which is a claim about logic rather than about paint and is
 * read end to end in jsdom by `ordinaryLaunch.test.tsx`.
 *
 * ## THE TWO WINDOWS, AND WHY THEY ARE THESE TWO
 *
 * `1024x580` is the product lead's own review window, and it is SHORT, which is where a panel
 * stops leaving room. `390x580` is a phone, and it is the case a two-route choice screen is most
 * likely to lose: a second route pushed under the fold reads as "there is only one way in".
 * Both are named in every filename, because a frame whose viewport is unstated says nothing
 * about anybody's screen. Every frame is under an emulated `prefers-reduced-motion: reduce`, and
 * every frame is the WHOLE viewport.
 *
 * ## WHAT RUNS EVERY TIME
 *
 * The frames need `VITE_ORDINARY_LAUNCH_SHOTS=1`:
 *
 *   VITE_ORDINARY_LAUNCH_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/launch/ordinaryLaunchShots.browser.test.tsx
 *
 * What runs on every ordinary run is the numeric half a picture cannot assert and which
 * regresses silently: at both windows, every route out of these screens is inside the viewport,
 * every one is a 44px target, nothing overflows horizontally, and the account chrome does not
 * cover the surface it floats over.
 */

const SHOTS = Boolean(import.meta.env.VITE_ORDINARY_LAUNCH_SHOTS);

const WINDOWS = [
  { label: "1024x580", width: 1024, height: 580 },
  { label: "390x580", width: 390, height: 580 },
] as const;

/** WCAG 2.5.5 / this project's own floor for anything a finger has to hit. */
const TOUCH_TARGET = 44;

const CONFIG: AccountRuntimeConfig = {
  userPoolId: "us-east-1_pool",
  clientId: "public-client",
  region: "us-east-1",
  diagnosticApiUrl: "/api/diagnostic",
};

const IDENTITY: CognitoIdentity = {
  studentId: "11111111-1111-4111-8111-111111111111" as CognitoIdentity["studentId"],
  email: "learner@example.test",
};

/** A Cognito stand-in, passed as a prop. `restoreIdentity` is the only call these frames make. */
function service(identity: CognitoIdentity | null): CognitoAuthService {
  return {
    restoreIdentity: async () => identity,
    getAccessToken: async () => (identity ? "access-token" : null),
    signIn: async () => {
      throw new Error("not reached in a frame");
    },
    signUp: async () => ({ confirmationRequired: true }),
    forgotPassword: async () => undefined,
    confirmForgotPassword: async () => undefined,
    signOut: () => undefined,
  };
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
    await commands.writeFile(`docs/design-refs/ordinary-launch/${name}.png`, shot, {
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
 * rather than against a stylesheet. Both actions sit on an opaque parchment sheet over a live
 * scene, so their effective background is not any one declared value.
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
 * A computed colour string as sRGB bytes, resolved by PAINTING it — this stylesheet's palette
 * is written in `oklch()` and a regex over the returned string reads those three numbers as
 * `rgb()`, which inverts the answer. Canvas fills resolve every syntax the compositor does.
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

/** The text colour against the PAINTED background behind it, at the 4.5:1 AA floor. */
async function requireContrast(label: string, element: Element | null): Promise<void> {
  if (!element) {
    throw new Error(`${label} is not on the screen, so its contrast cannot be read`);
  }
  const box = element.getBoundingClientRect();
  const pixels = await framePixels();
  const behind = pixels(box.left + 4, box.top + box.height / 2);
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

/** Is this control on the screen, and is it big enough to press. */
function requireOnScreen(label: string, element: Element | null): DOMRect {
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
  return box;
}

function overlapArea(one: DOMRect, other: DOMRect): number {
  return (
    Math.max(0, Math.min(one.right, other.right) - Math.max(one.left, other.left)) *
    Math.max(0, Math.min(one.bottom, other.bottom) - Math.max(one.top, other.top))
  );
}

function named(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find(
    (button) =>
      (button.getAttribute("aria-label") ?? button.textContent ?? "").trim() === label,
  );
}

/** No horizontal scroll anywhere: the defect a narrow window produces and a wide one hides. */
function requireNoHorizontalOverflow(label: string): void {
  const widest = Math.max(
    document.documentElement.scrollWidth,
    document.body.scrollWidth,
    ...Array.from(
      document.querySelectorAll<HTMLElement>(".launch, .launch *, .auth-gate"),
    ).map((element) => Math.ceil(element.getBoundingClientRect().right)),
  );
  measured.push(
    `${window.innerWidth}x${window.innerHeight} ${label}: widest painted edge x=${widest}`,
  );
  expect(
    widest,
    `${label} overflows the ${window.innerWidth}px window by ${widest - window.innerWidth}px`,
  ).toBeLessThanOrEqual(window.innerWidth);
}

async function reducedMotion(): Promise<void> {
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
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterAll(async () => {
  await session().send("Emulation.setEmulatedMedia", { features: [] });
  // BEHIND THE SAME FLAG AS THE FRAMES (`test/testWritesStayOutOfTheTree.test.ts`): the numbers
  // are measured on every run, and what the flag decides is whether they are written down
  // beside the pictures they describe.
  if (SHOTS) {
    if (SHOTS) {
      await commands.writeFile(
        "docs/design-refs/ordinary-launch/measured.txt",
        [
          "Measured on the frames in docs/design-refs/ordinary-launch, under an emulated",
          "prefers-reduced-motion: reduce, by ordinaryLaunchShots.browser.test.tsx in the same run.",
          "Every box is in CSS pixels, in the viewport named at the start of its line.",
          "Both surfaces are mounted through the real AccountBoundary with the Cognito service",
          "injected as a prop, so the account chrome and the front door are the shipped article.",
          "No module mock: see test/browserModeModuleMocker.test.ts.",
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
/* 1. The front door: authentication, before anything else                     */
/* -------------------------------------------------------------------------- */

test("the ordinary route's front door fits both windows", {
  timeout: 120_000,
}, async () => {
  for (const window_ of WINDOWS) {
    await page.viewport(window_.width, window_.height);
    h?.cleanup();
    localStorage.clear();
    window.history.replaceState(null, "", "/");

    h = mount(
      <AccountBoundary config={CONFIG} service={service(null)}>
        {() => <p>never reached without a session</p>}
      </AccountBoundary>,
    );
    await waitFor(
      () => document.querySelector('[data-testid="account-welcome"]') !== null,
      "the account front door never mounted",
      20000,
    );
    await document.fonts.ready;

    requireOnScreen("front door / Create account", named("Create account") ?? null);
    requireOnScreen("front door / Sign in", named("Sign in") ?? null);
    requireNoHorizontalOverflow("front door");
    await requireContrast("front door / Create account", named("Create account") ?? null);
    await requireContrast("front door / Sign in", named("Sign in") ?? null);

    if (SHOTS) {
      await keep(`account-front-door-${window_.label}`, await capture());
    }
  }
});

/* -------------------------------------------------------------------------- */
/* 2. The launch screen a first-time learner meets after authenticating        */
/* -------------------------------------------------------------------------- */

test("both launch routes are on the screen at both windows", {
  timeout: 120_000,
}, async () => {
  for (const window_ of WINDOWS) {
    await page.viewport(window_.width, window_.height);
    h?.cleanup();
    localStorage.clear();
    window.history.replaceState(null, "", "/");

    h = mount(
      <AccountBoundary config={CONFIG} service={service(IDENTITY)}>
        {() => (
          <LaunchScreen
            onTakeDiagnostic={() => undefined}
            onStartEraOne={() => undefined}
          />
        )}
      </AccountBoundary>,
    );
    await waitFor(
      () => document.querySelector('[data-testid="ordinary-launch"]') !== null,
      "the ordinary launch screen never mounted",
      20000,
    );
    await document.fonts.ready;
    // The island backdrop is a lazy WebGL scene; give it a beat so the frame is the one a
    // learner lands on rather than the flat ground underneath it. The first capture is a
    // throwaway: a clipped capture puts a device-metrics override on the page, which R3F reads
    // as a resize and re-renders through.
    await wait(1400);
    await capture();
    await wait(500);

    const diagnostic = requireOnScreen(
      "launch / Take the diagnostic",
      named("Take the diagnostic") ?? null,
    );
    // THE SECOND ROUTE IS THE ONE THAT GETS LOST. A choice screen whose alternative is under
    // the fold at 390x580 offers one route and looks like it offers two.
    requireOnScreen("launch / Start at Era 1", named("Start at Era 1") ?? null);
    requireNoHorizontalOverflow("launch");

    /*
      AND THE WHOLE SHEET, not only its buttons. Both routes can be on the screen while the
      sentence saying the diagnostic is still available later is off the bottom of it, and
      `.launch` is `overflow: hidden`, so anything past the edge is not merely below the fold,
      it is unreachable.
    */
    /*
      ⚑ THE MASTHEAD IS MEASURED, and it is here because a global rule reached it. `styles.css`
      declares `h1 { max-width: 14ch }`, so the title arrived clamped to 218px in an 803px
      masthead and broke "Your island is waiting" across two lines with 585px of empty room
      either side. It cost nothing but craft, and no assertion about a button could have seen
      it — only a frame, and then only if somebody looked. Read the box back so the fix has a
      number under it.
    */
    const title = document.querySelector<HTMLElement>(".launch__title");
    const titleBox = title?.getBoundingClientRect();
    const masthead = document.querySelector<HTMLElement>(".launch__masthead");
    const mastheadBox = masthead?.getBoundingClientRect();
    if (!title || !titleBox || !mastheadBox) {
      throw new Error("the launch screen drew no masthead");
    }
    const titleLines = Math.round(
      titleBox.height / Number.parseFloat(getComputedStyle(title).lineHeight),
    );
    measured.push(
      `${window.innerWidth}x${window.innerHeight} launch / title: ` +
        `${Math.round(titleBox.width)}px wide in a ${Math.round(mastheadBox.width)}px masthead, ` +
        `${titleLines} line(s)`,
    );
    expect(
      titleLines,
      `the launch title broke over ${titleLines} lines inside a ${Math.round(mastheadBox.width)}px masthead`,
    ).toBeLessThanOrEqual(window.innerWidth >= 700 ? 1 : 2);

    const sheet = document.querySelector<HTMLElement>(".launch__sheet");
    const sheetBox = sheet?.getBoundingClientRect();
    if (!sheet || !sheetBox) {
      throw new Error("the launch screen drew no sheet, so there is nothing to measure");
    }
    measured.push(
      `${window.innerWidth}x${window.innerHeight} launch / sheet: ` +
        `${Math.round(sheetBox.width)}x${Math.round(sheetBox.height)}px, top y=${Math.round(sheetBox.top)}, bottom y=${Math.round(sheetBox.bottom)}`,
    );
    expect(
      Math.round(sheetBox.top),
      `the launch sheet starts above the top of the ${window.innerWidth}x${window.innerHeight} window`,
    ).toBeGreaterThanOrEqual(0);
    expect(
      Math.round(sheetBox.bottom),
      `the launch sheet runs ${Math.round(sheetBox.bottom - window.innerHeight)}px past the bottom of the ${window.innerWidth}x${window.innerHeight} window, where nothing can reach it`,
    ).toBeLessThanOrEqual(window.innerHeight);
    // ...and it did not merely become a scrolling box: the footnote has to be laid out inside
    // it, not parked below its own overflow.
    expect(
      sheet.scrollHeight,
      "the sheet fits the window only by scrolling inside itself",
    ).toBeLessThanOrEqual(Math.ceil(sheetBox.height) + 1);

    /*
      THE ACCOUNT CHROME FLOATS OVER THIS SURFACE. `.account-chrome` is `position: fixed` at
      the top centre, which is where this sheet's masthead is — a claim about what is visible
      BEHIND something is exactly the claim a cropped measurement of the sheet cannot make.
    */
    const chrome = document.querySelector<HTMLElement>(".account-chrome");
    const chromeBox = chrome?.getBoundingClientRect();
    if (!chromeBox) {
      throw new Error("the account chrome is missing, so its occlusion cannot be measured");
    }
    const covered = Math.round(overlapArea(mastheadBox, chromeBox));
    measured.push(
      `${window.innerWidth}x${window.innerHeight} launch / account chrome covers ` +
        `${covered}px² of the masthead (chrome bottom y=${Math.round(chromeBox.bottom)}, ` +
        `masthead top y=${Math.round(mastheadBox.top)})`,
    );
    expect(
      covered,
      `the Signed in / Sign out chrome covers ${covered}px² of the launch masthead at ${window.innerWidth}x${window.innerHeight}`,
    ).toBe(0);
    expect(
      Math.round(overlapArea(diagnostic, chromeBox)),
      "the account chrome covers the recommended action",
    ).toBe(0);

    // The colour pairs this screen introduces: the brass recommendation, the brass lead action
    // and the stone second action, each against what was actually painted behind it.
    await requireContrast(
      "launch / Recommended tag",
      document.querySelector(".launch__tag"),
    );
    await requireContrast(
      "launch / Take the diagnostic",
      named("Take the diagnostic") ?? null,
    );
    await requireContrast("launch / Start at Era 1", named("Start at Era 1") ?? null);

    if (SHOTS) {
      await keep(`ordinary-launch-${window_.label}`, await capture());
    }
  }
});
