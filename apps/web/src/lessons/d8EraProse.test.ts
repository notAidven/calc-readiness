/**
 * Era nine (Information Age) read as ONE chapter: what its emphasis marks mean, and which
 * technical words it is allowed to use without teaching them.
 *
 * Both properties are invisible one pack at a time, which is why nothing was catching them.
 * A single bold span is unremarkable; twenty-one of them establish a convention, and the
 * twenty-second is read against it. A term used once in a subtitle looks like prose; the same
 * term turning up in a graded prompt with no gloss behind it is a teaching failure (R32).
 *
 * ## The population is the ERA, and it is derived
 *
 * `getEraNodes` is the authored membership (`packages/skill-graph/src/eras.ts`), so this file
 * cannot drift off the era the way a typed-out node list would. Every node of era nine happens
 * to live in `content/lessons/d8`, and the pool that grades them is `D8_PRACTICE_ITEMS`; if the
 * era ever spans two directories the derivation above still holds and only the pool import
 * would need widening, which the floors below would report as a shortfall rather than pass over.
 *
 * Three surfaces, because a term the learner is GRADED on is the case that matters and none of
 * the three alone covers it:
 *
 *  - the pack's own slide bodies, which is where a term is allowed to be taught;
 *  - the pack's headings and its authored CFU, plus the DRAWN re-ask instances from
 *    `cfuVariants.ts`, which is a second question the learner is graded on and which no
 *    pack-only census can see;
 *  - the frozen practice pool's prompts, hints and worked solutions.
 *
 * `cfu.accepted` is deliberately excluded: those are answer SPELLINGS rather than prose, EL.2
 * and EL.4 enumerate 144 and 256 of them, and a `*` inside `log(8*y)` is notation rather than
 * an italic. Nothing in this file is a claim about them.
 *
 * WHAT THIS DOES NOT REACH, stated so the sweep is not mistaken for full coverage: the
 * worked-solution FIGURES in `apps/web/src/lessons/worked/d8EL*.tsx` build their titles and
 * captions from `template_params` at render time, so a term can only be read out of them by
 * rendering (`visualsMath.test.tsx` is where that happens). `d8EL2.tsx`'s figure title carried
 * "the anchor point" and was cut by hand in the same commit as the entry below; a regression
 * there would not fail this file.
 *
 * ## Why the term list is declared rather than derived
 *
 * There is no mechanical signal separating "compounding" from "hourly". Measured at `c310ac37`:
 * of the words appearing in the era's subtitles and CFU blocks but in no slide body, 29 come
 * from subtitles alone and every pack contributes a further 5 to 16 from its CFU, nearly all of
 * them ordinary English. A rule over that population would cry wolf, and `lesson-qa` records
 * that R32 has no validator rule for exactly this reason.
 *
 * So this is a LEDGER at word granularity, the same instrument as `BANNED_PHRASES` in
 * `scan-lesson-text.mjs` and with the same limit: it makes four specific cuts permanent and it
 * does not detect a new unearned term. Each entry fails in BOTH directions, which is what stops
 * it becoming decorative:
 *
 *  - a `cut` term coming back anywhere a learner reads fails;
 *  - a `taught` term whose gloss is deleted fails, AND a `taught` term that nothing grades or
 *    heads any more fails as STALE, so the entry cannot go on demanding a gloss for a word the
 *    era has stopped using.
 */

import { D8_PRACTICE_ITEMS } from "@cr/item-bank";
import { getEraNodes } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { cfuInstances } from "./cfuVariants";
import { allLessons } from "./domains";
import type { LessonContent } from "./types";

const ERA_ID = "information_age" as const;

const ERA_NODE_IDS = getEraNodes(ERA_ID);

const ERA_PACKS: readonly LessonContent[] = ERA_NODE_IDS.map((nodeId) => {
  const lesson = allLessons.find((candidate) => candidate.node_id === nodeId);
  if (lesson === undefined) {
    throw new Error(
      `${nodeId} belongs to era nine and is not registered, so this file would sweep a partial era`,
    );
  }
  return lesson;
});

/** One learner-visible string, with enough of a path to find it by. */
interface Surface {
  readonly where: string;
  readonly text: string;
}

/** Where a term is allowed to be introduced: the slides themselves. */
const SLIDE_BODIES: readonly Surface[] = ERA_PACKS.flatMap((pack) =>
  pack.mini_lesson.map((text, index) => ({
    where: `${pack.node_id} mini_lesson[${index}]`,
    text,
  })),
);

