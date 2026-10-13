/**
 * The `?dev` CFU step against the CFU a learner is actually given, photographed side by
 * side in real Chromium.
 *
 * "It looks like the game" is a claim about a rendered frame, and no assertion available
 * here can settle it: a class list proves what the stylesheet was asked for, and this is a
 * question about what came out. So the frames are the evidence, and the assertions below
 * only pin the two things a frame cannot be trusted to show — that the control is really
 * on screen and really the shared element, so a photograph of it is a photograph of the
 * game's button rather than of something that resembles it.
 *
 * SHOT AT 1024x580, which is a short laptop window rather than a comfortable developer
 * one. A tall viewport flatters any vertical stack, and this surface is a stack of four
 * things (hint, question, reveal, answer key); the question worth answering is whether an
 * author can still see the question underneath the help.
 *
 * The frames are FULL-PAGE, deliberately never cropped to the button. The subject is
 * where the control sits relative to the card and to the dashed answer-key panel it used
 * to be buried inside, and a crop to the control would show the one part nobody doubted.
 *
 * Written into the gitignored `__screenshots__` directory: this is review evidence, not a
 * committed asset, and nothing here compares against a stored baseline.
 */

import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { WorldScene } from "../city/WorldScene";
import { DevLessons } from "../DevLessons";
import { AdvisorLesson } from "./AdvisorLesson";
import { lessonByNode } from "./domains";
import { findButton, type Harness, mount, waitFor } from "./testHarness";
import type { LessonContent } from "./types";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

let h: Harness | null = null;

/**
 * A short laptop window. `page.viewport` resizes this file's iframe only, and every other
 * browser file sets its own, so nothing another test measures at moves.
 */
const SHORT = { width: 1024, height: 580 };

const NODE_ID = "RAD.4";

afterEach(() => {
  h?.cleanup();
  h = null;
});

/**
 * Bring `selector` into frame before shooting.
 *
 * A viewport screenshot photographs the viewport, so a frame taken without this shows the
 * stepper's own header (title band, slide index, gating note, nav chips — around 380px of
 * it) and says nothing about a control sitting below the fold. Naming what to scroll to
 * keeps each frame framed on the thing its caption claims.
 */
async function bringIntoFrame(selector: string): Promise<void> {
  const target = document.querySelector(selector);
  if (!target) {
    throw new Error(`nothing to scroll to: ${selector}`);
  }
  target.scrollIntoView({ block: "center" });
  await new Promise<void>((resolve) => setTimeout(resolve, 120));
}

async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  // The dev frame pops in from `scale(0.86)`; a transformed box photographs small and in
  // the wrong place, so wait for the card to come to rest.
  await Promise.all(
    Array.from(document.querySelectorAll(".coc-popup, .coc-card")).flatMap((el) =>
      el.getAnimations().map((a) => a.finished.catch(() => undefined)),
    ),
  );
  if (CAPTURE_EVIDENCE) {
    const written = await page.screenshot({
      path: `__screenshots__/dev-cfu-parity/${name}.png`,
    });
    expect(written, `${name} was photographed`).toBeTruthy();
  }
}

function hintButton(): HTMLButtonElement {
  const found = document.querySelector<HTMLButtonElement>(".advisor-npc__action--hint");
  if (!found) {
    throw new Error("no Show hint control on screen");
  }
  return found;
}

/** On screen and inside the viewport, which is what makes the frame worth reading. */
function onScreen(el: Element, what: string): void {
  const box = el.getBoundingClientRect();
  expect(box.width, `${what} has width`).toBeGreaterThan(0);
  expect(box.height, `${what} has height`).toBeGreaterThan(0);
  expect(box.top, `${what} is inside the short viewport`).toBeLessThan(window.innerHeight);
  expect(box.right, `${what} is not off the right edge`).toBeLessThanOrEqual(
    window.innerWidth,
  );
}

