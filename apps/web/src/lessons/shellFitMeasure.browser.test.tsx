/**
 * **WHAT A LEARNER CAN SEE OF A GATED BOARD, MEASURED ON THE LEARNER'S OWN MOUNT.**
 *
 * A MEASUREMENT, not a guard. Nothing here asserts the fit, on purpose: the fit is the thing
 * being reported, and a red assertion would gate a change this file is not entitled to ask
 * for. What it DOES assert is that the surface it measured is the shipped one — the viewport,
 * the frame classes, the cap actually in force, and that a frame was written — because every
 * number below is worthless if the mount drifted.
 *
 * ## Why the learner host still matters
 *
 * `WorldScene`'s historical dev alias and learner frame now share full-viewport geometry, but
 * a mount is more than its CSS box. This file mounts `d1LessonHost.render(...)`, the component
 * the city opens for all ten domains, rather than rebuilding the chain by hand or relying on
 * the review route. It therefore measures the learner's advisor, gates, and content tree as
 * well as the shared frame.
 *
 * ## Viewport
 *
 * 1024x580, the short realistic laptop `cfuAuthoredFigureShots.browser.test.tsx` and
 * `caughtUpVitalityShots.browser.test.tsx` both photograph at, and for the same reason: a
 * `vh`-denominated box measures fine and photographs fine on a tall monitor. Every number
 * this file writes carries the viewport beside it.
 *
 * ## Which board each domain is measured on, and why it is not a written-down list
 *
 * The walk cannot step PAST a gated slide without satisfying its gate, so the only board a
 * learner-faithful walk can reach unaided is the FIRST gated activity slide of a lesson. The
 * representative per domain is therefore derived: probe every lesson's first gated slide bare
 * at the 920px reading column, then take the domain's tallest. A hardcoded table would have
 * been a table of ids that rot, and the rule ("tallest first-gated board in the domain") is
 * what the brief asked for.
 *
 * ## Frames are of the surface, never of the widget
 *
 * Same rule: *"cropped to the element that changed, a screenshot proves nothing about
 * occlusion."* Each shot is the whole 1024x580 frame, clipped to the tester iframe the way
 * `caughtUpVitalityShots` does it, so a reader can see what is cut off and what sits behind
 * what. Two shots per surface: the board as the learner arrives on it, and the board scrolled
 * to its own bottom (which is where the advisor's controls go, if they go).
 *
 * ## The gate, and what "Next" being absent means
 *
 * `AdvisorLesson` withholds `onNext` until every gating visual on the slide reports done, so
 * on arrival "Next" is ABSENT because the gate is working, not because it fell off the
 * screen. Judging reachability therefore needs a COMPLETED board. There is no shared driver
 * for that in this tree — completion is bespoke per widget — so this file drives a blind
 * poker (click the board's own live controls in DOM order until the gate opens) and reports,
 * per surface, whether it succeeded. Where it did not, the number is recorded as NOT
 * MEASURED rather than inferred, and the controls row is measured instead: "Previous" and
 * "Next" are siblings in one `.advisor-npc__controls` flex row (`AdvisorNpc.tsx`), so the
 * row's position is where "Next" would be.
 *
 * Output: `.qa-frames/fit-2026-08-05/` (gitignored; `.gitignore` names `.qa-frames/` as
 * *"where the browser suite writes the frames and measurements a review asks for"*).
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { WorldScene } from "../city/WorldScene";
import { allLessons, LESSON_DOMAINS } from "./domains";
import { EraInfinitePractice } from "./EraInfinitePractice";
import {
  advanceButton,
  type BoardProbe,
  firstGatedSlide,
  openLearnerLessonAtGatedBoard,
  probeBoardHeights,
  query,
  settle,
  SHORT_LAPTOP,
  tallestFirstGatedBoard,
  visualsOnSlide,
} from "./shellFit";
import { type Harness, mount, waitFor } from "./testHarness";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/** Where the frames and the readings go. Gitignored; see the header. */
const OUT = ".qa-frames/fit-2026-08-05";

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
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

/* ------------------------------------------------------------------ frames */

/**
 * Where this test's viewport sits inside the real browser window, plus the scale check that
 * makes a frame evidence about a 1024x580 screen rather than about a shrunken one. Taken
 * from `caughtUpVitalityShots.browser.test.tsx` rather than re-derived.
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

/* ------------------------------------------------- picking the representative board */

