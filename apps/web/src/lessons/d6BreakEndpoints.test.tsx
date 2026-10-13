/**
 * Which of two marks painted on ONE coordinate a learner actually reads.
 *
 * A piecewise break belongs to exactly one of the two stretches that meet there, and
 * `D6BreakLine` says so by filling the endpoint that takes it in and hollowing the one that
 * leaves it out. Both dots land on the same coordinate, so only the later of them is visible,
 * and the figure's captions argue from the OWNER's own two ends: `three-piece-eval.l2` tells a
 * learner "its left end is filled and its right end hollow", and `boundary-eval.l2` tells them
 * the endpoint drawn at the break is the filled one. Painted in registry order the neighbour's
 * dot covered the owner's, so on the three-piece draw the hollow right end a learner was being
 * pointed at rendered filled, and the prose contradicted the picture beside it.
 *
 * This is read off the RENDERED svg rather than off the parameters, for the same reason
 * `d3RevealTruth` gives: a params-driven check agrees with the figure by construction, and
 * would pass over a figure that has stopped drawing what it describes.
 *
 * ## The population is the behaviour, not the node
 *
 * This file used to select `SWEPT_TEMPLATES.filter(t => t.template_id.startsWith("d6.fun3."))`,
 * which is `.cursor/rules/qa-verification.mdc`'s `#219` shape exactly: a population scoped to
 * where a mechanic is IMPLEMENTED rather than to what exhibits the behaviour. It coincided with
 * the behaviour only because `D6BreakLine` happens to be imported by one file. Nothing about
 * stacking two marks on one coordinate is FUN.3's, and nothing stops the next figure that does
 * it from being authored under another prefix — which is not hypothetical: the derivation below
 * finds three such figures TODAY, in two other nodes, and the old filter could see none of them.
 *
 * So the population is derived by rendering the FIGURE REGISTRY — every key it holds, not every
 * key with a chosen prefix — and keeping the figures that paint one mark exactly over another.
 * That is the precondition for the defect: where two marks share a centre AND a radius, paint
 * order alone decides which one a learner sees. Ancestor `translate`s are accumulated before
 * comparing, because six copies of one icon glyph carry identical `cx` attributes and share no
 * position at all; without that, `d1.num-5.l3`'s unit-rate icons joined the population as a
 * ninth member that cannot exhibit anything.
 *
 * ## What each member owes, and the two that do not
 *
 * Marks stacked on one coordinate are only a problem when they DISAGREE: two identical hollow
 * rings hide nothing. Where they disagree, the mark the caption argues from is stroked
 * `--civic` and its neighbour `--ink-soft`, so the claim is checkable as "the owner's is the one
 * on top", which never asks this file to know which stretch owns which break.
 *
 * Two members genuinely do not owe that, and they are NAMED rather than filtered out, because a
 * member that does not owe a property and a member that forgot it look identical from outside
 * the guard. Both lists are asserted in both directions.
 */

import { createRng, generateFromTemplate } from "@cr/item-bank";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CFU_ONLY_TEMPLATE_LIST } from "./cfuVariants";
import { SWEPT_TEMPLATES } from "./practiceSweep";
import { getWorkedSolutionVisual, workedSolutionVisualIds } from "./workedSolutionVisuals";

/**
 * Enough seeds to clear the shape floor below with room to spare, and no more.
 *
 * Every seed that survives the dedupe costs a `render`, and this file is cheap only if that
 * count stays small: at 120 it took 4.6s per row alone and timed out at the default 20s in a
 * loaded full-project run. The floors are what make a low number safe rather than a guess —
 * they fail if the draws stop reaching eight distinct shapes or stop reaching a shared break.
 */
const DRAWS = 32;

/**
 * How many shapes the DISCOVERY pass renders per registry key.
 *
 * It runs over all 363 of them, so this is the expensive number rather than `DRAWS`: two costs
 * about 12s and eight would cost fifty. Like `DRAWS` it is a budget and not a claim — a member
 * that stacks marks on only its rarest draw would be missed here, and the guard against that is
 * not a bigger number but the census below, which fails whichever way the derived population
 * and the declared exceptions come apart.
 */
const SCAN_DRAWS = 2;

/** The hue an owner's endpoints are stroked with, straight from `svgKit`. */
const OWNER_STROKE = "var(--civic)";

/**
 * Well over the ~20s a whole-registry scan plus the deep sweep costs on a quiet machine.
 *
 * The 5s default is not survivable here and neither is the 20s one under a loaded full-project
 * run, which is what the old file's own note about 120 seeds is about. This is a headroom
 * number rather than a budget assertion: the budget is `SCAN_DRAWS` and `DRAWS` above.
 */
