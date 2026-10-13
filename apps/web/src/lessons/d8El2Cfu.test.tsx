/**
 * EL.2's check is graded by exact string match, and its first ask used to accept a hand-written
 * SAMPLE of what its own re-ask accepts.
 *
 * The sibling of `d8El4Cfu.test.tsx`, deliberately: the two packs have the same archetype (a
 * compound answer, two clauses, either order) and they hit the same wall, so they are fixed the
 * same way and the file that proves it reads the same way. Where this one differs from EL.4's
 * it is because EL.2's answer differs, not because a better shape was found.
 *
 * `cfu.tsx` takes one of two grading paths (`if (cfu.check && asked.authored)`): a pack carrying
 * a `check` grades through the shared checker, and a pack without one is compared against
 * `accepted` after `normalizeAcceptedAnswer`. EL.2 cannot take the first path, and the first
 * `describe` below MEASURES that rather than asserting it in this comment, because a sentence
 * here would be the reviewer's word for it and would go stale the day the checker gained a
 * coordinate pair. That block is also the trigger to come back: it fails if the route ever
 * opens, and its message says to replace this whole enumerated list with a `check` block.
 *
 * What is left is the property this file asserts: the two instances of one question must accept
 * the SAME spellings. The authored question is the template at `shift = 5` and the re-ask is the
 * same template at another shift, both spelled by `SPELLERS["cfu.el2.reflect-shift"]`, so
 * anything the re-ask takes is an answer the first ask has no grounds to refuse. At `1b3f985f`
 * the authored list held 10 of the 144 forms the speller produces, so the first attempt refused
 * 134 spellings the second attempt accepted, including `y = 5, point (0, 4)` and
 * `point (0, 4), y = 5`. The pack now carries all 144.
 *
 * ## The population is DERIVED from the speller, not typed out here
 *
 * The speller is not exported, so the second instance's own accepted list is read back through
 * `cfuInstances` and rebased onto the authored numbers. That is sound because the shift and the
 * anchor are the only numbers the speller interpolates, and the template ties them together
 * (`anchor = shift - 1`), so substituting both yields exactly the set the speller would produce
 * at 5. Typing the expected list here instead would be the trap `lesson-qa` names, a sweep
 * counting its own list rather than the tree, and it would go green the day the speller widened.
 *
 * A floor sits under the comparison because a set equality between two empty sets holds.
 */

import { createProductAnswerChecker } from "@cr/components";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { cfuNotation, normalizeAcceptedAnswer } from "./answerFormat";
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

const EL2 = allLessons.find((lesson) => lesson.node_id === "EL.2");
if (!EL2?.cfu) {
  throw new Error("EL.2 is not registered, so this file would sweep nothing");
}
const CFU = EL2.cfu;

/** The asymptote the authored question is written on, and the anchor that goes with it. */
const AUTHORED_SHIFT = 5;
const AUTHORED_ANCHOR = AUTHORED_SHIFT - 1;

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

/**
 * The re-ask's own spellings, rebased from its drawn numbers onto the authored ones.
 *
 * The anchor goes first and is rebased inside its brackets, because it is the clause whose
 * context pins it; the shift is then whatever number is left, taken on digit boundaries so
 * `y = 12.0` moves and the `0` of `(0, 11)` does not. Doing it the other way round would let
 * the substituted anchor be mistaken for the shift wherever the two numbers happened to meet.
 */
function reAskFormsAtAuthoredNumbers(): readonly string[] {
  const reAsk = cfuInstances(CFU).find((instance) => !instance.authored);
  if (reAsk === undefined) {
    throw new Error(
      "EL.2 resolved no computed instance, so there is nothing to compare to",
    );
  }
  const shift = reAsk.params.shift;
  const anchor = reAsk.params.anchor;
  if (typeof shift !== "number" || typeof anchor !== "number") {
    throw new Error(`EL.2's re-ask carries no shift and anchor: ${reAsk.answerKey}`);
  }
  if (shift === AUTHORED_SHIFT) {
    throw new Error("EL.2's re-ask drew the authored shift, so rebasing proves nothing");
  }
  // The rebase writes a placeholder before it writes a number, so a substituted value can
  // never be read back as the other one. Both are non-zero, which is what keeps the literal
  // `0` of the ordered pair out of the shift's pattern.
  if (shift === 0 || anchor === 0) {
    throw new Error(
      `EL.2's re-ask drew a zero, which the rebase cannot tell apart: ${shift}/${anchor}`,
    );
  }
  return reAsk.accepted.map((form) =>
    form
      .replace(new RegExp(`\\(0, ${anchor}(\\.0)?\\)`, "g"), "(0, \u0001$1)")
      .replace(new RegExp(`(?<![\\d.])${shift}(?![\\d])`, "g"), "\u0002")
      .replaceAll("\u0001", String(AUTHORED_ANCHOR))
      .replaceAll("\u0002", String(AUTHORED_SHIFT)),
  );
}

