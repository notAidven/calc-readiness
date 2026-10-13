/*
 * ⚑ `styles.css` MUST BE IMPORTED BEFORE THE RUNNER, and this is not an import-order
 * preference. The two sheets collide at equal specificity — `.surface-overlay` sets
 * `padding: clamp(var(--space-lg), 4vw, var(--space-3xl))` and
 * `.surface-overlay--diagnostic` sets `padding: 0` — so the LAST one loaded wins.
 *
 * The app loads `styles.css` from `main.tsx` and `diagnostic-demo.css` later, when the lazy
 * diagnostic chunk arrives, so the learner gets `padding: 0` and a takeover that really does
 * take over. A test file that imports the runner first pulls `diagnostic-demo.css` in with it
 * and then loads `styles.css` on top, which reinstates 41px of inset on all four sides and
 * costs the frame 82px of the vertical room the claim is about. Measured: the same question
 * card reads 46px past the fold with this import first and 4px past it the other way round.
 *
 * The sibling browser files under this directory have the other order and their frames are
 * inset accordingly; theirs are about a fixed-position panel, so it does not reach their
 * claims, and repointing them is not this pass's to do.
 */
import "../styles.css";

import { canonicalRawAnswer, DIAGNOSTIC_WALK_ITEM_PACK } from "@cr/item-bank";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { page } from "vitest/browser";

import { SessionProvider } from "../auth/SessionContext";
import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import {
  findButton,
  type Harness,
  mount,
  setInputValue,
  waitFor,
} from "../lessons/testHarness";
import { DiagnosticRunner } from "./DiagnosticRunner";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * **THE QUESTION SCREEN, ON THE LEARNER'S OWN MOUNT, AT A SHORT LAPTOP.**
 *
 * The owner's note was *"the questions are tiny relative to the full screen"*, and the fix is
 * type size, which is the kind of claim that cannot be settled by reading a stylesheet: a
 * bigger prompt that pushes Submit under the fold is a worse screen than the small one it
 * replaced. So this measures both halves at once, over every question a real administration
 * serves, and photographs them.
 *
 * ## IT IS THE LEARNER'S MOUNT, WHICH IS NOT THE ONE THE OTHER SHOT FILES USE
 *
 * Two things separate this from `widenedScopeShots.browser.test.tsx`, and both change the
 * geometry rather than the dressing:
 *
 *  - **The overlay chrome is here.** `App.tsx` serves the diagnostic inside
 *    `.surface-overlay--diagnostic`, whose sticky header eats the top of the viewport and
 *    whose body adds `clamp(var(--space-2xl), 5vw, var(--space-4xl))` of padding above the
 *    card. A runner mounted bare is given the whole 580px; a learner is not. The chrome is
 *    reproduced rather than mounting `App` (which needs the 3D city, and headless Chromium
 *    has no reliable WebGL) — the same reproduction, for the same reason, as
 *    `diagnosticDevSkipClearsTheExit.browser.test.tsx`.
 *  - **`VITE_DIAGNOSTIC_API_URL` IS SET, so the dev skip panel is not on screen.** It is
 *    set to a URL that is never fetched: `isDevPersistenceEnabled()` is
 *    `!isServerBacked(true)`, which the endpoint alone closes, while the diagnostic client
 *    still resolves to the in-memory one because this session is `dev` rather than `cognito`
 *    (`createDiagnosticClient` asks `isServerBacked(mode === "cognito")`). So the walk is the
 *    real engine over the real scorer and the reviewer's furniture is gone. Asserted below
 *    rather than assumed, because a frame taken through a developer's build is exactly the
 *    substitution `.cursor/rules/qa-verification.mdc` warns about.
 *
 * ## THE POPULATION IS THE QUESTIONS AN ADMINISTRATION ACTUALLY ASKS
 *
 * Not the first one. A one-question sample is a sample of whichever probe the frontier
 * happens to enter on, and the prompts differ by an order of magnitude in height: `NUM.S`
 * asks a centred display equation on one line, while a `RAT.6` word problem wraps to three
 * and `RAT.1` renders TWO answer fields under it. The walk is driven to completion and every
 * question it serves is measured, so the fit claim is made over the tallest thing the
 * instrument can put in front of somebody rather than over the luckiest.
 */

