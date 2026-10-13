import {
  configureAnswerChecker,
  createD1AnswerChecker,
  D1_CHECKER_VERSION,
  MathInput,
  type MathInputProps,
  type MathInputSubmission,
} from "@cr/components";
import { D1_GOLDEN_FIXTURES, type GoldenFixture } from "@cr/item-bank";
import { render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Directly exercises the frozen "math input + checkAnswer" surface (INV: returns
// client_correct; server recompute is authoritative — see engines/diagnostic +
// the Lambda scorer). Record-only mode is already covered end-to-end by
// DiagnosticRunner.test.tsx; this pins the immediate-feedback + fail-closed paths.
const checker = createD1AnswerChecker({
  itemVersions: D1_GOLDEN_FIXTURES.map((fixture) => ({
    item_version_id: fixture.item_version_id,
    node_id: fixture.node_id,
    answer: fixture.answer,
  })),
});

function requireFixture(): GoldenFixture {
  const fixture = D1_GOLDEN_FIXTURES[0];
  if (!fixture) {
    throw new Error("expected at least one D1 golden fixture");
  }
  return fixture;
}

function firstNearMiss(fixture: GoldenFixture): string {
  const nearMiss = fixture.near_miss[0];
  if (nearMiss === undefined) {
    throw new Error("expected a near-miss answer on the golden fixture");
  }
  return String(nearMiss);
}

const FIXTURE = requireFixture();
const VALID = String(FIXTURE.valid);
const NEAR_MISS = firstNearMiss(FIXTURE);

beforeEach(() => {
  // MathInput's default checker is the exported `checkAnswer` registry — configure
  // it with a real D1 checker, exactly as the app wires it at startup.
  configureAnswerChecker(checker);
});

function renderInput(props: Partial<MathInputProps> = {}) {
  const onChecked = vi.fn();
  render(
    <MathInput
      itemVersionId={FIXTURE.item_version_id}
      checkerVersion={D1_CHECKER_VERSION}
      label="Your answer"
      onChecked={onChecked}
      {...props}
    />,
  );
  return onChecked;
}

async function submit(user: UserEvent, value: string): Promise<void> {
  await user.type(screen.getByRole("textbox"), value);
  await user.click(screen.getByRole("button", { name: /check answer/i }));
}

function submissionOf(onChecked: ReturnType<typeof vi.fn>): MathInputSubmission {
  expect(onChecked).toHaveBeenCalledTimes(1);
  return onChecked.mock.calls[0]?.[0] as MathInputSubmission;
}

describe("MathInput + checkAnswer (frozen API)", () => {
  it("canonicalizes an unambiguous root glyph before grading and recording raw_answer", async () => {
    const user = userEvent.setup();
    const boundaryChecker = vi.fn(() => ({
      status: "correct" as const,
      reason_code: "match",
      client_correct: true,
      checker_version: D1_CHECKER_VERSION,
    }));
    const onChecked = renderInput({ checker: boundaryChecker });

    await submit(user, "5√2");

    expect(boundaryChecker).toHaveBeenCalledWith(
      expect.objectContaining({ raw_answer: "5*sqrt(2)" }),
    );
    expect(submissionOf(onChecked).raw_answer).toBe("5*sqrt(2)");
  });

  it("grades a correct answer client-side (client_correct = true) with immediate feedback", async () => {
    const user = userEvent.setup();
    const onChecked = renderInput();

    await submit(user, VALID);

    const submission = submissionOf(onChecked);
    expect(submission.raw_answer).toBe(VALID);
    expect(submission.result.status).toBe("correct");
    expect(submission.result.client_correct).toBe(true);
    expect(screen.getByText(/that works/i)).toBeInTheDocument();
  });

  it("grades a near-miss incorrect (client_correct = false)", async () => {
    const user = userEvent.setup();
    const onChecked = renderInput();

    await submit(user, NEAR_MISS);

    const submission = submissionOf(onChecked);
    expect(submission.result.status).toBe("incorrect");
    expect(submission.result.client_correct).toBe(false);
    // The component surfaces incorrectness (exact copy is reason-code-specific — a
    // sign error here — so assert the state machine, not the wording).
    expect(document.querySelector(".cr-math-input")?.getAttribute("data-state")).toBe(
      "incorrect",
    );
    expect(screen.queryByText(/that works/i)).not.toBeInTheDocument();
  });

  it("fails closed on an unknown item — recorded, never counted wrong", async () => {
    const user = userEvent.setup();
    const onChecked = renderInput({ itemVersionId: "does.not.exist" });

    await submit(user, VALID);

    const submission = submissionOf(onChecked);
    expect(submission.result.status).toBe("scoring_error");
    expect(submission.result.reason_code).toBe("item_version_not_found");
    expect(submission.result.client_correct).toBe(false);
    expect(screen.getByText(/not counted as wrong/i)).toBeInTheDocument();
  });

  it("fails closed on an unsupported checker version", async () => {
    const user = userEvent.setup();
    const onChecked = renderInput({ checkerVersion: D1_CHECKER_VERSION + 1 });

    await submit(user, VALID);

    const submission = submissionOf(onChecked);
    expect(submission.result.status).toBe("scoring_error");
    expect(submission.result.reason_code).toBe("checker_version_unsupported");
    expect(submission.result.client_correct).toBe(false);
  });

  it("record-only mode records the grade without leaking correctness", async () => {
    const user = userEvent.setup();
    const onChecked = renderInput({ feedbackMode: "record-only" });

    await submit(user, VALID);

    const submission = submissionOf(onChecked);
    // The client grade is still computed + handed up for authoritative scoring…
    expect(submission.result.client_correct).toBe(true);
    // …but the student sees only a neutral acknowledgement (no mid-test grades).
    expect(screen.getByText(/answer recorded/i)).toBeInTheDocument();
    expect(screen.queryByText(/that works/i)).not.toBeInTheDocument();
  });
});
