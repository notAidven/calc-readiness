/**
 * No em dash reaches a learner from an ITEM-BANK string.
 *
 * `apps/web/src/lessons/widgetProseEmDash.test.ts` sweeps the lesson tree's SOURCES for
 * U+2014 in learner copy, and the lesson-pack validator's R3 bans it in lesson JSON.
 * Neither opens this package, and this package authors learner copy too. Traced to the
 * render sites: a practice item's `prompt` is rendered by `LessonPractice.tsx` through
 * `LessonProse`, each revealed `hints[i]` through its own `LessonProse`, and
 * `worked_solution` is handed to `WorkedSolution` as `steps`; an assessment pack's
 * `prompt` reaches `DiagnosticRunner.tsx` via `promptForItem` and `MathText`.
 * `.cursor/skills/practice-hints/SKILL.md` has stated the no-em-dash rule for hints and
 * worked solutions all along.
 *
 * A RULE STATED IN A SKILL AND ASSERTED OVER ONE DOMAIN IS THE GAP THIS CLOSES. The ban
 * was enforced in exactly one place in this package: `d4.test.ts`'s "gives every item one
 * to three hints and an ordered worked solution", over `D4_PRACTICE_ITEMS`. That is the
 * #219 shape from `.cursor/rules/qa-verification.mdc`, a population scoped by where an
 * author happened to be working rather than by which surfaces exhibit the behaviour. D4 is
 * five of the forty-seven nodes this bank serves, and that check never reads `prompt`, so a
 * prompt could carry an em dash in any domain, D4 included, and meet no rule anywhere.
 * `validateTemplates` does not check it either. Measured rather than argued: three hints in
 * `interactive/templates.ts` carried an em dash into the real `LessonPractice` hint UI and
 * were found by reading, not by any check.
 *
 * THE POPULATION IS DERIVED FROM THE PACKAGE'S PUBLIC API, BY SHAPE. A hardcoded list of
 * pools would rot the day a domain lands, and a glob over `src/**` would be scoped by
 * directory again. So every export of `./index` is classified structurally: an array whose
 * entries all carry a string `prompt` is an item collection, and an array whose entries all
 * carry `generate` plus a `template_id` is a template collection. Nothing has to be
 * registered here for a new domain to be swept.
 *
 * A DATA SWEEP, NOT A SOURCE SWEEP, and that is the deliberate difference from the lesson
 * tree's file. Over there the learner copy is JSX and string literals mixed into source, so
 * the sweep has to strip comments first and the stripper is both load-bearing and fragile.
 * Here the learner copy is named fields on exported values, so there is no comment to
 * confuse it with and no stripper to get wrong: this reads the strings the renderer reads.
 * It is also strictly wider than reading files would be, because a prompt is ASSEMBLED at
 * `generate()` time from `promptFormat.ts` builders and `d1/theming.ts` scenarios and no
 * single file holds the finished sentence. Templates are generated across seeds and across
 * `form`, because `theming.ts` themes a prompt only when `form === "practice"` and the
 * neutral spelling is what the assessment forms serve.
 *
 * THE SEED BASE IS SHARED WITH `validateTemplates` ON PURPOSE, and not out of tidiness.
 * `d1.num-f.l2` contains a latent infinite loop: on the subtract branch it re-draws only
 * `b` while `while (a * d2 === b * d1)` holds, so a draw of `d1 = 4, d2 = 2, a = 2` leaves
 * `b` pinned at its only legal value and the loop never exits. Seed 16 at `form:
 * "practice"` hangs on it. Every pool in this package is generated from `900_000 + index`
 * or from its own frozen seeds, so those streams are the ones known not to reach it; an
 * arbitrary seed range here would hang the suite on a defect this file is not fixing. That
 * loop is reported separately and belongs to D1's owner.
 *
 * The controls, each failing in a different direction:
 *
 *  - the population floors fail if a classifier stops matching, since a sweep over an
 *    empty list passes;
 *  - the NODE CENSUS is the composition assertion, and it is set equality rather than a
 *    floor because a floor bounds size and not shape: 70,000 strings is satisfied by one
 *    domain generated over more seeds. Every node the package declares must appear among
 *    the swept strings, and no swept string may name a node the package does not declare.
 *    Both sides are derived from exports (`*_NODE` / `*_NODES`), so neither is a list
 *    written down here, and a domain silently dropping out fails on the left;
 *  - the D4 assertion names the narrowing this file corrects, so a revert to "D4's frozen
 *    items" fails with that sentence rather than with arithmetic about string counts;
 *  - the FIELD CENSUS is the control that matters most. `d4.test.ts` read `hints` and
 *    `worked_solution` and never `prompt`. More generally, a renamed field leaves the
 *    collector reading nothing while this file reports green over ninety thousand strings,
 *    so each field is asserted present with a floor of its own;
 *  - `learnerStrings` is tested against fixtures in both directions, because a collector
 *    that cannot see the em dash it was written for is the shape of #187.
 *
 * Measured at the tip this landed on: 39 item collections and 46 template collections,
 * 227 distinct templates generated into 10,896 instances, 94,996 learner-visible strings
 * (14,122 prompts, 30,212 hints, 50,662 worked-solution steps) of which 21,642 come from
 * frozen pools and 73,354 from generating templates, over 47 nodes against 47 declared.
 *
 * Verified by injection rather than argued. An em dash in `d1/nodes/NUM.2/index.ts`'s L1
 * hint fails this file at `D1_PRACTICE_ITEMS` and at `D1_PRACTICE_ONLY_TEMPLATES`; one in
 * `d1/theming.ts`'s waterline prompt fails it at the themed `practice` prompts and at none
 * of the neutral `A` ones, which is what proves both forms are being generated (and note
 * that `validateTemplates` samples form `A` only, so no existing check has ever generated
 * a themed prompt). Narrowing the sweep back to D4 while padding the seed count leaves
 * every size floor passing and fails the node census at the 42 nodes it dropped.
 */

