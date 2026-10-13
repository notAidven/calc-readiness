/**
 * The input field has to teach its own syntax, on ALL THREE answer-entry surfaces.
 *
 * The report: EXP.1's check-your-understanding asks the learner to "Simplify $(x^2)^3 \cdot
 * x^{-8}$ ... with positive exponents only", whose answer must be typed `1/x^2`, under a field
 * whose placeholder was the bare "Your answer". Nothing on screen said that `^` writes an
 * exponent or that `/` writes the fraction, so a learner who is right on paper can still lose
 * the attempt on notation, and that failure looks exactly like not knowing the mathematics.
 *
 * It is a fall-through, not a one-off. `practicePlaceholder` has keyed a placeholder off the
 * `positive_exponents` profile for a while; the CFU card derived its own placeholder from a
 * SEPARATE ladder with no branch for it, so one node taught two different input languages on
 * two screens. Both now come from one helper, and this file asserts the rendered FIELD on each
 * surface rather than the helper's return value, because a shared helper nothing calls is not
 * a fix.
 */

import type { FrozenItem } from "@cr/item-bank";
import { createLessonEngine } from "@cr/lesson";
import { createMasteryService } from "@cr/mastery-service";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  EXPONENT_NOTATION_PLACEHOLDER,
  FRACTION_PLACEHOLDER,
  GENERIC_PLACEHOLDER,
  MULTIPLE_CHOICE_PLACEHOLDER,
  NUMERIC_LITERAL_PLACEHOLDER,
  POSITIVE_EXPONENT_PLACEHOLDER,
  practicePlaceholder,
  RADICAL_PLACEHOLDER,
  RADICAL_QUOTIENT_PLACEHOLDER,
  RADICAL_SUM_PLACEHOLDER,
  type RadicalShape,
  REDUCED_FRACTION_PLACEHOLDER,
  radicalShape,
  VARIABLE_RADICAL_PLACEHOLDER,
} from "./answerFormat";
import { LessonCfu } from "./cfu";
import { d1LessonByNode } from "./d1";
import { d2LessonByNode } from "./d2";
import { InfinitePractice } from "./InfinitePractice";
import { LessonPractice } from "./LessonPractice";
import { checkerVersionForItem, practiceItemsById } from "./practiceChecker";
import type { PracticeSource } from "./practiceSession";

/**
 * The item every surface test serves: a REAL served EXP.1 instance whose answer is a
 * reciprocal power, which is the shape the reported screenshot's answer takes. Chosen from the
 * shipped pool rather than hand-built, so a test cannot pass on a profile no item carries.
 */
const exp1Item = (() => {
  const found = [...practiceItemsById.values()].find(
    (item) =>
      item.node_id === "EXP.1" &&
      item.answer.answer_spec.simplification === "positive_exponents" &&
      String(item.answer.answer_key).startsWith("1/"),
  );
  if (!found) {
    throw new Error("no served EXP.1 item whose answer is a reciprocal power");
  }
  return found;
})();

/** Serve one fixed item to the infinite drill, the way `EraInfinitePractice.test.tsx` does. */
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

/**
 * A graded-practice source that serves ONE chosen item in all five slots, through the real
 * engine and mastery service. The shipped sources randomize their opening set, so a test that
 * used one could not name the shape it was asserting about.
 */
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
          recomputeCorrectness: () => false,
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

/** The one text answer field on a rendered surface. */
function answerField(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>("input[type='text']");
  if (!input) {
    throw new Error("the surface rendered no text answer field");
  }
  return input;
}

