import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { commands, page } from "vitest/browser";

import { AccountBoundary } from "../auth/AccountBoundary";
import type { CognitoAuthService, CognitoIdentity } from "../auth/cognitoClient";
import { EconomyHud } from "../economy/EconomyHud";
import type { UseEconomy } from "../economy/useEconomy";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import type { AccountRuntimeConfig } from "../runtimeMode";
import {
  answersOwnCentre,
  boxOf,
  captureFrame,
  clearEmulatedMedia,
  describeBox,
  emulateReducedMotion,
  overlapArea,
  probeTargetBox,
} from "../test/frameEvidence";
import { CitySurface } from "./CitySurface";
import { ONBOARDING_ADVISOR_DONE_KEY } from "./onboarding/onboardingScript";
import { ONBOARDING_DEMO_SEEN_KEY } from "./onboarding/useDemoScript";
import type { CityLoad } from "./types";

import "../styles.css";

/**
 * **THE COMPACT HUD, PRESSED RATHER THAN MEASURED — AND THE HINT THAT SAT ON THE CAMERA.**
 *
 * Mounted the way a brand-new learner gets it: the real `AccountBoundary` with a Cognito
 * stand-in injected as a prop, the real `CitySurface` over an EMPTY island, and the real
 * `EconomyHud` beside it. The empty island matters — it is what makes `place` the current hint,
 * which is the first-use coach-mark the report is about, and a city with buildings on it shows a
 * different one.
 *
 * ## What was measured at `b7bdc6d2`, on that mount
 *
 * **The targets.** City Life's three help triggers were **12.5px** square at 320/390/512 and
 * **13.9px** at 768/844/1024/1440. The coach-mark's *Skip tips* was **49x21** and its *Got it*
 * **70x42**, at every window. All under the 44px floor this repository states for itself
 * (`plague.css`'s "the shared 44px target floor").
 *
 * **The hint.** The `place` coach-mark anchors above the Build button and the camera toolbar sits
 * between the two, so the hint landed on the controls:
 *
 * | window | covered | camera buttons whose own centre answered something else |
 * | --- | --- | --- |
 * | 320x568 | 12,504px² | 5 of 6 |
 * | 390x580 | 8,864px² | 4 of 6 |
 * | 844x390 | 5,642px² | 3 of 6 |
 * | 1024x580 | 2,890px² | 1 of 6 |
 * | 512x290 | 2,520px² | 1 of 6 |
 *
 * `768x1024` and `1440x900` were clear, which is the whole reason a sweep is needed rather than
 * one window: the two windows a developer works at are the two that were fine.
 *
 * ## Why the assertion presses instead of reading a box
 *
 * A compact affordance is allowed to grow its hit area with a pseudo-element, so
 * `getBoundingClientRect()` is the wrong instrument twice over: it reads 13.9px over a target a
 * finger can hit, and it reads 46px over a camera button with a tooltip parked on it. What
 * decides both is what the browser hands a press to. See `probeTargetBox`.
 *
 * Frames need `VITE_CITY_HUD_REACH_SHOTS=1`.
 */

const SHOTS = Boolean(import.meta.env.VITE_CITY_HUD_REACH_SHOTS);

/**
 * The windows whose frame is KEPT, out of the eight measured: the smallest phone, where the hint
 * covered 12,504px² of the toolbar, and the review window, where it covered 2,890.
 */
const KEEP_FRAMES: readonly string[] = ["320x568", "1024x580"];

/** WCAG 2.5.5 and this repository's own floor for anything a finger has to hit. */
const TOUCH_TARGET = 44;

interface Window_ {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly rootFontPx?: number;
}

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

function service(): CognitoAuthService {
  return {
    restoreIdentity: async () => IDENTITY,
    getAccessToken: async () => "access-token",
    signIn: async () => {
      throw new Error("not reached in a frame");
    },
    signUp: async () => ({ confirmationRequired: true }),
    forgotPassword: async () => undefined,
    confirmForgotPassword: async () => undefined,
    signOut: () => undefined,
  };
}