let heightsWritten = false;

/**
 * The domain's tallest first-gated board. `shellFit.tsx` owns the derivation and its header
 * says why it is a rule rather than a table; this file and the fit GUARD both read it, so the
 * two are measuring the same board rather than two boards that happen to agree today. All
 * that is added here is writing the derivation out beside the frames, so a reader can check
 * which board each domain was measured on.
 */
async function representative(domainId: string): Promise<BoardProbe> {
  const tallest = await tallestFirstGatedBoard(domainId);
  if (!heightsWritten) {
    heightsWritten = true;
    if (CAPTURE_EVIDENCE) {
      await commands.writeFile(
        `${OUT}/board-heights.json`,
        `${JSON.stringify(await probeBoardHeights(), null, 2)}\n`,
      );
    }
  }
  return tallest;
}

/* ------------------------------------------------------------------ measurement */

interface Reading {
  surface: string;
  node: string;
  viewport: string;
  boardIds: string[];
  slide: number | null;
  frameClasses: string;
  cardMaxHeightCss: string;
  cardHeight: number;
  bannerHeight: number;
  actionsHeight: number;
  bodyUsableHeight: number;
  bodyContentHeight: number;
  bubbleHeight: number;
  advisorBlockHeight: number;
  /** Body pixels below the advisor block at scroll top: the band the board opens into. */
  spaceLeftForWidget: number;
  widgetNaturalHeight: number;
  /** Board pixels outside the body's visible band at scroll top. */
  widgetHiddenPx: number;
  controlsRowTopAtArrival: number;
  controlsRowTopAtBoardBottom: number;
  controlsRowVisibleAtBoardBottom: boolean;
  /**
   * The foot of the pinned row against the foot of the well, scrolled to the board's bottom.
   * A pinned row that stops SHORT of the well leaves a slot the board slides through, which is
   * what the first frames of this fix showed; `wellBottom` is here so that is a number and not
   * only something to squint at.
   */
  controlsRowBottomAtBoardBottom: number;
  wellBottom: number;
  gateOpened: boolean;
  pokes: number;
  advanceLabel: string | null;
  advanceTopOnCompletedBoard: number | null;
  advanceBottomOnCompletedBoard: number | null;
  advanceVisibleOnCompletedBoard: boolean | null;
  frames: string[];
  notes: string[];
}

const round = (n: number) => Math.round(n * 10) / 10;

function geometry(host: HTMLElement) {
  const scene = query(host, ".world-scene");
  const card = query<HTMLElement>(host, ".coc-card");
  const body = query<HTMLElement>(host, ".coc-card__body");
  const banner = host.querySelector<HTMLElement>(".coc-card__banner");
  const actions = host.querySelector<HTMLElement>(".coc-card__actions");
  const figures = Array.from(host.querySelectorAll<HTMLElement>("figure.lesson-visual"));
  return { scene, card, body, banner, actions, figures };
}

/**
 * Click the board's own live controls in DOM order until the gate opens, and report whether
 * it did. Deliberately blind: it is not trying to be a learner, it is trying to reach the
 * ONE state in which "Next" exists to be measured. Controls that would change the question
 * or teach the answer are left alone, because a redraw hands the gate back
 * (`AdvisorLesson`'s `onReopen`) and would undo what this is for.
 */
async function pokeUntilGateOpens(
  host: HTMLElement,
): Promise<{ open: boolean; pokes: number }> {
  const skip =
    ".lesson-interactive__reveal-button, .lesson-interactive__reask-button, .lesson-interactive__reset, .lesson-interactive__resume-button, .lesson-sound-toggle";
  let pokes = 0;
  for (let pass = 0; pass < 8; pass += 1) {
    if (advanceButton(host) !== null) {
      return { open: true, pokes };
    }
    const scopes = Array.from(
      host.querySelectorAll<HTMLElement>(".lesson-feedback-host__stage"),
    );
    const boards =
      scopes.length > 0
        ? scopes
        : Array.from(host.querySelectorAll<HTMLElement>("figure.lesson-visual"));
    if (boards.length === 0) {
      return { open: false, pokes };
    }
    const controls = boards.flatMap((scope) =>
      Array.from(
        scope.querySelectorAll<HTMLElement>("button, [role='button'], [tabindex='0']"),
      ).filter((el) => el.closest(skip) === null && !(el as HTMLButtonElement).disabled),
    );
    if (controls.length === 0) {
      return { open: false, pokes };
    }
    for (const control of controls) {
      if (advanceButton(host) !== null) {
        return { open: true, pokes };
      }
      if (!control.isConnected || (control as HTMLButtonElement).disabled) {
        continue;
      }
      control.click();
      pokes += 1;
      await settle(45);
      if (pokes > 70) {
        return { open: advanceButton(host) !== null, pokes };
      }
    }
  }
  return { open: advanceButton(host) !== null, pokes };
}

