/**
 * Routing CFU grading from the D1 checker to the PRODUCT checker changes the comparator
 * behind every pack that already worked. This file is the evidence that it changed nothing.
 *
 * The swap exists for the 39 packs that had no `check` at all, whose answers are intervals,
 * rosters and coordinate pairs the v1 dispatch answers `unsupported_answer_type` for. But it
 * is not scoped to them: `cfuChecker.ts` builds ONE checker over every check block in the
 * tree, so the 23 packs that already carried one moved comparator too, silently, and a
 * regression there would land as a right answer marked wrong on a node nobody was editing.
 * That is the failure this file is written against, and it is written to be able to SEE it:
 * it builds the v1 checker the old file built, field for field, and grades the same strings
 * through both.
 *
 * ## What is graded
 *
 * Per pack, three families, all derived from the pack's own content rather than typed here:
 *
 *  - **every entry of `cfu.accepted`**, which is what the author holds out as correct, plus
 *    the `check.answer_key` the checker is registered with;
 *  - **the wrong-answer mutations**: the key with its first integer bumped (a different
 *    value), the key with a digit dropped, an empty string, a word, and a couple of shapes
 *    that are the answer written as an unevaluated expression. A parity file that graded only
 *    correct answers would be satisfied by a checker that accepts everything;
 *  - **the spellings the two checkers are most likely to disagree about**: LaTeX, the root
 *    glyph, a leading `+`, an unreduced fraction and a decimal. These are the strings that
 *    reach `invalid_input` on one path and could reach a verdict on the other.
 *
 * ## Verdict AND reason code
 *
 * Both, and the reason code is not decoration. `client_correct` is what the learner is told,
 * so a divergence there is a P0; `reason_code` is what `gradeCfuAnswer` turns into the note
 * under the field, so a divergence there is a learner told the wrong thing about a wrong
 * answer. The two are asserted separately and reported separately, because they fail for
 * different reasons and a run that shows one should not be read as showing the other.
 *
 * `status` is deliberately NOT asserted. §12 of `Answer_Equivalence_Spec.md` scores
 * `invalid_input` and `incorrect` differently for MASTERY, and the CFU writes no mastery — it
 * is teaching-only — so the distinction has no consumer on this surface, and the two
 * checkers do legitimately differ on it where v1 refused a whole answer type. What the
 * learner sees is the verdict and the note, and those are what is pinned.
 */

import {
  type AnswerChecker,
  type AnswerSpec,
  createD1AnswerChecker,
  D1_CHECKER_VERSION,
  type D1ItemVersion,
  type D1NodeId,
} from "@cr/components";
import { describe, expect, it } from "vitest";

import { CFU_CHECKER_VERSION, cfuChecker, cfuItemVersionId } from "./cfuChecker";
import { allLessons } from "./domains";
import type { LessonCfuCheck, LessonContent } from "./types";

/**
 * The 23 packs that carried a `check` BEFORE this migration, which is the population whose
 * grading must not have moved.
 *
 * **This population is NAMED rather than derived, and that is not the usual trap.** A derived
 * population is right when the property is a fact about the tree. This one is a fact about a
 * PAST SHA — "carried a check at 90e09151, before this change authored any" — and nothing in
 * the current tree distinguishes a pack that always had a check from one this migration gave
 * one to. So the derivation is the thing that cannot be trusted here, and the list is what
 * the tree gets checked against.
 *
 * It was derived first, and the derivation was wrong in a way worth recording, because it is
 * the "deriving correctly is a separate question from deriving at all" failure in miniature.
 * The filter was `check.answer_type` against the four types `d1-answer-checker.ts` switches
 * on, which is one clean filter over a real source — and it swept in RAD.3, RAD.4, POL.5 and
 * POL.7, the four packs THIS CHANGE had just migrated, whose v1 behaviour the file would then
 * have been asserting parity against. Three of those v1 grades by accident and RAD.4 it
 * cannot grade at all: v1 refuses a `simplified_radical` profile as
 * `unsupported_simplification_profile`, so the "identical" it would have demanded was
 * identical to refusing every correct answer. The type filter could not see that, because the
 * constraint that stops v1 is on the SPEC and not on the type.
 *
 * A pin rather than a floor, for the same reason it is named: this is closed history and it
 * may not grow. The assertions below fail in both directions — a named pack whose check goes
 * missing fails, and a named pack retyped out of v1's reach fails.
 */
const PRE_EXISTING_CHECKED_PACKS: readonly string[] = [
  "EL.1",
  "EL.3",
  "EL.6",
  "FUN.6",
  "FUN.7",
  "FUN.9",
  "GEO.1",
  "GEO.2",
  "LIN.1",
  "LIN.3",
  "NUM.2",
  "NUM.5",
  "NUM.F",
  "NUM.S",
  "TRG.1",
  "TRG.2",
  "TRG.3",
  "TRG.4",
  "TRG.5",
  "TRG.6",
  "TRG.7",
  "TRG.8",
  "TRG.9",
];

