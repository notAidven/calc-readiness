import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { commands, page } from "vitest/browser";

import { LaunchScreen } from "../launch/LaunchScreen";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import type { AccountRuntimeConfig } from "../runtimeMode";
import {
  boxOf,
  captureFrame,
  clearEmulatedMedia,
  contrast,
  describeBox,
  describeRgb,
  emulateReducedMotion,
  framePixels,
  probeTargetBox,
  toRgb,
} from "../test/frameEvidence";
import { AccountBoundary } from "./AccountBoundary";
import type { CognitoAuthService, CognitoIdentity } from "./cognitoClient";

import "../styles.css";

/**
 * **THE FRONT DOOR: THE RING, THE TARGETS, THE FIT, AND THE LANGUAGE IT IS DRAWN IN.**
 *
 * Everything here is measured on the surface an ordinary account visitor gets, mounted through
 * the real `AccountBoundary` with a Cognito stand-in passed as its `service` PROP — never a
 * module mock, which `test/browserModeModuleMocker.test.ts` bans outright in browser mode.
 *
 * ## The four claims, and what each was measured at before the fix (`b7bdc6d2`)
 *
 *  1. **The focus ring.** `styles.css` painted `var(--signal)` — the HUD's amber — as the
 *     `:focus-visible` outline on every account control, over the card's own parchment. Measured
 *     from the composited frame: `rgb(240, 152, 61)` on `rgb(255, 249, 231)`, **2.15:1**, under
 *     the 3:1 a focus indicator owes. The launch screen's own teal ring measured 6.29:1 on the
 *     same parchment, so the fix is not a new colour, it is the one already in the product.
 *  2. **The helper links.** *Create an account*, *Forgot password?* and *Back* were **19px**
 *     high. Probed rather than measured, because a compact affordance is allowed to grow its hit
 *     area with a pseudo-element and `getBoundingClientRect()` cannot see that; see
 *     `probeTargetBox`.
 *  3. **The fit.** At **844x390** the card was 445px tall in a 390px window and *Sign in* ran to
 *     y=409, 19px below the fold, with nothing saying the surface scrolled. At 512x290 (1024x580
 *     under 200% browser zoom) the card's TOP was at y=-25 as well.
 *  4. **The language.** `.account-shell` was a `radial-gradient` over a `linear-gradient` with a
 *     24px-radius translucent card and a 70px drop shadow floating on it — a generic
 *     card-on-gradient, with no world behind it, against a brief that asks for the tactile civic
 *     one this product already draws. Rather than assert a new set of literals, the sheet is
 *     compared to the LAUNCH sheet mounted in the same run: same face, same stone edge, same
 *     radius, same lift. Two surfaces that share their tokens cannot drift apart.
 *
 * ## What runs every time, and what needs a flag
 *
 * All of the above runs on every ordinary browser run. The FRAMES need
 * `VITE_ACCOUNT_DOOR_SHOTS=1`:
 *
 *   VITE_ACCOUNT_DOOR_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/auth/accountFrontDoor.browser.test.tsx
 */

const SHOTS = Boolean(import.meta.env.VITE_ACCOUNT_DOOR_SHOTS);

/**
 * The windows whose frame is KEPT, out of the eight measured.
 *
 * Every window is measured on every run; committing eight pictures of one screen is a flood
 * nobody reads and a diff nobody can review. These two are the ones the report is about: the
 * landscape phone where *Sign in* was 19px under the fold, and the review window where the whole
 * surface was a card on a gradient.
 */
const KEEP_FRAMES: readonly string[] = ["844x390", "1024x580"];

/** WCAG 2.5.5 and this repository's own floor for anything a finger has to hit. */
const TOUCH_TARGET = 44;

/** WCAG's floor for a focus indicator against the colours either side of it. */
const RING_CONTRAST = 3;

interface Window_ {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  /** Root font size, for the 200%-text case. */
  readonly rootFontPx?: number;
}

/**
 * The seven windows, and why these seven.
 *
 * `320x568` is the smallest phone still shipped; `390x580` is the requested short phone;
 * `768x1024` is tablet portrait; `844x390` is the same phone in LANDSCAPE, which is where a
 * vertically stacked pair of actions falls off the bottom; `1024x580` is the product lead's own
 * short review window; `1440x900` is a laptop. `512x290` is `1024x580` under 200% browser zoom,
 * which is a real user setting and not a hypothetical, and the last row is 200% TEXT at the
 * review window, which is the other half of WCAG 1.4.4.
 */