/** Measure one lesson surface end to end, take its frames, write its readings. */
async function measureLesson(surface: string, probe: BoardProbe): Promise<Reading> {
  h = await openLearnerLessonAtGatedBoard(probe.node);
  const host = h.host;
  await document.fonts.ready;
  await settle(320);

  const { scene, card, body, banner, actions, figures } = geometry(host);
  const bubble = query<HTMLElement>(host, ".advisor-npc__bubble");
  const advisor = query<HTMLElement>(host, ".advisor-npc");
  const bodyBox = body.getBoundingClientRect();
  const figTop = Math.min(...figures.map((f) => f.getBoundingClientRect().top));
  const figBottom = Math.max(...figures.map((f) => f.getBoundingClientRect().bottom));
  const controls = host.querySelector<HTMLElement>(".advisor-npc__controls");

  const notes: string[] = [];
  const reading: Reading = {
    surface,
    node: probe.node,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    boardIds: probe.ids,
    slide: probe.slide,
    frameClasses: scene.className,
    cardMaxHeightCss: getComputedStyle(card).maxHeight,
    cardHeight: round(card.getBoundingClientRect().height),
    bannerHeight: round(banner?.getBoundingClientRect().height ?? 0),
    actionsHeight: round(actions?.getBoundingClientRect().height ?? 0),
    bodyUsableHeight: round(body.clientHeight),
    bodyContentHeight: round(body.scrollHeight),
    bubbleHeight: round(bubble.getBoundingClientRect().height),
    advisorBlockHeight: round(advisor.getBoundingClientRect().height),
    spaceLeftForWidget: round(Math.max(0, bodyBox.bottom - figTop)),
    widgetNaturalHeight: round(figBottom - figTop),
    widgetHiddenPx: round(Math.max(0, figBottom - bodyBox.bottom)),
    controlsRowTopAtArrival: round(controls?.getBoundingClientRect().top ?? Number.NaN),
    controlsRowTopAtBoardBottom: Number.NaN,
    controlsRowVisibleAtBoardBottom: false,
    controlsRowBottomAtBoardBottom: Number.NaN,
    wellBottom: round(bodyBox.bottom),
    gateOpened: false,
    pokes: 0,
    advanceLabel: null,
    advanceTopOnCompletedBoard: null,
    advanceBottomOnCompletedBoard: null,
    advanceVisibleOnCompletedBoard: null,
    frames: [],
    notes,
  };

  reading.frames.push(await shoot(`${surface}-1-arrival`));

  // Where the learner has to be to work the board, and what is left on screen there.
  body.scrollTop = body.scrollHeight;
  await settle(160);
  const rowAtBottom = host.querySelector<HTMLElement>(".advisor-npc__controls");
  const rowBox = rowAtBottom?.getBoundingClientRect();
  reading.controlsRowTopAtBoardBottom = round(rowBox?.top ?? Number.NaN);
  reading.controlsRowBottomAtBoardBottom = round(rowBox?.bottom ?? Number.NaN);
  reading.controlsRowVisibleAtBoardBottom =
    rowBox !== undefined &&
    rowBox.top >= bodyBox.top - 1 &&
    rowBox.bottom <= bodyBox.bottom + 1;
  reading.frames.push(await shoot(`${surface}-2-scrolled-to-board-bottom`));

  const poked = await pokeUntilGateOpens(host);
  reading.gateOpened = poked.open;
  reading.pokes = poked.pokes;
  if (poked.open) {
    await settle(140);
    const advance = advanceButton(host);
    if (advance) {
      const box = advance.getBoundingClientRect();
      reading.advanceLabel = (advance.textContent ?? "").trim();
      reading.advanceTopOnCompletedBoard = round(box.top);
      reading.advanceBottomOnCompletedBoard = round(box.bottom);
      // Visible means inside the scroll box AND inside the viewport: a control scrolled out
      // of `.coc-card__body` is clipped by `overflow: hidden auto` even though its rect reads.
      const bodyNow = body.getBoundingClientRect();
      reading.advanceVisibleOnCompletedBoard =
        box.top >= Math.max(0, bodyNow.top) - 1 &&
        box.bottom <= Math.min(window.innerHeight, bodyNow.bottom) + 1;
    }
    reading.frames.push(await shoot(`${surface}-3-completed-board`));
  } else {
    notes.push(
      `the blind poker did not open this gate in ${poked.pokes} clicks, so "Next" was never on screen to measure: NOT MEASURED, and its absence here is the gate working`,
    );
  }

  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `${OUT}/${surface}.json`,
      `${JSON.stringify(reading, null, 2)}\n`,
    );
  }
  return reading;
}

