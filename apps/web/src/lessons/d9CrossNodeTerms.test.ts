/**
 * D9 read across its nodes: a term or a notation a pack GRADES on has to be a term or a
 * notation that pack, or an ancestor of it, has actually handed the learner.
 *
 * Three findings from the D9 QA round are what this file exists for, and all three are
 * invisible one pack at a time, which is why nothing was catching them. TRG.8's prose runs on
 * "reference angle" and "quadrant" while the graph gives it no path to the node that defines
 * either. TRG.7 grades on `\arcsin` and `\arccos` while naming neither. TRG.5's summary
 * described its own phase shift as a number to be copied out of the rule, which its slide 2
 * and its own L3 item both contradict.
 *
 * ## What is derived and what is declared
 *
 * The two term-level populations are DERIVED, because a written-down list of "terms TRG.8
 * borrows" is a list of the ones somebody noticed:
 *
 *  - the borrowed terms come from TRG.3's own bold spans, filtered to the ones TRG.8's prose
 *    uses. TRG.3 introduces three terms in bold and TRG.8 uses two of them, so the filter has
 *    to do real work rather than pass everything;
 *  - the inverse notations come from the surfaces TRG.7 is GRADED on: its served practice
 *    items and its own check. A notation a learner only ever meets in a prompt is exactly the
 *    defect, so the prompt is the right place to read the population off.
 *
 * What is DECLARED is the recall each borrowed term owes, because "is this term glossed" is
 * not a property a regex can compute. That makes the assertion a deletion guard rather than a
 * discovery, and a deletion guard is the right shape here: the gloss is the fix, and the way
 * it regresses is somebody tightening the slide and cutting it.
 *
 * ## Why the graph assertion is here, and why it is asserted in both directions
 *
 * The recall in TRG.8 is owed BECAUSE TRG.3 is not an ancestor of it. That is a fact about
 * `skill_graph.json`, so it is read from the graph rather than restated: if the `TRG.4` edge
 * the item-family block already implies is ever promoted to TRG.8's own `prereqs`, TRG.3
 * becomes an ancestor, the assertion below fails, and whoever lands that edge gets to decide
 * deliberately whether the recall is still wanted.
 *
 * The ancestor walk is asserted POSITIVE on TRG.7 first, and that is not decoration. TRG.3 is
 * an ancestor of TRG.7 by way of TRG.4, so the positive case proves the walk actually walks --
 * without it a broken walk returns an empty set and "TRG.3 is not in TRG.8's ancestors" passes
 * for the wrong reason, which is the quietest possible green.
 *
 * ## Why two of these rules ask more than "does the string occur"
 *
 * A containment assertion asks whether a string appears, and a string can appear because the
 * teaching is present OR because some incidental sentence happens to spell the same words.
 * Once the second is possible the guard has stopped measuring the first, and deleting the
 * teaching moves nothing. Both of the rules below were measured green over the exact defect
 * they name, at 5bac81f0 and against the shipped file:
 *
 *  - the notation rule required TRG.7's slides to CONTAIN `\arcsin`. Drop the clause that
 *    names it and the pack's sole remaining `\arcsin` is the bare use inside
 *    $\sin(\arcsin r)$ on slide 2, which is the defect itself -- a symbol met with nothing to
 *    say what it is. 13 passed / 13, completely green;
 *  - the TRG.5 rule required the summary to contain "highest", "lowest" and "twice the
 *    amplitude". Cut the clause that says how the first two are COMPUTED and the surviving
 *    "the distance from the lowest up to the highest is twice the amplitude" still spells all
 *    three. 13 passed / 13.
 *
 * So neither asserts a vocabulary any more. The notation rule asserts that the slide where a
 * symbol FIRST reaches a learner says what it is, at a position before the symbol, so moving
 * the naming below the first use fails as well as deleting it. The TRG.5 rule asserts the
 * arithmetic behind each reading `features.l3` grades, not the nouns that reading uses.
 */

import { D9_PRACTICE_ITEMS } from "@cr/item-bank";
import { getNode } from "@cr/skill-graph";
import { describe, expect, it } from "vitest";

import { LESSON_DOMAINS } from "./domains";
import type { LessonContent } from "./types";