import { describe, expect, it } from "vitest";
import * as bank from "./index";
import { generateFromTemplate, type ItemForm, type ItemTemplate } from "./index";

const EM_DASH = "\u2014";

/**
 * Seeds per template per form, from the base `validateTemplates` uses. Templates branch on
 * the draw, so one seed reads one branch: `theming.ts` themes NUM.F only when the result
 * stays under 1, and several templates pick a scenario word per draw. See the header on why
 * the base is not arbitrary.
 */
const SEED_BASE = 900_000;
const SEEDS = 24;

/**
 * Both forms, because the themed and the neutral spelling of a prompt are different strings
 * and a learner is shown both: `practice` in a lesson, `A` in the diagnostic.
 */
const FORMS: readonly ItemForm[] = ["practice", "A"];

/** One learner-visible string, with enough provenance to find it from a failure message. */
interface LearnerString {
  /** The export it was reached through, e.g. `D1_PRACTICE_ITEMS`. */
  readonly collection: string;
  /** Which renderer shows it. */
  readonly field: "prompt" | "hints" | "worked_solution";
  /** The node it belongs to, for the census. */
  readonly node: string;
  /** The item or template instance it came from. */
  readonly owner: string;
  readonly text: string;
}

/**
 * The three fields a learner reads, off anything shaped like a rendered item.
 *
 * Kept separate from the population walk so it can be run against fixtures: a collector
 * that silently reads nothing is indistinguishable from a clean tree.
 */
function learnerStrings(
  collection: string,
  entry: Record<string, unknown>,
): LearnerString[] {
  const node = typeof entry.node_id === "string" ? entry.node_id : "(no node)";
  const owner =
    typeof entry.item_version_id === "string"
      ? entry.item_version_id
      : typeof entry.template_id === "string"
        ? entry.template_id
        : "(anonymous)";
  const found: LearnerString[] = [];
  if (typeof entry.prompt === "string") {
    found.push({ collection, field: "prompt", node, owner, text: entry.prompt });
  }
  for (const field of ["hints", "worked_solution"] as const) {
    const value = entry[field];
    if (!Array.isArray(value)) {
      continue;
    }
    for (const text of value) {
      if (typeof text === "string") {
        found.push({ collection, field, node, owner, text });
      }
    }
  }
  return found;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** The entries of an exported array, or undefined if it is not a non-empty array of objects. */
function objectEntries(value: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }
  const entries = value.filter(isRecord);
  return entries.length === value.length ? entries : undefined;
}

/** An exported array of rendered/frozen items: every entry carries a string `prompt`. */
function asItemCollection(value: unknown): Record<string, unknown>[] | undefined {
  const entries = objectEntries(value);
  if (!entries) {
    return undefined;
  }
  return entries.every((entry) => typeof entry.prompt === "string") ? entries : undefined;
}