const TIMEOUT = 180_000;

/**
 * Members whose stacked marks are always IDENTICAL, so paint order decides nothing.
 *
 * Both are interval lines drawn by `SolutionLineWorked`, where two pieces of a union meet at a
 * point neither of them takes in. Two hollow rings of one size and one hue land on that point
 * and the learner sees a hollow ring either way — which is what both captions say in words:
 * `quotient-domain.l2`'s reads "Both marks at $c$ are hollow, from either side."
 */
const STACKS_ONLY_IDENTICAL: readonly { id: string; why: string }[] = [
  {
    id: "d6.fun2.quotient-domain.l2",
    why: "the two rays of a punctured line meet at a point both leave out, so both marks are the same hollow ring",
  },
  {
    id: "d6.fun2.root-over-linear.l3",
    why: "the hole splitting the root's stretch is open on both sides, so the two marks at it are the same hollow ring",
  },
];

/**
 * The member whose stacked marks disagree with no subject among them.
 *
 * `two-windows.l3` draws two consecutive time windows as `D6Chart` spans, and their caps meet at
 * the shared hour in the two windows' own hues. Neither is the owner: the figure's claim is that
 * the hour belongs to BOTH windows — its caption says "the two windows share the middle mark" —
 * so there is no covered mark a learner was being pointed at. The ring is the same shape and
 * size in either hue, and the hue is repeated on the span it caps, which is where the reading
 * comes from.
 */
const NO_SUBJECT_AT_THE_SHARED_MARK: readonly { id: string; why: string }[] = [
  {
    id: "d6.fun5.two-windows.l3",
    why: "the shared hour ends one window and begins the next, and the caption claims it for both rather than for either",
  },
];

const EXCUSED = new Set(
  [...STACKS_ONLY_IDENTICAL, ...NO_SUBJECT_AT_THE_SHARED_MARK].map((entry) => entry.id),
);

/** One painted mark, as the three things this file needs to know about it. */
interface Mark {
  /** Where it actually lands: its own centre plus every ancestor translate. */
  place: string;
  /** How it reads: two marks agreeing here hide nothing from each other. */
  look: string;
  owned: boolean;
}

/**
 * Where a circle lands, ancestor transforms included.
 *
 * A `translate` is accumulated; anything else is appended to the key instead, so two marks under
 * DIFFERENT unhandled transforms are never called the same place and two under the same one
 * still are.
 */
function placeOf(node: Element): string {
  let dx = 0;
  let dy = 0;
  const unhandled: string[] = [];
  for (
    let at: Element | null = node;
    at !== null && at.tagName.toLowerCase() !== "body";
    at = at.parentElement
  ) {
    const transform = at.getAttribute("transform");
    if (transform === null) {
      continue;
    }
    const move = /^translate\(\s*(-?[\d.]+)[\s,]*(-?[\d.]+)?\s*\)$/.exec(transform.trim());
    if (move) {
      dx += Number(move[1]);
      dy += Number(move[2] ?? 0);
    } else {
      unhandled.push(transform);
    }
  }
  return `${dx}|${dy}|${unhandled.sort().join(";")}`;
}

/** Every mark a rendered figure paints, in the order the browser paints them. */
function paintedMarks(container: HTMLElement): Mark[] {
  return [...container.querySelectorAll("circle")].map((circle) => {
    const at = (name: string): string => circle.getAttribute(name) ?? "";
    return {
      place: `${placeOf(circle)}@${Math.round(Number(at("cx") || "0"))}:${Math.round(Number(at("cy") || "0"))}:${at("r")}`,
      look: `${at("fill")}|${at("stroke")}|${at("stroke-width")}`,
      owned: at("stroke") === OWNER_STROKE,
    };
  });
}

/** The places carrying more than one mark, each with the marks that landed there in order. */
function stacked(marks: readonly Mark[]): Mark[][] {
  const byPlace = new Map<string, Mark[]>();
  for (const mark of marks) {
    byPlace.set(mark.place, [...(byPlace.get(mark.place) ?? []), mark]);
  }
  return [...byPlace.values()].filter((group) => group.length > 1);
}

/** The stacks whose marks do not all read the same, which are the ones that hide something. */
function disagreeing(groups: readonly Mark[][]): Mark[][] {
  return groups.filter((group) => new Set(group.map((mark) => mark.look)).size > 1);
}