describe("the EXP.1 answer field names its own notation, on every surface", () => {
  /**
   * The reported screenshot. Before this change the field carried "Your answer": the CFU card
   * read its placeholder off a ladder with no exponent branch, so the one node whose answer
   * cannot be typed without knowing two operators was the one saying nothing about either.
   */
  it("the CFU panel (the reported screenshot)", () => {
    const cfu = d2LessonByNode["EXP.1"]?.cfu;
    if (!cfu) {
      throw new Error("the D2 pack has no EXP.1 CFU");
    }
    // Pinned: the guidance is only owed because the answer is unguessable notation.
    expect(cfu.prompt).toContain("positive exponents only");
    expect(cfu.accepted).toContain("1/x^2");

    const { container } = render(<LessonCfu cfu={cfu} nodeId="EXP.1" />);
    expect(answerField(container).placeholder).toBe(POSITIVE_EXPONENT_PLACEHOLDER);
  });

  it("the graded practice surface", () => {
    const { container } = render(
      <LessonPractice nodeId={exp1Item.node_id} source={fixedSource(exp1Item)} />,
    );
    expect(answerField(container).placeholder).toBe(POSITIVE_EXPONENT_PLACEHOLDER);
  });

  it("the infinite practice surface", () => {
    scheduled.item = exp1Item;
    const { container } = render(
      <InfinitePractice nodeId={exp1Item.node_id} onExit={() => {}} />,
    );
    expect(answerField(container).placeholder).toBe(POSITIVE_EXPONENT_PLACEHOLDER);
  });
});

/**
 * The other CFU packs, so wiring the card to the shared helper cannot silently move any
 * placeholder that was already right. RAD.4 is the interesting one: its bar notation is
 * exactly what PR #164 established the two-option placeholder is FOR.
 */
describe("wiring the CFU card to the shared helper leaves the other packs where they were", () => {
  it.each([
    // RAD.1's check is keyed `6*sqrt(2)/5`, a root over an integer, and it was shown the
    // coefficient-times-a-root line like the other 54 radical surfaces.
    ["RAD.1", RADICAL_QUOTIENT_PLACEHOLDER],
    ["RAD.2", RADICAL_PLACEHOLDER],
    // RAD.3 was the one D2 pack still on the bare "Your answer", and it was on it for the
    // reason this whole file is about: it had no `check`, so `cfuNotation` had no spec to
    // read and fell through to the generic line. It carries `answer_type: "numeric"` as of
    // the CFU migration, so the field now says what it will take. The row is kept rather
    // than deleted because "leaves the other packs where they were" is the claim, and this
    // is the one pack the migration MOVED — naming where it moved to is the difference
    // between a measured change and a silent one.
    ["RAD.3", NUMERIC_LITERAL_PLACEHOLDER],
    ["RAD.4", VARIABLE_RADICAL_PLACEHOLDER],
  ])("D2 %s keeps %s", (nodeId, expected) => {
    const cfu = d2LessonByNode[nodeId]?.cfu;
    if (!cfu) {
      throw new Error(`no ${nodeId} CFU`);
    }
    const { container } = render(<LessonCfu cfu={cfu} nodeId={nodeId} />);
    expect(answerField(container).placeholder).toBe(expected);
  });

  it.each([
    ["NUM.2", NUMERIC_LITERAL_PLACEHOLDER],
    ["NUM.5", NUMERIC_LITERAL_PLACEHOLDER],
    ["NUM.S", NUMERIC_LITERAL_PLACEHOLDER],
    ["NUM.F", REDUCED_FRACTION_PLACEHOLDER],
    // NUM.3's canonical answer is `5*n + 25`, whose star is a coefficient's and grades away,
    // so it has no notation to name and keeps the bare line.
    ["NUM.3", GENERIC_PLACEHOLDER],
    // NUM.4 does not, and this row used to say it did. Its canonical answer is `x^2 + 5x` and
    // the caret is the one character a learner cannot guess; the row is kept in this table
    // rather than moved to the EXP.1 describe above because what it now pins is the same
    // thing the others do — that this node's line is the one its own answer asks for.
    ["NUM.4", EXPONENT_NOTATION_PLACEHOLDER],
  ])("D1 %s keeps %s", (nodeId, expected) => {
    const cfu = d1LessonByNode[nodeId]?.cfu;
    if (!cfu) {
      throw new Error(`no ${nodeId} CFU`);
    }
    const { container } = render(<LessonCfu cfu={cfu} nodeId={nodeId} />);
    expect(answerField(container).placeholder).toBe(expected);
  });
});

/**
 * A radical answer over a variable radicand needs the BAR notation named, and the string that
 * names it has to reach the field on the practice surfaces too, not only inside the RAD.4
 * widget PR #164 widened.
 */
