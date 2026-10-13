/**
 * The `?dev` review surfaces at their real size, measured in real Chromium.
 *
 * The dev slide stepper is what a reviewer reads lesson content from, and it used to
 * render in the shared ~500px Clash-of-Clans card: a 448px column adrift in a 1920px
 * window, narrower than the 920px the in-game lesson gives, so every slide and every
 * answer key cost a scroll AND was reviewed at a width no learner is ever given. It now
 * takes `WorldScene size="full"`.
 *
 * None of that is checkable in jsdom, which has no layout and no cascade, so this file
 * loads the real stylesheet. It loads it LAST, as `main.tsx` does — see
 * `lessonVisualSurd.browser.test.tsx` for the collapsed-radical bug that ordering decides.
 *
 * What is pinned here:
 *   - the dev frame fills the viewport, and its reading column does NOT (the design
 *     judgement: widget CSS is written against a card, so an edge-to-edge row of chips
 *     reads as broken rather than roomy);
 *   - that column is the SAME width the in-game lesson window gives, asserted as an
 *     equality rather than against the literal 920 so the two cannot drift apart;
 *   - the three QA affordances — slide index, widget id, and the CFU panel with its
 *     accepted-answer list — survive the wider frame;
 *   - the list still comes back to the scroll position it was left at, measured against
 *     a REAL scroll container rather than the faked `scrollTop` jsdom needs;
 *   - the widget layout tests' pinned measurement width is untouched by any of it.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { WorldScene } from "./city/WorldScene";
import { DevLessons } from "./DevLessons";
import { FIGURE_CONTENT_CAP } from "./lessons/readingWidths";
import { type Harness, mount, waitFor } from "./lessons/testHarness";
import { LessonVisual } from "./lessons/visuals";

import "./styles.css";

let h: Harness | null = null;

/**
 * A realistic laptop, because the whole subject is how a wide screen is used and the
 * headless default is phone-shaped (390px), where a max-width column never binds.
 *
 * `page.viewport` resizes THIS FILE's iframe only, and the original size is put back
 * below, so nothing another test file measures at moves — least of all `FIGURE_CONTENT_CAP`,
 * which the widget layout tests pin inline on their own mount host (see the last test here).
 */
const DESKTOP = { width: 1440, height: 900 };
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(DESKTOP.width, DESKTOP.height);
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

const width = (el: Element | null): number =>
  el ? Math.round(el.getBoundingClientRect().width) : -1;

/**
 * Let the CoC pop-in finish before measuring. It runs the card from `scale(0.86)` through
 * a `1.03` overshoot, so a rect read on the frame it mounts is 86% of the real width —
 * which is how the in-game card first "measured" 946px instead of 1100px here.
 */
async function settle(): Promise<void> {
  await Promise.all(
    Array.from(document.querySelectorAll(".coc-popup, .coc-card")).flatMap((el) =>
      el.getAnimations().map((a) => a.finished.catch(() => undefined)),
    ),
  );
}

const query = <T extends Element>(selector: string): T => {
  const found = document.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
};

/** The lesson whose stepper is opened. RAD.4 places a gating widget on a later slide. */
const NODE_ID = "RAD.4";

async function openStepper(): Promise<void> {
  h = mount(<DevLessons />);
  await waitFor(
    () => document.getElementById(`dev-slides-${NODE_ID}`) !== null,
    "the dev lesson list renders",
  );
  document.getElementById(`dev-slides-${NODE_ID}`)?.click();
  await waitFor(() => document.querySelector(".dev-slides") !== null, "the stepper opens");
  await settle();
}

/**
 * Walk the stepper to the current slide's activity section, which is the only one that
 * names a widget. Driven by the heading rather than by a count, because a slide is two
 * steps or three depending on whether the pack authored a worked example for it.
 */
async function stepToTheActivity(): Promise<void> {
  for (let step = 0; step < 4; step += 1) {
    const heading = Array.from(document.querySelectorAll(".dev-slides h2")).find((el) =>
      /slide \d+ of \d+/.test(el.textContent ?? ""),
    );
    if ((heading?.textContent ?? "").endsWith("activity")) {
      return;
    }
    const next = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (b) => (b.textContent ?? "").includes("Next step"),
    );
    if (!next) {
      throw new Error("the stepper offers no way forward");
    }
    next.click();
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("the stepper never reached the slide's activity section");
}

/* --------------------------------------------------- 1. the frame and the column */