const D9_DOMAIN = LESSON_DOMAINS.find((domain) => domain.id === "d9");

if (D9_DOMAIN === undefined) {
  throw new Error("d9 is not a registered lesson domain, so this file would sweep nothing");
}

const PACKS: readonly LessonContent[] = D9_DOMAIN.lessons;

function packOrThrow(nodeId: string): LessonContent {
  const pack = PACKS.find((candidate) => candidate.node_id === nodeId);
  if (pack === undefined) {
    throw new Error(
      `${nodeId} is not a registered d9 pack, so its rules would measure nothing`,
    );
  }
  return pack;
}

const TRG3 = packOrThrow("TRG.3");
const TRG5 = packOrThrow("TRG.5");
const TRG7 = packOrThrow("TRG.7");
const TRG8 = packOrThrow("TRG.8");

/** A pack's slide bodies as one lowercased haystack: where a term may be introduced. */
function prose(pack: LessonContent): string {
  return pack.mini_lesson.join("\n").toLowerCase();
}

/** Every `**bolded**` span in a pack's slides, which is how D9 marks a term it introduces. */
function boldTerms(pack: LessonContent): readonly string[] {
  return pack.mini_lesson.flatMap((slide) =>
    Array.from(slide.matchAll(/\*\*([^*]+)\*\*/g), (match) =>
      (match[1] ?? "").toLowerCase(),
    ),
  );
}

describe("the D9 cross-node sweep measures the domain it claims to", () => {
  it("reads all nine authored packs and the served D9 pool", () => {
    expect(
      PACKS.map((pack) => pack.node_id).sort(),
      "the registered d9 packs are not the nine this file reasons about",
    ).toEqual([
      "TRG.1",
      "TRG.2",
      "TRG.3",
      "TRG.4",
      "TRG.5",
      "TRG.6",
      "TRG.7",
      "TRG.8",
      "TRG.9",
    ]);
    expect(
      D9_PRACTICE_ITEMS.length,
      "the D9 practice pool resolved nothing, so every graded surface below is unswept",
    ).toBeGreaterThanOrEqual(40);
  });
});

/* ------------------------------------------------------------------------------------- *
 * TRG.8 recalls the two terms it borrows from a node that is not its ancestor.
 * ------------------------------------------------------------------------------------- */

/** Every node reachable from `nodeId` by following `prereqs`, transitively. */
function hardAncestors(nodeId: string): ReadonlySet<string> {
  const seen = new Set<string>();
  const queue = [...(getNode(nodeId)?.prereqs ?? [])];
  while (queue.length > 0) {
    const next = queue.pop();
    if (next === undefined || seen.has(next)) {
      continue;
    }
    seen.add(next);
    queue.push(...(getNode(next)?.prereqs ?? []));
  }
  return seen;
}

/**
 * The recall each borrowed term owes TRG.8, and the substrings that carry it.
 *
 * Held to {@link BORROWED_TERMS} in both directions below, so a term that stops being borrowed
 * cannot sit here demanding a gloss for nothing, and a newly borrowed term cannot arrive with
 * no recall required of it.
 */
const RECALL_OWED: Readonly<Record<string, readonly string[]>> = {
  "reference angle": [
    "terminal side",
    "nearer end of the horizontal axis",
    "0^{\\circ}",
    "90^{\\circ}",
  ],
  quadrant: ["four quadrants", "i through iv"],
};

/** TRG.3's bolded terms that TRG.8's prose goes on to use. */
const BORROWED_TERMS: readonly string[] = boldTerms(TRG3).filter((term) =>
  prose(TRG8).includes(term),
);

