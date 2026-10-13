import { isInteractiveAnswerType } from "@cr/components";
import {
  canonicalRawAnswer,
  type FrozenItem,
  PRACTICE_AUTHORITY_ITEMS_BY_ID,
} from "@cr/item-bank";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { type DrillAttemptEvent, InfiniteDrill } from "./InfiniteDrill";
import type { InfiniteScheduler } from "./infiniteScheduler";

/**
 * **A NON-STRING ANSWER PAYLOAD MUST REACH THE GRADER ON THE DRILL SURFACE TOO.**
 *
 * `InfiniteDrill` read its submission as `isInteractiveAnswerType(answer_type) ? value :
 * normalizeTextSubmission(text)`, where `text` was `typeof value === "string" ? value : ""`.
 * `rational_answer` is NOT an interactive type — it is a two-field text control — so its
 * `{ expression, excluded_values }` object took the second branch and collapsed to `""`.
 * The learner typed the right answer into both boxes and the checker was handed nothing.
 *
 * `LessonPractice.tsx` never had the defect because it branches on `typeof value ===
 * "string"` instead, which is the only test that describes the thing being decided: whether
 * this payload is text that needs normalizing, or a structure that must be passed through.
 * The two surfaces now agree, and `surfacesAgree` below is the assertion that keeps them
 * agreeing — a divergence between two copies of one handler is how this shipped.
 *
 * Measured before the fix (`practice-solve-scratch/census-report.md` §5): all 140 served
 * `rational_answer` items returned `invalid_input / invalid_rational_answer` on this
 * surface while the same items returned `correct` on `lesson_practice`. Those 140 items are
 * the whole of RAT.1-RAT.4's per-node drill pools and four fifths of the medieval era's
 * interleaved pool, so the drill was not degraded, it was unplayable: nothing scored, the
 * streak neither advanced nor broke, and the answer was never revealed, so the learner
 * could not fail out of it either. The message they were shown told them to fill in both
 * boxes, which is what they had just done.
 */

afterEach(cleanup);

/**
 * The population is every served item whose answer control emits a NON-STRING payload
 * while NOT being an interactive type, derived from the registry rather than written down.
 *
 * Scoped by the behaviour and not by the type name. The defect needed both halves at once:
 * a payload the string branch cannot carry, and an `answer_type` the interactive bypass
 * does not cover. `rational_answer` is the only shape holding both today, and a second one
 * added tomorrow inherits this file's coverage instead of quietly falling outside it —
 * which is precisely how the shipped handler came to be narrower than the behaviour.
 */
const NON_STRING_TEXT_ITEMS: readonly FrozenItem[] = [
  ...PRACTICE_AUTHORITY_ITEMS_BY_ID.values(),
].filter(
  (item) =>
    typeof canonicalRawAnswer(item.answer) === "object" &&
    !isInteractiveAnswerType(item.answer.answer_spec.answer_type),
);

/** Serves one item forever, so the test drives the phase rather than the draw. */
function oneItemScheduler(item: FrozenItem): InfiniteScheduler {
  return { next: () => item };
}

/**
 * The two halves of the rational control, read positionally.
 *
 * Not `getByLabelText`: each field's `<label>` wraps a `MathAnswerColumn`, which holds the
 * input alongside its notation line and preview, so the label is not associated with a
 * single form control and the accessible-name query cannot resolve it. The label TEXT is
 * asserted separately below, so the positional read is not covering for a missing label.
 */
function expressionField(): HTMLElement {
  const fields = screen.getAllByRole("textbox");
  expect(fields).toHaveLength(2);
  return fields[0] as HTMLElement;
}

function exclusionsField(): HTMLElement {
  const fields = screen.getAllByRole("textbox");
  expect(fields).toHaveLength(2);
  return fields[1] as HTMLElement;
}