/**
 * Distinct parameter shapes for a registry key, from whichever bank actually draws it.
 *
 * The registry holds practice ids and `cfu.*` ids side by side and both render the same
 * components, so both are scanned; a key with neither source would be a figure nothing can draw
 * and is asserted against below rather than skipped.
 */
function shapesFor(id: string, wanted: number): Record<string, number>[] {
  const shapes = new Map<string, Record<string, number>>();
  const practice = SWEPT_TEMPLATES.find((entry) => entry.template_id === id);
  if (practice) {
    for (let seed = 0; seed < wanted * 3 && shapes.size < wanted; seed += 1) {
      const item = generateFromTemplate(practice, "practice", 900_000 + seed);
      shapes.set(JSON.stringify(item.template_params), item.template_params);
    }
    return [...shapes.values()];
  }
  const cfu = CFU_ONLY_TEMPLATE_LIST.find((entry) => entry.template_id === id);
  if (cfu) {
    for (let seed = 0; seed < wanted * 3 && shapes.size < wanted; seed += 1) {
      const params = cfu.generate(createRng((seed + 1) * 7919 + 13)).params ?? {};
      shapes.set(JSON.stringify(params), params);
    }
    return [...shapes.values()];
  }
  return [];
}

/** What a run of draws through one figure came to. */
interface Reading {
  shapes: number;
  stacks: number;
  disagreements: number;
  /** Disagreeing stacks holding an owner's mark: the ones the property below can decide. */
  owned: number;
  /** Disagreeing stacks holding no owner's mark, so nothing says which should win. */
  unclaimed: string[];
  /** Disagreeing stacks whose owner's mark was painted over. */
  covered: string[];
}

function read(id: string, wanted: number): Reading {
  const visual = getWorkedSolutionVisual(id);
  if (!visual) {
    throw new Error(`${id} has no registered worked figure`);
  }
  const reading: Reading = {
    shapes: 0,
    stacks: 0,
    disagreements: 0,
    owned: 0,
    unclaimed: [],
    covered: [],
  };
  for (const params of shapesFor(id, wanted)) {
    // The figure is a pure function of its parameters, so one render per DISTINCT
    // parameter set covers every draw that produced it.
    reading.shapes += 1;
    const { container, unmount } = render(visual.Svg(params));
    const groups = stacked(paintedMarks(container));
    reading.stacks += groups.length;
    for (const group of disagreeing(groups)) {
      reading.disagreements += 1;
      const shape = JSON.stringify(params);
      if (!group.some((mark) => mark.owned)) {
        reading.unclaimed.push(`${group[0]?.place} on ${shape}`);
        continue;
      }
      reading.owned += 1;
      if (group.at(-1)?.owned !== true) {
        reading.covered.push(
          `${group[0]?.place} hands its mark to the neighbouring stretch on ${shape}`,
        );
      }
    }
    unmount();
  }
  return reading;
}

/** Every registry key whose figure paints one mark exactly over another, and how many were read. */
function scanRegistry(): { population: string[]; scanned: number; sourceless: string[] } {
  const population: string[] = [];
  const sourceless: string[] = [];
  let scanned = 0;
  for (const id of workedSolutionVisualIds()) {
    const shapes = shapesFor(id, SCAN_DRAWS);
    if (shapes.length === 0) {
      sourceless.push(id);
      continue;
    }
    scanned += 1;
    if (read(id, SCAN_DRAWS).stacks > 0) {
      population.push(id);
    }
  }
  return { population, scanned, sourceless };
}

/** The scan is the expensive step, so every test below reads it once. */
let scanned: ReturnType<typeof scanRegistry> | null = null;
function registry(): ReturnType<typeof scanRegistry> {
  scanned ??= scanRegistry();
  return scanned;
}

const deep = new Map<string, Reading>();
function reading(id: string): Reading {
  const found = deep.get(id) ?? read(id, DRAWS);
  deep.set(id, found);
  return found;
}

