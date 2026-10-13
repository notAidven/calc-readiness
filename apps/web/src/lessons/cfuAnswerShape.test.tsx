/**
 * Whether a check ever asks for the answer SHAPE its own node spends half its slides on.
 *
 * LIN.6 is the case this was written for. Its prose says the discrimination IS the node --
 * *"Which of the two shapes an answer takes is settled entirely by which way the inequality sign
 * points"* -- and both of the questions its check could serve resolved to `d3.lin6.band.l1`, the
 * towards-the-bars shape. A learner could fail the check, take the reveal, pass the re-ask and
 * never once produce a union, so the one measurement the node takes of the discrimination never
 * takes it.
 *
 * ## The population is the behaviour's, not LIN.6's
 *
 * Scoping this to LIN.6 would be scoping a guard to the instance that was reported. What makes a
 * check able to have this defect is that its NODE teaches a split between a one-piece answer and
 * a two-piece one, and that is a fact about the node's practice pool rather than about its pack:
 * a pool serving both shapes is a node whose author decided the split is worth practising. So the
 * population is derived by generating from every pool template and counting the disjoint pieces
 * its keys name. Measured at the time of writing that is two nodes, LIN.4 and LIN.6, out of 48
 * checks -- which is the point of deriving it. A derivation that returned all 48 would be as
 * broken as one that returned none, so both ends are floored below.
 */

import { createProductAnswerChecker, PRODUCT_CHECKER_VERSION } from "@cr/components";
import {
  D1_PRACTICE_TEMPLATES,
  D2_PRACTICE_TEMPLATES,
  D3_PRACTICE_TEMPLATES,
  D4_PRACTICE_TEMPLATES,
  D5_PRACTICE_TEMPLATES,
  D7_PRACTICE_TEMPLATES,
  D8_PRACTICE_TEMPLATES,
  D9_PRACTICE_TEMPLATES,
  D10_PRACTICE_TEMPLATES,
  generateFromTemplate,
  type ItemTemplate,
  toProductItemVersions,
} from "@cr/item-bank";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { gradeCfuAnswer } from "./cfuChecker";
import { cfuInstances, cfuSpell } from "./cfuVariants";
import { allLessons } from "./domains";
import { assertedStrings, flatten, namesToken } from "./figureAnswerFixture";
import type { LessonCfuSpec } from "./types";
import { WorkedSolution } from "./WorkedSolution";

const POOL: readonly ItemTemplate[] = [
  ...D1_PRACTICE_TEMPLATES,
  ...D2_PRACTICE_TEMPLATES,
  ...D3_PRACTICE_TEMPLATES,
  ...D4_PRACTICE_TEMPLATES,
  ...D5_PRACTICE_TEMPLATES,
  ...D7_PRACTICE_TEMPLATES,
  ...D8_PRACTICE_TEMPLATES,
  ...D9_PRACTICE_TEMPLATES,
  ...D10_PRACTICE_TEMPLATES,
];

const CHECKS = allLessons
  .filter((lesson) => lesson.cfu !== undefined)
  .map((lesson) => [lesson.node_id, lesson.cfu as LessonCfuSpec] as const);

/** Draws per template when deriving what shapes a node's pool serves. */
const DRAWS = 40;

/**
 * How many disjoint pieces an answer names, or `0` when it names no range at all.
 *
 * Notation-blind on purpose. The split LIN.6 teaches is one stretch against two, and it is the
 * same split whether the answer is written as intervals joined by a union or as a set-builder
 * condition joined by the word `or`, so a classifier keyed on brackets would call the node's
 * hardest template one-piece and miss half of what it serves.
 */
export function piecesNamed(answer: string): number {
  const value = answer.trim();
  if (/^\{.*\|.*\}$/.test(value)) {
    return /\bor\b/i.test(value) ? 2 : 1;
  }
  const joined = value.split(/\s*(?:U|\u222a|\bor\b)\s*/i);
  const bracketed = joined.filter((piece) => /^[([].*[)\]]$/.test(piece.trim()));
  return bracketed.length;
}

