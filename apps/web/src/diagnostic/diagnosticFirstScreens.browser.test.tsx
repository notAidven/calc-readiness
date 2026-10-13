import { DIAGNOSTIC_WALK_SCOPE } from "@cr/item-bank";
import { getNodeOrThrow } from "@cr/skill-graph";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { LocalSessionProvider } from "../auth/LocalSessionProvider";
import {
  type Harness,
  findButton,
  mount,
  setInputValue,
  waitFor,
} from "../lessons/testHarness";
import { DiagnosticSurface } from "./DiagnosticSurface";
import { skillDisplayName } from "./skillNames";

import "../styles.css";
import "./diagnostic-demo.css";
import "./diagnostic-answer.css";
import "./diagnostic-dev-skip.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

/**
 * **THE FIRST TWO SCREENS A DEMO AUDIENCE SEES, ON THE LEARNER'S OWN MOUNT.**
 *
 * Both claims here are SPATIAL — "the intro no longer confronts a learner with a list of
 * every skill" and "the answer box reads as one resolved control" — so
 * `.cursor/rules/qa-verification.mdc` says a passing assertion does not discharge either:
 * they owe a rendered frame at a short, realistic viewport, and the viewport has to be
 * named beside them.
 *
 * ## Why the chrome is rebuilt here rather than mounting `DiagnosticRunner` bare
 *
 * The rule's `?dev` clause is about a reviewer's surface flattering a learner's. The
 * diagnostic has the same hazard one layer out: a learner never meets `DiagnosticRunner`
 * on its own. `App.tsx`'s `SurfaceOverlay` wraps it in
 * `.surface-overlay--diagnostic > .surface-overlay-frame--diagnostic`, whose head is a
 * sticky bar and whose body carries `clamp(var(--space-2xl), 5vw, var(--space-4xl))` of
 * padding — 40px+ of vertical chrome and a `min-height: 100dvh` frame that a bare mount
 * simply does not have. `widenedScopeShots.browser.test.tsx` mounts the runner directly
 * inside a plain `Fold`, which is the right frame for the question it asks (does the list
 * fit) and the wrong one for this question. So this file reproduces the real overlay, and
 * the assertion below fails if it stops matching what `App.tsx` renders.
 *
 * ## What each frame is OF
 *
 * The whole 1024x580 surface and the whole 390x580 phone surface, never a crop of the element
 * that changed: per the same rule, "cropped to the element that changed, a screenshot proves
 * nothing about occlusion — the element is the one part of the picture nobody doubted." The
 * subject is what a learner can see at once.
 *
 * Frames land in `.qa-frames/`, which `.gitignore` names as where the browser suite writes
 * review evidence, so nothing here writes a tracked path and no shot flag is owed
 * (`test/testWritesStayOutOfTheTree.test.ts`).
 */

/** The short, realistic laptop the QA rule asks for. Named in every frame's filename. */
const VIEWPORT = { width: 1024, height: 580 } as const;
const PHONE_VIEWPORT = { width: 390, height: 580 } as const;
const INTRO_VIEWPORTS = [VIEWPORT, PHONE_VIEWPORT] as const;

const FRAMES = ".qa-frames/diagnostic-first-screens";

let harness: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
  /*
   * A LEARNER'S BUILD, not a developer's. `DiagnosticDevSkip` renders on the environment
   * alone — `VITE_DIAGNOSTIC_API_URL` being unset — so an unstubbed frame carries a
   * yellow-on-black "Answer it for me" panel over the bottom-right quarter of the screen
   * that no learner will ever see. Left in, every frame here would be a picture of the dev
   * build captioned as the learner's.
   */
  vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "https://api.example.invalid/diagnostic");
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

/**
 * The learner's chrome, class for class as `App.tsx`'s `SurfaceOverlay` builds it for
 * `surface === "diagnostic"`. `role="dialog"` and the Escape handler are the parts a frame
 * cannot see and are left out; every class that carries a padding, a height or a background
 * is here, because those are what decide how much room the runner is given.
 */
function LearnerOverlay(): React.ReactElement {
  return (
    <div className="surface-overlay surface-overlay--diagnostic">
      <div className="surface-overlay-frame surface-overlay-frame--diagnostic">
        <header className="surface-overlay-head surface-overlay-head--diagnostic">
          <span className="surface-overlay-brand" id="surface-overlay-title">
            Diagnostic
          </span>
          <button type="button" className="city-action">
            Back to city
          </button>
        </header>
        <div className="surface-overlay-body surface-overlay-body--diagnostic">
          <LocalSessionProvider>
            <DiagnosticSurface />
          </LocalSessionProvider>
        </div>
      </div>
    </div>
  );
}

