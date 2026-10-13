import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MetricsPage } from "./MetricsPage";

const SNAPSHOT = {
  registered_users: 24,
  students_with_progress: 18,
  active_last_7_days: 7,
  diagnostics_started: 20,
  diagnostics_completed: 15,
  mastery_evidence_recorded: 96,
  generated_at: "2026-08-24T18:00:00.000Z",
};

afterEach(() => vi.unstubAllGlobals());

describe("beta metrics page", () => {
  it("shows the aggregate participation funnel without student records", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(SNAPSHOT), { status: 200 })),
    );
    render(<MetricsPage />);

    expect(
      await screen.findByRole("heading", { name: /24 learners have joined/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Registered accounts")).toBeInTheDocument();
    expect(screen.getByText("Completed a diagnostic")).toBeInTheDocument();
    expect(screen.getByText(/75% of started diagnostics/i)).toBeInTheDocument();
    expect(screen.getByText(/Aggregate counts only/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/student@example|cognito-sub/i);
  });

  it("offers a working retry when the snapshot is temporarily unavailable", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("no", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(SNAPSHOT), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    render(<MetricsPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /24 learners have joined/i }),
      ).toBeVisible(),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
