/**
 * **A LESSON SCROLLER THAT HAS MORE TO SHOW SAYS SO, AND STOPS SAYING IT AT THE BOTTOM.**
 *
 * The guard for `ScrollMoreCue.tsx`. `scrollAffordanceMeasure.browser.test.tsx` is the
 * instrument that found the defect and holds the full census; this is the part of it that can
 * be held, and it is deliberately a different claim from the fit guards nearby:
 *
 *  - `lessonShellFit.browser.test.tsx` asks whether the way forward is reachable. It is, and
 *    has been since #654.
 *  - `lessonPanelSceneFit.browser.test.tsx` asserts `stepOnePastFold <= 0`, that the first
 *    step is not cut in half. It is not — and this defect lives entirely on the PASSING side
 *    of that assertion, because a fold at -3px is greener by that measure than one at -40px
 *    and reads far worse. A tidy edge is what a FINISHED card looks like.
 *  - This file asks whether the learner is TOLD there is more, which neither of the other two
 *    can see.
 *
 * ## What is asserted, and why each half is needed
 *
 * Present-when-there-is-more, on its own, is satisfied by a permanent decoration, which is
 * the thing that would not fix the defect: a badge that is always on says nothing about this
 * card. So every population here is checked in BOTH directions — the cue is there while
 * content is hidden, and it is gone once the learner reaches the bottom — and the second
 * direction is the one an always-on element fails.
 *
 * Both populations are derived by measurement at 1024x580 rather than written down, each with
 * a floor, because a sweep whose population went empty would report green over nothing. And
 * the bubble's UNCAPPED packs are asserted too, with their own floor: they are the negative
 * control, and without them "every capped bubble shows a cue" would also be true of a cue
 * that renders unconditionally.
 *
 * ## Why the reading widths are in here
 *
 * The first fix attempted was `catchUp.css`'s scrollbar, and the reason it was abandoned is a
 * width: `scrollbar-gutter: stable` reserves 15px whether or not a box overflows, and
 * `CITY_PHONE` is a measured 330.8px that some 29 files depend on. The cue is out of flow so
 * it cannot cost a pixel, and Part 3 is what keeps that true — inject a stable gutter on the
 * well and it goes red at the phone column, which is the #654 failure class caught early.
 */

import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from "vitest";
import { page } from "vitest/browser";

import { d1LessonHost } from "../city/d1LessonHost";
import { WorldScene } from "../city/WorldScene";
import { AdvisorLesson } from "./AdvisorLesson";
import { allLessons, LESSON_DOMAINS } from "./domains";
import { EraInfinitePractice } from "./EraInfinitePractice";
import {
  CITY_DESKTOP,
  CITY_PHONE,
  DESKTOP_VIEWPORT,
  PHONE_VIEWPORT,
  type ReadingWidth,
} from "./readingWidths";
import { AT_THE_END_PX } from "./ScrollMoreCue";
import { lessonHostContext, popInSettled, query, SHORT_LAPTOP, settle } from "./shellFit";
import { workedExampleFor } from "./teachingSections";
import { findButton, type Harness, mount, waitFor } from "./testHarness";

import "../styles.css";

/**
 * Floors, set below what was measured at `66f1133d` so ordinary authoring does not trip them
 * and an emptied population does. Measured there: all ten domains offer a slide-0 worked
 * example, 53 of 53 of those wells overflow, and 49 of 62 lectures reach the bubble cap.
 */
const DOMAIN_FLOOR = 10;
const CAPPED_BUBBLE_FLOOR = 30;
const UNCAPPED_BUBBLE_FLOOR = 5;

let h: Harness | null = null;
let restore: { width: number; height: number } | null = null;

beforeAll(() => {
  restore = { width: window.innerWidth, height: window.innerHeight };
});

afterAll(async () => {
  if (restore) {
    await page.viewport(restore.width, restore.height);
  }
});

/** Per test: Part 3 moves the viewport, and a throw there must not resize every later test. */
beforeEach(async () => {
  await page.viewport(SHORT_LAPTOP.width, SHORT_LAPTOP.height);
});

afterEach(() => {
  h?.cleanup();
  h = null;
});

