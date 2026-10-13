/**
 * The two questions of one check must not disagree about the same spelling.
 *
 * `cfu.tsx` grades the AUTHORED question through the shared checker, which computes
 * equivalence, and the RE-ASKED one by exact match against a computed list. The comment above
 * that branch used to assert the property that makes the split safe -- that the computed list
 * "is built to carry everything the checker would have allowed" -- and measured at 24493680 the
 * claim was false on three packs. The sequence a learner walked on TRG.9 was: type `14/50`, be
 * told "Correct! Nice work.", reveal, take the re-ask, type `-14/50` for the sign-flipped
 * question, and be marked wrong. One node, one sitting, two verdicts on one notation.
 *
 * ## Why this drives the card instead of comparing two lists
 *
 * The interesting quantity is not what either path holds, it is what the LEARNER is told, and
 * three things sit between the two data structures and that: the numeric-literal gate at
 * `cfu.tsx:374`, the reduced-fraction gate below it, and the reveal-and-re-ask walk that is the
 * only way to reach the second question at all. Every asserted case below mounts the real card,
 * answers the authored question, and then mounts it again to walk reveal -> re-ask and answer
 * the question the learner is actually handed second. Comparing `accepted` against a checker
 * call would re-implement all three gates, and a guard written against a re-implementation
 * agrees with itself.
 *
 * ## The rewrite family, and where it stops
 *
 * An equivalence class is infinite and an enumerated list is finite, so "the list carries
 * everything the checker allows" can only ever be asserted over a chosen family of rewrites.
 * `cfuAcceptanceConvention.test.tsx` makes the same argument about its own closure and reaches
 * the same conclusion: every bar over an enumeration is a cut somebody chose, so the cut is
 * stated rather than left implicit.
 *
 * The family is the two rewrites that are documented learner behaviour rather than arithmetic
 * trivia -- a fraction the learner did not reduce, and a fraction the learner divided out into
 * its exact decimal. Both are named in `lesson-qa/reference.md` 2.2's list of spellings to try
 * on every key, and both are exactly what `fractionForms`'s `unreduced` and `decimals` flags
 * exist to turn on and off. It reaches a pack whose answer is a plain fraction and no other,
 * which today is four of the twenty-three -- D9's three, and NUM.F, which is the control: it
 * declared the ruling before D9 existed and passes every rewrite the three used to fail. The
 * rest answer with a whole number, a linear expression, a coordinate pair, a roster or a pi
 * multiple, and there is no rewrite of those shapes that is both value-preserving and something
 * a learner types. Those packs contribute their identity case and nothing more, which is why
 * the census asserts the COMPOSITION of the table and not only its size.
 *
 * ## What is measured and reported instead of asserted
 *
 * Three axes disagree across the two questions and are NOT asserted, because no pack can
 * declare its way out of any of them and closing them from the speller side would mean writing
 * spellings nobody types. The census prints them every run rather than this comment quoting a
 * figure that expires:
 *
 *  - **A whole number written as a fraction** (`24/2` for a key of `12`). No `representation`
 *    profile refuses it: `fraction` would refuse the bare `12` the question wants, and `exact`
 *    reads only for a decimal point and lets `24/2` straight through.
 *  - **A third trailing zero** (`12.000`). `integerForms` writes `.0` and `.00` and stops, and
 *    a third zero is the same behaviour with one more keystroke rather than a different one.
 *  - **An unreduced pi multiple** (`6pi/4` for a key of `3pi/2`). The two radian packs are
 *    `expression`-typed, and `cfuChecker.ts` reads `representation` and `simplification` off
 *    the numeric spec only. There is no profile a pi multiple satisfies either --
 *    `isReducedFraction` wants a bare `n/d`, so `pi/4` fails it and the authored key would
 *    grade its own answer wrong. That class has no finite enumeration and no declaration
 *    finitizes it.
 *
 * The census is a cheaper instrument than the asserted cases: it grades the authored side
 * through the real registered checker and models the re-ask as the numeric gate plus the
 * computed list, rather than mounting twice. That fidelity is right for a figure nobody is
 * asserting and would not be right for one anybody was.
 *
 * ## What the fix was, for the three packs that were failing
 *
 * A pack CAN pin its own class finite, and NUM.F was the worked precedent before D9 existed:
 * with `representation: "fraction"` and `simplification: "reduced_fraction"` on its `check`,
 * the checker's accepted set for a key of `1/3` is the single string `1/3`, an enumeration
 * matches it exactly, and NUM.F was the one pack in the tree showing no gap on the measurement
 * that produced this file. TRG.3, TRG.4 and TRG.9 now declare the same pair.
 */

