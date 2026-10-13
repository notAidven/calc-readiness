/**
 * Every template's draw TERMINATES, on every seed, in both forms.
 *
 * `d1.num-f.l2` could not. Its subtract branch re-drew only `b`
 * (`while (a * d2 === b * d1) { b = rng.int(1, d2 - 1); }`) while the condition
 * constrained `b` against `a`, `d1` and `d2`, so a draw that left `b` a single
 * candidate and ruled that candidate out spun the generator forever. Reproduced live
 * before it was fixed: at seed 16 the draw is `d1 = 4, d2 = 2, op = 1 (subtract),
 * a = 2, b = 1`, `b`'s only candidate is 1, and 1 is the illegal one, so a subprocess
 * calling `generate()` had to be killed after ten seconds.
 *
 * IT IS NOT ONE SEED, which is why this file sweeps rather than pins. 10,274 of the
 * first 1,000,000 seeds (1.03%) draw that tuple. `buildD1PracticeVariants` walks a
 * SHARED seed counter across every D1 template at module scope, so a template ahead of
 * NUM.F consuming one more seed than it does today would land the counter on one of
 * them and hang the package at import — no test, no error, just a wedged run. The
 * previous agent's `learnerProseEmDash.test.ts` had to borrow `validateTemplates`'s
 * `900_000` seed base to route around it.
 *
 * THE POPULATION IS EVERY TEMPLATE THE PACKAGE EXPORTS, and defining it that way is the
 * whole point of the file. `d1.num-f.l2` is where the defect was FOUND; the behaviour
 * that admits it — a rejection loop that re-draws a strict subset of the variables its
 * condition constrains — appears about twenty more times across seven domains, in
 * `d1/nodes/NUM.3`, `d1/nodes/NUM.4`, `d2/nodes/RAD.1`, `d5/nodes/RAT.1` through
 * `RAT.6`, `d7/nodes/LF.1`, `LF.2`, `d10/nodes/GEO.1` and `product/nodes/*`. Scoping a
 * guard to the file the bug was found in is the `#219` mistake from
 * `.cursor/rules/qa-verification.mdc`, so nothing here names a domain: the templates are
 * classified out of the package's own exports by shape, exactly as
 * `learnerProseEmDash.test.ts` classifies them, and a new domain is covered the day it
 * is exported.
 *
 * A HANG CANNOT BE CAUGHT BY A TIMEOUT, because a synchronous loop never yields and
 * vitest's timer never fires — running the unfixed generator in-process wedges the
 * whole run, which is how the defect went unreported the first time. So the sweep does
 * not call `createRng`: it calls a DRAW-CAPPED mirror of it that throws once a single
 * `generate()` has asked for more than `DRAW_CAP` numbers. A spinning loop asks
 * forever, so it throws in microseconds and the seed is reported instead of hanging.
 *
 * The controls, each failing in a different direction:
 *
 *  - `cappedRng` is asserted to emit the SAME sequence as the real `createRng`, so the
 *    sweep is exercising the draw space a learner is actually served rather than some
 *    neighbouring one. A sweep over the wrong rng would be green and worthless;
 *  - the CAP IS PROVED TO BITE, against a fixture template holding the exact defect
 *    that shipped. A cap that could not see a spin is #207's silent counter: green over
 *    everything while measuring nothing;
 *  - the population carries a floor AND a set-equality census against the ids derived
 *    from the same exports, because a floor bounds size and not shape;
 *  - the worst draw count observed is asserted well under the cap, so the sweep cannot
 *    quietly come to rest just below a cap that has been raised to accommodate it;
 *  - the enumeration test is what makes the FIX provable rather than probable: it walks
 *    the whole `(d1, d2, a)` space and shows that exactly one tuple has no legal `b`,
 *    and that the `1/d1` against `1/d2` completion the generator falls back to is legal
 *    on every draw of both branches;
 *  - the formerly-hanging instances are graded through the REAL checker
 *    (`validateTemplates`), because a draw that terminates into an ungradable item has
 *    traded a hang for a wrong answer key.
 *
 * Measured at the tip this landed on: 227 templates, 908,000 generates in the sweep,
 * worst case 270 draws for a single `generate()` against a cap of 5,000.
 *
 * Verified by injection rather than argued. Restoring the uncapped `while` in
 * `d1/nodes/NUM.F/index.ts` fails four of the nine assertions here in eight seconds,
 * naming 36 seeds (eighteen in each form, 16 first) at "no template's draw can spin
 * forever"; the same restoration inside the fixture is what the cap control asserts on
 * purpose. Narrowing the sweep to D1 leaves every cap assertion passing and fails the
 * population census at the 200 templates it dropped.
 */