/** The faithfulness checks every number rests on. Nothing here asserts the fit. */
function assertLearnerSurface(reading: Reading): void {
  expect(reading.viewport, "the readings were not taken at 1024x580").toBe("1024x580");
  expect(reading.frameClasses, "not the learner frame").toContain("world-scene--large");
  expect(
    reading.frameClasses,
    "this is the `?dev` frame, whose `max-height: none` lifts the cap being measured",
  ).not.toContain("world-scene--full");
  // A cap, not a number for it. This read `522px` (90vh) when the before-numbers were taken
  // and reads `564px` since `integration` handed the scrim gutter back
  // (`.world-scene--large .coc-card { max-height: calc(100vh - 2 * var(--space-sm)) }`, whose
  // guard is `lessonPanelSceneFit.browser.test.tsx`). Both are caps; `none` is the dev frame.
  expect(
    reading.cardMaxHeightCss,
    "this mount is uncapped, so it is the `?dev` frame rather than the learner's",
  ).not.toBe("none");
  expect(
    reading.cardHeight,
    `the card is ${reading.cardHeight}px on a 580px screen, so no cap is holding it`,
  ).toBeLessThanOrEqual(580);
  expect(reading.frames.length, "no frame was written").toBeGreaterThanOrEqual(2);
}

/* ------------------------------------------------------------------ the surfaces */

test.each(LESSON_DOMAINS.map((d) => d.id))(
  "%s: the learner's gated board at 1024x580",
  async (domainId) => {
    const probe = await representative(domainId);
    const reading = await measureLesson(domainId, probe);
    assertLearnerSurface(reading);
    expect(
      reading.widgetNaturalHeight,
      `${domainId}: no board was measured`,
    ).toBeGreaterThan(40);
  },
  240_000,
);

/**
 * **THE ADVANCE CONTROL ON A BOARD THAT WAS ACTUALLY FINISHED, one per domain.**
 *
 * The sweep above measures each domain's TALLEST first-gated board, and on nine of the ten the
 * blind poker cannot finish it, because those boards want a correct answer rather than a click.
 * On an unfinished board "Next" does not exist, so its reachability there is NOT MEASURED and
 * the row it would sit in is all that can be read.
 *
 * This is the other half: walk each domain's lessons until one of its first-gated boards is one
 * the poker can genuinely FINISH, and then measure the real "Next" — at the scroll position the
 * learner is left in, which is the bottom of the board they just worked. Same learner host, same
 * cap, same viewport. It measures a shorter board than the sweep above, so it understates the
 * cut-off; what it is evidence for is where the control ends up, which is the claim the tall
 * boards can only proxy.
 */