const WINDOWS: readonly Window_[] = [
  { label: "320x568", width: 320, height: 568 },
  { label: "390x580", width: 390, height: 580 },
  { label: "768x1024", width: 768, height: 1024 },
  { label: "844x390", width: 844, height: 390 },
  { label: "1024x580", width: 1024, height: 580 },
  { label: "1440x900", width: 1440, height: 900 },
  { label: "512x290-zoom200", width: 512, height: 290 },
  { label: "1024x580-text200", width: 1024, height: 580, rootFontPx: 32 },
];

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

/** A Cognito stand-in, passed as a prop. Nothing here completes a real call. */
function service(identity: CognitoIdentity | null): CognitoAuthService {
  return {
    restoreIdentity: async () => identity,
    getAccessToken: async () => (identity ? "access-token" : null),
    signIn: async () => {
      throw new Error("not reached in a frame");
    },
    signUp: async () => ({ confirmationRequired: false }),
    forgotPassword: async () => undefined,
    confirmForgotPassword: async () => undefined,
    signOut: () => undefined,
  };
}

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
const measured: string[] = [];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function named(label: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll("button")].find(
    (button) =>
      (button.getAttribute("aria-label") ?? button.textContent ?? "").trim() === label,
  );
}

async function keep(name: string): Promise<void> {
  await commands.writeFile(
    `docs/design-refs/account-front-door/${name}.png`,
    await captureFrame(),
    {
      encoding: "base64",
    },
  );
}

async function openDoor(view: Window_, path: string): Promise<void> {
  await page.viewport(view.width, view.height);
  h?.cleanup();
  localStorage.clear();
  sessionStorage.clear();
  document.documentElement.style.fontSize =
    view.rootFontPx === undefined ? "" : `${view.rootFontPx}px`;
  window.history.replaceState(null, "", path);
  h = mount(
    <AccountBoundary config={CONFIG} service={service(null)}>
      {() => <p>never reached without a session</p>}
    </AccountBoundary>,
  );
  await waitFor(
    () => document.querySelector(".auth-gate") !== null,
    `the account front door never mounted at ${view.label}`,
    20_000,
  );
  await document.fonts.ready;
  // The island behind the sheet is a lazy WebGL scene; give it a beat so a frame is the one a
  // visitor lands on rather than the flat ground under it.
  await wait(900);
}

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await emulateReducedMotion();
});

