/**
 * EL.4's check is graded by exact string match, and its first ask used to accept a hand-written
 * SAMPLE of what its own re-ask accepts.
 *
 * `cfu.tsx` takes one of two grading paths (`cfu.tsx`, `if (cfu.check && asked.authored)`): a
 * pack carrying a `check` grades through the shared checker, and a pack without one is compared
 * against `accepted` after `normalizeAcceptedAnswer`. EL.4 cannot take the first path, and the
 * first `describe` below MEASURES that rather than asserting it in this comment, because a
 * sentence here would be the reviewer's word for it and would go stale the day the checker
 * gained an inequality. That block is also the trigger to come back: it fails if the route ever
 * opens, and its message says to replace this whole enumerated list with a `check` block.
 *
 * What is left is the property this file asserts: the two instances of one question must accept
 * the SAME spellings. The authored question is the template at `bound = 9` and the re-ask is the
 * same template at another bound, both spelled by `SPELLERS["cfu.el4.domain-asymptote"]`, so
 * anything the re-ask takes is an answer the first ask has no grounds to refuse. At `1b3f985f`
 * the authored list held 16 of the 448 forms the speller then produced, so the first attempt
 * refused 432 spellings the second attempt accepted, including `x < 9; asymptote x = 9` and
 * `9 > x; 9`. The speller has since gained `vertical asymptote: x = 9` and then the two
 * set-builder spellings of the domain, taking it to 768, and the pack carries all 768.
 *
 * ## The population is DERIVED from the speller, not typed out here
 *
 * The speller is not exported, so the second instance's own accepted list is read back through
 * `cfuInstances` and rebased onto the authored bound. That is sound because `bound` is the only
 * number the speller interpolates: every occurrence of the drawn bound in a spelling IS the
 * boundary, so substituting it yields exactly the set the speller would produce at 9. Typing
 * the expected list here instead would be the trap `lesson-qa` names, a sweep counting its own
 * list rather than the tree, and it would go green the day the speller widened.
 *
 * A floor sits under the comparison because a set equality between two empty sets holds.
 *
 * The last block is round two's: the set-builder half of that finding, which round one filed
 * as unfixable in this pack and left as a declared exception, and what closing it required of
 * `answerFormat.ts`.
 */

import { createProductAnswerChecker } from "@cr/components";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  cfuNotation,
  isAbsoluteValueAnswerText,
  normalizeAcceptedAnswer,
} from "./answerFormat";
import { type CfuOutcome, LessonCfu } from "./cfu";
import {
  CFU_ANSWER_TYPES,
  CFU_CHECKER_VERSION,
  cfuItemVersion,
  EQUIVALENCE_FOR,
} from "./cfuChecker";
import { cfuInstances } from "./cfuVariants";
import { allLessons } from "./domains";
import type { LessonCfuCheck, LessonContent } from "./types";

const EL4 = allLessons.find((lesson) => lesson.node_id === "EL.4");
if (!EL4?.cfu) {
  throw new Error("EL.4 is not registered, so this file would sweep nothing");
}
const CFU = EL4.cfu;

/** The boundary the authored question is written on. */
const AUTHORED_BOUND = 9;

/**
 * Grade one answer the way the learner is graded: the real card, the real field, the real
 * submit. Reading `cfu.accepted` directly would re-implement the line under test and would pass
 * against a card that never consulted it.
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
    if (outcome === "recalled") {
      throw new Error(
        `${lesson.node_id}: the card called "${answer}" recalled, but no reveal was taken`,
      );
    }
    const verdict = outcome === "correct";
    const said = (container.textContent ?? "").includes("Correct! Nice work.");
    if (said !== verdict) {
      throw new Error(
        `${lesson.node_id}: the card reported ${outcome} and showed ${said} for "${answer}"`,
      );
    }
    return verdict;
  } finally {
    unmount();
  }
}

/** The re-ask's own spellings, rebased from its drawn bound onto the authored one. */
function reAskFormsAtAuthoredBound(): readonly string[] {
  const instances = cfuInstances(CFU);
  const reAsk = instances.find((instance) => !instance.authored);
  if (reAsk === undefined) {
    throw new Error(
      "EL.4 resolved no computed instance, so there is nothing to compare to",
    );
  }
  const drawn = /x\s*<\s*(-?\d+)/.exec(reAsk.answerKey)?.[1];
  if (drawn === undefined) {
    throw new Error(`EL.4's re-ask key does not read as a bound: ${reAsk.answerKey}`);
  }
  if (Number(drawn) === AUTHORED_BOUND) {
    throw new Error("EL.4's re-ask drew the authored bound, so rebasing proves nothing");
  }
  return reAsk.accepted.map((form) => form.replaceAll(drawn, String(AUTHORED_BOUND)));
}