const economy: UseEconomy = {
  wallet: { materials: { stone: 40 }, spendable: 40, spendableMaterial: null },
  reward: null,
  message: "",
  reconcileProgress: () => {},
  reportPracticeSetComplete: async () => null,
  reportInterleavedClear: async () => {},
  reportCivicBootstrap: async () => {},
  refresh: async () => {},
};

/** A brand-new learner's island: nothing placed, so `place` is the hint that shows. */
function firstUseCity(): Promise<CityLoad> {
  return Promise.resolve({
    node_states: [],
    placements: [],
    civic: [],
    roads: [],
    road_gold_spent: 0,
    civic_material_spent: 0,
  });
}

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
const measured: string[] = [];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function openCity(view: Window_): Promise<void> {
  await page.viewport(view.width, view.height);
  h?.cleanup();
  localStorage.clear();
  // The tutorial has been seen, which is the state the contextual hint layer takes over in.
  localStorage.setItem(ONBOARDING_ADVISOR_DONE_KEY, "true");
  localStorage.setItem(ONBOARDING_DEMO_SEEN_KEY, "true");
  document.documentElement.style.fontSize =
    view.rootFontPx === undefined ? "" : `${view.rootFontPx}px`;
  h = mount(
    <AccountBoundary config={CONFIG} service={service()}>
      {() => (
        <div className="city-shell">
          <div className="city-shell__world">
            <CitySurface
              enableCanvas={false}
              enableOnboardingDemo
              reducedMotion
              loadCity={firstUseCity}
            />
            <EconomyHud economy={economy} reducedMotion />
          </div>
        </div>
      )}
    </AccountBoundary>,
  );
  await waitFor(
    () => document.querySelector("button.city-build-button") !== null,
    `the city never mounted at ${view.label}`,
    30_000,
  );
  await waitFor(
    () => document.querySelector(".coach-mark") !== null,
    `the first-use hint never appeared at ${view.label}`,
    20_000,
  );
  await document.fonts.ready;
  await wait(600);
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
  document.body.innerHTML = "";
});

