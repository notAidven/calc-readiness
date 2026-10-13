/**
 * The guard on `cfu.worked_solution_params`: an authored CFU question that claims a figure
 * gets a figure, and that figure names the answer to the question printed above it.
 *
 * A CFU's re-asked question reaches its practice template's registered diagram because it
 * carries the parameters it was drawn from. The authored question was drawn from nothing, so
 * `worked_solution_params` is the pack naming those parameters by hand, and a hand-written
 * parameter set is exactly the kind of thing that can describe a DIFFERENT question than the
 * prompt: `d1.num-s.l1` with `a: 9` renders a perfectly clean number line ending at $-3$ over
 * a prompt whose answer is $-2$. Nothing else in the tree would notice, because the figure
 * renders, typesets and captions itself either way.
 *
 * So the property is read off the rendered figure rather than the parameters:
 *
 *  1. `WorkedSolution` renders a FIGURE and not the step cards, which is what says the
 *     params reached a registry entry rather than silently falling through. `""` and an
 *     unregistered id are indistinguishable from outside this assertion.
 *  2. The figure names this question's answer, in one of the two ways below.
 *
 * ## Two ways, both named, neither inferred
 *
 * A figure states a scalar answer as a string a learner could type (`3x + 12`, `125`,
 * `(15, 25)`), and states a solution SET the way a solution is written rather than the way the
 * answer box wants it typed: `x = -7 \text{ or } x = 5` against an accepted `{-7, 5}`. Those
 * are different claims about the same figure, so they are two lists (`FIGURE_SPELLS_THE_ANSWER`
 * and `FIGURE_NAMES_EACH_VALUE`) rather than one check that tries the strict form and quietly
 * accepts the loose one. Asserted both ways, per `.cursor/rules/qa-verification.mdc`: a pack
 * whose figure starts spelling its answer in full fails out of the loose list, and a pack that
 * stops fails out of the strict one, so neither list can go on describing something it has
 * stopped describing.
 *
 * The loose check is weaker and worth being exact about how: it asks that each VALUE of the
 * answer appear somewhere in the figure, token-bounded so `5` cannot match inside `25`. A
 * figure printing the right two roots in an unexpected arrangement passes it. What it still
 * catches is the failure this file exists for, a params set describing another question, since
 * that changes the values.
 *
 * ## What this file does not check
 *
 * That the figure is the RIGHT explanation of the authored question — same shape, same
 * scenario, same variable letter. That is a per-pack reading and it cannot be mechanised, which
 * is why `NO_HONEST_FIGURE` exists: it held the six packs whose variant template owned a
 * visual that would have restated their question wrongly, each read by hand. It is empty now,
 * and asserted empty, because every check has a figure that fits it.
 *
 * The population is every CFU pack. `cfuFigureCoverage.test.tsx` is the other half of that
 * claim, and the two halves overlap on purpose rather than by oversight. That file asserts
 * every pack's re-ask RENDERS a figure, and reads the answer back out of the 21 bespoke
 * `cfu.*` templates over six draws each. The `REASKS` sweep at the foot of this file reads the
 * answer back out of the instance `cfuInstances` actually serves, which for eighteen packs is
 * a POOL template no bespoke sweep reaches. Neither contains the other, so both are kept.
 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { type CfuInstance, cfuAsk, cfuInstances } from "./cfuVariants";
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

/**
 * The packs whose figure prints a full accepted spelling of the answer.
 *
 * One entry per pack, with the string the figure is expected to be found saying, so a params
 * change that keeps the figure renderable but moves its answer fails here by name rather than
 * being absorbed by a check that only asked for "some accepted spelling".
 */
