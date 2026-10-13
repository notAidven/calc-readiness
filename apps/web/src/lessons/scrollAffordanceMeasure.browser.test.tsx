/**
 * **WHETHER THE LESSON'S TWO SCROLLERS TELL A LEARNER THEY SCROLL, MEASURED ON THE LEARNER'S
 * OWN MOUNT.**
 *
 * A MEASUREMENT, not a guard, for the reason `shellFitMeasure.browser.test.tsx` is one: the
 * numbers below are the thing being reported, and a red here would gate a change this file is
 * not entitled to ask for. What it DOES assert is that the surface it measured is the shipped
 * one, because every number is worthless if the mount drifted.
 *
 * ## The two defects this instrument is for
 *
 * D6's migration log recorded both and fixed neither, because both are shared chrome:
 *
 *  1. **A worked example whose fold reads as finished.** #654 made the well scroll and pinned
 *     the way forward, and both hold. But where the fold happens to land just BELOW the foot
 *     of the last visible step, the card presents a clean bottom edge with no partial step and
 *     nothing else to say that three more steps exist. `lessonPanelSceneFit.browser.test.tsx`
 *     asserts `stepOnePastFold <= 0`, so this defect lives entirely on the PASSING side of the
 *     guard nearest to it: a fold at -3px is greener than a fold at -40px and reads far worse.
 *  2. **The advisor bubble's short-screen cap** (`.advisor-npc__bubble`, `max-height:
 *     min(28vh, 220px)`) cutting a paragraph through the middle of a line. The log recorded
 *     *"whether other domains' paragraphs reach that cap is unmeasured"*, which is question B
 *     below.
 *
 * ## Why slide 0, and why that is the whole census rather than a sample of it
 *
 * The advisor walk cannot step PAST a gated slide without satisfying its gate, so the only
 * example section a learner-faithful walk reaches unaided is the FIRST slide's. That is a
 * limit on the instrument and it is stated rather than worked around: reaching slide 1 would
 * take either a blind gate-poker (which `shellFitMeasure` reports failing on nine domains of
 * ten) or a synthetic pack, and a synthetic pack measures a layout nobody ships. So this
 * sweeps slide 0 of every authored pack — the same slide for everyone, on the real host, with
 * no gate touched — and says nothing about later slides.
 *
 * ## Why not `?dev`
 *
 * `.cursor/rules/qa-verification.mdc`: the dev frame's `.world-scene--full .coc-card
 * { max-height: none }` lifts the very cap that creates the fold. Everything here mounts
 * `d1LessonHost.render(...)`, the component the city opens for all ten domains.
 *
 * Output: `.qa-frames/scroll-affordance/` (gitignored).
 */

import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { d1LessonHost } from "../city/d1LessonHost";
import { WorldScene } from "../city/WorldScene";
import { AdvisorLesson } from "./AdvisorLesson";
import { allLessons, LESSON_DOMAINS } from "./domains";
import {
  CITY_DESKTOP,
  CITY_PHONE,
  DESKTOP_VIEWPORT,
  PHONE_VIEWPORT,
} from "./readingWidths";
import { lessonHostContext, query, settle, SHORT_LAPTOP } from "./shellFit";
import { workedExampleFor } from "./teachingSections";
import { findButton, type Harness, mount, waitFor } from "./testHarness";
import type { LessonContent } from "./types";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const OUT = ".qa-frames/scroll-affordance";

/** How close to the fold a step's foot has to land for the edge to read as deliberate. */
const CLEAN_EDGE_PX = 12;

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

/**
 * Per test, not once for the file. Test C moves the viewport to measure the phone column, and
 * setting it only in `beforeAll` meant a C that threw part-way left every later test running
 * at 390x844 — which is how the first run of this file reported "no fold reads as finished"
 * over a population where 15 of them do.
 */
