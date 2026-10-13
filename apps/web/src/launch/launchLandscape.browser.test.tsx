import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { commands, page } from "vitest/browser";

import { AccountBoundary } from "../auth/AccountBoundary";
import type { CognitoAuthService, CognitoIdentity } from "../auth/cognitoClient";
import { type Harness, mount, waitFor } from "../lessons/testHarness";
import type { AccountRuntimeConfig } from "../runtimeMode";
import {
  captureFrame,
  clearEmulatedMedia,
  emulateReducedMotion,
} from "../test/frameEvidence";
import { LaunchScreen } from "./LaunchScreen";

import "../styles.css";

/**
 * **THE LAUNCH SCREEN IN LANDSCAPE, WHERE ITS SECOND DOOR FELL OFF THE BOTTOM.**
 *
 * `ordinaryLaunchShots.browser.test.tsx` already holds this screen at 1024x580 and 390x580 and
 * both are green, which is exactly why this file exists: the defect is in the windows those two
 * do not name. Measured on the ordinary learner mount at `b7bdc6d2`:
 *
 *  - **844x390** (a phone held sideways). The two-column rule was keyed on
 *    `(min-width: 700px) and (min-height: 460px)`, so a 390px-tall window fell back to the
 *    STACKED layout: *Take the diagnostic* at y=246..290, *Start at Era 1* at y=398..442 — 52px
 *    below the fold — and the footnote at y=466. The sheet's own `overflow-y: auto` meant the
 *    98px underneath was reachable by scrolling and nothing on the screen said so, so a learner's
 *    first paint offered one route and looked like it offered one route.
 *  - **512x290**, which is that review window under 200% browser zoom, and **1024x580 at 200%
 *    text**: 191px and 79px of the sheet hidden with the same silence.
 *
 * The fix is therefore two things, and they are not the same thing: landscape gets BOTH DOORS,
 * and a window that genuinely cannot hold the sheet gets a CUE saying it scrolls. A cue in place
 * of the second door would have been the cheaper half of the fix passing for the whole of it.
 *
 * Frames need `VITE_LAUNCH_LANDSCAPE_SHOTS=1`.
 */

const SHOTS = Boolean(import.meta.env.VITE_LAUNCH_LANDSCAPE_SHOTS);

/**
 * The windows whose frame is KEPT, out of the eight measured: the landscape phone that offered
 * one route, and the magnified window that owes a cue instead of a fit.
 */
const KEEP_FRAMES: readonly string[] = ["844x390", "512x290-zoom200"];

interface Window_ {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly rootFontPx?: number;
  /** Both routes laid out inside the window at first paint, with no scrolling. */
  readonly bothRoutes: boolean;
}

const WINDOWS: readonly Window_[] = [
  { label: "320x568", width: 320, height: 568, bothRoutes: true },
  { label: "390x580", width: 390, height: 580, bothRoutes: true },
  { label: "768x1024", width: 768, height: 1024, bothRoutes: true },
  { label: "844x390", width: 844, height: 390, bothRoutes: true },
  { label: "1024x580", width: 1024, height: 580, bothRoutes: true },
  { label: "1440x900", width: 1440, height: 900, bothRoutes: true },
  { label: "512x290-zoom200", width: 512, height: 290, bothRoutes: false },
  {
    label: "1024x580-text200",
    width: 1024,
    height: 580,
    rootFontPx: 32,
    bothRoutes: false,
  },
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

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;
const measured: string[] = [];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function action(label: string): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>(".launch__action")].find(
    (button) => (button.textContent ?? "").trim() === label,
  );
  if (!found) {
    throw new Error(`the launch screen drew no "${label}" action`);
  }
  return found;
}

async function openLaunch(view: Window_): Promise<void> {
  await page.viewport(view.width, view.height);
  h?.cleanup();
  localStorage.clear();
  document.documentElement.style.fontSize =
    view.rootFontPx === undefined ? "" : `${view.rootFontPx}px`;
  window.history.replaceState(null, "", "/");
  h = mount(
    <AccountBoundary config={CONFIG} service={service()}>
      {() => (
        <LaunchScreen onTakeDiagnostic={() => undefined} onStartEraOne={() => undefined} />
      )}
    </AccountBoundary>,
  );
  await waitFor(
    () => document.querySelector('[data-testid="ordinary-launch"]') !== null,
    `the launch screen never mounted at ${view.label}`,
    20_000,
  );
  await document.fonts.ready;
  // The island is a lazy WebGL scene. The first capture is a throwaway: a clipped capture puts a
  // device-metrics override on the page, which R3F reads as a resize and re-renders through.
  await wait(1_100);
  await captureFrame();
  await wait(400);
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
  window.history.replaceState(null, "", "/");
});

