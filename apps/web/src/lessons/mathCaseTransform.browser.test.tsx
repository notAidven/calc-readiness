/**
 * NOTHING AN ANCESTOR SAYS ABOUT CASE MAY REACH TYPESET MATH.
 *
 * `text-transform` inherits, and KaTeX typesets math as ordinary text nodes, so a container that
 * upper-cases its own label upper-cases every variable rendered inside it. That is not a class of
 * defect a widget can be trusted to opt out of one at a time, and the tree proved it: the trap was
 * found first on `.lesson-interactive__slider-label`, fixed with a `--mixed` opt-out for slider and
 * select labels, written into the `interactive-visuals` skill as a rule about sliders and selects,
 * and then shipped again through `.lesson-equation__stage`, which nobody had thought of as a label.
 * `w = \dfrac{P - 2l}{2}` read as `W = \dfrac{P - 2L}{2}` on LIN.3 and `6x + 5 \le 41` as
 * `6X + 5 \le 41` on LIN.4, both measured below. D4's stone board labels its bins `x^{2}`, `x` and
 * `1` in the same stage, so it had the same defect by construction; see the limitation at the foot
 * of this comment for why that one is reasoned from source rather than measured here.
 *
 * The opt-out was not merely too narrow, it was also unapplied: this sweep's first run found
 * `percent-slider` painting `25\%` and `common-denominator-multiples` painting its multiples under
 * exactly the two classes the `--mixed` modifier was written for, neither of them taking it. Nothing
 * reported those; deriving the population is what found them.
 *
 * So the fix is one declaration on `.katex` itself, and this file is the guard that keeps it: math
 * is immune, whatever any ancestor asks for, now and for whatever container gets written next.
 *
 * ## Three claims, because the first is structurally blind to the second
 *
 *  - EVERY `.katex` COMPUTES `text-transform: none`. This is the whole class, and it is stated over
 *    the rendered node rather than over the stylesheet so it fails for a new container as readily as
 *    for a known one.
 *  - NO `.lesson-equation__stage` CARRIES MATH AS ITS OWN TEXT. The claim above cannot see this one:
 *    a variable interpolated as a plain string (`{rule.target} =`) produces no `.katex` node for the
 *    rule to protect, so it is upper-cased exactly as before while the sweep reads green. It was red
 *    at `formula-isolate-builder` when this file was written.
 *  - A MATH-BEARING STAGE'S EXPRESSION STAYS INSIDE ITS OWN COLUMN. Typesetting the stage is only
 *    half of making it readable; the other half is a size, and `.lesson-equation__stage--math` picks
 *    one against a fixed 4.6rem track. That number needs somewhere it can fail. See the test.
 *
 * ## The population is derived, and so is the part of it that could exhibit the defect
 *
 * Every visual id any lesson pack places, mounted, following `classifyChipFit.browser.test.tsx`:
 * scoping this to the widgets on the bug report is the mistake that produced the second and third
 * instances of it.
 *
 * Both claims are ABSENCES, which hold trivially over a sweep that mounted nothing, so both carry
 * floors. The katex claim's floor is deliberately not "how many `.katex` nodes were found" alone but
 * how many were found INSIDE a case-transforming ancestor: that is the sub-population the rule is
 * load-bearing over, it is derived from computed style rather than from a list of container classes,
 * and a run where it fell to zero would satisfy the claim while proving nothing about it.
 *
 * ## What it does not reach, stated rather than left to be discovered
 *
 * A visual is measured in its MOUNT state. `stone-pieces-sorter` draws its `.lesson-equation__stage`
 * rows only once the learner has sorted the pieces into bins, so its stage is outside the second and
 * third claims' populations, while its chips are inside the first one's. Driving every board into
 * every state is `classifyChipFit`'s trick and it costs a tap per row, which is not affordable over
 * every placed visual in the tree. So the stone board's stage is covered by the global rule and not
 * by an assertion here, and that is a gap rather than a decision.
 *
 * Real Chromium and the real stylesheet, because every number here is a computed style.
 */

import { afterAll, beforeAll, expect, test } from "vitest";
import { page } from "vitest/browser";