const FIGURE_SPELLS_THE_ANSWER: readonly string[] = [
  "NUM.2",
  "NUM.3",
  "NUM.4",
  "NUM.5",
  "NUM.F",
  "NUM.S",
  "EXP.1",
  "RAD.1",
  "RAD.2",
  "RAD.3",
  "RAD.4",
  "LIN.1",
  "LIN.3",
  "LIN.4",
  "LIN.5",
  "LIN.6",
  "POL.1",
  "POL.2",
  "POL.5",
  "POL.6",
  "POL.7",
  "POL.8",
  "RAT.6",
  "LF.1",
  "LF.2",
  "LF.4",
  "EL.1",
  "EL.2",
  "EL.3",
  "EL.4",
  "EL.5",
  "EL.6",
  // Both D10 checks answer with ONE whole number, so the strict list is the only one they can
  // be in: `FIGURE_NAMES_EACH_VALUE` reads the values out of the canonical answer and requires
  // more than one of them, which `5` and `92` cannot supply. The figures state them the way a
  // learner types them -- GEO.1 closes on `\dfrac{50}{10} = 5` under a model rectangle drawn at
  // a tenth of the foundation, GEO.2 on `S = 92` under a net whose sixth face is dashed empty.
  "GEO.1",
  "GEO.2",
  // D6, whose eleven checks arrived through a merge authored before this contract. Ten of
  // them answer two things at once and still belong in the STRICT list: each figure closes on
  // a row spelled the way the answer box wants the pair typed, `(-3, 4), 10` and `-19, no`
  // and `4x - 5, 7`, under the working that won each half. So no single value of theirs has
  // to be hunted for separately, which is what the loose list below is for.
  "CG.1",
  "FUN.1",
  "FUN.2",
  "FUN.3",
  "FUN.4",
  "FUN.5",
  "FUN.6",
  "FUN.7",
  "FUN.8",
  "FUN.9",
  "FUN.10",
  // D9's nine, and every one of them is here rather than in the loose list below: a heading, a
  // length, a reading or a multiple of pi is one value, so each figure prints the whole typed
  // answer on one row and none of them splits one across two.
  "TRG.1",
  "TRG.2",
  "TRG.3",
  "TRG.4",
  "TRG.5",
  "TRG.6",
  "TRG.7",
  "TRG.8",
  "TRG.9",
];

/**
 * The packs whose figure names each value of the answer separately.
 *
 * Two reasons to be here, and both are about the figure's ARRANGEMENT rather than its numbers.
 *
 * The solution sets: `d4.pol3.area.l3` and `d4.pol4.formula.l3` close on
 * `x = -7 \text{ or } x = 5` and `x = \dfrac{3}{2} \text{ or } x = -4`, which is how a solution
 * is written; the answer box wants `{-7, 5}`. Neither spelling is wrong and neither contains
 * the other.
 *
 * The COMPOSITE checks: an expression and the values its original denominator forbade, or a
 * model and a prediction made with it. Those answers are typed into one field, and the figure
 * puts their halves on different ROWS -- the reduced fraction, then the excluded values under
 * it -- because that is where each half is won. So no single string in the figure holds the
 * whole typed answer, while every part of it is there to be found.
 */
const FIGURE_NAMES_EACH_VALUE: readonly string[] = [
  "POL.3",
  "POL.4",
  "RAT.1",
  "RAT.2",
  "RAT.3",
  "RAT.4",
  "RAT.5",
  "LF.3",
];

/**
 * The packs whose variant template owns a registered visual that CANNOT honestly restate the
 * authored question, with the reason for each. They would hold no `worked_solution_params` and
 * keep the step cards on their first question.
 *
 * **It is empty, and the emptiness is the claim.** Six packs sat here until every check was
 * given a figure: four resolved by pointing the authored figure at a template that fits its
 * question through `worked_solution_template`, and two by a param their figure did not read
 * yet (LIN.5's letter, LF.2's already-solved given line). Asserted empty rather than deleted,
 * because an exception list that has been deleted cannot fail, and this one failing is how a
 * fortieth pack landing with a visual available and no figure gets noticed.
 *
 * The entries are still asserted both ways, so restoring one is not a way around the sweep: a
 * listed pack has to still be a CFU pack, still hold no params, and still have a visual
 * available to be excused from.
 */
const NO_HONEST_FIGURE: readonly { node: string; why: string }[] = [];

const CFU_PACKS: readonly LessonContent[] = allLessons.filter(
  (lesson) => lesson.cfu !== undefined,
);

/** Every pack that claims an authored figure, derived from the content rather than listed. */
const WITH_PARAMS: readonly LessonContent[] = CFU_PACKS.filter(
  (lesson) => lesson.cfu?.worked_solution_params !== undefined,
);

