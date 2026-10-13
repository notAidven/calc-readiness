/**
 * A CFU without a `check` is graded by exact string match, so every spelling of a correct
 * answer that the author did not anticipate is a correct answer marked wrong.
 *
 * The report (`docs/qa-cfu-swarm-d5-d7.md`): ten blinded solvers produced 100 alternate
 * spellings of the ten D5/D7 answers they had each derived independently, and 34 were
 * rejected. Nothing was leaking in the other direction - all 50 misconception answers were
 * correctly rejected, and all ten authored keys were mathematically right - so the whole
 * defect is that the lists are short, and short in a different place in each pack. That
 * round's own objection to simply lengthening them was that "it does not stop the next CFU
 * from re-introducing the same gap, because nothing enforces the convention". This is the
 * enforcement.
 *
 * The convention is stated as a CLOSURE over each pack's own list rather than as a table of
 * expected strings, which is what lets the population be derived instead of typed: whatever
 * a pack accepts, it must also accept under three rewrites that change the notation and not
 * the mathematics. A pack cannot satisfy this by being short, because every entry it does
 * carry drags its own variants in.
 *
 * Scope of the population, and why it is derived: `allLessons` is assembled in `domains.ts`
 * from the five per-domain registries, so a new domain joins this sweep with no edit here.
 * The filter is the same predicate `cfu.tsx` dispatches on, so the population is exactly the
 * set of CFUs the rewrites can affect - a pack carrying a `check` grades through the real
 * checker, which computes equivalence, and its `accepted` list is not consulted at all.
 *
 * ONE rewrite from that round is deliberately NOT enforced here: the trailing `.0` decimal
 * (its items 9). Uniform closure over it would demand entries no learner would ever type,
 * because the numbers inside a multi-part answer include exclusion-list members, and
 * `x = -4.0, 1` is not a spelling anyone produces. The packs still carry the `.0` form
 * wherever the answer is a bare value, but that is an authoring judgement per pack rather
 * than a property a machine can state, so it is left to the reading pass rather than
 * asserted vacuously here.
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { normalizeAcceptedAnswer } from "./answerFormat";
import { type CfuOutcome, LessonCfu } from "./cfu";
import { allLessons } from "./domains";
import type { LessonContent } from "./types";

/**
 * The exact predicate `cfu.tsx` dispatches on: with a `check` the shared checker computes
 * equivalence and `accepted` is never read, so only the check-less packs are graded on the
 * strings this file is about.
 */
const CHECKLESS: readonly LessonContent[] = allLessons.filter(
  (lesson) => lesson.cfu !== undefined && lesson.cfu.check === undefined,
);

/**
 * D8's check-less packs are DECLARED OUT, not quietly filtered out, and the distinction
 * matters: an exemption left implicit reads as a population that never had them. D8's widgets
 * were still being authored when this landed and the round that widened D1, D5 and D7 was
 * explicitly scoped to exclude it, so its lists are the next round's work and would otherwise
 * hold this red open over a decision nobody had made yet.
 *
 * Measured at 924fcbd: THREE packs are exempt, being EL.2, EL.4 and EL.5. EL.1 and EL.3 carry
 * a `check` and so were never in this population to begin with - the exemption is narrower
 * than "D8". EL.6 landed 2026-07-30 with a `check` too, so it joined EL.1 and EL.3 outside the
 * exemption rather than inheriting it, and the count above did not move.
 *
 * Bounded above rather than floored, the opposite direction to the population below: this set
 * may only ever SHRINK, so D8 joining the convention needs no edit here, while a further pack
 * quietly inheriting the exemption fails.
 */
const EXEMPT_NODE_PREFIXES = ["EL."] as const;
const EXPECTED_EXEMPT_PACKS = 3;

const isExempt = (lesson: LessonContent): boolean =>
  EXEMPT_NODE_PREFIXES.some((prefix) => lesson.node_id.startsWith(prefix));

const ACCEPTED_ONLY: readonly LessonContent[] = CHECKLESS.filter(
  (lesson) => !isExempt(lesson),
);

