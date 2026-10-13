import type { ReactElement } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { SuccessionAdvisor } from "./SuccessionAdvisor";
import { type SuccessionBriefing, successionBriefing } from "./successionBriefing";

import "../styles.css";

/**
 * **EVERY WORD THE ADVISOR SAYS IS ON THE SCREEN, at the window the lead actually uses.**
 *
 * The Succession's walkthrough shipped its first draft with slide one's last bullet cut off
 * twenty pixels short of its own full stop — *"…goes to whichever claimant holds the most of the
 * city"*, and the clause that says why that matters was under the fold. Nothing said there was
 * more: `.crisis-call-terms` carries `overflow-y: auto` as its last resort under height
 * pressure, and a scroll box with no scrollbar and no shadow simply ends.
 *
 * That is a defect no unit test can see and no reviewer at a comfortable window will meet.
 * `.cursor/rules/qa-verification.mdc` is explicit about both halves: a spatial claim owes a
 * rendered frame at a short realistic viewport, and the viewport has to be named beside it —
 * *"a frame taken at a comfortable developer viewport is exactly as misleading as the
 * arithmetic"*. This measures the real box in a real browser at {@link VIEW} and at two windows
 * shorter still, and the frames are the same ones a person looks at.
 *
 * ## IT MEASURES THREE BOXES, BECAUSE THE STYLESHEET HAS THREE LAST RESORTS
 *
 * `crisisCall.css` lets the bubble's scroll box, the slide's section and the list of terms each
 * fall back to `overflow-y: auto` in that order, so a slide can fit the outer two and still lose
 * a line inside the innermost. The first draft did exactly that: the said box and the section
 * both reported zero, and the list was over by twenty. A guard on the bubble alone would have
 * been green over the defect it was written for.
 *
 * ## THE FRAMES ARE OFF BY DEFAULT
 *
 * The assertions are not. `winterCrisisShots.browser.test.tsx` records the measurement behind
 * the gate — a shadow-mapped island left on in CI starves an animation-timing assertion in some
 * other file — and this mounts no canvas, but the frames still cost seconds each.
 *
 *   VITE_SUCCESSION_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *     apps/web/src/succession/successionAdvisorFits.browser.test.tsx
 */

const SHOTS = Boolean(import.meta.env.VITE_SUCCESSION_SHOTS);

/** The lead's own short laptop window, named in every filename per the spatial-claim rule. */
const VIEW = { width: 1024, height: 580 } as const;

/**
 * The windows this is measured at, and what each of them owes.
 *
 * **1280x360 is era one's own stress viewport and it owes the OPPOSITE property**, which is
 * worth stating plainly rather than quietly leaving out. `crisisCall.browser.test.tsx` carries
 * it as `{ label: "small window", ..., mustClip: true }`: at 360 pixels of height the winter's
 * walkthrough is squeezed past what any copy can fit, and the shipped ruling is that it clips
 * and stays REACHABLE rather than that it fits. Requiring era four to fit where era one is
 * allowed to scroll would be a standard invented here, in demo week, for one crisis.
 *
 * So the two claims are separated. At a window somebody actually reads on, every word is on the
 * screen. At a window nobody can fit it in, the words are still gettable.
 */
const WINDOWS = [
  { width: 1024, height: 580, mustFit: true },
  { width: 1440, height: 900, mustFit: true },
  { width: 1280, height: 360, mustFit: false },
] as const;

/** Where the committed frames go. Reference only: nothing under `docs/` is reachable in-app. */
const OUT = "docs/design-refs/succession-crisis";

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
    restore = null;
  }
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

function Dialogue({ briefing }: { readonly briefing?: SuccessionBriefing }): ReactElement {
  return (
    <SuccessionAdvisor
      briefing={briefing}
      onBegin={() => undefined}
      onLater={() => undefined}
    />
  );
}

/** How much of a box is below its own fold, in CSS pixels. Zero is the claim. */
function clippedBy(selector: string): number {
  const node = document.querySelector<HTMLElement>(selector);
  if (!node) {
    throw new Error(`${selector} is not on the screen, so nothing here measures anything`);
  }
  return node.scrollHeight - node.clientHeight;
}

/** The three boxes the stylesheet may fall back to scrolling, outermost first. */
const SCROLLERS = [
  '[data-testid="sx-advisor-said"]',
  ".crisis-call-slide",
  ".crisis-call-terms",
] as const;

/** Walk the whole walkthrough, reporting how far each step overflows at this window. */
async function walk(): Promise<{ slide: string; over: number; where: string }[]> {
  const found: { slide: string; over: number; where: string }[] = [];
  const steps = successionBriefing().slides.length;
  for (let step = 0; step < steps; step += 1) {
    const slide = document.querySelector<HTMLElement>('[data-testid="sx-advisor-slide"]');
    const which = slide?.dataset.slide ?? "?";
    for (const where of SCROLLERS) {
      found.push({ slide: which, over: clippedBy(where), where });
    }
    if (step < steps - 1) {
      document.querySelector<HTMLElement>('[data-testid="sx-advisor-next"]')?.click();
      await new Promise<void>((resolve) => setTimeout(resolve, 90));
    }
  }
  return found;
}