const SHORT_LAPTOP = { width: 1024, height: 580 };

/**
 * The floor the prompt's type has to clear, in px, on a prose question.
 *
 * It is a floor rather than a pin because the size is a `clamp()` and its middle term is
 * viewport-relative: pinning would make this file fail on a wider browser for being right.
 * The number is the point of the change — the prose prompt was `1.2rem` (19.2px) when the
 * owner called the questions tiny, so anything at or under that is the screen he objected to.
 */
const PROSE_PROMPT_FLOOR = 22;

/** The same, for a display equation, which was `2rem` (32px) before. */
const DISPLAY_MATH_FLOOR = 34;

const ITEM_BY_ID = new Map(
  DIAGNOSTIC_WALK_ITEM_PACK.map((entry) => [entry.item_version_id, entry] as const),
);

let harness: Harness | null = null;
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
  harness?.cleanup();
  harness = null;
  vi.unstubAllEnvs();
});

/**
 * A frame of the WHOLE VIEWPORT, never of the card.
 *
 * A shot cropped to the element that changed proves nothing about what is left around it,
 * and "is Submit still on screen" is a claim about the surface. The PNGs land under
 * `__screenshots__/`, which `.gitignore` already excludes, exactly as the dev-panel file
 * does it: CI keeps the assertions and a reviewer regenerates the picture.
 */
async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  if (CAPTURE_EVIDENCE) {
    await page.screenshot({ path: `__screenshots__/question-screen/${name}.png` });
  }
}

/** The overlay chrome `App.tsx` serves the diagnostic inside. */
function OverlayChrome({ children }: { children: ReactNode }) {
  return (
    <div className="surface-overlay surface-overlay--diagnostic">
      <div className="surface-overlay-frame surface-overlay-frame--diagnostic">
        <header className="surface-overlay-head surface-overlay-head--diagnostic">
          <span className="surface-overlay-brand">Diagnostic</span>
          <button type="button" className="city-action">
            Back to city
          </button>
        </header>
        <div className="surface-overlay-body surface-overlay-body--diagnostic">
          {children}
        </div>
      </div>
    </div>
  );
}

/** The computed font size of `selector` under the probe, in px, or 0 when absent. */
function typeSize(selector: string): number {
  const node = document.querySelector<HTMLElement>(`.dgx-probe ${selector}`);
  return node === null
    ? 0
    : Number.parseFloat(window.getComputedStyle(node).fontSize || "0");
}

/** What one served question looks like on screen, as numbers a failure can quote. */
interface Fit {
  itemVersionId: string;
  /** The prompt's own type size, and which kind of prompt it is. */
  promptSize: number;
  promptKind: "expression" | "prose";
  /** How far past the fold each part of the interaction sits (<= 0 means it fits). */
  promptOverflowPx: number;
  answerOverflowPx: number;
  submitOverflowPx: number;
  /** The same for the probe as a whole, whose last row is the footer under the card. */
  probeOverflowPx: number;
  /** ...and for the "I haven't learned this yet" control on that footer row. */
  wayOutOverflowPx: number;
}

/** How far below the fold `selector`'s bottom edge sits. Throws if it is not laid out. */
function overflowOf(selector: string): number {
  const node = document.querySelector<HTMLElement>(selector);
  if (node === null) {
    throw new Error(`${selector} is not on screen, so this measures nothing`);
  }
  const box = node.getBoundingClientRect();
  if (box.height === 0) {
    throw new Error(`${selector} has no layout, so this measures nothing`);
  }
  return Math.round(box.bottom - SHORT_LAPTOP.height);
}