/** Every node whose own practice pool serves BOTH a one-piece answer and a two-piece one. */
const SPLIT_NODES: readonly string[] = (() => {
  const shapes = new Map<string, Set<number>>();
  for (const template of POOL) {
    const seen = shapes.get(template.node_id) ?? new Set<number>();
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const item = generateFromTemplate(template, "practice", 4000 + draw);
      seen.add(piecesNamed(item.answer.answer_key ?? ""));
    }
    shapes.set(template.node_id, seen);
  }
  return [...shapes]
    .filter(([, seen]) => seen.has(1) && seen.has(2))
    .map(([nodeId]) => nodeId)
    .sort();
})();

/** The population: checks on a node whose pool teaches a one-piece / two-piece split. */
const SPLIT_CHECKS = CHECKS.filter(([nodeId]) => SPLIT_NODES.includes(nodeId));

/**
 * Members of that population that still have the defect, each with why it was not fixed.
 *
 * Not an exemption: every entry here OWES the property and does not have it. The list exists
 * because a member that was judged and left and a member nobody looked at are indistinguishable
 * from a sweep that quietly excludes both, and because a guard that cannot ship red cannot be a
 * guard. It is asserted in both directions below, so an entry that gets fixed fails and has to be
 * removed, and an entry whose node stops teaching the split fails too.
 *
 * Empty, and the emptiness is what the sweep under it is now over the whole population. There was
 * one entry, LIN.4, and direction two is what took it off rather than a decision to tidy up: the
 * pack's re-ask now serves a union, so the entry failed with *"LIN.4 now asks both shapes, so it
 * is fixed and must come off the outstanding list"*. What it was waiting for is worth keeping,
 * because it is the reason the fix was not a one-line swap. LIN.4's only two-piece shape was
 * `d3.lin4.compound-or.l3` at difficulty 3, against the check's own difficulty 2, so pointing the
 * re-ask at it would have handed a learner who had just missed the question a strictly harder one.
 * `d3.lin4.compound-or.l2` was authored for this: the same two-piece answer at one move per half
 * against the L3's two.
 */
const NOT_ASKED_YET: readonly { node: string; reason: string }[] = [];

const OWED_NOW = SPLIT_CHECKS.filter(
  ([nodeId]) => !NOT_ASKED_YET.some((entry) => entry.node === nodeId),
);

describe("a check asks the shape split its node teaches", () => {
  it("derives its population from the pools, and the derivation is neither empty nor everything", () => {
    expect(
      SPLIT_NODES.length,
      "no node's pool serves both a one-piece and a two-piece answer, so every assertion below is vacuous",
    ).toBeGreaterThanOrEqual(2);
    // The other end. A classifier that had started calling every answer two-piece would derive
    // the whole tree and look like the widest possible sweep while measuring nothing.
    expect(
      SPLIT_CHECKS.length,
      "every check in the tree derived into this population, so the classifier has stopped discriminating",
    ).toBeLessThan(CHECKS.length / 2);
    expect(
      SPLIT_CHECKS.length,
      "the split nodes have no checks, so this file grades nothing",
    ).toBeGreaterThanOrEqual(2);
  });

  it("the outstanding list has not swallowed the population it is an exception to", () => {
    expect(
      OWED_NOW.length,
      "every check on a split node is declared outstanding, so nothing below is actually asserted",
    ).toBeGreaterThanOrEqual(1);
  });

  // A loop rather than `it.each`, because a list that emptied would emit no tests and the file
  // would report green over an inventory nobody is checking.
  it("every outstanding entry is a real one that still has the defect", () => {
    const wrong: string[] = [];
    for (const { node, reason } of NOT_ASKED_YET) {
      const cfu = SPLIT_CHECKS.find(([id]) => id === node)?.[1];
      // Direction one: a node that stops teaching the split, or stops having a check, cannot sit
      // here forever excusing nothing.
      if (cfu === undefined) {
        wrong.push(
          `${node} is declared outstanding but is not a check on a node whose pool teaches the split`,
        );
        continue;
      }
      if (reason.length <= 60) {
        wrong.push(`${node}'s reason is too short to act on`);
      }
      // Direction two: a node that gets fixed has to come off, or the list goes on describing a
      // defect the tree no longer has and hides the next one that arrives.
      const served = new Set(
        cfuInstances(cfu).map((instance) => piecesNamed(instance.accepted[0] ?? "")),
      );
      if (served.has(1) && served.has(2)) {
        wrong.push(
          `${node} now asks both shapes, so it is fixed and must come off the outstanding list`,
        );
      }
    }
    expect(wrong.join("\n")).toBe("");
    // Nothing is outstanding, so the per-member sweep below is the whole population. Pinning the
    // emptiness makes the next exemption a deliberate edit here rather than a line that quietly
    // turns that sweep into a subset of it.
    expect(NOT_ASKED_YET).toEqual([]);
  });

  it.each(OWED_NOW.map(([nodeId]) => nodeId))(
    "%s serves both a one-piece answer and a two-piece one across its questions",
    (nodeId) => {
      const cfu = OWED_NOW.find(([id]) => id === nodeId)?.[1] as LessonCfuSpec;
      const served = cfuInstances(cfu).map((instance) =>
        piecesNamed(instance.accepted[0] ?? ""),
      );
      expect(
        served.filter((count) => count > 0).length,
        `${nodeId}: no question this check can ask has an answer naming a range at all`,
      ).toBeGreaterThan(1);
      expect(
        new Set(served),
        `${nodeId}: every question this check can ask answers in ${served[0]} piece(s), so the learner passes the node without ever producing the other shape it teaches. Served: ${cfuInstances(
          cfu,
        )
          .map((instance) => instance.answerKey)
          .join(" // ")}`,
      ).toEqual(new Set([1, 2]));
    },
  );
});

