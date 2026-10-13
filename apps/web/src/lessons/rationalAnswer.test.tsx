import { D5_PRACTICE_ITEMS, D5_PRACTICE_POOL } from "@cr/item-bank";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PracticeAnswer, type PracticeAnswerValue } from "./PracticeAnswer";
import { checkerVersionForItem, practiceChecker } from "./practiceChecker";

/**
 * The D5 grading seam. A `rational_answer` is the only text answer type the comparator
 * refuses to read as a string: a bare string is rejected outright as
 * `invalid_rational_answer`, because the key has two halves (the simplified expression AND
 * the values the ORIGINAL denominator forbids) and cancelling a factor hides the second
 * one. So D5 could be fully authored, registered and reachable while every single answer a
 * learner typed came back invalid, which is exactly the class of defect
 * `lessonDomains.reachability.test.ts` exists to catch and cannot see: it builds and
 * registers the set without ever submitting to it.
 *
 * These tests close that gap from both ends: the input emits the structured payload, and
 * that payload grades correct against every served D5 instance through the real checker.
 *
 * Only the four EXPRESSION nodes answer this way. RAT.5 is asked for a domain, an asymptote
 * or a hole, and RAT.6 for a solution set, so those submit an ordinary string through the
 * plain text input; they are swept below in their own right, because "authored but
 * ungradable" is a defect that does not care which answer type a node uses.
 */

type D5Item = (typeof D5_PRACTICE_ITEMS)[number];

/** The nodes whose answer IS a rational expression, and so uses the two-field input. */
const EXPRESSION_NODES: ReadonlySet<string> = new Set(["RAT.1", "RAT.2", "RAT.3", "RAT.4"]);

const expressionItems = D5_PRACTICE_ITEMS.filter((item) =>
  EXPRESSION_NODES.has(item.node_id),
);
const expressionPool = D5_PRACTICE_POOL.filter((item) =>
  EXPRESSION_NODES.has(item.node_id),
);
const analysisItems = D5_PRACTICE_ITEMS.filter(
  (item) => !EXPRESSION_NODES.has(item.node_id),
);

function payloadFor(item: D5Item): Record<string, unknown> {
  return {
    expression: String(item.answer.answer_key),
    excluded_values: (item.answer.excluded_values ?? []).join(", "),
  };
}

describe("the rational-answer input emits a payload the comparator can read", () => {
  const item = expressionPool[0];

  it("renders a field for the expression AND one for the excluded values", () => {
    expect(item).toBeDefined();
    render(
      <PracticeAnswer
        frozen={item as NonNullable<typeof item>}
        value=""
        onChange={() => {}}
        disabled={false}
      />,
    );
    expect(screen.getByLabelText(/simplified expression/i)).toBeDefined();
    expect(screen.getByLabelText(/excluded values/i)).toBeDefined();
  });

  it("emits both halves as one object, keeping the half the student is not editing", () => {
    const onChange = vi.fn<(value: PracticeAnswerValue) => void>();
    render(
      <PracticeAnswer
        frozen={item as NonNullable<typeof item>}
        value={{ expression: "(x+1)/(x+4)", excluded_values: "" }}
        onChange={onChange}
        disabled={false}
      />,
    );

    fireEvent.change(screen.getByLabelText(/excluded values/i), {
      target: { value: "-4, 2" },
    });

    expect(onChange).toHaveBeenCalledWith({
      expression: "(x+1)/(x+4)",
      excluded_values: "-4, 2",
    });
  });
});

describe("every served D5 expression instance grades correct from that payload", () => {
  it.each(expressionItems.map((item) => [item.item_version_id, item] as const))(
    "%s",
    (_id, item) => {
      const result = practiceChecker({
        raw_answer: payloadFor(item),
        item_version_id: item.item_version_id,
        equivalence_checker_version: checkerVersionForItem(item),
      });
      expect(result.status, item.item_version_id).toBe("correct");
    },
  );

  /**
   * The exclusions are not decoration: dropping one has to be wrong even when the
   * expression is perfect, or the node's whole point (the forbidden measure survives the
   * cancelling) is untested and a student could reduce and ignore the domain forever.
   */
  it("marks a correct expression with a dropped exclusion incorrect", () => {
    for (const item of expressionPool) {
      const result = practiceChecker({
        raw_answer: { ...payloadFor(item), excluded_values: "" },
        item_version_id: item.item_version_id,
        equivalence_checker_version: checkerVersionForItem(item),
      });
      expect(result.status, item.item_version_id).toBe("incorrect");
      expect(result.reason_code, item.item_version_id).toBe("missing_exclusion");
    }
  });
});

/**
 * The same seam for RAT.5 and RAT.6, which submit a plain string. Their answer types
 * (set-builder domain, asymptote value, hole as a point, solution set) each carry their own
 * notation requirement, and a key written in a form the comparator will not accept fails
 * the same silent way a rational answer did: authored, reachable, and ungradable.
 */
describe("every served D5 analysis instance grades correct from a typed string", () => {
  it.each(analysisItems.map((item) => [item.item_version_id, item] as const))(
    "%s",
    (_id, item) => {
      const result = practiceChecker({
        raw_answer: String(item.answer.answer_key),
        item_version_id: item.item_version_id,
        equivalence_checker_version: checkerVersionForItem(item),
      });
      expect(result.status, item.item_version_id).toBe("correct");
    },
  );
});