import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { isNumericLiteral, normalizeAcceptedAnswer } from "./answerFormat";
import { LessonCfu } from "./cfu";
import { CFU_CHECKER_VERSION, cfuChecker, cfuItemVersionId } from "./cfuChecker";
import { cfuInstances } from "./cfuVariants";
import { allLessons } from "./domains";
import type { LessonCfuSpec, LessonContent } from "./types";

/**
 * Every pack a learner can be graded by BOTH paths on: it carries a `check`, so its authored
 * question goes through the shared checker, and it carries `variants`, so its re-ask is a
 * computed instance graded by exact match. Derived from `allLessons` rather than written down,
 * so a domain landing joins the sweep with no edit here.
 *
 * Note this is NARROWER than `cfuVariants.test.ts`'s converted population, which is every pack
 * with a CFU at all. A pack with no `check` grades both of its questions by exact match against
 * a list, so its two paths are the same path and it has nothing to disagree with itself about.
 */
const BOTH_PATHS: readonly LessonContent[] = allLessons.filter(
  (lesson) => lesson.cfu?.check !== undefined && lesson.cfu?.variants !== undefined,
);

/**
 * A floor, not a pin. Measured at 24493680: 23, being the 43 packs carrying a CFU less the 20
 * that grade by list alone (17 in the convention sweep plus D8's three declared exempt there).
 * Growth needs no edit; a pack dropping out of the population fails loudly rather than quietly
 * shrinking what is swept.
 */
const MIN_BOTH_PATHS = 23;

/** What each rewrite is called when it fails, in the learner's terms rather than the code's. */
interface Rewrite {
  readonly axis: string;
  /** The rewritten spelling, or null where this rewrite does not apply to this answer. */
  readonly of: (answer: string) => string | null;
}

const PLAIN_FRACTION = /^(-?\d+)\/(\d+)$/;
const WHOLE_NUMBER = /^-?\d+$/;
const PI_MULTIPLE = /^(\d*)pi\/(\d+)$/;

function unreduced(answer: string, factor: number): string | null {
  const match = PLAIN_FRACTION.exec(answer.trim());
  if (!match) {
    return null;
  }
  return `${Number(match[1]) * factor}/${Number(match[2]) * factor}`;
}

/**
 * The exact decimal of a fraction, or null when there is not one.
 *
 * Null on a repeating expansion, which is most of D9's keys: `4/3` and `-7/24` have no
 * terminating decimal at all, so a decimal spelling of either would be a ROUNDING and a
 * different answer rather than the same one in different notation. The six-place bound is
 * `fractionForms`'s own `numStr`, for the same reason.
 */
function exactDecimal(answer: string): string | null {
  const match = PLAIN_FRACTION.exec(answer.trim());
  if (!match) {
    return null;
  }
  const value = Number(match[1]) / Number(match[2]);
  const text = String(Number(value.toFixed(6)));
  if (!Number.isFinite(value) || text.includes("e") || !text.includes(".")) {
    return null;
  }
  return Number(text) === value ? text : null;
}

const REWRITES: readonly Rewrite[] = [
  // The identity, and it is not filler: it is "the question the re-ask serves accepts its own
  // canonical answer, the string its reveal just printed", whose failure is a P0. It is also
  // the floor that stops a pack whose other rewrites all came back null from contributing an
  // empty green.
  { axis: "the answer as the reveal prints it", of: (answer) => answer },
  { axis: "a fraction the learner did not reduce", of: (answer) => unreduced(answer, 2) },
  { axis: "the exact decimal the fraction divides out to", of: exactDecimal },
  {
    axis: "the exact decimal, written without its leading zero",
    of: (answer) => exactDecimal(answer)?.replace(/^(-?)0\./, "$1.") ?? null,
  },
  {
    axis: "the exact decimal, with a trailing zero",
    of: (answer) => {
      const decimal = exactDecimal(answer);
      return decimal === null ? null : `${decimal}0`;
    },
  },
];