test("the dev frame fills the viewport, and its reading column deliberately does not", async () => {
  await openStepper();

  const card = query(".world-scene--full .coc-card");
  expect(width(card), "the frame is flush with the viewport").toBe(window.innerWidth);

  const column = width(query(".coc-card__body > *"));
  // The judgement being pinned: full screen is the FRAME, not the text. A column as wide
  // as a desktop monitor puts lesson prose at ~230 characters a line and leaves every
  // widget's internally-capped content (560px diagrams, 420px tables) as a small island
  // in a huge empty box.
  expect(column, "the column is narrower than the frame").toBeLessThan(window.innerWidth);
  expect(column, "and it is still a wide column, not a phone-width one").toBeGreaterThan(
    600,
  );
  // Nothing may stick out sideways at this footprint.
  expect(
    document.documentElement.scrollWidth,
    "the frame introduces no horizontal overflow",
  ).toBeLessThanOrEqual(document.documentElement.clientWidth);
});

/**
 * The reason the column is what it is: it is the learner's. Both surfaces now take the
 * application viewport while preserving that one readable column, so parity is asserted on
 * the outer frame as well as the content. A split-screen learner card fails at the frame.
 */
test("the dev and learner scenes share one full viewport frame and reading column", async () => {
  const child = <div data-testid="column">measured</div>;

  h = mount(
    <WorldScene eyebrow="in game" title="large" size="large" onExit={() => {}}>
      {child}
    </WorldScene>,
  );
  await waitFor(
    () => document.querySelector(".world-scene--large .coc-card") !== null,
    "the in-game frame mounts",
  );
  await settle();
  const inGame = width(query('[data-testid="column"]'));
  const inGameCard = width(query(".coc-card"));
  h.cleanup();
  h = null;

  h = mount(
    <WorldScene eyebrow="dev" title="full" size="full" onExit={() => {}}>
      {child}
    </WorldScene>,
  );
  await waitFor(
    () => document.querySelector(".world-scene--full .coc-card") !== null,
    "the dev frame mounts",
  );
  await settle();
  const dev = width(query('[data-testid="column"]'));
  const devCard = width(query(".coc-card"));

  expect(dev, "the dev reading column matches the in-game one").toBe(inGame);
  expect(inGameCard, "the learner scene does not occupy the application viewport").toBe(
    window.innerWidth,
  );
  expect(devCard).toBe(window.innerWidth);
  expect(devCard, "dev and learner frames differ").toBe(inGameCard);
});

/**
 * The point of going full screen is room. Measured as the height of the scrolling well
 * the content gets, against the compact card the stepper used to render in.
 */
test("the full frame gives the content a taller well than the card it replaced", async () => {
  const child = <div>measured</div>;
  const bodyHeight = () =>
    Math.round(query(".coc-card__body").getBoundingClientRect().height);

  h = mount(
    <WorldScene eyebrow="old" title="compact" onExit={() => {}}>
      {child}
    </WorldScene>,
  );
  await waitFor(() => document.querySelector(".coc-card__body") !== null, "compact mounts");
  await settle();
  const compact = bodyHeight();
  h.cleanup();
  h = null;

  h = mount(
    <WorldScene eyebrow="new" title="full" size="full" onExit={() => {}}>
      {child}
    </WorldScene>,
  );
  await waitFor(
    () => document.querySelector(".world-scene--full .coc-card__body") !== null,
    "full mounts",
  );
  await settle();

  expect(bodyHeight()).toBeGreaterThan(compact);
});

/* ------------------------------------------------------- 2. the QA affordances */

/**
 * These three are the entire reason the stepper exists, so widening the frame is only
 * allowed if they are all still on screen and readable. Each is asserted as laid-out
 * text, not as a node in the tree: a heading with zero width is not an affordance.
 */
