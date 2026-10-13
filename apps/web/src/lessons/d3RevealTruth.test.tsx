/**
 * What LIN.5's reveal is allowed to SAY, measured over the draws that reach it.
 *
 * A worked figure is authored once and redrawn from every parameter set the generator produces,
 * so a sentence on it is a claim about the whole parameter space and not about the draw its
 * author happened to be looking at. Two D3 defects were exactly that, and neither was reachable
 * from the item bank, because both live on the web side in `worked/d3LIN5.tsx`:
 *
 *  - `d3.lin5.coefficient.l2`'s caption told the learner the two solutions "are not a
 *    plus-and-minus pair". The generator draws `b` from a range that includes zero, and on the
 *    zero draw the bars hold a bare multiple of `x`, so the roots ARE a plus-and-minus pair and
 *    the caption is contradicting a learner whose instinct was right. Measured below.
 *  - `d3.lin5.degenerate.l3`'s figure never printed the answer. This is the reveal a learner
 *    reaches after saying they could not solve it, and `WorkedSolution` returns the figure
 *    INSTEAD of the step cards, so the roster in the steps underneath is never rendered. `{}`
 *    appeared nowhere on the surface whose own prompt asks for `{}`.
 *
 * Both are read off the RENDERED figure — its `data-latex` nodes and its caption, via
 * `assertedStrings` — rather than off the parameters, for the reason that fixture gives: a
 * params-driven check agrees with the figure by construction and passes over a figure that has
 * stopped describing its own question.
 *
 * The populations are derived from the registries, and floored, so an emptied registry or a
 * renamed template cannot make either sweep pass over nothing.
 */

import { generateFromTemplate } from "@cr/item-bank";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { assertedStrings } from "./figureAnswerFixture";
import { SWEPT_TEMPLATES } from "./practiceSweep";
import { getWorkedSolutionVisual } from "./workedSolutionVisuals";

/** Enough seeds to reach a 5%-of-draws branch several times over. */
const DRAWS = 400;

/** Every LIN.5 practice template the pool serves, in registry order. */
const LIN5_TEMPLATES = SWEPT_TEMPLATES.filter((template) =>
  template.template_id.startsWith("d3.lin5."),
);

/**
 * The solution sets a figure prints, each as its sorted members.
 *
 * `flatten` cannot be used for this: it strips braces, so the empty set flattens to the empty
 * string and "the figure names the answer" becomes trivially true on exactly the draw whose
 * answer went missing. Braces are what is being looked for here, so they are kept.
 */
function braceSets(strings: readonly string[]): string[][] {
  const sets: string[][] = [];
  for (const value of strings) {
    const compact = value.replace(/\\([{}])/g, "$1").replace(/[\s$]/g, "");
    for (const match of compact.matchAll(/\{([^{}]*)\}/g)) {
      const inner = match[1] ?? "";
      sets.push(
        inner.length === 0
          ? []
          : inner
              .split(",")
              .filter((part) => part.length > 0)
              .sort(),
      );
    }
  }
  return sets;
}

/** The answer key's own members, sorted the same way. */
function answerMembers(answerKey: string): string[] {
  const inner = /^\s*\{(.*)\}\s*$/.exec(answerKey)?.[1] ?? "";
  return inner
    .split(",")
    .map((part) => part.replace(/\s/g, ""))
    .filter((part) => part.length > 0)
    .sort();
}