/**
 * The template the AUTHORED question's figure is keyed on, which is not always the one the
 * re-ask draws from: `cfu.worked_solution_template` overrides it for the packs whose check asks
 * a different shape than their pool does.
 *
 * Read off the instance the app builds rather than recomputed here, so this cannot pass over a
 * resolution rule that has drifted.
 */
function authoredFigureTemplate(lesson: LessonContent): string {
  const cfu = lesson.cfu;
  return cfu ? cfuAsk(cfu, 0).templateId : "";
}

/**
 * Every computed re-ask served by a pack that claims an authored figure, derived from the
 * content rather than listed.
 *
 * The authored question and the re-ask reach the same registry entry by two different routes,
 * and only one of them is measured above. The pack hand-writes `worked_solution_params`; the
 * generator draws its own. So a figure laid out around the authored numbers can be handed a
 * draw outside them -- `worked-solution-svg`'s skill notes the reverse case, a CFU reaching
 * `b: 4` where its template only ever draws 2 or 3 -- and a caption written for the authored
 * numbers can be handed different ones. Every pack serves at least two instances, so the
 * question a learner sees on a second attempt is exactly the one this population covers.
 *
 * Scoped by the BEHAVIOUR rather than by the mechanism: the population is every pack that has
 * a figure AND serves a computed instance, whether that instance is drawn from a pool template
 * or from a CFU-only one, since the defect is possible either way. That scoping is what makes
 * this sweep worth keeping beside `cfuFigureCoverage.test.tsx`, whose answer-naming half is
 * scoped to `CFU_ONLY_TEMPLATE_LIST`: a pack whose re-ask draws from the practice pool is
 * outside that list by construction, and eighteen of them do.
 */
const REASKS: readonly (readonly [string, CfuInstance])[] = WITH_PARAMS.flatMap(
  (lesson) => {
    const cfu = lesson.cfu;
    return cfu === undefined
      ? []
      : cfuInstances(cfu)
          .filter((instance) => !instance.authored)
          .map((instance) => [lesson.node_id, instance] as const);
  },
);

function renderAuthoredFigure(lesson: LessonContent): HTMLElement {
  const cfu = lesson.cfu;
  if (!cfu?.worked_solution_params) {
    throw new Error(`${lesson.node_id} has no worked_solution_params`);
  }
  const authored = cfuAsk(cfu, 0);
  const { container } = render(
    <WorkedSolution
      templateId={authored.templateId}
      params={authored.params}
      steps={authored.workedSolution}
    />,
  );
  return container;
}