/** An exported array of templates: every entry carries `generate` and a `template_id`. */
function asTemplateCollection(value: unknown): ItemTemplate[] | undefined {
  const entries = objectEntries(value);
  if (!entries) {
    return undefined;
  }
  const isTemplate = (entry: Record<string, unknown>) =>
    typeof entry.generate === "function" && typeof entry.template_id === "string";
  return entries.every(isTemplate) ? (entries as unknown as ItemTemplate[]) : undefined;
}

const EXPORTS = Object.entries(bank as Record<string, unknown>);

const ITEM_COLLECTIONS = EXPORTS.flatMap(([name, value]) => {
  const entries = asItemCollection(value);
  return entries ? [[name, entries] as const] : [];
});

const TEMPLATE_COLLECTIONS = EXPORTS.flatMap(([name, value]) => {
  const templates = asTemplateCollection(value);
  return templates ? [[name, templates] as const] : [];
});

/**
 * Generate every distinct template once, attributed to the first collection that exports
 * it. A per-node collection and its domain aggregate hold the SAME template objects, so
 * generating both buys no coverage; identity is safe to dedupe on because the same object
 * produces the same strings.
 */
function generatedStrings(): LearnerString[] {
  const seen = new Set<ItemTemplate>();
  const out: LearnerString[] = [];
  for (const [name, templates] of TEMPLATE_COLLECTIONS) {
    for (const template of templates) {
      if (seen.has(template)) {
        continue;
      }
      seen.add(template);
      for (const form of FORMS) {
        for (let index = 0; index < SEEDS; index += 1) {
          const frozen = generateFromTemplate(template, form, SEED_BASE + index);
          out.push(...learnerStrings(name, frozen as unknown as Record<string, unknown>));
        }
      }
    }
  }
  return out;
}

const FROZEN_STRINGS = ITEM_COLLECTIONS.flatMap(([name, entries]) =>
  entries.flatMap((entry) => learnerStrings(name, entry)),
);

const GENERATED_STRINGS = generatedStrings();

/** Every learner-visible string the package can produce, with its provenance. */
const SWEPT: readonly LearnerString[] = [...FROZEN_STRINGS, ...GENERATED_STRINGS];

/**
 * Every node id the package DECLARES, from its own `*_NODE` / `*_NODES` exports rather than
 * from a list written here, so both sides of the census below are derived from source.
 */
const DECLARED_NODES = new Set(
  EXPORTS.flatMap(([name, value]) => {
    if (name.endsWith("_NODES") && Array.isArray(value)) {
      return value.filter((node): node is string => typeof node === "string");
    }
    if (name.endsWith("_NODE") && typeof value === "string") {
      return [value];
    }
    return [];
  }),
);

const SWEPT_NODES = new Set(SWEPT.map((entry) => entry.node));

