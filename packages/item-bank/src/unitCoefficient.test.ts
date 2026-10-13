import { describe, expect, it } from "vitest";

import {
  D1_PRACTICE_ITEMS,
  D1_PRACTICE_TEMPLATES,
  D1_PRACTICE_VARIANTS,
  D2_PRACTICE_ITEMS,
  D2_PRACTICE_TEMPLATES,
  D2_PRACTICE_VARIANTS,
  D3_PRACTICE_ITEMS,
  D3_PRACTICE_TEMPLATES,
  D3_PRACTICE_VARIANTS,
  D4_PRACTICE_ITEMS,
  D4_PRACTICE_TEMPLATES,
  D4_PRACTICE_VARIANTS,
  D5_PRACTICE_ITEMS,
  D5_PRACTICE_TEMPLATES,
  D5_PRACTICE_VARIANTS,
  D6_PRACTICE_ITEMS,
  D6_PRACTICE_TEMPLATES,
  D6_PRACTICE_VARIANTS,
  D7_PRACTICE_ITEMS,
  D7_PRACTICE_TEMPLATES,
  D7_PRACTICE_VARIANTS,
  D8_PRACTICE_ITEMS,
  D8_PRACTICE_TEMPLATES,
  D8_PRACTICE_VARIANTS,
  D9_PRACTICE_ITEMS,
  D9_PRACTICE_TEMPLATES,
  D9_PRACTICE_VARIANTS,
  D10_PRACTICE_ITEMS,
  D10_PRACTICE_TEMPLATES,
  D10_PRACTICE_VARIANTS,
  INTERACTIVE_PRACTICE_ITEMS,
  INTERACTIVE_PRACTICE_VARIANTS,
  INTERACTIVE_TEMPLATES,
  PRODUCT_ITEM_PACK,
  PRODUCT_TEMPLATES,
} from "./index";
import { PRACTICE_WALK_ITEM_PACK } from "./practice-walk";
import { type FrozenItem, generateFromTemplate, type ItemTemplate } from "./template";

/**
 * NO ITEM IN THE BANK PRINTS A COEFFICIENT OF ONE AGAINST A VARIABLE.
 *
 * `1x` is not a spelling this curriculum uses, and that is a ruling rather than a preference:
 * `content/lessons/d1/NUM.4.json` teaches that a coefficient of one "is written by leaving it
 * off", so a generator that prints it contradicts the lesson a learner just read.
 *
 * ## Why this sweep is not scoped to a domain
 *
 * It used to be. The version of this in `d4.test.ts` swept `D4_PRACTICE_TEMPLATES`, on the
 * reasoning that D4's prompts are built from the `coeff`/`signedTerm` pair in
 * `d4/nodes/_shared.ts` and so are the only ones making the promise. That reasoning scoped the
 * population to an IMPLEMENTATION -- who imports the shared printer -- while the defect belongs
 * to any generator that interpolates a drawn coefficient, which is most of them.
 *
 * Measured at `0cc0df9` over 342 templates x 4,000 seeds: six templates in five domains were
 * printing one, none of them D4. `d3.lin1.both-sides.l2` reached it on 25.4% of draws, reading
 * *"Solve for $x$: $5x - 6 = 1x - 30$"*. The D4-scoped sweep was green over every one of them.
 *
 * ## Why the surface includes the answer key
 *
 * The same measurement found the defect live INSIDE D4, past the end of the old sweep's reach:
 * `d4.pol8.synthetic-cubic.l2` keyed `x^2 + 1x + 5` on 14.8% of draws while its own worked
 * solution printed `x^{2} + x + 5`. Widening the population without widening the surface would
 * have left that standing, so the key is swept beside the prose. There is no `parts` or
 * `choices` field on `FrozenItem` to sweep; `prompt`, `hints`, `worked_solution` and
 * `answer.answer_key` are the whole learner-visible surface an item carries.
 *
 * ## Both widenings were shown red before they were trusted
 *
 * A guard written green may be asserting nothing, so each half was made to fail on purpose.
 * Reverting `d5/nodes/RAT.5`'s suppressor fails the first case at *"d5.rat5.level.l2 (prompt):
 * ... $\dfrac{5x^{2} + 1x + 2}{7x^{2} + 1}$"*, which is the POPULATION widening biting outside
 * D4. Reverting `d4/nodes/POL.8`'s key fails it at *"d4.pol8.synthetic-cubic.l2 (answer key):
 * x^2 + 1x + 6"* and fails the served case at *"practice walk
 * d4.pol8.synthetic-cubic.l2:A:1602001 (answer key): x^2 - 1x - 1"*, which is the SURFACE
 * widening biting inside D4 -- and the second line is also why `PRACTICE_WALK_ITEM_PACK` is in
 * `SERVED_SOURCES` rather than left to the domain pools.
 *
 * ## What this sweep cannot see
 *
 * Item-bank output only. `apps/web/src/lessons/interactive/SyntheticLongMatch.tsx` displays
 * `1x^{2}` deliberately, because the exercise matches a synthetic-division row against a
 * long-division layout that writes that line out, and no sweep reaches it. It is recorded here
 * rather than in an exception list, because a list excusing something no assertion would have
 * caught excuses nothing. The figures rendered beside D4's reveals are covered separately, by
 * `apps/web/src/lessons/workedSolutionArithmetic.test.tsx`, which can render and this cannot.
 */

