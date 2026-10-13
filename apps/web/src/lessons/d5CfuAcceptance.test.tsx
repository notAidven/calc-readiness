/**
 * D5 CFU acceptance: every widened spelling grades correct through the real card, and every
 * named misconception still rejects.
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { type CfuOutcome, LessonCfu } from "./cfu";
import { d5LessonByNode } from "./d5";
import type { LessonContent } from "./types";

function grade(lesson: LessonContent, answer: string): boolean {
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
    const form = container.querySelector("form");
    if (!(field instanceof HTMLInputElement) || !(form instanceof HTMLFormElement)) {
      throw new Error(`${lesson.node_id}: the card rendered no field or no form`);
    }
    fireEvent.change(field, { target: { value: answer } });
    fireEvent.submit(form);
    if (results.length !== 1) {
      throw new Error(`${lesson.node_id}: ${results.length} verdicts for ${answer}`);
    }
    const outcome = results[0] as CfuOutcome;
    // No reveal is taken here, so `recalled` would mean the card believes it had already
    // printed this answer. That is a defect, not a pass.
    if (outcome === "recalled") {
      throw new Error(`${lesson.node_id}: called ${answer} recalled with no reveal taken`);
    }
    const verdict = outcome === "correct";
    const said = (container.textContent ?? "").includes("Correct! Nice work.");
    if (said !== verdict) {
      throw new Error(
        `${lesson.node_id}: reported ${outcome}, showed ${said}, on ${answer}`,
      );
    }
    return verdict;
  } finally {
    unmount();
  }
}

const NODES = ["RAT.1", "RAT.2", "RAT.3", "RAT.4", "RAT.5", "RAT.6"] as const;

const pack = (node: string): LessonContent => {
  const lesson = d5LessonByNode[node];
  if (!lesson) {
    throw new Error(`no D5 pack for ${node}`);
  }
  return lesson;
};

/**
 * Answers a learner holding a specific misconception produces. Every one is either
 * mathematically wrong or answers a different question than the prompt asked, so every one
 * must be rejected however wide the accepted list gets. The two marked SWARM are recovered
 * verbatim from `docs/qa-cfu-swarm-d5-d7.md`; the one marked P3 is a rejection an earlier
 * round listed as defensible and that this round deliberately did not widen for.
 *
 * RAT.2's two ordering rejections used to be pinned here, on the ground that "the prompt
 * demands increasing order". They are gone because the pack never enforced that: it took four
 * of the six orderings, so the rule was pinning the two that had been missed rather than a
 * ruling. `cfuAcceptedForms.ts` states the shipped ruling on the same question — excluded
 * values are a set, the prompt's "smallest first" is about how to READ the answer — and
 * "RAT.2 takes every ordering" below now holds the pack to it in the other direction.
 */
