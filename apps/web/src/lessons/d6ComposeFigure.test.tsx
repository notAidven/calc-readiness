/**
 * FUN.7's check and FUN.7's practice pool ask one question, so they draw one figure.
 *
 * The check `cfu.fun7.compose-evaluate` prints a linear $f$, a square $g$ and $(f \circ g)$ at
 * a number. That is `d6.fun7.order-value.l2` with its `order` pinned, and a learner who has
 * worked the node's practice cards has already seen the answer to it drawn as a two-box chain.
 * The check used to answer it with a reduction column instead: not wrong, and not the same
 * picture, so the two reveals had to be recognised as one argument before the second was worth
 * anything.
 *
 * Registering the same component is a code fact, and this is the assertion that makes it a
 * rendered one: both figures are drawn, over the pack's own two questions and six generator
 * draws, and their SVG markup is compared byte for byte.
 *
 * INJECTED RED BY: setting `order: 1` on the check's entry in `worked/cfuD6.tsx`, which fails
 * at *"cfu.fun7.compose-evaluate must draw the same figure as d6.fun7.order-value.l2"* on every
 * one of the eight param sets. A weaker version of this file, comparing nothing but that both
 * rendered SOME svg, passes that injection unchanged.
 */

import { createRng } from "@cr/item-bank";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CFU_ONLY_TEMPLATE_LIST, cfuAsk } from "./cfuVariants";
import { allLessons } from "./domains";
import { getWorkedSolutionVisual } from "./workedSolutionVisuals";

/** The check whose figure is borrowed, and the practice template it is borrowed from. */
const CHECK = "cfu.fun7.compose-evaluate";
const PRACTICE = "d6.fun7.order-value.l2";

/**
 * The order the check's prompt always writes: the square acts first, the line acts on what it
 * hands over. The practice template rotates this and the check does not, which is the one
 * parameter the borrowing has to pin.
 */
const CHECK_ORDER = 0;

/** How many generator draws to compare, beyond the pack's own two questions. */
const DRAWS = 6;

/** One figure's SVG, rendered and serialised. */
function markup(templateId: string, params: Record<string, number>): string {
  const visual = getWorkedSolutionVisual(templateId);
  if (visual === undefined) {
    throw new Error(`${templateId} has no registered figure`);
  }
  const { container, unmount } = render(visual.Svg(params));
  const svg = container.querySelector("svg");
  if (svg === null) {
    throw new Error(`${templateId} rendered no svg`);
  }
  const html = svg.outerHTML;
  unmount();
  return html;
}

/** The param sets the two figures are compared over: the pack's own, then the generator's. */
function paramSets(): { where: string; params: Record<string, number> }[] {
  const pack = allLessons.find((lesson) => lesson.node_id === "FUN.7")?.cfu;
  if (pack === undefined) {
    throw new Error("no FUN.7 CFU pack");
  }
  const sets = [0, 1].map((index) => {
    const ask = cfuAsk(pack, index);
    return {
      where: `FUN.7 pack question ${index + 1}${ask.authored ? " (authored)" : " (re-ask)"}`,
      params: ask.params,
    };
  });
  const template = CFU_ONLY_TEMPLATE_LIST.find((entry) => entry.template_id === CHECK);
  if (template === undefined) {
    throw new Error(`${CHECK} is not a bespoke CFU template`);
  }
  for (let draw = 0; draw < DRAWS; draw += 1) {
    sets.push({
      where: `${CHECK} draw ${draw}`,
      params: template.generate(createRng(7_000_019 + draw * 131)).params,
    });
  }
  return sets;
}

describe("FUN.7's check reveals the practice pool's own composition figure", () => {
  const sets = paramSets();

  it("compares over both of the pack's questions and six generator draws", () => {
    // A floor under the population, because the equality below holds trivially over an empty
    // list of param sets and would then say nothing about either figure.
    expect(sets.length, "the param-set population collapsed").toBe(2 + DRAWS);
    expect(sets.map((set) => set.where)).toContain("FUN.7 pack question 1 (authored)");
    for (const set of sets) {
      expect(Object.keys(set.params).length, set.where).toBeGreaterThanOrEqual(4);
    }
  });

  it.each(sets.map((set) => [set.where, set] as const))(
    "%s draws the same figure on both surfaces",
    (_where, set) => {
      const fromCheck = markup(CHECK, set.params);
      const fromPractice = markup(PRACTICE, { ...set.params, order: CHECK_ORDER });
      expect(
        fromCheck,
        `${CHECK} must draw the same figure as ${PRACTICE} at ${JSON.stringify(set.params)}`,
      ).toBe(fromPractice);
      // And the comparison has teeth: the markup moves when the parameters do, so an equality
      // between two figures is a claim about what was drawn rather than about two blanks.
      expect(fromCheck.length, "the figure rendered almost nothing").toBeGreaterThan(500);
      expect(
        markup(PRACTICE, { ...set.params, order: 1 }),
        "the practice figure ignores its own order flag, so the equality above is free",
      ).not.toBe(fromPractice);
    },
  );

  /**
   * The value the check is graded on, printed on the borrowed figure. A figure can be
   * identical to another one and still be the wrong picture for this prompt; this is the part
   * that says it answers the question it now sits under.
   */
  it("names the answer the check grades, on every param set", () => {
    for (const set of sets) {
      const a = set.params.a ?? 0;
      const k = set.params.k ?? 0;
      const n = set.params.n ?? 0;
      const b = set.params.b ?? 0;
      const value = a * (n * n + k) + b;
      expect(markup(CHECK, set.params), `${set.where} never names ${value}`).toContain(
        `= ${value}`,
      );
    }
  });
});
