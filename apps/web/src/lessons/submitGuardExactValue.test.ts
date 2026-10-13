/**
 * An item may not refuse the notation its own prompt instructs.
 *
 * `d9.trg3.exact-value-circle.l3` tells the learner, in the prompt, to "Write any square root
 * as `sqrt(...)`". On a draw whose exact value happens to be a plain fraction the key is `-1/2`,
 * `requiresNumericLiteral` reads THAT KEY, arms, and the surface refuses `-sqrt(3)/2` with
 * `NUMERIC_LITERAL_NOTE` before the grader is called. Nothing is scored — not `incorrect`, not
 * `invalid_input`, no attempt recorded — so the archetypal unit-circle miss (right magnitude,
 * wrong reference angle) is silently discarded, and the learner is told to enter a single
 * number by an item that just told them to write a root.
 *
 * This is the RAD.1 class in `submitGuards.ts`'s own docstring INVERTED. There the guard
 * refused the item's own key, so keying the gate off the key fixed it. Here the key is fine and
 * the INSTRUCTED notation is refused, which is why the key cannot be the whole test: the key is
 * a fact about the DRAW, and what the guard needs to know is what the ITEM ASKS FOR. Every
 * key-only sweep is blind to it by construction, because a key is never one of these shapes.
 *
 * ## Why the prompt is the signal, measured rather than argued
 *
 * The obvious spec-level move — disarm wherever the item declares `representation: "exact"` —
 * is too wide. 61 served items are `exact` AND armed, and 56 of them are TRG.4 / TRG.9 /
 * TRG.2 items whose prompts say "Enter it as a fraction" and whose answer space contains no
 * radical at all: swept over 40 fresh draws of all 159 numeric practice templates in the bank,
 * exactly TWO produce both a numeric-literal key and a radical key
 * (`d9.trg2.special-exact.l2` and `d9.trg3.exact-value-circle.l3`), and on both, 100% of the
 * arming draws instruct `sqrt(...)`. So on those 56 the gate cannot be refusing a notation the
 * item asks for, and disarming them would only let an arithmetic expression through on an item
 * that asked for a computed fraction.
 *
 * The behaviour that makes the defect possible is the item INVITING a notation the gate
 * refuses, and an item invites it by saying so in its prompt. Hence the two conjuncts in
 * {@link invitesRadicalNotation}, both load-bearing and both injected against below:
 *
 *  - the prompt instructs the ASCII `sqrt(...)` spelling — which no prompt in the bank uses for
 *    anything else, since rendered math is LaTeX `\sqrt{}`;
 *  - and the item declares `representation: "exact"` — without which the 26 armed
 *    `d2.rad1.eval.l1` / `d2.rad4.realroot.l2` items, whose prompts PRINT a radical and ask for
 *    its value, would disarm the moment one of them was reworded in ASCII.
 */

import { describe, expect, it } from "vitest";

import { isNumericLiteral, NUMERIC_LITERAL_NOTE } from "./answerFormat";
import { checkerVersionForItem, practiceChecker } from "./practiceChecker";
import { SERVED_PRACTICE_ITEMS, submitThroughPracticeSurface } from "./submitPathHarness";
import { invitesRadicalNotation, requiresNumericLiteral } from "./submitGuards";

/**
 * The ASCII function-call spelling of a root, which is how a prompt TELLS a learner what to
 * type. Rendered mathematics in this bank is LaTeX (`$\sqrt{36}$`), so the ASCII form only ever
 * appears as notation guidance — a claim the census in "the cohort" below keeps honest.
 */