/**
 * A floor, not a pin. Growth needs no edit here; a pack silently dropping out of the
 * population - by the registry drifting off the shape this reads - fails loudly instead of
 * quietly shrinking what the sweep covers.
 *
 * Measured at 2b00ec3: SEVENTEEN, being all six D5 packs, all four D7 packs, all five D2 packs
 * (EXP.1 and RAD.1 to RAD.4), and D1's NUM.3 and NUM.4. Only D1's other four carry a `check`.
 *
 * D2 belongs here even though the round that wrote this file was scoped to leave D2's content
 * alone: this is a guard rather than an edit, D2 satisfies it as authored, and a convention
 * about notation has no reason to stop at a domain boundary. It is named because a population
 * wider than the round that produced it should be stated rather than discovered.
 *
 * ## What the floor could not see, and what does
 *
 * Re-measured after the CFU migration: TWENTY-SIX, being D1's NUM.3 and NUM.4; D2's EXP.1,
 * RAD.1 and RAD.2; D4's POL.1, POL.2, POL.6 and POL.8; all six D5 packs; D6's CG.1, FUN.1,
 * FUN.3, FUN.4, FUN.5, FUN.8 and FUN.10; and all four D7 packs. It reached 36 as D3, D4 and
 * D6 registered, and ten packs then left it by gaining a `check`. POL.6 left afterwards, as
 * the eleventh, so the figure above is twenty-five at this tip.
 *
 * The floor sat at 17 throughout and never noticed, which is the thing to read off it: a floor
 * constrains size, and ten departures out of 36 clear one written for a population half that
 * size. Leaving is also CORRECT here — the predicate is scoped to the behaviour, and a pack
 * graded by equivalence genuinely no longer owes a closure over the strings an exact-match
 * grader compares. What was owed is that the coverage went somewhere, and that is
 * {@link MIGRATED_TO_A_CHECK} below rather than this number.
 */
const MIN_ACCEPTED_ONLY_PACKS = 17;

/**
 * The packs that left this population by gaining a `check`, and where their coverage went.
 *
 * A departure and a deletion look identical from inside a floor, so they are named. Asserted
 * in both directions by the test at the foot of this file: an entry that has stopped
 * qualifying fails, so a pack that lost its check and rejoined the string-graded population
 * cannot sit here being excused by a list; and an entry whose pack no longer exists fails, so
 * the list cannot go on describing a tree that has moved.
 *
 * The direction this file cannot carry — a pack that gains a check WITHOUT being named here —
 * is carried by `cfuCheckAcceptance.test.ts`, which derives its population from the registry
 * rather than from a list, so an unnamed departure joins that sweep and owes it every spelling
 * in its accepted list. That is the pairing: this file asks the exact-match packs for a
 * closure, that one asks the checked packs to keep the promises their lists already made, and
 * between them no pack is graded by something nobody is asking about.
 */
const MIGRATED_TO_A_CHECK: Readonly<Record<string, string>> = {
  "RAD.3": "numeric",
  "RAD.4": "expression",
  "LIN.4": "interval",
  "LIN.5": "solution_set",
  "LIN.6": "interval",
  "FUN.2": "interval",
  "POL.3": "solution_set",
  "POL.4": "solution_set",
  "POL.5": "numeric",
  // Later than the other ten, and for the opposite reason. POL.6 was not held back by a
  // missing answer type: it was named in `cfuAuthoredAskParity.test.ts` as a pack whose FORM
  // is the skill, on a reason that turned out not to describe it. A leading term is not equal
  // to the polynomial it leads, so the unexpanded function that entry feared cannot pass a
  // grader comparing values, while the two strings its list held refused `(-10)x^4` — the
  // bracketed negative the pack's own worked solution writes.
  "POL.6": "expression",
  "POL.7": "numeric",
};

const OPENERS = "([{";
const CLOSERS = ")]}";
const AND = " and ";