const AUTHORED_FORMS = new Set(CFU.accepted.map(normalizeAcceptedAnswer));
const RE_ASK_FORMS = new Set(reAskFormsAtAuthoredNumbers().map(normalizeAcceptedAnswer));

/**
 * A floor under the comparison, so neither side can satisfy it by being empty. The speller
 * produces 144 forms per instance, which normalise down to 72 distinct ones because it spells
 * every form twice, once with a sentence-final period. The floor is deliberately well under
 * that, because it exists to catch an empty population rather than to pin a count that every
 * widening of the speller would have to come back and edit.
 */
const MIN_FORMS = 50;

/**
 * The spellings named in the round-one review that the re-ask accepted while the first ask
 * refused them. Each of these graded WRONG at `1b3f985f` and grades right now.
 */
const NAMED_SPELLINGS: readonly string[] = [
  "y = 5, point (0, 4)",
  "y = 5, (0, 4.0)",
  "y = 5.0; (0, 4)",
  "point (0, 4), y = 5",
];

/**
 * Answers that are NOT the answer, so widening the list cannot be what makes this file green.
 * A sweep that only ever asserts acceptance is satisfied by a list accepting everything.
 */
const REFUSED: readonly string[] = [
  // The reflection applied to the asymptote as well, which is the miss the question is for.
  "y = -5, (0, 4)",
  // The shift applied to the asymptote but not to the anchor.
  "y = 5, (0, -1)",
  // Both readings from the untransformed curve.
  "y = 0, (0, 1)",
  // One clause of the two, which is half an answer rather than another spelling of it.
  "y = 5",
  "(0, 4)",
];

/** A deterministic spread over the re-ask's set, so the claim is not carried by its first row. */
const SAMPLE: readonly string[] = (() => {
  const forms = [...reAskFormsAtAuthoredNumbers()];
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
 * The round's intended route was a `check` block, which would have made the whole list below
 * unnecessary: `cfuChecker.ts` grades a checked pack form-independently, so any spelling of one
 * answer would pass without anybody enumerating it. The route is closed, and it is closed at the
 * checker rather than at this pack: EL.2's answer is an EQUATION followed by an ORDERED PAIR,
 * and no single `answer_type` describes a compound of two.
 *
 * So the probe is the strongest available: grade the pack's own canonical answer against ITSELF.
 * A checker that cannot agree an answer equals itself cannot grade the question at all, and
 * putting a `check` block on this pack would fail a learner who typed the string the reveal
 * printed. That is strictly worse than the enumeration, which is why the enumeration stands.
 *
 * This fails in BOTH directions, which is the point of measuring it here instead of writing it
 * down. If the shared checker gains coordinate support, `client_correct` goes true, this block
 * goes red, and its message says what to do about it. If EL.2's canonical answer changes shape,
 * the key is read off `accepted[0]` and travels with it.
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
    "el2-route-probe",
    "EL.2",
    // `allowed_symbols` is declared wherever the type can carry one, because EL.2's answer is
    // written in x and y and the point of the probe is that the SHAPE defeats the checker,
    // not that an undeclared symbol did. A numeric answer has no symbols to declare and
    // `cfuItemVersion` writes the field only where the pack does.
    answerType === "numeric"
      ? { answer_type: answerType, answer_key: key }
      : { answer_type: answerType, answer_key: key, allowed_symbols: ["x", "y"] },
    key,
  );
  const result = createProductAnswerChecker({ itemVersions: [version] })({
    raw_answer: answer,
    item_version_id: "el2-route-probe",
    equivalence_checker_version: CFU_CHECKER_VERSION,
  });
  return { correct: result.client_correct, reason: result.reason_code ?? "(none)" };
}