const AUTHORED_FORMS = new Set(CFU.accepted.map(normalizeAcceptedAnswer));
const RE_ASK_FORMS = new Set(reAskFormsAtAuthoredBound().map(normalizeAcceptedAnswer));

/**
 * A floor under the comparison, so neither side can satisfy it by being empty. The speller
 * produces 768 forms per instance as this lands, and 448 at `1b3f985f`. The floor is
 * deliberately well under both, because it exists to catch an empty population rather than to
 * pin a count that every widening of the speller would have to come back and edit.
 */
const MIN_FORMS = 300;

/**
 * The spellings named in the round-one review that the re-ask accepted while the first ask
 * refused them. Each of these graded WRONG at `1b3f985f` and grades right now.
 */
const NAMED_SPELLINGS: readonly string[] = [
  "x < 9; asymptote x = 9",
  "x < 9, asymptote: x = 9",
  "9 > x; 9",
  "x < 9; vertical asymptote: x = 9",
];

/**
 * The half of the round-one finding that round two closed, kept here as the guard on it.
 *
 * Set-builder notation is the last term EL.4's mini-lesson defines, on the same slide that
 * introduces the flipped domain this check asks about, and two of the node's five practice
 * templates (`d8.el4.domain.l2`, `d8.el4.domain-shift.l3`) grade nothing else. The pack
 * refused the one form it taught last, and it was not fixable in the pack: putting
 * `{x | x < 9}` in `accepted` retagged the whole answer through `cfuNotation`, because
 * `isAbsoluteValueAnswerText` matched a bare `|` and the dispatch reads the list with `.some`.
 * The field then advertised `2*x*sqrt(2*x), abs(x^5), |x^5|` over a sqrt-and-bars keypad on a
 * domain-and-asymptote question.
 *
 * What closed it is the predicate learning what the bar is DOING: an absolute value brackets
 * an expression and so arrives paired or named, and the set-builder bar separates a variable
 * from a condition and so arrives alone inside braces. These three spellings graded WRONG
 * before that and grade right now.
 */
const SET_BUILDER_ACCEPTED: readonly string[] = [
  "{x | x < 9}; x = 9",
  "{x | x < 9}, x = 9",
  "x = 9; {x | x < 9}",
];

/**
 * Genuine absolute-value spellings, which the tightened predicate still has to claim. This
 * list is the other direction of the change: narrowing the predicate to let a set brace
 * through must not let RAD.4's answer through with it, whose notation problem IS the bars
 * (`answerFormat.test.ts`'s RAD.4 block grades all eleven of its spellings).
 *
 * The last entry is the case that keeps the fix honest about scope. A set-builder condition
 * may itself be about an absolute value, and then the answer wants the bars named after all —
 * so the separator is removed, not the braced group.
 */
const ABSOLUTE_VALUE_TEXT: readonly string[] = [
  "6*abs(x^3)",
  "6|x^3|",
  "|6x^3|",
  "6x^2|x|",
  "6\\left|x^3\\right|",
  "{x | |x| < 9}",
];

/**
 * Answers that are NOT the answer, so widening the list cannot be what makes this file green.
 * A sweep that only ever asserts acceptance is satisfied by a list accepting everything.
 */
const REFUSED: readonly string[] = [
  "x > 9; x = 9",
  "x < 8; x = 8",
  "{x | x > 9}; x = 9",
  "x < 9",
];