/** The three interchangeable ways a learner joins the parts of one answer. */
const SEPARATORS = [", ", "; ", AND] as const;

type Span = { readonly start: number; readonly end: number };

/**
 * The separators that join the answer's PARTS, which is only the ones at bracket depth zero.
 * The comma inside RAT.5's `(4, 5)` sits inside a coordinate pair and inside LF.1's
 * `\dfrac{-1}{2}` there are braces, and rewriting either would change the mathematics rather
 * than the notation.
 */
function topLevelSeparators(text: string): Span[] {
  const found: Span[] = [];
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] as string;
    if (OPENERS.includes(char)) {
      depth += 1;
    } else if (CLOSERS.includes(char)) {
      depth -= 1;
    } else if (depth === 0 && (char === "," || char === ";")) {
      found.push({ start: index, end: index + 1 });
    } else if (depth === 0 && text.startsWith(AND, index)) {
      found.push({ start: index, end: index + AND.length });
      index += AND.length - 1;
    }
  }
  return found;
}

/**
 * The same answer with every part-joining separator rewritten to one form. Runs of spaces are
 * collapsed afterwards: the grader strips whitespace so they cannot change a verdict, but this
 * string is quoted back to the author as the entry to add, and `, ,` with a double space is
 * not something anyone should be asked to paste into a pack.
 */
function withSeparator(text: string, separator: string): string {
  const spans = topLevelSeparators(text);
  if (spans.length === 0) {
    return text;
  }
  let out = "";
  let cursor = 0;
  for (const span of spans) {
    out += text.slice(cursor, span.start) + separator;
    cursor = span.end;
  }
  return (out + text.slice(cursor)).replace(/ {2,}/g, " ").trim();
}

/**
 * The two notation rewrites that are pure lexical substitution: the display-fraction command
 * (`\frac` is the commoner of the two, and LF.1 carried only `\dfrac`) and the two ways of
 * writing "not equal".
 */
function notationVariants(text: string): string[] {
  const out = new Set<string>([text]);
  const plainFrac = text.replaceAll("\\dfrac", "\\frac");
  if (plainFrac.includes("\\frac")) {
    out.add(plainFrac);
    out.add(plainFrac.replaceAll("\\frac", "\\dfrac"));
  }
  const bangEq = text.replaceAll("\u2260", "!=");
  if (bangEq.includes("!=")) {
    out.add(bangEq);
    out.add(bangEq.replaceAll("!=", "\u2260"));
  }
  return [...out];
}

/** Every spelling the convention says a pack accepting `text` must also accept. */
function closureOf(text: string): string[] {
  const out = new Set<string>();
  for (const notation of notationVariants(text)) {
    for (const separator of SEPARATORS) {
      out.add(withSeparator(notation, separator));
    }
    out.add(notation);
  }
  return [...out];
}

/**
 * Grade one answer the way a learner is graded: mount the real card, type into the real
 * field, submit the real form. Asserting against `accepted` directly would re-implement the
 * one line under test (`cfu.tsx:217`) and would pass on a card that never called it.
 *
 * The verdict is cross-checked against the visible feedback, so a case cannot pass on a
 * callback the learner's screen disagrees with.
 */