function measure(): Fit {
  const card = document.querySelector<HTMLElement>(".diagnostic-item");
  if (card === null) {
    throw new Error("no question is on screen, so this measures nothing");
  }
  const expression = document.querySelector(".dgx-probe .dgx-prompt--expression") !== null;
  return {
    itemVersionId: card.getAttribute("data-item-version-id") ?? "",
    promptSize: typeSize(expression ? ".dgx-math--block .katex" : ".dgx-prompt--prose"),
    promptKind: expression ? "expression" : "prose",
    promptOverflowPx: overflowOf(".dgx-probe .dgx-prompt"),
    // The LAST field, because `rational_answer` renders two stacked ones and the lower is
    // the one that can fall off. Deliberately not `.dgx-answer`, whose box also contains the
    // 16px line reserved for a refused-empty notice: that line is not a control, and
    // measuring it here would report a question as unusable over blank space.
    answerOverflowPx: overflowOf(".dgx-probe input[type='text']:last-of-type"),
    submitOverflowPx: overflowOf(".dgx-probe .dgx-answer__submit"),
    probeOverflowPx: overflowOf(".dgx-probe"),
    wayOutOverflowPx: overflowOf(".dgx-probe .dgx-probe__unsure"),
  };
}

/** Answer the visible probe correctly and submit, so the walk moves to the next one. */
function answerCurrentQuestion(): void {
  const card = document.querySelector<HTMLElement>(".diagnostic-item");
  if (card === null) {
    throw new Error("no question card to answer");
  }
  const entry = ITEM_BY_ID.get(card.getAttribute("data-item-version-id") ?? "");
  if (entry === undefined) {
    throw new Error("the walk served an item this build's pack does not carry");
  }
  const answer = canonicalRawAnswer(entry.answer);
  const fields = Array.from(card.querySelectorAll<HTMLInputElement>("input[type='text']"));
  const first = fields[0];
  if (first === undefined) {
    throw new Error("the question card has no answer field");
  }
  if (typeof answer === "string") {
    setInputValue(first, answer);
  } else {
    // `rational_answer`: the simplified expression, then the values the ORIGINAL denominator
    // forbids. A bare string is refused as `invalid_input`, which the walk re-serves forever.
    const payload = answer as { expression?: unknown; excluded_values?: unknown };
    setInputValue(first, String(payload.expression ?? ""));
    const second = fields[1];
    if (second !== undefined) {
      setInputValue(
        second,
        Array.isArray(payload.excluded_values)
          ? payload.excluded_values.join(", ")
          : String(payload.excluded_values ?? ""),
      );
    }
  }
  findButton(card, /Submit answer/).click();
}

/** Mount the learner's diagnostic and start it, leaving the first question on screen. */
async function startTheDiagnostic(): Promise<void> {
  // A configured endpoint, so the dev skip panel is off. Never fetched: the client stays
  // in-memory because this session is `dev`. See the header.
  vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "https://diagnostic.invalid/api/diagnostic");
  expect(
    isDevPersistenceEnabled(),
    "the dev gate is still open, so this frame is a reviewer's and not a learner's",
  ).toBe(false);
  harness = mount(
    <OverlayChrome>
      <SessionProvider>
        <DiagnosticRunner />
      </SessionProvider>
    </OverlayChrome>,
  );
  await waitFor(() => document.querySelector(".dgx-intro") !== null, "the intro", 20_000);
  findButton(document.body, /Start the diagnostic/).click();
  await waitFor(() => document.querySelector(".dgx-probe") !== null, "a question", 20_000);
  await waitFor(
    () => document.querySelector(".dgx-prompt") !== null,
    "the typeset prompt",
    20_000,
  );
  expect(
    document.querySelector(".dgx-skip"),
    "the dev panel is on screen, so this is not the learner's surface",
  ).toBeNull();
}

