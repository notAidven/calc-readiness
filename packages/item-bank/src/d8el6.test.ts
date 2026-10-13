import { describe, expect, it } from "vitest";

import {
  d8_el6_exp_quadratic_l3,
  d8_el6_extraneous_l3,
  EL6_EXTRANEOUS_DRAWS,
  EL6_NODE,
  EL6_TEMPLATES,
  EXP_QUADRATIC_DRAWS,
} from "./d8/nodes/EL.6";
import { D8_PRACTICE_ITEMS, D8_PRACTICE_VARIANTS } from "./index";
import type { ItemTemplate, Rng } from "./template";

/**
 * EL.6's own gate, kept beside the node the way `d8el5.test.ts` is kept beside EL.5.
 *
 * What it exists for is the FORMAT EXAMPLE. Both L3 prompts show the learner the shape the
 * grader wants ("give the solution set ... such as ..."), and both drew that example from
 * inside their own parameter space, so on some draws the example WAS the key, character for
 * character. A learner who copies it is marked correct without doing the mathematics, and a
 * learner who does the mathematics and lands on it distrusts a right answer that looks like
 * boilerplate.
 *
 * Both spaces are small and fully enumerable (21 pairs and 15 quadruples), so this is proved
 * by ENUMERATION rather than by a sampling rate. `fixedDraw` pins `rng.pick` to one index, so
 * a sweep over `0 .. draws.length - 1` visits every draw exactly once; both shapes take a
 * single `pick` and nothing else, which is what makes that enumeration exact.
 *
 * That "single `pick` and nothing else" is asserted rather than trusted: the parameters the
 * enumeration produced are compared to the whole space as a set, so a shape that grew a
 * second draw fails here instead of sweeping one instance twenty-one times. And the property
 * is then re-run over the items a learner is actually SERVED, which is the surface the defect
 * was measured on, because a proof about a parameter space is only about the pool once the
 * pool is shown to be drawn from it.
 */

/**
 * A prompt with its `$...$` spans removed, which is the PROSE a learner reads around the
 * typeset question, and where a format example lives.
 *
 * The math is excluded rather than searched because a brace is ordinary LaTeX: `\log_{2}`
 * holds the literal characters `{2}` and renders as a subscript, so a raw substring test
 * over the whole prompt reports the base of the logarithm as a leaked solution set. It is
 * excluded and not ignored: {@link latexRoster} runs the same key over the math in the
 * spelling a roster would actually be typeset in.
 */
function proseOf(prompt: string): string {
  return prompt.replace(/\$[^$]*\$/g, " ");
}

/** How a roster key would be written if it were typeset: `{2, 3}` as `\{2, 3\}`. */
function latexRoster(answerKey: string): string {
  return answerKey.replace(/\{/g, "\\{").replace(/\}/g, "\\}");
}

/**
 * The ways a prompt can hand a learner its own key, or an empty list.
 *
 * A missing key is reported rather than skipped. Containment over an empty needle is true of
 * every string, so an item with no key would either be waved through or reported as leaking
 * everything; saying which it is keeps the sweep from being quietly satisfied by nothing.
 */
function keyLeaksIn(prompt: string, answerKey: string | undefined): string[] {
  if (answerKey === undefined || answerKey === "") {
    return ["has no answer key, so this prompt was never compared against one"];
  }
  const leaks: string[] = [];
  if (proseOf(prompt).includes(answerKey)) {
    leaks.push(`prose "${proseOf(prompt).trim()}" contains the key "${answerKey}"`);
  }
  if (answerKey.includes("{") && prompt.includes(latexRoster(answerKey))) {
    leaks.push(`math typesets the key as "${latexRoster(answerKey)}"`);
  }
  return leaks;
}

/** An `Rng` pinned to one entry of whatever list it is handed. */
function fixedDraw(index: number): Rng {
  return {
    int(minInclusive: number): number {
      return minInclusive;
    },
    pick<T>(items: readonly T[]): T {
      return items[index % items.length] as T;
    },
  };
}

/** The prompt, answer key and recorded parameters of the `index`-th draw of `template`. */
function drawnItem(
  template: ItemTemplate,
  index: number,
): { prompt: string; answerKey: string | undefined; params: Record<string, number> } {
  const rendered = template.generate(fixedDraw(index), { form: "practice" });
  return {
    prompt: rendered.prompt,
    answerKey: rendered.answer.answer_key,
    params: rendered.params,
  };
}

/** The `key`-joined identity of one drawn instance, for comparing a sweep against a space. */
function paramKey(params: Record<string, number>, fields: readonly string[]): string {
  return fields.map((field) => params[field]).join(":");
}

describe("EL.6 practice templates (solving exponential and logarithmic equations)", () => {
  it("authors five shapes under the real node id with d8.el6 ids", () => {
    expect(EL6_TEMPLATES).toHaveLength(5);
    for (const template of EL6_TEMPLATES) {
      expect(template.node_id, template.template_id).toBe(EL6_NODE);
      expect(template.template_id.startsWith("d8.el6."), template.template_id).toBe(true);
    }
  });
});