/** The axes measured and printed rather than asserted. See the header for why each is here. */
const REPORTED_ONLY: readonly Rewrite[] = [
  {
    axis: "a whole number written as a fraction",
    of: (answer) =>
      WHOLE_NUMBER.test(answer.trim()) ? `${Number(answer.trim()) * 2}/2` : null,
  },
  {
    axis: "a whole number with a third trailing zero",
    of: (answer) => (WHOLE_NUMBER.test(answer.trim()) ? `${answer.trim()}.000` : null),
  },
  {
    axis: "a pi multiple the learner did not reduce",
    of: (answer) => {
      const match = PI_MULTIPLE.exec(answer.trim());
      if (!match) {
        return null;
      }
      const top = match[1] === "" ? 1 : Number(match[1]);
      return `${top * 2}pi/${Number(match[2]) * 2}`;
    },
  },
];

type Verdict = "correct" | "recalled" | "incorrect";

function card(container: HTMLElement): HTMLElement {
  const found = container.querySelector<HTMLElement>(".lesson-player__cfu");
  if (found === null) {
    throw new Error("the check-for-understanding card did not mount");
  }
  return found;
}

function submit(container: HTMLElement, value: string): void {
  const field = card(container).querySelector('input[type="text"]');
  const form = card(container).querySelector("form");
  if (!(field instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) {
    throw new Error("the card rendered no answer field to type into");
  }
  fireEvent.change(field, { target: { value } });
  fireEvent.submit(form);
}

/**
 * The verdict the card reported, cross-checked against the sentence on the learner's screen.
 *
 * Both, because a case passing on a callback the screen disagreed with would be measuring the
 * wrong half of this surface.
 */
function lastVerdict(container: HTMLElement, reported: readonly Verdict[]): Verdict {
  const outcome = reported[reported.length - 1];
  if (outcome === undefined) {
    throw new Error("the card graded nothing");
  }
  const said = (container.textContent ?? "").includes("Correct! Nice work.");
  if (said !== (outcome === "correct")) {
    throw new Error(`the card reported ${outcome} and showed ${said} on screen`);
  }
  return outcome;
}

function mountCard(lesson: LessonContent) {
  const reported: Verdict[] = [];
  const view = render(
    <LessonCfu
      cfu={lesson.cfu as LessonCfuSpec}
      nodeId={lesson.node_id}
      // The advisor's hint, already spent. The card withholds the reveal until it has been,
      // and the reveal is the only door to the second question.
      hintTaken
      onResult={(outcome) => reported.push(outcome)}
    />,
  );
  return { ...view, reported };
}

/** The verdict on the pack's own first question, which the shared checker grades. */
function gradeAuthored(lesson: LessonContent, value: string): Verdict {
  const { container, unmount, reported } = mountCard(lesson);
  try {
    submit(container, value);
    return lastVerdict(container, reported);
  } finally {
    unmount();
  }
}

/**
 * The verdict on the question the learner is handed SECOND, reached the only way they can
 * reach it: answer wrong, reveal, take the re-ask.
 */
async function gradeReAsked(lesson: LessonContent, value: string): Promise<Verdict> {
  const { container, unmount, reported } = mountCard(lesson);
  try {
    submit(container, "zzz");
    const reveal = () =>
      container.querySelector<HTMLButtonElement>(".lesson-interactive__reveal-button");
    await waitFor(() => {
      if (reveal() === null) {
        throw new Error(`${lesson.node_id}: the reveal was never offered`);
      }
    });
    fireEvent.click(reveal() as HTMLButtonElement);
    const reAsk = () =>
      container.querySelector<HTMLButtonElement>(".lesson-interactive__reask-button");
    await waitFor(() => {
      if (reAsk() === null) {
        throw new Error(`${lesson.node_id}: the re-ask was never offered`);
      }
    });
    fireEvent.click(reAsk() as HTMLButtonElement);
    await waitFor(() => {
      if (container.querySelector(".lesson-interactive__reveal") !== null) {
        throw new Error(`${lesson.node_id}: the question never came back`);
      }
    });
    submit(container, value);
    return lastVerdict(container, reported);
  } finally {
    unmount();
  }
}

interface Case {
  readonly node: string;
  readonly lesson: LessonContent;
  readonly axis: string;
  /** The spelling typed on the authored question. */
  readonly authored: string;
  /** The same rewrite of the re-asked question's own answer. */
  readonly reAsked: string;
}

function casesFrom(rewrites: readonly Rewrite[]): Case[] {
  const out: Case[] = [];
  for (const lesson of BOTH_PATHS) {
    const instances = cfuInstances(lesson.cfu as LessonCfuSpec);
    const first = instances[0];
    // Index 1 and not "every computed instance": `WidgetFeedbackHost` latches after one
    // re-ask, so index 1 is the only computed question a learner is ever handed.
    const served = instances[1];
    if (first === undefined || served === undefined) {
      continue;
    }
    for (const rewrite of rewrites) {
      const authored = rewrite.of(first.accepted[0] ?? "");
      const reAsked = rewrite.of(served.accepted[0] ?? "");
      if (authored === null || reAsked === null) {
        continue;
      }
      out.push({ node: lesson.node_id, lesson, axis: rewrite.axis, authored, reAsked });
    }
  }
  return out;
}

const IDENTITY_AXIS = REWRITES[0]?.axis;
const CASES = casesFrom(REWRITES);
const REPORTED_CASES = casesFrom(REPORTED_ONLY);
const PACKS_WITH_A_REWRITE = new Set(
  CASES.filter((one) => one.axis !== IDENTITY_AXIS).map((one) => one.node),
);

/**
 * Floors on the SHAPE of the table and not only on its size.
 *
 * A floor of 23 is satisfied by 23 identity cases, which would leave this file asserting only
 * that each instance accepts its own answer -- true before the fix as well as after it. So the
 * packs contributing a rewrite BEYOND the identity are counted separately: those are the ones
 * where the two paths can disagree, and they are the whole subject. Measured at 24493680: three,
 * being TRG.3, TRG.4 and TRG.9, the tree's only two-path packs keyed to a plain fraction.
 */
const MIN_CASES = 30;
const MIN_PACKS_WITH_A_REWRITE = 3;

describe("a check's two questions agree about the same spelling", () => {
  it(`sweeps ${BOTH_PATHS.length} two-path packs over ${CASES.length} spellings`, () => {
    expect(
      BOTH_PATHS.length,
      "a pack left the two-path population, so a check somewhere is no longer swept here",
    ).toBeGreaterThanOrEqual(MIN_BOTH_PATHS);
    expect(CASES.length, "the case table shrank").toBeGreaterThanOrEqual(MIN_CASES);
    expect(
      PACKS_WITH_A_REWRITE.size,
      "no pack contributed a rewrite beyond its own canonical answer, so this file has quietly become an assertion that each instance accepts itself",
    ).toBeGreaterThanOrEqual(MIN_PACKS_WITH_A_REWRITE);
    // Per pack, so a pack that went missing cannot hide inside a healthy total.
    for (const lesson of BOTH_PATHS) {
      expect(
        CASES.filter((one) => one.node === lesson.node_id).length,
        `${lesson.node_id} contributed no spelling at all`,
      ).toBeGreaterThan(0);
    }
    const perAxis = REWRITES.map(
      (rewrite) =>
        `${rewrite.axis} x${CASES.filter((one) => one.axis === rewrite.axis).length}`,
    ).join("; ");
    console.log(
      `[cfu-parity] ${BOTH_PATHS.length} two-path packs; ${CASES.length} asserted cases ` +
        `over ${PACKS_WITH_A_REWRITE.size} packs carrying a rewrite beyond the identity ` +
        `(${[...PACKS_WITH_A_REWRITE].join(", ")}); by axis: ${perAxis}`,
    );
  });

  it.each(CASES)(
    "$node grades $axis the same on both of its questions",
    async ({ lesson, node, axis, authored, reAsked }: Case) => {
      const onAuthored = gradeAuthored(lesson, authored);
      const onReAsk = await gradeReAsked(lesson, reAsked);
      expect(
        onReAsk === "correct",
        `${node} tells a learner "${authored}" is ${onAuthored} on its first question and "${reAsked}" is ${onReAsk} on its re-ask, and each is ${axis} of its own question's answer`,
      ).toBe(onAuthored === "correct");
    },
  );

  /**
   * The three axes the family leaves out, measured and PRINTED.
   *
   * Kept as a running measurement rather than a sentence in the header, because a figure quoted
   * in a comment expires the first time anyone widens a list and nobody re-reads it. It asserts
   * nothing about the gap's SIZE. What it does assert is that the measurement ran over a
   * non-empty table and that every axis in it reached some pack, so the report cannot go quiet
   * by finding nothing to look at.
   */
  it("measures the axes the family leaves out, and reports them", () => {
    expect(
      REPORTED_CASES.length,
      "the reported axes produced no cases, so this measurement says nothing",
    ).toBeGreaterThan(0);
    for (const rewrite of REPORTED_ONLY) {
      expect(
        REPORTED_CASES.filter((one) => one.axis === rewrite.axis).length,
        `the axis "${rewrite.axis}" reached no pack, so it is being reported over nothing`,
      ).toBeGreaterThan(0);
    }
    const disagreed: string[] = [];
    for (const one of REPORTED_CASES) {
      const check = one.lesson.cfu?.check;
      if (!check) {
        continue;
      }
      // The authored side through the REAL registered checker, behind the real gate.
      const gated = check.answer_type === "numeric" && !isNumericLiteral(one.authored);
      const onAuthored =
        !gated &&
        cfuChecker({
          raw_answer: one.authored,
          item_version_id: cfuItemVersionId(one.node),
          equivalence_checker_version: CFU_CHECKER_VERSION,
        }).client_correct;
      // The re-ask side as the gate plus the computed list, which is what `cfu.tsx` does there.
      const served = cfuInstances(one.lesson.cfu as LessonCfuSpec)[1];
      const list = new Set((served?.accepted ?? []).map(normalizeAcceptedAnswer));
      const onReAsk =
        (check.answer_type !== "numeric" || isNumericLiteral(one.reAsked)) &&
        list.has(normalizeAcceptedAnswer(one.reAsked));
      if (onAuthored !== onReAsk) {
        disagreed.push(
          `${one.node} (${one.axis}): "${one.authored}" ${onAuthored ? "correct" : "incorrect"} authored, "${one.reAsked}" ${onReAsk ? "correct" : "incorrect"} re-asked`,
        );
      }
    }
    console.log(
      `[cfu-parity] axes measured and NOT asserted: ${disagreed.length} of ${REPORTED_CASES.length} cases disagree across a pack's two questions\n  ` +
        (disagreed.join("\n  ") || "(none)"),
    );
  });

  /**
   * How much of a computed list the numeric gate discards before either path grades.
   *
   * `cfu.tsx`'s numeric-literal gate runs ahead of the branch, so on a numeric check it filters
   * the computed list too and every LaTeX spelling in one is written and unreachable. Printed
   * rather than asserted, for the reason the gate's own comment gives: it is a constraint the
   * surface is entitled to and a fact worth knowing when reading a list, not a defect with a
   * fix. What IS asserted is the half that would be a defect — that the gate never empties a
   * list, and never takes the canonical spelling the reveal prints, which would leave a learner
   * shown an answer their field refuses.
   */
  it("the numeric gate narrows the computed lists without emptying one", () => {
    const perPack: string[] = [];
    let dead = 0;
    let written = 0;
    let measured = 0;
    for (const lesson of BOTH_PATHS) {
      if (lesson.cfu?.check?.answer_type !== "numeric") {
        continue;
      }
      for (const instance of cfuInstances(lesson.cfu as LessonCfuSpec)) {
        if (instance.authored) {
          continue;
        }
        measured += 1;
        const reachable = instance.accepted.filter((form) => isNumericLiteral(form));
        written += instance.accepted.length;
        dead += instance.accepted.length - reachable.length;
        expect(
          reachable.length,
          `${lesson.node_id}: the gate discards this instance's whole accepted list, so its re-ask cannot be answered at all`,
        ).toBeGreaterThan(0);
        expect(
          reachable.map(normalizeAcceptedAnswer),
          `${lesson.node_id}: the gate discards "${instance.accepted[0]}", which is the string its reveal prints and asks the learner to type`,
        ).toContain(normalizeAcceptedAnswer(instance.accepted[0] ?? ""));
        if (reachable.length < instance.accepted.length) {
          perPack.push(`${lesson.node_id} ${reachable.length}/${instance.accepted.length}`);
        }
      }
    }
    expect(
      measured,
      "no numeric computed instance was measured, so this proves nothing",
    ).toBeGreaterThan(4);
    console.log(
      `[cfu-parity] the numeric gate discards ${dead} of ${written} computed spellings over ${measured} instances; ` +
        `narrowed instances: ${perPack.join(", ") || "(none)"}`,
    );
  });
});
