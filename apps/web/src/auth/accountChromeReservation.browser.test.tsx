import { useState } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { CitySurface } from "../city/CitySurface";
import { createCityDevSession } from "../city/citySession";
import { EconomyHud } from "../economy/EconomyHud";
import { createInMemoryEconomyClient } from "../economy/economySession";
import { useEconomy } from "../economy/useEconomy";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import type { AccountRuntimeConfig } from "../runtimeMode";
import { AccountBoundary } from "./AccountBoundary";
import type { CognitoAuthService, CognitoIdentity } from "./cognitoClient";

import "../styles.css";

/**
 * **THE SIGNED-IN ORDINARY ACCOUNT MOUNT, PHOTOGRAPHED, AGAINST THE STONE HUD AND THE BAY
 * MASTHEAD — real `AccountBoundary`, real `CitySurface`, real `EconomyHud`, real
 * `ArchipelagoOverview`, never `?dev`.**
 *
 * `.cursor/rules/qa-verification.mdc`: a spatial claim ("no overlap") owes a rendered frame
 * someone looked at, at a named, realistic viewport, on the surface an ordinary learner
 * actually gets. `.account-chrome` is `position: fixed` at the top centre and renders as a
 * SIBLING of whatever the account boundary's `children` shows, mounted AFTER it — so nothing
 * under it can push it out of the way through ordinary layout, and only a rendered frame
 * (not a computed box read off one component in isolation) shows what is actually painted
 * behind it.
 *
 * ## THE TWO COLLISIONS
 *
 *  1. **The Stone HUD** (`EconomyHud`, era one's material stockpile) sits top-LEFT
 *     (`.economy-hud { top: var(--space-lg); left: var(--space-lg) }`), while the chrome
 *     sits top-CENTER — so the two only share pixels on a narrow phone, where the chrome's
 *     own width reaches the HUD's lane. Reproduced at 390x580; NOT expected at 1024x580.
 *  2. **The Bay's masthead** (`.archipelago-island-banner`, "☰ Menu → The bay") sits
 *     top-CENTER too (`top: 12px; left: 50%; transform: translateX(-50%)`) — the exact same
 *     lane as the chrome, so it collides at BOTH ruled viewports regardless of width.
 *
 * Both are mounted through the real `AccountBoundary` with a Cognito stand-in passed as its
 * `service` PROP — never a module mock (`test/browserModeModuleMocker.test.ts` bans `vi.mock`
 * in browser mode; see `ordinaryLaunchShots.browser.test.tsx`'s own note on why).
 *
 * ## WHAT RUNS EVERY TIME
 *
 * The frames need `VITE_ACCOUNT_CHROME_SHOTS=1`:
 *
 *   VITE_ACCOUNT_CHROME_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/auth/accountChromeReservation.browser.test.tsx
 *
 * What runs on every ordinary run is the numeric half a picture cannot assert: at both
 * windows, the chrome shares zero pixels with either surface, stays reachable by keyboard
 * with a visible focus ring, and the reservation is entirely absent from an unauthenticated
 * (demo-shaped) mount of the same components.
 */

const SHOTS = Boolean(import.meta.env.VITE_ACCOUNT_CHROME_SHOTS);

const WINDOWS = [
  { label: "1024x580", width: 1024, height: 580 },
  { label: "390x580", width: 390, height: 580 },
] as const;

const CONFIG: AccountRuntimeConfig = {
  userPoolId: "us-east-1_pool",
  clientId: "public-client",
  region: "us-east-1",
  diagnosticApiUrl: "/api/diagnostic",
};

const IDENTITY: CognitoIdentity = {
  studentId: "22222222-2222-4222-8222-222222222222" as CognitoIdentity["studentId"],
  email: "learner@example.test",
};

/** A Cognito stand-in, passed as a prop, never a module mock. */
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

const ECONOMY_CLIENT = createInMemoryEconomyClient(null);

/**
 * The city as `App` composes it: `CitySurface` with the stockpile HUD as its SIBLING, inside
 * `.city-shell` so the panel tokens (`--glass-fill-strong` and neighbours, declared on
 * `.city-shell` rather than at `:root`) resolve instead of painting every panel transparent.
 */
function SignedInCity({ bay }: { readonly bay: boolean }) {
  const economy = useEconomy(ECONOMY_CLIENT);
  const [city] = useState(() => createCityDevSession());
  return (
    <div className="city-shell">
      <CitySurface
        enableCanvas={false}
        bayAvailable={bay}
        loadCity={city.load}
        onPlaceSkill={city.placeSkill}
      />
      <EconomyHud economy={economy} reducedMotion />
    </div>
  );
}

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
const measured: string[] = [];

function session() {
  return cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data?: string }>;
  };
}

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
  await commands.writeFile(`docs/design-refs/account-chrome/${name}.png`, shot, {
    encoding: "base64",
  });
}

