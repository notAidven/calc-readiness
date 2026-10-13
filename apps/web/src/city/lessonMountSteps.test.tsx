import { getEraOfNode } from "@cr/skill-graph";
import type { Mastery } from "@cr/state-schema";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { allLessons, LESSON_DOMAINS } from "../lessons/domains";
import { type AdvisorArt, advisorPosesForEra } from "../lessons/eraAdvisor";
import { sectionsFor } from "../lessons/teachingSections";
import type { LessonContent } from "../lessons/types";
import { d1LessonHost } from "./d1LessonHost";
import { CURRENT_ERA_ID } from "./eraDressing";
import type { LessonHostContext } from "./lessonHost";

/**
 * The GAME's lesson mount shows the mini-lesson ONE PAGE AT A TIME, with the advisor.
 *
 * The defect it exists for: entering a building's lesson from the city dumped every
 * paragraph and every widget of the pack into one scroll, with no advisor, no
 * Next/Previous and no gates. The shared shell was innocent and still is — the `?dev`
 * page mounts the same `AdvisorLesson` and pages correctly — so nothing here tests the
 * shell. It tests the CITY's mount: `d1LessonHost` handed the shell
 * `hasCompletedPractice` alongside `skipMenu`, and that pair is the one combination
 * that routes it to its combined `LessonBody` reread. Every other mount omits
 * `skipMenu`, which is why only the game showed it.
 *
 * Scope, per the behaviour rather than the implementation: the population is every
 * lesson the game can open, crossed with every context the city can hand the host for
 * the lesson entry. It is NOT "the config CitySurface passes today", because a mirror
 * of one call site drifts off it silently and would then be asserting nothing about the
 * surface a learner reaches. Holding over the whole cross product is what makes the
 * guard independent of which combination the city picks.
 *
 * Floors, because "one page is visible" passes trivially over a pack with no pages:
 * every pack in the population is asserted to hold at least two paragraphs (so "exactly
 * one" is a real restriction), each paragraph is asserted to yield a distinct, findable
 * probe (so the count is measurable at all), and the population itself is floored
 * against the registry so it cannot shrink to nothing.
 */

/**
 * Every `Mastery` the city can hand over. Written as a TOTAL map over the union, so
 * widening `Mastery` is a compile error here rather than a value this sweep silently
 * stops covering. The axis matters: mastery >= 1 is exactly what used to select the
 * all-paragraphs branch, so a sweep that quietly narrowed to `[0]` would go green over
 * the defect it was written for.
 */
const MASTERY_COVERAGE = { 0: true, 1: true, 2: true, 3: true } satisfies Record<
  Mastery,
  true
>;
const MASTERY_VALUES = Object.keys(MASTERY_COVERAGE).map(Number) as readonly Mastery[];

/**
 * Both `skipMenu` values. The city sets it because its own building popup has already
 * offered Review / Practice / Infinite; the learner must reach the paged lesson either
 * way, so both are swept rather than the one the call site happens to pass.
 */
const SKIP_MENU_VALUES = [false, true] as const;

/** The lesson entry: neither resume flag, which is the path the popup's first card takes. */
function lessonEntryContext(
  lesson: LessonContent,
  mastery: Mastery,
  skipMenu: boolean,
): LessonHostContext {
  return {
    nodeId: lesson.node_id,
    lessonShell: null,
    archetypeLabel: "Test archetype",
    constructionLabel: "Complete",
    onExit: () => {},
    mastery,
    skipMenu,
    resumePractice: false,
    resumeInfinite: false,
  };
}

/**
 * A findable needle for one authored paragraph.
 *
 * The longest run of ordinary prose in the SOURCE: every character that Markdown or
 * KaTeX rewrites (`*`, `_`, `` ` ``, `$`, brackets) is a separator, and the edges are
 * trimmed back to letters, so what is left survives rendering verbatim and can be
 * looked for in the DOM. Math is deliberately not probed — KaTeX's MathML duplicates
 * every glyph, so a math span's `textContent` is not the source string.
 */