describe("an authored CFU question with worked_solution_params reveals a figure", () => {
  it("is exactly the two named populations, and the two do not overlap", () => {
    const declared = [...FIGURE_SPELLS_THE_ANSWER, ...FIGURE_NAMES_EACH_VALUE];
    // A floor, because every containment below holds trivially over an empty population and
    // this census would agree with a content tree that had lost the field entirely.
    expect(CFU_PACKS.length).toBeGreaterThanOrEqual(39);
    // Every CFU pack, not a subset of them: the floor moved from 12 to the whole population
    // when the 21 bespoke checks got figures of their own, and this is what stops it slipping
    // back to "most of them" unremarked.
    expect(WITH_PARAMS.length).toBe(CFU_PACKS.length);
    expect(WITH_PARAMS.length).toBeGreaterThanOrEqual(39);
    expect(new Set(declared).size, "a pack is declared in both lists").toBe(
      declared.length,
    );
    expect(WITH_PARAMS.map((lesson) => lesson.node_id).sort()).toEqual(
      [...declared].sort(),
    );
  });

  it.each([...FIGURE_SPELLS_THE_ANSWER, ...FIGURE_NAMES_EACH_VALUE])(
    "%s renders a figure rather than the step cards",
    (node) => {
      const lesson = CFU_PACKS.find((entry) => entry.node_id === node);
      if (!lesson) {
        throw new Error(`no CFU pack for ${node}`);
      }
      expect(
        getWorkedSolutionVisual(authoredFigureTemplate(lesson)),
        `${node}'s authored figure names no registered visual`,
      ).toBeDefined();
      const container = renderAuthoredFigure(lesson);
      expect(container.querySelector("figure.lesson-visual"), node).not.toBeNull();
      // The steps are still authored as the fallback; the figure is what replaced them.
      expect(container.querySelector(".worked-solution__steps"), node).toBeNull();
      expect(lesson.cfu?.worked_solution?.length ?? 0, node).toBeGreaterThan(0);
      expect(container.querySelectorAll(".katex").length, node).toBeGreaterThan(0);
    },
  );

  it.each(FIGURE_SPELLS_THE_ANSWER)("%s's figure spells out an accepted answer", (node) => {
    const lesson = CFU_PACKS.find((entry) => entry.node_id === node);
    const cfu = lesson?.cfu;
    if (!cfu) {
      throw new Error(`no CFU pack for ${node}`);
    }
    const shown = assertedStrings(renderAuthoredFigure(lesson)).map(flatten);
    const wanted = [...cfu.accepted, cfu.check?.answer_key ?? ""]
      .filter((value) => value.length > 0)
      .map(flatten);
    const found = wanted.find((answer) =>
      shown.some((string) => namesToken(string, answer)),
    );
    expect(
      found,
      `${node}: no accepted spelling of the answer appears in the figure. Wanted one of ${wanted.join(" | ")}; the figure shows ${shown.join(" | ")}`,
    ).toBeDefined();
  });

  it.each(FIGURE_NAMES_EACH_VALUE)(
    "%s's figure names every value of the answer",
    (node) => {
      const lesson = CFU_PACKS.find((entry) => entry.node_id === node);
      const cfu = lesson?.cfu;
      if (!cfu) {
        throw new Error(`no CFU pack for ${node}`);
      }
      const shown = assertedStrings(renderAuthoredFigure(lesson)).map(flatten);
      const canonical = cfu.check?.answer_key ?? cfu.accepted[0] ?? "";
      // The named parts first. Every value of a composite answer is already somewhere in the
      // working -- an asymptote's `1` sits in the factor `(x - 1)` that produced it -- so the
      // value loop below cannot tell a figure that STATES `x = 1` from one that dropped it.
      const relaxed = shown.map(relaxRelations);
      for (const claim of claimsIn(canonical)) {
        expect(
          relaxed.some((string) => namesToken(string, claim)),
          `${node}: the figure never states ${claim.replace("~", " = ")}, one part of "${canonical}". It shows ${shown.join(" | ")}`,
        ).toBe(true);
      }
      const values = valuesIn(flatten(canonical));
      // Without this a pack whose canonical answer carries no digits would pass by naming
      // nothing at all, which is the emptiness the containment reads as agreement.
      expect(
        values.length,
        `${node}: no values read out of "${canonical}"`,
      ).toBeGreaterThan(1);
      for (const value of values) {
        expect(
          shown.some((string) => namesToken(string, value)),
          `${node}: the figure never names ${value}. It shows ${shown.join(" | ")}`,
        ).toBe(true);
      }
    },
  );

  it("names only packs that could have had a figure and have not got one", () => {
    // Both directions. A listed pack that gains params fails here, and so does one whose
    // template loses its visual, since then the exemption has stopped being an exemption.
    for (const { node } of NO_HONEST_FIGURE) {
      const lesson = CFU_PACKS.find((entry) => entry.node_id === node);
      expect(lesson, `${node} is exempted but is no longer a CFU pack`).toBeDefined();
      expect(
        lesson?.cfu?.worked_solution_params,
        `${node} is exempted from having a figure but now sets worked_solution_params`,
      ).toBeUndefined();
      expect(
        getWorkedSolutionVisual(lesson?.cfu?.variants?.template_id ?? ""),
        `${node} is exempted as "a visual that would misstate the question", but its template has no visual at all, so the entry is excusing nothing`,
      ).toBeDefined();
    }
    // And the other direction on the population as a whole: every pack whose variant template
    // has a registered visual either sets params or is named above with its reason. This is
    // what stops a fortieth pack landing with a visual available and no figure, unnoticed.
    const couldHaveOne = CFU_PACKS.filter((lesson) =>
      Boolean(getWorkedSolutionVisual(lesson.cfu?.variants?.template_id ?? "")),
    );
    expect(
      couldHaveOne.length,
      "no CFU pack reaches a registered visual",
    ).toBeGreaterThanOrEqual(39);
    const unexplained = couldHaveOne
      .filter((lesson) => lesson.cfu?.worked_solution_params === undefined)
      .map((lesson) => lesson.node_id)
      .sort();
    expect(unexplained).toEqual(NO_HONEST_FIGURE.map((entry) => entry.node).sort());
    // The list is empty, so say so where it can fail rather than leaving it implied by the
    // equality above: an exception restored without a reason has to break something.
    expect(NO_HONEST_FIGURE).toEqual([]);
  });

  it("every pack with an authored figure also serves a computed re-ask", () => {
    // A floor and a census, for the reason the one above has them: every assertion below is
    // an `it.each` over this list, and an `it.each` over nothing reports green.
    expect(REASKS.length).toBeGreaterThanOrEqual(39);
    expect([...new Set(REASKS.map(([node]) => node))].sort()).toEqual(
      WITH_PARAMS.map((lesson) => lesson.node_id).sort(),
    );
    // A floor constrains size, not shape, and the shape is the reason this sweep is kept
    // beside `cfuFigureCoverage.test.tsx`: that file's answer-naming half reads the bespoke
    // `cfu.*` templates, so the packs whose re-ask comes out of a PRACTICE POOL are the part
    // only measured here. Asserted, because a population that drifted back to the bespoke
    // templates alone would still clear the count above.
    const fromThePool = REASKS.filter(
      ([, instance]) => !instance.templateId.startsWith("cfu."),
    );
    expect(
      [...new Set(fromThePool.map(([node]) => node))].length,
      "no re-ask draws from a practice pool, so this sweep has collapsed onto the bespoke templates the coverage file already reads",
    ).toBeGreaterThanOrEqual(18);
  });

  it.each(REASKS)(
    "%s's re-ask reaches the same figure, naming its OWN answer",
    (node, instance) => {
      expect(
        getWorkedSolutionVisual(instance.templateId),
        `${node}: the re-ask was drawn from ${instance.templateId}, which owns no registered visual`,
      ).toBeDefined();
      const { container } = render(
        <WorkedSolution
          templateId={instance.templateId}
          params={instance.params}
          steps={instance.workedSolution}
        />,
      );
      expect(container.querySelector("figure.lesson-visual"), node).not.toBeNull();
      expect(container.querySelector(".worked-solution__steps"), node).toBeNull();
      const shown = assertedStrings(container).map(flatten);
      if (FIGURE_NAMES_EACH_VALUE.includes(node)) {
        const values = valuesIn(flatten(instance.answerKey));
        expect(
          values.length,
          `${node}: no values read out of the re-ask's "${instance.answerKey}"`,
        ).toBeGreaterThan(1);
        for (const value of values) {
          expect(
            shown.some((string) => namesToken(string, value)),
            `${node}: the re-ask's figure never names ${value}. It shows ${shown.join(" | ")}`,
          ).toBe(true);
        }
        return;
      }
      const wanted = [instance.answerKey, ...instance.accepted]
        .filter((value) => value.length > 0)
        .map(flatten);
      const found = wanted.find((answer) =>
        shown.some((string) => namesToken(string, answer)),
      );
      expect(
        found,
        `${node}: the re-ask's figure names no accepted spelling of ITS answer. Wanted one of ${wanted.join(" | ")}; the figure shows ${shown.join(" | ")}`,
      ).toBeDefined();
    },
  );
});