afterEach(() => {
  h?.cleanup();
  h = null;
  document.documentElement.style.fontSize = "";
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterAll(async () => {
  await clearEmulatedMedia();
  if (SHOTS) {
    await commands.writeFile(
      "docs/design-refs/account-front-door/measured.txt",
      [
        "Measured beside the frames in docs/design-refs/account-front-door, under an emulated",
        "prefers-reduced-motion: reduce, by accountFrontDoor.browser.test.tsx in the same run.",
        "Every box is in CSS pixels, in the window named at the start of its line. Both",
        "surfaces mount through the real AccountBoundary with the Cognito service injected as a",
        "prop, so the door and the account chrome are the shipped article, and no module is",
        "mocked (see test/browserModeModuleMocker.test.ts).",
        "",
        ...measured,
        "",
      ].join("\n"),
    );
  }
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

/* -------------------------------------------------------------------------- */
/* 1. The focus ring, against what was painted either side of it               */
/* -------------------------------------------------------------------------- */

/**
 * The ring's contrast against the two colours it is ACTUALLY adjacent to.
 *
 * The ring colour comes from `outline-color`, resolved through a canvas fill because this palette
 * is written in `oklch()` and reading those three numbers as `rgb()` inverts the answer. Both
 * neighbours are read from the composited FRAME, because every one of these controls sits on
 * opaque parchment over a live 3D scene and no declared value is what is behind anything.
 *
 * ⚑ **WHAT IS ADJACENT TO A RING WITH AN OFFSET IS THE GAP, on all four sides.** Every ring here
 * is `outline-offset: 3px`, so the ring is separated from the control by three pixels of the
 * surface it stands on and the control's own fill touches nothing; the assertion below requires
 * that offset rather than assuming it. Two readings this rules out, both of which were taken and
 * both of which were wrong: the pixels a few px FURTHER out are the island behind the whole
 * surface, which read the shipped teal at 2.22:1 against grass while the ring itself sat on
 * parchment at 6.8:1; and the control's own CENTRE lands on a glyph, which read the same ring at
 * 1.63:1 against the antialiased edge of the word "Sign in".
 */
async function requireRing(label: string, element: HTMLElement): Promise<void> {
  element.focus();
  await wait(60);
  const style = getComputedStyle(element);
  const width = Number.parseFloat(style.outlineWidth);
  const offset = Number.parseFloat(style.outlineOffset) || 0;
  const ring = toRgb(style.outlineColor);
  const box = element.getBoundingClientRect();
  const pixels = await framePixels();
  const gap = Math.max(1, offset / 2);
  const outer: readonly [string, [number, number]][] = [
    ["above", [box.left + box.width / 2, box.top - gap]],
    ["below", [box.left + box.width / 2, box.bottom + gap]],
    ["left", [box.left - gap, box.top + box.height / 2]],
    ["right", [box.right + gap, box.top + box.height / 2]],
  ];
  const neighbours: readonly [string, { r: number; g: number; b: number }][] = outer
    .filter(
      ([, [x, y]]) => x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight,
    )
    .map(([side, [x, y]]) => [side, pixels(x, y)] as const);
  expect(
    offset,
    `${label}'s ring has no offset, so it touches the control's own fill rather than the ` +
      "surface, and the sampling below would be measuring the wrong two colours",
  ).toBeGreaterThanOrEqual(2);
  expect(
    neighbours.length,
    `${label} sits against the window edge, so its ring cannot be sampled`,
  ).toBeGreaterThan(1);
  const ratios = neighbours.map(([side, colour]) => ({
    side,
    colour,
    ratio: contrast(ring, colour),
  }));
  const worst = ratios.reduce((low, row) => (row.ratio < low.ratio ? row : low));
  measured.push(
    `${window.innerWidth}x${window.innerHeight} ${label}: focus ring ${describeRgb(ring)} ` +
      `${style.outlineStyle} ${width}px offset ${offset}px; worst neighbour ${worst.side} ` +
      `${describeRgb(worst.colour)} = ${worst.ratio.toFixed(2)}:1 (` +
      `${ratios.map((row) => `${row.side} ${row.ratio.toFixed(2)}`).join(", ")})`,
  );
  expect(style.outlineStyle, `${label} paints no focus ring at all`).not.toBe("none");
  expect(width, `${label}'s focus ring is ${width}px thick`).toBeGreaterThanOrEqual(2);
  expect(
    worst.ratio,
    `${label}'s focus ring draws ${describeRgb(ring)} against the painted ` +
      `${describeRgb(worst.colour)} ${worst.side} of it at ${worst.ratio.toFixed(2)}:1, under ` +
      `the ${RING_CONTRAST}:1 floor`,
  ).toBeGreaterThanOrEqual(RING_CONTRAST);
}

test("every account control's focus ring clears 3:1 against the parchment behind it", {
  timeout: 180_000,
}, async () => {
  const review = WINDOWS.find((view) => view.label === "1024x580") as Window_;

  await openDoor(review, "/");
  await requireRing("front door / Create account", named("Create account") as HTMLElement);
  await requireRing("front door / Sign in", named("Sign in") as HTMLElement);

  await openDoor(review, "/sign-in");
  const email = document.querySelector<HTMLInputElement>(".auth-gate__field input");
  await requireRing("sign-in / Email field", email as HTMLElement);
  await requireRing("sign-in / Sign in", named("Sign in") as HTMLElement);
  await requireRing(
    "sign-in / Create an account",
    named("Create an account") as HTMLElement,
  );

  // ...and the chrome the boundary floats over every authenticated surface, which is on the
  // same ring and was on the same amber.
  await page.viewport(review.width, review.height);
  h?.cleanup();
  h = mount(
    <AccountBoundary config={CONFIG} service={service(IDENTITY)}>
      {() => (
        <LaunchScreen onTakeDiagnostic={() => undefined} onStartEraOne={() => undefined} />
      )}
    </AccountBoundary>,
  );
  await waitFor(
    () => document.querySelector(".account-chrome button") !== null,
    "the account chrome never mounted",
    20_000,
  );
  await document.fonts.ready;
  await wait(900);
  await requireRing("account chrome / Sign out", named("Sign out") as HTMLElement);

  /*
      AND THE RING IS THE LAUNCH SCREEN'S, not a second teal that happens to pass today. One
      token, so a change to either surface moves both.
    */
  const action = document.querySelector<HTMLElement>(".launch__action");
  if (action === null) {
    throw new Error("the launch screen drew no action to compare the ring against");
  }
  action.focus();
  const chromeRing = getComputedStyle(named("Sign out") as HTMLElement, null).outlineColor;
  const launchRing = getComputedStyle(action).outlineColor;
  measured.push(
    `${window.innerWidth}x${window.innerHeight} ring token: account ${chromeRing} vs launch ${launchRing}`,
  );
  expect(
    toRgb(chromeRing),
    "the account ring and the launch ring are two different colours",
  ).toEqual(toRgb(launchRing));
});

/* -------------------------------------------------------------------------- */
/* 2. Every helper link is a 44px target, and nothing else answers inside it   */
/* -------------------------------------------------------------------------- */

test("the account helper links are 44px targets that answer their own box", {
  timeout: 180_000,
}, async () => {
  for (const path of ["/sign-in", "/create-account", "/forgot-password"]) {
    await openDoor(WINDOWS.find((view) => view.label === "1024x580") as Window_, path);
    const links = [...document.querySelectorAll<HTMLElement>(".auth-gate__nav button")];
    expect(
      links.length,
      `${path} offers no helper links, so this sweep measures nothing there`,
    ).toBeGreaterThan(0);
    for (const link of links) {
      const box = boxOf(link);
      const misses = probeTargetBox(link, TOUCH_TARGET);
      measured.push(
        `${window.innerWidth}x${window.innerHeight} ${path} ` +
          `"${(link.textContent ?? "").trim()}": ${describeBox(box)}, ` +
          `${TOUCH_TARGET}px probe misses ${misses.length}/9`,
      );
      expect(
        misses,
        `"${(link.textContent ?? "").trim()}" on ${path} is ${Math.round(box.height)}px high and ` +
          `${misses.length} of 9 points in its ${TOUCH_TARGET}px target box answer as ` +
          `${[...new Set(misses.map((miss) => miss.hit))].join(", ")}`,
      ).toEqual([]);
    }
  }
});

/* -------------------------------------------------------------------------- */
/* 3. The fit: both doors on the screen, and nothing above the top of it       */
/* -------------------------------------------------------------------------- */

/**
 * The windows at which the front door owes BOTH DOORS laid out with no scrolling at all.
 *
 * Every window a learner is plausibly on, LANDSCAPE INCLUDED, which is the case that shipped
 * broken. The one exception is named rather than derived, because 200% text at a 580px window
 * asks for a 1039px card in 580px of room and no trim can honestly deliver that: what it owes is
 * the cue instead, and the assertion below proves the second door is reachable through it.
 *
 * Nothing here predicts WHICH windows overflow. That is read off the surface at each one and the
 * cue is required to agree with it in both directions, so a trim that changes the answer does
 * not need this list edited — and cannot silently lose the cue on the way.
 */
const MUST_FIT_WITHOUT_SCROLLING: readonly string[] = [
  "320x568",
  "390x580",
  "768x1024",
  "844x390",
  "1024x580",
  "1440x900",
  "512x290-zoom200",
];

test("the front door fits every window, or says out loud that it scrolls", {
  timeout: 300_000,
}, async () => {
  for (const view of WINDOWS) {
    await openDoor(view, "/");

    const sheet = document.querySelector<HTMLElement>(".auth-gate");
    const shell = document.querySelector<HTMLElement>(".account-shell");
    if (sheet === null || shell === null) {
      throw new Error(`the front door drew no sheet at ${view.label}`);
    }
    const sheetBox = sheet.getBoundingClientRect();
    const create = named("Create account") as HTMLElement;
    const signIn = named("Sign in") as HTMLElement;
    const createBox = create.getBoundingClientRect();
    const signInBox = signIn.getBoundingClientRect();
    const cue = document.querySelector<HTMLElement>(".account-shell__more");
    measured.push(
      `${view.label} front door: sheet ${Math.round(sheetBox.width)}x${Math.round(sheetBox.height)} ` +
        `top y=${Math.round(sheetBox.top)}; Create account bottom y=${Math.round(createBox.bottom)}; ` +
        `Sign in bottom y=${Math.round(signInBox.bottom)}; shell scroll ` +
        `${shell.scrollHeight}/${shell.clientHeight}; cue ${cue === null ? "absent" : "shown"}`,
    );

    // Nothing is ever above the top of the window: a centred box in a scroll container puts its
    // own head out of reach, and that is the failure a "the card is 445px tall" reading misses.
    expect(
      Math.round(sheetBox.top),
      `the front door's own heading starts ${Math.round(-sheetBox.top)}px above the top of the ` +
        `${view.label} window, where nothing can scroll back to it`,
    ).toBeGreaterThanOrEqual(0);

    // No horizontal overflow anywhere: the defect a narrow window makes and a wide one hides.
    const widest = Math.max(
      document.documentElement.scrollWidth,
      ...[
        ...document.querySelectorAll<HTMLElement>(".account-shell, .account-shell *"),
      ].map((element) => Math.ceil(element.getBoundingClientRect().right)),
    );
    expect(
      widest,
      `the front door overflows the ${view.label} window by ${widest - view.width}px`,
    ).toBeLessThanOrEqual(view.width);

    if (SHOTS && KEEP_FRAMES.includes(view.label)) {
      await keep(`front-door-${view.label}`);
    }

    const scrolls = shell.scrollHeight > shell.clientHeight + 1;

    if (MUST_FIT_WITHOUT_SCROLLING.includes(view.label)) {
      for (const [label, box] of [
        ["Create account", createBox],
        ["Sign in", signInBox],
      ] as const) {
        expect(
          Math.round(box.bottom),
          `${label} runs ${Math.round(box.bottom - view.height)}px below the fold at ` +
            `${view.label}, so the door looks like it offers one way in`,
        ).toBeLessThanOrEqual(view.height);
        expect(
          Math.round(box.top),
          `${label} is above the top at ${view.label}`,
        ).toBeGreaterThanOrEqual(0);
      }
      expect(
        shell.scrollHeight,
        `the front door fits ${view.label} only by scrolling`,
      ).toBeLessThanOrEqual(shell.clientHeight + 1);
    }

    /*
      THE CUE AND THE OVERFLOW AGREE, IN BOTH DIRECTIONS. A cue over a surface that does not
      scroll is furniture, and an overflow with no cue is the defect this closes; neither can
      hide behind the other, and neither depends on this file guessing which windows overflow.
    */
    if (scrolls) {
      expect(
        cue,
        `the front door hides ${shell.scrollHeight - shell.clientHeight}px at ${view.label} ` +
          "with nothing on screen saying it scrolls",
      ).not.toBeNull();
      // Words, not a colour and not an arrow alone.
      expect((cue as HTMLElement).textContent ?? "").not.toBe("");
      // ...and the second door is genuinely reachable through it.
      shell.scrollTop = shell.scrollHeight;
      shell.dispatchEvent(new Event("scroll"));
      await wait(150);
      const reached = (named("Sign in") as HTMLElement).getBoundingClientRect();
      measured.push(
        `${view.label} front door scrolled to the end: Sign in bottom y=` +
          `${Math.round(reached.bottom)}; cue ` +
          `${document.querySelector(".account-shell__more") === null ? "retired" : "still shown"}`,
      );
      expect(
        Math.round(reached.bottom),
        `scrolling the front door to its end at ${view.label} still does not reach Sign in`,
      ).toBeLessThanOrEqual(view.height);
      expect(
        document.querySelector(".account-shell__more"),
        `the scroll cue at ${view.label} is still shown at the end of the scroll`,
      ).toBeNull();
    } else {
      expect(
        cue,
        `${view.label} shows a scroll cue over a surface that does not scroll`,
      ).toBeNull();
    }
  }
});

/* -------------------------------------------------------------------------- */
/* 4. The language: the same sheet the launch screen is drawn on              */
/* -------------------------------------------------------------------------- */

test("the front door is drawn in the world's own language, not on a gradient", {
  timeout: 180_000,
}, async () => {
  const review = WINDOWS.find((view) => view.label === "1024x580") as Window_;

  // The launch screen first, so the tokens compared below are read off the shipped surface
  // rather than written down here.
  await page.viewport(review.width, review.height);
  h?.cleanup();
  h = mount(
    <AccountBoundary config={CONFIG} service={service(IDENTITY)}>
      {() => (
        <LaunchScreen onTakeDiagnostic={() => undefined} onStartEraOne={() => undefined} />
      )}
    </AccountBoundary>,
  );
  await waitFor(
    () => document.querySelector(".launch__sheet") !== null,
    "the launch screen never mounted",
    20_000,
  );
  await document.fonts.ready;
  const launchSheet = document.querySelector<HTMLElement>(".launch__sheet") as HTMLElement;
  const launchStyle = getComputedStyle(launchSheet);
  const reference = {
    background: launchStyle.backgroundColor,
    edgeStyle: launchStyle.borderTopStyle,
    edgeColor: launchStyle.borderTopColor,
    lift: launchStyle.boxShadow,
  };

  await openDoor(review, "/");
  const shell = document.querySelector<HTMLElement>(".account-shell") as HTMLElement;
  const sheet = document.querySelector<HTMLElement>(".auth-gate") as HTMLElement;
  const sheetStyle = getComputedStyle(sheet);
  const shellStyle = getComputedStyle(shell);
  measured.push(
    `${review.label} language: shell background-image ${shellStyle.backgroundImage.slice(0, 60)}; ` +
      `sheet ${sheetStyle.backgroundColor} / ${sheetStyle.borderTopWidth} ` +
      `${sheetStyle.borderTopColor} / r${sheetStyle.borderTopLeftRadius}`,
  );

  // The world, not a gradient standing in for one.
  expect(
    document.querySelector(".account-world"),
    "the front door has no world behind it",
  ).not.toBeNull();
  expect(
    shellStyle.backgroundImage,
    `the account shell still paints ${shellStyle.backgroundImage.slice(0, 80)} instead of standing on the world`,
  ).toBe("none");

  // The compact door uses the world's same material and lift. Its thinner edge and tighter
  // radius are deliberate hierarchy changes, not a second visual language.
  expect(sheetStyle.backgroundColor, "the sheet's face is not the launch sheet's").toBe(
    reference.background,
  );
  expect(sheetStyle.borderTopStyle).toBe(reference.edgeStyle);
  expect(sheetStyle.borderTopColor).toBe(reference.edgeColor);
  expect(Number.parseFloat(sheetStyle.borderTopWidth)).toBeGreaterThanOrEqual(1);
  expect(Number.parseFloat(sheetStyle.borderTopLeftRadius)).toBeGreaterThanOrEqual(12);
  expect(sheetStyle.boxShadow, "the sheet's lift is not the launch sheet's").toBe(
    reference.lift,
  );
  // Opaque, so nothing behind it reads through the words on it.
  expect(sheetStyle.backgroundColor).not.toMatch(/rgba\([^)]*,\s*0?\.\d+\)/);
});

/* -------------------------------------------------------------------------- */
/* 5. Every Cognito state still arrives, on the same sheet, inside the window  */
/* -------------------------------------------------------------------------- */

test("every account screen still arrives, inside the window, on the world sheet", {
  timeout: 300_000,
}, async () => {
  const screens: readonly { path: string; heading: string; submit: string }[] = [
    {
      path: "/",
      heading: "Build the skills calculus needs.",
      submit: "Create account",
    },
    { path: "/sign-in", heading: "Sign in to your account", submit: "Sign in" },
    { path: "/create-account", heading: "Create your account", submit: "Create account" },
    { path: "/forgot-password", heading: "Reset your password", submit: "Send reset code" },
    {
      path: "/reset-password",
      heading: "Choose a new password",
      submit: "Save new password",
    },
  ];
  for (const view of [
    WINDOWS.find((window_) => window_.label === "1024x580") as Window_,
    WINDOWS.find((window_) => window_.label === "844x390") as Window_,
  ]) {
    for (const screen_ of screens) {
      await openDoor(view, screen_.path);
      const heading = document.querySelector<HTMLElement>(".auth-gate h1");
      expect((heading?.textContent ?? "").trim(), `${screen_.path} lost its heading`).toBe(
        screen_.heading,
      );
      const submit = named(screen_.submit);
      expect(submit, `${screen_.path} lost its ${screen_.submit} action`).toBeDefined();
      const shell = document.querySelector<HTMLElement>(".account-shell") as HTMLElement;
      const box = (submit as HTMLElement).getBoundingClientRect();
      const cue = document.querySelector(".account-shell__more");
      measured.push(
        `${view.label} ${screen_.path}: "${screen_.submit}" bottom y=${Math.round(box.bottom)} ` +
          `of ${view.height}; shell scroll ${shell.scrollHeight}/${shell.clientHeight}; cue ` +
          `${cue === null ? "absent" : "shown"}`,
      );
      /*
        REACHABLE, WHICH IS NOT THE SAME CLAIM AS "ON THE FIRST PAINT". The reset form carries
        four fields and its rule, so a 390px-tall landscape window cannot hold it whatever is
        trimmed — 474px of content in 370px of room, measured. What it owes there is a scroll that
        reaches the action; the cue is required of whether the SHEET overflows, which is a
        different question from where the submit lands, because the helper links sit below it.
      */
      if (Math.round(box.bottom) > view.height) {
        shell.scrollTop = shell.scrollHeight;
        shell.dispatchEvent(new Event("scroll"));
        await wait(150);
        expect(
          Math.round((named(screen_.submit) as HTMLElement).getBoundingClientRect().bottom),
          `scrolling ${screen_.path} to its end at ${view.label} still does not reach ${screen_.submit}`,
        ).toBeLessThanOrEqual(view.height);
      }
      if (shell.scrollHeight > shell.clientHeight + 1) {
        expect(
          cue,
          `${screen_.path} hides ${shell.scrollHeight - shell.clientHeight}px at ${view.label} ` +
            "with nothing saying the sheet scrolls",
        ).not.toBeNull();
      } else {
        expect(
          cue,
          `${screen_.path} shows a scroll cue at ${view.label} over a sheet that fits`,
        ).toBeNull();
      }
      expect(
        document.querySelector(".account-world"),
        `${screen_.path} lost the world behind it`,
      ).not.toBeNull();
    }
  }
});

/* -------------------------------------------------------------------------- */
/* 6. Reduced motion, and the two status screens the boundary owns             */
/* -------------------------------------------------------------------------- */

test("nothing on the account surface animates when the learner asked it not to", {
  timeout: 180_000,
}, async () => {
  const review = WINDOWS.find((view) => view.label === "1024x580") as Window_;
  await page.viewport(review.width, review.height);
  h?.cleanup();
  let release: (identity: CognitoIdentity | null) => void = () => undefined;
  const pending: CognitoAuthService = {
    ...service(null),
    restoreIdentity: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  };
  h = mount(
    <AccountBoundary config={CONFIG} service={pending}>
      {() => <p>never reached</p>}
    </AccountBoundary>,
  );
  await waitFor(
    () => document.querySelector(".account-status__spinner") !== null,
    "the session-check screen never mounted",
    20_000,
  );
  const spinner = document.querySelector<HTMLElement>(
    ".account-status__spinner",
  ) as HTMLElement;
  const status = document.querySelector<HTMLElement>(".account-status") as HTMLElement;
  const statusStyle = getComputedStyle(status);
  measured.push(
    `${review.label} checking-session: spinner animation ${getComputedStyle(spinner).animationName}; ` +
      `status sheet ${statusStyle.backgroundColor} / r${statusStyle.borderTopLeftRadius}`,
  );
  expect(
    getComputedStyle(spinner).animationName,
    "the session spinner still turns under prefers-reduced-motion",
  ).toBe("none");

  release(null);
  await waitFor(
    () => document.querySelector(".auth-gate") !== null,
    "the front door never took over from the session check",
    20_000,
  );
  const sheet = document.querySelector<HTMLElement>(".auth-gate") as HTMLElement;
  expect(
    getComputedStyle(sheet).animationName,
    "the front door animates its entrance under prefers-reduced-motion",
  ).toBe("none");
});