const MISCONCEPTIONS: Record<string, readonly string[]> = {
  "RAT.1": [
    "(x+8)/(x+5), x = -5", // SWARM: exclusions read off the SIMPLIFIED denominator
    "(x + 8)/(x + 5), x = -5", // the same, spaced as the pack spaces it
    "(x + 8)/(x + 5)", // no exclusions at all
    "(x + 8)/(x + 5), x = 8", // only the cancelled factor's value
    "(x + 8)/(x + 5), x = 8, x = 5", // sign slip on the surviving factor
    "(x - 8)/(x + 5), x = 8, x = -5", // wrong factor kept from the difference of squares
    "(x + 8)/(x - 5), x = 8, x = -5",
    "(x^2 - 64)/(x^2 - 3x - 40), x = 8, x = -5", // never simplified
    "1/(x + 5), x = 8, x = -5", // cancelled a term out of the numerator
    "(x + 8)/(x + 5) and x = -5", // the leak the "and" widening could have opened
    "(x + 8)/(x + 5); x = -5",
  ],
  "RAT.2": [
    "(x + 7)/(x + 4); x = -6, -4", // the flipped divisor's numerator never excluded
    "(x + 7)/(x + 4); x = -4, 7",
    "(x + 7)/(x + 4)",
    "(x + 7)/(x + 4); x = -6, -4, -7", // sign slip on the flipped exclusion
    "(x - 7)/(x + 4); x = -6, -4, 7",
    "(x + 7)/(x + 6); x = -6, -4, 7",
    "(x + 7)/(x + 4); x = -6, -4, 7, 6", // excluded the divisor's own denominator zero too
    "(x + 7)/(x + 4); x = 6, 4, -7", // every sign flipped: the factors read off as the zeros
    // WITHDRAWN, not widened for. Two entries stood here claiming `x = 7, -4, -6` is a
    // misconception because the prompt says "smallest first". The pack disagrees with that in
    // its own hand-typed list: RAT.2.json:67 accepts `(x + 7)/(x + 4); x = 7, -6, -4`, which is
    // not smallest first either, and :65 and :66 are two more permutations. So order was never a
    // rule this CFU enforced, and an answer naming the right expression and the right three
    // excluded values holds no misconception to catch. Measured over all six permutations
    // through the real card at this tree: all six ACCEPTED, four of them already in the pack.
    // What changed this round is only that the authored ask stopped being stricter than its own
    // retry; the two entries were mis-stated before that and merely unfalsifiable.
    //
    // The withdrawal takes nothing off the sign-flipped entry above it, and the two are worth
    // keeping apart because they look adjacent: this round's `cfuChecker.ts` change re-spells
    // the AUTHORED ask with the speller the re-ask already used, so it widens what counts as
    // the same SET of excluded values and touches nothing about which values they are. That
    // entry names different values, so it is a different answer and not another ordering of
    // this one. Measured on the merged tree rather than reasoned about: the sweep below runs
    // green over 57 misconception answers with it in place, so it is still REJECTED after the
    // widening. And the slot was shown to be live rather than decorative, since a green sweep
    // over a list proves nothing about a member the loop never reaches: putting the CORRECT
    // answer `(x + 7)/(x + 4); x = -6, -4, 7` at this exact index reds the sweep at *"RAT.2:
    // \"(x + 7)/(x + 4); x = -6, -4, 7\" was ACCEPTED"*.
  ],
  "RAT.3": [
    "(x+11)/((x-1)(x+4)); x = -4, 1", // minus sign reached only the first term
    "(x-14)/((x-1)(x+4)); x = -4, 1",
    "(5)/((x-1)(x+4)); x = -4, 1", // numerators added without rewriting over the LCD
    "1/((x-1)(x+4)); x = -4, 1",
    "(x+14)/((x-1)(x+4)); x = 4, -1", // exclusions read as the factors' own signs
    "(x+14)/((x-1)(x+4)); x = -4", // one exclusion
    "(x+14)/((x-1)(x+4))",
    "\\frac{x+14}{(x-1)(x+4)}; x = 4, -1", // the newly accepted LaTeX shape, wrong values
  ],
  "RAT.4": [
    "5/(4x); x = 0", // the whole denominator fraction's zero never excluded
    "5/(4x); x = -4",
    "5/(4x)",
    "5/(4x); x = 4, 0", // sign slip
    "(x + 4)/(4x); x = -4, 0",
    "5x/4; x = -4, 0",
    "20/(x(x + 4)); x = -4, 0", // flipped the wrong fraction
    "5/(4x); x = -4, 0, 4",
    "\\frac{5}{4x}; x = 0", // the accepted LaTeX shape, one exclusion short
  ],
  "RAT.5": [
    "(1, 5); x = 4; y = 3", // hole and vertical asymptote swapped
    "(4, 5); x = 4; y = 3",
    "(4, 5); x = 1; y = 0", // horizontal asymptote read as y = 0
    "(4, 5); x = 1; y = 1/3", // leading coefficients inverted
    "(4, 15); x = 1; y = 3", // y read off the unsimplified function
    "(4, 5); x = 1", // a part missing
    "(3, 5); x = 1; y = 3",
    "hole (1, 5); vertical asymptote x = 4; horizontal asymptote y = 3", // the labelled leak
    "(x, y) = (1, 5); x = 4; y = 3",
    "(4, 5) and x = 4 and y = 3",
    "(4.0, 5.0); x = 4.0; y = 3.0",
  ],
  "RAT.6": [
    "{2, 3}", // SWARM: solved correctly, extraneous root never rejected
    "{3, 2}",
    "{2}",
    "2",
    "{-3}",
    "{0, 3}",
    "{}",
    "three", // P3: a spelled-out numeral
    "{3} (x = 3 is extraneous)", // the newly accepted rejection note, naming the wrong root
    "3 (2 is in the solution set)",
  ],
};

