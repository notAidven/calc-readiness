/**
 * A PHOTOGRAPH of the whole in-city lesson panel, inside the scene it ships in, on a short
 * laptop screen.
 *
 * D1's round-4 QA reported that NUM.S slide 0's worked-example card is cut off by the scene's
 * pinned action tray at 1024x580, and the authoring pass could not act on it: nothing in the
 * tree reproduced the frame, so the only options were a blind layout edit to a surface every
 * domain shares, or nothing. This file is the missing instrument, and it outlives whatever it
 * was built to diagnose.
 *
 * Three things it does deliberately:
 *
 *  - **The real host, not a copy of it.** `functionNotationLabelShot.browser.test.tsx` and
 *    `reviewCardContainment.browser.test.tsx` reconstruct `WorldScene`'s chain class for class,
 *    which is right for a figure inside the review scroll. It is wrong here: the claim under
 *    test is about how the HOST composes the scene — the banner's height, the action tray's
 *    height, and how much of the card is left over — so a hand-copied chain would be measuring
 *    a layout nobody ships. This mounts `d1LessonHost.render(...)`, which is what the city
 *    mounts.
 *  - **Framed on the surface, not on the card.** The frame is the whole 1024x580 viewport. A
 *    screenshot cropped to the worked-example card would prove nothing about what covers it:
 *    the card is the one part of the picture nobody doubted.
 *  - **Both footers.** `6affcfb6` added a dev-only "Skip to check" button to the same tray, and
 *    the QA note wondered whether the dev chrome was the cause. Photographing the learner view
 *    and the `?dev` view at the same viewport settles that rather than arguing it: the learner
 *    frame has no dev button in it at all.
 *
 * The numbers logged beside each frame are the diagnosis, and the assertion is the part of it
 * that can be held. Read `.cursor/rules/qa-verification.mdc` on why the number alone does not
 * discharge a spatial claim: these frames were looked at.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { d1LessonHost } from "../city/d1LessonHost";
import type { LessonHostContext } from "../city/lessonHost";
import { lessonByNode } from "./domains";
import { findButton, type Harness, mount, waitFor } from "./testHarness";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** A short, realistic laptop: the viewport the QA round reported the clipping at. */
const VIEWPORT = { width: 1024, height: 580 } as const;

/** The slide the report named: NUM.S slide 0, its `example` section. */
const NODE = "NUM.S";

const SHOT_DIR = "apps/web/src/lessons/__screenshots__";

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
});

afterAll(async () => {
  if (restore !== null) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * What the city hands the host when a learner walks into a building.
 *
 * `onDevComplete` is the ONLY difference between the two frames: `d1LessonHost` reads it as
 * "dev controls are on" and grows the action tray by two buttons.
 */
function hostContext(dev: boolean): LessonHostContext {
  return {
    nodeId: NODE,
    lessonShell: null,
    archetypeLabel: "Signed numbers",
    constructionLabel: "Foundation",
    onExit: () => {},
    skipMenu: true,
    resumePractice: false,
    resumeInfinite: false,
    ...(dev ? { onDevComplete: () => {} } : {}),
  };
}

/**
 * Where this test's viewport sits inside the real browser window.
 *
 * Vitest runs the test in an iframe on a tester page and SCALES that iframe when the requested
 * viewport does not match the window, so a clip written in the requested viewport's pixels
 * lands somewhere else on the real screen. Copied from `functionNotationLabelShot`, which
 * copied it from `balanceCrateCentred`, which measured that failure.
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

/** One frame of the whole viewport, captured over CDP and clipped to where that viewport is. */
async function shoot(path: string): Promise<void> {
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a ${VIEWPORT.width}x${VIEWPORT.height} screen`,
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
  expect(shot.data, `no screenshot data for ${path}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(path, shot.data, { encoding: "base64" });
  }
}

function need<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (found === null) {
    throw new Error(`the lesson panel has no ${selector}`);
  }
  return found;
}

/**
 * Open the panel and walk it to slide 0's worked example: one Next, out of the lecture
 * section, which is the second of the slide's three sections.
 */
async function openWorkedExample(dev: boolean): Promise<HTMLElement> {
  const content = lessonByNode[NODE];
  if (content === undefined) {
    throw new Error(`${NODE} has no authored lesson, so there is no panel to photograph`);
  }
  h = mount(d1LessonHost.render(hostContext(dev)));
  const host = h.host;
  await waitFor(
    () => host.querySelector(".advisor-npc__action--next") !== null,
    `${NODE}: the panel reaches its first teaching slide`,
  );
  findButton(host, "Next").click();
  await waitFor(
    () => host.querySelector(".worked-solution__step") !== null,
    `${NODE} slide 0: the worked-example card mounts`,
  );
  await document.fonts.ready;
  // `.coc-card`'s pop-in animates `transform: scale`, and a transformed box both measures and
  // photographs in the wrong place.
  need<HTMLElement>(host, ".coc-card").style.animation = "none";
  await new Promise<void>((resolve) => setTimeout(resolve, 420));
  return host;
}

interface Fit {
  /** The scene body's visible box: the scroller everything below the banner lives in. */
  bodyTop: number;
  bodyBottom: number;
  bodyVisible: number;
  bodyContent: number;
  /** How much of the panel's content is below the fold of that scroller. */
  belowFold: number;
  /** The worked-example card, and how far past the fold its foot lands. */
  cardTop: number;
  cardBottom: number;
  cardPastFold: number;
  /** Step 1 alone: the report says the card is cut mid-step-1. */
  stepOneTop: number;
  stepOneBottom: number;
  stepOnePastFold: number;
  /** The pinned action tray, and the frame that holds all of it. */
  trayTop: number;
  trayHeight: number;
  frameTop: number;
  frameBottom: number;
  frameHeight: number;
  bannerHeight: number;
}

