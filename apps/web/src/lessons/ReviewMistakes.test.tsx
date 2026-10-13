import { D3_PRACTICE_ITEMS } from "@cr/item-bank";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { recordReviewMistake } from "./mistakeStore";
import { ReviewMistakes } from "./ReviewMistakes";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("shows a truthful empty state instead of unrelated mixed practice", () => {
  render(<ReviewMistakes eraId="bronze_age" onExit={vi.fn()} />);
  expect(screen.getByTestId("review-mistakes-empty")).toHaveTextContent(
    "No mistakes to review yet",
  );
  expect(screen.queryByText(/mixed problems drawn/i)).toBeNull();
});

it("renders only the learner's real persisted missed item population", () => {
  const missed = D3_PRACTICE_ITEMS[0];
  expect(missed).toBeDefined();
  recordReviewMistake("local-demo", missed!);
  render(<ReviewMistakes eraId="bronze_age" onExit={vi.fn()} />);

  expect(screen.getByText("Review mistake · 1 remaining")).toBeInTheDocument();
  expect(screen.getByText(/because it was missed or skipped/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Check" })).toBeInTheDocument();
});
