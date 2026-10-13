/**
 * A radical answer has to REACH the grader, on both practice surfaces.
 *
 * The report: RAD.1 practice, "Simplify $\sqrt{\dfrac{7}{4}}$. Write it as a simplified
 * radical.", answered `sqrt(7)/2` — which is that item's own answer key, verbatim — and it
 * "didn't work". The checker was never the problem: graded directly, `sqrt(7)/2` against
 * `d2.rad1.quotient.l2:practice:61085` is `correct` / `match` on the v2 product checker.
 *
 * What refused it was a PRE-SUBMIT guard in the surface. `isNumericLiteral` was added for
 * D1's order-of-operations prompts, where `answer_type: "numeric"` really does mean "a plain
 * number", and it rejects anything else before `submitAnswer` is called. Three days later the
 * D2 radical pools shipped: `radicalAnswer()` also emits `answer_type: "numeric"`, so every
 * simplified-radical item inherited a gate demanding a single number. The learner was told
 * "Enter your final answer as a single number (for example, 6), not the expression." on an
 * item whose prompt asks for a radical, and no attempt was recorded at all — so the failure
 * was neither `incorrect` nor `invalid_input`, and `Answer_Equivalence_Spec` §12 never saw it.
 *
 * The gate made the items UNANSWERABLE, not merely awkward: every string it admits is a
 * numeric literal, and the item's `representation: "exact"` grades every numeric literal
 * `wrong_representation` or `value_mismatch`. 83 registered instances across RAD.1, RAD.2 and
 * RAD.4 were in that state.
 *
 * So the guard is keyed off the ITEM rather than off `answer_type` alone: an item whose own
 * answer key is a single number keeps demanding one, and an item whose key is not a number
 * cannot be asking for one. Both halves are asserted below, and the D1 half is what makes
 * this additive.
 */

import {
  D3_PRACTICE_RETRY_VARIANTS_PER_CELL,
  // TEMPORARY, and read only by the demonstration-pin adjustment below.
  DEMO_PINNED_TEMPLATE_IDS,
  type FrozenItem,
} from "@cr/item-bank";
import { createLessonEngine } from "@cr/lesson";
import { createMasteryService } from "@cr/mastery-service";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { isNumericLiteral, NUMERIC_LITERAL_NOTE } from "./answerFormat";
import { InfinitePractice } from "./InfinitePractice";
import { LessonPractice } from "./LessonPractice";
import {
  checkerVersionForItem,
  practiceChecker,
  practiceItemsById,
} from "./practiceChecker";
import type { PracticeSource } from "./practiceSession";
import { invitesRadicalNotation, requiresNumericLiteral } from "./submitGuards";

/**
 * The cohort the gate stopped covering when it learned to read the prompt.
 *
 * BOTH conjuncts, because `invitesRadicalNotation` alone is a fact about the prompt and
 * matches 41 served items — 36 of which the key rule had already put outside the gate, and
 * which therefore belong to the 188 rather than here. What is NEW is the overlap: an item
 * that instructs `sqrt(...)` while keying a plain number, which is the only shape whose
 * treatment this change moved.
 */
function exemptedByItsOwnPrompt(item: FrozenItem): boolean {
  return invitesRadicalNotation(item) && isNumericLiteral(String(item.answer.answer_key));
}

/** The exact reported instance: `sqrt(7/4)`, RAD.1, MEDIUM, key `sqrt(7)/2`. */
const reportedItem = (() => {
  const found = [...practiceItemsById.values()].find(
    (item) =>
      item.template_id === "d2.rad1.quotient.l2" &&
      item.template_params.m === 7 &&
      item.template_params.c === 2,
  );
  if (!found) {
    throw new Error("the reported sqrt(7/4) instance is not in the served pool");
  }
  return found;
})();

/** Serve one fixed item to the infinite drill, as `EraInfinitePractice.test.tsx` does. */
const scheduled = vi.hoisted(() => ({ item: null as FrozenItem | null }));

vi.mock("./infiniteScheduler", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./infiniteScheduler")>();
  return {
    ...actual,
    createRandomScheduler: () => ({
      next: () => {
        if (!scheduled.item) {
          throw new Error("no item scheduled");
        }
        return scheduled.item;
      },
    }),
  };
});

