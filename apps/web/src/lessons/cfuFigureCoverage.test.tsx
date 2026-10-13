/**
 * Every question a lesson's CHECK can put in front of a learner reveals a FIGURE, and that
 * figure names the answer to the question it sits under.
 *
 * The claim was unasserted while it was true only by accident. A check serves two questions --
 * the pack's authored one and a re-ask drawn from a template -- and until the `cfu.*` figures
 * landed, 21 of the 39 packs revealed step cards on BOTH, six on the authored one only, and
 * twelve on neither... which is to say the surface a learner met depended on which pack they
 * were in, and nothing failed. `cfuHintGate.browser.test.tsx` swept all 39 and accepted
 * `steps + figures > 0`, so it passed identically before and after this work: a sweep can be
 * green over the whole population and still be measuring something other than the property.
 *
 * ## Why this is not `cfuAuthoredFigure.test.tsx`
 *
 * That file owns the AUTHORED question, whose params are written by hand and can therefore
 * describe a different question than the prompt. This one owns the RE-ASK, whose params come
 * out of `generate()` and cannot disagree with their own prompt -- what can go wrong here is
 * different, and it is registration: a `template_id` with no registry entry falls through to
 * the step cards in silence, and so does one whose key was renamed. So the two halves are two
 * files, over one population, and both are needed before "every CFU reveals a figure" is a
 * claim about the tree rather than about a subset of it.
 *
 * ## The composite requirement
 *
 * Registering a key gives a re-ask a figure immediately, which is exactly why a figure existing
 * is not the property. Twelve of these checks answer two or three things at once -- an
 * expression AND the values its original denominator forbade, a hole AND two asymptotes, a
 * slope AND the direction it implies -- and a diagram that closes on the first of them looks
 * finished while answering a third of the question. So the answer is read back out of the
 * rendered figure, every value of it, over several draws per template.
 */

import { createRng } from "@cr/item-bank";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CFU_ONLY_TEMPLATE_LIST, cfuAsk, cfuInstances } from "./cfuVariants";
import { allLessons } from "./domains";
import {
  assertedStrings,
  claimsIn,
  flatten,
  namesToken,
  relaxRelations,
  valuesIn,
} from "./figureAnswerFixture";
import type { LessonContent } from "./types";
import { WorkedSolution } from "./WorkedSolution";
import { getWorkedSolutionVisual } from "./workedSolutionVisuals";

const CFU_PACKS: readonly LessonContent[] = allLessons.filter(
  (lesson) => lesson.cfu !== undefined,
);

/** How many draws each bespoke template is asked for. Enough to move every parameter. */
const DRAWS = 6;

/**
 * A numeric seed per (template, draw). `createRng` takes a number, so the template's own id has
 * to be folded into one: without it every template would be handed the same six draws, which is
 * fine for coverage and pointless for a sweep whose whole purpose is parameter variety.
 */
function seedFor(templateId: string, draw: number): number {
  let hash = 2_166_136_261;
  for (const character of templateId) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619);
  }
  return (hash ^ Math.imul(draw + 1, 2_654_435_761)) >>> 0;
}

/** The answer a generator's item is graded against, as the string these checks read. */
function answerKeyOf(item: { answer: { answer_key?: string } }, where: string): string {
  const key = item.answer.answer_key;
  if (typeof key !== "string") {
    throw new Error(`${where} generated an item with no text answer key`);
  }
  return key;
}

