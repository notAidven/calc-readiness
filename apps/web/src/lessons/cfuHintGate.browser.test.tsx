/**
 * The check's reveal follows the hint, and it brings the working with it.
 *
 * Two claims, in one file because they are two halves of one exchange. A learner who is
 * stuck on the end-of-lesson question is offered ONE hint, and only once that is spent is
 * the answer offered; and what the answer arrives with is the same worked solution the
 * practice card shows, not a sentence.
 *
 * ## Why the second half cannot be checked by reading `cfu.tsx`
 *
 * The card is `WidgetFeedbackHost`'s `children`, and the host wraps its children in
 * `.lesson-feedback-host__stage` and marks that stage `inert` for exactly as long as the
 * first reveal is holding the instance. So working RENDERED BY THE CARD would be dropped
 * from the accessibility tree over precisely the window it exists to fill, and a test that
 * only asked "is `.worked-solution` in the document" would pass on a version no screen
 * reader could reach. Every assertion below about the solution therefore says WHERE it is.
 *
 * ## It is in Chromium, and NOT for the reason this header used to give
 *
 * It used to say that jsdom does not implement `inert`, so the containment assertions "would
 * hold there whether the fix were present or not". That is measurably false and is corrected
 * rather than deleted, because the same sentence is quoted in `cfuVariantRetry.browser.test
 * .tsx` and the reasoning is worth not repeating. jsdom implements no `inert` BEHAVIOUR, but
 * this file never asserts the behaviour: it asserts `hasAttribute("inert")`, which is an
 * attribute like any other, and `contains`, which is structure. Both hold identically in
 * either environment.
 *
 * Measured at `09c9c5d1` rather than argued. Move `{passage?.solution}` inside
 * `.lesson-feedback-host__stage` in `widgetFeedback.tsx` -- the defect this file exists for --
 * and the test named "the reveal brings the working, outside the frozen stage and outside the
 * passage" fails in BOTH suites, in 182 ms under Chromium and 75 ms under jsdom, with the same
 * message. See `docs/2026-08-05-browser-suite-classification.md` §5.
 *
 * So this file is in the browser suite because moving it saves nothing, which that document
 * measures at 1.01x, and not because a browser can see something jsdom cannot. Do not cite
 * this file as a reason a DOM-structure claim needs Chromium.
 */

import { afterEach, beforeEach, expect, test } from "vitest";

import { LessonCfu } from "./cfu";
import { allLessons } from "./domains";
import { setLessonSoundMuted } from "./lessonSound";
import {
  type AudioProbe,
  type Harness,
  installCountingAudio,
  mount,
  setInputValue,
  waitFor,
} from "./testHarness";
import type { LessonCfuSpec } from "./types";

/**
 * A self-contained check: an accepted list and no `check` block, so grading is the
 * exact-match path and nothing here depends on a registered item version. Its worked
 * solution is authored here for the same reason, so the mechanic is proved against a
 * fixture rather than against whichever pack happens to be shortest today.
 */
const CFU: LessonCfuSpec = {
  prompt: "A crate holds $12$ bolts. How many bolts are in $4$ crates?",
  accepted: ["48"],
  hint: "One crate is $12$ bolts, so four crates is that count taken four times over. Multiply the bolts in a crate by the number of crates.",
  worked_solution: [
    "Four crates of $12$ is $12$ added four times, which is $12 \\times 4$.",
    "$12 \\times 4 = 48$.",
    "There are $48$ bolts.",
  ],
};

const WRONG = "7";

let h: Harness | null = null;
let audio: AudioProbe | null = null;

beforeEach(() => {
  audio = installCountingAudio();
  setLessonSoundMuted(true);
});

afterEach(() => {
  h?.cleanup();
  h = null;
  audio?.restore();
  audio = null;
  setLessonSoundMuted(false);
});

function card(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-player__cfu");
  if (found === null) {
    throw new Error("no check-for-understanding card mounted");
  }
  return found;
}

function field(host: HTMLElement): HTMLInputElement {
  const found = card(host).querySelector<HTMLInputElement>("input");
  if (found === null) {
    throw new Error("the card has no answer field");
  }
  return found;
}

function revealButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button");
}

function reAskButton(host: HTMLElement): HTMLButtonElement | null {
  return host.querySelector<HTMLButtonElement>(".lesson-interactive__reask-button");
}

function passage(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>(".lesson-interactive__reveal");
}