describe("TRG.8 recalls what it borrows from TRG.3", () => {
  it("has no path to TRG.3, which is why the recall is owed", () => {
    // The positive case first: it proves the walk walks, so the negative one below cannot
    // pass by coming back empty.
    const trg7 = hardAncestors("TRG.7");
    expect(trg7.size, "the prereq walk returned almost nothing").toBeGreaterThanOrEqual(2);
    expect(
      [...trg7].includes("TRG.3"),
      "TRG.3 is no longer an ancestor of TRG.7, so the walk is not measuring what it did",
    ).toBe(true);

    expect(
      [...hardAncestors("TRG.8")],
      "TRG.3 is now an ancestor of TRG.8, so a learner can no longer reach TRG.8 without " +
        "being taught the reference angle and the quadrants. The recall this file requires " +
        "below is no longer forced by the graph: keep it or drop it deliberately",
    ).not.toContain("TRG.3");
    expect(
      getNode("TRG.8")?.prereqs ?? ["TRG.8 is not in the graph at all"],
      "TRG.8 has grown its own prereqs. It is an item_family node, so its per-family " +
        "requirements live in `_item_family_prereqs` and its own list is empty by that " +
        "convention; a list here is a deliberate change and the recall above hangs on it",
    ).toEqual([]);
  });

  it("borrows exactly the two terms this file glosses", () => {
    expect(
      boldTerms(TRG3).length,
      "TRG.3 introduces no terms in bold",
    ).toBeGreaterThanOrEqual(3);
    // Composition, not only size: a floor of two is met by any two terms, and the claim is
    // about these two. It also proves the filter discards something, since TRG.3 bolds a
    // third term TRG.8 never uses.
    expect([...BORROWED_TERMS].sort()).toEqual(["quadrant", "reference angle"]);
    expect(
      Object.keys(RECALL_OWED).sort(),
      "the recall table and the terms TRG.8 actually borrows have come apart",
    ).toEqual([...BORROWED_TERMS].sort());
  });

  it.each(Object.keys(RECALL_OWED))("recalls %s where it first uses it", (term) => {
    const owed = RECALL_OWED[term] ?? [];
    expect(owed.length, "this term is listed with nothing required of it").toBeGreaterThan(
      0,
    );
    const slide = TRG8.mini_lesson.find((text) => text.toLowerCase().includes(term));
    expect(slide, `TRG.8 no longer uses "${term}" at all`).toBeDefined();
    expect(
      owed.filter((needle) => !(slide ?? "").toLowerCase().includes(needle.toLowerCase())),
      `TRG.8's first use of "${term}" no longer carries the recall it owes. TRG.3 defines ` +
        "this term and is not an ancestor of TRG.8, so a learner can arrive here never " +
        "having met it and the whole of slide 1's ordering advice is unreadable to them",
    ).toEqual([]);
  });

  it("does not introduce either term a second time", () => {
    const reintroduced = boldTerms(TRG8).filter((term) => BORROWED_TERMS.includes(term));
    expect(
      reintroduced,
      "TRG.8 bolds a term TRG.3 already introduces, so the domain now defines it twice and " +
        "the second slide teaches something the learner has a definition for. A recall is " +
        "plain prose",
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------- *
 * TRG.7 names the notation it grades on.
 * ------------------------------------------------------------------------------------- */

/** Every learner-visible string TRG.7 is GRADED on: its served items and its own check. */
const TRG7_GRADED: readonly string[] = [
  ...D9_PRACTICE_ITEMS.filter((item) => item.template_id.startsWith("d9.trg7.")).flatMap(
    (item) => [item.prompt, ...item.hints, ...item.worked_solution],
  ),
  ...(TRG7.cfu === undefined
    ? []
    : [TRG7.cfu.prompt, TRG7.cfu.hint, ...(TRG7.cfu.worked_solution ?? [])]),
];

/** The inverse-function notations those surfaces actually spell. */
const NOTATIONS_GRADED: readonly string[] = [
  ...new Set(
    TRG7_GRADED.flatMap((text) =>
      Array.from(text.matchAll(/\\arc(?:sin|cos|tan)/g), (match) => match[0]),
    ),
  ),
].sort();

/** The slide where a notation FIRST reaches the learner, or -1. */
function firstMention(pack: LessonContent, notation: string): number {
  return pack.mini_lesson.findIndex((slide) => slide.includes(notation));
}

/**
 * What has to have been said for a symbol to have been NAMED rather than merely used, and
 * every phrase is required inside the slide the learner first meets the symbol on, at a
 * position before the symbol itself.
 *
 * Held to {@link NOTATIONS_GRADED} in both directions below, so a newly graded notation
 * cannot arrive with nothing required of it and a notation that stops being graded cannot sit
 * here demanding a sentence for nothing.
 */
const NAMED_BY: Readonly<Record<string, readonly string[]>> = {
  "\\arcsin": ["inverse is written", "sine"],
  "\\arccos": ["inverse is written", "cosine"],
  "\\arctan": ["inverse is written", "tangent"],
};

describe("TRG.7 introduces the inverse notation it grades on", () => {
  it("is graded on three notations across a non-empty set of surfaces", () => {
    expect(
      TRG7_GRADED.length,
      "no TRG.7 graded surface resolved, so the rule below has nothing to read",
    ).toBeGreaterThanOrEqual(10);
    expect(NOTATIONS_GRADED).toEqual(["\\arccos", "\\arcsin", "\\arctan"]);
  });

  it("requires a naming phrase of every notation it grades, and of none it does not", () => {
    expect(
      Object.keys(NAMED_BY).sort(),
      "the naming table and the notations TRG.7 is actually graded on have come apart. A " +
        "notation graded with no entry here is graded with nothing required of it, and an " +
        "entry for a notation nothing grades is a sentence demanded for no learner",
    ).toEqual([...NOTATIONS_GRADED]);
    expect(
      Object.entries(NAMED_BY).filter(([, phrases]) => phrases.length === 0),
      "a notation is listed here with nothing required of it, which passes for free",
    ).toEqual([]);
  });

  it.each(NOTATIONS_GRADED)("names %s in its own slides", (notation) => {
    expect(
      TRG7.mini_lesson.join("\n"),
      `TRG.7 grades on ${notation} without ever naming it. A learner meets the symbol first ` +
        "in a prompt or a hint, where nothing can tell them it is the inverse of the " +
        "function they know, so the question is unreadable before it is hard",
    ).toContain(notation);
  });

  it.each(NOTATIONS_GRADED)("says what %s is before first using it", (notation) => {
    // Containment above is not enough on its own: TRG.7 uses `\arcsin` bare inside
    // $\sin(\arcsin r)$ on slide 2, so the symbol occurs whether or not anything has named
    // it. What is asked here is the property the rule is actually about -- the first time a
    // learner meets this symbol, something in front of it has told them what it is.
    const slideIndex = firstMention(TRG7, notation);
    expect(
      slideIndex,
      `TRG.7 grades on ${notation} and no slide of it contains the symbol at all, so the ` +
        "first place a learner meets it is a prompt or a hint",
    ).toBeGreaterThanOrEqual(0);

    const slide = (TRG7.mini_lesson[slideIndex] ?? "").toLowerCase();
    const usedAt = slide.indexOf(notation.toLowerCase());
    const missing = (NAMED_BY[notation] ?? []).filter((phrase) => {
      const saidAt = slide.indexOf(phrase.toLowerCase());
      return saidAt < 0 || saidAt > usedAt;
    });
    expect(
      missing,
      `TRG.7 slide ${slideIndex} is where a learner first meets ${notation}, and it does ` +
        "not name the symbol ahead of using it. Either the naming sentence has been cut, or " +
        "it now sits below the first use, or an earlier slide has started using the symbol " +
        "in passing. All three leave the learner reading a symbol nothing has introduced",
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------- *
 * TRG.5's summary agrees with its own slide 2 and with what it serves.
 * ------------------------------------------------------------------------------------- */

/** The precondition slide 2 states and the served L3 hint repeats, in the hint's wording. */
const FACTORED_FORM = "bracket holding $x$ and one constant";

const TRG5_SUMMARY = TRG5.mini_lesson[TRG5.mini_lesson.length - 1] ?? "";

const PHASE_SHIFT_SERVED = D9_PRACTICE_ITEMS.filter(
  (item) => item.template_id === "d9.trg5.phase-shift.l3",
);

const FEATURES_SERVED = D9_PRACTICE_ITEMS.filter(
  (item) => item.template_id === "d9.trg5.features.l3",
);

/** The three readings `features.l3` draws between, in its own words. */
const READINGS_SERVED = [
  "the highest value the trace reaches",
  "the lowest value the trace reaches",
  "the distance from its lowest value up to its highest",
] as const;

/**
 * How the summary has to say each graded reading is WORKED OUT, keyed by the reading.
 *
 * The nouns a reading uses are the wrong needle, because they survive the teaching: with the
 * clause that computes the first two cut, "the distance from the lowest up to the highest is
 * twice the amplitude" alone still spells "highest", "lowest" and "twice the amplitude", and
 * the rule this replaced passed 13/13 over exactly that. What cannot survive the cut is the
 * arithmetic, so the arithmetic is what is required. A reword is a deliberate change here and
 * the needle moves with it rather than being loosened until anything satisfies it.
 *
 * Held to {@link READINGS_SERVED} in both directions below.
 */
const TAUGHT_BY: Readonly<Record<string, readonly string[]>> = {
  "the highest value the trace reaches": ["midline plus its amplitude"],
  "the lowest value the trace reaches": ["midline minus"],
  "the distance from its lowest value up to its highest": ["twice the amplitude"],
};

describe("TRG.5's summary agrees with the slide above it and the items below it", () => {
  it("reads a summary slide and two served L3 shapes", () => {
    expect(TRG5.mini_lesson.length, "TRG.5 lost its slides").toBeGreaterThanOrEqual(4);
    expect(TRG5_SUMMARY.length, "the summary slide is empty").toBeGreaterThan(200);
    expect(
      PHASE_SHIFT_SERVED.length,
      "d9.trg5.phase-shift.l3 serves nothing, so the agreement claim below is untethered",
    ).toBeGreaterThan(0);
    expect(
      FEATURES_SERVED.length,
      "d9.trg5.features.l3 serves nothing, so the readings claim below is untethered",
    ).toBeGreaterThan(0);
  });

  it("makes the factoring a precondition of reading the shift, as slide 2 does", () => {
    // Both ends of the agreement, so this cannot drift into a claim about one surface: the
    // slide states the precondition, the served hint states it in the wording used here, and
    // the summary has to carry it too.
    expect(
      TRG5.mini_lesson[2] ?? "",
      "TRG.5 slide 2 no longer says a multiplied-out inside has to be factored first, so " +
        "the summary's agreement with it is no longer the thing this rule checks",
    ).toContain("has to be factored");
    expect(
      PHASE_SHIFT_SERVED.flatMap((item) => item.hints).filter((hint) =>
        hint.includes(FACTORED_FORM),
      ).length,
      "the served phase-shift hint no longer uses this wording, so the summary and the item " +
        "need reconciling again rather than this string updating",
    ).toBeGreaterThan(0);
    expect(
      TRG5_SUMMARY,
      "TRG.5's summary presents the phase shift as a number sitting in the rule to be " +
        "copied. A third of d9.trg5.phase-shift.l3's draws multiply the inside out, so a " +
        "learner who trusts the summary answers $bc$ where the key is $c$ and is marked " +
        "wrong by this node's own L3 item",
    ).toContain(FACTORED_FORM);
  });

  it("covers every reading features.l3 asks for", () => {
    expect(
      FEATURES_SERVED.filter((item) =>
        READINGS_SERVED.some((reading) => item.prompt.includes(reading)),
      ).length,
      "the served features.l3 item asks for none of the three readings this rule knows " +
        "about, so the template has been reshaped and the summary needs re-reading against it",
    ).toBe(FEATURES_SERVED.length);
    expect(
      Object.keys(TAUGHT_BY).sort(),
      "the teaching table and the readings features.l3 asks for have come apart. A reading " +
        "the item grades with no entry here is a reading the summary owes nothing for, and " +
        "an entry for a reading nothing asks is prose demanded for no learner",
    ).toEqual([...READINGS_SERVED].sort());
    expect(
      READINGS_SERVED.filter(
        (reading) => !FEATURES_SERVED.some((item) => item.prompt.includes(reading)),
      ),
      "this rule lists a reading no draw of features.l3 was observed to ask for, so the " +
        "summary is being held to teaching for a question nobody is served",
    ).toEqual([]);
    expect(
      Object.entries(TAUGHT_BY).flatMap(([reading, phrases]) =>
        phrases
          .filter((needle) => !TRG5_SUMMARY.includes(needle))
          .map((needle) => `${reading}: "${needle}"`),
      ),
      "TRG.5's summary no longer says how a reading its L3 item grades is worked out. The " +
        "slide that exists to put the four features together can still name the reading and " +
        "leave a learner no way to compute it, which is what the item marks them on",
    ).toEqual([]);
  });
});
