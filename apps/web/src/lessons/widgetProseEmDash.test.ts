/**
 * No em dash reaches a learner from a LESSON SOURCE file.
 *
 * The lesson-pack validator's R3 already bans U+2014, but it reads lesson JSON only:
 * `title`, `mini_lesson[i]`, `slide_subtitles[i]`, `worked_examples[i].prompt`,
 * `worked_examples[i].steps[j]`, `cfu.prompt`,
 * `cfu.hint`, `cfu.accepted[]` and `cfu.worked_solution[]`. It never opens a source file. So
 * a widget rendering "Multiply the 3 by each term inside \u2014 mind the sign." met no rule
 * at all, and the two that did ship were found by reading rather than by any check. This
 * closes the gap that let them through, not the two instances, which are already fixed.
 *
 * THE POPULATION IS SCOPED BY BEHAVIOUR, NOT BY DIRECTORY, and that is a correction. This
 * sweep first shipped over `interactive/*.tsx`, `interactive/kinds/*.tsx` and `visuals.tsx`
 * — the layer the interactive-widget mechanic is implemented in. But "renders learner prose
 * from source rather than from lesson JSON" is a fact about a surface, not about which
 * directory it lives in, and 88 files outside that layer do it too: every worked-solution
 * diagram under `worked/`, the `workedSolutionVisuals.tsx` registry those are dispatched
 * from, and the lesson shell itself (`cfu.tsx`, `WorkedSolution.tsx`, `AdvisorNpc.tsx`,
 * `MathKeypad.tsx`, `widgetFeedback.tsx` and the rest). Measured rather than argued: with
 * an em dash injected into `worked/d1NUM3.tsx`'s learner-visible diagram title, the sweep
 * as first shipped reported 4 passed, 0 failed. Extension is the same kind of
 * implementation detail, so `.ts` is in scope alongside `.tsx` — learner copy lives in
 * `answerFormat.ts`'s placeholders and `eraAdvisor.ts`'s advisor lines as much as in JSX.
 *
 * COMMENTS ARE EXEMPT, and that exemption is the design problem this file has to survive.
 * Dozens of JSDoc and JSX comments across the lesson tree use an em dash as ordinary
 * editorial punctuation and none of them renders, so a sweep over raw source would fire on
 * every one of them on day one and be deleted by the next author who met it. The sweep
 * therefore strips comments first, which makes the STRIPPER load-bearing: strip too much
 * and this file reports green while measuring nothing, strip too little and it fires on
 * comments until someone deletes it. `stripComments` itself now lives in
 * `lessonSourceScan.ts`, because `widgetProseArithmetic.test.ts` needs the same reading of
 * "what a learner actually sees" and a second copy would drift; the fixture tests below
 * stay here, and they are what makes it trustworthy at either call site.
 *
 * The controls below are what stop that, and they are the reason this is not a test
 * written green. Each fails in a different direction:
 *
 *  - the population floor fails if the glob resolves to nothing, because a sweep over an
 *    empty list passes;
 *  - the COMPOSITION assertions fail if the population drifts back to the widget layer
 *    this sweep used to stop at. A floor constrains size, not shape: 260 files is
 *    satisfied by the 183 interactive ones plus 77 of anything, so "genuinely wider than
 *    `interactive/`" is asserted where it can fail;
 *  - `stripComments` is unit-tested against fixtures, in both directions, because a
 *    stripper that cannot strip the comment it was written for is the shape of #187;
 *  - "rendered prose survives" fails if the stripper eats JSX text or string literals, in
 *    both shapes and on both sides of the widening, which is the over-stripping that would
 *    hide a real defect;
 *  - "the raw tree still has an em dash to strip" fails if the exemption has stopped
 *    excusing anything, at which point this comment is describing a problem the tree no
 *    longer has and the stripper is carrying risk for no benefit.
 *
 * Verified by injection rather than argued: an em dash in `worked/d1NUM3.tsx`'s diagram
 * title fails the sweep at that file, and removing the comment-stripping call fails it at
 * the dozens of comment lines instead.
 */

import { describe, expect, it } from "vitest";

import { stripComments } from "./lessonSourceScan";