const DRAWS = 400;

/**
 * A `1` that is a printed unit coefficient: not part of a longer number, not a decimal's digit,
 * not the tail of a LaTeX escape, and immediately against a letter.
 *
 * The old D4 pattern looked ahead to `[xy]` alone, its note explaining that `[a-z]` would fire
 * on the `1s` of an ordinal. Two things changed. `d6/nodes/FUN.1` names its variables
 * `["x", "t", "n", "s"]`, so `1s` is a real unit coefficient and restricting to `[xy]` would
 * miss it; and the ordinals can be excluded precisely instead of by narrowing the letter class,
 * which is what the negative lookahead does. Measured over 1,392,000 draws, no ordinal fires.
 *
 * Deliberately NOT extended to LaTeX macros such as `1\theta`. That branch was measured too: it
 * caught nothing real and produced 57 false positives on `1\right`, which is `\left(1\right)`
 * rendering as `(1)`. An assertion whose only demonstrated matches are false ones is not
 * carrying its weight, so the limit is recorded here instead of guessed at in the pattern.
 */
const UNIT_COEFFICIENT = /(?<![\d.\\])1(?=[a-zA-Z])(?!(?:st|nd|rd|th)\b)/;

/**
 * The population, named source by source rather than taken from one convenient aggregate.
 *
 * `ALL_PRACTICE_TEMPLATES` in `practice-walk.ts` is the aggregate that looks right and is not:
 * it spreads the ten domain arrays and stops, so `PRODUCT_TEMPLATES` and `INTERACTIVE_TEMPLATES`
 * would have been swept by nothing. The three `*_EXTRA_PRACTICE_TEMPLATES` arrays need no entry
 * of their own -- each domain's main array already spreads its own extras -- and the dedupe
 * below means adding one would be harmless if that ever stops being true.
 */
const TEMPLATE_SOURCES: readonly (readonly [string, readonly ItemTemplate[]])[] = [
  ["d1", D1_PRACTICE_TEMPLATES],
  ["d2", D2_PRACTICE_TEMPLATES],
  ["d3", D3_PRACTICE_TEMPLATES],
  ["d4", D4_PRACTICE_TEMPLATES],
  ["d5", D5_PRACTICE_TEMPLATES],
  ["d6", D6_PRACTICE_TEMPLATES],
  ["d7", D7_PRACTICE_TEMPLATES],
  ["d8", D8_PRACTICE_TEMPLATES],
  ["d9", D9_PRACTICE_TEMPLATES],
  ["d10", D10_PRACTICE_TEMPLATES],
  ["product", PRODUCT_TEMPLATES],
  ["interactive", INTERACTIVE_TEMPLATES],
];

