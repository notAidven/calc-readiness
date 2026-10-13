/**
 * D10 (Geometry) read as ONE chapter: what its emphasis marks mean, across every surface a
 * learner meets them on.
 *
 * The property is invisible one pack at a time, which is why nothing was catching it. A single
 * bold span is unremarkable; fifteen of them establish a convention, and the sixteenth is read
 * against it. `d8EraProse.test.ts` is the pattern and the reasoning there carries over
 * unchanged; what follows is only what is DIFFERENT about D10, because both differences are
 * places this file could have been written wrong.
 *
 * ## The population is the DOMAIN here, and not the era
 *
 * D8's file derives its population from `getEraNodes("information_age")`, and that is correct
 * there because every node of era nine happens to live in `content/lessons/d8`: the era and the
 * domain are the same set, so deriving from the era costs nothing and is the better-founded of
 * the two.
 *
 * D10 is not that shape. GEO.1 and GEO.2 share the Renaissance with CG.1, POL.6, POL.7 and
 * RAT.5, of which only RAT.5 is authored — and RAT.5 is a D5 pack, graded out of the D5 pool,
 * with a known filed theming item against it that `lesson-qa` says explicitly not to re-raise.
 * So an era-derived population here would either throw on four unauthored nodes or sweep a
 * fifth pack that is not this round's subject and not this domain's chapter. The QA round this
 * file comes from is scoped to the D10 domain directory, so the population is the registered
 * d10 packs and the assertion below names them.
 *
 * That is a narrowing, and it is declared rather than silent: the moment the Renaissance's
 * other nodes are authored, an era-wide reading becomes possible and this file's scope should
 * be revisited. What it must not become is a file that says "the Renaissance" while measuring
 * two of six nodes.
 *
 * ## The emphasis rule reaches the graded surface, so the answer grammar has to be declared
 *
 * D8's italics rule strips backtick spans first, because D8 writes its typed answer as
 * `` `log(m*a*q)` `` and the star inside is multiplication. D10 writes the same thing WITHOUT
 * backticks — `for example 3*sqrt(7)`, `typed as 588*pi` — so nothing marks those stars off,
 * and a rule that simply subtracted the bold would report the exact spelling the prompt exists
 * to teach.
 *
 * Dropping the practice surface to avoid that would have been the wrong move: the graded
 * surface is the one that matters, and an excluded surface and a clean one look identical from
 * outside the guard. So the two templates are a NAMED list held to its reason in both
 * directions, and the reason is checked rather than asserted — every exempted string has to
 * BE an answer spelling.
 */

import { D10_PRACTICE_ITEMS } from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import { cfuInstances } from "./cfuVariants";
import { LESSON_DOMAINS } from "./domains";
import type { LessonContent } from "./types";

const DOMAIN_ID = "d10" as const;

const D10_DOMAIN = LESSON_DOMAINS.find((domain) => domain.id === DOMAIN_ID);

if (D10_DOMAIN === undefined) {
  throw new Error(
    "d10 is not a registered lesson domain, so this file would sweep nothing at all",
  );
}

/** The registered packs, in the domain's own display order. */
const PACKS: readonly LessonContent[] = D10_DOMAIN.lessons;

/** One learner-visible string, with enough of a path to find it by. */
interface Surface {
  readonly where: string;
  readonly text: string;
  /** Set on practice prose only, which is the surface the star exemption is scoped to. */
  readonly templateId?: string;
}

/** Where a term is allowed to be introduced: the slides themselves. */
const SLIDE_BODIES: readonly Surface[] = PACKS.flatMap((pack) =>
  pack.mini_lesson.map((text, index) => ({
    where: `${pack.node_id} mini_lesson[${index}]`,
    text,
  })),
);