/**
 * Where this test's viewport sits inside the real browser window, and the scale assertion
 * that makes the frame evidence about a 1024x580 screen rather than about a shrunken one.
 * Inherited from `caughtUpVitalityShots.browser.test.tsx` rather than re-derived.
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

async function frame(
  name: string,
  viewport: { readonly width: number; readonly height: number } = VIEWPORT,
): Promise<void> {
  // Re-asserted per shot: a mount can settle after the viewport call, and a frame taken at
  // "whatever the runner felt like" is a frame with no viewport in its evidence.
  await page.viewport(viewport.width, viewport.height);
  await new Promise<void>((resolve) => setTimeout(resolve, 200));
  expect(window.innerWidth, "the viewport did not take").toBe(viewport.width);
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a ${viewport.width}x${viewport.height} screen`,
  ).toBeCloseTo(1, 1);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, viewport.width),
      height: Math.min(box.height, viewport.height),
      scale: 1,
    },
  });
  expect(shot.data, `no frame for ${name}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `${FRAMES}/${name}-${viewport.width}x${viewport.height}.png`,
      shot.data,
      { encoding: "base64" },
    );
  }
}

async function openIntro(
  viewport: { readonly width: number; readonly height: number } = VIEWPORT,
): Promise<void> {
  await page.viewport(viewport.width, viewport.height);
  harness = mount(<LearnerOverlay />);
  await waitFor(() => document.querySelector(".dgx-intro") !== null, "the intro", 30_000);
  // The chrome really is the learner's, not a bare mount: if `App.tsx` renames or drops one
  // of these the frames below stop being evidence about the screen a learner is given.
  for (const selector of [
    ".surface-overlay--diagnostic",
    ".surface-overlay-frame--diagnostic",
    ".surface-overlay-body--diagnostic",
  ]) {
    expect(document.querySelector(selector), `${selector} is not mounted`).not.toBeNull();
  }
  // And it really is a learner's build: the dev skip is unroutable here.
  expect(
    document.querySelector('[data-testid="dgx-dev-skip"]'),
    "the dev skip panel is on screen, so these frames are of the developer's build",
  ).toBeNull();
}

/**
 * THE INTRO NO LONGER ENUMERATES THE SKILLS, and the reassurance the enumeration was
 * carrying is asserted as still present rather than left to the frame.
 *
 * The list is gone by DERIVATION and not by class name: every skill's learner-facing
 * display name is looked for in the rendered text, over the live scope, so a list that
 * came back under a different class or a different element fails here. The floor under
 * that sweep is the scope itself, which `diagnostic-scope.test.ts` holds at 62.
 */
test("the intro sets expectations without naming every skill", async () => {
  for (const viewport of INTRO_VIEWPORTS) {
    await openIntro(viewport);

    const intro = document.querySelector(".dgx-intro") as HTMLElement;
    const text = intro.textContent ?? "";

    expect(
      DIAGNOSTIC_WALK_SCOPE.length,
      "the scope is empty, so the sweep below would pass over nothing",
    ).toBeGreaterThanOrEqual(62);
    const named = DIAGNOSTIC_WALK_SCOPE.map(skillDisplayName).filter((name) =>
      text.includes(name),
    );
    expect(
      named,
      "the intro names individual skills again, which is the laundry list this screen had removed",
    ).toEqual([]);

    // …and what the list was FOR is still on the screen: the breadth, the adaptive promise,
    // its honest duration, and what happens when it is over.
    const domains = new Set(DIAGNOSTIC_WALK_SCOPE.map((id) => getNodeOrThrow(id).domain));
    expect(text, "the breadth is no longer stated").toContain(
      `${DIAGNOSTIC_WALK_SCOPE.length} skills`,
    );
    expect(text, "the number of subject areas is no longer stated").toContain(
      `${domains.size} subject areas`,
    );
    expect(text, "the intro still carries the obsolete ten-minute promise").toContain(
      "~20 min",
    );
    expect(text.toLowerCase(), "nothing says it adapts").toContain("adapt");
    expect(text.toLowerCase(), "nothing says what happens afterwards").toContain("city");
    expect(text.toLowerCase(), "the no-pass-no-fail reassurance is gone").toMatch(
      /passing or failing|no grades|not a test/,
    );

    await frame("intro", viewport);
    harness?.cleanup();
    harness = null;
  }
});

