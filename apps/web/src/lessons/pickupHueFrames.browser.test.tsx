/**
 * WHAT A HELD ITEM LOOKS LIKE, PHOTOGRAPHED ON THE LEARNER'S OWN SURFACE.
 *
 * `svgKit.tsx` reserves `CIVIC` and `BRICK` for the correctness channel: green means the
 * learner got it right, red means they did not, and both belong to the learner's ACTION. A
 * picked-up chip is not an action that has been judged — nothing has been offered yet — so a
 * held item painted in either hue borrows a verdict the board is not making.
 *
 * That is a claim about a COLOUR on screen, so it is settled from a frame rather than from a
 * reading. The three shared pickup kinds each get one placed instance, put into the held state
 * and photographed twice: the whole 1024x580 viewport, and a x6 crop of the held control, since
 * at 1024x580 a 2px border is not something a reviewer can adjudicate by eye.
 *
 * ## The mount is the learner's, not `?dev`'s and not a bare host
 *
 * Copied from `d4Pol567StyleFixes.browser.test.tsx` for the reasons that file states, both of
 * which would make a frame here lie:
 *
 *   - the panel tokens (`--glass-fill-strong` and its neighbours) are declared on `.city-shell`
 *     rather than at `:root`, so a component mounted straight onto `document.body` resolves them
 *     to nothing and paints transparent panels a learner never sees;
 *   - `WorldScene size="large"` is the shipped learner component. The historical `full` dev
 *     alias now shares its geometry, but not the city-owned mount and state this evidence is
 *     intended to exercise.
 *
 * The three shared-kind boards all live on D2 EXP.1, which is where their authored instances
 * happen to sit together; each slide is sliced down to the one paragraph its widget is placed
 * after so the frame opens on the board rather than several `Next` clicks away from it.
 *
 * A FOURTH BOARD, `stone-pieces-sorter` on D4 POL.1, is photographed because it is not one of the
 * three kinds. Six boards under `interactive/` carry their own copy of the pickup mechanic and
 * painted `CIVIC` on a lifted chip; a frame of the shared `FillTable` chip is a picture of the
 * same class, and a picture of a class is not a picture of an instance.
 */

import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { WorldScene } from "../city/WorldScene";
import { AdvisorLesson } from "./AdvisorLesson";
import { lessonByNode } from "./domains";
import { type Harness, mount, waitFor } from "./testHarness";
import type { LessonContent } from "./types";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const VIEWPORT = { width: 1024, height: 580 } as const;

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
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

function mountLearnerScene(title: string, children: ReactNode): HTMLElement {
  h = mount(
    <WorldScene
      eyebrow="Exponent workshop · lesson"
      title={title}
      tone="lesson"
      size="large"
      onExit={() => {}}
    >
      {children}
    </WorldScene>,
  );
  h.host.className = "city-shell";
  return h.host;
}

async function assertLearnerMount(host: HTMLElement): Promise<void> {
  await waitFor(
    () => host.querySelector(".world-scene--large .coc-card") !== null,
    "learner scene mounts",
    20_000,
  );
  const card = host.querySelector<HTMLElement>(".world-scene--large .coc-card");
  if (!card) {
    throw new Error("learner scene produced no card");
  }
  card.style.animation = "none";
  expect(getComputedStyle(card).maxHeight, "learner card stays height-capped").not.toBe(
    "none",
  );
}

/**
 * The lesson cut down to the single slide its named visual is placed after.
 *
 * Every positional array is re-sliced together, not just the prose: `worked_examples` and
 * `slide_subtitles` are indexed by slide, so a fixture that only sliced `mini_lesson` would
 * pair this widget's paragraph with slide 0's worked example and quietly photograph a slide
 * that does not exist.
 */
function slideCarrying(nodeId: string, visualId: string): LessonContent {
  const lesson = lessonByNode[nodeId];
  const visual = lesson?.visuals?.find((entry) => entry.id === visualId);
  if (!lesson || !visual) {
    throw new Error(`${nodeId} no longer places ${visualId}`);
  }
  const slide = visual.after;
  const prose = lesson.mini_lesson[slide];
  if (prose === undefined) {
    throw new Error(`${nodeId} has no slide ${slide} for ${visualId}`);
  }
  return {
    ...lesson,
    mini_lesson: [prose],
    slide_subtitles: [lesson.slide_subtitles?.[slide] ?? lesson.title],
    worked_examples: [lesson.worked_examples?.[slide] ?? null],
    visuals: [{ ...visual, after: 0 }],
  };
}

function button(host: HTMLElement, label: RegExp): HTMLButtonElement | undefined {
  return Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find((candidate) =>
    label.test((candidate.textContent ?? "").trim()),
  );
}

/**
 * Click through the slide's sections until the board is on screen.
 *
 * A fixed number of `Next` clicks would pin the section count of the day rather than the
 * widget this file is about, so the loop is keyed on the board appearing.
 */
async function advanceToBoard(host: HTMLElement, selector: string): Promise<HTMLElement> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (host.querySelector(selector)) {
      break;
    }
    await waitFor(() => button(host, /^Next$/) !== undefined, "the slide offers Next");
    button(host, /^Next$/)?.click();
    await new Promise<void>((resolve) => setTimeout(resolve, 40));
  }
  await waitFor(() => host.querySelector(selector) !== null, `${selector} mounts`, 20_000);
  const board = host.querySelector<HTMLElement>(selector);
  if (!board) {
    throw new Error(`${selector} never mounted`);
  }
  return board;
}

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