/**
 * The four answer types v1's `checkDefinition` switches on, restated rather than imported so
 * the question is asked independently of the file under test. Not a population filter (see
 * above); an assertion ABOUT the named population, so a named pack that stops being gradable
 * by v1 fails here instead of quietly making the comparison vacuous.
 */
const V1_GRADABLE_TYPES = [
  "numeric",
  "expression",
  "multiple_choice",
  "multipart",
] as const;

const CHECKED: readonly LessonContent[] = PRE_EXISTING_CHECKED_PACKS.map((node) => {
  const lesson = allLessons.find((one) => one.node_id === node);
  if (lesson === undefined) {
    throw new Error(
      `${node} carried a check at 90e09151 and is no longer a registered lesson`,
    );
  }
  return lesson;
});

/**
 * The v1 item versions, built exactly as `cfuChecker.ts` built them at 90e09151.
 *
 * Copied rather than imported, and that is the whole design of this file: importing the
 * builder would make both sides of the comparison read the same construction, so a spec
 * field that moved in the swap would move on both sides and the parity would hold
 * vacuously. This is the old shape frozen, so the assertion is against what SHIPPED.
 */
const V1_BASE = {
  representation: "any",
  simplification: "none",
  required_form: null,
  required_notation: "none",
  precision: null,
  unit_policy: "none",
} as const;

const V1_NUMERIC: AnswerSpec = {
  answer_type: "numeric",
  equivalence: "exact_value",
  ...V1_BASE,
};
const V1_EXPRESSION: AnswerSpec = {
  answer_type: "expression",
  equivalence: "symbolic",
  ...V1_BASE,
};

function v1ItemVersion(nodeId: string, check: LessonCfuCheck): D1ItemVersion {
  return {
    item_version_id: cfuItemVersionId(nodeId),
    node_id: nodeId as D1NodeId,
    answer:
      check.answer_type === "numeric"
        ? {
            answer_spec: {
              ...V1_NUMERIC,
              representation: check.representation ?? "any",
              simplification: check.simplification ?? "none",
            },
            answer_key: check.answer_key,
          }
        : {
            answer_spec: V1_EXPRESSION,
            answer_key: check.answer_key,
            allowed_symbols: check.allowed_symbols ?? [],
          },
  };
}

const v1Checker: AnswerChecker = createD1AnswerChecker({
  itemVersions: CHECKED.map((lesson) =>
    v1ItemVersion(lesson.node_id, lesson.cfu?.check as LessonCfuCheck),
  ),
});

/** The wrong-answer family, derived from each pack's own key. */
function mutationsOf(key: string): string[] {
  const out = new Set<string>();
  const digits = /\d+/.exec(key);
  if (digits) {
    const bumped = String(Number(digits[0]) + 1);
    out.add(
      key.slice(0, digits.index) + bumped + key.slice(digits.index + digits[0].length),
    );
    // A digit dropped, which is the transcription slip rather than an arithmetic one.
    if (digits[0].length > 1) {
      out.add(
        key.slice(0, digits.index) +
          digits[0].slice(1) +
          key.slice(digits.index + digits[0].length),
      );
    }
  }
  out.add(`-${key}`);
  out.add("");
  out.add("   ");
  out.add("banana");
  out.add("2 + 3 * 4");
  out.add(`${key} `);
  out.delete(key);
  return [...out];
}

/**
 * The spellings the two comparators are most likely to part company over: anything that
 * reaches `invalid_input` on one path could reach a verdict on the other.
 */
function notationProbesOf(key: string): string[] {
  const out = new Set<string>([
    key.toUpperCase(),
    `+${key}`,
    ` ${key} `,
    `\\dfrac{${key}}{1}`,
    `${key}%`,
    `(${key})`,
  ]);
  const fraction = /^(-?\d+)\/(\d+)$/.exec(key.trim());
  if (fraction) {
    out.add(`${Number(fraction[1]) * 2}/${Number(fraction[2]) * 2}`);
    out.add(String(Number(fraction[1]) / Number(fraction[2])));
  }
  if (/^-?\d+$/.test(key.trim())) {
    out.add(`${key}.0`);
    out.add(`${Number(key) * 2}/2`);
  }
  return [...out];
}

interface Row {
  readonly node: string;
  readonly family: "accepted" | "mutation" | "notation";
  readonly answer: string;
}

const ROWS: Row[] = [];
for (const lesson of CHECKED) {
  const cfu = lesson.cfu;
  const check = cfu?.check;
  if (!cfu || !check) {
    continue;
  }
  const seen = new Set<string>();
  const push = (family: Row["family"], answer: string) => {
    if (seen.has(`${family}\u0000${answer}`)) {
      return;
    }
    seen.add(`${family}\u0000${answer}`);
    ROWS.push({ node: lesson.node_id, family, answer });
  };
  push("accepted", check.answer_key);
  for (const form of cfu.accepted) {
    push("accepted", form);
  }
  for (const wrong of mutationsOf(check.answer_key)) {
    push("mutation", wrong);
  }
  for (const probe of notationProbesOf(check.answer_key)) {
    push("notation", probe);
  }
}