/** On screen means drawn, not merely in the DOM. */
function cueShown(root: ParentNode, where: "well" | "bubble"): boolean {
  const cue = root.querySelector<HTMLElement>(`.scroll-more-cue--${where}`);
  if (cue === null) {
    return false;
  }
  const box = cue.getBoundingClientRect();
  return box.width > 0 && box.height > 0 && getComputedStyle(cue).visibility !== "hidden";
}

/**
 * Send a scroller to its end and wait for the cue to go away, up to a bound.
 *
 * **POLLED, NOT SLEPT, for the same reason `popInSettled` is.** The cue clears on a React
 * commit driven by the scroll event, and how long that takes on a loaded two-core runner is not
 * a number this file can pick: a fixed 160ms was a bet, and it lost on three wells and ten
 * bubbles in run `31146744340` while passing every time here. Polling does not weaken the
 * claim — the cue must still be gone — it only stops the clock being part of it.
 *
 * The residue and any growth are reported alongside the verdict, because the two ways the cue
 * can still be up want opposite fixes and a bare boolean cannot tell them apart: either the box
 * stopped short of its end, or the content grew after the scroll and the cue is right.
 */
async function cueClearsAtTheBottom(
  scroller: HTMLElement,
  stillShown: () => boolean,
): Promise<{ cleared: boolean; report: string }> {
  const before = scroller.scrollHeight;
  scroller.scrollTop = scroller.scrollHeight;
  const deadline = performance.now() + 4000;
  while (stillShown() && performance.now() < deadline) {
    await settle(50);
  }
  const residue = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
  const grew = scroller.scrollHeight - before;
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    cleared: !stillShown(),
    report: `${round(residue)}px left unscrolled, content ${grew === 0 ? "unchanged" : `grew ${round(grew)}px`}`,
  };
}

async function openLecture(node: string): Promise<HTMLElement> {
  h = mount(d1LessonHost.render(lessonHostContext(node)));
  const host = h.host;
  // The panel tokens are declared on `.city-shell`, so a bare host paints the card
  // transparent and photographs like a defect. Same reason `shellFit.tsx` does this.
  host.className = "city-shell";
  await waitFor(
    () => host.querySelector(".advisor-npc__bubble") !== null,
    `${node}: the advisor speaks`,
  );
  query<HTMLElement>(host, ".coc-card").style.animation = "none";
  await document.fonts.ready;
  await settle(220);
  return host;
}

async function openSlideZeroExample(node: string): Promise<HTMLElement> {
  const host = await openLecture(node);
  findButton(host, "Next").click();
  await waitFor(
    () => host.querySelector(".worked-solution__step") !== null,
    `${node} slide 0: the worked-example card mounts`,
  );
  await document.fonts.ready;
  await settle(300);
  return host;
}

/* ------------------------------------------------------------- 1. the well */

/**
 * One pack per domain, derived: the domain's first lesson whose slide 0 has a worked example.
 *
 * Per-domain rather than all 53, because the cue is shared chrome and every pack reaches it
 * through the same component — what a full sweep would buy is runtime, not assurance. The
 * floor is what makes the derivation honest: if a domain stopped offering one, this list would
 * quietly shorten, and `DOMAIN_FLOOR` is what fails instead.
 */
function onePackPerDomain(): { node: string; domain: string }[] {
  const out: { node: string; domain: string }[] = [];
  for (const domain of LESSON_DOMAINS) {
    const lesson = domain.lessons.find((l) => workedExampleFor(l, 0) !== null);
    if (lesson !== undefined) {
      out.push({ node: lesson.node_id, domain: domain.id });
    }
  }
  return out;
}

test("every domain still offers a slide-0 worked example to measure", () => {
  expect(
    onePackPerDomain().length,
    "fewer domains offer a slide-0 worked example than when this was measured, so the sweep below is narrower than it reads",
  ).toBeGreaterThanOrEqual(DOMAIN_FLOOR);
});