/**
 * The figure rearranges the question's OWN rule.
 *
 * Everything above asks whether the figure arrives at the right ANSWER. LIN.3's did, and it was
 * still explaining a different question: the check states its rule with the melt loss baked in
 * as a literal, `B = c + t - 2`, while the figure's rearranging rows were hardcoded
 * `B = c + t - m`, `B - c = t - m`, `t = B - c + m`. It printed `15`, so
 * `FIGURE_SPELLS_THE_ANSWER` passed over it, and because the figure REPLACES the pack's own step
 * cards (asserted above) those three rows were the only rearrangement a stuck learner ever saw.
 * `m` is introduced nowhere in their question. R6.
 *
 * ## The population
 *
 * A pack can only have this defect where two things are true at once, and both are read off the
 * content rather than listed: its PROMPT states a rule, meaning a math span holding an `=` over
 * two or more named quantities, and its FIGURE states a rule of its own, meaning a typeset row
 * of the same shape. A figure that draws a number line or a graph has no rule to get wrong, and
 * a question that states no rule has none for a figure to contradict. Floored, because both
 * assertions below hold trivially over an empty population.
 */
describe("an authored CFU figure rearranges the rule its own question states", () => {
  /** Every `$...$` span's contents, in source order. */
  function mathSpans(text: string): string[] {
    return (text.match(/\$[^$]*\$/g) ?? []).map((span) => span.slice(1, -1));
  }

  /**
   * The single-letter quantity names in a LaTeX string.
   *
   * Commands and `\text{...}` spans go first, so `\dfrac` contributes no `d` and the words
   * inside a `\text` run contribute nothing at all. A letter only counts when no letter stands
   * beside it, which is what keeps `\sin` out once its backslash has been eaten.
   */
  function symbolsIn(latex: string): Set<string> {
    const bare = latex
      .replace(/\\text\s*\{[^{}]*\}/g, " ")
      .replace(/\\operatorname\s*\{[^{}]*\}/g, " ")
      .replace(/\\[a-zA-Z]+/g, " ");
    return new Set(bare.match(/(?<![a-zA-Z])[a-zA-Z](?![a-zA-Z])/g) ?? []);
  }

  function statesARule(latex: string): boolean {
    return latex.includes("=") && symbolsIn(latex).size >= 2;
  }

  /** The rule the QUESTION states, or `""` when it states none. */
  function promptRule(lesson: LessonContent): string {
    return mathSpans(lesson.cfu?.prompt ?? "").find(statesARule) ?? "";
  }

  /** The rule rows the FIGURE typesets. */
  function figureRules(lesson: LessonContent): string[] {
    return Array.from(renderAuthoredFigure(lesson).querySelectorAll("[data-latex]"))
      .map((node) => node.getAttribute("data-latex") ?? "")
      .filter(statesARule);
  }

  const POPULATION: readonly LessonContent[] = WITH_PARAMS.filter(
    (lesson) => promptRule(lesson).length > 0 && figureRules(lesson).length > 0,
  );

  /**
   * Members whose figure states rules of its own that are NOT the question's rule, with the
   * reason for each.
   *
   * `RAT.5`'s prompt span is a function DEFINITION rather than a rule to be rearranged, and the
   * one row of its figure that reads as a rule under the derivation above is the composite
   * ANSWER, `(4, 5) ; x = 1 ; y = 3`. Nothing in that figure is a rearrangement, so there is no
   * rule for it to restate; the symbol check below still applies to it and still passes.
   *
   * Asserted both ways. A listed pack that stops qualifying for the population fails, so a
   * renamed or deleted one cannot sit here exempting nothing, and a listed pack whose figure
   * starts printing its question's rule fails too, so the list cannot go on excusing something
   * it has stopped describing.
   */
  const NO_RULE_TO_RESTATE: readonly { node: string; why: string }[] = [
    {
      node: "RAT.5",
      why: "the prompt's math span defines a function rather than stating a rule to rearrange, and the figure's only rule-shaped row is the composite answer",
    },
    // D6's four entries share one shape, and it is the shape the derivation above cannot see: a
    // figure can state rule-shaped rows without REARRANGING the question's rule. LIN.3's figure
    // claimed to be `B = c + t - m` re-solved for `t`, so a row spelling the question's own rule
    // is what a learner needs to follow it. A figure that EVALUATES a rule, or applies it, is
    // not offering a rearrangement to be checked against the original, and requiring it to
    // reprint the definition would be a house style rather than a defect.
    {
      node: "FUN.3",
      why: "the task is to evaluate a piecewise charge at two loads, and each figure row states a branch together with the condition that selects it, so the rule is restated with its guard rather than on its own",
    },
    {
      node: "FUN.6",
      why: "the task is to simplify a difference quotient, so the figure substitutes into the rule and simplifies rather than rearranging it, and every row is about f(4 + h)",
    },
    {
      node: "FUN.7",
      why: "the task is to evaluate a composite at one input, so the figure unpacks (f o g)(5) to a number rather than rearranging either rule",
    },
    {
      node: "FUN.8",
      why: "the figure rearranges in the y-form its own slide teaches, writing y for f(x) before swapping, so the rule it restates is the taught spelling of the prompt's rather than the prompt's characters",
    },
  ];

  it("has a population, derived from the packs rather than listed", () => {
    expect(
      POPULATION.length,
      "no CFU pack states a rule and gets a figure that states one back",
    ).toBeGreaterThanOrEqual(5);
    // The exemption list cannot outgrow what it excuses.
    expect(NO_RULE_TO_RESTATE.length).toBeLessThan(POPULATION.length);
  });

  it.each(POPULATION.map((lesson) => lesson.node_id))(
    "%s's figure uses no quantity its question never introduced",
    (node) => {
      const lesson = POPULATION.find((entry) => entry.node_id === node);
      if (!lesson) {
        throw new Error(`${node} left the population mid-run`);
      }
      // What the LEARNER has been introduced to, which is the prompt AND the mini-lesson they
      // just read, not the prompt alone. Reading only the prompt made this assertion fire on
      // FUN.8, whose figure writes `y = \dfrac{x + 5}{4}` for the prompt's `f(x)`: its slide
      // teaches exactly that move, in words, as "Put $y = f(x)$, swap $x$ and $y$, then solve".
      // A figure using a letter the lesson hands the learner is not explaining a quantity out
      // of nowhere, so it is not this defect.
      //
      // This keeps the case the assertion was written for. LIN.3's `m` appears in neither its
      // prompt nor any paragraph of its slide -- the check baked the melt loss in as a literal
      // `2` -- so widening the set to the whole lesson leaves it stray, and the injection
      // recorded in the round's work-log confirms it still fails when reintroduced.
      const known = new Set<string>();
      for (const text of [lesson.cfu?.prompt ?? "", ...lesson.mini_lesson]) {
        for (const span of mathSpans(text)) {
          for (const symbol of symbolsIn(span)) {
            known.add(symbol);
          }
        }
      }
      // Not vacuous: a prompt stating a rule has named quantities in it by construction, and
      // this says so where it can fail.
      expect(known.size, `${node}: no quantity read out of the prompt`).toBeGreaterThan(1);
      for (const rule of figureRules(lesson)) {
        const stray = [...symbolsIn(rule)].filter((symbol) => !known.has(symbol)).sort();
        expect(
          stray,
          `${node}: the figure rearranges "${rule}", which uses ${stray.join(", ")} — a quantity the question never mentions. The question states "${promptRule(lesson)}"`,
        ).toEqual([]);
      }
    },
  );

  it.each(
    POPULATION.filter(
      (lesson) => !NO_RULE_TO_RESTATE.some((entry) => entry.node === lesson.node_id),
    ).map((lesson) => lesson.node_id),
  )("%s's figure states the question's rule as the question wrote it", (node) => {
    const lesson = POPULATION.find((entry) => entry.node_id === node);
    if (!lesson) {
      throw new Error(`${node} left the population mid-run`);
    }
    const wanted = flatten(promptRule(lesson));
    const shown = figureRules(lesson).map(flatten);
    expect(
      shown.some((rule) => rule === wanted),
      `${node}: the question states "${promptRule(lesson)}" and no row of its figure restates it. The figure states ${shown.join(" | ")}`,
    ).toBe(true);
  });

  it("names only packs that still state rules and still restate none of the question's", () => {
    for (const { node } of NO_RULE_TO_RESTATE) {
      const lesson = POPULATION.find((entry) => entry.node_id === node);
      expect(
        lesson,
        `${node} is excused from restating its question's rule but is no longer in the population`,
      ).toBeDefined();
      if (!lesson) {
        continue;
      }
      const wanted = flatten(promptRule(lesson));
      expect(
        figureRules(lesson).map(flatten).includes(wanted),
        `${node} is excused as having no rule to restate, but its figure now restates the question's rule, so the entry excuses nothing`,
      ).toBe(false);
    }
  });
});