function gradeV1(node: string, answer: string) {
  return v1Checker({
    raw_answer: answer,
    item_version_id: cfuItemVersionId(node),
    equivalence_checker_version: D1_CHECKER_VERSION,
  });
}

function gradeV2(node: string, answer: string) {
  return cfuChecker({
    raw_answer: answer,
    item_version_id: cfuItemVersionId(node),
    equivalence_checker_version: CFU_CHECKER_VERSION,
  });
}

/**
 * Floors on the SHAPE of the table as well as its size. A count alone is satisfied by one
 * pack contributing everything, so each pack owes rows in each family.
 */
/** A pin, because the population is closed history. See {@link PRE_EXISTING_CHECKED_PACKS}. */
const MIN_PACKS = 23;
/** A floor, not a pin. Measured on this tip: 382 rows over the 23 packs. */
const MIN_ROWS = 350;

describe("the 23 pre-existing checked CFUs grade identically through the product checker", () => {
  it(`sweeps ${CHECKED.length} packs over ${ROWS.length} answers`, () => {
    expect(CHECKED.length, "packs left the population").toBe(MIN_PACKS);
    // Each named pack still carries a check, and still one v1 can grade. Both directions of
    // the same claim: without the first the comparison is against a missing item version, and
    // without the second it is against a v1 that refuses every input, which "identical" would
    // then be satisfied by.
    for (const lesson of CHECKED) {
      const check = lesson.cfu?.check;
      expect(
        check,
        `${lesson.node_id} carried a check at 90e09151 and no longer has one, so its grading moved with nothing measuring it`,
      ).toBeDefined();
      expect(
        V1_GRADABLE_TYPES as readonly string[],
        `${lesson.node_id} has been retyped to ${check?.answer_type}, which the v1 checker answers unsupported_answer_type for, so the parity below would be agreement about refusing everything`,
      ).toContain(check?.answer_type);
      expect(
        check?.simplification ?? "none",
        `${lesson.node_id} declares a simplification profile v1 answers unsupported_simplification_profile for, which is the same vacuity by another route`,
      ).toMatch(/^(none|reduced_fraction)$/);
    }
    expect(ROWS.length, "the case table shrank").toBeGreaterThanOrEqual(MIN_ROWS);
    for (const lesson of CHECKED) {
      for (const family of ["accepted", "mutation", "notation"] as const) {
        expect(
          ROWS.filter((row) => row.node === lesson.node_id && row.family === family).length,
          `${lesson.node_id} contributed no ${family} row, so its ${family} axis is unmeasured`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("agrees on every verdict, and on every reason code", () => {
    const verdictSplits: string[] = [];
    const reasonSplits: string[] = [];
    for (const row of ROWS) {
      const before = gradeV1(row.node, row.answer);
      const after = gradeV2(row.node, row.answer);
      if (before.client_correct !== after.client_correct) {
        verdictSplits.push(
          `${row.node} (${row.family}) "${row.answer}": v1 ${before.client_correct ? "correct" : "wrong"} / v2 ${after.client_correct ? "correct" : "wrong"}`,
        );
      }
      if (before.reason_code !== after.reason_code) {
        reasonSplits.push(
          `${row.node} (${row.family}) "${row.answer}": v1 ${before.reason_code} / v2 ${after.reason_code}`,
        );
      }
    }
    console.log(
      `[cfu-product-parity] ${CHECKED.length} packs, ${ROWS.length} answers; ` +
        `${verdictSplits.length} verdict divergences, ${reasonSplits.length} reason-code divergences`,
    );
    expect(
      verdictSplits,
      `the swap changed what a learner is TOLD on ${verdictSplits.length} answers:\n  ${verdictSplits.join("\n  ")}`,
    ).toEqual([]);
    expect(
      reasonSplits,
      `the swap changed the reason code, and so the note under the field, on ${reasonSplits.length} answers:\n  ${reasonSplits.join("\n  ")}`,
    ).toEqual([]);
  });

  /**
   * The half that stops the above from passing vacuously.
   *
   * Two checkers that both refused everything would agree on every row, so this asserts the
   * table actually contains both verdicts and that each pack's own key grades correct on the
   * NEW path — the one row whose failure would be a P0 and which a pure agreement assertion
   * cannot distinguish from a pack nobody can answer.
   */
  it("the sweep saw both verdicts, and every key still grades correct", () => {
    const correct = ROWS.filter((row) => gradeV2(row.node, row.answer).client_correct);
    expect(
      correct.length,
      "no answer in the whole table graded correct, so the parity above is agreement about refusing everything",
    ).toBeGreaterThan(CHECKED.length);
    expect(
      ROWS.length - correct.length,
      "no answer in the whole table graded wrong, so the parity above is agreement about accepting everything",
    ).toBeGreaterThan(CHECKED.length);
    for (const lesson of CHECKED) {
      const key = lesson.cfu?.check?.answer_key ?? "";
      const graded = gradeV2(lesson.node_id, key);
      expect(
        graded.client_correct,
        `${lesson.node_id}: its own answer key "${key}" grades ${graded.status} / ${graded.reason_code} through the product checker`,
      ).toBe(true);
    }
  });
});