function proseProbe(paragraph: string): string {
  const runs = paragraph
    .split(/[^A-Za-z0-9 ,.'’-]+/)
    .map((run) => run.replace(/^[^A-Za-z]+/, "").replace(/[^A-Za-z]+$/, ""))
    .map((run) => run.replace(/\s+/g, " ").trim());
  return runs.reduce((longest, run) => (run.length > longest.length ? run : longest), "");
}

/** How many of the pack's paragraphs are on screen, and which. */
function pagesOnScreen(probes: readonly string[]): readonly number[] {
  const text = (document.body.textContent ?? "").replace(/\s+/g, " ");
  return probes.flatMap((probe, index) => (text.includes(probe) ? [index] : []));
}

/** The all-paragraphs reread container. Only the combined `LessonBody` mounts one. */
function allPagesContainer(): Element | null {
  return document.querySelector(".lesson-player__prose");
}

function advisorBubble(): Element | null {
  return document.querySelector(".advisor-npc__bubble");
}

/**
 * The root class of each advisor drawing (D-ERA28). Positioned-box characters rather than
 * SVGs, so the class is the handle.
 *
 * **Keyed by `AdvisorArt` so a new drawing cannot be added without a handle here** — a
 * `Record`, not a `Partial`, exactly as `eraAdvisor.ts`' own tables are.
 *
 * ## ⚑ WIDENED 2026-07-31, and it was scoped to the implementation before
 *
 * This was a single constant, `".advisor-npc__character .oru-advisor"`, and the assertion
 * below was *"the advisor is both halves: Oru's art and the bubble"*. That was correct while
 * one drawing existed, and the moment era two got its own it failed on all five era-two packs
 * — reporting *"no advisor"* about a surface that was drawing the correct advisor perfectly.
 *
 * **The guard was measuring which CHARACTER rendered when its subject is whether an advisor
 * renders at all.** So it is not merely relaxed to "some figure is present", which would be
 * the cheap fix and would stop catching anything: the drawing is DERIVED from the pack's own
 * era, and the assertion is that the era's declared drawing is the one on screen. That is
 * strictly stronger than what it replaced — the old line would have passed a surface that
 * drew era ONE's advisor over an era-two lesson, and this one fails it.
 */
const ADVISOR_ROOTS: Readonly<Record<AdvisorArt, string>> = {
  oru: ".advisor-npc__character .oru-advisor",
  maka: ".advisor-npc__character .maka-advisor",
};

/**
 * The drawing this pack's lesson must render, resolved the way `AdvisorLesson` resolves it:
 * from the lesson's own node, never from module state.
 */
function expectedAdvisorRoot(nodeId: string): { art: AdvisorArt; selector: string } {
  const eraId = getEraOfNode(nodeId)?.id ?? CURRENT_ERA_ID;
  const art = advisorPosesForEra(eraId).art;
  return { art, selector: ADVISOR_ROOTS[art] };
}

/**
 * The advisor's own controls, by class rather than by role: `getByRole` computes an
 * accessible name, and jsdom's `getComputedStyle` throws on the KaTeX-heavy trees these
 * packs render.
 */
function advisorControl(kind: "next" | "prev"): Element | null {
  return document.querySelector(`.advisor-npc__controls .advisor-npc__action--${kind}`);
}

interface Pack {
  readonly lesson: LessonContent;
  readonly probes: readonly string[];
}

/**
 * Every registered lesson, with no filter and no exception list: a pack the game can
 * open is a pack that owes this, and there is nothing a pack can be that excuses it.
 */
const POPULATION: readonly Pack[] = allLessons.map((lesson) => ({
  lesson,
  probes: lesson.mini_lesson.map(proseProbe),
}));

describe("the game's lesson mount is measurable at all", () => {
  it("draws its population from the whole lesson registry", () => {
    // Derived from the registry rather than written down, and floored well under
    // today's count so a new pack does not need a bump while an emptied registry,
    // a dropped domain or a filtered-out set still fails.
    expect(POPULATION).toHaveLength(allLessons.length);
    expect(POPULATION.length).toBeGreaterThanOrEqual(24);
    expect(LESSON_DOMAINS.length).toBeGreaterThanOrEqual(5);
  });

  it("sweeps every mastery the city can hand over, including the ones that used to break it", () => {
    expect(MASTERY_VALUES).toEqual([0, 1, 2, 3]);
    // The branch this guard exists for was reachable only above zero.
    expect(MASTERY_VALUES.filter((mastery) => mastery >= 1).length).toBeGreaterThanOrEqual(
      3,
    );
    expect(SKIP_MENU_VALUES).toHaveLength(2);
  });

  it("only measures packs that could show more than one page, and can tell their pages apart", () => {
    const tooShort = POPULATION.filter(({ lesson }) => lesson.mini_lesson.length < 2);
    // No exception list: "exactly one page is visible" is vacuous over a pack with
    // one page or none, so a pack that cannot evidence the claim must not be counted
    // as though it had.
    expect(tooShort.map(({ lesson }) => lesson.node_id)).toEqual([]);

    const unmeasurable: string[] = [];
    let paragraphs = 0;
    for (const { lesson, probes } of POPULATION) {
      paragraphs += probes.length;
      for (const [index, probe] of probes.entries()) {
        if (probe.length < 24) {
          unmeasurable.push(`${lesson.node_id} paragraph ${index}: probe "${probe}"`);
        }
      }
      if (new Set(probes).size !== probes.length) {
        unmeasurable.push(`${lesson.node_id}: two paragraphs share a probe`);
      }
    }
    expect(unmeasurable).toEqual([]);
    // A floor on the measurement itself: the page count below is only meaningful
    // because there are many pages that could have shown up and did not.
    expect(paragraphs).toBeGreaterThanOrEqual(POPULATION.length * 2);
  });
});

describe.each(MASTERY_VALUES)(
  "entering a building's lesson at mastery %i",
  (mastery: Mastery) => {
    for (const skipMenu of SKIP_MENU_VALUES) {
      it(`shows exactly one page, with the advisor, for every pack (skipMenu=${skipMenu})`, () => {
        const wrongPageCount: string[] = [];
        const notFirstPage: string[] = [];
        const noAdvisor: string[] = [];
        const dumpedEveryPage: string[] = [];
        const drawingsSeen = new Set<AdvisorArt>();

        for (const { lesson, probes } of POPULATION) {
          render(d1LessonHost.render(lessonEntryContext(lesson, mastery, skipMenu)));
          const pages = pagesOnScreen(probes);
          if (pages.length !== 1) {
            wrongPageCount.push(
              `${lesson.node_id}: ${pages.length} of ${probes.length} pages on screen`,
            );
          } else if (pages[0] !== 0) {
            notFirstPage.push(`${lesson.node_id}: opened on page ${(pages[0] ?? 0) + 1}`);
          }
          // The advisor is both halves: THIS ERA's drawing and the bubble that holds the
          // words. The drawing is derived from the pack's era, so a lesson narrated by the
          // wrong era's advisor fails here rather than passing as "an advisor rendered".
          const { art, selector } = expectedAdvisorRoot(lesson.node_id);
          if (advisorBubble() === null || document.querySelector(selector) === null) {
            noAdvisor.push(`${lesson.node_id}: expected ${art}`);
          } else {
            drawingsSeen.add(art);
          }
          if (allPagesContainer() !== null) {
            dumpedEveryPage.push(lesson.node_id);
          }
          cleanup();
        }

        expect(wrongPageCount).toEqual([]);
        expect(notFirstPage).toEqual([]);
        expect(noAdvisor).toEqual([]);
        expect(dumpedEveryPage).toEqual([]);
        // Floor on SHAPE, not just on size: more than one drawing was actually exercised, so
        // this cannot quietly become the single-drawing sweep it used to be — which is the
        // state that let it report "no advisor" about five correct surfaces.
        expect(drawingsSeen.size).toBeGreaterThanOrEqual(2);
        expect(POPULATION.length).toBeGreaterThanOrEqual(26);
      });
    }
  },
);

/**
 * The gate is the whole point of the interactive visuals, so a mount that pages
 * correctly while letting the learner walk past an unfinished widget is not fixed.
 *
 * Every shipped pack places a gating visual on its FIRST slide, so the population here is
 * the same one as above and it needs no fixture: the paged surface that carries that
 * widget must hold its "Next" back until it is finished, and must say in the DOM what is
 * owed rather than only omitting a button. (That Next/Previous then walk the pages is the
 * shared shell's own claim and is guarded in `lessons/AdvisorLesson.test.tsx`; this file's
 * subject is which surface the CITY reaches.)
 *
 * ## ⚑ WIDENED: a slide is three sections now, and the gate is on the last of them
 *
 * This demanded the gate of the surface the mount LANDS on, which was the same surface
 * while a slide was one screen. A teaching slide now walks lecture, then an optional
 * worked example, then the gated widget (`lessons/teachingSections.ts`), so the landing
 * surface is the lecture: it carries no widget and offers Next freely, by design. Read
 * against the new flow the old assertion reported every gating pack as un-gated, which is
 * the shape of a guard measuring the wrong surface rather than of a real un-gating.
 *
 * So the walk is DERIVED from `sectionsFor` rather than counted, and BOTH halves are
 * asserted, because "the gate moved" and "the gate went away" have to stay
 * distinguishable: the landing lecture must offer Next and hold no widget, and the
 * activity must withhold Next and hold one. `walked` floors the clicks the sweep actually
 * needed, so a widget rendered back onto the lecture cannot pass this as though the flow
 * were unchanged.
 */
/**
 * Packs whose first slide places no gating visual, and so cannot evidence the gate.
 *
 * Empty today, and declared rather than filtered for: a pack that quietly stopped gating
 * its first slide would otherwise drop out of the sweep below and take the floor with it,
 * which is how a real un-gating ships behind a green run. The census asserts this both
 * ways — a pack that stops gating fails for not being named here, and a name here that
 * does gate fails for being named.
 */
const NO_GATE_ON_FIRST_PAGE: readonly string[] = [];

/**
 * Advance from the landing surface to the section of slide 0 that carries its widget,
 * returning how many clicks that took. Derived from the pack's own section list, so a
 * slide with no worked example costs one click and a slide with one costs two.
 */
function walkToTheGatedSection(lesson: LessonContent): number {
  let clicks = 0;
  for (const section of sectionsFor(lesson, 0)) {
    if (section === "activity") {
      break;
    }
    const next = advisorControl("next");
    if (next === null) {
      return clicks;
    }
    fireEvent.click(next);
    clicks += 1;
  }
  return clicks;
}

describe("the game's lesson mount keeps the first slide's gate closed", () => {
  it("withholds Next while the slide's interaction is unfinished, and says what is owed", () => {
    const ungated: string[] = [];
    const silent: string[] = [];
    const noWidget: string[] = [];
    const backwards: string[] = [];
    const notGating: string[] = [];
    const lectureWithoutNext: string[] = [];
    const lectureWithAWidget: string[] = [];
    let gatedPacks = 0;
    let walked = 0;

    for (const { lesson } of POPULATION) {
      const gatesFirstPage = (lesson.visuals ?? []).some(
        (visual) => visual.after === 0 && visual.gates,
      );
      if (!gatesFirstPage) {
        notGating.push(lesson.node_id);
        continue;
      }
      gatedPacks += 1;
      render(d1LessonHost.render(lessonEntryContext(lesson, 3, true)));

      // The landing surface is the lecture, which owes the opposite of the gate: it
      // explains the idea, holds no widget, and lets the learner move on.
      if (advisorControl("next") === null) {
        lectureWithoutNext.push(lesson.node_id);
      }
      if (document.querySelector(".lesson-interactive") !== null) {
        lectureWithAWidget.push(lesson.node_id);
      }
      // Nothing sits behind the lesson's first section, so Previous is correctly absent.
      if (advisorControl("prev") !== null) {
        backwards.push(lesson.node_id);
      }

      walked += walkToTheGatedSection(lesson);

      if (advisorControl("next") !== null) {
        ungated.push(lesson.node_id);
      }
      // The gating widget has to be ON the section: "no Next" over a surface with no
      // interaction is a dead end, not a gate.
      if (document.querySelector(".lesson-interactive") === null) {
        noWidget.push(lesson.node_id);
      }
      // And the reason the learner cannot move on has to be in the DOM rather than in
      // the absence of a button: the widget's own live region carries the task.
      if (document.querySelector(".lesson-interactive__status") === null) {
        silent.push(lesson.node_id);
      }
      cleanup();
    }

    expect(lectureWithoutNext).toEqual([]);
    expect(lectureWithAWidget).toEqual([]);
    expect(ungated).toEqual([]);
    expect(backwards).toEqual([]);
    expect(noWidget).toEqual([]);
    expect(silent).toEqual([]);
    // Nothing left the population unaccounted for, in either direction.
    expect([...notGating].sort()).toEqual([...NO_GATE_ON_FIRST_PAGE].sort());
    expect(gatedPacks + notGating.length).toBe(POPULATION.length);
    // Containment over an empty set is free, so the gate claim needs a floor under it.
    expect(gatedPacks).toBeGreaterThanOrEqual(24);
    // The walk has to have moved at least one section per pack, so a widget rendered
    // back onto the lecture cannot satisfy the gate half without failing here.
    expect(walked).toBeGreaterThanOrEqual(gatedPacks);
  });
});