test.each(onePackPerDomain())(
  "$domain ($node): the well says there is more, and stops at the bottom",
  async ({ node }) => {
    const host = await openSlideZeroExample(node);
    const body = query<HTMLElement>(host, ".coc-card__body");

    // The floor under everything else here. A well that does not overflow owes no cue, so
    // without this the two assertions below could both be true of a surface with nothing
    // hidden at all.
    expect(
      body.scrollHeight - body.clientHeight,
      `${node}: this well does not overflow at 1024x580, so nothing here was measured`,
    ).toBeGreaterThan(20);

    expect(
      cueShown(host, "well"),
      `${node}: the well hides ${Math.round(body.scrollHeight - body.clientHeight)}px of the card and says nothing about it`,
    ).toBe(true);

    const end = await cueClearsAtTheBottom(body, () => cueShown(host, "well"));
    expect(
      end.cleared,
      `${node}: the cue is still up at the bottom of the scroll, so it is a decoration rather than a cue (${end.report})`,
    ).toBe(true);
  },
  120_000,
);

/* ----------------------------------------------------------- 2. the bubble */

/**
 * The advisor's own scroller, swept over EVERY authored pack rather than one per domain.
 *
 * Unlike the well, whether this one bites is a property of the pack's prose — 49 of 62 slide-0
 * lectures reach the cap and 13 do not — so the population and its negative control are both
 * facts about the content, and both are worth deriving in full.
 */
test("the advisor's bubble says there is more, only when there is", async () => {
  const capped: string[] = [];
  const uncapped: string[] = [];
  const silentWhileCapped: string[] = [];
  const stillUpAtTheBottom: string[] = [];
  const cueingWithNothingHidden: string[] = [];

  for (const domain of LESSON_DOMAINS) {
    for (const lesson of domain.lessons) {
      const host = await openLecture(lesson.node_id);
      const said = query<HTMLElement>(host, ".advisor-npc__said");
      // The hook's own threshold, imported rather than repeated: a bubble this guard calls
      // capped but the hook calls finished would be a disagreement about nothing that still
      // reads as a missing cue.
      const hidden = said.scrollHeight - said.clientHeight;
      if (hidden > AT_THE_END_PX) {
        capped.push(lesson.node_id);
        if (!cueShown(host, "bubble")) {
          silentWhileCapped.push(lesson.node_id);
        }
        const end = await cueClearsAtTheBottom(said, () => cueShown(host, "bubble"));
        if (!end.cleared) {
          stillUpAtTheBottom.push(`${lesson.node_id} (${end.report})`);
        }
      } else {
        uncapped.push(lesson.node_id);
        if (cueShown(host, "bubble")) {
          cueingWithNothingHidden.push(lesson.node_id);
        }
      }
      h?.cleanup();
      h = null;
    }
  }

  expect(
    capped.length,
    "no lecture reaches the bubble cap at 1024x580, so the assertions below are over an empty set",
  ).toBeGreaterThanOrEqual(CAPPED_BUBBLE_FLOOR);
  expect(
    uncapped.length,
    "every lecture reaches the cap, so there is no negative control and an unconditional cue would pass",
  ).toBeGreaterThanOrEqual(UNCAPPED_BUBBLE_FLOOR);

  expect(
    silentWhileCapped,
    "these lectures are cut off with no cue that the advisor is still talking",
  ).toEqual([]);
  expect(
    stillUpAtTheBottom,
    "these bubbles keep the cue up with nothing left to read, which is a decoration and not a cue",
  ).toEqual([]);
  expect(
    cueingWithNothingHidden,
    "these bubbles show the cue while showing all of their words, so it is not conditional on anything",
  ).toEqual([]);
}, 600_000);

/* --------------------------------------------- 3. the cue costs no reading width */

/**
 * The reading widths, measured the way `labelFigureNarrow.browser.test.tsx` measures them.
 *
 * This is here because the REJECTED fix would have moved them, and the rejection is only
 * durable if something fails when someone tries it again: put `scrollbar-gutter: stable` on
 * `.coc-card__body` and the phone column goes from 330.8 to 320.8 and this test is what says
 * so, before CI's fonts rewrap a sentence in `d6Fun4AxisAndProse.browser.test.tsx`.
 */