/** A graded-practice source serving ONE chosen item, through the real engine + mastery. */
function fixedSource(item: FrozenItem): PracticeSource {
  return {
    nodeId: item.node_id,
    createSession: () => {
      const engine = createLessonEngine(
        createMasteryService({
          store: {
            getMastery: () => null,
            setMastery: () => {},
            getEvidenceResult: () => null,
            recordEvidenceResult: () => {},
          },
          recomputeCorrectness: (response) =>
            practiceChecker({
              raw_answer: response.raw_answer,
              item_version_id: response.item_id,
              equivalence_checker_version: checkerVersionForItem(item),
            }).client_correct,
        }),
      );
      const instance = {
        item_id: item.item_version_id,
        item_version: 1,
        item_version_id: item.item_version_id,
        equivalence_checker_version: checkerVersionForItem(item),
        template_id: item.template_id,
        template_params: item.template_params,
      };
      const session = engine.startLesson({
        node_id: item.node_id,
        items: [instance, instance, instance, instance, instance],
      });
      session.startTeaching();
      session.submitCheckForUnderstanding(true);
      session.startPractice();
      return { session, initialInstanceIds: [item.item_version_id] };
    },
    drawFresh: () => undefined,
  };
}

function answerField(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>("input[type='text']");
  if (!input) {
    throw new Error("the surface rendered no text answer field");
  }
  return input;
}

function submitAnswer(container: HTMLElement, text: string): void {
  fireEvent.change(answerField(container), { target: { value: text } });
  const form = container.querySelector("form");
  if (!form) {
    throw new Error("the surface rendered no form");
  }
  fireEvent.submit(form);
}

function feedbackNodes(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(".lesson-player__feedback")];
}

function feedbackText(container: HTMLElement): string {
  return feedbackNodes(container)
    .map((node) => node.textContent ?? "")
    .join(" ");
}

/** Both surfaces stamp their verdict on the feedback node; a blocked submit stamps none. */
function verdict(container: HTMLElement): string | undefined {
  return feedbackNodes(container)
    .map((node) => node.dataset.status)
    .find((status) => status !== undefined);
}