test("the dev CFU step offers the game's hint control, photographed at 1024x580", async () => {
  await page.viewport(SHORT.width, SHORT.height);

  h = mount(<DevLessons />);
  await waitFor(
    () => document.getElementById(`dev-slides-${NODE_ID}`) !== null,
    "the dev lesson list renders",
  );
  document.getElementById(`dev-slides-${NODE_ID}`)?.click();
  await waitFor(() => document.querySelector(".dev-slides") !== null, "the stepper opens");

  const chip = document.querySelector<HTMLButtonElement>(
    '[aria-label="Go to check for understanding"]',
  );
  if (!chip) {
    throw new Error("the stepper does not reach the CFU");
  }
  chip.click();
  await waitFor(
    () => document.querySelector(".dev-slides__key") !== null,
    "the CFU step opens",
  );

  // The claim the frame is being taken to support: this is the shared control, it is
  // visible, and it is not inside the dashed panel the frame also shows.
  const hint = hintButton();
  onScreen(hint, "the Show hint control");
  expect(hint.querySelector("svg.lesson-icon--hint"), "it carries the bulb").not.toBeNull();
  expect(
    hint.closest("aside.dev-slides__key"),
    "it is outside the answer key, which is the frame's subject",
  ).toBeNull();
  onScreen(document.querySelector(".lesson-player__cfu") as Element, "the question");
  await shoot("dev-1-hint-offered");

  // Spent: the hint reads where a learner reads it, and the question is still in view.
  hint.click();
  await waitFor(
    () => document.querySelector(".advisor-npc__action--hint") === null,
    "the spent hint retires its button",
  );
  onScreen(document.querySelector(".lesson-player__cfu") as Element, "the question");
  await shoot("dev-2-hint-spent");

  // Revealed, which is the state an author comes to this step to look at.
  const field = document.querySelector<HTMLInputElement>(".lesson-player__cfu input");
  if (!field) {
    throw new Error("the CFU has no answer field");
  }
  field.value = "x";
  field.dispatchEvent(new Event("input", { bubbles: true }));
  findButton(document.body, "Check").click();
  await waitFor(
    () => document.querySelector(".lesson-interactive__reveal-button") !== null,
    "a wrong answer offers the reveal",
  );
  // Framed on the card, because the reveal is what this frame is offered as evidence of.
  await bringIntoFrame(".lesson-interactive__reveal-button");
  await shoot("dev-3-reveal-offered");

  findButton(document.body, /Reveal answer/).click();
  await waitFor(
    () => document.querySelector(".lesson-interactive__reask-button") !== null,
    "the reveal teaches and offers a different question",
  );
  await shoot("dev-4-revealed");
});

test("the same control on the learner's own CFU, for comparison at 1024x580", async () => {
  await page.viewport(SHORT.width, SHORT.height);

  const pack = lessonByNode[NODE_ID];
  if (!pack?.cfu) {
    throw new Error(`${NODE_ID} is missing its CFU`);
  }
  /**
   * `AdvisorLesson` opens on the CFU when the narration runs out, so a pack with no
   * paragraphs lands there directly. That skips five gated widgets rather than skipping
   * any part of the check: the CFU phase this reaches is the one a learner reaches, and
   * the advisor above it is the real advisor.
   */
  const atTheCheck: LessonContent = { ...pack, mini_lesson: [], visuals: [] };

  h = mount(
    <WorldScene
      eyebrow={NODE_ID}
      title={pack.title}
      tone="lesson"
      size="full"
      // Nothing leaves this frame: the file photographs one state and unmounts.
      onExit={() => undefined}
    >
      <AdvisorLesson content={atTheCheck} />
    </WorldScene>,
  );
  await waitFor(
    () => document.querySelector(".lesson-player__cfu") !== null,
    "the learner's CFU opens",
  );

  const hint = hintButton();
  onScreen(hint, "the advisor's Show hint control");
  // The learner's surface must never carry the author's half, which is the other thing the
  // two frames are being read against each other for.
  expect(document.querySelector(".dev-slides__key"), "no answer key here").toBeNull();
  await shoot("game-1-hint-offered");

  hint.click();
  await waitFor(
    () => document.querySelector(".advisor-npc__action--hint") === null,
    "the spent hint retires its button",
  );
  await shoot("game-2-hint-spent");
});