/**
 * THE ANSWER BOX, framed on a real served question rather than on a fixture.
 *
 * The strip's absence is asserted three ways rather than one, because each alone can go
 * stale: by its accessible NAME (which is what a screen reader met), by its class (which is
 * what the stylesheet painted), and by the source no longer carrying the module at all
 * (`notationStripIsGone.test.ts`). This is the render half.
 */
test("the answer box has no notation strip, and keeps teaching the notation", async () => {
  await openIntro();

  findButton(document.body, /Start the diagnostic/).click();
  await waitFor(
    () => document.querySelector(".dgx-probe input[type='text']") !== null,
    "the first question's answer field",
    30_000,
  );

  expect(
    document.querySelector(".cr-math-keypad"),
    "the INSERT NOTATION strip is painted again",
  ).toBeNull();
  expect(
    [...document.querySelectorAll("fieldset,[role='group']")].filter((element) =>
      /insert notation/i.test(element.getAttribute("aria-label") ?? ""),
    ),
    "a group named 'Insert notation' is on the answer surface again",
  ).toEqual([]);
  expect(
    (document.querySelector(".dgx-probe") as HTMLElement).textContent ?? "",
    "the words INSERT NOTATION are on the answer surface again",
  ).not.toMatch(/insert notation/i);

  await frame("answer-empty");

  // The instruction survives typing, which the placeholder could not. Driven on whatever
  // the walk served first: an item with no notation to name has no note, and the frame
  // above is the evidence either way.
  const field = document.querySelector(".dgx-probe input[type='text']") as HTMLInputElement;
  const line = field.placeholder;
  setInputValue(field, "x");
  await new Promise<void>((resolve) => setTimeout(resolve, 120));
  const column = field.closest(".cr-math-answer");
  if (column) {
    const note = column.querySelector(".cr-math-notation");
    expect(note, "the field has a notation column and no note in it").not.toBeNull();
    expect(
      (note as HTMLElement).textContent,
      "the note does not carry the item's own notation line",
    ).toBe(line);
    expect(
      (note as HTMLElement).getBoundingClientRect().height,
      "the note has no height, so nothing is painted",
    ).toBeGreaterThan(8);
  }

  /**
   * WHAT THE SCREEN SPENDS ON EVERYTHING THAT IS NOT THE QUESTION, at the viewport this
   * file is named by.
   *
   * A spatial claim owes a frame, and the frames above are it. This is the half a frame
   * cannot give: a reviewer looking at a tidy picture will not notice that the button under
   * it is eight pixels off the bottom, and "the answer box looks weird" is exactly what a
   * learner says about a control whose submit they have to go and find. Measured on this
   * mount before the work: 507px of chrome above the field on a 580px screen, with Submit
   * 95px past the fold.
   *
   * ## Why this is a budget and not "the submit is above the fold"
   *
   * It WAS that assertion, and it was wrong in a way worth recording, because it went red
   * on somebody else's merge. `#640` rewrote `d6.fun6.numerator.l2`'s prompt — a content
   * fix, in another lane — from three lines to four with a stacked fraction in it, and the
   * card grew 44px. Nothing about the layout had regressed; the question had got longer.
   *
   * A guard that reds an authoring change is a guard pointed at the wrong thing. What this
   * file can hold is what `diagnostic-demo.css` decides — the chrome ABOVE the question and
   * the answer machinery BELOW it — and the derived figure those two produce, which is how
   * much of a 580px screen is left for a question. That number is the one worth watching:
   * it falls when a row is added back, and it does not move when a prompt is rewritten.
   *
   * The question itself is still framed above, so a prompt that has outgrown its room is
   * visible to anyone who looks at the picture — which is where a content judgement belongs.
   */
  const submit = document.querySelector(".dgx-answer__submit") as HTMLElement;
  const preview = document.querySelector(".cr-math-preview") as HTMLElement | null;
  // The field is dressed rather than left to the user agent, which is what a learner meets
  // on this surface and what `#492` silently undid: `.lesson-player__row input` paints every
  // other answer field in the app and the diagnostic's row is not a `.lesson-player__row`.
  // Chrome's default is `2px inset rgb(118, 118, 118)` at radius 0, and that is exactly what
  // was measured here before `diagnostic-answer.css` grew the rules back.
  const fieldStyle = getComputedStyle(field);
  expect(fieldStyle.borderTopStyle, "the answer field is the user agent's").not.toBe(
    "inset",
  );
  expect(
    Number.parseFloat(fieldStyle.borderTopLeftRadius),
    "the answer field has square corners, which no other control on this surface has",
  ).toBeGreaterThan(0);
  expect(
    Number.parseFloat(fieldStyle.paddingLeft),
    "the answer field has no padding, so its text sits against the border",
  ).toBeGreaterThan(4);
  expect(submit, "the answer row has no submit control").not.toBeNull();
  // THE ANSWER BOX ITSELF is above the fold, which is the part the report was about and the
  // part that does not depend on how long the question is: it sits between the two budgets
  // below, not below them.
  for (const [name, element] of [
    ["the answer field", field],
    ["the notation note", document.querySelector(".cr-math-notation")],
    ["the preview", preview],
  ] as const) {
    if (!element) {
      continue;
    }
    const box = (element as HTMLElement).getBoundingClientRect();
    expect(
      box.bottom,
      `${name} reaches y=${Math.round(box.bottom)} of ${VIEWPORT.height}, so a learner has to scroll to it`,
    ).toBeLessThanOrEqual(VIEWPORT.height);
  }

  // BUDGET ONE: the chrome above the question. The overlay's sticky header, the identity
  // row and the probe's own heading, none of which is the question. 255px at this tip,
  // against 289px before the trims.
  const cardTop = (
    document.querySelector(".dgx-item") as HTMLElement
  ).getBoundingClientRect().top;
  expect(
    cardTop,
    `${Math.round(cardTop)}px of a ${VIEWPORT.height}px screen is spent before the question card even starts`,
  ).toBeLessThanOrEqual(270);

  // BUDGET TWO: the answer machinery. The field, the notation note, the preview and the
  // submit, from the top of the first to the bottom of the last. 155px at this tip.
  const machinery =
    submit.getBoundingClientRect().bottom - field.getBoundingClientRect().top;
  expect(
    machinery,
    `the answer row is ${Math.round(machinery)}px tall, which is a row more than it was`,
  ).toBeLessThanOrEqual(170);
  // The tap target survived the squeeze, which is the thing a height trim is most likely to
  // have taken.
  expect(
    submit.getBoundingClientRect().height,
    "the submit button is below a 44px tap target",
  ).toBeGreaterThanOrEqual(44);

  // AND THE DERIVED FIGURE the two produce: how much of the screen is left for a question.
  // ~125px, which is four lines of `.dgx-prompt--prose` at 1.2rem/1.6 less the card's own
  // padding and its level chip. Falls when a row comes back; does not move when a prompt is
  // rewritten. Floored rather than pinned, because the direction that matters is DOWN.
  const forTheQuestion = VIEWPORT.height - cardTop - machinery;
  expect(
    forTheQuestion,
    `only ${Math.round(forTheQuestion)}px of a ${VIEWPORT.height}px screen is left for the question itself`,
  ).toBeGreaterThanOrEqual(140);

  await frame("answer-typed");

  /**
   * WHAT THE LEARNER CAN ACTUALLY REACH, written out beside the frames.
   *
   * A frame shows what is above the fold; it cannot say by how much something misses it,
   * and "by how much" is what decides whether the next trim is worth taking. So the numbers
   * go next to the pictures, in the same gitignored directory, for whoever reads them.
   */
  const box = (selector: string): DOMRect | null =>
    document.querySelector(selector)?.getBoundingClientRect() ?? null;
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      `${FRAMES}/measured.json`,
      JSON.stringify(
        {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          placeholder: field.placeholder,
          notationLine: line,
          chromeAboveTheQuestion: cardTop,
          answerMachinery: machinery,
          leftForTheQuestion: forTheQuestion,
          // Reported rather than asserted: it is the served item's prompt length that decides
          // it, and this file does not gate on another lane's content. Negative means the
          // learner scrolls for the button.
          submitClearance: VIEWPORT.height - submit.getBoundingClientRect().bottom,
          field: box(".dgx-probe input[type='text']"),
          column: box(".cr-math-answer"),
          note: box(".cr-math-notation"),
          preview: box(".cr-math-preview"),
          submit: box(".dgx-answer__submit"),
          card: box(".dgx-item"),
          prompt: box(".dgx-prompt"),
        },
        null,
        2,
      ),
      { encoding: "utf-8" },
    );
  }
});
