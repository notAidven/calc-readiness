/**
 * A CFU whose answer is ONE term, graded over the ways a learner writes that term's
 * coefficient.
 *
 * The defect this was written for: POL.6 asks for the leading term of
 * `-5(2x - 3)(x + 1)^3` and its own worked solution multiplies the coefficients as
 * "$\left(-5\right) \times 2 = -10$" — a bracketed negative, which is how a negative factor
 * is written before it is multiplied. A learner who carries that bracket into the answer
 * field types `(-10)x^4`, and the pack graded on an accepted list of two strings, so the
 * answer its own reveal is about to print came back wrong with no note under it. The re-ask
 * had the mirror of it: its key is positive, and the `+` a learner writes to record the sign
 * they just worked out (`+20x^3`) was refused the same way.
 *
 * ## The population, and why it is not "POL.6"
 *
 * The behaviour is "this pack's answer is a single signed term, so the coefficient has a
 * sign and a learner may bracket it". That is a property of the ANSWER, so the population is
 * derived from the canonical spelling every pack publishes (`accepted[0]`, which is the
 * string the reveal prints) rather than from a node id or a domain. Floored, so a pack
 * leaving the shape cannot quietly empty the sweep, and POL.6 named inside the floor because
 * it is the instance the defect was measured on and a floor constrains size, not shape.
 *
 * Every INSTANCE is swept, not only the authored one. The two asks reached two different
 * graders before this change and the re-ask was the one a learner meets after being told
 * they were wrong, so a sweep of the authored question alone would have measured the less
 * important half.
 *
 * ## The other direction, which is the one that keeps the question worth asking
 *
 * "Give the leading term" is a question a form-indifferent grader can ruin: hand it the whole
 * function and a grader comparing values would take it. It cannot here, because the leading
 * term is not equal to the polynomial it leads — but that is an argument, and this file is
 * where it stops being one. The rejected string is EXTRACTED from the pack's own prompt, so
 * it is the polynomial the learner is actually looking at, and a pack that starts accepting
 * the question back as its answer fails here.
 */

import { describe, expect, it } from "vitest";

import { gradeCfuAnswer } from "./cfuChecker";
import { cfuInstances } from "./cfuVariants";
import { allLessons } from "./domains";
import type { LessonContent } from "./types";

/** A coefficient and one power of one variable, which is what "one term" comes to here. */
const MONOMIAL = /^([+-]?)(\d*)(x\^\d+)$/;

const MONOMIAL_CFUS: readonly LessonContent[] = allLessons.filter((lesson) =>
  MONOMIAL.test(lesson.cfu?.accepted[0] ?? ""),
);

/**
 * A floor, not a pin: a further pack answering with one term joins with no edit here. One,
 * because one is what the tree holds, and the composition assertion beside it is what stops
 * that one being any pack at all.
 */
const MIN_MONOMIAL_CFUS = 1;

/** Every way of writing `key`'s coefficient that leaves the term the same term. */
function coefficientSpellings(key: string): readonly string[] {
  const match = MONOMIAL.exec(key);
  if (!match) {
    return [];
  }
  const [, sign, size, body] = match;
  // A negative coefficient carries its sign; a positive one may carry an explicit `+`,
  // which is what a learner writes down when the sign is the thing they just derived.
  const numerals = sign === "-" ? [`-${size}`] : [`${size}`, `+${size}`];
  const heads = numerals.flatMap((numeral) => [numeral, `(${numeral})`]);
  return [...new Set(heads.flatMap((head) => [`${head}${body}`, `${head}*${body}`]))];
}

interface Row {
  readonly node: string;
  readonly lesson: LessonContent;
  readonly index: number;
  readonly key: string;
  readonly answer: string;
}

const ACCEPT_ROWS: Row[] = [];
for (const lesson of MONOMIAL_CFUS) {
  const cfu = lesson.cfu;
  if (!cfu) {
    continue;
  }
  cfuInstances(cfu).forEach((instance, index) => {
    for (const answer of coefficientSpellings(instance.answerKey)) {
      ACCEPT_ROWS.push({
        node: lesson.node_id,
        lesson,
        index,
        key: instance.answerKey,
        answer,
      });
    }
  });
}