function readFit(host: HTMLElement): Fit {
  const body = need<HTMLElement>(host, ".coc-card__body");
  const card = need<HTMLElement>(host, ".worked-solution");
  const stepOne = need<HTMLElement>(host, ".worked-solution__step");
  const tray = need<HTMLElement>(host, ".coc-card__actions");
  const frame = need<HTMLElement>(host, ".coc-card");
  const banner = need<HTMLElement>(host, ".coc-card__banner");

  const bodyBox = body.getBoundingClientRect();
  const cardBox = card.getBoundingClientRect();
  const stepBox = stepOne.getBoundingClientRect();
  const trayBox = tray.getBoundingClientRect();
  const frameBox = frame.getBoundingClientRect();

  return {
    bodyTop: bodyBox.top,
    bodyBottom: bodyBox.bottom,
    bodyVisible: body.clientHeight,
    bodyContent: body.scrollHeight,
    belowFold: body.scrollHeight - body.clientHeight,
    cardTop: cardBox.top,
    cardBottom: cardBox.bottom,
    cardPastFold: cardBox.bottom - bodyBox.bottom,
    stepOneTop: stepBox.top,
    stepOneBottom: stepBox.bottom,
    stepOnePastFold: stepBox.bottom - bodyBox.bottom,
    trayTop: trayBox.top,
    trayHeight: trayBox.height,
    frameTop: frameBox.top,
    frameBottom: frameBox.bottom,
    frameHeight: frameBox.height,
    bannerHeight: banner.getBoundingClientRect().height,
  };
}

function report(label: string, fit: Fit): string {
  const r = (n: number) => n.toFixed(1);
  return [
    `${label} at ${VIEWPORT.width}x${VIEWPORT.height}:`,
    `  frame ${r(fit.frameTop)}..${r(fit.frameBottom)} (${r(fit.frameHeight)}px), banner ${r(fit.bannerHeight)}px, tray ${r(fit.trayHeight)}px at y=${r(fit.trayTop)}`,
    `  scene body ${r(fit.bodyTop)}..${r(fit.bodyBottom)}, ${r(fit.bodyVisible)}px visible of ${r(fit.bodyContent)}px content, ${r(fit.belowFold)}px below the fold`,
    `  worked-example card ${r(fit.cardTop)}..${r(fit.cardBottom)}, foot ${r(fit.cardPastFold)}px past the fold`,
    `  step 1 ${r(fit.stepOneTop)}..${r(fit.stepOneBottom)}, foot ${r(fit.stepOnePastFold)}px past the fold`,
  ].join("\n");
}

/**
 * The claim the QA round made, in the view a learner is given.
 *
 * What is asserted is step ONE, not the whole card: a four-step worked example is taller than
 * a 580px screen's scene body no matter how the frame is arranged, so "the card fits" is not a
 * property any layout could deliver and an assertion of it would just be a permanent red. What
 * a learner must not meet is the card's FIRST step already cut in half when the section opens,
 * with nothing on screen to say the rest is one scroll away.
 */
test("NUM.S slide 0's worked example opens with its first step whole, in the learner's scene", async () => {
  const host = await openWorkedExample(false);

  expect(
    findButton(host, "Back to city"),
    "the learner's scene has no exit tray, so this is not the shipped footer",
  ).toBeTruthy();
  expect(
    host.querySelectorAll(".worked-solution__step").length,
    "NUM.S slide 0's worked example has no steps, so there is nothing to be cut off",
  ).toBeGreaterThan(1);
  expect(
    host.querySelectorAll(".katex").length,
    "the panel's math never typeset, so every height here is the fallback font's",
  ).toBeGreaterThan(0);

  const fit = readFit(host);
  console.log(report("learner", fit));

  // Taken BEFORE the assertion, so a red run still leaves the picture the numbers describe.
  await shoot(
    `${SHOT_DIR}/d1-numS-slide0-example-learner-${VIEWPORT.width}x${VIEWPORT.height}.png`,
  );

  // Floors, because "nothing sticks out past the fold" is satisfied by a card that never
  // laid out and by a panel short enough not to scroll, and neither is the surface this
  // frame is of.
  expect(
    fit.stepOneBottom - fit.stepOneTop,
    "step 1 has no height, so it cannot be cut off and nothing here was measured",
  ).toBeGreaterThan(20);
  expect(
    fit.belowFold,
    "this panel fits its scene without scrolling, so it is not the crowded surface the frame is of",
  ).toBeGreaterThan(100);

  expect(
    fit.stepOnePastFold,
    `${report("learner", fit)}\n  step 1 of the worked example is cut off by the scene body's fold`,
  ).toBeLessThanOrEqual(0);
});

/**
 * The same frame with `?dev`'s two extra tray buttons, which is where the clipping was first
 * seen. Nothing is asserted about the dev chrome beyond its being there: this frame exists so
 * the two pictures can be put side by side and the dev tray ruled in or out as the cause.
 */
test("the same panel with the dev action tray, photographed for comparison", async () => {
  const host = await openWorkedExample(true);

  expect(
    findButton(host, "Skip to check (dev only)"),
    "the dev tray no longer offers the skip control 6affcfb6 added, so this frame is of something else",
  ).toBeTruthy();

  const fit = readFit(host);
  console.log(report("dev", fit));

  await shoot(
    `${SHOT_DIR}/d1-numS-slide0-example-dev-${VIEWPORT.width}x${VIEWPORT.height}.png`,
  );
});