test.each(LESSON_DOMAINS.map((d) => d.id))(
  "%s: where Next lands on a board the learner finished, at 1024x580",
  async (domainId) => {
    const domain = LESSON_DOMAINS.find((d) => d.id === domainId);
    if (!domain) {
      throw new Error(`no domain ${domainId}`);
    }
    const attempts: {
      node: string;
      reached: boolean;
      gateOpened: boolean;
      pokes: number;
      reason?: string;
    }[] = [];
    let found: Record<string, unknown> | null = null;

    for (const lesson of domain.lessons) {
      if (firstGatedSlide(lesson) === null) {
        continue;
      }
      let host: HTMLElement;
      try {
        h = await openLearnerLessonAtGatedBoard(lesson.node_id);
        host = h.host;
      } catch (error) {
        attempts.push({
          node: lesson.node_id,
          reached: false,
          gateOpened: false,
          pokes: 0,
          reason: String(error),
        });
        h?.cleanup();
        h = null;
        continue;
      }
      await settle(160);
      const body = query<HTMLElement>(host, ".coc-card__body");
      const figures = Array.from(
        host.querySelectorAll<HTMLElement>("figure.lesson-visual"),
      );
      const bubble = query<HTMLElement>(host, ".advisor-npc__bubble");
      const boardHeight = round(
        Math.max(...figures.map((f) => f.getBoundingClientRect().bottom)) -
          Math.min(...figures.map((f) => f.getBoundingClientRect().top)),
      );
      // The learner's own position when they finish a board: scrolled to its bottom.
      body.scrollTop = body.scrollHeight;
      await settle(120);
      const poked = await pokeUntilGateOpens(host);
      attempts.push({
        node: lesson.node_id,
        reached: true,
        gateOpened: poked.open,
        pokes: poked.pokes,
      });
      if (!poked.open) {
        h?.cleanup();
        h = null;
        continue;
      }
      await settle(160);
      const advance = advanceButton(host);
      const controls = host.querySelector<HTMLElement>(".advisor-npc__controls");
      if (advance) {
        const box = advance.getBoundingClientRect();
        const bodyNow = body.getBoundingClientRect();
        found = {
          domain: domainId,
          node: lesson.node_id,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          boardIds: visualsOnSlide(lesson, firstGatedSlide(lesson) as number).map(
            (v) => v.id,
          ),
          bubbleHeight: round(bubble.getBoundingClientRect().height),
          boardHeightBeforeCompletion: boardHeight,
          bodyUsableHeight: round(body.clientHeight),
          bodyContentHeight: round(body.scrollHeight),
          scrollTop: round(body.scrollTop),
          advanceLabel: (advance.textContent ?? "").trim(),
          advanceTop: round(box.top),
          advanceBottom: round(box.bottom),
          controlsRowTop: round(controls?.getBoundingClientRect().top ?? Number.NaN),
          bodyTop: round(bodyNow.top),
          bodyBottom: round(bodyNow.bottom),
          advanceVisible:
            box.top >= Math.max(0, bodyNow.top) - 1 &&
            box.bottom <= Math.min(window.innerHeight, bodyNow.bottom) + 1,
          pokes: poked.pokes,
          frame: await shoot(`${domainId}-4-finished-${lesson.node_id}`),
        };
      }
      h?.cleanup();
      h = null;
      break;
    }

    if (CAPTURE_EVIDENCE) {
      await commands.writeFile(
        `${OUT}/${domainId}-finished.json`,
        `${JSON.stringify({ domain: domainId, attempts, found }, null, 2)}\n`,
      );
    }
    // No assertion on the fit, and none on finding a completable board either: a domain whose
    // every first-gated board wants a real answer is a fact about the content, not a failure.
    expect(attempts.length, `${domainId}: no lesson gates a board at all`).toBeGreaterThan(
      0,
    );
  },
  600_000,
);

/**
 * The Town Hall's interleaved drill, mounted the way `CitySurface.tsx` mounts it: the same
 * `WorldScene size="large"`, the same `whenEraCannotMix`, so the frame and the cap are the
 * learner's. Its content is a drill rather than an advisor slide: it mounts an advisor for one
 * line of encouragement but gives it no controls, so the way forward is the drill's own
 * "Check" inside the board. What is measured is the card, the body, that bubble and that
 * control.
 */