/** Headings and the authored ask: read, but never a place a term may be introduced. */
const PACK_ASKS: readonly Surface[] = PACKS.flatMap((pack) => {
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
 * The half a pack-only census cannot see. Both D10 checks draw from a generator rather than
 * from the pool, so these strings exist nowhere in `content/lessons/d10`.
 */
const DRAWN_ASKS: readonly Surface[] = PACKS.flatMap((pack) => {
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
const PRACTICE_ASKS: readonly Surface[] = D10_PRACTICE_ITEMS.flatMap((item) => [
  {
    where: `${item.item_version_id} prompt`,
    text: item.prompt,
    templateId: item.template_id,
  },
  ...item.hints.map((text, index) => ({
    where: `${item.item_version_id} hints[${index}]`,
    text,
    templateId: item.template_id,
  })),
  ...item.worked_solution.map((text, index) => ({
    where: `${item.item_version_id} worked_solution[${index}]`,
    text,
    templateId: item.template_id,
  })),
]);

const GRADED_OR_HEADED: readonly Surface[] = [
  ...PACK_ASKS,
  ...DRAWN_ASKS,
  ...PRACTICE_ASKS,
];

const ALL_LEARNER_TEXT: readonly Surface[] = [...SLIDE_BODIES, ...GRADED_OR_HEADED];

/**
 * Floors, so nothing below can be satisfied by an empty collection. Every rule here proves a
 * term ABSENT by a filter coming back empty, and an empty haystack proves that for free.
 */
const MIN_PACKS = 2;
const MIN_SLIDE_BODIES = 8;
const MIN_DRAWN_ASKS = 8;
const MIN_PRACTICE_ASKS = 300;

describe("D10's prose sweep measures the domain it claims to", () => {
  it(`sweeps ${ALL_LEARNER_TEXT.length} learner-visible strings across ${PACKS.length} packs`, () => {
    // Composition and not only size: a floor of two is met by any two packs, and the claim
    // this file makes is about GEO.1 and GEO.2 specifically.
    expect(
      PACKS.map((pack) => pack.node_id).sort(),
      "the registered d10 packs are not the two this file sweeps",
    ).toEqual(["GEO.1", "GEO.2"]);
    expect(PACKS.length).toBeGreaterThanOrEqual(MIN_PACKS);
    expect(SLIDE_BODIES.length, "the domain's slides went missing").toBeGreaterThanOrEqual(
      MIN_SLIDE_BODIES,
    );
    expect(
      DRAWN_ASKS.length,
      "no CFU re-ask resolved, so the drawn half of every question is unswept",
    ).toBeGreaterThanOrEqual(MIN_DRAWN_ASKS);
    expect(
      PRACTICE_ASKS.length,
      "the D10 practice pool resolved almost nothing, so the graded surface is unswept",
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
 * The terms D10 introduces in bold, in reading order.
 *
 * This is the EXPECTED value; the actual set is read off the packs, and the comparison runs
 * both ways. A new term bolded without being listed fails, and a listed term that stops being
 * bolded fails, so the list cannot sit here describing a convention the domain has abandoned.
 */
const DOMAIN_INTRODUCED_TERMS: readonly string[] = [
  // GEO.1
  "legs",
  "hypotenuse",
  "Pythagorean theorem",
  "square root",
  "supplementary",
  "vertical angles",
  "similar",
  "corresponding sides",
  "scale factor",
  // GEO.2
  "area",
  "perimeter",
  "composite figure",
  "volume",
  // Glossed in D10 round 2. "cross section" ran twelve times across the slide, the worked
  // example under it and the widget it mounts, with no definition on any of them, and
  // "prism" carried its definition unemphasised while fifteen bold spans were telling the
  // learner where definitions live. "cylinder" is deliberately NOT here: the picture the
  // everyday word gives is the geometric one, and the slide adds no meaning to it.
  "cross section",
  "prism",
  "surface area",
  "net",
];

/** A floor under the derived count, below the list, so an empty parse cannot pass. */
const MIN_BOLD_SPANS = 12;

const BOLD_SPAN = /\*\*([^*]+)\*\*/g;

const BOLD_SPANS: readonly Surface[] = [...SLIDE_BODIES, ...PACK_ASKS].flatMap((surface) =>
  Array.from(surface.text.matchAll(BOLD_SPAN), (match) => ({
    where: surface.where,
    text: match[1] as string,
  })),
);

describe("D10 bolds a term being introduced, and never ordinary emphasis", () => {
  it(`reads ${BOLD_SPANS.length} bold spans off the domain`, () => {
    expect(
      BOLD_SPANS.length,
      "the bold-span parse came back nearly empty, so the census below measures nothing",
    ).toBeGreaterThanOrEqual(MIN_BOLD_SPANS);
  });

  it("bolds nothing that is not a term it is introducing", () => {
    const declared = new Set(DOMAIN_INTRODUCED_TERMS);
    const undeclared = BOLD_SPANS.filter((span) => !declared.has(span.text));
    expect(
      undeclared.map((span) => `${span.where}: **${span.text}**`),
      "a bold span in D10 is not a term being introduced. After fifteen spans that each mark " +
        "a definition, a learner reads the sixteenth as vocabulary and goes looking for a " +
        "gloss that is not there (R6). Unbold it, or add it here with the definition that " +
        "earns it",
    ).toEqual([]);
  });

  it("still introduces every term it says it does", () => {
    const bolded = new Set(BOLD_SPANS.map((span) => span.text));
    const unbolded = DOMAIN_INTRODUCED_TERMS.filter((term) => !bolded.has(term));
    expect(
      unbolded,
      "a term listed here is no longer introduced in bold anywhere in D10, so this list has " +
        "stopped describing the domain",
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
      "a term is introduced twice in one domain, so the second slide teaches something the " +
        "learner has already been given a definition for",
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------- *
 * One emphasis mark, domain-wide.
 * ------------------------------------------------------------------------------------- */

/**
 * Whatever emphasis is left once every bold span is removed: an italic, or a stray asterisk.
 *
 * Deliberately not a regex for italics. A `*` that is not part of a `**...**` pair is either
 * an italic mark or a typo that will render as one, and both are findings, so subtracting the
 * bold is the whole rule. Backtick spans come out first for parity with D8's rule, which needs
 * them; D10 authors no backtick span, and the sweep below would be identical without this.
 */
function residualEmphasis(text: string): boolean {
  return text
    .replace(/`[^`]*`/g, "")
    .replace(/\*\*[^*]+\*\*/g, "")
    .includes("*");
}

/**
 * The practice templates whose prose writes the ASCII answer spelling inline, where the `*` is
 * multiplication and not an italic.
 *
 * NOT an exclusion of the practice surface: these two templates are swept for every other
 * property, the rest of D10's ten templates are swept for this one, and a star appearing
 * anywhere outside this list is reported. Each entry is held to three things below, so it is
 * provable rather than decorative:
 *
 *  - it still names a SERVED template, so a renamed or retired shape cannot sit here forever;
 *  - it still carries a residual star somewhere, so an entry that has stopped excusing
 *    anything fails instead of quietly exempting a template that could grow a real italic;
 *  - every residual star it carries is an ANSWER SPELLING, which is the reason itself. A star
 *    in one of these templates that is not a coefficient against `pi` or `sqrt(` is exactly
 *    the italic this rule is looking for, and it fails here rather than being excused.
 */
const STAR_IS_ANSWER_GRAMMAR: ReadonlySet<string> = new Set([
  // `Write a square root as sqrt(...), for example 3*sqrt(7)`, and the worked solution's
  // closing "typed as 3*sqrt(7)". The prompt names the spelling because the field's
  // placeholder is the only other thing that could, and the answer is graded on its form.
  "d10.geo1.exact-diagonal.l3",
  // `Write pi as pi, for example 3*pi`, and "typed as 588*pi". This template is served behind
  // a bare "Your answer" with no key row and no preview, which is why its prompt is carrying
  // the notation instruction in prose at all; see the entry for it in `answerKeypad.test.ts`.
  "d10.geo2.cylinder-volume-exact.l3",
]);

/** A coefficient written against a declared symbol: the ASCII grammar, and nothing else. */
const ANSWER_GRAMMAR_STAR = /\d\s*\*\s*(?:pi\b|sqrt\()/;

const EMPHASISED = ALL_LEARNER_TEXT.filter((surface) => residualEmphasis(surface.text));

describe("D10 marks emphasis one way", () => {
  it(`finds no italics across ${ALL_LEARNER_TEXT.length} learner-visible strings`, () => {
    const italicised = EMPHASISED.filter(
      (surface) =>
        surface.templateId === undefined || !STAR_IS_ANSWER_GRAMMAR.has(surface.templateId),
    );
    expect(
      italicised.map((surface) => `${surface.where}: ${surface.text.slice(0, 90)}`),
      "D10 bolds fifteen terms and would be using a second emphasis mark here, so the one " +
        "italic reads as a register the learner has to interpret. Resolve it into words, or " +
        "into the bold the domain already uses for a term",
    ).toEqual([]);
  });

  /**
   * The pack surfaces carry NO exemption, and the absence is the point: the ASCII grammar
   * lives in the item bank, so a star in an authored pack is a finding whatever it looks like.
   */
  it("leaves no star in an authored pack at all", () => {
    expect(
      [...SLIDE_BODIES, ...PACK_ASKS, ...DRAWN_ASKS]
        .filter((surface) => residualEmphasis(surface.text))
        .map((surface) => `${surface.where}: ${surface.text.slice(0, 90)}`),
    ).toEqual([]);
  });
});

describe("the exception to D10's emphasis rule is declared, not omitted", () => {
  it("names a minority of the templates the sweep covers", () => {
    const swept = new Set(D10_PRACTICE_ITEMS.map((item) => item.template_id));
    expect(swept.size, "no D10 template is served").toBeGreaterThanOrEqual(10);
    // A list that reached every template would leave the rule asserting nothing while still
    // reading as a guard.
    expect(swept.size).toBeGreaterThan(STAR_IS_ANSWER_GRAMMAR.size * 2);
  });

  it.each([...STAR_IS_ANSWER_GRAMMAR])("%s is still a served template", (templateId) => {
    expect(
      D10_PRACTICE_ITEMS.filter((item) => item.template_id === templateId).length,
      "a declared exception serves no item, so it exempts nothing and hides that it does",
    ).toBeGreaterThan(0);
  });

  it.each([...STAR_IS_ANSWER_GRAMMAR])(
    "%s still writes a star, and every one of them is an answer spelling",
    (templateId) => {
      const carried = PRACTICE_ASKS.filter(
        (surface) => surface.templateId === templateId && residualEmphasis(surface.text),
      );
      // Direction one: an entry whose prose stopped carrying a star excuses nothing, and
      // leaving it here would exempt a template that could then grow a real italic unseen.
      expect(
        carried.length,
        "no served string carries a star, so this entry exempts nothing",
      ).toBeGreaterThan(0);
      // The REASON, measured on every string rather than argued once: each star is a
      // coefficient against a declared symbol. A star that is not fails HERE, inside the
      // exemption, which is what stops the entry becoming a blanket pass for the template.
      expect(
        carried
          .filter((surface) => !ANSWER_GRAMMAR_STAR.test(surface.text))
          .map((surface) => `${surface.where}: ${surface.text.slice(0, 110)}`),
        "a star in an exempted template is not an answer spelling, so the ground this entry " +
          "stands on does not cover it",
      ).toEqual([]);
    },
  );
});