function gradesAsCorrect(lesson: LessonContent, answer: string): boolean {
  const cfu = lesson.cfu;
  if (!cfu) {
    throw new Error(`${lesson.node_id} has no CFU`);
  }
  const results: CfuOutcome[] = [];
  const { container, unmount } = render(
    <LessonCfu
      cfu={cfu}
      nodeId={lesson.node_id}
      onResult={(outcome) => results.push(outcome)}
    />,
  );
  try {
    const field = container.querySelector('input[type="text"]');
    if (!(field instanceof HTMLInputElement)) {
      throw new Error(`${lesson.node_id}: the card rendered no answer field`);
    }
    const form = container.querySelector("form");
    if (!(form instanceof HTMLFormElement)) {
      throw new Error(`${lesson.node_id}: the card rendered no form to submit`);
    }
    fireEvent.change(field, { target: { value: answer } });
    fireEvent.submit(form);

    if (results.length !== 1) {
      throw new Error(
        `${lesson.node_id}: submitting reported ${results.length} verdicts, expected 1`,
      );
    }
    const outcome = results[0] as CfuOutcome;
    // `recalled` is a correct answer the reveal had already printed. This harness never takes
    // a reveal, so reaching it would mean the card thinks an answer was on screen when it was
    // not, and that is a defect rather than a pass to wave through.
    if (outcome === "recalled") {
      throw new Error(
        `${lesson.node_id}: the card called ${answer} recalled, but no reveal was taken`,
      );
    }
    const verdict = outcome === "correct";
    const said = (container.textContent ?? "").includes("Correct! Nice work.");
    if (said !== verdict) {
      throw new Error(
        `${lesson.node_id}: the card reported ${outcome} and showed ${said} for ${answer}`,
      );
    }
    return verdict;
  } finally {
    unmount();
  }
}

/**
 * The whole case table, built before any test runs so its size is a measurement rather than
 * a side effect. Each row is one (pack, spelling) pair the convention requires.
 */
type Case = {
  node: string;
  lesson: LessonContent;
  source: string;
  variant: string;
};

/**
 * The asserted bar is the swarm's own recommendation - "extend the ten lists so the six
 * columns above are uniformly yes" - measured against each pack's CANONICAL answer, which is
 * `accepted[0]` and the string the reveal shows. A pack passes when the one answer it holds
 * out as the answer is takeable in every notation that answer can be written in.
 *
 * The stronger bar is closure over EVERY accepted entry, and it is deliberately not asserted,
 * because it wants hundreds of further spellings across these packs and most are cross-products
 * no learner types: the joiner between an expression and its exclusion list is not varied
 * independently of the joiner inside the list. `FULL_CLOSURE_GAP` below measures the size of
 * that gap and the census test PRINTS it, rather than this comment quoting a figure that would
 * expire the next time a list is widened. It is kept because it is the evidence for the
 * structural argument: an enumerated list cannot be completed, so every bar over one is a cut
 * somebody chose. The swarm's structural recommendation - give these CFUs a `cfu.check` so
 * equivalence is computed instead of enumerated - reaches the shared checker in
 * `packages/shared-components`, which is a different lane.
 */
const CASES: Case[] = [];
for (const lesson of ACCEPTED_ONLY) {
  const accepted = lesson.cfu?.accepted ?? [];
  const canonical = accepted[0];
  if (canonical === undefined) {
    continue;
  }
  /**
   * Deduped only against ITSELF, on the normalized form the grader compares on, so two
   * generated variants that differ merely in punctuation spacing are one case.
   *
   * Deliberately NOT deduped against the accepted list, which was this file's own first bug:
   * a table holding only the spellings a pack currently rejects empties itself the moment the
   * pack is widened, and an empty `it.each` emits no tests at all while the file reports a
   * pass. The table has to stay the same size after the fix as before it, so that what turns
   * green is the assertions and not the population.
   */
  const seen = new Set<string>();
  for (const variant of closureOf(canonical)) {
    const key = normalizeAcceptedAnswer(variant);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    CASES.push({ node: lesson.node_id, lesson, source: canonical, variant });
  }
}

/**
 * The other direction, without which this file could only ever fail one way.
 *
 * A sweep that asserts acceptance and nothing else is satisfied by a list that accepts
 * everything, so widening one to silence it would be indistinguishable from fixing it. The
 * reject case is derived the same way the accept cases are, by rewriting the pack's own
 * canonical answer - but into a DIFFERENT answer rather than a different notation, by
 * incrementing the first integer it contains. `3x+12` becomes `4x+12`, `(x + 8)/(x + 5),
 * x = 8, x = -5` becomes `(x + 9)/(x + 5), x = 8, x = -5`, and neither is the answer to the
 * question that was asked.
 *
 * The one thing this must NOT do is skip a pack that accepts its own mutation. An earlier
 * version did, reasoning that such a pack was right to take it, and that reasoning inverted the
 * guard: adding `"4"` to RAT.6's list - the mutation of its canonical `3`, and flatly a wrong
 * answer - made the case disappear instead of fail, and the file went green with one test
 * FEWER than before. An assertion the defect deletes is worse than no assertion, because the
 * count moves in the quiet direction and the suite still reports a pass. Incrementing an
 * integer always changes the value, so an accepted mutation is always a leak and is always
 * asserted. Only a canonical with no integer at all yields no case.
 */