/**
 * Every question in the tree whose answer is a union, with the instance index it is served at.
 *
 * Derived rather than named, so a second pack adopting the shape is swept without an edit, and
 * floored below because both sweeps under it are per-member and an empty list emits no tests.
 */
const UNION_QUESTIONS: readonly {
  nodeId: string;
  cfu: LessonCfuSpec;
  index: number;
}[] = CHECKS.flatMap(([nodeId, cfu]) =>
  cfuInstances(cfu).flatMap((instance, index) =>
    piecesNamed(instance.accepted[0] ?? "") === 2 &&
    /[U\u222a]|\bor\b/i.test(instance.answerKey)
      ? [{ nodeId, cfu, index }]
      : [],
  ),
);

describe("a union answer grades and its figure can be read back", () => {
  it("found the union questions to sweep", () => {
    expect(
      UNION_QUESTIONS.length,
      "no check in the tree answers with a union, so both sweeps below run over nothing",
    ).toBeGreaterThanOrEqual(1);
  });

  it.each(UNION_QUESTIONS.map(({ nodeId, index }) => `${nodeId}#${index}`))(
    "%s: every spelling the speller offers is graded correct by the path the card takes",
    (label) => {
      const found = UNION_QUESTIONS.find(
        ({ nodeId, index }) => `${nodeId}#${index}` === label,
      );
      if (!found) {
        throw new Error(`no union question ${label}`);
      }
      const { nodeId, cfu, index } = found;
      const instance = cfuInstances(cfu)[index];
      const accepted = instance?.accepted ?? [];
      expect(accepted.length, `${label}: the speller offered nothing`).toBeGreaterThan(2);
      const refused = accepted.filter(
        (form) => !gradeCfuAnswer({ nodeId, cfu, index, value: form }).correct,
      );
      expect(
        refused,
        `${label}: these spellings are offered by the speller and refused by the card`,
      ).toEqual([]);
      // The join is the axis this shape adds, so it is asserted rather than left to the count:
      // a list of three infinity spellings all joined by ` U ` would clear the floor above.
      for (const join of [" U ", "\u222a", " or "]) {
        expect(
          accepted.some((form) => form.toLowerCase().includes(join.toLowerCase())),
          `${label}: no accepted spelling joins the two pieces with "${join.trim()}", which some surface of this node teaches`,
        ).toBe(true);
      }
    },
  );

  /**
   * The same spellings, against the REAL checker on the REAL items the template freezes.
   *
   * The sweep above is worth less than it reads. LIN.6's pack declares no `check` block, so
   * `gradeCfuAnswer` grades it by asking whether the typed string is in the instance's own
   * accepted list -- and the list under test IS that list, so every member passes by
   * construction. Injecting `(-inf, 14) U (26, inf)` into the speller's output for a key of
   * `(-inf, 15) U (25, inf)` left the file at `8 passed`: an answer naming the wrong two rays
   * was graded correct because the speller had said so.
   *
   * The template is a POOL template, though, and the practice card grades it through the v2
   * product checker against a real frozen `interval` definition, which parses rather than
   * matches. So each spelling is graded there too, over freshly generated draws rather than the
   * one seed the CFU happened to land on -- which is what makes this an assertion about the
   * speller instead of about a seed. That is also the surface the brief's two recent checker
   * changes live on: the tight join now grades, and a two-element set spelled as an interval
   * no longer does.
   */
  const UNION_TEMPLATES: readonly ItemTemplate[] = [
    ...new Set(
      UNION_QUESTIONS.map(({ cfu, index }) => cfuInstances(cfu)[index]?.templateId),
    ),
  ].flatMap((templateId) => POOL.filter((template) => template.template_id === templateId));

  it("the union spellings are checked against real pool items, not just the card's own list", () => {
    expect(
      UNION_TEMPLATES.length,
      "no union question is served by a pool template, so the real-checker sweep below runs over nothing",
    ).toBeGreaterThanOrEqual(1);
  });

  it.each(UNION_TEMPLATES.map((template) => template.template_id))(
    "%s: every spelling grades through the v2 product checker on the items it freezes",
    (templateId) => {
      const template = UNION_TEMPLATES.find((each) => each.template_id === templateId);
      if (!template) {
        throw new Error(`no template ${templateId}`);
      }
      const wrong: string[] = [];
      let graded = 0;
      for (let draw = 0; draw < 12; draw += 1) {
        const item = generateFromTemplate(template, "practice", 6100 + draw);
        const key = item.answer.answer_key ?? "";
        const spellings = cfuSpell(templateId, item.template_params, key) ?? [];
        if (spellings.length === 0) {
          wrong.push(`seed ${6100 + draw}: the speller offered nothing for "${key}"`);
          continue;
        }
        const checker = createProductAnswerChecker({
          itemVersions: toProductItemVersions([item]),
        });
        for (const form of spellings) {
          graded += 1;
          const result = checker({
            raw_answer: form,
            item_version_id: item.item_version_id,
            equivalence_checker_version: PRODUCT_CHECKER_VERSION,
          });
          if (result.status !== "correct") {
            wrong.push(
              `key "${key}" is spelled "${form}" by the speller and graded ${result.status} (${result.reason_code ?? "no reason"}) by the checker`,
            );
          }
        }
      }
      expect(graded, `${templateId}: nothing was graded`).toBeGreaterThan(24);
      expect(wrong.join("\n")).toBe("");
    },
  );

  it.each(UNION_QUESTIONS.map(({ nodeId, index }) => `${nodeId}#${index}`))(
    "%s: the revealed figure states the union the learner is asked to type",
    (label) => {
      const found = UNION_QUESTIONS.find(
        ({ nodeId, index }) => `${nodeId}#${index}` === label,
      );
      if (!found) {
        throw new Error(`no union question ${label}`);
      }
      const instance = cfuInstances(found.cfu)[found.index];
      if (!instance) {
        throw new Error(`no instance ${label}`);
      }
      const { container } = render(
        <WorkedSolution
          templateId={instance.templateId}
          params={instance.params}
          steps={[...instance.workedSolution]}
        />,
      );
      const shown = assertedStrings(container).map(flatten);
      expect(shown.length, `${label}: the figure asserts nothing at all`).toBeGreaterThan(
        0,
      );
      const answer = flatten(instance.answerKey);
      expect(
        shown.some((string) => namesToken(string, answer)),
        `${label}: the figure never states "${instance.answerKey}". It shows ${shown.join(" | ")}`,
      ).toBe(true);
    },
  );
});

describe("a union figure can be read back against a typed union answer", () => {
  it("flatten maps the union command onto the letter a learner types", () => {
    // `\cup` used to fall to the sweep that drops unrecognised commands, so a figure printing
    // `(-\infty, 15) \cup (25, \infty)` read back as `(-inf,15)(25,inf)` -- a string in which the
    // typed `(-inf, 15) U (25, inf)` cannot be found. Nothing caught it because no check had a
    // union answer until LIN.6's re-ask became one.
    expect(flatten("(-\\infty, 15) \\cup (25, \\infty)")).toBe(
      flatten("(-inf, 15) U (25, inf)"),
    );
    expect(flatten("(-\\infty, -1] \\cup [5, \\infty)")).toBe(
      flatten("(-inf, -1] U [5, inf)"),
    );
    // The glyph a learner may paste is the same claim from the other side.
    expect(flatten("(-inf, 15) \u222a (25, inf)")).toBe(flatten("(-inf, 15) U (25, inf)"));
  });
});