/** Headings and the authored ask: read, but never a place a term may be introduced. */
const PACK_ASKS: readonly Surface[] = ERA_PACKS.flatMap((pack) => {
  const out: Surface[] = [{ where: `${pack.node_id} title`, text: pack.title }];
  (pack.slide_subtitles ?? []).forEach((text, index) => {
    out.push({ where: `${pack.node_id} slide_subtitles[${index}]`, text });
  });
  const cfu = pack.cfu;
  if (cfu !== undefined) {
    out.push({ where: `${pack.node_id} cfu.prompt`, text: cfu.prompt });
    out.push({ where: `${pack.node_id} cfu.hint`, text: cfu.hint });
    (cfu.worked_solution ?? []).forEach((text, index) => {
      out.push({ where: `${pack.node_id} cfu.worked_solution[${index}]`, text });
    });
  }
  return out;
});

/**
 * The re-ask the learner is graded on after taking the reveal, spelled by `cfuVariants.ts`.
 *
 * This is the half a pack-only census cannot see, and it is where the term this file cuts was
 * still live after the pack had been edited.
 */
const DRAWN_ASKS: readonly Surface[] = ERA_PACKS.flatMap((pack) => {
  const cfu = pack.cfu;
  if (cfu === undefined) {
    return [];
  }
  return cfuInstances(cfu).flatMap((instance, index) => [
    { where: `${pack.node_id} drawn[${index}].prompt`, text: instance.prompt },
    { where: `${pack.node_id} drawn[${index}].hint`, text: instance.hint },
    ...instance.workedSolution.map((text, step) => ({
      where: `${pack.node_id} drawn[${index}].workedSolution[${step}]`,
      text,
    })),
  ]);
});

/** Every served practice item's prose: the surface a term is actually graded on. */
const PRACTICE_ASKS: readonly Surface[] = D8_PRACTICE_ITEMS.flatMap((item) => [
  { where: `${item.item_version_id} prompt`, text: item.prompt },
  ...item.hints.map((text, index) => ({
    where: `${item.item_version_id} hints[${index}]`,
    text,
  })),
  ...item.worked_solution.map((text, index) => ({
    where: `${item.item_version_id} worked_solution[${index}]`,
    text,
  })),
]);

const GRADED_OR_HEADED: readonly Surface[] = [
  ...PACK_ASKS,
  ...DRAWN_ASKS,
  ...PRACTICE_ASKS,
];

const ALL_LEARNER_TEXT: readonly Surface[] = [...SLIDE_BODIES, ...GRADED_OR_HEADED];

/**
 * Floors, so nothing below can be satisfied by an empty collection. A `cut` term is proved
 * absent by a filter coming back empty, and an empty haystack proves that for free.
 */
const MIN_ERA_NODES = 6;
const MIN_SLIDE_BODIES = 20;
const MIN_DRAWN_ASKS = 12;
const MIN_PRACTICE_ASKS = 200;

