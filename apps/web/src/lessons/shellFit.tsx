/**
 * **SHARED PLUMBING FOR THE FILES THAT MEASURE THE LESSON SHELL'S VERTICAL FIT.**
 *
 * Test-only, and a sibling of `testHarness.ts` for the reason `kindFamily.ts` is one: it is
 * imported by tests and by nothing that ships. It exists because two files need the SAME
 * answer to two questions, and a second copy of either would be a second thing to drift.
 *
 * 1. **Which board does a learner actually meet first?** The advisor walk cannot step PAST a
 *    gated slide without satisfying its gate, so the only board a learner-faithful walk
 *    reaches unaided is a lesson's FIRST gated activity slide. Which lesson stands for a
 *    domain is then derived rather than tabled: probe every lesson's first-gated board bare
 *    in the 920px reading column and take the domain's tallest. A written-down list of node
 *    ids would rot; the RULE is what is written down here.
 * 2. **How is the learner's shell opened?** `d1LessonHost.render(...)`, the real component
 *    the city opens for all ten domains, at `size="large"`. Never the `?dev` frame, whose
 *    `.world-scene--full .coc-card { max-height: none }` lifts the very cap being measured.
 */

import { d1LessonHost } from "../city/d1LessonHost";
import type { LessonHostContext } from "../city/lessonHost";
import { LESSON_DOMAINS } from "./domains";
import { type Harness, mount, waitFor } from "./testHarness";
import type { LessonContent } from "./types";
import { LessonVisual } from "./visuals";

/** The short realistic laptop every number and every frame in these files is named against. */
export const SHORT_LAPTOP = { width: 1024, height: 580 } as const;

export const settle = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** The slide index of a lesson's first GATING visual, or null where it has none. */
export function firstGatedSlide(lesson: LessonContent): number | null {
  const gated = (lesson.visuals ?? []).filter((v) => v.gates);
  if (gated.length === 0) {
    return null;
  }
  return gated.reduce((lowest, v) => Math.min(lowest, v.after), Number.POSITIVE_INFINITY);
}

/** Every visual that slide mounts, gating or not: what the learner is looking at. */
export function visualsOnSlide(lesson: LessonContent, slide: number) {
  return (lesson.visuals ?? []).filter((v) => v.after === slide);
}

export interface BoardProbe {
  node: string;
  domain: string;
  slide: number;
  ids: string[];
  /** Natural height of that slide's board, bare, in the 920px reading column. */
  height: number;
}

let probed: BoardProbe[] | null = null;

/**
 * Natural board heights for every lesson's first gated slide, measured once per file.
 *
 * Bare in a 920px column under `.world-scene--large`, because the diagram cap
 * (`max-width: 560px`) is a descendant rule of that class and a probe without it would
 * measure diagrams the learner is never given.
 */
export async function probeBoardHeights(): Promise<BoardProbe[]> {
  if (probed) {
    return probed;
  }
  const out: BoardProbe[] = [];
  for (const domain of LESSON_DOMAINS) {
    for (const lesson of domain.lessons) {
      const slide = firstGatedSlide(lesson);
      if (slide === null) {
        continue;
      }
      const visuals = visualsOnSlide(lesson, slide);
      const probe: BoardProbe = {
        node: lesson.node_id,
        domain: domain.id,
        slide,
        ids: visuals.map((v) => v.id),
        height: 0,
      };
      let harness: Harness | null = null;
      try {
        harness = mount(
          <div className="world-scene world-scene--large" style={{ position: "static" }}>
            <div style={{ width: 920 }}>
              {visuals.map((v) => (
                <LessonVisual
                  key={v.id}
                  id={v.id}
                  onComplete={v.gates ? () => {} : undefined}
                />
              ))}
            </div>
          </div>,
        );
        const host = harness.host;
        await waitFor(
          () => host.querySelectorAll("figure.lesson-visual").length === visuals.length,
          `${lesson.node_id}: slide ${slide}'s visuals mount`,
        );
        await settle(60);
        const figures = Array.from(
          host.querySelectorAll<HTMLElement>("figure.lesson-visual"),
        );
        const top = Math.min(...figures.map((f) => f.getBoundingClientRect().top));
        const bottom = Math.max(...figures.map((f) => f.getBoundingClientRect().bottom));
        probe.height = Math.round((bottom - top) * 10) / 10;
      } catch {
        probe.height = -1;
      } finally {
        harness?.cleanup();
      }
      out.push(probe);
    }
  }
  probed = out;
  return out;
}

/**
 * The natural height of ONE named board, in the same column {@link probeBoardHeights} uses.
 *
 * The learner walk cannot pass a gate, so `openLearnerLessonAtGatedBoard` only ever reaches a
 * lesson's FIRST gated slide and {@link probeBoardHeights} only ever measures those. A lesson's
 * LATER gated boards are just as much a learner's problem — LF.1's rise-over-run triangle, the
 * board this whole layout was reported against, is its slide 1 — so they need a probe that
 * takes an id rather than a lesson. Same mount, same 920px column, same `--large` frame, so the
 * two sets of numbers are comparable.
 */