async function columnAt(viewport: {
  width: number;
  height: number;
}): Promise<{ column: number; inside: number }> {
  const content = allLessons.find((l) => (l.visuals ?? []).length > 0);
  if (content === undefined) {
    throw new Error("no lesson places a visual");
  }
  await page.viewport(viewport.width, viewport.height);
  h = mount(
    <WorldScene eyebrow="e" title={content.title} size="large" onExit={() => {}}>
      <AdvisorLesson content={content} />
    </WorldScene>,
  );
  const host = h.host;
  host.className = "city-shell";
  for (let step = 0; step < 24; step += 1) {
    await waitFor(
      () =>
        host.querySelector("figure.lesson-visual") !== null ||
        host.querySelector(".advisor-npc__action--next") !== null,
      "the advisor shows a figure or a way forward",
    );
    if (host.querySelector("figure.lesson-visual") !== null) {
      break;
    }
    host.querySelector<HTMLButtonElement>(".advisor-npc__action--next")?.click();
    await settle(30);
  }
  await waitFor(
    () => host.querySelector("figure.lesson-visual") !== null,
    "the lesson mounts a visual",
  );
  await document.fonts.ready;
  // Not `settle(n)`. The card's pop-in is a SCALE, so a width taken while it is in flight is a
  // fraction of the real one, and no sleep is long enough because `animation-fill-mode: both`
  // makes the wait a wait on when the animation STARTS. This cost a CI red at 919.11 of 920.
  await popInSettled();

  const figure = query<HTMLElement>(host, "figure.lesson-visual");
  const style = getComputedStyle(figure);
  const off = (["Left", "Right"] as const).reduce(
    (total, side) =>
      total +
      Number.parseFloat(style[`padding${side}` as const]) +
      Number.parseFloat(style[`border${side}Width` as const]),
    0,
  );
  const box = figure.getBoundingClientRect();
  h.cleanup();
  h = null;
  return { column: box.width, inside: box.width - off };
}

test.each([
  [PHONE_VIEWPORT, CITY_PHONE],
  [DESKTOP_VIEWPORT, CITY_DESKTOP],
] as [{ width: number; height: number }, ReadingWidth][])(
  "the cue takes nothing from %o",
  async (viewport, expected) => {
    const got = await columnAt(viewport);
    expect(got.column, `${expected.where}: the column a lesson figure fills`).toBeCloseTo(
      expected.column,
      1,
    );
    expect(got.inside, `${expected.where}: the width inside that figure`).toBeCloseTo(
      expected.inside,
      1,
    );
  },
  180_000,
);

/* ------------------------------------------ 4. the surface that owes no well cue */

/**
 * **THE ONE DECLARED EXCEPTION, asserted both ways.**
 *
 * The well cue is anchored to the advisor's pinned control row, so a capped surface that
 * mounts no such row cannot carry one. Exactly one shipped surface is in that position: the
 * Town Hall's interleaved drill, which `CitySurface.tsx` mounts in the same `size="large"`
 * frame with an advisor bubble for encouragement and no controls, because the way forward
 * there is the drill's own Check inside the board. `lessonShellFit.browser.test.tsx` derives
 * that same classification from source.
 *
 * Both directions, so the exemption cannot rot. If the drill ever grows a control row, it
 * stops being exempt and the first assertion fails; if it stops mounting a bubble at all,
 * there is nothing here to exempt and the second one does.
 */
test("the Town Hall drill has no control row to hang a well cue on, and still has a bubble", async () => {
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
  host.className = "city-shell";
  await waitFor(() => host.querySelector(".coc-card") !== null, "the card mounts");
  query<HTMLElement>(host, ".coc-card").style.animation = "none";
  await waitFor(
    () => host.querySelector(".lesson-practice .infinite-practice__streak") !== null,
    "the interleaved drill mounts",
  );
  await document.fonts.ready;
  await settle(300);

  expect(
    host.querySelector(".advisor-npc__controls"),
    "the drill has grown an advisor control row, so it is no longer exempt from the well cue and this exception is excusing nothing",
  ).toBeNull();
  expect(
    host.querySelector(".advisor-npc__bubble"),
    "the drill mounts no advisor bubble, so there is no scroller here for this exception to be about",
  ).not.toBeNull();
  expect(
    cueShown(host, "well"),
    "a well cue is on screen with no control row to anchor it, so it has escaped to some other box",
  ).toBe(false);
}, 240_000);
