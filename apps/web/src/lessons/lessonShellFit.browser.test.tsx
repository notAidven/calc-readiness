/**
 * **THE LEARNER'S LESSON SHELL HAS TO FIT ON A SHORT REAL SCREEN, AND THE WAY FORWARD HAS TO
 * BE ON IT WHEREVER THE LEARNER IS STANDING.**
 *
 * Nothing in this tree measured the learner `size="large"` mount at a short viewport, which
 * is why a 272px advisor bubble over a 347px well shipped: ten domains arriving on a board
 * with 15px to 116px of it visible, and the earned "Next" scrolled off the top of the well on
 * five of the seven boards a driver could finish. `docs/qa-shell-fit-measurement.md` has the
 * readings. This file is the guard that would have caught it.
 *
 * `lessonPanelSceneFit.browser.test.tsx` arrived on `integration` while this was being
 * written, and it does photograph the learner host at 1024x580 — one node, NUM.S, asking
 * whether a worked example's first step clears the fold. It is the neighbour of this file
 * rather than a duplicate of it: the question here is every domain's tallest GATED board,
 * the advisor's share of the well against it, and whether the way forward travels with the
 * learner. Neither subsumes the other, and this one is deliberately a sweep.
 *
 * ## What a surface must have for this defect to be possible on it
 *
 * Two properties, and BOTH are needed:
 *
 * 1. **A viewport-bounded card.** `.world-scene--large .coc-card` fills the application
 *    viewport, so the well is still a finite band and everything in it competes for the same
 *    pixels. The historical `--full` alias computes `max-height: none`, which is the CSS
 *    distinction named below even though both frames now occupy the same viewport.
 * 2. **The advisor's own control row inside that same well**, i.e. an
 *    `.advisor-npc__controls` competing with a board for the pixels AND carrying the way
 *    forward. A capped card holding one thing has no competition to lose, and a surface whose
 *    advance control lives in its board cannot lose that control by scrolling the board.
 *
 * That is a property of a SURFACE, not of a component, so the population below is every
 * shipped `WorldScene` mount rather than every caller of some module. The Town Hall is the
 * case that makes the distinction bite, and it is also the case that shows why the property
 * has to be the CONTROL ROW rather than the bubble: it mounts the same capped `size="large"`
 * frame, and Review mistakes renders an `AdvisorNpc` there, so a population scoped to
 * "renders a bubble" would have swept it in. It passes that advisor no control callbacks,
 * so there is no `.advisor-npc__controls` on that surface; a populated queue's "Check"
 * belongs to the item itself. Both halves
 * of that reason are asserted at runtime below rather than left as prose, so if the drill
 * ever grows an advisor control row it joins the population instead of quietly not being in
 * it. (`docs/qa-shell-fit-measurement.md` recorded the Town Hall as rendering no bubble at
 * all. That was wrong, and this guard is what caught it.)
 *
 * ## Why the population is derived and then checked for shape
 *
 * `.cursor/rules/qa-verification.mdc`: a derived population can still be the WRONG population,
 * and a floor constrains size rather than shape. So the census below derives every
 * `<WorldScene>` mount from source, asserts the exemption in both directions, and asserts the
 * COMPOSITION of what is left: every capped mount must be classified by hand, with a reason,
 * and every classification must survive a mount of the real surface.
 *
 * ## Viewport
 *
 * 1024x580, named beside every assertion. The quantities are `vh`-denominated, so a frame or
 * a number taken at a comfortable developer viewport says nothing about anybody's screen.
 */

import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { page } from "vitest/browser";
import { stubLessonHost } from "../city/lessonHost";
import { WorldScene, type WorldSceneSize } from "../city/WorldScene";
import { allLessons, LESSON_DOMAINS } from "./domains";
import { ReviewMistakes } from "./ReviewMistakes";
import {
  advanceButton,
  lessonHostContext,
  openLearnerLessonAtGatedBoard,
  probeBoardHeights,
  probeVisualHeight,
  query,
  SHORT_LAPTOP,
  settle,
  tallestFirstGatedBoard,
} from "./shellFit";
import { type Harness, mount, waitFor } from "./testHarness";

import "../styles.css";

let h: Harness | null = null;
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
  h?.cleanup();
  h = null;
});

/* ------------------------------------------------------- the census, from source */

/**
 * Every shipped source. Tests are excluded on purpose: a test that mounts its own frame is
 * measuring something, not shipping a surface a learner can open.
 */