/** Every frozen list a learner can actually be served from. */
const SERVED_SOURCES: readonly (readonly [string, readonly FrozenItem[]])[] = [
  ["d1 pool", D1_PRACTICE_ITEMS],
  ["d1 variants", D1_PRACTICE_VARIANTS],
  ["d2 pool", D2_PRACTICE_ITEMS],
  ["d2 variants", D2_PRACTICE_VARIANTS],
  ["d3 pool", D3_PRACTICE_ITEMS],
  ["d3 variants", D3_PRACTICE_VARIANTS],
  ["d4 pool", D4_PRACTICE_ITEMS],
  ["d4 variants", D4_PRACTICE_VARIANTS],
  ["d5 pool", D5_PRACTICE_ITEMS],
  ["d5 variants", D5_PRACTICE_VARIANTS],
  ["d6 pool", D6_PRACTICE_ITEMS],
  ["d6 variants", D6_PRACTICE_VARIANTS],
  ["d7 pool", D7_PRACTICE_ITEMS],
  ["d7 variants", D7_PRACTICE_VARIANTS],
  ["d8 pool", D8_PRACTICE_ITEMS],
  ["d8 variants", D8_PRACTICE_VARIANTS],
  ["d9 pool", D9_PRACTICE_ITEMS],
  ["d9 variants", D9_PRACTICE_VARIANTS],
  ["d10 pool", D10_PRACTICE_ITEMS],
  ["d10 variants", D10_PRACTICE_VARIANTS],
  ["interactive pool", INTERACTIVE_PRACTICE_ITEMS],
  ["interactive variants", INTERACTIVE_PRACTICE_VARIANTS],
  ["product pack", PRODUCT_ITEM_PACK],
  ["practice walk", PRACTICE_WALK_ITEM_PACK],
];

interface Owned {
  source: string;
  template: ItemTemplate;
}

/** The deduped population, each template attributed to the first source that offered it. */
function population(): readonly Owned[] {
  const seen = new Set<string>();
  const owned: Owned[] = [];
  for (const [source, templates] of TEMPLATE_SOURCES) {
    for (const template of templates) {
      if (seen.has(template.template_id)) {
        continue;
      }
      seen.add(template.template_id);
      owned.push({ source, template });
    }
  }
  return owned;
}

const POPULATION = population();

/**
 * The three shapes an answer takes here, read through a cast because `answer` is a union and
 * only some members declare each field. The same cast is in
 * `apps/web/src/lessons/answerKeypad.test.ts` for the same reason.
 *
 * All three matter to the surface. A plain key is the ordinary case; `parts` is a MULTIPART item
 * whose keys sit one level down, which is where `prod.trg-2.l2` keeps its three special-angle
 * values; and `interactive_spec` is an answer that is built or dragged and has no key string at
 * all. Reading only the first would have left the multipart keys unswept.
 */
interface AnswerShape {
  answer_key?: string;
  interactive_spec?: unknown;
  parts?: readonly { part_id: string; answer: { answer_key?: string } }[];
}

/** Every key an item is graded against, its own and its parts', labelled by where it sits. */
function keySurfaces(item: FrozenItem): readonly (readonly [string, string])[] {
  const answer = item.answer as AnswerShape;
  const out: (readonly [string, string])[] = [];
  if (typeof answer.answer_key === "string") {
    out.push(["answer key", answer.answer_key] as const);
  }
  for (const part of answer.parts ?? []) {
    if (typeof part.answer.answer_key === "string") {
      out.push([`part ${part.part_id} key`, part.answer.answer_key] as const);
    }
  }
  return out;
}

/** Every learner-visible string an item carries, each labelled by where it sits. */
function learnerVisible(item: FrozenItem): readonly (readonly [string, string])[] {
  return [
    ["prompt", item.prompt] as const,
    ...item.hints.map((text, i) => [`hint ${i}`, text] as const),
    ...item.worked_solution.map((text, i) => [`step ${i}`, text] as const),
    ...keySurfaces(item),
  ];
}