/** The same term with its coefficient's magnitude changed, which is a different term. */
function mutated(key: string): string | null {
  const match = /\d+/.exec(key);
  if (!match) {
    return null;
  }
  return (
    key.slice(0, match.index) +
    String(Number(match[0]) + 1) +
    key.slice(match.index + match[0].length)
  );
}

/**
 * The polynomial the prompt hands the learner, read off the prompt rather than typed: the
 * `$f(x) = ...$` span with LaTeX's braces and backslashes taken out, which is what the
 * learner sees and could copy into the field.
 */
function functionInPrompt(prompt: string): string | null {
  const match = /\$f\(x\) = ([^$]+)\$/.exec(prompt);
  if (!match) {
    return null;
  }
  return (match[1] as string).replaceAll(/[{}\\]/g, "").trim();
}

const REJECT_ROWS: Row[] = [];
for (const lesson of MONOMIAL_CFUS) {
  const cfu = lesson.cfu;
  if (!cfu) {
    continue;
  }
  const wrong = mutated(cfu.accepted[0] ?? "");
  if (wrong !== null && wrong !== cfu.accepted[0]) {
    REJECT_ROWS.push({
      node: lesson.node_id,
      lesson,
      index: 0,
      key: cfu.accepted[0] as string,
      answer: wrong,
    });
  }
  const asked = functionInPrompt(cfu.prompt);
  if (asked !== null && asked !== cfu.accepted[0]) {
    REJECT_ROWS.push({
      node: lesson.node_id,
      lesson,
      index: 0,
      key: cfu.accepted[0] as string,
      answer: asked,
    });
  }
}

/**
 * Two per pack: a different term, and the question handed back as its own answer. Floored so
 * a prompt that stops naming its function, or a key with no digit in it, cannot leave this
 * file able to fail in one direction only.
 */
const MIN_REJECT_ROWS = 2;

function grades(row: Row): boolean {
  const cfu = row.lesson.cfu;
  if (!cfu) {
    throw new Error(`${row.node} has no CFU`);
  }
  return gradeCfuAnswer({
    nodeId: row.node,
    cfu,
    index: row.index,
    value: row.answer,
  }).correct;
}

describe("a one-term CFU answer is graded on the term, not on how its coefficient is written", () => {
  it(`sweeps ${MONOMIAL_CFUS.length} pack(s) over ${ACCEPT_ROWS.length} spellings`, () => {
    expect(
      MONOMIAL_CFUS.length,
      "no CFU answers with a single term any more, so this sweep measures nothing",
    ).toBeGreaterThanOrEqual(MIN_MONOMIAL_CFUS);
    // The composition, because a floor of one is satisfied by any one pack: the instance the
    // defect was measured on has to still be in the population.
    expect(
      MONOMIAL_CFUS.map((lesson) => lesson.node_id),
      "POL.6 is the pack this sweep was measured on and its answer is no longer one term",
    ).toContain("POL.6");
    expect(
      REJECT_ROWS.length,
      "the reject table shrank, so this file can only fail in one direction",
    ).toBeGreaterThanOrEqual(MIN_REJECT_ROWS);
    // Per pack and per instance, so a re-ask that stopped resolving could not hide inside a
    // healthy total.
    for (const lesson of MONOMIAL_CFUS) {
      const cfu = lesson.cfu;
      if (!cfu) {
        continue;
      }
      const instances = cfuInstances(cfu).length;
      for (let index = 0; index < instances; index += 1) {
        expect(
          ACCEPT_ROWS.filter((row) => row.node === lesson.node_id && row.index === index)
            .length,
          `${lesson.node_id} instance ${index} contributed no spelling`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it.each(ACCEPT_ROWS)("$node instance $index accepts $answer", (row: Row) => {
    expect(
      grades(row),
      `${row.node} instance ${row.index} is keyed "${row.key}" and refuses "${row.answer}", which is the same term with its coefficient written another way`,
    ).toBe(true);
  });

  it.each(REJECT_ROWS)("$node still refuses $answer", (row: Row) => {
    expect(
      grades(row),
      `${row.node} is keyed "${row.key}" and accepts "${row.answer}"`,
    ).toBe(false);
  });
});