/** A deterministic spread over the re-ask's set, so the claim is not carried by its first row. */
const SAMPLE: readonly string[] = (() => {
  const forms = [...reAskFormsAtAuthoredBound()];
  const step = Math.max(1, Math.floor(forms.length / 12));
  const out: string[] = [];
  for (let index = 0; index < forms.length && out.length < 12; index += step) {
    out.push(forms[index] as string);
  }
  return out;
})();

/**
 * Why this pack is stuck on the exact-match path, measured on the real checker.
 *
 * The round-one review's intended route was a `check` block, which would have made the whole
 * list below unnecessary: `cfuChecker.ts` grades a checked pack form-independently, so any
 * spelling of one answer would pass without anybody enumerating it. The route is closed, and it
 * is closed at the checker rather than at this pack: EL.4's answer is a conjunction of an
 * INEQUALITY and an EQUATION, and no single `answer_type` describes a conjunction of two.
 *
 * So the probe is the strongest available: grade the pack's own canonical answer against ITSELF.
 * A checker that cannot agree an answer equals itself cannot grade the question at all, and
 * putting a `check` block on this pack would fail a learner who typed the string the reveal
 * printed. That is strictly worse than the enumeration, which is why the enumeration stands.
 *
 * This fails in BOTH directions, which is the point of measuring it here instead of writing it
 * down. If the shared checker gains inequality or set-builder support, `client_correct` goes
 * true, this block goes red, and its message says what to do about it. If EL.4's canonical
 * answer changes shape, the key is read off `accepted[0]` and travels with it.
 *
 * ## Why the union and the checker are both READ rather than written down
 *
 * They were written down, and the file went green through the one event it was built to catch.
 * The probe held `CHECKABLE_ANSWER_TYPES = ["numeric", "expression"]` beside a floor asserting
 * that list had two entries, and it ran on `createD1AnswerChecker` — so when CFU grading moved
 * to `createProductAnswerChecker` and `LessonCfuAnswerType` grew to six, this file measured a
 * checker the surface no longer runs over a union four values short of the real one, and
 * reported a pass. The floor could not help: it was counting the same hand-written array it
 * was defending. Both halves are now imported from `cfuChecker.ts` — {@link CFU_ANSWER_TYPES}
 * off a record TypeScript exhausts, and {@link cfuItemVersion}, the exact builder the module
 * registers its own packs with — so the probe cannot fall behind the route without the import
 * failing to compile.
 */
const CHECKABLE_ANSWER_TYPES: readonly LessonCfuCheck["answer_type"][] = CFU_ANSWER_TYPES;

/**
 * Grade `answer` against `key` through the CFU module's own item-version builder and the
 * product checker `cfuChecker.ts` runs, and report the checker's own reason code.
 */
function gradeThroughSharedChecker(
  answerType: LessonCfuCheck["answer_type"],
  key: string,
  answer: string,
): { correct: boolean; reason: string } {
  const version = cfuItemVersion(
    "el4-route-probe",
    "EL.4",
    // `allowed_symbols` is declared wherever the type can carry one, so a refusal is about the
    // answer's SHAPE rather than about `x` being undeclared. A numeric answer has no symbols
    // and `cfuItemVersion` writes the field only where the pack does.
    answerType === "numeric"
      ? { answer_type: answerType, answer_key: key }
      : { answer_type: answerType, answer_key: key, allowed_symbols: ["x"] },
    key,
  );
  const result = createProductAnswerChecker({ itemVersions: [version] })({
    raw_answer: answer,
    item_version_id: "el4-route-probe",
    equivalence_checker_version: CFU_CHECKER_VERSION,
  });
  return { correct: result.client_correct, reason: result.reason_code ?? "(none)" };
}