describe("every question a CFU can ask reveals a registered figure", () => {
  it("covers every pack, on both of its questions", () => {
    // A floor under the population, because every per-pack assertion below holds trivially
    // over an empty one and this file would agree with a content tree that had lost its
    // checks entirely.
    expect(CFU_PACKS.length).toBeGreaterThanOrEqual(39);
    const missing: string[] = [];
    for (const lesson of CFU_PACKS) {
      const cfu = lesson.cfu;
      if (!cfu) {
        continue;
      }
      const instances = cfuInstances(cfu);
      // Two questions per pack: the authored one and at least one re-ask. A pack that has
      // quietly stopped serving a second question would otherwise pass this file by having
      // nothing to check.
      expect(
        instances.length,
        `${lesson.node_id} serves only its authored question`,
      ).toBeGreaterThanOrEqual(2);
      instances.forEach((instance, index) => {
        if (!getWorkedSolutionVisual(instance.templateId)) {
          missing.push(
            `${lesson.node_id} question ${index + 1} (template "${instance.templateId}")`,
          );
        }
      });
    }
    expect(
      missing,
      `these CFU questions fall through to the step cards:\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  it.each(CFU_PACKS.map((lesson) => lesson.node_id))(
    "%s renders a figure for its re-asked question",
    (nodeId) => {
      const cfu = CFU_PACKS.find((lesson) => lesson.node_id === nodeId)?.cfu;
      if (!cfu) {
        throw new Error(`no CFU pack for ${nodeId}`);
      }
      const reAsk = cfuAsk(cfu, 1);
      expect(reAsk.authored, `${nodeId}'s second question is the authored one`).toBe(false);
      const { container } = render(
        <WorkedSolution
          templateId={reAsk.templateId}
          params={reAsk.params}
          steps={reAsk.workedSolution}
        />,
      );
      expect(container.querySelector("figure.lesson-visual"), nodeId).not.toBeNull();
      expect(container.querySelector(".worked-solution__steps"), nodeId).toBeNull();
      expect(container.querySelectorAll(".katex").length, nodeId).toBeGreaterThan(0);
    },
  );
});

describe("a bespoke CFU figure names every part of its answer", () => {
  it("sweeps the templates the practice pools do not hold", () => {
    // Derived from `cfuVariants.ts` rather than listed here, and floored: a filter that had
    // started returning nothing would otherwise leave this file reporting green over no
    // figures at all.
    expect(CFU_ONLY_TEMPLATE_LIST.length).toBeGreaterThanOrEqual(21);
    // And a floor under the CLAIM check specifically, because that one reads a pattern out of
    // the answer and an empty list of claims asserts nothing. It was empty, over all 21, until
    // an injection into RAT.5 showed the sweep passing with an asymptote deleted -- so the
    // number of templates whose answer names a `variable = value` part is pinned here.
    const withClaims = CFU_ONLY_TEMPLATE_LIST.filter(
      (template) =>
        claimsIn(
          answerKeyOf(
            template.generate(createRng(seedFor(template.template_id, -1))),
            template.template_id,
          ),
        ).length > 0,
    );
    expect(
      withClaims.map((template) => template.template_id).sort(),
      "no bespoke CFU answer parses into named parts, so the claim check is asserting nothing",
    ).toEqual([
      "cfu.el2.reflect-shift",
      "cfu.el4.domain-asymptote",
      "cfu.rat1.reduce-exclusions",
      "cfu.rat2.divide-exclusions",
      "cfu.rat3.subtract-lcd",
      "cfu.rat4.complex-clear",
      "cfu.rat5.hole-asymptotes",
    ]);
  });

  it.each(CFU_ONLY_TEMPLATE_LIST.map((template) => template.template_id))(
    "%s",
    (templateId) => {
      const template = CFU_ONLY_TEMPLATE_LIST.find(
        (entry) => entry.template_id === templateId,
      );
      if (!template) {
        throw new Error(`no bespoke template ${templateId}`);
      }
      for (let seed = 0; seed < DRAWS; seed += 1) {
        const item = template.generate(createRng(seedFor(templateId, seed)));
        const answerKey = answerKeyOf(item, `${templateId} seed ${seed}`);
        const { container, unmount } = render(
          <WorkedSolution
            templateId={templateId}
            params={item.params ?? {}}
            steps={item.worked_solution ?? []}
          />,
        );
        const shown = assertedStrings(container).map(flatten);
        const answer = flatten(answerKey);
        const values = valuesIn(answer);
        // A composite answer's parts are printed on different rows, so the whole typed string
        // is often nowhere in the figure while every part of it is. Whichever way round, an
        // answer with no values in it would make this vacuous.
        expect(
          values.length,
          `${templateId} seed ${seed}: no values in the answer "${answerKey}"`,
        ).toBeGreaterThan(0);
        // Each named part first, which is what a composite answer is made of, then each bare
        // value. The order matters only for reading the failure: the claim is the assertion
        // with teeth, and the values catch a scalar answer the figure never reached.
        const relaxed = shown.map(relaxRelations);
        for (const claim of claimsIn(answerKey)) {
          expect(
            relaxed.some((string) => namesToken(string, claim, answer)),
            `${templateId} seed ${seed}: the figure never states ${claim.replace("~", " = ")}, one part of "${answerKey}". It shows ${shown.join(" | ")}`,
          ).toBe(true);
        }
        if (!shown.some((string) => namesToken(string, answer))) {
          for (const value of values) {
            // `answer` rather than nothing: this loop asks after ONE PART of a composite
            // answer, and a part of `6\sqrt{6}/3` is entitled to sit where that answer puts
            // it. A scalar answer names itself, so it gets no such licence.
            expect(
              shown.some((string) => namesToken(string, value, answer)),
              `${templateId} seed ${seed}: the figure never names ${value} of "${answerKey}". It shows ${shown.join(" | ")}`,
            ).toBe(true);
          }
        }
        unmount();
      }
    },
  );
});