function mutatedCanonical(text: string): string | null {
  const match = /\d+/.exec(text);
  if (!match) {
    return null;
  }
  const bumped = String(Number(match[0]) + 1);
  return text.slice(0, match.index) + bumped + text.slice(match.index + match[0].length);
}

const REJECT_CASES: {
  node: string;
  lesson: LessonContent;
  canonical: string;
  wrong: string;
}[] = [];
for (const lesson of ACCEPTED_ONLY) {
  const accepted = lesson.cfu?.accepted ?? [];
  const canonical = accepted[0];
  if (canonical === undefined) {
    continue;
  }
  const wrong = mutatedCanonical(canonical);
  if (wrong === null) {
    continue;
  }
  REJECT_CASES.push({ node: lesson.node_id, lesson, canonical, wrong });
}

/**
 * Measured at 2b00ec3: all seventeen packs yield a mutation. A floor, not a pin, and the
 * population it was measured over has since grown to 27 and lost ten to `check` blocks — see
 * {@link MIN_ACCEPTED_ONLY_PACKS}. The census test PRINTS the current figure rather than this
 * comment quoting one that expires with the next pack.
 */
const MIN_REJECT_CASES = 15;

/** Reported, not asserted. See the note on CASES. */
const FULL_CLOSURE_GAP = ACCEPTED_ONLY.reduce((total, lesson) => {
  const accepted = lesson.cfu?.accepted ?? [];
  const seen = new Set(accepted.map(normalizeAcceptedAnswer));
  let missing = 0;
  for (const source of accepted) {
    for (const variant of closureOf(source)) {
      const key = normalizeAcceptedAnswer(variant);
      if (!seen.has(key)) {
        seen.add(key);
        missing += 1;
      }
    }
  }
  return total + missing;
}, 0);

/**
 * Measured at 2b00ec3: 34, of which seventeen are each pack's canonical answer itself and
 * seventeen are rewrites of one. The identity cases are not filler - "every authored answer key
 * grades correct through the real card" is a check whose failure is a P0 - but they are the
 * weaker half, and a pack whose answer carries no separator and no fraction (D2's three, and
 * D1's two) contributes only its identity. What covers the form axes on those is the per-pack
 * reading pass rather than this file. The current figure is PRINTED by the census test and
 * named in its own title, which is where to read it: quoting it here would expire the next
 * time a pack is authored or migrated, and it has done both since.
 *
 * A floor for the same reason the pack count is one: the sweep must not be able to quietly stop
 * having an opinion. With an empty table `it.each` emits no tests at all and the file reports a
 * pass, which is the quietest possible green.
 */
const MIN_CASES = 30;

