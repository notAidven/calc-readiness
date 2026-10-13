import { canonicalInteractivePayload, type NumberLinePayload } from "@cr/components";
import { INTERACTIVE_DEMO_NODE } from "@cr/item-bank";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InfinitePractice } from "./InfinitePractice";
import { practiceItemsById } from "./practiceChecker";

/**
 * Chromium proof that InfinitePractice runs the interactive number_line pool through
 * the SAME dispatcher + global checker as text practice: filling the widget with the
 * canonical answer grows the streak, and skipping resets it and reveals the worked
 * solution (never a text answer key, since interactive items have none).
 */

afterEach(cleanup);

/** Read the item currently shown by the number-line widget. */
function currentPayload(container: HTMLElement): NumberLinePayload {
  const widget = container.querySelector<HTMLElement>("[data-item-version-id]");
  if (!widget) {
    throw new Error("no interactive widget rendered");
  }
  const id = widget.dataset.itemVersionId as string;
  const frozen = practiceItemsById.get(id);
  if (!frozen) {
    throw new Error(`no frozen item for ${id}`);
  }
  const payload = canonicalInteractivePayload(
    frozen.answer.answer_spec.answer_type,
    frozen.answer.interactive_spec,
  );
  if (!payload) {
    throw new Error(`no canonical payload for ${id}`);
  }
  return payload as NumberLinePayload;
}

/** Fill the widget's accessible controls with the canonical correct answer. */
function fillCorrect(container: HTMLElement): void {
  const payload = currentPayload(container);
  const scope = within(container);
  (payload.points ?? []).forEach((value, index) => {
    fireEvent.change(scope.getByLabelText(`Point ${index + 1} position`), {
      target: { value: String(value) },
    });
  });
  (payload.intervals ?? []).forEach((interval, index) => {
    fireEvent.change(scope.getByLabelText(`Interval ${index + 1} left endpoint`), {
      target: { value: String(interval.lo) },
    });
    fireEvent.change(scope.getByLabelText(`Interval ${index + 1} right endpoint`), {
      target: { value: String(interval.hi) },
    });
    const left = scope.getByRole("button", {
      name: new RegExp(`Interval ${index + 1} left endpoint is`, "i"),
    }) as HTMLButtonElement;
    if ((left.getAttribute("aria-pressed") === "true") !== interval.loClosed) {
      fireEvent.click(left);
    }
    const right = scope.getByRole("button", {
      name: new RegExp(`Interval ${index + 1} right endpoint is`, "i"),
    }) as HTMLButtonElement;
    if ((right.getAttribute("aria-pressed") === "true") !== interval.hiClosed) {
      fireEvent.click(right);
    }
  });
}

describe("InfinitePractice (Chromium): interactive streak grows / resets", () => {
  it("grows the streak when the widget answer is correct", () => {
    const { container } = render(
      <InfinitePractice nodeId={INTERACTIVE_DEMO_NODE} onExit={() => {}} />,
    );
    fillCorrect(container);
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));

    expect(screen.getByText("Correct! Nice work.")).toBeTruthy();
    const count = container.querySelector(".infinite-practice__streak-count");
    expect(count?.textContent).toBe("1");
  });

  it("resets the streak and shows the worked solution on skip (no text key)", () => {
    const { container } = render(
      <InfinitePractice nodeId={INTERACTIVE_DEMO_NODE} onExit={() => {}} />,
    );
    // Build a streak first, then skip the next problem to prove it resets.
    fillCorrect(container);
    fireEvent.click(screen.getByRole("button", { name: /^check$/i }));
    expect(container.querySelector(".infinite-practice__streak-count")?.textContent).toBe(
      "1",
    );

    fireEvent.click(screen.getByRole("button", { name: /next problem/i }));
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    expect(container.querySelector(".infinite-practice__streak-count")?.textContent).toBe(
      "0",
    );
    // The reveal points to the worked solution, never "The answer was …".
    expect(screen.queryByText(/the answer was/i)).toBeNull();
    expect(screen.getByText(/here's the worked solution/i)).toBeTruthy();
  });
});