function session(): {
  send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
} {
  return cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
}

/** The whole learner viewport, which is what the spatial rule asks for. */
async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  await new Promise<void>((resolve) => setTimeout(resolve, 150));
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a ${VIEWPORT.width}x${VIEWPORT.height} screen`,
  ).toBeCloseTo(1, 1);
  const shot = await session().send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, VIEWPORT.width),
      height: Math.min(box.height, VIEWPORT.height),
      scale: 1,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`.qa-frames/lane-c/${name}.png`, shot.data, {
      encoding: "base64",
    });
  }
}

/**
 * A magnified crop of the held control, off the same rendered page as the full frame.
 *
 * Not a different screen: the clip is in page coordinates and `scale` is CDP's zoom on the
 * output, so these are exactly the pixels a learner is shown, large enough to adjudicate a
 * 2px border by eye. The surrounding board is kept in the crop deliberately — the claim is
 * about how the held item reads AGAINST its unheld neighbours, and a crop tight to the one
 * control would be a picture of the only part nobody doubted.
 */
async function shootRegion(name: string, element: HTMLElement, scale = 5): Promise<void> {
  await document.fonts.ready;
  const frame = testViewportBox();
  const rect = element.getBoundingClientRect();
  const shot = await session().send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: frame.x + rect.left - 8,
      y: frame.y + rect.top - 8,
      width: rect.width + 16,
      height: rect.height + 16,
      scale,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`.qa-frames/lane-c/${name}.png`, shot.data, {
      encoding: "base64",
    });
  }
}

/**
 * Pick something up, and prove the board agrees that it is held.
 *
 * `aria-pressed` is read back rather than assumed, because a frame of a board that never
 * entered the held state would be a picture of the unheld look under a held caption.
 */
async function pickUp(control: HTMLElement, what: string): Promise<void> {
  expect(control.getAttribute("aria-pressed"), `${what} starts unheld`).toBe("false");
  control.click();
  await waitFor(
    () => control.getAttribute("aria-pressed") === "true",
    `${what} reads as held`,
  );
}

test("power-of-power-match: a picked-up left item, at 1024x580 on the learner mount", async () => {
  const content = slideCarrying("EXP.1", "power-of-power-match");
  const host = mountLearnerScene(content.title, <AdvisorLesson content={content} />);
  await assertLearnerMount(host);
  const grid = await advanceToBoard(host, ".lesson-match__grid");
  await waitFor(() => grid.querySelector(".katex") !== null, "the board typesets", 20_000);

  const left = grid.querySelector<HTMLElement>(".lesson-match__side .lesson-match__item");
  if (!left) {
    throw new Error("the match board drew no left item");
  }
  await pickUp(left, "the first left item");
  expect(left.getAttribute("data-state"), "the item is in its held state").toBe("held");

  grid.scrollIntoView({ block: "center" });
  await shoot("match-pairs-held-1024x580");
  await shootRegion("match-pairs-held-x5", left);
});

test("zero-exponent-table: a picked-up tray chip, at 1024x580 on the learner mount", async () => {
  const content = slideCarrying("EXP.1", "zero-exponent-table");
  const host = mountLearnerScene(content.title, <AdvisorLesson content={content} />);
  await assertLearnerMount(host);
  const tray = await advanceToBoard(
    host,
    ".lesson-interactive--table .lesson-sorter__tray",
  );
  await waitFor(() => tray.querySelector(".katex") !== null, "the tray typesets", 20_000);

  const chip = tray.querySelector<HTMLElement>(".lesson-sorter__chip");
  if (!chip) {
    throw new Error("the table board drew no tray chip");
  }
  await pickUp(chip, "the first tray chip");

  tray.scrollIntoView({ block: "center" });
  await shoot("fill-table-held-1024x580");
  await shootRegion("fill-table-held-x5", tray);
});

test("stone-pieces-sorter: a picked-up chip on a bespoke board, at 1024x580", async () => {
  const content = slideCarrying("POL.1", "stone-pieces-sorter");
  const host = mountLearnerScene(content.title, <AdvisorLesson content={content} />);
  await assertLearnerMount(host);
  const tray = await advanceToBoard(host, ".lesson-sorter__tray");
  await waitFor(() => tray.querySelector(".katex") !== null, "the tray typesets", 20_000);

  const chip = tray.querySelector<HTMLElement>(".lesson-sorter__chip");
  if (!chip) {
    throw new Error("the sorter drew no tray chip");
  }
  await pickUp(chip, "the first tray chip");

  tray.scrollIntoView({ block: "center" });
  await shoot("stone-order-sorter-held-1024x580");
  await shootRegion("stone-order-sorter-held-x5", tray);
});

test("power-parts-label: a picked-up name chip, at 1024x580 on the learner mount", async () => {
  const content = slideCarrying("EXP.1", "power-parts-label");
  const host = mountLearnerScene(content.title, <AdvisorLesson content={content} />);
  await assertLearnerMount(host);
  const tray = await advanceToBoard(
    host,
    ".lesson-interactive--label .lesson-sorter__tray",
  );

  const chip = tray.querySelector<HTMLElement>(".lesson-sorter__chip");
  if (!chip) {
    throw new Error("the label board drew no name chip");
  }
  await pickUp(chip, "the first name chip");

  tray.scrollIntoView({ block: "center" });
  await shoot("label-parts-held-1024x580");
  await shootRegion("label-parts-held-x5", tray);
});