import { allLessons } from "./domains";
import { CITY_PHONE, FIGURE_CONTENT_CAP } from "./readingWidths";
import { mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/**
 * A desktop viewport, so a host set to 460px really is 460px wide, as in `classifyChipFit`. Case is
 * not a layout property, but the container queries in `styles.css` are, and a board measured in its
 * phone layout is a different set of containers.
 *
 * KaTeX's faces are waited for per mount instead, in `mountVisual`, because they are not requested
 * until something is typeset. See the note there.
 */
beforeAll(async () => {
  await page.viewport(1440, 900);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

/** Every visual id any lesson places, across every registered domain. */
function liveVisualIds(): LessonVisualId[] {
  return Array.from(
    new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
  ) as LessonVisualId[];
}

/** One `.katex` node, and what the cascade did to its case. */
interface MathReading {
  /** Which board and which expression: a failure has to name the instance. */
  readonly where: string;
  readonly visual: string;
  /** The node's own computed `text-transform`. */
  readonly transform: string;
  /**
   * The ancestor a case change originates at, if any. This is what the rule on `.katex` is for, and
   * counting these is how the claim below avoids passing over a tree that has none left.
   */
  readonly under: string | null;
}

/** One `.lesson-equation__stage`, and the text it holds that KaTeX did not typeset. */
interface StageReading {
  readonly where: string;
  readonly visual: string;
  /** The stage's text with every `.katex` subtree removed: what the cascade can still mangle. */
  readonly ownText: string;
  /** True when the stage typesets something, i.e. it is a math-bearing stage. */
  readonly typesets: boolean;
}

interface Sweep {
  /** Every placed visual that mounted a figure. */
  readonly visuals: string[];
  /** Visuals that typeset at least one expression. */
  readonly mathVisuals: string[];
  readonly maths: MathReading[];
  readonly stages: StageReading[];
}

/**
 * The ancestor the case change ORIGINATES at, named by its class, or `null`.
 *
 * Read off computed style rather than matched against a list of container classes, so a container
 * written next year is in the population the day it upper-cases something. Taken as the OUTERMOST
 * such ancestor rather than the nearest, because `text-transform` inherits: the nearest is whatever
 * unclassed `<span>` happens to sit closest to the math, which names nothing a reader can go and
 * edit, while the outermost is the element the declaration is on.
 */
function caseTransformingAncestor(node: HTMLElement, stopAt: HTMLElement): string | null {
  let origin: string | null = null;
  for (let at = node.parentElement; at !== null && at !== stopAt; at = at.parentElement) {
    const transform = getComputedStyle(at).textTransform;
    if (transform !== "none") {
      const name = at.className.split(" ")[0];
      origin = `${name === undefined || name === "" ? at.tagName.toLowerCase() : `.${name}`} (${transform})`;
    }
  }
  return origin;
}

/** What the LaTeX was, for a failure that has to be findable in source. */
function sourceLatex(node: HTMLElement): string {
  const carrier = node.closest<HTMLElement>("[data-latex]");
  return carrier?.getAttribute("data-latex") ?? node.textContent?.slice(0, 24) ?? "";
}

/** A stage's text with everything KaTeX rendered taken out of it. */
function untypesetText(stage: HTMLElement): string {
  const clone = stage.cloneNode(true) as HTMLElement;
  for (const math of Array.from(clone.querySelectorAll(".katex"))) {
    math.remove();
  }
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Text in a stage that is math rather than a name for one.
 *
 * The thirteen stages that carry a genuine prose label ("one ingot", "first step", "the bracket")
 * are correct to be upper-cased and must stay that way, so the test is not "any text" but the two
 * shapes a variable arrives in: an equation fragment, or the variable on its own.
 */
function looksLikeMath(text: string): boolean {
  return text.includes("=") || /^[A-Za-z]$/.test(text);
}

/** The harness holding whatever is on screen, so a thrown assertion cannot leak a mounted board. */
let mounted: { cleanup: () => void } | null = null;

function unmount(): void {
  mounted?.cleanup();
  mounted = null;
}

async function mountVisual(id: LessonVisualId, width: number): Promise<HTMLElement> {
  const harness = mount(<LessonVisual id={id} />);
  mounted = harness;
  const host = harness.host;
  host.style.width = `${width}px`;
  await waitFor(() => host.querySelector("figure.lesson-visual") !== null, `${id} mounts`);
  // KaTeX renders in an effect, so a visual read on the mount tick has no `.katex` at all and
  // would contribute nothing while looking like it had been swept.
  await waitFor(
    () => host.querySelector(".katex") !== null,
    `${id} typesets something`,
    1500,
  ).catch(() => {});
  /*
   * And KaTeX's OWN FACES have to have arrived before anything is measured, which is not a detail:
   * until they do, the glyphs are laid out in the fallback and every width comes back about 10%
   * narrow. Measured, by reading one expression four times in a single run with the widths shuffled:
   * `w = \dfrac{P - 2l}{2}` is 60.4px on the run's first mount and 67.4px on every mount after it,
   * at whatever width each was taken. Narrow is the dangerous direction for the fit claim below,
   * because a narrow reading fits a column it would really overflow. Awaited here rather than in
   * `beforeAll`, since the faces are not requested until something is typeset, and it costs nothing
   * after the first mount: `fonts.ready` is already resolved once nothing new is loading.
   */
  await document.fonts.ready;
  return host;
}

async function sweep(width: number): Promise<Sweep> {
  const visuals: string[] = [];
  const mathVisuals: string[] = [];
  const maths: MathReading[] = [];
  const stages: StageReading[] = [];

  for (const id of liveVisualIds()) {
    const host = await mountVisual(id, width);

    visuals.push(id);
    const rendered = Array.from(host.querySelectorAll<HTMLElement>(".katex"));
    if (rendered.length > 0) {
      mathVisuals.push(id);
    }
    for (const node of rendered) {
      maths.push({
        where: `${id}: "${sourceLatex(node)}"`,
        visual: id,
        transform: getComputedStyle(node).textTransform,
        under: caseTransformingAncestor(node, host),
      });
    }

    Array.from(host.querySelectorAll<HTMLElement>(".lesson-equation__stage")).forEach(
      (stage, at) => {
        stages.push({
          where: `${id} stage ${at + 1}`,
          visual: id,
          ownText: untypesetText(stage),
          typesets: stage.querySelector(".katex") !== null,
        });
      },
    );

    unmount();
  }

  return { visuals, mathVisuals, maths, stages };
}

/**
 * One sweep, shared by both claims.
 *
 * Mounting every placed visual is minutes of work, and neither claim drives a board into a state
 * the other does not, so re-running it per test would buy nothing but wall clock.
 */
let swept: Promise<Sweep> | null = null;
function sweepOnce(): Promise<Sweep> {
  swept ??= sweep(FIGURE_CONTENT_CAP);
  return swept;
}

/**
 * Floors, at or just under the numbers measured over this tree: 173 placed visuals, 171 of them
 * typesetting something, 1101 `.katex` nodes of which 9 sit inside a container that changes case,
 * and 28 `.lesson-equation__stage` cells of which 6 typeset math.
 *
 * `AT_RISK_FLOOR` is the load-bearing one. Every claim below is an absence, and the absence the
 * first test asserts is uninteresting over math that no container was trying to upper-case: that
 * floor is what makes a green run mean "the rule held" rather than "there was nothing to hold".
 * The nine sit under three different containers (`.lesson-equation__stage`,
 * `.lesson-interactive__slider-label`, `.lesson-interactive__select-label`) across five boards,
 * which is the point: the last two are the classes the per-container opt-out was invented for and
 * then not applied to, found here by deriving the population rather than by another bug report.
 *
 * `MATH_STAGE_FLOOR` is a claim about composition and not only size. It sits AT the observed six
 * rather than under it, because those six are the whole of the population that can fail the second
 * and third claims: a stage that stops typesetting its expression has to fail here rather than
 * quietly leave both of them true over the prose labels.
 */
const VISUAL_FLOOR = 165;
const MATH_VISUAL_FLOOR = 160;
const KATEX_FLOOR = 1050;
const AT_RISK_FLOOR = 8;
const STAGE_FLOOR = 26;
const MATH_STAGE_FLOOR = 6;

test("no ancestor changes the case of typeset math on any placed visual", async () => {
  const { visuals, mathVisuals, maths } = await sweepOnce();

  // THE DEFECT. Deduplicated per board and per transform, because one board can typeset the same
  // mangled expression in twenty places and the instance that matters is the board.
  const mangled = Array.from(
    new Set(
      maths
        .filter((m) => m.transform !== "none")
        .map(
          (m) =>
            `${m.where} computes text-transform: ${m.transform}${m.under === null ? "" : `, inherited from ${m.under}`}`,
        ),
    ),
  );
  expect(
    mangled.join("; "),
    "these expressions are being case-mangled by a container: KaTeX renders math as text, so text-transform reaches every glyph in them",
  ).toBe("");

  expect(visuals.length, "no lesson places a visual").toBeGreaterThanOrEqual(VISUAL_FLOOR);
  expect(
    mathVisuals.length,
    "no placed visual typeset any math, so this sweep measured nothing",
  ).toBeGreaterThanOrEqual(MATH_VISUAL_FLOOR);
  expect(
    maths.length,
    "the placed visuals drew too few expressions to measure",
  ).toBeGreaterThanOrEqual(KATEX_FLOOR);

  // The shape of the population, not just its size: the claim above is only worth making over math
  // that something IS trying to upper-case, and a floor on the total cannot see that sub-population
  // going to zero.
  expect(
    maths.filter((m) => m.under !== null).length,
    "no placed visual typesets math inside a container that changes case any more, so the global rule this asserts may no longer be load-bearing: check before deleting it",
  ).toBeGreaterThanOrEqual(AT_RISK_FLOOR);
});

/**
 * THE HALF THE RULE ON `.katex` STRUCTURALLY CANNOT REACH.
 *
 * A declaration on `.katex` protects math that was typeset. A variable interpolated into JSX as a
 * plain string is not typeset, so it has no `.katex` to carry the rule, and `.lesson-equation__stage`
 * upper-cases it exactly as it always did while the sweep above reads green over the same board.
 * That is the one remaining way to ship a wrong-case variable, and it is also just bad typography:
 * a variable belongs in math, not in a sentence.
 */
test("no equation stage carries math as its own text", async () => {
  const { stages } = await sweepOnce();

  const bare = stages.filter((s) => looksLikeMath(s.ownText));
  expect(
    bare.map((s) => `${s.where} holds "${s.ownText}" as plain text`).join("; "),
    "these stages interpolate a variable instead of typesetting it, so the rule on .katex cannot reach it and the container upper-cases it",
  ).toBe("");

  expect(
    stages.length,
    "no placed visual drew an equation stage, so this claim measured nothing",
  ).toBeGreaterThanOrEqual(STAGE_FLOOR);
  // And the stages that hold MATH, which are the ones that could exhibit this: a floor on all of
  // them is satisfied by the prose labels alone, which can never fail the claim.
  expect(
    stages.filter((s) => s.typesets).length,
    "no equation stage typesets math, so the claim is being made only over prose labels that could never fail it",
  ).toBeGreaterThanOrEqual(MATH_STAGE_FLOOR);
});

/**
 * AND THE SIZE THE MODIFIER PICKS HAS TO FIT THE COLUMN IT IS IN.
 *
 * `.lesson-equation__stage--math` exists because label typography reads badly on an expression, and
 * the obvious fix is to give the stage the same scale as `.lesson-equation__body` beside it. That
 * fix does not fit: the first grid track of `.lesson-equation__row` is a fixed 4.6rem and `.katex`
 * is `white-space: nowrap`, so an expression wider than the track is neither wrapped nor clipped,
 * it is painted OUTSIDE it, over the body column. At the body's 1.05rem the widest of the six,
 * `w = \dfrac{P - 2l}{2}`, needs 86.3px of 73.6px; at the shipped 0.82rem it needs 67.4px, leaving
 * 6.2px. So the size is a measurement, and this is where it is measured, because a number chosen
 * once and left uncommented is a number the next person raises.
 *
 * Its population is the math-bearing stages the sweep above FOUND, so a widget adopting the modifier
 * later is measured without an edit here. Two widths, and they agree today, at 67.4px each: the
 * track is a fixed 4.6rem and the expression does not reflow, so nothing about this reading is
 * width-dependent WHILE that is true. The second width is what would report it if the track were
 * ever made flexible, which is the direction the row's other columns are already going.
 */
test("a math stage's expression stays inside its own column", async () => {
  const { stages } = await sweepOnce();
  const carriers = Array.from(
    new Set(stages.filter((s) => s.typesets).map((s) => s.visual)),
  ) as LessonVisualId[];

  const outside: string[] = [];
  let measured = 0;
  for (const width of [FIGURE_CONTENT_CAP, CITY_PHONE.inside]) {
    for (const id of carriers) {
      const host = await mountVisual(id, width);
      const found = Array.from(
        host.querySelectorAll<HTMLElement>(".lesson-equation__stage"),
      ).filter((stage) => stage.querySelector(".katex") !== null);
      found.forEach((stage, at) => {
        const math = stage.querySelector<HTMLElement>(".katex");
        if (math === null) {
          return;
        }
        measured += 1;
        const track = stage.getBoundingClientRect().width;
        const ink = math.getBoundingClientRect().width;
        if (ink > track) {
          outside.push(
            `at ${width}px ${id} stage ${at + 1} paints ${ink.toFixed(1)}px of math in a ${track.toFixed(1)}px column, ${(ink - track).toFixed(1)}px outside it`,
          );
        }
      });
      unmount();
    }
  }

  expect(
    outside.join("; "),
    "a nowrap expression wider than its fixed track is painted over the column beside it, not clipped by its own",
  ).toBe("");
  expect(
    measured,
    "no math-bearing stage was measured, so the size the modifier picks is unasserted",
  ).toBeGreaterThanOrEqual(MATH_STAGE_FLOOR * 2);
});