test("town-hall: the interleaved drill at 1024x580", async () => {
  const practiced = allLessons.map((lesson) => lesson.node_id);
  h = mount(
    <WorldScene
      eyebrow="Town Hall · island hub"
      title="Interleaved practice"
      tone="lesson"
      size="large"
      exitLabel="Back to city"
      onExit={() => {}}
    >
      <EraInfinitePractice
        eraId="prehistoric"
        completedNodeIds={practiced}
        whenEraCannotMix="revisit-practiced"
        backLabel="Back to city"
        onExit={() => {}}
      />
    </WorldScene>,
  );
  const host = h.host;
  // Same reason as `openLearnerLessonAtGatedBoard`: the panel tokens live on `.city-shell`.
  host.className = "city-shell";
  await waitFor(() => host.querySelector(".coc-card") !== null, "the card mounts");
  query(host, ".coc-card").style.animation = "none";
  await waitFor(
    // The drill's root is `section.lesson-practice`; the streak line is what tells it apart
    // from a graded practice set, so both are waited on rather than just the section.
    () => host.querySelector(".lesson-practice .infinite-practice__streak") !== null,
    "the interleaved drill mounts",
  );
  await document.fonts.ready;
  await settle(320);

  const scene = query(host, ".world-scene");
  const card = query<HTMLElement>(host, ".coc-card");
  const body = query<HTMLElement>(host, ".coc-card__body");
  const banner = host.querySelector<HTMLElement>(".coc-card__banner");
  const actions = host.querySelector<HTMLElement>(".coc-card__actions");
  const drill = query<HTMLElement>(host, ".lesson-practice");
  // The drill DOES mount an advisor (`InfiniteDrill` renders one line of encouragement), so
  // this is read off the DOM rather than written down as zero. An earlier revision of this
  // file recorded 0 with a note claiming there was no bubble at all, and the note was wrong:
  // what the interleaved surface has none of is an advisor CONTROL ROW.
  const townHallBubble = host.querySelector<HTMLElement>(".advisor-npc__bubble");
  const bodyBox = body.getBoundingClientRect();
  const drillBox = drill.getBoundingClientRect();
  const check = Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => (b.textContent ?? "").trim().toLowerCase() === "check",
  );
  const checkBox = check?.getBoundingClientRect();

  const reading: Reading = {
    surface: "town-hall",
    node: "era prehistoric, interleaved",
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    boardIds: ["lesson-practice (interleaved drill)"],
    slide: null,
    frameClasses: scene.className,
    cardMaxHeightCss: getComputedStyle(card).maxHeight,
    cardHeight: round(card.getBoundingClientRect().height),
    bannerHeight: round(banner?.getBoundingClientRect().height ?? 0),
    actionsHeight: round(actions?.getBoundingClientRect().height ?? 0),
    bodyUsableHeight: round(body.clientHeight),
    bodyContentHeight: round(body.scrollHeight),
    bubbleHeight: round(townHallBubble?.getBoundingClientRect().height ?? 0),
    advisorBlockHeight: round(
      host.querySelector(".advisor-npc")?.getBoundingClientRect().height ?? 0,
    ),
    spaceLeftForWidget: round(Math.max(0, bodyBox.bottom - drillBox.top)),
    widgetNaturalHeight: round(drillBox.height),
    widgetHiddenPx: round(Math.max(0, drillBox.bottom - bodyBox.bottom)),
    controlsRowTopAtArrival: round(checkBox?.top ?? Number.NaN),
    controlsRowTopAtBoardBottom: Number.NaN,
    controlsRowVisibleAtBoardBottom: false,
    // No advisor control row here at all, so these are the drill's own Check.
    controlsRowBottomAtBoardBottom: Number.NaN,
    wellBottom: round(bodyBox.bottom),
    gateOpened: true,
    pokes: 0,
    advanceLabel: check ? "Check" : null,
    advanceTopOnCompletedBoard: round(checkBox?.top ?? Number.NaN),
    advanceBottomOnCompletedBoard: round(checkBox?.bottom ?? Number.NaN),
    advanceVisibleOnCompletedBoard:
      checkBox !== undefined &&
      checkBox.top >= bodyBox.top - 1 &&
      checkBox.bottom <= Math.min(window.innerHeight, bodyBox.bottom) + 1,
    frames: [],
    notes: [
      `this surface has an advisor bubble (measured above) but NO advisor control row: ${
        host.querySelector(".advisor-npc__controls") === null
          ? "confirmed absent"
          : "PRESENT"
      }. The way forward here is the drill's own Check, inside the board, which is why the defect does not reach it`,
    ],
  };

  reading.frames.push(await shoot("town-hall-1-arrival"));
  body.scrollTop = body.scrollHeight;
  await settle(160);
  const checkAfter = check?.getBoundingClientRect();
  reading.controlsRowTopAtBoardBottom = round(checkAfter?.top ?? Number.NaN);
  reading.controlsRowBottomAtBoardBottom = round(checkAfter?.bottom ?? Number.NaN);
  reading.controlsRowVisibleAtBoardBottom =
    checkAfter !== undefined &&
    checkAfter.top >= bodyBox.top - 1 &&
    checkAfter.bottom <= bodyBox.bottom + 1;
  reading.frames.push(await shoot("town-hall-2-scrolled-to-board-bottom"));

  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `${OUT}/town-hall.json`,
      `${JSON.stringify(reading, null, 2)}\n`,
    );
  }
  assertLearnerSurface(reading);
}, 240_000);