const INSTRUCTS_ASCII_SQRT = /sqrt\s*\(/;

/** Every served item whose prompt instructs `sqrt(...)`, radical-keyed or not. */
const instructingCohort = SERVED_PRACTICE_ITEMS.filter((item) =>
  INSTRUCTS_ASCII_SQRT.test(item.prompt),
);

/**
 * The five served instances the defect is live on, with the key that arms the gate.
 *
 * A named list rather than a derived count, because the claim is about composition: these are
 * the draws of two mixed-answer-space templates that landed on a fraction. Asserted in BOTH
 * directions in "the population" below, so an entry that stops qualifying fails and a served
 * item that starts qualifying without being listed fails too.
 */
const REFUSES_ITS_OWN_INSTRUCTION: readonly {
  readonly id: string;
  readonly key: string;
}[] = [
  { id: "d9.trg2.special-exact.l2:practice:140006", key: "1/2" },
  { id: "d9.trg2.special-exact.l2:practice:141055", key: "1/2" },
  { id: "d9.trg3.exact-value-circle.l3:practice:140013", key: "-1/2" },
  { id: "d9.trg3.exact-value-circle.l3:practice:141331", key: "-1/2" },
  { id: "d9.trg3.exact-value-circle.l3:practice:141333", key: "1/2" },
];

/** The templates that instruct the notation, so the cohort cannot quietly change shape. */
const INSTRUCTING_TEMPLATES: readonly string[] = [
  "d10.geo1.exact-diagonal.l3",
  "d9.trg2.exact-side-radical.l3",
  "d9.trg2.special-exact.l2",
  "d9.trg3.exact-value-circle.l3",
  "d9.trg6.reciprocal-exact.l3",
  "d9.trg9.sum-exact.l1",
];

function served(id: string) {
  const item = SERVED_PRACTICE_ITEMS.find((candidate) => candidate.item_version_id === id);
  if (!item) {
    throw new Error(`${id} is not a served practice instance`);
  }
  return item;
}

/**
 * The archetypal unit-circle miss on a fraction-keyed exact-value draw: the right sign for the
 * quadrant, the wrong reference angle. It is written in the notation the prompt instructs, which
 * is the whole point — this is the string the gate throws away.
 */
function referenceAngleMiss(key: string): string {
  return key.startsWith("-") ? "-sqrt(3)/2" : "sqrt(3)/2";
}

describe("the cohort of items that instruct sqrt(...) notation", () => {
  it("is 41 served instances over six templates, every one of them representation:exact", () => {
    // A floor, because a containment claim holds trivially over an empty collection, and the
    // composition beside it, because a floor constrains size and not shape.
    expect(instructingCohort.length).toBeGreaterThanOrEqual(41);
    expect([...new Set(instructingCohort.map((item) => item.template_id))].sort()).toEqual(
      INSTRUCTING_TEMPLATES,
    );
    for (const item of instructingCohort) {
      expect(
        item.answer.answer_spec.representation,
        `${item.item_version_id} instructs sqrt(...) without declaring an exact answer`,
      ).toBe("exact");
    }
  });

  /**
   * The census that keeps the `representation: "exact"` conjunct honest from the other side: if
   * an author ever writes an ASCII `sqrt(...)` into a prompt whose answer is a computed number,
   * this fails and says so, rather than the guard silently standing down on that item.
   */
  it("contains no item whose answer is a computed number", () => {
    const computed = SERVED_PRACTICE_ITEMS.filter(
      (item) =>
        INSTRUCTS_ASCII_SQRT.test(item.prompt) &&
        item.answer.answer_spec.representation !== "exact",
    );
    expect(computed.map((item) => item.item_version_id)).toEqual([]);
  });
});

describe("an item does not refuse the notation its own prompt instructs", () => {
  it("lets a sqrt(...) answer reach the grader on every one of the 41", () => {
    const refused = instructingCohort
      .filter((item) => {
        const submitted = referenceAngleMiss(String(item.answer.answer_key));
        return submitThroughPracticeSurface(item, submitted).outcome === "blocked_by_guard";
      })
      .map((item) => `${item.item_version_id} (key ${String(item.answer.answer_key)})`);
    expect(refused).toEqual([]);
  });

  it.each(REFUSES_ITS_OWN_INSTRUCTION)(
    "scores the reference-angle miss on $id instead of discarding it",
    ({ id, key }) => {
      const item = served(id);
      // The contradiction, stated from the item itself rather than from this file.
      expect(item.prompt).toMatch(INSTRUCTS_ASCII_SQRT);
      expect(String(item.answer.answer_key)).toBe(key);
      expect(isNumericLiteral(key)).toBe(true);

      // The miss REACHES the grader and is recorded as a miss.
      const miss = referenceAngleMiss(key);
      const attempt = submitThroughPracticeSurface(item, miss);
      expect(attempt.guard, `${miss} was refused before grading`).toBeNull();
      expect(attempt.note).toBeNull();
      expect(attempt.outcome).toBe("incorrect");
      expect(attempt.reason_code).toBe("value_mismatch");

      // ...while the item still accepts its own key, so nothing was traded for the miss.
      const control = submitThroughPracticeSurface(item, key);
      expect(control.outcome).toBe("correct");
    },
  );

  /**
   * The other half of the item's own instruction: it says "do not give a decimal", and the
   * decimal is what a learner cornered by the numeric-literal note would reach for. It is
   * refused by the item's `representation: "exact"`, which is the spec doing the work the gate
   * was standing in for — so removing the gate here loses no strictness.
   */
  it.each(REFUSES_ITS_OWN_INSTRUCTION)(
    "still refuses the decimal on $id",
    ({ id, key }) => {
      const attempt = submitThroughPracticeSurface(
        served(id),
        key.startsWith("-") ? "-0.5" : "0.5",
      );
      expect(attempt.outcome).toBe("incorrect");
      expect(attempt.reason_code).toBe("wrong_representation");
    },
  );
});

describe("the population, asserted in both directions", () => {
  /** Every served item the gate could reach: numeric type, and a key it would itself admit. */
  const eligible = SERVED_PRACTICE_ITEMS.filter(
    (item) =>
      item.answer.answer_spec.answer_type === "numeric" &&
      typeof item.answer.answer_key === "string" &&
      isNumericLiteral(item.answer.answer_key),
  );

  it("excuses exactly the five named instances and nothing else", () => {
    const excused = eligible
      .filter((item) => !requiresNumericLiteral(item))
      .map((item) => item.item_version_id)
      .sort();
    expect(excused).toEqual(REFUSES_ITS_OWN_INSTRUCTION.map((entry) => entry.id).sort());
  });

  it("keeps every other eligible item armed, and there are over 900 of them", () => {
    const armed = eligible.filter((item) => requiresNumericLiteral(item));
    // The floor that stops the excuse list growing until it has swallowed the population.
    expect(armed.length).toBeGreaterThanOrEqual(900);
    expect(armed.length + REFUSES_ITS_OWN_INSTRUCTION.length).toBe(eligible.length);
  });

  it("names five instances that each still qualify for the excuse", () => {
    for (const { id, key } of REFUSES_ITS_OWN_INSTRUCTION) {
      const item = served(id);
      expect(String(item.answer.answer_key), `${id} no longer keys ${key}`).toBe(key);
      expect(item.prompt, `${id} no longer instructs sqrt(...)`).toMatch(
        INSTRUCTS_ASCII_SQRT,
      );
      expect(item.answer.answer_spec.representation, id).toBe("exact");
      expect(requiresNumericLiteral(item), `${id} is still armed`).toBe(false);
    }
  });
});

describe("the gate still fires where it was built to", () => {
  /**
   * The instance that makes it load-bearing rather than merely present: a D1
   * order-of-operations prompt PRINTS the expression, and the exact-value path evaluates it, so
   * `3*3+5` grades `correct` / `match` against the key `14` through the real checker. The only
   * thing standing between a learner and that free pass is this gate.
   */
  it("refuses the prompt handed back on d1.num-2.l1:practice:5010, which would grade correct", () => {
    const item = served("d1.num-2.l1:practice:5010");
    expect(item.prompt).toContain("3 \\times 3 + 5");
    expect(String(item.answer.answer_key)).toBe("14");
    expect(
      practiceChecker({
        raw_answer: "3*3+5",
        item_version_id: item.item_version_id,
        equivalence_checker_version: checkerVersionForItem(item),
      }).client_correct,
      "the checker no longer evaluates the pasted expression, so this instance is spent",
    ).toBe(true);

    const attempt = submitThroughPracticeSurface(item, "3*3+5");
    expect(attempt.outcome).toBe("blocked_by_guard");
    expect(attempt.guard).toBe("numeric_literal");
    expect(attempt.note).toBe(NUMERIC_LITERAL_NOTE);
  });

  /**
   * And the cohort the `representation: "exact"` conjunct exists for: these prompts print a
   * radical and ask for its VALUE, so a root is the paste rather than the answer. They keep the
   * gate because they declare `representation: "any"` — a computed number — which is the
   * distinction the prompt signal alone cannot draw.
   */
  it("keeps the gate on every armed item whose prompt merely prints a radical", () => {
    const printsRadical = SERVED_PRACTICE_ITEMS.filter(
      (item) =>
        /\\sqrt\s*[{[]/.test(item.prompt) &&
        item.answer.answer_spec.answer_type === "numeric" &&
        typeof item.answer.answer_key === "string" &&
        isNumericLiteral(item.answer.answer_key),
    );
    expect(printsRadical.length).toBeGreaterThanOrEqual(26);
    expect(
      [
        ...new Set(printsRadical.map((item) => item.answer.answer_spec.representation)),
      ].sort(),
    ).toEqual(["any"]);
    for (const item of printsRadical) {
      expect(requiresNumericLiteral(item), item.item_version_id).toBe(true);
      const attempt = submitThroughPracticeSurface(
        item,
        `sqrt(${item.answer.answer_key}^2)`,
      );
      expect(attempt.outcome, item.item_version_id).toBe("blocked_by_guard");
    }
  });
});

/**
 * Loosening a gate is a change to the gate, so it owes the same evidence a fix does: inject the
 * defect each conjunct was written for and watch it fail at the changed lines. Neither of these
 * can be discharged by the two cohorts above — the `\sqrt{36}` prompts do not carry the ASCII
 * spelling, so they stay armed even with the `representation` conjunct deleted, which is exactly
 * the kind of green that proves nothing. Both injections are one-line and both were run:
 *
 *  - delete `representation === "exact"` from `invitesRadicalNotation` and the first fails,
 *    "a computed-number item disarmed the gate on the strength of its prompt alone";
 *  - delete the prompt test and the second fails, "d9.trg9.double-sine.l2:practice:140041 lost
 *    the gate", together with 55 of its cohort.
 */
describe("both conjuncts of the excuse are load-bearing", () => {
  /**
   * The `representation` conjunct. `d2.rad1.eval.l1` prints a root and asks for its value, so a
   * root is the paste; reword its prompt into the ASCII spelling and the prompt signal alone
   * would stand the gate down on it. Rewording rather than waiting for one, because the defect
   * this conjunct stops is a future edit to a prompt, and a guard that only catches it after it
   * ships catches it too late.
   */
  it("keeps the gate on a computed-number item even when its prompt says sqrt(...)", () => {
    const computed = served("d2.rad1.eval.l1:practice:60005");
    expect(computed.answer.answer_spec.representation).toBe("any");
    expect(String(computed.answer.answer_key)).toBe("6");
    expect(computed.prompt).not.toMatch(INSTRUCTS_ASCII_SQRT);

    const reworded = {
      ...computed,
      prompt:
        "A staked lot covers 36 square meters, so each side is sqrt(36) meters. Work out that length.",
    };
    expect(reworded.prompt).toMatch(INSTRUCTS_ASCII_SQRT);
    expect(
      invitesRadicalNotation(reworded),
      "a computed-number item disarmed the gate on the strength of its prompt alone",
    ).toBe(false);
    expect(requiresNumericLiteral(reworded)).toBe(true);
  });

  /**
   * The prompt conjunct. These 56 declare an exact answer AND arm the gate, and every one of
   * them asks for a fraction off a Pythagorean triple — no draw of their templates keys a
   * radical, so the gate cannot be refusing a notation they instruct. Disarming on
   * `representation: "exact"` alone would let the setup line through unevaluated work.
   */
  it("keeps the gate on the 56 exact-fraction items whose prompts instruct no notation", () => {
    const exactFractions = SERVED_PRACTICE_ITEMS.filter(
      (item) =>
        item.answer.answer_spec.representation === "exact" &&
        item.answer.answer_spec.answer_type === "numeric" &&
        typeof item.answer.answer_key === "string" &&
        isNumericLiteral(item.answer.answer_key) &&
        !INSTRUCTS_ASCII_SQRT.test(item.prompt),
    );
    expect(exactFractions.length).toBeGreaterThanOrEqual(56);
    for (const item of exactFractions) {
      expect(requiresNumericLiteral(item), `${item.item_version_id} lost the gate`).toBe(
        true,
      );
    }

    // The named instance, and the paste it must not evaluate: the double-angle setup line,
    // which is the whole of the work this item asks for.
    const named = served("d9.trg9.double-sine.l2:practice:140041");
    expect(String(named.answer.answer_key)).toBe("-840/841");
    expect(named.prompt).toContain("Enter it as a fraction");
    expect(
      requiresNumericLiteral(named),
      "d9.trg9.double-sine.l2:practice:140041 lost the gate",
    ).toBe(true);
    const attempt = submitThroughPracticeSurface(named, "2*(21/29)*(-20/29)");
    expect(attempt.outcome).toBe("blocked_by_guard");
    expect(attempt.guard).toBe("numeric_literal");
  });
});