test("every question an administration serves fits a 1024x580 laptop, at readable type", async () => {
  await startTheDiagnostic();

  const seen: Fit[] = [];
  let worst: Fit | null = null;
  // `DEFAULT_WALK_POLICY.maxItems` is 70 and an acing walk over this scope is a median of 23,
  // so the loop bound is the engine's own ceiling rather than a number picked here.
  for (let asked = 1; asked <= 70; asked += 1) {
    const fit = measure();
    seen.push(fit);
    if (worst === null || fit.probeOverflowPx > worst.probeOverflowPx) {
      worst = fit;
      await shoot("worst-fit-1024x580");
    }
    if (asked === 1) {
      await shoot("first-question-1024x580");
    }
    const before = fit.itemVersionId;
    answerCurrentQuestion();
    await waitFor(
      () =>
        document.querySelector(".dgx-results") !== null ||
        (document.querySelector(".diagnostic-item")?.getAttribute("data-item-version-id") ??
          before) !== before,
      `question ${asked} to be accepted`,
      20_000,
    );
    if (document.querySelector(".dgx-results") !== null) {
      break;
    }
    await waitFor(
      () => document.querySelector(".dgx-prompt") !== null,
      "the next typeset prompt",
      20_000,
    );
  }

  /*
    THE POPULATION FLOOR, before any claim about it. "Nothing overflowed" is trivially true of
    nothing measured, and the two ways this could measure nothing are a walk that finished on
    question one and a `measure()` that read zeroes off an unlaid-out card.
   */
  expect(
    seen.length,
    "the walk asked too few questions to be a population",
  ).toBeGreaterThan(5);
  expect(
    new Set(seen.map((fit) => fit.itemVersionId)).size,
    "the same question was measured over and over, so the walk never advanced",
  ).toBe(seen.length);
  expect(
    seen.filter((fit) => fit.promptKind === "prose").length,
    "no word problem was served, so the prose type size below is unmeasured",
  ).toBeGreaterThan(0);

  /*
    THE INTERACTION IS ON THE SCREEN: the whole question, the field it is answered in, and
    the button that submits it. No exceptions, on any question the walk can serve.

    This is the constraint the size increase is bought against, so it is asserted before the
    size: a prompt set large enough to push Submit off a short laptop is a worse screen than
    the small one it replaced, and a run reporting only "the type is big now" would be
    reporting half the change. Collected rather than asserted inside the loop, so a failure
    names every question that is wrong instead of stopping at the first.
   */
  const cut = seen.flatMap((fit) =>
    (
      [
        ["the question", fit.promptOverflowPx],
        ["the answer field", fit.answerOverflowPx],
        ["Submit", fit.submitOverflowPx],
      ] as const
    )
      .filter(([, overflow]) => overflow > 0)
      .map(([what, overflow]) => `${fit.itemVersionId}: ${what} is ${overflow}px below it`),
  );
  expect(
    cut,
    `${cut.length} parts of the interaction sit below a ${SHORT_LAPTOP.width}x${SHORT_LAPTOP.height} fold:\n${cut.join("\n")}`,
  ).toEqual([]);

  /*
    AND THE FOOTER UNDER THE CARD IS WITHIN BUDGET, which is a weaker claim than the one
    above ON PURPOSE, with the residual named rather than hidden.

    What hangs below the card is the reassurance line and the "I haven't learned this yet"
    control. Both stay on screen for all but the tallest questions in the instrument, and
    those are the `RAT` items that pair a nested display fraction in the prompt with the
    two-field `rational_answer` control: 173px of question over 251px of answer row, and the
    answer row is `PracticeAnswer`'s, in another owner's lane. Squeezing the last of it would
    mean editing their component.

    So the budget records the residual instead of pretending it is gone. Measured like for
    like at 1024x580 on the learner's mount, over the same 43-question administration, with
    and without this branch's changes:

      before   43 of 43 questions ran past the fold, the worst by 254px, and SUBMIT ITSELF
               was below it on 14 of them, the worst 163px down;
      after    2 of 43 run past it, the worst `d5.rat4.clear.l2` at 45px, and Submit clears
               it on all 43 with the tightest at 23px to spare.

    The budget fails on a return to anything like the first row, which is what it is for.
   */
  const FOOTER_BUDGET = 72;
  const overBudget = seen
    .filter((fit) => fit.probeOverflowPx > FOOTER_BUDGET)
    .map((fit) => `${fit.itemVersionId}: ${fit.probeOverflowPx}px`);
  expect(
    overBudget,
    `${overBudget.length} of ${seen.length} questions hang more than ${FOOTER_BUDGET}px below the fold:\n${overBudget.join("\n")}`,
  ).toEqual([]);
  expect(
    seen.filter((fit) => fit.probeOverflowPx <= 0).length,
    "fewer than three quarters of the questions fit outright, which is the pre-pass screen",
  ).toBeGreaterThan(seen.length * 0.75);

  /*
    AND THE WAY OUT IS ON THE SCREEN, over the administration rather than on one question.

    This was pinned to question one until #640 rewrote `d6.fun6.numerator.l2`'s prompt a
    line longer and pushed the footer 12px under, which is the pin being wrong rather than
    the screen being wrong: which question the frontier enters on is content, and content
    moves. The claim worth holding is that a learner who gets stuck can see the way out
    almost wherever they get stuck, so it is measured over every question the walk serves
    and floored as a proportion.

    Not 100%, for the reason the footer budget above is not zero: the tallest `RAT` items
    pair a nested display fraction with the two-field `rational_answer` row, and the last of
    that height is `PracticeAnswer`'s to give back.
   */
  const reachable = seen.filter((fit) => fit.wayOutOverflowPx <= 0);
  const hidden = seen
    .filter((fit) => fit.wayOutOverflowPx > 0)
    .map((fit) => `${fit.itemVersionId}: ${fit.wayOutOverflowPx}px`);
  expect(
    reachable.length,
    `the way out is off-screen on ${hidden.length} of ${seen.length} questions:\n${hidden.join("\n")}`,
  ).toBeGreaterThan(seen.length * 0.85);

  // AND THE TYPE IS BIGGER THAN THE SIZE THE OWNER CALLED TINY, on both prompt shapes.
  const small = seen
    .filter(
      (fit) =>
        fit.promptSize <
        (fit.promptKind === "expression" ? DISPLAY_MATH_FLOOR : PROSE_PROMPT_FLOOR),
    )
    .map(
      (fit) => `${fit.itemVersionId} (${fit.promptKind}) renders at ${fit.promptSize}px`,
    );
  expect(
    small,
    `${small.length} of ${seen.length} questions are still set at the size the owner called tiny:\n${small.join("\n")}`,
  ).toEqual([]);
}, 120_000);