export async function probeVisualHeight(id: string): Promise<number> {
  let harness: Harness | null = null;
  try {
    harness = mount(
      <div className="world-scene world-scene--large" style={{ position: "static" }}>
        <div style={{ width: 920 }}>
          <LessonVisual id={id as never} onComplete={() => {}} />
        </div>
      </div>,
    );
    const host = harness.host;
    await waitFor(
      () => host.querySelector("figure.lesson-visual") !== null,
      `${id}: the board mounts`,
    );
    await settle(60);
    const figure = host.querySelector<HTMLElement>("figure.lesson-visual");
    if (figure === null) {
      throw new Error(`${id}: no figure to measure`);
    }
    return Math.round(figure.getBoundingClientRect().height * 10) / 10;
  } finally {
    harness?.cleanup();
  }
}

/** The domain's tallest first-gated board: the worst case a learner meets unaided there. */
export async function tallestFirstGatedBoard(domainId: string): Promise<BoardProbe> {
  const all = await probeBoardHeights();
  const mine = all.filter((p) => p.domain === domainId && p.height > 0);
  const tallest = mine.reduce<BoardProbe | null>(
    (best, p) => (best === null || p.height > best.height ? p : best),
    null,
  );
  if (tallest === null) {
    throw new Error(`${domainId}: no lesson offers a measurable first-gated board`);
  }
  return tallest;
}

export function lessonHostContext(nodeId: string): LessonHostContext {
  return {
    nodeId,
    lessonShell: null,
    archetypeLabel: "workshop",
    constructionLabel: "Foundation",
    onExit: () => {},
    onFinishLesson: () => {},
  };
}

export function query<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matched ${selector}`);
  }
  return found;
}

export const advanceButton = (root: ParentNode) =>
  root.querySelector<HTMLButtonElement>(".advisor-npc__action--next");

/** Is `node` and everything above it drawn at its own size, rather than under a transform? */
export function untransformed(node: Element | null): boolean {
  if (node === null) {
    return false;
  }
  for (let at: Element | null = node; at !== null; at = at.parentElement) {
    const transform = getComputedStyle(at).transform;
    if (transform !== "none" && transform !== "matrix(1, 0, 0, 1, 0, 0)") {
      return false;
    }
  }
  return true;
}

/**
 * Wait until nothing above `selector` is still scaled, so no width taken below is a fraction
 * of itself.
 *
 * **A FIXED SLEEP IS NOT A WAIT FOR THE ANIMATION, IT IS A BET ON WHEN IT WILL START.**
 * `.coc-card` runs `coc-card-in` for 200ms with `animation-fill-mode: both`, and `both` is the
 * word that matters: until the animation actually begins the element is HELD at the 0%
 * keyframe, `transform: scale(0.86)`, and `getBoundingClientRect` reports that reduced box
 * without complaint. The quantity a sleep has to cover is therefore not the 200ms duration but
 * the unbounded delay before the first keyframe lands on a loaded two-core runner.
 *
 * `labelFigureNarrow.browser.test.tsx` wrote this first and lost twice to it at exactly 0.86 of
 * the expected number. It is here because a second file then lost to the OTHER end of the same
 * animation: `lessonScrollAffordance` measured 919.1128540039062 against 920, and 0.99903 is
 * the easing's overshoot on its way back down from `scale(1.03)`, not a layout disagreement.
 * The lesson is the same and so is the fix, so it is shared rather than copied a third time.
 */
export async function popInSettled(selector = "figure.lesson-visual"): Promise<void> {
  await waitFor(
    () => untransformed(document.querySelector(selector)),
    "the card's pop-in never finished, so every width here would be a fraction of itself",
    5000,
  );
}

/**
 * The learner shell, opened on `nodeId` and walked forward to its first GATED activity slide.
 *
 * The walk is the learner's: click the advisor's own "Next" until it stops being offered with
 * a board on screen, which is `AdvisorLesson`'s gate holding it back. The returned harness is
 * the caller's to clean up.
 */
export async function openLearnerLessonAtGatedBoard(nodeId: string): Promise<Harness> {
  const harness = mount(d1LessonHost.render(lessonHostContext(nodeId)));
  const host = harness.host;
  // `.city-shell` is the ancestor every real mount of this has, and it is where the panel
  // tokens are DECLARED (`--glass-fill-strong` and friends, styles.css:1915-1934). A bare
  // host resolves them to nothing, which paints the card and the pinned control row
  // transparent — a harness artefact that reads exactly like a defect in a screenshot.
  host.className = "city-shell";
  try {
    await waitFor(
      () => host.querySelector(".coc-card") !== null,
      `${nodeId}: the card mounts`,
    );
    // The pop-in animates `transform: scale`, so a rect read while it runs is a scaled rect.
    query(host, ".coc-card").style.animation = "none";
    await waitFor(
      () => host.querySelector(".advisor-npc__bubble") !== null,
      `${nodeId}: the advisor speaks`,
    );

    for (let step = 0; step < 40; step += 1) {
      // A figure rather than `.lesson-interactive`, because not every gating widget draws
      // that class; every one of them is framed in a `figure.lesson-visual`.
      const board = host.querySelector("figure.lesson-visual");
      const next = advanceButton(host);
      if (board !== null && next === null) {
        await settle(160);
        return harness;
      }
      if (next === null) {
        throw new Error(
          `${nodeId}: the walk ran out of "Next" without reaching a gated board (step ${step})`,
        );
      }
      next.click();
      await settle(90);
    }
    throw new Error(`${nodeId}: 40 steps in and no gated board`);
  } catch (error) {
    harness.cleanup();
    throw error;
  }
}