function solution(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>(".worked-solution");
}

function stage(host: HTMLElement): HTMLElement {
  const found = host.querySelector<HTMLElement>(".lesson-feedback-host__stage");
  if (found === null) {
    throw new Error("no feedback stage mounted");
  }
  return found;
}

function answer(host: HTMLElement, value: string): void {
  setInputValue(field(host), value);
  card(host).querySelector<HTMLButtonElement>("button[type='submit']")?.click();
}

function mountCfu(hintTaken: boolean): HTMLElement {
  h = mount(<LessonCfu cfu={CFU} nodeId="NUM.3" hintTaken={hintTaken} />);
  return h.host;
}

/* ------------------------------------------------------------------- the hint gate */

test("a wrong attempt alone does not put the answer on offer", async () => {
  const host = mountCfu(false);
  await waitFor(
    () => host.querySelector(".lesson-player__cfu") !== null,
    "the card mounts",
  );

  answer(host, WRONG);
  await waitFor(
    () => host.querySelector(".lesson-player__feedback") !== null,
    "the attempt is graded",
  );

  // The attempt landed, so the ONLY thing withholding the reveal is the unspent hint. That
  // is what makes this a test of the gate rather than of the attempt count that predates it.
  expect(
    revealButton(host),
    "the reveal is offered beside the hint rather than after it, so the shorter path to the answer is the one a stuck learner takes",
  ).toBeNull();
});

test("the hint alone does not put it on offer either", async () => {
  const host = mountCfu(true);
  await waitFor(
    () => host.querySelector(".lesson-player__cfu") !== null,
    "the card mounts",
  );

  // No attempt yet. The pre-existing half of the gate: a reveal reachable on the first
  // click is not a way out for someone stuck, it is a way past the question.
  expect(
    revealButton(host),
    "the answer is offered before the learner has tried the question",
  ).toBeNull();
});

test("hint spent plus an attempt made is what opens it", async () => {
  const host = mountCfu(true);
  await waitFor(
    () => host.querySelector(".lesson-player__cfu") !== null,
    "the card mounts",
  );

  answer(host, WRONG);
  await waitFor(() => revealButton(host) !== null, "the reveal is offered");

  expect(revealButton(host)).not.toBeNull();
});

/* -------------------------------------------------------------- the worked solution */

test("the reveal brings the working, outside the frozen stage and outside the passage", async () => {
  const host = mountCfu(true);
  await waitFor(
    () => host.querySelector(".lesson-player__cfu") !== null,
    "the card mounts",
  );

  expect(
    solution(host),
    "the working is on screen before anything was revealed",
  ).toBeNull();

  answer(host, WRONG);
  await waitFor(() => revealButton(host) !== null, "the reveal is offered");
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, "the passage opens");
  await waitFor(() => solution(host) !== null, "the working opens with it");

  const working = solution(host) as HTMLElement;

  // The freeze is on, so this is the window the placement has to survive.
  expect(stage(host).hasAttribute("inert"), "the spent instance is not frozen").toBe(true);
  expect(
    stage(host).contains(working),
    "the working is inside the frozen stage, so it is dropped from the accessibility tree for exactly as long as it is on screen",
  ).toBe(false);
  expect(
    (passage(host) as HTMLElement).contains(working),
    "the working is inside the passage, which is a paragraph and cannot hold a list of steps",
  ).toBe(false);

  // And it is the steps themselves, in order, ending on the answer.
  const steps = Array.from(working.querySelectorAll(".worked-solution__step"));
  expect(steps.length, "the reveal printed a heading over no steps").toBe(
    CFU.worked_solution?.length,
  );
  expect(steps.at(-1)?.getAttribute("data-answer"), "the last step is not marked").toBe(
    "true",
  );
  expect(steps.at(-1)?.textContent ?? "").toContain("48");
});

test("taking the re-ask takes the working away with the question it explained", async () => {
  const host = mountCfu(true);
  await waitFor(
    () => host.querySelector(".lesson-player__cfu") !== null,
    "the card mounts",
  );

  answer(host, WRONG);
  await waitFor(() => revealButton(host) !== null, "the reveal is offered");
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => solution(host) !== null, "the working opens");

  (reAskButton(host) as HTMLButtonElement).click();
  await waitFor(() => solution(host) === null, "the working is dismissed with the passage");

  // A solved problem left standing over the question the learner is being asked to work is
  // the answer to that question, whatever the passage above it has stopped saying.
  expect(solution(host)).toBeNull();
});