describe("the reported sqrt(7/4) answer reaches the grader", () => {
  /** The premise: the checker is not the defect, so the surface has no excuse. */
  it("grades `sqrt(7)/2` correct through the real checker", () => {
    expect(reportedItem.prompt).toContain("\\sqrt{\\dfrac{7}{4}}");
    expect(reportedItem.answer.answer_key).toBe("sqrt(7)/2");
    const result = practiceChecker({
      raw_answer: "sqrt(7)/2",
      item_version_id: reportedItem.item_version_id,
      equivalence_checker_version: checkerVersionForItem(reportedItem),
    });
    expect(result.status).toBe("correct");
    expect(result.reason_code).toBe("match");
  });

  it("accepts it on the graded practice surface", () => {
    const { container } = render(
      <LessonPractice nodeId={reportedItem.node_id} source={fixedSource(reportedItem)} />,
    );
    submitAnswer(container, "sqrt(7)/2");
    expect(feedbackText(container)).not.toContain("single number");
    expect(verdict(container)).toBe("correct");
    expect(screen.getByText(/That's right/)).toBeTruthy();
  });

  it("accepts it on the infinite drill surface", () => {
    scheduled.item = reportedItem;
    const { container } = render(
      <InfinitePractice nodeId={reportedItem.node_id} onExit={() => {}} />,
    );
    submitAnswer(container, "sqrt(7)/2");
    expect(feedbackText(container)).not.toContain("single number");
    expect(verdict(container)).toBe("correct");
  });

  it("accepts the copied root glyph on graded practice after boundary canonicalization", () => {
    const { container } = render(
      <LessonPractice nodeId={reportedItem.node_id} source={fixedSource(reportedItem)} />,
    );
    submitAnswer(container, "√7/2");
    expect(verdict(container)).toBe("correct");
  });

  it("accepts the copied root glyph on infinite practice too", () => {
    scheduled.item = reportedItem;
    const { container } = render(
      <InfinitePractice nodeId={reportedItem.node_id} onExit={() => {}} />,
    );
    submitAnswer(container, "√7/2");
    expect(verdict(container)).toBe("correct");
  });
});

describe("the numeric-literal gate still fires where it was built to", () => {
  /** A D1 order-of-operations item: `answer_type: "numeric"` AND a plain-number key. */
  const d1NumericItem = (() => {
    const found = [...practiceItemsById.values()].find(
      (item) =>
        item.node_id === "NUM.2" &&
        item.answer.answer_spec.answer_type === "numeric" &&
        isNumericLiteral(String(item.answer.answer_key)),
    );
    if (!found) {
      throw new Error("no served NUM.2 numeric item with a plain-number key");
    }
    return found;
  })();

  it("rejects a pasted expression on an item whose answer IS a single number", () => {
    const { container } = render(
      <LessonPractice nodeId={d1NumericItem.node_id} source={fixedSource(d1NumericItem)} />,
    );
    submitAnswer(container, "2 + 3 * 4");
    expect(feedbackText(container)).toBe(NUMERIC_LITERAL_NOTE);
  });

  it("rejects one on the infinite drill too", () => {
    scheduled.item = d1NumericItem;
    const { container } = render(
      <InfinitePractice nodeId={d1NumericItem.node_id} onExit={() => {}} />,
    );
    submitAnswer(container, "2 + 3 * 4");
    expect(feedbackText(container)).toBe(NUMERIC_LITERAL_NOTE);
  });
});

/**
 * The additivity leg. The gate's reach is decided per ITEM, so it has to be shown that no
 * item it used to cover has left it: every served numeric item whose key is a plain number
 * still requires one, and the only items that stopped requiring one are the radicals, whose
 * own keys the gate refused.
 */
describe("the gate's reach moved for exactly the items it made unanswerable", () => {
  const numericItems = [...practiceItemsById.values()].filter(
    (item) => item.answer.answer_spec.answer_type === "numeric",
  );

  it("covers every served numeric item whose answer key is a plain number", () => {
    const plain = numericItems.filter((item) =>
      isNumericLiteral(String(item.answer.answer_key)),
    );
    // Pinned rather than floored: with the 195 below it accounts for all 1028 numeric
    // instances, so neither cohort can shrink into the other unnoticed. D3 moved this from
    // 323 by adding 42 whole-number keys: LIN.3's five shapes answer with a number on every
    // one of them, and LIN.1's balance shape asks for a weight. D4 moved it a further 42, all
    // whole: POL.1's cross-term coefficient, POL.4's completing constant, discriminant and
    // right-hand side, and POL.8's two remainders. D1 added 24 more by closing its
    // single-shape practice cells with four numeric shapes (`d1.num-2.l2b`, `d1.num-s.l3b`,
    // `d1.num-f.l3b`, `d1.num-5.l3b`), each contributing 6 retry variants. NUM.F's are in this
    // cohort rather than the other because `isNumericLiteral` admits a bar: `7/16` is a plain
    // NUMBER to this gate, as the `7/4` case below asserts directly. The pool itself moved none
    // of this, because all six replaced slots kept their type. EL.6 then added 21, from three
    // of its five shapes: two key a solution set and so are not numeric items at all, and the
    // third is a `precisionAnswer` to three places, which is `answer_type: "numeric"` like the
    // rest.
    //
    // D10 moved it a further 56: seventy Geometry instances, less the seven exact-diagonal
    // radicals counted in the other cohort below, less the seven exact-pi cylinder instances,
    // which are `expression` rather than `numeric` and so are outside this sweep entirely. Those
    // seven radicals are the only thing either lane added to the refused cohort, which is the
    // additivity this describe block is for: EL.6's decimal keys are plain numbers, so none of
    // them landed there and the 83 became 90 from D10 alone.
    //
    // D6 then moved it a further 196, which is the largest single addition this line has taken
    // and is simply the size of the domain: eleven nodes at fifty-five templates, and the great
    // majority of them answer with a number — an evaluation, a rate, a difference quotient, a
    // composed value, an inverse read at a point. None of them landed in the refused cohort.
    //
    // D9 moved it 137, from 234 trigonometry instances less the 97 exact ones counted in the
    // other cohort. The plain 137 are the counts, degrees and whole-number readings — a period
    // in degrees, an amplitude, a quadrant number, a reference angle — all of which are
    // genuinely plain numbers and belong on this side. D9 is the only one of the two lanes that
    // widened the refused cohort, which is why that stands at 187 rather than at 90.
    //
    // 129 and 105 until QA round 1, when two D9 shapes were reworked so that their answer was
    // no longer a number their own prompt had already printed. Eight instances crossed from the
    // exact cohort to this one and 234 did not move, which is the shape of that change: the
    // domain gained no items, two of its questions changed what they ask for.
    //
    // The total here is COUNTED on the merged tree rather than added up from the two lanes'
    // own figures: D6 landed on 704 and D9 on 637 over a shared base of 508, and each of those
    // is a true statement about a tree that does not exist any more.
    // EL.3's authored third L2 shape then moved it 6, which is its six retry variants and
    // nothing else: appended after every locked-mix template it takes no canonical pool slot,
    // so the delta is exactly one template's variant allowance and every other domain's count
    // below is byte-identical. That is the evidence the append left the frozen pool alone.
    //
    // POL.6 and POL.7 then moved it 28. Ten new templates freeze 70 instances between them, and
    // 28 of those key a plain number: POL.6's degree and leading-coefficient shapes and POL.7's
    // multiplicity and turning-point shapes. The other 42 are monomials, factored forms,
    // solution sets and a one-word verdict, which are not numeric items at all.
    // TRG.7 and TRG.8's four authored shapes then moved it 6: `principal-degree.l2` keys a
    // degree measure, which is a plain number, and the other three key exact radians or a
    // roster, which are not numeric items on this side at all. Those three are also why the
    // refused cohort moved 6 the other way, from 187 to 193.
    //
    // POL.5's five shapes then moved it 28, and the arithmetic is worth spelling out because it
    // is four sevenths rather than five: a vertex coordinate, an extreme value and a
    // `y`-intercept are single readings on an axis and so are `numeric`, at seven instances each
    // (a canonical slot plus six retry variants), and the fifth shape keys a roster of
    // `x`-intercepts, which is a `solution_set` and not a numeric item at all. Nothing POL.5
    // added reaches the refused cohort, so the 193 below was unmoved: every one of those keys is
    // a plain integer.
    //
    // The TRG.4 / TRG.9 tier rebalance then moved this one 8 and the refused cohort 5 the other
    // way, and the two are separate movements rather than one crossing. TRG.9 retired
    // `difference-exact.l2`, whose five instances keyed a radical and were the refused cohort's;
    // the two L3s authored in place of the retirements key plain fractions off Pythagorean
    // triples, which land here. So the bank's template count is unchanged while this cohort
    // gains and the other loses, because what changed is the ARITHMETIC the new shapes produce
    // rather than how many shapes there are.
    //
    // TEMPORARY, and derived rather than rewritten. A template pinned to one instance for the
    // demonstration keeps its canonical slot and loses its six retry variants, so both this
    // total and its domain's line below are short by exactly that much
    // (`packages/item-bank/src/demoPinnedTemplates.ts`). Subtracting a derived quantity rather
    // than editing 917 down to 911 keeps the pin's cost legible AND restores the real figure by
    // itself when the list empties, so a demonstration cannot quietly become the new baseline.
    // The one pinned template keys a plain number, which is why its loss lands in this cohort.
    const lostToThePin =
      DEMO_PINNED_TEMPLATE_IDS.length * D3_PRACTICE_RETRY_VARIANTS_PER_CELL;
    expect(plain).toHaveLength(917 - lostToThePin);
    expect(plain.length + 188).toBe(numericItems.length);
    // The total alone is not enough, and the reason is a merge rather than a bug: two lanes
    // that each grow the bank both edit this one integer, so resolving the conflict means
    // picking a number, and a wrong pick can land on the right total. Concretely, dropping one
    // of D1's four new numeric shapes (6 instances) while D4 gained 42 still reads 431 if the
    // resolution guesses. The decomposition is what makes that fail: a domain losing a shape
    // fails at its own key even when another domain's growth hides it in the sum. Measured, not
    // derived arithmetically.
    const byDomain: Record<string, number> = {};
    for (const item of plain) {
      const domain = item.template_id.split(".")[0] ?? item.template_id;
      byDomain[domain] = (byDomain[domain] ?? 0) + 1;
    }
    expect(byDomain).toEqual({
      d1: 158,
      d2: 28,
      d3: 42 - lostToThePin,
      d4: 98,
      d5: 14,
      d6: 196,
      d7: 49,
      d8: 125,
      d9: 151,
      d10: 56,
    });
    for (const item of plain) {
      if (exemptedByItsOwnPrompt(item)) {
        continue; // named, and asserted both ways, in the test below.
      }
      expect(requiresNumericLiteral(item), item.item_version_id).toBe(true);
    }
  });

  /**
   * THE SECOND REASON AN ITEM IS OUT OF THE GATE, and it is not the key's shape.
   *
   * Everything above turns on the key: an item whose key is not a plain number cannot be
   * asking for one. That reading is sound and it is not sufficient, because a key is a fact
   * about the DRAW. `d9.trg3.exact-value-circle.l3` instructs `sqrt(...)` in its own prompt
   * on every draw, and keys `sqrt(3)/2` on some draws and `-1/2` on others — so on the
   * fraction draws the gate armed and refused the notation the prompt had just asked for.
   * Nothing was scored: not `incorrect`, not `invalid_input`, no attempt at all. That is this
   * file's own defect inverted — there the gate refused its own key, here it refuses the
   * answer the item invited.
   *
   * These five are therefore exempt for a DIFFERENT reason from the 188, and a reason that
   * has to be stated or the two cohorts merge into "things the gate happens not to cover".
   * Asserted in both directions, so the list cannot rot: an entry that stops inviting a
   * radical, or stops keying a literal, fails here; and an item that starts inviting one
   * without joining the list fails too.
   */
  it("exempts the five instances whose prompt asks for the notation the gate refuses", () => {
    const invited = numericItems.filter((item) => exemptedByItsOwnPrompt(item));
    expect(invited.map((item) => item.item_version_id).sort()).toEqual([
      "d9.trg2.special-exact.l2:practice:140006",
      "d9.trg2.special-exact.l2:practice:141055",
      "d9.trg3.exact-value-circle.l3:practice:140013",
      "d9.trg3.exact-value-circle.l3:practice:141331",
      "d9.trg3.exact-value-circle.l3:practice:141333",
    ]);
    for (const item of invited) {
      // Still qualifies: the prompt still spells the notation, and the key is still the
      // plain number that would otherwise arm the gate. Either half lapsing fails here
      // rather than silently exempting nothing.
      expect(item.prompt, item.item_version_id).toMatch(/sqrt\s*\(/);
      expect(isNumericLiteral(String(item.answer.answer_key)), item.item_version_id).toBe(
        true,
      );
      expect(requiresNumericLiteral(item), item.item_version_id).toBe(false);
    }
    // The other direction: no unlisted item has quietly adopted the exemption.
    for (const item of numericItems) {
      if (invited.includes(item)) {
        continue;
      }
      expect(
        requiresNumericLiteral(item),
        `${item.item_version_id} left the gate without joining the list`,
      ).toBe(isNumericLiteral(String(item.answer.answer_key)));
    }
  });

  it("covers no served item whose own answer key it would refuse", () => {
    const notPlain = numericItems.filter(
      (item) => !isNumericLiteral(String(item.answer.answer_key)),
    );
    expect(notPlain.length).toBeGreaterThan(0);
    for (const item of notPlain) {
      expect(requiresNumericLiteral(item), item.item_version_id).toBe(false);
    }
  });

  /**
   * The count behind the containment above: a subset claim holds trivially over an empty
   * set, and this names the set. 83 instances across three nodes were unanswerable.
   *
   * GEO.1's seven exact diagonals joined the cohort afterwards and were never blocked: they
   * were authored against the item-keyed gate this file describes, so they are outside it
   * from the start. They are counted here anyway because the claim the sweep makes is about
   * which items the gate covers TODAY, and an exact radical it did cover would be as
   * unanswerable as the original 83.
   *
   * D9's 97 joined on the same footing and are the reason the census below is keyed by
   * REASON as well as node. Trigonometry is the first lane whose exact answers are not
   * radicals: most of them are radian keys carrying a `pi`, which no decimal answers
   * exactly, so a gate demanding a numeric literal would make them unanswerable in exactly
   * the way the original 83 were. They were authored after the gate was keyed per item and
   * so were never blocked.
   */
  it("names the 188 instances across the RAD / GEO.1 / TRG nodes outside the gate", () => {
    // The five prompt-invited instances are held out deliberately, not netted off: they are
    // outside the gate for the OTHER reason, their own test names them, and folding them in
    // would let this census absorb a future item that left the gate by accident. 193 items
    // are outside the gate in total, and only these 188 are outside it because of their key.
    const freed = numericItems.filter(
      (item) => !requiresNumericLiteral(item) && !exemptedByItsOwnPrompt(item),
    );
    expect(freed).toHaveLength(188);
    expect(numericItems.filter((item) => !requiresNumericLiteral(item))).toHaveLength(193);

    // Pinned by node AND by the reason each item is out of reach, because the size alone
    // cannot tell a node that lost items from one that gained the same number for a
    // different reason. D9 is why that distinction now matters: it is the first lane to
    // widen this cohort with something other than a radical.
    const census: Record<string, number> = {};
    for (const item of freed) {
      const tag = `${item.node_id}|${item.answer.answer_spec.simplification}`;
      census[tag] = (census[tag] ?? 0) + 1;
    }
    expect(census).toEqual({
      "RAD.1|simplified_radical": 21,
      "RAD.2|simplified_radical": 34,
      "RAD.4|simplified_radical": 28,
      "GEO.1|simplified_radical": 7,
      // D9's 105. `none` is a radian key carrying a `pi`, which has no decimal a learner
      // could type exactly; `canonical_exact_trig_value` is a special-angle value such as
      // `sqrt(3)/2`; and TRG.2's seven radicals are exact triangle sides, the same shape
      // RAD and GEO.1 contribute.
      "TRG.1|none": 21,
      "TRG.2|simplified_radical": 7,
      "TRG.2|canonical_exact_trig_value": 5,
      "TRG.3|none": 7,
      // 10 until QA round 1 reshaped `coordinates.l3`, which asked for one exact coordinate of
      // a heading's point and now asks for the heading itself, in whole degrees. Its two L3
      // shapes had been the same question twice over; the five instances that left this cohort
      // are the ones that changed sides of it, and they are on the plain side above.
      //
      // 4 rather than 5 since the tier rebalance, and this node is the clearest illustration
      // that the cohort splits WITHIN a template rather than between them. `exact-value-circle`
      // keys `sqrt(3)/2` on some draws and `1/2` on others, so which side each of its instances
      // falls on is decided by the draw; the rebalance reshaped a template two nodes earlier
      // and the variant builder handed this one a different sixth draw. No question on TRG.3
      // changed, and the node's total is unmoved: the instance is on the plain side above.
      "TRG.3|canonical_exact_trig_value": 4,
      // 17 until the same round reshaped `features.l3`. It asked for the amplitude, the period
      // or the midline of a printed rule, and two of those three were a number the rule had
      // already printed; it now asks for the highest value, the lowest, or the distance between
      // them. The three that left were its radian periods. The period is still asked at TRG.5,
      // by `period-radian.l2`, whose keys stay in this cohort.
      "TRG.5|none": 14,
      "TRG.6|none": 14,
      "TRG.6|canonical_exact_trig_value": 7,
      "TRG.7|none": 13,
      // 10 until the tier rebalance retired `difference-exact.l2`, which contributed 4 of them,
      // leaving `sum-exact.l1`'s 6 as the whole of TRG.9's share. Their replacement is not here
      // at all: the L3 authored in their place combines two Pythagorean triples and keys a plain
      // fraction, so it is answerable with a numeric literal and sits on the plain side above.
      // That is a node's exact-value cohort shrinking by 4 without the node losing a template.
      "TRG.9|canonical_exact_trig_value": 6,
    });

    // ...and every one is out of reach for a reason on a named list, so a key that is
    // merely malformed cannot slip in beside the exact ones and read as intentional.
    for (const item of freed) {
      expect(
        ["simplified_radical", "canonical_exact_trig_value", "none"],
        item.item_version_id,
      ).toContain(item.answer.answer_spec.simplification);
    }
  });

  /**
   * `evaluateKey` is read directly, because the pincer below cannot tell a right decimal
   * from a wrong one: both are refused, so a helper that misreads a term passes the test it
   * was supposed to serve. It was widened for D9's two new key shapes, and a widened reader
   * that silently returns the wrong number is worse than one that throws, which is what it
   * did before. The values are trigonometry's, checked against the angle they belong to.
   */
  it("reads the two key shapes D9 added, to the value they actually have", () => {
    expect(evaluateKey("2sqrt(3)/3")).toBeCloseTo(1.1547005, 6); // implicit coefficient
    expect(evaluateKey("(sqrt(6)-sqrt(2))/4")).toBeCloseTo(0.258819, 6); // sin 15 degrees
    // The forms it already read are unchanged by the widening.
    expect(evaluateKey("2*sqrt(3)")).toBeCloseTo(3.4641016, 6);
    expect(evaluateKey("sqrt(2)/2")).toBeCloseTo(Math.SQRT1_2, 6);
    // ...and it still refuses what it cannot read, rather than scoring a NaN.
    expect(() => evaluateKey("tan(60)")).toThrow(/cannot read/);
  });

  /** Why "unanswerable" and not "awkward": no admitted string could ever have graded. */
  it("proves no numeric literal could have answered the reported item", () => {
    for (const literal of ["1.3228756555322954", "1.32", "7/4", "2", "0"]) {
      expect(isNumericLiteral(literal), literal).toBe(true);
      const result = practiceChecker({
        raw_answer: literal,
        item_version_id: reportedItem.item_version_id,
        equivalence_checker_version: checkerVersionForItem(reportedItem),
      });
      expect(result.client_correct, `${literal} graded correct`).toBe(false);
    }
  });

  /**
   * And the same over all 188, so "unanswerable" is a measurement rather than an argument
   * about one item: each one's OWN key grades correct while the old gate refused it, and
   * every one of them refuses the decimal a learner cornered by that gate would have
   * reached for. Both halves per item, because either alone leaves the pincer unproven.
   */
  it("proves each blocked item accepted its key and refused the decimal", () => {
    // Held out for the same reason as the census above, and for a second one that is
    // specific to this pincer: the exemption's whole point is that these five keys ARE
    // numeric literals, so the first assertion below is false of them by construction and
    // `evaluateKey` has no radical term to read in `1/2`. They are covered instead by
    // `submitGuardExactValue.test.ts`, which puts the instructed `sqrt(...)` through the
    // full submit path and watches it reach the grader.
    const freed = numericItems.filter(
      (item) => !requiresNumericLiteral(item) && !exemptedByItsOwnPrompt(item),
    );
    expect(freed).toHaveLength(188);
    for (const item of freed) {
      const key = String(item.answer.answer_key);
      const grade = (raw: string): boolean =>
        practiceChecker({
          raw_answer: raw,
          item_version_id: item.item_version_id,
          equivalence_checker_version: checkerVersionForItem(item),
        }).client_correct;
      expect(isNumericLiteral(key), `${item.item_version_id} key ${key}`).toBe(false);
      expect(grade(key), `${item.item_version_id} rejected its own key ${key}`).toBe(true);
      // A variable-bearing key has no single decimal value; the constant ones do.
      if ((item.answer.allowed_symbols?.length ?? 0) > 0) {
        continue;
      }
      const decimal = String(evaluateKey(key));
      expect(isNumericLiteral(decimal), `${decimal} is not a literal`).toBe(true);
      expect(grade(decimal), `${item.item_version_id} accepted ${decimal}`).toBe(false);
    }
  });
});

/**
 * The decimal a learner would type if told to enter this key as a single number. Every
 * constant-radicand key in the bank is a sum of `±a*sqrt(m)` / `±sqrt(m)/c` terms, so it
 * is read term by term rather than evaluated, and an unrecognized term throws instead of
 * quietly scoring a NaN.
 *
 * D9 added two shapes to read. The coefficient's `*` is optional because a special-angle
 * value is keyed `2sqrt(3)/3` rather than `2*sqrt(3)/3`; and a sum-angle value puts its two
 * roots over one denominator, `(sqrt(6)-sqrt(2))/4`, which is peeled off before the sum
 * inside is split. Both forms are read rather than the bank being asked to pick one, since
 * the throw below is what keeps this helper from scoring a term it has misread — and a term
 * it cannot read at all must fail loudly, as both of these did.
 */
function evaluateKey(key: string): number {
  const grouped = key.replace(/\s+/g, "").match(/^\((.+)\)\/(\d+)$/);
  if (grouped?.[1] && grouped[2]) {
    return evaluateKey(grouped[1]) / Number(grouped[2]);
  }
  const terms = key.replace(/\s+/g, "").replace(/-/g, "+-").split("+").filter(Boolean);
  return terms.reduce((total, term) => {
    const match = term.match(/^(-?)(?:(\d+)\*?)?sqrt\((\d+)\)(?:\/(\d+))?$/);
    if (!match) {
      throw new Error(`evaluateKey cannot read the term "${term}" of "${key}"`);
    }
    const [, sign, coefficient, radicand, denominator] = match;
    const value =
      (Number(coefficient ?? 1) * Math.sqrt(Number(radicand))) / Number(denominator ?? 1);
    return total + (sign === "-" ? -value : value);
  }, 0);
}
