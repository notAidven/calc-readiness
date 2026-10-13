/**
 * A widget's ink belongs inside the card that frames it.
 *
 * REPORTED ON EL.2, in the review scroll: `exp-transform-builder`'s equation row, its Check
 * button and its status line were painted BELOW their beige card, on top of the next slide's
 * prose, while the card itself held a tall empty gap where they should have been. Two things
 * were wrong at once and each is asserted separately: the widget escaped its own card, and
 * what escaped landed on the teaching text.
 *
 * ## Why the frame is the subject, and not the widget
 *
 * The cause was `.lesson-interactive__step-label { flex: 0 0 100% }`. In the row-wrap
 * `.lesson-interactive__controls`, where the class's two other users put it, `100%` means
 * "take a whole line". `ExpTransformBuilder` is the only place it is a direct child of
 * `.lesson-interactive`, which is a flex COLUMN, and there the same `100%` is a basis on the
 * block axis: the label claims the whole board's height, and `flex-shrink: 0` forbids
 * correcting it, so everything after it is pushed out of the card.
 *
 * A percentage basis only resolves against a DEFINITE main size, which is why the frame
 * decides whether this happens at all. Measured at `6bdb318`, EL.2's builder card in the two
 * shipped frames, same viewport, same widget, same stylesheet:
 *
 *   - the old `.world-scene--large` floating learner card used an auto-height grid: label
 *     21.9px tall, everything inside the card;
 *   - `.world-scene--full` stretched to a definite height: label 196.6px tall, exactly the
 *     board's own height, with the field, controls and status painted outside the card.
 *
 * The learner frame is full viewport now and therefore definite too. The sweep still runs both
 * aliases, guarding production and review mounts independently instead of assuming shared
 * geometry guarantees a shared content tree.
 *
 * ## Why no existing test saw it
 *
 * Every widget browser test mounts the component bare, or at most through `LessonVisual`, so
 * the widget's ancestors are a throwaway `<div>` on `document.body` — no card, no scroll box,
 * no definite height anywhere above it. This defect does not exist in that tree, so the
 * harness below rebuilds the shipped chain rather than the widget.
 *
 * The population is scoped by the BEHAVIOUR — anything a lesson frames in a card can overflow
 * it — rather than by the widget kind that happened to be reported, since nothing about the
 * overflow was specific to that kind and the stylesheet it came from governs every board.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { allLessons, lessonByNode } from "./domains";
import { LessonBody } from "./LessonBody";
import { findButton, type Harness, mount, setInputValue, waitFor } from "./testHarness";
import type { LessonContent } from "./types";
import { LessonVisual } from "./visuals";

import "../styles.css";

/**
 * The desktop the review scroll is read on. The headless default is phone-shaped (414px),
 * where the 920px reading column never binds and the card is a third the width; the first
 * run of this file measured there and reported green on the defect it was written for.
 * Restored afterwards so nothing another file measures at moves.
 */
const DESKTOP = { width: 1440, height: 900 };
let restore: { width: number; height: number } | null = null;

beforeAll(async () => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  await page.viewport(DESKTOP.width, DESKTOP.height);
});

afterAll(async () => {
  if (restore !== null) {
    await page.viewport(restore.width, restore.height);
  }
});

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** Both shipped lesson frames, with the class strings `WorldScene`'s `FRAME_CLASS` builds. */
const FRAMES = [
  { where: "the in-city lesson window", frame: "world-scene--large" },
  { where: "the ?dev full-bleed frame", frame: "world-scene--large world-scene--full" },
] as const;

/**
 * The chain `WorldScene` + `AdvisorLesson` put around the review scroll, class for class.
 *
 * The banner and the action tray are here because they are what makes `.coc-card__body`'s
 * `flex: 1 1 auto` bind: without them the body simply takes the whole card and the heights
 * above the widget resolve differently from the shipped page.
 */