describe("a variable-radicand answer field names the bar notation", () => {
  const rad4Item = (() => {
    const found = [...practiceItemsById.values()].find(
      (item) =>
        item.node_id === "RAD.4" &&
        item.answer.answer_spec.simplification === "simplified_radical" &&
        (item.answer.allowed_symbols?.length ?? 0) > 0,
    );
    if (!found) {
      throw new Error("no served RAD.4 variable-radicand item");
    }
    return found;
  })();

  it("on the graded practice surface", () => {
    const { container } = render(
      <LessonPractice nodeId={rad4Item.node_id} source={fixedSource(rad4Item)} />,
    );
    expect(answerField(container).placeholder).toBe(VARIABLE_RADICAL_PLACEHOLDER);
  });

  it("on the infinite practice surface", () => {
    scheduled.item = rad4Item;
    const { container } = render(
      <InfinitePractice nodeId={rad4Item.node_id} onExit={() => {}} />,
    );
    expect(answerField(container).placeholder).toBe(VARIABLE_RADICAL_PLACEHOLDER);
  });
});

/**
 * A constant-radicand answer has three shapes and one profile, and the field has to name the
 * shape the item on screen is actually keyed in.
 *
 * The report: `practicePlaceholder` returned one line — "A simplified radical: 5*sqrt(2)" —
 * for every item whose `simplification` is `simplified_radical`, so 20 of the 55 served
 * instances met a field advertising a shape their own answer key cannot take. A learner
 * holding a correct `sqrt(7)/2` reads that and concludes the field wants something else.
 *
 * Asserted on the RENDERED field of both practice surfaces rather than on the helper, because
 * the shape is read from an argument the SURFACES have to pass: a dispatch nobody hands an
 * answer key to would go on showing the product line, and the helper's own unit test would
 * still be green. The item is drawn from the shipped pool by shape, so the test cannot pass
 * against a shape nothing serves.
 */
describe("a radical answer field names the shape its own item is keyed in", () => {
  const radicalItem = (shape: RadicalShape): FrozenItem => {
    const found = [...practiceItemsById.values()].find(
      (item) =>
        item.answer.answer_spec.simplification === "simplified_radical" &&
        (item.answer.allowed_symbols?.length ?? 0) === 0 &&
        radicalShape(item.answer.answer_key) === shape,
    );
    if (!found) {
      throw new Error(`no served constant-radicand item keyed as a ${shape}`);
    }
    return found;
  };

  it.each([
    ["quotient", RADICAL_QUOTIENT_PLACEHOLDER],
    ["sum", RADICAL_SUM_PLACEHOLDER],
    ["product", RADICAL_PLACEHOLDER],
  ] as const)("a %s key on the graded practice surface", (shape, expected) => {
    const item = radicalItem(shape);
    const { container } = render(
      <LessonPractice nodeId={item.node_id} source={fixedSource(item)} />,
    );
    expect(answerField(container).placeholder, String(item.answer.answer_key)).toBe(
      expected,
    );
  });

  it.each([
    ["quotient", RADICAL_QUOTIENT_PLACEHOLDER],
    ["sum", RADICAL_SUM_PLACEHOLDER],
    ["product", RADICAL_PLACEHOLDER],
  ] as const)("a %s key on the infinite practice surface", (shape, expected) => {
    const item = radicalItem(shape);
    scheduled.item = item;
    const { container } = render(
      <InfinitePractice nodeId={item.node_id} onExit={() => {}} />,
    );
    expect(answerField(container).placeholder, String(item.answer.answer_key)).toBe(
      expected,
    );
  });

  /**
   * The reported instance, named rather than swept: `d2.rad1.quotient.l2` is the template
   * whose own answer key PR #209 found the submit gate refusing, and the field above it was
   * advertising a third thing again.
   */
  it("names the quotient shape on the reported template, over every instance of it", () => {
    const instances = [...practiceItemsById.values()].filter(
      (item) => item.template_id === "d2.rad1.quotient.l2",
    );
    expect(instances.length).toBe(7);
    for (const item of instances) {
      expect(String(item.answer.answer_key)).toMatch(/^sqrt\(\d+\)\/\d+$/);
      const { container } = render(
        <LessonPractice nodeId={item.node_id} source={fixedSource(item)} />,
      );
      expect(answerField(container).placeholder, item.item_version_id).toBe(
        RADICAL_QUOTIENT_PLACEHOLDER,
      );
    }
  });
});

