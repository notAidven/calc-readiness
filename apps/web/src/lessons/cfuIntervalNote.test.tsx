/**
 * A learner who solved an interval inequality correctly and chose the wrong bracket is now
 * told which bracket to change, and used to be told only "Not quite".
 *
 * This is the case the whole CFU migration was for. `wrong_bound_inclusivity` is the one
 * interval verdict that says the SOLVING was right — the endpoints match and only the
 * inclusivity does not — and the comparator is careful to report it separately from a plain
 * value miss precisely so the surface can say so. The CFU card could not: with no `check`
 * block the pack graded by exact string match against a list, which returns a boolean and no
 * reason at all, so the one thing the card knew was that the string was not in the list.
 *
 * The asymmetry that made this worth fixing is that the PRACTICE twin of these same nodes has
 * shown {@link BOUND_INCLUSIVITY_NOTE} all along, because a practice item carries a real
 * `AnswerSpec` and routes through the comparator. Same node, same mistake, same product, two
 * different amounts of help — and the CFU is the surface a learner meets FIRST.
 *
 * ## Both directions are asserted, and the control is the point
 *
 * "The note appears now" on its own is not evidence that anything changed; the note could
 * have been reachable all along and this file would look identical. So each case is run twice
 * over the SAME pack and the SAME answer: once as it ships, and once through a clone of the
 * pack with its `check` deleted, which is byte-for-byte the grading every one of these packs
 * had before this change. The clone is the "before" column, and it is a real measurement
 * rather than a remembered one.
 *
 * The wrong answer is derived from each pack's own key by flipping one bracket, so a pack
 * whose key changes brings its own case with it rather than being asserted against a string
 * typed here.
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BOUND_INCLUSIVITY_NOTE, EXACT_FORM_NOTE, GENERIC_MISS_NOTE } from "./answerFormat";
import { LessonCfu } from "./cfu";
import { allLessons } from "./domains";
import type { LessonCfuSpec, LessonContent } from "./types";

/** The card's own fallback sentence for a wrong answer it has nothing to say about. */
const CFU_GENERIC_MISS = "Not quite. Try again, or reveal the hint.";

/**
 * The lines the "before" column is allowed to be: generic in the sense this control needs,
 * which is that neither of them names a bracket.
 *
 * Removing a pack's `check` leaves it graded by its accepted list alone, and on 2026-08-08 that
 * path stopped answering with `note: null`: {@link EXACT_FORM_NOTE} now covers it wherever the
 * answer field advertises a notation to point at, which for an interval pack it always does. So
 * all three controls answer with that rather than with the card's fallback, and pinning the
 * fallback alone made this file fail over a change to a sentence it is not measuring.
 *
 * Both are still listed rather than the assertion being dropped, because the column has to be a
 * generic miss for the comparison above it to mean anything — a control that started naming the
 * bracket would make the "after" column prove nothing.
 */
const GENERIC_MISSES: readonly string[] = [CFU_GENERIC_MISS, EXACT_FORM_NOTE];

/**
 * Every pack whose check declares an interval, derived rather than listed: an interval CFU
 * that does not offer this note is the defect, so a pack joining the type joins the sweep.
 */
const INTERVAL_PACKS: readonly LessonContent[] = allLessons.filter(
  (lesson) => lesson.cfu?.check?.answer_type === "interval",
);

/**
 * The three packs that own this behaviour, named beside the derived population so the sweep
 * cannot pass by finding nothing. A floor would allow the composition to drift; naming them
 * fails in both directions, since a pack that stops declaring `interval` drops out of the
 * derived set and fails, and the floor below fails if the set shrinks any other way.
 */
const OWED = ["FUN.2", "LIN.4", "LIN.6"] as const;

/** The same interval with its last bracket flipped: the right set, written wrong. */
function flipLastBracket(key: string): string {
  const trimmed = key.trim();
  const last = trimmed.at(-1);
  if (last === ")") {
    return `${trimmed.slice(0, -1)}]`;
  }
  if (last === "]") {
    return `${trimmed.slice(0, -1)})`;
  }
  throw new Error(`${key} does not end in an interval bracket`);
}

/** Grade one answer on the real card and return the sentence the learner is shown. */
function feedbackFor(nodeId: string, cfu: LessonCfuSpec, answer: string): string {
  const { container, unmount } = render(
    <LessonCfu cfu={cfu} nodeId={nodeId} onResult={() => {}} />,
  );
  try {
    const field = container.querySelector('input[type="text"]');
    const form = container.querySelector("form");
    if (!(field instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) {
      throw new Error(`${nodeId}: the card rendered no answer field`);
    }
    fireEvent.change(field, { target: { value: answer } });
    fireEvent.submit(form);
    const feedback = container.querySelector(".lesson-player__feedback");
    return (feedback ?? container).textContent ?? "";
  } finally {
    unmount();
  }
}

/** The same pack with its `check` removed: the grading it had before this migration. */
function withoutCheck(cfu: LessonCfuSpec): LessonCfuSpec {
  const { check: _dropped, ...rest } = cfu;
  return rest;
}

const CASES = INTERVAL_PACKS.map((lesson) => {
  const cfu = lesson.cfu as LessonCfuSpec;
  const key = cfu.check?.answer_key as string;
  return { node: lesson.node_id, cfu, key, wrong: flipLastBracket(key) };
});

describe("a right interval with the wrong bracket is told which bracket", () => {
  it(`sweeps ${CASES.length} interval CFUs`, () => {
    expect(
      INTERVAL_PACKS.map((lesson) => lesson.node_id).sort(),
      "the interval CFU population changed; a pack that stops declaring an interval stops being asked for this note, and a new one must be asked",
    ).toEqual([...OWED].sort());
  });

  it.each(CASES)(
    "$node names the bracket on $wrong, where before it said nothing",
    ({ node, cfu, key, wrong }) => {
      const after = feedbackFor(node, cfu, wrong);
      expect(
        after,
        `${node}: "${wrong}" has the right endpoints as "${key}" and the wrong inclusivity, and the card said "${after}"`,
      ).toContain(BOUND_INCLUSIVITY_NOTE);

      // The control. Same pack, same answer, grading as it was before the check landed.
      const before = feedbackFor(node, withoutCheck(cfu), wrong);
      expect(
        before,
        `${node}: without a check the card named the bracket anyway, so this file is not measuring the migration`,
      ).not.toContain(BOUND_INCLUSIVITY_NOTE);
      expect(
        GENERIC_MISSES.filter((line) => before.includes(line)),
        `${node}: without a check the card said "${before}", which is none of the generic misses, so the "before" column is not what shipped`,
      ).not.toEqual([]);
    },
  );

  /**
   * The other direction: a genuinely wrong SET must not be told its brackets are the problem.
   * Without this the note could be shown on every miss and every case above would still pass.
   */
  it.each(CASES)(
    "$node does not blame the bracket for a wrong set",
    ({ node, cfu, key }) => {
      const different = key.replace(/\d+/, (digits) => String(Number(digits) + 1));
      expect(
        different,
        `${node}: its key "${key}" holds no number to change, so this case measures nothing`,
      ).not.toBe(key);
      const said = feedbackFor(node, cfu, different);
      expect(
        said,
        `${node}: "${different}" is a different set from "${key}" and the card blamed the brackets`,
      ).not.toContain(BOUND_INCLUSIVITY_NOTE);
      expect(said).not.toContain(GENERIC_MISS_NOTE);
    },
  );
});