import { describe, expect, it } from "vitest";
import * as bank from "./index";
import {
  createRng,
  type ItemForm,
  type ItemTemplate,
  type RenderedItem,
  type Rng,
  validateTemplates,
} from "./index";

/**
 * How many numbers one `generate()` may draw before the sweep calls it non-terminating.
 * The worst any template in the bank asks for is 270 (`d1.num-f.l3`, measured over
 * 20,000 seeds), so 5,000 is eighteen times the real ceiling: high enough that a
 * legitimate rejection draw can never reach it, low enough that a spin throws at once.
 */
const DRAW_CAP = 5_000;

/** Seeds per template per form in the package-wide sweep. */
const SWEEP_SEEDS = 2_000;

/**
 * Seeds for the deep sweep of the template that hung. A fix that works on seed 16 is
 * not a fix: at a 1.03% hit rate this range crosses the bad tuple about two thousand
 * times per form.
 */
const DEEP_SEEDS = 200_000;

/** Both forms: `practice` themes a prompt, `A` is the neutral assessment spelling. */
const FORMS: readonly ItemForm[] = ["A", "practice"];

/** Thrown by {@link cappedRng} once one `generate()` has drawn past {@link DRAW_CAP}. */
class DrawCapExceeded extends Error {}

/**
 * A draw-capped mirror of `createRng`. Identical mulberry32 arithmetic — asserted
 * against the real one below — plus a counter that throws instead of letting an
 * unbounded rejection loop take the process with it.
 */