/**
 * **THE WAY OUT OF A QUESTION IS QUIETER THAN SUBMIT, and that is a spatial claim.**
 *
 * "Less prominent than Submit" is a fact about two rendered boxes, so it is measured off
 * them: the ink each takes, whether either is filled, and where one sits relative to the
 * other. `DiagnosticRunner.test.tsx` owns what the control DOES with a press; this owns what
 * it looks like beside the button it must not compete with, and shoots the frame the
 * arithmetic owes.
 */
test("the way out of a question is on the screen and quieter than Submit", async () => {
  await startTheDiagnostic();

  const unsure = findButton(document.body, /haven't learned this yet/i);
  const submit = findButton(document.body, /Submit answer/);
  const quiet = unsure.getBoundingClientRect();
  const primary = submit.getBoundingClientRect();

  // THE FLOOR: both are really laid out, so what follows compares two boxes rather than
  // two zeroes, and "smaller than Submit" cannot be satisfied by not rendering at all.
  expect(quiet.width * quiet.height, "the control has no layout").toBeGreaterThan(500);
  expect(primary.width * primary.height, "Submit has no layout").toBeGreaterThan(500);

  // It is BELOW Submit and takes a fraction of the ink.
  expect(quiet.top, "the control sits level with or above Submit").toBeGreaterThan(
    primary.bottom,
  );
  expect(
    quiet.width * quiet.height,
    `the control is ${Math.round(quiet.width)}x${Math.round(quiet.height)} against Submit's ${Math.round(primary.width)}x${Math.round(primary.height)}`,
  ).toBeLessThan(primary.width * primary.height * 0.5);

  // ...and it reads as text rather than as a second button: no fill, no border, no larger.
  const quietStyle = window.getComputedStyle(unsure);
  const primaryStyle = window.getComputedStyle(submit);
  const UNFILLED = /rgba\(0, 0, 0, 0\)|transparent/;
  expect(quietStyle.backgroundColor, "the control is filled like a button").toMatch(
    UNFILLED,
  );
  expect(
    primaryStyle.backgroundColor,
    "Submit is unfilled too, so the contrast above compares nothing",
  ).not.toMatch(UNFILLED);
  expect(Number.parseFloat(quietStyle.borderTopWidth || "0")).toBe(0);
  expect(Number.parseFloat(quietStyle.fontSize)).toBeLessThanOrEqual(
    Number.parseFloat(primaryStyle.fontSize),
  );

  // Whether it is ON the screen is measured over the whole administration by the test
  // above, because which question the walk enters on is content and content moves.
  await shoot("way-out-beside-submit-1024x580");
}, 60_000);
