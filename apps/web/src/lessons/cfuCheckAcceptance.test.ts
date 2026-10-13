/**
 * A pack that gains a `check` LEAVES the guard that covered its spellings, and the coverage
 * disappears silently at the exact moment the behaviour moves to a new code path.
 *
 * `cfuAcceptanceConvention.test.tsx` defines its population as `cfu.check === undefined`
 * (`:48-50`), which is the right predicate for what that file asserts — a closure over the
 * strings an EXACT-MATCH grader compares — and it is also why the population empties itself
 * under migration. LIN.5 is the case that made the trap visible and is now the case that
 * demonstrates it: that file was the only thing forcing LIN.5 to accept all three separators,
 * LIN.5 carries a check as of this change, and it has stopped being asked there. Nothing went
 * red. What holds those four spellings open instead is the four rows this file generates for
 * them.
 *
 * So this is the other half, and the two together are one guard per grading path: every pack
 * WITH a check owes that its authored accepted list still grades correct through the checker
 * the card now runs.
 *
 * ## Why the whole accepted list, and not the answer key alone
 *
 * Because on a checked pack the list is no longer consulted at all. `gradeCfuAnswer` reads it
 * on a COMPUTED instance (the union that keeps a re-ask no stricter than the question it
 * replaces) and skips it on the AUTHORED one, where the checker decides alone. So every
 * spelling in the list is a promise the pack makes and the checker has to keep, and a pack
 * whose list carries a spelling the checker refuses cannot be migrated without withdrawing
 * acceptance a learner has today.
 *
 * That is not hypothetical, and it is the measurement that decided which packs this migration
 * moved. Graded through the product checker at this tip, RAD.1's list loses 11 of 15 spellings
 * (`\dfrac{6\sqrt{2}}{5}`, `6√2/5`, `6sqrt2/5`), RAD.2's 6 of 9, LF.4's 26 of 31 (the whole
 * `x = 2, y = -3` family, which `comparePoint` reads as `wrong_notation`), LF.2's 7 of 17 and
 * RAT.6's 12 of 14. All five stay on exact match, and this file is what says so: it is the
 * assertion they would fail.
 *
 * ## Direction
 *
 * This file can only fail one way on its own — it asserts acceptance — so it carries the
 * complement beside it: each pack's key with its first integer bumped is a DIFFERENT answer
 * and must be refused. Without that a checker accepting everything would satisfy the sweep.
 */

import { describe, expect, it } from "vitest";

import { checkCfuThroughChecker } from "./cfuChecker";
import { allLessons } from "./domains";
import type { LessonContent } from "./types";

/**
 * Every pack with a check, derived from the registry so a newly converted pack joins with no
 * edit here — and, more to the point, so a pack cannot be migrated WITHOUT joining.
 */
const CHECKED: readonly LessonContent[] = allLessons.filter(
  (lesson) => lesson.cfu?.check !== undefined,
);

/**
 * The packs this migration moved onto the checker, named with the answer type each declares.
 *
 * A derived population plus a floor is not enough here, and `revealReAsk.test.ts` records why:
 * a floor constrains size, not shape, so 32 packs of unchanged `numeric` checks would satisfy
 * a count while measuring nothing this migration did. The composition assertion below is what
 * says the sweep genuinely reaches the types the swap opened — interval, solution_set and a
 * variable radical — and it fails in both directions, so a pack that loses its check fails and
 * a pack that changes answer type fails.
 */
const MIGRATED: Readonly<Record<string, string>> = {
  "RAD.3": "numeric",
  "RAD.4": "expression",
  "LIN.4": "interval",
  // The pack this whole file was written around. `cfuAcceptanceConvention.test.tsx` was the
  // only thing forcing LIN.5 to accept all three separators, and it stopped asking the moment
  // LIN.5 gained a check — so the four rows below (`39; 51`, `51; 39`, `39 and 51`,
  // `51 and 39`) are the coverage arriving here as it left there. It could not migrate until
  // `parseValueList` split on a depth-0 `;` and `" and "`: before that widening the product
  // checker answered `parse_error` to all four, and shipping the check block would have
  // turned four correct answers wrong.
  "LIN.5": "solution_set",
  "LIN.6": "interval",
  "FUN.2": "interval",
  "POL.3": "solution_set",
  "POL.4": "solution_set",
  "POL.5": "numeric",
  "POL.7": "numeric",
};