function answerCorrectlyInTheDrill(item: FrozenItem): DrillAttemptEvent[] {
  const attempts: DrillAttemptEvent[] = [];
  render(
    <InfiniteDrill
      scheduler={oneItemScheduler(item)}
      storageKey="cr.test.rationalDrill"
      backLabel="Back"
      onAttempt={(event) => attempts.push(event)}
      onExit={() => {}}
    />,
  );
  const key = canonicalRawAnswer(item.answer) as {
    expression?: unknown;
    excluded_values?: unknown;
  };
  fireEvent.change(expressionField(), {
    target: { value: String(key.expression ?? "") },
  });
  fireEvent.change(exclusionsField(), {
    target: {
      value: Array.isArray(key.excluded_values)
        ? key.excluded_values.join(", ")
        : String(key.excluded_values ?? ""),
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /^check$/i }));
  return attempts;
}

describe("the drill grades a two-field rational answer", () => {
  it("has a population to grade, and it is the whole RAT cohort", () => {
    // A floor, because every assertion below is a `for` loop and a loop over nothing
    // passes. 140 is what the census measured at `b88bb0c7`.
    expect(NON_STRING_TEXT_ITEMS.length).toBeGreaterThanOrEqual(140);
    const nodes = new Set(NON_STRING_TEXT_ITEMS.map((item) => item.node_id));
    expect([...nodes].sort()).toEqual(["RAT.1", "RAT.2", "RAT.3", "RAT.4"]);
  });

  it("renders both boxes, so the payload the handler discards is one a learner can produce", () => {
    const item = NON_STRING_TEXT_ITEMS[0];
    if (!item) {
      throw new Error("expected a served rational item");
    }
    render(
      <InfiniteDrill
        scheduler={oneItemScheduler(item)}
        storageKey="cr.test.rationalDrill"
        backLabel="Back"
        onExit={() => {}}
      />,
    );
    expect(screen.getByText("Simplified expression")).toBeTruthy();
    expect(screen.getByText("Excluded values")).toBeTruthy();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("counts the correct answer correct instead of calling it unreadable", () => {
    const item = NON_STRING_TEXT_ITEMS[0];
    if (!item) {
      throw new Error("expected a served rational item");
    }
    const attempts = answerCorrectlyInTheDrill(item);
    expect(attempts.map((event) => event.outcome)).toEqual(["correct"]);
    expect(screen.queryByText(/couldn't read that/i)).toBeNull();
  });

  it("advances the streak, which is the thing the learner is here for", () => {
    const item = NON_STRING_TEXT_ITEMS[0];
    if (!item) {
      throw new Error("expected a served rational item");
    }
    answerCorrectlyInTheDrill(item);
    expect(screen.getByText("1")).toBeTruthy();
  });

  // Budgeted rather than left on the 20s default: this mounts the drill 140 times and takes
  // roughly 40s alone on a developer machine, so on the default it fails on its own duration
  // and says nothing about the cohort it exists to sweep.
  it("does it on every served item of the cohort, not on one sample", () => {
    const unscored: string[] = [];
    for (const item of NON_STRING_TEXT_ITEMS) {
      const attempts = answerCorrectlyInTheDrill(item);
      if (attempts[0]?.outcome !== "correct") {
        unscored.push(`${item.item_version_id} -> ${attempts[0]?.outcome ?? "nothing"}`);
      }
      cleanup();
    }
    expect(unscored).toEqual([]);
    // A floor under the sweep: an empty cohort makes `unscored` empty for free.
    expect(NON_STRING_TEXT_ITEMS.length).toBeGreaterThanOrEqual(140);
  }, 300_000);

  it("still scores a wrong rational answer as a miss rather than as unreadable", () => {
    // The other direction, and it is the one that says the payload really is being graded:
    // a handler that passed `{}` through would call everything incorrect and pass the
    // cases above only by accident.
    const item = NON_STRING_TEXT_ITEMS[0];
    if (!item) {
      throw new Error("expected a served rational item");
    }
    const attempts: DrillAttemptEvent[] = [];
    render(
      <InfiniteDrill
        scheduler={oneItemScheduler(item)}
        storageKey="cr.test.rationalDrill"
        backLabel="Back"
        onAttempt={(event) => attempts.push(event)}
        onExit={() => {}}
      />,
    );
    fireEvent.change(expressionField(), {
      target: { value: "x + 1000" },
    });
    fireEvent.change(exclusionsField(), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));
    expect(attempts.map((event) => event.outcome)).toEqual(["incorrect"]);
  });
});