beforeEach(async () => {
  await page.viewport(SHORT_LAPTOP.width, SHORT_LAPTOP.height);
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

const round = (n: number) => Math.round(n * 10) / 10;

/* ------------------------------------------------------------------ frames */

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

/** The whole 1024x580 frame, never a crop of the element that changed. */
async function shoot(name: string): Promise<string> {
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a 1024x580 screen`,
  ).toBeCloseTo(1, 1);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, SHORT_LAPTOP.width),
      height: Math.min(box.height, SHORT_LAPTOP.height),
      scale: 1,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  const path = `${OUT}/${name}-1024x580.png`;
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(path, shot.data, { encoding: "base64" });
  }
  return path;
}

/* ------------------------------------------------------- what a scroller declares */

interface ScrollerState {
  /** Present, and how much of it is out of sight. */
  visible: number;
  content: number;
  belowFold: number;
  /**
   * Layout width the scrollbar takes: `offsetWidth - clientWidth` less the borders.
   * Zero means the scrollbar is an OVERLAY (or absent), which is the question that decides
   * whether a reserved gutter can be afforded — see the reading-column test at the foot.
   */
  consumed: number;
  scrollbarWidth: string;
  scrollbarColor: string;
  scrollbarGutter: string;
}

function scrollerState(el: HTMLElement): ScrollerState {
  const style = getComputedStyle(el);
  const borders =
    Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.borderRightWidth);
  return {
    visible: round(el.clientHeight),
    content: round(el.scrollHeight),
    belowFold: round(el.scrollHeight - el.clientHeight),
    consumed: round(el.offsetWidth - el.clientWidth - borders),
    scrollbarWidth: style.scrollbarWidth,
    scrollbarColor: style.scrollbarColor,
    scrollbarGutter: style.scrollbarGutter,
  };
}

/** Is the cue on screen, and is it the one belonging to this scroller? */
function cueShown(root: ParentNode, where: "well" | "bubble"): boolean {
  const cue = root.querySelector<HTMLElement>(`.scroll-more-cue--${where}`);
  if (cue === null) {
    return false;
  }
  const box = cue.getBoundingClientRect();
  return box.width > 0 && box.height > 0 && getComputedStyle(cue).visibility !== "hidden";
}

/**
 * Every line box of every text node inside `el`.
 *
 * Used to answer where a scroller's fold falls relative to the TEXT, which is a different
 * question from where it falls relative to the box: a box whose height is a whole number of
 * line-heights can still cut a line in half, because the lines inside it are offset by
 * whatever sits above them.
 */
function lineBoxes(el: HTMLElement): DOMRect[] {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const rects: DOMRect[] = [];
  let node = walker.nextNode();
  while (node !== null) {
    if ((node.textContent ?? "").trim() !== "") {
      range.selectNodeContents(node);
      rects.push(...Array.from(range.getClientRects()));
    }
    node = walker.nextNode();
  }
  return rects.filter((r) => r.height > 0 && r.width > 0);
}

/* ------------------------------------------------ A: the worked-example fold, slide 0 */

interface ExampleReading {
  node: string;
  domain: string;
  viewport: string;
  frameClasses: string;
  cardMaxHeightCss: string;
  well: ScrollerState;
  steps: number;
  /** Steps whose foot is at or above the fold: what the learner is shown on arrival. */
  stepsWhole: number;
  stepsHidden: number;
  /** A step straddling the fold, which is itself the cue that more follows. */
  partialStep: boolean;
  /** Fold less the foot of the last whole step. Small and positive is the clean edge. */
  lastWholeStepFootToFold: number;
  /** `lessonPanelSceneFit`'s number, for comparison: step 1's foot past the fold. */
  stepOnePastFold: number;
  readsAsFinished: boolean;
  /** Whether the well's cue is on screen here, and whether it goes away at the bottom. */
  cueOnArrival: boolean;
  cueAtBottom: boolean;
}

/** Open the learner's panel on `node` and take one Next, into slide 0's example section. */
async function openSlideZeroExample(node: string): Promise<HTMLElement> {
  h = mount(d1LessonHost.render(lessonHostContext(node)));
  const host = h.host;
  // The panel tokens are declared on `.city-shell` (styles.css), so a bare host paints every
  // panel transparent — a harness artefact that photographs exactly like a defect.
  host.className = "city-shell";
  await waitFor(
    () => host.querySelector(".advisor-npc__action--next") !== null,
    `${node}: the panel reaches its first teaching slide`,
  );
  findButton(host, "Next").click();
  await waitFor(
    () => host.querySelector(".worked-solution__step") !== null,
    `${node} slide 0: the worked-example card mounts`,
  );
  await document.fonts.ready;
  query<HTMLElement>(host, ".coc-card").style.animation = "none";
  await settle(360);
  return host;
}

function readExample(host: HTMLElement, node: string, domain: string): ExampleReading {
  const scene = query(host, ".world-scene");
  const card = query<HTMLElement>(host, ".coc-card");
  const body = query<HTMLElement>(host, ".coc-card__body");
  const steps = Array.from(host.querySelectorAll<HTMLElement>(".worked-solution__step"));
  const fold = body.getBoundingClientRect().bottom;

  const boxes = steps.map((s) => s.getBoundingClientRect());
  const whole = boxes.filter((box) => box.bottom <= fold + 0.5).length;
  const partial = boxes.some((box) => box.top < fold - 0.5 && box.bottom > fold + 0.5);
  const lastWholeFoot = whole > 0 ? (boxes[whole - 1]?.bottom ?? Number.NaN) : Number.NaN;
  const stepOneFoot = boxes[0]?.bottom ?? Number.NaN;
  const hidden = steps.length - whole - (partial ? 1 : 0);

  return {
    node,
    domain,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    frameClasses: scene.className,
    cardMaxHeightCss: getComputedStyle(card).maxHeight,
    well: scrollerState(body),
    steps: steps.length,
    stepsWhole: whole,
    stepsHidden: Math.max(0, hidden),
    partialStep: partial,
    lastWholeStepFootToFold: round(fold - lastWholeFoot),
    stepOnePastFold: round(stepOneFoot - fold),
    cueOnArrival: cueShown(host, "well"),
    cueAtBottom: false,
    // The defect: content is hidden, nothing straddles the fold to say so, and the last
    // thing on screen ends close enough to the edge that the edge looks intended.
    readsAsFinished:
      steps.length > whole &&
      !partial &&
      Number.isFinite(lastWholeFoot) &&
      fold - lastWholeFoot <= CLEAN_EDGE_PX,
  };
}

/** Every authored pack whose slide 0 has a worked example: the reachable population. */
function packsWithSlideZeroExample(): { node: string; domain: string }[] {
  const out: { node: string; domain: string }[] = [];
  for (const domain of LESSON_DOMAINS) {
    for (const lesson of domain.lessons) {
      if (workedExampleFor(lesson, 0) !== null) {
        out.push({ node: lesson.node_id, domain: domain.id });
      }
    }
  }
  return out;
}

test("A: what slide 0's worked example shows a learner at 1024x580", async () => {
  const packs = packsWithSlideZeroExample();
  const readings: ExampleReading[] = [];
  const failures: { node: string; error: string }[] = [];

  for (const pack of packs) {
    try {
      const host = await openSlideZeroExample(pack.node);
      const reading = readExample(host, pack.node, pack.domain);
      // The discrimination a permanent decoration could not make: at the bottom of the
      // scroll there is nothing more below, so the cue has to be gone.
      const body = query<HTMLElement>(host, ".coc-card__body");
      body.scrollTop = body.scrollHeight;
      await settle(140);
      reading.cueAtBottom = cueShown(host, "well");
      readings.push(reading);
    } catch (error) {
      failures.push({ node: pack.node, error: String(error) });
    } finally {
      h?.cleanup();
      h = null;
    }
  }

  const finished = readings.filter((r) => r.readsAsFinished);
  const overflowing = readings.filter((r) => r.well.belowFold > 0);
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `${OUT}/A-example-fold.json`,
      `${JSON.stringify(
        {
          viewport: "1024x580",
          packsWithSlideZeroExample: packs.length,
          measured: readings.length,
          overflowing: overflowing.length,
          readsAsFinished: finished.map((r) => r.node),
          cueOnArrival: readings.filter((r) => r.cueOnArrival).length,
          cueStillThereAtBottom: readings.filter((r) => r.cueAtBottom).map((r) => r.node),
          scrollbarConsumedPx: [...new Set(readings.map((r) => r.well.consumed))],
          readings,
          failures,
        },
        null,
        2,
      )}\n`,
    );
  }

  console.log(
    [
      `A: ${readings.length} of ${packs.length} slide-0 examples measured at 1024x580`,
      `   ${overflowing.length} overflow the well`,
      `   ${finished.length} read as finished: ${finished.map((r) => r.node).join(", ") || "none"}`,
      `   scrollbar consumed widths seen: ${[...new Set(readings.map((r) => r.well.consumed))].join(", ")}`,
    ].join("\n"),
  );

  // Faithfulness only. Nothing here asserts the fit, and nothing asserts the size of the
  // clean-fold set either: whether a fold lands 3px or 30px below a step's foot is a text
  // metric, and this tree already has one guard that passed on Windows and failed on CI's
  // fonts. What IS asserted is the precondition the whole report rests on — that these wells
  // overflow at all, by 80 to 365px, which no font substitution is going to erase.
  expect(readings.length, "no pack's slide-0 example could be opened").toBeGreaterThan(0);
  expect(
    overflowing.length,
    "no slide-0 worked example overflows the well, so there is nothing here to be hidden by a fold",
  ).toBeGreaterThanOrEqual(45);
  for (const r of readings) {
    expect(r.viewport, `${r.node}: not measured at 1024x580`).toBe("1024x580");
    expect(r.frameClasses, `${r.node}: not the learner frame`).toContain(
      "world-scene--large",
    );
    expect(r.frameClasses, `${r.node}: this is the ?dev frame`).not.toContain(
      "world-scene--full",
    );
    expect(r.cardMaxHeightCss, `${r.node}: the card is uncapped`).not.toBe("none");
  }
}, 900_000);

/* ---------------------------------------------- B: does the bubble cap reach past D6 */

interface BubbleReading {
  node: string;
  domain: string;
  bubbleHeight: number;
  bubbleMaxHeightCss: string;
  said: ScrollerState;
  /** The cap is biting: the words are taller than the box the short-screen rule allows. */
  capped: boolean;
  lineHeight: number;
  /**
   * Whether a LINE OF TEXT straddles the fold, measured off the line boxes rather than off
   * the box height. The D6 log recorded this cap as *"clipping a paragraph through the middle
   * of a line"*, and a half-line is the one thing that would already be a cue, so which of the
   * two it is decides whether the bubble owes a cue at all.
   */
  lineStraddlesFold: boolean;
  /** How far into that line the fold falls, as a fraction of its height. */
  cutThroughLine: number;
  cueOnArrival: boolean;
  cueAtBottom: boolean;
}

test("B: which domains' slide-0 lectures reach the short-screen bubble cap", async () => {
  const readings: BubbleReading[] = [];
  const failures: { node: string; error: string }[] = [];

  for (const domain of LESSON_DOMAINS) {
    for (const lesson of domain.lessons) {
      try {
        h = mount(d1LessonHost.render(lessonHostContext(lesson.node_id)));
        const host = h.host;
        host.className = "city-shell";
        await waitFor(
          () => host.querySelector(".advisor-npc__bubble") !== null,
          `${lesson.node_id}: the advisor speaks`,
        );
        query<HTMLElement>(host, ".coc-card").style.animation = "none";
        await document.fonts.ready;
        await settle(220);
        const bubble = query<HTMLElement>(host, ".advisor-npc__bubble");
        const said = query<HTMLElement>(host, ".advisor-npc__said");
        const state = scrollerState(said);
        const lineHeight = Number.parseFloat(getComputedStyle(said).lineHeight);
        const fold = said.getBoundingClientRect().bottom;
        const straddler = lineBoxes(said).find(
          (r) => r.top < fold - 0.5 && r.bottom > fold + 0.5,
        );
        const cueOnArrival = cueShown(host, "bubble");
        said.scrollTop = said.scrollHeight;
        await settle(120);
        readings.push({
          node: lesson.node_id,
          domain: domain.id,
          bubbleHeight: round(bubble.getBoundingClientRect().height),
          bubbleMaxHeightCss: getComputedStyle(bubble).maxHeight,
          said: state,
          capped: state.belowFold > 0.5,
          lineHeight: round(lineHeight),
          lineStraddlesFold: straddler !== undefined,
          cutThroughLine:
            straddler === undefined
              ? 0
              : round(((fold - straddler.top) / straddler.height) * 100) / 100,
          cueOnArrival,
          cueAtBottom: cueShown(host, "bubble"),
        });
      } catch (error) {
        failures.push({ node: lesson.node_id, error: String(error) });
      } finally {
        h?.cleanup();
        h = null;
      }
    }
  }

  const capped = readings.filter((r) => r.capped);
  const domains = [...new Set(capped.map((r) => r.domain))].sort();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `${OUT}/B-bubble-cap.json`,
      `${JSON.stringify(
        {
          viewport: "1024x580",
          measured: readings.length,
          capped: capped.length,
          cappedDomains: domains,
          cappedNodes: capped.map((r) => r.node),
          cappedWithALineStraddlingTheFold: capped.filter((r) => r.lineStraddlesFold)
            .length,
          cappedShowingTheCue: capped.filter((r) => r.cueOnArrival).length,
          cueStillThereAtBottom: capped.filter((r) => r.cueAtBottom).map((r) => r.node),
          uncappedShowingTheCue: readings
            .filter((r) => !r.capped && r.cueOnArrival)
            .map((r) => r.node),
          readings,
          failures,
        },
        null,
        2,
      )}\n`,
    );
  }
  console.log(
    [
      `B: ${capped.length} of ${readings.length} slide-0 lectures overflow the bubble cap at 1024x580`,
      `   domains affected: ${domains.join(", ") || "none"}`,
      `   nodes: ${capped.map((r) => `${r.node} (${r.said.belowFold}px below, ${r.lineStraddlesFold ? `a line cut ${Math.round(r.cutThroughLine * 100)}% through` : "cut clean between lines"})`).join("; ") || "none"}`,
    ].join("\n"),
  );

  expect(readings.length, "no lecture was measured").toBeGreaterThan(0);
}, 900_000);

/* ------------------------------------- C: what a reserved gutter would cost the column */

/**
 * The reading column, measured the way `labelFigureNarrow.browser.test.tsx` measures it, at
 * both viewports `readingWidths.ts` names — plus the one number that file does not record:
 * how much layout width the well's scrollbar is taking while it does so.
 *
 * This is the decision the fix turns on. `CITY_PHONE` is documented as `0.92 x 390` less the
 * border and the padding, with NOTHING deducted for a scrollbar, and it is a measured number
 * that ~29 files depend on. If the scrollbar is consuming 0 today, it is an overlay, and
 * `scrollbar-gutter: stable` would reserve width that is currently free and move every one of
 * them. If it is already consuming its width, a gutter costs nothing new.
 */
test("C: the reading column, and what the well's scrollbar takes from it", async () => {
  const found = allLessons.find((l) => (l.visuals ?? []).length > 0);
  if (found === undefined) {
    throw new Error("no lesson places a visual");
  }
  const content: LessonContent = found;

  const seen: Record<string, unknown>[] = [];

  async function measureAt(
    where: string,
    viewport: { width: number; height: number },
    expected: { column: number; inside: number },
  ): Promise<void> {
    await page.viewport(viewport.width, viewport.height);
    h = mount(
      <WorldScene eyebrow="e" title={content.title} size="large" onExit={() => {}}>
        <AdvisorLesson content={content} />
      </WorldScene>,
    );
    const host = h.host;
    host.className = "city-shell";
    // Each pass WAITS for the advisor to have rendered something before reading it. Reading
    // the DOM straight after mount finds neither a figure nor a "Next" and breaks out of the
    // walk immediately, which is what made the first run of this test throw.
    for (let step = 0; step < 24; step += 1) {
      await waitFor(
        () =>
          host.querySelector("figure.lesson-visual") !== null ||
          host.querySelector(".advisor-npc__action--next") !== null,
        `${where}: the advisor shows a figure or a way forward`,
      );
      if (host.querySelector("figure.lesson-visual") !== null) {
        break;
      }
      host.querySelector<HTMLButtonElement>(".advisor-npc__action--next")?.click();
      await settle(30);
    }
    await waitFor(
      () => host.querySelector("figure.lesson-visual") !== null,
      `${where}: the lesson mounts a visual`,
    );
    await document.fonts.ready;
    await settle(260);

    const figure = query<HTMLElement>(host, "figure.lesson-visual");
    const style = getComputedStyle(figure);
    const off = (["Left", "Right"] as const).reduce(
      (total, side) =>
        total +
        Number.parseFloat(style[`padding${side}` as const]) +
        Number.parseFloat(style[`border${side}Width` as const]),
      0,
    );
    const body = query<HTMLElement>(host, ".coc-card__body");
    seen.push({
      where,
      viewport: `${viewport.width}x${viewport.height}`,
      column: round(figure.getBoundingClientRect().width),
      inside: round(figure.getBoundingClientRect().width - off),
      expectedColumn: expected.column,
      expectedInside: expected.inside,
      well: scrollerState(body),
    });
    h.cleanup();
    h = null;
  }

  await measureAt("CITY_PHONE", PHONE_VIEWPORT, CITY_PHONE);
  await measureAt("CITY_DESKTOP", DESKTOP_VIEWPORT, CITY_DESKTOP);
  await measureAt(
    "the short laptop the fold is measured at",
    SHORT_LAPTOP,
    // Not a named width: 1024 is narrower than the 1100px card, so the column is whatever
    // the body leaves. Recorded so the fix can be checked at the viewport it is for.
    { column: Number.NaN, inside: Number.NaN },
  );

  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `${OUT}/C-reading-column.json`,
      `${JSON.stringify({ readings: seen }, null, 2)}\n`,
    );
  }
  console.log(
    `C: ${seen
      .map(
        (s) =>
          `${s.where} at ${s.viewport}: column ${s.column} (expected ${s.expectedColumn}), scrollbar consumed ${(s.well as ScrollerState).consumed}px, ${(s.well as ScrollerState).belowFold}px below the fold`,
      )
      .join("\n   ")}`,
  );

  expect(seen.length, "nothing was measured").toBe(3);
}, 600_000);

/* ------------------------------------------------------------------ the frames */

/**
 * Frames of the surfaces question A found, so the claim is settled by a picture and not only
 * by a number. Whole viewport every time: the subject is what the learner can see AROUND the
 * card, and a crop of the card proves nothing about that.
 */
test("frames of the folds that read as finished", async () => {
  const packs = packsWithSlideZeroExample();
  const shot: { node: string; frame: string; reading: ExampleReading }[] = [];

  for (const pack of packs) {
    if (shot.length >= 6) {
      break;
    }
    try {
      const host = await openSlideZeroExample(pack.node);
      const reading = readExample(host, pack.node, pack.domain);
      if (reading.readsAsFinished) {
        shot.push({
          node: pack.node,
          frame: await shoot(`${pack.node}-slide0-example`),
          reading,
        });
      }
    } catch {
      // A pack this walk cannot open is question A's business, not this one's.
    } finally {
      h?.cleanup();
      h = null;
    }
  }

  // One lecture too, because the bubble cap is the other half of the same defect and a
  // reader should be able to see both in the same pass. POL.5 hides the most: 134px.
  let bubbleFrame: string | null = null;
  try {
    h = mount(d1LessonHost.render(lessonHostContext("POL.5")));
    h.host.className = "city-shell";
    await waitFor(
      () => h?.host.querySelector(".advisor-npc__bubble") !== null,
      "POL.5: the advisor speaks",
    );
    query<HTMLElement>(h.host, ".coc-card").style.animation = "none";
    await document.fonts.ready;
    await settle(300);
    bubbleFrame = await shoot("POL.5-slide0-lecture-bubble");
  } finally {
    h?.cleanup();
    h = null;
  }

  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `${OUT}/frames.json`,
      `${JSON.stringify({ shot, bubbleFrame }, null, 2)}\n`,
    );
  }
  // The lecture frame is asserted and the example frames are not, for the reason above: which
  // packs show a clean fold moves with the font, and a red here would be a report about
  // CI's typefaces dressed up as a defect. How many were taken is written to the JSON.
  expect(bubbleFrame, "no lecture frame was written").toBeTruthy();
}, 900_000);