test("the slide index, the widget id and the CFU answer key all survive the wider frame", async () => {
  await openStepper();

  const onScreen = (el: Element, what: string) => {
    const box = el.getBoundingClientRect();
    expect(box.width, `${what} has width`).toBeGreaterThan(0);
    expect(box.height, `${what} has height`).toBeGreaterThan(0);
    expect(box.right, `${what} is not pushed off the right edge`).toBeLessThanOrEqual(
      window.innerWidth,
    );
    expect(box.left, `${what} is not pushed off the left edge`).toBeGreaterThanOrEqual(0);
  };

  // The slide index, which is the string a QA note is written from. It must read on ONE
  // line: `.lesson-intro h2` caps display headings at 10ch, which broke "RAD.4 slide 2
  // of 5" over three of them.
  const heading = Array.from(document.querySelectorAll(".dev-slides h2")).find((el) =>
    /slide 1 of \d+/.test(el.textContent ?? ""),
  );
  if (!heading) {
    throw new Error("the stepper is not naming its slide index");
  }
  onScreen(heading, "the slide index");
  const lineHeight = Number.parseFloat(getComputedStyle(heading).lineHeight);
  expect(
    heading.getBoundingClientRect().height,
    "the slide index fits on one line",
  ).toBeLessThan(lineHeight * 1.6);

  // The section this step is, which is the other half of the string a QA note is written
  // from: a slide is walked in three parts and only one of them has the widget on it.
  const section = query(".dev-slides .lesson-intro code");
  expect(section.textContent, "the lecture step says which section it is").toMatch(
    /no widget in this section \((lecture|worked example)\)/,
  );
  onScreen(section, "the section name");

  // And the widget id placed on this slide, once the walk reaches the section that shows it.
  await stepToTheActivity();
  const widget = query(".dev-slides .lesson-intro code");
  expect(widget.textContent, "the widget id is named").toMatch(/[a-z]+-[a-z-]+|no visual/);
  onScreen(widget, "the widget id");

  // The CFU step, with the accepted-answer list that is the whole point of the panel.
  const cfuChip = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => b.getAttribute("aria-label") === "Go to check for understanding",
  );
  if (!cfuChip) {
    throw new Error("the stepper does not reach the CFU");
  }
  cfuChip.click();
  await waitFor(
    () => document.querySelector(".dev-slides__key") !== null,
    "the answer key opens",
  );
  await settle();

  const key = query(".dev-slides__key");
  onScreen(key, "the answer key panel");
  const accepted = document.querySelectorAll(".dev-slides__accepted li");
  // A containment assertion over an empty list holds trivially, so count first.
  expect(accepted.length, "the key lists accepted answers").toBeGreaterThan(0);
  for (const answer of accepted) {
    onScreen(answer, `accepted answer ${answer.textContent}`);
  }
});

/* ------------------------------------------------------- 3. the scroll restore */

/**
 * Exiting a lesson has to land back where the reviewer clicked. jsdom's copy of this
 * test has to fake `scrollTop` outright, so it would pass against a stylesheet that
 * had stopped making `.dev-lessons` the scroller at all. This one uses the real one.
 */
test("the list comes back to the scroll position it was left at", async () => {
  h = mount(<DevLessons />);
  const list = () => query<HTMLElement>(".dev-lessons");
  await waitFor(
    () => document.getElementById(`dev-slides-${NODE_ID}`) !== null,
    "the dev lesson list renders",
  );

  // The restore is only meaningful if the container actually scrolls.
  await waitFor(
    () => list().scrollHeight > list().clientHeight + 400,
    "the list is long enough to scroll",
  );
  expect(getComputedStyle(list()).overflowY).toBe("auto");

  const opener = document.getElementById(`dev-slides-${NODE_ID}`) as HTMLButtonElement;
  opener.scrollIntoView({ block: "center" });
  const left = list().scrollTop;
  expect(left, "the list was scrolled away from the top").toBeGreaterThan(0);

  opener.click();
  await waitFor(() => document.querySelector(".dev-slides") !== null, "the stepper opens");

  const back = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => (b.textContent ?? "").includes("Back to lessons"),
  );
  if (!back) {
    throw new Error("the stepper has no way back to the list");
  }
  back.click();
  await waitFor(
    () => document.getElementById(`dev-slides-${NODE_ID}`) !== null,
    "the list comes back",
  );

  expect(list().scrollTop, "landed back where it was left").toBe(left);
  expect(document.activeElement?.id, "and focus is on the entry that was opened").toBe(
    `dev-slides-${NODE_ID}`,
  );
});

/* ------------------------------------------- 4. the pinned widget test width */

/**
 * `widgetDropSlots`, `widgetActiveSlot` and `binaryRowMarks` all measure at
 * `FIGURE_CONTENT_CAP`, which they set INLINE on a bare mount host, because the headless
 * viewport is nothing like a lesson and measuring at it once hid a real wrap. The dev frame
 * must never reach into that: its rules are all scoped under `.world-scene--full`, and
 * this is the canary that says so. Unscope any of them and a widget mounted the way those
 * files mount one stops measuring the width it asked for.
 */
test("a widget mounted at the tests' pinned width still measures exactly that width", async () => {
  h = mount(<LessonVisual id="radical-parts-label" />);
  const { host } = h;
  host.style.width = `${FIGURE_CONTENT_CAP}px`;
  await waitFor(
    () => host.querySelector(".lesson-interactive") !== null,
    "the widget mounts",
  );

  expect(width(host), "the pinned measurement width is untouched").toBe(FIGURE_CONTENT_CAP);
  // And the widget inside it is laid out to that width, not to the viewport.
  expect(width(host.querySelector(".lesson-interactive"))).toBeLessThanOrEqual(
    FIGURE_CONTENT_CAP,
  );
});