const SHIPPED_SOURCES = import.meta.glob(
  ["../**/*.tsx", "!../**/*.test.tsx", "!../**/*.browser.test.tsx"],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

interface SceneMount {
  file: string;
  line: number;
  size: WorldSceneSize;
  /** The first component the frame wraps: what is competing for the well. */
  child: string | null;
}

/**
 * The opening tag of the JSX element starting at `at`, brace-aware so the `>` of an inline
 * `() => {}` prop is not mistaken for the end of the tag.
 */
function openingTag(source: string, at: number): string {
  let depth = 0;
  for (let i = at; i < source.length; i += 1) {
    const c = source[i];
    if (c === "{") {
      depth += 1;
    } else if (c === "}") {
      depth -= 1;
    } else if (c === ">" && depth === 0) {
      return source.slice(at, i + 1);
    }
  }
  throw new Error(`an unterminated <WorldScene ...> tag at offset ${at}`);
}

function worldSceneMounts(): SceneMount[] {
  const found: SceneMount[] = [];
  for (const [file, source] of Object.entries(SHIPPED_SOURCES)) {
    if (file.endsWith("/WorldScene.tsx")) {
      continue; // the component itself, not a mount of it
    }
    for (let at = source.indexOf("<WorldScene"); at !== -1; ) {
      const tag = openingTag(source, at);
      const body = source.slice(at + tag.length, source.indexOf("</WorldScene>", at));
      found.push({
        file,
        line: source.slice(0, at).split("\n").length,
        // `WorldScene`'s own default when the prop is left off. Read from the component's
        // signature rather than assumed, so a change of default is a failure here.
        size:
          (/\bsize="([a-z]+)"/.exec(tag)?.[1] as WorldSceneSize | undefined) ?? "compact",
        child: /<([A-Z][A-Za-z0-9]*)/.exec(body)?.[1] ?? null,
      });
      at = source.indexOf("<WorldScene", at + tag.length);
    }
  }
  return found;
}

/**
 * The named CSS exception: the `?dev` review frames retain `size="full"` and therefore compute
 * `max-height: none`. `DevLessons.browser.test.tsx` now pins that alias and the learner's
 * `size="large"` frame to the same viewport geometry and reading column.
 *
 * Listed by file with a reason, and asserted BOTH ways below.
 */
const UNCAPPED_BY_DESIGN: Record<string, { mounts: number; why: string }> = {
  "../DevLessons.tsx": {
    mounts: 3,
    why: "the ?dev slide stepper, dev drill and dev lesson retain the historical full alias, with learner-parity geometry guarded in DevLessons.browser.test.tsx",
  },
};

/**
 * Every CAPPED mount, classified by whether the ADVISOR'S OWN CONTROL ROW competes for its
 * well. A mount that appears here without a verdict, or a verdict this file cannot reproduce
 * by mounting the surface, is a failure: see the header for what the two properties are.
 */
const CAPPED_SURFACES: Record<string, { advisorControls: boolean; why: string }> = {
  "../city/d1LessonHost.tsx": {
    advisorControls: true,
    why: "the full-viewport lesson host for all ten domains: its finite well holds the advisor bubble, the advisor's Previous/Next row AND the slide's gated board",
  },
  "../city/CitySurface.tsx": {
    advisorControls: false,
    why: "the Town Hall Review mistakes queue: the same capped frame and an AdvisorNpc, but no advisor control row; its Check belongs to the queued item itself",
  },
  "../demo/PresenterWorkFixture.tsx": {
    advisorControls: false,
    why: "the presenter Photo work feedback surface, a full-viewport work-upload frame that contains no advisor at all, so nothing competes with its board for the well; this mount moved here out of PresenterShell.tsx, whose entry this replaces",
  },
  "../city/lessonHost.tsx": {
    advisorControls: false,
    why: "the MVP stub scene for a node with no authored lesson: full-viewport placeholder prose, no advisor and no board",
  },
};

describe("the census of shipped lesson frames at 1024x580", () => {
  const mounts = worldSceneMounts();
  const uncapped = mounts.filter((m) => m.size === "full");
  const capped = mounts.filter((m) => m.size !== "full");

  test("the sweep found the frames that ship, so nothing below is vacuous", () => {
    // A floor, because every containment claim under it holds trivially over an empty
    // collection. Five is what ships today (three dev, two capped-with-content, one stub);
    // the assertion is that the glob and the parser still resolve to a real tree.
    expect(
      mounts.length,
      "no <WorldScene> mount was found in the shipped sources, so this whole file is measuring nothing",
    ).toBeGreaterThanOrEqual(6);
    expect(uncapped.length, "no uncapped dev frame was found").toBeGreaterThanOrEqual(3);
    expect(capped.length, "no capped frame was found").toBeGreaterThanOrEqual(3);
  });

  test("the uncapped exception fails both ways", () => {
    // Direction one: a listed file that stops qualifying fails, so the list cannot sit there
    // exempting a frame that has quietly become capped.
    // Soft, so one run says everything that is wrong with the list. The two directions fail
    // for different reasons and a hard assertion on the first hides the second.
    for (const [file, entry] of Object.entries(UNCAPPED_BY_DESIGN)) {
      const mine = mounts.filter((m) => m.file === file);
      expect
        .soft(
          mine.length,
          `${file} is a declared exception that no longer mounts a WorldScene at all`,
        )
        .toBe(entry.mounts);
      for (const m of mine) {
        expect
          .soft(
            m.size,
            `${file}:${m.line} is excused from the fit sweep as an uncapped dev frame (${entry.why}), but it mounts size="${m.size}", which IS height-capped and therefore owes the fit`,
          )
          .toBe("full");
      }
    }
    // Direction two: an uncapped frame that is not on the list fails, so a new `full` mount
    // cannot slip out of the population by being uncapped without anyone saying why.
    for (const m of uncapped) {
      expect
        .soft(
          Object.keys(UNCAPPED_BY_DESIGN),
          `${m.file}:${m.line} mounts size="full", lifting the 90vh cap, but no entry explains why that surface is allowed to`,
        )
        .toContain(m.file);
    }
  });

  test("every capped frame is classified, and the classification has both kinds in it", () => {
    const classified = Object.keys(CAPPED_SURFACES);
    for (const m of capped) {
      expect(
        classified,
        `${m.file}:${m.line} mounts a height-capped WorldScene (size="${m.size}") and nothing says whether an advisor bubble competes for its well`,
      ).toContain(m.file);
    }
    for (const file of classified) {
      expect(
        capped.map((m) => m.file),
        `${file} is classified as a capped surface but mounts no capped WorldScene any more`,
      ).toContain(file);
    }
    // Composition, not just size: a classification with no `true` in it would be a sweep over
    // nothing, and one with no `false` in it would mean the structural exclusion below has
    // stopped being tested.
    const withRow = Object.entries(CAPPED_SURFACES).filter(([, c]) => c.advisorControls);
    const without = Object.entries(CAPPED_SURFACES).filter(([, c]) => !c.advisorControls);
    expect(
      withRow.length,
      "no capped surface is in the fit population",
    ).toBeGreaterThanOrEqual(1);
    expect(
      without.length,
      "no capped surface is excluded for lack of an advisor control row, so the structural exclusion is untested",
    ).toBeGreaterThanOrEqual(1);
    // The fit sweep at the bottom of this file opens ONE surface: the in-city lesson host. A
    // second bubble-carrying surface would be in the population and unmeasured, so it fails
    // here rather than passing a sweep that covers one of two.
    expect(
      withRow.map(([file]) => file),
      "a capped surface carries an advisor control row and the fit sweep below does not know how to open it",
    ).toEqual(["../city/d1LessonHost.tsx"]);
    // Disjoint: nothing may be both excused as uncapped and classified as capped.
    for (const file of classified) {
      expect(
        Object.keys(UNCAPPED_BY_DESIGN),
        `${file} is claimed as both an uncapped exception and a capped surface`,
      ).not.toContain(file);
    }
  });

  test("the Town Hall stand-in below is pinned to the mount CitySurface really ships", () => {
    // The fit population is proven by mounting each surface, and the Town Hall's real mount is
    // 4,700 lines into `CitySurface`. The stand-in is therefore held to the source: same frame
    // size, same child. If either moves, the stand-in stops being evidence about the Town Hall.
    const townHall = mounts.filter(
      (m) => m.file === "../city/CitySurface.tsx" && m.child === "ReviewMistakes",
    );
    expect(
      townHall.length,
      "CitySurface no longer mounts ReviewMistakes in a WorldScene, so the stand-in below is a facsimile of nothing",
    ).toBe(1);
    expect(townHall[0]?.size, "the Town Hall frame is no longer size=large").toBe("large");
  });
});

/* -------------------------------------------- proving each classification by mounting it */

const controlsRow = (root: ParentNode) =>
  root.querySelector<HTMLElement>(".advisor-npc__controls");

describe("the classification is what the surfaces actually render", () => {
  test("the in-city lesson host puts an advisor bubble in the capped well", async () => {
    h = await openLearnerLessonAtGatedBoard(firstNodeWithAGatedBoard());
    const host = h.host;
    expect(
      host.querySelector(".advisor-npc__bubble"),
      "d1LessonHost is classified as carrying a bubble and does not",
    ).not.toBeNull();
    expect(
      controlsRow(host),
      "d1LessonHost is classified as carrying the advisor's control row and does not",
    ).not.toBeNull();
  }, 120_000);

  test("Review mistakes renders a bubble but no advisor control row, which is why it is excluded", async () => {
    h = mount(
      <WorldScene
        eyebrow="Town Hall · island hub"
        title="Review mistakes"
        tone="lesson"
        size="large"
        exitLabel="Back to city"
        onExit={() => {}}
      >
        <ReviewMistakes eraId="prehistoric" onExit={() => {}} />
      </WorldScene>,
    );
    const host = h.host;
    await waitFor(
      () => host.querySelector('[data-testid="review-mistakes-empty"]') !== null,
      "the Review mistakes empty state mounts",
    );
    // Both halves of the exclusion, so the reason cannot rot into a true verdict with a false
    // explanation. It DOES mount an advisor (which is why "renders a bubble" is the wrong
    // property to scope a population by) and it offers no advisor control row.
    expect(
      host.querySelector(".advisor-npc__bubble"),
      "the Town Hall no longer mounts an AdvisorNpc at all, so the reason recorded for excluding it has stopped describing it",
    ).not.toBeNull();
    expect(
      controlsRow(host),
      "the Town Hall is excluded from the fit population because the drill offers no advisor control row, and it now offers one: it belongs in the population",
    ).toBeNull();
  }, 120_000);

  test("the stub lesson scene renders no advisor at all", async () => {
    h = mount(stubLessonHost.render(lessonHostContext("NOT.A.NODE")));
    const host = h.host;
    await waitFor(() => host.querySelector(".coc-card") !== null, "the stub card mounts");
    expect(
      host.querySelector(".advisor-npc__bubble"),
      "the stub scene is excluded for having no advisor, and it now has one",
    ).toBeNull();
    expect(
      controlsRow(host),
      "the stub scene is excluded for having no advisor control row, and it now has one",
    ).toBeNull();
  }, 60_000);
});

function firstNodeWithAGatedBoard(): string {
  const lesson = allLessons.find((l) => (l.visuals ?? []).some((v) => v.gates));
  if (!lesson) {
    throw new Error("no lesson gates a board at all");
  }
  return lesson.node_id;
}

/* ------------------------------------------------------------------- the fit itself */

/**
 * How much of the board a learner must be able to SEE on arrival, after the advisor has taken
 * its share and the pinned control row has taken its overlay. Not "the board fits": the
 * content is 590px to 1067px against a well in the 300s, and no chrome trim closes that. This
 * is the floor at which a learner can tell there is a widget there and start working it.
 * Measured before the fix, D4/POL.4 gave 15.0px and D9/TRG.3 gave 34.8px.
 */
const BOARD_CLEAR_FLOOR = 96;

/**
 * The share of the well the advisor may take. Measured before the fix: 55% (D1) to 82% (D4),
 * i.e. the teaching text was routinely worth more of the screen than the thing being taught.
 */
const BUBBLE_SHARE_CEILING = 0.5;

interface Fit {
  domain: string;
  node: string;
  viewport: string;
  frameClasses: string;
  cardMaxHeight: string;
  cardHeight: number;
  bodyUsable: number;
  bubble: number;
  bubbleShare: number;
  boardClearAtArrival: number;
  rowVisibleAtArrival: boolean;
  rowVisibleAtBoardBottom: boolean;
  rowTopAtBoardBottom: number;
  nextIsInTheRow: boolean;
}

const round = (n: number) => Math.round(n * 10) / 10;

function within(box: DOMRect, frame: DOMRect): boolean {
  return (
    box.top >= Math.max(0, frame.top) - 1 &&
    box.bottom <= Math.min(window.innerHeight, frame.bottom) + 1
  );
}

async function readFit(domainId: string): Promise<Fit> {
  const probe = await tallestFirstGatedBoard(domainId);
  h = await openLearnerLessonAtGatedBoard(probe.node);
  const host = h.host;
  await document.fonts.ready;
  await settle(280);

  const scene = query(host, ".world-scene");
  const card = query<HTMLElement>(host, ".coc-card");
  const body = query<HTMLElement>(host, ".coc-card__body");
  const bubble = query<HTMLElement>(host, ".advisor-npc__bubble");
  const row = controlsRow(host);
  if (row === null) {
    throw new Error(`${probe.node}: the advisor offers no control row to measure`);
  }
  const figures = Array.from(host.querySelectorAll<HTMLElement>("figure.lesson-visual"));
  const bodyBox = body.getBoundingClientRect();
  const rowBox = row.getBoundingClientRect();
  const boardTop = Math.max(
    Math.min(...figures.map((f) => f.getBoundingClientRect().top)),
    bodyBox.top,
  );
  // The pinned row eats the bottom of the board only where it SITS over the board. Before the
  // fix it sits above the board, inside the bubble, and takes nothing from it.
  const boardFloor =
    rowBox.top > boardTop ? Math.min(bodyBox.bottom, rowBox.top) : bodyBox.bottom;

  const fit: Fit = {
    domain: domainId,
    node: probe.node,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    frameClasses: scene.className,
    cardMaxHeight: getComputedStyle(card).maxHeight,
    cardHeight: round(card.getBoundingClientRect().height),
    bodyUsable: round(body.clientHeight),
    bubble: round(bubble.getBoundingClientRect().height),
    bubbleShare:
      round((bubble.getBoundingClientRect().height / body.clientHeight) * 100) / 100,
    boardClearAtArrival: round(boardFloor - boardTop),
    rowVisibleAtArrival: within(rowBox, bodyBox),
    rowVisibleAtBoardBottom: false,
    rowTopAtBoardBottom: Number.NaN,
    nextIsInTheRow: false,
  };

  // Where the learner has to be to work the board, and whether the way forward came with them.
  body.scrollTop = body.scrollHeight;
  await settle(160);
  const rowAtBottom = controlsRow(host)?.getBoundingClientRect();
  fit.rowTopAtBoardBottom = round(rowAtBottom?.top ?? Number.NaN);
  fit.rowVisibleAtBoardBottom =
    rowAtBottom !== undefined && within(rowAtBottom, body.getBoundingClientRect());

  // The contract `city/lessonMountSteps.test.tsx:152-154` queries through, read off the
  // learner's own mount instead of assumed. It has to be read a step BACK from here: this
  // slide's gate is closed, so `AdvisorLesson` withholds `onNext` and there is no "Next" in
  // the DOM to locate. Measured last, because it moves the surface everything above was read
  // from.
  const previous = host.querySelector<HTMLButtonElement>(".advisor-npc__action--prev");
  if (previous !== null && !previous.disabled) {
    previous.click();
    await settle(200);
  }
  const next = advanceButton(host);
  fit.nextIsInTheRow = next !== null && next.closest(".advisor-npc__controls") !== null;
  return fit;
}

describe("the in-city lesson host, on each domain's tallest first-gated board", () => {
  test.each(LESSON_DOMAINS.map((d) => d.id))(
    "%s: the learner can see the board and reach the way forward at 1024x580",
    async (domainId) => {
      const fit = await readFit(domainId);

      // The surface has to be the shipped one or none of the rest is about anything.
      expect(fit.viewport, "these readings are not from a 1024x580 screen").toBe(
        "1024x580",
      );
      expect(fit.frameClasses, "not the learner frame").toContain("world-scene--large");
      expect(
        fit.frameClasses,
        "this is the ?dev frame, whose max-height: none lifts the cap being measured",
      ).not.toContain("world-scene--full");
      // The CAP, not a number for it. It was `522px` (90vh) when this was written and is
      // `calc(100vh - 16px)` since `lessonPanelSceneFit`'s sibling fix handed back the scrim
      // gutter, and pinning either would have been pinning a constant two people were moving.
      // What has to hold is that a cap is in force at all — `none` is the `?dev` frame — and
      // that the card is inside the screen, which is the thing the cap is FOR.
      expect(
        fit.cardMaxHeight,
        "this mount is uncapped, so it is the dev frame rather than the learner's",
      ).not.toBe("none");
      expect(
        fit.cardHeight,
        `the card is ${fit.cardHeight}px on a ${SHORT_LAPTOP.height}px screen, so the cap is not holding it`,
      ).toBeLessThanOrEqual(SHORT_LAPTOP.height);

      // Soft, so one run reports every way a surface fails rather than the first. A board
      // can lose the way forward AND be invisible AND be crowded out, and reading those one
      // re-run at a time is how a fix gets called finished while two of the three stand.
      expect
        .soft(
          fit.rowVisibleAtBoardBottom,
          `${fit.node}: scrolled to the bottom of the board, where finishing it leaves the learner, the advisor's control row is at y ${fit.rowTopAtBoardBottom} at 1024x580 and is not on screen, so the way forward is not where the learner is standing`,
        )
        .toBe(true);

      expect
        .soft(
          fit.rowVisibleAtArrival,
          `${fit.node}: the advisor's control row is off screen on arrival at 1024x580`,
        )
        .toBe(true);

      expect
        .soft(
          fit.boardClearAtArrival,
          `${fit.node}: a learner arriving on this board can see ${fit.boardClearAtArrival}px of it at 1024x580, which is not enough to tell there is a widget there`,
        )
        .toBeGreaterThanOrEqual(BOARD_CLEAR_FLOOR);

      expect
        .soft(
          fit.bubbleShare,
          `${fit.node}: the advisor bubble is ${fit.bubble}px of a ${fit.bodyUsable}px well at 1024x580, so the teaching text is worth more of the screen than the board it is teaching`,
        )
        .toBeLessThanOrEqual(BUBBLE_SHARE_CEILING);

      // The contract `city/lessonMountSteps.test.tsx` queries through: whatever else moves,
      // "Next" stays a descendant of `.advisor-npc__controls`.
      expect(
        fit.nextIsInTheRow,
        `${fit.node}: stepping back to a slide that offers it, "Next" is not inside .advisor-npc__controls`,
      ).toBe(true);
    },
    240_000,
  );
});

/* ------------------------------------------------ the board FITS the well, not just clears */

/**
 * **A LEARNER SHOULD NOT HAVE TO SCROLL BETWEEN THE GRAPH AND THE BUTTON THAT MOVES IT.**
 *
 * {@link BOARD_CLEAR_FLOOR} above is a different and weaker property: it asks how much of the
 * board is on screen at ARRIVAL, in the band left under the advisor bubble, and 96px is the
 * floor at which a learner can tell there is a widget there at all. It was written when the
 * content was 590px to 1067px against a well in the 300s and no chrome trim could close that
 * gap, so it deliberately does not ask for the whole board.
 *
 * This asks for the whole board, because the gap is closable now. `WidgetBeside` puts a
 * widget's controls in the ~422px of horizontal room beside its graph instead of underneath
 * it, so a board that was 649px stacked is 394px side by side, and the well is 431px. The
 * defect this is the guard for is exactly the one that reads as a nuisance rather than a
 * failure: everything is reachable, and working the board means scrolling down to press a
 * button and back up to see what the press did.
 *
 * ## The well is measured, not quoted
 *
 * `.cursor/rules/qa-verification.mdc`: *"a figure in a rule is a measurement of a tree at a
 * SHA, and the tree moves"*. That warning is about this exact number, which has been 347, then
 * 300 on two packs, then 369, then 411 inside a week. So the axis below is `bodyUsable` read
 * off a real learner mount at 1024x580, and {@link WELL_WHEN_WRITTEN} is only the cross-check
 * that the surface has not moved out from under the two lists.
 *
 * ## The population, and why it is measured bare
 *
 * Every lesson's first gated board, from `shellFit`'s own derivation, which is the same
 * population `readFit` picks each domain's representative out of. The heights are natural
 * heights in the 920px reading column — what the board WANTS — rather than what survives a
 * scroll, because "fits" is a claim about the board's own size against the well's.
 *
 * The four boards of LF.1 are swept separately at the bottom, by id. They have to be: the
 * learner walk cannot pass a gate, so a lesson's later gated slides are outside every
 * derivation here, and the board this layout was reported against is LF.1's SECOND.
 */

/**
 * The well at 1024x580 when the two lists below were written, as a cross-check on the
 * measurement rather than as the axis. Measured flat at 431 across all ten packs, with the
 * banner flat at 79 — the title-wrap variance `docs/qa-shell-fit-measurement.md` recorded (300px
 * on POL.4 and one other) is gone, since the short-screen block clamps the banner title now.
 */
const WELL_WHEN_WRITTEN = 431;

/**
 * The boards this branch swept onto `WidgetBeside`. Each one must now FIT.
 *
 * Sixteen nodes rather than the ten the brief started from, and the difference is the finding:
 * "each domain's tallest first-gated board" is a moving target, because fixing a domain's
 * tallest promotes the next one. `tallestFirstGatedBoard` gave five domains a different answer
 * after the first six conversions than before them. So the property worth guarding is over the
 * POPULATION and not over its maximum, and this list is what the population's overflowing tail
 * used to be.
 */
const FIT_OWED: readonly string[] = [
  "POL.4",
  "RAT.5",
  "RAT.6",
  "CG.1",
  "FUN.4",
  "FUN.5",
  "FUN.6",
  "FUN.9",
  "FUN.10",
  "LF.2",
  "LF.4",
  "EL.4",
  "TRG.3",
  "TRG.5",
  "TRG.6",
  "TRG.8",
];

/**
 * The boards still over the well, each with what it measured and why it was not swept.
 *
 * Asserted in BOTH directions below, which is what stops this becoming a permanent exemption
 * by neglect: an entry that starts fitting fails, so the list cannot go on excusing something
 * it has stopped describing, and an entry whose node has gone fails rather than sitting here
 * excusing nothing.
 */
const NOT_YET_SWEPT: readonly { node: string; was: number; why: string }[] = [
  {
    node: "NUM.2",
    was: 576.9,
    why: "its first gated slide mounts TWO figures, pemdas-key-explore over pemdas-mnemonic-explore, and each of them fits the well on its own (244.3 and 332.6). Nothing a widget can do to its own internal layout adds up two boards, so this is a slide-authoring question and not one this primitive can answer",
  },
  {
    node: "EL.1",
    was: 433,
    why: "2px over, and its markup is not its own: exp-growth-table is a data wrapper around the FillTable kind, which 25 widgets share. A 25-board layout change to buy 2px is the wrong trade to make inside this branch",
  },
  {
    node: "TRG.9",
    was: 431.8,
    why: "0.8px over, and the same shape of reason: trg-combine-estimate is a wrapper around the EstimateThenCheck kind, shared by six widgets",
  },
];

/** LF.1's own four boards, which no first-gated derivation can see past its slide 0. */
const LF1_BOARDS: readonly { id: string; was: number }[] = [
  { id: "linear-slope-ratio-table", was: 359.2 },
  { id: "linear-slope-triangle-play", was: 649.4 },
  { id: "linear-slope-direction-classify", was: 500.2 },
  { id: "linear-slope-walkthrough", was: 733.3 },
];

/**
 * The one of LF.1's four that does not fit the BAND, with the reason, asserted both ways
 * below. Same shape of reason as EL.1's: the markup is not its own.
 */
const LF1_OVER_BAND: readonly { id: string; was: number; why: string }[] = [
  {
    id: "linear-slope-ratio-table",
    was: 359.2,
    why: "9.2px over, and it is a data wrapper around the FillTable kind that 25 widgets share, so there is no figure column here to narrow and no per-board change that does not change 25 boards",
  },
];

describe("every first-gated board fits the learner's well at 1024x580", () => {
  test("the lists are disjoint and neither has swallowed the population", () => {
    const owed = new Set(FIT_OWED);
    for (const entry of NOT_YET_SWEPT) {
      expect(
        owed.has(entry.node),
        `${entry.node} is claimed both as swept and as not yet swept`,
      ).toBe(false);
    }
    expect(new Set(FIT_OWED).size, "FIT_OWED repeats a node").toBe(FIT_OWED.length);
    expect(
      new Set(NOT_YET_SWEPT.map((e) => e.node)).size,
      "NOT_YET_SWEPT repeats a node",
    ).toBe(NOT_YET_SWEPT.length);
    // A floor under the swept list, because every claim made over it holds trivially if it
    // empties out. Sixteen is what this branch swept; it is not a ceiling.
    expect(
      FIT_OWED.length,
      "the swept list has shrunk, so this sweep is guarding less than the branch fixed",
    ).toBeGreaterThanOrEqual(16);
    // And a CEILING on the excuses, since a floor constrains size and not shape: three boards
    // may sit outside the property, and a fourth is a decision somebody has to make out loud.
    expect(
      NOT_YET_SWEPT.length,
      "more boards are excused from the fit than were excused when this was written",
    ).toBeLessThanOrEqual(3);
    // Composition, not just size: the swept set has to reach past the one domain the defect
    // was reported on, or "swept" has narrowed back to the lane a QA pass had open.
    const domains = new Set(FIT_OWED.map((node) => node.split(".")[0]));
    expect(
      domains.size,
      `the swept boards come from only ${domains.size} lesson families, so this is one domain's fix wearing a sweep's clothes`,
    ).toBeGreaterThanOrEqual(6);
  });

  test("no board a learner meets first is taller than the well, unless it is named", async () => {
    // THE AXIS, off a real learner mount rather than out of this file. `.cursor/rules/
    // qa-verification.mdc` is explicit that a well is a measurement at a SHA: it has been
    // 347, 300, 369 and 411 inside one week, in two lanes at once.
    h = await openLearnerLessonAtGatedBoard(firstNodeWithAGatedBoard());
    await document.fonts.ready;
    await settle(200);
    const well = round(query<HTMLElement>(h.host, ".coc-card__body").clientHeight);
    h.cleanup();
    h = null;

    expect(window.innerHeight, "these readings are not from a 580px-tall screen").toBe(
      SHORT_LAPTOP.height,
    );
    expect(
      well,
      `the learner's well measures ${well}px and the two lists below were written against ${WELL_WHEN_WRITTEN}px, so the surface has moved and every entry needs re-reading rather than re-baselining`,
    ).toBeCloseTo(WELL_WHEN_WRITTEN, -1);

    const probes = await probeBoardHeights();
    const measured = new Map(probes.map((p) => [p.node, p]));
    // A floor, because every containment claim below holds for free over an empty probe.
    expect(
      probes.length,
      "no first-gated board was probed at all, so this sweep is measuring nothing",
    ).toBeGreaterThanOrEqual(50);

    const excused = new Map(NOT_YET_SWEPT.map((e) => [e.node, e]));

    // Soft throughout, so one run says everything that is wrong rather than the first thing.
    for (const probe of probes) {
      if (excused.has(probe.node)) {
        continue;
      }
      expect
        .soft(
          probe.height,
          `${probe.node}: the first board a learner meets there is ${probe.height}px against a ${well}px well at 1024x580, so working it means scrolling between the figure and the controls. Its board is ${probe.ids.join(" + ")}`,
        )
        .toBeLessThanOrEqual(well);
    }

    // Direction one on the swept list: a board it names must still exist, and must fit.
    for (const node of FIT_OWED) {
      const probe = measured.get(node);
      expect
        .soft(
          probe,
          `${node} is listed as swept onto WidgetBeside and no longer offers a first-gated board to measure`,
        )
        .toBeDefined();
      if (probe) {
        expect
          .soft(
            probe.height,
            `${node} was swept onto WidgetBeside and is ${probe.height}px again against a ${well}px well: the board (${probe.ids.join(" + ")}) has gone back to stacking its controls under its figure`,
          )
          .toBeLessThanOrEqual(well);
      }
    }

    // Both directions on the excuses. One: the node still exists.
    for (const entry of NOT_YET_SWEPT) {
      const probe = measured.get(entry.node);
      expect
        .soft(
          probe,
          `${entry.node} is a declared exception that no longer offers a first-gated board, so it is excusing nothing`,
        )
        .toBeDefined();
      // Two: it is still over. A board that has started fitting while still listed means the
      // list has stopped describing the tree, and leaving it would hide the next regression
      // of that same board behind an excuse nobody re-read.
      if (probe) {
        expect
          .soft(
            probe.height,
            `${entry.node} is excused from the fit at ${entry.was}px (${entry.why}) and now measures ${probe.height}px, which FITS the ${well}px well: take it off the list and let the sweep hold it`,
          )
          .toBeGreaterThan(well);
      }
    }
  }, 600_000);

  test("LF.1's four boards fit, including the three no first-gated derivation can reach", async () => {
    h = await openLearnerLessonAtGatedBoard(firstNodeWithAGatedBoard());
    await document.fonts.ready;
    await settle(200);
    const well = round(query<HTMLElement>(h.host, ".coc-card__body").clientHeight);
    h.cleanup();
    h = null;

    for (const board of LF1_BOARDS) {
      const height = await probeVisualHeight(board.id);
      // A floor under each reading: a board that failed to mount measures nothing, and
      // "nothing fits" is the pass this whole file exists to refuse.
      expect
        .soft(
          height,
          `${board.id} measured ${height}px, so it did not lay out and the comparison below is over nothing`,
        )
        .toBeGreaterThan(100);
      expect
        .soft(
          height,
          `${board.id} is ${height}px against a ${well}px well at 1024x580 (it was ${board.was}px before this layout), so LF.1 still makes a learner scroll between the graph and the controls`,
        )
        .toBeLessThanOrEqual(well);
    }
  }, 300_000);
});

/* ------------------------------- the board fits the band a learner can SEE, not just the well */

/**
 * **THE WELL IS NOT THE ROOM. THE PINNED WAY FORWARD OWNS THE FOOT OF IT AT EVERY SCROLL
 * POSITION.**
 *
 * The sweep above compares a board against `.coc-card__body`'s `clientHeight`, and green there
 * was read as "the learner can see the board". It is not the same claim, and the frames are
 * what showed the difference: POL.4 reported 334.4px against a 431px well with its dashed drop
 * slot sliced in half by the card's edge, and CG.1 reported 397.1px with the -4 row of its grid
 * at the cut and the grid continuing below it.
 *
 * Measured rather than argued, on the learner mount at 1024x580 (`besideClipProbe`, since
 * deleted; the numbers are reproduced by {@link readWellAndBand}): the body runs 79..510, so
 * the well is the 431px the sweep uses. `.advisor-lesson > .advisor-npc__controls` is
 * `position: sticky; bottom: 0` INSIDE that scrollport, 65px tall, and its top sits at 429 at
 * every scroll position. So the room a board has is **350px**, and 81px of the well is a bar
 * the board can only ever pass behind.
 *
 * The diagnosis behind that is worth keeping, because the two answers wanted different fixes:
 * the cut is a SCROLL POSITION and not a clip. Nothing is painted into a box that will never
 * show it — `overflow: hidden auto` means every one of these boards is reachable, and the board
 * a learner arrives on starts at y 273.4 under a 162.4px advisor bubble, which is why the first
 * frame of one is always cut. But for five of the sixteen there was NO scroll position that
 * showed the board whole, because the board was taller than the band: scrolled until its bottom
 * met the pinned row, CG.1 lost 47.6px off the top, EL.4 59.6, TRG.3 68.6, TRG.5 8.6 and TRG.6
 * 3.6. That is the defect, and it is the one a 431px axis cannot see.
 *
 * ## What this asserts, and what it does not
 *
 * The band property is TRUE of the boards this branch swept and FALSE of 16 boards it did not.
 * Both are asserted, in both directions: {@link BAND_OWED} must fit, {@link OVER_BAND_UNSWEPT}
 * must still be over the band AND still inside the well (which is what distinguishes it from
 * {@link NOT_YET_SWEPT}), and anything else that goes over the band fails without being named.
 */

const BAND_WHEN_WRITTEN = 350;

interface WellAndBand {
  well: number;
  band: number;
  rowPosition: string;
  rowBottom: string;
  rowHeight: number;
}

/**
 * The well and the band off a real learner mount, plus the two properties of the control row
 * that are the REASON the band is smaller than the well. A row that stopped being pinned would
 * hand the band back, and this file should say so rather than go on subtracting it.
 */
async function readWellAndBand(): Promise<WellAndBand> {
  const harness = await openLearnerLessonAtGatedBoard(firstNodeWithAGatedBoard());
  try {
    await document.fonts.ready;
    await settle(220);
    const body = query<HTMLElement>(harness.host, ".coc-card__body");
    const row = query<HTMLElement>(harness.host, ".advisor-npc__controls");
    const style = getComputedStyle(row);
    const bodyBox = body.getBoundingClientRect();
    const rowBox = row.getBoundingClientRect();
    return {
      well: round(body.clientHeight),
      band: round(Math.min(bodyBox.bottom, rowBox.top) - bodyBox.top),
      rowPosition: style.position,
      rowBottom: style.bottom,
      rowHeight: round(rowBox.height),
    };
  } finally {
    harness.cleanup();
  }
}

/**
 * The boards owed the band: the sixteen {@link FIT_OWED} names plus LF.1's three that no
 * first-gated derivation reaches. Kept as a derivation of `FIT_OWED` rather than a second
 * hand-written list, so the two cannot come apart.
 */
const BAND_OWED: readonly string[] = FIT_OWED;

/**
 * Population members that clear the WELL and not the BAND, each with its measurement.
 *
 * The shared reason, stated once rather than sixteen times: this branch's population was the
 * boards over the WELL, which is the defect it was opened for, and the band is a finding it
 * made on the way. These sixteen were never in it. They are named rather than left out, because
 * a board that does not fit the band and a board that quietly stopped fitting it look identical
 * from outside this list.
 *
 * Where a board's reason is more than "not swept", it says so: a wrapper around a shared
 * `kinds/` archetype has no figure column of its own to narrow, and narrowing the archetype
 * would move every board built on it.
 */
const OVER_BAND_UNSWEPT: readonly { node: string; was: number; why: string }[] = [
  { node: "EL.2", was: 412, why: "exp-graph-play, bespoke, not swept" },
  {
    node: "TRG.4",
    was: 409.5,
    why: "trg-six-table wraps the FillTable kind, shared by 25 widgets",
  },
  { node: "FUN.3", was: 405.7, why: "piecewise-piece-classify, bespoke, not swept" },
  { node: "RAT.4", was: 402.2, why: "rational-nested-bar-play, bespoke, not swept" },
  { node: "RAD.4", was: 389.2, why: "magnitude-root-play, bespoke, not swept" },
  { node: "LIN.4", was: 386.7, why: "inequality-endpoint-drag, bespoke, not swept" },
  { node: "EL.6", was: 385.4, why: "equation-same-base-stepper, bespoke, not swept" },
  { node: "GEO.2", was: 377, why: "geo-paving-classify, bespoke, not swept" },
  { node: "LIN.1", was: 370, why: "balance-beam-slider, bespoke, not swept" },
  {
    node: "TRG.1",
    was: 364.4,
    why: "trg-bearing-table wraps the FillTable kind, shared by 25 widgets",
  },
  {
    node: "LIN.3",
    was: 363,
    why: "formula-target-match wraps the MatchPairs kind, shared by 14 widgets",
  },
  {
    node: "LF.1",
    was: 359.2,
    why: "linear-slope-ratio-table wraps the FillTable kind, shared by 25 widgets. Its LATER three boards are swept and do fit the band; see LF1_OVER_BAND",
  },
  { node: "FUN.8", was: 356.5, why: "inverse-reverse-play, bespoke, not swept" },
  { node: "RAT.2", was: 354.7, why: "rational-scale-cancel-play, bespoke, not swept" },
  { node: "RAD.3", was: 353.5, why: "rational-exponent-play, bespoke, not swept" },
  { node: "FUN.1", was: 350.9, why: "function-machine-solver, bespoke, not swept" },
];

describe("every swept board fits the band the pinned control row leaves", () => {
  test("the band is the well less the pinned row, and the row is why", async () => {
    const read = await readWellAndBand();

    // The PREMISE. The band is smaller than the well because the way forward is pinned over
    // the foot of it; unpin the row and this whole section is subtracting a bar that is not
    // there. Read off the surface rather than asserted in prose.
    expect
      .soft(
        read.rowPosition,
        `the advisor's control row is position: ${read.rowPosition} on the learner mount, not sticky, so it no longer sits over the foot of the well and the band below is subtracting nothing`,
      )
      .toBe("sticky");
    expect
      .soft(
        read.rowBottom,
        `the advisor's control row is pinned at bottom: ${read.rowBottom}, not 0, so where it sits over the board is no longer the foot of the scrollport`,
      )
      .toBe("0px");
    expect
      .soft(
        read.band,
        `the band and the well both measure ${read.band}px, so the pinned row is costing the board nothing and one of the two numbers in this file is wrong`,
      )
      .toBeLessThan(read.well);
    // A cross-check, not the axis: every assertion below reads the band live. `.cursor/rules/
    // qa-verification.mdc` on why a constant here is a measurement at a SHA.
    expect(
      read.band,
      `the band a learner can see measures ${read.band}px against the ${BAND_WHEN_WRITTEN}px the lists below were written for (well ${read.well}px, row ${read.rowHeight}px): the surface has moved, so re-read the entries rather than re-baselining the number`,
    ).toBeCloseTo(BAND_WHEN_WRITTEN, -1);
  }, 120_000);

  test("the two band lists are disjoint from each other and from the well's excuses", () => {
    const owed = new Set(BAND_OWED);
    for (const entry of OVER_BAND_UNSWEPT) {
      expect(
        owed.has(entry.node),
        `${entry.node} is claimed both as fitting the band and as over it`,
      ).toBe(false);
    }
    expect(
      new Set(OVER_BAND_UNSWEPT.map((e) => e.node)).size,
      "OVER_BAND_UNSWEPT repeats a node",
    ).toBe(OVER_BAND_UNSWEPT.length);
    // NOT_YET_SWEPT's three are over the WELL and so over the band as well. They are excused
    // once, there, and must not be excused twice.
    for (const entry of NOT_YET_SWEPT) {
      expect(
        OVER_BAND_UNSWEPT.map((e) => e.node),
        `${entry.node} is excused from the well AND listed again as over the band; one excuse per board, or removing it from one list leaves it silently excused by the other`,
      ).not.toContain(entry.node);
    }
    // A floor under the owed set and a CEILING on the excuses, because a floor constrains size
    // and not shape: sixteen boards may sit outside the band property, and a seventeenth is a
    // decision somebody has to make out loud.
    expect(
      BAND_OWED.length,
      "the band-owed list has shrunk, so this is guarding less than the branch fixed",
    ).toBeGreaterThanOrEqual(16);
    expect(
      OVER_BAND_UNSWEPT.length,
      "more boards are excused from the band than were excused when this was written",
    ).toBeLessThanOrEqual(16);
  });

  test("no board a learner meets first is taller than the band, unless it is named", async () => {
    const { well, band } = await readWellAndBand();
    expect(window.innerHeight, "these readings are not from a 580px-tall screen").toBe(
      SHORT_LAPTOP.height,
    );

    const probes = await probeBoardHeights();
    const measured = new Map(probes.map((p) => [p.node, p]));
    expect(
      probes.length,
      "no first-gated board was probed at all, so this sweep is measuring nothing",
    ).toBeGreaterThanOrEqual(50);

    const excused = new Set([
      ...OVER_BAND_UNSWEPT.map((e) => e.node),
      ...NOT_YET_SWEPT.map((e) => e.node),
    ]);

    // Soft throughout, so one run says everything that is wrong rather than the first thing.
    for (const probe of probes) {
      if (excused.has(probe.node)) {
        continue;
      }
      expect
        .soft(
          probe.height,
          `${probe.node}: the first board a learner meets there is ${probe.height}px against the ${band}px a learner can SEE at 1024x580 (the ${well}px well less the pinned control row), so there is no scroll position that shows the whole board. Its board is ${probe.ids.join(" + ")}`,
        )
        .toBeLessThanOrEqual(band);
    }

    // Direction one on the owed list, by name, so a regression reports the board rather than
    // just a number: each must still exist and must still fit.
    for (const node of BAND_OWED) {
      const probe = measured.get(node);
      expect
        .soft(
          probe,
          `${node} is owed the band and no longer offers a first-gated board to measure`,
        )
        .toBeDefined();
      if (probe) {
        expect
          .soft(
            probe.height,
            `${node} was brought inside the band and is ${probe.height}px against ${band}px again: no scroll position shows the whole of ${probe.ids.join(" + ")}`,
          )
          .toBeLessThanOrEqual(band);
      }
    }

    // Both directions on the excuses. One: the node still exists.
    for (const entry of OVER_BAND_UNSWEPT) {
      const probe = measured.get(entry.node);
      expect
        .soft(
          probe,
          `${entry.node} is excused from the band and no longer offers a first-gated board, so it is excusing nothing`,
        )
        .toBeDefined();
      if (!probe) {
        continue;
      }
      // Two: it is still over the band. A board that has started fitting while still listed
      // means the list has stopped describing the tree, and leaving it there would hide the
      // next regression of that same board behind an excuse nobody re-read.
      expect
        .soft(
          probe.height,
          `${entry.node} is excused from the band at ${entry.was}px (${entry.why}) and now measures ${probe.height}px, which FITS the ${band}px band: take it off the list and let the sweep hold it`,
        )
        .toBeGreaterThan(band);
      // Three: it is still inside the WELL, which is the whole of what makes it a band
      // exception rather than a well exception. A board that grows past the well belongs in
      // NOT_YET_SWEPT, where the reason it carries is a different reason.
      expect
        .soft(
          probe.height,
          `${entry.node} is listed as clearing the well and missing only the band, and it now measures ${probe.height}px against a ${well}px well: it is over BOTH and its excuse no longer describes it`,
        )
        .toBeLessThanOrEqual(well);
    }
  }, 600_000);

  test("LF.1's four against the band, and the one that is named", async () => {
    const { well, band } = await readWellAndBand();
    const overBand = new Map(LF1_OVER_BAND.map((e) => [e.id, e]));

    for (const entry of LF1_OVER_BAND) {
      expect(
        LF1_BOARDS.map((b) => b.id),
        `${entry.id} is excused from the band and is not one of LF.1's boards any more`,
      ).toContain(entry.id);
    }
    expect(
      LF1_OVER_BAND.length,
      "more of LF.1's four are excused from the band than when this was written",
    ).toBeLessThanOrEqual(1);

    for (const board of LF1_BOARDS) {
      const height = await probeVisualHeight(board.id);
      expect
        .soft(
          height,
          `${board.id} measured ${height}px, so it did not lay out and the comparison below is over nothing`,
        )
        .toBeGreaterThan(100);
      const excuse = overBand.get(board.id);
      if (excuse) {
        // Both ways, as above: a named board that starts fitting fails, and one that grows
        // past the well fails, because either way the excuse has stopped describing it.
        expect
          .soft(
            height,
            `${board.id} is excused from the band at ${excuse.was}px (${excuse.why}) and now measures ${height}px, which FITS the ${band}px band: take it off the list`,
          )
          .toBeGreaterThan(band);
        expect
          .soft(
            height,
            `${board.id} is excused from the band only, and now measures ${height}px against a ${well}px well: it is over both`,
          )
          .toBeLessThanOrEqual(well);
        continue;
      }
      expect
        .soft(
          height,
          `${board.id} is ${height}px against the ${band}px a learner can see at 1024x580 (it was ${board.was}px before this layout), so no scroll position shows the whole of LF.1's board`,
        )
        .toBeLessThanOrEqual(band);
    }
  }, 300_000);
});

/* ------------------------------------------ what a HEIGHT-keyed trim may not touch */

/**
 * The trim that buys the well its pixels is keyed on `max-height`, and a short screen is not a
 * narrow one. Written with `padding` shorthand it also rewrote the INLINE padding, overwriting
 * the `max-width: 720px` phone gutters by source order and narrowing a 390px reading column by
 * 24px. Nothing in the fit numbers above can see that: they are all read at 1024, where the
 * inline value happened to be unchanged. `d6Fun4AxisAndProse.browser.test.tsx` caught it in CI
 * instead, on a rewrapped sentence, one viewport away from being caught by nobody — its
 * viewport is 390x580, so it is width-pinned AND short, which is the only pairing that sees
 * this.
 *
 * So the invariant, stated where the trim lives: at a fixed WIDTH, moving only the HEIGHT
 * across the breakpoint moves no horizontal measurement of the lesson column. Two heights
 * either side of `700px`, one width, everything else equal.
 */
describe("the short-screen trim is keyed on height, so it moves nothing width-pinned", () => {
  const PHONE_WIDTH = 390;
  const SHORT = 580;
  const TALL = 844;

  async function readColumn(height: number): Promise<{
    paddingInline: string;
    cardWidth: number;
    bodyClientWidth: number;
    bodyContentWidth: number;
    columnWidth: number;
  }> {
    await page.viewport(PHONE_WIDTH, height);
    h = mount(
      <WorldScene
        eyebrow="NUM.1 - dev"
        title="Fractions and decimals"
        onExit={() => {}}
        size="large"
      >
        <p className="lesson-prose">
          the reading column, at the width the width rules give it
        </p>
      </WorldScene>,
    );
    await settle(120);
    // `.coc-card`'s pop-in animates `transform: scale`, and a scaled box measures scaled: read
    // mid-animation the same card was 308.6px wide at one height and 372.7px at the other,
    // which is the animation rather than the stylesheet.
    query<HTMLElement>(h.host, ".coc-card").style.animation = "none";
    await settle(60);
    const body = query<HTMLElement>(h.host, ".coc-card__body");
    const column = query<HTMLElement>(h.host, ".lesson-prose");
    const style = getComputedStyle(body);
    const reading = {
      paddingInline: `${style.paddingLeft}/${style.paddingRight}`,
      cardWidth: round(
        query<HTMLElement>(h.host, ".coc-card").getBoundingClientRect().width,
      ),
      bodyClientWidth: round(body.clientWidth),
      bodyContentWidth: round(
        body.clientWidth -
          Number.parseFloat(style.paddingLeft) -
          Number.parseFloat(style.paddingRight),
      ),
      columnWidth: round(column.getBoundingClientRect().width),
    };
    h.cleanup();
    h = null;
    return reading;
  }

  test(`390x${SHORT} reads the same across the well as 390x${TALL}`, async () => {
    const short = await readColumn(SHORT);
    const tall = await readColumn(TALL);

    // A floor under the comparison: two equal readings of zero would satisfy it for free.
    expect(
      tall.columnWidth,
      `the reading column measures ${tall.columnWidth}px at 390x${TALL}, so this mount is not laying out and the comparison below is over nothing`,
    ).toBeGreaterThan(200);

    // Soft, so one run shows the cause and its consequence together: the gutter that moved,
    // and the reading column that moved with it.
    expect
      .soft(
        short.paddingInline,
        `the body's inline padding is ${short.paddingInline} at 390x${SHORT} and ${tall.paddingInline} at 390x${TALL}: a height-keyed rule is rewriting a horizontal gutter, so every width-pinned measurement moves on a short screen`,
      )
      .toBe(tall.paddingInline);
    expect
      .soft(
        short.columnWidth,
        `the reading column is ${short.columnWidth}px at 390x${SHORT} against ${tall.columnWidth}px at 390x${TALL}, so prose rewraps when only the height changes. Short: ${JSON.stringify(short)}. Tall: ${JSON.stringify(tall)}`,
      )
      .toBeCloseTo(tall.columnWidth, 0);
  }, 60_000);
});
