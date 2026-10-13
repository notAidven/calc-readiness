/**
 * The learner's keyboard, on both text answer surfaces.
 *
 * iOS and Android capitalize the first character of an empty `type="text"` field unless
 * the field opts out, so a learner answering `x^5` on a phone types `X^5` without
 * noticing. That reached the checker as `invalid_input / unknown_symbol` across 56 of
 * the 181 registered D2 instances: the attempt scored as UNANSWERED and the feedback
 * ("Check the answer format so it can be read, then try again.") never mentioned case.
 *
 * Two independent fixes, and this guards the input half. Autocorrect and the
 * spellchecker are off for the same reason: neither has anything useful to say about
 * `2*x^2*sqrt(2*x)`, and both are free to rewrite it.
 */

import { D2_PRACTICE_POOL } from "@cr/item-bank";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LessonCfu } from "./cfu";
import { PracticeAnswer } from "./PracticeAnswer";

/** Every text field a learner types a math answer into must opt out of all three. */
function expectMathKeyboard(input: HTMLInputElement | null, label: string): void {
  expect(input, `${label} renders a text input`).not.toBeNull();
  expect(input?.getAttribute("autocapitalize"), `${label} autocapitalize`).toBe("off");
  expect(input?.getAttribute("autocorrect"), `${label} autocorrect`).toBe("off");
  expect(input?.getAttribute("spellcheck"), `${label} spellcheck`).toBe("false");
  expect(input?.getAttribute("autocomplete"), `${label} autocomplete`).toBe("off");
}

describe("math answer inputs opt out of mobile autocapitalization", () => {
  it("the practice text input does", () => {
    // A free-text D2 shape: its key carries a letter, so case is load-bearing.
    const item = D2_PRACTICE_POOL.find(
      (candidate) =>
        candidate.answer.interactive_spec === undefined &&
        (candidate.answer.allowed_symbols?.length ?? 0) > 0,
    );
    if (!item) {
      throw new Error("no symbol-bearing D2 text item in the pool");
    }
    const { container } = render(
      <PracticeAnswer frozen={item} value="" onChange={() => {}} disabled={false} />,
    );
    expectMathKeyboard(container.querySelector("input"), "practice");
  });

  it("both fields of the rational-answer input do", () => {
    const item = D2_PRACTICE_POOL[0];
    if (!item) {
      throw new Error("empty D2 pool");
    }
    const rational = {
      ...item,
      answer: {
        ...item.answer,
        interactive_spec: undefined,
        answer_spec: {
          ...item.answer.answer_spec,
          answer_type: "rational_answer" as const,
        },
      },
    };
    const { container } = render(
      <PracticeAnswer
        frozen={rational}
        value={null}
        onChange={() => {}}
        disabled={false}
      />,
    );
    const fields = container.querySelectorAll("input");
    expect(fields).toHaveLength(2);
    expectMathKeyboard(fields[0] as HTMLInputElement, "rational expression");
    expectMathKeyboard(fields[1] as HTMLInputElement, "rational exclusions");
  });

  it("the CFU input does", () => {
    const { container } = render(
      <LessonCfu
        cfu={{
          prompt: "Simplify $x^{2} \\cdot x^{3}$.",
          accepted: ["x^5"],
          hint: "Add them.",
        }}
        nodeId="EXP.1"
      />,
    );
    expectMathKeyboard(container.querySelector("input"), "cfu");
  });
});