function cappedRng(seed: number, cap: number): { rng: Rng; draws: () => number } {
  let state = seed >>> 0;
  let drawn = 0;
  const next = (): number => {
    drawn += 1;
    if (drawn > cap) {
      throw new DrawCapExceeded(`drew more than ${cap} numbers`);
    }
    state = (state + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  return {
    rng: {
      int(minInclusive, maxInclusive) {
        return minInclusive + Math.floor(next() * (maxInclusive - minInclusive + 1));
      },
      pick(items) {
        const item = items[Math.floor(next() * items.length)];
        if (item === undefined) {
          throw new Error("cannot pick from an empty list");
        }
        return item;
      },
    },
    draws: () => drawn,
  };
}

/** One `generate()` run under the cap: the item it drew, or the fact that it spun. */
interface DrawResult {
  readonly spun: boolean;
  readonly draws: number;
  readonly item?: RenderedItem;
}

/**
 * The ONLY way this file is allowed to call a `generate()`. Nothing here may reach for
 * `createRng` or `generateFromTemplate`: a regression that restores an unbounded loop
 * would then wedge the run instead of failing it, which is how the defect stayed
 * unreported. Measured — with the uncapped `while` put back and one assertion in this
 * file calling `generateFromTemplate`, the vitest run had to be killed after four
 * minutes; routed through the cap, the same injection fails in three seconds.
 */
function generateUnderCap(
  template: ItemTemplate,
  form: ItemForm,
  seed: number,
  cap: number = DRAW_CAP,
): DrawResult {
  const { rng, draws } = cappedRng(seed, cap);
  try {
    const item = template.generate(rng, { form });
    return { spun: false, draws: draws(), item };
  } catch (error) {
    if (error instanceof DrawCapExceeded) {
      return { spun: true, draws: draws() };
    }
    throw error;
  }
}

/**
 * One drawn parameter. It fails rather than returning `undefined`, so a template that
 * stops recording a param leaves the arithmetic below asserting nothing.
 */
function param(item: RenderedItem, key: string): number {
  const value = item.params[key];
  expect(
    typeof value,
    `the item records no numeric "${key}", so the checks on it would pass over nothing`,
  ).toBe("number");
  return value ?? Number.NaN;
}

/** The rendered item, or a failure naming the seed that spun instead of drawing one. */
function itemUnderCap(template: ItemTemplate, form: ItemForm, seed: number): RenderedItem {
  const result = generateUnderCap(template, form, seed);
  expect(
    result.item,
    `${template.template_id} spun at seed ${seed} (${form}) instead of drawing an item`,
  ).toBeDefined();
  return result.item as RenderedItem;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** An exported array of templates: every entry carries `generate` and a `template_id`. */
function asTemplateCollection(value: unknown): ItemTemplate[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }
  const entries = value.filter(isRecord);
  if (entries.length !== value.length) {
    return undefined;
  }
  const isTemplate = (entry: Record<string, unknown>) =>
    typeof entry.generate === "function" && typeof entry.template_id === "string";
  return entries.every(isTemplate) ? (entries as unknown as ItemTemplate[]) : undefined;
}

const EXPORTS = Object.entries(bank as Record<string, unknown>);

/**
 * Every distinct template the package exports, by identity. A per-node collection and
 * its domain aggregate hold the SAME objects, so deduping loses no coverage.
 */
const TEMPLATES: readonly ItemTemplate[] = [
  ...new Set(EXPORTS.flatMap(([, value]) => asTemplateCollection(value) ?? [])),
];

const TEMPLATE_IDS = TEMPLATES.map((template) => template.template_id);

/** The template the defect was found in, located by id so a rename fails here. */
const HUNG_TEMPLATE_ID = "d1.num-f.l2";
const hungTemplate = TEMPLATES.find(
  (template) => template.template_id === HUNG_TEMPLATE_ID,
);

/**
 * Seeds whose draw is `d1 = 4, d2 = 2, op = subtract, a = 2` — the tuple with no legal
 * `b`. The first ten of the 10,274 in the first million, kept as literals so the
 * instance is named and not merely swept past.
 */
const SEEDS_WITH_NO_LEGAL_B: readonly number[] = [
  16, 91, 383, 439, 528, 566, 589, 595, 720, 726,
];

describe("every template's draw terminates", () => {
  it("the sweep found the templates the package exports", () => {
    // A floor, because a loop over an empty population passes; and a census against the
    // ids, because a floor bounds size and not shape.
    expect(
      TEMPLATES.length,
      "no exported array classified as a collection of templates, so the sweep below runs over nothing",
    ).toBeGreaterThanOrEqual(200);
    expect(
      new Set(TEMPLATE_IDS).size,
      "the population holds templates that share a template_id, so the census cannot name a failure",
    ).toBe(TEMPLATES.length);
    expect(
      hungTemplate,
      `${HUNG_TEMPLATE_ID} is not in the population, so the template this file exists for is not being swept`,
    ).toBeDefined();
  });

  it("the capped rng draws the same sequence as the one templates are served", () => {
    // The sweep is only evidence about the shipped draw space if the two rngs agree. A
    // divergent mirror would sweep a neighbouring space and report green about it.
    for (const seed of [0, 16, 1004, 5006, 900_000]) {
      const real = createRng(seed);
      const { rng } = cappedRng(seed, DRAW_CAP);
      const realDraws = Array.from({ length: 40 }, (_unused, index) =>
        index % 2 === 0 ? real.int(1, 97) : real.int(-13, 13),
      );
      const cappedDraws = Array.from({ length: 40 }, (_unused, index) =>
        index % 2 === 0 ? rng.int(1, 97) : rng.int(-13, 13),
      );
      expect(
        cappedDraws,
        `the capped rng diverges from createRng at seed ${seed}, so the sweep is not measuring the draws a learner is served`,
      ).toEqual(realDraws);
    }
    const realPick = createRng(7);
    const { rng: cappedPick } = cappedRng(7, DRAW_CAP);
    const options = ["a", "b", "c", "d", "e"] as const;
    expect(
      Array.from({ length: 20 }, () => cappedPick.pick(options)),
      "the capped rng's pick() diverges from createRng's",
    ).toEqual(Array.from({ length: 20 }, () => realPick.pick(options)));
  });

  it("the cap catches a rejection loop that cannot terminate", () => {
    // THE CONTROL THAT MATTERS MOST. The fixture is the defect as it shipped, not an
    // invented one: re-draw only `b` while the condition constrains `b` against `a`,
    // `d1` and `d2`, at the tuple that leaves `b` one candidate and rules it out.
    const spinner: ItemTemplate = {
      template_id: "fixture.spins-forever",
      node_id: "NUM.F",
      difficulty: 2,
      generate(rng: Rng) {
        const d1 = 4;
        const d2 = 2;
        const a = 2;
        let b = rng.int(1, d2 - 1);
        while (a * d2 === b * d1) {
          b = rng.int(1, d2 - 1);
        }
        return { prompt: "unreachable", answer: { answer_key: "0" }, params: { b } };
      },
    } as unknown as ItemTemplate;
    expect(
      generateUnderCap(spinner, "A", 1).spun,
      "the draw cap did not fire on a loop that provably never exits, so a green sweep below would mean nothing",
    ).toBe(true);

    // And the other direction: a template that terminates must NOT be reported, or the
    // sweep would be a guard that fails on everything and distinguishes nothing.
    const settler: ItemTemplate = {
      template_id: "fixture.terminates",
      node_id: "NUM.F",
      difficulty: 2,
      generate(rng: Rng) {
        return {
          prompt: "fine",
          answer: { answer_key: "0" },
          params: { a: rng.int(1, 3) },
        };
      },
    } as unknown as ItemTemplate;
    expect(
      generateUnderCap(settler, "A", 1).spun,
      "the draw cap fired on a template that terminates, so it cannot tell a spin from a draw",
    ).toBe(false);
  });

  it("no template's draw can spin forever, in either form", () => {
    const spun: string[] = [];
    let generated = 0;
    let worst = 0;
    let worstOwner = "";
    for (const template of TEMPLATES) {
      for (const form of FORMS) {
        for (let seed = 0; seed < SWEEP_SEEDS; seed += 1) {
          const result = generateUnderCap(template, form, seed);
          generated += 1;
          if (result.spun) {
            if (spun.length < 40) {
              spun.push(`${template.template_id} form=${form} seed=${seed}`);
            }
            continue;
          }
          if (result.draws > worst) {
            worst = result.draws;
            worstOwner = `${template.template_id} form=${form}`;
          }
        }
      }
    }
    expect(
      spun,
      `these draws asked the rng for more than ${DRAW_CAP} numbers, which is a rejection loop with no legal value left to find:\n${spun.join("\n")}`,
    ).toEqual([]);
    // Floors under the sweep itself: containment over an empty collection is trivially
    // satisfied, so the emptiness above is only meaningful beside a count.
    expect(
      generated,
      "the sweep generated far fewer instances than its own grid calls for, so the assertion above passed over nothing",
    ).toBe(TEMPLATES.length * FORMS.length * SWEEP_SEEDS);
    expect(
      generated,
      "the sweep generated too few instances to have crossed the 1-in-97 draw this file exists for",
    ).toBeGreaterThanOrEqual(800_000);
    // Headroom, so the sweep cannot come to rest just under a cap raised to fit it.
    // Measured worst at the tip this landed on: 270 draws, by `d1.num-f.l3`.
    expect(
      worst,
      `${worstOwner} now needs ${worst} draws for one instance, close enough to the ${DRAW_CAP} cap that the sweep is about to stop distinguishing a slow rejection loop from an endless one`,
    ).toBeLessThan(1_000);
  });

  it("the template that hung terminates across a wide seed range, in both forms", () => {
    // A fix that works on seed 16 is not a fix.
    expect(hungTemplate).toBeDefined();
    if (!hungTemplate) {
      return;
    }
    const spun: number[] = [];
    for (const form of FORMS) {
      for (let seed = 0; seed < DEEP_SEEDS; seed += 1) {
        if (generateUnderCap(hungTemplate, form, seed).spun && spun.length < 20) {
          spun.push(seed);
        }
      }
    }
    expect(
      spun,
      `${HUNG_TEMPLATE_ID} still spins on these seeds: ${spun.join(", ")}`,
    ).toEqual([]);
  });

  it("the draws that used to hang now produce a legal item", () => {
    // Terminating is not enough: the completion the generator falls back to has to be a
    // real subtraction item, positive and nonzero, or the hang has become a bad item.
    expect(hungTemplate).toBeDefined();
    if (!hungTemplate) {
      return;
    }
    for (const seed of SEEDS_WITH_NO_LEGAL_B) {
      // The seeds are literals, so first show they are still the seeds they were named
      // for: replay the generator's draw prefix and check each one lands on the pinned
      // tuple. A change to the draw order or the ranges makes this list stale, and a
      // stale list would leave the checks below passing over ten ordinary draws.
      const { rng } = cappedRng(seed, DRAW_CAP);
      const drawnD1 = rng.int(2, 5);
      let drawnD2 = rng.int(2, 6);
      for (let attempt = 0; attempt < 64 && drawnD2 === drawnD1; attempt += 1) {
        drawnD2 = rng.int(2, 6);
      }
      expect(
        {
          d1: drawnD1,
          d2: drawnD2,
          op: rng.int(0, 1),
          a: rng.int(1, drawnD1 - 1),
          b: rng.int(1, drawnD2 - 1),
        },
        `seed ${seed} no longer draws the tuple with no legal \`b\`, so this list has gone stale`,
      ).toEqual({ d1: 4, d2: 2, op: 1, a: 2, b: 1 });

      for (const form of FORMS) {
        const item = itemUnderCap(hungTemplate, form, seed);
        const a = param(item, "a");
        const b = param(item, "b");
        const d1 = param(item, "d1");
        const d2 = param(item, "d2");
        expect(
          a * d2 === b * d1,
          `seed ${seed} (${form}) completed onto two equal fractions, so the item subtracts to zero`,
        ).toBe(false);
        expect(
          a * d2 > b * d1,
          `seed ${seed} (${form}) completed onto a negative result`,
        ).toBe(true);
        expect(
          item.prompt.length,
          `seed ${seed} (${form}) rendered no prompt`,
        ).toBeGreaterThan(0);
        expect(
          item.answer.answer_key,
          `seed ${seed} (${form}) produced no answer key`,
        ).toBeTruthy();
      }
    }
    // The named instance, spelled out: the exact draw the reproduction killed a
    // subprocess on, and what it resolves to now.
    const seed16 = itemUnderCap(hungTemplate, "practice", 16);
    expect(seed16.params).toEqual({ a: 1, b: 1, d1: 2, d2: 4, op: 1 });
    expect(seed16.answer.answer_key).toBe("1/4");
  });

  it("the formerly-hanging instances grade correct through the real checker", () => {
    // `validateTemplates` samples form A at its own seed base, so it has never seen one
    // of these draws — that is part of why the defect survived. Wrapping the instance in
    // a template hands it to the same harness: the authoritative checker, plus the hint
    // and worked-solution invariants.
    expect(hungTemplate).toBeDefined();
    if (!hungTemplate) {
      return;
    }
    const wrapped = SEEDS_WITH_NO_LEGAL_B.map((seed) => {
      // Drawn under the cap first, so a regression fails this file rather than wedging
      // it inside the validation harness.
      const item = itemUnderCap(hungTemplate, "practice", seed);
      return {
        template_id: `${HUNG_TEMPLATE_ID}#seed${seed}`,
        node_id: hungTemplate.node_id,
        difficulty: hungTemplate.difficulty,
        concept: hungTemplate.concept,
        generate: () => item,
      };
    }) as unknown as ItemTemplate[];
    const issues = validateTemplates(wrapped, 1);
    expect(
      issues.map((issue) => `${issue.code}: ${issue.message}`),
      "an instance that used to hang now grades wrong, so the completion is not a legal item",
    ).toEqual([]);
  });
});

describe("d1.num-f.l2's draw space, enumerated", () => {
  // The generator's own ranges. Written out here rather than imported, so a change to
  // the ranges is a change this file must be told about.
  const D1_RANGE = [2, 3, 4, 5] as const;
  const D2_RANGE = [2, 3, 4, 5, 6] as const;

  /** Every `(d1, d2, a)` the generator can hold when the subtract branch is entered. */
  const subtractDraws = D1_RANGE.flatMap((d1) =>
    D2_RANGE.filter((d2) => d2 !== d1).flatMap((d2) =>
      Array.from({ length: d1 - 1 }, (_unused, index) => ({ d1, d2, a: index + 1 })),
    ),
  );

  it("exactly one draw leaves `b` no legal value, and it is the one that hung", () => {
    // This is what makes the fix provable rather than probable: the completion is only
    // reachable from tuples that genuinely have nowhere to go.
    expect(
      subtractDraws.length,
      "the enumeration is empty or tiny, so what follows measures nothing",
    ).toBeGreaterThanOrEqual(40);
    const pinned = subtractDraws.filter(({ d1, d2, a }) => {
      const legal = Array.from({ length: d2 - 1 }, (_unused, index) => index + 1).filter(
        (b) => a * d2 !== b * d1,
      );
      return legal.length === 0;
    });
    expect(
      pinned,
      "the set of draws with no legal `b` is not the single tuple the fix was written for",
    ).toEqual([{ d1: 4, d2: 2, a: 2 }]);
  });

  it("the `1/d1` against `1/d2` completion is legal on every draw of both branches", () => {
    // The generator falls back to `a = 1, b = 1`. Subtract needs the two fractions
    // unequal; add needs their sum off a whole number. Both hold for every distinct
    // pair of denominators, which is why one completion serves both branches.
    let checked = 0;
    for (const d1 of D1_RANGE) {
      for (const d2 of D2_RANGE) {
        if (d2 === d1) {
          continue;
        }
        checked += 1;
        expect(
          1 * d2 === 1 * d1,
          `1/${d1} and 1/${d2} are equal, so the subtract completion would subtract to zero`,
        ).toBe(false);
        expect(
          (1 * d2 + 1 * d1) % (d1 * d2),
          `1/${d1} + 1/${d2} lands on a whole number, so the add completion is ungradable`,
        ).not.toBe(0);
      }
    }
    expect(
      checked,
      "no denominator pairs were checked, so the completion is unproved",
    ).toBe(16);
  });
});