test("a correct answer never puts the working on screen", async () => {
  const host = mountCfu(true);
  await waitFor(
    () => host.querySelector(".lesson-player__cfu") !== null,
    "the card mounts",
  );

  answer(host, "48");
  await waitFor(
    () => host.querySelector(".lesson-player__feedback") !== null,
    "the answer is graded",
  );

  expect(
    solution(host),
    "the learner who worked it out is shown someone else's working",
  ).toBeNull();
});

/* ------------------------------------------------ every pack can actually fill the slot */

const AUTHORED = allLessons
  .filter((lesson) => lesson.cfu !== undefined)
  .map((lesson) => [lesson.node_id, lesson.cfu as LessonCfuSpec] as const);

/**
 * The checks whose reveal is step cards rather than a diagram, with the reason for each.
 *
 * **Empty, and asserted empty.** This sweep used to accept `steps + figures > 0`, on the
 * reasoning that a pack with a registered diagram shows one and the rest show cards -- which
 * was true, and meant the assertion passed identically whether 12 packs had figures or 39 did.
 * A sweep that cannot tell those two trees apart is not evidence for either.
 *
 * Asserted in both directions below, so this cannot become a quiet way out: a listed pack that
 * gains a figure fails, and an unlisted one that loses its figure fails.
 */
const STEP_CARDS_ONLY: readonly { node: string; why: string }[] = [];

test("the sweep found the authored checks", () => {
  // A floor, not a fingerprint. `test.each` over an empty list passes, so without this the
  // case below would go green the day `allLessons` stopped carrying checks.
  expect(AUTHORED.length).toBeGreaterThanOrEqual(39);
  expect(STEP_CARDS_ONLY).toEqual([]);
  for (const { node } of STEP_CARDS_ONLY) {
    expect(
      AUTHORED.some(([nodeId]) => nodeId === node),
      `${node} is excused from having a figure but is no longer a check`,
    ).toBe(true);
  }
});

/** The reveal's working, once it is on screen. */
async function openWorking(host: HTMLElement, nodeId: string, which: string) {
  answer(host, "zzz");
  await waitFor(
    () => revealButton(host) !== null,
    `${nodeId}: the reveal is offered on its ${which} question`,
  );
  (revealButton(host) as HTMLButtonElement).click();
  await waitFor(() => passage(host) !== null, `${nodeId}: the ${which} passage opens`);
  await waitFor(() => solution(host) !== null, `${nodeId}: the ${which} working opens`);
  return solution(host) as HTMLElement;
}

test.each(AUTHORED)("%s: both of its questions reveal a diagram", async (nodeId, cfu) => {
  const excused = STEP_CARDS_ONLY.some((entry) => entry.node === nodeId);
  h = mount(<LessonCfu cfu={cfu} nodeId={nodeId} hintTaken />);
  const host = h.host;
  await waitFor(
    () => host.querySelector(".lesson-player__cfu") !== null,
    `${nodeId} mounts`,
  );

  // Both questions, because they reach their figures by different routes: the authored one
  // through the pack's `worked_solution_params`, the re-ask through the parameters its
  // template was drawn with. A pack can have one and not the other, and did.
  for (const which of ["authored", "re-asked"]) {
    const working = await openWorking(host, nodeId, which);
    const steps = working.querySelectorAll(".worked-solution__step").length;
    const figures = working.querySelectorAll("figure").length;
    if (excused) {
      // The figure count first, so a pack that has quietly grown one fails at the sentence
      // about its excuse rather than at "a heading over nothing", which is true of it too.
      expect(
        figures,
        `${nodeId} is excused as step-cards-only but its ${which} question now draws a figure`,
      ).toBe(0);
      expect(
        steps,
        `${nodeId}: the ${which} working is a heading over nothing`,
      ).toBeGreaterThan(0);
    } else {
      expect(
        figures,
        `${nodeId}: the ${which} question reveals ${steps} step cards and no diagram`,
      ).toBeGreaterThan(0);
      expect(steps, `${nodeId}: the ${which} figure is drawn OVER the step cards`).toBe(0);
    }
    if (which === "authored") {
      (reAskButton(host) as HTMLButtonElement).click();
      await waitFor(
        () => solution(host) === null,
        `${nodeId}: the working is dismissed with the re-ask`,
      );
    }
  }
});