describe("the accepted-only CFUs are closed under the notation the swarm measured", () => {
  it(`sweeps ${ACCEPTED_ONLY.length} check-less packs and ${CASES.length} spellings`, () => {
    expect(
      ACCEPTED_ONLY.length,
      "the check-less CFU population shrank; a pack left the sweep",
    ).toBeGreaterThanOrEqual(MIN_ACCEPTED_ONLY_PACKS);
    expect(CASES.length, "the closure table shrank").toBeGreaterThanOrEqual(MIN_CASES);
    expect(
      REJECT_CASES.length,
      "the reject table shrank, so this file can only fail in one direction again",
    ).toBeGreaterThanOrEqual(MIN_REJECT_CASES);
    // Per-pack, because a total is satisfied by one pack carrying it: a pack whose canonical
    // answer went missing would contribute nothing and hide inside a healthy sum.
    for (const lesson of ACCEPTED_ONLY) {
      expect(
        CASES.filter((c) => c.node === lesson.node_id).length,
        `${lesson.node_id} contributed no spelling to the sweep`,
      ).toBeGreaterThan(0);
    }
    // The exemption may only shrink. If D8 joins the convention this drops and the pin fails,
    // which is the edit prompting someone to delete the exemption rather than widen it.
    expect(
      CHECKLESS.filter(isExempt).length,
      "the declared exemption grew; a new pack must not inherit it silently",
    ).toBeLessThanOrEqual(EXPECTED_EXEMPT_PACKS);
    // Printed so a reader of the run knows what was measured, not merely that it passed.
    const perPack = ACCEPTED_ONLY.map(
      (l) => `${l.node_id}:${CASES.filter((c) => c.node === l.node_id).length}`,
    ).join(" ");
    console.log(
      `[cfu-acceptance] ${ACCEPTED_ONLY.length} packs, ${CASES.length} canonical spellings ` +
        `(${perPack}); ${CHECKLESS.filter(isExempt).length} pack(s) declared exempt; ` +
        `full-closure gap over every entry: ${FULL_CLOSURE_GAP} spellings (reported, not asserted)`,
    );
  });

  it("names every pack that left this population, and names nothing else", () => {
    const byId = new Map(allLessons.map((lesson) => [lesson.node_id, lesson]));
    const inThePopulation = new Set(ACCEPTED_ONLY.map((lesson) => lesson.node_id));
    for (const [node, answerType] of Object.entries(MIGRATED_TO_A_CHECK)) {
      const lesson = byId.get(node);
      // Direction one: the entry still describes something. A deleted or renamed pack fails
      // here rather than sitting in the list forever excusing nothing.
      expect(
        lesson?.cfu,
        `${node} is named as having left this sweep for a check and no longer has a CFU at all`,
      ).toBeDefined();
      // Direction two: it has not quietly come back. A pack that loses its check is graded on
      // its strings again and owes this file's closure again, so it must fail here rather
      // than be excused by an entry nobody re-read.
      expect(
        inThePopulation.has(node),
        `${node} no longer carries a check, so it is graded on its accepted list again and owes this sweep: delete its entry`,
      ).toBe(false);
      expect(
        lesson?.cfu?.check?.answer_type,
        `${node} left this sweep as ${answerType} and now declares something else`,
      ).toBe(answerType);
    }
    // A floor under the list itself, so it cannot dwindle to one entry that happens to hold.
    expect(
      Object.keys(MIGRATED_TO_A_CHECK).length,
      "the departure record has shrunk below the migration it was written for",
    ).toBeGreaterThanOrEqual(10);
    // And the composition: at least one departure per answer type the swap opened, because a
    // record of ten numeric checks would say nothing about the types that could not be graded
    // at all before this route existed.
    for (const opened of ["interval", "solution_set"]) {
      expect(
        Object.values(MIGRATED_TO_A_CHECK).filter((type) => type === opened).length,
        `no pack left this sweep as ${opened}, so the record describes a migration that did not happen`,
      ).toBeGreaterThan(0);
    }
  });

  it.each(CASES)(
    "$node accepts $variant",
    ({
      lesson,
      source,
      variant,
    }: {
      lesson: LessonContent;
      source: string;
      variant: string;
    }) => {
      expect(
        gradesAsCorrect(lesson, variant),
        `${lesson.node_id} accepts "${source}" but rejects "${variant}", which is the same answer in different notation`,
      ).toBe(true);
    },
  );

  it.each(REJECT_CASES)(
    "$node still refuses $wrong",
    ({
      lesson,
      canonical,
      wrong,
    }: {
      lesson: LessonContent;
      canonical: string;
      wrong: string;
    }) => {
      expect(
        gradesAsCorrect(lesson, wrong),
        `${lesson.node_id} accepts "${wrong}", which is not its answer "${canonical}" in different notation but a different answer`,
      ).toBe(false);
    },
  );
});