describe("no em dash reaches a learner from an item-bank string", () => {
  it("the sweep found the item and template collections", () => {
    // Floors, not censuses, for the reason widgetProseEmDash.test.ts gives: the population
    // is derived, so a new domain is covered the day it is exported. What these catch is a
    // classifier that has stopped matching, leaving a loop over an empty list to pass.
    expect(
      ITEM_COLLECTIONS.length,
      "no exported array classified as a collection of rendered items",
    ).toBeGreaterThanOrEqual(30);
    expect(
      TEMPLATE_COLLECTIONS.length,
      "no exported array classified as a collection of templates",
    ).toBeGreaterThanOrEqual(35);
    expect(
      SWEPT.length,
      "the sweep collected far fewer learner-visible strings than the bank is known to author",
    ).toBeGreaterThanOrEqual(70_000);
  });

  it("every node the package declares appears in the swept strings, and no other", () => {
    // THE COMPOSITION ASSERTION, as set equality rather than a floor, because a floor
    // bounds size and not shape. Both sides are derived from exports. A domain dropping out
    // of the sweep fails on the left; a node reaching a learner that the package never
    // declares fails on the right.
    expect(
      DECLARED_NODES.size,
      "no declared node ids were found, so the census has nothing to measure against",
    ).toBeGreaterThanOrEqual(40);
    const missing = [...DECLARED_NODES].filter((node) => !SWEPT_NODES.has(node)).sort();
    expect(
      missing,
      `nodes the package declares but the sweep never reaches, so their prompts and hints go unchecked:\n${missing.join("\n")}`,
    ).toEqual([]);
    const undeclared = [...SWEPT_NODES].filter((node) => !DECLARED_NODES.has(node)).sort();
    expect(
      undeclared,
      `the sweep reached nodes the package does not declare, so the census is measuring something unexpected:\n${undeclared.join("\n")}`,
    ).toEqual([]);
  });

  it("the population is wider than the one domain the ban used to be asserted over", () => {
    // Names the narrowing this file corrects, so a revert to `D4_PRACTICE_ITEMS` fails with
    // a sentence about D4 rather than with arithmetic about string counts.
    const d4Nodes = new Set<string>(bank.D4_PRACTICE_NODES);
    const beyondD4 = SWEPT.filter((entry) => !d4Nodes.has(entry.node));
    expect(
      new Set(beyondD4.map((entry) => entry.node)).size,
      "the sweep has narrowed back towards D4, the one domain this ban was asserted over before",
    ).toBeGreaterThanOrEqual(38);
    expect(
      beyondD4.length,
      "the sweep has narrowed back towards D4, the one domain this ban was asserted over before",
    ).toBeGreaterThanOrEqual(60_000);
  });

  it("all three learner-visible fields are actually being collected", () => {
    // The FIELD CENSUS. `d4.test.ts`'s check read `hints` and `worked_solution` and never
    // `prompt`, which is how a prompt could carry an em dash in any domain and meet no rule
    // at all. A renamed field would leave the collector reading nothing while this file
    // reported green, so each field carries its own floor.
    const floors = { prompt: 10_000, hints: 20_000, worked_solution: 35_000 } as const;
    for (const [field, floor] of Object.entries(floors)) {
      const collected = SWEPT.filter((entry) => entry.field === field);
      expect(
        collected.length,
        `no ${field} strings were collected, so that renderer's copy is unchecked`,
      ).toBeGreaterThanOrEqual(floor);
    }
  });

  it("templates are generated, not only the pools they were frozen into", () => {
    // A frozen pool holds one instance per cell, but a reveal/retry draws a FRESH instance
    // straight from the template, so a branch no pool froze still reaches a learner. If
    // these fail, the sweep has quietly become a sweep of frozen items only.
    expect(
      GENERATED_STRINGS.length,
      "no strings came from generating a template, so only frozen instances are being checked",
    ).toBeGreaterThanOrEqual(50_000);
    expect(
      new Set(GENERATED_STRINGS.map((entry) => entry.owner)).size,
      "template generation produced too few distinct instances to have covered the draws",
    ).toBeGreaterThanOrEqual(8_000);
    expect(
      FROZEN_STRINGS.length,
      "no strings came from a frozen pool, so the shipped instances are unchecked",
    ).toBeGreaterThanOrEqual(10_000);
  });

  it("learnerStrings collects the fields it is written for, and not other fields", () => {
    // The collector's own fixtures, in both directions. The negative case is the one that
    // would let a real defect through: an em dash in a field nobody renders is editorial,
    // and one in a field the renderer reads must be seen.
    const dirty = learnerStrings("fixture", {
      node_id: "NUM.2",
      item_version_id: "fixture:1",
      prompt: `Evaluate ${EM_DASH} carefully.`,
      hints: [`First ${EM_DASH} look at the sign.`],
      worked_solution: [`Add them ${EM_DASH} then stop.`],
    });
    expect(
      dirty.map((entry) => entry.field),
      "learnerStrings did not collect all three rendered fields",
    ).toEqual(["prompt", "hints", "worked_solution"]);
    expect(
      dirty.filter((entry) => entry.text.includes(EM_DASH)).length,
      "learnerStrings collected the fields but lost the em dash inside them",
    ).toBe(3);

    const clean = learnerStrings("fixture", {
      node_id: "NUM.2",
      item_version_id: "fixture:2",
      prompt: "Evaluate carefully.",
      // Neither is rendered, so an em dash in them is editorial and must not be collected.
      concept: `signed sums ${EM_DASH} the general case`,
      template_params: { note: `internal ${EM_DASH} note` },
    });
    expect(
      clean.filter((entry) => entry.text.includes(EM_DASH)),
      "learnerStrings collected an em dash from a field no renderer shows",
    ).toEqual([]);
  });

  it("no item-bank string renders an em dash", () => {
    const offenders = [
      ...new Set(
        SWEPT.filter((entry) => entry.text.includes(EM_DASH)).map(
          (entry) =>
            `${entry.collection} ${entry.owner} (${entry.node}) ${entry.field}: ${entry.text}`,
        ),
      ),
    ].sort();
    expect(
      offenders,
      `em dash (U+2014) in learner-visible item-bank copy. House style is no em dashes in learner copy; use a comma, a colon or a full stop:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