describe("EL.6 prompts never show the learner their own answer", () => {
  /**
   * What the two sweeps below rest on, and neither of which they can state themselves.
   *
   * The floors are what stop a sweep passing over an empty or a shrunken space: containment
   * holds trivially over nothing, so `leaks` is `[]` on a space of zero draws and the sweep
   * reports a clean green having measured no prompt at all. They are floors rather than pins
   * so a space may grow without an edit here.
   *
   * The COVERAGE assertion is the other half, and it is about the enumeration rather than
   * about the space. The sweeps index by `fixedDraw(index)`, which is only an enumeration for
   * as long as each shape takes a single `pick` and nothing else; a shape that grew a second
   * draw, or read `rng.int`, would go on running `EXP_QUADRATIC_DRAWS.length` times while
   * visiting a handful of distinct instances, and every prompt it never reached would be
   * swept in name only. So the parameters the enumeration actually produced are compared to
   * the whole space as a SET, which fails whichever way the two come apart.
   *
   * Deliberately NOT asserted here: that a served item's parameters are a member of the
   * space. Both the pool and this file read the same exported list, and the pool is generated
   * from it rather than frozen beside it, so that check cannot fail in either direction and
   * would be a guard with no opinion. What the served pool is worth asserting about is that
   * the shapes reach it at all, which is the count below, and that no item it serves leaks
   * its key, which is the last test in this file.
   */
  it("sweeps each L3 parameter space once per draw, and both shapes reach the pool", () => {
    expect(EXP_QUADRATIC_DRAWS.length, "exp-quadratic draws").toBeGreaterThanOrEqual(21);
    expect(EL6_EXTRANEOUS_DRAWS.length, "extraneous draws").toBeGreaterThanOrEqual(15);

    const quadraticSwept = new Set<string>();
    for (let index = 0; index < EXP_QUADRATIC_DRAWS.length; index += 1) {
      quadraticSwept.add(
        paramKey(drawnItem(d8_el6_exp_quadratic_l3, index).params, ["first", "second"]),
      );
    }
    expect(quadraticSwept, "the exp-quadratic sweep visits every draw").toEqual(
      new Set(EXP_QUADRATIC_DRAWS.map(([first, second]) => `${first}:${second}`)),
    );

    const extraneousSwept = new Set<string>();
    for (let index = 0; index < EL6_EXTRANEOUS_DRAWS.length; index += 1) {
      extraneousSwept.add(
        paramKey(drawnItem(d8_el6_extraneous_l3, index).params, [
          "base",
          "exponent",
          "kept",
          "rejected",
        ]),
      );
    }
    expect(extraneousSwept, "the extraneous sweep visits every draw").toEqual(
      new Set(
        EL6_EXTRANEOUS_DRAWS.map(
          ([base, exponent, kept, rejected]) => `${base}:${exponent}:${kept}:${rejected}`,
        ),
      ),
    );

    const served = [...D8_PRACTICE_ITEMS, ...D8_PRACTICE_VARIANTS];
    expect(
      served.filter((item) => item.template_id === "d8.el6.exp-quadratic.l3").length,
      "exp-quadratic items ship",
    ).toBeGreaterThanOrEqual(7);
    expect(
      served.filter((item) => item.template_id === "d8.el6.extraneous.l3").length,
      "extraneous items ship",
    ).toBeGreaterThanOrEqual(7);
  });

  it("shows no exp-quadratic draw its own solution set, over the WHOLE space", () => {
    const leaks: string[] = [];
    for (let index = 0; index < EXP_QUADRATIC_DRAWS.length; index += 1) {
      const { prompt, answerKey } = drawnItem(d8_el6_exp_quadratic_l3, index);
      leaks.push(...keyLeaksIn(prompt, answerKey).map((why) => `draw ${index}: ${why}`));
    }
    expect(leaks).toEqual([]);
  });

  it("shows no extraneous-root draw its own solution set, over the WHOLE space", () => {
    const leaks: string[] = [];
    for (let index = 0; index < EL6_EXTRANEOUS_DRAWS.length; index += 1) {
      const { prompt, answerKey } = drawnItem(d8_el6_extraneous_l3, index);
      leaks.push(...keyLeaksIn(prompt, answerKey).map((why) => `draw ${index}: ${why}`));
    }
    expect(leaks).toEqual([]);
  });

  /**
   * The same property over the items a learner is actually SERVED, which is the surface the
   * defect was measured on: two of the thirteen L3 items in one served pool handed back their
   * own key. The sweep above is the proof; this is the population it is a proof about.
   */
  it("shows no SERVED EL.6 item its own answer key", () => {
    const served = [
      ...new Map(
        [...D8_PRACTICE_ITEMS, ...D8_PRACTICE_VARIANTS]
          .filter((item) => item.node_id === EL6_NODE)
          .map((item) => [item.item_version_id, item] as const),
      ).values(),
    ];
    expect(served.length, "EL.6 items ship").toBeGreaterThanOrEqual(35);
    const leaks = served.flatMap((item) =>
      keyLeaksIn(item.prompt, item.answer.answer_key).map(
        (why) => `${item.item_version_id}: ${why}`,
      ),
    );
    expect(leaks).toEqual([]);
  });
});