afterAll(async () => {
  await clearEmulatedMedia();
  if (SHOTS) {
    await commands.writeFile(
      "docs/design-refs/launch-landscape/measured.txt",
      [
        "Measured beside the frames in docs/design-refs/launch-landscape, under an emulated",
        "prefers-reduced-motion: reduce, by launchLandscape.browser.test.tsx in the same run.",
        "Every box is in CSS pixels, in the window named at the start of its line. The screen is",
        "mounted through the real AccountBoundary with the Cognito service injected as a prop, so",
        "the account chrome floating over the masthead is the shipped article.",
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

test("both launch routes survive landscape, and a window that must scroll says so", {
  timeout: 400_000,
}, async () => {
  for (const view of WINDOWS) {
    await openLaunch(view);

    const sheet = document.querySelector<HTMLElement>(".launch__sheet");
    const routes = document.querySelector<HTMLElement>(".launch__routes");
    if (sheet === null || routes === null) {
      throw new Error(`the launch screen drew no sheet at ${view.label}`);
    }
    const diagnostic = action("Take the diagnostic").getBoundingClientRect();
    const eraOne = action("Start at Era 1").getBoundingClientRect();
    const footnote = document
      .querySelector<HTMLElement>(".launch__footnote")
      ?.getBoundingClientRect();
    const cue = document.querySelector<HTMLElement>(".launch__more");
    const columns = getComputedStyle(routes).gridTemplateColumns.split(" ").length;
    measured.push(
      `${view.label} launch: ${columns} column(s); Take the diagnostic bottom y=` +
        `${Math.round(diagnostic.bottom)}; Start at Era 1 bottom y=${Math.round(eraOne.bottom)}; ` +
        `footnote bottom y=${footnote === undefined ? "absent" : Math.round(footnote.bottom)}; ` +
        `sheet scroll ${sheet.scrollHeight}/${sheet.clientHeight}; cue ` +
        `${cue === null ? "absent" : `"${(cue.textContent ?? "").trim()}"`}`,
    );

    if (SHOTS && KEEP_FRAMES.includes(view.label)) {
      await commands.writeFile(
        `docs/design-refs/launch-landscape/launch-${view.label}.png`,
        await captureFrame(),
        { encoding: "base64" },
      );
    }

    if (view.bothRoutes) {
      for (const [label, box] of [
        ["Take the diagnostic", diagnostic],
        ["Start at Era 1", eraOne],
      ] as const) {
        expect(
          Math.round(box.bottom),
          `${label} runs ${Math.round(box.bottom - view.height)}px below the fold at ` +
            `${view.label}, so the first paint offers one route and looks like it offers one`,
        ).toBeLessThanOrEqual(view.height);
        expect(
          Math.round(box.top),
          `${label} starts above the top of the ${view.label} window`,
        ).toBeGreaterThanOrEqual(0);
      }
      // ...and the whole sheet, not only its buttons: `.launch` is `overflow: hidden`, so the
      // footnote saying the diagnostic stays available is unreachable and not merely below.
      expect(
        sheet.scrollHeight,
        `the launch sheet fits ${view.label} only by scrolling inside itself`,
      ).toBeLessThanOrEqual(sheet.clientHeight + 1);
      expect(
        cue,
        `${view.label} shows a scroll cue over a sheet that does not scroll`,
      ).toBeNull();
    } else {
      expect(
        sheet.scrollHeight,
        `${view.label} claims to need a scroll cue but the sheet does not overflow`,
      ).toBeGreaterThan(sheet.clientHeight + 1);
      expect(
        cue,
        `the launch sheet hides ${sheet.scrollHeight - sheet.clientHeight}px at ${view.label} ` +
          "with nothing on the screen saying it scrolls",
      ).not.toBeNull();
      // Not a colour and not an arrow alone: the cue carries words.
      expect((cue as HTMLElement).textContent ?? "").not.toBe("");
      // And it retires once the learner reaches the end, so it never becomes furniture.
      sheet.scrollTop = sheet.scrollHeight;
      sheet.dispatchEvent(new Event("scroll"));
      await wait(120);
      expect(
        document.querySelector(".launch__more"),
        `the scroll cue at ${view.label} is still shown at the bottom of the sheet`,
      ).toBeNull();
      expect(
        Math.round(action("Start at Era 1").getBoundingClientRect().bottom),
        `scrolling to the end of the sheet at ${view.label} still does not reach the second route`,
      ).toBeLessThanOrEqual(view.height);
    }
  }
});

test("the landscape layout is reached by width and height together, not by orientation", {
  timeout: 120_000,
}, async () => {
  /*
    A GUARD ON THE RULE ITSELF. Two columns are right when there is room for two columns, which
    is a question about the box and not about which way a phone is held: an `orientation` query
    would put two 160px columns side by side in a 320x568 window turned sideways. So the pairing
    is asserted directly — a narrow landscape window keeps the stack, and a wide short one takes
    the columns.
  */
  await openLaunch({ label: "560x320", width: 560, height: 320, bothRoutes: false });
  const narrow = document.querySelector<HTMLElement>(".launch__routes") as HTMLElement;
  const narrowColumns = getComputedStyle(narrow).gridTemplateColumns.split(" ").length;
  measured.push(
    `560x320 launch: ${narrowColumns} column(s) (landscape, too narrow to split)`,
  );
  expect(
    narrowColumns,
    "a 560px-wide landscape window was split into columns too narrow to read",
  ).toBe(1);

  await openLaunch({ label: "844x390", width: 844, height: 390, bothRoutes: true });
  const wide = document.querySelector<HTMLElement>(".launch__routes") as HTMLElement;
  expect(
    getComputedStyle(wide).gridTemplateColumns.split(" ").length,
    "an 844x390 landscape window did not take the two-column layout",
  ).toBe(2);
});