describe("a LIN.5 reveal figure prints the solution set its own draw has", () => {
  it("has a population, derived from the practice registry rather than listed", () => {
    expect(LIN5_TEMPLATES.length, "no LIN.5 practice templates").toBeGreaterThanOrEqual(5);
    for (const template of LIN5_TEMPLATES) {
      expect(
        getWorkedSolutionVisual(template.template_id),
        `${template.template_id} has no registered worked figure, so this sweep reads nothing for it`,
      ).toBeDefined();
    }
  });

  it.each(LIN5_TEMPLATES.map((template) => template.template_id))(
    "%s names its answer on every draw",
    (templateId) => {
      const template = LIN5_TEMPLATES.find((entry) => entry.template_id === templateId);
      if (!template) {
        throw new Error(`${templateId} left the population mid-run`);
      }
      const visual = getWorkedSolutionVisual(templateId);
      if (!visual) {
        throw new Error(`${templateId} has no registered worked figure`);
      }
      const silent: string[] = [];
      const seen = new Set<string>();
      const rendered = new Set<string>();
      let checked = 0;
      let emptyDraws = 0;
      for (let index = 0; index < DRAWS; index += 1) {
        const item = generateFromTemplate(template, "practice", 500_000 + index);
        // A keyless draw THROWS rather than `continue`s. This sweep exists to check the figure
        // names the answer, so an item with no answer to name is a broken draw, and skipping it
        // would quietly shrink the population instead of reporting it.
        const answerKey = item.answer.answer_key;
        if (answerKey === undefined) {
          throw new Error(`${templateId} drew no answer key at seed ${500_000 + index}`);
        }
        const wanted = answerMembers(answerKey);
        if (!/^\s*\{.*\}\s*$/.test(answerKey)) {
          continue;
        }
        checked += 1;
        if (wanted.length === 0) {
          emptyDraws += 1;
        }
        // The figure is a pure function of its parameters, so one render per DISTINCT parameter
        // set covers every draw that produced it. The tally above still counts all of them.
        const shape = JSON.stringify(item.template_params);
        if (rendered.has(shape)) {
          continue;
        }
        rendered.add(shape);
        const { container } = render(visual.Svg(item.template_params));
        const printed = braceSets([
          ...assertedStrings(container),
          visual.caption(item.template_params),
        ]);
        const found = printed.some(
          (set) => set.length === wanted.length && set.every((v, i) => v === wanted[i]),
        );
        if (!found && !seen.has(answerKey)) {
          seen.add(answerKey);
          silent.push(`answer ${answerKey} appears in no set the figure prints`);
        }
      }
      expect(checked, `${templateId} drew no solution-set answer`).toBeGreaterThan(0);
      // A floor under the dedupe, so a template that collapsed to one shape cannot pass this
      // by rendering almost nothing.
      expect(rendered.size, `${templateId} rendered too few shapes`).toBeGreaterThanOrEqual(
        8,
      );
      if (templateId === "d3.lin5.degenerate.l3") {
        // The branch the defect lived on. Without this the assertion above could pass by never
        // drawing the empty set at all.
        expect(emptyDraws, "no empty-set draw reached the figure").toBeGreaterThan(50);
      }
      expect(
        silent.join("\n    "),
        `${templateId}'s reveal leaves the learner to finish the problem: ${silent.length} distinct answers go unnamed over ${checked} draws (${rendered.size} distinct figures)`,
      ).toBe("");
    },
  );
}, 120_000);

describe("no LIN.5 caption denies a plus-and-minus pair the draw actually has", () => {
  /**
   * A pair is read off the ANSWER KEY, which is what the grader wants typed, rather than off
   * `b`: reading `b` would be restating the caption's own condition and would agree with it
   * whatever the roots came out as.
   */
  function isPlusMinusPair(answerKey: string): boolean {
    const members = answerMembers(answerKey).map(Number);
    return (
      members.length === 2 &&
      members.every((value) => Number.isFinite(value)) &&
      members[0] === -(members[1] as number) &&
      members[0] !== 0
    );
  }

  const DENIALS = [/not a plus-and-minus pair/i, /rather than of \$x\$/i];

  it("d3.lin5.coefficient.l2's caption holds on both branches of its own draw", () => {
    const template = LIN5_TEMPLATES.find(
      (entry) => entry.template_id === "d3.lin5.coefficient.l2",
    );
    if (!template) {
      throw new Error("d3.lin5.coefficient.l2 is not a LIN.5 practice template");
    }
    const visual = getWorkedSolutionVisual("d3.lin5.coefficient.l2");
    if (!visual) {
      throw new Error("d3.lin5.coefficient.l2 has no registered worked figure");
    }
    let pairDraws = 0;
    let mirrorDraws = 0;
    let denied = 0;
    const wordings = new Set<string>();
    for (let index = 0; index < DRAWS; index += 1) {
      const item = generateFromTemplate(template, "practice", 500_000 + index);
      const caption = visual.caption(item.template_params);
      const answerKey = item.answer.answer_key;
      if (answerKey === undefined) {
        throw new Error(
          `d3.lin5.coefficient.l2 drew no answer key at seed ${500_000 + index}`,
        );
      }
      if (!isPlusMinusPair(answerKey)) {
        mirrorDraws += 1;
        continue;
      }
      pairDraws += 1;
      if (DENIALS.some((pattern) => pattern.test(caption))) {
        denied += 1;
        wordings.add(caption);
      }
    }
    // Both branches drawn, so neither side is being asserted over nothing.
    expect(pairDraws, "no plus-and-minus draw was reached").toBeGreaterThan(0);
    expect(mirrorDraws, "no non-pair draw was reached").toBeGreaterThan(0);
    expect(
      [...wordings].join("\n    "),
      `the caption denies a plus-and-minus pair on ${denied} of ${pairDraws + mirrorDraws} draws whose roots are one (${pairDraws} such draws)`,
    ).toBe("");
    expect(denied, `denied on ${denied} of ${pairDraws} plus-and-minus draws`).toBe(0);
  });
});