function ReviewScroll({ content, frame }: { content: LessonContent; frame: string }) {
  return (
    <div className={`world-scene coc-popup ${frame}`}>
      <div className="world-scene-frame coc-card">
        <button type="button" className="coc-card__close" aria-label="Close" />
        <header className="world-scene-head coc-card__banner">
          <span className="micro-label">{content.node_id} - dev</span>
          <h2>{content.title}</h2>
        </header>
        <div className="world-scene-body coc-card__body">
          <div className="advisor-lesson advisor-lesson--review">
            <button
              type="button"
              className="advisor-npc__action advisor-npc__action--prev advisor-lesson__back"
            >
              Back to options
            </button>
            <LessonBody content={content} />
          </div>
        </div>
        <footer className="world-scene-actions coc-card__actions">
          <button type="button" className="city-action">
            Back to lessons
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Outer budget for a test here that mounts ONE review scroll and measures it.
 *
 * The sweep below already declares 240s for its ~18 lessons across two frames. The
 * single-mount tests declared nothing, so they took the browser default of 15s — measured,
 * not assumed: strip this constant off the last test, give it a 16s sleep, and it fails
 * `Test timed out in 15000ms`, while with the constant it passes. On 2026-08-03 that
 * default took `integration` red twice, at `fdb873d6` and at `1fdaf3e5`, both times out of
 * the last test in this file and both times as `AbortError: The user aborted a request.`
 * rather than as a timeout — which is the shape `shotBudget.ts` explains: a screenshot with
 * no explicit timeout is handed the test's REMAINING time, so a test about to run out of
 * budget aborts inside its last command instead of reporting the clock.
 *
 * **Nothing had slowed down.** `winterSpentHearth.browser.test.tsx` measures 9.35s at
 * `21e8d62a` and 9.23s at `1fdaf3e5` on one machine, and this file's tests measure between
 * 22ms and 393ms locally. What moved was the runner: browser shard 2 went from 271.91s to
 * 420.90s over those same commits, with `titleBackdropFraming` alone going 111.8s to
 * 211.1s. `shotBudget.ts` names that as the fleet's hardware lottery and measures it at
 * 2.6x, and `vitest.browser.config.ts` runs two Chromium workers, so a DOM test in this
 * file is scheduled opposite a WebGL suite on two cores and pays for it.
 *
 * 30s against a 393ms worst measured case is headroom over the bad draw rather than over
 * the good one, which is the sizing rule `shotBudget.ts` argues for and the same floor its
 * `shotTestBudget` uses. These tests assert where a box sits, never how fast it got there,
 * so a wide outer budget costs no coverage: every assertion still runs and still has to
 * pass, and the inner `waitFor`s keep their own messages and still fail first with the name
 * of whatever stalled.
 */
const ONE_SCROLL_BUDGET_MS = 30_000;

async function reviewScroll(content: LessonContent, frame: string): Promise<HTMLElement> {
  const expected = content.visuals?.length ?? 0;
  h = mount(<ReviewScroll content={content} frame={frame} />);
  const host = h.host;
  await waitFor(
    () => host.querySelectorAll("figure.lesson-visual").length === expected,
    `${content.node_id}: all ${expected} figures mount in the review scroll`,
  );

  // `.coc-card`'s pop-in animates `transform: scale`, so a rect read while it runs is the
  // rect of a scaled card. Uniform scaling about one origin preserves both relations
  // asserted here, but the numbers a failure quotes should be the ones a learner gets.
  // (`--full` already sets `animation: none`; this is for `--large`.)
  const card = host.querySelector<HTMLElement>(".coc-card");
  if (card !== null) {
    card.style.animation = "none";
  }
  return host;
}

/** True when `inner` lies inside `outer`, allowing sub-pixel rounding. */
function within(inner: DOMRect, outer: DOMRect, slack = 1): boolean {
  return (
    inner.top >= outer.top - slack &&
    inner.bottom <= outer.bottom + slack &&
    inner.left >= outer.left - slack &&
    inner.right <= outer.right + slack
  );
}

function overlaps(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** Enough of an element to find it in the source from a failure message. */
function name(el: HTMLElement): string {
  const classes = el.className === "" ? el.tagName.toLowerCase() : `.${el.className}`;
  const words = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 44);
  return words === "" ? classes : `${classes} ("${words}")`;
}

/**
 * The painted boxes a card is answerable for.
 *
 * Rows first: the direct children of the feedback host and of the widget inside it, because
 * that is the granularity the reported defect had — the field, the controls and the status
 * escaped as whole rows. Then every form control, button and diagram anywhere beneath, so a
 * single escaped input inside an otherwise contained row is still caught.
 *
 * THERE IS NO EXEMPTION LIST, and that is a measurement rather than an oversight. The one box
 * built to sit outside the flow is the success badge, at `top: -6px; right: -6px` on the
 * feedback host; `figure.lesson-visual` pads 12px a side, so the badge lands 6px INSIDE the
 * card and owes containment like everything else. The last test in this file pins both halves
 * of that, so if the badge ever grows past the padding the failure says so at the badge
 * instead of being quietly excused here.
 *
 * `.visually-hidden` is excluded because it paints nothing at all: it is a 1px clipped box for
 * screen readers, so it can neither be seen outside a card nor cover a word of prose. That is
 * the definition of the ink being swept, not an exemption from containment.
 */
function inkOf(figure: HTMLElement): HTMLElement[] {
  const parts = new Set<HTMLElement>();
  for (const scope of [".lesson-feedback-host", ".lesson-interactive"]) {
    const container = figure.querySelector<HTMLElement>(scope);
    if (container !== null) {
      for (const child of Array.from(container.children)) {
        parts.add(child as HTMLElement);
      }
    }
  }
  for (const el of Array.from(figure.querySelectorAll<HTMLElement>("input, button, svg"))) {
    parts.add(el);
  }
  return Array.from(parts).filter((el) => {
    if (el.closest(".visually-hidden") !== null) {
      return false;
    }
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  });
}

/** The teaching text of the review scroll: its headings and paragraphs, never its figures. */
function proseInk(host: HTMLElement): HTMLElement[] {
  const column = host.querySelector<HTMLElement>(".lesson-player__prose");
  if (column === null) {
    throw new Error("the review scroll rendered no prose column");
  }
  return Array.from(column.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.tagName !== "FIGURE",
  );
}

/* ------------------------------------------------------- 1. the reported instance, EL.2 */

/** The builder's objective line, which is how its card is told from EL.2's other three. */
const BUILDER_GOAL = "the sign the mirror gave it";

function el2(): LessonContent {
  const content = lessonByNode["EL.2"];
  if (content === undefined) {
    throw new Error("EL.2 is not a registered lesson");
  }
  return content;
}

function builderCard(host: HTMLElement): HTMLElement {
  const found = Array.from(host.querySelectorAll<HTMLElement>("figure.lesson-visual")).find(
    (figure) => (figure.textContent ?? "").includes(BUILDER_GOAL),
  );
  if (found === undefined) {
    throw new Error(`no EL.2 card carries the builder's goal ("${BUILDER_GOAL}")`);
  }
  return found;
}

test.each(FRAMES)(
  "EL.2's review scroll keeps every widget's ink inside its own card, in $where",
  async ({ frame }) => {
    const host = await reviewScroll(el2(), frame);
    // The reported card has to be one of the ones measured, or this passes by never
    // reaching the widget the bug is about. Throws rather than asserts: a sweep that
    // cannot find its subject is broken, not failing.
    builderCard(host);

    let measured = 0;
    for (const figure of Array.from(
      host.querySelectorAll<HTMLElement>("figure.lesson-visual"),
    )) {
      const card = figure.getBoundingClientRect();
      for (const el of inkOf(figure)) {
        measured += 1;
        expect(
          within(el.getBoundingClientRect(), card),
          `EL.2: ${name(el)} is painted outside its card`,
        ).toBe(true);
      }
    }

    expect(measured, "EL.2's cards hold no ink to measure").toBeGreaterThanOrEqual(12);
  },
  ONE_SCROLL_BUDGET_MS,
);

test.each(FRAMES)(
  "nothing in EL.2's review scroll is painted over the teaching text, in $where",
  async ({ frame }) => {
    const host = await reviewScroll(el2(), frame);
    builderCard(host);

    const prose = proseInk(host);
    expect(
      prose.length,
      "the review scroll printed no teaching text",
    ).toBeGreaterThanOrEqual(8);

    let compared = 0;
    for (const figure of Array.from(
      host.querySelectorAll<HTMLElement>("figure.lesson-visual"),
    )) {
      for (const el of inkOf(figure)) {
        const box = el.getBoundingClientRect();
        for (const paragraph of prose) {
          compared += 1;
          expect(
            overlaps(box, paragraph.getBoundingClientRect()),
            `EL.2: ${name(el)} is painted over the prose ${name(paragraph)}`,
          ).toBe(false);
        }
      }
    }

    expect(compared, "no widget ink was compared against any prose").toBeGreaterThanOrEqual(
      96,
    );
  },
  ONE_SCROLL_BUDGET_MS,
);

/* --------------------------------------------------------------- 2. the swept population */

/** Every lesson that frames a visual: the population that can exhibit the defect. */
function lessonsWithVisuals(): LessonContent[] {
  return allLessons.filter((lesson) => (lesson.visuals?.length ?? 0) > 0);
}

test.each(FRAMES)(
  "no widget in any lesson's review scroll paints outside the card that frames it, in $where",
  async ({ frame }) => {
    const lessons = lessonsWithVisuals();
    let cards = 0;
    let measured = 0;

    for (const content of lessons) {
      const host = await reviewScroll(content, frame);
      for (const figure of Array.from(
        host.querySelectorAll<HTMLElement>("figure.lesson-visual"),
      )) {
        cards += 1;
        const card = figure.getBoundingClientRect();
        for (const el of inkOf(figure)) {
          measured += 1;
          expect(
            within(el.getBoundingClientRect(), card),
            `${content.node_id}: ${name(el)} is painted outside its card`,
          ).toBe(true);
        }
      }
      h?.cleanup();
      h = null;
    }

    // Floors, because containment is an absence: a sweep that mounted nothing, or mounted
    // cards holding nothing, would pass while proving the opposite.
    expect(lessons.length, "no registered lesson frames a visual").toBeGreaterThanOrEqual(
      18,
    );
    expect(cards, "the review scrolls held no cards").toBeGreaterThanOrEqual(46);
    expect(measured, "the cards held no ink to measure").toBeGreaterThanOrEqual(150);
  },
  240_000,
);

/**
 * The two blanks that solve whichever of the builder's three boards mounted, read off the
 * board itself rather than tabled here: it rotates variants, and a hardcoded pair would
 * answer the wrong board two times in three (and its move line, "over the x-axis and then
 * over the y-axis", contains the other boards' wording).
 *
 * The step label typesets the starting rule and then each axis named in the move, so the
 * coefficient takes a minus when the x-axis is mirrored (the output is negated) and the
 * exponent takes one when the y-axis is (the input is).
 */
function builderAnswer(builder: HTMLElement): [string, string] {
  const label = builder.querySelector<HTMLElement>(".lesson-interactive__step-label");
  if (label === null) {
    throw new Error("the builder prints no step label to read its board from");
  }
  const maths = Array.from(label.querySelectorAll("[data-latex]")).map(
    (node) => node.getAttribute("data-latex") ?? "",
  );
  const coefficient = /y\s*=\s*(-?\d+)/.exec(maths[0] ?? "")?.[1];
  if (coefficient === undefined) {
    throw new Error(`no starting rule in the builder's label: ${maths.join(" | ")}`);
  }
  const axes = maths.slice(1);
  return [
    axes.includes("x") ? `-${coefficient}` : coefficient,
    axes.includes("y") ? "-x" : "x",
  ];
}

/* ------------------------------- 3. the other half of the class the fix has to keep true */

/**
 * The property `flex: 0 0 100%` was written for, on the two widgets that consume the class
 * the way it was meant: inside the row-wrap `.lesson-interactive__controls`, the label takes
 * a whole line and the entry row sits below it rather than beside it.
 *
 * This is the half a careless fix breaks. Dropping the basis without replacing it on the
 * inline axis leaves the label content-width and shoulder to shoulder with the input, and
 * every assertion in this file would still be green.
 */
test(
  "a step label inside a controls row still takes the whole line",
  async () => {
    h = mount(<LessonVisual id="mixed-radicand-solver" />);
    const host = h.host;
    await waitFor(
      () => host.querySelector(".lesson-interactive__step-label") !== null,
      "the solver names the slot it is filling",
    );

    const row = host.querySelector<HTMLElement>(".lesson-interactive__controls");
    const label = host.querySelector<HTMLElement>(".lesson-interactive__step-label");
    const field = host.querySelector<HTMLElement>(".lesson-interactive__field");
    if (row === null || label === null || field === null) {
      throw new Error("the solver's entry row is not laid out as expected");
    }

    const rowBox = row.getBoundingClientRect();
    const labelBox = label.getBoundingClientRect();
    const style = getComputedStyle(row);
    const inner =
      rowBox.width -
      Number.parseFloat(style.paddingLeft) -
      Number.parseFloat(style.paddingRight);

    expect(inner, "the controls row has no width to fill").toBeGreaterThan(100);
    expect(labelBox.width, "the step label no longer spans its row").toBeCloseTo(inner, 0);
    expect(
      field.getBoundingClientRect().top,
      "the entry row moved up beside the label instead of below it",
    ).toBeGreaterThanOrEqual(labelBox.bottom);
  },
  ONE_SCROLL_BUDGET_MS,
);

/* ---------------------------------------- 4. why the sweep above owes no exemption list */

/**
 * The success badge is the one box positioned out of the flow, and the reason the sweep has
 * no exception list. Both halves are asserted, because only the two together say that:
 *
 *   - it really does hang off its feedback host, so it is genuinely the case an exemption
 *     list would have been written for, and this is not a test of an inert element;
 *   - and the card's padding absorbs that overhang, so it is inside the CARD anyway.
 *
 * If the badge ever grows past the 12px padding, the second half fails here — at the badge,
 * naming it — instead of the sweep quietly excusing a box that had stopped qualifying.
 */
test(
  "the success badge hangs off its host and is still inside the card",
  async () => {
    const host = await reviewScroll(el2(), "world-scene--large world-scene--full");
    const builder = builderCard(host);

    const boxes = Array.from(builder.querySelectorAll<HTMLInputElement>("input"));
    expect(boxes.length, "the builder offers no blanks to fill").toBe(2);
    const [coefficient, exponent] = builderAnswer(builder);
    setInputValue(boxes[0] as HTMLInputElement, coefficient);
    setInputValue(boxes[1] as HTMLInputElement, exponent);
    findButton(builder, "Check").click();

    await waitFor(
      () => builder.querySelector(".lesson-feedback-badge") !== null,
      "the solved builder pops its success badge",
    );
    const badge = builder.querySelector<HTMLElement>(".lesson-feedback-badge");
    const feedbackHost = builder.querySelector<HTMLElement>(".lesson-feedback-host");
    if (badge === null || feedbackHost === null) {
      throw new Error("no badge to measure");
    }

    // `lesson-feedback-pop` scales the badge up from 0.5, and a rect read mid-pop is a rect
    // shrunk toward its own centre — which reads as contained whatever the offsets say. Both
    // assertions below are about the offsets, so the pop has to have landed first.
    //
    // ⚑ `finish()` AND NOT `await animation.finished`, WHICH IS WHAT THIS LINE USED TO BE.
    // `Animation.finished` REJECTS when the animation is cancelled, and a React commit that
    // replaces the badge node cancels it — so under contention this line did not report a
    // badge in the wrong place, it killed the test outright with `AbortError: The user aborted
    // a request.` That is run 30863523950, shard 2, on a branch that does not touch this file.
    // Measured on this Chromium rather than argued: awaiting `finished` across a `cancel()`
    // rejects with exactly that message, `finish()` settles the transform to identity
    // synchronously, and `finish()` on an already-cancelled animation does not even throw. The
    // ceremony's own `EraAdvanceCeremony.browser.test.tsx` already settles this way.
    for (const animation of badge.getAnimations()) {
      animation.finish();
    }

    expect(
      within(badge.getBoundingClientRect(), feedbackHost.getBoundingClientRect()),
      "the badge sits inside the flow, so it is not the out-of-flow case this pins",
    ).toBe(false);
    expect(
      within(badge.getBoundingClientRect(), builder.getBoundingClientRect()),
      "the badge has grown past the card's padding, so the sweep now needs to say what it excuses",
    ).toBe(true);
  },
  ONE_SCROLL_BUDGET_MS,
);