/**
 * The three answer types the v1 dispatch answered `unsupported_answer_type` for, which is the
 * whole reason for the swap. Asserted as reached, so this sweep cannot quietly retreat to the
 * two types that always worked.
 */
const TYPES_THE_SWAP_OPENED = ["interval", "solution_set"] as const;

/** A floor, not a pin. 23 packs carried a check before this migration; ten more joined. */
const MIN_CHECKED_PACKS = 33;

interface Row {
  readonly node: string;
  readonly lesson: LessonContent;
  readonly answer: string;
}

const ACCEPT_ROWS: Row[] = [];
for (const lesson of CHECKED) {
  const cfu = lesson.cfu;
  if (!cfu) {
    continue;
  }
  for (const answer of cfu.accepted) {
    ACCEPT_ROWS.push({ node: lesson.node_id, lesson, answer });
  }
}

/** The pack's key as a DIFFERENT answer: its first integer incremented. */
function mutated(text: string): string | null {
  const match = /\d+/.exec(text);
  if (!match) {
    return null;
  }
  const bumped = String(Number(match[0]) + 1);
  return text.slice(0, match.index) + bumped + text.slice(match.index + match[0].length);
}

const REJECT_ROWS: Row[] = [];
for (const lesson of CHECKED) {
  const key = lesson.cfu?.check?.answer_key;
  const wrong = key === undefined ? null : mutated(key);
  if (wrong === null || wrong === key) {
    continue;
  }
  REJECT_ROWS.push({ node: lesson.node_id, lesson, answer: wrong });
}

const MIN_REJECT_ROWS = 25;

function grade(row: Row): { correct: boolean; why: string } {
  const cfu = row.lesson.cfu;
  if (!cfu) {
    throw new Error(`${row.node} has no CFU`);
  }
  const result = checkCfuThroughChecker({
    nodeId: row.node,
    cfu,
    index: 0,
    value: row.answer,
  });
  if (result === null) {
    throw new Error(`${row.node} has a check but the checker declined to grade it`);
  }
  return {
    correct: result.client_correct,
    why: `${result.status} / ${result.reason_code}`,
  };
}

describe("every checked CFU's own accepted spellings survive on the checker path", () => {
  it(`sweeps ${CHECKED.length} checked packs over ${ACCEPT_ROWS.length} spellings`, () => {
    expect(CHECKED.length, "a pack lost its check").toBeGreaterThanOrEqual(
      MIN_CHECKED_PACKS,
    );
    expect(
      REJECT_ROWS.length,
      "the reject table shrank, so this file can only fail in one direction again",
    ).toBeGreaterThanOrEqual(MIN_REJECT_ROWS);
    // The composition, in both directions: every migrated pack still declares the type it was
    // migrated to, and every one of them is still in the population.
    for (const [node, answerType] of Object.entries(MIGRATED)) {
      const lesson = CHECKED.find((one) => one.node_id === node);
      expect(
        lesson,
        `${node} was migrated onto the checker and no longer carries a check`,
      ).toBeDefined();
      expect(
        lesson?.cfu?.check?.answer_type,
        `${node} was migrated as ${answerType} and now declares something else, so this sweep is measuring a different question`,
      ).toBe(answerType);
    }
    const reachedTypes = new Set(
      CHECKED.map((lesson) => lesson.cfu?.check?.answer_type ?? ""),
    );
    for (const opened of TYPES_THE_SWAP_OPENED) {
      expect(
        reachedTypes.has(opened),
        `no pack declares ${opened}, so this sweep has retreated to the answer types the D1 checker already graded and proves nothing about the swap`,
      ).toBe(true);
    }
    for (const lesson of CHECKED) {
      expect(
        ACCEPT_ROWS.filter((row) => row.node === lesson.node_id).length,
        `${lesson.node_id} contributed no spelling`,
      ).toBeGreaterThan(0);
    }
  });

  it.each(ACCEPT_ROWS)("$node still accepts $answer", (row: Row) => {
    const { correct, why } = grade(row);
    expect(
      correct,
      `${row.node} lists "${row.answer}" as a correct answer and the checker its check now routes to grades it ${why}. On the authored question the accepted list is not consulted, so this spelling has been withdrawn from the learner.`,
    ).toBe(true);
  });

  it.each(REJECT_ROWS)("$node still refuses $answer", (row: Row) => {
    const { correct, why } = grade(row);
    expect(
      correct,
      `${row.node} accepts "${row.answer}", which is its own answer with a digit changed and so a different answer (${why})`,
    ).toBe(false);
  });
});