afterAll(async () => {
  await clearEmulatedMedia();
  if (SHOTS) {
    await commands.writeFile(
      "docs/design-refs/city-hud-reach/measured.txt",
      [
        "Measured beside the frames in docs/design-refs/city-hud-reach, under an emulated",
        "prefers-reduced-motion: reduce, by cityHudReach.browser.test.tsx in the same run.",
        "The city is mounted the way a first-use learner gets it: the real AccountBoundary with",
        "the Cognito service injected as a prop, an empty island, and the real EconomyHud. Every",
        "figure is in CSS pixels, in the window named at the start of its line.",
        "",
        "The 3D scene is OFF in this suite, so the frames show the no-WebGL island fallback. Every",
        "claim here is HUD against HUD — the hint's box against the camera toolbar's, and what a",
        "press at a control's centre resolves to — and both are DOM at positions the canvas does",
        "not move. What the scene would change is only what is painted behind them.",
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
/* 1. The compact affordances, pressed                                        */
/* -------------------------------------------------------------------------- */

/**
 * **THE ONE WINDOW WHERE CITY LIFE'S TRIGGERS ARE NOT ASKED FOR A 44px BOX, and the reason is
 * not that they are small.**
 *
 * At 512x290 — the review window under 200% browser zoom — the City Life panel and the camera
 * toolbar OVERLAP, and they did before any of this: measured on the learner mount at `b7bdc6d2`,
 * the happiness row ran y=160.6..196 while the camera bar sat at y=170..224, so the bottom 26px
 * of the panel was already under a toolbar that paints above it. A 44px target box cannot be this
 * panel's to give at a window where 26px of the panel is not its own, and stopping the two HUD
 * clusters overlapping is a separate lane's item.
 *
 * So it is NAMED rather than quietly dropped, and the exemption is asserted both ways: the
 * overlap it excuses has to still be there, so the day that lane lands this entry fails as a
 * stale excuse instead of sitting here exempting nothing. Everything else at this window — both
 * hint actions, and the hint's clearance of the camera — is still swept.
 */
const CITY_LIFE_UNDER_THE_CAMERA: readonly string[] = ["512x290-zoom200"];

test("every compact HUD affordance is a 44px target nothing else answers inside", {
  timeout: 500_000,
}, async () => {
  for (const view of WINDOWS) {
    await openCity(view);

    const excused = CITY_LIFE_UNDER_THE_CAMERA.includes(view.label);
    if (excused) {
      const panel = document.querySelector<HTMLElement>(".hud-vitality");
      const toolbar = document.querySelector<HTMLElement>(".hud-camera");
      if (panel === null || toolbar === null) {
        throw new Error(`${view.label} drew no City Life panel or no camera toolbar`);
      }
      const clash = Math.round(overlapArea(boxOf(panel), boxOf(toolbar)));
      measured.push(
        `${view.label} City Life excused: panel and camera toolbar overlap by ${clash}px²`,
      );
      expect(
        clash,
        `${view.label} is listed as a window where the City Life panel sits under the camera ` +
          "toolbar, and the two no longer overlap. Take it out of CITY_LIFE_UNDER_THE_CAMERA and " +
          "let the 44px probe run there",
      ).toBeGreaterThan(0);
    }

    const helpTriggers = excused
      ? []
      : [...document.querySelectorAll<HTMLElement>(".hud-vitality-help")];
    const compact: readonly { readonly label: string; readonly element: HTMLElement }[] = [
      ...helpTriggers.map((element) => ({
        label: `City Life / ${element.getAttribute("aria-label") ?? "help"}`,
        element,
      })),
      ...[...document.querySelectorAll<HTMLElement>(".coach-mark__dismiss")].map(
        (element) => ({ label: "first-use hint / Got it", element }),
      ),
      ...[...document.querySelectorAll<HTMLElement>(".coach-mark__skip")].map(
        (element) => ({
          label: "first-use hint / Skip tips",
          element,
        }),
      ),
    ];
    // FLOOR AND COMPOSITION: three help triggers and both hint actions, or this sweep is
    // measuring a narrower surface than the one that shipped.
    expect(
      compact.map((entry) => entry.label).filter((label) => label.startsWith("City Life")),
      `${view.label} drew ${compact.length} compact affordances`,
    ).toHaveLength(excused ? 0 : 3);
    expect(
      compact.filter((entry) => entry.label.startsWith("first-use hint")),
    ).toHaveLength(2);

    for (const { label, element } of compact) {
      const box = boxOf(element);
      const misses = probeTargetBox(element, TOUCH_TARGET);
      measured.push(
        `${view.label} ${label}: painted ${box.width.toFixed(1)}x${box.height.toFixed(1)}px, ` +
          `${TOUCH_TARGET}px target probe misses ${misses.length}/9` +
          (misses.length === 0
            ? ""
            : ` (${[...new Set(misses.map((miss) => miss.hit))].join(", ")})`),
      );
      expect(
        misses,
        `${label} at ${view.label} paints ${box.width.toFixed(1)}x${box.height.toFixed(1)}px and ` +
          `${misses.length} of 9 points in its ${TOUCH_TARGET}px target box answer as ` +
          `${[...new Set(misses.map((miss) => miss.hit))].join(", ")}`,
      ).toEqual([]);
    }
  }
});

/* -------------------------------------------------------------------------- */
/* 2. The first-use hint leaves the camera controls alone                     */
/* -------------------------------------------------------------------------- */

test("the first-use hint covers no part of the camera controls", {
  timeout: 500_000,
}, async () => {
  for (const view of WINDOWS) {
    await openCity(view);

    const hint = document.querySelector<HTMLElement>(".coach-mark");
    const camera = document.querySelector<HTMLElement>(".hud-camera");
    if (hint === null || camera === null) {
      throw new Error(`the ${view.label} city drew no hint or no camera toolbar`);
    }
    // The hint being measured is the FIRST-USE one, not whichever hint happens to be up: a
    // sweep that silently moved onto a different mark would report a clearance nobody asked
    // about.
    expect(hint.dataset.coachMark, `${view.label} showed a different hint`).toBe("place");

    const covered = overlapArea(boxOf(camera), boxOf(hint));
    /*
      TAKEN BY THE HINT, which is a narrower question than "answers its own centre" and is the
      one this file is about. A camera button can lose its own centre to something else entirely
      — at 844x390 the Build dock's box overlaps the toolbar's last button and wins it, measured
      before any of this and on a tree with no hint up at all — and folding that into this
      assertion would make a hint guard fail for a dock defect and a dock fix look like a hint
      fix. Reported, not asserted here.
    */
    const taken = [...camera.querySelectorAll<HTMLElement>("button")]
      .map((button) => ({
        name: button.getAttribute("aria-label") ?? "camera button",
        ...answersOwnCentre(button),
      }))
      .filter((entry) => entry.hit.includes("coach-mark"));
    const otherwise = [...camera.querySelectorAll<HTMLElement>("button")]
      .map((button) => ({
        name: button.getAttribute("aria-label") ?? "camera button",
        ...answersOwnCentre(button),
      }))
      .filter((entry) => !entry.own && !entry.hit.includes("coach-mark"));
    measured.push(
      `${view.label} first-use hint: ${Math.round(covered)}px² of the camera toolbar covered; ` +
        `${taken.length} of 6 camera buttons answer the hint` +
        (otherwise.length === 0
          ? ""
          : `; ${otherwise.length} answer something else (${otherwise
              .map((entry) => `${entry.name} -> ${entry.hit}`)
              .join("; ")})`),
    );

    expect(
      Math.round(covered),
      `the first-use hint covers ${Math.round(covered)}px² of the camera toolbar at ` +
        `${view.label}: hint ${describeBox(boxOf(hint))}, toolbar ${describeBox(boxOf(camera))}`,
    ).toBe(0);
    expect(
      taken,
      `the first-use hint takes the press at the centre of ${taken.length} camera control(s) ` +
        `at ${view.label}: ${taken.map((entry) => entry.name).join("; ")}`,
    ).toEqual([]);
    // ...and it is still glued to the control it is about, rather than parked in a corner.
    const build = document.querySelector<HTMLElement>(".city-build-button");
    if (build === null) {
      throw new Error("the city drew no Build button for the hint to point at");
    }
    const buildBox = boxOf(build);
    const hintBox = boxOf(hint);
    const distance = Math.hypot(
      hintBox.left + hintBox.width / 2 - (buildBox.left + buildBox.width / 2),
      hintBox.top + hintBox.height / 2 - (buildBox.top + buildBox.height / 2),
    );
    measured.push(
      `${view.label} first-use hint sits ${Math.round(distance)}px from the Build button it is about`,
    );
    expect(
      Math.round(distance),
      `the first-use hint was moved ${Math.round(distance)}px from the Build button it points at ` +
        `at ${view.label}, which is a hint about nothing`,
    ).toBeLessThanOrEqual(Math.round(Math.hypot(view.width, view.height) / 2));
    expect(
      Math.round(overlapArea(buildBox, hintBox)),
      `the first-use hint covers the Build button it is about at ${view.label}`,
    ).toBe(0);

    if (SHOTS && KEEP_FRAMES.includes(view.label)) {
      await commands.writeFile(
        `docs/design-refs/city-hud-reach/first-use-hint-${view.label}.png`,
        await captureFrame(),
        { encoding: "base64" },
      );
    }
  }
});

/* -------------------------------------------------------------------------- */
/* 3. Reduced motion                                                          */
/* -------------------------------------------------------------------------- */

test("the first-use hint arrives without motion when the learner asked it not to", {
  timeout: 120_000,
}, async () => {
  await openCity(WINDOWS.find((view) => view.label === "1024x580") as Window_);
  const hint = document.querySelector<HTMLElement>(".coach-mark") as HTMLElement;
  expect(
    getComputedStyle(hint).animationName,
    "the first-use hint still fades in under prefers-reduced-motion",
  ).toBe("none");
});