async function reducedMotion(): Promise<void> {
  await session().send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
}

function named(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find(
    (button) =>
      (button.getAttribute("aria-label") ?? button.textContent ?? "").trim() === label,
  );
}

function overlapArea(one: DOMRect, other: DOMRect): number {
  return (
    Math.max(0, Math.min(one.right, other.right) - Math.max(one.left, other.left)) *
    Math.max(0, Math.min(one.bottom, other.bottom) - Math.max(one.top, other.top))
  );
}

async function openTheBay(): Promise<void> {
  const menu = named("Menu");
  if (!menu) {
    throw new Error("the city drew no Menu button");
  }
  menu.click();
  await waitFor(
    () => document.querySelector('[data-testid="menu-bay"]') !== null,
    "the archipelago menu row did not mount",
    10000,
  );
  document.querySelector<HTMLButtonElement>('[data-testid="menu-bay"]')?.click();
  await waitFor(
    () => document.querySelector('[data-testid="archipelago-overview"]') !== null,
    "the bay overview never mounted",
    10000,
  );
}

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await reducedMotion();
});

afterEach(() => {
  h?.cleanup();
  h = null;
  localStorage.clear();
  document.documentElement.style.removeProperty("--account-chrome-clear");
});

afterAll(async () => {
  await session().send("Emulation.setEmulatedMedia", { features: [] });
  if (SHOTS) {
    await commands.writeFile(
      "docs/design-refs/account-chrome/measured.txt",
      [
        "Measured on the frames in docs/design-refs/account-chrome, under an emulated",
        "prefers-reduced-motion: reduce, by accountChromeReservation.browser.test.tsx.",
        "Every box is in CSS pixels, in the viewport named at the start of its line.",
        "Both surfaces are mounted through the real AccountBoundary with the Cognito service",
        "injected as a prop, so the account chrome and the city/Bay are the shipped article.",
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

test("the signed-in account chrome shares no pixels with the Stone HUD or the Bay masthead", {
  timeout: 120_000,
}, async () => {
  for (const window_ of WINDOWS) {
    await page.viewport(window_.width, window_.height);
    h?.cleanup();
    localStorage.clear();
    window.history.replaceState(null, "", "/");

    h = mount(
      <AccountBoundary config={CONFIG} service={service(IDENTITY)}>
        {() => <SignedInCity bay />}
      </AccountBoundary>,
    );
    await waitFor(
      () => named("Build") !== undefined,
      "the signed-in city never mounted",
      15000,
    );
    await document.fonts.ready;

    const chrome = document.querySelector<HTMLElement>(".account-chrome");
    const chromeBox = chrome?.getBoundingClientRect();
    if (!chrome || !chromeBox) {
      throw new Error("the account chrome is missing, so its occlusion cannot be measured");
    }

    // THE ACCOUNT STATUS/SIGNOUT STAY AVAILABLE. `.account-chrome` still renders "Signed
    // in" and a working Sign out button beside whatever screen is showing.
    expect(chrome.textContent).toContain("Signed in");
    const signOut = named("Sign out");
    if (!signOut) {
      throw new Error("Sign out is missing from the account chrome");
    }

    // 1. THE STONE HUD.
    const stoneHud = document.querySelector<HTMLElement>(".economy-hud-bar");
    const stoneBox = stoneHud?.getBoundingClientRect();
    if (!stoneHud || !stoneBox) {
      throw new Error("the Stone HUD is missing, so its occlusion cannot be measured");
    }
    const stoneOverlap = Math.round(overlapArea(chromeBox, stoneBox));
    measured.push(
      `${window_.label} Stone HUD: chrome at (${Math.round(chromeBox.left)}, ${Math.round(chromeBox.top)})-(${Math.round(chromeBox.right)}, ${Math.round(chromeBox.bottom)}), ` +
        `HUD at (${Math.round(stoneBox.left)}, ${Math.round(stoneBox.top)})-(${Math.round(stoneBox.right)}, ${Math.round(stoneBox.bottom)}), overlap=${stoneOverlap}px²`,
    );
    expect(
      stoneOverlap,
      `the account chrome covers ${stoneOverlap}px² of the Stone HUD at ${window_.label}`,
    ).toBe(0);

    if (SHOTS) {
      await keep(`city-with-stone-hud-${window_.label}`, await capture());
    }

    // 2. THE BAY MASTHEAD.
    await openTheBay();
    await document.fonts.ready;
    const banner = document.querySelector<HTMLElement>(".archipelago-island-banner");
    const bannerBox = banner?.getBoundingClientRect();
    if (!banner || !bannerBox) {
      throw new Error("the Bay drew no masthead, so its occlusion cannot be measured");
    }
    // The chrome is still the exact same DOM node (a sibling that outlives the Bay
    // opening), so re-read its box in case scrolling/layout moved it.
    const chromeBoxNow = chrome.getBoundingClientRect();
    const bayOverlap = Math.round(overlapArea(chromeBoxNow, bannerBox));
    measured.push(
      `${window_.label} Bay masthead: chrome at (${Math.round(chromeBoxNow.left)}, ${Math.round(chromeBoxNow.top)})-(${Math.round(chromeBoxNow.right)}, ${Math.round(chromeBoxNow.bottom)}), ` +
        `masthead at (${Math.round(bannerBox.left)}, ${Math.round(bannerBox.top)})-(${Math.round(bannerBox.right)}, ${Math.round(bannerBox.bottom)}), overlap=${bayOverlap}px²`,
    );
    expect(
      bayOverlap,
      `the account chrome covers ${bayOverlap}px² of the Bay masthead at ${window_.label}`,
    ).toBe(0);
    // The title text itself is readable inside the banner (not merely that the banner's
    // own box clears the chrome — the banner could clear it while its own heading text
    // still ran under something else).
    const title = document.querySelector<HTMLElement>('[data-testid="archipelago-title"]');
    const titleBox = title?.getBoundingClientRect();
    if (!title || !titleBox) {
      throw new Error("the Bay drew no title inside its masthead");
    }
    expect(
      Math.round(overlapArea(chromeBoxNow, titleBox)),
      `the account chrome covers the Bay's own title text at ${window_.label}`,
    ).toBe(0);

    if (SHOTS) {
      await keep(`bay-masthead-${window_.label}`, await capture());
    }
  }
});

test("the account chrome stays reachable by keyboard, with a visible focus ring", {
  timeout: 60_000,
}, async () => {
  await page.viewport(1024, 580);
  h?.cleanup();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  h = mount(
    <AccountBoundary config={CONFIG} service={service(IDENTITY)}>
      {() => <SignedInCity bay={false} />}
    </AccountBoundary>,
  );
  await waitFor(
    () => named("Build") !== undefined,
    "the signed-in city never mounted",
    15000,
  );

  const signOut = named("Sign out");
  if (!signOut) {
    throw new Error("Sign out is missing from the account chrome");
  }
  signOut.focus();
  expect(document.activeElement).toBe(signOut);
  expect(
    signOut.matches(":focus-visible"),
    "focusing Sign out draws no visible focus ring",
  ).toBe(true);

  const box = signOut.getBoundingClientRect();
  measured.push(
    `keyboard: Sign out at (${Math.round(box.left)}, ${Math.round(box.top)}) ` +
      `${Math.round(box.width)}x${Math.round(box.height)}px`,
  );
  // Big enough for a finger even though it is not the primary touch surface: the chrome
  // is a persistent status strip, not a button grid, and 32px is its own floor
  // (`.account-chrome button { min-height: 32px }`) — asserted here rather than against
  // WCAG's 44px so a future retune of THAT number, not this one, is what breaks this line.
  expect(Math.round(box.height)).toBeGreaterThanOrEqual(32);
});

test("the account-chrome reservation never reaches an unauthenticated / demo-shaped mount", {
  timeout: 60_000,
}, async () => {
  await page.viewport(390, 580);
  h?.cleanup();
  localStorage.clear();
  window.history.replaceState(null, "", "/demo");

  // The exact composition `/demo` and local mode use: no `AccountBoundary`, so no chrome
  // and nothing to reserve space for.
  h = mount(<SignedInCity bay />);
  await waitFor(
    () => named("Build") !== undefined,
    "the demo-shaped city never mounted",
    15000,
  );
  await document.fonts.ready;

  expect(document.querySelector(".account-chrome")).toBeNull();
  expect(
    getComputedStyle(document.documentElement).getPropertyValue("--account-chrome-clear"),
  ).toBe("");

  const stoneHud = document.querySelector<HTMLElement>(".economy-hud");
  if (!stoneHud) {
    throw new Error("the Stone HUD is missing");
  }
  // Unreserved: the ORIGINAL `var(--space-lg)` position, byte for byte what `/demo` shipped
  // with before this change — `max(16px, var(--account-chrome-clear, 0px))` resolves to
  // `16px` the instant the custom property is unset, which is what the assertion above
  // already established for this mount.
  expect(Math.round(stoneHud.getBoundingClientRect().top)).toBe(16);

  await openTheBay();
  const banner = document.querySelector<HTMLElement>(".archipelago-island-banner");
  if (!banner) {
    throw new Error("the Bay drew no masthead");
  }
  // 390px is inside archipelago.css's own `@media (max-width: 600px)` re-layout, whose
  // unreserved top is `8px` (not the base rule's `12px`) — still the byte-for-byte original
  // value at THIS width, which is what "the reservation never leaks in" means at every width.
  expect(Math.round(banner.getBoundingClientRect().top)).toBe(8);
});