describe("era nine's prose sweep measures the era it claims to", () => {
  it(`sweeps ${ALL_LEARNER_TEXT.length} learner-visible strings across ${ERA_PACKS.length} packs`, () => {
    expect(ERA_NODE_IDS.length, "era nine lost nodes").toBeGreaterThanOrEqual(
      MIN_ERA_NODES,
    );
    expect(SLIDE_BODIES.length, "the era's slides went missing").toBeGreaterThanOrEqual(
      MIN_SLIDE_BODIES,
    );
    expect(
      DRAWN_ASKS.length,
      "no CFU re-ask resolved, so the drawn half of every question is unswept",
    ).toBeGreaterThanOrEqual(MIN_DRAWN_ASKS);
    expect(
      PRACTICE_ASKS.length,
      "the D8 practice pool resolved almost nothing, so the graded surface is unswept",
    ).toBeGreaterThanOrEqual(MIN_PRACTICE_ASKS);
    // Every string is non-empty, so a rule below cannot pass over a blank one.
    expect(
      ALL_LEARNER_TEXT.filter((surface) => surface.text.trim().length === 0),
      "a learner-visible string is empty",
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------- *
 * Bold means "a term is being introduced here", and nothing else.
 * ------------------------------------------------------------------------------------- */

/**
 * The terms era nine introduces in bold, in reading order.
 *
 * This is the EXPECTED value; the actual set is read off the packs, and the comparison runs
 * both ways. A new term bolded without being listed fails, and a listed term that stops being
 * bolded fails, so the list cannot sit here describing a convention the era has abandoned.
 */
const ERA_INTRODUCED_TERMS: readonly string[] = [
  // EL.1
  "base",
  "initial amount",
  "exponential function",
  "growth factor",
  "exponential decay",
  "compounding",
  "the number $e$",
  // EL.2
  "horizontal asymptote",
  "transformation",
  "reflection",
  // EL.3
  "logarithm",
  "argument",
  "common logarithm",
  "natural logarithm",
  /*
   * EL.4 introduces nothing, which is deliberate and is the only pack in the era that does not.
   * It used to bold `vertical asymptote`, `domain` and `Set-builder notation`, and all three were
   * SECOND introductions read in era order: RAT.5 (era six) reaches the asymptote, the domain and
   * set-builder notation before this pack does, and FUN.2 (era seven) reaches the domain again.
   * The 2026-08-08 R32 sweep cut the three glosses down to reminders, and `scan-lesson-text.mjs`
   * now bans the exact sentences that carried them, so restoring a bold here would put the term
   * back in front of a learner as a first meeting three eras after their first meeting.
   */
  // EL.5
  "expand",
  "condense",
  "change of base",
  // EL.6
  "extraneous",
];

/** A floor under the derived count, well below the list, so an empty parse cannot pass. */
const MIN_BOLD_SPANS = 18;

const BOLD_SPAN = /\*\*([^*]+)\*\*/g;

const BOLD_SPANS: readonly Surface[] = [...SLIDE_BODIES, ...PACK_ASKS].flatMap((surface) =>
  Array.from(surface.text.matchAll(BOLD_SPAN), (match) => ({
    where: surface.where,
    text: match[1] as string,
  })),
);

describe("era nine bolds a term being introduced, and never ordinary emphasis", () => {
  it(`reads ${BOLD_SPANS.length} bold spans off the era`, () => {
    expect(
      BOLD_SPANS.length,
      "the bold-span parse came back nearly empty, so the census below measures nothing",
    ).toBeGreaterThanOrEqual(MIN_BOLD_SPANS);
  });

  it("bolds nothing that is not a term it is introducing", () => {
    const declared = new Set(ERA_INTRODUCED_TERMS);
    const undeclared = BOLD_SPANS.filter((span) => !declared.has(span.text));
    expect(
      undeclared.map((span) => `${span.where}: **${span.text}**`),
      "a bold span in era nine is not a term being introduced. After twenty-one spans that " +
        "each mark a definition, a learner reads the twenty-second as vocabulary and goes " +
        "looking for a gloss that is not there (R6). Unbold it, or add it here with the " +
        "definition that earns it",
    ).toEqual([]);
  });

  it("still introduces every term it says it does", () => {
    const bolded = new Set(BOLD_SPANS.map((span) => span.text));
    const unbolded = ERA_INTRODUCED_TERMS.filter((term) => !bolded.has(term));
    expect(
      unbolded,
      "a term listed here is no longer introduced in bold anywhere in era nine, so this " +
        "list has stopped describing the era",
    ).toEqual([]);
  });

  it("introduces no term twice", () => {
    const seen = new Map<string, string[]>();
    for (const span of BOLD_SPANS) {
      seen.set(span.text, [...(seen.get(span.text) ?? []), span.where]);
    }
    const repeated = [...seen.entries()]
      .filter(([, wheres]) => wheres.length > 1)
      .map(([term, wheres]) => `**${term}** at ${wheres.join(", ")}`);
    expect(
      repeated,
      "a term is introduced twice in one era, so the second slide teaches something the " +
        "learner has already been given a definition for",
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------- *
 * One emphasis mark, era-wide.
 * ------------------------------------------------------------------------------------- */

/**
 * Whatever emphasis is left once every bold span is removed: an italic, or a stray asterisk.
 *
 * Deliberately not a regex for italics. A `*` that is not part of a `**...**` pair is either
 * an italic mark or a typo that will render as one, and both are findings, so subtracting the
 * bold is the whole rule.
 *
 * Backtick spans come out first, because they are the ASCII answer grammar rather than prose
 * and their `*` is multiplication. Measured rather than assumed: without this the rule reported
 * seven copies of `d8.el5.condense-sum.l2`'s step "which is typed `log(m*a*q)`", which is the
 * exact string the keypad asks the learner to type.
 */
function residualEmphasis(text: string): boolean {
  return text
    .replace(/`[^`]*`/g, "")
    .replace(/\*\*[^*]+\*\*/g, "")
    .includes("*");
}

describe("era nine marks emphasis one way", () => {
  it(`finds no italics across ${ALL_LEARNER_TEXT.length} learner-visible strings`, () => {
    const italicised = ALL_LEARNER_TEXT.filter((surface) => residualEmphasis(surface.text));
    expect(
      italicised.map((surface) => `${surface.where}: ${surface.text.slice(0, 90)}`),
      "era nine uses italics in one place and bold in twenty-one others, so the one italic " +
        "reads as a third register the learner has to interpret. The era's own contrastive " +
        "emphasis is done in words and in capitals, so resolve it into one of those",
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------- *
 * The term ledger: four words, each with the disposition its objection settled on.
 * ------------------------------------------------------------------------------------- */

interface TermEntry {
  /** The word as a reviewer quoted it. */
  readonly term: string;
  /** Matched against learner prose, so a stem covers the inflections the era uses. */
  readonly pattern: RegExp;
  /** `taught`: a slide must gloss it. `cut`: no learner-visible string may hold it. */
  readonly disposition: "taught" | "cut";
  readonly why: string;
}

const TERM_LEDGER: readonly TermEntry[] = [
  {
    term: "compounding",
    pattern: /compound/i,
    disposition: "taught",
    why:
      "EL.1 headed slide 3 'The ceiling on compounding' and the L3 practice prompt grades " +
      "'interest compounded continuously', while no slide said the word at all. The concept " +
      "was already on that slide, so the gloss earns the heading and the graded term in one " +
      "move; deleting it from the heading would have left the practice term unglossed",
  },
  {
    term: "anchor",
    // No `\b` on the tail, so "anchors", "anchor's" and "anchored" are all covered. The
    // leading boundary is what keeps `textAnchor` and `useRevealAnchor` out, and those are
    // identifiers rather than learner copy in any case.
    pattern: /\banchor/i,
    disposition: "cut",
    why:
      "'the anchor' named the point $(0, 1)$ on four surfaces the learner is GRADED on -- " +
      "EL.2's CFU block, its drawn re-ask, and the worked solutions of " +
      "d8.el2.anchor-point.l2 -- and on none where they are taught. It is also not a term " +
      "they can look up, so glossing it would have taught a coinage (R23) where the same " +
      "template's own prompt already says 'The point $(0, 1)$ lies on the graph'. The " +
      "template_id keeps the word, because an identifier is not learner-visible and renaming " +
      "it would move a frozen item_version_id",
  },
  {
    term: "geometrically",
    pattern: /geometric/i,
    disposition: "cut",
    why:
      "sole learner-facing use of the stem in the era, in the copy a learner reads AFTER " +
      "getting the CFU wrong, where the clause before it ('The same factor comes back') " +
      "already carries the whole meaning (R32, R33)",
  },
  {
    term: "identity",
    pattern: /\bidentit(?:y|ies)\b/i,
    disposition: "cut",
    why:
      "sole use in the era, behind a definite article on EL.5 slide 3, with no definition " +
      "anywhere. 'it holds just as well' says the same thing and owes nothing (R32)",
  },
];

const matches = (entry: TermEntry, surfaces: readonly Surface[]): readonly Surface[] =>
  surfaces.filter((surface) => entry.pattern.test(surface.text));

describe("era nine's term ledger", () => {
  it("holds an entry for every word a reviewer ruled on", () => {
    // A floor, so an emptied ledger could not make every case below vacuous.
    expect(TERM_LEDGER.length, "the term ledger was emptied").toBeGreaterThanOrEqual(4);
    expect(
      TERM_LEDGER.filter((entry) => entry.why.trim().length < 40),
      "an entry carries no objection, so whoever trips it learns nothing",
    ).toEqual([]);
  });

  it.each(TERM_LEDGER.filter((entry) => entry.disposition === "taught"))(
    "$term is glossed on a slide, not only where the learner is graded",
    (entry: TermEntry) => {
      const taught = matches(entry, SLIDE_BODIES);
      expect(
        taught.length,
        `no slide in era nine uses "${entry.term}", so it is graded or headed with no gloss behind it: ${entry.why}`,
      ).toBeGreaterThan(0);
      const demanded = matches(entry, GRADED_OR_HEADED);
      expect(
        demanded.length,
        `nothing in era nine grades or heads "${entry.term}" any more, so this entry is STALE: revisit it rather than keeping a gloss on trust`,
      ).toBeGreaterThan(0);
    },
  );

  it.each(TERM_LEDGER.filter((entry) => entry.disposition === "cut"))(
    "$term appears in no learner-visible string of era nine",
    (entry: TermEntry) => {
      expect(
        matches(entry, ALL_LEARNER_TEXT).map(
          (surface) => `${surface.where}: ${surface.text.slice(0, 110)}`,
        ),
        `"${entry.term}" is back in learner copy: ${entry.why}`,
      ).toEqual([]);
    },
  );
});