describe("EL.4 cannot take the shared checker's grading path", () => {
  /** The answer the reveal prints, so the probe is about the real string a learner copies. */
  const CANONICAL = CFU.accepted[0] as string;
  /** The notation slide 4 defines last, which two of the node's practice templates require. */
  const SET_BUILDER = `{x | x < ${AUTHORED_BOUND}}; x = ${AUTHORED_BOUND}`;

  it("probes every answer type a check block may declare", () => {
    // A floor, and beside it the COMPOSITION the floor cannot carry: the six are named, so a
    // type leaving the union fails here rather than quietly going unprobed, and a seventh
    // arriving fails here rather than being covered by a count that still reads six.
    expect(
      [...CHECKABLE_ANSWER_TYPES].sort(),
      "LessonCfuCheck's answer_type union moved, so this probe no longer covers it",
    ).toEqual([
      "equation_form",
      "expression",
      "interval",
      "numeric",
      "point",
      "solution_set",
    ]);
    expect(
      CHECKABLE_ANSWER_TYPES.length,
      "the union collapsed, so the sweep below would run over nothing",
    ).toBeGreaterThanOrEqual(6);
    // And that the list is the module's own rather than a copy that happens to agree today.
    expect(new Set(CHECKABLE_ANSWER_TYPES)).toEqual(new Set(Object.keys(EQUIVALENCE_FOR)));
    expect(
      CANONICAL,
      "EL.4's canonical answer is not the compound this probe is about",
    ).toBe(`x < ${AUTHORED_BOUND}; x = ${AUTHORED_BOUND}`);
  });

  /*
   * The refusal is asserted per type, and the REASON is asserted to exist rather than pinned
   * to one code. It used to pin `unsupported_syntax` for every type, which held only because
   * v1's two types took the same expression branch; six types take six branches. What does
   * not vary is that none of them is a pass and every one of them says why, and a checker
   * that started refusing with no code at all — the silence a `toBe(false)` cannot tell from
   * a real refusal — fails on the second assertion.
   */
  it.each(CHECKABLE_ANSWER_TYPES)(
    "refuses EL.4's canonical answer against itself under answer_type %s",
    (answerType) => {
      const { correct, reason } = gradeThroughSharedChecker(
        answerType,
        CANONICAL,
        CANONICAL,
      );
      expect(
        correct,
        `the shared checker now grades "${CANONICAL}" as ${answerType} (reason ${reason}), so the check-block route this pack was denied has OPENED: delete the enumerated accepted list and give EL.4 a cfu.check instead`,
      ).toBe(false);
      expect(
        reason,
        `the checker refused EL.4's answer under ${answerType} without saying why, so this block is measuring a silence rather than a refusal`,
      ).not.toBe("(none)");
    },
  );

  it.each(CHECKABLE_ANSWER_TYPES)(
    "cannot even parse the set-builder spelling under answer_type %s",
    (answerType) => {
      const { correct, reason } = gradeThroughSharedChecker(
        answerType,
        SET_BUILDER,
        SET_BUILDER,
      );
      expect(
        correct,
        `the shared checker now parses "${SET_BUILDER}" as ${answerType}, so the check-block route has opened for the notation slide 4 defines`,
      ).toBe(false);
      expect(
        reason,
        `the set-builder braces were refused under ${answerType} without a reason code`,
      ).not.toBe("(none)");
    },
  );

  it("grades a bare number, so the probe above is not failing on a broken harness", () => {
    const { correct } = gradeThroughSharedChecker(
      "numeric",
      String(AUTHORED_BOUND),
      String(AUTHORED_BOUND),
    );
    expect(correct, "the probe harness cannot grade anything at all").toBe(true);
  });
});

describe("EL.4's first ask grades what its own re-ask grades", () => {
  it(`compares ${AUTHORED_FORMS.size} authored spellings against ${RE_ASK_FORMS.size} re-asked ones`, () => {
    expect(RE_ASK_FORMS.size, "the re-ask spelled almost nothing").toBeGreaterThanOrEqual(
      MIN_FORMS,
    );
    expect(
      AUTHORED_FORMS.size,
      "the authored list spelled almost nothing",
    ).toBeGreaterThanOrEqual(MIN_FORMS);
    const refusedByTheFirstAsk = [...RE_ASK_FORMS].filter(
      (form) => !AUTHORED_FORMS.has(form),
    );
    expect(
      refusedByTheFirstAsk.slice(0, 8),
      `EL.4's first attempt refuses ${refusedByTheFirstAsk.length} spellings its own re-ask accepts`,
    ).toEqual([]);
    const takenOnlyByTheFirstAsk = [...AUTHORED_FORMS].filter(
      (form) => !RE_ASK_FORMS.has(form),
    );
    expect(
      takenOnlyByTheFirstAsk.slice(0, 8),
      `EL.4's authored list accepts ${takenOnlyByTheFirstAsk.length} spellings its own re-ask refuses`,
    ).toEqual([]);
  });

  it.each(NAMED_SPELLINGS)("takes %s on the first attempt", (spelling: string) => {
    expect(
      gradesAsCorrect(EL4 as LessonContent, spelling),
      `EL.4 refuses "${spelling}", which is its own answer written another way`,
    ).toBe(true);
  });

  it.each(SAMPLE)("takes %s, drawn from the re-ask's own set", (spelling: string) => {
    expect(
      gradesAsCorrect(EL4 as LessonContent, spelling),
      `EL.4's re-ask accepts "${spelling}" and its first ask does not`,
    ).toBe(true);
  });

  it.each(REFUSED)("still refuses %s", (spelling: string) => {
    expect(
      gradesAsCorrect(EL4 as LessonContent, spelling),
      `EL.4 accepts "${spelling}", which is a different answer rather than a different spelling`,
    ).toBe(false);
  });
});