/**
 * The templates whose parameter space REACHES a coefficient of one, with the predicate that
 * says so, so this sweep cannot go green over a population that never draws the branch.
 *
 * A floor on the number of draws would not do it: `1x` cannot appear in draws that never take
 * the value one, so a generator whose range slipped off it would leave every assertion above
 * green while measuring nothing. Each entry below is asserted to still reach one, which fails
 * loudly if a range moves rather than letting the sweep quietly stop covering that template.
 *
 * Every one of these was a live defect at `0cc0df9`; the predicate is read off `template_params`
 * rather than off the printed text, so it keeps holding once the text is fixed.
 */
const REACHES_ONE: Readonly<Record<string, (p: Record<string, number>) => boolean>> = {
  "d3.lin1.both-sides.l2": (p) => p.right === 1,
  "d5.rat4.nested-sum.l3": (p) => p.b === 1,
  "d5.rat5.level.l2": (p) => p.kind === 1 && p.b === 1,
  "d6.fun1.opposite-inputs.l3": (p) => Math.abs(p.b ?? 0) === 1,
  "d8.el6.extraneous.l3": (p) => (p.kept ?? 0) - (p.rejected ?? 0) === 1,
  "d4.pol8.synthetic-cubic.l2": (p) => Math.abs(p.m ?? 0) === 1,
};