/**
 * The nine spellings `cfuAcceptanceConvention.test.tsx` named as REJECTED on the D5 packs
 * before this round, quoted from that run's own failure messages. Checked here by name so
 * the evidence does not depend on that file, which a sibling worker is editing.
 */
const PREVIOUSLY_REJECTED: readonly (readonly [string, string])[] = [
  ["RAT.1", "(x + 8)/(x + 5); x = 8; x = -5"],
  ["RAT.1", "(x + 8)/(x + 5) and x = 8 and x = -5"],
  ["RAT.2", "(x + 7)/(x + 4); x = -6; -4; 7"],
  ["RAT.2", "(x + 7)/(x + 4) and x = -6 and -4 and 7"],
  ["RAT.3", "(x+14)/((x-1)(x+4)); x = -4; 1"],
  ["RAT.3", "(x+14)/((x-1)(x+4)) and x = -4 and 1"],
  ["RAT.4", "5/(4x); x = -4; 0"],
  ["RAT.4", "5/(4x) and x = -4 and 0"],
  ["RAT.5", "(4, 5) and x = 1 and y = 3"],
];

/** The swarm's own D5 items, quoted from `docs/qa-cfu-swarm-d5-d7.md`, by item number. */
const SWARM_ITEMS: readonly (readonly [string, string, string])[] = [
  ["P1 #2 \\frac", "RAT.3", "\\frac{x+14}{(x-1)(x+4)}; x = -4, 1"],
  ["P1 #2 \\dfrac", "RAT.3", "\\dfrac{x+14}{(x-1)(x+4)}; x=-4,1"],
  ["P1 #3", "RAT.6", "3 only"],
  ["P1 #5 RAT.1 semicolon", "RAT.1", "(x + 8)/(x + 5); x = 8; x = -5"],
  ["P1 #5 RAT.3 and", "RAT.3", "(x+14)/((x-1)(x+4)) and x = -4 and 1"],
  ["P1 #5 RAT.4 both", "RAT.4", "5/(4x); x = -4; 0"],
  ["P2 #6 RAT.2", "RAT.2", "(x + 7)/(x + 4) and x = -6 and -4 and 7"],
  ["P2 #6 RAT.4", "RAT.4", "5/(4x) and x = -4 and 0"],
  ["P2 #6 RAT.5", "RAT.5", "(4, 5) and x = 1 and y = 3"],
  ["P2 #7", "RAT.5", "hole (4, 5); vertical asymptote x = 1; horizontal asymptote y = 3"],
  ["P2 #8", "RAT.5", "(x, y) = (4, 5); x = 1; y = 3"],
  ["P2 #9", "RAT.5", "(4, 5); x = 1; y = 3.0"],
  ["P2 #10", "RAT.6", "{3} (x = 2 is extraneous)"],
];