describe("a stacked break mark shows its subject, not the mark that covered it", () => {
  it(
    "derives its population by rendering the figure registry, not from an id prefix",
    () => {
      const { population, scanned: seen, sourceless } = registry();

      // A floor under the SCAN, because a scan that rendered nothing derives an empty
      // population and then agrees with any list of exceptions.
      expect(
        seen,
        "the figure registry scan rendered almost nothing",
      ).toBeGreaterThanOrEqual(340);
      expect(
        sourceless,
        "a registered figure has no bank behind it, so the scan never drew it",
      ).toEqual([]);

      expect(
        population.length,
        "no registered figure stacks two marks on one coordinate, so this file measures nothing",
      ).toBeGreaterThanOrEqual(8);

      // Composition, not just size: a floor of eight is satisfied by the five FUN.3 figures
      // plus three of anything, and the whole point of the widening is that the population is
      // no longer the node the mechanic is implemented in.
      const beyondFun3 = population.filter((id) => !id.startsWith("d6.fun3."));
      expect(
        beyondFun3,
        "the population has collapsed back onto FUN.3, which is the prefix filter this file was repaired away from",
      ).toHaveLength(3);
      expect(
        new Set(beyondFun3.map((id) => id.split(".").slice(0, 2).join("."))).size,
        "the widening no longer reaches past one other node",
      ).toBeGreaterThanOrEqual(2);
    },
    TIMEOUT,
  );

  it(
    "names its exceptions, and the names still describe what they excuse",
    () => {
      const { population } = registry();
      const members = new Set(population);

      expect(
        STACKS_ONLY_IDENTICAL.map((entry) => entry.id).filter((id) =>
          NO_SUBJECT_AT_THE_SHARED_MARK.some((other) => other.id === id),
        ),
        "an id is claimed by both exception lists, so neither reason is the operative one",
      ).toEqual([]);

      // The lists cannot grow until they have swallowed the population.
      expect(
        population.filter((id) => !EXCUSED.has(id)).length,
        "the exception lists have swallowed the population, so nothing is asserted",
      ).toBeGreaterThanOrEqual(5);

      for (const entry of [...STACKS_ONLY_IDENTICAL, ...NO_SUBJECT_AT_THE_SHARED_MARK]) {
        expect(
          members.has(entry.id),
          `${entry.id} is a declared exception that no longer stacks any mark, so it excuses nothing (${entry.why})`,
        ).toBe(true);
      }

      for (const entry of STACKS_ONLY_IDENTICAL) {
        const found = reading(entry.id);
        expect(
          found.disagreements,
          `${entry.id} is excused because its stacked marks read the same, and they no longer do, so it owes the property and must leave the list (${entry.why})`,
        ).toBe(0);
      }

      for (const entry of NO_SUBJECT_AT_THE_SHARED_MARK) {
        const found = reading(entry.id);
        expect(
          found.disagreements,
          `${entry.id} is excused for stacking marks that disagree with no subject among them, and it has stopped stacking a disagreement at all (${entry.why})`,
        ).toBeGreaterThan(0);
        expect(
          found.owned,
          `${entry.id} now paints an owner's mark at a shared coordinate, so a learner IS being pointed at one of them and it must leave the list (${entry.why})`,
        ).toBe(0);
      }
    },
    TIMEOUT,
  );

  it(
    "every member that stacks disagreeing marks leaves the subject on top",
    () => {
      const { population } = registry();
      const owing = population.filter((id) => !EXCUSED.has(id));
      const thin: string[] = [];
      const silent: string[] = [];
      const unclaimed: string[] = [];
      const covered: string[] = [];

      for (const id of owing) {
        const found = reading(id);
        // Floors, because "no mark was covered" is true of a figure that stacked nothing.
        if (found.shapes < 8) {
          thin.push(`${id} rendered ${found.shapes} shapes`);
        }
        if (found.stacks === 0) {
          silent.push(`${id} stacked no mark at all over ${found.shapes} shapes`);
        } else if (found.owned === 0) {
          silent.push(`${id} stacked marks but never one an owner reaches`);
        }
        unclaimed.push(...found.unclaimed.slice(0, 2).map((line) => `${id}: ${line}`));
        covered.push(...found.covered.slice(0, 2).map((line) => `${id}: ${line}`));
      }

      expect(thin, "too few distinct shapes to say anything").toEqual([]);
      expect(silent, "a member of the population measured nothing").toEqual([]);
      expect(
        unclaimed,
        "two marks disagree on one coordinate with no owner among them, so nothing says which a learner should read",
      ).toEqual([]);
      expect(covered, "a figure covers the endpoint its caption argues from").toEqual([]);
    },
    TIMEOUT,
  );

  it(
    "the sweep reaches contested marks across the population, not on one member",
    () => {
      const { population } = registry();
      const owing = population.filter((id) => !EXCUSED.has(id));
      const touched = owing.filter((id) => reading(id).owned > 0);
      // Composition, not just size: a sweep that had drifted down to one member would still
      // satisfy every floor above.
      expect(
        touched.length,
        "only one member reaches an owned contested mark",
      ).toBeGreaterThanOrEqual(4);
    },
    TIMEOUT,
  );
});