describe("no item in the bank prints a coefficient of one against a variable", () => {
  // Drawn once and shared: 342 templates x 400 seeds is the expensive part of this file, and
  // the reach floor below has to read the same draws the sweep read for its claim to be about
  // this run rather than about a second one that happened to agree.
  const drawn: FrozenItem[] = [];
  for (const { template } of POPULATION) {
    for (let index = 0; index < DRAWS; index += 1) {
      drawn.push(generateFromTemplate(template, "practice", 770_000 + index));
    }
  }

  it("prints no unit coefficient across every generator's parameter space", () => {
    // Keyed by template and place with one example each, so the report names every affected
    // shape rather than the first few draws of the noisiest one. The D4 sweep's note records
    // why: its first run reported eight lines that were all one template, while another was
    // equally red and went unread.
    const offenders = new Map<string, string>();
    for (const item of drawn) {
      for (const [where, text] of learnerVisible(item)) {
        if (UNIT_COEFFICIENT.test(text)) {
          offenders.set(`${item.template_id} (${where})`, text);
        }
      }
    }
    expect([...offenders].map(([key, text]) => `${key}: ${text}`).join("\n")).toBe("");
    expect(drawn.length).toBe(POPULATION.length * DRAWS);
    // A floor under the WIDENED half of the surface. `answer_key` is optional on the answer
    // union, so if it ever stopped being present the sweep above would go on passing while no
    // longer reading a key at all -- which is the exact hole this file was written to close,
    // reopened silently. The POL.8 defect lived in a key and nowhere else.
    //
    // The draws that offer no key at all are built by `interactiveAnswer`, which returns an
    // `interactive_spec` instead because the answer is dragged or built rather than typed. So
    // the census below asks each keyless item for that spec, and a keyless item WITHOUT one
    // fails: that is a typed-answer shape whose key has left the swept surface, which a bare
    // count could not tell apart from an interactive one.
    //
    // Both halves of this assertion were wrong first, and both times for the same reason. It
    // began by testing membership of `INTERACTIVE_TEMPLATES`, and failed on six D2 templates
    // that call `interactiveAnswer` from their own domain's array -- a population scoped by
    // which array the code sits in rather than by the property claimed, which is the mistake
    // this whole file exists to correct. Then `prod.trg-2.l2` was left over, and it turned out
    // not to be interactive at all: it is MULTIPART, and its three keys were a level down in
    // `answer.parts` where nothing was reading them. The census is what found that.
    const keyless = drawn.filter((item) => keySurfaces(item).length === 0);
    const unexplained = new Set(
      keyless
        .filter(
          (item) =>
            (item.answer as { interactive_spec?: unknown }).interactive_spec === undefined,
        )
        .map((item) => item.template_id),
    );
    expect(
      [...unexplained].join(", "),
      "a typed-answer template carries no key, so its key is not being swept",
    ).toBe("");
    // Floored rather than pinned: an exact count would have to be edited every time an
    // interactive template is added, which is how a floor becomes a chore and then a rubber
    // stamp. What matters is that the census is not explaining an empty set.
    expect(
      new Set(keyless.map((item) => item.template_id)).size,
      "nothing is keyless, so the census above explains nothing",
    ).toBeGreaterThanOrEqual(10);
    const keysRead = drawn.reduce((total, item) => total + keySurfaces(item).length, 0);
    expect(keysRead, "no answer keys were swept at all").toBeGreaterThanOrEqual(130_000);
    // And the multipart keys specifically, since those are the ones nothing was reading.
    const partKeys = drawn.reduce(
      (total, item) =>
        total + keySurfaces(item).filter(([where]) => where.startsWith("part ")).length,
      0,
    );
    expect(partKeys, "no multipart part keys were swept").toBeGreaterThanOrEqual(1_000);
  }, 300_000);

  it("prints no unit coefficient on any served item", () => {
    const offenders: string[] = [];
    let served = 0;
    for (const [source, items] of SERVED_SOURCES) {
      for (const item of items) {
        served += 1;
        for (const [where, text] of learnerVisible(item)) {
          if (UNIT_COEFFICIENT.test(text)) {
            offenders.push(`${source} ${item.item_version_id} (${where}): ${text}`);
          }
        }
      }
    }
    expect(offenders.join("\n")).toBe("");
    expect(served, "no served items were swept").toBeGreaterThanOrEqual(1_000);
  });

  it("sweeps every template source, not one convenient aggregate", () => {
    const contributed = new Set(POPULATION.map((owned) => owned.source));
    const missing = TEMPLATE_SOURCES.map(([source]) => source).filter(
      (source) => !contributed.has(source),
    );
    expect(missing.join(", "), "a named template source contributed nothing").toBe("");
    // A floor under the population, so containment cannot hold trivially over a shrunken set.
    // 342 unique templates when this was written; the floor is deliberately two under, so a
    // template array quietly dropping out of `TEMPLATE_SOURCES` fails here rather than passing
    // over a smaller sweep. Raise it with the tree, do not lower it to fit a deletion.
    expect(POPULATION.length, "the template population has shrunk").toBeGreaterThanOrEqual(
      340,
    );
    // And a floor on the served side's breadth, so the pools cannot quietly empty either.
    expect(
      SERVED_SOURCES.filter(([, items]) => items.length > 0).length,
    ).toBeGreaterThanOrEqual(20);
  });

  it("still draws the coefficient of one it exists to catch", () => {
    const unreached: string[] = [];
    for (const [templateId, reachesOne] of Object.entries(REACHES_ONE)) {
      const mine = drawn.filter((item) => item.template_id === templateId);
      if (mine.length === 0) {
        unreached.push(`${templateId} is listed but draws nothing`);
        continue;
      }
      if (!mine.some((item) => reachesOne(item.template_params))) {
        unreached.push(
          `${templateId} no longer draws a coefficient of one, so it is no longer measured here`,
        );
      }
    }
    expect(unreached.join("\n")).toBe("");
    expect(Object.keys(REACHES_ONE).length).toBeGreaterThanOrEqual(6);
  });

  /**
   * The rule this must NOT have become. Tightening to `/1[a-z]/` would pass every sweep above
   * and forbid every coefficient ending in a one, of which the bank prints plenty.
   */
  it("still allows a one that is part of a longer number, an exponent, an ordinal, or alone", () => {
    for (const legal of [
      "21x",
      "11y",
      "x^{1}",
      "$= 1$",
      "\\dfrac{1}{2}",
      "10x",
      "1.5x",
      "\\left(1\\right)",
      "the 1st reading",
    ]) {
      expect(UNIT_COEFFICIENT.test(legal), `${legal} is legal and was flagged`).toBe(false);
    }
    for (const defect of ["1x", "1y", "4x + 1y", "1x^{2}", "- 1n - 8", "4s^{2} - 1s"]) {
      expect(UNIT_COEFFICIENT.test(defect), `${defect} is the defect and was missed`).toBe(
        true,
      );
    }
  });
});