describe("D5 CFU acceptance, both directions, at the widened tree", () => {
  it.each(PREVIOUSLY_REJECTED)("%s now accepts %s", (node, answer) => {
    expect(grade(pack(node), answer), `${node} still rejects ${answer}`).toBe(true);
  });

  it.each(SWARM_ITEMS)("swarm %s: %s accepts %s", (_item, node, answer) => {
    expect(grade(pack(node), answer), `${node} still rejects ${answer}`).toBe(true);
  });

  it("grades every accepted entry as correct", () => {
    const rejected: string[] = [];
    let checked = 0;
    for (const node of NODES) {
      const lesson = pack(node);
      for (const entry of lesson.cfu?.accepted ?? []) {
        checked += 1;
        if (!grade(lesson, entry)) {
          rejected.push(`${node}: ${JSON.stringify(entry)}`);
        }
      }
    }
    // A floor, so an empty list cannot read as a pass.
    expect(checked, "no accepted entry was graded").toBeGreaterThan(300);
    console.log(`[d5-accept] ${checked} accepted entries graded through the real card`);
    expect(rejected.join("\n")).toBe("");
  }, 120_000);

  /**
   * The exclusions RAT.2 asks for are a set, and `cfuAcceptedForms.ts`'s `withExclusions`
   * enumerates every ordering for that reason. RAT.2's authored list took four of the six, so
   * two learners who both ignored "smallest first" got opposite verdicts on the same correct
   * mathematics. This asserts the whole set, which is the shape a floor could not catch: three
   * of the four spellings of a missing ordering would still leave the count healthy.
   */
  it("RAT.2 takes every ordering of the three excluded values", () => {
    const orderings = [
      [-6, -4, 7],
      [-6, 7, -4],
      [-4, -6, 7],
      [-4, 7, -6],
      [7, -6, -4],
      [7, -4, -6],
    ];
    const missing: string[] = [];
    for (const order of orderings) {
      for (const spelling of [
        `(x + 7)/(x + 4); x = ${order.join(", ")}`,
        `(x + 7)/(x + 4), x = ${order.join(", ")}`,
        `(x + 7)/(x + 4); x = ${order.join("; ")}`,
        `(x + 7)/(x + 4) and x = ${order.join(" and ")}`,
      ]) {
        if (!grade(pack("RAT.2"), spelling)) {
          missing.push(spelling);
        }
      }
    }
    expect(orderings.length, "not every ordering was tried").toBe(6);
    expect(missing.join("\n")).toBe("");
  }, 60_000);

  it("still rejects every misconception answer", () => {
    const leaked: string[] = [];
    let checked = 0;
    for (const node of NODES) {
      const lesson = pack(node);
      const cases = MISCONCEPTIONS[node] ?? [];
      expect(cases.length, `${node} has no misconception cases`).toBeGreaterThan(5);
      for (const wrong of cases) {
        checked += 1;
        if (grade(lesson, wrong)) {
          leaked.push(`${node}: ${JSON.stringify(wrong)} was ACCEPTED`);
        }
      }
    }
    expect(checked, "no misconception answer was graded").toBeGreaterThan(50);
    console.log(
      `[d5-reject] ${checked} misconception answers graded through the real card`,
    );
    expect(leaked.join("\n")).toBe("");
  });

  /**
   * The ground the two withdrawn RAT.2 entries rested on, kept somewhere it can fail.
   *
   * Withdrawing a case from `MISCONCEPTIONS` narrows what that sweep proves, so the reason has
   * to be assertable rather than argued in a comment nobody re-measures. The reason is that this
   * CFU grades its excluded values as a SET: its prompt says "smallest first", and its own
   * hand-typed `accepted` list then contradicts that three times over. Both halves are asserted,
   * so a later decision that order DOES matter fails here and names the pack that has to change
   * with it, instead of silently re-opening a hole in the misconception sweep.
   */
  it("RAT.2 grades its excluded values as a set, which is why order alone is not a misconception", () => {
    const lesson = pack("RAT.2");
    const authored = lesson.cfu?.accepted ?? [];
    const spell = (order: readonly number[]) => `(x + 7)/(x + 4); x = ${order.join(", ")}`;
    const permutations: readonly (readonly number[])[] = [
      [-6, -4, 7],
      [-6, 7, -4],
      [-4, -6, 7],
      [-4, 7, -6],
      [7, -6, -4],
      [7, -4, -6],
    ];

    // Half one: the pack itself accepts an order that is not smallest-first, so the rule the
    // withdrawn entries invoked is one this CFU never kept.
    const smallestFirst = (order: readonly number[]) =>
      order.every((value, i) => i === 0 || (order[i - 1] as number) < value);
    const outOfOrderInPack = permutations
      .filter((order) => !smallestFirst(order))
      .map(spell)
      .filter((form) => authored.includes(form));
    expect(
      outOfOrderInPack.length,
      "the pack no longer hand-lists any out-of-order spelling, so 'smallest first' may now be a real rule and the two withdrawn RAT.2 misconceptions have to come back",
    ).toBeGreaterThanOrEqual(3);

    // Half two: and the grader agrees with the pack across every permutation, so no single
    // ordering is singled out as wrong.
    const rejected = permutations.map(spell).filter((form) => !grade(lesson, form));
    expect(
      rejected.join("\n"),
      "RAT.2 now rejects some ordering of the correct excluded values",
    ).toBe("");
  });
});