/**
 * The choose-one field is the one placeholder that can offer no example, because every example
 * it could give would BE the answer to some served item. All it can do is point at the options
 * already on screen — so this pins the two things that has to be true to work: the options are
 * ABOVE the field where it says they are, and it names none of them.
 */
describe("a choose-one answer field points at the options in the prompt", () => {
  const choiceItem = (() => {
    const found = [...practiceItemsById.values()].find(
      (item) => item.answer.answer_spec.answer_type === "multiple_choice",
    );
    if (!found) {
      throw new Error("no served multiple_choice item");
    }
    return found;
  })();

  it("names the options as a group on the graded practice surface", () => {
    const { container } = render(
      <LessonPractice nodeId={choiceItem.node_id} source={fixedSource(choiceItem)} />,
    );
    expect(answerField(container).placeholder).toBe(MULTIPLE_CHOICE_PLACEHOLDER);
  });

  /** "Above" is a claim about the layout, so it is read off the layout rather than asserted. */
  it("renders the prompt before the field, which is what makes 'above' true", () => {
    const { container } = render(
      <LessonPractice nodeId={choiceItem.node_id} source={fixedSource(choiceItem)} />,
    );
    const prompt = container.querySelector("#lesson-practice-prompt");
    if (!prompt) {
      throw new Error("the practice surface rendered no prompt");
    }
    expect(MULTIPLE_CHOICE_PLACEHOLDER).toContain("above");
    expect(
      prompt.compareDocumentPosition(answerField(container)) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      "the answer field is not after the prompt, so the options are not above it",
    ).toBeTruthy();
  });

  /**
   * The leak check the `ADVERTISED` table in `answerFormat.test.ts` cannot make for this one:
   * it has no example form to grade, so what has to be proved instead is the absence of one.
   * Driven off every served key, so a new choice family cannot smuggle its own answer in here.
   */
  it("repeats none of the words a served choose-one item is graded on", () => {
    const keys = [
      ...new Set(
        [...practiceItemsById.values()]
          .filter((item) => item.answer.answer_spec.answer_type === "multiple_choice")
          .map((item) => String(item.answer.answer_key).toLowerCase()),
      ),
    ];
    expect(keys.length).toBeGreaterThan(2);
    const placeholder = MULTIPLE_CHOICE_PLACEHOLDER.toLowerCase();
    for (const key of keys) {
      expect(placeholder, `the placeholder says "${key}"`).not.toContain(key);
    }
  });
});

/**
 * A slope answer is graded on its REPRESENTATION: the key is a fraction and a decimal equal to
 * it grades `wrong_representation`. Nothing said so, so `-0.5` for `-1/2` was marked wrong for
 * a choice the learner was never offered. `reduced_fraction` cannot carry this: an unreduced
 * fraction passes here, so that placeholder would overstate the rule.
 */
describe("a fraction-representation answer field says a decimal will not do", () => {
  const fractionItem = (() => {
    const found = [...practiceItemsById.values()].find(
      (item) =>
        item.answer.answer_spec.representation === "fraction" &&
        item.answer.answer_spec.simplification !== "reduced_fraction",
    );
    if (!found) {
      throw new Error("no served representation=fraction item");
    }
    return found;
  })();

  it("on the graded practice surface", () => {
    const { container } = render(
      <LessonPractice nodeId={fractionItem.node_id} source={fixedSource(fractionItem)} />,
    );
    expect(answerField(container).placeholder).toBe(FRACTION_PLACEHOLDER);
  });

  it("on the infinite practice surface", () => {
    scheduled.item = fractionItem;
    const { container } = render(
      <InfinitePractice nodeId={fractionItem.node_id} onExit={() => {}} />,
    );
    expect(answerField(container).placeholder).toBe(FRACTION_PLACEHOLDER);
  });

  /** The gate: the note only reaches a learner if real served items carry the profile. */
  it("fires for every served fraction-representation item", () => {
    const items = [...practiceItemsById.values()].filter(
      (item) =>
        item.answer.answer_spec.representation === "fraction" &&
        item.answer.answer_spec.simplification !== "reduced_fraction",
    );
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(
        practicePlaceholder(item.answer.answer_spec, item.answer.allowed_symbols),
        item.item_version_id,
      ).toBe(FRACTION_PLACEHOLDER);
    }
  });
});