describe("EL.2 cannot take the shared checker's grading path", () => {
  /** The answer the reveal prints, so the probe is about the real string a learner copies. */
  const CANONICAL = CFU.accepted[0] as string;

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
      "EL.2's canonical answer is not the compound this probe is about",
    ).toBe(`y = ${AUTHORED_SHIFT}, (0, ${AUTHORED_ANCHOR})`);
    expect(CFU.check, "EL.2 already carries a check block").toBeUndefined();
  });

  it.each(CHECKABLE_ANSWER_TYPES)(
    "refuses EL.2's canonical answer against itself under answer_type %s",
    (answerType) => {
      const { correct, reason } = gradeThroughSharedChecker(
        answerType,
        CANONICAL,
        CANONICAL,
      );
      expect(
        correct,
        `the shared checker now grades "${CANONICAL}" as ${answerType} (reason ${reason}), so the check-block route this pack was denied has OPENED: delete the enumerated accepted list and give EL.2 a cfu.check instead`,
      ).toBe(false);
    },
  );

  it("grades a bare number, so the probe above is not failing on a broken harness", () => {
    const { correct } = gradeThroughSharedChecker(
      "numeric",
      String(AUTHORED_SHIFT),
      String(AUTHORED_SHIFT),
    );
    expect(correct, "the probe harness cannot grade anything at all").toBe(true);
  });
});

describe("EL.2's first ask grades what its own re-ask grades", () => {
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
      `EL.2's first attempt refuses ${refusedByTheFirstAsk.length} spellings its own re-ask accepts`,
    ).toEqual([]);
    const takenOnlyByTheFirstAsk = [...AUTHORED_FORMS].filter(
      (form) => !RE_ASK_FORMS.has(form),
    );
    expect(
      takenOnlyByTheFirstAsk.slice(0, 8),
      `EL.2's authored list accepts ${takenOnlyByTheFirstAsk.length} spellings its own re-ask refuses`,
    ).toEqual([]);
  });

  it.each(NAMED_SPELLINGS)("takes %s on the first attempt", (spelling: string) => {
    expect(
      gradesAsCorrect(EL2 as LessonContent, spelling),
      `EL.2 refuses "${spelling}", which is its own answer written another way`,
    ).toBe(true);
  });

  it.each(SAMPLE)("takes %s, drawn from the re-ask's own set", (spelling: string) => {
    expect(
      gradesAsCorrect(EL2 as LessonContent, spelling),
      `EL.2's re-ask accepts "${spelling}" and its first ask does not`,
    ).toBe(true);
  });

  it.each(REFUSED)("still refuses %s", (spelling: string) => {
    expect(
      gradesAsCorrect(EL2 as LessonContent, spelling),
      `EL.2 accepts "${spelling}", which is a different answer rather than a different spelling`,
    ).toBe(false);
  });
});

/**
 * The trap the EL.4 lane fell into, watched here rather than assumed away.
 *
 * `cfuNotation` reads the WHOLE accepted list, and `isAbsoluteValueAnswerText` matches a bare
 * `|` anywhere in it, so one stray spelling can retag the field's advertised notation and its
 * keypad for the entire question. EL.2's list grew from 10 spellings to 144 and none of them
 * carries a bar, so what the learner is offered under the question did not move; this is the
 * assertion that says so, and it fails if a later widening brings one in.
 */
describe("EL.2's widened list leaves the answer field advertising what it did", () => {
  it("tags the same notation off 144 spellings as off the canonical one alone", () => {
    const canonicalOnly = cfuNotation(CFU.check, [CFU.accepted[0] as string]);
    expect(
      cfuNotation(CFU.check, CFU.accepted),
      `the widened list retags EL.2's answer field: it advertises ${cfuNotation(CFU.check, CFU.accepted)} where the canonical spelling alone advertises ${canonicalOnly}`,
    ).toBe(canonicalOnly);
    // And it is not the radical tag the EL.4 lane's stray pipe produced, named rather than
    // implied so that this reads as the check it is.
    expect(
      cfuNotation(CFU.check, CFU.accepted),
      "EL.2 advertises absolute-value and radical notation on an asymptote question",
    ).not.toBe("variable_radical");
  });
});