describe("EL.4 accepts the set-builder form its own slide 4 defines", () => {
  it("names spellings that are not already covered by another list here", () => {
    // A floor, and disjointness: an emptied list, or one that had swallowed the named
    // spellings, would leave every claim below asserting nothing.
    expect(SET_BUILDER_ACCEPTED.length, "the set-builder list is empty").toBeGreaterThan(0);
    expect(ABSOLUTE_VALUE_TEXT.length, "the absolute-value list is empty").toBeGreaterThan(
      0,
    );
    const overlap = SET_BUILDER_ACCEPTED.filter(
      (form) => NAMED_SPELLINGS.includes(form) || REFUSED.includes(form),
    );
    expect(overlap, "a spelling is claimed twice").toEqual([]);
  });

  it.each(SET_BUILDER_ACCEPTED)("grades %s correct on the first attempt", (spelling) => {
    expect(
      gradesAsCorrect(EL4 as LessonContent, spelling),
      `EL.4 refuses "${spelling}", the notation its own slide 4 defines last and two of its practice templates require`,
    ).toBe(true);
  });

  /**
   * The predicate under the fix, asserted in BOTH directions on one run. Narrowing it is only
   * safe if it still claims a real absolute value, and a narrowing that went too far would
   * pass the first block above while silently taking RAD.4's keypad away.
   */
  it("tells a set-builder separator from an absolute-value bar", () => {
    for (const form of SET_BUILDER_ACCEPTED) {
      expect(
        isAbsoluteValueAnswerText(form),
        `the absolute-value predicate claims "${form}", whose bar is a set-builder separator`,
      ).toBe(false);
    }
    for (const form of ABSOLUTE_VALUE_TEXT) {
      expect(
        isAbsoluteValueAnswerText(form),
        `the absolute-value predicate no longer claims "${form}", which is an absolute value and wants its bars named`,
      ).toBe(true);
    }
  });

  /**
   * The cost the round-one blocker was about, measured on the shipped list rather than argued.
   * The comparison is against the same list with the set-builder spellings REMOVED, so it
   * cannot pass by both sides being wrong: it says adding this notation changed nothing about
   * what the field advertises.
   */
  it("does not retag the answer field by carrying the notation", () => {
    const withoutSetBuilder = CFU.accepted.filter((form) => !form.includes("|"));
    expect(
      withoutSetBuilder.length,
      "no spelling in EL.4's list carries a bar, so this comparison is between two identical lists",
    ).toBeLessThan(CFU.accepted.length);
    expect(
      withoutSetBuilder.length,
      "filtering bars emptied EL.4's list",
    ).toBeGreaterThanOrEqual(MIN_FORMS);
    expect(
      cfuNotation(CFU.check, CFU.accepted),
      "EL.4's set-builder spellings retag the whole question's notation",
    ).toBe(cfuNotation(CFU.check, withoutSetBuilder));
    expect(
      cfuNotation(CFU.check, CFU.accepted),
      "EL.4's shipped accepted list advertises radical notation on a domain-and-asymptote question",
    ).not.toBe("variable_radical");
  });
});