const SOURCES = import.meta.glob(["./**/*.ts", "./**/*.tsx"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const EM_DASH = "\u2014";

/** Lesson sources, minus the tests, whose comments and fixtures are not learner copy. */
const LESSON_SOURCES = Object.entries(SOURCES).filter(([path]) => !path.includes(".test."));

/** The layer this sweep used to stop at, kept only so the widening can be asserted. */
const isWidgetLayer = (path: string) =>
  path.startsWith("./interactive/") || path === "./visuals.tsx";

/** Worked-solution diagrams: learner-visible, and outside the original glob. */
const isWorkedSolution = (path: string) =>
  path.startsWith("./worked/") || path === "./workedSolutionVisuals.tsx";

/** Every em dash left after stripping, as `file:line` with the offending line. */
function renderedEmDashes(path: string, source: string): string[] {
  const hits: string[] = [];
  const lines = stripComments(source).split("\n");
  const raw = source.split("\n");
  for (const [index, line] of lines.entries()) {
    if (line.includes(EM_DASH)) {
      hits.push(`${path}:${index + 1}: ${(raw[index] ?? line).trim()}`);
    }
  }
  return hits;
}

describe("no em dash reaches a learner from a lesson source", () => {
  it("the sweep found the lesson sources", () => {
    // A floor, not a census, for the reason widgetSuccessCoverage.test.ts gives: the sweep
    // is derived from the glob, so a new surface is covered the day it lands. What this
    // catches is the glob resolving to nothing, where a loop over an empty list passes.
    expect(
      LESSON_SOURCES.length,
      "the source sweep found fewer lesson files than the tree is known to hold",
    ).toBeGreaterThanOrEqual(260);
  });

  it("the population is wider than the widget layer it used to stop at", () => {
    // The composition assertion. A floor bounds size, not shape, so a revert of the
    // widening would still clear 260 while measuring only `interactive/` again. These two
    // put "this sweep reaches the surfaces the original glob missed" somewhere it fails.
    const beyondWidgetLayer = LESSON_SOURCES.filter(([path]) => !isWidgetLayer(path));
    expect(
      beyondWidgetLayer.length,
      "the sweep has narrowed back towards the interactive-widget layer it first shipped over",
    ).toBeGreaterThanOrEqual(80);

    const workedSolutions = LESSON_SOURCES.filter(([path]) => isWorkedSolution(path));
    expect(
      workedSolutions.length,
      "worked-solution diagrams are learner-visible and were the proven gap; they must stay in the population",
    ).toBeGreaterThanOrEqual(28);
  });

  it("stripComments removes comment em dashes and keeps rendered ones", () => {
    // The stripper is the load-bearing part, so it is tested against fixtures rather than
    // trusted. Each case is a shape the tree actually contains. The JSX-contraction case
    // is a regression: an apostrophe in prose used to open a string literal, and the scan
    // then copied the following JSDoc block through with its em dash intact.
    expect(stripComments(`// a line comment ${EM_DASH} like this\n`)).not.toContain(
      EM_DASH,
    );
    expect(stripComments(`/** a block comment ${EM_DASH} like this */\n`)).not.toContain(
      EM_DASH,
    );
    expect(
      stripComments(
        `<p>Finish a lesson's practice set.</p>\n/** then ${EM_DASH} this */\n`,
      ),
      "an apostrophe in JSX text opened a string literal, leaving the next comment unstripped",
    ).not.toContain(EM_DASH);
    expect(
      stripComments(`<p>hold on ${EM_DASH} wait</p>`),
      "JSX text was stripped, so a rendered em dash would go unseen",
    ).toContain(EM_DASH);
    expect(
      stripComments(`const s = "hold on ${EM_DASH} wait";`),
      "a string literal was stripped, so a rendered em dash would go unseen",
    ).toContain(EM_DASH);
    expect(
      stripComments(`const u = "https://x.test/a"; /* gone ${EM_DASH} here */`),
      "a // inside a string opened a comment and stripped the rest of the file away",
    ).not.toContain(EM_DASH);
  });

  it("stripping keeps rendered prose across the whole population", () => {
    // The over-stripping control against the real tree, in both shapes an em dash could
    // reach a learner through and on both sides of the widening. If a sentinel is gone,
    // the stripper is eating rendered prose and the sweep below is measuring less than it
    // appears to. All three are live learner copy at this tip: DistributeBuilder's
    // wrong-answer nudge is JSX text, CommonDenominatorMultiples' is a string literal, and
    // d1NUM3's is a worked-solution diagram title outside the original glob.
    const stripped = LESSON_SOURCES.map(([, source]) => stripComments(source)).join("\n");
    expect(stripped, "JSX text did not survive comment stripping").toContain(
      "mind the sign",
    );
    expect(stripped, "a string literal did not survive comment stripping").toContain(
      "First tap the least common denominator above.",
    );
    expect(stripped, "a worked-solution title did not survive comment stripping").toContain(
      "A negative factor handed to both terms inside a difference",
    );
  });

  it("the raw tree still contains an em dash for the stripper to remove", () => {
    // The exemption's own floor. Comment em dashes are what this sweep deliberately
    // tolerates; if none is left, the tolerance is excusing nothing and the stripper is
    // carrying its over-stripping risk for no benefit. Failing here is a prompt to
    // re-read the header, not a defect in the tree.
    const rawWithEmDash = LESSON_SOURCES.filter(([, source]) => source.includes(EM_DASH));
    expect(
      rawWithEmDash.length,
      "no lesson source contains an em dash at all, so comment stripping now excuses nothing",
    ).toBeGreaterThan(0);
  });

  it("no lesson source renders an em dash", () => {
    const offenders = LESSON_SOURCES.flatMap(([path, source]) =>
      renderedEmDashes(path, source),
    );
    expect(
      offenders,
      `em dash (U+2014) in rendered lesson prose. House style is no em dashes in learner copy; use a colon, a comma or a full stop:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