describe("the advisor's walkthrough fits the window it is read in", () => {
  for (const view of WINDOWS.filter((entry) => entry.mustFit)) {
    test(`says all of it at ${view.width}x${view.height}`, async () => {
      await page.viewport(view.width, view.height);
      h = mount(<Dialogue />);
      await waitFor(
        () => document.querySelector('[data-testid="sx-advisor-slide"]') !== null,
        "the walkthrough never mounted",
        20000,
      );
      await document.fonts.ready;

      const measured = await walk();
      // A FLOOR, because a walk that found no boxes reports no clipping and looks identical.
      expect(measured.length, "no slide was measured").toBeGreaterThanOrEqual(
        successionBriefing().slides.length * SCROLLERS.length,
      );
      const clipped = measured.filter((entry) => entry.over > 1);
      expect(
        clipped.map(
          (entry) =>
            `${entry.slide} is cut off by ${entry.over}px inside ${entry.where} at ` +
            `${view.width}x${view.height}`,
        ),
        "the advisor is saying something the player cannot read",
      ).toEqual([]);
    }, 60000);
  }

  /**
   * **AT A WINDOW NOTHING COULD FIT, THE END IS STILL REACHABLE** — era one's `mustClip` case,
   * held to era one's standard. Scrolled to the bottom, the last line of the slide is inside
   * its own box rather than under the fold.
   */
  for (const view of WINDOWS.filter((entry) => !entry.mustFit)) {
    test(`keeps the last line gettable at ${view.width}x${view.height}`, async () => {
      await page.viewport(view.width, view.height);
      h = mount(<Dialogue />);
      await waitFor(
        () => document.querySelector('[data-testid="sx-advisor-slide"]') !== null,
        "the walkthrough never mounted",
        20000,
      );
      await document.fonts.ready;

      // THE PREMISE, asserted rather than assumed: this window is here BECAUSE it clips, and
      // the day a shorter walkthrough fits it the case has stopped testing what it says it does.
      const over = Math.max(...SCROLLERS.map((where) => clippedBy(where)));
      expect(
        over,
        `nothing clips at ${view.width}x${view.height}, so this case is no longer the stress one`,
      ).toBeGreaterThan(1);

      const list = document.querySelector<HTMLElement>(".crisis-call-terms");
      const last = list?.querySelector<HTMLElement>("li:last-child");
      if (!list || !last) {
        throw new Error("the slide has no terms, so nothing is under the fold");
      }
      list.scrollTop = list.scrollHeight;
      await new Promise<void>((resolve) => setTimeout(resolve, 60));
      expect(
        last.getBoundingClientRect().bottom - list.getBoundingClientRect().bottom,
        "the last line of the slide cannot be scrolled to, so it is lost rather than clipped",
      ).toBeLessThanOrEqual(2);
    }, 60000);
  }

  /**
   * **AND THE MEASURE CATCHES A SLIDE THAT DOES NOT FIT**, forced red rather than argued: a
   * The production briefing is now deliberately two one-line beats, so doubling it no longer
   * reaches the boundary. Twelve copies force a real overflow while keeping the injected shape
   * identical to authored terms, and must be reported at the innermost box.
   */
  test("reports a slide that overflows", async () => {
    await page.viewport(VIEW.width, VIEW.height);
    const real = successionBriefing();
    const first = real.slides[0];
    if (!first) {
      throw new Error("the briefing has no slides, so nothing can overflow");
    }
    const term = first.terms[0];
    if (!term) {
      throw new Error("the first slide has no term to repeat");
    }
    const padded: SuccessionBriefing = {
      ...real,
      slides: [
        {
          ...first,
          terms: Array.from({ length: 12 }, (_, index) => ({
            ...term,
            id: `${term.id}-overflow-${index}`,
          })),
        },
        ...real.slides.slice(1),
      ],
    };
    h = mount(<Dialogue briefing={padded} />);
    await waitFor(
      () => document.querySelector('[data-testid="sx-advisor-slide"]') !== null,
      "the walkthrough never mounted",
      20000,
    );
    await document.fonts.ready;

    const over = Math.max(...SCROLLERS.map((where) => clippedBy(where)));
    expect(
      over,
      "a slide with twelve copies fits, so the measurement above is measuring nothing",
    ).toBeGreaterThan(1);
  }, 60000);

  /** The frames somebody looks at. Off unless asked for; the assertions above are not. */
  test.runIf(SHOTS)(
    "photographs every step at the lead's own window",
    async () => {
      await page.viewport(VIEW.width, VIEW.height);
      h = mount(<Dialogue />);
      await waitFor(
        () => document.querySelector('[data-testid="sx-advisor-slide"]') !== null,
        "the walkthrough never mounted",
        20000,
      );
      await document.fonts.ready;

      const session = cdp() as unknown as {
        send: (
          method: string,
          params?: Record<string, unknown>,
        ) => Promise<{ data: string }>;
      };
      const frameElement = window.frameElement as HTMLElement | null;
      if (!frameElement) {
        throw new Error("not inside vitest's tester iframe, so nothing can be clipped");
      }
      const steps = successionBriefing().slides.length;
      for (let step = 0; step < steps; step += 1) {
        const which =
          document.querySelector<HTMLElement>('[data-testid="sx-advisor-slide"]')?.dataset
            .slide ?? "?";
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        const box = frameElement.getBoundingClientRect();
        const outer = window.parent as Window;
        const shot = await session.send("Page.captureScreenshot", {
          format: "png",
          clip: {
            x: box.left + outer.scrollX,
            y: box.top + outer.scrollY,
            width: box.width,
            height: box.height,
            scale: 1,
          },
        });
        if (SHOTS) {
          await commands.writeFile(
            `${OUT}/advisor-${String(step + 1).padStart(2, "0")}-${which}-${VIEW.width}x${VIEW.height}.png`,
            shot.data,
            { encoding: "base64" },
          );
        }
        if (step < steps - 1) {
          document.querySelector<HTMLElement>('[data-testid="sx-advisor-next"]')?.click();
          await new Promise<void>((resolve) => setTimeout(resolve, 120));
        }
      }
    },
    240000,
  );
});
